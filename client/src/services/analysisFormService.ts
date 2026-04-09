// ============================================================================
// ANALYSIS FORM SERVICE (QA & BA)
// Integrated Management System (IMS)
// 100% SPECIFICATION COMPLIANT
// ============================================================================

import { procurementRequestService } from './procurementRequestService';
import { evaluationCriteriaService } from './evaluationCriteriaService';
import { rfqService } from './rfqService';
import { determineProcurementProcess } from '@/app/types/logistics.types';
import type { 
 QuotationAnalysis, 
 QuotationSupplierData, 
 QuotationSupplierItemPrice,
 ProcurementRequest,
 ProcurementProcessType
} from '@/app/types/logistics.types';

const QA_STORAGE_KEY = 'ims_quotation_analysis_v2';
const BA_STORAGE_KEY = 'ims_bid_analysis_v2';

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const analysisFormService = {
 
 /**
 * Initialize a new Analysis document
 */
 initialize(
 prId: string,
 prNumber: string,
 type: 'quotation' | 'bid',
 organizationId: string,
 organizationName: string,
 organizationLogo: string | undefined,
 operatingUnitId: string,
 operatingUnitName: string,
 country: string,
 currency: string,
 budgetLineId: string,
 budgetLineName: string,
 budgetAvailable: number,
 userId: string
 ): QuotationAnalysis {
 const analysisType = type === 'bid' ? 'BA' : 'QA';
 const analysis: QuotationAnalysis = {
 id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 qaNumber: this.generateAnalysisNumber(analysisType),
 prId,
 prNumber,
 organizationId,
 operatingUnitId,
 country,
 projectId: '', // Can be filled from PR if needed
 budgetLineId,
 estimatedBudget: 0, // Filled later
 currency,
 processType: type === 'bid' ? 'tender' : 'multiple_quotations',
 minQuotationsRequired: type === 'bid' ? 3 : 3,
 maxQuotationsAllowed: type === 'bid' ? null : 3,
 analysisDate: new Date().toISOString().split('T')[0],
 purchaseDescription: '',
 requestedBy: '',
 evaluationCriteria: [],
 supplierEvaluationScores: [],
 suppliers: [],
 lowestQuotedAmount: 0,
 selectedSupplierId: '',
 selectedSupplierName: '',
 selectionJustification: '',
 lowestBidderSelected: false,
 requiresJustification: false,
 status: 'draft',
 locked: false,
 createdAt: new Date().toISOString(),
 createdBy: userId,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 };
 
 this.saveAnalysis(analysis);
 return analysis;
 },

 /**
 * Update existing analysis
 */
 updateAnalysis(analysis: QuotationAnalysis): void {
 this.saveAnalysis(analysis);
 },

 /**
 * Generate QA/BA number
 */
 generateAnalysisNumber(type: 'QA' | 'BA'): string {
 const year = new Date().getFullYear();
 const data = localStorage.getItem(type === 'QA' ? QA_STORAGE_KEY : BA_STORAGE_KEY);
 const all: any[] = data ? JSON.parse(data) : [];
 const thisYear = all.filter(a => (a.qaNumber || a.baNumber || '').startsWith(`${type}-${year}`));
 const sequence = (thisYear.length + 1).toString().padStart(5, '0');
 return `${type}-${year}-${sequence}`;
 },

 /**
 * Auto-create QA/BA from Approved PR
 * CRITICAL: Called only when PR is approved and within specific cost levels
 */
 autoCreateFromPR(prId: string, userId: string): QuotationAnalysis | null {
 const pr = procurementRequestService.getRequestById(prId);
 if (!pr || pr.status !== 'approved') return null;

 // Check if already exists
 const existing = this.getAnalysisByPRId(prId);
 if (existing) return existing;

 const process = determineProcurementProcess(pr.totalEstimatedCost);
 const isBA = process.requiresCBA;
 const type = isBA ? 'BA' : 'QA';

 // 🔑 HARD LOCK: For Tenders, BA cannot be created before announcement closes
 if (isBA) {
 const announcement = localStorage.getItem('ims_tender_announcements_v1');
 const allAnnouncements = announcement ? JSON.parse(announcement) : [];
 const prAnn = allAnnouncements.find((a: any) => a.prId === prId);
 
 const today = new Date().toISOString().split('T')[0];
 if (!prAnn || !prAnn.endDate || today < prAnn.endDate) {
 console.log('🛡️ [Analysis Service] Blocked BA creation: Announcement period active.');
 return null;
 }
 }

 // 1️⃣ Header Data (Pull from PR)
 const analysis: QuotationAnalysis = {
 id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 qaNumber: this.generateAnalysisNumber(type),
 
 prId: pr.id,
 prNumber: pr.prNumber,
 
 organizationId: pr.organizationId,
 operatingUnitId: pr.operatingUnitId,
 country: pr.country,
 projectId: pr.projectId,
 budgetLineId: pr.budgetLineId,
 estimatedBudget: pr.totalEstimatedCost,
 currency: pr.currency,
 
 processType: process.processType,
 minQuotationsRequired: process.minQuotations,
 maxQuotationsAllowed: process.maxQuotations,
 
 analysisDate: new Date().toISOString().split('T')[0],
 purchaseDescription: pr.justification || '',
 requestedBy: pr.requestedByName,
 
 evaluationCriteria: [], 
 supplierEvaluationScores: [],
 suppliers: [],
 
 lowestQuotedAmount: 0,
 selectedSupplierId: '',
 selectedSupplierName: '',
 selectionJustification: '',
 lowestBidderSelected: false,
 requiresJustification: false,
 
 status: 'draft',
 locked: false,
 
 createdAt: new Date().toISOString(),
 createdBy: userId,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 };

 // 🔑 AUTO-LOAD BIDDERS FROM TENDER TAB (if BA)
 if (isBA) {
 const announcementData = localStorage.getItem('ims_tender_announcements_v1');
 const allAnnouncements = announcementData ? JSON.parse(announcementData) : [];
 const prAnn = allAnnouncements.find((a: any) => a.prId === prId);
 
 if (prAnn && prAnn.bidders) {
 analysis.suppliers = prAnn.bidders
 .filter((b: any) => b.status !== 'disqualified')
 .map((b: any) => ({
 supplierId: b.id,
 supplierName: b.name,
 itemPrices: pr.items.map(item => ({
 itemId: item.id,
 unitPrice: 0,
 totalPrice: 0
 })),
 subtotal: b.totalOfferCost, // Initial total from bid
 deliveryTime: 0,
 warranty: '',
 complianceNotes: '',
 score: 0
 }));
 }
 } else {
 // Try to pull suppliers from RFQ if it exists (for QA)
 const rfq = rfqService.getRFQByPRId(prId);
 if (rfq) {
 analysis.rfqId = rfq.id;
 analysis.rfqNumber = rfq.rfqNumber;
 
 analysis.suppliers = rfq.suppliers.map(s => ({
 supplierId: s.supplierId,
 supplierName: s.supplierName,
 itemPrices: pr.items.map(item => ({
 itemId: item.id,
 unitPrice: 0,
 totalPrice: 0
 })),
 subtotal: 0,
 deliveryTime: 0,
 warranty: '',
 complianceNotes: '',
 score: 0
 }));
 }
 }

 this.saveAnalysis(analysis);
 return analysis;
 },

 /**
 * Update Supplier Pricing
 * Formula: Item Total = Qty × Unit Price
 * Formula: Supplier Subtotal = Σ (Item Totals)
 */
 updateSupplierPrice(
 analysisId: string,
 supplierId: string,
 itemId: string,
 unitPrice: number
 ): void {
 const analysis = this.getAnalysisById(analysisId);
 if (!analysis || analysis.locked) return;

 const pr = procurementRequestService.getRequestById(analysis.prId);
 if (!pr) return;

 const supplier = analysis.suppliers.find(s => s.supplierId === supplierId);
 if (!supplier) return;

 const itemPrice = supplier.itemPrices.find(ip => ip.itemId === itemId);
 if (!itemPrice) return;

 const prItem = pr.items.find(i => i.id === itemId);
 if (!prItem) return;

 itemPrice.unitPrice = unitPrice;
 itemPrice.totalPrice = prItem.quantity * unitPrice;

 // Recalculate supplier subtotal
 supplier.subtotal = supplier.itemPrices.reduce((sum, ip) => sum + ip.totalPrice, 0);

 // Recalculate analysis global lowest amount
 analysis.lowestQuotedAmount = Math.min(
 ...analysis.suppliers
 .filter(s => s.subtotal > 0)
 .map(s => s.subtotal)
 );

 this.recalculateScores(analysis);
 this.saveAnalysis(analysis);
 },

 /**
 * Scoring Formula Implementation
 * Financial Score = (Lowest Price / Supplier Price) × Max Financial Weight
 * Total Score = Technical Score + Financial Score
 */
 recalculateScores(analysis: QuotationAnalysis): void {
 const criteriaSet = evaluationCriteriaService.getCriteriaByPRId(analysis.prId);
 if (!criteriaSet) return;

 const financialCriterion = criteriaSet.criteria.find(c => 
 c.criterionName.toLowerCase().includes('price') || 
 c.criterionName.toLowerCase().includes('financial')
 );
 const maxFinancialWeight = financialCriterion?.weight || 40;

 analysis.suppliers.forEach(supplier => {
 if (supplier.subtotal === 0) {
 supplier.score = 0;
 return;
 }

 // 1️⃣ Calculate Financial Score
 const financialScore = (analysis.lowestQuotedAmount / supplier.subtotal) * maxFinancialWeight;

 // 2️⃣ Calculate Technical Score (from criteria scores)
 // Note: In a real app, scores are entered in the evaluation tab
 // For this implementation, we'll assume technical score is stored in analysis.supplierEvaluationScores
 const evalScoreObj = analysis.supplierEvaluationScores?.find(s => s.supplierId === supplier.supplierId);
 
 let technicalScore = 0;
 if (evalScoreObj) {
 // Weighted technical criteria (excluding price)
 technicalScore = criteriaSet.criteria
 .filter(c => c.id !== financialCriterion?.id)
 .reduce((sum, c) => {
 const score = evalScoreObj.criterionScores[c.id] || 0;
 return sum + (score * c.weight / 100);
 }, 0);
 }

 supplier.score = technicalScore + financialScore;
 });

 // Ranking
 const sorted = [...analysis.suppliers].sort((a, b) => b.score - a.score);
 analysis.suppliers.forEach(s => {
 s.rank = sorted.findIndex(item => item.supplierId === s.supplierId) + 1;
 s.isBestValue = s.rank === 1 && s.score > 0;
 });
 },

 /**
 * Save Analysis
 */
 saveAnalysis(analysis: QuotationAnalysis): void {
 const isBA = determineProcurementProcess(analysis.estimatedBudget).requiresCBA;
 const storageKey = isBA ? BA_STORAGE_KEY : QA_STORAGE_KEY;
 const all = this.getAllAnalyses(isBA ? 'BA' : 'QA');
 const index = all.findIndex(a => a.id === analysis.id);

 if (index >= 0) {
 all[index] = analysis;
 } else {
 all.push(analysis);
 }

 localStorage.setItem(storageKey, JSON.stringify(all));
 },

 /**
 * Get All Analyses
 */
 getAllAnalyses(type: 'QA' | 'BA' = 'QA'): QuotationAnalysis[] {
 const storageKey = type === 'QA' ? QA_STORAGE_KEY : BA_STORAGE_KEY;
 const data = localStorage.getItem(storageKey);
 return data ? JSON.parse(data) : [];
 },

 /**
 * Get Analysis By ID
 */
 getAnalysisById(id: string): QuotationAnalysis | null {
 const allQA = this.getAllAnalyses('QA');
 const allBA = this.getAllAnalyses('BA');
 return allQA.find(a => a.id === id) || allBA.find(a => a.id === id) || null;
 },

 /**
 * Get Analysis By PR ID (Strictly isolated by PR Number)
 */
 getAnalysisByPRId(prId: string): QuotationAnalysis | null {
 // Try to find the PR first to get its number for authoritative linkage
 const pr = procurementRequestService.getRequestById(prId);
 const prNumber = pr ? pr.prNumber : prId;

 const allQA = this.getAllAnalyses('QA');
 const allBA = this.getAllAnalyses('BA');
 
 // Auth-linkage by PR Number as priority
 return allQA.find(a => a.prNumber === prNumber || a.prId === prId) || 
 allBA.find(a => a.prNumber === prNumber || a.prId === prId) || 
 null;
 },

 /**
 * Delete Analysis (Test/Dev only)
 */
 deleteAnalysis(id: string): void {
 const allQA = this.getAllAnalyses('QA');
 const allBA = this.getAllAnalyses('BA');
 
 localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(allQA.filter(a => a.id !== id)));
 localStorage.setItem(BA_STORAGE_KEY, JSON.stringify(allBA.filter(a => a.id !== id)));
 }
};
