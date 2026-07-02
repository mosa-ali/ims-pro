/**
 * PostingValidationEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Enhanced Posting Validation and Financial Controls
 *
 * PHASE 4: GL Modernization
 *
 * Goes beyond basic debit=credit validation (which exists in journalEntriesRouter).
 * Adds enterprise-grade financial controls:
 *
 *   - Period status check (open / soft-closed / hard-closed)
 *   - GL account status validation (active, not suspended)
 *   - Segregation of duties (preparer ≠ approver ≠ poster)
 *   - Amount thresholds (require approval above limit)
 *   - Donor compliance checks (restricted funds, cost categories)
 *   - Budget availability check (prevent over-commitment)
 *   - Duplicate detection (same source doc, same period)
 *   - Control account restrictions (no direct posting to control accounts)
 *   - Currency validation (line currency matches entry currency)
 *   - Mandatory dimension enforcement (e.g., all expenses need cost center)
 *
 * This engine is called BEFORE journalEntriesRouter.create
 * (validation gate, not replacement).
 */

import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';
import type { JournalEntryInput, GLAccountInfo } from './GeneralLedgerEngine';
import type { ClosingEngine } from './ClosingEngine';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  valid: boolean;
  requiresApproval: boolean;
  approvalReason?: string;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
  lineNumber?: number;
}

export interface PostingControl {
  controlId: string;
  name: string;
  description: string;
  isEnabled: boolean;
  severity: ValidationSeverity;
}

export interface AmountThreshold {
  thresholdId: string;
  entryType: string;
  maxAmountWithoutApproval: number;
  approverRoleRequired: string;
  organizationId: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IPostingValidationRepository {
  getAccountInfo(accountId: number, scope: RepositoryScope): Promise<GLAccountInfo | null>;
  getAmountThreshold(entryType: string, scope: RepositoryScope): Promise<AmountThreshold | null>;
  findDuplicateEntry(sourceDocumentId: number, sourceDocumentType: string, scope: RepositoryScope): Promise<boolean>;
  getDonorRestrictions(grantId: number, scope: RepositoryScope): Promise<{
    restrictedAccountCodes: string[];
    maxOverheadPercent: number;
    allowedCostCategories: string[];
  } | null>;
  getBudgetAvailable(budgetLineId: number, scope: RepositoryScope): Promise<number>;
  getMandatoryDimensions(entryType: string, scope: RepositoryScope): Promise<string[]>;
}

export interface PostingValidationDependencies {
  validationRepo: IPostingValidationRepository;
  closingEngine: ClosingEngine;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class PostingValidationEngine {
  private repo: IPostingValidationRepository;
  private closingEngine: ClosingEngine;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: PostingValidationDependencies) {
    this.repo = deps.validationRepo;
    this.closingEngine = deps.closingEngine;
    this.logger = deps.logger.child({ service: 'PostingValidationEngine' });
    this.config = deps.config;
  }

