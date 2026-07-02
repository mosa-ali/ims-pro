/**
 * ProcurementPlanningEngine.ts + ContractLifecycleEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Procurement Planning (#4) + Contract Lifecycle Management (#5 ★★★★★)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ════════════════════════════════════════════════════════════════════════════
// #4  PROCUREMENT PLANNING ENGINE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Closes the loop: Annual Plan → Forecast → Budget → Pipeline → PR
 */

export type PlanItemStatus = 'planned' | 'budgeted' | 'pr_created' | 'in_procurement' | 'completed' | 'cancelled' | 'deferred';
export type ProcurementMethod = 'competitive_bidding' | 'rfq' | 'single_source' | 'framework_agreement' | 'micro_purchase';

export interface AnnualProcurementPlan {
  planId: string;
  organizationId: number;
  operatingUnitId: number;
  fiscalYear: string;
  status: 'draft' | 'submitted' | 'approved' | 'active' | 'closed';
  items: PlanItem[];
  totalPlannedValue: number;
  totalExecutedValue: number;
  executionRate: number;
  createdBy: number;
  createdAt: string;
  approvedBy?: number;
  approvedAt?: string;
}

export interface PlanItem {
  itemId: string;
  description: string;
  category: string;
  estimatedValue: number;
  currency: string;
  plannedMethod: ProcurementMethod;
  plannedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  projectId?: number;
  grantId?: number;
  budgetLineId?: number;
  status: PlanItemStatus;
  prId?: number;
  poId?: number;
  actualValue?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  justification?: string;
}

export interface PlanVsBudgetAnalysis {
  planId: string;
  fiscalYear: string;
  totalPlanned: number;
  totalBudgeted: number;
  totalCommitted: number;
  totalSpent: number;
  gap: number;
  gapPercent: number;
  byQuarter: Array<{
    quarter: string;
    planned: number;
    executed: number;
    executionRate: number;
  }>;
  byCategory: Array<{
    category: string;
    planned: number;
    executed: number;
    items: number;
  }>;
}

export interface IProcurementPlanRepository {
  savePlan(plan: AnnualProcurementPlan): Promise<void>;
  getPlan(planId: string, scope: RepositoryScope): Promise<AnnualProcurementPlan | null>;
  getPlanByYear(fiscalYear: string, scope: RepositoryScope): Promise<AnnualProcurementPlan | null>;
  updatePlan(planId: string, fields: Partial<AnnualProcurementPlan>): Promise<void>;
  updatePlanItem(planId: string, itemId: string, fields: Partial<PlanItem>): Promise<void>;
  getBudgetForPlanItem(budgetLineId: number, scope: RepositoryScope): Promise<{ approved: number; available: number }>;
  getExecutionData(planId: string, scope: RepositoryScope): Promise<Array<{ itemId: string; prId?: number; poId?: number; actualValue: number; status: string }>>;
}

export class ProcurementPlanningEngine {
  private repo: IProcurementPlanRepository;
  private logger: ILogger;

  constructor(repo: IProcurementPlanRepository, logger: ILogger) {
    this.repo = repo;
    this.logger = logger.child({ service: 'ProcurementPlanningEngine' });
  }

  async createPlan(
    fiscalYear: string,
    items: Omit<PlanItem, 'itemId' | 'status'>[],
    userId: number,
    scope: RepositoryScope,
  ): Promise<AnnualProcurementPlan> {
    const planItems: PlanItem[] = items.map(i => ({
      ...i, itemId: uuidv4(), status: 'planned',
    }));

    const totalPlanned = planItems.reduce((s, i) => s + i.estimatedValue, 0);

    const plan: AnnualProcurementPlan = {
      planId: uuidv4(),
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
      fiscalYear,
      status: 'draft',
      items: planItems,
      totalPlannedValue: totalPlanned,
      totalExecutedValue: 0,
      executionRate: 0,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    await this.repo.savePlan(plan);
    this.logger.info('Procurement plan created', { planId: plan.planId, fiscalYear, items: planItems.length, totalPlanned });
    return plan;
  }

  async analyzePlanVsBudget(planId: string, scope: RepositoryScope): Promise<PlanVsBudgetAnalysis> {
    const plan = await this.repo.getPlan(planId, scope);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const executionData = await this.repo.getExecutionData(planId, scope);
    const execMap = new Map(executionData.map(e => [e.itemId, e]));

    let totalBudgeted = 0;
    let totalCommitted = 0;
    let totalSpent = 0;

    for (const item of plan.items) {
      if (item.budgetLineId) {
        const budget = await this.repo.getBudgetForPlanItem(item.budgetLineId, scope);
        totalBudgeted += budget.approved;
      }
      const exec = execMap.get(item.itemId);
      if (exec) {
        totalSpent += exec.actualValue;
        if (exec.poId) totalCommitted += exec.actualValue;
      }
    }

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
      const qItems = plan.items.filter(i => i.plannedQuarter === q);
      const planned = qItems.reduce((s, i) => s + i.estimatedValue, 0);
      const executed = qItems.reduce((s, i) => {
        const exec = execMap.get(i.itemId);
        return s + (exec?.actualValue || 0);
      }, 0);
      return { quarter: q, planned, executed, executionRate: planned > 0 ? Math.round((executed / planned) * 100) : 0 };
    });

