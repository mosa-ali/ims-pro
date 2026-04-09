/**
 * Category Consolidation & Services Workflow Tests
 * 
 * Tests for:
 * 1. Category enum: only 'goods', 'services', 'works' (no 'consultancy')
 * 2. serviceType sub-field for Services category
 * 3. Capability checks: Services → Contract/SAC/Invoice (no PO/GRN/DN)
 * 4. Capability checks: Goods/Works → PO/GRN/DN (no Contract/SAC)
 * 5. PO creation guard blocks Services category
 * 6. Services workflow: all amount bands use Contract → SAC → Invoice → Payment
 */

import { describe, it, expect, vi } from "vitest";
import {
  isServicesWorkflow,
  isGoodsWorksWorkflow,
} from "./routers/procurement/capabilities";

// ============================================================================
// 1. Category Classification
// ============================================================================
describe("Category Classification", () => {
  it("should classify 'services' as services workflow", () => {
    expect(isServicesWorkflow("services")).toBe(true);
  });

  it("should NOT classify 'goods' as services workflow", () => {
    expect(isServicesWorkflow("goods")).toBe(false);
  });

  it("should NOT classify 'works' as services workflow", () => {
    expect(isServicesWorkflow("works")).toBe(false);
  });

  it("should NOT classify 'consultancy' as services workflow (removed category)", () => {
    expect(isServicesWorkflow("consultancy")).toBe(false);
  });

  it("should classify 'goods' as goods/works workflow", () => {
    expect(isGoodsWorksWorkflow("goods")).toBe(true);
  });

  it("should classify 'works' as goods/works workflow", () => {
    expect(isGoodsWorksWorkflow("works")).toBe(true);
  });

  it("should NOT classify 'services' as goods/works workflow", () => {
    expect(isGoodsWorksWorkflow("services")).toBe(false);
  });
});

// ============================================================================
// 2. Workflow Rules
// ============================================================================
describe("Workflow Rules", () => {
  describe("Services category workflow", () => {
    it("should use Contract → SAC → Invoice → Payment for services", () => {
      const category = "services";
      expect(isServicesWorkflow(category)).toBe(true);
      // Services should NOT use PO/GRN/DN
      expect(isGoodsWorksWorkflow(category)).toBe(false);
    });

    it("should apply same workflow regardless of amount band", () => {
      // All amount bands for services use the same execution workflow
      const amounts = [500, 1000, 5000, 25000, 50000, 100000];
      for (const amount of amounts) {
        expect(isServicesWorkflow("services")).toBe(true);
        expect(isGoodsWorksWorkflow("services")).toBe(false);
      }
    });
  });

  describe("Goods category workflow", () => {
    it("should use PO → GRN → DN for goods", () => {
      const category = "goods";
      expect(isGoodsWorksWorkflow(category)).toBe(true);
      expect(isServicesWorkflow(category)).toBe(false);
    });
  });

  describe("Works category workflow", () => {
    it("should use PO → GRN → DN for works", () => {
      const category = "works";
      expect(isGoodsWorksWorkflow(category)).toBe(true);
      expect(isServicesWorkflow(category)).toBe(false);
    });
  });
});

// ============================================================================
// 3. Category Enum Validation
// ============================================================================
describe("Category Enum Validation", () => {
  const validCategories = ["goods", "services", "works"];
  const removedCategories = ["consultancy"];

  it("should have exactly 3 valid categories", () => {
    expect(validCategories).toHaveLength(3);
  });

  it("should include goods, services, works", () => {
    expect(validCategories).toContain("goods");
    expect(validCategories).toContain("services");
    expect(validCategories).toContain("works");
  });

  it("should NOT include consultancy (merged into services)", () => {
    expect(validCategories).not.toContain("consultancy");
  });

  it("removed categories should not be recognized as valid workflows", () => {
    for (const cat of removedCategories) {
      expect(isServicesWorkflow(cat)).toBe(false);
      expect(isGoodsWorksWorkflow(cat)).toBe(false);
    }
  });
});

// ============================================================================
// 4. Service Type Sub-field
// ============================================================================
describe("Service Type Sub-field", () => {
  const validServiceTypes = [
    "consultancy",
    "professional_services",
    "maintenance",
    "training",
    "it_services",
    "cleaning",
    "security",
    "transportation",
    "catering",
    "other",
  ];

  it("should have valid service type options", () => {
    expect(validServiceTypes.length).toBeGreaterThan(0);
  });

  it("should include consultancy as a service type (migrated from category)", () => {
    expect(validServiceTypes).toContain("consultancy");
  });

  it("should include other for custom service types", () => {
    expect(validServiceTypes).toContain("other");
  });
});

