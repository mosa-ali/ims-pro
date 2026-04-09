// ============================================================================
// LOGISTICS & PROCUREMENT TYPES
// Integrated Management System (IMS)
// ============================================================================

/**
 * CRITICAL RULES:
 * - All reference numbers are AUTO-GENERATED (no manual entry)
 * - Budget validation before procurement submission
 * - Multi-level approval workflow enforced
 * - Finance integration mandatory
 * - Operating unit scoping required
 * - Audit trail for all actions
 * - PROCUREMENT COST LEVELS determine QA vs BA/CBA automatically
 * - EVALUATION CRITERIA MANAGEMENT is single source of truth for scoring
 */

// ============================================================================
// PROCUREMENT COST LEVELS (SETTINGS TABLE)
// ============================================================================

export interface TenderBidder {
 id: string;
 name: string;
 submissionDate: string;
 totalOfferCost?: number; // Optional: Only captured after bid opening
 currency?: string;
 status: 'received' | 'valid' | 'disqualified';
 receiptPrinted: boolean;
 receiptPrintedAt?: string;
}

export interface TenderAnnouncement {
 id: string;
 prId: string;
 prNumber: string;
 startDate: string;
 endDate: string;
 channel: 'website' | 'newspaper' | 'donor_portal' | 'other';
 referenceUrl?: string;
 noticeId?: string;
 bidders: TenderBidder[];
 status: 'draft' | 'published' | 'closed';
 
 createdAt: string;
 createdBy: string;
 updatedAt: string;
}

export type ProcurementProcessType = 
 | 'single_quotation' // 0 - 1,000
 | 'multiple_quotations' // 1,001 - 5,000
 | 'extended_quotations' // 5,001 - 25,000
 | 'tender'; // > 25,000

export interface ProcurementCostLevel {
 id: string;
 minAmount: number; // In USD (base currency)
 maxAmount: number | null; // null = unlimited
 processType: ProcurementProcessType;
 minQuotations: number;
 maxQuotations: number | null; // null = no max
 requiresCBA: boolean; // true for tender
 description: string;
 active: boolean;
 createdAt: string;
 updatedAt: string;
}

// Helper to determine process type from cost
export function determineProcurementProcess(costUSD: number): {
 processType: ProcurementProcessType;
 minQuotations: number;
 maxQuotations: number | null;
 requiresCBA: boolean;
} {
 if (costUSD <= 1000) {
 return { 
 processType: 'single_quotation', 
 minQuotations: 1, 
 maxQuotations: 1,
 requiresCBA: false 
 };
 } else if (costUSD <= 5000) {
 return { 
 processType: 'multiple_quotations', 
 minQuotations: 3, 
 maxQuotations: 3,
 requiresCBA: false 
 };
 } else if (costUSD <= 25000) {
 return { 
 processType: 'extended_quotations', 
 minQuotations: 3, 
 maxQuotations: 5,
 requiresCBA: false 
 };
 } else {
 return { 
 processType: 'tender', 
 minQuotations: 3, 
 maxQuotations: null,
 requiresCBA: true 
 };
 }
}

// ============================================================================
// REFERENCE NUMBER FORMATS
// ============================================================================

export type ReferenceNumberPrefix = 
 | 'PR' // Purchase Request
 | 'PO' // Purchase Order
 | 'GRN' // Goods Receipt Note
 | 'SR' // Stock Request
 | 'SI' // Stock Issue/Dispatch
 | 'RTN' // Returned Items
 | 'QA' // Quotations Analysis
 | 'BA'; // Bid Analysis

/**
 * Auto-generated reference number format: [PREFIX]-[YEAR]-[SEQUENCE]
 * Example: PR-2026-00045
 */
export interface ReferenceNumber {
 prefix: ReferenceNumberPrefix;
 year: number;
 sequence: number;
 full: string; // e.g., "PR-2026-00045"
}

// ============================================================================
// PROCUREMENT REQUEST (PR)
// ============================================================================

export type ProcurementUrgency = 'low' | 'medium' | 'high' | 'urgent';

// ✅ CRITICAL: Procurement Category determines GRN requirement
export type ProcurementCategory = 
 | 'goods' // Physical items - REQUIRES GRN
 | 'services' // Consulting, labor - NO GRN
 | 'food_catering' // Food/meals - NO GRN
 | 'vouchers'; // Cash/voucher programs - NO GRN

