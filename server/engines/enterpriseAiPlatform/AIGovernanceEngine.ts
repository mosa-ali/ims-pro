import {
  AIGovernancePolicy,
  AIOperatingModel,
  AIRequest,
  ApprovalDecision,
  HumanApprovalRequirement,
} from "./EnterpriseAITypes";

export interface GovernanceReview {
  allowed: boolean;
  approvalRequirement: HumanApprovalRequirement;
  policyIds: string[];
  reasons: string[];
}

export class AIGovernanceEngine {
  constructor(
    private readonly operatingModel: AIOperatingModel = defaultAIOperatingModel,
    private readonly policies: AIGovernancePolicy[] = defaultAIGovernancePolicies,
  ) {}

  getOperatingModel(): AIOperatingModel {
    return this.operatingModel;
  }

  reviewRequest(request: AIRequest, toolRisk: "low" | "medium" | "high" | "critical" = "low"): GovernanceReview {
    const baselinePolicies = this.policies.filter((policy) => policy.riskLevel === "low");
    const riskPolicy = this.policies.find((policy) => policy.riskLevel === toolRisk);
    const policies = [...new Map([...baselinePolicies, riskPolicy].filter(Boolean).map((policy) => [policy!.id, policy!])).values()];
    const blockedByRole = !this.operatingModel.aiUserRoles.includes(request.scope.userRole) &&
      !this.operatingModel.overrideRoles.includes(request.scope.userRole);
    const blockedByRiskRole = Boolean(riskPolicy) &&
      !riskPolicy!.allowedRoles.includes("*") &&
      !riskPolicy!.allowedRoles.includes(request.scope.userRole) &&
      !this.operatingModel.overrideRoles.includes(request.scope.userRole);
    const approvalRequirement = this.highestApprovalRequirement(policies.map((policy) => policy.humanApprovalRequirement));

    return {
      allowed: !blockedByRole && !blockedByRiskRole && approvalRequirement !== "blocked",
      approvalRequirement: blockedByRole || blockedByRiskRole ? "blocked" : approvalRequirement,
      policyIds: policies.map((policy) => policy.id),
      reasons: [
        ...(blockedByRole ? [`Role ${request.scope.userRole} is not allowed to use AI.`] : []),
        ...(blockedByRiskRole ? [`Role ${request.scope.userRole} is not allowed for ${toolRisk} AI actions.`] : []),
        ...(approvalRequirement === "required" ? ["Human approval required by AI governance policy."] : []),
      ],
    };
  }

  approveArtifact(input: {
    artifactId: string;
    artifactType: string;
    approverRole: string;
    decision: ApprovalDecision;
  }): { accepted: boolean; message: string } {
    const allowedRoles = input.artifactType === "prompt"
      ? this.operatingModel.promptApprovers
      : input.artifactType === "tool"
        ? this.operatingModel.toolApprovers
        : this.operatingModel.agentApprovers;

    if (!allowedRoles.includes(input.approverRole)) {
      return {
        accepted: false,
        message: `${input.approverRole} cannot approve ${input.artifactType}.`,
      };
    }

    return {
      accepted: input.decision === "approved",
      message: `${input.artifactType} ${input.artifactId} ${input.decision} by ${input.approverRole}.`,
    };
  }

  private highestApprovalRequirement(requirements: HumanApprovalRequirement[]): HumanApprovalRequirement {
    const rank: Record<HumanApprovalRequirement, number> = {
      none: 0,
      recommended: 1,
      required: 2,
      blocked: 3,
    };
    return requirements.sort((a, b) => rank[b] - rank[a])[0] ?? "none";
  }
}

export const defaultAIOperatingModel: AIOperatingModel = {
  promptCreators: ["AI Product Owner", "Finance Director", "Domain Lead"],
  promptApprovers: ["AI Governance Lead", "Security Officer"],
  agentApprovers: ["AI Governance Lead", "CIO", "Business Owner"],
  toolApprovers: ["Security Officer", "Data Protection Officer", "AI Governance Lead"],
  aiUserRoles: ["Finance Director", "Treasury Manager", "Grant Manager", "Country Director", "Executive Director", "AI Analyst"],
  overrideRoles: ["AI Governance Lead", "Executive Director"],
  modelUpdateApprovers: ["AI Governance Lead", "Security Officer"],
  costManagers: ["CFO", "Finance Director", "AI Platform Owner"],
  qualityOwners: ["AI Governance Lead", "Business Owner"],
  hallucinationTrackingOwner: "AI Governance Lead",
  promptVersioningPolicy: "Every prompt requires semantic versioning, approval, test evidence, rollback notes, and change owner.",
  qualityMeasurementPolicy: "AI quality is measured through evaluations, user feedback, hallucination reports, override rates, and business outcome checks.",
};

export const defaultAIGovernancePolicies: AIGovernancePolicy[] = [
  {
    id: "ai-policy-standard",
    name: "Standard AI usage",
    riskLevel: "low",
    humanApprovalRequirement: "none",
    allowedRoles: ["*"],
    blockedDataClasses: ["secret", "credential"],
    auditRequired: true,
    evaluationRequired: true,
  },
  {
    id: "ai-policy-high-risk-tools",
    name: "High risk tool usage",
    riskLevel: "high",
    humanApprovalRequirement: "required",
    allowedRoles: ["AI Governance Lead", "Finance Director", "Country Director", "Executive Director"],
    blockedDataClasses: ["secret", "credential", "unredacted_pii"],
    auditRequired: true,
    evaluationRequired: true,
  },
  {
    id: "ai-policy-critical",
    name: "Critical autonomous action block",
    riskLevel: "critical",
    humanApprovalRequirement: "blocked",
    allowedRoles: ["AI Governance Lead"],
    blockedDataClasses: ["secret", "credential", "unredacted_pii"],
    auditRequired: true,
    evaluationRequired: true,
  },
];
