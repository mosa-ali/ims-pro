/**
 * shared/currency/index.ts
 *
 * FRONTEND-SAFE barrel export for the currency engine.
 * 
 * This file exports ONLY browser-safe utilities:
 * - Currency metadata
 * - Formatting functions
 * - Conversion logic (cache-based)
 * - Cache read-only helpers
 * - Types
 *
 * Server-side engine control (sync, scheduling, DB persistence) is NOT exported here.
 * For backend functionality, import from shared/currency/server.ts instead.
 *
 * Usage:
 *   // Frontend
 *   import { formatCurrency, convertCurrency } from '@/shared/currency';
 *   
 *   // Backend
 *   import { startExchangeRateEngine } from '@/shared/currency/server';
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types (re-exported for consumers)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  InforEuroRateRow,
  NormalisedRate,
  CacheEntry,
  ConversionRequest,
  ConversionResult,
  ConversionError,
  SyncResult,
  RateValidationResult,
  RateSource,
  SyncStatus,
} from './exchangeRateTypes';

export { MAX_FLUCTUATION_PERCENT, MIN_VALID_RATE } from './exchangeRateTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Currency metadata
// ─────────────────────────────────────────────────────────────────────────────

export type { CurrencyCode, CurrencyMeta } from './currencies';
export {
  CURRENCY_MAP,
  CURRENCY_REGISTRY,
  ALL_CURRENCY_CODES,
  getCurrencyMeta,
  isCurrencyCode,
} from './currencies';

// ─────────────────────────────────────────────────────────────────────────────
// Formatting (browser-safe)
// ─────────────────────────────────────────────────────────────────────────────

export type { SupportedLocale } from './currencyFormatter';
export {
  formatCurrency,
  formatCompactCurrency,
  formatAccountingCurrency,
  parseCurrency,
  formatCurrencyInput,
  getCurrencySymbol,
  getCurrencyName,
  getCurrencyNameAr,
  getCurrencyConfig,
  formatCurrencyForTable,
  replaceUSDWithDollar,
  getAllCurrencyCodes,
} from './currencyFormatter';

// ─────────────────────────────────────────────────────────────────────────────
// Conversion (cache-based, browser-safe)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  BatchConversionInput,
  BatchConversionOutput,
} from './currencyConversion';
export {
  convertCurrency,
  convertWithRates,
  convertBatch,
  getAvailableCurrencies,
} from './currencyConversion';

// ─────────────────────────────────────────────────────────────────────────────
// Cache (read-only access for consumers)
// ─────────────────────────────────────────────────────────────────────────────

export {
  getCachedRate,
  getAllCachedRates,
  isCacheValid,
  hasCacheData,
  getCacheRefMonth,
  getCachePopulatedAt,
} from './exchangeRateCache';
