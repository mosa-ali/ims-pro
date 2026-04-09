/**
 * PCE: Procurement Comparison Engine
 * Tests for bid_analysis_line_items population and CBA Supplier Offer Matrix
 *
 * Covers:
 * 1. bid_analysis_line_items is populated when a supplier quotation is submitted
 * 2. Existing entries are replaced (upsert) on re-submit
 * 3. getSupplierOfferMatrix returns the correct matrix shape
 * 4. createFromBA reads unit prices from bid_analysis_line_items
 * 5. createFromBA falls back to PR estimated cost when no lines exist
 */

import { describe, it, expect } from 'vitest';

// ─── Helpers that mirror the backend logic ────────────────────────────────────

/**
 * Simulates the bid_analysis_line_items upsert logic executed when a
 * supplier quotation is submitted for a CBA PR (> $25K Goods).
 */
function upsertBidAnalysisLineItems(
  existingLines: Array<{ bidderId: number; prLineItemId: number; unitPrice: string }>,
  newLines: Array<{ bidderId: number; prLineItemId: number; unitPrice: string }>
): Array<{ bidderId: number; prLineItemId: number; unitPrice: string }> {
  const map = new Map<string, { bidderId: number; prLineItemId: number; unitPrice: string }>();
  // Load existing
  for (const line of existingLines) {
    map.set(`${line.bidderId}-${line.prLineItemId}`, line);
  }
  // Upsert new (overwrite existing for same bidder+prLineItem)
  for (const line of newLines) {
    map.set(`${line.bidderId}-${line.prLineItemId}`, line);
  }
  return Array.from(map.values());
}

/**
 * Simulates the getSupplierOfferMatrix query result shape.
 */
function buildSupplierOfferMatrix(
  bidders: Array<{ id: number; name: string; isSelected: boolean }>,
  prLineItems: Array<{ id: number; description: string; quantity: number; unit: string; estimatedUnitCost: number }>,
  bidAnalysisLines: Array<{ bidderId: number; prLineItemId: number; unitPrice: string }>
) {
  const hasData = bidAnalysisLines.length > 0;

  const matrixRows = prLineItems.map((item) => {
    const bidderPrices = bidders.map((bidder) => {
      const line = bidAnalysisLines.find(
        (l) => l.bidderId === bidder.id && l.prLineItemId === item.id
      );
      return {
        bidderId: bidder.id,
        unitPrice: line ? parseFloat(line.unitPrice) : null,
        totalPrice: line ? parseFloat(line.unitPrice) * item.quantity : null,
      };
    });
    return {
      prLineItemId: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      estimatedUnitCost: item.estimatedUnitCost,
      bidderPrices,
    };
  });

  const bidderTotals = bidders.map((bidder) => {
    const total = bidAnalysisLines
      .filter((l) => l.bidderId === bidder.id)
      .reduce((sum, l) => {
        const item = prLineItems.find((i) => i.id === l.prLineItemId);
        return sum + parseFloat(l.unitPrice) * (item?.quantity ?? 0);
      }, 0);
    return { bidderId: bidder.id, total };
  });

  return { hasData, bidders, matrixRows, bidderTotals };
}

/**
 * Simulates the createFromBA PO line item price resolution.
 * Reads from bid_analysis_line_items for the awarded bidder; falls back to PR estimate.
 */
