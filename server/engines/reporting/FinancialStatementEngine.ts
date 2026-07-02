/**
 * FinancialStatementEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Financial Statement Generation (IPSAS / GAAP)
 *
 * PHASE 10: Enterprise Reporting
 *
 * Computes the three core financial statements:
 *  1. Balance Sheet (Statement of Financial Position)
 *  2. Income Statement (Statement of Financial Performance)
 *  3. Cash Flow Statement (Statement of Cash Flows)
 *
 * Plus NGO-specific:
 *  4. Statement of Changes in Net Assets
 *  5. Budget Execution Statement
 *
 * Each statement pulls from GL account balances via existing
 * GeneralLedgerEngine and produces structured data for the
 * Export Platform to render in Excel/PDF.
 *
 * Supports: IPSAS (humanitarian), GAAP, donor-specific formats.
 */

import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type StatementType =
  | 'balance_sheet'
  | 'income_statement'
  | 'cash_flow'
  | 'changes_in_net_assets'
  | 'budget_execution';

export type AccountingStandard = 'ipsas' | 'gaap' | 'donor_specific';

export interface StatementRequest {
  statementType: StatementType;
  standard: AccountingStandard;
  asOfDate: string;
  fiscalYearId: number;
  comparativePeriod?: {
    asOfDate: string;
    fiscalYearId: number;
  };
  currency: string;
  includeNotes: boolean;
  scope: RepositoryScope;
}

export interface FinancialStatement {
  statementId: string;
  statementType: StatementType;
  standard: AccountingStandard;
  title: string;
  titleAR: string;
  titleIT: string;
  asOfDate: string;
  fiscalYear: string;
  currency: string;
  sections: StatementSection[];
  totals: Record<string, number>;
  comparativeData?: {
    asOfDate: string;
    sections: StatementSection[];
    totals: Record<string, number>;
  };
  notes?: StatementNote[];
  generatedAt: string;
  organizationId: number;
}

export interface StatementSection {
  sectionId: string;
  title: string;
  titleAR: string;
  titleIT: string;
  order: number;
  indentLevel: number;
  lineItems: StatementLineItem[];
  subtotal: number;
  subtotalLabel: string;
}

export interface StatementLineItem {
  accountId?: number;
  accountCode?: string;
  description: string;
  descriptionAR?: string;
  descriptionIT?: string;
  currentAmount: number;
  comparativeAmount?: number;
  variance?: number;
  variancePercent?: number;
  indentLevel: number;
  isSubtotal: boolean;
  isBold: boolean;
}

export interface StatementNote {
  noteNumber: number;
  title: string;
  content: string;
  referencedAccounts: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IFinancialStatementRepository {
  getAccountBalances(
    asOfDate: string,
    fiscalYearId: number,
    accountTypes: string[],
    scope: RepositoryScope,
  ): Promise<Array<{
    accountId: number;
    accountCode: string;
    accountName: string;
    accountNameAR?: string;
    accountType: string;
    parentAccountId?: number;
    balance: number;
    debitBalance: number;
    creditBalance: number;
  }>>;

  getCashFlowData(
    fromDate: string,
    toDate: string,
    scope: RepositoryScope,
  ): Promise<{
    operatingActivities: Array<{ description: string; amount: number }>;
    investingActivities: Array<{ description: string; amount: number }>;
    financingActivities: Array<{ description: string; amount: number }>;
    openingCash: number;
    closingCash: number;
  }>;

  getNetAssetChanges(
    fromDate: string,
    toDate: string,
    scope: RepositoryScope,
  ): Promise<Array<{
    category: string;
    openingBalance: number;
    additions: number;
    deductions: number;
    closingBalance: number;
  }>>;

  getFiscalYearDates(fiscalYearId: number, scope: RepositoryScope): Promise<{
    startDate: string;
    endDate: string;
    yearLabel: string;
  } | null>;
}

export interface FinancialStatementDependencies {
  statementRepo: IFinancialStatementRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class FinancialStatementEngine {
  private repo: IFinancialStatementRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: FinancialStatementDependencies) {
    this.repo = deps.statementRepo;
    this.logger = deps.logger.child({ service: 'FinancialStatementEngine' });
    this.config = deps.config;
  }

  /**
   * Generate a financial statement.
   */
  async generate(request: StatementRequest): Promise<FinancialStatement> {
    switch (request.statementType) {
      case 'balance_sheet':
        return this.generateBalanceSheet(request);
      case 'income_statement':
        return this.generateIncomeStatement(request);
      case 'cash_flow':
        return this.generateCashFlowStatement(request);
      case 'changes_in_net_assets':
        return this.generateNetAssetChanges(request);
      case 'budget_execution':
        return this.generateBudgetExecution(request);
      default:
        throw new Error(`Unknown statement type: ${request.statementType}`);
    }
  }

