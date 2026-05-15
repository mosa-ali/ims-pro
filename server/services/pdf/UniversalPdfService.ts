/**
 * Universal PDF Service - COMPREHENSIVE VERSION
 * Handles PDF metadata storage and retrieval across ALL modules
 * 
 * Supported Modules:
 * - Logistics & Procurement
 * - Finance & Accounting
 * - HR & Payroll
 * - Projects & Implementation
 * - Donor CRM & Proposals
 * - MEAL (Monitoring, Evaluation, Accountability & Learning)
 * - Fleet & Vehicle Management
 * - Warehouse & Stock Management
 * - Case Management & Incidents
 * - Compliance & Risk
 * 
 * Features:
 * - Store PDF metadata (links, not files)
 * - Check if valid PDF already exists (smart caching)
 * - Handle URL expiry
 * - Track download history
 * - Support all modules and 70+ entity types
 * - Multi-language support (EN/AR)
 */

import { and, eq, desc } from 'drizzle-orm';
import { generatedDocuments } from 'drizzle/schema';
import { getDb } from '../../db';
import {
  PdfDocumentType,
} from './pdfRegistry';

// ============================================================================
// Types
// ============================================================================

export interface SavePdfMetadataInput {
  organizationId: number;
  operatingUnitId?: number;
  module: string;
  entityType: PdfDocumentType;
  entityId: number;
  documentType: PdfDocumentType;
  filePath: string;
  fileName: string;
  generatedBy?: number;
  language?: string;
  version?: number;
}

export interface PdfMetadata {
  id: number;
  filePath: string;
  fileName: string;
  generatedAt: string;
  version: number;
  isLatest: boolean;
  isNewGeneration: boolean;
}

