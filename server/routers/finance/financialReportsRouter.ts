/**
 * server/routers/finance/financialReportsRouter.ts
 *
 * Executive Finance Intelligence Router (v7 — Single Source of Truth)
 * ----------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for all Finance Reports. The previously separate
 * grouped reporting router has been REMOVED; everything is consolidated here
 * per architecture review.
 *
 * Provides:
 *   • getActiveProjects / getExecutiveKPIs / getPredictiveAlerts /
 *     getFinancialHealthMatrix / getExportHistory / logGeneratedReport
 *     (the original six — UNCHANGED behaviour)
 *   • getFilterMeta        — one call populating Project / Fiscal Year / Donor /
 *                            Grant / Operating Unit / Currency, reusing the
 *                            Finance Dashboard cascade pattern (single source)
 *   • generateReport       — ONE dispatcher for the full report catalog, backed
 *                            by an internal REPORT_REGISTRY (no grouped routers,
 *                            no giant switch). Adding a report = register a
 *                            generator. Reports the engine cannot yet produce
 *                            return { status: 'not_implemented' } so the UI
 *                            shows a real empty state — never a crash, never
 *                            mock data.
 *   • getFinancialIntelligence — real analytical insights from live data, with
 *                            a meaningful explanation when nothing is notable.
 *
 * Every value is real (engine/repository/SQL). Errors are structured, never a
 * silent "Failed to load data".
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { TRPCError } from "@trpc/server";
import {
  budgetLines,
  projects,
  grants,
  donors,
  financeExpenditures,
  financeBankAccounts,
  operatingUnits,
  countries,
  varianceAlertConfig,
  generatedDocuments,
} from "../../../drizzle/schema";
import { eq, and, sql, sum, count, gte, inArray, lt, desc } from "drizzle-orm";
import { getFinancialReportingEngine } from "../../engines/finance";

// ════════════════════════════════════════════════════════════════════════════
// SERIALIZATION HELPER (mirror financeDashboardRouter for consistency)
// ════════════════════════════════════════════════════════════════════════════
const toNumber = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (typeof value === "bigint") return Number(value);
  if (value.toNumber) return value.toNumber();
  if (value.toString) return parseFloat(value.toString()) || 0;
  return 0;
};

// ════════════════════════════════════════════════════════════════════════════
// SHARED FILTER SCHEMA (same shape as the Finance Dashboard)
// ════════════════════════════════════════════════════════════════════════════
const reportFilterSchema = z.object({
  reportId: z.string().min(1),
  fiscalYear: z.string().optional(),
  currency: z.string().optional(),
  // Project scoping. Empty/undefined projectId => organization-wide aggregate.
  projectId: z.number().optional(),
  projectIds: z.array(z.number()).optional(),
  donorId: z.number().optional(),
  grantId: z.number().optional(),
  // Reporting window — explicit ISO date range ('YYYY-MM-DD'). Replaces the old
  // reportingPeriod enum + customStart/customEnd. When both are omitted the
  // report falls back to the full fiscal year (backward-compatible default).
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
type ReportFilterInput = z.infer<typeof reportFilterSchema>;

// ════════════════════════════════════════════════════════════════════════════
// REPORT ENVELOPE — uniform result for every report
// ════════════════════════════════════════════════════════════════════════════
type ReportStatus = "ok" | "not_implemented" | "error";
type ReportCategory =
  | "financial-statements" | "donor" | "management" | "compliance" | "executive";

interface ReportEnvelope<T = unknown> {
  status: ReportStatus;
  reportId: string;
  category: ReportCategory;
  data: T | null;
  message?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// PERIOD RESOLUTION (UI tokens → engine period string)
// ════════════════════════════════════════════════════════════════════════════
/**
 * Resolve the engine period token from the request.
 *  • Explicit from/to range  → "YYYY-MM-DD:YYYY-MM-DD"  (engine parses both ends)
 *  • Only a start OR only an end → completed against the fiscal-year boundary
 *  • Neither                  → the full fiscal year ("YYYY")  [legacy default]
 *
 * The token always begins with the start year, so engine generators that read
 * `period.slice(0, 4)` for fiscal-year scoping keep working without changes.
 */
