/**
 * Financial Health Engine
 * Calculates comprehensive project health metrics including burnrate, timeline/budget correlation,
 * and predictive health scoring.
 */

import { getDb } from "../db";
import { projects, budgetLines, financeExpenditures } from "../../drizzle/schema";
import { eq, and, sum, avg, count, sql } from "drizzle-orm";

export interface HealthMetrics {
  projectId: number;
  healthScore: number; // 0-100
  burnRate: number; // $ per day
  burnRateTrend: number; // % change
  timelineHealth: number; // 0-100
  budgetHealth: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  daysRemaining: number;
  projectedCompletionDate: Date;
  budgetAtRisk: number; // $
  timelineAtRisk: boolean;
  healthTrend: "improving" | "stable" | "declining";
}

export interface HealthTrendData {
  date: Date;
  healthScore: number;
  burnRate: number;
  budgetUtilization: number;
  timelineProgress: number;
}

export class FinancialHealthEngine {
  /**
   * Calculate comprehensive health metrics for a project
   */
  async calculateProjectHealth(
    organizationId: number,
    projectId: number
  ): Promise<HealthMetrics> {
    const db = await getDb();

    // Fetch project data
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));

    if (!project) {
      throw new Error("Project not found");
    }

    // Calculate burn rate
    const burnRateData = await this.calculateBurnRate(db, projectId, organizationId);

    // Calculate timeline health
    const timelineHealth = await this.calculateTimelineHealth(db, projectId, project);

    // Calculate budget health
    const budgetHealth = await this.calculateBudgetHealth(db, projectId);

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(timelineHealth, budgetHealth, burnRateData.burnRate);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(healthScore, burnRateData.burnRate, budgetHealth);

    // Calculate projected completion date
    const projectedCompletionDate = this.calculateProjectedCompletion(
      new Date(project.startDate),
      new Date(project.endDate),
      burnRateData.burnRate
    );

    // Calculate budget at risk
    const totalBudget = project.totalBudget ? parseFloat(project.totalBudget.toString()) : 0;
    const budgetAtRisk = this.calculateBudgetAtRisk(burnRateData.burnRate, totalBudget);

    // Determine health trend
    const healthTrend = await this.determineHealthTrend(db, projectId);

    return {
      projectId,
      healthScore,
      burnRate: burnRateData.burnRate,
      burnRateTrend: burnRateData.trend,
      timelineHealth,
      budgetHealth,
      riskLevel,
      daysRemaining: this.calculateDaysRemaining(new Date(project.endDate)),
      projectedCompletionDate,
      budgetAtRisk,
      timelineAtRisk: this.calculateDaysRemaining(new Date(project.endDate)) < 30,
      healthTrend,
    };
  }

  /**
   * Calculate burn rate (daily spending)
   */
  private async calculateBurnRate(
    db: any,
    projectId: number,
    organizationId: number
  ): Promise<{ burnRate: number; trend: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

    // Last 30 days burn rate
    const [last30] = await db
      .select({ total: sum(financeExpenditures.amount) })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.projectId, projectId),
          eq(financeExpenditures.organizationId, organizationId),
          sql`DATE(${financeExpenditures.expenditureDate}) >= DATE(${thirtyDaysAgoStr})`
        )
      );

    const burnRate30 = (last30?.total ? parseFloat(last30.total.toString()) : 0) / 30;

    // Previous 30 days burn rate
    const [prev30] = await db
      .select({ total: sum(financeExpenditures.amount) })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.projectId, projectId),
          eq(financeExpenditures.organizationId, organizationId),
          sql`DATE(${financeExpenditures.expenditureDate}) >= DATE(${sixtyDaysAgoStr})`,
          sql`DATE(${financeExpenditures.expenditureDate}) < DATE(${thirtyDaysAgoStr})`
        )
      );

    const burnRate60 = (prev30?.total ? parseFloat(prev30.total.toString()) : 0) / 30;

    // Calculate trend
    const trend = burnRate60 > 0 ? ((burnRate30 - burnRate60) / burnRate60) * 100 : 0;

    return {
      burnRate: burnRate30,
      trend,
    };
  }

  /**
   * Calculate timeline health (0-100)
   */
  private async calculateTimelineHealth(db: any, projectId: number, project: any): Promise<number> {
    const now = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedTime = now.getTime() - startDate.getTime();
    const timelineProgress = Math.min(100, (elapsedTime / totalDuration) * 100);

    // Fetch actual progress from tasks/milestones if available
    // For now, use timeline progress as proxy
    const timelineHealth = Math.max(0, 100 - Math.abs(timelineProgress - 50) * 0.5);

    return timelineHealth;
  }

  /**
   * Calculate budget health (0-100)
   */
  private async calculateBudgetHealth(db: any, projectId: number): Promise<number> {
    const [budgetData] = await db
      .select({
        totalBudget: sum(sql`${budgetLines.unitCost} * ${budgetLines.quantity}`),
        totalSpent: sum(financeExpenditures.amount),
      })
      .from(budgetLines)
      .leftJoin(financeExpenditures, eq(budgetLines.id, financeExpenditures.budgetLineId))
      .where(eq(budgetLines.projectId, projectId));

    const totalBudget = budgetData?.totalBudget ? parseFloat(budgetData.totalBudget.toString()) : 1;
    const totalSpent = budgetData?.totalSpent ? parseFloat(budgetData.totalSpent.toString()) : 0;
    const utilization = (totalSpent / totalBudget) * 100;

    // Budget health: 100 at 50% utilization, decreases as it approaches 100%
    const budgetHealth = Math.max(0, 100 - Math.abs(utilization - 50));

    return budgetHealth;
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(
    timelineHealth: number,
    budgetHealth: number,
    burnRate: number
  ): number {
    // Weight: 40% timeline, 40% budget, 20% burn rate
    const timelineWeight = timelineHealth * 0.4;
    const budgetWeight = budgetHealth * 0.4;

    // Burn rate score: lower is better, capped at 100
    const burnRateScore = Math.max(0, 100 - burnRate / 1000);
    const burnRateWeight = burnRateScore * 0.2;

    return Math.round(timelineWeight + budgetWeight + burnRateWeight);
  }

  /**
   * Determine risk level based on health score
   */
  private determineRiskLevel(
    healthScore: number,
    burnRate: number,
    budgetHealth: number
  ): "low" | "medium" | "high" | "critical" {
    if (healthScore >= 75 && budgetHealth >= 75) {
      return "low";
    } else if (healthScore >= 50 && budgetHealth >= 50) {
      return "medium";
    } else if (healthScore >= 25 || budgetHealth >= 25) {
      return "high";
    } else {
      return "critical";
    }
  }

  /**
   * Calculate projected completion date based on burn rate
   */
  private calculateProjectedCompletion(
    startDate: Date,
    endDate: Date,
    burnRate: number
  ): Date {
    // Simple projection: if burn rate is high, completion may be delayed
    const projectedDate = new Date(endDate);
    const delayDays = Math.round(burnRate / 1000); // Rough estimate
    projectedDate.setDate(projectedDate.getDate() + delayDays);
    return projectedDate;
  }

  /**
   * Calculate budget at risk
   */
  private calculateBudgetAtRisk(burnRate: number, totalBudget: number): number {
    // Budget at risk if burn rate is high
    const monthlyBurnRate = burnRate * 30;
    return Math.max(0, monthlyBurnRate - totalBudget * 0.1);
  }

  /**
   * Calculate days remaining until project end
   */
  private calculateDaysRemaining(endDate: Date): number {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Determine health trend (improving, stable, declining)
   */
  private async determineHealthTrend(db: any, projectId: number): Promise<"improving" | "stable" | "declining"> {
    // For now, return stable. In production, would compare historical health scores
    return "stable";
  }

  /**
   * Get health trend data for charting
   */
  async getHealthTrendData(
    organizationId: number,
    projectId: number,
    days: number = 30
  ): Promise<HealthTrendData[]> {
    const db = await getDb();
    const trendData: HealthTrendData[] = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Calculate metrics for this date
      const [expenditure] = await db
        .select({ total: sum(financeExpenditures.amount) })
        .from(financeExpenditures)
        .where(
          and(
            eq(financeExpenditures.projectId, projectId),
            eq(financeExpenditures.organizationId, organizationId),
            sql`DATE(${financeExpenditures.expenditureDate}) <= DATE(${dateStr})`
          )
        );

      trendData.push({
        date,
        healthScore: 75 + Math.random() * 20, // Mock data
        burnRate: (expenditure?.total ? parseFloat(expenditure.total.toString()) : 0) / (days - i + 1),
        budgetUtilization: 50 + Math.random() * 30,
        timelineProgress: (i / days) * 100,
      });
    }

    return trendData;
  }
}

export const financialHealthEngine = new FinancialHealthEngine();
