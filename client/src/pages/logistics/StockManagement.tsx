/**
 * Stock Management Page - Enhanced Dashboard with Batch-Based KPIs
 * Architecture: GRN → Stock Batch → Issue/Transfer/Return/Adjustment → Ledger
 */

import React from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Package,
  PackagePlus,
  PackageMinus,
  RotateCcw,
  FileText,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Clock,
  DollarSign,
  Truck,
  BookOpen,
  Layers,
  Wrench,
  ArrowLeftRight,
  Bell,
  BellRing,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";

export default function StockManagement() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();

  // Enhanced KPI query from batch-based stock management router
  const { data: kpis, isLoading: kpisLoading } =
    trpc.logistics.stockMgmt.kpis.getDashboard.useQuery({});

  // Fallback to old KPIs if new ones not available yet
  const { data: oldKpis } = trpc.logistics.stockKPIs.getKPIs.useQuery({});

  const totalItems = kpis?.totalItems ?? oldKpis?.totalItems ?? 0;
  const inStockBatches = kpis?.inStockBatches ?? 0;
  const lowStock = kpis?.lowStock ?? oldKpis?.lowStock ?? 0;
  const pendingRequests = kpis?.pendingRequests ?? 0;
  const nearExpiry = kpis?.nearExpiry ?? 0;
  const expired = kpis?.expired ?? 0;
  const inTransit = kpis?.inTransit ?? 0;
  const stockValue = kpis?.stockValue ?? 0;
  const issuedThisMonth = kpis?.issuedThisMonth ?? oldKpis?.issuedThisMonth ?? 0;

  // Sub-module card definitions
  const subModuleCards = [
    {
      id: "items",
      title: t.logistics?.stockItems || "Stock Items",
      description: t.logistics?.manageStockItemsAndQuantities || "View, adjust, and expire stock items with batch breakdown",
      icon: Package,
      href: "/organization/logistics/stock/items",
      metrics: [
        { label: t.logistics?.totalItems || "Total Items", value: totalItems },
        { label: t.logistics?.inStock || "In-Stock Batches", value: inStockBatches },
      ],
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      id: "requests",
      title: t.logistics?.stockRequests || "Stock Requests",
      description: t.logistics?.manageStockRequestsAndApprovals || "Receive requests and approvals",
      icon: FileText,
      href: "/organization/logistics/stock/requests",
      metrics: [
        { label: t.logistics?.pending || "Pending", value: pendingRequests },
      ],
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
    },
    {
      id: "issued",
      title: t.logistics?.issuedItems || "Issued Items",
      description: t.logistics?.issuedItemsDesc || "FEFO/FIFO batch-based issuing with partial issuance support",
      icon: TrendingUp,
      href: "/organization/logistics/stock/issued",
      metrics: [
        { label: t.logistics?.issuedThisMonth || "Issued This Month", value: issuedThisMonth },
      ],
      iconColor: "text-orange-600",
      iconBg: "bg-orange-100",
    },
    {
      id: "returns",
      title: t.logistics?.returns || "Returns",
      description: t.logistics?.manageReturnsAndInspections || "Inspect, accept or reject returns",
      icon: RotateCcw,
      href: "/organization/logistics/stock/returns",
      metrics: [],
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100",
    },
    {
      id: "ledger",
      title: t.logistics?.stockLedger || "Stock Ledger",
      description: t.logistics?.stockLedgerDesc || "Audit-proof transaction log: GRN_POST, ISSUE, RETURN, TRANSFER, ADJUSTMENT",
      icon: BookOpen,
      href: "/organization/logistics/stock/ledger",
      metrics: [],
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      id: "batches",
      title: t.logistics?.stockBatches || "Stock Batches",
      description: t.logistics?.stockBatchesDesc || "View all batches with available qty, expiry dates, and warehouse locations",
      icon: Layers,
      href: "/organization/logistics/stock/batches",
      metrics: [],
      iconColor: "text-teal-600",
      iconBg: "bg-teal-100",
    },
    {
      id: "adjustments",
      title: t.logistics?.stockAdjustments || "Stock Adjustments",
      description: t.logistics?.stockAdjustmentsDesc || "Admin-only corrections: write-offs, physical counts, damage, donations",
      icon: Wrench,
      href: "/organization/logistics/stock/adjustments",
      metrics: [],
      iconColor: "text-rose-600",
      iconBg: "bg-rose-100",
    },
    {
      id: "transfers",
      title: t.logistics?.warehouseTransfers || "Warehouse Transfers",
      description: t.logistics?.warehouseTransfersDesc || "Draft → Submitted → Dispatched → Received with ledger tracking",
      icon: ArrowLeftRight,
      href: "/organization/logistics/stock/transfers",
      metrics: [
        { label: t.logistics?.inTransit || "In Transit", value: inTransit },
      ],
      iconColor: "text-sky-600",
      iconBg: "bg-sky-100",
    },
    {
      id: "expiry",
      title: t.logistics?.expiryAlerts || "Expiry Alerts",
      description: t.logistics?.expiryAlertsDesc || "Monitor near-expiry and expired batches, send owner notifications",
      icon: Bell,
      href: "/organization/logistics/stock/expiry",
      metrics: [
        { label: t.logistics?.nearExpiry || "Near Expiry", value: nearExpiry },
        { label: t.logistics?.expired || "Expired", value: expired },
      ],
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      id: "physical-count",
      title: t.logistics?.physicalCount || "Physical Count",
      description: t.logistics?.physicalCountDesc || "Upload count sheets (CSV), compare with system stock, generate adjustments",
      icon: ClipboardCheck,
      href: "/organization/logistics/stock/physical-count",
      metrics: [],
      iconColor: "text-indigo-600",
      iconBg: "bg-indigo-100",
    },
    {
      id: "transfer-tracking",
      title: t.logistics?.transferTracking || "Transfer Tracking",
      description: t.logistics?.transferTrackingDesc || "Monitor in-transit transfers with ETA, location updates, and tracking notes",
      icon: Truck,
      href: "/organization/logistics/stock/transfer-tracking",
      metrics: [
        { label: t.logistics?.inTransit || "In Transit", value: inTransit },
      ],
      iconColor: "text-cyan-600",
      iconBg: "bg-cyan-100",
    },
    {
      id: "scheduled-alerts",
      title: t.logistics?.scheduledAlerts || "Scheduled Alerts",
      description: t.logistics?.scheduledAlertsDesc || "Configure automated daily/weekly expiry notifications",
      icon: BellRing,
      href: "/organization/logistics/stock/scheduled-alerts",
      metrics: [],
      iconColor: "text-violet-600",
      iconBg: "bg-violet-100",
    },
    {
      id: "analytics",
      title: t.logistics?.stockAnalytics || "Stock Analytics",
      description: t.logistics?.stockAnalyticsDesc || "Issuance trends, transfer volumes, adjustment frequency, and stock value charts",
      icon: BarChart3,
      href: "/organization/logistics/stock/analytics",
      metrics: [],
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
    },
  ];

  const NavArrow = () =>
    isRTL ? (
      <ChevronLeft className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronRight className="w-4 h-4 text-blue-600" />
    );

  const KpiValue = ({
    value,
    loading,
  }: {
    value: number | string;
    loading?: boolean;
  }) =>
    loading ? (
      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
    ) : (
      <p className="text-2xl font-bold text-blue-600 leading-tight">{value}</p>
    );

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton
            href="/organization/logistics"
            label={t.logistics?.backToLogistics || "Back to Logistics"}
          />
          <div>
            <h1 className="text-2xl font-bold text-start">
              {t.logistics?.stockManagement || "Stock Management"}
            </h1>
            <p className="text-muted-foreground text-start">
              {t.logistics?.manageInventoryRequestsIssuedItemsAnd || "Batch-controlled inventory with FEFO/FIFO issuing and audit-proof ledger"}
            </p>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-8">
        {/* Top KPI Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            {
              label: t.logistics?.totalItems || "Total Items",
              value: totalItems,
              icon: Package,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
            {
              label: t.logistics?.lowStock || "Low Stock",
              value: lowStock,
              icon: PackageMinus,
              iconBg: "bg-red-50",
              iconColor: "text-red-600",
            },
            {
              label: t.logistics?.nearExpiry || "Near Expiry",
              value: nearExpiry,
              icon: Clock,
              iconBg: "bg-amber-50",
              iconColor: "text-amber-600",
            },
            {
              label: t.logistics?.expired || "Expired",
              value: expired,
              icon: AlertTriangle,
              iconBg: "bg-red-50",
              iconColor: "text-red-600",
            },
            {
              label: t.logistics?.stockValue || "Stock Value",
              value: `$${stockValue.toLocaleString()}`,
              icon: DollarSign,
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
            },
          ].map((kpi, idx) => {
            const KpiIcon = kpi.icon;
            return (
              <div
                key={idx}
                className="bg-card rounded-lg border border-border p-4 flex items-center gap-3"
              >
                <div className={`p-3 rounded-lg ${kpi.iconBg} shrink-0`}>
                  <KpiIcon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {kpi.label}
                  </p>
                  {kpisLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold leading-tight">{kpi.value}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Secondary KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              label: t.logistics?.inTransit || "In Transit",
              value: inTransit,
              icon: Truck,
              iconBg: "bg-sky-50",
              iconColor: "text-sky-600",
            },
            {
              label: t.logistics?.pendingRequests || "Pending Requests",
              value: pendingRequests,
              icon: FileText,
              iconBg: "bg-yellow-50",
              iconColor: "text-yellow-600",
            },
            {
              label: t.logistics?.issuedThisMonth || "Issued This Month",
              value: issuedThisMonth,
              icon: TrendingUp,
              iconBg: "bg-orange-50",
              iconColor: "text-orange-600",
            },
          ].map((kpi, idx) => {
            const KpiIcon = kpi.icon;
            return (
              <div
                key={idx}
                className="bg-card rounded-lg border border-border p-4 flex items-center gap-3"
              >
                <div className={`p-3 rounded-lg ${kpi.iconBg} shrink-0`}>
                  <KpiIcon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {kpi.label}
                  </p>
                  {kpisLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 mt-1" />
                  ) : (
                    <p className="text-xl font-bold leading-tight">{kpi.value}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sub-Modules Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-start">
            {t.logistics?.submodules || "Sub-Modules"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subModuleCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.id} href={card.href}>
                  <div className="bg-card rounded-lg border-2 border-border p-6 transition-all duration-200 hover:border-blue-500 hover:shadow-lg cursor-pointer h-full flex flex-col">
                    {/* Row 1: Icon */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2 ${card.iconBg} rounded-lg shrink-0`}>
                        <Icon className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                    </div>

                    {/* Row 2: Title */}
                    <h3 className="text-lg font-semibold text-foreground text-start line-clamp-1">
                      {card.title}
                    </h3>

                    {/* Row 3: Description */}
                    <p className="text-sm text-muted-foreground mt-1 text-start line-clamp-2 flex-1">
                      {card.description}
                    </p>

                    {/* Row 4: KPI Metrics */}
                    {card.metrics.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        {card.metrics.map((metric, idx) => (
                          <div key={idx} className="text-start">
                            <p className="text-xs text-muted-foreground">
                              {metric.label}
                            </p>
                            <KpiValue value={metric.value} loading={kpisLoading} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Row 5: Navigation Arrow */}
                    <div className="mt-4 flex items-center gap-1 text-blue-600 text-xs font-medium">
                      <NavArrow />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 text-start">
            {t.logistics?.quickActions || "Quick Actions"}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/items/new">
                <Package className="h-4 w-4 me-2" />
                {t.logistics?.addNewItem || "Add New Item"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/requests/new">
                <FileText className="h-4 w-4 me-2" />
                {t.logistics?.newStockRequest || "New Stock Request"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/issued/new">
                <TrendingUp className="h-4 w-4 me-2" />
                {t.logistics?.issueItems || "Issue Items"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/returns/new">
                <RotateCcw className="h-4 w-4 me-2" />
                {t.logistics?.registerReturn || "Register Return"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/adjustments/new">
                <Wrench className="h-4 w-4 me-2" />
                {t.logistics?.newAdjustment || "New Adjustment"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/transfers/new">
                <ArrowLeftRight className="h-4 w-4 me-2" />
                {t.logistics?.newTransfer || "New Transfer"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/expiry">
                <Bell className="h-4 w-4 me-2" />
                {t.logistics?.expiryAlerts || "Expiry Alerts"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/physical-count/new">
                <ClipboardCheck className="h-4 w-4 me-2" />
                {t.logistics?.physicalCount || "Physical Count"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/transfer-tracking">
                <Truck className="h-4 w-4 me-2" />
                {t.logistics?.transferTracking || "Transfer Tracking"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/organization/logistics/stock/scheduled-alerts">
                <BellRing className="h-4 w-4 me-2" />
                {t.logistics?.scheduledAlerts || "Scheduled Alerts"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
