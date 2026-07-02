export type EnterpriseModule =
  | "finance"
  | "hr"
  | "procurement"
  | "logistics"
  | "projects"
  | "meal"
  | "compliance";

export type EnterprisePlatformCapability =
  | "event"
  | "workflow_saga"
  | "reporting_export"
  | "notification"
  | "rules"
  | "ai"
  | "analytics"
  | "knowledge_graph";

export type WorkflowExecutionMode = "sequential" | "parallel" | "conditional";
export type WorkflowStepStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "compensated";
export type WorkflowRunStatus = "running" | "completed" | "failed" | "compensating" | "partially_completed";
export type WorkflowVersionStatus = "draft" | "published" | "deprecated" | "archived";
export type ApprovalRoutingStrategy = "role" | "amount_threshold" | "module_owner" | "escalation";
export type AutomationRuleAction = "start_workflow" | "send_notification" | "require_approval" | "schedule_workflow" | "escalate";
export type ScheduleFrequency = "once" | "hourly" | "daily" | "weekly" | "monthly";
export type NotificationChannel = "email" | "teams" | "slack" | "whatsapp" | "sms" | "mobile_push";
export type WorkflowValidationSeverity = "info" | "warning" | "error";
export type DynamicFormFieldType = "text" | "number" | "date" | "select" | "textarea" | "attachment" | "checkbox";

export interface EnterpriseScope {
  organizationId: number;
  operatingUnitId?: number | null;
  userId?: number;
  userRole?: string;
  locale?: "en" | "ar" | "it";
}

export interface EnterprisePlatformServiceCandidate {
  capability: EnterprisePlatformCapability;
  name: string;
  sourcePaths: string[];
  sharedByModules: EnterpriseModule[];
  extractionStatus: "candidate" | "extracted" | "adapter_ready" | "consolidated";
  recommendation: string;
}

export interface EnterpriseModuleAdapter {
  module: EnterpriseModule;
  supportedCapabilities: EnterprisePlatformCapability[];
  adapterId: string;
  buildContext(scope: EnterpriseScope): Record<string, unknown>;
}

export interface SagaStepDefinition {
  stepId: string;
  name: string;
  action: string;
  executionMode?: WorkflowExecutionMode;
  mandatory: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  dependsOn?: string[];
  condition?: {
    field: string;
    operator: "equals" | "not_equals" | "greater_than" | "less_than" | "exists";
    value?: unknown;
  };
  compensationAction?: string;
}

export interface SagaDefinition {
  workflowId: string;
  name: string;
  version: string;
  module: EnterpriseModule;
  trigger: string;
  status?: WorkflowVersionStatus;
  approvalRoutes?: ApprovalRouteDefinition[];
  notifications?: WorkflowNotificationDefinition[];
  steps: SagaStepDefinition[];
}

export interface WorkflowDesignerDefinition {
  workflowId: string;
  name: string;
  version: string;
  module: EnterpriseModule;
  trigger: string;
  nodes: Array<{
    id: string;
    label: string;
    action: string;
    executionMode?: WorkflowExecutionMode;
    mandatory?: boolean;
    condition?: SagaStepDefinition["condition"];
    compensationAction?: string;
    position?: {
      x: number;
      y: number;
    };
    approvalGate?: boolean;
    timer?: {
      durationMinutes: number;
      escalationRole?: string;
    };
    formId?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    condition?: SagaStepDefinition["condition"];
  }>;
  approvalRoutes?: ApprovalRouteDefinition[];
  notifications?: WorkflowNotificationDefinition[];
}

export interface WorkflowDesignerCanvas {
  workflowId: string;
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    executionMode: WorkflowExecutionMode;
    hasCondition: boolean;
    hasApprovalGate: boolean;
    hasTimer: boolean;
    hasNotification: boolean;
  }>;
  connectors: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
}

export interface WorkflowVersionRecord {
  workflowId: string;
  version: string;
  status: WorkflowVersionStatus;
  definition: SagaDefinition;
  createdAt: string;
  createdByRole: string;
  changeReason: string;
}

export interface WorkflowTemplate {
  templateId: string;
  name: string;
  module: EnterpriseModule;
  description: string;
  definition: WorkflowDesignerDefinition;
  tags: string[];
}

export interface WorkflowMarketplacePackage {
  packageId: string;
  name: string;
  module: EnterpriseModule;
  description: string;
  templates: WorkflowTemplate[];
  version: string;
  publisher: string;
}

export interface ApprovalRouteDefinition {
  routeId: string;
  strategy: ApprovalRoutingStrategy;
  approverRole: string;
  condition?: SagaStepDefinition["condition"];
  escalationRole?: string;
}

export interface ApprovalRouteResult {
  routeId: string;
  approverRole: string;
  required: boolean;
  reason: string;
}