export type ProcurementStatus = 
 | 'draft'
 | 'submitted'
 | 'under_review_logistics'
 | 'under_review_finance'
 | 'pending_approval'
 | 'approved'
 | 'rejected'
 | 'cancelled';

export interface ProcurementRequestItem {
 id: string;
 description: string; // Item Description
 detailedSpecification?: string; // Detailed Specification (separate from description)
 quantity: number; // Must be > 0
 unit: string; // e.g., "pcs", "kg", "box"
 estimatedUnitCost: number; // Estimated Unit Cost (must be > 0)
 estimatedTotalCost: number; // Auto-calculated: Quantity × Unit Cost
 specifications?: string; // Additional specs (legacy - use detailedSpecification)
}

export interface ProcurementRequest {
 id: string;
 prNumber: string; // Auto-generated: PR-2026-00045
 
 // ✅ CRITICAL: Category determines workflow (goods need GRN, services don't)
 category: ProcurementCategory;
 
 // Organization (Auto from Settings)
 organizationId: string;
 organizationName?: string; // For display/print
 organizationLogo?: string; // For official print output
 
 // Operating Unit / Country
 operatingUnitId: string;
 operatingUnitName?: string; // For display/print
 country?: string;
 
 // Request Details
 requestDate: string; // PR Date
 requestingDepartment: string; // Requesting Department
 requestedBy: string; // Auto: logged-in user ID
 requestedByName: string; // Requested By (Name)
 requestedByPosition?: string; // Position / Role
 
 // Project & Budget (MANDATORY - cannot submit without)
 projectId?: string;
 projectName?: string;
 projectCode?: string;
 grantId?: string; // Linked from project
 donorName?: string; // Donor Name (from grant)
 
 // Budget (MANDATORY)
 budgetLineId: string; // Budget Line ID
 budgetLineName: string; // Budget Line Name
 budgetAvailable: number; // Available Budget (validated by Finance)
 
 // Financial
 currency: string; // Currency (USD, EUR, etc.)
 exchangeRate?: number; // Exchange Rate (if not USD)
 totalBLInUSD?: number; // Total BL USD (auto-calculated)
 
 // Items (MANDATORY - cannot submit without at least 1 item)
 items: ProcurementRequestItem[];
 totalEstimatedCost: number; // Auto-calculated from items
 
 // Delivery & Urgency
 urgencyLevel: ProcurementUrgency; // Low / Medium / High / Urgent
 requiredDate?: string; // Required Delivery Date
 deliveryLocation?: string; // Delivery Address
 
 // Justification
 justification: string;
 
 // Status & Workflow
 status: ProcurementStatus;
 currentApprover?: string;
 
 // Approval Trail (Read-only tracked workflow)
 // Logistics Review
 logisticsReviewStatus?: 'pending' | 'approved' | 'rejected';
 logisticsReviewedBy?: string;
 logisticsReviewedByName?: string;
 logisticsReviewedDate?: string;
 logisticsComments?: string;
 
 // Finance Review (validates budget availability)
 financeReviewStatus?: 'pending' | 'approved' | 'rejected';
 financeReviewedBy?: string;
 financeReviewedByName?: string;
 financeReviewedDate?: string;
 financeComments?: string;
 
 // PM Approval
 pmApprovalStatus?: 'pending' | 'approved' | 'rejected';
 approvedBy?: string;
 approvedByName?: string;
 approvedDate?: string;
 approvalComments?: string;
 
 // Rejection
 rejectedBy?: string;
 rejectedByName?: string;
 rejectedDate?: string;
 rejectionReason?: string;
 
 // CRITICAL RULES ENFORCEMENT
 canEdit: boolean; // False after submission (no edits after approval)
 canDelete: boolean; // False after submission
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// REQUEST FOR QUOTATION (RFQ)
// ============================================================================

export type RFQStatus = 
 | 'draft'
 | 'sent'
 | 'responses_received'
 | 'analysis_complete'
 | 'closed';

export interface RFQSupplier {
 supplierId: string;
 supplierName: string;
 contactPerson: string;
 contactEmail: string;
 sentDate?: string;
 responseReceived: boolean;
 responseDate?: string;
}

export interface RFQ {
 id: string;
 rfqNumber: string; // Auto-generated
 
