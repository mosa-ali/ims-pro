/**
 * ============================================================================
 * SURVEY EXPORT
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Comprehensive export interface with format selection and options
 * 
 * FEATURES:
 * - Survey form selection
 * - Format selection (Excel, CSV, PDF)
 * - Export options (include audit trail)
 * - Export info panel
 * - Compliance notice
 * - Loading states
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';

export function SurveyExport() {
  const [, navigate] = useLocation();
  const { language, isRTL } = useLanguage();
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [selectedSurvey, setSelectedSurvey] = useState<number | null>(null);
  const [includeAudit, setIncludeAudit] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const t = {
    title: language === 'en' ? '📥 Export Survey Data' : '📥 تصدير بيانات الاستطلاع',
    subtitle: language === 'en' ? 'Generate donor-ready reports in multiple formats' : 'إنشاء تقارير جاهزة للمانحين بصيغ متعددة',
    back: language === 'en' ? 'Back' : 'رجوع',
    step1: language === 'en' ? '1. Select Survey Form' : '1. اختر نموذج الاستطلاع',
    step2: language === 'en' ? '2. Select Export Format' : '2. اختر صيغة التصدير',
    step3: language === 'en' ? '3. Export Options' : '3. خيارات التصدير',
    excel: language === 'en' ? 'Excel (.xlsx)' : 'Excel (.xlsx)',
    excelDesc: language === 'en' ? 'Multi-sheet workbook with metadata, raw data, disaggregation, and audit trail' : 'مصنف متعدد الأوراق مع البيانات الوصفية، البيانات الخام، التفصيل، ومسار التدقيق',
    csv: language === 'en' ? 'CSV (.csv)' : 'CSV (.csv)',
    csvDesc: language === 'en' ? 'Flat format compatible with most analysis tools' : 'صيغة مسطحة متوافقة مع معظم أدوات التحليل',
    pdf: language === 'en' ? 'PDF Report (.pdf)' : 'تقرير PDF (.pdf)',
    pdfDesc: language === 'en' ? 'Formatted report with charts and summary statistics' : 'تقرير منسق مع رسوم بيانية وإحصائيات موجزة',
    includeAudit: language === 'en' ? 'Include Audit Trail' : 'تضمين مسار التدقيق',
    includeAuditDesc: language === 'en' ? 'Add submission details, verifier info, and import metadata' : 'إضافة تفاصيل التقديم، معلومات المدقق، وبيانات الاستيراد الوصفية',
    exportDetails: language === 'en' ? '📌 Export Details' : '📌 تفاصيل التصدير',
    detailsList: language === 'en'
      ? '• Only completed and verified submissions are included\n• Soft-deleted submissions are automatically excluded\n• All exports are logged for compliance and audit purposes\n• KOBO-compatible format ensures donor compatibility\n• Includes disaggregation by gender, age, location, and disability'
      : '• يتم تضمين التقديمات المكتملة والموثقة فقط\n• يتم استبعاد التقديمات المحذوفة تلقائياً\n• يتم تسجيل جميع عمليات التصدير لأغراض الامتثال والتدقيق\n• تضمن صيغة KOBO التوافق مع المانحين\n• يشمل التفصيل حسب الجنس، العمر، الموقع، والإعاقة',
    generateExport: language === 'en' ? '⬇️ Generate & Download Export' : '⬇️ إنشاء وتنزيل التصدير',
    generating: language === 'en' ? 'Generating Export...' : 'جاري إنشاء التصدير...',
    compliance: language === 'en' ? '🔒 Compliance & Data Protection' : '🔒 الامتثال وحماية البيانات',
    complianceText: language === 'en'
      ? 'This export complies with donor requirements and data protection standards. All exports are:\n• Logged with timestamp, user, and format\n• Restricted to verified submissions only\n• Compatible with KOBO and ODK platforms\n• Encrypted during transmission\n• Retained in audit trail for 2 years'
      : 'يتوافق هذا التصدير مع متطلبات المانحين ومعايير حماية البيانات. جميع عمليات التصدير:\n• مسجلة بالطابع الزمني، المستخدم، والصيغة\n• مقصورة على التقديمات الموثقة فقط\n• متوافقة مع منصات KOBO وODK\n• مشفرة أثناء النقل\n• محفوظة في مسار التدقيق لمدة عامين',
  };

  // Mock survey forms
  const surveyForms = [
    { id: 1, title: language === 'en' ? 'Beneficiary Satisfaction Survey' : 'استطلاع رضا المستفيدين', description: language === 'en' ? 'Q1 2025' : 'الربع الأول 2025' },
    { id: 2, title: language === 'en' ? 'Service Quality Assessment' : 'تقييم جودة الخدمة', description: language === 'en' ? 'Monthly' : 'شهري' },
  ];

  const formats = [
    { format: 'excel' as const, label: t.excel, description: t.excelDesc, icon: FileSpreadsheet, color: 'text-green-600' },
    { format: 'csv' as const, label: t.csv, description: t.csvDesc, icon: FileText, color: 'text-blue-600' },
    { format: 'pdf' as const, label: t.pdf, description: t.pdfDesc, icon: FileText, color: 'text-red-600' },
  ];

  const handleExport = () => {
    if (!selectedSurvey) {
      alert(language === 'en' ? 'Please select a survey form' : 'يرجى اختيار نموذج استطلاع');
      return;
    }

    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(language === 'en' ? '✓ Export successful!' : '✓ نجح التصدير!');
    }, 2000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-semibold text-blue-600">{t.back}</span>
        </button>
      </div>

      {/* Survey Selection */}
      <div>
        <h3 className={`text-lg font-bold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.step1}
        </h3>
        <div className="space-y-2">
          {surveyForms.map((form) => (
            <button
              key={form.id}
              onClick={() => setSelectedSurvey(form.id)}
              className={`w-full p-4 rounded-lg border flex items-center justify-between transition-colors ${
                selectedSurvey === form.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className={`font-semibold ${selectedSurvey === form.id ? 'text-blue-600' : 'text-gray-900'}`}>
                  {form.title}
                </p>
                <p className="text-xs text-gray-600 mt-1">{form.description}</p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedSurvey === form.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}
              >
                {selectedSurvey === form.id && <span className="text-white text-xs">✓</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Format Selection */}
      <div>
        <h3 className={`text-lg font-bold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.step2}
        </h3>
        <div className="space-y-2">
          {formats.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.format}
                onClick={() => setSelectedFormat(option.format)}
                className={`w-full p-4 rounded-lg border flex items-center justify-between transition-colors ${
                  selectedFormat === option.format
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:bg-gray-50'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Icon className={`w-5 h-5 ${option.color}`} />
                    <p className={`font-semibold ${selectedFormat === option.format ? 'text-blue-600' : 'text-gray-900'}`}>
                      {option.label}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedFormat === option.format ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                  }`}
                >
                  {selectedFormat === option.format && <span className="text-white text-xs">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Options */}
      <div>
        <h3 className={`text-lg font-bold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.step3}
        </h3>
        <button
          onClick={() => setIncludeAudit(!includeAudit)}
          className={`w-full p-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="font-semibold text-gray-900">{t.includeAudit}</p>
            <p className="text-xs text-gray-600 mt-1">{t.includeAuditDesc}</p>
          </div>
          <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
              includeAudit ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
            }`}
          >
            {includeAudit && <span className="text-white text-xs">✓</span>}
          </div>
        </button>
      </div>

      {/* Export Info */}
      <div className="p-4 rounded-lg bg-white border border-gray-200">
        <p className={`text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.exportDetails}
        </p>
        <p className={`text-xs text-gray-600 leading-relaxed whitespace-pre-line ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.detailsList}
        </p>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={!selectedSurvey || isExporting}
        className={`w-full p-4 rounded-lg flex items-center justify-center transition-colors ${
          selectedSurvey && !isExporting
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isExporting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-semibold">{t.generating}</span>
          </span>
        ) : (
          <span className="font-semibold text-lg">{t.generateExport}</span>
        )}
      </button>

      {/* Compliance Notice */}
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
        <p className={`text-xs font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.compliance}
        </p>
        <p className={`text-xs text-gray-600 leading-relaxed whitespace-pre-line ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.complianceText}
        </p>
      </div>
    </div>
  );
}
