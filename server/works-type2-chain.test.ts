import { describe, it, expect } from 'vitest';

/**
 * Works Type 2 Procurement Chain Tests
 * 
 * Tests for:
 * 1. Category detection: isType2PR / isContractChain for 'works'
 * 2. PO/GRN blocking for Works category
 * 3. SAC acceptanceType auto-detection
 * 4. SAC→Payable status differentiation (Works vs Services)
 * 5. Payment card prerequisites for Works
 * 6. Card visibility rules for Works vs Goods
 */

// ─── Helper: isType2PR (mirrors type2Guards.ts) ──────────────────────────────

const TYPE2_CATEGORIES = ['services', 'consultancy', 'works'];

function isType2PR(category: string | null | undefined): boolean {
  if (!category) return false;
  return TYPE2_CATEGORIES.includes(category.toLowerCase());
}

// ─── Helper: isContractChain (mirrors ProcurementWorkspace.tsx) ───────────────

function isContractChain(category: string | null | undefined): boolean {
  if (!category) return false;
  const cat = category.toLowerCase();
  return cat === 'services' || cat === 'consultancy' || cat === 'works';
}

// ─── Helper: isGoodsCategory (mirrors ProcurementWorkspace.tsx) ───────────────

function isGoodsCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const cat = category.toLowerCase();
  return cat === 'goods' || cat === 'equipment' || cat === 'supplies';
}

// ─── Helper: Should block PO creation (mirrors logisticsRouter guard) ─────────

const PO_BLOCKED_CATEGORIES = ['services', 'consultancy', 'works'];

function shouldBlockPOCreation(category: string | null | undefined): boolean {
  if (!category) return false;
  return PO_BLOCKED_CATEGORIES.includes(category.toLowerCase());
}

// ─── Helper: Determine SAC acceptanceType (mirrors sac.ts create) ─────────────

function determineAcceptanceType(prCategory: string | null | undefined): 'SERVICE' | 'WORKS' {
  if (!prCategory) return 'SERVICE';
  return prCategory.toLowerCase() === 'works' ? 'WORKS' : 'SERVICE';
}

// ─── Helper: Determine payable initial status from SAC (mirrors automation) ───

function determinePayableStatusFromSAC(
  acceptanceType: 'SERVICE' | 'WORKS' | null | undefined,
  prCategory: string | null | undefined
): string {
  // Works PRs skip Invoice step → pending_payment
  if (acceptanceType === 'WORKS') return 'pending_payment';
  if (prCategory?.toLowerCase() === 'works') return 'pending_payment';
  // Services/Consultancy need Invoice → pending_invoice
  return 'pending_invoice';
}

// ─── Helper: Get visible cards for a PR category ─────────────────────────────

interface CardVisibility {
  contract: boolean;
  sac: boolean;
  po: boolean;
  grn: boolean;
  deliveryNotes: boolean;
  invoice: boolean; // Type 2 Invoice (SAC-bounded)
  payment: boolean;
}

function getCardVisibility(category: string | null | undefined): CardVisibility {
  const contractChain = isContractChain(category);
  const goods = isGoodsCategory(category);
  const isWorks = category?.toLowerCase() === 'works';
  
  return {
    contract: contractChain,
    sac: contractChain,
    po: !contractChain, // PO only for Goods
    grn: !contractChain, // GRN only for Goods
    deliveryNotes: !contractChain, // Delivery Notes only for Goods
    invoice: contractChain && !isWorks, // Invoice only for Services/Consultancy (not Works)
    payment: true, // Payment always visible
  };
}

// ─── Helper: Payment card enabled check ──────────────────────────────────────

function isPaymentEnabled(
  category: string | null | undefined,
  hasSacApproved: boolean,
  hasGrn: boolean
): boolean {
  return isContractChain(category) ? hasSacApproved : hasGrn;
}

// ─── Tests: Category Detection ───────────────────────────────────────────────

describe('Works Type 2: Category Detection', () => {
  it('should detect works as Type 2 PR', () => {
    expect(isType2PR('works')).toBe(true);
    expect(isType2PR('Works')).toBe(true);
    expect(isType2PR('WORKS')).toBe(true);
  });

  it('should detect services and consultancy as Type 2 PR', () => {
    expect(isType2PR('services')).toBe(true);
    expect(isType2PR('consultancy')).toBe(true);
  });

  it('should NOT detect goods as Type 2 PR', () => {
    expect(isType2PR('goods')).toBe(false);
    expect(isType2PR('equipment')).toBe(false);
    expect(isType2PR('supplies')).toBe(false);
  });

  it('should handle null/undefined category', () => {
    expect(isType2PR(null)).toBe(false);
    expect(isType2PR(undefined)).toBe(false);
    expect(isType2PR('')).toBe(false);
  });

  it('should detect works as contract chain', () => {
    expect(isContractChain('works')).toBe(true);
    expect(isContractChain('services')).toBe(true);
    expect(isContractChain('consultancy')).toBe(true);
  });

  it('should NOT detect goods as contract chain', () => {
    expect(isContractChain('goods')).toBe(false);
    expect(isContractChain('equipment')).toBe(false);
  });
});

