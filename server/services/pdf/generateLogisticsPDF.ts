 /**
 * ============================================================================
 * UNIFIED LOGISTICS PDF GENERATION SERVICE - CORRECTED
 * ============================================================================
 * 
 * FIX: Added proper validation for ctx.scope and ctx.user
 * - Validates ctx.scope exists before accessing organizationId/operatingUnitId
 * - Validates ctx.user exists before accessing id
 * - Provides clear error messages when context is missing
 * 
 * Generates PDFs for all logistics documents:
 * - BOM (Bid Opening Minutes)
 * - Purchase Requests (PR)
 * - Goods Receipt Notes (GRN)
 * - Request for Quotation (RFQ)
 * - Bid Receipt Acknowledgement (BRA)
 * - Bid Evaluation Checklist (BEC)
 * - Competitive Bid Analysis (CBA)
 * - Stock Issues
 * - Returned Items
 * 
 * KEY FEATURES:
  * ✅ Generates PDFs for: BOM, PR, PO, GRN, RFQ, BRA, BEC, CBA, Stock Issues, Returned Items
 * ✅ Returns base64 PDF (not localhost URLs)
 * ✅ Intelligent caching to avoid regeneration
 * ✅ S3 integration with storagePut()
 * ✅ Database metadata storage in generatedDocuments
 * ✅ Bilingual support (English & Arabic)
 * ✅ Comprehensive error handling with TRPCError
 * ✅ Proper logging for debugging
 * ✅ FIXED: Validates ctx.scope and ctx.user before use
 * 
 * INTEGRATED WITH:
 * - generatedDocuments table for metadata storage
 * - storagePut for S3 uploads
 * - buildPdfHeader for unified headers
 * - OfficialPdfEngine for PDF rendering
 * 
 * Usage in logisticsRouter:
 * ```
 * generatePDF: generatePdfProcedure,
 * ```
 */

import { z } from 'zod';
import { router, scopedProcedure } from '../../_core/trpc';
import { TRPCError } from '@trpc/server';
import { eq, and, inArray, asc } from 'drizzle-orm';
import {
  bidOpeningMinutes,
  purchaseRequests,
  purchaseRequestLineItems,
  goodsReceiptNotes,
  grnLineItems,
  stockIssued,
  stockIssuedLineItems,
  returnedItems,
  returnedItemLineItems,
  generatedDocuments,
  bidAnalysisBidders,
  bomApprovalSignatures,
  vendors,
  purchaseOrders,
  purchaseOrderLineItems,
  rfqVendors,
  bidAnalyses,
  bidderAcknowledgementSignatures,
  bidEvaluationCriteria,
  bidEvaluationScores,
} from 'drizzle/schema';

// ✅ IMPORTS: Use storagePut and generatedDocuments
import { storagePut } from '../../storage';
import fs from 'fs/promises';
import path from 'path';
import { buildOfficialPdfContext } from '../pdf/buildOfficialPdfContext';
import { generateCBAPDF } from './templates/logistics/cbaPdfGenerator';
import { generatePurchaseOrderPDF } from './templates/logistics/poGeneratePDF';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type DocumentType =
  | 'bom'
  | 'purchaseRequest'
  | 'purchaseOrder'
  | 'grn'
  | 'rfq'
  | 'bidReceiptAcknowledgement'
  | 'bidEvaluationChecklist'
  | 'cba'
  | 'qa'
  | 'sac'
  | 'stockIssue'
  | 'returnedItems';

interface PdfGenerationResult {
  success: boolean;
  pdf: string; // Base64 encoded PDF
  filename: string;
  documentNumber: string;
  s3Url: string;
  syncedToCentralDocuments: boolean;
  isNewGeneration: boolean;
}

interface PdfData {
  [key: string]: any;
}

/**
 * Document type to entity type mapping
 */
const documentTypeMapping: Record<DocumentType, { entityType: string; documentType: string }> = {
  bom: { entityType: 'bid_opening_minutes', documentType: 'BOM_PDF' },
  purchaseRequest: { entityType: 'purchase_request', documentType: 'PR_PDF' },
  purchaseOrder: { entityType: 'purchase_order', documentType: 'PO_PDF' },
  grn: { entityType: 'goods_receipt_note', documentType: 'GRN_PDF' },
  rfq: { entityType: 'rfq_vendor', documentType: 'RFQ_PDF' },
  bidReceiptAcknowledgement: { entityType: 'bid_receipt_acknowledgement', documentType: 'BRA_PDF' },
  bidEvaluationChecklist: { entityType: 'bid_evaluation_checklist', documentType: 'BEC_PDF' },
  cba: { entityType: 'competitive_bid_analysis', documentType: 'CBA_PDF' },
  stockIssue: { entityType: 'stock_issue', documentType: 'STOCK_ISSUE_PDF' },
  returnedItems: { entityType: 'returned_items', documentType: 'RETURNED_ITEMS_PDF' },
  qa: {
  entityType: 'quotation_analysis',
  documentType: 'QA_PDF',
  },

  sac: {
    entityType: 'service_acceptance_certificate',
    documentType: 'SAC_PDF',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format SQL date to YYYY-MM-DD
 */
const formatSqlDate = (dateValue?: string | Date | null): string | undefined => {
  if (!dateValue) return undefined;
  const date = new Date(dateValue);
  return date.toISOString().split('T')[0];
};

/**
 * Generate PDF filename based on document type and number
 */
function generatePdfFileName(
  documentType: DocumentType,
  documentNumber: string,
  language: string
): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const langSuffix = language === 'ar' ? '_ar' : '_en';
  return `${documentType}-${documentNumber}-${timestamp}${langSuffix}.pdf`;
}

/**
 * Validate PDF buffer starts with PDF magic bytes
 */
function isValidPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) return false;
  // PDF files start with %PDF
  return buffer.toString('ascii', 0, 4) === '%PDF';
}

/**
 * Convert Buffer to Base64 string
 */
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

// ============================================================================
// PDF GENERATION FUNCTIONS (One per document type)
// ============================================================================

/**
 * Generate BOM (Bid Opening Minutes) PDF
 */
