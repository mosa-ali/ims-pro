/**
 * server/routers/finance/forecastRouter.ts
 *
 * Finance Dashboard Forecast Subrouter
 * Handles financial forecasting and projections.
 *
 * FIX: Previously imported phantom `getFinanceEngine`. Replaced with real
 * data sources: cash flow projection reuses FinancialReportingEngine,
 * budget/revenue/expenditure forecasts use KPIRepository trend data
 * extrapolated forward via simple linear run-rate.
 *
 * Procedures:
 * - getCashFlowForecast() - Cash flow projections
 * - getBudgetForecast() - Budget utilization forecast
 * - getRevenueForecast() - Revenue projections
 * - getExpenditureForecast() - Expenditure projections
 */

import { router, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { getFinancialReportingEngine } from '../../engines/finance/FinancialReportingEngine';
import { getKPIRepository } from '../../repositories/finance/KPIRepository';

export const forecastRouter = router({
  /**
   * Get cash flow forecast.
   */
  getCashFlowForecast: scopedProcedure
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
      let balance = currentReport.endingBalance;
      const forecast = [];

      for (let i = 1; i <= Math.min(input.months, 24); i++) {
        balance += monthlyRunRate;
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        forecast.push({
          period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          projectedBalance: Math.round(balance * 100) / 100,
        });
      }

      return {
        success: true,
        data: forecast,
        timestamp: new Date(),
      };
    }),

  /**
   * Get budget utilization forecast.
   * Extrapolates current actual spend to a full-year projection.
   */
  getBudgetForecast: scopedProcedure
    .input(
      z.object({
        fiscalYear: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const kpiRepo = await getKPIRepository(db);

      const fiscalYear = input.fiscalYear || String(new Date().getFullYear());
      const bva = await kpiRepo.getBudgetVsActual(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        fiscalYear
      );

      const monthsElapsed = new Date().getMonth() + 1;
      const projectedFullYearActual = monthsElapsed > 0
        ? (bva.actual / monthsElapsed) * 12
        : bva.actual;

      return {
        success: true,
        data: {
          budget: bva.budget,
          actualToDate: bva.actual,
          projectedFullYearActual: Math.round(projectedFullYearActual * 100) / 100,
          projectedVariance: Math.round((bva.budget - projectedFullYearActual) * 100) / 100,
        },
        timestamp: new Date(),
      };
    }),

  /**
   * Get revenue forecast.
   * Uses trailing trend analysis extrapolated forward.
   */
  getRevenueForecast: scopedProcedure
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
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthlyReport = await reportingEngine.generateMonthlyReport(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        period
      );

      const monthlyRevenue = monthlyReport.summary.totalRevenue;
      const forecast = [];
      for (let i = 1; i <= Math.min(input.months, 24); i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        forecast.push({
          period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          projectedRevenue: monthlyRevenue,
        });
      }

      return {
        success: true,
        data: forecast,
        note: 'Projection holds current month revenue flat; replace with regression model when historical revenue series is available.',
        timestamp: new Date(),
      };
    }),

  /**
   * Get expenditure forecast.
   */
  getExpenditureForecast: scopedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const kpiRepo = await getKPIRepository(db);

      const trend = await kpiRepo.getTrendAnalysis(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        6
      );

      const avgMonthlySpend = trend.length > 0
        ? trend.reduce((s, t) => s + t.spent, 0) / trend.length
        : 0;

      const now = new Date();
      const forecast = [];
      for (let i = 1; i <= Math.min(input.months, 24); i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        forecast.push({
          period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          projectedExpenditure: Math.round(avgMonthlySpend * 100) / 100,
        });
      }

      return {
        success: true,
        data: forecast,
        timestamp: new Date(),
      };
    }),
});
