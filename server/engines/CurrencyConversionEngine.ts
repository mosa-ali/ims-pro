/**
 * CurrencyConversionEngine.ts
 *
 * Handles all currency conversion logic for the Executive Finance Dashboard.
 * Implements the currency determination strategy:
 *
 * Single Project Context:
 *   Selected Project → Project Currency → Dashboard Currency
 *
 * Multi-Project Context:
 *   Operating Unit Country → Global Reporting Currency → Convert all values
 *
 * Features:
 * - Determine effective dashboard currency based on context
 * - Convert monetary values between currencies
 * - Manage exchange rates with caching
 * - Support multi-currency aggregation
 */

import { getDb } from '../db';
import { financeCurrencies, operatingUnits, projects } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

export interface CurrencyContext {
  organizationId: number;
  operatingUnitId?: number;
  projectId?: number;
  selectedCurrency?: string;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string | null;
  exchangeRate: number;
  decimalPlaces: number;
}

export interface ConversionResult {
  originalValue: number;
  originalCurrency: string;
  convertedValue: number;
  convertedCurrency: string;
  exchangeRate: number;
  timestamp: Date;
}

/**
 * CurrencyConversionEngine
 *
 * Manages all currency-related operations for the dashboard.
 */
export class CurrencyConversionEngine {
  private currencyCache: Map<string, CurrencyInfo> = new Map();
  private exchangeRateCache: Map<string, number> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Determine the effective dashboard currency based on context
   */
  async determineDashboardCurrency(context: CurrencyContext): Promise<string> {
    const db = await getDb();

    // Single project context: use project currency
    if (context.projectId) {
      const [project] = await db
        .select({ currency: projects.currency })
        .from(projects)
        .where(eq(projects.id, context.projectId))
        .limit(1);

      if (project?.currency) {
        return project.currency;
      }
    }

    // Multi-project context: use operating unit's default currency
    if (context.operatingUnitId) {
      const [ou] = await db
        .select({ currency: operatingUnits.currency })
        .from(operatingUnits)
        .where(eq(operatingUnits.id, context.operatingUnitId))
        .limit(1);

      if (ou?.currency) {
        return ou.currency;
      }
    }

    // Fallback: USD
    return 'USD';
  }

  /**
   * Get currency information including exchange rate
   */
  async getCurrencyInfo(
    organizationId: number,
    currencyCode: string
  ): Promise<CurrencyInfo> {
    const cacheKey = `${organizationId}:${currencyCode}`;

    // Check cache
    if (this.currencyCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && expiry > Date.now()) {
        return this.currencyCache.get(cacheKey)!;
      }
    }

    const db = await getDb();
    const [currency] = await db
      .select({
        code: financeCurrencies.code,
        name: financeCurrencies.name,
        symbol: financeCurrencies.symbol,
        exchangeRate: financeCurrencies.exchangeRate,
        decimalPlaces: financeCurrencies.decimalPlaces,
      })
      .from(financeCurrencies)
      .where(
        and(
          eq(financeCurrencies.organizationId, organizationId),
          eq(financeCurrencies.code, currencyCode)
        )
      )
      .limit(1);

    if (!currency) {
      throw new Error(`Currency ${currencyCode} not found for organization ${organizationId}`);
    }

    const info: CurrencyInfo = {
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: Number(currency.exchangeRate || 1),
      decimalPlaces: currency.decimalPlaces || 2,
    };

    // Cache the result
    this.currencyCache.set(cacheKey, info);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

    return info;
  }

  /**
   * Convert a value from one currency to another
   */
  async convertCurrency(
    organizationId: number,
    value: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    if (fromCurrency === toCurrency) {
      return {
        originalValue: value,
        originalCurrency: fromCurrency,
        convertedValue: value,
        convertedCurrency: toCurrency,
        exchangeRate: 1,
        timestamp: new Date(),
      };
    }

    const fromInfo = await this.getCurrencyInfo(organizationId, fromCurrency);
    const toInfo = await this.getCurrencyInfo(organizationId, toCurrency);

    // Convert through base currency (USD)
    const baseValue = value / fromInfo.exchangeRate;
    const convertedValue = baseValue * toInfo.exchangeRate;

    return {
      originalValue: value,
      originalCurrency: fromCurrency,
      convertedValue: Number(convertedValue.toFixed(toInfo.decimalPlaces)),
      convertedCurrency: toCurrency,
      exchangeRate: toInfo.exchangeRate / fromInfo.exchangeRate,
      timestamp: new Date(),
    };
  }

  /**
   * Format a monetary value with currency symbol and proper decimal places
   */
  async formatCurrency(
    organizationId: number,
    value: number,
    currencyCode: string,
    includeSymbol: boolean = true
  ): Promise<string> {
    const currencyInfo = await this.getCurrencyInfo(organizationId, currencyCode);
    const formatted = value.toFixed(currencyInfo.decimalPlaces);

    if (includeSymbol) {
      return `${currencyInfo.symbol}${formatted}`;
    }
    return formatted;
  }

  /**
   * Get all available currencies for an organization
   */
  async getAvailableCurrencies(organizationId: number): Promise<CurrencyInfo[]> {
    const db = await getDb();
    const currencies = await db
      .select({
        code: financeCurrencies.code,
        name: financeCurrencies.name,
        symbol: financeCurrencies.symbol,
        exchangeRate: financeCurrencies.exchangeRate,
        decimalPlaces: financeCurrencies.decimalPlaces,
      })
      .from(financeCurrencies)
      .where(
        and(
          eq(financeCurrencies.organizationId, organizationId),
          eq(financeCurrencies.isActive, 1)
        )
      );

    return currencies.map((c) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      exchangeRate: Number(c.exchangeRate || 1),
      decimalPlaces: c.decimalPlaces || 2,
    }));
  }

  /**
   * Get the base currency for an organization
   */
  async getBaseCurrency(organizationId: number): Promise<CurrencyInfo> {
    const db = await getDb();
    const [baseCurrency] = await db
      .select({
        code: financeCurrencies.code,
        name: financeCurrencies.name,
        symbol: financeCurrencies.symbol,
        exchangeRate: financeCurrencies.exchangeRate,
        decimalPlaces: financeCurrencies.decimalPlaces,
      })
      .from(financeCurrencies)
      .where(
        and(
          eq(financeCurrencies.organizationId, organizationId),
          eq(financeCurrencies.isBaseCurrency, 1)
        )
      )
      .limit(1);

    if (!baseCurrency) {
      // Fallback to USD
      return {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 1,
        decimalPlaces: 2,
      };
    }

    return {
      code: baseCurrency.code,
      name: baseCurrency.name,
      symbol: baseCurrency.symbol,
      exchangeRate: Number(baseCurrency.exchangeRate || 1),
      decimalPlaces: baseCurrency.decimalPlaces || 2,
    };
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.currencyCache.clear();
    this.exchangeRateCache.clear();
    this.cacheExpiry.clear();
  }
}

// Export singleton instance
export const currencyEngine = new CurrencyConversionEngine();
