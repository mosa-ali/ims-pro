import { describe, it, expect } from 'vitest';

/**
 * PR Workflow Dashboard – Procurement Progress Tests
 *
 * Tests the procurement progress calculation logic and stage chain correctness
 * for all procurement types (Goods, Services, Works, Consultancy).
 *
 * Procurement Chains by Type:
 *   Goods ≤25K: PR → RFQ/QA → PO → GRN → Payable → Payment → Closure (7 stages)
 *   Goods >25K: PR → Tender/BA → PO → GRN → 3-Way Match → Payable → Payment → Closure (8 stages)
 *   Services/Consultancy ≤25K: PR → RFQ/QA → Contract → SAC → Payable → Payment → Closure (7 stages)
 *   Services/Consultancy >25K: PR → Tender/BA → Contract → SAC → Payable → Payment → Closure (7 stages)
 *   Works ≤25K: PR → RFQ/QA → Contract → SAC → Payable → Payment → Closure (7 stages)
 *   Works >25K: PR → Tender/BA → Contract → SAC → Payable → Payment → Closure (7 stages)
 */

// ─── Stage Status Type ──────────────────────────────────────────────────
type StageStatus = 'completed' | 'in_progress' | 'not_started' | 'locked' | 'n/a';

interface ProcurementStage {
  name: string;
  nameAr: string;
  status: StageStatus;
  docNumber?: string;
  docStatus?: string;
}

// ─── Helper: Replicate threshold logic ──────────────────────────────────
function isAboveThreshold(totalUSD: number): boolean {
  return totalUSD > 25000;
}

// ─── Helper: Get expected stage names for a given type/threshold ────────
function getExpectedStageNames(
  category: string,
  aboveThreshold: boolean,
  prApproved: boolean
): string[] {
  const isGoodsType = category === 'goods';
  const isServicesType = category === 'services' || category === 'consultancy';
  const isWorksType = category === 'works';

  const stages: string[] = ['PR'];

  if (aboveThreshold) {
    stages.push('Tender/BA');
  } else {
    stages.push('RFQ/QA');
  }

  if (isGoodsType) {
    stages.push('PO', 'GRN');
    if (aboveThreshold) {
      stages.push('3-Way Match');
    }
  } else {
    // Services, Consultancy, Works all use Contract + SAC (no Invoice stage)
    stages.push('Contract', 'SAC');
  }

  stages.push('Payable', 'Payment', 'Closure');
  return stages;
}

// ─── Helper: Get expected Arabic stage names ────────────────────────────
function getExpectedStageNamesAr(
  category: string,
  aboveThreshold: boolean
): string[] {
  const isGoodsType = category === 'goods';
  const isServicesType = category === 'services' || category === 'consultancy';
  const isWorksType = category === 'works';

  const stages: string[] = ['طلب الشراء'];

  if (aboveThreshold) {
    stages.push('المناقصة/تحليل العطاءات');
  } else {
    stages.push('طلب العروض/التحليل');
  }

  if (isGoodsType) {
    stages.push('أمر الشراء', 'إشعار الاستلام');
    if (aboveThreshold) {
      stages.push('المطابقة الثلاثية');
    }
  } else if (isWorksType) {
    stages.push('العقد', 'شهادة قبول الأعمال');
  } else {
    // Services/Consultancy (no Invoice stage)
    stages.push('العقد', 'شهادة القبول');
  }

  stages.push('المستحقات', 'الدفع', 'الإغلاق');
  return stages;
}

// ─── Helper: Simulate locked stages (PR not approved) ───────────────────
function simulateLockedStages(
  category: string,
  aboveThreshold: boolean
): ProcurementStage[] {
  const names = getExpectedStageNames(category, aboveThreshold, false);
  const namesAr = getExpectedStageNamesAr(category, aboveThreshold);

  return names.map((name, i) => ({
    name,
    nameAr: namesAr[i],
    status: i === 0 ? 'in_progress' : 'locked',
  }));
}

// ─── Helper: Get current stage label ────────────────────────────────────
function getCurrentStageLabel(stages: ProcurementStage[]): { label: string; labelAr: string } {
  let lastCompleted: ProcurementStage | null = null;
  let firstInProgress: ProcurementStage | null = null;

  for (const stage of stages) {
    if (stage.status === 'completed') {
      lastCompleted = stage;
    }
    if (stage.status === 'in_progress' && !firstInProgress) {
      firstInProgress = stage;
    }
  }

  if (firstInProgress) {
    return { label: firstInProgress.name, labelAr: firstInProgress.nameAr };
  }
  if (lastCompleted) {
    return { label: lastCompleted.name, labelAr: lastCompleted.nameAr };
  }
  return { label: 'PR Created', labelAr: 'تم إنشاء طلب الشراء' };
}

