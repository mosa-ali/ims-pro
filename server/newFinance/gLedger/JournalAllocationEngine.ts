/**
 * JournalAllocationEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Journal Allocation Engine
 *
 * PHASE 4: GL Modernization
 *
 * Distributes amounts across accounting dimensions:
 *   - Cost center allocation (shared costs → cost centers by %)
 *   - Project allocation (overhead → projects by headcount/budget)
 *   - Grant allocation (expenses → grants by agreement terms)
 *   - Activity allocation (costs → activities by usage)
 *
 * Example: $10,000 office rent allocated to 3 projects:
 *   Project A (40%): $4,000
 *   Project B (35%): $3,500
 *   Project C (25%): $2,500
 *
 * Generates balanced journal entries via journalEntriesRouter.create
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';
import type { JournalEntryInput, JournalLineInput } from './GeneralLedgerEngine';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type AllocationMethod = 'percentage' | 'fixed' | 'headcount' | 'budget_ratio' | 'equal';
export type AllocationBasis = 'project' | 'grant' | 'activity' | 'cost_center' | 'operating_unit';

export interface AllocationRule {
  ruleId: string;
  organizationId: number;
  operatingUnitId: number;
  name: string;
  description: string;
  sourceGLAccountId: number;
  targetGLAccountId: number;
  allocationBasis: AllocationBasis;
  allocationMethod: AllocationMethod;
  targets: AllocationTarget[];
  isActive: boolean;
  createdBy: number;
  createdAt: string;
}

export interface AllocationTarget {
  targetId: number;     // projectId, grantId, costCenterId, etc.
  targetName: string;
  percentage?: number;  // For percentage method
  fixedAmount?: number; // For fixed method
}

export interface AllocationResult {
  ruleId: string;
  allocationDate: string;
  totalAmount: number;
  allocations: Array<{
    targetId: number;
    targetName: string;
    allocatedAmount: number;
    percentage: number;
  }>;
  journalEntryInput: JournalEntryInput;
  residual: number; // Rounding difference
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IAllocationRepository {
  saveRule(rule: AllocationRule): Promise<void>;
  getRule(ruleId: string, scope: RepositoryScope): Promise<AllocationRule | null>;
  listRules(scope: RepositoryScope): Promise<AllocationRule[]>;
  updateRule(ruleId: string, fields: Partial<AllocationRule>): Promise<void>;
  getHeadcount(targetId: number, basis: AllocationBasis, scope: RepositoryScope): Promise<number>;
  getBudgetAmount(targetId: number, basis: AllocationBasis, scope: RepositoryScope): Promise<number>;
}

export interface AllocationEngineDependencies {
  allocationRepo: IAllocationRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class JournalAllocationEngine {
  private repo: IAllocationRepository;
  private logger: ILogger;

  constructor(deps: AllocationEngineDependencies) {
    this.repo = deps.allocationRepo;
    this.logger = deps.logger.child({ service: 'JournalAllocationEngine' });
  }

  // ── RULE MANAGEMENT ──

  async createRule(
    input: Omit<AllocationRule, 'ruleId' | 'createdAt'>,
  ): Promise<AllocationRule> {
    // Validate percentages sum to 100 (for percentage method)
    if (input.allocationMethod === 'percentage') {
      const total = input.targets.reduce((s, t) => s + (t.percentage || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        throw new Error(`Allocation percentages must sum to 100% (got ${total}%)`);
      }
    }

    const rule: AllocationRule = {
      ...input,
      ruleId: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    await this.repo.saveRule(rule);
    this.logger.info('Allocation rule created', { ruleId: rule.ruleId, name: rule.name });
    return rule;
  }

  // ── EXECUTE ALLOCATION ──

  /**
   * Execute an allocation rule and generate a journal entry.
   * Returns entry ready for journalEntriesRouter.create
   */
  async executeAllocation(
    ruleId: string,
    totalAmount: number,
    allocationDate: string,
    scope: RepositoryScope,
  ): Promise<AllocationResult> {
    const rule = await this.repo.getRule(ruleId, scope);
    if (!rule) throw new Error(`Allocation rule ${ruleId} not found`);
    if (!rule.isActive) throw new Error(`Allocation rule ${ruleId} is inactive`);

    // Calculate allocation per target
    const allocations = await this.calculateAllocations(rule, totalAmount, scope);

    // Build journal entry lines
    const lines: JournalLineInput[] = [];
    let lineNum = 1;

    // Source line: credit the source account for full amount
    lines.push({
      lineNumber: lineNum++,
      glAccountId: rule.sourceGLAccountId,
      description: `Allocation source - ${rule.name}`,
      debitAmount: '0.00',
      creditAmount: totalAmount.toFixed(2),
    });

    // Target lines: debit each target's account
    for (const alloc of allocations) {
      const dimensionKey = this.getDimensionKey(rule.allocationBasis);
      lines.push({
        lineNumber: lineNum++,
        glAccountId: rule.targetGLAccountId,
        description: `Allocated to ${alloc.targetName} (${alloc.percentage.toFixed(1)}%)`,
        debitAmount: alloc.allocatedAmount.toFixed(2),
        creditAmount: '0.00',
        dimensions: { [dimensionKey]: alloc.targetId } as any,
      });
    }

    // Handle rounding residual
    const allocatedTotal = allocations.reduce((s, a) => s + a.allocatedAmount, 0);
    const residual = totalAmount - allocatedTotal;
    if (Math.abs(residual) > 0.001 && allocations.length > 0) {
      // Add residual to last allocation
      const lastLine = lines[lines.length - 1];
      const adjusted = parseFloat(lastLine.debitAmount) + residual;
      lastLine.debitAmount = adjusted.toFixed(2);
    }

    const journalEntryInput: JournalEntryInput = {
      entryDate: allocationDate,
      entryType: 'standard',
      sourceModule: 'manual',
      description: `Allocation: ${rule.name}`,
      lines,
    };

    this.logger.info('Allocation executed', {
      ruleId, totalAmount, targetCount: allocations.length, residual,
    });

    return {
      ruleId,
      allocationDate,
      totalAmount,
      allocations,
      journalEntryInput,
      residual: Math.abs(residual),
    };
  }

  // ── PRIVATE ──

  private async calculateAllocations(
    rule: AllocationRule,
    totalAmount: number,
    scope: RepositoryScope,
  ): Promise<Array<{ targetId: number; targetName: string; allocatedAmount: number; percentage: number }>> {
    switch (rule.allocationMethod) {
      case 'percentage':
        return rule.targets.map(t => ({
          targetId: t.targetId,
          targetName: t.targetName,
          percentage: t.percentage || 0,
          allocatedAmount: Math.round((totalAmount * (t.percentage || 0) / 100) * 100) / 100,
        }));

      case 'fixed':
        return rule.targets.map(t => ({
          targetId: t.targetId,
          targetName: t.targetName,
          percentage: totalAmount > 0 ? ((t.fixedAmount || 0) / totalAmount) * 100 : 0,
          allocatedAmount: t.fixedAmount || 0,
        }));

      case 'equal': {
        const perTarget = Math.round((totalAmount / rule.targets.length) * 100) / 100;
        const pct = 100 / rule.targets.length;
        return rule.targets.map(t => ({
          targetId: t.targetId,
          targetName: t.targetName,
          percentage: pct,
          allocatedAmount: perTarget,
        }));
      }

      case 'headcount': {
        let totalHeadcount = 0;
        const counts: number[] = [];
        for (const t of rule.targets) {
          const hc = await this.repo.getHeadcount(t.targetId, rule.allocationBasis, scope);
          counts.push(hc);
          totalHeadcount += hc;
        }
        return rule.targets.map((t, i) => {
          const pct = totalHeadcount > 0 ? (counts[i] / totalHeadcount) * 100 : 0;
          return {
            targetId: t.targetId,
            targetName: t.targetName,
            percentage: pct,
            allocatedAmount: Math.round((totalAmount * pct / 100) * 100) / 100,
          };
        });
      }

      case 'budget_ratio': {
        let totalBudget = 0;
        const budgets: number[] = [];
        for (const t of rule.targets) {
          const b = await this.repo.getBudgetAmount(t.targetId, rule.allocationBasis, scope);
          budgets.push(b);
          totalBudget += b;
        }
        return rule.targets.map((t, i) => {
          const pct = totalBudget > 0 ? (budgets[i] / totalBudget) * 100 : 0;
          return {
            targetId: t.targetId,
            targetName: t.targetName,
            percentage: pct,
            allocatedAmount: Math.round((totalAmount * pct / 100) * 100) / 100,
          };
        });
      }

      default:
        throw new Error(`Unknown allocation method: ${rule.allocationMethod}`);
    }
  }

  private getDimensionKey(basis: AllocationBasis): string {
    const map: Record<AllocationBasis, string> = {
      project: 'projectId',
      grant: 'grantId',
      activity: 'activityId',
      cost_center: 'costCenterId',
      operating_unit: 'operatingUnitId',
    };
    return map[basis];
  }
}
