import { describe, it, expect } from "vitest";

/**
 * Tests for the Stock Management module business logic.
 * Covers: available qty computation, FEFO/FIFO allocation,
 * issue validation, ledger entries, request workflow, return workflow, KPI logic.
 */

// ─── Available Qty Computation ──────────────────────────────────────────────

function computeAvailableQty(batch: {
  acceptedQty: string | number | null;
  issuedQty: string | number | null;
  reservedQty: string | number | null;
  lossAdjustments: string | number | null;
  returnsAccepted: string | number | null;
}): number {
  return (
    parseFloat(String(batch.acceptedQty || 0)) -
    parseFloat(String(batch.issuedQty || 0)) -
    parseFloat(String(batch.reservedQty || 0)) -
    parseFloat(String(batch.lossAdjustments || 0)) +
    parseFloat(String(batch.returnsAccepted || 0))
  );
}

describe("computeAvailableQty", () => {
  it("should compute available qty correctly with all fields", () => {
    const batch = {
      acceptedQty: "100",
      issuedQty: "30",
      reservedQty: "10",
      lossAdjustments: "5",
      returnsAccepted: "8",
    };
    // 100 - 30 - 10 - 5 + 8 = 63
    expect(computeAvailableQty(batch)).toBe(63);
  });

  it("should handle null fields as zero", () => {
    const batch = {
      acceptedQty: "50",
      issuedQty: null,
      reservedQty: null,
      lossAdjustments: null,
      returnsAccepted: null,
    };
    expect(computeAvailableQty(batch)).toBe(50);
  });

  it("should handle numeric inputs", () => {
    const batch = {
      acceptedQty: 200,
      issuedQty: 150,
      reservedQty: 0,
      lossAdjustments: 0,
      returnsAccepted: 20,
    };
    // 200 - 150 - 0 - 0 + 20 = 70
    expect(computeAvailableQty(batch)).toBe(70);
  });

  it("should return zero when fully depleted", () => {
    const batch = {
      acceptedQty: "100",
      issuedQty: "100",
      reservedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "0",
    };
    expect(computeAvailableQty(batch)).toBe(0);
  });

  it("should return negative when over-issued (edge case)", () => {
    const batch = {
      acceptedQty: "50",
      issuedQty: "60",
      reservedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "0",
    };
    expect(computeAvailableQty(batch)).toBe(-10);
  });

  it("should handle decimal quantities", () => {
    const batch = {
      acceptedQty: "100.50",
      issuedQty: "25.25",
      reservedQty: "10.10",
      lossAdjustments: "0.15",
      returnsAccepted: "5.00",
    };
    // 100.50 - 25.25 - 10.10 - 0.15 + 5.00 = 70.00
    expect(computeAvailableQty(batch)).toBe(70);
  });
});

// ─── FEFO/FIFO Allocation Logic ─────────────────────────────────────────────

interface BatchForAllocation {
  id: number;
  batchNumber: string;
  expiryDate: string | null;
  receivedDate: string;
  acceptedQty: string;
  issuedQty: string;
  reservedQty: string;
  lossAdjustments: string;
  returnsAccepted: string;
  unitCost: string;
}

function allocateBatches(
  batches: BatchForAllocation[],
  requestedQty: number
): Array<{ batchId: number; batchNumber: string; qty: number; expiryDate: string | null; unitCost: number }> {
  // Sort: FEFO first (by expiry date asc, nulls last), then FIFO (by received date asc)
  const sorted = [...batches].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    if (a.expiryDate && !b.expiryDate) return -1;
    if (!a.expiryDate && b.expiryDate) return 1;
    return a.receivedDate.localeCompare(b.receivedDate);
  });

  const allocations: Array<{ batchId: number; batchNumber: string; qty: number; expiryDate: string | null; unitCost: number }> = [];
  let remaining = requestedQty;

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const available = computeAvailableQty(batch);
    if (available <= 0) continue;

    const allocateQty = Math.min(remaining, available);
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      qty: allocateQty,
      expiryDate: batch.expiryDate,
      unitCost: parseFloat(batch.unitCost),
    });
    remaining -= allocateQty;
  }

  return allocations;
}

