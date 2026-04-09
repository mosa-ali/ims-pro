// ============================================================================
// PROCUREMENT WORKFLOW ENGINE
// Event-driven auto-creation of downstream documents
// ============================================================================

import { ProcurementRequest } from '@/app/types/logistics.types';

/**
 * CRITICAL: EVENT-DRIVEN WORKFLOW ENGINE
 * 
 * This is NOT a UI component - it's a backend service that runs automatically
 * when PR status changes to 'approved'.
 * 
 * ✅ CORRECT ERP BEHAVIOR:
 * - When PR.status changes to 'approved' → Auto-create RFQ immediately
 * - No clicks, no cards, no "Next" button needed
 * - RFQ creation is bound to PR approval event, not user action
 * 
 * 🔒 WORKFLOW DECISION ENGINE:
 * Based on PR total amount, determine process type:
 * - $0 - $1,000: Single Quote (1 supplier)
 * - $1,001 - $5,000: Multiple Quotes (3 suppliers)
 * - $5,001 - $25,000: Extended RFQ (5+ suppliers)
 * - $25,000+: Formal Tender
 */

export type ProcessType = 
 | 'single_quote' // <= $1,000
 | 'multiple_quotes' // $1,001 - $5,000
 | 'extended_rfq' // $5,001 - $25,000
 | 'formal_tender'; // > $25,000

export interface RFQDocument {
 id: string;
 rfqNumber: string;
 prId: string;
 prNumber: string;
 
 // Header (auto-populated from PR)
 projectId: string;
 projectName: string;
 donorId: string;
 donorName: string;
 budgetLine: string;
 currency: string;
 
 // Process type (determined by PR total)
 processType: ProcessType;
 minimumSuppliers: number;
 
 // Timeline
 createdDate: string;
 submissionDeadline: string; // Auto: 7 days from creation
 
 // Items (copied from PR, read-only in RFQ)
 items: RFQItem[];
 
 // Status
 status: 'draft' | 'sent' | 'responses_received' | 'closed';
 
 // Suppliers
 selectedSuppliers: string[]; // Supplier IDs
 suppliers?: any[]; // For backward compatibility with rfqService
 
 // Metadata
 createdBy: string;
 createdAt: string;
 updatedAt: string;
}

export interface RFQItem {
 id: string;
 itemNumber: number;
 description: string;
 specifications: string;
 quantity: number;
 unit: string;
 
 // NO PRICING IN RFQ
 // Suppliers will quote per item later
}

export interface SupplierResponse {
 id: string;
 rfqId: string;
 supplierId: string;
 supplierName: string;
 
 // Per-item pricing (CRITICAL)
 itemPrices: SupplierItemPrice[];
 
 // Response metadata
 totalQuoted: number;
 currency: string;
 submittedDate: string;
 validityPeriod: number; // days
 
 // Terms
 deliveryTerms: string;
 paymentTerms: string;
 notes: string;
}

export interface SupplierItemPrice {
 rfqItemId: string;
 itemNumber: number;
 unitPrice: number;
 totalPrice: number; // unitPrice * quantity
 
 // Optional
 deliveryTime?: number; // days
 remarks?: string;
}

export interface QABADocument {
 id: string;
 qabaNumber: string;
 type: 'quotation_analysis' | 'bid_analysis';
 
 rfqId: string;
 rfqNumber: string;
 prId: string;
 prNumber: string;
 
 // Auto-loaded from RFQ
 projectId: string;
 projectName: string;
 currency: string;
 
 // Items with supplier quotes (auto-populated)
 items: QABAItem[];
 
 // Evaluation
 recommendedSupplier?: string;
 evaluationNotes: string;
 
 // Status
 status: 'draft' | 'under_review' | 'approved' | 'rejected';
 
 // Metadata
 createdDate: string;
 createdBy: string;
 createdAt: string;
 updatedAt: string;
}

export interface QABAItem {
 itemNumber: number;
 description: string;
 quantity: number;
 unit: string;
 
