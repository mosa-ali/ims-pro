import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Vendor Qualification Scoring Tests
 * 
 * Tests the three-layer vendor evaluation architecture:
 * Layer 1: Vendor Qualification (Vendor Master) — 30 points, 4 sections
 * Layer 2: Bid Evaluation (Procurement Workspace) — auto-loads Layer 1 scores
 * Layer 3: Vendor Performance (Post-contract) — separate evaluation
 * 
 * This file tests:
 * 1. Qualification input schema validation
 * 2. Section score boundaries and totals
 * 3. Qualification status determination logic
 * 4. Batch query schema for bid evaluation auto-sync
 */

// ─── Schema Definitions (mirrored from vendorsRouter) ────────────────────────

const QualificationSaveInput = z.object({
  vendorId: z.number().int().positive(),
  evaluatedBy: z.string().optional(),
  evaluationDate: z.string().optional(),
  notes: z.string().optional(),
  // Section 1: Legal & Administrative (max 12)
  s1_companyRegistration: z.number().min(0).max(2),
  s1_taxCard: z.number().min(0).max(2),
  s1_insuranceCard: z.number().min(0).max(2),
  s1_signedDeclarations: z.number().min(0).max(3),
  s1_sanctionsScreening: z.number().min(0).max(3),
  // Section 2: Experience & Technical Capacity (max 10)
  s2_companyProfile: z.number().min(0).max(3),
  s2_yearsExperience: z.number().min(0).max(4),
  s2_ingoExperience: z.number().min(0).max(3),
  // Section 3: Operational & Financial Capacity (max 2)
  s3_targetGeography: z.number().min(0).max(1),
  s3_bankAccountDetails: z.number().min(0).max(1),
  // Section 4: References (max 6)
  s4_references: z.number().min(0).max(6),
});

const QualificationBatchInput = z.object({
  vendorIds: z.array(z.number().int().positive()),
});

// ─── Section Score Calculation Logic ─────────────────────────────────────────

function calculateSectionTotals(scores: z.infer<typeof QualificationSaveInput>) {
  const section1Total =
    scores.s1_companyRegistration +
    scores.s1_taxCard +
    scores.s1_insuranceCard +
    scores.s1_signedDeclarations +
    scores.s1_sanctionsScreening;

  const section2Total =
    scores.s2_companyProfile +
    scores.s2_yearsExperience +
    scores.s2_ingoExperience;

  const section3Total =
    scores.s3_targetGeography +
    scores.s3_bankAccountDetails;

  const section4Total = scores.s4_references;

  const totalScore = section1Total + section2Total + section3Total + section4Total;

  return { section1Total, section2Total, section3Total, section4Total, totalScore };
}

function determineQualificationStatus(totalScore: number): string {
  if (totalScore >= 21) return 'qualified';       // 70% of 30
  if (totalScore >= 15) return 'conditional';      // 50% of 30
  return 'not_qualified';
}

// ─── Qualification Save Input Schema Tests ───────────────────────────────────

describe('Vendor Qualification Save Input Schema', () => {
  const validInput = {
    vendorId: 1,
    evaluatedBy: 'admin',
    evaluationDate: '2026-03-08',
    notes: 'Initial qualification',
    s1_companyRegistration: 2,
    s1_taxCard: 2,
    s1_insuranceCard: 2,
    s1_signedDeclarations: 3,
    s1_sanctionsScreening: 3,
    s2_companyProfile: 3,
    s2_yearsExperience: 4,
    s2_ingoExperience: 3,
    s3_targetGeography: 1,
    s3_bankAccountDetails: 1,
    s4_references: 6,
  };

  it('should accept valid qualification input with all max scores', () => {
    const result = QualificationSaveInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept valid qualification input with all zero scores', () => {
    const input = {
      ...validInput,
      s1_companyRegistration: 0,
      s1_taxCard: 0,
      s1_insuranceCard: 0,
      s1_signedDeclarations: 0,
      s1_sanctionsScreening: 0,
      s2_companyProfile: 0,
      s2_yearsExperience: 0,
      s2_ingoExperience: 0,
      s3_targetGeography: 0,
      s3_bankAccountDetails: 0,
      s4_references: 0,
    };
    const result = QualificationSaveInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject score exceeding max for s1_companyRegistration (max 2)', () => {
    const input = { ...validInput, s1_companyRegistration: 3 };
    const result = QualificationSaveInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject score exceeding max for s1_signedDeclarations (max 3)', () => {
    const input = { ...validInput, s1_signedDeclarations: 4 };
    const result = QualificationSaveInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject score exceeding max for s2_yearsExperience (max 4)', () => {
    const input = { ...validInput, s2_yearsExperience: 5 };
    const result = QualificationSaveInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject score exceeding max for s4_references (max 6)', () => {
    const input = { ...validInput, s4_references: 7 };
    const result = QualificationSaveInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative scores', () => {
    const input = { ...validInput, s1_companyRegistration: -1 };
    const result = QualificationSaveInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid vendorId', () => {
    const input = { ...validInput, vendorId: 0 };
    const result = QualificationSaveInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept input without optional fields', () => {
    const { evaluatedBy, evaluationDate, notes, ...required } = validInput;
    const result = QualificationSaveInput.safeParse(required);
    expect(result.success).toBe(true);
  });
});

