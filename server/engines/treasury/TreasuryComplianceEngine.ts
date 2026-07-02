import {
  PaymentOptimizationPlan,
  TreasuryBankAccount,
  TreasuryComplianceResult,
  TreasuryPayable,
  TreasuryPolicy,
  TreasuryScope,
  toNumber,
} from "./TreasuryTypes";

export class TreasuryComplianceEngine {
  evaluate(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
    payables: TreasuryPayable[];
    paymentOptimization: PaymentOptimizationPlan;
    policy: TreasuryPolicy;
  }): TreasuryComplianceResult {
    const findings: TreasuryComplianceResult["findings"] = [];

    const restrictedAccountIds = new Set(
      input.bankAccounts
        .filter((account) => account.isRestricted || account.role === "restricted")
        .map((account) => account.id),
    );

    for (const payment of input.paymentOptimization.optimizedPayments) {
      if (payment.bankAccountId && restrictedAccountIds.has(payment.bankAccountId) && !input.policy.restrictedCashUsable) {
        findings.push({
          code: "RESTRICTED_CASH_USED",
          severity: "critical",
          message: `Payment ${payment.payableId} is scheduled from restricted cash.`,
        });
      }

      if (payment.amount > input.policy.requireDualApprovalAboveAmount) {
        findings.push({
          code: "DUAL_APPROVAL_REQUIRED",
          severity: "warning",
          message: `Payment ${payment.payableId} exceeds dual approval threshold.`,
        });
      }
    }

    for (const payable of input.payables) {
      if (toNumber(payable.amount) < 0) {
        findings.push({
          code: "NEGATIVE_PAYABLE",
          severity: "critical",
          message: `Payable ${payable.id} has a negative amount.`,
        });
      }
    }

    return {
      passed: !findings.some((finding) => finding.severity === "critical"),
      findings,
    };
  }
}
