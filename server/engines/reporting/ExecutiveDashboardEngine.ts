/**
 * ExecutiveDashboardEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Executive Dashboard Data Computation
 *
 * PHASE 10: Enterprise Reporting
 *
 * Computes KPIs, trends, and visualisation data for executive dashboards.
 * Extends Phase 6 BudgetPerformanceScoreEngine with organisation-wide view.
 *
 * Dashboard sections:
 *  1. Financial Health KPIs (cash, liquidity, burn rate)
 *  2. Budget Performance (utilisation, variance, forecast accuracy)
 *  3. Grant Portfolio (active grants, compliance, donor mix)
 *  4. Operations (procurement pipeline, payment status, advances)
 *  5. Risk Indicators (budget overruns, FX exposure, cash gaps)
 *  6. Trend Charts (monthly spending, income, cash position)
 *
 * Output feeds into: Executive Dashboard export (Excel/PDF/PPTX).
 */

import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type KPIStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type TrendDirection = 'up' | 'down' | 'flat';

export interface KPICard {
  id: string;
  name: string;
  nameAR: string;
  nameIT: string;
  value: number;
  unit: string;
  format: 'currency' | 'percentage' | 'number' | 'days' | 'ratio';
  status: KPIStatus;
  trend: TrendDirection;
  previousValue?: number;
  changePercent?: number;
  target?: number;
  description?: string;
}

export interface TrendSeries {
  id: string;
  name: string;
  nameAR: string;
  nameIT: string;
  dataPoints: Array<{ period: string; value: number }>;
  chartType: 'line' | 'bar' | 'area';
}

export interface RiskIndicator {
  id: string;
  name: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metric: number;
  threshold: number;
  action?: string;
}

export interface ExecutiveDashboard {
  generatedAt: string;
  organizationId: number;
  baseCurrency: string;
  period: string;

  // Sections
  financialHealth: KPICard[];
  budgetPerformance: KPICard[];
  grantPortfolio: {
    kpis: KPICard[];
    donorMix: Array<{ donorName: string; amount: number; percent: number }>;
    grantStatusBreakdown: Array<{ status: string; count: number }>;
  };
  operations: KPICard[];
  risks: RiskIndicator[];

  // Trends
  spendingTrend: TrendSeries;
  incomeTrend: TrendSeries;
  cashTrend: TrendSeries;
  burnRateTrend: TrendSeries;

  // Summary
  overallScore: number;
  overallGrade: string;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IExecutiveDashboardRepository {
  // Financial health
  getCashPosition(scope: RepositoryScope): Promise<{ total: number; currency: string }>;
  getLiquidityRatio(scope: RepositoryScope): Promise<number>;
  getBurnRate(scope: RepositoryScope): Promise<{ daily: number; monthly: number; daysOfCash: number }>;
  getWorkingCapital(scope: RepositoryScope): Promise<number>;

  // Budget
  getBudgetUtilization(scope: RepositoryScope): Promise<{ totalApproved: number; totalActual: number; totalCommitted: number }>;
  getForecastAccuracy(scope: RepositoryScope): Promise<number>;
  getOverspendCount(scope: RepositoryScope): Promise<number>;

  // Grants
  getActiveGrantCount(scope: RepositoryScope): Promise<number>;
  getTotalGrantValue(scope: RepositoryScope): Promise<number>;
  getDonorMix(scope: RepositoryScope): Promise<Array<{ donorName: string; amount: number }>>;
  getGrantStatusBreakdown(scope: RepositoryScope): Promise<Array<{ status: string; count: number }>>;
  getComplianceViolations(scope: RepositoryScope): Promise<number>;

  // Operations
  getPendingPayments(scope: RepositoryScope): Promise<{ count: number; amount: number }>;
  getOutstandingAdvances(scope: RepositoryScope): Promise<{ count: number; amount: number }>;
  getOpenPurchaseOrders(scope: RepositoryScope): Promise<{ count: number; amount: number }>;
  getOverduePayables(scope: RepositoryScope): Promise<{ count: number; amount: number }>;

  // Trends (monthly for last 12 months)
  getMonthlySpending(scope: RepositoryScope, months: number): Promise<Array<{ period: string; value: number }>>;
  getMonthlyIncome(scope: RepositoryScope, months: number): Promise<Array<{ period: string; value: number }>>;
  getMonthlyCash(scope: RepositoryScope, months: number): Promise<Array<{ period: string; value: number }>>;
  getMonthlyBurnRate(scope: RepositoryScope, months: number): Promise<Array<{ period: string; value: number }>>;

  // Risks
  getFXExposureRisk(scope: RepositoryScope): Promise<{ level: string; exposure: number; threshold: number }>;
  getCashGapRisk(scope: RepositoryScope): Promise<{ level: string; gapMonths: number }>;

  // Previous period values (for trend comparison)
  getPreviousPeriodKPIs(scope: RepositoryScope): Promise<Record<string, number>>;
}

export interface ExecutiveDashboardDependencies {
  dashRepo: IExecutiveDashboardRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ExecutiveDashboardEngine {
  private repo: IExecutiveDashboardRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: ExecutiveDashboardDependencies) {
    this.repo = deps.dashRepo;
    this.logger = deps.logger.child({ service: 'ExecutiveDashboardEngine' });
    this.config = deps.config;
  }

