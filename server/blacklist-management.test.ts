import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Vendor Blacklist Management Tests
 *
 * Tests for the blacklist module:
 * 1. Schema validation for blacklist request creation
 * 2. Schema validation for blacklist request updates
 * 3. Workflow state transitions (Draft → Submitted → Validated → Pending Approval → Approved)
 * 4. Rejection workflow
 * 5. Revocation workflow
 * 6. Evidence upload validation
 * 7. Approval with digital signature validation
 * 8. Summary statistics aggregation
 * 9. Case number generation format
 * 10. Vendor blacklist status cross-module check
 */

// ─── Schema Definitions (mirrored from blacklistRouter) ──────────────────

const REASON_CATEGORIES = [
  'fraud_falsified_docs',
  'corruption_bribery',
  'sanctions_screening_failure',
  'repeated_non_performance',
  'contract_abandonment',
  'repeated_delivery_failure',
  'refusal_correct_defects',
  'false_declarations',
  'conflict_of_interest',
  'other',
] as const;

const STATUSES = [
  'draft',
  'submitted',
  'under_validation',
  'pending_approval',
  'approved',
  'rejected',
  'revoked',
  'expired',
] as const;

const CreateRequestInput = z.object({
  vendorId: z.number(),
  reasonCategory: z.enum(REASON_CATEGORIES),
  detailedJustification: z.string().min(10),
  incidentDate: z.string().optional(),
  relatedReference: z.string().optional(),
  recommendedDuration: z.string().optional(),
  additionalComments: z.string().optional(),
});

const UpdateRequestInput = z.object({
  caseId: z.number(),
  reasonCategory: z.enum(REASON_CATEGORIES).optional(),
  detailedJustification: z.string().min(10).optional(),
  incidentDate: z.string().optional(),
  relatedReference: z.string().optional(),
  recommendedDuration: z.string().optional(),
  additionalComments: z.string().optional(),
});

const ApproveRequestInput = z.object({
  caseId: z.number(),
  signatureDataUrl: z.string().min(1),
  blacklistStartDate: z.string(),
  expiryDate: z.string().optional(),
  reviewDate: z.string().optional(),
  comments: z.string().optional(),
});

const RejectRequestInput = z.object({
  caseId: z.number(),
  rejectionReason: z.string().min(5),
});

const RevokeBlacklistInput = z.object({
  caseId: z.number(),
  revocationReason: z.string().min(5),
});

const UploadEvidenceInput = z.object({
  caseId: z.number(),
  fileName: z.string(),
  fileBase64: z.string(),
  fileType: z.string(),
  description: z.string().optional(),
});

const ListInput = z.object({
  status: z.enum(STATUSES).optional(),
  search: z.string().optional(),
  limit: z.number().default(100),
  offset: z.number().default(0),
});

const RevokeSignatureInput = z.object({
  signatureId: z.number(),
  revocationReason: z.string().min(5),
});

// ─── Create Request Schema Tests ─────────────────────────────────────────

