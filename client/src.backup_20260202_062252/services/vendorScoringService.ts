// ============================================================================
// VENDOR SCORING SERVICE
// Excel-style vendor evaluation with dynamic bidder columns
// Single source of truth for scoring in QA/BA/CBA
// Integrated Management System (IMS)
// ============================================================================

const STORAGE_KEY = 'vendor_scoring_v1';

// ============================================================================
// TYPES
// ============================================================================

export interface VendorScore {
  vendorId: string;
  vendorName: string;
  criterionId: string;
  score: number; // Raw score (0-100 typically)
  weightedScore?: number; // Calculated: score * (weight/100)
}

export interface VendorEvaluation {
  id: string;
  prId: string;
  prNumber: string;
  
  // Vendors/Bidders (dynamic columns)
  vendors: Array<{
    id: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    order: number;
  }>;
  
  // Scores matrix: criterionId -> vendorId -> score
  scores: VendorScore[];
  
  // Calculated totals per vendor
  totalScores: Record<string, number>; // vendorId -> total weighted score
  
  // Winner selection
  selectedVendorId?: string;
  selectedVendorName?: string;
  selectionReason?: string;
  
  // Status
  status: 'draft' | 'in_progress' | 'completed' | 'finalized';
  
  // Lock after evaluation starts
  locked: boolean;
  
