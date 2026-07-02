/**
 * BudgetEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Enhanced Budget Engine
 *
 * PHASE 5: Budget Intelligence
 *
 * DOES NOT duplicate budgetsRouter logic (CRUD, approval, revision).
 * ADDS enterprise capabilities ON TOP:
 *
 *  - Multi-year budget planning (span multiple fiscal years)
 *  - Budget structure hierarchies (program → project → activity → line)
 *  - Version comparison (diff two budget versions)
 *  - Budget consolidation (roll up child budgets to parent)
 *  - Budget vs Actual analysis with variance
 *  - Cross-grant budget view (total picture across grants)
 *  - Donor budget alignment (map internal to donor format)
 *
 * All mutations flow through existing budgetsRouter.
 */

import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface BudgetSummary {
  budgetId: number;
  budgetCode: string;
  budgetTitle: string;
  fiscalYear: string;
  projectId: number;
  grantId?: number;
  status: string;
  versionNumber: number;
  currency: string;
  totalApproved: number;
  totalActual: number;
  totalCommitted: number;
  totalAvailable: number;
  utilizationPercent: number;
  periodStart: string;
  periodEnd: string;
}

export interface BudgetLineDetail {
  lineId: number;
  lineCode: string;
  description: string;
  categoryId?: number;
  categoryName?: string;
  accountId?: number;
  activityId?: number;
  totalAmount: number;
  actualSpent: number;
  commitments: number;
  availableBalance: number;
  donorEligibleAmount: number;
  utilizationPercent: number;
}

export interface BudgetVariance {
  lineId: number;
  lineCode: string;
  description: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'on_track' | 'over';
}

export interface BudgetVersionDiff {
  budgetId: number;
  fromVersion: number;
  toVersion: number;
  addedLines: BudgetLineDetail[];
  removedLines: BudgetLineDetail[];
  changedLines: Array<{
    lineId: number;
    lineCode: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  totalApprovedChange: number;
}

export interface MultiYearBudgetPlan {
  planId: string;
  organizationId: number;
  projectId: number;
  grantId?: number;
  planName: string;
  startYear: string;
  endYear: string;
  currency: string;
  yearlyBudgets: Array<{
    fiscalYear: string;
    budgetId?: number;
    totalPlanned: number;
    totalApproved: number;
    totalActual: number;
    status: string;
  }>;
  totalPlanned: number;
  totalApproved: number;
  totalActual: number;
}

export interface ConsolidatedBudget {
  organizationId: number;
  fiscalYear: string;
  currency: string;
  byProject: Array<{
    projectId: number;
    projectName: string;
    totalApproved: number;
    totalActual: number;
    totalAvailable: number;
  }>;
  byGrant: Array<{
    grantId: number;
    grantName: string;
    donorName: string;
    totalApproved: number;
    totalActual: number;
    totalAvailable: number;
  }>;
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    totalApproved: number;
    totalActual: number;
    totalAvailable: number;
  }>;
  grandTotalApproved: number;
  grandTotalActual: number;
  grandTotalAvailable: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IBudgetRepository {
  getBudgetSummary(budgetId: number, scope: RepositoryScope): Promise<BudgetSummary | null>;
  getBudgetLines(budgetId: number, scope: RepositoryScope): Promise<BudgetLineDetail[]>;
  getBudgetsByProject(projectId: number, scope: RepositoryScope): Promise<BudgetSummary[]>;
  getBudgetsByGrant(grantId: number, scope: RepositoryScope): Promise<BudgetSummary[]>;
  getBudgetsByFiscalYear(fiscalYear: string, scope: RepositoryScope): Promise<BudgetSummary[]>;
  getBudgetVersions(budgetCode: string, scope: RepositoryScope): Promise<BudgetSummary[]>;
  getConsolidatedByProject(fiscalYear: string, scope: RepositoryScope): Promise<ConsolidatedBudget['byProject']>;
  getConsolidatedByGrant(fiscalYear: string, scope: RepositoryScope): Promise<ConsolidatedBudget['byGrant']>;
  getConsolidatedByCategory(fiscalYear: string, scope: RepositoryScope): Promise<ConsolidatedBudget['byCategory']>;
  getActualsByLine(budgetId: number, scope: RepositoryScope): Promise<Array<{ lineId: number; actual: number }>>;
}

export interface BudgetEngineDependencies {
  budgetRepo: IBudgetRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class BudgetEngine {
  private repo: IBudgetRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: BudgetEngineDependencies) {
    this.repo = deps.budgetRepo;
    this.logger = deps.logger.child({ service: 'BudgetEngine' });
    this.config = deps.config;
  }

  /**
   * Get complete budget view with lines, utilisation, and variance.
   */
  async getBudgetView(budgetId: number, scope: RepositoryScope): Promise<{
    summary: BudgetSummary;
    lines: BudgetLineDetail[];
    variances: BudgetVariance[];
  }> {
    const summary = await this.repo.getBudgetSummary(budgetId, scope);
    if (!summary) throw new Error(`Budget ${budgetId} not found`);

    const lines = await this.repo.getBudgetLines(budgetId, scope);
    const actuals = await this.repo.getActualsByLine(budgetId, scope);

    const actualMap = new Map(actuals.map(a => [a.lineId, a.actual]));

    const variances: BudgetVariance[] = lines.map(line => {
      const actual = actualMap.get(line.lineId) || line.actualSpent;
      const variance = line.totalAmount - actual;
      const variancePercent = line.totalAmount > 0
        ? Math.round((variance / line.totalAmount) * 100)
        : 0;

      return {
        lineId: line.lineId,
        lineCode: line.lineCode,
        description: line.description,
        budgetedAmount: line.totalAmount,
        actualAmount: actual,
        variance,
        variancePercent,
        status: variancePercent > 10 ? 'under' : variancePercent < -5 ? 'over' : 'on_track',
      };
    });

    return { summary, lines, variances };
  }

