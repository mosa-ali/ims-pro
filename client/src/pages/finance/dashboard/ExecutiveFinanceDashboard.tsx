import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList,
  Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Banknote, Bell, CheckCircle2, Clock, FileCheck2, Landmark,
  PackageCheck, ReceiptText, ShieldCheck, ShoppingCart, WalletCards,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  EMPTY_KPI, EMPTY_WATERFALL, EMPTY_P2P, EMPTY_COMPLIANCE, EMPTY_HEALTH,
  type KPICardsData, type HealthDimension,
} from "@/lib/financeRouterTypes";
import {
  FinanceCard, WidgetHeader, FinancePageHeader,
  FinanceKpiCard, FinanceFilterBar, ChartWrapper,
  AIRecommendationPanel, AlertCard,
  RiskBadge, VarianceChip,
  ExecutiveTable, type TableColumn,
  LoadingSkeleton, EmptyState,
  CHART_COLORS, FINANCE_COLORS,
} from "@/components/finance/fdashboard";

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    title: "Executive Financial Intelligence Dashboard",
    subtitle: "Enterprise Financial Intelligence Platform",
    search: "Search for transactions, grants, or projects...",
    updated: "Last updated",
    refresh: "Refresh",
    export: "Export Report",
    fiscal: "Fiscal Year",
    projects: "All Projects",
    grants: "All Grants",
    regions: "All Regions",
    filters: "More Filters",
    totalBudget: "Total Budget",
    actualSpent: "Actual Spent",
    commitments: "Commitments",
    cash: "Cash On Hand",
    burn: "Burn Rate",
    utilization: "Utilization %",
    ap: "A/P",
    ar: "A/R",
    budgetTrend: "Budget vs Actual Trend (YTD)",
    waterfall: "Cash Position Waterfall",
    riskAlerts: "Risk Alerts",
    p2p: "Procure-to-Pay Pipeline",
    compliance: "Financial Compliance",
    matrix: "Financial Health Matrix",
    insights: "AI Insights",
    export_data: "Export Data",
    filterProject: "Filter project...",
    projectId: "Project ID",
    grantSource: "Grant Source",
    budget: "Budget",
    spent: "Spent",
    committed: "Committed",
    remaining: "Remaining",
    util: "Util %",
    variance: "Var %",
    risk: "Risk",
    acknowledge: "Acknowledge",
    reallocate: "Reallocate",
    riskDistribution: "Risk Distribution",
    stable: "Stable",
    dimension: "Dimension",
    score: "Score",
    status: "Status",
    weight: "Weight",
    trend: "Trend",
  },
  ar: {
    title: "لوحة الاستخبارات المالية التنفيذية",
    subtitle: "منصة الاستخبارات المالية المؤسسية",
    search: "بحث في المعاملات أو المنح أو المشاريع...",
    updated: "آخر تحديث",
    refresh: "تحديث",
    export: "تصدير التقرير",
    fiscal: "السنة المالية",
    projects: "كل المشاريع",
    grants: "كل المنح",
    regions: "كل المناطق",
    filters: "مرشحات إضافية",
    totalBudget: "إجمالي الميزانية",
    actualSpent: "المصروف الفعلي",
    commitments: "الالتزامات",
    cash: "النقد المتاح",
    burn: "معدل الصرف",
    utilization: "نسبة الاستخدام",
    ap: "الدائنون",
    ar: "المدينون",
    budgetTrend: "اتجاه الميزانية مقابل الفعلي",
    waterfall: "تحليل وضع النقد",
    riskAlerts: "تنبيهات المخاطر",
    p2p: "دورة الشراء إلى الدفع",
    compliance: "الامتثال المالي",
    matrix: "مصفوفة الصحة المالية",
    insights: "رؤى الذكاء الاصطناعي",
    export_data: "تصدير البيانات",
    filterProject: "تصفية المشروع...",
    projectId: "رمز المشروع",
    grantSource: "مصدر المنحة",
    budget: "الميزانية",
    spent: "المصروف",
    committed: "ملتزم",
    remaining: "المتبقي",
    util: "الاستخدام %",
    variance: "التباين %",
    risk: "المخاطر",
    acknowledge: "اعتماد",
    reallocate: "إعادة تخصيص",
    riskDistribution: "توزيع المخاطر",
    stable: "مستقر",
    dimension: "البعد",
    score: "النقاط",
    status: "الحالة",
    weight: "الوزن",
    trend: "الاتجاه",
  },

  it: {
    title: "Dashboard Esecutiva di Business Intelligence Finanziaria",
    subtitle: "Piattaforma di Business Intelligence Finanziaria Aziendale",
    search: "Cerca transazioni, sovvenzioni o progetti...",
    updated: "Ultimo aggiornamento",
    refresh: "Aggiorna",
    export: "Esporta Report",
    fiscal: "Anno Fiscale",
    projects: "Tutti i Progetti",
    grants: "Tutte le Sovvenzioni",
    regions: "Tutte le Regioni",
    filters: "Altri Filtri",
    totalBudget: "Budget Totale",
    actualSpent: "Spesa Effettiva",
    commitments: "Impegni",
    cash: "Liquidità Disponibile",
    burn: "Tasso di Spesa",
    utilization: "Utilizzo %",
    ap: "Debiti (A/P)",
    ar: "Crediti (A/R)",
    budgetTrend: "Andamento Budget vs Spesa Effettiva (YTD)",
    waterfall: "Analisi della Posizione di Cassa",
    riskAlerts: "Avvisi di Rischio",
    p2p: "Processo Procure-to-Pay",
    compliance: "Conformità Finanziaria",
    matrix: "Matrice della Salute Finanziaria",
    insights: "Insight AI",
    export_data: "Esporta Dati",
    filterProject: "Filtra progetto...",
    projectId: "ID Progetto",
    grantSource: "Fonte del Finanziamento",
    budget: "Budget",
    spent: "Speso",
    committed: "Impegnato",
    remaining: "Residuo",
    util: "Utilizzo %",
    variance: "Varianza %",
    risk: "Rischio",
    acknowledge: "Conferma",
    reallocate: "Riassegna",
    riskDistribution: "Distribuzione del Rischio",
    stable: "Stabile",
    dimension: "Dimensione",
    score: "Punteggio",
    status: "Stato",
    weight: "Peso",
    trend: "Tendenza",
  },
} as const;

