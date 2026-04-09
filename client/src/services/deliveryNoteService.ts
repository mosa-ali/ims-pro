// ============================================================================
// DELIVERY NOTE SERVICE
// Delivery tracking within procurement workspace
// ============================================================================

const STORAGE_KEY = 'delivery_notes_v1';

export interface DeliveryItem {
 id: string;
 poItemId: string;
 description: string;
 quantity: number;
 unit: string;
 condition: 'good' | 'damaged' | 'partial';
 notes?: string;
}

export interface DeliveryNote {
 id: string;
 deliveryNumber: string; // Auto-generated: DEL-2026-00001
 prId: string;
 prNumber: string;
 poId: string;
 poNumber: string;
 grnId?: string;
 grnNumber?: string;
 
 deliveryDate: string;
 deliveryTime?: string;
 
 // Transport
 transportMode: 'road' | 'air' | 'sea' | 'courier' | 'pickup';
 transportCompany?: string;
 vehicleNumber?: string;
 driverName?: string;
 driverContact?: string;
 courierCompany?: string;
 trackingNumber?: string;
 
 // Addresses
 fromAddress?: string;
 toAddress: string;
 
 // Items
 items: DeliveryItem[];
 
 // Receiving
 receivedBy?: string;
 receivedByName?: string;
 receivedDate?: string;
 receiverSignature?: string;
 
 // Status
 status: 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
 
 notes?: string;
 
 organizationId: string;
 operatingUnitId: string;
 
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

export const deliveryNoteService = {
 
 generateDeliveryNumber(): string {
 const year = new Date().getFullYear();
 const all = this.getAllDeliveryNotes();
 const thisYear = all.filter(d => d.deliveryNumber.startsWith(`DEL-${year}`));
 const sequence = (thisYear.length + 1).toString().padStart(5, '0');
 return `DEL-${year}-${sequence}`;
 },

 /**
 * Create delivery note from PO with REAL items
 */
 createDeliveryNote(
 po: any // PurchaseOrder with items
 ): DeliveryNote {
 // Check if already exists
 const existing = this.getDeliveryNoteByPRId(po.prId);
 if (existing) {
 return existing;
 }

 // ❌ NO EMPTY ITEMS - Copy from PO
 if (!po.items || po.items.length === 0) {
 throw new Error('PO has no items. Cannot create Delivery Note.');
 }

 // Map PO items to delivery items
 const deliveryItems = po.items.map((poItem: any) => ({
 id: `delitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 poItemId: poItem.id,
 description: poItem.description,
 quantity: poItem.quantity,
 unit: poItem.unit,
 condition: 'good' as const,
 notes: ''
 }));

 const delivery: DeliveryNote = {
 id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
 deliveryNumber: this.generateDeliveryNumber(),
 prId: po.prId,
 prNumber: po.prNumber,
 poId: po.id,
 poNumber: po.poNumber,
 
 deliveryDate: new Date().toISOString().split('T')[0],
 fromAddress: po.vendorAddress || 'Vendor Address',
 toAddress: po.deliveryAddress || 'Main Office',
 
 transportMode: 'road',
 transportCompany: 'Express Logistics Co.',
 vehicleNumber: `TRK-${Math.floor(Math.random() * 9000) + 1000}`,
 driverName: 'Driver Name',
 driverContact: '+123456789',
 
 // REAL ITEMS from PO
 items: deliveryItems,
 
 status: 'in_transit',
 
 organizationId: po.organizationId,
 operatingUnitId: po.operatingUnitId,
 
 createdAt: new Date().toISOString(),
 createdBy: po.createdBy,
 updatedAt: new Date().toISOString(),
 updatedBy: po.createdBy
 };

 this.saveDeliveryNote(delivery);
 console.log(`[Delivery] ✅ Created ${delivery.deliveryNumber} with ${delivery.items.length} items`);
 
 return delivery;
 },

 updateDeliveryNote(deliveryId: string, updates: Partial<DeliveryNote>, userId: string): { success: boolean; error?: string } {
 const note = this.getDeliveryNoteById(deliveryId);
 if (!note) {
 return { success: false, error: 'Delivery note not found' };
 }

 Object.assign(note, {
 ...updates,
 updatedAt: new Date().toISOString(),
 updatedBy: userId
 });

 this.saveDeliveryNote(note);
 return { success: true };
 },

 markAsDelivered(deliveryId: string, receivedBy: string, receivedByName: string, userId: string): { success: boolean; error?: string } {
 const note = this.getDeliveryNoteById(deliveryId);
 if (!note) {
 return { success: false, error: 'Delivery note not found' };
 }

 note.status = 'delivered';
 note.receivedBy = receivedBy;
 note.receivedByName = receivedByName;
 note.receivedDate = new Date().toISOString().split('T')[0];
 note.updatedAt = new Date().toISOString();
 note.updatedBy = userId;

 this.saveDeliveryNote(note);
 return { success: true };
 },

 getDeliveryNoteById(deliveryId: string): DeliveryNote | null {
 const all = this.getAllDeliveryNotes();
 return all.find(d => d.id === deliveryId) || null;
 },

 getDeliveryNoteByPRId(prId: string): DeliveryNote | null {
 const all = this.getAllDeliveryNotes();
 return all.find(d => d.prId === prId) || null;
 },

 getAllDeliveryNotes(): DeliveryNote[] {
 const data = localStorage.getItem(STORAGE_KEY);
 return data ? JSON.parse(data) : [];
 },

 saveDeliveryNote(note: DeliveryNote): void {
 const all = this.getAllDeliveryNotes();
 const index = all.findIndex(d => d.id === note.id);

 if (index >= 0) {
 all[index] = note;
 } else {
 all.push(note);
 }

 localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
 }
};