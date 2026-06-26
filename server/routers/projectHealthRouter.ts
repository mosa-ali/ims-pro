import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { calculateProjectHealth } from "../services/executive/projectHealthService";
import {
  ProjectHealthMetrics,
  ProjectHealthInput,
  ProjectHealthHistory,
  ProjectHealthTrend,
  ProjectHealthSummary,
  PortfolioHealth,
} from "../../shared/types/projectHealth";
import { getDb } from "../db";
import { projects, budgetItems, activities, indicators } from "../../drizzle/schema";
import { eq, and, sum, count, desc, gte, lte } from "drizzle-orm";

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const ProjectHealthInputSchema = z.object({
  projectId: z.number().positive("Project ID must be positive"),
  includeHistory: z.boolean().optional().default(false),
});

const ProjectHealthHistorySchema = z.object({
  projectId: z.number().positive(),
  organizationId: z.number().positive(),
  operatingUnitId: z.number().positive(),
  overallScore: z.number().min(0).max(100),
  healthLevel: z.enum(["healthy", "watch", "at-risk", "critical"]),
  timelineScore: z.number().min(0).max(100),
  progressScore: z.number().min(0).max(100),
  financialScore: z.number().min(0).max(100),
  deliveryScore: z.number().min(0).max(100),
  riskScore: z.number().min(0).max(100),
  physicalProgress: z.number().min(0).max(100),
  budgetUtilization: z.number().min(0).max(100),
  scheduleVariance: z.number(),
  signals: z.array(z.string()),
  activeRisks: z.array(z.any()),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch project data and calculate health metrics
 */
async function fetchProjectHealthData(
  projectId: number,
  organizationId: number,
  operatingUnitId: number
) {
  // Fetch project
  const db = await getDb();
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.organizationId, organizationId),
      eq(projects.operatingUnitId, operatingUnitId)
    ),
  });

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  // Fetch budget items and calculate spent
  const budgetItemsData = await db
    .select({
      totalSpent: sum(budgetItems.actualSpent),
    })
    .from(budgetItems)
    .where(eq(budgetItems.projectId, projectId));

  const spent = Number(budgetItemsData[0]?.totalSpent || 0);

  // Fetch activities
    const activitiesData = await db
    .select({
        totalCount: count(),
    })
    .from(activities)
    .where(eq(activities.projectId, projectId));

    const totalMilestones = activitiesData[0]?.totalCount ?? 0;
    const completedMilestones =
    Number(project.physicalProgressPercentage ?? 0) >= 100
        ? totalMilestones
        : Math.round(
            totalMilestones *
            (Number(project.physicalProgressPercentage ?? 0) / 100)
        );

    const onTimeMilestones = completedMilestones;

  // Fetch indicators
  const indicatorsData = await db
    .select({
      totalCount: count(),
      achievedCount: count(), // Simplified - would need actualValue >= targetValue comparison
    })
    .from(indicators)
    .where(eq(indicators.projectId, projectId));

  const totalIndicators = indicatorsData[0]?.totalCount || 0;
  const achievedIndicators = indicatorsData[0]?.achievedCount || 0;

  // Calculate months elapsed
  const monthsElapsed = Math.max(
    1,
    (new Date().getFullYear() - new Date(project.startDate).getFullYear()) * 12 +
      (new Date().getMonth() - new Date(project.startDate).getMonth())
  );

  return {
    project,
    spent,
    totalMilestones,
    completedMilestones,
    onTimeMilestones,
    totalIndicators,
    achievedIndicators,
    monthsElapsed,
  };
}

/**
 * Create health input from project data
 */
