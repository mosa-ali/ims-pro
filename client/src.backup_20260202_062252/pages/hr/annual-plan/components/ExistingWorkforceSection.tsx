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

interface ExistingWorkforceSectionProps {
  plan: HRAnnualPlan;
  isEditing: boolean;
  onUpdate: (plan: HRAnnualPlan) => void;
}

export function ExistingWorkforceSection({ plan, isEditing, onUpdate }: ExistingWorkforceSectionProps) {
  const { language, isRTL } = useLanguage();

  const t = {
    title: language === 'en' ? 'Existing Workforce Snapshot' : 'لقطة القوى العاملة الحالية',
    description: language === 'en'
      ? 'Auto-loaded from Employee Profiles - Read-only reference showing current active staff at start of planning year'
      : 'محملة تلقائياً من ملفات الموظفين - مرجع للقراءة فقط يظهر الموظفين النشطين الحاليين في بداية سنة التخطيط',
    loadWorkforce: language === 'en' ? 'Load Current Workforce' : 'تحميل القوى العاملة الحالية',
    exportWorkforce: language === 'en' ? 'Export Workforce Data' : 'تصدير بيانات القوى العاملة',
    
    // Table headers
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    position: language === 'en' ? 'Position' : 'المنصب',
    department: language === 'en' ? 'Department' : 'القسم',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    projectAssignment: language === 'en' ? 'Project(s)' : 'المشروع/المشاريع',
    grade: language === 'en' ? 'Grade' : 'الدرجة',
    annualCost: language === 'en' ? 'Annual Cost' : 'التكلفة السنوية',
    
    // Messages
    noWorkforceData: language === 'en' 
      ? 'No workforce data loaded. Click "Load Current Workforce" to import existing staff data.'
      : 'لم يتم تحميل بيانات القوى العاملة. انقر على "تحميل القوى العاملة الحالية" لاستيراد بيانات الموظفين الحاليين.',
    totalStaff: language === 'en' ? 'Total Staff' : 'إجمالي الموظفين',
    totalCost: language === 'en' ? 'Total Annual Cost' : 'إجمالي التكلفة السنوية'
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
    <div className="space-y-6">
      {/* Section Header */}
      <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
          <p className="text-sm text-gray-600">{t.description}</p>
        </div>

        {isEditing && (
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handleLoadWorkforce}
              className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.loadWorkforce}</span>
            </button>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-blue-900 font-medium">
              {language === 'en' ? 'Auto-Synced Reference Data' : 'بيانات مرجعية متزامنة تلقائياً'}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              {language === 'en'
                ? 'This data is pulled from Employee Profiles and serves as a baseline for planning. It represents active staff at the start of the planning year.'
                : 'يتم سحب هذه البيانات من ملفات الموظفين وتعمل كخط أساس للتخطيط. تمثل الموظفين النشطين في بداية سنة التخطيط.'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {plan.existingWorkforce.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.totalStaff}
            </p>
            <p className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {plan.existingWorkforce.length}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.totalCost}
            </p>
            <p className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.loadWorkforce}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.staffId}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.fullName}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.position}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.department}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.grade}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.contractType}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.projectAssignment}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{t.annualCost}</th>
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
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
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
