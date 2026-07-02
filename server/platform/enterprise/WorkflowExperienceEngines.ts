import {
  AIWorkflowDraft,
  AutomationRuleDefinition,
  CrossModuleAutomationPlan,
  DynamicWorkflowForm,
  EnterpriseModule,
  SagaExecutionRecord,
  WorkflowDesignerDefinition,
  WorkflowDocumentationBundle,
  WorkflowMarketplacePackage,
  WorkflowTemplate,
} from "./EnterprisePlatformTypes";

export class WorkflowAnalyticsEngine {
  analyze(records: SagaExecutionRecord[]): {
    averageDurationMs: number;
    bottlenecks: Array<{ stepId: string; averageDurationMs: number; failures: number }>;
    approvalDelays: Array<{ stepId: string; delayMs: number }>;
    retries: number;
    compensationFrequency: number;
    slaCompliancePercent: number;
  } {
    const durations = records.map((record) => record.completedAt ? new Date(record.completedAt).getTime() - new Date(record.startedAt).getTime() : 0);
    const stepStats = new Map<string, { durations: number[]; failures: number }>();

    records.flatMap((record) => record.steps).forEach((step) => {
      const duration = step.startedAt && step.completedAt ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime() : 0;
      const current = stepStats.get(step.stepId) ?? { durations: [], failures: 0 };
      current.durations.push(duration);
      if (step.status === "failed") current.failures += 1;
      stepStats.set(step.stepId, current);
    });

    const bottlenecks = [...stepStats.entries()]
      .map(([stepId, stat]) => ({
        stepId,
        averageDurationMs: Math.round(stat.durations.reduce((sum, value) => sum + value, 0) / Math.max(stat.durations.length, 1)),
        failures: stat.failures,
      }))
      .filter((stat) => stat.averageDurationMs > 0 || stat.failures > 0)
      .sort((a, b) => b.averageDurationMs + b.failures * 1000 - (a.averageDurationMs + a.failures * 1000));

    return {
      averageDurationMs: Math.round(durations.reduce((sum, value) => sum + value, 0) / Math.max(durations.length, 1)),
      bottlenecks,
      approvalDelays: bottlenecks.filter((item) => item.stepId.toLowerCase().includes("approval")).map((item) => ({ stepId: item.stepId, delayMs: item.averageDurationMs })),
      retries: records.flatMap((record) => record.steps).filter((step) => step.status === "failed").length,
      compensationFrequency: records.length ? records.filter((record) => record.compensation.length > 0).length / records.length : 0,
      slaCompliancePercent: records.length ? Math.round((records.filter((record) => record.status === "completed").length / records.length) * 100) : 100,
    };
  }
}

export class WorkflowMarketplaceEngine {
  private readonly packages = new Map<string, WorkflowMarketplacePackage>();

  registerPackage(pkg: WorkflowMarketplacePackage): WorkflowMarketplacePackage {
    this.packages.set(pkg.packageId, pkg);
    return pkg;
  }

  listPackages(module?: EnterpriseModule): WorkflowMarketplacePackage[] {
    const packages = [...this.packages.values()];
    return module ? packages.filter((pkg) => pkg.module === module) : packages;
  }

  installTemplate(packageId: string, templateId: string): WorkflowTemplate {
    const pkg = this.packages.get(packageId);
    const template = pkg?.templates.find((item) => item.templateId === templateId);
    if (!template) throw new Error(`Template ${templateId} not found in package ${packageId}.`);
    return template;
  }
}

export class DynamicWorkflowFormEngine {
  private readonly forms = new Map<string, DynamicWorkflowForm>();

  registerForm(form: DynamicWorkflowForm): DynamicWorkflowForm {
    this.forms.set(form.formId, form);
    return form;
  }

  validateSubmission(formId: string, values: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const form = this.forms.get(formId);
    if (!form) return { valid: false, errors: [`Form ${formId} is not registered.`] };

    const errors = form.fields.flatMap((field) => {
      const value = values[field.fieldId];
      const fieldErrors: string[] = [];
      if (field.required && (value === undefined || value === null || value === "")) {
        fieldErrors.push(`${field.label} is required.`);
      }
      if (typeof value === "number" && field.validation?.min !== undefined && value < field.validation.min) {
        fieldErrors.push(`${field.label} must be at least ${field.validation.min}.`);
      }
      if (typeof value === "number" && field.validation?.max !== undefined && value > field.validation.max) {
        fieldErrors.push(`${field.label} must be at most ${field.validation.max}.`);
      }
      return fieldErrors;
    });

    return { valid: errors.length === 0, errors };
  }
}

