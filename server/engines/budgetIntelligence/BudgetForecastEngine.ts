/**
 * BudgetForecastEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Budget Forecasting and Burn-Rate Prediction
 *
 * PHASE 5: Budget Intelligence
 *
 * Capabilities:
 *  - Burn-rate calculation (daily, weekly, monthly)
 *  - Budget exhaustion prediction (when will money run out?)
 *  - Trend analysis (spending acceleration/deceleration)
 *  - Seasonal adjustment (historical patterns)
 *  - Confidence intervals (optimistic / expected / pessimistic)
 *  - AI-ready structure (plug in ML models in Phase 7+)
 *  - Cash flow forecast (when cash is needed)
 *
 * All forecasts are read-only computations — no mutations.
 */

import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface MonthlySpending {
  month: string;       // YYYY-MM
  amount: number;
  cumulative: number;
}

export interface BurnRate {
  budgetId: number;
  calculatedAt: string;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyBurnRate: number;
  weeklyBurnRate: number;
  monthlyBurnRate: number;
  /** Predicted date when budget will be exhausted */
  exhaustionDate: string | null;
  /** Days until exhaustion at current rate */
  daysUntilExhaustion: number | null;
  utilizationPercent: number;
  monthlySpending: MonthlySpending[];
}

export interface ForecastScenario {
  name: string;
  description: string;
  monthlyProjections: Array<{
    month: string;
    projectedSpending: number;
    cumulativeSpending: number;
    remainingBudget: number;
  }>;
  exhaustionDate: string | null;
  totalProjectedSpending: number;
  confidence: number;         // 0-1
}

export interface BudgetForecast {
  budgetId: number;
  budgetTitle: string;
  forecastDate: string;
  totalBudget: number;
  totalSpent: number;
  burnRate: BurnRate;
  scenarios: {
    optimistic: ForecastScenario;
    expected: ForecastScenario;
    pessimistic: ForecastScenario;
  };
  trend: SpendingTrend;
  alerts: ForecastAlert[];
}

export interface SpendingTrend {
  direction: 'accelerating' | 'steady' | 'decelerating';
  changePercent: number;       // Month-over-month change
  averageMonthlySpend: number;
  lastThreeMonthsAvg: number;
  priorThreeMonthsAvg: number;
}

export interface ForecastAlert {
  type: 'exhaustion_warning' | 'overspend_risk' | 'underspend_risk' | 'trend_change';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  actual: number;
}

