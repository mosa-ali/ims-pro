/**
 * shared/currency/currencyFormatter.ts
 *
 * Centralised currency formatting utility.
 * All formatting logic lives here — no other file should format currency values.
 *
 * Supported locales:
 *   en-US  (default)
 *   en-GB
 *   ar-YE  (Arabic / RTL)
 *   fr-FR
 *
 * Re-exports CurrencyCode so consumers only need one import.
 */

import { CURRENCY_MAP, CURRENCY_REGISTRY, getCurrencyMeta, isCurrencyCode, ALL_CURRENCY_CODES } from './currencies';
import type { CurrencyCode, CurrencyMeta } from './currencies';

export type { CurrencyCode };

// ─────────────────────────────────────────────────────────────────────────────
// Supported locales
// ─────────────────────────────────────────────────────────────────────────────

export type SupportedLocale = 'en-US' | 'en-GB' | 'ar-YE' | 'fr-FR';

const DEFAULT_LOCALE: SupportedLocale = 'en-US';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function getMeta(currency: string): CurrencyMeta {
  const meta = CURRENCY_MAP.get(currency);
  if (!meta) {
    // Graceful fallback for unknown codes
    return { code: currency, name: currency, nameAr: currency, symbol: currency, position: 'before', decimals: 2 };
  }
  return meta;
}

function parseAmount(amount: number | string | null | undefined): number | null {
  if (amount === null || amount === undefined) return null;
  const n = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
  return isNaN(n) ? null : n;
}

