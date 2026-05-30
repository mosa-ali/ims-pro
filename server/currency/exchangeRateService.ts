/**
 * server/currency/exchangeRateService.ts
 *
 * DB persistence layer for exchange rates.
 * Uses the EXISTING `finance_exchange_rates` table — no new table needed.
 *
 * Mapping: NormalisedRate (EUR-based) → financeExchangeRates columns
 *
 *   NormalisedRate.baseCurrency   → fromCurrencyCode  (always "EUR")
 *   NormalisedRate.quoteCurrency  → toCurrencyCode    (e.g. "USD")
 *   NormalisedRate.rate           → rate
 *   NormalisedRate.effectiveDate  → effectiveDate
 *   NormalisedRate.source         → source            ("inforeuro")
 *
 * Fixed values for InforEuro-sourced rows:
 *   rateType     = 'official'
 *   organizationId = 0  (system-level, not org-scoped)
 *   isDeleted    = 0
 *
 * Historical lookup uses:
 *   fromCurrencyCode = baseCurrency, toCurrencyCode = quoteCurrency,
 *   effectiveDate ≤ onOrBefore, isDeleted = 0
 *   ordered by effectiveDate DESC, picks the most recent row.
 *
 * NOTE: getDb() is async — always use `await getDb()` before calling DB methods.
 */

import { eq, and, lte, desc } from 'drizzle-orm';
/**
 * IMPORTANT — File placement:
 * This file MUST live in `server/currency/exchangeRateService.ts`
 * (NOT in shared/currency/) because it imports server-only modules:
 *   - `../db`       → server/db.ts
 *   - `../../drizzle/schema` → drizzle/schema.ts
 * The shared/currency/ files (index.ts, currencyConversion.ts, etc.) are
 * safe to import from both client and server.
 */
import { getDb } from '../../server/db';
import { financeExchangeRates } from '../../drizzle/schema';
import type { InferSelectModel } from 'drizzle-orm';
import type { NormalisedRate } from '../../shared/currency/exchangeRateTypes';

import {
  setDbPersistHook,
  setLoadLatestDbRatesHook,
  startExchangeRateEngine,
} from '../../shared/currency/exchangeRateEngine';

type FinanceExchangeRateRow = InferSelectModel<typeof financeExchangeRates>;

// ─────────────────────────────────────────────────────────────────────────────
// System organisation ID for InforEuro rates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * InforEuro rates are system-level (not org-specific).
 * We store them under organizationId = 0 so they are:
 *   - Distinguishable from manually entered org rates
 *   - Queryable by all organisations as a fallback
 */
const SYSTEM_ORG_ID = 0;

// ─────────────────────────────────────────────────────────────────────────────
// DB upsert
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a batch of InforEuro-sourced normalised rates into `finance_exchange_rates`.
 *
 * Strategy: INSERT ... ON DUPLICATE KEY UPDATE is not possible without a unique
 * index on (fromCurrencyCode, toCurrencyCode, effectiveDate, organizationId).
 * Instead we do a SELECT first, then INSERT or UPDATE — safe for MySQL/TiDB.
 *
 * For production throughput, add a unique index:
 *   ALTER TABLE finance_exchange_rates
 *     ADD UNIQUE KEY uniq_rate_pair_date_org
 *     (from_currency_code, to_currency_code, effective_date, organization_id);
 * Then switch to onDuplicateKeyUpdate for better performance.
 */