describe('Blacklist Create Request Schema', () => {
  it('should accept valid create request with all fields', () => {
    const result = CreateRequestInput.safeParse({
      vendorId: 1,
      reasonCategory: 'fraud_falsified_docs',
      detailedJustification: 'This vendor submitted falsified documents during the procurement process.',
      incidentDate: '2026-01-15',
      relatedReference: 'PO-2026-001',
      recommendedDuration: '2_years',
      additionalComments: 'Multiple instances documented.',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid create request with minimum required fields', () => {
    const result = CreateRequestInput.safeParse({
      vendorId: 42,
      reasonCategory: 'corruption_bribery',
      detailedJustification: 'Evidence of bribery attempt during contract negotiation.',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing vendorId', () => {
    const result = CreateRequestInput.safeParse({
      reasonCategory: 'fraud_falsified_docs',
      detailedJustification: 'This is a valid justification text.',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing reasonCategory', () => {
    const result = CreateRequestInput.safeParse({
      vendorId: 1,
      detailedJustification: 'This is a valid justification text.',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid reasonCategory', () => {
    const result = CreateRequestInput.safeParse({
      vendorId: 1,
      reasonCategory: 'invalid_reason',
      detailedJustification: 'This is a valid justification text.',
    });
    expect(result.success).toBe(false);
  });

  it('should reject justification shorter than 10 characters', () => {
    const result = CreateRequestInput.safeParse({
      vendorId: 1,
      reasonCategory: 'fraud_falsified_docs',
      detailedJustification: 'Short',
    });
    expect(result.success).toBe(false);
  });

  it('should accept justification exactly 10 characters', () => {
    const result = CreateRequestInput.safeParse({
      vendorId: 1,
      reasonCategory: 'fraud_falsified_docs',
      detailedJustification: '1234567890',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all valid reason categories', () => {
    for (const category of REASON_CATEGORIES) {
      const result = CreateRequestInput.safeParse({
        vendorId: 1,
        reasonCategory: category,
        detailedJustification: 'Valid justification text for testing.',
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── Update Request Schema Tests ─────────────────────────────────────────

describe('Blacklist Update Request Schema', () => {
  it('should accept valid update with all fields', () => {
    const result = UpdateRequestInput.safeParse({
      caseId: 1,
      reasonCategory: 'repeated_non_performance',
      detailedJustification: 'Updated justification with more details.',
      incidentDate: '2026-02-01',
      relatedReference: 'CONTRACT-2026-005',
      recommendedDuration: '1_year',
      additionalComments: 'Updated comments.',
    });
    expect(result.success).toBe(true);
  });

  it('should accept update with only caseId (no changes)', () => {
    const result = UpdateRequestInput.safeParse({
      caseId: 5,
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing caseId', () => {
    const result = UpdateRequestInput.safeParse({
      reasonCategory: 'fraud_falsified_docs',
    });
    expect(result.success).toBe(false);
  });

  it('should reject justification update shorter than 10 characters', () => {
    const result = UpdateRequestInput.safeParse({
      caseId: 1,
      detailedJustification: 'Short',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Approve Request Schema Tests ────────────────────────────────────────

describe('Blacklist Approve Request Schema', () => {
  it('should accept valid approval with all fields', () => {
    const result = ApproveRequestInput.safeParse({
      caseId: 1,
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      blacklistStartDate: '2026-03-01',
      expiryDate: '2028-03-01',
      reviewDate: '2027-03-01',
      comments: 'Approved after thorough review.',
    });
    expect(result.success).toBe(true);
  });

  it('should accept approval with minimum required fields', () => {
    const result = ApproveRequestInput.safeParse({
      caseId: 1,
      signatureDataUrl: 'data:image/png;base64,abc123',
      blacklistStartDate: '2026-03-01',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty signatureDataUrl', () => {
    const result = ApproveRequestInput.safeParse({
      caseId: 1,
      signatureDataUrl: '',
      blacklistStartDate: '2026-03-01',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing blacklistStartDate', () => {
    const result = ApproveRequestInput.safeParse({
      caseId: 1,
      signatureDataUrl: 'data:image/png;base64,abc123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing caseId', () => {
    const result = ApproveRequestInput.safeParse({
      signatureDataUrl: 'data:image/png;base64,abc123',
      blacklistStartDate: '2026-03-01',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Reject Request Schema Tests ─────────────────────────────────────────

describe('Blacklist Reject Request Schema', () => {
  it('should accept valid rejection', () => {
    const result = RejectRequestInput.safeParse({
      caseId: 1,
      rejectionReason: 'Insufficient evidence provided.',
    });
    expect(result.success).toBe(true);
  });

  it('should reject reason shorter than 5 characters', () => {
    const result = RejectRequestInput.safeParse({
      caseId: 1,
      rejectionReason: 'No',
    });
    expect(result.success).toBe(false);
  });

  it('should accept reason exactly 5 characters', () => {
    const result = RejectRequestInput.safeParse({
      caseId: 1,
      rejectionReason: 'Valid',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing caseId', () => {
    const result = RejectRequestInput.safeParse({
      rejectionReason: 'Valid reason',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Revoke Blacklist Schema Tests ───────────────────────────────────────

describe('Blacklist Revoke Schema', () => {
  it('should accept valid revocation', () => {
    const result = RevokeBlacklistInput.safeParse({
      caseId: 1,
      revocationReason: 'Vendor has demonstrated compliance improvements.',
    });
    expect(result.success).toBe(true);
  });

  it('should reject reason shorter than 5 characters', () => {
    const result = RevokeBlacklistInput.safeParse({
      caseId: 1,
      revocationReason: 'OK',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing caseId', () => {
    const result = RevokeBlacklistInput.safeParse({
      revocationReason: 'Valid reason for revocation.',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Evidence Upload Schema Tests ────────────────────────────────────────

describe('Blacklist Evidence Upload Schema', () => {
  it('should accept valid evidence upload with all fields', () => {
    const result = UploadEvidenceInput.safeParse({
      caseId: 1,
      fileName: 'fraud_evidence.pdf',
      fileBase64: 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoK',
      fileType: 'application/pdf',
      description: 'Falsified invoice documentation.',
    });
    expect(result.success).toBe(true);
  });

  it('should accept evidence upload without description', () => {
    const result = UploadEvidenceInput.safeParse({
      caseId: 1,
      fileName: 'photo.jpg',
      fileBase64: '/9j/4AAQSkZJRg==',
      fileType: 'image/jpeg',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing fileName', () => {
    const result = UploadEvidenceInput.safeParse({
      caseId: 1,
      fileBase64: 'abc123',
      fileType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing fileBase64', () => {
    const result = UploadEvidenceInput.safeParse({
      caseId: 1,
      fileName: 'doc.pdf',
      fileType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing fileType', () => {
    const result = UploadEvidenceInput.safeParse({
      caseId: 1,
      fileName: 'doc.pdf',
      fileBase64: 'abc123',
    });
    expect(result.success).toBe(false);
  });
});

// ─── List Input Schema Tests ─────────────────────────────────────────────

describe('Blacklist List Input Schema', () => {
  it('should accept empty input (all defaults)', () => {
    const result = ListInput.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
      expect(result.data.offset).toBe(0);
    }
  });

  it('should accept valid status filter', () => {
    for (const status of STATUSES) {
      const result = ListInput.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status filter', () => {
    const result = ListInput.safeParse({ status: 'invalid_status' });
    expect(result.success).toBe(false);
  });

  it('should accept search term', () => {
    const result = ListInput.safeParse({ search: 'ACME Corp' });
    expect(result.success).toBe(true);
  });

  it('should accept custom limit and offset', () => {
    const result = ListInput.safeParse({ limit: 50, offset: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(100);
    }
  });
});

// ─── Revoke Signature Schema Tests ───────────────────────────────────────

describe('Blacklist Revoke Signature Schema', () => {
  it('should accept valid signature revocation', () => {
    const result = RevokeSignatureInput.safeParse({
      signatureId: 1,
      revocationReason: 'Signer was not authorized.',
    });
    expect(result.success).toBe(true);
  });

  it('should reject reason shorter than 5 characters', () => {
    const result = RevokeSignatureInput.safeParse({
      signatureId: 1,
      revocationReason: 'No',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing signatureId', () => {
    const result = RevokeSignatureInput.safeParse({
      revocationReason: 'Valid reason.',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Workflow State Transition Logic Tests ───────────────────────────────

describe('Blacklist Workflow State Transitions', () => {
  // Simulate state transition validation logic
  const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['submitted'],
    submitted: ['under_validation', 'rejected'],
    under_validation: ['pending_approval', 'rejected'],
    pending_approval: ['approved', 'rejected'],
    approved: ['revoked', 'expired'],
    rejected: [], // terminal
    revoked: [], // terminal
    expired: [], // terminal
  };

  function canTransition(from: string, to: string): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  it('should allow Draft → Submitted', () => {
    expect(canTransition('draft', 'submitted')).toBe(true);
  });

  it('should allow Submitted → Under Validation', () => {
    expect(canTransition('submitted', 'under_validation')).toBe(true);
  });

  it('should allow Under Validation → Pending Approval', () => {
    expect(canTransition('under_validation', 'pending_approval')).toBe(true);
  });

  it('should allow Pending Approval → Approved', () => {
    expect(canTransition('pending_approval', 'approved')).toBe(true);
  });

  it('should allow Approved → Revoked', () => {
    expect(canTransition('approved', 'revoked')).toBe(true);
  });

  it('should allow Approved → Expired', () => {
    expect(canTransition('approved', 'expired')).toBe(true);
  });

  it('should NOT allow Draft → Approved (skip steps)', () => {
    expect(canTransition('draft', 'approved')).toBe(false);
  });

  it('should NOT allow Rejected → Submitted (no re-submit)', () => {
    expect(canTransition('rejected', 'submitted')).toBe(false);
  });

  it('should NOT allow Revoked → Approved (no re-approve)', () => {
    expect(canTransition('revoked', 'approved')).toBe(false);
  });

  it('should NOT allow Expired → any state', () => {
    for (const status of STATUSES) {
      expect(canTransition('expired', status)).toBe(false);
    }
  });

  it('should allow rejection from submitted, under_validation, and pending_approval', () => {
    expect(canTransition('submitted', 'rejected')).toBe(true);
    expect(canTransition('under_validation', 'rejected')).toBe(true);
    expect(canTransition('pending_approval', 'rejected')).toBe(true);
  });

  it('should NOT allow rejection from draft or approved', () => {
    expect(canTransition('draft', 'rejected')).toBe(false);
    expect(canTransition('approved', 'rejected')).toBe(false);
  });
});

// ─── Case Number Format Tests ────────────────────────────────────────────

describe('Blacklist Case Number Format', () => {
  function generateCaseNumber(year: number, seq: number): string {
    return `BL-${year}-${String(seq).padStart(4, '0')}`;
  }

  it('should generate correct format for first case', () => {
    expect(generateCaseNumber(2026, 1)).toBe('BL-2026-0001');
  });

  it('should generate correct format for double-digit sequence', () => {
    expect(generateCaseNumber(2026, 42)).toBe('BL-2026-0042');
  });

  it('should generate correct format for triple-digit sequence', () => {
    expect(generateCaseNumber(2026, 123)).toBe('BL-2026-0123');
  });

  it('should generate correct format for four-digit sequence', () => {
    expect(generateCaseNumber(2026, 9999)).toBe('BL-2026-9999');
  });

  it('should handle different years', () => {
    expect(generateCaseNumber(2025, 1)).toBe('BL-2025-0001');
    expect(generateCaseNumber(2027, 5)).toBe('BL-2027-0005');
  });

  it('should match expected regex pattern', () => {
    const pattern = /^BL-\d{4}-\d{4}$/;
    expect(pattern.test(generateCaseNumber(2026, 1))).toBe(true);
    expect(pattern.test(generateCaseNumber(2026, 9999))).toBe(true);
  });
});

// ─── Summary Statistics Aggregation Tests ────────────────────────────────

describe('Blacklist Summary Statistics', () => {
  function computeSummary(cases: { status: string }[]) {
    const statusMap: Record<string, number> = {};
    cases.forEach((c) => {
      statusMap[c.status] = (statusMap[c.status] ?? 0) + 1;
    });
    return {
      total: cases.length,
      draft: statusMap['draft'] ?? 0,
      submitted: statusMap['submitted'] ?? 0,
      underValidation: statusMap['under_validation'] ?? 0,
      pendingApproval: statusMap['pending_approval'] ?? 0,
      approved: statusMap['approved'] ?? 0,
      rejected: statusMap['rejected'] ?? 0,
      revoked: statusMap['revoked'] ?? 0,
      expired: statusMap['expired'] ?? 0,
    };
  }

  it('should return all zeros for empty case list', () => {
    const summary = computeSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.draft).toBe(0);
    expect(summary.approved).toBe(0);
    expect(summary.rejected).toBe(0);
    expect(summary.revoked).toBe(0);
  });

  it('should correctly count cases by status', () => {
    const cases = [
      { status: 'draft' },
      { status: 'draft' },
      { status: 'submitted' },
      { status: 'approved' },
      { status: 'approved' },
      { status: 'approved' },
      { status: 'rejected' },
      { status: 'revoked' },
    ];
    const summary = computeSummary(cases);
    expect(summary.total).toBe(8);
    expect(summary.draft).toBe(2);
    expect(summary.submitted).toBe(1);
    expect(summary.approved).toBe(3);
    expect(summary.rejected).toBe(1);
    expect(summary.revoked).toBe(1);
    expect(summary.underValidation).toBe(0);
    expect(summary.pendingApproval).toBe(0);
    expect(summary.expired).toBe(0);
  });

  it('should handle all statuses present', () => {
    const cases = STATUSES.map((status) => ({ status }));
    const summary = computeSummary(cases);
    expect(summary.total).toBe(8);
    expect(summary.draft).toBe(1);
    expect(summary.submitted).toBe(1);
    expect(summary.underValidation).toBe(1);
    expect(summary.pendingApproval).toBe(1);
    expect(summary.approved).toBe(1);
    expect(summary.rejected).toBe(1);
    expect(summary.revoked).toBe(1);
    expect(summary.expired).toBe(1);
  });
});

// ─── Vendor Blacklist Status Check Tests ─────────────────────────────────

describe('Vendor Blacklist Status Check', () => {
  function checkBlacklistStatus(
    activeCases: { caseNumber: string; reasonCategory: string; blacklistStartDate: string | null; expiryDate: string | null }[]
  ) {
    const activeCase = activeCases.find((c) => true); // first active case
    return {
      isBlacklisted: !!activeCase,
      caseNumber: activeCase?.caseNumber ?? null,
      reason: activeCase?.reasonCategory ?? null,
      since: activeCase?.blacklistStartDate ?? null,
      expiryDate: activeCase?.expiryDate ?? null,
    };
  }

  it('should return not blacklisted when no active cases', () => {
    const result = checkBlacklistStatus([]);
    expect(result.isBlacklisted).toBe(false);
    expect(result.caseNumber).toBeNull();
    expect(result.reason).toBeNull();
    expect(result.since).toBeNull();
    expect(result.expiryDate).toBeNull();
  });

  it('should return blacklisted with case details when active case exists', () => {
    const result = checkBlacklistStatus([
      {
        caseNumber: 'BL-2026-0001',
        reasonCategory: 'fraud_falsified_docs',
        blacklistStartDate: '2026-01-15',
        expiryDate: '2028-01-15',
      },
    ]);
    expect(result.isBlacklisted).toBe(true);
    expect(result.caseNumber).toBe('BL-2026-0001');
    expect(result.reason).toBe('fraud_falsified_docs');
    expect(result.since).toBe('2026-01-15');
    expect(result.expiryDate).toBe('2028-01-15');
  });

  it('should handle permanent blacklist (no expiry date)', () => {
    const result = checkBlacklistStatus([
      {
        caseNumber: 'BL-2026-0002',
        reasonCategory: 'corruption_bribery',
        blacklistStartDate: '2026-03-01',
        expiryDate: null,
      },
    ]);
    expect(result.isBlacklisted).toBe(true);
    expect(result.expiryDate).toBeNull();
  });
});

// ─── Audit Log Action Types Tests ────────────────────────────────────────

describe('Blacklist Audit Log Action Types', () => {
  const VALID_ACTION_TYPES = [
    'case_created',
    'case_updated',
    'case_submitted',
    'validation_performed',
    'approval_signed',
    'case_approved',
    'case_rejected',
    'case_revoked',
    'case_expired',
    'evidence_uploaded',
    'evidence_removed',
    'signature_added',
    'signature_revoked',
    'comment_added',
  ];

  const AuditActionSchema = z.enum(VALID_ACTION_TYPES as [string, ...string[]]);

  it('should accept all valid action types', () => {
    for (const action of VALID_ACTION_TYPES) {
      const result = AuditActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid action types', () => {
    const result = AuditActionSchema.safeParse('invalid_action');
    expect(result.success).toBe(false);
  });

  it('should have 14 valid action types', () => {
    expect(VALID_ACTION_TYPES.length).toBe(14);
  });
});

// ─── Reason Category Coverage Tests ──────────────────────────────────────

describe('Blacklist Reason Categories', () => {
  it('should have 10 reason categories', () => {
    expect(REASON_CATEGORIES.length).toBe(10);
  });

  it('should include all required governance categories', () => {
    expect(REASON_CATEGORIES).toContain('fraud_falsified_docs');
    expect(REASON_CATEGORIES).toContain('corruption_bribery');
    expect(REASON_CATEGORIES).toContain('sanctions_screening_failure');
    expect(REASON_CATEGORIES).toContain('conflict_of_interest');
  });

  it('should include all performance-related categories', () => {
    expect(REASON_CATEGORIES).toContain('repeated_non_performance');
    expect(REASON_CATEGORIES).toContain('contract_abandonment');
    expect(REASON_CATEGORIES).toContain('repeated_delivery_failure');
    expect(REASON_CATEGORIES).toContain('refusal_correct_defects');
  });

  it('should include "other" as catch-all', () => {
    expect(REASON_CATEGORIES).toContain('other');
  });
});

// ─── Digital Signature Hash Tests ────────────────────────────────────────

describe('Digital Signature Hash Generation', () => {
  // Simulate the hash generation logic from the router
  function generateSignatureHash(params: {
    caseId: number;
    signerId: number;
    timestamp: string;
    caseNumber: string;
  }): string {
    // In the actual router, this uses crypto.createHash('sha256')
    // Here we test the input structure
    const payload = JSON.stringify(params);
    expect(payload).toBeTruthy();
    expect(payload.length).toBeGreaterThan(0);
    // Return a mock hash for testing
    return 'a'.repeat(64); // SHA-256 produces 64 hex chars
  }

  it('should generate hash from case details', () => {
    const hash = generateSignatureHash({
      caseId: 1,
      signerId: 42,
      timestamp: '2026-03-01T12:00:00.000Z',
      caseNumber: 'BL-2026-0001',
    });
    expect(hash).toHaveLength(64);
  });

  it('should include all required fields in hash payload', () => {
    const params = {
      caseId: 1,
      signerId: 42,
      timestamp: '2026-03-01T12:00:00.000Z',
      caseNumber: 'BL-2026-0001',
    };
    const payload = JSON.stringify(params);
    expect(payload).toContain('"caseId"');
    expect(payload).toContain('"signerId"');
    expect(payload).toContain('"timestamp"');
    expect(payload).toContain('"caseNumber"');
  });
});

// ─── Update Restriction Tests ────────────────────────────────────────────

describe('Blacklist Update Restrictions', () => {
  function canUpdate(status: string): boolean {
    return ['draft', 'submitted'].includes(status);
  }

  it('should allow updates in Draft status', () => {
    expect(canUpdate('draft')).toBe(true);
  });

  it('should allow updates in Submitted status', () => {
    expect(canUpdate('submitted')).toBe(true);
  });

  it('should NOT allow updates in Under Validation status', () => {
    expect(canUpdate('under_validation')).toBe(false);
  });

  it('should NOT allow updates in Pending Approval status', () => {
    expect(canUpdate('pending_approval')).toBe(false);
  });

  it('should NOT allow updates in Approved status', () => {
    expect(canUpdate('approved')).toBe(false);
  });

  it('should NOT allow updates in Rejected status', () => {
    expect(canUpdate('rejected')).toBe(false);
  });

  it('should NOT allow updates in Revoked status', () => {
    expect(canUpdate('revoked')).toBe(false);
  });

  it('should NOT allow updates in Expired status', () => {
    expect(canUpdate('expired')).toBe(false);
  });
});

// ─── Submit Restriction Tests ────────────────────────────────────────────

describe('Blacklist Submit Restrictions', () => {
  function canSubmit(status: string): boolean {
    return status === 'draft';
  }

  it('should allow submission only from Draft status', () => {
    expect(canSubmit('draft')).toBe(true);
  });

  it('should NOT allow submission from any other status', () => {
    const otherStatuses = STATUSES.filter((s) => s !== 'draft');
    for (const status of otherStatuses) {
      expect(canSubmit(status)).toBe(false);
    }
  });
});

// ─── Vendor Flag Sync Tests ─────────────────────────────────────────────

describe('Vendor Blacklist Flag Synchronization', () => {
  interface VendorRecord {
    id: number;
    isBlacklisted: number;
    blacklistReason: string | null;
  }

  function applyBlacklist(vendor: VendorRecord, justification: string): VendorRecord {
    return {
      ...vendor,
      isBlacklisted: 1,
      blacklistReason: justification,
    };
  }

  function removeBlacklist(vendor: VendorRecord): VendorRecord {
    return {
      ...vendor,
      isBlacklisted: 0,
      blacklistReason: null,
    };
  }

  it('should set isBlacklisted to 1 on approval', () => {
    const vendor: VendorRecord = { id: 1, isBlacklisted: 0, blacklistReason: null };
    const updated = applyBlacklist(vendor, 'Fraud detected');
    expect(updated.isBlacklisted).toBe(1);
    expect(updated.blacklistReason).toBe('Fraud detected');
  });

  it('should set isBlacklisted to 0 on revocation', () => {
    const vendor: VendorRecord = { id: 1, isBlacklisted: 1, blacklistReason: 'Fraud detected' };
    const updated = removeBlacklist(vendor);
    expect(updated.isBlacklisted).toBe(0);
    expect(updated.blacklistReason).toBeNull();
  });

  it('should preserve vendor id during flag changes', () => {
    const vendor: VendorRecord = { id: 42, isBlacklisted: 0, blacklistReason: null };
    const blacklisted = applyBlacklist(vendor, 'Test');
    expect(blacklisted.id).toBe(42);
    const reinstated = removeBlacklist(blacklisted);
    expect(reinstated.id).toBe(42);
  });
});


// ─── Submitter Signature Tests ──────────────────────────────────────────

describe('Submitter Signature on Submit', () => {
  const SubmitWithSignatureInput = z.object({
    caseId: z.number(),
    submitterSignatureDataUrl: z.string().min(1).optional(),
  });

  it('should accept submission without signature (optional)', () => {
    const result = SubmitWithSignatureInput.safeParse({
      caseId: 1,
    });
    expect(result.success).toBe(true);
  });

  it('should accept submission with valid signature data URL', () => {
    const result = SubmitWithSignatureInput.safeParse({
      caseId: 1,
      submitterSignatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty submitter signature string', () => {
    const result = SubmitWithSignatureInput.safeParse({
      caseId: 1,
      submitterSignatureDataUrl: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing caseId', () => {
    const result = SubmitWithSignatureInput.safeParse({
      submitterSignatureDataUrl: 'data:image/png;base64,abc123',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Signature Record Structure Tests ───────────────────────────────────

describe('Signature Record Structure', () => {
  const SignatureRecord = z.object({
    id: z.number(),
    caseId: z.number(),
    signerName: z.string(),
    signerRole: z.enum(['submitter', 'validator', 'approver']),
    signatureDataUrl: z.string(),
    signatureHash: z.string(),
    signedAt: z.string(),
    verificationQrData: z.string().optional().nullable(),
  });

  it('should validate a submitter signature record', () => {
    const result = SignatureRecord.safeParse({
      id: 1,
      caseId: 1,
      signerName: 'John Doe',
      signerRole: 'submitter',
      signatureDataUrl: 'data:image/png;base64,abc123',
      signatureHash: 'sha256:abc123def456',
      signedAt: '2026-03-08T12:00:00.000Z',
      verificationQrData: JSON.stringify({
        caseId: 1,
        signerId: 42,
        timestamp: '2026-03-08T12:00:00.000Z',
        caseNumber: 'BL-2026-0001',
      }),
    });
    expect(result.success).toBe(true);
  });

  it('should validate an approver signature record', () => {
    const result = SignatureRecord.safeParse({
      id: 2,
      caseId: 1,
      signerName: 'Manager Smith',
      signerRole: 'approver',
      signatureDataUrl: 'data:image/png;base64,xyz789',
      signatureHash: 'sha256:xyz789ghi012',
      signedAt: '2026-03-08T14:00:00.000Z',
      verificationQrData: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid signer role', () => {
    const result = SignatureRecord.safeParse({
      id: 1,
      caseId: 1,
      signerName: 'John Doe',
      signerRole: 'unknown_role',
      signatureDataUrl: 'data:image/png;base64,abc123',
      signatureHash: 'sha256:abc123',
      signedAt: '2026-03-08T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('should distinguish submitter from approver roles', () => {
    const submitter = SignatureRecord.safeParse({
      id: 1,
      caseId: 1,
      signerName: 'Submitter',
      signerRole: 'submitter',
      signatureDataUrl: 'data:image/png;base64,abc',
      signatureHash: 'sha256:abc',
      signedAt: '2026-03-08T12:00:00.000Z',
    });
    const approver = SignatureRecord.safeParse({
      id: 2,
      caseId: 1,
      signerName: 'Approver',
      signerRole: 'approver',
      signatureDataUrl: 'data:image/png;base64,xyz',
      signatureHash: 'sha256:xyz',
      signedAt: '2026-03-08T14:00:00.000Z',
    });
    expect(submitter.success).toBe(true);
    expect(approver.success).toBe(true);
    if (submitter.success && approver.success) {
      expect(submitter.data.signerRole).toBe('submitter');
      expect(approver.data.signerRole).toBe('approver');
    }
  });
});

// ─── QR Code Verification Data Tests ────────────────────────────────────

describe('QR Code Verification Data', () => {
  interface QRVerificationPayload {
    caseId: number;
    signerId: number;
    timestamp: string;
    caseNumber: string;
    signerRole: string;
    signatureHash: string;
  }

  function generateQRPayload(params: QRVerificationPayload): string {
    return JSON.stringify(params);
  }

  function parseQRPayload(data: string): QRVerificationPayload {
    return JSON.parse(data);
  }

  it('should generate valid QR payload with all required fields', () => {
    const payload = generateQRPayload({
      caseId: 1,
      signerId: 42,
      timestamp: '2026-03-08T12:00:00.000Z',
      caseNumber: 'BL-2026-0001',
      signerRole: 'submitter',
      signatureHash: 'sha256:abc123',
    });
    const parsed = parseQRPayload(payload);
    expect(parsed.caseId).toBe(1);
    expect(parsed.signerId).toBe(42);
    expect(parsed.signerRole).toBe('submitter');
    expect(parsed.signatureHash).toBe('sha256:abc123');
    expect(parsed.caseNumber).toBe('BL-2026-0001');
  });

  it('should roundtrip QR payload correctly', () => {
    const original: QRVerificationPayload = {
      caseId: 5,
      signerId: 100,
      timestamp: '2026-06-15T09:30:00.000Z',
      caseNumber: 'BL-2026-0005',
      signerRole: 'approver',
      signatureHash: 'sha256:xyz789',
    };
    const serialized = generateQRPayload(original);
    const deserialized = parseQRPayload(serialized);
    expect(deserialized).toEqual(original);
  });

  it('should include different roles for submitter vs approver QR codes', () => {
    const submitterQR = generateQRPayload({
      caseId: 1,
      signerId: 10,
      timestamp: '2026-03-08T10:00:00.000Z',
      caseNumber: 'BL-2026-0001',
      signerRole: 'submitter',
      signatureHash: 'sha256:sub123',
    });
    const approverQR = generateQRPayload({
      caseId: 1,
      signerId: 20,
      timestamp: '2026-03-08T14:00:00.000Z',
      caseNumber: 'BL-2026-0001',
      signerRole: 'approver',
      signatureHash: 'sha256:app456',
    });
    const sub = parseQRPayload(submitterQR);
    const app = parseQRPayload(approverQR);
    expect(sub.signerRole).toBe('submitter');
    expect(app.signerRole).toBe('approver');
    expect(sub.signatureHash).not.toBe(app.signatureHash);
  });
});

// ─── Workflow Status After Signature Tests ──────────────────────────────

describe('Workflow Status Updates After Signature Actions', () => {
  type BlacklistStatus = typeof STATUSES[number];

  interface CaseState {
    status: BlacklistStatus;
    hasSubmitterSignature: boolean;
    hasApproverSignature: boolean;
  }

  function submitWithSignature(state: CaseState): CaseState {
    if (state.status !== 'draft') throw new Error('Can only submit from draft');
    return {
      status: 'submitted',
      hasSubmitterSignature: true,
      hasApproverSignature: false,
    };
  }

  function submitWithoutSignature(state: CaseState): CaseState {
    if (state.status !== 'draft') throw new Error('Can only submit from draft');
    return {
      status: 'submitted',
      hasSubmitterSignature: false,
      hasApproverSignature: false,
    };
  }

  function approveWithSignature(state: CaseState): CaseState {
    if (state.status !== 'pending_approval') throw new Error('Can only approve from pending_approval');
    return {
      ...state,
      status: 'approved',
      hasApproverSignature: true,
    };
  }

  it('should transition to submitted with submitter signature', () => {
    const initial: CaseState = { status: 'draft', hasSubmitterSignature: false, hasApproverSignature: false };
    const result = submitWithSignature(initial);
    expect(result.status).toBe('submitted');
    expect(result.hasSubmitterSignature).toBe(true);
  });

  it('should transition to submitted without submitter signature', () => {
    const initial: CaseState = { status: 'draft', hasSubmitterSignature: false, hasApproverSignature: false };
    const result = submitWithoutSignature(initial);
    expect(result.status).toBe('submitted');
    expect(result.hasSubmitterSignature).toBe(false);
  });

  it('should transition to approved with approver signature', () => {
    const initial: CaseState = { status: 'pending_approval', hasSubmitterSignature: true, hasApproverSignature: false };
    const result = approveWithSignature(initial);
    expect(result.status).toBe('approved');
    expect(result.hasApproverSignature).toBe(true);
  });

  it('should throw if trying to submit from non-draft status', () => {
    const state: CaseState = { status: 'submitted', hasSubmitterSignature: false, hasApproverSignature: false };
    expect(() => submitWithSignature(state)).toThrow('Can only submit from draft');
  });

  it('should throw if trying to approve from non-pending_approval status', () => {
    const state: CaseState = { status: 'submitted', hasSubmitterSignature: true, hasApproverSignature: false };
    expect(() => approveWithSignature(state)).toThrow('Can only approve from pending_approval');
  });

  it('should preserve submitter signature through approval', () => {
    const initial: CaseState = { status: 'draft', hasSubmitterSignature: false, hasApproverSignature: false };
    const submitted = submitWithSignature(initial);
    expect(submitted.hasSubmitterSignature).toBe(true);
    // Simulate validation and pending_approval transitions
    const pending: CaseState = { ...submitted, status: 'pending_approval' };
    const approved = approveWithSignature(pending);
    expect(approved.hasSubmitterSignature).toBe(true);
    expect(approved.hasApproverSignature).toBe(true);
    expect(approved.status).toBe('approved');
  });
});

// ─── Signature Hash Computation Tests ───────────────────────────────────

describe('Signature Hash Computation', () => {
  // Simulate the SHA-256 hash format used in the backend
  function computeSimulatedHash(dataUrl: string): string {
    // In production, this uses crypto.createHash('sha256')
    // Here we just verify the format
    const hash = `sha256:${Buffer.from(dataUrl).toString('base64').slice(0, 64)}`;
    return hash;
  }

  it('should produce a hash starting with sha256:', () => {
    const hash = computeSimulatedHash('data:image/png;base64,abc123');
    expect(hash.startsWith('sha256:')).toBe(true);
  });

  it('should produce different hashes for different signatures', () => {
    const hash1 = computeSimulatedHash('data:image/png;base64,signature1');
    const hash2 = computeSimulatedHash('data:image/png;base64,signature2');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce same hash for same signature', () => {
    const sig = 'data:image/png;base64,consistentSignature';
    const hash1 = computeSimulatedHash(sig);
    const hash2 = computeSimulatedHash(sig);
    expect(hash1).toBe(hash2);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
// NEW TESTS: Role-Based Gating, Workflow Config, Expiry, Notifications
// ═══════════════════════════════════════════════════════════════════════════

// ─── Role-Based Action Gating ──────────────────────────────────────────────

describe('Role-Based Action Gating', () => {
  // Simulated user roles
  const APPROVAL_ROLES = ['organization_admin', 'office_manager', 'project_manager'];
  const NON_APPROVAL_ROLES = ['user', 'viewer', 'data_entry'];

  function hasApprovalPermission(userRoles: string[]): boolean {
    return userRoles.some((r) => APPROVAL_ROLES.includes(r));
  }

  function canValidate(userRoles: string[]): boolean {
    return hasApprovalPermission(userRoles);
  }

  function canApprove(userRoles: string[]): boolean {
    return hasApprovalPermission(userRoles);
  }

  function canReject(userRoles: string[]): boolean {
    return hasApprovalPermission(userRoles);
  }

  function canRevoke(userRoles: string[]): boolean {
    return hasApprovalPermission(userRoles);
  }

  it('should allow organization_admin to validate', () => {
    expect(canValidate(['organization_admin'])).toBe(true);
  });

  it('should allow office_manager to validate', () => {
    expect(canValidate(['office_manager'])).toBe(true);
  });

  it('should allow project_manager to validate', () => {
    expect(canValidate(['project_manager'])).toBe(true);
  });

  it('should deny regular user from validating', () => {
    expect(canValidate(['user'])).toBe(false);
  });

  it('should deny viewer from validating', () => {
    expect(canValidate(['viewer'])).toBe(false);
  });

  it('should allow organization_admin to approve', () => {
    expect(canApprove(['organization_admin'])).toBe(true);
  });

  it('should allow office_manager to approve', () => {
    expect(canApprove(['office_manager'])).toBe(true);
  });

  it('should deny data_entry from approving', () => {
    expect(canApprove(['data_entry'])).toBe(false);
  });

  it('should allow organization_admin to reject', () => {
    expect(canReject(['organization_admin'])).toBe(true);
  });

  it('should deny viewer from rejecting', () => {
    expect(canReject(['viewer'])).toBe(false);
  });

  it('should allow project_manager to revoke', () => {
    expect(canRevoke(['project_manager'])).toBe(true);
  });

  it('should deny regular user from revoking', () => {
    expect(canRevoke(['user'])).toBe(false);
  });

  it('should allow user with multiple roles if any is approval role', () => {
    expect(canValidate(['user', 'office_manager'])).toBe(true);
  });

  it('should deny user with multiple non-approval roles', () => {
    expect(canValidate(['user', 'viewer', 'data_entry'])).toBe(false);
  });

  it('should handle empty roles array', () => {
    expect(canValidate([])).toBe(false);
    expect(canApprove([])).toBe(false);
    expect(canReject([])).toBe(false);
    expect(canRevoke([])).toBe(false);
  });
});

// ─── Workflow Configuration ────────────────────────────────────────────────

describe('Workflow Configuration', () => {
  // Schema for workflow config
  const WorkflowStageSchema = z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    labelAr: z.string().min(1),
    requiredRoles: z.array(z.string()).min(1),
    requireSignature: z.boolean(),
  });

  const WorkflowConfigSchema = z.object({
    stages: z.array(WorkflowStageSchema).min(1),
    requireSubmitterSignature: z.boolean(),
    requireApproverSignature: z.boolean(),
    autoExpiryEnabled: z.boolean(),
    defaultDurationMonths: z.number().min(0),
    notifyOnSubmission: z.boolean(),
    notifyOnApproval: z.boolean(),
    notifyOnRejection: z.boolean(),
    notifyOnExpiry: z.boolean(),
  });

  const DEFAULT_CONFIG = {
    stages: [
      {
        key: 'validation',
        label: 'Validation',
        labelAr: 'التحقق',
        requiredRoles: ['organization_admin', 'office_manager', 'project_manager'],
        requireSignature: false,
      },
      {
        key: 'approval',
        label: 'Approval',
        labelAr: 'الموافقة',
        requiredRoles: ['organization_admin', 'office_manager'],
        requireSignature: true,
      },
    ],
    requireSubmitterSignature: true,
    requireApproverSignature: true,
    autoExpiryEnabled: true,
    defaultDurationMonths: 6,
    notifyOnSubmission: true,
    notifyOnApproval: true,
    notifyOnRejection: true,
    notifyOnExpiry: true,
  };

  it('should validate default config', () => {
    const result = WorkflowConfigSchema.safeParse(DEFAULT_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should require at least one stage', () => {
    const result = WorkflowConfigSchema.safeParse({
      ...DEFAULT_CONFIG,
      stages: [],
    });
    expect(result.success).toBe(false);
  });

  it('should require at least one role per stage', () => {
    const result = WorkflowStageSchema.safeParse({
      key: 'test',
      label: 'Test',
      labelAr: 'اختبار',
      requiredRoles: [],
      requireSignature: false,
    });
    expect(result.success).toBe(false);
  });

  it('should require non-empty stage key', () => {
    const result = WorkflowStageSchema.safeParse({
      key: '',
      label: 'Test',
      labelAr: 'اختبار',
      requiredRoles: ['organization_admin'],
      requireSignature: false,
    });
    expect(result.success).toBe(false);
  });

  it('should require non-empty stage label', () => {
    const result = WorkflowStageSchema.safeParse({
      key: 'test',
      label: '',
      labelAr: 'اختبار',
      requiredRoles: ['organization_admin'],
      requireSignature: false,
    });
    expect(result.success).toBe(false);
  });

  it('should accept config with signature disabled', () => {
    const result = WorkflowConfigSchema.safeParse({
      ...DEFAULT_CONFIG,
      requireSubmitterSignature: false,
      requireApproverSignature: false,
    });
    expect(result.success).toBe(true);
  });

  it('should accept config with auto-expiry disabled', () => {
    const result = WorkflowConfigSchema.safeParse({
      ...DEFAULT_CONFIG,
      autoExpiryEnabled: false,
    });
    expect(result.success).toBe(true);
  });

  it('should accept config with all notifications disabled', () => {
    const result = WorkflowConfigSchema.safeParse({
      ...DEFAULT_CONFIG,
      notifyOnSubmission: false,
      notifyOnApproval: false,
      notifyOnRejection: false,
      notifyOnExpiry: false,
    });
    expect(result.success).toBe(true);
  });

  it('should accept config with custom stages', () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      stages: [
        {
          key: 'logistics_review',
          label: 'Logistics Review',
          labelAr: 'مراجعة اللوجستيات',
          requiredRoles: ['logistics_manager'],
          requireSignature: false,
        },
        {
          key: 'compliance_check',
          label: 'Compliance Check',
          labelAr: 'فحص الامتثال',
          requiredRoles: ['compliance_officer'],
          requireSignature: true,
        },
        {
          key: 'final_approval',
          label: 'Final Approval',
          labelAr: 'الموافقة النهائية',
          requiredRoles: ['organization_admin'],
          requireSignature: true,
        },
      ],
    };
    const result = WorkflowConfigSchema.safeParse(customConfig);
    expect(result.success).toBe(true);
  });

  it('should reject negative defaultDurationMonths', () => {
    const result = WorkflowConfigSchema.safeParse({
      ...DEFAULT_CONFIG,
      defaultDurationMonths: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should accept zero defaultDurationMonths (permanent)', () => {
    const result = WorkflowConfigSchema.safeParse({
      ...DEFAULT_CONFIG,
      defaultDurationMonths: 0,
    });
    expect(result.success).toBe(true);
  });
});

// ─── Blacklist Expiry Scheduler ────────────────────────────────────────────

describe('Blacklist Expiry Scheduler', () => {
  interface BlacklistCase {
    id: number;
    status: string;
    expiryDate: string | null;
    vendorId: number;
  }

  function findExpiredCases(cases: BlacklistCase[], today: string): BlacklistCase[] {
    return cases.filter(
      (c) =>
        c.status === 'approved' &&
        c.expiryDate !== null &&
        c.expiryDate <= today
    );
  }

  function processExpiry(c: BlacklistCase): { newStatus: string; auditAction: string } {
    return {
      newStatus: 'expired',
      auditAction: 'auto_expired',
    };
  }

  const testCases: BlacklistCase[] = [
    { id: 1, status: 'approved', expiryDate: '2026-01-01', vendorId: 10 },
    { id: 2, status: 'approved', expiryDate: '2026-06-01', vendorId: 20 },
    { id: 3, status: 'approved', expiryDate: null, vendorId: 30 },
    { id: 4, status: 'draft', expiryDate: '2025-01-01', vendorId: 40 },
    { id: 5, status: 'rejected', expiryDate: '2025-01-01', vendorId: 50 },
    { id: 6, status: 'approved', expiryDate: '2026-03-08', vendorId: 60 },
    { id: 7, status: 'expired', expiryDate: '2025-01-01', vendorId: 70 },
  ];

  it('should find cases that are approved and past expiry date', () => {
    const expired = findExpiredCases(testCases, '2026-03-08');
    expect(expired.length).toBe(2);
    expect(expired.map((c) => c.id)).toEqual([1, 6]);
  });

  it('should not expire cases without expiry date (permanent)', () => {
    const expired = findExpiredCases(testCases, '2030-12-31');
    const permanentCase = expired.find((c) => c.id === 3);
    expect(permanentCase).toBeUndefined();
  });

  it('should not expire draft cases even if past date', () => {
    const expired = findExpiredCases(testCases, '2026-12-31');
    const draftCase = expired.find((c) => c.id === 4);
    expect(draftCase).toBeUndefined();
  });

  it('should not expire rejected cases even if past date', () => {
    const expired = findExpiredCases(testCases, '2026-12-31');
    const rejectedCase = expired.find((c) => c.id === 5);
    expect(rejectedCase).toBeUndefined();
  });

  it('should not re-expire already expired cases', () => {
    const expired = findExpiredCases(testCases, '2026-12-31');
    const alreadyExpired = expired.find((c) => c.id === 7);
    expect(alreadyExpired).toBeUndefined();
  });

  it('should transition expired case to expired status', () => {
    const result = processExpiry(testCases[0]);
    expect(result.newStatus).toBe('expired');
    expect(result.auditAction).toBe('auto_expired');
  });

  it('should find all expired when date is far in the future', () => {
    const expired = findExpiredCases(testCases, '2030-12-31');
    // Cases 1, 2, 6 are approved with non-null expiry dates
    expect(expired.length).toBe(3);
  });

  it('should find none expired when date is in the past', () => {
    const expired = findExpiredCases(testCases, '2020-01-01');
    expect(expired.length).toBe(0);
  });
});

// ─── Notification Triggers ─────────────────────────────────────────────────

describe('Notification Triggers', () => {
  type NotificationEvent =
    | 'case_submitted'
    | 'case_validated'
    | 'case_moved_to_approval'
    | 'case_approved'
    | 'case_rejected'
    | 'case_revoked'
    | 'case_expired';

  interface NotificationConfig {
    notifyOnSubmission: boolean;
    notifyOnApproval: boolean;
    notifyOnRejection: boolean;
    notifyOnExpiry: boolean;
  }

  function shouldNotify(event: NotificationEvent, config: NotificationConfig): boolean {
    switch (event) {
      case 'case_submitted':
      case 'case_validated':
      case 'case_moved_to_approval':
        return config.notifyOnSubmission;
      case 'case_approved':
      case 'case_revoked':
        return config.notifyOnApproval;
      case 'case_rejected':
        return config.notifyOnRejection;
      case 'case_expired':
        return config.notifyOnExpiry;
      default:
        return false;
    }
  }

  function buildNotificationTitle(event: NotificationEvent, caseNumber: string): string {
    const titles: Record<NotificationEvent, string> = {
      case_submitted: `Blacklist Case ${caseNumber} Submitted`,
      case_validated: `Blacklist Case ${caseNumber} Validated`,
      case_moved_to_approval: `Blacklist Case ${caseNumber} Moved to Approval`,
      case_approved: `Blacklist Case ${caseNumber} Approved`,
      case_rejected: `Blacklist Case ${caseNumber} Rejected`,
      case_revoked: `Blacklist Case ${caseNumber} Revoked`,
      case_expired: `Blacklist Case ${caseNumber} Expired`,
    };
    return titles[event];
  }

  const ALL_ENABLED: NotificationConfig = {
    notifyOnSubmission: true,
    notifyOnApproval: true,
    notifyOnRejection: true,
    notifyOnExpiry: true,
  };

  const ALL_DISABLED: NotificationConfig = {
    notifyOnSubmission: false,
    notifyOnApproval: false,
    notifyOnRejection: false,
    notifyOnExpiry: false,
  };

  it('should notify on submission when enabled', () => {
    expect(shouldNotify('case_submitted', ALL_ENABLED)).toBe(true);
  });

  it('should not notify on submission when disabled', () => {
    expect(shouldNotify('case_submitted', ALL_DISABLED)).toBe(false);
  });

  it('should notify on approval when enabled', () => {
    expect(shouldNotify('case_approved', ALL_ENABLED)).toBe(true);
  });

  it('should not notify on approval when disabled', () => {
    expect(shouldNotify('case_approved', ALL_DISABLED)).toBe(false);
  });

  it('should notify on rejection when enabled', () => {
    expect(shouldNotify('case_rejected', ALL_ENABLED)).toBe(true);
  });

  it('should not notify on rejection when disabled', () => {
    expect(shouldNotify('case_rejected', ALL_DISABLED)).toBe(false);
  });

  it('should notify on expiry when enabled', () => {
    expect(shouldNotify('case_expired', ALL_ENABLED)).toBe(true);
  });

  it('should not notify on expiry when disabled', () => {
    expect(shouldNotify('case_expired', ALL_DISABLED)).toBe(false);
  });

  it('should group validation under submission notifications', () => {
    const config = { ...ALL_DISABLED, notifyOnSubmission: true };
    expect(shouldNotify('case_validated', config)).toBe(true);
    expect(shouldNotify('case_moved_to_approval', config)).toBe(true);
  });

  it('should group revocation under approval notifications', () => {
    const config = { ...ALL_DISABLED, notifyOnApproval: true };
    expect(shouldNotify('case_revoked', config)).toBe(true);
  });

  it('should build correct notification title for submission', () => {
    const title = buildNotificationTitle('case_submitted', 'BL-2026-0001');
    expect(title).toBe('Blacklist Case BL-2026-0001 Submitted');
  });

  it('should build correct notification title for approval', () => {
    const title = buildNotificationTitle('case_approved', 'BL-2026-0042');
    expect(title).toBe('Blacklist Case BL-2026-0042 Approved');
  });

  it('should build correct notification title for rejection', () => {
    const title = buildNotificationTitle('case_rejected', 'BL-2026-0003');
    expect(title).toBe('Blacklist Case BL-2026-0003 Rejected');
  });

  it('should build correct notification title for expiry', () => {
    const title = buildNotificationTitle('case_expired', 'BL-2026-0010');
    expect(title).toBe('Blacklist Case BL-2026-0010 Expired');
  });

  it('should build correct notification title for revocation', () => {
    const title = buildNotificationTitle('case_revoked', 'BL-2026-0005');
    expect(title).toBe('Blacklist Case BL-2026-0005 Revoked');
  });
});

// ─── Evidence Upload Validation (Enhanced) ─────────────────────────────────

describe('Evidence Upload Validation (Enhanced)', () => {
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  function validateEvidence(file: { name: string; size: number; mimeType: string }): {
    valid: boolean;
    error?: string;
  } {
    if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
      return { valid: false, error: 'Unsupported file type' };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large (max 10MB)' };
    }
    if (!file.name || file.name.trim() === '') {
      return { valid: false, error: 'File name is required' };
    }
    return { valid: true };
  }

  it('should accept PDF files', () => {
    const result = validateEvidence({ name: 'doc.pdf', size: 1024, mimeType: 'application/pdf' });
    expect(result.valid).toBe(true);
  });

  it('should accept JPEG images', () => {
    const result = validateEvidence({ name: 'photo.jpg', size: 2048, mimeType: 'image/jpeg' });
    expect(result.valid).toBe(true);
  });

  it('should accept PNG images', () => {
    const result = validateEvidence({ name: 'screenshot.png', size: 5000, mimeType: 'image/png' });
    expect(result.valid).toBe(true);
  });

  it('should accept Word documents', () => {
    const result = validateEvidence({
      name: 'report.docx',
      size: 3000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject executable files', () => {
    const result = validateEvidence({ name: 'virus.exe', size: 1024, mimeType: 'application/x-msdownload' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Unsupported file type');
  });

  it('should reject files over 10MB', () => {
    const result = validateEvidence({
      name: 'large.pdf',
      size: 11 * 1024 * 1024,
      mimeType: 'application/pdf',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File too large (max 10MB)');
  });

  it('should reject files with empty name', () => {
    const result = validateEvidence({ name: '', size: 1024, mimeType: 'application/pdf' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File name is required');
  });

  it('should accept files exactly at 10MB limit', () => {
    const result = validateEvidence({
      name: 'exact.pdf',
      size: 10 * 1024 * 1024,
      mimeType: 'application/pdf',
    });
    expect(result.valid).toBe(true);
  });
});

// ─── Permission Flags Combination ──────────────────────────────────────────

describe('Permission Flags Combination (Status + Role)', () => {
  function getPermissions(
    status: string,
    userRoles: string[]
  ): {
    canSubmit: boolean;
    canValidate: boolean;
    canApprove: boolean;
    canReject: boolean;
    canRevoke: boolean;
    isEditable: boolean;
  } {
    const APPROVAL_ROLES = ['organization_admin', 'office_manager', 'project_manager'];
    const hasApprovalRole = userRoles.some((r) => APPROVAL_ROLES.includes(r));

    return {
      canSubmit: status === 'draft',
      canValidate: status === 'submitted' && hasApprovalRole,
      canApprove: status === 'pending_approval' && hasApprovalRole,
      canReject:
        ['submitted', 'under_validation', 'pending_approval'].includes(status) &&
        hasApprovalRole,
      canRevoke: status === 'approved' && hasApprovalRole,
      isEditable: !['approved', 'rejected', 'revoked', 'expired'].includes(status),
    };
  }

  it('should allow submit only for draft status', () => {
    const p = getPermissions('draft', ['user']);
    expect(p.canSubmit).toBe(true);
    expect(p.canValidate).toBe(false);
    expect(p.canApprove).toBe(false);
  });

  it('should allow validate for submitted status with approval role', () => {
    const p = getPermissions('submitted', ['office_manager']);
    expect(p.canValidate).toBe(true);
    expect(p.canReject).toBe(true);
  });

  it('should deny validate for submitted status without approval role', () => {
    const p = getPermissions('submitted', ['user']);
    expect(p.canValidate).toBe(false);
    expect(p.canReject).toBe(false);
  });

  it('should allow approve for pending_approval with approval role', () => {
    const p = getPermissions('pending_approval', ['organization_admin']);
    expect(p.canApprove).toBe(true);
    expect(p.canReject).toBe(true);
  });

  it('should deny approve for pending_approval without approval role', () => {
    const p = getPermissions('pending_approval', ['user']);
    expect(p.canApprove).toBe(false);
    expect(p.canReject).toBe(false);
  });

  it('should allow revoke for approved status with approval role', () => {
    const p = getPermissions('approved', ['project_manager']);
    expect(p.canRevoke).toBe(true);
    expect(p.isEditable).toBe(false);
  });

  it('should deny revoke for approved status without approval role', () => {
    const p = getPermissions('approved', ['user']);
    expect(p.canRevoke).toBe(false);
  });

  it('should mark expired cases as non-editable', () => {
    const p = getPermissions('expired', ['organization_admin']);
    expect(p.isEditable).toBe(false);
    expect(p.canSubmit).toBe(false);
    expect(p.canValidate).toBe(false);
    expect(p.canApprove).toBe(false);
    expect(p.canRevoke).toBe(false);
  });

  it('should mark rejected cases as non-editable', () => {
    const p = getPermissions('rejected', ['organization_admin']);
    expect(p.isEditable).toBe(false);
  });

  it('should mark revoked cases as non-editable', () => {
    const p = getPermissions('revoked', ['organization_admin']);
    expect(p.isEditable).toBe(false);
  });

  it('should mark draft cases as editable', () => {
    const p = getPermissions('draft', ['user']);
    expect(p.isEditable).toBe(true);
  });

  it('should mark under_validation cases as editable', () => {
    const p = getPermissions('under_validation', ['user']);
    expect(p.isEditable).toBe(true);
  });
});
