import { useTranslation } from '@/i18n/useTranslation';
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { OperatingUnitSelector } from "@/components/OperatingUnitSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
 FolderKanban, 
 DollarSign, 
 Package, 
 Users, 
 Target, 
 FileText,
 TrendingUp,
 AlertCircle,
 MapPin,
 CheckCircle2,
 AlertTriangle,
 Loader2
} from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Organization Dashboard (Level 2) - Enhanced with Figma Design Elements
 * Tenant-level dashboard with executive KPIs
 * Access to all operational modules
 * 
 * Phase 0 Enhancements:
 * - Gradient context banner with organization/OU info
 * - "Operating Unit Context" badge
 * - Live status indicator (green pulse dot)
 * - Compliance metrics in banner
 * - Enhanced KPI cards with colored icon backgrounds and hover effects
 * - Uppercase tracking-widest labels
 * - Compliance Alerts section with priority badges
 * - Project Pipeline Status section with progress bars
 * - Full translation support
 */
export default function OrganizationDashboard() {
 const { user } = useAuth();
 const { currentOrganizationId, userOrganizations } = useOrganization();
 const { currentOperatingUnitId, userOperatingUnits } = useOperatingUnit();
const { direction, isRTL} = useLanguage();


 const currentOrg = userOrganizations.find((org) => org.organizationId === currentOrganizationId);
 const currentUnit = userOperatingUnits.find((unit) => unit.operatingUnitId === currentOperatingUnitId);

 // Fetch real dashboard stats from database
 console.log('[OrganizationDashboard] Query params:', {
 organizationId: currentOrganizationId,
 operatingUnitId: currentOperatingUnitId,
 enabled: !!currentOrganizationId && !!currentOperatingUnitId
 });
 
 // DEBUG: Force visibility
 if (typeof window !== 'undefined' && !window.__dashboardDebugShown) {
 window.__dashboardDebugShown = true;
 console.error('\n\n=== ORGANIZATION DASHBOARD RENDERING ===');
 console.error('Org ID:', currentOrganizationId, 'OU ID:', currentOperatingUnitId);
 }
 
 const { data: dashboardStats, isLoading: statsLoading, error: statsError } = trpc.dashboard.getStats.useQuery(
 {
 organizationId: currentOrganizationId!,
 operatingUnitId: currentOperatingUnitId!,
 },
 { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
 );
 
 console.log('[OrganizationDashboard] Query result:', { dashboardStats, statsLoading, statsError });

 // Fetch project pipeline data
 const { data: projectPipeline, isLoading: pipelineLoading } = trpc.dashboard.getProjectPipeline.useQuery(
 {
 organizationId: currentOrganizationId!,
 operatingUnitId: currentOperatingUnitId!,
 },
 { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
 );

 // Format currency
 const formatCurrency = (amount: number) => {
  const { t } = useTranslation();
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 minimumFractionDigits: 0,
 maximumFractionDigits: 0,
 }).format(amount);
 };

 if (!currentOrganizationId) {
 return (
 <div className="container py-16" dir={isRTL ? 'rtl' : 'ltr'}>
 <Card>
 <CardHeader>
 <CardTitle>{t.organizationDashboard.noOrganization}</CardTitle>
 <CardDescription>{t.organizationDashboard.contactAdmin}</CardDescription>
 </CardHeader>
 </Card>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
 {/* Gradient Context Banner (Phase 0 Spec) */}
 <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-12 mb-8 shadow-lg">
 <div className="container">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <div className="flex items-center gap-3 mb-3">
 <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
 <Badge variant="secondary" className="bg-white/20 text-white border-0 uppercase tracking-widest text-[10px] font-bold">
 {t.organizationDashboard.operatingUnitContext}
 </Badge>
 </div>
 <h1 className="text-5xl font-black mb-2 tracking-tight">
 {currentOrg?.organizationName || "Organization"}
 </h1>
 <div className={`flex items-center gap-3 text-blue-100`}>
 <MapPin className="w-4 h-4" />
 <span className="font-medium">
 {currentUnit ? `${currentUnit.unitName} • ${currentUnit.country}` : t.organizationDashboard.noOperatingUnit}
 </span>
 </div>
 </div>
 <div className={`text-end`}>
 <div className="flex flex-col gap-2">
 <div className="text-sm font-bold text-blue-100 uppercase tracking-widest">{t.organizationDashboard.compliance}</div>
 <div className="text-3xl font-black">{dashboardStats?.projectCompliance || 0}%</div>
 <div className="text-sm text-blue-200">{dashboardStats?.activeGrants || 0} {t.organizationDashboard.activeGrants}</div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="container pb-8">
 {/* Enhanced Executive KPIs (Phase 0 Spec) */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 border-blue-100">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">
 {t.organizationDashboard.activeProjects}
 </CardTitle>
 <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
 <FolderKanban className="h-6 w-6 text-blue-600" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black text-gray-900">
 {statsLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : dashboardStats?.activeProjects || 0}
 </div>
 <p className="text-xs text-muted-foreground mt-2 font-medium">{t.organizationDashboard.acrossAllPrograms}</p>
 </CardContent>
 </Card>

 <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 border-indigo-100">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">
 {t.organizationDashboard.totalEmployees}
 </CardTitle>
 <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
 <Users className="h-6 w-6 text-indigo-600" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black text-gray-900">
 {statsLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : dashboardStats?.totalEmployees || 0}
 </div>
 <p className="text-xs text-muted-foreground mt-2 font-medium">{t.organizationDashboard.fullTimeStaff}</p>
 </CardContent>
 </Card>

 <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 border-emerald-100">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">
 {t.organizationDashboard.totalBudget}
 </CardTitle>
 <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
 <DollarSign className="h-6 w-6 text-emerald-600" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black text-gray-900">
 {statsLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : formatCurrency(dashboardStats?.totalBudget || 0)}
 </div>
 <p className="text-xs text-muted-foreground mt-2 font-medium">{t.organizationDashboard.allocatedFunds}</p>
 </CardContent>
 </Card>

 <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 border-orange-100">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">
 {t.organizationDashboard.grantExecution}
 </CardTitle>
 <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
 <TrendingUp className="h-6 w-6 text-orange-600" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black text-gray-900">
 {statsLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : `${dashboardStats?.budgetExecution || 0}%`}
 </div>
 <p className="text-xs text-muted-foreground mt-2 font-medium">{t.organizationDashboard.onTrack}</p>
 </CardContent>
 </Card>
 </div>

 {/* Compliance Alerts Section (Phase 0 Spec) */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <AlertCircle className="w-5 h-5 text-orange-500" />
 {t.organizationDashboard.complianceAlerts}
 </CardTitle>
 <CardDescription>{t.organizationDashboard.itemsRequiringAttention}</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <div className="p-4 border border-red-100 bg-red-50 rounded-lg hover:border-red-200 transition-colors">
 <div className="flex items-start justify-between mb-2">
 <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-widest">{t.organizationDashboard.highPriority}</Badge>
 <span className="text-xs text-gray-500">{t.organizationDashboard.daysAgo}</span>
 </div>
 <h4 className="font-bold text-gray-900 mb-1">{t.organizationDashboard.quarterlyReportOverdue}</h4>
 <p className="text-sm text-gray-600">{t.organizationDashboard.quarterlyReportPending}</p>
 </div>
 <div className="p-4 border border-amber-100 bg-amber-50 rounded-lg hover:border-amber-200 transition-colors">
 <div className="flex items-start justify-between mb-2">
 <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold uppercase tracking-widest">{t.organizationDashboard.medium}</Badge>
 <span className="text-xs text-gray-500">{t.organizationDashboard.daysAgo}</span>
 </div>
 <h4 className="font-bold text-gray-900 mb-1">{t.organizationDashboard.budgetRevisionNeeded}</h4>
 <p className="text-sm text-gray-600">{t.organizationDashboard.budgetVarianceExceeds}</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Project Pipeline Status (Phase 0 Spec) */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <TrendingUp className="w-5 h-5 text-blue-500" />
 {t.organizationDashboard.projectPipelineStatus}
 </CardTitle>
 <CardDescription>{t.organizationDashboard.activeProjectProgress}</CardDescription>
 </CardHeader>
 <CardContent>
 {pipelineLoading ? (
 <div className="flex items-center justify-center py-8">
 <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
 </div>
 ) : projectPipeline && projectPipeline.length > 0 ? (
 <div className="space-y-4">
 {projectPipeline.map((project) => {
 const progressPercent = project.progress || 0;
 const statusColor = progressPercent >= 75 ? 'emerald' : progressPercent >= 50 ? 'blue' : progressPercent >= 25 ? 'amber' : 'gray';
 const statusText = progressPercent >= 75 ? t.organizationDashboard.onTrack : progressPercent >= 50 ? t.organizationDashboard.inProgress : t.organizationDashboard.atRisk;
 
 return (
 <div key={project.id} className="hover:bg-gray-50 p-3 rounded-lg transition-colors">
 <div className="flex items-center justify-between mb-2">
 <span className="font-bold text-sm text-gray-900">
 {isRTL && project.titleAr ? project.titleAr : project.titleEn}
 </span>
 <span className={`text-sm font-bold text-${statusColor}-600`}>{progressPercent}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
 <div 
 className={`bg-${statusColor}-500 h-2 rounded-full`} 
 style={{ width: `${progressPercent}%` }} 
 />
 </div>
 <div className="flex items-center justify-between text-xs text-gray-500">
 <span>{formatCurrency(project.spent)} / {formatCurrency(project.totalBudget)}</span>
 <span className={`font-medium text-${statusColor}-600`}>{statusText}</span>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-sm text-gray-500 text-center py-8">
 {t.organizationDashboard.noActiveProjects}
 </p>
 )}
 {projectPipeline && projectPipeline.length > 0 && (
 <Button variant="link" className="w-full mt-4 text-blue-600 hover:text-blue-700">
 {t.organizationDashboard.viewAll} →
 </Button>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Operational Modules */}
 <div className="mb-8">
 <h2 className="text-2xl font-bold text-foreground mb-6">{t.organizationDashboard.coreModules}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <ModuleCard
 icon={<FolderKanban className="w-6 h-6" />}
 title={t.organizationDashboard.programsGrants}
 description={t.organizationDashboard.programsGrantsDesc}
 href="/modules/programs"
 comingSoon
 />
 <ModuleCard
 icon={<DollarSign className="w-6 h-6" />}
 title={t.organizationDashboard.financeManagement}
 description={t.organizationDashboard.financeManagementDesc}
 href="/modules/finance"
 comingSoon
 />
 <ModuleCard
 icon={<Package className="w-6 h-6" />}
 title={t.organizationDashboard.logisticsProcurement}
 description={t.organizationDashboard.logisticsProcurementDesc}
 href="/modules/logistics"
 comingSoon
 />
 <ModuleCard
 icon={<Users className="w-6 h-6" />}
 title={t.organizationDashboard.humanResources}
 description={t.organizationDashboard.humanResourcesDesc}
 href="/modules/hr"
 comingSoon
 />
 <ModuleCard
 icon={<Target className="w-6 h-6" />}
 title={t.organizationDashboard.meal}
 description={t.organizationDashboard.mealDesc}
 href="/modules/meal"
 comingSoon
 />
 <ModuleCard
 icon={<FileText className="w-6 h-6" />}
 title={t.organizationDashboard.donorCRM}
 description={t.organizationDashboard.donorCRMDesc}
 href="/modules/donors"
 comingSoon
 />
 </div>
 </div>

 {/* Phase 0 Notice */}
 <Card className="bg-blue-50 border-blue-200">
 <CardHeader>
 <CardTitle className="text-blue-900">{t.organizationDashboard.phase0Complete}</CardTitle>
 <CardDescription className="text-blue-700">
 {t.organizationDashboard.phase0CompleteDesc}
 </CardDescription>
 </CardHeader>
 </Card>
 </div>
 </div>
 );
}

interface ModuleCardProps {
 icon: React.ReactNode;
 title: string;
 description: string;
 href: string;
 comingSoon?: boolean;
}

function ModuleCard({ icon, title, description, href, comingSoon }: ModuleCardProps) {
return (
 <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 border-gray-200">
 <CardHeader>
 <div className="flex items-center gap-3 mb-2">
 <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
 {icon}
 </div>
 <CardTitle className="text-lg">{title}</CardTitle>
 </div>
 <CardDescription>{description}</CardDescription>
 </CardHeader>
 <CardContent>
 {comingSoon ? (
 <Button variant="outline" className="w-full" disabled>
 {t.organizationDashboard.comingSoon}
 </Button>
 ) : (
 <Button variant="default" className="w-full">
 {t.organizationDashboard.openModule}
 </Button>
 )}
 </CardContent>
 </Card>
 );
}
