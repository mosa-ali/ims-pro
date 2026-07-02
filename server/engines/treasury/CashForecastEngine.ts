import { CurrencyEngine } from "./CurrencyEngine";
import {
  CashForecastSummary,
  DailyCashForecast,
  ForecastScenario,
  TreasuryBankAccount,
  TreasuryCashFlow,
  TreasuryScope,
  addDays,
  toNumber,
} from "./TreasuryTypes";

export class CashForecastEngine {
  private readonly currencyEngine: CurrencyEngine;

  constructor(currencyEngine: CurrencyEngine) {
    this.currencyEngine = currencyEngine;
  }

  generateForecast(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
    cashFlows: TreasuryCashFlow[];
    horizonDays?: number;
    scenario?: ForecastScenario;
    minimumCashReserve?: number;
  }): CashForecastSummary {
    const horizonDays = input.horizonDays ?? 90;
    const scenario = input.scenario ?? "expected";
    const minimumRequired = input.minimumCashReserve ?? this.defaultMinimumReserve(input.bankAccounts, input.scope);
    let balance = this.totalBaseCash(input.bankAccounts, input.scope);
    const startBalance = balance;
    const forecast: DailyCashForecast[] = [];
    let totalInflows = 0;
    let totalOutflows = 0;

    for (let day = 0; day <= horizonDays; day++) {
      const date = addDays(input.scope.asOfDate, day);
      const openingBalance = balance;
      const dayFlows = input.cashFlows.filter((flow) => flow.date.slice(0, 10) === date);
      const inflows = dayFlows
        .filter((flow) => flow.direction === "inflow")
        .reduce((sum, flow) => sum + this.weightedBaseAmount(flow, input.scope, scenario), 0);
      const outflows = dayFlows
        .filter((flow) => flow.direction === "outflow")
        .reduce((sum, flow) => sum + this.weightedBaseAmount(flow, input.scope, scenario), 0);

      balance = openingBalance + inflows - outflows;
      totalInflows += inflows;
      totalOutflows += outflows;

      const liquidityGap = Math.max(0, minimumRequired - balance);
      forecast.push({
        date,
        scenario,
        openingBalance,
        inflows,
        outflows,
        closingBalance: balance,
        minimumRequired,
        liquidityGap,
        riskLevel: liquidityGap === 0
          ? "low"
          : liquidityGap > minimumRequired * 0.5
            ? "critical"
            : liquidityGap > minimumRequired * 0.2
              ? "high"
              : "medium",
      });
    }

    const balances = forecast.map((day) => day.closingBalance);
    return {
      scenario,
      horizonDays,
      startBalance,
      endingBalance: forecast[forecast.length - 1]?.closingBalance ?? startBalance,
      minimumProjectedBalance: Math.min(...balances),
      maximumProjectedBalance: Math.max(...balances),
      totalInflows,
      totalOutflows,
      daysBelowMinimum: forecast.filter((day) => day.closingBalance < day.minimumRequired).length,
      forecast,
    };
  }

  generateScenarioSet(input: {
    scope: TreasuryScope;
    bankAccounts: TreasuryBankAccount[];
    cashFlows: TreasuryCashFlow[];
    horizonDays?: number;
    minimumCashReserve?: number;
  }): CashForecastSummary[] {
    return (["best", "expected", "worst"] as ForecastScenario[]).map((scenario) =>
      this.generateForecast({ ...input, scenario }),
    );
  }

  private weightedBaseAmount(
    flow: TreasuryCashFlow,
    scope: TreasuryScope,
    scenario: ForecastScenario,
  ): number {
    const probability = flow.probability ?? 1;
    const baseAmount = this.currencyEngine.toBaseAmount(flow.amount, flow.currency, scope).amountInBaseCurrency;
    const multiplier = scenario === "best"
      ? flow.direction === "inflow" ? 1.1 : 0.9
      : scenario === "worst"
        ? flow.direction === "inflow" ? 0.8 : 1.2
        : 1;

    return baseAmount * probability * multiplier;
  }

  private totalBaseCash(accounts: TreasuryBankAccount[], scope: TreasuryScope): number {
    return accounts
      .filter((account) => account.isActive !== false && account.isActive !== 0)
      .reduce((sum, account) => {
        return sum + this.currencyEngine.toBaseAmount(account.currentBalance, account.currency, scope).amountInBaseCurrency;
      }, 0);
  }

  private defaultMinimumReserve(accounts: TreasuryBankAccount[], scope: TreasuryScope): number {
    return accounts.reduce((sum, account) => {
      const minimum = account.minimumBalance ?? Math.max(0, toNumber(account.currentBalance) * 0.1);
      return sum + this.currencyEngine.toBaseAmount(minimum, account.currency, scope).amountInBaseCurrency;
    }, 0);
  }
}
