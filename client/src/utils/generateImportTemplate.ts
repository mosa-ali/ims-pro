/**
 * Generate Import Template Utility
 * Creates downloadable CSV templates for bulk importing funding opportunities
 */

interface TemplateOptions {
  includeSampleData?: boolean;
  language?: 'en' | 'ar';
}

/**
 * Generate CSV template headers
 */
function getTemplateHeaders(language: 'en' | 'ar' = 'en'): string[] {
  const headers = {
    en: [
      'Donor Name',
      'Donor Type',
      'Interest Areas',
      'Geographic Areas',
      'Application Deadline',
      'Allocated Budget',
      'Currency',
      'Co-Funding',
      'CFP Link',
      'Application Link',
      'Project Manager Name',
      'Project Manager Email',
      'Notes',
    ],
    ar: [
      'اسم المانح',
      'نوع المانح',
      'مجالات الاهتمام',
      'المناطق الجغرافية',
      'موعد التقديم',
      'الميزانية المخصصة',
      'العملة',
      'تمويل مشترك',
      'رابط CFP',
      'رابط التقديم',
      'اسم مدير المشروع',
      'بريد مدير المشروع',
      'ملاحظات',
    ],
  };

  return headers[language];
}

/**
 * Generate sample data rows
 */
function getSampleData(language: 'en' | 'ar' = 'en'): string[][] {
  const samples = {
    en: [
      [
        'UNICEF',
        'UN',
        'Education; Health',
        'Yemen',
        '2026-04-30',
        '100000',
        'USD',
        'No',
        'https://unicef.org/cfp',
        'https://unicef.org/apply',
        'John Doe',
        'john@example.com',
        'Priority funding for education programs',
      ],
      [
        'European Commission',
        'EU',
        'WASH; Nutrition',
        'Lebanon',
        '2026-05-15',
        '250000',
        'EUR',
        'Yes',
        'https://ec.europa.eu/cfp',
        'https://ec.europa.eu/apply',
        'Jane Smith',
        'jane@example.com',
        'Co-funding required, minimum 20% local contribution',
      ],
      [
        'World Food Programme',
        'UN',
        'Food Security; Livelihoods',
        'Syria',
        '2026-06-01',
        '500000',
        'USD',
        'No',
        'https://wfp.org/cfp',
        'https://wfp.org/apply',
        'Ahmed Hassan',
        'ahmed@example.com',
        'Emergency response funding',
      ],
    ],
    ar: [
      [
        'اليونيسيف',
        'UN',
        'التعليم; الصحة',
        'اليمن',
        '2026-04-30',
        '100000',
        'USD',
        'No',
        'https://unicef.org/cfp',
        'https://unicef.org/apply',
        'محمد علي',
        'mohammad@example.com',
        'تمويل أولوي لبرامج التعليم',
      ],
      [
        'المفوضية الأوروبية',
        'EU',
        'المياه والصرف الصحي; التغذية',
        'لبنان',
        '2026-05-15',
        '250000',
        'EUR',
        'Yes',
        'https://ec.europa.eu/cfp',
        'https://ec.europa.eu/apply',
        'فاطمة محمد',
        'fatima@example.com',
        'يتطلب تمويل مشترك، الحد الأدنى 20% مساهمة محلية',
      ],
      [
        'برنامج الغذاء العالمي',
        'UN',
        'الأمن الغذائي; سبل العيش',
        'سوريا',
        '2026-06-01',
        '500000',
        'USD',
        'No',
        'https://wfp.org/cfp',
        'https://wfp.org/apply',
        'علي حسن',
        'ali@example.com',
        'تمويل الاستجابة للطوارئ',
      ],
    ],
  };

  return samples[language];
}

/**
 * Generate instructions/guide for the template
 */
