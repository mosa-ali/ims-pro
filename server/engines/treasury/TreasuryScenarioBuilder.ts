import { CashForecastEngine } from "./CashForecastEngine";
import { CurrencyEngine } from "./CurrencyEngine";
import { LiquidityAnalysisEngine } from "./LiquidityAnalysisEngine";
import { TreasuryLimitsEngine } from "./TreasuryLimitsEngine";
import {
  ExchangeRate,
  TreasuryInput,
  TreasuryPolicy,
  TreasuryScenario,
  TreasuryScenarioResult,
  toNumber,
} from "./TreasuryTypes";

export class TreasuryScenarioBuilder {
  constructor(
    private readonly cashForecast: CashForecastEngine,
    private readonly liquidityAnalysis: LiquidityAnalysisEngine,
    private readonly limits: TreasuryLimitsEngine,
  ) {}

  runScenario(input: TreasuryInput & {
    scenario: TreasuryScenario;
    policy: TreasuryPolicy;
    horizonDays?: number;
  }): TreasuryScenarioResult {
    const cashFlows = [
      ...(input.cashFlows ?? []).map((flow) => {
        const shouldApply = !input.scenario.tags?.length ||
          flow.scenarioTags?.some((tag) => input.scenario.tags?.includes(tag));
        const multiplier = flow.direction === "inflow"
          ? input.scenario.inflowMultiplier ?? 1
          : input.scenario.outflowMultiplier ?? 1;
        return {
          ...flow,
          amount: shouldApply ? toNumber(flow.amount) * multiplier : flow.amount,
        };
      }),
      ...(input.scenario.additionalFlows ?? []),
    ];
    const exchangeRates = this.applyCurrencyShock(input.exchangeRates ?? [], input.scenario);
    const scenarioCurrency = new CurrencyEngine(exchangeRates);
    const scenarioForecast = new CashForecastEngine(scenarioCurrency);
    const scenarioLiquidity = new LiquidityAnalysisEngine(scenarioCurrency);
    const scenarioInput = {
      ...input,
      cashFlows,
      exchangeRates,
    };
    const forecast = scenarioForecast.generateForecast({
      scope: scenarioInput.scope,
      bankAccounts: scenarioInput.bankAccounts,
      cashFlows,
      horizonDays: input.horizonDays,
      minimumCashReserve: input.policy.minimumCashReserve,
    });
    const liquidity = scenarioLiquidity.analyze({
      scope: scenarioInput.scope,
      bankAccounts: scenarioInput.bankAccounts,
      payables: scenarioInput.payables ?? [],
      cashFlows,
    });

    return {
      scenario: input.scenario,
      forecast,
      liquidity,
      policyViolations: this.limits.evaluate({
        policy: input.policy,
        liquidity,
        fxExposure: {
          baseCurrency: input.scope.baseCurrency,
          totalExposureInBaseCurrency: 0,
          positions: [],
          highRiskCurrencies: [],
          recommendations: [],
        },
        bankRisks: [],
      }).violations,
    };
  }

  private applyCurrencyShock(rates: ExchangeRate[], scenario: TreasuryScenario): ExchangeRate[] {
    if (!scenario.currencyShock) return rates;

    return rates.map((rate) => {
      const shock = scenario.currencyShock?.[rate.fromCurrency];
      if (!shock) return rate;
      return {
        ...rate,
        rate: toNumber(rate.rate) * shock,
      };
    });
  }
}
