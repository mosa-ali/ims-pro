/**
 * Contract Management Tab - Enhanced with 3-Row Financial Dashboard
 * Row 1: Financial Summary (Contract Value, Paid, Remaining, Retention Held)
 * Row 2: Financial Control (Timeline/Progress, Risk Indicator, Payment Schedule, Variation Tracking)
 * Row 3: Management Tools (6 sub-cards)
 */
import { useState, lazy, Suspense, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScrollText,
  Milestone,
  AlertTriangle,
  CalendarClock,
  ShieldCheck,
  ClipboardCheck,
  ArrowLeft,
  ArrowRight,
  DollarSign,
  TrendingDown,
  Wallet,
  BarChart3,
  Loader2,
  FileText,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Timer,
  TrendingUp,
  CircleDollarSign,
  Shield,
  Eye,
  Activity,
  AlertCircle,
  CircleCheck,
  CircleX,
  Gauge,
  Layers,
  FileCheck,
  FilePlus,
  Percent,
} from "lucide-react";

// Lazy load sub-card detail views
const ContractTab = lazy(() => import("./ContractTab"));
const PenaltiesSubCard = lazy(() => import("./PenaltiesSubCard"));
const PaymentScheduleSubCard = lazy(() => import("./PaymentScheduleSubCard"));
const RetentionSubCard = lazy(() => import("./RetentionSubCard"));
const ImplementationMonitoringSubCard = lazy(() => import("./ImplementationMonitoringSubCard"));

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  en: {
    contractManagement: "Contract Management",
    backToCards: "Back to Contract Management",
    // Row 1: Financial Summary
    financialSummary: "Financial Summary",
    contractValue: "Contract Value",
    totalPaid: "Total Paid",
    remainingBalance: "Remaining Balance",
    retentionHeld: "Retention Held",
    netPayable: "Net Payable",
    // Row 2: Financial Control
    financialControl: "Financial Control",
    contractTimeline: "Contract Timeline",
    startDate: "Start Date",
    endDate: "End Date",
    elapsedTime: "Elapsed Time",
    paymentProgress: "Payment Progress",
    milestonesCompleted: "Milestones Completed",
    daysRemaining: "Days Remaining",
    daysOverdue: "Days Overdue",
    riskIndicator: "Risk Indicator",
    riskLow: "Low",
    riskMedium: "Medium",
    riskHigh: "High",
    riskCritical: "Critical",
    paymentSchedule: "Payment Schedule",
    scheduleConfigured: "Schedule Configured",
    scheduleNotConfigured: "Not Configured",
    variationTracking: "Variation / Amendments",
    originalValue: "Original Value",
    approvedChanges: "Approved Changes",
    currentValue: "Current Value",
    noVariations: "No variations recorded",
    // Row 3: Management Tools
    managementTools: "Management Tools",
    contract: "Contract",
    milestones: "Milestones",
    penalties: "Penalties",
    paymentScheduleCard: "Payment Schedule",
    retention: "Retention Money",
    implementationMonitoring: "Implementation Monitoring",
    contractDesc: "View and manage the contract details, vendor, and approval status",
    milestonesDesc: "Define deliverables, BOQ items, and payment milestones",
    penaltiesDesc: "Manage delay, quality, and compliance penalties",
    paymentScheduleDesc: "Define advance, milestone, progress, and final payments",
    retentionDesc: "Configure retention percentage and release conditions",
    implementationMonitoringDesc: "Track deliverables, handovers, and site observations",
    // Status labels
    status: "Status",
    vendor: "Vendor",
    noContract: "No Contract Created",
    noContractDesc: "Create a contract first to access management features",
    notConfigured: "Not configured",
    items: "items",
    requiresApproval: "Requires approved contract",
    // Monitoring quick indicators
    checklistItems: "Checklist Items",
    openIssues: "Open Issues",
    deliverables: "Deliverables",
    // Document status
    documentStatus: "Document Status",
    signedContract: "Signed Contract",
    boq: "BOQ / Specifications",
    performanceGuarantee: "Performance Guarantee",
    insurance: "Insurance Certificate",
    // Vendor performance
    vendorPerformance: "Vendor Performance",
    quality: "Quality",
    delivery: "Delivery",
    compliance: "Compliance",
    notAvailable: "N/A",
    of: "of",
    paid: "Paid",
    pending: "Pending",
    overdue: "Overdue",
    advance: "Advance",
    milestone: "Milestone",
    progress: "Progress",
    final: "Final",
  },
  ar: {
    contractManagement: "إدارة العقد",
    backToCards: "العودة إلى إدارة العقد",
    // Row 1: Financial Summary
    financialSummary: "الملخص المالي",
    contractValue: "قيمة العقد",
    totalPaid: "إجمالي المدفوع",
    remainingBalance: "الرصيد المتبقي",
    retentionHeld: "الاحتجاز المحتفظ",
    netPayable: "صافي المستحق",
    // Row 2: Financial Control
    financialControl: "الرقابة المالية",
    contractTimeline: "الجدول الزمني للعقد",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    elapsedTime: "الوقت المنقضي",
    paymentProgress: "تقدم الدفعات",
    milestonesCompleted: "المراحل المكتملة",
    daysRemaining: "الأيام المتبقية",
    daysOverdue: "أيام التأخير",
    riskIndicator: "مؤشر المخاطر",
    riskLow: "منخفض",
    riskMedium: "متوسط",
    riskHigh: "مرتفع",
    riskCritical: "حرج",
    paymentSchedule: "جدول الدفعات",
    scheduleConfigured: "الجدول مكوّن",
    scheduleNotConfigured: "غير مكوّن",
    variationTracking: "التعديلات / الملاحق",
    originalValue: "القيمة الأصلية",
    approvedChanges: "التعديلات المعتمدة",
    currentValue: "القيمة الحالية",
    noVariations: "لا توجد تعديلات مسجلة",
    // Row 3: Management Tools
    managementTools: "أدوات الإدارة",
    contract: "العقد",
    milestones: "المراحل والمخرجات",
    penalties: "الغرامات",
    paymentScheduleCard: "جدول الدفعات",
    retention: "أموال الاحتجاز",
    implementationMonitoring: "متابعة التنفيذ",
    contractDesc: "عرض وإدارة تفاصيل العقد والمورد وحالة الاعتماد",
    milestonesDesc: "تحديد المخرجات وجدول الكميات ومراحل الدفع",
    penaltiesDesc: "إدارة غرامات التأخير والجودة والامتثال",
    paymentScheduleDesc: "تحديد الدفعات المقدمة والمرحلية والتقدمية والنهائية",
    retentionDesc: "تكوين نسبة الاحتجاز وشروط الإفراج",
    implementationMonitoringDesc: "متابعة المخرجات والتسليم والملاحظات الميدانية",
    // Status labels
    status: "الحالة",
    vendor: "المورد",
    noContract: "لم يتم إنشاء عقد",
    noContractDesc: "قم بإنشاء عقد أولاً للوصول إلى ميزات الإدارة",
    notConfigured: "غير مكوّن",
    items: "عناصر",
    requiresApproval: "يتطلب اعتماد العقد",
    // Monitoring quick indicators
    checklistItems: "عناصر القائمة",
    openIssues: "مشاكل مفتوحة",
    deliverables: "المخرجات",
    // Document status
    documentStatus: "حالة المستندات",
    signedContract: "العقد الموقع",
    boq: "جدول الكميات / المواصفات",
    performanceGuarantee: "ضمان الأداء",
    insurance: "شهادة التأمين",
    // Vendor performance
    vendorPerformance: "أداء المورد",
    quality: "الجودة",
    delivery: "التسليم",
    compliance: "الامتثال",
    notAvailable: "غ/م",
    of: "من",
    paid: "مدفوع",
    pending: "معلق",
    overdue: "متأخر",
    advance: "مقدمة",
    milestone: "مرحلية",
    progress: "تقدمية",
    final: "نهائية",
  },
};

