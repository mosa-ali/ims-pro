import { router, scopedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { projects, grants, projectGovernorates, operatingUnits, budgetItems, budgets, expenses, beneficiaries, reportingSchedules, risks, donors, hrEmployees, pipelineOpportunities, countries, governorates } from "../../drizzle/schema";
import { todaySqlDate } from "../db/_time";
import { FinancialAnalyticsService, ExecutiveAlertsService } from "../services/executive/FinancialAnalyticsService";
import { BudgetValidationService } from "../services/executive/BudgetValidationService";
import { generateExecutiveAlerts } from "../services/executive/Executivedashboardalerts";
import { AIInsightsService } from "../services/executive/AIInsightsService";

import {
  COUNTRY_GOVERNORATE_COORDINATES
} from "../db/countryGovernorateCoordinates";
import {
  eq,
  and,
  sql,
  sum,
  count,
  desc,
  lte,
  or,
  isNull,
  inArray,
  isNotNull,
  not
} from "drizzle-orm";
import {
  PROJECT_STATUS,
  GRANT_STATUS,
  RISK_STATUS,
  PAYMENT_STATUS,
  PR_STATUS,
  CONTRACT_STATUS,
  STOCK_REQUEST_STATUS,
  LEAVE_REQUEST_STATUS,
  RFQ_STATUS,
  JOB_STATUS,
  TASK_STATUS,
  MEAL_DQA_STATUS,
} from "../db/_status";

// ============================================================================
// STRUCTURED LOGGER
// ============================================================================

const LOG_LEVEL = process.env.NODE_ENV === "production" ? "error" : "debug";

const logger = {
  error(context: string, error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    if (LOG_LEVEL === "error" || LOG_LEVEL === "debug") {
      console.error(
        JSON.stringify({
          level: "error",
          service: "dashboard",
          context,
          message: msg,
          stack,
          timestamp: new Date().toISOString(),
        })
      );
    }
  },
};


// ============================================================================
// SCOPED FILTER BUILDER
// ============================================================================

type ScopeContext = {
  organizationId: number;
  operatingUnitId: number | null | undefined;
};

function scopedFilters(
  table: { organizationId: any; operatingUnitId?: any; isDeleted?: any },
  scope: ScopeContext,
  options?: { skipOu?: boolean; ouNullable?: boolean }
) {
  const filters: any[] = [eq(table.organizationId, scope.organizationId)];

  if (!options?.skipOu && table.operatingUnitId && scope.operatingUnitId) {
    if (options?.ouNullable) {
      filters.push(
        or(isNull(table.operatingUnitId), eq(table.operatingUnitId, scope.operatingUnitId))
      );
    } else {
      filters.push(eq(table.operatingUnitId, scope.operatingUnitId));
    }
  }

  if (table.isDeleted) {
    filters.push(eq(table.isDeleted, 0));
  }

  return filters;
}

export const executiveDashboardRouter = router({

    // ========================================================================
    // PROCEDURE 1: getStats
    // Returns: activeProjects, completedProjects, totalEmployees, totalBudget,
    //          totalSpent, budgetExecution, utilization, activeGrants, projectCompliance
    // ========================================================================
    // PROCEDURE: getStats - COMPLETE VERSION
// Returns all dashboard statistics including project, budget, compliance, and risk metrics
// ========================================================================

// PROCEDURE: getStats - CORRECTED VERSION
// Fixed to match actual database schema
// ========================================================================

// PROCEDURE: getStats - FIXED DECIMAL CONVERSION
// Fixed budget calculation to properly convert decimals to numbers
// ========================================================================

getStats: scopedProcedure
  .input(z.object({}))
  .query(async ({ ctx }) => {
    const scope = {
      organizationId: ctx.scope.organizationId,
      operatingUnitId: ctx.scope.operatingUnitId,
    };
    const db = await getDb();

    const emptyResult = {
      // Project Metrics
      activeProjects: 0,
      completedProjects: 0,
      totalProjects: 0,
      onHoldProjects: 0,
      planningProjects: 0,
      
      // Budget Metrics
      totalBudget: 0,
      totalSpent: 0,
      remainingBalance: 0,
      budgetExecution: 0,
      burnRate: 0,
      
      // Resource Metrics
      totalEmployees: 0,
      utilization: 0,
      
      // Donor & Beneficiary Metrics
      activeGrants: 0,
      activeDonors: 0,
      beneficiariesReached: 0,
      
      // Compliance Metrics
      complianceScore: 0,
      
      // Funding Metrics
      fundingPipeline: 0,
      
      // Location
      ouCountry: '',
    };

    if (!db) return emptyResult;

    try {
      // Get operating unit country if available
      let ouCountry = '';
      if (scope.operatingUnitId) {
        const ouResult = await db
          .select({ country: operatingUnits.country })
          .from(operatingUnits)
          .where(eq(operatingUnits.id, scope.operatingUnitId))
          .limit(1);
        ouCountry = ouResult[0]?.country || '';
      }

      const [
        allProjectsList,
        activeProjectsList,
        completedProjectsList,
        onHoldProjectsList,
        planningProjectsList,
        empResult,
        grantResult,
        donorResult,
        beneficiaryResult,
        fundingPipelineResult,
      ] = await Promise.all([
        // All projects with budget info
        db
          .select({ 
            totalBudget: projects.totalBudget, 
            spent: projects.spent,
            status: projects.status,
          })
          .from(projects)
          .where(and(...scopedFilters(projects, scope))),

        // Active projects count
        db
          .select({ c: count() })
          .from(projects)
          .where(
            and(
              ...scopedFilters(projects, scope),
              eq(projects.status, PROJECT_STATUS.ACTIVE)
            )
          ),

        // Completed projects count
        db
          .select({ c: count() })
          .from(projects)
          .where(
            and(
              ...scopedFilters(projects, scope),
              eq(projects.status, PROJECT_STATUS.COMPLETED)
            )
          ),

        // On hold projects count
        db
          .select({ c: count() })
          .from(projects)
          .where(
            and(
              ...scopedFilters(projects, scope),
              eq(projects.status, PROJECT_STATUS.ON_HOLD)
            )
          ),

        // Planning projects count
        db
          .select({ c: count() })
          .from(projects)
          .where(
            and(
              ...scopedFilters(projects, scope),
              eq(projects.status, PROJECT_STATUS.PLANNING)
            )
          ),

        // Total employees
        db
          .select({ total: count() })
          .from(hrEmployees)
          .where(and(...scopedFilters(hrEmployees, scope))),

        // Active grants (status = 'ongoing')
        db
          .select({ total: count() })
          .from(grants)
          .where(
            and(
              ...scopedFilters(grants, scope, { ouNullable: true }),
              eq(grants.status, GRANT_STATUS.ACTIVE) // 'ongoing'
            )
          ),

        // Active donors (isActive = 1)
        db
          .select({ total: count() })
          .from(donors)
          .where(
            and(
              ...scopedFilters(donors, scope, { ouNullable: true }),
              eq(donors.isActive, 1) // Use isActive boolean, not status
            )
          ),

        // Beneficiaries reached (count from beneficiaries table)
        db
          .select({ total: count() })
          .from(beneficiaries)
          .where(and(...scopedFilters(beneficiaries, scope))),

        // Funding pipeline (grants with status = 'pending' or 'draft')
        db
          .select({ total: count() })
          .from(grants)
          .where(
            and(
              ...scopedFilters(grants, scope, { ouNullable: true }),
              inArray(grants.status, [GRANT_STATUS.PENDING, GRANT_STATUS.DRAFT])
            )
          ),
      ]);

      // Calculate metrics
      const totalProjects = allProjectsList.length;
      const activeProjects = activeProjectsList[0]?.c ?? 0;
      const completedProjects = completedProjectsList[0]?.c ?? 0;
      const onHoldProjects = onHoldProjectsList[0]?.c ?? 0;
      const planningProjects = planningProjectsList[0]?.c ?? 0;

      // ✅ FIX: Properly convert DECIMAL to number
      const totalBudget = allProjectsList.reduce((sum, project) => {
        const budget = project.totalBudget 
          ? Number(project.totalBudget)  // Convert decimal string to number
          : 0;
        return sum + budget;
      }, 0);

      const totalSpent = allProjectsList.reduce((sum, project) => {
        const spent = project.spent 
          ? Number(project.spent)  // Convert decimal string to number
          : 0;
        return sum + spent;
      }, 0);

      const remainingBalance = totalBudget - totalSpent;

      // ✅ FIX: Ensure percentage is calculated correctly (0-100 range)
      // budgetExecution = (totalSpent / totalBudget) * 100
      // This should be between 0-100%, not 0-10000%
      const budgetExecution =
        totalBudget > 0
          ? Number(
              (
                (totalSpent / totalBudget) * 100
              ).toFixed(2)
            )
          : 0;

      // ✅ FIX: Burn rate should be spending per project (not multiplied by 100 again)
      const burnRate = 
        totalProjects > 0 
          ? Math.round((totalSpent / totalProjects) * 100) / 100  // Average spend per project
          : 0;

      // Utilization is same as budget execution (0-100%)
      const utilization = budgetExecution;

      // Compliance score (based on completed vs total projects) - 0-100%
      const complianceScore = 
        totalProjects > 0 
          ? Math.round((completedProjects / totalProjects) * 100) 
          : 0;

      // Beneficiaries reached
      const beneficiariesReached = Number(beneficiaryResult[0]?.total ?? 0);

      // Funding pipeline
      const fundingPipeline = Number(fundingPipelineResult[0]?.total ?? 0);

      return {
        // Project Metrics
        activeProjects: Number(activeProjects),
        completedProjects: Number(completedProjects),
        totalProjects,
        onHoldProjects: Number(onHoldProjects),
        planningProjects: Number(planningProjects),

        // Budget Metrics (all as numbers, not percentages)
        totalBudget,
        totalSpent,
        remainingBalance,
        budgetExecution,  // 0-100%
        burnRate,         // Average spend per project

        // Resource Metrics
        totalEmployees: Number(empResult[0]?.total ?? 0),
        utilization,      // 0-100%

        // Donor & Beneficiary Metrics
        activeGrants: Number(grantResult[0]?.total ?? 0),
        activeDonors: Number(donorResult[0]?.total ?? 0),
        beneficiariesReached,

        // Compliance Metrics
        complianceScore,  // 0-100%

        // Funding Metrics
        fundingPipeline,

        // Location
        ouCountry,
      };
    } catch (error) {
      logger.error('getStats', error);
      return emptyResult;
    }
  }),

/**
 * getGeographicDistribution (ENRICHED VERSION)
 */
getGeographicDistribution: scopedProcedure.query(async ({ ctx }) => {
  const db = await getDb();
  const { organizationId, operatingUnitId } = ctx.scope;

  const res = await db
    .select({
      country: projects.country,
      governorate: projects.governorate,
      totalBudget: sum(projects.totalBudget),
      totalSpent: sum(projects.spent),
      projectCount: count(),
      beneficiaryCount: sum(projects.beneficiaryCount),
    })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.operatingUnitId, operatingUnitId),
        eq(projects.isDeleted, 0)
      )
    )
    .groupBy(projects.country, projects.governorate);

  return res.map((r) => {
    const countryKey = r.country ?? "";

    const countryInfo =
      COUNTRY_GOVERNORATE_COORDINATES[
        countryKey as keyof typeof COUNTRY_GOVERNORATE_COORDINATES
      ];

    const govKey = (r.governorate ?? "").toLowerCase();

    const governorateInfo =
      countryInfo?.governorates?.[govKey];

    return {
      country: r.country ?? "",
      governorate: r.governorate ?? "",

      totalBudget: Number(r.totalBudget ?? 0),
      totalSpent: Number(r.totalSpent ?? 0),
      projectCount: Number(r.projectCount ?? 0),
      beneficiaryCount: Number(r.beneficiaryCount ?? 0),

      lat:
        governorateInfo?.lat ??
        countryInfo?.center?.lat ??
        0,

      lng:
        governorateInfo?.lng ??
        countryInfo?.center?.lng ??
        0,
    };
  });
}),

