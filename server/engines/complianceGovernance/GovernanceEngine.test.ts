import { describe, expect, it } from "vitest";
import { GovernanceEngine } from "./GovernanceEngine";
import { DonorRule, GovernanceScope, GovernanceTransaction } from "./GovernanceTypes";

const scope: GovernanceScope = {
  organizationId: 1,
  operatingUnitId: 10,
  userId: 77,
  userRole: "Compliance Officer",
  locale: "en",
};

const donorRules: DonorRule[] = [
  {
    id: "donor-rule-eu-1",
    donorId: "donor-eu",
    name: "EU Grant Eligible Spending",
    active: true,
    allowedCostCategories: ["training", "supplies"],
    restrictedBudgetLineIds: ["restricted-line"],
    allowedCountryCodes: ["YE", "JO"],
    maxTransactionAmount: 5000,
    requiresSupportingDocuments: ["invoice", "approval", "delivery_note"],
    spendingEndDate: "2026-12-31",
    severity: "high",
  },
];

function transaction(overrides: Partial<GovernanceTransaction> = {}): GovernanceTransaction {
  return {
    id: "payment-1",
    entityType: "payment",
    amount: 2500,
    currency: "USD",
    description: "Training vendor payment",
    requestedByUserId: 1,
    preparedByUserId: 2,
    reviewedByUserId: 3,
    approvedByUserId: 4,
    paidByUserId: 5,
    donorId: "donor-eu",
    grantId: "grant-1",
    projectId: "project-1",
    budgetLineId: "training-line",
    costCategory: "training",
    countryCode: "YE",
    vendorId: "vendor-1",
    transactionDate: "2026-07-02",
    documents: ["invoice", "approval", "delivery_note"],
    metadata: {
      organizationId: 1,
      operatingUnitId: 10,
    },
    ...overrides,
  };
}

describe("Compliance Governance Phase 9", () => {
  it("approves compliant transactions through governance review", () => {
    const engine = new GovernanceEngine();
    const result = engine.reviewTransaction(scope, transaction(), donorRules);

    expect(result.assessment.status).toBe("compliant");
    expect(result.assessment.score).toBe(100);
    expect(result.audit.status).toBe("compliant");
    expect(result.workflow.status).toBe("approved");
    expect(result.exceptions).toHaveLength(0);
    expect(result.assessment.controlEvaluations?.map((control) => control.type)).toEqual(
      expect.arrayContaining(["preventive", "detective", "corrective"]),
    );
    expect(result.aiAdvice?.summary).toContain("is compliant");
    expect(result.aiAdvice?.evidenceRefs).toContain("Finance Manual 4.2");
  });

  it("detects donor rule violations and routes exceptions into workflow", () => {
    const engine = new GovernanceEngine();
    const result = engine.reviewTransaction(
      scope,
      transaction({
        amount: 7500,
        costCategory: "vehicle",
        documents: ["invoice"],
      }),
      donorRules,
    );

    expect(result.assessment.status).toBe("non_compliant");
    expect(result.assessment.donorRuleEvaluation.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "donor-rule-eu-1" }),
      ]),
    );
    expect(result.audit.findings.length).toBeGreaterThan(0);
    expect(result.workflow.status).toBe("exception");
    expect(result.workflow.steps.map((step) => step.name)).toContain("Exception Resolution");
    expect(result.aiAdvice?.summary).toContain("violates");
  });

  it("blocks segregation-of-duties violations", () => {
    const engine = new GovernanceEngine();
    const result = engine.reviewTransaction(
      scope,
      transaction({
        preparedByUserId: 1,
        approvedByUserId: 1,
      }),
      donorRules,
    );

    expect(result.assessment.status).toBe("blocked");
    expect(result.exceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "critical", ownerRole: "Internal Auditor" }),
      ]),
    );
    expect(result.workflow.steps.map((step) => step.name)).toContain("Internal Audit Review");
  });

  it("summarizes enterprise governance dashboard metrics", () => {
    const engine = new GovernanceEngine();
    const compliant = engine.reviewTransaction(scope, transaction({ id: "payment-ok" }), donorRules);
    const blocked = engine.reviewTransaction(
      scope,
      transaction({
        id: "payment-blocked",
        preparedByUserId: 1,
        approvedByUserId: 1,
      }),
      donorRules,
    );

    const dashboard = engine.buildGovernanceDashboard([compliant, blocked]);

    expect(dashboard.totalReviewed).toBe(2);
    expect(dashboard.overallStatus).toBe("blocked");
    expect(dashboard.criticalExceptions).toBeGreaterThan(0);
    expect(dashboard.workflowsByStatus.exception).toBe(1);
    expect(dashboard.exceptionAging.current + dashboard.exceptionAging.due_soon + dashboard.exceptionAging.overdue).toBeGreaterThan(0);
    expect(dashboard.policyViolationsByType["Segregation of duties violation"]).toBeGreaterThan(0);
  });

  it("protects organization and operating-unit scope", () => {
    const engine = new GovernanceEngine();

    expect(() =>
      engine.reviewTransaction(
        scope,
        transaction({
          metadata: {
            organizationId: 2,
            operatingUnitId: 10,
          },
        }),
        donorRules,
      ),
    ).toThrow("Transaction organization does not match governance scope.");
  });

  it("tracks policy versions and donor policy packs", () => {
    const engine = new GovernanceEngine();

    expect(engine.policyEngine.listPolicyVersions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          policyId: "policy-segregation-of-duties",
          version: "1.0.0",
          approvedByRole: "Internal Auditor",
        }),
      ]),
    );
    expect(engine.donorPolicyPackEngine.getRulesForDonor("donor-eu")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          policyPackId: "donor-pack-eu-v1",
          id: "eu-eligible-costs-v1",
        }),
      ]),
    );
  });

  it("simulates governance impact before approval", () => {
    const engine = new GovernanceEngine();
    const simulation = engine.simulateBeforeApproval({
      scope,
      transaction: transaction(),
      changes: {
        amount: 75000,
        costCategory: "vehicle",
      },
      donorRules,
    });

    expect(simulation.baselineStatus).toBe("compliant");
    expect(simulation.simulatedStatus).toBe("non_compliant");
    expect(simulation.donorImpact.length).toBeGreaterThan(0);
    expect(simulation.complianceRisk.priority).toMatch(/medium|high|urgent/);
  });

  it("runs continuous compliance monitoring", () => {
    const engine = new GovernanceEngine();
    const blocked = engine.reviewTransaction(
      scope,
      transaction({
        id: "payment-monitor",
        documents: [],
        metadata: {
          organizationId: 1,
          operatingUnitId: 10,
          grantEndDate: "2026-01-01",
        },
      }),
      donorRules,
    );

    const items = engine.runContinuousMonitoring({
      transactions: [transaction({ id: "payment-monitor", documents: [], metadata: { organizationId: 1, operatingUnitId: 10, grantEndDate: "2026-01-01" } })],
      results: [blocked],
      now: "2026-07-02T00:00:00.000Z",
    });

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "missing_document" }),
        expect.objectContaining({ type: "expired_grant" }),
      ]),
    );
  });
});
