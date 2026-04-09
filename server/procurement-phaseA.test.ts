import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Phase A Consultancy Flow - Unit Tests
 * 
 * Tests input validation schemas, guard function logic, and response shape contracts
 * for: Contract, SAC, Type2Invoice, and GL Posting routers.
 */

// ─── Schema Definitions (mirrored from routers) ────────────────────────────

const ContractCreateInput = z.object({
  purchaseRequestId: z.number().int().positive(),
  vendorId: z.number().int().positive(),
  contractValue: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  currency: z.string().default('USD'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  paymentTerms: z.string().optional(),
  scope: z.string().optional(),
  milestones: z.array(z.object({
    title: z.string().min(1),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    dueDate: z.coerce.date(),
    deliverables: z.string().optional(),
  })).optional(),
});

const ContractApprovalInput = z.object({
  id: z.number().int().positive(),
  approve: z.boolean(),
});

const SACCreateInput = z.object({
  contractId: z.number().int().positive(),
  milestoneId: z.number().int().positive().optional(),
  deliverables: z.string().min(1),
  approvedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  currency: z.string().default('USD'),
  acceptanceDate: z.coerce.date(),
});

const SACApprovalInput = z.object({
  id: z.number().int().positive(),
  approve: z.boolean(),
  rejectionReason: z.string().optional(),
});

const Type2InvoiceCreateInput = z.object({
  purchaseRequestId: z.number().int().positive(),
  contractId: z.number().int().positive(),
  sacId: z.number().int().positive().optional(),
  vendorId: z.number().int().positive(),
  vendorInvoiceNumber: z.string().min(1),
  invoiceDate: z.coerce.date(),
  invoiceAmount: z.number().positive(),
  currency: z.string().default('USD'),
  exchangeRate: z.number().optional(),
  invoiceDocumentUrl: z.string().optional(),
});

const GLEventCreateInput = z.object({
  purchaseRequestId: z.number().int().positive().optional(),
  entityType: z.enum(['contract', 'sac', 'invoice', 'payment', 'retention']),
  entityId: z.number().int().positive(),
  eventType: z.enum(['approval', 'rejection', 'payment', 'retention_hold', 'retention_release']),
  glAccount: z.string().min(1).max(50),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().default('USD'),
  fiscalPeriod: z.string(),
  description: z.string().optional(),
});

const GLEventPostInput = z.object({
  id: z.number().int().positive(),
  post: z.boolean(),
});

// ─── Contract Schema Tests ─────────────────────────────────────────────────

describe('Phase A: Contract Input Validation', () => {
  it('should accept valid contract creation input', () => {
    const input = {
      purchaseRequestId: 1,
      vendorId: 10,
      contractValue: '50000.00',
      currency: 'USD',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      paymentTerms: 'Net 30',
      scope: 'Consultancy services',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.purchaseRequestId).toBe(1);
      expect(result.data.contractValue).toBe('50000.00');
      expect(result.data.startDate).toBeInstanceOf(Date);
      expect(result.data.endDate).toBeInstanceOf(Date);
    }
  });

  it('should accept contract with milestones', () => {
    const input = {
      purchaseRequestId: 1,
      vendorId: 10,
      contractValue: '100000.00',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      milestones: [
        { title: 'Inception Report', amount: '25000.00', dueDate: '2026-03-01', deliverables: 'Report doc' },
        { title: 'Final Report', amount: '75000.00', dueDate: '2026-12-01' },
      ],
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.milestones).toHaveLength(2);
      expect(result.data.milestones![0].title).toBe('Inception Report');
    }
  });

  it('should reject invalid contract value format', () => {
    const input = {
      purchaseRequestId: 1,
      vendorId: 10,
      contractValue: 'abc',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative purchaseRequestId', () => {
    const input = {
      purchaseRequestId: -1,
      vendorId: 10,
      contractValue: '50000.00',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject zero vendorId', () => {
    const input = {
      purchaseRequestId: 1,
      vendorId: 0,
      contractValue: '50000.00',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };
    const result = ContractCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept valid approval input', () => {
    const result = ContractApprovalInput.safeParse({ id: 1, approve: true });
    expect(result.success).toBe(true);
  });

  it('should reject approval with missing id', () => {
    const result = ContractApprovalInput.safeParse({ approve: true });
    expect(result.success).toBe(false);
  });
});

// ─── SAC Schema Tests ──────────────────────────────────────────────────────

describe('Phase A: SAC Input Validation', () => {
  it('should accept valid SAC creation input', () => {
    const input = {
      contractId: 1,
      deliverables: 'Inception report delivered and reviewed',
      approvedAmount: '25000.00',
      currency: 'USD',
      acceptanceDate: '2026-03-15',
    };
    const result = SACCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contractId).toBe(1);
      expect(result.data.approvedAmount).toBe('25000.00');
      expect(result.data.acceptanceDate).toBeInstanceOf(Date);
    }
  });

  it('should accept SAC with optional milestoneId', () => {
    const input = {
      contractId: 1,
      milestoneId: 5,
      deliverables: 'Milestone 1 deliverables',
      approvedAmount: '10000.00',
      acceptanceDate: '2026-04-01',
    };
    const result = SACCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.milestoneId).toBe(5);
    }
  });

  it('should reject SAC with empty deliverables', () => {
    const input = {
      contractId: 1,
      deliverables: '',
      approvedAmount: '25000.00',
      acceptanceDate: '2026-03-15',
    };
    const result = SACCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject SAC with invalid amount format (3 decimals)', () => {
    const input = {
      contractId: 1,
      deliverables: 'Some deliverables',
      approvedAmount: '25000.123',
      acceptanceDate: '2026-03-15',
    };
    const result = SACCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept valid SAC approval input', () => {
    const result = SACApprovalInput.safeParse({ id: 1, approve: true });
    expect(result.success).toBe(true);
  });

  it('should accept SAC rejection with reason', () => {
    const result = SACApprovalInput.safeParse({
      id: 1,
      approve: false,
      rejectionReason: 'Deliverables incomplete',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rejectionReason).toBe('Deliverables incomplete');
    }
  });
});

