import { CurrencyEngine } from "./CurrencyEngine";
import {
  BankRiskAssessment,
  CountryRisk,
  RiskLevel,
  TreasuryBankAccount,
  TreasuryPolicy,
  TreasuryScope,
  riskFromScore,
} from "./TreasuryTypes";

const ratingScores: Record<string, number> = {
  AAA: 0,
  AA: 10,
  A: 20,
  BBB: 35,
  BB: 55,
  B: 75,
  CCC: 95,
  UNKNOWN: 50,
};

export class BankRiskEngine {
  constructor(private readonly currencyEngine: CurrencyEngine) {}

  assess(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
    policy: TreasuryPolicy;
    countryRisks?: CountryRisk[];
  }): BankRiskAssessment[] {
    const activeAccounts = input.bankAccounts.filter((account) => account.isActive !== false && account.isActive !== 0);
    const totalCash = activeAccounts.reduce((sum, account) => {
      return sum + this.currencyEngine.toBaseAmount(account.currentBalance, account.currency, input.scope).amountInBaseCurrency;
    }, 0);
    const byBank = new Map<string, TreasuryBankAccount[]>();

    for (const account of activeAccounts) {
      byBank.set(account.bankName, [...(byBank.get(account.bankName) ?? []), account]);
    }

    return [...byBank.entries()].map(([bankName, accounts]) => {
      const exposureAmount = accounts.reduce((sum, account) => {
        return sum + this.currencyEngine.toBaseAmount(account.currentBalance, account.currency, input.scope).amountInBaseCurrency;
      }, 0);
      const exposurePercentage = totalCash > 0 ? (exposureAmount / totalCash) * 100 : 0;
      const representative = accounts[0];
      const countryRisk = this.countryRisk(representative.countryCode, input.countryRisks);
      const sanctionsRisk: RiskLevel = accounts.some((account) => account.sanctionsFlag) ? "critical" : "low";
      const liquidityRisk: RiskLevel = accounts.some((account) => account.liquidityRating === "weak")
        ? "high"
        : accounts.some((account) => account.liquidityRating === "adequate")
          ? "medium"
          : "low";
      const concentrationRisk = exposurePercentage > input.policy.maximumBankExposurePercent
        ? "high"
        : exposurePercentage > input.policy.maximumBankExposurePercent * 0.8
          ? "medium"
          : "low";
      const creditRating = representative.creditRating ?? "UNKNOWN";
      const creditScore = ratingScores[creditRating];
      const overallScore =
        creditScore +
        this.riskScore(countryRisk) +
        this.riskScore(sanctionsRisk) +
        this.riskScore(liquidityRisk) +
        this.riskScore(concentrationRisk);
      const overallRisk = riskFromScore(Math.min(100, overallScore / 2.5));

      return {
        bankName,
        countryCode: representative.countryCode,
        exposureAmount,
        exposurePercentage,
        creditRating,
        concentrationRisk,
        countryRisk,
        sanctionsRisk,
        liquidityRisk,
        overallRisk,
        recommendations: this.recommend(bankName, exposurePercentage, input.policy.maximumBankExposurePercent, overallRisk),
      };
    });
  }

  private countryRisk(countryCode?: string, countryRisks: CountryRisk[] = []): RiskLevel {
    if (!countryCode) return "medium";
    const found = countryRisks.find((risk) => risk.countryCode === countryCode);
    if (!found) return "low";
    if (found.sanctionsFlag) return "critical";
    return found.riskLevel;
  }

  private riskScore(risk: RiskLevel): number {
    if (risk === "critical") return 100;
    if (risk === "high") return 70;
    if (risk === "medium") return 35;
    return 0;
  }

  private recommend(bankName: string, exposurePercentage: number, limit: number, risk: RiskLevel): string[] {
    const recommendations: string[] = [];

    if (exposurePercentage > limit) {
      recommendations.push(`${bankName} exceeds the ${limit}% bank exposure limit; rebalance surplus cash.`);
    }
    if (risk === "high" || risk === "critical") {
      recommendations.push(`Review treasury mandates and counterparty approval for ${bankName}.`);
    }
    if (!recommendations.length) {
      recommendations.push(`${bankName} is within current treasury risk appetite.`);
    }

    return recommendations;
  }
}
