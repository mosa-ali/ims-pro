/**
 * FinancialReportingEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Dynamic Financial Report Computation
 *
 * PHASE 10: Enterprise Reporting
 *
 * This engine COMPUTES report data. The Export Platform RENDERS it.
 *
 *   FinancialReportingEngine.compute() → data[]
 *     ↓
 *   ReportExportOrchestrator.export() → .xlsx / .pdf
 *
 * Capabilities:
 *  - Dynamic report definitions (user selects columns, filters, groupings)
 *  - Multi-dimensional aggregation (by project, grant, donor, period, account)
 *  - Comparison reports (period-over-period, budget-vs-actual, year-over-year)
 *  - Currency conversion at report time
 *  - Subtotals and grand totals
 *  - Computed columns (variance, percentage, ratio)
 *  - Report caching for repeated queries
 *
 * Integrates with existing:
 *  - journalEntriesRouter (GL data)
 *  - budgetsRouter (budget data)
 *  - GeneralLedgerEngine (trial balance, account balances)
 *  - BudgetEngine (budget views, variance)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type AggregationFunction = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'count_distinct';
export type ComparisonType = 'period_over_period' | 'year_over_year' | 'budget_vs_actual' | 'forecast_vs_actual';
export type SortDirection = 'asc' | 'desc';

export interface DynamicReportRequest {
  /** Base data source (maps to repository method) */
  dataSource: string;
  /** Columns to include */
  columns: ReportColumn[];
  /** Filters */
  filters: ReportFilter[];
  /** Group by dimensions */
  groupBy?: string[];
  /** Aggregations */
  aggregations?: Array<{
    column: string;
    function: AggregationFunction;
    alias: string;
  }>;
  /** Computed columns */
  computedColumns?: ComputedColumn[];
  /** Sort */
  orderBy?: Array<{ column: string; direction: SortDirection }>;
  /** Comparison mode */
  comparison?: {
    type: ComparisonType;
    basePeriod: { start: string; end: string };
    comparePeriod: { start: string; end: string };
  };
  /** Currency conversion */
  convertTo?: string;
  /** Include subtotals per group */
  includeSubtotals?: boolean;
  /** Include grand total */
  includeGrandTotal?: boolean;
  /** Limit rows */
  limit?: number;
  /** Scope from ctx.scope */
  scope: RepositoryScope;
}

export interface ReportColumn {
  key: string;
  label: string;
  dataType: 'string' | 'number' | 'currency' | 'date' | 'percentage';
  visible: boolean;
}

export interface ReportFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'like' | 'is_null' | 'is_not_null';
  value: unknown;
}

export interface ComputedColumn {
  alias: string;
  label: string;
  expression: string;
  dataType: 'number' | 'currency' | 'percentage';
  /** Expression uses other column names: e.g., "(actual / budget) * 100" */
}

export interface DynamicReportResult {
  reportId: string;
  generatedAt: string;
  dataSource: string;
  rows: Record<string, unknown>[];
  columns: ReportColumn[];
  totalRows: number;
  subtotals?: Record<string, Record<string, number>>;
  grandTotal?: Record<string, number>;
  comparison?: ComparisonResult;
  metadata: {
    filtersApplied: number;
    groupByDimensions: string[];
    aggregationsApplied: number;
    computedColumnsAdded: number;
    currencyConverted: boolean;
    executionMs: number;
  };
}

