/**
 * Language Detection Utility
 * Implements priority order: User Preference → Org Default → Browser/OS Language
 */

/**
 * Detect browser/OS language preference
 * Returns 'en' or 'ar' based on browser settings
 */
export function detectBrowserLanguage(): 'en' | 'ar' {
  // Check navigator.language and navigator.languages
  const browserLang = navigator.language || (navigator.languages && navigator.languages[0]);
  
  if (!browserLang) return 'en';
  
  // Extract language code (e.g., 'ar-SA' → 'ar', 'en-US' → 'en')
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  // Return 'ar' if Arabic, otherwise default to 'en'
  return langCode === 'ar' ? 'ar' : 'en';
}

/**
 * Determine the language to use based on priority order
 * @param userPreference - User's saved language preference (from database)
 * @param orgDefault - Organization's default language (from database)
 * @returns The language code to use ('en' or 'ar')
 */
export function determineLanguage(
  userPreference?: string | null,
  orgDefault?: string | null
): 'en' | 'ar' {
  // Priority 1: User Preference
  if (userPreference === 'en' || userPreference === 'ar') {
    return userPreference;
  }
  
  // Priority 2: Organization Default
  if (orgDefault === 'en' || orgDefault === 'ar') {
    return orgDefault;
  }
  
  // Priority 3: Browser/OS Language
  return detectBrowserLanguage();
}

/**
 * Save user language preference to localStorage
 * This is used as a temporary cache before saving to database
 */
export function saveLanguagePreference(language: 'en' | 'ar'): void {
  localStorage.setItem('user_language_preference', language);
}

/**
 * Get user language preference from localStorage
 */
export function getStoredLanguagePreference(): 'en' | 'ar' | null {
  const stored = localStorage.getItem('user_language_preference');
  if (stored === 'en' || stored === 'ar') {
    return stored;
  }
  return null;
}