export async function upsertExchangeRates(
  rates: NormalisedRate[]
): Promise<{ upserted: number; failed: number }> {
  const db = await getDb();
  let upserted = 0;
  let failed = 0;
  const nowTs = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL DATETIME

  for (const rate of rates) {
    try {
      const FROM = rate.baseCurrency.toUpperCase();
      const TO   = rate.quoteCurrency.toUpperCase();

      // Check if a system-level row already exists for this pair + date
      const existing = await db
        .select({ id: financeExchangeRates.id })
        .from(financeExchangeRates)
        .where(
          and(
            eq(financeExchangeRates.fromCurrencyCode, FROM),
            eq(financeExchangeRates.toCurrencyCode,   TO),
            eq(financeExchangeRates.effectiveDate,    rate.effectiveDate),
            eq(financeExchangeRates.organizationId,   SYSTEM_ORG_ID),
            eq(financeExchangeRates.isDeleted,        0)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update the rate value only (preserve all other metadata)
        await db
          .update(financeExchangeRates)
          .set({
            rate:      String(rate.rate),
            source:    rate.source,
            updatedAt: nowTs,
          })
          .where(eq(financeExchangeRates.id, existing[0].id));
      } else {
        // Insert new row
        await db
          .insert(financeExchangeRates)
          .values({
            fromCurrencyCode: FROM,
            toCurrencyCode:   TO,
            rate:             String(rate.rate),
            effectiveDate:    rate.effectiveDate,
            source:           rate.source,
            rateType:         'official',
            organizationId:   SYSTEM_ORG_ID,
            isDeleted:        0,
            createdAt:        nowTs,
            updatedAt:        nowTs,
          });
      }

      upserted++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[ExchangeRateService] Failed to upsert ${rate.baseCurrency}→${rate.quoteCurrency}: ${msg}`
      );
    }
  }

  return { upserted, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single rate upsert (for manual entries)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert a single exchange rate row.
 * Convenience wrapper around upsertExchangeRates for single-rate operations.
 */
export async function upsertExchangeRate(rate: NormalisedRate): Promise<void> {
  await upsertExchangeRates([rate]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Historical rate lookup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the most recent exchange rate for a currency pair on or before a given date.
 *
 * Lookup order:
 *   1. Org-specific rate (organizationId = orgId) — most specific
 *   2. System-level InforEuro rate (organizationId = 0) — fallback
 *
 * @param baseCurrency   e.g. "EUR"
 * @param quoteCurrency  e.g. "USD"
 * @param onOrBefore     ISO date string "YYYY-MM-DD" — defaults to today
 * @param orgId          Organisation scope for org-specific rate lookup
 * @returns The rate value, or null if not found
 */
export async function getHistoricalRate(
  baseCurrency: string,
  quoteCurrency: string,
  onOrBefore?: string,
  orgId?: number
): Promise<number | null> {
  const db = await getDb();
  const FROM      = baseCurrency.toUpperCase();
  const TO        = quoteCurrency.toUpperCase();
  const dateLimit = onOrBefore ?? new Date().toISOString().slice(0, 10);

  const baseConditions = and(
    eq(financeExchangeRates.fromCurrencyCode, FROM),
    eq(financeExchangeRates.toCurrencyCode,   TO),
    lte(financeExchangeRates.effectiveDate,   dateLimit),
    eq(financeExchangeRates.isDeleted,        0)
  );

  // 1. Try org-specific rate first
  if (orgId !== undefined && orgId !== SYSTEM_ORG_ID) {
    const orgRows = await db
      .select({ rate: financeExchangeRates.rate })
      .from(financeExchangeRates)
      .where(and(baseConditions, eq(financeExchangeRates.organizationId, orgId)))
      .orderBy(desc(financeExchangeRates.effectiveDate))
      .limit(1);

    if (orgRows.length > 0) {
      return parseFloat(orgRows[0].rate);
    }
  }

  // 2. Fall back to system-level InforEuro rate
  const sysRows = await db
    .select({ rate: financeExchangeRates.rate })
    .from(financeExchangeRates)
    .where(and(baseConditions, eq(financeExchangeRates.organizationId, SYSTEM_ORG_ID)))
    .orderBy(desc(financeExchangeRates.effectiveDate))
    .limit(1);

  if (sysRows.length > 0) {
    return parseFloat(sysRows[0].rate);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// All rates for a specific date (for batch historical conversion)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all exchange rates effective on a specific date.
 * Returns a Map of quoteCurrency → rate value for fast lookup.
 *
 * @param effectiveDate  ISO date string "YYYY-MM-DD"
 * @param orgId          Organisation scope (0 = system rates only)
 * @returns Map<quoteCurrency, rate>
 */
export async function getAllRatesForDate(
  effectiveDate: string,
  orgId: number = SYSTEM_ORG_ID
): Promise<Map<string, number>> {
  const db = await getDb();

  const rows = await db
    .select({
      toCurrencyCode: financeExchangeRates.toCurrencyCode,
      rate:           financeExchangeRates.rate,
    })
    .from(financeExchangeRates)
    .where(
      and(
        eq(financeExchangeRates.effectiveDate,  effectiveDate),
        eq(financeExchangeRates.organizationId, orgId),
        eq(financeExchangeRates.isDeleted,      0)
      )
    );

  const rateMap = new Map<string, number>();
  for (const row of rows) {
    rateMap.set(row.toCurrencyCode.toUpperCase(), parseFloat(row.rate));
  }
  return rateMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Latest rate lookup (cache warm-up)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load all system-level InforEuro rates for the most recent effective date.
 * Used to warm the in-memory cache on server startup.
 *
 * @returns Array of NormalisedRate objects
 */
export async function loadLatestSystemRates(): Promise<NormalisedRate[]> {
  const db = await getDb();

  // Find the most recent effectiveDate for system rates
  const latestDateRows = await db
    .select({ effectiveDate: financeExchangeRates.effectiveDate })
    .from(financeExchangeRates)
    .where(
      and(
        eq(financeExchangeRates.organizationId, SYSTEM_ORG_ID),
        eq(financeExchangeRates.source,         'inforeuro'),
        eq(financeExchangeRates.isDeleted,       0)
      )
    )
    .orderBy(desc(financeExchangeRates.effectiveDate))
    .limit(1);

  if (latestDateRows.length === 0) return [];

  const latestDate = latestDateRows[0].effectiveDate;

  const rows = await db
    .select({
      fromCurrencyCode: financeExchangeRates.fromCurrencyCode,
      toCurrencyCode:   financeExchangeRates.toCurrencyCode,
      rate:             financeExchangeRates.rate,
      effectiveDate:    financeExchangeRates.effectiveDate,
      source:           financeExchangeRates.source,
      createdAt:        financeExchangeRates.createdAt,
    })
    .from(financeExchangeRates)
    .where(
      and(
        eq(financeExchangeRates.organizationId, SYSTEM_ORG_ID),
        eq(financeExchangeRates.effectiveDate,  latestDate),
        eq(financeExchangeRates.isDeleted,      0)
      )
    );

  return rows.map((row: Pick<FinanceExchangeRateRow, 'fromCurrencyCode' | 'toCurrencyCode' | 'rate' | 'effectiveDate' | 'source' | 'createdAt'>) => ({
    baseCurrency:  row.fromCurrencyCode,
    quoteCurrency: row.toCurrencyCode,
    rate:          parseFloat(row.rate),
    effectiveDate: row.effectiveDate,
    source:        (row.source ?? 'inforeuro') as 'inforeuro' | 'manual' | 'fallback' | 'cache',
    fetchedAt:     row.createdAt
      ? new Date(row.createdAt).getTime()
      : Date.now(),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bootstrap the exchange rate engine.
 * Call this once from your server entry point (e.g. server/_core/index.ts).
 *
 * Sequence:
 *   1. Load latest rates from DB into the in-memory cache (instant availability)
 *   2. Register the DB persist hook so the engine saves new rates after fetching
 *   3. Register the DB fallback hook so the engine loads rates on API outage
 *   4. Start the engine (immediate InforEuro sync + daily schedule)
 *
 * @example
 *   import { bootstrapExchangeRateService } from './currency/exchangeRateService';
 *   bootstrapExchangeRateService();
 */
export async function bootstrapExchangeRateService(): Promise<void> {
  try {
    // Step 1: warm cache from DB (so conversions work immediately on startup)
    const { populateCacheFromRates } = await import('../../shared/currency/exchangeRateCache');
    const storedRates = await loadLatestSystemRates();
    if (storedRates.length > 0) {
      populateCacheFromRates(storedRates);
      console.info(
        `[ExchangeRateService] Warmed cache with ${storedRates.length} rates from DB (${storedRates[0]?.effectiveDate})`
      );
    }
  } catch (err) {
    console.warn('[ExchangeRateService] Cache warm-up skipped:', err);
  }

  // Step 2: register DB persist hook
  setDbPersistHook(upsertExchangeRates);

  // Step 2b: register DB fallback hook (for API outages)
  setLoadLatestDbRatesHook(loadLatestSystemRates);

  // Step 3: start engine (sync + schedule)
  startExchangeRateEngine().catch((err) => {
    console.error('[ExchangeRateService] Engine startup error:', err);
  });

  console.info('[ExchangeRateService] Exchange rate engine bootstrapped successfully');
}