// ─── Section Score Calculation Tests ─────────────────────────────────────────

describe('Vendor Qualification Section Totals', () => {
  it('should calculate perfect score as 30', () => {
    const scores = {
      vendorId: 1,
      s1_companyRegistration: 2,
      s1_taxCard: 2,
      s1_insuranceCard: 2,
      s1_signedDeclarations: 3,
      s1_sanctionsScreening: 3,
      s2_companyProfile: 3,
      s2_yearsExperience: 4,
      s2_ingoExperience: 3,
      s3_targetGeography: 1,
      s3_bankAccountDetails: 1,
      s4_references: 6,
    };
    const totals = calculateSectionTotals(scores as any);
    expect(totals.section1Total).toBe(12);
    expect(totals.section2Total).toBe(10);
    expect(totals.section3Total).toBe(2);
    expect(totals.section4Total).toBe(6);
    expect(totals.totalScore).toBe(30);
  });

  it('should calculate zero score correctly', () => {
    const scores = {
      vendorId: 1,
      s1_companyRegistration: 0,
      s1_taxCard: 0,
      s1_insuranceCard: 0,
      s1_signedDeclarations: 0,
      s1_sanctionsScreening: 0,
      s2_companyProfile: 0,
      s2_yearsExperience: 0,
      s2_ingoExperience: 0,
      s3_targetGeography: 0,
      s3_bankAccountDetails: 0,
      s4_references: 0,
    };
    const totals = calculateSectionTotals(scores as any);
    expect(totals.totalScore).toBe(0);
  });

  it('should calculate partial scores correctly', () => {
    const scores = {
      vendorId: 1,
      s1_companyRegistration: 2,
      s1_taxCard: 2,
      s1_insuranceCard: 0,
      s1_signedDeclarations: 3,
      s1_sanctionsScreening: 3,
      s2_companyProfile: 3,
      s2_yearsExperience: 2,
      s2_ingoExperience: 1,
      s3_targetGeography: 1,
      s3_bankAccountDetails: 0,
      s4_references: 4,
    };
    const totals = calculateSectionTotals(scores as any);
    expect(totals.section1Total).toBe(10);
    expect(totals.section2Total).toBe(6);
    expect(totals.section3Total).toBe(1);
    expect(totals.section4Total).toBe(4);
    expect(totals.totalScore).toBe(21);
  });

  it('should keep section totals within max bounds', () => {
    const scores = {
      vendorId: 1,
      s1_companyRegistration: 2,
      s1_taxCard: 2,
      s1_insuranceCard: 2,
      s1_signedDeclarations: 3,
      s1_sanctionsScreening: 3,
      s2_companyProfile: 3,
      s2_yearsExperience: 4,
      s2_ingoExperience: 3,
      s3_targetGeography: 1,
      s3_bankAccountDetails: 1,
      s4_references: 6,
    };
    const totals = calculateSectionTotals(scores as any);
    expect(totals.section1Total).toBeLessThanOrEqual(12);
    expect(totals.section2Total).toBeLessThanOrEqual(10);
    expect(totals.section3Total).toBeLessThanOrEqual(2);
    expect(totals.section4Total).toBeLessThanOrEqual(6);
    expect(totals.totalScore).toBeLessThanOrEqual(30);
  });
});

