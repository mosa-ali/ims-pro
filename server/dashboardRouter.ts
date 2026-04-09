import { z } from "zod";
import { scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { projects, grants, hrEmployees, userOperatingUnits } from "../drizzle/schema";
import { eq, and, count, sum, sql } from "drizzle-orm";

export const dashboardRouter = router({
  /**
   * Get dashboard statistics for an operating unit
   * Returns real data from the database
   * 
   * SCOPED: Automatically filters by ctx.scope.organizationId and ctx.scope.operatingUnitId
   */
  getStats: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      console.log('\n\n=== DASHBOARD GET STATS CALLED ===');
      console.log('[Dashboard getStats] Scope:', { organizationId, operatingUnitId });
      const db = await getDb();
      if (!db) {
        return {
          activeProjects: 0,
          totalEmployees: 0,
          totalBudget: 0,
          totalSpent: 0,
          budgetExecution: 0,
          activeGrants: 0,
          projectCompliance: 94, // Placeholder until compliance tracking is implemented
        };
      }

      try {
        console.log('[Dashboard getStats] Query params:', {
          organizationId,
          operatingUnitId
        });
        
        // Fetch all active projects to count them and calculate totals
        const activeProjectsList = await db
          .select({
            totalBudget: projects.totalBudget,
            spent: projects.spent,
          })
          .from(projects)
          .where(
            and(
              eq(projects.organizationId, organizationId),
              eq(projects.operatingUnitId, operatingUnitId),
              eq(projects.status, "active"),
              eq(projects.isDeleted, false)
            )
          );
        
        console.log('[Dashboard getStats] Active projects found:', activeProjectsList.length);
        
        // Calculate stats from the array
        const activeProjectsCount = activeProjectsList.length;
        const totalBudget = activeProjectsList.reduce((sum, p) => sum + Number(p.totalBudget || 0), 0);
        const totalSpent = activeProjectsList.reduce((sum, p) => sum + Number(p.spent || 0), 0);

        // Get total employees count for this operating unit
        const employeeStats = await db
          .select({
            totalEmployees: count(),
          })
          .from(hrEmployees)
          .where(
            and(
              eq(hrEmployees.organizationId, organizationId),
              eq(hrEmployees.operatingUnitId, operatingUnitId),
              eq(hrEmployees.isDeleted, false)
            )
          );

        // Get active grants count
        const grantStats = await db
          .select({
            activeGrants: count(),
          })
          .from(grants)
          .where(
            and(
              eq(grants.organizationId, organizationId),
              eq(grants.operatingUnitId, operatingUnitId),
              eq(grants.status, "active"),
              eq(grants.isDeleted, false)
            )
          );

        const empStats = employeeStats[0] || {};
        const grantData = grantStats[0] || {};
        
        console.log('[Dashboard] activeProjectsList:', activeProjectsList.length, 'projects');
        console.log('[Dashboard] totalBudget:', totalBudget, 'totalSpent:', totalSpent);

        const budgetExecution = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        return {
          activeProjects: activeProjectsCount,
          totalEmployees: Number(empStats.totalEmployees || 0),
          totalBudget,
          totalSpent,
          budgetExecution: Math.round(budgetExecution),
          activeGrants: Number(grantData.activeGrants || 0),
          projectCompliance: 94, // Placeholder until compliance tracking is implemented
        };
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
          activeProjects: 0,
          totalEmployees: 0,
          totalBudget: 0,
          totalSpent: 0,
          budgetExecution: 0,
          activeGrants: 0,
          projectCompliance: 0,
        };
      }
    }),

  /**
   * Get project pipeline data for the dashboard
   * 
   * SCOPED: Automatically filters by ctx.scope.organizationId and ctx.scope.operatingUnitId
   */
  getProjectPipeline: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      console.log('\n\n=== DASHBOARD GET PROJECT PIPELINE CALLED ===');
      console.log('[Dashboard getProjectPipeline] Scope:', { organizationId, operatingUnitId });
      const db = await getDb();
      if (!db) {
        return [];
      }

      try {
        const pipelineProjects = await db
          .select({
            id: projects.id,
            titleEn: projects.titleEn,
            titleAr: projects.titleAr,
            status: projects.status,
            totalBudget: projects.totalBudget,
            spent: projects.spent,
            physicalProgressPercentage: projects.physicalProgressPercentage,
          })
          .from(projects)
          .where(
            and(
              eq(projects.organizationId, organizationId),
              eq(projects.operatingUnitId, operatingUnitId),
              eq(projects.isDeleted, false)
            )
          )
          .limit(5);

        return pipelineProjects.map(p => ({
          id: p.id,
          titleEn: p.titleEn || "Untitled Project",
          titleAr: p.titleAr || "مشروع بدون عنوان",
          status: p.status,
          totalBudget: Number(p.totalBudget || 0),
          spent: Number(p.spent || 0),
          progress: Number(p.physicalProgressPercentage || 0),
        }));
      } catch (error) {
        console.error("Error fetching project pipeline:", error);
        return [];
      }
    }),
});
