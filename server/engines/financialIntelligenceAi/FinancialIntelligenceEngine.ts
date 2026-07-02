import {
  DecisionEngine,
  DecisionEvidence,
  DecisionRecommendation,
  IntelligenceLanguage,
  IntelligenceSeverity,
} from "./DecisionEngine";
import {
  EnterpriseRiskForecast,
  EnterpriseRiskSignal,
  FinancialRiskEngine,
} from "./FinancialRiskEngine";
import {
  FinancialHealthEngine,
  OrganizationalHealthAssessment,
  OrganizationalHealthInput,
} from "./FinancialHealthEngine";
import {
  ForecastingEngine,
  PredictiveForecastResult,
  PredictiveSeriesPoint,
} from "./ForecastingEngine";

export interface FinancialIntelligenceInput {
  organizationId: number;
  operatingUnitId?: number | null;
  asOfDate: string;
  language?: IntelligenceLanguage;
  treasury?: {
    cashCoverageDays: number;
    liquidityRatio: number;
    freeCash: number;
    policyViolations: number;
  };
  budget?: {
    utilizationPercent: number;
    varianceAmount: number;
    restrictedFundsAtRisk?: number;
  };
  generalLedger?: {
    unreconciledItems: number;
    journalExceptionCount: number;
    closeConfidence: number;
  };
  grants?: {
    complianceScore: number;
    upcomingReportCount: number;
    restrictedCashAtRisk: number;
  };
  anomalies?: Array<{
    id: string;
    domain: EnterpriseRiskSignal["domain"];
    severity: IntelligenceSeverity;
    amount?: number;
    description: string;
  }>;
  history?: {
    expenditures?: PredictiveSeriesPoint[];
    cashFlow?: PredictiveSeriesPoint[];
  };
}

export interface FinancialIntelligenceReport {
  organizationId: number;
  operatingUnitId?: number | null;
  asOfDate: string;
  language: IntelligenceLanguage;
  executiveSummary: string;
  health: OrganizationalHealthAssessment;
  risk: EnterpriseRiskForecast;
  forecasts: {
    expenditures?: PredictiveForecastResult;
    cashFlow?: PredictiveForecastResult;
  };
  recommendations: DecisionRecommendation[];
  narrativeOutputs: Record<IntelligenceLanguage, string>;
  reportingIntegration: {
    dashboardReady: boolean;
    pdfReady: boolean;
    excelReady: boolean;
    exportSections: string[];
  };
  auditability: {
    evidenceCount: number;
    recommendationAuditSteps: number;
    sourceEngines: DecisionEvidence["sourceEngine"][];
  };
}

export class FinancialIntelligenceEngine {
  constructor(
    private readonly healthEngine = new FinancialHealthEngine(),
    private readonly riskEngine = new FinancialRiskEngine(),
    private readonly forecastingEngine = new ForecastingEngine(),
    private readonly decisionEngine = new DecisionEngine(),
  ) {}

  analyze(input: FinancialIntelligenceInput): FinancialIntelligenceReport {
    const evidence = this.collectEvidence(input);
    const health = this.healthEngine.analyzeOrganizationalHealth(this.buildHealthInput(input));
    const risk = this.riskEngine.assessEnterpriseRisk(this.buildRiskSignals(input));
    const forecasts = {
      expenditures: input.history?.expenditures?.length
        ? this.forecastingEngine.forecastSeries({ history: input.history.expenditures, horizonDays: 30 })
        : undefined,
      cashFlow: input.history?.cashFlow?.length
        ? this.forecastingEngine.forecastSeries({ history: input.history.cashFlow, horizonDays: 30 })
        : undefined,
    };
    const recommendations = this.decisionEngine.generateRecommendations({
      evidence: [
        ...evidence,
        {
          sourceEngine: "risk",
          metric: "overallRiskScore",
          value: risk.overallRiskScore,
          interpretation: "Enterprise weighted risk score.",
        },
        {
          sourceEngine: "health",
          metric: "healthScore",
          value: health.healthScore,
          interpretation: "Composite organizational financial health score.",
        },
      ],
      language: input.language,
    });

    return {
      organizationId: input.organizationId,
      operatingUnitId: input.operatingUnitId,
      asOfDate: input.asOfDate,
      language: input.language ?? "en",
      executiveSummary: this.buildExecutiveSummary(input, health, risk, recommendations),
      health,
      risk,
      forecasts,
      recommendations,
      narrativeOutputs: {
        en: this.buildExecutiveSummary({ ...input, language: "en" }, health, risk, recommendations),
        ar: this.withLanguageMarker("ar", this.buildExecutiveSummary({ ...input, language: "ar" }, health, risk, recommendations)),
        it: this.withLanguageMarker("it", this.buildExecutiveSummary({ ...input, language: "it" }, health, risk, recommendations)),
      },
      reportingIntegration: {
        dashboardReady: true,
        pdfReady: true,
        excelReady: true,
        exportSections: ["executiveSummary", "health", "risk", "forecasts", "recommendations", "auditability"],
      },
      auditability: {
        evidenceCount: evidence.length,
        recommendationAuditSteps: recommendations.reduce((sum, item) => sum + item.auditTrail.length, 0),
        sourceEngines: [...new Set(evidence.map((item) => item.sourceEngine))],
      },
    };
  }

