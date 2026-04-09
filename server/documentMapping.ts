/**
 * Document Mapping Framework
 * 
 * Centralized configuration that defines how every evidence-producing action
 * routes documents to SharePoint and Central Documents.
 * 
 * This is the Evidence Control Tower - ensures all compliance and operational
 * evidence is automatically captured, routed, and traceable.
 */

import { getDb } from "./db";

const db = getDb();
import { documents } from "../drizzle/schema";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { isNull } from "drizzle-orm";

/**
 * Evidence Types
 */
export type EvidenceType = "pdf" | "excel" | "attachment" | "system_snapshot";

/**
 * Trigger Events that produce evidence
 */
export type TriggerEvent =
  | "submit"           // Submit for approval
  | "approve"          // Approval decision
  | "reject"           // Rejection decision
  | "close"            // Close/Complete
  | "export"           // Manual export
  | "publish"          // Publish/Finalize
  | "contract_finalize" // Contract finalization
  | "procurement_award" // Procurement award
  | "payment_approve"   // Payment approval
  | "incident_close"    // Incident closure
  | "risk_mitigate"     // Risk mitigation approval
  | "donor_submit";     // Donor reporting submission

/**
 * Document Map Entry
 * Defines routing rules for a specific module/screen/entity/trigger combination
 */
export interface DocumentMapEntry {
  // Identification
  module: string;                    // e.g., "projects", "hr", "finance"
  screen: string;                    // e.g., "activities", "contracts", "payroll"
  subScreen?: string;                // Optional sub-screen
  entityType: string;                // e.g., "Project", "Contract", "Risk"
  
  // Trigger
  triggerEvent: TriggerEvent;
  
  // Evidence
  evidenceType: EvidenceType;
  
  // Routing
  workspace: "projects" | "meal" | "hr" | "finance" | "logistics" | "donor_crm" | "risk_compliance";
  folderKey: string;                 // e.g., "03_Activities", "Contracts"
  
  // SharePoint Destination
  sharePointPathTemplate: string;    // e.g., "/Projects/{{projectCode}}/{{folderKey}}/"
  namingTemplate: string;            // e.g., "{{entityType}}_{{entityId}}_{{timestamp}}.{{ext}}"
  
  // Metadata
  metadataTags: string[];            // e.g., ["compliance", "donor_required"]
  
  // RBAC
  visibilityRoles: string[];         // e.g., ["admin", "project_manager"]
  
  // Compliance
  retentionYears?: number;           // Optional retention period
  complianceRule?: string;           // Optional compliance rule reference
}

/**
 * DOCUMENT MAP CONFIGURATION
 * 
 * This is the central registry of all evidence-producing actions in IMS.
 * Every entry defines how evidence is captured, routed, and stored.
 */
