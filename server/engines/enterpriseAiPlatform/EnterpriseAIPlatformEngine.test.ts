import { describe, expect, it } from "vitest";
import { createDefaultEnterpriseAIPlatform } from "./DefaultAIPlatformSetup";

describe("Enterprise AI Platform Phase 9", () => {
  it("builds the enterprise AI reference architecture", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const architecture = platform.buildReferenceArchitecture();

    expect(architecture.map((layer) => layer.name)).toContain("AI Gateway");
    expect(architecture.map((layer) => layer.name)).toContain("Agent Orchestrator");
    expect(architecture.map((layer) => layer.name)).toContain("IMS Platform");
  });

  it("registers prompts, models, tools, agents, memory, and context", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const summary = platform.registry.buildRegistrySummary();

    expect(summary.prompt).toBe(8);
    expect(summary.model).toBe(2);
    expect(summary.tool).toBe(9);
    expect(summary.agent).toBe(8);
    expect(summary.memory).toBe(1);
    expect(summary.context).toBe(1);
    expect(summary.capability).toBe(5);
  });

  it("runs requests through the Phase 9 gateway middleware chain and AI session", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const response = platform.execute({
      requestId: "ai-req-session-1",
      agentId: "agent-executive",
      task: "Prepare a scoped executive briefing",
      context: { cashCoverageDays: 42, grantRisk: "medium" },
      permissions: ["ai:read", "ai:analyze"],
      conversationId: "conversation-1",
      scope: {
        organizationId: 1,
        operatingUnitId: 10,
        userId: 8,
        userRole: "Executive Director",
        locale: "en",
      },
    });

    expect(platform.gateway.getMiddlewareChain()).toEqual([
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
    ]);
    expect(response.status).toBe("completed");
    expect(response.output.structuredData.session).toMatchObject({
      sessionId: "ai-session-ai-req-session-1",
      conversationId: "conversation-1",
      organizationId: 1,
      operatingUnitId: 10,
    });
    expect(response.output.structuredData.middlewareTrace).toContain("prompt_assembly");
    expect(response.output.citations).toContain("ai-req-session-1-context-1");
  });

  it("enforces AI operating model and human approval for high-risk tools", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const response = platform.execute({
      requestId: "ai-req-1",
      agentId: "agent-financial",
      task: "Execute payment recommendation",
      requestedToolIds: ["tool-payment-execute"],
      context: { paymentId: 100 },
      scope: {
        organizationId: 1,
        operatingUnitId: 10,
        userId: 7,
        userRole: "Finance Director",
        locale: "en",
      },
    });

    expect(response.status).toBe("needs_human_approval");
    expect(response.governance.approvalRequirement).toBe("required");
    expect(response.governance.auditId).toBe("ai-audit-ai-req-1");
    expect(response.output.structuredData.toolResults).toEqual([
      expect.objectContaining({
        toolId: "tool-payment-execute",
        status: "requires_human_approval",
      }),
    ]);
  });

  it("blocks users outside the AI operating model", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const response = platform.execute({
      requestId: "ai-req-2",
      agentId: "agent-executive",
      task: "Prepare executive summary",
      context: {},
      scope: {
        organizationId: 1,
        userId: 8,
        userRole: "Viewer",
      },
    });

    expect(response.status).toBe("blocked");
    expect(response.governance.approvalRequirement).toBe("blocked");
  });

  it("plans multi-agent collaboration", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const plan = platform.orchestrator.plan({
      requestId: "plan-1",
      primaryDomain: "executive",
      collaborationDomains: ["financial", "treasury", "budget", "compliance"],
      goal: "Prepare country director daily decision center",
    });

    expect(plan.primaryAgent.domain).toBe("executive");
    expect(plan.collaboratingAgents).toHaveLength(4);
    expect(plan.steps).toHaveLength(5);
  });

  it("provides governance operating model, ADRs, RAG, evaluation, and observability", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const operatingModel = platform.governance.getOperatingModel();
    const adrs = platform.buildArchitectureDecisionRecords();
    const rag = platform.sharedServices.retrieveContext("grant budget cash", [
      { id: "doc-1", text: "Grant A budget and cash requirements." },
      { id: "doc-2", text: "HR policy." },
    ]);
    const response = platform.execute({
      requestId: "ai-req-3",
      agentId: "agent-treasury",
      task: "Analyze cash risk",
      context: { cashCoverageDays: 18 },
      scope: {
        organizationId: 1,
        userId: 9,
        userRole: "Treasury Manager",
      },
    });
    const evaluation = platform.sharedServices.evaluateResponse(response);
    const event = platform.sharedServices.observe(response);

    expect(operatingModel.promptApprovers).toContain("AI Governance Lead");
    expect(adrs).toHaveLength(8);
    expect(rag.citations).toContain("doc-1");
    expect(evaluation.passed).toBe(true);
    expect(event.eventType).toBe("response");
  });

  it("normalizes provider output and tracks scoped AI capabilities", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const capabilities = platform.registry.listCapabilities({
      organizationId: 1,
      userId: 1,
      userRole: "Finance Director",
    });

    const response = platform.execute({
      requestId: "ai-req-provider-1",
      agentId: "agent-financial",
      task: "Analyze enterprise financial health",
      context: { budgetVariance: 0.12 },
      scope: {
        organizationId: 1,
        userId: 7,
        userRole: "Finance Director",
      },
    });

    expect(capabilities.map((capability) => capability.name)).toContain("Financial Health");
    expect(response.output.structuredData.provider).toBe("openai");
    expect(response.output.structuredData.confidence).toMatchObject({
      statisticalConfidence: 0.82,
      dataCompleteness: 0.78,
    });
  });

  it("reacts to IMS events for memory, knowledge graph, and compliance refresh", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const actions = platform.eventIntegration.handleEvent({
      eventId: "evt-grant-1",
      eventType: "grant_updated",
      organizationId: 1,
      operatingUnitId: 10,
      occurredAt: "2026-07-02T00:00:00.000Z",
      payload: { grantId: 22 },
    });

    expect(actions).toEqual([
      expect.objectContaining({ action: "update_knowledge_graph", organizationId: 1, operatingUnitId: 10 }),
      expect.objectContaining({ action: "trigger_compliance_review", organizationId: 1, operatingUnitId: 10 }),
    ]);
  });
});
