import {
  ApprovalRouteResult,
  EnterpriseScope,
  SagaDefinition,
  WorkflowDesignerDefinition,
  WorkflowTemplate,
  WorkflowVersionRecord,
} from "./EnterprisePlatformTypes";
import { WorkflowSagaOrchestrator } from "./WorkflowSagaOrchestrator";

export class WorkflowDefinitionRegistry {
  private readonly versions = new Map<string, WorkflowVersionRecord[]>();
  private readonly templates = new Map<string, WorkflowTemplate>();

  constructor(private readonly orchestrator: WorkflowSagaOrchestrator) {}

  publishFromJSON(input: {
    definition: WorkflowDesignerDefinition;
    createdByRole: string;
    changeReason: string;
  }): WorkflowVersionRecord {
    const definition = this.orchestrator.loadFromJSON(input.definition);
    definition.status = "published";
    definition.approvalRoutes = input.definition.approvalRoutes ?? [];
    definition.notifications = input.definition.notifications ?? [];

    const record: WorkflowVersionRecord = {
      workflowId: definition.workflowId,
      version: definition.version,
      status: "published",
      definition,
      createdAt: new Date().toISOString(),
      createdByRole: input.createdByRole,
      changeReason: input.changeReason,
    };

    const records = this.versions.get(definition.workflowId) ?? [];
    records.filter((existing) => existing.status === "published").forEach((existing) => {
      existing.status = "deprecated";
      existing.definition.status = "deprecated";
    });
    this.versions.set(definition.workflowId, [...records, record]);
    return record;
  }

  registerTemplate(template: WorkflowTemplate): WorkflowTemplate {
    this.templates.set(template.templateId, template);
    return template;
  }

  instantiateTemplate(input: {
    templateId: string;
    workflowId: string;
    version: string;
    name?: string;
  }): WorkflowDesignerDefinition {
    const template = this.templates.get(input.templateId);
    if (!template) throw new Error(`Workflow template ${input.templateId} is not registered.`);
    return {
      ...template.definition,
      workflowId: input.workflowId,
      version: input.version,
      name: input.name ?? template.name,
    };
  }

  getPublished(workflowId: string): SagaDefinition | undefined {
    return this.versions.get(workflowId)?.find((record) => record.status === "published")?.definition;
  }

  listVersions(workflowId: string): WorkflowVersionRecord[] {
    return this.versions.get(workflowId) ?? [];
  }

  listTemplates(): WorkflowTemplate[] {
    return [...this.templates.values()];
  }

  resolveApprovalRoutes(workflowId: string, scope: EnterpriseScope, facts: Record<string, unknown>): ApprovalRouteResult[] {
    const definition = this.getPublished(workflowId);
    if (!definition) return [];

    return (definition.approvalRoutes ?? []).map((route) => {
      const required = route.condition ? this.matchesCondition(route.condition, facts) : true;
      return {
        routeId: route.routeId,
        approverRole: required ? route.approverRole : route.escalationRole ?? route.approverRole,
        required,
        reason: required
          ? `${route.strategy} approval required for ${scope.organizationId}.`
          : `${route.strategy} approval not required by current facts.`,
      };
    });
  }

  private matchesCondition(condition: NonNullable<SagaDefinition["approvalRoutes"]>[number]["condition"], facts: Record<string, unknown>): boolean {
    if (!condition) return true;
    const actual = this.resolvePath(facts, condition.field);
    switch (condition.operator) {
      case "equals": return actual === condition.value;
      case "not_equals": return actual !== condition.value;
      case "greater_than": return Number(actual) > Number(condition.value);
      case "less_than": return Number(actual) < Number(condition.value);
      case "exists": return actual !== undefined && actual !== null;
      default: return false;
    }
  }

  private resolvePath(source: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((current, part) => {
      if (current && typeof current === "object" && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, source);
  }
}