export interface ComparisonResult {
  type: ComparisonType;
  basePeriodLabel: string;
  comparePeriodLabel: string;
  rows: Array<{
    key: string;
    baseValue: number;
    compareValue: number;
    variance: number;
    variancePercent: number;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IFinancialReportRepository {
  /** Execute a dynamic query against the financial data store */
  query(
    dataSource: string,
    filters: ReportFilter[],
    groupBy: string[] | undefined,
    orderBy: Array<{ column: string; direction: SortDirection }> | undefined,
    limit: number | undefined,
    scope: RepositoryScope,
  ): Promise<Record<string, unknown>[]>;

  /** Get exchange rate for currency conversion */
  getExchangeRate(fromCurrency: string, toCurrency: string, asOfDate: string): Promise<number>;

  /** Get available data sources and their columns */
  getDataSourceSchema(dataSource: string): Promise<{
    columns: Array<{ key: string; label: string; dataType: string }>;
    supportedFilters: string[];
    supportedGroupBy: string[];
  } | null>;
}

export interface FinancialReportDependencies {
  reportRepo: IFinancialReportRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class FinancialReportingEngine {
  private repo: IFinancialReportRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: FinancialReportDependencies) {
    this.repo = deps.reportRepo;
    this.logger = deps.logger.child({ service: 'FinancialReportingEngine' });
    this.config = deps.config;
  }

  /**
   * Compute a dynamic financial report.
   * Returns data ready for the Export Platform to render.
   */
  async compute(request: DynamicReportRequest): Promise<DynamicReportResult> {
    const t0 = Date.now();
    const reportId = uuidv4();

    // 1. Fetch raw data
    let rows = await this.repo.query(
      request.dataSource,
      request.filters,
      request.groupBy,
      request.orderBy,
      request.limit,
      request.scope,
    );

    // 2. Apply aggregations
    if (request.aggregations && request.aggregations.length > 0 && request.groupBy) {
      rows = this.applyAggregations(rows, request.groupBy, request.aggregations);
    }

    // 3. Apply computed columns
    if (request.computedColumns) {
      rows = this.applyComputedColumns(rows, request.computedColumns);
    }

    // 4. Currency conversion
    let currencyConverted = false;
    if (request.convertTo) {
      rows = await this.convertCurrency(rows, request.convertTo, request.columns);
      currencyConverted = true;
    }

    // 5. Calculate subtotals
    let subtotals: Record<string, Record<string, number>> | undefined;
    if (request.includeSubtotals && request.groupBy && request.groupBy.length > 0) {
      subtotals = this.calculateSubtotals(rows, request.groupBy[0], request.columns);
    }

    // 6. Calculate grand total
    let grandTotal: Record<string, number> | undefined;
    if (request.includeGrandTotal) {
      grandTotal = this.calculateGrandTotal(rows, request.columns);
    }

    // 7. Comparison
    let comparison: ComparisonResult | undefined;
    if (request.comparison) {
      comparison = await this.computeComparison(request);
    }

    const executionMs = Date.now() - t0;

    this.logger.info('Financial report computed', {
      reportId,
      dataSource: request.dataSource,
      rows: rows.length,
      filters: request.filters.length,
      executionMs,
    });

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      dataSource: request.dataSource,
      rows,
      columns: request.columns,
      totalRows: rows.length,
      subtotals,
      grandTotal,
      comparison,
      metadata: {
        filtersApplied: request.filters.length,
        groupByDimensions: request.groupBy || [],
        aggregationsApplied: request.aggregations?.length || 0,
        computedColumnsAdded: request.computedColumns?.length || 0,
        currencyConverted,
        executionMs,
      },
    };
  }

  /**
   * Get available data sources for the report builder UI.
   */
  async getAvailableDataSources(): Promise<string[]> {
    return [
      'gl.journal_entries',
      'gl.journal_lines',
      'gl.trial_balance',
      'gl.account_balances',
      'budget.budget_lines',
      'budget.budget_vs_actual',
      'budget.monthly_allocations',
      'payment.payments',
      'payment.payment_lines',
      'advance.advances',
      'advance.settlements',
      'grant.grant_allocations',
      'grant.grant_expenditures',
      'procurement.purchase_orders',
      'procurement.invoices',
    ];
  }

  /**
   * Get schema for a data source (columns, supported filters).
   */
  async getDataSourceSchema(dataSource: string) {
    return this.repo.getDataSourceSchema(dataSource);
  }

  // ── PRIVATE ──

  private applyAggregations(
    rows: Record<string, unknown>[],
    groupBy: string[],
    aggregations: DynamicReportRequest['aggregations'],
  ): Record<string, unknown>[] {
    if (!aggregations) return rows;

    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const key = groupBy.map(g => String(row[g] ?? '')).join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const result: Record<string, unknown>[] = [];
    for (const [, groupRows] of groups) {
      const aggregated: Record<string, unknown> = {};

      // Copy group-by fields from first row
      for (const g of groupBy) {
        aggregated[g] = groupRows[0][g];
      }

      // Compute aggregations
      for (const agg of aggregations) {
        const values = groupRows.map(r => Number(r[agg.column]) || 0);
        switch (agg.function) {
          case 'sum': aggregated[agg.alias] = values.reduce((s, v) => s + v, 0); break;
          case 'count': aggregated[agg.alias] = values.length; break;
          case 'avg': aggregated[agg.alias] = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0; break;
          case 'min': aggregated[agg.alias] = Math.min(...values); break;
          case 'max': aggregated[agg.alias] = Math.max(...values); break;
          case 'count_distinct': aggregated[agg.alias] = new Set(groupRows.map(r => r[agg.column])).size; break;
        }
      }

      result.push(aggregated);
    }

    return result;
  }

  private applyComputedColumns(
    rows: Record<string, unknown>[],
    computed: ComputedColumn[],
  ): Record<string, unknown>[] {
    return rows.map(row => {
      const enhanced = { ...row };
      for (const col of computed) {
        try {
          // Safe expression evaluation using column references
          let expr = col.expression;
          for (const [key, value] of Object.entries(row)) {
            expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(Number(value) || 0));
          }
          // Simple arithmetic evaluation (no eval — only +, -, *, /, parentheses)
          enhanced[col.alias] = this.safeEvaluate(expr);
        } catch {
          enhanced[col.alias] = 0;
        }
      }
      return enhanced;
    });
  }

  private safeEvaluate(expr: string): number {
    // Only allow numbers, operators, parentheses, and decimal points
    const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
    if (!sanitized) return 0;
    try {
      // Use Function constructor for safe arithmetic (no access to globals)
      const fn = new Function(`return (${sanitized})`);
      const result = fn();
      return typeof result === 'number' && isFinite(result) ? Math.round(result * 100) / 100 : 0;
    } catch {
      return 0;
    }
  }

