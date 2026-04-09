// ============================================================================
// EVALUATION CRITERIA SERVICE
// Single source of truth for procurement evaluation scoring
// Integrated Management System (IMS)
// ============================================================================

const STORAGE_KEY = 'evaluation_criteria_v1';

// ============================================================================
// TYPES
// ============================================================================

export interface EvaluationCriterion {
  id: string;
  prId: string;
  criterionName: string;
  description?: string;
  weight: number; // Percentage (total must = 100%)
  scoringGuidance?: string;
  order: number;
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface EvaluationCriteriaSet {
  id: string;
  prId: string;
  prNumber: string;
  criteria: EvaluationCriterion[];
  totalWeight: number;
  status: 'draft' | 'finalized';
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// DEFAULT CRITERIA TEMPLATES
// ============================================================================

const DEFAULT_CRITERIA_TEMPLATES = {
  goods: [
    { name: 'Price', weight: 40, description: 'Total cost competitiveness' },
    { name: 'Quality', weight: 25, description: 'Product quality and specifications' },
    { name: 'Delivery Time', weight: 15, description: 'Delivery schedule compliance' },
    { name: 'Warranty & Support', weight: 10, description: 'After-sales service' },
    { name: 'Vendor Reputation', weight: 10, description: 'Track record and references' }
  ],
  services: [
    { name: 'Technical Competence', weight: 35, description: 'Expertise and qualifications' },
    { name: 'Price', weight: 30, description: 'Cost competitiveness' },
    { name: 'Methodology', weight: 20, description: 'Approach and work plan' },
    { name: 'Experience', weight: 10, description: 'Past performance' },
    { name: 'Timeline', weight: 5, description: 'Delivery schedule' }
  ]
};

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const evaluationCriteriaService = {
  
  /**
   * Initialize criteria set for a PR
   */
  initializeCriteria(
    prId: string,
    prNumber: string,
    userId: string,
    template: 'goods' | 'services' = 'goods'
  ): EvaluationCriteriaSet {
    // Check if already exists
    const existing = this.getCriteriaByPRId(prId);
    if (existing) {
      return existing;
    }

    const templateData = DEFAULT_CRITERIA_TEMPLATES[template];
    const criteria: EvaluationCriterion[] = templateData.map((t, index) => ({
      id: `crit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prId,
      criterionName: t.name,
      description: t.description,
      weight: t.weight,
      scoringGuidance: '',
      order: index + 1,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    }));

    const set: EvaluationCriteriaSet = {
      id: `critset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prId,
      prNumber,
      criteria,
      totalWeight: 100,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    this.saveCriteriaSet(set);
    return set;
  },

  /**
   * Add new criterion
   */
  addCriterion(
    prId: string,
    criterionName: string,
    weight: number,
    userId: string,
    description?: string
  ): { success: boolean; error?: string } {
    const set = this.getCriteriaByPRId(prId);
    if (!set) {
      return { success: false, error: 'Criteria set not found' };
    }

    if (set.status === 'finalized') {
      return { success: false, error: 'Cannot modify finalized criteria' };
    }

    // Check if total weight would exceed 100
    const currentTotal = set.criteria.reduce((sum, c) => sum + c.weight, 0);
    if (currentTotal + weight > 100) {
      return { success: false, error: 'Total weight cannot exceed 100%' };
    }

    const newCriterion: EvaluationCriterion = {
      id: `crit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prId,
      criterionName,
      description,
      weight,
      scoringGuidance: '',
      order: set.criteria.length + 1,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    set.criteria.push(newCriterion);
    set.totalWeight = set.criteria.reduce((sum, c) => sum + c.weight, 0);
    set.updatedAt = new Date().toISOString();
    set.updatedBy = userId;

    this.saveCriteriaSet(set);
    return { success: true };
  },

  /**
   * Update criterion
   */
  updateCriterion(
    prId: string,
    criterionId: string,
    updates: Partial<EvaluationCriterion>,
    userId: string
  ): { success: boolean; error?: string } {
    const set = this.getCriteriaByPRId(prId);
    if (!set) {
      return { success: false, error: 'Criteria set not found' };
    }

    if (set.status === 'finalized') {
      return { success: false, error: 'Cannot modify finalized criteria' };
    }

    const criterion = set.criteria.find(c => c.id === criterionId);
    if (!criterion) {
      return { success: false, error: 'Criterion not found' };
    }

    // If weight is being updated, check total
    if (updates.weight !== undefined) {
      const otherWeights = set.criteria
        .filter(c => c.id !== criterionId)
        .reduce((sum, c) => sum + c.weight, 0);
      
      if (otherWeights + updates.weight > 100) {
        return { success: false, error: 'Total weight cannot exceed 100%' };
      }
    }

    Object.assign(criterion, {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    });

    set.totalWeight = set.criteria.reduce((sum, c) => sum + c.weight, 0);
    set.updatedAt = new Date().toISOString();
    set.updatedBy = userId;

    this.saveCriteriaSet(set);
    return { success: true };
  },

  /**
   * Delete criterion
   */
  deleteCriterion(prId: string, criterionId: string): { success: boolean; error?: string } {
    const set = this.getCriteriaByPRId(prId);
    if (!set) {
      return { success: false, error: 'Criteria set not found' };
    }

    if (set.status === 'finalized') {
      return { success: false, error: 'Cannot modify finalized criteria' };
    }

    set.criteria = set.criteria.filter(c => c.id !== criterionId);
    set.totalWeight = set.criteria.reduce((sum, c) => sum + c.weight, 0);
    set.updatedAt = new Date().toISOString();

    this.saveCriteriaSet(set);
    return { success: true };
  },

  /**
   * Finalize criteria (lock for use in analysis)
   */
  finalizeCriteria(prId: string, userId: string): { success: boolean; error?: string } {
    const set = this.getCriteriaByPRId(prId);
    if (!set) {
      return { success: false, error: 'Criteria set not found' };
    }

    if (set.totalWeight !== 100) {
      return { success: false, error: 'Total weight must equal 100% before finalizing' };
    }

    if (set.criteria.length === 0) {
      return { success: false, error: 'At least one criterion is required' };
    }

    set.status = 'finalized';
    set.updatedAt = new Date().toISOString();
    set.updatedBy = userId;

    this.saveCriteriaSet(set);
    return { success: true };
  },

  /**
   * Get criteria by PR ID
   */
  getCriteriaByPRId(prId: string): EvaluationCriteriaSet | null {
    const all = this.getAllCriteria();
    return all.find(s => s.prId === prId) || null;
  },

  /**
   * Get all criteria sets
   */
  getAllCriteria(): EvaluationCriteriaSet[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Save criteria set
   */
  saveCriteriaSet(set: EvaluationCriteriaSet): void {
    const all = this.getAllCriteria();
    const index = all.findIndex(s => s.id === set.id);

    if (index >= 0) {
      all[index] = set;
    } else {
      all.push(set);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  /**
   * Export to Excel template
   */
  exportToExcel(prId: string): Blob {
    const set = this.getCriteriaByPRId(prId);
    if (!set) {
      throw new Error('Criteria set not found');
    }

    const csvContent = [
      ['Criterion Name', 'Weight (%)', 'Description', 'Scoring Guidance'].join(','),
      ...set.criteria.map(c => [
        c.criterionName,
        c.weight,
        c.description || '',
        c.scoringGuidance || ''
      ].join(','))
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  },

  /**
   * Import from Excel
   */
  importFromExcel(
    prId: string,
    fileContent: string,
    userId: string
  ): { success: boolean; error?: string; imported?: number } {
    const set = this.getCriteriaByPRId(prId);
    if (!set) {
      return { success: false, error: 'Criteria set not found' };
    }

    if (set.status === 'finalized') {
      return { success: false, error: 'Cannot import to finalized criteria' };
    }

    try {
      const lines = fileContent.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',');
      
      const imported: EvaluationCriterion[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= 2) {
          const criterion: EvaluationCriterion = {
            id: `crit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            prId,
            criterionName: values[0].trim(),
            weight: parseFloat(values[1]) || 0,
            description: values[2]?.trim() || '',
            scoringGuidance: values[3]?.trim() || '',
            order: i,
            createdAt: new Date().toISOString(),
            createdBy: userId,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
          };
          imported.push(criterion);
        }
      }

      // Validate total weight
      const totalWeight = imported.reduce((sum, c) => sum + c.weight, 0);
      if (totalWeight > 100) {
        return { success: false, error: 'Total weight exceeds 100%' };
      }

      set.criteria = imported;
      set.totalWeight = totalWeight;
      set.updatedAt = new Date().toISOString();
      set.updatedBy = userId;

      this.saveCriteriaSet(set);
      return { success: true, imported: imported.length };
    } catch (error) {
      return { success: false, error: 'Failed to parse Excel file' };
    }
  }
};
