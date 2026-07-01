/**
 * server/engines/MultiCurrencyEngine.ts
 *
 * Multi-Currency Engine
 * Manages currency conversions across multiple currency contexts: Base, Project, Donor, OU, and Org.
 *
 * Responsibilities:
 * - Manage currency hierarchies (Base > Org > OU > Project > Donor)
 * - Convert amounts between currencies
 * - Calculate effective exchange rates
 * - Track currency preferences per context
 * - Validate currency compatibility
 * - Generate currency conversion reports
 */

import { and, eq, sum, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  financeExchangeRates,
  financeBankAccounts,
  procurementInvoices,
} from '../../drizzle/schema';
import { getDb } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export type CurrencyContext = 'base' | 'organization' | 'operatingUnit' | 'project' | 'donor';

export interface CurrencyHierarchy {
  baseCurrency: string;
  organizationCurrency: string;
  operatingUnitCurrency: string;
  projectCurrency: string;
  donorCurrency: string;
}

export interface CurrencyConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  conversionDate: string;
  context?: CurrencyContext;
}

export interface CurrencyConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  conversionDate: string;
  source: 'market' | 'configured' | 'historical';
}

export interface ExchangeRateInfo {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  source: string;
  confidence: number; // 0-100
}

export interface CurrencyContextConfig {
  contextType: CurrencyContext;
  contextId: number;
  currency: string;
  isDefault: boolean;
  allowedCurrencies: string[];
  conversionMethod: 'market' | 'fixed' | 'manual';
  lastUpdated: string;
}

export interface CurrencyConversionReport {
  reportDate: string;
  organizationId: number;
  totalConversions: number;
  totalAmountConverted: number;
  conversionsByContext: Record<CurrencyContext, { count: number; amount: number }>;
  exchangeRateVariance: number;
  recommendations: string[];
}

// ── Multi-Currency Engine ────────────────────────────────────────────────────

export class MultiCurrencyEngine {
  private db: DB;
  private baseCurrency = 'USD'; // Default base currency

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get currency hierarchy for an organization.
   */
  async getCurrencyHierarchy(
    organizationId: number,
    operatingUnitId: number
  ): Promise<CurrencyHierarchy> {
    // TODO: Fetch from database configuration
    return {
      baseCurrency: this.baseCurrency,
      organizationCurrency: 'USD', // TODO: Get from org config
      operatingUnitCurrency: 'USD', // TODO: Get from OU config
      projectCurrency: 'USD', // TODO: Get from project config
      donorCurrency: 'USD', // TODO: Get from donor config
    };
  }

  /**
   * Get exchange rate between two currencies.
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    asOfDate: string
  ): Promise<ExchangeRateInfo> {
    // If same currency, return 1.0
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        rate: 1.0,
        effectiveDate: asOfDate,
        source: 'identity',
        confidence: 100,
      };
    }

    // Try to get from database
    const [rateRecord] = await this.db
      .select({
        rate: financeExchangeRates.rate,
        effectiveDate: financeExchangeRates.effectiveDate,
        source: financeExchangeRates.source,
      })
      .from(financeExchangeRates)
      .where(
        and(
          eq(financeExchangeRates.fromCurrencyCode, fromCurrency),
          eq(financeExchangeRates.toCurrencyCode, toCurrency),
          lte(financeExchangeRates.effectiveDate, asOfDate)
        )
      )
      .orderBy(desc(financeExchangeRates.effectiveDate))
      .limit(1);

    if (rateRecord) {
      return {
        fromCurrency,
        toCurrency,
        rate: Number(rateRecord.rate) || 1.0,
        effectiveDate: rateRecord.effectiveDate,
        source: rateRecord.source || 'configured',
        confidence: 85,
      };
    }

    // Fallback: return 1.0 with low confidence
    return {
      fromCurrency,
      toCurrency,
      rate: 1.0,
      effectiveDate: asOfDate,
      source: 'fallback',
      confidence: 0,
    };
  }

  /**
   * Convert amount between currencies.
   */
  async convertCurrency(request: CurrencyConversionRequest): Promise<CurrencyConversionResult> {
    const exchangeRateInfo = await this.getExchangeRate(
      request.fromCurrency,
      request.toCurrency,
      request.conversionDate
    );

    const convertedAmount = request.amount * exchangeRateInfo.rate;

    return {
      originalAmount: request.amount,
      originalCurrency: request.fromCurrency,
      convertedAmount: Number(convertedAmount.toFixed(2)),
      convertedCurrency: request.toCurrency,
      exchangeRate: exchangeRateInfo.rate,
      conversionDate: request.conversionDate,
      source: exchangeRateInfo.source as 'market' | 'configured' | 'historical',
    };
  }

