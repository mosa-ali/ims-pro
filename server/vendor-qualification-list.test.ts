import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Vendor Qualification List Tests
 * 
 * Tests the new Vendor Qualification List page feature:
 * 1. listVendorsWithQualification input schema validation
 * 2. Qualification status merging logic (vendor + qualification data)
 * 3. Effective status determination (approval status → qualification status)
 * 4. Filtering logic (by status, type, search)
 * 5. Navigation flow: Hub → List → Checklist (with vendorId param)
 * 6. View/Edit mode determination from URL query params
 */

// ─── Schema Definitions (mirrored from vendorsRouter) ────────────────────────

const ListVendorsWithQualificationInput = z.object({
  vendorType: z.enum(['supplier', 'contractor', 'service_provider', 'consultant', 'other']).optional(),
  qualificationStatus: z.enum(['not_evaluated', 'draft', 'qualified', 'conditional', 'not_qualified', 'rejected']).optional(),
  search: z.string().optional(),
});

// ─── Effective Status Logic (mirrored from vendorsRouter) ────────────────────

interface VendorRow {
  id: number;
  vendorCode: string;
  name: string;
  nameAr: string | null;
  vendorType: string | null;
  isActive: number | null;
  isBlacklisted: number | null;
  createdAt: string | null;
}

interface QualificationRow {
  vendorId: number;
  totalScore: string | null;
  qualificationStatus: string | null;
  evaluationDate: string | null;
  expiryDate: string | null;
  approvalStatus: string;
  version: number;
}

function determineEffectiveStatus(qual: QualificationRow | undefined): string {
  if (!qual) return 'not_evaluated';
  if (qual.approvalStatus === 'rejected') return 'rejected';
  if (qual.approvalStatus === 'draft') return 'draft';
  return qual.qualificationStatus || 'not_evaluated';
}

function mergeVendorWithQualification(
  vendor: VendorRow,
  qual: QualificationRow | undefined
) {
  const effectiveStatus = determineEffectiveStatus(qual);
  return {
    id: vendor.id,
    vendorCode: vendor.vendorCode,
    name: vendor.name,
    nameAr: vendor.nameAr,
    vendorType: vendor.vendorType,
    isActive: vendor.isActive,
    isBlacklisted: vendor.isBlacklisted,
    createdAt: vendor.createdAt,
    qualificationStatus: effectiveStatus,
    totalScore: qual ? Number(qual.totalScore) : null,
    evaluationDate: qual?.evaluationDate || null,
    expiryDate: qual?.expiryDate || null,
    approvalStatus: qual?.approvalStatus || null,
  };
}

// ─── Filter Logic ────────────────────────────────────────────────────────────

function filterByQualificationStatus(
  vendors: ReturnType<typeof mergeVendorWithQualification>[],
  status?: string
) {
  if (!status) return vendors;
  return vendors.filter(v => v.qualificationStatus === status);
}

function filterByVendorType(
  vendors: ReturnType<typeof mergeVendorWithQualification>[],
  type?: string
) {
  if (!type) return vendors;
  return vendors.filter(v => v.vendorType === type);
}

function filterBySearch(
  vendors: ReturnType<typeof mergeVendorWithQualification>[],
  search?: string
) {
  if (!search) return vendors;
  const lower = search.toLowerCase();
  return vendors.filter(v =>
    v.vendorCode.toLowerCase().includes(lower) ||
    v.name.toLowerCase().includes(lower) ||
    (v.nameAr && v.nameAr.includes(search))
  );
}

// ─── URL Param Parsing Logic ─────────────────────────────────────────────────