getForecastingData: scopedProcedure.query(async ({ ctx }) => {
  const { organizationId, operatingUnitId } = ctx.scope;

  const financials =
    await FinancialAnalyticsService.getPortfolioFinancials(
      organizationId,
      operatingUnitId
    );

  const monthlyTrend =
    await FinancialAnalyticsService.getMonthlySpendingTrend(
      organizationId,
      12
    );

  const totalSpent = monthlyTrend.reduce(
    (sum, i) => sum + Number(i.spent || 0),
    0
  );

  const avgMonthlyBurn =
    monthlyTrend.length > 0
      ? totalSpent / monthlyTrend.length
      : 0;

  const projectedExhaustionMonths =
    avgMonthlyBurn > 0
      ? financials.totalRemaining / avgMonthlyBurn
      : 0;

  const forecastStatus =
    projectedExhaustionMonths < 3
      ? "critical"
      : projectedExhaustionMonths < 6
      ? "warning"
      : "healthy";

  return {
    forecastStatus,
    projectedExhaustionMonths: Math.round(projectedExhaustionMonths),
    avgMonthlyBurn,
    remainingBalance: financials.totalRemaining,

    monthlyTrend: monthlyTrend.map((row, i) => {
      const actual = Number(row.spent || 0);

      const prev = Number(monthlyTrend[i - 1]?.spent || actual);

      const forecast = i === 0 ? actual : prev * 1.05;

      return {
        month: row.month,
        actual,
        forecast,
        variance: forecast - actual,
       };
      }
    ),
  };
}),

  /**
   * getPortfolioTrends
   */
  getPortfolioTrends: scopedProcedure.query(async ({ ctx }) => {
  const { organizationId } = ctx.scope;

  const trend =
    await FinancialAnalyticsService.getMonthlySpendingTrend(
      organizationId,
      12
    );

  return trend.map(item => ({
    month: item.month,
    budgeted: item.spent,
    spent: item.spent,
    variance: 0
  }));
}),

