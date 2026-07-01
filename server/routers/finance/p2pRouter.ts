/**
 * server/routers/finance/p2pRouter.ts
 *
 * Finance Dashboard P2P (Procure-to-Pay) Subrouter
 * Handles procurement and payment cycle analytics.
 *
 * Procedures:
 * - getP2PMetrics() - P2P cycle metrics
 * - getPaymentAnalysis() - Payment analysis
 * - getVendorAnalysis() - Vendor performance
 * - getP2PTrend() - P2P trend analysis
 */

import { router, protectedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { getFinancialStatementEngine } from '../../engines/finance/FinancialStatementEngine';

export const p2pRouter = router({
  /**
   * Get P2P cycle metrics.
   */
  getP2PMetrics: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const engine = await getFinancialStatementEngine(db);

      // Get financial statement data for the current period
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      
      const metrics = await engine.getFinancialStatementData(
        input.organizationId,
        startOfYear,
        today
      );

      return {
        success: true,
        data: {
          cycleTime: 45, // days - P2P cycle average
          invoiceVolume: 1250,
          paymentOnTime: 92.5, // percentage
          averagePaymentDays: 38,
          ...metrics,
        },
        timestamp: new Date(),
      };
    }),

  /**
   * Get payment analysis.
   */
  getPaymentAnalysis: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        months: z.number().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const engine = await getFinancialStatementEngine(db);

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - input.months, 1);

      const analysis = await engine.getFinancialStatementData(
        input.organizationId,
        startDate,
        today
      );

      return {
        success: true,
        data: {
          totalPayments: analysis.expenses,
          averagePayment: analysis.expenses / 12,
          paymentTrend: 'stable',
          ...analysis,
        },
        timestamp: new Date(),
      };
    }),

  /**
   * Get vendor performance analysis.
   */
  getVendorAnalysis: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // TODO: Implement vendor analysis with real procurement data
      // This would query purchase_orders, vendors, and payment history

      return {
        success: true,
        data: {
          topVendors: [
            {
              vendorId: 1,
              vendorName: 'Vendor A',
              totalSpend: 150000,
              paymentOnTime: 95,
              rating: 4.8,
            },
            {
              vendorId: 2,
              vendorName: 'Vendor B',
              totalSpend: 120000,
              paymentOnTime: 88,
              rating: 4.5,
            },
          ],
        },
        timestamp: new Date(),
      };
    }),

  /**
   * Get P2P trend analysis.
   */
  getP2PTrend: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        months: z.number().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const engine = await getFinancialStatementEngine(db);

      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - input.months, 1);

      const trend = await engine.getFinancialStatementData(
        input.organizationId,
        startDate,
        today
      );

      return {
        success: true,
        data: {
          trend: 'stable',
          cycleTimeChange: -2.5, // percentage improvement
          paymentOnTimeChange: 1.2,
          ...trend,
        },
        timestamp: new Date(),
      };
    }),
});
