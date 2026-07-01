import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, Clock, Flag, Shield, ShieldAlert, ShieldCheck,
  TrendingDown, TrendingUp, XCircle, Zap,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  EMPTY_RISK_SCORE,
  type RiskRegisterRow, type RiskScoreData,
} from "@/lib/financeRouterTypes";
import {
  FinanceCard, WidgetHeader, ChartWrapper,
  FinanceKpiCard, AIRecommendationPanel,
  RiskBadge, RiskStatusChip,
  ExecutiveTable, type TableColumn,
  LoadingSkeleton, EmptyState,
  FINANCE_COLORS, type RiskLevel,
} from "@/components/finance/fdashboard";

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    title: "Financial Risk Center",
    subtitle: "Enterprise Risk Intelligence & Monitoring",
    updated: "Last updated",
    refresh: "Refresh",
    export: "Export Report",
    filters: "More Filters",
    fiscalYear: "Fiscal Year: FY2024",
    allProjects: "All Projects",
    allGrants: "All Grants",
    allRiskTypes: "All Risk Types",
    search: "Search risks, projects, or grants...",
    totalRisks: "Total Risks",
    criticalRisks: "Critical Risks",
    highRisks: "High Risks",
    mediumRisks: "Medium Risks",
    lowRisks: "Low Risks",
    financialImpact: "Est. Financial Impact",
    mitigated: "Mitigated",
    open: "Open",
    heatMap: "Risk Heat Map",
    heatMapSub: "Probability × Impact Matrix",
    riskByCategory: "Risk by Category",
    riskTrend: "Risk Trend (12 Months)",
    riskRegister: "Risk Register",
    aiRecommendations: "AI Risk Recommendations",
    riskForecast: "Risk Forecast",
    riskDistribution: "Risk Distribution",
    riskId: "Risk ID",
    description: "Description",
    category: "Category",
    probability: "Probability",
    impact: "Impact",
    severity: "Severity",
    owner: "Owner",
    dueDate: "Due Date",
    status: "Status",
    financialImpactCol: "Fin. Impact",
    mitigation: "Mitigation",
    probAxis: "Probability",
    impactAxis: "Impact",
    filterRisk: "Filter risks...",
    noRisks: "No risks match the current filter.",
    acknowledge: "Acknowledge",
    viewDetails: "View Details",
    loading: "Loading data...",
    error: "Error loading data",
    empty: "No data available",
    overallScore: "Overall Risk Score",
    exposure: "Risk Exposure",
    activeRisks: "Active Risks",
    riskByDimension: "Risk by Dimension",
  },
  ar: {
    title: "مركز المخاطر المالية",
    subtitle: "ذكاء ومراقبة المخاطر المؤسسية",
    updated: "آخر تحديث",
    refresh: "تحديث",
    export: "تصدير التقرير",
    filters: "مرشحات إضافية",
    fiscalYear: "السنة المالية: FY2024",
    allProjects: "كل المشاريع",
    allGrants: "كل المنح",
    allRiskTypes: "كل أنواع المخاطر",
    search: "بحث في المخاطر أو المشاريع أو المنح...",
    totalRisks: "إجمالي المخاطر",
    criticalRisks: "مخاطر حرجة",
    highRisks: "مخاطر عالية",
    mediumRisks: "مخاطر متوسطة",
    lowRisks: "مخاطر منخفضة",
    financialImpact: "التأثير المالي التقديري",
    mitigated: "مخففة",
    open: "مفتوحة",
    heatMap: "خريطة حرارة المخاطر",
    heatMapSub: "مصفوفة الاحتمالية × التأثير",
    riskByCategory: "المخاطر حسب الفئة",
    riskTrend: "اتجاه المخاطر (12 شهراً)",
    riskRegister: "سجل المخاطر",
    aiRecommendations: "توصيات الذكاء الاصطناعي",
    riskForecast: "توقعات المخاطر",
    riskDistribution: "توزيع المخاطر",
    riskId: "رمز الخطر",
    description: "الوصف",
    category: "الفئة",
    probability: "الاحتمالية",
    impact: "التأثير",
    severity: "الخطورة",
    owner: "المسؤول",
    dueDate: "تاريخ الاستحقاق",
    status: "الحالة",
    financialImpactCol: "التأثير المالي",
    mitigation: "خطة التخفيف",
    probAxis: "الاحتمالية",
    impactAxis: "التأثير",
    filterRisk: "تصفية المخاطر...",
    noRisks: "لا توجد مخاطر تطابق المرشح الحالي.",
    acknowledge: "اعتماد",
    viewDetails: "عرض التفاصيل",
    loading: "جاري تحميل البيانات...",
    error: "خطأ في تحميل البيانات",
    empty: "لا توجد بيانات متاحة",
    overallScore: "مؤشر المخاطر العام",
    exposure: "التعرض للمخاطر",
    activeRisks: "المخاطر النشطة",
    riskByDimension: "المخاطر حسب البعد",
  },
  it: {
    title: "Centro dei Rischi Finanziari",
    subtitle: "Piattaforma di Intelligence e Monitoraggio dei Rischi Aziendali",
    updated: "Ultimo aggiornamento",
    refresh: "Aggiorna",
    export: "Esporta Report",
    filters: "Altri Filtri",
    fiscalYear: "Anno Fiscale: FY2024",
    allProjects: "Tutti i Progetti",
    allGrants: "Tutte le Sovvenzioni",
    allRiskTypes: "Tutti i Tipi di Rischio",
    search: "Cerca rischi, progetti o sovvenzioni...",
    totalRisks: "Rischi Totali",
    criticalRisks: "Rischi Critici",
    highRisks: "Rischi Elevati",
    mediumRisks: "Rischi Medi",
    lowRisks: "Rischi Bassi",
    financialImpact: "Impatto Finanziario Stimato",
    mitigated: "Mitigato",
    open: "Aperto",
    heatMap: "Mappa di Calore dei Rischi",
    heatMapSub: "Matrice Probabilità × Impatto",
    riskByCategory: "Rischi per Categoria",
    riskTrend: "Andamento dei Rischi (12 Mesi)",
    riskRegister: "Registro dei Rischi",
    aiRecommendations: "Raccomandazioni AI sui Rischi",
    riskForecast: "Previsione dei Rischi",
    riskDistribution: "Distribuzione dei Rischi",
    riskId: "ID Rischio",
    description: "Descrizione",
    category: "Categoria",
    probability: "Probabilità",
    impact: "Impatto",
    severity: "Gravità",
    owner: "Proprietario",
    dueDate: "Data di Scadenza",
    status: "Stato",
    financialImpactCol: "Impatto Fin.",
    mitigation: "Mitigazione",
    probAxis: "Probabilità",
    impactAxis: "Impatto",
    filterRisk: "Filtra rischi...",
    noRisks: "Nessun rischio corrisponde al filtro corrente.",
    acknowledge: "Conferma",
    viewDetails: "Visualizza Dettagli",
    loading: "Caricamento dati...",
    error: "Errore nel caricamento dei dati",
    empty: "Nessun dato disponibile",
    overallScore: "Punteggio Complessivo del Rischio",
    exposure: "Esposizione al Rischio",
    activeRisks: "Rischi Attivi",
    riskByDimension: "Rischio per Dimensione",
  },
} as const;