export const DOCUMENT_MAP: DocumentMapEntry[] = [
  // ============================================================================
  // PROJECTS MODULE
  // ============================================================================
  
  // Activities
  {
    module: "projects",
    screen: "activities",
    entityType: "Activity",
    triggerEvent: "submit",
    evidenceType: "pdf",
    workspace: "projects",
    folderKey: "03_Activities",
    sharePointPathTemplate: "/Projects/{{projectCode}}/03_Activities/",
    namingTemplate: "Activity_{{entityId}}_{{timestamp}}.pdf",
    metadataTags: ["activity", "submission"],
    visibilityRoles: ["admin", "project_manager", "project_coordinator"],
    retentionYears: 7,
  },
  {
    module: "projects",
    screen: "activities",
    entityType: "Activity",
    triggerEvent: "approve",
    evidenceType: "pdf",
    workspace: "projects",
    folderKey: "03_Activities",
    sharePointPathTemplate: "/Projects/{{projectCode}}/03_Activities/",
    namingTemplate: "Activity_{{entityId}}_Approved_{{timestamp}}.pdf",
    metadataTags: ["activity", "approval"],
    visibilityRoles: ["admin", "project_manager"],
    retentionYears: 7,
  },
  
  // Indicators
  {
    module: "projects",
    screen: "indicators",
    entityType: "Indicator",
    triggerEvent: "submit",
    evidenceType: "pdf",
    workspace: "projects",
    folderKey: "04_Indicators",
    sharePointPathTemplate: "/Projects/{{projectCode}}/04_Indicators/",
    namingTemplate: "Indicator_{{entityId}}_{{timestamp}}.pdf",
    metadataTags: ["indicator", "meal"],
    visibilityRoles: ["admin", "project_manager", "meal_officer"],
    retentionYears: 7,
  },
  
  // Project Reports (Export)
  {
    module: "projects",
    screen: "project_report",
    entityType: "ProjectReport",
    triggerEvent: "export",
    evidenceType: "pdf",
    workspace: "projects",
    folderKey: "11_Project_Report",
    sharePointPathTemplate: "/Projects/{{projectCode}}/11_Project_Report/",
    namingTemplate: "{{projectCode}}_Report_{{timestamp}}.pdf",
    metadataTags: ["report", "donor_required"],
    visibilityRoles: ["admin", "project_manager"],
    retentionYears: 10,
    complianceRule: "DONOR_REPORTING",
  },
  
  // Monthly Reports (Export)
  {
    module: "projects",
    screen: "monthly_report",
    entityType: "MonthlyReport",
    triggerEvent: "export",
    evidenceType: "pdf",
    workspace: "projects",
    folderKey: "12_Monthly_Report",
    sharePointPathTemplate: "/Projects/{{projectCode}}/12_Monthly_Report/",
    namingTemplate: "{{projectCode}}_Monthly_{{month}}_{{year}}.pdf",
    metadataTags: ["report", "monthly"],
    visibilityRoles: ["admin", "project_manager"],
    retentionYears: 7,
  },
  
  // Financial Overview (Export)
  {
    module: "projects",
    screen: "financial_overview",
    entityType: "FinancialOverview",
    triggerEvent: "export",
    evidenceType: "excel",
    workspace: "projects",
    folderKey: "01_Financial_Overview",
    sharePointPathTemplate: "/Projects/{{projectCode}}/01_Financial_Overview/",
    namingTemplate: "{{projectCode}}_Financial_{{timestamp}}.xlsx",
    metadataTags: ["financial", "compliance"],
    visibilityRoles: ["admin", "project_manager", "finance_manager"],
    retentionYears: 10,
    complianceRule: "FINANCIAL_AUDIT",
  },
  
  // ============================================================================
  // HR MODULE
  // ============================================================================
  
  // Employee Contracts
  {
    module: "hr",
    screen: "contracts",
    entityType: "Contract",
    triggerEvent: "contract_finalize",
    evidenceType: "pdf",
    workspace: "hr",
    folderKey: "Contracts",
    sharePointPathTemplate: "/HR/{{operatingUnit}}/{{year}}/Contracts/",
    namingTemplate: "Contract_{{employeeId}}_{{timestamp}}.pdf",
    metadataTags: ["contract", "legal"],
    visibilityRoles: ["admin", "hr_manager"],
    retentionYears: 10,
    complianceRule: "LABOR_LAW",
  },
  
  // Payroll
  {
    module: "hr",
    screen: "payroll",
    entityType: "Payroll",
    triggerEvent: "approve",
    evidenceType: "excel",
    workspace: "hr",
    folderKey: "Payroll",
    sharePointPathTemplate: "/HR/{{operatingUnit}}/{{year}}/Payroll/",
    namingTemplate: "Payroll_{{month}}_{{year}}.xlsx",
    metadataTags: ["payroll", "financial"],
    visibilityRoles: ["admin", "hr_manager", "finance_manager"],
    retentionYears: 10,
    complianceRule: "FINANCIAL_AUDIT",
  },
  
  // ============================================================================
  // FINANCE MODULE
  // ============================================================================
  
  // Payment Approvals
  {
    module: "finance",
    screen: "payments",
    entityType: "Payment",
    triggerEvent: "payment_approve",
    evidenceType: "pdf",
    workspace: "finance",
    folderKey: "Payments",
    sharePointPathTemplate: "/Finance/{{operatingUnit}}/{{year}}/Payments/",
    namingTemplate: "Payment_{{paymentId}}_{{timestamp}}.pdf",
    metadataTags: ["payment", "approval"],
    visibilityRoles: ["admin", "finance_manager"],
    retentionYears: 10,
    complianceRule: "FINANCIAL_AUDIT",
  },
  
  // Audit Reports
  {
    module: "finance",
    screen: "audit",
    entityType: "AuditReport",
    triggerEvent: "publish",
    evidenceType: "pdf",
    workspace: "finance",
    folderKey: "Audit",
    sharePointPathTemplate: "/Finance/{{operatingUnit}}/{{year}}/Audit/",
    namingTemplate: "Audit_{{year}}_{{timestamp}}.pdf",
    metadataTags: ["audit", "compliance"],
    visibilityRoles: ["admin", "finance_manager"],
    retentionYears: 15,
    complianceRule: "FINANCIAL_AUDIT",
  },
  
  // ============================================================================
  // LOGISTICS MODULE - PROCUREMENT WORKFLOW
  // ============================================================================
  // Following real procurement lifecycle: PR -> RFQ -> Bid Opening -> Quotations ->
  // Bid Evaluation -> CBA -> Contracts -> PO -> GRN -> DN -> SAC -> Payments -> Audit
  
  // 1. Purchase Requests
  {
    module: "logistics",
    screen: "purchase_requests",
    entityType: "PurchaseRequest",
    triggerEvent: "submit",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "01_Purchase_Requests",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/01_Purchase_Requests/",
    namingTemplate: "PR_{{prId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "purchase_request"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // 2. RFQ / Tender Documents
  {
    module: "logistics",
    screen: "rfq",
    entityType: "RFQ",
    triggerEvent: "publish",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "02_RFQ_Tender_Documents",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/02_RFQ_Tender_Documents/",
    namingTemplate: "RFQ_{{rfqId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "rfq", "tender"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // 3. Bid Opening Minutes
  {
    module: "logistics",
    screen: "bid_opening",
    entityType: "BidOpening",
    triggerEvent: "close",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "03_Bid_Opening_Minutes",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/03_Bid_Opening_Minutes/",
    namingTemplate: "BidOpening_{{rfqId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "bid_opening"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // 4. Supplier Quotations / Offer Matrix
  {
    module: "logistics",
    screen: "quotations",
    entityType: "Quotation",
    triggerEvent: "submit",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "04_Supplier_Quotations",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/04_Supplier_Quotations/",
    namingTemplate: "Quotation_{{supplierId}}_{{rfqId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "quotation", "supplier_offer"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // 5. Bid Evaluation
  {
    module: "logistics",
    screen: "bid_evaluation",
    entityType: "BidEvaluation",
    triggerEvent: "approve",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "05_Bid_Evaluation",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/05_Bid_Evaluation/",
    namingTemplate: "BidEvaluation_{{rfqId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "bid_evaluation"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // 6. Quotation Analysis / Competitive Bid Analysis
  {
    module: "logistics",
    screen: "competitive_bid_analysis",
    entityType: "CompetitiveBidAnalysis",
    triggerEvent: "publish",
    evidenceType: "excel",
    workspace: "logistics",
    folderKey: "06_Competitive_Bid_Analysis",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/06_Competitive_Bid_Analysis/",
    namingTemplate: "CBA_{{rfqId}}_{{timestamp}}.xlsx",
    metadataTags: ["procurement", "cba", "analysis"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // 7. Contracts
  {
    module: "logistics",
    screen: "contracts",
    entityType: "Contract",
    triggerEvent: "contract_finalize",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "07_Contracts",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/07_Contracts/",
    namingTemplate: "Contract_{{contractId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "contract", "legal"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 10,
    complianceRule: "CONTRACT_MANAGEMENT",
  },
  
  // 8. Purchase Orders
  {
    module: "logistics",
    screen: "purchase_orders",
    entityType: "PurchaseOrder",
    triggerEvent: "approve",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "08_Purchase_Orders",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/08_Purchase_Orders/",
    namingTemplate: "PO_{{poId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "purchase_order"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // 9. Goods Receipt Notes
  {
    module: "logistics",
    screen: "goods_receipt_notes",
    entityType: "GoodsReceiptNote",
    triggerEvent: "approve",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "09_Goods_Receipt_Notes",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/09_Goods_Receipt_Notes/",
    namingTemplate: "GRN_{{grnId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "grn", "receipt"],
    visibilityRoles: ["admin", "logistics_manager", "warehouse_manager"],
    retentionYears: 7,
  },
  
  // 10. Delivery Notes
  {
    module: "logistics",
    screen: "delivery_notes",
    entityType: "DeliveryNote",
    triggerEvent: "approve",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "10_Delivery_Notes",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/10_Delivery_Notes/",
    namingTemplate: "DN_{{dnId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "delivery_note"],
    visibilityRoles: ["admin", "logistics_manager", "warehouse_manager"],
    retentionYears: 7,
  },
  
  // 11. Service Acceptance Certificates
  {
    module: "logistics",
    screen: "service_acceptance_certificates",
    entityType: "ServiceAcceptanceCertificate",
    triggerEvent: "approve",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "11_Service_Acceptance_Certificates",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/11_Service_Acceptance_Certificates/",
    namingTemplate: "SAC_{{sacId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "sac", "acceptance"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // 12. Payments / Supporting Finance Documents
  {
    module: "logistics",
    screen: "payments",
    entityType: "Payment",
    triggerEvent: "payment_approve",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "12_Payments_Finance_Documents",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/12_Payments_Finance_Documents/",
    namingTemplate: "Payment_{{paymentId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "payment", "finance"],
    visibilityRoles: ["admin", "logistics_manager", "finance_manager"],
    retentionYears: 10,
    complianceRule: "FINANCIAL_AUDIT",
  },
  
  // 13. Audit Logs / Supporting Attachments
  {
    module: "logistics",
    screen: "audit_logs",
    entityType: "AuditLog",
    triggerEvent: "publish",
    evidenceType: "pdf",
    workspace: "logistics",
    folderKey: "13_Audit_Logs_Supporting_Attachments",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/13_Audit_Logs_Supporting_Attachments/",
    namingTemplate: "AuditLog_{{prId}}_{{timestamp}}.pdf",
    metadataTags: ["procurement", "audit", "compliance"],
    visibilityRoles: ["admin", "logistics_manager"],
    retentionYears: 10,
    complianceRule: "AUDIT_TRAIL",
  },
  
  // ============================================================================
  // LOGISTICS MODULE - SUPPORTING AREAS (Non-Procurement)
  // ============================================================================
  
  // Stock Management
  {
    module: "logistics",
    screen: "stock_management",
    entityType: "StockRecord",
    triggerEvent: "export",
    evidenceType: "excel",
    workspace: "logistics",
    folderKey: "Stock_Management",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/Stock_Management/",
    namingTemplate: "Stock_Report_{{timestamp}}.xlsx",
    metadataTags: ["logistics", "stock", "inventory"],
    visibilityRoles: ["admin", "logistics_manager", "warehouse_manager"],
    retentionYears: 7,
  },
  
  // Fleet Management
  {
    module: "logistics",
    screen: "fleet_management",
    entityType: "FleetRecord",
    triggerEvent: "export",
    evidenceType: "excel",
    workspace: "logistics",
    folderKey: "Fleet_Management",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/Fleet_Management/",
    namingTemplate: "Fleet_Report_{{timestamp}}.xlsx",
    metadataTags: ["logistics", "fleet", "vehicles"],
    visibilityRoles: ["admin", "logistics_manager"],
    retentionYears: 7,
  },
  
  // Vendor Performance
  {
    module: "logistics",
    screen: "vendor_performance",
    entityType: "VendorPerformance",
    triggerEvent: "export",
    evidenceType: "excel",
    workspace: "logistics",
    folderKey: "Vendor_Performance",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/Vendor_Performance/",
    namingTemplate: "VendorPerformance_{{timestamp}}.xlsx",
    metadataTags: ["logistics", "vendor", "performance"],
    visibilityRoles: ["admin", "logistics_manager", "procurement_officer"],
    retentionYears: 7,
  },
  
  // Asset Records
  {
    module: "logistics",
    screen: "asset_records",
    entityType: "AssetRecord",
    triggerEvent: "export",
    evidenceType: "excel",
    workspace: "logistics",
    folderKey: "Asset_Records",
    sharePointPathTemplate: "/Logistics/{{operatingUnit}}/{{year}}/Asset_Records/",
    namingTemplate: "Assets_Report_{{timestamp}}.xlsx",
    metadataTags: ["logistics", "assets", "inventory"],
    visibilityRoles: ["admin", "logistics_manager"],
    retentionYears: 10,
  },
  
  // ============================================================================
  // RISK & COMPLIANCE MODULE
  // ============================================================================
  
  // Risk Mitigation
  {
    module: "risk",
    screen: "risks",
    entityType: "Risk",
    triggerEvent: "risk_mitigate",
    evidenceType: "pdf",
    workspace: "risk_compliance",
    folderKey: "Risk_Mitigation",
    sharePointPathTemplate: "/Risk/{{operatingUnit}}/{{year}}/Mitigation/",
    namingTemplate: "Risk_{{riskId}}_Mitigation_{{timestamp}}.pdf",
    metadataTags: ["risk", "mitigation"],
    visibilityRoles: ["admin", "risk_manager"],
    retentionYears: 7,
  },
  
  // Incident Closure
  {
    module: "risk",
    screen: "incidents",
    entityType: "Incident",
    triggerEvent: "incident_close",
    evidenceType: "pdf",
    workspace: "risk_compliance",
    folderKey: "Incidents",
    sharePointPathTemplate: "/Risk/{{operatingUnit}}/{{year}}/Incidents/",
    namingTemplate: "Incident_{{incidentId}}_Closure_{{timestamp}}.pdf",
    metadataTags: ["incident", "closure"],
    visibilityRoles: ["admin", "risk_manager"],
    retentionYears: 7,
  },
  
  // ============================================================================
  // DONOR CRM MODULE
  // ============================================================================
  
  // Donor Reports
  {
    module: "donor_crm",
    screen: "reports",
    entityType: "DonorReport",
    triggerEvent: "donor_submit",
    evidenceType: "pdf",
    workspace: "donor_crm",
    folderKey: "Reports",
    sharePointPathTemplate: "/DonorCRM/{{operatingUnit}}/{{year}}/Reports/",
    namingTemplate: "Donor_Report_{{donorId}}_{{timestamp}}.pdf",
    metadataTags: ["donor", "report", "compliance"],
    visibilityRoles: ["admin", "donor_relations_manager"],
    retentionYears: 10,
    complianceRule: "DONOR_REPORTING",
  },
];

/**
 * Template Variable Resolver
 * Replaces template variables with actual values
 */
export function resolveTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let resolved = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    resolved = resolved.replace(new RegExp(placeholder, "g"), String(value));
  }
  
  return resolved;
}

/**
 * Find Document Map Entry
 * Finds the routing configuration for a specific action
 */
export function findDocumentMapEntry(
  module: string,
  screen: string,
  triggerEvent: TriggerEvent,
  entityType?: string
): DocumentMapEntry | undefined {
  return DOCUMENT_MAP.find(
    (entry) =>
      entry.module === module &&
      entry.screen === screen &&
      entry.triggerEvent === triggerEvent &&
      (!entityType || entry.entityType === entityType)
  );
}

/**
 * Generate Evidence Document
 * Creates and syncs evidence document based on Document Map configuration
 * 
 * @param mapEntry - Document Map configuration
 * @param fileBuffer - File content (PDF/Excel/etc.)
 * @param variables - Template variables (projectCode, entityId, etc.)
 * @param context - Request context (organizationId, operatingUnitId, userId)
 * @returns Document record with SharePoint URL
 */
export async function generateEvidenceDocument(
  mapEntry: DocumentMapEntry,
  fileBuffer: Buffer,
  variables: Record<string, any>,
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  }
) {
  // Resolve file name from template
  const fileName = resolveTemplate(mapEntry.namingTemplate, {
    ...variables,
    timestamp: new Date().toISOString().replace(/[:.]/g, "-"),
    ext: mapEntry.evidenceType === "pdf" ? "pdf" : "xlsx",
  });
  
  // Resolve SharePoint path from template
  const sharePointPath = resolveTemplate(mapEntry.sharePointPathTemplate, variables);
  
  // Upload to S3 (SharePoint integration)
  const fileKey = `${sharePointPath}${fileName}`;
  const { url: filePath } = await storagePut(
    fileKey,
    fileBuffer,
    mapEntry.evidenceType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  
  // Check for existing document with same name (versioning)
  const existing = await db.query.documents.findFirst({
    where: (docs, { and, eq }) =>
      and(
        eq(docs.organizationId, context.organizationId),
        eq(docs.operatingUnitId, context.operatingUnitId),
        eq(docs.workspace, mapEntry.workspace),
        eq(docs.folderCode, mapEntry.folderKey),
        eq(docs.fileName, fileName.replace(/\.\w+$/, "")) // Without extension
      ),
  });
  
  const version = existing ? (existing.version || 1) + 1 : 1;
  const versionedFileName = version > 1 ? fileName.replace(/(\.\w+)$/, `_v${version}$1`) : fileName;
  
  // Create document record in metadata registry
  const [document] = await db.insert(documents).values({
    documentId: nanoid(),
    workspace: mapEntry.workspace,
    folderCode: mapEntry.folderKey,
    projectId: variables.projectCode || null,
    fileName: versionedFileName.replace(/\.\w+$/, ""), // Without extension
    filePath,
    fileType: mapEntry.evidenceType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: fileBuffer.length,
    uploadedBy: context.userId,
    uploadedAt: new Date(),
    syncSource: `${mapEntry.module}_${mapEntry.screen}_${mapEntry.triggerEvent}`,
    syncStatus: "synced",
    version,
    entityType: mapEntry.entityType,
    entityId: variables.entityId || null,
    organizationId: context.organizationId,
    operatingUnitId: context.operatingUnitId,
    isFolder: false,
    parentFolderId: null,
  }).returning();
  
  return document;
}

/**
 * Get Evidence Documents for Entity
 * Retrieves all evidence documents linked to a specific entity
 * 
 * @param module - Module name
 * @param screen - Screen name
 * @param entityId - Entity ID (projectCode, contractId, etc.)
 * @param context - Request context
 * @returns List of evidence documents
 */
export async function getEvidenceDocuments(
  module: string,
  screen: string,
  entityId: string,
  context: {
    organizationId: number;
    operatingUnitId: number;
  }
) {
  // Find all map entries for this module/screen
  const mapEntries = DOCUMENT_MAP.filter(
    (entry) => entry.module === module && entry.screen === screen
  );
  
  if (mapEntries.length === 0) {
    return [];
  }
  
  // Get workspace and folder keys
  const workspace = mapEntries[0].workspace;
  const folderKeys = [...new Set(mapEntries.map((e) => e.folderKey))];
  
  // Query documents
  const evidenceDocs = await db.query.documents.findMany({
    where: (docs, { and, eq, inArray, like, isNull }) =>
      and(
        eq(docs.organizationId, context.organizationId),
        eq(docs.operatingUnitId, context.operatingUnitId),
        eq(docs.workspace, workspace),
        inArray(docs.folderCode, folderKeys),
        like(docs.syncSource, `${module}_${screen}_%`),
        isNull(docs.deletedAt)
      ),
    orderBy: (docs, { desc }) => [desc(docs.uploadedAt)],
  });
  
  return evidenceDocs;
}
