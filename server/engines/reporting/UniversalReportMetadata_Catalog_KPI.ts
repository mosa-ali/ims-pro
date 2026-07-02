/**
 * UniversalReportMetadata.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Universal Report Metadata (#2) + Report Catalog (#6) + KPI Dictionary (#7)
 *
 * PHASE 10 ENHANCEMENTS
 *
 * Three closely related platform services in one file:
 *
 *  #2 — Every report carries immutable metadata for reproducibility
 *  #6 — Centralized report catalog with rich metadata
 *  #7 — Enterprise KPI dictionary shared across all modules
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ════════════════════════════════════════════════════════════════════════════
// #2  UNIVERSAL REPORT METADATA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Every generated report carries this immutable metadata block.
 * Extends ExportSnapshotEngine (Phase A1) with standardized fields.
 * Attached to every export — no exceptions.
 */
export interface UniversalReportMetadata {
  /** Unique ID for this metadata block */
  metadataId: string;
  /** Report definition version at generation time */
  reportVersion: number;
  /** Template version at generation time */
  templateVersion: number;
  /** Data snapshot ID (links to ExportSnapshotEngine) */
  dataSnapshotId: string;
  /** Exchange rate version/date used */
  exchangeRateVersion: string;
  /** Fiscal calendar version */
  fiscalCalendarVersion: string;
  /** Organization */
  organizationId: number;
  organizationName: string;
  /** Operating unit */
  operatingUnitId: number;
  operatingUnitName: string;
  /** Language */
  locale: 'en' | 'ar' | 'it';
  /** All filters applied */
  appliedFilters: Record<string, unknown>;
  /** Software version that generated the report */
  generatorVersion: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Semantic concepts referenced */
  semanticConceptsUsed: string[];
  /** ISO timestamp */
  generatedAt: string;
  /** User who triggered generation */
  generatedBy: number;
  /** Whether this metadata is immutable (always true) */
  isImmutable: true;
}

/**
 * Build metadata for a report generation.
 * Called by ReportExportOrchestrator for every export.
 */
export function buildReportMetadata(input: {
  reportVersion: number;
  templateVersion: number;
  dataSnapshotId: string;
  exchangeRateDate: string;
  fiscalCalendarVersion: string;
  organizationId: number;
  organizationName: string;
  operatingUnitId: number;
  operatingUnitName: string;
  locale: 'en' | 'ar' | 'it';
  filters: Record<string, unknown>;
  generatorVersion: string;
  executionTimeMs: number;
  conceptsUsed: string[];
  generatedBy: number;
}): UniversalReportMetadata {
  return {
    metadataId: uuidv4(),
    reportVersion: input.reportVersion,
    templateVersion: input.templateVersion,
    dataSnapshotId: input.dataSnapshotId,
    exchangeRateVersion: input.exchangeRateDate,
    fiscalCalendarVersion: input.fiscalCalendarVersion,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    operatingUnitId: input.operatingUnitId,
    operatingUnitName: input.operatingUnitName,
    locale: input.locale,
    appliedFilters: input.filters,
    generatorVersion: input.generatorVersion,
    executionTimeMs: input.executionTimeMs,
    semanticConceptsUsed: input.conceptsUsed,
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy,
    isImmutable: true,
  };
}


// ════════════════════════════════════════════════════════════════════════════
// #6  REPORT CATALOG
// ════════════════════════════════════════════════════════════════════════════

/**
 * Centralized report catalog — single source of truth for all reports.
 * Extends ReportRegistry (Export Platform) with richer metadata.
 */

export type ReportCategory = 'financial_statement' | 'budget' | 'grant' | 'donor' | 'procurement' | 'hr' | 'projects' | 'meal' | 'executive' | 'compliance' | 'custom';
export type RefreshFrequency = 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'on_demand';

