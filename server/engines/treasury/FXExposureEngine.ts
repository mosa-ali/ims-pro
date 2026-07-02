import { CurrencyEngine } from "./CurrencyEngine";
import {
  FXExposurePosition,
  FXExposureReport,
  TreasuryBankAccount,
  TreasuryCashFlow,
  TreasuryPayable,
  TreasuryScope,
  toNumber,
} from "./TreasuryTypes";

export class FXExposureEngine {
  private readonly currencyEngine: CurrencyEngine;

  constructor(currencyEngine: CurrencyEngine) {
    this.currencyEngine = currencyEngine;
  }

  analyzeExposure(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
    cashFlows: TreasuryCashFlow[];
    payables: TreasuryPayable[];
  }): FXExposureReport {
    const currencyMap = new Map<string, FXExposurePosition>();
    const totalCashInBase = input.bankAccounts.reduce((sum, account) => {
      return sum + this.currencyEngine.toBaseAmount(account.currentBalance, account.currency, input.scope).amountInBaseCurrency;
    }, 0);

    const positionFor = (currency: string): FXExposurePosition => {
      const existing = currencyMap.get(currency);
      if (existing) return existing;

      const created: FXExposurePosition = {
        currency,
        cashBalance: 0,
        expectedInflows: 0,
        expectedOutflows: 0,
        payableExposure: 0,
        netExposure: 0,
        baseCurrencyValue: 0,
        percentageOfCash: 0,
        riskLevel: "low",
      };
      currencyMap.set(currency, created);
      return created;
    };

    for (const account of input.bankAccounts) {
      const position = positionFor(account.currency);
      position.cashBalance += toNumber(account.currentBalance);
    }

    for (const flow of input.cashFlows) {
      const position = positionFor(flow.currency);
      const weightedAmount = toNumber(flow.amount) * (flow.probability ?? 1);
      if (flow.direction === "inflow") position.expectedInflows += weightedAmount;
      else position.expectedOutflows += weightedAmount;
    }

    for (const payable of input.payables) {
      const position = positionFor(payable.currency);
      position.payableExposure += toNumber(payable.amount);
    }

    const positions = [...currencyMap.values()]
      .map((position) => {
        position.netExposure =
          position.cashBalance + position.expectedInflows - position.expectedOutflows - position.payableExposure;
        position.baseCurrencyValue = this.currencyEngine.toBaseAmount(
          Math.abs(position.netExposure),
          position.currency,
          input.scope,
        ).amountInBaseCurrency;
        position.percentageOfCash = totalCashInBase > 0
          ? (position.baseCurrencyValue / totalCashInBase) * 100
          : 0;
        position.riskLevel = this.classifyRisk(position.percentageOfCash, position.currency === input.scope.baseCurrency);
        return position;
      })
      .sort((a, b) => b.baseCurrencyValue - a.baseCurrencyValue);

    const totalExposureInBaseCurrency = positions.reduce((sum, position) => sum + position.baseCurrencyValue, 0);
    const highRiskCurrencies = positions
      .filter((position) => position.riskLevel === "high" || position.riskLevel === "critical")
      .map((position) => position.currency);

    return {
      baseCurrency: input.scope.baseCurrency,
      totalExposureInBaseCurrency,
      positions,
      highRiskCurrencies,
      recommendations: this.recommend(positions, input.scope.baseCurrency),
    };
  }

  private classifyRisk(percentageOfCash: number, isBaseCurrency: boolean) {
    if (isBaseCurrency) return "low";
    if (percentageOfCash >= 50) return "critical";
    if (percentageOfCash >= 25) return "high";
    if (percentageOfCash >= 10) return "medium";
    return "low";
  }

  private recommend(positions: FXExposurePosition[], baseCurrency: string): string[] {
    const recommendations: string[] = [];
    const highRisk = positions.filter((position) => position.riskLevel === "high" || position.riskLevel === "critical");

    for (const position of highRisk) {
      recommendations.push(
        `Review ${position.currency}/${baseCurrency} exposure and consider natural hedging or staged conversions.`,
      );
    }

    if (!recommendations.length) {
      recommendations.push("FX exposure is within normal treasury tolerance.");
    }

    return recommendations;
  }
}
