/**
 * DonorSubmissionPackageEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Donor Submission Package Generator
 *
 * ENTERPRISE REPORTING & DOCUMENT GENERATION PLATFORM
 * Enhancement #3
 *
 * One-click package generation for donor submissions:
 *   EU Financial Report + Annex B + Budget + Invoice List +
 *   Supporting Docs + Signed PDF + Excel Workbook → ZIP Package
 *
 * Supports: EU, DG ECHO, AICS, UNICEF, UN agencies, internal.
 *
 * Integration: Uses ReportExportOrchestrator for each report,
 * then packages all outputs into a single ZIP with manifest.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';
import type { ExportResult } from './ReportExportTypes';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface DonorPackageTemplate {
  templateId: string;
  donorId?: number;
  donorName: string;
  name: string;
  description: string;
  /** Reports included in this package */
  components: PackageComponent[];
  /** Supporting document categories to include */
  supportingDocCategories: string[];
  /** Include signed PDF summary */
  includeSignedSummary: boolean;
  /** Package naming convention */
  fileNameTemplate: string;
  /** Cover page template */
  includeCoverPage: boolean;
  /** Table of contents */
  includeTableOfContents: boolean;
  organizationId: number;
  isActive: boolean;
  version: number;
}

export interface PackageComponent {
  componentId: string;
  reportId: string;
  reportName: string;
  format: 'xlsx' | 'pdf' | 'docx';
  required: boolean;
  order: number;
  /** Override filters for this component */
  filterOverrides?: Record<string, unknown>;
  /** Custom file name within package */
  fileName?: string;
}