  /**
   * Compare two budget versions and return differences.
   */
  async compareVersions(
    budgetCode: string,
    fromVersion: number,
    toVersion: number,
    scope: RepositoryScope,
  ): Promise<BudgetVersionDiff> {
    const versions = await this.repo.getBudgetVersions(budgetCode, scope);
    const fromBudget = versions.find(v => v.versionNumber === fromVersion);
    const toBudget = versions.find(v => v.versionNumber === toVersion);

    if (!fromBudget || !toBudget) {
      throw new Error(`Version ${!fromBudget ? fromVersion : toVersion} not found for ${budgetCode}`);
    }

    const fromLines = await this.repo.getBudgetLines(fromBudget.budgetId, scope);
    const toLines = await this.repo.getBudgetLines(toBudget.budgetId, scope);

    const fromMap = new Map(fromLines.map(l => [l.lineCode, l]));
    const toMap = new Map(toLines.map(l => [l.lineCode, l]));

    const addedLines = toLines.filter(l => !fromMap.has(l.lineCode));
    const removedLines = fromLines.filter(l => !toMap.has(l.lineCode));

    const changedLines: BudgetVersionDiff['changedLines'] = [];
    for (const [code, toLine] of toMap) {
      const fromLine = fromMap.get(code);
      if (!fromLine) continue;

      if (fromLine.totalAmount !== toLine.totalAmount) {
        changedLines.push({
          lineId: toLine.lineId,
          lineCode: code,
          field: 'totalAmount',
          oldValue: fromLine.totalAmount,
          newValue: toLine.totalAmount,
        });
      }
      if (fromLine.description !== toLine.description) {
        changedLines.push({
          lineId: toLine.lineId,
          lineCode: code,
          field: 'description',
          oldValue: fromLine.description,
          newValue: toLine.description,
        });
      }
    }

    this.logger.info('Budget version comparison', {
      budgetCode, fromVersion, toVersion,
      added: addedLines.length, removed: removedLines.length, changed: changedLines.length,
    });

    return {
      budgetId: toBudget.budgetId,
      fromVersion,
      toVersion,
      addedLines,
      removedLines,
      changedLines,
      totalApprovedChange: toBudget.totalApproved - fromBudget.totalApproved,
    };
  }

  /**
   * Build a multi-year budget plan view.
   */
  async getMultiYearView(
    projectId: number,
    startYear: string,
    endYear: string,
    scope: RepositoryScope,
  ): Promise<MultiYearBudgetPlan> {
    const allBudgets = await this.repo.getBudgetsByProject(projectId, scope);

    const startNum = parseInt(startYear);
    const endNum = parseInt(endYear);
    const yearlyBudgets: MultiYearBudgetPlan['yearlyBudgets'] = [];

    let totalPlanned = 0;
    let totalApproved = 0;
    let totalActual = 0;

    for (let year = startNum; year <= endNum; year++) {
      const fy = String(year);
      const yearBudgets = allBudgets.filter(b => b.fiscalYear === fy);
      const latest = yearBudgets.sort((a, b) => b.versionNumber - a.versionNumber)[0];

      const planned = latest?.totalApproved || 0;
      const approved = latest?.status === 'approved' ? latest.totalApproved : 0;
      const actual = latest?.totalActual || 0;

      yearlyBudgets.push({
        fiscalYear: fy,
        budgetId: latest?.budgetId,
        totalPlanned: planned,
        totalApproved: approved,
        totalActual: actual,
        status: latest?.status || 'not_created',
      });

      totalPlanned += planned;
      totalApproved += approved;
      totalActual += actual;
    }

    return {
      planId: `MYP-${projectId}-${startYear}-${endYear}`,
      organizationId: scope.organizationId,
      projectId,
      planName: `Multi-Year Plan ${startYear}-${endYear}`,
      startYear,
      endYear,
      currency: allBudgets[0]?.currency || 'USD',
      yearlyBudgets,
      totalPlanned,
      totalApproved,
      totalActual,
    };
  }

  /**
   * Consolidated budget across all projects/grants for a fiscal year.
   */
  async getConsolidatedBudget(
    fiscalYear: string,
    scope: RepositoryScope,
  ): Promise<ConsolidatedBudget> {
    const [byProject, byGrant, byCategory] = await Promise.all([
      this.repo.getConsolidatedByProject(fiscalYear, scope),
      this.repo.getConsolidatedByGrant(fiscalYear, scope),
      this.repo.getConsolidatedByCategory(fiscalYear, scope),
    ]);

    const grandTotalApproved = byProject.reduce((s, p) => s + p.totalApproved, 0);
    const grandTotalActual = byProject.reduce((s, p) => s + p.totalActual, 0);

    return {
      organizationId: scope.organizationId,
      fiscalYear,
      currency: 'USD',
      byProject,
      byGrant,
      byCategory,
      grandTotalApproved,
      grandTotalActual,
      grandTotalAvailable: grandTotalApproved - grandTotalActual,
    };
  }
}
