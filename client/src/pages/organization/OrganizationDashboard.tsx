import React, { useState, memo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { formatCurrency } from "@/utils/formatters";
import { orgDashboardTranslations } from "@/i18n/organizationDashboard-i18n";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  DollarSign,
  Users,
  Target,
  FileText,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Activity,
  ChevronRight,
  Plus,
  ClipboardList,
  Truck,
  BarChart3,
  Bell,
  Search,
  ArrowRight,
  ShieldAlert,
  Boxes,
  CalendarClock,
  Clock,
  TrendingUp,
  Briefcase,
  Receipt,
  FileBarChart2,
  Building2,
  Zap,
  Heart,
  Globe,
  Shield,
  Gauge,
  HandHeart,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "server/routers";

// ── Type-safe output aliases from tRPC router ──
type RouterOutputs = inferRouterOutputs<AppRouter>;
type DashboardOutputs = RouterOutputs["dashboard"];
type DashboardStats = DashboardOutputs["getStats"];
type WorkflowQueue = DashboardOutputs["getWorkflowQueue"];
type ModuleSnapshots = DashboardOutputs["getOperationalModuleSnapshots"];
type RecentActivityItem = DashboardOutputs["getRecentActivity"][number];
type UpcomingDeadlines = DashboardOutputs["getUpcomingDeadlines"];
type OperationalBottlenecks = DashboardOutputs["getOperationalBottlenecks"];
type UserTask = DashboardOutputs["getUserTasks"][number];
type InventoryAlerts = DashboardOutputs["getInventoryAlerts"];
type PendingApproval = DashboardOutputs["getPendingApprovals"][number];
type OperationalHealth = DashboardOutputs["getOperationalHealth"];
type HumanitarianIdentityData = DashboardOutputs["getHumanitarianIdentity"];
type orgDashboardTranslations = Record<string, string | undefined>;

/**
 * ============================================================
 * ORGANIZATION ERP OPERATIONS CENTER — MAIN DASHBOARD
 * ============================================================
 *
 * Design: "Humanitarian ERP Operational Command Center"
 * Based on OLD dashboard + 9 targeted improvements:
 *   1. Executive Header — compact KPI pills, mobile-first
 *   2. Executive Snapshot — top row, 8 compact KPI cards
 *   3. My Work Queue — restored with actionable counter cards
 *   4. Operational Module Snapshots — restored 8 module cards
 *   5. Critical Alerts & Bottlenecks — severity-sorted rows
 *   6. Upcoming Deadlines — grants/projects/tasks, 30-day window
 *   7. Smart Shortcuts — merged with Quick Actions (6 max, no duplicates)
 *   8. Humanitarian Identity — compact chips panel
 *   9. Recent Activity — max 5 items + "View All" toggle
 *
 * i18n:  All strings via t.organizationDashboard.* with English fallbacks.
 * RTL:   Driven by `direction` / `isRTL` from useLanguage().
 * Scope: Every query scoped to (organizationId, operatingUnitId).
 */

export default function OrganizationDashboard() {
  const { user } = useAuth();
  const { language, isRTL, direction } = useLanguage();
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();
  const [, navigate] = useLocation();
  const t = orgDashboardTranslations[language as keyof typeof orgDashboardTranslations] || orgDashboardTranslations.en || orgDashboardTranslations.it;
  

    // ========== TRANSLATION OBJECT ==========
  const localT = {
    // Main sections
    executiveSnapshot: t.executiveSnapshot || "Executive Snapshot",
    myWorkQueue: t.myWorkQueue || "My Work Queue",
    operationalModules: t.operationalModules || "Operational Modules",
    criticalAlerts: t.criticalAlerts || "Critical Alerts & Bottlenecks",
    recentActivity: t.recentActivity || "Recent Activity",
    humanitarianIdentity: t.humanitarianIdentity || "Humanitarian Identity",

    // Dashboard actions
    lastUpdated: t.lastUpdated || "Last updated:",
    refresh: t.refresh || "Refresh",
    failedToLoadSection: t.failedToLoadSection || "Failed to load this section. Please try again later.",
    noOrganization: t.noOrganization || "No organization selected",
    contactAdmin: t.contactAdmin || "Please contact your administrator",

    // Executive Snapshot KPIs
    totalBudget: t.totalBudget || "Total Budget",
    activeProjects: t.activeProjects || "Active Projects",
    totalEmployees: t.totalEmployees || "Total Employees",
    activeGrants: t.activeGrants || "Active Grants",
    fullTimeStaff: t.fullTimeStaff || "Full-Time Staff",
    acrossAllPrograms: t.acrossAllPrograms || "Across all programs",
    onTrack: t.onTrack || "On Track",
    atRisk: t.atRisk || "At Risk",
    allocatedFunds: t.allocatedFunds || "Allocated Funds",

    // My Work Queue
    itemsRequiringAttention: t.itemsRequiringAttention || "Items requiring your attention",
    viewAll: t.viewAll || "View All",
    inProgress: t.inProgress || "In Progress",
    mediumPriority: t.mediumPriority || "Medium Priority",
    highPriority: t.highPriority || "High Priority",

    // Operational Modules
    coreModules: t.coreModules || "Core Modules",
    openModule: t.openModule || "Open Module",
    comingSoon: t.comingSoon || "Coming Soon",
    financeManagement: t.financeManagement || "Finance Management",
    financeManagementDesc: t.financeManagementDesc || "Budget tracking and financial reporting",
    programsGrants: t.programsGrants || "Programs & Grants",
    programsGrantsDesc: t.programsGrantsDesc || "Program and grant administration",
    logisticsProcurement: t.logisticsProcurement || "Logistics & Procurement",
    logisticsProcurementDesc: t.logisticsProcurementDesc || "Supply chain and vendor management",
    humanResources: t.humanResources || "Human Resources",
    humanResourcesDesc: t.humanResourcesDesc || "Staff and HR administration",
    donorCRM: t.donorCRM || "Donor CRM",
    donorCRMDesc: t.donorCRMDesc || "Donor relationship management",
    complianceAlerts: t.complianceAlerts || "Compliance Alerts",
    complianceAlertsDesc: t.complianceAlertsDesc || "Compliance and audit tracking",
    meal: t.meal || "MEAL",
    mealDesc: t.mealDesc || "Monitoring, evaluation and learning",

    // Critical Alerts
    budgetRevisionNeeded: t.budgetRevisionNeeded || "Budget revision needed",
    budgetVarianceExceeds: t.budgetVarianceExceeds || "Budget variance exceeds threshold",
    quarterlyReportOverdue: t.quarterlyReportOverdue || "Quarterly report overdue",
    quarterlyReportPending: t.quarterlyReportPending || "Quarterly report pending",
    compliance: t.compliance || "Compliance",

    // Status & Timeline
    daysAgo: t.daysAgo || "days ago",
    projectPipelineStatus: t.projectPipelineStatus || "Project Pipeline Status",
    activeProjectProgress: t.activeProjectProgress || "Active Project Progress",
    phase0Complete: t.phase0Complete || "Phase 0 Complete",
    phase0CompleteDesc: t.phase0CompleteDesc || "Initial assessment and planning",

    // Organization Context
    noActiveProjects: t.noActiveProjects || "No active projects",
    noOperatingUnit: t.noOperatingUnit || "No operating unit selected",
    operatingUnitContext: t.operatingUnitContext || "Operating Unit Context",
    budget: t.budget || "Budget",
    budgetReview: t.budgetReview || "Budget Review",

    // Common actions & states
    save: t.save || "Save",
    cancel: t.cancel || "Cancel",
    delete: t.delete || "Delete",
    edit: t.edit || "Edit",
    add: t.add || "Add",
    submit: t.submit || "Submit",
    required: t.required || "Required",
    error: t.error || "Error",
    loading: t.loading || "Loading",
  };

  const queryEnabled = !!currentOrganizationId;

  const queryOpts = {
    enabled: queryEnabled,
    staleTime: 300_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: false as const,
  };

  const { data: dashboardStats, isLoading: statsLoading, isError: statsError, refetch } =
    trpc.dashboard.getStats.useQuery({}, queryOpts);
  const { data: workflowQueue, isLoading: queueLoading, isError: queueError } =
    trpc.dashboard.getWorkflowQueue.useQuery({}, queryOpts);
  const { data: moduleSnapshots, isLoading: snapshotsLoading, isError: snapshotsError } =
    trpc.dashboard.getOperationalModuleSnapshots.useQuery({}, queryOpts);
  const { data: recentActivity, isLoading: activityLoading, isError: activityError } =
    trpc.dashboard.getRecentActivity.useQuery({ limit: 15 }, queryOpts);
  const { data: upcomingDeadlines, isLoading: deadlinesLoading, isError: deadlinesError } =
    trpc.dashboard.getUpcomingDeadlines.useQuery({ daysAhead: 90 }, queryOpts);
  const { data: bottlenecks, isLoading: bottlenecksLoading, isError: bottlenecksError } =
    trpc.dashboard.getOperationalBottlenecks.useQuery({}, queryOpts);
  const { data: userTasks, isLoading: tasksLoading, isError: tasksError } =
    trpc.dashboard.getUserTasks.useQuery({ limit: 8 }, queryOpts);
  const { data: inventoryAlerts, isLoading: inventoryLoading, isError: inventoryError } =
    trpc.dashboard.getInventoryAlerts.useQuery({}, queryOpts);
  const { data: pendingApprovals, isLoading: approvalsLoading, isError: approvalsError } =
    trpc.dashboard.getPendingApprovals.useQuery({ limit: 10 }, queryOpts);
  const { data: operationalHealth, isLoading: healthLoading, isError: healthError } =
    trpc.dashboard.getOperationalHealth.useQuery({}, queryOpts);
  const { data: humanitarianIdentity, isLoading: identityLoading, isError: identityError } =
    trpc.dashboard.getHumanitarianIdentity.useQuery({}, queryOpts);
  
  // Section 6B data now comes directly from getUpcomingDeadlines (single query)
  // reportingSchedules and opportunities are returned alongside projects

  // Guard: no organisation selected
  if (!currentOrganizationId) {
    return (
      <div className="container py-16" dir={direction}>
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">
              {t.noOrganization}
            </CardTitle>
            <CardDescription className="text-amber-700">
              {t.contactAdmin}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalPending =
    (workflowQueue?.total ?? 0) + (pendingApprovals?.length ?? 0);

  const totalAlerts =
    (bottlenecks?.overdueProjects?.length ?? 0) +
    (bottlenecks?.stalledPRs?.length ?? 0) +
    (bottlenecks?.expiredGrants?.length ?? 0) +
    (bottlenecks?.criticalRisks?.length ?? 0) +
    (bottlenecks?.overduePayments?.length ?? 0);

  // All three deadline counts come from the single getUpcomingDeadlines query
  const totalDeadlines =
    (upcomingDeadlines?.projects?.length ?? 0) +
    (upcomingDeadlines?.reportingSchedules?.length ?? 0) +
    (upcomingDeadlines?.opportunities?.length ?? 0);

    return (
  <div dir={direction} className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-4">


        {/* ── SECTION 2: EXECUTIVE SNAPSHOT ── */}
        {statsError ? (
          <ErrorFallbackCard title={t.executiveSnapshot} isRTL={isRTL} t={orgDashboardTranslations} />
        ) : (
          <ExecutiveSnapshot
            stats={dashboardStats}
            workflowQueue={workflowQueue}
            inventoryAlerts={inventoryAlerts}
            isLoading={statsLoading || queueLoading || inventoryLoading}
            isRTL={isRTL}
            t={t}
          />
        )}

        {/* ── SECTION 3: MY WORK QUEUE ── */}
        {(queueError || approvalsError || tasksError) ? (
          <ErrorFallbackCard title={t.myWorkQueue} isRTL={isRTL} t={orgDashboardTranslations} />
        ) : (
          <MyWorkQueue
            workflowQueue={workflowQueue}
            pendingApprovals={pendingApprovals}
            userTasks={userTasks}
            isLoading={queueLoading || approvalsLoading || tasksLoading}
            isRTL={isRTL}
            t={t}
            navigate={navigate}
          />
        )}

        {/* ── SECTION 4: OPERATIONAL MODULE SNAPSHOTS ── */}
        {(snapshotsError || inventoryError) ? (
          <ErrorFallbackCard title={t.operationalModules} isRTL={isRTL} t={orgDashboardTranslations} />
        ) : (
          <OperationalModuleSnapshots
            snapshots={moduleSnapshots}
            inventoryAlerts={inventoryAlerts}
            isLoading={snapshotsLoading || inventoryLoading}
            isRTL={isRTL}
            t={t}
            navigate={navigate}
          />
        )}

        {/* ── SECTION 5: CRITICAL ALERTS & BOTTLENECKS ── */}
        {bottlenecksError ? (
          <ErrorFallbackCard title={t.criticalAlerts} isRTL={isRTL} t={orgDashboardTranslations} />
        ) : (
          <CriticalAlertsBottlenecks
            bottlenecks={bottlenecks}
            isLoading={bottlenecksLoading}
            isRTL={isRTL}
            t={t}
            navigate={navigate}
          />
        )}

        {/* ── SECTIONS 6 & 6B: ACTIVITY + DEADLINES (2-col on lg) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activityError ? (
            <ErrorFallbackCard title={t.recentActivity} isRTL={isRTL} t={orgDashboardTranslations} />
          ) : (
            <RecentActivitySection
              activity={recentActivity}
              isLoading={activityLoading}
              isRTL={isRTL}
              t={t}
            />
          )}
          <UpcomingDeadlinesSection
            projectEndDates={upcomingDeadlines?.projects ?? []}
            projectEndDatesLoading={deadlinesLoading}
            reportingSchedules={(upcomingDeadlines?.reportingSchedules ?? []) as any[]}
            reportingSchedulesLoading={deadlinesLoading}
            opportunities={(upcomingDeadlines?.opportunities ?? []) as any[]}
            opportunitiesLoading={deadlinesLoading}
            isRTL={isRTL}
            t={t}
            navigate={navigate}
          />
        </div>

        {/* ── SECTIONS 7 & 8: SMART SHORTCUTS + HUMANITARIAN IDENTITY ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MergedSmartShortcuts isRTL={isRTL} t={t} navigate={navigate} />
          </div>
          {identityError ? (
            <ErrorFallbackCard title={t.humanitarianIdentity} isRTL={isRTL} t={orgDashboardTranslations} />
          ) : (
            <HumanitarianIdentitySection
              identity={humanitarianIdentity}
              isLoading={identityLoading}
              isRTL={isRTL}
              t={t}
            />
          )}
        </div>

        {/* ── FOOTER ── */}
        <footer className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span suppressHydrationWarning>
              {t.lastUpdated} {new Date().toLocaleTimeString(language === 'ar' ? "ar-SA" : "en-US")}
            </span>
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3" />
              {t.refresh}
            </Button>
          </div>
          <span>IMS Operations Center v2.0</span>
        </footer>
      </div>
  );
}

// ============================================================
// SECTION 1: EXECUTIVE OPERATIONAL HEADER
// Compact KPI pills, mobile-first layout
// ============================================================
interface ExecutiveHeaderProps {
  totalPending: number;
  totalAlerts: number;
  totalDeadlines: number;
  userName: string;
  isRTL: boolean;
  t: orgDashboardTranslations;
}

interface HeaderPillProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  urgency: "high" | "medium" | "ok";
}

function HeaderPill({ icon, label, value, urgency }: HeaderPillProps) {
  const bg =
    urgency === "high"
      ? "bg-red-500/25 border-red-400/40"
      : urgency === "medium"
      ? "bg-amber-500/25 border-amber-400/40"
      : "bg-white/10 border-white/20";
  const valueColor =
    urgency === "high"
      ? "text-red-200"
      : urgency === "medium"
      ? "text-amber-200"
      : "text-white";
  return (
    <div
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold text-white ${bg}`}
    >
      {icon}
      <span className="text-blue-100">{label}:</span>
      <span className={valueColor}>{value}</span>
    </div>
  );
}

// ============================================================
// SECTION 2: EXECUTIVE SNAPSHOT
// 8 compact KPI cards at the top
// ============================================================
interface ExecutiveSnapshotProps {
  stats: DashboardStats | undefined;
  workflowQueue: WorkflowQueue | undefined;
  inventoryAlerts: InventoryAlerts | undefined;
  isLoading: boolean;
  isRTL: boolean;
  t: orgDashboardTranslations;
}

function ExecutiveSnapshot({
  stats,
  workflowQueue,
  inventoryAlerts,
  isLoading,
  isRTL,
  t,
}: ExecutiveSnapshotProps) {
  const kpis = [
    {
      label: t.totalProjects ?? "Total Projects",
      value: (stats?.activeProjects ?? 0) + (stats?.completedProjects ?? 0),
      icon: FolderKanban,
      accent: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: t.activeProjects,
      value: stats?.activeProjects ?? 0,
      icon: Activity,
      accent: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: t.totalBudget,
      value: formatCurrency(stats?.totalBudget ?? 0, "USD"),
      icon: DollarSign,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: t.budgetUtilization ?? "Budget Utilization",
      value: `${stats?.budgetExecution ?? 0}%`,
      icon: TrendingUp,
      accent: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: t.activeGrants,
      value: stats?.activeGrants ?? 0,
      icon: Target,
      accent: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: t.hrWorkforce ?? "HR Workforce",
      value: stats?.totalEmployees ?? 0,
      icon: Users,
      accent: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: t.procurementPending ?? "Procurement Pending",
      value: workflowQueue?.pendingPRs ?? 0,
      icon: ClipboardList,
      accent: (workflowQueue?.pendingPRs ?? 0) > 3 ? "text-red-600" : "text-amber-600",
      bg: (workflowQueue?.pendingPRs ?? 0) > 3 ? "bg-red-50" : "bg-amber-50",
      urgent: (workflowQueue?.pendingPRs ?? 0) > 3,
    },
    {
      label: t.inventoryAlerts ?? "Inventory Alerts",
      value: inventoryAlerts?.total ?? 0,
      icon: ShieldAlert,
      accent: (inventoryAlerts?.total ?? 0) > 0 ? "text-red-600" : "text-gray-500",
      bg: (inventoryAlerts?.total ?? 0) > 0 ? "bg-red-50" : "bg-gray-50",
      urgent: (inventoryAlerts?.total ?? 0) > 0,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-bold text-gray-900">
          {t.executiveSnapshot ?? "Executive Snapshot"}
        </h2>
        <span className="text-xs text-gray-400">
          {t.executiveSnapshotDesc ?? "Key operational indicators"}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))
          : kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  className={`flex flex-col gap-1 p-3 rounded-lg border bg-white shadow-sm ${
                    (kpi as any).urgent ? "border-red-200" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-medium leading-tight truncate">
                      {kpi.label}
                    </span>
                    <div className={`${kpi.bg} rounded p-1 flex-shrink-0`}>
                      <Icon className={`w-3 h-3 ${kpi.accent}`} />
                    </div>
                  </div>
                  <span className={`text-base font-black leading-tight ${kpi.accent}`}>
                    {kpi.value}
                  </span>
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 3: MY WORK QUEUE
// Restored — actionable counter cards + pending approval rows
// ============================================================
interface MyWorkQueueProps {
  workflowQueue: WorkflowQueue | undefined;
  pendingApprovals: PendingApproval[] | undefined;
  userTasks: UserTask[] | undefined;
  isLoading: boolean;
  isRTL: boolean;
  t: orgDashboardTranslations;
  navigate: (path: string) => void;
}

function MyWorkQueue({
  workflowQueue,
  pendingApprovals,
  userTasks,
  isLoading,
  isRTL,
  t,
  navigate,
}: MyWorkQueueProps) {
  const queueItems = [
    {
      label: t.pendingPRApprovals ?? "PR Approvals",
      count: workflowQueue?.pendingPRs ?? 0,
      icon: ClipboardList,
      color: "text-amber-600",
      bg: "bg-amber-50",
      route: "/organization/logistics/my-prs",
      urgent: (workflowQueue?.pendingPRs ?? 0) > 3,
    },
    {
      label: t.leaveRequests ?? "Leave Requests",
      count: workflowQueue?.pendingLeaveRequests ?? 0,
      icon: CalendarClock,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      route: "/organization/hr/leave",
      urgent: false,
    },
    {
      label: t.pendingPayments ?? "Pending Payments",
      count: workflowQueue?.pendingPayments ?? 0,
      icon: Receipt,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      route: "/organization/finance/payments",
      urgent: (workflowQueue?.pendingPayments ?? 0) > 2,
    },
    {
      label: t.pendingContracts ?? "Contracts",
      count: workflowQueue?.pendingContracts ?? 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      route: "/organization/logistics/contracts",
      urgent: false,
    },
    {
      label: t.stockRequests ?? "Stock Requests",
      count: workflowQueue?.pendingStockRequests ?? 0,
      icon: Boxes,
      color: "text-orange-600",
      bg: "bg-orange-50",
      route: "/organization/logistics/stock-requests",
      urgent: false,
    },
    {
      label: t.activeRFQs ?? "Active RFQs",
      count: workflowQueue?.pendingRFQs ?? 0,
      icon: Truck,
      color: "text-purple-600",
      bg: "bg-purple-50",
      route: "/organization/logistics/purchase-requests",
      urgent: false,
    },
  ];

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-blue-600" />
            <div>
              <CardTitle className="text-sm">
                {t.myWorkQueue ?? "My Work Queue"}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.myWorkQueueDesc ?? "Items requiring your attention today"}
              </CardDescription>
            </div>
          </div>
          {(workflowQueue?.total ?? 0) > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 font-bold text-xs">
              {workflowQueue?.total ?? 0} {t.pending ?? "pending"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Workflow counter cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mb-4">
              {queueItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.route)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 bg-white hover:shadow-md transition-all ${
                      item.urgent
                        ? "border-red-200 hover:border-red-300"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <div className={`${item.bg} rounded-lg p-1.5`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <span
                      className={`text-xl font-black ${
                        item.urgent ? "text-red-600" : "text-gray-900"
                      }`}
                    >
                      {item.count}
                    </span>
                    <span className="text-[10px] text-gray-500 text-center leading-tight">
                      {item.label}
                    </span>
                    {item.urgent && (
                      <span className="text-[9px] font-bold text-red-500 uppercase">
                        {t.urgent ?? "Urgent"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Recent pending approvals */}
            {pendingApprovals && pendingApprovals.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {t.recentPendingApprovals ?? "Recent Pending Approvals"}
                </p>
                <div className="space-y-1.5">
                  {pendingApprovals.slice(0, 4).map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="w-3 h-3 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {item.reference}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ms-2">
                        {item.amount != null && Number(item.amount) > 0 && (
                          <span className="text-xs font-bold text-gray-700">
                            ${Number(item.amount).toLocaleString()}
                          </span>
                        )}
                        <Badge
                          className={`text-[10px] border-0 ${
                            item.urgency === "urgent"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.type === "purchase_request"
                            ? (t.pr ?? "PR")
                            : item.type === "leave_request"
                            ? (t.leave ?? "Leave")
                            : (t.payment ?? "Payment")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My tasks */}
            {userTasks && userTasks.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {t.myTasks ?? "My Tasks"}
                </p>
                <div className="space-y-1">
                  {userTasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          task.priority === "HIGH" || task.priority === "URGENT"
                            ? "bg-red-500"
                            : task.priority === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-green-500"
                        }`}
                      />
                      <span className="text-xs text-gray-800 flex-1 truncate">
                        {task.taskName}
                      </span>
                      {task.dueDate && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(workflowQueue?.total ?? 0) === 0 &&
              (!pendingApprovals || pendingApprovals.length === 0) &&
              (!userTasks || userTasks.length === 0) && (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium text-sm">
                    {t.allClear ?? "All clear! No pending items."}
                  </p>
                </div>
              )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// SECTION 4: OPERATIONAL MODULE SNAPSHOTS
// 5 modules (Procurement & Inventory removed, Grants → Projects)
// 3 per row; first 3 visible by default, "Find more" expands rest
// ============================================================
interface OperationalModuleSnapshotsProps {
  snapshots: ModuleSnapshots | undefined;
  inventoryAlerts: InventoryAlerts | undefined;
  isLoading: boolean;
  isRTL: boolean;
  t: orgDashboardTranslations;
  navigate: (path: string) => void;
}

function OperationalModuleSnapshots({
  snapshots,
  inventoryAlerts,
  isLoading,
  isRTL,
  t,
  navigate,
}: OperationalModuleSnapshotsProps) {
  const { language } = useLanguage();
  const lang = language; // Use actual language: 'en', 'ar', or 'it'
  const [expanded, setExpanded] = React.useState(false);

  const modules = [
    {
      title: t.humanResources,
      icon: Users,
      color: "indigo",
      route: "/organization/hr",
      metrics: [
        { label: t.totalEmployees, value: snapshots?.hr?.totalEmployees ?? 0 },
        { label: t.pendingLeave ?? "Pending Leave", value: snapshots?.hr?.pendingLeave ?? 0, urgent: (snapshots?.hr?.pendingLeave ?? 0) > 0 },
        { label: t.expiringContracts ?? "Expiring Contracts", value: snapshots?.hr?.expiringContracts ?? 0, urgent: (snapshots?.hr?.expiringContracts ?? 0) > 0 },
      ],
    },
    {
      title: t.financeManagement,
      icon: DollarSign,
      color: "emerald",
      route: "/organization/finance",
      metrics: [
        { label: t.pendingPayments ?? "Pending Payments", value: snapshots?.finance?.pendingPayments ?? 0, urgent: (snapshots?.finance?.pendingPayments ?? 0) > 0 },
        { label: t.budgetUtilization ?? "Budget Util.", value: `${snapshots?.finance?.budgetUtilization ?? 0}%` },
        { label: t.totalSpent ?? "Total Spent", value: formatCurrency(snapshots?.finance?.totalSpent ?? 0, "USD", lang) },
      ],
    },
    {
      title: t.logisticsProcurement,
      icon: Truck,
      color: "orange",
      route: "/organization/logistics",
      metrics: [
        { label: t.activeProcurements ?? "Active Procurements", value: snapshots?.logistics?.totalPRs ?? 0 },
        { label: t.pendingPRApprovals ?? "Pending Approval", value: snapshots?.logistics?.pendingPRs ?? 0, urgent: (snapshots?.logistics?.pendingPRs ?? 0) > 0 },
        { label: t.approved ?? "Approved PRs", value: snapshots?.logistics?.approvedPRs ?? 0 },
      ],
    },
    {
      title: t.projectsModule ?? "Projects",
      icon: FolderKanban,
      color: "teal",
      route: "/organization/projects",
      metrics: [
        { label: t.activeProjects, value: snapshots?.grants?.active ?? 0 },
        { label: t.totalProjects ?? "Total Projects", value: snapshots?.grants?.total ?? 0 },
        { label: t.expiringSoon ?? "Expiring Soon", value: snapshots?.grants?.expiringSoon ?? 0, urgent: (snapshots?.grants?.expiringSoon ?? 0) > 0 },
      ],
    },
    {
      title: t.meal,
      icon: Target,
      color: "pink",
      route: "/organization/meal",
      metrics: [
        { label: t.activeAssessments ?? "Active Assessments", value: snapshots?.meal?.activeSurveys ?? 0 },
        { label: t.dqasPending ?? "DQAs Pending", value: snapshots?.meal?.dqaFindings ?? 0, urgent: (snapshots?.meal?.dqaFindings ?? 0) > 0 },
        { label: t.indicatorsOverdue ?? "Indicators Overdue", value: snapshots?.meal?.indicatorsOverdue ?? 0, urgent: (snapshots?.meal?.indicatorsOverdue ?? 0) > 0 },
      ],
    },
    {
      title: t.riskCompliance ?? "Risk & Compliance",
      icon: ShieldAlert,
      color: "red",
      route: "/organization/risk-compliance",
      metrics: [
        { label: t.openRisks ?? "Open Risks", value: snapshots?.risks?.open ?? 0, urgent: (snapshots?.risks?.open ?? 0) > 0 },
        { label: t.criticalRisks ?? "Critical Risks", value: snapshots?.risks?.critical ?? 0, urgent: (snapshots?.risks?.critical ?? 0) > 0 },
        { label: t.openIncidents ?? "Open Incidents", value: snapshots?.risks?.openIncidents ?? 0, urgent: (snapshots?.risks?.openIncidents ?? 0) > 0 },
      ],
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; border: string; hover: string }> = {
    amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100", hover: "hover:border-amber-300" },
    indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-100", hover: "hover:border-indigo-300" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100", hover: "hover:border-emerald-300" },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100", hover: "hover:border-blue-300" },
    red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-100", hover: "hover:border-red-300" },
    pink: { bg: "bg-pink-50", icon: "text-pink-600", border: "border-pink-100", hover: "hover:border-pink-300" },
    teal: { bg: "bg-teal-50", icon: "text-teal-600", border: "border-teal-100", hover: "hover:border-teal-300" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-100", hover: "hover:border-orange-300" },
    slate: { bg: "bg-slate-50", icon: "text-slate-600", border: "border-slate-200", hover: "hover:border-slate-300" },
  };

  const visibleModules = expanded ? modules : modules.slice(0, 3);
  const hiddenCount = modules.length - 3;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-gray-900">
            {t.operationalModules ?? "Operational Modules"}
          </h2>
          <span className="text-xs text-gray-400">
            {t.operationalModulesDesc ?? "Live metrics across all system modules"}
          </span>
        </div>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
        >
          {expanded ? (
            <>
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              {t.showLess ?? "Show less"}
            </>
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
              {t.findMore ?? "Find more"}
              {hiddenCount > 0 && (
                <span className="ml-0.5 bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  +{hiddenCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleModules.map((mod) => {
          const Icon = mod.icon;
          const colors = colorMap[mod.color] ?? colorMap.slate;
          return (
            <Card
              key={mod.title}
              className={`border ${colors.border} ${colors.hover} transition-all hover:shadow-md cursor-pointer group`}
              onClick={() => navigate(mod.route)}
            >
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${colors.bg} rounded-md p-1.5`}>
                      <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
                    </div>
                    <CardTitle className="text-xs font-bold leading-tight">
                      {mod.title}
                    </CardTitle>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-3">
                {isLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {mod.metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className={`rounded-md p-1.5 ${
                          (metric as any).urgent ? "bg-red-50" : "bg-gray-50"
                        }`}
                      >
                        <p className="text-[9px] text-gray-500 font-medium leading-tight truncate">
                          {metric.label}
                        </p>
                        <p
                          className={`text-sm font-black mt-0.5 ${
                            (metric as any).urgent ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 5: CRITICAL ALERTS & BOTTLENECKS
// Restored — severity-sorted rows with clear indicators
// ============================================================
interface CriticalAlertsBottlenecksProps {
  bottlenecks: OperationalBottlenecks | undefined;
  isLoading: boolean;
  isRTL: boolean;
  t: orgDashboardTranslations;
  navigate: (path: string) => void;
}

function CriticalAlertsBottlenecks({
  bottlenecks,
  isLoading,
  isRTL,
  t,
  navigate,
}: CriticalAlertsBottlenecksProps) {
  type AlertItem = {
    id: string;
    type: string;
    title: string | null;
    subtitle: string;
    severity: "critical" | "high" | "medium";
    route: string;
  };
  const { language } = useLanguage();
  const lang = language; // Use actual language: 'en', 'ar', or 'it'
  const alerts: AlertItem[] = [];

  type OverdueProject = NonNullable<OperationalBottlenecks>["overdueProjects"][number];
  type StalledPR = NonNullable<OperationalBottlenecks>["stalledPRs"][number];
  type ExpiredGrant = NonNullable<OperationalBottlenecks>["expiredGrants"][number];
  type CriticalRisk = NonNullable<OperationalBottlenecks>["criticalRisks"][number];
  type OverduePayment = NonNullable<OperationalBottlenecks>["overduePayments"][number];

  (bottlenecks?.overdueProjects ?? []).forEach((p: OverdueProject) => {
    alerts.push({
      id: `proj-${p.id}`,
      type: t.overdueProject ?? "Overdue Project",
      title: p.titleEn || p.titleAr || "Untitled",
      subtitle: `${t.endDate ?? "End date"}: ${p.endDate} — ${p.progress ?? 0}% ${t.complete ?? "complete"}`,
      severity: "critical",
      route: "/organization/projects-list",
    });
  });

  (bottlenecks?.stalledPRs ?? []).forEach((pr: StalledPR) => {
    alerts.push({
      id: `pr-${pr.id}`,
      type: t.stalledPR ?? "Stalled PR",
      title: pr.prNumber,
      subtitle: `${pr.projectTitle ?? ""} — ${formatCurrency(Number(pr.total ?? 0), pr.currency ?? "USD", lang)}`,
      severity: "high",
      route: "/organization/logistics/my-prs",
    });
  });

  (bottlenecks?.expiredGrants ?? []).forEach((g: ExpiredGrant) => {
    alerts.push({
      id: `grant-${g.id}`,
      type: t.expiredGrant ?? "Expired Grant",
      title: g.title || g.titleAr || "Untitled",
      subtitle: `${t.donor ?? "Donor"}: ${g.donorName ?? "—"} — ${t.expired ?? "Expired"}: ${g.endDate}`,
      severity: "high",
      route: "/organization/grants",
    });
  });

  (bottlenecks?.criticalRisks ?? []).forEach((r: CriticalRisk) => {
    alerts.push({
      id: `risk-${r.id}`,
      type: t.criticalRisk ?? "Critical Risk",
      title: r.title,
      subtitle: `${t.category ?? "Category"}: ${r.category ?? "—"} — ${t.score ?? "Score"}: ${r.score ?? "—"}`,
      severity: "critical",
      route: "/organization/risk-compliance",
    });
  });

  (bottlenecks?.overduePayments ?? []).forEach((p: OverduePayment) => {
    alerts.push({
      id: `pay-${p.id}`,
      type: t.overduePayment ?? "Overdue Payment",
      title: p.paymentNumber ?? String(p.id),
      subtitle: `${t.payee ?? "Payee"}: ${p.payeeName ?? "—"} — ${formatCurrency(Number(p.amount ?? 0), "USD", lang)}`,
      severity: "medium",
      route: "/organization/finance/payments",
    });
  });

  const severityOrder = { critical: 0, high: 1, medium: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const severityConfig = {
    critical: {
      border: "border-l-red-500",
      badge: "bg-red-100 text-red-700",
      label: t.critical ?? "CRITICAL",
    },
    high: {
      border: "border-l-orange-500",
      badge: "bg-orange-100 text-orange-700",
      label: t.high ?? "HIGH",
    },
    medium: {
      border: "border-l-amber-500",
      badge: "bg-amber-100 text-amber-700",
      label: t.medium ?? "MEDIUM",
    },
  };

  return (
    <Card className="border-red-100 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <div>
              <CardTitle className="text-sm">
                {t.criticalAlertsBottlenecks ?? "Critical Alerts & Bottlenecks"}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.criticalAlertsDesc ?? "Operational issues requiring immediate attention"}
              </CardDescription>
            </div>
          </div>
          {alerts.length > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 font-bold text-xs">
              {alerts.length} {t.issues ?? "issues"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-1.5">
            {alerts.map((alert) => {
              const config = severityConfig[alert.severity];
              return (
                <button
                  key={alert.id}
                  onClick={() => navigate(alert.route)}
                  className={`w-full text-left p-2.5 rounded-lg border-l-4 ${config.border} bg-gray-50 hover:bg-gray-100 transition-colors`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.badge}`}>
                          {config.label}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate">{alert.title}</p>
                      <p className="text-[10px] text-gray-500 truncate">{alert.subtitle}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="font-medium text-sm">
              {t.noBottlenecks ?? "No critical bottlenecks detected"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t.operationsRunning ?? "All operations running smoothly"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// SECTION 6: RECENT ACTIVITY
// FIX: max 5 items initially, "View All" button, compact rows
// ============================================================
interface RecentActivitySectionProps {
  activity: RecentActivityItem[] | undefined;
  isLoading: boolean;
  isRTL: boolean;
  t: orgDashboardTranslations;
}

function RecentActivitySection({
  activity,
  isLoading,
  isRTL,
  t,
}: RecentActivitySectionProps) {
  const [showAll, setShowAll] = useState(false);

  const formatAction = (action: string, entityType: string): string => {
    const actionMap: Record<string, string> = {
      create: t.created ?? "created",
      update: t.updated ?? "updated",
      delete: t.deleted ?? "deleted",
      approve: t.approved ?? "approved",
      reject: t.rejected ?? "rejected",
      submit: t.submitted ?? "submitted",
    };
    const entityMap: Record<string, string> = {
      purchase_request: t.purchaseRequest ?? "purchase request",
      hr_leave_request: t.leaveRequest ?? "leave request",
      project: t.project ?? "project",
      grant: t.grant ?? "grant",
      payment: t.payment ?? "payment",
      vendor: t.vendor ?? "vendor",
      employee: t.employee ?? "employee",
      contract: t.contract ?? "contract",
    };
    return `${actionMap[action] ?? action} ${entityMap[entityType] ?? entityType}`;
  };

  const getInitials = (name: string): string =>
    name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0] ?? "")
      .join("")
      .toUpperCase();

  const avatarColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-purple-500",
    "bg-teal-500",
  ];

  const displayedActivity = showAll ? (activity ?? []) : (activity ?? []).slice(0, 5);

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-blue-600" />
            <div>
              <CardTitle className="text-sm">
                {t.recentActivity ?? "Recent Activity"}
              </CardTitle>
              <CardDescription className="text-xs">
                {t.recentActivityDesc ?? "Latest actions across the organization"}
              </CardDescription>
            </div>
          </div>
          {(activity?.length ?? 0) > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              {showAll ? (t.showLess ?? "Show Less") : (t.viewAll ?? "View All")}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="w-7 h-7 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedActivity.length > 0 ? (
          <div className="space-y-2">
            {displayedActivity.map((item, idx) => {
              const colorClass = avatarColors[idx % avatarColors.length];
              const initials = getInitials(item.userName ?? "?");
              return (
                <div key={item.id} className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full ${colorClass} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-900 leading-snug">
                      <span className="font-semibold">{item.userName}</span>{" "}
                      <span className="text-gray-600">
                        {formatAction(item.action, item.entityType)}
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">
              {t.noRecentActivity ?? "No recent activity"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// SECTION 6B: UPCOMING DEADLINES — Three-tab view
// Tab 1: Project Reports (from project_reporting_schedules)
// Tab 2: Project End Dates (from projects)
// Tab 3: Opportunities (from opportunities.applicationDeadline)
// ============================================================

type ReportingScheduleItem = {
  id: number;
  projectId: number | null;
  projectCode: string | null;
  projectTitle: string | null;
  projectTitleAr: string | null;
  reportType: string | null;
  reportTitle: string | null;
  reportTitleAr: string | null;
  dueDate: string;
  status: string | null;
  frequency: string | null;
};

type ProjectEndDateItem = {
  id: number;
  titleEn: string | null;
  titleAr: string | null;
  endDate: string;
};

type OpportunityItem = {
  id: number;
  donorName: string;
  donorType: string;
  interestArea: unknown;
  geographicAreas: string;
  applicationDeadline: string;
  allocatedBudget: string | null;
  currency: string;
  cfpLink: string | null;
  applicationLink: string | null;
};

interface UpcomingDeadlinesSectionProps {
  projectEndDates: ProjectEndDateItem[];
  projectEndDatesLoading: boolean;
  reportingSchedules: ReportingScheduleItem[];
  reportingSchedulesLoading: boolean;
  opportunities: OpportunityItem[];
  opportunitiesLoading: boolean;
  isRTL: boolean;
  t: orgDashboardTranslations;
  navigate: (path: string) => void;
}

function UpcomingDeadlinesSection({
  projectEndDates,
  projectEndDatesLoading,
  reportingSchedules,
  reportingSchedulesLoading,
  opportunities,
  opportunitiesLoading,
  isRTL,
  t,
  navigate,
}: UpcomingDeadlinesSectionProps) {
  const [activeTab, setActiveTab] = React.useState<'reports' | 'projects' | 'opportunities'>('reports');

  const getDaysRemaining = (dateStr: string): number =>
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const urgencyBadge = (days: number) => {
    if (days < 0) return { cls: "bg-red-100 text-red-700 border-red-200", label: t.overdue ?? "Overdue" };
    if (days === 0) return { cls: "bg-red-100 text-red-700 border-red-200", label: t.today ?? "Today" };
    if (days <= 7) return { cls: "bg-red-50 text-red-600 border-red-200", label: `${days}d` };
    if (days <= 14) return { cls: "bg-amber-50 text-amber-600 border-amber-200", label: `${days}d` };
    return { cls: "bg-blue-50 text-blue-600 border-blue-200", label: `${days}d` };
  };

  const statusBadgeClass = (status: string | null) => {
    switch (status) {
      case 'SUBMITTED_TO_DONOR': return "bg-green-100 text-green-700";
      case 'SUBMITTED_TO_HQ': return "bg-teal-100 text-teal-700";
      case 'UNDER_REVIEW': return "bg-purple-100 text-purple-700";
      case 'UNDER_PREPARATION': return "bg-blue-100 text-blue-700";
      case 'PLANNED': return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const formatStatus = (status: string | null) =>
    status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Pending';

  const formatReportType = (type: string | null) =>
    type ? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

  // Sort reports by deadline ascending
  const sortedReports = [...reportingSchedules]
    .filter(s => s.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  // Sort projects by endDate ascending
  const sortedProjects = [...projectEndDates]
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 10);

  // Sort opportunities by applicationDeadline ascending, filter not expired
  const sortedOpportunities = [...opportunities]
    .filter(o => o.applicationDeadline)
    .sort((a, b) => new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime())
    .slice(0, 10);

  const tabs = [
    { key: 'reports' as const, label: t.projectReports ?? 'Project Reports', count: sortedReports.length },
    { key: 'projects' as const, label: t.projectEndDates ?? 'Project End Dates', count: sortedProjects.length },
    { key: 'opportunities' as const, label: t.opportunities ?? 'Opportunities', count: sortedOpportunities.length },
  ];

  const isLoading = activeTab === 'reports' ? reportingSchedulesLoading
    : activeTab === 'projects' ? projectEndDatesLoading
    : opportunitiesLoading;

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-0 border-b border-gray-100">
        <div className="flex items-center gap-2.5 mb-3">
          <CalendarClock className="w-4 h-4 text-blue-600" />
          <div>
            <CardTitle className="text-sm">{t.upcomingDeadlines ?? "Upcoming Deadlines"}</CardTitle>
            <CardDescription className="text-xs">{t.upcomingDeadlinesDesc ?? "Next 90 days — reports, projects & opportunities"}</CardDescription>
          </div>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : activeTab === 'reports' ? (
          sortedReports.length > 0 ? (
            <div className="space-y-2">
              {sortedReports.map(s => {
                const days = getDaysRemaining(s.dueDate);
                const badge = urgencyBadge(days);
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate('/organization/reporting-schedule')}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {s.projectTitle || s.projectTitleAr || `Project #${s.projectId}`}
                          </span>
                          {s.projectCode && (
                            <span className="text-[10px] text-gray-400 font-mono">{s.projectCode}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-medium text-gray-600">
                            <FileText className="w-3 h-3 inline me-0.5" />
                            {formatReportType(s.reportType)}
                          </span>
                          {s.reportTitle && (
                            <span className="text-[10px] text-gray-400 truncate">{s.reportTitle}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-500">
                            {t.deadline ?? 'Deadline'}: {new Date(s.dueDate).toLocaleDateString()}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadgeClass(s.status)}`}>
                            {formatStatus(s.status)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">{t.noReportingSchedules ?? 'No reporting schedules found'}</p>
            </div>
          )
        ) : activeTab === 'projects' ? (
          sortedProjects.length > 0 ? (
            <div className="space-y-2">
              {sortedProjects.map(p => {
                const days = getDaysRemaining(p.endDate);
                const badge = urgencyBadge(days);
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate('/organization/projects-list')}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {p.titleEn || p.titleAr || `Project #${p.id}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-500">
                            {t.endDate ?? 'End Date'}: {new Date(p.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FolderKanban className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">{t.noExpiringProjects ?? 'No projects expiring soon'}</p>
            </div>
          )
        ) : (
          sortedOpportunities.length > 0 ? (
            <div className="space-y-2">
              {sortedOpportunities.map(o => {
                const days = getDaysRemaining(o.applicationDeadline);
                const badge = urgencyBadge(days);
                const areas = Array.isArray(o.interestArea) ? (o.interestArea as string[]).join(', ') : String(o.interestArea ?? '');
                return (
                  <button
                    key={o.id}
                    onClick={() => navigate('/organization/donor-crm')}
                    className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{o.donorName}</p>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{areas}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-500">
                            {t.applicationDeadline ?? 'Deadline'}: {new Date(o.applicationDeadline).toLocaleDateString()}
                          </span>
                          {o.allocatedBudget && (
                            <span className="text-[10px] text-gray-400">
                              · {o.currency} {Number(o.allocatedBudget).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Globe className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">{t.noOpportunities ?? 'No funding opportunities found'}</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// SECTION 7: MERGED SMART SHORTCUTS
// FIX: Quick Actions + Smart Shortcuts merged — 6 max, no duplicates
// ============================================================
interface MergedSmartShortcutsProps {
  isRTL: boolean;
  t: orgDashboardTranslations;
  navigate: (path: string) => void;
}

function MergedSmartShortcuts({ isRTL, t, navigate }: MergedSmartShortcutsProps) {
  const shortcuts = [
    {
      icon: Plus,
      label: t.newPR ?? "New PR",
      desc: t.newPRDesc ?? "Create purchase request",
      route: "/organization/logistics/purchase-requests/new",
      color: "amber",
    },
    {
      icon: ClipboardList,
      label: t.approvePRs ?? "Approve PRs",
      desc: t.approvePRsDesc ?? "Review pending purchase requests",
      route: "/organization/logistics/my-prs",
      color: "orange",
    },
    {
      icon: CalendarClock,
      label: t.requestLeave ?? "Leave Request",
      desc: t.requestLeaveDesc ?? "Submit or view leave requests",
      route: "/organization/hr/leave",
      color: "indigo",
    },
    {
      icon: FileBarChart2,
      label: t.reportsAnalytics ?? "Reports",
      desc: t.reportsAnalyticsDesc ?? "Operational reports and analytics",
      route: "/organization/reports",
      color: "blue",
    },
    {
      icon: FolderKanban,
      label: t.addProject ?? "Add Project",
      desc: t.addProjectDesc ?? "Create a new project",
      route: "/organization/projects-list",
      color: "emerald",
    },
    {
      icon: TrendingUp,
      label: t.programsDashboard ?? "Programs Dashboard",
      desc: t.programsDashboardDesc ?? "Portfolio analytics",
      route: "/organization/programs",
      color: "purple",
    },
  ];

  const colorMap: Record<string, { bg: string; icon: string; border: string; hover: string }> = {
    amber: { bg: "bg-amber-50", icon: "text-amber-600", border: "border-amber-100", hover: "hover:border-amber-300 hover:bg-amber-50/50" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", border: "border-orange-100", hover: "hover:border-orange-300 hover:bg-orange-50/50" },
    indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-100", hover: "hover:border-indigo-300 hover:bg-indigo-50/50" },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100", hover: "hover:border-blue-300 hover:bg-blue-50/50" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100", hover: "hover:border-emerald-300 hover:bg-emerald-50/50" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-100", hover: "hover:border-purple-300 hover:bg-purple-50/50" },
  };

  return (
    <Card className="border-gray-100 shadow-sm h-full">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-blue-600" />
          <div>
            <CardTitle className="text-sm">
              {t.smartShortcuts ?? "Smart Shortcuts"}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.smartShortcutsDesc ?? "Most-used actions and module shortcuts"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            const colors = colorMap[s.color];
            return (
              <button
                key={s.route}
                onClick={() => navigate(s.route)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 bg-white ${colors.border} ${colors.hover} transition-all hover:shadow-md group text-left`}
              >
                <div
                  className={`${colors.bg} rounded-lg p-2 flex-shrink-0 group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`w-4 h-4 ${colors.icon}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 leading-tight">
                    {s.label}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    {s.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// SECTION 8: HUMANITARIAN IDENTITY
// FIX: Compact chips panel — no large containers
// ============================================================
interface HumanitarianIdentitySectionProps {
  identity: HumanitarianIdentityData | undefined;
  isLoading: boolean;
  isRTL: boolean;
  t: orgDashboardTranslations;
}

function HumanitarianIdentitySection({
  identity,
  isLoading,
  isRTL,
  t,
}: HumanitarianIdentitySectionProps) {
  return (
    <Card className="border-gray-100 shadow-sm h-full">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <HandHeart className="w-4 h-4 text-rose-600" />
          <div>
            <CardTitle className="text-sm">
              {t.humanitarianIdentity ?? "Humanitarian Identity"}
            </CardTitle>
            <CardDescription className="text-xs">
              {t.humanitarianIdentityDesc ?? "Organization reach & footprint"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded" />
            ))}
          </div>
        ) : identity ? (
          <div className="space-y-3">
            {/* Beneficiaries + Donors — compact row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-100">
                <Heart className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {t.totalBeneficiaries ?? "Beneficiaries"}
                  </p>
                  <p className="text-sm font-black text-gray-900">
                    {Number(identity.totalBeneficiaries).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                <Building2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {t.activeDonors ?? "Donors"}
                  </p>
                  <p className="text-sm font-black text-gray-900">
                    {identity.activeDonors}
                  </p>
                </div>
              </div>
            </div>

            {/* Operating Country — shows actual country name(s) from the scoped OU */}
            <div className="flex items-start gap-2">
              <Globe className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {t.operatingCountry ?? "Operating Country"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(identity as any).countryNames?.length > 0
                    ? (identity as any).countryNames.map((c: string) => (
                        <Badge key={c} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                          {c}
                        </Badge>
                      ))
                    : identity.country
                    ? <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">{identity.country}</Badge>
                    : <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">{t.global ?? "Global"}</Badge>
                  }
                </div>
              </div>
            </div>

            {/* Sectors */}
            {identity.sectors?.length > 0 && (
              <div className="flex items-start gap-2">
                <Target className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {t.sectors ?? "Sectors"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {identity.sectors.slice(0, 6).map((s: string) => (
                      <Badge key={s} variant="outline" className="text-[10px] bg-gray-50 text-gray-700 border-gray-200">
                        {s}
                      </Badge>
                    ))}
                    {identity.sectors.length > 6 && (
                      <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-500">
                        +{identity.sectors.length - 6}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Governorates */}
            {identity.governorates?.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {t.governorates ?? "Governorates"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {identity.governorates.slice(0, 6).map((g: string) => (
                      <Badge key={g} variant="outline" className="text-[10px] bg-gray-50 text-gray-700 border-gray-200">
                        {g}
                      </Badge>
                    ))}
                    {identity.governorates.length > 6 && (
                      <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-500">
                        +{identity.governorates.length - 6}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">
            {t.noIdentityData ?? "No humanitarian identity data available"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// ERROR FALLBACK CARD
// ============================================================
interface ErrorFallbackCardProps {
  title: string;
  isRTL: boolean;
  t: any;
}

function ErrorFallbackCard({
  title,
  isRTL,
  t,
}: ErrorFallbackCardProps) {
  return (
    <Card dir={isRTL ? "rtl" : "ltr"}>
      <CardContent className="flex flex-col items-center justify-center py-6 text-center">
        <AlertCircle className="h-7 w-7 text-amber-500 mb-2" />
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="text-xs text-gray-500 mt-1">
          {t.failedToLoadSection ?? "Failed to load this section. Please try again later."}
        </p>
      </CardContent>
    </Card>
  );
}