/**
 * getExecutiveAlerts
 */
getExecutiveAlerts: scopedProcedure.query(async ({ ctx }) => {
  return generateExecutiveAlerts(
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId,
  );
}),

/**
 * getAIInsights
 * Temporary dynamic recommendations
 */
getAIInsights: scopedProcedure.query(async ({ ctx }) => {
  return AIInsightsService.getExecutiveRecommendations(
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId,
  );
}),

getGeographicProjects: scopedProcedure.query(
  async ({ ctx }) => {

    const db = await getDb();

    const {
      organizationId,
      operatingUnitId
    } = ctx.scope;

    const rows = await db
      .select({
        projectId: projects.id,
        projectCode: projects.projectCode,
        projectTitle: projects.titleEn,
        totalBudget: projects.totalBudget,
        totalSpent: projects.spent,
        beneficiaries: projects.beneficiaryCount,
        status: projects.status,

        governorateId:
          governorates.id,

        governorateName:
          governorates.name,

        countryName:
          countries.name,
      })
      .from(projects)

      .leftJoin(
        projectGovernorates,
        eq(
          projectGovernorates.projectId,
          projects.id
        )
      )

      .leftJoin(
        governorates,
        eq(
          governorates.id,
          projectGovernorates.governorateId
        )
      )

      .leftJoin(
        countries,
        eq(
          countries.id,
          governorates.countryId
        )
      )

      .where(
        and(
          eq(
            projects.organizationId,
            organizationId
          ),

          eq(
            projects.operatingUnitId,
            operatingUnitId
          ),

          eq(
            projects.isDeleted,
            0
          )
        )
      );

    const grouped =
      new Map<number, any>();

    rows.forEach((row) => {

      if (!grouped.has(row.projectId)) {

        grouped.set(
          row.projectId,
          {
            projectId:
              row.projectId,

            projectCode:
              row.projectCode,

            projectTitle:
              row.projectTitle,

            totalBudget:
              Number(
                row.totalBudget ?? 0
              ),

            totalSpent:
              Number(
                row.totalSpent ?? 0
              ),

            beneficiaries:
              Number(
                row.beneficiaries ?? 0
              ),

            status:
              row.status,

            governorates: [],
          }
        );
      }

      if (
        row.governorateId
      ) {

        grouped
          .get(row.projectId)
          .governorates.push({
            governorateId:
              row.governorateId,

            governorateName:
              row.governorateName,

            country:
              row.countryName,
          });
      }
    });

    return Array.from(
      grouped.values()
    );
  }
),

