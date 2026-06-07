// ============================================================================
// LANGUAGE CONTEXT - UNIFIED ARCHITECTURE
// Derives language selection from TranslationProvider (single source of truth)
// Controls UI direction (LTR/RTL) and locale settings
// ============================================================================

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslationContext } from '@/i18n/TranslationProvider';

type Language = 'en' | 'ar' | 'it';
type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
 language: Language;
 direction: Direction;
 setLanguage: (lang: Language) => void;
 changeLanguage: (lang: Language) => void;
 isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Language Provider - Derives from TranslationProvider
 * Single source of truth: TranslationProvider owns language state
 * LanguageContext is a derived context for backward compatibility
 */
export function LanguageProvider({
 children }: { children: React.ReactNode }) {
 const translationContext = useTranslationContext();
 const [mounted, setMounted] = useState(false);

 const direction: Direction = translationContext.language === 'ar' ? 'rtl' : 'ltr';
 const isRTL = direction === 'rtl';

 useEffect(() => {
 setMounted(true);
 }, []);

 // Update HTML attributes when language changes
 useEffect(() => {
 if (!mounted) return;

 const language = translationContext.language;
 document.documentElement.dir = direction;
 document.documentElement.lang = language;
 
 // Add RTL class to body for any legacy CSS that needs it
 if (isRTL) {
 document.body.classList.add('rtl');
 document.body.classList.remove('ltr');
 } else {
 document.body.classList.add('ltr');
 document.body.classList.remove('rtl');
 }
 }, [translationContext.language, direction, isRTL, mounted]);

 const value: LanguageContextType = {
 language: translationContext.language,
 direction,
 setLanguage: translationContext.setLanguage,
 changeLanguage: translationContext.changeLanguage,
 isRTL
 };

 return (
 <LanguageContext.Provider value={value}>
 {children}
 </LanguageContext.Provider>
 );
}

export function useLanguage() {
 const context = useContext(LanguageContext);
 if (context === undefined) {
 throw new Error('useLanguage must be used within a LanguageProvider');
 }
 return context;
}

// Utility function for conditional RTL classes
export function rtlClass(ltrClass: string, rtlClass: string, isRTL: boolean): string {
 return isRTL ? rtlClass : ltrClass;
}

// Format number (always LTR)
export function formatNumber(value: number, locale?: string): string {
 return new Intl.NumberFormat(locale || 'en-US').format(value);
}

// Format currency (locale-aware)
export function formatCurrency(value: number, currency: string = 'USD', language: Language = 'en'): string {
 const localeMap: Record<Language, string> = {
   'en': 'en-US',
   'ar': 'ar-SA',
   'it': 'it-IT'
 };
 return new Intl.NumberFormat(localeMap[language], {
 style: 'currency',
 currency
 }).format(value);
}

// Format file size (bytes to human readable)
export function formatFileSize(bytes: number): string {
 if (bytes === 0) return '0 Bytes';
 const k = 1024;
 const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Format date (locale-aware)
export function formatDate(date: Date | string, language: Language = 'en'): string {
 const dateObj = typeof date === 'string' ? new Date(date) : date;
 const localeMap: Record<Language, string> = {
   'en': 'en-US',
   'ar': 'ar-SA',
   'it': 'it-IT'
 };
 return new Intl.DateTimeFormat(localeMap[language], {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 }).format(dateObj);
}