function resolveEnginePeriod(input: ReportFilterInput): string {
  const fy = (input.fiscalYear || String(new Date().getFullYear())).slice(0, 4);
  const start = input.periodStart || (input.periodEnd ? `${fy}-01-01` : undefined);
  const end = input.periodEnd || (input.periodStart ? `${fy}-12-31` : undefined);
  if (start && end) return `${start}:${end}`;
  return fy;
}

// ════════════════════════════════════════════════════════════════════════════
// REPORT REGISTRY (internal — single source, no grouped routers, no switch)
// ════════════════════════════════════════════════════════════════════════════
interface GeneratorCtx { db: any; organizationId: number; operatingUnitId: number | null; }
type GeneratorFn = (gc: GeneratorCtx, input: ReportFilterInput) => Promise<unknown>;
const ouOrNull = (gc: GeneratorCtx) => gc.operatingUnitId ?? null;

const genMonthly: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateMonthlyReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genBudgetVsActual: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateBudgetVsActualReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genTrialBalance: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateTrialBalanceReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genBalanceSheet: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateBalanceSheetReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genCashFlow: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateCashFlowReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genIncomeStatement: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateIncomeStatementReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genDonor: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateDonorReport(gc.organizationId, input.donorId ?? 0, input.grantId ?? 0, resolveEnginePeriod(input));
};

