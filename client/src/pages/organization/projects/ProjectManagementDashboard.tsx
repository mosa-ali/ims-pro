// ============================================================================
// PROJECT MANAGEMENT DASHBOARD
// Comprehensive overview of all projects, budgets, and performance metrics
// Integrated Management System (IMS)
// ============================================================================

import { 
 DollarSign, 
 Calendar, 
 FileText,
 Loader2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { RecentActivityFeed } from '@/components/RecentActivityFeed';
export default function ProjectManagementDashboard() {
 const { language, direction, isRTL} = useLanguage();
 const { t } = useTranslation();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
// Project CRUD operations moved to /organization/projects-list

 // Get reporting schedules count
 const { data: reportingSchedulesCount = 0 } = trpc.reportingSchedules.getCount.useQuery({
 organizationId: currentOrganizationId || 1,
 operatingUnitId: currentOperatingUnitId || 1,
 }, {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 });

 const { data: kpis, isLoading: kpisLoading } = trpc.projects.getDashboardKPIs.useQuery(
 {},
 { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
 );

 // All project CRUD handlers moved to /organization/projects-list

 ;
if (!currentOrganizationId) {
 return (
 <div className="p-8 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
 <p className="text-gray-500">Please select an organization to view projects.</p>
 </div>
 );
 }

 return (
 <div className="p-8 space-y-8">

 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{t.projectMgmtDashboard.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{t.projectMgmtDashboard.subtitle}</p>
 </div>

 {/* Top 5 Primary Cards - Cards Grid Landing View */}
 {/* Top Cards Row */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
 {/* 1. Projects Management (CORE CARD) */}
 <Link href="/organization/projects-list">
 <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
 <div className="flex items-center justify-between mb-4">
 <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
 <FileText className="w-6 h-6 text-indigo-600" />
 </div>
 <div className="text-3xl font-bold text-gray-900">{kpis?.totalProjects || 0}</div>
 </div>
 <div className="text-sm font-semibold text-gray-900 mb-1">{t.projectMgmtDashboard.projectsManagement}</div>
 <div className="text-xs text-gray-600 mb-2">{t.projectMgmtDashboard.projectsManagementDesc}</div>
 <div className="text-xs text-indigo-600 font-medium">{t.projectMgmtDashboard.projectsManagementLink}</div>
 </div>
 </Link>

 {/* 2. Project Reporting Schedule */}
 <Link href="/organization/reporting-schedule">
 <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
 <div className="flex items-center justify-between mb-4">
 <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
 <Calendar className="w-6 h-6 text-purple-600" />
 </div>
 <div className="text-3xl font-bold text-gray-900">{reportingSchedulesCount}</div>
 </div>
 <div className="text-sm font-semibold text-gray-900 mb-1">{t.projectMgmtDashboard.reportingSchedule}</div>
 <div className="text-xs text-gray-600 mb-2">{t.projectMgmtDashboard.reportingScheduleDesc}</div>
 <div className="text-xs text-purple-600 font-medium">{t.projectMgmtDashboard.reportingScheduleLink}</div>
 </div>
 </Link>

 {/* 5. Annual Programs Report */}
 <Link href="/organization/annual-report">
 <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
 <div className="flex items-center justify-between mb-4">
 <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
 <FileText className="w-6 h-6 text-green-600" />
 </div>
 {t.projectMgmtDashboard.annualReportValue && (
 <div className="text-3xl font-bold text-gray-900">{t.projectMgmtDashboard.annualReportValue}</div>
 )}
 </div>
 <div className="text-sm font-semibold text-gray-900 mb-1">{t.projectMgmtDashboard.annualReport}</div>
 <div className="text-xs text-gray-600 mb-2">{t.projectMgmtDashboard.annualReportDesc}</div>
 <div className="text-xs text-green-600 font-medium">{t.projectMgmtDashboard.annualReportLink}</div>
 </div>
 </Link>
 </div>

 {/* KPIs Row - Portfolio Health, Performance, Compliance */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {kpisLoading ? (
 <div className="flex items-center justify-center col-span-3">
 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
 </div>
 ) : (
 <>
 {/* Portfolio Health - Equal width with Performance */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{t.projectMgmtDashboard.portfolioHealth}</h3>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <div className="text-xs text-gray-500 mb-2 h-8">{t.projectMgmtDashboard.totalBudget}</div>
 <div className="text-2xl font-bold text-gray-900">
 ${((kpis?.totalBudgetUSD || 0) / 1000000).toFixed(1)}M
 </div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-2 h-8">{t.projectMgmtDashboard.actualSpent}</div>
 <div className="text-2xl font-bold text-gray-900">
 ${((kpis?.actualSpentUSD || 0) / 1000000).toFixed(1)}M
 </div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-2 h-8">{t.projectMgmtDashboard.balance}</div>
 <div className="text-2xl font-bold text-gray-900">
 ${((kpis?.balanceUSD || 0) / 1000000).toFixed(1)}M
 </div>
 </div>
 </div>
 </div>

 {/* Performance */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{t.projectMgmtDashboard.performance}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="text-xs text-gray-500 mb-2 h-8">{t.projectMgmtDashboard.avgCompletionRate}</div>
 <div className="text-2xl font-bold text-gray-900">{(kpis?.avgCompletionRate || 0).toFixed(1)}%</div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-2 h-8">{t.projectMgmtDashboard.projectsOnTrack}</div>
 <div className="text-2xl font-bold text-gray-900">
 <span className="text-green-600">{kpis?.projectsOnTrack || 0}</span>
 {' / '}
 <span className="text-red-600">{kpis?.projectsAtRisk || 0}</span>
 </div>
 </div>
 </div>
 </div>

 {/* Compliance */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{t.projectMgmtDashboard.compliance}</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <div className="text-xs text-gray-500 mb-2 h-8">{t.projectMgmtDashboard.reportingComplianceRate}</div>
 <div className="text-2xl font-bold text-gray-900">{(kpis?.reportingComplianceRate || 0).toFixed(1)}%</div>
 </div>
 <div>
 <div className="text-xs text-gray-500 mb-2 h-8">{t.projectMgmtDashboard.pendingApprovals}</div>
 <div className="text-2xl font-bold text-gray-900">{kpis?.pendingApprovals || 0}</div>
 </div>
 </div>
 </div>
 </>
 )}
 </div>

 {/* Recent Activity Feed */}
 <div className="mt-8">
 <RecentActivityFeed limit={20} autoRefresh={true} refreshInterval={30000} />
 </div>

 {/* Project List moved to /organization/projects-list */}
 {/* Use the Projects Management card to navigate to the full project list */}


 {/* Project CRUD modals moved to /organization/projects-list */}
 </div>
 );
}
