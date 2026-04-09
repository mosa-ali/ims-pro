// ============================================================================
// REQUEST FOR QUOTATION (RFQ) SERVICE
// Outbound supplier quotation request document
// Auto-created on PR approval - MANDATORY before QA/BA
// Integrated Management System (IMS)
// ============================================================================

import type { ProcurementRequest } from '@/app/types/logistics.types';

const STORAGE_KEY = 'ims_rfq_documents';

// ============================================================================
// TYPES
// ============================================================================

export type RFQStatus = 'draft' | 'sent' | 'responses_received' | 'closed';

export interface RFQSupplier {
 id: string;
 supplierName: string;
 contactPerson: string;
 email: string;
 phone: string;
 sentDate?: string;
 responseDeadline?: string;
 responseReceived: boolean;
 responseReceivedDate?: string;
}

export interface RFQItem {
 id: string;
 itemNumber: string;
 itemName: string;
 description: string;
 specification: string;
 quantity: number;
 unit: string;
 // NO PRICING IN RFQ - this is sent to suppliers blank
}

export interface RequestForQuotation {
 id: string;
 rfqNumber: string;
 prId: string;
 prNumber: string;
 
 // Organization
 organizationId: string;
 organizationName: string;
 organizationLogo?: string;
 operatingUnitId: string;
 operatingUnitName: string;
 country: string;
 
 // RFQ Details
 procurementMethod: 'quotation' | 'tender'; // Based on PR cost
 issueDate: string;
 submissionDeadline: string;
 currency: string;
 
 // Contact
 contactPerson: string;
 contactEmail: string;
 contactPhone: string;
 
 // Delivery Requirements (from PR)
 deliveryLocation: string;
 requiredDeliveryDate: string;
 
 // Items (from PR - read-only)
 items: RFQItem[];
 
 // Suppliers (manually selected)
 suppliers: RFQSupplier[];
 
 // Status
 status: RFQStatus;
 
 // Terms & Conditions
 terms: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class RFQService {
 private getAll(): RequestForQuotation[] {
 const data = localStorage.getItem(STORAGE_KEY);
 return data ? JSON.parse(data) : [];
 }

 private save(rfqs: RequestForQuotation[]): void {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(rfqs));
 }

