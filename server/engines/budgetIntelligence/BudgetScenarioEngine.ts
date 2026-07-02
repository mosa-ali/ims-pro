/**
 * BudgetScenarioEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Scenario Planning and What-If Analysis
 *
 * PHASE 5: Budget Intelligence
 *
 * Capabilities:
 *  - Create named budget scenarios (baseline, optimistic, contingency)
 *  - What-if adjustments (change line amounts, add/remove lines)
 *  - Impact analysis (how does this change affect availability?)
 *  - Scenario comparison (side-by-side view)
 *  - Donor impact preview (how does reallocation affect donor compliance?)
 *  - Scenario promotion (promote scenario to draft revision)
 *
 * Scenarios are ephemeral models — not persisted as real budgets
 * until promoted via budgetsRouter.createRevision.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../../engines/finance/PlatformInterfaces';
import type { BudgetLineDetail, IBudgetRepository } from './BudgetEngine';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface BudgetScenario {
  scenarioId: string;
  name: string;
  description: string;
  baseBudgetId: number;
  createdBy: number;
  createdAt: string;
  adjustments: ScenarioAdjustment[];
  status: 'draft' | 'finalized' | 'promoted';
}

export type AdjustmentType = 'modify_amount' | 'add_line' | 'remove_line' | 'reallocate';

export interface ScenarioAdjustment {
  adjustmentId: string;
  type: AdjustmentType;
  lineId?: number;
  lineCode?: string;
  field?: string;
  originalValue?: number;
  newValue?: number;
  description: string;
  /** For reallocate: source and target */
  fromLineId?: number;
  toLineId?: number;
  amount?: number;
}

export interface ScenarioImpact {
  scenarioId: string;
  baseBudgetTotal: number;
  scenarioTotal: number;
  totalChange: number;
  changePercent: number;
  lineImpacts: Array<{
    lineId: number;
    lineCode: string;
    originalAmount: number;
    scenarioAmount: number;
    change: number;
  }>;
  donorImpact?: {
    withinDonorLimits: boolean;
    violations: string[];
  };
}