function resolvePoLineItemPrices(
  prLineItems: Array<{ id: number; description: string; quantity: number; estimatedUnitCost: number; unit: string }>,
  bidAnalysisLines: Array<{ bidderId: number; prLineItemId: number; unitPrice: string }>,
  awardedBidderId: number
): Array<{ description: string; quantity: number; unitPrice: number; total: number }> {
  return prLineItems.map((item) => {
    const line = bidAnalysisLines.find(
      (l) => l.bidderId === awardedBidderId && l.prLineItemId === item.id
    );
    const unitPrice = line ? parseFloat(line.unitPrice) : item.estimatedUnitCost;
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
    };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PCE: bid_analysis_line_items population', () => {
  it('should populate bid_analysis_line_items from supplier quotation lines on submit', () => {
    const newLines = [
      { bidderId: 150003, prLineItemId: 1001, unitPrice: '45.00' },
      { bidderId: 150003, prLineItemId: 1002, unitPrice: '120.00' },
      { bidderId: 150003, prLineItemId: 1003, unitPrice: '75.00' },
    ];
    const result = upsertBidAnalysisLineItems([], newLines);
    expect(result).toHaveLength(3);
    expect(result[0].unitPrice).toBe('45.00');
    expect(result[1].unitPrice).toBe('120.00');
    expect(result[2].unitPrice).toBe('75.00');
  });

  it('should upsert (replace) existing lines when a quotation is re-submitted', () => {
    const existing = [
      { bidderId: 150003, prLineItemId: 1001, unitPrice: '45.00' },
      { bidderId: 150003, prLineItemId: 1002, unitPrice: '120.00' },
    ];
    const updated = [
      { bidderId: 150003, prLineItemId: 1001, unitPrice: '42.00' }, // price revised
      { bidderId: 150003, prLineItemId: 1002, unitPrice: '115.00' }, // price revised
    ];
    const result = upsertBidAnalysisLineItems(existing, updated);
    expect(result).toHaveLength(2);
    expect(result.find((l) => l.prLineItemId === 1001)?.unitPrice).toBe('42.00');
    expect(result.find((l) => l.prLineItemId === 1002)?.unitPrice).toBe('115.00');
  });

  it('should accumulate lines from multiple bidders without overwriting each other', () => {
    const bidder1Lines = [
      { bidderId: 150001, prLineItemId: 1001, unitPrice: '45.00' },
      { bidderId: 150001, prLineItemId: 1002, unitPrice: '120.00' },
    ];
    const bidder2Lines = [
      { bidderId: 150002, prLineItemId: 1001, unitPrice: '40.00' },
      { bidderId: 150002, prLineItemId: 1002, unitPrice: '110.00' },
    ];
    const afterBidder1 = upsertBidAnalysisLineItems([], bidder1Lines);
    const afterBidder2 = upsertBidAnalysisLineItems(afterBidder1, bidder2Lines);
    expect(afterBidder2).toHaveLength(4);
    expect(afterBidder2.filter((l) => l.bidderId === 150001)).toHaveLength(2);
    expect(afterBidder2.filter((l) => l.bidderId === 150002)).toHaveLength(2);
  });
});