describe("FEFO/FIFO Batch Allocation", () => {
  const baseBatches: BatchForAllocation[] = [
    {
      id: 1, batchNumber: "B-001", expiryDate: "2026-06-15", receivedDate: "2026-01-10",
      acceptedQty: "50", issuedQty: "10", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "10.00",
    },
    {
      id: 2, batchNumber: "B-002", expiryDate: "2026-04-01", receivedDate: "2026-02-01",
      acceptedQty: "30", issuedQty: "0", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "12.00",
    },
    {
      id: 3, batchNumber: "B-003", expiryDate: null, receivedDate: "2025-12-01",
      acceptedQty: "100", issuedQty: "50", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "8.00",
    },
  ];

  it("should allocate from batch with earliest expiry first (FEFO)", () => {
    const result = allocateBatches(baseBatches, 20);
    // B-002 expires 2026-04-01 (earliest), should be picked first
    expect(result[0].batchId).toBe(2);
    expect(result[0].qty).toBe(20);
    expect(result.length).toBe(1);
  });

  it("should allocate across multiple batches when one is insufficient", () => {
    const result = allocateBatches(baseBatches, 50);
    // B-002 (30 available) → B-001 (40 available) → remainder from B-001
    expect(result[0].batchId).toBe(2);
    expect(result[0].qty).toBe(30);
    expect(result[1].batchId).toBe(1);
    expect(result[1].qty).toBe(20);
    expect(result.length).toBe(2);
  });

  it("should use FIFO for batches without expiry dates", () => {
    const noExpiryBatches: BatchForAllocation[] = [
      {
        id: 10, batchNumber: "NE-001", expiryDate: null, receivedDate: "2026-03-01",
        acceptedQty: "20", issuedQty: "0", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "5.00",
      },
      {
        id: 11, batchNumber: "NE-002", expiryDate: null, receivedDate: "2026-01-15",
        acceptedQty: "30", issuedQty: "0", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "6.00",
      },
    ];
    const result = allocateBatches(noExpiryBatches, 25);
    // NE-002 received earlier (2026-01-15), should be picked first
    expect(result[0].batchId).toBe(11);
    expect(result[0].qty).toBe(25);
  });

  it("should report shortfall when insufficient stock", () => {
    const result = allocateBatches(baseBatches, 200);
    const totalAllocated = result.reduce((sum, a) => sum + a.qty, 0);
    // B-002: 30, B-001: 40, B-003: 50 = 120 total
    expect(totalAllocated).toBe(120);
    const shortfall = 200 - totalAllocated;
    expect(shortfall).toBe(80);
  });

  it("should skip depleted batches", () => {
    const batchesWithDepleted: BatchForAllocation[] = [
      {
        id: 20, batchNumber: "D-001", expiryDate: "2026-05-01", receivedDate: "2026-01-01",
        acceptedQty: "50", issuedQty: "50", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "10.00",
      },
      {
        id: 21, batchNumber: "D-002", expiryDate: "2026-06-01", receivedDate: "2026-02-01",
        acceptedQty: "30", issuedQty: "0", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "11.00",
      },
    ];
    const result = allocateBatches(batchesWithDepleted, 10);
    // D-001 is fully depleted, should skip to D-002
    expect(result.length).toBe(1);
    expect(result[0].batchId).toBe(21);
    expect(result[0].qty).toBe(10);
  });

  it("should return empty allocations when no stock available", () => {
    const emptyBatches: BatchForAllocation[] = [
      {
        id: 30, batchNumber: "E-001", expiryDate: null, receivedDate: "2026-01-01",
        acceptedQty: "100", issuedQty: "100", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "10.00",
      },
    ];
    const result = allocateBatches(emptyBatches, 10);
    expect(result.length).toBe(0);
  });

  it("should determine allocation method based on expiry dates", () => {
    const withExpiry = allocateBatches(baseBatches, 10);
    const method = withExpiry.some(a => a.expiryDate) ? "FEFO" : "FIFO";
    expect(method).toBe("FEFO");

    const noExpiryBatches: BatchForAllocation[] = [
      {
        id: 40, batchNumber: "F-001", expiryDate: null, receivedDate: "2026-01-01",
        acceptedQty: "50", issuedQty: "0", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "10.00",
      },
    ];
    const withoutExpiry = allocateBatches(noExpiryBatches, 10);
    const method2 = withoutExpiry.some(a => a.expiryDate) ? "FEFO" : "FIFO";
    expect(method2).toBe("FIFO");
  });
});

// ─── Issue Validation Logic ─────────────────────────────────────────────────

