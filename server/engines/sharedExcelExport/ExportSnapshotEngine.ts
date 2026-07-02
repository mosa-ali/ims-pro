/**
 * ExportSnapshotEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Immutable Export Snapshot
 *
 * ENTERPRISE REPORTING & DOCUMENT GENERATION PLATFORM
 * Enhancement #2
 *
 * Every generated report stores a complete immutable snapshot of the
 * export context. This ensures the report can always be reproduced,
 * explained, or audited — even years later.
 *
 * Snapshot includes:
 *  - Report definition version
 *  - Template version
 *  - Filters applied
 *  - User locale
 *  - Organization/OU scope
 *  - Exchange rates used at generation time
 *  - Fiscal calendar / period
 *  - Dataset snapshot ID
 *  - Data source ID
 *  - Generated file hash
 *  - Export version
 *  - Generator identity + timestamp
 *
 * Integration: Called by ReportExportOrchestrator after data fetch,
 * before file generation. Stored alongside ExportHistoryRecord.
 */

import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface ExportSnapshot {
  snapshotId: string;
  exportId: string;

  // Report definition
  reportId: string;
  reportDefinitionVersion: number;
  templateId?: string;
  templateVersion?: number;

  // User context
  locale: 'en' | 'ar' | 'it';
  generatedBy: number;
  generatedAt: string;
  exportVersion: number;

  // Scope (immutable)
  organizationId: number;
  operatingUnitId: number;

  // Filters snapshot
  appliedFilters: Record<string, unknown>;

  // Financial context
  exchangeRates: Array<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    rateDate: string;
    source: string;
  }>;
  fiscalYearId?: number;
  fiscalPeriodId?: number;
  fiscalPeriodName?: string;

  // Data integrity
  dataSourceId: string;
  datasetSnapshotId: string;
  datasetHash: string;
  datasetRowCount: number;
  generatedFileHash?: string;

  // Metadata
  createdAt: string;
  isImmutable: true;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IExportSnapshotRepository {
  save(snapshot: ExportSnapshot): Promise<void>;
  getByExportId(exportId: string): Promise<ExportSnapshot | null>;
  getBySnapshotId(snapshotId: string): Promise<ExportSnapshot | null>;
  listByReport(reportId: string, scope: RepositoryScope, limit?: number): Promise<ExportSnapshot[]>;
}

export interface IExchangeRateResolver {
  getCurrentRates(currencies: string[], baseCurrency: string): Promise<Array<{
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    rateDate: string;
    source: string;
  }>>;
}

export interface IFiscalPeriodResolver {
  getCurrentPeriod(scope: RepositoryScope): Promise<{
    fiscalYearId: number;
    fiscalPeriodId: number;
    periodName: string;
  } | null>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ExportSnapshotEngine {
  private repo: IExportSnapshotRepository;
  private fxResolver: IExchangeRateResolver;
  private fiscalResolver: IFiscalPeriodResolver;
  private logger: ILogger;

  constructor(deps: {
    snapshotRepo: IExportSnapshotRepository;
    fxResolver: IExchangeRateResolver;
    fiscalResolver: IFiscalPeriodResolver;
    logger: ILogger;
  }) {
    this.repo = deps.snapshotRepo;
    this.fxResolver = deps.fxResolver;
    this.fiscalResolver = deps.fiscalResolver;
    this.logger = deps.logger.child({ service: 'ExportSnapshotEngine' });
  }

  /**
   * Capture an immutable snapshot of the export context.
   * Called by ReportExportOrchestrator after data fetch.
   */
  async capture(input: {
    exportId: string;
    reportId: string;
    reportDefinitionVersion: number;
    templateId?: string;
    templateVersion?: number;
    locale: 'en' | 'ar' | 'it';
    generatedBy: number;
    exportVersion: number;
    scope: RepositoryScope;
    filters: Record<string, unknown>;
    dataSourceId: string;
    data: Record<string, unknown>[];
    currencies?: string[];
    baseCurrency?: string;
  }): Promise<ExportSnapshot> {
    // Resolve exchange rates
    const exchangeRates = input.currencies && input.baseCurrency
      ? await this.fxResolver.getCurrentRates(input.currencies, input.baseCurrency)
      : [];

    // Resolve fiscal period
    const fiscalPeriod = await this.fiscalResolver.getCurrentPeriod(input.scope);

    // Compute dataset hash for integrity verification
    const datasetHash = this.computeDatasetHash(input.data);
    const datasetSnapshotId = uuidv4();

    const snapshot: ExportSnapshot = {
      snapshotId: uuidv4(),
      exportId: input.exportId,
      reportId: input.reportId,
      reportDefinitionVersion: input.reportDefinitionVersion,
      templateId: input.templateId,
      templateVersion: input.templateVersion,
      locale: input.locale,
      generatedBy: input.generatedBy,
      generatedAt: new Date().toISOString(),
      exportVersion: input.exportVersion,
      organizationId: input.scope.organizationId,
      operatingUnitId: input.scope.operatingUnitId,
      appliedFilters: input.filters,
      exchangeRates,
      fiscalYearId: fiscalPeriod?.fiscalYearId,
      fiscalPeriodId: fiscalPeriod?.fiscalPeriodId,
      fiscalPeriodName: fiscalPeriod?.periodName,
      dataSourceId: input.dataSourceId,
      datasetSnapshotId,
      datasetHash,
      datasetRowCount: input.data.length,
      createdAt: new Date().toISOString(),
      isImmutable: true,
    };

    await this.repo.save(snapshot);

    this.logger.info('Export snapshot captured', {
      snapshotId: snapshot.snapshotId,
      exportId: input.exportId,
      reportId: input.reportId,
      datasetRows: input.data.length,
      exchangeRates: exchangeRates.length,
    });

    return snapshot;
  }

  /**
   * Attach the generated file hash after file creation.
   */
  async attachFileHash(snapshotId: string, fileBuffer: Buffer): Promise<void> {
    const hash = createHash('sha256').update(fileBuffer).digest('hex');
    const snapshot = await this.repo.getBySnapshotId(snapshotId);
    if (snapshot) {
      // Since snapshots are immutable, we store the file hash as a separate linked record
      // or update only the generatedFileHash field (the only mutable field)
      await this.repo.save({ ...snapshot, generatedFileHash: hash });
    }
  }

  /**
   * Verify a file matches its snapshot hash.
   */
  async verifyFileIntegrity(snapshotId: string, fileBuffer: Buffer): Promise<{
    valid: boolean;
    snapshotHash: string;
    computedHash: string;
  }> {
    const snapshot = await this.repo.getBySnapshotId(snapshotId);
    if (!snapshot || !snapshot.generatedFileHash) {
      throw new Error(`Snapshot ${snapshotId} not found or has no file hash`);
    }
    const computed = createHash('sha256').update(fileBuffer).digest('hex');
    return {
      valid: computed === snapshot.generatedFileHash,
      snapshotHash: snapshot.generatedFileHash,
      computedHash: computed,
    };
  }

  /**
   * Retrieve a snapshot for audit.
   */
  async getSnapshot(exportId: string): Promise<ExportSnapshot | null> {
    return this.repo.getByExportId(exportId);
  }

  private computeDatasetHash(data: Record<string, unknown>[]): string {
    const serialized = JSON.stringify(data);
    return createHash('sha256').update(serialized).digest('hex');
  }
}