describe('PCE: getSupplierOfferMatrix shape', () => {
  const bidders = [
    { id: 150001, name: 'mosa company test (SRV-006)', isSelected: true },
    { id: 150002, name: 'Company Alitest baba (SUP-002)', isSelected: false },
    { id: 150003, name: 'warda campany (SRV-004)', isSelected: false },
  ];
  const prLineItems = [
    { id: 1001, description: 'Sport items', quantity: 500, unit: 'Pack', estimatedUnitCost: 50 },
    { id: 1002, description: 'Transportation', quantity: 1, unit: 'Piece', estimatedUnitCost: 2000 },
    { id: 1003, description: 'Loading off loading', quantity: 1, unit: 'Box', estimatedUnitCost: 500 },
  ];
  const bidAnalysisLines = [
    { bidderId: 150001, prLineItemId: 1001, unitPrice: '48.00' },
    { bidderId: 150001, prLineItemId: 1002, unitPrice: '1800.00' },
    { bidderId: 150001, prLineItemId: 1003, unitPrice: '450.00' },
    { bidderId: 150002, prLineItemId: 1001, unitPrice: '52.00' },
    { bidderId: 150002, prLineItemId: 1002, unitPrice: '2100.00' },
    { bidderId: 150002, prLineItemId: 1003, unitPrice: '480.00' },
    { bidderId: 150003, prLineItemId: 1001, unitPrice: '46.00' },
    { bidderId: 150003, prLineItemId: 1002, unitPrice: '1950.00' },
    { bidderId: 150003, prLineItemId: 1003, unitPrice: '460.00' },
  ];

  it('should return hasData=true when lines exist', () => {
    const matrix = buildSupplierOfferMatrix(bidders, prLineItems, bidAnalysisLines);
    expect(matrix.hasData).toBe(true);
  });

  it('should return hasData=false when no lines exist', () => {
    const matrix = buildSupplierOfferMatrix(bidders, prLineItems, []);
    expect(matrix.hasData).toBe(false);
  });

  it('should return one row per PR line item', () => {
    const matrix = buildSupplierOfferMatrix(bidders, prLineItems, bidAnalysisLines);
    expect(matrix.matrixRows).toHaveLength(3);
    expect(matrix.matrixRows[0].description).toBe('Sport items');
    expect(matrix.matrixRows[1].description).toBe('Transportation');
  });

  it('should return one price column per bidder in each row', () => {
    const matrix = buildSupplierOfferMatrix(bidders, prLineItems, bidAnalysisLines);
    expect(matrix.matrixRows[0].bidderPrices).toHaveLength(3);
    const bidder1Price = matrix.matrixRows[0].bidderPrices.find((bp) => bp.bidderId === 150001);
    expect(bidder1Price?.unitPrice).toBe(48.00);
  });

  it('should return null for missing bidder prices', () => {
    const partialLines = bidAnalysisLines.filter((l) => l.bidderId !== 150003);
    const matrix = buildSupplierOfferMatrix(bidders, prLineItems, partialLines);
    const bidder3Price = matrix.matrixRows[0].bidderPrices.find((bp) => bp.bidderId === 150003);
    expect(bidder3Price?.unitPrice).toBeNull();
  });

  it('should correctly calculate bidder totals', () => {
    const matrix = buildSupplierOfferMatrix(bidders, prLineItems, bidAnalysisLines);
    // Bidder 150001: 500*48 + 1*1800 + 1*450 = 24000 + 1800 + 450 = 26250
    const bidder1Total = matrix.bidderTotals.find((bt) => bt.bidderId === 150001);
    expect(bidder1Total?.total).toBe(26250);
  });

  it('should mark the selected bidder correctly', () => {
    const matrix = buildSupplierOfferMatrix(bidders, prLineItems, bidAnalysisLines);
    const selectedBidder = matrix.bidders.find((b) => b.isSelected);
    expect(selectedBidder?.id).toBe(150001);
    expect(selectedBidder?.name).toBe('mosa company test (SRV-006)');
  });
});

