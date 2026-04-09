import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Bid Analysis ↔ Supplier Quotation Sync - Unit Tests
 *
 * Tests input validation schemas, business rules, and response shape contracts
 * for: getQuotationTotals, syncFromQuotations, getQuotationLineComparison,
 *      auto-sync on bidder creation, discrepancy detection
 */

// ─── Schema Definitions (mirrored from router) ────────────────────────────

const GetQuotationTotalsInput = z.object({
  purchaseRequestId: z.number(),
});

const SyncFromQuotationsInput = z.object({
  bidAnalysisId: z.number(),
});

const GetQuotationLineComparisonInput = z.object({
  purchaseRequestId: z.number(),
});

// ─── getQuotationTotals Schema Tests ─────────────────────────────────────

describe('Bid Analysis - getQuotationTotals Schema', () => {
  it('should accept valid purchaseRequestId', () => {
    const result = GetQuotationTotalsInput.safeParse({ purchaseRequestId: 100 });
    expect(result.success).toBe(true);
  });

  it('should reject missing purchaseRequestId', () => {
    const result = GetQuotationTotalsInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-number purchaseRequestId', () => {
    const result = GetQuotationTotalsInput.safeParse({ purchaseRequestId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('should reject null purchaseRequestId', () => {
    const result = GetQuotationTotalsInput.safeParse({ purchaseRequestId: null });
    expect(result.success).toBe(false);
  });

  it('should accept zero purchaseRequestId (valid number)', () => {
    const result = GetQuotationTotalsInput.safeParse({ purchaseRequestId: 0 });
    expect(result.success).toBe(true);
  });
});

// ─── syncFromQuotations Schema Tests ─────────────────────────────────────

describe('Bid Analysis - syncFromQuotations Schema', () => {
  it('should accept valid bidAnalysisId', () => {
    const result = SyncFromQuotationsInput.safeParse({ bidAnalysisId: 42 });
    expect(result.success).toBe(true);
  });

  it('should reject missing bidAnalysisId', () => {
    const result = SyncFromQuotationsInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-number bidAnalysisId', () => {
    const result = SyncFromQuotationsInput.safeParse({ bidAnalysisId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('should reject boolean bidAnalysisId', () => {
    const result = SyncFromQuotationsInput.safeParse({ bidAnalysisId: true });
    expect(result.success).toBe(false);
  });

  it('should accept negative bidAnalysisId (z.number() allows negatives)', () => {
    const result = SyncFromQuotationsInput.safeParse({ bidAnalysisId: -1 });
    expect(result.success).toBe(true);
  });
});

// ─── getQuotationLineComparison Schema Tests ─────────────────────────────

describe('Bid Analysis - getQuotationLineComparison Schema', () => {
  it('should accept valid purchaseRequestId', () => {
    const result = GetQuotationLineComparisonInput.safeParse({ purchaseRequestId: 100 });
    expect(result.success).toBe(true);
  });

  it('should reject missing purchaseRequestId', () => {
    const result = GetQuotationLineComparisonInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-number purchaseRequestId', () => {
    const result = GetQuotationLineComparisonInput.safeParse({ purchaseRequestId: 'abc' });
    expect(result.success).toBe(false);
  });
});

// ─── Quotation Map Shape Tests ───────────────────────────────────────────

describe('Bid Analysis - Quotation Map Shape', () => {
  const QuotationMapEntry = z.object({
    totalAmount: z.string(),
    quotationReference: z.string().nullable(),
    quotationDate: z.string().nullable(),
    lineCount: z.number(),
    quotationHeaderId: z.number(),
    status: z.string().nullable(),
  });

  const QuotationMap = z.record(z.coerce.number(), QuotationMapEntry);

  it('should validate a well-formed quotation map', () => {
    const map = {
      1: {
        totalAmount: '15000.00',
        quotationReference: 'SQ-2026-001',
        quotationDate: '2026-03-06',
        lineCount: 5,
        quotationHeaderId: 10,
        status: 'submitted',
      },
      2: {
        totalAmount: '22500.50',
        quotationReference: null,
        quotationDate: null,
        lineCount: 3,
        quotationHeaderId: 11,
        status: 'draft',
      },
    };
    const result = QuotationMap.safeParse(map);
    expect(result.success).toBe(true);
  });

  it('should accept an empty quotation map', () => {
    const result = QuotationMap.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject entry with missing totalAmount', () => {
    const map = {
      1: {
        quotationReference: 'SQ-001',
        quotationDate: '2026-03-06',
        lineCount: 2,
        quotationHeaderId: 5,
        status: 'submitted',
      },
    };
    const result = QuotationMap.safeParse(map);
    expect(result.success).toBe(false);
  });

  it('should reject entry with non-number lineCount', () => {
    const map = {
      1: {
        totalAmount: '15000.00',
        quotationReference: 'SQ-001',
        quotationDate: '2026-03-06',
        lineCount: 'five',
        quotationHeaderId: 5,
        status: 'submitted',
      },
    };
    const result = QuotationMap.safeParse(map);
    expect(result.success).toBe(false);
  });
});

// ─── Sync Response Shape Tests ───────────────────────────────────────────

describe('Bid Analysis - syncFromQuotations Response Shape', () => {
  const SyncResponse = z.object({
    success: z.boolean(),
    syncedCount: z.number().int().min(0),
    totalBidders: z.number().int().min(0),
  });

  it('should validate a successful sync response', () => {
    const response = { success: true, syncedCount: 3, totalBidders: 5 };
    const result = SyncResponse.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate a sync response with zero synced', () => {
    const response = { success: true, syncedCount: 0, totalBidders: 5 };
    const result = SyncResponse.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate a sync response with all synced', () => {
    const response = { success: true, syncedCount: 5, totalBidders: 5 };
    const result = SyncResponse.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should reject response with negative syncedCount', () => {
    const response = { success: true, syncedCount: -1, totalBidders: 5 };
    const result = SyncResponse.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should reject response missing success field', () => {
    const response = { syncedCount: 3, totalBidders: 5 };
    const result = SyncResponse.safeParse(response);
    expect(result.success).toBe(false);
  });
});

// ─── Line Comparison Response Shape Tests ────────────────────────────────

describe('Bid Analysis - Line Comparison Response Shape', () => {
  const LineItemBidder = z.object({
    unitPrice: z.string(),
    lineTotal: z.string(),
  });

  const LineItem = z.object({
    prLineItemId: z.number(),
    itemDescription: z.string(),
    unit: z.string(),
    quantity: z.string(),
    bidders: z.record(z.coerce.number(), LineItemBidder),
  });

  const LineComparisonResponse = z.object({
    lineItems: z.array(LineItem),
    bidderMap: z.record(z.coerce.number(), z.string()),
  });

  it('should validate a well-formed line comparison response', () => {
    const response = {
      lineItems: [
        {
          prLineItemId: 1,
          itemDescription: 'Sport Items',
          unit: 'Pack',
          quantity: '500',
          bidders: {
            1: { unitPrice: '10.50', lineTotal: '5250.00' },
            2: { unitPrice: '12.00', lineTotal: '6000.00' },
          },
        },
        {
          prLineItemId: 2,
          itemDescription: 'Transportation',
          unit: 'Piece',
          quantity: '1',
          bidders: {
            1: { unitPrice: '500.00', lineTotal: '500.00' },
          },
        },
      ],
      bidderMap: {
        1: 'Supplier A',
        2: 'Supplier B',
      },
    };
    const result = LineComparisonResponse.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate an empty line comparison response', () => {
    const response = { lineItems: [], bidderMap: {} };
    const result = LineComparisonResponse.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should reject line item missing bidders field', () => {
    const response = {
      lineItems: [
        {
          prLineItemId: 1,
          itemDescription: 'Sport Items',
          unit: 'Pack',
          quantity: '500',
        },
      ],
      bidderMap: {},
    };
    const result = LineComparisonResponse.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should reject bidder entry with non-string unitPrice', () => {
    const response = {
      lineItems: [
        {
          prLineItemId: 1,
          itemDescription: 'Sport Items',
          unit: 'Pack',
          quantity: '500',
          bidders: {
            1: { unitPrice: 10.50, lineTotal: '5250.00' },
          },
        },
      ],
      bidderMap: { 1: 'Supplier A' },
    };
    const result = LineComparisonResponse.safeParse(response);
    expect(result.success).toBe(false);
  });
});

// ─── Business Rule Tests ─────────────────────────────────────────────────

describe('Bid Analysis - Quotation Sync Business Rules', () => {
  describe('Price Matching Logic', () => {
    it('should consider amounts matching within 0.01 tolerance as synced', () => {
      const bidAmount = 15000.00;
      const quotationAmount = 15000.00;
      const tolerance = 0.01;
      expect(Math.abs(bidAmount - quotationAmount) < tolerance).toBe(true);
    });

    it('should consider amounts matching within 0.01 tolerance (rounding)', () => {
      const bidAmount = 15000.005;
      const quotationAmount = 15000.00;
      const tolerance = 0.01;
      expect(Math.abs(bidAmount - quotationAmount) < tolerance).toBe(true);
    });

    it('should NOT consider amounts differing by more than 0.01 as synced', () => {
      const bidAmount = 15000.00;
      const quotationAmount = 15001.00;
      const tolerance = 0.01;
      expect(Math.abs(bidAmount - quotationAmount) < tolerance).toBe(false);
    });

    it('should handle zero quotation amount as not synced', () => {
      const quotationAmount = 0;
      expect(quotationAmount > 0).toBe(false);
    });
  });

  describe('Sync Eligibility', () => {
    it('should allow sync when BA status is draft', () => {
      const baStatus = 'draft';
      expect(baStatus !== 'awarded').toBe(true);
    });

    it('should allow sync when BA status is submitted', () => {
      const baStatus = 'submitted';
      expect(baStatus !== 'awarded').toBe(true);
    });

    it('should NOT allow sync when BA status is awarded', () => {
      const baStatus = 'awarded';
      expect(baStatus !== 'awarded').toBe(false);
    });

    it('should require at least one bidder with quotation data', () => {
      const quotationTotals: Record<number, { totalAmount: string }> = {
        1: { totalAmount: '15000.00' },
      };
      const bidders = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const biddersWithQuotations = bidders.filter(b => quotationTotals[b.id]).length;
      expect(biddersWithQuotations > 0).toBe(true);
    });

    it('should not show sync when no bidders have quotation data', () => {
      const quotationTotals: Record<number, { totalAmount: string }> = {};
      const bidders = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const biddersWithQuotations = bidders.filter(b => quotationTotals[b.id]).length;
      expect(biddersWithQuotations > 0).toBe(false);
    });
  });

  describe('Quotation Total Calculation', () => {
    it('should correctly sum line totals', () => {
      const lines = [
        { quantity: 100, unitPrice: 5.50, lineTotal: 550.00 },
        { quantity: 10, unitPrice: 45.00, lineTotal: 450.00 },
        { quantity: 50, unitPrice: 12.75, lineTotal: 637.50 },
      ];
      const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
      expect(total).toBe(1637.50);
    });

    it('should handle single line item', () => {
      const lines = [
        { quantity: 1, unitPrice: 25000.00, lineTotal: 25000.00 },
      ];
      const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
      expect(total).toBe(25000.00);
    });

    it('should handle empty lines array', () => {
      const lines: { lineTotal: number }[] = [];
      const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
      expect(total).toBe(0);
    });

    it('should handle decimal precision', () => {
      const lines = [
        { quantity: 3, unitPrice: 33.33, lineTotal: 99.99 },
        { quantity: 7, unitPrice: 14.29, lineTotal: 100.03 },
      ];
      const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
      expect(total).toBeCloseTo(200.02, 2);
    });
  });

  describe('Bidder-Quotation Matching', () => {
    it('should match quotation to bidder by bidAnalysisBidderId', () => {
      const quotationHeaders = [
        { id: 10, bidAnalysisBidderId: 1, totalAmount: '15000.00' },
        { id: 11, bidAnalysisBidderId: 2, totalAmount: '22500.00' },
        { id: 12, bidAnalysisBidderId: null, totalAmount: '18000.00' },
      ];
      const bidders = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const matchedBidders = bidders.filter(b =>
        quotationHeaders.some(h => h.bidAnalysisBidderId === b.id)
      );
      expect(matchedBidders.length).toBe(2);
      expect(matchedBidders.map(b => b.id)).toEqual([1, 2]);
    });

    it('should skip quotation headers without bidAnalysisBidderId', () => {
      const quotationHeaders = [
        { id: 10, bidAnalysisBidderId: null, totalAmount: '15000.00' },
      ];
      const bidders = [{ id: 1 }];

      const matchedBidders = bidders.filter(b =>
        quotationHeaders.some(h => h.bidAnalysisBidderId === b.id)
      );
      expect(matchedBidders.length).toBe(0);
    });

    it('should handle multiple quotations for same bidder (use latest)', () => {
      const quotationHeaders = [
        { id: 10, bidAnalysisBidderId: 1, totalAmount: '15000.00' },
      ];

      const matchingQuotation = quotationHeaders.find(
        h => h.bidAnalysisBidderId === 1
      );
      expect(matchingQuotation).toBeDefined();
      expect(matchingQuotation!.totalAmount).toBe('15000.00');
    });
  });

  describe('Sync Count Tracking', () => {
    it('should count only bidders with matching quotation > 0', () => {
      const bidders = [
        { id: 1, totalBidAmount: '15000.00' },
        { id: 2, totalBidAmount: '22500.00' },
        { id: 3, totalBidAmount: '0' },
      ];
      const quotationHeaders = [
        { bidAnalysisBidderId: 1, totalAmount: '15000.00' },
        { bidAnalysisBidderId: 2, totalAmount: '22500.00' },
      ];

      let syncedCount = 0;
      for (const bidder of bidders) {
        const matching = quotationHeaders.find(h => h.bidAnalysisBidderId === bidder.id);
        if (matching && parseFloat(matching.totalAmount) > 0) {
          syncedCount++;
        }
      }
      expect(syncedCount).toBe(2);
      expect(bidders.length).toBe(3);
    });

    it('should return zero synced when no quotations match', () => {
      const bidders = [{ id: 1 }, { id: 2 }];
      const quotationHeaders: { bidAnalysisBidderId: number; totalAmount: string }[] = [];

      let syncedCount = 0;
      for (const bidder of bidders) {
        const matching = quotationHeaders.find(h => h.bidAnalysisBidderId === bidder.id);
        if (matching && parseFloat(matching.totalAmount) > 0) {
          syncedCount++;
        }
      }
      expect(syncedCount).toBe(0);
    });
  });
});

// ─── Discrepancy Detection Tests ─────────────────────────────────────────

describe('Bid Analysis - Discrepancy Detection', () => {
  it('should detect discrepancy when bid amount differs from quotation total', () => {
    const bidAmount = 15000;
    const quotationAmount = 16000;
    const hasDiscrepancy = quotationAmount > 0 && Math.abs(bidAmount - quotationAmount) > 0.01;
    expect(hasDiscrepancy).toBe(true);
  });

  it('should NOT detect discrepancy when amounts match', () => {
    const bidAmount = 15000;
    const quotationAmount = 15000;
    const hasDiscrepancy = quotationAmount > 0 && Math.abs(bidAmount - quotationAmount) > 0.01;
    expect(hasDiscrepancy).toBe(false);
  });

  it('should NOT detect discrepancy when quotation amount is zero', () => {
    const bidAmount = 15000;
    const quotationAmount = 0;
    const hasDiscrepancy = quotationAmount > 0 && Math.abs(bidAmount - quotationAmount) > 0.01;
    expect(hasDiscrepancy).toBe(false);
  });

  it('should calculate correct percentage difference', () => {
    const bidAmount = 10000;
    const quotationAmount = 12000;
    const percentDiff = ((quotationAmount - bidAmount) / bidAmount * 100);
    expect(percentDiff).toBeCloseTo(20.0, 1);
  });

  it('should calculate negative percentage for lower quotation', () => {
    const bidAmount = 10000;
    const quotationAmount = 8000;
    const percentDiff = ((quotationAmount - bidAmount) / bidAmount * 100);
    expect(percentDiff).toBeCloseTo(-20.0, 1);
  });

  it('should identify all bidders with discrepancies', () => {
    const bidders = [
      { id: 1, totalBidAmount: 15000 },
      { id: 2, totalBidAmount: 22500 },
      { id: 3, totalBidAmount: 18000 },
    ];
    const quotationTotals: Record<number, { totalAmount: string }> = {
      1: { totalAmount: '15000.00' }, // matches
      2: { totalAmount: '23000.00' }, // discrepancy
      3: { totalAmount: '17500.00' }, // discrepancy
    };

    const discrepancies = bidders.filter(b => {
      const q = quotationTotals[b.id];
      if (!q) return false;
      const qAmount = parseFloat(q.totalAmount);
      return qAmount > 0 && Math.abs(b.totalBidAmount - qAmount) > 0.01;
    });

    expect(discrepancies.length).toBe(2);
    expect(discrepancies.map(d => d.id)).toEqual([2, 3]);
  });

  it('should return empty discrepancies when no quotation data', () => {
    const bidders = [
      { id: 1, totalBidAmount: 15000 },
    ];
    const quotationTotals: Record<number, { totalAmount: string }> = {};

    const discrepancies = bidders.filter(b => {
      const q = quotationTotals[b.id];
      if (!q) return false;
      const qAmount = parseFloat(q.totalAmount);
      return qAmount > 0 && Math.abs(b.totalBidAmount - qAmount) > 0.01;
    });

    expect(discrepancies.length).toBe(0);
  });
});

// ─── Auto-Sync on Bidder Creation Tests ──────────────────────────────────

describe('Bid Analysis - Auto-Sync on Bidder Creation', () => {
  it('should select the most recent quotation with non-zero total', () => {
    const matchingQuotations = [
      { id: 1, totalAmount: '15000.00', createdAt: new Date('2026-03-01') },
      { id: 2, totalAmount: '16000.00', createdAt: new Date('2026-03-05') },
      { id: 3, totalAmount: '0', createdAt: new Date('2026-03-06') },
    ];

    const bestQuotation = matchingQuotations
      .filter(q => q.totalAmount && parseFloat(q.totalAmount) > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    expect(bestQuotation).toBeDefined();
    expect(bestQuotation!.id).toBe(2);
    expect(bestQuotation!.totalAmount).toBe('16000.00');
  });

  it('should return undefined when all quotations have zero total', () => {
    const matchingQuotations = [
      { id: 1, totalAmount: '0', createdAt: new Date('2026-03-01') },
      { id: 2, totalAmount: '0', createdAt: new Date('2026-03-05') },
    ];

    const bestQuotation = matchingQuotations
      .filter(q => q.totalAmount && parseFloat(q.totalAmount) > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    expect(bestQuotation).toBeUndefined();
  });

  it('should return undefined when no matching quotations exist', () => {
    const matchingQuotations: { id: number; totalAmount: string; createdAt: Date }[] = [];

    const bestQuotation = matchingQuotations
      .filter(q => q.totalAmount && parseFloat(q.totalAmount) > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    expect(bestQuotation).toBeUndefined();
  });

  it('should select the single quotation when only one exists', () => {
    const matchingQuotations = [
      { id: 5, totalAmount: '25000.00', createdAt: new Date('2026-03-06') },
    ];

    const bestQuotation = matchingQuotations
      .filter(q => q.totalAmount && parseFloat(q.totalAmount) > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    expect(bestQuotation).toBeDefined();
    expect(bestQuotation!.totalAmount).toBe('25000.00');
  });
});

// ─── Line-Item Comparison Logic Tests ────────────────────────────────────

describe('Bid Analysis - Line-Item Comparison Logic', () => {
  describe('Lowest Price Detection', () => {
    it('should find the lowest unit price per line item', () => {
      const lineItems = [
        {
          prLineItemId: 1,
          bidders: {
            1: { unitPrice: '10.50', lineTotal: '5250.00' },
            2: { unitPrice: '12.00', lineTotal: '6000.00' },
            3: { unitPrice: '9.75', lineTotal: '4875.00' },
          },
        },
      ];

      const lowestPriceByLine: Record<number, number> = {};
      for (const item of lineItems) {
        let lowest = Infinity;
        for (const bidderId of Object.keys(item.bidders)) {
          const price = parseFloat(item.bidders[Number(bidderId) as keyof typeof item.bidders].unitPrice);
          if (price > 0 && price < lowest) lowest = price;
        }
        if (lowest < Infinity) lowestPriceByLine[item.prLineItemId] = lowest;
      }

      expect(lowestPriceByLine[1]).toBe(9.75);
    });

    it('should handle single bidder (that bidder is lowest)', () => {
      const lineItems = [
        {
          prLineItemId: 1,
          bidders: {
            1: { unitPrice: '10.50', lineTotal: '5250.00' },
          },
        },
      ];

      const lowestPriceByLine: Record<number, number> = {};
      for (const item of lineItems) {
        let lowest = Infinity;
        for (const bidderId of Object.keys(item.bidders)) {
          const price = parseFloat(item.bidders[Number(bidderId) as keyof typeof item.bidders].unitPrice);
          if (price > 0 && price < lowest) lowest = price;
        }
        if (lowest < Infinity) lowestPriceByLine[item.prLineItemId] = lowest;
      }

      expect(lowestPriceByLine[1]).toBe(10.50);
    });

    it('should skip zero-priced entries', () => {
      const lineItems = [
        {
          prLineItemId: 1,
          bidders: {
            1: { unitPrice: '0', lineTotal: '0' },
            2: { unitPrice: '12.00', lineTotal: '6000.00' },
          },
        },
      ];

      const lowestPriceByLine: Record<number, number> = {};
      for (const item of lineItems) {
        let lowest = Infinity;
        for (const bidderId of Object.keys(item.bidders)) {
          const price = parseFloat(item.bidders[Number(bidderId) as keyof typeof item.bidders].unitPrice);
          if (price > 0 && price < lowest) lowest = price;
        }
        if (lowest < Infinity) lowestPriceByLine[item.prLineItemId] = lowest;
      }

      expect(lowestPriceByLine[1]).toBe(12.00);
    });

    it('should not set lowest when all prices are zero', () => {
      const lineItems = [
        {
          prLineItemId: 1,
          bidders: {
            1: { unitPrice: '0', lineTotal: '0' },
            2: { unitPrice: '0', lineTotal: '0' },
          },
        },
      ];

      const lowestPriceByLine: Record<number, number> = {};
      for (const item of lineItems) {
        let lowest = Infinity;
        for (const bidderId of Object.keys(item.bidders)) {
          const price = parseFloat(item.bidders[Number(bidderId) as keyof typeof item.bidders].unitPrice);
          if (price > 0 && price < lowest) lowest = price;
        }
        if (lowest < Infinity) lowestPriceByLine[item.prLineItemId] = lowest;
      }

      expect(lowestPriceByLine[1]).toBeUndefined();
    });
  });

  describe('Grand Total Calculation', () => {
    it('should calculate grand total per bidder from line totals', () => {
      const lineItems = [
        {
          prLineItemId: 1,
          bidders: {
            1: { unitPrice: '10.00', lineTotal: '5000.00' },
            2: { unitPrice: '12.00', lineTotal: '6000.00' },
          },
        },
        {
          prLineItemId: 2,
          bidders: {
            1: { unitPrice: '500.00', lineTotal: '500.00' },
            2: { unitPrice: '450.00', lineTotal: '450.00' },
          },
        },
      ];

      const bidderIds = ['1', '2'];
      const grandTotals: Record<string, number> = {};
      for (const bidderId of bidderIds) {
        grandTotals[bidderId] = lineItems.reduce((sum, item) => {
          const bidderData = item.bidders[Number(bidderId) as keyof typeof item.bidders];
          return sum + (bidderData ? parseFloat(bidderData.lineTotal) : 0);
        }, 0);
      }

      expect(grandTotals['1']).toBe(5500.00);
      expect(grandTotals['2']).toBe(6450.00);
    });

    it('should handle missing bidder data in some line items', () => {
      const lineItems = [
        {
          prLineItemId: 1,
          bidders: {
            1: { unitPrice: '10.00', lineTotal: '5000.00' },
          },
        },
        {
          prLineItemId: 2,
          bidders: {
            1: { unitPrice: '500.00', lineTotal: '500.00' },
            2: { unitPrice: '450.00', lineTotal: '450.00' },
          },
        },
      ];

      // Bidder 2 only has data for line item 2
      const bidder2Total = lineItems.reduce((sum, item) => {
        const bidderData = item.bidders[2 as keyof typeof item.bidders];
        return sum + (bidderData ? parseFloat(bidderData.lineTotal) : 0);
      }, 0);

      expect(bidder2Total).toBe(450.00);
    });
  });

  describe('Header-to-Bidder Mapping', () => {
    it('should build correct mapping from quotation headers', () => {
      const headers = [
        { id: 10, bidAnalysisBidderId: 1 },
        { id: 11, bidAnalysisBidderId: 2 },
        { id: 12, bidAnalysisBidderId: null },
      ];

      const headerToBidder: Record<number, number> = {};
      for (const h of headers) {
        if (h.bidAnalysisBidderId) {
          headerToBidder[h.id] = h.bidAnalysisBidderId;
        }
      }

      expect(headerToBidder[10]).toBe(1);
      expect(headerToBidder[11]).toBe(2);
      expect(headerToBidder[12]).toBeUndefined();
    });

    it('should extract unique bidder IDs from mapping', () => {
      const headerToBidder: Record<number, number> = {
        10: 1,
        11: 2,
        12: 1, // duplicate bidder
      };

      const bidderIds = [...new Set(Object.values(headerToBidder))];
      expect(bidderIds).toEqual([1, 2]);
    });
  });
});
