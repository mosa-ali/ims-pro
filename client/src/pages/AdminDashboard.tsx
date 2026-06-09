import { useAuth } from '@/_core/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Users, Building2, MapPin, Shield, Activity, Archive } from 'lucide-react';
import { trpc } from '@/lib/trpc';

/**
 * Admin Dashboard - Organization-level administration
 * Development-only feature for testing Phase 0 management functions
 * Shows KPIs and quick access to management features
 */
export default function AdminDashboard() {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const { user } = useAuth();

 // Fetch organizations count
 const { data: orgsData } = trpc.ims.organizations.list.useQuery();
 const orgsCount = orgsData?.length || 0;

 // Fetch operating units count - we need to get all OUs across all organizations
 // For now, show placeholder count since we don't have a listAll procedure
 const ousCount = 0; // TODO: Implement listAll procedure for operating units

 // Fetch users count - we need to implement platform users list
 const usersCount = 0; // TODO: Implement platform users list procedure

 const kpis = [
 {
 id: 'orgs',
 label: t.adminDashboard.organizations,
 value: orgsCount,
 icon: Building2,
 color: 'bg-blue-500',
 path: '/platform/organizations'
 },
 {
 id: 'ous',
 label: t.adminDashboard.operatingUnits,
 value: ousCount,
 icon: MapPin,
 color: 'bg-green-500',
 path: '/platform/operating-units'
 },
 {
 id: 'users',
 label: t.adminDashboard.platformUsers,
 value: usersCount,
 icon: Users,
 color: 'bg-purple-500',
 path: '/platform/users'
 },
 {
 id: 'health',
 label: t.adminDashboard.systemHealthTitle,
 value: t.adminDashboard.operational,
 icon: Activity,
 color: 'bg-emerald-500',
 path: '/platform/system-health'
 }
 ];

 const quickActions = [
 {
 id: 'manage-orgs',
 title: t.adminDashboard.manageOrganizations,
 description: t.adminDashboard.manageOrganizationsDesc,
 icon: Building2,
 path: '/platform/organizations',
 color: 'text-blue-600'
 },
 {
 id: 'manage-ous',
 title: t.adminDashboard.manageOperatingUnits,
 description: t.adminDashboard.manageOperatingUnitsDesc,
 icon: MapPin,
 path: '/platform/operating-units',
 color: 'text-green-600'
 },
 {
 id: 'manage-users',
 title: t.adminDashboard.manageUsers,
 description: t.adminDashboard.manageUsersDesc,
 icon: Users,
 path: '/platform/users',
 color: 'text-purple-600'
 },
 {
 id: 'view-audit',
 title: t.adminDashboard.viewAuditLogs,
 description: t.adminDashboard.viewAuditLogsDesc,
 icon: Shield,
 path: '/platform/audit-logs',
 color: 'text-orange-600'
 },
 {
 id: 'deleted-records',
 title: t.adminDashboard.deletedRecords,
 description: t.adminDashboard.deletedRecordsDesc,
 icon: Archive,
 path: '/platform/deleted-records',
 color: 'text-red-600'
 }
 ];

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Development Notice Banner */}
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
 <div>
 <h3 className="font-semibold text-amber-900">{t.adminDashboard.developmentFeature}</h3>
 <p className="text-sm text-amber-700 mt-1">
 {t.adminDashboard.devNotice}
 </p>
 </div>
 </div>
 </div>

 {/* Page Header */}
 <div>
 <h1 className="text-3xl font-bold text-foreground">{t.adminDashboard.adminDashboardTitle}</h1>
 <p className="text-muted-foreground mt-2">
 {t.adminDashboard.adminDashboardSubtitle}
 </p>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {kpis.map((kpi) => {
 const Icon = kpi.icon;
 return (
 <a
 key={kpi.id}
 href={kpi.path}
 className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
 >
 <div className="flex items-center justify-between mb-4">
 <div className={`${kpi.color} p-3 rounded-lg`}>
 <Icon className="w-6 h-6 text-white" />
 </div>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{kpi.label}</p>
 <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
 </div>
 </a>
 );
 })}
 </div>

 {/* Quick Actions */}
 <div>
 <h2 className="text-xl font-semibold text-foreground mb-4">{t.adminDashboard.quickActions}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {quickActions.map((action) => {
 const Icon = action.icon;
 return (
 <a
 key={action.id}
 href={action.path}
 className="bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow"
 >
 <div className="flex items-start gap-4">
 <Icon className={`w-6 h-6 ${action.color} flex-shrink-0 mt-1`} />
 <div>
 <h3 className="font-semibold text-foreground">{action.title}</h3>
 <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
 </div>
 </div>
 </a>
 );
 })}
 </div>
 </div>

 {/* System Information */}
 <div className="bg-card border border-border rounded-lg p-6">
 <h2 className="text-xl font-semibold text-foreground mb-4">{t.adminDashboard.systemInformation}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
 <div>
 <p className="text-muted-foreground">{t.adminDashboard.currentUser}</p>
 <p className="font-medium text-foreground">{user?.name || 'N/A'}</p>
 </div>
 <div>
 <p className="text-muted-foreground">{t.adminDashboard.userRole}</p>
 <p className="font-medium text-foreground">{user?.role || 'N/A'}</p>
 </div>
 <div>
 <p className="text-muted-foreground">{t.adminDashboard.environment}</p>
 <p className="font-medium text-foreground">{import.meta.env.DEV ? 'Development' : 'Production'}</p>
 </div>
 <div>
 <p className="text-muted-foreground">{t.adminDashboard.systemStatus}</p>
 <p className="font-medium text-emerald-600">{t.adminDashboard.operational}</p>
 </div>
 </div>
 </div>
 </div>
 );
}
