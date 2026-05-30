/**
 * shared/currency/exchangeRateCache.ts
 *
 * In-memory cache for exchange rates.
 *
 * Strategy:
 *   - Primary cache: TTL-based (default 6 hours)
 *   - Stale fallback: keeps the last valid snapshot even after TTL expiry
 *     so the system never returns zero rates due to a temporary API outage
 *   - Thread-safe for single-process Node.js (no concurrent write races)
 */

import type { CacheEntry, NormalisedRate } from './exchangeRateTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Cache TTL in milliseconds. Default: 6 hours. */
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1_000;

// ─────────────────────────────────────────────────────────────────────────────
// Cache store (module-level singleton)
// ─────────────────────────────────────────────────────────────────────────────

let _primary: CacheEntry | null = null;
let _stale: CacheEntry | null = null;
let _ttlMs: number = DEFAULT_TTL_MS;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Override the TTL (useful for tests or configuration). */
export function setCacheTTL(ms: number): void {
  _ttlMs = ms;
}

/**
 * Populate the cache with a fresh set of rates.
 * The previous primary snapshot is demoted to stale before replacement.
 */
export function populateCache(rates: NormalisedRate[], refMonth: string): void {
  // Demote current primary to stale before replacing
  if (_primary !== null) {
    _stale = _primary;
  }

  const rateMap = new Map<string, NormalisedRate>();
  for (const r of rates) {
    rateMap.set(r.quoteCurrency, r);
  }

  _primary = {
    rates: rateMap,
    populatedAt: Date.now(),
    refMonth,
  };
}

/**
 * Retrieve a rate from cache.
 *
 * Returns the primary cache entry if it is within TTL.
 * Falls back to the stale snapshot if primary is expired or absent.
 * Returns `undefined` if neither cache has the requested currency.
 */
export function getCachedRate(quoteCurrency: string): NormalisedRate | undefined {
  const now = Date.now();

  // Try primary first
  if (_primary !== null) {
    const age = now - _primary.populatedAt;
    if (age <= _ttlMs) {
      const rate = _primary.rates.get(quoteCurrency);
      if (rate) return rate;
    }
  }

  // Fall back to stale snapshot
  if (_stale !== null) {
    return _stale.rates.get(quoteCurrency);
  }

  return undefined;
}

/**
 * Retrieve all rates from the best available cache snapshot.
 * Returns an empty Map if the cache is empty.
 */
export function getAllCachedRates(): Map<string, NormalisedRate> {
  const now = Date.now();

  if (_primary !== null) {
    const age = now - _primary.populatedAt;
    if (age <= _ttlMs) return _primary.rates;
  }

  if (_stale !== null) return _stale.rates;

  return new Map();
}

/** Returns true if the primary cache is populated and within TTL. */
export function isCacheValid(): boolean {
  if (_primary === null) return false;
  return Date.now() - _primary.populatedAt <= _ttlMs;
}

/** Returns true if any cache (primary or stale) has data. */
export function hasCacheData(): boolean {
  return _primary !== null || _stale !== null;
}

/** Returns the refMonth of the current primary cache, or null. */
export function getCacheRefMonth(): string | null {
  return _primary?.refMonth ?? null;
}

/** Returns the timestamp when the primary cache was last populated, or null. */
export function getCachePopulatedAt(): number | null {
  return _primary?.populatedAt ?? null;
}

/** Clear all cache data (useful for tests). */
export function clearCache(): void {
  _primary = null;
  _stale = null;
}

/**
 * Populate the cache from an array of NormalisedRate objects loaded from the DB.
 * Derives refMonth from the effectiveDate of the first rate (YYYY-MM → MM/YYYY).
 * Alias for bootstrapExchangeRateService warm-up.
 */
export function populateCacheFromRates(rates: NormalisedRate[]): void {
  if (rates.length === 0) return;
  // Derive refMonth from effectiveDate "YYYY-MM-DD" → "MM/YYYY"
  const [year, month] = (rates[0].effectiveDate ?? '').split('-');
  const refMonth = month && year ? `${month}/${year}` : 'unknown';
  populateCache(rates, refMonth);
}