// ─── Heat Map constants ───────────────────────────────────────────────────────
const HEAT_LEVELS = [5, 4, 3, 2, 1];
const HEAT_IMPACTS = [1, 2, 3, 4, 5];
const PROB_LABELS = ["Very Low", "Low", "Medium", "High", "Very High"];
const IMPACT_LABELS = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];
function heatBg(p: number, i: number) { const s = p * i; return s >= 16 ? "#fee2e2" : s >= 9 ? "#ffedd5" : s >= 4 ? "#fef9c3" : "#dcfce7"; }
function heatBd(p: number, i: number) { const s = p * i; return s >= 16 ? "#ef4444" : s >= 9 ? "#f97316" : s >= 4 ? "#eab308" : "#22c55e"; }

// Normalise severity from router (may be "critical"|"high"|"medium"|"low")
function toRiskLevel(s: string): RiskLevel {
  const m: Record<string, RiskLevel> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
  return m[s?.toLowerCase()] ?? "Low";
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FinancialRiskCenter() {
  const { language, isRTL } = useLanguage();
  const copy = T[language];
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<RiskLevel | "All">("All");
  const [fiscalYear, setFiscalYear] = useState("");
  const [projectId, setProjectId] = useState<number | undefined>(undefined);

  // Filter Meta Query
  const filterMeta = trpc.financeDashboard.getFilterMeta.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Get selected project for auto-populated donor
  const selectedProject = useMemo(() => {
    if (!projectId || !filterMeta.data?.projects) return undefined;
    return filterMeta.data.projects.find((p) => p.id === projectId);
  }, [projectId, filterMeta.data?.projects]);

  const filterInput = { fiscalYear: fiscalYear || undefined, projectIds: projectId ? [projectId] : undefined };

  // ─── Live tRPC Queries ────────────────────────────────────────────────────
  const scoreQuery      = trpc.financeDashboard.getRiskScore.useQuery(filterInput);
  const trendQuery      = trpc.financeDashboard.getRiskTrend.useQuery({ ...filterInput, months: 12 });
  const distQuery       = trpc.financeDashboard.getRiskDistribution.useQuery(filterInput);
  const dimensionsQuery = trpc.financeDashboard.getRiskDimensions.useQuery(filterInput);
  const registerQuery   = trpc.financeDashboard.getFinancialRisksRegister.useQuery({ ...filterInput, limit: 50 });
  const aiRecsQuery     = trpc.financeDashboard.getAIRecommendations.useQuery({ ...filterInput, category: "Risk", limit: 3 });

  // ─── Resolved data ────────────────────────────────────────────────────────
  const scoreData   = (scoreQuery.data ?? EMPTY_RISK_SCORE) as RiskScoreData;
  const trendData   = trendQuery.data ?? [];
  const distData    = distQuery.data ?? [];
  const dimensions  = dimensionsQuery.data ?? [];
  const registerRows= (registerQuery.data ?? []) as RiskRegisterRow[];
  const aiRecs      = aiRecsQuery.data ?? [];
  const meta        = filterMeta.data;

  // Count by level
  const levelCounts = distData.reduce(
    (acc, d) => { acc[d.name.toLowerCase()] = d.value; return acc; },
    {} as Record<string, number>,
  );

  // Filter register rows
  const filteredRows = useMemo(() => {
    let rows = registerRows.filter((r) => {
      const q = query.toLowerCase();
      return !q || r.riskId.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    });
    if (severityFilter !== "All") rows = rows.filter((r) => toRiskLevel(r.severity) === severityFilter);
    return rows;
  }, [registerRows, query, severityFilter]);

  // Map dimensions to radar chart data
  const radarData = dimensions.map((d) => ({ subject: d.dimension, score: d.score }));

  // Map dimensions to bar chart
  const dimBarData = dimensions.map((d) => ({
    name: d.dimension,
    score: d.score,
    fill: d.score >= 80 ? FINANCE_COLORS.success : d.score >= 60 ? FINANCE_COLORS.warning : FINANCE_COLORS.critical,
  }));

  // Build heat cell map from register rows
  const heatCells: Record<string, number> = {};
  filterableRows(registerRows).forEach((r) => {
    const p = Math.min(5, Math.max(1, Math.ceil(r.probability)));
    const i = Math.min(5, Math.max(1, Math.ceil(r.impact)));
    const key = `${p}-${i}`;
    heatCells[key] = (heatCells[key] ?? 0) + 1;
  });

  // Map AI recs
  const mappedAiRecs = aiRecs.map((r, i) => ({
    id: r.id ?? `ai-${i}`,
    priority: (r.priority === "high" || r.priority === "critical" ? (r.priority === "critical" ? "Critical" : "High") : "Medium") as "Critical" | "High" | "Medium" | "Low",
    category: r.category,
    confidence: r.confidence,
    impact: (r.impact === "high" ? "High" : r.impact === "low" ? "Low" : "Medium") as "High" | "Medium" | "Low",
    reason: r.reason ?? r.title ?? "",
    action: r.action ?? "",
  }));

  // Table columns
  const columns: TableColumn<RiskRegisterRow>[] = [
    { key: "riskId", label: copy.riskId, sortable: true, render: (r) => <span className="font-mono font-bold text-[#003b70]">{r.riskId}</span> },
    { key: "description", label: copy.description, render: (r) => <p className="max-w-[200px] truncate font-medium text-slate-800" title={r.description as string}>{r.description as string}</p> },
    { key: "category", label: copy.category },
    { key: "probability", label: copy.probability, sortable: true, ltr: true, render: (r) => (
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-14 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-[#003b70]" style={{ width: `${((r.probability as number) / 5) * 100}%` }} /></div>
        <span className="font-mono text-[10px]">{r.probability}/5</span>
      </div>
    )},
    { key: "impact", label: copy.impact, sortable: true, ltr: true, render: (r) => (
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-14 rounded-full bg-slate-200"><div className="h-1.5 rounded-full" style={{ width: `${((r.impact as number) / 5) * 100}%`, background: FINANCE_COLORS.critical }} /></div>
        <span className="font-mono text-[10px]">{r.impact}/5</span>
      </div>
    )},
    { key: "severity", label: copy.severity, sortable: true, render: (r) => <RiskBadge level={toRiskLevel(r.severity as string)} /> },
    { key: "owner", label: copy.owner },
    { key: "dueDate", label: copy.dueDate, ltr: true, render: (r) => <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap">{r.dueDate as string}</span> },
    { key: "status", label: copy.status, render: (r) => <RiskStatusChip status={(r.status === "active" ? "Open" : r.status === "monitoring" ? "In Progress" : "Accepted") as "Open" | "In Progress" | "Mitigated" | "Accepted"} /> },
  ];

  const fyOptions = meta?.fiscalYears ?? [];
  const projectOptions = [
        {
            value: "",
            label: copy.allProjects,
        },
        ...(meta?.projects ?? []).map((p) => ({
            value: p.projectCode ?? "",
            label: p.projectCode ?? "",
        })),
        ];
  const projectDonor = selectedProject?.donor;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6 text-slate-900" dir={isRTL ? "rtl" : "ltr"}>

        {/* Page Title with Icon and Last Updated/Refresh */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-600 p-3">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1>
              <p className="text-sm text-slate-600 mt-1">{copy.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 whitespace-nowrap">{copy.updated} {new Date().toLocaleString()}</span>
            <button
              onClick={() => { scoreQuery.refetch(); trendQuery.refetch(); registerQuery.refetch(); }}
              className="px-4 py-2 rounded border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 transition whitespace-nowrap"
            >
              {copy.refresh}
            </button>
          </div>
        </div>

        {/* Filter Bar: FY | ProjectCode | Donor | Last Updated | Refresh */}
        <div className="flex items-center justify-between gap-6 bg-white rounded-[10px] border border-slate-200 p-4">
          <div className="flex items-center gap-6 flex-1">
            {/* Fiscal Year */}
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value || "")}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-blue-200 min-w-[100px]"
            >
              {fyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {/* Project Code */}
            <select
              value={projectId || 0}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-blue-200 min-w-[120px]"
            >
              {projectOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            {/* Donor (Display-only, auto-populated from project.donor) */}
            <input
              type="text"
              value={projectDonor || ""}
              placeholder="Donor"
              disabled
              className="h-9 rounded border border-slate-300 bg-gray-50 px-3 text-[13px] outline-none disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
            />
          </div>
        </div>

        {/* Quick Filters for Risk Severity */}
        <div className="flex items-center gap-3 bg-white rounded-[10px] border border-slate-200 p-4">
          <span className="text-[13px] font-medium text-slate-700">Risk Level:</span>
          {[
            { label: "All", value: "All" },
            { label: "Critical", value: "Critical" },
            { label: "High", value: "High" },
            { label: "Medium", value: "Medium" },
            { label: "Low", value: "Low" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSeverityFilter(filter.value as RiskLevel | "All")}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition ${
                severityFilter === filter.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* KPI Strip */}
        {scoreQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-[10px] border border-slate-200 bg-white p-3"><LoadingSkeleton variant="kpi" /></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <FinanceKpiCard label={copy.overallScore}   value={`${scoreData.overallScore.toFixed(0)}/100`}  meta={scoreData.level}      icon={Shield} />
            <FinanceKpiCard label={copy.exposure}       value={`$${(scoreData.totalExposure / 1e6).toFixed(1)}M`} icon={Zap} />
            <FinanceKpiCard label={copy.activeRisks}    value={scoreData.activeRiskCount}                   icon={AlertTriangle} />
            <FinanceKpiCard label={copy.criticalRisks}  value={levelCounts.critical ?? 0}  valueColor="text-red-600"   icon={XCircle} />
            <FinanceKpiCard label={copy.highRisks}      value={levelCounts.high ?? 0}      valueColor="text-orange-600" icon={AlertTriangle} />
            <FinanceKpiCard label={copy.mediumRisks}    value={levelCounts.medium ?? 0}    valueColor="text-amber-600" icon={Flag} />
            <FinanceKpiCard label={copy.lowRisks}       value={levelCounts.low ?? 0}       valueColor="text-green-700" icon={ShieldCheck} />
            <FinanceKpiCard label="Trend"               value={scoreData.trend}             icon={scoreData.trend === "increasing" ? TrendingUp : TrendingDown} />
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_300px] min-w-0">
          <div className="space-y-4">

            {/* Heat Map + Forecast */}
            <div className="grid gap-4 md:grid-cols-2">
              <FinanceCard noPadding>
                <WidgetHeader title={copy.heatMap} subtitle={copy.heatMapSub} icon={<Shield className="h-4 w-4" />} />
                <div className="p-4">
                  <div className="flex gap-2">
                    <div className="flex w-6 shrink-0 flex-col items-center justify-center">
                      <span className="rotate-[-90deg] whitespace-nowrap text-[9px] font-bold uppercase tracking-widest text-slate-400">Probability</span>
                    </div>
                    <div className="flex-1">
                      {HEAT_LEVELS.map((prob) => (
                        <div key={prob} className="mb-1 flex items-center gap-1">
                          <span className="w-16 shrink-0 text-right text-[9px] text-slate-500">{PROB_LABELS[prob - 1]}</span>
                          <div className="flex flex-1 gap-1">
                            {HEAT_IMPACTS.map((impact) => {
                              const cnt = heatCells[`${prob}-${impact}`] ?? 0;
                              return (
                                <div key={impact} className="flex aspect-square flex-1 cursor-pointer items-center justify-center rounded text-[11px] font-bold transition-transform hover:scale-105" style={{ background: heatBg(prob, impact), border: `1.5px solid ${heatBd(prob, impact)}` }}>
                                  {cnt || ""}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div className="mt-1 flex gap-1">
                        <div className="w-16 shrink-0" />
                        <div className="flex flex-1 gap-1">{IMPACT_LABELS.map((l) => <span key={l} className="flex-1 text-center text-[8px] leading-tight text-slate-400">{l}</span>)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                    {[["Critical","#fee2e2","#ef4444"],["High","#ffedd5","#f97316"],["Medium","#fef9c3","#eab308"],["Low","#dcfce7","#22c55e"]].map(([l,bg,bd]) => (
                      <span key={l} className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                        <span className="h-3 w-5 rounded" style={{ background: bg, border: `1.5px solid ${bd}` }} />{l}
                      </span>
                    ))}
                  </div>
                </div>
              </FinanceCard>

              <FinanceCard noPadding>
                <WidgetHeader title={copy.riskForecast} icon={<TrendingDown className="h-4 w-4" />} />
                <div className="p-4 space-y-3">
                  {scoreQuery.isLoading ? <LoadingSkeleton variant="text" rows={4} /> : (
                    <>
                      <div className="space-y-2">
                        {[
                          ["Current Score", `${scoreData.overallScore.toFixed(0)}/100`, scoreData.overallScore >= 70 ? "text-red-600" : "text-green-700"],
                          ["Risk Level", scoreData.level, "text-slate-700"],
                          ["Score Trend", scoreData.trend, "text-slate-600"],
                          ["Active Risks", String(scoreData.activeRiskCount), "text-[#003b70]"],
                        ].map(([l, v, c]) => (
                          <div key={l} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600">{l}</span>
                            <span className={`font-mono font-bold capitalize ${c}`} dir="ltr">{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-2">Score Breakdown</p>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${scoreData.overallScore}%`, background: scoreData.overallScore >= 70 ? FINANCE_COLORS.critical : scoreData.overallScore >= 40 ? FINANCE_COLORS.warning : FINANCE_COLORS.success }} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </FinanceCard>
            </div>

            {/* Risk Trend + Risk by Dimension */}
            <div className="grid gap-4 md:grid-cols-2">
              <ChartWrapper title={copy.riskTrend} chartHeight="h-[230px]" isLoading={trendQuery.isLoading} isEmpty={!trendQuery.isLoading && trendData.length === 0} showDownload>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid stroke="#e7ebf0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip />
                    <ReferenceLine y={70} stroke={FINANCE_COLORS.critical} strokeDasharray="4 2" label={{ value: "High", fontSize: 9, fill: FINANCE_COLORS.critical }} />
                    <Area type="monotone" dataKey="riskScore" name="Risk Score" stroke={FINANCE_COLORS.critical} fill="#fee2e230" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartWrapper>

              <ChartWrapper title={copy.riskByDimension} chartHeight="h-[280px]" isLoading={dimensionsQuery.isLoading} isEmpty={!dimensionsQuery.isLoading && dimBarData.length === 0}>
                <div className="h-[280px] overflow-y-auto">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dimBarData} layout="vertical" barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7ebf0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                    <Tooltip formatter={(v) => [`${v}%`, "Risk Score"]} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {dimBarData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartWrapper>
            </div>

        {/* Risk Register */}

        <ExecutiveTable<RiskRegisterRow>
              columns={columns}
              data={filteredRows}
              rowKey={(_, i) => i}
              showExport
              exportLabel="Export"
              searchable={false}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Distribution */}
            <FinanceCard noPadding>
              <WidgetHeader title={copy.riskDistribution} icon={<Flag className="h-4 w-4" />} />
              {distQuery.isLoading ? <div className="p-4"><LoadingSkeleton variant="chart" /></div> : distData.length === 0 ? <EmptyState message="No risk data." className="py-6" /> : (
                <div className="p-4">
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={distData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                          {distData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v} risks`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {distData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} /><span className="font-medium text-slate-700">{d.name}</span></span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-slate-100"><div className="h-1.5 rounded-full" style={{ background: d.fill, width: `${Math.max(4, (d.value / Math.max(1, distData.reduce((s, x) => s + x.value, 0))) * 100)}%` }} /></div>
                          <span className="font-mono font-bold w-4 text-right" dir="ltr">{d.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </FinanceCard>

            {/* AI Recommendations */}
            {aiRecsQuery.isLoading ? <FinanceCard><LoadingSkeleton variant="card" /></FinanceCard>
              : mappedAiRecs.length === 0 ? <FinanceCard><EmptyState message="No AI risk recommendations." /></FinanceCard>
              : <AIRecommendationPanel title={copy.aiRecommendations} recommendations={mappedAiRecs} acknowledgeLabel={copy.acknowledge} viewDetailsLabel={copy.viewDetails} />}

            {/* Radar */}
            {radarData.length > 0 && (
              <FinanceCard noPadding>
                <WidgetHeader title="Risk Radar" icon={<ShieldAlert className="h-4 w-4" />} />
                <div className="p-2 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e7ebf0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                      <Radar dataKey="score" stroke={FINANCE_COLORS.critical} fill={FINANCE_COLORS.critical} fillOpacity={0.18} />
                      <Tooltip formatter={(v) => [`${v}%`, "Risk Score"]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </FinanceCard>
            )}
          </aside>
        </div>
    </div>
  );
}

function filterableRows(rows: RiskRegisterRow[]) { return rows; }