  /**
   * Compute full executive dashboard.
   */
  async compute(scope: RepositoryScope): Promise<ExecutiveDashboard> {
    const t0 = Date.now();
    const prev = await this.repo.getPreviousPeriodKPIs(scope);

    // Parallel data fetch
    const [
      cash, liquidity, burnRate, workingCapital,
      budgetUtil, forecastAcc, overspend,
      activeGrants, totalGrantValue, donorMix, grantStatus, violations,
      pendingPay, advances, openPOs, overdue,
      spendingData, incomeData, cashData, burnData,
      fxRisk, cashGapRisk,
    ] = await Promise.all([
      this.repo.getCashPosition(scope),
      this.repo.getLiquidityRatio(scope),
      this.repo.getBurnRate(scope),
      this.repo.getWorkingCapital(scope),
      this.repo.getBudgetUtilization(scope),
      this.repo.getForecastAccuracy(scope),
      this.repo.getOverspendCount(scope),
      this.repo.getActiveGrantCount(scope),
      this.repo.getTotalGrantValue(scope),
      this.repo.getDonorMix(scope),
      this.repo.getGrantStatusBreakdown(scope),
      this.repo.getComplianceViolations(scope),
      this.repo.getPendingPayments(scope),
      this.repo.getOutstandingAdvances(scope),
      this.repo.getOpenPurchaseOrders(scope),
      this.repo.getOverduePayables(scope),
      this.repo.getMonthlySpending(scope, 12),
      this.repo.getMonthlyIncome(scope, 12),
      this.repo.getMonthlyCash(scope, 12),
      this.repo.getMonthlyBurnRate(scope, 12),
      this.repo.getFXExposureRisk(scope),
      this.repo.getCashGapRisk(scope),
    ]);

    const utilPercent = budgetUtil.totalApproved > 0 ? (budgetUtil.totalActual / budgetUtil.totalApproved) * 100 : 0;

    // Financial Health KPIs
    const financialHealth: KPICard[] = [
      this.kpi('cash_position', 'Cash Position', 'المركز النقدي', 'Posizione di Cassa', cash.total, cash.currency, 'currency', this.cashStatus(burnRate.daysOfCash), prev.cash_position),
      this.kpi('days_of_cash', 'Days of Cash', 'أيام السيولة', 'Giorni di Cassa', burnRate.daysOfCash, 'days', 'days', this.daysStatus(burnRate.daysOfCash), prev.days_of_cash),
      this.kpi('liquidity_ratio', 'Liquidity Ratio', 'نسبة السيولة', 'Rapporto di Liquidità', liquidity, 'ratio', 'ratio', liquidity >= 1.5 ? 'good' : liquidity >= 1 ? 'fair' : 'critical', prev.liquidity_ratio),
      this.kpi('burn_rate', 'Monthly Burn Rate', 'معدل الإنفاق الشهري', 'Tasso di Consumo Mensile', burnRate.monthly, cash.currency, 'currency', 'good', prev.burn_rate),
    ];

    // Budget Performance KPIs
    const budgetPerformance: KPICard[] = [
      this.kpi('budget_util', 'Budget Utilization', 'استخدام الميزانية', 'Utilizzo Budget', utilPercent, '%', 'percentage', this.utilStatus(utilPercent), prev.budget_util),
      this.kpi('forecast_accuracy', 'Forecast Accuracy', 'دقة التوقعات', 'Accuratezza Previsioni', forecastAcc, '%', 'percentage', forecastAcc >= 80 ? 'good' : forecastAcc >= 60 ? 'fair' : 'poor', prev.forecast_accuracy),
      this.kpi('overspend_budgets', 'Budgets Over-spent', 'ميزانيات متجاوزة', 'Budget Sforati', overspend, 'budgets', 'number', overspend === 0 ? 'excellent' : overspend <= 2 ? 'fair' : 'critical', prev.overspend_budgets),
    ];

    // Grant Portfolio
    const totalDonor = donorMix.reduce((s, d) => s + d.amount, 0);
    const grantPortfolio = {
      kpis: [
        this.kpi('active_grants', 'Active Grants', 'المنح النشطة', 'Contributi Attivi', activeGrants, 'grants', 'number', 'good', prev.active_grants),
        this.kpi('grant_value', 'Total Grant Value', 'إجمالي قيمة المنح', 'Valore Totale Contributi', totalGrantValue, cash.currency, 'currency', 'good', prev.grant_value),
        this.kpi('compliance_violations', 'Compliance Issues', 'مشكلات الامتثال', 'Problemi di Conformità', violations, 'issues', 'number', violations === 0 ? 'excellent' : 'critical', prev.compliance_violations),
      ],
      donorMix: donorMix.map(d => ({ donorName: d.donorName, amount: d.amount, percent: totalDonor > 0 ? Math.round((d.amount / totalDonor) * 100) : 0 })),
      grantStatusBreakdown: grantStatus,
    };

    // Operations KPIs
    const operations: KPICard[] = [
      this.kpi('pending_payments', 'Pending Payments', 'مدفوعات معلقة', 'Pagamenti in Sospeso', pendingPay.amount, cash.currency, 'currency', pendingPay.count > 50 ? 'poor' : 'good', prev.pending_payments, `${pendingPay.count} payments`),
      this.kpi('outstanding_advances', 'Outstanding Advances', 'سلف مستحقة', 'Anticipi in Sospeso', advances.amount, cash.currency, 'currency', advances.count > 20 ? 'fair' : 'good', prev.outstanding_advances),
      this.kpi('open_pos', 'Open POs', 'أوامر شراء مفتوحة', 'OA Aperti', openPOs.count, 'POs', 'number', 'good', prev.open_pos),
      this.kpi('overdue_payables', 'Overdue Payables', 'مستحقات متأخرة', 'Debiti Scaduti', overdue.amount, cash.currency, 'currency', overdue.count === 0 ? 'excellent' : 'poor', prev.overdue_payables),
    ];

    // Risk Indicators
    const risks: RiskIndicator[] = [
      { id: 'fx_risk', name: 'FX Exposure', level: fxRisk.level as RiskIndicator['level'], description: `Total FX exposure: ${fxRisk.exposure}`, metric: fxRisk.exposure, threshold: fxRisk.threshold },
      { id: 'cash_gap', name: 'Cash Gap Risk', level: cashGapRisk.level as RiskIndicator['level'], description: `${cashGapRisk.gapMonths} months with projected cash gaps`, metric: cashGapRisk.gapMonths, threshold: 0 },
    ];
    if (overspend > 0) risks.push({ id: 'overspend', name: 'Budget Overspend', level: overspend > 3 ? 'critical' : 'high', description: `${overspend} budgets over-spent`, metric: overspend, threshold: 0 });
    if (violations > 0) risks.push({ id: 'compliance', name: 'Compliance', level: 'high', description: `${violations} compliance violations`, metric: violations, threshold: 0 });

    // Trends
    const spendingTrend = this.buildTrend('spending', 'Monthly Spending', 'الإنفاق الشهري', 'Spesa Mensile', spendingData, 'bar');
    const incomeTrend = this.buildTrend('income', 'Monthly Income', 'الدخل الشهري', 'Reddito Mensile', incomeData, 'line');
    const cashTrend = this.buildTrend('cash', 'Cash Position', 'المركز النقدي', 'Posizione di Cassa', cashData, 'area');
    const burnRateTrend = this.buildTrend('burn', 'Burn Rate', 'معدل الإنفاق', 'Tasso di Consumo', burnData, 'line');

    // Overall score (simple weighted average of key KPIs)
    const scores = [
      this.statusToScore(financialHealth[1].status) * 0.25, // days of cash
      this.statusToScore(budgetPerformance[0].status) * 0.25, // utilization
      this.statusToScore(budgetPerformance[1].status) * 0.15, // forecast accuracy
      violations === 0 ? 25 : 0, // compliance
      risks.filter(r => r.level === 'critical').length === 0 ? 10 : 0,
    ];
    const overallScore = Math.round(scores.reduce((s, v) => s + v, 0));
    const overallGrade = overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 55 ? 'C' : overallScore >= 40 ? 'D' : 'F';

    this.logger.info('Executive dashboard computed', {
      executionMs: Date.now() - t0,
      kpis: financialHealth.length + budgetPerformance.length + grantPortfolio.kpis.length + operations.length,
      risks: risks.length,
      overallScore,
      overallGrade,
    });

    return {
      generatedAt: new Date().toISOString(),
      organizationId: scope.organizationId,
      baseCurrency: cash.currency,
      period: new Date().toISOString().slice(0, 7),
      financialHealth,
      budgetPerformance,
      grantPortfolio,
      operations,
      risks,
      spendingTrend,
      incomeTrend,
      cashTrend,
      burnRateTrend,
      overallScore,
      overallGrade,
    };
  }

