// ============================================================================
// GOODS RECEIPT NOTE (GRN) SERVICE
// GRN management within procurement workspace
// Integrated Management System (IMS)
// ============================================================================

const STORAGE_KEY = 'goods_receipts_v1';

export interface GRNItem {
 id: string;
 poItemId: string;
 description: string;
 orderedQuantity: number;
 receivedQuantity: number;
 unit: string;
 condition: 'good' | 'damaged' | 'partial';
 notes?: string;
}

export interface GoodsReceiptNote {
 id: string;
 grnNumber: string; // Auto-generated: GRN-2026-00001
 prId: string;
 prNumber: string;
 poId: string;
 poNumber: string;
 
 receiptDate: string;
 receivedBy: string;
 receivedByName: string;
 receivedByPosition?: string;
 
 vendorName: string;
 vendorDeliveryNote?: string;
 
 items: GRNItem[];
 
 qualityInspection: {
 inspected: boolean;
 inspectedBy?: string;
 inspectedByName?: string;
 inspectionDate?: string;
 inspectionNotes?: string;
 approved: boolean;
 };
 
 discrepancies?: string;
 overallCondition: 'good' | 'partial' | 'rejected';
 status: 'draft' | 'completed';
 
 organizationId: string;
 operatingUnitId: string;
 
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

export const goodsReceiptService = {
 
 generateGRNNumber(): string {
 const year = new Date().getFullYear();
 const all = this.getAllGRNs();
 const thisYearGRNs = all.filter(grn => grn.grnNumber.startsWith(`GRN-${year}`));
 const sequence = (thisYearGRNs.length + 1).toString().padStart(5, '0');
 return `GRN-${year}-${sequence}`;
 },

 /**
 * Create GRN from PO with REAL items (CORRECT METHOD)
 * ✅ CRITICAL: Only create GRN for GOODS procurement
 * ❌ Services, food/catering, vouchers DO NOT need GRN
 */
 createFromPO(
 po: any, // PurchaseOrder with items
 pr: any // ProcurementRequest to check category
 ): GoodsReceiptNote | null {
 // ✅ CHECK PROCUREMENT CATEGORY - GRN only for GOODS
 if (pr.category !== 'goods') {
 console.log(`[GRN] ⚠️ Skipping GRN creation - PR category is "${pr.category}" (not goods)`);
 return null; // No GRN needed for services, food, or vouchers
 }

 // Check if already exists
 const existing = this.getGRNByPRId(po.prId);
 if (existing) {
 return existing;
 }

 // ❌ NO EMPTY ITEMS - Copy from PO
 if (!po.items || po.items.length === 0) {
 throw new Error('PO has no items. Cannot create GRN.');
 }

 // Map PO items to GRN items
 const grnItems: GRNItem[] = po.items.map((poItem: any) => ({
 id: `grnitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 poItemId: poItem.id,
 description: poItem.description,
 orderedQuantity: poItem.quantity,
 receivedQuantity: poItem.quantity, // Default to full receipt - can be edited
 unit: poItem.unit,
 condition: 'good' as const,
 notes: ''
 }));

 const grn: GoodsReceiptNote = {
 id: `grn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 grnNumber: this.generateGRNNumber(),
 prId: po.prId,
 prNumber: po.prNumber,
 poId: po.id,
 poNumber: po.poNumber,
 
 receiptDate: new Date().toISOString().split('T')[0],
 receivedBy: po.createdBy,
 receivedByName: po.createdByName || 'Warehouse Staff',
 receivedByPosition: 'Warehouse Manager',
 
 vendorName: po.vendorName,
 vendorDeliveryNote: `DN-${Date.now()}`,
 
 // REAL ITEMS from PO
 items: grnItems,
 
 qualityInspection: {
 inspected: false,
 approved: false
 },
 
 overallCondition: 'good',
 status: 'draft',
 
 organizationId: po.organizationId,
 operatingUnitId: po.operatingUnitId,
 
 createdAt: new Date().toISOString(),
 createdBy: po.createdBy,
 updatedAt: new Date().toISOString(),
 updatedBy: po.createdBy
 };

 this.saveGRN(grn);
 console.log(`[GRN] ✅ Created ${grn.grnNumber} with ${grn.items.length} items from ${po.poNumber}`);
 
 return grn;
 },

 updateGRN(grnId: string, updates: Partial<GoodsReceiptNote>, userId: string): { success: boolean; error?: string } {
 const grn = this.getGRNById(grnId);
 if (!grn) {
 return { success: false, error: 'GRN not found' };
 }

 Object.assign(grn, {
 ...updates,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 });

 this.saveGRN(grn);
 return { success: true };
 },

 addItem(grnId: string, item: Omit<GRNItem, 'id'>, userId: string): { success: boolean; error?: string } {
 const grn = this.getGRNById(grnId);
 if (!grn) {
 return { success: false, error: 'GRN not found' };
 }

 const newItem: GRNItem = {
 ...item,
 id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
 };

 grn.items.push(newItem);
 grn.updatedAt = new Date().toISOString();
 grn.updatedBy = userId;

 this.saveGRN(grn);
 return { success: true };
 },

 updateItem(grnId: string, itemId: string, updates: Partial<GRNItem>, userId: string): { success: boolean; error?: string } {
 const grn = this.getGRNById(grnId);
 if (!grn) {
 return { success: false, error: 'GRN not found' };
 }

 const item = grn.items.find(i => i.id === itemId);
 if (!item) {
 return { success: false, error: 'Item not found' };
 }

 Object.assign(item, updates);
 grn.updatedAt = new Date().toISOString();
 grn.updatedBy = userId;

 this.saveGRN(grn);
 return { success: true };
 },

 completeGRN(grnId: string, userId: string): { success: boolean; error?: string } {
 const grn = this.getGRNById(grnId);
 if (!grn) {
 return { success: false, error: 'GRN not found' };
 }

 if (grn.items.length === 0) {
 return { success: false, error: 'Cannot complete GRN with no items' };
 }

 grn.status = 'completed';
 grn.updatedAt = new Date().toISOString();
 grn.updatedBy = userId;

 this.saveGRN(grn);
 return { success: true };
 },

 getGRNById(grnId: string): GoodsReceiptNote | null {
 const all = this.getAllGRNs();
 return all.find(grn => grn.id === grnId) || null;
 },

 getGRNByPRId(prId: string): GoodsReceiptNote | null {
 const all = this.getAllGRNs();
 return all.find(grn => grn.prId === prId) || null;
 },

 getAllGRNs(): GoodsReceiptNote[] {
 const data = localStorage.getItem(STORAGE_KEY);
 return data ? JSON.parse(data) : [];
 },

 saveGRN(grn: GoodsReceiptNote): void {
 const all = this.getAllGRNs();
 const index = all.findIndex(g => g.id === grn.id);

 if (index >= 0) {
 all[index] = grn;
 } else {
 all.push(grn);
 }

 localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
 }
};