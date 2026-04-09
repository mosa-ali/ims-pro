// ============================================================================
// LOCAL TRANSLATIONS BRIDGE UTILITY
// ============================================================================
// Provides a type-safe bridge for components using the inline L = { en: {...}, ar: {...} }
// pattern. This utility reads the current language from LanguageContext and
// returns the correct language branch automatically.
//
// USAGE:
// const L = { en: { title: 'Hello' }, ar: { title: 'مرحبا' } };
// const t = useLocalTranslations(L);
// // t.title → 'Hello' or 'مرحبا' depending on current language
//
// MIGRATION PATH:
// When migrating to centralized translations, move keys from L into
// client/src/i18n/translations.ts under the appropriate namespace,
// then replace useLocalTranslations(L) with useTranslation().t.namespace
// ============================================================================

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Bridge hook for inline translation objects.
 * Automatically selects the correct language branch based on LanguageContext.
 *
 * @param translations - Object with `en` and `ar` keys containing translation strings
 * @returns The translation object for the current language
 */
export function useLocalTranslations<T extends Record<string, string>>(
 translations: { en: T; ar: T }
): T {
 const { language } = useLanguage();
 return language === 'ar' ? translations.ar : translations.en;
}

/**
 * Non-hook version for use in utility functions that receive language as a parameter.
 * Use this in non-React contexts (helper functions, formatters, etc.)
 *
 * @param translations - Object with `en` and `ar` keys
 * @param language - Current language code ('en' | 'ar')
 * @returns The translation object for the specified language
 */
export function getLocalTranslations<T extends Record<string, string>>(
 translations: { en: T; ar: T },
 language: string
): T {
 return language === 'ar' ? translations.ar : translations.en;
}
