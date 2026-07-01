/**
 * server/routers/finance/reporting/reportingRouter.ts
 *
 * FINANCE REPORTING — GROUPED ROUTERS
 * ----------------------------------------------------------------------------
 * Modular reporting surface. Instead of ~50 individual procedures or one
 * monolithic switch, each report GROUP gets a small router with a single
 * `generate` dispatcher that delegates to the shared report registry.
 *
 * Surface (all under trpc.financeReporting.*):
 *   financeReporting.financialStatements.generate({ reportId, ... })
 *   financeReporting.donor.generate({ ... })
 *   financeReporting.management.generate({ ... })
 *   financeReporting.compliance.generate({ ... })
 *   financeReporting.treasury.generate({ ... })
 *   financeReporting.audit.generate({ ... })
 *   financeReporting.budget.generate({ ... })
 *   financeReporting.executive.generate({ ... })
 *   financeReporting.catalogue()          → group → reportIds (for diagnostics)
 *   financeReporting.export(...)          → records an export event
 *
 * Adding a new report:
 *   1. Register it in reportRegistry.ts (id → { group, generator }).
 *   That's it — the correct group router picks it up automatically. No router
 *   edits, no new procedure.
 *
 * Backward compatibility: the legacy financialReportsRouter (getActiveProjects,
 * getExecutiveKPIs, getPredictiveAlerts, getFinancialHealthMatrix,
 * getExportHistory, logGeneratedReport) is UNCHANGED and remains mounted. This
 * router is purely additive.
 */

import { z } from 'zod';
import { router, scopedProcedure } from '../../../_core/trpc';
import { getDb } from '../../../db';
import {
  runReport,
  reportsInGroup,
  type ReportGroup,
  type GeneratorContext,
  type ReportRequest,
} from './reportRegistry';
import { recordReportExport, type ExportFormat } from './reportExportService';

// ── Shared input schema for every group's `generate` dispatcher ─────────────
const generateInput = z.object({
  reportId: z.string().min(1),
  fiscalYear: z.string().min(4),
  reportingPeriod: z
    .enum(['monthly', 'quarterly', 'semiannual', 'annual', 'custom'])
    .optional(),
  customStart: z.string().optional(),
  customEnd: z.string().optional(),
  projectIds: z.array(z.number()).optional(),
  donorId: z.number().optional(),
  grantId: z.number().optional(),
});

type GenerateInput = z.infer<typeof generateInput>;

function toRequest(input: GenerateInput): ReportRequest {
  return {
    reportId: input.reportId,
    fiscalYear: input.fiscalYear,
    reportingPeriod: input.reportingPeriod,
    customStart: input.customStart,
    customEnd: input.customEnd,
    projectIds: input.projectIds,
    donorId: input.donorId,
    grantId: input.grantId,
  };
}

/**
 * Factory: build a group router whose single `generate` procedure dispatches
 * through the registry, scoped to `group`. Cross-group reportIds are rejected
 * by runReport's expectedGroup guard.
 */
function makeGroupRouter(group: ReportGroup) {
  return router({
    generate: scopedProcedure
      .input(generateInput)
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        const genCtx: GeneratorContext = {
          db,
          scope: {
            organizationId: ctx.scope.organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
          },
          userId: ctx.user.id,
        };
        return runReport(genCtx, toRequest(input), group);
      }),

    /** List reportIds this group serves (UI catalogue / diagnostics). */
    list: scopedProcedure.query(() => reportsInGroup(group)),
  });
}

// ── Grouped routers ─────────────────────────────────────────────────────────
export const reportingRouter = router({
  financialStatements: makeGroupRouter('financial-statements'),
  donor:               makeGroupRouter('donor'),
  management:          makeGroupRouter('management'),
  compliance:          makeGroupRouter('compliance'),
  treasury:            makeGroupRouter('treasury'),
  audit:               makeGroupRouter('audit'),
  budget:              makeGroupRouter('budget'),
  executive:           makeGroupRouter('executive'),

  /** Full catalogue across all groups — { group: reportId[] }. */
  catalogue: scopedProcedure.query(() => {
    const groups: ReportGroup[] = [
      'financial-statements', 'donor', 'management', 'compliance',
      'treasury', 'audit', 'budget', 'executive',
    ];
    return Object.fromEntries(groups.map((g) => [g, reportsInGroup(g)]));
  }),

  /** Record a report export event (PDF/XLSX) in the document audit trail. */
  export: scopedProcedure
    .input(z.object({
      reportId: z.string().min(1),
      reportTitle: z.string().min(1),
      format: z.enum(['PDF', 'XLSX']),
      fiscalYear: z.string().min(4),
      reportingPeriod: z.string().optional(),
      projectIds: z.array(z.number()).optional(),
      filePath: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      return recordReportExport(
        db,
        { organizationId: ctx.scope.organizationId, operatingUnitId: ctx.scope.operatingUnitId },
        ctx.user.id,
        { ...input, format: input.format as ExportFormat },
      );
    }),
});
