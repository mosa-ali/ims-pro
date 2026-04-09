/**
 * Logistics & Procurement Workspace
 * Main dashboard for the Logistics module with RTL/LTR support
 * Uses OrganizationContext for data isolation (same pattern as Finance and HR modules)
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";

export default function LogisticsWorkspace() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { t, isRTL, direction } = useTranslation();
  const [, setLocation] = useLocation();
  
  // Get organizationId from context (same pattern as Finance and HR modules)
  const organizationId = currentOrganization?.id || 1;
  
  // Fetch dashboard stats from the database
  const { data: stats, isLoading } = trpc.logistics.dashboard.getStats.useQuery(
    { organizationId },
    { enabled: !!user && !!organizationId }
  );

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const modules = [
    {
      id: "purchase-requests",
      title: t("Purchase Requests", "طلبات الشراء"),
      description: t("Create and manage purchase requisitions", "إنشاء وإدارة طلبات الشراء"),
      icon: FileText,
      href: "/logistics/purchase-requests",
      color: "bg-blue-500",
      stats: [
        { label: t("Pending", "قيد الانتظار"), value: stats?.purchaseRequests?.pending || 0 },
        { label: t("Approved", "معتمد"), value: stats?.purchaseRequests?.approved || 0 },
      ],
    },
    {
      id: "suppliers",
      title: t("Suppliers", "الموردون"),
      description: t("Manage supplier registry and compliance", "إدارة سجل الموردين والامتثال"),
      icon: Users,
      href: "/logistics/suppliers",
      color: "bg-orange-500",
      stats: [
        { label: t("Active", "نشط"), value: stats?.suppliers?.active || 0 },
        { label: t("Total", "الإجمالي"), value: stats?.suppliers?.total || 0 },
      ],
    },
    {
      id: "purchase-orders",
      title: t("Purchase Orders", "أوامر الشراء"),
      description: t("Create and track purchase orders", "إنشاء وتتبع أوامر الشراء"),
      icon: ShoppingCart,
      href: "/logistics/purchase-orders",
      color: "bg-green-500",
      stats: [
        { label: t("Open", "مفتوح"), value: stats?.purchaseOrders?.open || 0 },
        { label: t("Delivered", "تم التسليم"), value: stats?.purchaseOrders?.delivered || 0 },
      ],
    },
    {
      id: "grn",
      title: t("Goods Receipt Notes", "سندات استلام البضائع"),
      description: t("Record received goods and inspections", "تسجيل البضائع المستلمة والفحوصات"),
      icon: ClipboardList,
      href: "/logistics/grn",
      color: "bg-teal-500",
      stats: [
        { label: t("Pending", "قيد الانتظار"), value: stats?.grn?.pending || 0 },
        { label: t("Accepted", "مقبول"), value: stats?.grn?.accepted || 0 },
      ],
    },
    {
      id: "stock",
      title: t("Stock Management", "إدارة المخزون"),
      description: t("Track inventory and stock movements", "تتبع المخزون وحركات المخزون"),
      icon: Warehouse,
      href: "/logistics/stock",
      color: "bg-purple-500",
      stats: [
        { label: t("In Stock", "متوفر"), value: stats?.stock?.inStock || 0 },
        { label: t("Low Stock", "مخزون منخفض"), value: stats?.stock?.lowStock || 0 },
      ],
    },
    {
      id: "fleet",
      title: t("Fleet Management", "إدارة الأسطول"),
      description: t("Manage vehicles, drivers, and trips", "إدارة المركبات والسائقين والرحلات"),
      icon: Car,
      href: "/logistics/fleet",
      color: "bg-cyan-500",
      stats: [
        { label: t("Vehicles", "المركبات"), value: stats?.vehicles?.total || 0 },
        { label: t("Drivers", "السائقين"), value: stats?.drivers?.active || 0 },
      ],
    },
    {
      id: "tracker",
      title: t("Procurement Tracker", "متتبع المشتريات"),
      description: t("End-to-end procurement visibility", "رؤية شاملة لعملية الشراء"),
      icon: BarChart3,
      href: "/logistics/tracker",
      color: "bg-pink-500",
      stats: [
        { label: t("Active", "نشط"), value: (stats?.purchaseRequests?.pending || 0) + (stats?.purchaseOrders?.open || 0) },
        { label: t("Completed", "مكتمل"), value: stats?.purchaseOrders?.delivered || 0 },
      ],
    },
  ];

  const quickActions = [
    {
      title: t("Create Purchase Request", "إنشاء طلب شراء"),
      description: t("Start a new procurement request", "بدء طلب شراء جديد"),
      href: "/logistics/purchase-requests/new",
      icon: FileText,
    },
    {
      title: t("Add Supplier", "إضافة مورد"),
      description: t("Register a new supplier", "تسجيل مورد جديد"),
      href: "/logistics/suppliers/new",
      icon: Users,
    },
    {
      title: t("Add Stock Item", "إضافة صنف مخزون"),
      description: t("Add a new item to inventory", "إضافة صنف جديد للمخزون"),
      href: "/logistics/stock/new",
      icon: Package,
    },
  ];

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("Logistics & Procurement", "اللوجستيات والمشتريات")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("Manage procurement, inventory, and fleet operations", "إدارة المشتريات والمخزون وعمليات الأسطول")}
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <Link href="/logistics/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 me-2" />
                {t("Settings", "الإعدادات")}
              </Button>
            </Link>
            <Link href="/logistics/purchase-requests/new">
              <Button size="sm">
                <Plus className="h-4 w-4 me-2" />
                {t("New Purchase Request", "طلب شراء جديد")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("Pending PRs", "طلبات معلقة")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("Open POs", "أوامر مفتوحة")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("Low Stock Items", "أصناف منخفضة")}</p>
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
                  <p className="text-sm text-muted-foreground">{t("Available Vehicles", "مركبات متاحة")}</p>
                  <p className="text-3xl font-bold">{isLoading ? "-" : stats?.vehicles?.active || 0}</p>
                </div>
                <Car className="h-8 w-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <h2 className="text-xl font-semibold mb-4">{t("Modules", "الوحدات")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                    {t("View Details", "عرض التفاصيل")}
                    <ArrowIcon className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold mb-4">{t("Quick Actions", "إجراءات سريعة")}</h2>
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
      </div>
    </div>
  );
}
