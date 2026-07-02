/**
 * MultiCurrencyForecastEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Multi-Currency Forecasting
 *
 * PHASE 6: Enterprise Performance Management
 *
 * Handles three currency layers:
 *   1. Donor reporting currency (e.g., USD, EUR, GBP)
 *   2. Organization base currency (e.g., USD)
 *   3. Local operating currency (e.g., YER, SYP, SDG)
 *
 * Provides:
 *  - FX scenario modeling (base, optimistic, pessimistic)
 *  - Budget impact of currency movements
 *  - FX gain/loss projections
 *  - Multi-currency consolidated view
 *  - Hedging recommendation (if applicable)
 */

import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface CurrencyExposure {
  currency: string;
  totalBudgetInLocal: number;
  totalBudgetInBase: number;
  currentRate: number;
  budgetRate: number;
  rateChange: number;
  rateChangePercent: number;
  unrealizedGainLoss: number;
  exposurePercent: number;   // % of total budget in this currency
}

export interface FXScenario {
  scenarioId: string;
  name: string;
  description: string;
  rateAssumptions: Array<{
    fromCurrency: string;
    toCurrency: string;
    assumedRate: number;
    currentRate: number;
    changePercent: number;
  }>;
}

export interface FXImpactAnalysis {
  baseCurrency: string;
  analysisDate: string;
  exposures: CurrencyExposure[];
  totalExposure: number;
  totalUnrealizedGainLoss: number;
  scenarios: Array<{
    scenario: FXScenario;
    projectedGainLoss: number;
    impactOnBudget: number;
    impactPercent: number;
  }>;
  concentrationRisk: {
    highestExposureCurrency: string;
    highestExposurePercent: number;
    diversificationScore: number;   // 0-100 (100 = well diversified)
  };
}

export interface MultiCurrencyBudgetView {
  organizationId: number;
  baseCurrency: string;
  asOfDate: string;
  byDonorCurrency: Array<{
    donorId: number;
    donorName: string;
    donorCurrency: string;
    amountInDonorCurrency: number;
    amountInBaseCurrency: number;
    exchangeRate: number;
  }>;
  byOperatingCurrency: Array<{
    operatingUnitId: number;
    operatingUnitName: string;
    localCurrency: string;
    amountInLocalCurrency: number;
    amountInBaseCurrency: number;
    exchangeRate: number;
  }>;
  totalInBaseCurrency: number;
  fxGainLossYTD: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IMultiCurrencyRepository {
  getCurrentRate(fromCurrency: string, toCurrency: string): Promise<number>;
  getHistoricalRate(fromCurrency: string, toCurrency: string, date: string): Promise<number>;
  getBudgetRate(budgetId: number): Promise<number>;
  getCurrencyExposures(scope: RepositoryScope): Promise<CurrencyExposure[]>;
  getDonorCurrencyBreakdown(scope: RepositoryScope): Promise<MultiCurrencyBudgetView['byDonorCurrency']>;
  getOperatingCurrencyBreakdown(scope: RepositoryScope): Promise<MultiCurrencyBudgetView['byOperatingCurrency']>;
  getFXGainLossYTD(scope: RepositoryScope): Promise<number>;
  getHistoricalVolatility(fromCurrency: string, toCurrency: string, months: number): Promise<{
    avgRate: number;
    minRate: number;
    maxRate: number;
    stdDev: number;
  }>;
}

export interface MultiCurrencyDependencies {
  currencyRepo: IMultiCurrencyRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class MultiCurrencyForecastEngine {
  private repo: IMultiCurrencyRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: MultiCurrencyDependencies) {
    this.repo = deps.currencyRepo;
    this.logger = deps.logger.child({ service: 'MultiCurrencyForecastEngine' });
    this.config = deps.config;
  }

