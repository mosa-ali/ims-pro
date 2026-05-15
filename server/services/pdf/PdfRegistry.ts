/**
 * ============================================================================
 * PDF DOCUMENT TYPE REGISTRY
 * ============================================================================
 * 
 * Central registry for all document types that can be generated as PDFs
 * Maps document types to their configurations and templates
 * 
 * Used by:
 * - generateLogisticsPDF.ts - PDF generation service
 * - generatedDocuments table - Metadata storage
 * - Frontend - Document type selection and validation
 * 
 * ============================================================================
 */

// ============================================================================
// DOCUMENT TYPE ENUMS
// ============================================================================

/**
 * All supported PDF document types
 * Organized by module for easy reference
 */
export enum PdfDocumentType {
  // ========== LOGISTICS & PROCUREMENT ==========
  BID_OPENING_MINUTES = 'bid_opening_minutes',
  PURCHASE_REQUEST = 'purchase_request',
  GOODS_RECEIPT_NOTE = 'goods_receipt_note',
  STOCK_ISSUE = 'stock_issue',
  RETURNED_ITEMS = 'returned_items',
  BID_ANALYSIS = 'bid_analysis',
  QUOTATION_ANALYSIS = 'quotation_analysis',
  SERVICE_ACCEPTANCE_CERTIFICATE = 'service_acceptance_certificate',
  PURCHASE_ORDER = 'purchase_order',
  DELIVERY_NOTE = 'delivery_note',
  CONTRACT = 'contract',
  RFQ = 'rfq',
  QUOTATION = 'quotation',
  VENDOR_EVALUATION = 'vendor_evaluation',
  STOCK_ADJUSTMENT = 'stock_adjustment',
  STOCK_REQUEST = 'stock_request',
  STOCK_RESERVATION = 'stock_reservation',
  PHYSICAL_COUNT = 'physical_count',
  WAREHOUSE_TRANSFER = 'warehouse_transfer',

  // ========== FINANCE & ACCOUNTING ==========
  INVOICE = 'invoice',
  PAYMENT_VOUCHER = 'payment_voucher',
  EXPENSE_REPORT = 'expense_report',
  BUDGET_REPORT = 'budget_report',
  FINANCIAL_STATEMENT = 'financial_statement',
  BANK_RECONCILIATION = 'bank_reconciliation',
  JOURNAL_ENTRY = 'journal_entry',
  ASSET_REGISTER = 'asset_register',
  ASSET_DEPRECIATION = 'asset_depreciation_schedule',
  ASSET_DISPOSAL = 'asset_disposal',
  ASSET_TRANSFER = 'asset_transfer',
  ASSET_MAINTENANCE = 'asset_maintenance',
  PAYROLL_REPORT = 'payroll_report',
  FUND_BALANCE_REPORT = 'fund_balance_report',
  ADVANCE_SETTLEMENT = 'advance_settlement',
  COST_ALLOCATION_REPORT = 'cost_allocation_report',

  // ========== HR & PAYROLL ==========
  EMPLOYEE_CONTRACT = 'employee_contract',
  PAYROLL_SLIP = 'payroll_slip',
  ATTENDANCE_REPORT = 'attendance_report',
  LEAVE_REQUEST = 'leave_request',
  LEAVE_APPROVAL = 'leave_approval',
  RECRUITMENT_LETTER = 'recruitment_letter',
  RECRUITMENT_OFFER = 'recruitment_offer',
  PERFORMANCE_REVIEW = 'performance_review',
  TRAINING_CERTIFICATE = 'training_certificate',
  HR_REPORT = 'hr_report',

  // ========== PROJECTS & IMPLEMENTATION ==========
  PROJECT_REPORT = 'project_report',
  MONTHLY_REPORT = 'monthly_report',
  PROGRESS_REPORT = 'progress_report',
  ACTIVITY_REPORT = 'activity_report',
  MILESTONE_REPORT = 'milestone_report',
  PROJECT_PLAN = 'project_plan',
  PROJECT_CHARTER = 'project_charter',
  RISK_REGISTER = 'risk_register',
  LESSONS_LEARNED = 'lessons_learned',
  IMPLEMENTATION_CHECKLIST = 'implementation_checklist',
  IMPLEMENTATION_MONITORING = 'implementation_monitoring',
  IMPLEMENTATION_OBSERVATION = 'implementation_observation',

