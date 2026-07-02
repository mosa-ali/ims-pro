import { AgentOrchestratorEngine } from "./AgentOrchestratorEngine";
import { AIContextCompositionEngine } from "./AIContextCompositionEngine";
import { AIEventIntegrationEngine } from "./AIEventIntegrationEngine";
import { AIGatewayEngine } from "./AIGatewayEngine";
import { AIGovernanceEngine } from "./AIGovernanceEngine";
import { AIPromptAssemblyEngine } from "./AIPromptAssemblyEngine";
import { AIProviderAdapterEngine } from "./AIProviderAdapterEngine";
import { AIRegistryEngine } from "./AIRegistryEngine";
import { AISessionEngine } from "./AISessionEngine";
import { AISharedServicesEngine } from "./AISharedServicesEngine";
import { AIToolExecutionEngine } from "./AIToolExecutionEngine";
import {
  AgentDomain,
  AIArchitectureDecisionRecord,
  AIRequest,
  AIResponse,
  PlatformArchitectureLayer,
} from "./EnterpriseAITypes";

export class EnterpriseAIPlatformEngine {
  readonly registry = new AIRegistryEngine();
  readonly governance = new AIGovernanceEngine();
  readonly sharedServices = new AISharedServicesEngine();
  readonly sessionEngine = new AISessionEngine();
  readonly contextComposition = new AIContextCompositionEngine();
  readonly promptAssembly = new AIPromptAssemblyEngine();
  readonly providerAdapters = new AIProviderAdapterEngine();
  readonly toolExecution = new AIToolExecutionEngine(this.registry);
  readonly eventIntegration = new AIEventIntegrationEngine();
  readonly gateway = new AIGatewayEngine(
    this.registry,
    this.governance,
    this.sessionEngine,
    this.contextComposition,
    this.promptAssembly,
    this.providerAdapters,
    this.toolExecution,
  );
  readonly orchestrator = new AgentOrchestratorEngine(this.registry, this.gateway);

  buildReferenceArchitecture(): PlatformArchitectureLayer[] {
    return [
      {
        name: "AI Gateway",
        responsibilities: ["Middleware pipeline", "policy enforcement", "scope enforcement", "routing", "cost controls", "audit envelope"],
        components: ["AIGatewayEngine", "AISessionEngine", "AIContextCompositionEngine", "AIPromptAssemblyEngine"],
      },
      {
        name: "Registries",
        responsibilities: ["Prompt, model, tool, agent, memory, context, and business capability lifecycle"],
        components: ["Prompt Registry", "Model Registry", "Tool Registry", "Agent Registry", "Memory Registry", "Context Registry", "Capability Registry"],
      },
      {
        name: "Agent Orchestrator",
        responsibilities: ["Single-agent routing", "multi-agent planning", "collaboration sequencing"],
        components: ["AgentOrchestratorEngine"],
      },
      {
        name: "Enterprise Agents",
        responsibilities: ["Domain intelligence for IMS business areas"],
        components: ["Financial", "Treasury", "Budget", "Procurement", "HR", "Project", "Compliance", "Executive"],
      },
      {
        name: "Shared Services",
        responsibilities: ["Knowledge graph", "RAG", "memory", "workflow", "evaluation", "observability", "audit", "security", "cost", "human approval"],
        components: ["AISharedServicesEngine", "AIGovernanceEngine", "AIToolExecutionEngine", "AIEventIntegrationEngine"],
      },
      {
        name: "LLM Providers",
        responsibilities: ["Provider abstraction and model execution"],
        components: ["AIProviderAdapterEngine", "OpenAI Adapter", "Azure OpenAI Adapter", "Anthropic Adapter", "Gemini Adapter", "Local Adapter", "Future Provider Adapter"],
      },
      {
        name: "IMS Platform",
        responsibilities: ["Business systems and operational data"],
        components: ["Finance", "HR", "Procurement", "Projects", "Logistics", "MEAL", "Fleet", "Reports", "Dashboard"],
      },
    ];
  }

