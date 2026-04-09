import { describe, it, expect } from 'vitest';

/**
 * Payables List Enrichment & Contract Value Validation Tests
 * 
 * Tests for:
 * 1. Source type detection (services vs goods)
 * 2. Contract/SAC reference enrichment for services payables
 * 3. PO/GRN reference enrichment for goods payables
 * 4. Contract value validation (cumulative payables vs contract value)
 * 5. Enriched response shape
 */

// ─── Mock Data ──────────────────────────────────────────────────────────────

const mockGoodsPayable = {
  id: 1,
  payableNumber: 'PAY-GOODS-001',
  purchaseRequestId: 100,
  purchaseOrderId: 200,
  contractId: null,
  sacId: null,
  grnId: 300,
  vendorId: 10,
  totalAmount: '5000.00',
  currency: 'USD',
  status: 'pending_invoice',
  dueDate: '2026-04-01',
  createdAt: '2026-03-01T00:00:00Z',
  organizationId: 1,
  operatingUnitId: 1,
};

const mockServicesPayable = {
  id: 2,
  payableNumber: 'PAY-SVC-001',
  purchaseRequestId: 100,
  purchaseOrderId: null,
  contractId: 50,
  sacId: 60,
  grnId: null,
  vendorId: 10,
  totalAmount: '15000.00',
  currency: 'USD',
  status: 'pending_invoice',
  dueDate: null,
  createdAt: '2026-03-02T00:00:00Z',
  organizationId: 1,
  operatingUnitId: 1,
};

const mockContract = {
  id: 50,
  contractNumber: 'CTR-ORG1-2026-001',
  purchaseRequestId: 100,
  vendorId: 10,
  contractValue: '50000.00',
  currency: 'USD',
};

const mockSAC = {
  id: 60,
  sacNumber: 'SAC-ORG1-2026-001',
  contractId: 50,
  approvedAmount: '15000.00',
  currency: 'USD',
  status: 'approved',
};

const mockPO = {
  id: 200,
  poNumber: 'PO-ORG1-2026-001',
};

const mockGRN = {
  id: 300,
  grnNumber: 'GRN-ORG1-2026-001',
};

const mockPR = {
  id: 100,
  prNumber: 'PR-ORG1-2026-001',
};

const mockVendor = {
  id: 10,
  name: 'Acme Consulting',
};

// ─── Helper: Enrich payable (mirrors backend logic) ─────────────────────────

function enrichPayable(
  payable: typeof mockGoodsPayable | typeof mockServicesPayable,
  lookups: {
    pr?: typeof mockPR | null;
    po?: typeof mockPO | null;
    grn?: typeof mockGRN | null;
    contract?: typeof mockContract | null;
    sac?: typeof mockSAC | null;
    vendor?: typeof mockVendor | null;
    allPayables?: Array<typeof mockServicesPayable>;
  }
) {
  const sourceType = payable.sacId ? 'services' : 'goods';

  let contractValue: string | null = null;
  let cumulativePayables: number | null = null;
  let contractExceeded = false;

  if (lookups.contract) {
    contractValue = lookups.contract.contractValue?.toString() || null;
    if (contractValue && lookups.allPayables) {
      const contractPayables = lookups.allPayables.filter(
        (p) => p.contractId === payable.contractId && p.status !== 'cancelled'
      );
      cumulativePayables = contractPayables.reduce(
        (sum, p) => sum + parseFloat(p.totalAmount?.toString() || '0'), 0
      );
      contractExceeded = cumulativePayables > parseFloat(contractValue);
    }
  }

  return {
    id: payable.id,
    payableId: payable.payableNumber || `PAY-${payable.id}`,
    prNumber: lookups.pr?.prNumber || null,
    poNumber: lookups.po?.poNumber || null,
    grnNumber: lookups.grn?.grnNumber || null,
    contractNumber: lookups.contract?.contractNumber || null,
    sacNumber: lookups.sac?.sacNumber || null,
    vendorName: lookups.vendor?.name || null,
    amount: payable.totalAmount?.toString() || '0',
    dueDate: payable.dueDate,
    status: payable.status,
    createdAt: payable.createdAt,
    sourceType,
    contractValue,
    cumulativePayables: cumulativePayables?.toString() || null,
    contractExceeded,
  };
}

// ─── Tests: Source Type Detection ───────────────────────────────────────────

describe('Payables Enrichment: Source Type Detection', () => {
  it('should detect goods payable (has PO, no SAC)', () => {
    const enriched = enrichPayable(mockGoodsPayable, {
      pr: mockPR,
      po: mockPO,
      grn: mockGRN,
      vendor: mockVendor,
    });
    expect(enriched.sourceType).toBe('goods');
  });

  it('should detect services payable (has SAC, no PO)', () => {
    const enriched = enrichPayable(mockServicesPayable, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables: [mockServicesPayable],
    });
    expect(enriched.sourceType).toBe('services');
  });

  it('should default to goods when neither SAC nor PO', () => {
    const ambiguous = { ...mockGoodsPayable, purchaseOrderId: null, sacId: null };
    const enriched = enrichPayable(ambiguous as any, { pr: mockPR, vendor: mockVendor });
    expect(enriched.sourceType).toBe('goods');
  });
});

