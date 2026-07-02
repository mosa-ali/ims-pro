import { describe, expect, it } from "vitest";
import { P2PPipelineEngine } from "./P2PPipelineEngine";
import { ProcurementAnalyticsEngine } from "./ProcurementAnalyticsEngine";
import { SupplierPerformanceEngine } from "./SupplierPerformanceEngine";

describe("Phase 10 Procure-to-Pay Modernization", () => {
  it("supports the full enterprise P2P lifecycle", async () => {
    const engine = new P2PPipelineEngine();
    const lifecycle = await engine.getLifecycleView(1001, 1, 10);

    expect(lifecycle.stageOrder).toEqual([
      "PR",
      "RFQ",
      "Evaluation",
      "Contract",
      "PO",
      "Shipment",
      "GRN",
      "Inspection",
      "Invoice",
      "Payment",
      "Journal",
      "Grant",
      "Asset",
    ]);
    expect(lifecycle.transaction.currentStage).toBe("Invoice");
    expect(lifecycle.sla.length).toBeGreaterThan(0);
    expect(lifecycle.aiRecommendations.length).toBeGreaterThan(0);
  });

  it("tracks cycle time, bottlenecks, SLA, and risk", async () => {
    const engine = new P2PPipelineEngine();
    const metrics = await engine.getPipelineMetrics(1, 10, "2026-Q3");
    const bottlenecks = await engine.identifyBottlenecks(1, 10);

    expect(metrics.totalTransactions).toBe(3);
    expect(metrics.averageCycleTime).toBeGreaterThan(0);
    expect(metrics.byStage.some((stage) => stage.slaBreaches > 0)).toBe(true);
    expect(metrics.riskSummary.medium + metrics.riskSummary.high).toBeGreaterThan(0);
    expect(bottlenecks.length).toBeGreaterThan(0);
  });

  it("builds procurement analytics dashboard and spend analysis", async () => {
    const analytics = new ProcurementAnalyticsEngine();
    const dashboard = await analytics.buildDashboard(1, 10, "2026-Q3");
    const spend = await analytics.analyzeSpend(1, 10, "2026-Q3");

    expect(dashboard.stageDistribution.map((stage) => stage.stage)).toContain("Inspection");
    expect(dashboard.aiRecommendations.length).toBeGreaterThan(0);
    expect(spend.totalSpend).toBe(450000);
    expect(spend.byGrant.map((grant) => grant.grantId)).toContain(7001);
  });

  it("scores supplier performance and ranks suppliers", async () => {
    const supplierEngine = new SupplierPerformanceEngine();
    const scorecard = await supplierEngine.buildSupplierScorecard(502, 1, 10);
    const ranking = await supplierEngine.rankSuppliers(1, 10);

    expect(scorecard.riskLevel).toBe("medium");
    expect(scorecard.aiRecommendations.length).toBeGreaterThan(0);
    expect(ranking[0].score).toBeGreaterThanOrEqual(ranking[1].score);
  });

  it("checks P2P compliance across downstream stages", async () => {
    const engine = new P2PPipelineEngine();
    const compliance = await engine.checkCompliance(1001, 1, 10);

    expect(compliance.complianceChecks.map((check) => check.check)).toContain("Grant Charged");
    expect(compliance.complianceChecks.map((check) => check.check)).toContain("Asset Registered");
    expect(compliance.overallStatus).toMatch(/compliant|at-risk|non-compliant/);
  });
});
