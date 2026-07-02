import { EnhancedComplianceEngine } from "./EnhancedComplianceEngine";
import { GovernanceRiskMatrixEngine } from "./GovernanceRiskMatrixEngine";
import {
  DonorRule,
  GovernanceScope,
  GovernanceSimulationResult,
  GovernanceTransaction,
} from "./GovernanceTypes";

export class GovernanceSimulationEngine {
  constructor(
    private readonly complianceEngine: EnhancedComplianceEngine,
    private readonly riskMatrixEngine: GovernanceRiskMatrixEngine = new GovernanceRiskMatrixEngine(),
  ) {}

  simulateTransactionChange(input: {
    scope: GovernanceScope;
    transaction: GovernanceTransaction;
    changes: Partial<GovernanceTransaction>;
    donorRules?: DonorRule[];
  }): GovernanceSimulationResult {
    const baseline = this.complianceEngine.assessTransaction(input.scope, input.transaction, input.donorRules ?? []);
    const simulatedTransaction = {
      ...input.transaction,
      ...input.changes,
      metadata: {
        ...input.transaction.metadata,
        ...input.changes.metadata,
      },
    };
    const simulated = this.complianceEngine.assessTransaction(input.scope, simulatedTransaction, input.donorRules ?? []);
    const risk = this.riskMatrixEngine.assessRisk(simulated);

    return {
      transactionId: input.transaction.id,
      baselineStatus: baseline.status,
      simulatedStatus: simulated.status,
      policyImpact: simulated.policyEvaluation.exceptions.map((exception) => exception.description),
      donorImpact: simulated.donorRuleEvaluation.violations.map((violation) => violation.message),
      budgetImpact: this.budgetImpact(input.transaction, simulatedTransaction),
      complianceRisk: risk,
      recommendation: simulated.status === "compliant"
        ? "Simulation is compliant. Proceed through standard workflow."
        : `${risk.mitigation} ${simulated.recommendations[0] ?? ""}`.trim(),
    };
  }

  private budgetImpact(original: GovernanceTransaction, simulated: GovernanceTransaction): string[] {
    const impacts: string[] = [];
    if (original.amount !== simulated.amount) {
      impacts.push(`Amount changes from ${original.amount} ${original.currency} to ${simulated.amount} ${simulated.currency}.`);
    }
    if (original.budgetLineId !== simulated.budgetLineId) {
      impacts.push(`Budget line changes from ${original.budgetLineId ?? "none"} to ${simulated.budgetLineId ?? "none"}.`);
    }
    return impacts.length > 0 ? impacts : ["No budget impact detected."];
  }
}
