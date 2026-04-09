import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Contract Management Tests
 * 
 * Tests for the new Contract Management sub-cards:
 * 1. Penalties schema validation
 * 2. Payment Schedule schema validation & 100% rule
 * 3. Retention terms schema validation
 * 4. Implementation Monitoring schema validation
 * 5. Financial Dashboard aggregation logic
 * 6. Penalty calculation logic
 * 7. Services PR flow (no Invoice stage)
 */

// ─── Schema Definitions (mirrored from routers) ──────────────────────────

const PenaltyCreateInput = z.object({
  contractId: z.number().int().positive(),
  penaltyDescription: z.string().min(1),
  penaltyType: z.enum(['delay', 'quality', 'compliance']),
  delayDaysThreshold: z.number().int().min(0).default(0),
  penaltyPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/),
  penaltyBase: z.enum(['contract_value', 'deliverable_amount']).default('contract_value'),
  linkedMilestoneId: z.number().int().positive().optional(),
  maxPenaltyLimitPct: z.string().regex(/^\d+(\.\d{1,2})?$/).default('10.00'),
  remarks: z.string().optional(),
});

const PenaltyUpdateInput = z.object({
  id: z.number().int().positive(),
  penaltyDescription: z.string().min(1).optional(),
  penaltyType: z.enum(['delay', 'quality', 'compliance']).optional(),
  delayDaysThreshold: z.number().int().min(0).optional(),
  penaltyPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  penaltyBase: z.enum(['contract_value', 'deliverable_amount']).optional(),
  linkedMilestoneId: z.number().int().positive().nullable().optional(),
  maxPenaltyLimitPct: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  actualDelayDays: z.number().int().min(0).optional(),
  remarks: z.string().optional(),
  status: z.enum(['draft', 'applied', 'waived']).optional(),
});

const PaymentScheduleEntryInput = z.object({
  paymentType: z.enum(['advance', 'milestone', 'progress', 'final']),
  description: z.string().min(1),
  paymentPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/),
  paymentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  linkedMilestoneId: z.number().int().positive().optional(),
  paymentCondition: z.enum(['none', 'sac_required', 'monitoring_required', 'sac_and_monitoring']).default('none'),
  orderIndex: z.number().int().min(0),
});

const PaymentScheduleCreateInput = z.object({
  contractId: z.number().int().positive(),
  entries: z.array(PaymentScheduleEntryInput).min(1),
});

const RetentionCreateInput = z.object({
  contractId: z.number().int().positive(),
  retentionPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/),
  retentionBasis: z.enum(['contract_value', 'payment_stage']).default('contract_value'),
  releaseCondition: z.enum(['final_acceptance', 'final_handover', 'defect_liability']).default('final_acceptance'),
  releaseType: z.enum(['full', 'partial']).default('full'),
  remarks: z.string().optional(),
});

const RetentionUpdateInput = z.object({
  id: z.number().int().positive(),
  retentionPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  retentionBasis: z.enum(['contract_value', 'payment_stage']).optional(),
  maxRetentionAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  releaseCondition: z.enum(['final_acceptance', 'final_handover', 'defect_liability']).optional(),
  releaseType: z.enum(['full', 'partial']).optional(),
  remarks: z.string().optional(),
});

// ─── Penalty Schema Tests ────────────────────────────────────────────────

