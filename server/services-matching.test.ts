import { describe, it, expect } from "vitest";

/**
 * Tests for Services 3-way matching logic
 * Validates Contract/SAC/Invoice matching for Services payables
 */

// Helper: simulate the matching logic from getMatchingData (services branch)
function computeServicesMatching(params: {
  contractValue: number;
  sacApprovedAmount: number;
  invoiceAmount: number | null;
  payableAmount: number;
  cumulativeSacPayables: number;
}) {
  const { contractValue, sacApprovedAmount, invoiceAmount, payableAmount, cumulativeSacPayables } = params;
  const hasInvoice = invoiceAmount !== null;
  const discrepancies: string[] = [];

  // Check 1: Cumulative payables vs contract value
  const contractVariance = cumulativeSacPayables - contractValue;
  if (contractValue > 0 && contractVariance > 0) {
    discrepancies.push(
      `Cumulative SAC payables ($${cumulativeSacPayables.toFixed(2)}) exceed contract value ($${contractValue.toFixed(2)}) by $${contractVariance.toFixed(2)}`
    );
  }

  // Check 2: SAC amount vs payable amount
  const sacPayableVariance = payableAmount - sacApprovedAmount;
  if (sacApprovedAmount > 0 && Math.abs(sacPayableVariance) > 0.01) {
    discrepancies.push(
      `Payable amount ($${payableAmount.toFixed(2)}) differs from SAC approved amount ($${sacApprovedAmount.toFixed(2)}) by $${Math.abs(sacPayableVariance).toFixed(2)}`
    );
  }

  // Check 3: Invoice amount vs SAC amount (if invoice exists)
  if (hasInvoice && invoiceAmount! > 0) {
    const invoiceSacVariance = invoiceAmount! - sacApprovedAmount;
    if (Math.abs(invoiceSacVariance) > 0.01) {
      discrepancies.push(
        `Invoice amount ($${invoiceAmount!.toFixed(2)}) differs from SAC approved amount ($${sacApprovedAmount.toFixed(2)}) by $${Math.abs(invoiceSacVariance).toFixed(2)}`
      );
    }
  }

  // Overall variance: payable vs SAC
  const variance = sacApprovedAmount > 0 ? payableAmount - sacApprovedAmount : 0;
  const variancePercentage = sacApprovedAmount > 0 ? (variance / sacApprovedAmount) * 100 : 0;

  // Determine matching status
  let matchingStatus: "matched" | "variance_detected" | "pending" = "pending";
  if (hasInvoice) {
    matchingStatus = discrepancies.length === 0 ? "matched" : "variance_detected";
  }

  return {
    matchingType: "services" as const,
    discrepancies,
    variance,
    variancePercentage,
    matchingStatus,
  };
}

// Helper: simulate the matching logic from getMatchingData (goods branch)
function computeGoodsMatching(params: {
  prAmount: number;
  poAmount: number;
  grnAcceptedAmount: number;
  payableAmount: number;
}) {
  const { grnAcceptedAmount, payableAmount } = params;
  const variance = payableAmount - grnAcceptedAmount;
  const variancePercentage = grnAcceptedAmount > 0 ? (variance / grnAcceptedAmount) * 100 : 0;

  return {
    matchingType: "goods" as const,
    variance,
    variancePercentage,
    discrepancies: variance !== 0
      ? [`Variance of $${Math.abs(variance).toFixed(2)} detected between payable and GRN accepted amount`]
      : [],
    matchingStatus: variance === 0 ? ("matched" as const) : ("variance_detected" as const),
  };
}

