/**
 * Response Serializer: Normalize all MySQL DATETIME strings to ISO format
 * 
 * This ensures all dates leaving the API are in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * instead of MySQL format (YYYY-MM-DD HH:mm:ss), preventing 'in' operator errors on the client.
 */

// Regex to detect MySQL DATETIME format: YYYY-MM-DD HH:mm:ss or YYYY-MM-DD HH:mm:ss.sss
const MYSQL_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(\.\d{3})?$/;

/**
 * Recursively normalize all date strings in an object/array to ISO format
 */
export function normalizeResponseDates(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => normalizeResponseDates(item));
  }

  // Handle objects
  if (typeof value === 'object') {
    const normalized: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const val = value[key];
        
        // If it's a string that looks like MySQL DATETIME, convert to ISO
        if (typeof val === 'string' && MYSQL_DATETIME_REGEX.test(val)) {
          try {
            const date = new Date(val.replace(' ', 'T'));
            if (!isNaN(date.getTime())) {
              normalized[key] = date.toISOString();
            } else {
              normalized[key] = val;
            }
          } catch (e) {
            normalized[key] = val;
          }
        } else if (typeof val === 'object') {
          // Recursively normalize nested objects/arrays
          normalized[key] = normalizeResponseDates(val);
        } else {
          normalized[key] = val;
        }
      }
    }
    return normalized;
  }

  // Return primitive values as-is
  return value;
}

console.log('[Response Serializer] Initialized - will normalize MySQL DATETIME strings to ISO format');
