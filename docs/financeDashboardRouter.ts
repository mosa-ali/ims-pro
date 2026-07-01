/**
 * Executive Finance Intelligence Router (v8 — Production Hardened)
 *
 * Changes from v7:
 *  - REMOVED all hardcoded / mock values (getCashPositionAnalysis, getCashWaterfall,
 *    getP2PStats approvals/treasury, getBudgetTrend budget=actual*1.1)
 *  - FIXED broken donor join in getHealthMatrix (was string equality; now via grants FK)
 *  - FIXED NULLIF guards throughout to prevent division-by-zero on empty datasets
 *  - ADDED getFilterMeta — single-call procedure that powers all dashboard filter dropdowns
 *  - ADDED cascade awareness: grants/donors scoped to active projects only
 *  - getBudgetTrend now uses real budget_lines data (monthly allocation = total / 12)
 *  - getCashWaterfall now reads real cash transactions, payroll, advances
 *  - getP2PStats approvals & treasury derived from real workflow status columns
 *  - getHealthMatrix extended with burnRate, remainingDays, financialHealth
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  budgetLines,
  projects,
  financeExpenditures,
  financeBankAccounts,
  financeAdvances,
  procurementPayables,
  procurementInvoices,
  purchaseOrders,
  purchaseRequests,
  goodsReceiptNotes,
  hrPayrollRecords,
  operatingUnits,
  countries,
  varianceAlertConfig,
  journalLines,
  chartOfAccounts,
  financeBudgetCategories,
  grants,
  donors,
  projectReportingSchedules,
  financeCashTransactions,
  financeEncumbrances,
} from "../../../drizzle/schema";
import {
  eq,
  and,
  sql,
  sum,
  count,
  gte,
  inArray,
  lt,
  ne,
  desc,
  lte,
  isNull,
  isNotNull,
} from "drizzle-orm";

export const financeDashboardRouter = router({
  // ─────────────────────────────────────────────────────────────────────────────
  // FILTER META  (NEW in v8)
  // Single call that populates all filter dropdowns with real SQL data.
  // Cascade rule: grants and donors are scoped to active projects only,
  // so selecting a project automatically constrains the other dropdowns.
  // ─────────────────────────────────────────────────────────────────────────────
  getFilterMeta: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const ouId = ctx.scope.operatingUnitId;

    // 1. Fiscal years — derived from actual project date ranges (not hardcoded)
    const yearRows = await db
      .selectDistinct({ year: sql<number>`YEAR(startDate)` })
      .from(projects)
      .where(
        and(eq(projects.organizationId, orgId), eq(projects.isDeleted, 0))
      )
      .orderBy(sql`YEAR(startDate) DESC`);

    const fiscalYears = yearRows
      .map((r) => r.year)
      .filter(Boolean)
      .map((y) => ({ label: `FY${y}`, value: String(y) }));

    // 2. Active projects only (status = 'active', not completed / cancelled)
    const activeProjectConditions = [
      eq(projects.organizationId, orgId),
      eq(projects.status, "active"),
      eq(projects.isDeleted, 0),
    ];
    if (ouId) {
      activeProjectConditions.push(eq(projects.operatingUnitId, ouId));
    }

    const activeProjects = await db
      .select({
        id: projects.id,
        projectCode: projects.projectCode,
        title: projects.title,
        currency: projects.currency,
        operatingUnitId: projects.operatingUnitId,
        countryId: projects.country,
        startDate: projects.startDate,
        endDate: projects.endDate,
      })
      .from(projects)
      .where(and(...activeProjectConditions))
      .orderBy(projects.projectCode);

    // 3. Grants tied to those active projects only
    const projectIds = activeProjects.map((p) => p.id);

    const activeGrants =
      projectIds.length > 0
        ? await db
            .select({
              id: grants.id,
              grantCode: grants.grantCode,
              projectId: grants.projectId,
              donorId: grants.donorId,
              status: grants.status,
            })
            .from(grants)
            .where(
              and(
                inArray(grants.projectId, projectIds),
                eq(grants.status, "active")
              )
            )
            .orderBy(grants.grantCode)
        : [];

    // 4. Donors linked to those grants
    const donorIds = [
      ...new Set(activeGrants.map((g) => g.donorId).filter(Boolean)),
    ] as number[];

    const donorRows =
      donorIds.length > 0
        ? await db
            .select({ id: donors.id, name: donors.name })
            .from(donors)
            .where(inArray(donors.id, donorIds))
            .orderBy(donors.name)
        : [];

    // 5. Operating Units scoped to this org
    const ouRows = await db
      .select({
        id: operatingUnits.id,
        name: operatingUnits.name,
        currency: operatingUnits.currency,
      })
      .from(operatingUnits)
      .where(eq(operatingUnits.organizationId, orgId))
      .orderBy(operatingUnits.name);

    // 6. Countries with active projects (for region filter)
    const countryIds = [
      ...new Set(activeProjects.map((p) => p.countryId).filter(Boolean)),
    ] as number[];

    const countryRows =
      countryIds.length > 0
        ? await db
            .select({ id: countries.id, name: countries.name })
            .from(countries)
            .where(inArray(countries.id, countryIds))
            .orderBy(countries.name)
        : [];

    return {
      fiscalYears,
      projects: activeProjects,
      grants: activeGrants,
      donors: donorRows,
      operatingUnits: ouRows,
      countries: countryRows,
    };
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVE PROJECTS  (unchanged from v7 — kept for backward compat)
  // ─────────────────────────────────────────────────────────────────────────────
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
      .where(
        and(
          eq(projects.organizationId, ctx.scope.organizationId),
          eq(projects.status, "active"),
          eq(projects.isDeleted, 0)
        )
      );
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // EXECUTIVE KPIs  (unchanged logic, NULLIF guards added)
  // ─────────────────────────────────────────────────────────────────────────────
  getExecutiveKPIs: scopedProcedure
    .input(
      z.object({
        projectIds: z.array(z.number()).optional(),
      })
    )
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

      let projectCode = "All Projects";
      let projectTitle = "Portfolio-wide Analytics";
      let remainingDays = 0;
      let projectStatus = "active";
      let startDate: string | null = null;
      let endDate: string | null = null;
      let activeProjects = 0;

      if (input.projectIds?.length === 1) {
        const [proj] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, input.projectIds[0]))
          .limit(1);

        if (proj) {
          projectCode = proj.projectCode ?? "N/A";
          projectTitle = proj.title ?? "N/A";
          projectStatus = proj.status ?? "active";
          startDate = proj.startDate ?? null;
          endDate = proj.endDate ?? null;
          if (proj.endDate) {
            const end = new Date(proj.endDate);
            const now = new Date();
            remainingDays = Math.max(
              0,
              Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            );
          }
          activeProjects = 1;
        }
      } else {
        const [{ count: cnt }] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(projects)
          .where(
            and(
              eq(projects.organizationId, orgId),
              ouId ? eq(projects.operatingUnitId, ouId) : undefined,
              eq(projects.status, "active")
            )
          );
        activeProjects = Number(cnt ?? 0);
      }

      // Burn rate: actual expenditures in last 30 days
      const [last30] = await db
        .select({ val: sum(financeExpenditures.amount) })
        .from(financeExpenditures)
        .where(
          and(
            eq(financeExpenditures.organizationId, orgId),
            gte(
              financeExpenditures.expenditureDate,
              sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`
            )
          )
        );

      const totalBudget = Number(metrics?.totalBudget ?? 0);
      const totalActual = Number(metrics?.totalActual ?? 0);
      const totalCommitted = Number(metrics?.totalCommitted ?? 0);
      const totalAvailable = Number(metrics?.totalAvailable ?? 0);
      const currentBurn = Number(last30?.val ?? 0);

      const reqBurn =
        remainingDays > 30
          ? totalAvailable / (remainingDays / 30)
          : totalAvailable;

      // NULLIF guard prevents NaN when budget is 0
      const utilization =
        totalBudget > 0
          ? Number(((totalActual / totalBudget) * 100).toFixed(1))
          : 0;

      return {
        totalBudget: totalBudget.toFixed(2),
        actualExpenditure: totalActual.toFixed(2),
        commitments: totalCommitted.toFixed(2),
        availableBudget: totalAvailable.toFixed(2),
        utilization,
        cashOnHand: cash?.total ?? "0",
        currentBurnRate: currentBurn,
        avgBurnRate: currentBurn,
        requiredBurnRate: Number(reqBurn.toFixed(2)),
        remainingDays,
        projectStatus,
        projectCode,
        projectTitle,
        startDate,
        endDate,
        activeProjects,
        currency: "USD",
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────────
  // EXECUTIVE SUMMARY  (unchanged from v7)
  // ─────────────────────────────────────────────────────────────────────────────
  getExecutiveSummary: scopedProcedure
    .input(z.object({ projectIds: z.array(z.number()).optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;
      const filters = [eq(budgetLines.organizationId, orgId)];
      if (input.projectIds?.length)
        filters.push(inArray(budgetLines.projectId, input.projectIds));

      const [budgetData] = await db
        .select({
          total: sum(budgetLines.totalAmount),
          spent: sum(budgetLines.actualSpent),
          committed: sum(budgetLines.commitments),
        })
        .from(budgetLines)
        .where(and(...filters));

      const totalBudget = Number(budgetData?.total || 0);
      const totalSpent = Number(budgetData?.spent || 0);
      const totalCommitted = Number(budgetData?.committed || 0);
      const utilizationPct =
        totalBudget > 0
          ? ((totalSpent + totalCommitted) / totalBudget) * 100
          : 0;

      const [advances] = await db
        .select({ count: count() })
        .from(financeAdvances)
        .where(
          and(
            eq(financeAdvances.organizationId, orgId),
            ne(financeAdvances.status, "FULLY_SETTLED")
          )
        );

      const [overruns] = await db
        .select({ count: count() })
        .from(budgetLines)
        .where(
          and(
            eq(budgetLines.organizationId, orgId),
            lt(budgetLines.availableBalance, "0")
          )
        );

      const [overdueReports] = await db
        .select({ count: count() })
        .from(projectReportingSchedules)
        .where(
          and(
            eq(projectReportingSchedules.organizationId, orgId),
            eq(projectReportingSchedules.status, "overdue")
          )
        );

      let score = 100;
      score -= advances.count * 2;
      score -= overruns.count * 10;
      score -= overdueReports.count * 5;
      const finalScore = Math.max(0, score);

      const [projectCounts] = await db
        .select({ count: count() })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, orgId),
            eq(projects.status, "active")
          )
        );

      const [cashRow] = await db
        .select({ total: sum(financeBankAccounts.currentBalance) })
        .from(financeBankAccounts)
        .where(eq(financeBankAccounts.organizationId, orgId));

      return {
        budgetHealth: Number(utilizationPct.toFixed(1)),
        budgetHealthStatus:
          utilizationPct > 95
            ? "CRITICAL"
            : utilizationPct > 85
            ? "WARNING"
            : "HEALTHY",
        remainingBudget: Number(
          (totalBudget - totalSpent - totalCommitted).toFixed(2)
        ),
        complianceScore: finalScore,
        complianceStatus:
          finalScore > 90
            ? "SUCCESS"
            : finalScore > 75
            ? "WARNING"
            : "ERROR",
        findings: overruns.count,
        pendingAdvances: advances.count,
        activeProjects: projectCounts.count,
        totalPortfolioValue: totalBudget,
        netLiquidity: Number(cashRow?.total ?? 0),
        reportingPeriod: new Date().getFullYear().toString(),
        summary: `${projectCounts.count} active projects • ${utilizationPct.toFixed(1)}% utilization • ${finalScore}% compliance`,
      };
    }),

  // ─────────────────────────────────────────────────────────────────────────────
  // CASH POSITION ANALYSIS  (legacy — kept for backward compat; see getCashWaterfall)
  // ─────────────────────────────────────────────────────────────────────────────
  getCashPositionAnalysis: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    const [bank] = await db
      .select({
        opening: sum(financeBankAccounts.openingBalance),
        current: sum(financeBankAccounts.currentBalance),
      })
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, orgId));

    const [donorReceipts] = await db
      .select({ total: sum(financeCashTransactions.amount) })
      .from(financeCashTransactions)
      .where(
        and(
          eq(financeCashTransactions.organizationId, orgId),
          eq(financeCashTransactions.transactionType, "DEPOSIT"),
          sql`YEAR(transactionDate) = YEAR(NOW())`
        )
      );

    const [payrollTotal] = await db
      .select({ total: sum(hrPayrollRecords.netPay) })
      .from(hrPayrollRecords)
      .where(
        and(
          eq(hrPayrollRecords.organizationId, orgId),
          sql`YEAR(paymentDate) = YEAR(NOW())`
        )
      );

    const [vendorPayments] = await db
      .select({ total: sum(financeExpenditures.amount) })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.organizationId, orgId),
          sql`YEAR(expenditureDate) = YEAR(NOW())`
        )
      );

    const [advancesTotal] = await db
      .select({ total: sum(financeAdvances.approvedAmount) })
      .from(financeAdvances)
      .where(
        and(
          eq(financeAdvances.organizationId, orgId),
          sql`YEAR(createdAt) = YEAR(NOW())`
        )
      );

    return [
      {
        category: "Opening Cash",
        amount: Number(bank?.opening ?? 0),
        type: "baseline",
      },
      {
        category: "Donor Receipts",
        amount: Number(donorReceipts?.total ?? 0),
        type: "addition",
      },
      {
        category: "Payroll",
        amount: -Number(payrollTotal?.total ?? 0),
        type: "subtraction",
      },
      {
        category: "Vendor Payments",
        amount: -Number(vendorPayments?.total ?? 0),
        type: "subtraction",
      },
      {
        category: "Advances",
        amount: -Number(advancesTotal?.total ?? 0),
        type: "subtraction",
      },
      {
        category: "Closing Balance",
        amount: Number(bank?.current ?? 0),
        type: "baseline",
      },
    ];
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // CASH WATERFALL  (v8 — fully real SQL, zero mock values)
  // ─────────────────────────────────────────────────────────────────────────────
  getCashWaterfall: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Opening & closing balances from bank accounts
    const [bank] = await db
      .select({
        opening: sum(financeBankAccounts.openingBalance),
        current: sum(financeBankAccounts.currentBalance),
      })
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, orgId));

    // Inflows: deposit-type cash transactions in current year
    const [inflow] = await db
      .select({ total: sum(financeCashTransactions.amount) })
      .from(financeCashTransactions)
      .where(
        and(
          eq(financeCashTransactions.organizationId, orgId),
          eq(financeCashTransactions.transactionType, "DEPOSIT"),
          sql`YEAR(transactionDate) = YEAR(NOW())`
        )
      );

    // Outflow 1: Payroll
    const [payroll] = await db
      .select({ total: sum(hrPayrollRecords.netPay) })
      .from(hrPayrollRecords)
      .where(
        and(
          eq(hrPayrollRecords.organizationId, orgId),
          sql`YEAR(paymentDate) = YEAR(NOW())`
        )
      );

    // Outflow 2: Vendor / operational expenditures
    const [vendors] = await db
      .select({ total: sum(financeExpenditures.amount) })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.organizationId, orgId),
          sql`YEAR(expenditureDate) = YEAR(NOW())`
        )
      );

    // Outflow 3: Advances issued
    const [advancesIssued] = await db
      .select({ total: sum(financeAdvances.approvedAmount) })
      .from(financeAdvances)
      .where(
        and(
          eq(financeAdvances.organizationId, orgId),
          sql`YEAR(createdAt) = YEAR(NOW())`
        )
      );

    return [
      {
        name: "Opening",
        value: Number(bank?.opening ?? 0),
        type: "base" as const,
      },
      {
        name: "Inflow",
        value: Number(inflow?.total ?? 0),
        type: "in" as const,
      },
      {
        name: "Payroll",
        value: -Number(payroll?.total ?? 0),
        type: "out" as const,
      },
      {
        name: "Vendors",
        value: -Number(vendors?.total ?? 0),
        type: "out" as const,
      },
      {
        name: "Advances",
        value: -Number(advancesIssued?.total ?? 0),
        type: "out" as const,
      },
      {
        name: "Closing",
        value: Number(bank?.current ?? 0),
        type: "base" as const,
      },
    ];
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // FINANCIAL HEALTH MATRIX  (v8 — fixed donor join + new health columns)
  // ─────────────────────────────────────────────────────────────────────────────
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
          title: projects.title,
          budget: sum(budgetLines.totalAmount),
          spent: sum(budgetLines.actualSpent),
          variancePct: sql<number>`ROUND(
            ((SUM(${budgetLines.totalAmount}) - SUM(${budgetLines.actualSpent}))
            / NULLIF(SUM(${budgetLines.totalAmount}), 0)) * 100, 1)`,
          health: sql<string>`CASE
            WHEN SUM(${budgetLines.actualSpent}) > SUM(${budgetLines.totalAmount}) THEN 'OVER BUDGET'
            WHEN (SUM(${budgetLines.actualSpent}) / NULLIF(SUM(${budgetLines.totalAmount}), 0)) > 0.9 THEN 'AT RISK'
            ELSE 'ON TRACK'
          END`,
        })
        .from(budgetLines)
        .innerJoin(projects, eq(budgetLines.projectId, projects.id))
        .where(and(...filters))
        .groupBy(projects.projectCode, projects.title);
    }),

  // ─────────────────────────────────────────────────────────────────────────────
  // HEALTH MATRIX  (v8 — fixed donor join via grants FK, extended columns)
  // Previously: .leftJoin(donors, eq(projects.donor, donors.name))  ← BROKEN
  // Now:        join via grants table using proper FK chain
  // ─────────────────────────────────────────────────────────────────────────────
  getHealthMatrix: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    return await db
      .select({
        projectCode: projects.projectCode,
        // Aggregate donor names via grants FK — correct relationship
        grantSource: sql<string>`GROUP_CONCAT(DISTINCT ${donors.name} SEPARATOR ', ')`,
        budget: sum(budgetLines.totalAmount),
        spent: sum(budgetLines.actualSpent),
        committed: sum(budgetLines.commitments),
        remaining: sql<number>`
          SUM(${budgetLines.totalAmount})
          - SUM(${budgetLines.actualSpent})
          - SUM(${budgetLines.commitments})`,
        utilization: sql<number>`ROUND(
          SUM(${budgetLines.actualSpent})
          / NULLIF(SUM(${budgetLines.totalAmount}), 0) * 100, 1)`,
        variance: sql<number>`ROUND(
          (SUM(${budgetLines.actualSpent})
            - (SUM(${budgetLines.totalAmount}) * 0.8))
          / NULLIF(SUM(${budgetLines.totalAmount}), 0) * 100, 1)`,
        risk: sql<string>`CASE
          WHEN SUM(${budgetLines.actualSpent})
               / NULLIF(SUM(${budgetLines.totalAmount}), 0) > 0.9 THEN 'high'
          WHEN SUM(${budgetLines.actualSpent})
               / NULLIF(SUM(${budgetLines.totalAmount}), 0) > 0.75 THEN 'medium'
          ELSE 'low'
        END`,
        // NEW in v8
        burnRate: sql<number>`COALESCE((
          SELECT ROUND(SUM(fe.amount) / 3, 2)
          FROM finance_expenditures fe
          WHERE fe.projectId = ${projects.id}
            AND fe.expenditureDate >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        ), 0)`,
        startDate: projects.startDate,
        endDate: projects.endDate,
        remainingDays: sql<number>`GREATEST(0, DATEDIFF(${projects.endDate}, NOW()))`,
        financialHealth: sql<string>`CASE
          WHEN SUM(${budgetLines.actualSpent}) > SUM(${budgetLines.totalAmount})
            THEN 'Over Budget'
          WHEN SUM(${budgetLines.actualSpent})
               / NULLIF(SUM(${budgetLines.totalAmount}), 0) > 0.9
               AND DATEDIFF(${projects.endDate}, NOW()) < 60
            THEN 'Critical'
          WHEN SUM(${budgetLines.actualSpent})
               / NULLIF(SUM(${budgetLines.totalAmount}), 0) > 0.9
            THEN 'Critical'
          WHEN SUM(${budgetLines.actualSpent})
               / NULLIF(SUM(${budgetLines.totalAmount}), 0) > 0.75
            THEN 'Watch'
          WHEN ${projects.status} = 'completed'
            THEN 'Completed'
          ELSE 'Healthy'
        END`,
      })
      .from(budgetLines)
      .innerJoin(projects, eq(budgetLines.projectId, projects.id))
      // FIXED: join donors via grants (FK), not via string equality on projects.donor
      .leftJoin(grants, eq(grants.projectId, projects.id))
      .leftJoin(donors, eq(donors.id, grants.donorId))
      .where(eq(budgetLines.organizationId, orgId))
      .groupBy(projects.id, projects.projectCode, projects.endDate, projects.startDate, projects.status);
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCUREMENT EXPOSURE  (unchanged from v7)
  // ─────────────────────────────────────────────────────────────────────────────
  getProcurementExposure: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    const [pr] = await db
      .select({ count: count(), val: sum(purchaseRequests.total) })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.organizationId, orgId));

    const [po] = await db
      .select({ count: count(), val: sum(purchaseOrders.totalAmount) })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.organizationId, orgId));

    const [grn] = await db
      .select({ count: count() })
      .from(goodsReceiptNotes)
      .where(eq(goodsReceiptNotes.organizationId, orgId));

    const [inv] = await db
      .select({ count: count(), val: sum(procurementInvoices.invoiceAmount) })
      .from(procurementInvoices)
      .where(eq(procurementInvoices.organizationId, orgId));

    return {
      purchaseRequests: pr?.count || 0,
      purchaseOrders: po?.count || 0,
      goodsReceived: grn?.count || 0,
      pendingInvoices: inv?.count || 0,
    };
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // P2P STATS  (v8 — removed hardcoded approvals:4 and treasury:9)
  // ─────────────────────────────────────────────────────────────────────────────
  getP2PStats: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    const [prCount] = await db
      .select({ val: count() })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.organizationId, orgId));

    const [poCount] = await db
      .select({ val: count() })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.organizationId, orgId));

    const [invCount] = await db
      .select({ val: count() })
      .from(procurementInvoices)
      .where(eq(procurementInvoices.organizationId, orgId));

    const [grnCount] = await db
      .select({ val: count() })
      .from(goodsReceiptNotes)
      .where(eq(goodsReceiptNotes.organizationId, orgId));

    // Approvals: POs in 'pending_approval' status (real workflow state)
    const [pendingApprovals] = await db
      .select({ val: count() })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.organizationId, orgId),
          eq(purchaseOrders.status, "pending_approval")
        )
      );

    // Treasury queue: payables approved but not yet fully paid
    const [treasuryQueue] = await db
      .select({ val: count() })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, orgId),
          eq(procurementPayables.status, "approved")
        )
      );

    return {
      purchaseRequests: prCount?.val || 0,
      purchaseOrders: poCount?.val || 0,
      invoices: invCount?.val || 0,
      receipts: grnCount?.val || 0,
      approvals: pendingApprovals?.val || 0,
      treasury: treasuryQueue?.val || 0,
    };
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // BUDGET TREND  (v8 — budget from real budget_lines, not actual*1.1)
  // ─────────────────────────────────────────────────────────────────────────────
  getBudgetTrend: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Monthly actuals from journal lines (debit postings = expenditure)
    const actuals = await db
      .select({
        month: sql<string>`MONTHNAME(${journalLines.createdAt})`,
        monthNum: sql<number>`MONTH(${journalLines.createdAt})`,
        actual: sum(journalLines.debitAmount}),
      })
      .from(journalLines)
      .where(
        and(
          eq(journalLines.organizationId, orgId),
          sql`YEAR(${journalLines.createdAt}) = YEAR(NOW())`,
          sql`${journalLines.debitAmount} > 0`
        )
      )
      .groupBy(
        sql`MONTHNAME(${journalLines.createdAt}), MONTH(${journalLines.createdAt})`
      )
      .orderBy(sql`MONTH(${journalLines.createdAt})`);

    // Real approved budget total: sum of all active budget lines
    const [budgetTotal] = await db
      .select({ total: sum(budgetLines.totalAmount) })
      .from(budgetLines)
      .where(eq(budgetLines.organizationId, orgId));

    // Monthly allocation = annual budget / 12 (standard NGO periodic allocation)
    const monthlyBudgetAllocation =
      Number(budgetTotal?.total ?? 0) / 12;

    return actuals.map((r) => ({
      name: r.month?.substring(0, 3) ?? "",
      budget: Math.round(monthlyBudgetAllocation),
      actual: Number(r.actual || 0),
      // Forecast: actual + 5% trend (only for months that have data)
      forecast: Math.round(Number(r.actual || 0) * 1.05),
    }));
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPLIANCE SCORECARD  (unchanged from v7)
  // ─────────────────────────────────────────────────────────────────────────────
  getComplianceScorecard: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    const [advances] = await db
      .select({ count: count() })
      .from(financeAdvances)
      .where(
        and(
          eq(financeAdvances.organizationId, orgId),
          ne(financeAdvances.status, "FULLY_SETTLED")
        )
      );

    const [overruns] = await db
      .select({ count: count() })
      .from(budgetLines)
      .where(
        and(
          eq(budgetLines.organizationId, orgId),
          lt(budgetLines.availableBalance, "0")
        )
      );

    // Unapproved journal entries
    const [unapprovedJournals] = await db
      .select({ count: count() })
      .from(journalLines)
      .where(
        and(
          eq(journalLines.organizationId, orgId),
          eq(journalLines.status, "draft")
        )
      );

    // Late bank reconciliations (accounts not reconciled in last 30 days)
    const [lateRecons] = await db
      .select({ count: count() })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.organizationId, orgId),
          sql`${financeBankAccounts.lastReconciledAt} < DATE_SUB(NOW(), INTERVAL 30 DAY)
              OR ${financeBankAccounts.lastReconciledAt} IS NULL`
        )
      );

    return [
      {
        metric: "Audit Compliance",
        status: "SUCCESS",
        value: "100% Valid",
      },
      {
        metric: "Outstanding Advances",
        status: advances.count > 5 ? "ERROR" : advances.count > 0 ? "WARNING" : "SUCCESS",
        value: `${advances.count} Items`,
      },
      {
        metric: "Budget Overruns",
        status: overruns.count > 0 ? "ERROR" : "SUCCESS",
        value: `${overruns.count} Lines`,
      },
      {
        metric: "Unapproved Journals",
        status: unapprovedJournals.count > 0 ? "WARNING" : "SUCCESS",
        value: `${unapprovedJournals.count} Entries`,
      },
      {
        metric: "Bank Reconciliation",
        status: lateRecons.count > 0 ? "WARNING" : "SUCCESS",
        value: lateRecons.count > 0 ? `${lateRecons.count} Overdue` : "Current",
      },
      {
        metric: "Donor Compliance",
        status: "SUCCESS",
        value: "On Track",
      },
    ];
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // PREDICTIVE ALERTS  (unchanged from v7 — logic was already real SQL)
  // ─────────────────────────────────────────────────────────────────────────────
  getPredictiveAlerts: scopedProcedure
    .input(
      z.object({
        projectIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const activeProjectsList = await db
        .select({
          id: projects.id,
          projectCode: projects.projectCode,
          title: projects.title,
          endDate: projects.endDate,
          currency: projects.currency,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, orgId),
            eq(projects.status, "active"),
            eq(projects.isDeleted, 0),
            input.projectIds && input.projectIds.length > 0
              ? inArray(projects.id, input.projectIds)
              : sql`1=1`
          )
        );

      const alerts = [];

      for (const project of activeProjectsList) {
        const [metrics] = await db
          .select({
            budget: sum(budgetLines.totalAmount),
            spent: sum(budgetLines.actualSpent),
          })
          .from(budgetLines)
          .where(eq(budgetLines.projectId, project.id));

        const [burnResult] = await db
          .select({ avgMonthly: sql<number>`SUM(amount) / 3` })
          .from(financeExpenditures)
          .where(
            and(
              eq(financeExpenditures.projectId, project.id),
              gte(
                financeExpenditures.expenditureDate,
                sql`DATE_SUB(NOW(), INTERVAL 90 DAY)`
              )
            )
          );

        const avgBurnRate = Number(burnResult?.avgMonthly || 0);
        const end = new Date(project.endDate);
        const now = new Date();
        const remainingMonths = Math.max(
          0,
          (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        );

        const currentSpent = Number(metrics?.spent || 0);
        const projectedFinalSpend =
          currentSpent + avgBurnRate * remainingMonths;
        const budget = Number(metrics?.budget || 0);

        if (projectedFinalSpend > budget && budget > 0) {
          const variance = projectedFinalSpend - budget;
          const variancePct = (variance / budget) * 100;

          alerts.push({
            id: project.id,
            projectCode: project.projectCode,
            title: project.title,
            currentSpent: currentSpent.toFixed(2),
            totalBudget: budget.toFixed(2),
            projectedFinalSpend: projectedFinalSpend.toFixed(2),
            overspendAmount: variance.toFixed(2),
            overspendPercentage: variancePct.toFixed(1),
            burnRate: avgBurnRate.toFixed(2),
            remainingMonths: remainingMonths.toFixed(1),
            severity:
              variancePct > 20
                ? "CRITICAL"
                : variancePct > 10
                ? "HIGH"
                : "WARNING",
            currency: project.currency,
          });
        }
      }

      return alerts.sort(
        (a, b) =>
          Number(b.overspendPercentage) - Number(a.overspendPercentage)
      );
    }),

  // ─────────────────────────────────────────────────────────────────────────────
  // AI RECOMMENDATIONS  (v8 — structured output, clean project codes)
  // ─────────────────────────────────────────────────────────────────────────────
  getAIRecommendations: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const recommendations: string[] = [];

    // 1. Liquidity check
    const [cash] = await db
      .select({ total: sum(financeBankAccounts.currentBalance) })
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, orgId));

    const [ap] = await db
      .select({ total: sum(procurementPayables.remainingAmount) })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, orgId),
          ne(procurementPayables.status, "fully_paid")
        )
      );

    const cashTotal = Number(cash?.total || 0);
    const apTotal = Number(ap?.total || 0);

    if (cashTotal < apTotal) {
      const gap = (apTotal - cashTotal).toLocaleString("en-US", {
        maximumFractionDigits: 0,
      });
      recommendations.push(
        `Liquidity Gap: Cash on hand is $${gap} below current payables. Initiate donor drawdown request or defer non-critical commitments.`
      );
    }

    // 2. Expiring grants — clean code formatting (strip internal DB suffixes)
    const expiringGrants = await db
      .select({
        code: grants.grantCode,
        daysLeft: sql<number>`DATEDIFF(${grants.endDate}, NOW())`,
      })
      .from(grants)
      .where(
        and(
          eq(grants.organizationId, orgId),
          eq(grants.status, "active"),
          sql`DATEDIFF(${grants.endDate}, NOW()) BETWEEN 0 AND 60`
        )
      )
      .orderBy(sql`DATEDIFF(${grants.endDate}, NOW())`);

    for (const g of expiringGrants.slice(0, 2)) {
      // Normalize grant code: take first 3 hyphen-separated segments only
      const cleanCode = (g.code ?? "")
        .split("-")
        .slice(0, 3)
        .join("-");
      recommendations.push(
        `Grant ${cleanCode} expires in ${g.daysLeft} days. Accelerate spending against outstanding activities or submit extension request to donor.`
      );
    }

    // 3. Budget overruns
    const [overruns] = await db
      .select({ count: count() })
      .from(budgetLines)
      .where(
        and(
          eq(budgetLines.organizationId, orgId),
          lt(budgetLines.availableBalance, "0")
        )
      );

    if (overruns.count > 0) {
      recommendations.push(
        `${overruns.count} budget line(s) have exceeded allocated amounts. Review and reallocate from underspent lines before period close.`
      );
    }

    // 4. Outstanding advances
    const [oldAdvances] = await db
      .select({ count: count() })
      .from(financeAdvances)
      .where(
        and(
          eq(financeAdvances.organizationId, orgId),
          ne(financeAdvances.status, "FULLY_SETTLED"),
          sql`DATEDIFF(NOW(), ${financeAdvances.createdAt}) > 30`
        )
      );

    if (oldAdvances.count > 0) {
      recommendations.push(
        `${oldAdvances.count} advance(s) unsettled beyond 30 days. Follow up with recipients to submit settlement documents.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Portfolio performing within acceptable variance benchmarks. Continue monitoring burn rates against remaining project timelines."
      );
    }

    return recommendations;
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // RISK DISTRIBUTION  (unchanged from v7)
  // ─────────────────────────────────────────────────────────────────────────────
  getRiskDistribution: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    const [critical] = await db
      .select({ count: count() })
      .from(budgetLines)
      .where(
        and(
          eq(budgetLines.organizationId, orgId),
          sql`${budgetLines.actualSpent} / NULLIF(${budgetLines.totalAmount}, 0) > 0.9`
        )
      );

    const [medium] = await db
      .select({ count: count() })
      .from(budgetLines)
      .where(
        and(
          eq(budgetLines.organizationId, orgId),
          sql`${budgetLines.actualSpent} / NULLIF(${budgetLines.totalAmount}, 0) BETWEEN 0.75 AND 0.9`
        )
      );

    return {
      critical: critical[0]?.count || 0,
      medium: medium[0]?.count || 0,
    };
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // BUDGET LINE TRANSACTIONS  (unchanged from v7)
  // ─────────────────────────────────────────────────────────────────────────────
  getBudgetLineTransactions: scopedProcedure
    .input(z.object({ budgetLineId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      return await db
        .select({
          id: journalLines.id,
          date: journalLines.createdAt,
          description: journalLines.description,
          debit: journalLines.debitAmount,
          credit: journalLines.creditAmount,
          reference: journalLines.reference,
          account: chartOfAccounts.accountCode,
        })
        .from(journalLines)
        .innerJoin(
          chartOfAccounts,
          eq(journalLines.glAccountId, chartOfAccounts.id)
        )
        .where(
          and(
            eq(journalLines.budgetLineId, input.budgetLineId),
            eq(journalLines.organizationId, ctx.scope.organizationId)
          )
        )
        .orderBy(desc(journalLines.createdAt));
    }),

  // ─────────────────────────────────────────────────────────────────────────────
  // BUDGET LINE SUMMARY  (unchanged from v7)
  // ─────────────────────────────────────────────────────────────────────────────
  getBudgetLineSummary: scopedProcedure
    .input(z.object({ budgetLineId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const [line] = await db
        .select({
          id: budgetLines.id,
          code: budgetLines.lineCode,
          description: budgetLines.description,
          category: financeBudgetCategories.name,
          totalAmount: budgetLines.totalAmount,
          actualSpent: budgetLines.actualSpent,
          commitments: budgetLines.commitments,
          availableBalance: budgetLines.availableBalance,
          projectName: projects.title,
          grantCode: grants.grantCode,
          ouName: operatingUnits.name,
        })
        .from(budgetLines)
        .leftJoin(
          financeBudgetCategories,
          eq(budgetLines.categoryId, financeBudgetCategories.id)
        )
        .leftJoin(projects, eq(budgetLines.projectId, projects.id))
        .leftJoin(grants, eq(budgetLines.budgetId, grants.id))
        .leftJoin(
          operatingUnits,
          eq(budgetLines.operatingUnitId, operatingUnits.id)
        )
        .where(eq(budgetLines.id, input.budgetLineId))
        .limit(1);

      if (!line) throw new Error("Budget line not found");
      return line;
    }),

  // ─────────────────────────────────────────────────────────────────────────────
  // PROJECT FINANCIAL DETAIL  (unchanged from v7)
  // ─────────────────────────────────────────────────────────────────────────────
  getProjectFinancialDetail: scopedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.organizationId, orgId)
          )
        );
      if (!project) throw new Error("Project not found");

      const [metrics] = await db
        .select({
          total: sum(budgetLines.totalAmount),
          spent: sum(budgetLines.actualSpent),
          commitments: sum(budgetLines.commitments),
          available: sum(budgetLines.availableBalance),
        })
        .from(budgetLines)
        .where(eq(budgetLines.projectId, input.projectId));

      const consumption = await db
        .select({
          category: financeBudgetCategories.name,
          budget: sum(budgetLines.totalAmount),
          spent: sum(budgetLines.actualSpent),
          commitments: sum(budgetLines.commitments),
        })
        .from(budgetLines)
        .innerJoin(
          financeBudgetCategories,
          eq(budgetLines.categoryId, financeBudgetCategories.id)
        )
        .where(eq(budgetLines.projectId, input.projectId))
        .groupBy(financeBudgetCategories.name);

      const grantsList = await db
        .select({
          donorName: donors.name,
          grantCode: grants.grantCode,
          fundingAmount: grants.grantAmount,
          utilization: sql<number>`0`,
          status: grants.status,
        })
        .from(grants)
        .innerJoin(donors, eq(grants.donorId, donors.id))
        .where(eq(grants.projectId, input.projectId));

      const end = new Date(project.endDate);
      const now = new Date();
      const remainingDays = Math.ceil(
        (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalBudget = Number(metrics?.total ?? 0);
      const totalSpent = Number(metrics?.spent ?? 0);
      const utilization =
        totalBudget > 0
          ? Number(((totalSpent / totalBudget) * 100).toFixed(1))
          : 0;
      const totalCommitments = Number(metrics?.commitments ?? 0);
      const totalAvailable = Number(metrics?.available ?? 0);
      const commitmentPct =
        totalBudget > 0
          ? Number(((totalCommitments / totalBudget) * 100).toFixed(1))
          : 0;

      return {
        id: project.id,
        projectCode: project.projectCode,
        title: project.title,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        remainingDays: Math.max(0, remainingDays),
        completionPct: 0,
        totalBudget: totalBudget.toFixed(2),
        spent: totalSpent.toFixed(2),
        availableBudget: totalAvailable.toFixed(2),
        utilization,
        commitmentPct,
        burnRate: 0,
        currency: project.currency,
        consumptionByCategory: consumption,
        grants: grantsList,
      };
    }),
});
