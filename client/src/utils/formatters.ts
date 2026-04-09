/**
 * ============================================================================
 * FORMATTING UTILITIES
 * RTL/LTR aware formatters for dates, numbers, currencies
 * ============================================================================
 */

/**
 * Format date based on locale (EN/AR)
 * @param date - ISO date string or Date object
 * @param locale - 'en' | 'ar'
 * @param format - 'short' | 'long' | 'date-only' | 'time-only'
 */
export function formatDate(
 date: string | Date,
 locale: 'en' | 'ar' = 'en',
 format: 'short' | 'long' | 'date-only' | 'time-only' = 'short'
): string {
 if (!date) return '-';

 const dateObj = typeof date === 'string' ? new Date(date) : date;

 if (isNaN(dateObj.getTime())) {
 return '-';
 }

 const localeCode = locale === 'ar' ? 'ar-SA' : 'en-US';

 switch (format) {
 case 'date-only':
 return dateObj.toLocaleDateString(localeCode, {
 year: 'numeric',
 month: '2-digit',
 day: '2-digit'
 });

 case 'time-only':
 return dateObj.toLocaleTimeString(localeCode, {
 hour: '2-digit',
 minute: '2-digit'
 });

 case 'long':
 return dateObj.toLocaleDateString(localeCode, {
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 weekday: 'long'
 });

 case 'short':
 default:
 return dateObj.toLocaleDateString(localeCode, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 }
}

/**
 * Format number with locale-aware separators
 * @param value - Number to format
 * @param locale - 'en' | 'ar'
 * @param decimals - Number of decimal places
 */
export function formatNumber(
 value: number,
 locale: 'en' | 'ar' = 'en',
 decimals: number = 0
): string {
 if (value === null || value === undefined || isNaN(value)) {
 return '0';
 }

 const localeCode = locale === 'ar' ? 'ar-SA' : 'en-US';

 return value.toLocaleString(localeCode, {
 minimumFractionDigits: decimals,
 maximumFractionDigits: decimals
 });
}

/**
 * Format currency with proper symbol placement for RTL/LTR
 * @param value - Amount to format
 * @param currency - Currency code (USD, EUR, etc.)
 * @param locale - 'en' | 'ar'
 */
export function formatCurrency(
 value: number,
 currency: string = 'USD',
 locale: 'en' | 'ar' = 'en'
): string {
 if (value === null || value === undefined || isNaN(value)) {
 return locale === 'ar' ? '٠ د.أ' : '$0';
 }

 const localeCode = locale === 'ar' ? 'ar-SA' : 'en-US';

 return new Intl.NumberFormat(localeCode, {
 style: 'currency',
 currency: currency,
 minimumFractionDigits: 0,
 maximumFractionDigits: 0
 }).format(value);
}

/**
 * Format percentage with proper symbol
 * @param value - Decimal value (0.0 to 1.0) or percentage (0 to 100)
 * @param locale - 'en' | 'ar'
 * @param isDecimal - If true, multiply by 100
 */
export function formatPercentage(
 value: number,
 locale: 'en' | 'ar' = 'en',
 isDecimal: boolean = true
): string {
 if (value === null || value === undefined || isNaN(value)) {
 return '0%';
 }

 const percentage = isDecimal ? value * 100 : value;
 const formatted = formatNumber(percentage, locale, 1);

 return locale === 'ar' ? `٪${formatted}` : `${formatted}%`;
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @param locale - 'en' | 'ar'
 */
export function formatFileSize(bytes: number, locale: 'en' | 'ar' = 'en'): string {
 if (bytes === 0) return locale === 'ar' ? '٠ بايت' : '0 Bytes';

 const k = 1024;
 const sizes = locale === 'ar'
 ? ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']
 : ['Bytes', 'KB', 'MB', 'GB'];

 const i = Math.floor(Math.log(bytes) / Math.log(k));
 const value = bytes / Math.pow(k, i);

 return `${formatNumber(value, locale, 2)} ${sizes[i]}`;
}

/**
 * Format duration in human-readable format
 * @param minutes - Duration in minutes
 * @param locale - 'en' | 'ar'
 */
export function formatDuration(minutes: number, locale: 'en' | 'ar' = 'en'): string {
 if (minutes < 60) {
 return locale === 'ar' 
 ? `${formatNumber(minutes, locale)} دقيقة`
 : `${formatNumber(minutes, locale)} min`;
 }

 const hours = Math.floor(minutes / 60);
 const mins = minutes % 60;

 if (locale === 'ar') {
 return mins > 0
 ? `${formatNumber(hours, locale)} ساعة ${formatNumber(mins, locale)} دقيقة`
 : `${formatNumber(hours, locale)} ساعة`;
 } else {
 return mins > 0
 ? `${formatNumber(hours, locale)}h ${formatNumber(mins, locale)}m`
 : `${formatNumber(hours, locale)}h`;
 }
}

/**
 * Format relative time (e.g., "2 days ago")
 * @param date - ISO date string or Date object
 * @param locale - 'en' | 'ar'
 */
export function formatRelativeTime(
 date: string | Date,
 locale: 'en' | 'ar' = 'en'
): string {
 if (!date) return '-';

 const dateObj = typeof date === 'string' ? new Date(date) : date;
 const now = new Date();
 const diffMs = now.getTime() - dateObj.getTime();
 const diffSecs = Math.floor(diffMs / 1000);
 const diffMins = Math.floor(diffSecs / 60);
 const diffHours = Math.floor(diffMins / 60);
 const diffDays = Math.floor(diffHours / 24);

 if (locale === 'ar') {
 if (diffSecs < 60) return 'الآن';
 if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
 if (diffHours < 24) return `منذ ${diffHours} ساعة`;
 if (diffDays < 7) return `منذ ${diffDays} يوم`;
 if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
 if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهر`;
 return `منذ ${Math.floor(diffDays / 365)} سنة`;
 } else {
 if (diffSecs < 60) return 'just now';
 if (diffMins < 60) return `${diffMins} min ago`;
 if (diffHours < 24) return `${diffHours}h ago`;
 if (diffDays < 7) return `${diffDays}d ago`;
 if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
 if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
 return `${Math.floor(diffDays / 365)}y ago`;
 }
}

/**
 * Format date range
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - 'en' | 'ar'
 */
export function formatDateRange(
 startDate: string | Date,
 endDate: string | Date,
 locale: 'en' | 'ar' = 'en'
): string {
 const start = formatDate(startDate, locale, 'short');
 const end = formatDate(endDate, locale, 'short');

 return locale === 'ar' ? `${end} - ${start}` : `${start} - ${end}`;
}

/**
 * Parse Arabic/English numerals to number
 * @param value - String containing numerals
 */
export function parseNumeral(value: string): number {
 // Convert Arabic-Indic numerals to English
 const arabicToEnglish: Record<string, string> = {
 '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
 '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
 };

 const normalized = value.replace(/[٠-٩]/g, (d) => arabicToEnglish[d] || d);
 return parseFloat(normalized.replace(/[^0-9.-]/g, ''));
}

/**
 * Get text direction for locale
 * @param locale - 'en' | 'ar'
 */
export function getTextDirection(locale: 'en' | 'ar'): 'ltr' | 'rtl' {
 return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Format list with proper separators
 * @param items - Array of strings
 * @param locale - 'en' | 'ar'
 */
export function formatList(items: string[], locale: 'en' | 'ar' = 'en'): string {
 if (items.length === 0) return '';
 if (items.length === 1) return items[0];

 const separator = locale === 'ar' ? '، ' : ', ';
 const lastSeparator = locale === 'ar' ? ' و ' : ' and ';

 if (items.length === 2) {
 return `${items[0]}${lastSeparator}${items[1]}`;
 }

 const allButLast = items.slice(0, -1).join(separator);
 const last = items[items.length - 1];

 return `${allButLast}${lastSeparator}${last}`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param locale - 'en' | 'ar'
 */
export function truncateText(
 text: string,
 maxLength: number,
 locale: 'en' | 'ar' = 'en'
): string {
 if (!text || text.length <= maxLength) return text;

 const ellipsis = locale === 'ar' ? '...' : '...';
 return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Format phone number
 * @param phone - Phone number
 * @param locale - 'en' | 'ar'
 */
export function formatPhoneNumber(phone: string, locale: 'en' | 'ar' = 'en'): string {
 if (!phone) return '-';

 // Remove non-numeric characters
 const cleaned = phone.replace(/\D/g, '');

 // Format as international if starts with country code
 if (cleaned.length >= 10) {
 const countryCode = cleaned.substring(0, cleaned.length - 9);
 const areaCode = cleaned.substring(cleaned.length - 9, cleaned.length - 6);
 const firstPart = cleaned.substring(cleaned.length - 6, cleaned.length - 3);
 const secondPart = cleaned.substring(cleaned.length - 3);

 if (locale === 'ar') {
 return `${countryCode}+ ${areaCode} ${firstPart} ${secondPart}`;
 } else {
 return `+${countryCode} ${areaCode} ${firstPart} ${secondPart}`;
 }
 }

 return phone;
}

/**
 * Format code (project code, case code, etc.) - always LTR
 * @param code - Code string
 */
export function formatCode(code: string): string {
 return code; // Codes are always displayed LTR regardless of locale
}

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth
 */
export function calculateAge(dateOfBirth: string | Date): number {
 const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
 const today = new Date();
 let age = today.getFullYear() - dob.getFullYear();
 const monthDiff = today.getMonth() - dob.getMonth();

 if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
 age--;
 }

 return age;
}

/**
 * Format age with unit
 * @param age - Age in years
 * @param locale - 'en' | 'ar'
 */
export function formatAge(age: number, locale: 'en' | 'ar' = 'en'): string {
 if (locale === 'ar') {
 if (age === 1) return 'سنة واحدة';
 if (age === 2) return 'سنتان';
 if (age <= 10) return `${formatNumber(age, locale)} سنوات`;
 return `${formatNumber(age, locale)} سنة`;
 } else {
 return age === 1 ? '1 year' : `${formatNumber(age, locale)} years`;
 }
}