 // Reference
 prId: string;
 prNumber: string;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // RFQ Details
 issueDate: string;
 submissionDeadline: string;
 suppliers: RFQSupplier[];
 
 // Terms
 termsAndConditions: string;
 paymentTerms: string;
 deliveryRequirements: string;
 
 // Status
 status: RFQStatus;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// QUOTATIONS ANALYSIS
// ============================================================================

// Evaluation Criteria (for scoring suppliers/bidders)
export interface SupplierEvaluationCriterion {
 id: string;
 name: string;
 nameAr: string;
 weight: number; // As percentage (e.g., 50 for 50%)
 description?: string;
 active: boolean;
 order: number;
}

// Supplier/Bidder scores from Evaluation Criteria Management
export interface SupplierEvaluationScores {
 supplierId: string;
 supplierName: string;
 criterionScores: Record<string, number>; // criterionId -> score (0-100)
 totalScore: number; // Auto-calculated weighted average
}

export interface QuotationSupplierItemPrice {
 itemId: string;
 unitPrice: number;
 totalPrice: number; // Qty × Unit Price
}

export interface QuotationSupplierData {
 supplierId: string;
 supplierName: string;
 itemPrices: QuotationSupplierItemPrice[]; // Itemized pricing
 subtotal: number; // Σ (itemPrices.totalPrice)
 deliveryTime: number; // days
 warranty: string;
 complianceNotes: string;
 score: number; // Auto-calculated weighted score
 rank?: number;
 isBestValue?: boolean;
}

export interface QuotationAnalysis {
 id: string;
 qaNumber: string; // Auto-generated: QA-2026-00007
 
 // Reference (PR is MANDATORY - drives everything)
 prId: string; // REQUIRED - user must select from approved PRs only
 prNumber: string; // Auto-populated from PR
 rfqId?: string; // Optional
 rfqNumber?: string; // Optional
 
 // Context (auto-populated from PR)
 organizationId: string;
 operatingUnitId: string;
 country?: string;
 projectId?: string;
 budgetLineId: string;
 estimatedBudget: number; // From PR totalEstimatedCost
 currency: string; // From PR
 
 // Procurement Process Info (auto-determined from cost)
 processType: ProcurementProcessType; // Auto-determined
 minQuotationsRequired: number; // Auto-determined
 maxQuotationsAllowed: number | null; // Auto-determined
 
 // Analysis Metadata
 analysisDate: string;
 purchaseDescription: string; // From PR
 requestedBy: string; // From PR
 
 // Evaluation Criteria (from Evaluation Criteria Management)
 evaluationCriteria: SupplierEvaluationCriterion[];
 
 // Supplier Evaluation Scores (from Evaluation Criteria Management - SINGLE SOURCE OF TRUTH)
 supplierEvaluationScores: SupplierEvaluationScores[]; // Auto-synced
 
 // Supplier Data (legacy - will be replaced by evaluation scores)
 suppliers: QuotationSupplierData[];
 
 // DEPRECATED - kept for backward compatibility
 priceWeight?: number; // default 50%
 deliveryWeight?: number; // default 20%
 warrantyWeight?: number; // default 15%
 complianceWeight?: number; // default 15%
 
 // Quotation Summary
 lowestQuotedAmount: number;
 
 // Selection
 selectedSupplierId: string;
 selectedSupplierName: string;
 selectionJustification: string;
 
 // Flags
 lowestBidderSelected: boolean;
 requiresJustification: boolean; // If not lowest bidder
 
 // Status & Workflow
 status: 'draft' | 'completed' | 'approved' | 'attached_to_po';
 locked: boolean; // Lock after approval to preserve audit trail
 
 // Approvals
 approver1?: string;
 approver1Date?: string;
 approver2?: string;
 approver2Date?: string;
 