export interface CatalogEntry {
  reportId: string;
  name: string;
  nameAR: string;
  nameIT: string;
  description: string;
  /** Module that owns this report */
  module: string;
  /** Business category */
  category: ReportCategory;
  /** Role-based permissions */
  allowedRoles: string[];
  /** Which donors this report is applicable to (empty = all) */
  donorApplicability: string[];
  /** Accounting standard */
  accountingStandard: 'ipsas' | 'gaap' | 'both' | 'n/a';
  /** How often the data refreshes */
  refreshFrequency: RefreshFrequency;
  /** Dependencies — what must be valid before this report generates */
  dependencies: string[];
  /** Supported export formats */
  exportFormats: ('xlsx' | 'pdf' | 'docx' | 'pptx')[];
  /** Semantic concepts this report uses */
  semanticConcepts: string[];
  /** Data sources */
  dataSources: string[];
  /** Report owner (team/person) */
  ownerRole: string;
  /** Is this report certified for donor submission? */
  donorCertified: boolean;
  /** Tags for search */
  tags: string[];
  /** Version */
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ReportCatalogEngine {
  private catalog = new Map<string, CatalogEntry>();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ service: 'ReportCatalog' });
  }

  register(entry: CatalogEntry): void {
    this.catalog.set(entry.reportId, entry);
  }

  get(reportId: string): CatalogEntry | null {
    return this.catalog.get(reportId) || null;
  }

  search(query: {
    module?: string;
    category?: ReportCategory;
    role?: string;
    donorName?: string;
    tags?: string[];
    format?: string;
  }): CatalogEntry[] {
    let results = [...this.catalog.values()].filter(e => e.isActive);

    if (query.module) results = results.filter(e => e.module === query.module);
    if (query.category) results = results.filter(e => e.category === query.category);
    if (query.role) results = results.filter(e => e.allowedRoles.includes(query.role) || e.allowedRoles.includes('*'));
    if (query.donorName) results = results.filter(e => e.donorApplicability.length === 0 || e.donorApplicability.includes(query.donorName));
    if (query.tags) results = results.filter(e => query.tags!.some(t => e.tags.includes(t)));
    if (query.format) results = results.filter(e => e.exportFormats.includes(query.format as any));

    return results;
  }

  listAll(): CatalogEntry[] {
    return [...this.catalog.values()].filter(e => e.isActive);
  }

  listByModule(module: string): CatalogEntry[] {
    return this.listAll().filter(e => e.module === module);
  }

  /**
   * Get report dependency tree.
   */
  getDependencyTree(reportId: string): { reportId: string; dependencies: string[]; depth: number }[] {
    const tree: { reportId: string; dependencies: string[]; depth: number }[] = [];
    const visited = new Set<string>();

    const walk = (id: string, depth: number) => {
      if (visited.has(id)) return;
      visited.add(id);
      const entry = this.catalog.get(id);
      if (!entry) return;
      tree.push({ reportId: id, dependencies: entry.dependencies, depth });
      for (const dep of entry.dependencies) walk(dep, depth + 1);
    };

    walk(reportId, 0);
    return tree;
  }
}


// ════════════════════════════════════════════════════════════════════════════
// #7  ENTERPRISE KPI DICTIONARY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Central KPI dictionary — shared across Finance, HR, Procurement,
 * Projects, MEAL, and AI. Each KPI has one canonical definition.
 */

export type KPIFrequency = 'real_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

export interface KPIDefinition {
  kpiId: string;
  name: string;
  nameAR: string;
  nameIT: string;
  description: string;
  descriptionAR: string;
  descriptionIT: string;
  /** Which semantic concept computes this KPI */
  semanticConceptId: string;
  /** Module that owns this KPI */
  owner: string;
  /** Data type */
  dataType: 'currency' | 'percentage' | 'number' | 'ratio' | 'days' | 'count';
  unit: string;
  /** Thresholds for red/amber/green */
  thresholds: {
    green: { min?: number; max?: number };
    amber: { min?: number; max?: number };
    red: { min?: number; max?: number };
  };
  /** How often this KPI refreshes */
  frequency: KPIFrequency;
  /** AI-generated explanation template */
  aiExplanation: string;
  aiExplanationAR: string;
  aiExplanationIT: string;
  /** Which dashboards display this KPI */
  dashboards: string[];
  /** Tags for discovery */
  tags: string[];
  version: number;
  isActive: boolean;
}

