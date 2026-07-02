import {
  EnterpriseModule,
  EnterpriseModuleAdapter,
  EnterprisePlatformCapability,
  EnterprisePlatformRegistrySummary,
  EnterprisePlatformServiceCandidate,
  EnterpriseScope,
} from "./EnterprisePlatformTypes";

export class EnterprisePlatformRegistry {
  private readonly candidates = new Map<string, EnterprisePlatformServiceCandidate>();
  private readonly adapters = new Map<EnterpriseModule, EnterpriseModuleAdapter>();

  registerCandidate(candidate: EnterprisePlatformServiceCandidate): EnterprisePlatformServiceCandidate {
    this.candidates.set(candidate.capability, candidate);
    return candidate;
  }

  registerAdapter(adapter: EnterpriseModuleAdapter): EnterpriseModuleAdapter {
    this.adapters.set(adapter.module, adapter);
    return adapter;
  }

  listCandidates(): EnterprisePlatformServiceCandidate[] {
    return [...this.candidates.values()];
  }

  getAdapter(module: EnterpriseModule): EnterpriseModuleAdapter | undefined {
    return this.adapters.get(module);
  }

  buildSummary(): EnterprisePlatformRegistrySummary {
    const adapters = [...this.adapters.values()];
    return {
      capabilities: [...this.candidates.values()].map((candidate) => candidate.capability),
      modules: adapters.map((adapter) => adapter.module),
      candidates: this.listCandidates(),
      adapters: adapters.map((adapter) => ({
        adapterId: adapter.adapterId,
        module: adapter.module,
        capabilities: adapter.supportedCapabilities,
      })),
    };
  }
}

export class StandardEnterpriseModuleAdapter implements EnterpriseModuleAdapter {
  constructor(
    readonly module: EnterpriseModule,
    readonly supportedCapabilities: EnterprisePlatformCapability[],
    readonly adapterId = `${module}-platform-adapter`,
  ) {}

  buildContext(scope: EnterpriseScope): Record<string, unknown> {
    return {
      module: this.module,
      adapterId: this.adapterId,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId ?? null,
      userId: scope.userId,
      userRole: scope.userRole,
      locale: scope.locale ?? "en",
      capabilities: this.supportedCapabilities,
    };
  }
}

export function createDefaultEnterprisePlatformRegistry(): EnterprisePlatformRegistry {
  const registry = new EnterprisePlatformRegistry();
  defaultCandidates.forEach((candidate) => registry.registerCandidate(candidate));
  defaultAdapters.forEach((adapter) => registry.registerAdapter(adapter));
  return registry;
}