 // Supplier quotes (auto-loaded from responses)
 supplierQuotes: {
 supplierId: string;
 supplierName: string;
 unitPrice: number;
 totalPrice: number;
 deliveryTime?: number;
 }[];
 
 // Evaluation
 recommendedSupplier?: string;
 justification?: string;
}

/**
 * WORKFLOW ENGINE CLASS
 */
class ProcurementWorkflowEngine {
 private readonly STORAGE_KEY_RFQ = 'ims_rfq_documents';
 private readonly STORAGE_KEY_RESPONSES = 'ims_supplier_responses';
 private readonly STORAGE_KEY_QABA = 'ims_qaba_documents';

 /**
 * 🔑 MAIN ENTRY POINT: Called when PR status changes to 'approved'
 * This is the event handler that triggers auto-creation
 */
 onPRApproved(prId: string, userId: string, pr: ProcurementRequest): { success: boolean; rfqId?: string; error?: string } {
 console.log(`🚀 [Workflow Engine] PR Approved Event Triggered: ${prId}`);
 
 try {
 // 1. Validate PR
 if (!pr) {
 return { success: false, error: 'PR not found' };
 }

 if (pr.status !== 'approved') {
 return { success: false, error: 'PR is not approved' };
 }

 if (pr.totalEstimatedCost <= 0) {
 return { success: false, error: 'PR total cost must be greater than 0' };
 }

 if (!pr.items || pr.items.length === 0) {
 return { success: false, error: 'PR has no items' };
 }

 // 🔑 CRITICAL RULE: For Tenders (> $25,000) -> NO RFQ
 if (pr.totalEstimatedCost > 25000) {
 console.log(`🛡️ [Workflow Engine] Tender path detected (> 25K). Skipping RFQ auto-creation.`);
 return { success: true };
 }

 // 2. Check if RFQ already exists
 const existingRFQ = this.getRFQByPRId(prId);
 if (existingRFQ) {
 console.log(`ℹ️ [Workflow Engine] RFQ already exists: ${existingRFQ.rfqNumber}`);
 return { success: true, rfqId: existingRFQ.id };
 }

 // 3. Determine process type based on total amount
 const processType = this.determineProcessType(pr.totalEstimatedCost);
 console.log(`📊 [Workflow Engine] Process Type: ${processType} (Total: ${pr.currency} ${pr.totalEstimatedCost})`);

 // 4. AUTO-CREATE RFQ
 const rfq = this.autoCreateRFQ(pr, processType, userId);
 console.log(`✅ [Workflow Engine] RFQ Auto-Created: ${rfq.rfqNumber}`);

 return { success: true, rfqId: rfq.id };

 } catch (error) {
 console.error('❌ [Workflow Engine] Error:', error);
 return { success: false, error: String(error) };
 }
 }

 /**
 * WORKFLOW DECISION ENGINE
 * Determines process type based on PR total amount
 */
 determineProcessType(totalAmount: number): ProcessType {
 if (totalAmount <= 1000) {
 return 'single_quote'; // 1 supplier
 } else if (totalAmount <= 5000) {
 return 'multiple_quotes'; // 3 suppliers
 } else if (totalAmount <= 25000) {
 return 'extended_rfq'; // 5+ suppliers
 } else {
 return 'formal_tender'; // Formal tender process
 }
 }

 /**
 * Get minimum suppliers required for process type
 */
 getMinimumSuppliers(processType: ProcessType): number {
 const minimums: Record<ProcessType, number> = {
 single_quote: 1,
 multiple_quotes: 3,
 extended_rfq: 5,
 formal_tender: 5
 };
 return minimums[processType];
 }

