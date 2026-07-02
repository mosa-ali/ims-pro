/**
 * FinancialRulesEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Configurable Financial Rules Engine
 *
 * PHASE 4 — STRATEGIC ENHANCEMENT
 *
 * Replaces hardcoded business rules with configurable IF/THEN rules:
 *
 *   IF Grant = UNICEF AND CostCategory = Vehicle
 *   THEN Require Logistics Approval
 *
 *   IF Amount > 25,000
 *   THEN Require CFO Approval
 *
 *   IF Currency ≠ BaseCurrency
 *   THEN Run FX Validation
 *
 * Rules are stored in the database and can be modified by authorized
 * users without code changes or deployments.
 *
 * This engine works alongside the ValidationPluginSystem:
 *   - ValidationPluginSystem: code-based rules (compiled, fast)
 *   - FinancialRulesEngine: data-driven rules (configurable, flexible)
 *
 * Both are called during the GLPostingPipeline.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'starts_with'
  | 'is_null'
  | 'is_not_null';

export type ActionType =
  | 'require_approval'
  | 'block'
  | 'warn'
  | 'set_field'
  | 'add_validation'
  | 'trigger_workflow'
  | 'send_notification';

export type RuleStatus = 'active' | 'draft' | 'disabled' | 'archived';

export interface RuleCondition {
  field: string;               // e.g., "grantName", "amount", "currency", "costCategory"
  operator: ConditionOperator;
  value: unknown;              // e.g., "UNICEF", 25000, "USD", ["Vehicle", "Equipment"]
}

export interface RuleConditionGroup {
  /** 'all' = AND, 'any' = OR */
  logic: 'all' | 'any';
  conditions: RuleCondition[];
}

export interface RuleAction {
  type: ActionType;
  parameters: Record<string, unknown>;
  // e.g., { approverRole: "CFO" } or { message: "FX validation required" }
}

export interface FinancialRule {
  ruleId: string;
  name: string;
  description: string;
  category: string;          // "approval", "compliance", "validation", "notification"
  priority: number;          // Lower = evaluated first
  status: RuleStatus;

  // Conditions (when this rule applies)
  conditionGroup: RuleConditionGroup;

  // Actions (what happens when conditions match)
  actions: RuleAction[];

  // Scope
  organizationId: number;
  operatingUnitId?: number;  // Null = applies to all OUs
  grantId?: number;          // Null = applies to all grants
  donorId?: number;          // Null = applies to all donors

  // Validity
  effectiveFrom?: string;    // ISO date
  effectiveTo?: string;

  // Audit
  version: number;
  createdBy: number;
  createdAt: string;
  updatedBy?: number;
  updatedAt?: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  matchedConditions: string[];  // Human-readable conditions that matched
  actions: RuleAction[];        // Actions to execute
  evaluatedAt: string;
}

