export type AIProvider = "openai" | "azure_openai" | "anthropic" | "gemini" | "local" | "future_provider";
export type AgentDomain = "financial" | "treasury" | "budget" | "procurement" | "hr" | "project" | "executive" | "compliance";
export type RegistryStatus = "draft" | "pending_approval" | "approved" | "deprecated" | "disabled";
export type ApprovalDecision = "approved" | "rejected" | "requires_changes";
export type HumanApprovalRequirement = "none" | "recommended" | "required" | "blocked";
export type AIRiskLevel = "low" | "medium" | "high" | "critical";
export type AIArtifactType = "prompt" | "model" | "tool" | "agent" | "memory" | "context";
export type AIDataClassification = "public" | "internal" | "confidential" | "restricted" | "secret" | "credential" | "unredacted_pii";
export type AIMiddlewareName =
  | "authentication"
  | "authorization"
  | "organization_scope"
  | "operating_unit_scope"
  | "data_classification"
  | "context_builder"
  | "memory"
  | "rag"
  | "prompt_assembly"
  | "model_routing"
  | "agent"
  | "tool_execution"
  | "evaluation"
  | "audit"
  | "response";

export interface AIScope {
  organizationId: number;
  operatingUnitId?: number | null;
  userId: number;
  userRole: string;
  locale?: "en" | "ar" | "it";
}

export interface AIModelRegistration {
  id: string;
  provider: AIProvider;
  modelName: string;
  purpose: "chat" | "reasoning" | "embedding" | "classification" | "rerank" | "local";
  status: RegistryStatus;
  maxTokens?: number;
  costPerUnit?: number;
  dataResidency?: string;
  riskLevel: AIRiskLevel;
  organizationId?: number;
  operatingUnitId?: number | null;
}

export interface PromptRegistration {
  id: string;
  name: string;
  version: string;
  ownerRole: string;
  domain: AgentDomain | "shared";
  status: RegistryStatus;
  template: string;
  allowedModels: string[];
  hallucinationControls: string[];
  organizationId?: number;
  operatingUnitId?: number | null;
}

export interface ToolRegistration {
  id: string;
  name: string;
  domain: AgentDomain | "shared";
  status: RegistryStatus;
  riskLevel: AIRiskLevel;
  requiresHumanApproval: boolean;
  inputSchemaRef?: string;
  outputSchemaRef?: string;
  requiredPermissions?: string[];
  rateLimitPerMinute?: number;
  organizationId?: number;
  operatingUnitId?: number | null;
}

export interface AgentRegistration {
  id: string;
  name: string;
  domain: AgentDomain;
  status: RegistryStatus;
  modelIds: string[];
  promptIds: string[];
  toolIds: string[];
  memoryPolicyId?: string;
  approvalPolicyId?: string;
  organizationId?: number;
  operatingUnitId?: number | null;
}

export interface MemoryPolicy {
  id: string;
  name: string;
  retentionDays: number;
  piiAllowed: boolean;
  scope: "session" | "user" | "organization" | "domain";
  status: RegistryStatus;
}

export interface ContextPolicy {
  id: string;
  name: string;
  maxContextItems: number;
  includeAuditTrail: boolean;
  allowedDomains: AgentDomain[];
  status: RegistryStatus;
}

export interface AIOperatingModel {
  promptCreators: string[];
  promptApprovers: string[];
  agentApprovers: string[];
  toolApprovers: string[];
  aiUserRoles: string[];
  overrideRoles: string[];
  modelUpdateApprovers: string[];
  costManagers: string[];
  qualityOwners: string[];
  hallucinationTrackingOwner: string;
  promptVersioningPolicy: string;
  qualityMeasurementPolicy: string;
}

export interface AIGovernancePolicy {
  id: string;
  name: string;
  riskLevel: AIRiskLevel;
  humanApprovalRequirement: HumanApprovalRequirement;
  allowedRoles: string[];
  blockedDataClasses: string[];
  auditRequired: boolean;
  evaluationRequired: boolean;
}

