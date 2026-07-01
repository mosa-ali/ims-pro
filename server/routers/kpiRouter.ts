/**
 * server/routers/kpiRouter.ts
 *
 * KPI Router
 * Exposes KPI Engine via tRPC procedures.
 * Handles KPI calculation, reporting, and alerts.
 */

import { router, protectedProcedure, scopedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getRiskRepository } from '../repositories/finance';
import { getKPIRepository } from '../repositories/finance';

// ── Input Schemas ────────────────────────────────────────────────────────────

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ── KPI Router ───────────────────────────────────────────────────────────────

export const kpiRouter = router({
  /**
   * Get all KPIs
   */
  getAllKPIs: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const repo = await getKPIRepository(ctx.db);
      return repo.getAllKPIs(ctx.user.organizationId, ctx.user.operatingUnitId, input.asOfDate);
    }),

  /**
   * Get cash conversion cycle KPI
   */
  getCashConversionCycle: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const repo = await getKPIRepository(ctx.db);
      return repo.calculateCashConversionCycle(ctx.user.organizationId, ctx.user.operatingUnitId, input.asOfDate);
    }),

  /**
   * Get current ratio KPI
   */
  getCurrentRatio: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const repo = await getKPIRepository(ctx.db);
      return repo.calculateCurrentRatio(ctx.user.organizationId, ctx.user.operatingUnitId, input.asOfDate);
    }),

  /**
   * Get quick ratio KPI
   */
  getQuickRatio: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const engine = await getKPIEngine();
      return engine.calculateQuickRatio(ctx.user.organizationId, input.asOfDate);
    }),

  /**
   * Get budget utilization KPI
   */
  getBudgetUtilization: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const engine = await getKPIEngine();
      return engine.calculateBudgetUtilization(ctx.user.organizationId, input.asOfDate);
    }),

  /**
   * Get payment timeliness KPI
   */
  getPaymentTimeliness: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const engine = await getKPIEngine();
      return engine.calculatePaymentTimeliness(ctx.user.organizationId, input.asOfDate);
    }),

  /**
   * Get invoice processing time KPI
   */
  getInvoiceProcessingTime: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const engine = await getKPIEngine();
      return engine.calculateInvoiceProcessingTime(ctx.user.organizationId, input.asOfDate);
    }),

  /**
   * Get compliance rate KPI
   */
  getComplianceRate: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const engine = await getKPIEngine();
      return engine.calculateComplianceRate(ctx.user.organizationId, input.asOfDate);
    }),

  /**
   * Get cost efficiency KPI
   */
  getCostEfficiency: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const engine = await getKPIEngine();
      return engine.calculateCostEfficiency(ctx.user.organizationId, input.asOfDate);
    }),

  /**
   * Generate KPI report
   */
  generateReport: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const engine = await getKPIEngine();
      return engine.generateKPIReport(ctx.user.organizationId, input.asOfDate);
    }),

  /**
   * Generate KPI alerts
   */
  generateAlerts: scopedProcedure
    .input(z.object({ asOfDate: DateSchema }))
    .query(async ({ input, ctx }) => {
      const engine = await getKPIEngine();
      return engine.generateKPIAlerts(ctx.user.organizationId, input.asOfDate);
    }),
});
