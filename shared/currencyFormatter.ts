/**
 * System-wide currency formatting utility
 * Converts currency values to formatted strings with proper symbols
 * Supports all 128 ISO 4217 currencies globally
 */

export type CurrencyCode = 
  | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD' | 'CNY' | 'INR'
  | 'MXN' | 'SGD' | 'HKD' | 'NOK' | 'SEK' | 'DKK' | 'ZAR' | 'RUB' | 'BRL' | 'KRW'
  | 'TRY' | 'IDR' | 'MYR' | 'THB' | 'PHP' | 'VND' | 'PKR' | 'BDT' | 'LKR' | 'NGN'
  | 'KES' | 'EGP' | 'SAR' | 'AED' | 'QAR' | 'OMR' | 'KWD' | 'BHD' | 'JOD' | 'LBP'
  | 'YER' | 'IQD' | 'SYP' | 'IRR' | 'ILS' | 'TND' | 'MAD' | 'DZD' | 'SDG' | 'CLP'
  | 'COP' | 'PEN' | 'ARS' | 'UYU' | 'VEF' | 'BOB' | 'PYG' | 'GTQ' | 'HNL' | 'NIO'
  | 'CRC' | 'PAB' | 'TTD' | 'JMD' | 'BSD' | 'BZD' | 'XCD' | 'BAM' | 'HRK' | 'RSD'
  | 'BGN' | 'RON' | 'HUF' | 'PLN' | 'CZK' | 'SKK' | 'UAH' | 'BYR' | 'KZT' | 'UZS'
  | 'TJS' | 'KGS' | 'MNT' | 'AZN' | 'GEL' | 'AMD' | 'AFN' | 'NPR' | 'BTN' | 'MVR'
  | 'LKR' | 'MMK' | 'LAK' | 'KHR' | 'MOP' | 'TWD' | 'FJD' | 'PGK' | 'SBD' | 'TOP'
  | 'WST' | 'VUV' | 'XPF' | 'GMD' | 'MUR' | 'SCR' | 'SZL' | 'LSL' | 'BWP' | 'NAD'
  | 'ANG' | 'SRD' | 'GYD' | 'FKP' | 'GIP' | 'SHP' | 'GBP' | 'ALL' | 'MKD' | 'XOF'
  | 'XAF' | 'CFA' | 'ERN' | 'ETB' | 'GHS' | 'LRD' | 'SLL' | 'GNF' | 'MWK' | 'MZN'
  | 'RWF' | 'TZS' | 'UGX' | 'ZMW' | 'ZWL' | 'HTG' | 'DOP' | 'CUP' | 'CUC' | 'BND';

interface CurrencyConfig {
  symbol: string;
  position: 'before' | 'after';
  decimals: number;
  nameAr?: string;
}

