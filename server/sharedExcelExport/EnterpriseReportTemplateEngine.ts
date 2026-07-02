/**
 * EnterpriseReportTemplateEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Enterprise Report Template Engine
 *
 * "The first component I would actively begin using immediately"
 *
 * Allows the same report to have different visual styles per donor:
 *   UNICEF style  — blue headers, UNICEF logo, specific column order
 *   EU style      — EU flag, annex format, expenditure verification
 *   AICS style    — Italian layout, AICS branding
 *   DG ECHO style — ECHO template, single form annexes
 *   Internal      — Organization standard
 *
 * Templates are data-driven (no code changes for new donors):
 *   Finance team uploads template → maps data fields → generates reports
 *
 * Responsibilities:
 *   Financial Statements → Budget → Grant → Donor → Executive → Custom
 *
 * All served by the existing ReportExportOrchestrator.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';
import type { ReportColumnDef, ExcelStyle, ReportDefinition } from './ReportExportTypes';
import type { BrandingConfig } from './MultiFormatExportEngine';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type TemplateCategory =
  | 'financial_statement'
  | 'budget'
  | 'grant'
  | 'donor'
  | 'executive'
  | 'procurement'
  | 'hr'
  | 'inventory'
  | 'meal'
  | 'custom';

export interface ReportTemplate {
  templateId: string;
  name: string;
  nameAR?: string;
  nameIT?: string;
  description: string;
  category: TemplateCategory;
  version: number;

  // Donor association (null = universal template)
  donorId?: number;
  donorName?: string;

  // Visual styling
  branding: BrandingConfig;
  styles: TemplateStyles;

  // Layout
  layout: TemplateLayout;

  // Column mapping (maps report columns to template positions)
  columnMappings: ColumnMapping[];

  // Sections (for structured reports)
  sections: TemplateSection[];

  // Metadata
  organizationId: number;
  isDefault: boolean;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateStyles {
  /** Title row styling */
  titleStyle: ExcelStyle;
  /** Subtitle/info row styling */
  subtitleStyle: ExcelStyle;
  /** Header row styling */
  headerStyle: ExcelStyle;
  /** Data row styling */
  dataStyle: ExcelStyle;
  /** Alternating row styling */
  alternateRowStyle: ExcelStyle;
  /** Totals row styling */
  totalsStyle: ExcelStyle;
  /** Section header styling */
  sectionHeaderStyle: ExcelStyle;
  /** Primary color (hex) */
  primaryColor: string;
  /** Secondary color (hex) */
  secondaryColor: string;
  /** Font family */
  fontFamily: string;
}

export interface TemplateLayout {
  /** Orientation */
  orientation: 'portrait' | 'landscape';
  /** Paper size */
  paperSize: 'A4' | 'letter' | 'legal';
  /** Margins (in mm) */
  margins: { top: number; bottom: number; left: number; right: number };
  /** Show page numbers */
  showPageNumbers: boolean;
  /** Header height (rows) */
  headerRows: number;
  /** Footer content */
  footerText?: string;
  /** Show organization logo in header */
  showOrgLogo: boolean;
  /** Show donor logo in header */
  showDonorLogo: boolean;
  /** Title position */
  titlePosition: 'top_left' | 'top_center' | 'top_right';
  /** Print scale (percentage) */
  printScale?: number;
}

export interface ColumnMapping {
  /** Source column key from report definition */
  sourceKey: string;
  /** Target column position (1-based) */
  targetPosition: number;
  /** Override header label */
  headerOverride?: string;
  headerOverrideAR?: string;
  headerOverrideIT?: string;
  /** Override column width */
  widthOverride?: number;
  /** Override number format */
  formatOverride?: string;
  /** Hide this column in this template */
  hidden?: boolean;
  /** Add extra columns not in source */
  computed?: {
    formula: string;
    label: string;
  };
}

export interface TemplateSection {
  sectionId: string;
  title: string;
  titleAR?: string;
  titleIT?: string;
  /** Filter to select rows for this section */
  filterField: string;
  filterValue: string;
  /** Show section subtotal */
  showSubtotal: boolean;
  /** Section-specific styling */
  style?: ExcelStyle;
  /** Section order */
  order: number;
}

export interface TemplateResolution {
  template: ReportTemplate;
  resolvedColumns: ReportColumnDef[];
  resolvedBranding: BrandingConfig;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IReportTemplateRepository {
  save(template: ReportTemplate): Promise<void>;
  getById(templateId: string): Promise<ReportTemplate | null>;
  getByDonor(donorId: number, category: TemplateCategory, scope: RepositoryScope): Promise<ReportTemplate | null>;
  getDefault(category: TemplateCategory, scope: RepositoryScope): Promise<ReportTemplate | null>;
  list(scope: RepositoryScope, category?: TemplateCategory): Promise<ReportTemplate[]>;
  update(templateId: string, fields: Partial<ReportTemplate>): Promise<void>;
  getVersionHistory(templateId: string): Promise<ReportTemplate[]>;
}

export interface TemplateDependencies {
  templateRepo: IReportTemplateRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class EnterpriseReportTemplateEngine {
  private repo: IReportTemplateRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: TemplateDependencies) {
    this.repo = deps.templateRepo;
    this.logger = deps.logger.child({ service: 'ReportTemplateEngine' });
    this.config = deps.config;
  }

