// ============================================================================
// PROCUREMENT WORKFLOW AUTOMATION SERVICE
// ✅ CORRECTED: PR → RFQ → QA/BA → PO
// Auto-triggers document creation and data flow on PR approval
// Enforces ERP-grade business logic and validation
// Integrated Management System (IMS)
// ============================================================================

import { procurementRequestService } from './procurementRequestService';
import { rfqService } from './rfqService';
import { analysisFormService } from './analysisFormService';
import { purchaseOrderService } from './purchaseOrderService';
import { tenderAnnouncementService } from './tenderAnnouncementService';
import { determineProcurementProcess } from '@/app/types/logistics.types';
import type { ProcurementRequest } from '@/app/types/logistics.types';

class ProcurementWorkflowAutomationService {
  /**
   * ✅ CORRECTED: Auto-triggers workflow on PR approval
   * Step 1: Creates RFQ (mandatory first step)
   * Step 2: QA/BA created only after RFQ is sent
   */
  onPRApproved(prId: string, approvedBy: string): void {
    console.log('🔄 [Workflow Automation] PR Approved - Starting auto-workflow', prId);

    const pr = procurementRequestService.getRequestById(prId);
    if (!pr) {
      console.error('❌ [Workflow] PR not found:', prId);
      return;
    }

    // Validate PR before proceeding
    const validation = this.validatePR(pr);
    if (!validation.isValid) {
      console.error('❌ [Workflow] PR validation failed:', validation.errors);
      throw new Error(`PR validation failed: ${validation.errors.join(', ')}`);
    }

    // ✅ STEP 1: Auto-create RFQ (mandatory first step)
    console.log('📄 [Workflow] Step 1: Creating RFQ');
    const rfq = rfqService.autoCreateFromPR(pr, approvedBy);
    console.log('✅ [Workflow] RFQ created:', rfq.rfqNumber);

    console.log('ℹ️  [Workflow] RFQ must be sent to suppliers before QA/BA can be created');
    console.log('✅ [Workflow] Auto-workflow Step 1 completed successfully');
  }

  /**
   * ✅ STEP 2: Create QA/BA after RFQ is sent and responses received
   * Called manually from RFQ form when user clicks "Create Analysis"
   */
  createAnalysisFromRFQ(rfqId: string, userId: string): void {
    console.log('📊 [Workflow] Creating QA/BA from RFQ:', rfqId);

    const rfq = rfqService.getRFQById(rfqId);
    if (!rfq) {
      throw new Error('RFQ not found');
    }

    // ✅ VALIDATION: RFQ must be sent first
    const readiness = rfqService.isReadyForAnalysis(rfqId);
    if (!readiness.ready) {
      throw new Error(`Cannot create QA/BA: ${readiness.reason}`);
    }

    const pr = procurementRequestService.getRequestById(rfq.prId);
    if (!pr) {
      throw new Error('PR not found');
    }

    // Check if analysis already exists
    const existing = analysisFormService.getAnalysisByPRId(pr.id);
    if (existing) {
      console.log('ℹ️  [Workflow] Analysis already exists:', existing.id);
      return;
    }

    // Determine document type
    const isTender = rfq.procurementMethod === 'tender';
    const documentType = isTender ? 'bid' : 'quotation';

    // Auto-create analysis
    const analysis = analysisFormService.initialize(
      pr.id,
      pr.prNumber,
      documentType,
      pr.organizationId,
      pr.organizationName || '',
      pr.organizationLogo,
      pr.operatingUnitId,
      pr.operatingUnitName || '',
      pr.country || '',
      pr.currency,
      pr.budgetLineId,
      pr.budgetLineName,
      pr.budgetAvailable,
      userId
    );

    // Auto-populate items from RFQ (not PR directly)
    this.autoPopulateItemsFromRFQ(analysis.id, rfq, userId);

    console.log('✅ [Workflow] QA/BA created from RFQ:', analysis.qaNumber);
  }

  /**
   * Helper to create analysis from PR ID
   */
  createAnalysisFromRFQByPR(prId: string, userId: string): void {
    const rfq = rfqService.getRFQByPRId(prId);
    if (!rfq) {
      throw new Error('RFQ not found for this PR');
    }
    this.createAnalysisFromRFQ(rfq.id, userId);
  }

