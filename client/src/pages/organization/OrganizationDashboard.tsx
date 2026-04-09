// ============================================================================
// ORGANIZATION DASHBOARD
// Operational overview for Organization users
// Integrated Management System (IMS)
// ============================================================================

import { Briefcase, Users, Wallet, Target, TrendingUp, AlertCircle, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
export default function OrganizationDashboard() {
 const { t } = useTranslation();
 const { language, direction, isRTL} = useLanguage();
 const { currentOrganization, currentOrganizationId } = useOrganization();
 const { currentOperatingUnit, currentOperatingUnitId } = useOperatingUnit();

 // Fetch real KPIs from backend (enforces data isolation)
 const { data: projectKPIs, isLoading: projectKPIsLoading } = trpc.projects.getDashboardKPIs.useQuery(
 {},
 {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 refetchOnWindowFocus: false,
 }
 );

 const { data: grantsKPIs, isLoading: grantsKPIsLoading } = trpc.grants.getDashboardKPIs.useQuery(
 {},
 {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 refetchOnWindowFocus: false,
 }
 );

 // Fetch employee counts from HR module (enforces data isolation)
 const { data: employeeCounts, isLoading: employeeCountsLoading } = trpc.hrEmployees.getCounts.useQuery(
 {},
 {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 refetchOnWindowFocus: false,
 }
 );

 // Fetch real projects for Pipeline Status section
 const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery(
 { limit: 5 },
 {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 refetchOnWindowFocus: false,
 }
 );

 // Fetch organization activity logs
 const { data: activityLogsData, isLoading: activityLogsLoading } = trpc.ims.auditLogs.list.useQuery(
 { limit: 5, offset: 0 },
 {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 refetchOnWindowFocus: false,
 }
 );

 // Format currency
 const formatCurrency = (amount: number) => {
if (amount >= 1_000_000) {
 return `$${(amount / 1_000_000).toFixed(1)}M`;
 } else if (amount >= 1_000) {
 return `$${(amount / 1_000).toFixed(1)}K`;
 }
 return `$${amount.toFixed(0)}`;
 };

 const kpis = [
 { 
 label: 'Active Projects', 
 labelAr: 'المشاريع النشطة', 
 value: projectKPIsLoading ? '...' : (projectKPIs?.totalProjects?.toString() || '0'), 
 icon: Briefcase, 
 color: 'text-blue-600', 
 bg: 'bg-blue-50' 
 },
 { 
 label: 'Total Employees', 
 labelAr: 'إجمالي الموظفين', 
 value: employeeCountsLoading ? '...' : ((employeeCounts?.active || 0) + (employeeCounts?.archived || 0)).toString(),
 icon: Users, 
 color: 'text-indigo-600', 
 bg: 'bg-indigo-50' 
 },
 { 
 label: 'Total Budget', 
 labelAr: 'إجمالي الميزانية', 
 value: projectKPIsLoading ? '...' : formatCurrency(projectKPIs?.totalBudgetUSD || 0), 
 icon: Wallet, 
 color: 'text-emerald-600', 
 bg: 'bg-emerald-50' 
 },
 { 
 label: 'Grant Execution', 
 labelAr: 'تنفيذ المنح', 
 value: projectKPIsLoading ? '...' : `${Math.round(projectKPIs?.avgCompletionRate || 0)}%`, 
 icon: Target, 
 color: 'text-orange-600', 
 bg: 'bg-orange-50' 
 },
 ];

 ;
return (
 <div className="p-8 max-w-7xl mx-auto space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Context Banner (Phase 0 Spec 3 & 4) */}
 <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="space-y-1">
 <div className="flex items-center gap-2 mb-2">
 <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
 {t.orgDashboardLabels.operatingUnitContext}
 </span>
 <span className="bg-green-400 w-2 h-2 rounded-full animate-pulse" />
 </div>
 <h1 className="text-4xl font-black tracking-tight">
 {currentOrganization?.name || 'Loading...'}
 </h1>
 <p className="text-blue-100 font-bold text-lg flex items-center gap-2">
 {currentOperatingUnit?.name || 'Headquarters'}
 <span className="opacity-50">•</span>
 {currentOperatingUnit?.country || 'Yemen'}
 </p>
 </div>
 <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex items-center gap-6">
 <div className="text-center">
 <div className="text-2xl font-black">{projectKPIsLoading ? '...' : `${Math.round(projectKPIs?.reportingComplianceRate || 0)}%`}</div>
 <div className="text-[10px] uppercase font-black tracking-wider opacity-70">{t.orgDashboardLabels.compliance}</div>
 </div>
 <div className="w-px h-10 bg-white/20" />
 <div className="text-center">
 <div className="text-2xl font-black">{grantsKPIsLoading ? '...' : (grantsKPIs?.activeGrants || 0)}</div>
 <div className="text-[10px] uppercase font-black tracking-wider opacity-70">{t.orgDashboardLabels.activeGrants}</div>
 </div>
 </div>
 </div>
 <div className="absolute top-0 end-0 w-64 h-64 bg-white/5 rounded-full -me-20 -mt-20" />
 </div>

 {/* KPI Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {kpis.map((kpi, idx) => (
 <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
 <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform`}>
 <kpi.icon className="w-6 h-6" />
 </div>
 <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">
 {language === 'en' ? kpi.label : kpi.labelAr}
 </div>
 <div className="text-3xl font-black text-gray-900 mt-1">{kpi.value}</div>
 <div className="text-xs text-gray-500 mt-1">
 {idx === 0 && t.orgDashboardLabels.acrossAllPrograms}
 {idx === 1 && t.orgDashboardLabels.fullTimeStaff}
 {idx === 2 && t.orgDashboardLabels.allocatedFunds}
 {idx === 3 && t.orgDashboardLabels.onTrackStatus}
 </div>
 </div>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Alerts & Notifications */}
 <div className="lg:col-span-1 space-y-6">
 <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
 <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
 <AlertCircle className="w-5 h-5 text-red-500" />
 {t.orgDashboardLabels.complianceAlerts}
 </h3>
 <p className="text-xs text-gray-500 mb-4">{t.orgDashboardLabels.itemsRequiringAttention}</p>
 <div className="space-y-4">
 {[
 { title: t.orgDashboardLabels.quarterlyReportOverdue, desc: t.orgDashboardLabels.quarterlyReportDesc, date: '2', priority: 'High' },
 { title: t.orgDashboardLabels.budgetRevisionNeeded, desc: t.orgDashboardLabels.budgetRevisionDesc, date: '5', priority: 'Medium' },
 ].map((alert, i) => (
 <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
 <div className="flex items-center justify-between mb-1">
 <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${alert.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
 {alert.priority === 'High' ? t.orgDashboardLabels.highPriority : t.orgDashboardLabels.mediumPriority}
 </span>
 <span className="text-[10px] font-bold text-gray-400">
 {`${alert.date} ${t.orgDashboardLabels.daysAgo}`}
 </span>
 </div>
 <div className="text-sm font-bold text-gray-900 mb-1">{alert.title}</div>
 <div className="text-xs text-gray-600">{alert.desc}</div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Operational Highlights */}
 <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
 <div className="p-6 border-b border-gray-50 flex items-center justify-between">
 <h3 className="text-lg font-black text-gray-900">
 {t.orgDashboardLabels.projectPipelineStatus}
 </h3>
 <button className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
 {t.orgDashboardLabels.viewAll}
 {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
 </button>
 </div>
 <div className="p-6">
 <p className="text-xs text-gray-500 mb-6">{t.orgDashboardLabels.activeProjectProgress}</p>
 <div className="space-y-8">
 {projectsLoading ? (
 <div className="text-center text-gray-500 py-4">Loading projects...</div>
 ) : projectsData && projectsData.length > 0 ? (
 projectsData.slice(0, 3).map((project: any) => {
 const progress = project.budgetUtilization || 0;
 const budgetAmount = parseFloat(project.totalBudget?.toString() || '0');
 const budgetDisplay = budgetAmount >= 1_000_000 
 ? `$${(budgetAmount / 1_000_000).toFixed(1)}M` 
 : budgetAmount >= 1_000 
 ? `$${(budgetAmount / 1_000).toFixed(1)}K` 
 : `$${budgetAmount.toFixed(0)}`;
 const statusText = project.status === 'active' ? t.orgDashboardLabels.onTrack : project.status;
 const statusColor = project.status === 'active' ? 'text-green-600' : 'text-blue-600';
 const bgColor = project.status === 'active' ? 'bg-green-50' : 'bg-blue-50';
 
 return (
 <div key={project.id} className="space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <div className="font-bold text-gray-900">{project.title}</div>
 <div className="text-xs text-gray-500 font-medium mt-1">{project.description || 'No description'}</div>
 <div className="flex items-center gap-2 mt-2">
 <span className="text-xs text-gray-500">{budgetDisplay}</span>
 <span className="text-xs text-gray-400">•</span>
 <span className={`text-xs font-semibold px-2 py-0.5 rounded ${bgColor} ${statusColor}`}>
 {statusText}
 </span>
 </div>
 </div>
 <span className="text-sm font-black text-gray-700">{Math.round(progress)}%</span>
 </div>
 <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
 <div 
 className={`h-full transition-all duration-1000 ${progress > 80 ? 'bg-emerald-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
 style={{ width: `${progress}%` }} 
 />
 </div>
 </div>
 );
 })
 ) : (
 <div className="text-center text-gray-500 py-4">
 {t.organizationModule.noProjectsFound}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 {/* Organization Activity Log */}
 <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
 <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
 <FileText className="w-5 h-5 text-blue-600" />
 {language === 'en' ? 'Organization Activity' : 'نشاط المنظمة'}
 </h3>
 <p className="text-xs text-gray-500 mb-4">
 {language === 'en' ? 'Recent activities and changes in your organization' : 'الأنشطة والتغييرات الأخيرة في منظمتك'}
 </p>
 <div className="space-y-3">
 {activityLogsLoading ? (
 <div className="text-center text-gray-500 py-4">Loading...</div>
 ) : activityLogsData && activityLogsData.logs && activityLogsData.logs.length > 0 ? (
 activityLogsData.logs.slice(0, 5).map((log: any) => {
 const timeAgo = log.createdAt ? new Date(log.createdAt).toLocaleDateString() : '-';
 return (
 <div key={log.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
 <div className="flex items-start justify-between mb-1">
 <div className="font-medium text-sm text-gray-900">{log.userName || 'Unknown User'}</div>
 <span className="text-[10px] font-bold text-gray-400">{timeAgo}</span>
 </div>
 <div className="text-xs text-gray-600">
 <span className="font-semibold text-gray-700">{log.action}</span> on {log.entityType}
 </div>
 </div>
 );
 })
 ) : (
 <div className="text-center text-gray-500 py-4">
 {language === 'en' ? 'No recent activities' : 'لا توجد أنشطة حديثة'}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