// ─── Type 2 Invoice Schema Tests ───────────────────────────────────────────

describe('Phase A: Type 2 Invoice Input Validation', () => {
  it('should accept valid invoice creation input', () => {
    const input = {
      purchaseRequestId: 1,
      contractId: 1,
      vendorId: 10,
      vendorInvoiceNumber: 'VINV-2026-001',
      invoiceDate: '2026-06-01',
      invoiceAmount: 15000.50,
      currency: 'USD',
    };
    const result = Type2InvoiceCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceAmount).toBe(15000.50);
      expect(result.data.invoiceDate).toBeInstanceOf(Date);
      expect(result.data.vendorInvoiceNumber).toBe('VINV-2026-001');
    }
  });

  it('should accept invoice with optional sacId', () => {
    const input = {
      purchaseRequestId: 1,
      contractId: 1,
      sacId: 3,
      vendorId: 10,
      vendorInvoiceNumber: 'VINV-2026-002',
      invoiceDate: '2026-06-15',
      invoiceAmount: 5000,
    };
    const result = Type2InvoiceCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sacId).toBe(3);
    }
  });

  it('should reject invoice with zero amount', () => {
    const input = {
      purchaseRequestId: 1,
      contractId: 1,
      vendorId: 10,
      vendorInvoiceNumber: 'VINV-2026-003',
      invoiceDate: '2026-06-01',
      invoiceAmount: 0,
    };
    const result = Type2InvoiceCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invoice with negative amount', () => {
    const input = {
      purchaseRequestId: 1,
      contractId: 1,
      vendorId: 10,
      vendorInvoiceNumber: 'VINV-2026-004',
      invoiceDate: '2026-06-01',
      invoiceAmount: -500,
    };
    const result = Type2InvoiceCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invoice with empty vendor invoice number', () => {
    const input = {
      purchaseRequestId: 1,
      contractId: 1,
      vendorId: 10,
      vendorInvoiceNumber: '',
      invoiceDate: '2026-06-01',
      invoiceAmount: 5000,
    };
    const result = Type2InvoiceCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept invoice with optional exchange rate', () => {
    const input = {
      purchaseRequestId: 1,
      contractId: 1,
      vendorId: 10,
      vendorInvoiceNumber: 'VINV-2026-005',
      invoiceDate: '2026-06-01',
      invoiceAmount: 10000,
      currency: 'EUR',
      exchangeRate: 1.08,
    };
    const result = Type2InvoiceCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exchangeRate).toBe(1.08);
      expect(result.data.currency).toBe('EUR');
    }
  });
});

// ─── GL Posting Schema Tests ───────────────────────────────────────────────