export interface ScenarioComparison {
  baseBudgetId: number;
  scenarios: Array<{
    scenarioId: string;
    name: string;
    totalAmount: number;
    changeFromBase: number;
    adjustmentCount: number;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IBudgetScenarioRepository {
  saveScenario(scenario: BudgetScenario): Promise<void>;
  getScenario(scenarioId: string): Promise<BudgetScenario | null>;
  listScenarios(baseBudgetId: number, scope: RepositoryScope): Promise<BudgetScenario[]>;
  updateScenario(scenarioId: string, fields: Partial<BudgetScenario>): Promise<void>;
  deleteScenario(scenarioId: string): Promise<void>;
}

export interface BudgetScenarioDependencies {
  scenarioRepo: IBudgetScenarioRepository;
  budgetRepo: IBudgetRepository;
  logger: ILogger;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class BudgetScenarioEngine {
  private scenarioRepo: IBudgetScenarioRepository;
  private budgetRepo: IBudgetRepository;
  private logger: ILogger;

  constructor(deps: BudgetScenarioDependencies) {
    this.scenarioRepo = deps.scenarioRepo;
    this.budgetRepo = deps.budgetRepo;
    this.logger = deps.logger.child({ service: 'BudgetScenarioEngine' });
  }

  /**
   * Create a new scenario based on an existing budget.
   */
  async createScenario(
    baseBudgetId: number,
    name: string,
    description: string,
    createdBy: number,
    scope: RepositoryScope,
  ): Promise<BudgetScenario> {
    // Verify base budget exists
    const base = await this.budgetRepo.getBudgetSummary(baseBudgetId, scope);
    if (!base) throw new Error(`Budget ${baseBudgetId} not found`);

    const scenario: BudgetScenario = {
      scenarioId: uuidv4(),
      name,
      description,
      baseBudgetId,
      createdBy,
      createdAt: new Date().toISOString(),
      adjustments: [],
      status: 'draft',
    };

    await this.scenarioRepo.saveScenario(scenario);
    this.logger.info('Scenario created', { scenarioId: scenario.scenarioId, baseBudgetId, name });
    return scenario;
  }

  /**
   * Add an adjustment to a scenario.
   */
  async addAdjustment(
    scenarioId: string,
    adjustment: Omit<ScenarioAdjustment, 'adjustmentId'>,
  ): Promise<BudgetScenario> {
    const scenario = await this.scenarioRepo.getScenario(scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);
    if (scenario.status !== 'draft') throw new Error('Cannot modify finalized scenario');

    const adj: ScenarioAdjustment = { ...adjustment, adjustmentId: uuidv4() };
    scenario.adjustments.push(adj);

    await this.scenarioRepo.updateScenario(scenarioId, { adjustments: scenario.adjustments });
    this.logger.info('Adjustment added', { scenarioId, type: adj.type });
    return scenario;
  }

  /**
   * Calculate the impact of a scenario vs the base budget.
   */
  async calculateImpact(
    scenarioId: string,
    scope: RepositoryScope,
  ): Promise<ScenarioImpact> {
    const scenario = await this.scenarioRepo.getScenario(scenarioId);
    if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

    const baseLines = await this.budgetRepo.getBudgetLines(scenario.baseBudgetId, scope);
    const baseSummary = await this.budgetRepo.getBudgetSummary(scenario.baseBudgetId, scope);
    if (!baseSummary) throw new Error('Base budget not found');

    // Apply adjustments to create scenario lines
    const scenarioLineMap = new Map<number, { lineId: number; lineCode: string; amount: number }>();
    for (const line of baseLines) {
      scenarioLineMap.set(line.lineId, {
        lineId: line.lineId,
        lineCode: line.lineCode,
        amount: line.totalAmount,
      });
    }

    for (const adj of scenario.adjustments) {
      switch (adj.type) {
        case 'modify_amount':
          if (adj.lineId && scenarioLineMap.has(adj.lineId)) {
            scenarioLineMap.get(adj.lineId)!.amount = adj.newValue || 0;
          }
          break;
        case 'remove_line':
          if (adj.lineId) scenarioLineMap.delete(adj.lineId);
          break;
        case 'reallocate':
          if (adj.fromLineId && adj.toLineId && adj.amount) {
            const from = scenarioLineMap.get(adj.fromLineId);
            const to = scenarioLineMap.get(adj.toLineId);
            if (from) from.amount -= adj.amount;
            if (to) to.amount += adj.amount;
          }
          break;
      }
    }

    const scenarioTotal = [...scenarioLineMap.values()].reduce((s, l) => s + l.amount, 0);

    const lineImpacts = baseLines.map(bl => {
      const scenarioLine = scenarioLineMap.get(bl.lineId);
      return {
        lineId: bl.lineId,
        lineCode: bl.lineCode,
        originalAmount: bl.totalAmount,
        scenarioAmount: scenarioLine?.amount || 0,
        change: (scenarioLine?.amount || 0) - bl.totalAmount,
      };
    }).filter(l => l.change !== 0);

    return {
      scenarioId,
      baseBudgetTotal: baseSummary.totalApproved,
      scenarioTotal,
      totalChange: scenarioTotal - baseSummary.totalApproved,
      changePercent: baseSummary.totalApproved > 0
        ? Math.round(((scenarioTotal - baseSummary.totalApproved) / baseSummary.totalApproved) * 100 * 10) / 10
        : 0,
      lineImpacts,
    };
  }

  /**
   * Compare multiple scenarios side-by-side.
   */
  async compareScenarios(
    baseBudgetId: number,
    scope: RepositoryScope,
  ): Promise<ScenarioComparison> {
    const scenarios = await this.scenarioRepo.listScenarios(baseBudgetId, scope);
    const baseSummary = await this.budgetRepo.getBudgetSummary(baseBudgetId, scope);
    if (!baseSummary) throw new Error('Base budget not found');

    const compared = await Promise.all(
      scenarios.map(async s => {
        const impact = await this.calculateImpact(s.scenarioId, scope);
        return {
          scenarioId: s.scenarioId,
          name: s.name,
          totalAmount: impact.scenarioTotal,
          changeFromBase: impact.totalChange,
          adjustmentCount: s.adjustments.length,
        };
      }),
    );

    return { baseBudgetId, scenarios: compared };
  }
}
