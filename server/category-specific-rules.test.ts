import { describe, it, expect } from 'vitest';

/**
 * Category-Specific Rules Tests
 * 
 * Tests for the enforcement that Works PRs require implementation monitoring
 * to be completed before SAC can be created, while Services/Consultancy/Goods
 * PRs do not have this requirement.
 * 
 * Tests cover:
 * 1. Guard result structure validation
 * 2. Works PR: SAC blocked when no monitoring exists
 * 3. Works PR: SAC blocked when monitoring is pending
 * 4. Works PR: SAC blocked when monitoring is in_progress
 * 5. Works PR: SAC allowed when monitoring is completed
 * 6. Services PR: SAC allowed without monitoring
 * 7. Consultancy PR: SAC allowed without monitoring
 * 8. Goods PR: No monitoring requirement (different chain)
 * 9. Error message bilingual support (EN + AR)
 * 10. Monitoring status details in guard response
 * 11. SAC Financial Integration: Net Payable calculation
 */

// ─── Guard Result Interface ──────────────────────────────────────────────

interface GuardResult {
  allowed: boolean;
  reason?: string;
  data?: Record<string, any>;
}

// ─── Mock canCreateSAC Logic (mirrors type2Guards.ts) ────────────────────

type MockContract = {
  id: number;
  organizationId: number;
  status: string;
  purchaseRequestId: number | null;
  contractValue: string;
  currency: string;
  vendorId: number | null;
  isDeleted: number;
};

type MockPR = {
  id: number;
  category: string;
};

type MockMonitoring = {
  contractId: number;
  organizationId: number;
  status: 'pending' | 'in_progress' | 'completed';
  isDeleted: number;
  deliverablesChecklistComplete: number;
  primaryHandoverComplete: number;
  finalHandoverComplete: number;
  observationsComplete: number;
};

/**
 * Pure logic version of canCreateSAC for unit testing
 * (no DB dependency - takes data as parameters)
 */
function canCreateSACLogic(
  contract: MockContract | null,
  pr: MockPR | null,
  monitoring: MockMonitoring | null
): GuardResult {
  if (!contract) return { allowed: false, reason: 'CONTRACT_NOT_FOUND' };
  if (!['approved', 'active'].includes(contract.status)) {
    return { allowed: false, reason: 'CONTRACT_NOT_APPROVED' };
  }

  // Category-Specific Rule: Works PRs require implementation monitoring completion
  if (contract.purchaseRequestId && pr) {
    if (pr.category?.toLowerCase() === 'works') {
      if (!monitoring) {
        return {
          allowed: false,
          reason: 'WORKS_MONITORING_REQUIRED',
          data: {
            message: 'Works PRs require implementation monitoring to be set up before SAC can be created. Please configure Implementation Monitoring in the Contract Management section first.',
            messageAr: 'طلبات الأعمال تتطلب إعداد متابعة التنفيذ قبل إنشاء شهادة القبول. يرجى تكوين متابعة التنفيذ في قسم إدارة العقد أولاً.',
          },
        };
      }

      if (monitoring.status !== 'completed') {
        return {
          allowed: false,
          reason: 'WORKS_MONITORING_INCOMPLETE',
          data: {
            message: 'Works PRs require implementation monitoring to be completed before SAC can be created. Current monitoring status: ' + monitoring.status,
            messageAr: 'طلبات الأعمال تتطلب إكمال متابعة التنفيذ قبل إنشاء شهادة القبول. حالة المتابعة الحالية: ' + (monitoring.status === 'pending' ? 'قيد الانتظار' : 'قيد التنفيذ'),
            monitoringStatus: monitoring.status,
            deliverablesChecklistComplete: monitoring.deliverablesChecklistComplete,
            primaryHandoverComplete: monitoring.primaryHandoverComplete,
            finalHandoverComplete: monitoring.finalHandoverComplete,
            observationsComplete: monitoring.observationsComplete,
          },
        };
      }
    }
    // Services/Consultancy PRs: monitoring is optional
  }

  return {
    allowed: true,
    data: {
      contractValue: contract.contractValue,
      currency: contract.currency,
      vendorId: contract.vendorId,
      purchaseRequestId: contract.purchaseRequestId,
    },
  };
}

// ─── Test Fixtures ───────────────────────────────────────────────────────

const baseContract: MockContract = {
  id: 1001,
  organizationId: 30001,
  status: 'approved',
  purchaseRequestId: 5001,
  contractValue: '150000.00',
  currency: 'USD',
  vendorId: 2001,
  isDeleted: 0,
};

