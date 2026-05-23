/**
 * ============================================================================
 * GET PROJECT HEALTH SCORE PROCEDURE - IMPROVED
 * ============================================================================
 * 
 * Calculates intelligent project health status using weighted scoring:
 * - Timeline Health (25%): Days remaining, project duration, elapsed time
 * - Budget Health (25%): Utilization, burn velocity, spending patterns
 * - Activity Health (20%): Completion rate, delays, progress
 * - Indicator Health (15%): Achievement rate, target progress
 * - Reporting Health (10%): Compliance, overdue reports
 * - Beneficiary Health (5%): Achievement vs target
 * 
 * Returns: Health status (Completed, Healthy, Watch, At Risk, Critical)
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
import { eq, and, count, sql, sum, isNull, lte } from "drizzle-orm";

export const getProjectHealthScoreProcedure = scopedProcedure
  .input(
    z.object({
      projectId: z.number(),
      organizationId: z.number(),
    })
  )
  .query(async ({ ctx, input }) => {
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
      return {
        projectId,
        healthStatus: 'unknown',
        healthScore: 0,
        scores: {},
        risks: [],
      };
    }

    const now = new Date();
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    // ========== 1. TIMELINE HEALTH (25%) ==========
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    const remainingDuration = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(remainingDuration / (1000 * 60 * 60 * 24));
    const elapsedPercent = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;
    const isExpired = now > endDate;

    let timelineScore = 100;
    const timelineRisks: string[] = [];

    if (isExpired) {
      timelineScore = 20;
      timelineRisks.push('Project expired');
    } else if (daysRemaining < 20) {
      timelineScore = 50;
      timelineRisks.push('Project ending soon (<20 days)');
    } else if (daysRemaining < 60) {
      timelineScore = 75;
      timelineRisks.push('Project ending in <60 days');
    }

    // ========== 2. BUDGET HEALTH (25%) ==========
    const budgetData = await db
      .select({
        totalBudgeted: sum(budgetItems.totalBudgetLine),
        totalSpent: sum(budgetItems.actualSpent),
        itemCount: count(budgetItems.id),
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

    let budgetScore = 100;
    const budgetRisks: string[] = [];

    // Over budget risk
    if (budgetUtilization > 100) {
      budgetScore = 20;
      budgetRisks.push(`Over budget: ${Math.round(budgetUtilization)}% spent`);
    }
    // Burn risk: high spending early
    else if (elapsedPercent < 40 && budgetUtilization > 80) {
      budgetScore = 40;
      budgetRisks.push('Budget overspend risk: High burn rate early');
    }
    // Under-spending risk: low spending late
    else if (elapsedPercent > 70 && budgetUtilization < 20) {
      budgetScore = 40;
      budgetRisks.push('Implementation delay risk: Low spending after 70% timeline');
    }
    // Zero spending risk
    else if (elapsedPercent > 25 && totalSpent === 0) {
      budgetScore = 30;
      budgetRisks.push('No expenditures recorded after 25% timeline');
    }
    // Normal high utilization
    else if (budgetUtilization > 85) {
      budgetScore = 75;
    }
    // Normal utilization
    else if (budgetUtilization > 50) {
      budgetScore = 90;
    }

    // ========== 3. ACTIVITY HEALTH (20%) ==========
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
    const completedActivities = Number(activityData?.completed || 0);
    const delayedActivities = Number(activityData?.delayed || 0);
    const activityCompletion = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
    const delayedPercent = totalActivities > 0 ? (delayedActivities / totalActivities) * 100 : 0;

    let activityScore = 100;
    const activityRisks: string[] = [];

    if (totalActivities === 0) {
      activityScore = 50;
      activityRisks.push('No activities defined');
    } else if (delayedPercent > 30) {
      activityScore = 40;
      activityRisks.push(`${Math.round(delayedPercent)}% activities delayed`);
    } else if (elapsedPercent > 50 && activityCompletion < 30) {
      activityScore = 40;
      activityRisks.push('Low activity completion after 50% timeline');
    } else if (activityCompletion < 50) {
      activityScore = 60;
    } else if (activityCompletion < 80) {
      activityScore = 80;
    }

    // ========== 4. INDICATOR HEALTH (15%) ==========
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

    let indicatorScore = 100;
    const indicatorRisks: string[] = [];

    if (totalIndicators === 0) {
      indicatorScore = 50;
      indicatorRisks.push('No indicators defined');
    } else if (elapsedPercent > 50 && indicatorAchievement < 40) {
      indicatorScore = 30;
      indicatorRisks.push('Indicator failure: <40% achieved after midpoint');
    } else if (indicatorAchievement < 50) {
      indicatorScore = 50;
      indicatorRisks.push(`Low indicator achievement: ${Math.round(indicatorAchievement)}%`);
    } else if (indicatorAchievement < 80) {
      indicatorScore = 75;
    }

    // ========== 5. REPORTING HEALTH (10%) ==========
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

    const totalReports = Number(reportingData?.total || 0);
    const overdueReports = Number(reportingData?.overdue || 0);

    let reportingScore = 100;
    const reportingRisks: string[] = [];

    if (overdueReports > 0) {
      reportingScore = overdueReports > 2 ? 30 : 60;
      reportingRisks.push(`${overdueReports} overdue reports`);
    }

    // ========== 6. BENEFICIARY HEALTH (5%) ==========
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

    let beneficiaryScore = 100;
    const beneficiaryRisks: string[] = [];

    if (totalBeneficiaries === 0) {
      beneficiaryScore = 50;
      beneficiaryRisks.push('No beneficiaries tracked');
    } else if (beneficiaryAchievement < 50) {
      beneficiaryScore = 60;
      beneficiaryRisks.push(`Low beneficiary achievement: ${Math.round(beneficiaryAchievement)}%`);
    }

    // ========== CALCULATE WEIGHTED SCORE ==========
    const weightedScore =
      (timelineScore * 0.25) +
      (budgetScore * 0.25) +
      (activityScore * 0.20) +
      (indicatorScore * 0.15) +
      (reportingScore * 0.10) +
      (beneficiaryScore * 0.05);

    // ========== DETERMINE HEALTH STATUS ==========
    let healthStatus: 'Completed' | 'Healthy' | 'Watch' | 'At Risk' | 'Critical' = 'Healthy';

    if (project.status === 'completed') {
      healthStatus = 'Completed';
    } else if (weightedScore >= 80) {
      healthStatus = 'Healthy';
    } else if (weightedScore >= 60) {
      healthStatus = 'Watch';
    } else if (weightedScore >= 40) {
      healthStatus = 'At Risk';
    } else {
      healthStatus = 'Critical';
    }

    // Aggregate all risks
    const allRisks = [
      ...timelineRisks,
      ...budgetRisks,
      ...activityRisks,
      ...indicatorRisks,
      ...reportingRisks,
      ...beneficiaryRisks,
    ];

    return {
      projectId,
      healthStatus,
      healthScore: Math.round(weightedScore),
      scores: {
        timeline: Math.round(timelineScore),
        budget: Math.round(budgetScore),
        activity: Math.round(activityScore),
        indicator: Math.round(indicatorScore),
        reporting: Math.round(reportingScore),
        beneficiary: Math.round(beneficiaryScore),
      },
      metrics: {
        daysRemaining,
        elapsedPercent: Math.round(elapsedPercent),
        budgetUtilization: Math.round(budgetUtilization),
        activityCompletion: Math.round(activityCompletion),
        indicatorAchievement: Math.round(indicatorAchievement),
        beneficiaryAchievement: Math.round(beneficiaryAchievement),
        overdueReports,
      },
      risks: allRisks,
    };
  });
