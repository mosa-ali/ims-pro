/**
 * ReportExportOrchestrator.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Centralized Report Export Orchestrator
 *
 * Single entry point for ALL report exports across ALL modules.
 *
 * Workflow:
 *   1. User clicks "Export Excel" in UI
 *   2. UI calls: trpc.reporting.export.mutate({ reportId, filters, locale })
 *      (UI NEVER passes organizationId or operatingUnitId)
 *   3. Orchestrator receives request with ctx.scope
 *   4. Validates: report exists, user has permission, filters valid
 *   5. Fetches data from approved repository/service
 *   6. Applies report schema/template
 *   7. Generates real .xlsx file via ExcelExportEngine
 *   8. Stores export audit record
 *   9. Returns download URL
 *
 * Key rule: No report page generates Excel directly.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';
import type {
  ExportRequest,
  ExportResult,
  ExportAuditRecord,
  ExportStatus,
  ReportDefinition,
} from './ReportExportTypes';
import type { ReportRegistry } from './ReportRegistry';
import type { ExcelExportEngine } from './ExcelExportEngine';

// ────────────────────────────────────────────────────────────────────────────
// DATA SOURCE INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Data source resolver — fetches report data from approved services.
 * Each data source maps to a tRPC query or repository method.
 *
 * IMPORTANT: Always uses scope for org/OU isolation.
 */
export interface IReportDataSource {
  /**
   * Fetch data for a report.
   * @param dataSourceId  The report's dataSource field (e.g., 'journalEntries.getTrialBalance')
   * @param filters       User-provided filters
   * @param scope         Organization/OU scope from ctx.scope (NEVER from user input)
   */
  fetch(
    dataSourceId: string,
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<Record<string, unknown>[]>;
}

/**
 * File storage — saves generated files and returns download URLs.
 */
export interface IExportFileStorage {
  save(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
    scope: RepositoryScope,
  ): Promise<{ filePath: string; downloadUrl: string; fileSize: number }>;

  /** Generate a time-limited download URL */
  getDownloadUrl(filePath: string, expiresInMinutes?: number): Promise<string>;

  /** Delete expired export files */
  cleanup(olderThanHours: number): Promise<number>;
}

/**
 * Audit repository — stores export history.
 */
export interface IExportAuditRepository {
  save(record: ExportAuditRecord): Promise<void>;
  getById(exportId: string): Promise<ExportAuditRecord | null>;
  listByUser(userId: number, scope: RepositoryScope, limit?: number): Promise<ExportAuditRecord[]>;
  listByReport(reportId: string, scope: RepositoryScope, limit?: number): Promise<ExportAuditRecord[]>;
  updateStatus(exportId: string, status: ExportStatus, fields?: Partial<ExportAuditRecord>): Promise<void>;
  getExportStats(scope: RepositoryScope): Promise<{
    totalExports: number;
    byModule: Record<string, number>;
    byFormat: Record<string, number>;
    averageDurationMs: number;
  }>;
}

/**
 * Organization info for report headers.
 */
export interface IOrganizationResolver {
  getName(organizationId: number): Promise<string>;
  getNameAR(organizationId: number): Promise<string>;
}

// ────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES
// ────────────────────────────────────────────────────────────────────────────

export interface ExportOrchestratorDependencies {
  registry: ReportRegistry;
  excelEngine: ExcelExportEngine;
  dataSource: IReportDataSource;
  fileStorage: IExportFileStorage;
  auditRepo: IExportAuditRepository;
  orgResolver: IOrganizationResolver;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ────────────────────────────────────────────────────────────────────────────

export class ReportExportOrchestrator {
  private registry: ReportRegistry;
  private excelEngine: ExcelExportEngine;
  private dataSource: IReportDataSource;
  private fileStorage: IExportFileStorage;
  private auditRepo: IExportAuditRepository;
  private orgResolver: IOrganizationResolver;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: ExportOrchestratorDependencies) {
    this.registry = deps.registry;
    this.excelEngine = deps.excelEngine;
    this.dataSource = deps.dataSource;
    this.fileStorage = deps.fileStorage;
    this.auditRepo = deps.auditRepo;
    this.orgResolver = deps.orgResolver;
    this.logger = deps.logger.child({ service: 'ReportExportOrchestrator' });
    this.config = deps.config;
  }

