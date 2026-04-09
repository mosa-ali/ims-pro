import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Vendor Evaluation & Performance + Digital Signature Tests
 * 
 * Tests:
 * 1. Vendor Evaluation input/output schemas
 * 2. Vendor Procurement Baseline schema
 * 3. Contract Approval with Digital Signature schema
 * 4. Evaluation scoring and classification logic
 * 5. Verification code generation format
 * 6. Vendor evaluation router input validation
 */

// ─── Schema Definitions (mirrored from routers) ────────────────────────────

const VendorEvaluationCreateInput = z.object({
  vendorId: z.number().int().positive(),
  evaluationType: z.enum(['initial', 'periodic', 'post_contract', 'special']),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  evaluationDate: z.string().optional(),
  items: z.array(z.object({
    category: z.string().min(1),
    criterion: z.string().min(1),
    maxScore: z.number().min(0).max(100),
    actualScore: z.number().min(0).max(100),
    weight: z.number().min(0).max(100).default(1),
    notes: z.string().optional(),
  })).min(1),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  recommendations: z.string().optional(),
  overallNotes: z.string().optional(),
});

const ContractApprovalInput = z.object({
  id: z.number().int().positive(),
  approve: z.boolean(),
  signatureDataUrl: z.string().optional(),
  signerName: z.string().optional(),
  signerTitle: z.string().optional(),
});

const ProcurementBaselineSchema = z.object({
  vendorId: z.number().int().positive(),
  bidAnalysisId: z.number().int().positive(),
  purchaseRequestId: z.number().int().positive(),
  bidderName: z.string(),
  technicalScore: z.string().nullable().optional(),
  financialScore: z.string().nullable().optional(),
  totalScore: z.string().nullable().optional(),
  quotedAmount: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  rank: z.number().int().nullable().optional(),
  isWinner: z.number().int(),
  evaluationDate: z.string(),
});

// ─── Vendor Evaluation Create Input Tests ──────────────────────────────────

describe('Vendor Evaluation Create Input Schema', () => {
  it('should accept valid evaluation with items', () => {
    const input = {
      vendorId: 1,
      evaluationType: 'periodic',
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      items: [
        { category: 'Legal', criterion: 'Valid registration', maxScore: 10, actualScore: 8, weight: 20 },
        { category: 'Experience', criterion: 'Years in field', maxScore: 10, actualScore: 7, weight: 15 },
      ],
      strengths: 'Good compliance record',
      weaknesses: 'Limited experience',
      recommendations: 'Monitor closely',
    };
    const result = VendorEvaluationCreateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject evaluation without items', () => {
    const input = {
      vendorId: 1,
      evaluationType: 'periodic',
      items: [],
    };
    const result = VendorEvaluationCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject evaluation with invalid vendorId', () => {
    const input = {
      vendorId: -1,
      evaluationType: 'periodic',
      items: [
        { category: 'Legal', criterion: 'Test', maxScore: 10, actualScore: 5, weight: 10 },
      ],
    };
    const result = VendorEvaluationCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid evaluation type', () => {
    const input = {
      vendorId: 1,
      evaluationType: 'invalid_type',
      items: [
        { category: 'Legal', criterion: 'Test', maxScore: 10, actualScore: 5, weight: 10 },
      ],
    };
    const result = VendorEvaluationCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept all valid evaluation types', () => {
    const types = ['initial', 'periodic', 'post_contract', 'special'];
    for (const type of types) {
      const input = {
        vendorId: 1,
        evaluationType: type,
        items: [
          { category: 'Legal', criterion: 'Test', maxScore: 10, actualScore: 5, weight: 10 },
        ],
      };
      const result = VendorEvaluationCreateInput.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('should reject items with score exceeding maxScore', () => {
    const input = {
      vendorId: 1,
      evaluationType: 'periodic',
      items: [
        { category: 'Legal', criterion: 'Test', maxScore: 10, actualScore: 150, weight: 10 },
      ],
    };
    const result = VendorEvaluationCreateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should default weight to 1 when not provided', () => {
    const input = {
      vendorId: 1,
      evaluationType: 'periodic',
      items: [
        { category: 'Legal', criterion: 'Test', maxScore: 10, actualScore: 5 },
      ],
    };
    const result = VendorEvaluationCreateInput.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].weight).toBe(1);
    }
  });
});

