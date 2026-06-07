/**
 * ============================================================================
 * TRILINGUAL TRANSLATION SYSTEM - WRAPPER
 * Production-Ready NGO/INGO ERP Platform
 * Wraps existing translations.ts to provide unified interface
 * Fully Supporting: English (en), العربية (ar), Italiano (it)
 * ============================================================================
 *
 * LANGUAGE SUPPORT:
 * - English (en-US): Complete (from translations.ts)
 * - Arabic (ar-SA): Complete with RTL support (from translations.ts)
 * - Italian (it-IT): Complete (from translations.ts)
 *
 * This file imports from the authoritative translations.ts source and
 * provides the structure expected by TranslationProvider and useTranslation.
 * ============================================================================
 */

// Import from the authoritative source
import {
  Translations,
  en,
  ar,
  it,
} from './translations';

export type Language = 'en' | 'ar' | 'it';

export type { Translations } from './translations';


// ============================================================================
// EXPORT TRANSLATIONS
// Provides unified interface for language switching and translation access
// ============================================================================

export const translations: Record<Language, Translations> = {
  en,
  ar,
  it,
};
