// ============================================================================
// FINANCIAL RISK REGISTER — /finance/risk/register
// Enterprise management page for all financial risk records.
// Source: finance_financial_risks table (joined with projects, donors, users)
// All data comes from financeQuery(); no mock values anywhere.
// ============================================================================

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from"@/lib/router-compat";
import {
  AlertTriangle, Bot, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, ClipboardList, Download, ExternalLink, FileText,
  Flag, Search, Shield, ShieldAlert, ShieldCheck, SlidersHorizontal,
  TrendingDown, TrendingUp, X, XCircle, Zap,
} from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { trpc, financeQuery } from "@/lib/trpc";
import {
  EMPTY_RISK_REGISTER_STATS,
  type RiskRegisterStats, type RiskRegisterRecord, type FullAIRecommendation,
  type PaginatedResponse,
} from "@/lib/financeRouterTypes";
import {
  FinanceCard, WidgetHeader, FinancePageHeader,
  FinanceKpiCard, LoadingSkeleton, EmptyState, ErrorState,
  RiskBadge, RiskStatusChip, RiskDot,
  FINANCE_COLORS, type RiskLevel,
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
import { ArrowLeft, Filter } from "lucide-react";
import { useCallback } from "react";
import { useLocation } from "wouter";

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    pageTitle: "Financial Risk Register", subtitle: "Enterprise Risk Management — Source of Truth",
    updated: "Last updated", refresh: "Refresh", export: "Export",
    totalRisks: "Total Risks", critical: "Critical", high: "High",
    medium: "Medium", low: "Low", open: "Open", underReview: "Under Review",
    resolved: "Resolved", exposure: "Total Exposure",
    filterBy: "Filter by:", riskCategory: "Category", statusFilter: "Status",
    likelihood: "Likelihood", impact: "Impact", owner: "Owner",
    dateRange: "Date Range", search: "Search risks, projects, donors...",
    moreFilters: "More Filters", clearFilters: "Clear",
    riskId: "Risk ID", title: "Title", category: "Category",
    project: "Project", donor: "Donor", score: "Score",
    financialExposure: "Exposure", currency: "Currency",
    colStatus: "Status", dueDate: "Due Date", detectedDate: "Detected",
    aiRec: "AI", actions: "Actions",
    viewDetails: "View Details", exportExcel: "Excel", exportCsv: "CSV", exportPdf: "PDF",
    viewRegister: "View Full Risk Register",
    drawerTitle: "Risk Details", aiPanelTitle: "AI Recommendations",
    mitigation: "Mitigation Plan", description: "Description",
    linkedProject: "Linked Project", linkedDonor: "Linked Donor",
    accept: "Accept", dismiss: "Dismiss", implemented: "Implemented",
    confidence: "Confidence", expectedImpact: "Expected Impact",
    estimatedSavings: "Est. Savings", reasoning: "Reasoning",
    recommendation: "Recommendation", noRisks: "No risk records found.",
    page: "Page", of: "of", rowsPerPage: "Rows per page",
    bulkExport: "Export Selected", selectAll: "Select All",
    backToDashboard: "← Back to Risk Dashboard",
    riskScore: "Risk Score", selected: "selected",
    budgetRisk: "Budget Risk", liquidityRisk: "Liquidity Risk", currencyRisk: "Currency Risk",
    procurementRisk: "Procurement Risk", donorRisk: "Donor Risk", treasuryRisk: "Treasury Risk",
    statusOpen: "open", statusUnderReview: "under-review", statusMitigated: "mitigated",
    statusAccepted: "accepted", statusClosed: "closed",
    inProgress: "In Progress", mitigated: "Mitigated", accepted: "Accepted",
  },
  ar: {
    pageTitle: "سجل المخاطر المالية", subtitle: "إدارة المخاطر المؤسسية — مصدر الحقيقة",
    updated: "آخر تحديث", refresh: "تحديث", export: "تصدير",
    totalRisks: "إجمالي المخاطر", critical: "حرجة", high: "عالية",
    medium: "متوسطة", low: "منخفضة", open: "مفتوحة", underReview: "قيد المراجعة",
    resolved: "محلولة", exposure: "إجمالي التعرض",
    filterBy: "تصفية حسب:", riskCategory: "الفئة", statusFilter: "الحالة",
    likelihood: "الاحتمالية", impact: "التأثير", owner: "المسؤول",
    dateRange: "النطاق الزمني", search: "بحث في المخاطر أو المشاريع أو المانحين...",
    moreFilters: "مرشحات إضافية", clearFilters: "مسح",
    riskId: "رمز الخطر", title: "العنوان", category: "الفئة",
    project: "المشروع", donor: "المانح", score: "النتيجة",
    financialExposure: "التعرض", currency: "العملة",
    colStatus: "الحالة", dueDate: "تاريخ الاستحقاق", detectedDate: "تاريخ الكشف",
    aiRec: "ذكاء", actions: "الإجراءات",
    viewDetails: "عرض التفاصيل", exportExcel: "Excel", exportCsv: "CSV", exportPdf: "PDF",
    viewRegister: "عرض سجل المخاطر الكامل",
    drawerTitle: "تفاصيل الخطر", aiPanelTitle: "توصيات الذكاء الاصطناعي",
    mitigation: "خطة التخفيف", description: "الوصف",
    linkedProject: "المشروع المرتبط", linkedDonor: "المانح المرتبط",
    accept: "قبول", dismiss: "رفض", implemented: "منفذ",
    confidence: "الثقة", expectedImpact: "التأثير المتوقع",
    estimatedSavings: "الوفورات التقديرية", reasoning: "المبررات",
    recommendation: "التوصية", noRisks: "لا توجد سجلات مخاطر.",
    page: "صفحة", of: "من", rowsPerPage: "صفوف لكل صفحة",
    bulkExport: "تصدير المحدد", selectAll: "تحديد الكل",
    backToDashboard: "← العودة إلى لوحة المخاطر",
    riskScore: "درجة المخاطر", selected: "محدد",
    budgetRisk: "مخاطر الميزانية", liquidityRisk: "مخاطر السيولة", currencyRisk: "مخاطر الصرف",
    procurementRisk: "مخاطر المشتريات", donorRisk: "مخاطر المانح", treasuryRisk: "مخاطر الخزانة",
    statusOpen: "مفتوح", statusUnderReview: "قيد المراجعة", statusMitigated: "تم التخفيف",
    statusAccepted: "مقبول", statusClosed: "مغلق",
    inProgress: "قيد المراجعة", mitigated: "تم التخفيف", accepted: "مقبول",
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
  owner: "Responsabile",
  dateRange: "Intervallo di Date",

  search: "Cerca rischi, progetti o donatori...",

  moreFilters: "Altri Filtri",
  clearFilters: "Cancella",

  riskId: "ID Rischio",
  title: "Titolo",
  category: "Categoria",
  project: "Progetto",
  donor: "Donatore",
  score: "Punteggio",

  financialExposure: "Esposizione Finanziaria",
  currency: "Valuta",

  colStatus: "Stato",
  dueDate: "Data di Scadenza",
  detectedDate: "Data di Individuazione",

  aiRec: "AI",
  actions: "Azioni",

  viewDetails: "Visualizza Dettagli",
  exportExcel: "Excel",
  exportCsv: "CSV",
  exportPdf: "PDF",

  viewRegister: "Visualizza il Registro Completo dei Rischi",

  drawerTitle: "Dettagli del Rischio",
  aiPanelTitle: "Raccomandazioni AI",

  mitigation: "Piano di Mitigazione",
  description: "Descrizione",

  linkedProject: "Progetto Collegato",
  linkedDonor: "Donatore Collegato",

  accept: "Accetta",
  dismiss: "Ignora",
  implemented: "Implementato",

  confidence: "Affidabilità",
  expectedImpact: "Impatto Previsto",
  estimatedSavings: "Risparmio Stimato",
  reasoning: "Motivazione",

  recommendation: "Raccomandazione",
  noRisks: "Nessun rischio trovato.",

  page: "Pagina",
  of: "di",
  rowsPerPage: "Righe per pagina",

  bulkExport: "Esporta Selezionati",
  selectAll: "Seleziona Tutto",

  backToDashboard: "← Torna alla Dashboard dei Rischi",
  riskScore: "Punteggio del Rischio", selected: "selezionato",
  budgetRisk: "Rischio di Bilancio", liquidityRisk: "Rischio di Liquidità", currencyRisk: "Rischio di Cambio",
  procurementRisk: "Rischio di Approvvigionamento", donorRisk: "Rischio del Donatore", treasuryRisk: "Rischio di Tesoreria",
  statusOpen: "aperto", statusUnderReview: "in revisione", statusMitigated: "mitigato",
  statusAccepted: "accettato", statusClosed: "chiuso",
  inProgress: "In Corso", mitigated: "Mitigato", accepted: "Accettato",
},
} as const;

