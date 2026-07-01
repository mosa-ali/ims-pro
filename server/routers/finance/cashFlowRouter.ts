/**
 * server/routers/finance/cashFlowRouter.ts
 *
 * Finance Dashboard Cash Flow Subrouter
 * Handles cash flow analysis and management.
 *
 * FIX: Previously imported phantom `getFinanceEngine`. Replaced with
 * FinancialReportingEngine.generateCashFlowReport (now real, post Phase 3)
 * and ReconciliationEngine for liquidity metrics.
 *
 * Procedures:
 * - getCashFlowStatement() - Cash flow statement
 * - getCashFlowAnalysis() - Cash flow analysis (multi-period)
 * - getLiquidityMetrics() - Liquidity metrics
 * - getCashFlowProjection() - Cash flow projections
 */

import { router, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { getFinancialReportingEngine } from '../../engines/finance/FinancialReportingEngine';
import { getReconciliationEngine } from '../../engines/finance/ReconciliationEngine';
import { getRiskRepository } from '../../repositories/finance/RiskRepository';

export const cashFlowRouter = router({
  /**
   * Get cash flow statement for a period.
   */
  getCashFlowStatement: scopedProcedure
    .input(
      z.object({
        period: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const reportingEngine = await getFinancialReportingEngine(db);

      const period =
        input.period ||
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      const statement = await reportingEngine.generateCashFlowReport(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        period
      );

      return {
        success: true,
        data: statement,
        timestamp: new Date(),
      };
    }),

  /**
   * Get cash flow analysis across multiple recent periods.
   */
  getCashFlowAnalysis: scopedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const reportingEngine = await getFinancialReportingEngine(db);

      const now = new Date();
      const periods: string[] = [];
      for (let i = Math.min(input.months, 12) - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const analysis = await Promise.all(
        periods.map(async period => {
          const report = await reportingEngine.generateCashFlowReport(
            ctx.scope.organizationId,
            ctx.scope.operatingUnitId,
            period
          );
          return {
            period,
            netCashFlow: report.netCashFlow,
            endingBalance: report.endingBalance,
          };
        })
      );

      return {
        success: true,
        data: analysis,
        timestamp: new Date(),
      };
    }),

  /**
   * Get liquidity metrics — sourced from RiskRepository.getLiquidityRisk
   * and getTreasuryRisk (both now real, post Phase 3).
   */
  getLiquidityMetrics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const riskRepo = await getRiskRepository(db);

      const [liquidity, treasury] = await Promise.all([
        riskRepo.getLiquidityRisk(ctx.scope.organizationId, ctx.scope.operatingUnitId),
        riskRepo.getTreasuryRisk(ctx.scope.organizationId, ctx.scope.operatingUnitId),
      ]);

      return {
        success: true,
        data: { liquidity, treasury },
        timestamp: new Date(),
      };
    }),

  /**
   * Get cash flow projection.
   *
   * Projects forward using the most recent period's net cash flow as a
   * run-rate, applied to the current cash balance. This is a simple
   * linear projection — replace with a regression-based forecast engine
   * in a later phase if more sophistication is required.
   */
  getCashFlowProjection: scopedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const reportingEngine = await getFinancialReportingEngine(db);

      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentReport = await reportingEngine.generateCashFlowReport(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        currentPeriod
      );

      const monthlyRunRate = currentReport.netCashFlow;
      let runningBalance = currentReport.endingBalance;

      const projection = [];
      for (let i = 1; i <= Math.min(input.months, 24); i++) {
        runningBalance += monthlyRunRate;
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        projection.push({
          period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          projectedBalance: Math.round(runningBalance * 100) / 100,
        });
      }

      return {
        success: true,
        data: projection,
        note: 'Linear projection based on current month run-rate.',
        timestamp: new Date(),
      };
    }),
});
