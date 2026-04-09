/**
 * ============================================================================
 * APPROVAL SECTION
 * ============================================================================
 */

import { CheckCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { HRAnnualPlan } from '@/app/services/hrAnnualPlanService';
import { useTranslation } from '@/i18n/useTranslation';

interface ApprovalSectionProps {
 plan: HRAnnualPlan;
 isEditing: boolean;
 onUpdate: (plan: HRAnnualPlan) => void;
}

export function ApprovalSection({
 plan, isEditing, onUpdate }: ApprovalSectionProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const localT = {
 title: t.hrAnnualPlan.approvalGovernance,
 description: 'Approval workflow and governance records for the HR Annual Plan',
 
 preparedBy: t.hrAnnualPlan.preparedBy1,
 preparationDate: t.hrAnnualPlan.preparationDate,
 reviewedBy: t.hrAnnualPlan.reviewedBy,
 reviewDate: t.hrAnnualPlan.reviewDate,
 approvedBy: t.hrAnnualPlan.approvedBy,
 approvalDate: t.hrAnnualPlan.approvalDate,
 comments: t.hrAnnualPlan.comments,
 
 status: t.hrAnnualPlan.status,
 draft: t.hrAnnualPlan.draft,
 underReview: t.hrAnnualPlan.underReview,
 approved: t.hrAnnualPlan.approved,
 locked: t.hrAnnualPlan.locked,
 
 approvalWorkflow: t.hrAnnualPlan.approvalWorkflow,
 step1: t.hrAnnualPlan.step1Preparation,
 step2: t.hrAnnualPlan.step2Review,
 step3: t.hrAnnualPlan.step3Approval,
 step4: t.hrAnnualPlan.step4Locked,
 
 completed: t.hrAnnualPlan.completed,
 pending: t.hrAnnualPlan.pending,
 
 governanceNotes: t.hrAnnualPlan.governanceNotes,
 governanceText: 'Once approved, this plan becomes read-only and serves as the authoritative reference for recruitment, budgeting, and capacity building throughout the planning year. All changes must be documented through formal amendment procedures.'
 };

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hrAnnualPlan.en, {
 year: 'numeric',
 month: 'long',
 day: 'numeric'
 });
 };

 const getStatusInfo = () => {
 switch (plan.status) {
 case 'draft':
 return { step: 1, label: t.draft, color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' };
 case 'under-review':
 return { step: 2, label: t.underReview, color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300' };
 case 'approved':
 return { step: 3, label: t.approved, color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-300' };
 case 'locked':
 return { step: 4, label: t.locked, color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' };
 default:
 return { step: 1, label: t.draft, color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' };
 }
 };

 const statusInfo = getStatusInfo();

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Section Header */}
 <div className={'text-start'}>
 <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
 <p className="text-sm text-gray-600">{t.description}</p>
 </div>

 {/* Current Status */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.status}
 </h3>
 <div className="flex items-center justify-center">
 <span className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold border-2 ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}>
 <CheckCircle className="w-5 h-5" />
 {statusInfo.label}
 </span>
 </div>
 </div>

 {/* Approval Workflow Progress */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-6 text-start`}>
 {t.approvalWorkflow}
 </h3>

 <div className="relative">
 {/* Progress Line */}
 <div className="absolute top-5 start-0 end-0 h-1 bg-gray-200" style={{ left: '2.5rem', right: '2.5rem' }}></div>
 <div 
 className="absolute top-5 start-0 h-1 bg-green-500 transition-all duration-500" 
 style={{ 
 left: '2.5rem', 
 width: `calc(${((statusInfo.step - 1) / 3) * 100}% - 2.5rem)` 
 }}
 ></div>

 {/* Steps */}
 <div className="relative flex justify-between">
 {[
 { step: 1, label: t.step1, completed: statusInfo.step >= 1 },
 { step: 2, label: t.step2, completed: statusInfo.step >= 2 },
 { step: 3, label: t.step3, completed: statusInfo.step >= 3 },
 { step: 4, label: t.step4, completed: statusInfo.step >= 4 }
 ].map((item) => (
 <div key={item.step} className="flex flex-col items-center">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${ item.completed ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-400' }`}>
 {item.completed ? <CheckCircle className="w-6 h-6" /> : <span className="text-sm font-bold">{item.step}</span>}
 </div>
 <span className={`mt-2 text-xs font-medium ${item.completed ? 'text-green-700' : 'text-gray-500'}`}>
 {item.label}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Approval Details */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.hrAnnualPlan.approvalDetails}
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Preparation */}
 <div className="space-y-4">
 <div className={`flex items-start gap-3`}>
 <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-700">{t.preparedBy}</p>
 <p className="text-base text-gray-900">{plan.approval.preparedBy || '-'}</p>
 </div>
 </div>

 <div className={`flex items-start gap-3`}>
 <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-700">{t.preparationDate}</p>
 <p className="text-base text-gray-900">{formatDate(plan.approval.preparationDate)}</p>
 </div>
 </div>
 </div>

 {/* Review */}
 {plan.approval.reviewedBy && (
 <div className="space-y-4">
 <div className={`flex items-start gap-3`}>
 <User className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-700">{t.reviewedBy}</p>
 <p className="text-base text-gray-900">{plan.approval.reviewedBy}</p>
 </div>
 </div>

 <div className={`flex items-start gap-3`}>
 <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-700">{t.reviewDate}</p>
 <p className="text-base text-gray-900">{formatDate(plan.approval.reviewDate)}</p>
 </div>
 </div>
 </div>
 )}

 {/* Approval */}
 {plan.approval.approvedBy && (
 <div className="space-y-4">
 <div className={`flex items-start gap-3`}>
 <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-700">{t.approvedBy}</p>
 <p className="text-base text-gray-900">{plan.approval.approvedBy}</p>
 </div>
 </div>

 <div className={`flex items-start gap-3`}>
 <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-700">{t.approvalDate}</p>
 <p className="text-base text-gray-900">{formatDate(plan.approval.approvalDate)}</p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Comments */}
 {plan.approval.comments && (
 <div className="mt-6 pt-6 border-t border-gray-200">
 <div className={`flex items-start gap-3`}>
 <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-700 mb-2">{t.comments}</p>
 <p className="text-base text-gray-900 bg-gray-50 rounded-lg p-4 border border-gray-200">
 {plan.approval.comments}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Governance Notes */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <h4 className={`text-sm font-semibold text-blue-900 mb-2 text-start`}>
 {t.governanceNotes}
 </h4>
 <p className={`text-sm text-blue-800 text-start`}>
 {t.governanceText}
 </p>
 </div>
 </div>
 );
}
