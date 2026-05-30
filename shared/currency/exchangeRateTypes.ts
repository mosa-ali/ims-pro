/**
 * shared/currency/exchangeRateTypes.ts
 *
 * Centralized type definitions for the currency engine.
 * All other currency modules import from here — no duplicated interfaces.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Rate source
// ─────────────────────────────────────────────────────────────────────────────

/** Where a rate originated */
export type RateSource =
  | 'inforeuro'     // Rate fetched from InforEuro API
  | 'manual'        // Rate entered manually by a user
  | 'fallback'      // Rate loaded from DB as API fallback
  | 'cache'         // Rate served from in-memory cache
  | 'identity'      // Same-currency conversion (rate = 1, no lookup needed)
  | 'provided'      // Rate explicitly provided by caller (historical conversion)
  | 'org_or_system';// Org-specific rate or system InforEuro fallback

/** InforEuro sync result */
export type SyncStatus = 'success' | 'partial' | 'failed' | 'skipped';

// ─────────────────────────────────────────────────────────────────────────────
// Raw InforEuro API shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single row returned by the InforEuro JSON endpoint.
 * InforEuro publishes EUR-based rates: 1 EUR = X <currency>.
 */
export interface InforEuroRateRow {
  /** ISO 4217 currency code, e.g. "USD" */
  isoCode: string;
  /** Human-readable currency name */
  currencyName: string;
  /** Number of currency units per 1 EUR */
  value: number;
  /** Publication month, e.g. "05/2026" */
  refMonth: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalised internal rate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalised exchange rate stored in memory cache and DB.
 * Base is always EUR (InforEuro convention).
 * rate = how many <quoteCurrency> units equal 1 EUR.
 */
export interface NormalisedRate {
  /** Base currency — always "EUR" for InforEuro rates */
  baseCurrency: string;
  /** Quote currency, e.g. "USD" */
  quoteCurrency: string;
  /** Units of quoteCurrency per 1 EUR */
  rate: number;
  /** ISO 8601 effective date, e.g. "2026-05-01" */
  effectiveDate: string;
  /** Where this rate came from */
  source: RateSource;
  /** Unix timestamp (ms) when this rate was fetched/cached */
  fetchedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache entry
// ─────────────────────────────────────────────────────────────────────────────

export interface CacheEntry {
  rates: Map<string, NormalisedRate>;
  /** Unix timestamp (ms) when this cache snapshot was populated */
  populatedAt: number;
  /** Month string this snapshot covers, e.g. "05/2026" */
  refMonth: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion request / result
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  /** Optional: use rates effective on this date (ISO 8601). Defaults to latest. */
  effectiveDate?: string;
  /** Optional: organisation scope for DB rate lookup */
  organizationId?: number;
}

export interface ConversionResult {
  /** Original amount before conversion */
  amount: number;
  /** Exchange rate used for conversion */
  rate: number;
  /** Source currency code */
  from: string;
  /** Target currency code */
  to: string;
  /** Where this rate came from (cache, inforeuro, db, etc) */
  source: RateSource;
  /**
   * Effective date of the rate used (ISO 8601, e.g. "2026-05-01").
   * Optional — not available for identity conversions or cache-based conversions
   * where the date is not tracked at the call site.
   */
  effectiveDate?: string;
}

/** Error returned when conversion fails (rate unavailable) */
export interface ConversionError {
  error: string;
  fromCurrency?: string;
  toCurrency?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync operation log
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncResult {
  status: SyncStatus;
  ratesUpserted: number;
  ratesFailed: number;
  refMonth: string;
  syncedAt: string;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface RateValidationResult {
  valid: boolean;
  reason?: string;
}

/** Maximum allowed single-month fluctuation before a rate is flagged */
export const MAX_FLUCTUATION_PERCENT = 30;

/** Minimum valid rate (rejects zero / negative) */
export const MIN_VALID_RATE = 0.000001;
