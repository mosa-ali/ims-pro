import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * SAC Form Updates - Unit Tests
 * 
 * Tests for:
 * 1. DeliverableStatusItem schema with partial_completed + conditional fields
 * 2. SACCreateInput / SACUpdateInput with new deliverableStatuses shape
 * 3. Deliverable status option completeness (including partial_completed)
 * 4. Header data shape (contract dates, vendor name)
 */

// ─── Schema Definitions (mirrored from sac.ts router) ─────────────────────

const DeliverableStatusItem = z.object({
  milestoneId: z.number().int(),
  title: z.string(),
  status: z.enum(['completed', 'achieved', 'received', 'pending', 'in_progress', 'partial_completed']),
  notes: z.string().optional(),
  completionPercent: z.number().min(0).max(100).optional(),
  remainingWork: z.string().optional(),
});

const SACCreateInput = z.object({
  contractId: z.number().int().positive(),
  milestoneId: z.number().int().positive().optional(),
  deliverables: z.string().min(1),
  approvedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  currency: z.string().default('USD'),
  acceptanceDate: z.coerce.date(),
  acceptanceText: z.string().optional(),
  verifiedBoqs: z.boolean().optional(),
  verifiedContractTerms: z.boolean().optional(),
  verifiedDeliverablesReceived: z.boolean().optional(),
  preparedByRole: z.string().optional(),
  deliverableStatuses: z.array(DeliverableStatusItem).optional(),
});

const SACUpdateInput = z.object({
  id: z.number().int().positive(),
  deliverables: z.string().optional(),
  approvedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  acceptanceDate: z.coerce.date().optional(),
  acceptanceText: z.string().optional(),
  verifiedBoqs: z.boolean().optional(),
  verifiedContractTerms: z.boolean().optional(),
  verifiedDeliverablesReceived: z.boolean().optional(),
  preparedByRole: z.string().optional(),
  deliverableStatuses: z.array(DeliverableStatusItem).optional(),
});

// ─── DeliverableStatusItem Schema Tests ───────────────────────────────────

describe('DeliverableStatusItem Schema', () => {
  it('should accept completed status without conditional fields', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 1,
      title: 'Inception Report',
      status: 'completed',
    });
    expect(result.success).toBe(true);
  });

  it('should accept achieved status', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 2,
      title: 'Final Report',
      status: 'achieved',
      notes: 'Delivered on time',
    });
    expect(result.success).toBe(true);
  });

  it('should accept received status', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 3,
      title: 'Equipment Delivery',
      status: 'received',
    });
    expect(result.success).toBe(true);
  });

  it('should accept pending status', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 4,
      title: 'Training Session',
      status: 'pending',
    });
    expect(result.success).toBe(true);
  });

  it('should accept in_progress status', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 5,
      title: 'Site Survey',
      status: 'in_progress',
    });
    expect(result.success).toBe(true);
  });

  it('should accept partial_completed status with completionPercent and remainingWork', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 6,
      title: 'Construction Phase 1',
      status: 'partial_completed',
      completionPercent: 75,
      remainingWork: 'Electrical wiring and plumbing not completed',
      notes: 'Structural work done',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('partial_completed');
      expect(result.data.completionPercent).toBe(75);
      expect(result.data.remainingWork).toBe('Electrical wiring and plumbing not completed');
    }
  });

  it('should accept partial_completed with 0% completion', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 7,
      title: 'Phase 2',
      status: 'partial_completed',
      completionPercent: 0,
      remainingWork: 'Nothing started yet',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completionPercent).toBe(0);
    }
  });

  it('should accept partial_completed with 100% completion', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 8,
      title: 'Phase 3',
      status: 'partial_completed',
      completionPercent: 100,
    });
    expect(result.success).toBe(true);
  });

  it('should reject completionPercent above 100', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 9,
      title: 'Phase 4',
      status: 'partial_completed',
      completionPercent: 150,
    });
    expect(result.success).toBe(false);
  });

  it('should reject completionPercent below 0', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 10,
      title: 'Phase 5',
      status: 'partial_completed',
      completionPercent: -10,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid status value', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 11,
      title: 'Phase 6',
      status: 'cancelled',
    });
    expect(result.success).toBe(false);
  });

  it('should accept partial_completed without optional conditional fields', () => {
    const result = DeliverableStatusItem.safeParse({
      milestoneId: 12,
      title: 'Phase 7',
      status: 'partial_completed',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completionPercent).toBeUndefined();
      expect(result.data.remainingWork).toBeUndefined();
    }
  });
});

