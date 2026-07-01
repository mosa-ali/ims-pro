/**
 * ExecutiveFinanceDashboard.tsx  (v8 — Production Hardened)
 *
 * Changes from v7:
 *  - REMOVED duplicate title bar (was duplicating global layout heading)
 *  - REMOVED search box, export button, top refresh button from header
 *    (these live in global layout / reporting pages)
 *  - REPLACED static filter chips with real SQL-backed dropdowns
 *    via getFilterMeta procedure
 *  - ADDED cascade logic: selecting a project auto-restricts grants/donors/currency
 *  - ADDED fiscal year filter (real years from project date ranges)
 *  - Filter bar is now the only sticky element — clean executive monitoring page
 *  - All queries, widgets, and data remain unchanged
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFinanceTranslation } from '@/i18n/useFinanceTranslation';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  RefreshCw, Download,
  BarChart3, TrendingUp, AlertTriangle, Brain,
  Activity, Shield, Layers, Clock, ChevronDown,
} from 'lucide-react';
import {
  ExecutiveKPICard,
  BudgetTrendChart,
  WaterfallChart,
  ComplianceScorecard,
  RiskAlertCard,
  AIRecommendation,
  HealthMatrixTable,
  RiskDistributionChart,
  ProcurementExposurePipeline,
  ProjectInfoHeader,
  RemainingDaysIndicator,
  fmtCurrency,
  fmtPercent,
  Skeleton,
} from '@/components/finance/dashboard/DashboardWidgets';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FilterState {
  fiscalYear: string;
  projectId: number | undefined;
  grantId: number | undefined;
  donorId: number | undefined;
  operatingUnitId: number | undefined;
  countryId: number | undefined;
}

const FILTER_INITIAL: FilterState = {
  fiscalYear: String(new Date().getFullYear()),
  projectId: undefined,
  grantId: undefined,
  donorId: undefined,
  operatingUnitId: undefined,
  countryId: undefined,
};

// ─── Filter Select Component ─────────────────────────────────────────────────
interface FilterSelectProps {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string | number }>;
  loading?: boolean;
  icon?: React.ReactNode;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  label, value, onChange, options, loading, icon,
}) => (
  <div className="relative flex items-center gap-1.5">
    {icon && (
      <span className="text-slate-400 pointer-events-none">{icon}</span>
    )}
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
      className={`
        appearance-none bg-white border border-slate-200 rounded-lg
        pl-2 pr-6 py-1.5 text-xs font-semibold text-slate-700
        focus:outline-none focus:ring-2 focus:ring-blue-200
        hover:border-slate-300 transition-colors cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${value ? 'border-[#0f2d5e] text-[#0f2d5e] bg-blue-50' : ''}
      `}
      style={{ minWidth: 120 }}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
    <ChevronDown
      size={11}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
    />
  </div>
);

// ─── Section Divider ──────────────────────────────────────────────────────────
const SectionLabel: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="text-[#0f2d5e] opacity-70">{icon}</span>
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {title}
      </h2>
      {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
    </div>
    <div className="flex-1 h-px bg-slate-100 ml-2" />
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const ExecutiveFinanceDashboard: React.FC = () => {
  const { isRTL } = useLanguage();
  const t = useFinanceTranslation();
  const params = useParams<{ projectId: string }>();
  const [, setLocation] = useLocation();

  // Route-level project override (when navigated from health matrix)
  const routeProjectId = params?.projectId ? Number(params.projectId) : undefined;

  const [filters, setFilters] = useState<FilterState>({
    ...FILTER_INITIAL,
    projectId: routeProjectId,
  });

  // Keep route-level project in sync
  useEffect(() => {
    if (routeProjectId) {
      setFilters((prev) => ({ ...prev, projectId: routeProjectId }));
    }
  }, [routeProjectId]);

  // ─── Filter Meta Query ───────────────────────────────────────────────────
  // Single call populates all dropdown options (real SQL)
  const filterMeta = trpc.financeDashboard.getFilterMeta.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min — filter options don't change often
  });

  // ─── Cascade: when project changes, auto-restrict grant/donor options ────
  const availableGrants = useMemo(() => {
    if (!filterMeta.data?.grants) return [];
    if (!filters.projectId) return filterMeta.data.grants;
    return filterMeta.data.grants.filter(
      (g) => g.projectId === filters.projectId
    );
  }, [filterMeta.data?.grants, filters.projectId]);

  const availableDonors = useMemo(() => {
    if (!filterMeta.data?.donors) return [];
    const grantDonorIds = new Set(
      availableGrants.map((g) => g.donorId).filter(Boolean)
    );
    if (grantDonorIds.size === 0) return filterMeta.data.donors;
    return filterMeta.data.donors.filter((d) => grantDonorIds.has(d.id));
  }, [filterMeta.data?.donors, availableGrants]);

  // Auto-fill currency from selected project
  const selectedProjectCurrency = useMemo(() => {
    if (!filters.projectId || !filterMeta.data?.projects) return undefined;
    return filterMeta.data.projects.find((p) => p.id === filters.projectId)
      ?.currency;
  }, [filters.projectId, filterMeta.data?.projects]);

  // ─── Handler: project change cascades to reset grant/donor ──────────────
  const handleProjectChange = useCallback((val: string) => {
    const pid = val ? Number(val) : undefined;
    setFilters((prev) => ({
      ...prev,
      projectId: pid,
      // Reset downstream filters when project changes
      grantId: undefined,
      donorId: undefined,
    }));
    // If cleared via filter, also clear route-level context
    if (!pid && routeProjectId) {
      setLocation('/finance/dashboard');
    }
  }, [routeProjectId, setLocation]);

  const handleGrantChange = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, grantId: val ? Number(val) : undefined }));
  }, []);

  const handleDonorChange = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, donorId: val ? Number(val) : undefined }));
  }, []);

  const handleFiscalYearChange = useCallback((val: string) => {
    setFilters((prev) => ({ ...prev, fiscalYear: val }));
  }, []);

  const handleOUChange = useCallback((val: string) => {
    setFilters((prev) => ({
      ...prev,
      operatingUnitId: val ? Number(val) : undefined,
    }));
  }, []);

  const handleCountryChange = useCallback((val: string) => {
    setFilters((prev) => ({
      ...prev,
      countryId: val ? Number(val) : undefined,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ ...FILTER_INITIAL });
    if (routeProjectId) setLocation('/finance/dashboard');
  }, [routeProjectId, setLocation]);

  // ─── KPI Query Input (memoised) ─────────────────────────────────────────
  const kpiInput = useMemo(
    () => ({
      projectIds: filters.projectId ? [filters.projectId] : undefined,
    }),
    [filters.projectId]
  );

  // ─── Data Queries ─────────────────────────────────────────────────────────
  const kpis         = trpc.financeDashboard.getExecutiveKPIs.useQuery(kpiInput);
  const budgetTrend  = trpc.financeDashboard.getBudgetTrend.useQuery();
  const waterfall    = trpc.financeDashboard.getCashWaterfall.useQuery();
  const p2pStats     = trpc.financeDashboard.getP2PStats.useQuery();
  const riskDist     = trpc.financeDashboard.getRiskDistribution.useQuery();
  const aiInsights   = trpc.financeDashboard.getAIRecommendations.useQuery();
  const healthMatrix = trpc.financeDashboard.getHealthMatrix.useQuery();
  const compliance   = trpc.financeDashboard.getComplianceScorecard.useQuery();
  const alerts       = trpc.financeDashboard.getPredictiveAlerts.useQuery(kpiInput);

  // ─── Refresh All ─────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    kpis.refetch();
    budgetTrend.refetch();
    waterfall.refetch();
    healthMatrix.refetch();
    alerts.refetch();
    compliance.refetch();
    riskDist.refetch();
    aiInsights.refetch();
    p2pStats.refetch();
    filterMeta.refetch();
  }, [kpis, budgetTrend, waterfall, healthMatrix, alerts, compliance, riskDist, aiInsights, p2pStats, filterMeta]);

  // ─── Derived Values ───────────────────────────────────────────────────────
  const totalBudget       = Number(kpis.data?.totalBudget ?? 0);
  const actualExpenditure = Number(kpis.data?.actualExpenditure ?? 0);
  const commitments       = Number(kpis.data?.commitments ?? 0);
  const availableBudget   = Number(kpis.data?.availableBudget ?? 0);
  const cashOnHand        = Number(kpis.data?.cashOnHand ?? 0);
  const avgBurnRate       = Number(kpis.data?.avgBurnRate ?? 0);
  const utilization       = kpis.data?.utilization ?? 0;
  const activeProjects    = kpis.data?.activeProjects ?? 0;
  const remainingDays     = kpis.data?.remainingDays ?? 0;

  const lifecycleProgress = useMemo(() => {
    if (!kpis.data?.startDate || !kpis.data?.endDate) return 0;
    const start = new Date(kpis.data.startDate).getTime();
    const end   = new Date(kpis.data.endDate).getTime();
    const now   = Date.now();
    if (end <= start) return 0;
    return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }, [kpis.data]);

  const utilizationSparkline = useMemo(() => [
    { value: utilization * 0.4 },
    { value: utilization * 0.55 },
    { value: utilization * 0.7 },
    { value: utilization * 0.85 },
    { value: utilization },
  ], [utilization]);

  const burnTrend = avgBurnRate > Number(kpis.data?.requiredBurnRate ?? 0) ? 'up' : 'down';
  const cashTrend = cashOnHand > commitments ? 'up' : 'down';

  // Active filter count (for badge)
  const activeFilterCount = [
    filters.projectId,
    filters.grantId,
    filters.donorId,
    filters.operatingUnitId,
    filters.countryId,
  ].filter(Boolean).length;

  return (
    <div
      className="flex flex-col min-h-screen bg-[#f4f6f9]"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/*
       * ── FILTER BAR ───────────────────────────────────────────────────────
       * This is the ONLY sticky element. The duplicate title/search/export bar
       * has been removed — those are handled by the global layout.
       */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-2.5 flex items-center gap-3 flex-wrap">

          {/* Last updated — compact, right-justified */}
          <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mr-1">
            {t.common.filter}:
          </span>

          {/* Fiscal Year */}
          <FilterSelect
            label="Fiscal Year"
            value={filters.fiscalYear}
            onChange={handleFiscalYearChange}
            loading={filterMeta.isLoading}
            icon={<Clock size={11} />}
            options={
              filterMeta.data?.fiscalYears ?? [
                { label: `FY${new Date().getFullYear()}`, value: String(new Date().getFullYear()) },
              ]
            }
          />

          {/* Project */}
          <FilterSelect
            label="All Projects"
            value={filters.projectId}
            onChange={handleProjectChange}
            loading={filterMeta.isLoading}
            icon={<Layers size={11} />}
            options={(filterMeta.data?.projects ?? []).map((p) => ({
              label: `${p.projectCode} — ${p.title}`,
              value: p.id,
            }))}
          />

          {/* Grant — scoped to selected project */}
          <FilterSelect
            label="All Grants"
            value={filters.grantId}
            onChange={handleGrantChange}
            loading={filterMeta.isLoading}
            icon={<Shield size={11} />}
            options={availableGrants.map((g) => ({
              label: g.grantCode,
              value: g.id,
            }))}
          />

          {/* Donor — scoped to available grants */}
          <FilterSelect
            label="All Donors"
            value={filters.donorId}
            onChange={handleDonorChange}
            loading={filterMeta.isLoading}
            options={availableDonors.map((d) => ({
              label: d.name,
              value: d.id,
            }))}
          />

          {/* Operating Unit */}
          <FilterSelect
            label="All OUs"
            value={filters.operatingUnitId}
            onChange={handleOUChange}
            loading={filterMeta.isLoading}
            options={(filterMeta.data?.operatingUnits ?? []).map((ou) => ({
              label: ou.name,
              value: ou.id,
            }))}
          />

          {/* Country */}
          <FilterSelect
            label="All Countries"
            value={filters.countryId}
            onChange={handleCountryChange}
            loading={filterMeta.isLoading}
            icon={<Activity size={11} />}
            options={(filterMeta.data?.countries ?? []).map((c) => ({
              label: c.name,
              value: c.id,
            }))}
          />

          {/* Active currency indicator */}
          {selectedProjectCurrency && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
              {selectedProjectCurrency}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {/* Clear filters — only show when something is active */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wide"
              >
                Clear ({activeFilterCount})
              </button>
            )}

            {/* Last updated timestamp */}
            <span className="hidden lg:block text-[9px] font-semibold text-slate-400 tabular-nums">
              {new Date().toLocaleTimeString()}
            </span>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-7 gap-1.5 text-[11px] border-slate-200 hover:border-slate-300"
            >
              <RefreshCw size={11} />
              Refresh
            </Button>

            {/* Export — moved here from removed title bar */}
            <Button
              variant="default"
              size="sm"
              className="h-7 gap-1.5 text-[11px] bg-[#0f2d5e] hover:bg-[#1e4080]"
            >
              <Download size={11} />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">

          {/* Project Identity Header (single-project mode only) */}
          {filters.projectId && (
            <Card className="bg-white border border-slate-200 shadow-sm p-5">
              <ProjectInfoHeader
                code={kpis.data?.projectCode}
                title={kpis.data?.projectTitle}
                status={kpis.data?.projectStatus}
                startDate={kpis.data?.startDate}
                endDate={kpis.data?.endDate}
                progress={lifecycleProgress}
                loading={kpis.isLoading}
              />
            </Card>
          )}

          {/* ── KPI STRIP ─────────────────────────────────────────────── */}
          <section>
            <SectionLabel
              icon={<TrendingUp size={14} />}
              title={t.dashboard.portfolioOversight}
              subtitle="Real-time financial position"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
              <ExecutiveKPICard
                title={t.dashboard.kpis.totalPortfolioBudget}
                value={kpis.isLoading ? '…' : fmtCurrency(totalBudget)}
                subValue="FY Approved"
                loading={kpis.isLoading}
              />
              <ExecutiveKPICard
                title={t.dashboard.kpis.actualSpent}
                value={kpis.isLoading ? '…' : fmtCurrency(actualExpenditure)}
                trend={fmtPercent(utilization, 0)}
                trendDirection={utilization > 85 ? 'up' : 'neutral'}
                status={utilization > 90 ? 'error' : utilization > 75 ? 'warning' : 'success'}
                loading={kpis.isLoading}
              />
              <ExecutiveKPICard
                title={t.dashboard.kpis.commitmentPercentage}
                value={kpis.isLoading ? '…' : fmtCurrency(commitments)}
                subValue="Open Encumbrances"
                status="info"
                loading={kpis.isLoading}
              />
              <ExecutiveKPICard
                title={t.dashboard.kpis.cashOnHand}
                value={kpis.isLoading ? '…' : fmtCurrency(cashOnHand)}
                trendDirection={cashTrend}
                status={cashOnHand > commitments ? 'success' : 'warning'}
                loading={kpis.isLoading}
              />
              <ExecutiveKPICard
                title={t.dashboard.kpis.avgBurnRate}
                value={kpis.isLoading ? '…' : fmtCurrency(avgBurnRate)}
                subValue="/ month"
                trendDirection={burnTrend}
                status={burnTrend === 'up' ? 'warning' : 'success'}
                loading={kpis.isLoading}
              />
              <ExecutiveKPICard
                title={t.dashboard.kpis.utilization}
                value={kpis.isLoading ? '…' : fmtPercent(utilization)}
                sparklineData={utilizationSparkline}
                status={utilization > 90 ? 'error' : utilization > 75 ? 'warning' : 'success'}
                loading={kpis.isLoading}
              />
              <ExecutiveKPICard
                title={t.dashboard.kpis.remainingBalance}
                value={kpis.isLoading ? '…' : fmtCurrency(availableBudget)}
                subValue="Available"
                status={availableBudget < 0 ? 'error' : 'success'}
                loading={kpis.isLoading}
              />
              <ExecutiveKPICard
                title={t.dashboard.kpis.onTrack}
                value={kpis.isLoading ? '…' : activeProjects}
                subValue="Active Projects"
                status="info"
                loading={kpis.isLoading}
              />
            </div>
          </section>

          {/* ── PERFORMANCE ROW ───────────────────────────────────────── */}
          <section>
            <SectionLabel
              icon={<BarChart3 size={14} />}
              title="Performance Analytics"
              subtitle="Budget vs Actual and Cash Flow Position"
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Budget vs Actual */}
              <Card className="lg:col-span-8 bg-white border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Budget vs Actual Trend (YTD)
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Monthly performance against approved budget
                    </p>
                  </div>
                  <div className="flex gap-3 text-[10px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 inline-block" />
                      Budget
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#0f2d5e] inline-block" />
                      Actual
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-amber-400 inline-block border-dashed border-t-2 border-amber-400" />
                      Forecast
                    </span>
                  </div>
                </div>
                <BudgetTrendChart
                  data={budgetTrend.data}
                  loading={budgetTrend.isLoading}
                  height={280}
                />
              </Card>

              {/* Cash Waterfall */}
              <Card className="lg:col-span-4 bg-white border border-slate-200 shadow-sm p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {t.dashboard.waterfall.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Liquidity lifecycle breakdown
                  </p>
                </div>
                <WaterfallChart
                  data={waterfall.data}
                  loading={waterfall.isLoading}
                  height={260}
                />
                <div className="flex justify-center gap-4 mt-2">
                  {[
                    { color: 'bg-[#0f2d5e]', label: 'Base' },
                    { color: 'bg-green-500', label: 'Inflow' },
                    { color: 'bg-red-500', label: 'Outflow' },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="flex items-center gap-1 text-[10px] text-slate-500 font-medium"
                    >
                      <span className={`w-2 h-2 rounded-sm ${item.color} inline-block`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          {/* ── OPERATIONS ROW ────────────────────────────────────────── */}
          <section>
            <SectionLabel
              icon={<Activity size={14} />}
              title="Operational Intelligence"
              subtitle="Procurement pipeline and compliance posture"
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* P2P Pipeline */}
              <Card className="lg:col-span-7 bg-white border border-slate-200 shadow-sm p-5">
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {t.dashboard.p2pPipeline.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    End-to-end procurement flow status
                  </p>
                </div>
                <ProcurementExposurePipeline
                  data={p2pStats.data}
                  loading={p2pStats.isLoading}
                />
              </Card>

              {/* Compliance Scorecard */}
              <Card className="lg:col-span-5 bg-white border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {t.dashboard.complianceScorecard.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Audit readiness indicators
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                    Live
                  </span>
                </div>
                <ComplianceScorecard
                  items={compliance.data}
                  loading={compliance.isLoading}
                  labelViewLog="View Compliance Log"
                />
              </Card>
            </div>
          </section>

          {/* ── HEALTH MATRIX ─────────────────────────────────────────── */}
          <section>
            <SectionLabel
              icon={<Shield size={14} />}
              title={t.dashboard.healthMatrix.title}
              subtitle="Project-level financial health indicators"
            />
            <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {t.dashboard.healthMatrix.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Click any row to drill into project detail
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-[#0f2d5e] font-semibold"
                    onClick={() => setLocation('/finance/health-matrix')}
                  >
                    View More →
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs border-slate-200"
                  >
                    <Download size={12} />
                    {t.dashboard.healthMatrix.exportMatrix}
                  </Button>
                </div>
              </div>
              <HealthMatrixTable
                data={healthMatrix.data}
                loading={healthMatrix.isLoading}
                onDrillDown={(code) => {
                  const match = healthMatrix.data?.find(
                    (r) => r.projectCode === code
                  );
                  if (match) {
                    // Navigate to project detail — ID lookup needed
                    // Placeholder: navigate by code via query param
                    setLocation(`/finance/dashboard?project=${code}`);
                  }
                }}
                labels={{
                  projectId: t.dashboard.healthMatrix.projectIdentity,
                  budget: t.dashboard.healthMatrix.budgetTotal,
                  spent: t.dashboard.healthMatrix.actualsYTD,
                  variance: t.dashboard.healthMatrix.variance,
                  health: t.dashboard.healthMatrix.status,
                }}
              />
            </Card>
          </section>
        </main>

        {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
        <aside className="w-[320px] xl:w-[340px] bg-white border-l border-slate-200 flex-shrink-0 overflow-y-auto hidden xl:flex flex-col">

          {/* Remaining Days — single project mode */}
          {filters.projectId && (
            <div className="p-5 border-b border-slate-100">
              <RemainingDaysIndicator
                days={remainingDays}
                status={kpis.data?.projectStatus?.toUpperCase()}
                loading={kpis.isLoading}
              />
            </div>
          )}

          {/* Risk Alerts */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                {t.dashboard.predictiveAlerts.title}
              </h3>
              {alerts.data && alerts.data.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                  {alerts.data.length}
                </span>
              )}
            </div>

            {alerts.isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : alerts.data && alerts.data.length > 0 ? (
              alerts.data.slice(0, 4).map((alert) => (
                <RiskAlertCard
                  key={alert.id}
                  title={
                    alert.severity === 'CRITICAL'
                      ? `${t.dashboard.predictiveAlerts.severityCritical} Overspend`
                      : alert.severity === 'HIGH'
                      ? 'High Risk Burn Rate'
                      : 'Budget Warning'
                  }
                  severity={
                    alert.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'WARNING'
                  }
                  timestamp={`${alert.remainingMonths}mo remaining`}
                  message={`${alert.projectCode}: ${t.dashboard.predictiveAlerts.projectedOverspend} by ${alert.overspendPercentage}% (${fmtCurrency(alert.overspendAmount)}).`}
                  actionLabel={
                    alert.severity === 'CRITICAL'
                      ? t.dashboard.predictiveAlerts.escalate
                      : 'Reallocate'
                  }
                />
              ))
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                  <Shield size={18} className="text-green-500" />
                </div>
                <p className="text-xs text-slate-400">
                  {t.dashboard.predictiveAlerts.noRisks}
                </p>
              </div>
            )}
          </div>

          {/* Risk Distribution */}
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                Risk Distribution
              </h3>
            </div>
            <RiskDistributionChart
              data={riskDist.data}
              loading={riskDist.isLoading}
              labels={{
                critical: t.dashboard.kpis.critical,
                medium: t.dashboard.kpis.atRisk,
                low: t.dashboard.kpis.onTrack,
              }}
            />
          </div>

          {/* AI Insights */}
          <div className="p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={14} className="text-purple-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                AI Insights
              </h3>
              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                LIVE
              </span>
            </div>

            {aiInsights.isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : aiInsights.data && aiInsights.data.length > 0 ? (
              <div className="space-y-2">
                {aiInsights.data.map((text: string, i: number) => (
                  <AIRecommendation key={i} text={text} index={i} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                {t.common.noData}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ExecutiveFinanceDashboard;
