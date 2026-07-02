/**
 * InteractiveReportingEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Interactive Reporting — Drill-Down, Filtering, Pivoting
 *
 * PHASE 10: Enterprise Reporting
 *
 * Powers the live report UI (not exports). Users can:
 *  - Start with a summary view
 *  - Drill down into detail (click a total → see line items)
 *  - Filter dynamically (add/remove filters in real time)
 *  - Pivot data (swap rows/columns)
 *  - Slice by dimensions (project, grant, donor, period, account)
 *  - Save views as named configurations
 *
 * All queries go through scopedProcedure with ctx.scope.
 * Results are paginated for performance.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface DrillDownRequest {
  dataSource: string;
  /** The parent row the user clicked (e.g., a summary row with accountType = 'expense') */
  parentContext: Record<string, unknown>;
  /** Which dimension to expand into */
  drillDimension: string;
  /** Current filters */
  filters: InteractiveFilter[];
  /** Pagination */
  page: number;
  pageSize: number;
  scope: RepositoryScope;
}

export interface InteractiveFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'like';
  value: unknown;
}

export interface DrillDownResult {
  level: number;
  dimension: string;
  parentContext: Record<string, unknown>;
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  canDrillFurther: boolean;
  nextDrillDimensions: string[];
  breadcrumb: DrillBreadcrumb[];
}

export interface DrillBreadcrumb {
  level: number;
  dimension: string;
  value: string;
  label: string;
}

export interface PivotRequest {
  dataSource: string;
  rowFields: string[];
  columnField: string;
  valueField: string;
  aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max';
  filters: InteractiveFilter[];
  scope: RepositoryScope;
}

export interface PivotResult {
  rowHeaders: string[];
  columnHeaders: string[];
  cells: number[][];
  rowTotals: number[];
  columnTotals: number[];
  grandTotal: number;
  metadata: {
    rowField: string;
    columnField: string;
    valueField: string;
    aggregation: string;
    rowCount: number;
    columnCount: number;
  };
}

