// ============================================================================
// BID ANALYSIS SERVICE
// Advanced competitive bid analysis with customizable evaluation criteria
// Integrated Management System (IMS)
// ============================================================================

import type { BidsAnalysis, EvaluationCriterion, BidderTechnicalScore, BidderFinancialScore, BidderFinalScore } from '@/app/types/logistics.types';

const STORAGE_KEY = 'bidsAnalysis';

// ============================================================================
// DEFAULT EVALUATION CRITERIA TEMPLATE
// ============================================================================

export const DEFAULT_EVALUATION_CRITERIA: EvaluationCriterion[] = [
  // Legal and Administrative (Total: 7 points)
  {
    id: 'legal-1',
    section: 'Legal and Administrative',
    criterionName: 'Valid company registration',
    description: 'Submission of valid and government/commercial registration',
    weight: 2,
    mandatory: true,
    active: true,
    order: 1
  },
  {
    id: 'legal-2',
    section: 'Legal and Administrative',
    criterionName: 'Tax Card',
    description: 'Submission of valid tax registration certificate',
    weight: 2,
    mandatory: true,
    active: true,
    order: 2
  },
  {
    id: 'legal-3',
    section: 'Legal and Administrative',
    criterionName: 'Insurance Card',
    description: 'Submission of valid insurance coverage documentation',
    weight: 1,
    mandatory: true,
    active: true,
    order: 3
  },
  {
    id: 'legal-4',
    section: 'Legal and Administrative',
    criterionName: 'Signed declarations',
    description: 'Submission of all required signed declarations regarding debarment, anti-corruption, conflict of interest, terrorism/sanctions lists',
    weight: 2,
    mandatory: true,
    active: true,
    order: 4
  },
  
  // Experience & Technical Capacity (Total: 10 points)
  {
    id: 'tech-1',
    section: 'Experience & Technical Capacity',
    criterionName: 'Company profile document',
    description: 'Submission of a complete and up-to-date company profile and more than 3 years of experience',
    weight: 3,
    mandatory: true,
    active: true,
    order: 5
  },
  {
    id: 'tech-2',
    section: 'Experience & Technical Capacity',
    criterionName: 'Years of Experience',
    description: 'Registration date, copies of past contracts',
    weight: 4,
    mandatory: false,
    active: true,
    order: 6
  },
  {
    id: 'tech-3',
    section: 'Experience & Technical Capacity',
    criterionName: 'Experience with INGOs',
    description: 'Verifiable experience with at least two INGOs on similar projects',
    weight: 3,
    mandatory: false,
    active: true,
    order: 7
  },
  
  // Operational & Financial Capacity (Total: 15 points)
  {
    id: 'op-1',
    section: 'Operational & Financial Capacity',
    criterionName: 'Presence in target geography',
    description: 'Office with verifiable proof of presence in the target area',
    weight: 1,
    mandatory: true,
    active: true,
    order: 8
  },
  {
    id: 'op-2',
    section: 'Operational & Financial Capacity',
    criterionName: 'Delivery Time (in Days)',
    description: 'Proposing a delivery time of 15 days or less from the purchase order date',
    weight: 2,
    mandatory: true,
    active: true,
    order: 9
  },
  {
    id: 'op-3',
    section: 'Operational & Financial Capacity',
    criterionName: 'Validity of Offer (Days)',
    description: 'Offer is valid for at least 30 days',
    weight: 2,
    mandatory: true,
    active: true,
    order: 10
  },
  {
    id: 'op-4',
    section: 'Operational & Financial Capacity',
    criterionName: 'Replacement Period for Rejected Items',
    description: 'Supplier commits to replacing rejected items within 7 days at their own cost',
    weight: 2,
    mandatory: true,
    active: true,
    order: 11
  },
  {
    id: 'op-5',
    section: 'Operational & Financial Capacity',
    criterionName: 'Payment Terms',
    description: '0% upfront, 10% after delivery / 30% upfront, 70% after delivery / 50% upfront, 50% after delivery',
    weight: 3,
    mandatory: false,
    active: true,
    order: 12
  },
  {
    id: 'op-6',
    section: 'Operational & Financial Capacity',
    criterionName: 'Bank Guarantee',
    description: 'Submission of an original and verifiable bank guarantee',
    weight: 1,
    mandatory: false,
    active: true,
    order: 13
  },
  {
    id: 'op-7',
    section: 'Operational & Financial Capacity',
    criterionName: 'Bank account confirmation',
    description: 'Submission of complete and verified bank account details',
    weight: 1,
    mandatory: true,
    active: true,
    order: 14
  },
  {
    id: 'op-8',
    section: 'Operational & Financial Capacity',
    criterionName: 'Financial capacity',
    description: 'Audited financial statements showing adequate capacity',
    weight: 3,
    mandatory: false,
    active: true,
    order: 15
  },
  
  // Samples (Total: 8 points)
  {
    id: 'sample-1',
    section: 'Samples (if relevant)',
    criterionName: 'Samples submission',
    description: 'Verification process, mandatory before award',
    weight: 8,
    mandatory: false,
    active: true,
    order: 16
  },
  
  // References (Total: 7 points)
  {
    id: 'ref-1',
    section: 'References',
    criterionName: 'References from previous contracts',
    description: 'Contact details / letters, ideally from UN/INGOs or local NGOs',
    weight: 7,
    mandatory: false,
    active: true,
    order: 17
  }
];