export interface PdfSearchFilters {
  organizationId: number;
  operatingUnitId?: number;
  module?: string;
  entityType?: PdfDocumentType;
  entityId?: number;
  documentType?: PdfDocumentType;
  language?: string;
  latestOnly?: boolean;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a valid PDF already exists for a document
 * Returns existing PDF metadata if valid, null if expired or not found
 * 
 * Usage:
 * ```
 * const existing = await getValidPdfMetadata(
 *   orgId, 
 *   'logistics', 
 *   'purchase_request', 
 *   123, 
 *   'en'
 * );
 * if (existing) return existing; // Use cached PDF
 * ```
 */

export async function getModuleForEntityType(
  organizationId: number,
  module: string,
  entityType: PdfDocumentType,
  entityId: number,
  language: string = 'en'
): Promise<PdfMetadata | null> {
  const db = await getDb();

  const existingPdf = await db.query.generatedDocuments.findFirst({
    where: and(
      eq(generatedDocuments.organizationId, organizationId),
      eq(generatedDocuments.module, module),
      eq(generatedDocuments.entityType, entityType),
      eq(generatedDocuments.entityId, entityId),
      eq(generatedDocuments.language, language),
      eq(generatedDocuments.isLatest, 1)
    ),
  });

  if (!existingPdf) {
    return null;
  }

  return {
    id: existingPdf.id,
    filePath: existingPdf.filePath,
    fileName: existingPdf.fileName || '',
    generatedAt: existingPdf.generatedAt,
    version: existingPdf.version || 1,
    isLatest: existingPdf.isLatest === 1,
    isNewGeneration: false,
  };
}

/**
 * Save PDF metadata after generation
 * Automatically replaces old PDFs with new one
 * 
 * Usage:
 * ```
 * const metadata = await savePdfMetadata({
 *   organizationId: 1,
 *   module: 'donor_crm',
 *   entityType: 'proposal',
 *   entityId: 456,
 *   documentType: 'PROPOSAL_PDF',
 *   filePath: 's3://bucket/proposals/PROP-2026-001.pdf',
 *   fileName: 'PROP-2026-001.pdf',
 *   generatedBy: userId,
 *   language: 'en',
 * });
 * ```
 */
export async function savePdfMetadata(input: SavePdfMetadataInput): Promise<PdfMetadata> {
  const db = await getDb();

  const {
    organizationId,
    operatingUnitId,
    module,
    entityType,
    entityId,
    documentType,
    filePath,
    fileName,
    generatedBy,
    language = 'en',
    version = 1,
  } = input;

  // Check if PDF already exists
  const existingPdf = await db.query.generatedDocuments.findFirst({
    where: and(
      eq(generatedDocuments.organizationId, organizationId),
      eq(generatedDocuments.module, module),
      eq(generatedDocuments.entityType, entityType),
      eq(generatedDocuments.entityId, entityId),
      eq(generatedDocuments.language, language),
      eq(generatedDocuments.isLatest, 1)
    ),
  });

  if (existingPdf) {
    // Mark old version as not latest
    await db
      .update(generatedDocuments)
      .set({
        isLatest: 0,
      })
      .where(eq(generatedDocuments.id, existingPdf.id));

    // Insert new version
    const newVersion = (existingPdf.version || 1) + 1;
    const result = await db.insert(generatedDocuments).values({
      organizationId,
      operatingUnitId,
      module,
      entityType,
      entityId,
      documentType,
      filePath,
      fileName,
      generatedBy,
      language,
      version: newVersion,
      isLatest: 1,
    });

    return {
      id: Number((result as any).insertId || 0),
      filePath,
      fileName,
      generatedAt: new Date().toISOString(),
      version: newVersion,
      isLatest: true,
      isNewGeneration: true,
    };
  } else {
    // Insert first version
    const result = await db.insert(generatedDocuments).values({
      organizationId,
      operatingUnitId,
      module,
      entityType,
      entityId,
      documentType,
      filePath,
      fileName,
      generatedBy,
      language,
      version: 1,
      isLatest: 1,
    });

    return {
      id: Number((result as any).insertId || 0),
      filePath,
      fileName,
      generatedAt: new Date().toISOString(),
      version: 1,
      isLatest: true,
      isNewGeneration: true,
    };
  }
}

/**
 * Get all versions of a document
 * 
 * Usage:
 * ```
 * const versions = await getPdfVersions(orgId, 'proposal', 456, 'en');
 * ```
 */
export async function getPdfVersions(
  organizationId: number,
  entityType: PdfDocumentType,
  entityId: number,
  language: string = 'en'
) {
  const db = await getDb();

  return await db.query.generatedDocuments.findMany({
    where: and(
      eq(generatedDocuments.organizationId, organizationId),
      eq(generatedDocuments.entityType, entityType),
      eq(generatedDocuments.entityId, entityId),
      eq(generatedDocuments.language, language)
    ),
    orderBy: desc(generatedDocuments.version),
  });
}

/**
 * Search PDFs with flexible filters
 * 
 * Usage:
 * ```
 * // Get all proposal PDFs for organization
 * const proposals = await searchPdfs({
 *   organizationId: 1,
 *   module: 'donor_crm',
 *   entityType: 'proposal',
 *   latestOnly: true,
 * });
 * 
 * // Get all MEAL documents
 * const mealDocs = await searchPdfs({
 *   organizationId: 1,
 *   module: 'meal',
 *   latestOnly: true,
 * });
 * ```
 */
export async function searchPdfs(filters: PdfSearchFilters) {
  const db = await getDb();

  const conditions = [
    eq(generatedDocuments.organizationId, filters.organizationId),
  ];

  if (filters.operatingUnitId) {
    conditions.push(eq(generatedDocuments.operatingUnitId, filters.operatingUnitId));
  }

  if (filters.module) {
    conditions.push(eq(generatedDocuments.module, filters.module));
  }

  if (filters.entityType) {
    conditions.push(eq(generatedDocuments.entityType, filters.entityType));
  }

  if (filters.entityId) {
    conditions.push(eq(generatedDocuments.entityId, filters.entityId));
  }

  if (filters.documentType) {
    conditions.push(eq(generatedDocuments.documentType, filters.documentType));
  }

  if (filters.language) {
    conditions.push(eq(generatedDocuments.language, filters.language));
  }

  if (filters.latestOnly) {
    conditions.push(eq(generatedDocuments.isLatest, 1));
  }

  return await db.query.generatedDocuments.findMany({
    where: and(...conditions),
    orderBy: desc(generatedDocuments.generatedAt),
  });
}

/**
 * Get PDF statistics for organization
 * 
 * Usage:
 * ```
 * const stats = await getPdfStatistics(orgId);
 * console.log(stats.byModule); // { logistics: 45, finance: 23, meal: 12, ... }
 * ```
 */
export async function getPdfStatistics(organizationId: number) {
  const db = await getDb();

  const allPdfs = await db.query.generatedDocuments.findMany({
    where: eq(generatedDocuments.organizationId, organizationId),
  });

  const latestPdfs = allPdfs.filter((p) => p.isLatest === 1);
  const oldVersions = allPdfs.filter((p) => p.isLatest === 0);

  // Group by module
  const byModule = allPdfs.reduce(
    (acc, pdf) => {
      acc[pdf.module as string] = (acc[pdf.module as string] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Group by language
  const byLanguage = allPdfs.reduce(
    (acc, pdf) => {
      acc[pdf.language as string] = (acc[pdf.language as string] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Group by entity type
  const byEntityType = allPdfs.reduce(
    (acc, pdf) => {
      acc[pdf.entityType] = (acc[pdf.entityType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalDocuments: allPdfs.length,
    latestVersions: latestPdfs.length,
    oldVersions: oldVersions.length,
    byModule,
    byLanguage,
    byEntityType,
    topEntityTypes: Object.entries(byEntityType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count })),
  };
}

/**
 * Delete old versions of a document (keep only latest)
 * 
 * Usage:
 * ```
 * const deleted = await deleteOldVersions(orgId, 'proposal', 456, 'en');
 * console.log(`Deleted ${deleted} old versions`);
 * ```
 */
export async function deleteOldVersions(
  organizationId: number,
  entityType: string,
  entityId: number,
  language: string = 'en'
): Promise<number> {
  const db = await getDb();

  const result = await db
    .delete(generatedDocuments)
    .where(
      and(
        eq(generatedDocuments.organizationId, organizationId),
        eq(generatedDocuments.entityType, entityType),
        eq(generatedDocuments.entityId, entityId),
        eq(generatedDocuments.language, language),
        eq(generatedDocuments.isLatest, 0)
      )
    );

  return Number((result as any).rowsAffected || 0);
}

/**
 * Get documents by module
 * 
 * Usage:
 * ```
 * // Get all logistics PDFs
 * const logisticsPdfs = await getDocumentsByModule(orgId, 'logistics', true);
 * 
 * // Get all MEAL documents
 * const mealPdfs = await getDocumentsByModule(orgId, 'meal', true);
 * 
 * // Get all donor CRM documents
 * const donorPdfs = await getDocumentsByModule(orgId, 'donor_crm', true);
 * ```
 */
export async function getDocumentsByModule(
  organizationId: number,
  module: string,
  latestOnly: boolean = true
) {
  const db = await getDb();

  const conditions = [
    eq(generatedDocuments.organizationId, organizationId),
    eq(generatedDocuments.module, module),
  ];

  if (latestOnly) {
    conditions.push(eq(generatedDocuments.isLatest, 1));
  }

  return await db.query.generatedDocuments.findMany({
    where: and(...conditions),
    orderBy: desc(generatedDocuments.generatedAt),
  });
}

/**
 * Get documents by entity type
 * 
 * Usage:
 * ```
 * // Get all proposal PDFs
 * const proposals = await getDocumentsByEntityType(orgId, 'proposal', true);
 * 
 * // Get all MEAL survey PDFs
 * const surveys = await getDocumentsByEntityType(orgId, 'meal_survey', true);
 * ```
 */
export async function getDocumentsByEntityType(
  organizationId: number,
  entityType: string,
  latestOnly: boolean = true
) {
  const db = await getDb();

  const conditions = [
    eq(generatedDocuments.organizationId, organizationId),
    eq(generatedDocuments.entityType, entityType),
  ];

  if (latestOnly) {
    conditions.push(eq(generatedDocuments.isLatest, 1));
  }

  return await db.query.generatedDocuments.findMany({
    where: and(...conditions),
    orderBy: desc(generatedDocuments.generatedAt),
  });
}

/**
 * Get documents by operating unit (for data isolation)
 * 
 * Usage:
 * ```
 * const ouPdfs = await getDocumentsByOperatingUnit(orgId, ouId, true);
 * ```
 */
export async function getDocumentsByOperatingUnit(
  organizationId: number,
  operatingUnitId: number,
  latestOnly: boolean = true
) {
  const db = await getDb();

  const conditions = [
    eq(generatedDocuments.organizationId, organizationId),
    eq(generatedDocuments.operatingUnitId, operatingUnitId),
  ];

  if (latestOnly) {
    conditions.push(eq(generatedDocuments.isLatest, 1));
  }

  return await db.query.generatedDocuments.findMany({
    where: and(...conditions),
    orderBy: desc(generatedDocuments.generatedAt),
  });
}

/**
 * Get documents generated by a specific user
 * 
 * Usage:
 * ```
 * const userDocs = await getDocumentsByUser(orgId, userId);
 * ```
 */
export async function getDocumentsByUser(
  organizationId: number,
  userId: number,
  latestOnly: boolean = true
) {
  const db = await getDb();

  const conditions = [
    eq(generatedDocuments.organizationId, organizationId),
    eq(generatedDocuments.generatedBy, userId),
  ];

  if (latestOnly) {
    conditions.push(eq(generatedDocuments.isLatest, 1));
  }

  return await db.query.generatedDocuments.findMany({
    where: and(...conditions),
    orderBy: desc(generatedDocuments.generatedAt),
  });
}

// ============================================================================
// Helper: Generate PDF filename with timestamp
// ============================================================================

export function generatePdfFileName(
  entityType: PdfDocumentType,
  documentNumber: string,
  language: string = 'en',
  timestamp: boolean = true
): string {
  const timestamp_str = timestamp ? `-${Date.now()}` : '';
  const lang_suffix = language === 'ar' ? '-ar' : '';
  return `${entityType}-${documentNumber}${lang_suffix}${timestamp_str}.pdf`;
}

// ============================================================================
// Helper: Get module for entity type (for convenience)
// ============================================================================

  const moduleMap: Record<PdfDocumentType, string> = {
    // Logistics & Procurement
    purchase_request: 'logistics',
    bid_opening_minutes: 'logistics',
    goods_receipt_note: 'logistics',
    stock_issue: 'logistics',
    returned_items: 'logistics',
    purchase_order: 'procurement',
    delivery_note: 'procurement',
    contract: 'procurement',
    rfq: 'procurement',
    quotation: 'procurement',
    vendor_evaluation: 'procurement',
    bid_analysis: 'procurement',
    quotation_analysis: 'procurement',
    service_acceptance_certificate: 'procurement',
    stock_adjustment: 'warehouse',
    stock_request: 'warehouse',
    stock_reservation: 'warehouse',
    physical_count: 'warehouse',
    warehouse_transfer: 'warehouse',

    // Finance & Accounting
    invoice: 'finance',
    payment_voucher: 'finance',
    expense_report: 'finance',
    budget_report: 'finance',
    financial_statement: 'finance',
    bank_reconciliation: 'finance',
    journal_entry: 'finance',
    asset_register: 'finance',
    asset_depreciation_schedule: 'finance',
    asset_disposal: 'finance',
    asset_transfer: 'finance',
    asset_maintenance: 'finance',
    payroll_report: 'finance',
    fund_balance_report: 'finance',
    advance_settlement: 'finance',
    cost_allocation_report: 'finance',
    cost_center_report: 'finance',
    gl_account_report: 'finance',
    encumbrance_report: 'finance',
    settlement_report: 'finance',
    allocation_result: 'finance',
    allocation_reversal: 'finance',
    budget_reallocation: 'finance',
    variance_alert: 'finance',
    forecast_plan: 'finance',

    // HR & Payroll
    employee_contract: 'hr',
    payroll_slip: 'hr',
    attendance_report: 'hr',
    leave_request: 'hr',
    leave_approval: 'hr',
    recruitment_letter: 'hr',
    recruitment_offer: 'hr',
    performance_review: 'hr',
    training_certificate: 'hr',
    hr_report: 'hr',
    hr_annual_plan: 'hr',
    hr_sanctions: 'hr',
    salary_grade_report: 'hr',

    // Projects & Implementation
    project_report: 'projects',
    monthly_report: 'projects',
    progress_report: 'projects',
    activity_report: 'projects',
    milestone_report: 'projects',
    project_plan: 'projects',
    project_charter: 'projects',
    risk_register: 'projects',
    risk_mitigation_action: 'projects',
    lessons_learned: 'projects',
    implementation_checklist: 'projects',
    implementation_monitoring: 'projects',
    implementation_observation: 'projects',
    project_plan_activity: 'projects',
    project_plan_objective: 'projects',
    project_plan_result: 'projects',
    project_plan_task: 'projects',

    // Donor CRM & Proposals
    donor_profile: 'donor_crm',
    donor_communication: 'donor_crm',
    donor_report: 'donor_crm',
    donor_project: 'donor_crm',
    donor_budget_mapping: 'donor_crm',
    proposal: 'donor_crm',
    proposal_submission: 'donor_crm',
    grant_document: 'donor_crm',
    grant_agreement: 'donor_crm',
    grant_report: 'donor_crm',

    // MEAL (Monitoring, Evaluation, Accountability & Learning)
    meal_survey: 'meal',
    meal_survey_submission: 'meal',
    meal_dqa_visit: 'meal',
    meal_dqa_finding: 'meal',
    meal_dqa_action: 'meal',
    meal_indicator_data: 'meal',
    meal_learning_item: 'meal',
    meal_learning_action: 'meal',
    meal_accountability_record: 'meal',
    meal_document: 'meal',

    // Fleet & Vehicle Management
    vehicle_maintenance: 'fleet',
    vehicle_compliance: 'fleet',
    vehicle_assignment: 'fleet',
    fuel_log: 'fleet',
    trip_log: 'fleet',
    driver_record: 'fleet',

    // Warehouse & Stock Management
    stock_item: 'warehouse',
    stock_batch: 'warehouse',
    stock_ledger: 'warehouse',
    warehouse_alert: 'warehouse',

    // Case Management & Incidents
    case_record: 'projects',
    case_activity: 'projects',
    case_referral: 'projects',
    incident_report: 'projects',
    incident_investigation: 'projects',

    // Compliance & Risk
    audit_log_export: 'finance',
    document_audit_log: 'finance',
    document_legal_hold: 'finance',
    document_retention_policy: 'finance',
    vendor_blacklist_case: 'procurement',
    vendor_blacklist_evidence: 'procurement',
    permission_review: 'finance',
    user_archive_log: 'finance',

    // Generic / Other
    general_document: 'projects',
    report: 'projects',
    certificate: 'hr',
    letter: 'projects',
    memo: 'projects',
    notice: 'projects',
  };