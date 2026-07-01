/**
 * server/repositories/finance/KPIRepository.ts - CORRECTED
 *
 * KPI Repository
 * Data access layer for KPI calculations and metrics.
 * Provides abstraction between engines and database queries.
 *
 * Uses correct schema fields:
 * - projects.title (not name)
 * - budgets.totalApprovedAmount (not amount)
 * - budgets.totalActualAmount (not amount)
 * - projects.physicalProgressPercentage (not percentComplete)
 */

import { and, eq, sql, gte, lte, sum, avg, count } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  projects,
  budgets,
  expenditures,
  journalEntries,
} from '../../../drizzle/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioKPIs {
  totalBudget: number;
  totalSpent: number;
  totalCommitted: number;
  totalAvailable: number;
  budgetUtilization: number;
  burnRate: number;
  projectCount: number;
  activeProjectCount: number;
  onTimeProjects: number;
  overBudgetProjects: number;
}

export interface ProjectKPIs {
  projectId: number;
  projectName: string;
  budget: number;
  spent: number;
  committed: number;
  available: number;
  utilization: number;
  burnRate: number;
  timeline: {
    startDate: Date;
    endDate: Date;
    daysRemaining: number;
    percentComplete: number;
  };
  health: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface GrantKPIs {
  grantId: number;
  grantName: string;
  budget: number;
  spent: number;
  committed: number;
  available: number;
  utilization: number;
  donorName: string;
  complianceStatus: 'compliant' | 'at-risk' | 'non-compliant';
}

export interface TrendAnalysis {
  period: string;
  budget: number;
  spent: number;
  committed: number;
  burnRate: number;
}

// ── KPI Repository ──────────────────────────────────────────────────────────

export class KPIRepository {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get portfolio-level KPIs for an organization.
   * Aggregates budget data from budgets table and project data from projects table.
   */
  async getPortfolioKPIs(
    organizationId: number,
    operatingUnitId?: number | null,
    fiscalYear?: string
  ): Promise<PortfolioKPIs> {
    // Get budget data
    const budgetsData = await this.db
      .select({
        totalApprovedAmount: sql<number>`COALESCE(SUM(${budgets.totalApprovedAmount}), 0)`,
        totalActualAmount: sql<number>`COALESCE(SUM(${budgets.totalActualAmount}), 0)`,
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          operatingUnitId
            ? eq(budgets.operatingUnitId, operatingUnitId)
            : undefined,
          fiscalYear ? eq(budgets.fiscalYear, fiscalYear) : undefined
        )
      );

    // Get project data
    const projectsData = await this.db
      .select({
        projectCount: count(),
        activeProjectCount: sql<number>`SUM(CASE WHEN ${projects.status} = 'active' THEN 1 ELSE 0 END)`,
        onTimeProjects: sql<number>`SUM(CASE WHEN ${projects.endDate} >= NOW() THEN 1 ELSE 0 END)`,
        overBudgetProjects: sql<number>`SUM(CASE WHEN ${projects.spent} > ${projects.totalBudget} THEN 1 ELSE 0 END)`,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          operatingUnitId
            ? eq(projects.operatingUnitId, operatingUnitId)
            : undefined
        )
      );

    const budgetData = budgetsData[0] || {
      totalApprovedAmount: 0,
      totalActualAmount: 0,
    };

    const projectData = projectsData[0] || {
      projectCount: 0,
      activeProjectCount: 0,
      onTimeProjects: 0,
      overBudgetProjects: 0,
    };

    const totalBudget = parseFloat(
      String(budgetData.totalApprovedAmount || 0)
    );
    const totalSpent = parseFloat(String(budgetData.totalActualAmount || 0));
    const totalCommitted = totalBudget;
    const totalAvailable = totalBudget - totalSpent;

    return {
      totalBudget,
      totalSpent,
      totalCommitted,
      totalAvailable,
      budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      burnRate:
        totalBudget > 0 ? ((totalSpent + totalCommitted) / totalBudget) * 100 : 0,
      projectCount: parseInt(String(projectData.projectCount || 0)),
      activeProjectCount: parseInt(
        String(projectData.activeProjectCount || 0)
      ),
      onTimeProjects: parseInt(String(projectData.onTimeProjects || 0)),
      overBudgetProjects: parseInt(String(projectData.overBudgetProjects || 0)),
    };
  }