async function generateBomPdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  const bomData = await db.query.bidOpeningMinutes.findFirst({
    where: eq(bidOpeningMinutes.id, documentId),
  });

  if (!bomData) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Bid Opening Minutes not found: ID=${documentId}`,
    });
  }

  console.log(`[Logistics PDF] Fetching BOM data for ID=${documentId}`);

  // ✅ FETCH BIDDERS
  let bidders: any[] = [];
  if (bomData.bidAnalysisId) {
      bidders = await db.query.bidAnalysisBidders.findMany({
      where: and(
        eq(
          bidAnalysisBidders.bidAnalysisId,
          bomData.bidAnalysisId
        ),

        // ONLY received or valid bidders
        inArray(
          bidAnalysisBidders.submissionStatus,
          ['received', 'valid']
        )
      ),

      with: {
        supplier: true,
      },
    });
    console.log(`[Logistics PDF] Fetched ${bidders.length} bidders`);
  }

  // ✅ FETCH SIGNATURES
  const signatures = await db.query.bomApprovalSignatures.findMany({
    where: eq(bomApprovalSignatures.bomId, bomData.id),
  });
  console.log(`[Logistics PDF] Fetched ${signatures.length} signatures`);

  // ✅ FETCH BRANDING
  // ====================================================================
  // ✅ FIX: Validate ctx.user exists before accessing id
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: bomData.organizationId,
    operatingUnitId: bomData.operatingUnitId || '',
    userId: userId || '',
    language: language as 'en' | 'ar',
    documentType: 'bid_opening_minutes',
    documentId,
    documentModule: 'Logistics',
  });

  // ✅ BUILD PDF DATA
  const pdfData: PdfData = {
    context: officialContext,
    bomNumber: bomData.minutesNumber || '',
    bidDate: formatSqlDate(bomData.openingDate) || '',
    openingTime: bomData.openingTime || '',
    location: bomData.openingVenue || '',
    openingMode: bomData.openingMode || '',

    chairpersonName: bomData.chairpersonName || '',
    member1Name: bomData.member1Name || '',
    member2Name: bomData.member2Name || '',
    member3Name: bomData.member3Name || '',

    totalBidsReceived: bomData.totalBidsReceived || 0,
    bidsOpenedCount: bomData.bidsOpenedCount || 0,

    openingNotes: bomData.openingNotes || '',
    irregularities: bomData.irregularities || '',

    bidders: bidders.map((b: any) => ({
      bidderName:
        b.bidderName ||
        b.supplier?.name ||
        b.supplier?.vendorName ||
        'Unknown Bidder',

      submissionStatus:
        b.submissionStatus || 'received',

      submissionDate: b.submissionDate
        ? new Date(b.submissionDate)
            .toISOString()
            .split('T')[0]
        : '',
    })),

    signatures: signatures.map((s: any) => ({
      memberName: s.memberName || '',
      role: s.role || '',
      signatureDataUrl: s.signatureDataUrl || '',
    })),

    language: language || 'en',
  };

  // ✅ GENERATE PDF USING TEMPLATE
  const { generateBidOpeningMinutesPDF } = await import('./templates/logistics/bomPdfGenerator');
  const result: { buffer: Buffer; fileName: string } = await generateBidOpeningMinutesPDF(pdfData as any);
  
  if (!isValidPdfBuffer(result.buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated BOM PDF is invalid',
    });
  }

  console.log(`[Logistics PDF] BOM PDF generated successfully: ${result.fileName}`);

  return {
    buffer: result.buffer,
    documentNumber: bomData.minutesNumber || `BOM-${bomData.id}`,
  };
}

/**
 * Generate Purchase Request PDF
 */
async function generatePRPdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  const pr = await db.query.purchaseRequests.findFirst({
    where: eq(purchaseRequests.id, documentId),
  });

  if (!pr) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Purchase Request not found: ID=${documentId}`,
    });
  }

  // ✅ ADD VALIDATION FOR organizationId
  if (!pr.organizationId) {
    console.error(`[Logistics PDF] PR missing organizationId: ID=${documentId}, pr=`, pr);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Purchase Request is missing organizationId: ID=${documentId}`,
    });
  }

  console.log(`[Logistics PDF] Fetching PR data for ID=${documentId}, orgId=${pr.organizationId}`);

  // ✅ FETCH LINE ITEMS - Change findFirst to findMany
  const lineItems = await db.query.purchaseRequestLineItems.findMany({
    where: eq(purchaseRequestLineItems.purchaseRequestId, documentId),
  });
  console.log(`[Logistics PDF] Fetched ${lineItems.length} PR line items`);

  // ====================================================================
  // CENTRALIZED OFFICIAL PDF CONTEXT
  // Uses:
  // - organizations
  // - operating_units
  // - organization_branding
  // - language
  // - scope isolation
  // ====================================================================

  // ✅ FIX: Validate ctx.user exists before accessing id
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: pr.organizationId,
    operatingUnitId: pr.operatingUnitId ?? undefined,
    userId: userId || '',
    language: language as 'en' | 'ar',
    documentType: 'purchase_request',
    documentId,
    documentModule: 'Logistics',
  });

  // ====================================================================
  // STEP 3: Extract approval workflow signatures from PR record
  // ====================================================================
  console.log(`[Logistics PDF] Extracting approval signatures from PR record`);

  // Build approvals object from PR record columns
  const approvalsMap: Record<string, any> = {
    requested_by: {
      name: pr.requesterName || '-',
      title: undefined,
      date: pr.prDate ? new Date(pr.prDate).toISOString().split('T')[0] : undefined,
      signature: undefined,
    },
    logistics_validation: {
      name: pr.logisticsSignerName || '-',
      title: pr.logisticsSignerTitle || undefined,
      date: pr.logValidatedOn ? new Date(pr.logValidatedOn).toISOString().split('T')[0] : undefined,
      signature: pr.logisticsSignatureDataUrl || undefined,
    },
    finance_validation: {
      name: pr.financeSignerName || '-',
      title: pr.financeSignerTitle || undefined,
      date: pr.finValidatedOn ? new Date(pr.finValidatedOn).toISOString().split('T')[0] : undefined,
      signature: pr.financeSignatureDataUrl || undefined,
    },
    final_approval: {
      name: pr.pmSignerName || '-',
      title: pr.pmSignerTitle || undefined,
      date: pr.approvedOn ? new Date(pr.approvedOn).toISOString().split('T')[0] : undefined,
      signature: pr.pmSignatureDataUrl || undefined,
    },
  };
  console.log(`[Logistics PDF] ✅ Approval signatures extracted`);

  // ✅ BUILD PDF DATA
  const pdfData: PdfData = {
    context: officialContext,
    primaryColor: officialContext.primaryColor,
    secondaryColor: officialContext.secondaryColor,
    accentColor: officialContext.accentColor,
    footerText: officialContext.footerText,
    department: pr.department || '',

    prNumber: pr.prNumber,
    prDate: pr.createdAt?.toString() || new Date().toISOString().slice(0, 19).replace('T', ' '),
    projectTitle: pr.projectTitle || '',
    category: pr.category || '',
    urgency: pr.urgency || undefined,

    requesterName: pr.requesterName || '',
    requesterTitle: pr.requesterEmail || undefined,

    donorName: pr.donorName || undefined,
    budgetCode: pr.budgetCode || undefined,
    currency: pr.currency || '',
    exchangeTo: pr.exchangeTo || '',
    total: Number(pr.total ?? 0),
    prTotalUsd: Number(pr.prTotalUsd ?? pr.total ?? 0),
    totalPrice: Number(pr.total ?? 0),

    neededBy: pr.neededBy?.toString(),

    justification: pr.justification || undefined,

    lineItems: lineItems.map((item: any) => ({
      description: item.description,
      quantity: Number(item.quantity || 0),
      unit: item.unit || '',
      unitPrice: Number(item.unitPrice || 0),
      recurrence: Number(item.recurrence || 1),
      prTotalUsd: Number(item.totalPrice || 0),
    })),

    // ✅ APPROVAL WORKFLOW - REAL DATA FROM DB
    approvals: {
      requestedBy: approvalsMap['requested_by'] || {
        name: '-',
        title: undefined,
        date: undefined,
        signature: undefined,
      },
      logisticsValidation: approvalsMap['logistics_validation'] || {
        name: '-',
        title: undefined,
        date: undefined,
        signature: undefined,
      },
      financeValidation: approvalsMap['finance_validation'] || {
        name: '-',
        title: undefined,
        date: undefined,
        signature: undefined,
      },
      finalApproval: approvalsMap['final_approval'] || {
        name: '-',
        title: undefined,
        date: undefined,
        signature: undefined,
      },
    },

    language: language as 'en' | 'ar',
  };

  // ✅ GENERATE PDF USING TEMPLATE
  const { generatePDF: generatePRPDF } = await import('./templates/logistics/prPdfGenerator');
  const result: { buffer: Buffer; fileName: string } = await generatePRPDF(pdfData as any);

  if (!isValidPdfBuffer(result.buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated PR PDF is invalid',
    });
  }

  console.log(`[Logistics PDF] PR PDF generated successfully: ${result.fileName}`);

  return {
    buffer: result.buffer,
    documentNumber: pr.prNumber,
  };
}

/**
 * Generate GRN (Goods Receipt Note) PDF
 */
async function generateGRNPDF(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {

  // ============================================================
  // STEP 1: Fetch GRN
  // ============================================================

  const grn = await db.query.goodsReceiptNotes.findFirst({
    where: eq(goodsReceiptNotes.id, documentId),
  });

  if (!grn) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `GRN not found: ID=${documentId}`,
    });
  }

  console.log(
    `[Logistics PDF] Fetching GRN data for ID=${documentId}`
  );

  // ============================================================
  // STEP 2: Fetch line items
  // ============================================================

  const lineItems = await db.query.grnLineItems.findMany({
    where: eq(grnLineItems.grnId, documentId),
  });

  console.log(
    `[Logistics PDF] Fetched ${lineItems.length} GRN line items`
  );

  // ============================================================
  // STEP 3: Build centralized official context
  // ============================================================

  // ✅ FIX: Validate ctx.user exists before accessing id
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: grn.organizationId,
    operatingUnitId: grn.operatingUnitId ?? undefined,
    userId: userId || '',
    language: language as 'en' | 'ar',
    documentType: 'goods_receipt_note',
    documentId,
    documentModule: 'Logistics',
  });

  // ============================================================
  // STEP 4: Fetch related PO
  // ============================================================

  let po: any = null;

  if (grn.purchaseOrderId) {
    po = await db.query.purchaseOrders.findFirst({
      where: eq(
        purchaseOrders.id,
        grn.purchaseOrderId
      ),
    });
  }

  // ============================================================
  // STEP 5: Fetch vendor
  // ============================================================

  let vendor: any = null;

  if (grn.supplierId) {
    vendor = await db.query.vendors.findFirst({
      where: eq(vendors.id, grn.supplierId),
    });
  }

  // ============================================================
  // STEP 6: Build PDF data
  // ============================================================

  const pdfData: PdfData = {
    // REQUIRED
    context: officialContext,

    // Theme / branding
    primaryColor: officialContext.primaryColor,
    secondaryColor: officialContext.secondaryColor,
    accentColor: officialContext.accentColor,
    footerText: officialContext.footerText,

    // Department
    department: 'Warehouse',

    // Main GRN data
    grnNumber: grn.grnNumber,
    grnDate: grn.grnDate,

    status: grn.status,

    warehouse: grn.warehouse,
    warehouseAr: grn.warehouseAr,

    deliveryNoteNumber: grn.deliveryNoteNumber,
    invoiceNumber: grn.invoiceNumber,

    receivedBy: grn.receivedBy,
    inspectedBy: grn.inspectedBy,

    totalReceived: Number(grn.totalReceived ?? 0),
    totalAccepted: Number(grn.totalAccepted ?? 0),
    totalRejected: Number(grn.totalRejected ?? 0),

    remarks: grn.remarks,
    remarksAr: grn.remarksAr,

    // PO
    poNumber: po?.poNumber,

    // Vendor
    vendorName:
      vendor?.name ||
      vendor?.vendorName ||
      '',

    // Line items
    lineItems: lineItems.map((item: any) => ({
      description: item.description || '',

      unit: item.unit || '',

      orderedQty: Number(item.orderedQty ?? 0),

      receivedQty: Number(item.receivedQty ?? 0),

      acceptedQty: Number(item.acceptedQty ?? 0),

      rejectedQty: Number(item.rejectedQty ?? 0),

      remarks: item.remarks || '',
    })),

    language: language as 'en' | 'ar',
  };

  // ============================================================
  // STEP 7: Generate PDF using centralized template
  // ============================================================

  const { generateGRNPDF: generateGRN } = await import(
    './templates/logistics/grnPDFGenerator'
  );

  const result: {
    buffer: Buffer;
    fileName: string;
  } = await generateGRN(pdfData as any);

  // ============================================================
  // STEP 8: Validate generated PDF
  // ============================================================

  if (!isValidPdfBuffer(result.buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated GRN PDF is invalid',
    });
  }

  console.log(
    `[Logistics PDF] GRN PDF generated successfully: ${result.fileName}`
  );

  // ============================================================
  // STEP 9: Return result
  // ============================================================

  return {
    buffer: result.buffer,
    documentNumber:
      grn.grnNumber || `GRN-${grn.id}`,
  };
}

/**
 * Generate RFQ (Request for Quotation) PDF
 */
async function generateRFQPdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  // ============================================================
  // STEP 1: Fetch RFQ Vendor
  // ============================================================
  const rfqVendor = await db.query.rfqVendors.findFirst({
    where: eq(rfqVendors.id, documentId),
  });

  if (!rfqVendor) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `RFQ Vendor not found: ID=${documentId}`,
    });
  }

  console.log(`[Logistics PDF] Fetching RFQ data for ID=${documentId}`);

  // ============================================================
  // STEP 2: Fetch related PR
  // ============================================================
  const pr = await db.query.purchaseRequests.findFirst({
    where: eq(purchaseRequests.id, rfqVendor.purchaseRequestId),
  });

  if (!pr) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Purchase Request not found for RFQ: ID=${rfqVendor.purchaseRequestId}`,
    });
  }

  // ============================================================
  // STEP 3: Fetch PR line items
  // ============================================================
  const lineItems = await db.query.purchaseRequestLineItems.findMany({
    where: eq(purchaseRequestLineItems.purchaseRequestId, pr.id),
  });

  console.log(`[Logistics PDF] Fetched ${lineItems.length} RFQ line items`);

  // ============================================================
  // STEP 4: Build centralized official context
  // ============================================================

  // ✅ FIX: Validate ctx.user exists before accessing id
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: pr.organizationId,
    operatingUnitId: pr.operatingUnitId ?? undefined,
    userId: userId || '',
    language: language as 'en' | 'ar',
    documentType: 'rfq_vendor',
    documentId,
    documentModule: 'Logistics',
  });

  // ============================================================
  // STEP 5: Build PDF data
  // ============================================================
  const pdfData: PdfData = {
    // REQUIRED
    context: officialContext,

    // Department
    department: 'Procurement',

    // RFQ Details
    rfqNumber: rfqVendor.rfqNumber || '',
    issueDate: formatSqlDate(rfqVendor.issueDate) || '',
    submissionDeadline: formatSqlDate(rfqVendor.submissionDeadline),

    // PR Reference
    prNumber: pr.prNumber,
    requesterName: pr.requesterName,
    priority: pr.urgency,
    requiredDeliveryDate: formatSqlDate(pr.neededBy),

    // Content
    justification: pr.justification,

    // Line items
    lineItems: lineItems.map((item: any) => ({
      description: item.description || '',
      specifications: item.specifications || '',
      quantity: Number(item.quantity || 0),
      unit: item.unit || '',
      purpose: item.purpose || '',
    })),

    // Submission Instructions
    submissionInstructions: {
      format: 'Provide unit prices for each item listed above',
      currency: `Specify currency (${pr.currency || 'USD'})`,
      deliveryTerms: 'Include estimated delivery time in days',
      warranty: 'Specify warranty period in months (if applicable)',
      validity: 'Quotation valid for at least 30 days from submission',
      reference: `Please quote RFQ Number ${rfqVendor.rfqNumber} in your response`,
    },

    // Terms & Conditions
    termsAndConditions: [
      'Prices should include all applicable taxes and duties',
      'Payment terms will be discussed after quotation evaluation',
      'The organization reserves the right to accept or reject any quotation',
      'Partial fulfillment of items may be considered',
      'Quality certifications and compliance documents may be requested',
    ],

    language: language as 'en' | 'ar',
  };

  // ============================================================
  // STEP 6: Generate PDF using centralized template
  // ============================================================
  const { generateRFQPDF } = await import(
    './templates/logistics/rfqPdfGenerator'
  );

  const result: {
    buffer: Buffer;
    fileName: string;
  } = await generateRFQPDF(pdfData as any);

  // ============================================================
  // STEP 7: Validate generated PDF
  // ============================================================
  if (!isValidPdfBuffer(result.buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated RFQ PDF is invalid',
    });
  }

  console.log(
    `[Logistics PDF] RFQ PDF generated successfully: ${result.fileName}`
  );

  // ============================================================
  // STEP 8: Return result
  // ============================================================
  return {
    buffer: result.buffer,
    documentNumber: rfqVendor.rfqNumber || `RFQ-${rfqVendor.id}`,
  };
}

