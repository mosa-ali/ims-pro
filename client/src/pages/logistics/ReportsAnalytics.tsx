/**
 * Logistics Reports & Analytics Landing Page
 * Comprehensive reporting dashboard with key metrics and report categories
 */

import { useEffect } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
 BarChart3,
 TrendingUp,
 Users,
 ShoppingCart,
 Package,
 Clock,
 DollarSign,
 FileText,
 Download,
 Calendar,
 ArrowRight,
 ArrowLeft,
} from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
export default function ReportsAnalytics() {
 const { t } = useTranslation();
 const { currentOrganization } = useOrganization();
 const { language, isRTL} = useLanguage();
 const direction = 'ltr';
 const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

 const organizationId = currentOrganization?.id || 1;

 // Fetch dashboard overview
 const { data: overview, isLoading } = trpc.logistics.analytics.getDashboardOverview.useQuery({
 organizationId,
 });

 const reportCategories = [
 {
 id: "procurement",
 title: "Procurement Reports",
 description: "PR, RFQ, QA, PO, and GRN analysis",
 icon: FileText,
 color: "bg-blue-500",
 reports: [
 {
 name: "Procurement Cycle Time",
 description: "Time from PR creation to completion",
 href: "/organization/logistics/reports/cycle-time",
 },
 {
 name: "PO Aging Report",
 description: "Open purchase orders by age",
 href: "/organization/logistics/reports/po-aging",
 },
 {
 name: "Spending Analysis",
 description: "Spending trends by month/category",
 href: "/organization/logistics/reports/spending",
 },
 ],
 },
 {
 id: "suppliers",
 title: "Supplier Reports",
 description: "Vendor performance and compliance",
 icon: Users,
 color: "bg-orange-500",
 reports: [
 {
 name: "Supplier Performance",
 description: "On-time delivery and quality metrics",
 href: "/organization/logistics/reports/supplier-performance",
 },
 {
 name: "Top Suppliers",
 description: "Suppliers by volume and value",
 href: "/organization/logistics/reports/top-suppliers",
 },
 ],
 },
 {
 id: "inventory",
 title: "Inventory Reports",
 description: "Stock levels and movements",
 icon: Package,
 color: "bg-purple-500",
 reports: [
 {
 name: "Inventory Summary",
 description: "Current stock levels and valuation",
 href: "/organization/logistics/reports/inventory",
 },
 {
 name: "Stock Movement",
 description: "Inbound and outbound transactions",
 href: "/organization/logistics/reports/stock-movement",
 },
 ],
 },
 {
 id: "financial",
 title: "Financial Reports",
 description: "Budget tracking and payment status",
 icon: DollarSign,
 color: "bg-green-500",
 reports: [
 {
 name: "Budget vs Actual",
 description: "Spending against allocated budget",
 href: "/organization/logistics/reports/budget-actual",
 },
 {
 name: "Payment Status",
 description: "Outstanding and completed payments",
 href: "/organization/logistics/reports/payments",
 },
 ],
 },
 ];

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container py-8">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics" iconOnly />
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
 <p className="text-muted-foreground mt-1">
 Comprehensive insights and data-driven decision making
 </p>
 </div>
 </div>
 <div className="flex gap-2 mt-4 md:mt-0">
 <Button variant="outline" size="sm">
 <Calendar className="h-4 w-4 me-2" />
 Date Range
 </Button>
 <Button variant="outline" size="sm">
 <Download className="h-4 w-4 me-2" />
 Export All
 </Button>
 </div>
 </div>

 {/* Key Metrics Overview */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">Total PRs</p>
 <p className="text-3xl font-bold">
 {isLoading ? "-" : overview?.purchaseRequests.total || 0}
 </p>
 <p className="text-xs text-muted-foreground mt-1">
 {overview?.purchaseRequests.pending || 0} pending
 </p>
 </div>
 <FileText className="h-8 w-8 text-blue-500" />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">Open POs</p>
 <p className="text-3xl font-bold">
 {isLoading ? "-" : overview?.purchaseOrders.open || 0}
 </p>
 <p className="text-xs text-muted-foreground mt-1">
 {overview?.purchaseOrders.total || 0} total
 </p>
 </div>
 <ShoppingCart className="h-8 w-8 text-green-500" />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{isRTL ? 'إجمالي الإنفاق' : 'Total Spending'}</p>
 <p className="text-3xl font-bold">
 {isLoading
 ? "-"
 : `$${(overview?.purchaseOrders.totalValue || 0).toLocaleString(undefined, {
 maximumFractionDigits: 0,
 })}`}
 </p>
 <p className="text-xs text-muted-foreground mt-1">Current period</p>
 </div>
 <DollarSign className="h-8 w-8 text-emerald-500" />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{isRTL ? 'الموردين النشطين' : 'Active Suppliers'}</p>
 <p className="text-3xl font-bold">
 {isLoading ? "-" : overview?.suppliers.active || 0}
 </p>
 <p className="text-xs text-muted-foreground mt-1">
 {overview?.suppliers.total || 0} total
 </p>
 </div>
 <Users className="h-8 w-8 text-orange-500" />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Report Categories */}
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'فئات التقارير' : 'Report Categories'}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
 {reportCategories.map((category) => (
 <Card key={category.id} className="hover:shadow-md transition-shadow">
 <CardHeader className="pb-3">
 <div className="flex items-center gap-3">
 <div className={`p-2 rounded-lg ${category.color}`}>
 <category.icon className="h-5 w-5 text-white" />
 </div>
 <div>
 <CardTitle className="text-lg">{category.title}</CardTitle>
 <CardDescription>{category.description}</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 {category.reports.map((report, idx) => (
 <Link key={idx} href={report.href}>
 <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer">
 <div>
 <p className="font-medium text-sm">{report.name}</p>
 <p className="text-xs text-muted-foreground">{report.description}</p>
 </div>
 <ArrowIcon className="h-4 w-4 text-muted-foreground" />
 </div>
 </Link>
 ))}
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 {/* Quick Actions */}
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</h2>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card className="cursor-pointer hover:shadow-md transition-shadow">
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <div className="p-3 rounded-lg bg-blue-500/10">
 <BarChart3 className="h-6 w-6 text-blue-500" />
 </div>
 <div>
 <h3 className="font-semibold">{isRTL ? 'تقرير مخصص' : 'Custom Report'}</h3>
 <p className="text-sm text-muted-foreground">Build your own report</p>
 </div>
 </div>
 </CardContent>
 </Card>

 <Link href="/organization/logistics/reports/scheduled">
 <Card className="cursor-pointer hover:shadow-md transition-shadow">
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <div className="p-3 rounded-lg bg-green-500/10">
 <Calendar className="h-6 w-6 text-green-500" />
 </div>
 <div>
 <h3 className="font-semibold">{isRTL ? 'جدولة التقرير' : 'Schedule Report'}</h3>
 <p className="text-sm text-muted-foreground">Auto-generate reports</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </Link>

 <Card className="cursor-pointer hover:shadow-md transition-shadow">
 <CardContent className="pt-6">
 <div className="flex items-center gap-4">
 <div className="p-3 rounded-lg bg-purple-500/10">
 <Download className="h-6 w-6 text-purple-500" />
 </div>
 <div>
 <h3 className="font-semibold">{isRTL ? 'تصدير البيانات' : 'Export Data'}</h3>
 <p className="text-sm text-muted-foreground">Download raw data</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
