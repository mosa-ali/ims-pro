import {
  ComplianceAssessment,
  GovernanceTransaction,
  GovernanceWorkflow,
  WorkflowStatus,
  WorkflowStep,
} from "./GovernanceTypes";

export class WorkflowEngine {
  buildWorkflow(transaction: GovernanceTransaction, assessment: ComplianceAssessment): GovernanceWorkflow {
    const steps: WorkflowStep[] = [
      {
        order: 1,
        name: "Compliance Review",
        ownerRole: "Compliance Officer",
        status: assessment.status === "compliant" ? "completed" : "pending",
        required: true,
      },
      ...assessment.policyEvaluation.requiredApprovals.map((role, index) => ({
        order: index + 2,
        name: `${role} Approval`,
        ownerRole: role,
        status: transaction.approvedByUserId ? "completed" as const : "pending" as const,
        required: true,
      })),
    ];

    if (assessment.status === "blocked" || assessment.status === "non_compliant") {
      steps.push({
        order: steps.length + 1,
        name: "Exception Resolution",
        ownerRole: "Compliance Director",
        status: "pending",
        required: true,
      });
    }

    if (assessment.policyEvaluation.exceptions.some((exception) => exception.severity === "critical")) {
      steps.push({
        order: steps.length + 1,
        name: "Internal Audit Review",
        ownerRole: "Internal Auditor",
        status: "pending",
        required: true,
      });
    }

    return {
      id: `workflow-${transaction.id}`,
      entityId: transaction.id,
      entityType: transaction.entityType,
      status: this.workflowStatus(assessment, steps),
      currentStep: Math.max(1, steps.find((step) => step.status === "pending")?.order ?? steps.length),
      steps,
    };
  }

  completeStep(workflow: GovernanceWorkflow, ownerRole: string): GovernanceWorkflow {
    const nextSteps = workflow.steps.map((step) => {
      if (step.ownerRole !== ownerRole || step.status !== "pending") return step;
      return {
        ...step,
        status: "completed" as const,
      };
    });

    return {
      ...workflow,
      steps: nextSteps,
      currentStep: Math.max(1, nextSteps.find((step) => step.status === "pending")?.order ?? nextSteps.length),
      status: nextSteps.every((step) => step.status === "completed") ? "completed" : workflow.status,
    };
  }

  private workflowStatus(assessment: ComplianceAssessment, steps: WorkflowStep[]): WorkflowStatus {
    if (assessment.status === "blocked" || assessment.status === "non_compliant") return "exception";
    if (steps.some((step) => step.name.includes("Approval") && step.status === "pending")) return "approval";
    if (steps.some((step) => step.status === "pending")) return "review";
    return "approved";
  }
}
