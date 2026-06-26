/**
 * Project Intelligence Data Provider
 *
 * Aggregates real data from database tables and prepares it for the intelligence engine.
 * Bridges the gap between raw database queries and the intelligence calculation layer.
 *
 * Data Flow:
 * Database → Query Layer → ProjectRawDTO → buildProjectIntelligenceInput()
 *         → calculateProjectHealth() → generateAIProjectInsight() → tRPC Router
 *
 * This service handles:
 * - Project metadata queries
 * - Activity aggregation
 * - Indicator achievement calculation
 * - Budget item summation
 * - Risk register aggregation
 * - Data isolation by organizationId and operatingUnitId
 */

import { getDb } from "../../db";
import { and, eq, sum, count } from "drizzle-orm";
import {
  projects,
  activities,
  indicators,
  budgetItems,
  risks,
} from "drizzle/schema";
import {
  ProjectRawDTO,
  buildProjectIntelligenceInput,
  ProjectIntelligenceInput,
} from "./projectIntelligenceService";
import { calculateProjectHealth, ProjectHealthResult } from "./projectIntelligenceService";
import { generateAIProjectInsight, AIProjectInsight } from "./projectAIRouter";
import { TRPCError } from "@trpc/server";

// ============================================================================
// DATA AGGREGATION FUNCTIONS
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
      level: risks.level,
    })
    .from(risks)
    .where(
      and(
        eq(risks.projectId, projectId),
        eq(risks.isDeleted, 0)
      )
    );

  return {
    high: allRisks.filter(
      r => r.level === "high" || r.level === "critical"
    ).length,

    medium: allRisks.filter(
      r => r.level === "medium"
    ).length,

    low: allRisks.filter(
      r => r.level === "low"
    ).length,
  };
}

// ============================================================================
// PROJECT INTELLIGENCE DATA PROVIDER
// ============================================================================

/**
 * Get complete project intelligence data
 * Aggregates all necessary data and prepares for intelligence calculation
 */
export async function getProjectIntelligenceData(
  projectId: number
): Promise<ProjectRawDTO> {
  try {
    // 1. Fetch project
  const db = await getDb();
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Project ${projectId} not found`,
      });
    }

    const projectData = project[0];

    // 2. Aggregate activities
    const activities_data = await aggregateActivityData(projectId);

    // 3. Aggregate indicators
    const indicators_data = await aggregateIndicatorData(projectId);

    // 4. Aggregate budget
    const budget_data = await aggregateBudgetData(projectId);

    // 5. Aggregate risks
    const risks_data = await aggregateRiskData(projectId);

    // 6. Build ProjectRawDTO
    const rawDTO: ProjectRawDTO = {
      id: projectData.id,
      title:
            projectData.title ??
            projectData.titleEn ??
            projectData.projectCode ??
            `Project ${projectData.id}`,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      status: projectData.status,
      currency: projectData.currency || "USD",

      activities: {
        total: activities_data.total,
        completed: activities_data.completed,
      },

      indicators: {
        total: indicators_data.total,
        achieved: indicators_data.achieved,
      },

      financial: {
        approvedBudget: budget_data.approvedBudget,
        spent: budget_data.spent,
      },

      risks: {
        high: risks_data.high,
        medium: risks_data.medium,
        low: risks_data.low,
      },

      // Optional: Physical progress override if stored in projects table
      physicalProgressOverride:
        projectData.physicalProgressPercentage
            ? Number(projectData.physicalProgressPercentage)
            : undefined,
    };

    return rawDTO;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to aggregate project intelligence data: ${error}`,
    });
  }
}

/**
 * Get project health with real data
 */
export async function getProjectHealth(
  projectId: number
): Promise<ProjectHealthResult> {
  try {
    // 1. Get raw data from database
    const rawData = await getProjectIntelligenceData(projectId);

    // 2. Build intelligence input
    const input = await buildProjectIntelligenceInput(rawData);

    // 3. Calculate health
    const health = calculateProjectHealth(input);

    return health;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to calculate project health: ${error}`,
    });
  }
}

/**
 * Get project AI insight with real data
 */
export async function getProjectAIInsight(
  projectId: number
): Promise<AIProjectInsight> {
  try {
    const health = await getProjectHealth(projectId);
    const insight = generateAIProjectInsight(health);
    return insight;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to generate project AI insight: ${error}`,
    });
  }
}