  // ========== DONOR CRM & PROPOSALS ==========
  DONOR_PROFILE = 'donor_profile',
  DONOR_COMMUNICATION = 'donor_communication',
  DONOR_REPORT = 'donor_report',
  PROPOSAL = 'proposal',
  GRANT_AGREEMENT = 'grant_agreement',
  GRANT_REPORT = 'grant_report',

  // ========== MEAL (Monitoring, Evaluation, Accountability & Learning) ==========
  MEAL_SURVEY = 'meal_survey',
  MEAL_DQA_VISIT = 'meal_dqa_visit',
  MEAL_INDICATOR_DATA = 'meal_indicator_data',
  MEAL_LEARNING_ITEM = 'meal_learning_item',

  // ========== FLEET & VEHICLE MANAGEMENT ==========
  VEHICLE_MAINTENANCE = 'vehicle_maintenance',
  VEHICLE_COMPLIANCE = 'vehicle_compliance',
  FUEL_LOG = 'fuel_log',
  TRIP_LOG = 'trip_log',

  // ========== WAREHOUSE & STOCK MANAGEMENT ==========
  STOCK_ITEM = 'stock_item',
  STOCK_BATCH = 'stock_batch',
  STOCK_LEDGER = 'stock_ledger',

  // ========== CASE MANAGEMENT & INCIDENTS ==========
  CASE_RECORD = 'case_record',
  INCIDENT_REPORT = 'incident_report',

  // ========== COMPLIANCE & RISK ==========
  AUDIT_LOG_EXPORT = 'audit_log_export',
  DOCUMENT_AUDIT_LOG = 'document_audit_log',

