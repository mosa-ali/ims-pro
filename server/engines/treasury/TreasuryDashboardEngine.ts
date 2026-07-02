import { CashForecastEngine } from "./CashForecastEngine";
import { CashPoolingEngine } from "./CashPoolingEngine";
import { FXExposureEngine } from "./FXExposureEngine";
import { LiquidityAnalysisEngine } from "./LiquidityAnalysisEngine";
import { PaymentOptimizationEngine } from "./PaymentOptimizationEngine";
import {
  TreasuryDashboardSnapshot,
  TreasuryInput,
} from "./TreasuryTypes";

export class TreasuryDashboardEngine {
  constructor(
    private readonly cashForecast: CashForecastEngine,
    private readonly liquidityAnalysis: LiquidityAnalysisEngine,
    private readonly cashPooling: CashPoolingEngine,
    private readonly fxExposure: FXExposureEngine,
    private readonly paymentOptimization: PaymentOptimizationEngine,
  ) {}

  generateSnapshot(input: TreasuryInput & {
    horizonDays?: number;
    minimumCashReserve?: number;
  }): TreasuryDashboardSnapshot {
    const cashFlows = input.cashFlows ?? [];
    const payables = input.payables ?? [];
    const liquidity = this.liquidityAnalysis.analyze({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables,
      cashFlows,
    });
    const cashForecast = this.cashForecast.generateForecast({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows,
      horizonDays: input.horizonDays ?? 90,
      scenario: "expected",
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

    return {
      scope: input.scope,
      generatedAt: new Date().toISOString(),
      liquidity,
      cashForecast,
      cashPooling,
      fxExposure,
      paymentOptimization,
      kpis: [
        {
          key: "total_cash",
          label: "Total cash",
          value: liquidity.totalCash,
          status: liquidity.totalCash > 0 ? "good" : "risk",
        },
        {
          key: "current_ratio",
          label: "Current ratio",
          value: liquidity.currentRatio,
          status: liquidity.currentRatio >= 1.5 ? "good" : liquidity.currentRatio >= 1 ? "watch" : "risk",
        },
        {
          key: "cash_coverage_days",
          label: "Cash coverage days",
          value: liquidity.cashCoverageDays,
          status: liquidity.cashCoverageDays >= 30 ? "good" : liquidity.cashCoverageDays >= 14 ? "watch" : "risk",
        },
        {
          key: "fx_exposure",
          label: "FX exposure",
          value: fxExposure.totalExposureInBaseCurrency,
          status: fxExposure.highRiskCurrencies.length ? "risk" : "good",
        },
      ],
      alerts: [
        ...(liquidity.riskLevel === "critical"
          ? [{
              severity: "critical" as const,
              title: "Critical liquidity risk",
              message: "Unrestricted cash is insufficient for near-term obligations.",
            }]
          : []),
        ...(cashForecast.daysBelowMinimum > 0
          ? [{
              severity: "warning" as const,
              title: "Forecast cash gap",
              message: `${cashForecast.daysBelowMinimum} forecast day(s) fall below minimum reserve.`,
            }]
          : []),
        ...(fxExposure.highRiskCurrencies.length
          ? [{
              severity: "warning" as const,
              title: "High FX exposure",
              message: `Review exposure in ${fxExposure.highRiskCurrencies.join(", ")}.`,
            }]
          : []),
      ],
    };
  }
}
