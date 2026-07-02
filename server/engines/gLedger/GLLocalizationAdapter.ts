/**
 * GLLocalizationAdapter.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Localization Adapter for GL Engines
 *
 * PHASE 4 REFINEMENT #7
 *
 * Eliminates hardcoded text from GL engines. All user-facing
 * descriptions, messages, and journal narratives flow through
 * the IMS translation framework (translations.ts / useTranslation.ts).
 *
 * Supports: English, Arabic (RTL), Italian
 *
 * Instead of:
 *   description: `Close ${accountCode} - ${periodName}`
 *
 * Use:
 *   description: localize('gl.closing.account_description', { accountCode, periodName })
 *
 * The adapter resolves the translation key to the user's locale.
 * Falls back to English if key is missing in target locale.
 */

// ────────────────────────────────────────────────────────────────────────────
// INTERFACE  (wraps existing IMS translation system)
// ────────────────────────────────────────────────────────────────────────────

export type SupportedLocale = 'en' | 'ar' | 'it';

/**
 * Translation provider interface.
 * Implemented by the existing IMS translations.ts system.
 */
export interface ITranslationProvider {
  /**
   * Get a translated string by key and locale.
   * Supports interpolation: "Close {accountCode} - {periodName}"
   */
  translate(
    key: string,
    locale: SupportedLocale,
    params?: Record<string, string | number>,
  ): string;

