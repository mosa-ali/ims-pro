import { AITreasuryAdvisorEngine } from "./AITreasuryAdvisorEngine";
import { BankRiskEngine } from "./BankRiskEngine";
import { CashForecastEngine } from "./CashForecastEngine";
import { CashPoolingEngine } from "./CashPoolingEngine";
import { CashPositionEngine } from "./CashPositionEngine";
import { CurrencyEngine } from "./CurrencyEngine";
import { FXExposureEngine } from "./FXExposureEngine";
import { FXGainLossEngine } from "./FXGainLossEngine";
import { IntercompanyTreasuryEngine } from "./IntercompanyTreasuryEngine";
import { LiquidityAnalysisEngine } from "./LiquidityAnalysisEngine";
import { PaymentOptimizationEngine } from "./PaymentOptimizationEngine";
import { TreasuryDashboardEngine } from "./TreasuryDashboardEngine";
import { TreasuryComplianceEngine } from "./TreasuryComplianceEngine";
import { TreasuryLimitsEngine } from "./TreasuryLimitsEngine";
import { TreasuryPolicyEngine } from "./TreasuryPolicyEngine";
import { TreasuryScenarioBuilder } from "./TreasuryScenarioBuilder";
import { TreasuryWorkflowEngine } from "./TreasuryWorkflowEngine";
import {
  EnterpriseTreasuryAnalysis,
  ExchangeRate,
  TreasuryInput,
} from "./TreasuryTypes";

export class TreasuryEngine {
  readonly currency: CurrencyEngine;
  readonly cashForecast: CashForecastEngine;
  readonly cashPosition: CashPositionEngine;
  readonly liquidityAnalysis: LiquidityAnalysisEngine;
  readonly cashPooling: CashPoolingEngine;
  readonly fxExposure: FXExposureEngine;
  readonly fxGainLoss: FXGainLossEngine;
  readonly paymentOptimization: PaymentOptimizationEngine;
  readonly dashboard: TreasuryDashboardEngine;
  readonly policy: TreasuryPolicyEngine;
  readonly bankRisk: BankRiskEngine;
  readonly limits: TreasuryLimitsEngine;
  readonly compliance: TreasuryComplianceEngine;
  readonly scenarioBuilder: TreasuryScenarioBuilder;
  readonly advisor: AITreasuryAdvisorEngine;
  readonly workflow: TreasuryWorkflowEngine;
  readonly intercompany: IntercompanyTreasuryEngine;

  constructor(exchangeRates: ExchangeRate[] = []) {
    this.currency = new CurrencyEngine(exchangeRates);
    this.cashForecast = new CashForecastEngine(this.currency);
    this.cashPosition = new CashPositionEngine(this.currency);
    this.liquidityAnalysis = new LiquidityAnalysisEngine(this.currency);
    this.cashPooling = new CashPoolingEngine(this.currency);
    this.fxExposure = new FXExposureEngine(this.currency);
    this.fxGainLoss = new FXGainLossEngine(this.currency, exchangeRates);
    this.paymentOptimization = new PaymentOptimizationEngine(this.currency);
    this.policy = new TreasuryPolicyEngine();
    this.bankRisk = new BankRiskEngine(this.currency);
    this.limits = new TreasuryLimitsEngine();
    this.compliance = new TreasuryComplianceEngine();
    this.scenarioBuilder = new TreasuryScenarioBuilder(this.cashForecast, this.liquidityAnalysis, this.limits);
    this.advisor = new AITreasuryAdvisorEngine();
    this.workflow = new TreasuryWorkflowEngine();
    this.intercompany = new IntercompanyTreasuryEngine(this.currency);
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
  }): EnterpriseTreasuryAnalysis {
    const cashFlows = input.cashFlows ?? [];
    const payables = input.payables ?? [];
    const policy = this.policy.resolvePolicy({
      minimumCashReserve: input.minimumCashReserve,
      ...input.policy,
    });

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
      minimumCashReserve: policy.minimumCashReserve,
    });
    const cashPosition = this.cashPosition.generateSnapshot({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      cashFlows,
      payables,
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
      minimumCashReserve: policy.minimumCashReserve,
    });
    const bankRisks = this.bankRisk.assess({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      policy,
      countryRisks: input.countryRisks,
    });
    const limits = this.limits.evaluate({
      policy,
      liquidity,
      fxExposure,
      bankRisks,
    });
    const compliance = this.compliance.evaluate({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
      payables,
      paymentOptimization,
      policy,
    });
    const advisorInsight = this.advisor.generateInsight({
      liquidity,
      cashForecast,
      limits,
      paymentOptimization,
    });
    const workflow = this.workflow.buildWorkflow({
      limits,
      compliance,
    });
    const intercompanyPositions = this.intercompany.planInternalFunding({
      scope: input.scope,
      bankAccounts: input.bankAccounts,
    });
    const dashboard = this.dashboard.generateSnapshot(input);
    const enrichedDashboard = {
      ...dashboard,
      cashPosition,
      policyViolations: limits.violations,
      bankRisks,
      kpis: [
        ...dashboard.kpis,
        {
          key: "free_cash",
          label: "Free cash",
          value: cashPosition.freeCash,
          status: cashPosition.freeCash >= policy.minimumCashReserve ? "good" as const : "risk" as const,
        },
        {
          key: "forecast_confidence",
          label: "Forecast confidence",
          value: Math.max(0, 100 - cashForecast.daysBelowMinimum * 10),
          status: cashForecast.daysBelowMinimum ? "watch" as const : "good" as const,
        },
      ],
      alerts: [
        ...dashboard.alerts,
        ...limits.violations.map((violation) => ({
          severity: violation.severity,
          title: "Treasury policy limit",
          message: violation.message,
        })),
        ...compliance.findings.map((finding) => ({
          severity: finding.severity,
          title: "Treasury compliance",
          message: finding.message,
        })),
      ],
    };

    return {
      policy,
      liquidity,
      cashForecast,
      cashPosition,
      cashPooling,
      fxExposure,
      paymentOptimization,
      bankRisks,
      limits,
      compliance,
      advisorInsight,
      workflow,
      intercompanyPositions,
      dashboard: enrichedDashboard,
    };
  }
}

export function createTreasuryEngine(input?: Pick<TreasuryInput, "exchangeRates">): TreasuryEngine {
  return new TreasuryEngine(input?.exchangeRates ?? []);
}
