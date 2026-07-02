/**
 * DonorReportingEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Donor-Specific Report Computation
 *
 * PHASE 10: Enterprise Reporting
 *
 * Computes donor-specific financial reports with:
 *  - Donor budget format mapping (internal → donor categories)
 *  - Donor-specific eligibility rules
 *  - Overhead/indirect cost calculation per donor rules
 *  - Multi-currency presentation (donor currency + local + base)
 *  - Donor compliance validation before report generation
 *  - Annex generation (supporting schedules)
 *
 * Feeds into: DonorSubmissionPackageEngine for ZIP packages.
 * Renders via: ExportPlatform (Excel/PDF with donor templates).
 *
 * Supports: UNICEF, EU, AICS, DG ECHO, UN agencies, bilateral donors.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface DonorReportRequest {
  grantId: number;
  donorId: number;
  reportingPeriod: { start: string; end: string };
  reportType: 'interim' | 'final' | 'annual' | 'ad_hoc';
  donorCurrency: string;
  baseCurrency: string;
  exchangeRateDate: string;
  includeAnnexes: boolean;
  scope: RepositoryScope;
  requestedBy: number;
}

export interface DonorReport {
  reportId: string;
  grantId: number;
  grantName: string;
  donorId: number;
  donorName: string;
  reportType: string;
  reportingPeriod: { start: string; end: string };
  donorCurrency: string;
  baseCurrency: string;
  exchangeRate: number;

  // Main report sections
  budgetSummary: DonorBudgetSection;
  expenditureSummary: DonorExpenditureSection;
  complianceSummary: DonorComplianceSection;

  // Annexes
  annexes: DonorAnnex[];

  // Metadata
  generatedAt: string;
  generatedBy: number;
  organizationId: number;
}

export interface DonorBudgetSection {
  categories: Array<{
    donorCategoryCode: string;
    donorCategoryName: string;
    approvedBudget: number;
    revisedBudget: number;
    totalExpenditure: number;
    balance: number;
    utilizationPercent: number;
  }>;
  totalApproved: number;
  totalRevised: number;
  totalExpenditure: number;
  totalBalance: number;
  overallUtilization: number;
}

export interface DonorExpenditureSection {
  byCategory: Array<{
    categoryCode: string;
    categoryName: string;
    currentPeriod: number;
    previousPeriods: number;
    cumulativeTotal: number;
  }>;
  totalCurrentPeriod: number;
  totalPreviousPeriods: number;
  totalCumulative: number;
}

export interface DonorComplianceSection {
  overheadRate: number;
  maxOverheadAllowed: number;
  overheadCompliant: boolean;
  eligibilityIssues: string[];
  missingDocuments: string[];
  exchangeRateApplied: number;
  exchangeRateSource: string;
  allChecksPass: boolean;
}

export interface DonorAnnex {
  annexId: string;
  annexNumber: string;
  title: string;
  titleAR: string;
  titleIT: string;
  data: Record<string, unknown>[];
  columns: Array<{ key: string; label: string; labelAR: string; dataType: string }>;
}

export interface DonorCategoryMapping {
  mappingId: string;
  donorId: number;
  donorCategoryCode: string;
  donorCategoryName: string;
  internalAccountCodes: string[];
  internalBudgetLineIds: number[];
  overheadEligible: boolean;
  order: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IDonorReportRepository {
  getGrantInfo(grantId: number, scope: RepositoryScope): Promise<{
    grantName: string;
    donorId: number;
    donorName: string;
    currency: string;
    totalBudget: number;
    startDate: string;
    endDate: string;
    maxOverheadPercent: number;
  } | null>;

  getCategoryMappings(donorId: number, scope: RepositoryScope): Promise<DonorCategoryMapping[]>;

  getExpenditureByCategory(
    grantId: number,
    mappings: DonorCategoryMapping[],
    periodStart: string,
    periodEnd: string,
    scope: RepositoryScope,
  ): Promise<Array<{
    donorCategoryCode: string;
    currentPeriod: number;
    previousPeriods: number;
    cumulativeTotal: number;
  }>>;

  getBudgetByCategory(
    grantId: number,
    mappings: DonorCategoryMapping[],
    scope: RepositoryScope,
  ): Promise<Array<{
    donorCategoryCode: string;
    approvedBudget: number;
    revisedBudget: number;
  }>>;

  getTransactionList(
    grantId: number,
    periodStart: string,
    periodEnd: string,
    scope: RepositoryScope,
  ): Promise<Record<string, unknown>[]>;

  getExchangeRate(fromCurrency: string, toCurrency: string, asOfDate: string): Promise<number>;

  getOverheadAmount(grantId: number, scope: RepositoryScope): Promise<number>;
  getDirectCostAmount(grantId: number, scope: RepositoryScope): Promise<number>;
  getMissingDocuments(grantId: number, scope: RepositoryScope): Promise<string[]>;
}

export interface DonorReportDependencies {
  donorRepo: IDonorReportRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class DonorReportingEngine {
  private repo: IDonorReportRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: DonorReportDependencies) {
    this.repo = deps.donorRepo;
    this.logger = deps.logger.child({ service: 'DonorReportingEngine' });
    this.config = deps.config;
  }

  /**
   * Generate a complete donor financial report.
   */
  async generate(request: DonorReportRequest): Promise<DonorReport> {
    const grant = await this.repo.getGrantInfo(request.grantId, request.scope);
    if (!grant) throw new Error(`Grant ${request.grantId} not found`);

    const mappings = await this.repo.getCategoryMappings(request.donorId, request.scope);
    if (mappings.length === 0) {
      this.logger.warn('No donor category mappings found — using internal categories', {
        donorId: request.donorId,
      });
    }

    const exchangeRate = await this.repo.getExchangeRate(
      request.baseCurrency, request.donorCurrency, request.exchangeRateDate,
    );

    // Compute sections
    const budgetSummary = await this.computeBudgetSummary(request, mappings, exchangeRate);
    const expenditureSummary = await this.computeExpenditureSummary(request, mappings, exchangeRate);
    const complianceSummary = await this.computeComplianceSummary(request, grant.maxOverheadPercent);

    // Compute annexes
    const annexes: DonorAnnex[] = [];
    if (request.includeAnnexes) {
      annexes.push(await this.generateTransactionAnnex(request));
    }

    const report: DonorReport = {
      reportId: uuidv4(),
      grantId: request.grantId,
      grantName: grant.grantName,
      donorId: request.donorId,
      donorName: grant.donorName,
      reportType: request.reportType,
      reportingPeriod: request.reportingPeriod,
      donorCurrency: request.donorCurrency,
      baseCurrency: request.baseCurrency,
      exchangeRate,
      budgetSummary,
      expenditureSummary,
      complianceSummary,
      annexes,
      generatedAt: new Date().toISOString(),
      generatedBy: request.requestedBy,
      organizationId: request.scope.organizationId,
    };

    this.logger.info('Donor report generated', {
      reportId: report.reportId,
      donorName: grant.donorName,
      grantName: grant.grantName,
      reportType: request.reportType,
      categories: budgetSummary.categories.length,
      compliant: complianceSummary.allChecksPass,
    });

    return report;
  }

  // ── PRIVATE ──

  private async computeBudgetSummary(
    request: DonorReportRequest,
    mappings: DonorCategoryMapping[],
    exchangeRate: number,
  ): Promise<DonorBudgetSection> {
    const budgets = await this.repo.getBudgetByCategory(request.grantId, mappings, request.scope);
    const expenditures = await this.repo.getExpenditureByCategory(
      request.grantId, mappings, request.reportingPeriod.start, request.reportingPeriod.end, request.scope,
    );

    const expMap = new Map(expenditures.map(e => [e.donorCategoryCode, e]));

    const categories = budgets.map(b => {
      const exp = expMap.get(b.donorCategoryCode);
      const mapping = mappings.find(m => m.donorCategoryCode === b.donorCategoryCode);
      const totalExp = (exp?.cumulativeTotal || 0) * exchangeRate;
      const approved = b.approvedBudget * exchangeRate;
      const revised = b.revisedBudget * exchangeRate;

      return {
        donorCategoryCode: b.donorCategoryCode,
        donorCategoryName: mapping?.donorCategoryName || b.donorCategoryCode,
        approvedBudget: Math.round(approved * 100) / 100,
        revisedBudget: Math.round(revised * 100) / 100,
        totalExpenditure: Math.round(totalExp * 100) / 100,
        balance: Math.round((revised - totalExp) * 100) / 100,
        utilizationPercent: revised > 0 ? Math.round((totalExp / revised) * 100) : 0,
      };
    });

    const totalApproved = categories.reduce((s, c) => s + c.approvedBudget, 0);
    const totalRevised = categories.reduce((s, c) => s + c.revisedBudget, 0);
    const totalExpenditure = categories.reduce((s, c) => s + c.totalExpenditure, 0);

    return {
      categories,
      totalApproved: Math.round(totalApproved * 100) / 100,
      totalRevised: Math.round(totalRevised * 100) / 100,
      totalExpenditure: Math.round(totalExpenditure * 100) / 100,
      totalBalance: Math.round((totalRevised - totalExpenditure) * 100) / 100,
      overallUtilization: totalRevised > 0 ? Math.round((totalExpenditure / totalRevised) * 100) : 0,
    };
  }

  private async computeExpenditureSummary(
    request: DonorReportRequest,
    mappings: DonorCategoryMapping[],
    exchangeRate: number,
  ): Promise<DonorExpenditureSection> {
    const expenditures = await this.repo.getExpenditureByCategory(
      request.grantId, mappings, request.reportingPeriod.start, request.reportingPeriod.end, request.scope,
    );

    const byCategory = expenditures.map(e => {
      const mapping = mappings.find(m => m.donorCategoryCode === e.donorCategoryCode);
      return {
        categoryCode: e.donorCategoryCode,
        categoryName: mapping?.donorCategoryName || e.donorCategoryCode,
        currentPeriod: Math.round(e.currentPeriod * exchangeRate * 100) / 100,
        previousPeriods: Math.round(e.previousPeriods * exchangeRate * 100) / 100,
        cumulativeTotal: Math.round(e.cumulativeTotal * exchangeRate * 100) / 100,
      };
    });

    return {
      byCategory,
      totalCurrentPeriod: byCategory.reduce((s, c) => s + c.currentPeriod, 0),
      totalPreviousPeriods: byCategory.reduce((s, c) => s + c.previousPeriods, 0),
      totalCumulative: byCategory.reduce((s, c) => s + c.cumulativeTotal, 0),
    };
  }

  private async computeComplianceSummary(
    request: DonorReportRequest,
    maxOverheadPercent: number,
  ): Promise<DonorComplianceSection> {
    const overhead = await this.repo.getOverheadAmount(request.grantId, request.scope);
    const directCost = await this.repo.getDirectCostAmount(request.grantId, request.scope);
    const missingDocs = await this.repo.getMissingDocuments(request.grantId, request.scope);

    const overheadRate = directCost > 0 ? (overhead / directCost) * 100 : 0;
    const overheadCompliant = overheadRate <= maxOverheadPercent;

    const eligibilityIssues: string[] = [];
    if (!overheadCompliant) {
      eligibilityIssues.push(`Overhead rate ${overheadRate.toFixed(1)}% exceeds donor limit of ${maxOverheadPercent}%`);
    }

    const exchangeRate = await this.repo.getExchangeRate(
      request.baseCurrency, request.donorCurrency, request.exchangeRateDate,
    );

    return {
      overheadRate: Math.round(overheadRate * 10) / 10,
      maxOverheadAllowed: maxOverheadPercent,
      overheadCompliant,
      eligibilityIssues,
      missingDocuments: missingDocs,
      exchangeRateApplied: exchangeRate,
      exchangeRateSource: `Rate as of ${request.exchangeRateDate}`,
      allChecksPass: overheadCompliant && eligibilityIssues.length === 0 && missingDocs.length === 0,
    };
  }

  private async generateTransactionAnnex(request: DonorReportRequest): Promise<DonorAnnex> {
    const transactions = await this.repo.getTransactionList(
      request.grantId, request.reportingPeriod.start, request.reportingPeriod.end, request.scope,
    );

    return {
      annexId: uuidv4(),
      annexNumber: 'A',
      title: 'Transaction List',
      titleAR: 'قائمة المعاملات',
      titleIT: 'Elenco Transazioni',
      data: transactions,
      columns: [
        { key: 'entryDate', label: 'Date', labelAR: 'التاريخ', dataType: 'date' },
        { key: 'entryNumber', label: 'Reference', labelAR: 'المرجع', dataType: 'string' },
        { key: 'description', label: 'Description', labelAR: 'الوصف', dataType: 'string' },
        { key: 'vendorName', label: 'Vendor', labelAR: 'المورد', dataType: 'string' },
        { key: 'debitAmount', label: 'Debit', labelAR: 'مدين', dataType: 'currency' },
        { key: 'creditAmount', label: 'Credit', labelAR: 'دائن', dataType: 'currency' },
      ],
    };
  }
}
