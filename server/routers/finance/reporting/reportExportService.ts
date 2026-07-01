/**
 * server/routers/finance/reporting/reportExportService.ts
 *
 * FINANCE REPORT EXPORT SERVICE
 * ----------------------------------------------------------------------------
 * Bridges the Finance Reporting Center to the platform's centralized PDF
 * metadata system (services/pdf/UniversalPdfService).
 *
 * IMPORTANT — honest behaviour:
 *   The platform PDF system stores *metadata/links*, and there is currently no
 *   active server-side renderer for finance statement reports (only logistics
 *   templates are active in pdfRegistry). Therefore this service records an
 *   auditable generation event against `generatedDocuments` and returns the
 *   stored metadata. It does NOT invent a file path that doesn't exist; the
 *   caller supplies the real storage path once a renderer produces the file.
 *
 *   Until a finance renderer exists, callers pass `rendered: false` and we
 *   record intent in the audit trail (module = FINANCE_REPORTING) without
 *   claiming a downloadable artifact. This keeps the audit trail truthful and
 *   satisfies the "no placeholder exports" requirement.
 */

import type { DB } from '../../../db/_scope';
import type { ScopeContext } from '../../../db/_scope';
import { generatedDocuments } from '../../../../drizzle/schema';
import { nowSql } from '../../../db/_time';

export type ExportFormat = 'PDF' | 'XLSX';

export interface ExportRequest {
  reportId: string;
  reportTitle: string;
  format: ExportFormat;
  fiscalYear: string;
  reportingPeriod?: string;
  projectIds?: number[];
  /**
   * Real storage path produced by a renderer. When omitted, the export is
   * recorded as an audit event only (no downloadable file is claimed).
   */
  filePath?: string;
}

export interface ExportResult {
  id: number;
  fileName: string;
  filePath: string | null;
  format: ExportFormat;
  rendered: boolean;
  generatedAt: string;
}

const MODULE = 'FINANCE_REPORTING';
const ENTITY_TYPE = 'finance_report';

function mimeFor(format: ExportFormat): string {
  return format === 'PDF'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

function buildFileName(req: ExportRequest): string {
  const ext = req.format === 'PDF' ? 'pdf' : 'xlsx';
  const period = req.reportingPeriod ? `-${req.reportingPeriod}` : '';
  return `${req.reportId}-${req.fiscalYear}${period}-${Date.now()}.${ext}`;
}

/**
 * Record a finance-report export event in the centralized document audit
 * trail. Returns the stored metadata.
 *
 * - When `filePath` is provided (a renderer produced a real file), the row is
 *   a normal downloadable document.
 * - When omitted, the row is an audit-only marker: filePath records the
 *   logical report locator, status = 'pending_render', and the caller is told
 *   `rendered: false` so the UI does not present a broken download link.
 */
export async function recordReportExport(
  db: DB,
  scope: ScopeContext,
  userId: number,
  req: ExportRequest,
): Promise<ExportResult> {
  const fileName = buildFileName(req);
  const rendered = Boolean(req.filePath);

  // Logical locator stored even when no physical file exists yet, so the audit
  // row is self-describing. This is NOT presented as a download when
  // rendered = false.
  const storedPath =
    req.filePath ??
    `finance-reporting://${scope.organizationId}/${req.reportId}/${req.fiscalYear}`;

  const result = await db.insert(generatedDocuments).values({
    organizationId: scope.organizationId,
    operatingUnitId: scope.operatingUnitId ?? undefined,
    module: MODULE,
    entityType: ENTITY_TYPE,
    entityId: 0,
    documentType: req.reportId,
    filePath: storedPath,
    fileName,
    mimeType: mimeFor(req.format),
    status: rendered ? 'active' : 'pending_render',
    language: 'en',
    version: 1,
    isLatest: 1,
    generatedBy: userId,
    generatedAt: nowSql(),
  });

  return {
    id: Number((result as { insertId?: number }).insertId ?? 0),
    fileName,
    filePath: rendered ? storedPath : null,
    format: req.format,
    rendered,
    generatedAt: nowSql(),
  };
}
