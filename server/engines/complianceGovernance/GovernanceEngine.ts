import { AuditEngine } from "./AuditEngine";
import { ContinuousComplianceMonitor } from "./ContinuousComplianceMonitor";
import { ControlsFrameworkEngine } from "./ControlsFrameworkEngine";
import { DonorPolicyPackEngine } from "./DonorPolicyPackEngine";
import { EnhancedComplianceEngine } from "./EnhancedComplianceEngine";
import { GovernanceAIAdvisorEngine } from "./GovernanceAIAdvisorEngine";
import { EnterpriseGovernanceDashboard, GovernanceDashboardEngine } from "./GovernanceDashboardEngine";
import { GovernanceKnowledgeBaseEngine } from "./GovernanceKnowledgeBaseEngine";
import { GovernanceRiskMatrixEngine } from "./GovernanceRiskMatrixEngine";
import { GovernanceSimulationEngine } from "./GovernanceSimulationEngine";
import { PolicyEngine } from "./PolicyEngine";
import { RuleEngine } from "./RuleEngine";
import { WorkflowEngine } from "./WorkflowEngine";
import {
  DonorRule,
  GovernanceMonitoringItem,
  GovernanceReviewResult,
  GovernanceScope,
  GovernanceSimulationResult,
  GovernanceStatus,
  GovernanceTransaction,
} from "./GovernanceTypes";

export class GovernanceEngine {
  readonly ruleEngine: RuleEngine;
  readonly policyEngine: PolicyEngine;
  readonly complianceEngine: EnhancedComplianceEngine;
  readonly auditEngine: AuditEngine;
  readonly workflowEngine: WorkflowEngine;
  readonly controlsFrameworkEngine: ControlsFrameworkEngine;
  readonly knowledgeBaseEngine: GovernanceKnowledgeBaseEngine;
  readonly donorPolicyPackEngine: DonorPolicyPackEngine;
  readonly riskMatrixEngine: GovernanceRiskMatrixEngine;
  readonly simulationEngine: GovernanceSimulationEngine;
  readonly continuousMonitor: ContinuousComplianceMonitor;
  readonly dashboardEngine: GovernanceDashboardEngine;
  readonly aiAdvisorEngine: GovernanceAIAdvisorEngine;

  constructor(input: {
    ruleEngine?: RuleEngine;
    policyEngine?: PolicyEngine;
    complianceEngine?: EnhancedComplianceEngine;
    auditEngine?: AuditEngine;
    workflowEngine?: WorkflowEngine;
    controlsFrameworkEngine?: ControlsFrameworkEngine;
    knowledgeBaseEngine?: GovernanceKnowledgeBaseEngine;
    donorPolicyPackEngine?: DonorPolicyPackEngine;
    riskMatrixEngine?: GovernanceRiskMatrixEngine;
    simulationEngine?: GovernanceSimulationEngine;
    continuousMonitor?: ContinuousComplianceMonitor;
    dashboardEngine?: GovernanceDashboardEngine;
    aiAdvisorEngine?: GovernanceAIAdvisorEngine;
  } = {}) {
    this.ruleEngine = input.ruleEngine ?? new RuleEngine();
    this.policyEngine = input.policyEngine ?? new PolicyEngine();
    this.complianceEngine = input.complianceEngine ?? new EnhancedComplianceEngine(this.ruleEngine, this.policyEngine);
    this.auditEngine = input.auditEngine ?? new AuditEngine();
    this.workflowEngine = input.workflowEngine ?? new WorkflowEngine();
    this.controlsFrameworkEngine = input.controlsFrameworkEngine ?? new ControlsFrameworkEngine();
    this.knowledgeBaseEngine = input.knowledgeBaseEngine ?? new GovernanceKnowledgeBaseEngine();
    this.donorPolicyPackEngine = input.donorPolicyPackEngine ?? new DonorPolicyPackEngine();
    this.riskMatrixEngine = input.riskMatrixEngine ?? new GovernanceRiskMatrixEngine();
    this.simulationEngine = input.simulationEngine ?? new GovernanceSimulationEngine(this.complianceEngine, this.riskMatrixEngine);
    this.continuousMonitor = input.continuousMonitor ?? new ContinuousComplianceMonitor();
    this.dashboardEngine = input.dashboardEngine ?? new GovernanceDashboardEngine();
    this.aiAdvisorEngine = input.aiAdvisorEngine ?? new GovernanceAIAdvisorEngine();
  }