 approvedBy?: string;
 approvedDate?: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// COMPETITIVE BID ANALYSIS (CBA) - OFFICIAL TENDER EVALUATION
// For tenders > USD 25,000 - Audit-critical document
// ============================================================================

export interface CBABidder {
 id: string;
 companyName: string;
 addedFromCriteria: boolean; // Auto-populated from Evaluation Criteria tab
 order: number;
}

export interface CBATechnicalCriterion {
 id: string;
 section: string; // "Legal & Administrative", "Experience & Technical Capacity", etc.
 criterionName: string;
 maxScore: number;
 order: number;
}

export interface CBATechnicalScore {
 bidderId: string;
 criterionScores: Record<string, number>; // criterionId -> score
 totalTechnicalScore: number; // Auto-calculated (max 50)
 technicalPercentage: number; // Score / 50 * 100
 qualifiedForFinancial: boolean; // >= 70% threshold
}

export interface CBAFinancialScore {
 bidderId: string;
 offeredPrice: number;
 financialScore: number; // Auto-calculated: Lowest price gets 50, others proportional
}

export interface CBAFinalScore {
 bidderId: string;
 technicalScore: number; // Out of 50
 financialScore: number; // Out of 50
 totalScore: number; // Out of 100
 rank: number; // 1, 2, 3, etc.
}

export interface CBAApprovalSignature {
 role: string; // "Evaluation Committee Member 1", "Evaluation Committee Member 2", etc.
 name?: string;
 signature?: string;
 date?: string;
}

export interface CompetitiveBidAnalysis {
 id: string;
 cbaNumber: string; // Auto-generated: CBA-2026-00001
 
 // ✅ CRITICAL: One CBA per PR (tender only)
 prId: string;
 prNumber: string;
 rfqTenderNumber?: string;
 
 // Header Information
 organizationId: string;
 organizationName?: string;
 organizationLogo?: string;
 operatingUnitId: string;
 operatingUnitName?: string;
 country?: string;
 
 // Document Date
 cbaDate: string;
 
 // Financial Context
 currency: string;
 budgetLineId: string;
 budgetLineName?: string;
 budgetAmount: number;
 
 // Bidders (auto-loaded from Evaluation Criteria Management tab)
 bidders: CBABidder[];
 
 // Technical Evaluation (Max 50 points)
 technicalCriteria: CBATechnicalCriterion[];
 technicalScores: CBATechnicalScore[];
 technicalThresholdPercentage: number; // Default 70%
 
 // Financial Evaluation (Max 50 points)
 financialScores: CBAFinancialScore[];
 
 // Final Scores (Auto-calculated)
 finalScores: CBAFinalScore[];
 
 // Decision
 lowestBidAmount: number; // Auto-calculated
 lowestBidderId?: string;
 selectedSupplierId?: string;
 selectedSupplierName?: string;
 selectionJustification: string; // MANDATORY if selected ≠ lowest
 
 // Approval Signatures
 approvalSignatures: CBAApprovalSignature[];
 
 // Status
 status: 'draft' | 'in_evaluation' | 'completed' | 'approved';
 locked: boolean; // Locked after approval
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// BID EVALUATION CRITERIA - DETAILED CHECKLIST
// Single source of truth for scoring - syncs to CBA
// ============================================================================

export interface BidEvaluationRequirement {
 id: string;
 section: string; // "Legal & Administrative", "Experience", etc.
 requirementName: string;
 details: string;
 weight: number; // Scoring weight
 order: number;
 hidden: boolean; // Can hide but not delete
 
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

export interface BidEvaluationBidder {
 id: string;
 bidderName: string;
 order: number;
 locked: boolean; // Locked once evaluation starts
}

export interface BidEvaluationScore {
 requirementId: string;
 bidderId: string;
 score: number; // 0-weight
 notes?: string;
}

export interface BidEvaluationCriteria {
 id: string;
 prId: string;
 prNumber: string;
 tenderRfqNumber?: string;
 
 // Organization Context
 organizationId: string;
 organizationName?: string;
 organizationLogo?: string;
 operatingUnitId: string;
 operatingUnitName?: string;
 
 // Evaluation Date
 evaluationDate: string;
 
 // Bidders (auto-sync to CBA)
 bidders: BidEvaluationBidder[];
 
 // Requirements / Criteria
 requirements: BidEvaluationRequirement[];
 
 // Scores (matrix of requirement x bidder)
 scores: BidEvaluationScore[];
 
 // Calculated Totals
 bidderTotals: Record<string, number>; // bidderId -> total score
 
 // Status
 status: 'draft' | 'in_progress' | 'finalized';
 criteriaLocked: boolean; // Lock criteria when evaluation starts
 biddersLocked: boolean; // Lock bidders when evaluation starts
 
