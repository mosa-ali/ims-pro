// ============================================================================
// LOGISTICS SAMPLE DATA SERVICE
// Populate realistic sample data for QA and BA forms
// ============================================================================

import type { QuotationAnalysis, BidsAnalysis, EvaluationCriterion } from '@/app/types/logistics.types';
import { quotationAnalysisService } from './quotationService';
import { bidAnalysisService, DEFAULT_EVALUATION_CRITERIA } from './bidAnalysisService';
import { procurementRequestService } from './procurementRequestService';
import { rfqService } from './rfqService';
import { analysisFormService } from './analysisFormService';

// ============================================================================
// SAMPLE QUOTATION ANALYSIS (QA)
// ============================================================================

export function createSampleQuotationAnalysis(): void {
  const sampleQA: Omit<QuotationAnalysis, 'id' | 'qaNumber' | 'createdAt' | 'updatedAt'> = {
    // Reference
    rfqId: 'rfq-sample-2026-003',
    rfqNumber: 'RFQ-2026-00025',
    prId: 'pr-sample-2026-003',
    prNumber: 'PR-2026-00047',
    
    // Context
    organizationId: 'org-001',
    operatingUnitId: 'ou-001',
    projectId: 'proj-health-001',
    budgetLineId: 'bl-medical-supplies',
    estimatedBudget: 8500,
    currency: 'USD',
    
    // Analysis Date
    analysisDate: '2026-01-20',
    
    // Scoring Weights
    priceWeight: 50,
    deliveryWeight: 20,
    warrantyWeight: 15,
    complianceWeight: 15,
    
    // Supplier Data (4 suppliers)
    suppliers: [
      {
        supplierId: 'sup-005',
        supplierName: 'HealthCare Logistics MENA',
        price: 8200,
        deliveryTime: 12,
        warranty: '18 months comprehensive warranty with on-site support',
        complianceNotes: 'ISO 13485 & ISO 9001 certified, WHO prequalified supplier, all required documentation submitted on time, compliant with donor visibility requirements',
        score: 94
      },
      {
        supplierId: 'sup-006',
        supplierName: 'MedEquip Solutions Ltd',
        price: 7950,
        deliveryTime: 18,
        warranty: '12 months standard manufacturer warranty',
        complianceNotes: 'Valid commercial registration and tax certificates, minor delay in submission of bank guarantee, compliant with technical specifications',
        score: 87
      },
      {
        supplierId: 'sup-007',
        supplierName: 'Global Medical Trading Co.',
        price: 8450,
        deliveryTime: 10,
        warranty: '24 months extended warranty including parts and labor',
        complianceNotes: 'Excellent compliance track record, CE marked products, ISO 13485 certified, submitted all required anti-corruption declarations',
        score: 91
      },
      {
        supplierId: 'sup-008',
        supplierName: 'Premium Health Supplies',
        price: 7800,
        deliveryTime: 25,
        warranty: '6 months limited warranty',
        complianceNotes: 'Valid documents provided but delivery time exceeds project requirements, failed to provide complete references from previous INGO contracts',
        score: 76
      }
    ],
    
    // Selection
    selectedSupplierId: 'sup-005',
    selectedSupplierName: 'HealthCare Logistics MENA',
    selectionJustification: 'HealthCare Logistics MENA achieved the highest overall score (94 points) based on comprehensive evaluation. Although not the lowest bidder, they offer the optimal balance of competitive pricing (only 5% above lowest bid), excellent delivery timeframe (12 days meets urgent project requirements), superior warranty coverage (18 months comprehensive), and outstanding compliance documentation. Their WHO prequalification and proven track record with similar humanitarian projects justify the marginal price premium. The lowest bidder (Premium Health Supplies at $7,800) was disqualified due to unacceptable delivery time (25 days) and inadequate warranty coverage that poses risk to project implementation timelines.',
    
    // Flags
    lowestBidderSelected: false,
    requiresJustification: true,
    
    // Status - APPROVED
    status: 'approved',
    
    // Approvals
    approvedBy: 'Logistics Manager',
    approvedDate: '2026-01-22',
    
    // Metadata
    createdBy: 'user-logistics-001',
    updatedBy: 'user-logistics-001'
  };

  // Create the QA
  quotationAnalysisService.create(sampleQA);
  console.log('✅ Sample Quotation Analysis created (Status: Approved, Non-lowest bidder selected)');
}

