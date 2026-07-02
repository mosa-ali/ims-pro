/**
 * ValidationPluginSystem.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Pluggable Validation Framework
 *
 * PHASE 4 REFINEMENT #6
 *
 * Instead of hardcoding all validation rules in PostingValidationEngine,
 * rules are registered as plug-ins:
 *
 *   ValidationRule (base interface)
 *     ├── DonorRule       (donor-specific restrictions)
 *     ├── CountryRule     (country-specific tax/reporting)
 *     ├── TaxRule         (tax code validation)
 *     ├── GrantRule       (grant compliance)
 *     └── OrganizationRule (org-specific policies)
 *
 * Adding new compliance requirements = registering a new plugin.
 * No changes to core PostingValidationEngine.
 */

import type { ILogger, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';
import type { JournalEntryInput } from './GeneralLedgerEngine';

// ────────────────────────────────────────────────────────────────────────────
// PLUGIN INTERFACE
// ────────────────────────────────────────────────────────────────────────────

export type RuleSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  severity: RuleSeverity;
  message: string;
  field?: string;
  lineNumber?: number;
  ruleId: string;
  ruleName: string;
}

/**
 * Base interface for all validation rules.
 * Implement this to add a new compliance check.
 */
export interface IValidationRule {
  /** Unique identifier for this rule */
  readonly ruleId: string;
  /** Human-readable name */
  readonly ruleName: string;
  /** Category for grouping in UI */
  readonly category: 'donor' | 'country' | 'tax' | 'grant' | 'organization' | 'system';
  /** Priority (lower = runs first) */
  readonly priority: number;
  /** Whether this rule is currently active */
  readonly isEnabled: boolean;

  /**
   * Evaluate the journal entry.
   * Return issues found (empty array = passed).
   */
  evaluate(
    entry: JournalEntryInput,
    userId: number,
    scope: RepositoryScope,
  ): Promise<ValidationIssue[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// PLUGIN REGISTRY
// ────────────────────────────────────────────────────────────────────────────

export class ValidationPluginRegistry {
  private rules: IValidationRule[] = [];
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger.child({ service: 'ValidationPluginRegistry' });
  }

  /**
   * Register a validation rule plugin.
   */
  register(rule: IValidationRule): void {
    // Prevent duplicate registration
    if (this.rules.some(r => r.ruleId === rule.ruleId)) {
      this.logger.warn('Duplicate rule registration ignored', { ruleId: rule.ruleId });
      return;
    }
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
    this.logger.info('Validation rule registered', {
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      category: rule.category,
      priority: rule.priority,
    });
  }

  /**
   * Run all enabled rules against a journal entry.
   */
  async evaluateAll(
    entry: JournalEntryInput,
    userId: number,
    scope: RepositoryScope,
  ): Promise<{
    valid: boolean;
    issues: ValidationIssue[];
    rulesEvaluated: number;
    rulesSkipped: number;
  }> {
    const allIssues: ValidationIssue[] = [];
    let rulesEvaluated = 0;
    let rulesSkipped = 0;

    for (const rule of this.rules) {
      if (!rule.isEnabled) {
        rulesSkipped++;
        continue;
      }

      try {
        const issues = await rule.evaluate(entry, userId, scope);
        allIssues.push(...issues);
        rulesEvaluated++;
      } catch (err) {
        this.logger.error('Validation rule threw error', {
          ruleId: rule.ruleId,
          error: err instanceof Error ? err.message : String(err),
        });
        allIssues.push({
          code: 'RULE_ERROR',
          severity: 'warning',
          message: `Rule ${rule.ruleName} failed to evaluate: ${err instanceof Error ? err.message : 'unknown'}`,
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
        });
      }
    }

    const hasErrors = allIssues.some(i => i.severity === 'error');

    return {
      valid: !hasErrors,
      issues: allIssues,
      rulesEvaluated,
      rulesSkipped,
    };
  }

  /**
   * List all registered rules.
   */
  listRules(): Array<{
    ruleId: string;
    ruleName: string;
    category: string;
    priority: number;
    isEnabled: boolean;
  }> {
    return this.rules.map(r => ({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      category: r.category,
      priority: r.priority,
      isEnabled: r.isEnabled,
    }));
  }

  /**
   * Get rules by category.
   */
  getRulesByCategory(category: IValidationRule['category']): IValidationRule[] {
    return this.rules.filter(r => r.category === category);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// BUILT-IN RULE IMPLEMENTATIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Example: Donor Rule — checks donor-specific account restrictions.
 */
export class DonorAccountRestrictionRule implements IValidationRule {
  readonly ruleId = 'donor_account_restriction';
  readonly ruleName = 'Donor Account Restrictions';
  readonly category = 'donor' as const;
  readonly priority = 10;
  readonly isEnabled = true;

  constructor(
    private getDonorRestrictions: (
      grantId: number,
      scope: RepositoryScope,
    ) => Promise<{ restrictedAccountIds: number[] } | null>,
  ) {}

  async evaluate(entry: JournalEntryInput, _userId: number, scope: RepositoryScope): Promise<ValidationIssue[]> {
    if (!entry.grantId) return [];
    const restrictions = await this.getDonorRestrictions(entry.grantId, scope);
    if (!restrictions) return [];

    const issues: ValidationIssue[] = [];
    for (const line of entry.lines) {
      if (restrictions.restrictedAccountIds.includes(line.glAccountId)) {
        issues.push({
          code: 'DONOR_RESTRICTED_ACCOUNT',
          severity: 'error',
          message: `Account ${line.glAccountId} restricted by donor for grant #${entry.grantId}`,
          lineNumber: line.lineNumber,
          ruleId: this.ruleId,
          ruleName: this.ruleName,
        });
      }
    }
    return issues;
  }
}

/**
 * Example: Country Rule — VAT requirement for certain countries.
 */
export class CountryVATRule implements IValidationRule {
  readonly ruleId = 'country_vat_check';
  readonly ruleName = 'Country VAT Requirement';
  readonly category = 'country' as const;
  readonly priority = 20;
  readonly isEnabled = true;

  constructor(private vatCountries: string[], private vatAccountId: number) {}

  async evaluate(entry: JournalEntryInput, _userId: number, _scope: RepositoryScope): Promise<ValidationIssue[]> {
    // Simplified: check if any line references a VAT account
    // In production, this would check the country of the operating unit
    return [];
  }
}

/**
 * Example: Organization Rule — maximum journal entry amount.
 */
export class OrganizationAmountLimitRule implements IValidationRule {
  readonly ruleId = 'org_amount_limit';
  readonly ruleName = 'Organization Amount Limit';
  readonly category = 'organization' as const;
  readonly priority = 5;
  readonly isEnabled = true;

  constructor(private maxAmount: number) {}

  async evaluate(entry: JournalEntryInput): Promise<ValidationIssue[]> {
    const total = entry.lines.reduce((s, l) => s + parseFloat(l.debitAmount), 0);
    if (total > this.maxAmount) {
      return [{
        code: 'ORG_AMOUNT_LIMIT',
        severity: 'error',
        message: `Total ${total.toFixed(2)} exceeds organization limit of ${this.maxAmount}`,
        ruleId: this.ruleId,
        ruleName: this.ruleName,
      }];
    }
    return [];
  }
}