  /**
   * Generate all statements for a fiscal year (annual report package).
   */
  async generateAnnualPackage(
    fiscalYearId: number,
    standard: AccountingStandard,
    currency: string,
    scope: RepositoryScope,
  ): Promise<FinancialStatement[]> {
    const fy = await this.repo.getFiscalYearDates(fiscalYearId, scope);
    if (!fy) throw new Error(`Fiscal year ${fiscalYearId} not found`);

    const baseRequest: Omit<StatementRequest, 'statementType'> = {
      standard,
      asOfDate: fy.endDate,
      fiscalYearId,
      currency,
      includeNotes: true,
      scope,
    };

    const statements = await Promise.all([
      this.generate({ ...baseRequest, statementType: 'balance_sheet' }),
      this.generate({ ...baseRequest, statementType: 'income_statement' }),
      this.generate({ ...baseRequest, statementType: 'cash_flow' }),
      this.generate({ ...baseRequest, statementType: 'changes_in_net_assets' }),
    ]);

    this.logger.info('Annual statement package generated', {
      fiscalYearId,
      statements: statements.length,
    });

    return statements;
  }

  // ── PRIVATE: BALANCE SHEET ──

  private async generateBalanceSheet(request: StatementRequest): Promise<FinancialStatement> {
    const assets = await this.repo.getAccountBalances(request.asOfDate, request.fiscalYearId, ['asset'], request.scope);
    const liabilities = await this.repo.getAccountBalances(request.asOfDate, request.fiscalYearId, ['liability'], request.scope);
    const equity = await this.repo.getAccountBalances(request.asOfDate, request.fiscalYearId, ['equity'], request.scope);

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equity.reduce((s, a) => s + a.balance, 0);

    const sections: StatementSection[] = [
      this.buildSection('assets', 'Assets', 'الأصول', 'Attività', 1, 0, assets),
      this.buildSection('liabilities', 'Liabilities', 'الالتزامات', 'Passività', 2, 0, liabilities),
      this.buildSection('equity', 'Net Assets / Equity', 'صافي الأصول / حقوق الملكية', 'Patrimonio Netto', 3, 0, equity),
    ];

    return this.buildStatement(request, 'balance_sheet',
      'Statement of Financial Position', 'بيان المركز المالي', 'Stato Patrimoniale',
      sections,
      { totalAssets, totalLiabilities, totalEquity, totalLiabilitiesAndEquity: totalLiabilities + totalEquity },
    );
  }

  // ── PRIVATE: INCOME STATEMENT ──

  private async generateIncomeStatement(request: StatementRequest): Promise<FinancialStatement> {
    const revenue = await this.repo.getAccountBalances(request.asOfDate, request.fiscalYearId, ['revenue'], request.scope);
    const expenses = await this.repo.getAccountBalances(request.asOfDate, request.fiscalYearId, ['expense'], request.scope);

    const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
    const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    const sections: StatementSection[] = [
      this.buildSection('revenue', 'Revenue / Income', 'الإيرادات', 'Ricavi', 1, 0, revenue),
      this.buildSection('expenses', 'Expenses', 'المصروفات', 'Costi', 2, 0, expenses),
    ];

    return this.buildStatement(request, 'income_statement',
      'Statement of Financial Performance', 'بيان الأداء المالي', 'Conto Economico',
      sections,
      { totalRevenue, totalExpenses, netIncome },
    );
  }

  // ── PRIVATE: CASH FLOW ──

  private async generateCashFlowStatement(request: StatementRequest): Promise<FinancialStatement> {
    const fy = await this.repo.getFiscalYearDates(request.fiscalYearId, request.scope);
    if (!fy) throw new Error('Fiscal year not found');

    const cashFlow = await this.repo.getCashFlowData(fy.startDate, request.asOfDate, request.scope);

    const opTotal = cashFlow.operatingActivities.reduce((s, a) => s + a.amount, 0);
    const invTotal = cashFlow.investingActivities.reduce((s, a) => s + a.amount, 0);
    const finTotal = cashFlow.financingActivities.reduce((s, a) => s + a.amount, 0);
    const netChange = opTotal + invTotal + finTotal;

    const sections: StatementSection[] = [
      {
        sectionId: 'operating', title: 'Operating Activities',
        titleAR: 'الأنشطة التشغيلية', titleIT: 'Attività Operative',
        order: 1, indentLevel: 0, subtotal: opTotal, subtotalLabel: 'Net Cash from Operations',
        lineItems: cashFlow.operatingActivities.map(a => ({
          description: a.description, currentAmount: a.amount,
          indentLevel: 1, isSubtotal: false, isBold: false,
        })),
      },
      {
        sectionId: 'investing', title: 'Investing Activities',
        titleAR: 'الأنشطة الاستثمارية', titleIT: 'Attività di Investimento',
        order: 2, indentLevel: 0, subtotal: invTotal, subtotalLabel: 'Net Cash from Investing',
        lineItems: cashFlow.investingActivities.map(a => ({
          description: a.description, currentAmount: a.amount,
          indentLevel: 1, isSubtotal: false, isBold: false,
        })),
      },
      {
        sectionId: 'financing', title: 'Financing Activities',
        titleAR: 'الأنشطة التمويلية', titleIT: 'Attività di Finanziamento',
        order: 3, indentLevel: 0, subtotal: finTotal, subtotalLabel: 'Net Cash from Financing',
        lineItems: cashFlow.financingActivities.map(a => ({
          description: a.description, currentAmount: a.amount,
          indentLevel: 1, isSubtotal: false, isBold: false,
        })),
      },
    ];

    return this.buildStatement(request, 'cash_flow',
      'Statement of Cash Flows', 'بيان التدفقات النقدية', 'Rendiconto Finanziario',
      sections,
      { operatingCashFlow: opTotal, investingCashFlow: invTotal, financingCashFlow: finTotal, netChange, openingCash: cashFlow.openingCash, closingCash: cashFlow.closingCash },
    );
  }

