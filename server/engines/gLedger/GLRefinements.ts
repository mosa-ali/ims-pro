/**
 * GLRefinements.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Phase 4 Refinements #3, #4, #5
 *
 *  #3 — Detailed period closing (per-account, not aggregate)
 *  #4 — Immutable allocation history
 *  #5 — Template versioning (never overwrite)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ════════════════════════════════════════════════════════════════════════════
// #3  DETAILED PERIOD CLOSING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Per-account closing line.
 * Instead of aggregate revenue/expense totals, each account gets its own
 * closing line with full audit trail.
 */
export interface DetailedClosingLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: 'revenue' | 'expense';
  periodBalance: number;
  /** Debit amount for closing line (expenses close with credit, so closing debit = 0 for expenses) */
  closingDebit: string;
  /** Credit amount for closing line */
  closingCredit: string;
}

export interface DetailedClosingResult {
  periodId: number;
  periodName: string;
  closingDate: string;
  revenueAccounts: DetailedClosingLine[];
  expenseAccounts: DetailedClosingLine[];
  retainedEarningsAccountId: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  /** Complete journal entry with per-account lines */
  journalEntryLines: Array<{
    lineNumber: number;
    glAccountId: number;
    description: string;
    debitAmount: string;
    creditAmount: string;
  }>;
}

export interface IDetailedClosingRepository {
  /** Get all revenue accounts with their period balance */
  getRevenueAccountBalances(
    periodId: number,
    scope: RepositoryScope,
  ): Promise<Array<{ accountId: number; accountCode: string; accountName: string; balance: number }>>;

  /** Get all expense accounts with their period balance */
  getExpenseAccountBalances(
    periodId: number,
    scope: RepositoryScope,
  ): Promise<Array<{ accountId: number; accountCode: string; accountName: string; balance: number }>>;

  getRetainedEarningsAccountId(scope: RepositoryScope): Promise<number>;
}

/**
 * Generate detailed closing entries with per-account lines.
 */
