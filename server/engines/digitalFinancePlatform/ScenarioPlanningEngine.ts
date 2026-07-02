import { FinanceScenario, ScenarioAssumption } from "./DigitalFinanceTypes";

export class ScenarioPlanningEngine {
  createScenario(input: {
    id: string;
    name: string;
    severity: FinanceScenario["severity"];
    assumptions: ScenarioAssumption[];
  }): FinanceScenario {
    return {
      id: input.id,
      name: input.name,
      severity: input.severity,
      assumptions: input.assumptions,
    };
  }

  buildDefaultScenarios(): FinanceScenario[] {
    return [
      this.createScenario({
        id: "scenario-expected",
        name: "Expected Operating Plan",
        severity: "expected",
        assumptions: [
          { metric: "cashBalance", changeType: "percent", value: -5, description: "Normal monthly cash usage." },
          { metric: "pipelineSpend", changeType: "percent", value: 8, description: "Procurement pipeline grows moderately." },
        ],
      }),
      this.createScenario({
        id: "scenario-grant-delay",
        name: "Grant Inflow Delayed",
        severity: "stress",
        assumptions: [
          { metric: "cashBalance", changeType: "absolute", value: -250000, description: "Confirmed grant inflow is delayed." },
          { metric: "riskScore", changeType: "absolute", value: 18, description: "Liquidity and compliance risk rise." },
        ],
      }),
      this.createScenario({
        id: "scenario-procurement-surge",
        name: "Emergency Procurement Surge",
        severity: "crisis",
        assumptions: [
          { metric: "pipelineSpend", changeType: "percent", value: 45, description: "Emergency procurement increases commitments." },
          { metric: "budgetAvailable", changeType: "percent", value: -30, description: "Available budget is consumed quickly." },
          { metric: "riskScore", changeType: "absolute", value: 28, description: "Operational and donor compliance risk increase." },
        ],
      }),
    ];
  }
}
