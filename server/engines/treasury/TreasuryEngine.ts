import { CashForecastEngine } from "./CashForecastEngine";
import { CashPoolingEngine } from "./CashPoolingEngine";
import { CurrencyEngine } from "./CurrencyEngine";
import { FXExposureEngine } from "./FXExposureEngine";
import { FXGainLossEngine } from "./FXGainLossEngine";
import { LiquidityAnalysisEngine } from "./LiquidityAnalysisEngine";
import { PaymentOptimizationEngine } from "./PaymentOptimizationEngine";
import { TreasuryDashboardEngine } from "./TreasuryDashboardEngine";
import {
  CashForecastSummary,
  CashPoolingPlan,
  ExchangeRate,
  FXExposureReport,
  LiquidityAnalysis,
  PaymentOptimizationPlan,
  TreasuryDashboardSnapshot,
  TreasuryInput,
} from "./TreasuryTypes";

export class TreasuryEngine {
  readonly currency: CurrencyEngine;
  readonly cashForecast: CashForecastEngine;
  readonly liquidityAnalysis: LiquidityAnalysisEngine;
  readonly cashPooling: CashPoolingEngine;
  readonly fxExposure: FXExposureEngine;
  readonly fxGainLoss: FXGainLossEngine;
  readonly paymentOptimization: PaymentOptimizationEngine;
  readonly dashboard: TreasuryDashboardEngine;

  constructor(exchangeRates: ExchangeRate[] = []) {
    this.currency = new CurrencyEngine(exchangeRates);
    this.cashForecast = new CashForecastEngine(this.currency);
    this.liquidityAnalysis = new LiquidityAnalysisEngine(this.currency);
    this.cashPooling = new CashPoolingEngine(this.currency);
    this.fxExposure = new FXExposureEngine(this.currency);
    this.fxGainLoss = new FXGainLossEngine(this.currency, exchangeRates);
    this.paymentOptimization = new PaymentOptimizationEngine(this.currency);
    this.dashboard = new TreasuryDashboardEngine(
      this.cashForecast,
      this.liquidityAnalysis,
      this.cashPooling,
      this.fxExposure,
      this.paymentOptimization,
    );
  }

  analyzeEnterpriseTreasury(input: TreasuryInput & {
    horizonDays?: number;
    minimumCashReserve?: number;
  }): {
    liquidity: LiquidityAnalysis;
    cashForecast: CashForecastSummary;
    cashPooling: CashPoolingPlan;
    fxExposure: FXExposureReport;
    paymentOptimization: PaymentOptimizationPlan;
    dashboard: TreasuryDashboardSnapshot;
  } {
    const cashFlows = input.cashFlows ?? [];
    const payables = input.payables ?? [];

    const liquidity = this.liquidityAnalysis.analyze({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows,
      payables,
    });
    const cashForecast = this.cashForecast.generateForecast({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows,
      horizonDays: input.horizonDays,
      minimumCashReserve: input.minimumCashReserve,
    });
    const cashPooling = this.cashPooling.buildPoolingPlan({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
    });
    const fxExposure = this.fxExposure.analyzeExposure({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows,
      payables,
    });
    const paymentOptimization = this.paymentOptimization.optimize({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables,
      minimumCashReserve: input.minimumCashReserve,
    });
    const dashboard = this.dashboard.generateSnapshot(input);

    return {
      liquidity,
      cashForecast,
      cashPooling,
      fxExposure,
      paymentOptimization,
      dashboard,
    };
  }
}

export function createTreasuryEngine(input?: Pick<TreasuryInput, "exchangeRates">): TreasuryEngine {
  return new TreasuryEngine(input?.exchangeRates ?? []);
}
