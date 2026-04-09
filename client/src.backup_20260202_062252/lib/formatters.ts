/**
 * Locale-aware formatting utilities for dates, numbers, and currency
 * Automatically adapts to current language (English/Arabic)
 */

import i18n from './i18n';

/**
 * Get the current locale code based on the active language
 */
export function getCurrentLocale(): string {
  const lang = i18n.language;
  
  // Map language codes to full locale codes
  if (lang === 'ar' || lang.startsWith('ar-')) {
    return 'ar-SA'; // Arabic (Saudi Arabia)
  }
  
  return 'en-US'; // Default to English (United States)
}

/**
 * Format a date according to the current locale
 * @param date - Date object, timestamp, or date string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | number | string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(dateObj.getTime())) return '—';
  
  const locale = getCurrentLocale();
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  return dateObj.toLocaleDateString(locale, defaultOptions);
}

/**
 * Format a date with time according to the current locale
 * @param date - Date object, timestamp, or date string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | number | string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '—';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(dateObj.getTime())) return '—';
  
  const locale = getCurrentLocale();
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return dateObj.toLocaleDateString(locale, defaultOptions);
}

/**
 * Format a relative time (e.g., "2 hours ago", "منذ ساعتين")
 * @param date - Date object, timestamp, or date string
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  date: Date | number | string | undefined | null
): string {
  if (!date) return '—';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(dateObj.getTime())) return '—';
  
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  const locale = getCurrentLocale();
  const isArabic = locale.startsWith('ar');
  
  if (diffSec < 60) {
    return isArabic ? 'الآن' : 'just now';
  } else if (diffMin < 60) {
    return isArabic 
      ? `منذ ${diffMin} ${diffMin === 1 ? 'دقيقة' : 'دقائق'}`
      : `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHour < 24) {
    return isArabic
      ? `منذ ${diffHour} ${diffHour === 1 ? 'ساعة' : 'ساعات'}`
      : `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDay < 7) {
    return isArabic
      ? `منذ ${diffDay} ${diffDay === 1 ? 'يوم' : 'أيام'}`
      : `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } else if (diffWeek < 4) {
    return isArabic
      ? `منذ ${diffWeek} ${diffWeek === 1 ? 'أسبوع' : 'أسابيع'}`
      : `${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffMonth < 12) {
    return isArabic
      ? `منذ ${diffMonth} ${diffMonth === 1 ? 'شهر' : 'أشهر'}`
      : `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
  } else {
    return isArabic
      ? `منذ ${diffYear} ${diffYear === 1 ? 'سنة' : 'سنوات'}`
      : `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Format a number according to the current locale
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | string | undefined | null,
  options?: Intl.NumberFormatOptions
): string {
  if (value === undefined || value === null || value === '') return '—';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '—';
  
  const locale = getCurrentLocale();
  
  return numValue.toLocaleString(locale, options);
}

/**
 * Format a currency amount according to the current locale
 * @param value - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'EUR', 'YER')
 * @param options - Intl.NumberFormat options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | undefined | null,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  if (value === undefined || value === null || value === '') return '—';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '—';
  
  const locale = getCurrentLocale();
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    ...options,
  };
  
  return numValue.toLocaleString(locale, defaultOptions);
}

/**
 * Format a percentage according to the current locale
 * @param value - Value to format (0-100 or 0-1 depending on isDecimal)
 * @param isDecimal - Whether the value is already a decimal (0-1) or percentage (0-100)
 * @param options - Intl.NumberFormat options
 * @returns Formatted percentage string
 */
export function formatPercent(
  value: number | string | undefined | null,
  isDecimal: boolean = false,
  options?: Intl.NumberFormatOptions
): string {
  if (value === undefined || value === null || value === '') return '—';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '—';
  
  const locale = getCurrentLocale();
  const percentValue = isDecimal ? numValue : numValue / 100;
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  };
  
  return percentValue.toLocaleString(locale, defaultOptions);
}

/**
 * Format a file size in bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null) return '—';
  
  const locale = getCurrentLocale();
  const isArabic = locale.startsWith('ar');
  
  if (bytes === 0) return isArabic ? '0 بايت' : '0 Bytes';
  
  const k = 1024;
  const sizes = isArabic 
    ? ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت', 'تيرابايت']
    : ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  
  return `${formatNumber(value, { maximumFractionDigits: 2 })} ${sizes[i]}`;
}

/**
 * Format a duration in milliseconds to human-readable format
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return '—';
  
  const locale = getCurrentLocale();
  const isArabic = locale.startsWith('ar');
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return isArabic 
      ? `${days} ${days === 1 ? 'يوم' : 'أيام'}`
      : `${days} ${days === 1 ? 'day' : 'days'}`;
  } else if (hours > 0) {
    return isArabic
      ? `${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`
      : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else if (minutes > 0) {
    return isArabic
      ? `${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`
      : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    return isArabic
      ? `${seconds} ${seconds === 1 ? 'ثانية' : 'ثوان'}`
      : `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
}
