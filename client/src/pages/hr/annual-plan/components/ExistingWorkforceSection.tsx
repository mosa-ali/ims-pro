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

import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HRAnnualPlan, ExistingWorkforceEntry } from '@shared/types/hrAnnualPlanning';
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
      ? 'No workforce data loaded. This section displays current active staff at the start of the planning year.'
      : 'لم يتم تحميل بيانات القوى العاملة. يعرض هذا القسم الموظفين النشطين الحاليين في بداية سنة التخطيط.',
    totalStaff: t.hrAnnualPlan.totalStaff,
    totalCost: t.hrAnnualPlan.totalAnnualCost
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  // Parse existing workforce from JSON string or use as array
  let workforceData: ExistingWorkforceEntry[] = [];
  try {
    if (typeof plan.existingWorkforce === 'string' && plan.existingWorkforce) {
      workforceData = JSON.parse(plan.existingWorkforce);
    } else if (Array.isArray(plan.existingWorkforce)) {
      workforceData = plan.existingWorkforce;
    }
  } catch (error) {
    workforceData = [];
  }

  const totalCost = workforceData.reduce((sum: number, staff: any) => {
    const cost = typeof staff.annualCost === 'number' ? staff.annualCost : 0;
    return sum + cost;
  }, 0);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Section Header */}
      <div className={`flex items-start justify-between`}>
        <div className={'text-start'}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{localT.title}</h2>
          <p className="text-sm text-gray-600">{localT.description}</p>
        </div>
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
      {workforceData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className={`text-sm text-gray-600 mb-1 text-start`}>
              {localT.totalStaff}
            </p>
            <p className={`text-3xl font-bold text-gray-900 text-start`}>
              {workforceData.length}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className={`text-sm text-gray-600 mb-1 text-start`}>
              {localT.totalCost}
            </p>
            <p className={`text-3xl font-bold text-gray-900 text-start`}>
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>
      )}

      {/* Workforce Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {workforceData.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">{localT.noWorkforceData}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{localT.position}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{localT.department}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{localT.fullName}</th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{localT.grade}</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-gray-700">{localT.annualCost}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workforceData.map((staff: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{staff.jobTitle || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{staff.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700">{staff.currentCount || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{staff.salaryRange || '-'}</td>
                    <td className="px-4 py-3 text-sm text-end font-semibold text-gray-900">
                      {formatCurrency(typeof staff.annualCost === 'number' ? staff.annualCost : 0)}
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
