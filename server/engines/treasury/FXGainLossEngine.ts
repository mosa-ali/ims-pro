import { CurrencyEngine } from "./CurrencyEngine";
import {
  ExchangeRate,
  TreasuryCashFlow,
  TreasuryPayable,
  TreasuryScope,
  toNumber,
} from "./TreasuryTypes";

export interface FXGainLossPosition {
  currency: string;
  originalAmount: number;
  historicalRate: number;
  currentRate: number;
  gainLossInBaseCurrency: number;
  type: "gain" | "loss" | "neutral";
}

export class FXGainLossEngine {
  private readonly currencyEngine: CurrencyEngine;
  private readonly rates: ExchangeRate[];

  constructor(currencyEngine: CurrencyEngine, rates: ExchangeRate[] = []) {
    this.currencyEngine = currencyEngine;
    this.rates = rates;
  }

  calculateUnrealizedGainLoss(input: {
    scope: TreasuryScope;
    payables: TreasuryPayable[];
  }): FXGainLossPosition[] {
    return input.payables
      .filter((payable) => payable.currency !== input.scope.baseCurrency)
      .map((payable) => {
        const originalAmount = toNumber(payable.amount);
        const historical = this.getHistoricalRate(payable.currency, input.scope.baseCurrency, input.scope.asOfDate);
        const current = this.currencyEngine.getExchangeRate(
          payable.currency,
          input.scope.baseCurrency,
          input.scope.asOfDate,
        );
        const gainLossInBaseCurrency = originalAmount * (current.rate - historical.rate);

        return {
          currency: payable.currency,
          originalAmount,
          historicalRate: historical.rate,
          currentRate: current.rate,
          gainLossInBaseCurrency,
          type: gainLossInBaseCurrency > 0 ? "loss" : gainLossInBaseCurrency < 0 ? "gain" : "neutral",
        };
      });
  }

  calculateForecastFXImpact(input: {
    scope: TreasuryScope;
    cashFlows: TreasuryCashFlow[];
  }): Array<{ currency: string; projectedImpactInBaseCurrency: number }> {
    const grouped = new Map<string, number>();

    for (const flow of input.cashFlows) {
      if (flow.currency === input.scope.baseCurrency) continue;
      const converted = this.currencyEngine.convert(
        flow.amount,
        flow.currency,
        input.scope.baseCurrency,
        input.scope.asOfDate,
      );
      const signed = flow.direction === "inflow" ? converted.convertedAmount : -converted.convertedAmount;
      grouped.set(flow.currency, (grouped.get(flow.currency) || 0) + signed);
    }

    return [...grouped.entries()].map(([currency, projectedImpactInBaseCurrency]) => ({
      currency,
      projectedImpactInBaseCurrency,
    }));
  }

  private getHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    asOfDate: string,
  ): { rate: number; effectiveDate: string } {
    const oldest = this.rates
      .filter((rate) =>
        rate.fromCurrency === fromCurrency &&
        rate.toCurrency === toCurrency &&
        rate.effectiveDate <= asOfDate
      )
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0];

    if (!oldest) {
      const current = this.currencyEngine.getExchangeRate(fromCurrency, toCurrency, asOfDate);
      return { rate: current.rate, effectiveDate: current.effectiveDate };
    }

    return { rate: toNumber(oldest.rate), effectiveDate: oldest.effectiveDate };
  }
}