  private collectEvidence(input: FinancialIntelligenceInput): DecisionEvidence[] {
    const evidence: DecisionEvidence[] = [];
    if (input.treasury) {
      evidence.push(
        {
          sourceEngine: "treasury",
          metric: "cashCoverageDays",
          value: input.treasury.cashCoverageDays,
          interpretation: "Days of cash coverage from treasury analysis.",
        },
        {
          sourceEngine: "treasury",
          metric: "liquidityRatio",
          value: input.treasury.liquidityRatio,
          interpretation: "Current liquidity ratio from treasury analysis.",
        },
      );
    }
    if (input.budget) {
      evidence.push({
        sourceEngine: "budget",
        metric: "budgetUtilizationPercent",
        value: input.budget.utilizationPercent,
        interpretation: "Budget utilization across active financial plans.",
      });
    }
    if (input.generalLedger) {
      evidence.push({
        sourceEngine: "general_ledger",
        metric: "journalExceptionCount",
        value: input.generalLedger.journalExceptionCount,
        interpretation: "Journal entries requiring review or correction.",
      });
    }
    if (input.grants) {
      evidence.push({
        sourceEngine: "grants",
        metric: "grantComplianceScore",
        value: input.grants.complianceScore,
        interpretation: "Grant and donor compliance score.",
      });
    }
    evidence.push({
      sourceEngine: "risk",
      metric: "anomalyCount",
      value: input.anomalies?.length ?? 0,
      interpretation: "Detected anomaly count across finance domains.",
    });
    return evidence;
  }

  private buildHealthInput(input: FinancialIntelligenceInput): OrganizationalHealthInput {
    return {
      treasuryScore: this.scoreHigherBetter(input.treasury?.cashCoverageDays ?? 30, 30),
      budgetExecutionScore: this.scoreLowerBetter(input.budget?.utilizationPercent ?? 80, 85),
      grantComplianceScore: input.grants?.complianceScore ?? 90,
      glQualityScore: input.generalLedger?.closeConfidence ?? 90,
      riskScore: this.scoreAnomalies(input.anomalies ?? []),
    };
  }

  private buildRiskSignals(input: FinancialIntelligenceInput): EnterpriseRiskSignal[] {
    const signals: EnterpriseRiskSignal[] = [];
    if (input.treasury) {
      signals.push({
        domain: "treasury",
        score: input.treasury.cashCoverageDays < 30 ? 75 : 25,
        exposureAmount: Math.max(0, 30 - input.treasury.cashCoverageDays) * 1000,
        description: `${input.treasury.cashCoverageDays} days of cash coverage.`,
      });
    }
    if (input.budget) {
      signals.push({
        domain: "budget",
        score: input.budget.utilizationPercent > 90 ? 80 : 30,
        exposureAmount: Math.abs(input.budget.varianceAmount),
        description: `${input.budget.utilizationPercent}% budget utilization.`,
      });
    }
    if (input.generalLedger) {
      signals.push({
        domain: "general_ledger",
        score: input.generalLedger.journalExceptionCount > 0 ? 65 : 20,
        exposureAmount: input.generalLedger.unreconciledItems * 1000,
        description: `${input.generalLedger.journalExceptionCount} journal exception(s).`,
      });
    }
    if (input.grants) {
      signals.push({
        domain: "grants",
        score: input.grants.complianceScore < 80 ? 70 : 25,
        exposureAmount: input.grants.restrictedCashAtRisk,
        description: `${input.grants.complianceScore} grant compliance score.`,
      });
    }
    for (const anomaly of input.anomalies ?? []) {
      signals.push({
        domain: anomaly.domain,
        score: anomaly.severity === "critical" ? 95 : anomaly.severity === "warning" ? 65 : 30,
        exposureAmount: anomaly.amount ?? 0,
        description: anomaly.description,
      });
    }
    return signals;
  }

  private scoreHigherBetter(value: number, target: number): number {
    return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
  }

  private scoreLowerBetter(value: number, target: number): number {
    return Math.max(0, Math.min(100, Math.round((target / Math.max(value, 1)) * 100)));
  }

  private scoreAnomalies(anomalies: FinancialIntelligenceInput["anomalies"]): number {
    return Math.min(100, (anomalies ?? []).reduce((sum, anomaly) => {
      return sum + (anomaly.severity === "critical" ? 35 : anomaly.severity === "warning" ? 20 : 10);
    }, 0));
  }

  private buildExecutiveSummary(
    input: FinancialIntelligenceInput,
    health: OrganizationalHealthAssessment,
    risk: EnterpriseRiskForecast,
    recommendations: DecisionRecommendation[],
  ): string {
    const lead = `Financial intelligence score is ${health.healthScore}, with ${risk.riskLevel} enterprise risk.`;
    const action = recommendations[0]?.recommendation ?? "Continue routine monitoring.";
    const context = input.treasury
      ? ` Treasury cash coverage is ${input.treasury.cashCoverageDays} days.`
      : "";
    return `${lead}${context} Recommended action: ${action}`;
  }

  private withLanguageMarker(language: Exclude<IntelligenceLanguage, "en">, text: string): string {
    return `[${language.toUpperCase()}] ${text}`;
  }
}

export const financialIntelligenceEngine = new FinancialIntelligenceEngine();
