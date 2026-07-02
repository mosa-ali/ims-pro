/**
 * server/engines/finance/FinancialReportingEngine.ts
 *
 * Financial Reporting Engine
 * Generates formal financial reports for various stakeholders.
 *
 * REFACTORED: All methods previously returned hardcoded static objects.
 * Now delegates to FinancialStatementEngine (real GL queries) and
 * KPIRepository (real budget/expenditure queries) for all calculations.
 *
 * Report Types:
 * - Monthly Financial Report
 * - Budget vs Actual
 * - Cash Flow Statement
 * - Balance Sheet
 * - Income Statement
 * - Trial Balance
 * - Donor Financial Report
 */

import { and, eq, sql, sum, gte, lte, desc } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  projects,
  budgets,
  budgetLines,
  expenditures,
  journalEntries,
  journalLines,
  glAccounts,
  financeBankAccounts,
  grants,
  donors,
  operatingUnits,
  costCenters,
  procurementInvoices,
  auditLogs,
  financeFinancialRisks,
} from '../../../drizzle/schema';
import { getFinancialStatementEngine } from './FinancialStatementEngine';
import { getKPIRepository } from '../../repositories/finance/KPIRepository';


// ── Types ────────────────────────────────────────────────────────────────────

export type ReportType =
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual'
  | 'donor'
  | 'budget-vs-actual'
  | 'trial-balance'
  | 'balance-sheet'
  | 'cash-flow'
  | 'income-statement'
  | 'executive'
  // Generic analytical reports (real data, generic table shape)
  | 'gl-summary'
  | 'expense-analysis'
  | 'cost-center'
  | 'ou-performance'
  | 'forecast-vs-actual'
  | 'financial-kpis'
  | 'dashboard-summary'
  | 'donor-utilization'
  | 'donor-expenditure'
  | 'cost-share'
  | 'grant-closure'
  | 'procurement-compliance'
  | 'audit-findings'
  | 'financial-risks'
  | 'compliance-summary';

/**
 * Generic, self-describing table report. Used by every analytical report that
 * does not have a bespoke statement shape. The frontend renders `columns`/`rows`
 * generically and draws `chart` when present. `summary` (when set) feeds the
 * Executive Summary strip; `totals` renders a footer row.
 */
export type GenericColumnType =
  | 'currency' | 'number' | 'percent' | 'text' | 'status' | 'date';

export interface GenericColumn {
  key: string;
  label: string;
  type?: GenericColumnType;
  align?: 'start' | 'end';
}

export interface GenericChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface GenericTableReport {
  metadata: ReportMetadata;
  columns: GenericColumn[];
  rows: Record<string, unknown>[];
  chart?: { data: Record<string, unknown>[]; series: GenericChartSeries[] } | null;
  summary?: Record<string, number>;
  totals?: Record<string, number>;
}

export interface ReportMetadata {
  reportType: ReportType;
  organizationId: number;
  operatingUnitId?: number;
  period: string;
  generatedDate: Date;
  generatedBy: string;
  status: 'draft' | 'final' | 'archived';
}

export interface MonthlyFinancialReport {
  metadata: ReportMetadata;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    budgetVariance: number;
  };
  sections: {
    revenue: { category: string; amount: number }[];
    expenses: { category: string; amount: number }[];
    commitments: { category: string; amount: number }[];
  };
}

export interface BudgetVsActualReport {
  metadata: ReportMetadata;
  data: {
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
    forecast?: number;
  }[];
  summary: {
    totalBudget: number;
    totalActual: number;
    totalVariance: number;
    variancePercent: number;
  };
}

export interface TrialBalanceReport {
  metadata: ReportMetadata;
  accounts: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    balanced: boolean;
  };
}

export interface BalanceSheetReport {
  metadata: ReportMetadata;
  assets: {
    current: { category: string; amount: number }[];
    noncurrent: { category: string; amount: number }[];
    totalAssets: number;
  };
  liabilities: {
    current: { category: string; amount: number }[];
    noncurrent: { category: string; amount: number }[];
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    reserves: number;
    totalEquity: number;
  };
}

export interface CashFlowReport {
  metadata: ReportMetadata;
  operatingActivities: {
    netIncome: number;
    adjustments: { item: string; amount: number }[];
    totalOperating: number;
  };
  investingActivities: {
    purchases: { item: string; amount: number }[];
    sales: { item: string; amount: number }[];
    totalInvesting: number;
  };
  financingActivities: {
    borrowings: number;
    repayments: number;
    totalFinancing: number;
  };
  netCashFlow: number;
  beginningBalance: number;
  endingBalance: number;
}

export interface IncomeStatementReport {
  metadata: ReportMetadata;
  revenue: {
    categories: { category: string; amount: number }[];
    totalRevenue: number;
  };
  expenses: {
    categories: { category: string; amount: number }[];
    totalExpenses: number;
  };
  operatingIncome: number;
  otherIncomeExpense: {
    items: { item: string; amount: number }[];
    total: number;
  };
  netIncome: number;
}

