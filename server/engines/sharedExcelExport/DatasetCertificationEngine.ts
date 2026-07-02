/**
 * DatasetCertificationEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Dataset Certification — Pre-Export Data Integrity
 *
 * ENTERPRISE REPORTING & DOCUMENT GENERATION PLATFORM
 * Enhancement #8
 *
 * Before export, automatically certifies the dataset:
 *  - Debits equal credits
 *  - Budget totals are correct
 *  - No orphan records
 *  - Exchange rates are available
 *  - Fiscal period is valid
 *  - No deleted references
 *  - Required donor fields present
 *  - Required supporting documents exist
 *  - Data matches organization/OU scope
 *
 * If certification fails → block export (unless user has override permission).
 *
 * Integration: Called by ReportExportOrchestrator BEFORE data fetch.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type CertificationStatus = 'passed' | 'failed' | 'warning' | 'overridden';
export type CheckSeverity = 'error' | 'warning' | 'info';

export interface CertificationCheck {
  checkId: string;
  name: string;
  description: string;
  category: 'financial_integrity' | 'referential_integrity' | 'data_completeness' | 'scope_validation' | 'donor_compliance';
  severity: CheckSeverity;
  /** Which report types this check applies to */
  applicableReports: string[];   // reportId patterns or '*'
}

export interface CertificationResult {
  certificationId: string;
  reportId: string;
  status: CertificationStatus;
  checksRun: number;
  checksPassed: number;
  checksFailed: number;
  checksWarning: number;
  results: CheckResult[];
  canExport: boolean;
  overrideRequired: boolean;
  overridePermission?: string;
  certifiedAt: string;
  certifiedBy: number;
  organizationId: number;
  operatingUnitId: number;
}

export interface CheckResult {
  checkId: string;
  checkName: string;
  category: string;
  severity: CheckSeverity;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────────
// CHECK INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Implement this to add a new certification check.
 * Register with DatasetCertificationEngine.
 */
export interface ICertificationCheck {
  readonly checkId: string;
  readonly name: string;
  readonly category: CertificationCheck['category'];
  readonly severity: CheckSeverity;
  readonly applicableReports: string[];

  execute(
    reportId: string,
    filters: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<CheckResult>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface ICertificationRepository {
  saveCertification(result: CertificationResult): Promise<void>;
  getCertification(certificationId: string): Promise<CertificationResult | null>;
  getLatestForExport(exportId: string): Promise<CertificationResult | null>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class DatasetCertificationEngine {
  private checks: ICertificationCheck[] = [];
  private repo: ICertificationRepository;
  private logger: ILogger;

  constructor(repo: ICertificationRepository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'DatasetCertification' });
  }

  /**
   * Register a certification check.
   */
  registerCheck(check: ICertificationCheck): void {
    this.checks.push(check);
    this.checks.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    this.logger.info('Certification check registered', {
      checkId: check.checkId,
      name: check.name,
      category: check.category,
    });
  }

  /**
   * Certify a dataset before export.
   * Returns certification result — if canExport=false, the orchestrator blocks.
   */
  async certify(
    reportId: string,
    filters: Record<string, unknown>,
    userId: number,
    scope: RepositoryScope,
  ): Promise<CertificationResult> {
    const applicableChecks = this.checks.filter(c =>
      c.applicableReports.includes('*') || c.applicableReports.includes(reportId),
    );

    const results: CheckResult[] = [];
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const check of applicableChecks) {
      try {
        const result = await check.execute(reportId, filters, scope);
        results.push(result);
        if (result.passed) passed++;
        else if (result.severity === 'error') failed++;
        else if (result.severity === 'warning') warnings++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          checkId: check.checkId,
          checkName: check.name,
          category: check.category,
          severity: check.severity,
          passed: false,
          message: `Check threw error: ${message}`,
        });
        if (check.severity === 'error') failed++;
      }
    }

    const canExport = failed === 0;
    const certification: CertificationResult = {
      certificationId: uuidv4(),
      reportId,
      status: failed > 0 ? 'failed' : warnings > 0 ? 'warning' : 'passed',
      checksRun: applicableChecks.length,
      checksPassed: passed,
      checksFailed: failed,
      checksWarning: warnings,
      results,
      canExport,
      overrideRequired: failed > 0,
      overridePermission: failed > 0 ? 'export.certification.override' : undefined,
      certifiedAt: new Date().toISOString(),
      certifiedBy: userId,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
    };

    await this.repo.saveCertification(certification);

    this.logger.info('Dataset certification completed', {
      reportId,
      status: certification.status,
      checksRun: applicableChecks.length,
      passed,
      failed,
      warnings,
      canExport,
    });

