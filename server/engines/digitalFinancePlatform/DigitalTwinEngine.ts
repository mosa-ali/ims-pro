import { DigitalFinanceScope, DigitalTwinState } from "./DigitalFinanceTypes";
import { KnowledgeGraphEngine } from "./KnowledgeGraphEngine";

export class DigitalTwinEngine {
  constructor(private readonly knowledgeGraphEngine: KnowledgeGraphEngine = new KnowledgeGraphEngine()) {}

  buildTwin(scope: DigitalFinanceScope, asOfDate = "2026-07-02"): DigitalTwinState {
    this.knowledgeGraphEngine.buildEnterpriseGraph(scope);

    return {
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId ?? null,
      asOfDate,
      cashBalance: 1250000,
      restrictedCash: 420000,
      budgetAvailable: 310000,
      grantUtilizationPercent: 82,
      committedSpend: 185000,
      pipelineSpend: 275000,
      assetValue: 685000,
      riskScore: 44,
      kpis: {
        cashCoverageDays: 42,
        budgetBurnRatePercent: 71,
        supplierRiskScore: 28,
        auditReadinessScore: 86,
      },
    };
  }

  refreshTwin(current: DigitalTwinState, changes: Partial<DigitalTwinState>): DigitalTwinState {
    return {
      ...current,
      ...changes,
      kpis: {
        ...current.kpis,
        ...(changes.kpis ?? {}),
      },
    };
  }

  compareTwins(baseline: DigitalTwinState, current: DigitalTwinState): Record<string, number> {
    return {
      cashBalance: current.cashBalance - baseline.cashBalance,
      restrictedCash: current.restrictedCash - baseline.restrictedCash,
      budgetAvailable: current.budgetAvailable - baseline.budgetAvailable,
      grantUtilizationPercent: current.grantUtilizationPercent - baseline.grantUtilizationPercent,
      committedSpend: current.committedSpend - baseline.committedSpend,
      pipelineSpend: current.pipelineSpend - baseline.pipelineSpend,
      assetValue: current.assetValue - baseline.assetValue,
      riskScore: current.riskScore - baseline.riskScore,
    };
  }
}