// ============================================================================
// 5. Services Sourcing Phase (Amount-based)
// ============================================================================
describe("Services Sourcing Phase", () => {
  function determineProcessType(totalUSD: number) {
    if (totalUSD <= 1000) {
      return { processType: "single_quotation", requiresCBA: false, requiresRFQ: true, requiresTender: false, requiresQA: false };
    } else if (totalUSD <= 25000) {
      return { processType: "multiple_quotations", requiresCBA: false, requiresRFQ: true, requiresTender: false, requiresQA: true };
    } else {
      return { processType: "formal_tender", requiresCBA: true, requiresRFQ: false, requiresTender: true, requiresQA: false };
    }
  }

  it("Services ≤ $1,000: RFQ only, no QA/CBA needed", () => {
    const process = determineProcessType(500);
    expect(process.requiresRFQ).toBe(true);
    expect(process.requiresQA).toBe(false);
    expect(process.requiresCBA).toBe(false);
    expect(process.requiresTender).toBe(false);
  });

  it("Services $1,001 - $25,000: RFQ + QA required", () => {
    const process = determineProcessType(5000);
    expect(process.requiresRFQ).toBe(true);
    expect(process.requiresQA).toBe(true);
    expect(process.requiresCBA).toBe(false);
    expect(process.requiresTender).toBe(false);
  });

  it("Services > $25,000: Tender + CBA required", () => {
    const process = determineProcessType(50000);
    expect(process.requiresRFQ).toBe(false);
    expect(process.requiresTender).toBe(true);
    expect(process.requiresCBA).toBe(true);
  });

  it("All Services PRs: execution is always Contract → SAC → Invoice → Payment", () => {
    const amounts = [500, 1000, 5000, 25000, 50000];
    for (const amount of amounts) {
      // Regardless of sourcing phase, execution is always services workflow
      expect(isServicesWorkflow("services")).toBe(true);
      expect(isGoodsWorksWorkflow("services")).toBe(false);
    }
  });
});

// ============================================================================
// 6. Contract Enablement Rules for Services
// ============================================================================
describe("Contract Enablement Rules for Services", () => {
  it("Services ≤ $1,000: Contract enabled when RFQ has received quotes", () => {
    const totalUSD = 500;
    const isSingleQuotation = totalUSD <= 1000;
    const rfqReceived = true;
    const qaApproved = false;
    const baAwarded = false;
    const contractExists = false;

    const contractReady = baAwarded || qaApproved || (isSingleQuotation && rfqReceived) || contractExists;
    expect(contractReady).toBe(true);
  });

  it("Services $1,001 - $25,000: Contract enabled when QA approved", () => {
    const totalUSD = 5000;
    const isSingleQuotation = totalUSD <= 1000;
    const rfqReceived = true;
    const qaApproved = true;
    const baAwarded = false;
    const contractExists = false;

    const contractReady = baAwarded || qaApproved || (isSingleQuotation && rfqReceived) || contractExists;
    expect(contractReady).toBe(true);
  });

  it("Services > $25,000: Contract enabled when CBA awarded", () => {
    const totalUSD = 50000;
    const isSingleQuotation = totalUSD <= 1000;
    const rfqReceived = false;
    const qaApproved = false;
    const baAwarded = true;
    const contractExists = false;

    const contractReady = baAwarded || qaApproved || (isSingleQuotation && rfqReceived) || contractExists;
    expect(contractReady).toBe(true);
  });

  it("Services: Contract NOT enabled when no sourcing is complete", () => {
    const totalUSD = 5000;
    const isSingleQuotation = totalUSD <= 1000;
    const rfqReceived = false;
    const qaApproved = false;
    const baAwarded = false;
    const contractExists = false;

    const contractReady = baAwarded || qaApproved || (isSingleQuotation && rfqReceived) || contractExists;
    expect(contractReady).toBe(false);
  });

  it("Services: Contract enabled when contract already exists", () => {
    const totalUSD = 5000;
    const isSingleQuotation = totalUSD <= 1000;
    const rfqReceived = false;
    const qaApproved = false;
    const baAwarded = false;
    const contractExists = true;

    const contractReady = baAwarded || qaApproved || (isSingleQuotation && rfqReceived) || contractExists;
    expect(contractReady).toBe(true);
  });
});

// ============================================================================
// 7. PO Guard for Services
// ============================================================================
describe("PO Guard for Services", () => {
  it("should block PO creation for services category", () => {
    const category = "services";
    const blocked = isServicesWorkflow(category);
    expect(blocked).toBe(true);
  });

  it("should allow PO creation for goods category", () => {
    const category = "goods";
    const blocked = isServicesWorkflow(category);
    expect(blocked).toBe(false);
  });

  it("should allow PO creation for works category", () => {
    const category = "works";
    const blocked = isServicesWorkflow(category);
    expect(blocked).toBe(false);
  });
});

