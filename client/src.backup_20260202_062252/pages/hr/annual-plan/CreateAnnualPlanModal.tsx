/**
 * ============================================================================
 * CREATE ANNUAL PLAN MODAL
 * ============================================================================
 * 
 * Professional initialization modal for creating a new HR Annual Plan
 * Aligned with IMS strategic planning standards
 * 
 * Features:
 * - Target Year selection
 * - Organization Branch/Office selection
 * - Base Plan selection (optional - for deep-cloning)
 * - Full bilingual support (EN/AR) with RTL mirroring
 * 
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { X, Calendar, Building2, Copy, FileText, AlertCircle } from 'lucide-react';
import { hrAnnualPlanService, HRAnnualPlan } from '@/app/services/hrAnnualPlanService';

interface CreateAnnualPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (plan: HRAnnualPlan) => void;
  existingPlans: HRAnnualPlan[];
  language: string;
  isRTL: boolean;
}

export function CreateAnnualPlanModal({
  isOpen,
  onClose,
  onPlanCreated,
  existingPlans,
  language,
  isRTL
}: CreateAnnualPlanModalProps) {
  const currentYear = new Date().getFullYear();
  
  // Form state
  const [targetYear, setTargetYear] = useState(currentYear + 1);
  const [organization, setOrganization] = useState('');
  const [basePlanId, setBasePlanId] = useState<string>('');
  const [preparedBy, setPreparedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when form fields change
  const handleYearChange = (year: number) => {
    setTargetYear(year);
    setError(null);
  };

  const handleOrganizationChange = (org: string) => {
    setOrganization(org);
    setError(null);
  };

  // Available years (current year + next 5 years)
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

  // Filter out years that already have plans
  const existingYears = existingPlans.map(p => p.year);
  const availableYearsFiltered = availableYears.filter(y => !existingYears.includes(y));

  // Organization branches - memoized to prevent re-creation on every render
  const organizationBranches = useMemo(() => [
    { id: 'hq', nameEn: 'Headquarters', nameAr: 'المقر الرئيسي' },
    { id: 'yemen', nameEn: 'Yemen Country Office', nameAr: 'مكتب اليمن' },
    { id: 'syria', nameEn: 'Syria Country Office', nameAr: 'مكتب سوريا' },
    { id: 'jordan', nameEn: 'Jordan Country Office', nameAr: 'مكتب الأردن' },
    { id: 'lebanon', nameEn: 'Lebanon Country Office', nameAr: 'مكتب لبنان' },
    { id: 'iraq', nameEn: 'Iraq Country Office', nameAr: 'مكتب العراق' },
  ], []);

  // Translations
  const t = useMemo(() => ({
    title: language === 'en' ? 'Create New Annual Plan' : 'إنشاء خطة سنوية جديدة',
    subtitle: language === 'en' 
      ? 'Initialize a new HR Annual Plan for strategic workforce planning'
      : 'إنشاء خطة سنوية جديدة للموارد البشرية للتخطيط الاستراتيجي للقوى العاملة',
    
    // Form fields
    targetYear: language === 'en' ? 'Target Year' : 'السنة المستهدفة',
    targetYearDesc: language === 'en' 
      ? 'Select the fiscal year for this plan'
      : 'اختر السنة المالية لهذه الخطة',
    
    organization: language === 'en' ? 'Organization Branch/Office' : 'الفرع/المكتب',
    organizationDesc: language === 'en'
      ? 'Select the branch or office this plan covers'
      : 'اختر الفرع أو المكتب الذي تغطيه هذه الخطة',
    selectOrganization: language === 'en' ? 'Select organization...' : 'اختر المنظمة...',
    
    basePlan: language === 'en' ? 'Copy from Base Plan (Optional)' : 'نسخ من خطة أساسية (اختياري)',
    basePlanDesc: language === 'en'
      ? 'Clone workforce snapshot, training categories, and risks from a previous plan'
      : 'نسخ لقطة القوى العاملة وفئات التدريب والمخاطر من خطة سابقة',
    selectBasePlan: language === 'en' ? 'Start fresh (no base plan)' : 'البدء من جديد (بدون خطة أساسية)',
    
    preparedBy: language === 'en' ? 'Prepared By' : 'أعده',
    preparedByDesc: language === 'en'
      ? 'Name of the person preparing this plan'
      : 'اسم الشخص الذي يعد هذه الخطة',
    preparedByPlaceholder: language === 'en' ? 'Enter your name' : 'أدخل اسمك',
    
    // Actions
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    create: language === 'en' ? 'Create Plan' : 'إنشاء الخطة',
    creating: language === 'en' ? 'Creating...' : 'جاري الإنشاء...',
    
    // Info box
    copyInfo: language === 'en' 
      ? 'When copying from a base plan, the following will be cloned with new IDs:'
      : 'عند النسخ من خطة أساسية، سيتم نسخ ما يلي بمعرفات جديدة:',
    copyItems: language === 'en'
      ? ['Planned Positions (with adjusted dates)', 'Non-Salary HR Costs', 'Training Plan Entries', 'HR Risks']
      : ['المناصب المخططة (مع تعديل التواريخ)', 'تكاليف الموارد البشرية غير الرواتب', 'إدخالات خطة التدريب', 'مخاطر الموارد البشرية'],
    
    // Errors
    yearRequired: language === 'en' ? 'Please select a target year' : 'يرجى اختيار السنة المستهدفة',
    organizationRequired: language === 'en' ? 'Please select an organization' : 'يرجى اختيار المنظمة',
    yearExists: language === 'en' 
      ? 'A plan for this year already exists'
      : 'توجد خطة لهذه السنة بالفعل',
    noAvailableYears: language === 'en'
      ? 'All available years already have plans'
      : 'جميع السنوات المتاحة لديها خطط بالفعل'
  }), [language]);

  // Get organization display name
  const getOrgDisplayName = (branch: typeof organizationBranches[0]) => {
    return language === 'en' ? branch.nameEn : branch.nameAr;
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!targetYear) {
      setError(t.yearRequired);
      return;
    }
    if (!organization) {
      setError(t.organizationRequired);
      return;
    }
    if (existingYears.includes(targetYear)) {
      setError(t.yearExists);
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the display name for the selected organization
      const selectedBranch = organizationBranches.find(b => b.id === organization);
      const orgDisplayName = selectedBranch 
        ? (language === 'en' ? selectedBranch.nameEn : selectedBranch.nameAr)
        : organization;

      // Create the plan using the service
      const newPlan = hrAnnualPlanService.createFromBasePlan(
        targetYear,
        orgDisplayName,
        basePlanId || undefined,
        preparedBy || undefined
      );

      onPlanCreated(newPlan);
      onClose();
    } catch (err) {
      setError(language === 'en' ? 'Failed to create plan' : 'فشل في إنشاء الخطة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
                <p className="text-sm text-gray-500">{t.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Year */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="w-4 h-4 text-primary" />
              {t.targetYear}
              <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500">{t.targetYearDesc}</p>
            {availableYearsFiltered.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                {t.noAvailableYears}
              </div>
            ) : (
              <select
                value={targetYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                {availableYearsFiltered.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
          </div>

          {/* Organization Branch */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building2 className="w-4 h-4 text-primary" />
              {t.organization}
              <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500">{t.organizationDesc}</p>
            <select
              value={organization}
              onChange={(e) => handleOrganizationChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">{t.selectOrganization}</option>
              {organizationBranches.map(branch => (
                <option key={branch.id} value={branch.id}>{getOrgDisplayName(branch)}</option>
              ))}
            </select>
          </div>

          {/* Base Plan (Optional) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Copy className="w-4 h-4 text-primary" />
              {t.basePlan}
            </label>
            <p className="text-xs text-gray-500">{t.basePlanDesc}</p>
            <select
              value={basePlanId}
              onChange={(e) => setBasePlanId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">{t.selectBasePlan}</option>
              {existingPlans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.year} - {plan.organization} ({plan.status})
                </option>
              ))}
            </select>

            {/* Info box when base plan is selected */}
            {basePlanId && (
              <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">{t.copyInfo}</p>
                <ul className={`text-sm text-blue-700 space-y-1 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                  {t.copyItems.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Prepared By */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              {t.preparedBy}
            </label>
            <p className="text-xs text-gray-500">{t.preparedByDesc}</p>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder={t.preparedByPlaceholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || availableYearsFiltered.length === 0}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t.creating : t.create}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
