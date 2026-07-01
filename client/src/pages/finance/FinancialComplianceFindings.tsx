// ============================================================================
// FINANCIAL COMPLIANCE FINDINGS — /finance/compliance/findings
// Enterprise management page for all compliance finding records.
// Source: finance_compliance_findings table (joined with projects, users)
// All data comes from financeQuery(); no mock values anywhere.
// ============================================================================

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from"@/lib/router-compat";
import {
  AlertTriangle, Bot, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, ExternalLink, FileSearch, FileText,
  Flag, Search, Shield, ShieldAlert, ShieldCheck, ShieldX,
  TrendingUp, X, XCircle,
} from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { trpc, financeQuery } from "@/lib/trpc";
import {
  EMPTY_COMPLIANCE_FINDINGS_STATS,
  type ComplianceFindingsStats, type ComplianceFindingRecord,
  type FullAIRecommendation, type PaginatedResponse,
} from "@/lib/financeRouterTypes";
import {
  FinanceCard, WidgetHeader, FinancePageHeader,
  FinanceKpiCard, LoadingSkeleton, EmptyState,
  FINANCE_COLORS, scoreToColor,
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
    pageTitle: "Financial Compliance Findings", subtitle: "Compliance Management — Source of Truth",
    updated: "Last updated", refresh: "Refresh", export: "Export",
    open: "Open", critical: "Critical", high: "High", medium: "Medium", low: "Low",
    resolved: "Resolved", overdue: "Overdue", avgResolution: "Avg Resolution", auditReadiness: "Audit Readiness", complianceScore: "Compliance Score",
    search: "Search findings, projects, assigned to...",
    findingType: "Finding Type", severity: "Severity", colStatus: "Status",
    assignedTo: "Assigned To", dateRange: "Date Range", moreFilters: "More Filters",
    clearFilters: "Clear", fiscalYear: "Fiscal Year",
    findingId: "Finding ID", title: "Title", project: "Project",
    refTable: "Ref. Table", refRecord: "Ref. Record",
    targetDate: "Target Date", createdDate: "Created", resolvedDate: "Resolved",
    aiRec: "AI", actions: "Actions", viewDetails: "View Details",
    exportExcel: "Excel", exportCsv: "CSV", exportPdf: "PDF",
    drawerTitle: "Finding Details", aiPanelTitle: "AI Recommendations",
    description: "Description", recommendation: "Recommendation",
    linkedTransaction: "Linked Transaction", linkedJournal: "Linked Journal",
    linkedProcurement: "Linked Procurement", linkedBudget: "Linked Budget",
    accept: "Accept", dismiss: "Dismiss", implemented: "Implemented",
    confidence: "Confidence", expectedImpact: "Expected Impact",
    estimatedSavings: "Est. Savings", reasoning: "Reasoning",
    noFindings: "No compliance findings found.",
    page: "Page", of: "of", rowsPerPage: "Rows per page",
    bulkExport: "Export Selected",
    backToDashboard: "← Back to Compliance Dashboard",
    days: "days",
  },
  ar: {
    pageTitle: "نتائج الامتثال المالي", subtitle: "إدارة الامتثال — مصدر الحقيقة",
    updated: "آخر تحديث", refresh: "تحديث", export: "تصدير",
    open: "مفتوحة", critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة",
    resolved: "محلولة", overdue: "متأخرة", avgResolution: "متوسط الحل", auditReadiness: "الاستعداد للتدقيق", complianceScore: "نتيجة الامتثال",
    search: "بحث في النتائج أو المشاريع أو المسؤولين...",
    findingType: "نوع النتيجة", severity: "الخطورة", colStatus: "الحالة",
    assignedTo: "المسؤول", dateRange: "النطاق الزمني", moreFilters: "مرشحات إضافية",
    clearFilters: "مسح", fiscalYear: "السنة المالية",
    findingId: "رمز النتيجة", title: "العنوان", project: "المشروع",
    refTable: "الجدول المرجعي", refRecord: "السجل المرجعي",
    targetDate: "تاريخ الهدف", createdDate: "تاريخ الإنشاء", resolvedDate: "تاريخ الحل",
    aiRec: "ذكاء", actions: "الإجراءات", viewDetails: "عرض التفاصيل",
    exportExcel: "Excel", exportCsv: "CSV", exportPdf: "PDF",
    drawerTitle: "تفاصيل النتيجة", aiPanelTitle: "توصيات الذكاء الاصطناعي",
    description: "الوصف", recommendation: "التوصية",
    linkedTransaction: "المعاملة المرتبطة", linkedJournal: "القيد المرتبط",
    linkedProcurement: "المشتريات المرتبطة", linkedBudget: "الميزانية المرتبطة",
    accept: "قبول", dismiss: "رفض", implemented: "منفذ",
    confidence: "الثقة", expectedImpact: "التأثير المتوقع",
    estimatedSavings: "الوفورات التقديرية", reasoning: "المبررات",
    noFindings: "لا توجد نتائج امتثال.",
    page: "صفحة", of: "من", rowsPerPage: "صفوف لكل صفحة",
    bulkExport: "تصدير المحدد",
    backToDashboard: "← العودة إلى لوحة الامتثال",
    days: "يوم",
  },
  it: {
  pageTitle: "Risultati della Conformità Finanziaria",
  subtitle: "Gestione della Conformità — Fonte Unica di Verità",

  updated: "Ultimo aggiornamento",
  refresh: "Aggiorna",
  export: "Esporta",

  open: "Aperti",
  critical: "Critici",
  high: "Alti",
  medium: "Medi",
  low: "Bassi",
  resolved: "Risolti",
  overdue: "Scaduti",

  avgResolution: "Tempo Medio di Risoluzione",
  auditReadiness: "Preparazione all'Audit",
  complianceScore: "Punteggio di Conformità",

  search: "Cerca risultati, progetti o assegnatari...",

  findingType: "Tipo di Risultato",
  severity: "Gravità",
  colStatus: "Stato",

  assignedTo: "Assegnato a",
  dateRange: "Intervallo di Date",
  moreFilters: "Altri Filtri",
  clearFilters: "Cancella",
  fiscalYear: "Anno Fiscale",

  findingId: "ID Risultato",
  title: "Titolo",
  project: "Progetto",

  refTable: "Tabella di Riferimento",
  refRecord: "Record di Riferimento",

  targetDate: "Data Obiettivo",
  createdDate: "Creato",
  resolvedDate: "Risolto",

  aiRec: "AI",
  actions: "Azioni",
  viewDetails: "Visualizza Dettagli",

  exportExcel: "Excel",
  exportCsv: "CSV",
  exportPdf: "PDF",

  drawerTitle: "Dettagli del Risultato",
  aiPanelTitle: "Raccomandazioni AI",

  description: "Descrizione",
  recommendation: "Raccomandazione",

  linkedTransaction: "Transazione Collegata",
  linkedJournal: "Registrazione Contabile Collegata",
  linkedProcurement: "Approvvigionamento Collegato",
  linkedBudget: "Budget Collegato",

  accept: "Accetta",
  dismiss: "Ignora",
  implemented: "Implementato",

  confidence: "Affidabilità",
  expectedImpact: "Impatto Previsto",
  estimatedSavings: "Risparmio Stimato",
  reasoning: "Motivazione",

  noFindings: "Nessun risultato di conformità trovato.",

  page: "Pagina",
  of: "di",
  rowsPerPage: "Righe per pagina",

  bulkExport: "Esporta Selezionati",
  backToDashboard: "← Torna alla Dashboard di Conformità",

  days: "giorni",
},
} as const;