export async function generateDetailedClosingEntry(
  periodId: number,
  periodName: string,
  closingDate: string,
  repo: IDetailedClosingRepository,
  scope: RepositoryScope,
  logger: ILogger,
): Promise<DetailedClosingResult> {
  const revenueBalances = await repo.getRevenueAccountBalances(periodId, scope);
  const expenseBalances = await repo.getExpenseAccountBalances(periodId, scope);
  const retainedEarningsId = await repo.getRetainedEarningsAccountId(scope);

  const lines: DetailedClosingResult['journalEntryLines'] = [];
  let lineNum = 1;

  // Close each revenue account individually: DR Revenue, CR Retained Earnings
  const revenueLines: DetailedClosingLine[] = [];
  let totalRevenue = 0;

  for (const acct of revenueBalances) {
    if (Math.abs(acct.balance) < 0.01) continue; // Skip zero-balance accounts
    totalRevenue += acct.balance;

    revenueLines.push({
      accountId: acct.accountId,
      accountCode: acct.accountCode,
      accountName: acct.accountName,
      accountType: 'revenue',
      periodBalance: acct.balance,
      closingDebit: acct.balance.toFixed(2),
      closingCredit: '0.00',
    });

    lines.push({
      lineNumber: lineNum++,
      glAccountId: acct.accountId,
      description: `Close ${acct.accountCode} ${acct.accountName} - ${periodName}`,
      debitAmount: acct.balance.toFixed(2), // Debit revenue (normally credit balance)
      creditAmount: '0.00',
    });
  }

  // Close each expense account individually: DR Retained Earnings, CR Expense
  const expenseLines: DetailedClosingLine[] = [];
  let totalExpenses = 0;

  for (const acct of expenseBalances) {
    if (Math.abs(acct.balance) < 0.01) continue;
    totalExpenses += acct.balance;

    expenseLines.push({
      accountId: acct.accountId,
      accountCode: acct.accountCode,
      accountName: acct.accountName,
      accountType: 'expense',
      periodBalance: acct.balance,
      closingDebit: '0.00',
      closingCredit: acct.balance.toFixed(2),
    });

    lines.push({
      lineNumber: lineNum++,
      glAccountId: acct.accountId,
      description: `Close ${acct.accountCode} ${acct.accountName} - ${periodName}`,
      debitAmount: '0.00',
      creditAmount: acct.balance.toFixed(2), // Credit expense (normally debit balance)
    });
  }

  // Net income to retained earnings
  const netIncome = totalRevenue - totalExpenses;
  lines.push({
    lineNumber: lineNum++,
    glAccountId: retainedEarningsId,
    description: `Net income to retained earnings - ${periodName}`,
    debitAmount: netIncome < 0 ? Math.abs(netIncome).toFixed(2) : '0.00',
    creditAmount: netIncome >= 0 ? netIncome.toFixed(2) : '0.00',
  });

  logger.info('Detailed closing generated', {
    periodId,
    revenueAccounts: revenueLines.length,
    expenseAccounts: expenseLines.length,
    totalRevenue,
    totalExpenses,
    netIncome,
    totalLines: lines.length,
  });

  return {
    periodId,
    periodName,
    closingDate,
    revenueAccounts: revenueLines,
    expenseAccounts: expenseLines,
    retainedEarningsAccountId: retainedEarningsId,
    totalRevenue,
    totalExpenses,
    netIncome,
    journalEntryLines: lines,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// #4  IMMUTABLE ALLOCATION HISTORY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Immutable record of an allocation execution.
 * Stored after each allocation run. Never modified.
 * Enables exact reproduction during audits.
 */
export interface AllocationHistoryRecord {
  historyId: string;
  ruleId: string;
  ruleVersion: number;
  executedAt: string;
  executedBy: number;
  organizationId: number;
  operatingUnitId: number;

  // Inputs
  sourceAmount: number;
  allocationMethod: string;
  allocationBasis: string;

  // Calculated results
  allocations: Array<{
    targetId: number;
    targetName: string;
    calculatedPercentage: number;
    allocatedAmount: number;
  }>;
  residualAmount: number;
  residualAssignedTo: number; // targetId that received residual

  // Output
  journalEntryId: number;
  journalEntryNumber: string;

  // Snapshot of rule at execution time
  ruleSnapshot: Record<string, unknown>;
}

export interface IAllocationHistoryRepository {
  append(record: AllocationHistoryRecord): Promise<void>;
  getByRule(ruleId: string, scope: RepositoryScope): Promise<AllocationHistoryRecord[]>;
  getByJournalEntry(journalEntryId: number): Promise<AllocationHistoryRecord | null>;
  getByPeriod(startDate: string, endDate: string, scope: RepositoryScope): Promise<AllocationHistoryRecord[]>;
}

/**
 * Record an allocation execution as an immutable history entry.
 */
export function createAllocationHistory(
  ruleId: string,
  ruleVersion: number,
  sourceAmount: number,
  allocations: Array<{ targetId: number; targetName: string; calculatedPercentage: number; allocatedAmount: number }>,
  residualAmount: number,
  journalEntryId: number,
  journalEntryNumber: string,
  executedBy: number,
  scope: RepositoryScope,
  ruleSnapshot: Record<string, unknown>,
): AllocationHistoryRecord {
  return {
    historyId: uuidv4(),
    ruleId,
    ruleVersion,
    executedAt: new Date().toISOString(),
    executedBy,
    organizationId: scope.organizationId,
    operatingUnitId: scope.operatingUnitId,
    sourceAmount,
    allocationMethod: (ruleSnapshot.allocationMethod as string) || 'unknown',
    allocationBasis: (ruleSnapshot.allocationBasis as string) || 'unknown',
    allocations,
    residualAmount,
    residualAssignedTo: allocations.length > 0 ? allocations[allocations.length - 1].targetId : 0,
    journalEntryId,
    journalEntryNumber,
    ruleSnapshot,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// #5  TEMPLATE VERSIONING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Versioned template record.
 * Templates are never overwritten — updates create new versions.
 * Historical journals remain linked to the version that generated them.
 */
export interface VersionedTemplate {
  templateId: string;       // Stable ID across versions
  version: number;          // 1, 2, 3, ...
  isLatest: boolean;        // Only one version is "latest"
  name: string;
  description: string;
  entryType: string;
  sourceModule: string;
  lines: Record<string, unknown>[];
  parameters: Record<string, unknown>[];
  changedBy: number;
  changedAt: string;
  changeReason?: string;
  organizationId: number;
  operatingUnitId: number;
}

export interface IVersionedTemplateRepository {
  /** Create first version of a template */
  createVersion(template: VersionedTemplate): Promise<void>;
  /** Get latest version */
  getLatest(templateId: string, scope: RepositoryScope): Promise<VersionedTemplate | null>;
  /** Get specific version */
  getVersion(templateId: string, version: number): Promise<VersionedTemplate | null>;
  /** List all versions of a template */
  listVersions(templateId: string): Promise<VersionedTemplate[]>;
  /** Mark previous versions as non-latest, save new version */
  saveNewVersion(template: VersionedTemplate): Promise<void>;
}

/**
 * Create a new version of a template.
 * Previous version is preserved; new version becomes "latest".
 */
export async function createTemplateVersion(
  templateId: string,
  updates: Partial<VersionedTemplate>,
  changedBy: number,
  changeReason: string,
  repo: IVersionedTemplateRepository,
  scope: RepositoryScope,
  logger: ILogger,
): Promise<VersionedTemplate> {
  const current = await repo.getLatest(templateId, scope);
  if (!current) throw new Error(`Template ${templateId} not found`);

  const newVersion: VersionedTemplate = {
    ...current,
    ...updates,
    version: current.version + 1,
    isLatest: true,
    changedBy,
    changedAt: new Date().toISOString(),
    changeReason,
  };

  await repo.saveNewVersion(newVersion);

  logger.info('Template version created', {
    templateId,
    previousVersion: current.version,
    newVersion: newVersion.version,
    changedBy,
    changeReason,
  });

  return newVersion;
}
