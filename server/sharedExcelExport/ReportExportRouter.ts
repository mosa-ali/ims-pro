/**
 * ReportExportRouter.ts
 * ────────────────────────────────────────────────────────────────────────────
 * tRPC Router for Report Exports
 *
 * All export requests come through this router.
 * Uses scopedProcedure — organizationId and operatingUnitId
 * always from ctx.scope, NEVER from user input.
 *
 * UI calls:
 *   trpc.reporting.export.mutate({ reportId: 'finance_trial_balance', locale: 'en', filters: { asOfDate: '2026-06-30' } })
 *
 * Router handles:
 *   1. Authentication (scopedProcedure)
 *   2. Input validation (Zod)
 *   3. Delegation to ReportExportOrchestrator
 *   4. Response formatting
 *
 * Integration into appRouter:
 *   import { reportExportRouter } from './reporting/ReportExportRouter';
 *
 *   export const appRouter = router({
 *     // ... existing routers ...
 *     reporting: router({
 *       export: reportExportRouter,
 *     }),
 *   });
 */

import { z } from 'zod';
// In production: import { router, scopedProcedure } from '../_core/trpc';

// ────────────────────────────────────────────────────────────────────────────
// ROUTER DEFINITION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Router procedures (to be wired into appRouter).
 *
 * Each procedure uses scopedProcedure for org/OU isolation.
 * The orchestrator receives ctx.scope — UI never sends org/OU IDs.
 */

export const reportExportProcedures = {
  /**
   * Export a report to Excel (.xlsx).
   *
   * UI:  trpc.reporting.export.generate.mutate({ reportId, locale, filters })
   *
   * Returns: { exportId, status, downloadUrl, fileName }
   */
  generate: {
    input: z.object({
      reportId: z.string().min(1, 'reportId is required'),
      locale: z.enum(['en', 'ar', 'it']).default('en'),
      filters: z.record(z.unknown()).default({}),
    }),
    // handler: async ({ ctx, input }) => {
    //   return orchestrator.export({
    //     reportId: input.reportId,
    //     format: 'xlsx',
    //     locale: input.locale,
    //     filters: input.filters,
    //     scope: ctx.scope,           // From scopedProcedure middleware
    //     requestedBy: ctx.user.id,   // From auth middleware
    //     requestedAt: new Date().toISOString(),
    //   });
    // },
  },

  /**
   * Get export history for current user.
   *
   * UI:  trpc.reporting.export.history.query({ limit: 20 })
   */
  history: {
    input: z.object({
      limit: z.number().min(1).max(100).default(20),
    }),
    // handler: async ({ ctx, input }) => {
    //   return orchestrator.getExportHistory(ctx.user.id, ctx.scope, input.limit);
    // },
  },

  /**
   * Re-download a previous export.
   *
   * UI:  trpc.reporting.export.redownload.mutate({ exportId })
   */
  redownload: {
    input: z.object({
      exportId: z.string().uuid('exportId must be a valid UUID'),
    }),
    // handler: async ({ ctx, input }) => {
    //   return orchestrator.redownload(input.exportId, ctx.user.id, ctx.scope);
    // },
  },

  /**
   * List available reports (optionally filtered by module).
   *
   * UI:  trpc.reporting.export.available.query({ module: 'finance' })
   */
  available: {
    input: z.object({
      module: z.enum([
        'finance', 'budget', 'grant', 'donor',
        'procurement', 'hr', 'inventory', 'meal', 'executive',
      ]).optional(),
    }),
    // handler: async ({ ctx, input }) => {
    //   return orchestrator.getAvailableReports(input.module);
    // },
  },
};

/**
 * Full tRPC router (paste into your appRouter):
 *
 * import { router, scopedProcedure } from '../_core/trpc';
 * import { ReportExportOrchestrator } from './ReportExportOrchestrator';
 *
 * // Initialize orchestrator (once at startup)
 * const orchestrator = new ReportExportOrchestrator({ ... });
 *
 * export const reportExportRouter = router({
 *   generate: scopedProcedure
 *     .input(reportExportProcedures.generate.input)
 *     .mutation(async ({ ctx, input }) => {
 *       return orchestrator.export({
 *         reportId: input.reportId,
 *         format: 'xlsx',
 *         locale: input.locale,
 *         filters: input.filters,
 *         scope: ctx.scope,
 *         requestedBy: ctx.user.id,
 *         requestedAt: new Date().toISOString(),
 *       });
 *     }),
 *
 *   history: scopedProcedure
 *     .input(reportExportProcedures.history.input)
 *     .query(async ({ ctx, input }) => {
 *       return orchestrator.getExportHistory(ctx.user.id, ctx.scope, input.limit);
 *     }),
 *
 *   redownload: scopedProcedure
 *     .input(reportExportProcedures.redownload.input)
 *     .mutation(async ({ ctx, input }) => {
 *       return orchestrator.redownload(input.exportId, ctx.user.id, ctx.scope);
 *     }),
 *
 *   available: scopedProcedure
 *     .input(reportExportProcedures.available.input)
 *     .query(async ({ ctx, input }) => {
 *       return orchestrator.getAvailableReports(input.module);
 *     }),
 * });
 */