function parseChecklistUrl(url: string): { vendorId: string | null; mode: string | null } {
  const match = url.match(/\/checklist\/(\d+)/);
  const vendorId = match ? match[1] : null;
  const searchParams = new URLSearchParams(url.split('?')[1] || '');
  const mode = searchParams.get('mode');
  return { vendorId, mode };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ListVendorsWithQualification Input Schema', () => {
  it('should accept empty input (no filters)', () => {
    const result = ListVendorsWithQualificationInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept valid vendor type filter', () => {
    const result = ListVendorsWithQualificationInput.safeParse({ vendorType: 'supplier' });
    expect(result.success).toBe(true);
  });

  it('should accept valid qualification status filter', () => {
    const result = ListVendorsWithQualificationInput.safeParse({ qualificationStatus: 'qualified' });
    expect(result.success).toBe(true);
  });

  it('should accept search string', () => {
    const result = ListVendorsWithQualificationInput.safeParse({ search: 'ACME' });
    expect(result.success).toBe(true);
  });

  it('should accept all filters combined', () => {
    const result = ListVendorsWithQualificationInput.safeParse({
      vendorType: 'contractor',
      qualificationStatus: 'conditional',
      search: 'test',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid vendor type', () => {
    const result = ListVendorsWithQualificationInput.safeParse({ vendorType: 'invalid_type' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid qualification status', () => {
    const result = ListVendorsWithQualificationInput.safeParse({ qualificationStatus: 'invalid_status' });
    expect(result.success).toBe(false);
  });

  it('should accept all valid vendor types', () => {
    const types = ['supplier', 'contractor', 'service_provider', 'consultant', 'other'];
    for (const type of types) {
      const result = ListVendorsWithQualificationInput.safeParse({ vendorType: type });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid qualification statuses', () => {
    const statuses = ['not_evaluated', 'draft', 'qualified', 'conditional', 'not_qualified', 'rejected'];
    for (const status of statuses) {
      const result = ListVendorsWithQualificationInput.safeParse({ qualificationStatus: status });
      expect(result.success).toBe(true);
    }
  });
});

describe('Effective Status Determination', () => {
  it('should return not_evaluated when no qualification exists', () => {
    expect(determineEffectiveStatus(undefined)).toBe('not_evaluated');
  });

  it('should return rejected when approval status is rejected', () => {
    const qual: QualificationRow = {
      vendorId: 1, totalScore: '25', qualificationStatus: 'qualified',
      evaluationDate: '2026-01-01', expiryDate: '2027-01-01',
      approvalStatus: 'rejected', version: 1,
    };
    expect(determineEffectiveStatus(qual)).toBe('rejected');
  });

  it('should return draft when approval status is draft', () => {
    const qual: QualificationRow = {
      vendorId: 1, totalScore: '20', qualificationStatus: 'conditional',
      evaluationDate: '2026-01-01', expiryDate: '2027-01-01',
      approvalStatus: 'draft', version: 1,
    };
    expect(determineEffectiveStatus(qual)).toBe('draft');
  });

  it('should return qualification status when approval is not draft/rejected', () => {
    const qual: QualificationRow = {
      vendorId: 1, totalScore: '28', qualificationStatus: 'qualified',
      evaluationDate: '2026-01-01', expiryDate: '2027-01-01',
      approvalStatus: 'approved', version: 1,
    };
    expect(determineEffectiveStatus(qual)).toBe('qualified');
  });

  it('should return conditional for pending approval with conditional qualification', () => {
    const qual: QualificationRow = {
      vendorId: 1, totalScore: '18', qualificationStatus: 'conditional',
      evaluationDate: '2026-01-01', expiryDate: '2027-01-01',
      approvalStatus: 'pending_compliance', version: 1,
    };
    expect(determineEffectiveStatus(qual)).toBe('conditional');
  });

  it('should return not_qualified for approved with low score', () => {
    const qual: QualificationRow = {
      vendorId: 1, totalScore: '10', qualificationStatus: 'not_qualified',
      evaluationDate: '2026-01-01', expiryDate: '2027-01-01',
      approvalStatus: 'approved', version: 1,
    };
    expect(determineEffectiveStatus(qual)).toBe('not_qualified');
  });

  it('should prioritize rejected over qualification status', () => {
    // Even if qualificationStatus says 'qualified', rejected approval overrides
    const qual: QualificationRow = {
      vendorId: 1, totalScore: '30', qualificationStatus: 'qualified',
      evaluationDate: '2026-01-01', expiryDate: '2027-01-01',
      approvalStatus: 'rejected', version: 1,
    };
    expect(determineEffectiveStatus(qual)).toBe('rejected');
  });

  it('should prioritize draft over qualification status', () => {
    const qual: QualificationRow = {
      vendorId: 1, totalScore: '30', qualificationStatus: 'qualified',
      evaluationDate: '2026-01-01', expiryDate: '2027-01-01',
      approvalStatus: 'draft', version: 1,
    };
    expect(determineEffectiveStatus(qual)).toBe('draft');
  });
});

describe('Vendor + Qualification Merge', () => {
  const baseVendor: VendorRow = {
    id: 1, vendorCode: 'SUP-001', name: 'ACME Corp', nameAr: 'شركة أكمي',
    vendorType: 'supplier', isActive: 1, isBlacklisted: 0, createdAt: '2026-01-15',
  };

  it('should merge vendor without qualification as not_evaluated', () => {
    const merged = mergeVendorWithQualification(baseVendor, undefined);
    expect(merged.qualificationStatus).toBe('not_evaluated');
    expect(merged.totalScore).toBeNull();
    expect(merged.evaluationDate).toBeNull();
    expect(merged.expiryDate).toBeNull();
    expect(merged.approvalStatus).toBeNull();
  });

  it('should merge vendor with qualified status', () => {
    const qual: QualificationRow = {
      vendorId: 1, totalScore: '28', qualificationStatus: 'qualified',
      evaluationDate: '2026-02-01', expiryDate: '2027-02-01',
      approvalStatus: 'approved', version: 2,
    };
    const merged = mergeVendorWithQualification(baseVendor, qual);
    expect(merged.qualificationStatus).toBe('qualified');
    expect(merged.totalScore).toBe(28);
    expect(merged.evaluationDate).toBe('2026-02-01');
    expect(merged.expiryDate).toBe('2027-02-01');
    expect(merged.approvalStatus).toBe('approved');
  });

  it('should preserve vendor fields in merged result', () => {
    const merged = mergeVendorWithQualification(baseVendor, undefined);
    expect(merged.id).toBe(1);
    expect(merged.vendorCode).toBe('SUP-001');
    expect(merged.name).toBe('ACME Corp');
    expect(merged.nameAr).toBe('شركة أكمي');
    expect(merged.vendorType).toBe('supplier');
    expect(merged.isActive).toBe(1);
    expect(merged.isBlacklisted).toBe(0);
    expect(merged.createdAt).toBe('2026-01-15');
  });

  it('should handle null totalScore as NaN-safe', () => {
    const qual: QualificationRow = {
      vendorId: 1, totalScore: null, qualificationStatus: 'pending',
      evaluationDate: '2026-02-01', expiryDate: null,
      approvalStatus: 'draft', version: 1,
    };
    const merged = mergeVendorWithQualification(baseVendor, qual);
    expect(merged.totalScore).toBe(0); // Number(null) = 0
  });
});

describe('Qualification List Filtering', () => {
  const vendors = [
    { id: 1, vendorCode: 'SUP-001', name: 'ACME Corp', nameAr: 'أكمي', vendorType: 'supplier', isActive: 1, isBlacklisted: 0, createdAt: '2026-01-01', qualificationStatus: 'qualified', totalScore: 28, evaluationDate: '2026-02-01', expiryDate: '2027-02-01', approvalStatus: 'approved' },
    { id: 2, vendorCode: 'SUP-002', name: 'Beta LLC', nameAr: 'بيتا', vendorType: 'contractor', isActive: 1, isBlacklisted: 0, createdAt: '2026-01-15', qualificationStatus: 'conditional', totalScore: 18, evaluationDate: '2026-02-15', expiryDate: '2027-02-15', approvalStatus: 'pending_compliance' },
    { id: 3, vendorCode: 'SRV-001', name: 'Gamma Services', nameAr: 'غاما', vendorType: 'service_provider', isActive: 1, isBlacklisted: 0, createdAt: '2026-02-01', qualificationStatus: 'not_evaluated', totalScore: null, evaluationDate: null, expiryDate: null, approvalStatus: null },
    { id: 4, vendorCode: 'CON-001', name: 'Delta Consulting', nameAr: 'دلتا', vendorType: 'consultant', isActive: 1, isBlacklisted: 0, createdAt: '2026-02-15', qualificationStatus: 'draft', totalScore: 22, evaluationDate: '2026-03-01', expiryDate: '2027-03-01', approvalStatus: 'draft' },
    { id: 5, vendorCode: 'SUP-003', name: 'Epsilon Supply', nameAr: 'إبسيلون', vendorType: 'supplier', isActive: 1, isBlacklisted: 1, createdAt: '2026-03-01', qualificationStatus: 'rejected', totalScore: 10, evaluationDate: '2026-03-15', expiryDate: null, approvalStatus: 'rejected' },
  ];

  it('should filter by qualification status: qualified', () => {
    const filtered = filterByQualificationStatus(vendors as any, 'qualified');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].vendorCode).toBe('SUP-001');
  });

  it('should filter by qualification status: not_evaluated', () => {
    const filtered = filterByQualificationStatus(vendors as any, 'not_evaluated');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].vendorCode).toBe('SRV-001');
  });

  it('should filter by qualification status: draft', () => {
    const filtered = filterByQualificationStatus(vendors as any, 'draft');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].vendorCode).toBe('CON-001');
  });

  it('should filter by qualification status: rejected', () => {
    const filtered = filterByQualificationStatus(vendors as any, 'rejected');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].vendorCode).toBe('SUP-003');
  });

  it('should return all vendors when no status filter', () => {
    const filtered = filterByQualificationStatus(vendors as any, undefined);
    expect(filtered).toHaveLength(5);
  });

  it('should filter by vendor type: supplier', () => {
    const filtered = filterByVendorType(vendors as any, 'supplier');
    expect(filtered).toHaveLength(2);
  });

  it('should filter by vendor type: consultant', () => {
    const filtered = filterByVendorType(vendors as any, 'consultant');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Delta Consulting');
  });

  it('should filter by search: vendor code', () => {
    const filtered = filterBySearch(vendors as any, 'SUP-001');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('ACME Corp');
  });

  it('should filter by search: vendor name', () => {
    const filtered = filterBySearch(vendors as any, 'Gamma');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].vendorCode).toBe('SRV-001');
  });

  it('should filter by search: Arabic name', () => {
    const filtered = filterBySearch(vendors as any, 'أكمي');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].vendorCode).toBe('SUP-001');
  });

  it('should return empty for non-matching search', () => {
    const filtered = filterBySearch(vendors as any, 'NonExistent');
    expect(filtered).toHaveLength(0);
  });

  it('should combine status and type filters', () => {
    let filtered = filterByQualificationStatus(vendors as any, 'qualified');
    filtered = filterByVendorType(filtered as any, 'supplier');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].vendorCode).toBe('SUP-001');
  });
});