export interface CashFlowForecast {
  budgetId: number;
  months: Array<{
    month: string;
    projectedExpenditure: number;
    projectedPayments: number;
    cumulativeCash: number;
    cashNeeded: number;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IBudgetForecastRepository {
  getBudgetHeader(budgetId: number, scope: RepositoryScope): Promise<{
    budgetId: number;
    budgetTitle: string;
    totalApproved: number;
    totalActual: number;
    periodStart: string;
    periodEnd: string;
    currency: string;
  } | null>;

  getMonthlySpending(budgetId: number, scope: RepositoryScope): Promise<MonthlySpending[]>;

  getHistoricalSpending(
    projectId: number,
    monthCount: number,
    scope: RepositoryScope,
  ): Promise<MonthlySpending[]>;
}

export interface BudgetForecastDependencies {
  forecastRepo: IBudgetForecastRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class BudgetForecastEngine {
  private repo: IBudgetForecastRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: BudgetForecastDependencies) {
    this.repo = deps.forecastRepo;
    this.logger = deps.logger.child({ service: 'BudgetForecastEngine' });
    this.config = deps.config;
  }

  /**
   * Calculate current burn rate for a budget.
   */
  async calculateBurnRate(budgetId: number, scope: RepositoryScope): Promise<BurnRate> {
    const header = await this.repo.getBudgetHeader(budgetId, scope);
    if (!header) throw new Error(`Budget ${budgetId} not found`);

    const monthlySpending = await this.repo.getMonthlySpending(budgetId, scope);

    const now = new Date();
    const periodStart = new Date(header.periodStart);
    const periodEnd = new Date(header.periodEnd);
    const daysElapsed = Math.max(1, Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.floor((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const totalSpent = header.totalActual;
    const totalRemaining = header.totalApproved - totalSpent;
    const dailyBurnRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const weeklyBurnRate = dailyBurnRate * 7;
    const monthlyBurnRate = dailyBurnRate * 30;

    let exhaustionDate: string | null = null;
    let daysUntilExhaustion: number | null = null;

    if (dailyBurnRate > 0 && totalRemaining > 0) {
      daysUntilExhaustion = Math.ceil(totalRemaining / dailyBurnRate);
      const exhaustion = new Date(now.getTime() + daysUntilExhaustion * 24 * 60 * 60 * 1000);
      exhaustionDate = exhaustion.toISOString().split('T')[0];
    }

    return {
      budgetId,
      calculatedAt: now.toISOString(),
      totalBudget: header.totalApproved,
      totalSpent,
      totalRemaining,
      daysElapsed,
      daysRemaining,
      dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
      weeklyBurnRate: Math.round(weeklyBurnRate * 100) / 100,
      monthlyBurnRate: Math.round(monthlyBurnRate * 100) / 100,
      exhaustionDate,
      daysUntilExhaustion,
      utilizationPercent: header.totalApproved > 0
        ? Math.round((totalSpent / header.totalApproved) * 100)
        : 0,
      monthlySpending,
    };
  }

  /**
   * Generate full forecast with optimistic/expected/pessimistic scenarios.
   */
  async generateForecast(
    budgetId: number,
    forecastMonths: number,
    scope: RepositoryScope,
  ): Promise<BudgetForecast> {
    const burnRate = await this.calculateBurnRate(budgetId, scope);
    const header = await this.repo.getBudgetHeader(budgetId, scope);
    if (!header) throw new Error(`Budget ${budgetId} not found`);

    const trend = this.analyzeTrend(burnRate.monthlySpending);

    // Generate three scenarios
    const optimistic = this.projectScenario(
      'Optimistic',
      'Spending decelerates by 20%',
      burnRate,
      forecastMonths,
      0.8,
    );

    const expected = this.projectScenario(
      'Expected',
      'Current burn rate continues',
      burnRate,
      forecastMonths,
      1.0,
    );

    const pessimistic = this.projectScenario(
      'Pessimistic',
      'Spending accelerates by 30%',
      burnRate,
      forecastMonths,
      1.3,
    );

    // Generate alerts
    const alerts = this.generateAlerts(burnRate, trend, header.totalApproved);

    this.logger.info('Budget forecast generated', {
      budgetId,
      forecastMonths,
      trend: trend.direction,
      alerts: alerts.length,
    });

    return {
      budgetId,
      budgetTitle: header.budgetTitle,
      forecastDate: new Date().toISOString(),
      totalBudget: header.totalApproved,
      totalSpent: burnRate.totalSpent,
      burnRate,
      scenarios: { optimistic, expected, pessimistic },
      trend,
      alerts,
    };
  }

  /**
   * Analyze spending trend.
   */
  private analyzeTrend(monthly: MonthlySpending[]): SpendingTrend {
    if (monthly.length < 2) {
      return {
        direction: 'steady',
        changePercent: 0,
        averageMonthlySpend: monthly.length > 0 ? monthly[0].amount : 0,
        lastThreeMonthsAvg: 0,
        priorThreeMonthsAvg: 0,
      };
    }

    const avg = monthly.reduce((s, m) => s + m.amount, 0) / monthly.length;
    const lastThree = monthly.slice(-3);
    const priorThree = monthly.slice(-6, -3);

    const lastAvg = lastThree.length > 0
      ? lastThree.reduce((s, m) => s + m.amount, 0) / lastThree.length
      : 0;
    const priorAvg = priorThree.length > 0
      ? priorThree.reduce((s, m) => s + m.amount, 0) / priorThree.length
      : avg;

    const change = priorAvg > 0 ? ((lastAvg - priorAvg) / priorAvg) * 100 : 0;

    let direction: SpendingTrend['direction'] = 'steady';
    if (change > 10) direction = 'accelerating';
    else if (change < -10) direction = 'decelerating';

    return {
      direction,
      changePercent: Math.round(change * 10) / 10,
      averageMonthlySpend: Math.round(avg * 100) / 100,
      lastThreeMonthsAvg: Math.round(lastAvg * 100) / 100,
      priorThreeMonthsAvg: Math.round(priorAvg * 100) / 100,
    };
  }

  /**
   * Project a scenario with a spending multiplier.
   */
  private projectScenario(
    name: string,
    description: string,
    burnRate: BurnRate,
    months: number,
    multiplier: number,
  ): ForecastScenario {
    const monthlyRate = burnRate.monthlyBurnRate * multiplier;
    const projections: ForecastScenario['monthlyProjections'] = [];
    let cumulative = burnRate.totalSpent;
    let exhaustionDate: string | null = null;

    const startDate = new Date();
    for (let i = 1; i <= months; i++) {
      const projDate = new Date(startDate);
      projDate.setMonth(projDate.getMonth() + i);
      const month = projDate.toISOString().slice(0, 7);

      cumulative += monthlyRate;
      const remaining = burnRate.totalBudget - cumulative;

      projections.push({
        month,
        projectedSpending: Math.round(monthlyRate * 100) / 100,
        cumulativeSpending: Math.round(cumulative * 100) / 100,
        remainingBudget: Math.round(Math.max(0, remaining) * 100) / 100,
      });

      if (remaining <= 0 && !exhaustionDate) {
        exhaustionDate = month;
      }
    }

    return {
      name,
      description,
      monthlyProjections: projections,
      exhaustionDate,
      totalProjectedSpending: Math.round(cumulative * 100) / 100,
      confidence: multiplier === 1.0 ? 0.7 : multiplier < 1.0 ? 0.85 : 0.6,
    };
  }

  /**
   * Generate forecast alerts.
   */
  private generateAlerts(
    burnRate: BurnRate,
    trend: SpendingTrend,
    totalBudget: number,
  ): ForecastAlert[] {
    const alerts: ForecastAlert[] = [];

    // Exhaustion warning
    if (burnRate.daysUntilExhaustion !== null && burnRate.daysUntilExhaustion < 90) {
      alerts.push({
        type: 'exhaustion_warning',
        severity: burnRate.daysUntilExhaustion < 30 ? 'critical' : 'warning',
        message: `Budget will be exhausted in ${burnRate.daysUntilExhaustion} days at current rate`,
        metric: 'daysUntilExhaustion',
        threshold: 90,
        actual: burnRate.daysUntilExhaustion,
      });
    }

    // Overspend risk
    if (burnRate.utilizationPercent > 80 && burnRate.daysRemaining > 60) {
      alerts.push({
        type: 'overspend_risk',
        severity: burnRate.utilizationPercent > 95 ? 'critical' : 'warning',
        message: `${burnRate.utilizationPercent}% utilised with ${burnRate.daysRemaining} days remaining`,
        metric: 'utilizationPercent',
        threshold: 80,
        actual: burnRate.utilizationPercent,
      });
    }

    // Underspend risk
    if (burnRate.utilizationPercent < 30 && burnRate.daysRemaining < 90) {
      alerts.push({
        type: 'underspend_risk',
        severity: 'warning',
        message: `Only ${burnRate.utilizationPercent}% utilised with ${burnRate.daysRemaining} days remaining`,
        metric: 'utilizationPercent',
        threshold: 50,
        actual: burnRate.utilizationPercent,
      });
    }

    // Trend change
    if (trend.direction === 'accelerating' && trend.changePercent > 25) {
      alerts.push({
        type: 'trend_change',
        severity: 'warning',
        message: `Spending accelerating: ${trend.changePercent}% increase vs prior period`,
        metric: 'trendChange',
        threshold: 25,
        actual: trend.changePercent,
      });
    }

    return alerts;
  }
}