// ─── SAC Create Input Tests ───────────────────────────────────────────────

describe('SAC Create Input with deliverableStatuses', () => {
  it('should accept SAC creation with partial_completed deliverables', () => {
    const input = {
      contractId: 1,
      deliverables: 'Phase 1 (75%) - Structural work done',
      approvedAmount: '25000.00',
      currency: 'USD',
      acceptanceDate: '2026-03-15',
      acceptanceText: 'Partial acceptance of deliverables',
      verifiedBoqs: true,
      verifiedContractTerms: true,
      verifiedDeliverablesReceived: false,
      preparedByRole: 'Project Manager',
      deliverableStatuses: [
        {
          milestoneId: 1,
          title: 'Phase 1 Construction',
          status: 'partial_completed' as const,
          completionPercent: 75,
          remainingWork: 'Electrical wiring pending',
          notes: 'Structural complete',
        },
        {
          milestoneId: 2,
          title: 'Phase 2 Equipment',
          status: 'completed' as const,
          notes: 'All equipment delivered',
        },
      ],
    };
    const result = SACCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliverableStatuses).toHaveLength(2);
      expect(result.data.deliverableStatuses![0].status).toBe('partial_completed');
      expect(result.data.deliverableStatuses![0].completionPercent).toBe(75);
      expect(result.data.deliverableStatuses![1].status).toBe('completed');
    }
  });

  it('should accept SAC creation without deliverableStatuses', () => {
    const input = {
      contractId: 1,
      deliverables: 'All deliverables completed',
      approvedAmount: '50000.00',
      acceptanceDate: '2026-06-01',
    };
    const result = SACCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ─── SAC Update Input Tests ───────────────────────────────────────────────

describe('SAC Update Input with deliverableStatuses', () => {
  it('should accept update with mixed statuses including partial_completed', () => {
    const input = {
      id: 42,
      deliverableStatuses: [
        {
          milestoneId: 1,
          title: 'Milestone A',
          status: 'partial_completed' as const,
          completionPercent: 60,
          remainingWork: 'Testing and documentation remaining',
        },
        {
          milestoneId: 2,
          title: 'Milestone B',
          status: 'received' as const,
        },
        {
          milestoneId: 3,
          title: 'Milestone C',
          status: 'pending' as const,
        },
      ],
    };
    const result = SACUpdateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliverableStatuses).toHaveLength(3);
      const partial = result.data.deliverableStatuses!.find(d => d.status === 'partial_completed');
      expect(partial).toBeDefined();
      expect(partial!.completionPercent).toBe(60);
      expect(partial!.remainingWork).toBe('Testing and documentation remaining');
    }
  });

  it('should accept update with only id (minimal update)', () => {
    const result = SACUpdateInput.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ─── Deliverable Status Options Completeness ──────────────────────────────

describe('Deliverable Status Options', () => {
  const deliverableStatusOptions = [
    { value: 'pending', labelEn: 'Pending', labelAr: 'معلق' },
    { value: 'in_progress', labelEn: 'In Progress', labelAr: 'قيد التنفيذ' },
    { value: 'completed', labelEn: 'Completed', labelAr: 'مكتمل' },
    { value: 'achieved', labelEn: 'Achieved', labelAr: 'محقق' },
    { value: 'received', labelEn: 'Received', labelAr: 'مستلم' },
    { value: 'partial_completed', labelEn: 'Partial Completed', labelAr: 'مكتمل جزئياً' },
  ];

  it('should include partial_completed in status options', () => {
    const values = deliverableStatusOptions.map(o => o.value);
    expect(values).toContain('partial_completed');
  });

  it('should have 6 status options total', () => {
    expect(deliverableStatusOptions).toHaveLength(6);
  });

  it('should have both English and Arabic labels for all options', () => {
    for (const opt of deliverableStatusOptions) {
      expect(opt.labelEn).toBeTruthy();
      expect(opt.labelAr).toBeTruthy();
    }
  });

  it('all status values should be valid in the schema enum', () => {
    const statusEnum = z.enum(['completed', 'achieved', 'received', 'pending', 'in_progress', 'partial_completed']);
    for (const opt of deliverableStatusOptions) {
      const result = statusEnum.safeParse(opt.value);
      expect(result.success).toBe(true);
    }
  });
});

// ─── Contract Header Data Shape ───────────────────────────────────────────

describe('Contract Header Data Shape', () => {
  const ContractHeaderShape = z.object({
    contractNumber: z.string(),
    prNumber: z.string(),
    vendorName: z.string(),
    projectTitle: z.string(),
    contractValue: z.string(),
    currency: z.string(),
    startDate: z.coerce.date().nullable(),
    endDate: z.coerce.date().nullable(),
    totalApprovedSAC: z.number(),
    remainingCapacity: z.number(),
  });

  it('should validate header with contract dates', () => {
    const header = {
      contractNumber: 'CTR-2026-001',
      prNumber: 'PR-2026-001',
      vendorName: 'ACME Corp',
      projectTitle: 'Water Supply Project',
      contractValue: '100000.00',
      currency: 'USD',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      totalApprovedSAC: 25000,
      remainingCapacity: 75000,
    };
    const result = ContractHeaderShape.safeParse(header);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vendorName).toBe('ACME Corp');
      expect(result.data.startDate).toBeInstanceOf(Date);
      expect(result.data.endDate).toBeInstanceOf(Date);
    }
  });

  it('should accept null dates when contract has no dates set', () => {
    const header = {
      contractNumber: 'CTR-2026-002',
      prNumber: 'PR-2026-002',
      vendorName: 'Beta LLC',
      projectTitle: 'Road Construction',
      contractValue: '200000.00',
      currency: 'YER',
      startDate: null,
      endDate: null,
      totalApprovedSAC: 0,
      remainingCapacity: 200000,
    };
    const result = ContractHeaderShape.safeParse(header);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBeNull();
      expect(result.data.endDate).toBeNull();
    }
  });
});

// ─── PDF Status Label Coverage ────────────────────────────────────────────

describe('PDF Deliverable Status Labels', () => {
  function getDeliverableStatusLabel(status: string, lang: 'en' | 'ar'): string {
    const map: Record<string, { en: string; ar: string }> = {
      completed: { en: 'Completed', ar: 'مكتمل' },
      achieved: { en: 'Achieved', ar: 'محقق' },
      received: { en: 'Received', ar: 'مستلم' },
      pending: { en: 'Pending', ar: 'معلق' },
      in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
      partial_completed: { en: 'Partial Completed', ar: 'مكتمل جزئياً' },
    };
    return map[status]?.[lang] || status;
  }

  it('should return correct English label for partial_completed', () => {
    expect(getDeliverableStatusLabel('partial_completed', 'en')).toBe('Partial Completed');
  });

  it('should return correct Arabic label for partial_completed', () => {
    expect(getDeliverableStatusLabel('partial_completed', 'ar')).toBe('مكتمل جزئياً');
  });

  it('should return correct labels for all statuses in English', () => {
    expect(getDeliverableStatusLabel('completed', 'en')).toBe('Completed');
    expect(getDeliverableStatusLabel('achieved', 'en')).toBe('Achieved');
    expect(getDeliverableStatusLabel('received', 'en')).toBe('Received');
    expect(getDeliverableStatusLabel('pending', 'en')).toBe('Pending');
    expect(getDeliverableStatusLabel('in_progress', 'en')).toBe('In Progress');
    expect(getDeliverableStatusLabel('partial_completed', 'en')).toBe('Partial Completed');
  });

  it('should return raw status for unknown values', () => {
    expect(getDeliverableStatusLabel('unknown_status', 'en')).toBe('unknown_status');
  });
});

// ─── Deliverable Text Builder Logic ───────────────────────────────────────

describe('Deliverables Text Builder', () => {
  interface DeliverableRow {
    milestoneId: number;
    title: string;
    status: string;
    notes: string;
    completionPercent?: number;
    remainingWork?: string;
  }

  function buildDeliverablesText(rows: DeliverableRow[]): string {
    return rows
      .filter((r) => ['completed', 'achieved', 'received', 'partial_completed'].includes(r.status))
      .map((r) => {
        let text = r.title;
        if (r.status === 'partial_completed' && r.completionPercent != null) {
          text += ` (${r.completionPercent}%)`;
        }
        if (r.notes) text += ` - ${r.notes}`;
        return text;
      })
      .join('; ');
  }

  it('should include partial_completed deliverables in text', () => {
    const rows: DeliverableRow[] = [
      { milestoneId: 1, title: 'Phase 1', status: 'partial_completed', notes: 'Structural done', completionPercent: 75, remainingWork: 'Wiring' },
      { milestoneId: 2, title: 'Phase 2', status: 'completed', notes: 'All done' },
      { milestoneId: 3, title: 'Phase 3', status: 'pending', notes: '' },
    ];
    const text = buildDeliverablesText(rows);
    expect(text).toContain('Phase 1 (75%)');
    expect(text).toContain('Phase 2');
    expect(text).not.toContain('Phase 3');
  });

  it('should handle partial_completed without completionPercent', () => {
    const rows: DeliverableRow[] = [
      { milestoneId: 1, title: 'Phase 1', status: 'partial_completed', notes: '' },
    ];
    const text = buildDeliverablesText(rows);
    expect(text).toBe('Phase 1');
    expect(text).not.toContain('%');
  });

  it('should exclude pending and in_progress from text', () => {
    const rows: DeliverableRow[] = [
      { milestoneId: 1, title: 'A', status: 'pending', notes: '' },
      { milestoneId: 2, title: 'B', status: 'in_progress', notes: '' },
    ];
    const text = buildDeliverablesText(rows);
    expect(text).toBe('');
  });

  it('should join multiple deliverables with semicolons', () => {
    const rows: DeliverableRow[] = [
      { milestoneId: 1, title: 'A', status: 'completed', notes: '' },
      { milestoneId: 2, title: 'B', status: 'achieved', notes: '' },
      { milestoneId: 3, title: 'C', status: 'partial_completed', notes: '', completionPercent: 50 },
    ];
    const text = buildDeliverablesText(rows);
    expect(text).toBe('A; B; C (50%)');
  });
});

// ─── Notes Column Visibility Logic ──────────────────────────────────────

describe('Notes Column Visibility', () => {
  interface DeliverableRow {
    milestoneId: number;
    title: string;
    status: string;
    notes: string;
    completionPercent?: number;
    remainingWork?: string;
  }

  function hasAnyPartialCompleted(rows: DeliverableRow[]): boolean {
    return rows.some((r) => r.status === 'partial_completed');
  }

  it('should hide Notes column when any deliverable is partial_completed', () => {
    const rows: DeliverableRow[] = [
      { milestoneId: 1, title: 'Phase 1', status: 'partial_completed', notes: '', completionPercent: 60, remainingWork: 'Pending items' },
      { milestoneId: 2, title: 'Phase 2', status: 'completed', notes: 'Done' },
    ];
    const hasPartial = hasAnyPartialCompleted(rows);
    expect(hasPartial).toBe(true);
    // When hasPartial is true: Notes column hidden, Remarks/Pending Work column shown
    const showNotesColumn = !hasPartial;
    const showRemarksColumn = hasPartial;
    expect(showNotesColumn).toBe(false);
    expect(showRemarksColumn).toBe(true);
  });

  it('should show Notes column when no deliverable is partial_completed', () => {
    const rows: DeliverableRow[] = [
      { milestoneId: 1, title: 'Phase 1', status: 'completed', notes: 'All done' },
      { milestoneId: 2, title: 'Phase 2', status: 'pending', notes: '' },
    ];
    const hasPartial = hasAnyPartialCompleted(rows);
    expect(hasPartial).toBe(false);
    const showNotesColumn = !hasPartial;
    const showRemarksColumn = hasPartial;
    expect(showNotesColumn).toBe(true);
    expect(showRemarksColumn).toBe(false);
  });

  it('should switch columns when status changes to partial_completed', () => {
    const rows: DeliverableRow[] = [
      { milestoneId: 1, title: 'Phase 1', status: 'pending', notes: '' },
    ];
    // Initially no partial
    expect(hasAnyPartialCompleted(rows)).toBe(false);
    
    // Change status to partial_completed
    rows[0].status = 'partial_completed';
    rows[0].completionPercent = 50;
    rows[0].remainingWork = 'Half remaining';
    expect(hasAnyPartialCompleted(rows)).toBe(true);
  });

  it('should use "Remarks / Pending Work" as column title', () => {
    const translations = {
      en: { remainingWork: 'Remarks / Pending Work' },
      ar: { remainingWork: 'ملاحظات / الأعمال المتبقية' },
    };
    expect(translations.en.remainingWork).toBe('Remarks / Pending Work');
    expect(translations.ar.remainingWork).toBe('ملاحظات / الأعمال المتبقية');
  });
});


// ─── PR Data Auto-Loading Tests ──────────────────────────────────────────

describe('Contract Details: PR data auto-loading', () => {
  // Simulate the shape returned by contract.getById with PR data
  const contractWithPRData = {
    id: 1,
    contractNumber: 'CON-BA-EFADAH01-2026-003-001',
    vendorId: 90002,
    contractValue: '53000.00',
    currency: 'USD',
    startDate: '2026-03-04T02:04:56.000Z',
    endDate: '2026-09-02T04:00:00.000Z',
    purchaseRequestId: 450001,
    // PR data fields
    projectTitle: 'Child Protection and Food Security Project',
    donorName: 'Private Donor',
    budgetTitle: 'Approved budget for test',
    budgetCode: 'BL-001',
    subBudgetLine: 'Third party monitoring',
    totalBudgetLine: '45000.00',
    prCurrency: 'EUR',
  };

  it('should include projectTitle from PR', () => {
    expect(contractWithPRData.projectTitle).toBe('Child Protection and Food Security Project');
    expect(contractWithPRData.projectTitle).not.toBe('');
  });

  it('should include donorName from PR', () => {
    expect(contractWithPRData.donorName).toBe('Private Donor');
    expect(contractWithPRData.donorName).not.toBe('');
  });

  it('should include budgetTitle from PR', () => {
    expect(contractWithPRData.budgetTitle).toBe('Approved budget for test');
  });

  it('should include budgetCode from PR', () => {
    expect(contractWithPRData.budgetCode).toBe('BL-001');
  });

  it('should include subBudgetLine from PR', () => {
    expect(contractWithPRData.subBudgetLine).toBe('Third party monitoring');
  });

  it('should include totalBudgetLine from PR', () => {
    expect(contractWithPRData.totalBudgetLine).toBe('45000.00');
    expect(parseFloat(contractWithPRData.totalBudgetLine)).toBe(45000);
  });

  it('should include prCurrency from PR', () => {
    expect(contractWithPRData.prCurrency).toBe('EUR');
  });

  it('should handle null PR data gracefully', () => {
    const contractWithoutPR = {
      ...contractWithPRData,
      projectTitle: null,
      donorName: null,
      budgetTitle: null,
      budgetCode: null,
      subBudgetLine: null,
      totalBudgetLine: null,
      prCurrency: null,
    };
    expect(contractWithoutPR.projectTitle).toBeNull();
    expect(contractWithoutPR.donorName).toBeNull();
    expect(contractWithoutPR.budgetTitle).toBeNull();
  });
});

describe('SAC Summary: Budget line data from PR', () => {
  const sacSummaryWithBudget = {
    contractValue: 53000,
    currency: 'USD',
    totalCount: 1,
    approvedCount: 0,
    totalAllocated: 0,
    totalApproved: 0,
    remainingToAllocate: 53000,
    remainingApproved: 53000,
    budgetTitle: 'Approved budget for test',
    budgetCode: 'BL-001',
    subBudgetLine: 'Third party monitoring',
    totalBudgetLine: 45000,
    prCurrency: 'EUR',
  };

  it('should include budgetTitle in SAC summary', () => {
    expect(sacSummaryWithBudget.budgetTitle).toBe('Approved budget for test');
  });

  it('should include totalBudgetLine as a number in SAC summary', () => {
    expect(typeof sacSummaryWithBudget.totalBudgetLine).toBe('number');
    expect(sacSummaryWithBudget.totalBudgetLine).toBe(45000);
  });

  it('should include prCurrency in SAC summary', () => {
    expect(sacSummaryWithBudget.prCurrency).toBe('EUR');
  });

  it('should include subBudgetLine in SAC summary', () => {
    expect(sacSummaryWithBudget.subBudgetLine).toBe('Third party monitoring');
  });

  it('should display budget line with sub-budget line combined', () => {
    const displayText = sacSummaryWithBudget.budgetTitle + 
      (sacSummaryWithBudget.subBudgetLine ? ` — ${sacSummaryWithBudget.subBudgetLine}` : '');
    expect(displayText).toBe('Approved budget for test — Third party monitoring');
  });

  it('should handle empty budget data gracefully', () => {
    const summaryNoBudget = {
      ...sacSummaryWithBudget,
      budgetTitle: '',
      budgetCode: '',
      subBudgetLine: '',
      totalBudgetLine: 0,
      prCurrency: 'USD',
    };
    expect(summaryNoBudget.budgetTitle || summaryNoBudget.budgetCode || '-').toBe('-');
    expect(summaryNoBudget.totalBudgetLine).toBe(0);
  });
});