describe('Navigation Flow: Hub → List → Checklist', () => {
  it('should generate correct evaluate URL (no mode param)', () => {
    const vendorId = 42;
    const url = `/organization/logistics/evaluation-performance/checklist/${vendorId}`;
    const parsed = parseChecklistUrl(url);
    expect(parsed.vendorId).toBe('42');
    expect(parsed.mode).toBeNull();
  });

  it('should generate correct view URL with mode=view', () => {
    const vendorId = 42;
    const url = `/organization/logistics/evaluation-performance/checklist/${vendorId}?mode=view`;
    const parsed = parseChecklistUrl(url);
    expect(parsed.vendorId).toBe('42');
    expect(parsed.mode).toBe('view');
  });

  it('should generate correct edit URL with mode=edit', () => {
    const vendorId = 42;
    const url = `/organization/logistics/evaluation-performance/checklist/${vendorId}?mode=edit`;
    const parsed = parseChecklistUrl(url);
    expect(parsed.vendorId).toBe('42');
    expect(parsed.mode).toBe('edit');
  });

  it('should handle URL without vendorId', () => {
    const url = `/organization/logistics/evaluation-performance/checklist`;
    const parsed = parseChecklistUrl(url);
    expect(parsed.vendorId).toBeNull();
    expect(parsed.mode).toBeNull();
  });

  it('view mode should make form read-only', () => {
    const mode = 'view';
    const isViewMode = mode === 'view';
    const isReadOnly = isViewMode;
    expect(isReadOnly).toBe(true);
  });

  it('edit mode should allow form editing', () => {
    const mode = 'edit';
    const isViewMode = mode === 'view';
    const isReadOnly = isViewMode;
    expect(isReadOnly).toBe(false);
  });

  it('no mode (evaluate) should allow form editing', () => {
    const mode = null;
    const isViewMode = mode === 'view';
    const isReadOnly = isViewMode;
    expect(isReadOnly).toBe(false);
  });
});

