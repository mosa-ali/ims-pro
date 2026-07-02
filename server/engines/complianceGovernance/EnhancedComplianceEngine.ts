import { PolicyEngine } from "./PolicyEngine";
import { RuleEngine } from "./RuleEngine";
import {
  ComplianceAssessment,
  DonorRule,
  GovernanceScope,
  GovernanceStatus,
  GovernanceTransaction,
  RuleEvaluation,
} from "./GovernanceTypes";

export class EnhancedComplianceEngine {
  constructor(
    private readonly ruleEngine: RuleEngine = new RuleEngine(),
    private readonly policyEngine: PolicyEngine = new PolicyEngine(),
  ) {}

  assessTransaction(scope: GovernanceScope, transaction: GovernanceTransaction, donorRules: DonorRule[] = []): ComplianceAssessment {
    this.assertScope(scope, transaction);

    const donorRuleEvaluation = this.ruleEngine.evaluateDonorRules(transaction, donorRules);
    const sodEvaluation = this.ruleEngine.evaluateSegregationOfDuties(transaction);
    const policyEvaluation = this.policyEngine.evaluatePolicies(transaction);
    const mergedDonorEvaluation: RuleEvaluation = this.ruleEngine.mergeEvaluations([donorRuleEvaluation, sodEvaluation]);
    const score = Math.round((mergedDonorEvaluation.score + policyEvaluation.score) / 2);
    const status = this.deriveStatus([mergedDonorEvaluation.status, policyEvaluation.status], score);

    return {
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId ?? null,
      entityId: transaction.id,
      entityType: transaction.entityType,
      status,
      score,
      donorRuleEvaluation: mergedDonorEvaluation,
      policyEvaluation,
      recommendations: this.buildRecommendations(mergedDonorEvaluation, policyEvaluation),
      assessedAt: new Date().toISOString(),
    };
  }

  assessBatch(scope: GovernanceScope, transactions: GovernanceTransaction[], donorRules: DonorRule[] = []): ComplianceAssessment[] {
    return transactions.map((transaction) => this.assessTransaction(scope, transaction, donorRules));
  }

  private assertScope(scope: GovernanceScope, transaction: GovernanceTransaction): void {
    const transactionOrganizationId = transaction.metadata?.organizationId;
    const transactionOperatingUnitId = transaction.metadata?.operatingUnitId;

    if (typeof transactionOrganizationId === "number" && transactionOrganizationId !== scope.organizationId) {
      throw new Error("Transaction organization does not match governance scope.");
    }

    if (typeof transactionOperatingUnitId === "number" && scope.operatingUnitId !== undefined && transactionOperatingUnitId !== scope.operatingUnitId) {
      throw new Error("Transaction operating unit does not match governance scope.");
    }
  }

  private deriveStatus(statuses: GovernanceStatus[], score: number): GovernanceStatus {
    if (statuses.includes("blocked")) return "blocked";
    if (statuses.includes("non_compliant")) return "non_compliant";
    if (statuses.includes("warning") || score < 85) return "warning";
    return "compliant";
  }

  private buildRecommendations(
    donorEvaluation: RuleEvaluation,
    policyEvaluation: ReturnType<PolicyEngine["evaluatePolicies"]>,
  ): string[] {
    const recommendations = [
      ...donorEvaluation.violations.map((violation) => violation.remediation),
      ...policyEvaluation.exceptions.map((exception) => `${exception.ownerRole}: ${exception.description}`),
    ];

    return recommendations.length > 0
      ? [...new Set(recommendations)]
      : ["No compliance action required. Continue standard monitoring."];
  }
}