  /**
   * Resolve the best template for a report + donor combination.
   *
   * Resolution order:
   *   1. Donor-specific template for this category
   *   2. Organization default template for this category
   *   3. System default (built-in)
   */
  async resolveTemplate(
    report: ReportDefinition,
    donorId: number | undefined,
    scope: RepositoryScope,
  ): Promise<TemplateResolution> {
    let template: ReportTemplate | null = null;

    // 1. Try donor-specific
    if (donorId) {
      template = await this.repo.getByDonor(donorId, report.module as TemplateCategory, scope);
      if (template) {
        this.logger.info('Donor-specific template resolved', {
          templateId: template.templateId,
          donorId,
          reportId: report.reportId,
        });
      }
    }

    // 2. Try organization default
    if (!template) {
      template = await this.repo.getDefault(report.module as TemplateCategory, scope);
    }

    // 3. Fall back to built-in
    if (!template) {
      template = this.getBuiltInTemplate(report.module as TemplateCategory, scope);
    }

    // Apply column mappings
    const resolvedColumns = this.applyColumnMappings(report.columns, template.columnMappings);

    return {
      template,
      resolvedColumns,
      resolvedBranding: template.branding,
    };
  }

  /**
   * Create a donor-specific template.
   */
  async createTemplate(
    input: Omit<ReportTemplate, 'templateId' | 'version' | 'createdAt' | 'updatedAt'>,
  ): Promise<ReportTemplate> {
    const template: ReportTemplate = {
      ...input,
      templateId: uuidv4(),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.repo.save(template);
    this.logger.info('Report template created', {
      templateId: template.templateId,
      category: template.category,
      donorName: template.donorName,
    });
    return template;
  }

  /**
   * Update a template (creates new version).
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<ReportTemplate>,
    userId: number,
  ): Promise<ReportTemplate> {
    const existing = await this.repo.getById(templateId);
    if (!existing) throw new Error(`Template ${templateId} not found`);

    const updated: Partial<ReportTemplate> = {
      ...updates,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    await this.repo.update(templateId, updated);
    this.logger.info('Report template updated', {
      templateId,
      version: updated.version,
    });

    return { ...existing, ...updated } as ReportTemplate;
  }

  /**
   * List available templates.
   */
  async listTemplates(
    scope: RepositoryScope,
    category?: TemplateCategory,
  ): Promise<ReportTemplate[]> {
    return this.repo.list(scope, category);
  }

  // ── PRIVATE ──

  private applyColumnMappings(
    sourceColumns: ReportColumnDef[],
    mappings: ColumnMapping[],
  ): ReportColumnDef[] {
    if (mappings.length === 0) return sourceColumns;

    const mappingMap = new Map(mappings.map(m => [m.sourceKey, m]));
    const result: ReportColumnDef[] = [];

    for (const col of sourceColumns) {
      const mapping = mappingMap.get(col.key);
      if (mapping?.hidden) continue;

      const mapped: ReportColumnDef = {
        ...col,
        headerEN: mapping?.headerOverride || col.headerEN,
        headerAR: mapping?.headerOverrideAR || col.headerAR,
        headerIT: mapping?.headerOverrideIT || col.headerIT,
        width: mapping?.widthOverride || col.width,
        format: mapping?.formatOverride || col.format,
      };
      result.push(mapped);
    }

    // Sort by target position if specified
    result.sort((a, b) => {
      const posA = mappings.find(m => m.sourceKey === a.key)?.targetPosition || 999;
      const posB = mappings.find(m => m.sourceKey === b.key)?.targetPosition || 999;
      return posA - posB;
    });

    return result;
  }

  private getBuiltInTemplate(category: TemplateCategory, scope: RepositoryScope): ReportTemplate {
    return {
      templateId: `builtin_${category}`,
      name: `Default ${category} Template`,
      description: 'System default template',
      category,
      version: 1,
      branding: {
        footerCenter: 'Generated by IMS',
        confidentialityLevel: 'internal',
      },
      styles: {
        titleStyle: {
          font: { name: 'Arial', size: 14, bold: true, color: 'FFFFFF' },
          fill: { type: 'solid', color: '2E75B6' },
          alignment: { horizontal: 'center' },
        },
        subtitleStyle: {
          font: { name: 'Arial', size: 9, italic: true, color: '666666' },
        },
        headerStyle: {
          font: { name: 'Arial', size: 11, bold: true, color: 'FFFFFF' },
          fill: { type: 'solid', color: '1F4E79' },
        },
        dataStyle: {
          font: { name: 'Arial', size: 10 },
        },
        alternateRowStyle: {
          fill: { type: 'solid', color: 'F2F7FB' },
        },
        totalsStyle: {
          font: { name: 'Arial', size: 10, bold: true, color: '1F4E79' },
          fill: { type: 'solid', color: 'D6E4F0' },
        },
        sectionHeaderStyle: {
          font: { name: 'Arial', size: 11, bold: true },
          fill: { type: 'solid', color: 'E8EFF5' },
        },
        primaryColor: '2E75B6',
        secondaryColor: '1F4E79',
        fontFamily: 'Arial',
      },
      layout: {
        orientation: 'landscape',
        paperSize: 'A4',
        margins: { top: 20, bottom: 20, left: 15, right: 15 },
        showPageNumbers: true,
        headerRows: 3,
        showOrgLogo: true,
        showDonorLogo: false,
        titlePosition: 'top_center',
      },
      columnMappings: [],
      sections: [],
      organizationId: scope.organizationId,
      isDefault: true,
      isActive: true,
      createdBy: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PRE-BUILT DONOR TEMPLATE HELPERS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Helper to create a UNICEF-style template.
 * Blue branding, UNICEF layout, specific column order.
 */
export function createUNICEFTemplate(scope: RepositoryScope, userId: number): Omit<ReportTemplate, 'templateId' | 'version' | 'createdAt' | 'updatedAt'> {
  return {
    name: 'UNICEF Report Template',
    nameAR: 'قالب تقرير اليونيسف',
    description: 'UNICEF standard financial report format',
    category: 'donor',
    donorId: undefined, // Set to actual UNICEF donor ID
    donorName: 'UNICEF',
    branding: {
      primaryColor: '00AEEF',
      secondaryColor: '1D1D1B',
      footerCenter: 'UNICEF Financial Report — Confidential',
      confidentialityLevel: 'confidential',
    },
    styles: {
      titleStyle: { font: { name: 'Arial', size: 14, bold: true, color: 'FFFFFF' }, fill: { type: 'solid', color: '00AEEF' }, alignment: { horizontal: 'center' } },
      subtitleStyle: { font: { name: 'Arial', size: 9, color: '666666' } },
      headerStyle: { font: { name: 'Arial', size: 10, bold: true, color: 'FFFFFF' }, fill: { type: 'solid', color: '1D1D1B' } },
      dataStyle: { font: { name: 'Arial', size: 10 } },
      alternateRowStyle: { fill: { type: 'solid', color: 'E6F7FF' } },
      totalsStyle: { font: { name: 'Arial', size: 10, bold: true }, fill: { type: 'solid', color: 'B3E5FF' } },
      sectionHeaderStyle: { font: { name: 'Arial', size: 11, bold: true }, fill: { type: 'solid', color: 'CCF0FF' } },
      primaryColor: '00AEEF',
      secondaryColor: '1D1D1B',
      fontFamily: 'Arial',
    },
    layout: {
      orientation: 'landscape',
      paperSize: 'A4',
      margins: { top: 25, bottom: 20, left: 15, right: 15 },
      showPageNumbers: true,
      headerRows: 4,
      showOrgLogo: true,
      showDonorLogo: true,
      titlePosition: 'top_center',
    },
    columnMappings: [],
    sections: [],
    organizationId: scope.organizationId,
    isDefault: false,
    isActive: true,
    createdBy: userId,
  };
}

/**
 * Helper to create an EU-style template.
 */
export function createEUTemplate(scope: RepositoryScope, userId: number): Omit<ReportTemplate, 'templateId' | 'version' | 'createdAt' | 'updatedAt'> {
  return {
    name: 'EU Report Template',
    nameAR: 'قالب تقرير الاتحاد الأوروبي',
    description: 'European Union standard financial report format',
    category: 'donor',
    donorName: 'European Union',
    branding: {
      primaryColor: '003399',
      secondaryColor: 'FFCC00',
      footerCenter: 'EU Financial Report — Co-funded by the European Union',
      confidentialityLevel: 'confidential',
    },
    styles: {
      titleStyle: { font: { name: 'Times New Roman', size: 14, bold: true, color: 'FFFFFF' }, fill: { type: 'solid', color: '003399' }, alignment: { horizontal: 'center' } },
      subtitleStyle: { font: { name: 'Times New Roman', size: 9, color: '666666' } },
      headerStyle: { font: { name: 'Times New Roman', size: 10, bold: true, color: 'FFFFFF' }, fill: { type: 'solid', color: '003399' } },
      dataStyle: { font: { name: 'Times New Roman', size: 10 } },
      alternateRowStyle: { fill: { type: 'solid', color: 'E6EBF5' } },
      totalsStyle: { font: { name: 'Times New Roman', size: 10, bold: true }, fill: { type: 'solid', color: 'FFCC00' } },
      sectionHeaderStyle: { font: { name: 'Times New Roman', size: 11, bold: true }, fill: { type: 'solid', color: 'E6EBF5' } },
      primaryColor: '003399',
      secondaryColor: 'FFCC00',
      fontFamily: 'Times New Roman',
    },
    layout: {
      orientation: 'portrait',
      paperSize: 'A4',
      margins: { top: 25, bottom: 25, left: 20, right: 20 },
      showPageNumbers: true,
      headerRows: 4,
      showOrgLogo: true,
      showDonorLogo: true,
      titlePosition: 'top_left',
    },
    columnMappings: [],
    sections: [],
    organizationId: scope.organizationId,
    isDefault: false,
    isActive: true,
    createdBy: userId,
  };
}