    const categories = [...new Set(plan.items.map(i => i.category))].map(cat => {
      const catItems = plan.items.filter(i => i.category === cat);
      return {
        category: cat,
        planned: catItems.reduce((s, i) => s + i.estimatedValue, 0),
        executed: catItems.reduce((s, i) => (execMap.get(i.itemId)?.actualValue || 0) + s, 0),
        items: catItems.length,
      };
    });

    return {
      planId, fiscalYear: plan.fiscalYear,
      totalPlanned: plan.totalPlannedValue,
      totalBudgeted, totalCommitted, totalSpent,
      gap: plan.totalPlannedValue - totalSpent,
      gapPercent: plan.totalPlannedValue > 0 ? Math.round(((plan.totalPlannedValue - totalSpent) / plan.totalPlannedValue) * 100) : 0,
      byQuarter: quarters, byCategory: categories,
    };
  }

  async linkPRToPlanItem(planId: string, itemId: string, prId: number, scope: RepositoryScope): Promise<void> {
    await this.repo.updatePlanItem(planId, itemId, { status: 'pr_created', prId });
    this.logger.info('Plan item linked to PR', { planId, itemId, prId });
  }
}


// ════════════════════════════════════════════════════════════════════════════
// #5  CONTRACT LIFECYCLE MANAGEMENT  ★★★★★
// ════════════════════════════════════════════════════════════════════════════

export type ContractStatus = 'draft' | 'negotiation' | 'pending_approval' | 'active' | 'suspended' | 'expired' | 'terminated' | 'renewed' | 'completed';

export interface Contract {
  contractId: number;
  contractNumber: string;
  title: string;
  titleAR?: string;
  vendorId: number;
  vendorName: string;
  contractType: 'fixed_price' | 'time_and_materials' | 'framework' | 'service_level' | 'lease';
  status: ContractStatus;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  autoRenew: boolean;
  projectId?: number;
  grantId?: number;

  // Financial
  totalInvoiced: number;
  totalPaid: number;
  remainingValue: number;
  retentionPercent?: number;
  retentionAmount?: number;

  // Terms
  paymentTermDays: number;
  warrantyPeriodDays?: number;
  insuranceRequired: boolean;
  guaranteeRequired: boolean;
  guaranteeAmount?: number;
  penaltyClause?: string;

  // SLA
  slaMetrics?: SLAMetric[];

  // Milestones
  milestones: ContractMilestone[];

  // Amendments
  amendments: ContractAmendment[];

  // Documents
  documentCount: number;

  // Metadata
  organizationId: number;
  operatingUnitId: number;
  createdBy: number;
  createdAt: string;
}

export interface ContractMilestone {
  milestoneId: string;
  title: string;
  dueDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  paymentAmount?: number;
  deliverable: string;
}

export interface ContractAmendment {
  amendmentId: string;
  amendmentNumber: number;
  description: string;
  valueChange: number;
  dateChange?: { originalEnd: string; newEnd: string };
  approvedBy: number;
  approvedAt: string;
  reason: string;
}

export interface SLAMetric {
  metricId: string;
  name: string;
  target: number;
  actual: number;
  unit: string;
  status: 'met' | 'at_risk' | 'breached';
}

export interface ContractAlert {
  type: 'expiry' | 'renewal' | 'milestone_overdue' | 'sla_breach' | 'guarantee_expiry' | 'insurance_expiry' | 'budget_overrun';
  severity: 'info' | 'warning' | 'critical';
  contractId: number;
  contractNumber: string;
  message: string;
  dueDate?: string;
  daysRemaining?: number;
}

