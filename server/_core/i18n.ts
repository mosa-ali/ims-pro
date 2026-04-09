/**
 * Server-side i18next initialization for PDF generation
 * Uses the same translation resources as the client-side i18n system
 */

import i18next from 'i18next';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let isInitialized = false;

/**
 * Initialize i18next on the server with existing translation resources
 */
export async function initServerI18n() {
  if (isInitialized) return;

  // Load translation files from client/src/locales
  const localesPath = join(process.cwd(), 'client', 'src', 'locales');
  
  const enTranslations = JSON.parse(
    readFileSync(join(localesPath, 'en.json'), 'utf-8')
  );
  
  const arTranslations = JSON.parse(
    readFileSync(join(localesPath, 'ar.json'), 'utf-8')
  );

  await i18next.init({
    lng: 'en', // default language
    fallbackLng: 'en',
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
    },
  });

  isInitialized = true;
}

/**
 * Get translation function for a specific language
 * @param language - 'en' or 'ar'
 * @returns Translation function
 */
export async function getTranslationFunction(language: 'en' | 'ar') {
  await initServerI18n();
  
  // Create a new i18next instance for this language
  const t = i18next.getFixedT(language);
  
  return t;
}

/**
 * Get user language from context or fallback to English
 * Priority: user.languagePreference → org.defaultLanguage → 'en'
 */
export function getUserLanguage(user: any, org: any): 'en' | 'ar' {
  // Check user language preference (from database field: languagePreference)
  if (user?.languagePreference === 'ar') return 'ar';
  if (user?.languagePreference === 'en') return 'en';
  
  // Check organization default language
  if (org?.defaultLanguage === 'ar') return 'ar';
  if (org?.defaultLanguage === 'en') return 'en';
  
  // Fallback to English
  return 'en';
}