  // ── PRIVATE: NET ASSET CHANGES ──

  private async generateNetAssetChanges(request: StatementRequest): Promise<FinancialStatement> {
    const fy = await this.repo.getFiscalYearDates(request.fiscalYearId, request.scope);
    if (!fy) throw new Error('Fiscal year not found');

    const changes = await this.repo.getNetAssetChanges(fy.startDate, request.asOfDate, request.scope);

    const sections: StatementSection[] = [{
      sectionId: 'net_assets', title: 'Changes in Net Assets',
      titleAR: 'التغيرات في صافي الأصول', titleIT: 'Variazioni del Patrimonio Netto',
      order: 1, indentLevel: 0, subtotal: 0, subtotalLabel: '',
      lineItems: changes.map(c => ({
        description: c.category,
        currentAmount: c.closingBalance,
        indentLevel: 1, isSubtotal: false, isBold: false,
      })),
    }];

    const totalOpening = changes.reduce((s, c) => s + c.openingBalance, 0);
    const totalClosing = changes.reduce((s, c) => s + c.closingBalance, 0);

    return this.buildStatement(request, 'changes_in_net_assets',
      'Statement of Changes in Net Assets', 'بيان التغيرات في صافي الأصول', 'Variazioni del Patrimonio Netto',
      sections,
      { openingNetAssets: totalOpening, closingNetAssets: totalClosing, netChange: totalClosing - totalOpening },
    );
  }

  // ── PRIVATE: BUDGET EXECUTION ──

  private async generateBudgetExecution(request: StatementRequest): Promise<FinancialStatement> {
    // Budget execution uses expense accounts grouped by budget category
    const expenses = await this.repo.getAccountBalances(request.asOfDate, request.fiscalYearId, ['expense'], request.scope);

    const sections: StatementSection[] = [
      this.buildSection('budget_execution', 'Budget Execution', 'تنفيذ الميزانية', 'Esecuzione del Budget', 1, 0, expenses),
    ];

    const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);

    return this.buildStatement(request, 'budget_execution',
      'Budget Execution Statement', 'بيان تنفيذ الميزانية', 'Rendiconto dell\'Esecuzione del Budget',
      sections,
      { totalExpenses },
    );
  }

  // ── PRIVATE: HELPERS ──

  private buildSection(
    id: string, title: string, titleAR: string, titleIT: string,
    order: number, indent: number,
    accounts: Array<{ accountCode: string; accountName: string; accountNameAR?: string; balance: number }>,
  ): StatementSection {
    const lineItems: StatementLineItem[] = accounts.map(a => ({
      accountCode: a.accountCode,
      description: a.accountName,
      descriptionAR: a.accountNameAR,
      currentAmount: Math.round(a.balance * 100) / 100,
      indentLevel: indent + 1,
      isSubtotal: false,
      isBold: false,
    }));

    return {
      sectionId: id,
      title, titleAR, titleIT,
      order, indentLevel: indent,
      lineItems,
      subtotal: Math.round(accounts.reduce((s, a) => s + a.balance, 0) * 100) / 100,
      subtotalLabel: `Total ${title}`,
    };
  }

  private buildStatement(
    request: StatementRequest,
    type: StatementType,
    title: string, titleAR: string, titleIT: string,
    sections: StatementSection[],
    totals: Record<string, number>,
  ): FinancialStatement {
    // Round all totals
    const roundedTotals = Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    );

    this.logger.info('Financial statement generated', {
      type, asOfDate: request.asOfDate, sections: sections.length,
    });

    return {
      statementId: require('uuid').v4(),
      statementType: type,
      standard: request.standard,
      title, titleAR, titleIT,
      asOfDate: request.asOfDate,
      fiscalYear: String(request.fiscalYearId),
      currency: request.currency,
      sections,
      totals: roundedTotals,
      generatedAt: new Date().toISOString(),
      organizationId: request.scope.organizationId,
    };
  }
}
