/**
 * PDF Document Type Registry
 * Central registry for all document types that can be generated as PDFs
 * Used to ensure consistent PDF generation across all modules
 */

export enum PdfDocumentType {
  BID_OPENING_MINUTES = "bid_opening_minutes",
  PURCHASE_REQUEST = "purchase_request",
  BID_ANALYSIS = "bid_analysis",
  ATTENDANCE = "attendance",
  CONTRACT = "contract",
  HR_OFFER_LETTER = "hr_offer_letter",
  HR_PAYROLL = "hr_payroll",
  FINANCE_PAYMENT_VOUCHER = "finance_payment_voucher",
  FINANCE_BUDGET_APPROVAL = "finance_budget_approval",
  DONOR_REPORT = "donor_report",
  ASSET_FORM = "asset_form",
  COMPLIANCE_AUDIT_REPORT = "compliance_audit_report"
}

export interface PdfDocumentConfig {
  type: PdfDocumentType;
  name: string;
  description: string;
  module: string;
  templatePath: string;
}

/**
 * Registry of all PDF document types
 * Maps document type to configuration
 */
export const PDF_REGISTRY: Record<PdfDocumentType, PdfDocumentConfig> = {
  [PdfDocumentType.BID_OPENING_MINUTES]: {
    type: PdfDocumentType.BID_OPENING_MINUTES,
    name: "Bid Opening Minutes",
    description: "Minutes from bid opening ceremony",
    module: "Logistics",
    templatePath: "server/services/pdf/templates/logistics/bidOpeningMinutesTemplate.ts"
  },
  [PdfDocumentType.PURCHASE_REQUEST]: {
    type: PdfDocumentType.PURCHASE_REQUEST,
    name: "Purchase Request",
    description: "Purchase request form",
    module: "Procurement",
    templatePath: "server/services/pdf/templates/logistics/purchaseRequestTemplate.ts"
  },
  [PdfDocumentType.BID_ANALYSIS]: {
    type: PdfDocumentType.BID_ANALYSIS,
    name: "Bid Analysis",
    description: "Bid analysis report",
    module: "Procurement",
    templatePath: "server/services/pdf/templates/logistics/bidAnalysisTemplate.ts"
  },
  [PdfDocumentType.CONTRACT]: {
    type: PdfDocumentType.CONTRACT,
    name: "Contract",
    description: "Contract document",
    module: "Procurement",
    templatePath: "server/services/pdf/templates/logistics/contractTemplate.ts"
  },
  [PdfDocumentType.ATTENDANCE]: {
    type: PdfDocumentType.ATTENDANCE,
    name: "Attendance Report",
    description: "Employee attendance report",
    module: "HR",
    templatePath: "server/services/pdf/templates/hr/attendanceTemplate.ts"
  },
  [PdfDocumentType.HR_OFFER_LETTER]: {
    type: PdfDocumentType.HR_OFFER_LETTER,
    name: "Offer Letter",
    description: "Employee offer letter",
    module: "HR",
    templatePath: "server/services/pdf/templates/hr/offerLetterTemplate.ts"
  },
  [PdfDocumentType.HR_PAYROLL]: {
    type: PdfDocumentType.HR_PAYROLL,
    name: "Payroll Report",
    description: "Payroll report",
    module: "HR",
    templatePath: "server/services/pdf/templates/hr/payrollTemplate.ts"
  },
  [PdfDocumentType.FINANCE_PAYMENT_VOUCHER]: {
    type: PdfDocumentType.FINANCE_PAYMENT_VOUCHER,
    name: "Payment Voucher",
    description: "Payment voucher",
    module: "Finance",
    templatePath: "server/services/pdf/templates/finance/paymentVoucherTemplate.ts"
  },
  [PdfDocumentType.FINANCE_BUDGET_APPROVAL]: {
    type: PdfDocumentType.FINANCE_BUDGET_APPROVAL,
    name: "Budget Approval",
    description: "Budget approval document",
    module: "Finance",
    templatePath: "server/services/pdf/templates/finance/budgetApprovalTemplate.ts"
  },
  [PdfDocumentType.DONOR_REPORT]: {
    type: PdfDocumentType.DONOR_REPORT,
    name: "Donor Report",
    description: "Donor report",
    module: "MEAL",
    templatePath: "server/services/pdf/templates/meal/donorReportTemplate.ts"
  },
  [PdfDocumentType.ASSET_FORM]: {
    type: PdfDocumentType.ASSET_FORM,
    name: "Asset Form",
    description: "Asset form",
    module: "Assets",
    templatePath: "server/services/pdf/templates/assets/assetFormTemplate.ts"
  },
  [PdfDocumentType.COMPLIANCE_AUDIT_REPORT]: {
    type: PdfDocumentType.COMPLIANCE_AUDIT_REPORT,
    name: "Audit Report",
    description: "Compliance audit report",
    module: "Compliance",
    templatePath: "server/services/pdf/templates/compliance/auditReportTemplate.ts"
  }
};

/**
 * Get PDF document configuration by type
 */
export function getPdfConfig(type: PdfDocumentType): PdfDocumentConfig {
  const config = PDF_REGISTRY[type];
  if (!config) {
    throw new Error(`Unknown PDF document type: ${type}`);
  }
  return config;
}

/**
 * Get all PDF document types for a specific module
 */
export function getPdfsByModule(module: string): PdfDocumentConfig[] {
  return Object.values(PDF_REGISTRY).filter(config => config.module === module);
}

/**
 * Check if a document type is registered
 */
export function isPdfTypeRegistered(type: string): type is PdfDocumentType {
  return Object.values(PdfDocumentType).includes(type as PdfDocumentType);
}
