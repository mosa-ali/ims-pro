import { createDefaultEnterpriseAIPlatform } from "../../engines/enterpriseAiPlatform";
import { KnowledgeGraphEngine } from "../../engines/digitalFinancePlatform";
import {
  EnterpriseModule,
  EnterprisePlatformCapability,
  EnterpriseScope,
} from "./EnterprisePlatformTypes";
import { createDefaultEnterprisePlatformRegistry, EnterprisePlatformRegistry } from "./EnterprisePlatformRegistry";
import { PlatformAutomationEngine } from "./WorkflowAutomationEngine";
import { WorkflowDefinitionRegistry } from "./WorkflowDefinitionRegistry";
import {
  AIWorkflowAssistantEngine,
  CrossModuleAutomationEngine,
  DynamicWorkflowFormEngine,
  WorkflowAnalyticsEngine,
  WorkflowDocumentationGenerator,
  WorkflowMarketplaceEngine,
} from "./WorkflowExperienceEngines";
import { WorkflowDesignerEngine } from "./WorkflowDesignerEngine";
import { WorkflowSagaOrchestrator } from "./WorkflowSagaOrchestrator";
import { WorkflowSimulationEngine } from "./WorkflowSimulationEngine";

export interface EnterpriseEventEnvelope {
  eventId: string;
  eventType: string;
  module: EnterpriseModule;
  scope: EnterpriseScope;
  payload: Record<string, unknown>;
  correlationId: string;
  publishedAt: string;
}

export class EnterpriseEventPlatform {
  private readonly events: EnterpriseEventEnvelope[] = [];

  publish(input: Omit<EnterpriseEventEnvelope, "eventId" | "publishedAt">): EnterpriseEventEnvelope {
    const envelope: EnterpriseEventEnvelope = {
      ...input,
      eventId: `enterprise-event-${this.events.length + 1}`,
      publishedAt: new Date().toISOString(),
    };
    this.events.push(envelope);
    return envelope;
  }

  replay(scope: EnterpriseScope, eventType?: string): EnterpriseEventEnvelope[] {
    return this.events.filter((event) =>
      event.scope.organizationId === scope.organizationId &&
      (scope.operatingUnitId === undefined || event.scope.operatingUnitId === scope.operatingUnitId) &&
      (!eventType || event.eventType === eventType),
    );
  }
}

export class EnterpriseReportingExportPlatform {
  listFormats(): string[] {
    return ["xlsx", "pdf", "docx", "pptx"];
  }

  createExportPlan(module: EnterpriseModule, reportId: string, scope: EnterpriseScope): Record<string, unknown> {
    return {
      module,
      reportId,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId ?? null,
      supportedFormats: this.listFormats(),
      supportsScheduledDelivery: true,
      supportsEmailDistribution: true,
      auditHistoryRequired: true,
    };
  }
}

export class EnterpriseNotificationPlatform {
  channels(): string[] {
    return ["email", "teams", "slack", "whatsapp", "sms", "mobile_push"];
  }

  routeNotification(module: EnterpriseModule, message: string, scope: EnterpriseScope): Record<string, unknown> {
    return {
      module,
      message,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId ?? null,
      channels: this.channels(),
      auditRequired: true,
    };
  }
}

export class EnterpriseRulesPlatform {
  evaluate(input: {
    module: EnterpriseModule;
    trigger: string;
    facts: Record<string, unknown>;
    scope: EnterpriseScope;
  }): { blocked: boolean; warnings: string[]; requiresApproval: boolean } {
    const amount = Number(input.facts.amount ?? 0);
    return {
      blocked: amount < 0,
      warnings: amount > 50000 ? [`${input.module}:${input.trigger} exceeds high-value threshold.`] : [],
      requiresApproval: amount > 50000,
    };
  }
}

export class EnterpriseAnalyticsPlatform {
  summarize(input: {
    module: EnterpriseModule;
    metrics: Record<string, number>;
    scope: EnterpriseScope;
  }): Record<string, unknown> {
    const values = Object.values(input.metrics);
    return {
      module: input.module,
      organizationId: input.scope.organizationId,
      operatingUnitId: input.scope.operatingUnitId ?? null,
      metricCount: values.length,
      average: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
    };
  }
}

export class EnterpriseKnowledgeGraphPlatform {
  readonly graph = new KnowledgeGraphEngine();

  buildFinanceGraph(scope: EnterpriseScope): ReturnType<KnowledgeGraphEngine["buildEnterpriseGraph"]> {
    return this.graph.buildEnterpriseGraph(scope);
  }
}

export class EnterpriseAIPlatformFacade {
  readonly platform = createDefaultEnterpriseAIPlatform();

  executeExecutiveBrief(scope: EnterpriseScope, context: Record<string, unknown>) {
    return this.platform.execute({
      requestId: `enterprise-ai-${Date.now()}`,
      agentId: "agent-executive",
      task: "Prepare shared enterprise platform briefing",
      context,
      scope: {
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId: scope.userId ?? 0,
        userRole: scope.userRole ?? "Executive Director",
        locale: scope.locale,
      },
    });
  }
}

export class EnterprisePlatform {
  readonly registry: EnterprisePlatformRegistry;
  readonly events = new EnterpriseEventPlatform();
  readonly workflow = new WorkflowSagaOrchestrator();
  readonly workflowDefinitions = new WorkflowDefinitionRegistry(this.workflow);
  readonly automation = new PlatformAutomationEngine(this.workflow);
  readonly workflowDesigner = new WorkflowDesignerEngine();
  readonly workflowSimulation = new WorkflowSimulationEngine();
  readonly workflowAnalytics = new WorkflowAnalyticsEngine();
  readonly workflowMarketplace = new WorkflowMarketplaceEngine();
  readonly dynamicForms = new DynamicWorkflowFormEngine();
  readonly workflowAssistant = new AIWorkflowAssistantEngine();
  readonly workflowDocumentation = new WorkflowDocumentationGenerator();
  readonly crossModuleAutomation = new CrossModuleAutomationEngine();
  readonly reporting = new EnterpriseReportingExportPlatform();
  readonly notifications = new EnterpriseNotificationPlatform();
  readonly rules = new EnterpriseRulesPlatform();
  readonly ai = new EnterpriseAIPlatformFacade();
  readonly analytics = new EnterpriseAnalyticsPlatform();
  readonly knowledgeGraph = new EnterpriseKnowledgeGraphPlatform();

  constructor(registry: EnterprisePlatformRegistry = createDefaultEnterprisePlatformRegistry()) {
    this.registry = registry;
  }

  availableCapabilities(): EnterprisePlatformCapability[] {
    return this.registry.buildSummary().capabilities;
  }
}
