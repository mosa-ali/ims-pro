import {
  DonorPolicyPack,
  GovernanceException,
  GovernanceMonitoringItem,
  GovernanceTransaction,
} from "./GovernanceTypes";

export class ContinuousComplianceMonitor {
  scan(input: {
    transactions: GovernanceTransaction[];
    exceptions: GovernanceException[];
    donorPacks: DonorPolicyPack[];
    now?: string;
  }): GovernanceMonitoringItem[] {
    const now = new Date(input.now ?? new Date().toISOString());
    return [
      ...this.scanDonorPacks(input.donorPacks, now),
      ...this.scanTransactions(input.transactions, now),
      ...this.scanExceptions(input.exceptions, now),
    ];
  }

  private scanDonorPacks(packs: DonorPolicyPack[], now: Date): GovernanceMonitoringItem[] {
    return packs.flatMap((pack) => pack.rules
      .filter((rule) => rule.spendingEndDate && new Date(rule.spendingEndDate) < now)
      .map((rule) => ({
        id: `monitor-expired-donor-rule-${rule.id}`,
        type: "new_donor_rule" as const,
        status: "warning" as const,
        severity: "warning" as const,
        message: `${pack.donorName} rule ${rule.name} has an expired spending date.`,
        ownerRole: "Grant Manager",
        detectedAt: now.toISOString(),
      })));
  }

  private scanTransactions(transactions: GovernanceTransaction[], now: Date): GovernanceMonitoringItem[] {
    return transactions.flatMap((transaction) => {
      const items: GovernanceMonitoringItem[] = [];
      if ((transaction.documents ?? []).length === 0) {
        items.push({
          id: `monitor-missing-document-${transaction.id}`,
          type: "missing_document",
          status: "warning",
          severity: "warning",
          message: `Transaction ${transaction.id} has no supporting documents.`,
          ownerRole: "Compliance Officer",
          detectedAt: now.toISOString(),
        });
      }
      if (transaction.grantId && transaction.metadata?.grantEndDate && new Date(String(transaction.metadata.grantEndDate)) < now) {
        items.push({
          id: `monitor-expired-grant-${transaction.grantId}`,
          type: "expired_grant",
          status: "non_compliant",
          severity: "high",
          message: `Grant ${transaction.grantId} is expired but still has activity.`,
          ownerRole: "Grant Manager",
          detectedAt: now.toISOString(),
        });
      }
      return items;
    });
  }

  private scanExceptions(exceptions: GovernanceException[], now: Date): GovernanceMonitoringItem[] {
    return exceptions
      .filter((exception) => ["detected", "assigned", "investigating", "mitigated"].includes(exception.status))
      .filter((exception) => new Date(exception.dueDate) < now)
      .map((exception) => ({
        id: `monitor-overdue-exception-${exception.id}`,
        type: "overdue_exception" as const,
        status: "non_compliant" as const,
        severity: exception.severity === "critical" ? "critical" as const : "high" as const,
        message: `Exception ${exception.title} is overdue.`,
        ownerRole: exception.ownerRole,
        detectedAt: now.toISOString(),
      }));
  }
}