  /**
   * Auto-populate QA/BA items from RFQ
   */
  private autoPopulateItemsFromRFQ(analysisId: string, rfq: any, userId: string): void {
    console.log('📦 [Workflow] Auto-populating items from RFQ');

    const analysis = analysisFormService.getAnalysisById(analysisId);
    if (!analysis) return;

    const analysisItems = rfq.items.map((rfqItem: any) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemNumber: rfqItem.itemNumber,
      itemName: rfqItem.itemName,
      description: rfqItem.description || '',
      specification: rfqItem.specification || '',
      quantity: rfqItem.quantity,
      unit: rfqItem.unit,
      unitPrice: 0, // Will be filled from supplier responses
      totalPrice: 0,
      budgetLineId: '',
      budgetLineName: ''
    }));

    analysis.items = analysisItems;
    analysis.updatedAt = new Date().toISOString();
    analysis.updatedBy = userId;

    analysisFormService.updateAnalysis(analysis);
    console.log('✅ [Workflow] Items populated from RFQ:', analysisItems.length);
  }

  /**
   * Validates PR has required data before workflow progression
   */
  private validatePR(pr: ProcurementRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check total cost
    if (!pr.totalEstimatedCost || pr.totalEstimatedCost <= 0) {
      errors.push('Total estimated cost must be greater than 0');
    }

    // Check line items
    if (!pr.items || pr.items.length === 0) {
      errors.push('PR must have at least one line item');
    }

    // Check each line item
    pr.items?.forEach((item, index) => {
      if (!item.itemName || item.itemName.trim() === '') {
        errors.push(`Item ${index + 1}: Item name is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
      }
      if (!item.totalPrice || item.totalPrice <= 0) {
        errors.push(`Item ${index + 1}: Total price must be greater than 0`);
      }
    });

    // Check essential fields
    if (!pr.requestingDepartment) errors.push('Requesting department is required');
    if (!pr.currency) errors.push('Currency is required');
    if (!pr.budgetLineId) errors.push('Budget line is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Auto-creates PO from selected vendor in QA/BA
   */
  autoCreatePOFromAnalysis(
    analysisId: string,
    selectedVendorId: string,
    createdBy: string
  ): string | null {
    console.log('🛒 [Workflow] Auto-creating PO from analysis:', analysisId);

    const analysis = analysisFormService.getAnalysisById(analysisId);
    if (!analysis) {
      console.error('❌ [Workflow] Analysis not found:', analysisId);
      return null;
    }

    const pr = procurementRequestService.getRequestById(analysis.prId);
    if (!pr) {
      console.error('❌ [Workflow] PR not found:', analysis.prId);
      return null;
    }

    // Get selected vendor
    const vendor = analysis.vendors.find(v => v.id === selectedVendorId);
    if (!vendor) {
      console.error('❌ [Workflow] Vendor not found:', selectedVendorId);
      return null;
    }

    // Check if PO already exists
    const existingPO = purchaseOrderService.getPOByPRId(pr.id);
    if (existingPO) {
      console.log('ℹ️  [Workflow] PO already exists:', existingPO.poNumber);
      return existingPO.id;
    }

    // Create PO with vendor data
    const po = purchaseOrderService.createPO(
      pr.id,
      pr.prNumber,
      vendor.id,
      vendor.companyName,
      vendor.contactPerson || '',
      vendor.email || '',
      vendor.phone || '',
      vendor.address || '',
      pr.organizationId,
      pr.organizationName || '',
      pr.organizationLogo,
      pr.operatingUnitId,
      pr.operatingUnitName || '',
      pr.requestingDepartment,
      pr.currency,
      createdBy
    );

    // ✅ AUTO-POPULATE ITEMS FROM VENDOR QUOTATION
    this.autoPopulateItemsFromVendor(po.id, analysis, vendor, createdBy);

    console.log('✅ [Workflow] PO created and populated:', po.poNumber);
    return po.id;
  }

  /**
   * Auto-populates PO items from vendor quotation
   */
  private autoPopulateItemsFromVendor(
    poId: string,
    analysis: any,
    vendor: any,
    userId: string
  ): void {
    console.log('📦 [Workflow] Auto-populating PO items from vendor quotation');

    if (!analysis.items || analysis.items.length === 0) {
      console.warn('⚠️  [Workflow] No items in analysis document');
      return;
    }

    const po = purchaseOrderService.getPOById(poId);
    if (!po) {
      console.error('❌ [Workflow] PO not found:', poId);
      return;
    }

    // Get vendor quotation items (if available)
    const vendorQuotation = vendor.quotation || {};
    const vendorItems = vendorQuotation.items || [];

    // Map analysis items to PO items with vendor pricing
    const poItems = analysis.items.map((item: any) => {
      // Try to find vendor pricing for this item
      const vendorItem = vendorItems.find(
        (vi: any) => vi.itemNumber === item.itemNumber || vi.itemName === item.itemName
      );

      const unitPrice = vendorItem?.unitPrice || vendor.totalPrice / analysis.items.length || item.unitPrice;
      const totalPrice = unitPrice * item.quantity;

      return {
        id: `po-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemNumber: item.itemNumber,
        itemName: item.itemName,
        description: item.description || '',
        specification: item.specification || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        budgetLineId: item.budgetLineId,
        budgetLineName: item.budgetLineName,
        deliveryDate: vendorItem?.deliveryDate || '',
        status: 'pending' as const
      };
    });

    // Update PO with items
    po.items = poItems;
    po.subtotal = poItems.reduce((sum, item) => sum + item.totalPrice, 0);
    po.totalAmount = po.subtotal; // Can add tax/shipping later
    po.updatedAt = new Date().toISOString();
    po.updatedBy = userId;

    purchaseOrderService.updatePO(po);

    console.log('✅ [Workflow] PO items populated:', poItems.length, 'items, Total:', po.totalAmount);
  }

  /**
   * Gets workflow status for a PR
   */
  getWorkflowStatus(prId: string): {
    prApproved: boolean;
    rfqCreated: boolean;
    rfqSent: boolean;
    tenderAnnounced: boolean;
    announcementClosed: boolean;
    analysisCreated: boolean;
    analysisCompleted: boolean;
    poCreated: boolean;
    poIssued: boolean;
    nextAction: string;
    isTender: boolean;
  } {
    const pr = procurementRequestService.getRequestById(prId);
    if (!pr) {
      return {
        prApproved: false, rfqCreated: false, rfqSent: false, tenderAnnounced: false, 
        announcementClosed: false, analysisCreated: false, analysisCompleted: false, 
        poCreated: false, poIssued: false, nextAction: 'Unknown', isTender: false
      };
    }
    
    const prNumber = pr.prNumber;
    const isTender = determineProcurementProcess(pr.totalEstimatedCost).requiresCBA;
    
    // Auth-linkage by PR Number
    const rfq = rfqService.getRFQByPRNumber(prNumber);
    const analysis = analysisFormService.getAnalysisByPRId(prId); // Now uses prNumber internally
    const po = purchaseOrderService.getPOByPRId(prId); // Now uses prNumber internally

    // Tender specific data
    const prAnn = tenderAnnouncementService.getAnnouncementByPRId(prId); // Now uses prNumber internally
    
    const today = new Date().toISOString().split('T')[0];
    const tenderAnnounced = !!prAnn && !!prAnn.startDate && prAnn.status !== 'draft';
    const announcementClosed = !!prAnn && !!prAnn.endDate && today >= prAnn.endDate;

    const prApproved = pr?.status === 'approved';
    const rfqCreated = !!rfq;
    const rfqSent = rfq?.status === 'sent';
    const analysisCreated = !!analysis;
    const analysisCompleted = analysis?.status === 'completed';
    const poCreated = !!po;
    const poIssued = po?.status === 'issued' || po?.status === 'completed';

    let nextAction = 'Unknown';
    if (!prApproved) {
      nextAction = 'Approve PR';
    } else if (isTender) {
      if (!tenderAnnounced) {
        nextAction = 'Announce Tender (Manual)';
      } else if (!announcementClosed) {
        nextAction = 'Wait for Announcement Closing';
      } else if (!analysisCreated) {
        nextAction = 'Create Bid Analysis (BA) (Manual)';
      } else if (!analysisCompleted) {
        nextAction = 'Complete Bid Evaluation';
      } else if (!poCreated) {
        nextAction = 'Create Purchase Order (Auto)';
      } else if (!poIssued) {
        nextAction = 'Issue Purchase Order';
      } else {
        nextAction = 'Workflow Complete';
      }
    } else {
      // Quotation path
      if (!rfqCreated) {
        nextAction = 'Create RFQ (Auto)';
      } else if (!rfqSent) {
        nextAction = 'Send RFQ to Suppliers';
      } else if (!analysisCreated) {
        nextAction = 'Create Quotation Analysis (QA) (Manual)';
      } else if (!analysisCompleted) {
        nextAction = 'Complete Vendor Analysis';
      } else if (!poCreated) {
        nextAction = 'Create Purchase Order (Auto)';
      } else if (!poIssued) {
        nextAction = 'Issue Purchase Order';
      } else {
        nextAction = 'Workflow Complete';
      }
    }

    return {
      prApproved,
      rfqCreated,
      rfqSent,
      tenderAnnounced,
      announcementClosed,
      analysisCreated,
      analysisCompleted,
      poCreated,
      poIssued,
      nextAction,
      isTender
    };
  }
}

export const procurementWorkflowAutomationService = new ProcurementWorkflowAutomationService();