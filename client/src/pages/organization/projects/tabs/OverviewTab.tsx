import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { 
 Calendar, MapPin, DollarSign, TrendingUp, 
 Activity, Target, Users, AlertCircle, CheckCircle2, FileDown, FileSpreadsheet 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel, exportToPDF, type ProjectOverviewData } from '@/lib/exportUtils';
import { OverviewTabSkeleton } from "@/components/ProjectTabSkeletons";
import { useTranslation } from '@/i18n/useTranslation';

interface OverviewTabProps {
 projectId: string;
 onNavigateToActivities?: () => void;
}

export function OverviewTab({
 projectId, onNavigateToActivities }: OverviewTabProps) {
 const { isRTL } = useLanguage();
 const { t } = useTranslation();
// Fetch project details from tRPC
 const { data: project, isLoading } = trpc.projects.getById.useQuery(
 { id: Number(projectId) },
 { enabled: !!projectId }
 );

 // Fetch activities statistics from database
 const { data: activitiesStats } = trpc.activities.getStatistics.useQuery(
 { 
 projectId: Number(projectId),
 organizationId: project?.organizationId || 0,
 operatingUnitId: project?.operatingUnitId || 0,
 },
 { enabled: !!project }
 );

 // Fetch indicators statistics from database
 const { data: indicatorsStats } = trpc.indicators.getStatistics.useQuery(
 { 
 projectId: Number(projectId),
 organizationId: project?.organizationId || 0,
 operatingUnitId: project?.operatingUnitId || 0,
 },
 { enabled: !!project }
 );

 // Fetch beneficiaries statistics from database
 const { data: beneficiariesStats } = trpc.beneficiaries.getStatistics.useQuery(
 { 
 projectId: Number(projectId),
 organizationId: project?.organizationId || 0,
 operatingUnitId: project?.operatingUnitId || 0,
 },
 { enabled: !!project }
 );

 // Auto-calculate KPIs from database data
 const kpis = useMemo(() => {
 const completedActivities = activitiesStats?.completed || 0;
 const totalActivities = activitiesStats?.total || 0;
 
 const achievedIndicators = indicatorsStats?.achieved || 0;
 const totalIndicators = indicatorsStats?.total || 0;
 
 const totalBeneficiaries = beneficiariesStats?.total || 0;
 
 // Calculate budget utilization from project data
 const budgetUtilization = project ? 
 (Number(project.totalBudget) > 0 ? (Number(project.spent) / Number(project.totalBudget)) * 100 : 0) : 0;
 
 // Calculate time-based timeline progress
 const timelineProgress = project ? (() => {
 const now = new Date();
 const start = new Date(project.startDate);
 const end = new Date(project.endDate);
 
 // If project hasn't started yet, progress is 0%
 if (now < start) return 0;
 
 // If project has ended, progress is 100%
 if (now >= end) return 100;
 
 // Calculate elapsed time percentage
 const totalDuration = end.getTime() - start.getTime();
 const elapsed = now.getTime() - start.getTime();
 
 return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
 })() : 0;
 
 return {
 activities: {
 completed: completedActivities,
 total: totalActivities,
 percentage: totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0
 },
 indicators: {
 achieved: achievedIndicators,
 total: totalIndicators,
 percentage: totalIndicators > 0 ? (achievedIndicators / totalIndicators) * 100 : 0
 },
 beneficiaries: {
 reached: totalBeneficiaries,
 planned: 0, // TODO: Add planned beneficiaries field to project
 percentage: 0
 },
 budget: {
 approved: project ? Number(project.totalBudget) : 0,
 spent: project ? Number(project.spent) : 0,
 remaining: project ? Number(project.totalBudget) - Number(project.spent) : 0,
 utilization: budgetUtilization,
 currency: project?.currency || 'USD'
 },
 timeline: {
 progress: timelineProgress
 }
 };
 }, [project, projectId, activitiesStats, indicatorsStats, beneficiariesStats]);

 // Calculate project status
 const projectStatus = useMemo(() => {
 if (!project) return 'unknown';
 
 const now = new Date();
 const start = new Date(project.startDate);
 const end = new Date(project.endDate);
 
 if (now < start) return 'not_started';
 if (now > end) return 'completed';
 return 'active';
 }, [project]);

 // Fetch latest activities from database via tRPC
 const { data: activitiesData } = trpc.activities.getByProject.useQuery(
 { projectId: Number(projectId) },
 { enabled: !!projectId }
 );

 // Get latest 3 activities for preview (auto-loaded from database)
 const latestActivities = useMemo(() => {
 if (!activitiesData) return [];
 
 // Sort by date and get latest 3
 return [...activitiesData]
 .sort((a, b) => new Date(b.createdAt || b.plannedStartDate).getTime() - new Date(a.createdAt || a.plannedStartDate).getTime())
 .slice(0, 3);
 }, [activitiesData]);

 if (isLoading) {
 return <OverviewTabSkeleton />;
 }

 if (!project) {
 return (
 <div className="flex flex-col items-center justify-center py-12" dir={isRTL ? 'rtl' : 'ltr'}>
 <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
 <p className="text-gray-600">{t.projectDetail.projectNotFound}</p>
 </div>
 );
 }

 // Handle export actions
 const handleExportExcel = () => {
 if (!project) return;
 const exportData: ProjectOverviewData = {
 project: {
 id: project.id,
 projectName: project.title,
 projectNameAr: project.titleAr,
 startDate: project.startDate,
 endDate: project.endDate,
 status: project.status,
 totalBudget: project.totalBudget,
 spent: project.spent,
 currency: project.currency,
 location: project.location,
 locationAr: project.locationAr,
 description: project.description,
 descriptionAr: project.descriptionAr,
 },
 kpis,
 };
 exportToExcel(exportData, isRTL);
 };

 const handleExportPDF = () => {
 if (!project) return;
 const exportData: ProjectOverviewData = {
 project: {
 id: project.id,
 projectName: project.title,
 projectNameAr: project.titleAr,
 startDate: project.startDate,
 endDate: project.endDate,
 status: project.status,
 totalBudget: project.totalBudget,
 spent: project.spent,
 currency: project.currency,
 location: project.location,
 locationAr: project.locationAr,
 description: project.description,
 descriptionAr: project.descriptionAr,
 },
 kpis,
 };
 exportToPDF(exportData, isRTL);
 };

 return (
 <div className="space-y-6">
 {/* Export Buttons */}
 <div className={`flex gap-2 ${'justify-end'}`}>
 <Button onClick={handleExportExcel} variant="outline" size="sm">
 <FileSpreadsheet className="w-4 h-4 me-2" />
 {t.projectDetail.exportExcel}
 </Button>
 <Button onClick={handleExportPDF} variant="outline" size="sm">
 <FileDown className="w-4 h-4 me-2" />
 {t.projectDetail.exportPdf}
 </Button>
 </div>

 {/* A. Project Snapshot */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.projectSnapshot}
 </h2>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <InfoItem 
 icon={<Activity className="w-5 h-5" />}
 label={t.projectDetail.projectName}
 value={isRTL ? (project.titleAr || project.title) : project.title}
 isRTL={isRTL}
 />
 <InfoItem 
 icon={<Activity className="w-5 h-5" />}
 label={t.projectDetail.projectCode}
 value={project?.projectCode || 'N/A'}
 isRTL={isRTL}
 />
 <InfoItem 
 icon={<Calendar className="w-5 h-5" />}
 label={t.projectDetail.projectDuration}
 value={`${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.endDate).toLocaleDateString()}`}
 isRTL={isRTL}
 />
 <InfoItem 
 icon={<CheckCircle2 className="w-5 h-5" />}
 label={t.projectDetail.projectStatus}
 value={
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ projectStatus === 'active' ? 'bg-green-100 text-green-800' : projectStatus === 'completed' ? 'bg-blue-100 text-blue-800' : projectStatus === 'not_started' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800' }`}>
 {projectStatus === 'active' ? (t.projectDetail.active) :
 projectStatus === 'completed' ? (t.projectDetail.completed) :
 projectStatus === 'not_started' ? (t.projectDetail.notStarted) :
 (t.projectDetail.unknown)}
 </span>
 }
 isRTL={isRTL}
 />
 {project.location && (
 <InfoItem 
 icon={<MapPin className="w-5 h-5" />}
 label={t.projectDetail.location}
 value={isRTL ? (project.locationAr || project.location) : project.location}
 isRTL={isRTL}
 />
 )}
 {project.donor && (
 <InfoItem 
 icon={<Users className="w-5 h-5" />}
 label={t.projectDetail.donor18}
 value={project.donor}
 isRTL={isRTL}
 />
 )}
 </div>
 </div>

 {/* B. Key Performance Summary */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.keyPerformanceSummary}
 </h2>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <KPICard
 icon={<Activity className="w-6 h-6" />}
 label={t.projectDetail.activities}
 value={`${kpis.activities.completed}/${kpis.activities.total}`}
 percentage={kpis.activities.percentage}
 color="blue"
 isRTL={isRTL}
 />
 <KPICard
 icon={<Target className="w-6 h-6" />}
 label={t.projectDetail.indicators}
 value={`${kpis.indicators.achieved}/${kpis.indicators.total}`}
 percentage={kpis.indicators.percentage}
 color="purple"
 isRTL={isRTL}
 />
 <KPICard
 icon={<Users className="w-6 h-6" />}
 label={t.projectDetail.beneficiaries}
 value={kpis.beneficiaries.reached > 0 ? kpis.beneficiaries.reached.toString() : (t.projectDetail.none)}
 percentage={kpis.beneficiaries.percentage}
 color="green"
 isRTL={isRTL}
 hidePercentage={kpis.beneficiaries.reached === 0}
 />
 <KPICard
 icon={<DollarSign className="w-6 h-6" />}
 label={t.projectDetail.budgetUtilization}
 value={`${kpis.budget.utilization.toFixed(1)}%`}
 percentage={kpis.budget.utilization}
 color="orange"
 isRTL={isRTL}
 hidePercentage={true}
 />
 </div>
 </div>

 {/* C. Financial Snapshot */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.financialSnapshot}
 </h2>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <FinancialCard
 label={t.projectDetail.approvedBudget}
 value={kpis.budget.approved}
 currency={kpis.budget.currency}
 color="blue"
 isRTL={isRTL}
 />
 <FinancialCard
 label={t.projectDetail.totalSpent}
 value={kpis.budget.spent}
 currency={kpis.budget.currency}
 color="red"
 isRTL={isRTL}
 />
 <FinancialCard
 label={t.projectDetail.remainingBalance}
 value={kpis.budget.remaining}
 currency={kpis.budget.currency}
 color="green"
 isRTL={isRTL}
 />
 <FinancialCard
 label={t.projectDetail.utilizationRate}
 value={kpis.budget.utilization}
 isPercentage={true}
 color="purple"
 isRTL={isRTL}
 />
 </div>
 </div>

 {/* D. Key Activities Preview */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.keyActivities}
 </h2>
 
 {latestActivities.length > 0 ? (
 <div className="space-y-3">
 {latestActivities.map((activity: any, index: number) => (
 <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
 <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${ activity.status === 'COMPLETED' ? 'bg-green-500' : activity.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-400' }`} />
 <div className="flex-1 min-w-0">
 <p className={`text-sm font-medium text-gray-900 text-start`}>
 {activity.activityTitle || activity.title}
 </p>
 <p className={`text-xs text-gray-500 mt-1 text-start`}>
 {activity.activityCode || activity.code} • {new Date(activity.plannedStartDate || activity.startDate).toLocaleDateString()}
 </p>
 </div>
 <span className={`flex-shrink-0 text-xs px-2 py-1 rounded ${ activity.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : activity.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700' }`}>
 {activity.status === 'COMPLETED' ? (t.projectDetail.completed) :
 activity.status === 'IN_PROGRESS' ? (t.projectDetail.inProgress) :
 (t.projectDetail.notStarted)}
 </span>
 </div>
 ))}
 <p 
 onClick={onNavigateToActivities}
 className={`text-sm text-blue-600 hover:text-blue-700 cursor-pointer mt-3 text-start`}
 >
 {t.projectDetail.viewAllActivities}
 </p>
 </div>
 ) : (
 <div className="text-center py-8">
 <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
 <p className="text-gray-500 text-sm">
 {t.projectDetail.noActivitiesAddedYet}
 </p>
 <p className="text-gray-400 text-xs mt-1">
 {t.projectDetail.goToTheActivitiesTabTo}
 </p>
 </div>
 )}
 </div>

 {/* E. Project Timeline */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h2 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.projectDetail.projectTimeline}
 </h2>
 
 <div className="relative">
 {/* Timeline visualization */}
 <div className="flex items-center gap-2 mb-4">
 <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
 <div 
 className="h-full bg-blue-600 rounded-full transition-all duration-500"
 style={{ width: `${Math.min(100, kpis.timeline.progress)}%` }}
 />
 </div>
 <span className="text-sm font-medium text-gray-700">
 {Math.round(kpis.timeline.progress)}%
 </span>
 </div>
 
 <div className={`grid grid-cols-3 gap-4 text-sm text-start`}>
 <div>
 <p className="text-gray-500 mb-1">{t.projectDetail.startDate}</p>
 <p className="font-medium text-gray-900">{new Date(project.startDate).toLocaleDateString()}</p>
 </div>
 <div className="text-center">
 <p className="text-gray-500 mb-1">{t.projectDetail.status}</p>
 <p className="font-medium text-gray-900">
 {projectStatus === 'active' ? (t.projectDetail.active) :
 projectStatus === 'completed' ? (t.projectDetail.completed) :
 (t.projectDetail.notStarted)}
 </p>
 </div>
 <div className={'text-end'}>
 <p className="text-gray-500 mb-1">{t.projectDetail.endDate}</p>
 <p className="font-medium text-gray-900">{new Date(project.endDate).toLocaleDateString()}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

// Helper Components

function InfoItem({
 icon, label, value, isRTL }: { icon: React.ReactNode; label: string; value: React.ReactNode; isRTL: boolean }) {
 return (
 <div className={`flex items-start gap-3`}>
 <div className="flex-shrink-0 text-gray-400 mt-0.5">
 {icon}
 </div>
 <div className={`flex-1 min-w-0 text-start`}>
 <p className="text-xs text-gray-500 mb-0.5">{label}</p>
 <p className="text-sm font-medium text-gray-900 break-words">{
value}</p>
 </div>
 </div>
 );
}

function KPICard({ 
 icon, 
 label, 
 value, 
 percentage, 
 color, 
 isRTL,
 hidePercentage = false 
}: { 
 icon: React.ReactNode; 
 label: string; 
 value: string; 
 percentage: number; 
 color: string; 
 isRTL: boolean;
 hidePercentage?: boolean;
}) {
 const colorClasses = {
 blue: 'bg-blue-50 text-blue-600 border-blue-100',
 purple: 'bg-purple-50 text-purple-600 border-purple-100',
 green: 'bg-green-50 text-green-600 border-green-100',
 orange: 'bg-orange-50 text-orange-600 border-orange-100'
 };

 return (
 <div className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
 <div className={`flex items-center gap-3 mb-2`}>
 <div className="flex-shrink-0">
 {icon}
 </div>
 <p className="text-xs font-medium uppercase tracking-wider text-start flex-1">
 {label}
 </p>
 </div>
 <p className={`ltr-safe text-2xl font-bold mb-1 text-start`}>
 {value}
 </p>
 {!hidePercentage && (
 <div className="flex items-center gap-2">
 <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
 <div 
 className="h-full bg-current rounded-full transition-all duration-500"
 style={{ width: `${Math.min(100, percentage)}%` }}
 />
 </div>
 <span className="ltr-safe text-xs font-medium">{Math.round(percentage)}%</span>
 </div>
 )}
 </div>
 );
}

function FinancialCard({ 
 label, 
 value, 
 currency, 
 color, 
 isRTL,
 isPercentage = false 
}: { 
 label: string; 
 value: number; 
 currency?: string; 
 color: string; 
 isRTL: boolean;
 isPercentage?: boolean;
}) {
 const colorClasses = {
 blue: 'text-blue-600',
 red: 'text-red-600',
 green: 'text-green-600',
 purple: 'text-purple-600'
 };

 const formatNumber = (num: number) => {
 return new Intl.NumberFormat('en-US', {
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 }).format(num);
 };

 return (
 <div className="p-4 bg-gray-50 rounded-lg">
 <p className={`text-xs text-gray-500 mb-2 text-start`}>
 {label}
 </p>
 <p className={`ltr-safe text-xl font-bold ${colorClasses[color as keyof typeof colorClasses]} text-start`}>
 {isPercentage ? (
 `${value.toFixed(1)}%`
 ) : (
 <>
 {formatNumber(value)} <span className="text-sm font-normal text-gray-500">{currency}</span>
 </>
 )}
 </p>
 </div>
 );
}