/**
 * Generate Bid Receipt Acknowledgement PDF
 * ✅ NEW: Added BRA PDF generation using OfficialPdfEngine
 */
async function generateBidReceiptAcknowledgementPdf(
  db: any,
  ctx: any,
  documentId: number,
  bidderId: number | undefined,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  // ============================================================
  // STEP 1: Fetch Bid Analysis
  // ============================================================
  const bidAnalysis = await db.query.bidAnalyses.findFirst({
    where: eq(bidAnalyses.id, documentId),
  });

  if (!bidAnalysis) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Bid Analysis not found: ID=${documentId}`,
    });
  }

  console.log(`[Logistics PDF] Fetching Bid Receipt Acknowledgement data for ID=${documentId}`);

  // ============================================================
  // STEP 2: Fetch related PR
  // ============================================================
  const pr = await db.query.purchaseRequests.findFirst({
    where: eq(purchaseRequests.id, bidAnalysis.purchaseRequestId),
  });

  if (!pr) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Purchase Request not found for Bid Analysis: ID=${bidAnalysis.purchaseRequestId}`,
    });
  }

  // ============================================================
  // STEP 3: Fetch first bidder (or use provided bidderId from context)
  // ============================================================
  let selectedBidder: any = null;

// ✅ If bidderId provided, fetch exact bidder
if (bidderId) {
  selectedBidder = await db.query.bidAnalysisBidders.findFirst({
    where: and(
      eq(bidAnalysisBidders.id, bidderId),
      eq(bidAnalysisBidders.bidAnalysisId, documentId)
    ),
  });
}

  if (!selectedBidder) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No bidder found for Bid Analysis: ID=${documentId}`,
    });
  }

  // ============================================================
  // STEP 4: Fetch digital signature if available
  // ============================================================
  let signature: any = null;
  try {
    signature = await db.query.bidderAcknowledgementSignatures.findFirst({
      where: and(
        eq(bidderAcknowledgementSignatures.bidAnalysisId, documentId),
        eq(bidderAcknowledgementSignatures.bidderId, selectedBidder.id)
      ),
    });
  } catch {
    // Table may not exist yet
    signature = null;
  }

  // ============================================================
  // STEP 5: Build centralized official context
  // ============================================================

  // ✅ FIX: Validate ctx.user exists before accessing id
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: pr.organizationId,
    operatingUnitId: pr.operatingUnitId ?? undefined,
    userId: userId || '',
    language: language as 'en' | 'ar',
    documentType: 'bid_receipt_acknowledgement',
    documentId,
    documentModule: 'Logistics',
  });

  // ============================================================
  // STEP 6: Format dates
  // ============================================================
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  const now = new Date();
  const receiptDateTime = `${now.toLocaleDateString(locale)} ${now.toLocaleTimeString(locale)}`;
  const submissionDateStr = selectedBidder.submissionDate
    ? new Date(selectedBidder.submissionDate).toLocaleDateString(locale)
    : 'N/A';

  // ============================================================
  // STEP 7: Build PDF data
  // ============================================================
  const pdfData: PdfData = {
    // REQUIRED
    context: officialContext,

    // Department
    department: 'Logistics & Procurement',

    // Receipt Details
    receiptReference: bidAnalysis.announcementReference || `BA-${bidAnalysis.id}`,
    receiptDateTime,
    prNumber: pr.prNumber,
    tenderReference: bidAnalysis.announcementReference,
    cbaNumber: bidAnalysis.cbaNumber,
    operatingUnit: bidAnalysis.operatingUnitId?.toString(),

    // Bidder Details
    bidderName: selectedBidder.bidderName || 'Unknown Bidder',
    submissionDate: submissionDateStr,
    submissionStatus: selectedBidder.submissionStatus || 'received',

    // Digital Signature
    logisticsSignature: signature ? {
      signerName: signature.signerName || '',
      signerTitle: signature.signerTitle,
      signatureImageUrl: signature.signatureImageUrl,
      signedAt: signature.signedAt ? new Date(signature.signedAt).toLocaleString(locale) : undefined,
      verificationCode: signature.verificationCode,
    } : undefined,

    language: language as 'en' | 'ar',
  };

  // ============================================================
  // STEP 8: Generate PDF using centralized template
  // ============================================================
  const { generateBidReceiptAcknowledgementPDF } = await import(
    './templates/logistics/bidReceiptAcknowledgementPDF'
  );

  const result: {
    buffer: Buffer;
    fileName: string;
  } = await generateBidReceiptAcknowledgementPDF(pdfData as any);

  // ============================================================
  // STEP 9: Validate generated PDF
  // ============================================================
  if (!isValidPdfBuffer(result.buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated Bid Receipt Acknowledgement PDF is invalid',
    });
  }

  console.log(
    `[Logistics PDF] Bid Receipt Acknowledgement PDF generated successfully: ${result.fileName}`
  );

  // ============================================================
  // STEP 10: Return result
  // ============================================================
  return {
    buffer: result.buffer,
    documentNumber: bidAnalysis.announcementReference || `BA-${bidAnalysis.id}`,
  };
}

/**
 * Generate Bid Evaluation Checklist PDF
 */
async function generateBidEvaluationChecklistPdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  const bidAnalysis = await db.query.bidAnalyses.findFirst({
    where: eq(bidAnalyses.id, documentId),
  });

  if (!bidAnalysis) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Bid Evaluation Checklist not found: ID=${documentId}`,
    });
  }

  console.log(`[Logistics PDF] Fetching COMPLETE Bid Evaluation Checklist data for ID=${documentId}`);

  // ✅ FETCH BIDDERS FOR EVALUATION
  const bidders = await db.query.bidAnalysisBidders.findMany({
    where: eq(bidAnalysisBidders.bidAnalysisId, documentId),
    with: {
      supplier: true,
    },
  });
  console.log(`[Logistics PDF] Fetched ${bidders.length} bidders for evaluation`);

  // ✅ FETCH EVALUATION CRITERIA (sections and criteria)
  const criteria = await db.query.bidEvaluationCriteria.findMany({
    where: eq(bidEvaluationCriteria.bidAnalysisId, documentId),
    orderBy: asc(bidEvaluationCriteria.sectionNumber),
  });
  console.log(`[Logistics PDF] Fetched ${criteria.length} evaluation criteria`);

  // ✅ FETCH ALL SCORES FOR ALL BIDDERS
  const scores = await db.query.bidEvaluationScores.findMany({
    where: eq(bidEvaluationScores.bidAnalysisId, documentId),
  });
  console.log(`[Logistics PDF] Fetched ${scores.length} evaluation scores`);

  // ✅ FIX: Validate ctx.user exists before accessing id
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: bidAnalysis.organizationId,
    operatingUnitId: bidAnalysis.operatingUnitId ?? undefined,
    userId: userId || '',
    language: language as 'en' | 'ar',
    documentType: 'bid_evaluation_checklist',
    documentId,
    documentModule: 'Logistics',
  });

  // ✅ BUILD SECTIONS FROM CRITERIA (group by section)
  const sectionsMap = new Map<number, any>();
  criteria.forEach((crit: any) => {
    const sectionNum = crit.sectionNumber || 1;
    if (!sectionsMap.has(sectionNum)) {
      sectionsMap.set(sectionNum, {
        number: sectionNum,
        name: crit.sectionName || `Section ${sectionNum}`,
        criteria: [],
      });
    }
    sectionsMap.get(sectionNum)!.criteria.push({
      id: crit.id,
      name: crit.name,
      stage: crit.stage || 'Evaluation',
      maxScore: crit.maxScore || 0,
      weight: crit.weight || 0,
      isScreening: crit.isScreening || false,
      isNA: crit.isApplicable === 0,
    });
  });
  const sections = Array.from(sectionsMap.values());

  // ✅ BUILD SCORE MAP: criterionId -> bidderId -> score
  const scoreMap = new Map<number, Map<number, number>>();
  scores.forEach((score: any) => {
    if (!scoreMap.has(score.criterionId)) {
      scoreMap.set(score.criterionId, new Map());
    }
    scoreMap.get(score.criterionId)!.set(score.bidderId, score.score || 0);
  });

  // ✅ BUILD ACTIVE BIDDERS LIST
  const activeBidders = bidders.map((b: any) => ({
    id: b.id,
    bidderName: b.bidderName || b.supplier?.name || b.supplier?.vendorName || 'Unknown Bidder',
  }));

  // ✅ BUILD CALCULATED SCORES FROM BIDDERS TABLE (final scores)
  const calculatedScoresData = bidders.map((b: any) => ({
    bidderId: b.id,
    bidderName: b.bidderName || 'Unknown',
    technicalScore: parseFloat(b.technicalScore) || 0,
    financialScore: parseFloat(b.financialScore) || 0,
    finalScore: parseFloat(b.combinedScore) || 0,
    status: b.isResponsive ? 'Qualified' : 'Not Qualified',
  }));

  // ✅ BUILD REMARKS DATA FROM BIDDERS TABLE
  const remarksData = bidders
    .filter((b: any) => b.remarks)
    .map((b: any) => ({
      bidderId: b.id,
      bidderName: b.bidderName || 'Unknown',
      remark: b.remarks || '',
    }));

  // ✅ BUILD PDF DATA WITH COMPLETE STRUCTURE
  const pdfData: PdfData = {
    context: officialContext,
    bidAnalysisId: bidAnalysis.id,
    organizationId: bidAnalysis.organizationId,
    operatingUnitId: bidAnalysis.operatingUnitId || 0,
    prNumber: bidAnalysis.prNumber || '',
    documentTitle: 'BID EVALUATION CHECKLIST',
    generatedOn: new Date().toISOString(),
    
    // FULL MATRIX DATA
    sections: sections,
    activeBidders: activeBidders,
    calculatedScores: calculatedScoresData,
    remarks: remarksData,
    scoreMap: scoreMap,
    
    language: language || 'en',
  };

  // ✅ GENERATE PDF USING TEMPLATE
  const { generateBidEvaluationChecklistPDF } = await import(
    './templates/logistics/bidEvaluationChecklistPdfGenerator'
  );
  const result: {
    buffer: Buffer;
    fileName: string;
  } = await generateBidEvaluationChecklistPDF(pdfData as any);

  if (!isValidPdfBuffer(result.buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated Bid Evaluation Checklist PDF is invalid',
    });
  }

  console.log(`[Logistics PDF] Bid Evaluation Checklist PDF generated successfully: ${result.fileName}`);
  return {
    buffer: result.buffer,
    documentNumber: `BEC-${bidAnalysis.id}`,
  };
}