getPortfolioProjects: scopedProcedure.query(async ({ ctx }) => {
  const db = await getDb();

  const { organizationId, operatingUnitId } = ctx.scope;

  return db
    .select({
      id: projects.id,
      projectCode: projects.projectCode,
      title: projects.title,
      status: projects.status,
      currency: projects.currency,
      physicalProgressPercentage:
        projects.physicalProgressPercentage,

      totalBudget: projects.totalBudget,

      // ✅ FIXED: real spent from budget_items
      totalSpent: sql<number>`
        COALESCE(SUM(${budgetItems.actualSpent}), 0)
      `.as("totalSpent"),
    })
    .from(projects)

    // 🔗 join budget table
    .leftJoin(
      budgetItems,
      eq(budgetItems.projectId, projects.id)
    )

    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.operatingUnitId, operatingUnitId),
        eq(projects.isDeleted, 0)
      )
    )

    // 🔥 REQUIRED for aggregation
    .groupBy(
      projects.id,
      projects.projectCode,
      projects.title,
      projects.status,
      projects.physicalProgressPercentage,
      projects.totalBudget
    )

    .orderBy(desc(projects.updatedAt))
    .limit(10);
}),

getTopDonors: scopedProcedure.query(
  async ({ ctx }) => {
    const db = await getDb();

    const { organizationId, operatingUnitId } = ctx.scope;

    return db
      .select({
        donorName: projects.donor,

        currency: projects.currency,

        activeGrants: sql<number>`
          COUNT(DISTINCT ${projects.grantId})
        `.as("activeGrants"),

        activeProjects: sql<number>`
          COUNT(DISTINCT ${projects.id})
        `.as("activeProjects"),

        totalValue: sql<number>`
          COALESCE(SUM(${projects.totalBudget}), 0)
        `.as("totalValue"),
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId),
          eq(projects.isDeleted, 0),
          isNotNull(projects.donor),
          isNotNull(projects.currency)
        )
      )
      .groupBy(
        projects.donor,
        projects.currency
      )
      .orderBy(
        desc(
          sql`COALESCE(SUM(${projects.totalBudget}), 0)`
        )
      )
      .limit(5);
  }
),