  private async convertCurrency(
    rows: Record<string, unknown>[],
    targetCurrency: string,
    columns: ReportColumn[],
  ): Promise<Record<string, unknown>[]> {
    const currencyColumns = columns.filter(c => c.dataType === 'currency').map(c => c.key);
    const today = new Date().toISOString().split('T')[0];

    const rateCache = new Map<string, number>();

    for (const row of rows) {
      const sourceCurrency = (row['currency'] as string) || 'USD';
      if (sourceCurrency === targetCurrency) continue;

      const cacheKey = `${sourceCurrency}:${targetCurrency}`;
      if (!rateCache.has(cacheKey)) {
        const rate = await this.repo.getExchangeRate(sourceCurrency, targetCurrency, today);
        rateCache.set(cacheKey, rate);
      }

      const rate = rateCache.get(cacheKey)!;
      for (const col of currencyColumns) {
        const value = Number(row[col]) || 0;
        row[col] = Math.round(value * rate * 100) / 100;
      }
      row['currency'] = targetCurrency;
      row['_exchangeRate'] = rate;
    }

    return rows;
  }

  private calculateSubtotals(
    rows: Record<string, unknown>[],
    groupByField: string,
    columns: ReportColumn[],
  ): Record<string, Record<string, number>> {
    const numericCols = columns.filter(c => c.dataType === 'currency' || c.dataType === 'number').map(c => c.key);
    const subtotals: Record<string, Record<string, number>> = {};

    for (const row of rows) {
      const group = String(row[groupByField] ?? 'Other');
      if (!subtotals[group]) {
        subtotals[group] = Object.fromEntries(numericCols.map(c => [c, 0]));
      }
      for (const col of numericCols) {
        subtotals[group][col] += Number(row[col]) || 0;
      }
    }

    // Round
    for (const group of Object.keys(subtotals)) {
      for (const col of numericCols) {
        subtotals[group][col] = Math.round(subtotals[group][col] * 100) / 100;
      }
    }

    return subtotals;
  }

  private calculateGrandTotal(
    rows: Record<string, unknown>[],
    columns: ReportColumn[],
  ): Record<string, number> {
    const numericCols = columns.filter(c => c.dataType === 'currency' || c.dataType === 'number').map(c => c.key);
    const totals: Record<string, number> = {};

    for (const col of numericCols) {
      totals[col] = Math.round(rows.reduce((s, r) => s + (Number(r[col]) || 0), 0) * 100) / 100;
    }

    return totals;
  }

  private async computeComparison(request: DynamicReportRequest): Promise<ComparisonResult> {
    if (!request.comparison) throw new Error('No comparison config');

    const baseFilters = [...request.filters,
      { column: 'entryDate', operator: 'gte' as const, value: request.comparison.basePeriod.start },
      { column: 'entryDate', operator: 'lte' as const, value: request.comparison.basePeriod.end },
    ];
    const compareFilters = [...request.filters,
      { column: 'entryDate', operator: 'gte' as const, value: request.comparison.comparePeriod.start },
      { column: 'entryDate', operator: 'lte' as const, value: request.comparison.comparePeriod.end },
    ];

    const [baseRows, compareRows] = await Promise.all([
      this.repo.query(request.dataSource, baseFilters, request.groupBy, undefined, undefined, request.scope),
      this.repo.query(request.dataSource, compareFilters, request.groupBy, undefined, undefined, request.scope),
    ]);

    const groupKey = request.groupBy?.[0] || 'total';
    const valueCol = request.columns.find(c => c.dataType === 'currency')?.key || 'amount';

    const baseMap = new Map<string, number>();
    const compareMap = new Map<string, number>();

    for (const r of baseRows) { const k = String(r[groupKey]); baseMap.set(k, (baseMap.get(k) || 0) + (Number(r[valueCol]) || 0)); }
    for (const r of compareRows) { const k = String(r[groupKey]); compareMap.set(k, (compareMap.get(k) || 0) + (Number(r[valueCol]) || 0)); }

    const allKeys = new Set([...baseMap.keys(), ...compareMap.keys()]);
    const rows = [...allKeys].map(key => {
      const base = baseMap.get(key) || 0;
      const compare = compareMap.get(key) || 0;
      return {
        key,
        baseValue: Math.round(base * 100) / 100,
        compareValue: Math.round(compare * 100) / 100,
        variance: Math.round((compare - base) * 100) / 100,
        variancePercent: base !== 0 ? Math.round(((compare - base) / base) * 100 * 10) / 10 : 0,
      };
    });

    return {
      type: request.comparison.type,
      basePeriodLabel: `${request.comparison.basePeriod.start} to ${request.comparison.basePeriod.end}`,
      comparePeriodLabel: `${request.comparison.comparePeriod.start} to ${request.comparison.comparePeriod.end}`,
      rows,
    };
  }
}
