import { useState } from 'react';
import { Users, TrendingUp, AlertCircle, Clock, Send, Calendar, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/utils/formatters';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from '@/lib/trpc';

interface CasesDashboardProps {
  projectId: number;
  onViewCase: (caseId: number) => void;
}

export function CasesDashboard({ projectId, onViewCase }: CasesDashboardProps) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<{
    gender?: string;
    riskLevel?: string;
    status?: string;
    caseType?: string;
  }>({});
  
  // Get KPIs from tRPC
  const { data: kpis, isLoading: kpisLoading } = trpc.caseManagement.cases.getKPIs.useQuery({ 
    projectId 
  });
  
  // Get recent cases from tRPC
  const { data: allCases, isLoading: casesLoading } = trpc.caseManagement.cases.getByProject.useQuery({ 
    projectId,
    filters 
  });
  
  const recentCases = allCases?.slice(0, 5) || [];
  
  if (kpisLoading || casesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">{t.common.loading}...</span>
      </div>
    );
  }
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header with Bilingual Support */}
      <div className={`mt-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-sm font-semibold text-gray-900">
          {isRTL ? 'لوحة إدارة الحالات' : 'Case Management Dashboard'}
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          {isRTL ? 'المشروع' : 'Project'}: {isRTL ? 'تعزيز الإدماج والتغيير الاجتماعي من خلال الرياضة' : 'Promoting Inclusion and Social Change through Sports'}
        </p>
        <p className="text-sm text-gray-600">
          {isRTL ? 'الدور' : 'Role'}: {user?.role?.replace('_', ' ') || 'User'}
        </p>
      </div>
      
      {/* KPI Cards */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4"
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        <KPICard
          title={isRTL ? 'إجمالي الحالات النشطة' : 'Total Active Cases'}
          value={kpis?.totalActiveCases || 0}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <KPICard
          title={isRTL ? 'حالات جديدة هذا الشهر' : 'New Cases This Month'}
          value={kpis?.newCasesThisMonth || 0}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <KPICard
          title={isRTL ? 'الحالات المغلقة' : 'Closed Cases'}
          value={kpis?.closedCases || 0}
          icon={<Calendar className="w-5 h-5" />}
          color="gray"
        />
        <KPICard
          title={isRTL ? 'حالات عالية الخطورة' : 'High Risk Cases'}
          value={kpis?.highRiskCases || 0}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
        />
        <KPICard
          title={isRTL ? 'الإحالات المعلقة' : 'Pending Referrals'}
          value={kpis?.pendingReferrals || 0}
          icon={<Send className="w-5 h-5" />}
          color="orange"
        />
        <KPICard
          title={isRTL ? 'المتابعات المستحقة' : 'Follow-ups Due'}
          value={kpis?.followUpsDue || 0}
          icon={<Clock className="w-5 h-5" />}
          color="purple"
        />
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className={`flex items-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          <select
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            style={isRTL ? { direction: 'rtl', paddingInlineStart: '0.75rem', paddingInlineEnd: '2rem' } : undefined}
            dir={isRTL ? 'rtl' : 'ltr'}
            value={filters.gender || ''}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value || undefined })}
          >
            <option value="">{isRTL ? 'جميع الأجناس' : 'All Gender'}</option>
            <option value="male">{isRTL ? 'ذكر' : 'Male'}</option>
            <option value="female">{isRTL ? 'أنثى' : 'Female'}</option>
          </select>
          
          <select
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            style={isRTL ? { direction: 'rtl', paddingInlineStart: '0.75rem', paddingInlineEnd: '2rem' } : undefined}
            dir={isRTL ? 'rtl' : 'ltr'}
            value={filters.riskLevel || ''}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value || undefined })}
          >
            <option value="">{isRTL ? 'جميع مستويات الخطر' : 'All Risk Levels'}</option>
            <option value="high">{isRTL ? 'عالي' : 'High'}</option>
            <option value="medium">{isRTL ? 'متوسط' : 'Medium'}</option>
            <option value="low">{isRTL ? 'منخفض' : 'Low'}</option>
          </select>
          
          <select
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            style={isRTL ? { direction: 'rtl', paddingInlineStart: '0.75rem', paddingInlineEnd: '2rem' } : undefined}
            dir={isRTL ? 'rtl' : 'ltr'}
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
          >
            <option value="">{isRTL ? 'جميع الحالات' : 'All Status'}</option>
            <option value="open">{isRTL ? 'مفتوح' : 'Open'}</option>
            <option value="ongoing">{isRTL ? 'جاري' : 'Ongoing'}</option>
            <option value="closed">{isRTL ? 'مغلق' : 'Closed'}</option>
          </select>
          
          <select
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            style={isRTL ? { direction: 'rtl', paddingInlineStart: '0.75rem', paddingInlineEnd: '2rem' } : undefined}
            dir={isRTL ? 'rtl' : 'ltr'}
            value={filters.caseType || ''}
            onChange={(e) => setFilters({ ...filters, caseType: e.target.value || undefined })}
          >
            <option value="">{isRTL ? 'جميع أنواع الحالات' : 'All Case Types'}</option>
            <option value="pss">{isRTL ? 'الدعم النفسي الاجتماعي' : 'PSS'}</option>
            <option value="cp">{isRTL ? 'حماية الطفل' : 'Child Protection'}</option>
            <option value="gbv">{isRTL ? 'العنف القائم على النوع الاجتماعي' : 'GBV'}</option>
            <option value="protection">{isRTL ? 'الحماية' : 'Protection'}</option>
          </select>
        </div>
      </div>
      
      {/* Recent Cases */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className={`p-6 border-b border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h3 className="text-lg font-semibold text-gray-900">
            {isRTL ? 'الحالات الأخيرة' : 'Recent Cases'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
                  {isRTL ? 'رمز الحالة' : 'Case ID'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
                  {isRTL ? 'رمز المستفيد' : 'Beneficiary Code'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
                  {isRTL ? 'الجنس' : 'Gender'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
                  {isRTL ? 'العمر' : 'Age'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
                  {isRTL ? 'مستوى الخطر' : 'Risk Level'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
                  {isRTL ? 'نوع الحالة' : 'Case Type'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
                  {isRTL ? 'الحالة' : 'Status'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
                  {isRTL ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-sm">{isRTL ? 'لا توجد حالات مطابقة' : 'No cases match the current filters'}</p>
                  </td>
                </tr>
              ) : (
                recentCases.map((caseRecord) => (
                  <tr key={caseRecord.id} className="hover:bg-gray-50">
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {caseRecord.caseCode}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {caseRecord.beneficiaryCode}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {caseRecord.gender === 'male' ? (isRTL ? 'ذ' : 'M') : (isRTL ? 'أ' : 'F')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-end text-gray-600" dir="ltr">
                      {caseRecord.age}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <RiskBadge level={caseRecord.riskLevel} isRTL={isRTL} />
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                      {caseRecord.caseType}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <StatusBadge status={caseRecord.status} isRTL={isRTL} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onViewCase(caseRecord.id)}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                        style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}
                      >
                        {isRTL ? 'عرض' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'gray' | 'red' | 'orange' | 'purple';
}

function KPICard({ title, value, icon, color }: KPICardProps) {
  const { isRTL } = useLanguage();
  
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    gray: 'bg-gray-50 text-gray-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  
  // RTL Layout: VALUE first, then LABEL, then ICON (right to left)
  // LTR Layout: ICON first, then LABEL, then VALUE (left to right)
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4" 
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      {/* RTL: Show value first at the top-right */}
      {isRTL && (
        <p 
          className="text-2xl font-bold text-gray-900 mb-2 text-right"
          dir="ltr"
          style={{ textAlign: 'right' }}
        >
          {formatNumber(value)}
        </p>
      )}
      
      {/* Header: Title + Icon */}
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-start' : 'justify-between'} ${isRTL ? '' : 'mb-2'}`}>
        {/* Icon */}
        <div 
          className={`p-2 rounded-md ${colorClasses[color]} ${isRTL ? 'ml-2' : 'mr-2'}`}
        >
          {icon}
        </div>
        {/* Title */}
        <p 
          className={`text-xs font-medium text-gray-600 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}
          style={{ 
            direction: isRTL ? 'rtl' : 'ltr', 
            unicodeBidi: 'embed'
          }}
        >
          {title}
        </p>
      </div>
      
      {/* LTR: Show value at the bottom */}
      {!isRTL && (
        <p 
          className="text-2xl font-bold text-gray-900 text-left"
          dir="ltr"
        >
          {formatNumber(value)}
        </p>
      )}
    </div>
  );
}

// Risk Badge
function RiskBadge({ level, isRTL }: { level: string; isRTL: boolean }) {
  const colors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700'
  };
  
  const labels = {
    high: isRTL ? 'عالي' : 'High',
    medium: isRTL ? 'متوسط' : 'Medium',
    low: isRTL ? 'منخفض' : 'Low'
  };
  
  return (
    <span className={`px-2 py-1 ${colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700'} text-xs font-medium rounded-full uppercase`}>
      {labels[level as keyof typeof labels] || level}
    </span>
  );
}

// Status Badge
function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const colors = {
    open: 'bg-blue-100 text-blue-700',
    ongoing: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700'
  };
  
  const labels = {
    open: isRTL ? 'مفتوح' : 'Open',
    ongoing: isRTL ? 'جاري' : 'Ongoing',
    closed: isRTL ? 'مغلق' : 'Closed'
  };
  
  return (
    <span className={`px-2 py-1 ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'} text-xs font-medium rounded-full uppercase`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}