  reviewTransaction(scope: GovernanceScope, transaction: GovernanceTransaction, donorRules: DonorRule[] = []): GovernanceReviewResult {
    const effectiveDonorRules = [
      ...this.donorPolicyPackEngine.getRulesForDonor(transaction.donorId ?? ""),
      ...donorRules,
    ];
    const evidence = this.knowledgeBaseEngine.retrieveEvidence(transaction, effectiveDonorRules.map((rule) => rule.sourceRef ?? rule.name));
    const assessment = this.complianceEngine.assessTransaction(scope, transaction, effectiveDonorRules);
    assessment.evidenceRefs = evidence.map((entry) => entry.sourceRef);
    assessment.controlEvaluations = this.controlsFrameworkEngine.evaluateControls(transaction, assessment);
    const audit = this.auditEngine.automateAuditReview(scope, transaction, assessment);
    const exceptions = this.auditEngine.monitorExceptions(audit.findings);
    const workflow = this.workflowEngine.buildWorkflow(transaction, {
      ...assessment,
      policyEvaluation: {
        ...assessment.policyEvaluation,
        exceptions,
      },
    });

    const reviewResult: GovernanceReviewResult = {
      assessment,
      audit,
      workflow,
      exceptions,
    };

    return {
      ...reviewResult,
      aiAdvice: this.aiAdvisorEngine.explain(reviewResult, transaction, evidence),
    };
  }

  buildGovernanceDashboard(results: GovernanceReviewResult[]): EnterpriseGovernanceDashboard & {
    openExceptions: number;
    criticalExceptions: number;
    workflowsByStatus: Record<string, number>;
  } {
    const dashboard = this.dashboardEngine.buildDashboard(results);
    const totalReviewed = results.length;
    const averageScore = totalReviewed === 0
      ? 100
      : Math.round(results.reduce((sum, result) => sum + result.assessment.score, 0) / totalReviewed);
    const allExceptions = results.flatMap((result) => result.exceptions);

    return {
      ...dashboard,
      totalReviewed,
      overallStatus: this.overallStatus(results.map((result) => result.assessment.status), averageScore),
      averageScore,
      openExceptions: allExceptions.filter((exception) => ["detected", "assigned", "investigating", "mitigated"].includes(exception.status)).length,
      criticalExceptions: allExceptions.filter((exception) => exception.severity === "critical").length,
      workflowsByStatus: results.reduce<Record<string, number>>((summary, result) => {
        summary[result.workflow.status] = (summary[result.workflow.status] ?? 0) + 1;
        return summary;
      }, {}),
    };
  }

  simulateBeforeApproval(input: {
    scope: GovernanceScope;
    transaction: GovernanceTransaction;
    changes: Partial<GovernanceTransaction>;
    donorRules?: DonorRule[];
  }): GovernanceSimulationResult {
    const donorRules = [
      ...this.donorPolicyPackEngine.getRulesForDonor(input.transaction.donorId ?? ""),
      ...(input.donorRules ?? []),
    ];
    return this.simulationEngine.simulateTransactionChange({
      ...input,
      donorRules,
    });
  }

  runContinuousMonitoring(input: {
    transactions: GovernanceTransaction[];
    results: GovernanceReviewResult[];
    now?: string;
  }): GovernanceMonitoringItem[] {
    return this.continuousMonitor.scan({
      transactions: input.transactions,
      exceptions: input.results.flatMap((result) => result.exceptions),
      donorPacks: this.donorPolicyPackEngine.listPacks(),
      now: input.now,
    });
  }

  private overallStatus(statuses: GovernanceStatus[], averageScore: number): GovernanceStatus {
    if (statuses.includes("blocked")) return "blocked";
    if (statuses.includes("non_compliant")) return "non_compliant";
    if (statuses.includes("warning") || averageScore < 85) return "warning";
    return "compliant";
  }
}