 // Approval
 preparedBy?: string;
 preparedByName?: string;
 preparedDate?: string;
 reviewedBy?: string;
 reviewedByName?: string;
 reviewedDate?: string;
 approvedBy?: string;
 approvedByName?: string;
 approvedDate?: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// PURCHASE ORDER (PO)
// ============================================================================

export type POStatus = 
 | 'draft'
 | 'pending_approval'
 | 'approved'
 | 'sent_to_supplier'
 | 'partially_received'
 | 'fully_received'
 | 'closed'
 | 'cancelled';

export interface POItem {
 id: string;
 description: string;
 quantity: number;
 unit: string;
 unitPrice: number;
 totalPrice: number;
 taxRate: number;
 taxAmount: number;
 grandTotal: number;
}

export interface PurchaseOrder {
 id: string;
 poNumber: string; // Auto-generated: PO-2026-00112
 
 // Reference
 prId: string;
 prNumber: string;
 quotationAnalysisId?: string;
 bidAnalysisId?: string;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 projectId?: string;
 
 // Supplier
 supplierId: string;
 supplierName: string;
 supplierAddress: string;
 supplierContact: string;
 
 // PO Details
 poDate: string;
 deliveryDate: string;
 deliveryAddress: string;
 
 // Items
 items: POItem[];
 subtotal: number;
 totalTax: number;
 grandTotal: number;
 currency: string;
 
 // Terms
 paymentTerms: string;
 deliveryTerms: string;
 warrantyTerms?: string;
 
 // Status & Workflow
 status: POStatus;
 
 // Approvals
 approvedBy?: string;
 approvedDate?: string;
 
 // Tracking
 sentToSupplierDate?: string;
 sentToSupplierBy?: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// GOODS RECEIPT NOTE (GRN)
// ============================================================================

export type GRNStatus = 
 | 'draft'
 | 'partially_received'
 | 'fully_received'
 | 'quality_issue'
 | 'confirmed';

export type ItemCondition = 'good' | 'damaged' | 'expired' | 'rejected';

export interface GRNItem {
 poItemId: string;
 description: string;
 orderedQuantity: number;
 receivedQuantity: number;
 unit: string;
 condition: ItemCondition;
 conditionNotes?: string;
 warehouseLocation?: string;
}

export interface GoodsReceiptNote {
 id: string;
 grnNumber: string; // Auto-generated: GRN-2026-00038
 
 // Reference
 poId: string;
 poNumber: string;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Receipt Details
 receiptDate: string;
 receivedBy: string;
 receivedByName: string;
 
 // Supplier
 supplierId: string;
 supplierName: string;
 deliveryNoteNumber?: string;
 
 // Items
 items: GRNItem[];
 
 // Status
 status: GRNStatus;
 fullyReceived: boolean;
 hasQualityIssues: boolean;
 
 // Quality Check
 qualityCheckedBy?: string;
 qualityCheckedDate?: string;
 qualityComments?: string;
 
 // Confirmation
 confirmedBy?: string;
 confirmedDate?: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// STOCK & INVENTORY
// ============================================================================

export interface StockItem {
 id: string;
 itemCode: string; // Auto-generated
 itemName: string;
 description: string;
 category: string;
 unit: string;
 
 // Quantities
 currentStock: number;
 minimumStock: number;
 maximumStock: number;
 
 // Location
 warehouseId: string;
 warehouseName: string;
 locationInWarehouse: string;
 
 // Tracking
 expiryDate?: string;
 batchNumber?: string;
 
 // Flags
 belowMinimum: boolean;
 nearExpiry: boolean;
 expired: boolean;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Metadata
 createdAt: string;
 updatedAt: string;
}

export interface StockRequest {
 id: string;
 srNumber: string; // Auto-generated: SR-2026-00019
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 projectId?: string;
 
 // Request Details
 requestDate: string;
 requestedBy: string;
 requestedByName: string;
 requestedForDepartment: string;
 
 // Items
 items: Array<{
 stockItemId: string;
 itemName: string;
 requestedQuantity: number;
 unit: string;
 purpose: string;
 }>;
 
 // Status
 status: 'pending' | 'approved' | 'issued' | 'rejected';
 
 // Approval
 approvedBy?: string;
 approvedDate?: string;
 
 // Issuance
 issuedBy?: string;
 issuedDate?: string;
 siNumber?: string; // Reference to Stock Issuance
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

export interface StockIssuance {
 id: string;
 siNumber: string; // Auto-generated: SI-2026-00024
 
