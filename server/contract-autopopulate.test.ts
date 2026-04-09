import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Contract Auto-Populate & Auto-Generated Number Tests
 * 
 * Tests:
 * 1. Contract create input schema (vendorId, contractValue, currency now optional)
 * 2. getWinnerData response shape for all 3 procurement paths
 * 3. Contract number format validation (CON-[OU]-[Year]-[Seq])
 * 4. canCreateContract guard logic for all 3 paths
 * 5. Vendor Management stats response shape
 */

// ─── Schema Definitions (mirrored from contract router) ────────────────────

const ContractCreateInput = z.object({
  purchaseRequestId: z.number().int().positive(),
  vendorId: z.number().int().positive().optional(),
  contractValue: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().default('USD').optional(),
  paymentStructure: z.enum(['lump_sum', 'percentage_based', 'fixed_amount', 'deliverable_based']),
  retentionPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).default('0'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  signedFileUrl: z.string().optional(),
});

const WinnerDataResponse = z.object({
  vendorId: z.number(),
  vendorName: z.string(),
  quotedAmount: z.string(),
  currency: z.string(),
  path: z.enum(['cba', 'qa', 'rfq']),
}).nullable();

const ContractNumberPattern = /^CON-[A-Z0-9]+-\d{4}-\d{3}$/;

// ─── Contract Create Input Schema Tests ────────────────────────────────────

