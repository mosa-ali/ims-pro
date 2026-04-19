/**
 * Logistics & Procurement Workspace
 * Main dashboard for the Logistics module with RTL/LTR support
 * Uses OrganizationContext for data isolation (same pattern as Finance and HR modules)
 * 
 * Includes PR Workflow Dashboard card with real-time status counts from the database.
 */

import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
 Package,
 FileText,
 ShoppingCart,
 Truck,
 Users,
 ClipboardList,
 BarChart3,
 Settings,
 Plus,
 ArrowRight,
 ArrowLeft,
 Warehouse,
 Car,
 Loader2,
 GitPullRequestArrow,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from '@/i18n/useTranslation';

export default function LogisticsWorkspace() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { currentOrganization } = useOrganization();
const { language, isRTL} = useLanguage();
 const [, setLocation] = useLocation();
 
 
 const direction = 'ltr';
 
 // Get organizationId from context (same pattern as Finance and HR modules)
 const organizationId = currentOrganization?.id || 1;
 
 // Fetch dashboard stats from the database
 const { data: stats, isLoading } = trpc.logistics.dashboard.getStats.useQuery(
 { organizationId },
 { enabled: Boolean(user && organizationId) }
 );
 
 // Fetch PR Workflow status counts from real DB
 const { data: prStatusCounts, isLoading: prCountsLoading } = trpc.logistics.prWorkflowDashboard.getStatusCounts.useQuery(
 {},
 { enabled: !!(user && organizationId) }
 );

 const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

 const modules = [
 {
 id: "purchase-requests",
 title: t.logisticsWorkspace.purchaseRequests,
 description: t.logisticsWorkspace.purchaseRequestsDesc,
 icon: FileText,
 href: "/organization/logistics/purchase-requests",
 color: "bg-blue-500",
 stats: [
 { label: t.logisticsWorkspace.pending, value: stats?.purchaseRequests?.pending || 0 },
 { label: t.logisticsWorkspace.approved, value: stats?.purchaseRequests?.approved || 0 },
 ],
 },
 {
 id: "vendors",
 title: t.logisticsWorkspace.vendorManagement,
 description: t.logisticsWorkspace.vendorManagementDesc,
 icon: Users,
 href: "/organization/logistics/vendors",
 color: "bg-green-500",
 stats: [
 { label: t.logisticsWorkspace.totalVendors, value: stats?.totalVendors || 0 },
 { label: t.logisticsWorkspace.activeVendors, value: stats?.activeVendors || 0 },
 ],
 },
 {
 id: "reports",
 title: t.logisticsWorkspace.reportsAnalytics,
 description: t.logisticsWorkspace.reportsAnalyticsDesc,
 icon: BarChart3,
 href: "/organization/logistics/reports",
 color: "bg-indigo-500",
 stats: [
 { label: t.logisticsWorkspace.reports, value: 7 },
 { label: t.logisticsWorkspace.dashboards, value: 4 },
 ],
 },
 {
 id: "stock",
 title: t.logisticsWorkspace.stockManagement,
 description: t.logisticsWorkspace.stockManagementDesc,
 icon: Warehouse,
 href: "/organization/logistics/stock",
 color: "bg-purple-500",
 stats: [
 { label: t.logisticsWorkspace.inStock, value: stats?.stock?.inStock || 0 },
 { label: t.logisticsWorkspace.lowStock, value: stats?.stock?.lowStock || 0 },
 ],
 },
 {
 id: "fleet",
 title: t.logisticsWorkspace.fleetManagement,
 description: t.logisticsWorkspace.fleetManagementDesc,
 icon: Car,
 href: "/organization/logistics/fleet",
 color: "bg-cyan-500",
 stats: [
 { label: t.logisticsWorkspace.vehicles, value: stats?.vehicles?.total || 0 },
 { label: t.logisticsWorkspace.drivers, value: stats?.drivers?.active || 0 },
 ],
 },
 {
 id: "tracker",
 title: t.logisticsWorkspace.procurementTracker,
 description: t.logisticsWorkspace.procurementTrackerDesc,
 icon: BarChart3,
 href: "/organization/logistics/tracker",
 color: "bg-pink-500",
 stats: [
 { label: t.logisticsWorkspace.active, value: (stats?.purchaseRequests?.pending || 0) + (stats?.purchaseOrders?.open || 0) },
 { label: t.logisticsWorkspace.completed, value: stats?.purchaseOrders?.delivered || 0 },
 ],
 },
 ];

 const quickActions = [
 {
 title: t.logisticsWorkspace.createPurchaseRequest,
 description: t.logisticsWorkspace.createPurchaseRequestDesc,
 href: "/organization/logistics/purchase-requests/new",
 icon: FileText,
 },

 {
 title: t.logisticsWorkspace.addStockItem,
 description: t.logisticsWorkspace.addStockItemDesc,
 href: "/organization/logistics/stock/new",
 icon: Package,
 },
 ];

 // PR Status tiles for the dashboard card — clicking navigates to My PRs with filter
 const prStatusTiles = [
 {
 key: "draft" as const,
 label: t.logisticsWorkspace.draft,
 count: prStatusCounts?.draft || 0,
 color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
 dotColor: "bg-gray-400",
 },
 {
 key: "submitted" as const,
 label: t.logisticsWorkspace.submitted,
 count: prStatusCounts?.submitted || 0,
 color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
 dotColor: "bg-yellow-500",
 },
 {
 key: "approved" as const,
 label: t.logisticsWorkspace.approved,
 count: prStatusCounts?.approved || 0,
 color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
 dotColor: "bg-green-500",
 },
 {
 key: "rejected" as const,
 label: t.logisticsWorkspace.rejected,
 count: prStatusCounts?.rejected || 0,
 color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
 dotColor: "bg-red-500",
 },
 ];

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container py-8">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-foreground">
 {t.logisticsWorkspace.logisticsTitle}
 </h1>
 <p className="text-muted-foreground mt-1">
 {t.logisticsWorkspace.logisticsSubtitle}
 </p>
 </div>
 <div className="flex gap-2 mt-4 md:mt-0">
 <Link href="/organization/logistics/settings">
 <Button variant="outline" size="sm">
 <Settings className="h-4 w-4 me-2" />
 {t.logisticsWorkspace.settings}
 </Button>
 </Link>
 <Link href="/organization/logistics/purchase-requests/new">
 <Button size="sm">
 <Plus className="h-4 w-4 me-2" />
 {t.logisticsWorkspace.newPurchaseRequest}
 </Button>
 </Link>
 </div>
 </div>

 {/* PR Workflow Dashboard Card */}
 <div className="mb-8">
 <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
 <CardHeader className="pb-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-primary">
 <GitPullRequestArrow className="h-5 w-5 text-primary-foreground" />
 </div>
 <div>
 <CardTitle className="text-lg">{t.logisticsWorkspace.prWorkflowDashboard}</CardTitle>
 <CardDescription>{t.logisticsWorkspace.prWorkflowDashboardDesc}</CardDescription>
 </div>
 </div>
 <Link href="/organization/logistics/my-prs">
 <Button variant="outline" size="sm">
 {t.logisticsWorkspace.viewDetails}
 <ArrowIcon className="h-4 w-4 ms-1" />
 </Button>
 </Link>
 </div>
 </CardHeader>
 <CardContent>
 {prCountsLoading ? (
 <div className="flex items-center justify-center py-6">
 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
 </div>
 ) : (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {prStatusTiles.map((tile) => (
 <button
 key={tile.key}
 onClick={() => setLocation(`/organization/logistics/my-prs?status=${tile.key}`)}
 className={`rounded-lg p-4 ${tile.color} hover:opacity-80 transition-opacity cursor-pointer text-start`}
 >
 <div className="flex items-center gap-2 mb-1">
 <span className={`w-2 h-2 rounded-full ${tile.dotColor}`} />
 <span className="text-sm font-medium">{tile.label}</span>
 </div>
 <p className="text-2xl font-bold">{tile.count}</p>
 </button>
 ))}
 </div>
 )}
 <div className="flex items-center justify-between mt-4 pt-3 border-t">
 <span className="text-sm text-muted-foreground">
 {t.logisticsWorkspace.total}: <span className="font-semibold text-foreground">{prStatusCounts?.total || 0}</span> {t.logisticsWorkspace.purchaseRequests.toLowerCase()}
 </span>
 <Link href="/organization/logistics/my-prs">
 <span className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1">
 {t.logisticsWorkspace.myPrs}
 <ArrowIcon className="h-3 w-3" />
 </span>
 </Link>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Modules Grid */}
 <h2 className="text-xl font-semibold mb-4">{t.logisticsWorkspace.modules}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
 {modules.map((module) => (
 <Link key={module.id} href={module.href}>
 <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
 <CardHeader className="pb-2">
 <div className="flex items-center gap-3">
 <div className={`p-2 rounded-lg ${module.color}`}>
 <module.icon className="h-5 w-5 text-white" />
 </div>
 <CardTitle className="text-base">{module.title}</CardTitle>
 </div>
 </CardHeader>
 <CardContent>
 <CardDescription className="mb-3">{module.description}</CardDescription>
 <div className="flex gap-4 text-sm">
 {module.stats.map((stat, idx) => (
 <div key={idx}>
 <span className="font-semibold">{stat.label}:</span>{" "}
 <span className="text-muted-foreground">{stat.value}</span>
 </div>
 ))}
 </div>
 <div className="flex items-center gap-1 mt-3 text-sm text-primary">
 {t.logisticsWorkspace.viewDetails}
 <ArrowIcon className="h-4 w-4" />
 </div>
 </CardContent>
 </Card>
 </Link>
 ))}
 </div>

 {/* Quick Actions */}
 <h2 className="text-xl font-semibold mb-4">{t.logisticsWorkspace.quickActions}</h2>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {quickActions.map((action, idx) => (
 <Link key={idx} href={action.href}>
 <Card className="cursor-pointer hover:shadow-md transition-shadow">
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <div className="p-3 rounded-lg bg-primary/10">
 <action.icon className="h-6 w-6 text-primary" />
 </div>
 <div>
 <h3 className="font-semibold">{action.title}</h3>
 <p className="text-sm text-muted-foreground">{action.description}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </Link>
 ))}
 </div>

 {/* Stats Overview - KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.logisticsWorkspace.pendingPRs}</p>
 <p className="text-3xl font-bold">{isLoading ? "-" : stats?.purchaseRequests?.pending || 0}</p>
 </div>
 <FileText className="h-8 w-8 text-blue-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.logisticsWorkspace.openPOs}</p>
 <p className="text-3xl font-bold">{isLoading ? "-" : stats?.purchaseOrders?.open || 0}</p>
 </div>
 <ShoppingCart className="h-8 w-8 text-green-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.logisticsWorkspace.lowStockItems}</p>
 <p className="text-3xl font-bold">{isLoading ? "-" : stats?.stock?.lowStock || 0}</p>
 </div>
 <Warehouse className="h-8 w-8 text-orange-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.logisticsWorkspace.availableVehicles}</p>
 <p className="text-3xl font-bold">{isLoading ? "-" : stats?.vehicles?.active || 0}</p>
 </div>
 <Car className="h-8 w-8 text-cyan-500" />
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