// ─── Helper: Calculate progress percentage ──────────────────────────────
function calculateProgressPercent(stages: ProcurementStage[]): number {
  const activeStages = stages.filter(s => s.status !== 'n/a');
  const completedCount = activeStages.filter(s => s.status === 'completed').length;
  const totalStages = activeStages.length;
  return totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Procurement Progress - Stage Chain Correctness', () => {

  describe('Goods PRs', () => {
    it('should have 7 stages for Goods ≤25K', () => {
      const names = getExpectedStageNames('goods', false, true);
      expect(names).toEqual(['PR', 'RFQ/QA', 'PO', 'GRN', 'Payable', 'Payment', 'Closure']);
      expect(names.length).toBe(7);
    });

    it('should have 8 stages for Goods >25K (includes 3-Way Match)', () => {
      const names = getExpectedStageNames('goods', true, true);
      expect(names).toEqual(['PR', 'Tender/BA', 'PO', 'GRN', '3-Way Match', 'Payable', 'Payment', 'Closure']);
      expect(names.length).toBe(8);
    });

    it('should NOT include Contract, SAC, or Invoice for Goods', () => {
      const namesLow = getExpectedStageNames('goods', false, true);
      const namesHigh = getExpectedStageNames('goods', true, true);
      for (const names of [namesLow, namesHigh]) {
        expect(names).not.toContain('Contract');
        expect(names).not.toContain('SAC');
        expect(names).not.toContain('Invoice');
      }
    });
  });

  describe('Services PRs', () => {
    it('should have 7 stages for Services ≤25K (no Invoice)', () => {
      const names = getExpectedStageNames('services', false, true);
      expect(names).toEqual(['PR', 'RFQ/QA', 'Contract', 'SAC', 'Payable', 'Payment', 'Closure']);
      expect(names.length).toBe(7);
    });

    it('should have 7 stages for Services >25K (no Invoice)', () => {
      const names = getExpectedStageNames('services', true, true);
      expect(names).toEqual(['PR', 'Tender/BA', 'Contract', 'SAC', 'Payable', 'Payment', 'Closure']);
      expect(names.length).toBe(7);
    });

    it('should NOT include Invoice stage for Services', () => {
      const names = getExpectedStageNames('services', false, true);
      expect(names).not.toContain('Invoice');
    });

    it('should NOT include PO or GRN for Services', () => {
      const names = getExpectedStageNames('services', false, true);
      expect(names).not.toContain('PO');
      expect(names).not.toContain('GRN');
    });
  });

  describe('Consultancy PRs', () => {
    it('should have same stages as Services (7 stages ≤25K)', () => {
      const servicesNames = getExpectedStageNames('services', false, true);
      const consultancyNames = getExpectedStageNames('consultancy', false, true);
      expect(consultancyNames).toEqual(servicesNames);
    });

    it('should have same stages as Services (7 stages >25K)', () => {
      const servicesNames = getExpectedStageNames('services', true, true);
      const consultancyNames = getExpectedStageNames('consultancy', true, true);
      expect(consultancyNames).toEqual(servicesNames);
    });
  });

  describe('Works PRs', () => {
    it('should have 7 stages for Works ≤25K (no Invoice)', () => {
      const names = getExpectedStageNames('works', false, true);
      expect(names).toEqual(['PR', 'RFQ/QA', 'Contract', 'SAC', 'Payable', 'Payment', 'Closure']);
      expect(names.length).toBe(7);
    });

    it('should have 7 stages for Works >25K (no Invoice)', () => {
      const names = getExpectedStageNames('works', true, true);
      expect(names).toEqual(['PR', 'Tender/BA', 'Contract', 'SAC', 'Payable', 'Payment', 'Closure']);
      expect(names.length).toBe(7);
    });

    it('should NOT include Invoice for Works', () => {
      const namesLow = getExpectedStageNames('works', false, true);
      const namesHigh = getExpectedStageNames('works', true, true);
      expect(namesLow).not.toContain('Invoice');
      expect(namesHigh).not.toContain('Invoice');
    });

    it('should NOT include PO, GRN, or 3-Way Match for Works', () => {
      const names = getExpectedStageNames('works', false, true);
      expect(names).not.toContain('PO');
      expect(names).not.toContain('GRN');
      expect(names).not.toContain('3-Way Match');
    });

    it('should use "شهادة قبول الأعمال" for Works SAC (not "شهادة القبول")', () => {
      const namesAr = getExpectedStageNamesAr('works', false);
      expect(namesAr).toContain('شهادة قبول الأعمال');
      expect(namesAr).not.toContain('شهادة القبول');
    });

    it('should use "شهادة القبول" for Services SAC (not "شهادة قبول الأعمال")', () => {
      const namesAr = getExpectedStageNamesAr('services', false);
      expect(namesAr).toContain('شهادة القبول');
      expect(namesAr).not.toContain('شهادة قبول الأعمال');
    });
  });
});

