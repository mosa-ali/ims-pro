import { GovernanceTransaction, KnowledgeBaseEntry } from "./GovernanceTypes";

export class GovernanceKnowledgeBaseEngine {
  private readonly entries = new Map<string, KnowledgeBaseEntry>();

  constructor(entries: KnowledgeBaseEntry[] = defaultGovernanceKnowledgeBase) {
    entries.forEach((entry) => this.registerEntry(entry));
  }

  registerEntry(entry: KnowledgeBaseEntry): KnowledgeBaseEntry {
    this.entries.set(entry.id, entry);
    return entry;
  }

  retrieveEvidence(transaction: GovernanceTransaction, queryTerms: string[] = []): KnowledgeBaseEntry[] {
    const terms = [
      transaction.donorId,
      transaction.entityType,
      transaction.costCategory,
      transaction.countryCode,
      ...queryTerms,
    ].filter((term): term is string => Boolean(term)).map((term) => term.toLowerCase());

    return [...this.entries.values()]
      .map((entry) => ({
        entry,
        score: terms.reduce((sum, term) => {
          const haystack = `${entry.title} ${entry.summary} ${entry.tags.join(" ")}`.toLowerCase();
          return sum + (haystack.includes(term) ? 1 : 0);
        }, 0),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.entry);
  }
}

export const defaultGovernanceKnowledgeBase: KnowledgeBaseEntry[] = [
  {
    id: "kb-finance-manual-documents",
    sourceType: "finance_manual",
    title: "Supporting Document Requirements",
    summary: "Payments require invoice, approval evidence, and delivery confirmation where goods or services were received.",
    sourceRef: "Finance Manual 4.2",
    effectiveDate: "2026-07-02",
    tags: ["payment", "documents", "invoice", "approval"],
  },
  {
    id: "kb-internal-policy-sod",
    sourceType: "internal_policy",
    title: "Segregation of Duties",
    summary: "Requester, preparer, reviewer, approver, and payer duties should be separated for controlled transactions.",
    sourceRef: "Internal Controls Policy 2.1",
    effectiveDate: "2026-07-02",
    tags: ["payment", "journal", "procurement", "sod"],
  },
  {
    id: "kb-donor-eu-eligible-costs",
    sourceType: "donor_rule",
    title: "EU Eligible Cost Categories",
    summary: "EU grants only allow eligible costs within approved categories, countries, grant dates, and documentation requirements.",
    sourceRef: "EU Grant Conditions Annex B",
    effectiveDate: "2026-07-02",
    tags: ["donor-eu", "training", "supplies", "eligible costs"],
  },
];
