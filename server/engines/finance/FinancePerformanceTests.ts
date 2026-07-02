import { describe, expect, it } from "vitest";
import { GovernanceEngine } from "../complianceGovernance";
import { AutonomousFinanceEngine } from "../digitalFinancePlatform";
import { createDefaultEnterpriseAIPlatform } from "../enterpriseAiPlatform";
import { P2PPipelineEngine, ProcurementAnalyticsEngine, SupplierPerformanceEngine } from "../logistics";

function expectWithinBudget(label: string, elapsedMs: number, budgetMs: number): void {
  expect(elapsedMs, `${label} exceeded ${budgetMs}ms`).toBeLessThanOrEqual(budgetMs);
}

describe("Phase 14 Finance Performance Tests", () => {
  it("runs digital finance scenario portfolios within the enterprise readiness budget", () => {
    const engine = new AutonomousFinanceEngine();
    const startedAt = Date.now();

    const runs = Array.from({ length: 25 }, (_, index) => engine.run({
      organizationId: 1,
      operatingUnitId: index % 2 === 0 ? 10 : 20,
      userId: 7,
      userRole: "Finance Director",
    }));

    const elapsedMs = Date.now() - startedAt;

    expect(runs).toHaveLength(25);
    expect(runs.every((run) => run.simulations.length >= 3)).toBe(true);
    expect(runs.every((run) => run.actions.length > 0)).toBe(true);
    expectWithinBudget("digital finance scenario portfolio", elapsedMs, 1000);
  });

  it("runs P2P analytics and supplier scorecards within the enterprise readiness budget", async () => {
    const pipeline = new P2PPipelineEngine();
    const analytics = new ProcurementAnalyticsEngine(undefined, pipeline);
    const suppliers = new SupplierPerformanceEngine();
    const startedAt = Date.now();

    const dashboard = await analytics.buildDashboard(1, 10, "2026-Q3");
    const lifecycle = await pipeline.getLifecycleView(1001, 1, 10);
    const ranking = await suppliers.rankSuppliers(1, 10);
    const elapsedMs = Date.now() - startedAt;

    expect(dashboard.stageDistribution).toHaveLength(13);
    expect(lifecycle.stageOrder).toContain("Asset");
    expect(ranking[0].score).toBeGreaterThanOrEqual(ranking[1].score);
    expectWithinBudget("P2P analytics and supplier scorecards", elapsedMs, 1000);
  });

  it("routes AI and governance reviews without slow synchronous drift", () => {
    const aiPlatform = createDefaultEnterpriseAIPlatform();
    const governance = new GovernanceEngine();
    const startedAt = Date.now();

    const aiResponse = aiPlatform.execute({
      requestId: "phase14-ai-performance",
      agentId: "agent-executive",
      task: "Prepare enterprise readiness summary",
      context: { cashCoverageDays: 42, riskScore: 44 },
      scope: {
        organizationId: 1,
        operatingUnitId: 10,
        userId: 7,
        userRole: "Executive Director",
      },
    });
    const governanceResult = governance.reviewTransaction({
      organizationId: 1,
      operatingUnitId: 10,
      userId: 7,
      userRole: "Compliance Officer",
    }, {
      id: "phase14-payment-1",
      entityType: "payment",
      amount: 2500,
      currency: "USD",
      description: "Performance review payment",
      requestedByUserId: 1,
      preparedByUserId: 2,
      reviewedByUserId: 3,
      approvedByUserId: 4,
      paidByUserId: 5,
      donorId: "donor-eu",
      transactionDate: "2026-07-02",
      documents: ["invoice", "approval"],
      metadata: { organizationId: 1, operatingUnitId: 10 },
    });
    const elapsedMs = Date.now() - startedAt;

    expect(aiResponse.status).toBe("completed");
    expect(governanceResult.assessment.evidenceRefs?.length).toBeGreaterThan(0);
    expectWithinBudget("AI and governance readiness route", elapsedMs, 1000);
  });
});