 // Reference
 srId: string;
 srNumber: string;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Issuance Details
 issueDate: string;
 issuedBy: string;
 issuedByName: string;
 receivedBy: string;
 receivedByName: string;
 
 // Items
 items: Array<{
 stockItemId: string;
 itemName: string;
 issuedQuantity: number;
 unit: string;
 batchNumber?: string;
 }>;
 
 // Status
 status: 'issued' | 'received' | 'confirmed';
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// SUPPLIER MANAGEMENT
// ============================================================================

export type SupplierStatus = 'active' | 'inactive' | 'blacklisted' | 'pending_approval';
export type SupplierType = 'goods' | 'services' | 'both';

export interface Supplier {
 id: string;
 supplierCode: string; // Auto-generated
 
 // Basic Info
 legalName: string;
 tradingName?: string;
 supplierType: SupplierType;
 
 // Contact
 address: string;
 city: string;
 country: string;
 phone: string;
 email: string;
 website?: string;
 
 // Primary Contact Person
 contactPersonName: string;
 contactPersonTitle: string;
 contactPersonPhone: string;
 contactPersonEmail: string;
 
 // Financial
 bankName: string;
 bankAccountNumber: string;
 bankSwiftCode?: string;
 taxRegistrationNumber?: string;
 
 // Compliance
 registrationNumber: string;
 registrationDate?: string;
 taxClearanceCertificate?: string;
 complianceDocuments: string[]; // Document IDs
 
 // Performance
 performanceRating: number; // 1-5
 totalOrders: number;
 totalSpent: number;
 averageDeliveryTime: number; // days
 onTimeDeliveryRate: number; // percentage
 
 // Framework Agreement (LTA)
 hasFrameworkAgreement: boolean;
 frameworkAgreementNumber?: string;
 frameworkStartDate?: string;
 frameworkEndDate?: string;
 
 // Status
 status: SupplierStatus;
 blacklistReason?: string;
 blacklistDate?: string;
 blacklistedBy?: string;
 
 // Context
 organizationId: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// PROCUREMENT TRACKER
// ============================================================================

export type ProcurementStage = 
 | 'pr_submitted'
 | 'rfq_sent'
 | 'quotations_received'
 | 'analysis_complete'
 | 'po_approved'
 | 'po_sent'
 | 'goods_received'
 | 'invoice_received'
 | 'payment_processed'
 | 'closed';

export interface ProcurementTrackerItem {
 id: string;
 
 // References
 prNumber: string;
 rfqNumber?: string;
 qaNumber?: string;
 baNumber?: string;
 poNumber?: string;
 grnNumber?: string;
 invoiceNumber?: string;
 paymentNumber?: string;
 
 // Details
 projectId?: string;
 projectName?: string;
 supplierId?: string;
 supplierName?: string;
 description: string;
 totalAmount: number;
 currency: string;
 
 // Current Stage
 currentStage: ProcurementStage;
 currentResponsibleOfficer: string;
 
 // Status Flags
 prApproved: boolean;
 rfqSent: boolean;
 quotationsReceived: boolean;
 analysisCompleted: boolean;
 poApproved: boolean;
 poSentToSupplier: boolean;
 goodsReceived: boolean;
 grnConfirmed: boolean;
 invoiceReceived: boolean;
 paymentProcessed: boolean;
 
 // Dates
 prDate: string;
 rfqDate?: string;
 poDate?: string;
 grnDate?: string;
 invoiceDate?: string;
 paymentDate?: string;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Metadata
 lastUpdated: string;
}

// ============================================================================
// FLEET MANAGEMENT (NEW - MANDATORY SUB-MODULE)
// ============================================================================

export type VehicleType = 'car' | 'suv' | 'truck' | 'van' | 'motorcycle' | 'bus' | 'ambulance';
export type VehicleStatus = 'active' | 'in_maintenance' | 'out_of_service' | 'disposed';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';

export interface Vehicle {
 id: string;
 vehicleCode: string; // Auto-generated
 
 // Basic Info
 make: string;
 model: string;
 year: number;
 color: string;
 vehicleType: VehicleType;
 fuelType: FuelType;
 
 // Registration
 registrationNumber: string;
 registrationDate: string;
 registrationExpiryDate: string;
 
