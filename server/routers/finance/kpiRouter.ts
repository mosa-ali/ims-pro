/**
 * server/routers/finance/kpiRouter.ts
 *
 * Finance Dashboard KPI Subrouter
 * Handles KPI calculations and metrics for the executive dashboard.
 *
 * FIX: Previously imported `getFinanceEngine` from a non-existent file
 * (`../../engines/FinanceEngine`), which would throw at runtime on any
 * request. Replaced with the real, already-working KPIRepository.
 * Also switched from protectedProcedure (manual org/OU params) to
 * scopedProcedure (org/OU enforced via ctx.scope), matching the pattern
 * used in financeDashboardRouter and financialReportsRouter.
 *
 * Procedures:
 * - getPortfolioKPIs() - Portfolio-level KPIs
 * - getProjectKPIs() - Project-level KPIs
 * - getGrantKPIs() - Grant-level KPIs
 * - getTrendAnalysis() - KPI trends over time
 */

import { router, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { getKPIRepository } from '../../repositories/finance/KPIRepository';

export const kpiRouter = router({
  /**
   * Get portfolio-level KPIs for the organization.
   */
  getPortfolioKPIs: scopedProcedure
    .input(
      z.object({
        fiscalYear: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const kpiRepo = await getKPIRepository(db);

      const kpis = await kpiRepo.getPortfolioKPIs(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        input.fiscalYear
      );

      return {
        success: true,
        data: kpis,
        timestamp: new Date(),
      };
    }),

  /**
   * Get project-level KPIs.
   */
  getProjectKPIs: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const kpiRepo = await getKPIRepository(db);

      const kpis = await kpiRepo.getProjectKPIs(
        input.projectId,
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      return {
        success: true,
        data: kpis,
        timestamp: new Date(),
      };
    }),

  /**
   * Get grant-level KPIs.
   */
  getGrantKPIs: scopedProcedure
    .input(
      z.object({
        grantId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const kpiRepo = await getKPIRepository(db);

      const kpis = await kpiRepo.getGrantKPIs(
        input.grantId,
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      return {
        success: true,
        data: kpis,
        timestamp: new Date(),
      };
    }),

  /**
   * Get KPI trends over time.
   */
  getTrendAnalysis: scopedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const kpiRepo = await getKPIRepository(db);

      const trends = await kpiRepo.getTrendAnalysis(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        input.months
      );

      return {
        success: true,
        data: trends,
        timestamp: new Date(),
      };
    }),
});
