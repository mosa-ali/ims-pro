// ============================================================================
// PAYMENT/INVOICE SERVICE
// Payment and invoice management within procurement workspace
// ============================================================================

const STORAGE_KEY = 'payment_invoices_v1';

export interface PaymentInvoiceItem {
  id: string;
  poItemId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineAmount: number;
}

export interface PaymentInvoice {
  id: string;
  invoiceNumber: string; // Auto-generated: INV-2026-00001
  prId: string;
  prNumber: string;
  poId: string;
  poNumber: string;
  grnId?: string;
  grnNumber?: string;
  
  // Vendor
  vendorName: string;
  vendorInvoiceNumber?: string;
  vendorInvoiceDate?: string;
  
  // Items (THREE-WAY MATCHING)
  items: PaymentInvoiceItem[];
  
  // Financial
  currency: string;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  
  // Payment
  paymentTerms: string;
  dueDate: string;
  paymentMethod?: 'bank_transfer' | 'check' | 'cash' | 'credit_card';
  paymentStatus: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  
  paidAmount?: number;
  paidDate?: string;
  paymentReference?: string;
  
  // Approval
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  
  notes?: string;
  
  organizationId: string;
  operatingUnitId: string;
  projectId?: string;
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export const paymentInvoiceService = {
  
  generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const all = this.getAllInvoices();
    const thisYear = all.filter(inv => inv.invoiceNumber.startsWith(`INV-${year}`));
    const sequence = (thisYear.length + 1).toString().padStart(5, '0');
    return `INV-${year}-${sequence}`;
  },

  /**
   * Create invoice from PO + GRN (THREE-WAY MATCHING)
   * PO → GRN → Invoice must match
   */
  createFromPOAndGRN(
    po: any, // PurchaseOrder
    grn: any // GoodsReceiptNote
  ): PaymentInvoice {
    // Check if already exists
    const existing = this.getInvoiceByPRId(po.prId);
    if (existing) {
      return existing;
    }

    // ❌ NO EMPTY ITEMS - Copy from PO (must match GRN)
    if (!po.items || po.items.length === 0) {
      throw new Error('PO has no items. Cannot create Invoice.');
    }

    if (!grn.items || grn.items.length === 0) {
      throw new Error('GRN has no items. Cannot create Invoice.');
    }

    // Map PO items to invoice items (based on RECEIVED quantities from GRN)
    const invoiceItems: PaymentInvoiceItem[] = po.items.map((poItem: any) => {
      // Find matching GRN item
      const grnItem = grn.items.find((g: any) => g.poItemId === poItem.id);
      const receivedQty = grnItem ? grnItem.receivedQuantity : poItem.quantity;

      return {
        id: `invitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        poItemId: poItem.id,
        description: poItem.description,
        quantity: receivedQty, // CRITICAL: Use RECEIVED qty, not ordered
        unit: poItem.unit,
        unitPrice: poItem.unitPrice,
        lineAmount: receivedQty * poItem.unitPrice
      };
    });

    // Calculate totals
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.lineAmount, 0);
    const taxAmount = po.taxAmount || 0;
    const totalAmount = subtotal + taxAmount;

    // ❌ USD 0 NOT ALLOWED
    if (totalAmount === 0) {
      throw new Error('Invoice total cannot be USD 0.');
    }

    // Calculate due date from payment terms
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Default Net 30

    const invoice: PaymentInvoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber: this.generateInvoiceNumber(),
      prId: po.prId,
      prNumber: po.prNumber,
      poId: po.id,
      poNumber: po.poNumber,
      grnId: grn.id,
      grnNumber: grn.grnNumber,
      
      vendorName: po.vendorName,
      vendorInvoiceNumber: `VINV-${Date.now()}`,
      vendorInvoiceDate: new Date().toISOString().split('T')[0],
      
      // REAL ITEMS (three-way matched)
      items: invoiceItems,
      
      currency: po.currency,
      subtotal,
      taxAmount,
      totalAmount,
      
      paymentTerms: po.paymentTerms || 'Net 30',
      dueDate: dueDate.toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending',
      
      approvalStatus: 'draft',
      
      organizationId: po.organizationId,
      operatingUnitId: po.operatingUnitId,
      projectId: po.projectId,
      
      notes: `Three-way match: ${po.poNumber} → ${grn.grnNumber} → Invoice`,
      
      createdAt: new Date().toISOString(),
      createdBy: po.createdBy,
      updatedAt: new Date().toISOString(),
      updatedBy: po.createdBy
    };

    this.saveInvoice(invoice);
    console.log(`[Invoice] ✅ Created ${invoice.invoiceNumber} - Total: ${invoice.currency} ${invoice.totalAmount}`);
    
    return invoice;
  },

  /**
   * Create invoice from PO ONLY (for services, food, vouchers - NO GRN)
   * PO → Invoice (two-way matching)
   */
  createFromPOOnly(
    po: any // PurchaseOrder
  ): PaymentInvoice {
    // Check if already exists
    const existing = this.getInvoiceByPRId(po.prId);
    if (existing) {
      return existing;
    }

    // ❌ NO EMPTY ITEMS - Copy from PO
    if (!po.items || po.items.length === 0) {
      throw new Error('PO has no items. Cannot create Invoice.');
    }

    // Map PO items to invoice items (full ordered quantities)
    const invoiceItems: PaymentInvoiceItem[] = po.items.map((poItem: any) => ({
      id: `invitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      poItemId: poItem.id,
      description: poItem.description,
      quantity: poItem.quantity,
      unit: poItem.unit,
      unitPrice: poItem.unitPrice,
      lineAmount: poItem.quantity * poItem.unitPrice
    }));

    // Calculate totals
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.lineAmount, 0);
    const taxAmount = po.taxAmount || 0;
    const totalAmount = subtotal + taxAmount;