 /**
 * RFQ AUTO-CREATION LOGIC
 * Creates RFQ immediately with all data from PR
 */
 private autoCreateRFQ(pr: ProcurementRequest, processType: ProcessType, userId: string): RFQDocument {
 const now = new Date();
 const submissionDeadline = new Date(now);
 submissionDeadline.setDate(submissionDeadline.getDate() + 7); // 7 days from now

 const rfq: RFQDocument = {
 id: `rfq_${Date.now()}`,
 rfqNumber: this.generateRFQNumber(),
 prId: pr.id,
 prNumber: pr.prNumber,
 
 // Header (auto-populated from PR)
 projectId: pr.projectId,
 projectName: pr.projectName,
 donorId: pr.donorId || '',
 donorName: pr.donorName || '',
 budgetLine: pr.budgetLine || '',
 currency: pr.currency,
 
 // Process type
 processType,
 minimumSuppliers: this.getMinimumSuppliers(processType),
 
 // Timeline
 createdDate: now.toISOString(),
 submissionDeadline: submissionDeadline.toISOString(),
 
 // Items (copied from PR, read-only)
 items: pr.items.map((item, index) => ({
 id: `rfq_item_${Date.now()}_${index}`,
 itemNumber: index + 1,
 description: item.description,
 specifications: item.specifications || '',
 quantity: item.quantity,
 unit: item.unit
 // NO PRICING - suppliers will quote
 })),
 
 // Status
 status: 'draft',
 
 // Suppliers (empty initially)
 selectedSuppliers: [],
 suppliers: [],
 
 // Metadata
 createdBy: userId,
 createdAt: now.toISOString(),
 updatedAt: now.toISOString()
 };

 // Save to storage
 this.saveRFQ(rfq);

 return rfq;
 }

 /**
 * AUTO-CREATE QA/BA
 * Only called when RFQ is sent AND has minimum supplier responses
 */
 autoCreateQABA(rfqId: string, userId: string = 'system'): { success: boolean; qabaId?: string; error?: string } {
 console.log(`🚀 [Workflow Engine] Attempting to auto-create QA/BA for RFQ: ${rfqId}`);

 try {
 // 1. Validate RFQ exists
 const rfq = this.getRFQById(rfqId);
 if (!rfq) {
 return { success: false, error: 'RFQ not found' };
 }

 // 2. Check if RFQ is sent
 if (rfq.status !== 'sent' && rfq.status !== 'responses_received') {
 return { success: false, error: 'RFQ must be sent before QA/BA can be created' };
 }

 // 3. Check if we have minimum supplier responses
 const responses = this.getSupplierResponsesByRFQ(rfqId);
 if (responses.length < 2) {
 return { success: false, error: `Minimum 2 supplier responses required. Currently: ${responses.length}` };
 }

 // 4. Check if QA/BA already exists
 const existingQABA = this.getQABAByRFQId(rfqId);
 if (existingQABA) {
 console.log(`ℹ️ [Workflow Engine] QA/BA already exists: ${existingQABA.qabaNumber}`);
 return { success: true, qabaId: existingQABA.id };
 }

 // 5. AUTO-CREATE QA/BA
 const qaba = this.autoCreateQABADocument(rfq, responses, userId);
 console.log(`✅ [Workflow Engine] QA/BA Auto-Created: ${qaba.qabaNumber}`);

 return { success: true, qabaId: qaba.id };

 } catch (error) {
 console.error('❌ [Workflow Engine] Error creating QA/BA:', error);
 return { success: false, error: String(error) };
 }
 }

