'use client';

import { useTranslationContext } from './TranslationProvider';
import { translations, Language } from './translations-trilingual';
import { ValidTranslationKey } from './translation-types';

/**
 * Get value from nested object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Main useTranslation hook - unified single implementation
 * Provides type-safe translation access with fallback system
 */
export function useTranslation() {
  const { language } = useTranslationContext();
  const currentTranslations = translations[language] || translations.en;

  /**
   * Translate function with fallback system
   * Type-safe: only accepts valid translation paths
   * Priority: Current language → English → Key path
   */
  function t<T extends ValidTranslationKey>(keyPath: T): string {
    // Priority 1: Try current language
    let value = getNestedValue(currentTranslations, keyPath);

    if (value && typeof value === 'string' && value.trim()) {
      return value;
    }

    // Priority 2: Fallback to English
    if (language !== 'en') {
      const englishValue = getNestedValue(translations.en, keyPath);
      if (englishValue && typeof englishValue === 'string' && englishValue.trim()) {
        console.warn(`[i18n] Missing translation for "${keyPath}" in ${language}, falling back to English`);
        return englishValue;
      }
    }

    // Priority 3: Return key path (prevents undefined)
    console.warn(`[i18n] No translation found for key: "${keyPath}"`);
    return keyPath;
  }

  /**
   * Translate function for runtime string keys (less type-safe but supported)
   * Use only when key path is truly dynamic
   */
  function tAny(keyPath: string): string {
    let value = getNestedValue(currentTranslations, keyPath);

    if (value && typeof value === 'string' && value.trim()) {
      return value;
    }

    if (language !== 'en') {
      const englishValue = getNestedValue(translations.en, keyPath);
      if (englishValue && typeof englishValue === 'string' && englishValue.trim()) {
        console.warn(`[i18n] Missing translation for "${keyPath}" in ${language}, falling back to English`);
        return englishValue;
      }
    }

    console.warn(`[i18n] No translation found for key: "${keyPath}"`);
    return keyPath;
  }

  /**
   * Get entire translation object for a section
   */
  function tSection(sectionKey: string): Record<string, any> {
    const section = getNestedValue(currentTranslations, sectionKey);

    if (section && typeof section === 'object') {
      return section;
    }

    // Fallback to English
    if (language !== 'en') {
      const englishSection = getNestedValue(translations.en, sectionKey);
      if (englishSection && typeof englishSection === 'object') {
        return englishSection;
      }
    }

    return {};
  }

  /**
   * Get all translations for current language
   */
  function tAll() {
    return currentTranslations;
  }

  /**
   * Check if translation key exists
   */
  function has(keyPath: string): boolean {
    return getNestedValue(currentTranslations, keyPath) !== undefined;
  }

  /**
   * Get translation with default value if not found
   */
  function tDefault(keyPath: string, defaultValue: string): string {
    const value = tAny(keyPath);
    return value === keyPath ? defaultValue : value;
  }

  /**
   * Interpolate variables in translation
   * Usage: tInterpolate('greeting', { name: 'Ahmed' })
   */
  function tInterpolate(keyPath: string, variables: Record<string, any>): string {
    let value = tAny(keyPath);

    Object.entries(variables).forEach(([key, val]) => {
      value = value.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    });

    return value;
  }

  return {
    // Core functions - t() enforces type-safe paths
    t,
    tAny, // For truly dynamic keys only
    tSection,
    tAll,
    has,
    tDefault,
    tInterpolate,

    // Language info
    language,
    currentLanguage: language,
    isRTL: language === 'ar',
    isArabic: language === 'ar',
    isEnglish: language === 'en',
    isItalian: language === 'it',

    // Direct access to translation sections with fallback
    common: currentTranslations.common || translations.en.common,
    navigation: currentTranslations.navigation || translations.en.navigation,
    dashboard: currentTranslations.dashboard || translations.en.dashboard,
    finance: currentTranslations.finance || translations.en.finance,
  };
}

