import { GovernanceReviewResult, GovernanceStatus } from "./GovernanceTypes";

export interface EnterpriseGovernanceDashboard {
  totalReviewed: number;
  overallStatus: GovernanceStatus;
  averageScore: number;
  complianceScoreTrend: Array<{ period: string; score: number }>;
  exceptionsByDonor: Record<string, number>;
  exceptionsByOperatingUnit: Record<string, number>;
  exceptionsByProject: Record<string, number>;
  exceptionAging: Record<"current" | "due_soon" | "overdue", number>;
  policyViolationsByType: Record<string, number>;
  sodHeatMap: Record<string, number>;
  outstandingApprovals: number;
  auditFindingsTrend: Array<{ period: string; findings: number }>;
}

export class GovernanceDashboardEngine {
  buildDashboard(results: GovernanceReviewResult[]): EnterpriseGovernanceDashboard {
    const averageScore = results.length === 0
      ? 100
      : Math.round(results.reduce((sum, result) => sum + result.assessment.score, 0) / results.length);
    const exceptions = results.flatMap((result) => result.exceptions);

    return {
      totalReviewed: results.length,
      overallStatus: this.overallStatus(results.map((result) => result.assessment.status), averageScore),
      averageScore,
      complianceScoreTrend: this.scoreTrend(results),
      exceptionsByDonor: this.groupByMetadata(results, "donorId"),
      exceptionsByOperatingUnit: results.reduce<Record<string, number>>((summary, result) => {
        const key = String(result.assessment.operatingUnitId ?? "all");
        summary[key] = (summary[key] ?? 0) + result.exceptions.length;
        return summary;
      }, {}),
      exceptionsByProject: this.groupByMetadata(results, "projectId"),
      exceptionAging: this.exceptionAging(exceptions),
      policyViolationsByType: exceptions.reduce<Record<string, number>>((summary, exception) => {
        summary[exception.title] = (summary[exception.title] ?? 0) + 1;
        return summary;
      }, {}),
      sodHeatMap: exceptions
        .filter((exception) => exception.title.toLowerCase().includes("segregation"))
        .reduce<Record<string, number>>((summary, exception) => {
          summary[exception.ownerRole] = (summary[exception.ownerRole] ?? 0) + 1;
          return summary;
        }, {}),
      outstandingApprovals: results.reduce((sum, result) => sum + result.workflow.steps.filter((step) => step.name.includes("Approval") && step.status === "pending").length, 0),
      auditFindingsTrend: this.auditTrend(results),
    };
  }

  private groupByMetadata(results: GovernanceReviewResult[], key: string): Record<string, number> {
    return results.reduce<Record<string, number>>((summary, result) => {
      const lastAudit = result.audit.auditTrail[result.audit.auditTrail.length - 1];
      const metadata = lastAudit?.details ?? {};
      const value = String(metadata[key] ?? "unknown");
      summary[value] = (summary[value] ?? 0) + result.exceptions.length;
      return summary;
    }, {});
  }

  private exceptionAging(exceptions: GovernanceReviewResult["exceptions"]): Record<"current" | "due_soon" | "overdue", number> {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return exceptions.reduce<Record<"current" | "due_soon" | "overdue", number>>((summary, exception) => {
      const dueTime = new Date(exception.dueDate).getTime();
      if (dueTime < now) summary.overdue += 1;
      else if (dueTime - now <= threeDays) summary.due_soon += 1;
      else summary.current += 1;
      return summary;
    }, { current: 0, due_soon: 0, overdue: 0 });
  }

  private scoreTrend(results: GovernanceReviewResult[]): Array<{ period: string; score: number }> {
    return results.map((result) => ({
      period: result.assessment.assessedAt.slice(0, 10),
      score: result.assessment.score,
    }));
  }

  private auditTrend(results: GovernanceReviewResult[]): Array<{ period: string; findings: number }> {
    return results.map((result) => ({
      period: result.audit.auditTrail[result.audit.auditTrail.length - 1]?.timestamp.slice(0, 10) ?? result.assessment.assessedAt.slice(0, 10),
      findings: result.audit.findings.length,
    }));
  }

  private overallStatus(statuses: GovernanceStatus[], averageScore: number): GovernanceStatus {
    if (statuses.includes("blocked")) return "blocked";
    if (statuses.includes("non_compliant")) return "non_compliant";
    if (statuses.includes("warning") || averageScore < 85) return "warning";
    return "compliant";
  }
}