function buildIntlOptions(
  meta: CurrencyMeta,
  overrideDecimals?: number
): Intl.NumberFormatOptions {
  const decimals = overrideDecimals ?? meta.decimals;
  return {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. formatCurrency
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a monetary amount with symbol, grouping separators, and correct decimals.
 *
 * @example
 *   formatCurrency(1234567.89, 'USD')           // "$1,234,567.89"
 *   formatCurrency(1234567.89, 'YER')           // "1,234,568 ﷼"
 *   formatCurrency(1234567.89, 'EUR', 'fr-FR')  // "1 234 567,89 €"
 *   formatCurrency(1234567.89, 'SAR', 'ar-YE')  // "1,234,567.89 ر.س"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'USD',
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const n = parseAmount(amount);
  if (n === null) return '—';

  const meta = getMeta(currency);
  const formatted = new Intl.NumberFormat(locale, buildIntlOptions(meta)).format(n);

  return meta.position === 'before'
    ? `${meta.symbol}${formatted}`
    : `${formatted} ${meta.symbol}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. formatCompactCurrency
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compact notation for large numbers (K / M / B).
 *
 * @example
 *   formatCompactCurrency(1500000, 'USD')  // "$1.5M"
 *   formatCompactCurrency(750000, 'EUR')   // "€750K"
 */
export function formatCompactCurrency(
  amount: number | string | null | undefined,
  currency: string = 'USD',
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const n = parseAmount(amount);
  if (n === null) return '—';

  const meta = getMeta(currency);
  const formatted = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);

  return meta.position === 'before'
    ? `${meta.symbol}${formatted}`
    : `${formatted} ${meta.symbol}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. formatAccountingCurrency
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accounting notation: negative values wrapped in parentheses.
 * Used in financial statements and donor reports.
 *
 * @example
 *   formatAccountingCurrency(-5000, 'USD')   // "($5,000.00)"
 *   formatAccountingCurrency(5000, 'USD')    // "$5,000.00"
 */
export function formatAccountingCurrency(
  amount: number | string | null | undefined,
  currency: string = 'USD',
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const n = parseAmount(amount);
  if (n === null) return '—';

  const abs = Math.abs(n);
  const formatted = formatCurrency(abs, currency, locale);
  return n < 0 ? `(${formatted})` : formatted;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. parseCurrency
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a formatted currency string back to a number.
 * Strips symbols, commas, and whitespace.
 *
 * @example
 *   parseCurrency('$1,234.56')    // 1234.56
 *   parseCurrency('1,234 ر.س')   // 1234
 *   parseCurrency('(5,000.00)')   // -5000
 */
export function parseCurrency(value: string): number {
  if (!value || typeof value !== 'string') return 0;

  // Detect accounting negative (parentheses)
  const isNegative = value.trim().startsWith('(') && value.trim().endsWith(')');

  // Remove all non-numeric characters except decimal separators
  const cleaned = value
    .replace(/[()]/g, '')          // remove accounting parens
    .replace(/[^\d.,\-]/g, '')     // keep digits, dot, comma, minus
    .replace(/,(?=\d{3}(?:[.,]|$))/g, '') // remove thousand-separator commas
    .replace(',', '.');            // normalise decimal comma → dot

  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return isNegative ? -Math.abs(n) : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. formatCurrencyInput
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a value for use inside an <input> field — no symbol, just the number.
 * Respects decimal places for the given currency.
 *
 * @example
 *   formatCurrencyInput(1234.5, 'USD')  // "1,234.50"
 *   formatCurrencyInput(1234.5, 'JPY')  // "1,235"
 */
export function formatCurrencyInput(
  amount: number | string | null | undefined,
  currency: string = 'USD',
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const n = parseAmount(amount);
  if (n === null) return '';

  const meta = getMeta(currency);
  return new Intl.NumberFormat(locale, buildIntlOptions(meta)).format(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. getCurrencySymbol
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the display symbol for a currency code.
 *
 * @example
 *   getCurrencySymbol('USD')  // "$"
 *   getCurrencySymbol('YER')  // "﷼"
 *   getCurrencySymbol('SAR')  // "ر.س"
 */
export function getCurrencySymbol(currency: string = 'USD'): string {
  return getMeta(currency).symbol;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. getCurrencyName
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the English name for a currency code.
 *
 * @example
 *   getCurrencyName('USD')  // "US Dollar"
 *   getCurrencyName('YER')  // "Yemeni Rial"
 */
export function getCurrencyName(currency: string = 'USD'): string {
  return getMeta(currency).name;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. getCurrencyNameAr
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the Arabic name for a currency code.
 *
 * @example
 *   getCurrencyNameAr('USD')  // "دولار أمريكي"
 *   getCurrencyNameAr('YER')  // "ريال يمني"
 */
export function getCurrencyNameAr(currency: string = 'USD'): string {
  return getMeta(currency).nameAr;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. getCurrencyConfig
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the full CurrencyMeta configuration for a code.
 * Useful when you need symbol + position + decimals together.
 *
 * @example
 *   getCurrencyConfig('KWD')
 *   // { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي',
 *   //   symbol: 'د.ك', position: 'after', decimals: 3 }
 */
export function getCurrencyConfig(currency: string = 'USD'): CurrencyMeta {
  return getMeta(currency);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bonus helpers (backward-compatible with old currencyFormatter.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a currency value for table display.
 * Handles both numeric values and "USD X,XXX" legacy string format.
 */
export function formatCurrencyForTable(
  value: number | string | null | undefined,
  currency: string = 'USD',
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'string') {
    // Strip leading currency code prefix, e.g. "USD 1,234" → 1234
    const stripped = value.replace(/^[A-Z]{3}\s*/, '').trim();
    const n = parseFloat(stripped.replace(/,/g, ''));
    if (!isNaN(n)) return formatCurrency(n, currency, locale);
  }

  return formatCurrency(value, currency, locale);
}

/**
 * Replace all "USD " prefixes with "$" in a string.
 * Backward-compatible helper for legacy formatted strings.
 */
export function replaceUSDWithDollar(text: string): string {
  return text.replace(/USD\s*/g, '$');
}

/**
 * Return all supported currency codes.
 * Backward-compatible with old getAllCurrencyCodes().
 */
export function getAllCurrencyCodes(): CurrencyCode[] {
  return ALL_CURRENCY_CODES as CurrencyCode[];
}
