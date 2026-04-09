// ============================================================================
// QUOTATION ANALYSIS (QA) SERVICE
// For non-tender procurement (0 - 25,000 USD)
// Auto-created when PR approved - Item-level pricing
// Light version of CBA with same evaluation logic
// Integrated Management System (IMS)
// ============================================================================

import type {
  QuotationAnalysis,
  QASupplier,
  QAItemPrice,
  QATechnicalScore,
  QAFinancialScore,
  QAFinalScore,
  ProcurementRequest,
  CBATechnicalCriterion
} from '@/app/types/logistics.types';
import { determineProcurementProcess } from '@/app/types/logistics.types';

const STORAGE_KEY = 'quotation_analysis_v1';
const SEQUENCE_KEY = 'qa_sequence_2026';

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const quotationAnalysisService = {
  
  /**
   * Get all QAs
   */
  getAll(): QuotationAnalysis[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Get QA by ID
   */
  getById(id: string): QuotationAnalysis | null {
    const all = this.getAll();
    return all.find(q => q.id === id) || null;
  },

  /**
   * Get QA by PR ID
   */
  getByPRId(prId: string): QuotationAnalysis | null {
    const all = this.getAll();
    return all.find(q => q.prId === prId) || null;
  },

  /**
   * Generate QA Number
   */
  generateQANumber(): string {
    const sequence = parseInt(localStorage.getItem(SEQUENCE_KEY) || '0', 10) + 1;
    localStorage.setItem(SEQUENCE_KEY, sequence.toString());
    return `QA-2026-${sequence.toString().padStart(5, '0')}`;
  },

  /**
   * ✅ AUTO-CREATE QA from approved PR (cost 0-25k)
   * CRITICAL: QA is NOT manually created - auto-created only
   */
  autoCreateFromPR(pr: ProcurementRequest, userId: string): QuotationAnalysis {
    // Check if already exists
    const existing = this.getByPRId(pr.id);
    if (existing) {
      return existing;
    }

    // Validate PR cost (must be 0-25k for QA)
    if (pr.totalEstimatedCost > 25000) {
      throw new Error('QA is only for procurement under USD 25,000. Use CBA for tenders.');
    }

    // Determine process type
    const processInfo = determineProcurementProcess(pr.totalEstimatedCost);
    if (processInfo.requiresCBA) {
      throw new Error('This PR requires CBA (Tender), not QA');
    }

    // Default technical criteria for QA (lighter than CBA)
    const defaultCriteria: CBATechnicalCriterion[] = [
      {
        id: `crit_${Date.now()}_1`,
        section: 'Legal & Administrative',
        criterionName: 'Legal & Administrative Compliance',
        maxScore: 20,
        order: 1
      },
      {
        id: `crit_${Date.now()}_2`,
        section: 'Technical Capacity',
        criterionName: 'Technical Capacity & Experience',
        maxScore: 30,
        order: 2
      },
      {
        id: `crit_${Date.now()}_3`,
        section: 'Operational',
        criterionName: 'Delivery Time & Operational Capacity',
        maxScore: 25,
        order: 3
      },
      {
        id: `crit_${Date.now()}_4`,
        section: 'References',
        criterionName: 'Past Performance & References',
        maxScore: 25,
        order: 4
      }
    ];

    const qa: QuotationAnalysis = {
      id: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      qaNumber: this.generateQANumber(),
      
      // PR Reference
      prId: pr.id,
      prNumber: pr.prNumber,
      prDate: pr.requestDate,
      
      // Header (from PR - READ ONLY)
      organizationId: pr.organizationId,
      organizationName: pr.organizationName,
      organizationLogo: pr.organizationLogo,
      operatingUnitId: pr.operatingUnitId,
      operatingUnitName: pr.operatingUnitName,
      projectName: pr.projectName,
      donorGrant: pr.donorName,
      budgetLineId: pr.budgetLineId,
      budgetLineName: pr.budgetLineName,
      currency: pr.currency,
      totalPRAmount: pr.totalEstimatedCost,
      processType: processInfo.processType as any,
      
      // Suppliers (empty initially - user adds)
      suppliers: [],
      
      // Item-level pricing (empty initially - populated after suppliers added)
      itemPrices: [],
      
      // Technical Evaluation
      technicalCriteria: defaultCriteria,
      technicalScores: [],
      
      // Financial Evaluation
      financialScores: [],
      financialWeight: 50, // Default 50 points for financial
      
      // Final Scores
      finalScores: [],
      
      // Decision
      lowestSupplierPrice: 0,
      selectionJustification: '',
      
      // Status
      status: 'draft',
      locked: false,
      
      // Metadata
      createdAt: new Date().toISOString(),
      createdBy: userId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    this.save(qa);
    return qa;
  },

  /**
   * Save QA
   */
  save(qa: QuotationAnalysis): void {
    const all = this.getAll();
    const index = all.findIndex(q => q.id === qa.id);
    
    if (index >= 0) {
      all[index] = qa;
    } else {
      all.push(qa);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  /**
   * Add supplier to QA
   */
  addSupplier(qaId: string, supplierName: string, userId: string): QuotationAnalysis | null {
    const qa = this.getById(qaId);
    if (!qa || qa.locked) {
      return null;
    }

    const newSupplier: QASupplier = {
      id: `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      supplierName: supplierName.trim(),
      order: qa.suppliers.length + 1
    };

    qa.suppliers.push(newSupplier);

    // Initialize scores for new supplier
    qa.technicalScores.push({
      supplierId: newSupplier.id,
      criterionScores: {},
      totalTechnicalScore: 0,
      technicalPercentage: 0
    });

    qa.financialScores.push({
      supplierId: newSupplier.id,
      totalOfferedPrice: 0,
      financialScore: 0
    });

    qa.finalScores.push({
      supplierId: newSupplier.id,
      technicalScore: 0,
      financialScore: 0,
      totalScore: 0,
      rank: 0
    });

    qa.updatedAt = new Date().toISOString();
    qa.updatedBy = userId;

    this.save(qa);
    return qa;
  },

  /**
   * Remove supplier
   */
  removeSupplier(qaId: string, supplierId: string, userId: string): QuotationAnalysis | null {
    const qa = this.getById(qaId);
    if (!qa || qa.locked) {
      return null;
    }

    // Remove supplier
    qa.suppliers = qa.suppliers.filter(s => s.id !== supplierId);

    // Remove all related prices
    qa.itemPrices = qa.itemPrices.filter(p => p.supplierId !== supplierId);

    // Remove scores
    qa.technicalScores = qa.technicalScores.filter(s => s.supplierId !== supplierId);
    qa.financialScores = qa.financialScores.filter(s => s.supplierId !== supplierId);
    qa.finalScores = qa.finalScores.filter(s => s.supplierId !== supplierId);

    qa.updatedAt = new Date().toISOString();
    qa.updatedBy = userId;

    this.save(qa);
    return qa;
  },

  /**
   * ✅ CRITICAL: Update item unit price (NOT lump sum)
   * Formula: Item Total = Qty × Unit Price
   */
  updateItemPrice(
    qaId: string,
    itemId: string,
    supplierId: string,
    unitPrice: number,
    itemQty: number,
    userId: string
  ): QuotationAnalysis | null {
    const qa = this.getById(qaId);
    if (!qa || qa.locked) {
      return null;
    }

    // Find existing price entry
    const existingIndex = qa.itemPrices.findIndex(
      p => p.itemId === itemId && p.supplierId === supplierId
    );

    // Calculate item total
    const itemTotal = unitPrice * itemQty;

    const priceEntry: QAItemPrice = {
      itemId,
      supplierId,
      unitPrice,
      itemTotal
    };

    if (existingIndex >= 0) {
      qa.itemPrices[existingIndex] = priceEntry;
    } else {
      qa.itemPrices.push(priceEntry);
    }

    // Recalculate financial scores
    this.recalculateFinancialScores(qa);
    this.recalculateFinalScores(qa);

    qa.updatedAt = new Date().toISOString();
    qa.updatedBy = userId;

    this.save(qa);
    return qa;
  },

  /**
   * Get unit price for specific item and supplier
   */
  getItemPrice(qa: QuotationAnalysis, itemId: string, supplierId: string): QAItemPrice | null {
    return qa.itemPrices.find(
      p => p.itemId === itemId && p.supplierId === supplierId
    ) || null;
  },

  /**
   * Update technical score
   */
  updateTechnicalScore(
    qaId: string,
    supplierId: string,
    criterionId: string,
    score: number,
    userId: string
  ): QuotationAnalysis | null {
    const qa = this.getById(qaId);
    if (!qa || qa.locked) {
      return null;
    }

    const techScore = qa.technicalScores.find(s => s.supplierId === supplierId);
    if (!techScore) {
      return null;
    }

    const criterion = qa.technicalCriteria.find(c => c.id === criterionId);
    if (!criterion) {
      return null;
    }

    // Ensure score doesn't exceed max
    techScore.criterionScores[criterionId] = Math.min(score, criterion.maxScore);

    // Recalculate totals
    this.recalculateTechnicalScores(qa);
    this.recalculateFinalScores(qa);

    qa.updatedAt = new Date().toISOString();
    qa.updatedBy = userId;

    this.save(qa);
    return qa;
  },

  /**
   * ✅ Recalculate technical scores (weighted sum)
   */
  recalculateTechnicalScores(qa: QuotationAnalysis): void {
    const maxTechnical = qa.technicalCriteria.reduce((sum, c) => sum + c.maxScore, 0);

    qa.technicalScores.forEach(techScore => {
      // Sum all criterion scores
      const rawTotal = Object.values(techScore.criterionScores).reduce((sum, s) => sum + s, 0);
      
      techScore.totalTechnicalScore = rawTotal;
      techScore.technicalPercentage = maxTechnical > 0 ? (rawTotal / maxTechnical) * 100 : 0;
    });
  },

  /**
   * ✅ Recalculate financial scores
   * Formula: Supplier Total = Σ(Item Totals)
   * Lowest price gets max financial points, others proportional
   */
  recalculateFinancialScores(qa: QuotationAnalysis): void {
    qa.financialScores.forEach(finScore => {
      // Calculate total offered price from item-level prices
      const supplierItemPrices = qa.itemPrices.filter(p => p.supplierId === finScore.supplierId);
      finScore.totalOfferedPrice = supplierItemPrices.reduce((sum, p) => sum + p.itemTotal, 0);
    });

    // Get lowest price
    const validPrices = qa.financialScores
      .filter(fs => fs.totalOfferedPrice > 0)
      .map(fs => fs.totalOfferedPrice);

    if (validPrices.length === 0) {
      qa.financialScores.forEach(fs => {
        fs.financialScore = 0;
      });
      qa.lowestSupplierPrice = 0;
      return;
    }

    const lowestPrice = Math.min(...validPrices);
    qa.lowestSupplierPrice = lowestPrice;

    // Find lowest supplier
    const lowestSupplier = qa.financialScores.find(fs => fs.totalOfferedPrice === lowestPrice);
    if (lowestSupplier) {
      qa.lowestSupplierId = lowestSupplier.supplierId;
    }

    // Calculate financial scores
    qa.financialScores.forEach(finScore => {
      if (finScore.totalOfferedPrice <= 0) {
        finScore.financialScore = 0;
        return;
      }

      // Lowest price gets max financial weight, others proportional
      finScore.financialScore = (lowestPrice / finScore.totalOfferedPrice) * qa.financialWeight;
    });
  },

  /**
   * ✅ Recalculate final scores
   * Total = Technical + Financial
   */
  recalculateFinalScores(qa: QuotationAnalysis): void {
    qa.finalScores = qa.suppliers.map(supplier => {
      const techScore = qa.technicalScores.find(s => s.supplierId === supplier.id);
      const finScore = qa.financialScores.find(s => s.supplierId === supplier.id);

      const technical = techScore?.totalTechnicalScore || 0;
      const financial = finScore?.financialScore || 0;

      return {
        supplierId: supplier.id,
        technicalScore: technical,
        financialScore: financial,
        totalScore: technical + financial,
        rank: 0 // Will be calculated below
      };
    });

    // Sort by total score descending and assign ranks
    qa.finalScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .forEach((score, index) => {
        score.rank = index + 1;
      });
  },

  /**
   * Select supplier
   */
  selectSupplier(
    qaId: string,
    supplierId: string,
    supplierName: string,
    justification: string,
    userId: string
  ): QuotationAnalysis | null {
    const qa = this.getById(qaId);
    if (!qa || qa.locked) {
      return null;
    }

    // Check if justification required (selected ≠ lowest)
    if (qa.lowestSupplierId && supplierId !== qa.lowestSupplierId && !justification) {
      throw new Error('Justification is MANDATORY when selected supplier is not the lowest bidder');
    }

    qa.selectedSupplierId = supplierId;
    qa.selectedSupplierName = supplierName;
    qa.selectionJustification = justification;

    qa.updatedAt = new Date().toISOString();
    qa.updatedBy = userId;

    this.save(qa);
    return qa;
  },

  /**
   * Submit QA for approval
   */
  submit(qaId: string, userId: string): QuotationAnalysis | null {
    const qa = this.getById(qaId);
    if (!qa || qa.status !== 'draft') {
      return null;
    }

    // Validate before submission
    const processInfo = determineProcurementProcess(qa.totalPRAmount);
    
    // Check minimum suppliers
    if (qa.suppliers.length < processInfo.minQuotations) {
      throw new Error(`Minimum ${processInfo.minQuotations} suppliers required for this process type`);
    }

    // Check all items have prices
    const prItemCount = qa.itemPrices.length / qa.suppliers.length;
    for (const supplier of qa.suppliers) {
      const supplierPrices = qa.itemPrices.filter(p => p.supplierId === supplier.id);
      if (supplierPrices.length === 0) {
        throw new Error(`Missing prices for supplier: ${supplier.supplierName}`);
      }
      const hasZeroPrice = supplierPrices.some(p => p.unitPrice === 0);
      if (hasZeroPrice) {
        throw new Error(`Zero prices not allowed for supplier: ${supplier.supplierName}`);
      }
    }

    // Check supplier selected
    if (!qa.selectedSupplierId) {
      throw new Error('Please select a supplier before submitting');
    }

    qa.status = 'submitted';
    qa.updatedAt = new Date().toISOString();
    qa.updatedBy = userId;

    this.save(qa);
    return qa;
  },

  /**
   * Approve QA
   */
  approve(qaId: string, userId: string): QuotationAnalysis | null {
    const qa = this.getById(qaId);
    if (!qa || qa.status !== 'submitted') {
      return null;
    }

    qa.status = 'approved';
    qa.locked = true;
    qa.updatedAt = new Date().toISOString();
    qa.updatedBy = userId;

    this.save(qa);
    return qa;
  },

  /**
   * Get supplier name by ID
   */
  getSupplierName(qa: QuotationAnalysis, supplierId: string): string {
    const supplier = qa.suppliers.find(s => s.id === supplierId);
    return supplier?.supplierName || 'Unknown';
  },

  /**
   * Delete QA (only if draft)
   */
  delete(qaId: string): boolean {
    const qa = this.getById(qaId);
    if (!qa || qa.status !== 'draft') {
      return false;
    }

    const all = this.getAll();
    const filtered = all.filter(q => q.id !== qaId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
};
