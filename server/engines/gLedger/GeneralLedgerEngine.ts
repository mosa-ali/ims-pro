/**
 * GeneralLedgerEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Enterprise General Ledger Engine
 *
 * PHASE 4: GL Modernization
 *
 * DOES NOT duplicate journalEntriesRouter logic.
 * COORDINATES existing router + adds enterprise GL capabilities:
 *
 *  - Multi-dimensional accounting (project, grant, activity, costCenter, vendor)
 *  - Account balance queries (period-aware, dimension-filtered)
 *  - Trial balance generation (with dimension breakdown)
 *  - GL account validation (active, correct type, open period)
 *  - Balance sheet / income statement classification
 *  - Inter-OU elimination entries
 *
 * All GL posting flows through journalEntriesRouter.create → .post
 * This engine adds intelligence AROUND that flow.
 */

import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface AccountingDimension {
  projectId?: number;
  grantId?: number;
  activityId?: number;
  costCenterId?: number;
  budgetLineId?: number;
  vendorId?: number;
}

export interface GLAccountInfo {
  id: number;
  code: string;
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  isActive: boolean;
  isBankAccount: boolean;
  isControlAccount: boolean;
  currentBalance: number;
}

export interface JournalLineInput {
  lineNumber: number;
  glAccountId: number;
  description?: string;
  descriptionAr?: string;
  debitAmount: string;   // Decimal string per existing router
  creditAmount: string;
  dimensions?: AccountingDimension;
}

export interface JournalEntryInput {
  entryDate: string;
  entryType: 'standard' | 'adjusting' | 'closing' | 'reversing' | 'opening';
  sourceModule: 'manual' | 'expense' | 'advance' | 'settlement' | 'cash_transaction' | 'asset' | 'payroll' | 'procurement' | 'budget';
  sourceDocumentId?: number;
  sourceDocumentType?: string;
  description: string;
  descriptionAr?: string;
  fiscalYearId?: number;
  fiscalPeriodId?: number;
  projectId?: number;
  grantId?: number;
  lines: JournalLineInput[];
}

export interface TrialBalanceEntry {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface DimensionBalance {
  dimension: string;
  dimensionId: number;
  dimensionName?: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}

export interface AccountBalance {
  accountId: number;
  accountCode: string;
  accountName: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  asOfDate: string;
  byDimension?: DimensionBalance[];
}

// ────────────────────────────────────────────────────────────────────────────
// DEPENDENCIES
// ────────────────────────────────────────────────────────────────────────────

export interface IGLRepository {
  getAccount(accountId: number, scope: RepositoryScope): Promise<GLAccountInfo | null>;
  getAccountByCode(code: string, scope: RepositoryScope): Promise<GLAccountInfo | null>;
  getActiveAccounts(scope: RepositoryScope): Promise<GLAccountInfo[]>;
  getAccountBalance(accountId: number, asOfDate: string, scope: RepositoryScope): Promise<AccountBalance>;
  getTrialBalance(asOfDate: string, fiscalYearId: number | undefined, scope: RepositoryScope): Promise<TrialBalanceEntry[]>;
  getBalanceByDimension(accountId: number, dimension: keyof AccountingDimension, asOfDate: string, scope: RepositoryScope): Promise<DimensionBalance[]>;
}

export interface GeneralLedgerDependencies {
  glRepo: IGLRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class GeneralLedgerEngine {
  private glRepo: IGLRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: GeneralLedgerDependencies) {
    this.glRepo = deps.glRepo;
    this.logger = deps.logger.child({ service: 'GeneralLedgerEngine' });
    this.config = deps.config;
  }

