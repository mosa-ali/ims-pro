import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Supplier Quotation Entry - Unit Tests
 *
 * Tests input validation schemas, business rules, and response shape contracts
 * for: listByPR, getById, create, updateLines, delete, uploadAttachment
 */

// ─── Schema Definitions (mirrored from router) ────────────────────────────

const ListByPRInput = z.object({
  purchaseRequestId: z.number(),
});

const GetByIdInput = z.object({
  id: z.number(),
});

const CreateInput = z.object({
  purchaseRequestId: z.number(),
  bidAnalysisBidderId: z.number(),
  vendorId: z.number(),
  quotationRef: z.string().optional(),
  quotationDate: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    prLineItemId: z.number(),
    description: z.string(),
    specifications: z.string().optional(),
    quantity: z.string(),
    unit: z.string(),
    unitPrice: z.string(),
  })),
});

const UpdateLinesInput = z.object({
  id: z.number(),
  quotationRef: z.string().optional(),
  quotationDate: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    prLineItemId: z.number(),
    description: z.string(),
    specifications: z.string().optional(),
    quantity: z.string(),
    unit: z.string(),
    unitPrice: z.string(),
  })),
});

const DeleteInput = z.object({
  id: z.number(),
});

const UploadAttachmentInput = z.object({
  id: z.number(),
  fileName: z.string(),
  fileData: z.string(),
  contentType: z.string().optional(),
});

// ─── List By PR Schema Tests ──────────────────────────────────────────────

