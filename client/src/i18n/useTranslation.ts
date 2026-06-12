// ============================================================================
// TRANSLATION HOOK
// Centralized hook for accessing translations based on current language
// ============================================================================

import { useLanguage } from '@/contexts/LanguageContext';
import {
  translations,
  Language,
  Translations,
} from "./translations";

export interface TranslationContext {
  t: Translations;
  language: Language;
  setLanguage?: (lang: Language) => void;
  isRTL: boolean;
  dir: "ltr" | "rtl";
}

/**
 * Main translation hook
 *
 * Usage:
 *
 * const { t } = useTranslation();
 *
 * t.common.loading
 * t.finance.title
 * t.logistics.stockItems
 */
export function useTranslation(): TranslationContext {
  const {
    language,
    setLanguage,
    isRTL,
    direction,
  } = useLanguage();

  const t =
    translations[language as Language] ??
    translations.en;

  return {
    t,
    language: language as Language,
    setLanguage,
    isRTL,
    dir: direction,
  };
}

/**
 * Optional helper hook
 * Same data as useTranslation()
 */
export function useTranslationTools() {
  return useTranslation();
}