import {
  GovernanceException,
  GovernanceStatus,
  GovernanceTransaction,
  PolicyDefinition,
  PolicyEvaluation,
  PolicyVersionRecord,
} from "./GovernanceTypes";

export class PolicyEngine {
  private readonly policies = new Map<string, PolicyDefinition>();

  constructor(policies: PolicyDefinition[] = defaultGovernancePolicies) {
    policies.forEach((policy) => this.registerPolicy(policy));
  }

  registerPolicy(policy: PolicyDefinition): PolicyDefinition {
    this.policies.set(policy.id, policy);
    return policy;
  }

  listPolicies(): PolicyDefinition[] {
    return [...this.policies.values()];
  }

  listPolicyVersions(): PolicyVersionRecord[] {
    return this.listPolicies().map((policy) => ({
      policyId: policy.id,
      version: policy.version,
      effectiveDate: policy.effectiveDate,
      supersedesPolicyId: policy.supersedesPolicyId,
      approvedByRole: policy.approvedByRole,
      changeReason: policy.changeReason,
      createdAt: policy.effectiveDate,
    }));
  }

  evaluatePolicies(transaction: GovernanceTransaction): PolicyEvaluation {
    const appliedPolicies = this.listPolicies().filter((policy) => policy.active && policy.entityTypes.includes(transaction.entityType));
    const exceptions = appliedPolicies.flatMap((policy) => this.evaluatePolicy(transaction, policy));
    const requiredApprovals = this.deriveRequiredApprovals(transaction, appliedPolicies);

    return {
      status: this.statusFromExceptions(exceptions),
      score: Math.max(0, 100 - exceptions.reduce((sum, exception) => sum + this.penalty(exception.severity), 0)),
      requiredApprovals,
      exceptions,
      appliedPolicyIds: appliedPolicies.map((policy) => policy.id),
    };
  }

  private evaluatePolicy(transaction: GovernanceTransaction, policy: PolicyDefinition): GovernanceException[] {
    const documents = new Set(transaction.documents ?? []);
    const exceptions: GovernanceException[] = [];

    if (policy.rules.maxAmountWithoutDirectorApproval !== undefined &&
      transaction.amount > policy.rules.maxAmountWithoutDirectorApproval &&
      !transaction.approvedByUserId) {
      exceptions.push(this.exception(transaction, policy, "Director approval required", "Transaction exceeds the amount threshold and has no recorded approval.", "Finance Director"));
    }

    for (const requiredDocument of policy.rules.requiredDocuments ?? []) {
      if (!documents.has(requiredDocument)) {
        exceptions.push(this.exception(transaction, policy, "Missing required document", `${requiredDocument} is required by policy.`, "Compliance Officer"));
      }
    }

    if (policy.rules.blockedCostCategories?.includes(transaction.costCategory ?? "")) {
      exceptions.push(this.exception(transaction, policy, "Blocked cost category", `${transaction.costCategory} is blocked by policy.`, "Finance Director"));
    }

    if (policy.rules.enforceSegregationOfDuties && this.hasSameActorAcrossDuties(transaction)) {
      exceptions.push(this.exception(transaction, policy, "Segregation of duties violation", "The same user appears in more than one controlled duty.", "Internal Auditor"));
    }

    return exceptions;
  }

  private deriveRequiredApprovals(transaction: GovernanceTransaction, policies: PolicyDefinition[]): string[] {
    const approvals = new Set<string>();
    policies.forEach((policy) => {
      (policy.rules.requiredApproverRoles ?? []).forEach((role) => approvals.add(role));
      if (policy.rules.maxAmountWithoutDirectorApproval !== undefined && transaction.amount > policy.rules.maxAmountWithoutDirectorApproval) {
        approvals.add("Finance Director");
      }
    });
    return [...approvals];
  }

  private hasSameActorAcrossDuties(transaction: GovernanceTransaction): boolean {
    const actorIds = [
      transaction.requestedByUserId,
      transaction.preparedByUserId,
      transaction.reviewedByUserId,
      transaction.approvedByUserId,
      transaction.paidByUserId,
    ].filter((value): value is number => typeof value === "number");
    return new Set(actorIds).size !== actorIds.length;
  }

  private exception(transaction: GovernanceTransaction, policy: PolicyDefinition, title: string, description: string, ownerRole: string): GovernanceException {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (policy.severity === "critical" ? 1 : 7));
    return {
      id: `exception-${policy.id}-${transaction.id}-${title.toLowerCase().replace(/\s+/g, "-")}`,
      entityId: transaction.id,
      entityType: transaction.entityType,
      severity: policy.severity,
      status: "detected",
      title,
      description,
      ownerRole,
      dueDate: dueDate.toISOString(),
      lifecycleHistory: [
        {
          status: "detected",
          changedAt: new Date().toISOString(),
          changedByRole: "PolicyEngine",
          note: `Detected by ${policy.name} ${policy.version}.`,
        },
      ],
    };
  }

  private statusFromExceptions(exceptions: GovernanceException[]): GovernanceStatus {
    if (exceptions.some((exception) => exception.severity === "critical")) return "blocked";
    if (exceptions.some((exception) => exception.severity === "high")) return "non_compliant";
    if (exceptions.length > 0) return "warning";
    return "compliant";
  }

  private penalty(severity: GovernanceException["severity"]): number {
    return {
      info: 5,
      warning: 10,
      high: 25,
      critical: 50,
    }[severity];
  }
}

export const defaultGovernancePolicies: PolicyDefinition[] = [
  {
    id: "policy-standard-supporting-documents",
    name: "Standard Supporting Documents",
    version: "1.0.0",
    effectiveDate: "2026-07-02",
    approvedByRole: "Compliance Director",
    changeReason: "Initial Phase 9 governance policy baseline.",
    active: true,
    entityTypes: ["payment", "procurement", "journal"],
    severity: "warning",
    rules: {
      requiredDocuments: ["invoice", "approval"],
      requiredApproverRoles: ["Finance Reviewer"],
    },
  },
  {
    id: "policy-high-value-approval",
    name: "High Value Approval",
    version: "1.0.0",
    effectiveDate: "2026-07-02",
    approvedByRole: "Finance Director",
    changeReason: "Initial high-value approval threshold.",
    active: true,
    entityTypes: ["payment", "procurement", "budget"],
    severity: "high",
    rules: {
      maxAmountWithoutDirectorApproval: 10000,
      requiredApproverRoles: ["Finance Director"],
      exceptionRequiresAudit: true,
    },
  },
  {
    id: "policy-segregation-of-duties",
    name: "Segregation of Duties",
    version: "1.0.0",
    effectiveDate: "2026-07-02",
    approvedByRole: "Internal Auditor",
    changeReason: "Initial segregation of duties control.",
    active: true,
    entityTypes: ["payment", "journal", "procurement"],
    severity: "critical",
    rules: {
      enforceSegregationOfDuties: true,
      exceptionRequiresAudit: true,
    },
  },
];
