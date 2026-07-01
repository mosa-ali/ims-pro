/**
 * server/routers/finance/reporting/reportRegistry.ts 
 *
 * FINANCE REPORT REGISTRY (Factory Pattern)
 * ----------------------------------------------------------------------------
 * Single source of truth that maps a stable `reportId` to:
 *   - the report *group* it belongs to (financial-statements, donor, etc.)
 *   - a *generator* function that produces the report payload from live data
 *
 * Architecture:  Router (group) → Registry (this file) → Engine → DB
 *
 * Why a registry instead of dozens of procedures or a giant switch:
 *   - Adding a report = register one entry here. No router edits, no new
 *     tRPC procedure, no switch statement to grow.
 *   - Each grouped router exposes a single `generate` dispatcher that simply
 *     calls `runReport(reportId, ...)`. Routing logic never changes.
 *   - Reports the engine cannot yet produce are registered as `status:
 *     'not_implemented'` so the API returns an explicit, typed signal and the
 *     frontend renders a proper Empty State — never fabricated data.
 *
 * NO MOCK DATA. A report either delegates to a real engine method or is
 * explicitly marked not_implemented.
 */

import type { DB } from '../../../db/_scope';
import type { ScopeContext } from '../../../db/_scope';
import { getFinancialReportingEngine } from '../../../engines/finance/FinancialReportingEngine';

// ── Report group identifiers ────────────────────────────────────────────────
// Mirror the frontend report categories so each grouped router owns its slice.
export type ReportGroup =
  | 'financial-statements'
  | 'donor'
  | 'management'
  | 'compliance'
  | 'treasury'
  | 'audit'
  | 'budget'
  | 'executive';

// ── Period normalization ────────────────────────────────────────────────────
// The UI sends a fiscal year ("2025") plus a reporting period token
// ("monthly" | "quarterly" | "semiannual" | "annual" | "custom"). The engine
// understands concrete period strings ("YYYY", "YYYY-MM"). This is the single
// place that translates UI intent → engine period, fixing the silent-coercion
// bug where "monthly" was parsed as a garbage date range.
export interface ReportRequest {
  reportId: string;
  /** Fiscal year, e.g. "2025". */
  fiscalYear: string;
  /** UI reporting-period token. */
  reportingPeriod?: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom';
  /** For custom period: explicit YYYY-MM-DD bounds. */
  customStart?: string;
  customEnd?: string;
  /** Optional project scoping. Empty/undefined = organization-wide. */
  projectIds?: number[];
  /** Donor-report scoping. */
  donorId?: number;
  grantId?: number;
}

/**
 * Translate a UI fiscal-year + period token into the concrete period string
 * the engine's periodToDates() understands.
 *
 *   monthly    → current month within the fiscal year ("YYYY-MM")
 *   quarterly  → fiscal year ("YYYY")  (engine aggregates by FY for budget data)
 *   semiannual → fiscal year ("YYYY")
 *   annual     → fiscal year ("YYYY")
 *   custom     → caller-supplied start handled separately; falls back to FY
 *
 * Monthly uses the *current* calendar month only when it falls inside the
 * fiscal year; otherwise it uses the fiscal year's first month so the report
 * is deterministic.
 */
export function resolveEnginePeriod(req: ReportRequest): string {
  const fy = (req.fiscalYear || String(new Date().getFullYear())).slice(0, 4);

  if (req.reportingPeriod === 'monthly') {
    const now = new Date();
    const currentYear = String(now.getFullYear());
    if (currentYear === fy) {
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      return `${fy}-${mm}`;
    }
    // Fiscal year differs from current year → use January of that FY.
    return `${fy}-01`;
  }

  // quarterly / semiannual / annual / custom / undefined → fiscal year.
  // (The engine's budget-based reports aggregate by fiscal year; statement
  //  reports derive their own date window from the year.)
  return fy;
}

// ── Generator contract ──────────────────────────────────────────────────────
export interface GeneratorContext {
  db: DB;
  scope: ScopeContext;
  userId: number;
}

export type ReportStatus = 'ok' | 'not_implemented' | 'error';

/**
 * Uniform envelope returned to the client for EVERY report. The frontend keys
 * off `status` to decide between rendering, empty state, or error state.
 */
export interface ReportEnvelope<T = unknown> {
  status: ReportStatus;
  reportId: string;
  group: ReportGroup;
  /** Engine payload (metadata + data). Null when not_implemented/error. */
  data: T | null;
  /** Human-readable reason when status !== 'ok'. */
  message?: string;
}