describe('PCE: createFromBA PO price resolution', () => {
  const prLineItems = [
    { id: 1001, description: 'Sport items', quantity: 500, estimatedUnitCost: 50, unit: 'Pack' },
    { id: 1002, description: 'Transportation', quantity: 1, estimatedUnitCost: 2000, unit: 'Piece' },
    { id: 1003, description: 'Loading off loading', quantity: 1, estimatedUnitCost: 500, unit: 'Box' },
  ];
  const bidAnalysisLines = [
    { bidderId: 150001, prLineItemId: 1001, unitPrice: '48.00' },
    { bidderId: 150001, prLineItemId: 1002, unitPrice: '1800.00' },
    { bidderId: 150001, prLineItemId: 1003, unitPrice: '450.00' },
  ];

  it('should use bid_analysis_line_items prices for the awarded bidder', () => {
    const poLines = resolvePoLineItemPrices(prLineItems, bidAnalysisLines, 150001);
    expect(poLines[0].unitPrice).toBe(48.00);
    expect(poLines[1].unitPrice).toBe(1800.00);
    expect(poLines[2].unitPrice).toBe(450.00);
  });

  it('should calculate correct line totals from bid_analysis_line_items prices', () => {
    const poLines = resolvePoLineItemPrices(prLineItems, bidAnalysisLines, 150001);
    expect(poLines[0].total).toBe(48 * 500); // 24000
    expect(poLines[1].total).toBe(1800 * 1); // 1800
    expect(poLines[2].total).toBe(450 * 1);  // 450
    const grandTotal = poLines.reduce((s, l) => s + l.total, 0);
    expect(grandTotal).toBe(26250);
  });

  it('should fall back to PR estimated cost when no bid_analysis_line_items exist', () => {
    const poLines = resolvePoLineItemPrices(prLineItems, [], 150001);
    expect(poLines[0].unitPrice).toBe(50);   // PR estimate
    expect(poLines[1].unitPrice).toBe(2000); // PR estimate
    expect(poLines[2].unitPrice).toBe(500);  // PR estimate
  });

  it('should fall back to PR estimated cost for lines not covered by the awarded bidder', () => {
    const partialLines = [
      { bidderId: 150001, prLineItemId: 1001, unitPrice: '48.00' },
      // 1002 and 1003 not submitted by this bidder
    ];
    const poLines = resolvePoLineItemPrices(prLineItems, partialLines, 150001);
    expect(poLines[0].unitPrice).toBe(48.00); // From bid_analysis_line_items
    expect(poLines[1].unitPrice).toBe(2000);  // Fallback to PR estimate
    expect(poLines[2].unitPrice).toBe(500);   // Fallback to PR estimate
  });

  it('should not use prices from non-awarded bidders', () => {
    const allBidderLines = [
      { bidderId: 150001, prLineItemId: 1001, unitPrice: '48.00' }, // awarded
      { bidderId: 150002, prLineItemId: 1001, unitPrice: '52.00' }, // not awarded
      { bidderId: 150003, prLineItemId: 1001, unitPrice: '46.00' }, // not awarded
    ];
    const poLines = resolvePoLineItemPrices(
      [prLineItems[0]], // just item 1001
      allBidderLines,
      150001 // awarded bidder
    );
    expect(poLines[0].unitPrice).toBe(48.00); // Only awarded bidder's price
  });
});

// ─── New tests for PCE enhancements ──────────────────────────────────────────

/**
 * Simulates the PO guardrail: throws if no line items exist for the awarded bidder
 * and no fallback supplier quotation header is found.
 */
function resolvePoLineItemPricesWithGuardrail(
  prLineItems: Array<{ id: number; description: string; quantity: number; estimatedUnitCost: number; unit: string }>,
  bidAnalysisLines: Array<{ bidderId: number; prLineItemId: number; unitPrice: string }>,
  fallbackSqLines: Array<{ prLineItemId: number; unitPrice: string }> | null,
  awardedBidderId: number,
  bidderLabel: string
): Array<{ description: string; quantity: number; unitPrice: number; total: number }> {
  // Check bid_analysis_line_items first
  const baliForBidder = bidAnalysisLines.filter((l) => l.bidderId === awardedBidderId);
  if (baliForBidder.length > 0) {
    return prLineItems.map((item) => {
      const line = baliForBidder.find((l) => l.prLineItemId === item.id);
      const unitPrice = line ? parseFloat(line.unitPrice) : item.estimatedUnitCost;
      return { description: item.description, quantity: item.quantity, unitPrice, total: unitPrice * item.quantity };
    });
  }

  // Fallback: use supplier_quotation_lines if available
  if (fallbackSqLines && fallbackSqLines.length > 0) {
    return prLineItems.map((item) => {
      const line = fallbackSqLines.find((l) => l.prLineItemId === item.id);
      const unitPrice = line ? parseFloat(line.unitPrice) : item.estimatedUnitCost;
      return { description: item.description, quantity: item.quantity, unitPrice, total: unitPrice * item.quantity };
    });
  }

  // Guardrail: no data at all → throw
  throw new Error(
    `Cannot create PO: No quotation line items found for the awarded bidder "${bidderLabel}". ` +
    `Please ensure the supplier has submitted their quotation through the Supplier Quotation Entry form, ` +
    `or use the Backfill action in the CBA Supplier Offer Matrix to sync existing quotation data.`
  );
}

/**
 * Simulates the backfill logic: copies supplier_quotation_lines into bid_analysis_line_items.
 */
