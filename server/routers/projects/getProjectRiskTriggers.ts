/**
 * ============================================================================
 * GET PROJECT RISK TRIGGERS PROCEDURE
 * ============================================================================
 * 
 * Detects automatic risk triggers based on predefined business rules:
 * - Trigger 1: Low Spending (elapsed >50%, utilization <20%)
 * - Trigger 2: Burn Risk (elapsed <40%, utilization >80%)
 * - Trigger 3: Reporting Risk (overdue reports >0)
 * - Trigger 4: Indicator Failure (achieved <40% after midpoint)
 * - Trigger 5: Activity Delay (delayed >30%)
 * - Trigger 6: Beneficiary Gap (achieved <50% after midpoint)
 * 
 * Returns: Array of active risk triggers with severity levels
 * 
 * ============================================================================
 */

import { z } from "zod";
import { scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  projects,
  activities,
  indicators,
  reportingSchedules,
  beneficiaries,
  budgetItems,
} from "drizzle/schema";
import { eq, and, count, sql, sum, isNull } from "drizzle-orm";

interface RiskTrigger {
  triggerId: string;
  name: string;
  description: string;
  severity: 'warning' | 'critical';
  detectedAt: Date;
  metrics: Record<string, any>;
  recommendedAction: string;
}

export const getProjectRiskTriggersProcedure = scopedProcedure
  .input(
    z.object({
      projectId: z.number(),
      organizationId: z.number(),
    })
  )
  .query(async ({ ctx, input }): Promise<{ projectId: number; triggers: RiskTrigger[] }> => {
    const db = await getDb();
    const { projectId, organizationId } = input;

    // Fetch project data
    const project = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.isDeleted, 0)
        )
      )
      .then(r => r[0]);

    if (!project) {
      return { projectId, triggers: [] };
    }

    const triggers: RiskTrigger[] = [];
    const now = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    // Calculate timeline metrics
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    const elapsedPercent = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;
    const midpointPercent = 50;

    // ========== TRIGGER 1: LOW SPENDING ==========
    const budgetData = await db
      .select({
        totalBudgeted: sum(budgetItems.totalBudgetLine),
        totalSpent: sum(budgetItems.actualSpent),
      })
      .from(budgetItems)
      .where(
        and(
          eq(budgetItems.projectId, projectId),
          eq(budgetItems.organizationId, organizationId),
          eq(budgetItems.isDeleted, 0)
        )
      )
      .then(r => r[0]);

    const totalBudgeted = Number(budgetData?.totalBudgeted || project.totalBudget || 0);
    const totalSpent = Number(budgetData?.totalSpent || project.spent || 0);
    const budgetUtilization = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    if (elapsedPercent > 50 && budgetUtilization < 20) {
      triggers.push({
        triggerId: 'low_spending',
        name: 'Implementation Delay Risk',
        description: 'Project has passed 50% timeline but only 20% budget is spent',
        severity: 'critical',
        detectedAt: now,
        metrics: {
          elapsedPercent: Math.round(elapsedPercent),
          budgetUtilization: Math.round(budgetUtilization),
          totalBudgeted,
          totalSpent,
        },
        recommendedAction: 'Review project implementation plan and accelerate spending activities',
      });
    }

    // ========== TRIGGER 2: BURN RISK ==========
    if (elapsedPercent < 40 && budgetUtilization > 80) {
      triggers.push({
        triggerId: 'burn_risk',
        name: 'Budget Overspend Risk',
        description: 'Project is only 40% through timeline but 80% of budget is spent',
        severity: 'critical',
        detectedAt: now,
        metrics: {
          elapsedPercent: Math.round(elapsedPercent),
          budgetUtilization: Math.round(budgetUtilization),
          remainingBudget: Math.round(totalBudgeted - totalSpent),
          remainingPercent: Math.round(100 - elapsedPercent),
        },
        recommendedAction: 'Implement budget controls and review spending patterns immediately',
      });
    }

    // ========== TRIGGER 3: REPORTING RISK ==========
    const reportingData = await db
      .select({
        total: count(reportingSchedules.id),
        overdue: sql<number>`SUM(CASE WHEN ${reportingSchedules.reportDeadline} < NOW() AND ${reportingSchedules.reportStatus} != 'submitted' THEN 1 ELSE 0 END)`,
      })
      .from(reportingSchedules)
      .where(
        and(
          eq(reportingSchedules.projectId, projectId),
          eq(reportingSchedules.organizationId, organizationId),
          eq(reportingSchedules.isDeleted, 0)
        )
      )
      .then(r => r[0]);

    const overdueReports = Number(reportingData?.overdue || 0);

    if (overdueReports > 0) {
      triggers.push({
        triggerId: 'reporting_risk',
        name: 'Reporting Compliance Risk',
        description: `${overdueReports} report(s) are overdue`,
        severity: overdueReports > 2 ? 'critical' : 'warning',
        detectedAt: now,
        metrics: {
          overdueReports,
          totalReports: Number(reportingData?.total || 0),
        },
        recommendedAction: 'Submit overdue reports immediately to maintain donor compliance',
      });
    }

    // ========== TRIGGER 4: INDICATOR FAILURE ==========
    const indicatorData = await db
      .select({
        total: count(indicators.id),
        achieved: sql<number>`SUM(CASE WHEN CAST(${indicators.achievedValue} AS DECIMAL(15,2)) >= CAST(${indicators.target} AS DECIMAL(15,2)) THEN 1 ELSE 0 END)`,
      })
      .from(indicators)
      .where(
        and(
          eq(indicators.projectId, projectId),
          eq(indicators.organizationId, organizationId),
          eq(indicators.isDeleted, 0)
        )
      )
      .then(r => r[0]);

    const totalIndicators = Number(indicatorData?.total || 0);
    const achievedIndicators = Number(indicatorData?.achieved || 0);
    const indicatorAchievement = totalIndicators > 0 ? (achievedIndicators / totalIndicators) * 100 : 0;

    if (elapsedPercent > midpointPercent && indicatorAchievement < 40) {
      triggers.push({
        triggerId: 'indicator_failure',
        name: 'Indicator Achievement Failure',
        description: `Only ${Math.round(indicatorAchievement)}% of indicators achieved after project midpoint`,
        severity: 'critical',
        detectedAt: now,
        metrics: {
          elapsedPercent: Math.round(elapsedPercent),
          indicatorAchievement: Math.round(indicatorAchievement),
          achievedIndicators,
          totalIndicators,
        },
        recommendedAction: 'Review indicator targets and implementation strategy urgently',
      });
    }

    // ========== TRIGGER 5: ACTIVITY DELAY ==========
    const activityData = await db
      .select({
        total: count(activities.id),
        completed: sql<number>`SUM(CASE WHEN ${activities.status} = 'completed' THEN 1 ELSE 0 END)`,
        delayed: sql<number>`SUM(CASE WHEN ${activities.status} = 'delayed' THEN 1 ELSE 0 END)`,
      })
      .from(activities)
      .where(
        and(
          eq(activities.projectId, projectId),
          eq(activities.organizationId, organizationId),
          eq(activities.isDeleted, 0)
        )
      )
      .then(r => r[0]);

    const totalActivities = Number(activityData?.total || 0);
    const delayedActivities = Number(activityData?.delayed || 0);
    const delayedPercent = totalActivities > 0 ? (delayedActivities / totalActivities) * 100 : 0;

    if (delayedPercent > 30) {
      triggers.push({
        triggerId: 'activity_delay',
        name: 'Activity Delay Risk',
        description: `${Math.round(delayedPercent)}% of activities are delayed`,
        severity: 'warning',
        detectedAt: now,
        metrics: {
          delayedPercent: Math.round(delayedPercent),
          delayedActivities,
          totalActivities,
        },
        recommendedAction: 'Review activity timelines and identify bottlenecks',
      });
    }

    // ========== TRIGGER 6: BENEFICIARY GAP ==========
    const beneficiaryData = await db
      .select({
        total: count(activities.id),
        achieved: sql<number>`SUM(CASE WHEN CAST(${activities.achievedValue} AS DECIMAL(15,2)) >= CAST(${activities.target} AS DECIMAL(15,2)) THEN 1 ELSE 0 END)`,
      })
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.projectId, projectId),
          eq(beneficiaries.organizationId, organizationId),
          eq(beneficiaries.isDeleted, 0)
        )
      )
      .then(r => r[0]);

    const totalBeneficiaries = Number(beneficiaryData?.total || 0);
    const achievedBeneficiaries = Number(beneficiaryData?.achieved || 0);
    const beneficiaryAchievement = totalBeneficiaries > 0 ? (achievedBeneficiaries / totalBeneficiaries) * 100 : 0;

    if (elapsedPercent > midpointPercent && beneficiaryAchievement < 50) {
      triggers.push({
        triggerId: 'beneficiary_gap',
        name: 'Beneficiary Achievement Gap',
        description: `Only ${Math.round(beneficiaryAchievement)}% of beneficiary targets achieved after midpoint`,
        severity: 'warning',
        detectedAt: now,
        metrics: {
          elapsedPercent: Math.round(elapsedPercent),
          beneficiaryAchievement: Math.round(beneficiaryAchievement),
          achievedBeneficiaries,
          totalBeneficiaries,
        },
        recommendedAction: 'Accelerate beneficiary engagement activities',
      });
    }

    // ========== TRIGGER 7: ZERO SPENDING ==========
    if (elapsedPercent > 25 && totalSpent === 0) {
      triggers.push({
        triggerId: 'zero_spending',
        name: 'No Implementation Activity',
        description: 'Project has no recorded spending after 25% of timeline',
        severity: 'critical',
        detectedAt: now,
        metrics: {
          elapsedPercent: Math.round(elapsedPercent),
          totalSpent: 0,
          totalBudgeted,
        },
        recommendedAction: 'Verify project implementation status and initiate spending immediately',
      });
    }

    return { projectId, triggers };
  });
