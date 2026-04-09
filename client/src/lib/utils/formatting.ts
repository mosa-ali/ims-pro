/**
 * Format a number with locale-specific formatting
 * @param value - Number to format
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
 return value.toLocaleString(locale, {
 minimumFractionDigits: 0,
 maximumFractionDigits: 2,
 });
}

/**
 * Format currency with symbol
 * @param value - Amount to format
 * @param currency - Currency code (USD, EUR, etc.)
 * @param locale - Locale string
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency: string = 'USD', locale: string = 'en-US'): string {
 return new Intl.NumberFormat(locale, {
 style: 'currency',
 currency: currency,
 }).format(value);
}

/**
 * Format date to locale string
 * @param date - Date to format
 * @param locale - Locale string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, locale: string = 'en-US'): string {
 const dateObj = typeof date === 'string' ? new Date(date) : date;
 return dateObj.toLocaleDateString(locale);
}
