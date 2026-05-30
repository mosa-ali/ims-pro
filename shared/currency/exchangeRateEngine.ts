/**
 * shared/currency/exchangeRateEngine.ts
 *
 * Responsible for:
 *   - Orchestrating InforEuro synchronisation
 *   - Retry logic with exponential back-off
 *   - Scheduled daily sync
 *   - Populating the in-memory cache
 *   - Persisting rates to the DB via exchangeRateService
 *   - Structured logging of all sync operations
 *
 * Usage (call once at server startup):
 *   import { startExchangeRateEngine } from './exchangeRateEngine';
 *   startExchangeRateEngine();
 */

import { fetchAndNormaliseRates } from './exchangeRateProvider';
import {
  populateCache,
  isCacheValid,
  getAllCachedRates,
  getCacheRefMonth,
  populateCacheFromRates,
} from './exchangeRateCache';
import type { SyncResult, NormalisedRate } from './exchangeRateTypes';

type LoadLatestDbRatesFn = () => Promise<NormalisedRate[]>;
let _loadLatestDbRates: LoadLatestDbRatesFn | null = null;

export function setLoadLatestDbRatesHook(fn: LoadLatestDbRatesFn): void {
  _loadLatestDbRates = fn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const SYNC_INTERVAL_MS   = 24 * 60 * 60 * 1_000; // 24 hours
const MAX_RETRIES        = 3;
const RETRY_BASE_DELAY_MS = 5_000;                // 5 s, doubles each attempt

// ─────────────────────────────────────────────────────────────────────────────
// Logger (structured, environment-aware)
// ─────────────────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  info: (msg: string, meta?: object) => {
    if (isDev) console.log(`[CurrencyEngine] ${msg}`, meta ?? '');
    else console.log(JSON.stringify({ level: 'info', service: 'currency-engine', msg, ...meta }));
  },
  warn: (msg: string, meta?: object) => {
    if (isDev) console.warn(`[CurrencyEngine] WARN: ${msg}`, meta ?? '');
    else console.warn(JSON.stringify({ level: 'warn', service: 'currency-engine', msg, ...meta }));
  },
  error: (msg: string, meta?: object) => {
    if (isDev) console.error(`[CurrencyEngine] ERROR: ${msg}`, meta ?? '');
    else console.error(JSON.stringify({ level: 'error', service: 'currency-engine', msg, ...meta }));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DB persistence hook (injected to avoid circular dependency)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Optional callback for persisting rates to the DB.
 * Set via `setDbPersistHook()` from exchangeRateService.ts after DB is ready.
 */
type DbPersistFn = (rates: NormalisedRate[]) => Promise<{ upserted: number; failed: number }>;
let _dbPersist: DbPersistFn | null = null;

export function setDbPersistHook(fn: DbPersistFn): void {
  _dbPersist = fn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core sync function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perform one synchronisation cycle:
 *   1. Fetch + validate rates from InforEuro
 *   2. Populate in-memory cache
 *   3. Persist to DB (if hook is registered)
 *   4. Return a structured SyncResult
 */
export async function syncInforEuroRates(): Promise<SyncResult> {
  const syncedAt = new Date().toISOString();
  logger.info('Starting InforEuro sync');

  const previousRates = getAllCachedRates();

  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_RETRIES) {
    attempt++;
    try {
      const { rates, refMonth, errors } = await fetchAndNormaliseRates(previousRates);

      if (rates.length === 0) {
        throw new Error('InforEuro returned 0 valid rates after validation');
      }

      // Populate in-memory cache
      populateCache(rates, refMonth);
      logger.info('Cache populated', { rateCount: rates.length, refMonth });

      // Persist to DB if hook is available
      let upserted = 0;
      let failed = 0;
      if (_dbPersist) {
        try {
          const result = await _dbPersist(rates);
          upserted = result.upserted;
          failed = result.failed;
          logger.info('Rates persisted to DB', { upserted, failed });
        } catch (dbErr) {
          const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
          logger.warn('DB persistence failed (cache still valid)', { error: msg });
          errors.push(`DB persistence error: ${msg}`);
        }
      }

      const result: SyncResult = {
        status: errors.length === 0 ? 'success' : 'partial',
        ratesUpserted: upserted,
        ratesFailed: failed,
        refMonth,
        syncedAt,
        errors,
      };

      logger.info('Sync complete', { status: result.status, ratesUpserted: upserted });
      return result;

    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Sync attempt ${attempt}/${MAX_RETRIES} failed`, { error: msg });

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.info(`Retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted - attempt graceful fallback
  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  logger.error('All sync attempts failed', { error: errMsg });

  if (_loadLatestDbRates) {
    try {
      logger.info('Attempting API fallback: loading latest rates from DB');
      const dbRates = await _loadLatestDbRates();
      if (dbRates.length > 0) {
        populateCacheFromRates(dbRates);
        logger.warn('API fallback successful', { rateCount: dbRates.length });
        return {
          status: 'skipped',
          ratesUpserted: 0,
          ratesFailed: 0,
          refMonth: getCacheRefMonth() ?? '',
          syncedAt,
          errors: [`API unavailable, using cached DB rates: ${errMsg}`],
        };
      }
    } catch (fallbackErr) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      logger.error('API fallback also failed', { error: msg });
    }
  }

  return {
    status: 'failed',
    ratesUpserted: 0,
    ratesFailed: 0,
    refMonth: getCacheRefMonth() ?? '',
    syncedAt,
    errors: [errMsg],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled engine
// ─────────────────────────────────────────────────────────────────────────────

let _syncTimer: ReturnType<typeof setInterval> | null = null;
let _engineStarted = false;

/**
 * Start the exchange rate engine.
 * - Performs an immediate sync if the cache is empty or stale
 * - Schedules a daily sync thereafter
 * - Safe to call multiple times (idempotent)
 */
export async function startExchangeRateEngine(): Promise<void> {
  if (_engineStarted) {
    logger.info('Engine already running — skipping duplicate start');
    return;
  }
  _engineStarted = true;

  logger.info('Exchange rate engine starting');

  // Immediate sync if cache is not valid
  if (!isCacheValid()) {
    const result = await syncInforEuroRates();
    if (result.status === 'failed') {
      logger.warn('Initial sync failed — will retry on next scheduled interval');
    }
  } else {
    logger.info('Cache is valid — skipping initial sync', { refMonth: getCacheRefMonth() });
  }

  // Schedule recurring daily sync
  _syncTimer = setInterval(async () => {
    logger.info('Scheduled sync triggered');
    await syncInforEuroRates();
  }, SYNC_INTERVAL_MS);

  // Prevent the timer from blocking process exit
  if (_syncTimer.unref) _syncTimer.unref();

  logger.info('Exchange rate engine started', { intervalMs: SYNC_INTERVAL_MS });
}

/**
 * Stop the scheduled engine (useful for graceful shutdown or tests).
 */
export function stopExchangeRateEngine(): void {
  if (_syncTimer) {
    clearInterval(_syncTimer);
    _syncTimer = null;
  }
  _engineStarted = false;
  logger.info('Exchange rate engine stopped');
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