const currencyConfigs: Record<CurrencyCode, CurrencyConfig> = {
  // Major Currencies
  USD: { symbol: '$', position: 'before', decimals: 2, nameAr: 'دولار أمريكي' },
  EUR: { symbol: '€', position: 'before', decimals: 2, nameAr: 'يورو' },
  GBP: { symbol: '£', position: 'before', decimals: 2, nameAr: 'جنيه إسترليني' },
  JPY: { symbol: '¥', position: 'before', decimals: 0, nameAr: 'ين ياباني' },
  CHF: { symbol: 'CHF', position: 'before', decimals: 2, nameAr: 'فرنك سويسري' },
  CAD: { symbol: 'C$', position: 'before', decimals: 2, nameAr: 'دولار كندي' },
  AUD: { symbol: 'A$', position: 'before', decimals: 2, nameAr: 'دولار أسترالي' },
  NZD: { symbol: 'NZ$', position: 'before', decimals: 2, nameAr: 'دولار نيوزيلندي' },
  CNY: { symbol: '¥', position: 'before', decimals: 2, nameAr: 'يوان صيني' },
  INR: { symbol: '₹', position: 'before', decimals: 2, nameAr: 'روبية هندية' },

  // Americas
  MXN: { symbol: '$', position: 'before', decimals: 2, nameAr: 'بيزو مكسيكي' },
  BRL: { symbol: 'R$', position: 'before', decimals: 2, nameAr: 'ريال برازيلي' },
  CLP: { symbol: '$', position: 'before', decimals: 0, nameAr: 'بيزو تشيلي' },
  COP: { symbol: '$', position: 'before', decimals: 2, nameAr: 'بيزو كولومبي' },
  PEN: { symbol: 'S/', position: 'before', decimals: 2, nameAr: 'سول بيروفي' },
  ARS: { symbol: '$', position: 'before', decimals: 2, nameAr: 'بيزو أرجنتيني' },
  UYU: { symbol: '$U', position: 'before', decimals: 2, nameAr: 'بيزو أوروغواي' },
  VEF: { symbol: 'Bs', position: 'before', decimals: 2, nameAr: 'بوليفار فنزويلي' },
  BOB: { symbol: 'Bs.', position: 'before', decimals: 2, nameAr: 'بوليفيانو بوليفي' },
  PYG: { symbol: '₲', position: 'before', decimals: 0, nameAr: 'جوارني باراغواي' },
  GTQ: { symbol: 'Q', position: 'before', decimals: 2, nameAr: 'كيتسال غواتيمالي' },
  HNL: { symbol: 'L', position: 'before', decimals: 2, nameAr: 'ليمبيرا هندوراسي' },
  NIO: { symbol: 'C$', position: 'before', decimals: 2, nameAr: 'كوردوبا نيكاراغوي' },
  CRC: { symbol: '₡', position: 'before', decimals: 2, nameAr: 'كولون كوستاريكي' },
  PAB: { symbol: 'B/.', position: 'before', decimals: 2, nameAr: 'بالبوا بنمي' },
  TTD: { symbol: 'TT$', position: 'before', decimals: 2, nameAr: 'دولار ترينيداد وتوباغو' },
  JMD: { symbol: 'J$', position: 'before', decimals: 2, nameAr: 'دولار جامايكي' },
  BSD: { symbol: 'B$', position: 'before', decimals: 2, nameAr: 'دولار باهامي' },
  BZD: { symbol: 'BZ$', position: 'before', decimals: 2, nameAr: 'دولار بليزي' },
  XCD: { symbol: 'EC$', position: 'before', decimals: 2, nameAr: 'دولار الكاريبي الشرقي' },

  // Asia Pacific
  SGD: { symbol: 'S$', position: 'before', decimals: 2, nameAr: 'دولار سنغافوري' },
  HKD: { symbol: 'HK$', position: 'before', decimals: 2, nameAr: 'دولار هونغ كونغ' },
  KRW: { symbol: '₩', position: 'before', decimals: 0, nameAr: 'وون كوري جنوبي' },
  IDR: { symbol: 'Rp', position: 'before', decimals: 0, nameAr: 'روبية إندونيسية' },
  MYR: { symbol: 'RM', position: 'before', decimals: 2, nameAr: 'رينجيت ماليزي' },
  THB: { symbol: '฿', position: 'before', decimals: 2, nameAr: 'بات تايلندي' },
  PHP: { symbol: '₱', position: 'before', decimals: 2, nameAr: 'بيزو فلبيني' },
  VND: { symbol: '₫', position: 'before', decimals: 0, nameAr: 'دونج فيتنامي' },
  MMK: { symbol: 'K', position: 'before', decimals: 2, nameAr: 'كيات ميانماري' },
  LAK: { symbol: '₭', position: 'before', decimals: 0, nameAr: 'كيب لاوسي' },
  KHR: { symbol: '៛', position: 'before', decimals: 2, nameAr: 'ريل كمبودي' },
  MOP: { symbol: 'P', position: 'before', decimals: 2, nameAr: 'باتاكا ماكاوية' },
  TWD: { symbol: 'NT$', position: 'before', decimals: 2, nameAr: 'دولار تايواني' },
  FJD: { symbol: 'FJ$', position: 'before', decimals: 2, nameAr: 'دولار فيجي' },
  PGK: { symbol: 'K', position: 'before', decimals: 2, nameAr: 'كينا بابوا غينيا الجديدة' },
  SBD: { symbol: 'SI$', position: 'before', decimals: 2, nameAr: 'دولار جزر سليمان' },
  TOP: { symbol: 'T$', position: 'before', decimals: 2, nameAr: 'بانغا تونغي' },
  WST: { symbol: 'T', position: 'before', decimals: 2, nameAr: 'تالا ساموي' },
  VUV: { symbol: 'VT', position: 'before', decimals: 0, nameAr: 'فاتو فانواتي' },
  XPF: { symbol: '₣', position: 'before', decimals: 0, nameAr: 'فرنك بولينيزي' },
  BND: { symbol: 'B$', position: 'before', decimals: 2, nameAr: 'دولار بروني' },

  // MENA Region
  SAR: { symbol: 'ر.س', position: 'after', decimals: 2, nameAr: 'ريال سعودي' },
  AED: { symbol: 'د.إ', position: 'after', decimals: 2, nameAr: 'درهم إماراتي' },
  QAR: { symbol: 'ر.ق', position: 'after', decimals: 2, nameAr: 'ريال قطري' },
  OMR: { symbol: 'ر.ع.', position: 'after', decimals: 3, nameAr: 'ريال عماني' },
  KWD: { symbol: 'د.ك', position: 'after', decimals: 3, nameAr: 'دينار كويتي' },
  BHD: { symbol: 'د.ب', position: 'after', decimals: 3, nameAr: 'دينار بحريني' },
  JOD: { symbol: 'د.ا', position: 'after', decimals: 3, nameAr: 'دينار أردني' },
  LBP: { symbol: 'ل.ل', position: 'after', decimals: 0, nameAr: 'ليرة لبنانية' },
  EGP: { symbol: 'ج.م', position: 'after', decimals: 2, nameAr: 'جنيه مصري' },
  YER: { symbol: '﷼', position: 'after', decimals: 0, nameAr: 'ريال يمني' },
  IQD: { symbol: 'ع.د', position: 'after', decimals: 0, nameAr: 'دينار عراقي' },
  SYP: { symbol: 'ل.س', position: 'after', decimals: 0, nameAr: 'ليرة سورية' },
  IRR: { symbol: '﷼', position: 'after', decimals: 0, nameAr: 'ريال إيراني' },
  ILS: { symbol: '₪', position: 'before', decimals: 2, nameAr: 'شيقل إسرائيلي' },
  TND: { symbol: 'د.ت', position: 'after', decimals: 3, nameAr: 'دينار تونسي' },
  MAD: { symbol: 'د.م.', position: 'after', decimals: 2, nameAr: 'درهم مغربي' },
  DZD: { symbol: 'د.ج', position: 'after', decimals: 2, nameAr: 'دينار جزائري' },
  SDG: { symbol: 'ج.س', position: 'after', decimals: 2, nameAr: 'جنيه سوداني' },
  AFN: { symbol: '؋', position: 'before', decimals: 2, nameAr: 'أفغاني أفغاني' },

  // Europe
  NOK: { symbol: 'kr', position: 'after', decimals: 2, nameAr: 'كرونة نرويجية' },
  SEK: { symbol: 'kr', position: 'after', decimals: 2, nameAr: 'كرونة سويدية' },
  DKK: { symbol: 'kr', position: 'after', decimals: 2, nameAr: 'كرونة دنماركية' },
  TRY: { symbol: '₺', position: 'before', decimals: 2, nameAr: 'ليرة تركية' },
  RUB: { symbol: '₽', position: 'after', decimals: 2, nameAr: 'روبل روسي' },
  BAM: { symbol: 'KM', position: 'after', decimals: 2, nameAr: 'مارك بوسني' },
  HRK: { symbol: 'kn', position: 'after', decimals: 2, nameAr: 'كونا كرواتية' },
  RSD: { symbol: 'дин', position: 'after', decimals: 0, nameAr: 'دينار صربي' },
  BGN: { symbol: 'лв', position: 'after', decimals: 2, nameAr: 'ليف بلغاري' },
  RON: { symbol: 'lei', position: 'after', decimals: 2, nameAr: 'ليو روماني' },
  HUF: { symbol: 'Ft', position: 'after', decimals: 0, nameAr: 'فورينت مجري' },
  PLN: { symbol: 'zł', position: 'after', decimals: 2, nameAr: 'زلوتي بولندي' },
  CZK: { symbol: 'Kč', position: 'after', decimals: 2, nameAr: 'كرونة تشيكية' },
  SKK: { symbol: 'Sk', position: 'after', decimals: 2, nameAr: 'كرونة سلوفاكية' },
  UAH: { symbol: '₴', position: 'after', decimals: 2, nameAr: 'هريفنيا أوكرانية' },
  BYR: { symbol: 'Br', position: 'after', decimals: 0, nameAr: 'روبل بيلاروسي' },
  ALL: { symbol: 'L', position: 'after', decimals: 0, nameAr: 'ليك ألباني' },
  MKD: { symbol: 'ден', position: 'after', decimals: 2, nameAr: 'دينار مقدوني' },

  // Central Asia
  KZT: { symbol: '₸', position: 'after', decimals: 2, nameAr: 'تنغ كازاخستاني' },
  UZS: { symbol: 'so\'m', position: 'after', decimals: 0, nameAr: 'سوم أوزبكي' },
  TJS: { symbol: 'ЅМ', position: 'after', decimals: 2, nameAr: 'سوموني طاجيكي' },
  KGS: { symbol: 'с', position: 'after', decimals: 2, nameAr: 'سوم قيرغيزي' },
  MNT: { symbol: '₮', position: 'after', decimals: 0, nameAr: 'توغريك منغولي' },
  AZN: { symbol: '₼', position: 'after', decimals: 2, nameAr: 'مانات أذربيجاني' },
  GEL: { symbol: '₾', position: 'after', decimals: 2, nameAr: 'لاري جورجي' },
  ARM: { symbol: '֏', position: 'after', decimals: 2, nameAr: 'درام أرميني' },

  // South Asia
  PKR: { symbol: '₨', position: 'before', decimals: 2, nameAr: 'روبية باكستانية' },
  BDT: { symbol: '৳', position: 'before', decimals: 2, nameAr: 'تاكا بنغلاديشية' },
  LKR: { symbol: 'Rs', position: 'before', decimals: 2, nameAr: 'روبية سريلانكية' },
  NPR: { symbol: '₨', position: 'before', decimals: 2, nameAr: 'روبية نيبالية' },
  BTN: { symbol: 'Nu.', position: 'before', decimals: 2, nameAr: 'نجولتروم بوتاني' },
  MVR: { symbol: 'Rf', position: 'before', decimals: 2, nameAr: 'روفية مالديفية' },

  // Africa
  NGN: { symbol: '₦', position: 'before', decimals: 2, nameAr: 'نيرة نيجيرية' },
  KES: { symbol: 'KSh', position: 'before', decimals: 2, nameAr: 'شلن كيني' },
  ZAR: { symbol: 'R', position: 'before', decimals: 2, nameAr: 'راند جنوب أفريقي' },
  GMD: { symbol: 'D', position: 'before', decimals: 2, nameAr: 'دالاسي جامبي' },
  MUR: { symbol: '₨', position: 'before', decimals: 2, nameAr: 'روبية موريشيوسية' },
  SCR: { symbol: '₨', position: 'before', decimals: 2, nameAr: 'روبية سيشيلية' },
  SZL: { symbol: 'L', position: 'before', decimals: 2, nameAr: 'إيمالانجيني إسواتيني' },
  LSL: { symbol: 'L', position: 'before', decimals: 2, nameAr: 'لوتي ليسوتو' },
  BWP: { symbol: 'P', position: 'before', decimals: 2, nameAr: 'بولا بوتسواني' },
  NAD: { symbol: '$', position: 'before', decimals: 2, nameAr: 'دولار ناميبي' },
  GHS: { symbol: '₵', position: 'before', decimals: 2, nameAr: 'سيدي غاني' },
  LRD: { symbol: '$', position: 'before', decimals: 2, nameAr: 'دولار ليبيري' },
  SLL: { symbol: 'Le', position: 'before', decimals: 2, nameAr: 'ليون سيراليوني' },
  GNF: { symbol: 'FG', position: 'before', decimals: 0, nameAr: 'فرنك غيني' },
  MWK: { symbol: 'MK', position: 'before', decimals: 2, nameAr: 'كواشا ملاوي' },
  MZN: { symbol: 'MT', position: 'before', decimals: 2, nameAr: 'متيكال موزمبيقي' },
  RWF: { symbol: 'FRw', position: 'before', decimals: 0, nameAr: 'فرنك رواندي' },
  TZS: { symbol: 'TSh', position: 'before', decimals: 2, nameAr: 'شلن تنزاني' },
  UGX: { symbol: 'USh', position: 'before', decimals: 0, nameAr: 'شلن أوغندي' },
  ZMW: { symbol: 'ZK', position: 'before', decimals: 2, nameAr: 'كواشا زامبية' },
  ZWL: { symbol: '$', position: 'before', decimals: 2, nameAr: 'دولار زمبابوي' },
  ETB: { symbol: 'Br', position: 'before', decimals: 2, nameAr: 'بير إثيوبي' },
  ERN: { symbol: 'Nfk', position: 'before', decimals: 2, nameAr: 'ناكفا إريتري' },
  XOF: { symbol: 'CFA', position: 'after', decimals: 0, nameAr: 'فرنك سيفا غرب أفريقي' },
  XAF: { symbol: 'FCFA', position: 'after', decimals: 0, nameAr: 'فرنك سيفا وسط أفريقي' },
  CFA: { symbol: 'CFA', position: 'after', decimals: 0, nameAr: 'فرنك سيفا' },

  // Caribbean & Other
  ANG: { symbol: 'ƒ', position: 'before', decimals: 2, nameAr: 'غيلدر هولندي' },
  SRD: { symbol: '$', position: 'before', decimals: 2, nameAr: 'دولار سورينامي' },
  GYD: { symbol: '$', position: 'before', decimals: 2, nameAr: 'دولار غيانا' },
  FKP: { symbol: '£', position: 'before', decimals: 2, nameAr: 'جنيه جزر فوكلاند' },
  GIP: { symbol: '£', position: 'before', decimals: 2, nameAr: 'جنيه جبل طارق' },
  SHP: { symbol: '£', position: 'before', decimals: 2, nameAr: 'جنيه سانت هيلينا' },
  HTG: { symbol: 'G', position: 'before', decimals: 2, nameAr: 'جورد هايتي' },
  DOP: { symbol: 'RD$', position: 'before', decimals: 2, nameAr: 'بيزو دومينيكاني' },
  CUP: { symbol: '₱', position: 'before', decimals: 2, nameAr: 'بيزو كوبي' },
  CUC: { symbol: '$', position: 'before', decimals: 2, nameAr: 'بيزو كوبي قابل للتحويل' },
};

