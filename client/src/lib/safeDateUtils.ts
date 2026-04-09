/**
 * Safe date utilities to handle toISOString calls on various date types
 * including MySQL date-like objects that may not have toISOString method
 */

/**
 * Safely convert any date-like value to ISO string
 * Handles Date objects, MySQL date objects, strings, and timestamps
 */
export function toISOString(value: any): string {
 // Already a string - return as is
 if (typeof value === 'string') {
 return value;
 }
 
 // Null or undefined
 if (value === null || value === undefined) {
 return new Date().toISOString();
 }
 
 // Number (timestamp)
 if (typeof value === 'number') {
 return new Date(value).toISOString();
 }
 
 // Date object with toISOString method
 if (value instanceof Date && typeof value.toISOString === 'function') {
 return value.toISOString();
 }
 
 // Object with toISOString method (but not Date instance - MySQL date-like objects)
 if (typeof value === 'object' && 'toISOString' in value && typeof value.toISOString === 'function') {
 try {
 return value.toISOString();
 } catch (e) {
 console.warn('[safeDateUtils] toISOString failed on object:', e);
 }
 }
 
 // Try to convert to Date first
 try {
 const date = new Date(value);
 if (!isNaN(date.getTime())) {
 return date.toISOString();
 }
 } catch (e) {
 console.warn('[safeDateUtils] Failed to convert value to Date:', e);
 }
 
 // Fallback: return current timestamp
 console.warn('[safeDateUtils] Could not convert value to ISO string, using current timestamp:', value);
 return new Date().toISOString();
}

/**
 * Get current timestamp as ISO string
 */
export function now(): string {
 return new Date().toISOString();
}

/**
 * Convert ISO string or Date to YYYY-MM-DD format
 */
export function toDateString(value: any): string {
 const iso = toISOString(value);
 return iso.split('T')[0];
}

/**
 * Safe date for form inputs (YYYY-MM-DD)
 */
export function toInputDate(value: any): string {
 return toDateString(value);
}