async function generateQAPdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  // ✅ VALIDATE CONTEXT
  if (!ctx.scope) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Context scope is missing',
    });
  }

  if (!ctx.user?.id) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined');
  }

  console.log(`[Logistics PDF] Fetching QA data for ID=${documentId}`);

  // ✅ IMPORT AND CALL QA GENERATOR
  const { generateQAPDF } = await import('./templates/logistics/qaPdfGenerator');
  
    const buffer = await generateQAPDF(
    documentId,
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId || 0,
    ctx.user?.id || 0,
    language as 'en' | 'ar'
  );

  if (!isValidPdfBuffer(buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated QA PDF is invalid',
    });
  }

  console.log(`[Logistics PDF] QA PDF generated successfully`);

  return {
    buffer: buffer,
    documentNumber: `QA-${documentId}`,
  };
}

/**
 * Generate SAC (Service Acceptance Certificate) PDF
 */
async function generateSACPdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  // ✅ VALIDATE CONTEXT
  if (!ctx.scope) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Context scope is missing',
    });
  }

  if (!ctx.user?.id) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined');
  }

  console.log(`[Logistics PDF] Fetching SAC data for ID=${documentId}`);

  // ✅ IMPORT AND CALL SAC GENERATOR
  const { generateSACPDF } = await import('./templates/logistics/sacPdfGenerator');
  
  const buffer = await generateSACPDF(
  documentId,
  ctx.scope.organizationId,
  ctx.scope.operatingUnitId || 0,
  ctx.user?.id || 0,
  language as 'en' | 'ar'
);

  if (!isValidPdfBuffer(buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated SAC PDF is invalid',
    });
  }

  console.log(`[Logistics PDF] SAC PDF generated successfully`);

  return {
    buffer: buffer,
    documentNumber: `SAC-${documentId}`,
  };
}
/**
 * Generate Stock Issue PDF
 */
