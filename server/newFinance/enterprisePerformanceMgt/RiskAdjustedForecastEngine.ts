/**
 * RiskAdjustedForecastEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Risk-Adjusted Forecasting
 *
 * PHASE 6: Enterprise Performance Management
 *
 * Enhances forecasts with real-world risk factors:
 *
 *  - Procurement delays (historical lead times)
 *  - Exchange-rate movements (FX volatility)
 *  - Inflation (country-specific CPI)
 *  - Staffing vacancies (recruitment pipeline)
 *  - Implementation delays (project schedule risk)
 *  - Seasonal disruptions (conflict, weather, holidays)
 *  - Donor disbursement timing (cash-in uncertainty)
 *
 * Each factor has a probability and impact range.
 * Combined into a Monte Carlo-style risk-adjusted forecast.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type RiskCategory =
  | 'procurement_delay'
  | 'fx_movement'
  | 'inflation'
  | 'staffing_vacancy'
  | 'implementation_delay'
  | 'seasonal_disruption'
  | 'donor_disbursement'
  | 'security'
  | 'regulatory'
  | 'custom';

export interface RiskFactor {
  factorId: string;
  category: RiskCategory;
  name: string;
  description: string;
  /** Probability of occurrence (0-1) */
  probability: number;
  /** Impact as percentage of affected budget (+/-) */
  impactPercent: number;
  /** Which budget lines this factor affects */
  affectedLineIds?: number[];
  /** Which months this factor is most likely */
  affectedMonths?: string[];
  /** Source of risk estimate */
  source: 'historical' | 'expert_judgment' | 'market_data' | 'model';
  /** Confidence in the estimate (0-1) */
  confidence: number;
}

export interface RiskScenario {
  scenarioId: string;
  name: string;
  description: string;
  factors: RiskFactor[];
  budgetId: number;
  organizationId: number;
  createdBy: number;
  createdAt: string;
}