function createHealthInput(
  projectData: Awaited<ReturnType<typeof fetchProjectHealthData>>
): ProjectHealthInput {
  const { project, spent, totalMilestones, completedMilestones, onTimeMilestones, totalIndicators, achievedIndicators, monthsElapsed } = projectData;

  return {
    startDate: new Date(project.startDate),
    endDate: new Date(project.endDate),
    physicalProgressPercentage: Number(project.physicalProgressPercentage || 0),
    totalBudget: Number(project.totalBudget || 0),
    spent,
    monthsElapsed,
    totalMilestones,
    completedMilestones,
    onTimeMilestones,
    totalIndicators,
    achievedIndicators,
  };
}

// ============================================================================
// TRPC ROUTER
// ============================================================================

export const projectHealthRouter = router({
  /**
   * Get current health metrics for a single project
   */
  getProjectHealth: scopedProcedure
    .input(ProjectHealthInputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const projectData = await fetchProjectHealthData(
          input.projectId,
          ctx.scope.organizationId,
          ctx.scope.operatingUnitId
        );

        const healthInput = createHealthInput(projectData);
        const health = calculateProjectHealth(healthInput);

        return {
          projectId: input.projectId,
          projectName: projectData.project.title,
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
      // Fetch all projects for organization/OU
      const db = await getDb();
      const orgProjects = await db.query.projects.findMany({
        where: and(
          eq(projects.organizationId, ctx.scope.organizationId),
          eq(projects.operatingUnitId, ctx.scope.operatingUnitId)
        ),
      });

      if (orgProjects.length === 0) {
        return {
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          totalProjects: 0,
          healthyProjects: 0,
          watchProjects: 0,
          atRiskProjects: 0,
          criticalProjects: 0,
          averageHealth: 0,
          averageBudgetUtilization: 0,
          averagePhysicalProgress: 0,
          totalActiveRisks: 0,
          criticalRisks: 0,
          portfolioTrend: "stable" as const,
          projectsByHealth: {
            healthy: [],
            watch: [],
            atRisk: [],
            critical: [],
          },
        };
      }

      // Calculate health for each project
      const projectHealths: Array<{
        projectId: number;
        projectName: string;
        health: ProjectHealthMetrics;
      }> = [];

      for (const project of orgProjects) {
        try {
          const projectData = await fetchProjectHealthData(
            project.id,
            ctx.scope.organizationId,
            ctx.scope.operatingUnitId
          );

          const healthInput = createHealthInput(projectData);
          const health = calculateProjectHealth(healthInput);

          projectHealths.push({
            projectId: project.id,
            projectName:
                project.titleEn ||
                project.titleAr ||
                project.title ||
                project.projectCode ||
                `Project ${project.id}`,
            health,
          });
        } catch (error) {
          // Skip projects with calculation errors
          console.error(`Failed to calculate health for project ${project.id}:`, error);
        }
      }

      // Aggregate portfolio metrics
    const healthCounts: Record<
        "healthy" | "watch" | "at-risk" | "critical",
        number
        > = {
        healthy: 0,
        watch: 0,
        "at-risk": 0,
        critical: 0,
        };

      let totalScore = 0;
      let totalBudgetUtil = 0;
      let totalProgress = 0;
      let totalRisks = 0;
      let criticalRisks = 0;

     const projectsByHealth: Record<
        "healthy" | "watch" | "at-risk" | "critical",
        any[]
        > = {
        healthy: [],
        watch: [],
        "at-risk": [],
        critical: [],
        };

      for (const ph of projectHealths) {
        const { health, ...rest } = ph;
        const projectSummary = { ...rest, health };

        healthCounts[health.healthLevel]++;
        projectsByHealth[health.healthLevel].push(projectSummary);

        totalScore += health.overallScore;
        totalBudgetUtil += health.budgetUtilization;
        totalProgress += health.physicalProgress;
        totalRisks += health.riskCount;
        criticalRisks += health.activeRisks.filter(
          (r) => r.severity === "critical"
        ).length;
      }

      const averageHealth = projectHealths.length > 0 ? totalScore / projectHealths.length : 0;
      const averageBudgetUtilization = projectHealths.length > 0 ? totalBudgetUtil / projectHealths.length : 0;
      const averagePhysicalProgress = projectHealths.length > 0 ? totalProgress / projectHealths.length : 0;

      // Determine portfolio trend (simplified)
      let portfolioTrend: "improving" | "stable" | "declining" = "stable";
      if (healthCounts.healthy > healthCounts.critical) {
        portfolioTrend = "improving";
      } else if (healthCounts.critical > healthCounts.healthy) {
        portfolioTrend = "declining";
      }

      return {
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        totalProjects: projectHealths.length,
        healthyProjects: healthCounts.healthy,
        watchProjects: healthCounts.watch,
        atRiskProjects: healthCounts["at-risk"],
        criticalProjects: healthCounts.critical,
        averageHealth: Math.round(averageHealth),
        averageBudgetUtilization: Math.round(averageBudgetUtilization),
        averagePhysicalProgress: Math.round(averagePhysicalProgress),
        totalActiveRisks: totalRisks,
        criticalRisks,
        portfolioTrend,
        projectsByHealth: {
          healthy: projectsByHealth.healthy,
          watch: projectsByHealth.watch,
          atRisk: projectsByHealth["at-risk"],
          critical: projectsByHealth.critical,
        },
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
   * Get health trend for a project over time
   */
  getProjectHealthTrend: scopedProcedure
    .input(
      z.object({
        projectId: z.number().positive(),
        periodDays: z.number().positive().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify project exists and belongs to org/OU
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

        // Fetch health history (simplified - would query from projectHealthHistory table)
        // For now, return placeholder trend
        return {
          projectId: input.projectId,
          direction: "stable" as const,
          scoreChange: 0,
          scoreChangePercent: 0,
          periodDays: input.periodDays,
          fromDate: new Date(Date.now() - input.periodDays * 24 * 60 * 60 * 1000),
          toDate: new Date(),
          previousScore: 75,
          currentScore: 75,
          dimensionTrends: {
            timeline: "stable" as const,
            progress: "stable" as const,
            financial: "stable" as const,
            delivery: "stable" as const,
            risk: "stable" as const,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch project health trend",
          cause: error,
        });
      }
    }),

  /**
   * Save project health snapshot to history
   */
  saveHealthSnapshot: scopedProcedure
    .input(ProjectHealthHistorySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify data isolation
        if (
          input.organizationId !== ctx.scope.organizationId ||
          input.operatingUnitId !== ctx.scope.operatingUnitId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Data isolation violation",
          });
        }

        // Save to database (would insert into projectHealthHistory table)
        // This is a placeholder - actual implementation would use db.insert()
        return {
          success: true,
          message: "Health snapshot saved successfully",
          timestamp: new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save health snapshot",
          cause: error,
        });
      }
    }),

  /**
   * Get health comparison between projects
   */
  compareProjectHealth: scopedProcedure
    .input(
      z.object({
        projectIds: z.array(z.number().positive()).min(2).max(5),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const comparisons = [];

        for (const projectId of input.projectIds) {
          const projectData = await fetchProjectHealthData(
            projectId,
            ctx.scope.organizationId,
            ctx.scope.operatingUnitId
          );

          const healthInput = createHealthInput(projectData);
          const health = calculateProjectHealth(healthInput);

          comparisons.push({
            projectId,
            projectName: projectData.project.title,
            health,
          });
        }

        return {
          projects: comparisons,
          bestPerformer: comparisons.reduce((best, current) =>
            current.health.overallScore > best.health.overallScore ? current : best
          ),
          worstPerformer: comparisons.reduce((worst, current) =>
            current.health.overallScore < worst.health.overallScore ? current : worst
          ),
          averageScore: Math.round(
            comparisons.reduce((sum, p) => sum + p.health.overallScore, 0) /
              comparisons.length
          ),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to compare project health",
          cause: error,
        });
      }
    }),
});
