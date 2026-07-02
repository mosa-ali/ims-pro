import {
  AutonomousFinanceAction,
  DigitalFinanceScope,
  FinanceDecision,
  FinancialSimulationResult,
} from "./DigitalFinanceTypes";
import { DecisionEngine } from "./DecisionEngine";
import { DigitalTwinEngine } from "./DigitalTwinEngine";
import { FinancialSimulationEngine } from "./FinancialSimulationEngine";
import { KnowledgeGraphEngine } from "./KnowledgeGraphEngine";
import { ScenarioPlanningEngine } from "./ScenarioPlanningEngine";

export interface AutonomousFinanceRun {
  scope: DigitalFinanceScope;
  graphSummary: string;
  simulations: FinancialSimulationResult[];
  decisions: FinanceDecision[];
  actions: AutonomousFinanceAction[];
}

export class AutonomousFinanceEngine {
  readonly knowledgeGraphEngine: KnowledgeGraphEngine;
  readonly digitalTwinEngine: DigitalTwinEngine;
  readonly scenarioPlanningEngine: ScenarioPlanningEngine;
  readonly financialSimulationEngine: FinancialSimulationEngine;
  readonly decisionEngine: DecisionEngine;

  constructor(input: {
    knowledgeGraphEngine?: KnowledgeGraphEngine;
    digitalTwinEngine?: DigitalTwinEngine;
    scenarioPlanningEngine?: ScenarioPlanningEngine;
    financialSimulationEngine?: FinancialSimulationEngine;
    decisionEngine?: DecisionEngine;
  } = {}) {
    this.knowledgeGraphEngine = input.knowledgeGraphEngine ?? new KnowledgeGraphEngine();
    this.digitalTwinEngine = input.digitalTwinEngine ?? new DigitalTwinEngine(this.knowledgeGraphEngine);
    this.scenarioPlanningEngine = input.scenarioPlanningEngine ?? new ScenarioPlanningEngine();
    this.financialSimulationEngine = input.financialSimulationEngine ?? new FinancialSimulationEngine(this.digitalTwinEngine);
    this.decisionEngine = input.decisionEngine ?? new DecisionEngine();
  }

  run(scope: DigitalFinanceScope): AutonomousFinanceRun {
    const graph = this.knowledgeGraphEngine.buildEnterpriseGraph(scope);
    const twin = this.digitalTwinEngine.buildTwin(scope);
    const scenarios = this.scenarioPlanningEngine.buildDefaultScenarios();
    const simulations = this.financialSimulationEngine.simulatePortfolio(twin, scenarios);
    const decisions = this.decisionEngine.generateDecisions({ simulations });

    return {
      scope,
      graphSummary: graph.explanation,
      simulations,
      decisions,
      actions: this.proposeActions(decisions),
    };
  }

  approveAction(action: AutonomousFinanceAction, approverRole: string): AutonomousFinanceAction {
    if (action.requiredApprovalRole && action.requiredApprovalRole !== approverRole) {
      return {
        ...action,
        status: "blocked",
        reason: `${approverRole} cannot approve action requiring ${action.requiredApprovalRole}.`,
      };
    }

    return {
      ...action,
      status: "approved",
    };
  }

  executeApprovedAction(action: AutonomousFinanceAction): AutonomousFinanceAction {
    if (action.status !== "approved") {
      return {
        ...action,
        status: "blocked",
        reason: "Only approved autonomous finance actions can execute.",
      };
    }

    return {
      ...action,
      status: "executed",
    };
  }

  private proposeActions(decisions: FinanceDecision[]): AutonomousFinanceAction[] {
    return decisions.map((decision) => {
      const actionType = this.actionTypeForDecision(decision);
      const requiresApproval = decision.riskLevel === "critical" || decision.priority === "immediate";
      return {
        id: `auto-action-${decision.id}`,
        actionType,
        status: requiresApproval ? "requires_approval" : "recommended",
        ownerRole: decision.ownerRole,
        reason: decision.recommendation,
        requiredApprovalRole: requiresApproval ? "Finance Director" : undefined,
        linkedDecisionId: decision.id,
      };
    });
  }

  private actionTypeForDecision(decision: FinanceDecision): AutonomousFinanceAction["actionType"] {
    if (decision.title.toLowerCase().includes("liquidity")) return "reschedule_payment";
    if (decision.title.toLowerCase().includes("budget")) return "freeze_discretionary_spend";
    if (decision.title.toLowerCase().includes("risk")) return "open_risk_workflow";
    return "trigger_compliance_review";
  }
}
