/**
 * ============================================================================
 * FORM 4: DISCIPLINARY DECISION
 * ============================================================================
 * 
 * PURPOSE: Record management decision
 * 
 * CRITICAL: Final Disciplinary Action is FREE TEXT - NOT DROPDOWN!
 * 
 * FEATURES:
 * - Decision date and authority
 * - FREE TEXT final disciplinary action
 * - Justification
 * - Payroll impact toggle
 * - File uploads (signed letter, documents)
 * - Submit for Approval
 * - Printable
 * - Read-only after submission
 * - Bilingual (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { Save, Send, Printer, ArrowLeft, Gavel, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DisciplinaryDecision, DisciplinaryCase } from './types';
import { sanctionsService } from './sanctionsService';

export function Form4_DisciplinaryDecision() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { caseRef } = useParams<{ caseRef: string }>();

  const [caseData, setCaseData] = useState<DisciplinaryCase | null>(null);
  const [formData, setFormData] = useState<DisciplinaryDecision>({
    caseReferenceNumber: caseRef || '',
    decisionDate: new Date().toISOString().split('T')[0],
    decisionAuthority: '',
    finalDisciplinaryAction: '', // FREE TEXT - NOT DROPDOWN!
    justification: '',
    effectiveDate: '',
    payrollImpact: false,
    payrollImpactDescription: '',
    signedDisciplinaryLetter: [],
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
      if (existing.form4_decision) {
        setFormData(existing.form4_decision);
        setIsReadOnly(existing.form4_decision.status === 'submitted');
      }
    }
  };

  const handleInputChange = (field: keyof DisciplinaryDecision, value: any) => {
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

    if (!formData.decisionDate) {
      newErrors.decisionDate = language === 'en' ? 'Decision date is required' : 'تاريخ القرار مطلوب';
    }

    if (!formData.decisionAuthority.trim()) {
      newErrors.decisionAuthority = language === 'en' ? 'Decision authority is required' : 'سلطة القرار مطلوبة';
    }

    if (!formData.finalDisciplinaryAction.trim()) {
      newErrors.finalDisciplinaryAction = language === 'en' ? 'Final disciplinary action is required' : 'الإجراء التأديبي النهائي مطلوب';
    }

    if (!formData.justification.trim()) {
      newErrors.justification = language === 'en' ? 'Justification is required' : 'التبرير مطلوب';
    }

    if (!formData.effectiveDate) {
      newErrors.effectiveDate = language === 'en' ? 'Effective date is required' : 'تاريخ السريان مطلوب';
    }

    if (formData.payrollImpact && !formData.payrollImpactDescription.trim()) {
      newErrors.payrollImpactDescription = language === 'en' 
        ? 'Please describe payroll impact' 
        : 'يرجى وصف تأثير الرواتب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAsDraft = () => {
    if (!caseData) return;

    const updated = {
      ...caseData,
      form4_decision: { ...formData, status: 'draft' },
      lastUpdatedDate: new Date().toISOString()
    };

    sanctionsService.saveCase(updated);
    sanctionsService.addAuditEntry(caseRef!, 'Saved Form 4', 'Disciplinary decision saved as draft', 'form4', formData.createdBy);
    
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
      form4_decision: submitted,
      currentStatus: 'decision-pending' as const,
      lastUpdatedDate: new Date().toISOString()
    };

    sanctionsService.saveCase(updated);
    sanctionsService.addAuditEntry(caseRef!, 'Submitted for Approval', 'Form 4 submitted for approval', 'form4', formData.createdBy);
    
    alert(language === 'en' ? 'Decision submitted for approval!' : 'تم تقديم القرار للموافقة!');
    navigate('/organization/hr/sanctions');
  };

  const t = {
    title: language === 'en' ? 'Disciplinary Decision' : 'القرار التأديبي',
    subtitle: language === 'en' ? 'Form 4 of 6' : 'النموذج 4 من 6',
    
    caseRef: language === 'en' ? 'Case Reference' : 'مرجع القضية',
    employee: language === 'en' ? 'Employee' : 'الموظف',
    
    decisionDate: language === 'en' ? 'Decision Date' : 'تاريخ القرار',
    decisionAuthority: language === 'en' ? 'Decision Authority' : 'سلطة القرار',
    finalDisciplinaryAction: language === 'en' ? 'Final Disciplinary Action (FREE TEXT)' : 'الإجراء التأديبي النهائي (نص حر)',
    justification: language === 'en' ? 'Justification' : 'التبرير',
    effectiveDate: language === 'en' ? 'Effective Date' : 'تاريخ السريان',
    payrollImpact: language === 'en' ? 'Payroll Impact' : 'تأثير الرواتب',
    payrollImpactDescription: language === 'en' ? 'Describe Payroll Impact' : 'وصف تأثير الرواتب',
    
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    
    uploads: language === 'en' ? 'Documents' : 'المستندات',
    signedDisciplinaryLetter: language === 'en' ? 'Signed Disciplinary Letter' : 'خطاب تأديبي موقع',
    supportingDocuments: language === 'en' ? 'Supporting Documents' : 'مستندات داعمة',
    
    saveAsDraft: language === 'en' ? 'Save as Draft' : 'حفظ كمسودة',
    submitForApproval: language === 'en' ? 'Submit for Approval' : 'تقديم للموافقة',
    print: language === 'en' ? 'Print' : 'طباعة',
    back: language === 'en' ? 'Back' : 'رجوع',
    
    readOnlyNotice: language === 'en' 
      ? '🔒 This decision has been submitted and is now read-only' 
      : '🔒 تم تقديم هذا القرار وأصبح للقراءة فقط',
    
    freeTextWarning: language === 'en'
      ? '⚠️ IMPORTANT: This is FREE TEXT - NOT a dropdown. Write the exact disciplinary action decided by management.'
      : '⚠️ مهم: هذا نص حر - ليس قائمة منسدلة. اكتب الإجراء التأديبي الدقيق الذي قررته الإدارة.',
    
    actionPlaceholder: language === 'en' 
      ? 'e.g., Written warning, Suspension without pay for 5 days, Final warning, Termination, etc.' 
      : 'مثال: إنذار كتابي، إيقاف بدون أجر لمدة 5 أيام، إنذار نهائي، فصل، إلخ.',
    justificationPlaceholder: language === 'en' ? 'Provide detailed justification for this decision...' : 'قدم تبريرًا تفصيليًا لهذا القرار...',
    payrollPlaceholder: language === 'en' ? 'Describe the specific payroll changes (e.g., deductions, suspensions, etc.)...' : 'وصف التغييرات المحددة في الرواتب (مثل الخصومات، التعليقات، إلخ)...'
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
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-purple-600" />
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
            {language === 'en' ? 'DISCIPLINARY DECISION FORM' : 'نموذج القرار التأديبي'}
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

            {/* Decision Date & Authority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.decisionDate} <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.decisionDate}
                  onChange={(e) => handleInputChange('decisionDate', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.decisionDate ? 'border-red-500' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-100' : ''}`}
                />
                {errors.decisionDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.decisionDate}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.decisionAuthority} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.decisionAuthority}
                  onChange={(e) => handleInputChange('decisionAuthority', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.decisionAuthority ? 'border-red-500' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
                />
                {errors.decisionAuthority && (
                  <p className="mt-1 text-sm text-red-600">{errors.decisionAuthority}</p>
                )}
              </div>
            </div>

            {/* Final Disciplinary Action (FREE TEXT - CRITICAL!) */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.finalDisciplinaryAction} <span className="text-red-600">*</span>
              </label>
              
              {/* Warning Banner */}
              <div className="mb-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">{t.freeTextWarning}</p>
                </div>
              </div>

              <textarea
                value={formData.finalDisciplinaryAction}
                onChange={(e) => handleInputChange('finalDisciplinaryAction', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.actionPlaceholder}
                rows={4}
                className={`w-full px-3 py-2 border-2 rounded-lg font-medium ${
                  errors.finalDisciplinaryAction ? 'border-red-500' : 'border-purple-300'
                } ${isReadOnly ? 'bg-gray-100' : 'bg-purple-50'} ${isRTL ? 'text-right' : ''}`}
              />
              {errors.finalDisciplinaryAction && (
                <p className="mt-1 text-sm text-red-600">{errors.finalDisciplinaryAction}</p>
              )}
            </div>

            {/* Justification */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.justification} <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.justification}
                onChange={(e) => handleInputChange('justification', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.justificationPlaceholder}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.justification ? 'border-red-500' : 'border-gray-300'
                } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
              {errors.justification && (
                <p className="mt-1 text-sm text-red-600">{errors.justification}</p>
              )}
            </div>

            {/* Effective Date */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.effectiveDate} <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.effectiveDate ? 'border-red-500' : 'border-gray-300'
                } ${isReadOnly ? 'bg-gray-100' : ''}`}
              />
              {errors.effectiveDate && (
                <p className="mt-1 text-sm text-red-600">{errors.effectiveDate}</p>
              )}
            </div>

            {/* Payroll Impact */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className={`block text-sm font-medium text-gray-900 mb-3 ${isRTL ? 'text-right' : ''}`}>
                {t.payrollImpact}
              </label>
              
              <div className={`flex gap-6 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <label className={`flex items-center gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="radio"
                    checked={formData.payrollImpact === true}
                    onChange={() => handleInputChange('payrollImpact', true)}
                    disabled={isReadOnly}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t.yes}</span>
                </label>
                
                <label className={`flex items-center gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="radio"
                    checked={formData.payrollImpact === false}
                    onChange={() => handleInputChange('payrollImpact', false)}
                    disabled={isReadOnly}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t.no}</span>
                </label>
              </div>

              {formData.payrollImpact && (
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                    {t.payrollImpactDescription} <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={formData.payrollImpactDescription}
                    onChange={(e) => handleInputChange('payrollImpactDescription', e.target.value)}
                    disabled={isReadOnly}
                    placeholder={t.payrollPlaceholder}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      errors.payrollImpactDescription ? 'border-red-500' : 'border-gray-300'
                    } ${isReadOnly ? 'bg-gray-100' : 'bg-white'} ${isRTL ? 'text-right' : ''}`}
                  />
                  {errors.payrollImpactDescription && (
                    <p className="mt-1 text-sm text-red-600">{errors.payrollImpactDescription}</p>
                  )}
                </div>
              )}
            </div>

            {/* Uploads */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className={`text-sm font-medium text-gray-900 mb-3 ${isRTL ? 'text-right' : ''}`}>
                {t.uploads}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• {t.signedDisciplinaryLetter} ({formData.signedDisciplinaryLetter.length} files)</p>
                <p>• {t.supportingDocuments} ({formData.supportingDocuments.length} files)</p>
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
                  className={`flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Send className="w-5 h-5" />
                  <span className="font-medium">{t.submitForApproval}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
