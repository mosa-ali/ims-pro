import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface BudgetInformationSectionProps {
  isRTL: boolean;
  formData: any;
  setFormData: (data: any) => void;
  selectedBudgetId: number | null;
  selectedBudgetLine: any;
  budgetLinesData: any[];
  remainingBudget: number;
  budgetUtilizationPercent: number;
  isLocked: boolean;
}

type CurrencyRecord = {
  code: string;
  name: string;
  nameAr?: string;
  symbol?: string;
};

type CurrencyOption = {
  value: string;
  label: string;
  labelAr?: string;
  symbol?: string;
};

// All 128 currencies from currencyFormatter.ts with bilingual support
const GLOBAL_CURRENCIES: CurrencyRecord[] = [
  // Major Currencies
  { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي' },
  { code: 'EUR', name: 'Euro', nameAr: 'يورو' },
  { code: 'GBP', name: 'British Pound', nameAr: 'جنيه إسترليني' },
  { code: 'JPY', name: 'Japanese Yen', nameAr: 'ين ياباني' },
  { code: 'CHF', name: 'Swiss Franc', nameAr: 'فرنك سويسري' },
  { code: 'CAD', name: 'Canadian Dollar', nameAr: 'دولار كندي' },
  { code: 'AUD', name: 'Australian Dollar', nameAr: 'دولار أسترالي' },
  { code: 'NZD', name: 'New Zealand Dollar', nameAr: 'دولار نيوزيلندي' },
  { code: 'CNY', name: 'Chinese Yuan', nameAr: 'يوان صيني' },
  { code: 'INR', name: 'Indian Rupee', nameAr: 'روبية هندية' },
  // Americas
  { code: 'MXN', name: 'Mexican Peso', nameAr: 'بيزو مكسيكي' },
  { code: 'BRL', name: 'Brazilian Real', nameAr: 'ريال برازيلي' },
  { code: 'CLP', name: 'Chilean Peso', nameAr: 'بيزو تشيلي' },
  { code: 'COP', name: 'Colombian Peso', nameAr: 'بيزو كولومبي' },
  { code: 'PEN', name: 'Peruvian Sol', nameAr: 'سول بيروفي' },
  { code: 'ARS', name: 'Argentine Peso', nameAr: 'بيزو أرجنتيني' },
  { code: 'UYU', name: 'Uruguayan Peso', nameAr: 'بيزو أوروغواي' },
  { code: 'VEF', name: 'Venezuelan Bolívar', nameAr: 'بوليفار فنزويلي' },
  { code: 'BOB', name: 'Bolivian Boliviano', nameAr: 'بوليفيانو بوليفي' },
  { code: 'PYG', name: 'Paraguayan Guaraní', nameAr: 'جوارني باراغواي' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', nameAr: 'كيتسال غواتيمالي' },
  { code: 'HNL', name: 'Honduran Lempira', nameAr: 'ليمبيرا هندوراسي' },
  { code: 'NIO', name: 'Nicaraguan Córdoba', nameAr: 'كوردوبا نيكاراغوي' },
  { code: 'CRC', name: 'Costa Rican Colón', nameAr: 'كولون كوستاريكي' },
  { code: 'PAB', name: 'Panamanian Balboa', nameAr: 'بالبوا بنمي' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', nameAr: 'دولار ترينيداد وتوباغو' },
  { code: 'JMD', name: 'Jamaican Dollar', nameAr: 'دولار جامايكي' },
  { code: 'BSD', name: 'Bahamian Dollar', nameAr: 'دولار باهامي' },
  { code: 'BZD', name: 'Belize Dollar', nameAr: 'دولار بليزي' },
  { code: 'XCD', name: 'East Caribbean Dollar', nameAr: 'دولار الكاريبي الشرقي' },
  // Asia Pacific
  { code: 'SGD', name: 'Singapore Dollar', nameAr: 'دولار سنغافوري' },
  { code: 'HKD', name: 'Hong Kong Dollar', nameAr: 'دولار هونغ كونغ' },
  { code: 'KRW', name: 'South Korean Won', nameAr: 'وون كوري جنوبي' },
  { code: 'IDR', name: 'Indonesian Rupiah', nameAr: 'روبية إندونيسية' },
  { code: 'MYR', name: 'Malaysian Ringgit', nameAr: 'رينجيت ماليزي' },
  { code: 'THB', name: 'Thai Baht', nameAr: 'بات تايلندي' },
  { code: 'PHP', name: 'Philippine Peso', nameAr: 'بيزو فلبيني' },
  { code: 'VND', name: 'Vietnamese Dong', nameAr: 'دونج فيتنامي' },
  { code: 'MMK', name: 'Myanmar Kyat', nameAr: 'كيات ميانماري' },
  { code: 'LAK', name: 'Laotian Kip', nameAr: 'كيب لاوسي' },
  { code: 'KHR', name: 'Cambodian Riel', nameAr: 'ريل كمبودي' },
  { code: 'MOP', name: 'Macanese Pataca', nameAr: 'باتاكا ماكاوية' },
  { code: 'TWD', name: 'Taiwan Dollar', nameAr: 'دولار تايواني' },
  { code: 'FJD', name: 'Fiji Dollar', nameAr: 'دولار فيجي' },
  { code: 'PGK', name: 'Papua New Guinea Kina', nameAr: 'كينا بابوا غينيا الجديدة' },
  { code: 'SBD', name: 'Solomon Islands Dollar', nameAr: 'دولار جزر سليمان' },
  { code: 'TOP', name: 'Tongan Paanga', nameAr: 'بانغا تونغي' },
  { code: 'WST', name: 'Samoan Tala', nameAr: 'تالا ساموي' },
  { code: 'VUV', name: 'Vanuatu Vatu', nameAr: 'فاتو فانواتي' },
  { code: 'XPF', name: 'CFP Franc', nameAr: 'فرنك بولينيزي' },
  { code: 'BND', name: 'Brunei Dollar', nameAr: 'دولار بروني' },
  // MENA Region
  { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي' },
  { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي' },
  { code: 'QAR', name: 'Qatari Riyal', nameAr: 'ريال قطري' },
  { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني' },
  { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي' },
  { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'دينار بحريني' },
  { code: 'JOD', name: 'Jordanian Dinar', nameAr: 'دينار أردني' },
  { code: 'LBP', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية' },
  { code: 'EGP', name: 'Egyptian Pound', nameAr: 'جنيه مصري' },
  { code: 'YER', name: 'Yemeni Rial', nameAr: 'ريال يمني' },
  { code: 'IQD', name: 'Iraqi Dinar', nameAr: 'دينار عراقي' },
  { code: 'SYP', name: 'Syrian Pound', nameAr: 'ليرة سورية' },
  { code: 'IRR', name: 'Iranian Rial', nameAr: 'ريال إيراني' },
  { code: 'ILS', name: 'Israeli Shekel', nameAr: 'شيقل إسرائيلي' },
  { code: 'TND', name: 'Tunisian Dinar', nameAr: 'دينار تونسي' },
  { code: 'MAD', name: 'Moroccan Dirham', nameAr: 'درهم مغربي' },
  { code: 'DZD', name: 'Algerian Dinar', nameAr: 'دينار جزائري' },
  { code: 'SDG', name: 'Sudanese Pound', nameAr: 'جنيه سوداني' },
  { code: 'AFN', name: 'Afghan Afghani', nameAr: 'أفغاني أفغاني' },
  // Europe
  { code: 'NOK', name: 'Norwegian Krone', nameAr: 'كرونة نرويجية' },
  { code: 'SEK', name: 'Swedish Krona', nameAr: 'كرونة سويدية' },
  { code: 'DKK', name: 'Danish Krone', nameAr: 'كرونة دنماركية' },
  { code: 'TRY', name: 'Turkish Lira', nameAr: 'ليرة تركية' },
  { code: 'RUB', name: 'Russian Ruble', nameAr: 'روبل روسي' },
  { code: 'BAM', name: 'Bosnia and Herzegovina Convertible Mark', nameAr: 'مارك بوسني' },
  { code: 'HRK', name: 'Croatian Kuna', nameAr: 'كونا كرواتية' },
  { code: 'RSD', name: 'Serbian Dinar', nameAr: 'دينار صربي' },
  { code: 'BGN', name: 'Bulgarian Lev', nameAr: 'ليف بلغاري' },
  { code: 'RON', name: 'Romanian Leu', nameAr: 'ليو روماني' },
  { code: 'HUF', name: 'Hungarian Forint', nameAr: 'فورينت مجري' },
  { code: 'PLN', name: 'Polish Zloty', nameAr: 'زلوتي بولندي' },
  { code: 'CZK', name: 'Czech Koruna', nameAr: 'كرونة تشيكية' },
  { code: 'SKK', name: 'Slovak Koruna', nameAr: 'كرونة سلوفاكية' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', nameAr: 'هريفنيا أوكرانية' },
  { code: 'BYR', name: 'Belarusian Ruble', nameAr: 'روبل بيلاروسي' },
  { code: 'ALL', name: 'Albanian Lek', nameAr: 'ليك ألباني' },
  { code: 'MKD', name: 'Macedonian Denar', nameAr: 'دينار مقدوني' },
  // Central Asia
  { code: 'KZT', name: 'Kazakhstani Tenge', nameAr: 'تنغ كازاخستاني' },
  { code: 'UZS', name: 'Uzbekistani Som', nameAr: 'سوم أوزبكي' },
  { code: 'TJS', name: 'Tajikistani Somoni', nameAr: 'سوموني طاجيكي' },
  { code: 'KGS', name: 'Kyrgyzstani Som', nameAr: 'سوم قيرغيزي' },
  { code: 'MNT', name: 'Mongolian Tugrik', nameAr: 'توغريك منغولي' },
  { code: 'AZN', name: 'Azerbaijani Manat', nameAr: 'مانات أذربيجاني' },
  { code: 'GEL', name: 'Georgian Lari', nameAr: 'لاري جورجي' },
  { code: 'AMD', name: 'Armenian Dram', nameAr: 'درام أرميني' },
  // South Asia
  { code: 'PKR', name: 'Pakistani Rupee', nameAr: 'روبية باكستانية' },
  { code: 'BDT', name: 'Bangladeshi Taka', nameAr: 'تاكا بنغلاديشية' },
  { code: 'LKR', name: 'Sri Lankan Rupee', nameAr: 'روبية سريلانكية' },
  { code: 'NPR', name: 'Nepalese Rupee', nameAr: 'روبية نيبالية' },
  { code: 'BTN', name: 'Bhutanese Ngultrum', nameAr: 'نجولتروم بوتاني' },
  { code: 'MVR', name: 'Maldivian Rufiyaa', nameAr: 'روفية مالديفية' },
  // Africa
  { code: 'NGN', name: 'Nigerian Naira', nameAr: 'نيرة نيجيرية' },
  { code: 'KES', name: 'Kenyan Shilling', nameAr: 'شلن كيني' },
  { code: 'ZAR', name: 'South African Rand', nameAr: 'راند جنوب أفريقي' },
  { code: 'GMD', name: 'Gambian Dalasi', nameAr: 'دالاسي جامبي' },
  { code: 'MUR', name: 'Mauritian Rupee', nameAr: 'روبية موريشيوسية' },
  { code: 'SCR', name: 'Seychellois Rupee', nameAr: 'روبية سيشيلية' },
  { code: 'SZL', name: 'Eswatini Lilangeni', nameAr: 'إيمالانجيني إسواتيني' },
  { code: 'LSL', name: 'Lesotho Loti', nameAr: 'لوتي ليسوتو' },
  { code: 'BWP', name: 'Botswana Pula', nameAr: 'بولا بوتسواني' },
  { code: 'NAD', name: 'Namibian Dollar', nameAr: 'دولار ناميبي' },
  { code: 'GHS', name: 'Ghanaian Cedi', nameAr: 'سيدي غاني' },
  { code: 'LRD', name: 'Liberian Dollar', nameAr: 'دولار ليبيري' },
  { code: 'SLL', name: 'Sierra Leonean Leone', nameAr: 'ليون سيراليوني' },
  { code: 'GNF', name: 'Guinean Franc', nameAr: 'فرنك غيني' },
  { code: 'MWK', name: 'Malawian Kwacha', nameAr: 'كواشا ملاوي' },
  { code: 'MZN', name: 'Mozambican Metical', nameAr: 'متيكال موزمبيقي' },
  { code: 'RWF', name: 'Rwandan Franc', nameAr: 'فرنك رواندي' },
  { code: 'TZS', name: 'Tanzanian Shilling', nameAr: 'شلن تنزاني' },
  { code: 'UGX', name: 'Ugandan Shilling', nameAr: 'شلن أوغندي' },
  { code: 'ZMW', name: 'Zambian Kwacha', nameAr: 'كواشا زامبية' },
  { code: 'ZWL', name: 'Zimbabwean Dollar', nameAr: 'دولار زمبابوي' },
  { code: 'ETB', name: 'Ethiopian Birr', nameAr: 'بير إثيوبي' },
  { code: 'ERN', name: 'Eritrean Nakfa', nameAr: 'ناكفا إريتري' },
  { code: 'XOF', name: 'West African CFA Franc', nameAr: 'فرنك سيفا غرب أفريقي' },
  { code: 'XAF', name: 'Central African CFA Franc', nameAr: 'فرنك سيفا وسط أفريقي' },
  { code: 'CFA', name: 'CFA Franc', nameAr: 'فرنك سيفا' },
  // Caribbean & Other
  { code: 'ANG', name: 'Netherlands Antillean Guilder', nameAr: 'غيلدر هولندي' },
  { code: 'SRD', name: 'Surinamese Dollar', nameAr: 'دولار سورينامي' },
  { code: 'GYD', name: 'Guyanese Dollar', nameAr: 'دولار غيانا' },
  { code: 'FKP', name: 'Falkland Islands Pound', nameAr: 'جنيه جزر فوكلاند' },
  { code: 'GIP', name: 'Gibraltar Pound', nameAr: 'جنيه جبل طارق' },
  { code: 'SHP', name: 'Saint Helena Pound', nameAr: 'جنيه سانت هيلينا' },
  { code: 'HTG', name: 'Haitian Gourde', nameAr: 'جورد هايتي' },
  { code: 'DOP', name: 'Dominican Peso', nameAr: 'بيزو دومينيكاني' },
  { code: 'CUP', name: 'Cuban Peso', nameAr: 'بيزو كوبي' },
  { code: 'CUC', name: 'Cuban Convertible Peso', nameAr: 'بيزو كوبي قابل للتحويل' },
];

export function BudgetInformationSection({
  isRTL,
  formData,
  setFormData,
  selectedBudgetId,
  selectedBudgetLine,
  budgetLinesData,
  remainingBudget,
  budgetUtilizationPercent,
  isLocked,
}: BudgetInformationSectionProps) {
  const { t } = useTranslation();

  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // Use global currency list (hardcoded - all 128 currencies)
  const currencies: CurrencyRecord[] = GLOBAL_CURRENCIES;
  const currenciesLoading = false;

  // Build dropdown options from currencyFormatter with bilingual support
  const currencyOptions: CurrencyOption[] = currencies
  .filter((currency: CurrencyRecord) => currency && currency.code)
  .map((currency: CurrencyRecord) => {

    const label = isRTL && currency.nameAr
      ? `${currency.code} - ${currency.nameAr}`
      : `${currency.code} - ${currency.name}`;

    return {
      value: currency.code,
      label,
      labelAr: currency.nameAr
        ? `${currency.code} - ${currency.nameAr}`
        : undefined,
      symbol: currency.symbol,
    };
  })
  .sort((a: CurrencyOption, b: CurrencyOption) =>
    a.value.localeCompare(b.value)
  );

  // =========================
  // Auto fetch exchange rate
  // =========================
  useEffect(() => {
    if (
      formData.currency &&
      formData.currency !== "USD" &&
      formData.exchangeTo &&
      formData.exchangeTo !== formData.currency
    ) {
      fetchExchangeRate();
    }
  }, [formData.exchangeTo, formData.currency]);

  const fetchExchangeRate = async () => {
    if (!formData.currency || !formData.exchangeTo) {
      return;
    }

    setIsLoadingRate(true);

    try {
      const response = await fetch(
        "/api/trpc/exchangeRates.getRealtimeRate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            input: {
              fromCurrency: formData.currency,
              toCurrency: formData.exchangeTo,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data?.result?.rate) {
          setFormData((prev: any) => ({
            ...prev,
            exchangeRate: data.result.rate,
          }));
        }
      }
    } catch (error) {
      console.error(
        "Failed to fetch exchange rate:",
        error
      );
    } finally {
      setIsLoadingRate(false);
    }
  };

  // =========================
  // Conversion Preview
  // =========================
  const conversionPreview = () => {
    if (
      !formData.totalBudgetLine ||
      !formData.exchangeRate ||
      !formData.currency ||
      !formData.exchangeTo
    ) {
      return null;
    }

    const originalAmount = parseFloat(
      formData.totalBudgetLine
    );

    const rate = parseFloat(
      formData.exchangeRate
    );

    const convertedAmount =
      originalAmount * rate;

    return `${formData.currency} ${originalAmount.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )} × ${rate.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    })} = ${formData.exchangeTo} ${convertedAmount.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  return (
    <div
      className="space-y-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

        {/* Budget Line */}
        <div>
          <Label>
            {t.logistics.budgetLine}
          </Label>

          <select
            value={String(
              formData.budgetLineId || ""
            )}
            onChange={(e) => {
              const lineId = parseInt(
                e.target.value
              );

              const selectedLine =
                budgetLinesData?.find(
                  (line) => line.id === lineId
                );

              const remainingAmount =
                selectedLine
                  ? selectedLine.availableBalance || 0
                  : 0;

              setFormData((prev: any) => ({
                ...prev,
                budgetLineId: lineId,
                totalBudgetLine:
                  remainingAmount.toString(),
                subBudgetLine:
                  selectedLine?.description ||
                  selectedLine?.descriptionAr ||
                  "",
                activityName:
                  selectedLine?.activityName ||
                  "",
              }));
            }}
            disabled={
              !selectedBudgetId || isLocked
            }
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {t.logistics.selectBudgetLine}
            </option>

            {formData.budgetLineId &&
              !budgetLinesData?.find(
                (bl) =>
                  bl.id ===
                  formData.budgetLineId
              ) && (
                <option
                  key={formData.budgetLineId}
                  value={String(
                    formData.budgetLineId
                  )}
                >
                  {formData.subBudgetLine ||
                    `Line ${formData.budgetLineId}`}
                </option>
              )}

            {budgetLinesData?.map((line) => (
              <option
                key={line.id}
                value={String(line.id)}
              >
                {line.description ||
                  line.descriptionAr ||
                  `Line ${line.lineCode}`}
              </option>
            ))}
          </select>
        </div>

        {/* Remaining Budget */}
        {selectedBudgetLine && (
          <div>
            <Label>
              {t.logistics.remainingBudget}
            </Label>

            <Input
              type="text"
              value={`${formData.currency} ${remainingBudget.toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}`}
              readOnly
              className="bg-muted"
            />
          </div>
        )}

        {/* Currency */}
        <div>
          <Label>
            {t.logistics.currency}
          </Label>

          <Input
            type="text"
            value={formData.currency || "USD"}
            readOnly
            className="bg-muted"
          />
        </div>
      </div>

      {/* Row 2 */}
      {formData.currency && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Exchange Rate */}
            <div>
              <Label>
                {t.logistics.exchangeRate}
              </Label>

              <div className="relative">
                <Input
                  type="number"
                  step="0.000001"
                  value={
                    formData.exchangeRate || 1
                  }
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      exchangeRate:
                        parseFloat(
                          e.target.value
                        ) || 1,
                    }))
                  }
                  disabled={isLocked}
                  placeholder="1.0"
                />

                {isLoadingRate && (
                  <Loader2 className="absolute end-3 top-3 h-4 w-4 animate-spin text-primary" />
                )}
              </div>
            </div>

            {/* Exchange To */}
            <div>
              <Label>
                {t.logistics.exchangeTo}
              </Label>

              <select
                value={formData.exchangeTo || "USD"}
                onChange={(e) => {
                  setFormData((prev: any) => ({
                    ...prev,
                    exchangeTo: e.target.value,
                  }));
                }}
                disabled={isLocked}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currencyOptions.map((opt: CurrencyOption) => (
                  <option key={opt.value} value={opt.value}>
                    {isRTL && opt.labelAr ? opt.labelAr : opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Total */}
            <div>
              <Label>
                {t.logistics.total}
              </Label>

              <Input
                type="text"
                value={`${
                  formData.exchangeTo ||
                  "USD"
                } ${
                  formData.total
                    ? parseFloat(
                        formData.total
                      ).toLocaleString(
                        "en-US",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )
                    : "0.00"
                }`}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* Conversion Preview */}
          {conversionPreview() && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {
                  t.logistics
                    .conversionPreview
                }{" "}
                <span className="font-semibold">
                  {conversionPreview()}
                </span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