describe('Procurement Progress - Threshold Logic', () => {
  it('should return false for amounts ≤25000', () => {
    expect(isAboveThreshold(0)).toBe(false);
    expect(isAboveThreshold(10000)).toBe(false);
    expect(isAboveThreshold(25000)).toBe(false);
  });

  it('should return true for amounts >25000', () => {
    expect(isAboveThreshold(25001)).toBe(true);
    expect(isAboveThreshold(50000)).toBe(true);
    expect(isAboveThreshold(100000)).toBe(true);
  });

  it('should use RFQ/QA for ≤25K and Tender/BA for >25K', () => {
    const lowNames = getExpectedStageNames('goods', false, true);
    const highNames = getExpectedStageNames('goods', true, true);
    expect(lowNames[1]).toBe('RFQ/QA');
    expect(highNames[1]).toBe('Tender/BA');
  });
});

describe('Procurement Progress - Locked Stages (PR Not Approved)', () => {
  it('should show PR as in_progress and all others as locked for draft Goods PR', () => {
    const stages = simulateLockedStages('goods', false);
    expect(stages[0].status).toBe('in_progress');
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].status).toBe('locked');
    }
  });

  it('should show PR as in_progress and all others as locked for draft Works PR', () => {
    const stages = simulateLockedStages('works', false);
    expect(stages[0].status).toBe('in_progress');
    expect(stages.length).toBe(7);
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].status).toBe('locked');
    }
  });

  it('should show PR as in_progress and all others as locked for draft Services PR', () => {
    const stages = simulateLockedStages('services', false);
    expect(stages[0].status).toBe('in_progress');
    expect(stages.length).toBe(7); // 7 stages (no Invoice)
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].status).toBe('locked');
    }
  });
});

describe('Procurement Progress - Progress Percentage Calculation', () => {
  it('should return 0% when no stages are completed', () => {
    const stages: ProcurementStage[] = [
      { name: 'PR', nameAr: 'طلب الشراء', status: 'in_progress' },
      { name: 'RFQ/QA', nameAr: 'طلب العروض/التحليل', status: 'locked' },
      { name: 'Contract', nameAr: 'العقد', status: 'locked' },
    ];
    expect(calculateProgressPercent(stages)).toBe(0);
  });

  it('should return 14% for Works PR with only PR completed (1/7)', () => {
    const stages = getExpectedStageNames('works', false, true).map((name, i) => ({
      name,
      nameAr: '',
      status: (i === 0 ? 'completed' : 'not_started') as StageStatus,
    }));
    expect(calculateProgressPercent(stages)).toBe(14); // 1/7 = 14.28 → 14
  });

  it('should return 14% for Services PR with only PR completed (1/7)', () => {
    const stages = getExpectedStageNames('services', false, true).map((name, i) => ({
      name,
      nameAr: '',
      status: (i === 0 ? 'completed' : 'not_started') as StageStatus,
    }));
    expect(calculateProgressPercent(stages)).toBe(14); // 1/7 = 14.28 → 14
  });

  it('should return 100% when all stages are completed', () => {
    const stages: ProcurementStage[] = [
      { name: 'PR', nameAr: 'طلب الشراء', status: 'completed' },
      { name: 'RFQ/QA', nameAr: 'طلب العروض/التحليل', status: 'completed' },
      { name: 'Contract', nameAr: 'العقد', status: 'completed' },
      { name: 'SAC', nameAr: 'شهادة قبول الأعمال', status: 'completed' },
      { name: 'Payable', nameAr: 'المستحقات', status: 'completed' },
      { name: 'Payment', nameAr: 'الدفع', status: 'completed' },
      { name: 'Closure', nameAr: 'الإغلاق', status: 'completed' },
    ];
    expect(calculateProgressPercent(stages)).toBe(100);
  });

  it('should exclude n/a stages from percentage calculation', () => {
    const stages: ProcurementStage[] = [
      { name: 'PR', nameAr: 'طلب الشراء', status: 'completed' },
      { name: 'RFQ/QA', nameAr: 'طلب العروض/التحليل', status: 'completed' },
      { name: 'Contract', nameAr: 'العقد', status: 'n/a' },
      { name: 'SAC', nameAr: 'شهادة قبول الأعمال', status: 'not_started' },
    ];
    // 2 completed out of 3 active (excluding n/a) = 67%
    expect(calculateProgressPercent(stages)).toBe(67);
  });

  it('should return 57% for Goods PR with 4/7 stages completed', () => {
    const stages: ProcurementStage[] = [
      { name: 'PR', nameAr: 'طلب الشراء', status: 'completed' },
      { name: 'RFQ/QA', nameAr: 'طلب العروض/التحليل', status: 'completed' },
      { name: 'PO', nameAr: 'أمر الشراء', status: 'completed' },
      { name: 'GRN', nameAr: 'إشعار الاستلام', status: 'completed' },
      { name: 'Payable', nameAr: 'المستحقات', status: 'in_progress' },
      { name: 'Payment', nameAr: 'الدفع', status: 'locked' },
      { name: 'Closure', nameAr: 'الإغلاق', status: 'locked' },
    ];
    expect(calculateProgressPercent(stages)).toBe(57); // 4/7 = 57.14 → 57
  });
});