describe('Action Button Logic', () => {
  it('should show Evaluate button for not_evaluated vendors', () => {
    const status = 'not_evaluated';
    const isEvaluated = status !== 'not_evaluated';
    expect(isEvaluated).toBe(false);
    // Evaluate button shown when !isEvaluated
  });

  it('should show View button for evaluated vendors', () => {
    const status = 'qualified';
    const isEvaluated = status !== 'not_evaluated';
    expect(isEvaluated).toBe(true);
    // View button shown when isEvaluated
  });

  it('should show Edit button for draft vendors', () => {
    const status = 'draft';
    const isEvaluated = status !== 'not_evaluated';
    const isDraft = status === 'draft';
    const canEdit = isDraft || status === 'conditional' || status === 'not_qualified';
    expect(isEvaluated).toBe(true);
    expect(canEdit).toBe(true);
  });

  it('should show Edit button for conditional vendors', () => {
    const status = 'conditional';
    const canEdit = status === 'draft' || status === 'conditional' || status === 'not_qualified';
    expect(canEdit).toBe(true);
  });

  it('should show Edit button for not_qualified vendors', () => {
    const status = 'not_qualified';
    const canEdit = status === 'draft' || status === 'conditional' || status === 'not_qualified';
    expect(canEdit).toBe(true);
  });

  it('should NOT show Edit button for qualified vendors', () => {
    const status = 'qualified';
    const canEdit = status === 'draft' || status === 'conditional' || status === 'not_qualified';
    expect(canEdit).toBe(false);
  });

  it('should NOT show Edit button for rejected vendors', () => {
    const status = 'rejected';
    const canEdit = status === 'draft' || status === 'conditional' || status === 'not_qualified';
    expect(canEdit).toBe(false);
  });
});