 /**
 * Create QA/BA document with auto-populated supplier data
 */
 private autoCreateQABADocument(rfq: RFQDocument, responses: SupplierResponse[], userId: string): QABADocument {
 const now = new Date();
 const type = rfq.processType === 'formal_tender' ? 'bid_analysis' : 'quotation_analysis';

 // Build items with supplier quotes
 const items: QABAItem[] = rfq.items.map(rfqItem => {
 const supplierQuotes = responses.map(response => {
 const itemPrice = response.itemPrices.find(ip => ip.rfqItemId === rfqItem.id);
 return {
 supplierId: response.supplierId,
 supplierName: response.supplierName,
 unitPrice: itemPrice?.unitPrice || 0,
 totalPrice: itemPrice?.totalPrice || 0,
 deliveryTime: itemPrice?.deliveryTime
 };
 });

 return {
 itemNumber: rfqItem.itemNumber,
 description: rfqItem.description,
 quantity: rfqItem.quantity,
 unit: rfqItem.unit,
 supplierQuotes
 };
 });

 const qaba: QABADocument = {
 id: `qaba_${Date.now()}`,
 qabaNumber: this.generateQABANumber(type),
 type,
 
 rfqId: rfq.id,
 rfqNumber: rfq.rfqNumber,
 prId: rfq.prId,
 prNumber: rfq.prNumber,
 
 projectId: rfq.projectId,
 projectName: rfq.projectName,
 currency: rfq.currency,
 
 items,
 
 evaluationNotes: '',
 
 status: 'draft',
 
 createdDate: now.toISOString(),
 createdBy: userId,
 createdAt: now.toISOString(),
 updatedAt: now.toISOString()
 };

 // Save to storage
 this.saveQABA(qaba);

 return qaba;
 }

 /**
 * Generate RFQ number
 */
 private generateRFQNumber(): string {
 const year = new Date().getFullYear();
 const allRFQs = this.getAllRFQs();
 const count = allRFQs.length + 1;
 return `RFQ-${year}-${String(count).padStart(5, '0')}`;
 }

 /**
 * Generate QA/BA number
 */
 private generateQABANumber(type: 'quotation_analysis' | 'bid_analysis'): string {
 const year = new Date().getFullYear();
 const prefix = type === 'quotation_analysis' ? 'QA' : 'BA';
 const allQABAs = this.getAllQABAs();
 const count = allQABAs.filter(q => q.type === type).length + 1;
 return `${prefix}-${year}-${String(count).padStart(5, '0')}`;
 }

 // ============================================================================
 // STORAGE OPERATIONS
 // ============================================================================

 private saveRFQ(rfq: RFQDocument): void {
 const all = this.getAllRFQs();
 const index = all.findIndex(r => r.id === rfq.id);
 if (index >= 0) {
 all[index] = rfq;
 } else {
 all.push(rfq);
 }
 localStorage.setItem(this.STORAGE_KEY_RFQ, JSON.stringify(all));
 }

 private saveQABA(qaba: QABADocument): void {
 const all = this.getAllQABAs();
 const index = all.findIndex(q => q.id === qaba.id);
 if (index >= 0) {
 all[index] = qaba;
 } else {
 all.push(qaba);
 }
 localStorage.setItem(this.STORAGE_KEY_QABA, JSON.stringify(all));
 }

 getAllRFQs(): RFQDocument[] {
 try {
 const data = localStorage.getItem(this.STORAGE_KEY_RFQ);
 if (!data || data === 'null') return [];
 const parsed = JSON.parse(data);
 return Array.isArray(parsed) ? parsed : [];
 } catch {
 return [];
 }
 }

 getAllQABAs(): QABADocument[] {
 try {
 const data = localStorage.getItem(this.STORAGE_KEY_QABA);
 if (!data || data === 'null') return [];
 const parsed = JSON.parse(data);
 return Array.isArray(parsed) ? parsed : [];
 } catch {
 return [];
 }
 }

 getRFQById(id: string): RFQDocument | null {
 const all = this.getAllRFQs();
 return all.find(r => r.id === id) || null;
 }

 getRFQByPRId(prId: string): RFQDocument | null {
 const all = this.getAllRFQs();
 return all.find(r => r.prId === prId) || null;
 }

 getQABAById(id: string): QABADocument | null {
 const all = this.getAllQABAs();
 return all.find(q => q.id === id) || null;
 }

 getQABAByRFQId(rfqId: string): QABADocument | null {
 const all = this.getAllQABAs();
 return all.find(q => q.rfqId === rfqId) || null;
 }

 getSupplierResponsesByRFQ(rfqId: string): SupplierResponse[] {
 try {
 const data = localStorage.getItem(this.STORAGE_KEY_RESPONSES);
 if (!data || data === 'null') return [];
 const all: SupplierResponse[] = JSON.parse(data);
 if (!Array.isArray(all)) return [];
 return all.filter(r => r.rfqId === rfqId);
 } catch {
 return [];
 }
 }

