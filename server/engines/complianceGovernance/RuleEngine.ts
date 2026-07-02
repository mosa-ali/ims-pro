import {
  DonorRule,
  GovernanceStatus,
  GovernanceTransaction,
  RuleEvaluation,
  RuleViolation,
} from "./GovernanceTypes";

export class RuleEngine {
  evaluateDonorRules(transaction: GovernanceTransaction, donorRules: DonorRule[]): RuleEvaluation {
    const activeRules = donorRules.filter((rule) => rule.active && rule.donorId === transaction.donorId);
    const violations = activeRules.flatMap((rule) => this.evaluateDonorRule(transaction, rule));
    return this.buildEvaluation(violations);
  }

  evaluateSegregationOfDuties(transaction: GovernanceTransaction): RuleEvaluation {
    const actors = [
      { role: "requester", userId: transaction.requestedByUserId },
      { role: "preparer", userId: transaction.preparedByUserId },
      { role: "reviewer", userId: transaction.reviewedByUserId },
      { role: "approver", userId: transaction.approvedByUserId },
      { role: "payer", userId: transaction.paidByUserId },
    ].filter((actor): actor is { role: string; userId: number } => typeof actor.userId === "number");

    const violations: RuleViolation[] = [];
    for (let index = 0; index < actors.length; index += 1) {
      for (let compareIndex = index + 1; compareIndex < actors.length; compareIndex += 1) {
        if (actors[index].userId === actors[compareIndex].userId) {
          violations.push({
            ruleId: "sod-distinct-actors",
            ruleName: "Segregation of duties",
            status: "non_compliant",
            severity: "critical",
            message: `User ${actors[index].userId} is both ${actors[index].role} and ${actors[compareIndex].role}.`,
            remediation: "Reassign one duty to an independent user before approval or payment.",
          });
        }
      }
    }

    return this.buildEvaluation(violations);
  }

  mergeEvaluations(evaluations: RuleEvaluation[]): RuleEvaluation {
    return this.buildEvaluation(evaluations.flatMap((evaluation) => evaluation.violations));
  }

  private evaluateDonorRule(transaction: GovernanceTransaction, rule: DonorRule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const documents = new Set(transaction.documents ?? []);

    if (rule.allowedCostCategories?.length && transaction.costCategory && !rule.allowedCostCategories.includes(transaction.costCategory)) {
      violations.push(this.violation(rule, `Cost category ${transaction.costCategory} is not allowed.`, "Use an allowed donor cost category or request a donor amendment."));
    }

    if (rule.restrictedBudgetLineIds?.includes(transaction.budgetLineId ?? "")) {
      violations.push(this.violation(rule, `Budget line ${transaction.budgetLineId} is restricted.`, "Move the transaction to an eligible budget line or obtain donor approval."));
    }

    if (rule.allowedCountryCodes?.length && transaction.countryCode && !rule.allowedCountryCodes.includes(transaction.countryCode)) {
      violations.push(this.violation(rule, `Country ${transaction.countryCode} is outside the donor rule.`, "Route the transaction to an eligible country allocation."));
    }

    if (rule.maxTransactionAmount !== undefined && transaction.amount > rule.maxTransactionAmount) {
      violations.push(this.violation(rule, `Amount ${transaction.amount} exceeds donor maximum ${rule.maxTransactionAmount}.`, "Split only when policy allows, or request donor approval."));
    }

    for (const requiredDocument of rule.requiresSupportingDocuments ?? []) {
      if (!documents.has(requiredDocument)) {
        violations.push(this.violation(rule, `Missing supporting document: ${requiredDocument}.`, "Attach the required support before approval."));
      }
    }

    if (rule.spendingEndDate && new Date(transaction.transactionDate) > new Date(rule.spendingEndDate)) {
      violations.push(this.violation(rule, `Transaction date is after donor spending end date ${rule.spendingEndDate}.`, "Do not charge this grant unless a no-cost extension is approved."));
    }

    return violations;
  }

  private violation(rule: DonorRule, message: string, remediation: string): RuleViolation {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: rule.severity === "critical" ? "blocked" : "non_compliant",
      severity: rule.severity,
      message,
      remediation,
    };
  }

  private buildEvaluation(violations: RuleViolation[]): RuleEvaluation {
    const score = Math.max(0, 100 - violations.reduce((sum, violation) => sum + this.penalty(violation.severity), 0));
    return {
      status: this.statusFromViolations(violations),
      score,
      violations,
    };
  }

  private penalty(severity: RuleViolation["severity"]): number {
    return {
      info: 5,
      warning: 10,
      high: 25,
      critical: 50,
    }[severity];
  }

  private statusFromViolations(violations: RuleViolation[]): GovernanceStatus {
    if (violations.some((violation) => violation.status === "blocked" || violation.severity === "critical")) return "blocked";
    if (violations.some((violation) => violation.severity === "high")) return "non_compliant";
    if (violations.length > 0) return "warning";
    return "compliant";
  }
}
