import { describe, expect, it } from "vitest";
import { EnterprisePlatform } from "./EnterprisePlatformServices";
import { createDefaultEnterprisePlatformRegistry } from "./EnterprisePlatformRegistry";
import { WorkflowSagaOrchestrator } from "./WorkflowSagaOrchestrator";
import { WorkflowDefinitionRegistry } from "./WorkflowDefinitionRegistry";
import { PlatformAutomationEngine } from "./WorkflowAutomationEngine";

function registerBasicExecutors(orchestrator: WorkflowSagaOrchestrator, calls: string[]): void {
  ["match", "grantCharge", "knowledgeGraphUpdate", "notify", "fail"].forEach((action) => {
    orchestrator.registerExecutor({
      action,
      async execute() {
        calls.push(action);
        return action === "fail"
          ? { success: false, data: {}, error: "forced failure" }
          : { success: true, data: { action, completed: true } };
      },
      async compensate() {
        calls.push(`compensate:${action}`);
        return { success: true, data: { compensated: action } };
      },
    });
  });
  orchestrator.registerExecutor({
    action: "compensateMatch",
    async execute() {
      calls.push("compensateMatch");
      return { success: true, data: { compensated: true } };
    },
  });
}

describe("Phase 15 Enterprise Platform Consolidation", () => {
  it("extracts shared platform candidates and module adapters", () => {
    const registry = createDefaultEnterprisePlatformRegistry();
    const summary = registry.buildSummary();
    const finance = registry.getAdapter("finance")!;
    const meal = registry.getAdapter("meal")!;

    expect(summary.capabilities).toEqual(expect.arrayContaining([
      "event",
      "workflow_saga",
      "reporting_export",
      "notification",
      "rules",
      "ai",
      "analytics",
      "knowledge_graph",
    ]));
    expect(summary.modules).toEqual(expect.arrayContaining(["finance", "hr", "procurement", "logistics", "projects", "meal", "compliance"]));
    expect(finance.supportedCapabilities).toContain("workflow_saga");
    expect(meal.buildContext({ organizationId: 1, operatingUnitId: 10 }).capabilities).toContain("analytics");
  });

  it("executes parallel workflow branches and rejoins at the next sequential step", async () => {
    const calls: string[] = [];
    const orchestrator = new WorkflowSagaOrchestrator();
    registerBasicExecutors(orchestrator, calls);
    orchestrator.registerWorkflow({
      workflowId: "p2p-shared-workflow",
      name: "P2P Shared Workflow",
      version: "1.0.0",
      module: "procurement",
      trigger: "matching.completed",
      steps: [
        { stepId: "match", name: "Three Way Matching", action: "match", executionMode: "sequential", mandatory: true, compensationAction: "compensateMatch" },
        { stepId: "grant", name: "Grant Charge", action: "grantCharge", executionMode: "parallel", mandatory: false, dependsOn: ["match"] },
        { stepId: "graph", name: "Knowledge Graph Update", action: "knowledgeGraphUpdate", executionMode: "parallel", mandatory: false, dependsOn: ["match"] },
        { stepId: "notify", name: "Notify Stakeholders", action: "notify", executionMode: "sequential", mandatory: false, dependsOn: ["grant", "graph"] },
      ],
    });

    const result = await orchestrator.execute({
      workflowId: "p2p-shared-workflow",
      scope: { organizationId: 1, operatingUnitId: 10 },
      payload: { amount: 2500 },
    });

    expect(result.status).toBe("completed");
    expect(result.steps.filter((step) => step.executionMode === "parallel")).toHaveLength(2);
    expect(calls.indexOf("notify")).toBeGreaterThan(calls.indexOf("grantCharge"));
    expect(calls.indexOf("notify")).toBeGreaterThan(calls.indexOf("knowledgeGraphUpdate"));
  });

  it("loads visual workflow designer JSON and supports conditional steps", async () => {
    const calls: string[] = [];
    const orchestrator = new WorkflowSagaOrchestrator();
    registerBasicExecutors(orchestrator, calls);
    orchestrator.loadFromJSON({
      workflowId: "designer-workflow",
      name: "Designer Workflow",
      version: "1.0.0",
      module: "finance",
      trigger: "payment.ready",
      nodes: [
        { id: "match", label: "Match", action: "match", executionMode: "sequential" },
        { id: "grant", label: "Grant Charge", action: "grantCharge", executionMode: "parallel", condition: { field: "chargeGrant", operator: "equals", value: true } },
        { id: "graph", label: "Graph Update", action: "knowledgeGraphUpdate", executionMode: "parallel" },
        { id: "notify", label: "Notify", action: "notify", executionMode: "sequential" },
      ],
      edges: [
        { from: "match", to: "grant" },
        { from: "match", to: "graph" },
        { from: "grant", to: "notify" },
        { from: "graph", to: "notify" },
      ],
    });

    const result = await orchestrator.execute({
      workflowId: "designer-workflow",
      scope: { organizationId: 1 },
      payload: { chargeGrant: false },
    });

    expect(result.status).toBe("completed");
    expect(result.steps.find((step) => step.stepId === "grant")?.status).toBe("skipped");
    expect(result.steps.find((step) => step.stepId === "graph")?.status).toBe("completed");
  });

  it("compensates completed steps in reverse order when a mandatory step fails", async () => {
    const calls: string[] = [];
    const orchestrator = new WorkflowSagaOrchestrator();
    registerBasicExecutors(orchestrator, calls);
    orchestrator.registerWorkflow({
      workflowId: "compensation-workflow",
      name: "Compensation Workflow",
      version: "1.0.0",
      module: "finance",
      trigger: "payment.post",
      steps: [
        { stepId: "match", name: "Match", action: "match", mandatory: true, compensationAction: "compensateMatch" },
        { stepId: "fail", name: "Fail", action: "fail", mandatory: true },
      ],
    });

    const result = await orchestrator.execute({
      workflowId: "compensation-workflow",
      scope: { organizationId: 1 },
    });

    expect(result.status).toBe("failed");
    expect(result.compensation).toEqual([
      expect.objectContaining({ stepId: "match", action: "compensateMatch", status: "completed" }),
    ]);
  });

  it("exposes consolidated enterprise platform services", () => {
    const platform = new EnterprisePlatform();
    const scope = { organizationId: 1, operatingUnitId: 10, userId: 7, userRole: "Executive Director" };
    const event = platform.events.publish({
      eventType: "finance.payment.approved",
      module: "finance",
      scope,
      payload: { paymentId: 100 },
      correlationId: "corr-1",
    });
    const exportPlan = platform.reporting.createExportPlan("finance", "trial-balance", scope);
    const notification = platform.notifications.routeNotification("finance", "Payment approved", scope);
    const rules = platform.rules.evaluate({ module: "finance", trigger: "payment", facts: { amount: 75000 }, scope });
    const analytics = platform.analytics.summarize({ module: "finance", metrics: { cash: 80, budget: 70 }, scope });
    const graph = platform.knowledgeGraph.buildFinanceGraph(scope);
    const ai = platform.ai.executeExecutiveBrief(scope, { cashCoverageDays: 42 });

    expect(platform.availableCapabilities()).toContain("knowledge_graph");
    expect(platform.events.replay(scope)).toContainEqual(event);
    expect(exportPlan).toMatchObject({ supportsScheduledDelivery: true, auditHistoryRequired: true });
    expect(notification.channels).toContain("whatsapp");
    expect(rules.requiresApproval).toBe(true);
    expect(analytics.average).toBe(75);
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(ai.status).toBe("completed");
  });

  it("publishes versioned workflow JSON definitions and instantiates templates", () => {
    const calls: string[] = [];
    const orchestrator = new WorkflowSagaOrchestrator();
    registerBasicExecutors(orchestrator, calls);
    const registry = new WorkflowDefinitionRegistry(orchestrator);

    registry.registerTemplate({
      templateId: "approval-template",
      name: "Approval Template",
      module: "finance",
      description: "Reusable approval workflow template.",
      tags: ["approval", "finance"],
      definition: {
        workflowId: "template-source",
        name: "Template Source",
        version: "1.0.0",
        module: "finance",
        trigger: "payment.ready",
        nodes: [
          { id: "match", label: "Validate", action: "match" },
          { id: "notify", label: "Notify", action: "notify" },
        ],
        edges: [{ from: "match", to: "notify" }],
      },
    });

    const definition = registry.instantiateTemplate({
      templateId: "approval-template",
      workflowId: "payment-approval",
      version: "1.0.0",
    });
    const v1 = registry.publishFromJSON({
      definition,
      createdByRole: "Workflow Admin",
      changeReason: "Initial workflow publication.",
    });
    const v2 = registry.publishFromJSON({
      definition: { ...definition, version: "1.1.0", name: "Payment Approval v1.1" },
      createdByRole: "Workflow Admin",
      changeReason: "Notification wording update.",
    });

    expect(v1.status).toBe("deprecated");
    expect(v2.status).toBe("published");
    expect(registry.getPublished("payment-approval")?.version).toBe("1.1.0");
    expect(registry.listVersions("payment-approval")).toHaveLength(2);
    expect(registry.listTemplates().map((template) => template.templateId)).toContain("approval-template");
  });

  it("resolves approval routing from workflow facts", () => {
    const orchestrator = new WorkflowSagaOrchestrator();
    const registry = new WorkflowDefinitionRegistry(orchestrator);
    registry.publishFromJSON({
      createdByRole: "Workflow Admin",
      changeReason: "High-value approval route.",
      definition: {
        workflowId: "approval-routing",
        name: "Approval Routing",
        version: "1.0.0",
        module: "finance",
        trigger: "payment.ready",
        nodes: [{ id: "match", label: "Validate", action: "match" }],
        edges: [],
        approvalRoutes: [
          {
            routeId: "finance-director-high-value",
            strategy: "amount_threshold",
            approverRole: "Finance Director",
            condition: { field: "amount", operator: "greater_than", value: 50000 },
          },
        ],
      },
    });

    const routes = registry.resolveApprovalRoutes("approval-routing", { organizationId: 1 }, { amount: 75000 });

    expect(routes).toEqual([
      expect.objectContaining({
        routeId: "finance-director-high-value",
        approverRole: "Finance Director",
        required: true,
      }),
    ]);
  });

  it("builds monitoring dashboard and retry compensation UI model", async () => {
    const calls: string[] = [];
    const orchestrator = new WorkflowSagaOrchestrator();
    registerBasicExecutors(orchestrator, calls);
    orchestrator.registerWorkflow({
      workflowId: "automation-failure",
      name: "Automation Failure",
      version: "1.0.0",
      module: "finance",
      trigger: "payment.post",
      steps: [
        { stepId: "match", name: "Match", action: "match", mandatory: true, compensationAction: "compensateMatch" },
        { stepId: "fail", name: "Fail", action: "fail", mandatory: true },
      ],
    });
    const automation = new PlatformAutomationEngine(orchestrator);
    const record = await orchestrator.execute({ workflowId: "automation-failure", scope: { organizationId: 1 } });
    const dashboard = automation.monitoring.buildDashboard([record]);
    const retryView = automation.monitoring.buildRetryCompensationView(record);

    expect(dashboard.failed).toBe(1);
    expect(dashboard.failedSteps).toEqual([expect.objectContaining({ stepId: "fail" })]);
    expect(retryView.retryableSteps).toContain("fail");
    expect(retryView.compensatedSteps).toContain("match");
  });

  it("evaluates automation rules and runs scheduled workflows with notifications", async () => {
    const calls: string[] = [];
    const platform = new EnterprisePlatform();
    registerBasicExecutors(platform.workflow, calls);
    platform.workflow.registerWorkflow({
      workflowId: "scheduled-workflow",
      name: "Scheduled Workflow",
      version: "1.0.0",
      module: "compliance",
      trigger: "schedule.daily",
      steps: [{ stepId: "notify", name: "Notify", action: "notify", mandatory: true }],
    });
    platform.automation.rules.registerRule({
      ruleId: "auto-high-value",
      name: "High Value Automation",
      module: "finance",
      trigger: "payment.created",
      enabled: true,
      condition: { field: "amount", operator: "greater_than", value: 50000 },
      action: { type: "require_approval", approverRole: "Finance Director" },
    });
    platform.automation.scheduler.registerSchedule({
      scheduleId: "daily-compliance",
      workflowId: "scheduled-workflow",
      frequency: "daily",
      enabled: true,
      nextRunAt: "2026-07-03T00:00:00.000Z",
      payload: { source: "scheduler" },
    });

    const evaluations = platform.automation.rules.evaluate("payment.created", { amount: 75000 });
    const scheduledRuns = await platform.automation.runDueSchedules({ organizationId: 1, userRole: "Compliance Officer" }, "2026-07-03T01:00:00.000Z");
    const notifications = platform.automation.notifications.buildNotifications({
      workflowId: "scheduled-workflow",
      scope: { organizationId: 1 },
      event: "workflow_completed",
      definitions: [
        {
          notificationId: "workflow-completed",
          channel: "email",
          recipientRole: "Compliance Officer",
          event: "workflow_completed",
          messageTemplate: "Workflow {workflowId} completed.",
        },
      ],
    });

    expect(evaluations).toEqual([expect.objectContaining({ matched: true })]);
    expect(scheduledRuns).toHaveLength(1);
    expect(scheduledRuns[0].status).toBe("completed");
    expect(notifications[0].message).toBe("Workflow scheduled-workflow completed.");
  });

  it("builds workflow designer canvas metadata and validates workflow simulation", () => {
    const platform = new EnterprisePlatform();
    const definition = {
      workflowId: "designer-validation",
      name: "Designer Validation",
      version: "1.0.0",
      module: "finance" as const,
      trigger: "payment.created",
      nodes: [
        { id: "start", label: "Start", action: "start", executionMode: "sequential" as const, position: { x: 0, y: 0 } },
        { id: "approval", label: "Approval", action: "approval", executionMode: "conditional" as const, approvalGate: true, timer: { durationMinutes: 60 }, position: { x: 200, y: 0 } },
      ],
      edges: [{ from: "start", to: "approval", label: "needs approval" }],
    };

    const canvas = platform.workflowDesigner.buildCanvas(definition);
    const simulation = platform.workflowSimulation.simulate(definition);

    expect(canvas.nodes[1]).toMatchObject({ hasApprovalGate: true, hasTimer: true });
    expect(simulation.valid).toBe(false);
    expect(simulation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "approval_missing" }),
      expect.objectContaining({ code: "timer_without_escalation" }),
    ]));
  });

  it("detects infinite loops and unreachable workflow nodes before publishing", () => {
    const platform = new EnterprisePlatform();
    const simulation = platform.workflowSimulation.simulate({
      workflowId: "bad-workflow",
      name: "Bad Workflow",
      version: "1.0.0",
      module: "finance",
      trigger: "payment.created",
      nodes: [
        { id: "a", label: "A", action: "a" },
        { id: "b", label: "B", action: "b" },
        { id: "orphan", label: "Orphan", action: "orphan" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ],
    });

    expect(simulation.valid).toBe(false);
    expect(simulation.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["infinite_loop", "unreachable_node"]));
  });

  it("analyzes workflow performance and bottlenecks", async () => {
    const calls: string[] = [];
    const platform = new EnterprisePlatform();
    registerBasicExecutors(platform.workflow, calls);
    platform.workflow.registerWorkflow({
      workflowId: "analytics-workflow",
      name: "Analytics Workflow",
      version: "1.0.0",
      module: "finance",
      trigger: "analytics",
      steps: [
        { stepId: "match", name: "Match", action: "match", mandatory: true },
        { stepId: "fail", name: "Approval Delay", action: "fail", mandatory: true },
      ],
    });
    const failed = await platform.workflow.execute({ workflowId: "analytics-workflow", scope: { organizationId: 1 } });
    const analytics = platform.workflowAnalytics.analyze([failed]);

    expect(analytics.retries).toBeGreaterThan(0);
    expect(analytics.compensationFrequency).toBe(0);
    expect(analytics.bottlenecks.map((item) => item.stepId)).toContain("fail");
  });

  it("supports workflow marketplace packages and dynamic forms", () => {
    const platform = new EnterprisePlatform();
    platform.workflowMarketplace.registerPackage({
      packageId: "finance-workflows",
      name: "Finance Workflow Pack",
      module: "finance",
      description: "Reusable finance approval workflows.",
      version: "1.0.0",
      publisher: "IMS Platform",
      templates: [
        {
          templateId: "finance-approval",
          name: "Finance Approval Workflow",
          module: "finance",
          description: "High-value finance approval.",
          tags: ["approval"],
          definition: {
            workflowId: "finance-template",
            name: "Finance Template",
            version: "1.0.0",
            module: "finance",
            trigger: "payment.created",
            nodes: [{ id: "start", label: "Start", action: "start" }],
            edges: [],
          },
        },
      ],
    });
    platform.dynamicForms.registerForm({
      formId: "payment-form",
      title: "Payment Approval Form",
      fields: [
        { fieldId: "amount", label: "Amount", type: "number", required: true, validation: { min: 1 } },
        { fieldId: "invoice", label: "Invoice", type: "attachment", required: true, validation: { requiredDocumentType: "invoice" } },
      ],
    });

    const template = platform.workflowMarketplace.installTemplate("finance-workflows", "finance-approval");
    const invalid = platform.dynamicForms.validateSubmission("payment-form", { amount: 0 });
    const valid = platform.dynamicForms.validateSubmission("payment-form", { amount: 100, invoice: "invoice.pdf" });

    expect(template.name).toBe("Finance Approval Workflow");
    expect(invalid.valid).toBe(false);
    expect(valid.valid).toBe(true);
  });

  it("generates workflow JSON, rules, and documentation from AI prompt", () => {
    const platform = new EnterprisePlatform();
    const draft = platform.workflowAssistant.draftFromPrompt(
      "Create a payment approval workflow for grants above $50,000 requiring Finance Director and Country Director approval.",
    );
    const simulation = platform.workflowSimulation.simulate(draft.definition);
    const docs = platform.workflowDocumentation.generate(draft.definition);

    expect(draft.definition.approvalRoutes?.map((route) => route.approverRole)).toEqual(expect.arrayContaining(["Finance Director", "Country Director"]));
    expect(draft.automationRules[0]).toMatchObject({ action: { type: "start_workflow" } });
    expect(simulation.valid).toBe(true);
    expect(docs.bpmnText).toContain("Approval Gate");
    expect(docs.supportedExports).toEqual(["pdf", "docx", "pptx"]);
  });

  it("creates cross-module automation configuration without code changes", () => {
    const platform = new EnterprisePlatform();
    const plan = platform.crossModuleAutomation.createPlan({
      planId: "grant-approved-automation",
      name: "Grant Approved Automation",
      triggerModule: "projects",
      targetModules: ["finance", "procurement", "meal"],
    });

    expect(plan.workflowDefinition.nodes.map((node) => node.action)).toEqual(expect.arrayContaining([
      "createBudget",
      "createProcurementPlan",
      "updateDashboard",
      "generateAISummary",
    ]));
    expect(plan.automationRules[0]).toMatchObject({ action: { type: "start_workflow", workflowId: "grant-approved-automation" } });
    expect(plan.notifications[0].recipientRole).toBe("Finance Director");
  });
});
