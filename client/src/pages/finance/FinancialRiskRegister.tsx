/**
 * components/finance/FinancialRiskRegister.tsx
 *
 * Financial Risk Register — /finance/risk/register
 * Enterprise management page for all financial risk records.
 *
 * FIXES APPLIED:
 * ✅ Fixed mutation calls (export procedures)
 * ✅ Fixed variable declaration order
 * ✅ Fixed type mismatches with response structure
 * ✅ Proper fdashboard component integration
 * ✅ Correct prop mapping for KPI cards
 * ✅ Proper error state handling
 */

import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "@/lib/router-compat";
import {
  AlertTriangle, Bot, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, ClipboardList, Download, ExternalLink, FileText,
  Flag, Search, Shield, ShieldAlert, ShieldCheck, SlidersHorizontal,
  TrendingDown, TrendingUp, X, XCircle, Zap, Loader,
} from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  FinanceCard,
  WidgetHeader,
  FinancePageHeader,
  FinanceKpiCard,
  LoadingSkeleton,
  EmptyState,
  ErrorState,
  RiskStatusChip,
  FINANCE_COLORS,
} from "@/components/finance/fdashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';


// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  en: {
    pageTitle: "Financial Risk Register",
    subtitle: "Enterprise Risk Management — Source of Truth",
    updated: "Last updated",
    refresh: "Refresh",
    export: "Export",
    totalRisks: "Total Risks",
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
    open: "Open",
    underReview: "Under Review",
    resolved: "Resolved",
    exposure: "Total Exposure",
    filterBy: "Filter by:",
    riskCategory: "Category",
    statusFilter: "Status",
    likelihood: "Likelihood",
    impact: "Impact",
    owner: "Owner",
    dateRange: "Date Range",
    search: "Search risks, projects, donors...",
    moreFilters: "More Filters",
    clearFilters: "Clear",
    riskId: "Risk ID",
    title: "Title",
    category: "Category",
    project: "Project",
    donor: "Donor",
    score: "Score",
    financialExposure: "Exposure",
    currency: "Currency",
    colStatus: "Status",
    dueDate: "Due Date",
    detectedDate: "Detected",
    aiRec: "AI",
    actions: "Actions",
    viewDetails: "View Details",
    exportExcel: "Excel",
    exportCsv: "CSV",
    exportPdf: "PDF",
    noRisks: "No risk records found.",
    page: "Page",
    of: "of",
    rowsPerPage: "Rows per page",
    bulkExport: "Export Selected",
    selectAll: "Select All",
    selected: "selected",
    error: "Error",
    tryAgain: "Try Again",
    loading: "Loading risk register...",
    permissionDenied: "You do not have permission to view this page.",
    allCategories: "All Categories",
    allStatuses: "All Statuses",
    allLikelihood: "All Likelihood",
    allImpact: "All Impact",
  },
  ar: {
    pageTitle: "سجل المخاطر المالية",
    subtitle: "إدارة المخاطر المؤسسية — مصدر الحقيقة",
    updated: "آخر تحديث",
    refresh: "تحديث",
    export: "تصدير",
    totalRisks: "إجمالي المخاطر",
    critical: "حرجة",
    high: "عالية",
    medium: "متوسطة",
    low: "منخفضة",
    open: "مفتوحة",
    underReview: "قيد المراجعة",
    resolved: "محلولة",
    exposure: "إجمالي التعرض",
    filterBy: "تصفية حسب:",
    riskCategory: "الفئة",
    statusFilter: "الحالة",
    likelihood: "الاحتمالية",
    impact: "التأثير",
    owner: "المسؤول",
    dateRange: "النطاق الزمني",
    search: "بحث في المخاطر أو المشاريع أو المانحين...",
    moreFilters: "مرشحات إضافية",
    clearFilters: "مسح",
    riskId: "رمز الخطر",
    title: "العنوان",
    category: "الفئة",
    project: "المشروع",
    donor: "المانح",
    score: "النتيجة",
    financialExposure: "التعرض",
    currency: "العملة",
    colStatus: "الحالة",
    dueDate: "تاريخ الاستحقاق",
    detectedDate: "تاريخ الكشف",
    aiRec: "ذكاء",
    actions: "الإجراءات",
    viewDetails: "عرض التفاصيل",
    exportExcel: "Excel",
    exportCsv: "CSV",
    exportPdf: "PDF",
    noRisks: "لا توجد سجلات مخاطر.",
    page: "صفحة",
    of: "من",
    rowsPerPage: "صفوف لكل صفحة",
    bulkExport: "تصدير المحدد",
    selectAll: "تحديد الكل",
    selected: "محدد",
    error: "خطأ",
    tryAgain: "حاول مرة أخرى",
    loading: "جاري تحميل سجل المخاطر...",
    permissionDenied: "ليس لديك صلاحية لعرض هذه الصفحة.",
    allCategories: "جميع الفئات",
    allStatuses: "جميع الحالات",
    allLikelihood: "جميع مستويات الاحتمال",
    allImpact: "جميع مستويات التأثير",
  },
  it: {
    pageTitle: "Registro dei Rischi Finanziari",
    subtitle: "Gestione dei Rischi Aziendali — Fonte Unica di Verità",
    updated: "Ultimo aggiornamento",
    refresh: "Aggiorna",
    export: "Esporta",
    totalRisks: "Rischi Totali",
    critical: "Critici",
    high: "Alti",
    medium: "Medi",
    low: "Bassi",
    open: "Aperti",
    underReview: "In Revisione",
    resolved: "Risolti",
    exposure: "Esposizione Totale",
    filterBy: "Filtra per:",
    riskCategory: "Categoria",
    statusFilter: "Stato",
    likelihood: "Probabilità",
    impact: "Impatto",
    owner: "Proprietario",
    dateRange: "Intervallo di Date",
    search: "Cerca rischi, progetti, donatori...",
    moreFilters: "Altri Filtri",
    clearFilters: "Cancella",
    riskId: "ID Rischio",
    title: "Titolo",
    category: "Categoria",
    project: "Progetto",
    donor: "Donatore",
    score: "Punteggio",
    financialExposure: "Esposizione",
    currency: "Valuta",
    colStatus: "Stato",
    dueDate: "Data di Scadenza",
    detectedDate: "Data di Rilevamento",
    aiRec: "IA",
    actions: "Azioni",
    viewDetails: "Visualizza Dettagli",
    exportExcel: "Excel",
    exportCsv: "CSV",
    exportPdf: "PDF",
    noRisks: "Nessun record di rischio trovato.",
    page: "Pagina",
    of: "di",
    rowsPerPage: "Righe per pagina",
    bulkExport: "Esporta Selezionati",
    selectAll: "Seleziona Tutto",
    selected: "selezionato",
    error: "Errore",
    tryAgain: "Riprova",
    loading: "Caricamento registro dei rischi...",
    permissionDenied: "Non hai il permesso di visualizzare questa pagina.",
    allCategories: "Tutte le categorie",
    allStatuses: "Tutti gli stati",
    allLikelihood: "Tutte le probabilità",
    allImpact: "Tutti gli impatti",
  },
};

  export const RISK_SORT_FIELDS = [
  "riskId",
  "title",
  "category",
  "likelihood",
  "impact",
  "overallRiskScore",
  "financialExposure",
  "status",
  "detectedAt",
  "dueDate",
] as const;