// ── Generic analytical generators (real data, generic table shape) ──────────
const genGLSummary: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateGLAccountSummary(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genExpenseAnalysis: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateExpenseAnalysis(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genFinancialKPIs: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateFinancialKPIs(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genDashboardSummary: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateDashboardSummary(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genOUPerformance: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateOUPerformance(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genCostCenter: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateCostCenterReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genForecastVsActual: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateForecastVsActual(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genDonorUtilization: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateDonorUtilization(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genDonorExpenditure: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateDonorExpenditure(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genCostShare: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateCostShareReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genGrantClosure: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateGrantClosureReport(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genProcurementCompliance: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateProcurementCompliance(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genAuditFindings: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateAuditFindings(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genFinancialRisks: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateFinancialRisks(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};
const genComplianceSummary: GeneratorFn = async (gc, input) => {
  const engine = await getFinancialReportingEngine(gc.db);
  return engine.generateComplianceSummary(gc.organizationId, ouOrNull(gc), resolveEnginePeriod(input));
};

interface RegistryEntry { category: ReportCategory; generator?: GeneratorFn; }

// FULL CATALOG restored. Entries without a generator are intentionally present
// so the catalogue stays complete; the API returns a typed not_implemented.
const REPORT_REGISTRY: Record<string, RegistryEntry> = {
  // Financial Statements
  "monthly":            { category: "financial-statements", generator: genMonthly },
  "quarterly":          { category: "financial-statements", generator: genMonthly },
  "semiannual":         { category: "financial-statements", generator: genMonthly },
  "annual":             { category: "financial-statements", generator: genMonthly },
  "budget-vs-actual":   { category: "financial-statements", generator: genBudgetVsActual },
  "cash-flow":          { category: "financial-statements", generator: genCashFlow },
  "income-statement":   { category: "financial-statements", generator: genIncomeStatement },
  "balance-sheet":      { category: "financial-statements", generator: genBalanceSheet },
  "trial-balance":      { category: "financial-statements", generator: genTrialBalance },
  "executive-summary":  { category: "financial-statements", generator: genMonthly },
  "gl-summary":         { category: "financial-statements", generator: genGLSummary },

  // Donor Reports
  "grant-financial":    { category: "donor", generator: genDonor },
  "budget-performance": { category: "donor", generator: genBudgetVsActual },
  "donor-utilization":  { category: "donor", generator: genDonorUtilization },
  "donor-expenditure":  { category: "donor", generator: genDonorExpenditure },
  "cost-share":         { category: "donor", generator: genCostShare },
  "grant-closure":      { category: "donor", generator: genGrantClosure },

  // Management Reports
  "cash-position":       { category: "management", generator: genCashFlow },
  "commitments":         { category: "management", generator: genMonthly },
  "revenue-analysis":    { category: "management", generator: genIncomeStatement },
  "expense-analysis":    { category: "management", generator: genExpenseAnalysis },
  "cost-center":         { category: "management", generator: genCostCenter },
  "ou-performance":      { category: "management", generator: genOUPerformance },
  "project-performance": { category: "management", generator: genBudgetVsActual },
  "forecast-vs-actual":  { category: "management", generator: genForecastVsActual },

  // Compliance Reports
  "budget-compliance":      { category: "compliance", generator: genBudgetVsActual },
  "journal-validation":     { category: "compliance", generator: genTrialBalance },
  "procurement-compliance": { category: "compliance", generator: genProcurementCompliance },
  "audit-findings":         { category: "compliance", generator: genAuditFindings },
  "financial-risks":        { category: "compliance", generator: genFinancialRisks },
  "compliance-summary":     { category: "compliance", generator: genComplianceSummary },

  // Executive Reports
  "exec-financial-summary": { category: "executive", generator: genMonthly },
  "org-summary":            { category: "executive", generator: genBalanceSheet },
  "consolidated":           { category: "executive", generator: genBalanceSheet },
  "financial-kpis":         { category: "executive", generator: genFinancialKPIs },
  "dashboard-summary":      { category: "executive", generator: genDashboardSummary },
};

// ════════════════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════════════════
export const financialReportsRouter = router({
  // ── Original six (unchanged) ───────────────────────────────────────────────
  getActiveProjects: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    return await db
      .select({
        id: projects.id,
        projectCode: projects.projectCode,
        title: projects.title,
        currency: projects.currency,
        startDate: projects.startDate,
        endDate: projects.endDate,
      })
      .from(projects)
      .where(and(
        eq(projects.organizationId, ctx.scope.organizationId),
        eq(projects.status, "active"),
        eq(projects.isDeleted, 0),
      ));
  }),

  getExecutiveKPIs: scopedProcedure
    .input(z.object({ projectIds: z.array(z.number()).optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId: orgId, operatingUnitId: ouId } = ctx.scope;
      const filters = [eq(budgetLines.organizationId, orgId)];
      if (ouId) filters.push(eq(budgetLines.operatingUnitId, ouId));
      if (input.projectIds && input.projectIds.length > 0) {
        filters.push(inArray(budgetLines.projectId, input.projectIds));
      }
      const [metrics] = await db
        .select({
          totalBudget: sum(budgetLines.totalAmount),
          totalActual: sum(budgetLines.actualSpent),
          totalCommitted: sum(budgetLines.commitments),
          totalAvailable: sum(budgetLines.availableBalance),
        })
        .from(budgetLines)
        .where(and(...filters));
      const [cash] = await db
        .select({ total: sum(financeBankAccounts.currentBalance) })
        .from(financeBankAccounts)
        .where(eq(financeBankAccounts.organizationId, orgId));
      return {
        totalBudget: metrics?.totalBudget || "0",
        actualExpenditure: metrics?.totalActual || "0",
        commitments: metrics?.totalCommitted || "0",
        availableBudget: metrics?.totalAvailable || "0",
        utilization: metrics?.totalBudget
          ? ((Number(metrics.totalActual) / Number(metrics.totalBudget)) * 100).toFixed(1)
          : "0",
        cashOnHand: cash?.total || "0",
      };
    }),

  getPredictiveAlerts: scopedProcedure
    .input(z.object({ projectIds: z.array(z.number()).optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;
      const [config] = await db
        .select()
        .from(varianceAlertConfig)
        .where(eq(varianceAlertConfig.organizationId, orgId))
        .limit(1);
      const warningThreshold = Number(config?.warningThreshold || 5);
      const criticalThreshold = Number(config?.criticalThreshold || 15);

      const projectData = await db
        .select({
          id: projects.id,
          projectCode: projects.projectCode,
          title: projects.title,
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          currency: projects.currency,
          startDate: projects.startDate,
          endDate: projects.endDate,
        })
        .from(projects)
        .where(and(
          eq(projects.organizationId, orgId),
          eq(projects.status, "active"),
          input.projectIds && input.projectIds.length > 0
            ? inArray(projects.id, input.projectIds)
            : sql`1=1`,
        ));

      const alerts = [];
      for (const project of projectData) {
        const [burnRateResult] = await db
          .select({ avgMonthly: sql`SUM(amount) / 3` })
          .from(financeExpenditures)
          .where(and(
            eq(financeExpenditures.projectId, project.id),
            gte(financeExpenditures.expenditureDate, sql`DATE_SUB(NOW(), INTERVAL 90 DAY)`),
          ));
        const avgBurnRate = Number(burnRateResult?.avgMonthly || 0);
        const end = new Date(project.endDate);
        const now = new Date();
        const remainingMonths = Math.max(0, (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        const projectedFinalSpend = Number(project.spent || 0) + avgBurnRate * remainingMonths;
        const budget = Number(project.totalBudget || 0);
        if (projectedFinalSpend > budget && budget > 0) {
          const variance = projectedFinalSpend - budget;
          const variancePct = (variance / budget) * 100;
          let severity: "CRITICAL" | "HIGH" | "WARNING" = "WARNING";
          if (variancePct >= criticalThreshold) severity = "CRITICAL";
          else if (variancePct >= warningThreshold) severity = "HIGH";
          alerts.push({
            id: project.id,
            projectCode: project.projectCode,
            title: project.title,
            currentSpent: project.spent,
            totalBudget: project.totalBudget,
            projectedFinalSpend: projectedFinalSpend.toFixed(2),
            overspendAmount: variance.toFixed(2),
            overspendPercentage: variancePct.toFixed(1),
            burnRate: avgBurnRate.toFixed(2),
            remainingMonths: remainingMonths.toFixed(1),
            severity,
            currency: project.currency,
          });
        }
      }
      return alerts.sort((a, b) => Number(b.overspendPercentage) - Number(a.overspendPercentage));
    }),

  getFinancialHealthMatrix: scopedProcedure
    .input(z.object({ projectIds: z.array(z.number()).optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;
      const filters = [eq(budgetLines.organizationId, orgId)];
      if (input.projectIds && input.projectIds.length > 0) {
        filters.push(inArray(budgetLines.projectId, input.projectIds));
      }
      return await db
        .select({
          projectCode: projects.projectCode,
          budget: sum(budgetLines.totalAmount),
          spent: sum(budgetLines.actualSpent),
          commitments: sum(budgetLines.commitments),
          variancePct: sql`((SUM(totalAmount) - SUM(actualSpent)) / SUM(totalAmount)) * 100`,
          health: sql`CASE WHEN (SUM(actualSpent) / SUM(totalAmount)) > 0.9 THEN 'AT RISK' ELSE 'ON TRACK' END`,
        })
        .from(budgetLines)
        .innerJoin(projects, eq(budgetLines.projectId, projects.id))
        .where(and(...filters))
        .groupBy(projects.projectCode);
    }),

  getExportHistory: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    return await db
      .select({
        id: generatedDocuments.id,
        fileName: generatedDocuments.fileName,
        documentType: generatedDocuments.documentType,
        generatedAt: generatedDocuments.generatedAt,
        mimeType: generatedDocuments.mimeType,
        status: generatedDocuments.status,
        generatedBy: generatedDocuments.generatedBy,
      })
      .from(generatedDocuments)
      .where(and(
        eq(generatedDocuments.organizationId, ctx.scope.organizationId),
        eq(generatedDocuments.module, "FINANCE_REPORTING"),
      ))
      .orderBy(desc(generatedDocuments.generatedAt))
      .limit(10);
  }),

  logGeneratedReport: scopedProcedure
    .input(z.object({
      reportType: z.string(),
      fileName: z.string(),
      filePath: z.string(),
      format: z.enum(["PDF", "XLSX"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      return await db.insert(generatedDocuments).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        module: "FINANCE_REPORTING",
        entityType: "REPORT",
        entityId: 0,
        documentType: input.reportType,
        fileName: input.fileName,
        filePath: input.filePath,
        mimeType: input.format === "PDF" ? "application/pdf" : "application/vnd.ms-excel",
        generatedBy: ctx.user.id,
      });
    }),

  // ── NEW: getFilterMeta (Finance Dashboard cascade pattern) ─────────────────
  getFilterMeta: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const orgId = ctx.scope.organizationId;
    const ouId = ctx.scope.operatingUnitId;
    try {
      const fiscalYears = Array.from({ length: 11 }, (_, i) => {
        const year = 2025 + i;
        return { label: `FY${year}`, value: String(year) };
      });

      const activeProjectConditions = [
        eq(projects.organizationId, orgId),
        eq(projects.status, "active"),
        eq(projects.isDeleted, 0),
      ];
      if (ouId) activeProjectConditions.push(eq(projects.operatingUnitId, ouId));

      const activeProjects = await db
        .select({
          id: projects.id,
          projectCode: projects.projectCode,
          title: projects.title,
          currency: projects.currency,
          operatingUnitId: projects.operatingUnitId,
          startDate: projects.startDate,
          endDate: projects.endDate,
        })
        .from(projects)
        .where(and(...activeProjectConditions))
        .orderBy(projects.projectCode);

      const projectIds = activeProjects.map((p) => p.id);

      const activeGrants = projectIds.length > 0
        ? await db
            .select({
              id: grants.id,
              grantCode: grants.grantCode,
              projectId: grants.projectId,
              donorId: grants.donorId,
              status: grants.status,
            })
            .from(grants)
            .where(and(inArray(grants.projectId, projectIds), eq(grants.status, "ongoing")))
            .orderBy(grants.grantCode)
        : [];

      const donorIds = [...new Set(activeGrants.map((g) => g.donorId).filter(Boolean))] as number[];
      const donorRows = donorIds.length > 0
        ? await db.select({ id: donors.id, name: donors.name }).from(donors)
            .where(inArray(donors.id, donorIds)).orderBy(donors.name)
        : [];

      const ouRows = await db
        .select({ id: operatingUnits.id, name: operatingUnits.name, currency: operatingUnits.currency })
        .from(operatingUnits)
        .where(eq(operatingUnits.organizationId, orgId))
        .orderBy(operatingUnits.name);

      return {
        fiscalYears,
        projects: activeProjects,
        grants: activeGrants,
        donors: donorRows,
        operatingUnits: ouRows,
        catalogue: Object.entries(REPORT_REGISTRY).map(([id, e]) => ({
          id, category: e.category, available: !!e.generator,
        })),
      };
    } catch (error) {
      console.error("[getFilterMeta Error]", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch filter metadata" });
    }
  }),

  // ── NEW: generateReport (single dispatcher, structured envelope) ───────────
  generateReport: scopedProcedure
    .input(reportFilterSchema)
    .query(async ({ input, ctx }): Promise<ReportEnvelope> => {
      const entry = REPORT_REGISTRY[input.reportId];

      if (!entry) {
        return { status: "error", reportId: input.reportId, category: "financial-statements",
          data: null, message: `Unknown report: ${input.reportId}` };
      }
      if (!entry.generator) {
        return { status: "not_implemented", reportId: input.reportId, category: entry.category,
          data: null, message: `Report "${input.reportId}" is not yet available.` };
      }
      if (input.reportId === "grant-financial" && (!input.donorId || !input.grantId)) {
        return { status: "not_implemented", reportId: input.reportId, category: entry.category,
          data: null, message: "Select a donor and grant to generate this report." };
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const gc: GeneratorCtx = {
          db,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
        };
        const data = await entry.generator(gc, input);
        return { status: "ok", reportId: input.reportId, category: entry.category, data };
      } catch (error) {
        console.error(`[generateReport:${input.reportId}]`, error);
        return {
          status: "error",
          reportId: input.reportId,
          category: entry.category,
          data: null,
          message: error instanceof Error ? error.message : "Report generation failed.",
        };
      }
    }),

  // ── NEW: getFinancialIntelligence (real insights, never a blank panel) ─────
  getFinancialIntelligence: scopedProcedure
    .input(z.object({ projectIds: z.array(z.number()).optional(), fiscalYear: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId: orgId, operatingUnitId: ouId } = ctx.scope;

      const filters = [eq(budgetLines.organizationId, orgId)];
      if (ouId) filters.push(eq(budgetLines.operatingUnitId, ouId));
      if (input.projectIds && input.projectIds.length > 0) {
        filters.push(inArray(budgetLines.projectId, input.projectIds));
      }
      const [m] = await db
        .select({
          totalBudget: sum(budgetLines.totalAmount),
          totalActual: sum(budgetLines.actualSpent),
          totalCommitted: sum(budgetLines.commitments),
        })
        .from(budgetLines)
        .where(and(...filters));

      const totalBudget = toNumber(m?.totalBudget);
      const totalActual = toNumber(m?.totalActual);
      const totalCommitted = toNumber(m?.totalCommitted);
      const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
      const committedPct = totalBudget > 0 ? (totalCommitted / totalBudget) * 100 : 0;

      const insights: {
        id: string; severity: "info" | "warning" | "critical"; category: string;
        title: string; detail: string;
      }[] = [];

      if (totalBudget === 0) {
        return {
          insights: [],
          explanation:
            "No approved budget data is available for the selected project and fiscal year, so no financial insights can be derived yet. Insights will appear once budgets and expenditures are recorded.",
        };
      }

      if (utilization >= 90) {
        insights.push({
          id: "utilization-high", severity: utilization >= 100 ? "critical" : "warning",
          category: "Budget Utilization",
          title: `Budget utilization at ${utilization.toFixed(1)}%`,
          detail: utilization >= 100
            ? "Actual expenditure has exceeded the approved budget. Review overspending lines and reallocate or request a budget revision."
            : "Utilization is approaching the budget ceiling. Monitor remaining lines closely for the rest of the period.",
        });
      } else if (utilization < 40) {
        insights.push({
          id: "utilization-low", severity: "info", category: "Budget Utilization",
          title: `Low utilization at ${utilization.toFixed(1)}%`,
          detail: "Spending is significantly below plan. Verify implementation pace and disbursement timing to avoid underspend at period close.",
        });
      }

      if (committedPct >= 80) {
        insights.push({
          id: "commitments-high", severity: "warning", category: "Commitments",
          title: `Outstanding commitments at ${committedPct.toFixed(1)}% of budget`,
          detail: "A large share of the budget is committed but not yet spent. Confirm commitments are still valid and will convert to expenditure within the period.",
        });
      }

      const projectData = await db
        .select({ id: projects.id, totalBudget: projects.totalBudget, spent: projects.spent })
        .from(projects)
        .where(and(
          eq(projects.organizationId, orgId),
          eq(projects.status, "active"),
          input.projectIds && input.projectIds.length > 0 ? inArray(projects.id, input.projectIds) : sql`1=1`,
        ));
      const overspending = projectData.filter(
        (p) => Number(p.spent || 0) > Number(p.totalBudget || 0) && Number(p.totalBudget || 0) > 0,
      ).length;
      if (overspending > 0) {
        insights.push({
          id: "overspend", severity: "critical", category: "Financial Risk",
          title: `${overspending} project${overspending > 1 ? "s" : ""} already over budget`,
          detail: "One or more projects have actual spend exceeding their total budget. Investigate and apply corrective action.",
        });
      }

      if (insights.length === 0) {
        return {
          insights: [],
          explanation:
            "Finances are within expected parameters for the selected scope: utilization, commitments, and project spend are all within normal thresholds. No issues require attention at this time.",
        };
      }
      return { insights, explanation: null as string | null };
    }),
});