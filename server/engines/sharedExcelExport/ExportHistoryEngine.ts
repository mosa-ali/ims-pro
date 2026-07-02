/**
 * ExportHistoryEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Enterprise Export History and Archiving
 *
 * EXPORT PLATFORM ENHANCEMENT #8
 *
 * Tracks every export with:
 *   Report → Version → Generated File → Hash → Download Count →
 *   Retention → Archive
 *
 * Provides:
 *  - Full export lineage (who exported what, when, with what filters)
 *  - File integrity verification (SHA-256 hash)
 *  - Download tracking (who downloaded, when, how many times)
 *  - Retention policies (auto-archive after X days)
 *  - Compliance: immutable export records for audit
 *  - Reporting: export usage analytics
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type RetentionStatus = 'active' | 'archived' | 'deleted' | 'retained_for_audit';

export interface ExportHistoryRecord {
  historyId: string;
  exportId: string;
  reportId: string;
  reportName: string;
  module: string;
  format: string;
  locale: string;
  /** Filters applied at export time (immutable snapshot) */
  filterSnapshot: Record<string, unknown>;
  /** Template used */
  templateId?: string;
  templateName?: string;
  /** File details */
  fileName: string;
  fileSize: number;
  /** SHA-256 hash for integrity verification */
  fileHash: string;
  rowCount: number;
  worksheetCount: number;
  /** Generated file version (increments if same report re-exported) */
  fileVersion: number;
  /** Scope (immutable) */
  organizationId: number;
  operatingUnitId: number;
  /** Who and when */
  generatedBy: number;
  generatedAt: string;
  /** Duration to generate */
  generationDurationMs: number;
  /** Download tracking */
  downloadCount: number;
  firstDownloadedAt?: string;
  lastDownloadedAt?: string;
  lastDownloadedBy?: number;
  /** Retention */
  retentionStatus: RetentionStatus;
  retentionPolicyDays: number;
  expiresAt: string;
  archivedAt?: string;
  deletedAt?: string;
}

