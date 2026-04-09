// ============================================================================
// PROCUREMENT TEST DATA SERVICE
// Generates complete test data for all cost levels
// Integrated Management System (IMS)
// ============================================================================

import { procurementRequestService } from './procurementRequestService';
import { evaluationCriteriaService } from './evaluationCriteriaService';
import { vendorScoringService } from './vendorScoringService';
import { analysisFormService } from './analysisFormService';
import { procurementCostLevelService } from './procurementCostLevelService';
import { procurementWorkspaceService } from './procurementWorkspaceService';
import { purchaseOrderService } from './purchaseOrderService';
import { goodsReceiptService } from './goodsReceiptService';
import { deliveryNoteService } from './deliveryNoteService';
import { paymentInvoiceService } from './paymentInvoiceService';
import type { ProcurementRequest } from '@/app/types/logistics.types';

const TEST_DATA_INITIALIZED_KEY = 'procurement_test_data_initialized_v1';

export const procurementTestDataService = {
 
 /**
 * Initialize all test data for procurement
 */
 initializeTestData(userId: string = 'system', userName: string = 'System'): void {
 // Check if already initialized
 const initialized = localStorage.getItem(TEST_DATA_INITIALIZED_KEY);
 if (initialized === 'true') {
 console.log('[ProcurementTestData] Test data already initialized');
 return;
 }

 console.log('[ProcurementTestData] Initializing test data for all cost levels...');

 // Create test PRs for each cost level
 const testPRs = [
 this.createTestPR('low', 800, userId, userName), // Single Quotation
 this.createTestPR('mid', 3500, userId, userName), // Multiple Quotations
 this.createTestPR('high', 15000, userId, userName), // Extended Quotations
 this.createTestPR('tender', 50000, userId, userName) // Tender/CBA
 ];

 // Create complete evaluation and analysis for each
 testPRs.forEach(pr => {
 this.createCompleteEvaluation(pr, userId, userName);
 });

 // Mark as initialized
 localStorage.setItem(TEST_DATA_INITIALIZED_KEY, 'true');
 console.log('[ProcurementTestData] ✅ Test data initialization complete');
 },

 /**
 * Create test PR for specific cost level
 */
 createTestPR(
 level: 'low' | 'mid' | 'high' | 'tender',
 amount: number,
 userId: string,
 userName: string
 ): ProcurementRequest {
 const levelNames = {
 low: 'Single Quotation Test',
 mid: 'Multiple Quotations Test',
 high: 'Extended Quotations Test',
 tender: 'Tender/CBA Test'
 };

 const pr = procurementRequestService.createRequest(
 'org_001',
 'Organization Test',
 'ou_001',
 'Operating Unit Test',
 'project_001',
 'Test Project',
 userId,
 userName,
 'Test User Position'
 );

 // Update PR details
 procurementRequestService.updateRequest(pr.id, {
 description: `Test PR - ${levelNames[level]}`,
 requestingDepartment: 'Test Department',
 justification: `Test data for ${levelNames[level]} procurement process`,
 currency: 'USD',
 items: [
 {
 id: `item_${Date.now()}_1`,
 description: `Test Item for ${levelNames[level]}`,
 quantity: 1,
 unit: 'unit',
 estimatedUnitCost: amount,
 estimatedTotalCost: amount,
 unitPrice: amount
 }
 ],
 totalEstimatedCost: amount
 }, userId);

 // Approve the PR
 procurementRequestService.updateRequest(pr.id, {
 status: 'approved',
 approvedBy: userId,
 approvedByName: userName,
 approvedAt: new Date().toISOString()
 }, userId);

 return procurementRequestService.getRequestById(pr.id)!;
 },

 /**
 * Create complete evaluation workflow for a PR
 */
 createCompleteEvaluation(pr: ProcurementRequest, userId: string, userName: string): void {
 console.log(`[ProcurementTestData] Creating evaluation for PR ${pr.prNumber}...`);

 // 1. Initialize workspace
 procurementWorkspaceService.initializeWorkspace(pr, userId);

 // 2. Initialize evaluation criteria
 let criteria = evaluationCriteriaService.getCriteriaByPRId(pr.id);
 if (!criteria) {
 criteria = evaluationCriteriaService.initializeCriteria(
 pr.id,
 pr.prNumber,
 userId,
 'goods'
 );
 }

 // Finalize criteria
 evaluationCriteriaService.finalizeCriteria(pr.id, userId);

 // 3. Initialize vendor scoring
 let vendorEval = vendorScoringService.getEvaluationByPRId(pr.id);
 if (!vendorEval) {
 vendorEval = vendorScoringService.initializeEvaluation(
 pr.id,
 pr.prNumber,
 pr.organizationId,
 pr.operatingUnitId,
 userId
 );
 }

 // 4. Add vendors based on cost level
 const processInfo = procurementCostLevelService.determineProcurementProcess(pr.totalEstimatedCost);
 const vendorCount = processInfo.minQuotations;

 const vendorNames = [
 'Alpha Supplies Ltd.',
 'Beta Trading Co.',
 'Gamma International',
 'Delta Solutions',
 'Epsilon Enterprises'
 ];

 for (let i = 0; i < Math.min(vendorCount, vendorNames.length); i++) {
 vendorScoringService.addVendor(
 pr.id,
 vendorNames[i],
 userId,
 `Contact Person ${i + 1}`,
 `vendor${i + 1}@example.com`,
 `+1234567890${i}`
 );
 }

 // 5. Enter scores for all vendors
 vendorEval = vendorScoringService.getEvaluationByPRId(pr.id)!;
 const reloadedCriteria = evaluationCriteriaService.getCriteriaByPRId(pr.id)!;

 vendorEval.vendors.forEach((vendor, vendorIndex) => {
 reloadedCriteria.criteria.forEach(criterion => {
 // Generate realistic scores (vendor 0 gets highest scores)
 const baseScore = 70 + (vendorIndex === 0 ? 20 : Math.random() * 15);
 vendorScoringService.enterScore(
 pr.id,
 vendor.id,
 criterion.id,
 Math.min(100, baseScore),
 userId
 );
 });
 });

 // 6. Calculate totals
 vendorScoringService.calculateTotalScores(pr.id, reloadedCriteria.criteria);

 // 7. Select winner (first vendor)
 vendorEval = vendorScoringService.getEvaluationByPRId(pr.id)!;
 if (vendorEval.vendors.length > 0) {
 const ranking = vendorScoringService.getVendorRanking(pr.id);
 const winner = ranking[0];
 
 vendorScoringService.selectWinner(
 pr.id,
 winner.vendorId,
 `Selected based on highest combined score of ${winner.totalScore.toFixed(2)}`,
 userId
 );
 }

 // 8. Finalize vendor evaluation
 vendorScoringService.finalizeEvaluation(pr.id, userId);

 // 9. Create QA/BA form
 let analysis = analysisFormService.getAnalysisByPRId(pr.id);
 if (!analysis) {
 analysis = analysisFormService.createFromPR(
 pr.id,
 pr.prNumber,
 pr.description,
 pr.totalEstimatedCost,
 processInfo.processType,
 processInfo.requiresCBA,
 pr.organizationId,
 pr.operatingUnitId,
 pr.projectId,
 userId,
 userName
 );
 }

 // 10. Sync vendors to QA/BA
 vendorEval = vendorScoringService.getEvaluationByPRId(pr.id)!;
 analysisFormService.syncVendorsFromScoring(pr.id, vendorEval, userId);

 // 11. Add quotation amounts
 analysis = analysisFormService.getAnalysisByPRId(pr.id)!;
 analysis.vendors.forEach((vendor, index) => {
 const quotationAmount = pr.totalEstimatedCost * (0.95 + Math.random() * 0.15);
 analysisFormService.updateVendorQuotation(
 analysis.id,
 vendor.vendorId,
 {
 totalQuotedAmount: quotationAmount,
 quotationNumber: `Q${Date.now()}-${index + 1}`,
 quotationDate: new Date().toISOString().split('T')[0],
 deliveryDays: 15 + index * 5,
 paymentTerms: 'Net 30',
 warranty: '12 months',
 remarks: index === 0 ? 'Best technical and financial offer' : 'Competitive offer'
 },
 userId
 );
 });

 // 12. Complete analysis
 analysisFormService.completeAnalysis(analysis.id, userId, userName);

 // ========================================================================
 // PROCUREMENT FLOW: PO → GRN → Delivery → Payment (REAL DOCUMENTS)
 // ========================================================================

 // 13. Create REAL Purchase Order with items from PR + winner from QA/BA
 analysis = analysisFormService.getAnalysisByPRId(pr.id)!;
 const po = purchaseOrderService.createFromPRAndAnalysis(pr, analysis, userId, userName);
 console.log(`[ProcurementTestData] ✅ Created ${po.poNumber} with ${po.items.length} items - Total: ${po.currency} ${po.totalAmount}`);

 // 14. Create REAL GRN with items from PO (✅ ONLY FOR GOODS)
 const grn = goodsReceiptService.createFromPO(po, pr);
 if (grn) {
 console.log(`[ProcurementTestData] ✅ Created ${grn.grnNumber} with ${grn.items.length} items received`);
 } else {
 console.log(`[ProcurementTestData] ⚠️ GRN skipped - PR category is "${pr.category}" (not goods)`);
 }

 // 15. Create REAL Delivery Note with items from PO
 const delivery = deliveryNoteService.createDeliveryNote(po);
 console.log(`[ProcurementTestData] ✅ Created ${delivery.deliveryNumber} with ${delivery.items.length} items in transit`);

 // 16. Create REAL Invoice with THREE-WAY MATCHING (PO + GRN for goods, PO only for services)
 const invoice = grn 
 ? paymentInvoiceService.createFromPOAndGRN(po, grn)
 : paymentInvoiceService.createFromPOOnly(po);
 console.log(`[ProcurementTestData] ✅ Created ${invoice.invoiceNumber} with ${invoice.items.length} items - Total: ${invoice.currency} ${invoice.totalAmount}`);

 console.log(`[ProcurementTestData] ✅ Complete procurement workflow created for PR ${pr.prNumber}`);
 },

 /**
 * Reset test data (for development)
 */
 resetTestData(): void {
 localStorage.removeItem(TEST_DATA_INITIALIZED_KEY);
 console.log('[ProcurementTestData] Test data flag reset - will reinitialize on next load');
 },

 /**
 * Get all test PRs
 */
 getTestPRs(): ProcurementRequest[] {
 const all = procurementRequestService.getAllRequests();
 return all.filter(pr => 
 pr.description.includes('Test PR -') && 
 pr.status === 'approved'
 );
 }
};