async function generateStockIssuePdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  const stockIssueRecord = await db.query.stockIssued.findFirst({
    where: eq(stockIssued.id, documentId),
  });

  if (!stockIssueRecord) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Stock Issue not found: ID=${documentId}`,
    });
  }

  console.log(`[Logistics PDF] Fetching Stock Issue data for ID=${documentId}`);

  // ✅ FETCH LINE ITEMS
  const lineItems = await db.query.stockIssuedLineItems.findMany({
    where: eq(stockIssuedLineItems.stockIssuedId, documentId),
  });
  console.log(`[Logistics PDF] Fetched ${lineItems.length} Stock Issue line items`);

  // ✅ FETCH BRANDING

  // ✅ FIX: Validate ctx.user exists before accessing id
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
      db,
      organizationId: stockIssueRecord.organizationId,
      operatingUnitId: stockIssueRecord.operatingUnitId ?? undefined,
      userId: userId || '',
      language: language as 'en' | 'ar',
      documentType: 'stock_issue',
      documentId,
      documentModule: 'Logistics',
    });

  // ✅ BUILD PDF DATA
  const stockBodyHtml = `
    <h2>Stock Issue Report - ${stockIssueRecord.issueNumber}</h2>
    <table style="width:100%; border-collapse:collapse;">
      <tr><td style="font-weight:bold; width:30%;">Issue Number:</td><td>${stockIssueRecord.issueNumber}</td></tr>
      <tr><td style="font-weight:bold;">Issued To:</td><td>${stockIssueRecord.issuedTo || 'N/A'}</td></tr>
      <tr><td style="font-weight:bold;">Department:</td><td>${stockIssueRecord.department || 'N/A'}</td></tr>
      <tr><td style="font-weight:bold;">Total Issued:</td><td>${0}</td></tr>
    </table>
    <h3>Items Issued</h3>
    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="background:#00a8a8; color:white;">
          <th style="border:1px solid #ddd; padding:8px;">Description</th>
          <th style="border:1px solid #ddd; padding:8px;">Qty Issued</th>
          <th style="border:1px solid #ddd; padding:8px;">Unit</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems
          .map(
            (item: any) =>
              `<tr>
              <td style="border:1px solid #ddd; padding:8px;">${item.description}</td>
              <td style="border:1px solid #ddd; padding:8px;">${item.issuedQty}</td>
              <td style="border:1px solid #ddd; padding:8px;">${item.unit || 'N/A'}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;

  // ✅ GENERATE PDF USING OfficialPdfEngine
  const { generateOfficialPdf } = await import('../pdf/OfficialPdfEngine');
  const pdfBuffer = await generateOfficialPdf({
    context: officialContext,
    department: 'Warehouse',
    documentTitle: `Stock Issue - ${stockIssueRecord.issueNumber}`,
    formNumber: stockIssueRecord.issueNumber,
    formDate: formatSqlDate(stockIssueRecord.issueDate) || new Date().toISOString().split('T')[0],
    bodyHtml: stockBodyHtml,
  });

  if (!isValidPdfBuffer(pdfBuffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated Stock Issue PDF is invalid',
    });
  }

  console.log(`[Logistics PDF] Stock Issue PDF generated successfully`);

  return {
    buffer: pdfBuffer,
    documentNumber: stockIssueRecord.issueNumber,
  };
}

/**
 * Generate Returned Items PDF
 */
async function generateReturnedItemsPdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  const returnRecord = await db.query.returnedItems.findFirst({
    where: eq(returnedItems.id, documentId),
  });

  if (!returnRecord) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Returned Items not found: ID=${documentId}`,
    });
  }

  console.log(`[Logistics PDF] Fetching Returned Items data for ID=${documentId}`);

  // ✅ FETCH LINE ITEMS
  const lineItems = await db.query.returnedItemLineItems.findMany({
    where: eq(returnedItemLineItems.returnedItemId, documentId),
  });
  console.log(`[Logistics PDF] Fetched ${lineItems.length} Returned Items line items`);

  // ✅ FETCH BRANDING

  // ✅ FIX: Validate ctx.user exists before accessing id
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
      db,
      organizationId: returnRecord.organizationId,
      operatingUnitId: returnRecord.operatingUnitId ?? undefined,
      userId: userId || '',
      language: language as 'en' | 'ar',
      documentType: 'returned_items',
      documentId,
      documentModule: 'Logistics',
    });

  // ✅ BUILD PDF DATA
  const returnBodyHtml = `
    <h2>Returned Items Report - ${returnRecord.returnNumber}</h2>
    <table style="width:100%; border-collapse:collapse;">
      <tr><td style="font-weight:bold; width:30%;">Return Number:</td><td>${returnRecord.returnNumber}</td></tr>
      <tr><td style="font-weight:bold;">Return Date:</td><td>${returnRecord.returnDate || 'N/A'}</td></tr>
      <tr><td style="font-weight:bold;">Reason:</td><td>${returnRecord.reason || 'N/A'}</td></tr>
    </table>
    <h3>Items Returned</h3>
    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="background:#00a8a8; color:white;">
          <th style="border:1px solid #ddd; padding:8px;">Description</th>
          <th style="border:1px solid #ddd; padding:8px;">Qty Returned</th>
          <th style="border:1px solid #ddd; padding:8px;">Condition</th>
          <th style="border:1px solid #ddd; padding:8px;">Accepted Qty</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems
          .map(
            (item: any) =>
              `<tr>
              <td style="border:1px solid #ddd; padding:8px;">${item.description}</td>
              <td style="border:1px solid #ddd; padding:8px;">${item.returnedQty}</td>
              <td style="border:1px solid #ddd; padding:8px;">${item.condition || 'N/A'}</td>
              <td style="border:1px solid #ddd; padding:8px;">${item.acceptedQty || 'N/A'}</td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;

  // ✅ GENERATE PDF USING OfficialPdfEngine
  const { generateOfficialPdf } = await import('../pdf/OfficialPdfEngine');
  const pdfBuffer = await generateOfficialPdf({
    context: officialContext,
    department: 'Warehouse',
    documentTitle: `Returned Items - ${returnRecord.returnNumber}`,
    formNumber: returnRecord.returnNumber,
    formDate: formatSqlDate(returnRecord.returnDate) || new Date().toISOString().split('T')[0],
    bodyHtml: returnBodyHtml,
  });

  if (!isValidPdfBuffer(pdfBuffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated Returned Items PDF is invalid',
    });
  }

  console.log(`[Logistics PDF] Returned Items PDF generated successfully`);

  return {
    buffer: pdfBuffer,
    documentNumber: returnRecord.returnNumber,
  };
}