export interface WorkflowNotificationDefinition {
  notificationId: string;
  channel: NotificationChannel;
  recipientRole: string;
  event: "workflow_started" | "step_failed" | "approval_required" | "workflow_completed" | "workflow_failed";
  messageTemplate: string;
}

export interface WorkflowMonitoringDashboard {
  totalRuns: number;
  running: number;
  completed: number;
  failed: number;
  compensated: number;
  averageStepsPerRun: number;
  failedSteps: Array<{
    runId: string;
    workflowId: string;
    stepId: string;
    error?: string;
  }>;
  averageDurationMs: number;
  bottlenecks: Array<{
    stepId: string;
    averageDurationMs: number;
    failures: number;
  }>;
  approvalDelays: Array<{
    stepId: string;
    delayMs: number;
  }>;
  retryCount: number;
  compensationFrequency: number;
  slaCompliancePercent: number;
}

export interface RetryCompensationView {
  runId: string;
  workflowId: string;
  retryableSteps: string[];
  compensatedSteps: string[];
  failedCompensations: string[];
}

export interface AutomationRuleDefinition {
  ruleId: string;
  name: string;
  module: EnterpriseModule;
  trigger: string;
  enabled: boolean;
  condition?: SagaStepDefinition["condition"];
  action: {
    type: AutomationRuleAction;
    workflowId?: string;
    notificationId?: string;
    scheduleId?: string;
    approverRole?: string;
  };
}

export interface AutomationRuleEvaluation {
  ruleId: string;
  matched: boolean;
  action?: AutomationRuleDefinition["action"];
  reason: string;
}

export interface WorkflowScheduleDefinition {
  scheduleId: string;
  workflowId: string;
  frequency: ScheduleFrequency;
  enabled: boolean;
  nextRunAt: string;
  payload?: Record<string, unknown>;
}

export interface WorkflowSimulationFinding {
  code:
    | "missing_start"
    | "missing_branch"
    | "infinite_loop"
    | "unreachable_node"
    | "approval_missing"
    | "dependency_invalid"
    | "timer_without_escalation"
    | "valid";
  severity: WorkflowValidationSeverity;
  message: string;
  nodeId?: string;
}

export interface WorkflowSimulationResult {
  workflowId: string;
  valid: boolean;
  findings: WorkflowSimulationFinding[];
  executionPreview: string[];
}

export interface DynamicWorkflowForm {
  formId: string;
  title: string;
  description?: string;
  fields: Array<{
    fieldId: string;
    label: string;
    type: DynamicFormFieldType;
    required: boolean;
    options?: string[];
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      requiredDocumentType?: string;
    };
  }>;
}

export interface WorkflowDocumentationBundle {
  workflowId: string;
  workflowDescription: string;
  bpmnText: string;
  approvalMatrix: Array<{
    routeId: string;
    approverRole: string;
    condition?: string;
  }>;
  auditDocument: string;
  supportedExports: Array<"pdf" | "docx" | "pptx">;
}

export interface AIWorkflowDraft {
  prompt: string;
  definition: WorkflowDesignerDefinition;
  automationRules: AutomationRuleDefinition[];
  confidence: {
    intentClarity: number;
    approvalCompleteness: number;
    automationCoverage: number;
  };
}

export interface CrossModuleAutomationPlan {
  planId: string;
  name: string;
  triggerModule: EnterpriseModule;
  targetModules: EnterpriseModule[];
  workflowDefinition: WorkflowDesignerDefinition;
  automationRules: AutomationRuleDefinition[];
  notifications: WorkflowNotificationDefinition[];
}

export interface SagaExecutionContext {
  runId: string;
  workflowId: string;
  scope: EnterpriseScope;
  input: Record<string, unknown>;
  stepResults: Record<string, Record<string, unknown>>;
}

export interface SagaStepResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
}

export interface SagaExecutionRecord {
  runId: string;
  workflowId: string;
  status: WorkflowRunStatus;
  startedAt: string;
  completedAt?: string;
  steps: Array<{
    stepId: string;
    name: string;
    status: WorkflowStepStatus;
    executionMode: WorkflowExecutionMode;
    startedAt?: string;
    completedAt?: string;
    error?: string;
    result?: Record<string, unknown>;
  }>;
  compensation: Array<{
    stepId: string;
    action: string;
    status: "completed" | "failed";
    error?: string;
  }>;
}

export interface WorkflowStepExecutor {
  action: string;
  execute(context: SagaExecutionContext): Promise<SagaStepResult>;
  compensate?(context: SagaExecutionContext): Promise<SagaStepResult>;
}

export interface EnterprisePlatformRegistrySummary {
  capabilities: EnterprisePlatformCapability[];
  modules: EnterpriseModule[];
  candidates: EnterprisePlatformServiceCandidate[];
  adapters: Array<{
    adapterId: string;
    module: EnterpriseModule;
    capabilities: EnterprisePlatformCapability[];
  }>;
}