  /**
   * Convert to base currency.
   */
  async convertToBaseCurrency(
    amount: number,
    fromCurrency: string,
    asOfDate: string
  ): Promise<number> {
    if (fromCurrency === this.baseCurrency) {
      return amount;
    }

    const result = await this.convertCurrency({
      amount,
      fromCurrency,
      toCurrency: this.baseCurrency,
      conversionDate: asOfDate,
    });

    return result.convertedAmount;
  }

  /**
   * Convert from base currency.
   */
  async convertFromBaseCurrency(
    amount: number,
    toCurrency: string,
    asOfDate: string
  ): Promise<number> {
    if (toCurrency === this.baseCurrency) {
      return amount;
    }

    const result = await this.convertCurrency({
      amount,
      fromCurrency: this.baseCurrency,
      toCurrency,
      conversionDate: asOfDate,
    });

    return result.convertedAmount;
  }

  /**
   * Set currency context configuration.
   */
  async setCurrencyContext(
    organizationId: number,
    contextType: CurrencyContext,
    contextId: number,
    currency: string,
    allowedCurrencies: string[]
  ): Promise<CurrencyContextConfig> {
    // TODO: Save to database
    return {
      contextType,
      contextId,
      currency,
      isDefault: contextType === 'base',
      allowedCurrencies,
      conversionMethod: 'market',
      lastUpdated: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Get currency context configuration.
   */
  async getCurrencyContext(
    organizationId: number,
    contextType: CurrencyContext,
    contextId: number
  ): Promise<CurrencyContextConfig> {
    // TODO: Fetch from database
    return {
      contextType,
      contextId,
      currency: 'USD',
      isDefault: contextType === 'base',
      allowedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD'],
      conversionMethod: 'market',
      lastUpdated: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Validate currency compatibility.
   */
  async validateCurrencyCompatibility(
    fromCurrency: string,
    toCurrency: string,
    organizationId: number
  ): Promise<{ isCompatible: boolean; reason?: string }> {
    // Check if both currencies are supported
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'MXN'];

    if (!supportedCurrencies.includes(fromCurrency)) {
      return {
        isCompatible: false,
        reason: `Currency ${fromCurrency} is not supported`,
      };
    }

    if (!supportedCurrencies.includes(toCurrency)) {
      return {
        isCompatible: false,
        reason: `Currency ${toCurrency} is not supported`,
      };
    }

    return { isCompatible: true };
  }

  /**
   * Get effective exchange rate for a currency pair over a period.
   */
  async getEffectiveExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const rates = await this.db
      .select({
        rate: financeExchangeRates.rate,
      })
      .from(financeExchangeRates)
      .where(
        and(
          eq(financeExchangeRates.fromCurrencyCode, fromCurrency),
          eq(financeExchangeRates.toCurrencyCode, toCurrency),
          gte(financeExchangeRates.effectiveDate, startDate),
          lte(financeExchangeRates.effectiveDate, endDate)
        )
      );

    if (rates.length === 0) {
      return 1.0;
    }

    const sum = rates.reduce((acc, r) => acc + Number(r.rate), 0);
    const average = sum / rates.length;

    return Number(average.toFixed(4));
  }

  /**
   * Generate currency conversion report.
   */
  async generateConversionReport(
    organizationId: number,
    startDate: string,
    endDate: string
  ): Promise<CurrencyConversionReport> {
    // TODO: Fetch conversion history from database
    const conversionsByContext: Record<CurrencyContext, { count: number; amount: number }> = {
      base: { count: 0, amount: 0 },
      organization: { count: 0, amount: 0 },
      operatingUnit: { count: 0, amount: 0 },
      project: { count: 0, amount: 0 },
      donor: { count: 0, amount: 0 },
    };

    return {
      reportDate: new Date().toISOString().split('T')[0],
      organizationId,
      totalConversions: 0,
      totalAmountConverted: 0,
      conversionsByContext,
      exchangeRateVariance: 0,
      recommendations: [
        'Monitor exchange rate fluctuations',
        'Consider implementing FX hedging for major currency pairs',
        'Review currency conversion policies quarterly',
      ],
    };
  }

  /**
   * Reconcile multi-currency amounts to base currency.
   */
  async reconcileToBaseCurrency(
    amounts: Array<{ amount: number; currency: string; date: string }>,
    asOfDate: string
  ): Promise<{ totalInBaseCurrency: number; breakdown: Array<{ amount: number; currency: string; baseAmount: number }> }> {
    const breakdown: Array<{ amount: number; currency: string; baseAmount: number }> = [];
    let totalInBaseCurrency = 0;

    for (const item of amounts) {
      const baseAmount = await this.convertToBaseCurrency(item.amount, item.currency, item.date);
      breakdown.push({
        amount: item.amount,
        currency: item.currency,
        baseAmount: Number(baseAmount.toFixed(2)),
      });
      totalInBaseCurrency += baseAmount;
    }

    return {
      totalInBaseCurrency: Number(totalInBaseCurrency.toFixed(2)),
      breakdown,
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let multiCurrencyEngineInstance: MultiCurrencyEngine | null = null;

export async function getMultiCurrencyEngine(): Promise<MultiCurrencyEngine> {
  if (!multiCurrencyEngineInstance) {
    const db = await getDb();
    multiCurrencyEngineInstance = new MultiCurrencyEngine(db);
  }
  return multiCurrencyEngineInstance;
}

export const multiCurrencyEngine = {
  getCurrencyHierarchy: async (organizationId: number, operatingUnitId: number) => {
    const engine = await getMultiCurrencyEngine();
    return engine.getCurrencyHierarchy(organizationId, operatingUnitId);
  },
  getExchangeRate: async (fromCurrency: string, toCurrency: string, asOfDate: string) => {
    const engine = await getMultiCurrencyEngine();
    return engine.getExchangeRate(fromCurrency, toCurrency, asOfDate);
  },
  convertCurrency: async (request: CurrencyConversionRequest) => {
    const engine = await getMultiCurrencyEngine();
    return engine.convertCurrency(request);
  },
  convertToBaseCurrency: async (amount: number, fromCurrency: string, asOfDate: string) => {
    const engine = await getMultiCurrencyEngine();
    return engine.convertToBaseCurrency(amount, fromCurrency, asOfDate);
  },
  convertFromBaseCurrency: async (amount: number, toCurrency: string, asOfDate: string) => {
    const engine = await getMultiCurrencyEngine();
    return engine.convertFromBaseCurrency(amount, toCurrency, asOfDate);
  },
  setCurrencyContext: async (
    organizationId: number,
    contextType: CurrencyContext,
    contextId: number,
    currency: string,
    allowedCurrencies: string[]
  ) => {
    const engine = await getMultiCurrencyEngine();
    return engine.setCurrencyContext(organizationId, contextType, contextId, currency, allowedCurrencies);
  },
  getCurrencyContext: async (organizationId: number, contextType: CurrencyContext, contextId: number) => {
    const engine = await getMultiCurrencyEngine();
    return engine.getCurrencyContext(organizationId, contextType, contextId);
  },
  validateCurrencyCompatibility: async (
    fromCurrency: string,
    toCurrency: string,
    organizationId: number
  ) => {
    const engine = await getMultiCurrencyEngine();
    return engine.validateCurrencyCompatibility(fromCurrency, toCurrency, organizationId);
  },
  getEffectiveExchangeRate: async (
    fromCurrency: string,
    toCurrency: string,
    startDate: string,
    endDate: string
  ) => {
    const engine = await getMultiCurrencyEngine();
    return engine.getEffectiveExchangeRate(fromCurrency, toCurrency, startDate, endDate);
  },
  generateConversionReport: async (organizationId: number, startDate: string, endDate: string) => {
    const engine = await getMultiCurrencyEngine();
    return engine.generateConversionReport(organizationId, startDate, endDate);
  },
  reconcileToBaseCurrency: async (
    amounts: Array<{ amount: number; currency: string; date: string }>,
    asOfDate: string
  ) => {
    const engine = await getMultiCurrencyEngine();
    return engine.reconcileToBaseCurrency(amounts, asOfDate);
  },
};
