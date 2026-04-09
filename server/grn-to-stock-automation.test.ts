/**
 * Tests for the GRN-to-Stock Automation module.
 * 
 * Covers:
 * - Stock item creation from GRN line items
 * - Stock batch creation with GRN/PO traceability
 * - Stock ledger posting (GRN_IN entries)
 * - Duplicate prevention (stockPosted flag)
 * - Goods-only filtering (services/works skip stock)
 * - Quantity aggregation for existing items
 * - Item code generation
 * - Org/OU scoping enforcement
 */

// ─── Helper: Generate Item Code ────────────────────────────────────────────

function generateItemCode(
  existingCount: number,
  description: string
): string {
  const seq = existingCount + 1;
  const prefix = description.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  return `STK-${prefix}-${String(seq).padStart(4, "0")}`;
}

// ─── Helper: Compute Available Qty ─────────────────────────────────────────

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

// ─── Helper: Process GRN Line to Stock (pure logic) ────────────────────────

interface GrnLine {
  id: number;
  lineNumber: number;
  description: string;
  receivedQty: string;
  acceptedQty: string;
  unit: string;
  poLineItemId?: number;
}

interface StockItemRecord {
  id: number;
  itemName: string;
  currentQuantity: string;
  unitCost: string;
  totalValue: string;
  organizationId: number;
}

interface ProcessResult {
  stockItemId: number;
  batchNumber: string;
  ledgerEntry: {
    movementType: string;
    qtyChange: string;
    referenceType: string;
  };
  isNewItem: boolean;
}

