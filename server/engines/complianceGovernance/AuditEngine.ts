import {
  AuditAutomationResult,
  AuditRecord,
  ComplianceAssessment,
  GovernanceException,
  GovernanceScope,
  GovernanceTransaction,
} from "./GovernanceTypes";

export class AuditEngine {
  private readonly auditTrail: AuditRecord[] = [];

  record(scope: GovernanceScope, transaction: GovernanceTransaction, action: string, details: Record<string, unknown>, severity: AuditRecord["severity"] = "info"): AuditRecord {
    const record: AuditRecord = {
      id: `audit-${transaction.id}-${this.auditTrail.length + 1}`,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId ?? null,
      entityId: transaction.id,
      entityType: transaction.entityType,
      action,
      actorUserId: scope.userId,
      timestamp: new Date().toISOString(),
      severity,
      details,
    };
    this.auditTrail.push(record);
    return record;
  }

  automateAuditReview(scope: GovernanceScope, transaction: GovernanceTransaction, assessment: ComplianceAssessment): AuditAutomationResult {
    const findings: GovernanceException[] = [
      ...assessment.policyEvaluation.exceptions,
      ...assessment.donorRuleEvaluation.violations.map((violation) => ({
        id: `audit-finding-${violation.ruleId}-${transaction.id}`,
        entityId: transaction.id,
        entityType: transaction.entityType,
        severity: violation.severity,
        status: "detected" as const,
        title: violation.ruleName,
        description: violation.message,
        ownerRole: violation.severity === "critical" ? "Compliance Director" : "Compliance Officer",
        dueDate: this.dueDateForSeverity(violation.severity),
        lifecycleHistory: [
          {
            status: "detected" as const,
            changedAt: new Date().toISOString(),
            changedByRole: "AuditEngine",
            note: "Detected during automated governance review.",
          },
        ],
      })),
    ];

    const auditRecord = this.record(
      scope,
      transaction,
      "automated_governance_review",
      {
        status: assessment.status,
        score: assessment.score,
        findings: findings.length,
        appliedPolicyIds: assessment.policyEvaluation.appliedPolicyIds,
        donorId: transaction.donorId,
        grantId: transaction.grantId,
        projectId: transaction.projectId,
        budgetLineId: transaction.budgetLineId,
      },
      findings.some((finding) => finding.severity === "critical") ? "critical" : findings.length > 0 ? "warning" : "info",
    );

    return {
      auditId: auditRecord.id,
      status: assessment.status,
      findings,
      auditTrail: this.getAuditTrail(transaction.id),
    };
  }

  monitorExceptions(exceptions: GovernanceException[]): GovernanceException[] {
    const now = Date.now();
    return exceptions
      .filter((exception) => ["detected", "assigned", "investigating", "mitigated"].includes(exception.status))
      .map((exception) => ({
        ...exception,
        severity: new Date(exception.dueDate).getTime() < now && exception.severity !== "critical" ? "high" : exception.severity,
      }));
  }

  getAuditTrail(entityId: string): AuditRecord[] {
    return this.auditTrail.filter((record) => record.entityId === entityId);
  }

  private dueDateForSeverity(severity: GovernanceException["severity"]): string {
    const dueDate = new Date();
    const days = severity === "critical" ? 1 : severity === "high" ? 3 : 7;
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString();
  }
}