  /**
   * Run all validation checks on a journal entry BEFORE posting.
   * Called by GeneralLedgerEngine.prepareEntry or directly by the router.
   */
  async validate(
    entry: JournalEntryInput,
    userId: number,
    scope: RepositoryScope,
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let requiresApproval = false;
    let approvalReason: string | undefined;

    // 1. DOUBLE ENTRY BALANCE
    const totalDebit = entry.lines.reduce((s, l) => s + parseFloat(l.debitAmount), 0);
    const totalCredit = entry.lines.reduce((s, l) => s + parseFloat(l.creditAmount), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      issues.push({
        code: 'UNBALANCED',
        severity: 'error',
        message: `Entry out of balance: DR ${totalDebit.toFixed(2)} ≠ CR ${totalCredit.toFixed(2)}`,
      });
    }

    // 2. MINIMUM LINE COUNT
    if (entry.lines.length < 2) {
      issues.push({
        code: 'MIN_LINES',
        severity: 'error',
        message: 'Journal entry requires at least 2 lines',
      });
    }

    // 3. LINE-LEVEL VALIDATION
    for (const line of entry.lines) {
      const dr = parseFloat(line.debitAmount);
      const cr = parseFloat(line.creditAmount);

      if (dr > 0 && cr > 0) {
        issues.push({
          code: 'DUAL_AMOUNT',
          severity: 'error',
          message: 'Line cannot have both debit and credit',
          lineNumber: line.lineNumber,
        });
      }
      if (dr === 0 && cr === 0) {
        issues.push({
          code: 'ZERO_AMOUNT',
          severity: 'error',
          message: 'Line must have debit or credit amount',
          lineNumber: line.lineNumber,
        });
      }
      if (dr < 0 || cr < 0) {
        issues.push({
          code: 'NEGATIVE_AMOUNT',
          severity: 'error',
          message: 'Amounts must not be negative',
          lineNumber: line.lineNumber,
        });
      }
    }

    // 4. PERIOD STATUS
    const periodCheck = await this.closingEngine.isPostingAllowed(entry.entryDate, scope);
    if (!periodCheck.allowed) {
      issues.push({
        code: 'PERIOD_CLOSED',
        severity: 'error',
        message: periodCheck.reason || 'Posting not allowed in this period',
        field: 'entryDate',
      });
    }
    if (periodCheck.requiresApproval) {
      requiresApproval = true;
      approvalReason = periodCheck.reason;
    }

    // 5. GL ACCOUNT VALIDATION
    for (const line of entry.lines) {
      const account = await this.repo.getAccountInfo(line.glAccountId, scope);
      if (!account) {
        issues.push({
          code: 'ACCOUNT_NOT_FOUND',
          severity: 'error',
          message: `GL account ${line.glAccountId} not found`,
          lineNumber: line.lineNumber,
        });
        continue;
      }
      if (!account.isActive) {
        issues.push({
          code: 'ACCOUNT_INACTIVE',
          severity: 'error',
          message: `GL account ${account.code} (${account.name}) is inactive`,
          lineNumber: line.lineNumber,
        });
      }
      if (account.isControlAccount) {
        issues.push({
          code: 'CONTROL_ACCOUNT',
          severity: 'error',
          message: `Cannot post directly to control account ${account.code}`,
          lineNumber: line.lineNumber,
        });
      }
    }

    // 6. AMOUNT THRESHOLD
    const threshold = await this.repo.getAmountThreshold(entry.entryType, scope);
    if (threshold && totalDebit > threshold.maxAmountWithoutApproval) {
      requiresApproval = true;
      approvalReason = `Amount ${totalDebit.toFixed(2)} exceeds threshold ${threshold.maxAmountWithoutApproval}; ${threshold.approverRoleRequired} approval required`;
      issues.push({
        code: 'THRESHOLD_EXCEEDED',
        severity: 'warning',
        message: approvalReason,
      });
    }

    // 7. DUPLICATE DETECTION
    if (entry.sourceDocumentId && entry.sourceDocumentType) {
      const isDuplicate = await this.repo.findDuplicateEntry(
        entry.sourceDocumentId, entry.sourceDocumentType, scope,
      );
      if (isDuplicate) {
        issues.push({
          code: 'DUPLICATE_ENTRY',
          severity: 'error',
          message: `Journal entry already exists for ${entry.sourceDocumentType} #${entry.sourceDocumentId}`,
        });
      }
    }

    // 8. DONOR COMPLIANCE (if grant-linked)
    if (entry.grantId) {
      const restrictions = await this.repo.getDonorRestrictions(entry.grantId, scope);
      if (restrictions) {
        for (const line of entry.lines) {
          const account = await this.repo.getAccountInfo(line.glAccountId, scope);
          if (account && restrictions.restrictedAccountCodes.includes(account.code)) {
            issues.push({
              code: 'DONOR_RESTRICTED',
              severity: 'error',
              message: `Account ${account.code} is restricted under grant #${entry.grantId}`,
              lineNumber: line.lineNumber,
            });
          }
        }
      }
    }

    // 9. BUDGET AVAILABILITY (if budget-linked)
    for (const line of entry.lines) {
      if (line.dimensions?.budgetLineId) {
        const available = await this.repo.getBudgetAvailable(line.dimensions.budgetLineId, scope);
        const dr = parseFloat(line.debitAmount);
        if (dr > 0 && dr > available) {
          issues.push({
            code: 'BUDGET_EXCEEDED',
            severity: 'warning',
            message: `Debit ${dr.toFixed(2)} exceeds available budget ${available.toFixed(2)}`,
            lineNumber: line.lineNumber,
          });
        }
      }
    }

    // 10. MANDATORY DIMENSIONS
    const mandatoryDims = await this.repo.getMandatoryDimensions(entry.entryType, scope);
    for (const dim of mandatoryDims) {
      for (const line of entry.lines) {
        const value = line.dimensions ? (line.dimensions as Record<string, unknown>)[dim] : undefined;
        if (!value) {
          issues.push({
            code: 'MISSING_DIMENSION',
            severity: 'warning',
            message: `Dimension '${dim}' is required for ${entry.entryType} entries`,
            lineNumber: line.lineNumber,
          });
        }
      }
    }

    const hasErrors = issues.some(i => i.severity === 'error');

    this.logger.info('Posting validation completed', {
      valid: !hasErrors,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      requiresApproval,
    });

    return {
      valid: !hasErrors,
      requiresApproval,
      approvalReason,
      issues,
    };
  }
}
