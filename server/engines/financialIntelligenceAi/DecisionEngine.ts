export type IntelligenceLanguage = "en" | "ar" | "it";
export type IntelligenceSeverity = "info" | "warning" | "critical";

export interface DecisionEvidence {
  sourceEngine: "treasury" | "budget" | "general_ledger" | "grants" | "kpi" | "forecast" | "risk" | "health";
  metric: string;
  value: number | string;
  interpretation: string;
}

export interface DecisionRecommendation {
  id: string;
  title: string;
  severity: IntelligenceSeverity;
  recommendation: string;
  rationale: string;
  expectedImpact: string;
  confidence: number;
  evidence: DecisionEvidence[];
  auditTrail: Array<{
    step: string;
    explanation: string;
    sourceEngine?: DecisionEvidence["sourceEngine"];
  }>;
}

export class DecisionEngine {
  generateRecommendations(input: {
    evidence: DecisionEvidence[];
    language?: IntelligenceLanguage;
  }): DecisionRecommendation[] {
    const recommendations: DecisionRecommendation[] = [];
    const treasuryCoverage = this.numericEvidence(input.evidence, "cashCoverageDays");
    const budgetUtilization = this.numericEvidence(input.evidence, "budgetUtilizationPercent");
    const riskScore = this.numericEvidence(input.evidence, "overallRiskScore");
    const anomalyCount = this.numericEvidence(input.evidence, "anomalyCount");

    if (treasuryCoverage !== undefined && treasuryCoverage < 30) {
      recommendations.push(this.buildRecommendation({
        id: "decision-liquidity-pressure",
        title: this.translate("Liquidity pressure expected", input.language),
        severity: treasuryCoverage < 14 ? "critical" : "warning",
        recommendation: this.translate("Accelerate confirmed inflows and reschedule non-critical payments.", input.language),
        rationale: this.translate(`Cash coverage is ${treasuryCoverage.toFixed(1)} days, below the enterprise target.`, input.language),
        expectedImpact: this.translate("Improves short-term liquidity and protects restricted operating cash.", input.language),
        confidence: 0.88,
        evidence: input.evidence.filter((item) => item.metric === "cashCoverageDays"),
      }));
    }

    if (budgetUtilization !== undefined && budgetUtilization > 90) {
      recommendations.push(this.buildRecommendation({
        id: "decision-budget-overrun",
        title: this.translate("Budget overrun risk", input.language),
        severity: budgetUtilization > 100 ? "critical" : "warning",
        recommendation: this.translate("Freeze discretionary spending and rebalance budget lines with donor approval where required.", input.language),
        rationale: this.translate(`Budget utilization is ${budgetUtilization.toFixed(1)}%.`, input.language),
        expectedImpact: this.translate("Reduces overrun exposure and improves donor compliance confidence.", input.language),
        confidence: 0.84,
        evidence: input.evidence.filter((item) => item.metric === "budgetUtilizationPercent"),
      }));
    }

    if (riskScore !== undefined && riskScore >= 70) {
      recommendations.push(this.buildRecommendation({
        id: "decision-enterprise-risk",
        title: this.translate("Enterprise financial risk rising", input.language),
        severity: riskScore >= 85 ? "critical" : "warning",
        recommendation: this.translate("Open an executive risk review and assign mitigation owners for top risk drivers.", input.language),
        rationale: this.translate(`Enterprise risk score is ${riskScore.toFixed(0)}.`, input.language),
        expectedImpact: this.translate("Creates accountable mitigation before risk materializes in cash, budget, or reporting outcomes.", input.language),
        confidence: 0.82,
        evidence: input.evidence.filter((item) => item.metric === "overallRiskScore"),
      }));
    }

    if (anomalyCount !== undefined && anomalyCount > 0) {
      recommendations.push(this.buildRecommendation({
        id: "decision-anomaly-review",
        title: this.translate("Financial anomalies require review", input.language),
        severity: anomalyCount > 5 ? "critical" : "warning",
        recommendation: this.translate("Route anomalies to finance control review before period close.", input.language),
        rationale: this.translate(`${anomalyCount} anomaly signal(s) were detected across financial activity.`, input.language),
        expectedImpact: this.translate("Improves audit readiness and reduces misstatement risk.", input.language),
        confidence: 0.79,
        evidence: input.evidence.filter((item) => item.metric === "anomalyCount"),
      }));
    }

    return recommendations.length ? recommendations : [
      this.buildRecommendation({
        id: "decision-stable-monitoring",
        title: this.translate("Financial position stable", input.language),
        severity: "info",
        recommendation: this.translate("Continue routine monitoring and refresh predictive forecasts on the next reporting cycle.", input.language),
        rationale: this.translate("No critical decision threshold was breached.", input.language),
        expectedImpact: this.translate("Maintains executive visibility without unnecessary intervention.", input.language),
        confidence: 0.72,
        evidence: input.evidence,
      }),
    ];
  }

  private numericEvidence(evidence: DecisionEvidence[], metric: string): number | undefined {
    const found = evidence.find((item) => item.metric === metric);
    if (!found) return undefined;
    const value = Number(found.value);
    return Number.isFinite(value) ? value : undefined;
  }

  private buildRecommendation(input: Omit<DecisionRecommendation, "auditTrail">): DecisionRecommendation {
    return {
      ...input,
      auditTrail: [
        {
          step: "collect_evidence",
          explanation: "Read normalized signals from source engines.",
        },
        {
          step: "evaluate_thresholds",
          explanation: "Compared signals against enterprise decision thresholds.",
          sourceEngine: input.evidence[0]?.sourceEngine,
        },
        {
          step: "generate_recommendation",
          explanation: "Produced recommendation with rationale, impact, confidence, and evidence.",
        },
      ],
    };
  }

  private translate(text: string, language: IntelligenceLanguage = "en"): string {
    if (language === "ar") return `[AR] ${text}`;
    if (language === "it") return `[IT] ${text}`;
    return text;
  }
}

export const decisionEngine = new DecisionEngine();
