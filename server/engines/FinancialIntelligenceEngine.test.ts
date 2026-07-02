import { describe, expect, it } from "vitest";
import { DecisionEngine } from "./DecisionEngine";
import { FinancialHealthEngine } from "./FinancialHealthEngine";
import { FinancialIntelligenceEngine } from "./FinancialIntelligenceEngine";
import { FinancialRiskEngine } from "./FinancialRiskEngine";
import { ForecastingEngine } from "./ForecastingEngine";
import { KPIEngine } from "./KPIEngine";

const history = Array.from({ length: 14 }, (_, index) => ({
  date: `2026-06-${String(index + 1).padStart(2, "0")}`,
  value: 1000 + index * 100,
}));

describe("FinancialHealthEngine Phase 8 intelligence", () => {
  it("scores organizational financial health across domains", () => {
    const assessment = new FinancialHealthEngine().analyzeOrganizationalHealth({
      treasuryScore: 70,
      budgetExecutionScore: 80,
      grantComplianceScore: 90,
      glQualityScore: 85,
      riskScore: 40,
    });

    expect(assessment.healthScore).toBeGreaterThan(70);
    expect(assessment.drivers).toHaveLength(5);
    expect(assessment.narrative).toContain("Financial health");
  });
});

describe("FinancialRiskEngine Phase 8 intelligence", () => {
  it("forecasts enterprise risk from cross-domain signals", () => {
    const risk = new FinancialRiskEngine().assessEnterpriseRisk([
      {
        domain: "treasury",
        score: 80,
        exposureAmount: 120000,
        description: "Cash coverage below target.",
      },
      {
        domain: "budget",
        score: 65,
        exposureAmount: 50000,
        description: "Budget utilization above normal range.",
      },
    ]);

    expect(risk.overallRiskScore).toBeGreaterThan(70);
    expect(risk.topRisks[0].domain).toBe("treasury");
    expect(risk.mitigationActions.length).toBeGreaterThan(0);
  });
});

describe("ForecastingEngine Phase 8 intelligence", () => {
  it("builds predictive forecasts from historical series", () => {
    const forecast = new ForecastingEngine().forecastSeries({
      history,
      horizonDays: 10,
    });

    expect(forecast.forecast).toHaveLength(10);
    expect(forecast.trend).toBe("increasing");
    expect(forecast.predictedTotal).toBeGreaterThan(0);
  });
});

describe("KPIEngine Phase 8 intelligence", () => {
  it("creates an executive KPI scorecard", () => {
    const engine = Object.create(KPIEngine.prototype) as KPIEngine;
    const scorecard = engine.scoreExecutiveKPIs([
      { id: "liquidity", name: "Liquidity", value: 1.4, target: 1.5, weight: 2 },
      { id: "compliance", name: "Compliance", value: 96, target: 98, weight: 1 },
    ]);

    expect(scorecard.score).toBeGreaterThan(90);
    expect(scorecard.kpis[0].status).toBe("on-track");
  });
});

describe("DecisionEngine", () => {
  it("generates explainable audited recommendations", () => {
    const recommendations = new DecisionEngine().generateRecommendations({
      language: "it",
      evidence: [
        {
          sourceEngine: "treasury",
          metric: "cashCoverageDays",
          value: 12,
          interpretation: "Cash below threshold.",
        },
      ],
    });

    expect(recommendations[0].severity).toBe("critical");
    expect(recommendations[0].title).toContain("[IT]");
    expect(recommendations[0].auditTrail.length).toBeGreaterThan(2);
  });
});

describe("FinancialIntelligenceEngine", () => {
  it("combines treasury, budget, GL, grants, anomalies, and forecasts", () => {
    const report = new FinancialIntelligenceEngine().analyze({
      organizationId: 1,
      operatingUnitId: 10,
      asOfDate: "2026-07-02",
      language: "en",
      treasury: {
        cashCoverageDays: 18,
        liquidityRatio: 1.1,
        freeCash: 65000,
        policyViolations: 2,
      },
      budget: {
        utilizationPercent: 94,
        varianceAmount: 25000,
      },
      generalLedger: {
        unreconciledItems: 4,
        journalExceptionCount: 2,
        closeConfidence: 76,
      },
      grants: {
        complianceScore: 82,
        upcomingReportCount: 3,
        restrictedCashAtRisk: 15000,
      },
      anomalies: [
        {
          id: "anom-1",
          domain: "cash_flow",
          severity: "warning",
          amount: 10000,
          description: "Unusual cash outflow pattern.",
        },
      ],
      history: {
        expenditures: history,
        cashFlow: history.map((point) => ({ ...point, value: point.value - 500 })),
      },
    });

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.reportingIntegration.pdfReady).toBe(true);
    expect(report.narrativeOutputs.ar).toContain("[AR]");
    expect(report.auditability.evidenceCount).toBeGreaterThan(4);
  });
});