// ============================================================================
// SAMPLE DATA
// ============================================================================

const INITIAL_BIDS_ANALYSIS_DATA: BidsAnalysis[] = [
  // Comprehensive Test Record #1 - Approved with all approvals completed
  {
    id: 'ba-test-001',
    baNumber: 'BA-2026-00001',
    
    // Reference
    rfqNumber: 'RFQ-2026-00026',
    tenderNumber: 'TENDER/2026/WASH/003',
    
    // Context
    organizationId: 'org-001',
    operatingUnitId: 'ou-org-001-hq', // Updated to match actual OU structure
    country: 'Jordan',
    
    // Header
    analysisDate: '2026-01-18',
    purchaseDescription: 'Construction of WASH facilities including water storage tanks, sanitation systems, and hygiene stations for IDP camp expansion - Phase II. Scope includes civil works, plumbing installation, electrical connections, and quality assurance testing per SPHERE standards.',
    requestedBy: 'WASH Program Coordinator',
    budgetAmount: 135000,
    budgetLineId: 'bl-wash-infrastructure',
    currency: 'USD',
    
    // Evaluation Criteria
    evaluationCriteria: [...DEFAULT_EVALUATION_CRITERIA],
    
    // Technical Threshold
    technicalThreshold: 70,
    
    // Bidders
    bidders: ['bidder-001', 'bidder-002', 'bidder-003', 'bidder-004'],
    
    // Technical Evaluation
    technicalScores: [
      {
        bidderId: 'bidder-001',
        bidderName: 'Al-Noor Construction & Engineering LLC',
        criterionScores: {
          'legal-1': 2, 'legal-2': 2, 'legal-3': 1, 'legal-4': 2,
          'tech-1': 3, 'tech-2': 3.5, 'tech-3': 3,
          'op-1': 1, 'op-2': 2, 'op-3': 2, 'op-4': 2, 'op-5': 3, 'op-6': 0.8, 'op-7': 1, 'op-8': 2.5,
          'sample-1': 7, 'ref-1': 6
        },
        totalTechnicalScore: 42.8,
        meetsThreshold: true
      },
      {
        bidderId: 'bidder-002',
        bidderName: 'United Development Contractors',
        criterionScores: {
          'legal-1': 2, 'legal-2': 2, 'legal-3': 1, 'legal-4': 1.5,
          'tech-1': 3, 'tech-2': 4, 'tech-3': 2.5,
          'op-1': 1, 'op-2': 1.5, 'op-3': 2, 'op-4': 2, 'op-5': 2, 'op-6': 1, 'op-7': 1, 'op-8': 3,
          'sample-1': 8, 'ref-1': 7
        },
        totalTechnicalScore: 44.5,
        meetsThreshold: true
      },
      {
        bidderId: 'bidder-003',
        bidderName: 'Premium Build Solutions',
        criterionScores: {
          'legal-1': 2, 'legal-2': 2, 'legal-3': 0.5, 'legal-4': 2,
          'tech-1': 2.5, 'tech-2': 2, 'tech-3': 1.5,
          'op-1': 0.5, 'op-2': 1, 'op-3': 2, 'op-4': 1.5, 'op-5': 1.5, 'op-6': 0, 'op-7': 1, 'op-8': 1.5,
          'sample-1': 5, 'ref-1': 4
        },
        totalTechnicalScore: 31,
        meetsThreshold: false
      },
      {
        bidderId: 'bidder-004',
        bidderName: 'Regional Infrastructure Partners',
        criterionScores: {
          'legal-1': 2, 'legal-2': 2, 'legal-3': 1, 'legal-4': 2,
          'tech-1': 3, 'tech-2': 3, 'tech-3': 2,
          'op-1': 1, 'op-2': 2, 'op-3': 2, 'op-4': 2, 'op-5': 2.5, 'op-6': 0.5, 'op-7': 1, 'op-8': 2,
          'sample-1': 6.5, 'ref-1': 5.5
        },
        totalTechnicalScore: 40,
        meetsThreshold: true
      }
    ],
    
    // Financial Evaluation
    financialScores: [
      {
        bidderId: 'bidder-001',
        bidderName: 'Al-Noor Construction & Engineering LLC',
        totalPrice: 125000,
        financialScore: 94.8
      },
      {
        bidderId: 'bidder-002',
        bidderName: 'United Development Contractors',
        totalPrice: 118500,
        financialScore: 100
      },
      {
        bidderId: 'bidder-003',
        bidderName: 'Premium Build Solutions',
        totalPrice: 142000,
        financialScore: 83.5
      },
      {
        bidderId: 'bidder-004',
        bidderName: 'Regional Infrastructure Partners',
        totalPrice: 127500,
        financialScore: 92.9
      }
    ],
    
    // Final Evaluation
    finalScores: [
      {
        bidderId: 'bidder-001',
        bidderName: 'Al-Noor Construction & Engineering LLC',
        technicalScore: 85.6,
        financialScore: 94.8,
        totalScore: 90.2,
        remarks: 'Strong technical score but not the lowest bid'
      },
      {
        bidderId: 'bidder-002',
        bidderName: 'United Development Contractors',
        technicalScore: 88.3,
        financialScore: 100,
        totalScore: 94.15,
        remarks: 'Highest overall score - Lowest bidder with excellent technical evaluation'
      },
      {
        bidderId: 'bidder-003',
        bidderName: 'Premium Build Solutions',
        technicalScore: 62.0,
        financialScore: 83.5,
        totalScore: 72.75,
        remarks: 'Failed to meet technical threshold - Disqualified'
      },
      {
        bidderId: 'bidder-004',
        bidderName: 'Regional Infrastructure Partners',
        technicalScore: 80.0,
        financialScore: 92.9,
        totalScore: 86.45,
        remarks: 'Good technical score with competitive pricing'
      }
    ],
    
    // Selection
    lowestProposalAmount: 118500,
    selectedBidderId: 'bidder-002',
    selectedBidderName: 'United Development Contractors',
    selectionJustification: 'United Development Contractors has been selected based on achieving the highest combined score in the competitive bid analysis. Their technical evaluation score of 88.3% (well above the 70% threshold) combined with the lowest financial proposal of $118,500 resulted in a final weighted score of 94.15 points. Key strengths include: (1) Excellent experience with 12 years in construction sector and proven track record with 3 major INGO projects, (2) Outstanding sample submissions demonstrating high quality standards, (3) Exceptional references from UN agencies and international NGOs, (4) Strong financial capacity with audited statements showing solid fiscal health, (5) Competitive delivery timeline of 15 days, and (6) Favorable payment terms requiring only 10% advance. The combination of being the lowest bidder while maintaining high technical quality makes this selection both financially prudent and technically sound. All mandatory compliance criteria were fully met.',
    
    // Approvals - ALL COMPLETED
    approver1: 'Dr. Sarah Hassan',
    approver1Date: '2026-01-20',
    approver2: 'Ahmed Al-Mansouri',
    approver2Date: '2026-01-22',
    approver3: 'John Mitchell',
    approver3Date: '2026-01-24',
    
    // Status
    status: 'approved',
    locked: false,
    
    // Metadata
    createdAt: '2026-01-18T09:00:00Z',
    createdBy: 'user-procurement-specialist',
    updatedAt: '2026-01-24T16:30:00Z',
    updatedBy: 'user-procurement-specialist'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateBANumber(): string {
  const year = new Date().getFullYear();
  const analyses = loadAllBidsAnalyses();
  const count = analyses.length + 1;
  return `BA-${year}-${String(count).padStart(5, '0')}`;
}

function calculateTechnicalScore(
  criterionScores: Record<string, number>,
  evaluationCriteria: EvaluationCriterion[]
): number {
  let totalScore = 0;
  let totalWeight = 0;

  evaluationCriteria.forEach(criterion => {
    if (criterion.active) {
      const score = criterionScores[criterion.id] || 0;
      totalScore += score;
      totalWeight += criterion.weight;
    }
  });

  // Return percentage
  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
}

function calculateFinancialScore(
  bidderPrice: number,
  lowestPrice: number,
  maxScore: number = 100
): number {
  if (lowestPrice === 0 || bidderPrice === 0) return 0;
  return (lowestPrice / bidderPrice) * maxScore;
}

// One-time force reset to ensure fresh test data loads
function forceResetIfNeeded(): void {
  const FORCE_RESET_FLAG = 'ba_fresh_init_v1';
  
  if (!localStorage.getItem(FORCE_RESET_FLAG)) {
    console.log('[BA Service] 🔄 FORCE RESET: Clearing all old BA data...');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('logistics_data_v2_loaded');
    localStorage.removeItem('logistics_data_v3_loaded');
    localStorage.removeItem('logistics_data_v4_final');
    localStorage.setItem(FORCE_RESET_FLAG, 'true');
    console.log('[BA Service] ✅ Force reset complete - will initialize fresh data');
  }
}

function initializeStorage(): void {
  forceResetIfNeeded();
  
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    console.log('[BA Service] 💾 Initializing fresh test data - 1 bid analysis');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BIDS_ANALYSIS_DATA));
    console.log('[BA Service] ✅ Test data saved:', INITIAL_BIDS_ANALYSIS_DATA.length, 'records');
  } else {
    const data = JSON.parse(existing);
    console.log('[BA Service] 📂 Existing data found:', data.length, 'records');
  }
}

