// ============================================================================
// PURCHASE ORDER SERVICE
// Purchase Order management within procurement workspace
// Integrated Management System (IMS)
// ============================================================================

import { procurementRequestService } from './procurementRequestService';

const STORAGE_KEY = 'purchase_orders_v1';

// ============================================================================
// TYPES
// ============================================================================

export interface PurchaseOrderItem {
  id: string;
  prItemId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // Auto-generated: PO-2026-00001
  prId: string;
  prNumber: string;
  
  // Vendor Information
  vendorId?: string;
  vendorName: string;
  vendorAddress?: string;
  vendorContact?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  
  // Order Details
  orderDate: string;
  deliveryDate: string;
  deliveryAddress: string;
  
  // Financial
  currency: string;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  
  // Items
  items: PurchaseOrderItem[];
  
  // Terms & Conditions
  paymentTerms: string;
  deliveryTerms: string;
  warrantyPeriod?: string;
  specialConditions?: string;
  
  // Status
  status: 'draft' | 'pending_approval' | 'approved' | 'sent_to_vendor' | 'completed' | 'cancelled';
  
  // Approval
  approvalFlowId?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  
  // Tracking
  organizationId: string;
  operatingUnitId: string;
  projectId?: string;
  projectName?: string;
  
  // Metadata
  notes?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  updatedAt: string;
  updatedBy: string;
}

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const purchaseOrderService = {
  
  /**
   * Generate PO number
   */
  generatePONumber(): string {
    const year = new Date().getFullYear();
    const all = this.getAllPOs();
    const thisYearPOs = all.filter(po => po.poNumber.startsWith(`PO-${year}`));
    const sequence = (thisYearPOs.length + 1).toString().padStart(5, '0');
    return `PO-${year}-${sequence}`;
  },

  /**
   * Create PO from PR + QA/BA Winner (REAL DOCUMENT WITH ITEMS)
   * This is the CORRECT way - auto-populates vendor and items from analysis
   */
  createFromPRAndAnalysis(
    pr: any, // ProcurementRequest
    analysis: any, // QuotationAnalysis
    userId: string,
    userName: string
  ): PurchaseOrder {
    // Check if PO already exists
    const existing = this.getPOByPRId(pr.id);
    if (existing) {
      return existing;
    }

    // Get winner from analysis
    if (!analysis.recommendedVendorId) {
      throw new Error('No vendor selected in analysis. Cannot create PO.');
    }

    const winner = analysis.vendors.find((v: any) => v.vendorId === analysis.recommendedVendorId);
    if (!winner) {
      throw new Error('Winner vendor not found in analysis.');
    }

    // ❌ NO EMPTY ITEMS - Copy from PR
    if (!pr.items || pr.items.length === 0) {
      throw new Error('PR has no items. Cannot create PO.');
    }

    // Map PR items to PO items with real prices
    const poItems: PurchaseOrderItem[] = pr.items.map((prItem: any) => ({
      id: `poitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prItemId: prItem.id,
      description: prItem.description || 'Item',
      quantity: prItem.quantity || 1,
      unit: prItem.unit || 'unit',
      unitPrice: prItem.estimatedUnitCost || prItem.unitPrice || 0,
      totalPrice: (prItem.quantity || 1) * (prItem.estimatedUnitCost || prItem.unitPrice || 0),
      specifications: prItem.specifications
    }));

    // Calculate totals
    const subtotal = poItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0; // Can be configured
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    // ❌ USD 0 NOT ALLOWED
    if (totalAmount === 0) {
      throw new Error('PO total cannot be USD 0. Check PR item prices.');
    }

    // Calculate delivery date (30 days from now by default)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + (winner.deliveryDays || 30));

    const po: PurchaseOrder = {
      id: `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      poNumber: this.generatePONumber(),
      prId: pr.id,
      prNumber: pr.prNumber,
      
      // Vendor from QA/BA winner
      vendorId: winner.vendorId,
      vendorName: winner.vendorName,
      vendorAddress: winner.vendorAddress || 'Vendor Address',
      vendorContact: winner.contactPerson,
      vendorEmail: winner.email,
      vendorPhone: winner.phone,
      
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: deliveryDate.toISOString().split('T')[0],
      deliveryAddress: pr.deliveryAddress || 'Organization Main Office',
      
      currency: pr.currency || 'USD',
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      
      // REAL ITEMS from PR
      items: poItems,
      
      paymentTerms: winner.paymentTerms || 'Net 30',
      deliveryTerms: 'FOB Destination',
      warrantyPeriod: winner.warranty || '12 months',
      specialConditions: analysis.recommendationReason || '',
      
      status: 'draft',
      
      organizationId: pr.organizationId,
      operatingUnitId: pr.operatingUnitId,
      projectId: pr.projectId,
      projectName: pr.projectName,
      
      notes: `Created from ${analysis.qaNumber}`,
      
      createdAt: new Date().toISOString(),
      createdBy: userId,
      createdByName: userName,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    this.savePO(po);
    console.log(`[PO] ✅ Created ${po.poNumber} for ${winner.vendorName} - Total: ${po.currency} ${po.totalAmount}`);
    
    return po;
  },

  /**
   * @deprecated Use createFromPRAndAnalysis instead
   * This old method created empty POs - NOT ALLOWED
   */
  createFromPR(
    prId: string,
    prNumber: string,
    vendorName: string,
    organizationId: string,
    operatingUnitId: string,
    userId: string,
    userName: string
  ): PurchaseOrder {
    throw new Error('createFromPR is deprecated. Use createFromPRAndAnalysis with real analysis data.');
  },

  /**
   * Update PO
   */
  updatePO(
    poId: string,
    updates: Partial<PurchaseOrder>,
    userId: string
  ): { success: boolean; error?: string } {
    const po = this.getPOById(poId);
    if (!po) {
      return { success: false, error: 'PO not found' };
    }

    if (po.status === 'sent_to_vendor' || po.status === 'completed') {
      return { success: false, error: 'Cannot modify sent or completed PO' };
    }

    Object.assign(po, {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    });

    // Recalculate totals if items changed
    if (updates.items) {
      po.subtotal = po.items.reduce((sum, item) => sum + item.totalPrice, 0);
      po.taxAmount = po.taxRate ? po.subtotal * (po.taxRate / 100) : 0;
      po.totalAmount = po.subtotal + (po.taxAmount || 0);
    }

    this.savePO(po);
    return { success: true };
  },

  /**
   * Add item to PO
   */
  addItem(
    poId: string,
    item: Omit<PurchaseOrderItem, 'id' | 'totalPrice'>,
    userId: string
  ): { success: boolean; error?: string } {
    const po = this.getPOById(poId);
    if (!po) {
      return { success: false, error: 'PO not found' };
    }

    if (po.status !== 'draft') {
      return { success: false, error: 'Can only add items to draft PO' };
    }

    const newItem: PurchaseOrderItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      totalPrice: item.quantity * item.unitPrice
    };

    po.items.push(newItem);
    po.subtotal = po.items.reduce((sum, i) => sum + i.totalPrice, 0);
    po.taxAmount = po.taxRate ? po.subtotal * (po.taxRate / 100) : 0;
    po.totalAmount = po.subtotal + (po.taxAmount || 0);
    po.updatedAt = new Date().toISOString();
    po.updatedBy = userId;

    this.savePO(po);
    return { success: true };
  },

  /**
   * Update item
   */
  updateItem(
    poId: string,
    itemId: string,
    updates: Partial<PurchaseOrderItem>,
    userId: string
  ): { success: boolean; error?: string } {
    const po = this.getPOById(poId);
    if (!po) {
      return { success: false, error: 'PO not found' };
    }

    const item = po.items.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    Object.assign(item, updates);
    item.totalPrice = item.quantity * item.unitPrice;

    po.subtotal = po.items.reduce((sum, i) => sum + i.totalPrice, 0);
    po.taxAmount = po.taxRate ? po.subtotal * (po.taxRate / 100) : 0;
    po.totalAmount = po.subtotal + (po.taxAmount || 0);
    po.updatedAt = new Date().toISOString();
    po.updatedBy = userId;

    this.savePO(po);
    return { success: true };
  },

  /**
   * Delete item
   */
  deleteItem(poId: string, itemId: string, userId: string): { success: boolean; error?: string } {
    const po = this.getPOById(poId);
    if (!po) {
      return { success: false, error: 'PO not found' };
    }

    po.items = po.items.filter(i => i.id !== itemId);
    po.subtotal = po.items.reduce((sum, i) => sum + i.totalPrice, 0);
    po.taxAmount = po.taxRate ? po.subtotal * (po.taxRate / 100) : 0;
    po.totalAmount = po.subtotal + (po.taxAmount || 0);
    po.updatedAt = new Date().toISOString();
    po.updatedBy = userId;

    this.savePO(po);
    return { success: true };
  },

  /**
   * Submit for approval
   */
  submitForApproval(poId: string, userId: string): { success: boolean; error?: string } {
    const po = this.getPOById(poId);
    if (!po) {
      return { success: false, error: 'PO not found' };
    }

    if (po.items.length === 0) {
      return { success: false, error: 'Cannot submit PO with no items' };
    }

    if (!po.vendorName || !po.deliveryAddress) {
      return { success: false, error: 'Vendor and delivery address are required' };
    }

    po.status = 'pending_approval';
    po.updatedAt = new Date().toISOString();
    po.updatedBy = userId;

    this.savePO(po);
    return { success: true };
  },

  /**
   * Get PO by ID
   */
  getPOById(poId: string): PurchaseOrder | null {
    const all = this.getAllPOs();
    return all.find(po => po.id === poId) || null;
  },

  /**
   * Get PO by PR ID (Strictly isolated by PR Number)
   */
  getPOByPRId(prId: string): PurchaseOrder | null {
    const pr = procurementRequestService.getRequestById(prId);
    const prNumber = pr ? pr.prNumber : prId;
    
    const all = this.getAllPOs();
    return all.find(po => po.prNumber === prNumber || po.prId === prId) || null;
  },

  /**
   * Get all POs
   */
  getAllPOs(): PurchaseOrder[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Save PO
   */
  savePO(po: PurchaseOrder): void {
    const all = this.getAllPOs();
    const index = all.findIndex(p => p.id === po.id);

    if (index >= 0) {
      all[index] = po;
    } else {
      all.push(po);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  },

  /**
   * Delete PO
   */
  deletePO(poId: string): { success: boolean; error?: string } {
    const po = this.getPOById(poId);
    if (!po) {
      return { success: false, error: 'PO not found' };
    }

    if (po.status === 'sent_to_vendor' || po.status === 'completed') {
      return { success: false, error: 'Cannot delete sent or completed PO' };
    }

    const all = this.getAllPOs();
    const filtered = all.filter(p => p.id !== poId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    return { success: true };
  }
};