getDonorPortfolioSummary: scopedProcedure.query(
  async ({ ctx }) => {
    const db = await getDb();

    const { organizationId, operatingUnitId } =
      ctx.scope;

    const donors = await db
      .select({
        donorName: projects.donor,

        totalValue: sql<number>`
          COALESCE(SUM(${projects.totalBudget}),0)
        `.as("totalValue"),
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId),
          eq(projects.isDeleted, 0),
          isNotNull(projects.donor)
        )
      )
      .groupBy(projects.donor);

    const totalPortfolio =
      donors.reduce(
        (sum, d) =>
          sum + Number(d.totalValue ?? 0),
        0
      );

    const topTwo =
      donors
        .sort(
          (a, b) =>
            Number(b.totalValue) -
            Number(a.totalValue)
        )
        .slice(0, 2)
        .reduce(
          (sum, d) =>
            sum + Number(d.totalValue ?? 0),
          0
        );

    const concentration =
      totalPortfolio > 0
        ? Math.round(
            (topTwo / totalPortfolio) * 100
          )
        : 0;

    return {
      totalDonors: donors.length,
      concentration,
      totalPortfolio,
    };
  }
),

getExecutiveFinanceSummary: scopedProcedure.query(async ({ ctx }) => {
  const db = await getDb();
  const { organizationId, operatingUnitId } = ctx.scope;

  // 1. Budget per project
  const projectRows = await db
    .select({
      id: projects.id,
      totalBudget: projects.totalBudget,
    })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.operatingUnitId, operatingUnitId),
        eq(projects.isDeleted, 0)
      )
    );

  // 2. REAL spent from budget_items (CRITICAL FIX)
  const spentRows = await db
    .select({
      projectId: budgetItems.projectId,
      spent: sql<number>`SUM(${budgetItems.actualSpent})`,
    })
    .from(budgetItems)
    .groupBy(budgetItems.projectId);

  const spentMap = new Map(
    spentRows.map((s) => [s.projectId, Number(s.spent || 0)])
  );

  // 3. totals
  let totalBudget = 0;
  let totalSpent = 0;

  for (const p of projectRows) {
    const budget = Number(p.totalBudget || 0);
    const spent = spentMap.get(p.id) || 0;

    totalBudget += budget;
    totalSpent += spent;
  }

  const utilization =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // 4. monthly aggregation
  const monthly = await db
    .select({
      month: sql<string>`DATE_FORMAT(${budgetItems.updatedAt}, '%b')`,
      spent: sql<number>`SUM(${budgetItems.actualSpent})`,
    })
    .from(budgetItems)
    .groupBy(sql`DATE_FORMAT(${budgetItems.updatedAt}, '%Y-%m')`);

  return {
    totalBudget,
    totalSpent,
    utilization,
    monthlySpend: monthly,
  };
}),

  getFinancialAnalytics: scopedProcedure.query(
  async ({ ctx }) => {
    const db = await getDb();

    const { organizationId, operatingUnitId } =
      ctx.scope;

    const projectFinancials = await db
      .select({
        projectId: projects.id,

        totalBudget: projects.totalBudget,

        totalSpent: sql<number>`
          COALESCE(
            SUM(${budgetItems.actualSpent}),
            0
          )
        `,
      })
      .from(projects)
      .leftJoin(
        budgetItems,
        eq(
          budgetItems.projectId,
          projects.id
        )
      )
      .where(
        and(
          eq(
            projects.organizationId,
            organizationId
          ),
          eq(
            projects.operatingUnitId,
            operatingUnitId
          ),
          eq(projects.isDeleted, 0)
        )
      )
      .groupBy(
        projects.id,
        projects.totalBudget
      );

    const totalBudget =
      projectFinancials.reduce(
        (sum, p) =>
          sum + Number(p.totalBudget ?? 0),
        0
      );

    const totalSpent =
      projectFinancials.reduce(
        (sum, p) =>
          sum + Number(p.totalSpent ?? 0),
        0
      );

    const utilization =
      totalBudget > 0
        ? (totalSpent / totalBudget) * 100
        : 0;

    const monthlySpending = await db
  .select({
    month: sql<string>`
      DATE_FORMAT(${budgetItems.createdAt}, '%Y-%m')
    `,
    spent: sql<number>`
      COALESCE(SUM(${budgetItems.actualSpent}),0)
    `,
  })
  .from(budgetItems)

  .innerJoin(
    projects,
    eq(projects.id, budgetItems.projectId)
  )

  .where(
    and(
      eq(projects.organizationId, organizationId),
      eq(projects.operatingUnitId, operatingUnitId),
      eq(projects.isDeleted, 0)
    )
  )

  .groupBy(
    sql`
      DATE_FORMAT(${budgetItems.createdAt}, '%Y-%m')
    `
  )

  .orderBy(
    sql`
      DATE_FORMAT(${budgetItems.createdAt}, '%Y-%m')
    `
  );

    let cumulativeActual = 0;

    const burnRate = monthlySpending.map((row) => {
      cumulativeActual += Number(row.spent ?? 0);

      return {
        month: row.month,

        cumulativeBudget: totalBudget,

        cumulativeActual,
      };
    });

    return {
      totalBudget,
      totalSpent,
      utilization: Number(
        utilization.toFixed(2)
      ),
      monthlySpending,
      burnRate,
    };
  }
),

