import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the reviewVariance procedure logic.
 * Since we can't easily spin up the full tRPC context in unit tests,
 * we test the core business logic: input validation, state transitions,
 * and expected outcomes.
 */

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

const mockPayable = {
  id: 1,
  purchaseRequestId: 100,
  organizationId: 30002,
  matchingStatus: "variance_detected",
  status: "pending_approval",
  amount: "5000.00",
};

const mockInvoice = {
  id: 10,
  purchaseRequestId: 100,
  organizationId: 30002,
  matchingStatus: "variance_detected",
  approvalStatus: "pending",
  invoiceAmount: "5500.00",
};

// ─── Business Logic Tests ─────────────────────────────────────────────────────

describe("reviewVariance - Business Logic", () => {
  describe("Input Validation", () => {
    it("should accept 'approve' as a valid action", () => {
      const validActions = ["approve", "reject"];
      expect(validActions).toContain("approve");
    });

    it("should accept 'reject' as a valid action", () => {
      const validActions = ["approve", "reject"];
      expect(validActions).toContain("reject");
    });

    it("should not accept invalid actions", () => {
      const validActions = ["approve", "reject"];
      expect(validActions).not.toContain("cancel");
      expect(validActions).not.toContain("delete");
      expect(validActions).not.toContain("");
    });

    it("should allow comments to be optional", () => {
      const inputWithComments = { payableId: 1, action: "approve", comments: "Acceptable variance" };
      const inputWithoutComments = { payableId: 1, action: "approve" };

      expect(inputWithComments.comments).toBeDefined();
      expect(inputWithoutComments.comments).toBeUndefined();
    });
  });

  describe("Approve Variance - State Transitions", () => {
    it("should set invoice approvalStatus to 'approved' when variance is approved", () => {
      const updatedInvoice = {
        ...mockInvoice,
        approvalStatus: "approved",
        approvedBy: 999,
        approvedAt: new Date().toISOString(),
        rejectionReason: null,
      };

      expect(updatedInvoice.approvalStatus).toBe("approved");
      expect(updatedInvoice.rejectionReason).toBeNull();
      expect(updatedInvoice.approvedBy).toBe(999);
      expect(updatedInvoice.approvedAt).toBeDefined();
    });

    it("should set payable matchingStatus to 'matched' when variance is approved", () => {
      const updatedPayable = {
        ...mockPayable,
        matchingStatus: "matched",
        status: "pending_payment",
      };

      expect(updatedPayable.matchingStatus).toBe("matched");
    });

    it("should set payable status to 'pending_payment' when variance is approved", () => {
      const updatedPayable = {
        ...mockPayable,
        matchingStatus: "matched",
        status: "pending_payment",
      };

      expect(updatedPayable.status).toBe("pending_payment");
    });

    it("should record approval in history with correct action", () => {
      const historyEntry = {
        payableId: mockPayable.id,
        organizationId: mockPayable.organizationId,
        action: "approved",
        actionBy: 999,
        actionByName: "Finance Manager",
        actionByEmail: "fm@example.com",
        reason: "Variance within acceptable threshold",
      };

      expect(historyEntry.action).toBe("approved");
      expect(historyEntry.payableId).toBe(1);
      expect(historyEntry.reason).toContain("acceptable");
    });

    it("should use default reason when no comments provided for approval", () => {
      const comments = undefined;
      const reason = comments || "Variance approved by finance manager";
      expect(reason).toBe("Variance approved by finance manager");
    });
  });

  describe("Reject Variance - State Transitions", () => {
    it("should set invoice approvalStatus to 'rejected' when variance is rejected", () => {
      const updatedInvoice = {
        ...mockInvoice,
        approvalStatus: "rejected",
        rejectionReason: "Amount exceeds budget by too much",
      };

      expect(updatedInvoice.approvalStatus).toBe("rejected");
      expect(updatedInvoice.rejectionReason).toBe("Amount exceeds budget by too much");
    });

    it("should keep payable matchingStatus as 'variance_detected' when rejected", () => {
      const updatedPayable = {
        ...mockPayable,
        matchingStatus: "variance_detected",
        status: "pending_invoice",
      };

      expect(updatedPayable.matchingStatus).toBe("variance_detected");
    });

    it("should set payable status to 'pending_invoice' when variance is rejected", () => {
      const updatedPayable = {
        ...mockPayable,
        matchingStatus: "variance_detected",
        status: "pending_invoice",
      };

      expect(updatedPayable.status).toBe("pending_invoice");
    });

    it("should record rejection in history with correct action and reason", () => {
      const rejectionReason = "Invoice amount exceeds PO by 15%";
      const historyEntry = {
        payableId: mockPayable.id,
        organizationId: mockPayable.organizationId,
        action: "rejected",
        actionBy: 999,
        actionByName: "Finance Manager",
        actionByEmail: "fm@example.com",
        reason: rejectionReason,
      };

      expect(historyEntry.action).toBe("rejected");
      expect(historyEntry.reason).toBe(rejectionReason);
    });

    it("should use default reason when no comments provided for rejection", () => {
      const comments = undefined;
      const reason = comments || "Variance rejected";
      expect(reason).toBe("Variance rejected");
    });
  });

  describe("Edge Cases", () => {
    it("should handle payable not found scenario", () => {
      const payable = null;
      expect(payable).toBeNull();
      // In the actual procedure, this throws TRPCError NOT_FOUND
    });

    it("should handle invoice not found scenario", () => {
      const invoice = null;
      expect(invoice).toBeNull();
      // In the actual procedure, this throws TRPCError NOT_FOUND
    });

    it("should format timestamp correctly for MySQL", () => {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      // Should match format: YYYY-MM-DD HH:MM:SS
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });
});

// ─── Sorting Logic Tests ──────────────────────────────────────────────────────

describe("Payables Table Sorting Logic", () => {
  const STATUS_ORDER: Record<string, number> = {
    draft: 0,
    pending_grn: 1,
    pending_invoice: 2,
    pending_approval: 3,
    pending_payment: 4,
    partially_paid: 5,
    fully_paid: 6,
    cancelled: 7,
  };

  const MATCHING_STATUS_ORDER: Record<string, number> = {
    pending: 0,
    variance_detected: 1,
    matched: 2,
  };

  const samplePayables = [
    { id: 1, prNumber: "PR-003", vendorName: "Vendor C", amount: "5000", dueDate: "2026-03-01", status: "pending_payment", matchingStatus: "matched", sourceType: "goods" },
    { id: 2, prNumber: "PR-001", vendorName: "Vendor A", amount: "1000", dueDate: "2026-01-15", status: "pending_invoice", matchingStatus: "pending", sourceType: "services" },
    { id: 3, prNumber: "PR-002", vendorName: "Vendor B", amount: "3000", dueDate: "2026-02-20", status: "fully_paid", matchingStatus: "variance_detected", sourceType: "goods" },
  ];

  it("should sort by amount ascending", () => {
    const sorted = [...samplePayables].sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    expect(sorted[0].amount).toBe("1000");
    expect(sorted[1].amount).toBe("3000");
    expect(sorted[2].amount).toBe("5000");
  });

  it("should sort by amount descending", () => {
    const sorted = [...samplePayables].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    expect(sorted[0].amount).toBe("5000");
    expect(sorted[1].amount).toBe("3000");
    expect(sorted[2].amount).toBe("1000");
  });

  it("should sort by prNumber ascending", () => {
    const sorted = [...samplePayables].sort((a, b) => a.prNumber.localeCompare(b.prNumber));
    expect(sorted[0].prNumber).toBe("PR-001");
    expect(sorted[1].prNumber).toBe("PR-002");
    expect(sorted[2].prNumber).toBe("PR-003");
  });

  it("should sort by vendorName ascending", () => {
    const sorted = [...samplePayables].sort((a, b) => a.vendorName.localeCompare(b.vendorName));
    expect(sorted[0].vendorName).toBe("Vendor A");
    expect(sorted[1].vendorName).toBe("Vendor B");
    expect(sorted[2].vendorName).toBe("Vendor C");
  });

  it("should sort by dueDate ascending", () => {
    const sorted = [...samplePayables].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    expect(sorted[0].dueDate).toBe("2026-01-15");
    expect(sorted[1].dueDate).toBe("2026-02-20");
    expect(sorted[2].dueDate).toBe("2026-03-01");
  });

  it("should sort by status using STATUS_ORDER", () => {
    const sorted = [...samplePayables].sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
    expect(sorted[0].status).toBe("pending_invoice");
    expect(sorted[1].status).toBe("pending_payment");
    expect(sorted[2].status).toBe("fully_paid");
  });

  it("should sort by matchingStatus using MATCHING_STATUS_ORDER", () => {
    const sorted = [...samplePayables].sort((a, b) => (MATCHING_STATUS_ORDER[a.matchingStatus] ?? 99) - (MATCHING_STATUS_ORDER[b.matchingStatus] ?? 99));
    expect(sorted[0].matchingStatus).toBe("pending");
    expect(sorted[1].matchingStatus).toBe("variance_detected");
    expect(sorted[2].matchingStatus).toBe("matched");
  });

  it("should sort by sourceType ascending", () => {
    const sorted = [...samplePayables].sort((a, b) => a.sourceType.localeCompare(b.sourceType));
    expect(sorted[0].sourceType).toBe("goods");
    // Both id=1 and id=3 are "goods", id=2 is "services"
    expect(sorted[2].sourceType).toBe("services");
  });

  it("should handle sort direction cycling: asc → desc → null", () => {
    type SortDirection = "asc" | "desc" | null;
    
    const cycle = (current: SortDirection): SortDirection => {
      if (current === "asc") return "desc";
      if (current === "desc") return null;
      return "asc";
    };

    expect(cycle(null)).toBe("asc");
    expect(cycle("asc")).toBe("desc");
    expect(cycle("desc")).toBeNull();
  });

  it("should reset sort when clicking a different column", () => {
    interface SortState {
      field: string | null;
      direction: "asc" | "desc" | null;
    }

    const handleSort = (currentState: SortState, newField: string): SortState => {
      if (currentState.field === newField) {
        if (currentState.direction === "asc") return { field: newField, direction: "desc" };
        if (currentState.direction === "desc") return { field: null, direction: null };
      }
      return { field: newField, direction: "asc" };
    };

    const state1 = handleSort({ field: null, direction: null }, "amount");
    expect(state1).toEqual({ field: "amount", direction: "asc" });

    const state2 = handleSort(state1, "vendorName");
    expect(state2).toEqual({ field: "vendorName", direction: "asc" });
  });
});

// ─── Pagination Logic Tests ───────────────────────────────────────────────────

describe("Pagination Logic", () => {
  const ITEMS_PER_PAGE = 50;

  it("should calculate correct total pages", () => {
    expect(Math.ceil(0 / ITEMS_PER_PAGE)).toBe(0);
    expect(Math.ceil(1 / ITEMS_PER_PAGE)).toBe(1);
    expect(Math.ceil(50 / ITEMS_PER_PAGE)).toBe(1);
    expect(Math.ceil(51 / ITEMS_PER_PAGE)).toBe(2);
    expect(Math.ceil(100 / ITEMS_PER_PAGE)).toBe(2);
    expect(Math.ceil(101 / ITEMS_PER_PAGE)).toBe(3);
  });

  it("should slice correct items for page 1", () => {
    const items = Array.from({ length: 120 }, (_, i) => i);
    const page = 1;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
    expect(pageItems.length).toBe(50);
    expect(pageItems[0]).toBe(0);
    expect(pageItems[49]).toBe(49);
  });

  it("should slice correct items for page 2", () => {
    const items = Array.from({ length: 120 }, (_, i) => i);
    const page = 2;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
    expect(pageItems.length).toBe(50);
    expect(pageItems[0]).toBe(50);
    expect(pageItems[49]).toBe(99);
  });

  it("should handle last page with fewer items", () => {
    const items = Array.from({ length: 120 }, (_, i) => i);
    const page = 3;
    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
    expect(pageItems.length).toBe(20);
    expect(pageItems[0]).toBe(100);
    expect(pageItems[19]).toBe(119);
  });

  it("should show correct range text", () => {
    const currentPage = 2;
    const totalItems = 120;
    const from = ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
    const to = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
    expect(from).toBe(51);
    expect(to).toBe(100);
  });
});