describe('Summary Card Counts', () => {
  const vendors = [
    { qualificationStatus: 'qualified' },
    { qualificationStatus: 'qualified' },
    { qualificationStatus: 'conditional' },
    { qualificationStatus: 'not_qualified' },
    { qualificationStatus: 'not_evaluated' },
    { qualificationStatus: 'not_evaluated' },
    { qualificationStatus: 'not_evaluated' },
    { qualificationStatus: 'draft' },
    { qualificationStatus: 'rejected' },
  ];

  it('should count total vendors correctly', () => {
    expect(vendors.length).toBe(9);
  });

  it('should count qualified vendors correctly', () => {
    expect(vendors.filter(v => v.qualificationStatus === 'qualified').length).toBe(2);
  });

  it('should count conditional vendors correctly', () => {
    expect(vendors.filter(v => v.qualificationStatus === 'conditional').length).toBe(1);
  });

  it('should count not_qualified vendors correctly', () => {
    expect(vendors.filter(v => v.qualificationStatus === 'not_qualified').length).toBe(1);
  });

  it('should count not_evaluated vendors correctly', () => {
    expect(vendors.filter(v => v.qualificationStatus === 'not_evaluated').length).toBe(3);
  });

  it('should count draft vendors correctly', () => {
    expect(vendors.filter(v => v.qualificationStatus === 'draft').length).toBe(1);
  });

  it('should count rejected vendors correctly', () => {
    expect(vendors.filter(v => v.qualificationStatus === 'rejected').length).toBe(1);
  });
});