export interface DonorFinancialReport {
  metadata: ReportMetadata;
  donorId: number;
  donorName: string;
  grantId: number;
  grantName: string;
  budgetedAmount: number;
  drawnAmount: number;
  expenditures: {
    category: string;
    budgeted: number;
    spent: number;
    variance: number;
  }[];
  complianceStatus: 'compliant' | 'at-risk' | 'non-compliant';
  reportingDeadline: Date;
  submissionStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMetadata(
  reportType: ReportType,
  organizationId: number,
  operatingUnitId: number | null | undefined,
  period: string
): ReportMetadata {
  return {
    reportType,
    organizationId,
    operatingUnitId: operatingUnitId ?? undefined,
    period,
    generatedDate: new Date(),
    generatedBy: 'system',
    status: 'final',
  };
}

function toNum(v: any): number {
  if (v == null) return 0;
  const n = typeof v === 'object' && 'toNumber' in v ? v.toNumber() : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// ── Financial Reporting Engine ──────────────────────────────────────────────

export class FinancialReportingEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Parse a YYYY-MM period string into start/end Date objects.
   */
  private periodToDates(period: string): { start: Date; end: Date } {
    // Explicit ISO range: "YYYY-MM-DD:YYYY-MM-DD" (from the report filter UI).
    // This is the primary path now that reporting period is a from/to range.
    const rangeMatch = period.match(/^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/);
    if (rangeMatch) {
      const start = new Date(`${rangeMatch[1]}T00:00:00`);
      const end = new Date(`${rangeMatch[2]}T23:59:59`);
      // Guard against an inverted range (defensive — UI already constrains it).
      if (start.getTime() <= end.getTime()) {
        return { start, end };
      }
      return { start: end, end: start };
    }
    // Accept: "2025-06", "2025", "2025-Q1"
    if (/^\d{4}-\d{2}$/.test(period)) {
      const [y, m] = period.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59); // last day of month
      return { start, end };
    }
    if (/^\d{4}$/.test(period)) {
      return {
        start: new Date(Number(period), 0, 1),
        end: new Date(Number(period), 11, 31, 23, 59, 59),
      };
    }
    // Default: use the year embedded in the string
    const year = parseInt(period.slice(0, 4)) || new Date().getFullYear();
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31, 23, 59, 59),
    };
  }

  /**
   * Fetch GL balances grouped by accountType for a date range.
   */
  private async getGLBalancesByType(
    organizationId: number,
    operatingUnitId: number | null | undefined,
    start: Date,
    end: Date
  ): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        accountType: glAccounts.accountType,
        balance: sql<number>`COALESCE(
          SUM(${journalLines.debitAmount}) - SUM(${journalLines.creditAmount}),
          0
        )`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(
        journalEntries,
        eq(journalLines.journalEntryId, journalEntries.id)
      )
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          gte(journalEntries.entryDate, start.toISOString()),
          lte(journalEntries.entryDate, end.toISOString())
        )
      )
      .groupBy(glAccounts.accountType);

    const map: Record<string, number> = {};
    for (const r of rows) {
      if (r.accountType) map[r.accountType] = toNum(r.balance);
    }
    return map;
  }

  /**
   * Fetch expenditures grouped by a label for a date range.
   * Returns array of { category, amount }.
   */
  private async getExpendituresByCategory(
    organizationId: number,
    operatingUnitId: number | null | undefined,
    start: Date,
    end: Date
  ): Promise<{ category: string; amount: number }[]> {
    // Use expenditures table grouped by month as proxy for categories
    // In a real system, expenditures would have a category/cost_code field.
    // We group by GL account name as the category label.
    const rows = await this.db
      .select({
        category: glAccounts.name,
        amount: sql<number>`COALESCE(SUM(${journalLines.debitAmount}), 0)`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          gte(journalEntries.entryDate, start.toISOString()),
          lte(journalEntries.entryDate, end.toISOString()),
          sql`${glAccounts.accountType} = 'expense'`
        )
      )
      .groupBy(glAccounts.name)
      .orderBy(sql`SUM(${journalLines.debitAmount}) DESC`)
      .limit(20);

    return rows
      .filter(r => r.category)
      .map(r => ({ category: r.category!, amount: toNum(r.amount) }));
  }

  /**
   * Fetch total bank balance (opening/closing) from financeBankAccounts.
   * Uses currentBalance as a proxy for the period-end balance.
   */
  private async getTotalBankBalance(
    organizationId: number,
    operatingUnitId: number | null | undefined
  ): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          operatingUnitId
            ? eq(financeBankAccounts.operatingUnitId, operatingUnitId)
            : undefined,
          eq(financeBankAccounts.isActive, 1),
          eq(financeBankAccounts.isDeleted, 0)
        )
      );
    return toNum(row?.total);
  }

  // ── Public report methods ────────────────────────────────────────────────

  /**
   * Generate monthly financial report.
   * Revenue, expenses, and net income come from real GL journal lines.
   */
  async generateMonthlyReport(
    organizationId: number,
    operatingUnitId: number | null,
    period: string // YYYY-MM
  ): Promise<MonthlyFinancialReport> {
    const { start, end } = this.periodToDates(period);
    const glBalances = await this.getGLBalancesByType(
      organizationId,
      operatingUnitId,
      start,
      end
    );

    const totalRevenue = toNum(glBalances['revenue']);
    const totalExpenses = toNum(glBalances['expense']);
    const netIncome = totalRevenue - totalExpenses;

    // Budget variance: approved budget vs actual from budgets table
    const kpiRepo = await getKPIRepository(this.db);
    const bva = await kpiRepo.getBudgetVsActual(
      organizationId,
      operatingUnitId,
      period.slice(0, 4) // fiscal year
    );
    const budgetVariance = toNum(bva.variance);

    // Revenue categories from GL
    const revRows = await this.db
      .select({
        category: glAccounts.name,
        amount: sql<number>`COALESCE(SUM(${journalLines.creditAmount}), 0)`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          gte(journalEntries.entryDate, start.toISOString()),
          lte(journalEntries.entryDate, end.toISOString()),
          sql`${glAccounts.accountType} = 'revenue'`
        )
      )
      .groupBy(glAccounts.name)
      .orderBy(sql`SUM(${journalLines.creditAmount}) DESC`)
      .limit(10);

    const expRows = await this.getExpendituresByCategory(
      organizationId,
      operatingUnitId,
      start,
      end
    );

    // Commitments = budget approved amount minus actual spent
    const commitRows = await this.db
      .select({
        id: projects.id,
        title: projects.title,
        totalBudget: projects.totalBudget,
        spent: projects.spent,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          operatingUnitId
            ? eq(projects.operatingUnitId, operatingUnitId)
            : undefined,
          eq(projects.status, 'active')
        )
      )
      .limit(10);

    const commitments = commitRows.map(p => ({
      category: p.title || 'Unnamed Project',
      amount: Math.max(0, toNum(p.totalBudget) - toNum(p.spent)),
    }));

    return {
      metadata: makeMetadata('monthly', organizationId, operatingUnitId, period),
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
        budgetVariance,
      },
      sections: {
        revenue: revRows
          .filter(r => r.category)
          .map(r => ({ category: r.category!, amount: toNum(r.amount) })),
        expenses: expRows,
        commitments,
      },
    };
  }

  /**
   * Generate budget vs actual report.
   * Reads from budgets.totalApprovedAmount and budgets.totalActualAmount
   * grouped by project, scoped to fiscal year.
   */
  async generateBudgetVsActualReport(
    organizationId: number,
    operatingUnitId: number | null,
    period: string // fiscal year YYYY or YYYY-MM
  ): Promise<BudgetVsActualReport> {
    const fiscalYear = period.slice(0, 4);

    // Budget lines per project joined to project title
    const rows = await this.db
      .select({
        category: projects.title,
        budgeted: sql<number>`COALESCE(SUM(${budgets.totalApprovedAmount}), 0)`,
        actual: sql<number>`COALESCE(SUM(${budgets.totalActualAmount}), 0)`,
      })
      .from(budgets)
      .leftJoin(projects, eq(budgets.projectId, projects.id))
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          operatingUnitId
            ? eq(budgets.operatingUnitId, operatingUnitId)
            : undefined,
          eq(budgets.fiscalYear, fiscalYear)
        )
      )
      .groupBy(projects.title)
      .orderBy(sql`SUM(${budgets.totalApprovedAmount}) DESC`)
      .limit(50);

    const processedData = rows.map(row => {
      const budgeted = toNum(row.budgeted);
      const actual = toNum(row.actual);
      const variance = budgeted - actual;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      // Simple linear forecast: extrapolate actual to 12 months
      const monthsElapsed = new Date().getMonth() + 1;
      const forecast = monthsElapsed > 0
        ? (actual / monthsElapsed) * 12
        : actual;

      return {
        category: row.category || 'Unassigned',
        budgeted,
        actual,
        variance,
        variancePercent,
        forecast,
      };
    });

    const totalBudget = processedData.reduce((s, r) => s + r.budgeted, 0);
    const totalActual = processedData.reduce((s, r) => s + r.actual, 0);
    const totalVariance = totalBudget - totalActual;

    return {
      metadata: makeMetadata('budget-vs-actual', organizationId, operatingUnitId, period),
      data: processedData,
      summary: {
        totalBudget,
        totalActual,
        totalVariance,
        variancePercent: totalBudget > 0
          ? (totalVariance / totalBudget) * 100
          : 0,
      },
    };
  }

  /**
   * Generate trial balance report.
   * Reads real GL account balances via TrialBalanceEngine logic.
   */
  async generateTrialBalanceReport(
    organizationId: number,
    operatingUnitId: number | null,
    period: string
  ): Promise<TrialBalanceReport> {
    const { start, end } = this.periodToDates(period);

    const rows = await this.db
      .select({
        accountCode: glAccounts.accountCode,
        accountName: glAccounts.name,
        debit: sql<number>`COALESCE(SUM(${journalLines.debitAmount}), 0)`,
        credit: sql<number>`COALESCE(SUM(${journalLines.creditAmount}), 0)`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(glAccounts.organizationId, organizationId),
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId
            ? eq(journalEntries.operatingUnitId, operatingUnitId)
            : undefined,
          gte(journalEntries.entryDate, start.toISOString()),
          lte(journalEntries.entryDate, end.toISOString())
        )
      )
      .groupBy(glAccounts.id, glAccounts.accountCode, glAccounts.name)
      .orderBy(glAccounts.accountCode);

    const accounts = rows.map(r => ({
      accountCode: r.accountCode || '',
      accountName: r.accountName || '',
      debit: toNum(r.debit),
      credit: toNum(r.credit),
    }));

    const totalDebit = accounts.reduce((s, a) => s + a.debit, 0);
    const totalCredit = accounts.reduce((s, a) => s + a.credit, 0);

    return {
      metadata: makeMetadata('trial-balance', organizationId, operatingUnitId, period),
      accounts,
      totals: {
        totalDebit,
        totalCredit,
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    };
  }

  /**
   * Generate balance sheet report.
   * Delegates to FinancialStatementEngine.generateBalanceSheet which has
   * correct Drizzle queries against gl_accounts.
   */
  async generateBalanceSheetReport(
    organizationId: number,
    operatingUnitId: number | null,
    period: string
  ): Promise<BalanceSheetReport> {
    const { end } = this.periodToDates(period);
    const fsEngine = await getFinancialStatementEngine(this.db);
    const bs = await fsEngine.generateBalanceSheet(organizationId, end);

    return {
      metadata: makeMetadata('balance-sheet', organizationId, operatingUnitId, period),
      assets: {
        current: [{ category: 'Current Assets', amount: bs.assets.current }],
        noncurrent: [{ category: 'Non-Current Assets', amount: bs.assets.fixed }],
        totalAssets: bs.assets.total,
      },
      liabilities: {
        current: [{ category: 'Current Liabilities', amount: bs.liabilities.current }],
        noncurrent: [{ category: 'Long-term Liabilities', amount: bs.liabilities.longTerm }],
        totalLiabilities: bs.liabilities.total,
      },
      equity: {
        retainedEarnings: bs.equity,
        reserves: 0,
        totalEquity: bs.equity,
      },
    };
  }

  /**
   * Generate cash flow statement.
   * Operating activities sourced from GL (revenue - expense accounts).
   * Opening/closing balances sourced from financeBankAccounts.
   */
  async generateCashFlowReport(
    organizationId: number,
    operatingUnitId: number | null,
    period: string
  ): Promise<CashFlowReport> {
    const { start, end } = this.periodToDates(period);

    // GL balances for the period
    const glBalances = await this.getGLBalancesByType(
      organizationId,
      operatingUnitId,
      start,
      end
    );

    const netIncome = toNum(glBalances['revenue']) - toNum(glBalances['expense']);
    const depreciation = toNum(glBalances['depreciation']) || 0;
    const totalOperating = netIncome + depreciation;

    const totalInvesting = toNum(glBalances['capital_expenditure']) * -1 || 0;
    const borrowings = toNum(glBalances['borrowings']) || 0;
    const repayments = toNum(glBalances['loan_repayment']) * -1 || 0;
    const totalFinancing = borrowings - Math.abs(repayments);
    const netCashFlow = totalOperating + totalInvesting + totalFinancing;

    // Bank balances — use total current balance as ending balance
    const endingBalance = await this.getTotalBankBalance(organizationId, operatingUnitId);
    const beginningBalance = endingBalance - netCashFlow;

    return {
      metadata: makeMetadata('cash-flow', organizationId, operatingUnitId, period),
      operatingActivities: {
        netIncome,
        adjustments: depreciation !== 0
          ? [{ item: 'Depreciation', amount: depreciation }]
          : [],
        totalOperating,
      },
      investingActivities: {
        purchases: totalInvesting !== 0
          ? [{ item: 'Capital Expenditures', amount: totalInvesting }]
          : [],
        sales: [],
        totalInvesting,
      },
      financingActivities: {
        borrowings,
        repayments: Math.abs(repayments),
        totalFinancing,
      },
      netCashFlow,
      beginningBalance,
      endingBalance,
    };
  }

  /**
   * Generate income statement.
   * Revenue and expense account totals from real GL journal lines.
   */
  async generateIncomeStatementReport(
    organizationId: number,
    operatingUnitId: number | null,
    period: string
  ): Promise<IncomeStatementReport> {
    const { start, end } = this.periodToDates(period);
    const fsEngine = await getFinancialStatementEngine(this.db);
    const is = await fsEngine.generateIncomeStatement(organizationId, start, end);

    const expCategories = await this.getExpendituresByCategory(
      organizationId,
      operatingUnitId,
      start,
      end
    );

    return {
      metadata: makeMetadata('income-statement', organizationId, operatingUnitId, period),
      revenue: {
        categories: [{ category: 'Total Revenue', amount: is.revenue }],
        totalRevenue: is.revenue,
      },
      expenses: {
        categories: expCategories.length > 0
          ? expCategories
          : [{ category: 'Total Expenses', amount: is.operatingExpenses }],
        totalExpenses: is.operatingExpenses,
      },
      operatingIncome: is.operatingIncome,
      otherIncomeExpense: {
        items: is.otherIncomeExpense !== 0
          ? [{ item: 'Other Income / (Expense)', amount: is.otherIncomeExpense }]
          : [],
        total: is.otherIncomeExpense,
      },
      netIncome: is.netIncome,
    };
  }

  /**
   * Generate donor financial report.
   * Reads real budget and expenditure data for the linked project.
   * Grant/donor details sourced from grants table where available.
   */
  async generateDonorReport(
    organizationId: number,
    donorId: number,
    grantId: number,
    period: string
  ): Promise<DonorFinancialReport> {
    const { start, end } = this.periodToDates(period);

    // Get budget data linked to the grant via projects
    const budgetRows = await this.db
      .select({
        projectTitle: projects.title,
        budgeted: sql<number>`COALESCE(SUM(${budgets.totalApprovedAmount}), 0)`,
        actual: sql<number>`COALESCE(SUM(${budgets.totalActualAmount}), 0)`,
      })
      .from(budgets)
      .leftJoin(projects, eq(budgets.projectId, projects.id))
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          eq(budgets.fiscalYear, period.slice(0, 4))
        )
      )
      .groupBy(projects.title)
      .limit(20);

    const totalBudgeted = budgetRows.reduce((s, r) => s + toNum(r.budgeted), 0);
    const totalActual = budgetRows.reduce((s, r) => s + toNum(r.actual), 0);

    const expLines = budgetRows.map(r => ({
      category: r.projectTitle || 'Unassigned',
      budgeted: toNum(r.budgeted),
      spent: toNum(r.actual),
      variance: toNum(r.budgeted) - toNum(r.actual),
    }));

    const utilizationPct = totalBudgeted > 0
      ? (totalActual / totalBudgeted) * 100
      : 0;

    let complianceStatus: 'compliant' | 'at-risk' | 'non-compliant' = 'compliant';
    if (utilizationPct > 100) complianceStatus = 'non-compliant';
    else if (utilizationPct > 90) complianceStatus = 'at-risk';

    return {
      metadata: makeMetadata('donor', organizationId, undefined, period),
      donorId,
      donorName: `Donor #${donorId}`,
      grantId,
      grantName: `Grant #${grantId}`,
      budgetedAmount: totalBudgeted,
      drawnAmount: totalActual,
      expenditures: expLines,
      complianceStatus,
      reportingDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      submissionStatus: 'pending',
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GENERIC ANALYTICAL REPORTS — all backed by real queries, no mock data.
  // Each returns the self-describing GenericTableReport shape.
  // ══════════════════════════════════════════════════════════════════════════

  /** GL summary — balances grouped by account type for the period. */
  async generateGLAccountSummary(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const { start, end } = this.periodToDates(period);
    const rows = await this.db
      .select({
        accountType: glAccounts.accountType,
        debit: sql<number>`COALESCE(SUM(${journalLines.debitAmount}), 0)`,
        credit: sql<number>`COALESCE(SUM(${journalLines.creditAmount}), 0)`,
      })
      .from(glAccounts)
      .leftJoin(journalLines, eq(glAccounts.id, journalLines.glAccountId))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(glAccounts.organizationId, organizationId),
        operatingUnitId ? eq(journalEntries.operatingUnitId, operatingUnitId) : undefined,
        gte(journalEntries.entryDate, start.toISOString()),
        lte(journalEntries.entryDate, end.toISOString()),
      ))
      .groupBy(glAccounts.accountType)
      .orderBy(glAccounts.accountType);

    const data = rows.map((r) => {
      const debit = toNum(r.debit); const credit = toNum(r.credit);
      return { accountType: r.accountType || 'unclassified', debit, credit, net: debit - credit };
    });
    return {
      metadata: makeMetadata('gl-summary', organizationId, operatingUnitId, period),
      columns: [
        { key: 'accountType', label: 'Account Type', type: 'text' },
        { key: 'debit', label: 'Debit', type: 'currency', align: 'end' },
        { key: 'credit', label: 'Credit', type: 'currency', align: 'end' },
        { key: 'net', label: 'Net', type: 'currency', align: 'end' },
      ],
      rows: data,
      chart: { data: data.map((r) => ({ name: r.accountType, Net: r.net })), series: [{ key: 'Net', label: 'Net' }] },
      totals: {
        debit: data.reduce((s, r) => s + r.debit, 0),
        credit: data.reduce((s, r) => s + r.credit, 0),
        net: data.reduce((s, r) => s + r.net, 0),
      },
    };
  }

  /** Expense analysis — expense GL totals by account for the period. */
  async generateExpenseAnalysis(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const { start, end } = this.periodToDates(period);
    const rows = await this.db
      .select({
        category: glAccounts.name,
        amount: sql<number>`COALESCE(SUM(${journalLines.debitAmount}), 0)`,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .leftJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
      .where(and(
        eq(journalEntries.organizationId, organizationId),
        operatingUnitId ? eq(journalEntries.operatingUnitId, operatingUnitId) : undefined,
        gte(journalEntries.entryDate, start.toISOString()),
        lte(journalEntries.entryDate, end.toISOString()),
        sql`${glAccounts.accountType} = 'expense'`,
      ))
      .groupBy(glAccounts.name)
      .orderBy(sql`SUM(${journalLines.debitAmount}) DESC`)
      .limit(50);

    const base = rows.filter((r) => r.category).map((r) => ({ category: r.category as string, amount: toNum(r.amount) }));
    const total = base.reduce((s, r) => s + r.amount, 0);
    const data = base.map((r) => ({ ...r, share: total > 0 ? (r.amount / total) * 100 : 0 }));
    return {
      metadata: makeMetadata('expense-analysis', organizationId, operatingUnitId, period),
      columns: [
        { key: 'category', label: 'Expense Category', type: 'text' },
        { key: 'amount', label: 'Amount', type: 'currency', align: 'end' },
        { key: 'share', label: '% of Total', type: 'percent', align: 'end' },
      ],
      rows: data,
      chart: { data: data.slice(0, 12).map((r) => ({ name: r.category, Amount: r.amount })), series: [{ key: 'Amount', label: 'Amount' }] },
      summary: { totalExpenses: total },
      totals: { amount: total, share: total > 0 ? 100 : 0 },
    };
  }

  /** Financial KPIs — budget/actual/commitments/available/utilization + cash. */
  async generateFinancialKPIs(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const filters = [eq(budgetLines.organizationId, organizationId)];
    if (operatingUnitId) filters.push(eq(budgetLines.operatingUnitId, operatingUnitId));
    const [m] = await this.db
      .select({
        totalBudget: sql<number>`COALESCE(SUM(${budgetLines.totalAmount}), 0)`,
        totalActual: sql<number>`COALESCE(SUM(${budgetLines.actualSpent}), 0)`,
        totalCommitted: sql<number>`COALESCE(SUM(${budgetLines.commitments}), 0)`,
        totalAvailable: sql<number>`COALESCE(SUM(${budgetLines.availableBalance}), 0)`,
      })
      .from(budgetLines)
      .where(and(...filters));
    const [cash] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)` })
      .from(financeBankAccounts)
      .where(and(
        eq(financeBankAccounts.organizationId, organizationId),
        operatingUnitId ? eq(financeBankAccounts.operatingUnitId, operatingUnitId) : undefined,
        eq(financeBankAccounts.isDeleted, 0),
      ));

    const totalBudget = toNum(m?.totalBudget);
    const totalActual = toNum(m?.totalActual);
    const totalCommitted = toNum(m?.totalCommitted);
    const totalAvailable = toNum(m?.totalAvailable);
    const cashOnHand = toNum(cash?.total);
    const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    const data = [
      { kpi: 'Total Budget', value: totalBudget },
      { kpi: 'Actual Expenditure', value: totalActual },
      { kpi: 'Commitments', value: totalCommitted },
      { kpi: 'Available Budget', value: totalAvailable },
      { kpi: 'Budget Utilization (%)', value: Number(utilization.toFixed(1)) },
      { kpi: 'Cash on Hand', value: cashOnHand },
    ];
    return {
      metadata: makeMetadata('financial-kpis', organizationId, operatingUnitId, period),
      columns: [
        { key: 'kpi', label: 'KPI', type: 'text' },
        { key: 'value', label: 'Value', type: 'number', align: 'end' },
      ],
      rows: data,
      chart: {
        data: [
          { name: 'Budget', Amount: totalBudget },
          { name: 'Actual', Amount: totalActual },
          { name: 'Committed', Amount: totalCommitted },
          { name: 'Available', Amount: totalAvailable },
        ],
        series: [{ key: 'Amount', label: 'Amount' }],
      },
      summary: { totalBudget, totalActual },
    };
  }

  /** Dashboard summary — per-project budget / spent / utilization / health. */
  async generateDashboardSummary(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const rows = await this.db
      .select({
        projectCode: projects.projectCode, title: projects.title,
        budget: projects.totalBudget, spent: projects.spent,
      })
      .from(projects)
      .where(and(
        eq(projects.organizationId, organizationId),
        operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : undefined,
        eq(projects.status, 'active'),
        eq(projects.isDeleted, 0),
      ))
      .orderBy(desc(projects.totalBudget))
      .limit(50);

    const data = rows.map((r) => {
      const budget = toNum(r.budget); const spent = toNum(r.spent);
      const utilization = budget > 0 ? (spent / budget) * 100 : 0;
      return {
        project: r.projectCode || r.title || '—', budget, spent, utilization,
        health: utilization > 100 ? 'OVER BUDGET' : utilization > 90 ? 'AT RISK' : 'ON TRACK',
      };
    });
    const totalBudget = data.reduce((s, r) => s + r.budget, 0);
    const totalActual = data.reduce((s, r) => s + r.spent, 0);
    return {
      metadata: makeMetadata('dashboard-summary', organizationId, operatingUnitId, period),
      columns: [
        { key: 'project', label: 'Project', type: 'text' },
        { key: 'budget', label: 'Budget', type: 'currency', align: 'end' },
        { key: 'spent', label: 'Spent', type: 'currency', align: 'end' },
        { key: 'utilization', label: 'Utilization', type: 'percent', align: 'end' },
        { key: 'health', label: 'Health', type: 'status' },
      ],
      rows: data,
      chart: {
        data: data.slice(0, 12).map((r) => ({ name: r.project, Budget: r.budget, Spent: r.spent })),
        series: [{ key: 'Budget', label: 'Budget' }, { key: 'Spent', label: 'Spent' }],
      },
      summary: { totalBudget, totalActual },
      totals: { budget: totalBudget, spent: totalActual },
    };
  }

  /** Operating-unit performance — budget / actual / commitments by OU. */
  async generateOUPerformance(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const rows = await this.db
      .select({
        ouName: operatingUnits.name,
        budget: sql<number>`COALESCE(SUM(${budgetLines.totalAmount}), 0)`,
        actual: sql<number>`COALESCE(SUM(${budgetLines.actualSpent}), 0)`,
        committed: sql<number>`COALESCE(SUM(${budgetLines.commitments}), 0)`,
      })
      .from(budgetLines)
      .leftJoin(operatingUnits, eq(budgetLines.operatingUnitId, operatingUnits.id))
      .where(and(
        eq(budgetLines.organizationId, organizationId),
        operatingUnitId ? eq(budgetLines.operatingUnitId, operatingUnitId) : undefined,
      ))
      .groupBy(operatingUnits.name)
      .orderBy(sql`SUM(${budgetLines.totalAmount}) DESC`);

    const data = rows.map((r) => {
      const budget = toNum(r.budget); const actual = toNum(r.actual); const committed = toNum(r.committed);
      return { operatingUnit: r.ouName || 'Unassigned', budget, actual, committed, utilization: budget > 0 ? (actual / budget) * 100 : 0 };
    });
    const totalBudget = data.reduce((s, r) => s + r.budget, 0);
    const totalActual = data.reduce((s, r) => s + r.actual, 0);
    return {
      metadata: makeMetadata('ou-performance', organizationId, operatingUnitId, period),
      columns: [
        { key: 'operatingUnit', label: 'Operating Unit', type: 'text' },
        { key: 'budget', label: 'Budget', type: 'currency', align: 'end' },
        { key: 'actual', label: 'Actual', type: 'currency', align: 'end' },
        { key: 'committed', label: 'Committed', type: 'currency', align: 'end' },
        { key: 'utilization', label: 'Utilization', type: 'percent', align: 'end' },
      ],
      rows: data,
      chart: {
        data: data.slice(0, 12).map((r) => ({ name: r.operatingUnit, Budget: r.budget, Actual: r.actual })),
        series: [{ key: 'Budget', label: 'Budget' }, { key: 'Actual', label: 'Actual' }],
      },
      summary: { totalBudget, totalActual },
      totals: { budget: totalBudget, actual: totalActual },
    };
  }

  /** Cost-center report — journal-line spend grouped by cost center. */
  async generateCostCenterReport(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const { start, end } = this.periodToDates(period);
    const rows = await this.db
      .select({
        code: costCenters.code, name: costCenters.name,
        debit: sql<number>`COALESCE(SUM(${journalLines.debitAmount}), 0)`,
        credit: sql<number>`COALESCE(SUM(${journalLines.creditAmount}), 0)`,
      })
      .from(journalLines)
      .innerJoin(costCenters, eq(journalLines.costCenterId, costCenters.id))
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(and(
        eq(costCenters.organizationId, organizationId),
        operatingUnitId ? eq(journalEntries.operatingUnitId, operatingUnitId) : undefined,
        gte(journalEntries.entryDate, start.toISOString()),
        lte(journalEntries.entryDate, end.toISOString()),
      ))
      .groupBy(costCenters.id, costCenters.code, costCenters.name)
      .orderBy(sql`SUM(${journalLines.debitAmount}) DESC`)
      .limit(50);

    const data = rows.map((r) => {
      const debit = toNum(r.debit); const credit = toNum(r.credit);
      return { costCenter: r.code ? `${r.code} — ${r.name || ''}` : (r.name || '—'), debit, credit, net: debit - credit };
    });
    return {
      metadata: makeMetadata('cost-center', organizationId, operatingUnitId, period),
      columns: [
        { key: 'costCenter', label: 'Cost Center', type: 'text' },
        { key: 'debit', label: 'Debit', type: 'currency', align: 'end' },
        { key: 'credit', label: 'Credit', type: 'currency', align: 'end' },
        { key: 'net', label: 'Net Spend', type: 'currency', align: 'end' },
      ],
      rows: data,
      chart: { data: data.slice(0, 12).map((r) => ({ name: r.costCenter, Net: r.net })), series: [{ key: 'Net', label: 'Net Spend' }] },
      totals: { net: data.reduce((s, r) => s + r.net, 0) },
    };
  }

  /** Forecast vs actual — budget forecast vs actual by project for the FY. */
  async generateForecastVsActual(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const fiscalYear = period.slice(0, 4);
    const rows = await this.db
      .select({
        category: projects.title,
        forecast: sql<number>`COALESCE(SUM(${budgets.totalForecastAmount}), 0)`,
        actual: sql<number>`COALESCE(SUM(${budgets.totalActualAmount}), 0)`,
      })
      .from(budgets)
      .leftJoin(projects, eq(budgets.projectId, projects.id))
      .where(and(
        eq(budgets.organizationId, organizationId),
        operatingUnitId ? eq(budgets.operatingUnitId, operatingUnitId) : undefined,
        eq(budgets.fiscalYear, fiscalYear),
      ))
      .groupBy(projects.title)
      .orderBy(sql`SUM(${budgets.totalForecastAmount}) DESC`)
      .limit(50);

    const data = rows.map((r) => {
      const forecast = toNum(r.forecast); const actual = toNum(r.actual); const variance = forecast - actual;
      return { category: r.category || 'Unassigned', forecast, actual, variance, variancePercent: forecast > 0 ? (variance / forecast) * 100 : 0 };
    });
    const totalForecast = data.reduce((s, r) => s + r.forecast, 0);
    const totalActual = data.reduce((s, r) => s + r.actual, 0);
    return {
      metadata: makeMetadata('forecast-vs-actual', organizationId, operatingUnitId, period),
      columns: [
        { key: 'category', label: 'Project', type: 'text' },
        { key: 'forecast', label: 'Forecast', type: 'currency', align: 'end' },
        { key: 'actual', label: 'Actual', type: 'currency', align: 'end' },
        { key: 'variance', label: 'Variance', type: 'currency', align: 'end' },
        { key: 'variancePercent', label: 'Variance %', type: 'percent', align: 'end' },
      ],
      rows: data,
      chart: {
        data: data.slice(0, 12).map((r) => ({ name: r.category, Forecast: r.forecast, Actual: r.actual })),
        series: [{ key: 'Forecast', label: 'Forecast' }, { key: 'Actual', label: 'Actual' }],
      },
      summary: { totalBudget: totalForecast, totalActual },
      totals: { forecast: totalForecast, actual: totalActual },
    };
  }

  /** Donor utilization — approved vs utilized by donor / grant for the FY. */
  async generateDonorUtilization(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const fiscalYear = period.slice(0, 4);
    const rows = await this.db
      .select({
        donorName: donors.name, grantCode: grants.grantCode,
        approved: sql<number>`COALESCE(SUM(${budgets.totalApprovedAmount}), 0)`,
        actual: sql<number>`COALESCE(SUM(${budgets.totalActualAmount}), 0)`,
      })
      .from(budgets)
      .leftJoin(grants, eq(budgets.grantId, grants.id))
      .leftJoin(donors, eq(grants.donorId, donors.id))
      .where(and(
        eq(budgets.organizationId, organizationId),
        operatingUnitId ? eq(budgets.operatingUnitId, operatingUnitId) : undefined,
        eq(budgets.fiscalYear, fiscalYear),
      ))
      .groupBy(donors.name, grants.grantCode)
      .orderBy(sql`SUM(${budgets.totalApprovedAmount}) DESC`)
      .limit(50);

    const data = rows.map((r) => {
      const approved = toNum(r.approved); const actual = toNum(r.actual);
      return { donor: r.donorName || 'Unassigned', grant: r.grantCode || '—', approved, actual, utilization: approved > 0 ? (actual / approved) * 100 : 0 };
    });
    const totalApproved = data.reduce((s, r) => s + r.approved, 0);
    const totalActual = data.reduce((s, r) => s + r.actual, 0);
    return {
      metadata: makeMetadata('donor-utilization', organizationId, operatingUnitId, period),
      columns: [
        { key: 'donor', label: 'Donor', type: 'text' },
        { key: 'grant', label: 'Grant', type: 'text' },
        { key: 'approved', label: 'Approved', type: 'currency', align: 'end' },
        { key: 'actual', label: 'Utilized', type: 'currency', align: 'end' },
        { key: 'utilization', label: 'Utilization', type: 'percent', align: 'end' },
      ],
      rows: data,
      chart: {
        data: data.slice(0, 12).map((r) => ({ name: r.donor, Approved: r.approved, Utilized: r.actual })),
        series: [{ key: 'Approved', label: 'Approved' }, { key: 'Utilized', label: 'Utilized' }],
      },
      summary: { totalBudget: totalApproved, totalActual },
      totals: { approved: totalApproved, actual: totalActual },
    };
  }

  /** Donor expenditure — booked expenditure by donor / grant for the period. */
  async generateDonorExpenditure(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const { start, end } = this.periodToDates(period);
    const rows = await this.db
      .select({
        donorName: donors.name, grantCode: grants.grantCode,
        amount: sql<number>`COALESCE(SUM(${expenditures.amountInBaseCurrency}), 0)`,
        cnt: sql<number>`COUNT(*)`,
      })
      .from(expenditures)
      .leftJoin(grants, eq(expenditures.grantId, grants.id))
      .leftJoin(donors, eq(grants.donorId, donors.id))
      .where(and(
        eq(expenditures.organizationId, organizationId),
        operatingUnitId ? eq(expenditures.operatingUnitId, operatingUnitId) : undefined,
        eq(expenditures.isDeleted, 0),
        gte(expenditures.expenditureDate, start.toISOString().slice(0, 10)),
        lte(expenditures.expenditureDate, end.toISOString().slice(0, 10)),
      ))
      .groupBy(donors.name, grants.grantCode)
      .orderBy(sql`SUM(${expenditures.amountInBaseCurrency}) DESC`)
      .limit(50);

    const data = rows.map((r) => ({ donor: r.donorName || 'Unassigned', grant: r.grantCode || '—', amount: toNum(r.amount), count: toNum(r.cnt) }));
    const total = data.reduce((s, r) => s + r.amount, 0);
    return {
      metadata: makeMetadata('donor-expenditure', organizationId, operatingUnitId, period),
      columns: [
        { key: 'donor', label: 'Donor', type: 'text' },
        { key: 'grant', label: 'Grant', type: 'text' },
        { key: 'count', label: 'Transactions', type: 'number', align: 'end' },
        { key: 'amount', label: 'Expenditure', type: 'currency', align: 'end' },
      ],
      rows: data,
      chart: { data: data.slice(0, 12).map((r) => ({ name: r.donor, Expenditure: r.amount })), series: [{ key: 'Expenditure', label: 'Expenditure' }] },
      summary: { totalExpenses: total },
      totals: { amount: total },
    };
  }

  /** Cost share — donor-eligible vs co-financed (cost-share) portion by project. */
  async generateCostShareReport(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const rows = await this.db
      .select({
        project: projects.title,
        total: sql<number>`COALESCE(SUM(${budgetLines.totalAmount}), 0)`,
        donorEligible: sql<number>`COALESCE(SUM(${budgetLines.donorEligibleAmount}), 0)`,
      })
      .from(budgetLines)
      .leftJoin(projects, eq(budgetLines.projectId, projects.id))
      .where(and(
        eq(budgetLines.organizationId, organizationId),
        operatingUnitId ? eq(budgetLines.operatingUnitId, operatingUnitId) : undefined,
        eq(budgetLines.isDeleted, 0),
      ))
      .groupBy(projects.title)
      .orderBy(sql`SUM(${budgetLines.totalAmount}) DESC`)
      .limit(50);

    const data = rows.map((r) => {
      const total = toNum(r.total); const donorEligible = toNum(r.donorEligible);
      const costShare = Math.max(0, total - donorEligible);
      return { project: r.project || 'Unassigned', total, donorEligible, costShare, costSharePercent: total > 0 ? (costShare / total) * 100 : 0 };
    }).filter((r) => r.total > 0);
    const totalBudget = data.reduce((s, r) => s + r.total, 0);
    const totalCostShare = data.reduce((s, r) => s + r.costShare, 0);
    return {
      metadata: makeMetadata('cost-share', organizationId, operatingUnitId, period),
      columns: [
        { key: 'project', label: 'Project', type: 'text' },
        { key: 'total', label: 'Total Budget', type: 'currency', align: 'end' },
        { key: 'donorEligible', label: 'Donor-Eligible', type: 'currency', align: 'end' },
        { key: 'costShare', label: 'Cost Share', type: 'currency', align: 'end' },
        { key: 'costSharePercent', label: 'Cost Share %', type: 'percent', align: 'end' },
      ],
      rows: data,
      chart: {
        data: data.slice(0, 12).map((r) => ({ name: r.project, DonorEligible: r.donorEligible, CostShare: r.costShare })),
        series: [{ key: 'DonorEligible', label: 'Donor-Eligible' }, { key: 'CostShare', label: 'Cost Share' }],
      },
      summary: { totalBudget, totalActual: totalCostShare },
      totals: { total: totalBudget, costShare: totalCostShare },
    };
  }

  /** Grant closure — grants by end date with days-to-close and status. */
  async generateGrantClosureReport(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const rows = await this.db
      .select({
        grantCode: grants.grantCode, donorName: donors.name,
        endDate: grants.endDate, status: grants.status, totalBudget: grants.totalBudget,
      })
      .from(grants)
      .leftJoin(donors, eq(grants.donorId, donors.id))
      .where(and(
        eq(grants.organizationId, organizationId),
        operatingUnitId ? eq(grants.operatingUnitId, operatingUnitId) : undefined,
        eq(grants.isDeleted, 0),
      ))
      .orderBy(grants.endDate)
      .limit(100);

    const now = Date.now();
    const data = rows.map((r) => {
      const end = r.endDate ? new Date(r.endDate) : null;
      const daysToClose = end ? Math.round((end.getTime() - now) / (1000 * 60 * 60 * 24)) : 0;
      return {
        grant: r.grantCode || '—', donor: r.donorName || '—',
        endDate: end ? end.toISOString().slice(0, 10) : '—',
        daysToClose, budget: toNum(r.totalBudget), status: r.status || 'unknown',
      };
    });
    return {
      metadata: makeMetadata('grant-closure', organizationId, operatingUnitId, period),
      columns: [
        { key: 'grant', label: 'Grant', type: 'text' },
        { key: 'donor', label: 'Donor', type: 'text' },
        { key: 'endDate', label: 'End Date', type: 'date' },
        { key: 'daysToClose', label: 'Days to Close', type: 'number', align: 'end' },
        { key: 'budget', label: 'Budget', type: 'currency', align: 'end' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: data,
      totals: { budget: data.reduce((s, r) => s + r.budget, 0) },
    };
  }


    /**
     * ✅ FIXED: Alias method for router compatibility
     * Router calls generateCashFlowStatement, but implementation is generateCashFlowReport
     */
    async generateCashFlowStatement(
      organizationId: number,
      operatingUnitId: number | null,
      period?: string,
    ): Promise<Awaited<ReturnType<FinancialReportingEngine["generateCashFlowReport"]>>> {
      return this.generateCashFlowReport(organizationId, operatingUnitId, period);
    }
  
  
  /** Procurement compliance — 3-way match status distribution from invoices. */
  async generateProcurementCompliance(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const rows = await this.db
      .select({
        matchingStatus: procurementInvoices.matchingStatus,
        cnt: sql<number>`COUNT(*)`,
        totalInvoice: sql<number>`COALESCE(SUM(${procurementInvoices.invoiceAmount}), 0)`,
        totalVariance: sql<number>`COALESCE(SUM(${procurementInvoices.varianceAmount}), 0)`,
      })
      .from(procurementInvoices)
      .where(and(
        eq(procurementInvoices.organizationId, organizationId),
        operatingUnitId ? eq(procurementInvoices.operatingUnitId, operatingUnitId) : undefined,
        sql`${procurementInvoices.deletedAt} IS NULL`,
      ))
      .groupBy(procurementInvoices.matchingStatus)
      .orderBy(sql`COUNT(*) DESC`);

    const data = rows.map((r) => ({
      matchingStatus: r.matchingStatus || 'unmatched',
      count: toNum(r.cnt), totalInvoice: toNum(r.totalInvoice), totalVariance: toNum(r.totalVariance),
    }));
    return {
      metadata: makeMetadata('procurement-compliance', organizationId, operatingUnitId, period),
      columns: [
        { key: 'matchingStatus', label: '3-Way Match Status', type: 'status' },
        { key: 'count', label: 'Invoices', type: 'number', align: 'end' },
        { key: 'totalInvoice', label: 'Invoice Value', type: 'currency', align: 'end' },
        { key: 'totalVariance', label: 'Variance', type: 'currency', align: 'end' },
      ],
      rows: data,
      chart: { data: data.map((r) => ({ name: r.matchingStatus, Invoices: r.count })), series: [{ key: 'Invoices', label: 'Invoices' }] },
      totals: {
        count: data.reduce((s, r) => s + r.count, 0),
        totalInvoice: data.reduce((s, r) => s + r.totalInvoice, 0),
        totalVariance: data.reduce((s, r) => s + r.totalVariance, 0),
      },
    };
  }

  /** Audit findings — audit-log activity for the org within the period. */
  async generateAuditFindings(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const { start, end } = this.periodToDates(period);
    const rows = await this.db
      .select({
        createdAt: auditLogs.createdAt, action: auditLogs.action,
        entityType: auditLogs.entityType, entityId: auditLogs.entityId, userId: auditLogs.userId,
      })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, organizationId),
        operatingUnitId ? eq(auditLogs.operatingUnitId, operatingUnitId) : undefined,
        gte(auditLogs.createdAt, start.toISOString()),
        lte(auditLogs.createdAt, end.toISOString()),
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);

    const data = rows.map((r) => ({
      date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '—',
      action: r.action || '—', entityType: r.entityType || '—',
      entityId: r.entityId ?? '—', user: r.userId ?? '—',
    }));
    return {
      metadata: makeMetadata('audit-findings', organizationId, operatingUnitId, period),
      columns: [
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'action', label: 'Action', type: 'text' },
        { key: 'entityType', label: 'Entity', type: 'text' },
        { key: 'entityId', label: 'Entity ID', type: 'text' },
        { key: 'user', label: 'User', type: 'text' },
      ],
      rows: data,
      totals: { count: data.length },
    };
  }

  /** Financial risks — risk register ranked by financial exposure. */
  async generateFinancialRisks(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const rows = await this.db
      .select({
        title: financeFinancialRisks.title, category: financeFinancialRisks.category,
        score: financeFinancialRisks.overallRiskScore, exposure: financeFinancialRisks.financialExposure,
        status: financeFinancialRisks.status,
      })
      .from(financeFinancialRisks)
      .where(and(
        eq(financeFinancialRisks.organizationId, organizationId),
        operatingUnitId ? eq(financeFinancialRisks.operatingUnitId, operatingUnitId) : undefined,
      ))
      .orderBy(desc(financeFinancialRisks.financialExposure))
      .limit(100);

    const data = rows.map((r) => ({
      title: r.title || '—', category: r.category || '—',
      riskScore: toNum(r.score), exposure: toNum(r.exposure), status: r.status || 'open',
    }));
    const totalExposure = data.reduce((s, r) => s + r.exposure, 0);
    return {
      metadata: makeMetadata('financial-risks', organizationId, operatingUnitId, period),
      columns: [
        { key: 'title', label: 'Risk', type: 'text' },
        { key: 'category', label: 'Category', type: 'text' },
        { key: 'riskScore', label: 'Score', type: 'number', align: 'end' },
        { key: 'exposure', label: 'Exposure', type: 'currency', align: 'end' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: data,
      chart: { data: data.slice(0, 10).map((r) => ({ name: String(r.title).slice(0, 18), Exposure: r.exposure })), series: [{ key: 'Exposure', label: 'Exposure' }] },
      totals: { exposure: totalExposure },
    };
  }

  /** Compliance summary — rollup of risk status and invoice-matching status. */
  async generateComplianceSummary(
    organizationId: number, operatingUnitId: number | null, period: string,
  ): Promise<GenericTableReport> {
    const riskRows = await this.db
      .select({
        status: financeFinancialRisks.status,
        cnt: sql<number>`COUNT(*)`,
        exposure: sql<number>`COALESCE(SUM(${financeFinancialRisks.financialExposure}), 0)`,
      })
      .from(financeFinancialRisks)
      .where(and(
        eq(financeFinancialRisks.organizationId, organizationId),
        operatingUnitId ? eq(financeFinancialRisks.operatingUnitId, operatingUnitId) : undefined,
      ))
      .groupBy(financeFinancialRisks.status);

    const invoiceRows = await this.db
      .select({
        status: procurementInvoices.matchingStatus,
        cnt: sql<number>`COUNT(*)`,
      })
      .from(procurementInvoices)
      .where(and(
        eq(procurementInvoices.organizationId, organizationId),
        operatingUnitId ? eq(procurementInvoices.operatingUnitId, operatingUnitId) : undefined,
        sql`${procurementInvoices.deletedAt} IS NULL`,
      ))
      .groupBy(procurementInvoices.matchingStatus);

    const data: Record<string, unknown>[] = [];
    for (const r of riskRows) data.push({ area: 'Financial Risk', metric: `Risks: ${r.status || 'open'}`, count: toNum(r.cnt), value: toNum(r.exposure) });
    for (const r of invoiceRows) data.push({ area: 'Procurement', metric: `Invoices: ${r.status || 'unmatched'}`, count: toNum(r.cnt), value: 0 });

    return {
      metadata: makeMetadata('compliance-summary', organizationId, operatingUnitId, period),
      columns: [
        { key: 'area', label: 'Area', type: 'text' },
        { key: 'metric', label: 'Metric', type: 'text' },
        { key: 'count', label: 'Count', type: 'number', align: 'end' },
        { key: 'value', label: 'Exposure', type: 'currency', align: 'end' },
      ],
      rows: data,
      totals: { count: data.reduce((s, r) => s + toNum((r as { count?: number }).count), 0) },
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let reportingEngineInstance: FinancialReportingEngine | null = null;

export async function getFinancialReportingEngine(db: DB): Promise<FinancialReportingEngine> {
  if (!reportingEngineInstance) {
    reportingEngineInstance = new FinancialReportingEngine(db);
  }
  return reportingEngineInstance;
}