 /**
 * ✅ AUTO-CREATE RFQ FROM APPROVED PR
 * Called by workflow automation service
 */
 autoCreateFromPR(pr: ProcurementRequest, userId: string): RequestForQuotation {
 console.log('📄 [RFQ Service] Auto-creating RFQ from PR:', pr.prNumber);

 // Check if already exists
 const existing = this.getRFQByPRId(pr.id);
 if (existing) {
 console.log('ℹ️ [RFQ Service] RFQ already exists:', existing.rfqNumber);
 return existing;
 }

 // Generate RFQ number
 const rfqs = this.getAll();
 const year = new Date().getFullYear();
 const sequence = rfqs.filter(r => r.rfqNumber.includes(`RFQ-${year}`)).length + 1;
 const rfqNumber = `RFQ-${year}-${String(sequence).padStart(5, '0')}`;

 // Determine procurement method based on cost
 const procurementMethod = pr.totalEstimatedCost > 25000 ? 'tender' : 'quotation';

 // Convert PR items to RFQ items (no pricing)
 const rfqItems: RFQItem[] = (pr.items || []).map((item, index) => ({
 id: `rfq-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 itemNumber: `${index + 1}`, // Generate item number from index
 itemName: item.description, // ✅ PR uses 'description' as item name
 description: item.detailedSpecification || item.description || '', // ✅ Use detailedSpecification if available
 specification: item.detailedSpecification || item.specifications || '', // ✅ Map specifications correctly
 quantity: item.quantity,
 unit: item.unit
 // NO pricing - RFQ is neutral
 }));

 // Default submission deadline (7 days for quotations, 14 days for tenders)
 const daysToDeadline = procurementMethod === 'tender' ? 14 : 7;
 const submissionDeadline = new Date();
 submissionDeadline.setDate(submissionDeadline.getDate() + daysToDeadline);

 // Create RFQ
 const rfq: RequestForQuotation = {
 id: `rfq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 rfqNumber,
 prId: pr.id,
 prNumber: pr.prNumber,
 
 organizationId: pr.organizationId,
 organizationName: pr.organizationName || '',
 organizationLogo: pr.organizationLogo,
 operatingUnitId: pr.operatingUnitId,
 operatingUnitName: pr.operatingUnitName || '',
 country: pr.country || '',
 
 procurementMethod,
 issueDate: new Date().toISOString().split('T')[0],
 submissionDeadline: submissionDeadline.toISOString().split('T')[0],
 currency: pr.currency,
 
 contactPerson: pr.requestedByName || 'Logistics Department',
 contactEmail: 'logistics@organization.org',
 contactPhone: '+1-XXX-XXX-XXXX',
 
 deliveryLocation: pr.deliveryLocation || '',
 requiredDeliveryDate: pr.requiredDate || '',
 
 items: rfqItems,
 suppliers: [], // Added manually by user
 
 status: 'draft',
 
 terms: this.getDefaultTerms(procurementMethod),
 
 createdAt: new Date().toISOString(),
 createdBy: userId,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 };

 rfqs.push(rfq);
 this.save(rfqs);

 console.log('✅ [RFQ Service] RFQ created:', rfqNumber);
 return rfq;
 }

 /**
 * Get default terms based on procurement method
 */
 private getDefaultTerms(method: 'quotation' | 'tender'): string {
 if (method === 'tender') {
 return `1. All prices must be quoted in the specified currency
2. Prices must include all applicable taxes and duties
3. Delivery must be to the specified location
4. Payment terms: Net 30 days after delivery
5. Quotations must remain valid for 90 days
6. Late submissions will not be accepted
7. The organization reserves the right to accept or reject any quotation
8. Technical specifications must be met exactly as described`;
 } else {
 return `1. All prices must be quoted in the specified currency
2. Prices should include delivery to specified location
3. Payment terms: Net 30 days after delivery
4. Quotations must remain valid for 60 days
5. The organization reserves the right to accept or reject any quotation`;
 }
 }

 /**
 * Get RFQ by ID
 */
 getRFQById(id: string): RequestForQuotation | null {
 const rfqs = this.getAll();
 return rfqs.find(r => r.id === id) || null;
 }

 /**
 * Get RFQ by PR Number (MANDATORY LINKAGE)
 */
 getRFQByPRNumber(prNumber: string): RequestForQuotation | null {
 const rfqs = this.getAll();
 return rfqs.find(r => r.prNumber === prNumber) || null;
 }

 /**
 * Get RFQ by PR ID (Legacy support)
 */
 getRFQByPRId(prId: string): RequestForQuotation | null {
 const rfqs = this.getAll();
 return rfqs.find(r => r.prId === prId || r.prNumber === prId) || null;
 }

 /**
 * Update RFQ
 */
 updateRFQ(rfq: RequestForQuotation): void {
 const rfqs = this.getAll();
 const index = rfqs.findIndex(r => r.id === rfq.id);
 
 if (index >= 0) {
 rfq.updatedAt = new Date().toISOString();
 rfqs[index] = rfq;
 this.save(rfqs);
 }
 }

 /**
 * Add supplier to RFQ
 */
 addSupplier(
 rfqId: string,
 supplierName: string,
 contactPerson: string,
 email: string,
 phone: string,
 responseDeadline: string
 ): RFQSupplier {
 const rfq = this.getRFQById(rfqId);
 if (!rfq) throw new Error('RFQ not found');

 const supplier: RFQSupplier = {
 id: `supplier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 supplierName,
 contactPerson,
 email,
 phone,
 responseDeadline,
 responseReceived: false
 };

 if (!rfq.suppliers) {
 rfq.suppliers = [];
 }
 
 rfq.suppliers.push(supplier);
 this.updateRFQ(rfq);

 return supplier;
 }

 /**
 * Mark supplier response received
 */
 markSupplierResponseReceived(rfqId: string, supplierId: string): void {
 const rfq = this.getRFQById(rfqId);
 if (!rfq) return;

 const supplier = rfq.suppliers.find(s => s.id === supplierId);
 if (supplier) {
 supplier.responseReceived = true;
 supplier.responseReceivedDate = new Date().toISOString().split('T')[0];
 this.updateRFQ(rfq);
 }
 }

 /**
 * Mark RFQ as sent to suppliers
 */
 markAsSent(rfqId: string, userId: string): void {
 const rfq = this.getRFQById(rfqId);
 if (!rfq) return;

 if (rfq.suppliers.length === 0) {
 throw new Error('Cannot send RFQ: No suppliers added');
 }

 rfq.status = 'sent';
 rfq.suppliers.forEach(supplier => {
 if (!supplier.sentDate) {
 supplier.sentDate = new Date().toISOString().split('T')[0];
 }
 });
 rfq.updatedBy = userId;
 
 this.updateRFQ(rfq);
 console.log('✅ [RFQ Service] RFQ marked as sent:', rfq.rfqNumber);
 }

 /**
 * ✅ VALIDATION: Check if RFQ is ready for QA/BA creation
 */
 isReadyForAnalysis(rfqId: string): { ready: boolean; reason?: string } {
 const rfq = this.getRFQById(rfqId);
 
 if (!rfq) {
 return { ready: false, reason: 'RFQ not found' };
 }

 if (rfq.status === 'draft') {
 return { ready: false, reason: 'RFQ must be sent to suppliers first' };
 }

 if (rfq.suppliers.length < 2) {
 return { ready: false, reason: 'At least 2 suppliers must be invited' };
 }

 // RELAXED: Allow creating analysis draft as soon as RFQ is sent
 // Users can mark responses later or fill them in the analysis form
 return { ready: true };
 }

 /**
 * Get all RFQs
 */
 getAllRFQs(): RequestForQuotation[] {
 return this.getAll();
 }

 /**
 * Delete RFQ
 */
 deleteRFQ(id: string): void {
 const rfqs = this.getAll();
 const filtered = rfqs.filter(r => r.id !== id);
 this.save(filtered);
 }
}

export const rfqService = new RFQService();