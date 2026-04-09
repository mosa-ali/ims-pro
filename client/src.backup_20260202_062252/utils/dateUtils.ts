/**
 * ============================================================================
 * DATE UTILITIES
 * Common date operations and helpers
 * ============================================================================
 */

/**
 * Get start of today
 */
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get date N days ago
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days from now
 */
export function getDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Get start of current month
 */
export function getStartOfMonth(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

/**
 * Get end of current month
 */
export function getEndOfMonth(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
}

/**
 * Get start of current year
 */
export function getStartOfYear(): string {
  const date = new Date();
  return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
}

/**
 * Get end of current year
 */
export function getEndOfYear(): string {
  const date = new Date();
  return new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
}

/**
 * Get start of current quarter
 */
export function getStartOfQuarter(): string {
  const date = new Date();
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
}

/**
 * Get end of current quarter
 */
export function getEndOfQuarter(): string {
  const date = new Date();
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), (quarter + 1) * 3, 0).toISOString().split('T')[0];
}

/**
 * Check if date is in the past
 */
export function isInPast(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Check if date is in the future
 */
export function isInFuture(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Check if date is today
 */
export function isToday(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
}

/**
 * Get number of days between two dates
 */
export function getDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get number of months between two dates
 */
export function getMonthsBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  
  return years * 12 + months;
}

/**
 * Add days to a date
 */
export function addDays(date: string | Date, days: number): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj.toISOString().split('T')[0];
}

/**
 * Add months to a date
 */
export function addMonths(date: string | Date, months: number): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  dateObj.setMonth(dateObj.getMonth() + months);
  return dateObj.toISOString().split('T')[0];
}

/**
 * Add years to a date
 */
export function addYears(date: string | Date, years: number): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  dateObj.setFullYear(dateObj.getFullYear() + years);
  return dateObj.toISOString().split('T')[0];
}

/**
 * Get quarter from date
 */
export function getQuarter(date: string | Date): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return Math.floor(dateObj.getMonth() / 3) + 1;
}

/**
 * Get week number of the year
 */
export function getWeekNumber(date: string | Date): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
  const pastDaysOfYear = (dateObj.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Check if date is within range
 */
export function isDateInRange(
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  return dateObj >= start && dateObj <= end;
}

/**
 * Get fiscal year (assumes April 1 start)
 */
export function getFiscalYear(date: string | Date = new Date()): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  
  // If before April (month 3), fiscal year is previous year
  if (month < 3) {
    return `${year - 1}-${year}`;
  }
  
  return `${year}-${year + 1}`;
}

/**
 * Get array of months between two dates
 */
export function getMonthRange(startDate: string | Date, endDate: string | Date): string[] {
  const months: string[] = [];
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);
  
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    months.push(current.toISOString().substring(0, 7)); // YYYY-MM
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

/**
 * Format date for input[type="date"]
 */
export function toInputDate(date: string | Date | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

/**
 * Parse date from various formats
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null;
  
  // Try ISO format first
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) return date;
  
  // Try DD/MM/YYYY
  const parts = dateString.split('/');
  if (parts.length === 3) {
    date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try MM/DD/YYYY
  if (parts.length === 3) {
    date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Get business days between two dates (excludes weekends)
 */
export function getBusinessDays(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