function getInstructions(language: 'en' | 'ar' = 'en'): string {
  const instructions = {
    en: `# Funding Opportunities Import Template

## Instructions:
1. Fill in the required fields for each opportunity (marked with *)
2. Multiple values in "Interest Areas" should be separated by semicolons (;)
3. Date format must be YYYY-MM-DD (e.g., 2026-04-30)
4. Budget must be a number without currency symbols
5. Co-Funding must be "Yes" or "No"
6. URLs must start with http:// or https://
7. Empty cells are allowed for optional fields
8. Save the file as CSV format before uploading

## Field Descriptions:
- Donor Name*: Name of the funding organization
- Donor Type*: UN, EU, INGO, Foundation, Government, or Other
- Interest Areas*: Sectors of interest (e.g., Education; Health; WASH)
- Geographic Areas*: Target regions or countries
- Application Deadline*: Last date to submit (YYYY-MM-DD)
- Allocated Budget: Total funding amount available
- Currency: USD, EUR, GBP, CHF, or other
- Co-Funding: Whether co-funding is required
- CFP Link: URL to Call for Proposals document
- Application Link: URL to application portal
- Project Manager Name: Contact person name
- Project Manager Email: Contact person email
- Notes: Additional information or requirements

## Tips:
- Use the sample rows below as a reference
- Delete sample rows before uploading
- Ensure no duplicate entries
- Check all dates are in correct format
- Verify email addresses are valid`,
    ar: `# قالب استيراد فرص التمويل

## التعليمات:
1. ملء الحقول المطلوبة لكل فرصة (المحددة بـ *)
2. يجب فصل القيم المتعددة في "مجالات الاهتمام" بفواصل منقوطة (;)
3. يجب أن يكون تنسيق التاريخ YYYY-MM-DD (مثال: 2026-04-30)
4. يجب أن تكون الميزانية رقماً بدون رموز العملة
5. يجب أن يكون التمويل المشترك "Yes" أو "No"
6. يجب أن تبدأ عناوين URL بـ http:// أو https://
7. الخلايا الفارغة مقبولة للحقول الاختيارية
8. احفظ الملف بصيغة CSV قبل التحميل

## وصف الحقول:
- اسم المانح*: اسم منظمة التمويل
- نوع المانح*: UN أو EU أو INGO أو Foundation أو Government أو Other
- مجالات الاهتمام*: قطاعات الاهتمام (مثال: التعليم; الصحة; المياه والصرف الصحي)
- المناطق الجغرافية*: المناطق أو الدول المستهدفة
- موعد التقديم*: آخر تاريخ للتقديم (YYYY-MM-DD)
- الميزانية المخصصة: إجمالي مبلغ التمويل المتاح
- العملة: USD أو EUR أو GBP أو CHF أو غيرها
- تمويل مشترك: ما إذا كان التمويل المشترك مطلوباً
- رابط CFP: رابط وثيقة طلب العروض
- رابط التقديم: رابط بوابة التقديم
- اسم مدير المشروع: اسم الشخص المسؤول
- بريد مدير المشروع: بريد الشخص المسؤول
- ملاحظات: معلومات أو متطلبات إضافية

## نصائح:
- استخدم الصفوف النموذجية أدناه كمرجع
- احذف الصفوف النموذجية قبل التحميل
- تأكد من عدم وجود إدخالات مكررة
- تحقق من أن جميع التواريخ بالتنسيق الصحيح
- تحقق من صحة عناوين البريد الإلكتروني`,
  };

  return instructions[language];
}

/**
 * Generate CSV template with optional sample data
 */
export function generateTemplateCSV(options: TemplateOptions = {}): string {
  const { includeSampleData = true, language = 'en' } = options;

  const headers = getTemplateHeaders(language);
  const headerRow = headers.map((h) => `"${h}"`).join(',');

  let csv = headerRow + '\n';

  if (includeSampleData) {
    const samples = getSampleData(language);
    samples.forEach((row) => {
      const csvRow = row.map((cell) => `"${cell}"`).join(',');
      csv += csvRow + '\n';
    });
  }

  return csv;
}

/**
 * Generate template file and trigger download
 */
export function downloadTemplate(options: TemplateOptions = {}): void {
  const { language = 'en' } = options;

  const csv = generateTemplateCSV(options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const filename = `funding-opportunities-template-${language}-${new Date()
    .toISOString()
    .split('T')[0]}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate template with instructions (for display in modal)
 */
export function getTemplateWithInstructions(
  language: 'en' | 'ar' = 'en'
): { instructions: string; template: string } {
  return {
    instructions: getInstructions(language),
    template: generateTemplateCSV({ includeSampleData: true, language }),
  };
}

/**
 * Get template metadata
 */
export function getTemplateMetadata(): {
  version: string;
  lastUpdated: string;
  requiredFields: string[];
  optionalFields: string[];
  supportedDonorTypes: string[];
  supportedCurrencies: string[];
} {
  return {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    requiredFields: [
      'Donor Name',
      'Donor Type',
      'Interest Areas',
      'Geographic Areas',
      'Application Deadline',
    ],
    optionalFields: [
      'Allocated Budget',
      'Currency',
      'Co-Funding',
      'CFP Link',
      'Application Link',
      'Project Manager Name',
      'Project Manager Email',
      'Notes',
    ],
    supportedDonorTypes: ['UN', 'EU', 'INGO', 'Foundation', 'Government', 'Other'],
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CHF', 'YER', 'SAR', 'AED', 'JOD', 'EGP'],
  };
}
