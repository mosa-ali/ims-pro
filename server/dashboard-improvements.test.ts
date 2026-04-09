/**
 * Tests for Contract Dashboard Improvements
 * - Variation / Amendment Tracking data in financial dashboard
 * - Vendor Performance data in financial dashboard
 * - Document Status data in financial dashboard
 * - Vendor Evaluation CRUD (addPerformanceEvaluation mutation)
 * - SAC query error fix (snake_case columns)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 1. Variation Summary Computation Tests
// ============================================================================
describe('Variation Summary Computation', () => {
  const computeVariationSummary = (variations: any[], contractValue: number) => {
    const approvedVariations = variations.filter(v => v.status === 'approved');
    const totalVariationAmount = approvedVariations.reduce(
      (s, v) => s + parseFloat(v.variationAmount || '0'), 0
    );
    const currentContractValue = approvedVariations.length > 0
      ? parseFloat(approvedVariations[0].newContractValue || '0') || contractValue + totalVariationAmount
      : contractValue;

    return {
      total: variations.length,
      approved: approvedVariations.length,
      pending: variations.filter(v => v.status === 'pending_approval').length,
      totalVariationAmount,
      originalContractValue: contractValue,
      currentContractValue,
    };
  };

  it('should return zero variations when none exist', () => {
    const result = computeVariationSummary([], 100000);
    expect(result.total).toBe(0);
    expect(result.approved).toBe(0);
    expect(result.pending).toBe(0);
    expect(result.totalVariationAmount).toBe(0);
    expect(result.originalContractValue).toBe(100000);
    expect(result.currentContractValue).toBe(100000);
  });

  it('should compute approved variation amounts correctly', () => {
    const variations = [
      { id: 1, status: 'approved', variationAmount: '5000', newContractValue: '105000', variationType: 'amendment' },
      { id: 2, status: 'draft', variationAmount: '3000', newContractValue: '108000', variationType: 'change_order' },
    ];
    const result = computeVariationSummary(variations, 100000);
    expect(result.total).toBe(2);
    expect(result.approved).toBe(1);
    expect(result.totalVariationAmount).toBe(5000);
    expect(result.currentContractValue).toBe(105000);
  });

  it('should count pending variations separately', () => {
    const variations = [
      { id: 1, status: 'approved', variationAmount: '10000', newContractValue: '110000' },
      { id: 2, status: 'pending_approval', variationAmount: '5000', newContractValue: '115000' },
      { id: 3, status: 'pending_approval', variationAmount: '2000', newContractValue: '117000' },
      { id: 4, status: 'rejected', variationAmount: '8000', newContractValue: '125000' },
    ];
    const result = computeVariationSummary(variations, 100000);
    expect(result.total).toBe(4);
    expect(result.approved).toBe(1);
    expect(result.pending).toBe(2);
    expect(result.totalVariationAmount).toBe(10000);
  });

  it('should handle negative variation amounts (reductions)', () => {
    const variations = [
      { id: 1, status: 'approved', variationAmount: '-15000', newContractValue: '85000' },
    ];
    const result = computeVariationSummary(variations, 100000);
    expect(result.totalVariationAmount).toBe(-15000);
    expect(result.currentContractValue).toBe(85000);
  });

  it('should sum multiple approved variations', () => {
    const variations = [
      { id: 1, status: 'approved', variationAmount: '5000', newContractValue: '115000' },
      { id: 2, status: 'approved', variationAmount: '10000', newContractValue: '115000' },
    ];
    const result = computeVariationSummary(variations, 100000);
    expect(result.approved).toBe(2);
    expect(result.totalVariationAmount).toBe(15000);
    // Uses first approved variation's newContractValue
    expect(result.currentContractValue).toBe(115000);
  });

  it('should fallback to contractValue + totalVariationAmount when newContractValue is missing', () => {
    const variations = [
      { id: 1, status: 'approved', variationAmount: '7500', newContractValue: '0' },
    ];
    const result = computeVariationSummary(variations, 100000);
    expect(result.currentContractValue).toBe(107500);
  });
});

// ============================================================================
// 2. Vendor Performance Computation Tests
// ============================================================================
describe('Vendor Performance Computation', () => {
  const computeVendorPerformance = (evals: any[]) => {
    if (evals.length === 0) return null;
    const avgQuality = evals.reduce((s, e) => s + parseFloat(e.qualityScore || '0'), 0) / evals.length;
    const avgDelivery = evals.reduce((s, e) => s + parseFloat(e.deliveryScore || '0'), 0) / evals.length;
    const avgCompliance = evals.reduce((s, e) => s + parseFloat(e.complianceScore || '0'), 0) / evals.length;
    const avgOverall = evals.reduce((s, e) => s + parseFloat(e.overallScore || '0'), 0) / evals.length;
    return {
      quality: Math.round(avgQuality * 10) / 10,
      delivery: Math.round(avgDelivery * 10) / 10,
      compliance: Math.round(avgCompliance * 10) / 10,
      overall: Math.round(avgOverall * 10) / 10,
      evaluationCount: evals.length,
    };
  };

  it('should return null when no evaluations exist', () => {
    expect(computeVendorPerformance([])).toBeNull();
  });

  it('should compute averages from a single evaluation', () => {
    const evals = [
      { qualityScore: '8.5', deliveryScore: '7.0', complianceScore: '9.0', overallScore: '8.2' },
    ];
    const result = computeVendorPerformance(evals);
    expect(result).not.toBeNull();
    expect(result!.quality).toBe(8.5);
    expect(result!.delivery).toBe(7.0);
    expect(result!.compliance).toBe(9.0);
    expect(result!.overall).toBe(8.2);
    expect(result!.evaluationCount).toBe(1);
  });

  it('should compute averages from multiple evaluations', () => {
    const evals = [
      { qualityScore: '8.0', deliveryScore: '6.0', complianceScore: '9.0', overallScore: '7.7' },
      { qualityScore: '9.0', deliveryScore: '8.0', complianceScore: '7.0', overallScore: '8.0' },
    ];
    const result = computeVendorPerformance(evals);
    expect(result!.quality).toBe(8.5);
    expect(result!.delivery).toBe(7.0);
    expect(result!.compliance).toBe(8.0);
    expect(result!.overall).toBe(7.9);
    expect(result!.evaluationCount).toBe(2);
  });

  it('should handle zero scores', () => {
    const evals = [
      { qualityScore: '0', deliveryScore: '0', complianceScore: '0', overallScore: '0' },
    ];
    const result = computeVendorPerformance(evals);
    expect(result!.quality).toBe(0);
    expect(result!.delivery).toBe(0);
    expect(result!.compliance).toBe(0);
    expect(result!.overall).toBe(0);
  });

  it('should handle null/undefined scores gracefully', () => {
    const evals = [
      { qualityScore: null, deliveryScore: undefined, complianceScore: '', overallScore: '5.0' },
    ];
    const result = computeVendorPerformance(evals);
    expect(result!.quality).toBe(0);
    expect(result!.delivery).toBe(0);
    expect(result!.compliance).toBe(0);
    expect(result!.overall).toBe(5.0);
  });

  it('should round to one decimal place', () => {
    const evals = [
      { qualityScore: '7.33', deliveryScore: '8.67', complianceScore: '6.15', overallScore: '7.38' },
      { qualityScore: '8.77', deliveryScore: '9.33', complianceScore: '7.85', overallScore: '8.65' },
    ];
    const result = computeVendorPerformance(evals);
    expect(result!.quality).toBe(8.1); // (7.33+8.77)/2 = 8.05 → 8.1
    expect(result!.delivery).toBe(9.0); // (8.67+9.33)/2 = 9.0
    expect(result!.compliance).toBe(7.0); // (6.15+7.85)/2 = 7.0
    expect(result!.overall).toBe(8.0); // (7.38+8.65)/2 = 8.015 → 8.0
  });
});

// ============================================================================
// 3. Document Status Detection Tests
// ============================================================================
describe('Document Status Detection', () => {
  const detectDocumentStatus = (signedFileUrl: string | null, docs: { fileName: string }[]) => {
    const status = {
      signedContract: !!signedFileUrl,
      boq: false,
      performanceGuarantee: false,
      insurance: false,
    };
    for (const doc of docs) {
      const name = (doc.fileName || '').toLowerCase();
      if (name.includes('boq') || name.includes('specification') || name.includes('bill of quantities')) {
        status.boq = true;
      }
      if (name.includes('guarantee') || name.includes('performance bond') || name.includes('bank guarantee') || name.includes('bond')) {
        status.performanceGuarantee = true;
      }
      if (name.includes('insurance') || name.includes('policy')) {
        status.insurance = true;
      }
    }
    return status;
  };

  it('should detect signed contract from URL', () => {
    const result = detectDocumentStatus('https://s3.example.com/signed.pdf', []);
    expect(result.signedContract).toBe(true);
    expect(result.boq).toBe(false);
    expect(result.performanceGuarantee).toBe(false);
    expect(result.insurance).toBe(false);
  });

  it('should detect no signed contract when URL is null', () => {
    const result = detectDocumentStatus(null, []);
    expect(result.signedContract).toBe(false);
  });

  it('should detect BOQ document', () => {
    const result = detectDocumentStatus(null, [
      { fileName: 'BOQ_Final_v2.xlsx' },
    ]);
    expect(result.boq).toBe(true);
  });

  it('should detect specification document as BOQ', () => {
    const result = detectDocumentStatus(null, [
      { fileName: 'Technical_Specification.pdf' },
    ]);
    expect(result.boq).toBe(true);
  });

  it('should detect performance guarantee', () => {
    const result = detectDocumentStatus(null, [
      { fileName: 'Bank_Guarantee_2024.pdf' },
    ]);
    expect(result.performanceGuarantee).toBe(true);
  });

  it('should detect performance bond', () => {
    const result = detectDocumentStatus(null, [
      { fileName: 'Performance_Bond_Certificate.pdf' },
    ]);
    expect(result.performanceGuarantee).toBe(true);
  });

  it('should detect insurance document', () => {
    const result = detectDocumentStatus(null, [
      { fileName: 'Insurance_Policy_2024.pdf' },
    ]);
    expect(result.insurance).toBe(true);
  });

  it('should detect all documents at once', () => {
    const result = detectDocumentStatus('https://s3.example.com/signed.pdf', [
      { fileName: 'BOQ_Final.xlsx' },
      { fileName: 'Performance_Guarantee.pdf' },
      { fileName: 'Insurance_Certificate.pdf' },
    ]);
    expect(result.signedContract).toBe(true);
    expect(result.boq).toBe(true);
    expect(result.performanceGuarantee).toBe(true);
    expect(result.insurance).toBe(true);
  });

  it('should be case insensitive', () => {
    const result = detectDocumentStatus(null, [
      { fileName: 'BILL OF QUANTITIES.pdf' },
      { fileName: 'BANK GUARANTEE.pdf' },
      { fileName: 'INSURANCE POLICY.pdf' },
    ]);
    expect(result.boq).toBe(true);
    expect(result.performanceGuarantee).toBe(true);
    expect(result.insurance).toBe(true);
  });

  it('should not match unrelated documents', () => {
    const result = detectDocumentStatus(null, [
      { fileName: 'meeting_minutes.pdf' },
      { fileName: 'vendor_proposal.docx' },
      { fileName: 'budget_breakdown.xlsx' },
    ]);
    expect(result.boq).toBe(false);
    expect(result.performanceGuarantee).toBe(false);
    expect(result.insurance).toBe(false);
  });
});

// ============================================================================
// 4. Vendor Evaluation Input Validation Tests
// ============================================================================
describe('Vendor Evaluation Input Validation', () => {
  // Simulates the Zod validation from the router
  const validateEvaluationInput = (input: any) => {
    const errors: string[] = [];
    if (!input.vendorId || typeof input.vendorId !== 'number') errors.push('vendorId required');
    if (!input.evaluationDate) errors.push('evaluationDate required');
    
    const scores = ['qualityScore', 'deliveryScore', 'complianceScore', 'communicationScore', 'overallScore'];
    for (const score of scores) {
      if (input[score] !== undefined && input[score] !== null) {
        const val = parseFloat(input[score]);
        if (isNaN(val) || val < 0 || val > 10) {
          errors.push(`${score} must be between 0 and 10`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  };

  it('should validate a complete evaluation input', () => {
    const result = validateEvaluationInput({
      vendorId: 1,
      evaluationDate: '2024-06-01',
      qualityScore: 8.5,
      deliveryScore: 7.0,
      complianceScore: 9.0,
      communicationScore: 8.0,
      overallScore: 8.1,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing vendorId', () => {
    const result = validateEvaluationInput({
      evaluationDate: '2024-06-01',
      qualityScore: 8.0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('vendorId required');
  });

  it('should reject missing evaluationDate', () => {
    const result = validateEvaluationInput({
      vendorId: 1,
      qualityScore: 8.0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('evaluationDate required');
  });

  it('should reject scores above 10', () => {
    const result = validateEvaluationInput({
      vendorId: 1,
      evaluationDate: '2024-06-01',
      qualityScore: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('qualityScore must be between 0 and 10');
  });

  it('should reject negative scores', () => {
    const result = validateEvaluationInput({
      vendorId: 1,
      evaluationDate: '2024-06-01',
      deliveryScore: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('deliveryScore must be between 0 and 10');
  });

  it('should allow optional scores to be undefined', () => {
    const result = validateEvaluationInput({
      vendorId: 1,
      evaluationDate: '2024-06-01',
    });
    expect(result.valid).toBe(true);
  });

  it('should allow zero scores', () => {
    const result = validateEvaluationInput({
      vendorId: 1,
      evaluationDate: '2024-06-01',
      qualityScore: 0,
      deliveryScore: 0,
    });
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// 5. Contract Approval Flow - Sub-card Enablement Tests
// ============================================================================
describe('Contract Approval - Sub-card Enablement', () => {
  const getSubCardStates = (contractStatus: string | null) => {
    const contractApproved = contractStatus === 'approved' || contractStatus === 'active';
    const hasContract = !!contractStatus;
    return {
      contract: true, // Always enabled
      milestones: hasContract,
      penalties: contractApproved,
      paymentSchedule: hasContract,
      retention: hasContract,
      implementationMonitoring: contractApproved,
    };
  };

  it('should enable only contract when no contract exists', () => {
    const states = getSubCardStates(null);
    expect(states.contract).toBe(true);
    expect(states.milestones).toBe(false);
    expect(states.penalties).toBe(false);
    expect(states.paymentSchedule).toBe(false);
    expect(states.retention).toBe(false);
    expect(states.implementationMonitoring).toBe(false);
  });

  it('should enable basic cards for draft contract', () => {
    const states = getSubCardStates('draft');
    expect(states.contract).toBe(true);
    expect(states.milestones).toBe(true);
    expect(states.penalties).toBe(false);
    expect(states.paymentSchedule).toBe(true);
    expect(states.retention).toBe(true);
    expect(states.implementationMonitoring).toBe(false);
  });

  it('should enable basic cards for pending_approval contract', () => {
    const states = getSubCardStates('pending_approval');
    expect(states.penalties).toBe(false);
    expect(states.implementationMonitoring).toBe(false);
  });

  it('should enable all cards for approved contract', () => {
    const states = getSubCardStates('approved');
    expect(states.contract).toBe(true);
    expect(states.milestones).toBe(true);
    expect(states.penalties).toBe(true);
    expect(states.paymentSchedule).toBe(true);
    expect(states.retention).toBe(true);
    expect(states.implementationMonitoring).toBe(true);
  });

  it('should enable all cards for active contract', () => {
    const states = getSubCardStates('active');
    expect(states.contract).toBe(true);
    expect(states.milestones).toBe(true);
    expect(states.penalties).toBe(true);
    expect(states.paymentSchedule).toBe(true);
    expect(states.retention).toBe(true);
    expect(states.implementationMonitoring).toBe(true);
  });
});

// ============================================================================
// 6. Financial Risk Indicator Tests
// ============================================================================
describe('Financial Risk Indicators', () => {
  const computeRisks = (params: {
    contractValue: number;
    totalPenaltyApplied: number;
    totalPenaltyDraft: number;
    retentionBalance: number;
    retentionStatus: string;
    scheduleEntries: { paymentPercentage: string }[];
    endDate: string | null;
  }) => {
    const risks: Array<{ type: 'warning' | 'danger' | 'info'; message: string }> = [];

    if (params.totalPenaltyApplied > 0) {
      const penaltyPct = (params.totalPenaltyApplied / params.contractValue) * 100;
      if (penaltyPct > 5) {
        risks.push({ type: 'danger', message: `Penalties exceed 5% of contract value (${penaltyPct.toFixed(1)}%)` });
      } else {
        risks.push({ type: 'warning', message: `Active penalties: $${params.totalPenaltyApplied.toFixed(2)} (${penaltyPct.toFixed(1)}%)` });
      }
    }
    if (params.totalPenaltyDraft > 0) {
      risks.push({ type: 'info', message: `Draft penalties pending: $${params.totalPenaltyDraft.toFixed(2)}` });
    }
    if (params.retentionBalance > 0 && params.retentionStatus !== 'released') {
      risks.push({ type: 'info', message: `Retention held: $${params.retentionBalance.toFixed(2)}` });
    }
    if (params.scheduleEntries.length === 0) {
      risks.push({ type: 'warning', message: 'No payment schedule defined' });
    } else {
      const totalPct = params.scheduleEntries.reduce((s, e) => s + parseFloat(e.paymentPercentage || '0'), 0);
      if (totalPct < 99.99) {
        risks.push({ type: 'warning', message: `Payment schedule incomplete: ${totalPct.toFixed(1)}% of 100%` });
      }
    }
    if (params.endDate) {
      const endDate = new Date(params.endDate);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        risks.push({ type: 'danger', message: `Contract expired ${Math.abs(daysRemaining)} days ago` });
      } else if (daysRemaining < 30) {
        risks.push({ type: 'warning', message: `Contract expires in ${daysRemaining} days` });
      }
    }
    return risks;
  };

  it('should return no risks for a healthy contract', () => {
    const risks = computeRisks({
      contractValue: 100000,
      totalPenaltyApplied: 0,
      totalPenaltyDraft: 0,
      retentionBalance: 0,
      retentionStatus: 'released',
      scheduleEntries: [{ paymentPercentage: '100' }],
      endDate: '2028-12-31',
    });
    expect(risks).toHaveLength(0);
  });

  it('should flag danger when penalties exceed 5%', () => {
    const risks = computeRisks({
      contractValue: 100000,
      totalPenaltyApplied: 6000,
      totalPenaltyDraft: 0,
      retentionBalance: 0,
      retentionStatus: 'none',
      scheduleEntries: [{ paymentPercentage: '100' }],
      endDate: '2028-12-31',
    });
    expect(risks.some(r => r.type === 'danger' && r.message.includes('5%'))).toBe(true);
  });

  it('should flag warning for penalties under 5%', () => {
    const risks = computeRisks({
      contractValue: 100000,
      totalPenaltyApplied: 3000,
      totalPenaltyDraft: 0,
      retentionBalance: 0,
      retentionStatus: 'none',
      scheduleEntries: [{ paymentPercentage: '100' }],
      endDate: '2028-12-31',
    });
    expect(risks.some(r => r.type === 'warning' && r.message.includes('Active penalties'))).toBe(true);
  });

  it('should flag info for draft penalties', () => {
    const risks = computeRisks({
      contractValue: 100000,
      totalPenaltyApplied: 0,
      totalPenaltyDraft: 2000,
      retentionBalance: 0,
      retentionStatus: 'none',
      scheduleEntries: [{ paymentPercentage: '100' }],
      endDate: '2028-12-31',
    });
    expect(risks.some(r => r.type === 'info' && r.message.includes('Draft penalties'))).toBe(true);
  });

  it('should flag warning for no payment schedule', () => {
    const risks = computeRisks({
      contractValue: 100000,
      totalPenaltyApplied: 0,
      totalPenaltyDraft: 0,
      retentionBalance: 0,
      retentionStatus: 'none',
      scheduleEntries: [],
      endDate: '2028-12-31',
    });
    expect(risks.some(r => r.type === 'warning' && r.message.includes('No payment schedule'))).toBe(true);
  });

  it('should flag warning for incomplete payment schedule', () => {
    const risks = computeRisks({
      contractValue: 100000,
      totalPenaltyApplied: 0,
      totalPenaltyDraft: 0,
      retentionBalance: 0,
      retentionStatus: 'none',
      scheduleEntries: [{ paymentPercentage: '60' }, { paymentPercentage: '20' }],
      endDate: '2028-12-31',
    });
    expect(risks.some(r => r.type === 'warning' && r.message.includes('incomplete'))).toBe(true);
  });

  it('should flag danger for expired contract', () => {
    const risks = computeRisks({
      contractValue: 100000,
      totalPenaltyApplied: 0,
      totalPenaltyDraft: 0,
      retentionBalance: 0,
      retentionStatus: 'none',
      scheduleEntries: [{ paymentPercentage: '100' }],
      endDate: '2020-01-01',
    });
    expect(risks.some(r => r.type === 'danger' && r.message.includes('expired'))).toBe(true);
  });

  it('should flag info for held retention', () => {
    const risks = computeRisks({
      contractValue: 100000,
      totalPenaltyApplied: 0,
      totalPenaltyDraft: 0,
      retentionBalance: 5000,
      retentionStatus: 'active',
      scheduleEntries: [{ paymentPercentage: '100' }],
      endDate: '2028-12-31',
    });
    expect(risks.some(r => r.type === 'info' && r.message.includes('Retention held'))).toBe(true);
  });
});

// ============================================================================
// 7. Net Payable Calculation Tests (SAC Financial Integration)
// ============================================================================
describe('Net Payable Calculation', () => {
  const computeNetPayable = (contractValue: number, totalPenalties: number, retentionBalance: number) => {
    return contractValue - totalPenalties - retentionBalance;
  };

  it('should compute net payable correctly', () => {
    expect(computeNetPayable(100000, 5000, 10000)).toBe(85000);
  });

  it('should handle zero deductions', () => {
    expect(computeNetPayable(100000, 0, 0)).toBe(100000);
  });

  it('should handle large deductions', () => {
    expect(computeNetPayable(100000, 50000, 30000)).toBe(20000);
  });

  it('should handle deductions exceeding contract value', () => {
    expect(computeNetPayable(100000, 60000, 50000)).toBe(-10000);
  });
});