  /** Check if a key exists for a locale */
  hasKey(key: string, locale: SupportedLocale): boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// GL TRANSLATION KEYS
// ────────────────────────────────────────────────────────────────────────────

/**
 * All translation keys used by GL engines.
 * Add these to the existing translations.ts file.
 */
export const GL_TRANSLATION_KEYS = {
  // ── Closing Engine ──
  'gl.closing.revenue_close': {
    en: 'Close {accountCode} {accountName} - {periodName}',
    ar: 'إقفال {accountCode} {accountName} - {periodName}',
    it: 'Chiusura {accountCode} {accountName} - {periodName}',
  },
  'gl.closing.expense_close': {
    en: 'Close {accountCode} {accountName} - {periodName}',
    ar: 'إقفال {accountCode} {accountName} - {periodName}',
    it: 'Chiusura {accountCode} {accountName} - {periodName}',
  },
  'gl.closing.net_income_transfer': {
    en: 'Net income to retained earnings - {periodName}',
    ar: 'صافي الدخل إلى الأرباح المحتجزة - {periodName}',
    it: 'Utile netto a utili non distribuiti - {periodName}',
  },
  'gl.closing.period_entry': {
    en: 'Period closing entry - {periodName}',
    ar: 'قيد إقفال الفترة - {periodName}',
    it: 'Registrazione di chiusura periodo - {periodName}',
  },

  // ── Accrual Engine ──
  'gl.accrual.entry': {
    en: 'Accrual: {scheduleName} - {periodDate}',
    ar: 'استحقاق: {scheduleName} - {periodDate}',
    it: 'Competenza: {scheduleName} - {periodDate}',
  },
  'gl.accrual.reversal': {
    en: 'Accrual reversal: {scheduleName} - {periodDate}',
    ar: 'عكس استحقاق: {scheduleName} - {periodDate}',
    it: 'Storno competenza: {scheduleName} - {periodDate}',
  },

  // ── Allocation Engine ──
  'gl.allocation.source': {
    en: 'Allocation source - {ruleName}',
    ar: 'مصدر التخصيص - {ruleName}',
    it: 'Fonte allocazione - {ruleName}',
  },
  'gl.allocation.target': {
    en: 'Allocated to {targetName} ({percentage}%)',
    ar: 'مخصص لـ {targetName} ({percentage}%)',
    it: 'Assegnato a {targetName} ({percentage}%)',
  },
  'gl.allocation.entry': {
    en: 'Allocation: {ruleName}',
    ar: 'تخصيص: {ruleName}',
    it: 'Allocazione: {ruleName}',
  },

  // ── Reversal ──
  'gl.reversal.description': {
    en: 'Reversal of {entryNumber}: {reason}',
    ar: 'عكس {entryNumber}: {reason}',
    it: 'Storno di {entryNumber}: {reason}',
  },

  // ── Validation Messages ──
  'gl.validation.unbalanced': {
    en: 'Entry out of balance: DR {debit} ≠ CR {credit}',
    ar: 'القيد غير متوازن: مدين {debit} ≠ دائن {credit}',
    it: 'Registrazione non bilanciata: Dare {debit} ≠ Avere {credit}',
  },
  'gl.validation.account_inactive': {
    en: 'GL account {accountCode} ({accountName}) is inactive',
    ar: 'حساب الأستاذ العام {accountCode} ({accountName}) غير نشط',
    it: 'Conto {accountCode} ({accountName}) non attivo',
  },
  'gl.validation.period_closed': {
    en: 'Posting not allowed - period is {status}',
    ar: 'الترحيل غير مسموح - الفترة {status}',
    it: 'Registrazione non consentita - periodo {status}',
  },
  'gl.validation.threshold_exceeded': {
    en: 'Amount {amount} exceeds threshold {threshold}; {role} approval required',
    ar: 'المبلغ {amount} يتجاوز الحد {threshold}؛ مطلوب موافقة {role}',
    it: 'Importo {amount} supera soglia {threshold}; approvazione {role} richiesta',
  },
  'gl.validation.duplicate_entry': {
    en: 'Journal entry already exists for {docType} #{docId}',
    ar: 'قيد اليومية موجود بالفعل لـ {docType} #{docId}',
    it: 'Registrazione già esistente per {docType} #{docId}',
  },
  'gl.validation.donor_restricted': {
    en: 'Account {accountCode} is restricted under grant #{grantId}',
    ar: 'الحساب {accountCode} مقيد بموجب المنحة #{grantId}',
    it: 'Conto {accountCode} soggetto a restrizioni per il contributo #{grantId}',
  },
  'gl.validation.budget_exceeded': {
    en: 'Debit {amount} exceeds available budget {available}',
    ar: 'المدين {amount} يتجاوز الميزانية المتاحة {available}',
    it: 'Dare {amount} supera budget disponibile {available}',
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// ADAPTER
// ────────────────────────────────────────────────────────────────────────────

export class GLLocalizationAdapter {
  private provider: ITranslationProvider;
  private fallbackLocale: SupportedLocale = 'en';

  constructor(provider: ITranslationProvider) {
    this.provider = provider;
  }

  /**
   * Localize a GL message.
   * Falls back to English if key not found in target locale.
   */
  localize(
    key: string,
    locale: SupportedLocale,
    params?: Record<string, string | number>,
  ): string {
    if (this.provider.hasKey(key, locale)) {
      return this.provider.translate(key, locale, params);
    }
    // Fallback to English
    if (locale !== this.fallbackLocale && this.provider.hasKey(key, this.fallbackLocale)) {
      return this.provider.translate(key, this.fallbackLocale, params);
    }
    // Fallback: return key with params
    return this.interpolate(key, params);
  }

  /**
   * Get both EN and AR descriptions (for bilingual journal entries).
   */
  bilingualDescription(
    key: string,
    params?: Record<string, string | number>,
  ): { description: string; descriptionAr: string } {
    return {
      description: this.localize(key, 'en', params),
      descriptionAr: this.localize(key, 'ar', params),
    };
  }

  private interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;
    return Object.entries(params).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      template,
    );
  }
}

/**
 * Static translation provider using GL_TRANSLATION_KEYS.
 * In production, replace with the IMS translations.ts provider.
 */
export class StaticGLTranslationProvider implements ITranslationProvider {
  translate(
    key: string,
    locale: SupportedLocale,
    params?: Record<string, string | number>,
  ): string {
    const translations = GL_TRANSLATION_KEYS as Record<string, Record<string, string>>;
    const entry = translations[key];
    if (!entry) return key;
    let text = entry[locale] || entry['en'] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  }

  hasKey(key: string, locale: SupportedLocale): boolean {
    const translations = GL_TRANSLATION_KEYS as Record<string, Record<string, string>>;
    return !!translations[key]?.[locale];
  }
}
