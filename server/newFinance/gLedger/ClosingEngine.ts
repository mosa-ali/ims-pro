/**
 * ClosingEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Period Closing Engine
 *
 * PHASE 4: GL Modernization
 *
 * Manages fiscal period lifecycle:
 *   open → soft_closed → hard_closed
 *
 * Soft Close:
 *   - Warns users posting to this period
 *   - Requires manager approval for new entries
 *   - Allows corrections by authorized users
 *
 * Hard Close:
 *   - No new journal entries allowed in period
 *   - Cannot be reopened without CFO/admin override
 *   - Generates closing journal entries (revenue/expense → retained earnings)
 *   - Locks GL balances for reporting
 *
 * Uses existing fiscalPeriodLockingRouter pattern.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type PeriodStatus = 'open' | 'soft_closed' | 'hard_closed';

export interface FiscalPeriod {
  periodId: number;
  fiscalYearId: number;
  periodNumber: number;       // 1-12 (or 1-13 for 13-period accounting)
  periodName: string;         // "January 2026", "Q1 2026"
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  softClosedAt?: string;
  softClosedBy?: number;
  hardClosedAt?: string;
  hardClosedBy?: number;
  closingEntryId?: number;    // Journal entry that closes this period
  reopenedAt?: string;
  reopenedBy?: number;
  reopenReason?: string;
  organizationId: number;
  operatingUnitId: number;
}

export interface ClosingCheckResult {
  canClose: boolean;
  warnings: string[];
  blockers: string[];
  unbookedItems: number;
  draftEntries: number;
  unreconciledAccounts: number;
  pendingApprovals: number;
}

export interface ClosingJournalSummary {
  closingEntryId: number;
  revenueAccountsClosed: number;
  expenseAccountsClosed: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  retainedEarningsAccountId: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IClosingRepository {
  getPeriod(periodId: number, scope: RepositoryScope): Promise<FiscalPeriod | null>;
  getPeriodByDate(date: string, scope: RepositoryScope): Promise<FiscalPeriod | null>;
  listPeriods(fiscalYearId: number, scope: RepositoryScope): Promise<FiscalPeriod[]>;
  updatePeriodStatus(periodId: number, status: PeriodStatus, userId: number): Promise<void>;

  getDraftEntryCount(periodId: number, scope: RepositoryScope): Promise<number>;
  getPendingApprovalCount(periodId: number, scope: RepositoryScope): Promise<number>;
  getRevenueTotal(periodId: number, scope: RepositoryScope): Promise<number>;
  getExpenseTotal(periodId: number, scope: RepositoryScope): Promise<number>;
  getRetainedEarningsAccountId(scope: RepositoryScope): Promise<number | null>;

  recordClosingAction(action: ClosingAuditRecord): Promise<void>;
}

export interface ClosingAuditRecord {
  actionId: string;
  periodId: number;
  action: 'soft_close' | 'hard_close' | 'reopen';
  performedBy: number;
  performedAt: string;
  reason?: string;
  closingEntryId?: number;
  organizationId: number;
  operatingUnitId: number;
}

export interface ClosingEngineDependencies {
  closingRepo: IClosingRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ClosingEngine {
  private repo: IClosingRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: ClosingEngineDependencies) {
    this.repo = deps.closingRepo;
    this.logger = deps.logger.child({ service: 'ClosingEngine' });
    this.config = deps.config;
  }

  /**
   * Check if a period can be closed. Returns warnings and blockers.
   */
  async preCloseCheck(periodId: number, scope: RepositoryScope): Promise<ClosingCheckResult> {
    const period = await this.repo.getPeriod(periodId, scope);
    if (!period) throw new Error(`Period ${periodId} not found`);

    const warnings: string[] = [];
    const blockers: string[] = [];

    if (period.status === 'hard_closed') {
      blockers.push('Period is already hard-closed');
    }

    const draftEntries = await this.repo.getDraftEntryCount(periodId, scope);
    if (draftEntries > 0) {
      blockers.push(`${draftEntries} draft journal entries must be posted or deleted`);
    }

    const pendingApprovals = await this.repo.getPendingApprovalCount(periodId, scope);
    if (pendingApprovals > 0) {
      warnings.push(`${pendingApprovals} entries pending approval`);
    }

    const canClose = blockers.length === 0;

    this.logger.info('Pre-close check completed', {
      periodId, canClose,
      warnings: warnings.length,
      blockers: blockers.length,
    });

    return {
      canClose,
      warnings,
      blockers,
      unbookedItems: 0,
      draftEntries,
      unreconciledAccounts: 0,
      pendingApprovals,
    };
  }

  /**
   * Soft close a period.
   * Users can still post with manager approval.
   */
  async softClose(periodId: number, userId: number, scope: RepositoryScope): Promise<void> {
    const period = await this.repo.getPeriod(periodId, scope);
    if (!period) throw new Error(`Period ${periodId} not found`);
    if (period.status !== 'open') throw new Error(`Period must be open to soft-close (current: ${period.status})`);

    await this.repo.updatePeriodStatus(periodId, 'soft_closed', userId);

    await this.repo.recordClosingAction({
      actionId: uuidv4(),
      periodId,
      action: 'soft_close',
      performedBy: userId,
      performedAt: new Date().toISOString(),
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
    });

    this.logger.info('Period soft-closed', { periodId, userId });
  }

  /**
   * Hard close a period.
   * No new entries allowed. Generates closing journal entry.
   *
   * Returns the closing journal data ready for journalEntriesRouter.create.
   */
  async hardClose(
    periodId: number,
    userId: number,
    scope: RepositoryScope,
  ): Promise<{
    closingEntry: {
      entryDate: string;
      entryType: 'closing';
      sourceModule: 'manual';
      description: string;
      lines: Array<{
        lineNumber: number;
        glAccountId: number;
        description: string;
        debitAmount: string;
        creditAmount: string;
      }>;
    };
    summary: { totalRevenue: number; totalExpenses: number; netIncome: number };
  }> {
    const check = await this.preCloseCheck(periodId, scope);
    if (!check.canClose) {
      throw new Error(`Cannot hard-close period: ${check.blockers.join('; ')}`);
    }

    const period = await this.repo.getPeriod(periodId, scope);
    if (!period) throw new Error(`Period ${periodId} not found`);

    // Get revenue and expense totals for this period
    const totalRevenue = await this.repo.getRevenueTotal(periodId, scope);
    const totalExpenses = await this.repo.getExpenseTotal(periodId, scope);
    const netIncome = totalRevenue - totalExpenses;

    const retainedEarningsId = await this.repo.getRetainedEarningsAccountId(scope);
    if (!retainedEarningsId) throw new Error('Retained earnings account not configured');

    // Build closing journal entry lines
    // Close revenue accounts (debit revenue, credit retained earnings)
    // Close expense accounts (debit retained earnings, credit expense)
    const lines: Array<{
      lineNumber: number;
      glAccountId: number;
      description: string;
      debitAmount: string;
      creditAmount: string;
    }> = [];

    let lineNum = 1;

    if (totalRevenue > 0) {
      // Placeholder: in production, iterate each revenue account
      lines.push({
        lineNumber: lineNum++,
        glAccountId: retainedEarningsId,
        description: `Close revenue to retained earnings - ${period.periodName}`,
        debitAmount: '0.00',
        creditAmount: totalRevenue.toFixed(2),
      });
    }

    if (totalExpenses > 0) {
      lines.push({
        lineNumber: lineNum++,
        glAccountId: retainedEarningsId,
        description: `Close expenses to retained earnings - ${period.periodName}`,
        debitAmount: totalExpenses.toFixed(2),
        creditAmount: '0.00',
      });
    }

    // Net income to retained earnings
    if (netIncome !== 0) {
      lines.push({
        lineNumber: lineNum++,
        glAccountId: retainedEarningsId,
        description: `Net income transfer - ${period.periodName}`,
        debitAmount: netIncome > 0 ? '0.00' : Math.abs(netIncome).toFixed(2),
        creditAmount: netIncome > 0 ? netIncome.toFixed(2) : '0.00',
      });
    }

    // Update period status
    await this.repo.updatePeriodStatus(periodId, 'hard_closed', userId);

    await this.repo.recordClosingAction({
      actionId: uuidv4(),
      periodId,
      action: 'hard_close',
      performedBy: userId,
      performedAt: new Date().toISOString(),
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
    });

    this.logger.info('Period hard-closed', {
      periodId, userId, totalRevenue, totalExpenses, netIncome,
    });

    return {
      closingEntry: {
        entryDate: period.endDate,
        entryType: 'closing',
        sourceModule: 'manual',
        description: `Period closing entry - ${period.periodName}`,
        lines,
      },
      summary: { totalRevenue, totalExpenses, netIncome },
    };
  }

  /**
   * Reopen a closed period (requires CFO/admin).
   */
  async reopenPeriod(
    periodId: number,
    userId: number,
    reason: string,
    scope: RepositoryScope,
  ): Promise<void> {
    const period = await this.repo.getPeriod(periodId, scope);
    if (!period) throw new Error(`Period ${periodId} not found`);
    if (period.status === 'open') throw new Error('Period is already open');

    await this.repo.updatePeriodStatus(periodId, 'open', userId);

    await this.repo.recordClosingAction({
      actionId: uuidv4(),
      periodId,
      action: 'reopen',
      performedBy: userId,
      performedAt: new Date().toISOString(),
      reason,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
    });

    this.logger.warn('Period reopened', { periodId, userId, reason });
  }

  /**
   * Check if posting is allowed for a given date.
   */
  async isPostingAllowed(
    entryDate: string,
    scope: RepositoryScope,
  ): Promise<{ allowed: boolean; requiresApproval: boolean; reason?: string }> {
    const period = await this.repo.getPeriodByDate(entryDate, scope);
    if (!period) {
      return { allowed: false, requiresApproval: false, reason: 'No fiscal period found for date' };
    }

    switch (period.status) {
      case 'open':
        return { allowed: true, requiresApproval: false };
      case 'soft_closed':
        return { allowed: true, requiresApproval: true, reason: 'Period is soft-closed; manager approval required' };
      case 'hard_closed':
        return { allowed: false, requiresApproval: false, reason: 'Period is hard-closed; no entries allowed' };
      default:
        return { allowed: false, requiresApproval: false, reason: `Unknown period status: ${period.status}` };
    }
  }
}