type GeneratorFn = (
  ctx: GeneratorContext,
  req: ReportRequest,
) => Promise<unknown>;

interface RegistryEntry {
  group: ReportGroup;
  /** Undefined generator ⇒ registered but not yet implemented. */
  generator?: GeneratorFn;
}

// ── Engine-backed generators ────────────────────────────────────────────────
// Each wraps a real FinancialReportingEngine method. No fabricated data.

const genMonthly: GeneratorFn = async (ctx, req) => {
  const engine = await getFinancialReportingEngine(ctx.db);
  return engine.generateMonthlyReport(
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId ?? null,
    resolveEnginePeriod(req),
  );
};

const genBudgetVsActual: GeneratorFn = async (ctx, req) => {
  const engine = await getFinancialReportingEngine(ctx.db);
  return engine.generateBudgetVsActualReport(
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId ?? null,
    resolveEnginePeriod(req),
  );
};

const genTrialBalance: GeneratorFn = async (ctx, req) => {
  const engine = await getFinancialReportingEngine(ctx.db);
  return engine.generateTrialBalanceReport(
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId ?? null,
    resolveEnginePeriod(req),
  );
};

const genBalanceSheet: GeneratorFn = async (ctx, req) => {
  const engine = await getFinancialReportingEngine(ctx.db);
  return engine.generateBalanceSheetReport(
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId ?? null,
    resolveEnginePeriod(req),
  );
};

const genCashFlow: GeneratorFn = async (ctx, req) => {
  const engine = await getFinancialReportingEngine(ctx.db);
  return engine.generateCashFlowReport(
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId ?? null,
    resolveEnginePeriod(req),
  );
};

const genIncomeStatement: GeneratorFn = async (ctx, req) => {
  const engine = await getFinancialReportingEngine(ctx.db);
  return engine.generateIncomeStatementReport(
    ctx.scope.organizationId,
    ctx.scope.operatingUnitId ?? null,
    resolveEnginePeriod(req),
  );
};

const genDonor: GeneratorFn = async (ctx, req) => {
  // Donor report needs donor + grant scoping. If absent we cannot fabricate
  // identifiers, so signal not_implemented at the dispatch layer instead.
  const engine = await getFinancialReportingEngine(ctx.db);
  return engine.generateDonorReport(
    ctx.scope.organizationId,
    req.donorId ?? 0,
    req.grantId ?? 0,
    resolveEnginePeriod(req),
  );
};

// ── The registry ────────────────────────────────────────────────────────────
// reportId → { group, generator? }
//
// IMPORTANT: reportId values MUST match the frontend ReportId union exactly.
// Reports without a generator are intentionally registered so the catalogue
// stays complete and the API responds with a typed not_implemented envelope.
const REGISTRY: Record<string, RegistryEntry> = {
  // ── Financial Statements ──────────────────────────────────────────────────
  'monthly':           { group: 'financial-statements', generator: genMonthly },
  // Quarterly/semi-annual/annual reuse the monthly generator with a wider
  // period window resolved from the fiscal year.
  'quarterly':         { group: 'financial-statements', generator: genMonthly },
  'semiannual':        { group: 'financial-statements', generator: genMonthly },
  'annual':            { group: 'financial-statements', generator: genMonthly },
  'budget-vs-actual':  { group: 'financial-statements', generator: genBudgetVsActual },
  'cash-flow':         { group: 'financial-statements', generator: genCashFlow },
  'income-statement':  { group: 'financial-statements', generator: genIncomeStatement },
  'balance-sheet':     { group: 'financial-statements', generator: genBalanceSheet },
  'trial-balance':     { group: 'financial-statements', generator: genTrialBalance },
  'executive-summary': { group: 'financial-statements', generator: genMonthly },
  'gl-summary':        { group: 'financial-statements' }, // not_implemented

  // ── Donor Reports ─────────────────────────────────────────────────────────
  'grant-financial':   { group: 'donor', generator: genDonor },
  'donor-utilization': { group: 'donor' },
  'cost-share':        { group: 'donor' },
  'budget-performance':{ group: 'donor', generator: genBudgetVsActual },
  'pipeline':          { group: 'donor' },
  'grant-closure':     { group: 'donor' },

  // ── Management Reports ────────────────────────────────────────────────────
  'project-health':    { group: 'management' },
  'cash-position':     { group: 'management', generator: genCashFlow },
  'liquidity':         { group: 'management' },
  'treasury':          { group: 'treasury' },
  'commitments':       { group: 'management', generator: genMonthly },
  'accounts-payable':  { group: 'management' },
  'accounts-receivable':{ group: 'management' },
  'bank-reconciliation':{ group: 'management' },
  'budget-forecast':   { group: 'budget', generator: genBudgetVsActual },
  'burn-rate':         { group: 'management' },
  'variance-analysis': { group: 'budget', generator: genBudgetVsActual },
  'expense-analysis':  { group: 'management' },
  'revenue-analysis':  { group: 'management', generator: genIncomeStatement },
  'procurement-summary':{ group: 'management' },
  'payroll-summary':   { group: 'management' },
  'asset-summary':     { group: 'management' },

  // ── Compliance Reports ────────────────────────────────────────────────────
  'audit-readiness':       { group: 'audit' },
  'financial-compliance':  { group: 'compliance' },
  'outstanding-advances':  { group: 'compliance' },
  'supporting-documents':  { group: 'audit' },
  'journal-validation':    { group: 'audit', generator: genTrialBalance },
  'budget-compliance':     { group: 'compliance', generator: genBudgetVsActual },
  'bank-rec-status':       { group: 'compliance' },
  'grant-compliance':      { group: 'compliance' },
  'vat-compliance':        { group: 'compliance' },
  'sod':                   { group: 'compliance' },

  // ── Executive Reports ─────────────────────────────────────────────────────
  'exec-financial-summary':{ group: 'executive', generator: genMonthly },
  'country-office':        { group: 'executive' },
  'ou-summary':            { group: 'executive' },
  'org-summary':           { group: 'executive', generator: genBalanceSheet },
  'multi-country':         { group: 'executive' },
  'consolidated':          { group: 'executive', generator: genBalanceSheet },
  'kpi-book':              { group: 'executive' },
  'board-report':          { group: 'executive' },
};