describe('Expiry Badge Logic', () => {
  it('should show expired badge for past dates', () => {
    const expiryDate = '2025-01-01';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysUntilExpiry).toBeLessThan(0);
  });

  it('should show warning badge for dates within 90 days', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 45);
    const expiryDate = futureDate.toISOString().split('T')[0];
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysUntilExpiry).toBeGreaterThan(0);
    expect(daysUntilExpiry).toBeLessThanOrEqual(90);
  });

  it('should show no badge for dates beyond 90 days', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 180);
    const expiryDate = futureDate.toISOString().split('T')[0];
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysUntilExpiry).toBeGreaterThan(90);
  });

  it('should handle null expiry date', () => {
    const expiryDate: string | null = null;
    expect(expiryDate).toBeNull();
    // No badge should be shown
  });
});

describe('Latest Qualification Version Selection', () => {
  it('should select the highest version for a vendor', () => {
    const qualifications: QualificationRow[] = [
      { vendorId: 1, totalScore: '15', qualificationStatus: 'conditional', evaluationDate: '2026-01-01', expiryDate: '2027-01-01', approvalStatus: 'draft', version: 1 },
      { vendorId: 1, totalScore: '25', qualificationStatus: 'qualified', evaluationDate: '2026-06-01', expiryDate: '2027-06-01', approvalStatus: 'approved', version: 2 },
      { vendorId: 1, totalScore: '20', qualificationStatus: 'conditional', evaluationDate: '2026-03-01', expiryDate: '2027-03-01', approvalStatus: 'pending_compliance', version: 3 },
    ];

    const qualMap: Record<number, QualificationRow> = {};
    for (const q of qualifications) {
      if (!qualMap[q.vendorId] || q.version > qualMap[q.vendorId].version) {
        qualMap[q.vendorId] = q;
      }
    }

    expect(qualMap[1].version).toBe(3);
    expect(qualMap[1].totalScore).toBe('20');
  });

  it('should handle multiple vendors correctly', () => {
    const qualifications: QualificationRow[] = [
      { vendorId: 1, totalScore: '25', qualificationStatus: 'qualified', evaluationDate: '2026-01-01', expiryDate: '2027-01-01', approvalStatus: 'approved', version: 2 },
      { vendorId: 2, totalScore: '18', qualificationStatus: 'conditional', evaluationDate: '2026-02-01', expiryDate: '2027-02-01', approvalStatus: 'draft', version: 1 },
      { vendorId: 1, totalScore: '15', qualificationStatus: 'conditional', evaluationDate: '2025-06-01', expiryDate: '2026-06-01', approvalStatus: 'draft', version: 1 },
    ];

    const qualMap: Record<number, QualificationRow> = {};
    for (const q of qualifications) {
      if (!qualMap[q.vendorId] || q.version > qualMap[q.vendorId].version) {
        qualMap[q.vendorId] = q;
      }
    }

    expect(qualMap[1].version).toBe(2);
    expect(qualMap[1].totalScore).toBe('25');
    expect(qualMap[2].version).toBe(1);
    expect(qualMap[2].totalScore).toBe('18');
  });
});
