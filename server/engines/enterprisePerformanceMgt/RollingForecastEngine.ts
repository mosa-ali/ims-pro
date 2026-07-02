/**
 * RollingForecastEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Rolling Forecasts — Continuous Re-Forecasting
 *
 * PHASE 6: Enterprise Performance Management
 *
 * Instead of a static annual budget, rolling forecasts continuously
 * update expectations as actuals arrive:
 *
 *   Original Budget → Forecast M1 → Forecast M2 → ... → Latest Estimate
 *
 * Each month:
 *   1. Lock actual months (cannot change)
 *   2. Update forecast months with latest information
 *   3. Compare forecast vs original budget vs actuals
 *   4. Generate variance analysis
 *
 * Standard in Workday Adaptive Planning, Anaplan, Oracle EPM.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface RollingForecast {
  forecastId: string;
  budgetId: number;
  budgetLineId?: number;
  organizationId: number;
  fiscalYear: string;
  version: number;
  createdAt: string;
  createdBy: number;
  status: 'draft' | 'submitted' | 'approved';
  months: ForecastMonth[];
}

export interface ForecastMonth {
  month: string;            // YYYY-MM
  type: 'actual' | 'forecast';
  originalBudget: number;
  latestForecast: number;
  actual: number;           // 0 if type=forecast
  variance: number;         // latestForecast - originalBudget
  variancePercent: number;
  notes?: string;
  adjustedBy?: number;
  adjustedAt?: string;
}

export interface ForecastComparison {
  budgetId: number;
  month: string;
  originalBudget: number;
  forecastVersions: Array<{
    version: number;
    forecastAmount: number;
    createdAt: string;
  }>;
  actual: number;
  latestForecast: number;
  budgetVsActual: number;
  forecastVsActual: number;
  forecastAccuracy: number;   // 0-100%
}

export interface LatestEstimate {
  budgetId: number;
  fiscalYear: string;
  totalOriginalBudget: number;
  totalLatestEstimate: number;
  totalActualToDate: number;
  totalRemainingForecast: number;
  varianceFromOriginal: number;
  variancePercent: number;
  forecastAccuracy: number;
  monthlyBreakdown: ForecastMonth[];
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IRollingForecastRepository {
  save(forecast: RollingForecast): Promise<void>;
  getLatest(budgetId: number, scope: RepositoryScope): Promise<RollingForecast | null>;
  getByVersion(budgetId: number, version: number, scope: RepositoryScope): Promise<RollingForecast | null>;
  listVersions(budgetId: number, scope: RepositoryScope): Promise<RollingForecast[]>;
  update(forecastId: string, fields: Partial<RollingForecast>): Promise<void>;
  getActualsByMonth(budgetId: number, scope: RepositoryScope): Promise<Array<{ month: string; amount: number }>>;
  getOriginalBudgetByMonth(budgetId: number, scope: RepositoryScope): Promise<Array<{ month: string; amount: number }>>;
}

export interface RollingForecastDependencies {
  forecastRepo: IRollingForecastRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class RollingForecastEngine {
  private repo: IRollingForecastRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: RollingForecastDependencies) {
    this.repo = deps.forecastRepo;
    this.logger = deps.logger.child({ service: 'RollingForecastEngine' });
    this.config = deps.config;
  }

  /**
   * Initialize a rolling forecast for a budget.
   * Starts with original budget amounts as the initial forecast.
   */
  async initialize(
    budgetId: number,
    fiscalYear: string,
    userId: number,
    scope: RepositoryScope,
  ): Promise<RollingForecast> {
    const originalByMonth = await this.repo.getOriginalBudgetByMonth(budgetId, scope);

    const months: ForecastMonth[] = originalByMonth.map(m => ({
      month: m.month,
      type: 'forecast' as const,
      originalBudget: m.amount,
      latestForecast: m.amount,  // Initially = original budget
      actual: 0,
      variance: 0,
      variancePercent: 0,
    }));

    const forecast: RollingForecast = {
      forecastId: uuidv4(),
      budgetId,
      organizationId: scope.organizationId,
      fiscalYear,
      version: 1,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      status: 'draft',
      months,
    };

    await this.repo.save(forecast);
    this.logger.info('Rolling forecast initialized', { budgetId, fiscalYear, months: months.length });
    return forecast;
  }

  /**
   * Update the forecast — lock actuals, adjust future months.
   * Creates a new version (immutable history).
   */
  async updateForecast(
    budgetId: number,
    adjustments: Array<{ month: string; newForecast: number; notes?: string }>,
    userId: number,
    scope: RepositoryScope,
  ): Promise<RollingForecast> {
    const current = await this.repo.getLatest(budgetId, scope);
    if (!current) throw new Error(`No rolling forecast for budget ${budgetId}`);

    const actuals = await this.repo.getActualsByMonth(budgetId, scope);
    const actualMap = new Map(actuals.map(a => [a.month, a.amount]));
    const adjustmentMap = new Map(adjustments.map(a => [a.month, a]));

    const today = new Date().toISOString().slice(0, 7); // YYYY-MM

    const updatedMonths: ForecastMonth[] = current.months.map(m => {
      const actual = actualMap.get(m.month) || 0;
      const isPast = m.month < today;
      const adj = adjustmentMap.get(m.month);

      const latestForecast = isPast
        ? actual                                    // Past months: lock to actual
        : adj ? adj.newForecast : m.latestForecast; // Future: use adjustment or carry forward

      const variance = latestForecast - m.originalBudget;
      const variancePercent = m.originalBudget > 0
        ? Math.round((variance / m.originalBudget) * 100 * 10) / 10
        : 0;

      return {
        month: m.month,
        type: isPast ? 'actual' as const : 'forecast' as const,
        originalBudget: m.originalBudget,
        latestForecast,
        actual: isPast ? actual : 0,
        variance,
        variancePercent,
        notes: adj?.notes || m.notes,
        adjustedBy: adj ? userId : m.adjustedBy,
        adjustedAt: adj ? new Date().toISOString() : m.adjustedAt,
      };
    });

    const newForecast: RollingForecast = {
      forecastId: uuidv4(),
      budgetId,
      organizationId: scope.organizationId,
      fiscalYear: current.fiscalYear,
      version: current.version + 1,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      status: 'draft',
      months: updatedMonths,
    };

    await this.repo.save(newForecast);

    this.logger.info('Rolling forecast updated', {
      budgetId,
      version: newForecast.version,
      adjustments: adjustments.length,
    });

    return newForecast;
  }

  /**
   * Get the Latest Estimate (LE) — combines actuals with latest forecast.
   */
  async getLatestEstimate(budgetId: number, scope: RepositoryScope): Promise<LatestEstimate> {
    const forecast = await this.repo.getLatest(budgetId, scope);
    if (!forecast) throw new Error(`No rolling forecast for budget ${budgetId}`);

    const actuals = await this.repo.getActualsByMonth(budgetId, scope);
    const actualMap = new Map(actuals.map(a => [a.month, a.amount]));
    const today = new Date().toISOString().slice(0, 7);

    let totalOriginal = 0;
    let totalEstimate = 0;
    let totalActual = 0;
    let totalRemainingForecast = 0;

    const breakdown: ForecastMonth[] = forecast.months.map(m => {
      const isPast = m.month < today;
      const actual = actualMap.get(m.month) || 0;
      const estimate = isPast ? actual : m.latestForecast;

      totalOriginal += m.originalBudget;
      totalEstimate += estimate;
      totalActual += isPast ? actual : 0;
      totalRemainingForecast += isPast ? 0 : m.latestForecast;

      return { ...m, actual: isPast ? actual : 0, latestForecast: estimate };
    });

    // Forecast accuracy = 1 - |forecast - actual| / actual (for past months)
    const pastMonths = breakdown.filter(m => m.type === 'actual' && m.actual > 0);
    let accuracySum = 0;
    for (const pm of pastMonths) {
      const prevForecast = forecast.months.find(m => m.month === pm.month)?.latestForecast || 0;
      if (pm.actual > 0) {
        accuracySum += Math.max(0, 1 - Math.abs(prevForecast - pm.actual) / pm.actual);
      }
    }
    const forecastAccuracy = pastMonths.length > 0
      ? Math.round((accuracySum / pastMonths.length) * 100)
      : 100;

    return {
      budgetId,
      fiscalYear: forecast.fiscalYear,
      totalOriginalBudget: totalOriginal,
      totalLatestEstimate: totalEstimate,
      totalActualToDate: totalActual,
      totalRemainingForecast,
      varianceFromOriginal: totalEstimate - totalOriginal,
      variancePercent: totalOriginal > 0
        ? Math.round(((totalEstimate - totalOriginal) / totalOriginal) * 100 * 10) / 10
        : 0,
      forecastAccuracy,
      monthlyBreakdown: breakdown,
    };
  }

  /**
   * Compare forecast versions for a specific month.
   */
  async compareVersions(
    budgetId: number,
    month: string,
    scope: RepositoryScope,
  ): Promise<ForecastComparison> {
    const versions = await this.repo.listVersions(budgetId, scope);
    const actuals = await this.repo.getActualsByMonth(budgetId, scope);
    const actualAmount = actuals.find(a => a.month === month)?.amount || 0;

    const forecastVersions = versions.map(v => {
      const m = v.months.find(fm => fm.month === month);
      return {
        version: v.version,
        forecastAmount: m?.latestForecast || 0,
        createdAt: v.createdAt,
      };
    });

    const latest = forecastVersions[forecastVersions.length - 1];
    const original = forecastVersions[0];

    return {
      budgetId,
      month,
      originalBudget: original?.forecastAmount || 0,
      forecastVersions,
      actual: actualAmount,
      latestForecast: latest?.forecastAmount || 0,
      budgetVsActual: (original?.forecastAmount || 0) - actualAmount,
      forecastVsActual: (latest?.forecastAmount || 0) - actualAmount,
      forecastAccuracy: actualAmount > 0
        ? Math.round(Math.max(0, 1 - Math.abs((latest?.forecastAmount || 0) - actualAmount) / actualAmount) * 100)
        : 100,
    };
  }
}
