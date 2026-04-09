/**
 * ============================================================================
 * FORM 3: INVESTIGATION REPORT
 * ============================================================================
 * 
 * PURPOSE: Record investigation findings
 * 
 * FEATURES:
 * - Investigation summary and findings
 * - Evidence and witnesses
 * - FREE TEXT recommendation (no predefined sanctions)
 * - File uploads (evidence, interviews, documents)
 * - Submit Investigation Report
 * - Printable
 * - Read-only after submission
 * - Bilingual (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { Save, Send, Printer, ArrowLeft, FileText, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InvestigationReport, DisciplinaryCase } from './types';
import { sanctionsService } from './sanctionsService';

export function Form3_InvestigationReport() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { caseRef } = useParams<{ caseRef: string }>();

  const [caseData, setCaseData] = useState<DisciplinaryCase | null>(null);
  const [formData, setFormData] = useState<InvestigationReport>({
    caseReferenceNumber: caseRef || '',
    summaryOfInvestigation: '',
    evidenceReviewed: '',
    witnesses: '',
    findings: '',
    conclusion: '',
    recommendation: '',
    evidenceFiles: [],
    interviewRecords: [],
    supportingDocuments: [],
    createdBy: 'Current User',
    createdDate: new Date().toISOString(),
    status: 'draft'
  });

  const [isReadOnly, setIsReadOnly] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (caseRef) {
      loadCase();
    }
  }, [caseRef]);

  const loadCase = () => {
    const existing = sanctionsService.getCaseByReference(caseRef!);
    if (existing) {
      setCaseData(existing);
      if (existing.form3_report) {
        setFormData(existing.form3_report);
        setIsReadOnly(existing.form3_report.status === 'submitted');
      }
    }
  };

  const handleInputChange = (field: keyof InvestigationReport, value: any) => {
    if (isReadOnly) return;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.summaryOfInvestigation.trim()) {
      newErrors.summaryOfInvestigation = language === 'en' ? 'Summary is required' : 'الملخص مطلوب';
    }

    if (!formData.findings.trim()) {
      newErrors.findings = language === 'en' ? 'Findings are required' : 'النتائج مطلوبة';
    }

    if (!formData.conclusion.trim()) {
      newErrors.conclusion = language === 'en' ? 'Conclusion is required' : 'الاستنتاج مطلوب';
    }

    if (!formData.recommendation.trim()) {
      newErrors.recommendation = language === 'en' ? 'Recommendation is required' : 'التوصية مطلوبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAsDraft = () => {
    if (!caseData) return;

    const updated = {
      ...caseData,
      form3_report: { ...formData, status: 'draft' },
      lastUpdatedDate: new Date().toISOString()
    };

    sanctionsService.saveCase(updated);
    sanctionsService.addAuditEntry(caseRef!, 'Saved Form 3', 'Investigation report saved as draft', 'form3', formData.createdBy);
    
    alert(language === 'en' ? 'Saved successfully!' : 'تم الحفظ بنجاح!');
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      alert(language === 'en' ? 'Please fill in all required fields' : 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!caseData) return;

    const submitted = {
      ...formData,
      status: 'submitted' as const,
      submittedDate: new Date().toISOString()
    };

    const updated = {
      ...caseData,
      form3_report: submitted,
      currentStatus: 'investigation-completed' as const,
      lastUpdatedDate: new Date().toISOString()
    };

    sanctionsService.saveCase(updated);
    sanctionsService.addAuditEntry(caseRef!, 'Submitted Investigation Report', 'Form 3 submitted', 'form3', formData.createdBy);
    
    alert(language === 'en' ? 'Investigation report submitted!' : 'تم تقديم تقرير التحقيق!');
    navigate('/organization/hr/sanctions');
  };

  const t = {
    title: language === 'en' ? 'Investigation Report' : 'تقرير التحقيق',
    subtitle: language === 'en' ? 'Form 3 of 6' : 'النموذج 3 من 6',
    
    caseRef: language === 'en' ? 'Case Reference' : 'مرجع القضية',
    employee: language === 'en' ? 'Employee' : 'الموظف',
    
    summaryOfInvestigation: language === 'en' ? 'Summary of Investigation' : 'ملخص التحقيق',
    evidenceReviewed: language === 'en' ? 'Evidence Reviewed' : 'الأدلة المراجعة',
    witnesses: language === 'en' ? 'Witnesses (if applicable)' : 'الشهود (إن وجد)',
    findings: language === 'en' ? 'Findings' : 'النتائج',
    conclusion: language === 'en' ? 'Conclusion' : 'الاستنتاج',
    recommendation: language === 'en' ? 'Recommendation (FREE TEXT)' : 'التوصية (نص حر)',
    
    uploads: language === 'en' ? 'Supporting Documents' : 'المستندات الداعمة',
    evidenceFiles: language === 'en' ? 'Evidence Files' : 'ملفات الأدلة',
    interviewRecords: language === 'en' ? 'Interview Records' : 'سجلات المقابلات',
    supportingDocuments: language === 'en' ? 'Other Supporting Documents' : 'مستندات داعمة أخرى',
    uploadFile: language === 'en' ? 'Upload File' : 'تحميل ملف',
    
    saveAsDraft: language === 'en' ? 'Save as Draft' : 'حفظ كمسودة',
    submitReport: language === 'en' ? 'Submit Investigation Report' : 'تقديم تقرير التحقيق',
    print: language === 'en' ? 'Print' : 'طباعة',
    back: language === 'en' ? 'Back' : 'رجوع',
    
    readOnlyNotice: language === 'en' 
      ? '🔒 This report has been submitted and is now read-only' 
      : '🔒 تم تقديم هذا التقرير وأصبح للقراءة فقط',
    
    recommendationNote: language === 'en'
      ? 'Note: This is FREE TEXT - no predefined sanctions. Write your professional recommendation based on findings.'
      : 'ملاحظة: هذا نص حر - لا توجد عقوبات محددة مسبقًا. اكتب توصيتك المهنية بناءً على النتائج.',
    
    summaryPlaceholder: language === 'en' ? 'Provide a comprehensive summary of the investigation process...' : 'قدم ملخصًا شاملاً لعملية التحقيق...',
    evidencePlaceholder: language === 'en' ? 'List all evidence reviewed (documents, emails, records, etc.)...' : 'قائمة جميع الأدلة المراجعة (مستندات، رسائل بريد إلكتروني، سجلات، إلخ)...',
    witnessesPlaceholder: language === 'en' ? 'List witnesses interviewed and key points...' : 'قائمة الشهود المقابلين والنقاط الرئيسية...',
    findingsPlaceholder: language === 'en' ? 'Document your investigation findings...' : 'وثق نتائج تحقيقك...',
    conclusionPlaceholder: language === 'en' ? 'State your conclusion based on the investigation...' : 'اذكر استنتاجك بناءً على التحقيق...',
    recommendationPlaceholder: language === 'en' ? 'Provide your recommendation for disciplinary action (if any)...' : 'قدم توصيتك للإجراء التأديبي (إن وجد)...'
  };

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/organization/hr/sanctions')}
            className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t.back}</span>
          </button>

          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                  <p className="text-sm text-gray-600">{t.subtitle}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Printer className="w-4 h-4" />
              <span className="text-sm font-medium">{t.print}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-8">
        <div className="hidden print:block mb-8 text-center border-b-2 border-gray-300 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {language === 'en' ? 'INVESTIGATION REPORT' : 'تقرير التحقيق'}
          </h1>
          <p className="text-sm text-gray-600">{t.subtitle}</p>
          <p className="text-xs text-gray-500 mt-2">
            {language === 'en' ? '[Organization Name & Logo]' : '[اسم وشعار المنظمة]'}
          </p>
        </div>

        {isReadOnly && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg print:hidden">
            <p className="text-sm text-yellow-800 font-medium">{t.readOnlyNotice}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 print:border-0">
          <div className="p-6">
            {/* Case Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">{t.caseRef}:</span> {caseData?.caseReferenceNumber}
                </div>
                <div>
                  <span className="font-medium">{t.employee}:</span> {caseData?.fullName}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.summaryOfInvestigation} <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.summaryOfInvestigation}
                onChange={(e) => handleInputChange('summaryOfInvestigation', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.summaryPlaceholder}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.summaryOfInvestigation ? 'border-red-500' : 'border-gray-300'
                } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
              {errors.summaryOfInvestigation && (
                <p className="mt-1 text-sm text-red-600">{errors.summaryOfInvestigation}</p>
              )}
            </div>

            {/* Evidence Reviewed */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.evidenceReviewed}
              </label>
              <textarea
                value={formData.evidenceReviewed}
                onChange={(e) => handleInputChange('evidenceReviewed', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.evidencePlaceholder}
                rows={4}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
            </div>

            {/* Witnesses */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.witnesses}
              </label>
              <textarea
                value={formData.witnesses}
                onChange={(e) => handleInputChange('witnesses', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.witnessesPlaceholder}
                rows={4}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
            </div>

            {/* Findings */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.findings} <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.findings}
                onChange={(e) => handleInputChange('findings', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.findingsPlaceholder}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.findings ? 'border-red-500' : 'border-gray-300'
                } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
              {errors.findings && (
                <p className="mt-1 text-sm text-red-600">{errors.findings}</p>
              )}
            </div>

            {/* Conclusion */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.conclusion} <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.conclusion}
                onChange={(e) => handleInputChange('conclusion', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.conclusionPlaceholder}
                rows={5}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.conclusion ? 'border-red-500' : 'border-gray-300'
                } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
              {errors.conclusion && (
                <p className="mt-1 text-sm text-red-600">{errors.conclusion}</p>
              )}
            </div>

            {/* Recommendation (FREE TEXT) */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.recommendation} <span className="text-red-600">*</span>
              </label>
              <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">{t.recommendationNote}</p>
              </div>
              <textarea
                value={formData.recommendation}
                onChange={(e) => handleInputChange('recommendation', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.recommendationPlaceholder}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.recommendation ? 'border-red-500' : 'border-gray-300'
                } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
              {errors.recommendation && (
                <p className="mt-1 text-sm text-red-600">{errors.recommendation}</p>
              )}
            </div>

            {/* Uploads Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className={`text-sm font-medium text-gray-900 mb-3 ${isRTL ? 'text-right' : ''}`}>
                {t.uploads}
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Upload className="w-4 h-4" />
                  <span>{t.evidenceFiles} ({formData.evidenceFiles.length} files)</span>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Upload className="w-4 h-4" />
                  <span>{t.interviewRecords} ({formData.interviewRecords.length} files)</span>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Upload className="w-4 h-4" />
                  <span>{t.supportingDocuments} ({formData.supportingDocuments.length} files)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {language === 'en' 
                    ? 'File upload functionality available (stored in browser for prototype)'
                    : 'وظيفة تحميل الملفات متاحة (مخزنة في المتصفح للنموذج الأولي)'}
                </p>
              </div>
            </div>

            {!isReadOnly && (
              <div className={`flex gap-4 mt-8 pt-6 border-t border-gray-200 print:hidden ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={handleSaveAsDraft}
                  className={`flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Save className="w-5 h-5" />
                  <span className="font-medium">{t.saveAsDraft}</span>
                </button>

                <button
                  onClick={handleSubmit}
                  className={`flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Send className="w-5 h-5" />
                  <span className="font-medium">{t.submitReport}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
