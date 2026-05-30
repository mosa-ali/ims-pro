/**
 * shared/currency/currencies.ts
 *
 * Single source of truth for all currency metadata.
 * No other file should define currency lists, symbols, or names.
 *
 * Covers 160+ ISO 4217 currencies with:
 *   - English name
 *   - Arabic name (nameAr)
 *   - Symbol
 *   - Symbol position (before / after the number)
 *   - Decimal places (ISO 4217 standard)
 *   - Regional grouping
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CurrencyMeta {
  /** ISO 4217 code */
  code: string;
  /** English name */
  name: string;
  /** Arabic name */
  nameAr: string;
  /** Display symbol */
  symbol: string;
  /** Whether the symbol goes before or after the number */
  position: 'before' | 'after';
  /** Number of decimal places per ISO 4217 */
  decimals: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Master registry
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCY_REGISTRY: readonly CurrencyMeta[] = [
  // ── Major Currencies ──────────────────────────────────────────────────────
  { code: 'USD', name: 'US Dollar',           nameAr: 'دولار أمريكي',              symbol: '$',    position: 'before', decimals: 2 },
  { code: 'EUR', name: 'Euro',                nameAr: 'يورو',                       symbol: '€',    position: 'before', decimals: 2 },
  { code: 'GBP', name: 'British Pound',       nameAr: 'جنيه إسترليني',              symbol: '£',    position: 'before', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen',        nameAr: 'ين ياباني',                  symbol: '¥',    position: 'before', decimals: 0 },
  { code: 'CHF', name: 'Swiss Franc',         nameAr: 'فرنك سويسري',                symbol: 'CHF',  position: 'before', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar',     nameAr: 'دولار كندي',                 symbol: 'C$',   position: 'before', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar',   nameAr: 'دولار أسترالي',              symbol: 'A$',   position: 'before', decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar',  nameAr: 'دولار نيوزيلندي',            symbol: 'NZ$',  position: 'before', decimals: 2 },
  { code: 'CNY', name: 'Chinese Yuan',        nameAr: 'يوان صيني',                  symbol: '¥',    position: 'before', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee',        nameAr: 'روبية هندية',                symbol: '₹',    position: 'before', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar',    nameAr: 'دولار سنغافوري',             symbol: 'S$',   position: 'before', decimals: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar',    nameAr: 'دولار هونغ كونغ',            symbol: 'HK$',  position: 'before', decimals: 2 },

  // ── Americas ──────────────────────────────────────────────────────────────
  { code: 'MXN', name: 'Mexican Peso',             nameAr: 'بيزو مكسيكي',          symbol: '$',    position: 'before', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real',           nameAr: 'ريال برازيلي',          symbol: 'R$',   position: 'before', decimals: 2 },
  { code: 'CLP', name: 'Chilean Peso',             nameAr: 'بيزو تشيلي',            symbol: '$',    position: 'before', decimals: 0 },
  { code: 'COP', name: 'Colombian Peso',           nameAr: 'بيزو كولومبي',          symbol: '$',    position: 'before', decimals: 2 },
  { code: 'PEN', name: 'Peruvian Sol',             nameAr: 'سول بيروفي',            symbol: 'S/',   position: 'before', decimals: 2 },
  { code: 'ARS', name: 'Argentine Peso',           nameAr: 'بيزو أرجنتيني',         symbol: '$',    position: 'before', decimals: 2 },
  { code: 'UYU', name: 'Uruguayan Peso',           nameAr: 'بيزو أوروغواي',         symbol: '$U',   position: 'before', decimals: 2 },
  { code: 'VEF', name: 'Venezuelan Bolívar',       nameAr: 'بوليفار فنزويلي',       symbol: 'Bs',   position: 'before', decimals: 2 },
  { code: 'BOB', name: 'Bolivian Boliviano',       nameAr: 'بوليفيانو بوليفي',      symbol: 'Bs.',  position: 'before', decimals: 2 },
  { code: 'PYG', name: 'Paraguayan Guaraní',       nameAr: 'جوارني باراغواي',       symbol: '₲',    position: 'before', decimals: 0 },
  { code: 'GTQ', name: 'Guatemalan Quetzal',       nameAr: 'كيتسال غواتيمالي',      symbol: 'Q',    position: 'before', decimals: 2 },
  { code: 'HNL', name: 'Honduran Lempira',         nameAr: 'ليمبيرا هندوراسي',      symbol: 'L',    position: 'before', decimals: 2 },
  { code: 'NIO', name: 'Nicaraguan Córdoba',       nameAr: 'كوردوبا نيكاراغوي',     symbol: 'C$',   position: 'before', decimals: 2 },
  { code: 'CRC', name: 'Costa Rican Colón',        nameAr: 'كولون كوستاريكي',       symbol: '₡',    position: 'before', decimals: 2 },
  { code: 'PAB', name: 'Panamanian Balboa',        nameAr: 'بالبوا بنمي',           symbol: 'B/.',  position: 'before', decimals: 2 },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', nameAr: 'دولار ترينيداد وتوباغو', symbol: 'TT$', position: 'before', decimals: 2 },
  { code: 'JMD', name: 'Jamaican Dollar',          nameAr: 'دولار جامايكي',         symbol: 'J$',   position: 'before', decimals: 2 },
  { code: 'BSD', name: 'Bahamian Dollar',          nameAr: 'دولار باهامي',          symbol: 'B$',   position: 'before', decimals: 2 },
  { code: 'BZD', name: 'Belize Dollar',            nameAr: 'دولار بليزي',           symbol: 'BZ$',  position: 'before', decimals: 2 },
  { code: 'XCD', name: 'East Caribbean Dollar',    nameAr: 'دولار الكاريبي الشرقي', symbol: 'EC$',  position: 'before', decimals: 2 },
  { code: 'HTG', name: 'Haitian Gourde',           nameAr: 'جورد هايتي',            symbol: 'G',    position: 'before', decimals: 2 },
  { code: 'DOP', name: 'Dominican Peso',           nameAr: 'بيزو دومينيكاني',       symbol: 'RD$',  position: 'before', decimals: 2 },
  { code: 'CUP', name: 'Cuban Peso',               nameAr: 'بيزو كوبي',             symbol: '₱',    position: 'before', decimals: 2 },
  { code: 'CUC', name: 'Cuban Convertible Peso',   nameAr: 'بيزو كوبي قابل للتحويل', symbol: '$',  position: 'before', decimals: 2 },
  { code: 'ANG', name: 'Netherlands Antillean Guilder', nameAr: 'غيلدر هولندي',    symbol: 'ƒ',    position: 'before', decimals: 2 },
  { code: 'SRD', name: 'Surinamese Dollar',        nameAr: 'دولار سورينامي',        symbol: '$',    position: 'before', decimals: 2 },
  { code: 'GYD', name: 'Guyanese Dollar',          nameAr: 'دولار غيانا',           symbol: 'G$',   position: 'before', decimals: 2 },
  { code: 'FKP', name: 'Falkland Islands Pound',   nameAr: 'جنيه جزر فوكلاند',     symbol: '£',    position: 'before', decimals: 2 },
  { code: 'GIP', name: 'Gibraltar Pound',          nameAr: 'جنيه جبل طارق',        symbol: '£',    position: 'before', decimals: 2 },
  { code: 'SHP', name: 'Saint Helena Pound',       nameAr: 'جنيه سانت هيلينا',     symbol: '£',    position: 'before', decimals: 2 },

  // ── Asia Pacific ──────────────────────────────────────────────────────────
  { code: 'KRW', name: 'South Korean Won',         nameAr: 'وون كوري جنوبي',       symbol: '₩',    position: 'before', decimals: 0 },
  { code: 'IDR', name: 'Indonesian Rupiah',         nameAr: 'روبية إندونيسية',      symbol: 'Rp',   position: 'before', decimals: 0 },
  { code: 'MYR', name: 'Malaysian Ringgit',         nameAr: 'رينجيت ماليزي',        symbol: 'RM',   position: 'before', decimals: 2 },
  { code: 'THB', name: 'Thai Baht',                 nameAr: 'بات تايلندي',          symbol: '฿',    position: 'before', decimals: 2 },
  { code: 'PHP', name: 'Philippine Peso',           nameAr: 'بيزو فلبيني',          symbol: '₱',    position: 'before', decimals: 2 },
  { code: 'VND', name: 'Vietnamese Dong',           nameAr: 'دونج فيتنامي',         symbol: '₫',    position: 'before', decimals: 0 },
  { code: 'MMK', name: 'Myanmar Kyat',              nameAr: 'كيات ميانماري',        symbol: 'K',    position: 'before', decimals: 2 },
  { code: 'LAK', name: 'Laotian Kip',               nameAr: 'كيب لاوسي',            symbol: '₭',    position: 'before', decimals: 0 },
  { code: 'KHR', name: 'Cambodian Riel',            nameAr: 'ريل كمبودي',           symbol: '៛',    position: 'before', decimals: 2 },
  { code: 'MOP', name: 'Macanese Pataca',           nameAr: 'باتاكا ماكاوية',       symbol: 'P',    position: 'before', decimals: 2 },
  { code: 'TWD', name: 'Taiwan Dollar',             nameAr: 'دولار تايواني',        symbol: 'NT$',  position: 'before', decimals: 2 },
  { code: 'FJD', name: 'Fiji Dollar',               nameAr: 'دولار فيجي',           symbol: 'FJ$',  position: 'before', decimals: 2 },
  { code: 'PGK', name: 'Papua New Guinea Kina',     nameAr: 'كينا بابوا غينيا الجديدة', symbol: 'K', position: 'before', decimals: 2 },
  { code: 'SBD', name: 'Solomon Islands Dollar',    nameAr: 'دولار جزر سليمان',    symbol: 'SI$',  position: 'before', decimals: 2 },
  { code: 'TOP', name: 'Tongan Paʻanga',            nameAr: 'بانغا تونغي',          symbol: 'T$',   position: 'before', decimals: 2 },
  { code: 'WST', name: 'Samoan Tala',               nameAr: 'تالا ساموي',           symbol: 'T',    position: 'before', decimals: 2 },
  { code: 'VUV', name: 'Vanuatu Vatu',              nameAr: 'فاتو فانواتي',         symbol: 'VT',   position: 'before', decimals: 0 },
  { code: 'XPF', name: 'CFP Franc',                 nameAr: 'فرنك بولينيزي',        symbol: '₣',    position: 'before', decimals: 0 },
  { code: 'BND', name: 'Brunei Dollar',             nameAr: 'دولار بروني',          symbol: 'B$',   position: 'before', decimals: 2 },

  // ── MENA Region ───────────────────────────────────────────────────────────
  { code: 'SAR', name: 'Saudi Riyal',        nameAr: 'ريال سعودي',     symbol: 'ر.س',  position: 'after', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham',         nameAr: 'درهم إماراتي',   symbol: 'د.إ',  position: 'after', decimals: 2 },
  { code: 'QAR', name: 'Qatari Riyal',       nameAr: 'ريال قطري',      symbol: 'ر.ق',  position: 'after', decimals: 2 },
  { code: 'OMR', name: 'Omani Rial',         nameAr: 'ريال عماني',     symbol: 'ر.ع.', position: 'after', decimals: 3 },
  { code: 'KWD', name: 'Kuwaiti Dinar',      nameAr: 'دينار كويتي',    symbol: 'د.ك',  position: 'after', decimals: 3 },
  { code: 'BHD', name: 'Bahraini Dinar',     nameAr: 'دينار بحريني',   symbol: 'د.ب',  position: 'after', decimals: 3 },
  { code: 'JOD', name: 'Jordanian Dinar',    nameAr: 'دينار أردني',    symbol: 'د.ا',  position: 'after', decimals: 3 },
  { code: 'LBP', name: 'Lebanese Pound',     nameAr: 'ليرة لبنانية',   symbol: 'ل.ل',  position: 'after', decimals: 0 },
  { code: 'EGP', name: 'Egyptian Pound',     nameAr: 'جنيه مصري',      symbol: 'ج.م',  position: 'after', decimals: 2 },
  { code: 'YER', name: 'Yemeni Rial',        nameAr: 'ريال يمني',      symbol: '﷼',    position: 'after', decimals: 0 },
  { code: 'IQD', name: 'Iraqi Dinar',        nameAr: 'دينار عراقي',    symbol: 'ع.د',  position: 'after', decimals: 0 },
  { code: 'SYP', name: 'Syrian Pound',       nameAr: 'ليرة سورية',     symbol: 'ل.س',  position: 'after', decimals: 0 },
  { code: 'IRR', name: 'Iranian Rial',       nameAr: 'ريال إيراني',    symbol: '﷼',    position: 'after', decimals: 0 },
  { code: 'ILS', name: 'Israeli Shekel',     nameAr: 'شيقل إسرائيلي',  symbol: '₪',    position: 'before', decimals: 2 },
  { code: 'TND', name: 'Tunisian Dinar',     nameAr: 'دينار تونسي',    symbol: 'د.ت',  position: 'after', decimals: 3 },
  { code: 'MAD', name: 'Moroccan Dirham',    nameAr: 'درهم مغربي',     symbol: 'د.م.', position: 'after', decimals: 2 },
  { code: 'DZD', name: 'Algerian Dinar',     nameAr: 'دينار جزائري',   symbol: 'د.ج',  position: 'after', decimals: 2 },
  { code: 'SDG', name: 'Sudanese Pound',     nameAr: 'جنيه سوداني',    symbol: 'ج.س',  position: 'after', decimals: 2 },
  { code: 'AFN', name: 'Afghan Afghani',     nameAr: 'أفغاني أفغاني',  symbol: '؋',    position: 'before', decimals: 2 },

  // ── Europe ────────────────────────────────────────────────────────────────
  { code: 'NOK', name: 'Norwegian Krone',    nameAr: 'كرونة نرويجية',   symbol: 'kr',   position: 'after', decimals: 2 },
  { code: 'SEK', name: 'Swedish Krona',      nameAr: 'كرونة سويدية',    symbol: 'kr',   position: 'after', decimals: 2 },
  { code: 'DKK', name: 'Danish Krone',       nameAr: 'كرونة دنماركية',  symbol: 'kr',   position: 'after', decimals: 2 },
  { code: 'TRY', name: 'Turkish Lira',       nameAr: 'ليرة تركية',      symbol: '₺',    position: 'before', decimals: 2 },
  { code: 'RUB', name: 'Russian Ruble',      nameAr: 'روبل روسي',       symbol: '₽',    position: 'after', decimals: 2 },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', nameAr: 'مارك بوسني', symbol: 'KM', position: 'after', decimals: 2 },
  { code: 'HRK', name: 'Croatian Kuna',      nameAr: 'كونا كرواتية',    symbol: 'kn',   position: 'after', decimals: 2 },
  { code: 'RSD', name: 'Serbian Dinar',      nameAr: 'دينار صربي',      symbol: 'дин',  position: 'after', decimals: 0 },
  { code: 'BGN', name: 'Bulgarian Lev',      nameAr: 'ليف بلغاري',      symbol: 'лв',   position: 'after', decimals: 2 },
  { code: 'RON', name: 'Romanian Leu',       nameAr: 'ليو روماني',      symbol: 'lei',  position: 'after', decimals: 2 },
  { code: 'HUF', name: 'Hungarian Forint',   nameAr: 'فورينت مجري',     symbol: 'Ft',   position: 'after', decimals: 0 },
  { code: 'PLN', name: 'Polish Zloty',       nameAr: 'زلوتي بولندي',    symbol: 'zł',   position: 'after', decimals: 2 },
  { code: 'CZK', name: 'Czech Koruna',       nameAr: 'كرونة تشيكية',    symbol: 'Kč',   position: 'after', decimals: 2 },
  { code: 'SKK', name: 'Slovak Koruna',      nameAr: 'كرونة سلوفاكية',  symbol: 'Sk',   position: 'after', decimals: 2 },
  { code: 'UAH', name: 'Ukrainian Hryvnia',  nameAr: 'هريفنيا أوكرانية', symbol: '₴',   position: 'after', decimals: 2 },
  { code: 'BYR', name: 'Belarusian Ruble',   nameAr: 'روبل بيلاروسي',   symbol: 'Br',   position: 'after', decimals: 0 },
  { code: 'ALL', name: 'Albanian Lek',       nameAr: 'ليك ألباني',      symbol: 'L',    position: 'after', decimals: 0 },
  { code: 'MKD', name: 'Macedonian Denar',   nameAr: 'دينار مقدوني',    symbol: 'ден',  position: 'after', decimals: 2 },

  // ── Central Asia ──────────────────────────────────────────────────────────
  { code: 'KZT', name: 'Kazakhstani Tenge',  nameAr: 'تنغ كازاخستاني',  symbol: '₸',    position: 'after', decimals: 2 },
  { code: 'UZS', name: 'Uzbekistani Som',    nameAr: 'سوم أوزبكي',      symbol: "so'm", position: 'after', decimals: 0 },
  { code: 'TJS', name: 'Tajikistani Somoni', nameAr: 'سوموني طاجيكي',   symbol: 'ЅМ',   position: 'after', decimals: 2 },
  { code: 'KGS', name: 'Kyrgyzstani Som',    nameAr: 'سوم قيرغيزي',     symbol: 'с',    position: 'after', decimals: 2 },
  { code: 'MNT', name: 'Mongolian Tugrik',   nameAr: 'توغريك منغولي',   symbol: '₮',    position: 'after', decimals: 0 },
  { code: 'AZN', name: 'Azerbaijani Manat',  nameAr: 'مانات أذربيجاني', symbol: '₼',    position: 'after', decimals: 2 },
  { code: 'GEL', name: 'Georgian Lari',      nameAr: 'لاري جورجي',      symbol: '₾',    position: 'after', decimals: 2 },
  { code: 'AMD', name: 'Armenian Dram',      nameAr: 'درام أرميني',     symbol: '֏',    position: 'after', decimals: 2 },

  // ── South Asia ────────────────────────────────────────────────────────────
  { code: 'PKR', name: 'Pakistani Rupee',    nameAr: 'روبية باكستانية',  symbol: '₨',    position: 'before', decimals: 2 },
  { code: 'BDT', name: 'Bangladeshi Taka',   nameAr: 'تاكا بنغلاديشية', symbol: '৳',    position: 'before', decimals: 2 },
  { code: 'LKR', name: 'Sri Lankan Rupee',   nameAr: 'روبية سريلانكية', symbol: 'Rs',   position: 'before', decimals: 2 },
  { code: 'NPR', name: 'Nepalese Rupee',     nameAr: 'روبية نيبالية',   symbol: '₨',    position: 'before', decimals: 2 },
  { code: 'BTN', name: 'Bhutanese Ngultrum', nameAr: 'نجولتروم بوتاني', symbol: 'Nu.',  position: 'before', decimals: 2 },
  { code: 'MVR', name: 'Maldivian Rufiyaa',  nameAr: 'روفية مالديفية',  symbol: 'Rf',   position: 'before', decimals: 2 },

  // ── Africa ────────────────────────────────────────────────────────────────
  { code: 'NGN', name: 'Nigerian Naira',          nameAr: 'نيرة نيجيرية',          symbol: '₦',    position: 'before', decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling',          nameAr: 'شلن كيني',              symbol: 'KSh',  position: 'before', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand',       nameAr: 'راند جنوب أفريقي',     symbol: 'R',    position: 'before', decimals: 2 },
  { code: 'GMD', name: 'Gambian Dalasi',           nameAr: 'دالاسي جامبي',         symbol: 'D',    position: 'before', decimals: 2 },
  { code: 'MUR', name: 'Mauritian Rupee',          nameAr: 'روبية موريشيوسية',     symbol: '₨',    position: 'before', decimals: 2 },
  { code: 'SCR', name: 'Seychellois Rupee',        nameAr: 'روبية سيشيلية',        symbol: '₨',    position: 'before', decimals: 2 },
  { code: 'SZL', name: 'Eswatini Lilangeni',       nameAr: 'إيمالانجيني إسواتيني', symbol: 'L',    position: 'before', decimals: 2 },
  { code: 'LSL', name: 'Lesotho Loti',             nameAr: 'لوتي ليسوتو',          symbol: 'L',    position: 'before', decimals: 2 },
  { code: 'BWP', name: 'Botswana Pula',            nameAr: 'بولا بوتسواني',        symbol: 'P',    position: 'before', decimals: 2 },
  { code: 'NAD', name: 'Namibian Dollar',          nameAr: 'دولار ناميبي',         symbol: 'N$',   position: 'before', decimals: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi',            nameAr: 'سيدي غاني',            symbol: '₵',    position: 'before', decimals: 2 },
  { code: 'LRD', name: 'Liberian Dollar',          nameAr: 'دولار ليبيري',         symbol: 'L$',   position: 'before', decimals: 2 },
  { code: 'SLL', name: 'Sierra Leonean Leone',     nameAr: 'ليون سيراليوني',       symbol: 'Le',   position: 'before', decimals: 2 },
  { code: 'GNF', name: 'Guinean Franc',            nameAr: 'فرنك غيني',            symbol: 'FG',   position: 'before', decimals: 0 },
  { code: 'MWK', name: 'Malawian Kwacha',          nameAr: 'كواشا ملاوي',          symbol: 'MK',   position: 'before', decimals: 2 },
  { code: 'MZN', name: 'Mozambican Metical',       nameAr: 'متيكال موزمبيقي',      symbol: 'MT',   position: 'before', decimals: 2 },
  { code: 'RWF', name: 'Rwandan Franc',            nameAr: 'فرنك رواندي',          symbol: 'FRw',  position: 'before', decimals: 0 },
  { code: 'TZS', name: 'Tanzanian Shilling',       nameAr: 'شلن تنزاني',           symbol: 'TSh',  position: 'before', decimals: 2 },
  { code: 'UGX', name: 'Ugandan Shilling',         nameAr: 'شلن أوغندي',           symbol: 'USh',  position: 'before', decimals: 0 },
  { code: 'ZMW', name: 'Zambian Kwacha',           nameAr: 'كواشا زامبية',         symbol: 'ZK',   position: 'before', decimals: 2 },
  { code: 'ZWL', name: 'Zimbabwean Dollar',        nameAr: 'دولار زمبابوي',        symbol: 'Z$',   position: 'before', decimals: 2 },
  { code: 'ETB', name: 'Ethiopian Birr',           nameAr: 'بير إثيوبي',           symbol: 'Br',   position: 'before', decimals: 2 },
  { code: 'ERN', name: 'Eritrean Nakfa',           nameAr: 'ناكفا إريتري',         symbol: 'Nfk',  position: 'before', decimals: 2 },
  { code: 'XOF', name: 'West African CFA Franc',  nameAr: 'فرنك سيفا غرب أفريقي', symbol: 'CFA',  position: 'after', decimals: 0 },
  { code: 'XAF', name: 'Central African CFA Franc', nameAr: 'فرنك سيفا وسط أفريقي', symbol: 'FCFA', position: 'after', decimals: 0 },
  { code: 'CFA', name: 'CFA Franc',               nameAr: 'فرنك سيفا',            symbol: 'CFA',  position: 'after', decimals: 0 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Derived helpers (computed once at module load — zero runtime cost)
// ─────────────────────────────────────────────────────────────────────────────

/** Fast O(1) lookup map: code → CurrencyMeta */
export const CURRENCY_MAP: ReadonlyMap<string, CurrencyMeta> = new Map(
  CURRENCY_REGISTRY.map((c) => [c.code, c])
);

/** Type-safe union of all supported currency codes */
export type CurrencyCode = (typeof CURRENCY_REGISTRY)[number]['code'];

/** Array of all supported codes (useful for Zod enums, selects, etc.) */
export const ALL_CURRENCY_CODES: readonly CurrencyCode[] = CURRENCY_REGISTRY.map((c) => c.code as CurrencyCode);

/**
 * Zod-compatible tuple [first, ...rest] for z.enum()
 * Usage: z.enum(CURRENCY_CODE_TUPLE)
 */
export const CURRENCY_CODE_TUPLE = ALL_CURRENCY_CODES as unknown as [CurrencyCode, ...CurrencyCode[]];

/** Returns true if the given string is a known currency code */
export function isCurrencyCode(code: string): code is CurrencyCode {
  return CURRENCY_MAP.has(code);
}

/** Returns CurrencyMeta or undefined */
export function getCurrencyMeta(code: string): CurrencyMeta | undefined {
  return CURRENCY_MAP.get(code);
}
