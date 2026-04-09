// ============================================================================
// COMPETITIVE BID ANALYSIS (CBA) SERVICE
// Official tender evaluation for procurement > USD 25,000
// Auto-syncs from Bid Evaluation Criteria - Audit-critical
// Integrated Management System (IMS)
// ============================================================================

import type {
  CompetitiveBidAnalysis,
  CBABidder,
  CBATechnicalCriterion,
  CBATechnicalScore,
  CBAFinancialScore,
  CBAFinalScore,
  CBAApprovalSignature
} from '@/app/types/logistics.types';
import { bidEvaluationCriteriaService } from './bidEvaluationCriteriaService';

const STORAGE_KEY = 'competitive_bid_analysis_v1';
const SEQUENCE_KEY = 'cba_sequence_2026';

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const competitiveBidAnalysisService = {
  
  /**
   * Get all CBAs
   */
  getAll(): CompetitiveBidAnalysis[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Get CBA by ID
   */
  getById(id: string): CompetitiveBidAnalysis | null {
    const all = this.getAll();
    return all.find(c => c.id === id) || null;
  },

  /**
   * Get CBA by PR ID
   */
  getByPRId(prId: string): CompetitiveBidAnalysis | null {
    const all = this.getAll();
    return all.find(c => c.prId === prId) || null;
  },

  /**
   * Generate CBA Number
   */
  generateCBANumber(): string {
    const sequence = parseInt(localStorage.getItem(SEQUENCE_KEY) || '0', 10) + 1;
    localStorage.setItem(SEQUENCE_KEY, sequence.toString());
    return `CBA-2026-${sequence.toString().padStart(5, '0')}`;
  },

  /**
   * Initialize CBA from PR and Evaluation Criteria
   * ✅ CRITICAL: Auto-created inside PR workspace, syncs from Evaluation Criteria
   */
  initializeFromPR(
    prId: string,
    prNumber: string,
    rfqTenderNumber: string | undefined,
    organizationId: string,
    organizationName: string,
    organizationLogo: string | undefined,
    operatingUnitId: string,
    operatingUnitName: string,
    country: string,
    currency: string,
    budgetLineId: string,
    budgetLineName: string,
    budgetAmount: number,
    userId: string
  ): CompetitiveBidAnalysis {
    // Check if already exists
    const existing = this.getByPRId(prId);
    if (existing) {
      return existing;
    }

    // Get evaluation criteria
    const evalCriteria = bidEvaluationCriteriaService.getByPRId(prId);
    if (!evalCriteria) {
      throw new Error('Evaluation Criteria must be created first');
    }

    // Sync bidders from evaluation criteria
    const bidders: CBABidder[] = evalCriteria.bidders.map((b, index) => ({
      id: b.id,
      companyName: b.bidderName,
      addedFromCriteria: true,
      order: index + 1
    }));

    // Create technical criteria mapping (Technical Evaluation = 50 points max)
    // Map from evaluation criteria requirements to CBA technical criteria
    const technicalCriteria: CBATechnicalCriterion[] = [];
    const groupedBySection = bidEvaluationCriteriaService.getRequirementsBySection(evalCriteria);
    
    let order = 1;
    Object.entries(groupedBySection).forEach(([section, requirements]) => {
      const sectionTotal = requirements.reduce((sum, r) => sum + r.weight, 0);
      
      technicalCriteria.push({
        id: `tech_${Date.now()}_${order}_${Math.random().toString(36).substr(2, 9)}`,
        section,
        criterionName: section,
        maxScore: sectionTotal, // Keep original weights, will normalize to 50 total
        order: order++
      });
    });

    // Initialize empty scores
    const technicalScores: CBATechnicalScore[] = bidders.map(bidder => ({
      bidderId: bidder.id,
      criterionScores: {},
      totalTechnicalScore: 0,
      technicalPercentage: 0,
      qualifiedForFinancial: false
    }));

    const financialScores: CBAFinancialScore[] = bidders.map(bidder => ({
      bidderId: bidder.id,
      offeredPrice: 0,
      financialScore: 0
    }));

    const finalScores: CBAFinalScore[] = bidders.map(bidder => ({
      bidderId: bidder.id,
      technicalScore: 0,
      financialScore: 0,
      totalScore: 0,
      rank: 0
    }));

    // Initialize approval signatures
    const approvalSignatures: CBAApprovalSignature[] = [
      { role: 'Evaluation Committee Member 1' },
      { role: 'Evaluation Committee Member 2' },
      { role: 'Evaluation Committee Member 3' },
      { role: 'Final Approval' }
    ];

    const cba: CompetitiveBidAnalysis = {
      id: `cba_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cbaNumber: this.generateCBANumber(),
      prId,
      prNumber,
      rfqTenderNumber,
      organizationId,
      organizationName,
      organizationLogo,
      operatingUnitId,
      operatingUnitName,
      country,
      cbaDate: new Date().toISOString().split('T')[0],
      currency,
      budgetLineId,
      budgetLineName,
      budgetAmount,
      bidders,
      technicalCriteria,
      technicalScores,
      technicalThresholdPercentage: 70, // Default 70%
      financialScores,
      finalScores,
      lowestBidAmount: 0,
      selectionJustification: '',
      approvalSignatures,
      status: 'draft',
      locked: false,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    this.save(cba);
    return cba;
  },

  /**
   * Save CBA
   */
  save(cba: CompetitiveBidAnalysis): void {
    const all = this.getAll();
    const index = all.findIndex(c => c.id === cba.id);
    
    if (index >= 0) {
      all[index] = cba;
    } else {
      all.push(cba);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  /**
   * Sync bidders from Evaluation Criteria
   * ✅ CRITICAL: Bidders auto-loaded, no manual re-entry
   */
  syncBiddersFromCriteria(prId: string, userId: string): CompetitiveBidAnalysis | null {
    const cba = this.getByPRId(prId);
    if (!cba || cba.locked) {
      return null;
    }

    const evalCriteria = bidEvaluationCriteriaService.getByPRId(prId);
    if (!evalCriteria) {
      return null;
    }

    // Update bidders
    cba.bidders = evalCriteria.bidders.map((b, index) => ({
      id: b.id,
      companyName: b.bidderName,
      addedFromCriteria: true,
      order: index + 1
    }));

    // Re-initialize scores if bidders changed
    cba.technicalScores = cba.bidders.map(bidder => {
      const existingScore = cba.technicalScores.find(s => s.bidderId === bidder.id);
      return existingScore || {
        bidderId: bidder.id,
        criterionScores: {},
        totalTechnicalScore: 0,
        technicalPercentage: 0,
        qualifiedForFinancial: false
      };
    });

    cba.financialScores = cba.bidders.map(bidder => {
      const existingScore = cba.financialScores.find(s => s.bidderId === bidder.id);
      return existingScore || {
        bidderId: bidder.id,
        offeredPrice: 0,
        financialScore: 0
      };
    });

    cba.finalScores = cba.bidders.map(bidder => {
      const existingScore = cba.finalScores.find(s => s.bidderId === bidder.id);
      return existingScore || {
        bidderId: bidder.id,
        technicalScore: 0,
        financialScore: 0,
        totalScore: 0,
        rank: 0
      };
    });

    cba.updatedAt = new Date().toISOString();
    cba.updatedBy = userId;

    this.save(cba);
    return cba;
  },

  /**
   * Update technical score for a bidder
   */
  updateTechnicalScore(
    cbaId: string,
    bidderId: string,
    criterionId: string,
    score: number,
    userId: string
  ): CompetitiveBidAnalysis | null {
    const cba = this.getById(cbaId);
    if (!cba || cba.locked) {
      return null;
    }

    const techScore = cba.technicalScores.find(s => s.bidderId === bidderId);
    if (!techScore) {
      return null;
    }

    const criterion = cba.technicalCriteria.find(c => c.id === criterionId);
    if (!criterion) {
      return null;
    }

    // Ensure score doesn't exceed max
    techScore.criterionScores[criterionId] = Math.min(score, criterion.maxScore);

    // Recalculate totals
    this.recalculateTechnicalScores(cba);
    this.recalculateFinalScores(cba);

    cba.updatedAt = new Date().toISOString();
    cba.updatedBy = userId;

    this.save(cba);
    return cba;
  },

  /**
   * Update financial score (offered price) for a bidder
   */
  updateFinancialPrice(
    cbaId: string,
    bidderId: string,
    offeredPrice: number,
    userId: string
  ): CompetitiveBidAnalysis | null {
    const cba = this.getById(cbaId);
    if (!cba || cba.locked) {
      return null;
    }

    const finScore = cba.financialScores.find(s => s.bidderId === bidderId);
    if (!finScore) {
      return null;
    }

    finScore.offeredPrice = offeredPrice;

    // Recalculate financial scores
    this.recalculateFinancialScores(cba);
    this.recalculateFinalScores(cba);

    cba.updatedAt = new Date().toISOString();
    cba.updatedBy = userId;

    this.save(cba);
    return cba;
  },

  /**
   * Recalculate technical scores
   * Only bidders with ≥70% technical qualify for financial evaluation
   */
  recalculateTechnicalScores(cba: CompetitiveBidAnalysis): void {
    const maxTechnical = 50; // Technical evaluation max is 50 points
    const totalCriteriaWeight = cba.technicalCriteria.reduce((sum, c) => sum + c.maxScore, 0);

    cba.technicalScores.forEach(techScore => {
      // Sum all criterion scores
      const rawTotal = Object.values(techScore.criterionScores).reduce((sum, s) => sum + s, 0);
      
      // Normalize to 50 points
      techScore.totalTechnicalScore = totalCriteriaWeight > 0 
        ? (rawTotal / totalCriteriaWeight) * maxTechnical 
        : 0;
      
      // Calculate percentage
      techScore.technicalPercentage = (techScore.totalTechnicalScore / maxTechnical) * 100;
      
      // Check if qualified for financial evaluation (≥70%)
      techScore.qualifiedForFinancial = techScore.technicalPercentage >= cba.technicalThresholdPercentage;
    });
  },

  /**
   * Recalculate financial scores
   * Lowest price gets 50 points, others proportional
   */
  recalculateFinancialScores(cba: CompetitiveBidAnalysis): void {
    const maxFinancial = 50; // Financial evaluation max is 50 points

    // Get qualified bidders only
    const qualifiedBidders = cba.technicalScores
      .filter(ts => ts.qualifiedForFinancial)
      .map(ts => ts.bidderId);

    // Get prices from qualified bidders
    const qualifiedPrices = cba.financialScores
      .filter(fs => qualifiedBidders.includes(fs.bidderId) && fs.offeredPrice > 0)
      .map(fs => fs.offeredPrice);

    if (qualifiedPrices.length === 0) {
      // No qualified prices, reset all financial scores
      cba.financialScores.forEach(fs => {
        fs.financialScore = 0;
      });
      cba.lowestBidAmount = 0;
      return;
    }

    const lowestPrice = Math.min(...qualifiedPrices);
    cba.lowestBidAmount = lowestPrice;

    // Calculate financial scores
    cba.financialScores.forEach(finScore => {
      // Only score qualified bidders
      if (!qualifiedBidders.includes(finScore.bidderId)) {
        finScore.financialScore = 0;
        return;
      }

      if (finScore.offeredPrice <= 0) {
        finScore.financialScore = 0;
        return;
      }

      // Lowest price gets 50, others proportional
      finScore.financialScore = (lowestPrice / finScore.offeredPrice) * maxFinancial;
    });
  },

  /**
   * Recalculate final scores
   * Total = Technical (50) + Financial (50) = 100
   */
  recalculateFinalScores(cba: CompetitiveBidAnalysis): void {
    cba.finalScores = cba.bidders.map(bidder => {
      const techScore = cba.technicalScores.find(s => s.bidderId === bidder.id);
      const finScore = cba.financialScores.find(s => s.bidderId === bidder.id);

      const technical = techScore?.totalTechnicalScore || 0;
      const financial = techScore?.qualifiedForFinancial ? (finScore?.financialScore || 0) : 0;

      return {
        bidderId: bidder.id,
        technicalScore: technical,
        financialScore: financial,
        totalScore: technical + financial,
        rank: 0 // Will be calculated below
      };
    });

    // Sort by total score descending and assign ranks
    cba.finalScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .forEach((score, index) => {
        score.rank = index + 1;
      });

    // Identify lowest bidder
    if (cba.financialScores.length > 0) {
      const validPrices = cba.financialScores.filter(fs => fs.offeredPrice > 0);
      if (validPrices.length > 0) {
        const lowest = validPrices.reduce((min, fs) => 
          fs.offeredPrice < min.offeredPrice ? fs : min
        );
        cba.lowestBidderId = lowest.bidderId;
      }
    }
  },

  /**
   * Select supplier
   * ✅ MANDATORY justification if selected ≠ lowest bidder
   */
  selectSupplier(
    cbaId: string,
    supplierId: string,
    supplierName: string,
    justification: string,
    userId: string
  ): CompetitiveBidAnalysis | null {
    const cba = this.getById(cbaId);
    if (!cba || cba.locked) {
      return null;
    }

    // Check if justification required
    if (cba.lowestBidderId && supplierId !== cba.lowestBidderId && !justification) {
      throw new Error('Justification is MANDATORY when selected supplier is not the lowest bidder');
    }

    cba.selectedSupplierId = supplierId;
    cba.selectedSupplierName = supplierName;
    cba.selectionJustification = justification;

    cba.updatedAt = new Date().toISOString();
    cba.updatedBy = userId;

    this.save(cba);
    return cba;
  },

  /**
   * Update approval signature
   */
  updateApprovalSignature(
    cbaId: string,
    role: string,
    name: string,
    date: string,
    userId: string
  ): CompetitiveBidAnalysis | null {
    const cba = this.getById(cbaId);
    if (!cba) {
      return null;
    }

    const signature = cba.approvalSignatures.find(s => s.role === role);
    if (signature) {
      signature.name = name;
      signature.date = date;
    }

    cba.updatedAt = new Date().toISOString();
    cba.updatedBy = userId;

    this.save(cba);
    return cba;
  },

  /**
   * Complete CBA
   */
  complete(cbaId: string, userId: string): CompetitiveBidAnalysis | null {
    const cba = this.getById(cbaId);
    if (!cba || cba.locked) {
      return null;
    }

    if (!cba.selectedSupplierId) {
      throw new Error('Must select a supplier before completing');
    }

    cba.status = 'completed';
    cba.updatedAt = new Date().toISOString();
    cba.updatedBy = userId;

    this.save(cba);
    return cba;
  },

  /**
   * Approve and lock CBA
   */
  approve(cbaId: string, userId: string): CompetitiveBidAnalysis | null {
    const cba = this.getById(cbaId);
    if (!cba || cba.status !== 'completed') {
      return null;
    }

    cba.status = 'approved';
    cba.locked = true;
    cba.updatedAt = new Date().toISOString();
    cba.updatedBy = userId;

    this.save(cba);
    return cba;
  },

  /**
   * Get bidder name by ID
   */
  getBidderName(cba: CompetitiveBidAnalysis, bidderId: string): string {
    const bidder = cba.bidders.find(b => b.id === bidderId);
    return bidder?.companyName || 'Unknown';
  },

  /**
   * Delete CBA (only if draft)
   */
  delete(cbaId: string): boolean {
    const cba = this.getById(cbaId);
    if (!cba || cba.status !== 'draft') {
      return false;
    }

    const all = this.getAll();
    const filtered = all.filter(c => c.id !== cbaId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
};