export class AIWorkflowAssistantEngine {
  draftFromPrompt(prompt: string): AIWorkflowDraft {
    const highValue = /50,?000|high|director/i.test(prompt);
    const grant = /grant/i.test(prompt);
    const workflowId = grant ? "ai-grant-payment-approval" : "ai-payment-approval";
    const definition: WorkflowDesignerDefinition = {
      workflowId,
      name: grant ? "Grant Payment Approval" : "Payment Approval",
      version: "0.1.0",
      module: "finance",
      trigger: "payment.created",
      nodes: [
        { id: "validate", label: "Validate Payment", action: "validatePayment", executionMode: "sequential", position: { x: 0, y: 0 } },
        { id: "approval", label: "Approval Gate", action: "approvalGate", executionMode: "conditional", approvalGate: true, condition: { field: "amount", operator: "greater_than", value: highValue ? 50000 : 10000 }, position: { x: 180, y: 0 } },
        { id: "notify", label: "Notify Finance", action: "notify", executionMode: "parallel", position: { x: 360, y: 0 } },
      ],
      edges: [
        { from: "validate", to: "approval", label: "requires approval" },
        { from: "approval", to: "notify", label: "approved" },
      ],
      approvalRoutes: [
        {
          routeId: "finance-director",
          strategy: "amount_threshold",
          approverRole: "Finance Director",
          condition: { field: "amount", operator: "greater_than", value: highValue ? 50000 : 10000 },
        },
        ...(grant ? [{
          routeId: "country-director",
          strategy: "module_owner" as const,
          approverRole: "Country Director",
          condition: { field: "grantId", operator: "exists" as const },
        }] : []),
      ],
      notifications: [
        {
          notificationId: "approval-required",
          channel: "email",
          recipientRole: "Finance Director",
          event: "approval_required",
          messageTemplate: "Approval required for workflow {workflowId}.",
        },
      ],
    };

    return {
      prompt,
      definition,
      automationRules: [
        {
          ruleId: `${workflowId}-rule`,
          name: `${definition.name} Automation`,
          module: "finance",
          trigger: "payment.created",
          enabled: true,
          condition: { field: "amount", operator: "greater_than", value: highValue ? 50000 : 10000 },
          action: { type: "start_workflow", workflowId },
        },
      ],
      confidence: {
        intentClarity: 0.86,
        approvalCompleteness: grant ? 0.9 : 0.82,
        automationCoverage: 0.84,
      },
    };
  }
}

export class WorkflowDocumentationGenerator {
  generate(definition: WorkflowDesignerDefinition): WorkflowDocumentationBundle {
    const approvalMatrix = (definition.approvalRoutes ?? []).map((route) => ({
      routeId: route.routeId,
      approverRole: route.approverRole,
      condition: route.condition ? `${route.condition.field} ${route.condition.operator} ${String(route.condition.value ?? "")}`.trim() : undefined,
    }));
    const bpmnText = [
      `Process: ${definition.name}`,
      ...definition.nodes.map((node) => `Task ${node.id}: ${node.label}`),
      ...definition.edges.map((edge) => `Flow ${edge.from} -> ${edge.to}${edge.label ? ` (${edge.label})` : ""}`),
    ].join("\n");

    return {
      workflowId: definition.workflowId,
      workflowDescription: `${definition.name} handles ${definition.trigger} for ${definition.module}.`,
      bpmnText,
      approvalMatrix,
      auditDocument: `Workflow ${definition.workflowId} version ${definition.version} generated from JSON definition with ${definition.nodes.length} nodes.`,
      supportedExports: ["pdf", "docx", "pptx"],
    };
  }
}

export class CrossModuleAutomationEngine {
  createPlan(input: {
    planId: string;
    name: string;
    triggerModule: EnterpriseModule;
    targetModules: EnterpriseModule[];
  }): CrossModuleAutomationPlan {
    const nodes = [
      { id: "grant-approved", label: "Grant Approved", action: "eventReceived", executionMode: "sequential" as const },
      { id: "create-budget", label: "Create Budget", action: "createBudget", executionMode: "parallel" as const },
      { id: "procurement-plan", label: "Create Procurement Plan", action: "createProcurementPlan", executionMode: "parallel" as const },
      { id: "notify-finance", label: "Notify Finance", action: "notify", executionMode: "parallel" as const },
      { id: "dashboard", label: "Update Dashboard", action: "updateDashboard", executionMode: "parallel" as const },
      { id: "ai-summary", label: "Generate AI Summary", action: "generateAISummary", executionMode: "sequential" as const },
    ];

    return {
      planId: input.planId,
      name: input.name,
      triggerModule: input.triggerModule,
      targetModules: input.targetModules,
      workflowDefinition: {
        workflowId: input.planId,
        name: input.name,
        version: "1.0.0",
        module: input.triggerModule,
        trigger: `${input.triggerModule}.approved`,
        nodes,
        edges: [
          { from: "grant-approved", to: "create-budget" },
          { from: "grant-approved", to: "procurement-plan" },
          { from: "grant-approved", to: "notify-finance" },
          { from: "grant-approved", to: "dashboard" },
          { from: "dashboard", to: "ai-summary" },
        ],
      },
      automationRules: [
        {
          ruleId: `${input.planId}-automation`,
          name: `${input.name} Automation`,
          module: input.triggerModule,
          trigger: `${input.triggerModule}.approved`,
          enabled: true,
          action: { type: "start_workflow", workflowId: input.planId },
        },
      ],
      notifications: [
        {
          notificationId: `${input.planId}-notify-finance`,
          channel: "email",
          recipientRole: "Finance Director",
          event: "workflow_started",
          messageTemplate: "Cross-module automation {workflowId} started.",
        },
      ],
    };
  }
}
