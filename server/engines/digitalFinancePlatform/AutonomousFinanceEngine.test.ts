import { describe, expect, it } from "vitest";
import { AutonomousFinanceEngine } from "./AutonomousFinanceEngine";
import { DigitalTwinEngine } from "./DigitalTwinEngine";
import { FinancialSimulationEngine } from "./FinancialSimulationEngine";
import { KnowledgeGraphEngine } from "./KnowledgeGraphEngine";
import { ScenarioPlanningEngine } from "./ScenarioPlanningEngine";

describe("Phase 13 Digital Finance Platform", () => {
  it("builds a cross-domain knowledge graph and impact path", () => {
    const graphEngine = new KnowledgeGraphEngine();
    const graph = graphEngine.buildEnterpriseGraph({ organizationId: 1, operatingUnitId: 10 });
    const impactPath = graphEngine.findImpactPath("supplier-501", "cash-main-usd");

    expect(graph.nodes.map((node) => node.type)).toEqual(expect.arrayContaining(["grant", "cash_account", "supplier", "asset"]));
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(impactPath.edges.length).toBeGreaterThan(0);
  });

  it("builds and compares digital twin state", () => {
    const twinEngine = new DigitalTwinEngine();
    const baseline = twinEngine.buildTwin({ organizationId: 1, operatingUnitId: 10 });
    const updated = twinEngine.refreshTwin(baseline, { cashBalance: 1100000, riskScore: 58 });
    const deltas = twinEngine.compareTwins(baseline, updated);

    expect(baseline.kpis.cashCoverageDays).toBe(42);
    expect(deltas.cashBalance).toBe(-150000);
    expect(deltas.riskScore).toBe(14);
  });

  it("creates scenarios and runs financial simulations", () => {
    const twinEngine = new DigitalTwinEngine();
    const scenarioEngine = new ScenarioPlanningEngine();
    const simulationEngine = new FinancialSimulationEngine(twinEngine);
    const baseline = twinEngine.buildTwin({ organizationId: 1 });
    const scenarios = scenarioEngine.buildDefaultScenarios();
    const simulations = simulationEngine.simulatePortfolio(baseline, scenarios);

    expect(scenarios.map((scenario) => scenario.id)).toContain("scenario-procurement-surge");
    expect(simulations.map((simulation) => simulation.riskLevel)).toContain("critical");
    expect(simulations[0].narrative).toContain("risk");
  });

  it("runs autonomous finance and proposes governed actions", () => {
    const engine = new AutonomousFinanceEngine();
    const run = engine.run({
      organizationId: 1,
      operatingUnitId: 10,
      userId: 7,
      userRole: "Finance Director",
      locale: "en",
    });

    expect(run.graphSummary).toContain("Retrieved");
    expect(run.simulations.length).toBeGreaterThan(0);
    expect(run.decisions.length).toBeGreaterThan(0);
    expect(run.actions.map((action) => action.status)).toContain("requires_approval");
  });

  it("enforces approval before autonomous action execution", () => {
    const engine = new AutonomousFinanceEngine();
    const action = engine.run({ organizationId: 1 }).actions.find((candidate) => candidate.status === "requires_approval");

    expect(action).toBeDefined();
    const blocked = engine.executeApprovedAction(action!);
    const approved = engine.approveAction(action!, "Finance Director");
    const executed = engine.executeApprovedAction(approved);

    expect(blocked.status).toBe("blocked");
    expect(approved.status).toBe("approved");
    expect(executed.status).toBe("executed");
  });
});
