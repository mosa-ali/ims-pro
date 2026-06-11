/**
 * ============================================================================
 * useTranslation Hook
 * Production Version
 * Uses the master translations.ts as the single source of truth
 * Supports: English (en), Arabic (ar), Italian (it)
 * ============================================================================
 */

import { useLanguage } from "@/contexts/LanguageContext";
import {
  translations,
  Language,
  Translations,
} from "@/i18n/translations";

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