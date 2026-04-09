/**
 * ============================================================================
 * FORM 2: INVESTIGATION APPOINTMENT
 * ============================================================================
 * 
 * PURPOSE: Officially assign investigation responsibility
 * 
 * FEATURES:
 * - Investigation team assignment
 * - Dates and scope
 * - Policy reference
 * - Confirm Investigation Team
 * - Printable with organization logo
 * - Locked after confirmation
 * - Bilingual (EN/AR)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { Save, CheckCircle, Printer, ArrowLeft, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InvestigationAppointment, DisciplinaryCase } from './types';
import { sanctionsService } from './sanctionsService';

export function Form2_InvestigationAppointment() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { caseRef } = useParams<{ caseRef: string }>();

  const [caseData, setCaseData] = useState<DisciplinaryCase | null>(null);
  const [formData, setFormData] = useState<InvestigationAppointment>({
    caseReferenceNumber: caseRef || '',
    investigationStartDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    investigationLead: '',
    investigationTeamMembers: '',
    scopeOfInvestigation: '',
    applicablePolicyReference: '',
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
      if (existing.form2_investigation) {
        setFormData(existing.form2_investigation);
        setIsReadOnly(existing.form2_investigation.status === 'confirmed');
      }
    }
  };

  const handleInputChange = (field: keyof InvestigationAppointment, value: any) => {
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

    if (!formData.investigationStartDate) {
      newErrors.investigationStartDate = language === 'en' ? 'Start date is required' : 'تاريخ البدء مطلوب';
    }

    if (!formData.expectedEndDate) {
      newErrors.expectedEndDate = language === 'en' ? 'Expected end date is required' : 'تاريخ الانتهاء المتوقع مطلوب';
    }

    if (!formData.investigationLead.trim()) {
      newErrors.investigationLead = language === 'en' ? 'Investigation lead is required' : 'قائد التحقيق مطلوب';
    }

    if (!formData.scopeOfInvestigation.trim()) {
      newErrors.scopeOfInvestigation = language === 'en' ? 'Scope is required' : 'النطاق مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!caseData) return;

    const updated = {
      ...caseData,
      form2_investigation: { ...formData, status: 'draft' },
      lastUpdatedDate: new Date().toISOString()
    };

    sanctionsService.saveCase(updated);
    sanctionsService.addAuditEntry(caseRef!, 'Saved Form 2', 'Investigation appointment saved', 'form2', formData.createdBy);
    
    alert(language === 'en' ? 'Saved successfully!' : 'تم الحفظ بنجاح!');
  };

  const handleConfirm = () => {
    if (!validateForm()) {
      alert(language === 'en' ? 'Please fill in all required fields' : 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!caseData) return;

    const confirmed = {
      ...formData,
      status: 'confirmed' as const,
      confirmedDate: new Date().toISOString()
    };

    const updated = {
      ...caseData,
      form2_investigation: confirmed,
      currentStatus: 'investigation-in-progress' as const,
      lastUpdatedDate: new Date().toISOString()
    };

    sanctionsService.saveCase(updated);
    sanctionsService.addAuditEntry(caseRef!, 'Confirmed Investigation Team', 'Form 2 confirmed', 'form2', formData.createdBy);
    
    alert(language === 'en' ? 'Investigation team confirmed!' : 'تم تأكيد فريق التحقيق!');
    navigate('/organization/hr/sanctions');
  };

  const t = {
    title: language === 'en' ? 'Investigation Appointment' : 'تعيين التحقيق',
    subtitle: language === 'en' ? 'Form 2 of 6' : 'النموذج 2 من 6',
    
    caseRef: language === 'en' ? 'Case Reference' : 'مرجع القضية',
    employee: language === 'en' ? 'Employee' : 'الموظف',
    
    investigationStartDate: language === 'en' ? 'Investigation Start Date' : 'تاريخ بدء التحقيق',
    expectedEndDate: language === 'en' ? 'Expected End Date' : 'تاريخ الانتهاء المتوقع',
    investigationLead: language === 'en' ? 'Investigation Lead' : 'قائد التحقيق',
    investigationTeamMembers: language === 'en' ? 'Investigation Team Members' : 'أعضاء فريق التحقيق',
    scopeOfInvestigation: language === 'en' ? 'Scope of Investigation' : 'نطاق التحقيق',
    applicablePolicyReference: language === 'en' ? 'Applicable Policy Reference' : 'مرجع السياسة المطبقة',
    
    save: language === 'en' ? 'Save' : 'حفظ',
    confirm: language === 'en' ? 'Confirm Investigation Team' : 'تأكيد فريق التحقيق',
    print: language === 'en' ? 'Print' : 'طباعة',
    back: language === 'en' ? 'Back' : 'رجوع',
    
    readOnlyNotice: language === 'en' 
      ? '🔒 This form has been confirmed and is locked' 
      : '🔒 تم تأكيد هذا النموذج وهو مقفل',
    
    teamMembersPlaceholder: language === 'en' ? 'List team members (comma separated)' : 'قائمة أعضاء الفريق (مفصولة بفواصل)',
    scopePlaceholder: language === 'en' ? 'Describe the scope and objectives of the investigation...' : 'وصف نطاق وأهداف التحقيق...',
    policyPlaceholder: language === 'en' ? 'e.g., Code of Conduct Section 4.2' : 'مثال: مدونة السلوك القسم 4.2'
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
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
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
            {language === 'en' ? 'INVESTIGATION APPOINTMENT FORM' : 'نموذج تعيين التحقيق'}
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

            {/* Investigation Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.investigationStartDate} <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.investigationStartDate}
                  onChange={(e) => handleInputChange('investigationStartDate', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.investigationStartDate ? 'border-red-500' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-100' : ''}`}
                />
                {errors.investigationStartDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.investigationStartDate}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.expectedEndDate} <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expectedEndDate}
                  onChange={(e) => handleInputChange('expectedEndDate', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    errors.expectedEndDate ? 'border-red-500' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-100' : ''}`}
                />
                {errors.expectedEndDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.expectedEndDate}</p>
                )}
              </div>
            </div>

            {/* Investigation Lead */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.investigationLead} <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.investigationLead}
                onChange={(e) => handleInputChange('investigationLead', e.target.value)}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.investigationLead ? 'border-red-500' : 'border-gray-300'
                } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
              {errors.investigationLead && (
                <p className="mt-1 text-sm text-red-600">{errors.investigationLead}</p>
              )}
            </div>

            {/* Team Members */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.investigationTeamMembers}
              </label>
              <textarea
                value={formData.investigationTeamMembers}
                onChange={(e) => handleInputChange('investigationTeamMembers', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.teamMembersPlaceholder}
                rows={3}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
            </div>

            {/* Scope */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.scopeOfInvestigation} <span className="text-red-600">*</span>
              </label>
              <textarea
                value={formData.scopeOfInvestigation}
                onChange={(e) => handleInputChange('scopeOfInvestigation', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.scopePlaceholder}
                rows={5}
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.scopeOfInvestigation ? 'border-red-500' : 'border-gray-300'
                } ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
              {errors.scopeOfInvestigation && (
                <p className="mt-1 text-sm text-red-600">{errors.scopeOfInvestigation}</p>
              )}
            </div>

            {/* Policy Reference */}
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.applicablePolicyReference}
              </label>
              <input
                type="text"
                value={formData.applicablePolicyReference}
                onChange={(e) => handleInputChange('applicablePolicyReference', e.target.value)}
                disabled={isReadOnly}
                placeholder={t.policyPlaceholder}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg ${isReadOnly ? 'bg-gray-100' : ''} ${isRTL ? 'text-right' : ''}`}
              />
            </div>

            {!isReadOnly && (
              <div className={`flex gap-4 mt-8 pt-6 border-t border-gray-200 print:hidden ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Save className="w-5 h-5" />
                  <span className="font-medium">{t.save}</span>
                </button>

                <button
                  onClick={handleConfirm}
                  className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t.confirm}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