  // ── PRIVATE ──

  private kpi(id: string, name: string, nameAR: string, nameIT: string, value: number, unit: string, format: KPICard['format'], status: KPIStatus, previousValue?: number, description?: string): KPICard {
    const changePercent = previousValue && previousValue !== 0 ? Math.round(((value - previousValue) / previousValue) * 100 * 10) / 10 : undefined;
    const trend: TrendDirection = changePercent === undefined ? 'flat' : changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'flat';
    return { id, name, nameAR, nameIT, value: Math.round(value * 100) / 100, unit, format, status, trend, previousValue, changePercent, description };
  }

  private buildTrend(id: string, name: string, nameAR: string, nameIT: string, data: Array<{ period: string; value: number }>, chartType: TrendSeries['chartType']): TrendSeries {
    return { id, name, nameAR, nameIT, dataPoints: data, chartType };
  }

  private cashStatus(daysOfCash: number): KPIStatus { return daysOfCash >= 90 ? 'excellent' : daysOfCash >= 60 ? 'good' : daysOfCash >= 30 ? 'fair' : 'critical'; }
  private daysStatus(days: number): KPIStatus { return days >= 90 ? 'excellent' : days >= 60 ? 'good' : days >= 30 ? 'fair' : 'critical'; }
  private utilStatus(pct: number): KPIStatus { return pct >= 80 && pct <= 100 ? 'excellent' : pct >= 60 ? 'good' : pct >= 40 ? 'fair' : 'poor'; }
  private statusToScore(s: KPIStatus): number { return s === 'excellent' ? 100 : s === 'good' ? 80 : s === 'fair' ? 60 : s === 'poor' ? 40 : 20; }
}