function backfillBidAnalysisLineItems(
  bidders: Array<{ id: number; supplierId?: number | null }>,
  sqHeaders: Array<{ id: number; bidAnalysisBidderId?: number | null; vendorId?: number | null }>,
  sqLines: Array<{ quotationHeaderId: number; prLineItemId: number; unitPrice: string; lineTotal: string }>,
  bidAnalysisId: number
): { totalRowsCreated: number; biddersProcessed: number; rows: Array<{ bidderId: number; prLineItemId: number; unitPrice: string }> } {
  let totalRowsCreated = 0;
  let biddersProcessed = 0;
  const rows: Array<{ bidderId: number; prLineItemId: number; unitPrice: string }> = [];

  for (const bidder of bidders) {
    // Find SQ header by bidderId first, then by supplierId
    let sqHeader = sqHeaders.find((h) => h.bidAnalysisBidderId === bidder.id);
    if (!sqHeader && bidder.supplierId) {
      sqHeader = sqHeaders.find((h) => h.vendorId === bidder.supplierId);
    }
    if (!sqHeader) continue;

    const lines = sqLines.filter((l) => l.quotationHeaderId === sqHeader!.id);
    if (lines.length === 0) continue;

    for (const line of lines) {
      rows.push({ bidderId: bidder.id, prLineItemId: line.prLineItemId, unitPrice: line.unitPrice });
    }
    totalRowsCreated += lines.length;
    biddersProcessed++;
  }

  return { totalRowsCreated, biddersProcessed, rows };
}

/**
 * Simulates the frontend lowest-bidder highlighting logic.
 */
function computeLowestPriceByLine(
  matrixRows: Array<{
    prLineItemId: number;
    bidderPrices: Array<{ bidderId: number; unitPrice: number | null }>;
  }>
): Record<number, number> {
  const result: Record<number, number> = {};
  for (const row of matrixRows) {
    let lowest = Infinity;
    for (const bp of row.bidderPrices) {
      if (bp.unitPrice !== null && bp.unitPrice > 0 && bp.unitPrice < lowest) {
        lowest = bp.unitPrice;
      }
    }
    if (lowest < Infinity) result[row.prLineItemId] = lowest;
  }
  return result;
}

// ─── PO Guardrail Tests ───────────────────────────────────────────────────────

describe('PCE: PO creation guardrail', () => {
  const prLineItems = [
    { id: 1001, description: 'Sport items', quantity: 500, estimatedUnitCost: 50, unit: 'Pack' },
    { id: 1002, description: 'Transportation', quantity: 1, estimatedUnitCost: 2000, unit: 'Piece' },
  ];

  it('should throw PRECONDITION_FAILED when no bid_analysis_line_items and no fallback SQ lines', () => {
    expect(() =>
      resolvePoLineItemPricesWithGuardrail(prLineItems, [], null, 150001, 'Supplier A')
    ).toThrow('Cannot create PO: No quotation line items found for the awarded bidder "Supplier A"');
  });

  it('should throw with the bidder name in the error message', () => {
    expect(() =>
      resolvePoLineItemPricesWithGuardrail(prLineItems, [], null, 150002, 'ACME Corp')
    ).toThrow('ACME Corp');
  });

  it('should NOT throw when bid_analysis_line_items exist for the awarded bidder', () => {
    const baliLines = [
      { bidderId: 150001, prLineItemId: 1001, unitPrice: '48.00' },
      { bidderId: 150001, prLineItemId: 1002, unitPrice: '1800.00' },
    ];
    expect(() =>
      resolvePoLineItemPricesWithGuardrail(prLineItems, baliLines, null, 150001, 'Supplier A')
    ).not.toThrow();
  });

  it('should NOT throw when fallback supplier_quotation_lines exist', () => {
    const sqLines = [
      { prLineItemId: 1001, unitPrice: '48.00' },
      { prLineItemId: 1002, unitPrice: '1800.00' },
    ];
    expect(() =>
      resolvePoLineItemPricesWithGuardrail(prLineItems, [], sqLines, 150001, 'Supplier A')
    ).not.toThrow();
  });

  it('should use fallback SQ lines when bid_analysis_line_items is empty', () => {
    const sqLines = [
      { prLineItemId: 1001, unitPrice: '47.50' },
      { prLineItemId: 1002, unitPrice: '1750.00' },
    ];
    const poLines = resolvePoLineItemPricesWithGuardrail(prLineItems, [], sqLines, 150001, 'Supplier A');
    expect(poLines[0].unitPrice).toBe(47.50);
    expect(poLines[1].unitPrice).toBe(1750.00);
  });

  it('should prefer bid_analysis_line_items over fallback SQ lines', () => {
    const baliLines = [
      { bidderId: 150001, prLineItemId: 1001, unitPrice: '48.00' },
      { bidderId: 150001, prLineItemId: 1002, unitPrice: '1800.00' },
    ];
    const sqLines = [
      { prLineItemId: 1001, unitPrice: '47.50' }, // different price
      { prLineItemId: 1002, unitPrice: '1750.00' }, // different price
    ];
    const poLines = resolvePoLineItemPricesWithGuardrail(prLineItems, baliLines, sqLines, 150001, 'Supplier A');
    // Should use BALI prices, not SQ fallback
    expect(poLines[0].unitPrice).toBe(48.00);
    expect(poLines[1].unitPrice).toBe(1800.00);
  });
});

