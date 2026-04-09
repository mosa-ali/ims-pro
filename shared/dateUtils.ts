/**
 * Safely converts a date value to an ISO string
 * Handles Date objects, ISO strings, and other date formats
 * 
 * @param value - The value to convert (Date object, string, or unknown)
 * @returns ISO 8601 date string (YYYY-MM-DDTHH:mm:ss.sssZ)
 * @throws Error if value is not a valid date
 */
export function ensureISOString(value: unknown): string {
  // If it's already a Date object, convert it
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // If it's a string, validate and convert it
  if (typeof value === 'string') {
    // Try to parse the string as a date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    // If parsing fails, throw error
    throw new Error(`Invalid date string: ${value}`);
  }
  
  // If it's null or undefined, throw error
  if (value === null || value === undefined) {
    throw new Error(`Invalid date value: ${value}`);
  }
  
  // If it's an object with toISOString method (MySQL date-like objects), try to call it
  // Wrap in try-catch to handle cases where toISOString is a getter that throws
  if (typeof value === 'object' && 'toISOString' in value) {
    try {
      const toISO = (value as any).toISOString;
      if (typeof toISO === 'function') {
        return toISO.call(value);
      }
    } catch (e) {
      // If accessing or calling toISOString fails, try to convert to Date first
      try {
        const date = new Date(value as any);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (dateError) {
        throw new Error(`Failed to convert date-like object to ISO string: ${e}`);
      }
    }
  }
  
  throw new Error(`Invalid date value type: ${typeof value}`);
}

/**
 * Recursively serialize all Date objects in an object/array to ISO strings
 * Uses ensureISOString to safely handle mixed date types
 * 
 * @param obj - The object or array to serialize
 * @returns Serialized copy with all dates as ISO strings
 */
export function serializeAllDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return ensureISOString(obj);
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeAllDates(item));
  }
  
  // Handle MySQL date-like objects with toISOString method BEFORE plain object check
  // This ensures MySQL Date objects are converted before we try to recursively serialize them
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    // Use try-catch to safely check for toISOString method
    try {
      // Check if the object has toISOString property and it's a function
      // CRITICAL: Only use 'in' operator on objects, never on strings
      if (typeof obj === 'object' && obj !== null && 'toISOString' in obj) {
        const toISO = (obj as any).toISOString;
        console.log('[serializeAllDates] Checking object:', {
          type: typeof obj,
          constructor: obj.constructor?.name,
          hasToISOString: true,
          toISOType: typeof toISO,
          keys: Object.keys(obj).slice(0, 5) // Only log first 5 keys to avoid clutter
        });
        
        if (typeof toISO === 'function') {
          console.log('[serializeAllDates] Calling toISOString on object');
          const result = toISO.call(obj);
          console.log('[serializeAllDates] toISOString result:', result);
          return result;
        } else {
          console.warn('[serializeAllDates] toISOString exists but is not a function:', typeof toISO);
        }
      }
    } catch (e) {
      // If checking/calling toISOString fails, log warning and fall through to plain object handling
      console.warn('[serializeAllDates] Error while checking/calling toISOString:', e);
    }
  }
  
  // Handle plain objects and other object types (after checking for date-like objects)
  // Removed obj.constructor === Object check to handle MySQL custom objects
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        try {
          serialized[key] = serializeAllDates(obj[key]);
        } catch (e) {
          console.error(`[serializeAllDates] Error serializing key "${key}":`, e, 'Value:', obj[key]);
          throw e;
        }
      }
    }
    return serialized;
  }
  
  return obj;
}

/**
 * Format a date value for HTML5 date input (YYYY-MM-DD)
 * 
 * @param value - Date object, ISO string, or date string
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(value: unknown): string {
  if (!value) return '';
  
  try {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    if (typeof value === 'string') {
      // If already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      // If ISO format, extract date part
      if (value.includes('T')) {
        return value.split('T')[0];
      }
      // Try to parse and format
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return '';
  } catch (e) {
    console.error('Failed to format date for input:', e);
    return '';
  }
}