// ============================================================================
// SAMPLE BID ANALYSIS (CBA)
// ============================================================================

export function createSampleBidAnalysis(): void {
  // First, let's prepare the bidder data
  const bidders = ['bidder-001', 'bidder-002', 'bidder-003', 'bidder-004'];
  
  const bidderNames: Record<string, string> = {
    'bidder-001': 'Al-Noor Construction & Engineering LLC',
    'bidder-002': 'United Development Contractors',
    'bidder-003': 'Premium Build Solutions',
    'bidder-004': 'Regional Infrastructure Partners'
  };

  // Prepare the evaluation criteria (using defaults)
  const evaluationCriteria = DEFAULT_EVALUATION_CRITERIA;

  // ============================================================================
  // TECHNICAL SCORES - DETAILED CRITERION-BY-CRITERION EVALUATION
  // ============================================================================

  const criterionScores: Record<string, Record<string, number>> = {
    'bidder-001': {
      // Legal and Administrative (7 points total)
      'legal-1': 2,  // Valid company registration - FULL MARKS
      'legal-2': 2,  // Tax Card - FULL MARKS
      'legal-3': 1,  // Insurance Card - FULL MARKS
      'legal-4': 2,  // Signed declarations - FULL MARKS
      
      // Experience & Technical Capacity (10 points total)
      'tech-1': 3,   // Company profile - FULL MARKS
      'tech-2': 3.5, // Years of Experience - 8 years (strong)
      'tech-3': 3,   // Experience with INGOs - 4 major INGO contracts
      
      // Operational & Financial Capacity (15 points total)
      'op-1': 1,     // Presence in target geography - FULL MARKS
      'op-2': 2,     // Delivery Time - 12 days (excellent)
      'op-3': 2,     // Validity of Offer - 60 days
      'op-4': 2,     // Replacement Period - 5 days commitment
      'op-5': 3,     // Payment Terms - 0% upfront, 100% on delivery
      'op-6': 0.8,   // Bank Guarantee - submitted but minor discrepancy
      'op-7': 1,     // Bank account confirmation - FULL MARKS
      'op-8': 2.5,   // Financial capacity - strong financials
      
      // Samples (8 points total)
      'sample-1': 7, // Samples submission - excellent quality samples
      
      // References (7 points total)
      'ref-1': 6     // References - 5 strong references from UN/INGOs
    },
    'bidder-002': {
      // Legal and Administrative (7 points total)
      'legal-1': 2,  // Valid company registration
      'legal-2': 2,  // Tax Card
      'legal-3': 1,  // Insurance Card
      'legal-4': 1.5,// Signed declarations - one declaration had minor issue
      
      // Experience & Technical Capacity (10 points total)
      'tech-1': 3,   // Company profile
      'tech-2': 4,   // Years of Experience - 12 years (excellent)
      'tech-3': 2.5, // Experience with INGOs - 3 INGO contracts
      
      // Operational & Financial Capacity (15 points total)
      'op-1': 1,     // Presence in target geography
      'op-2': 1.5,   // Delivery Time - 15 days (acceptable)
      'op-3': 2,     // Validity of Offer - 45 days
      'op-4': 2,     // Replacement Period - 7 days
      'op-5': 2,     // Payment Terms - 10% upfront, 90% on delivery
      'op-6': 1,     // Bank Guarantee - properly submitted
      'op-7': 1,     // Bank account confirmation
      'op-8': 3,     // Financial capacity - excellent financials
      
      // Samples (8 points total)
      'sample-1': 8, // Samples submission - outstanding samples
      
      // References (7 points total)
      'ref-1': 7     // References - excellent references from major donors
    },
    'bidder-003': {
      // Legal and Administrative (7 points total)
      'legal-1': 2,  // Valid company registration
      'legal-2': 2,  // Tax Card
      'legal-3': 0.5,// Insurance Card - expired, needs renewal
      'legal-4': 2,  // Signed declarations
      
      // Experience & Technical Capacity (10 points total)
      'tech-1': 2.5, // Company profile - adequate but not comprehensive
      'tech-2': 2,   // Years of Experience - 4 years (limited)
      'tech-3': 1.5, // Experience with INGOs - only 1 contract
      
      // Operational & Financial Capacity (15 points total)
      'op-1': 0.5,   // Presence in target geography - branch office only
      'op-2': 1,     // Delivery Time - 18 days (slow)
      'op-3': 2,     // Validity of Offer - 35 days
      'op-4': 1.5,   // Replacement Period - 10 days
      'op-5': 1.5,   // Payment Terms - 30% upfront, 70% on delivery
      'op-6': 0,     // Bank Guarantee - not submitted
      'op-7': 1,     // Bank account confirmation
      'op-8': 1.5,   // Financial capacity - adequate but limited
      
      // Samples (8 points total)
      'sample-1': 5, // Samples submission - acceptable quality
      
      // References (7 points total)
      'ref-1': 4     // References - limited references
    },
    'bidder-004': {
      // Legal and Administrative (7 points total)
      'legal-1': 2,  // Valid company registration
      'legal-2': 2,  // Tax Card
      'legal-3': 1,  // Insurance Card
      'legal-4': 2,  // Signed declarations
      
      // Experience & Technical Capacity (10 points total)
      'tech-1': 3,   // Company profile
      'tech-2': 3,   // Years of Experience - 7 years
      'tech-3': 2,   // Experience with INGOs - 2 contracts
      
      // Operational & Financial Capacity (15 points total)
      'op-1': 1,     // Presence in target geography
      'op-2': 2,     // Delivery Time - 10 days (very good)
      'op-3': 2,     // Validity of Offer - 50 days
      'op-4': 2,     // Replacement Period - 5 days
      'op-5': 2.5,   // Payment Terms - 5% upfront, 95% on delivery
      'op-6': 0.5,   // Bank Guarantee - submitted but amount incorrect
      'op-7': 1,     // Bank account confirmation
      'op-8': 2,     // Financial capacity - good financials
      
      // Samples (8 points total)
      'sample-1': 6.5, // Samples submission - good quality
      
      // References (7 points total)
      'ref-1': 5.5   // References - adequate references
    }
  };

  // ============================================================================
  // FINANCIAL DATA
  // ============================================================================

  const bidderPrices: Record<string, number> = {
    'bidder-001': 125000,  // Competitive
    'bidder-002': 118500,  // LOWEST BID
    'bidder-003': 142000,  // Highest
    'bidder-004': 127500   // Mid-range
  };

  // ============================================================================
  // CALCULATE SCORES
  // ============================================================================

  const technicalThreshold = 70;

  const technicalScores = bidAnalysisService.calculateTechnicalScores(
    bidders,
    bidderNames,
    criterionScores,
    evaluationCriteria,
    technicalThreshold
  );

  const financialScores = bidAnalysisService.calculateFinancialScores(
    bidders,
    bidderNames,
    bidderPrices
  );

  const finalScores = bidAnalysisService.calculateFinalScores(
    technicalScores,
    financialScores,
    0.5, // 50% technical weight
    0.5  // 50% financial weight
  );

  // ============================================================================
  // CREATE BID ANALYSIS
  // ============================================================================

  const sampleBA: Omit<BidsAnalysis, 'id' | 'baNumber' | 'createdAt' | 'updatedAt'> = {
    // Reference
    rfqNumber: 'RFQ-2026-00026',
    tenderNumber: 'TENDER/2026/WASH/003',
    
    // Context
    organizationId: 'org-001',
    operatingUnitId: 'ou-001',
    country: 'Jordan',
    
    // Header
    analysisDate: '2026-01-18',
    purchaseDescription: 'Construction of WASH facilities including water storage tanks, sanitation systems, and hygiene stations for IDP camp expansion - Phase II. Scope includes civil works, plumbing installation, electrical connections, and quality assurance testing per SPHERE standards.',
    requestedBy: 'WASH Program Coordinator',
    budgetAmount: 135000,
    budgetLineId: 'bl-wash-infrastructure',
    currency: 'USD',
    
    // Evaluation Criteria
    evaluationCriteria: evaluationCriteria,
    
    // Technical Threshold
    technicalThreshold: technicalThreshold,
    
    // Bidders
    bidders: bidders,
    
    // Scores
    technicalScores: technicalScores,
    financialScores: financialScores,
    finalScores: finalScores,
    
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
    
    // Status - APPROVED
    status: 'approved',
    locked: false,
    
    // Metadata
    createdBy: 'user-procurement-specialist',
    updatedBy: 'user-procurement-specialist'
  };

  // Create the BA
  bidAnalysisService.create(sampleBA);
  console.log('✅ Sample Bid Analysis created (Status: Approved, Lowest bidder selected, All approvals completed)');
}