export type RiskSortField = typeof RISK_SORT_FIELDS[number];

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const CATEGORY_OPTIONS = [
  "budget",
  "cashflow",
  "compliance",
  "procurement",
  "treasury",
  "reporting",
  "audit",
  "donor",
  "currency",
  "operational",
];

const STATUS_OPTIONS = [
  "open",
  "under_review",
  "mitigating",
  "resolved",
  "accepted",
  "closed",
];

const LIKELIHOOD_OPTIONS = ["low", "medium", "high", "critical"];
const IMPACT_OPTIONS = ["low", "medium", "high", "critical"];

// ─── Main Component ───────────────────────────────────────────────────────

export function FinancialRiskRegister() {
  const { language } = useLanguage();
  const copy = T[language as keyof typeof T] || T.en;
  const isRTL = language === "ar";
  const navigate = useNavigate();
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();
 const organizationId = currentOrganization?.id || 0;
 const operatingUnitId = currentOperatingUnit?.id;

  type RiskCategory =
  | "budget"
  | "cashflow"
  | "compliance"
  | "procurement"
  | "treasury"
  | "reporting"
  | "audit"
  | "donor"
  | "currency"
  | "operational";

type RiskStatus =
  | "open"
  | "under_review"
  | "mitigating"
  | "resolved"
  | "accepted"
  | "closed";

type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";


  // ─── State ────────────────────────────────────────────────────────────

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [selected, setSelected] =
    useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const [category, setCategory] =
    useState<RiskCategory | undefined>();

const [status, setStatus] =
    useState<RiskStatus | undefined>();

const [likelihood, setLikelihood] =
    useState<RiskLevel | undefined>();

const [impact, setImpact] =
    useState<RiskLevel | undefined>();

  // ─── Queries ──────────────────────────────────────────────────────────
  const risksQuery = trpc.risk.getRisks.useQuery(
    {
      organizationId,
      page,
      pageSize,
      search: search || undefined,
      category: category || undefined,
      likelihood: likelihood || undefined,
      impact: impact || undefined,
      status: status || undefined,
      sortBy,
      sortOrder,
    },
    {
      enabled: !!organizationId,
    }
  );

  const statsQuery = trpc.risk.getRiskStats.useQuery(
    {
      organizationId: currentOrganization?.id || 0,
    },
    { enabled: !!organizationId }
  );

  // ✅ FIX: Changed from .useQuery() to .useMutation() for export operations
  // These should be mutations because they perform export operations
  const exportExcelMutation = trpc.risk.exportRegisterExcel.useMutation();
  const exportCsvMutation = trpc.risk.exportRegisterCsv.useMutation();
  const exportPdfMutation = trpc.risk.exportRegisterPdf.useMutation();

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  }, [sortBy, sortOrder]);

  const toggleSelect = useCallback((riskId: number) => {
    setSelected(prev => {
        const next = new Set(prev);

        if (next.has(riskId)) {
            next.delete(riskId);
            } else {
                next.add(riskId);
            }

            return next;
        });
    }, []);

  // Get rows from query data
  const rows = risksQuery.data?.data?.data || [];

  const toggleAll = useCallback(() => {
    if (rows.length > 0 && selected.size === rows.length) {
        setSelected(new Set<number>());
        } else {
            setSelected(new Set(rows.map(r => r.id)));
        }
    }, [rows, selected]);

  const handleExport = useCallback(async (format: "excel" | "csv" | "pdf") => {
    try {
      setExportingFormat(format);

      const exportParams = {
        organizationId: currentOrganization?.id || 0,
        operatingUnitId:
        currentOperatingUnit?.id
            ? Number(currentOperatingUnit.id)
            : undefined,
        ...(selected.size > 0 && { ids: Array.from(selected) }),
        ...(search && { search }),
        ...(category && { category }),
        ...(likelihood && { likelihood: likelihood as any }),
        ...(impact && { impact: impact as any }),
        ...(status && { status }),
      };

      // ✅ FIX: Use correct mutation method for each format
      if (format === "excel") {
        await exportExcelMutation.mutateAsync(exportParams);
      } else if (format === "csv") {
        await exportCsvMutation.mutateAsync(exportParams);
      } else {
        await exportPdfMutation.mutateAsync(exportParams);
      }

      // TODO: Handle file download response
    } catch (error) {
      console.error(`Export ${format} failed:`, error);
    } finally {
      setExportingFormat(null);
    }
  }, [organizationId, operatingUnitId, selected, search, category, likelihood, impact, status]);

  // ─── Derived State ────────────────────────────────────────────────────

  // ✅ FIX: Declare rows and other derived state BEFORE they're used in handlers
  const total = risksQuery.data?.data?.total || 0;
  const totalPages = risksQuery.data?.data?.totalPages || 0;
  const stats = statsQuery.data?.data;

  // ─── Render Error State ────────────────────────────────────────────────

  if (risksQuery.status === "error") {
    const errorMsg = risksQuery.error?.message || "Failed to load risk register";
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <ErrorState
          message={copy.error}
          onRetry={() => risksQuery.refetch()}
        />
      </div>
    );
  }

  // ─── Render Loading State ──────────────────────────────────────────────

  if (risksQuery.status === "pending") {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">{copy.loading}</p>
        </div>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6 pb-12" dir={isRTL ? "rtl" : "ltr"}>
      <FinancePageHeader
        title={copy.pageTitle}
        subtitle={copy.subtitle}
        icon={ShieldAlert}
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* ✅ FIX: Properly map stats response to FinanceKpiCard props */}
          <FinanceKpiCard
            label={copy.totalRisks}
            value={String(stats.total || 0)}
            accent="navy"
            icon={Flag}
          />
          <FinanceKpiCard
            label={copy.critical}
            value={String(stats.critical || 0)}
            accent="critical"
            icon={AlertTriangle}
          />
          <FinanceKpiCard
            label={copy.high}
            value={String(stats.high || 0)}
            accent="warning"
            icon={ShieldAlert}
          />
          <FinanceKpiCard
            label={copy.medium}
            value={String(stats.medium || 0)}
            accent="info"
            icon={Shield}
          />
          <FinanceKpiCard
            label={copy.exposure}
            value={`${(stats.totalExposure || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            accent="navy"
            icon={Zap}
          />
        </div>
      )}

        {/* Filters & Export */}
        <FinanceCard>
          <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-slate-600">
                {copy.filterBy}
              </p>

              {(search || category || likelihood || impact || status) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory(undefined);
                    setLikelihood(undefined);
                    setImpact(undefined);
                    setStatus(undefined);
                    setPage(1);
                  }}
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5" />
                  {copy.clearFilters}
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3">

              {/* Search */}
              <Input
                placeholder={copy.search}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-[13px]"
              />

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">

                {/* Category */}
                <Select
                  value={category ?? "all"}
                  onValueChange={(value) => {
                    setCategory(
                      value === "all"
                        ? undefined
                        : (value as RiskCategory)
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-[12px]">
                    <SelectValue placeholder={copy.riskCategory} />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      {copy.allCategories ?? "All Categories"}
                    </SelectItem>

                    {CATEGORY_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status */}
                <Select
                  value={status ?? "all"}
                  onValueChange={(value) => {
                    setStatus(
                      value === "all"
                        ? undefined
                        : (value as RiskStatus)
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-[12px]">
                    <SelectValue placeholder={copy.statusFilter} />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      {copy.allStatuses ?? "All Statuses"}
                    </SelectItem>

                    {STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Likelihood */}
                <Select
                  value={likelihood ?? "all"}
                  onValueChange={(value) => {
                    setLikelihood(
                      value === "all"
                        ? undefined
                        : (value as RiskLevel)
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-[12px]">
                    <SelectValue placeholder={copy.likelihood} />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      {copy.allLikelihood ?? "All Likelihood"}
                    </SelectItem>

                    {LIKELIHOOD_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Impact */}
                <Select
                  value={impact ?? "all"}
                  onValueChange={(value) => {
                    setImpact(
                      value === "all"
                        ? undefined
                        : (value as RiskLevel)
                    );
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-[12px]">
                    <SelectValue placeholder={copy.impact} />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      {copy.allImpact ?? "All Impact"}
                    </SelectItem>

                    {IMPACT_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-1.5 ms-auto mt-4">
          {["excel", "csv", "pdf"].map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format as any)}
              disabled={exportingFormat === format}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {exportingFormat === format ? (
                <Loader className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {copy[`export${format.charAt(0).toUpperCase()}${format.slice(1)}` as keyof typeof copy]}
            </button>
          ))}
        </div>
      </FinanceCard>

      {/* Data Grid */}
      <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
        {rows.length === 0 && !risksQuery.isLoading ? (
          <EmptyState message={copy.noRisks} className="py-12" />
        ) : risksQuery.isLoading ? (
          <div className="px-4 py-8">
            <LoadingSkeleton variant="table" rows={8} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && selected.size === rows.length}
                        onChange={toggleAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("id")}>
                      {copy.riskId}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("title")}>
                      {copy.title}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("category")}>
                      {copy.category}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("projectName")}>
                      {copy.project}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("donorName")}>
                      {copy.donor}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("likelihood")}>
                      {copy.likelihood}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("impact")}>
                      {copy.impact}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("overallRiskScore")}>
                      {copy.score}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("financialExposure")}>
                      {copy.financialExposure}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("status")}>
                      {copy.colStatus}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("ownerName")}>
                      {copy.owner}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("dueDate")}>
                      {copy.dueDate}
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-center font-bold">{copy.aiRec}</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-start font-bold">{copy.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-[#003b70] whitespace-nowrap">{row.id}</td>
                      <td className="px-3 py-2.5 max-w-[180px]"><p className="truncate font-medium text-slate-800" title={row.title}>{row.title}</p></td>
                      <td className="px-3 py-2.5 text-slate-600">{row.category}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700 whitespace-nowrap">{row.projectCode ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-600">{row.donorName ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-600 capitalize">{row.likelihood}</td>
                      <td className="px-3 py-2.5 text-slate-600 capitalize">{row.impact}</td>
                      <td className="px-3 py-2.5 font-mono font-bold" style={{
                        color: row.overallRiskScore && row.overallRiskScore >= 15
                          ? FINANCE_COLORS.critical
                          : row.overallRiskScore && row.overallRiskScore >= 9
                          ? FINANCE_COLORS.warning
                          : FINANCE_COLORS.success
                      }}>
                        {row.overallRiskScore || "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono" dir="ltr">
                        {row.financialExposure
                          ? `${row.financialExposure.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${row.currency || ''}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <RiskStatusChip status={row.status as any} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{row.ownerName ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap" dir="ltr">
                        {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {row.aiRecommendation && (
                          <Bot className="h-4 w-4 text-blue-500 mx-auto" aria-label="Has AI recommendation" />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap">
                          <ExternalLink className="h-3 w-3" />
                          {copy.viewDetails}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] text-slate-600">
              <div className="flex items-center gap-2">
                <span>{copy.rowsPerPage}:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded border border-slate-300 px-2 text-[12px] outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span>{copy.page} {page} {copy.of} {totalPages} ({total} total)</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
