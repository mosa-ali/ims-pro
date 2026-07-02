import { DonorPolicyPack, DonorRule } from "./GovernanceTypes";

export class DonorPolicyPackEngine {
  private readonly packs = new Map<string, DonorPolicyPack>();

  constructor(packs: DonorPolicyPack[] = defaultDonorPolicyPacks) {
    packs.forEach((pack) => this.registerPack(pack));
  }

  registerPack(pack: DonorPolicyPack): DonorPolicyPack {
    this.packs.set(pack.id, pack);
    return pack;
  }

  listPacks(): DonorPolicyPack[] {
    return [...this.packs.values()];
  }

  getRulesForDonor(donorId: string): DonorRule[] {
    return this.listPacks()
      .filter((pack) => pack.active && pack.donorId === donorId)
      .flatMap((pack) => pack.rules.map((rule) => ({
        ...rule,
        donorId: pack.donorId,
        policyPackId: pack.id,
      })));
  }
}

export const defaultDonorPolicyPacks: DonorPolicyPack[] = [
  {
    id: "donor-pack-eu-v1",
    donorId: "donor-eu",
    donorName: "European Union",
    version: "1.0.0",
    effectiveDate: "2026-07-02",
    active: true,
    reportingRequirements: ["Quarterly financial report", "Final expenditure report"],
    visibilityRequirements: ["EU visibility acknowledgement"],
    procurementThresholds: [
      { minAmount: 0, maxAmount: 5000, requirement: "Documented quotation" },
      { minAmount: 5000, maxAmount: 50000, requirement: "Competitive procurement file" },
    ],
    rules: [
      {
        id: "eu-eligible-costs-v1",
        donorId: "donor-eu",
        name: "EU Eligible Costs",
        active: true,
        allowedCostCategories: ["training", "supplies", "consultancy"],
        allowedCountryCodes: ["YE", "JO", "IT"],
        maxTransactionAmount: 50000,
        requiresSupportingDocuments: ["invoice", "approval"],
        spendingEndDate: "2026-12-31",
        severity: "high",
        sourceRef: "EU Grant Conditions Annex B",
      },
    ],
  },
  {
    id: "donor-pack-aics-v1",
    donorId: "donor-aics",
    donorName: "AICS",
    version: "1.0.0",
    effectiveDate: "2026-07-02",
    active: true,
    reportingRequirements: ["Narrative and financial report"],
    visibilityRequirements: ["AICS visibility rules"],
    procurementThresholds: [
      { minAmount: 0, maxAmount: 3000, requirement: "Simplified procurement evidence" },
      { minAmount: 3000, maxAmount: 25000, requirement: "Three quotations" },
    ],
    rules: [
      {
        id: "aics-documentation-v1",
        donorId: "donor-aics",
        name: "AICS Documentation",
        active: true,
        allowedCostCategories: ["training", "supplies", "staff", "travel"],
        requiresSupportingDocuments: ["invoice", "approval"],
        severity: "warning",
        sourceRef: "AICS Grant Manual",
      },
    ],
  },
];
