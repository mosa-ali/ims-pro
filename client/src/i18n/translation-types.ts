// ============================================================================
// TYPE-SAFE TRANSLATION KEYS
// Provides compile-time validation of translation paths
// ============================================================================

import { Translations } from './translations-trilingual';


/**
 * Type-safe translation key paths
 * Ensures keyPath like t('common.save') is validated at compile time
 */

// Extract all top-level keys from translations
type TopLevelKeys = keyof Translations;

// Helper type to build nested paths
type PathImpl<T, K extends string | number> = K extends string
  ? T extends Record<string, any>
    ? T[K] extends Record<string, any>
      ? T[K] extends (infer U)[]
        ? never
        : `${K}` | `${K}.${PathImpl<T[K], keyof T[K] & string>}`
      : `${K}`
    : never
  : never;

type Path<T> = PathImpl<T, keyof T & string> | keyof T & string;

/**
 * Strict translation function signature
 * Ensures only valid paths can be passed
 */
export type TranslationFunction = (keyPath: Path<Translations>) => string;

/**
 * Valid translation key examples
 */
export const VALID_TRANSLATION_KEYS = {
  // Common
  'common.save': true,
  'common.cancel': true,
  'common.delete': true,

  // Navigation
  'navigation.dashboard': true,
  'navigation.settings': true,

  // Finance
  'finance.budget': true,
  'finance.grants': true,

  // HR
  'hr.employees': true,
  'hr.payroll': true,
} as const;

export type ValidTranslationKey = keyof typeof VALID_TRANSLATION_KEYS;

/**
 * Runtime validation of translation keys
 */
export function isValidTranslationKey(key: string): boolean {
  return Object.keys(VALID_TRANSLATION_KEYS).includes(key);
}

/**
 * Validate translation key at runtime
 */
export function validateTranslationKey(key: string): { valid: boolean; error?: string } {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'Translation key must be a non-empty string' };
  }

  if (!key.includes('.')) {
    return { valid: false, error: 'Translation key must use dot notation (e.g., "common.save")' };
  }

  const parts = key.split('.');
  if (parts.some((part) => !part || /^\d+$/.test(part))) {
    return { valid: false, error: 'Invalid translation key format' };
  }

  return { valid: true };
}

/**
 * Type guard for translation keys
 */
export function assertValidTranslationKey(key: string): asserts key is ValidTranslationKey {
  const result = validateTranslationKey(key);
  if (!result.valid) {
    throw new Error(`Invalid translation key: ${key}. ${result.error}`);
  }
}