  buildAgentCatalog(): Array<{ domain: AgentDomain; agentName: string; purpose: string }> {
    return [
      { domain: "financial", agentName: "Financial AI Agent", purpose: "Cross-engine finance analysis and decision intelligence." },
      { domain: "treasury", agentName: "Treasury AI Agent", purpose: "Cash, liquidity, FX, bank risk, and payment advice." },
      { domain: "budget", agentName: "Budget AI Agent", purpose: "Budget utilization, forecasts, commitments, and scenario analysis." },
      { domain: "procurement", agentName: "Procurement AI Agent", purpose: "P2P, supplier, procurement risk, and workflow intelligence." },
      { domain: "hr", agentName: "HR AI Agent", purpose: "Workforce, payroll, staffing, and policy intelligence." },
      { domain: "project", agentName: "Project AI Agent", purpose: "Project delivery, workplan, risk, and funding intelligence." },
      { domain: "compliance", agentName: "Compliance AI Agent", purpose: "Donor, audit, segregation-of-duties, and policy compliance." },
      { domain: "executive", agentName: "Executive AI Agent", purpose: "Executive summaries, decisions, emerging risks, and board-level reporting." },
    ];
  }

  buildArchitectureDecisionRecords(): AIArchitectureDecisionRecord[] {
    return [
      {
        id: "AI-ADR-001",
        title: "Route all AI requests through AI Gateway",
        status: "accepted",
        decision: "No agent, model, prompt, or tool is invoked directly by IMS modules; requests go through the AI Gateway.",
        consequences: ["Centralized audit", "policy enforcement", "cost management", "consistent safety controls"],
      },
      {
        id: "AI-ADR-002",
        title: "Registries are source of truth",
        status: "accepted",
        decision: "Prompts, models, tools, agents, memory policies, and context policies are versioned registry artifacts.",
        consequences: ["Approval workflow is possible", "rollback is possible", "changes become auditable"],
      },
      {
        id: "AI-ADR-003",
        title: "Human approval for high-risk actions",
        status: "accepted",
        decision: "High-risk AI actions require human approval; critical autonomous actions are blocked.",
        consequences: ["AI supports judgment", "AI does not bypass governance", "executive accountability remains clear"],
      },
      {
        id: "AI-ADR-004",
        title: "AI Gateway uses a middleware chain",
        status: "accepted",
        decision: "Gateway behavior is organized as a configurable middleware chain from authentication through response.",
        consequences: ["Controls can be inserted without redesigning agents", "security and audit remain consistent"],
      },
      {
        id: "AI-ADR-005",
        title: "AI Session is the execution envelope",
        status: "accepted",
        decision: "Every request is converted into an AISession carrying scope, permissions, context, memory, approval state, telemetry, and audit identity.",
        consequences: ["Multi-turn behavior is traceable", "tenant isolation is carried through all layers"],
      },
      {
        id: "AI-ADR-006",
        title: "Tools execute through a controlled layer",
        status: "accepted",
        decision: "Agents do not invoke tools directly; AIToolExecutionEngine validates schema intent, permissions, rate limits, approval, audit, and result normalization.",
        consequences: ["Tool behavior is consistent", "high-risk actions stay governable"],
      },
      {
        id: "AI-ADR-007",
        title: "Providers use adapters",
        status: "accepted",
        decision: "Provider-specific behavior is isolated behind adapters that return normalized AI responses.",
        consequences: ["Provider replacement is easier", "future models can be added without changing agents"],
      },
      {
        id: "AI-ADR-008",
        title: "Tenant isolation is explicit",
        status: "accepted",
        decision: "Registry lookup, memory, RAG evidence, knowledge graph usage, tool execution, and audit all carry organization and operating-unit scope.",
        consequences: ["AI cannot cross tenant boundaries", "routers can derive scope from authenticated context"],
      },
    ];
  }

  execute(request: AIRequest): AIResponse {
    return this.orchestrator.execute(request);
  }
}