  /**
   * Export a report.
   * This is the ONLY entry point for all report exports.
   *
   * Called by tRPC router:
   *   export: scopedProcedure.input(z.object({
   *     reportId: z.string(),
   *     locale: z.enum(['en', 'ar', 'it']),
   *     filters: z.record(z.unknown()),
   *   })).mutation(async ({ ctx, input }) => {
   *     return orchestrator.export({
   *       reportId: input.reportId,
   *       format: 'xlsx',
   *       locale: input.locale,
   *       filters: input.filters,
   *       scope: ctx.scope,           // ALWAYS from middleware
   *       requestedBy: ctx.user.id,   // ALWAYS from auth
   *       requestedAt: new Date().toISOString(),
   *     });
   *   });
   */
  async export(request: ExportRequest): Promise<ExportResult> {
    const exportId = uuidv4();
    const t0 = Date.now();

    this.logger.info('Export started', {
      exportId,
      reportId: request.reportId,
      locale: request.locale,
      organizationId: request.scope.organizationId,
    });

    // ── STEP 1: VALIDATE ──
    const report = this.registry.get(request.reportId);
    if (!report) {
      return this.fail(exportId, request, `Report '${request.reportId}' not found`);
    }

    // Permission check would use userRole from context
    // For now, all registered reports are accessible to authenticated users

    // Validate required filters
    const missingFilters = report.filters
      .filter(f => f.required && !request.filters[f.key])
      .map(f => f.key);

    if (missingFilters.length > 0) {
      return this.fail(exportId, request, `Missing required filters: ${missingFilters.join(', ')}`);
    }

    // Create audit record (status: pending)
    await this.createAuditRecord(exportId, request, report, 'generating');

    try {
      // ── STEP 2: FETCH DATA ──
      const data = await this.dataSource.fetch(
        report.dataSource,
        request.filters,
        request.scope,  // Scope from ctx.scope, NEVER from input
      );

      if (data.length === 0) {
        this.logger.warn('Export produced no data', { exportId, reportId: request.reportId });
      }

      // ── STEP 3: RESOLVE ORG NAME ──
      const orgName = await this.orgResolver.getName(request.scope.organizationId);
      const orgNameAR = await this.orgResolver.getNameAR(request.scope.organizationId);

      // ── STEP 4: GENERATE EXCEL ──
      const excelResult = await this.excelEngine.generate({
        report,
        data,
        locale: request.locale,
        organizationName: request.locale === 'ar' ? orgNameAR : orgName,
        organizationNameAR: orgNameAR,
        generatedAt: new Date().toISOString(),
        filters: request.filters,
      });

      // ── STEP 5: STORE FILE ──
      const stored = await this.fileStorage.save(
        excelResult.fileName,
        excelResult.buffer,
        excelResult.mimeType,
        request.scope,
      );

      // ── STEP 6: UPDATE AUDIT ──
      const durationMs = Date.now() - t0;
      const expiryHours = this.config.getNumber('export.expiryHours', 24);
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

      await this.auditRepo.updateStatus(exportId, 'completed', {
        fileName: excelResult.fileName,
        fileSize: stored.fileSize,
        rowCount: excelResult.rowCount,
        durationMs,
        completedAt: new Date().toISOString(),
      });

      const result: ExportResult = {
        exportId,
        reportId: request.reportId,
        status: 'completed',
        fileName: excelResult.fileName,
        filePath: stored.filePath,
        downloadUrl: stored.downloadUrl,
        fileSize: stored.fileSize,
        rowCount: excelResult.rowCount,
        worksheetCount: excelResult.worksheetCount,
        generatedAt: new Date().toISOString(),
        expiresAt,
        durationMs,
      };

      this.logger.info('Export completed', {
        exportId,
        reportId: request.reportId,
        fileName: excelResult.fileName,
        rows: excelResult.rowCount,
        durationMs,
      });

      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.fail(exportId, request, message);
    }
  }

  /**
   * Get export history for a user.
   */
  async getExportHistory(
    userId: number,
    scope: RepositoryScope,
    limit: number = 20,
  ): Promise<ExportAuditRecord[]> {
    return this.auditRepo.listByUser(userId, scope, limit);
  }

  /**
   * Re-download a previous export (if not expired).
   */
  async redownload(
    exportId: string,
    userId: number,
    scope: RepositoryScope,
  ): Promise<{ downloadUrl: string } | { error: string }> {
    const record = await this.auditRepo.getById(exportId);
    if (!record) return { error: 'Export not found' };
    if (record.organizationId !== scope.organizationId) return { error: 'Access denied' };
    if (record.status !== 'completed') return { error: 'Export not completed' };

    try {
      const url = await this.fileStorage.getDownloadUrl(record.fileName || '');
      await this.auditRepo.updateStatus(exportId, 'completed', {
        downloadedAt: new Date().toISOString(),
        downloadedBy: userId,
      });
      return { downloadUrl: url };
    } catch {
      return { error: 'File expired or not available' };
    }
  }

  /**
   * Get available reports for a module.
   */
  getAvailableReports(module?: string): Array<{
    reportId: string;
    name: string;
    module: string;
    description: string;
    filterCount: number;
  }> {
    const reports = module
      ? this.registry.listByModule(module as any)
      : this.registry.listAll();

    return reports.map(r => ({
      reportId: r.reportId,
      name: r.name,
      module: r.module,
      description: r.description,
      filterCount: r.filters.length,
    }));
  }

  /**
   * Cleanup expired export files (called by scheduler).
   */
  async cleanup(): Promise<number> {
    const hours = this.config.getNumber('export.expiryHours', 24);
    const cleaned = await this.fileStorage.cleanup(hours);
    if (cleaned > 0) {
      this.logger.info('Export files cleaned up', { cleaned, olderThanHours: hours });
    }
    return cleaned;
  }

  // ── PRIVATE ──

  private async fail(exportId: string, request: ExportRequest, error: string): Promise<ExportResult> {
    this.logger.error('Export failed', { exportId, reportId: request.reportId, error });

    await this.auditRepo.updateStatus(exportId, 'failed', { error });

    return {
      exportId,
      reportId: request.reportId,
      status: 'failed',
      fileName: '',
      error,
    };
  }

  private async createAuditRecord(
    exportId: string,
    request: ExportRequest,
    report: ReportDefinition,
    status: ExportStatus,
  ): Promise<void> {
    await this.auditRepo.save({
      exportId,
      reportId: request.reportId,
      reportName: report.name,
      module: report.module,
      format: request.format,
      locale: request.locale,
      filters: request.filters,
      organizationId: request.scope.organizationId,
      operatingUnitId: request.scope.operatingUnitId,
      requestedBy: request.requestedBy,
      requestedAt: request.requestedAt,
      status,
    });
  }
}