getTopRisks: scopedProcedure.query(async ({ ctx }) => {
  const db = await getDb();

  const topRisks = await db
    .select({
      id: risks.id,
      title: risks.title,
      category: risks.category,
      level: risks.level,
      owner: risks.owner,
      likelihood: risks.likelihood,
      impact: risks.impact,
      // Computed risk score: likelihood × impact
      score: sql<number>`COALESCE(${risks.likelihood} * ${risks.impact}, 0)`,
    })
    .from(risks)
    .where(
      and(
        eq(risks.organizationId, ctx.scope.organizationId),
        eq(risks.operatingUnitId, ctx.scope.operatingUnitId),
        eq(risks.isDeleted, 0),
        // Only active/open risks
        sql`${risks.status} NOT IN ('closed', 'resolved')`
      )
    )
    .orderBy(
      // Heat-sort: critical first, then by score descending
      desc(sql`${risks.likelihood} * ${risks.impact}`)
    )
    .limit(10);

  return topRisks.map((r) => ({
    id: r.id,
    title: r.title ?? "Untitled Risk",
    category: r.category ?? "General",
    level: r.level ?? "low",        // "critical" | "high" | "medium" | "low"
    owner: r.owner ?? "Unassigned",
    score: Number(r.score ?? 0),
    likelihood: Number(r.likelihood ?? 1),
    impact: Number(r.impact ?? 1),
  }));
}),

// Add to imports at top of executiveDashboardRouter.ts
// ─── Inside router({}) ───────────────────────────────────────────────────────