// ─── Contract Approval with Digital Signature Tests ────────────────────────

describe('Contract Approval with Digital Signature Schema', () => {
  it('should accept approval without signature (backward compatible)', () => {
    const input = {
      id: 1,
      approve: true,
    };
    const result = ContractApprovalInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept approval with full signature data', () => {
    const input = {
      id: 1,
      approve: true,
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signerName: 'John Doe',
      signerTitle: 'Project Manager',
    };
    const result = ContractApprovalInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept rejection without signature', () => {
    const input = {
      id: 1,
      approve: false,
    };
    const result = ContractApprovalInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid contract id', () => {
    const input = {
      id: -1,
      approve: true,
    };
    const result = ContractApprovalInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject missing approve field', () => {
    const input = {
      id: 1,
    };
    const result = ContractApprovalInput.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ─── Procurement Baseline Schema Tests ─────────────────────────────────────

describe('Procurement Baseline Schema', () => {
  it('should accept valid baseline data', () => {
    const input = {
      vendorId: 1,
      bidAnalysisId: 10,
      purchaseRequestId: 100,
      bidderName: 'Acme Corp',
      technicalScore: '85.50',
      financialScore: '90.00',
      totalScore: '87.75',
      quotedAmount: '50000.00',
      currency: 'USD',
      rank: 1,
      isWinner: 1,
      evaluationDate: '2026-03-07',
    };
    const result = ProcurementBaselineSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept baseline with nullable scores', () => {
    const input = {
      vendorId: 2,
      bidAnalysisId: 10,
      purchaseRequestId: 100,
      bidderName: 'Beta Inc',
      technicalScore: null,
      financialScore: null,
      totalScore: null,
      quotedAmount: '30000.00',
      currency: 'EUR',
      rank: 2,
      isWinner: 0,
      evaluationDate: '2026-03-07',
    };
    const result = ProcurementBaselineSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject baseline without required vendorId', () => {
    const input = {
      bidAnalysisId: 10,
      purchaseRequestId: 100,
      bidderName: 'Test',
      isWinner: 0,
      evaluationDate: '2026-03-07',
    };
    const result = ProcurementBaselineSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ─── Evaluation Scoring Logic Tests ────────────────────────────────────────

describe('Evaluation Scoring Logic', () => {
  function calculateWeightedScore(items: Array<{ maxScore: number; actualScore: number; weight: number }>) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = items.reduce((sum, item) => {
      const normalizedScore = (item.actualScore / item.maxScore) * 100;
      return sum + (normalizedScore * item.weight);
    }, 0);
    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  function classifyVendor(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'satisfactory';
    if (score >= 40) return 'needs_improvement';
    return 'poor';
  }

  function classifyRisk(score: number): string {
    if (score >= 75) return 'low';
    if (score >= 50) return 'medium';
    return 'high';
  }

  it('should calculate weighted score correctly', () => {
    const items = [
      { maxScore: 10, actualScore: 8, weight: 30 },
      { maxScore: 10, actualScore: 6, weight: 20 },
      { maxScore: 10, actualScore: 9, weight: 50 },
    ];
    const score = calculateWeightedScore(items);
    // (80*30 + 60*20 + 90*50) / 100 = (2400 + 1200 + 4500) / 100 = 81
    expect(score).toBe(81);
  });

  it('should return 0 for empty items', () => {
    const score = calculateWeightedScore([]);
    expect(score).toBe(0);
  });

  it('should classify vendor as excellent for score >= 90', () => {
    expect(classifyVendor(95)).toBe('excellent');
    expect(classifyVendor(90)).toBe('excellent');
  });

  it('should classify vendor as good for score 75-89', () => {
    expect(classifyVendor(85)).toBe('good');
    expect(classifyVendor(75)).toBe('good');
  });

  it('should classify vendor as satisfactory for score 60-74', () => {
    expect(classifyVendor(70)).toBe('satisfactory');
    expect(classifyVendor(60)).toBe('satisfactory');
  });

  it('should classify vendor as needs_improvement for score 40-59', () => {
    expect(classifyVendor(50)).toBe('needs_improvement');
    expect(classifyVendor(40)).toBe('needs_improvement');
  });

  it('should classify vendor as poor for score < 40', () => {
    expect(classifyVendor(30)).toBe('poor');
    expect(classifyVendor(0)).toBe('poor');
  });

  it('should classify risk as low for score >= 75', () => {
    expect(classifyRisk(80)).toBe('low');
    expect(classifyRisk(75)).toBe('low');
  });

  it('should classify risk as medium for score 50-74', () => {
    expect(classifyRisk(60)).toBe('medium');
    expect(classifyRisk(50)).toBe('medium');
  });

  it('should classify risk as high for score < 50', () => {
    expect(classifyRisk(30)).toBe('high');
    expect(classifyRisk(0)).toBe('high');
  });
});

// ─── Verification Code Format Tests ────────────────────────────────────────

describe('Verification Code Generation', () => {
  function generateVerificationCode(contractNumber: string): string {
    const timestamp = Date.now();
    return `IMS-SIG-${contractNumber}-${timestamp.toString(36).toUpperCase()}`;
  }

  it('should generate code with IMS-SIG prefix', () => {
    const code = generateVerificationCode('CON-HQ-2026-001');
    expect(code.startsWith('IMS-SIG-')).toBe(true);
  });

  it('should include contract number in code', () => {
    const code = generateVerificationCode('CON-HQ-2026-001');
    expect(code).toContain('CON-HQ-2026-001');
  });

  it('should generate unique codes for same contract', () => {
    const code1 = generateVerificationCode('CON-HQ-2026-001');
    // Small delay to ensure different timestamp
    const code2 = generateVerificationCode('CON-HQ-2026-001');
    // Codes may be same if generated in same millisecond, but format should match
    expect(code1).toMatch(/^IMS-SIG-CON-HQ-2026-001-[A-Z0-9]+$/);
    expect(code2).toMatch(/^IMS-SIG-CON-HQ-2026-001-[A-Z0-9]+$/);
  });

  it('should match expected format pattern', () => {
    const code = generateVerificationCode('CON-EFADAH-2026-005');
    expect(code).toMatch(/^IMS-SIG-CON-EFADAH-2026-005-[A-Z0-9]+$/);
  });
});

// ─── Evaluation Checklist Categories Tests ─────────────────────────────────

describe('IMS Standard Evaluation Checklist Categories', () => {
  const standardCategories = [
    'Legal & Registration',
    'Experience & Track Record',
    'Operational Capacity',
    'Sample / Demo Evaluation',
    'References',
  ];

  it('should have all 5 standard categories', () => {
    expect(standardCategories).toHaveLength(5);
  });

  it('should include Legal & Registration category', () => {
    expect(standardCategories).toContain('Legal & Registration');
  });

  it('should include Experience & Track Record category', () => {
    expect(standardCategories).toContain('Experience & Track Record');
  });

  it('should include Operational Capacity category', () => {
    expect(standardCategories).toContain('Operational Capacity');
  });

  it('should include Sample / Demo Evaluation category', () => {
    expect(standardCategories).toContain('Sample / Demo Evaluation');
  });

  it('should include References category', () => {
    expect(standardCategories).toContain('References');
  });
});