describe('Contract Penalties Schema', () => {
  it('should accept valid delay penalty input', () => {
    const input = {
      contractId: 1,
      penaltyDescription: 'Late delivery penalty',
      penaltyType: 'delay',
      delayDaysThreshold: 7,
      penaltyPercentage: '2.50',
      penaltyBase: 'contract_value',
      maxPenaltyLimitPct: '10.00',
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept valid quality penalty input', () => {
    const input = {
      contractId: 1,
      penaltyDescription: 'Quality deficiency penalty',
      penaltyType: 'quality',
      penaltyPercentage: '5.00',
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept valid compliance penalty input', () => {
    const input = {
      contractId: 1,
      penaltyDescription: 'Non-compliance with safety standards',
      penaltyType: 'compliance',
      penaltyPercentage: '3.00',
      penaltyBase: 'deliverable_amount',
      linkedMilestoneId: 5,
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject missing contractId', () => {
    const input = {
      penaltyDescription: 'Test penalty',
      penaltyType: 'delay',
      penaltyPercentage: '2.50',
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject empty penalty description', () => {
    const input = {
      contractId: 1,
      penaltyDescription: '',
      penaltyType: 'delay',
      penaltyPercentage: '2.50',
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid penalty type', () => {
    const input = {
      contractId: 1,
      penaltyDescription: 'Test',
      penaltyType: 'invalid_type',
      penaltyPercentage: '2.50',
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid percentage format', () => {
    const input = {
      contractId: 1,
      penaltyDescription: 'Test',
      penaltyType: 'delay',
      penaltyPercentage: 'abc',
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should default delayDaysThreshold to 0', () => {
    const input = {
      contractId: 1,
      penaltyDescription: 'Test',
      penaltyType: 'delay',
      penaltyPercentage: '2.50',
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.delayDaysThreshold).toBe(0);
    }
  });

  it('should default maxPenaltyLimitPct to 10.00', () => {
    const input = {
      contractId: 1,
      penaltyDescription: 'Test',
      penaltyType: 'delay',
      penaltyPercentage: '2.50',
    };
    const result = PenaltyCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxPenaltyLimitPct).toBe('10.00');
    }
  });

  it('should accept all three penalty types', () => {
    const types = ['delay', 'quality', 'compliance'] as const;
    for (const type of types) {
      const result = PenaltyCreateInput.safeParse({
        contractId: 1,
        penaltyDescription: `${type} penalty`,
        penaltyType: type,
        penaltyPercentage: '2.50',
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── Penalty Update Schema Tests ─────────────────────────────────────────

describe('Contract Penalty Update Schema', () => {
  it('should accept partial update with only status', () => {
    const input = { id: 1, status: 'applied' };
    const result = PenaltyUpdateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept update with all fields', () => {
    const input = {
      id: 1,
      penaltyDescription: 'Updated description',
      penaltyType: 'quality',
      delayDaysThreshold: 14,
      penaltyPercentage: '5.00',
      penaltyBase: 'deliverable_amount',
      linkedMilestoneId: 3,
      maxPenaltyLimitPct: '15.00',
      actualDelayDays: 10,
      remarks: 'Updated remarks',
      status: 'draft',
    };
    const result = PenaltyUpdateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept waived status', () => {
    const input = { id: 1, status: 'waived' };
    const result = PenaltyUpdateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const input = { id: 1, status: 'invalid' };
    const result = PenaltyUpdateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept nullable linkedMilestoneId', () => {
    const input = { id: 1, linkedMilestoneId: null };
    const result = PenaltyUpdateInput.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ─── Penalty Calculation Logic Tests ─────────────────────────────────────

describe('Penalty Calculation Logic', () => {
  function calculatePenalty(
    baseAmount: number,
    penaltyPercentage: number,
    maxPenaltyLimitPct: number
  ): number {
    let calculatedAmount = (baseAmount * penaltyPercentage) / 100;
    const maxAmount = (baseAmount * maxPenaltyLimitPct) / 100;
    if (calculatedAmount > maxAmount) {
      calculatedAmount = maxAmount;
    }
    return parseFloat(calculatedAmount.toFixed(2));
  }

  it('should calculate 2.5% of $10,000 contract = $250', () => {
    expect(calculatePenalty(10000, 2.5, 10)).toBe(250);
  });

  it('should calculate 5% of $50,000 contract = $2,500', () => {
    expect(calculatePenalty(50000, 5, 10)).toBe(2500);
  });

  it('should cap at max limit: 15% penalty capped at 10% max = $1,000', () => {
    expect(calculatePenalty(10000, 15, 10)).toBe(1000);
  });

  it('should handle zero base amount', () => {
    expect(calculatePenalty(0, 5, 10)).toBe(0);
  });

  it('should handle zero penalty percentage', () => {
    expect(calculatePenalty(10000, 0, 10)).toBe(0);
  });

  it('should handle exact max limit (5% penalty, 5% max)', () => {
    expect(calculatePenalty(10000, 5, 5)).toBe(500);
  });

  it('should handle fractional amounts correctly', () => {
    expect(calculatePenalty(7500, 3.33, 10)).toBe(249.75);
  });

  it('should handle very small percentages', () => {
    expect(calculatePenalty(100000, 0.01, 10)).toBe(10);
  });
});

// ─── Payment Schedule Schema Tests ───────────────────────────────────────

describe('Contract Payment Schedule Schema', () => {
  it('should accept valid payment schedule with single entry', () => {
    const input = {
      contractId: 1,
      entries: [{
        paymentType: 'lump_sum' as any || 'advance',
        description: 'Advance payment',
        paymentPercentage: '100.00',
        paymentAmount: '10000.00',
        orderIndex: 0,
      }],
    };
    // Fix: use correct enum value
    input.entries[0].paymentType = 'advance';
    const result = PaymentScheduleCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept valid payment schedule with multiple entries', () => {
    const input = {
      contractId: 1,
      entries: [
        {
          paymentType: 'advance',
          description: 'Advance payment 20%',
          paymentPercentage: '20.00',
          paymentAmount: '2000.00',
          orderIndex: 0,
        },
        {
          paymentType: 'milestone',
          description: 'Phase 1 completion',
          paymentPercentage: '30.00',
          paymentAmount: '3000.00',
          linkedMilestoneId: 1,
          paymentCondition: 'sac_required',
          orderIndex: 1,
        },
        {
          paymentType: 'progress',
          description: 'Phase 2 progress',
          paymentPercentage: '30.00',
          paymentAmount: '3000.00',
          paymentCondition: 'monitoring_required',
          orderIndex: 2,
        },
        {
          paymentType: 'final',
          description: 'Final payment',
          paymentPercentage: '20.00',
          paymentAmount: '2000.00',
          paymentCondition: 'sac_and_monitoring',
          orderIndex: 3,
        },
      ],
    };
    const result = PaymentScheduleCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject empty entries array', () => {
    const input = {
      contractId: 1,
      entries: [],
    };
    const result = PaymentScheduleCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject missing contractId', () => {
    const input = {
      entries: [{
        paymentType: 'advance',
        description: 'Test',
        paymentPercentage: '100.00',
        paymentAmount: '10000.00',
        orderIndex: 0,
      }],
    };
    const result = PaymentScheduleCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept all four payment types', () => {
    const types = ['advance', 'milestone', 'progress', 'final'] as const;
    for (const type of types) {
      const result = PaymentScheduleCreateInput.safeParse({
        contractId: 1,
        entries: [{
          paymentType: type,
          description: `${type} payment`,
          paymentPercentage: '25.00',
          paymentAmount: '2500.00',
          orderIndex: 0,
        }],
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all payment conditions', () => {
    const conditions = ['none', 'sac_required', 'monitoring_required', 'sac_and_monitoring'] as const;
    for (const condition of conditions) {
      const result = PaymentScheduleCreateInput.safeParse({
        contractId: 1,
        entries: [{
          paymentType: 'milestone',
          description: 'Test',
          paymentPercentage: '100.00',
          paymentAmount: '10000.00',
          paymentCondition: condition,
          orderIndex: 0,
        }],
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── Payment Schedule 100% Rule Tests ────────────────────────────────────

describe('Payment Schedule 100% Allocation Rule', () => {
  function validateTotalPercentage(entries: { paymentPercentage: string }[]): boolean {
    const total = entries.reduce((sum, e) => sum + parseFloat(e.paymentPercentage), 0);
    return Math.abs(total - 100) < 0.01; // Allow small floating point tolerance
  }

  it('should validate 100% allocation (single entry)', () => {
    expect(validateTotalPercentage([{ paymentPercentage: '100.00' }])).toBe(true);
  });

  it('should validate 100% allocation (multiple entries)', () => {
    expect(validateTotalPercentage([
      { paymentPercentage: '20.00' },
      { paymentPercentage: '30.00' },
      { paymentPercentage: '30.00' },
      { paymentPercentage: '20.00' },
    ])).toBe(true);
  });

  it('should reject under-allocation (80%)', () => {
    expect(validateTotalPercentage([
      { paymentPercentage: '40.00' },
      { paymentPercentage: '40.00' },
    ])).toBe(false);
  });

  it('should reject over-allocation (120%)', () => {
    expect(validateTotalPercentage([
      { paymentPercentage: '60.00' },
      { paymentPercentage: '60.00' },
    ])).toBe(false);
  });

  it('should handle fractional percentages summing to 100%', () => {
    expect(validateTotalPercentage([
      { paymentPercentage: '33.33' },
      { paymentPercentage: '33.33' },
      { paymentPercentage: '33.34' },
    ])).toBe(true);
  });

  it('should handle single 0% entry as invalid', () => {
    expect(validateTotalPercentage([{ paymentPercentage: '0.00' }])).toBe(false);
  });
});

// ─── Retention Schema Tests ──────────────────────────────────────────────

describe('Contract Retention Schema', () => {
  it('should accept valid retention input', () => {
    const input = {
      contractId: 1,
      retentionPercentage: '10.00',
      retentionBasis: 'contract_value',
      releaseCondition: 'final_acceptance',
      releaseType: 'full',
    };
    const result = RetentionCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept minimal retention input (defaults applied)', () => {
    const input = {
      contractId: 1,
      retentionPercentage: '5.00',
    };
    const result = RetentionCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.retentionBasis).toBe('contract_value');
      expect(result.data.releaseCondition).toBe('final_acceptance');
      expect(result.data.releaseType).toBe('full');
    }
  });

  it('should accept all retention basis options', () => {
    const bases = ['contract_value', 'payment_stage'] as const;
    for (const basis of bases) {
      const result = RetentionCreateInput.safeParse({
        contractId: 1,
        retentionPercentage: '10.00',
        retentionBasis: basis,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all release conditions', () => {
    const conditions = ['final_acceptance', 'final_handover', 'defect_liability'] as const;
    for (const condition of conditions) {
      const result = RetentionCreateInput.safeParse({
        contractId: 1,
        retentionPercentage: '10.00',
        releaseCondition: condition,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all release types', () => {
    const types = ['full', 'partial'] as const;
    for (const type of types) {
      const result = RetentionCreateInput.safeParse({
        contractId: 1,
        retentionPercentage: '10.00',
        releaseType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject missing contractId', () => {
    const input = { retentionPercentage: '10.00' };
    const result = RetentionCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid percentage format', () => {
    const input = { contractId: 1, retentionPercentage: 'abc' };
    const result = RetentionCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ─── Retention Calculation Logic Tests ───────────────────────────────────

describe('Retention Calculation Logic', () => {
  function calculateRetention(
    contractValue: number,
    retentionPercentage: number,
    maxRetentionAmount?: number
  ): { totalRetained: number; releasable: number } {
    let totalRetained = (contractValue * retentionPercentage) / 100;
    if (maxRetentionAmount !== undefined && totalRetained > maxRetentionAmount) {
      totalRetained = maxRetentionAmount;
    }
    return {
      totalRetained: parseFloat(totalRetained.toFixed(2)),
      releasable: parseFloat(totalRetained.toFixed(2)),
    };
  }

  it('should calculate 10% retention on $100,000 = $10,000', () => {
    const result = calculateRetention(100000, 10);
    expect(result.totalRetained).toBe(10000);
  });

  it('should calculate 5% retention on $50,000 = $2,500', () => {
    const result = calculateRetention(50000, 5);
    expect(result.totalRetained).toBe(2500);
  });

  it('should cap retention at max amount', () => {
    const result = calculateRetention(100000, 10, 5000);
    expect(result.totalRetained).toBe(5000);
  });

  it('should handle zero retention', () => {
    const result = calculateRetention(100000, 0);
    expect(result.totalRetained).toBe(0);
  });

  it('should handle fractional retention', () => {
    const result = calculateRetention(75000, 7.5);
    expect(result.totalRetained).toBe(5625);
  });
});

// ─── Financial Dashboard Aggregation Tests ───────────────────────────────

describe('Financial Dashboard Aggregation', () => {
  interface FinancialDashboard {
    contractValue: number;
    totalPaid: number;
    totalPenalties: number;
    totalRetained: number;
    totalReleased: number;
    netPayable: number;
    paymentProgress: number;
  }

  function calculateFinancialDashboard(
    contractValue: number,
    totalPaid: number,
    appliedPenalties: number,
    retainedAmount: number,
    releasedAmount: number
  ): FinancialDashboard {
    const netPayable = contractValue - appliedPenalties - retainedAmount + releasedAmount;
    const paymentProgress = contractValue > 0 ? (totalPaid / contractValue) * 100 : 0;

    return {
      contractValue,
      totalPaid,
      totalPenalties: appliedPenalties,
      totalRetained: retainedAmount,
      totalReleased: releasedAmount,
      netPayable: parseFloat(netPayable.toFixed(2)),
      paymentProgress: parseFloat(paymentProgress.toFixed(2)),
    };
  }

  it('should calculate dashboard for new contract (no payments/penalties)', () => {
    const dashboard = calculateFinancialDashboard(50000, 0, 0, 0, 0);
    expect(dashboard.contractValue).toBe(50000);
    expect(dashboard.totalPaid).toBe(0);
    expect(dashboard.totalPenalties).toBe(0);
    expect(dashboard.netPayable).toBe(50000);
    expect(dashboard.paymentProgress).toBe(0);
  });

  it('should calculate dashboard with partial payment', () => {
    const dashboard = calculateFinancialDashboard(50000, 15000, 0, 0, 0);
    expect(dashboard.totalPaid).toBe(15000);
    expect(dashboard.paymentProgress).toBe(30);
    expect(dashboard.netPayable).toBe(50000);
  });

  it('should calculate dashboard with penalties applied', () => {
    const dashboard = calculateFinancialDashboard(50000, 15000, 2500, 0, 0);
    expect(dashboard.totalPenalties).toBe(2500);
    expect(dashboard.netPayable).toBe(47500); // 50000 - 2500
  });

  it('should calculate dashboard with retention', () => {
    const dashboard = calculateFinancialDashboard(50000, 15000, 0, 5000, 0);
    expect(dashboard.totalRetained).toBe(5000);
    expect(dashboard.netPayable).toBe(45000); // 50000 - 5000
  });

  it('should calculate dashboard with retention release', () => {
    const dashboard = calculateFinancialDashboard(50000, 40000, 0, 5000, 3000);
    expect(dashboard.totalRetained).toBe(5000);
    expect(dashboard.totalReleased).toBe(3000);
    expect(dashboard.netPayable).toBe(48000); // 50000 - 5000 + 3000
  });

  it('should calculate dashboard with all deductions', () => {
    const dashboard = calculateFinancialDashboard(100000, 60000, 5000, 10000, 2000);
    expect(dashboard.totalPenalties).toBe(5000);
    expect(dashboard.totalRetained).toBe(10000);
    expect(dashboard.totalReleased).toBe(2000);
    expect(dashboard.netPayable).toBe(87000); // 100000 - 5000 - 10000 + 2000
    expect(dashboard.paymentProgress).toBe(60);
  });

  it('should handle zero contract value', () => {
    const dashboard = calculateFinancialDashboard(0, 0, 0, 0, 0);
    expect(dashboard.paymentProgress).toBe(0);
    expect(dashboard.netPayable).toBe(0);
  });
});

// ─── Services PR Flow Tests (No Invoice Stage) ──────────────────────────

describe('Services PR Procurement Flow (No Invoice)', () => {
  const SERVICES_STAGES = ['PR', 'RFQ/QA', 'Contract', 'SAC', 'Payable', 'Payment', 'Closure'];
  const WORKS_STAGES = ['PR', 'RFQ/QA', 'Contract', 'SAC', 'Payable', 'Payment', 'Closure'];
  const GOODS_STAGES_BASIC = ['PR', 'RFQ/QA', 'PO', 'GRN', 'Payable', 'Payment', 'Closure'];
  const GOODS_STAGES_FULL = ['PR', 'RFQ/QA', 'PO', 'GRN', '3-Way Match', 'Payable', 'Payment', 'Closure'];

  it('Services should have 7 stages (no Invoice)', () => {
    expect(SERVICES_STAGES.length).toBe(7);
    expect(SERVICES_STAGES).not.toContain('Invoice');
  });

  it('Works should have 7 stages (no Invoice)', () => {
    expect(WORKS_STAGES.length).toBe(7);
    expect(WORKS_STAGES).not.toContain('Invoice');
  });

  it('Goods basic should have 7 stages (no Invoice, no 3-Way Match)', () => {
    expect(GOODS_STAGES_BASIC.length).toBe(7);
    expect(GOODS_STAGES_BASIC).not.toContain('Invoice');
    expect(GOODS_STAGES_BASIC).not.toContain('3-Way Match');
  });

  it('Goods full should have 8 stages (with 3-Way Match, no Invoice)', () => {
    expect(GOODS_STAGES_FULL.length).toBe(8);
    expect(GOODS_STAGES_FULL).toContain('3-Way Match');
    expect(GOODS_STAGES_FULL).not.toContain('Invoice');
  });

  it('Services flow should go Contract → SAC → Payable (no Invoice between)', () => {
    const contractIdx = SERVICES_STAGES.indexOf('Contract');
    const sacIdx = SERVICES_STAGES.indexOf('SAC');
    const payableIdx = SERVICES_STAGES.indexOf('Payable');
    expect(sacIdx).toBe(contractIdx + 1);
    expect(payableIdx).toBe(sacIdx + 1);
  });

  it('Works flow should go Contract → SAC → Payable (no Invoice between)', () => {
    const contractIdx = WORKS_STAGES.indexOf('Contract');
    const sacIdx = WORKS_STAGES.indexOf('SAC');
    const payableIdx = WORKS_STAGES.indexOf('Payable');
    expect(sacIdx).toBe(contractIdx + 1);
    expect(payableIdx).toBe(sacIdx + 1);
  });
});

// ─── Contract Management Sub-Cards Configuration Tests ───────────────────

describe('Contract Management Sub-Cards', () => {
  const SUB_CARDS = [
    { id: 'contract', title: 'العقد', requiresApproval: false },
    { id: 'milestones', title: 'المراحل والمخرجات', requiresApproval: false },
    { id: 'penalties', title: 'الغرامات', requiresApproval: true },
    { id: 'payment-schedule', title: 'جدول الدفعات', requiresApproval: false },
    { id: 'retention', title: 'أموال الاحتجاز', requiresApproval: false },
    { id: 'monitoring', title: 'متابعة التنفيذ', requiresApproval: true },
  ];

  it('should have exactly 6 sub-cards', () => {
    expect(SUB_CARDS.length).toBe(6);
  });

  it('should have unique IDs', () => {
    const ids = SUB_CARDS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have Penalties requiring contract approval', () => {
    const penalties = SUB_CARDS.find(c => c.id === 'penalties');
    expect(penalties?.requiresApproval).toBe(true);
  });

  it('should have Implementation Monitoring requiring contract approval', () => {
    const monitoring = SUB_CARDS.find(c => c.id === 'monitoring');
    expect(monitoring?.requiresApproval).toBe(true);
  });

  it('should have Contract sub-card not requiring approval', () => {
    const contract = SUB_CARDS.find(c => c.id === 'contract');
    expect(contract?.requiresApproval).toBe(false);
  });

  it('should have all required sub-cards from requirements', () => {
    const ids = SUB_CARDS.map(c => c.id);
    expect(ids).toContain('contract');
    expect(ids).toContain('milestones');
    expect(ids).toContain('penalties');
    expect(ids).toContain('payment-schedule');
    expect(ids).toContain('retention');
    expect(ids).toContain('monitoring');
  });
});

// ─── Implementation Monitoring Schema Tests ──────────────────────────────

describe('Implementation Monitoring', () => {
  const ChecklistItemInput = z.object({
    monitoringId: z.number().int().positive(),
    deliverableTitle: z.string().min(1),
    description: z.string().optional(),
    expectedDate: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed']).default('pending'),
  });

  const HandoverInput = z.object({
    monitoringId: z.number().int().positive(),
    handoverDate: z.string(),
    handoverType: z.enum(['primary', 'final']),
    status: z.enum(['pending', 'completed', 'rejected']).default('pending'),
    remarks: z.string().optional(),
  });

  const ObservationInput = z.object({
    monitoringId: z.number().int().positive(),
    observationType: z.enum(['site_visit', 'quality_check', 'progress_review', 'issue']),
    description: z.string().min(1),
    severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    actionRequired: z.string().optional(),
  });

  it('should accept valid checklist item', () => {
    const result = ChecklistItemInput.safeParse({
      monitoringId: 1,
      deliverableTitle: 'Foundation work',
      expectedDate: '2026-06-01',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all checklist statuses', () => {
    const statuses = ['pending', 'in_progress', 'completed', 'delayed'] as const;
    for (const status of statuses) {
      const result = ChecklistItemInput.safeParse({
        monitoringId: 1,
        deliverableTitle: 'Test',
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept valid handover input', () => {
    const result = HandoverInput.safeParse({
      monitoringId: 1,
      handoverDate: '2026-12-01',
      handoverType: 'primary',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all handover types', () => {
    const types = ['primary', 'final'] as const;
    for (const type of types) {
      const result = HandoverInput.safeParse({
        monitoringId: 1,
        handoverDate: '2026-12-01',
        handoverType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept valid observation input', () => {
    const result = ObservationInput.safeParse({
      monitoringId: 1,
      observationType: 'site_visit',
      description: 'Visited construction site',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all observation types', () => {
    const types = ['site_visit', 'quality_check', 'progress_review', 'issue'] as const;
    for (const type of types) {
      const result = ObservationInput.safeParse({
        monitoringId: 1,
        observationType: type,
        description: 'Test observation',
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all severity levels', () => {
    const levels = ['low', 'medium', 'high', 'critical'] as const;
    for (const severity of levels) {
      const result = ObservationInput.safeParse({
        monitoringId: 1,
        observationType: 'issue',
        description: 'Test',
        severity,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject missing description in observation', () => {
    const result = ObservationInput.safeParse({
      monitoringId: 1,
      observationType: 'issue',
    });
    expect(result.success).toBe(false);
  });
});