// ─── Backfill Tests ───────────────────────────────────────────────────────────

describe('PCE: backfillLineItems migration', () => {
  const bidders = [
    { id: 150001, supplierId: null },
    { id: 150002, supplierId: 500 },
    { id: 150003, supplierId: null },
  ];
  const sqHeaders = [
    { id: 1, bidAnalysisBidderId: 150001, vendorId: null },
    { id: 2, bidAnalysisBidderId: null, vendorId: 500 }, // matched by vendorId
    // No header for bidder 150003
  ];
  const sqLines = [
    { quotationHeaderId: 1, prLineItemId: 1001, unitPrice: '48.00', lineTotal: '24000.00' },
    { quotationHeaderId: 1, prLineItemId: 1002, unitPrice: '1800.00', lineTotal: '1800.00' },
    { quotationHeaderId: 2, prLineItemId: 1001, unitPrice: '52.00', lineTotal: '26000.00' },
    { quotationHeaderId: 2, prLineItemId: 1002, unitPrice: '2100.00', lineTotal: '2100.00' },
  ];

  it('should backfill lines for bidders with matching SQ headers', () => {
    const result = backfillBidAnalysisLineItems(bidders, sqHeaders, sqLines, 9001);
    expect(result.biddersProcessed).toBe(2);
    expect(result.totalRowsCreated).toBe(4);
  });

  it('should skip bidders without a matching SQ header', () => {
    const result = backfillBidAnalysisLineItems(bidders, sqHeaders, sqLines, 9001);
    const bidder3Rows = result.rows.filter((r) => r.bidderId === 150003);
    expect(bidder3Rows).toHaveLength(0);
  });

  it('should match by vendorId/supplierId when bidderId match fails', () => {
    const result = backfillBidAnalysisLineItems(bidders, sqHeaders, sqLines, 9001);
    const bidder2Rows = result.rows.filter((r) => r.bidderId === 150002);
    expect(bidder2Rows).toHaveLength(2);
    expect(bidder2Rows[0].unitPrice).toBe('52.00');
  });

  it('should correctly copy unit prices from SQ lines', () => {
    const result = backfillBidAnalysisLineItems(bidders, sqHeaders, sqLines, 9001);
    const bidder1Item1 = result.rows.find((r) => r.bidderId === 150001 && r.prLineItemId === 1001);
    expect(bidder1Item1?.unitPrice).toBe('48.00');
  });

  it('should return zero counts when no SQ headers match', () => {
    const result = backfillBidAnalysisLineItems(bidders, [], sqLines, 9001);
    expect(result.biddersProcessed).toBe(0);
    expect(result.totalRowsCreated).toBe(0);
    expect(result.rows).toHaveLength(0);
  });
});

