import { AIContextCompositionEngine } from "./AIContextCompositionEngine";
import { AIGovernanceEngine } from "./AIGovernanceEngine";
import { AIPromptAssemblyEngine } from "./AIPromptAssemblyEngine";
import { AIProviderAdapterEngine } from "./AIProviderAdapterEngine";
import { AIRegistryEngine } from "./AIRegistryEngine";
import { AISessionEngine } from "./AISessionEngine";
import { AIToolExecutionEngine } from "./AIToolExecutionEngine";
import {
  AIMiddlewareName,
  AIRequest,
  AIResponse,
  AIRiskLevel,
  AISession,
  ToolExecutionResult,
} from "./EnterpriseAITypes";

export class AIGatewayEngine {
  private readonly middlewareChain: AIMiddlewareName[] = [
    "authentication",
    "authorization",
    "organization_scope",
    "operating_unit_scope",
    "data_classification",
    "context_builder",
    "memory",
    "rag",
    "prompt_assembly",
    "model_routing",
    "agent",
    "tool_execution",
    "evaluation",
    "audit",
    "response",
  ];

  constructor(
    private readonly registry: AIRegistryEngine,
    private readonly governance: AIGovernanceEngine,
    private readonly sessionEngine: AISessionEngine = new AISessionEngine(),
    private readonly contextEngine: AIContextCompositionEngine = new AIContextCompositionEngine(),
    private readonly promptAssembly: AIPromptAssemblyEngine = new AIPromptAssemblyEngine(),
    private readonly providerAdapter: AIProviderAdapterEngine = new AIProviderAdapterEngine(),
    private readonly toolExecution: AIToolExecutionEngine = new AIToolExecutionEngine(registry),
  ) {}

  getMiddlewareChain(): AIMiddlewareName[] {
    return [...this.middlewareChain];
  }

  routeRequest(request: AIRequest): AIResponse {
    return this.routeSession(this.sessionEngine.createSession(request));
  }

  routeSession(session: AISession): AIResponse {
    const start = Date.now();
    const agent = this.registry.getAgentForScope(session.request.agentId, session.scope);
    if (!agent) return this.blockedResponse(session, "Agent is not registered.", "critical", start);
    if (agent.status !== "approved") return this.blockedResponse(session, "Agent is not approved.", "high", start);

    session.selectedAgentId = agent.id;
    const toolRisk = this.deriveToolRisk(session.request.requestedToolIds ?? [], session);
    const review = this.governance.reviewRequest(session.request, toolRisk);
    session.approval = {
      requirement: review.approvalRequirement,
      policyIds: review.policyIds,
      reasons: review.reasons,
    };

    if (!review.allowed) {
      const response = this.blockedResponse(session, review.reasons.join(" ") || "AI request is blocked by governance.", toolRisk, start);
      response.governance.policyIds = review.policyIds;
      response.governance.approvalRequirement = review.approvalRequirement;
      return response;
    }

    const context = this.contextEngine.compose(session);
    session.context = context.scopedContext;
    session.ragEvidence = context.evidence;
    session.memory = {
      partition: this.buildMemoryPartition(session),
      lastKnownTask: session.request.task,
    };

    const prompt = this.registry.getPromptForScope(agent.promptIds[0], session.scope);
    const assembledPrompt = this.promptAssembly.assemble(session, prompt);
    session.promptSections = assembledPrompt.sections;

    const model = agent.modelIds
      .map((modelId) => this.registry.getModelForScope(modelId, session.scope))
      .find((candidate) => candidate?.status === "approved");
    if (!model) return this.blockedResponse(session, "No approved model is available for this agent.", "high", start);

    session.selectedModelId = model.id;
    const providerResult = this.providerAdapter.complete({
      session,
      model,
      prompt: assembledPrompt.prompt,
    });
    const toolResults = this.executeRequestedTools(session);
    const responseStatus = review.approvalRequirement === "required" || toolResults.some((tool) => tool.status === "requires_human_approval")
      ? "needs_human_approval"
      : "completed";

    this.trace(session);
    session.telemetry.completedAt = new Date().toISOString();
    session.telemetry.estimatedCost = providerResult.estimatedCost;
    session.telemetry.tokenEstimate = providerResult.tokenEstimate;

    return {
      requestId: session.request.requestId,
      agentId: agent.id,
      status: responseStatus,
      output: {
        summary: responseStatus === "needs_human_approval"
          ? "AI analysis is ready, but human approval is required before execution."
          : providerResult.normalizedText,
        structuredData: {
          ...providerResult.structuredData,
          session: {
            sessionId: session.sessionId,
            conversationId: session.conversationId,
            organizationId: session.scope.organizationId,
            operatingUnitId: session.scope.operatingUnitId ?? null,
            permissions: session.permissions,
          },
          middlewareTrace: session.telemetry.middlewareTrace,
          promptSections: session.promptSections,
          toolResults,
        },
        citations: session.ragEvidence.map((item) => item.id),
      },
      governance: {
        riskLevel: toolRisk,
        approvalRequirement: review.approvalRequirement,
        auditId: session.auditId,
        policyIds: review.policyIds,
      },
      observability: {
        latencyMs: Date.now() - start,
        estimatedCost: providerResult.estimatedCost,
        modelId: model.id,
        tokenEstimate: providerResult.tokenEstimate,
      },
    };
  }

  private executeRequestedTools(session: AISession): ToolExecutionResult[] {
    return (session.request.requestedToolIds ?? []).map((toolId) => this.toolExecution.execute({
      session,
      toolId,
      input: session.request.context,
    }));
  }

  private deriveToolRisk(toolIds: string[], session: AISession): AIRiskLevel {
    const rank: Record<AIRiskLevel, number> = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };

    return toolIds.reduce<AIRiskLevel>((highest, toolId) => {
      const tool = this.registry.getToolForScope(toolId, session.scope);
      if (!tool) return highest;
      return rank[tool.riskLevel] > rank[highest] ? tool.riskLevel : highest;
    }, "low");
  }

  private trace(session: AISession): void {
    session.telemetry.middlewareTrace = this.middlewareChain;
  }

  private buildMemoryPartition(session: AISession): string {
    return [
      `org:${session.scope.organizationId}`,
      `ou:${session.scope.operatingUnitId ?? "all"}`,
      `conversation:${session.conversationId}`,
    ].join("/");
  }

  private blockedResponse(session: AISession, reason: string, riskLevel: AIRiskLevel, start: number): AIResponse {
    this.trace(session);
    return {
      requestId: session.request.requestId,
      agentId: session.request.agentId,
      status: "blocked",
      output: {
        summary: reason,
        structuredData: {},
        citations: [],
      },
      governance: {
        riskLevel,
        approvalRequirement: "blocked",
        auditId: session.auditId,
        policyIds: session.approval.policyIds,
      },
      observability: {
        latencyMs: Date.now() - start,
        estimatedCost: 0,
      },
    };
  }
}
