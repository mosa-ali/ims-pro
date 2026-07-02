/**
 * UnifiedRulesCore.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Unified Rules Execution Core
 *
 * PHASE 6: Enterprise Performance Management
 *
 * Architectural refinement: merges FinancialRulesEngine (Phase 4)
 * and BudgetRulesEngine (Phase 5) into a single core with
 * domain-specific evaluators as plugins.
 *
 * Structure:
 *   UnifiedRulesCore (shared execution)
 *     ├── FinancialDomainEvaluator (GL, payment, compliance rules)
 *     ├── BudgetDomainEvaluator (budget, commitment, donor rules)
 *     ├── ProcurementDomainEvaluator (future: PO, vendor rules)
 *     ├── HRDomainEvaluator (future: payroll, leave rules)
 *     └── CustomDomainEvaluator (organization-specific)
 *
 * One rule engine. Multiple domains. Shared governance.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// CORE TYPES
// ────────────────────────────────────────────────────────────────────────────

export type ConditionOperator =
  | 'equals' | 'not_equals'
  | 'greater_than' | 'less_than'
  | 'greater_or_equal' | 'less_or_equal'
  | 'in' | 'not_in'
  | 'contains' | 'starts_with'
  | 'is_null' | 'is_not_null'
  | 'between' | 'regex';

export type RuleAction = 'block' | 'warn' | 'require_approval' | 'notify' | 'set_field' | 'trigger_workflow';

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface RuleConditionGroup {
  logic: 'all' | 'any';
  conditions: RuleCondition[];
  subGroups?: RuleConditionGroup[];  // Nested groups for complex logic
}

export interface UnifiedRule {
  ruleId: string;
  name: string;
  description: string;
  domain: string;           // 'finance' | 'budget' | 'procurement' | 'hr' | 'custom'
  category: string;         // Domain-specific category
  trigger: string;          // When to evaluate
  priority: number;
  isEnabled: boolean;
  conditionGroup: RuleConditionGroup;
  actions: Array<{
    type: RuleAction;
    parameters: Record<string, unknown>;
  }>;
  // Scope
  organizationId: number;
  operatingUnitId?: number;
  grantId?: number;
  donorId?: number;
  // Validity
  effectiveFrom?: string;
  effectiveTo?: string;
  // Versioning
  version: number;
  createdBy: number;
  createdAt: string;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  domain: string;
  matched: boolean;
  actions: UnifiedRule['actions'];
  matchedConditions: string[];
  evaluatedAt: string;
}

export interface RulesResult {
  blocked: boolean;
  requiresApproval: boolean;
  requiredApproverRole?: string;
  warnings: string[];
  notifications: string[];
  matchedRules: RuleEvaluation[];
  rulesEvaluated: number;
  executionTimeMs: number;
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN EVALUATOR INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Domain evaluators provide custom condition evaluation for their domain.
 * The core handles standard operators; domains handle specialized logic.
 */
export interface IDomainEvaluator {
  readonly domain: string;