  organizationId: string;
  operatingUnitId: string;
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const vendorScoringService = {
  
  /**
   * Initialize vendor evaluation for a PR
   */
  initializeEvaluation(
    prId: string,
    prNumber: string,
    organizationId: string,
    operatingUnitId: string,
    userId: string
  ): VendorEvaluation {
    // Check if already exists
    const existing = this.getEvaluationByPRId(prId);
    if (existing) {
      return existing;
    }

    const evaluation: VendorEvaluation = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prId,
      prNumber,
      vendors: [],
      scores: [],
      totalScores: {},
      status: 'draft',
      locked: false,
      organizationId,
      operatingUnitId,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    this.saveEvaluation(evaluation);
    return evaluation;
  },

  /**
   * Add vendor/bidder (creates new column)
   */
  addVendor(
    prId: string,
    vendorName: string,
    userId: string,
    contactPerson?: string,
    email?: string,
    phone?: string
  ): { success: boolean; error?: string } {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    if (evaluation.locked) {
      return { success: false, error: 'Evaluation is locked' };
    }

    // Check for duplicate
    if (evaluation.vendors.some(v => v.name.toLowerCase() === vendorName.toLowerCase())) {
      return { success: false, error: 'Vendor already exists' };
    }

    const vendor = {
      id: `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: vendorName,
      contactPerson,
      email,
      phone,
      order: evaluation.vendors.length + 1
    };

    evaluation.vendors.push(vendor);
    evaluation.updatedAt = new Date().toISOString();
    evaluation.updatedBy = userId;

    this.saveEvaluation(evaluation);
    return { success: true };
  },

  /**
   * Remove vendor/bidder
   */
  removeVendor(prId: string, vendorId: string, userId: string): { success: boolean; error?: string } {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    if (evaluation.locked) {
      return { success: false, error: 'Evaluation is locked' };
    }

    evaluation.vendors = evaluation.vendors.filter(v => v.id !== vendorId);
    evaluation.scores = evaluation.scores.filter(s => s.vendorId !== vendorId);
    delete evaluation.totalScores[vendorId];
    
    evaluation.updatedAt = new Date().toISOString();
    evaluation.updatedBy = userId;

    this.saveEvaluation(evaluation);
    return { success: true };
  },

  /**
   * Enter score for vendor on specific criterion
   */
  enterScore(
    prId: string,
    vendorId: string,
    criterionId: string,
    score: number,
    userId: string
  ): { success: boolean; error?: string } {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    // Validate score range
    if (score < 0 || score > 100) {
      return { success: false, error: 'Score must be between 0 and 100' };
    }

    // Find or create score entry
    let scoreEntry = evaluation.scores.find(
      s => s.vendorId === vendorId && s.criterionId === criterionId
    );

    const vendor = evaluation.vendors.find(v => v.id === vendorId);
    if (!vendor) {
      return { success: false, error: 'Vendor not found' };
    }

    if (scoreEntry) {
      scoreEntry.score = score;
    } else {
      scoreEntry = {
        vendorId,
        vendorName: vendor.name,
        criterionId,
        score
      };
      evaluation.scores.push(scoreEntry);
    }

    evaluation.updatedAt = new Date().toISOString();
    evaluation.updatedBy = userId;
    evaluation.status = 'in_progress';

    this.saveEvaluation(evaluation);
    return { success: true };
  },

  /**
   * Calculate total scores for all vendors
   * Uses criteria weights from evaluationCriteriaService
   */
  calculateTotalScores(prId: string, criteria: any[]): { success: boolean; error?: string } {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    // Reset totals
    evaluation.totalScores = {};

    // Calculate for each vendor
    evaluation.vendors.forEach(vendor => {
      let totalWeightedScore = 0;

      criteria.forEach(criterion => {
        const scoreEntry = evaluation.scores.find(
          s => s.vendorId === vendor.id && s.criterionId === criterion.id
        );

        if (scoreEntry) {
          const weightedScore = (scoreEntry.score * criterion.weight) / 100;
          scoreEntry.weightedScore = weightedScore;
          totalWeightedScore += weightedScore;
        }
      });

      evaluation.totalScores[vendor.id] = totalWeightedScore;
    });

    evaluation.updatedAt = new Date().toISOString();
    this.saveEvaluation(evaluation);
    return { success: true };
  },

  /**
   * Select winning vendor
   */
  selectWinner(
    prId: string,
    vendorId: string,
    reason: string,
    userId: string
  ): { success: boolean; error?: string } {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    const vendor = evaluation.vendors.find(v => v.id === vendorId);
    if (!vendor) {
      return { success: false, error: 'Vendor not found' };
    }

    evaluation.selectedVendorId = vendorId;
    evaluation.selectedVendorName = vendor.name;
    evaluation.selectionReason = reason;
    evaluation.status = 'completed';
    evaluation.updatedAt = new Date().toISOString();
    evaluation.updatedBy = userId;

    this.saveEvaluation(evaluation);
    return { success: true };
  },

  /**
   * Lock evaluation (after evaluation starts, no changes to structure)
   */
  lockEvaluation(prId: string, userId: string): { success: boolean; error?: string } {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    if (evaluation.vendors.length === 0) {
      return { success: false, error: 'At least one vendor is required' };
    }

    evaluation.locked = true;
    evaluation.updatedAt = new Date().toISOString();
    evaluation.updatedBy = userId;

    this.saveEvaluation(evaluation);
    return { success: true };
  },

  /**
   * Finalize evaluation (ready for QA/BA form)
   */
  finalizeEvaluation(prId: string, userId: string): { success: boolean; error?: string } {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) {
      return { success: false, error: 'Evaluation not found' };
    }

    if (!evaluation.selectedVendorId) {
      return { success: false, error: 'Winner must be selected before finalizing' };
    }

    evaluation.status = 'finalized';
    evaluation.locked = true;
    evaluation.updatedAt = new Date().toISOString();
    evaluation.updatedBy = userId;

    this.saveEvaluation(evaluation);
    return { success: true };
  },

  /**
   * Get evaluation by PR ID
   */
  getEvaluationByPRId(prId: string): VendorEvaluation | null {
    const all = this.getAllEvaluations();
    return all.find(e => e.prId === prId) || null;
  },

  /**
   * Get all evaluations
   */
  getAllEvaluations(): VendorEvaluation[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Save evaluation
   */
  saveEvaluation(evaluation: VendorEvaluation): void {
    const all = this.getAllEvaluations();
    const index = all.findIndex(e => e.id === evaluation.id);

    if (index >= 0) {
      all[index] = evaluation;
    } else {
      all.push(evaluation);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  /**
   * Get vendor ranking (highest score first)
   */
  getVendorRanking(prId: string): Array<{
    vendorId: string;
    vendorName: string;
    totalScore: number;
    rank: number;
  }> {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) return [];

    const ranking = evaluation.vendors.map(vendor => ({
      vendorId: vendor.id,
      vendorName: vendor.name,
      totalScore: evaluation.totalScores[vendor.id] || 0,
      rank: 0
    }));

    // Sort by total score descending
    ranking.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks
    ranking.forEach((item, index) => {
      item.rank = index + 1;
    });

    return ranking;
  },

  /**
   * Export evaluation to CSV
   */
  exportToCSV(prId: string, criteria: any[]): Blob {
    const evaluation = this.getEvaluationByPRId(prId);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    // Header row
    const headers = ['Criterion', 'Weight (%)'];
    evaluation.vendors.forEach(v => headers.push(v.name));
    headers.push('');

    // Data rows
    const rows: string[][] = [headers];

    criteria.forEach(criterion => {
      const row = [criterion.criterionName, criterion.weight.toString()];
      
      evaluation.vendors.forEach(vendor => {
        const score = evaluation.scores.find(
          s => s.vendorId === vendor.id && s.criterionId === criterion.id
        );
        row.push(score ? score.score.toString() : '0');
      });
      
      rows.push(row);
    });

    // Total row
    const totalRow = ['TOTAL SCORE', '100'];
    evaluation.vendors.forEach(vendor => {
      totalRow.push((evaluation.totalScores[vendor.id] || 0).toFixed(2));
    });
    rows.push(totalRow);

    // Convert to CSV
    const csvContent = rows.map(row => row.join(',')).join('\n');
    return new Blob([csvContent], { type: 'text/csv' });
  }
};
