/**
 * ReportExportTypes.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Enterprise Export Platform — Type Definitions
 *
 * Shared types for the centralized report export system.
 * Serves all IMS modules: Finance, Budget, Donor, Grant,
 * Procurement, HR, Inventory, MEAL, Executive.
 *
 * Key principle: No report page generates Excel directly.
 * All exports flow through ReportExportOrchestrator.
 */

import type { RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// REPORT DEFINITION
// ────────────────────────────────────────────────────────────────────────────

export type ReportModule =
  | 'finance'
  | 'budget'
  | 'grant'
  | 'donor'
  | 'procurement'
  | 'hr'
  | 'inventory'
  | 'meal'
  | 'executive';

export type ColumnDataType = 'string' | 'number' | 'currency' | 'date' | 'percentage' | 'boolean' | 'formula';
export type ColumnAlignment = 'left' | 'center' | 'right';
export type SortDirection = 'asc' | 'desc';

export interface ReportColumnDef {
  key: string;                  // Data field name
  headerEN: string;             // English header
  headerAR: string;             // Arabic header
  headerIT: string;             // Italian header
  dataType: ColumnDataType;
  width: number;                // Column width in characters
  alignment?: ColumnAlignment;
  format?: string;              // Excel number format (e.g., '#,##0.00', '0.0%')
  formula?: string;             // Excel formula template (e.g., '=SUM({range})')
  isTotal?: boolean;            // Include in totals row
  isCurrency?: boolean;         // Apply currency formatting
  currencyField?: string;       // Which field holds the currency code
  isHidden?: boolean;           // Hidden column (data only)
  conditionalFormat?: {
    rules: Array<{
      condition: 'greater_than' | 'less_than' | 'equal' | 'between';
      value: number | [number, number];
      fill?: string;            // Background color hex
      fontColor?: string;       // Font color hex
    }>;
  };
}

export interface ReportDefinition {
  reportId: string;
  name: string;
  nameAR: string;
  nameIT: string;
  description: string;
  module: ReportModule;
  /** Which tRPC query or repository method provides the data */
  dataSource: string;
  columns: ReportColumnDef[];
  /** Available user filters */
  filters: ReportFilterDef[];
  /** Default sort */
  defaultSort?: { column: string; direction: SortDirection };
  /** File naming convention */
  fileNameTemplate: string;     // e.g., '{reportName}_{orgName}_{date}'
  /** Roles allowed to export */
  allowedRoles: string[];
  /** Include totals row */
  includeTotals: boolean;
  /** Include title/header rows */
  includeHeader: boolean;
  /** Support multiple worksheets */
  worksheets?: WorksheetDef[];
  /** RTL support for Arabic layout */
  supportRTL: boolean;
  /** Version of this report definition */
  version: number;
}

export interface ReportFilterDef {
  key: string;
  label: string;
  labelAR: string;
  labelIT: string;
  type: 'date' | 'dateRange' | 'select' | 'multiSelect' | 'text' | 'number';
  options?: Array<{ value: string; label: string }>;
  required: boolean;
  defaultValue?: unknown;
}

export interface WorksheetDef {
  name: string;
  nameAR: string;
  nameIT: string;
  dataSource: string;
  columns: ReportColumnDef[];
  filters?: ReportFilterDef[];
  includeTotals: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORT REQUEST / RESPONSE
// ────────────────────────────────────────────────────────────────────────────

export type ExportFormat = 'xlsx';
export type ExportStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'expired';

export interface ExportRequest {
  reportId: string;
  format: ExportFormat;
  locale: 'en' | 'ar' | 'it';
  filters: Record<string, unknown>;
  /** From ctx.scope — NEVER from user input */
  scope: RepositoryScope;
  /** From ctx.user.id */
  requestedBy: number;
  requestedAt: string;
}

export interface ExportResult {
  exportId: string;
  reportId: string;
  status: ExportStatus;
  fileName: string;
  filePath?: string;
  downloadUrl?: string;
  fileSize?: number;
  rowCount?: number;
  worksheetCount?: number;
  generatedAt?: string;
  expiresAt?: string;
  error?: string;
  durationMs?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// EXCEL FORMATTING
// ────────────────────────────────────────────────────────────────────────────

export interface ExcelStyle {
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
  fill?: {
    type: 'solid';
    color: string;
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
    readingOrder?: 'ltr' | 'rtl';
  };
  border?: {
    top?: { style: 'thin' | 'medium' | 'thick'; color: string };
    bottom?: { style: 'thin' | 'medium' | 'thick'; color: string };
    left?: { style: 'thin' | 'medium' | 'thick'; color: string };
    right?: { style: 'thin' | 'medium' | 'thick'; color: string };
  };
  numberFormat?: string;
}

export interface ExcelTitleRow {
  text: string;
  mergeColumns: number;
  style: ExcelStyle;
}

// ────────────────────────────────────────────────────────────────────────────
// AUDIT
// ────────────────────────────────────────────────────────────────────────────

export interface ExportAuditRecord {
  exportId: string;
  reportId: string;
  reportName: string;
  module: ReportModule;
  format: ExportFormat;
  locale: string;
  filters: Record<string, unknown>;
  organizationId: number;
  operatingUnitId: number;
  requestedBy: number;
  requestedAt: string;
  status: ExportStatus;
  fileName?: string;
  fileSize?: number;
  rowCount?: number;
  durationMs?: number;
  error?: string;
  completedAt?: string;
  downloadedAt?: string;
  downloadedBy?: number;
  ipAddress?: string;
}