 // Ownership
 ownershipType: 'owned' | 'leased' | 'rented';
 purchaseDate?: string;
 purchasePrice?: number;
 
 // Technical
 engineNumber: string;
 chassisNumber: string;
 engineCapacity: number;
 seatingCapacity: number;
 
 // Tracking
 currentMileage: number;
 lastServiceMileage: number;
 nextServiceDue: number;
 
 // Insurance
 insuranceProvider: string;
 insurancePolicyNumber: string;
 insuranceExpiryDate: string;
 insuranceAmount: number;
 
 // Assignment
 assignedToProjectId?: string;
 assignedToProjectName?: string;
 currentDriverId?: string;
 currentDriverName?: string;
 
 // Status
 status: VehicleStatus;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Metadata
 createdAt: string;
 updatedAt: string;
}

export interface Driver {
 id: string;
 driverCode: string; // Auto-generated
 
 // Personal Info (reference to HR employee)
 employeeId: string;
 employeeName: string;
 
 // License
 licenseNumber: string;
 licenseType: string;
 licenseIssueDate: string;
 licenseExpiryDate: string;
 licenseIssuingAuthority: string;
 
 // Status
 status: 'active' | 'inactive' | 'suspended';
 suspensionReason?: string;
 
 // Assignment
 assignedVehicleId?: string;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Metadata
 createdAt: string;
 updatedAt: string;
}

export interface TripLogbook {
 id: string;
 tripNumber: string; // Auto-generated
 
 // Vehicle & Driver
 vehicleId: string;
 vehicleRegistration: string;
 driverId: string;
 driverName: string;
 
 // Trip Details
 tripDate: string;
 tripPurpose: string;
 projectId?: string;
 projectName?: string;
 
 // Route
 startLocation: string;
 endLocation: string;
 route?: string;
 
 // Mileage
 startMileage: number;
 endMileage: number;
 totalMileage: number;
 
 // Time
 departureTime: string;
 arrivalTime: string;
 
 // Passengers
 passengers?: string[];
 
 // Status
 status: 'planned' | 'in_progress' | 'completed';
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

export interface FuelRequest {
 id: string;
 fuelRequestNumber: string; // Auto-generated
 
 // Vehicle & Driver
 vehicleId: string;
 vehicleRegistration: string;
 driverId: string;
 driverName: string;
 
 // Fuel Details
 requestDate: string;
 fuelType: FuelType;
 requestedQuantity: number; // liters
 estimatedCost: number;
 currency: string;
 
 // Purpose
 purpose: string;
 projectId?: string;
 
 // Approval
 status: 'pending' | 'approved' | 'rejected' | 'dispensed';
 approvedBy?: string;
 approvedDate?: string;
 
 // Dispensing
 actualQuantity?: number;
 actualCost?: number;
 dispensedDate?: string;
 dispensedBy?: string;
 receiptNumber?: string;
 
 // Mileage at request
 currentMileage: number;
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

export interface VehicleMaintenance {
 id: string;
 maintenanceNumber: string; // Auto-generated
 
 // Vehicle
 vehicleId: string;
 vehicleRegistration: string;
 
 // Maintenance Details
 maintenanceDate: string;
 maintenanceType: 'routine' | 'repair' | 'emergency' | 'inspection';
 description: string;
 
 // Service Provider
 serviceProvider: string;
 serviceLocation: string;
 
 // Work Done
 workPerformed: string;
 partsReplaced?: string[];
 
 // Cost
 laborCost: number;
 partsCost: number;
 totalCost: number;
 currency: string;
 
 // Mileage
 mileageAtService: number;
 
 // Documents
 invoiceNumber?: string;
 receiptAttachments?: string[];
 
 // Status
 status: 'scheduled' | 'in_progress' | 'completed';
 
 // Context
 organizationId: string;
 operatingUnitId: string;
 
 // Metadata
 createdAt: string;
 createdBy: string;
 updatedAt: string;
 updatedBy: string;
}

// ============================================================================
// LANDING VIEW CARD TYPES
// ============================================================================

export interface LogisticsCard {
 id: string;
 title: string;
 titleAr: string;
 subtitle: string;
 subtitleAr: string;
 icon: string; // Lucide icon name
 path: string;
 count?: number;
 status?: 'active' | 'pending' | 'alert';
 color: string; // Tailwind color class
}