// ─── Tests: Goods Payable Enrichment ────────────────────────────────────────

describe('Payables Enrichment: Goods/Works References', () => {
  it('should include PO number for goods payable', () => {
    const enriched = enrichPayable(mockGoodsPayable, {
      pr: mockPR,
      po: mockPO,
      grn: mockGRN,
      vendor: mockVendor,
    });
    expect(enriched.poNumber).toBe('PO-ORG1-2026-001');
  });

  it('should include GRN number for goods payable', () => {
    const enriched = enrichPayable(mockGoodsPayable, {
      pr: mockPR,
      po: mockPO,
      grn: mockGRN,
      vendor: mockVendor,
    });
    expect(enriched.grnNumber).toBe('GRN-ORG1-2026-001');
  });

  it('should have null contract/SAC for goods payable', () => {
    const enriched = enrichPayable(mockGoodsPayable, {
      pr: mockPR,
      po: mockPO,
      grn: mockGRN,
      vendor: mockVendor,
    });
    expect(enriched.contractNumber).toBeNull();
    expect(enriched.sacNumber).toBeNull();
  });

  it('should not compute contract validation for goods payable', () => {
    const enriched = enrichPayable(mockGoodsPayable, {
      pr: mockPR,
      po: mockPO,
      grn: mockGRN,
      vendor: mockVendor,
    });
    expect(enriched.contractValue).toBeNull();
    expect(enriched.cumulativePayables).toBeNull();
    expect(enriched.contractExceeded).toBe(false);
  });
});

// ─── Tests: Services Payable Enrichment ─────────────────────────────────────

describe('Payables Enrichment: Services References', () => {
  it('should include contract number for services payable', () => {
    const enriched = enrichPayable(mockServicesPayable, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables: [mockServicesPayable],
    });
    expect(enriched.contractNumber).toBe('CTR-ORG1-2026-001');
  });

  it('should include SAC number for services payable', () => {
    const enriched = enrichPayable(mockServicesPayable, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables: [mockServicesPayable],
    });
    expect(enriched.sacNumber).toBe('SAC-ORG1-2026-001');
  });

  it('should have null PO/GRN for services payable', () => {
    const enriched = enrichPayable(mockServicesPayable, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables: [mockServicesPayable],
    });
    expect(enriched.poNumber).toBeNull();
    expect(enriched.grnNumber).toBeNull();
  });
});

// ─── Tests: Contract Value Validation ───────────────────────────────────────

describe('Payables Enrichment: Contract Value Validation', () => {
  it('should not flag when cumulative is under contract value', () => {
    const enriched = enrichPayable(mockServicesPayable, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables: [mockServicesPayable], // 15000 < 50000
    });
    expect(enriched.contractExceeded).toBe(false);
    expect(parseFloat(enriched.cumulativePayables!)).toBe(15000);
    expect(parseFloat(enriched.contractValue!)).toBe(50000);
  });

  it('should flag when cumulative exceeds contract value', () => {
    const payable1 = { ...mockServicesPayable, id: 1, totalAmount: '20000.00' };
    const payable2 = { ...mockServicesPayable, id: 2, totalAmount: '20000.00' };
    const payable3 = { ...mockServicesPayable, id: 3, totalAmount: '15000.00' };
    const allPayables = [payable1, payable2, payable3]; // 55000 > 50000

    const enriched = enrichPayable(payable1, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables,
    });
    expect(enriched.contractExceeded).toBe(true);
    expect(parseFloat(enriched.cumulativePayables!)).toBe(55000);
  });

  it('should not flag when cumulative equals contract value exactly', () => {
    const payable1 = { ...mockServicesPayable, id: 1, totalAmount: '25000.00' };
    const payable2 = { ...mockServicesPayable, id: 2, totalAmount: '25000.00' };
    const allPayables = [payable1, payable2]; // 50000 = 50000

    const enriched = enrichPayable(payable1, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables,
    });
    expect(enriched.contractExceeded).toBe(false);
    expect(parseFloat(enriched.cumulativePayables!)).toBe(50000);
  });

  it('should exclude cancelled payables from cumulative calculation', () => {
    const payable1 = { ...mockServicesPayable, id: 1, totalAmount: '30000.00', status: 'pending_invoice' };
    const payable2 = { ...mockServicesPayable, id: 2, totalAmount: '30000.00', status: 'cancelled' };
    const allPayables = [payable1, payable2]; // Only 30000 counted (cancelled excluded)

    const enriched = enrichPayable(payable1, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables,
    });
    expect(enriched.contractExceeded).toBe(false);
    expect(parseFloat(enriched.cumulativePayables!)).toBe(30000);
  });

  it('should handle missing contract value gracefully', () => {
    const contractNoValue = { ...mockContract, contractValue: null };
    const enriched = enrichPayable(mockServicesPayable, {
      pr: mockPR,
      contract: contractNoValue as any,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables: [mockServicesPayable],
    });
    expect(enriched.contractExceeded).toBe(false);
    expect(enriched.contractValue).toBeNull();
  });
});

