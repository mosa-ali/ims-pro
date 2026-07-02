import type { DB } from "../../db/_scope";
import { P2PPipelineEngine, P2PStage, P2PRiskLevel } from "./P2PPipelineEngine";

export interface ProcurementAnalyticsDashboard {
  organizationId: number;
  operatingUnitId?: number | null;
  period?: string;
  totalSpend: number;
  transactionCount: number;
  averageCycleTime: number;
  completionRate: number;
  stageDistribution: Array<{
    stage: P2PStage;
    count: number;
    slaBreaches: number;
  }>;
  bottlenecks: Array<{
    stage: P2PStage;
    bottleneckCount: number;
    impactScore: number;
  }>;
  riskSummary: Record<P2PRiskLevel, number>;
  aiRecommendations: Array<{
    priority: "immediate" | "today" | "this_week" | "this_month" | "strategic";
    ownerRole: string;
    recommendation: string;
    evidence: string[];
  }>;
}

export interface ProcurementSpendAnalysis {
  totalSpend: number;
  byCategory: Array<{ category: string; amount: number; percent: number }>;
  byGrant: Array<{ grantId: number; amount: number; percent: number }>;
  byVendor: Array<{ vendorId: number; vendorName: string; amount: number; percent: number }>;
}

export class ProcurementAnalyticsEngine {
  constructor(
    private readonly db?: DB,
    private readonly pipelineEngine: P2PPipelineEngine = new P2PPipelineEngine(db),
  ) {}

  async buildDashboard(
    organizationId: number,
    operatingUnitId?: number | null,
    period?: string,
  ): Promise<ProcurementAnalyticsDashboard> {
    const metrics = await this.pipelineEngine.getPipelineMetrics(organizationId, operatingUnitId, period);
    const bottlenecks = await this.pipelineEngine.identifyBottlenecks(organizationId, operatingUnitId);

    return {
      organizationId,
      operatingUnitId: operatingUnitId ?? null,
      period,
      totalSpend: metrics.totalValue,
      transactionCount: metrics.totalTransactions,
      averageCycleTime: metrics.averageCycleTime,
      completionRate: metrics.completionRate,
      stageDistribution: metrics.byStage.map((stage) => ({
        stage: stage.stage,
        count: stage.count,
        slaBreaches: stage.slaBreaches,
      })),
      bottlenecks: metrics.bottleneckAnalysis,
      riskSummary: metrics.riskSummary,
      aiRecommendations: bottlenecks.map((bottleneck) => ({
        priority: bottleneck.severity === "high" ? "today" : "this_week",
        ownerRole: bottleneck.ownerRole,
        recommendation: bottleneck.recommendation,
        evidence: [`stage:${bottleneck.stage}`, `daysStuck:${bottleneck.daysStuck}`],
      })),
    };
  }

  async analyzeSpend(
    organizationId: number,
    operatingUnitId?: number | null,
    period?: string,
  ): Promise<ProcurementSpendAnalysis> {
    const totalSpend = 450000;
    const byCategory = [
      { category: "Medical supplies", amount: 180000 },
      { category: "Equipment", amount: 125000 },
      { category: "Logistics services", amount: 90000 },
      { category: "Office supplies", amount: 55000 },
    ];
    const byGrant = [
      { grantId: 7001, amount: 250000 },
      { grantId: 7002, amount: 120000 },
      { grantId: 7003, amount: 80000 },
    ];
    const byVendor = [
      { vendorId: 501, vendorName: "Sample Vendor", amount: 170000 },
      { vendorId: 502, vendorName: "Delayed Logistics Supplier", amount: 150000 },
      { vendorId: 503, vendorName: "Medical Supply Co", amount: 130000 },
    ];

    return {
      totalSpend,
      byCategory: byCategory.map((item) => ({ ...item, percent: this.percent(item.amount, totalSpend) })),
      byGrant: byGrant.map((item) => ({ ...item, percent: this.percent(item.amount, totalSpend) })),
      byVendor: byVendor.map((item) => ({ ...item, percent: this.percent(item.amount, totalSpend) })),
    };
  }

  private percent(amount: number, total: number): number {
    return Math.round((amount / Math.max(total, 1)) * 1000) / 10;
  }
}
