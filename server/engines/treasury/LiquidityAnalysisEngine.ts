import { CurrencyEngine } from "./CurrencyEngine";
import {
  LiquidityAnalysis,
  TreasuryBankAccount,
  TreasuryCashFlow,
  TreasuryPayable,
  TreasuryScope,
  daysBetween,
  toNumber,
} from "./TreasuryTypes";

export class LiquidityAnalysisEngine {
  private readonly currencyEngine: CurrencyEngine;

  constructor(currencyEngine: CurrencyEngine) {
    this.currencyEngine = currencyEngine;
  }

  analyze(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
    payables: TreasuryPayable[];
    cashFlows: TreasuryCashFlow[];
    reserveDays?: number;
  }): LiquidityAnalysis {
    const totalCash = this.sumAccounts(input.bankAccounts, input.scope, () => true);
    const restrictedCash = this.sumAccounts(input.bankAccounts, input.scope, (account) =>
      Boolean(account.isRestricted || account.role === "restricted"),
    );
    const unrestrictedCash = Math.max(0, totalCash - restrictedCash);
    const totalPayables = input.payables.reduce((sum, payable) => {
      return sum + this.currencyEngine.toBaseAmount(payable.amount, payable.currency, input.scope).amountInBaseCurrency;
    }, 0);
    const overduePayables = input.payables
      .filter((payable) => payable.dueDate && payable.dueDate < input.scope.asOfDate)
      .reduce((sum, payable) => {
        return sum + this.currencyEngine.toBaseAmount(payable.amount, payable.currency, input.scope).amountInBaseCurrency;
      }, 0);
    const nextOutflows = input.cashFlows
      .filter((flow) => flow.direction === "outflow" && daysBetween(input.scope.asOfDate, flow.date) >= 0)
      .reduce((sum, flow) => {
        return sum + this.currencyEngine.toBaseAmount(flow.amount, flow.currency, input.scope).amountInBaseCurrency * (flow.probability ?? 1);
      }, 0);
    const reserveDays = input.reserveDays ?? 30;
    const dailyBurn = nextOutflows > 0 ? nextOutflows / reserveDays : totalPayables / reserveDays;
    const cashCoverageDays = dailyBurn > 0 ? unrestrictedCash / dailyBurn : 999;
    const workingCapital = unrestrictedCash - totalPayables;
    const currentRatio = totalPayables > 0 ? unrestrictedCash / totalPayables : unrestrictedCash > 0 ? 99 : 0;
    const liquidityBuffer = unrestrictedCash - dailyBurn * reserveDays;
    const riskLevel = this.classifyRisk(currentRatio, cashCoverageDays, workingCapital);

    return {
      totalCash,
      unrestrictedCash,
      restrictedCash,
      totalPayables,
      overduePayables,
      workingCapital,
      currentRatio,
      cashCoverageDays,
      liquidityBuffer,
      riskLevel,
      recommendations: this.recommend({
        currentRatio,
        cashCoverageDays,
        workingCapital,
        overduePayables,
        restrictedCash,
      }),
    };
  }

  private sumAccounts(
    accounts: TreasuryBankAccount[],
    scope: TreasuryScope,
    predicate: (account: TreasuryBankAccount) => boolean,
  ): number {
    return accounts
      .filter((account) => account.isActive !== false && account.isActive !== 0 && predicate(account))
      .reduce((sum, account) => {
        return sum + this.currencyEngine.toBaseAmount(toNumber(account.currentBalance), account.currency, scope).amountInBaseCurrency;
      }, 0);
  }

  private classifyRisk(currentRatio: number, cashCoverageDays: number, workingCapital: number) {
    if (workingCapital < 0 || currentRatio < 0.75 || cashCoverageDays < 7) return "critical";
    if (currentRatio < 1 || cashCoverageDays < 14) return "high";
    if (currentRatio < 1.5 || cashCoverageDays < 30) return "medium";
    return "low";
  }

  private recommend(signals: {
    currentRatio: number;
    cashCoverageDays: number;
    workingCapital: number;
    overduePayables: number;
    restrictedCash: number;
  }): string[] {
    const recommendations: string[] = [];

    if (signals.workingCapital < 0) {
      recommendations.push("Create an immediate funding or payment deferral plan for negative working capital.");
    }
    if (signals.currentRatio < 1.5) {
      recommendations.push("Improve liquidity by accelerating confirmed inflows and rescheduling lower-priority payments.");
    }
    if (signals.cashCoverageDays < 30) {
      recommendations.push("Increase unrestricted cash coverage toward a 30-day operating reserve.");
    }
    if (signals.overduePayables > 0) {
      recommendations.push("Prioritize overdue payables to reduce supplier and compliance risk.");
    }
    if (signals.restrictedCash > 0) {
      recommendations.push("Separate restricted cash from operating liquidity when scheduling payments.");
    }

    if (!recommendations.length) {
      recommendations.push("Liquidity position is healthy; continue routine treasury monitoring.");
    }

    return recommendations;
  }
}