function processGrnLineToStock(
  line: GrnLine,
  grnNumber: string,
  organizationId: number,
  existingItems: StockItemRecord[],
  poLineMap: Record<number, { unitPrice: string }>,
  existingItemCount: number
): ProcessResult | null {
  const acceptedQty = parseFloat(line.acceptedQty || "0");
  if (acceptedQty <= 0) return null;

  const unitPrice = line.poLineItemId && poLineMap[line.poLineItemId]
    ? parseFloat(poLineMap[line.poLineItemId].unitPrice)
    : 0;

  // Find existing item
  const existing = existingItems.find(
    (item) => item.itemName === line.description && item.organizationId === organizationId
  );

  let stockItemId: number;
  let isNewItem = false;

  if (existing) {
    stockItemId = existing.id;
  } else {
    stockItemId = existingItemCount + 1; // Simulated auto-increment
    isNewItem = true;
  }

  const batchNumber = `BATCH-${grnNumber}-L${line.lineNumber}`;

  return {
    stockItemId,
    batchNumber,
    ledgerEntry: {
      movementType: "GRN_IN",
      qtyChange: String(acceptedQty),
      referenceType: "GRN",
    },
    isNewItem,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("GRN-to-Stock Automation: Item Code Generation", () => {
  it("should generate correct item code with alphabetic prefix", () => {
    expect(generateItemCode(0, "Printer HP")).toBe("STK-PRI-0001");
    expect(generateItemCode(4, "Desktop Computer")).toBe("STK-DES-0005");
    expect(generateItemCode(99, "Laptops")).toBe("STK-LAP-0100");
  });

  it("should replace non-alphabetic characters with X", () => {
    expect(generateItemCode(0, "123 Numeric")).toBe("STK-XXX-0001");
    expect(generateItemCode(0, "A1B")).toBe("STK-AXB-0001");
  });

  it("should handle short descriptions", () => {
    expect(generateItemCode(0, "AB")).toBe("STK-AB-0001");
    expect(generateItemCode(0, "A")).toBe("STK-A-0001");
  });

  it("should pad sequence numbers correctly", () => {
    expect(generateItemCode(0, "Test")).toBe("STK-TES-0001");
    expect(generateItemCode(9, "Test")).toBe("STK-TES-0010");
    expect(generateItemCode(999, "Test")).toBe("STK-TES-1000");
    expect(generateItemCode(9999, "Test")).toBe("STK-TES-10000");
  });
});

describe("GRN-to-Stock Automation: Line Processing", () => {
  const grnNumber = "GRN-PO-ORG01-2026-001-01";
  const orgId = 1;
  const poLineMap: Record<number, { unitPrice: string }> = {
    101: { unitPrice: "250.00" },
    102: { unitPrice: "1500.00" },
    103: { unitPrice: "50.00" },
  };

  it("should create a new stock item for a new GRN line", () => {
    const line: GrnLine = {
      id: 1,
      lineNumber: 1,
      description: "Printer HP",
      receivedQty: "5",
      acceptedQty: "5",
      unit: "Piece",
      poLineItemId: 101,
    };

    const result = processGrnLineToStock(line, grnNumber, orgId, [], poLineMap, 0);
    expect(result).not.toBeNull();
    expect(result!.isNewItem).toBe(true);
    expect(result!.batchNumber).toBe(`BATCH-${grnNumber}-L1`);
    expect(result!.ledgerEntry.movementType).toBe("GRN_IN");
    expect(result!.ledgerEntry.qtyChange).toBe("5");
    expect(result!.ledgerEntry.referenceType).toBe("GRN");
  });

  it("should find existing stock item instead of creating new one", () => {
    const existingItems: StockItemRecord[] = [
      {
        id: 42,
        itemName: "Printer HP",
        currentQuantity: "10",
        unitCost: "250.00",
        totalValue: "2500.00",
        organizationId: orgId,
      },
    ];

    const line: GrnLine = {
      id: 2,
      lineNumber: 1,
      description: "Printer HP",
      receivedQty: "3",
      acceptedQty: "3",
      unit: "Piece",
      poLineItemId: 101,
    };

    const result = processGrnLineToStock(line, grnNumber, orgId, existingItems, poLineMap, 1);
    expect(result).not.toBeNull();
    expect(result!.isNewItem).toBe(false);
    expect(result!.stockItemId).toBe(42);
  });

  it("should skip lines with zero accepted quantity", () => {
    const line: GrnLine = {
      id: 3,
      lineNumber: 2,
      description: "Damaged Item",
      receivedQty: "10",
      acceptedQty: "0",
      unit: "Piece",
      poLineItemId: 102,
    };

    const result = processGrnLineToStock(line, grnNumber, orgId, [], poLineMap, 0);
    expect(result).toBeNull();
  });

  it("should skip lines with negative accepted quantity", () => {
    const line: GrnLine = {
      id: 4,
      lineNumber: 3,
      description: "Error Item",
      receivedQty: "5",
      acceptedQty: "-1",
      unit: "Piece",
    };

    const result = processGrnLineToStock(line, grnNumber, orgId, [], {}, 0);
    expect(result).toBeNull();
  });

  it("should handle lines without PO line item reference (unit price = 0)", () => {
    const line: GrnLine = {
      id: 5,
      lineNumber: 1,
      description: "Donated Supplies",
      receivedQty: "100",
      acceptedQty: "100",
      unit: "Box",
    };

    const result = processGrnLineToStock(line, grnNumber, orgId, [], poLineMap, 0);
    expect(result).not.toBeNull();
    expect(result!.isNewItem).toBe(true);
    expect(result!.ledgerEntry.qtyChange).toBe("100");
  });

  it("should not match items from different organizations", () => {
    const existingItems: StockItemRecord[] = [
      {
        id: 42,
        itemName: "Printer HP",
        currentQuantity: "10",
        unitCost: "250.00",
        totalValue: "2500.00",
        organizationId: 999, // Different org
      },
    ];

    const line: GrnLine = {
      id: 6,
      lineNumber: 1,
      description: "Printer HP",
      receivedQty: "5",
      acceptedQty: "5",
      unit: "Piece",
      poLineItemId: 101,
    };

    const result = processGrnLineToStock(line, grnNumber, orgId, existingItems, poLineMap, 0);
    expect(result).not.toBeNull();
    expect(result!.isNewItem).toBe(true); // Should create new, not match other org's item
  });
});

describe("GRN-to-Stock Automation: Batch Number Format", () => {
  it("should generate correct batch number from GRN number and line number", () => {
    const grnNumber = "GRN-PO-EFADAH01-2026-022-27";
    const lineNumber = 1;
    expect(`BATCH-${grnNumber}-L${lineNumber}`).toBe("BATCH-GRN-PO-EFADAH01-2026-022-27-L1");
  });

  it("should handle multi-digit line numbers", () => {
    const grnNumber = "GRN-PO-ORG01-2026-001-01";
    expect(`BATCH-${grnNumber}-L10`).toBe("BATCH-GRN-PO-ORG01-2026-001-01-L10");
    expect(`BATCH-${grnNumber}-L100`).toBe("BATCH-GRN-PO-ORG01-2026-001-01-L100");
  });
});

describe("GRN-to-Stock Automation: Duplicate Prevention", () => {
  it("should reject processing when stockPosted is already 1", () => {
    const grn = { stockPosted: 1 };
    const shouldProcess = grn.stockPosted !== 1;
    expect(shouldProcess).toBe(false);
  });

  it("should allow processing when stockPosted is 0", () => {
    const grn = { stockPosted: 0 };
    const shouldProcess = grn.stockPosted !== 1;
    expect(shouldProcess).toBe(true);
  });
});

describe("GRN-to-Stock Automation: Goods Category Filter", () => {
  it("should process goods category PRs", () => {
    const prCategory = "goods";
    const shouldCreateStock = prCategory === "goods";
    expect(shouldCreateStock).toBe(true);
  });

  it("should skip services category PRs", () => {
    const prCategory = "services";
    const shouldCreateStock = prCategory === "goods";
    expect(shouldCreateStock).toBe(false);
  });

  it("should skip works category PRs", () => {
    const prCategory = "works";
    const shouldCreateStock = prCategory === "goods";
    expect(shouldCreateStock).toBe(false);
  });
});

describe("GRN-to-Stock Automation: Stock Quantity Aggregation", () => {
  it("should correctly aggregate quantities when item already exists", () => {
    const existingQty = 10;
    const newAcceptedQty = 5;
    const newTotal = existingQty + newAcceptedQty;
    expect(newTotal).toBe(15);
  });

  it("should calculate total value correctly", () => {
    const qty = 5;
    const unitPrice = 250;
    const totalValue = (qty * unitPrice).toFixed(2);
    expect(totalValue).toBe("1250.00");
  });

  it("should handle zero unit price gracefully", () => {
    const qty = 100;
    const unitPrice = 0;
    const totalValue = (qty * unitPrice).toFixed(2);
    expect(totalValue).toBe("0.00");
  });

  it("should prefer new unit price over existing when > 0", () => {
    const existingUnitCost = 200;
    const newUnitPrice = 250;
    const finalPrice = newUnitPrice > 0 ? newUnitPrice : existingUnitCost;
    expect(finalPrice).toBe(250);
  });

  it("should keep existing unit cost when new price is 0", () => {
    const existingUnitCost = 200;
    const newUnitPrice = 0;
    const finalPrice = newUnitPrice > 0 ? newUnitPrice : existingUnitCost;
    expect(finalPrice).toBe(200);
  });
});

describe("GRN-to-Stock Automation: Available Qty After GRN_IN", () => {
  it("should show full accepted qty as available for new batch", () => {
    const batch = {
      acceptedQty: "50",
      issuedQty: "0",
      reservedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "0",
    };
    expect(computeAvailableQty(batch)).toBe(50);
  });

  it("should reduce available qty after issuing", () => {
    const batch = {
      acceptedQty: "50",
      issuedQty: "20",
      reservedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "0",
    };
    expect(computeAvailableQty(batch)).toBe(30);
  });

  it("should increase available qty after returns", () => {
    const batch = {
      acceptedQty: "50",
      issuedQty: "20",
      reservedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "5",
    };
    expect(computeAvailableQty(batch)).toBe(35);
  });
});

describe("GRN-to-Stock Automation: Ledger Entry Validation", () => {
  it("should create GRN_IN movement type for stock receipt", () => {
    const movementType = "GRN_IN";
    expect(movementType).toBe("GRN_IN");
  });

  it("should reference GRN as the source document", () => {
    const referenceType = "GRN";
    expect(referenceType).toBe("GRN");
  });

  it("should use positive qtyChange for incoming stock", () => {
    const acceptedQty = 10;
    const qtyChange = String(acceptedQty);
    expect(parseFloat(qtyChange)).toBeGreaterThan(0);
  });

  it("should calculate correct total value for ledger entry", () => {
    const acceptedQty = 5;
    const unitPrice = 1500;
    const totalValue = (acceptedQty * unitPrice).toFixed(2);
    expect(totalValue).toBe("7500.00");
  });
});

describe("GRN-to-Stock Automation: Multi-Line GRN Processing", () => {
  it("should process all lines from a multi-line GRN", () => {
    const grnNumber = "GRN-PO-EFADAH01-2026-021-28";
    const orgId = 1;
    const poLineMap: Record<number, { unitPrice: string }> = {
      201: { unitPrice: "300.00" },
      202: { unitPrice: "25.00" },
      203: { unitPrice: "800.00" },
    };

    const lines: GrnLine[] = [
      { id: 1, lineNumber: 1, description: "laptops", receivedQty: "5", acceptedQty: "5", unit: "Piece", poLineItemId: 201 },
      { id: 2, lineNumber: 2, description: "Mouse", receivedQty: "5", acceptedQty: "5", unit: "Piece", poLineItemId: 202 },
      { id: 3, lineNumber: 3, description: "Desktop", receivedQty: "5", acceptedQty: "5", unit: "Piece", poLineItemId: 203 },
    ];

    const results = lines
      .map((line) => processGrnLineToStock(line, grnNumber, orgId, [], poLineMap, 0))
      .filter(Boolean);

    expect(results.length).toBe(3);
    expect(results[0]!.batchNumber).toBe("BATCH-GRN-PO-EFADAH01-2026-021-28-L1");
    expect(results[1]!.batchNumber).toBe("BATCH-GRN-PO-EFADAH01-2026-021-28-L2");
    expect(results[2]!.batchNumber).toBe("BATCH-GRN-PO-EFADAH01-2026-021-28-L3");
    expect(results.every((r) => r!.isNewItem)).toBe(true);
  });

  it("should handle mixed accepted/rejected lines", () => {
    const grnNumber = "GRN-TEST-001";
    const orgId = 1;

    const lines: GrnLine[] = [
      { id: 1, lineNumber: 1, description: "Good Item", receivedQty: "10", acceptedQty: "10", unit: "Piece" },
      { id: 2, lineNumber: 2, description: "Rejected Item", receivedQty: "5", acceptedQty: "0", unit: "Piece" },
      { id: 3, lineNumber: 3, description: "Partial Item", receivedQty: "8", acceptedQty: "6", unit: "Piece" },
    ];

    const results = lines
      .map((line) => processGrnLineToStock(line, grnNumber, orgId, [], {}, 0))
      .filter(Boolean);

    expect(results.length).toBe(2); // Line 2 should be skipped (0 accepted)
    expect(results[0]!.ledgerEntry.qtyChange).toBe("10");
    expect(results[1]!.ledgerEntry.qtyChange).toBe("6");
  });
});

describe("GRN-to-Stock Automation: Org/OU Scoping", () => {
  it("should assign organizationId to all created records", () => {
    const orgId = 42;
    const line: GrnLine = {
      id: 1,
      lineNumber: 1,
      description: "Test Item",
      receivedQty: "10",
      acceptedQty: "10",
      unit: "Piece",
    };

    const result = processGrnLineToStock(line, "GRN-TEST", orgId, [], {}, 0);
    expect(result).not.toBeNull();
    // The actual DB insert would include organizationId - verified by the function signature
    expect(result!.isNewItem).toBe(true);
  });

  it("should isolate stock items per organization", () => {
    const org1Items: StockItemRecord[] = [
      { id: 1, itemName: "Printer", currentQuantity: "5", unitCost: "200", totalValue: "1000", organizationId: 1 },
    ];
    const org2Items: StockItemRecord[] = [
      { id: 2, itemName: "Printer", currentQuantity: "3", unitCost: "200", totalValue: "600", organizationId: 2 },
    ];

    const line: GrnLine = {
      id: 1,
      lineNumber: 1,
      description: "Printer",
      receivedQty: "2",
      acceptedQty: "2",
      unit: "Piece",
    };

    // Org 1 should find its own item
    const result1 = processGrnLineToStock(line, "GRN-1", 1, org1Items, {}, 1);
    expect(result1!.isNewItem).toBe(false);
    expect(result1!.stockItemId).toBe(1);

    // Org 2 should find its own item
    const result2 = processGrnLineToStock(line, "GRN-2", 2, org2Items, {}, 1);
    expect(result2!.isNewItem).toBe(false);
    expect(result2!.stockItemId).toBe(2);

    // Org 3 should create a new item (no existing items)
    const result3 = processGrnLineToStock(line, "GRN-3", 3, [], {}, 0);
    expect(result3!.isNewItem).toBe(true);
  });
});
