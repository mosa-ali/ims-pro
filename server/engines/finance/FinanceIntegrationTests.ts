import { describe, expect, it } from "vitest";
import { GovernanceEngine } from "../complianceGovernance";
import { AutonomousFinanceEngine } from "../digitalFinancePlatform";
import { createDefaultEnterpriseAIPlatform } from "../enterpriseAiPlatform";
import { P2PPipelineEngine, ProcurementAnalyticsEngine, SupplierPerformanceEngine } from "../logistics";

describe("Phase 14 Finance Integration Tests", () => {
  it("integrates AI event optimization with finance action refreshes", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const actions = platform.eventIntegration.handleEvent({
      eventId: "phase14-payment-approved",
      eventType: "payment_approved",
      organizationId: 1,
      operatingUnitId: 10,
      occurredAt: "2026-07-02T00:00:00.000Z",
      payload: { paymentId: 1001, amount: 2500 },
    });

    expect(actions).toEqual([
      expect.objectContaining({ action: "refresh_memory", organizationId: 1, operatingUnitId: 10 }),
      expect.objectContaining({ action: "trigger_financial_analysis", organizationId: 1, operatingUnitId: 10 }),
    ]);
  });

  it("integrates P2P, supplier performance, governance, AI, and digital finance outputs", async () => {
    const p2p = new P2PPipelineEngine();
    const analytics = new ProcurementAnalyticsEngine(undefined, p2p);
    const supplier = new SupplierPerformanceEngine();
    const governance = new GovernanceEngine();
    const aiPlatform = createDefaultEnterpriseAIPlatform();
    const autonomousFinance = new AutonomousFinanceEngine();

    const lifecycle = await p2p.getLifecycleView(1001, 1, 10);
    const dashboard = await analytics.buildDashboard(1, 10, "2026-Q3");
    const scorecard = await supplier.buildSupplierScorecard(502, 1, 10);
    const governanceReview = governance.reviewTransaction({
      organizationId: 1,
      operatingUnitId: 10,
      userId: 7,
      userRole: "Compliance Officer",
    }, {
      id: "phase14-p2p-payment",
      entityType: "payment",
      amount: lifecycle.transaction.totalAmount,
      currency: lifecycle.transaction.currency,
      description: lifecycle.transaction.vendorName,
      requestedByUserId: 1,
      preparedByUserId: 2,
      reviewedByUserId: 3,
      approvedByUserId: 4,
      paidByUserId: 5,
      donorId: "donor-eu",
      grantId: String(lifecycle.transaction.grantId),
      projectId: String(lifecycle.transaction.projectId),
      costCategory: "supplies",
      countryCode: "YE",
      transactionDate: "2026-07-02",
      documents: ["invoice", "approval"],
      metadata: { organizationId: 1, operatingUnitId: 10 },
    });
    const aiResponse = aiPlatform.execute({
      requestId: "phase14-integration-ai",
      agentId: "agent-financial",
      task: "Summarize integrated finance readiness",
      context: {
        p2pStage: lifecycle.transaction.currentStage,
        supplierRisk: scorecard.riskLevel,
        governanceStatus: governanceReview.assessment.status,
        averageCycleTime: dashboard.averageCycleTime,
      },
      scope: {
        organizationId: 1,
        operatingUnitId: 10,
        userId: 7,
        userRole: "Finance Director",
      },
    });
    const digitalRun = autonomousFinance.run({ organizationId: 1, operatingUnitId: 10, userRole: "Finance Director" });

    expect(lifecycle.stageOrder).toContain("Grant");
    expect(dashboard.riskSummary.medium + dashboard.riskSummary.high).toBeGreaterThan(0);
    expect(scorecard.metrics.length).toBeGreaterThan(0);
    expect(governanceReview.aiAdvice?.evidenceRefs.length).toBeGreaterThan(0);
    expect(aiResponse.status).toBe("completed");
    expect(digitalRun.decisions.length).toBeGreaterThan(0);
  });

  it("validates architecture exports for Phase 14 readiness", async () => {
    const p2p = new P2PPipelineEngine();
    const autonomousFinance = new AutonomousFinanceEngine();
    const p2pMetrics = await p2p.analyzePipeline(1, 10);
    const digitalRun = autonomousFinance.run({ organizationId: 1, operatingUnitId: 10 });

    expect(p2pMetrics.stageOrder).toHaveLength(13);
    expect(digitalRun.graphSummary).toContain("Retrieved");
    expect(digitalRun.simulations.length).toBeGreaterThanOrEqual(3);
  });
});