// ============================================================================
// INITIALIZE ALL SAMPLE DATA
// ============================================================================

export function initializeLogisticsSampleData(): void {
  console.log('[LogisticsSampleData] Starting initialization...');
  
  // Check if data already exists
  const existingQA = quotationAnalysisService.getAll();
  const existingBA = bidAnalysisService.getAllBidsAnalyses();
  
  console.log('[LogisticsSampleData] Existing QA count:', existingQA.length);
  console.log('[LogisticsSampleData] Existing BA count:', existingBA.length);
  
  // Only create sample data if no data exists
  if (existingQA.length === 0) {
    console.log('[LogisticsSampleData] Creating sample Quotation Analysis...');
    createSampleQuotationAnalysis();
  } else {
    console.log('[LogisticsSampleData] ⏭️ Quotation Analysis data already exists, skipping');
  }
  
  if (existingBA.length === 0) {
    console.log('[LogisticsSampleData] Creating sample Bid Analysis...');
    createSampleBidAnalysis();
  } else {
    console.log('[LogisticsSampleData] ⏭️ Bid Analysis data already exists, skipping');
  }
  
  console.log('[LogisticsSampleData] ✅ Initialization complete');
  
  // ✅ MANDATORY TEST CASES INITIALIZATION (NO EXCEPTIONS)
  initializeMandatoryTestCases();
}