function loadAllBidsAnalyses(): BidsAnalysis[] {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEY);
  const result = data ? JSON.parse(data) : [];
  return result;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

export const bidAnalysisService = {
  // Initialize storage with sample data if empty
  initialize(): void {
    initializeStorage();
  },

  // Get all analyses
  getAllBidsAnalyses(): BidsAnalysis[] {
    const result = loadAllBidsAnalyses();
    console.log('[BA Service] getAllBidsAnalyses() returning:', result.length, 'records');
    return result;
  },

  // Get by ID
  getById(id: string): BidsAnalysis | null {
    const analyses = this.getAllBidsAnalyses();
    return analyses.find(a => a.id === id) || null;
  },

  // Get by BA Number
  getByBANumber(baNumber: string): BidsAnalysis | null {
    const analyses = this.getAllBidsAnalyses();
    return analyses.find(a => a.baNumber === baNumber) || null;
  },

  // Create
  create(data: Omit<BidsAnalysis, 'id' | 'baNumber' | 'createdAt' | 'updatedAt'>): BidsAnalysis {
    const analyses = this.getAllBidsAnalyses();
    
    const newAnalysis: BidsAnalysis = {
      ...data,
      id: `ba-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      baNumber: generateBANumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    analyses.push(newAnalysis);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
    
    return newAnalysis;
  },

  // Update
  update(id: string, data: Partial<BidsAnalysis>): BidsAnalysis | null {
    const analyses = this.getAllBidsAnalyses();
    const index = analyses.findIndex(a => a.id === id);
    
    if (index === -1) return null;

    analyses[index] = {
      ...analyses[index],
      ...data,
      id: analyses[index].id, // Preserve ID
      baNumber: analyses[index].baNumber, // Preserve BA number
      createdAt: analyses[index].createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
    return analyses[index];
  },

  // Delete
  delete(id: string): boolean {
    const analyses = this.getAllBidsAnalyses();
    const filtered = analyses.filter(a => a.id !== id);
    
    if (filtered.length === analyses.length) return false;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  // ============================================================================
  // SCORE CALCULATION
  // ============================================================================

  // Calculate technical scores for all bidders
  calculateTechnicalScores(
    bidders: string[],
    bidderNames: Record<string, string>,
    criterionScores: Record<string, Record<string, number>>, // bidderId -> criterionId -> score
    evaluationCriteria: EvaluationCriterion[],
    threshold: number
  ): BidderTechnicalScore[] {
    return bidders.map(bidderId => {
      const scores = criterionScores[bidderId] || {};
      const totalScore = calculateTechnicalScore(scores, evaluationCriteria);
      
      return {
        bidderId,
        bidderName: bidderNames[bidderId] || '',
        criterionScores: scores,
        totalTechnicalScore: totalScore,
        meetsThreshold: totalScore >= threshold
      };
    });
  },

  // Calculate financial scores for all bidders
  calculateFinancialScores(
    bidders: string[],
    bidderNames: Record<string, string>,
    bidderPrices: Record<string, number>
  ): BidderFinancialScore[] {
    const prices = bidders.map(id => bidderPrices[id] || 0).filter(p => p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return bidders.map(bidderId => {
      const price = bidderPrices[bidderId] || 0;
      const score = calculateFinancialScore(price, lowestPrice);
      
      return {
        bidderId,
        bidderName: bidderNames[bidderId] || '',
        totalPrice: price,
        financialScore: score
      };
    });
  },

  // Calculate final combined scores
  calculateFinalScores(
    technicalScores: BidderTechnicalScore[],
    financialScores: BidderFinancialScore[],
    technicalWeight: number = 0.5,
    financialWeight: number = 0.5
  ): BidderFinalScore[] {
    return technicalScores.map(techScore => {
      const finScore = financialScores.find(f => f.bidderId === techScore.bidderId);
      
      if (!finScore) {
        return {
          bidderId: techScore.bidderId,
          bidderName: techScore.bidderName,
          technicalScore: techScore.totalTechnicalScore,
          financialScore: 0,
          totalScore: techScore.totalTechnicalScore * technicalWeight
        };
      }

      const totalScore = (techScore.totalTechnicalScore * technicalWeight) + 
                        (finScore.financialScore * financialWeight);

      return {
        bidderId: techScore.bidderId,
        bidderName: techScore.bidderName,
        technicalScore: techScore.totalTechnicalScore,
        financialScore: finScore.financialScore,
        totalScore
      };
    });
  },

  // Get evaluation criteria template
  getDefaultCriteria(): EvaluationCriterion[] {
    return [...DEFAULT_EVALUATION_CRITERIA];
  }
};

function getAllBidsAnalyses(): BidsAnalysis[] {
  return bidAnalysisService.getAllBidsAnalyses();
}