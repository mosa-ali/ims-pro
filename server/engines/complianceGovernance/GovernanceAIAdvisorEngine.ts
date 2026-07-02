import {
  GovernanceAIAdvice,
  GovernanceReviewResult,
  GovernanceTransaction,
  KnowledgeBaseEntry,
} from "./GovernanceTypes";

export class GovernanceAIAdvisorEngine {
  explain(result: GovernanceReviewResult, transaction: GovernanceTransaction, evidence: KnowledgeBaseEntry[]): GovernanceAIAdvice {
    const firstViolation = result.assessment.donorRuleEvaluation.violations[0];
    const firstException = result.exceptions[0];
    const evidenceRefs = evidence.map((entry) => entry.sourceRef);
    const summary = firstViolation
      ? `Transaction ${transaction.id} violates ${firstViolation.ruleName}: ${firstViolation.message}`
      : firstException
        ? `Transaction ${transaction.id} requires governance action: ${firstException.description}`
        : `Transaction ${transaction.id} is compliant based on current donor rules, policies, and controls.`;

    return {
      summary,
      evidenceRefs,
      recommendation: result.assessment.recommendations[0] ?? "Continue standard monitoring.",
      confidence: {
        ruleCoverage: result.assessment.donorRuleEvaluation.violations.length > 0 || transaction.donorId ? 0.9 : 0.72,
        policyCoverage: result.assessment.policyEvaluation.appliedPolicyIds.length > 0 ? 0.95 : 0.7,
        evidenceCompleteness: evidence.length >= 2 ? 0.88 : 0.65,
      },
    };
  }
}