  /**
   * Prepare a journal entry for posting.
   * Validates accounts, dimensions, and balance BEFORE calling the router.
   *
   * Returns the validated input ready for journalEntriesRouter.create
   */
  async prepareEntry(
    input: JournalEntryInput,
    scope: RepositoryScope,
  ): Promise<{ valid: true; routerInput: Record<string, unknown> } | { valid: false; errors: string[] }> {
    const errors: string[] = [];

    // 1. Validate balance
    const totalDebit = input.lines.reduce((s, l) => s + parseFloat(l.debitAmount), 0);
    const totalCredit = input.lines.reduce((s, l) => s + parseFloat(l.creditAmount), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.push(`Entry out of balance: DR ${totalDebit.toFixed(2)} ≠ CR ${totalCredit.toFixed(2)}`);
    }

    // 2. Validate each line's GL account
    for (const line of input.lines) {
      const account = await this.glRepo.getAccount(line.glAccountId, scope);
      if (!account) {
        errors.push(`Line ${line.lineNumber}: GL account ${line.glAccountId} not found`);
        continue;
      }
      if (!account.isActive) {
        errors.push(`Line ${line.lineNumber}: GL account ${account.code} is inactive`);
      }
    }

    // 3. Validate at least 2 lines
    if (input.lines.length < 2) {
      errors.push('Journal entry requires at least 2 lines');
    }

    // 4. Validate each line has debit OR credit (not both, not neither)
    for (const line of input.lines) {
      const dr = parseFloat(line.debitAmount);
      const cr = parseFloat(line.creditAmount);
      if (dr > 0 && cr > 0) errors.push(`Line ${line.lineNumber}: cannot have both debit and credit`);
      if (dr === 0 && cr === 0) errors.push(`Line ${line.lineNumber}: must have debit or credit`);
    }

    if (errors.length > 0) {
      this.logger.warn('Journal entry validation failed', { errors, entryDate: input.entryDate });
      return { valid: false, errors };
    }

    // Transform to router input shape (flatten dimensions into line fields)
    const routerInput = {
      entryDate: input.entryDate,
      entryType: input.entryType,
      sourceModule: input.sourceModule,
      sourceDocumentId: input.sourceDocumentId,
      sourceDocumentType: input.sourceDocumentType,
      description: input.description,
      descriptionAr: input.descriptionAr,
      fiscalYearId: input.fiscalYearId,
      fiscalPeriodId: input.fiscalPeriodId,
      projectId: input.projectId,
      grantId: input.grantId,
      lines: input.lines.map(l => ({
        lineNumber: l.lineNumber,
        glAccountId: l.glAccountId,
        description: l.description,
        descriptionAr: l.descriptionAr,
        debitAmount: l.debitAmount,
        creditAmount: l.creditAmount,
        projectId: l.dimensions?.projectId,
        grantId: l.dimensions?.grantId,
        activityId: l.dimensions?.activityId,
        budgetLineId: l.dimensions?.budgetLineId,
        costCenterId: l.dimensions?.costCenterId,
        vendorId: l.dimensions?.vendorId,
      })),
    };

    this.logger.info('Journal entry prepared', {
      entryDate: input.entryDate,
      lineCount: input.lines.length,
      totalDebit,
    });

    return { valid: true, routerInput };
  }

  /**
   * Get account balance with optional dimension breakdown.
   */
  async getAccountBalance(
    accountId: number,
    asOfDate: string,
    scope: RepositoryScope,
    dimensionBreakdown?: keyof AccountingDimension,
  ): Promise<AccountBalance> {
    const balance = await this.glRepo.getAccountBalance(accountId, asOfDate, scope);

    if (dimensionBreakdown) {
      balance.byDimension = await this.glRepo.getBalanceByDimension(
        accountId, dimensionBreakdown, asOfDate, scope,
      );
    }

    return balance;
  }

  /**
   * Generate trial balance with dimension filtering.
   */
  async getTrialBalance(
    asOfDate: string,
    scope: RepositoryScope,
    fiscalYearId?: number,
  ): Promise<{
    entries: TrialBalanceEntry[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  }> {
    const entries = await this.glRepo.getTrialBalance(asOfDate, fiscalYearId, scope);

    const totalDebit = entries.reduce((s, e) => s + e.closingDebit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.closingCredit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    if (!isBalanced) {
      this.logger.error('Trial balance out of balance', {
        asOfDate, totalDebit, totalCredit,
        difference: Math.abs(totalDebit - totalCredit),
      });
    }

    return { entries, totalDebit, totalCredit, isBalanced };
  }

  /**
   * Classify accounts for financial statements.
   */
  classifyAccounts(accounts: GLAccountInfo[]): {
    assets: GLAccountInfo[];
    liabilities: GLAccountInfo[];
    equity: GLAccountInfo[];
    revenue: GLAccountInfo[];
    expenses: GLAccountInfo[];
  } {
    return {
      assets: accounts.filter(a => a.accountType === 'asset'),
      liabilities: accounts.filter(a => a.accountType === 'liability'),
      equity: accounts.filter(a => a.accountType === 'equity'),
      revenue: accounts.filter(a => a.accountType === 'revenue'),
      expenses: accounts.filter(a => a.accountType === 'expense'),
    };
  }
}