describe('Procurement Progress - Current Stage Label', () => {
  it('should return first in_progress stage label', () => {
    const stages: ProcurementStage[] = [
      { name: 'PR', nameAr: 'طلب الشراء', status: 'completed' },
      { name: 'RFQ/QA', nameAr: 'طلب العروض/التحليل', status: 'in_progress' },
      { name: 'Contract', nameAr: 'العقد', status: 'locked' },
    ];
    const result = getCurrentStageLabel(stages);
    expect(result.label).toBe('RFQ/QA');
    expect(result.labelAr).toBe('طلب العروض/التحليل');
  });

  it('should return last completed stage if no in_progress stage', () => {
    const stages: ProcurementStage[] = [
      { name: 'PR', nameAr: 'طلب الشراء', status: 'completed' },
      { name: 'RFQ/QA', nameAr: 'طلب العروض/التحليل', status: 'completed' },
      { name: 'Contract', nameAr: 'العقد', status: 'not_started' },
    ];
    const result = getCurrentStageLabel(stages);
    expect(result.label).toBe('RFQ/QA');
    expect(result.labelAr).toBe('طلب العروض/التحليل');
  });

  it('should return default label if no stages completed or in_progress', () => {
    const stages: ProcurementStage[] = [
      { name: 'PR', nameAr: 'طلب الشراء', status: 'locked' },
    ];
    const result = getCurrentStageLabel(stages);
    expect(result.label).toBe('PR Created');
    expect(result.labelAr).toBe('تم إنشاء طلب الشراء');
  });
});

describe('Procurement Progress - Works vs Services Differentiation', () => {
  it('Works and Services should have the same number of stages (both 7, no Invoice)', () => {
    const worksStages = getExpectedStageNames('works', false, true);
    const servicesStages = getExpectedStageNames('services', false, true);
    expect(worksStages.length).toBe(7);
    expect(servicesStages.length).toBe(7);
  });

  it('Works SAC should go directly to Payable (no Invoice in between)', () => {
    const worksStages = getExpectedStageNames('works', false, true);
    const sacIndex = worksStages.indexOf('SAC');
    expect(worksStages[sacIndex + 1]).toBe('Payable');
  });

  it('Services SAC should go directly to Payable (no Invoice)', () => {
    const servicesStages = getExpectedStageNames('services', false, true);
    const sacIndex = servicesStages.indexOf('SAC');
    expect(servicesStages[sacIndex + 1]).toBe('Payable');
  });

  it('Both Works and Services should end with Payable → Payment → Closure', () => {
    const worksStages = getExpectedStageNames('works', false, true);
    const servicesStages = getExpectedStageNames('services', false, true);

    expect(worksStages.slice(-3)).toEqual(['Payable', 'Payment', 'Closure']);
    expect(servicesStages.slice(-3)).toEqual(['Payable', 'Payment', 'Closure']);
  });
});