// ─── Tests: PO/GRN Blocking ─────────────────────────────────────────────────

describe('Works Type 2: PO/GRN Blocking', () => {
  it('should block PO creation for works category', () => {
    expect(shouldBlockPOCreation('works')).toBe(true);
    expect(shouldBlockPOCreation('Works')).toBe(true);
  });

  it('should block PO creation for services and consultancy', () => {
    expect(shouldBlockPOCreation('services')).toBe(true);
    expect(shouldBlockPOCreation('consultancy')).toBe(true);
  });

  it('should allow PO creation for goods', () => {
    expect(shouldBlockPOCreation('goods')).toBe(false);
    expect(shouldBlockPOCreation('equipment')).toBe(false);
    expect(shouldBlockPOCreation('supplies')).toBe(false);
  });

  it('should allow PO creation for null/undefined category', () => {
    expect(shouldBlockPOCreation(null)).toBe(false);
    expect(shouldBlockPOCreation(undefined)).toBe(false);
  });
});

// ─── Tests: SAC AcceptanceType Auto-Detection ────────────────────────────────

describe('Works Type 2: SAC AcceptanceType', () => {
  it('should set WORKS acceptanceType for works PR', () => {
    expect(determineAcceptanceType('works')).toBe('WORKS');
    expect(determineAcceptanceType('Works')).toBe('WORKS');
  });

  it('should set SERVICE acceptanceType for services PR', () => {
    expect(determineAcceptanceType('services')).toBe('SERVICE');
    expect(determineAcceptanceType('consultancy')).toBe('SERVICE');
  });

  it('should default to SERVICE for unknown category', () => {
    expect(determineAcceptanceType(null)).toBe('SERVICE');
    expect(determineAcceptanceType(undefined)).toBe('SERVICE');
    expect(determineAcceptanceType('goods')).toBe('SERVICE');
  });
});

// ─── Tests: SAC→Payable Status Differentiation ──────────────────────────────

describe('Works Type 2: SAC→Payable Status', () => {
  it('should create payable with pending_payment for WORKS acceptanceType', () => {
    expect(determinePayableStatusFromSAC('WORKS', 'works')).toBe('pending_payment');
  });

  it('should create payable with pending_payment for works PR category (fallback)', () => {
    expect(determinePayableStatusFromSAC(null, 'works')).toBe('pending_payment');
    expect(determinePayableStatusFromSAC(undefined, 'works')).toBe('pending_payment');
  });

  it('should create payable with pending_invoice for SERVICE acceptanceType', () => {
    expect(determinePayableStatusFromSAC('SERVICE', 'services')).toBe('pending_invoice');
  });

  it('should create payable with pending_invoice for services/consultancy', () => {
    expect(determinePayableStatusFromSAC('SERVICE', 'consultancy')).toBe('pending_invoice');
    expect(determinePayableStatusFromSAC(null, 'services')).toBe('pending_invoice');
  });

  it('should default to pending_invoice when no type info', () => {
    expect(determinePayableStatusFromSAC(null, null)).toBe('pending_invoice');
    expect(determinePayableStatusFromSAC(undefined, undefined)).toBe('pending_invoice');
  });
});

// ─── Tests: Card Visibility Rules ────────────────────────────────────────────

describe('Works Type 2: Card Visibility', () => {
  it('should show Contract + SAC for works (no PO/GRN)', () => {
    const vis = getCardVisibility('works');
    expect(vis.contract).toBe(true);
    expect(vis.sac).toBe(true);
    expect(vis.po).toBe(false);
    expect(vis.grn).toBe(false);
    expect(vis.deliveryNotes).toBe(false);
  });

  it('should NOT show Invoice card for works (SAC→Payment directly)', () => {
    const vis = getCardVisibility('works');
    expect(vis.invoice).toBe(false);
  });

  it('should show Invoice card for services (SAC→Invoice→Payment)', () => {
    const vis = getCardVisibility('services');
    expect(vis.invoice).toBe(true);
    expect(vis.contract).toBe(true);
    expect(vis.sac).toBe(true);
  });

  it('should show Invoice card for consultancy', () => {
    const vis = getCardVisibility('consultancy');
    expect(vis.invoice).toBe(true);
  });

  it('should show PO + GRN for goods (no Contract/SAC)', () => {
    const vis = getCardVisibility('goods');
    expect(vis.po).toBe(true);
    expect(vis.grn).toBe(true);
    expect(vis.deliveryNotes).toBe(true);
    expect(vis.contract).toBe(false);
    expect(vis.sac).toBe(false);
  });

  it('should always show Payment card', () => {
    expect(getCardVisibility('works').payment).toBe(true);
    expect(getCardVisibility('services').payment).toBe(true);
    expect(getCardVisibility('goods').payment).toBe(true);
  });
});

