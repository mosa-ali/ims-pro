/**
 * ============================================================================
 * PLAN HEADER COMPONENT - Overview Summary
 * ============================================================================
 */

import { FileText, Calendar, User, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { HRAnnualPlan } from '@/app/services/hrAnnualPlanService';
import { useTranslation } from '@/i18n/useTranslation';

interface PlanHeaderProps {
 plan: HRAnnualPlan;
}

export function PlanHeader({
 plan }: PlanHeaderProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const localT = {
 planOverview: t.hrAnnualPlan.planOverview,
 organization: t.hrAnnualPlan.organization,
 planYear: t.hrAnnualPlan.planYear,
 preparedBy: t.hrAnnualPlan.preparedBy1,
 preparationDate: t.hrAnnualPlan.preparationDate,
 reviewedBy: t.hrAnnualPlan.reviewedBy,
 reviewDate: t.hrAnnualPlan.reviewDate,
 approvedBy: t.hrAnnualPlan.approvedBy,
 approvalDate: t.hrAnnualPlan.approvalDate,
 status: t.hrAnnualPlan.status,
 lastUpdated: t.hrAnnualPlan.lastUpdated,
 planSummary: t.hrAnnualPlan.planSummary,
 plannedPositions: t.hrAnnualPlan.plannedPositions,
 plannedStaffing: t.hrAnnualPlan.plannedStaffingRequirements,
 recruitmentActions: t.hrAnnualPlan.recruitmentActions,
 trainingActivities: t.hrAnnualPlan.trainingActivities,
 identifiedRisks: t.hrAnnualPlan.identifiedRisks,
 nonSalaryCosts: t.hrAnnualPlan.nonsalaryCostItems
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrAnnualPlan.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Plan Information */}
 <div>
 <h2 className={`text-xl font-bold text-gray-900 mb-4 text-start`}>
 {t.planOverview}
 </h2>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Basic Info */}
 <div className="space-y-4">
 <div className={`flex items-start gap-3`}>
 <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.organization}</p>
 <p className="text-base font-medium text-gray-900">{plan.organization}</p>
 </div>
 </div>

 <div className={`flex items-start gap-3`}>
 <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.planYear}</p>
 <p className="text-base font-medium text-gray-900">{plan.year}</p>
 </div>
 </div>

 <div className={`flex items-start gap-3`}>
 <User className="w-5 h-5 text-gray-400 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.preparedBy}</p>
 <p className="text-base font-medium text-gray-900">{plan.approval.preparedBy || '-'}</p>
 </div>
 </div>

 <div className={`flex items-start gap-3`}>
 <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.preparationDate}</p>
 <p className="text-base font-medium text-gray-900">{formatDate(plan.approval.preparationDate)}</p>
 </div>
 </div>
 </div>

 {/* Approval Info */}
 <div className="space-y-4">
 {plan.approval.reviewedBy && (
 <>
 <div className={`flex items-start gap-3`}>
 <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.reviewedBy}</p>
 <p className="text-base font-medium text-gray-900">{plan.approval.reviewedBy}</p>
 </div>
 </div>

 <div className={`flex items-start gap-3`}>
 <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.reviewDate}</p>
 <p className="text-base font-medium text-gray-900">{formatDate(plan.approval.reviewDate)}</p>
 </div>
 </div>
 </>
 )}

 {plan.approval.approvedBy && (
 <>
 <div className={`flex items-start gap-3`}>
 <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.approvedBy}</p>
 <p className="text-base font-medium text-gray-900">{plan.approval.approvedBy}</p>
 </div>
 </div>

 <div className={`flex items-start gap-3`}>
 <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.approvalDate}</p>
 <p className="text-base font-medium text-gray-900">{formatDate(plan.approval.approvalDate)}</p>
 </div>
 </div>
 </>
 )}

 <div className={`flex items-start gap-3`}>
 <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-gray-600">{t.lastUpdated}</p>
 <p className="text-base font-medium text-gray-900">{formatDate(plan.updatedAt)}</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Plan Summary Stats */}
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.planSummary}
 </h3>
 
 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
 <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
 <p className={`text-sm text-indigo-700 mb-1 text-start`}>
 {t.plannedStaffing}
 </p>
 <p className={`text-3xl font-bold text-indigo-900 text-start`}>
 {plan.plannedPositions.length}
 </p>
 </div>

 <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
 <p className={`text-sm text-blue-700 mb-1 text-start`}>
 {t.recruitmentActions}
 </p>
 <p className={`text-3xl font-bold text-blue-900 text-start`}>
 {plan.recruitmentPlan.length}
 </p>
 </div>

 <div className="bg-green-50 rounded-lg p-4 border border-green-100">
 <p className={`text-sm text-green-700 mb-1 text-start`}>
 {t.trainingActivities}
 </p>
 <p className={`text-3xl font-bold text-green-900 text-start`}>
 {plan.trainingPlan.length}
 </p>
 </div>

 <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
 <p className={`text-sm text-yellow-700 mb-1 text-start`}>
 {t.identifiedRisks}
 </p>
 <p className={`text-3xl font-bold text-yellow-900 text-start`}>
 {plan.hrRisks.length}
 </p>
 </div>

 <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
 <p className={`text-sm text-purple-700 mb-1 text-start`}>
 {t.nonSalaryCosts}
 </p>
 <p className={`text-3xl font-bold text-purple-900 text-start`}>
 {plan.nonSalaryCosts.length}
 </p>
 </div>
 </div>
 </div>

 {/* Approval Comments */}
 {plan.approval.comments && (
 <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
 <h4 className={`text-sm font-semibold text-gray-900 mb-2 text-start`}>
 {t.hrAnnualPlan.approvalComments}
 </h4>
 <p className={`text-sm text-gray-700 text-start`}>
 {plan.approval.comments}
 </p>
 </div>
 )}
 </div>
 );
}
