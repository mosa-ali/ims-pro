/**
 * Auto Programs Report Router
 * 
 * tRPC procedures for the Auto Programs Report module.
 * All procedures enforce organization + operating unit isolation via scopedProcedure.
 */

import { z } from 'zod';
import { scopedProcedure, router } from '../_core/trpc';
import { generateAutoReport, getProjectsList } from '../services/programsReports/autoProgramsReportService';
import { TRPCError } from '@trpc/server';

export const autoProgramsReportRouter = router({
  /**
   * Get the full dashboard data for the Auto Programs Report
   */
  getDashboardData: scopedProcedure
    .input(z.object({
      fromDate: z.string(), // YYYY-MM-DD
      toDate: z.string(),   // YYYY-MM-DD
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        const report = await generateAutoReport({
          organizationId,
          operatingUnitId,
          fromDate: input.fromDate,
          toDate: input.toDate,
          projectId: input.projectId,
        });

        return report;
      } catch (error) {
        console.error('Error generating auto programs report:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate report data',
        });
      }
    }),

  /**
   * Get list of projects for the project filter dropdown
   */
  getProjectsList: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        return await getProjectsList(organizationId, operatingUnitId);
      } catch (error) {
        console.error('Error fetching projects list:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch projects list',
        });
      }
    }),

  /**
   * Get performance metrics for a specific project
   */
  getPerformanceMetrics: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      fromDate: z.string(),
      toDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        const report = await generateAutoReport({
          organizationId,
          operatingUnitId,
          fromDate: input.fromDate,
          toDate: input.toDate,
          projectId: input.projectId,
        });

        return {
          implementationPerformance: report.implementationPerformance,
          projectHealth: report.projectHealthList[0] || null,
        };
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch performance metrics',
        });
      }
    }),

  /**
   * Get financial analytics
   */
  getFinancialAnalytics: scopedProcedure
    .input(z.object({
      fromDate: z.string(),
      toDate: z.string(),
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        const report = await generateAutoReport({
          organizationId,
          operatingUnitId,
          fromDate: input.fromDate,
          toDate: input.toDate,
          projectId: input.projectId,
        });

        return report.financialAnalytics;
      } catch (error) {
        console.error('Error fetching financial analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch financial analytics',
        });
      }
    }),

  /**
   * Get risk analytics
   */
  getRiskAnalytics: scopedProcedure
    .input(z.object({
      fromDate: z.string(),
      toDate: z.string(),
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        const report = await generateAutoReport({
          organizationId,
          operatingUnitId,
          fromDate: input.fromDate,
          toDate: input.toDate,
          projectId: input.projectId,
        });

        return report.riskCompliance;
      } catch (error) {
        console.error('Error fetching risk analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch risk analytics',
        });
      }
    }),

  /**
   * Get beneficiary analytics
   */
  getBeneficiaryAnalytics: scopedProcedure
    .input(z.object({
      fromDate: z.string(),
      toDate: z.string(),
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;

      try {
        const report = await generateAutoReport({
          organizationId,
          operatingUnitId,
          fromDate: input.fromDate,
          toDate: input.toDate,
          projectId: input.projectId,
        });

        return report.beneficiaryAnalytics;
      } catch (error) {
        console.error('Error fetching beneficiary analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch beneficiary analytics',
        });
      }
    }),
});