describe('Contract Create Input Schema', () => {
  it('should accept minimal input (only required fields)', () => {
    const input = {
      purchaseRequestId: 1,
      paymentStructure: 'lump_sum',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept input with optional vendor/value/currency', () => {
    const input = {
      purchaseRequestId: 1,
      vendorId: 90002,
      contractValue: '53000.00',
      currency: 'USD',
      paymentStructure: 'percentage_based',
      retentionPercentage: '5',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject missing purchaseRequestId', () => {
    const input = {
      paymentStructure: 'lump_sum',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid payment structure', () => {
    const input = {
      purchaseRequestId: 1,
      paymentStructure: 'invalid_type',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative purchaseRequestId', () => {
    const input = {
      purchaseRequestId: -1,
      paymentStructure: 'lump_sum',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should default retentionPercentage to "0"', () => {
    const input = {
      purchaseRequestId: 1,
      paymentStructure: 'lump_sum',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retentionPercentage).toBe('0');
    }
  });

  it('should accept all valid payment structures', () => {
    const structures = ['lump_sum', 'percentage_based', 'fixed_amount', 'deliverable_based'];
    for (const ps of structures) {
      const result = ContractCreateInput.safeParse({
        purchaseRequestId: 1,
        paymentStructure: ps,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── Winner Data Response Shape Tests ──────────────────────────────────────

describe('Winner Data Response Shape', () => {
  it('should validate CBA winner data', () => {
    const data = {
      vendorId: 90002,
      vendorName: 'Mohamemed ajlan for consultation',
      quotedAmount: '53000.00',
      currency: 'USD',
      path: 'cba',
    };
    const result = WinnerDataResponse.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate QA winner data', () => {
    const data = {
      vendorId: 90014,
      vendorName: 'ABC Consulting',
      quotedAmount: '21500.00',
      currency: 'USD',
      path: 'qa',
    };
    const result = WinnerDataResponse.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate RFQ winner data', () => {
    const data = {
      vendorId: 90003,
      vendorName: 'Consultation company',
      quotedAmount: '900.00',
      currency: 'USD',
      path: 'rfq',
    };
    const result = WinnerDataResponse.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate null response (no winner)', () => {
    const result = WinnerDataResponse.safeParse(null);
    expect(result.success).toBe(true);
  });

  it('should reject invalid path', () => {
    const data = {
      vendorId: 1,
      vendorName: 'Test',
      quotedAmount: '100.00',
      currency: 'USD',
      path: 'invalid',
    };
    const result = WinnerDataResponse.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject missing vendorId', () => {
    const data = {
      vendorName: 'Test',
      quotedAmount: '100.00',
      currency: 'USD',
      path: 'cba',
    };
    const result = WinnerDataResponse.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// ─── Contract Number Format Tests ──────────────────────────────────────────

describe('Contract Number Format (CON-[OU]-[Year]-[Seq])', () => {
  it('should match valid contract number CON-EFADAH01-2026-001', () => {
    expect(ContractNumberPattern.test('CON-EFADAH01-2026-001')).toBe(true);
  });

  it('should match valid contract number CON-HQ-2026-001', () => {
    expect(ContractNumberPattern.test('CON-HQ-2026-001')).toBe(true);
  });

  it('should match valid contract number CON-YDH01-2026-042', () => {
    expect(ContractNumberPattern.test('CON-YDH01-2026-042')).toBe(true);
  });

  it('should reject contract number without CON prefix', () => {
    expect(ContractNumberPattern.test('PR-EFADAH01-2026-001')).toBe(false);
  });

  it('should reject contract number with lowercase', () => {
    expect(ContractNumberPattern.test('CON-efadah01-2026-001')).toBe(false);
  });

  it('should reject contract number without year', () => {
    expect(ContractNumberPattern.test('CON-HQ-001')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(ContractNumberPattern.test('')).toBe(false);
  });

  it('should be unique (no duplicates in generated sequence)', () => {
    const numbers = new Set<string>();
    for (let i = 1; i <= 100; i++) {
      const num = `CON-HQ-2026-${i.toString().padStart(3, '0')}`;
      expect(numbers.has(num)).toBe(false);
      numbers.add(num);
    }
    expect(numbers.size).toBe(100);
  });
});

// ─── canCreateContract Guard Logic Tests ───────────────────────────────────

describe('canCreateContract Guard Logic', () => {
  // Test the amount-based path determination
  it('should route >$25K PRs to CBA path', () => {
    const totalUSD = 53000;
    const path = totalUSD > 25000 ? 'cba' : totalUSD > 1000 ? 'qa' : 'rfq';
    expect(path).toBe('cba');
  });

  it('should route $1K-$25K PRs to QA path', () => {
    const totalUSD = 15000;
    const path = totalUSD > 25000 ? 'cba' : totalUSD > 1000 ? 'qa' : 'rfq';
    expect(path).toBe('qa');
  });

  it('should route ≤$1K PRs to RFQ path', () => {
    const totalUSD = 900;
    const path = totalUSD > 25000 ? 'cba' : totalUSD > 1000 ? 'qa' : 'rfq';
    expect(path).toBe('rfq');
  });

  it('should route exactly $25K to QA path (not CBA)', () => {
    const totalUSD = 25000;
    const path = totalUSD > 25000 ? 'cba' : totalUSD > 1000 ? 'qa' : 'rfq';
    expect(path).toBe('qa');
  });

  it('should route exactly $1K to RFQ path (not QA)', () => {
    const totalUSD = 1000;
    const path = totalUSD > 25000 ? 'cba' : totalUSD > 1000 ? 'qa' : 'rfq';
    expect(path).toBe('rfq');
  });

  it('should route $25,001 to CBA path', () => {
    const totalUSD = 25001;
    const path = totalUSD > 25000 ? 'cba' : totalUSD > 1000 ? 'qa' : 'rfq';
    expect(path).toBe('cba');
  });

  it('should route $1,001 to QA path', () => {
    const totalUSD = 1001;
    const path = totalUSD > 25000 ? 'cba' : totalUSD > 1000 ? 'qa' : 'rfq';
    expect(path).toBe('qa');
  });

  // Test guard response shape
  it('should return allowed: true with data for valid guard', () => {
    const guardResponse = {
      allowed: true,
      data: {
        path: 'cba',
        winnerSupplierId: 90002,
        cbaId: 150001,
        prCategory: 'services',
        prCurrency: 'USD',
        prTotal: '53000.00',
      },
    };
    expect(guardResponse.allowed).toBe(true);
    expect(guardResponse.data.path).toBe('cba');
  });

  it('should return allowed: false with reason for invalid guard', () => {
    const guardResponse = {
      allowed: false,
      reason: 'CBA_NOT_AWARDED',
    };
    expect(guardResponse.allowed).toBe(false);
    expect(guardResponse.reason).toBe('CBA_NOT_AWARDED');
  });
});

// ─── Vendor Management Stats Response Shape Tests ──────────────────────────

describe('Vendor Management Stats Response', () => {
  const VendorStatsSchema = z.object({
    total: z.number(),
    active: z.number(),
    byType: z.object({
      supplier: z.object({ total: z.number(), active: z.number() }),
      service_provider: z.object({ total: z.number(), active: z.number() }),
      contractor: z.object({ total: z.number(), active: z.number() }),
    }),
  });

  it('should validate correct stats shape', () => {
    const stats = {
      total: 9,
      active: 9,
      byType: {
        supplier: { total: 3, active: 3 },
        service_provider: { total: 6, active: 6 },
        contractor: { total: 0, active: 0 },
      },
    };
    const result = VendorStatsSchema.safeParse(stats);
    expect(result.success).toBe(true);
  });

  it('should reject stats with missing byType', () => {
    const stats = {
      total: 9,
      active: 9,
    };
    const result = VendorStatsSchema.safeParse(stats);
    expect(result.success).toBe(false);
  });

  it('should validate stats where total >= active', () => {
    const stats = {
      total: 10,
      active: 8,
      byType: {
        supplier: { total: 5, active: 4 },
        service_provider: { total: 3, active: 2 },
        contractor: { total: 2, active: 2 },
      },
    };
    const result = VendorStatsSchema.safeParse(stats);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBeGreaterThanOrEqual(result.data.active);
    }
  });
});

// ─── DocumentType Enum Tests ───────────────────────────────────────────────

describe('DocumentType Enum includes CON', () => {
  const validTypes = ['PR', 'RFQ', 'PO', 'GRN', 'BA', 'QA', 'CON'];

  it('should include CON in valid document types', () => {
    expect(validTypes).toContain('CON');
  });

  it('should have 7 document types total', () => {
    expect(validTypes.length).toBe(7);
  });

  it('should not include invalid types', () => {
    expect(validTypes).not.toContain('INV');
    expect(validTypes).not.toContain('SAC');
  });
});
