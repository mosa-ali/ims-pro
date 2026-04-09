/**
 * Safe JSON stringify utility for MySQL date-like objects
 * 
 * Previously this file monkey-patched JSON.stringify globally, which conflicted
 * with superjson's serialization in tRPC (causing broken reference identity).
 *
 * Now it exports a safe stringify function for explicit opt-in use only.
 * tRPC already uses superjson for Date serialization, so the global
 * patch is no longer needed.
 */

/**
 * Safe JSON replacer that handles MySQL date-like objects.
 * Use with JSON.stringify(value, safeDateReplacer) when serializing
 * data that may contain MySQL date objects with non-function toISOString.
 */
export function safeDateReplacer(key: string, val: unknown): unknown {
  if (val && typeof val === 'object' && 'toISOString' in val) {
    try {
      if (typeof (val as any).toISOString !== 'function') {
        const date = new Date(val as any);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
        return String(val);
      }
    } catch {
      try {
        const date = new Date(val as any);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        return String(val);
      }
    }
  }
  return val;
}

/**
 * Safe JSON.stringify wrapper that handles MySQL date-like objects.
 * Use this instead of JSON.stringify when dealing with raw MySQL query results.
 */
export function safeStringify(value: unknown, space?: string | number): string {
  return JSON.stringify(value, safeDateReplacer, space);
}

// No-op: global JSON.stringify patch removed to prevent superjson conflicts
