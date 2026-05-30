/**
 * shared/currency/currencyConversion.ts
 *
 * All currency conversion logic.
 *
 * Architecture:
 *   - InforEuro provides EUR-based rates: 1 EUR = X <quoteCurrency>
 *   - Cross-rate conversion (A → B where neither is EUR):
 *       A → EUR → B  (triangulation via EUR)
 *   - Historical conversion: uses DB rates for a specific date
 *   - Batch conversion: converts an array of amounts in one call
 *   - Rounding: uses currency-specific decimal places from currencies.ts
 *
 * This file is pure logic — no DB calls.
 * For historical rates, inject the rate via the `rate` parameter or use
 * `convertHistorical()` which calls exchangeRateService.
 */

import { getCachedRate, getAllCachedRates } from './exchangeRateCache';
import { getCurrencyMeta } from './currencies';
import type { ConversionResult, ConversionError } from './exchangeRateTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Core conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an amount from one currency to another using the in-memory cache.
 *
 * Supports:
 *   - EUR → X  (direct rate)
 *   - X → EUR  (inverse rate)
 *   - X → Y    (triangulation: X → EUR → Y)
 *   - X → X    (identity, no-op)
 *
 * @returns ConversionResult with the converted amount and rate used,
 *          or ConversionError if rates are unavailable.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string
): ConversionResult | ConversionError {
  const FROM = from.trim().toUpperCase();
  const TO   = to.trim().toUpperCase();

  // Identity
  if (FROM === TO) {
    return { amount, rate: 1, from: FROM, to: TO, source: 'identity' };
  }

  // EUR → X
  if (FROM === 'EUR') {
    const toRate = getCachedRate(TO);
    if (!toRate) return { error: `No cached rate for ${TO}`, from: FROM, to: TO };
    const converted = roundToCurrency(amount * toRate.rate, TO);
    return { amount: converted, rate: toRate.rate, from: FROM, to: TO, source: 'cache' };
  }

  // X → EUR
  if (TO === 'EUR') {
    const fromRate = getCachedRate(FROM);
    if (!fromRate) return { error: `No cached rate for ${FROM}`, from: FROM, to: TO };
    const converted = roundToCurrency(amount / fromRate.rate, TO);
    return { amount: converted, rate: 1 / fromRate.rate, from: FROM, to: TO, source: 'cache' };
  }

  // X → Y (triangulation via EUR)
  const fromRate = getCachedRate(FROM);
  const toRate   = getCachedRate(TO);

  if (!fromRate) return { error: `No cached rate for ${FROM}`, from: FROM, to: TO };
  if (!toRate)   return { error: `No cached rate for ${TO}`, from: FROM, to: TO };

  // amount in FROM → EUR → TO
  const inEur    = amount / fromRate.rate;
  const inTo     = inEur * toRate.rate;
  const converted = roundToCurrency(inTo, TO);
  const crossRate = toRate.rate / fromRate.rate;

  return { amount: converted, rate: crossRate, from: FROM, to: TO, source: 'cache' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion with explicit rate (for historical use)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert using an explicitly provided EUR-based rate.
 * Used for historical conversions where the rate comes from the DB.
 *
 * @param amount   Amount in `from` currency
 * @param from     Source currency code
 * @param to       Target currency code
 * @param eurRates Map of quoteCurrency → EUR-based rate value
 */
export function convertWithRates(
  amount: number,
  from: string,
  to: string,
  eurRates: Map<string, number>
): ConversionResult | ConversionError {
  const FROM = from.trim().toUpperCase();
  const TO   = to.trim().toUpperCase();

  if (FROM === TO) {
    return { amount, rate: 1, from: FROM, to: TO, source: 'provided' };
  }

  if (FROM === 'EUR') {
    const toRate = eurRates.get(TO);
    if (!toRate) return { error: `No provided rate for ${TO}`, from: FROM, to: TO };
    return { amount: roundToCurrency(amount * toRate, TO), rate: toRate, from: FROM, to: TO, source: 'provided' };
  }

  if (TO === 'EUR') {
    const fromRate = eurRates.get(FROM);
    if (!fromRate) return { error: `No provided rate for ${FROM}`, from: FROM, to: TO };
    return { amount: roundToCurrency(amount / fromRate, TO), rate: 1 / fromRate, from: FROM, to: TO, source: 'provided' };
  }

  const fromRate = eurRates.get(FROM);
  const toRate   = eurRates.get(TO);
  if (!fromRate) return { error: `No provided rate for ${FROM}`, from: FROM, to: TO };
  if (!toRate)   return { error: `No provided rate for ${TO}`, from: FROM, to: TO };

  const inEur    = amount / fromRate;
  const inTo     = inEur * toRate;
  return {
    amount: roundToCurrency(inTo, TO),
    rate: toRate / fromRate,
    from: FROM,
    to: TO,
    source: 'provided',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch conversion
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchConversionInput {
  amount: number;
  from: string;
  id?: string | number; // optional identifier for tracing
}

export interface BatchConversionOutput {
  id?: string | number;
  from: string;
  to: string;
  original: number;
  converted: number | null;
  rate: number | null;
  error?: string;
}

/**
 * Convert multiple amounts to a single target currency.
 * Failed conversions are included in the output with `converted: null`.
 */
export function convertBatch(
  items: BatchConversionInput[],
  to: string
): BatchConversionOutput[] {
  return items.map((item) => {
    const result = convertCurrency(item.amount, item.from, to);
    if ('error' in result) {
      return {
        id: item.id,
        from: item.from,
        to,
        original: item.amount,
        converted: null,
        rate: null,
        error: result.error,
      };
    }
    return {
      id: item.id,
      from: item.from,
      to,
      original: item.amount,
      converted: result.amount,
      rate: result.rate,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Available currencies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all currency codes that currently have a cached rate.
 * Always includes EUR (the base currency).
 */
export function getAvailableCurrencies(): string[] {
  const codes = ['EUR'];
  for (const code of getAllCachedRates().keys()) {
    if (code !== 'EUR') codes.push(code);
  }
  return codes.sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// Rounding helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Round a number to the correct decimal places for the given currency.
 * Falls back to 2 decimal places for unknown currencies.
 */
function roundToCurrency(amount: number, currency: string): number {
  const meta = getCurrencyMeta(currency);
  const decimals = meta?.decimals ?? 2;
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}
