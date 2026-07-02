import {
  CurrencyAmount,
  ExchangeRate,
  TreasuryScope,
  toNumber,
} from "./TreasuryTypes";

export interface CurrencyConversion {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  effectiveDate: string;
  source: string;
}

export class CurrencyEngine {
  private readonly rates: ExchangeRate[];

  constructor(rates: ExchangeRate[] = []) {
    this.rates = rates;
  }

  getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    asOfDate: string,
  ): { rate: number; effectiveDate: string; source: string } {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (from === to) {
      return { rate: 1, effectiveDate: asOfDate, source: "identity" };
    }

    const direct = this.findRate(from, to, asOfDate);
    if (direct) return direct;

    const inverse = this.findRate(to, from, asOfDate);
    if (inverse && inverse.rate !== 0) {
      return {
        rate: 1 / inverse.rate,
        effectiveDate: inverse.effectiveDate,
        source: `${inverse.source || "configured"}:inverse`,
      };
    }

    return { rate: 1, effectiveDate: asOfDate, source: "fallback" };
  }

  convert(
    amount: number | string,
    fromCurrency: string,
    toCurrency: string,
    asOfDate: string,
  ): CurrencyConversion {
    const numericAmount = toNumber(amount);
    const rate = this.getExchangeRate(fromCurrency, toCurrency, asOfDate);

    return {
      originalAmount: numericAmount,
      originalCurrency: fromCurrency,
      convertedAmount: numericAmount * rate.rate,
      convertedCurrency: toCurrency,
      exchangeRate: rate.rate,
      effectiveDate: rate.effectiveDate,
      source: rate.source,
    };
  }

  toBaseAmount(
    amount: number | string,
    currency: string,
    scope: TreasuryScope,
  ): CurrencyAmount {
    const converted = this.convert(amount, currency, scope.baseCurrency, scope.asOfDate);
    return {
      currency,
      amount: converted.originalAmount,
      amountInBaseCurrency: converted.convertedAmount,
    };
  }

  private findRate(
    fromCurrency: string,
    toCurrency: string,
    asOfDate: string,
  ): { rate: number; effectiveDate: string; source: string } | null {
    const candidates = this.rates
      .filter((rate) =>
        rate.fromCurrency.toUpperCase() === fromCurrency &&
        rate.toCurrency.toUpperCase() === toCurrency &&
        rate.effectiveDate <= asOfDate
      )
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));

    const match = candidates[0];
    if (!match) return null;

    return {
      rate: toNumber(match.rate),
      effectiveDate: match.effectiveDate,
      source: match.source || "configured",
    };
  }
}