export const defaultCandidates: EnterprisePlatformServiceCandidate[] = [
  {
    capability: "event",
    name: "Enterprise Event Platform",
    sourcePaths: ["server/engines/enterpriseEvent", "server/services/finance/FinanceEventBus.ts"],
    sharedByModules: ["finance", "hr", "procurement", "logistics", "projects", "meal", "compliance"],
    extractionStatus: "adapter_ready",
    recommendation: "Expose a shared event envelope, replay, DLQ, retry, and diagnostics API.",
  },
  {
    capability: "workflow_saga",
    name: "Enterprise Workflow/Saga Platform",
    sourcePaths: ["server/engines/WorkflowEngine.ts", "server/engines/logistics/P2PWorkflowOrchestrator.ts", "server/engines/complianceGovernance/WorkflowEngine.ts"],
    sharedByModules: ["finance", "procurement", "hr", "logistics", "compliance"],
    extractionStatus: "extracted",
    recommendation: "Use WorkflowSagaOrchestrator with JSON workflow definitions and parallel step execution.",
  },
  {
    capability: "reporting_export",
    name: "Enterprise Reporting & Export Platform",
    sourcePaths: ["server/engines/sharedExcelExport", "server/sharedExcelExport", "server/reporting/exportEngine.ts"],
    sharedByModules: ["finance", "hr", "procurement", "logistics", "projects", "meal", "compliance"],
    extractionStatus: "adapter_ready",
    recommendation: "Provide one export orchestrator for Excel, PDF, Word, PowerPoint, scheduling, delivery, and audit history.",
  },
  {
    capability: "notification",
    name: "Enterprise Notification Platform",
    sourcePaths: ["server/notifications", "server/services/notifications", "server/services/microsoft/emailNotificationService.ts"],
    sharedByModules: ["finance", "hr", "procurement", "logistics", "projects", "meal", "compliance"],
    extractionStatus: "candidate",
    recommendation: "Normalize Email, Teams, Slack, WhatsApp, SMS, and mobile push channels behind one dispatcher.",
  },
  {
    capability: "rules",
    name: "Enterprise Rules Platform",
    sourcePaths: ["server/engines/enterprisePerformanceMgt/UnifiedRulesCore.ts", "server/engines/budgetIntelligence/BudgetRulesEngine.ts", "server/engines/gLedger/FinancialRulesEngine.ts"],
    sharedByModules: ["finance", "procurement", "hr", "logistics", "meal", "compliance"],
    extractionStatus: "adapter_ready",
    recommendation: "Promote UnifiedRulesCore into a shared domain-rule execution service.",
  },
  {
    capability: "ai",
    name: "Enterprise AI Platform",
    sourcePaths: ["server/engines/enterpriseAiPlatform"],
    sharedByModules: ["finance", "hr", "procurement", "projects", "meal", "compliance"],
    extractionStatus: "consolidated",
    recommendation: "Use AI gateway, registries, memory, tools, governance, audit, and provider adapters for all domain AI.",
  },
  {
    capability: "analytics",
    name: "Enterprise Analytics Platform",
    sourcePaths: ["server/analytics", "server/engines/financialIntelligenceAi", "server/engines/logistics/ProcurementAnalyticsEngine.ts"],
    sharedByModules: ["finance", "hr", "procurement", "logistics", "projects", "meal", "compliance"],
    extractionStatus: "candidate",
    recommendation: "Standardize KPI, dashboard, forecasting, and executive analytics contracts.",
  },
  {
    capability: "knowledge_graph",
    name: "Enterprise Knowledge Graph Platform",
    sourcePaths: ["server/engines/digitalFinancePlatform/KnowledgeGraphEngine.ts", "server/engines/logistics/ProcurementKnowledgeGraphEngine.ts"],
    sharedByModules: ["finance", "procurement", "logistics", "projects", "meal", "compliance"],
    extractionStatus: "extracted",
    recommendation: "Provide cross-module graph nodes, relationships, traversal, lineage, and AI evidence retrieval.",
  },
];

export const defaultAdapters: EnterpriseModuleAdapter[] = [
  new StandardEnterpriseModuleAdapter("finance", ["event", "workflow_saga", "reporting_export", "notification", "rules", "ai", "analytics", "knowledge_graph"]),
  new StandardEnterpriseModuleAdapter("hr", ["event", "workflow_saga", "reporting_export", "notification", "rules", "ai", "analytics"]),
  new StandardEnterpriseModuleAdapter("procurement", ["event", "workflow_saga", "reporting_export", "notification", "rules", "ai", "analytics", "knowledge_graph"]),
  new StandardEnterpriseModuleAdapter("logistics", ["event", "workflow_saga", "reporting_export", "notification", "rules", "analytics", "knowledge_graph"]),
  new StandardEnterpriseModuleAdapter("projects", ["event", "reporting_export", "notification", "ai", "analytics", "knowledge_graph"]),
  new StandardEnterpriseModuleAdapter("meal", ["event", "reporting_export", "notification", "rules", "ai", "analytics", "knowledge_graph"]),
  new StandardEnterpriseModuleAdapter("compliance", ["event", "workflow_saga", "reporting_export", "notification", "rules", "ai", "analytics", "knowledge_graph"]),
];