  /**
   * Analyze FX exposure and project gain/loss under scenarios.
   */
  async analyzeFXImpact(
    baseCurrency: string,
    scope: RepositoryScope,
  ): Promise<FXImpactAnalysis> {
    const exposures = await this.repo.getCurrencyExposures(scope);
    const totalExposure = exposures.reduce((s, e) => s + e.totalBudgetInBase, 0);
    const totalGainLoss = exposures.reduce((s, e) => s + e.unrealizedGainLoss, 0);

    // Build FX scenarios
    const scenarios = await this.buildScenarios(exposures, baseCurrency);

    // Calculate scenario impacts
    const scenarioResults = scenarios.map(scenario => {
      let projectedGainLoss = 0;
      for (const assumption of scenario.rateAssumptions) {
        const exposure = exposures.find(e => e.currency === assumption.fromCurrency);
        if (exposure) {
          const currentValue = exposure.totalBudgetInLocal / assumption.currentRate;
          const scenarioValue = exposure.totalBudgetInLocal / assumption.assumedRate;
          projectedGainLoss += scenarioValue - currentValue;
        }
      }
      return {
        scenario,
        projectedGainLoss: Math.round(projectedGainLoss * 100) / 100,
        impactOnBudget: Math.round(projectedGainLoss * 100) / 100,
        impactPercent: totalExposure > 0
          ? Math.round((projectedGainLoss / totalExposure) * 100 * 10) / 10
          : 0,
      };
    });

    // Concentration risk
    const sorted = [...exposures].sort((a, b) => b.exposurePercent - a.exposurePercent);
    const highestExposure = sorted[0];
    const herfindahl = exposures.reduce((s, e) => s + Math.pow(e.exposurePercent / 100, 2), 0);
    const diversificationScore = Math.round((1 - herfindahl) * 100);

    this.logger.info('FX impact analyzed', {
      currencyCount: exposures.length,
      totalExposure,
      totalGainLoss,
      scenarios: scenarioResults.length,
    });

    return {
      baseCurrency,
      analysisDate: new Date().toISOString(),
      exposures,
      totalExposure,
      totalUnrealizedGainLoss: Math.round(totalGainLoss * 100) / 100,
      scenarios: scenarioResults,
      concentrationRisk: {
        highestExposureCurrency: highestExposure?.currency || baseCurrency,
        highestExposurePercent: highestExposure?.exposurePercent || 0,
        diversificationScore,
      },
    };
  }

  /**
   * Get multi-currency consolidated budget view.
   */
  async getConsolidatedView(
    baseCurrency: string,
    scope: RepositoryScope,
  ): Promise<MultiCurrencyBudgetView> {
    const [byDonor, byOperating, fxGainLoss] = await Promise.all([
      this.repo.getDonorCurrencyBreakdown(scope),
      this.repo.getOperatingCurrencyBreakdown(scope),
      this.repo.getFXGainLossYTD(scope),
    ]);

    const totalInBase = byDonor.reduce((s, d) => s + d.amountInBaseCurrency, 0);

    return {
      organizationId: scope.organizationId,
      baseCurrency,
      asOfDate: new Date().toISOString(),
      byDonorCurrency: byDonor,
      byOperatingCurrency: byOperating,
      totalInBaseCurrency: Math.round(totalInBase * 100) / 100,
      fxGainLossYTD: Math.round(fxGainLoss * 100) / 100,
    };
  }

  /**
   * Project FX gain/loss for remaining budget period.
   */
  async projectFXGainLoss(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    months: number,
  ): Promise<{
    base: number;
    optimistic: number;
    pessimistic: number;
    historical: { avgRate: number; minRate: number; maxRate: number; stdDev: number };
  }> {
    const currentRate = await this.repo.getCurrentRate(fromCurrency, toCurrency);
    const historical = await this.repo.getHistoricalVolatility(fromCurrency, toCurrency, months);

    const baseValue = amount / currentRate;
    const optimisticValue = amount / (currentRate * (1 - historical.stdDev / 100));
    const pessimisticValue = amount / (currentRate * (1 + historical.stdDev / 100));

    return {
      base: Math.round(baseValue * 100) / 100,
      optimistic: Math.round(optimisticValue * 100) / 100,
      pessimistic: Math.round(pessimisticValue * 100) / 100,
      historical,
    };
  }

  // ── PRIVATE ──

  private async buildScenarios(
    exposures: CurrencyExposure[],
    baseCurrency: string,
  ): Promise<FXScenario[]> {
    const uniqueCurrencies = [...new Set(exposures.map(e => e.currency).filter(c => c !== baseCurrency))];
    const scenarios: FXScenario[] = [];

    // Base scenario (current rates)
    const baseAssumptions = uniqueCurrencies.map(c => {
      const exp = exposures.find(e => e.currency === c)!;
      return {
        fromCurrency: c,
        toCurrency: baseCurrency,
        assumedRate: exp.currentRate,
        currentRate: exp.currentRate,
        changePercent: 0,
      };
    });
    scenarios.push({
      scenarioId: 'base',
      name: 'Base Case',
      description: 'Current exchange rates maintained',
      rateAssumptions: baseAssumptions,
    });

    // Favorable scenario (local currencies weaken 5%)
    scenarios.push({
      scenarioId: 'favorable',
      name: 'Favorable (local weakens 5%)',
      description: 'Local currencies depreciate — more buying power in base currency',
      rateAssumptions: baseAssumptions.map(a => ({
        ...a,
        assumedRate: a.currentRate * 1.05,
        changePercent: 5,
      })),
    });

    // Adverse scenario (local currencies strengthen 10%)
    scenarios.push({
      scenarioId: 'adverse',
      name: 'Adverse (local strengthens 10%)',
      description: 'Local currencies appreciate — less buying power in base currency',
      rateAssumptions: baseAssumptions.map(a => ({
        ...a,
        assumedRate: a.currentRate * 0.90,
        changePercent: -10,
      })),
    });

    return scenarios;
  }
}