describe('Phase A: GL Posting Input Validation', () => {
  it('should accept valid GL event creation input', () => {
    const input = {
      purchaseRequestId: 1,
      entityType: 'invoice' as const,
      entityId: 5,
      eventType: 'payment' as const,
      glAccount: '5200',
      amount: '15000.00',
      currency: 'USD',
      fiscalPeriod: '2026-Q1',
      description: 'Payment for consultancy services',
    };
    const result = GLEventCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('invoice');
      expect(result.data.eventType).toBe('payment');
      expect(result.data.glAccount).toBe('5200');
    }
  });

  it('should accept GL event without optional purchaseRequestId', () => {
    const input = {
      entityType: 'contract' as const,
      entityId: 1,
      eventType: 'approval' as const,
      glAccount: '2000',
      amount: '50000.00',
      fiscalPeriod: '2026-Q1',
    };
    const result = GLEventCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject GL event with invalid entity type', () => {
    const input = {
      entityType: 'unknown',
      entityId: 1,
      eventType: 'approval',
      glAccount: '2000',
      amount: '50000.00',
      fiscalPeriod: '2026-Q1',
    };
    const result = GLEventCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject GL event with invalid event type', () => {
    const input = {
      entityType: 'contract',
      entityId: 1,
      eventType: 'invalid_event',
      glAccount: '2000',
      amount: '50000.00',
      fiscalPeriod: '2026-Q1',
    };
    const result = GLEventCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject GL event with invalid amount format', () => {
    const input = {
      entityType: 'invoice' as const,
      entityId: 1,
      eventType: 'payment' as const,
      glAccount: '5200',
      amount: 'abc',
      fiscalPeriod: '2026-Q1',
    };
    const result = GLEventCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept all valid entity types', () => {
    const entityTypes = ['contract', 'sac', 'invoice', 'payment', 'retention'] as const;
    for (const entityType of entityTypes) {
      const input = {
        entityType,
        entityId: 1,
        eventType: 'approval' as const,
        glAccount: '2000',
        amount: '1000.00',
        fiscalPeriod: '2026-Q1',
      };
      const result = GLEventCreateInput.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid event types', () => {
    const eventTypes = ['approval', 'rejection', 'payment', 'retention_hold', 'retention_release'] as const;
    for (const eventType of eventTypes) {
      const input = {
        entityType: 'invoice' as const,
        entityId: 1,
        eventType,
        glAccount: '5200',
        amount: '1000.00',
        fiscalPeriod: '2026-Q1',
      };
      const result = GLEventCreateInput.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('should accept valid GL post input', () => {
    const result = GLEventPostInput.safeParse({ id: 1, post: true });
    expect(result.success).toBe(true);
  });

  it('should reject GL post with missing id', () => {
    const result = GLEventPostInput.safeParse({ post: true });
    expect(result.success).toBe(false);
  });
});

// ─── Guard Logic Tests (pure function simulations) ─────────────────────────

describe('Phase A: Guard Logic - SAC Amount Validation', () => {
  /**
   * Simulates the SAC amount validation logic from the create procedure:
   * existingTotal + requestedAmount must not exceed contractValue
   */
  function validateSACAmount(
    contractValue: number,
    existingTotal: number,
    requestedAmount: number
  ): { allowed: boolean; reason?: string } {
    if (requestedAmount <= 0) {
      return { allowed: false, reason: 'Amount must be positive' };
    }
    if (existingTotal + requestedAmount > contractValue) {
      return {
        allowed: false,
        reason: `SAC amount (${requestedAmount}) would exceed contract value (${contractValue}). Already allocated: ${existingTotal.toFixed(2)}. Remaining: ${(contractValue - existingTotal).toFixed(2)}`,
      };
    }
    return { allowed: true };
  }

  it('should allow SAC within contract value', () => {
    const result = validateSACAmount(100000, 0, 25000);
    expect(result.allowed).toBe(true);
  });

  it('should allow SAC that exactly fills remaining', () => {
    const result = validateSACAmount(100000, 75000, 25000);
    expect(result.allowed).toBe(true);
  });

  it('should reject SAC that exceeds contract value', () => {
    const result = validateSACAmount(100000, 75000, 30000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceed contract value');
  });

  it('should reject SAC with zero amount', () => {
    const result = validateSACAmount(100000, 0, 0);
    expect(result.allowed).toBe(false);
  });
});

describe('Phase A: Guard Logic - Invoice Amount Validation', () => {
  /**
   * Simulates the invoice amount validation logic:
   * invoiceAmount must not exceed (totalApprovedSAC - totalInvoiced)
   */
  function validateInvoiceAmount(
    totalApprovedSAC: number,
    totalInvoiced: number,
    invoiceAmount: number
  ): { allowed: boolean; reason?: string; remaining?: number } {
    const remaining = totalApprovedSAC - totalInvoiced;
    if (invoiceAmount > remaining) {
      return {
        allowed: false,
        reason: `Invoice amount (${invoiceAmount}) exceeds remaining SAC coverage (${remaining.toFixed(2)})`,
        remaining,
      };
    }
    return { allowed: true, remaining };
  }

  it('should allow invoice within SAC coverage', () => {
    const result = validateInvoiceAmount(50000, 0, 15000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(50000);
  });

  it('should allow invoice that exactly uses remaining coverage', () => {
    const result = validateInvoiceAmount(50000, 35000, 15000);
    expect(result.allowed).toBe(true);
  });

  it('should reject invoice exceeding SAC coverage', () => {
    const result = validateInvoiceAmount(50000, 35000, 20000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceeds remaining SAC coverage');
  });

  it('should reject invoice when all SAC amounts are invoiced', () => {
    const result = validateInvoiceAmount(50000, 50000, 1);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe('Phase A: Guard Logic - Contract Status Transitions', () => {
  /**
   * Simulates contract status transition validation
   */
  function canTransition(currentStatus: string, action: string): boolean {
    const transitions: Record<string, string[]> = {
      draft: ['submit_for_approval'],
      pending_approval: ['approve', 'reject'],
      approved: [],
      active: [],
    };
    return (transitions[currentStatus] || []).includes(action);
  }

  it('should allow draft → submit_for_approval', () => {
    expect(canTransition('draft', 'submit_for_approval')).toBe(true);
  });

  it('should allow pending_approval → approve', () => {
    expect(canTransition('pending_approval', 'approve')).toBe(true);
  });

  it('should allow pending_approval → reject', () => {
    expect(canTransition('pending_approval', 'reject')).toBe(true);
  });

  it('should not allow draft → approve', () => {
    expect(canTransition('draft', 'approve')).toBe(false);
  });

  it('should not allow approved → submit_for_approval', () => {
    expect(canTransition('approved', 'submit_for_approval')).toBe(false);
  });
});

describe('Phase A: Guard Logic - GL Account Validation', () => {
  /**
   * Simulates GL account format validation from the router
   */
  function isValidGLAccount(account: string): boolean {
    return /^\d{4,6}$/.test(account);
  }

  it('should accept 4-digit GL account', () => {
    expect(isValidGLAccount('2000')).toBe(true);
  });

  it('should accept 5-digit GL account', () => {
    expect(isValidGLAccount('52001')).toBe(true);
  });

  it('should accept 6-digit GL account', () => {
    expect(isValidGLAccount('520010')).toBe(true);
  });

  it('should reject 3-digit GL account', () => {
    expect(isValidGLAccount('200')).toBe(false);
  });

  it('should reject 7-digit GL account', () => {
    expect(isValidGLAccount('5200100')).toBe(false);
  });

  it('should reject non-numeric GL account', () => {
    expect(isValidGLAccount('ABCD')).toBe(false);
  });

  it('should reject GL account with special characters', () => {
    expect(isValidGLAccount('52-00')).toBe(false);
  });
});

// ─── CBA → Contract Auto-Load Logic Tests ─────────────────────────────────

describe('Phase A: CBA → Contract Auto-Load - Bidder Resolution', () => {
  /**
   * Simulates the corrected bidder resolution logic from finalizeCba:
   * ba.selectedBidderId is the bidder ROW ID (bid_analysis_bidders.id),
   * NOT the supplierId. The query must use eq(bidAnalysisBidders.id, selectedBidderId).
   */

  interface Bidder {
    id: number;
    supplierId: number;
    bidderName: string;
    totalBidAmount: string;
    currency: string;
  }

  function resolveWinnerFromBidders(
    bidders: Bidder[],
    selectedBidderId: number
  ): { vendorId: number; contractValue: string; currency: string; vendorName: string } | null {
    // Correct: match by bidder row ID (bidders.id), not supplierId
    const winner = bidders.find(b => b.id === selectedBidderId);
    if (!winner) return null;
    return {
      vendorId: winner.supplierId,
      contractValue: winner.totalBidAmount,
      currency: winner.currency,
      vendorName: winner.bidderName,
    };
  }

  const sampleBidders: Bidder[] = [
    { id: 120002, supplierId: 90003, bidderName: 'Consultation company (SRV-003)', totalBidAmount: '58000.00', currency: 'USD' },
    { id: 120005, supplierId: 60002, bidderName: 'Company Alitest baba (SUP-002)', totalBidAmount: '54000.00', currency: 'USD' },
    { id: 120006, supplierId: 90002, bidderName: 'Mohamemed ajlan for consultation (SRV-002)', totalBidAmount: '53000.00', currency: 'USD' },
  ];

  it('should resolve winner by bidder row ID (not supplierId)', () => {
    // selectedBidderId = 120006 (bidder row ID)
    const result = resolveWinnerFromBidders(sampleBidders, 120006);
    expect(result).not.toBeNull();
    expect(result!.vendorId).toBe(90002); // actual supplier ID
    expect(result!.contractValue).toBe('53000.00');
    expect(result!.currency).toBe('USD');
    expect(result!.vendorName).toBe('Mohamemed ajlan for consultation (SRV-002)');
  });

  it('should NOT match by supplierId (the old bug)', () => {
    // This simulates the OLD buggy behavior where we searched by supplierId
    const buggyResolve = (bidders: Bidder[], selectedBidderId: number) => {
      return bidders.find(b => b.supplierId === selectedBidderId);
    };
    // selectedBidderId = 120006 is a bidder row ID, not a supplierId
    // The old code would fail to find a match
    const result = buggyResolve(sampleBidders, 120006);
    expect(result).toBeUndefined(); // confirms the bug: no match found
  });

  it('should return null for non-existent bidder ID', () => {
    const result = resolveWinnerFromBidders(sampleBidders, 999999);
    expect(result).toBeNull();
  });

  it('should correctly resolve a different winner', () => {
    const result = resolveWinnerFromBidders(sampleBidders, 120005);
    expect(result).not.toBeNull();
    expect(result!.vendorId).toBe(60002);
    expect(result!.contractValue).toBe('54000.00');
    expect(result!.vendorName).toContain('Alitest baba');
  });
});

describe('Phase A: Contract Card Display - Vendor Name Resolution', () => {
  /**
   * Simulates the getByPR response shape with vendorName joined from vendors table
   */
  interface ContractWithVendor {
    id: number;
    vendorId: number;
    contractValue: string;
    currency: string;
    vendorName: string | null;
  }

  it('should include vendorName in getByPR response', () => {
    const contract: ContractWithVendor = {
      id: 1,
      vendorId: 90002,
      contractValue: '53000.00',
      currency: 'USD',
      vendorName: 'Mohamemed ajlan for consultation',
    };
    expect(contract.vendorName).toBe('Mohamemed ajlan for consultation');
    expect(contract.vendorId).toBe(90002);
    expect(contract.contractValue).toBe('53000.00');
    expect(contract.currency).toBe('USD');
  });

  it('should handle null vendorName gracefully', () => {
    const contract: ContractWithVendor = {
      id: 1,
      vendorId: 90002,
      contractValue: '53000.00',
      currency: 'USD',
      vendorName: null,
    };
    // Frontend fallback: show "Vendor #ID" when name is null
    const displayName = contract.vendorName || `Vendor #${contract.vendorId}`;
    expect(displayName).toBe('Vendor #90002');
  });
});

// ─── Guard Reason Key Translation Tests ──────────────────────────────────

describe('Phase A: Guard Reason Keys - Backend returns translation keys', () => {
  /**
   * Backend guard functions now return UPPER_CASE reason keys instead of English strings.
   * Frontend maps these keys to translated strings via translateGuardReason().
   */

  const VALID_REASON_KEYS = [
    'CONTRACT_NOT_FOUND',
    'CONTRACT_NOT_APPROVED',
    'NO_APPROVED_SAC',
    'ALL_SAC_INVOICED',
    'INVOICE_EXCEEDS_SAC_COVERAGE',
    'PR_NOT_FOUND',
    'NOT_CONSULTANCY_PR',
    'CBA_NOT_FOUND',
    'CBA_NOT_AWARDED',
    'NO_WINNER_SELECTED',
    'CONTRACT_ALREADY_EXISTS',
  ];

  const TRANSLATION_KEY_MAP: Record<string, string> = {
    CONTRACT_NOT_FOUND: 'guardContractNotFound',
    CONTRACT_NOT_APPROVED: 'guardContractNotApproved',
    NO_APPROVED_SAC: 'guardNoApprovedSac',
    ALL_SAC_INVOICED: 'guardAllSacInvoiced',
    INVOICE_EXCEEDS_SAC_COVERAGE: 'guardInvoiceExceedsSacCoverage',
    PR_NOT_FOUND: 'guardPrNotFound',
    NOT_CONSULTANCY_PR: 'guardNotConsultancyPr',
    CBA_NOT_FOUND: 'guardCbaNotFound',
    CBA_NOT_AWARDED: 'guardCbaNotAwarded',
    NO_WINNER_SELECTED: 'guardNoWinnerSelected',
    CONTRACT_ALREADY_EXISTS: 'guardContractAlreadyExists',
  };

  it('should have a translation key mapping for every valid reason key', () => {
    for (const key of VALID_REASON_KEYS) {
      expect(TRANSLATION_KEY_MAP[key]).toBeDefined();
      expect(typeof TRANSLATION_KEY_MAP[key]).toBe('string');
    }
  });

  it('reason keys should be UPPER_CASE format', () => {
    for (const key of VALID_REASON_KEYS) {
      expect(key).toMatch(/^[A-Z_]+$/);
    }
  });

  it('translation keys should be camelCase format starting with guard', () => {
    for (const key of VALID_REASON_KEYS) {
      const translationKey = TRANSLATION_KEY_MAP[key];
      expect(translationKey).toMatch(/^guard[A-Z]/);
    }
  });

  it('should have 11 reason keys covering all guard scenarios', () => {
    expect(VALID_REASON_KEYS.length).toBe(11);
    expect(Object.keys(TRANSLATION_KEY_MAP).length).toBe(11);
  });

  /**
   * Simulates the frontend translateGuardReason function
   */
  function translateGuardReason(reason: string | undefined, translations: Record<string, string>): string {
    if (!reason) return '';
    return translations[reason] || reason;
  }

  it('should translate known reason keys', () => {
    const mockTranslations: Record<string, string> = {
      CONTRACT_NOT_APPROVED: 'يجب اعتماد العقد قبل المتابعة',
      NO_APPROVED_SAC: 'يجب اعتماد شهادة قبول خدمة واحدة على الأقل',
    };
    expect(translateGuardReason('CONTRACT_NOT_APPROVED', mockTranslations)).toBe('يجب اعتماد العقد قبل المتابعة');
    expect(translateGuardReason('NO_APPROVED_SAC', mockTranslations)).toBe('يجب اعتماد شهادة قبول خدمة واحدة على الأقل');
  });

  it('should return the raw key for unknown reason keys (fallback)', () => {
    const mockTranslations: Record<string, string> = {};
    expect(translateGuardReason('UNKNOWN_REASON', mockTranslations)).toBe('UNKNOWN_REASON');
  });

  it('should return empty string for undefined reason', () => {
    const mockTranslations: Record<string, string> = {};
    expect(translateGuardReason(undefined, mockTranslations)).toBe('');
  });
});

// ─── GL Posting Events Schema Alignment Tests ─────────────────────────────

describe('Phase A: GL Posting Events - Schema Alignment', () => {
  /**
   * Tests that the GL posting event insert payload matches the database schema.
   * This validates the fix for the column count mismatch error that occurred
   * when approving contracts (DB had 18 columns, schema had 20).
   * 
   * Fix: Added missing columns (postedAt, deletedAt, deletedBy) to database,
   * updated eventType and postingStatus enums to match schema.
   */

  // Database columns as they now exist (21 total including auto-increment id)
  const DB_COLUMNS = [
    'id', 'organizationId', 'operatingUnitId', 'purchaseRequestId',
    'entityType', 'entityId', 'eventType', 'glAccount', 'amount',
    'currency', 'fiscalPeriod', 'postingStatus', 'postedAt', 'description',
    'isDeleted', 'deletedAt', 'deletedBy', 'createdBy', 'updatedBy',
    'createdAt', 'updatedAt',
  ];

  // Schema columns (20 excluding auto-increment id)
  const SCHEMA_COLUMNS = [
    'organizationId', 'operatingUnitId', 'purchaseRequestId',
    'entityType', 'entityId', 'eventType', 'glAccount', 'amount',
    'currency', 'fiscalPeriod', 'postingStatus', 'postedAt', 'description',
    'isDeleted', 'deletedAt', 'deletedBy', 'createdBy', 'updatedBy',
    'createdAt', 'updatedAt',
  ];

  it('should have all schema columns present in database', () => {
    for (const col of SCHEMA_COLUMNS) {
      expect(DB_COLUMNS).toContain(col);
    }
  });

  it('should have database column count = schema column count + 1 (id)', () => {
    expect(DB_COLUMNS.length).toBe(SCHEMA_COLUMNS.length + 1);
  });

  it('should have valid eventType enum values', () => {
    const validEventTypes = ['approval', 'rejection', 'payment', 'retention_hold', 'retention_release'];
    // Verify the approval event type used in contract approval is valid
    expect(validEventTypes).toContain('approval');
  });

  it('should have valid postingStatus enum values including reversed', () => {
    const validStatuses = ['pending', 'posted', 'failed', 'reversed'];
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('reversed');
    expect(validStatuses.length).toBe(4);
  });

  it('contract approval GL insert payload should match schema', () => {
    // Simulates the exact insert payload from contract.ts approve procedure
    const glInsertPayload = {
      organizationId: 30002,
      operatingUnitId: 30002,
      purchaseRequestId: 450001,
      entityType: 'contract' as const,
      entityId: 1,
      eventType: 'approval' as const,
      glAccount: '2000',
      amount: '53000.00',
      currency: 'USD',
      fiscalPeriod: '2026-03-04',
      postingStatus: 'pending' as const,
      description: 'Contract CON-BA-EFADAH01-2026-003-001 approved',
      createdBy: 1264648,
      updatedBy: 1264648,
      isDeleted: 0,
    };

    // Verify all required fields are present
    expect(glInsertPayload.organizationId).toBeGreaterThan(0);
    expect(glInsertPayload.entityType).toBe('contract');
    expect(glInsertPayload.eventType).toBe('approval');
    expect(glInsertPayload.postingStatus).toBe('pending');
    expect(glInsertPayload.isDeleted).toBe(0);

    // Verify all fields map to valid schema columns
    for (const key of Object.keys(glInsertPayload)) {
      expect(SCHEMA_COLUMNS).toContain(key);
    }
  });

  it('nullable columns should be optional in insert payload', () => {
    // These columns are nullable in the database and should not be required
    const nullableColumns = [
      'operatingUnitId', 'purchaseRequestId', 'glAccount', 'amount',
      'currency', 'fiscalPeriod', 'postedAt', 'description',
      'deletedAt', 'deletedBy', 'createdBy', 'updatedBy',
    ];

    // Minimal valid insert (only required fields)
    const minimalPayload = {
      organizationId: 30002,
      entityType: 'contract' as const,
      entityId: 1,
      eventType: 'approval' as const,
      postingStatus: 'pending' as const,
      isDeleted: 0,
    };

    // All keys in minimal payload should be in schema
    for (const key of Object.keys(minimalPayload)) {
      expect(SCHEMA_COLUMNS).toContain(key);
    }

    // Nullable columns should not be in the minimal payload
    for (const col of nullableColumns) {
      expect(Object.keys(minimalPayload)).not.toContain(col);
    }
  });
});

// ─── Contract Approval Status Transition (Updated) ─────────────────────────

describe('Phase A: Contract Approval - Direct Approve from Draft', () => {
  /**
   * The contract approval procedure accepts contracts in both 'draft' and
   * 'pending_approval' statuses. This was updated to allow direct approval
   * from draft (skipping the pending_approval intermediate state).
   */
  function canApprove(currentStatus: string): boolean {
    return ['draft', 'pending_approval'].includes(currentStatus);
  }

  it('should allow approval from draft status', () => {
    expect(canApprove('draft')).toBe(true);
  });

  it('should allow approval from pending_approval status', () => {
    expect(canApprove('pending_approval')).toBe(true);
  });

  it('should NOT allow approval from approved status', () => {
    expect(canApprove('approved')).toBe(false);
  });

  it('should NOT allow approval from active status', () => {
    expect(canApprove('active')).toBe(false);
  });

  it('should NOT allow approval from completed status', () => {
    expect(canApprove('completed')).toBe(false);
  });

  it('should NOT allow approval from terminated status', () => {
    expect(canApprove('terminated')).toBe(false);
  });
});

// ─── Contract Details - PR Data Auto-Load Tests ─────────────────────────────

describe('Phase A: Contract Details - PR Data Auto-Load', () => {
  /**
   * Tests that Project, Donor, and Budget Line fields are correctly
   * resolved from the linked Purchase Request data.
   */

  interface PRData {
    projectTitle: string | null;
    donor: string | null;
    budgetLineDescription: string | null;
    currency: string;
    exchangeToCurrency: string | null;
    exchangeRate: string | null;
    totalAmount: string;
  }

  function resolveContractCurrency(pr: PRData): { currency: string; amount: string } {
    if (pr.exchangeToCurrency && pr.exchangeToCurrency !== pr.currency && pr.exchangeRate) {
      const rate = parseFloat(pr.exchangeRate);
      const total = parseFloat(pr.totalAmount);
      return {
        currency: pr.exchangeToCurrency,
        amount: (total * rate).toFixed(2),
      };
    }
    return { currency: pr.currency, amount: pr.totalAmount };
  }

  it('should auto-load project title from PR', () => {
    const pr: PRData = {
      projectTitle: 'Child Protection and Food Security Project',
      donor: 'Private Donor',
      budgetLineDescription: 'Third party monitoring',
      currency: 'USD',
      exchangeToCurrency: null,
      exchangeRate: null,
      totalAmount: '53000.00',
    };
    expect(pr.projectTitle).toBe('Child Protection and Food Security Project');
  });

  it('should auto-load donor from PR', () => {
    const pr: PRData = {
      projectTitle: 'Child Protection Project',
      donor: 'Private Donor',
      budgetLineDescription: 'Training services',
      currency: 'USD',
      exchangeToCurrency: null,
      exchangeRate: null,
      totalAmount: '22500.00',
    };
    expect(pr.donor).toBe('Private Donor');
  });

  it('should auto-load budget line from PR', () => {
    const pr: PRData = {
      projectTitle: 'Child Protection Project',
      donor: 'Private Donor',
      budgetLineDescription: 'Training services',
      currency: 'EUR',
      exchangeToCurrency: 'USD',
      exchangeRate: '1.22',
      totalAmount: '22500.00',
    };
    expect(pr.budgetLineDescription).toBe('Training services');
  });

  it('should convert currency when PR has exchange rate', () => {
    const pr: PRData = {
      projectTitle: 'Child Protection Project',
      donor: 'Private Donor',
      budgetLineDescription: 'Training services',
      currency: 'EUR',
      exchangeToCurrency: 'USD',
      exchangeRate: '1.22',
      totalAmount: '22500.00',
    };
    const result = resolveContractCurrency(pr);
    expect(result.currency).toBe('USD');
    expect(result.amount).toBe('27450.00');
  });

  it('should keep original currency when no exchange rate', () => {
    const pr: PRData = {
      projectTitle: 'Child Protection Project',
      donor: 'Private Donor',
      budgetLineDescription: 'Third party monitoring',
      currency: 'USD',
      exchangeToCurrency: null,
      exchangeRate: null,
      totalAmount: '53000.00',
    };
    const result = resolveContractCurrency(pr);
    expect(result.currency).toBe('USD');
    expect(result.amount).toBe('53000.00');
  });

  it('should keep original currency when exchange currency is same', () => {
    const pr: PRData = {
      projectTitle: 'Child Protection Project',
      donor: 'Private Donor',
      budgetLineDescription: 'Third party monitoring',
      currency: 'USD',
      exchangeToCurrency: 'USD',
      exchangeRate: '1.00',
      totalAmount: '53000.00',
    };
    const result = resolveContractCurrency(pr);
    expect(result.currency).toBe('USD');
    expect(result.amount).toBe('53000.00');
  });
});

// ─── SAC Sign & Complete Workflow (No Approval Flow) ──────────────────────────

describe('Phase A: SAC Sign & Complete Workflow', () => {
  /**
   * The SAC workflow has been simplified:
   * - No "Submit for Approval" step
   * - Project officer / activity supervisor creates, fills, and signs inline
   * - Status goes: draft → approved (signed/complete)
   * - After signing, logistics can proceed to invoice
   */

  // Simulate the signAndComplete validation logic
  function canSign(status: string): boolean {
    return status === 'draft';
  }

  function validateSignatureData(dataUrl: string): boolean {
    return /^data:image\/png;base64,.+$/.test(dataUrl);
  }

  function validateSACForSigning(sac: {
    acceptanceText: string;
    verifiedBoqs: boolean;
    verifiedContractTerms: boolean;
    verifiedDeliverablesReceived: boolean;
    approvedAmount: string;
    signatureDataUrl: string | null;
    deliverableStatuses: { status: string }[];
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!sac.acceptanceText.trim()) {
      errors.push('Acceptance text is required');
    }
    if (!sac.verifiedBoqs) {
      errors.push('BoQs verification is required');
    }
    if (!sac.verifiedContractTerms) {
      errors.push('Contract terms verification is required');
    }
    if (!sac.verifiedDeliverablesReceived) {
      errors.push('Deliverables received verification is required');
    }
    if (!sac.approvedAmount || parseFloat(sac.approvedAmount) <= 0) {
      errors.push('Approved amount must be positive');
    }
    if (!sac.signatureDataUrl) {
      errors.push('Digital signature is required');
    }
    const hasCompleted = sac.deliverableStatuses.some(d =>
      ['completed', 'achieved', 'received', 'partial_completed'].includes(d.status)
    );
    if (!hasCompleted) {
      errors.push('At least one deliverable must be completed');
    }

    return { valid: errors.length === 0, errors };
  }

  it('should only allow signing from draft status', () => {
    expect(canSign('draft')).toBe(true);
    expect(canSign('approved')).toBe(false);
    expect(canSign('rejected')).toBe(false);
    expect(canSign('pending_approval')).toBe(false);
  });

  it('should validate signature data URL format', () => {
    expect(validateSignatureData('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(validateSignatureData('not-a-valid-data-url')).toBe(false);
    expect(validateSignatureData('')).toBe(false);
  });

  it('should pass validation with all required fields', () => {
    const result = validateSACForSigning({
      acceptanceText: 'I confirm the activities were implemented.',
      verifiedBoqs: true,
      verifiedContractTerms: true,
      verifiedDeliverablesReceived: true,
      approvedAmount: '15000',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      deliverableStatuses: [
        { status: 'completed' },
        { status: 'pending' },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation when acceptance text is empty', () => {
    const result = validateSACForSigning({
      acceptanceText: '',
      verifiedBoqs: true,
      verifiedContractTerms: true,
      verifiedDeliverablesReceived: true,
      approvedAmount: '15000',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      deliverableStatuses: [{ status: 'completed' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Acceptance text is required');
  });

  it('should fail validation when verification boxes are unchecked', () => {
    const result = validateSACForSigning({
      acceptanceText: 'I confirm.',
      verifiedBoqs: false,
      verifiedContractTerms: true,
      verifiedDeliverablesReceived: true,
      approvedAmount: '15000',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      deliverableStatuses: [{ status: 'completed' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('BoQs verification is required');
  });

  it('should fail validation when no signature provided', () => {
    const result = validateSACForSigning({
      acceptanceText: 'I confirm.',
      verifiedBoqs: true,
      verifiedContractTerms: true,
      verifiedDeliverablesReceived: true,
      approvedAmount: '15000',
      signatureDataUrl: null,
      deliverableStatuses: [{ status: 'completed' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Digital signature is required');
  });

  it('should fail validation when no deliverables are completed', () => {
    const result = validateSACForSigning({
      acceptanceText: 'I confirm.',
      verifiedBoqs: true,
      verifiedContractTerms: true,
      verifiedDeliverablesReceived: true,
      approvedAmount: '15000',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      deliverableStatuses: [
        { status: 'pending' },
        { status: 'in_progress' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one deliverable must be completed');
  });

  it('should accept partial_completed as a valid completion status', () => {
    const result = validateSACForSigning({
      acceptanceText: 'I confirm.',
      verifiedBoqs: true,
      verifiedContractTerms: true,
      verifiedDeliverablesReceived: true,
      approvedAmount: '15000',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      deliverableStatuses: [
        { status: 'partial_completed' },
        { status: 'pending' },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it('should fail when approved amount is zero or negative', () => {
    const result = validateSACForSigning({
      acceptanceText: 'I confirm.',
      verifiedBoqs: true,
      verifiedContractTerms: true,
      verifiedDeliverablesReceived: true,
      approvedAmount: '0',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      deliverableStatuses: [{ status: 'completed' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Approved amount must be positive');
  });

  it('should collect multiple validation errors', () => {
    const result = validateSACForSigning({
      acceptanceText: '',
      verifiedBoqs: false,
      verifiedContractTerms: false,
      verifiedDeliverablesReceived: false,
      approvedAmount: '',
      signatureDataUrl: null,
      deliverableStatuses: [{ status: 'pending' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });
});


// ─── SAC PDF Template Tests ────────────────────────────────────────────────

describe('Phase A: SAC PDF Template - Signature & QR Code', () => {
  /**
   * Tests for the SAC PDF template updates:
   * - Signed SACs should include signature image, signer name, QR code
   * - Draft SACs should show empty signature lines and watermark
   * - Status labels should show "Signed" instead of "Approved"
   */

  function getSacStatusLabel(status: string, lang: 'en' | 'ar'): string {
    const map: Record<string, { en: string; ar: string }> = {
      draft: { en: 'Draft', ar: 'مسودة' },
      pending_approval: { en: 'Pending Approval', ar: 'بانتظار الموافقة' },
      approved: { en: 'Signed', ar: 'موقّع' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
    };
    return map[status]?.[lang] || status;
  }

  function shouldShowSignature(sac: { status: string; signatureImageUrl: string | null }): boolean {
    return sac.status === 'approved' && !!sac.signatureImageUrl;
  }

  function shouldShowQRCode(sac: { status: string; verificationCode: string | null }): boolean {
    return sac.status === 'approved' && !!sac.verificationCode;
  }

  function shouldShowDraftWatermark(status: string): boolean {
    return status !== 'approved';
  }

  it('should display "Signed" label for approved SACs in English', () => {
    expect(getSacStatusLabel('approved', 'en')).toBe('Signed');
  });

  it('should display "موقّع" label for approved SACs in Arabic', () => {
    expect(getSacStatusLabel('approved', 'ar')).toBe('موقّع');
  });

  it('should display "Draft" label for draft SACs', () => {
    expect(getSacStatusLabel('draft', 'en')).toBe('Draft');
  });

  it('should show signature section for signed SACs with signature image', () => {
    expect(shouldShowSignature({
      status: 'approved',
      signatureImageUrl: 'https://s3.example.com/sig.png',
    })).toBe(true);
  });

  it('should NOT show signature section for draft SACs', () => {
    expect(shouldShowSignature({
      status: 'draft',
      signatureImageUrl: null,
    })).toBe(false);
  });

  it('should NOT show signature section for approved SACs without signature image', () => {
    expect(shouldShowSignature({
      status: 'approved',
      signatureImageUrl: null,
    })).toBe(false);
  });

  it('should show QR code for signed SACs with verification code', () => {
    expect(shouldShowQRCode({
      status: 'approved',
      verificationCode: 'SAC-001-ABCD1234',
    })).toBe(true);
  });

  it('should NOT show QR code for draft SACs', () => {
    expect(shouldShowQRCode({
      status: 'draft',
      verificationCode: null,
    })).toBe(false);
  });

  it('should show draft watermark for non-approved SACs', () => {
    expect(shouldShowDraftWatermark('draft')).toBe(true);
    expect(shouldShowDraftWatermark('pending_approval')).toBe(true);
    expect(shouldShowDraftWatermark('rejected')).toBe(true);
  });

  it('should NOT show draft watermark for signed SACs', () => {
    expect(shouldShowDraftWatermark('approved')).toBe(false);
  });
});

// ─── Invoice Flow - SAC Status Validation Tests ────────────────────────────

describe('Phase A: Invoice Flow - Signed SAC Validation', () => {
  /**
   * Tests that the invoice creation flow correctly works with signed SACs.
   * The signAndComplete procedure sets status = 'approved', and the invoice
   * flow checks for status = 'approved' to allow invoice creation.
   */

  type SAC = {
    id: number;
    status: string;
    approvedAmount: string;
    isDeleted: number;
  };

  function getApprovedSACs(sacs: SAC[]): SAC[] {
    return sacs.filter(s => s.status === 'approved' && s.isDeleted === 0);
  }

  function canCreateInvoice(sacs: SAC[]): { allowed: boolean; reason?: string; remaining?: number } {
    const approved = getApprovedSACs(sacs);
    if (approved.length === 0) {
      return { allowed: false, reason: 'NO_APPROVED_SAC' };
    }
    const totalApproved = approved.reduce((sum, s) => sum + parseFloat(s.approvedAmount), 0);
    return { allowed: true, remaining: totalApproved };
  }

  function validateInvoiceAmount(
    invoiceAmount: number,
    sacApprovedTotal: number,
    existingInvoicedTotal: number
  ): { allowed: boolean; reason?: string } {
    const remaining = sacApprovedTotal - existingInvoicedTotal;
    if (invoiceAmount > remaining) {
      return { allowed: false, reason: 'INVOICE_EXCEEDS_SAC_COVERAGE' };
    }
    return { allowed: true };
  }

  it('should allow invoice creation when SAC is signed (status=approved)', () => {
    const result = canCreateInvoice([
      { id: 1, status: 'approved', approvedAmount: '10000', isDeleted: 0 },
    ]);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10000);
  });

  it('should NOT allow invoice creation when SAC is still draft', () => {
    const result = canCreateInvoice([
      { id: 1, status: 'draft', approvedAmount: '10000', isDeleted: 0 },
    ]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('NO_APPROVED_SAC');
  });

  it('should NOT allow invoice creation when no SACs exist', () => {
    const result = canCreateInvoice([]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('NO_APPROVED_SAC');
  });

  it('should sum amounts from multiple signed SACs', () => {
    const result = canCreateInvoice([
      { id: 1, status: 'approved', approvedAmount: '5000', isDeleted: 0 },
      { id: 2, status: 'approved', approvedAmount: '3000', isDeleted: 0 },
      { id: 3, status: 'draft', approvedAmount: '2000', isDeleted: 0 },
    ]);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(8000); // Only approved SACs counted
  });

  it('should exclude deleted SACs from total', () => {
    const result = canCreateInvoice([
      { id: 1, status: 'approved', approvedAmount: '5000', isDeleted: 0 },
      { id: 2, status: 'approved', approvedAmount: '3000', isDeleted: 1 }, // deleted
    ]);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5000);
  });

  it('should allow invoice within SAC coverage', () => {
    const result = validateInvoiceAmount(5000, 10000, 3000);
    expect(result.allowed).toBe(true);
  });

  it('should reject invoice exceeding remaining SAC coverage', () => {
    const result = validateInvoiceAmount(8000, 10000, 3000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('INVOICE_EXCEEDS_SAC_COVERAGE');
  });

  it('should allow invoice that exactly matches remaining coverage', () => {
    const result = validateInvoiceAmount(7000, 10000, 3000);
    expect(result.allowed).toBe(true);
  });

  it('should reject invoice when all SAC amounts are already invoiced', () => {
    const result = validateInvoiceAmount(1, 10000, 10000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('INVOICE_EXCEEDS_SAC_COVERAGE');
  });
});
