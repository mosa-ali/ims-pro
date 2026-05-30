// getPortfolioFinancialSnapshot.ts
// Standalone reference for the Portfolio Financial Snapshot tRPC procedure.
// This procedure lives inside projectsRouter.ts under the 'projects' router.
// 
// LOCATION IN CODEBASE: server/projectsRouter.ts
// TRPC PATH: trpc.projects.getPortfolioFinancialSnapshot
// 
// Required imports (already present in projectsRouter.ts):
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { projects, grants, budgets } from 'drizzle/schema';
import { STATUS } from '../../db/_status';
import { scopedProcedure } from '../../_core/trpc';
import { getDb } from '../../db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Temporary currency normalization helper
// TODO:
// Replace later with centralized FX service/table
// using organization exchange rates.
// ─────────────────────────────────────────────────────────────
function convertToUSD(amount: number, currency: string): number {
  if (!amount || Number.isNaN(amount)) return 0;

  const normalized = currency?.toUpperCase?.() ?? 'USD';

  // Temporary static conversion rates
  // Replace with real FX table/service later
  const rates: Record<string, number> = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.27,
    SAR: 0.27,
    AED: 0.27,
    YER: 0.004,
  };

  const rate = rates[normalized] ?? 1;

  return amount * rate;
}

  getPortfolioFinancialSnapshot: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const { organizationId, operatingUnitId } = ctx.scope;

      // ── 1. Active + planning projects: sum totalBudget and spent ─────────────
      const activeProjects = await db
        .select({
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          currency: projects.currency,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, organizationId),
            eq(projects.operatingUnitId, operatingUnitId),
            inArray(projects.status, [STATUS.PROJECT.ACTIVE, STATUS.PROJECT.PLANNING]),
            eq(projects.isDeleted, 0)
          )
        );

      let totalBudget = 0;
      let totalSpent = 0;

      activeProjects.forEach((p) => {
        totalBudget += convertToUSD(Number(p.totalBudget || 0), p.currency ?? 'USD');
        totalSpent  += convertToUSD(Number(p.spent || 0),       p.currency ?? 'USD');
      });

      // ── 2. Active grants: sum grantAmount for ongoing grants ─────────────────
      // grants.operatingUnitId is nullable — include org-level grants (NULL) and
      // OU-scoped grants that match the current operating unit.
      const activeGrantRows = await db
        .select({
          grantAmount: grants.grantAmount,
          currency: grants.currency,
        })
        .from(grants)
        .where(
          and(
            eq(grants.organizationId, organizationId),
            or(
              isNull(grants.operatingUnitId),
              eq(grants.operatingUnitId, operatingUnitId)
            ),
            eq(grants.isDeleted, 0),
            eq(grants.status, STATUS.GRANT.ONGOING)
          )
        );

      let activeGrantsValue = 0;
      activeGrantRows.forEach((g) => {
        activeGrantsValue += convertToUSD(Number(g.grantAmount || 0), g.currency ?? 'USD');
      });

      // ── 3. Approved + revised budgets: authoritative financial source ────────
      const approvedBudgetRows = await db
        .select({
          totalApprovedAmount: budgets.totalApprovedAmount,
          totalActualAmount: budgets.totalActualAmount,
          currency: budgets.currency,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.organizationId, organizationId),
            eq(budgets.operatingUnitId, operatingUnitId),
            inArray(budgets.status, [STATUS.BUDGET.APPROVED, STATUS.BUDGET.REVISED]),
            eq(budgets.isDeleted, 0)
          )
        );

      let approvedBudgetTotal = 0;
      let approvedActualTotal = 0;
      approvedBudgetRows.forEach((b) => {
        approvedBudgetTotal += convertToUSD(Number(b.totalApprovedAmount || 0), b.currency ?? 'USD');
        approvedActualTotal += convertToUSD(Number(b.totalActualAmount  || 0), b.currency ?? 'USD');
      });

      // ── 4. Prefer approved-budget data when richer than project-level data ─
      // If approved budgets exist, they are the authoritative source.
      const finalBudget = approvedBudgetTotal > 0 ? approvedBudgetTotal : totalBudget;
      const finalSpent  = approvedActualTotal  > 0 ? approvedActualTotal  : totalSpent;

      const remainingBalance = finalBudget - finalSpent;
      const utilizationRate  = finalBudget > 0
        ? Math.round((finalSpent / finalBudget) * 1000) / 10  // one decimal, e.g. 60.4
        : 0;

      return {
        totalBudget:      Math.round(finalBudget),
        totalSpent:       Math.round(finalSpent),
        remainingBalance: Math.round(remainingBalance),
        utilizationRate,
        activeProjects:   activeProjects.length,
        activeGrants:     activeGrantRows.length,
        activeGrantsValue: Math.round(activeGrantsValue),
      };
    })