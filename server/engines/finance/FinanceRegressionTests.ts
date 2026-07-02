import { describe, expect, it } from "vitest";
import { GovernanceEngine } from "../complianceGovernance";
import { AutonomousFinanceEngine } from "../digitalFinancePlatform";
import { createDefaultEnterpriseAIPlatform } from "../enterpriseAiPlatform";
import { P2PPipelineEngine } from "../logistics";

describe("Phase 14 Finance Regression Tests", () => {
  it("preserves AI governance approval behavior for high-risk tools", () => {
    const platform = createDefaultEnterpriseAIPlatform();
    const response = platform.execute({
      requestId: "phase14-regression-ai-approval",
      agentId: "agent-financial",
      task: "Execute payment",
      requestedToolIds: ["tool-payment-execute"],
      context: { paymentId: 1 },
      scope: {
        organizationId: 1,
        operatingUnitId: 10,
        userId: 7,
        userRole: "Finance Director",
      },
    });

    expect(response.status).toBe("needs_human_approval");
    expect(response.governance.approvalRequirement).toBe("required");
  });

  it("preserves tenant isolation in governance review", () => {
    const governance = new GovernanceEngine();

    expect(() => governance.reviewTransaction({
      organizationId: 1,
      operatingUnitId: 10,
      userRole: "Compliance Officer",
    }, {
      id: "phase14-scope-regression",
      entityType: "payment",
      amount: 100,
      currency: "USD",
      description: "Scope test",
      requestedByUserId: 1,
      transactionDate: "2026-07-02",
      metadata: { organizationId: 2, operatingUnitId: 10 },
    })).toThrow("Transaction organization does not match governance scope.");
  });

  it("preserves complete P2P lifecycle order through Asset", () => {
    const p2p = new P2PPipelineEngine();
    const stages = p2p.getStageOrder();

    expect(stages[0]).toBe("PR");
    expect(stages[stages.length - 1]).toBe("Asset");
    expect(stages).toEqual([
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
  });

  it("preserves autonomous finance approval before execution", () => {
    const autonomousFinance = new AutonomousFinanceEngine();
    const action = autonomousFinance.run({ organizationId: 1 }).actions.find((candidate) => candidate.status === "requires_approval");

    expect(action).toBeDefined();
    expect(autonomousFinance.executeApprovedAction(action!).status).toBe("blocked");
    expect(autonomousFinance.executeApprovedAction(autonomousFinance.approveAction(action!, "Finance Director")).status).toBe("executed");
  });
});
