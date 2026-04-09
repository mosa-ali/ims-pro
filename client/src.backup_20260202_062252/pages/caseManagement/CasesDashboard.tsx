import { useState } from 'react';
import { Users, TrendingUp, AlertCircle, Clock, Send, Calendar } from 'lucide-react';
import { useLanguage, formatNumber } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getCaseManagementKPIs, getCaseRecords } from '@/services/caseManagementService';
import type { CaseFilters } from '@/types/caseManagement';

interface CasesDashboardProps {
  projectId: number;
  onViewCase: (caseId: number) => void;
}

export function CasesDashboard({ projectId, onViewCase }: CasesDashboardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  const { user } = useAuth();
  
  const [filters, setFilters] = useState<CaseFilters>({});
  
  // Get KPIs
  const kpis = getCaseManagementKPIs(projectId);
  
  // Get recent cases
  const allCases = getCaseRecords(projectId, filters);
  const recentCases = allCases.slice(0, 5);
  
  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`mt-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-sm font-semibold text-gray-900">{t('caseManagement.caseManagementDashboard')}</h2>
        <p className="text-xs text-gray-600 mt-0.5">
          {t('caseManagement.project')}: Promoting Inclusion and Social Change through Sports | {t('caseManagement.donor')}: Adidas
        </p>
        <p className="text-sm text-gray-600">
          {t('caseManagement.role')}: {user?.role.replace('_', ' ')}
        </p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <KPICard
          title={t('caseManagement.totalActiveCases')}
          value={kpis.totalActiveCases}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <KPICard
          title={t('caseManagement.newCasesThisMonth')}
          value={kpis.newCasesThisMonth}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <KPICard
          title={t('caseManagement.closedCases')}
          value={kpis.closedCases}
          icon={<Calendar className="w-5 h-5" />}
          color="gray"
        />
        <KPICard
          title={t('caseManagement.highRiskCases')}
          value={kpis.highRiskCases}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
        />
        <KPICard
          title={t('caseManagement.pendingReferrals')}
          value={kpis.pendingReferrals}
          icon={<Send className="w-5 h-5" />}
          color="orange"
        />
        <KPICard
          title={t('caseManagement.followUpsDue')}
          value={kpis.followUpsDue}
          icon={<Clock className="w-5 h-5" />}
          color="purple"
        />
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className={`flex items-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          <select
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            value={filters.gender || ''}
            onChange={(e) => setFilters({ ...filters, gender: e.target.value as any })}
          >
            <option value="">{t('caseManagement.allGender')}</option>
            <option value="male">{t('caseManagement.male')}</option>
            <option value="female">{t('caseManagement.female')}</option>
          </select>
          
          <select
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            value={filters.riskLevel || ''}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value as any })}
          >
            <option value="">{t('caseManagement.allRiskLevels')}</option>
            <option value="high">{t('caseManagement.riskHigh')}</option>
            <option value="medium">{t('caseManagement.riskMedium')}</option>
            <option value="low">{t('caseManagement.riskLow')}</option>
          </select>
          
          <select
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
          >
            <option value="">{t('caseManagement.allStatus')}</option>
            <option value="open">{t('caseManagement.statusOpen')}</option>
            <option value="ongoing">{t('caseManagement.statusOngoing')}</option>
            <option value="closed">{t('caseManagement.statusClosed')}</option>
          </select>
          
          <select
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
            value={filters.caseType || ''}
            onChange={(e) => setFilters({ ...filters, caseType: e.target.value as any })}
          >
            <option value="">{t('caseManagement.allCaseTypes')}</option>
            <option value="pss">{t('caseManagement.typePSS')}</option>
            <option value="cp">{t('caseManagement.typeCP')}</option>
            <option value="gbv">{t('caseManagement.typeGBV')}</option>
            <option value="protection">{t('caseManagement.typeProtection')}</option>
          </select>
        </div>
      </div>
      
      {/* Recent Cases */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className={`p-6 border-b border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h3 className="text-lg font-semibold text-gray-900">{t('caseManagement.recentCases')}</h3>
        </div>
        <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.caseId')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.beneficiaryCode')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.gender')}
                </th>
                <th className="px-6 py-3 text-end text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('caseManagement.age')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.riskLevel')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.caseType')}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.status')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  {t('caseManagement.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-sm">{t('caseManagement.noCasesMatch')}</p>
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
                      {caseRecord.gender === 'male' ? t('caseManagement.male').substring(0, 1) : t('caseManagement.female').substring(0, 1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-end text-gray-600" dir="ltr">
                      {caseRecord.age}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <RiskBadge level={caseRecord.riskLevel} />
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                      {caseRecord.caseType}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <StatusBadge status={caseRecord.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => onViewCase(caseRecord.id)}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        {t('caseManagement.view')}
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    gray: 'bg-gray-50 text-gray-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <p className={`text-xs font-medium text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{title}</p>
        <div className={`p-2 rounded-md ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
        {formatNumber(value)}
      </p>
    </div>
  );
}

// Risk Badge
function RiskBadge({ level }: { level: string }) {
  
  
  const colors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700'
  };
  
  const labels = {
    high: t('caseManagement.riskHigh'),
    medium: t('caseManagement.riskMedium'),
    low: t('caseManagement.riskLow')
  };
  
  return (
    <span className={`px-2 py-1 ${colors[level as keyof typeof colors]} text-xs font-medium rounded-full uppercase`}>
      {labels[level as keyof typeof labels]}
    </span>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  
  
  const colors = {
    open: 'bg-blue-100 text-blue-700',
    ongoing: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700'
  };
  
  const labels = {
    open: t('caseManagement.statusOpen'),
    ongoing: t('caseManagement.statusOngoing'),
    closed: t('caseManagement.statusClosed')
  };
  
  return (
    <span className={`px-2 py-1 ${colors[status as keyof typeof colors]} text-xs font-medium rounded-full uppercase`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}