export interface RiskAdjustedForecast {
  budgetId: number;
  scenarioId: string;
  scenarioName: string;
  calculatedAt: string;
  baseForecast: number;
  riskAdjustedForecast: number;
  totalRiskImpact: number;
  confidenceInterval: {
    low: number;     // P10 (90% chance actual will be above this)
    expected: number; // P50 (median)
    high: number;    // P90 (90% chance actual will be below this)
  };
  factorImpacts: Array<{
    factorId: string;
    factorName: string;
    category: RiskCategory;
    probability: number;
    expectedImpact: number;   // probability × impact
    worstCase: number;
  }>;
  monthlyProjection: Array<{
    month: string;
    baseForecast: number;
    riskAdjusted: number;
    riskDelta: number;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IRiskForecastRepository {
  saveScenario(scenario: RiskScenario): Promise<void>;
  getScenario(scenarioId: string, scope: RepositoryScope): Promise<RiskScenario | null>;
  listScenarios(budgetId: number, scope: RepositoryScope): Promise<RiskScenario[]>;
  getBaseForecastByMonth(budgetId: number, scope: RepositoryScope): Promise<Array<{ month: string; amount: number }>>;
  getHistoricalProcurementDelay(scope: RepositoryScope): Promise<{ avgDelayDays: number; stdDev: number }>;
  getHistoricalFXVolatility(fromCurrency: string, toCurrency: string): Promise<{ avgChange: number; stdDev: number }>;
  getInflationRate(country: string, year: string): Promise<number>;
  getVacancyRate(scope: RepositoryScope): Promise<number>;
}

export interface RiskForecastDependencies {
  riskRepo: IRiskForecastRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class RiskAdjustedForecastEngine {
  private repo: IRiskForecastRepository;
  private logger: ILogger;

  constructor(deps: RiskForecastDependencies) {
    this.repo = deps.riskRepo;
    this.logger = deps.logger.child({ service: 'RiskAdjustedForecastEngine' });
  }

  /**
   * Create a risk scenario with specific factors.
   */
  async createScenario(
    budgetId: number,
    name: string,
    description: string,
    factors: Omit<RiskFactor, 'factorId'>[],
    userId: number,
    scope: RepositoryScope,
  ): Promise<RiskScenario> {
    const scenario: RiskScenario = {
      scenarioId: uuidv4(),
      name,
      description,
      budgetId,
      organizationId: scope.organizationId,
      factors: factors.map(f => ({ ...f, factorId: uuidv4() })),
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    await this.repo.saveScenario(scenario);
    this.logger.info('Risk scenario created', {
      scenarioId: scenario.scenarioId, factorCount: factors.length,
    });
    return scenario;
  }

  /**
   * Auto-generate risk factors from historical data.
   */
  async generateFactorsFromHistory(
    scope: RepositoryScope,
    currency?: string,
    country?: string,
  ): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Procurement delay risk
    const procDelay = await this.repo.getHistoricalProcurementDelay(scope);
    if (procDelay.avgDelayDays > 5) {
      factors.push({
        factorId: uuidv4(),
        category: 'procurement_delay',
        name: 'Procurement Lead Time Risk',
        description: `Historical avg delay: ${procDelay.avgDelayDays} days`,
        probability: Math.min(0.8, procDelay.avgDelayDays / 30),
        impactPercent: Math.min(15, procDelay.avgDelayDays * 0.5),
        source: 'historical',
        confidence: 0.7,
      });
    }

    // FX risk
    if (currency && currency !== 'USD') {
      const fxVol = await this.repo.getHistoricalFXVolatility(currency, 'USD');
      if (fxVol.stdDev > 1) {
        factors.push({
          factorId: uuidv4(),
          category: 'fx_movement',
          name: `FX Risk: ${currency}/USD`,
          description: `Historical volatility: ±${fxVol.stdDev.toFixed(1)}%`,
          probability: 0.6,
          impactPercent: fxVol.stdDev,
          source: 'market_data',
          confidence: 0.6,
        });
      }
    }

    // Inflation risk
    if (country) {
      const year = new Date().getFullYear().toString();
      const inflation = await this.repo.getInflationRate(country, year);
      if (inflation > 3) {
        factors.push({
          factorId: uuidv4(),
          category: 'inflation',
          name: `Inflation Risk: ${country}`,
          description: `Current rate: ${inflation}%`,
          probability: 0.9,
          impactPercent: inflation,
          source: 'market_data',
          confidence: 0.8,
        });
      }
    }

    // Staffing vacancy risk
    const vacancyRate = await this.repo.getVacancyRate(scope);
    if (vacancyRate > 5) {
      factors.push({
        factorId: uuidv4(),
        category: 'staffing_vacancy',
        name: 'Staffing Vacancy Risk',
        description: `Current vacancy rate: ${vacancyRate}%`,
        probability: 0.7,
        impactPercent: -vacancyRate * 0.8, // Negative = underspend
        source: 'historical',
        confidence: 0.75,
      });
    }

    this.logger.info('Risk factors generated from history', { count: factors.length });
    return factors;
  }

  /**
   * Calculate risk-adjusted forecast.
   */
  async calculate(
    scenarioId: string,
    scope: RepositoryScope,
  ): Promise<RiskAdjustedForecast> {
    const scenario = await this.repo.getScenario(scenarioId, scope);
    if (!scenario) throw new Error(`Risk scenario ${scenarioId} not found`);

    const baseForecast = await this.repo.getBaseForecastByMonth(scenario.budgetId, scope);
    const totalBase = baseForecast.reduce((s, m) => s + m.amount, 0);

    // Calculate expected impact per factor
    const factorImpacts = scenario.factors.map(f => {
      const expectedImpact = totalBase * (f.impactPercent / 100) * f.probability;
      const worstCase = totalBase * (f.impactPercent / 100);
      return {
        factorId: f.factorId,
        factorName: f.name,
        category: f.category,
        probability: f.probability,
        expectedImpact: Math.round(expectedImpact * 100) / 100,
        worstCase: Math.round(worstCase * 100) / 100,
      };
    });

    const totalRiskImpact = factorImpacts.reduce((s, f) => s + f.expectedImpact, 0);
    const riskAdjustedTotal = totalBase + totalRiskImpact;

    // Confidence interval (simplified — production would use Monte Carlo)
    const totalWorstCase = factorImpacts.reduce((s, f) => s + f.worstCase, 0);
    const low = totalBase + totalRiskImpact * 0.5;
    const high = totalBase + totalWorstCase * 0.9;

    // Monthly projection with risk adjustment
    const monthlyProjection = baseForecast.map(m => {
      const monthRiskFactor = totalBase > 0 ? (m.amount / totalBase) : 0;
      const riskDelta = totalRiskImpact * monthRiskFactor;
      return {
        month: m.month,
        baseForecast: m.amount,
        riskAdjusted: Math.round((m.amount + riskDelta) * 100) / 100,
        riskDelta: Math.round(riskDelta * 100) / 100,
      };
    });

    this.logger.info('Risk-adjusted forecast calculated', {
      scenarioId,
      totalBase,
      totalRiskImpact,
      riskAdjustedTotal,
      factorCount: scenario.factors.length,
    });

    return {
      budgetId: scenario.budgetId,
      scenarioId,
      scenarioName: scenario.name,
      calculatedAt: new Date().toISOString(),
      baseForecast: totalBase,
      riskAdjustedForecast: Math.round(riskAdjustedTotal * 100) / 100,
      totalRiskImpact: Math.round(totalRiskImpact * 100) / 100,
      confidenceInterval: {
        low: Math.round(low * 100) / 100,
        expected: Math.round(riskAdjustedTotal * 100) / 100,
        high: Math.round(high * 100) / 100,
      },
      factorImpacts,
      monthlyProjection,
    };
  }
}
