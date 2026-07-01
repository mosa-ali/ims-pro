/**
 * server/routers/finance/healthRouter.ts
 *
 * Finance Dashboard Health Subrouter
 * Handles financial health scoring and analysis.
 *
 * FIX: Previously imported phantom `getFinanceEngine`. Replaced with
 * FinancialHealthEngine, which now (post Phase 3 refactor) calculates
 * all 10 dimensions from real data via HealthRepository.
 *
 * Procedures:
 * - getFinancialHealth() - Overall financial health score
 * - getHealthMetrics() - Detailed health metrics (dimension breakdown)
 * - getHealthTrend() - Health score trend over time
 */

import { router, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { getFinancialHealthEngine } from '../../engines/finance/FinancialHealthEngine';

export const healthRouter = router({
  /**
   * Get overall financial health score.
   */
  getFinancialHealth: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const healthEngine = await getFinancialHealthEngine(db);

      const health = await healthEngine.calculateFinancialHealth(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      return {
        success: true,
        data: health,
        timestamp: new Date(),
      };
    }),

  /**
   * Get detailed health metrics (dimension-level breakdown).
   */
  getHealthMetrics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const healthEngine = await getFinancialHealthEngine(db);

      const health = await healthEngine.calculateFinancialHealth(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      return {
        success: true,
        data: health.dimensions,
        timestamp: new Date(),
      };
    }),

  /**
   * Get health score trend over time.
   *
   * NOTE: True historical trending requires periodic snapshots of the
   * health score to be persisted (e.g. a finance_health_snapshots table).
   * Until that table exists, this returns the current score repeated as
   * a single data point rather than fabricating a multi-month trend with
   * Math.random(), to avoid presenting fake historical data as real.
   */
  getHealthTrend: scopedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const healthEngine = await getFinancialHealthEngine(db);

      const health = await healthEngine.calculateFinancialHealth(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId
      );

      const today = new Date().toISOString().split('T')[0];

      return {
        success: true,
        data: [
          {
            date: today,
            score: health.overallScore,
            target: 80,
          },
        ],
        note: 'Historical trend requires a health-snapshot table; only current score is available.',
        timestamp: new Date(),
      };
    }),
});