// ─── Tests: Payment Card Prerequisites ───────────────────────────────────────

describe('Works Type 2: Payment Prerequisites', () => {
  it('should enable payment for works when SAC is approved', () => {
    expect(isPaymentEnabled('works', true, false)).toBe(true);
  });

  it('should NOT enable payment for works without approved SAC', () => {
    expect(isPaymentEnabled('works', false, false)).toBe(false);
  });

  it('should enable payment for services when SAC is approved', () => {
    expect(isPaymentEnabled('services', true, false)).toBe(true);
  });

  it('should enable payment for goods when GRN exists', () => {
    expect(isPaymentEnabled('goods', false, true)).toBe(true);
  });

  it('should NOT enable payment for goods without GRN', () => {
    expect(isPaymentEnabled('goods', false, false)).toBe(false);
  });

  it('should ignore GRN for contract chain categories', () => {
    // Even if GRN exists, contract chain uses SAC approval
    expect(isPaymentEnabled('works', false, true)).toBe(false);
    expect(isPaymentEnabled('services', false, true)).toBe(false);
  });
});

// ─── Tests: Works Chain Sequence ─────────────────────────────────────────────

describe('Works Type 2: Chain Sequence Validation', () => {
  it('should follow CBA → Contract → SAC → Payment for works', () => {
    const category = 'works';
    const vis = getCardVisibility(category);
    
    // Works chain: Contract → SAC → Payment (no Invoice, no PO/GRN)
    expect(vis.contract).toBe(true);
    expect(vis.sac).toBe(true);
    expect(vis.payment).toBe(true);
    expect(vis.invoice).toBe(false); // No Invoice for Works
    expect(vis.po).toBe(false);
    expect(vis.grn).toBe(false);
  });

  it('should follow CBA → Contract → SAC → Invoice → Payment for services', () => {
    const category = 'services';
    const vis = getCardVisibility(category);
    
    // Services chain: Contract → SAC → Invoice → Payment
    expect(vis.contract).toBe(true);
    expect(vis.sac).toBe(true);
    expect(vis.invoice).toBe(true); // Invoice for Services
    expect(vis.payment).toBe(true);
    expect(vis.po).toBe(false);
    expect(vis.grn).toBe(false);
  });

  it('should follow PO → GRN → Payment for goods', () => {
    const category = 'goods';
    const vis = getCardVisibility(category);
    
    // Goods chain: PO → GRN → Payment
    expect(vis.po).toBe(true);
    expect(vis.grn).toBe(true);
    expect(vis.payment).toBe(true);
    expect(vis.contract).toBe(false);
    expect(vis.sac).toBe(false);
  });
});

// ─── Tests: Due Date Default for SAC→Payable ─────────────────────────────────

describe('Works Type 2: SAC→Payable Due Date', () => {
  it('should set due date 30 days from SAC approval', () => {
    const now = new Date('2026-03-07T12:00:00Z');
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    expect(dueDateStr).toBe('2026-04-06');
  });

  it('should use YYYY-MM-DD format for due date', () => {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    expect(dueDateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── Tests: Process Badge ────────────────────────────────────────────────────

describe('Works Type 2: Process Badge', () => {
  function getProcessBadgeText(category: string | null | undefined): string | null {
    if (!category) return null;
    const cat = category.toLowerCase();
    if (cat === 'works') return 'أعمال: عقد ← شهادة قبول ← دفع';
    if (cat === 'services' || cat === 'consultancy') return 'خدمات: عقد ← شهادة قبول ← فاتورة ← دفع';
    return null;
  }

  it('should show Works chain badge for works category', () => {
    const badge = getProcessBadgeText('works');
    expect(badge).toContain('أعمال');
    expect(badge).not.toContain('فاتورة'); // No Invoice in Works chain
  });

  it('should show Services chain badge for services category', () => {
    const badge = getProcessBadgeText('services');
    expect(badge).toContain('خدمات');
    expect(badge).toContain('فاتورة'); // Invoice in Services chain
  });

  it('should return null for goods category', () => {
    expect(getProcessBadgeText('goods')).toBeNull();
  });
});