type SortDir = "asc" | "desc";

function compact(v: number) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

function sevClass(s: string) {
  return s === "critical" ? "bg-red-100 text-red-700"
    : s === "high" ? "bg-orange-100 text-orange-700"
    : s === "medium" ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";
}

function statusClass(s: string) {
  return s === "open" ? "bg-red-50 text-red-700"
    : s === "in-progress" || s === "under-review" ? "bg-blue-50 text-blue-700"
    : s === "resolved" || s === "closed" ? "bg-green-50 text-green-700"
    : "bg-slate-100 text-slate-600";
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── AI Panel ─────────────────────────────────────────────────────────────────

function AIPanel({ findingId, copy }: { findingId: string; copy: typeof T["en"] }) {
  const q = useQuery({
    queryKey: ["comp.ai-full", findingId],
    queryFn: () => financeQuery("getAIRecommendationsByFinding", { findingId }),
    enabled: !!findingId,
  });
  const recs = (q.data ?? []) as FullAIRecommendation[];

  return (
    <div className="border-t border-slate-200 pt-4 mt-4">
      <h3 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-[#003b70] mb-3">
        <Bot className="h-4 w-4" />{copy.aiPanelTitle}
      </h3>
      {q.isLoading ? <LoadingSkeleton variant="list" rows={2} /> :
       recs.length === 0 ? <EmptyState message="No AI recommendations for this finding." className="py-4" /> :
       recs.map((r) => (
        <div key={r.id} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${sevClass(r.priority)}`}>{r.priority}</span>
            <span className="text-[10px] text-slate-500">{copy.confidence}: {r.confidence}%</span>
          </div>
          <p className="text-[12px] font-semibold text-slate-800">{r.recommendation}</p>
          <p className="text-[11px] text-slate-600 leading-4">{r.reasoning}</p>
          <div className="flex gap-2 pt-1">
            {(["accept","dismiss","implemented"] as const).map((a) => (
              <button key={a} className={`flex-1 rounded px-2 py-1 text-[10px] font-bold transition-colors ${
                a === "accept" ? "bg-green-600 text-white hover:bg-green-700" :
                a === "dismiss" ? "bg-slate-200 text-slate-600 hover:bg-slate-300" :
                "bg-blue-600 text-white hover:bg-blue-700"
              }`}>{copy[a] as string}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────

function FindingDetailDrawer({
  finding, onClose, copy, isRTL,
}: { finding: ComplianceFindingRecord | null; onClose: () => void; copy: typeof T["en"]; isRTL: boolean }) {
  if (!finding) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className={`fixed top-0 bottom-0 z-50 w-[500px] max-w-[95vw] bg-white shadow-xl overflow-y-auto ${isRTL ? "left-0" : "right-0"}`}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-slate-800">{copy.drawerTitle}</h2>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] text-slate-500 mb-1">{finding.findingId}</p>
              <h3 className="text-[15px] font-bold text-slate-900">{finding.title}</h3>
            </div>
            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${sevClass(finding.severity as string)}`}>{finding.severity as string}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {[
              [copy.findingType, finding.findingType],
              [copy.colStatus, finding.status],
              [copy.project, finding.projectName ?? finding.projectCode ?? "—"],
              [copy.assignedTo, finding.assignedTo ?? "—"],
              [copy.targetDate, finding.targetDate ?? "—"],
              [copy.createdDate, finding.createdDate ?? "—"],
              [copy.resolvedDate, finding.resolvedDate ?? "—"],
              [copy.refTable, finding.referenceTable ?? "—"],
            ].map(([l, v]) => (
              <div key={l} className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{l}</p>
                <p className="font-medium text-slate-700">{v}</p>
              </div>
            ))}
          </div>

          {finding.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{copy.description}</p>
              <p className="text-[12px] text-slate-700 leading-5">{finding.description as string}</p>
            </div>
          )}

          {finding.recommendation && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{copy.recommendation}</p>
              <p className="text-[12px] text-slate-700 leading-5">{finding.recommendation as string}</p>
            </div>
          )}

          {finding.hasAiRecommendation && <AIPanel findingId={finding.findingId} copy={copy} />}
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialComplianceFindings() {
  const { language, isRTL } = useLanguage();
  const copy = T[language] as typeof T["en"];
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [findingType, setFindingType] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortCol, setSortCol] = useState("createdDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerFinding, setDrawerFinding] = useState<ComplianceFindingRecord | null>(null);

  const filterInput = {
    fiscalYear: fiscalYear || undefined, findingType: findingType || undefined,
    severity: severity || undefined, status: status || undefined,
    search: search || undefined, page, pageSize, sortBy: sortCol, sortDir,
  };

  const statsQ = useQuery({
    queryKey: ["comp-find.stats", fiscalYear, findingType, severity, status],
    queryFn: () => financeQuery("getComplianceFindingsStats", { fiscalYear: fiscalYear || undefined }),
  });

  const dataQ = useQuery({
    queryKey: ["comp-find.data", ...Object.values(filterInput)],
    queryFn: () => financeQuery("getComplianceFindingsPaginated", filterInput),
    placeholderData: (prev) => prev,
  });

  const metaQ = useQuery({ queryKey: ["fin.meta"], queryFn: () => financeQuery("getFilterMetadata", {}) });

  const stats = (statsQ.data ?? EMPTY_COMPLIANCE_FINDINGS_STATS) as ComplianceFindingsStats;
  const paginated = (dataQ.data ?? { data: [], total: 0, page: 1, pageSize, totalPages: 0 }) as PaginatedResponse<ComplianceFindingRecord>;
  const rows = paginated.data;
  const meta = metaQ.data as { fiscalYears?: string[] } | undefined;
  const totalPages = paginated.totalPages || Math.ceil(paginated.total / pageSize) || 1;

  function handleSort(col: string) {
    if (sortCol === col) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); }
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const fyOptions = [{ value: "", label: language === "ar" ? "كل السنوات" : "All Years" }, ...(meta?.fiscalYears ?? []).map((y) => ({ value: y, label: `FY${y}` }))];

  const SortIcon = ({ col }: { col: string }) => (
    <span className="inline-block ml-1 opacity-50">{sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-[1600px] space-y-4 p-6 font-['Inter']">

        <FinancePageHeader
          title={copy.pageTitle} subtitle={copy.subtitle} icon={FileSearch}
          updatedLabel={copy.updated} refreshLabel={copy.refresh} exportLabel={copy.export}
          onRefresh={() => { statsQ.refetch(); dataQ.refetch(); }}
          onExport={() => financeQuery("exportComplianceFindings", { ...filterInput, format: "excel" })}
        />

        <button onClick={() => navigate("/finance/compliance")} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#003b70] hover:underline">
          <ChevronLeft className="h-4 w-4" />{copy.backToDashboard}
        </button>

        {/* KPI Strip */}
        {statsQ.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="rounded-[10px] border border-slate-200 bg-white p-3"><LoadingSkeleton variant="kpi" /></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
            <FinanceKpiCard label={copy.open}           value={stats.open}           icon={ShieldX} valueColor="text-red-600" />
            <FinanceKpiCard label={copy.critical}       value={stats.critical}        icon={XCircle} valueColor="text-red-600" />
            <FinanceKpiCard label={copy.high}           value={stats.high}            icon={AlertTriangle} valueColor="text-orange-600" />
            <FinanceKpiCard label={copy.medium}         value={stats.medium}          icon={Flag} valueColor="text-amber-600" />
            <FinanceKpiCard label={copy.low}            value={stats.low}             icon={ShieldCheck} valueColor="text-green-700" />
            <FinanceKpiCard label={copy.resolved}       value={stats.resolved}        icon={CheckCircle2} valueColor="text-green-700" />
            <FinanceKpiCard label={copy.overdue}        value={stats.overdue}         icon={Clock} valueColor={stats.overdue > 0 ? "text-red-600" : undefined} />
            <FinanceKpiCard label={copy.avgResolution}  value={`${stats.avgResolutionDays.toFixed(0)}d`} icon={Clock} />
            <FinanceKpiCard label={copy.auditReadiness} value={`${stats.auditReadiness.toFixed(0)}%`} icon={Shield} valueColor="text-green-700" />
            <FinanceKpiCard label={copy.complianceScore}value={`${stats.complianceScore.toFixed(0)}%`} icon={TrendingUp} />
          </div>
        )}

        {/* Filter Bar */}
        <FinanceCard noPadding>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className={`h-9 w-full rounded border border-slate-300 bg-white text-[13px] outline-none focus:ring-2 ring-blue-200 ${isRTL ? "pr-10 pl-3" : "pl-10 pr-3"}`}
                placeholder={copy.search} />
            </div>

            <select value={fiscalYear} onChange={(e) => { setFiscalYear(e.target.value); setPage(1); }}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 ring-blue-200">
              {fyOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select value={findingType} onChange={(e) => { setFindingType(e.target.value); setPage(1); }}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 ring-blue-200">
              <option value="">{copy.findingType}</option>
              {["Audit","Budget Overrun","Document Missing","Advance Overdue","Bank Reconciliation","Journal Validation","Policy Violation","Procurement"].map((t) =>
                <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 ring-blue-200">
              <option value="">{copy.severity}</option>
              {["critical","high","medium","low"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>

            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 ring-blue-200">
              <option value="">{copy.colStatus}</option>
              {["open","in-progress","resolved","overdue","closed"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>

            {(search || fiscalYear || findingType || severity || status) && (
              <button onClick={() => { setSearch(""); setFiscalYear(""); setFindingType(""); setSeverity(""); setStatus(""); setPage(1); }}
                className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">
                <X className="h-3.5 w-3.5" />{copy.clearFilters}
              </button>
            )}

            <div className="flex gap-1.5 ms-auto">
              {([["Excel","excel"],["CSV","csv"],["PDF","pdf"]] as const).map(([label, fmt]) => (
                <button key={label} onClick={() => financeQuery("exportComplianceFindings", { ...filterInput, format: fmt })}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
        </FinanceCard>

        {/* Data Grid */}
        <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.06)]">
          {selected.size > 0 && (
            <div className="flex items-center gap-3 border-b border-slate-200 bg-blue-50 px-4 py-2.5">
              <span className="text-[12px] font-semibold text-blue-700">{selected.size} selected</span>
              <button onClick={() => financeQuery("exportComplianceFindings", { ids: Array.from(selected), format: "excel" })}
                className="inline-flex items-center gap-1.5 rounded bg-[#003b70] px-3 py-1.5 text-[11px] font-bold text-white">
                <Download className="h-3.5 w-3.5" />{copy.bulkExport}
              </button>
              <button onClick={() => setSelected(new Set())} className="ms-auto text-slate-500 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-3 w-10">
                    <input type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={() => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)))}
                      className="rounded border-slate-300" />
                  </th>
                  {[
                    { key: "findingId", label: copy.findingId, sort: true },
                    { key: "title",     label: copy.title,     sort: true },
                    { key: "findingType",label: copy.findingType, sort: true },
                    { key: "severity",  label: copy.severity,  sort: true },
                    { key: "projectCode",label: copy.project },
                    { key: "assignedTo",label: copy.assignedTo },
                    { key: "targetDate",label: copy.targetDate, sort: true },
                    { key: "status",    label: copy.colStatus,  sort: true },
                    { key: "createdDate",label: copy.createdDate, sort: true },
                    { key: "hasAiRecommendation", label: copy.aiRec },
                  ].map((col) => (
                    <th key={col.key} onClick={col.sort ? () => handleSort(col.key) : undefined}
                      className={`border-b border-slate-200 px-3 py-3 text-start font-bold whitespace-nowrap ${col.sort ? "cursor-pointer select-none hover:bg-slate-100" : ""}`}>
                      {col.label}{col.sort && <SortIcon col={col.key} />}
                    </th>
                  ))}
                  <th className="border-b border-slate-200 px-3 py-3 text-start font-bold">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {dataQ.isLoading ? (
                  <tr><td colSpan={12} className="px-4 py-8"><LoadingSkeleton variant="table" rows={8} /></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={12}><EmptyState message={copy.noFindings} className="py-12" /></td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} onClick={() => setDrawerFinding(row)}
                    className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer">
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300" />
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#003b70] whitespace-nowrap">{row.findingId}</td>
                    <td className="px-3 py-2.5 max-w-[200px]"><p className="truncate font-medium text-slate-800" title={row.title}>{row.title}</p></td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{row.findingType}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${sevClass(row.severity as string)}`}>{row.severity as string}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700 whitespace-nowrap">{row.projectCode ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{row.assignedTo ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap" dir="ltr">{row.targetDate ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${statusClass(row.status as string)}`}>{row.status as string}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap" dir="ltr">{row.createdDate ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {row.hasAiRecommendation && 
                      <Bot
                            className="h-4 w-4 text-blue-500 mx-auto"
                            aria-label="Has AI recommendation"
                        />}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setDrawerFinding(row)}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap">
                        <ExternalLink className="h-3 w-3" />{copy.viewDetails}
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

      <FindingDetailDrawer finding={drawerFinding} onClose={() => setDrawerFinding(null)} copy={copy} isRTL={isRTL} />
    </div>
  );
}
