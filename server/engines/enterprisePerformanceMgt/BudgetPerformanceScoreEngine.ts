/**
 * BudgetPerformanceScoreEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Composite Budget Performance Score
 *
 * PHASE 6: Enterprise Performance Management
 *
 * Single executive indicator per project or grant combining:
 *
 *   1. Burn Rate Score       — is spending on track?
 *   2. Utilization Score     — how much budget consumed?
 *   3. Forecast Accuracy     — how accurate were past forecasts?
 *   4. Implementation Score  — activities vs timeline progress?
 *   5. Procurement Score     — PO pipeline healthy?
 *   6. Commitment Ratio      — encumbrance vs budget?
 *   7. Overspend Risk        — probability of exceeding budget?
 *   8. Underspend Risk       — probability of returning funds?
 *
 * Overall score: weighted average → 0-100 → A/B/C/D/F grade
 */

import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type PerformanceGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DimensionScore {
  dimension: string;
  score: number;        // 0-100
  weight: number;       // % weight in composite
  weightedScore: number; // score × weight / 100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  insight: string;       // Human-readable explanation
}

export interface PerformanceScore {
  entityType: 'project' | 'grant' | 'budget';
  entityId: number;
  entityName: string;
  calculatedAt: string;
  overallScore: number;         // 0-100
  grade: PerformanceGrade;
  dimensions: DimensionScore[];
  trend: 'improving' | 'stable' | 'declining';
  previousScore?: number;
  alerts: string[];
  recommendations: string[];
}

export interface PerformanceScoreConfig {
  weights: {
    burnRate: number;
    utilization: number;
    forecastAccuracy: number;
    implementation: number;
    procurement: number;
    commitmentRatio: number;
    overspendRisk: number;
    underspendRisk: number;
  };
  gradeThresholds: {
    A: number;  // >= this
    B: number;
    C: number;
    D: number;
    // F = below D
  };
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IPerformanceRepository {
  getBudgetMetrics(budgetId: number, scope: RepositoryScope): Promise<{
    totalApproved: number;
    totalActual: number;
    totalCommitted: number;
    totalObligated: number;
    periodStartDate: string;
    periodEndDate: string;
  } | null>;

  getMonthlySpending(budgetId: number, scope: RepositoryScope): Promise<Array<{ month: string; amount: number }>>;
  getForecastAccuracy(budgetId: number, scope: RepositoryScope): Promise<number>;
  getImplementationProgress(projectId: number, scope: RepositoryScope): Promise<number>;
  getProcurementPerformance(projectId: number, scope: RepositoryScope): Promise<{ onTimePercent: number; totalPOs: number }>;
  getPreviousScore(entityType: string, entityId: number, scope: RepositoryScope): Promise<number | null>;
}

export interface PerformanceDependencies {
  perfRepo: IPerformanceRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class BudgetPerformanceScoreEngine {
  private repo: IPerformanceRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: PerformanceDependencies) {
    this.repo = deps.perfRepo;
    this.logger = deps.logger.child({ service: 'PerformanceScore' });
    this.config = deps.config;
  }