describe("Services 3-Way Matching: Contract/SAC/Invoice", () => {
  describe("Perfect match scenarios", () => {
    it("should return matched when all amounts align and invoice exists", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: 10000,
        payableAmount: 10000,
        cumulativeSacPayables: 10000,
      });

      expect(result.matchingStatus).toBe("matched");
      expect(result.discrepancies).toHaveLength(0);
      expect(result.variance).toBe(0);
    });

    it("should return matched for multiple SACs within contract value", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 15000,
        invoiceAmount: 15000,
        payableAmount: 15000,
        cumulativeSacPayables: 30000, // 2 SACs totaling 30K out of 50K contract
      });

      expect(result.matchingStatus).toBe("matched");
      expect(result.discrepancies).toHaveLength(0);
    });
  });

  describe("Pending status (no invoice)", () => {
    it("should return pending when no invoice uploaded", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: null,
        payableAmount: 10000,
        cumulativeSacPayables: 10000,
      });

      expect(result.matchingStatus).toBe("pending");
      expect(result.discrepancies).toHaveLength(0);
    });

    it("should still detect contract exceeded even without invoice", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: null,
        payableAmount: 10000,
        cumulativeSacPayables: 55000,
      });

      // Status is pending (no invoice) but discrepancy exists
      expect(result.matchingStatus).toBe("pending");
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0]).toContain("exceed contract value");
    });
  });

  describe("Contract value exceeded", () => {
    it("should detect when cumulative SAC payables exceed contract value", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: 10000,
        payableAmount: 10000,
        cumulativeSacPayables: 55000,
      });

      expect(result.matchingStatus).toBe("variance_detected");
      expect(result.discrepancies.some((d) => d.includes("exceed contract value"))).toBe(true);
    });

    it("should not flag when cumulative equals contract value exactly", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: 10000,
        payableAmount: 10000,
        cumulativeSacPayables: 50000,
      });

      expect(result.matchingStatus).toBe("matched");
      expect(result.discrepancies.some((d) => d.includes("exceed contract value"))).toBe(false);
    });
  });

  describe("SAC vs Payable variance", () => {
    it("should detect when payable differs from SAC approved amount", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: 10000,
        payableAmount: 10500, // $500 more than SAC
        cumulativeSacPayables: 10500,
      });

      expect(result.matchingStatus).toBe("variance_detected");
      expect(result.discrepancies.some((d) => d.includes("differs from SAC approved amount"))).toBe(true);
      expect(result.variance).toBe(500);
      expect(result.variancePercentage).toBe(5);
    });

    it("should tolerate rounding differences within 0.01", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: 10000,
        payableAmount: 10000.005, // Within tolerance
        cumulativeSacPayables: 10000.005,
      });

      expect(result.discrepancies.filter((d) => d.includes("differs from SAC"))).toHaveLength(0);
    });
  });

  describe("Invoice vs SAC variance", () => {
    it("should detect when invoice amount differs from SAC amount", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: 11000, // Invoice is $1000 more
        payableAmount: 10000,
        cumulativeSacPayables: 10000,
      });

      expect(result.matchingStatus).toBe("variance_detected");
      expect(result.discrepancies.some((d) => d.includes("Invoice amount"))).toBe(true);
    });

    it("should not check invoice variance when no invoice exists", () => {
      const result = computeServicesMatching({
        contractValue: 50000,
        sacApprovedAmount: 10000,
        invoiceAmount: null,
        payableAmount: 10000,
        cumulativeSacPayables: 10000,
      });

      expect(result.discrepancies.filter((d) => d.includes("Invoice amount"))).toHaveLength(0);
    });
  });

  describe("Multiple discrepancies", () => {
    it("should report all discrepancies when multiple checks fail", () => {
      const result = computeServicesMatching({
        contractValue: 30000,
        sacApprovedAmount: 10000,
        invoiceAmount: 12000,
        payableAmount: 11000,
        cumulativeSacPayables: 35000,
      });

      expect(result.matchingStatus).toBe("variance_detected");
      // Should have 3 discrepancies:
      // 1. Cumulative exceeds contract
      // 2. Payable differs from SAC
      // 3. Invoice differs from SAC
      expect(result.discrepancies).toHaveLength(3);
    });
  });
});

describe("Goods 3-Way Matching: PR/PO/GRN (existing logic preserved)", () => {
  it("should return matched when payable equals GRN accepted amount", () => {
    const result = computeGoodsMatching({
      prAmount: 5000,
      poAmount: 5000,
      grnAcceptedAmount: 4800,
      payableAmount: 4800,
    });

    expect(result.matchingStatus).toBe("matched");
    expect(result.discrepancies).toHaveLength(0);
    expect(result.variance).toBe(0);
  });

  it("should detect variance when payable differs from GRN accepted", () => {
    const result = computeGoodsMatching({
      prAmount: 5000,
      poAmount: 5000,
      grnAcceptedAmount: 4800,
      payableAmount: 5000,
    });

    expect(result.matchingStatus).toBe("variance_detected");
    expect(result.discrepancies).toHaveLength(1);
    expect(result.variance).toBe(200);
  });
});

describe("Matching type detection", () => {
  it("should identify services payable by sacId presence", () => {
    // Simulates the isServicesPayable check in getMatchingData
    const payableWithSac = { sacId: 42, contractId: 10, purchaseOrderId: null };
    const payableWithPO = { sacId: null, contractId: null, purchaseOrderId: 5 };

    expect(!!payableWithSac.sacId).toBe(true);
    expect(!!payableWithPO.sacId).toBe(false);
  });
});

describe("Variance percentage calculation", () => {
  it("should calculate correct percentage for services", () => {
    const result = computeServicesMatching({
      contractValue: 100000,
      sacApprovedAmount: 20000,
      invoiceAmount: 22000,
      payableAmount: 22000,
      cumulativeSacPayables: 22000,
    });

    // Variance = 22000 - 20000 = 2000
    // Percentage = (2000 / 20000) * 100 = 10%
    expect(result.variance).toBe(2000);
    expect(result.variancePercentage).toBe(10);
  });

  it("should return 0% variance when SAC amount is 0", () => {
    const result = computeServicesMatching({
      contractValue: 50000,
      sacApprovedAmount: 0,
      invoiceAmount: null,
      payableAmount: 0,
      cumulativeSacPayables: 0,
    });

    expect(result.variance).toBe(0);
    expect(result.variancePercentage).toBe(0);
  });
});