export interface IContractRepository {
  getContract(contractId: number, scope: RepositoryScope): Promise<Contract | null>;
  listContracts(scope: RepositoryScope, filters?: { status?: ContractStatus; vendorId?: number; expiringWithinDays?: number }): Promise<Contract[]>;
  saveContract(contract: Contract): Promise<{ contractId: number }>;
  updateContract(contractId: number, fields: Partial<Contract>): Promise<void>;
  addMilestone(contractId: number, milestone: ContractMilestone): Promise<void>;
  updateMilestone(contractId: number, milestoneId: string, fields: Partial<ContractMilestone>): Promise<void>;
  addAmendment(contractId: number, amendment: ContractAmendment): Promise<void>;
  getExpiringContracts(daysAhead: number, scope: RepositoryScope): Promise<Contract[]>;
  getOverdueMilestones(scope: RepositoryScope): Promise<Array<{ contract: Contract; milestone: ContractMilestone }>>;
}

export class ContractLifecycleEngine {
  private repo: IContractRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(repo: IContractRepository, logger: ILogger, config: IConfigService) {
    this.repo = repo;
    this.logger = logger.child({ service: 'ContractLifecycleEngine' });
    this.config = config;
  }

  async getAlerts(scope: RepositoryScope): Promise<ContractAlert[]> {
    const alerts: ContractAlert[] = [];
    const expiryWarningDays = this.config.getNumber('contract.expiryWarningDays', 60);

    // Expiring contracts
    const expiring = await this.repo.getExpiringContracts(expiryWarningDays, scope);
    for (const c of expiring) {
      const daysRemaining = Math.floor((new Date(c.endDate).getTime() - Date.now()) / 86400000);
      alerts.push({
        type: c.autoRenew ? 'renewal' : 'expiry',
        severity: daysRemaining < 14 ? 'critical' : daysRemaining < 30 ? 'warning' : 'info',
        contractId: c.contractId, contractNumber: c.contractNumber,
        message: `Contract ${c.contractNumber} ${c.autoRenew ? 'auto-renews' : 'expires'} in ${daysRemaining} days`,
        dueDate: c.endDate, daysRemaining,
      });
    }

    // Overdue milestones
    const overdue = await this.repo.getOverdueMilestones(scope);
    for (const { contract, milestone } of overdue) {
      alerts.push({
        type: 'milestone_overdue',
        severity: 'warning',
        contractId: contract.contractId, contractNumber: contract.contractNumber,
        message: `Milestone "${milestone.title}" overdue since ${milestone.dueDate}`,
        dueDate: milestone.dueDate,
      });
    }

    // Budget overrun check
    const active = await this.repo.listContracts(scope, { status: 'active' });
    for (const c of active) {
      if (c.totalInvoiced > c.value) {
        alerts.push({
          type: 'budget_overrun', severity: 'critical',
          contractId: c.contractId, contractNumber: c.contractNumber,
          message: `Contract ${c.contractNumber} invoiced ${c.totalInvoiced} exceeds value ${c.value}`,
        });
      }
    }

    this.logger.info('Contract alerts generated', { alertCount: alerts.length });
    return alerts;
  }

  async amendContract(
    contractId: number,
    description: string,
    valueChange: number,
    dateChange: { originalEnd: string; newEnd: string } | undefined,
    reason: string,
    userId: number,
    scope: RepositoryScope,
  ): Promise<ContractAmendment> {
    const contract = await this.repo.getContract(contractId, scope);
    if (!contract) throw new Error(`Contract ${contractId} not found`);

    const amendment: ContractAmendment = {
      amendmentId: uuidv4(),
      amendmentNumber: contract.amendments.length + 1,
      description, valueChange, dateChange,
      approvedBy: userId, approvedAt: new Date().toISOString(), reason,
    };

    await this.repo.addAmendment(contractId, amendment);

    // Update contract value and end date
    const updates: Partial<Contract> = { value: contract.value + valueChange };
    if (dateChange) updates.endDate = dateChange.newEnd;
    await this.repo.updateContract(contractId, updates);

    this.logger.info('Contract amended', { contractId, amendmentNumber: amendment.amendmentNumber, valueChange, reason });
    return amendment;
  }

  async completeMilestone(contractId: number, milestoneId: string, userId: number, scope: RepositoryScope): Promise<void> {
    await this.repo.updateMilestone(contractId, milestoneId, { status: 'completed', completedDate: new Date().toISOString() });
    this.logger.info('Milestone completed', { contractId, milestoneId });
  }
}
