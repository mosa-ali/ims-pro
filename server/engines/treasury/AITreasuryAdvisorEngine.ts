import {
  CashForecastSummary,
  LiquidityAnalysis,
  PaymentOptimizationPlan,
  TreasuryAdvisorInsight,
  TreasuryLimitAssessment,
} from "./TreasuryTypes";

export class AITreasuryAdvisorEngine {
  generateInsight(input: {
    liquidity: LiquidityAnalysis;
    cashForecast: CashForecastSummary;
    limits: TreasuryLimitAssessment;
    paymentOptimization: PaymentOptimizationPlan;
  }): TreasuryAdvisorInsight {
    const firstGap = input.cashForecast.forecast.find((day) => day.liquidityGap > 0);
    const deferredPayments = input.paymentOptimization.optimizedPayments.filter((payment) => payment.decision === "defer");
    const criticalViolation = input.limits.violations.find((violation) => violation.severity === "critical");

    if (firstGap || criticalViolation) {
      return {
        severity: "critical",
        title: "Treasury action required",
        narrative: firstGap
          ? `Cash coverage is expected to fall below target on ${firstGap.date}. The gap is ${firstGap.liquidityGap.toFixed(2)} in base currency, mainly driven by committed outflows and scheduled payments.`
          : `Treasury policy has a critical breach: ${criticalViolation?.message}`,
        recommendedActions: [
          "Accelerate confirmed grant or donor receipts.",
          "Reschedule non-critical vendor payments.",
          "Review cash pooling sweeps and restricted-fund constraints before execution.",
        ],
      };
    }

    if (input.liquidity.riskLevel === "medium" || input.liquidity.riskLevel === "high" || deferredPayments.length) {
      return {
        severity: "warning",
        title: "Liquidity should be watched",
        narrative: `Cash coverage is ${input.liquidity.cashCoverageDays.toFixed(1)} days with ${deferredPayments.length} deferred payment(s). Treasury can remain stable if forecast inflows arrive on time.`,
        recommendedActions: [
          "Confirm high-probability inflows with country finance teams.",
          "Keep non-critical payments scheduled after the forecast pressure window.",
        ],
      };
    }

    return {
      severity: "info",
      title: "Treasury position is stable",
      narrative: "Cash coverage, liquidity ratio, bank exposure, and payment timing are within current treasury policy.",
      recommendedActions: [
        "Continue daily cash position publishing.",
        "Refresh forecast assumptions when grant or procurement schedules change.",
      ],
    };
  }
}
