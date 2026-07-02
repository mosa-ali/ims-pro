export type DigitalFinanceDomain =
  | "treasury"
  | "budget"
  | "general_ledger"
  | "grants"
  | "procurement"
  | "assets"
  | "compliance"
  | "risk"
  | "projects";

export type DigitalRiskLevel = "low" | "medium" | "high" | "critical";
export type ScenarioSeverity = "optimistic" | "expected" | "stress" | "crisis";
export type AutonomousActionStatus = "recommended" | "requires_approval" | "approved" | "executed" | "blocked";

export interface DigitalFinanceScope {
  organizationId: number;
  operatingUnitId?: number | null;
  userId?: number;
  userRole?: string;
  locale?: "en" | "ar" | "it";
}

export interface KnowledgeGraphNode {
  id: string;
  type:
    | "organization"
    | "operating_unit"
    | "grant"
    | "project"
    | "donor"
    | "budget_line"
    | "cash_account"
    | "supplier"
    | "purchase_order"
    | "asset"
    | "journal"
    | "risk"
    | "kpi";
  label: string;
  domain: DigitalFinanceDomain;
  properties: Record<string, unknown>;
}

export interface KnowledgeGraphEdge {
  id: string;
  from: string;
  to: string;
  relationship:
    | "funds"
    | "charges"
    | "owns"
    | "supplies"
    | "posts_to"
    | "impacts"
    | "constrains"
    | "mitigates"
    | "measures"
    | "depends_on";
  weight: number;
  properties?: Record<string, unknown>;
}

export interface KnowledgeGraphQueryResult {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  explanation: string;
}

export interface DigitalTwinState {
  organizationId: number;
  operatingUnitId?: number | null;
  asOfDate: string;
  cashBalance: number;
  restrictedCash: number;
  budgetAvailable: number;
  grantUtilizationPercent: number;
  committedSpend: number;
  pipelineSpend: number;
  assetValue: number;
  riskScore: number;
  kpis: Record<string, number>;
}

export interface ScenarioAssumption {
  metric: keyof Pick<
    DigitalTwinState,
    "cashBalance" | "restrictedCash" | "budgetAvailable" | "committedSpend" | "pipelineSpend" | "riskScore"
  >;
  changeType: "percent" | "absolute";
  value: number;
  description: string;
}

export interface FinanceScenario {
  id: string;
  name: string;
  severity: ScenarioSeverity;
  assumptions: ScenarioAssumption[];
}

export interface FinancialSimulationResult {
  scenarioId: string;
  baseline: DigitalTwinState;
  simulated: DigitalTwinState;
  deltas: Record<string, number>;
  riskLevel: DigitalRiskLevel;
  narrative: string;
}

export interface DecisionEvidence {
  source: DigitalFinanceDomain | "digital_twin" | "scenario" | "knowledge_graph";
  metric: string;
  value: number | string;
  interpretation: string;
}

export interface FinanceDecision {
  id: string;
  title: string;
  riskLevel: DigitalRiskLevel;
  priority: "immediate" | "today" | "this_week" | "this_month" | "strategic";
  ownerRole: string;
  recommendation: string;
  expectedImpact: string;
  evidence: DecisionEvidence[];
  auditTrail: Array<{
    step: string;
    explanation: string;
  }>;
}

export interface AutonomousFinanceAction {
  id: string;
  actionType:
    | "accelerate_inflow"
    | "reschedule_payment"
    | "freeze_discretionary_spend"
    | "request_budget_reallocation"
    | "trigger_compliance_review"
    | "open_risk_workflow";
  status: AutonomousActionStatus;
  ownerRole: string;
  reason: string;
  requiredApprovalRole?: string;
  linkedDecisionId: string;
}
