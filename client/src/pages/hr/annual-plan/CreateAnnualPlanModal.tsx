/**
 * ============================================================================
 * CREATE ANNUAL PLAN MODAL - tRPC VERSION
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
 * - tRPC integration for backend operations
 * 
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { X, Calendar, Building2, Copy, FileText, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { useCreateAnnualPlan, useAnnualPlans } from '@/hooks/useAnnualPlanning';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import type { HRAnnualPlan } from '@shared/types/hrAnnualPlanning';

interface CreateAnnualPlanModalProps {
 isOpen: boolean;
 onClose: () => void;
 onPlanCreated: (plan: HRAnnualPlan) => void;
 language: string;
 isRTL: boolean;
}

export function CreateAnnualPlanModal({
 isOpen,
 onClose,
 onPlanCreated,
 language,
 isRTL
}: CreateAnnualPlanModalProps) {
 const { t } = useTranslation();
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();
 
 // tRPC hooks
 const { data: existingPlans = [] } = useAnnualPlans({
   organizationId: currentOrganization?.id,
   operatingUnitId: currentOperatingUnit?.id,
 });
 const createMutation = useCreateAnnualPlan();
 
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
 const existingYears = existingPlans.map(p => p.planYear);
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
 const localT = useMemo(() => ({
 title: t.hrAnnualPlan.createNewAnnualPlan,
 subtitle: t.hr.createAnnualPlanSubtitle,
 
 // Form fields
 targetYear: t.hrAnnualPlan.targetYear,
 targetYearDesc: 'Select the fiscal year for this plan',
 
 organization: t.hrAnnualPlan.organizationBranchoffice,
 organizationDesc: 'Select the branch or office this plan covers',
 selectOrganization: t.hrAnnualPlan.selectOrganization,
 
 basePlan: t.hrAnnualPlan.copyFromBasePlanOptional,
 basePlanDesc: 'Clone workforce snapshot, training categories, and risks from a previous plan',
 selectBasePlan: t.hrAnnualPlan.startFreshNoBasePlan,
 
 preparedBy: t.hrAnnualPlan.preparedBy,
 preparedByDesc: 'Name of the person preparing this plan',
 preparedByPlaceholder: t.hrAnnualPlan.enterYourName,
 
 // Actions
 cancel: t.hrAnnualPlan.cancel,
 create: t.hrAnnualPlan.createPlan,
 creating: t.hrAnnualPlan.creating,
 
 // Info box
 copyInfo: 'When copying from a base plan, the following will be cloned with new IDs:',
 copyItems: language === 'en'
 ? ['Planned Positions (with adjusted dates)', 'Non-Salary HR Costs', 'Training Plan Entries', 'HR Risks']
 : ['المناصب المخططة (مع تعديل التواريخ)', 'تكاليف الموارد البشرية غير الرواتب', 'إدخالات خطة التدريب', 'مخاطر الموارد البشرية'],
 
 // Errors
 yearRequired: t.hrAnnualPlan.pleaseSelectATargetYear,
 organizationRequired: t.hrAnnualPlan.pleaseSelectAnOrganization,
 yearExists: 'A plan for this year already exists',
 noAvailableYears: 'All available years already have plans'
 }), [language]);

 // Get organization display name
 const getOrgDisplayName = (branch: typeof organizationBranches[0]) => {
 return language === 'en' ? branch.nameEn : branch.nameAr;
 };

 const handleSubmit = async () => {
 setError(null);

 // Validation
 if (!targetYear) {
 setError(localT.yearRequired);
 return;
 }
 if (!organization) {
 setError(localT.organizationRequired);
 return;
 }
 if (existingYears.includes(targetYear)) {
 setError(localT.yearExists);
 return;
 }

 setIsSubmitting(true);

 try {
 // Get the display name for the selected organization
 const selectedBranch = organizationBranches.find(b => b.id === organization);
 const orgDisplayName = selectedBranch 
 ? (language === 'en' ? selectedBranch.nameEn : selectedBranch.nameAr)
 : organization;

 // Create the plan using tRPC mutation
 const newPlan = await createMutation.mutateAsync({
   planYear: targetYear,
   planName: `${orgDisplayName} - ${targetYear}`,
   preparedBy: preparedBy || undefined,
   basePlanId: basePlanId ? parseInt(basePlanId) : undefined,
 });

 onPlanCreated(newPlan);
 onClose();
 } catch (err) {
 setError(t.hrAnnualPlan.failedToCreatePlan);
 } finally {
 setIsSubmitting(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Backdrop */}
 <div 
 className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
 onClick={onClose}
 />
 
 {/* Modal */}
 <div 
 className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
 >
 {/* Header */}
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
 <FileText className="w-5 h-5 text-primary" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
 <p className="text-sm text-gray-500">{localT.subtitle}</p>
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

 {/* Content */}
 <div className="p-6 space-y-6">
 {/* Error Alert */}
 {error && (
 <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-red-700">{error}</p>
 </div>
 )}

 {/* Target Year */}
 <div>
 <label className="block text-sm font-medium text-gray-900 mb-2">
 <Calendar className="w-4 h-4 inline mr-2" />
 {localT.targetYear}
 </label>
 <p className="text-xs text-gray-500 mb-3">{localT.targetYearDesc}</p>
 <select
 value={targetYear}
 onChange={(e) => handleYearChange(parseInt(e.target.value))}
 disabled={availableYearsFiltered.length === 0}
 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
 >
 {availableYearsFiltered.length === 0 ? (
 <option>{localT.noAvailableYears}</option>
 ) : (
 availableYearsFiltered.map(year => (
 <option key={year} value={year}>{year}</option>
 ))
 )}
 </select>
 </div>

 {/* Organization Selection */}
 <div>
 <label className="block text-sm font-medium text-gray-900 mb-2">
 <Building2 className="w-4 h-4 inline mr-2" />
 {localT.organization}
 </label>
 <p className="text-xs text-gray-500 mb-3">{localT.organizationDesc}</p>
 <select
 value={organization}
 onChange={(e) => handleOrganizationChange(e.target.value)}
 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 >
 <option value="">{localT.selectOrganization}</option>
 {organizationBranches.map(branch => (
 <option key={branch.id} value={branch.id}>
 {getOrgDisplayName(branch)}
 </option>
 ))}
 </select>
 </div>

 {/* Base Plan Selection */}
 <div>
 <label className="block text-sm font-medium text-gray-900 mb-2">
 <Copy className="w-4 h-4 inline mr-2" />
 {localT.basePlan}
 </label>
 <p className="text-xs text-gray-500 mb-3">{localT.basePlanDesc}</p>
 <select
 value={basePlanId}
 onChange={(e) => setBasePlanId(e.target.value)}
 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 >
 <option value="">{localT.selectBasePlan}</option>
 {existingPlans.map(plan => (
 <option key={plan.id} value={plan.id}>
 {plan.planName} ({plan.planYear})
 </option>
 ))}
 </select>
 </div>

 {/* Prepared By */}
 <div>
 <label className="block text-sm font-medium text-gray-900 mb-2">
 {localT.preparedBy}
 </label>
 <p className="text-xs text-gray-500 mb-3">{localT.preparedByDesc}</p>
 <input
 type="text"
 value={preparedBy}
 onChange={(e) => setPreparedBy(e.target.value)}
 placeholder={localT.preparedByPlaceholder}
 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
 />
 </div>

 {/* Copy Info Box */}
 {basePlanId && (
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <p className="text-sm font-medium text-blue-900 mb-2">{localT.copyInfo}</p>
 <ul className="text-sm text-blue-800 space-y-1">
 {localT.copyItems.map((item, idx) => (
 <li key={idx} className="flex items-start gap-2">
 <span className="text-blue-600 font-bold">•</span>
 <span>{item}</span>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex justify-end gap-3">
 <button
 onClick={onClose}
 disabled={isSubmitting}
 className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {localT.cancel}
 </button>
 <button
 onClick={handleSubmit}
 disabled={isSubmitting || availableYearsFiltered.length === 0}
 className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
 >
 {isSubmitting ? localT.creating : localT.create}
 </button>
 </div>
 </div>
 </div>
 );
}