export interface RuleEngineResult {
  /** Did any rule block the operation? */
  blocked: boolean;
  /** Does any rule require approval? */
  requiresApproval: boolean;
  /** Approval role required (if any) */
  requiredApproverRole?: string;
  /** All warnings generated */
  warnings: string[];
  /** All matched rules with their results */
  matchedRules: RuleEvaluationResult[];
  /** Total rules evaluated */
  rulesEvaluated: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IFinancialRuleRepository {
  save(rule: FinancialRule): Promise<void>;
  getById(ruleId: string): Promise<FinancialRule | null>;
  listActive(scope: RepositoryScope): Promise<FinancialRule[]>;
  listByCategory(category: string, scope: RepositoryScope): Promise<FinancialRule[]>;
  update(ruleId: string, fields: Partial<FinancialRule>): Promise<void>;
  getVersionHistory(ruleId: string): Promise<FinancialRule[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class FinancialRulesEngine {
  private repo: IFinancialRuleRepository;
  private logger: ILogger;

  constructor(repo: IFinancialRuleRepository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'FinancialRulesEngine' });
  }

  // ── RULE MANAGEMENT ──

  async createRule(
    input: Omit<FinancialRule, 'ruleId' | 'version' | 'createdAt'>,
  ): Promise<FinancialRule> {
    const rule: FinancialRule = {
      ...input,
      ruleId: uuidv4(),
      version: 1,
      createdAt: new Date().toISOString(),
    };

    // Validate conditions
    if (rule.conditionGroup.conditions.length === 0) {
      throw new Error('Rule must have at least one condition');
    }
    if (rule.actions.length === 0) {
      throw new Error('Rule must have at least one action');
    }

    await this.repo.save(rule);
    this.logger.info('Financial rule created', {
      ruleId: rule.ruleId,
      name: rule.name,
      category: rule.category,
      conditions: rule.conditionGroup.conditions.length,
      actions: rule.actions.length,
    });
    return rule;
  }

  async updateRule(
    ruleId: string,
    updates: Partial<FinancialRule>,
    updatedBy: number,
  ): Promise<FinancialRule> {
    const existing = await this.repo.getById(ruleId);
    if (!existing) throw new Error(`Rule ${ruleId} not found`);

    const updated: Partial<FinancialRule> = {
      ...updates,
      version: existing.version + 1,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    await this.repo.update(ruleId, updated);
    this.logger.info('Financial rule updated', { ruleId, version: updated.version });
    return { ...existing, ...updated } as FinancialRule;
  }

  // ── EVALUATION ──

  /**
   * Evaluate all active rules against a context.
   *
   * Context is a flat object with all facts the rules can reference:
   * {
   *   amount: 30000,
   *   currency: "USD",
   *   baseCurrency: "USD",
   *   grantName: "UNICEF",
   *   costCategory: "Vehicle",
   *   entryType: "standard",
   *   donorName: "UNICEF",
   *   projectName: "Water Program",
   *   ...
   * }
   */
  async evaluate(
    context: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<RuleEngineResult> {
    const rules = await this.repo.listActive(scope);
    const now = new Date().toISOString();
    const nowDate = now.split('T')[0];

    const matchedRules: RuleEvaluationResult[] = [];
    let blocked = false;
    let requiresApproval = false;
    let requiredApproverRole: string | undefined;
    const warnings: string[] = [];

    for (const rule of rules) {
      // Check validity period
      if (rule.effectiveFrom && nowDate < rule.effectiveFrom) continue;
      if (rule.effectiveTo && nowDate > rule.effectiveTo) continue;

      // Evaluate conditions
      const { matched, matchedConditions } = this.evaluateConditions(
        rule.conditionGroup, context,
      );

      if (matched) {
        matchedRules.push({
          ruleId: rule.ruleId,
          ruleName: rule.name,
          matched: true,
          matchedConditions,
          actions: rule.actions,
          evaluatedAt: now,
        });

        // Process actions
        for (const action of rule.actions) {
          switch (action.type) {
            case 'block':
              blocked = true;
              warnings.push(`Blocked by rule "${rule.name}": ${action.parameters.message || 'Operation not allowed'}`);
              break;

            case 'require_approval':
              requiresApproval = true;
              requiredApproverRole = (action.parameters.approverRole as string) || requiredApproverRole;
              warnings.push(`Rule "${rule.name}" requires ${action.parameters.approverRole || 'manager'} approval`);
              break;

            case 'warn':
              warnings.push(`Warning from rule "${rule.name}": ${action.parameters.message || 'Review recommended'}`);
              break;

            case 'add_validation':
              warnings.push(`Additional validation: ${action.parameters.validationType || 'check required'}`);
              break;

            case 'trigger_workflow':
              this.logger.info('Rule triggered workflow', {
                ruleId: rule.ruleId,
                workflowType: action.parameters.workflowType,
              });
              break;

            case 'send_notification':
              this.logger.info('Rule triggered notification', {
                ruleId: rule.ruleId,
                notificationType: action.parameters.notificationType,
              });
              break;
          }
        }
      }
    }

    this.logger.info('Rules evaluated', {
      rulesEvaluated: rules.length,
      rulesMatched: matchedRules.length,
      blocked,
      requiresApproval,
    });

    return {
      blocked,
      requiresApproval,
      requiredApproverRole,
      warnings,
      matchedRules,
      rulesEvaluated: rules.length,
    };
  }

  /**
   * Explain why a specific rule matched or didn't match.
   * Useful for compliance officers and auditors.
   */
  async explain(
    ruleId: string,
    context: Record<string, unknown>,
  ): Promise<{
    ruleId: string;
    ruleName: string;
    matched: boolean;
    trace: Array<{
      condition: string;
      field: string;
      operator: string;
      expectedValue: unknown;
      actualValue: unknown;
      result: boolean;
    }>;
  }> {
    const rule = await this.repo.getById(ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found`);

    const trace: Array<{
      condition: string;
      field: string;
      operator: string;
      expectedValue: unknown;
      actualValue: unknown;
      result: boolean;
    }> = [];

    let allMatch = rule.conditionGroup.logic === 'all';
    let anyMatch = false;

    for (const cond of rule.conditionGroup.conditions) {
      const actual = context[cond.field];
      const result = this.evaluateCondition(cond, actual);

      trace.push({
        condition: `${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`,
        field: cond.field,
        operator: cond.operator,
        expectedValue: cond.value,
        actualValue: actual,
        result,
      });

      if (rule.conditionGroup.logic === 'all' && !result) allMatch = false;
      if (result) anyMatch = true;
    }

    const matched = rule.conditionGroup.logic === 'all' ? allMatch : anyMatch;

    return { ruleId: rule.ruleId, ruleName: rule.name, matched, trace };
  }

  // ── PRIVATE ──

  private evaluateConditions(
    group: RuleConditionGroup,
    context: Record<string, unknown>,
  ): { matched: boolean; matchedConditions: string[] } {
    const matchedConditions: string[] = [];
    const results: boolean[] = [];

    for (const cond of group.conditions) {
      const actual = context[cond.field];
      const result = this.evaluateCondition(cond, actual);
      results.push(result);
      if (result) {
        matchedConditions.push(`${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`);
      }
    }

    const matched = group.logic === 'all'
      ? results.every(r => r)
      : results.some(r => r);

    return { matched, matchedConditions };
  }

  private evaluateCondition(cond: RuleCondition, actual: unknown): boolean {
    switch (cond.operator) {
      case 'equals': return actual === cond.value;
      case 'not_equals': return actual !== cond.value;
      case 'greater_than': return Number(actual) > Number(cond.value);
      case 'less_than': return Number(actual) < Number(cond.value);
      case 'greater_or_equal': return Number(actual) >= Number(cond.value);
      case 'less_or_equal': return Number(actual) <= Number(cond.value);
      case 'in': return Array.isArray(cond.value) && (cond.value as unknown[]).includes(actual);
      case 'not_in': return Array.isArray(cond.value) && !(cond.value as unknown[]).includes(actual);
      case 'contains': return typeof actual === 'string' && actual.includes(String(cond.value));
      case 'starts_with': return typeof actual === 'string' && actual.startsWith(String(cond.value));
      case 'is_null': return actual === null || actual === undefined;
      case 'is_not_null': return actual !== null && actual !== undefined;
      default: return false;
    }
  }
}