    return certification;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// BUILT-IN CHECKS
// ────────────────────────────────────────────────────────────────────────────

export class DebitsEqualCreditsCheck implements ICertificationCheck {
  readonly checkId = 'financial_debit_credit_balance';
  readonly name = 'Debits Equal Credits';
  readonly category = 'financial_integrity' as const;
  readonly severity = 'error' as const;
  readonly applicableReports = ['finance_trial_balance', 'finance_journal_entries', 'donor_grant_report'];

  constructor(private getTrialBalance: (scope: RepositoryScope) => Promise<{ totalDebit: number; totalCredit: number }>) {}

  async execute(_reportId: string, _filters: Record<string, unknown>, scope: RepositoryScope): Promise<CheckResult> {
    const { totalDebit, totalCredit } = await this.getTrialBalance(scope);
    const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return {
      checkId: this.checkId,
      checkName: this.name,
      category: this.category,
      severity: this.severity,
      passed: balanced,
      message: balanced
        ? `Balanced: DR ${totalDebit.toFixed(2)} = CR ${totalCredit.toFixed(2)}`
        : `OUT OF BALANCE: DR ${totalDebit.toFixed(2)} ≠ CR ${totalCredit.toFixed(2)}, difference: ${Math.abs(totalDebit - totalCredit).toFixed(2)}`,
      details: { totalDebit, totalCredit, difference: Math.abs(totalDebit - totalCredit) },
    };
  }
}

export class ExchangeRatesAvailableCheck implements ICertificationCheck {
  readonly checkId = 'exchange_rates_available';
  readonly name = 'Exchange Rates Available';
  readonly category = 'data_completeness' as const;
  readonly severity = 'error' as const;
  readonly applicableReports = ['*'];

  constructor(private checkRates: (currencies: string[], scope: RepositoryScope) => Promise<{ missing: string[] }>) {}

  async execute(_reportId: string, filters: Record<string, unknown>, scope: RepositoryScope): Promise<CheckResult> {
    const currencies = (filters.currencies as string[]) || [];
    if (currencies.length === 0) {
      return { checkId: this.checkId, checkName: this.name, category: this.category, severity: this.severity, passed: true, message: 'No multi-currency data — check skipped' };
    }

    const { missing } = await this.checkRates(currencies, scope);
    return {
      checkId: this.checkId,
      checkName: this.name,
      category: this.category,
      severity: this.severity,
      passed: missing.length === 0,
      message: missing.length === 0
        ? 'All exchange rates available'
        : `Missing exchange rates for: ${missing.join(', ')}`,
      details: { missing },
    };
  }
}

export class FiscalPeriodValidCheck implements ICertificationCheck {
  readonly checkId = 'fiscal_period_valid';
  readonly name = 'Fiscal Period Valid';
  readonly category = 'data_completeness' as const;
  readonly severity = 'error' as const;
  readonly applicableReports = ['finance_trial_balance', 'finance_journal_entries', 'budget_vs_actual'];

  constructor(private validatePeriod: (periodId: number, scope: RepositoryScope) => Promise<{ valid: boolean; reason?: string }>) {}

  async execute(_reportId: string, filters: Record<string, unknown>, scope: RepositoryScope): Promise<CheckResult> {
    const periodId = filters.fiscalPeriodId as number;
    if (!periodId) {
      return { checkId: this.checkId, checkName: this.name, category: this.category, severity: this.severity, passed: true, message: 'No specific fiscal period — check skipped' };
    }

    const { valid, reason } = await this.validatePeriod(periodId, scope);
    return {
      checkId: this.checkId,
      checkName: this.name,
      category: this.category,
      severity: this.severity,
      passed: valid,
      message: valid ? 'Fiscal period is valid and open' : `Fiscal period issue: ${reason}`,
    };
  }
}

export class ScopeValidationCheck implements ICertificationCheck {
  readonly checkId = 'scope_validation';
  readonly name = 'Organization/OU Scope Validation';
  readonly category = 'scope_validation' as const;
  readonly severity = 'error' as const;
  readonly applicableReports = ['*'];

  async execute(_reportId: string, _filters: Record<string, unknown>, scope: RepositoryScope): Promise<CheckResult> {
    const valid = scope.organizationId > 0 && scope.operatingUnitId > 0;
    return {
      checkId: this.checkId,
      checkName: this.name,
      category: this.category,
      severity: this.severity,
      passed: valid,
      message: valid
        ? `Scope valid: org=${scope.organizationId}, ou=${scope.operatingUnitId}`
        : 'Invalid scope: organizationId and operatingUnitId must be positive',
    };
  }
}