// ============================================================================
// TYPES
// ============================================================================
type SubCard = "contract" | "milestones" | "penalties" | "payment-schedule" | "retention" | "implementation-monitoring";

interface ContractManagementTabProps {
  purchaseRequestId: number;
  prNumber?: string;
  onBack?: () => void;
}

// ============================================================================
// HELPER: Format money
// ============================================================================
function formatMoney(val: number, currency: string = "USD") {  return `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// HELPER: Format date
// ============================================================================
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "-";
  }
}

// ============================================================================
// HELPER: Risk level calculation
// ============================================================================
function calculateRiskLevel(dashboard: any): {
  level: "low" | "medium" | "high" | "critical";
  score: number;
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  if (!dashboard) return { level: "low", score: 0, factors: [] };

  const contractValue = dashboard.financials?.contractValue || 0;

  // Penalty risk (0-30 points)
  const penaltyPct = contractValue > 0 ? (dashboard.penaltySummary?.totalApplied / contractValue) * 100 : 0;
  if (penaltyPct > 5) { score += 30; factors.push("Penalties > 5%"); }
  else if (penaltyPct > 2) { score += 15; factors.push("Penalties > 2%"); }
  else if (penaltyPct > 0) { score += 5; factors.push("Active penalties"); }

  // Payment delay risk (0-25 points)
  const overdueCount = dashboard.paymentProgress?.scheduleEntries?.filter((e: any) => e.status === "overdue").length || 0;
  if (overdueCount > 2) { score += 25; factors.push("Multiple overdue payments"); }
  else if (overdueCount > 0) { score += 12; factors.push("Overdue payment(s)"); }

  // Timeline risk (0-25 points)
  if (dashboard.contractSummary?.endDate) {
    const daysRemaining = Math.ceil((new Date(dashboard.contractSummary.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) { score += 25; factors.push("Contract expired"); }
    else if (daysRemaining < 15) { score += 15; factors.push("Expiring soon"); }
    else if (daysRemaining < 30) { score += 8; factors.push("< 30 days remaining"); }
  }

  // Milestone risk (0-20 points)
  const milestoneTotal = dashboard.milestonesSummary?.total || 0;
  const milestoneCompleted = dashboard.milestonesSummary?.completed || 0;
  if (milestoneTotal > 0) {
    const completionRate = milestoneCompleted / milestoneTotal;
    if (completionRate < 0.3 && milestoneTotal > 2) { score += 20; factors.push("Low milestone completion"); }
    else if (completionRate < 0.5) { score += 10; factors.push("Milestones behind schedule"); }
  }

  // Open issues risk
  const openIssues = dashboard.monitoringSummary?.observations?.open || 0;
  if (openIssues > 3) { score += 10; factors.push("Multiple open issues"); }
  else if (openIssues > 0) { score += 5; factors.push("Open issues"); }

  let level: "low" | "medium" | "high" | "critical" = "low";
  if (score >= 60) level = "critical";
  else if (score >= 35) level = "high";
  else if (score >= 15) level = "medium";

  return { level, score, factors };
}

// ============================================================================
// ROW 1: FINANCIAL SUMMARY
// ============================================================================
function FinancialSummaryRow({
  dashboard,
  t,
  isRTL,
}: {
  dashboard: any;
  t: typeof translations.en;
  isRTL: boolean;
}) {
  const currency = dashboard?.contractSummary?.currency || "USD";
  const contractValue = dashboard?.financials?.contractValue || 0;
  const totalPaid = dashboard?.financials?.totalPaid || 0;
  const remaining = dashboard?.financials?.remainingPayable || 0;
  const retentionHeld = dashboard?.retentionSummary?.balance || 0;
  const netPayable = dashboard?.financials?.netPayable || 0;
  const totalPenalties = dashboard?.penaltySummary?.totalApplied || 0;

  const paymentPct = contractValue > 0 ? Math.round((totalPaid / contractValue) * 100) : 0;

  const cards = [
    {
      label: t.contractValue,
      value: formatMoney(contractValue, currency),
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-500",
      sub: `${dashboard?.contractSummary?.vendorName || "-"}`,
    },
    {
      label: t.totalPaid,
      value: formatMoney(totalPaid, currency),
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-500",
      sub: `${paymentPct}% ${t.of} ${t.contractValue.toLowerCase()}`,
    },
    {
      label: t.remainingBalance,
      value: formatMoney(remaining > 0 ? remaining : 0, currency),
      icon: Wallet,
      color: remaining > 0 ? "text-amber-600" : "text-green-600",
      bgColor: remaining > 0 ? "bg-amber-50" : "bg-green-50",
      borderColor: remaining > 0 ? "border-amber-500" : "border-green-500",
      sub: totalPenalties > 0 ? `${t.penalties}: ${formatMoney(totalPenalties, currency)}` : "",
    },
    {
      label: t.retentionHeld,
      value: formatMoney(retentionHeld, currency),
      icon: Shield,
      color: retentionHeld > 0 ? "text-purple-600" : "text-gray-400",
      bgColor: retentionHeld > 0 ? "bg-purple-50" : "bg-gray-50",
      borderColor: retentionHeld > 0 ? "border-purple-500" : "border-gray-300",
      sub: dashboard?.retentionSummary?.percentage > 0
        ? `${dashboard.retentionSummary.percentage}%`
        : t.notConfigured,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">{t.financialSummary}</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className={`border-s-4 ${card.borderColor}`}>
              <CardContent className="pt-3 pb-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-md ${card.bgColor}`}>
                    <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{card.value}</p>
                {card.sub && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{card.sub}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ROW 2: FINANCIAL CONTROL
// ============================================================================
function FinancialControlRow({
  dashboard,
  t,
  isRTL,
}: {
  dashboard: any;
  t: typeof translations.en;
  isRTL: boolean;
}) {
  const risk = useMemo(() => calculateRiskLevel(dashboard), [dashboard]);
  const currency = dashboard?.contractSummary?.currency || "USD";

  // Timeline calculations
  const startDate = dashboard?.contractSummary?.startDate;
  const endDate = dashboard?.contractSummary?.endDate;
  let elapsedPct = 0;
  let daysRemaining = 0;
  let totalDays = 0;

  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const elapsed = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
    elapsedPct = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100))) : 0;
    daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }

  // Payment progress
  const contractValue = dashboard?.financials?.contractValue || 0;
  const totalPaid = dashboard?.financials?.totalPaid || 0;
  const paymentPct = contractValue > 0 ? Math.round((totalPaid / contractValue) * 100) : 0;
  const milestonesDone = dashboard?.milestonesSummary?.completed || 0;
  const milestonesTotal = dashboard?.milestonesSummary?.total || 0;

  // Payment schedule breakdown
  const scheduleEntries = dashboard?.paymentProgress?.scheduleEntries || [];
  const hasSchedule = scheduleEntries.length > 0;

  // Risk color mapping
  const riskColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-500", badge: "bg-green-100 text-green-700" },
    medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-500", badge: "bg-amber-100 text-amber-700" },
    high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-500", badge: "bg-orange-100 text-orange-700" },
    critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-500", badge: "bg-red-100 text-red-700" },
  };
  const rc = riskColors[risk.level];
  const riskLabel = t[`risk${risk.level.charAt(0).toUpperCase() + risk.level.slice(1)}` as keyof typeof t] || risk.level;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">{t.financialControl}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Contract Timeline */}
        <Card className="border-s-4 border-sky-500">
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-sky-50">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t.contractTimeline}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.elapsedTime}</span>
                <span className="font-semibold">{elapsedPct}%</span>
              </div>
              <Progress value={elapsedPct} className="h-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatDate(startDate)}</span>
                <span>{formatDate(endDate)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs mt-1">
                <Timer className="w-3 h-3" />
                {daysRemaining >= 0 ? (
                  <span className={daysRemaining < 30 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                    {daysRemaining} {t.daysRemaining}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    {Math.abs(daysRemaining)} {t.daysOverdue}
                  </span>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>{t.paymentProgress}: {paymentPct}%</span>
                <span>{t.milestonesCompleted}: {milestonesDone}/{milestonesTotal}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Indicator */}
        <Card className={`border-s-4 ${rc.border}`}>
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${rc.bg}`}>
                <Gauge className={`w-3.5 h-3.5 ${rc.text}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t.riskIndicator}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${rc.badge} text-xs px-2 py-0.5`}>
                {riskLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">({risk.score}/100)</span>
            </div>
            {risk.factors.length > 0 ? (
              <div className="space-y-1">
                {risk.factors.slice(0, 4).map((factor, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <AlertCircle className={`w-3 h-3 shrink-0 ${risk.level === "critical" || risk.level === "high" ? "text-red-500" : "text-amber-500"}`} />
                    <span className="text-muted-foreground">{factor}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <CircleCheck className="w-3 h-3" />
                <span>{isRTL ? "لا توجد مخاطر" : "No risk factors"}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Schedule */}
        <Card className="border-s-4 border-emerald-500">
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-emerald-50">
                <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t.paymentSchedule}</span>
            </div>
            {hasSchedule ? (
              <div className="space-y-1.5">
                {scheduleEntries.slice(0, 4).map((entry: any, i: number) => {
                  const statusColors: Record<string, string> = {
                    paid: "text-green-600",
                    invoiced: "text-blue-600",
                    approved: "text-sky-600",
                    pending: "text-gray-500",
                    overdue: "text-red-600",
                  };
                  const statusIcons: Record<string, any> = {
                    paid: CheckCircle2,
                    invoiced: FileCheck,
                    approved: CircleCheck,
                    pending: Clock,
                    overdue: AlertCircle,
                  };
                  const StatusIcon = statusIcons[entry.status] || Clock;
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`w-3 h-3 ${statusColors[entry.status] || "text-gray-400"}`} />
                        <span className="text-muted-foreground truncate max-w-[100px]">
                          {entry.description || entry.paymentType}
                        </span>
                      </div>
                      <span className="font-medium">{entry.percentage}%</span>
                    </div>
                  );
                })}
                {scheduleEntries.length > 4 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{scheduleEntries.length - 4} {isRTL ? "أخرى" : "more"}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 py-2">
                <Info className="w-3 h-3" />
                <span>{t.scheduleNotConfigured}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variation / Amendment Tracking */}
        <Card className="border-s-4 border-violet-500">
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-violet-50">
                <Layers className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t.variationTracking}</span>
              {(dashboard?.variationSummary?.total || 0) > 0 && (
                <Badge className="text-xs bg-violet-100 text-violet-700">
                  {dashboard.variationSummary.approved} {isRTL ? 'معتمد' : 'approved'}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.originalValue}</span>
                <span className="font-medium">
                  {formatMoney(dashboard?.variationSummary?.originalContractValue || dashboard?.financials?.contractValue || 0, currency)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t.approvedChanges}</span>
                <span className={`font-medium ${(dashboard?.variationSummary?.totalVariationAmount || 0) !== 0 ? (dashboard.variationSummary.totalVariationAmount > 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                  {(dashboard?.variationSummary?.totalVariationAmount || 0) > 0 ? '+' : ''}
                  {formatMoney(dashboard?.variationSummary?.totalVariationAmount || 0, currency)}
                </span>
              </div>
              <div className="border-t pt-1.5 flex justify-between text-xs">
                <span className="font-medium">{t.currentValue}</span>
                <span className="font-bold text-foreground">
                  {formatMoney(dashboard?.variationSummary?.currentContractValue || dashboard?.financials?.contractValue || 0, currency)}
                </span>
              </div>
              {(dashboard?.variationSummary?.total || 0) === 0 && (
                <p className="text-xs text-muted-foreground/60 italic">{t.noVariations}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2b: Document Status & Vendor Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Document Status Card */}
        <Card className="border-s-4 border-cyan-500">
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-cyan-50">
                <FileCheck className="w-3.5 h-3.5 text-cyan-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t.documentStatus}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t.signedContract, done: dashboard?.documentStatus?.signedContract },
                { label: t.boq, done: dashboard?.documentStatus?.boq },
                { label: t.performanceGuarantee, done: dashboard?.documentStatus?.performanceGuarantee },
                { label: t.insurance, done: dashboard?.documentStatus?.insurance },
              ].map((doc, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  {doc.done ? (
                    <CircleCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  ) : (
                    <CircleX className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  )}
                  <span className={doc.done ? 'text-foreground' : 'text-muted-foreground/60'}>{doc.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vendor Performance Card */}
        <Card className="border-s-4 border-rose-500">
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-rose-50">
                <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{t.vendorPerformance}</span>
              {dashboard?.vendorPerformance && (
                <Badge className={`text-xs ${
                  dashboard.vendorPerformance.overall >= 7 ? 'bg-green-100 text-green-700' :
                  dashboard.vendorPerformance.overall >= 5 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {dashboard.vendorPerformance.overall}/10
                </Badge>
              )}
            </div>
            {dashboard?.vendorPerformance ? (
              <div className="space-y-2">
                {[
                  { label: t.quality, score: dashboard.vendorPerformance.quality },
                  { label: t.delivery, score: dashboard.vendorPerformance.delivery },
                  { label: t.compliance, score: dashboard.vendorPerformance.compliance },
                ].map((item, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.score}/10</span>
                    </div>
                    <Progress value={item.score * 10} className="h-1" />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground/60 pt-1">
                  {isRTL ? `${dashboard.vendorPerformance.evaluationCount} تقييمات` : `${dashboard.vendorPerformance.evaluationCount} evaluation(s)`}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 py-2">
                <Info className="w-3 h-3" />
                <span>{isRTL ? 'لا توجد تقييمات بعد' : 'No evaluations yet'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ContractManagementTab({ purchaseRequestId, prNumber, onBack }: ContractManagementTabProps) {
  const { language } = useLanguage();
  const isRTL = language === "ar";
  const t = translations[language as keyof typeof translations] || translations.en;
  const [activeSubCard, setActiveSubCard] = useState<SubCard | null>(null);

  // Fetch contract for this PR
  const { data: contractData, isLoading: contractLoading } = trpc.procurementPhaseA.contracts.getByPR.useQuery(
    { purchaseRequestId },
    { enabled: purchaseRequestId > 0 }
  );

  // Fetch milestones count
  const { data: milestones } = trpc.procurementPhaseA.contracts.getMilestones.useQuery(
    { contractId: contractData?.id || 0 },
    { enabled: !!contractData?.id }
  );

  // Fetch financial dashboard
  const { data: dashboard, isLoading: dashboardLoading } = trpc.procurementPhaseA.contractFinancialDashboard.getDashboard.useQuery(
    { contractId: contractData?.id || 0 },
    { enabled: !!contractData?.id && (contractData?.id || 0) > 0 }
  );

  const contractId = contractData?.id || 0;
  const contractApproved = contractData?.status === "approved" || contractData?.status === "active";

  // Sub-cards configuration
  const subCards: Array<{
    id: SubCard;
    title: string;
    description: string;
    icon: any;
    color: string;
    borderColor: string;
    enabled: boolean;
    count?: number;
    statusLabel?: string;
    statusColor?: string;
    quickIndicators?: Array<{ label: string; value: string | number; color?: string }>;
  }> = [
    {
      id: "contract",
      title: t.contract,
      description: t.contractDesc,
      icon: ScrollText,
      color: "text-blue-600",
      borderColor: "border-s-blue-500",
      enabled: true,
      statusLabel: contractData
        ? contractApproved
          ? isRTL ? "معتمد" : "Approved"
          : isRTL ? "مسودة" : "Draft"
        : isRTL ? "غير منشأ" : "Not Created",
      statusColor: contractData
        ? contractApproved ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-600",
    },
    {
      id: "milestones",
      title: t.milestones,
      description: t.milestonesDesc,
      icon: Milestone,
      color: "text-indigo-600",
      borderColor: "border-s-indigo-500",
      enabled: !!contractData,
      count: milestones?.length || 0,
      statusLabel: milestones && milestones.length > 0
        ? `${milestones.length} ${t.items}`
        : t.notConfigured,
      statusColor: milestones && milestones.length > 0 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600",
    },
    {
      id: "penalties",
      title: t.penalties,
      description: t.penaltiesDesc,
      icon: AlertTriangle,
      color: "text-orange-600",
      borderColor: "border-s-orange-500",
      enabled: contractApproved,
      statusLabel: dashboard?.penaltySummary?.count && dashboard.penaltySummary.count > 0
        ? `${dashboard.penaltySummary.count} ${t.items}`
        : t.notConfigured,
      statusColor: dashboard?.penaltySummary?.appliedCount && dashboard.penaltySummary.appliedCount > 0
        ? "bg-orange-100 text-orange-700"
        : "bg-gray-100 text-gray-600",
    },
    {
      id: "payment-schedule",
      title: t.paymentScheduleCard,
      description: t.paymentScheduleDesc,
      icon: CalendarClock,
      color: "text-green-600",
      borderColor: "border-s-green-500",
      enabled: !!contractData,
      statusLabel: dashboard?.paymentProgress?.scheduleEntries?.length > 0
        ? `${dashboard.paymentProgress.scheduleEntries.length} ${t.items}`
        : t.notConfigured,
      statusColor: dashboard?.paymentProgress?.scheduleEntries?.length > 0
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-gray-600",
    },
    {
      id: "retention",
      title: t.retention,
      description: t.retentionDesc,
      icon: ShieldCheck,
      color: "text-purple-600",
      borderColor: "border-s-purple-500",
      enabled: !!contractData,
      statusLabel: dashboard?.retentionSummary?.enabled
        ? `${dashboard.retentionSummary.percentage}%`
        : t.notConfigured,
      statusColor: dashboard?.retentionSummary?.enabled
        ? "bg-purple-100 text-purple-700"
        : "bg-gray-100 text-gray-600",
    },
    {
      id: "implementation-monitoring",
      title: t.implementationMonitoring,
      description: t.implementationMonitoringDesc,
      icon: ClipboardCheck,
      color: "text-teal-600",
      borderColor: "border-s-teal-500",
      enabled: contractApproved,
      statusLabel: dashboard?.monitoringSummary?.initialized
        ? `${dashboard.monitoringSummary.progress}%`
        : t.notConfigured,
      statusColor: dashboard?.monitoringSummary?.initialized
        ? "bg-teal-100 text-teal-700"
        : "bg-gray-100 text-gray-600",
      quickIndicators: dashboard?.monitoringSummary?.initialized ? [
        { label: t.checklistItems, value: `${dashboard.monitoringSummary.checklist.completed}/${dashboard.monitoringSummary.checklist.total}` },
        { label: t.openIssues, value: dashboard.monitoringSummary.observations.open, color: dashboard.monitoringSummary.observations.open > 0 ? "text-red-600" : undefined },
      ] : undefined,
    },
  ];

  // Loading state
  if (contractLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // If a sub-card is active, show its detail view
  if (activeSubCard) {
    const BackArrow = isRTL ? ArrowRight : ArrowLeft;
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveSubCard(null)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <BackArrow className="w-4 h-4" />
          {t.backToCards}
        </Button>

        <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
          {activeSubCard === "contract" && (
            <ContractTab purchaseRequestId={purchaseRequestId} prNumber={prNumber} />
          )}
          {activeSubCard === "milestones" && (
            <ContractTab purchaseRequestId={purchaseRequestId} prNumber={prNumber} />
          )}
          {activeSubCard === "penalties" && contractId > 0 && (
            <PenaltiesSubCard contractId={contractId} purchaseRequestId={purchaseRequestId} />
          )}
          {activeSubCard === "payment-schedule" && contractId > 0 && (
            <PaymentScheduleSubCard contractId={contractId} purchaseRequestId={purchaseRequestId} />
          )}
          {activeSubCard === "retention" && contractId > 0 && (
            <RetentionSubCard contractId={contractId} purchaseRequestId={purchaseRequestId} />
          )}
          {activeSubCard === "implementation-monitoring" && contractId > 0 && (
            <ImplementationMonitoringSubCard contractId={contractId} purchaseRequestId={purchaseRequestId} />
          )}
        </Suspense>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="space-y-6">
      {/* Back to Workspace Dashboard */}
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isRTL ? 'العودة إلى لوحة مساحة العمل' : 'Back to Workspace Dashboard'}
        </Button>
      )}
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">{t.contractManagement}</h2>
          {prNumber && (
            <p className="text-sm text-muted-foreground">{prNumber}</p>
          )}
        </div>
      </div>

      {/* No contract message */}
      {!contractData && (
        <Card className="border-dashed border-2">
          <CardContent className="py-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">{t.noContract}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t.noContractDesc}</p>
          </CardContent>
        </Card>
      )}

      {/* ROW 1: Financial Summary */}
      {contractData && dashboard && (
        <FinancialSummaryRow dashboard={dashboard} t={t} isRTL={isRTL} />
      )}

      {/* ROW 2: Financial Control */}
      {contractData && dashboard && (
        <FinancialControlRow dashboard={dashboard} t={t} isRTL={isRTL} />
      )}

      {/* ROW 3: Management Tools (Sub-cards Grid) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">{t.managementTools}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {subCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.id}
                className={`cursor-pointer transition-all duration-200 border-s-4 ${card.borderColor} ${
                  card.enabled
                    ? "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    : "opacity-50 cursor-not-allowed"
                }`}
                onClick={() => card.enabled && setActiveSubCard(card.id)}
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg bg-muted/50 ${card.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-sm">{card.title}</h3>
                    </div>
                    {card.statusLabel && (
                      <Badge className={`text-xs ${card.statusColor}`}>
                        {card.statusLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    {card.description}
                  </p>
                  {/* Quick indicators for monitoring */}
                  {card.quickIndicators && (
                    <div className="flex gap-3 pt-2 border-t">
                      {card.quickIndicators.map((ind, i) => (
                        <div key={i} className="text-xs">
                          <span className="text-muted-foreground">{ind.label}: </span>
                          <span className={`font-medium ${ind.color || ""}`}>{ind.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!card.enabled && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/60">
                      <Info className="w-3 h-3" />
                      <span>{t.requiresApproval}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
