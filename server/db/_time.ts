/**
 * _time.ts — Centralized UTC Timestamp Helpers
 *
 * Platform standard: application-controlled UTC timestamps.
 * NEVER use sql`NOW()` or sql`CURRENT_TIMESTAMP` in this codebase.
 *
 * Reasons:
 *  - Timezone-safe: MySQL server timezone is irrelevant
 *  - Deterministic: audit timestamps are set by the application, not the DB engine
 *  - Azure/App Service consistent: no drift from server timezone config
 *  - Multi-country ERP safe: all timestamps stored as UTC
 */

/**
 * Returns the current UTC datetime as a MySQL DATETIME string.
 * Format: "YYYY-MM-DD HH:MM:SS"
 *
 * Use for: createdAt, updatedAt, deletedAt, approvedAt, rejectedAt,
 *          lockedAt, completedAt, submittedAt, and all audit timestamps.
 *
 * @example updatedAt: nowSql()
 */
export function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Returns the current Unix timestamp in milliseconds.
 * Format: number (e.g. 1716480000000)
 *
 * Use for: bigint({ mode: 'number' }) columns ONLY.
 * NEVER use nowSql() on bigint columns.
 *
 * @example createdAt: nowUnix()   // for bigint({ mode: 'number' }) columns
 */
export function nowUnix(): number {
  return Date.now();
}

/**
 * Returns today's date as a MySQL DATE string.
 * Format: "YYYY-MM-DD"
 *
 * Use for: dueDate, startDate, endDate, reportDate, periodDate.
 *
 * @example dueDate: todaySqlDate()
 */
export function todaySqlDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns a future date N days from now as a MySQL DATE string.
 * Format: "YYYY-MM-DD"
 *
 * @param days - Number of days from today (can be negative for past dates)
 * @example expiresAt: daysFromNow(30)
 */
export function daysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Converts a JavaScript Date object to a MySQL DATETIME string.
 * Format: "YYYY-MM-DD HH:MM:SS"
 *
 * @param date - A JavaScript Date object
 * @example startDate: toSqlTimestamp(new Date(input.startDate))
 */
export function toSqlTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Converts a JavaScript Date object to a MySQL DATE string.
 * Format: "YYYY-MM-DD"
 *
 * @param date - A JavaScript Date object
 * @example reportDate: toSqlDate(new Date(input.reportDate))
 */
export function toSqlDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Returns the first day of the current UTC month as a MySQL DATE string.
 * Format: "YYYY-MM-DD"
 *
 * @example periodStart: startOfMonthSqlDate()
 */
export function startOfMonthSqlDate(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Returns the last day of the current UTC month as a MySQL DATE string.
 * Format: "YYYY-MM-DD"
 *
 * @example periodEnd: endOfMonthSqlDate()
 */
export function endOfMonthSqlDate(): string {
  const d = new Date();
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return lastDay.toISOString().split('T')[0];
}