/**
 * Generate Purchase Order (PO) PDF
 */
async function generatePurchaseOrderPdf(
  db: any,
  ctx: any,
  documentId: number,
  language: string
): Promise<{ buffer: Buffer; documentNumber: string }> {
  console.log(`[Logistics PDF] Starting PDF generation: purchaseOrder ID=${documentId} Language=${language}`);

  // ✅ FETCH PO DATA
  const poData = await db.query.purchaseOrders.findFirst({
    where: eq(purchaseOrders.id, documentId),
  });

  if (!poData) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Purchase Order not found: ID=${documentId}`,
    });
  }

  console.log(`[Logistics PDF] Fetching PO data for ID=${documentId}`);

  // ✅ FETCH LINE ITEMS
  const lineItems = await db.query.purchaseOrderLineItems.findMany({
    where: eq(purchaseOrderLineItems.purchaseOrderId, documentId),
  });
  console.log(`[Logistics PDF] Fetched ${lineItems.length} PO line items`);

  // ✅ FETCH BRANDING
  const userId = ctx.user?.id;
  if (!userId) {
    console.warn('[Logistics PDF] ⚠️ ctx.user.id is undefined, using empty string');
  }

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: poData.organizationId,
    operatingUnitId: poData.operatingUnitId ?? undefined,
    userId: userId || '',
    language: language as 'en' | 'ar',
    documentType: 'purchase_order',
    documentId,
    documentModule: 'Logistics',
  });

  // ✅ BUILD PDF DATA
  const pdfData = {
    context: officialContext,
    poNumber: poData.poNumber || `PO-${poData.id}`,
    poDate: formatSqlDate(poData.poDate) || new Date().toISOString().split('T')[0],
    supplierId: poData.supplierId,
    supplierName: poData.supplierName || '',
    supplierAddress: poData.supplierAddress || '',
    prNumber: poData.prNumber || '',
    prReference: poData.prReference || '',
    deliveryDate: formatSqlDate(poData.deliveryDate),
    deliveryLocation: poData.deliveryLocation || '',
    paymentTerms: poData.paymentTerms || '',
    currency: poData.currency || 'USD',
    lineItems: lineItems.map((item: any) => ({
      id: item.id,
      description: item.description || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      unitPrice: parseFloat(item.unitPrice) || 0,
      totalPrice: parseFloat(item.totalPrice) || 0,
    })),
    totalAmount: parseFloat(poData.totalAmount) || 0,
    remarks: poData.remarks || '',
    termsAndConditions: poData.termsAndConditions ? [poData.termsAndConditions] : [],
    language: language || 'en',
  };

  // ✅ GENERATE PDF USING TEMPLATE
  const result = await generatePurchaseOrderPDF(pdfData as any);

  if (!isValidPdfBuffer(result.buffer)) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Generated Purchase Order PDF is invalid',
    });
  }

  console.log(`[Logistics PDF] ✅ Purchase Order PDF generated successfully`);

  return {
    buffer: result.buffer,
    documentNumber: poData.poNumber || `PO-${poData.id}`,
  };
}


// ============================================================================
// MAIN PDF GENERATION PROCEDURE
// ============================================================================

export const generatePdfProcedure = scopedProcedure
  .input(
  z.object({
    documentType: z.enum([
      'bom',
      'purchaseRequest',
      'purchaseOrder',
      'grn',
      'rfq',
      'bidReceiptAcknowledgement',
      'bidEvaluationChecklist',
      'cba',
      'qa',
      'sac',
      'stockIssue',
      'returnedItems',
        ]),

        documentId: z.number().int().positive(),

        // ✅ NEW
        bidderId: z.number().int().positive().optional(),

        language: z.enum(['en', 'ar']).default('en'),

        forceRegenerate: z.boolean().default(false),
      })
    )
  .mutation(async ({ ctx, input }): Promise<PdfGenerationResult> => {
    const {
          documentType,
          documentId,
          bidderId,
          language,
          forceRegenerate,
        } = input;
    const db = await import('../../db').then((m) => m.getDb());

    if (
        input.documentType === 'bidReceiptAcknowledgement' &&
        !input.bidderId
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'bidderId is required for Bid Receipt Acknowledgement',
        });
      }

    try {
      console.log(
        `[Logistics PDF] Starting PDF generation: ${documentType} ID=${documentId} Language=${language}`
      );

      // ✅ FIX: Validate ctx.scope exists before accessing it
      if (!ctx.scope) {
        console.error('[Logistics PDF] ❌ ctx.scope is undefined');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Context scope is missing. User must be authenticated.',
        });
      }

      if (!ctx.scope.organizationId) {
        console.error('[Logistics PDF] ❌ ctx.scope.organizationId is undefined');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Organization ID is missing from context.',
        });
      }

      if (!ctx.scope.operatingUnitId) {
        console.error('[Logistics PDF] ❌ ctx.scope.operatingUnitId is undefined');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Operating Unit ID is missing from context.',
        });
      }

      console.log(`[Logistics PDF] ✅ Context validated - orgId=${ctx.scope.organizationId}, ouId=${ctx.scope.operatingUnitId}`);

      const mapping = documentTypeMapping[documentType as DocumentType];
      if (!mapping) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unsupported document type: ${documentType}`,
        });
      }

      // ========== STEP 1: Check Cache (unless force regenerate) ==========
      if (!forceRegenerate) {
        console.log(`[Logistics PDF] Checking cache for ${documentType} ID=${documentId}`);

        const cachedPdf = await db.query.generatedDocuments.findFirst({
          where: and(
            eq(generatedDocuments.organizationId, ctx.scope.organizationId),
            eq(generatedDocuments.operatingUnitId, ctx.scope.operatingUnitId),
            eq(generatedDocuments.entityType, mapping.entityType),
            eq(generatedDocuments.documentType, mapping.documentType),
            eq(generatedDocuments.entityId, documentId),
            eq(generatedDocuments.language, language),
            eq(generatedDocuments.isLatest, 1)
          ),
        });

        if (cachedPdf && cachedPdf.filePath) {
          console.log(`[Logistics PDF] ✅ Using cached PDF: ${cachedPdf.fileName}`);

          // ✅ Fetch from S3 and convert to base64
          try {
          // Convert public URL to local path
          const relativePath = cachedPdf.filePath.replace(
            'https://platform.imserp.org/organization/uploads/',
            ''
          );

          const localPath = path.join(
            process.cwd(),
            'uploads',
            relativePath
          );

          console.log('[Logistics PDF] Reading cached PDF:', localPath);

          const response = await fetch(cachedPdf.filePath);

          if (!response.ok) {
            throw new Error(`Failed to fetch cached PDF`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const pdfBuffer = Buffer.from(arrayBuffer);

          // Validate PDF header
          if (pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
            throw new Error('Cached file is corrupted or not a PDF');
          }

          console.log('[Logistics PDF] ✅ Cached PDF validated');

          return {
            success: true,
            pdf: pdfBuffer.toString('base64'),
            filename: cachedPdf.fileName || `${documentType}.pdf`,
            documentNumber: cachedPdf.fileName?.split('-')[1] || '',
            s3Url: cachedPdf.filePath,
            syncedToCentralDocuments: true,
            isNewGeneration: false,
          };

        } catch (error) {
          console.warn(
            `[Logistics PDF] ⚠️ Failed to load cached PDF, regenerating...`,
            error
          );
        }
        }
      }

      // ========== STEP 2: Generate PDF based on type ==========
      let pdfBuffer: Buffer = Buffer.alloc(0);
      let documentNumber: string = '';

      console.log(`[Logistics PDF] Generating new PDF for ${documentType}`);

      switch (documentType) {
        case 'bom': {
          const result = await generateBomPdf(
            db,
            ctx,
            documentId,
            language
          );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'purchaseRequest': {
          const result = await generatePRPdf(
              db,
              ctx,
              documentId,
              language
            );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'grn': {
          const result = await generateGRNPDF(
            db,
            ctx,
            documentId,
            language
          );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'purchaseOrder': {
          const result = await generatePurchaseOrderPdf(
            db,
            ctx,
            documentId,
            language
          );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'rfq': {
          const result = await generateRFQPdf(
            db,
            ctx,
            documentId,
            language
          );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'bidReceiptAcknowledgement': {
          const result = await generateBidReceiptAcknowledgementPdf(
            db,
            ctx,
            documentId,
            bidderId,
            language
          );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'bidEvaluationChecklist': {
          const result = await generateBidEvaluationChecklistPdf(
            db,
            ctx,
            documentId,
            language
          );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'cba': {
          const buffer = await generateCBAPDF(
            db,
            ctx,
            documentId,
            language
          );
          pdfBuffer = Buffer.from(buffer);

          documentNumber = `CBA-${documentId}`;
          break;
        }

        case 'qa': {
          const result = await generateQAPdf(
            db,
            ctx,
            documentId,
            language
          );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'sac': {
          const result = await generateSACPdf(
            db,
            ctx,
            documentId,
            language
          );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'stockIssue': {
          const result = await generateStockIssuePdf(
              db,
              ctx,
              documentId,
              language
            );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        case 'returnedItems': {
          const result = await generateReturnedItemsPdf(
              db,
              ctx,
              documentId,
              language
            );
          pdfBuffer = result.buffer;
          documentNumber = result.documentNumber;
          break;
        }
        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Unsupported document type: ${documentType}`,
          });
      }

      // ========== STEP 3: Validate PDF buffer ==========
      if (!isValidPdfBuffer(pdfBuffer)) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Generated PDF is invalid',
        });
      }

      console.log(`[Logistics PDF] ✅ PDF buffer validated (${pdfBuffer.length} bytes)`);

      // ========== STEP 4: Upload to S3 using storagePut ==========
      const filename = generatePdfFileName(documentType, documentNumber, language);
      const fileKey = `logistics/${documentType}/${ctx.scope.organizationId}/${filename}`;
      let s3Url: string = '';

      try {
        console.log(`[Logistics PDF] Uploading to S3: ${fileKey}`);

        const uploadResult = await storagePut(fileKey, pdfBuffer, 'application/pdf');
        s3Url = uploadResult.url;

        console.log(`[Logistics PDF] ✅ S3 upload successful: ${s3Url}`);
      } catch (uploadError) {
        console.error(`[Logistics PDF] ❌ S3 upload failed:`, uploadError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload PDF to S3',
        });
      }

      // ========== STEP 5: Save metadata to generatedDocuments table ==========
      if (s3Url) {
        try {
          console.log(`[Logistics PDF] Saving metadata to generatedDocuments`);

          // Mark old versions as not latest
          await db
            .update(generatedDocuments)
            .set({ isLatest: 0 })
            .where(
              and(
                eq(generatedDocuments.organizationId, ctx.scope.organizationId),
                eq(generatedDocuments.operatingUnitId, ctx.scope.operatingUnitId),
                eq(generatedDocuments.entityType, mapping.entityType),
                eq(generatedDocuments.documentType, mapping.documentType),
                eq(generatedDocuments.entityId, documentId),
                eq(generatedDocuments.language, language),
                eq(generatedDocuments.isLatest, 1)
              )
            );
            
            // Mark old records as not latest
            await db
              .update(generatedDocuments)
              .set({
                isLatest: 0,
              })
              .where(
                and(
                  eq(generatedDocuments.organizationId, ctx.scope.organizationId),
                  eq(generatedDocuments.operatingUnitId, ctx.scope.operatingUnitId),
                  eq(generatedDocuments.entityType, mapping.entityType),
                  eq(generatedDocuments.entityId, documentId),
                  eq(generatedDocuments.documentType, mapping.documentType),
                  eq(generatedDocuments.language, language),
                  eq(generatedDocuments.isLatest, 1)
                )
              );
          // Insert new version
          await db.insert(generatedDocuments).values({
            organizationId: ctx.scope.organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            module: 'logistics',
            entityType: mapping.entityType,
            entityId: documentId,
            documentType: mapping.documentType,
            filePath: s3Url,
            fileName: filename,
            mimeType: 'application/pdf',
            version: 1,
            isLatest: 1,
            language: language as 'en' | 'ar',
            generatedBy: ctx.user?.id || null,
            generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          });

          console.log(`[Logistics PDF] ✅ Metadata saved to generatedDocuments: ${filename}`);
        } catch (docError) {
          console.warn(`[Logistics PDF] ⚠️ Metadata storage failed (non-blocking):`, docError);
          // Don't throw - PDF was generated successfully, just metadata save failed
        }
      }

      // ========== STEP 6: Return response with base64 PDF ==========
      const base64PDF = bufferToBase64(pdfBuffer);

      console.log(`[Logistics PDF] ✅ PDF generation complete: ${filename}`);

      return {
        success: true,
        pdf: base64PDF, // ✅ BASE64 PDF (not localhost URL)
        filename,
        documentNumber,
        s3Url,
        syncedToCentralDocuments: !!s3Url,
        isNewGeneration: true,
      };
    } catch (error) {
      console.error(`[Logistics PDF] ❌ Error generating ${documentType}:`, error);

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export const logisticsRouter = router({
  generatePDF: generatePdfProcedure,
});