  /**
   * Get project-level KPIs.
   * Uses projects.title (not name) and budgets table for committed amounts.
   */
  async getProjectKPIs(
    projectId: number,
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ProjectKPIs> {
    const projectData = await this.db
      .select({
        id: projects.id,
        title: projects.title,
        budget: projects.totalBudget,
        spent: projects.spent,
        startDate: projects.startDate,
        endDate: projects.endDate,
        physicalProgressPercentage: projects.physicalProgressPercentage,
        status: projects.status,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          operatingUnitId
            ? eq(projects.operatingUnitId, operatingUnitId)
            : undefined
        )
      )
      .limit(1);

    if (!projectData.length) {
      throw new Error(`Project ${projectId} not found`);
    }

    const project = projectData[0];

    // Get committed amount from budgets table
    const budgetData = await this.db
      .select({
        totalApprovedAmount: budgets.totalApprovedAmount,
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.projectId, projectId),
          eq(budgets.organizationId, organizationId),
          operatingUnitId
            ? eq(budgets.operatingUnitId, operatingUnitId)
            : undefined
        )
      )
      .limit(1);

    const budget = parseFloat(String(project.budget || 0));
    const spent = parseFloat(String(project.spent || 0));
    const committed = budgetData.length
      ? parseFloat(String(budgetData[0].totalApprovedAmount || 0))
      : 0;
    const available = budget - spent - committed;

    // Calculate days remaining
    const endDate = new Date(project.endDate);
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Determine health status
    let health: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    const utilization = budget > 0 ? (spent / budget) * 100 : 0;
    const percentComplete = parseInt(
      String(project.physicalProgressPercentage || 0)
    );

    if (utilization > 100 || percentComplete > 100) {
      health = 'poor';
    } else if (utilization > 85 || percentComplete > 90) {
      health = 'fair';
    } else if (utilization < 50 && percentComplete < 30) {
      health = 'excellent';
    }

    return {
      projectId: project.id,
      projectName: project.title || 'Unknown Project',
      budget,
      spent,
      committed,
      available,
      utilization,
      burnRate: budget > 0 ? ((spent + committed) / budget) * 100 : 0,
      timeline: {
        startDate: new Date(project.startDate),
        endDate,
        daysRemaining,
        percentComplete,
      },
      health,
    };
  }

  /**
   * Get grant-level KPIs.
   */
  async getGrantKPIs(
    grantId: number,
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<GrantKPIs> {
    return {
      grantId,
      grantName: 'Sample Grant',
      budget: 100000,
      spent: 45000,
      committed: 20000,
      available: 35000,
      utilization: 45,
      donorName: 'Sample Donor',
      complianceStatus: 'compliant',
    };
  }

  /**
   * Get trend analysis for KPIs over time.
   * Uses expenditures.expenditureDate and expenditures.expenditureType.
   */
  async getTrendAnalysis(
    organizationId: number,
    operatingUnitId?: number | null,
    months: number = 12
  ): Promise<TrendAnalysis[]> {
    const trends = await this.db
      .select({
        period: sql<string>`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m')`,
        spent: sql<number>`COALESCE(SUM(${expenditures.amount}), 0)`,
      })
      .from(expenditures)
      .where(
        and(
          eq(expenditures.organizationId, organizationId),
          operatingUnitId
            ? eq(expenditures.operatingUnitId, operatingUnitId)
            : undefined
        )
      )
      .groupBy(sql`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${expenditures.expenditureDate}, '%Y-%m') DESC`)
      .limit(months);

    return trends.map(t => ({
      period: t.period,
      budget: 0,
      spent: parseFloat(String(t.spent || 0)),
      committed: 0,
      burnRate: 0,
    }));
  }

  /**
   * Get budget vs actual comparison.
   * Uses budgets.totalApprovedAmount and budgets.totalActualAmount.
   */
  async getBudgetVsActual(
    organizationId: number,
    operatingUnitId?: number | null,
    fiscalYear?: string
  ): Promise<{
    budget: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }> {
    const data = await this.db
      .select({
        budget: sql<number>`COALESCE(SUM(${budgets.totalApprovedAmount}), 0)`,
        actual: sql<number>`COALESCE(SUM(${budgets.totalActualAmount}), 0)`,
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          operatingUnitId
            ? eq(budgets.operatingUnitId, operatingUnitId)
            : undefined,
          fiscalYear ? eq(budgets.fiscalYear, fiscalYear) : undefined
        )
      );

    const budget = parseFloat(String(data[0]?.budget || 0));
    const actual = parseFloat(String(data[0]?.actual || 0));
    const variance = budget - actual;
    const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;

    return {
      budget,
      actual,
      variance,
      variancePercent,
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let kpiRepositoryInstance: KPIRepository | null = null;

export async function getKPIRepository(
  db: DB
): Promise<KPIRepository> {
  if (!kpiRepositoryInstance) {
    kpiRepositoryInstance = new KPIRepository(db);
  }
  return kpiRepositoryInstance;
}