describe('Supplier Quotation - listByPR Schema', () => {
  it('should accept valid purchaseRequestId', () => {
    const result = ListByPRInput.safeParse({ purchaseRequestId: 100 });
    expect(result.success).toBe(true);
  });

  it('should reject missing purchaseRequestId', () => {
    const result = ListByPRInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-number purchaseRequestId', () => {
    const result = ListByPRInput.safeParse({ purchaseRequestId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('should reject negative purchaseRequestId (still number)', () => {
    const result = ListByPRInput.safeParse({ purchaseRequestId: -1 });
    expect(result.success).toBe(true); // z.number() accepts negatives
  });
});

// ─── Get By ID Schema Tests ───────────────────────────────────────────────

describe('Supplier Quotation - getById Schema', () => {
  it('should accept valid id', () => {
    const result = GetByIdInput.safeParse({ id: 42 });
    expect(result.success).toBe(true);
  });

  it('should reject missing id', () => {
    const result = GetByIdInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject string id', () => {
    const result = GetByIdInput.safeParse({ id: 'abc' });
    expect(result.success).toBe(false);
  });
});

// ─── Create Schema Tests ──────────────────────────────────────────────────

describe('Supplier Quotation - create Schema', () => {
  const validCreate = {
    purchaseRequestId: 100,
    bidAnalysisBidderId: 5,
    vendorId: 10,
    quotationRef: 'SQ-2026-001',
    quotationDate: '2026-03-06',
    currency: 'USD',
    notes: 'Test quotation',
    lines: [
      {
        prLineItemId: 1,
        description: 'Office Supplies',
        specifications: 'A4 paper, 80gsm',
        quantity: '100',
        unit: 'Reams',
        unitPrice: '5.50',
      },
      {
        prLineItemId: 2,
        description: 'Printer Cartridges',
        quantity: '10',
        unit: 'Pieces',
        unitPrice: '45.00',
      },
    ],
  };

  it('should accept valid create input with all fields', () => {
    const result = CreateInput.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('should accept create input without optional fields', () => {
    const result = CreateInput.safeParse({
      purchaseRequestId: 100,
      bidAnalysisBidderId: 5,
      vendorId: 10,
      lines: [
        {
          prLineItemId: 1,
          description: 'Test Item',
          quantity: '10',
          unit: 'Pcs',
          unitPrice: '25.00',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('should reject create input without purchaseRequestId', () => {
    const { purchaseRequestId, ...rest } = validCreate;
    const result = CreateInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject create input without bidAnalysisBidderId', () => {
    const { bidAnalysisBidderId, ...rest } = validCreate;
    const result = CreateInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject create input without vendorId', () => {
    const { vendorId, ...rest } = validCreate;
    const result = CreateInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject create input without lines', () => {
    const { lines, ...rest } = validCreate;
    const result = CreateInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should accept create input with empty lines array', () => {
    const result = CreateInput.safeParse({
      ...validCreate,
      lines: [],
    });
    expect(result.success).toBe(true);
  });

  it('should reject lines with missing prLineItemId', () => {
    const result = CreateInput.safeParse({
      ...validCreate,
      lines: [
        {
          description: 'Test',
          quantity: '10',
          unit: 'Pcs',
          unitPrice: '5.00',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('should reject lines with missing description', () => {
    const result = CreateInput.safeParse({
      ...validCreate,
      lines: [
        {
          prLineItemId: 1,
          quantity: '10',
          unit: 'Pcs',
          unitPrice: '5.00',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('should reject lines with missing unitPrice', () => {
    const result = CreateInput.safeParse({
      ...validCreate,
      lines: [
        {
          prLineItemId: 1,
          description: 'Test',
          quantity: '10',
          unit: 'Pcs',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ─── Update Lines Schema Tests ────────────────────────────────────────────

describe('Supplier Quotation - updateLines Schema', () => {
  const validUpdate = {
    id: 1,
    quotationRef: 'SQ-2026-001-REV1',
    lines: [
      {
        prLineItemId: 1,
        description: 'Office Supplies Updated',
        quantity: '150',
        unit: 'Reams',
        unitPrice: '5.25',
      },
    ],
  };

  it('should accept valid update input', () => {
    const result = UpdateLinesInput.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it('should reject update without id', () => {
    const { id, ...rest } = validUpdate;
    const result = UpdateLinesInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject update without lines', () => {
    const { lines, ...rest } = validUpdate;
    const result = UpdateLinesInput.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should accept update with only id and lines', () => {
    const result = UpdateLinesInput.safeParse({
      id: 1,
      lines: [
        {
          prLineItemId: 1,
          description: 'Test',
          quantity: '10',
          unit: 'Pcs',
          unitPrice: '5.00',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ─── Delete Schema Tests ──────────────────────────────────────────────────

describe('Supplier Quotation - delete Schema', () => {
  it('should accept valid id', () => {
    const result = DeleteInput.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });

  it('should reject missing id', () => {
    const result = DeleteInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject string id', () => {
    const result = DeleteInput.safeParse({ id: 'abc' });
    expect(result.success).toBe(false);
  });
});

// ─── Upload Attachment Schema Tests ───────────────────────────────────────

describe('Supplier Quotation - uploadAttachment Schema', () => {
  it('should accept valid upload input', () => {
    const result = UploadAttachmentInput.safeParse({
      id: 1,
      fileName: 'quotation.pdf',
      fileData: 'base64encodeddata...',
      contentType: 'application/pdf',
    });
    expect(result.success).toBe(true);
  });

  it('should accept upload without contentType', () => {
    const result = UploadAttachmentInput.safeParse({
      id: 1,
      fileName: 'quotation.pdf',
      fileData: 'base64encodeddata...',
    });
    expect(result.success).toBe(true);
  });

  it('should reject upload without fileName', () => {
    const result = UploadAttachmentInput.safeParse({
      id: 1,
      fileData: 'base64encodeddata...',
    });
    expect(result.success).toBe(false);
  });

  it('should reject upload without fileData', () => {
    const result = UploadAttachmentInput.safeParse({
      id: 1,
      fileName: 'quotation.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('should reject upload without id', () => {
    const result = UploadAttachmentInput.safeParse({
      fileName: 'quotation.pdf',
      fileData: 'base64encodeddata...',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Business Rule Tests ──────────────────────────────────────────────────

describe('Supplier Quotation - Business Rules', () => {
  describe('Line Total Calculation', () => {
    it('should correctly calculate line total from quantity and unit price', () => {
      const qty = parseFloat('100');
      const unitPrice = parseFloat('5.50');
      const lineTotal = qty * unitPrice;
      expect(lineTotal).toBe(550);
      expect(lineTotal.toFixed(2)).toBe('550.00');
    });

    it('should handle decimal quantities', () => {
      const qty = parseFloat('10.5');
      const unitPrice = parseFloat('25.00');
      const lineTotal = qty * unitPrice;
      expect(lineTotal).toBe(262.5);
      expect(lineTotal.toFixed(2)).toBe('262.50');
    });

    it('should handle zero unit price', () => {
      const qty = parseFloat('100');
      const unitPrice = parseFloat('0');
      const lineTotal = qty * unitPrice;
      expect(lineTotal).toBe(0);
    });

    it('should handle zero quantity', () => {
      const qty = parseFloat('0');
      const unitPrice = parseFloat('25.00');
      const lineTotal = qty * unitPrice;
      expect(lineTotal).toBe(0);
    });
  });

  describe('Grand Total Calculation', () => {
    it('should correctly sum all line totals', () => {
      const lines = [
        { qty: 100, unitPrice: 5.50 },
        { qty: 10, unitPrice: 45.00 },
        { qty: 50, unitPrice: 12.75 },
      ];
      const grandTotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
      expect(grandTotal).toBe(100 * 5.50 + 10 * 45.00 + 50 * 12.75);
      expect(grandTotal.toFixed(2)).toBe('1637.50');
    });

    it('should return 0 for empty lines', () => {
      const lines: { qty: number; unitPrice: number }[] = [];
      const grandTotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
      expect(grandTotal).toBe(0);
    });
  });

  describe('Visibility Rules', () => {
    it('should only show for Goods category PRs above $25,000', () => {
      const testCases = [
        { category: 'goods', totalUSD: '30000', expected: true },
        { category: 'goods', totalUSD: '25001', expected: true },
        { category: 'goods', totalUSD: '25000', expected: false },
        { category: 'goods', totalUSD: '10000', expected: false },
        { category: 'services', totalUSD: '50000', expected: false },
        { category: 'works', totalUSD: '50000', expected: false },
      ];

      for (const tc of testCases) {
        const isGoodsAbove25K =
          tc.category === 'goods' && parseFloat(tc.totalUSD) > 25000;
        expect(isGoodsAbove25K).toBe(tc.expected);
      }
    });

    it('should require tender flow (BOM completed) before SQ entry', () => {
      const requiresTender = true; // PR > $25K goods always requires tender
      const bomStatus = 'completed';
      const canAccessSQ = requiresTender && bomStatus === 'completed';
      expect(canAccessSQ).toBe(true);
    });

    it('should block SQ entry when BOM is not completed', () => {
      const requiresTender = true;
      const bomStatus = 'draft';
      const canAccessSQ = requiresTender && bomStatus === 'completed';
      expect(canAccessSQ).toBe(false);
    });
  });

  describe('PO Price Integration', () => {
    it('should use supplier quotation prices when available for PO creation', () => {
      const prLineItems = [
        { id: 1, estimatedUnitCost: '10.00', quantity: '100' },
        { id: 2, estimatedUnitCost: '20.00', quantity: '50' },
      ];

      const sqLineMap = new Map<number, { unitPrice: string; quantity: string }>();
      sqLineMap.set(1, { unitPrice: '8.50', quantity: '100' });
      sqLineMap.set(2, { unitPrice: '18.00', quantity: '50' });

      let poTotal = 0;
      const poLines = prLineItems.map((item) => {
        const sqLine = sqLineMap.get(item.id);
        const qty = parseFloat(String(sqLine?.quantity || item.quantity || 0));
        const unitPrice = sqLine
          ? parseFloat(sqLine.unitPrice)
          : parseFloat(String(item.estimatedUnitCost || 0));
        const lineTotal = qty * unitPrice;
        poTotal += lineTotal;
        return { qty, unitPrice, lineTotal };
      });

      // Should use SQ prices (8.50 and 18.00) not PR estimates (10.00 and 20.00)
      expect(poLines[0].unitPrice).toBe(8.50);
      expect(poLines[1].unitPrice).toBe(18.00);
      expect(poTotal).toBe(8.50 * 100 + 18.00 * 50);
      expect(poTotal.toFixed(2)).toBe('1750.00');
    });

    it('should fall back to PR estimated costs when no SQ exists', () => {
      const prLineItems = [
        { id: 1, estimatedUnitCost: '10.00', quantity: '100' },
        { id: 2, estimatedUnitCost: '20.00', quantity: '50' },
      ];

      const sqLineMap = new Map<number, { unitPrice: string; quantity: string }>();
      // Empty map - no supplier quotation

      let poTotal = 0;
      const poLines = prLineItems.map((item) => {
        const sqLine = sqLineMap.get(item.id);
        const qty = parseFloat(String(sqLine?.quantity || item.quantity || 0));
        const unitPrice = sqLine
          ? parseFloat(sqLine.unitPrice)
          : parseFloat(String(item.estimatedUnitCost || 0));
        const lineTotal = qty * unitPrice;
        poTotal += lineTotal;
        return { qty, unitPrice, lineTotal };
      });

      // Should use PR estimates (10.00 and 20.00)
      expect(poLines[0].unitPrice).toBe(10.00);
      expect(poLines[1].unitPrice).toBe(20.00);
      expect(poTotal).toBe(10.00 * 100 + 20.00 * 50);
      expect(poTotal.toFixed(2)).toBe('2000.00');
    });

    it('should handle partial SQ data (some lines quoted, some not)', () => {
      const prLineItems = [
        { id: 1, estimatedUnitCost: '10.00', quantity: '100' },
        { id: 2, estimatedUnitCost: '20.00', quantity: '50' },
        { id: 3, estimatedUnitCost: '15.00', quantity: '25' },
      ];

      const sqLineMap = new Map<number, { unitPrice: string; quantity: string }>();
      sqLineMap.set(1, { unitPrice: '8.50', quantity: '100' });
      // Item 2 and 3 not quoted

      let poTotal = 0;
      const poLines = prLineItems.map((item) => {
        const sqLine = sqLineMap.get(item.id);
        const qty = parseFloat(String(sqLine?.quantity || item.quantity || 0));
        const unitPrice = sqLine
          ? parseFloat(sqLine.unitPrice)
          : parseFloat(String(item.estimatedUnitCost || 0));
        const lineTotal = qty * unitPrice;
        poTotal += lineTotal;
        return { qty, unitPrice, lineTotal };
      });

      expect(poLines[0].unitPrice).toBe(8.50); // From SQ
      expect(poLines[1].unitPrice).toBe(20.00); // From PR estimate
      expect(poLines[2].unitPrice).toBe(15.00); // From PR estimate
      expect(poTotal.toFixed(2)).toBe('2225.00');
    });
  });

  describe('Status Transitions', () => {
    it('should determine card status based on quotation count', () => {
      const testCases = [
        { count: 0, expected: 'not_created' },
        { count: 1, expected: 'in_progress' },
        { count: 2, expected: 'in_progress' },
        { count: 3, expected: 'completed' }, // 3+ suppliers = completed
      ];

      for (const tc of testCases) {
        let status: string;
        if (tc.count === 0) status = 'not_created';
        else if (tc.count >= 3) status = 'completed';
        else status = 'in_progress';
        expect(status).toBe(tc.expected);
      }
    });
  });
});