// ─── Tests: Enriched Response Shape ─────────────────────────────────────────

describe('Payables Enrichment: Response Shape', () => {
  it('should include all required fields for goods payable', () => {
    const enriched = enrichPayable(mockGoodsPayable, {
      pr: mockPR,
      po: mockPO,
      grn: mockGRN,
      vendor: mockVendor,
    });

    expect(enriched).toHaveProperty('id');
    expect(enriched).toHaveProperty('payableId');
    expect(enriched).toHaveProperty('prNumber');
    expect(enriched).toHaveProperty('poNumber');
    expect(enriched).toHaveProperty('grnNumber');
    expect(enriched).toHaveProperty('contractNumber');
    expect(enriched).toHaveProperty('sacNumber');
    expect(enriched).toHaveProperty('vendorName');
    expect(enriched).toHaveProperty('amount');
    expect(enriched).toHaveProperty('dueDate');
    expect(enriched).toHaveProperty('status');
    expect(enriched).toHaveProperty('createdAt');
    expect(enriched).toHaveProperty('sourceType');
    expect(enriched).toHaveProperty('contractValue');
    expect(enriched).toHaveProperty('cumulativePayables');
    expect(enriched).toHaveProperty('contractExceeded');
  });

  it('should include all required fields for services payable', () => {
    const enriched = enrichPayable(mockServicesPayable, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables: [mockServicesPayable],
    });

    expect(enriched).toHaveProperty('id');
    expect(enriched).toHaveProperty('payableId');
    expect(enriched).toHaveProperty('prNumber');
    expect(enriched).toHaveProperty('poNumber');
    expect(enriched).toHaveProperty('grnNumber');
    expect(enriched).toHaveProperty('contractNumber');
    expect(enriched).toHaveProperty('sacNumber');
    expect(enriched).toHaveProperty('vendorName');
    expect(enriched).toHaveProperty('amount');
    expect(enriched).toHaveProperty('sourceType');
    expect(enriched).toHaveProperty('contractValue');
    expect(enriched).toHaveProperty('cumulativePayables');
    expect(enriched).toHaveProperty('contractExceeded');
  });

  it('should handle missing lookups gracefully', () => {
    const enriched = enrichPayable(mockGoodsPayable, {});
    expect(enriched.prNumber).toBeNull();
    expect(enriched.poNumber).toBeNull();
    expect(enriched.grnNumber).toBeNull();
    expect(enriched.contractNumber).toBeNull();
    expect(enriched.sacNumber).toBeNull();
    expect(enriched.vendorName).toBeNull();
    expect(enriched.sourceType).toBe('goods');
  });

  it('should use payableNumber when available', () => {
    const enriched = enrichPayable(mockGoodsPayable, { pr: mockPR });
    expect(enriched.payableId).toBe('PAY-GOODS-001');
  });

  it('should fallback to PAY-{id} when payableNumber is null', () => {
    const noNumber = { ...mockGoodsPayable, payableNumber: null };
    const enriched = enrichPayable(noNumber as any, { pr: mockPR });
    expect(enriched.payableId).toBe('PAY-1');
  });
});

// ─── Tests: Mixed Payables (Goods + Services in same PR) ───────────────────

describe('Payables Enrichment: Mixed Workflow PR', () => {
  it('should correctly classify both goods and services payables in same list', () => {
    const goodsEnriched = enrichPayable(mockGoodsPayable, {
      pr: mockPR,
      po: mockPO,
      grn: mockGRN,
      vendor: mockVendor,
    });

    const servicesEnriched = enrichPayable(mockServicesPayable, {
      pr: mockPR,
      contract: mockContract,
      sac: mockSAC,
      vendor: mockVendor,
      allPayables: [mockServicesPayable],
    });

    expect(goodsEnriched.sourceType).toBe('goods');
    expect(servicesEnriched.sourceType).toBe('services');

    // Both should have same PR
    expect(goodsEnriched.prNumber).toBe(servicesEnriched.prNumber);
    expect(goodsEnriched.prNumber).toBe('PR-ORG1-2026-001');

    // Goods has PO/GRN, no contract/SAC
    expect(goodsEnriched.poNumber).not.toBeNull();
    expect(goodsEnriched.grnNumber).not.toBeNull();
    expect(goodsEnriched.contractNumber).toBeNull();

    // Services has contract/SAC, no PO/GRN
    expect(servicesEnriched.contractNumber).not.toBeNull();
    expect(servicesEnriched.sacNumber).not.toBeNull();
    expect(servicesEnriched.poNumber).toBeNull();
  });
});