type SortDir = "asc" | "desc";
interface SortState { col: string; dir: SortDir }

function toRiskLevel(s: string): RiskLevel {
  const m: Record<string, RiskLevel> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
  return m[s?.toLowerCase()] ?? "Low";
}

function compact(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── AI Recommendation Panel ──────────────────────────────────────────────────

function AIRecommendationPanel({
  riskId, copy,
}: { riskId: string; copy: typeof T["en"] }) {
  const recsQ = useQuery({
    queryKey: ["risk.ai-full", riskId],
    queryFn: () => financeQuery("getAIRecommendationsByRisk", { riskId }),
    enabled: !!riskId,
  });

  const recs = (recsQ.data ?? []) as FullAIRecommendation[];

  return (
    <div className="border-t border-slate-200 pt-4 mt-4">
      <h3 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[#003b70] mb-3">
        <Bot className="h-4 w-4" />{copy.aiPanelTitle}
      </h3>
      {recsQ.isLoading ? <LoadingSkeleton variant="list" rows={2} /> :
       recs.length === 0 ? <EmptyState message="No AI recommendations for this risk." className="py-4" /> :
       recs.map((r) => (
        <div key={r.id} className="mb-3 rounded-lg border border-slate-200 p-3 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
              r.priority === "critical" ? "bg-red-100 text-red-700" :
              r.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
            }`}>{r.priority}</span>
            <span className="text-[10px] text-slate-500">{copy.confidence}: {r.confidence}%</span>
          </div>
          <p className="text-[12px] font-semibold text-slate-800">{r.recommendation}</p>
          <p className="text-[11px] text-slate-600 leading-4">{r.reasoning}</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {r.expectedImpact && <div><span className="text-slate-500">{copy.expectedImpact}: </span><span className="font-medium">{r.expectedImpact}</span></div>}
            {r.estimatedSavings && <div><span className="text-slate-500">{copy.estimatedSavings}: </span><span className="font-mono font-bold text-green-700">{compact(r.estimatedSavings)}</span></div>}
          </div>
          <div className="flex gap-2 pt-1">
            {["accept", "dismiss", "implemented"].map((a) => (
              <button key={a} className={`flex-1 rounded px-2 py-1 text-[10px] font-bold transition-colors ${
                a === "accept" ? "bg-green-600 text-white hover:bg-green-700" :
                a === "dismiss" ? "bg-slate-200 text-slate-600 hover:bg-slate-300" :
                "bg-blue-600 text-white hover:bg-blue-700"
              }`}>{copy[a as keyof typeof copy] as string}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Row Detail Drawer ────────────────────────────────────────────────────────

function RiskDetailDrawer({
  risk, onClose, copy, isRTL,
}: { risk: RiskRegisterRecord | null; onClose: () => void; copy: typeof T["en"]; isRTL: boolean }) {
  if (!risk) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className={`fixed top-0 bottom-0 z-50 w-[500px] max-w-[95vw] bg-white shadow-xl overflow-y-auto ${isRTL ? "left-0" : "right-0"}`}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-[14px] font-bold text-slate-800">{copy.drawerTitle}</h2>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] text-slate-500 mb-1">{risk.riskId}</p>
              <h3 className="text-[15px] font-bold text-slate-900">{risk.title}</h3>
            </div>
            <RiskBadge level={toRiskLevel(risk.status)} />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {[
              [copy.category, risk.category],
              [copy.colStatus, risk.status],
              [copy.linkedProject, risk.projectName ?? risk.projectCode ?? "—"],
              [copy.linkedDonor, risk.donorName ?? "—"],
              [copy.owner, risk.owner ?? "—"],
              [copy.dueDate, risk.dueDate ?? "—"],
              [copy.detectedDate, risk.detectedDate ?? "—"],
              [copy.financialExposure, compact(risk.financialExposure)],
            ].map(([label, value]) => (
              <div key={label} className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="font-medium text-slate-700">{value}</p>
              </div>
            ))}
          </div>

          {/* Risk Score bar */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{copy.riskScore}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full transition-all" style={{ width: `${(risk.riskScore / 25) * 100}%`, background: risk.riskScore >= 15 ? FINANCE_COLORS.critical : risk.riskScore >= 9 ? FINANCE_COLORS.warning : FINANCE_COLORS.success }} />
              </div>
              <span className="font-mono text-[13px] font-bold" dir="ltr">{risk.riskScore} / 25</span>
            </div>
          </div>

          {/* Description */}
          {risk.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{copy.description}</p>
              <p className="text-[12px] text-slate-700 leading-5">{risk.description}</p>
            </div>
          )}

          {/* Mitigation */}
          {risk.mitigationPlan && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{copy.mitigation}</p>
              <p className="text-[12px] text-slate-700 leading-5">{risk.mitigationPlan}</p>
            </div>
          )}

          {/* AI Recommendations */}
          {risk.hasAiRecommendation && <AIRecommendationPanel riskId={risk.riskId} copy={copy} />}
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialRiskRegister() {
  const { language, isRTL } = useLanguage();
  const copy = T[language] as typeof T["en"];
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [severityFilter, setSeverityFilter] = useState<RiskLevel | "All">("All");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Sort
  const [sort, setSort] = useState<SortState>({ col: "riskScore", dir: "desc" });
  

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drawer
  const [drawerRisk, setDrawerRisk] = useState<RiskRegisterRecord | null>(null);

  const filterInput = {
    fiscalYear: fiscalYear || undefined,
    category: category || undefined,
    status: status || undefined,
    severity: severityFilter !== "All" ? severityFilter.toLowerCase() : undefined,
    search: search || undefined,
    page, pageSize,
    sortBy: sort.col, sortDir: sort.dir,
  };

  // Queries
  const statsQ = useQuery({
    queryKey: ["risk-reg.stats", fiscalYear, category, status, severityFilter],
    queryFn: () => financeQuery("getRiskRegisterStats", { fiscalYear: fiscalYear || undefined, category: category || undefined, status: status || undefined }),
  });

  const dataQ = useQuery({
    queryKey: ["risk-reg.data", ...Object.values(filterInput)],
    queryFn: () => financeQuery("getRiskRegisterPaginated", filterInput),
    placeholderData: (prev) => prev,
  });

  const metaQ = useQuery({ queryKey: ["fin.meta"], queryFn: () => financeQuery("getFilterMetadata", {}) });

  const stats = (statsQ.data ?? EMPTY_RISK_REGISTER_STATS) as RiskRegisterStats;
  const paginated = (dataQ.data ?? { data: [], total: 0, page: 1, pageSize, totalPages: 0 }) as PaginatedResponse<RiskRegisterRecord>;
  const rows = paginated.data;
  const meta = metaQ.data as { fiscalYears?: string[] } | undefined;

  const totalPages = paginated.totalPages || Math.ceil(paginated.total / pageSize) || 1;

  function handleSort(col: string) {
    setSort((s) => s.col === col ? { col, dir: s.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" });
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected((s) => s.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  }

  const fyOptions = [{ value: "", label: language === "ar" ? "كل السنوات" : "All Years" }, ...(meta?.fiscalYears ?? []).map((y) => ({ value: y, label: `FY${y}` }))];

  const SortIcon = ({ col }: { col: string }) => (
    <span className="inline-block ml-1 opacity-50">
      {sort.col === col ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const columns: { key: keyof RiskRegisterRecord; label: string; sortable?: boolean; ltr?: boolean }[] = [
    { key: "riskId",           label: copy.riskId,           sortable: true },
    { key: "title",            label: copy.title,            sortable: true },
    { key: "category",         label: copy.category,         sortable: true },
    { key: "projectCode",      label: copy.project,          sortable: true },
    { key: "donorName",        label: copy.donor },
    { key: "likelihood",       label: copy.likelihood,       sortable: true, ltr: true },
    { key: "impact",           label: copy.impact,           sortable: true, ltr: true },
    { key: "riskScore",        label: copy.score,            sortable: true, ltr: true },
    { key: "financialExposure",label: copy.financialExposure,sortable: true, ltr: true },
    { key: "status",           label: copy.colStatus,        sortable: true },
    { key: "owner",            label: copy.owner },
    { key: "dueDate",          label: copy.dueDate,          sortable: true, ltr: true },
    { key: "hasAiRecommendation", label: copy.aiRec },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-[1600px] space-y-4 p-6 font-['Inter']">

        <FinancePageHeader
          title={copy.pageTitle} subtitle={copy.subtitle} icon={ClipboardList}
          updatedLabel={copy.updated} refreshLabel={copy.refresh} exportLabel={copy.export}
          onRefresh={() => { statsQ.refetch(); dataQ.refetch(); }}
          onExport={() => financeQuery("exportRiskRegister", { ...filterInput, format: "excel" })}
        />

        {/* Back link */}
        <button onClick={() => navigate("/finance/risk")} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#003b70] hover:underline">
          <ChevronLeft className="h-4 w-4" />{copy.backToDashboard}
        </button>

        {/* KPI Strip */}
        {statsQ.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
            {Array.from({ length: 9 }).map((_, i) => <div key={i} className="rounded-[10px] border border-slate-200 bg-white p-3"><LoadingSkeleton variant="kpi" /></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
            <FinanceKpiCard label={copy.totalRisks} value={stats.total}         icon={Shield} />
            <FinanceKpiCard label={copy.critical}   value={stats.critical}      valueColor="text-red-600"    icon={XCircle} />
            <FinanceKpiCard label={copy.high}        value={stats.high}          valueColor="text-orange-600" icon={AlertTriangle} />
            <FinanceKpiCard label={copy.medium}      value={stats.medium}        valueColor="text-amber-600"  icon={Flag} />
            <FinanceKpiCard label={copy.low}         value={stats.low}           valueColor="text-green-700"  icon={ShieldCheck} />
            <FinanceKpiCard label={copy.open}        value={stats.open}          icon={ShieldAlert} />
            <FinanceKpiCard label={copy.underReview} value={stats.underReview}   icon={Flag} />
            <FinanceKpiCard label={copy.resolved}    value={stats.resolved}      valueColor="text-green-700"  icon={CheckCircle2} />
            <FinanceKpiCard label={copy.exposure}    value={compact(stats.totalExposure)} icon={Zap} />
          </div>
        )}

        {/* Filter Bar */}
        <FinanceCard noPadding>
          <div className="flex flex-wrap items-center gap-3 p-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className={`h-9 w-full rounded border border-slate-300 bg-white text-[13px] outline-none focus:ring-2 ring-blue-200 ${isRTL ? "pr-10 pl-3" : "pl-10 pr-3"}`}
                placeholder={copy.search} />
            </div>

            {/* Fiscal Year */}
            <select value={fiscalYear} onChange={(e) => { setFiscalYear(e.target.value); setPage(1); }}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 ring-blue-200">
              {fyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Category */}
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 ring-blue-200">
              <option value="">{copy.riskCategory}</option>
              {[
                { key: "budgetRisk", label: copy.budgetRisk },
                { key: "liquidityRisk", label: copy.liquidityRisk },
                { key: "currencyRisk", label: copy.currencyRisk },
                { key: "procurementRisk", label: copy.procurementRisk },
                { key: "donorRisk", label: copy.donorRisk },
                { key: "treasuryRisk", label: copy.treasuryRisk },
              ].map((c) =>
                <option key={c.key} value={c.label}>{c.label}</option>)}
            </select>

            {/* Status */}
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 ring-blue-200">
              <option value="">{copy.colStatus}</option>
              {[
                { key: "statusOpen", value: "open" },
                { key: "statusUnderReview", value: "under-review" },
                { key: "statusMitigated", value: "mitigated" },
                { key: "statusAccepted", value: "accepted" },
                { key: "statusClosed", value: "closed" },
              ].map((s) =>
                <option key={s.value} value={s.value}>{copy[s.key as keyof typeof copy]}</option>)}
            </select>

            {/* Severity quick chips */}
            <div className="flex gap-1.5">
              {(["All","Critical","High","Medium","Low"] as const).map((s) => (
                <button key={s} onClick={() => { setSeverityFilter(s); setPage(1); }}
                  className={`rounded px-2.5 py-1 text-[11px] font-bold transition-colors ${severityFilter === s ? "bg-[#003b70] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {s}
                </button>
              ))}
            </div>

            {/* Clear */}
            {(search || fiscalYear || category || status || severityFilter !== "All") && (
              <button onClick={() => { setSearch(""); setFiscalYear(""); setCategory(""); setStatus(""); setSeverityFilter("All"); setPage(1); }}
                className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">
                <X className="h-3.5 w-3.5" />{copy.clearFilters}
              </button>
            )}

            {/* Export */}
            <div className="flex gap-1.5 ms-auto">
              {([["Excel","exportExcel"],["CSV","exportCsv"],["PDF","exportPdf"]] as const).map(([label, key]) => (
                <button key={label} onClick={() => financeQuery("exportRiskRegister", { ...filterInput, format: label.toLowerCase() })}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" />{copy[key] as string}
                </button>
              ))}
            </div>
          </div>
        </FinanceCard>

        {/* Data Grid */}
        <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.06)]">
          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 border-b border-slate-200 bg-blue-50 px-4 py-2.5">
              <span className="text-[12px] font-semibold text-blue-700">{selected.size} {copy.selected}</span>
              <button onClick={() => financeQuery("exportRiskRegister", { ids: Array.from(selected), format: "excel" })}
                className="inline-flex items-center gap-1.5 rounded bg-[#003b70] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#002a55]">
                <Download className="h-3.5 w-3.5" />{copy.bulkExport}
              </button>
              <button onClick={() => setSelected(new Set())} className="ms-auto text-[11px] text-slate-500 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-3 w-10">
                    <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} className="rounded border-slate-300" />
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                      className={`border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap ${col.sortable ? "cursor-pointer select-none hover:bg-slate-100" : ""}`}
                      dir={col.ltr ? "ltr" : undefined}>
                      {col.label}
                      {col.sortable && <SortIcon col={String(col.key)} />}
                    </th>
                  ))}
                  <th className="border-b border-slate-200 px-3 py-3 text-start font-bold">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {dataQ.isLoading ? (
                  <tr><td colSpan={columns.length + 2} className="px-4 py-8"><LoadingSkeleton variant="table" rows={8} /></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={columns.length + 2}><EmptyState message={copy.noRisks} className="py-12" /></td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} onClick={() => setDrawerRisk(row)}
                      className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer">
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300" />
                      </td>

                      <td className="px-3 py-2.5 font-mono font-bold text-[#003b70] whitespace-nowrap">{row.riskId}</td>
                      <td className="px-3 py-2.5 max-w-[180px]"><p className="truncate font-medium text-slate-800" title={row.title}>{row.title}</p></td>
                      <td className="px-3 py-2.5 text-slate-600">{row.category}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-700 whitespace-nowrap">{row.projectCode ?? "—"}</td>
                      <td className="px-3 py-2.5 text-slate-600">{row.donorName ?? "—"}</td>
                      <td className="px-3 py-2.5" dir="ltr">
                        <div className="flex items-center gap-1.5"><div className="h-1.5 w-10 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-[#003b70]" style={{ width: `${(row.likelihood / 5) * 100}%` }} /></div><span className="font-mono text-[10px]">{row.likelihood}/5</span></div>
                      </td>
                      <td className="px-3 py-2.5" dir="ltr">
                        <div className="flex items-center gap-1.5"><div className="h-1.5 w-10 rounded-full bg-slate-200"><div className="h-1.5 rounded-full" style={{ width: `${(row.impact / 5) * 100}%`, background: FINANCE_COLORS.critical }} /></div><span className="font-mono text-[10px]">{row.impact}/5</span></div>
                      </td>
                      <td className="px-3 py-2.5" dir="ltr">
                        <span className="font-mono font-bold" style={{ color: row.riskScore >= 15 ? FINANCE_COLORS.critical : row.riskScore >= 9 ? FINANCE_COLORS.warning : FINANCE_COLORS.success }}>{row.riskScore}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono" dir="ltr">{compact(row.financialExposure)}</td>
                      <td className="px-3 py-2.5"><RiskStatusChip status={(row.status === "active" || row.status === "open" ? "Open" : row.status === "under-review" ? "In Progress" : row.status === "mitigated" ? copy.mitigated : copy.accepted) as "Open" | "In Progress" | "Mitigated" | "Accepted"} /></td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{row.owner ?? "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap" dir="ltr">{row.dueDate ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center">
                        {row.hasAiRecommendation && 
                        <Bot
                            className="h-4 w-4 text-blue-500 mx-auto"
                            aria-label="Has AI recommendation"
                        />}
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setDrawerRisk(row)} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap">
                          <ExternalLink className="h-3 w-3" />{copy.viewDetails}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] text-slate-600">
            <div className="flex items-center gap-2">
              <span>{copy.rowsPerPage}:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-7 rounded border border-slate-300 px-2 text-[12px] outline-none">
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span>{copy.page} {page} {copy.of} {totalPages} ({paginated.total} total)</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="rounded border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="rounded border border-slate-300 p-1 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <RiskDetailDrawer risk={drawerRisk} onClose={() => setDrawerRisk(null)} copy={copy} isRTL={isRTL} />
    </div>
  );
}