  // ========== GENERIC / OTHER ==========
  GENERAL_DOCUMENT = 'general_document',
  REPORT = 'report',
  CERTIFICATE = 'certificate',
  LETTER = 'letter',
  MEMO = 'memo',
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Configuration for a PDF document type
 */
export interface PdfDocumentConfig {
  /** Document type identifier */
  type: PdfDocumentType;
  /** Human-readable name */
  name: string;
  /** Description of the document */
  description: string;
  /** Module/system this document belongs to */
  module: string;
  /** Path to the PDF template generator */
  templatePath: string;
  /** Whether this document supports bilingual output (en/ar) */
  bilingual: boolean;
  /** Whether this document is currently active/enabled */
  active: boolean;
}

// ============================================================================
// REGISTRY - DOCUMENT TYPE CONFIGURATIONS
// ============================================================================

/**
 * Central registry of all PDF document types
 * Maps document type to configuration
 * 
 * ✅ FIXED: Using Record<string, PdfDocumentConfig> instead of Record<PdfDocumentType, ...>
 * This avoids TypeScript strict type checking issues with computed property names
 */
export const PDF_REGISTRY: Record<string, PdfDocumentConfig> = {
  // ========== LOGISTICS & PROCUREMENT ==========
  [PdfDocumentType.BID_OPENING_MINUTES]: {
    type: PdfDocumentType.BID_OPENING_MINUTES,
    name: 'Bid Opening Minutes',
    description: 'Minutes from bid opening ceremony',
    module: 'Logistics',
    templatePath: 'server/services/pdf/templates/logistics/bomPdfGenerator.ts',
    bilingual: true,
    active: true,
  },
  [PdfDocumentType.PURCHASE_REQUEST]: {
    type: PdfDocumentType.PURCHASE_REQUEST,
    name: 'Purchase Request',
    description: 'Purchase request form',
    module: 'Procurement',
    templatePath: 'server/services/pdf/templates/logistics/prPdfGenerator.ts',
    bilingual: true,
    active: true,
  },
  [PdfDocumentType.GOODS_RECEIPT_NOTE]: {
    type: PdfDocumentType.GOODS_RECEIPT_NOTE,
    name: 'Goods Receipt Note',
    description: 'GRN for received goods',
    module: 'Logistics',
    templatePath: 'server/services/pdf/templates/logistics/grnPdfGenerator.ts',
    bilingual: true,
    active: true,
  },
  [PdfDocumentType.STOCK_ISSUE]: {
    type: PdfDocumentType.STOCK_ISSUE,
    name: 'Stock Issue',
    description: 'Stock issue document',
    module: 'Logistics',
    templatePath: 'server/services/pdf/templates/logistics/stockIssuePdfGenerator.ts',
    bilingual: true,
    active: true,
  },
  [PdfDocumentType.RETURNED_ITEMS]: {
    type: PdfDocumentType.RETURNED_ITEMS,
    name: 'Returned Items',
    description: 'Returned items document',
    module: 'Logistics',
    templatePath: 'server/services/pdf/templates/logistics/returnedItemsPdfGenerator.ts',
    bilingual: true,
    active: true,
  },
  [PdfDocumentType.BID_ANALYSIS]: {
    type: PdfDocumentType.BID_ANALYSIS,
    name: 'Bid Analysis',
    description: 'Bid analysis report',
    module: 'Procurement',
    templatePath: 'server/services/pdf/templates/logistics/bidAnalysisPdfGenerator.ts',
    bilingual: true,
    active: true,
  },
  [PdfDocumentType.QUOTATION_ANALYSIS]: {
    type: PdfDocumentType.QUOTATION_ANALYSIS,
    name: 'Quotation Analysis',
    description: 'Quotation analysis report',
    module: 'Procurement',
    templatePath: 'server/services/pdf/templates/logistics/quotationAnalysisPdfGenerator.ts',
    bilingual: true,
    active: true,
  },
  [PdfDocumentType.SERVICE_ACCEPTANCE_CERTIFICATE]: {
    type: PdfDocumentType.SERVICE_ACCEPTANCE_CERTIFICATE,
    name: 'Service Acceptance Certificate',
    description: 'SAC for service completion',
    module: 'Procurement',
    templatePath: 'server/services/pdf/templates/logistics/sacPdfGenerator.ts',
    bilingual: true,
    active: true,
  },
  [PdfDocumentType.PURCHASE_ORDER]: {
    type: PdfDocumentType.PURCHASE_ORDER,
    name: 'Purchase Order',
    description: 'Purchase order document',
    module: 'Procurement',
    templatePath: 'server/services/pdf/templates/logistics/purchaseOrderPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.DELIVERY_NOTE]: {
    type: PdfDocumentType.DELIVERY_NOTE,
    name: 'Delivery Note',
    description: 'Delivery note document',
    module: 'Logistics',
    templatePath: 'server/services/pdf/templates/logistics/deliveryNotePdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.CONTRACT]: {
    type: PdfDocumentType.CONTRACT,
    name: 'Contract',
    description: 'Contract document',
    module: 'Procurement',
    templatePath: 'server/services/pdf/templates/logistics/contractPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.RFQ]: {
    type: PdfDocumentType.RFQ,
    name: 'Request for Quotation',
    description: 'RFQ document',
    module: 'Procurement',
    templatePath: 'server/services/pdf/templates/logistics/rfqPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.QUOTATION]: {
    type: PdfDocumentType.QUOTATION,
    name: 'Quotation',
    description: 'Quotation document',
    module: 'Procurement',
    templatePath: 'server/services/pdf/templates/logistics/quotationPdfGenerator.ts',
    bilingual: true,
    active: false,
  },

  // ========== FINANCE & ACCOUNTING ==========
  [PdfDocumentType.INVOICE]: {
    type: PdfDocumentType.INVOICE,
    name: 'Invoice',
    description: 'Invoice document',
    module: 'Finance',
    templatePath: 'server/services/pdf/templates/finance/invoicePdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.PAYMENT_VOUCHER]: {
    type: PdfDocumentType.PAYMENT_VOUCHER,
    name: 'Payment Voucher',
    description: 'Payment voucher',
    module: 'Finance',
    templatePath: 'server/services/pdf/templates/finance/paymentVoucherPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.EXPENSE_REPORT]: {
    type: PdfDocumentType.EXPENSE_REPORT,
    name: 'Expense Report',
    description: 'Expense report',
    module: 'Finance',
    templatePath: 'server/services/pdf/templates/finance/expenseReportPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.BUDGET_REPORT]: {
    type: PdfDocumentType.BUDGET_REPORT,
    name: 'Budget Report',
    description: 'Budget report',
    module: 'Finance',
    templatePath: 'server/services/pdf/templates/finance/budgetReportPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
    [PdfDocumentType.PAYROLL_SLIP]: {
    type: PdfDocumentType.PAYROLL_SLIP,
    name: 'Payroll Slip',
    description: 'Payroll slip',
    module: 'HR',
    templatePath: 'server/services/pdf/templates/hr/payrollSlipPdfGenerator.ts',
    bilingual: true,
    active: false,
  },

  // ========== HR & PAYROLL ==========
  [PdfDocumentType.EMPLOYEE_CONTRACT]: {
    type: PdfDocumentType.EMPLOYEE_CONTRACT,
    name: 'Employee Contract',
    description: 'Employee contract',
    module: 'HR',
    templatePath: 'server/services/pdf/templates/hr/employeeContractPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.COST_ALLOCATION_REPORT]: {
    type: PdfDocumentType.COST_ALLOCATION_REPORT,
    name: 'Cost Allocation Report',
    description: 'Cost Allocation Report',
    module: 'Finance',
    templatePath: 'server/services/pdf/templates/Finance/costAllocationReportPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.ATTENDANCE_REPORT]: {
    type: PdfDocumentType.ATTENDANCE_REPORT,
    name: 'Attendance Report',
    description: 'Attendance report',
    module: 'HR',
    templatePath: 'server/services/pdf/templates/hr/attendanceReportPdfGenerator.ts',
    bilingual: true,
    active: false,
  },

  // ========== PROJECTS & IMPLEMENTATION ==========
  [PdfDocumentType.PROJECT_REPORT]: {
    type: PdfDocumentType.PROJECT_REPORT,
    name: 'Project Report',
    description: 'Project report',
    module: 'Projects',
    templatePath: 'server/services/pdf/templates/projects/projectReportPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.MONTHLY_REPORT]: {
    type: PdfDocumentType.MONTHLY_REPORT,
    name: 'Monthly Report',
    description: 'Monthly report',
    module: 'Projects',
    templatePath: 'server/services/pdf/templates/projects/monthlyReportPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.PROGRESS_REPORT]: {
    type: PdfDocumentType.PROGRESS_REPORT,
    name: 'Progress Report',
    description: 'Progress report',
    module: 'Projects',
    templatePath: 'server/services/pdf/templates/projects/progressReportPdfGenerator.ts',
    bilingual: true,
    active: false,
  },

  // ========== GENERIC / OTHER ==========
  [PdfDocumentType.GENERAL_DOCUMENT]: {
    type: PdfDocumentType.GENERAL_DOCUMENT,
    name: 'General Document',
    description: 'Generic document',
    module: 'General',
    templatePath: 'server/services/pdf/templates/general/generalDocumentPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.REPORT]: {
    type: PdfDocumentType.REPORT,
    name: 'Report',
    description: 'Generic report',
    module: 'General',
    templatePath: 'server/services/pdf/templates/general/reportPdfGenerator.ts',
    bilingual: true,
    active: false,
  },
  [PdfDocumentType.CERTIFICATE]: {
    type: PdfDocumentType.CERTIFICATE,
    name: 'Certificate',
    description: 'Certificate document',
    module: 'General',
    templatePath: 'server/services/pdf/templates/general/certificatePdfGenerator.ts',
    bilingual: true,
    active: false,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get configuration for a document type
 */
export function getDocumentConfig(docType: PdfDocumentType): PdfDocumentConfig | undefined {
  return PDF_REGISTRY[docType];
}

/**
 * Check if a document type is active
 */
export function isDocumentTypeActive(docType: PdfDocumentType): boolean {
  const config = getDocumentConfig(docType);
  return config?.active ?? false;
}

/**
 * Get all active document types
 */
export function getActiveDocumentTypes(): PdfDocumentConfig[] {
  return Object.values(PDF_REGISTRY).filter((config) => config.active);
}

/**
 * Get document types by module
 */
export function getDocumentsByModule(module: string): PdfDocumentConfig[] {
  return Object.values(PDF_REGISTRY).filter((config) => config.module === module);
}

/**
 * Get bilingual document types
 */
export function getBilingualDocuments(): PdfDocumentConfig[] {
  return Object.values(PDF_REGISTRY).filter((config) => config.bilingual);
}