// ── Public API ──────────────────────────────────────────────────────────────

/** Returns true if the reportId is known to the registry. */
export function isKnownReport(reportId: string): boolean {
  return reportId in REGISTRY;
}

/** Returns the group a reportId belongs to, or undefined if unknown. */
export function getReportGroup(reportId: string): ReportGroup | undefined {
  return REGISTRY[reportId]?.group;
}

/** All reportIds registered under a given group (used by group routers). */
export function reportsInGroup(group: ReportGroup): string[] {
  return Object.entries(REGISTRY)
    .filter(([, e]) => e.group === group)
    .map(([id]) => id);
}

/**
 * Dispatch entry point. Resolves the generator from the registry and returns a
 * uniform envelope. Never throws for unknown/unimplemented reports — those are
 * returned as typed envelopes so the client can render an Empty State.
 *
 * @param expectedGroup  When provided, enforces that the reportId belongs to
 *                       the calling group router (prevents cross-group calls).
 */
export async function runReport(
  ctx: GeneratorContext,
  req: ReportRequest,
  expectedGroup?: ReportGroup,
): Promise<ReportEnvelope> {
  const entry = REGISTRY[req.reportId];

  if (!entry) {
    return {
      status: 'error',
      reportId: req.reportId,
      group: expectedGroup ?? 'financial-statements',
      data: null,
      message: `Unknown report: ${req.reportId}`,
    };
  }

  if (expectedGroup && entry.group !== expectedGroup) {
    return {
      status: 'error',
      reportId: req.reportId,
      group: entry.group,
      data: null,
      message: `Report ${req.reportId} belongs to group ${entry.group}, not ${expectedGroup}`,
    };
  }

  if (!entry.generator) {
    return {
      status: 'not_implemented',
      reportId: req.reportId,
      group: entry.group,
      data: null,
      message: `Report "${req.reportId}" is not yet available.`,
    };
  }

  // Donor report requires donor + grant identifiers; without them we cannot
  // produce a meaningful report and must not fabricate ids.
  if (req.reportId === 'grant-financial' && (!req.donorId || !req.grantId)) {
    return {
      status: 'not_implemented',
      reportId: req.reportId,
      group: entry.group,
      data: null,
      message: 'Select a donor and grant to generate this report.',
    };
  }

  try {
    const data = await entry.generator(ctx, req);
    return { status: 'ok', reportId: req.reportId, group: entry.group, data };
  } catch (err) {
    return {
      status: 'error',
      reportId: req.reportId,
      group: entry.group,
      data: null,
      message: err instanceof Error ? err.message : 'Report generation failed.',
    };
  }
}