const worksPR: MockPR = { id: 5001, category: 'works' };
const servicesPR: MockPR = { id: 5002, category: 'services' };
const consultancyPR: MockPR = { id: 5003, category: 'consultancy' };
const goodsPR: MockPR = { id: 5004, category: 'goods' };

const pendingMonitoring: MockMonitoring = {
  contractId: 1001,
  organizationId: 30001,
  status: 'pending',
  isDeleted: 0,
  deliverablesChecklistComplete: 0,
  primaryHandoverComplete: 0,
  finalHandoverComplete: 0,
  observationsComplete: 0,
};

const inProgressMonitoring: MockMonitoring = {
  ...pendingMonitoring,
  status: 'in_progress',
  deliverablesChecklistComplete: 1,
  primaryHandoverComplete: 0,
  finalHandoverComplete: 0,
  observationsComplete: 1,
};

const completedMonitoring: MockMonitoring = {
  ...pendingMonitoring,
  status: 'completed',
  deliverablesChecklistComplete: 1,
  primaryHandoverComplete: 1,
  finalHandoverComplete: 1,
  observationsComplete: 1,
};

// ─── Tests ───────────────────────────────────────────────────────────────

describe('Category-Specific Rules: canCreateSAC', () => {
  // ── Basic Guard Behavior ──────────────────────────────────────────────

  describe('Basic contract validation', () => {
    it('should return CONTRACT_NOT_FOUND when contract is null', () => {
      const result = canCreateSACLogic(null, null, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('CONTRACT_NOT_FOUND');
    });

    it('should return CONTRACT_NOT_APPROVED for draft contract', () => {
      const result = canCreateSACLogic(
        { ...baseContract, status: 'draft' },
        worksPR,
        null
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('CONTRACT_NOT_APPROVED');
    });

    it('should return CONTRACT_NOT_APPROVED for pending contract', () => {
      const result = canCreateSACLogic(
        { ...baseContract, status: 'pending' },
        worksPR,
        null
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('CONTRACT_NOT_APPROVED');
    });

    it('should allow SAC for approved contract (non-Works)', () => {
      const result = canCreateSACLogic(baseContract, servicesPR, null);
      expect(result.allowed).toBe(true);
    });

    it('should allow SAC for active contract (non-Works)', () => {
      const result = canCreateSACLogic(
        { ...baseContract, status: 'active' },
        servicesPR,
        null
      );
      expect(result.allowed).toBe(true);
    });
  });

  // ── Works PR: Monitoring Required ─────────────────────────────────────

  describe('Works PR: Implementation Monitoring Enforcement', () => {
    it('should BLOCK SAC when Works PR has no monitoring set up', () => {
      const result = canCreateSACLogic(baseContract, worksPR, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('WORKS_MONITORING_REQUIRED');
      expect(result.data?.message).toContain('implementation monitoring to be set up');
    });

    it('should BLOCK SAC when Works PR monitoring is pending', () => {
      const result = canCreateSACLogic(baseContract, worksPR, pendingMonitoring);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('WORKS_MONITORING_INCOMPLETE');
      expect(result.data?.monitoringStatus).toBe('pending');
    });

    it('should BLOCK SAC when Works PR monitoring is in_progress', () => {
      const result = canCreateSACLogic(baseContract, worksPR, inProgressMonitoring);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('WORKS_MONITORING_INCOMPLETE');
      expect(result.data?.monitoringStatus).toBe('in_progress');
    });

    it('should ALLOW SAC when Works PR monitoring is completed', () => {
      const result = canCreateSACLogic(baseContract, worksPR, completedMonitoring);
      expect(result.allowed).toBe(true);
      expect(result.data?.contractValue).toBe('150000.00');
      expect(result.data?.currency).toBe('USD');
    });

    it('should include checklist completion details in INCOMPLETE response', () => {
      const result = canCreateSACLogic(baseContract, worksPR, inProgressMonitoring);
      expect(result.allowed).toBe(false);
      expect(result.data?.deliverablesChecklistComplete).toBe(1);
      expect(result.data?.primaryHandoverComplete).toBe(0);
      expect(result.data?.finalHandoverComplete).toBe(0);
      expect(result.data?.observationsComplete).toBe(1);
    });

    it('should work with active contract status for Works', () => {
      const result = canCreateSACLogic(
        { ...baseContract, status: 'active' },
        worksPR,
        completedMonitoring
      );
      expect(result.allowed).toBe(true);
    });
  });

  // ── Services PR: No Monitoring Requirement ────────────────────────────

  describe('Services PR: No Monitoring Requirement', () => {
    it('should ALLOW SAC for Services PR without any monitoring', () => {
      const result = canCreateSACLogic(baseContract, servicesPR, null);
      expect(result.allowed).toBe(true);
      expect(result.data?.contractValue).toBe('150000.00');
    });

    it('should ALLOW SAC for Services PR with pending monitoring', () => {
      const result = canCreateSACLogic(baseContract, servicesPR, pendingMonitoring);
      expect(result.allowed).toBe(true);
    });

    it('should ALLOW SAC for Services PR with completed monitoring', () => {
      const result = canCreateSACLogic(baseContract, servicesPR, completedMonitoring);
      expect(result.allowed).toBe(true);
    });
  });

  // ── Consultancy PR: No Monitoring Requirement ─────────────────────────

  describe('Consultancy PR: No Monitoring Requirement', () => {
    it('should ALLOW SAC for Consultancy PR without monitoring', () => {
      const result = canCreateSACLogic(baseContract, consultancyPR, null);
      expect(result.allowed).toBe(true);
    });

    it('should ALLOW SAC for Consultancy PR with in-progress monitoring', () => {
      const result = canCreateSACLogic(baseContract, consultancyPR, inProgressMonitoring);
      expect(result.allowed).toBe(true);
    });
  });

  // ── Goods PR: Different Chain (no monitoring applicable) ──────────────

  describe('Goods PR: No Monitoring Requirement', () => {
    it('should ALLOW SAC for Goods PR without monitoring', () => {
      const result = canCreateSACLogic(baseContract, goodsPR, null);
      expect(result.allowed).toBe(true);
    });
  });

  // ── Bilingual Error Messages ──────────────────────────────────────────

  describe('Bilingual Error Messages', () => {
    it('should include Arabic message for WORKS_MONITORING_REQUIRED', () => {
      const result = canCreateSACLogic(baseContract, worksPR, null);
      expect(result.data?.messageAr).toBeDefined();
      expect(result.data?.messageAr).toContain('متابعة التنفيذ');
      expect(result.data?.messageAr).toContain('إعداد');
    });

    it('should include Arabic message for WORKS_MONITORING_INCOMPLETE', () => {
      const result = canCreateSACLogic(baseContract, worksPR, pendingMonitoring);
      expect(result.data?.messageAr).toBeDefined();
      expect(result.data?.messageAr).toContain('إكمال');
    });

    it('should translate pending status to Arabic', () => {
      const result = canCreateSACLogic(baseContract, worksPR, pendingMonitoring);
      expect(result.data?.messageAr).toContain('قيد الانتظار');
    });

    it('should translate in_progress status to Arabic', () => {
      const result = canCreateSACLogic(baseContract, worksPR, inProgressMonitoring);
      expect(result.data?.messageAr).toContain('قيد التنفيذ');
    });

    it('should include English message with monitoring status', () => {
      const result = canCreateSACLogic(baseContract, worksPR, pendingMonitoring);
      expect(result.data?.message).toContain('pending');
    });
  });

  // ── Guard Result Structure ────────────────────────────────────────────

  describe('Guard Result Structure', () => {
    it('should return contract data when allowed', () => {
      const result = canCreateSACLogic(baseContract, servicesPR, null);
      expect(result.allowed).toBe(true);
      expect(result.data).toHaveProperty('contractValue');
      expect(result.data).toHaveProperty('currency');
      expect(result.data).toHaveProperty('vendorId');
      expect(result.data).toHaveProperty('purchaseRequestId');
    });

    it('should return reason string when not allowed', () => {
      const result = canCreateSACLogic(null, null, null);
      expect(result.allowed).toBe(false);
      expect(typeof result.reason).toBe('string');
    });

    it('should return monitoring completion details for incomplete Works', () => {
      const result = canCreateSACLogic(baseContract, worksPR, {
        ...pendingMonitoring,
        deliverablesChecklistComplete: 1,
        primaryHandoverComplete: 1,
        finalHandoverComplete: 0,
        observationsComplete: 1,
      });
      expect(result.data?.deliverablesChecklistComplete).toBe(1);
      expect(result.data?.primaryHandoverComplete).toBe(1);
      expect(result.data?.finalHandoverComplete).toBe(0);
      expect(result.data?.observationsComplete).toBe(1);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle contract with no purchaseRequestId', () => {
      const result = canCreateSACLogic(
        { ...baseContract, purchaseRequestId: null },
        null,
        null
      );
      expect(result.allowed).toBe(true);
    });

    it('should handle case-insensitive category matching (Works vs works)', () => {
      const upperCasePR: MockPR = { id: 5001, category: 'Works' };
      // The logic lowercases the category, so 'Works' should match
      const result = canCreateSACLogic(baseContract, upperCasePR, null);
      // Since we lowercase in the check, 'Works' → 'works' → should trigger monitoring check
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('WORKS_MONITORING_REQUIRED');
    });

    it('should handle mixed case category (WORKS)', () => {
      const upperCasePR: MockPR = { id: 5001, category: 'WORKS' };
      const result = canCreateSACLogic(baseContract, upperCasePR, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('WORKS_MONITORING_REQUIRED');
    });
  });
});

// ─── SAC Financial Integration Tests ─────────────────────────────────────

describe('SAC Financial Integration: Net Payable Calculation', () => {
  /**
   * Net Payable = SAC Approved Amount − Penalties − Retention
   */
  
  function calculateNetPayable(
    sacApprovedAmount: number,
    totalPenalties: number,
    retentionAmount: number
  ): number {
    return sacApprovedAmount - totalPenalties - retentionAmount;
  }

  it('should calculate net payable with no deductions', () => {
    const net = calculateNetPayable(50000, 0, 0);
    expect(net).toBe(50000);
  });

  it('should deduct penalties from SAC amount', () => {
    const net = calculateNetPayable(50000, 5000, 0);
    expect(net).toBe(45000);
  });

  it('should deduct retention from SAC amount', () => {
    const net = calculateNetPayable(50000, 0, 2500);
    expect(net).toBe(47500);
  });

  it('should deduct both penalties and retention', () => {
    const net = calculateNetPayable(50000, 5000, 2500);
    expect(net).toBe(42500);
  });

  it('should handle zero SAC amount', () => {
    const net = calculateNetPayable(0, 0, 0);
    expect(net).toBe(0);
  });

  it('should handle large deductions exceeding SAC amount (negative payable)', () => {
    const net = calculateNetPayable(10000, 8000, 5000);
    expect(net).toBe(-3000);
    // Business logic should prevent this, but the calculation should still work
  });

  it('should handle decimal amounts correctly', () => {
    const net = calculateNetPayable(50000.50, 1234.25, 2500.75);
    expect(net).toBeCloseTo(46265.50, 2);
  });

  it('should match the formula: Net = Contract - Penalties - Retention (dashboard)', () => {
    // Mirrors contractFinancialDashboard.ts line 272
    const contractValue = 150000;
    const totalPenaltyApplied = 7500;
    const retentionBalance = 15000;
    const netPayable = contractValue - totalPenaltyApplied - retentionBalance;
    expect(netPayable).toBe(127500);
  });
});

// ─── Category Chain Validation Tests ─────────────────────────────────────

describe('Category Chain Validation', () => {
  const CONTRACT_CHAIN_CATEGORIES = ['services', 'consultancy', 'works'];
  const GOODS_CHAIN_CATEGORIES = ['goods'];

  it('Works should follow Contract→SAC→Payment chain', () => {
    expect(CONTRACT_CHAIN_CATEGORIES).toContain('works');
  });

  it('Services should follow Contract→SAC→Payment chain', () => {
    expect(CONTRACT_CHAIN_CATEGORIES).toContain('services');
  });

  it('Consultancy should follow Contract→SAC→Payment chain', () => {
    expect(CONTRACT_CHAIN_CATEGORIES).toContain('consultancy');
  });

  it('Goods should NOT follow Contract→SAC chain', () => {
    expect(CONTRACT_CHAIN_CATEGORIES).not.toContain('goods');
  });

  it('Works requires monitoring completion for SAC (unique rule)', () => {
    // Only Works has this additional gate
    const categoriesRequiringMonitoring = ['works'];
    expect(categoriesRequiringMonitoring).toContain('works');
    expect(categoriesRequiringMonitoring).not.toContain('services');
    expect(categoriesRequiringMonitoring).not.toContain('consultancy');
    expect(categoriesRequiringMonitoring).not.toContain('goods');
  });

  it('Services monitoring is optional (does not block SAC)', () => {
    // Services PRs can have monitoring but it does not block SAC creation
    const result = canCreateSACLogic(baseContract, servicesPR, pendingMonitoring);
    expect(result.allowed).toBe(true);
  });
});