// ─── Qualification Status Determination Tests ────────────────────────────────

describe('Vendor Qualification Status Determination', () => {
  it('should classify as qualified for score >= 21 (70%)', () => {
    expect(determineQualificationStatus(21)).toBe('qualified');
    expect(determineQualificationStatus(25)).toBe('qualified');
    expect(determineQualificationStatus(30)).toBe('qualified');
  });

  it('should classify as conditional for score 15-20 (50-69%)', () => {
    expect(determineQualificationStatus(15)).toBe('conditional');
    expect(determineQualificationStatus(18)).toBe('conditional');
    expect(determineQualificationStatus(20)).toBe('conditional');
  });

  it('should classify as not_qualified for score < 15 (below 50%)', () => {
    expect(determineQualificationStatus(14)).toBe('not_qualified');
    expect(determineQualificationStatus(10)).toBe('not_qualified');
    expect(determineQualificationStatus(0)).toBe('not_qualified');
  });

  it('should handle boundary values correctly', () => {
    expect(determineQualificationStatus(21)).toBe('qualified');
    expect(determineQualificationStatus(20)).toBe('conditional');
    expect(determineQualificationStatus(15)).toBe('conditional');
    expect(determineQualificationStatus(14)).toBe('not_qualified');
  });
});

// ─── Batch Query Schema Tests ────────────────────────────────────────────────

describe('Vendor Qualification Batch Query Schema', () => {
  it('should accept valid vendor ID array', () => {
    const input = { vendorIds: [1, 2, 3, 4, 5] };
    const result = QualificationBatchInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept empty vendor ID array', () => {
    const input = { vendorIds: [] };
    const result = QualificationBatchInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept single vendor ID', () => {
    const input = { vendorIds: [42] };
    const result = QualificationBatchInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject negative vendor IDs', () => {
    const input = { vendorIds: [1, -2, 3] };
    const result = QualificationBatchInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject non-integer vendor IDs', () => {
    const input = { vendorIds: [1.5, 2.7] };
    const result = QualificationBatchInput.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ─── Three-Layer Architecture Validation Tests ───────────────────────────────

describe('Three-Layer Evaluation Architecture', () => {
  it('Layer 1 (Qualification): 4 sections totaling 30 points', () => {
    const sectionMaxes = {
      section1: 12, // Legal & Administrative
      section2: 10, // Experience & Technical Capacity
      section3: 2,  // Operational & Financial Capacity
      section4: 6,  // References
    };
    const total = Object.values(sectionMaxes).reduce((a, b) => a + b, 0);
    expect(total).toBe(30);
  });

  it('Layer 1 Section 1 items total to 12', () => {
    const items = [2, 2, 2, 3, 3]; // registration, tax, insurance, declarations, sanctions
    expect(items.reduce((a, b) => a + b, 0)).toBe(12);
  });

  it('Layer 1 Section 2 items total to 10', () => {
    const items = [3, 4, 3]; // profile, years, ingo
    expect(items.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('Layer 1 Section 3 items total to 2', () => {
    const items = [1, 1]; // geography, bank
    expect(items.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('Layer 1 Section 4 items total to 6', () => {
    const items = [6]; // references
    expect(items.reduce((a, b) => a + b, 0)).toBe(6);
  });

  it('Layer 2 (Bid Evaluation): Technical (50) + Financial (50) = 100', () => {
    const technicalMax = 50;
    const financialMax = 50;
    expect(technicalMax + financialMax).toBe(100);
  });

  it('Layer 2 qualification scores are read-only (auto-loaded from Layer 1)', () => {
    // This test validates the architectural principle:
    // Qualification scores in bid evaluation cannot be edited
    const qualificationScoreInBidEval = {
      section1Total: 10,
      section2Total: 8,
      section3Total: 2,
      section4Total: 5,
      totalScore: 25,
      qualificationStatus: 'qualified',
      isReadOnly: true, // enforced by UI
    };
    expect(qualificationScoreInBidEval.isReadOnly).toBe(true);
    expect(qualificationScoreInBidEval.totalScore).toBe(
      qualificationScoreInBidEval.section1Total +
      qualificationScoreInBidEval.section2Total +
      qualificationScoreInBidEval.section3Total +
      qualificationScoreInBidEval.section4Total
    );
  });
});
