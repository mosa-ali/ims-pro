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

export function CasesDashboard({
 projectId, onViewCase }: CasesDashboardProps) {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const { user } = useAuth();
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
 <div className="flex items-center justify-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 <span className="ms-2 text-gray-600">{t.common.loading}...</span>
 </div>
 );
 }
 
 return (
 <div className="space-y-6">
 {/* Header with Bilingual Support */}
 <div className={`mt-6 text-start`}>
 <h2 className="text-sm font-semibold text-gray-900">
 {t.projectDetail.caseManagementDashboard}
 </h2>
 <p className="text-xs text-gray-600 mt-0.5">
 {t.projectDetail.project}: {t.projectDetail.promotingInclusionAndSocialChangeThrough}
 </p>
 <p className="text-sm text-gray-600">
 {t.projectDetail.role}: {user?.role?.replace('_', ' ') || 'User'}
 </p>
 </div>
 
 {/* KPI Cards */}
 <div 
 className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4"
 
 >
 <KPICard
 title={t.projectDetail.totalActiveCases}
 value={kpis?.totalActiveCases || 0}
 icon={<Users className="w-5 h-5" />}
 color="blue"
 />
 <KPICard
 title={t.projectDetail.newCasesThisMonth}
 value={kpis?.newCasesThisMonth || 0}
 icon={<TrendingUp className="w-5 h-5" />}
 color="green"
 />
 <KPICard
 title={t.projectDetail.closedCases}
 value={kpis?.closedCases || 0}
 icon={<Calendar className="w-5 h-5" />}
 color="gray"
 />
 <KPICard
 title={t.projectDetail.highRiskCases}
 value={kpis?.highRiskCases || 0}
 icon={<AlertCircle className="w-5 h-5" />}
 color="red"
 />
 <KPICard
 title={t.projectDetail.pendingReferrals}
 value={kpis?.pendingReferrals || 0}
 icon={<Send className="w-5 h-5" />}
 color="orange"
 />
 <KPICard
 title={t.projectDetail.followupsDue}
 value={kpis?.followUpsDue || 0}
 icon={<Clock className="w-5 h-5" />}
 color="purple"
 />
 </div>
 
 {/* Filters */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
 <div className={`flex items-center gap-4 flex-wrap`}>
 <select
 className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 style={isRTL ? { direction: 'rtl', paddingInlineStart: '0.75rem', paddingInlineEnd: '2rem' } : undefined}
 
 value={filters.gender || ''}
 onChange={(e) => setFilters({ ...filters, gender: e.target.value || undefined })}
 >
 <option value="">{t.projectDetail.allGender}</option>
 <option value="male">{t.projectDetail.male}</option>
 <option value="female">{t.projectDetail.female}</option>
 </select>
 
 <select
 className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 style={isRTL ? { direction: 'rtl', paddingInlineStart: '0.75rem', paddingInlineEnd: '2rem' } : undefined}
 
 value={filters.riskLevel || ''}
 onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value || undefined })}
 >
 <option value="">{t.projectDetail.allRiskLevels}</option>
 <option value="high">{t.projectDetail.high}</option>
 <option value="medium">{t.projectDetail.medium}</option>
 <option value="low">{t.projectDetail.low}</option>
 </select>
 
 <select
 className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 style={isRTL ? { direction: 'rtl', paddingInlineStart: '0.75rem', paddingInlineEnd: '2rem' } : undefined}
 
 value={filters.status || ''}
 onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
 >
 <option value="">{t.projectDetail.allStatus}</option>
 <option value="open">{t.projectDetail.open}</option>
 <option value="ongoing">{t.projectDetail.ongoing}</option>
 <option value="closed">{t.projectDetail.closed}</option>
 </select>
 
 <select
 className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-start`}
 style={isRTL ? { direction: 'rtl', paddingInlineStart: '0.75rem', paddingInlineEnd: '2rem' } : undefined}
 
 value={filters.caseType || ''}
 onChange={(e) => setFilters({ ...filters, caseType: e.target.value || undefined })}
 >
 <option value="">{t.projectDetail.allCaseTypes}</option>
 <option value="pss">{t.projectDetail.pss}</option>
 <option value="cp">{t.projectDetail.childProtection}</option>
 <option value="gbv">{t.projectDetail.gbv}</option>
 <option value="protection">{t.projectDetail.protection}</option>
 </select>
 </div>
 </div>
 
 {/* Recent Cases */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 <div className={`p-6 border-b border-gray-200 text-start`}>
 <h3 className="text-lg font-semibold text-gray-900">
 {t.projectDetail.recentCases}
 </h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 {t.projectDetail.caseId}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 {t.projectDetail.beneficiaryCode}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 {t.projectDetail.gender}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 {t.projectDetail.age}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 {t.projectDetail.riskLevel27}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 {t.projectDetail.caseType}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 {t.projectDetail.status}
 </th>
 <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 {t.projectDetail.actions}
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {recentCases.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
 <p className="text-sm">{t.projectDetail.noCasesMatchTheCurrentFilters}</p>
 </td>
 </tr>
 ) : (
 recentCases.map((caseRecord) => (
 <tr key={caseRecord.id} className="hover:bg-gray-50">
 <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-start`}>
 {caseRecord.caseCode}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {caseRecord.beneficiaryCode}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-start`}>
 {caseRecord.gender === 'male' ? (t.projectDetail.m) : (t.projectDetail.f)}
 </td>
 <td className="ltr-safe px-6 py-4 whitespace-nowrap text-sm text-end text-gray-600">
 {caseRecord.age}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-start`}>
 <RiskBadge level={caseRecord.riskLevel} isRTL={isRTL} />
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 uppercase text-start`}>
 {caseRecord.caseType}
 </td>
 <td className={`px-6 py-4 whitespace-nowrap text-sm text-start`}>
 <StatusBadge status={caseRecord.status} isRTL={isRTL} />
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-center">
 <button
 onClick={() => onViewCase(caseRecord.id)}
 className="text-primary hover:text-primary/80 text-sm font-medium"
 style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}
 >
 {t.projectDetail.view}
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

function KPICard({
 title, value, icon, color }: KPICardProps) {
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
 
 
 >
 {/* RTL: Show value first at the top-right */}
 {isRTL && (
 <p 
 className="ltr-safe text-2xl font-bold text-gray-900 mb-2 text-end"
 style={{ textAlign: 'right' }}
 >
 {formatNumber(value)}
 </p>
 )}
 
 {/* Header: Title + Icon */}
 <div className={`flex items-center justify-between ${isRTL ? '' : 'mb-2'}`}>
 {/* Icon */}
 <div 
 className={`p-2 rounded-md ${colorClasses[color]} me-2`}
 >
 {icon}
 </div>
 {/* Title */}
 <p 
 className={`text-xs font-medium text-gray-600 flex-1 text-start`}
 style={{ 
 direction: 'ltr', 
 unicodeBidi: 'embed'
 }}
 >
 {title}
 </p>
 </div>
 
 {/* LTR: Show value at the bottom */}
 {!isRTL && (
 <p 
 className="ltr-safe text-2xl font-bold text-gray-900 text-start"
 >
 {formatNumber(value)}
 </p>
 )}
 </div>
 );
}

// Risk Badge
function RiskBadge({
 level, isRTL }: { level: string; isRTL: boolean }) {
 const colors = {
 high: 'bg-red-100 text-red-700',
 medium: 'bg-yellow-100 text-yellow-700',
 low: 'bg-green-100 text-green-700'
 };
 
 const labels = {
 high: t.projectDetail.high,
 medium: t.projectDetail.medium,
 low: t.projectDetail.low
 };
 
 return (
 <span className={`px-2 py-1 ${colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-700'} text-xs font-medium rounded-full uppercase`}>
 {labels[level as keyof typeof labels] || level}
 </span>
 );
}

// Status Badge
function StatusBadge({
 status, isRTL }: { status: string; isRTL: boolean }) {
 const colors = {
 open: 'bg-blue-100 text-blue-700',
 ongoing: 'bg-green-100 text-green-700',
 closed: 'bg-gray-100 text-gray-700'
 };
 
 const labels = {
 open: t.projectDetail.open,
 ongoing: t.projectDetail.ongoing,
 closed: t.projectDetail.closed
 };
 
 return (
 <span className={`px-2 py-1 ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'} text-xs font-medium rounded-full uppercase`}>
 {labels[status as keyof typeof labels] || status}
 </span>
 );
}