  /**
   * Calculate composite performance score for a budget.
   */
  async calculate(
    budgetId: number,
    projectId: number,
    entityName: string,
    scope: RepositoryScope,
  ): Promise<PerformanceScore> {
    const metrics = await this.repo.getBudgetMetrics(budgetId, scope);
    if (!metrics) throw new Error(`Budget ${budgetId} not found`);

    const scoreConfig = this.getScoreConfig();
    const dimensions: DimensionScore[] = [];
    const alerts: string[] = [];
    const recommendations: string[] = [];

    // Calculate elapsed percentage of budget period
    const now = Date.now();
    const start = new Date(metrics.periodStartDate).getTime();
    const end = new Date(metrics.periodEndDate).getTime();
    const elapsed = Math.max(0, Math.min(1, (now - start) / (end - start)));

    // 1. Burn Rate Score
    const utilizationPct = metrics.totalApproved > 0 ? metrics.totalActual / metrics.totalApproved : 0;
    const burnDeviation = Math.abs(utilizationPct - elapsed);
    const burnScore = Math.max(0, 100 - burnDeviation * 200);
    dimensions.push(this.makeDimension('Burn Rate', burnScore, scoreConfig.weights.burnRate,
      burnScore > 80 ? 'Spending on track with timeline' : `Spending ${utilizationPct > elapsed ? 'ahead' : 'behind'} schedule by ${(burnDeviation * 100).toFixed(0)}%`));

    if (burnScore < 50) alerts.push('Burn rate significantly off track');

    // 2. Utilization Score
    const targetUtilization = elapsed * 100;
    const actualUtilization = utilizationPct * 100;
    const utilDiff = Math.abs(actualUtilization - targetUtilization);
    const utilScore = Math.max(0, 100 - utilDiff * 2);
    dimensions.push(this.makeDimension('Utilization', utilScore, scoreConfig.weights.utilization,
      `${actualUtilization.toFixed(0)}% utilized, ${(elapsed * 100).toFixed(0)}% of period elapsed`));

    // 3. Forecast Accuracy
    const forecastAcc = await this.repo.getForecastAccuracy(budgetId, scope);
    const accScore = forecastAcc;
    dimensions.push(this.makeDimension('Forecast Accuracy', accScore, scoreConfig.weights.forecastAccuracy,
      `${accScore}% accurate in past forecasts`));

    if (accScore < 60) recommendations.push('Improve forecast methodology — consider risk-adjusted forecasting');

    // 4. Implementation Progress
    const implProgress = await this.repo.getImplementationProgress(projectId, scope);
    const implScore = Math.max(0, 100 - Math.abs(implProgress - elapsed * 100) * 2);
    dimensions.push(this.makeDimension('Implementation', implScore, scoreConfig.weights.implementation,
      `${implProgress.toFixed(0)}% of activities completed`));

    // 5. Procurement Performance
    const procPerf = await this.repo.getProcurementPerformance(projectId, scope);
    const procScore = procPerf.totalPOs > 0 ? procPerf.onTimePercent : 100;
    dimensions.push(this.makeDimension('Procurement', procScore, scoreConfig.weights.procurement,
      `${procScore}% of POs delivered on time (${procPerf.totalPOs} total)`));

    if (procScore < 70) recommendations.push('Address procurement bottlenecks — review vendor performance');

    // 6. Commitment Ratio
    const encumbrance = metrics.totalActual + metrics.totalCommitted + metrics.totalObligated;
    const encumbrancePct = metrics.totalApproved > 0 ? (encumbrance / metrics.totalApproved) * 100 : 0;
    const commitScore = encumbrancePct <= 95 ? Math.min(100, encumbrancePct + 10) : Math.max(0, 200 - encumbrancePct * 2);
    dimensions.push(this.makeDimension('Commitment Ratio', commitScore, scoreConfig.weights.commitmentRatio,
      `${encumbrancePct.toFixed(0)}% of budget encumbered (actual + committed + obligated)`));

    // 7. Overspend Risk
    const overRisk = encumbrancePct > 90 ? 100 - (encumbrancePct - 90) * 10 : 100;
    dimensions.push(this.makeDimension('Overspend Risk', Math.max(0, overRisk), scoreConfig.weights.overspendRisk,
      encumbrancePct > 90 ? `High overspend risk at ${encumbrancePct.toFixed(0)}% encumbered` : 'Overspend risk within tolerance'));

    if (overRisk < 30) alerts.push('Critical overspend risk — encumbrance approaching 100%');

    // 8. Underspend Risk
    const underRisk = (utilizationPct < elapsed * 0.7 && elapsed > 0.5) ? Math.max(0, utilizationPct / (elapsed * 0.7) * 100) : 100;
    dimensions.push(this.makeDimension('Underspend Risk', Math.min(100, underRisk), scoreConfig.weights.underspendRisk,
      underRisk < 70 ? `Underspend risk — may return unused funds` : 'Underspend risk within tolerance'));

    if (underRisk < 50 && elapsed > 0.6) recommendations.push('Accelerate implementation to avoid returning funds to donors');

    // Composite score
    const overallScore = Math.round(
      dimensions.reduce((s, d) => s + d.weightedScore, 0),
    );
    const grade = this.getGrade(overallScore, scoreConfig);

    // Trend
    const previousScore = await this.repo.getPreviousScore('budget', budgetId, scope);
    let trend: PerformanceScore['trend'] = 'stable';
    if (previousScore !== null) {
      if (overallScore > previousScore + 3) trend = 'improving';
      else if (overallScore < previousScore - 3) trend = 'declining';
    }

    this.logger.info('Performance score calculated', {
      budgetId, overallScore, grade, trend, dimensions: dimensions.length,
    });

    return {
      entityType: 'budget',
      entityId: budgetId,
      entityName,
      calculatedAt: new Date().toISOString(),
      overallScore,
      grade,
      dimensions,
      trend,
      previousScore: previousScore ?? undefined,
      alerts,
      recommendations,
    };
  }

  // ── PRIVATE ──

  private getScoreConfig(): PerformanceScoreConfig {
    return {
      weights: {
        burnRate: this.config.getNumber('performance.weight.burnRate', 20),
        utilization: this.config.getNumber('performance.weight.utilization', 15),
        forecastAccuracy: this.config.getNumber('performance.weight.forecastAccuracy', 10),
        implementation: this.config.getNumber('performance.weight.implementation', 15),
        procurement: this.config.getNumber('performance.weight.procurement', 10),
        commitmentRatio: this.config.getNumber('performance.weight.commitmentRatio', 10),
        overspendRisk: this.config.getNumber('performance.weight.overspendRisk', 10),
        underspendRisk: this.config.getNumber('performance.weight.underspendRisk', 10),
      },
      gradeThresholds: { A: 85, B: 70, C: 55, D: 40 },
    };
  }

  private getGrade(score: number, config: PerformanceScoreConfig): PerformanceGrade {
    if (score >= config.gradeThresholds.A) return 'A';
    if (score >= config.gradeThresholds.B) return 'B';
    if (score >= config.gradeThresholds.C) return 'C';
    if (score >= config.gradeThresholds.D) return 'D';
    return 'F';
  }

  private makeDimension(
    name: string,
    score: number,
    weight: number,
    insight: string,
  ): DimensionScore {
    const s = Math.round(Math.max(0, Math.min(100, score)));
    return {
      dimension: name,
      score: s,
      weight,
      weightedScore: Math.round(s * weight / 100 * 10) / 10,
      status: s >= 85 ? 'excellent' : s >= 70 ? 'good' : s >= 55 ? 'fair' : s >= 40 ? 'poor' : 'critical',
      insight,
    };
  }
}
