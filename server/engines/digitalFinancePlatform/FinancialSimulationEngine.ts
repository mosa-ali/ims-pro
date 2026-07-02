import {
  DigitalRiskLevel,
  DigitalTwinState,
  FinanceScenario,
  FinancialSimulationResult,
} from "./DigitalFinanceTypes";
import { DigitalTwinEngine } from "./DigitalTwinEngine";

export class FinancialSimulationEngine {
  constructor(private readonly digitalTwinEngine: DigitalTwinEngine = new DigitalTwinEngine()) {}

  simulateScenario(baseline: DigitalTwinState, scenario: FinanceScenario): FinancialSimulationResult {
    const simulated = scenario.assumptions.reduce<DigitalTwinState>((state, assumption) => {
      const currentValue = Number(state[assumption.metric]);
      const nextValue = assumption.changeType === "percent"
        ? currentValue + currentValue * (assumption.value / 100)
        : currentValue + assumption.value;
      return {
        ...state,
        [assumption.metric]: Math.round(nextValue),
      };
    }, baseline);
    const deltas = this.digitalTwinEngine.compareTwins(baseline, simulated);
    const riskLevel = this.deriveRiskLevel(simulated, scenario);

    return {
      scenarioId: scenario.id,
      baseline,
      simulated,
      deltas,
      riskLevel,
      narrative: this.narrative(scenario, deltas, riskLevel),
    };
  }

  simulatePortfolio(baseline: DigitalTwinState, scenarios: FinanceScenario[]): FinancialSimulationResult[] {
    return scenarios.map((scenario) => this.simulateScenario(baseline, scenario));
  }

  private deriveRiskLevel(state: DigitalTwinState, scenario: FinanceScenario): DigitalRiskLevel {
    if (scenario.severity === "crisis" || state.riskScore >= 75 || state.cashBalance - state.restrictedCash < state.committedSpend) return "critical";
    if (scenario.severity === "stress" || state.riskScore >= 60) return "high";
    if (state.riskScore >= 45) return "medium";
    return "low";
  }

  private narrative(scenario: FinanceScenario, deltas: Record<string, number>, riskLevel: DigitalRiskLevel): string {
    const cashDelta = deltas.cashBalance ?? 0;
    const budgetDelta = deltas.budgetAvailable ?? 0;
    return `${scenario.name} produces ${riskLevel} risk with cash change ${cashDelta} and budget availability change ${budgetDelta}.`;
  }
}
