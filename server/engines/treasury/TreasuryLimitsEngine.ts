import {
  BankRiskAssessment,
  FXExposureReport,
  LiquidityAnalysis,
  TreasuryLimitAssessment,
  TreasuryPolicy,
  TreasuryPolicyViolation,
} from "./TreasuryTypes";

export class TreasuryLimitsEngine {
  evaluate(input: {
    policy: TreasuryPolicy;
    liquidity: LiquidityAnalysis;
    fxExposure: FXExposureReport;
    bankRisks: BankRiskAssessment[];
  }): TreasuryLimitAssessment {
    const violations: TreasuryPolicyViolation[] = [];

    if (input.liquidity.cashCoverageDays < input.policy.minimumCashCoverageDays) {
      violations.push({
        policyKey: "minimumCashCoverageDays",
        severity: "warning",
        message: "Cash coverage is below treasury policy.",
        actualValue: input.liquidity.cashCoverageDays,
        limitValue: input.policy.minimumCashCoverageDays,
      });
    }
    if (input.liquidity.currentRatio < input.policy.minimumLiquidityRatio) {
      violations.push({
        policyKey: "minimumLiquidityRatio",
        severity: "critical",
        message: "Liquidity ratio is below minimum policy threshold.",
        actualValue: input.liquidity.currentRatio,
        limitValue: input.policy.minimumLiquidityRatio,
      });
    }

    for (const position of input.fxExposure.positions) {
      if (position.currency !== input.fxExposure.baseCurrency && position.percentageOfCash > input.policy.maximumFXExposurePercent) {
        violations.push({
          policyKey: "maximumFXExposurePercent",
          severity: position.riskLevel === "critical" ? "critical" : "warning",
          message: `${position.currency} exposure exceeds treasury policy.`,
          actualValue: position.percentageOfCash,
          limitValue: input.policy.maximumFXExposurePercent,
        });
      }
    }

    for (const bank of input.bankRisks) {
      if (bank.exposurePercentage > input.policy.maximumBankExposurePercent) {
        violations.push({
          policyKey: "bank_concentration",
          severity: "warning",
          message: `${bank.bankName} concentration exceeds bank exposure limit.`,
          actualValue: bank.exposurePercentage,
          limitValue: input.policy.maximumBankExposurePercent,
        });
      }
    }

    return {
      violations,
      passed: violations.length === 0,
    };
  }
}
