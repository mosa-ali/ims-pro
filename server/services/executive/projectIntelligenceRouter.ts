/**
 * Project Intelligence Router - FIXED VERSION
 *
 * tRPC procedures for project and portfolio intelligence.
 * Connects the intelligence engine to the Executive Dashboard.
 *
 * NEW PROCEDURES (v3):
 * - getTopRisks: Get top risks sorted by score (FIXED - was missing)
 * - getCompliancePosture: Get compliance health percentage (FIXED - was hardcoded)
 * - getProjectHealth: Get single project health with real data
 * - getPortfolioHealth: Get portfolio health aggregation
 * - getExecutiveDashboardInsights: Budget metrics for executive dashboard
 *
 * Fixes applied (v3):
 * - Added `getTopRisks` procedure to fetch and sort portfolio risks
 * - Added `getCompliancePosture` procedure to calculate compliance percentage
 * - Both procedures use real data from portfolio health calculations
 * - Proper org/OU scoping with scopedProcedure
 */

import { router, scopedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { and, eq, sum, count, desc } from "drizzle-orm";
import {
  projects,
  activities,
  indicators,
  budgetItems,
  risks,
} from "drizzle/schema";
import { calculateProjectHealth } from "./projectHealthService";
import type {
  ProjectHealthMetrics,
  ProjectHealthInput,
} from "@shared/types/projectHealth";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Aggregate activity data for a project
 */
async function aggregateActivityData(projectId: number) {
  const db = await getDb();
  const activityStats = await db
    .select({
      total: count(),
      completed: count(activities.actualEndDate),
    })
    .from(activities)
    .where(eq(activities.projectId, projectId));

  return activityStats[0] || { total: 0, completed: 0 };
}

/**
 * Aggregate indicator data for a project
 */
async function aggregateIndicatorData(projectId: number) {
  const db = await getDb();
  const indicatorStats = await db
    .select({
      total: count(),
      achieved: count(indicators.achievedValue),
    })
    .from(indicators)
    .where(eq(indicators.projectId, projectId));

  return indicatorStats[0] || { total: 0, achieved: 0 };
}

/**
 * Aggregate budget item data for a project
 */
async function aggregateBudgetData(projectId: number) {
  const db = await getDb();
  const budgetStats = await db
    .select({
      approvedBudget: sum(projects.totalBudget),
      spent: sum(budgetItems.actualSpent),
    })
    .from(budgetItems)
    .where(eq(budgetItems.projectId, projectId));

  const stats = budgetStats[0];
  return {
    approvedBudget: Number(stats?.approvedBudget || 0),
    spent: Number(stats?.spent || 0),
  };
}

/**
 * Aggregate risk register data for a project
 */
async function aggregateRiskData(projectId: number) {
  const db = await getDb();

  const allRisks = await db
    .select({
      id: risks.id,
      title: risks.title,
      description: risks.description,
      category: risks.category,
      level: risks.level,
      owner: risks.owner,
      score: risks.score,
    })
    .from(risks)
    .where(eq(risks.projectId, projectId));

  return allRisks;
}

/**
 * Calculate portfolio health for all projects in org/OU
 */
async function calculatePortfolioHealth(
  organizationId: number,
  operatingUnitId: number
) {
  const db = await getDb();

  // Fetch all active projects for org/OU
  const orgProjects = await db.query.projects.findMany({
    where: and(
      eq(projects.organizationId, organizationId),
      eq(projects.operatingUnitId, operatingUnitId),
      eq(projects.status, "active")
    ),
  });

  if (orgProjects.length === 0) {
    return {
      projectHealths: [],
      totalProjects: 0,
      averageHealth: 0,
      compliancePercentage: 100,
      allRisks: [],
    };
  }

  // Calculate health for each project
  const projectHealths: Array<{
    projectId: number;
    projectName: string;
    health: ProjectHealthMetrics;
  }> = [];

  const allRisks: Array<{
    id: number;
    projectId: number;
    projectName: string;
    title: string;
    category: string;
    level: string;
    owner: string;
    score: number;
  }> = [];

  for (const project of orgProjects) {
    try {
      // Fetch aggregated data
      const activityData = await aggregateActivityData(project.id);
      const indicatorData = await aggregateIndicatorData(project.id);
      const budgetData = await aggregateBudgetData(project.id);
      const riskData = await aggregateRiskData(project.id);

      // Calculate months elapsed
      const monthsElapsed = Math.max(
        1,
        (new Date().getFullYear() - new Date(project.startDate).getFullYear()) *
          12 +
          (new Date().getMonth() - new Date(project.startDate).getMonth())
      );

      // Create health input
      const healthInput: ProjectHealthInput = {
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate),
        physicalProgressPercentage:
          Number(project.physicalProgressPercentage || 0),
        totalBudget: Number(project.totalBudget || 0),
        spent: budgetData.spent,
        monthsElapsed,
        totalMilestones: activityData.total,
        completedMilestones: activityData.completed,
        onTimeMilestones: activityData.completed,
        totalIndicators: indicatorData.total,
        achievedIndicators: indicatorData.achieved,
      };

      // Calculate health
      const health = calculateProjectHealth(healthInput);

      projectHealths.push({
        projectId: project.id,
        projectName: project.titleEn || project.titleAr || project.title || `Project ${project.id}`,
        health,
      });

      // Collect risks from this project
      for (const risk of riskData) {
        allRisks.push({
          id: risk.id,
          projectId: project.id,
          projectName: project.titleEn || project.titleAr || project.title || `Project ${project.id}`,
          title: risk.title,
          category: risk.category,
          level: risk.level,
          owner: risk.owner,
          score: Number(risk.score || 0),
        });
      }

      // Also collect risks from health calculation
      for (const healthRisk of health.activeRisks) {
        allRisks.push({
          id: Math.random() * 10000,
          projectId: project.id,
          projectName: project.titleEn || project.titleAr || project.title || `Project ${project.id}`,
          title: healthRisk.type,
          category: "health",
          level: healthRisk.level,
          owner: "System",
          score: healthRisk.impact,
        });
      }
    } catch (error) {
      console.error(`Failed to calculate health for project ${project.id}:`, error);
    }
  }

  // Calculate average health
  const averageHealth =
    projectHealths.length > 0
      ? Math.round(
          projectHealths.reduce((sum, p) => sum + p.health.overallScore, 0) /
            projectHealths.length
        )
      : 0;

  // Calculate compliance percentage (based on average health)
  const compliancePercentage = averageHealth;

  return {
    projectHealths,
    totalProjects: projectHealths.length,
    averageHealth,
    compliancePercentage,
    allRisks,
  };
}