export interface DownloadEvent {
  downloadId: string;
  historyId: string;
  downloadedBy: number;
  downloadedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ExportUsageStats {
  organizationId: number;
  period: string;
  totalExports: number;
  totalDownloads: number;
  byModule: Record<string, { exports: number; downloads: number }>;
  byFormat: Record<string, number>;
  byUser: Array<{ userId: number; exportCount: number; downloadCount: number }>;
  averageFileSizeBytes: number;
  averageGenerationMs: number;
  topReports: Array<{ reportId: string; reportName: string; exportCount: number }>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IExportHistoryRepository {
  save(record: ExportHistoryRecord): Promise<void>;
  getById(historyId: string): Promise<ExportHistoryRecord | null>;
  getByExportId(exportId: string): Promise<ExportHistoryRecord | null>;
  listByUser(userId: number, scope: RepositoryScope, limit?: number): Promise<ExportHistoryRecord[]>;
  listByReport(reportId: string, scope: RepositoryScope, limit?: number): Promise<ExportHistoryRecord[]>;
  update(historyId: string, fields: Partial<ExportHistoryRecord>): Promise<void>;
  getNextVersion(reportId: string, scope: RepositoryScope): Promise<number>;
  saveDownloadEvent(event: DownloadEvent): Promise<void>;
  getDownloadEvents(historyId: string): Promise<DownloadEvent[]>;
  getUsageStats(scope: RepositoryScope, fromDate: string, toDate: string): Promise<ExportUsageStats>;
  listExpired(asOfDate: string): Promise<ExportHistoryRecord[]>;
  countByRetentionStatus(scope: RepositoryScope): Promise<Record<RetentionStatus, number>>;
}

export interface ExportHistoryDependencies {
  historyRepo: IExportHistoryRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ExportHistoryEngine {
  private repo: IExportHistoryRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: ExportHistoryDependencies) {
    this.repo = deps.historyRepo;
    this.logger = deps.logger.child({ service: 'ExportHistoryEngine' });
    this.config = deps.config;
  }

  /**
   * Record a completed export in history.
   * Called by ReportExportOrchestrator after successful generation.
   */
  async recordExport(input: {
    exportId: string;
    reportId: string;
    reportName: string;
    module: string;
    format: string;
    locale: string;
    filters: Record<string, unknown>;
    templateId?: string;
    templateName?: string;
    fileName: string;
    fileBuffer: Buffer;
    rowCount: number;
    worksheetCount: number;
    generatedBy: number;
    generationDurationMs: number;
    scope: RepositoryScope;
  }): Promise<ExportHistoryRecord> {
    const fileHash = this.computeHash(input.fileBuffer);
    const retentionDays = this.config.getNumber('export.retentionDays', 90);
    const fileVersion = await this.repo.getNextVersion(input.reportId, input.scope);

    const record: ExportHistoryRecord = {
      historyId: uuidv4(),
      exportId: input.exportId,
      reportId: input.reportId,
      reportName: input.reportName,
      module: input.module,
      format: input.format,
      locale: input.locale,
      filterSnapshot: input.filters,
      templateId: input.templateId,
      templateName: input.templateName,
      fileName: input.fileName,
      fileSize: input.fileBuffer.length,
      fileHash,
      rowCount: input.rowCount,
      worksheetCount: input.worksheetCount,
      fileVersion,
      organizationId: input.scope.organizationId,
      operatingUnitId: input.scope.operatingUnitId,
      generatedBy: input.generatedBy,
      generatedAt: new Date().toISOString(),
      generationDurationMs: input.generationDurationMs,
      downloadCount: 0,
      retentionStatus: 'active',
      retentionPolicyDays: retentionDays,
      expiresAt: new Date(Date.now() + retentionDays * 86400000).toISOString(),
    };

    await this.repo.save(record);

    this.logger.info('Export recorded in history', {
      historyId: record.historyId,
      reportId: input.reportId,
      fileVersion,
      fileHash,
      fileSize: record.fileSize,
    });

    return record;
  }

  /**
   * Record a download event.
   */
  async recordDownload(
    historyId: string,
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const record = await this.repo.getById(historyId);
    if (!record) throw new Error(`Export history ${historyId} not found`);

    await this.repo.saveDownloadEvent({
      downloadId: uuidv4(),
      historyId,
      downloadedBy: userId,
      downloadedAt: new Date().toISOString(),
      ipAddress,
      userAgent,
    });

    await this.repo.update(historyId, {
      downloadCount: record.downloadCount + 1,
      lastDownloadedAt: new Date().toISOString(),
      lastDownloadedBy: userId,
      firstDownloadedAt: record.firstDownloadedAt || new Date().toISOString(),
    });

    this.logger.info('Download recorded', { historyId, userId });
  }

  /**
   * Verify file integrity using stored hash.
   */
  async verifyIntegrity(historyId: string, fileBuffer: Buffer): Promise<{
    valid: boolean;
    storedHash: string;
    computedHash: string;
  }> {
    const record = await this.repo.getById(historyId);
    if (!record) throw new Error(`Export history ${historyId} not found`);

    const computedHash = this.computeHash(fileBuffer);
    const valid = computedHash === record.fileHash;

    if (!valid) {
      this.logger.error('File integrity check FAILED', {
        historyId,
        storedHash: record.fileHash,
        computedHash,
      });
    }

    return { valid, storedHash: record.fileHash, computedHash };
  }

  /**
   * Get export usage analytics.
   */
  async getUsageStats(
    scope: RepositoryScope,
    fromDate: string,
    toDate: string,
  ): Promise<ExportUsageStats> {
    return this.repo.getUsageStats(scope, fromDate, toDate);
  }

  /**
   * Archive expired exports (called by scheduler).
   */
  async archiveExpired(): Promise<{ archived: number }> {
    const expired = await this.repo.listExpired(new Date().toISOString());
    let archived = 0;

    for (const record of expired) {
      if (record.retentionStatus === 'active') {
        await this.repo.update(record.historyId, {
          retentionStatus: 'archived',
          archivedAt: new Date().toISOString(),
        });
        archived++;
      }
    }

    if (archived > 0) {
      this.logger.info('Expired exports archived', { archived });
    }

    return { archived };
  }

  /**
   * Retain an export for audit (prevents archiving/deletion).
   */
  async retainForAudit(historyId: string, userId: number): Promise<void> {
    await this.repo.update(historyId, {
      retentionStatus: 'retained_for_audit',
    });
    this.logger.info('Export retained for audit', { historyId, userId });
  }

  // ── PRIVATE ──

  private computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
