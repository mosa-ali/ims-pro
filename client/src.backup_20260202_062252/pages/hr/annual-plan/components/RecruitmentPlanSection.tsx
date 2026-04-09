/**
 * ============================================================================
 * RECRUITMENT PLAN SECTION
 * ============================================================================
 * 
 * Auto-generated from Planned Positions
 * Read-only section
 * 
 * ============================================================================
 */

import { Target, Info } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { HRAnnualPlan } from '@/app/services/hrAnnualPlanService';

interface RecruitmentPlanSectionProps {
  plan: HRAnnualPlan;
}

export function RecruitmentPlanSection({ plan }: RecruitmentPlanSectionProps) {
  const { language, isRTL } = useLanguage();

  const t = {
    title: language === 'en' ? 'Recruitment Plan' : 'خطة التوظيف',
    description: language === 'en'
      ? 'Auto-generated from planned positions. This recruitment plan feeds into the Recruitment module once the annual plan is approved.'
      : 'يتم إنشاؤها تلقائياً من الوظائف المخططة. تغذي خطة التوظيف هذه وحدة التوظيف بمجرد الموافقة على الخطة السنوية.',
    
    // Table headers
    position: language === 'en' ? 'Position' : 'الوظيفة',
    quantity: language === 'en' ? 'Quantity' : 'الكمية',
    recruitmentType: language === 'en' ? 'Recruitment Type' : 'نوع التوظيف',
    expectedMonth: language === 'en' ? 'Expected Month' : 'الشهر المتوقع',
    priority: language === 'en' ? 'Priority' : 'الأولوية',
    method: language === 'en' ? 'Recruitment Method' : 'طريقة التوظيف',
    
    // Values
    new: language === 'en' ? 'New' : 'جديد',
    replacement: language === 'en' ? 'Replacement' : 'استبدال',
    high: language === 'en' ? 'High' : 'عالية',
    medium: language === 'en' ? 'Medium' : 'متوسطة',
    low: language === 'en' ? 'Low' : 'منخفضة',
    open: language === 'en' ? 'Open' : 'مفتوح',
    internal: language === 'en' ? 'Internal' : 'داخلي',
    roster: language === 'en' ? 'Roster' : 'قائمة',
    
    // Messages
    noRecruitment: language === 'en'
      ? 'No recruitment actions yet. Add planned positions to generate recruitment plan.'
      : 'لا توجد إجراءات توظيف بعد. أضف وظائف مخططة لإنشاء خطة التوظيف.',
    totalActions: language === 'en' ? 'Total Recruitment Actions' : 'إجمالي إجراءات التوظيف',
    totalPositions: language === 'en' ? 'Total Positions to Recruit' : 'إجمالي الوظائف المطلوب توظيفها'
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const totalPositionsToRecruit = plan.recruitmentPlan.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t.title}</h2>
        <p className="text-sm text-gray-600">{t.description}</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-sm text-blue-900 font-medium">
              {language === 'en' ? 'Auto-Generated Recruitment Plan' : 'خطة التوظيف المولدة تلقائياً'}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              {language === 'en'
                ? 'This recruitment plan is automatically generated from your planned positions. Once this annual plan is approved, these positions will appear in the Recruitment module as planned vacancies.'
                : 'يتم إنشاء خطة التوظيف هذه تلقائياً من الوظائف المخططة. بمجرد الموافقة على هذه الخطة السنوية، ستظهر هذه الوظائف في وحدة التوظيف كوظائف شاغرة مخططة.'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {plan.recruitmentPlan.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.totalActions}
            </p>
            <p className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {plan.recruitmentPlan.length}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className={`text-sm text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.totalPositions}
            </p>
            <p className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {totalPositionsToRecruit}
            </p>
          </div>
        </div>
      )}

      {/* Recruitment Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {plan.recruitmentPlan.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">{t.noRecruitment}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.position}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.quantity}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.recruitmentType}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.expectedMonth}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t.priority}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t.method}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plan.recruitmentPlan.map((recruitment) => (
                  <tr key={recruitment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{recruitment.position}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900">
                      {recruitment.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        recruitment.recruitmentType === 'New' 
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {recruitment.recruitmentType === 'New' ? t.new : t.replacement}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(recruitment.expectedRecruitmentMonth)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(recruitment.priority)}`}>
                        {recruitment.priority === 'High' ? t.high : 
                         recruitment.priority === 'Medium' ? t.medium : t.low}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {recruitment.recruitmentMethod === 'Open' ? t.open :
                       recruitment.recruitmentMethod === 'Internal' ? t.internal : t.roster}
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