export class KPIDictionaryEngine {
  private kpis = new Map<string, KPIDefinition>();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ service: 'KPIDictionary' });
    this.seedCoreKPIs();
  }

  define(kpi: KPIDefinition): void {
    this.kpis.set(kpi.kpiId, kpi);
  }

  get(kpiId: string): KPIDefinition | null {
    return this.kpis.get(kpiId) || null;
  }

  listAll(): KPIDefinition[] {
    return [...this.kpis.values()].filter(k => k.isActive);
  }

  listByOwner(owner: string): KPIDefinition[] {
    return this.listAll().filter(k => k.owner === owner);
  }

  listByDashboard(dashboardId: string): KPIDefinition[] {
    return this.listAll().filter(k => k.dashboards.includes(dashboardId));
  }

  searchByTag(tag: string): KPIDefinition[] {
    return this.listAll().filter(k => k.tags.includes(tag));
  }

  private seedCoreKPIs(): void {
    const kpis: KPIDefinition[] = [
      {
        kpiId: 'kpi_budget_utilization', name: 'Budget Utilization', nameAR: 'استخدام الميزانية', nameIT: 'Utilizzo Budget',
        description: 'Percentage of approved budget spent', descriptionAR: 'نسبة الميزانية المعتمدة المنفقة', descriptionIT: 'Percentuale del budget approvato speso',
        semanticConceptId: 'utilization_percent', owner: 'budget', dataType: 'percentage', unit: '%',
        thresholds: { green: { min: 70, max: 100 }, amber: { min: 40, max: 70 }, red: { min: 0, max: 40 } },
        frequency: 'daily',
        aiExplanation: 'Budget utilization measures how much of the approved budget has been spent. A healthy range is 70-100% proportional to elapsed time.',
        aiExplanationAR: 'يقيس استخدام الميزانية مقدار ما تم إنفاقه من الميزانية المعتمدة',
        aiExplanationIT: 'L\'utilizzo del budget misura quanto del budget approvato è stato speso',
        dashboards: ['executive', 'finance', 'budget'], tags: ['budget', 'performance', 'spending'], version: 1, isActive: true,
      },
      {
        kpiId: 'kpi_days_of_cash', name: 'Days of Cash', nameAR: 'أيام السيولة', nameIT: 'Giorni di Cassa',
        description: 'Days the organization can operate at current burn rate', descriptionAR: 'أيام التشغيل بمعدل الإنفاق الحالي', descriptionIT: 'Giorni di operatività al tasso corrente',
        semanticConceptId: 'days_of_cash', owner: 'treasury', dataType: 'days', unit: 'days',
        thresholds: { green: { min: 60 }, amber: { min: 30, max: 60 }, red: { max: 30 } },
        frequency: 'daily',
        aiExplanation: 'Days of Cash measures how long the organization can continue operations if no new funds are received.',
        aiExplanationAR: 'يقيس أيام السيولة المدة التي يمكن للمنظمة الاستمرار فيها بدون أموال جديدة',
        aiExplanationIT: 'Giorni di cassa misura per quanto tempo l\'organizzazione può operare senza nuovi fondi',
        dashboards: ['executive', 'treasury'], tags: ['treasury', 'liquidity', 'cash'], version: 1, isActive: true,
      },
      {
        kpiId: 'kpi_cost_recovery', name: 'Cost Recovery Rate', nameAR: 'معدل استرداد التكلفة', nameIT: 'Tasso Recupero Costi',
        description: 'Percentage of indirect costs recovered from grants', descriptionAR: 'نسبة التكاليف غير المباشرة المستردة', descriptionIT: 'Percentuale costi indiretti recuperati',
        semanticConceptId: 'cost_recovery_rate', owner: 'finance', dataType: 'percentage', unit: '%',
        thresholds: { green: { min: 80 }, amber: { min: 60, max: 80 }, red: { max: 60 } },
        frequency: 'monthly',
        aiExplanation: 'Cost recovery measures how effectively indirect costs are being charged to and recovered from grants and projects.',
        aiExplanationAR: 'يقيس استرداد التكلفة مدى فعالية تحميل واسترداد التكاليف غير المباشرة',
        aiExplanationIT: 'Il recupero costi misura l\'efficacia nel recuperare i costi indiretti',
        dashboards: ['executive', 'finance'], tags: ['finance', 'overhead', 'sustainability'], version: 1, isActive: true,
      },
    ];

    for (const kpi of kpis) this.define(kpi);
  }
}
