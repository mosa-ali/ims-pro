import { ComplianceAssessment, GovernanceRiskMatrixResult } from "./GovernanceTypes";

export class GovernanceRiskMatrixEngine {
  assessRisk(assessment: ComplianceAssessment): GovernanceRiskMatrixResult {
    const likelihood = this.likelihood(assessment);
    const impact = this.impact(assessment);
    return {
      likelihood,
      impact,
      priority: this.priority(likelihood, impact),
      mitigation: this.mitigation(likelihood, impact),
    };
  }

  private likelihood(assessment: ComplianceAssessment): GovernanceRiskMatrixResult["likelihood"] {
    const exceptionCount = assessment.policyEvaluation.exceptions.length + assessment.donorRuleEvaluation.violations.length;
    if (assessment.status === "blocked" || exceptionCount >= 3) return "high";
    if (assessment.status === "non_compliant" || exceptionCount > 0) return "medium";
    return "low";
  }

  private impact(assessment: ComplianceAssessment): GovernanceRiskMatrixResult["impact"] {
    if (assessment.status === "blocked" || assessment.policyEvaluation.exceptions.some((exception) => exception.severity === "critical")) return "high";
    if (assessment.status === "non_compliant" || assessment.donorRuleEvaluation.violations.some((violation) => violation.severity === "high")) return "medium";
    return "low";
  }

  private priority(likelihood: GovernanceRiskMatrixResult["likelihood"], impact: GovernanceRiskMatrixResult["impact"]): GovernanceRiskMatrixResult["priority"] {
    if (likelihood === "high" && impact === "high") return "urgent";
    if (likelihood === "high" || impact === "high") return "high";
    if (likelihood === "medium" || impact === "medium") return "medium";
    return "low";
  }

  private mitigation(likelihood: GovernanceRiskMatrixResult["likelihood"], impact: GovernanceRiskMatrixResult["impact"]): string {
    if (likelihood === "high" && impact === "high") return "Pause approval, assign exception owner, and require audit review.";
    if (impact === "high") return "Require senior approval and document mitigation before execution.";
    if (likelihood === "medium" || impact === "medium") return "Resolve exceptions or document compensating controls.";
    return "Continue standard monitoring.";
  }
}