// ─── Lowest-Bidder Highlighting Tests ────────────────────────────────────────

describe('PCE: lowest-bidder highlighting in Supplier Offer Matrix', () => {
  const matrixRows = [
    {
      prLineItemId: 1001,
      bidderPrices: [
        { bidderId: 150001, unitPrice: 48.00 },
        { bidderId: 150002, unitPrice: 52.00 },
        { bidderId: 150003, unitPrice: 46.00 }, // lowest
      ],
    },
    {
      prLineItemId: 1002,
      bidderPrices: [
        { bidderId: 150001, unitPrice: 1800.00 }, // lowest
        { bidderId: 150002, unitPrice: 2100.00 },
        { bidderId: 150003, unitPrice: 1950.00 },
      ],
    },
    {
      prLineItemId: 1003,
      bidderPrices: [
        { bidderId: 150001, unitPrice: 450.00 },
        { bidderId: 150002, unitPrice: 480.00 },
        { bidderId: 150003, unitPrice: 460.00 },
      ],
    },
  ];

  it('should identify the lowest price per line item', () => {
    const lowest = computeLowestPriceByLine(matrixRows);
    expect(lowest[1001]).toBe(46.00); // bidder 150003
    expect(lowest[1002]).toBe(1800.00); // bidder 150001
    expect(lowest[1003]).toBe(450.00); // bidder 150001
  });

  it('should correctly identify which bidder has the lowest price', () => {
    const lowest = computeLowestPriceByLine(matrixRows);
    const row1001 = matrixRows[0];
    const lowestBidder = row1001.bidderPrices.find((bp) => bp.unitPrice === lowest[1001]);
    expect(lowestBidder?.bidderId).toBe(150003);
  });

  it('should skip null prices when computing lowest', () => {
    const rowsWithNull = [
      {
        prLineItemId: 2001,
        bidderPrices: [
          { bidderId: 150001, unitPrice: 100.00 },
          { bidderId: 150002, unitPrice: null },
          { bidderId: 150003, unitPrice: 90.00 }, // lowest non-null
        ],
      },
    ];
    const lowest = computeLowestPriceByLine(rowsWithNull);
    expect(lowest[2001]).toBe(90.00);
  });

  it('should skip zero prices when computing lowest', () => {
    const rowsWithZero = [
      {
        prLineItemId: 2002,
        bidderPrices: [
          { bidderId: 150001, unitPrice: 0 }, // zero = not submitted
          { bidderId: 150002, unitPrice: 85.00 }, // lowest valid
          { bidderId: 150003, unitPrice: 95.00 },
        ],
      },
    ];
    const lowest = computeLowestPriceByLine(rowsWithZero);
    expect(lowest[2002]).toBe(85.00);
  });

  it('should return empty object when all prices are null', () => {
    const rowsAllNull = [
      {
        prLineItemId: 2003,
        bidderPrices: [
          { bidderId: 150001, unitPrice: null },
          { bidderId: 150002, unitPrice: null },
        ],
      },
    ];
    const lowest = computeLowestPriceByLine(rowsAllNull);
    expect(lowest[2003]).toBeUndefined();
  });

  it('should handle tied lowest prices (both should be highlighted)', () => {
    const rowsWithTie = [
      {
        prLineItemId: 2004,
        bidderPrices: [
          { bidderId: 150001, unitPrice: 75.00 }, // tied lowest
          { bidderId: 150002, unitPrice: 75.00 }, // tied lowest
          { bidderId: 150003, unitPrice: 80.00 },
        ],
      },
    ];
    const lowest = computeLowestPriceByLine(rowsWithTie);
    expect(lowest[2004]).toBe(75.00);
    // Both bidders with 75.00 should be highlighted (unitPrice === lowest[prLineItemId])
    const highlighted = rowsWithTie[0].bidderPrices.filter(
      (bp) => bp.unitPrice !== null && bp.unitPrice > 0 && bp.unitPrice === lowest[2004]
    );
    expect(highlighted).toHaveLength(2);
  });
});
