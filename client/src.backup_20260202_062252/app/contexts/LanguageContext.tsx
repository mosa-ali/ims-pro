/**
 * ============================================================================
 * LANGUAGE CONTEXT ADAPTER
 * ============================================================================
 * 
 * Re-exports the existing LanguageContext from the main contexts folder.
 * This allows original design files to use @/app/contexts/LanguageContext
 * while the actual implementation lives in @/contexts/LanguageContext.
 * 
 * ============================================================================
 */

export { 
  LanguageProvider, 
  useLanguage, 
  rtlClass, 
  formatNumber, 
  formatCurrency, 
  formatFileSize, 
  formatDate 
} from '@/contexts/LanguageContext';

// Re-export types
export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';
