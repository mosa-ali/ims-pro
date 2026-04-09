// ============================================================================
// PROCUREMENT COST LEVEL SERVICE
// Single source of truth for procurement process determination
// Integrated Management System (IMS)
// ============================================================================

const STORAGE_KEY = 'procurement_cost_levels_v1';

// ============================================================================
// TYPES
// ============================================================================

export type ProcurementProcessType = 
  | 'single_quotation'      // 0 - 1,000
  | 'multiple_quotations'   // 1,001 - 5,000
  | 'extended_quotations'   // 5,001 - 25,000
  | 'tender';               // > 25,000

export interface ProcurementCostLevel {
  id: string;
  minAmount: number;      // In USD (base currency)
  maxAmount: number | null; // null = unlimited
  processType: ProcurementProcessType;
  minQuotations: number;
  maxQuotations: number | null; // null = no max
  requiresCBA: boolean;   // true for tender
  description: string;
  active: boolean;
  order: number;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// DEFAULT COST LEVELS (INITIAL SETUP)
// ============================================================================

const DEFAULT_COST_LEVELS: Omit<ProcurementCostLevel, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    minAmount: 0,
    maxAmount: 1000,
    processType: 'single_quotation',
    minQuotations: 1,
    maxQuotations: 1,
    requiresCBA: false,
    description: 'Single Quotation (0 - 1,000 USD)',
    active: true,
    order: 1
  },
  {
    minAmount: 1001,
    maxAmount: 5000,
    processType: 'multiple_quotations',
    minQuotations: 3,
    maxQuotations: 3,
    requiresCBA: false,
    description: 'Multiple Quotations (1,001 - 5,000 USD)',
    active: true,
    order: 2
  },
  {
    minAmount: 5001,
    maxAmount: 25000,
    processType: 'extended_quotations',
    minQuotations: 3,
    maxQuotations: 5,
    requiresCBA: false,
    description: 'Extended Quotations (5,001 - 25,000 USD)',
    active: true,
    order: 3
  },
  {
    minAmount: 25001,
    maxAmount: null,
    processType: 'tender',
    minQuotations: 3,
    maxQuotations: null,
    requiresCBA: true,
    description: 'Formal Tender (> 25,000 USD)',
    active: true,
    order: 4
  }
];

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const procurementCostLevelService = {
  
  /**
   * Initialize default cost levels
   */
  initializeDefaults(): void {
    const existing = this.getAllLevels();
    if (existing.length === 0) {
      const now = new Date().toISOString();
      DEFAULT_COST_LEVELS.forEach(level => {
        const costLevel: ProcurementCostLevel = {
          ...level,
          id: `level_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now
        };
        this.saveLevel(costLevel);
      });
      console.log('[ProcurementCostLevel] ✅ Default cost levels initialized');
    }
  },

  /**
   * Determine procurement process from cost amount
   * This is the CRITICAL function used throughout the system
   */
  determineProcurementProcess(costUSD: number): {
    processType: ProcurementProcessType;
    minQuotations: number;
    maxQuotations: number | null;
    requiresCBA: boolean;
    level: ProcurementCostLevel | null;
  } {
    const levels = this.getActiveLevels();
    
    // Find matching level
    const matchedLevel = levels.find(level => {
      if (level.maxAmount === null) {
        return costUSD >= level.minAmount;
      }
      return costUSD >= level.minAmount && costUSD <= level.maxAmount;
    });

    if (matchedLevel) {
      return {
        processType: matchedLevel.processType,
        minQuotations: matchedLevel.minQuotations,
        maxQuotations: matchedLevel.maxQuotations,
        requiresCBA: matchedLevel.requiresCBA,
        level: matchedLevel
      };
    }

    // Fallback (should never happen with proper setup)
    return {
      processType: 'single_quotation',
      minQuotations: 1,
      maxQuotations: 1,
      requiresCBA: false,
      level: null
    };
  },

  /**
   * Get all cost levels
   */
  getAllLevels(): ProcurementCostLevel[] {
    const data = localStorage.getItem(STORAGE_KEY);
    const levels = data ? JSON.parse(data) : [];
    return levels.sort((a: ProcurementCostLevel, b: ProcurementCostLevel) => a.order - b.order);
  },

  /**
   * Get active cost levels only
   */
  getActiveLevels(): ProcurementCostLevel[] {
    return this.getAllLevels().filter(level => level.active);
  },

  /**
   * Get level by ID
   */
  getLevelById(levelId: string): ProcurementCostLevel | null {
    const all = this.getAllLevels();
    return all.find(l => l.id === levelId) || null;
  },

  /**
   * Save cost level
   */
  saveLevel(level: ProcurementCostLevel): void {
    const all = this.getAllLevels();
    const index = all.findIndex(l => l.id === level.id);

    if (index >= 0) {
      all[index] = level;
    } else {
      all.push(level);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  /**
   * Create new cost level
   */
  createLevel(
    minAmount: number,
    maxAmount: number | null,
    processType: ProcurementProcessType,
    minQuotations: number,
    maxQuotations: number | null,
    requiresCBA: boolean,
    description: string
  ): ProcurementCostLevel {
    const all = this.getAllLevels();
    const maxOrder = all.length > 0 ? Math.max(...all.map(l => l.order)) : 0;

    const level: ProcurementCostLevel = {
      id: `level_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      minAmount,
      maxAmount,
      processType,
      minQuotations,
      maxQuotations,
      requiresCBA,
      description,
      active: true,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveLevel(level);
    return level;
  },

  /**
   * Update cost level
   */
  updateLevel(levelId: string, updates: Partial<ProcurementCostLevel>): { success: boolean; error?: string } {
    const level = this.getLevelById(levelId);
    if (!level) {
      return { success: false, error: 'Cost level not found' };
    }

    Object.assign(level, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    this.saveLevel(level);
    return { success: true };
  },

  /**
   * Delete cost level
   */
  deleteLevel(levelId: string): { success: boolean; error?: string } {
    const all = this.getAllLevels();
    const filtered = all.filter(l => l.id !== levelId);

    if (all.length === filtered.length) {
      return { success: false, error: 'Cost level not found' };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  },

  /**
   * Validate cost levels (no gaps, no overlaps)
   */
  validateLevels(): { valid: boolean; errors: string[] } {
    const levels = this.getActiveLevels();
    const errors: string[] = [];

    // Check for gaps and overlaps
    for (let i = 0; i < levels.length - 1; i++) {
      const current = levels[i];
      const next = levels[i + 1];

      if (current.maxAmount === null) {
        errors.push(`Level ${current.description} has no max amount but is not the last level`);
      } else if (current.maxAmount + 1 !== next.minAmount) {
        errors.push(`Gap or overlap between ${current.description} and ${next.description}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

// Initialize on module load
procurementCostLevelService.initializeDefaults();