export interface AIRequest {
  requestId: string;
  scope: AIScope;
  agentId: string;
  task: string;
  context: Record<string, unknown>;
  requestedToolIds?: string[];
  dataClassification?: AIDataClassification;
  conversationId?: string;
  permissions?: string[];
}

export interface AISession {
  sessionId: string;
  conversationId: string;
  request: AIRequest;
  scope: AIScope;
  permissions: string[];
  dataClassification: AIDataClassification;
  context: Record<string, unknown>;
  memory: Record<string, unknown>;
  ragEvidence: RAGEvidenceItem[];
  promptSections: PromptSections;
  selectedModelId?: string;
  selectedAgentId?: string;
  approval: {
    requirement: HumanApprovalRequirement;
    policyIds: string[];
    reasons: string[];
  };
  telemetry: {
    middlewareTrace: AIMiddlewareName[];
    startedAt: string;
    completedAt?: string;
    estimatedCost: number;
    tokenEstimate: number;
  };
  auditId: string;
}

export interface RAGEvidenceItem {
  id: string;
  score: number;
  summary: string;
  sourceType: "memory" | "document" | "knowledge_graph" | "system";
  organizationId: number;
  operatingUnitId?: number | null;
}

export interface PromptSections {
  system: string[];
  organizationContext: string[];
  domainContext: string[];
  userTask: string[];
  ragEvidence: string[];
  memory: string[];
  outputSchema: string[];
}

export interface AIResponse {
  requestId: string;
  agentId: string;
  status: "completed" | "blocked" | "needs_human_approval";
  output: {
    summary: string;
    structuredData: Record<string, unknown>;
    citations: string[];
  };
  governance: {
    riskLevel: AIRiskLevel;
    approvalRequirement: HumanApprovalRequirement;
    auditId: string;
    policyIds: string[];
  };
  observability: {
    latencyMs: number;
    estimatedCost: number;
    modelId?: string;
    tokenEstimate?: number;
  };
}

export interface ToolExecutionRequest {
  session: AISession;
  toolId: string;
  input: Record<string, unknown>;
}

export interface ToolExecutionResult {
  toolId: string;
  status: "completed" | "blocked" | "requires_human_approval";
  normalizedResult: Record<string, unknown>;
  auditId: string;
  reasons: string[];
}

export interface AIProviderAdapterRequest {
  session: AISession;
  model: AIModelRegistration;
  prompt: string;
}

export interface AIProviderAdapterResponse {
  provider: AIProvider;
  modelId: string;
  status: "completed" | "failed";
  normalizedText: string;
  structuredData: Record<string, unknown>;
  tokenEstimate: number;
  estimatedCost: number;
}

export interface AICapabilityRegistration {
  id: string;
  name: string;
  agentId: string;
  domain: AgentDomain | "shared";
  businessOwnerRole: string;
  status: "planned" | "pilot" | "production" | "retired";
  description: string;
  organizationId?: number;
  operatingUnitId?: number | null;
}

export interface AIRegistrySummary extends Record<AIArtifactType, number> {
  capability: number;
}

export interface AIPlatformEvent {
  eventId: string;
  eventType:
    | "payment_approved"
    | "grant_updated"
    | "procurement_completed"
    | "employee_created"
    | "budget_updated"
    | "journal_posted";
  organizationId: number;
  operatingUnitId?: number | null;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface KnowledgeGraphNode {
  id: string;
  type: "grant" | "project" | "donor" | "budget" | "cash" | "procurement" | "risk" | "kpi" | "forecast" | "compliance" | "employee" | "asset";
  label: string;
  properties?: Record<string, unknown>;
}

export interface KnowledgeGraphEdge {
  from: string;
  to: string;
  relationship: "funds" | "owns" | "constrains" | "impacts" | "measures" | "forecasts" | "approves" | "raises_risk";
}

export interface PlatformArchitectureLayer {
  name: string;
  responsibilities: string[];
  components: string[];
}

export interface AIArchitectureDecisionRecord {
  id: string;
  title: string;
  status: "proposed" | "accepted" | "superseded";
  decision: string;
  consequences: string[];
}
