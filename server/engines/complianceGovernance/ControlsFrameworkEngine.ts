import {
  ComplianceAssessment,
  ControlEvaluation,
  GovernanceControl,
  GovernanceException,
  GovernanceStatus,
  GovernanceTransaction,
} from "./GovernanceTypes";

export class ControlsFrameworkEngine {
  private readonly controls = new Map<string, GovernanceControl>();

  constructor(controls: GovernanceControl[] = defaultGovernanceControls) {
    controls.forEach((control) => this.registerControl(control));
  }

  registerControl(control: GovernanceControl): GovernanceControl {
    this.controls.set(control.id, control);
    return control;
  }

  listControls(): GovernanceControl[] {
    return [...this.controls.values()];
  }

  evaluateControls(transaction: GovernanceTransaction, assessment: ComplianceAssessment): ControlEvaluation[] {
    return this.listControls().map((control) => {
      const exceptions = this.exceptionsForControl(control, assessment);
      return {
        controlId: control.id,
        type: control.type,
        status: this.statusFromExceptions(exceptions, assessment.status),
        evidence: this.evidenceForControl(control, transaction, assessment),
        exceptions,
      };
    });
  }

  summarizeByType(evaluations: ControlEvaluation[]): Record<GovernanceControl["type"], { total: number; failed: number }> {
    return evaluations.reduce<Record<GovernanceControl["type"], { total: number; failed: number }>>((summary, evaluation) => {
      summary[evaluation.type].total += 1;
      if (evaluation.status !== "compliant") summary[evaluation.type].failed += 1;
      return summary;
    }, {
      preventive: { total: 0, failed: 0 },
      detective: { total: 0, failed: 0 },
      corrective: { total: 0, failed: 0 },
    });
  }

  private exceptionsForControl(control: GovernanceControl, assessment: ComplianceAssessment): GovernanceException[] {
    const policyExceptions = assessment.policyEvaluation.exceptions.filter((exception) =>
      control.linkedPolicyIds.some((policyId) => exception.id.includes(policyId)),
    );
    const ruleExceptions = assessment.donorRuleEvaluation.violations
      .filter((violation) => control.linkedRuleIds.includes(violation.ruleId))
      .map((violation) => ({
        id: `control-${control.id}-${violation.ruleId}`,
        entityId: assessment.entityId,
        entityType: assessment.entityType,
        severity: violation.severity,
        status: "detected" as const,
        title: violation.ruleName,
        description: violation.message,
        ownerRole: control.ownerRole,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

    if (control.id === "control-corrective-exception-workflow" && assessment.status !== "compliant") {
      return [...policyExceptions, ...ruleExceptions];
    }

    return [...policyExceptions, ...ruleExceptions];
  }

  private evidenceForControl(control: GovernanceControl, transaction: GovernanceTransaction, assessment: ComplianceAssessment): string[] {
    return [
      `transaction:${transaction.id}`,
      `assessment:${assessment.entityId}:${assessment.assessedAt}`,
      ...control.linkedPolicyIds.map((policyId) => `policy:${policyId}`),
      ...control.linkedRuleIds.map((ruleId) => `rule:${ruleId}`),
    ];
  }

  private statusFromExceptions(exceptions: GovernanceException[], assessmentStatus: GovernanceStatus): GovernanceStatus {
    if (exceptions.some((exception) => exception.severity === "critical")) return "blocked";
    if (exceptions.some((exception) => exception.severity === "high")) return "non_compliant";
    if (exceptions.length > 0 || assessmentStatus === "warning") return "warning";
    return "compliant";
  }
}

export const defaultGovernanceControls: GovernanceControl[] = [
  {
    id: "control-preventive-approvals",
    name: "Required Approvals",
    type: "preventive",
    description: "Prevent unauthorized transactions before posting or payment.",
    ownerRole: "Finance Director",
    linkedPolicyIds: ["policy-high-value-approval"],
    linkedRuleIds: [],
    automationLevel: "automated",
  },
  {
    id: "control-preventive-sod",
    name: "Segregation of Duties",
    type: "preventive",
    description: "Prevents the same user from preparing, approving, and paying a transaction.",
    ownerRole: "Internal Auditor",
    linkedPolicyIds: ["policy-segregation-of-duties"],
    linkedRuleIds: ["sod-distinct-actors"],
    automationLevel: "automated",
  },
  {
    id: "control-detective-documents",
    name: "Missing Document Detection",
    type: "detective",
    description: "Detects missing invoices, approvals, delivery notes, and donor evidence.",
    ownerRole: "Compliance Officer",
    linkedPolicyIds: ["policy-standard-supporting-documents"],
    linkedRuleIds: [],
    automationLevel: "automated",
  },
  {
    id: "control-corrective-exception-workflow",
    name: "Exception Workflow",
    type: "corrective",
    description: "Routes detected exceptions to remediation, audit, approval, and closure.",
    ownerRole: "Compliance Director",
    linkedPolicyIds: [],
    linkedRuleIds: [],
    automationLevel: "semi_automated",
  },
];
