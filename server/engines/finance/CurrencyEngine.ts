/**
 * server/engines/finance/CurrencyEngine.ts
 *
 * Currency Engine
 * Manages multi-currency operations, exchange rates, and conversions.
 * Handles reporting currency, donor currency, project currency, and gain/loss calculations.
 *
 * Responsibilities:
 * - Exchange rate management
 * - Multi-currency conversion
 * - Reporting currency conversion
 * - Historical exchange rates
 * - Gain/loss calculations
 * - Currency exposure tracking
 * - Donor currency handling
 * - Project currency handling
 * - Operating unit currency handling
 */

import type { DB } from '../../db/_scope';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  source: 'manual' | 'api' | 'system';
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  conversionDate: Date;
}

export interface CurrencyExposure {
  currency: string;
  totalExposed: number;
  reportingCurrencyValue: number;
  percentOfTotal: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FXGainLoss {
  period: string; // YYYY-MM
  realizedGain: number;
  realizedLoss: number;
  unrealizedGain: number;
  unrealizedLoss: number;
  netGainLoss: number;
}

export interface CurrencyConfig {
  organizationId: number;
  reportingCurrency: string;
  operatingCurrencies: string[];
  donorCurrencies: string[];
  rateUpdateFrequency: 'daily' | 'weekly' | 'monthly';
  lastRateUpdate: Date;
}

// ── Currency Engine ─────────────────────────────────────────────────────────

export class CurrencyEngine {
  private db: DB;
  private exchangeRateCache: Map<string, ExchangeRate> = new Map();

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get exchange rate between two currencies.
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<ExchangeRate> {
    const cacheKey = `${fromCurrency}_${toCurrency}`;

    // Check cache first
    if (this.exchangeRateCache.has(cacheKey)) {
      const cached = this.exchangeRateCache.get(cacheKey)!;
      // Return cached if less than 1 hour old
      if (Date.now() - cached.effectiveDate.getTime() < 3600000) {
        return cached;
      }
    }

    // In production, query from database or external API
    // For now, return mock rates
    const rate = this.getMockExchangeRate(fromCurrency, toCurrency);

    const exchangeRate: ExchangeRate = {
      fromCurrency,
      toCurrency,
      rate,
      effectiveDate: date || new Date(),
      source: 'api',
    };

    this.exchangeRateCache.set(cacheKey, exchangeRate);
    return exchangeRate;
  }

  /**
   * Convert amount from one currency to another.
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<ConversionResult> {
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: amount,
        convertedCurrency: toCurrency,
        exchangeRate: 1,
        conversionDate: date || new Date(),
      };
    }

    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, date);

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: amount * exchangeRate.rate,
      convertedCurrency: toCurrency,
      exchangeRate: exchangeRate.rate,
      conversionDate: exchangeRate.effectiveDate,
    };
  }

  /**
   * Convert to reporting currency.
   */
  async convertToReportingCurrency(
    amount: number,
    sourceCurrency: string,
    reportingCurrency: string,
    date?: Date
  ): Promise<number> {
    if (sourceCurrency === reportingCurrency) {
      return amount;
    }

    const result = await this.convertCurrency(amount, sourceCurrency, reportingCurrency, date);
    return result.convertedAmount;
  }

  /**
   * Calculate currency exposure.
   */
  async getCurrencyExposure(
    organizationId: number,
    operatingUnitId?: number | null,
    reportingCurrency: string = 'USD'
  ): Promise<CurrencyExposure[]> {
    // Simplified implementation - in production, query GL accounts by currency
    const exposures: CurrencyExposure[] = [
      {
        currency: 'USD',
        totalExposed: 500000,
        reportingCurrencyValue: 500000,
        percentOfTotal: 60,
        riskLevel: 'low',
      },
      {
        currency: 'EUR',
        totalExposed: 200000,
        reportingCurrencyValue: 220000,
        percentOfTotal: 26,
        riskLevel: 'medium',
      },
      {
        currency: 'GBP',
        totalExposed: 100000,
        reportingCurrencyValue: 125000,
        percentOfTotal: 14,
        riskLevel: 'low',
      },
    ];

    return exposures;
  }

  /**
   * Calculate FX gain/loss.
   */
  async calculateFXGainLoss(
    organizationId: number,
    operatingUnitId?: number | null,
    period?: string // YYYY-MM
  ): Promise<FXGainLoss> {
    // Simplified implementation
    return {
      period: period || new Date().toISOString().slice(0, 7),
      realizedGain: 5000,
      realizedLoss: 2000,
      unrealizedGain: 8000,
      unrealizedLoss: 1500,
      netGainLoss: 9500,
    };
  }

  /**
   * Get currency configuration for organization.
   */
  async getCurrencyConfig(organizationId: number): Promise<CurrencyConfig> {
    // Simplified implementation - in production, query from settings
    return {
      organizationId,
      reportingCurrency: 'USD',
      operatingCurrencies: ['USD', 'EUR', 'GBP'],
      donorCurrencies: ['USD', 'EUR', 'CHF'],
      rateUpdateFrequency: 'daily',
      lastRateUpdate: new Date(),
    };
  }

  /**
   * Update exchange rates.
   */
  async updateExchangeRates(
    rates: ExchangeRate[]
  ): Promise<{ success: boolean; updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const rate of rates) {
      try {
        const cacheKey = `${rate.fromCurrency}_${rate.toCurrency}`;
        this.exchangeRateCache.set(cacheKey, rate);
        // In production, save to database
        updated++;
      } catch (error) {
        failed++;
      }
    }

    return { success: failed === 0, updated, failed };
  }

  /**
   * Get historical exchange rates.
   */
  async getHistoricalExchangeRates(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExchangeRate[]> {
    // Simplified implementation - in production, query from database
    const rates: ExchangeRate[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      rates.push({
        fromCurrency,
        toCurrency,
        rate: this.getMockExchangeRate(fromCurrency, toCurrency),
        effectiveDate: new Date(current),
        source: 'api',
      });
      current.setDate(current.getDate() + 1);
    }

    return rates;
  }

  /**
   * Mock exchange rate (for demo purposes).
   */
  private getMockExchangeRate(fromCurrency: string, toCurrency: string): number {
    const rates: Record<string, number> = {
      'USD_EUR': 0.92,
      'EUR_USD': 1.09,
      'USD_GBP': 0.79,
      'GBP_USD': 1.27,
      'EUR_GBP': 0.86,
      'GBP_EUR': 1.16,
      'USD_CHF': 0.88,
      'CHF_USD': 1.14,
      'USD_SAR': 3.75,
      'SAR_USD': 0.27,
      'USD_AED': 3.67,
      'AED_USD': 0.27,
    };

    const key = `${fromCurrency}_${toCurrency}`;
    return rates[key] || 1;
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let currencyEngineInstance: CurrencyEngine | null = null;

export async function getCurrencyEngine(db: DB): Promise<CurrencyEngine> {
  if (!currencyEngineInstance) {
    currencyEngineInstance = new CurrencyEngine(db);
  }
  return currencyEngineInstance;
}