getExecutiveRiskSummary: scopedProcedure.query(async ({ ctx }) => {
  const db = await getDb();
  const { organizationId, operatingUnitId } = ctx.scope;

  // Base WHERE conditions — always applied to every query
  const baseWhere = and(
    eq(risks.organizationId, organizationId),
    operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : undefined,
    eq(risks.isDeleted, 0)
  );

  // ── 1. Severity distribution (exclude closed) ──────────────────────────
  const severityRows = await db
    .select({
      level: risks.level,
      count: sql<number>`COUNT(*)`,
    })
    .from(risks)
    .where(
      and(
        baseWhere,
        sql`${risks.status} != 'closed'`
      )
    )
    .groupBy(risks.level);

  const severity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of severityRows) {
    const lvl = row.level as keyof typeof severity;
    if (lvl in severity) severity[lvl] = Number(row.count);
  }

  // ── 2. Status distribution (all risks, including closed) ───────────────
  // Schema statuses: identified | assessed | mitigated | accepted | transferred | closed
  const statusRows = await db
    .select({
      status: risks.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(risks)
    .where(baseWhere)
    .groupBy(risks.status);

  const status = {
    identified: 0,  // identified + assessed → "open" in UI
    mitigated:  0,
    accepted:   0,
    transferred: 0,
    closed:     0,
  };
  for (const row of statusRows) {
    if (row.status === 'identified' || row.status === 'assessed') {
      // Merge 'assessed' into 'identified' bucket for the executive view
      status.identified += Number(row.count);
    } else if (row.status === 'mitigated') {
      status.mitigated += Number(row.count);
    } else if (row.status === 'accepted') {
      status.accepted += Number(row.count);
    } else if (row.status === 'transferred') {
      status.transferred += Number(row.count);
    } else if (row.status === 'closed') {
      status.closed += Number(row.count);
    }
  }

  // ── 3. Project exposure — uses stored `score` column (likelihood × impact) ─
  const exposureRows = await db
    .select({
      projectId:     risks.projectId,
      riskScore:     sql<number>`SUM(${risks.score})`,
      totalRisks:    sql<number>`COUNT(*)`,
      criticalRisks: sql<number>`SUM(CASE WHEN ${risks.level} = 'critical' THEN 1 ELSE 0 END)`,
      highRisks:     sql<number>`SUM(CASE WHEN ${risks.level} = 'high'     THEN 1 ELSE 0 END)`,
      mediumRisks:   sql<number>`SUM(CASE WHEN ${risks.level} = 'medium'   THEN 1 ELSE 0 END)`,
      lowRisks:      sql<number>`SUM(CASE WHEN ${risks.level} = 'low'      THEN 1 ELSE 0 END)`,
    })
    .from(risks)
    .where(
      and(
        baseWhere,
        isNotNull(risks.projectId),         // only project-linked risks
        sql`${risks.status} != 'closed'`    // exclude resolved risks from exposure
      )
    )
    .groupBy(risks.projectId)
    .orderBy(sql`SUM(${risks.score}) DESC`)
    .limit(8);

  // Resolve project display names in one query
  const projectIds = exposureRows
    .map((r) => r.projectId)
    .filter((id): id is number => id !== null);

  let projectNameMap: Record<number, string> = {};
  if (projectIds.length > 0) {
    const projectRows = await db
      .select({
        id:        projects.id,
        code:      projects.projectCode,
        titleEn:   projects.titleEn,
      })
      .from(projects)
      .where(inArray(projects.id, projectIds));

    for (const p of projectRows) {
      // Prefer project code (e.g. "ADIDAS-YEM") over title for executive brevity
      projectNameMap[p.id] = p.code ?? p.titleEn ?? `Project ${p.id}`;
    }
  }

  const totalPortfolioScore = exposureRows.reduce(
    (sum, r) => sum + Number(r.riskScore ?? 0),
    0
  );

  const exposure = exposureRows.map((r) => ({
    projectName:   projectNameMap[r.projectId!] ?? `Project ${r.projectId}`,
    totalRisks:    Number(r.totalRisks),
    criticalRisks: Number(r.criticalRisks),
    highRisks:     Number(r.highRisks),
    mediumRisks:   Number(r.mediumRisks),
    lowRisks:      Number(r.lowRisks),
    riskScore:     Number(r.riskScore ?? 0),
    percent: totalPortfolioScore > 0
      ? Math.round((Number(r.riskScore ?? 0) / totalPortfolioScore) * 100)
      : 0,
  }));

  // ── 4. Open incidents = identified + assessed risks ─────────────────────
  // No separate incidents table — open risks ARE the "active incidents" KPI
  const openIncidents = status.identified;

  return {
    severity,
    status,
    exposure,
    openIncidents,
  };
}),

});