// ─── P2P icon map ─────────────────────────────────────────────────────────────
const P2P_ICONS = [ShoppingCart, CheckCircle2, ReceiptText, PackageCheck, FileCheck2, Landmark];

function compact(v: unknown, currency = "USD") {
  // FIX: guard against Prisma Decimal / BigInt objects that weren't serialized by the router
  const n: number = (() => {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    if (typeof v === "string") return parseFloat(v) || 0;
    // Prisma Decimal — has .toNumber()
    if (typeof (v as any).toNumber === "function") return (v as any).toNumber();
    // Last resort
    return parseFloat(String(v)) || 0;
  })();
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " ";
  if (Math.abs(n) >= 1e9) return `${sym}${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${sym}${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${sym}${(n / 1e3).toFixed(0)}K`;
  return `${sym}${n.toFixed(0)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ExecutiveFinanceDashboard() {
  const { language, isRTL } = useLanguage();
  const copy = T[language];
  const [query, setQuery] = useState("");
  
  // Page-level independent filter state
  const [fiscalYear, setFiscalYear] = useState<string>("2025");
  const [projectId, setProjectId] = useState<number | undefined>(undefined);

  // ─── Filter Meta Query ───────────────────────────────────────────────────────
  // Single shared call populates all dropdown options (real SQL)
  const filterMeta = trpc.financeDashboard.getFilterMeta.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min — filter options don't change often
  });

  // Get the project details for the selected projectId
  const selectedProject = useMemo(() => {
    if (!projectId || !filterMeta.data?.projects) return undefined;
    return filterMeta.data.projects.find((p) => p.id === projectId);
  }, [projectId, filterMeta.data?.projects]);

  // Auto-populated donor from selected project
  const projectDonor = selectedProject?.donor;
  const projectCurrency = selectedProject?.currency;

  // Build filter input for all queries
  const filterInput = {
    fiscalYear,
    currency: projectCurrency || "USD",
    projectIds: projectId ? [projectId] : undefined,
  };

  // ─── Live tRPC Queries ────────────────────────────────────────────────────
  const kpiQuery       = trpc.financeDashboard.getKPICards.useQuery(filterInput);
  const trendQuery     = trpc.financeDashboard.getBudgetTrend.useQuery({ ...filterInput, months: 12 });
  const waterfallQuery = trpc.financeDashboard.getCashWaterfall.useQuery(filterInput);
  const p2pQuery       = trpc.financeDashboard.getP2PPipeline.useQuery(filterInput);
  const complianceQuery= trpc.financeDashboard.getComplianceSummary.useQuery(filterInput);
  const healthQuery    = trpc.financeDashboard.getHealthMatrix.useQuery(filterInput);
  const alertsQuery    = trpc.financeDashboard.getRiskAlerts.useQuery({ ...filterInput, limit: 3 });
  const riskDistQuery  = trpc.financeDashboard.getRiskDistribution.useQuery(filterInput);
  const aiRecsQuery    = trpc.financeDashboard.getAIRecommendations.useQuery({ ...filterInput, limit: 3 });

  // ─── Resolved data with fallbacks ────────────────────────────────────────
  const kpis        = (kpiQuery.data ?? EMPTY_KPI) as KPICardsData;
  const trendData   = trendQuery.data ?? [];
  const waterfall   = waterfallQuery.data ?? EMPTY_WATERFALL;
  const p2pData     = p2pQuery.data ?? EMPTY_P2P;
  const compliance  = complianceQuery.data ?? EMPTY_COMPLIANCE;
  const health      = healthQuery.data ?? EMPTY_HEALTH;
  const riskAlerts  = alertsQuery.data ?? [];
  const riskPieData = riskDistQuery.data ?? [];
  const aiRecs      = aiRecsQuery.data ?? [];

  const fmt = useMemo(() => {
    // FIX: Intl.NumberFormat throws RangeError if currency is not a valid BCP 47 tag
    const safeCurrency = typeof kpis.currency === "string" && kpis.currency.length === 3
      ? kpis.currency
      : "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    });
  }, [kpis.currency]);



  // Transform waterfall to chart array
  const waterfallChartData = [
    { name: "Opening",  value: waterfall.opening,  type: "base" },
    { name: "Receipts", value: waterfall.receipts,  type: "in"   },
    { name: "Payments", value: -Math.abs(waterfall.payments), type: "out" },
    { name: "Closing",  value: waterfall.closing,   type: "base" },
  ];

  // P2P pipeline steps
  const p2pSteps =
  p2pData.stages.length > 0
    ? p2pData.stages
        .slice(0, 6)
        .map(
          (
            s: (typeof p2pData.stages)[number],
            i: number,
          ) => ({
            label: s.stage.substring(0, 4),
            count: s.count,
            Icon: P2P_ICONS[i] ?? ShoppingCart,
          }),
        )
    : [];

  // Map AI recommendations to AIRecommendation shape
  const mappedAiRecs = aiRecs.map((r, i) => ({
    id: r.id ?? `ai-${i}`,
    priority: (r.priority === "high" ? "High" : r.priority === "critical" ? "Critical" : "Medium") as "Critical" | "High" | "Medium" | "Low",
    category: r.category ?? "General",
    confidence: r.confidence ?? 80,
    impact: (r.impact === "high" ? "High" : r.impact === "low" ? "Low" : "Medium") as "High" | "Medium" | "Low",
    reason: r.reason ?? r.title ?? "",
    action: r.action ?? "",
    responsible: undefined,
    deadline: undefined,
  }));

  // Map compliance indicators to grid
  const complianceItems = (compliance.indicators ?? []).slice(0, 4);

  // Health matrix columns
  const healthCols: TableColumn<HealthDimension>[] = [
    { key: "dimension", label: copy.dimension, sortable: true, render: (r) => <span className="font-medium text-slate-800">{r.dimension}</span> },
    { key: "score", label: copy.score, sortable: true, ltr: true, render: (r: any) => {
      const score = typeof r.score === 'number' ? r.score : 0;
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full" style={{ width: `${score}%`, background: score >= 80 ? FINANCE_COLORS.success : score >= 60 ? FINANCE_COLORS.warning : FINANCE_COLORS.critical }} />
          </div>
          <span className="font-mono text-[11px]">{score}%</span>
        </div>
      );
    }},
    { key: "status", label: copy.status, render: (r: any) => {
      const status = r.status || 'unknown';
      const cls =
        status === "excellent" || status === "good"
            ? "bg-green-100 text-green-700"
            : status === "warning"
            ? "bg-amber-100 text-amber-700"
            : "bg-red-100 text-red-700";
      return <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${cls}`}>{status}</span>;
    }},
    { key: "weight", label: copy.weight, ltr: true, render: (r: any) => {
      const weight = typeof r.weight === 'number' ? r.weight : 0;
      return <span className="font-mono text-[11px] text-slate-600">{(weight * 100).toFixed(0)}%</span>;
    }},
    { key: "trend", label: copy.trend, render: (r: any) => {
      const trend = r.trend || 'stable';
      if (trend === "improving") return <span className="text-green-700 text-[11px] font-semibold">↑ Improving</span>;
      if (trend === "declining") return <span className="text-red-600 text-[11px] font-semibold">↓ Declining</span>;
      return <span className="text-slate-500 text-[11px]">→ Stable</span>;
    }},
  ];

  const isLoading = kpiQuery.isLoading || filterMeta.isLoading || !fiscalYear;
  const timestamp = kpis.timestamp
    ? new Date(kpis.timestamp).toLocaleString()
    : new Date().toLocaleString();

  // Project options from filterMeta - show projectCode for compact display
  const projectOptions = useMemo(() => [
    { value: 0, label: "All Projects" },
    ...(filterMeta.data?.projects ?? []).map((p: any) => ({ value: p.id, label: p.projectCode })),
  ], [filterMeta.data?.projects]);

  // Fiscal year options from filterMeta
  const fiscalYearOptions = useMemo(() => {
    if (!filterMeta.data?.fiscalYears) {
      // Fallback: FY2025 to FY2035
      return Array.from({ length: 11 }, (_, i) => {
        const year = 2025 + i;
        return { value: String(year), label: `FY${year}` };
      });
    }
    return filterMeta.data.fiscalYears;
  }, [filterMeta.data?.fiscalYears]);

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>

        {/* Filter Bar: FY | ProjectCode | Donor | Last Updated | Refresh */}
        <div className="flex items-center justify-between gap-6 bg-white rounded-[10px] border border-slate-200 p-4">
          <div className="flex items-center gap-6 flex-1">
            {/* Fiscal Year */}
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value || "2025")}
              className="h-9 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-blue-200 min-w-[100px]"
            >
              {fiscalYearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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

          {/* Last Updated + Refresh - with good distance */}
          <div className="flex items-center gap-4 ml-6 pl-6 border-l border-slate-200">
            <span className="text-[12px] text-slate-500 whitespace-nowrap">{copy.updated} {timestamp}</span>
            <button
              onClick={() => { kpiQuery.refetch(); trendQuery.refetch(); waterfallQuery.refetch(); }}
              className="h-9 px-4 rounded border border-slate-300 bg-white text-[13px] font-medium hover:bg-slate-50 transition whitespace-nowrap"
            >
              {copy.refresh}
            </button>
          </div>
        </div>



        {/* KPI Strip */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-[10px] border border-slate-200 bg-white p-3">
                <LoadingSkeleton variant="kpi" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-8">
            <FinanceKpiCard label={copy.totalBudget}  value={compact(kpis.totalBudget, kpis.currency)}   icon={Banknote} />
            <FinanceKpiCard label={copy.actualSpent}  value={compact(kpis.actualExpenditure, kpis.currency)} meta={kpis.utilization > 100 ? "+Overrun" : undefined} trend={kpis.utilization > 100 ? "up" : undefined} upIsGood={false} icon={Banknote} />
            <FinanceKpiCard label={copy.commitments}  value={compact(kpis.commitments, kpis.currency)}   icon={FileCheck2} accent="navy" />
            <FinanceKpiCard label={copy.cash}         value={compact(kpis.cashOnHand, kpis.currency)}    icon={Landmark} />
            <FinanceKpiCard label={copy.burn}         value={`${kpis.currentBurnRate.toFixed(1)}%`}      icon={Clock} />
            <FinanceKpiCard label={copy.utilization}  value={`${kpis.utilization.toFixed(1)}%`}          progressValue={kpis.utilization} icon={Banknote} />
            <FinanceKpiCard label={copy.ap}           value={compact(kpis.apOverdue, kpis.currency)}     valueColor={kpis.apOverdue > 0 ? "text-red-600" : undefined} icon={ReceiptText} />
            <FinanceKpiCard label={copy.ar}           value={compact(kpis.arTotal, kpis.currency)}       icon={WalletCards} />
          </div>
        )}

        <main className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">

            {/* Budget Trend - Full Width */}
            <ChartWrapper title={copy.budgetTrend} chartHeight="h-[350px]" isLoading={trendQuery.isLoading} isEmpty={!trendQuery.isLoading && trendData.length === 0} showDownload>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid stroke="#e7ebf0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis hide tickFormatter={(v) => compact(v, kpis.currency)} />
                  <Tooltip formatter={(v: number) => [fmt.format(v)]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="budget"   fill="#dbeafe" name="Budget"   />
                  <Bar dataKey="actual"   fill={CHART_COLORS.actual} name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS.forecast} strokeWidth={2} dot={false} name="Forecast" />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartWrapper>

            {/* Waterfall + P2P */}
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <ChartWrapper title={copy.waterfall} chartHeight="h-[300px]" isLoading={waterfallQuery.isLoading} showDownload>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallChartData}>
                    <CartesianGrid stroke="#e7ebf0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip formatter={(v: number) => [fmt.format(v)]} />
                    <Bar dataKey="value">
                      <LabelList dataKey="value" position="top" fontSize={10} formatter={(v: number) => compact(v, kpis.currency)} />
                      {waterfallChartData.map((d) => (
                        <Cell key={d.name} fill={d.type === "in" ? "#22c55e" : d.type === "out" ? "#ef4444" : "#003b70"} />
                      ))}
                    </Bar>
                    <ReferenceLine y={0} stroke="#94a3b8" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
              <FinanceCard noPadding>
                <WidgetHeader title={copy.p2p} icon={<ShoppingCart className="h-4 w-4" />} />
                <div className="p-4">
                  {p2pQuery.isLoading ? (
                    <LoadingSkeleton variant="list" rows={2} />
                  ) : p2pSteps.length === 0 ? (
                    <EmptyState message="No procurement pipeline data available." className="py-6" />
                  ) : (
                    <div className="mt-2 grid grid-cols-3 gap-y-6 md:grid-cols-6">
                      {p2pSteps.map(
                        (
                            {
                            label,
                            count,
                            Icon,
                            }: {
                            label: string;
                            count: number;
                            Icon: React.ComponentType<any>;
                            },
                            i: number,
                        ) => (
                        <div key={label} className="relative text-center">
                          {i < p2pSteps.length - 1 && (
                            <div className={`absolute top-6 hidden h-px w-full bg-slate-200 md:block ${isRTL ? "right-1/2" : "left-1/2"}`} />
                          )}
                          <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#003b70] text-white shadow-sm">
                            <Icon className="h-5 w-5" />
                          </div>
                          <p className="mt-2 text-[12px] font-bold text-slate-800">{label}</p>
                          <p className="text-[10px] text-slate-500" dir="ltr">{count}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FinanceCard>
            </div>

            {/* Financial Health Matrix */}
            <ExecutiveTable<HealthDimension>
              columns={healthCols}
              data={(health.dimensions ?? []) as HealthDimension[]}
              rowKey={(_, i) => i}
              showExport
              exportLabel={copy.export_data}
              searchable
              searchPlaceholder={copy.filterProject}
              externalQuery={query}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Risk Alerts */}
            <FinanceCard noPadding>
              <WidgetHeader title={copy.riskAlerts} icon={<Bell className="h-4 w-4" />} />
              {alertsQuery.isLoading ? (
                <div className="p-4"><LoadingSkeleton variant="list" rows={3} /></div>
              ) : riskAlerts.length === 0 ? (
                <EmptyState message="No active risk alerts." className="py-8" />
              ) : (
                riskAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    tone={alert.severity === "critical" ? "critical" : alert.severity === "high" ? "warning" : "info"}
                    title={alert.title}
                    body={alert.mitigationPlan}
                    actionLabel={copy.acknowledge}
                  />
                ))
              )}
            </FinanceCard>

            {/* Financial Compliance */}
            <FinanceCard noPadding>
              <WidgetHeader title={copy.compliance} badge={compliance.overallScore > 0 ? `${compliance.overallScore.toFixed(0)}%` : undefined} />
              <div className="p-4 space-y-3">
                {complianceQuery.isLoading ? (
                  <LoadingSkeleton variant="text" rows={4} />
                ) : complianceItems.length === 0 ? (
                  <EmptyState message="No compliance data available." className="py-4" />
                ) : (
                  complianceItems.map((m: HealthDimension) => (
                    <div key={m.dimension} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[12px]">
                      <span>{m.dimension}</span>
                      <span className={`h-3 w-3 rounded-full ${m.score < 75 ? "bg-amber-500" : "bg-green-700"}`} />
                      <div className="col-span-2 h-1.5 rounded bg-slate-100">
                        <div className={`h-1.5 rounded ${m.score < 75 ? "bg-amber-500" : "bg-green-700"}`} style={{ width: `${m.score}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </FinanceCard>

            {/* Risk Distribution */}
            <FinanceCard noPadding>
              <WidgetHeader title={copy.riskDistribution} />
              {riskDistQuery.isLoading ? (
                <div className="p-4"><LoadingSkeleton variant="chart" /></div>
              ) : riskPieData.length === 0 ? (
                <EmptyState message="No risk data available." className="py-6" />
              ) : (
                <div className="p-4">
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={riskPieData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68}>
                          {riskPieData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-1 text-[11px] font-semibold">
                    {riskPieData.map((d) => (
                      <span key={d.name} className="flex items-center gap-1">
                        <i className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                        {d.name} ({d.value})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </FinanceCard>

            {/* AI Insights */}
            {aiRecsQuery.isLoading ? (
              <FinanceCard><LoadingSkeleton variant="card" /></FinanceCard>
            ) : mappedAiRecs.length === 0 ? (
              <FinanceCard><EmptyState message="No AI recommendations available." /></FinanceCard>
            ) : (
              <AIRecommendationPanel
                title={copy.insights}
                recommendations={mappedAiRecs}
                acknowledgeLabel={copy.acknowledge}
              />
            )}
          </aside>
        </main>
    </div>
  );
}