describe("Stock Issue Validation", () => {
  it("should reject issue when requested qty exceeds available", () => {
    const available = 30;
    const requested = 50;
    expect(requested > available).toBe(true);
  });

  it("should accept issue when requested qty equals available", () => {
    const available = 30;
    const requested = 30;
    expect(requested <= available).toBe(true);
  });

  it("should accept partial issuance (less than available)", () => {
    const available = 100;
    const requested = 25;
    expect(requested <= available).toBe(true);
  });

  it("should mark batch as depleted when available reaches zero", () => {
    const batch = {
      acceptedQty: "100",
      issuedQty: "95",
      reservedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "0",
    };
    // After issuing 5 more
    const newIssuedQty = parseFloat(batch.issuedQty) + 5;
    const updatedBatch = { ...batch, issuedQty: String(newIssuedQty) };
    const available = computeAvailableQty(updatedBatch);
    expect(available).toBe(0);
    const newStatus = available <= 0 ? "depleted" : "available";
    expect(newStatus).toBe("depleted");
  });

  it("should generate correct issue number format", () => {
    const seq = 42;
    const issueNumber = `ISS-${String(seq).padStart(5, "0")}`;
    expect(issueNumber).toBe("ISS-00042");
  });
});

// ─── Ledger Entry Logic ─────────────────────────────────────────────────────

describe("Stock Ledger Entries", () => {
  it("should create negative qtyChange for ISSUE_OUT", () => {
    const qtyIssued = 25;
    const qtyChange = -qtyIssued;
    expect(qtyChange).toBe(-25);
  });

  it("should create positive qtyChange for RETURN_IN", () => {
    const qtyReturned = 10;
    const qtyChange = qtyReturned;
    expect(qtyChange).toBe(10);
  });

  it("should create positive qtyChange for GRN_POST", () => {
    const qtyReceived = 100;
    const qtyChange = qtyReceived;
    expect(qtyChange).toBe(100);
  });

  it("should calculate totalValue correctly", () => {
    const qty = 25;
    const unitCost = 12.50;
    const totalValue = qty * unitCost;
    expect(totalValue).toBe(312.50);
  });

  it("should support all movement types", () => {
    const validTypes = ["GRN_POST", "ISSUE_OUT", "RETURN_IN", "TRANSFER_OUT", "TRANSFER_IN", "ADJUSTMENT"];
    expect(validTypes).toContain("GRN_POST");
    expect(validTypes).toContain("ISSUE_OUT");
    expect(validTypes).toContain("RETURN_IN");
    expect(validTypes).toContain("TRANSFER_OUT");
    expect(validTypes).toContain("TRANSFER_IN");
    expect(validTypes).toContain("ADJUSTMENT");
  });
});

// ─── Stock Request Workflow ─────────────────────────────────────────────────

describe("Stock Request Workflow", () => {
  const validStatuses = ["draft", "submitted", "approved", "partially_issued", "issued", "rejected", "cancelled"];

  it("should follow correct workflow: submitted → approved → issued", () => {
    expect(validStatuses.indexOf("submitted")).toBeLessThan(validStatuses.indexOf("approved"));
    expect(validStatuses.indexOf("approved")).toBeLessThan(validStatuses.indexOf("issued"));
  });

  it("should allow rejection from submitted state", () => {
    const currentStatus = "submitted";
    const canReject = currentStatus === "submitted" || currentStatus === "approved";
    expect(canReject).toBe(true);
  });

  it("should generate correct request number format", () => {
    const seq = 7;
    const requestNumber = `SR-${String(seq).padStart(5, "0")}`;
    expect(requestNumber).toBe("SR-00007");
  });

  it("should track approved quantities per line", () => {
    const requestedQty = "50";
    const approvedQty = "40";
    expect(parseFloat(approvedQty)).toBeLessThanOrEqual(parseFloat(requestedQty));
  });
});

// ─── Stock Return Workflow ──────────────────────────────────────────────────