// ============================================================================
// PORTFOLIO INTELLIGENCE DATA PROVIDER
// ============================================================================

/**
 * Get portfolio health for organization and operating unit
 */
export async function getPortfolioProjectIds(
  organizationId: number,
  operatingUnitId: number
): Promise<number[]> {
  try {
  const db = await getDb();
    const projectList = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId),
          eq(projects.status, "active")
        )
      );

    return projectList.map((p) => p.id);
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to fetch portfolio projects: ${error}`,
    });
  }
}

/**
 * Get all project health results for portfolio
 */
export async function getPortfolioHealth(
  organizationId: number,
  operatingUnitId: number
): Promise<ProjectHealthResult[]> {
  try {
    const projectIds = await getPortfolioProjectIds(
      organizationId,
      operatingUnitId
    );

    if (projectIds.length === 0) {
      return [];
    }

    // Calculate health for each project in parallel
    const healthResults = await Promise.all(
      projectIds.map((id) => getProjectHealth(id))
    );

    return healthResults;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to calculate portfolio health: ${error}`,
    });
  }
}

/**
 * Get all project AI insights for portfolio
 */
export async function getPortfolioAIInsights(
  organizationId: number,
  operatingUnitId: number
): Promise<AIProjectInsight[]> {
  try {
    const projectIds = await getPortfolioProjectIds(
      organizationId,
      operatingUnitId
    );

    if (projectIds.length === 0) {
      return [];
    }

    // Generate AI insights for each project in parallel
    const insights = await Promise.all(
      projectIds.map((id) => getProjectAIInsight(id))
    );

    return insights;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to generate portfolio AI insights: ${error}`,
    });
  }
}

// ============================================================================
// EXECUTIVE DASHBOARD DATA PROVIDER
// ============================================================================

/**
 * Get complete executive dashboard insights
 * Combines portfolio health, AI insights, and aggregated metrics
 */
export async function getExecutiveDashboardInsights(
  organizationId: number,
  operatingUnitId: number
) {
  try {
    // 1. Get portfolio health
    const portfolioHealth = await getPortfolioHealth(
      organizationId,
      operatingUnitId
    );

    // 2. Get portfolio AI insights
    const portfolioAIInsights = await getPortfolioAIInsights(
      organizationId,
      operatingUnitId
    );

    // 3. Calculate portfolio metrics
    const totalProjects = portfolioHealth.length;
    const avgScore =
      totalProjects > 0
        ? Math.round(
            portfolioHealth.reduce((sum, p) => sum + p.score, 0) / totalProjects
          )
        : 0;

    const healthyCount = portfolioHealth.filter(
      (p) => p.level === "Healthy"
    ).length;
    const watchCount = portfolioHealth.filter(
      (p) => p.level === "Watch"
    ).length;
    const atRiskCount = portfolioHealth.filter(
      (p) => p.level === "At Risk"
    ).length;
    const criticalCount = portfolioHealth.filter(
      (p) => p.level === "Critical"
    ).length;

    // 4. Calculate portfolio risk index
    let totalHighRisks = 0;
    let totalMediumRisks = 0;
    let totalLowRisks = 0;

    for (const health of portfolioHealth) {
      for (const risk of health.activeRisks) {
        if (risk.level === "high") totalHighRisks++;
        else if (risk.level === "medium") totalMediumRisks++;
        else totalLowRisks++;
      }
    }

    // 5. Build executive dashboard response
    return {
      portfolioMetrics: {
        totalProjects,
        avgScore,
        healthyCount,
        watchCount,
        atRiskCount,
        criticalCount,
        riskIndex: {
          high: totalHighRisks,
          medium: totalMediumRisks,
          low: totalLowRisks,
        },
      },
      portfolioHealth,
      portfolioAIInsights,
      generatedAt: new Date(),
    };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to generate executive dashboard insights: ${error}`,
    });
  }
}