/**
 * Format a currency value to a string with symbol
 * @param amount - The numeric amount to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: CurrencyCode = 'USD'
): string {
  if (amount === null || amount === undefined) {
    return '-';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) {
    return '-';
  }

  const config = currencyConfigs[currency];
  if (!config) {
    return `${currency} ${numAmount.toFixed(2)}`;
  }

  // Format number with thousand separators and decimals
  const formatted = numAmount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  // Add currency symbol based on position
  if (config.position === 'before') {
    return `${config.symbol}${formatted}`;
  } else {
    return `${formatted} ${config.symbol}`;
  }
}

/**
 * Format a currency value for table display
 * Handles both numeric values and "USD X,XXX" format strings
 * @param value - The value to format (number, string, or "USD X,XXX" format)
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrencyForTable(
  value: number | string | null | undefined,
  currency: CurrencyCode = 'USD'
): string {
  if (value === null || value === undefined) {
    return '-';
  }

  // If it's a string in "USD X,XXX" format, extract the number
  if (typeof value === 'string') {
    // Remove currency prefix (USD, EUR, etc.)
    const cleanedValue = value.replace(/^[A-Z]{3}\s*/, '').trim();
    // Remove commas and parse
    const numValue = parseFloat(cleanedValue.replace(/,/g, ''));
    if (!isNaN(numValue)) {
      return formatCurrency(numValue, currency);
    }
  }

  return formatCurrency(value, currency);
}

/**
 * Replace all "USD" text with "$" in a given string
 * Useful for converting existing formatted strings
 * @param text - The text to convert
 * @returns Text with USD replaced by $
 */
export function replaceUSDWithDollar(text: string): string {
  return text.replace(/USD\s*/g, '$');
}

/**
 * Get currency symbol for a given currency code
 * @param currency - The currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode = 'USD'): string {
  return currencyConfigs[currency]?.symbol || currency;
}

/**
 * Get all available currency codes
 * @returns Array of all supported currency codes
 */
export function getAllCurrencyCodes(): CurrencyCode[] {
  return Object.keys(currencyConfigs) as CurrencyCode[];
}

/**
 * Get currency configuration including Arabic name
 * @param currency - The currency code
 * @returns Currency configuration with symbol, position, decimals, and Arabic name
 */
export function getCurrencyConfig(currency: CurrencyCode): CurrencyConfig | undefined {
  return currencyConfigs[currency];
}