 /**
 * Add supplier response
 */
 addSupplierResponse(response: SupplierResponse): void {
 try {
 const data = localStorage.getItem(this.STORAGE_KEY_RESPONSES);
 const all: SupplierResponse[] = data ? JSON.parse(data) : [];
 all.push(response);
 localStorage.setItem(this.STORAGE_KEY_RESPONSES, JSON.stringify(all));

 // Update RFQ status to 'responses_received'
 const rfq = this.getRFQById(response.rfqId);
 if (rfq && rfq.status === 'sent') {
 rfq.status = 'responses_received';
 rfq.updatedAt = new Date().toISOString();
 this.saveRFQ(rfq);
 }

 console.log(`✅ [Workflow Engine] Supplier response added for RFQ: ${response.rfqId}`);
 } catch (error) {
 console.error('❌ [Workflow Engine] Error adding supplier response:', error);
 }
 }

 /**
 * Update RFQ status
 */
 updateRFQStatus(rfqId: string, status: RFQDocument['status']): boolean {
 const rfq = this.getRFQById(rfqId);
 if (!rfq) return false;

 rfq.status = status;
 rfq.updatedAt = new Date().toISOString();
 this.saveRFQ(rfq);

 // If status is 'sent' and we have enough responses, auto-create QA/BA
 if (status === 'sent' || status === 'responses_received') {
 const responses = this.getSupplierResponsesByRFQ(rfqId);
 if (responses.length >= 2) {
 setTimeout(() => {
 this.autoCreateQABA(rfqId);
 }, 100);
 }
 }

 return true;
 }
}

export const procurementWorkflowEngine = new ProcurementWorkflowEngine();

/**
 * ADAPTER: Convert new RFQDocument to old RequestForQuotation format
 * This maintains backward compatibility with existing UI components
 */
export function adaptRFQDocumentToRequestForQuotation(rfqDoc: RFQDocument, pr: any): any {
 return {
 id: rfqDoc.id,
 rfqNumber: rfqDoc.rfqNumber,
 prId: rfqDoc.prId,
 prNumber: rfqDoc.prNumber,
 
 // Organization (from PR)
 organizationId: pr?.organizationId || '',
 organizationName: pr?.organizationName || '',
 operatingUnitId: pr?.operatingUnitId || '',
 operatingUnitName: pr?.operatingUnitName || '',
 country: pr?.country || '',
 
 // RFQ Details
 procurementMethod: rfqDoc.processType === 'formal_tender' ? 'tender' : 'quotation',
 issueDate: rfqDoc.createdDate,
 submissionDeadline: rfqDoc.submissionDeadline,
 currency: rfqDoc.currency,
 
 // Contact (from PR)
 contactPerson: pr?.requestedByName || '',
 contactEmail: pr?.contactEmail || '',
 contactPhone: pr?.contactPhone || '',
 
 // Delivery Requirements
 deliveryLocation: pr?.deliveryLocation || '',
 requiredDeliveryDate: pr?.requiredDate || '',
 
 // Items
 items: rfqDoc.items.map(item => ({
 id: item.id,
 itemNumber: String(item.itemNumber),
 itemName: item.description,
 description: item.description,
 specification: item.specifications,
 quantity: item.quantity,
 unit: item.unit
 })),
 
 // Suppliers (Preserve existing suppliers from document)
 suppliers: (rfqDoc as any).suppliers || [],
 
 // Status
 status: rfqDoc.status,
 
 // Terms (Preserve existing terms if present)
 terms: (rfqDoc as any).terms || 'Standard procurement terms and conditions apply.',
 
 // Metadata
 createdAt: rfqDoc.createdAt,
 createdBy: rfqDoc.createdBy,
 updatedAt: rfqDoc.updatedAt,
 updatedBy: rfqDoc.createdBy
 };
}