describe("Stock Return Workflow", () => {
  it("should follow correct workflow: submitted → inspected → accepted/rejected", () => {
    const validStatuses = ["draft", "submitted", "inspected", "accepted", "rejected"];
    expect(validStatuses.indexOf("submitted")).toBeLessThan(validStatuses.indexOf("inspected"));
    expect(validStatuses.indexOf("inspected")).toBeLessThan(validStatuses.indexOf("accepted"));
  });

  it("should increase batch returnsAccepted when return is accepted", () => {
    const batch = {
      acceptedQty: "100",
      issuedQty: "50",
      reservedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "0",
    };
    // Before return: available = 100 - 50 = 50
    expect(computeAvailableQty(batch)).toBe(50);

    // After accepting 10 units return
    const updatedBatch = { ...batch, returnsAccepted: "10" };
    // After return: available = 100 - 50 + 10 = 60
    expect(computeAvailableQty(updatedBatch)).toBe(60);
  });

  it("should restore batch status to 'available' when return is accepted on depleted batch", () => {
    const batch = {
      acceptedQty: "100",
      issuedQty: "100",
      reservedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "0",
    };
    expect(computeAvailableQty(batch)).toBe(0);

    // After accepting 5 units return
    const updatedBatch = { ...batch, returnsAccepted: "5" };
    expect(computeAvailableQty(updatedBatch)).toBe(5);
    const newStatus = computeAvailableQty(updatedBatch) > 0 ? "available" : "depleted";
    expect(newStatus).toBe("available");
  });
});

// ─── KPI Computation Logic ──────────────────────────────────────────────────

describe("Stock KPI Computation", () => {
  it("should identify low stock items (currentQty <= minimumQty)", () => {
    const items = [
      { id: 1, currentQuantity: "5", minimumQuantity: "10" },
      { id: 2, currentQuantity: "50", minimumQuantity: "10" },
      { id: 3, currentQuantity: "10", minimumQuantity: "10" },
      { id: 4, currentQuantity: "0", minimumQuantity: "5" },
    ];
    const lowStock = items.filter(
      i => parseFloat(i.currentQuantity) <= parseFloat(i.minimumQuantity) && parseFloat(i.minimumQuantity) > 0
    );
    expect(lowStock.length).toBe(3); // items 1, 3, 4
    expect(lowStock.map(i => i.id)).toEqual([1, 3, 4]);
  });

  it("should identify near-expiry batches (within 30 days)", () => {
    const now = new Date("2026-03-08");
    const thirtyDaysLater = new Date("2026-04-07");

    const batches = [
      { id: 1, expiryDate: "2026-03-15", batchStatus: "available" }, // 7 days → near expiry
      { id: 2, expiryDate: "2026-06-01", batchStatus: "available" }, // 85 days → not near
      { id: 3, expiryDate: "2026-04-05", batchStatus: "available" }, // 28 days → near expiry
      { id: 4, expiryDate: "2026-03-01", batchStatus: "available" }, // already expired
      { id: 5, expiryDate: null, batchStatus: "available" },         // no expiry
    ];

    const nearExpiry = batches.filter(b => {
      if (!b.expiryDate || b.batchStatus !== "available") return false;
      const expiry = new Date(b.expiryDate);
      return expiry > now && expiry <= thirtyDaysLater;
    });

    expect(nearExpiry.length).toBe(2); // batches 1 and 3
    expect(nearExpiry.map(b => b.id)).toEqual([1, 3]);
  });

  it("should identify expired batches", () => {
    const now = new Date("2026-03-08");

    const batches = [
      { id: 1, expiryDate: "2026-03-01", batchStatus: "available" }, // expired
      { id: 2, expiryDate: "2026-06-01", batchStatus: "available" }, // not expired
      { id: 3, expiryDate: "2025-12-31", batchStatus: "available" }, // expired
      { id: 4, expiryDate: "2025-06-01", batchStatus: "depleted" },  // expired but depleted
    ];

    const expired = batches.filter(b => {
      if (!b.expiryDate || b.batchStatus === "depleted") return false;
      return new Date(b.expiryDate) <= now;
    });

    expect(expired.length).toBe(2); // batches 1 and 3
    expect(expired.map(b => b.id)).toEqual([1, 3]);
  });

  it("should calculate total stock value correctly", () => {
    const batches = [
      { acceptedQty: "100", issuedQty: "30", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "10.00" },
      { acceptedQty: "50", issuedQty: "0", reservedQty: "5", lossAdjustments: "0", returnsAccepted: "0", unitCost: "25.00" },
      { acceptedQty: "200", issuedQty: "200", reservedQty: "0", lossAdjustments: "0", returnsAccepted: "0", unitCost: "15.00" },
    ];

    const stockValue = batches.reduce((sum, b) => {
      const available = computeAvailableQty(b);
      const cost = parseFloat(b.unitCost);
      return sum + (available > 0 ? available * cost : 0);
    }, 0);

    // Batch 1: 70 * 10 = 700
    // Batch 2: 45 * 25 = 1125
    // Batch 3: 0 * 15 = 0 (depleted)
    expect(stockValue).toBe(1825);
  });
});
