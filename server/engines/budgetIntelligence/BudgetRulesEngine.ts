/**
 * BudgetRulesEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Budget-Specific Configurable Rules Engine
 *
 * PHASE 5: Budget Intelligence
 *
 * Extends the Phase 4 FinancialRulesEngine with budget-specific rules:
 *
 *  - Reallocation limits (max % shift between categories)
 *  - Donor overhead caps (overhead ≤ X% of direct costs)
 *  - Category spending limits (no category exceeds Y% of total)
 *  - Variance tolerance (flag if actual deviates > Z% from budget)
 *  - Commitment-to-budget ratio limits
 *  - Cross-grant prohibition (no cross-subsidisation)
 *  - Approval thresholds (different by amount tier)
 *  - Temporal rules (spending must be proportional to elapsed time)
 *
 * Rules are stored in the database and evaluated at:
 *  - Budget line creation/update
 *  - Commitment creation
 *  - Payment processing
 *  - Budget reallocation
 *  - Period close review
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type BudgetRuleCategory =
  | 'reallocation'
  | 'donor_compliance'
  | 'spending_limit'
  | 'variance'
  | 'commitment'
  | 'temporal'
  | 'approval';

export type BudgetRuleTrigger =
  | 'on_line_change'
  | 'on_commitment'
  | 'on_payment'
  | 'on_reallocation'
  | 'on_period_close'
  | 'on_submission'
  | 'on_approval';

export interface BudgetRule {
  ruleId: string;
  name: string;
  description: string;
  category: BudgetRuleCategory;
  triggers: BudgetRuleTrigger[];
  isEnabled: boolean;
  priority: number;

  // Scope
  organizationId: number;
  operatingUnitId?: number;
  grantId?: number;
  donorId?: number;

  // Rule parameters
  parameters: Record<string, unknown>;

  // Actions
  action: 'block' | 'warn' | 'require_approval';
  actionMessage: string;

  // Audit
  version: number;
  createdBy: number;
  createdAt: string;
}

export interface BudgetRuleContext {
  budgetId: number;
  budgetLineId?: number;
  grantId?: number;
  donorId?: number;
  projectId?: number;
  amount?: number;
  categoryId?: number;
  fromLineId?: number;
  toLineId?: number;
  trigger: BudgetRuleTrigger;

  // Budget state
  totalApproved?: number;
  totalActual?: number;
  totalCommitted?: number;
  lineApproved?: number;
  lineActual?: number;
  elapsedPercent?: number;   // % of budget period elapsed
  overheadAmount?: number;
  directCostAmount?: number;
}

export interface BudgetRuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  action: BudgetRule['action'];
  message: string;
  details?: Record<string, unknown>;
}

export interface BudgetRulesEvaluation {
  trigger: BudgetRuleTrigger;
  budgetId: number;
  results: BudgetRuleResult[];
  blocked: boolean;
  warnings: string[];
  requiresApproval: boolean;
  rulesEvaluated: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IBudgetRuleRepository {
  save(rule: BudgetRule): Promise<void>;
  getById(ruleId: string): Promise<BudgetRule | null>;
  listActive(scope: RepositoryScope, trigger?: BudgetRuleTrigger): Promise<BudgetRule[]>;
  listByGrant(grantId: number, scope: RepositoryScope): Promise<BudgetRule[]>;
  update(ruleId: string, fields: Partial<BudgetRule>): Promise<void>;
}

export interface BudgetRulesEngineDependencies {
  ruleRepo: IBudgetRuleRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class BudgetRulesEngine {
  private repo: IBudgetRuleRepository;
  private logger: ILogger;

  constructor(deps: BudgetRulesEngineDependencies) {
    this.repo = deps.ruleRepo;
    this.logger = deps.logger.child({ service: 'BudgetRulesEngine' });
  }

  /**
   * Evaluate all applicable rules for a budget operation.
   */
  async evaluate(
    context: BudgetRuleContext,
    scope: RepositoryScope,
  ): Promise<BudgetRulesEvaluation> {
    const rules = await this.repo.listActive(scope, context.trigger);
    const results: BudgetRuleResult[] = [];
    let blocked = false;
    const warnings: string[] = [];
    let requiresApproval = false;

    // Filter rules by grant/donor if specified
    const applicableRules = rules.filter(r => {
      if (r.grantId && context.grantId && r.grantId !== context.grantId) return false;
      if (r.donorId && context.donorId && r.donorId !== context.donorId) return false;
      return true;
    });

    for (const rule of applicableRules) {
      const result = this.evaluateRule(rule, context);
      results.push(result);

      if (!result.passed) {
        switch (result.action) {
          case 'block':
            blocked = true;
            warnings.push(result.message);
            break;
          case 'warn':
            warnings.push(result.message);
            break;
          case 'require_approval':
            requiresApproval = true;
            warnings.push(result.message);
            break;
        }
      }
    }

    this.logger.info('Budget rules evaluated', {
      trigger: context.trigger,
      budgetId: context.budgetId,
      rulesEvaluated: applicableRules.length,
      blocked,
      warnings: warnings.length,
      requiresApproval,
    });

    return {
      trigger: context.trigger,
      budgetId: context.budgetId,
      results,
      blocked,
      warnings,
      requiresApproval,
      rulesEvaluated: applicableRules.length,
    };
  }

  /**
   * Create a new budget rule.
   */
  async createRule(
    input: Omit<BudgetRule, 'ruleId' | 'version' | 'createdAt'>,
  ): Promise<BudgetRule> {
    const rule: BudgetRule = {
      ...input,
      ruleId: uuidv4(),
      version: 1,
      createdAt: new Date().toISOString(),
    };
    await this.repo.save(rule);
    this.logger.info('Budget rule created', { ruleId: rule.ruleId, name: rule.name, category: rule.category });
    return rule;
  }

  // ── PRIVATE: RULE EVALUATION ──

  private evaluateRule(rule: BudgetRule, ctx: BudgetRuleContext): BudgetRuleResult {
    switch (rule.category) {
      case 'donor_compliance':
        return this.evaluateDonorCompliance(rule, ctx);
      case 'spending_limit':
        return this.evaluateSpendingLimit(rule, ctx);
      case 'variance':
        return this.evaluateVariance(rule, ctx);
      case 'reallocation':
        return this.evaluateReallocation(rule, ctx);
      case 'temporal':
        return this.evaluateTemporalRule(rule, ctx);
      case 'commitment':
        return this.evaluateCommitmentRule(rule, ctx);
      case 'approval':
        return this.evaluateApprovalRule(rule, ctx);
      default:
        return { ruleId: rule.ruleId, ruleName: rule.name, passed: true, action: rule.action, message: 'Rule category not implemented' };
    }
  }

  private evaluateDonorCompliance(rule: BudgetRule, ctx: BudgetRuleContext): BudgetRuleResult {
    const maxOverheadPercent = (rule.parameters.maxOverheadPercent as number) || 15;
    if (ctx.overheadAmount !== undefined && ctx.directCostAmount !== undefined && ctx.directCostAmount > 0) {
      const actualOverhead = (ctx.overheadAmount / ctx.directCostAmount) * 100;
      if (actualOverhead > maxOverheadPercent) {
        return {
          ruleId: rule.ruleId,
          ruleName: rule.name,
          passed: false,
          action: rule.action,
          message: `Overhead ${actualOverhead.toFixed(1)}% exceeds donor limit of ${maxOverheadPercent}%`,
          details: { actualOverhead, maxOverheadPercent },
        };
      }
    }
    return { ruleId: rule.ruleId, ruleName: rule.name, passed: true, action: rule.action, message: 'Donor compliance check passed' };
  }

  private evaluateSpendingLimit(rule: BudgetRule, ctx: BudgetRuleContext): BudgetRuleResult {
    const maxPercent = (rule.parameters.maxCategoryPercent as number) || 50;
    if (ctx.lineActual !== undefined && ctx.totalApproved !== undefined && ctx.totalApproved > 0) {
      const linePercent = (ctx.lineActual / ctx.totalApproved) * 100;
      if (linePercent > maxPercent) {
        return {
          ruleId: rule.ruleId,
          ruleName: rule.name,
          passed: false,
          action: rule.action,
          message: `Line spending ${linePercent.toFixed(1)}% exceeds limit of ${maxPercent}%`,
        };
      }
    }
    return { ruleId: rule.ruleId, ruleName: rule.name, passed: true, action: rule.action, message: 'Spending limit check passed' };
  }

  private evaluateVariance(rule: BudgetRule, ctx: BudgetRuleContext): BudgetRuleResult {
    const maxVariancePercent = (rule.parameters.maxVariancePercent as number) || 10;
    if (ctx.lineApproved !== undefined && ctx.lineActual !== undefined && ctx.lineApproved > 0) {
      const variance = ((ctx.lineActual - ctx.lineApproved) / ctx.lineApproved) * 100;
      if (Math.abs(variance) > maxVariancePercent) {
        return {
          ruleId: rule.ruleId,
          ruleName: rule.name,
          passed: false,
          action: rule.action,
          message: `Variance ${variance.toFixed(1)}% exceeds tolerance of ±${maxVariancePercent}%`,
        };
      }
    }
    return { ruleId: rule.ruleId, ruleName: rule.name, passed: true, action: rule.action, message: 'Variance within tolerance' };
  }

  private evaluateReallocation(rule: BudgetRule, ctx: BudgetRuleContext): BudgetRuleResult {
    const maxReallocationPercent = (rule.parameters.maxReallocationPercent as number) || 10;
    if (ctx.amount !== undefined && ctx.lineApproved !== undefined && ctx.lineApproved > 0) {
      const reallocationPercent = (ctx.amount / ctx.lineApproved) * 100;
      if (reallocationPercent > maxReallocationPercent) {
        return {
          ruleId: rule.ruleId,
          ruleName: rule.name,
          passed: false,
          action: rule.action,
          message: `Reallocation ${reallocationPercent.toFixed(1)}% exceeds limit of ${maxReallocationPercent}%`,
        };
      }
    }
    return { ruleId: rule.ruleId, ruleName: rule.name, passed: true, action: rule.action, message: 'Reallocation within limits' };
  }

  private evaluateTemporalRule(rule: BudgetRule, ctx: BudgetRuleContext): BudgetRuleResult {
    const maxDeviation = (rule.parameters.maxTemporalDeviationPercent as number) || 20;
    if (ctx.elapsedPercent !== undefined && ctx.totalActual !== undefined && ctx.totalApproved !== undefined && ctx.totalApproved > 0) {
      const expectedUtilization = ctx.elapsedPercent;
      const actualUtilization = (ctx.totalActual / ctx.totalApproved) * 100;
      const deviation = actualUtilization - expectedUtilization;

      if (Math.abs(deviation) > maxDeviation) {
        return {
          ruleId: rule.ruleId,
          ruleName: rule.name,
          passed: false,
          action: rule.action,
          message: `Spending ${deviation > 0 ? 'ahead' : 'behind'} schedule by ${Math.abs(deviation).toFixed(1)}% (tolerance: ±${maxDeviation}%)`,
          details: { expectedUtilization, actualUtilization, deviation },
        };
      }
    }
    return { ruleId: rule.ruleId, ruleName: rule.name, passed: true, action: rule.action, message: 'Spending on schedule' };
  }

  private evaluateCommitmentRule(rule: BudgetRule, ctx: BudgetRuleContext): BudgetRuleResult {
    const maxCommitmentPercent = (rule.parameters.maxCommitmentPercent as number) || 80;
    if (ctx.totalCommitted !== undefined && ctx.totalApproved !== undefined && ctx.totalApproved > 0) {
      const commitmentPercent = ((ctx.totalActual! + ctx.totalCommitted) / ctx.totalApproved) * 100;
      if (commitmentPercent > maxCommitmentPercent) {
        return {
          ruleId: rule.ruleId,
          ruleName: rule.name,
          passed: false,
          action: rule.action,
          message: `Total encumbrance ${commitmentPercent.toFixed(1)}% exceeds limit of ${maxCommitmentPercent}%`,
        };
      }
    }
    return { ruleId: rule.ruleId, ruleName: rule.name, passed: true, action: rule.action, message: 'Commitment within limits' };
  }

  private evaluateApprovalRule(rule: BudgetRule, ctx: BudgetRuleContext): BudgetRuleResult {
    const threshold = (rule.parameters.approvalThreshold as number) || 10000;
    if (ctx.amount !== undefined && ctx.amount > threshold) {
      return {
        ruleId: rule.ruleId,
        ruleName: rule.name,
        passed: false,
        action: 'require_approval',
        message: `Amount ${ctx.amount.toFixed(2)} exceeds approval threshold of ${threshold}`,
        details: { approverRole: rule.parameters.approverRole },
      };
    }
    return { ruleId: rule.ruleId, ruleName: rule.name, passed: true, action: rule.action, message: 'Within approval threshold' };
  }
}