export interface SavedView {
  viewId: string;
  name: string;
  dataSource: string;
  filters: InteractiveFilter[];
  drillPath: DrillBreadcrumb[];
  pivotConfig?: Omit<PivotRequest, 'scope' | 'filters' | 'dataSource'>;
  createdBy: number;
  createdAt: string;
  organizationId: number;
  operatingUnitId: number;
  isShared: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// DRILL-DOWN HIERARCHY
// ────────────────────────────────────────────────────────────────────────────

/**
 * Defines how drill-down works for each data source.
 * Level 0: Summary → Level 1: Detail → Level 2: Line items
 */
export interface DrillHierarchy {
  dataSource: string;
  levels: Array<{
    level: number;
    dimension: string;
    label: string;
    labelAR: string;
    labelIT: string;
  }>;
}

const DRILL_HIERARCHIES: DrillHierarchy[] = [
  {
    dataSource: 'gl.trial_balance',
    levels: [
      { level: 0, dimension: 'accountType', label: 'Account Type', labelAR: 'نوع الحساب', labelIT: 'Tipo Conto' },
      { level: 1, dimension: 'accountCode', label: 'Account', labelAR: 'الحساب', labelIT: 'Conto' },
      { level: 2, dimension: 'entryNumber', label: 'Journal Entry', labelAR: 'قيد اليومية', labelIT: 'Registrazione' },
    ],
  },
  {
    dataSource: 'budget.budget_vs_actual',
    levels: [
      { level: 0, dimension: 'projectName', label: 'Project', labelAR: 'المشروع', labelIT: 'Progetto' },
      { level: 1, dimension: 'categoryName', label: 'Category', labelAR: 'الفئة', labelIT: 'Categoria' },
      { level: 2, dimension: 'lineCode', label: 'Budget Line', labelAR: 'بند الميزانية', labelIT: 'Linea Budget' },
      { level: 3, dimension: 'entryNumber', label: 'Transaction', labelAR: 'المعاملة', labelIT: 'Transazione' },
    ],
  },
  {
    dataSource: 'grant.grant_expenditures',
    levels: [
      { level: 0, dimension: 'donorName', label: 'Donor', labelAR: 'المانح', labelIT: 'Donatore' },
      { level: 1, dimension: 'grantName', label: 'Grant', labelAR: 'المنحة', labelIT: 'Contributo' },
      { level: 2, dimension: 'categoryName', label: 'Category', labelAR: 'الفئة', labelIT: 'Categoria' },
      { level: 3, dimension: 'entryNumber', label: 'Transaction', labelAR: 'المعاملة', labelIT: 'Transazione' },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IInteractiveReportRepository {
  drillDown(
    dataSource: string,
    parentFilters: InteractiveFilter[],
    drillDimension: string,
    page: number,
    pageSize: number,
    scope: RepositoryScope,
  ): Promise<{ rows: Record<string, unknown>[]; totalRows: number }>;

  pivot(
    dataSource: string,
    rowFields: string[],
    columnField: string,
    valueField: string,
    aggregation: string,
    filters: InteractiveFilter[],
    scope: RepositoryScope,
  ): Promise<{
    rows: Array<{ rowKey: string; values: Record<string, number> }>;
    columnHeaders: string[];
  }>;

  saveView(view: SavedView): Promise<void>;
  getView(viewId: string, scope: RepositoryScope): Promise<SavedView | null>;
  listViews(userId: number, scope: RepositoryScope): Promise<SavedView[]>;
  deleteView(viewId: string): Promise<void>;
}

export interface InteractiveReportDependencies {
  interactiveRepo: IInteractiveReportRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class InteractiveReportingEngine {
  private repo: IInteractiveReportRepository;
  private logger: ILogger;

  constructor(deps: InteractiveReportDependencies) {
    this.repo = deps.interactiveRepo;
    this.logger = deps.logger.child({ service: 'InteractiveReportingEngine' });
  }

  /**
   * Execute a drill-down query.
   */
  async drillDown(request: DrillDownRequest): Promise<DrillDownResult> {
    const hierarchy = DRILL_HIERARCHIES.find(h => h.dataSource === request.dataSource);
    const currentLevel = hierarchy
      ? hierarchy.levels.findIndex(l => l.dimension === request.drillDimension)
      : 0;

    // Build combined filters (existing + parent context)
    const allFilters = [...request.filters];
    for (const [key, value] of Object.entries(request.parentContext)) {
      if (value !== undefined && value !== null) {
        allFilters.push({ column: key, operator: 'eq', value });
      }
    }

    const { rows, totalRows } = await this.repo.drillDown(
      request.dataSource,
      allFilters,
      request.drillDimension,
      request.page,
      request.pageSize,
      request.scope,
    );

    // Determine if further drill-down is possible
    const nextLevel = hierarchy && currentLevel >= 0 ? hierarchy.levels[currentLevel + 1] : undefined;
    const canDrillFurther = !!nextLevel;
    const nextDrillDimensions = hierarchy
      ? hierarchy.levels.slice(currentLevel + 1).map(l => l.dimension)
      : [];

    // Build breadcrumb
    const breadcrumb: DrillBreadcrumb[] = [];
    if (hierarchy) {
      for (let i = 0; i <= currentLevel; i++) {
        const level = hierarchy.levels[i];
        const value = request.parentContext[level.dimension];
        breadcrumb.push({
          level: i,
          dimension: level.dimension,
          value: String(value || ''),
          label: level.label,
        });
      }
    }

    this.logger.info('Drill-down executed', {
      dataSource: request.dataSource,
      dimension: request.drillDimension,
      level: currentLevel,
      rows: rows.length,
      totalRows,
      canDrillFurther,
    });

    return {
      level: currentLevel,
      dimension: request.drillDimension,
      parentContext: request.parentContext,
      rows,
      totalRows,
      page: request.page,
      pageSize: request.pageSize,
      totalPages: Math.ceil(totalRows / request.pageSize),
      canDrillFurther,
      nextDrillDimensions,
      breadcrumb,
    };
  }

  /**
   * Execute a pivot query.
   */
  async pivot(request: PivotRequest): Promise<PivotResult> {
    const { rows, columnHeaders } = await this.repo.pivot(
      request.dataSource,
      request.rowFields,
      request.columnField,
      request.valueField,
      request.aggregation,
      request.filters,
      request.scope,
    );

    const rowHeaders = rows.map(r => r.rowKey);
    const cells = rows.map(r => columnHeaders.map(ch => r.values[ch] || 0));
    const rowTotals = cells.map(row => row.reduce((s, v) => s + v, 0));
    const columnTotals = columnHeaders.map((_, ci) => cells.reduce((s, row) => s + row[ci], 0));
    const grandTotal = rowTotals.reduce((s, v) => s + v, 0);

    this.logger.info('Pivot executed', {
      dataSource: request.dataSource,
      rows: rowHeaders.length,
      columns: columnHeaders.length,
      aggregation: request.aggregation,
    });

    return {
      rowHeaders,
      columnHeaders,
      cells,
      rowTotals,
      columnTotals,
      grandTotal,
      metadata: {
        rowField: request.rowFields.join(' × '),
        columnField: request.columnField,
        valueField: request.valueField,
        aggregation: request.aggregation,
        rowCount: rowHeaders.length,
        columnCount: columnHeaders.length,
      },
    };
  }

  /**
   * Get drill-down hierarchy for a data source.
   */
  getDrillHierarchy(dataSource: string): DrillHierarchy | null {
    return DRILL_HIERARCHIES.find(h => h.dataSource === dataSource) || null;
  }

  /**
   * Save a user's current view configuration.
   */
  async saveView(
    name: string,
    dataSource: string,
    filters: InteractiveFilter[],
    drillPath: DrillBreadcrumb[],
    userId: number,
    scope: RepositoryScope,
    pivotConfig?: Omit<PivotRequest, 'scope' | 'filters' | 'dataSource'>,
    isShared?: boolean,
  ): Promise<SavedView> {
    const view: SavedView = {
      viewId: uuidv4(),
      name,
      dataSource,
      filters,
      drillPath,
      pivotConfig,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
      isShared: isShared || false,
    };

    await this.repo.saveView(view);
    this.logger.info('View saved', { viewId: view.viewId, name });
    return view;
  }

  /**
   * List saved views for current user.
   */
  async listViews(userId: number, scope: RepositoryScope): Promise<SavedView[]> {
    return this.repo.listViews(userId, scope);
  }
}
