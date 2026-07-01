/**
 * server/routers/finance/filterRouter.ts
 *
 * Finance Dashboard Filter Subrouter
 * Handles filter options and metadata for the dashboard.
 *
 * FIX: Previously imported phantom `getFinanceEngine`. Replaced with
 * direct Drizzle queries against projects and budgets, matching the
 * pattern in financialReportsRouter.getActiveProjects.
 *
 * Procedures:
 * - getFilterOptions() - Available filter options
 * - getFilterMetadata() - Filter metadata and counts
 * - applyFilters() - Apply filters to dashboard data (validation pass-through)
 */

import { router, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { projects, budgets } from '../../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

export const filterRouter = router({
  /**
   * Get available filter options — real active projects and fiscal years
   * present in the budgets table for this organization.
   */
  getFilterOptions: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const activeProjects = await db
        .select({
          id: projects.id,
          projectCode: projects.projectCode,
          title: projects.title,
          currency: projects.currency,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, ctx.scope.organizationId),
            ctx.scope.operatingUnitId
              ? eq(projects.operatingUnitId, ctx.scope.operatingUnitId)
              : undefined,
            eq(projects.status, 'active'),
            eq(projects.isDeleted, 0)
          )
        );

      const fiscalYearRows = await db
        .select({ fiscalYear: budgets.fiscalYear })
        .from(budgets)
        .where(eq(budgets.organizationId, ctx.scope.organizationId))
        .groupBy(budgets.fiscalYear)
        .orderBy(budgets.fiscalYear);

      return {
        success: true,
        data: {
          projects: activeProjects,
          fiscalYears: fiscalYearRows.map(r => r.fiscalYear).filter(Boolean),
          currencies: Array.from(
            new Set(activeProjects.map(p => p.currency).filter(Boolean))
          ),
        },
        timestamp: new Date(),
      };
    }),

  /**
   * Get filter metadata and counts.
   */
  getFilterMetadata: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [projectCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, ctx.scope.organizationId),
            eq(projects.isDeleted, 0)
          )
        );

      const [activeCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, ctx.scope.organizationId),
            eq(projects.status, 'active'),
            eq(projects.isDeleted, 0)
          )
        );

      return {
        success: true,
        data: {
          totalProjects: Number(projectCount?.count || 0),
          activeProjects: Number(activeCount?.count || 0),
        },
        timestamp: new Date(),
      };
    }),

  /**
   * Validate filter combination — lightweight existence check rather than
   * a full "apply filters" data fetch (which duplicates what the dashboard
   * procedures already do via their own filterSchema input).
   */
  applyFilters: scopedProcedure
    .input(
      z.object({
        fiscalYear: z.string().optional(),
        projectIds: z.array(z.number()).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      let validProjectCount = 0;
      if (input.projectIds && input.projectIds.length > 0) {
        const [row] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(projects)
          .where(
            and(
              eq(projects.organizationId, ctx.scope.organizationId),
              sql`${projects.id} IN (${sql.join(input.projectIds, sql`, `)})`
            )
          );
        validProjectCount = Number(row?.count || 0);
      }

      return {
        success: true,
        data: {
          appliedFilters: input,
          matchedProjectCount: validProjectCount,
        },
        timestamp: new Date(),
      };
    }),
});
