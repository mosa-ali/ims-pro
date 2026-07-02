import {
  DecisionEvidence,
  DigitalRiskLevel,
  FinanceDecision,
  FinancialSimulationResult,
} from "./DigitalFinanceTypes";

export class DecisionEngine {
  generateDecisions(input: {
    simulations: FinancialSimulationResult[];
    evidence?: DecisionEvidence[];
  }): FinanceDecision[] {
    const decisions = input.simulations.flatMap((simulation) => this.decisionsForSimulation(simulation));

    if (decisions.length === 0) {
      return [
        this.buildDecision({
          id: "digital-decision-stable",
          title: "Digital finance position stable",
          riskLevel: "low",
          priority: "strategic",
          ownerRole: "Finance Director",
          recommendation: "Continue monitoring the digital twin and refresh scenarios in the next reporting cycle.",
          expectedImpact: "Maintains executive visibility without unnecessary intervention.",
          evidence: input.evidence ?? [],
        }),
      ];
    }

    return decisions;
  }

  private decisionsForSimulation(simulation: FinancialSimulationResult): FinanceDecision[] {
    const decisions: FinanceDecision[] = [];
    if (simulation.riskLevel === "critical" || simulation.riskLevel === "high") {
      decisions.push(this.buildDecision({
        id: `decision-${simulation.scenarioId}-risk`,
        title: "Scenario risk requires executive action",
        riskLevel: simulation.riskLevel,
        priority: simulation.riskLevel === "critical" ? "immediate" : "today",
        ownerRole: "Finance Director",
        recommendation: "Open an executive finance review and assign mitigation owners for cash, budget, grant, and procurement impacts.",
        expectedImpact: "Reduces exposure before the simulated risk affects live operations.",
        evidence: this.evidenceFromSimulation(simulation),
      }));
    }

    if ((simulation.deltas.cashBalance ?? 0) < -100000) {
      decisions.push(this.buildDecision({
        id: `decision-${simulation.scenarioId}-liquidity`,
        title: "Liquidity protection required",
        riskLevel: this.maxRisk(simulation.riskLevel, "medium"),
        priority: "today",
        ownerRole: "Treasury Manager",
        recommendation: "Accelerate confirmed inflows and reschedule non-critical payments.",
        expectedImpact: "Protects usable cash while preserving restricted funds.",
        evidence: this.evidenceFromSimulation(simulation).filter((item) => item.metric.includes("cash")),
      }));
    }

    if ((simulation.deltas.budgetAvailable ?? 0) < -50000 || simulation.simulated.budgetAvailable < simulation.simulated.pipelineSpend) {
      decisions.push(this.buildDecision({
        id: `decision-${simulation.scenarioId}-budget`,
        title: "Budget pressure expected",
        riskLevel: this.maxRisk(simulation.riskLevel, "medium"),
        priority: "this_week",
        ownerRole: "Budget Manager",
        recommendation: "Review pipeline spend, freeze discretionary purchases, and prepare budget reallocation options.",
        expectedImpact: "Reduces budget overrun and donor compliance exposure.",
        evidence: this.evidenceFromSimulation(simulation).filter((item) => item.metric.includes("budget") || item.metric.includes("pipeline")),
      }));
    }

    return decisions;
  }

  private buildDecision(input: Omit<FinanceDecision, "auditTrail">): FinanceDecision {
    return {
      ...input,
      auditTrail: [
        { step: "collect_digital_twin_state", explanation: "Read current enterprise digital twin metrics." },
        { step: "simulate_scenario", explanation: "Applied scenario assumptions to baseline state." },
        { step: "evaluate_thresholds", explanation: "Compared simulation outputs to enterprise finance decision thresholds." },
        { step: "recommend_action", explanation: "Generated explainable recommendation with owner, priority, impact, and evidence." },
      ],
    };
  }

  private evidenceFromSimulation(simulation: FinancialSimulationResult): DecisionEvidence[] {
    return Object.entries(simulation.deltas).map(([metric, value]) => ({
      source: "scenario",
      metric,
      value,
      interpretation: `${metric} changed by ${value} under ${simulation.scenarioId}.`,
    }));
  }

  private maxRisk(a: DigitalRiskLevel, b: DigitalRiskLevel): DigitalRiskLevel {
    const rank: Record<DigitalRiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    return rank[a] >= rank[b] ? a : b;
  }
}
