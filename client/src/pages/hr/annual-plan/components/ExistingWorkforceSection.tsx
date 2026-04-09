/**
 * ============================================================================
 * EXISTING WORKFORCE SECTION
 * ============================================================================
 * 
 * Auto-loaded snapshot of current active staff
 * Read-only reference
 * 
 * ============================================================================
 */

import { Users, Download, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { HRAnnualPlan, hrAnnualPlanService } from '@/app/services/hrAnnualPlanService';
import { useTranslation } from '@/i18n/useTranslation';

interface ExistingWorkforceSectionProps {
 plan: HRAnnualPlan;
 isEditing: boolean;
 onUpdate: (plan: HRAnnualPlan) => void;
}

export function ExistingWorkforceSection({
 plan, isEditing, onUpdate }: ExistingWorkforceSectionProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();

 const localT = {
 title: t.hrAnnualPlan.existingWorkforceSnapshot,
 description: 'Auto-loaded from Employee Profiles - Read-only reference showing current active staff at start of planning year',
 loadWorkforce: t.hrAnnualPlan.loadCurrentWorkforce,
 exportWorkforce: t.hrAnnualPlan.exportWorkforceData,
 
 // Table headers
 staffId: t.hrAnnualPlan.staffId,
 fullName: t.hrAnnualPlan.fullName,
 position: t.hrAnnualPlan.position3,
 department: t.hrAnnualPlan.department,
 contractType: t.hrAnnualPlan.contractType,
 projectAssignment: t.hrAnnualPlan.projects,
 grade: t.hrAnnualPlan.grade,
 annualCost: t.hrAnnualPlan.annualCost,
 
 // Messages
 noWorkforceData: language === 'en' 
 ? 'No workforce data loaded. Click "Load Current Workforce" to import existing staff data.'
 : 'لم يتم تحميل بيانات القوى العاملة. انقر على "تحميل القوى العاملة الحالية" لاستيراد بيانات الموظفين الحاليين.',
 totalStaff: t.hrAnnualPlan.totalStaff,
 totalCost: t.hrAnnualPlan.totalAnnualCost
 };

 const handleLoadWorkforce = () => {
 const updated = hrAnnualPlanService.loadExistingWorkforce(plan.id);
 if (updated) {
 onUpdate(updated);
 }
 };

 const formatCurrency = (amount: number) => {
 return `$${amount.toLocaleString()}`;
 };

 const totalCost = plan.existingWorkforce.reduce((sum, staff) => sum + staff.annualCost, 0);

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Section Header */}
 <div className={`flex items-start justify-between`}>
 <div className={'text-start'}>
 <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
 <p className="text-sm text-gray-600">{t.description}</p>
 </div>

 {isEditing && (
 <div className={`flex items-center gap-2`}>
 <button
 onClick={handleLoadWorkforce}
 className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700`}
 >
 <RefreshCw className="w-4 h-4" />
 <span>{t.loadWorkforce}</span>
 </button>
 </div>
 )}
 </div>

 {/* Info Box */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className={`flex items-start gap-3`}>
 <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <p className="text-sm text-blue-900 font-medium">
 {t.hrAnnualPlan.autosyncedReferenceData}
 </p>
 <p className="text-sm text-blue-800 mt-1">
 {'This data is pulled from Employee Profiles and serves as a baseline for planning. It represents active staff at the start of the planning year.'}
 </p>
 </div>
 </div>
 </div>

 {/* Summary Cards */}
 {plan.existingWorkforce.length > 0 && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>
 {t.totalStaff}
 </p>
 <p className={`text-3xl font-bold text-gray-900 text-start`}>
 {plan.existingWorkforce.length}
 </p>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>
 {t.totalCost}
 </p>
 <p className={`text-3xl font-bold text-gray-900 text-start`}>
 {formatCurrency(totalCost)}
 </p>
 </div>
 </div>
 )}

 {/* Workforce Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {plan.existingWorkforce.length === 0 ? (
 <div className="px-6 py-12 text-center">
 <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600 mb-4">{t.noWorkforceData}</p>
 {isEditing && (
 <button
 onClick={handleLoadWorkforce}
 className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700`}
 >
 <RefreshCw className="w-4 h-4" />
 <span>{t.loadWorkforce}</span>
 </button>
 )}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.staffId}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.fullName}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.position}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.department}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.grade}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.contractType}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.projectAssignment}</th>
 <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700">{t.annualCost}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {plan.existingWorkforce.map((staff) => (
 <tr key={staff.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-mono text-blue-600">{staff.staffId}</td>
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{staff.fullName}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{staff.position}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{staff.department}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{staff.grade || '-'}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{staff.contractType}</td>
 <td className="px-4 py-3 text-sm">
 <div className="flex flex-wrap gap-1">
 {staff.projectAssignment.map((project, idx) => (
 <span key={idx} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">
 {project}
 </span>
 ))}
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-end font-semibold text-gray-900">
 {formatCurrency(staff.annualCost)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 );
}
