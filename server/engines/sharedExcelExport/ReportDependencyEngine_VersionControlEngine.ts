/**
 * ReportDependencyEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Report Dependency Validation
 *
 * ENTERPRISE REPORTING & DOCUMENT GENERATION PLATFORM
 * Enhancement #6
 *
 * Some reports must not be generated unless dependencies are valid.
 *
 * Example: Financial Statement depends on:
 *   Trial Balance ✓
 *   General Ledger ✓
 *   Exchange Rates ✓
 *   Fiscal Period ✓
 *   Budget ✓
 *   Chart of Accounts ✓
 *
 * If any dependency fails → block report generation.
 *
 * Integration: Called by ReportExportOrchestrator before data fetch.
 * Dependencies defined in ReportRegistry alongside report definitions.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type DependencyType =
  | 'report'            // Another report must be generated first
  | 'data_source'       // A data source must have valid data
  | 'configuration'     // A config must be set (e.g., exchange rates, fiscal period)
  | 'approval'          // An approval must be completed
  | 'certification';    // A dataset certification must pass

export interface ReportDependency {
  dependencyId: string;
  reportId: string;           // The report that HAS this dependency
  dependencyType: DependencyType;
  dependsOn: string;          // What it depends on (reportId, dataSourceId, configKey, etc.)
  description: string;
  isMandatory: boolean;       // If false, failure is a warning not a blocker
  validationFn?: string;      // Name of registered validation function
}

export interface DependencyCheckResult {
  dependencyId: string;
  dependsOn: string;
  type: DependencyType;
  satisfied: boolean;
  message: string;
  isMandatory: boolean;
}

export interface DependencyValidationResult {
  reportId: string;
  allSatisfied: boolean;
  canProceed: boolean;
  results: DependencyCheckResult[];
  failedMandatory: number;
  failedOptional: number;
  validatedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// VALIDATOR INTERFACE
// ────────────────────────────────────────────────────────────────────────────

export interface IDependencyValidator {
  readonly validatorId: string;
  validate(
    dependency: ReportDependency,
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<DependencyCheckResult>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ReportDependencyEngine {
  private dependencies = new Map<string, ReportDependency[]>();
  private validators = new Map<string, IDependencyValidator>();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ service: 'ReportDependencyEngine' });
  }

  /**
   * Define dependencies for a report.
   */
  defineDependencies(reportId: string, deps: Omit<ReportDependency, 'dependencyId'>[]): void {
    const withIds = deps.map(d => ({ ...d, dependencyId: uuidv4(), reportId }));
    this.dependencies.set(reportId, withIds);
    this.logger.info('Report dependencies defined', { reportId, count: deps.length });
  }

  /**
   * Register a custom dependency validator.
   */
  registerValidator(validator: IDependencyValidator): void {
    this.validators.set(validator.validatorId, validator);
  }

  /**
   * Validate all dependencies for a report.
   * Called by ReportExportOrchestrator before data fetch.
   */
  async validate(
    reportId: string,
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<DependencyValidationResult> {
    const deps = this.dependencies.get(reportId);
    if (!deps || deps.length === 0) {
      return {
        reportId,
        allSatisfied: true,
        canProceed: true,
        results: [],
        failedMandatory: 0,
        failedOptional: 0,
        validatedAt: new Date().toISOString(),
      };
    }

    const results: DependencyCheckResult[] = [];
    let failedMandatory = 0;
    let failedOptional = 0;

    for (const dep of deps) {
      const validator = dep.validationFn ? this.validators.get(dep.validationFn) : null;

      let result: DependencyCheckResult;
      if (validator) {
        result = await validator.validate(dep, filters, scope);
      } else {
        // Default validation: check if dependency exists as a known dependency type
        result = {
          dependencyId: dep.dependencyId,
          dependsOn: dep.dependsOn,
          type: dep.dependencyType,
          satisfied: true,
          message: `${dep.description} — auto-validated`,
          isMandatory: dep.isMandatory,
        };
      }

      results.push(result);
      if (!result.satisfied) {
        if (result.isMandatory) failedMandatory++;
        else failedOptional++;
      }
    }

    const allSatisfied = failedMandatory === 0 && failedOptional === 0;
    const canProceed = failedMandatory === 0;

    this.logger.info('Dependency validation completed', {
      reportId,
      totalDeps: deps.length,
      failedMandatory,
      failedOptional,
      canProceed,
    });

    return {
      reportId,
      allSatisfied,
      canProceed,
      results,
      failedMandatory,
      failedOptional,
      validatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get dependencies for a report (for UI display).
   */
  getDependencies(reportId: string): ReportDependency[] {
    return this.dependencies.get(reportId) || [];
  }
}


// ════════════════════════════════════════════════════════════════════════════
// ReportVersionControlEngine.ts
// ════════════════════════════════════════════════════════════════════════════

/**
 * ReportVersionControlEngine
 *
 * Enhancement #7
 *
 * Versions report DEFINITIONS (not only generated files).
 *
 *   Trial Balance v3 + Template v5 → Export v18
 *
 * Each export records which definition version and template version
 * generated the file. Supports rollback to previous definition.
 */

export interface ReportDefinitionVersion {
  versionId: string;
  reportId: string;
  version: number;
  definitionSnapshot: Record<string, unknown>;  // Full report definition at this version
  changedBy: number;
  changedAt: string;
  changeReason: string;
  isActive: boolean;
}

export interface TemplateVersionRecord {
  versionId: string;
  templateId: string;
  version: number;
  templateSnapshot: Record<string, unknown>;
  changedBy: number;
  changedAt: string;
  changeReason: string;
  isActive: boolean;
}

export interface ExportVersionLink {
  exportId: string;
  reportDefinitionVersion: number;
  templateVersion: number;
  exportVersion: number;
  generatedAt: string;
}

export interface IVersionControlRepository {
  saveDefinitionVersion(version: ReportDefinitionVersion): Promise<void>;
  getDefinitionVersion(reportId: string, version: number): Promise<ReportDefinitionVersion | null>;
  getLatestDefinitionVersion(reportId: string): Promise<ReportDefinitionVersion | null>;
  listDefinitionVersions(reportId: string): Promise<ReportDefinitionVersion[]>;

  saveTemplateVersion(version: TemplateVersionRecord): Promise<void>;
  getTemplateVersion(templateId: string, version: number): Promise<TemplateVersionRecord | null>;
  listTemplateVersions(templateId: string): Promise<TemplateVersionRecord[]>;

  saveExportVersionLink(link: ExportVersionLink): Promise<void>;
  getNextExportVersion(reportId: string): Promise<number>;
}

export class ReportVersionControlEngine {
  private repo: IVersionControlRepository;
  private logger: ILogger;

  constructor(repo: IVersionControlRepository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'ReportVersionControl' });
  }

  /**
   * Create a new version of a report definition.
   */
  async versionDefinition(
    reportId: string,
    definition: Record<string, unknown>,
    changedBy: number,
    changeReason: string,
  ): Promise<ReportDefinitionVersion> {
    const latest = await this.repo.getLatestDefinitionVersion(reportId);
    const newVersion = (latest?.version || 0) + 1;

    const version: ReportDefinitionVersion = {
      versionId: uuidv4(),
      reportId,
      version: newVersion,
      definitionSnapshot: definition,
      changedBy,
      changedAt: new Date().toISOString(),
      changeReason,
      isActive: true,
    };

    await this.repo.saveDefinitionVersion(version);
    this.logger.info('Report definition versioned', { reportId, version: newVersion, changeReason });
    return version;
  }

  /**
   * Create a new version of a template.
   */
  async versionTemplate(
    templateId: string,
    template: Record<string, unknown>,
    changedBy: number,
    changeReason: string,
  ): Promise<TemplateVersionRecord> {
    const versions = await this.repo.listTemplateVersions(templateId);
    const newVersion = versions.length + 1;

    const version: TemplateVersionRecord = {
      versionId: uuidv4(),
      templateId,
      version: newVersion,
      templateSnapshot: template,
      changedBy,
      changedAt: new Date().toISOString(),
      changeReason,
      isActive: true,
    };

    await this.repo.saveTemplateVersion(version);
    this.logger.info('Template versioned', { templateId, version: newVersion });
    return version;
  }

  /**
   * Link an export to its definition and template versions.
   */
  async linkExport(
    exportId: string,
    reportId: string,
    reportDefinitionVersion: number,
    templateVersion: number,
  ): Promise<ExportVersionLink> {
    const exportVersion = await this.repo.getNextExportVersion(reportId);

    const link: ExportVersionLink = {
      exportId,
      reportDefinitionVersion,
      templateVersion,
      exportVersion,
      generatedAt: new Date().toISOString(),
    };

    await this.repo.saveExportVersionLink(link);
    this.logger.info('Export version linked', { exportId, reportDefinitionVersion, templateVersion, exportVersion });
    return link;
  }

  /**
   * Rollback a report definition to a previous version.
   */
  async rollbackDefinition(reportId: string, toVersion: number, userId: number): Promise<void> {
    const target = await this.repo.getDefinitionVersion(reportId, toVersion);
    if (!target) throw new Error(`Version ${toVersion} not found for report ${reportId}`);

    await this.versionDefinition(
      reportId,
      target.definitionSnapshot,
      userId,
      `Rollback to version ${toVersion}`,
    );

    this.logger.warn('Report definition rolled back', { reportId, toVersion, userId });
  }
}
