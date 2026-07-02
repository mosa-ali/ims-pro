import {
  TreasuryComplianceResult,
  TreasuryLimitAssessment,
  TreasuryWorkflowState,
} from "./TreasuryTypes";

export class TreasuryWorkflowEngine {
  buildWorkflow(input: {
    limits: TreasuryLimitAssessment;
    compliance: TreasuryComplianceResult;
  }): TreasuryWorkflowState {
    const hasCriticalPolicyBreach = input.limits.violations.some((violation) => violation.severity === "critical");
    const hasCriticalComplianceFinding = input.compliance.findings.some((finding) => finding.severity === "critical");
    const approvalBlocked = hasCriticalPolicyBreach || hasCriticalComplianceFinding;

    const steps: TreasuryWorkflowState["steps"] = [
      {
        key: "forecast",
        status: "completed",
        ownerRole: "Treasury Analyst",
        message: "Cash forecast generated.",
      },
      {
        key: "review",
        status: input.limits.passed ? "completed" : "ready",
        ownerRole: "Treasury Manager",
        message: input.limits.passed ? "Policy limits reviewed." : "Policy exceptions require review.",
      },
      {
        key: "approve",
        status: approvalBlocked ? "blocked" : "ready",
        ownerRole: "Finance Controller",
        message: approvalBlocked ? "Approval blocked by critical policy or compliance finding." : "Ready for approval.",
      },
      {
        key: "publish",
        status: "pending",
        ownerRole: "Treasury Manager",
        message: "Publish after approval.",
      },
      {
        key: "execute",
        status: "pending",
        ownerRole: "Treasury Operations",
        message: "Execute optimized payments and cash movements after publishing.",
      },
      {
        key: "reconcile",
        status: "pending",
        ownerRole: "Finance Operations",
        message: "Reconcile bank activity after execution.",
      },
    ];

    return {
      currentStep: steps.find((step) => step.status === "blocked" || step.status === "ready")?.key ?? "forecast",
      steps,
    };
  }
}
