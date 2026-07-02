export type GovernanceEntityType =
  | "payment"
  | "journal"
  | "procurement"
  | "grant"
  | "budget"
  | "workflow"
  | "master_data";

export type GovernanceStatus = "compliant" | "warning" | "non_compliant" | "blocked";
export type GovernanceSeverity = "info" | "warning" | "high" | "critical";
export type WorkflowStatus = "draft" | "review" | "approval" | "exception" | "approved" | "rejected" | "completed";
export type ControlType = "preventive" | "detective" | "corrective";
export type ExceptionLifecycleStatus = "detected" | "assigned" | "investigating" | "mitigated" | "approved" | "closed" | "archived" | "waived";

export interface GovernanceScope {
  organizationId: number;
  operatingUnitId?: number | null;
  userId?: number;
  userRole?: string;
  locale?: "en" | "ar" | "it";
}

export interface GovernanceTransaction {
  id: string;
  entityType: GovernanceEntityType;
  amount: number;
  currency: string;
  description: string;
  requestedByUserId: number;
  preparedByUserId?: number;
  reviewedByUserId?: number;
  approvedByUserId?: number;
  paidByUserId?: number;
  donorId?: string;
  grantId?: string;
  projectId?: string;
  budgetLineId?: string;
  costCategory?: string;
  countryCode?: string;
  vendorId?: string;
  transactionDate: string;
  documents?: string[];
  metadata?: Record<string, unknown>;
}

export interface DonorRule {
  id: string;
  donorId: string;
  name: string;
  active: boolean;
  allowedCostCategories?: string[];
  restrictedBudgetLineIds?: string[];
  allowedCountryCodes?: string[];
  maxTransactionAmount?: number;
  requiresSupportingDocuments?: string[];
  spendingEndDate?: string;
  severity: GovernanceSeverity;
  sourceRef?: string;
  policyPackId?: string;
}

export interface DonorPolicyPack {
  id: string;
  donorId: string;
  donorName: string;
  version: string;
  effectiveDate: string;
  active: boolean;
  rules: DonorRule[];
  reportingRequirements: string[];
  visibilityRequirements: string[];
  procurementThresholds: Array<{
    minAmount: number;
    maxAmount: number;
    requirement: string;
  }>;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  status: GovernanceStatus;
  severity: GovernanceSeverity;
  message: string;
  remediation: string;
}

export interface RuleEvaluation {
  status: GovernanceStatus;
  score: number;
  violations: RuleViolation[];
}

export interface PolicyDefinition {
  id: string;
  name: string;
  version: string;
  effectiveDate: string;
  supersedesPolicyId?: string;
  approvedByRole: string;
  changeReason: string;
  active: boolean;
  entityTypes: GovernanceEntityType[];
  severity: GovernanceSeverity;
  rules: {
    maxAmountWithoutDirectorApproval?: number;
    requiredDocuments?: string[];
    blockedCostCategories?: string[];
    enforceSegregationOfDuties?: boolean;
    requiredApproverRoles?: string[];
    exceptionRequiresAudit?: boolean;
  };
}

export interface PolicyVersionRecord {
  policyId: string;
  version: string;
  effectiveDate: string;
  supersedesPolicyId?: string;
  approvedByRole: string;
  changeReason: string;
  createdAt: string;
}

export interface PolicyEvaluation {
  status: GovernanceStatus;
  score: number;
  requiredApprovals: string[];
  exceptions: GovernanceException[];
  appliedPolicyIds: string[];
}

export interface GovernanceException {
  id: string;
  entityId: string;
  entityType: GovernanceEntityType;
  severity: GovernanceSeverity;
  status: ExceptionLifecycleStatus;
  title: string;
  description: string;
  ownerRole: string;
  dueDate: string;
  lifecycleHistory?: Array<{
    status: ExceptionLifecycleStatus;
    changedAt: string;
    changedByRole: string;
    note: string;
  }>;
}

export interface GovernanceControl {
  id: string;
  name: string;
  type: ControlType;
  description: string;
  ownerRole: string;
  linkedPolicyIds: string[];
  linkedRuleIds: string[];
  automationLevel: "manual" | "semi_automated" | "automated";
}

export interface ControlEvaluation {
  controlId: string;
  type: ControlType;
  status: GovernanceStatus;
  evidence: string[];
  exceptions: GovernanceException[];
}

export interface KnowledgeBaseEntry {
  id: string;
  sourceType: "donor_rule" | "internal_policy" | "procurement_rule" | "finance_manual" | "hr_policy" | "sop";
  title: string;
  summary: string;
  sourceRef: string;
  effectiveDate?: string;
  tags: string[];
}

export interface GovernanceSimulationResult {
  transactionId: string;
  baselineStatus: GovernanceStatus;
  simulatedStatus: GovernanceStatus;
  policyImpact: string[];
  donorImpact: string[];
  budgetImpact: string[];
  complianceRisk: GovernanceRiskMatrixResult;
  recommendation: string;
}

export interface GovernanceMonitoringItem {
  id: string;
  type: "new_donor_rule" | "expired_grant" | "expired_approval" | "missing_document" | "overdue_exception";
  status: GovernanceStatus;
  severity: GovernanceSeverity;
  message: string;
  ownerRole: string;
  detectedAt: string;
}

export interface GovernanceRiskMatrixResult {
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  priority: "low" | "medium" | "high" | "urgent";
  mitigation: string;
}

export interface GovernanceAIAdvice {
  summary: string;
  evidenceRefs: string[];
  recommendation: string;
  confidence: {
    ruleCoverage: number;
    policyCoverage: number;
    evidenceCompleteness: number;
  };
}

export interface AuditRecord {
  id: string;
  organizationId: number;
  operatingUnitId?: number | null;
  entityId: string;
  entityType: GovernanceEntityType;
  action: string;
  actorUserId?: number;
  timestamp: string;
  severity: GovernanceSeverity;
  details: Record<string, unknown>;
}

export interface AuditAutomationResult {
  auditId: string;
  status: GovernanceStatus;
  findings: GovernanceException[];
  auditTrail: AuditRecord[];
}

export interface WorkflowStep {
  order: number;
  name: string;
  ownerRole: string;
  status: "pending" | "completed" | "blocked";
  required: boolean;
}

export interface GovernanceWorkflow {
  id: string;
  entityId: string;
  entityType: GovernanceEntityType;
  status: WorkflowStatus;
  currentStep: number;
  steps: WorkflowStep[];
}

export interface ComplianceAssessment {
  organizationId: number;
  operatingUnitId?: number | null;
  entityId: string;
  entityType: GovernanceEntityType;
  status: GovernanceStatus;
  score: number;
  donorRuleEvaluation: RuleEvaluation;
  policyEvaluation: PolicyEvaluation;
  controlEvaluations?: ControlEvaluation[];
  evidenceRefs?: string[];
  recommendations: string[];
  assessedAt: string;
}

export interface GovernanceReviewResult {
  assessment: ComplianceAssessment;
  audit: AuditAutomationResult;
  workflow: GovernanceWorkflow;
  exceptions: GovernanceException[];
  aiAdvice?: GovernanceAIAdvice;
}
