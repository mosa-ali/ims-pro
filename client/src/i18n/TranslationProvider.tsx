// ============================================================================
// TRANSLATION PROVIDER
// Phase 1: Language Model Upgrade
// Provides translation context and language switching capabilities
// ============================================================================

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, Translations } from './translations-trilingual';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  changeLanguage: (lang: Language) => void;
  availableLanguages: Language[];
  isLoading: boolean;
  t: Translations;
  isRTL: boolean;
}

export const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const TRANSLATION_STORAGE_KEY = 'app_language';
const AVAILABLE_LANGUAGES: Language[] = ['en', 'ar', 'it'];
const DEFAULT_LANGUAGE: Language = 'en';

interface TranslationProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
  storageKey?: string;
}

/**
 * Translation Provider Component
 * Wraps application with translation context and persists language preference
 */
export function TranslationProvider({
  children,
  defaultLanguage = DEFAULT_LANGUAGE,
  storageKey = TRANSLATION_STORAGE_KEY,
}: TranslationProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language from localStorage on mount
  useEffect(() => {
    const storedLanguage = localStorage.getItem(storageKey) as Language | null;

    if (storedLanguage && AVAILABLE_LANGUAGES.includes(storedLanguage)) {
      setLanguageState(storedLanguage);
    } else {
      // Try to detect browser language
      const browserLang = detectBrowserLanguage();
      if (browserLang) {
        setLanguageState(browserLang);
      }
    }

    setIsLoading(false);
  }, [storageKey]);

  // Update language and persist to localStorage
  const setLanguage = (lang: Language) => {
    if (AVAILABLE_LANGUAGES.includes(lang)) {
      setLanguageState(lang);
      localStorage.setItem(storageKey, lang);

      // Update document attributes for RTL/LTR
      updateDocumentLanguage(lang);
    }
  };

  // Alias for backward compatibility
  const changeLanguage = setLanguage;

  const value: TranslationContextType = {
    language,
    setLanguage,
    changeLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
    isLoading,
    t: translations[language],
    isRTL: language === 'ar',
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

/**
 * Hook to access translation context
 */
export function useTranslationContext() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslationContext must be used within TranslationProvider');
  }
  return context;
}

/**
 * Hook to access translations for the current language
 * Returns the Translations object for the active language
 */
export function useTranslation() {
  const { t } = useTranslationContext();
  return t;
}

/**
 * Detect browser language
 */
function detectBrowserLanguage(): Language | null {
  if (typeof window === 'undefined') return null;

  const browserLang = navigator.language.split('-')[0].toLowerCase();

  // Map browser language codes to our supported languages
  const languageMap: Record<string, Language> = {
    en: 'en',
    ar: 'ar',
    it: 'it',
  };

  return languageMap[browserLang] || null;
}

/**
 * Update document attributes for language and RTL/LTR
 */
function updateDocumentLanguage(language: Language): void {
  if (typeof document === 'undefined') return;

  const htmlElement = document.documentElement;

  // Set language attribute
  htmlElement.lang = language;

  // Set direction (RTL for Arabic, LTR for others)
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  htmlElement.dir = direction;

  // Update body classes
  htmlElement.classList.remove('rtl', 'ltr');
  htmlElement.classList.add(direction);

  // Update body language class
  htmlElement.classList.remove('lang-en', 'lang-ar', 'lang-it');
  htmlElement.classList.add(`lang-${language}`);
}

/**
 * Language selector hook for UI components
 * Returns all available languages with labels
 */
export function useLanguageSelector() {
  const { language, setLanguage, availableLanguages } = useTranslationContext();

  const languages = [
    { code: 'en' as Language, label: 'English', nativeLabel: 'English' },
    { code: 'ar' as Language, label: 'Arabic', nativeLabel: 'العربية' },
    { code: 'it' as Language, label: 'Italian', nativeLabel: 'Italiano' },
  ].filter((lang) => availableLanguages.includes(lang.code));

  return {
    currentLanguage: language,
    languages,
    changeLanguage: setLanguage,
    isCurrentLanguage: (code: Language) => code === language,
  };
}