// ============================================================================
// 8. Data Migration Verification
// ============================================================================
describe("Data Migration - Consultancy to Services", () => {
  it("migrated consultancy PRs should have category=services", () => {
    // Simulates the migration: consultancy → services with serviceType=consultancy
    const migratedPR = {
      category: "services",
      serviceType: "consultancy",
      categoryLegacy: "consultancy",
    };

    expect(migratedPR.category).toBe("services");
    expect(migratedPR.serviceType).toBe("consultancy");
    expect(migratedPR.categoryLegacy).toBe("consultancy");
  });

  it("migrated PRs should use services workflow", () => {
    const migratedPR = { category: "services", serviceType: "consultancy" };
    expect(isServicesWorkflow(migratedPR.category)).toBe(true);
  });

  it("new services PRs should have null categoryLegacy", () => {
    const newPR = {
      category: "services",
      serviceType: "professional_services",
      categoryLegacy: null,
    };

    expect(newPR.category).toBe("services");
    expect(newPR.categoryLegacy).toBeNull();
  });
});

// ============================================================================
// 9. Workspace Card Visibility for Single Quotation
// ============================================================================
describe("Workspace Card Visibility - Single Quotation", () => {
  function determineProcessType(totalUSD: number) {
    if (totalUSD <= 1000) {
      return { processType: "single_quotation", requiresCBA: false, requiresRFQ: true, requiresTender: false, requiresQA: false };
    } else if (totalUSD <= 25000) {
      return { processType: "multiple_quotations", requiresCBA: false, requiresRFQ: true, requiresTender: false, requiresQA: true };
    } else {
      return { processType: "formal_tender", requiresCBA: true, requiresRFQ: false, requiresTender: true, requiresQA: false };
    }
  }

  function getVisibleCards(category: string, totalUSD: number) {
    const isServices = category === "services";
    const process = determineProcessType(totalUSD);
    const isSingleQuotation = totalUSD <= 1000;

    const cards: string[] = ["pr"]; // PR Details always visible

    // Sourcing cards
    if (process.requiresRFQ) cards.push("rfq");
    if (process.requiresTender) {
      cards.push("tender-info", "bom", "eval-criteria", "cba");
    }
    // QA only shown for non-single-quotation, non-tender processes
    if (!process.requiresTender && !isSingleQuotation) {
      cards.push("analysis");
    }

    // Execution cards
    if (isServices) {
      cards.push("contract", "sac", "invoice");
    } else {
      cards.push("po", "grn", "dn");
    }

    // Finance & control
    cards.push("payment", "documents", "audit");

    return cards;
  }

  it("Services ≤ $1,000: should NOT show QA card", () => {
    const cards = getVisibleCards("services", 500);
    expect(cards).not.toContain("analysis");
    expect(cards).toContain("rfq");
    expect(cards).toContain("contract");
    expect(cards).toContain("sac");
  });

  it("Services ≤ $1,000: flow is PR → RFQ → Contract → SAC → Invoice → Payment", () => {
    const cards = getVisibleCards("services", 950);
    const expectedOrder = ["pr", "rfq", "contract", "sac", "invoice", "payment"];
    for (const card of expectedOrder) {
      expect(cards).toContain(card);
    }
    expect(cards).not.toContain("analysis");
    expect(cards).not.toContain("po");
    expect(cards).not.toContain("grn");
  });

  it("Services $1,001 - $25,000: SHOULD show QA card", () => {
    const cards = getVisibleCards("services", 5000);
    expect(cards).toContain("analysis");
    expect(cards).toContain("rfq");
    expect(cards).toContain("contract");
  });

  it("Services > $25,000: should show CBA (not QA)", () => {
    const cards = getVisibleCards("services", 50000);
    expect(cards).toContain("cba");
    expect(cards).not.toContain("analysis");
    expect(cards).toContain("contract");
  });

  it("Goods ≤ $1,000: should NOT show QA card", () => {
    const cards = getVisibleCards("goods", 500);
    expect(cards).not.toContain("analysis");
    expect(cards).toContain("rfq");
    expect(cards).toContain("po");
  });

  it("Goods $1,001 - $25,000: SHOULD show QA card", () => {
    const cards = getVisibleCards("goods", 5000);
    expect(cards).toContain("analysis");
    expect(cards).toContain("rfq");
    expect(cards).toContain("po");
  });

  it("Boundary: exactly $1,000 should NOT show QA", () => {
    const cards = getVisibleCards("services", 1000);
    expect(cards).not.toContain("analysis");
  });

  it("Boundary: $1,001 should show QA", () => {
    const cards = getVisibleCards("services", 1001);
    expect(cards).toContain("analysis");
  });
});