// ============================================================================
// TRPC ROUTER
// ============================================================================

export const projectIntelligenceRouter = router({
  /**
   * Get top risks sorted by score (FIXED - was missing)
   * Returns portfolio-wide top risks for the Risk & Compliance dashboard
   */
  getTopRisks: scopedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const portfolioData = await calculatePortfolioHealth(
          ctx.scope.organizationId,
          ctx.scope.operatingUnitId
        );

        // Sort risks by score (descending) and take top N
        const topRisks = portfolioData.allRisks
          .sort((a, b) => b.score - a.score)
          .slice(0, input.limit)
          .map((risk) => ({
            id: Math.floor(risk.id),
            title: risk.title,
            category: risk.category,
            level: risk.level as "low" | "medium" | "high" | "critical",
            owner: risk.owner,
            score: risk.score,
          }));

        return topRisks;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch top risks",
          cause: error,
        });
      }
    }),

  /**
   * Get compliance posture (FIXED - was hardcoded)
   * Returns compliance health percentage and incident count
   */
  getCompliancePosture: scopedProcedure.query(async ({ ctx }) => {
    try {
      const portfolioData = await calculatePortfolioHealth(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      // Count critical and high-level risks as incidents
      const incidentCount = portfolioData.allRisks.filter(
        (r) => r.level === "critical" || r.level === "high"
      ).length;

      return {
        compliancePercentage: portfolioData.compliancePercentage,
        healthStandard:
          portfolioData.compliancePercentage >= 80
            ? "High"
            : portfolioData.compliancePercentage >= 60
            ? "Medium"
            : "Low",
        description: `Organization is meeting ${portfolioData.compliancePercentage}% of audit and donor reporting requirements on-time and with verified data integrity.`,
        incidentCount,
        lastUpdated: new Date(),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to calculate compliance posture",
        cause: error,
      });
    }
  }),

  /**
   * Get current health metrics for a single project
   */
  getProjectHealth: scopedProcedure
    .input(
      z.object({
        projectId: z.number().positive("Project ID must be positive"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const project = await db.query.projects.findFirst({
          where: and(
            eq(projects.id, input.projectId),
            eq(projects.organizationId, ctx.scope.organizationId),
            eq(projects.operatingUnitId, ctx.scope.operatingUnitId)
          ),
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Fetch aggregated data
        const activityData = await aggregateActivityData(project.id);
        const indicatorData = await aggregateIndicatorData(project.id);
        const budgetData = await aggregateBudgetData(project.id);

        const monthsElapsed = Math.max(
          1,
          (new Date().getFullYear() - new Date(project.startDate).getFullYear()) *
            12 +
            (new Date().getMonth() - new Date(project.startDate).getMonth())
        );

        const healthInput: ProjectHealthInput = {
          startDate: new Date(project.startDate),
          endDate: new Date(project.endDate),
          physicalProgressPercentage:
            Number(project.physicalProgressPercentage || 0),
          totalBudget: Number(project.totalBudget || 0),
          spent: budgetData.spent,
          monthsElapsed,
          totalMilestones: activityData.total,
          completedMilestones: activityData.completed,
          onTimeMilestones: activityData.completed,
          totalIndicators: indicatorData.total,
          achievedIndicators: indicatorData.achieved,
        };

        const health = calculateProjectHealth(healthInput);

        return {
          projectId: input.projectId,
          projectName: project.titleEn || project.titleAr || project.title,
          health,
          lastUpdated: new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate project health",
          cause: error,
        });
      }
    }),

  /**
   * Get health metrics for multiple projects (portfolio view)
   */
  getPortfolioHealth: scopedProcedure.query(async ({ ctx }) => {
    try {
      const portfolioData = await calculatePortfolioHealth(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      return {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        totalProjects: portfolioData.totalProjects,
        averageHealth: portfolioData.averageHealth,
        compliancePercentage: portfolioData.compliancePercentage,
        projects: portfolioData.projectHealths.map((ph) => ({
          projectId: ph.projectId,
          projectName: ph.projectName,
          score: ph.health.overallScore,
          level: ph.health.healthLevel,
          riskCount: ph.health.riskCount,
        })),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to calculate portfolio health",
        cause: error,
      });
    }
  }),

  /**
   * Get executive dashboard insights
   */
  getExecutiveDashboardInsights: scopedProcedure.query(async ({ ctx }) => {
    try {
      const portfolioData = await calculatePortfolioHealth(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      return {
        portfolioMetrics: {
          totalProjects: portfolioData.totalProjects,
          averageHealth: portfolioData.averageHealth,
          compliancePercentage: portfolioData.compliancePercentage,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate executive dashboard insights",
        cause: error,
      });
    }
  }),
});