  /**
   * Enrich context with domain-specific computed fields.
   * Called before condition evaluation so rules can reference derived values.
   */
  enrichContext(
    context: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<Record<string, unknown>>;

  /**
   * Post-evaluation hook for domain-specific side effects.
   */
  onRuleMatched?(
    rule: UnifiedRule,
    context: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<void>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IUnifiedRuleRepository {
  save(rule: UnifiedRule): Promise<void>;
  getById(ruleId: string): Promise<UnifiedRule | null>;
  listActive(domain: string, trigger: string, scope: RepositoryScope): Promise<UnifiedRule[]>;
  listAllActive(scope: RepositoryScope): Promise<UnifiedRule[]>;
  update(ruleId: string, fields: Partial<UnifiedRule>): Promise<void>;
  getVersionHistory(ruleId: string): Promise<UnifiedRule[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// UNIFIED RULES CORE
// ────────────────────────────────────────────────────────────────────────────

export class UnifiedRulesCore {
  private repo: IUnifiedRuleRepository;
  private evaluators = new Map<string, IDomainEvaluator>();
  private logger: ILogger;
  private config: IConfigService;

  constructor(repo: IUnifiedRuleRepository, logger: ILogger, config: IConfigService) {
    this.repo = repo;
    this.logger = logger.child({ service: 'UnifiedRulesCore' });
    this.config = config;
  }

  /**
   * Register a domain evaluator.
   */
  registerDomain(evaluator: IDomainEvaluator): void {
    this.evaluators.set(evaluator.domain, evaluator);
    this.logger.info('Domain evaluator registered', { domain: evaluator.domain });
  }

  /**
   * Evaluate all applicable rules against a context.
   *
   * @param domain  Which domain's rules to evaluate ('finance', 'budget', etc.)
   * @param trigger When this evaluation is happening ('on_posting', 'on_commitment', etc.)
   * @param context Flat object with all facts
   * @param scope   Organization/OU scope
   */
  async evaluate(
    domain: string,
    trigger: string,
    context: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<RulesResult> {
    const t0 = Date.now();

    // Enrich context with domain-specific fields
    const evaluator = this.evaluators.get(domain);
    const enrichedContext = evaluator
      ? await evaluator.enrichContext(context, scope)
      : context;

    // Load applicable rules
    const rules = await this.repo.listActive(domain, trigger, scope);
    const now = new Date().toISOString().split('T')[0];

    const matchedRules: RuleEvaluation[] = [];
    let blocked = false;
    let requiresApproval = false;
    let requiredApproverRole: string | undefined;
    const warnings: string[] = [];
    const notifications: string[] = [];

    for (const rule of rules) {
      // Check validity period
      if (rule.effectiveFrom && now < rule.effectiveFrom) continue;
      if (rule.effectiveTo && now > rule.effectiveTo) continue;

      // Check scope filters
      if (rule.grantId && enrichedContext.grantId !== rule.grantId) continue;
      if (rule.donorId && enrichedContext.donorId !== rule.donorId) continue;

      // Evaluate conditions
      const { matched, matchedConditions } = this.evaluateGroup(rule.conditionGroup, enrichedContext);

      if (matched) {
        matchedRules.push({
          ruleId: rule.ruleId,
          ruleName: rule.name,
          domain: rule.domain,
          matched: true,
          actions: rule.actions,
          matchedConditions,
          evaluatedAt: new Date().toISOString(),
        });

        // Process actions
        for (const action of rule.actions) {
          switch (action.type) {
            case 'block':
              blocked = true;
              warnings.push(`Blocked by "${rule.name}": ${action.parameters.message || 'Operation not allowed'}`);
              break;
            case 'require_approval':
              requiresApproval = true;
              requiredApproverRole = (action.parameters.approverRole as string) || requiredApproverRole;
              warnings.push(`"${rule.name}" requires ${action.parameters.approverRole || 'manager'} approval`);
              break;
            case 'warn':
              warnings.push(`${rule.name}: ${action.parameters.message || 'Review recommended'}`);
              break;
            case 'notify':
              notifications.push(`${rule.name}: ${action.parameters.message || 'Notification'}`);
              break;
          }
        }

        // Domain-specific post-evaluation
        if (evaluator?.onRuleMatched) {
          await evaluator.onRuleMatched(rule, enrichedContext, scope);
        }
      }
    }

    const executionTimeMs = Date.now() - t0;

    this.logger.info('Rules evaluated', {
      domain,
      trigger,
      rulesEvaluated: rules.length,
      matched: matchedRules.length,
      blocked,
      requiresApproval,
      executionTimeMs,
    });

    return {
      blocked,
      requiresApproval,
      requiredApproverRole,
      warnings,
      notifications,
      matchedRules,
      rulesEvaluated: rules.length,
      executionTimeMs,
    };
  }

  /**
   * Evaluate across ALL domains (global rule check).
   */
  async evaluateAll(
    trigger: string,
    context: Record<string, unknown>,
    scope: RepositoryScope,
  ): Promise<RulesResult> {
    const allRules = await this.repo.listAllActive(scope);
    const domains = [...new Set(allRules.map(r => r.domain))];

    const combined: RulesResult = {
      blocked: false,
      requiresApproval: false,
      warnings: [],
      notifications: [],
      matchedRules: [],
      rulesEvaluated: 0,
      executionTimeMs: 0,
    };

    for (const domain of domains) {
      const result = await this.evaluate(domain, trigger, context, scope);
      if (result.blocked) combined.blocked = true;
      if (result.requiresApproval) {
        combined.requiresApproval = true;
        combined.requiredApproverRole = result.requiredApproverRole;
      }
      combined.warnings.push(...result.warnings);
      combined.notifications.push(...result.notifications);
      combined.matchedRules.push(...result.matchedRules);
      combined.rulesEvaluated += result.rulesEvaluated;
      combined.executionTimeMs += result.executionTimeMs;
    }

    return combined;
  }

  /**
   * Explain a specific rule (for auditors / compliance officers).
   */
  async explain(
    ruleId: string,
    context: Record<string, unknown>,
    scope: RepositoryScope,
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

    const evaluator = this.evaluators.get(rule.domain);
    const enriched = evaluator
      ? await evaluator.enrichContext(context, scope)
      : context;

    const trace: Array<{
      condition: string;
      field: string;
      operator: string;
      expectedValue: unknown;
      actualValue: unknown;
      result: boolean;
    }> = [];

    const { matched } = this.evaluateGroupWithTrace(rule.conditionGroup, enriched, trace);

    return { ruleId, ruleName: rule.name, matched, trace };
  }

  /**
   * Create a rule.
   */
  async createRule(
    input: Omit<UnifiedRule, 'ruleId' | 'version' | 'createdAt'>,
  ): Promise<UnifiedRule> {
    const rule: UnifiedRule = {
      ...input,
      ruleId: uuidv4(),
      version: 1,
      createdAt: new Date().toISOString(),
    };
    await this.repo.save(rule);
    this.logger.info('Rule created', { ruleId: rule.ruleId, domain: rule.domain, name: rule.name });
    return rule;
  }

  // ── PRIVATE: CONDITION EVALUATION ──

  private evaluateGroup(
    group: RuleConditionGroup,
    context: Record<string, unknown>,
  ): { matched: boolean; matchedConditions: string[] } {
    const matchedConditions: string[] = [];
    const results: boolean[] = [];

    for (const cond of group.conditions) {
      const result = this.evaluateCondition(cond, context[cond.field]);
      results.push(result);
      if (result) matchedConditions.push(`${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`);
    }

    // Evaluate sub-groups recursively
    if (group.subGroups) {
      for (const sub of group.subGroups) {
        const subResult = this.evaluateGroup(sub, context);
        results.push(subResult.matched);
        if (subResult.matched) matchedConditions.push(...subResult.matchedConditions);
      }
    }

    const matched = group.logic === 'all'
      ? results.every(r => r)
      : results.some(r => r);

    return { matched, matchedConditions };
  }

  private evaluateGroupWithTrace(
    group: RuleConditionGroup,
    context: Record<string, unknown>,
    trace: Array<{ condition: string; field: string; operator: string; expectedValue: unknown; actualValue: unknown; result: boolean }>,
  ): { matched: boolean } {
    const results: boolean[] = [];

    for (const cond of group.conditions) {
      const actual = context[cond.field];
      const result = this.evaluateCondition(cond, actual);
      results.push(result);
      trace.push({
        condition: `${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`,
        field: cond.field,
        operator: cond.operator,
        expectedValue: cond.value,
        actualValue: actual,
        result,
      });
    }

    if (group.subGroups) {
      for (const sub of group.subGroups) {
        const subResult = this.evaluateGroupWithTrace(sub, context, trace);
        results.push(subResult.matched);
      }
    }

    return {
      matched: group.logic === 'all' ? results.every(r => r) : results.some(r => r),
    };
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
      case 'between': {
        const [lo, hi] = (cond.value as [number, number]) || [0, 0];
        return Number(actual) >= lo && Number(actual) <= hi;
      }
      case 'regex': {
        try { return new RegExp(String(cond.value)).test(String(actual)); }
        catch { return false; }
      }
      default: return false;
    }
  }
}