/**
 * INITIALIZE THE 3 MANDATORY TEST CASES REQUESTED BY THE SYSTEM OWNER
 * Cases: $800, $10,000, $30,000
 */
function initializeMandatoryTestCases(): void {
  const prIds = ['pr-test-case-1-800', 'pr-test-case-2-10k', 'pr-test-case-3-30k'];
  const userId = 'system';
  
  prIds.forEach(id => {
    const pr = procurementRequestService.getRequestById(id);
    if (pr && pr.status === 'approved') {
      console.log(`��� [LogisticsSampleData] Initializing documents for Test Case: ${pr.prNumber}`);
      
      // 1. Trigger RFQ (if not tender)
      if (pr.totalEstimatedCost <= 25000) {
        const rfq = rfqService.autoCreateFromPR(pr, userId);
        if (rfq) {
          // Add dummy suppliers so QA can be visible
          if (rfq.suppliers.length === 0) {
            rfqService.addSupplier(rfq.id, 'Global Med Supplies', 'John Doe', 'john@global.com', '1234', '2026-02-05');
            rfqService.addSupplier(rfq.id, 'Regional Health Co', 'Sarah Jane', 'sarah@regional.com', '5678', '2026-02-05');
            rfqService.markAsSent(rfq.id, userId);
          }
          
          // 2. Trigger QA
          analysisFormService.autoCreateFromPR(pr.id, userId);
        }
      } else {
        // Tender Case
        // (Tender announcement is already auto-injected in tenderAnnouncementService)
        // Ensure analysis (BA) is not created yet (it should be blocked by the end date)
        analysisFormService.autoCreateFromPR(pr.id, userId);
      }
    }
  });
}