export interface PackageResult {
  packageId: string;
  donorName: string;
  templateName: string;
  fileName: string;
  downloadUrl: string;
  fileSize: number;
  componentCount: number;
  components: Array<{
    reportId: string;
    reportName: string;
    format: string;
    fileName: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
  manifestIncluded: boolean;
  signedSummaryIncluded: boolean;
  generatedAt: string;
  generatedBy: number;
  packageHash: string;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ────────────────────────────────────────────────────────────────────────────

export interface IPackageFileStorage {
  createZip(files: Array<{ fileName: string; buffer: Buffer }>, zipFileName: string, scope: RepositoryScope): Promise<{ filePath: string; downloadUrl: string; fileSize: number; hash: string }>;
}

export interface ISupportingDocumentResolver {
  getDocuments(categories: string[], grantId: number, scope: RepositoryScope): Promise<Array<{ fileName: string; buffer: Buffer; category: string }>>;
}

export interface IReportGenerator {
  /** Generate a single report — delegates to ReportExportOrchestrator */
  generate(reportId: string, format: string, locale: string, filters: Record<string, unknown>, scope: RepositoryScope, userId: number): Promise<{ result: ExportResult; buffer: Buffer }>;
}

export interface IPackageRepository {
  savePackage(result: PackageResult): Promise<void>;
  getPackage(packageId: string): Promise<PackageResult | null>;
  listByDonor(donorName: string, scope: RepositoryScope, limit?: number): Promise<PackageResult[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class DonorSubmissionPackageEngine {
  private reportGenerator: IReportGenerator;
  private docResolver: ISupportingDocumentResolver;
  private fileStorage: IPackageFileStorage;
  private packageRepo: IPackageRepository;
  private logger: ILogger;

  constructor(deps: {
    reportGenerator: IReportGenerator;
    docResolver: ISupportingDocumentResolver;
    fileStorage: IPackageFileStorage;
    packageRepo: IPackageRepository;
    logger: ILogger;
  }) {
    this.reportGenerator = deps.reportGenerator;
    this.docResolver = deps.docResolver;
    this.fileStorage = deps.fileStorage;
    this.packageRepo = deps.packageRepo;
    this.logger = deps.logger.child({ service: 'DonorSubmissionPackage' });
  }

  /**
   * Generate a complete donor submission package.
   */
  async generatePackage(
    template: DonorPackageTemplate,
    filters: Record<string, unknown>,
    locale: 'en' | 'ar' | 'it',
    userId: number,
    scope: RepositoryScope,
  ): Promise<PackageResult> {
    const packageId = uuidv4();
    const files: Array<{ fileName: string; buffer: Buffer }> = [];
    const components: PackageResult['components'] = [];

    this.logger.info('Package generation started', {
      packageId,
      donorName: template.donorName,
      componentCount: template.components.length,
    });

    // 1. Generate each report component
    const sorted = [...template.components].sort((a, b) => a.order - b.order);

    for (const component of sorted) {
      try {
        const mergedFilters = { ...filters, ...component.filterOverrides };
        const { result, buffer } = await this.reportGenerator.generate(
          component.reportId, component.format, locale, mergedFilters, scope, userId,
        );

        const fileName = component.fileName || result.fileName;
        files.push({ fileName, buffer });
        components.push({
          reportId: component.reportId,
          reportName: component.reportName,
          format: component.format,
          fileName,
          status: 'success',
        });

      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);

        if (component.required) {
          this.logger.error('Required package component failed', {
            packageId,
            reportId: component.reportId,
            error,
          });
          throw new Error(`Required component "${component.reportName}" failed: ${error}`);
        }

        components.push({
          reportId: component.reportId,
          reportName: component.reportName,
          format: component.format,
          fileName: component.fileName || 'failed',
          status: 'failed',
          error,
        });
      }
    }

    // 2. Add supporting documents
    if (template.supportingDocCategories.length > 0 && filters.grantId) {
      const docs = await this.docResolver.getDocuments(
        template.supportingDocCategories,
        filters.grantId as number,
        scope,
      );

      for (const doc of docs) {
        files.push({
          fileName: `supporting/${doc.category}/${doc.fileName}`,
          buffer: doc.buffer,
        });
      }
    }

    // 3. Generate manifest
    const manifest = this.generateManifest(template, components, locale);
    files.push({ fileName: 'MANIFEST.txt', buffer: Buffer.from(manifest, 'utf-8') });

    // 4. Create ZIP
    const zipFileName = this.resolveFileName(template.fileNameTemplate, {
      donorName: template.donorName,
      date: new Date().toISOString().split('T')[0],
      ...filters,
    });

    const zipResult = await this.fileStorage.createZip(files, `${zipFileName}.zip`, scope);

    // 5. Record package
    const result: PackageResult = {
      packageId,
      donorName: template.donorName,
      templateName: template.name,
      fileName: `${zipFileName}.zip`,
      downloadUrl: zipResult.downloadUrl,
      fileSize: zipResult.fileSize,
      componentCount: components.length,
      components,
      manifestIncluded: true,
      signedSummaryIncluded: template.includeSignedSummary,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      packageHash: zipResult.hash,
    };

    await this.packageRepo.savePackage(result);

    this.logger.info('Package generation completed', {
      packageId,
      donorName: template.donorName,
      files: files.length,
      fileSize: zipResult.fileSize,
    });

    return result;
  }

  private generateManifest(
    template: DonorPackageTemplate,
    components: PackageResult['components'],
    locale: string,
  ): string {
    const lines = [
      `Donor Submission Package — ${template.donorName}`,
      `Template: ${template.name} v${template.version}`,
      `Generated: ${new Date().toISOString()}`,
      `Locale: ${locale}`,
      '',
      'Contents:',
      ...components.map((c, i) => `  ${i + 1}. [${c.status.toUpperCase()}] ${c.fileName} (${c.reportName})`),
      '',
      `Total components: ${components.length}`,
      `Successful: ${components.filter(c => c.status === 'success').length}`,
      `Failed: ${components.filter(c => c.status === 'failed').length}`,
    ];
    return lines.join('\n');
  }

  private resolveFileName(template: string, params: Record<string, unknown>): string {
    let name = template;
    for (const [k, v] of Object.entries(params)) {
      name = name.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v || '').replace(/[/\\?%*:|"<>]/g, '_'));
    }
    return name;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// PackageTemplateRegistry
// ════════════════════════════════════════════════════════════════════════════

export class PackageTemplateRegistry {
  private templates = new Map<string, DonorPackageTemplate>();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ service: 'PackageTemplateRegistry' });
    this.seedDefaults();
  }

  register(template: DonorPackageTemplate): void {
    this.templates.set(template.templateId, template);
    this.logger.info('Package template registered', { templateId: template.templateId, donorName: template.donorName });
  }

  get(templateId: string): DonorPackageTemplate | null {
    return this.templates.get(templateId) || null;
  }

  getByDonor(donorName: string): DonorPackageTemplate[] {
    return [...this.templates.values()].filter(t => t.donorName === donorName && t.isActive);
  }

  listAll(): DonorPackageTemplate[] {
    return [...this.templates.values()];
  }

  private seedDefaults(): void {
    this.register({
      templateId: 'eu_standard_package',
      donorName: 'European Union',
      name: 'EU Standard Submission Package',
      description: 'Standard EU financial report submission with annexes',
      components: [
        { componentId: 'eu1', reportId: 'donor_grant_report', reportName: 'EU Financial Report', format: 'xlsx', required: true, order: 1 },
        { componentId: 'eu2', reportId: 'budget_vs_actual', reportName: 'Budget vs Actual', format: 'xlsx', required: true, order: 2 },
        { componentId: 'eu3', reportId: 'donor_grant_report', reportName: 'Signed Summary', format: 'pdf', required: true, order: 3 },
      ],
      supportingDocCategories: ['invoices', 'contracts', 'timesheets'],
      includeSignedSummary: true,
      fileNameTemplate: 'EU_Submission_{grantName}_{date}',
      includeCoverPage: true,
      includeTableOfContents: true,
      organizationId: 0,
      isActive: true,
      version: 1,
    });

    this.register({
      templateId: 'unicef_standard_package',
      donorName: 'UNICEF',
      name: 'UNICEF Standard Submission Package',
      description: 'UNICEF financial report with budget and supporting docs',
      components: [
        { componentId: 'un1', reportId: 'donor_grant_report', reportName: 'UNICEF Financial Report', format: 'xlsx', required: true, order: 1 },
        { componentId: 'un2', reportId: 'budget_vs_actual', reportName: 'Budget Report', format: 'xlsx', required: true, order: 2 },
        { componentId: 'un3', reportId: 'finance_journal_entries', reportName: 'Transaction List', format: 'xlsx', required: false, order: 3 },
      ],
      supportingDocCategories: ['invoices', 'receipts'],
      includeSignedSummary: true,
      fileNameTemplate: 'UNICEF_Report_{grantName}_{date}',
      includeCoverPage: true,
      includeTableOfContents: false,
      organizationId: 0,
      isActive: true,
      version: 1,
    });
  }
}
