/**
 * Enhanced i18n initialization with custom language detection
 * Implements priority order: User Preference → Org Default → Browser/OS Language
 */

import i18n from './i18n';
import { determineLanguage, detectBrowserLanguage } from './languageDetection';

/**
 * Initialize i18n with user and organization language preferences
 * @param userLanguagePreference - User's saved language preference from database
 * @param orgDefaultLanguage - Organization's default language from database
 */
export async function initializeLanguage(
  userLanguagePreference?: string | null,
  orgDefaultLanguage?: string | null
): Promise<void> {
  // Determine the language based on priority order
  const language = determineLanguage(userLanguagePreference, orgDefaultLanguage);
  
  // Change i18n language
  await i18n.changeLanguage(language);
  
  // Set document direction for RTL support
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}

/**
 * Initialize language on app startup
 * Priority: localStorage (from LanguageSwitcher) → Browser Detection
 * This ensures language persists across page navigations
 */
export async function initializeLanguageOnStartup(): Promise<void> {
  // Check localStorage first (set by LanguageSwitcher)
  const storedLang = localStorage.getItem('user_language_preference');
  const language = (storedLang === 'en' || storedLang === 'ar') ? storedLang : detectBrowserLanguage();
  
  await i18n.changeLanguage(language);
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}