    // ❌ USD 0 NOT ALLOWED
    if (totalAmount === 0) {
      throw new Error('Invoice total cannot be USD 0.');
    }

    // Calculate due date from payment terms
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Default Net 30

    const invoice: PaymentInvoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber: this.generateInvoiceNumber(),
      prId: po.prId,
      prNumber: po.prNumber,
      poId: po.id,
      poNumber: po.poNumber,
      // NO GRN for services
      
      vendorName: po.vendorName,
      vendorInvoiceNumber: `VINV-${Date.now()}`,
      vendorInvoiceDate: new Date().toISOString().split('T')[0],
      
      // REAL ITEMS from PO
      items: invoiceItems,
      
      currency: po.currency,
      subtotal,
      taxAmount,
      totalAmount,
      
      paymentTerms: po.paymentTerms || 'Net 30',
      dueDate: dueDate.toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending',
      
      approvalStatus: 'draft',
      
      organizationId: po.organizationId,
      operatingUnitId: po.operatingUnitId,
      projectId: po.projectId,
      
      notes: `Two-way match (services): ${po.poNumber} → Invoice (No GRN required)`,
      
      createdAt: new Date().toISOString(),
      createdBy: po.createdBy,
      updatedAt: new Date().toISOString(),
      updatedBy: po.createdBy
    };

    this.saveInvoice(invoice);
    console.log(`[Invoice] ✅ Created ${invoice.invoiceNumber} (No GRN) - Total: ${invoice.currency} ${invoice.totalAmount}`);
    
    return invoice;
  },

  updateInvoice(invoiceId: string, updates: Partial<PaymentInvoice>, userId: string): { success: boolean; error?: string } {
    const invoice = this.getInvoiceById(invoiceId);
    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    Object.assign(invoice, {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    });

    this.saveInvoice(invoice);
    return { success: true };
  },

  recordPayment(
    invoiceId: string,
    amount: number,
    paymentDate: string,
    paymentReference: string,
    userId: string
  ): { success: boolean; error?: string } {
    const invoice = this.getInvoiceById(invoiceId);
    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }

    if (invoice.approvalStatus !== 'approved') {
      return { success: false, error: 'Invoice must be approved before payment' };
    }

    invoice.paidAmount = (invoice.paidAmount || 0) + amount;
    invoice.paidDate = paymentDate;
    invoice.paymentReference = paymentReference;

    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
    } else {
      invoice.paymentStatus = 'partially_paid';
    }

    invoice.updatedAt = new Date().toISOString();
    invoice.updatedBy = userId;

    this.saveInvoice(invoice);
    return { success: true };
  },

  getInvoiceById(invoiceId: string): PaymentInvoice | null {
    const all = this.getAllInvoices();
    return all.find(inv => inv.id === invoiceId) || null;
  },

  getInvoiceByPRId(prId: string): PaymentInvoice | null {
    const all = this.getAllInvoices();
    return all.find(inv => inv.prId === prId) || null;
  },

  getAllInvoices(): PaymentInvoice[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveInvoice(invoice: PaymentInvoice): void {
    const all = this.getAllInvoices();
    const index = all.findIndex(inv => inv.id === invoice.id);

    if (index >= 0) {
      all[index] = invoice;
    } else {
      all.push(invoice);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
};