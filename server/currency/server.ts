/**
 * server/currency/server.ts  ← MUST live in server/currency/, NOT shared/currency/
 *
 * BACKEND-ONLY barrel export for the currency engine.
 *
 * File placement summary:
 *   server/currency/
 *     server.ts                ← this file
 *     exchangeRateService.ts   ← DB persistence (imports ../db)
 *     currencyConversionOrg.ts ← org-scoped conversion (imports ../db via service)
 *
 *   shared/currency/
 *     index.ts                 ← frontend-safe barrel
 *     currencies.ts
 *     currencyFormatter.ts
 *     exchangeRateTypes.ts
 *     exchangeRateCache.ts
 *     exchangeRateEngine.ts
 *     exchangeRateProvider.ts
 *     currencyConversion.ts
 *
 * Usage:
 *   // Backend only — in server entry point (server/_core/index.ts)
 *   import { bootstrapExchangeRateService } from './currency/server';
 *   bootstrapExchangeRateService();
 *
 *   // Frontend-safe utilities — in React components or shared code
 *   import { formatCurrency, convertCurrency } from '@/shared/currency';
 */

// ─────────────────────────────────────────────────────────────────────────────
// Engine control (server-side only — lives in shared/currency/)
// ─────────────────────────────────────────────────────────────────────────────

export {
  syncInforEuroRates,
  startExchangeRateEngine,
  stopExchangeRateEngine,
  setDbPersistHook,
} from '../../shared/currency/exchangeRateEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Provider (server-side only — calls fetch(), lives in shared/currency/)
// ─────────────────────────────────────────────────────────────────────────────

export {
  fetchInforEuroRates,
  fetchAndNormaliseRates,
  validateRate,
  normaliseRow,
} from '../../shared/currency/exchangeRateProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Cache population from DB (server-side, lives in shared/currency/)
// ─────────────────────────────────────────────────────────────────────────────

export {
  populateCacheFromRates,
  clearCache,
} from '../../shared/currency/exchangeRateCache';

// ─────────────────────────────────────────────────────────────────────────────
// DB service (server-side only — lives in server/currency/)
// ─────────────────────────────────────────────────────────────────────────────

export {
  bootstrapExchangeRateService,
  loadLatestSystemRates,
  upsertExchangeRate,
  upsertExchangeRates,
  getHistoricalRate,
  getAllRatesForDate,
} from './exchangeRateService';

// ─────────────────────────────────────────────────────────────────────────────
// Organization-scoped conversion (server-side only — lives in server/currency/)
// ─────────────────────────────────────────────────────────────────────────────

export type { ConversionAuditContext } from './currencyConversionOrg';
export {
  convertCurrencyForOrg,
  convertCurrencyBatchForOrg,
} from './currencyConversionOrg';
