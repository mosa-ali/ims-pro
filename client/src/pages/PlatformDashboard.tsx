import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "@/i18n/useTranslation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Building2, Users, Activity, Settings, Shield, CheckCircle2, AlertCircle, XCircle, FileSearch, Link as LinkIcon, TrendingUp, FolderKanban, DollarSign, Package, Target, FileText, MapPin, AlertTriangle, LayoutDashboard, Heart, Truck, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Platform Dashboard (Level 1) - Clean Platform Admin View
 * For Platform Admins only - No operational/organization-specific data
 * Shows system health, KPIs, and organization management
 */
export default function PlatformDashboard() {
 const { user } = useAuth();
 const { t } = useTranslation();
 const { direction, isRTL} = useLanguage();
 const { data: organizations = [], isLoading: orgsLoading } = trpc.ims.organizations.list.useQuery();
 const { data: userCounts, isLoading: userCountsLoading } = trpc.ims.dashboard.getUserCounts.useQuery();
 const { data: recentActivities = [], isLoading: activitiesLoading } = trpc.ims.dashboard.getRecentActivities.useQuery({ limit: 10 });

 if (user?.role !== "platform_admin" && user?.role !== "platform_super_admin") {
 return (
 <div className="container py-16" dir={isRTL ? 'rtl' : 'ltr'}>
 <Card>
 <CardHeader>
 <CardTitle>{t.auth.accessDenied}</CardTitle>
 <CardDescription>{t.auth.noPermission}</CardDescription>
 </CardHeader>
 </Card>
 </div>
 );
 }

 // Calculate metrics
 const activeOrgs = organizations.filter(org => org.status === 'active').length;
 const suspendedOrgs = organizations.filter(org => org.status === 'suspended').length;

 return (
 <div className="container py-8">
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-foreground">{t.platform.dashboard.title}</h1>
 <p className="text-muted-foreground mt-2">{t.platform.dashboard.subtitle}</p>
 </div>

 {/* Platform Administration Access Banner */}
 <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
 <div className={`flex items-start gap-4`}>
 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
 <Shield className="w-6 h-6 text-blue-600" />
 </div>
 <div className={`flex-1 text-start`}>
 <h3 className="font-bold text-blue-900 text-lg mb-1">
 {t.platform.dashboard.accessRestrictionTitle}
 </h3>
 <p className="text-blue-700 text-sm leading-relaxed">
 {t.platform.dashboard.accessRestrictionDesc}
 </p>
 </div>
 </div>
 </div>

 {/* KPI Cards - Platform Level Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 {/* Organizations Card */}
 <Card className="hover:shadow-lg transition-shadow">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">
 {t.platform.dashboard.totalOrganizations}
 </CardTitle>
 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
 <Building2 className="h-6 w-6 text-blue-600" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black text-gray-900">{orgsLoading ? "..." : organizations.length}</div>
 <div className="flex items-center gap-2 mt-3">
 <span className="text-sm font-medium text-green-600">{activeOrgs} {t.common.active}</span>
 <span className="text-gray-300">•</span>
 <span className="text-sm font-medium text-gray-400">{suspendedOrgs} {t.common.suspended}</span>
 </div>
 </CardContent>
 </Card>

 {/* Users Card */}
 <Card className="hover:shadow-lg transition-shadow">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">
 {t.platform.dashboard.totalUsers}
 </CardTitle>
 <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
 <Users className="h-6 w-6 text-purple-600" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black text-gray-900">
 {userCountsLoading ? "..." : (userCounts?.totalUsers ?? 0)}
 </div>
 <div className="flex items-center gap-2 mt-3">
 <span className="text-sm font-medium text-purple-600">
 {t.platform.dashboard.platformUsers}: {userCountsLoading ? "..." : (userCounts?.platformUsers ?? 0)}
 </span>
 <span className="text-gray-300">•</span>
 <span className="text-sm font-medium text-gray-600">
 {t.platform.dashboard.orgUsers}: {userCountsLoading ? "..." : (userCounts?.orgUsers ?? 0)}
 </span>
 </div>
 </CardContent>
 </Card>

 {/* Microsoft 365 Card */}
 <Card className="hover:shadow-lg transition-shadow">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">
 {t.platform.dashboard.microsoft365}
 </CardTitle>
 <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
 <CheckCircle2 className="h-6 w-6 text-green-600" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black text-green-600">{t.platform.dashboard.ready}</div>
 <div className="flex items-center gap-2 mt-3">
 <span className="text-sm font-medium text-gray-600">{t.platform.dashboard.entraReady}</span>
 </div>
 </CardContent>
 </Card>

 {/* System Health Card */}
 <Card className="hover:shadow-lg transition-shadow">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-500">
 {t.platform.dashboard.systemHealth}
 </CardTitle>
 <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
 <Activity className="h-6 w-6 text-yellow-600" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-2">
 <CheckCircle2 className="w-5 h-5 text-green-600" />
 <div className="text-2xl font-black text-green-600">{t.platform.dashboard.healthy}</div>
 </div>
 <div className="flex items-center gap-2 mt-3">
 <span className="text-sm font-medium text-gray-600">{t.platform.dashboard.allSystemsOperational}</span>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Quick Actions Section */}
 <div className="mb-8">
 <h2 className="text-xl font-bold text-foreground mb-4">{t.platform.dashboard.quickActions}</h2>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Link href="/platform/organizations">
 <Card className="hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
 <CardHeader>
 <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
 <Building2 className="w-5 h-5 text-blue-600" />
 </div>
 <CardTitle className="text-base">{t.platform.dashboard.viewAllOrganizations}</CardTitle>
 <CardDescription>{t.platform.dashboard.viewAllOrganizationsDesc}</CardDescription>
 </CardHeader>
 </Card>
 </Link>

 <Card className="hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer opacity-50">
 <CardHeader>
 <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
 <LinkIcon className="w-5 h-5 text-green-600" />
 </div>
 <CardTitle className="text-base">{t.platform.dashboard.manageIntegrations}</CardTitle>
 <CardDescription>{t.platform.dashboard.manageIntegrationsDesc}</CardDescription>
 </CardHeader>
 </Card>

 <Link href="/platform/audit-logs">
 <Card className="hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
 <CardHeader>
 <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
 <FileSearch className="w-5 h-5 text-purple-600" />
 </div>
 <CardTitle className="text-base">{t.platform.dashboard.viewAuditLogs}</CardTitle>
 <CardDescription>{t.platform.dashboard.viewAuditLogsDesc}</CardDescription>
 </CardHeader>
 </Card>
 </Link>
 </div>
 </div>

 {/* Platform Activity - Recent Audit Logs */}
 <Card className="mb-8">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <TrendingUp className="w-5 h-5 text-muted-foreground" />
 {t.platform.dashboard.platformActivity}
 </CardTitle>
 <CardDescription>{t.platform.dashboard.platformActivityDesc}</CardDescription>
 </CardHeader>
 <CardContent>
 {activitiesLoading ? (
 <div className="flex items-center justify-center h-32">
 <span className="text-muted-foreground text-sm">Loading activity...</span>
 </div>
 ) : recentActivities.length === 0 ? (
 <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
 <div className="text-center">
 <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
 <p className="text-gray-500 font-medium text-sm">No activity recorded yet</p>
 <p className="text-xs text-gray-400 mt-1">Administrative actions will appear here</p>
 </div>
 </div>
 ) : (
 <div className="space-y-3">
 {recentActivities.map((log) => (
 <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
 <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
 <Activity className="w-4 h-4 text-blue-600" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-900 truncate">{log.description}</p>
 <p className="text-xs text-gray-500 mt-0.5">
 {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
 </p>
 </div>
 <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
 {log.action}
 </span>
 </div>
 ))}
 <div className="pt-2 text-center">
 <Link href="/platform/audit-logs">
 <Button variant="outline" size="sm">View All Audit Logs</Button>
 </Link>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* NOTE: Organizations Overview removed - Use View All Organizations quick action instead */}
 </div>
 );
}
