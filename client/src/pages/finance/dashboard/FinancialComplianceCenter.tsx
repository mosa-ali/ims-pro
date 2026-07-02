import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Calendar, CheckCircle2, FileCheck2, FileText, FileWarning,
  Flag, Landmark, ReceiptText, Shield, ShieldAlert, ShieldCheck,
  ShieldX, TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import {
  EMPTY_COMPLIANCE_SCORE,
  type ComplianceScoreData, type ComplianceFinding,
} from "@/lib/financeRouterTypes";
import {
  FinanceCard, WidgetHeader, ChartWrapper,
  FinanceKpiCard, AIRecommendationPanel,
  ComplianceIndicatorGrid, HealthGauge, type IndicatorRow,
  ExecutiveTable, type TableColumn,
  AlertCard, CalendarEventItem,
  LoadingSkeleton, EmptyState,
  FINANCE_COLORS, scoreToColor,
} from "@/components/finance/fdashboard";

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    title: "Financial Compliance Center",
    subtitle: "Audit Readiness & Regulatory Compliance Intelligence",
    updated: "Last updated",
    refresh: "Refresh",
    export: "Export Report",
    filters: "More Filters",
    fiscalYear: "Fiscal Year",
    allProjects: "All Projects",
    allDonors: "All Donors",
    allCategories: "All Categories",
    search: "Search compliance items, projects, or donors...",
    overallScore: "Overall Compliance",
    auditReadiness: "Audit Readiness",
    donorCompliance: "Donor Compliance",
    budgetCompliance: "Budget Compliance",
    openIssues: "Open Issues",
    resolvedIssues: "Resolved Issues",
    overdueItems: "Overdue Items",
    nextAudit: "Next Audit",
    complianceIndicators: "Compliance Indicators",
    complianceTrend: "Compliance Trend (12 Months)",
    donorCompliancePanel: "Donor Compliance Panel",
    outstandingAdvances: "Outstanding Advances",
    missingDocs: "Missing Documentation",
    complianceCalendar: "Compliance Calendar",
    aiInsights: "AI Compliance Insights",
    journalValidation: "Journal Validation",
    bankReconciliation: "Bank Reconciliation",
    donor: "Donor",
    grant: "Grant",
    score: "Score",
    budget: "Budget",
    spent: "Spent",
    status: "Status",
    dueDate: "Due Date",
    project: "Project",
    amount: "Amount",
    daysOverdue: "Days Overdue",
    severity: "Severity",
    action: "Action",
    docType: "Document Type",
    impact: "Impact",
    resolve: "Resolve",
    escalate: "Escalate",
    acknowledge: "Acknowledge",
    openFindings: "Open Findings",
    viewAll: "View All",
    loading: "Loading data...",
    error: "Error loading data",
    empty: "No data available",
    category: "Category",
    owner: "Owner",
    remediationRate: "Remediation Rate",
  },
  ar: {
    title: "مركز الامتثال المالي",
    subtitle: "استعداد التدقيق وذكاء الامتثال التنظيمي",
    updated: "آخر تحديث",
    refresh: "تحديث",
    export: "تصدير التقرير",
    filters: "مرشحات إضافية",
    fiscalYear: "السنة المالية",
    allProjects: "كل المشاريع",
    allDonors: "كل المانحين",
    allCategories: "كل الفئات",
    search: "البحث في بنود الامتثال أو المشاريع أو المانحين...",
    overallScore: "الامتثال الإجمالي",
    auditReadiness: "الاستعداد للتدقيق",
    donorCompliance: "امتثال المانحين",
    budgetCompliance: "امتثال الميزانية",
    severity: "درجة الخطورة",
    openIssues: "مشكلات مفتوحة",
    resolvedIssues: "مشكلات محلولة",
    overdueItems: "بنود متأخرة",
    nextAudit: "التدقيق القادم",
    openFindings: "الملاحظات المفتوحة",
    complianceIndicators: "مؤشرات الامتثال",
    complianceTrend: "اتجاه الامتثال (12 شهراً)",
    donorCompliancePanel: "لوحة امتثال المانحين",
    outstandingAdvances: "السلف المعلقة",
    missingDocs: "الوثائق المفقودة",
    complianceCalendar: "تقويم الامتثال",
    aiInsights: "رؤى الامتثال بالذكاء الاصطناعي",
    journalValidation: "التحقق من دفتر اليوميات",
    bankReconciliation: "المصالحة البنكية",
    donor: "المانح",
    grant: "المنحة",
    score: "النقاط",
    budget: "الميزانية",
    spent: "المنفق",
    status: "الحالة",
    dueDate: "تاريخ الاستحقاق",
    project: "المشروع",
    amount: "المبلغ",
    daysOverdue: "الأيام المتأخرة",
    action: "إجراء",
    docType: "نوع المستند",
    impact: "التأثير",
    resolve: "حل",
    escalate: "تصعيد",
    acknowledge: "الإقرار",
    viewAll: "عرض الكل",
    loading: "جاري تحميل البيانات...",
    error: "خطأ في تحميل البيانات",
    empty: "لا توجد بيانات متاحة",
    category: "الفئة",
    owner: "المالك",
    remediationRate: "معدل المعالجة",
  },
  it: {
    title: "Centro di Conformità Finanziaria",
    subtitle: "Intelligenza di Conformità Normativa e Preparazione al Controllo",
    updated: "Ultimo aggiornamento",
    refresh: "Aggiorna",
    export: "Esporta Rapporto",
    filters: "Filtri Aggiuntivi",
    fiscalYear: "Anno Fiscale",
    allProjects: "Tutti i Progetti",
    severity: "Gravità",
    openFindings: "Rilievi aperti",
    allDonors: "Tutti i Donatori",
    allCategories: "Tutte le Categorie",
    search: "Cerca elementi di conformità, progetti o donatori...",
    overallScore: "Conformità Complessiva",
    auditReadiness: "Preparazione al Controllo",
    donorCompliance: "Conformità dei Donatori",
    budgetCompliance: "Conformità del Budget",
    openIssues: "Problemi Aperti",
    resolvedIssues: "Problemi Risolti",
    overdueItems: "Elementi in Ritardo",
    nextAudit: "Prossimo Controllo",
    complianceIndicators: "Indicatori di Conformità",
    complianceTrend: "Tendenza di Conformità (12 Mesi)",
    donorCompliancePanel: "Pannello di Conformità dei Donatori",
    outstandingAdvances: "Anticipi in Sospeso",
    missingDocs: "Documentazione Mancante",
    complianceCalendar: "Calendario di Conformità",
    aiInsights: "Approfondimenti IA sulla Conformità",
    journalValidation: "Convalida Giornale",
    bankReconciliation: "Riconciliazione Bancaria",
    donor: "Donatore",
    grant: "Sovvenzione",
    score: "Punteggio",
    budget: "Budget",
    spent: "Speso",
    status: "Stato",
    dueDate: "Data di Scadenza",
    project: "Progetto",
    amount: "Importo",
    daysOverdue: "Giorni in Ritardo",
    action: "Azione",
    docType: "Tipo di Documento",
    impact: "Impatto",
    resolve: "Risolvi",
    escalate: "Escalation",
    acknowledge: "Riconosci",
    viewAll: "Visualizza Tutto",
    loading: "Caricamento dati in corso...",
    error: "Errore nel caricamento dei dati",
    empty: "Nessun dato disponibile",
    category: "Categoria",
    owner: "Proprietario",
    remediationRate: "Tasso di Correzione",
  },
} as const;

function severityColor(s: string) {
  return s === "critical" ? "bg-red-100 text-red-700" : s === "high" ? "bg-orange-100 text-orange-700" : s === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
}

function statusColor(s: string) {
  return s === "open" ? "bg-red-50 text-red-700" : s === "in-progress" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700";
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FinancialComplianceCenter() {
  const { language, isRTL } = useLanguage();
  const copy = T[language];
  const [query, setQuery] = useState("");
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
  const scoreQuery      = trpc.financeDashboard.getComplianceScore.useQuery(filterInput);
  const trendQuery      = trpc.financeDashboard.getComplianceTrend.useQuery({ ...filterInput, months: 12 });
  const indicatorsQuery = trpc.financeDashboard.getComplianceIndicators.useQuery(filterInput);
  const findingsQuery   = trpc.financeDashboard.getComplianceFindings.useQuery({ ...filterInput, limit: 20 });
  const scheduleQuery   = trpc.financeDashboard.getAuditSchedule.useQuery(filterInput);
  const aiRecsQuery     = trpc.financeDashboard.getAIRecommendations.useQuery({ ...filterInput, category: "Compliance", limit: 3 });
  const summaryQuery    = trpc.financeDashboard.getComplianceSummary.useQuery(filterInput);

  // ─── Resolved data ────────────────────────────────────────────────────────
  const scoreData   = (scoreQuery.data ?? EMPTY_COMPLIANCE_SCORE) as ComplianceScoreData;
  const trendData   = trendQuery.data ?? [];
  const indicators  = indicatorsQuery.data ?? [];
  const findings    = (findingsQuery.data ?? []) as ComplianceFinding[];
  const schedule    = scheduleQuery.data ?? [];
  const aiRecs      = aiRecsQuery.data ?? [];
  const summary     = summaryQuery.data;
  const meta        = filterMeta.data;

  // Map indicators to IndicatorRow
  // ✅ FIX #5: Use real trend from data if available, fallback to "stable"
  const indicatorRows: IndicatorRow[] = indicators.map((ind) => ({
    label: ind.name,
    score: ind.score,
    trend: (ind.trend || "stable") as const,  // Use real trend if available
  }));

  // Map findings for table
  const filteredFindings = useMemo(() => {
    const q = query.toLowerCase();
    return !q ? findings : findings.filter((f) =>
      f.title.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
    );
  }, [findings, query]);

  // Map AI recs
  const mappedAiRecs = aiRecs.map((r, i) => ({
    id: r.id ?? `ai-${i}`,
    priority: (r.priority === "critical" ? "Critical" : r.priority === "high" ? "High" : "Medium") as "Critical" | "High" | "Medium" | "Low",
    category: r.category ?? "Compliance",
    confidence: r.confidence ?? 80,
    impact: (r.impact === "high" ? "High" : r.impact === "low" ? "Low" : "Medium") as "High" | "Medium" | "Low",
    reason: r.reason ?? r.title ?? "",
    action: r.action ?? "",
  }));

  // Summary pie for journal/findings breakdown
  const summaryPieData = summary ? [
    { name: "Compliant",    value: summary.compliant,    fill: FINANCE_COLORS.success },
    { name: "At Risk",      value: summary.atRisk,       fill: FINANCE_COLORS.warning },
    { name: "Non-Compliant",value: summary.nonCompliant, fill: FINANCE_COLORS.critical },
  ] : [];

  // Findings table columns
  const findingCols: TableColumn<ComplianceFinding>[] = [
    { key: "title",    label: copy.title,    render: (r) => <span className="font-medium text-slate-800">{r.title as string}</span> },
    { key: "category", label: copy.category },
    { key: "severity", label: copy.severity, sortable: true, render: (r) => <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${severityColor(r.severity as string)}`}>{r.severity as string}</span> },
    { key: "owner",    label: copy.owner },
    { key: "dueDate",  label: copy.dueDate,  ltr: true, render: (r) => <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap">{r.dueDate as string}</span> },
    { key: "status",   label: copy.status,   render: (r) => <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold capitalize ${statusColor(r.status as string)}`}>{r.status as string}</span> },
  ];

  const fyOptions = meta?.fiscalYears ?? [];
  const projectOptions = [{ value: 0, label: copy.allProjects }, ...(meta?.projects ?? []).map((p: any) => ({ value: p.id, label: p.projectCode }))];
  const projectDonor = selectedProject?.donor;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6 text-slate-900" dir={isRTL ? "rtl" : "ltr"}>

        {/* Page Title with Icon and Last Updated/Refresh */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-600 p-3">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{copy.title}</h1>
              <p className="text-sm text-slate-600 mt-1">{copy.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 whitespace-nowrap">{copy.updated} {new Date().toLocaleString()}</span>
            <button
              onClick={() => { scoreQuery.refetch(); indicatorsQuery.refetch(); findingsQuery.refetch(); }}
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

        {/* Search Bar for Findings */}
        <div className="flex items-center gap-3 bg-white rounded-[10px] border border-slate-200 p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.search}
            className="h-9 flex-1 rounded border border-slate-300 bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* KPI Strip */}
        {scoreQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-[10px] border border-slate-200 bg-white p-3"><LoadingSkeleton variant="kpi" /></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <FinanceKpiCard label={copy.overallScore}   value={`${scoreData.overallScore.toFixed(0)}%`}    valueColor="text-green-700" trend="up" icon={ShieldCheck} />
            <FinanceKpiCard label={copy.auditReadiness} value={`${scoreData.auditReadiness.toFixed(0)}%`}  valueColor="text-green-700" icon={FileCheck2} />
            <FinanceKpiCard label={copy.openFindings}   value={scoreData.openFindings}                     valueColor={scoreData.openFindings > 0 ? "text-red-600" : undefined} icon={ShieldX} />
            <FinanceKpiCard label={copy.remediationRate}value={`${scoreData.remediationRate.toFixed(0)}%`} valueColor="text-blue-700"  icon={CheckCircle2} />
            <FinanceKpiCard label="Compliant"           value={summary?.compliant ?? 0}    valueColor="text-green-700" icon={ShieldCheck} />
            <FinanceKpiCard label="At Risk"             value={summary?.atRisk ?? 0}        valueColor="text-amber-700" icon={Flag} />
            <FinanceKpiCard label="Non-Compliant"       value={summary?.nonCompliant ?? 0}  valueColor="text-red-600"   icon={ShieldAlert} />
            <FinanceKpiCard label="Trend"               value={scoreData.trend}             icon={TrendingUp} />
          </div>
        )}

        {/* Score + Trend + Summary */}
        <div className="grid gap-4 lg:grid-cols-[220px_1fr_240px]">

          {/* Gauge */}
          <FinanceCard className="flex flex-col items-center justify-center">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{copy.overallScore}</p>
            <HealthGauge score={scoreData.overallScore} size="lg" />
            <div className="mt-3 w-full space-y-2">
              {[["Audit", scoreData.auditReadiness], ["Remediation", scoreData.remediationRate]].map(([lbl, val]) => (
                <div key={lbl} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 text-slate-500">{lbl}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${val}%`, background: scoreToColor(Number(val)) }} />
                  </div>
                  <span className="font-mono text-[10px] font-bold" dir="ltr">{Number(val).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </FinanceCard>

          {/* Trend chart */}
          <ChartWrapper title={copy.complianceTrend} chartHeight="h-[230px]" isLoading={trendQuery.isLoading} isEmpty={!trendQuery.isLoading && trendData.length === 0} showDownload>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData}>
                <CartesianGrid stroke="#e7ebf0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[50, 100]} />
                <Tooltip formatter={(v) => [`${v}%`]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="score" name="Compliance Score" fill="#dbeafe20" stroke={FINANCE_COLORS.info} strokeWidth={2} />
                <Line type="monotone" dataKey="target" name="Target" stroke={FINANCE_COLORS.success} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* Summary breakdown */}
          <FinanceCard noPadding>
            <WidgetHeader title="Summary" icon={<FileText className="h-4 w-4" />} />
            {summaryQuery.isLoading ? <div className="p-4"><LoadingSkeleton variant="text" rows={4} /></div> : (
              <div className="p-4 space-y-3">
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summaryPieData} dataKey="value" innerRadius={32} outerRadius={50} cx="50%" cy="50%">
                        {summaryPieData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {summaryPieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} /><span className="text-slate-700">{d.name}</span></span>
                    <span className="font-mono font-bold text-slate-800" dir="ltr">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </FinanceCard>
        </div>

        {/* Main grid */}
        <div className="grid gap-4 xl:grid-cols-[1fr_300px] min-w-0">
          <div className="space-y-4">

            {/* Compliance Indicators */}
            <FinanceCard noPadding>
              <WidgetHeader title={copy.complianceIndicators} icon={<Shield className="h-4 w-4" />} />
              {indicatorsQuery.isLoading ? <div className="p-4"><LoadingSkeleton variant="text" rows={6} /></div>
                : indicatorRows.length === 0 ? <EmptyState message="No compliance indicators available." className="py-8" />
                : <ComplianceIndicatorGrid indicators={indicatorRows} columns={2} />}
            </FinanceCard>

            {/* Compliance Findings */}
            <ExecutiveTable<ComplianceFinding>
              columns={findingCols}
              data={filteredFindings}
              rowKey={(_, i) => i}
              externalQuery={query}
              showExport
              exportLabel={copy.export}
              emptyMessage="No compliance findings match the filter."
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">

            {/* Audit Schedule */}
            <FinanceCard noPadding>
              <WidgetHeader title={copy.complianceCalendar} icon={<Calendar className="h-4 w-4" />} />
              {scheduleQuery.isLoading ? <div className="p-4"><LoadingSkeleton variant="list" rows={3} /></div>
                : schedule.length === 0 ? <EmptyState message="No scheduled audits." className="py-6" />
                : (
                  <div className="divide-y divide-slate-100">
                    {schedule.map((ev) => (
                      <CalendarEventItem
                        key={ev.id}
                        date={ev.date}
                        label={ev.title}
                        type={ev.type === "external" ? "critical" : ev.status === "overdue" ? "warning" : "info"}
                      />
                    ))}
                  </div>
                )}
            </FinanceCard>

            {/* AI Compliance Insights */}
            {aiRecsQuery.isLoading ? <FinanceCard><LoadingSkeleton variant="card" /></FinanceCard>
              : mappedAiRecs.length === 0 ? <FinanceCard><EmptyState message="No AI compliance recommendations." /></FinanceCard>
              : <AIRecommendationPanel title={copy.aiInsights} recommendations={mappedAiRecs} acknowledgeLabel={copy.acknowledge} viewDetailsLabel={copy.viewAll} />}

            {/* Category bar chart */}
            {indicatorRows.length > 0 && (
              <ChartWrapper title="Score by Indicator" chartHeight="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={indicatorRows.slice(0, 8)} layout="vertical" barSize={8}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7ebf0" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={80} />
                    <Tooltip formatter={(v) => [`${v}%`]} />
                    <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                      {indicatorRows.slice(0, 8).map((d, i) => <Cell key={i} fill={scoreToColor(d.score)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            )}
          </aside>
        </div>
    </div>
  );
}
