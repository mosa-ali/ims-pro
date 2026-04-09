import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { 
  budgets,
  expenses,
  bankTransactions,
  glAccounts,
  journalEntries,
  journalLines
} from "../drizzle/schema";
import { eq, and, gte, lte, sql, desc, sum, count } from "drizzle-orm";

export const financialAnalyticsRouter = router({
  /**
   * Get key financial metrics
   */
  getKeyMetrics: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        grantId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      const { projectId, grantId, startDate, endDate } = input;

      // Build filters
      const filters: any[] = [eq(budgets.organizationId, organizationId)];
      if (projectId) filters.push(eq(budgets.projectId, projectId));
      if (grantId) filters.push(eq(budgets.grantId, grantId));
      if (startDate) filters.push(gte(budgets.startDate, startDate));
      if (endDate) filters.push(lte(budgets.endDate, endDate));

      // Get total budget
      const budgetResult = await db
        .select({
          totalBudget: sum(budgets.totalAmount),
        })
        .from(budgets)
        .where(and(...filters));

      const totalBudget = parseFloat(budgetResult[0]?.totalBudget || "0");

      // Build expenditure filters
      const expFilters: any[] = [eq(expenses.organizationId, organizationId)];
      if (projectId) expFilters.push(eq(expenses.projectId, projectId));
      if (grantId) expFilters.push(eq(expenses.grantId, grantId));
      if (startDate) expFilters.push(gte(expenses.expenditureDate, startDate));
      if (endDate) expFilters.push(lte(expenses.expenditureDate, endDate));

      // Get total spent
      const expResult = await db
        .select({
          totalSpent: sum(expenses.amount),
        })
        .from(expenses)
        .where(and(...expFilters));

      const totalSpent = parseFloat(expResult[0]?.totalSpent || "0");

      // Calculate metrics
      const remaining = totalBudget - totalSpent;
      const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
      const variance = totalBudget - totalSpent;
      const variancePercentage = totalBudget > 0 ? ((variance / totalBudget) * 100) : 0;

      return {
        totalBudget,
        totalSpent,
        remaining,
        utilizationRate,
        variance,
        variancePercentage,
      };
    }),

  /**
   * Get budget vs actual comparison
   */
  getBudgetVsActual: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        grantId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        groupBy: z.enum(["category", "month", "project"]).default("category"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      const { projectId, grantId, startDate, endDate, groupBy } = input;

      if (groupBy === "category") {
        // Group by budget category
        const budgetFilters: any[] = [eq(budgets.organizationId, organizationId)];
        if (projectId) budgetFilters.push(eq(budgets.projectId, projectId));
        if (grantId) budgetFilters.push(eq(budgets.grantId, grantId));
        if (startDate) budgetFilters.push(gte(budgets.startDate, startDate));
        if (endDate) budgetFilters.push(lte(budgets.endDate, endDate));

        const budgetResults = await db
          .select({
            category: budgets.category,
            budgetAmount: sum(budgets.totalAmount),
          })
          .from(budgets)
          .where(and(...budgetFilters))
          .groupBy(budgets.category);

        const expFilters: any[] = [eq(expenses.organizationId, organizationId)];
        if (projectId) expFilters.push(eq(expenses.projectId, projectId));
        if (grantId) expFilters.push(eq(expenses.grantId, grantId));
        if (startDate) expFilters.push(gte(expenses.expenditureDate, startDate));
        if (endDate) expFilters.push(lte(expenses.expenditureDate, endDate));

        const expenditures = await db
          .select({
            category: expenses.category,
            actualAmount: sum(expenses.amount),
          })
          .from(expenses)
          .where(and(...expFilters))
          .groupBy(expenses.category);

        // Merge budgets and expenditures
        const categoryMap = new Map();
        budgetResults.forEach((b) => {
          categoryMap.set(b.category, {
            category: b.category,
            budgetAmount: parseFloat(b.budgetAmount || "0"),
            actualAmount: 0,
          });
        });

        expenditures.forEach((e) => {
          const existing = categoryMap.get(e.category) || {
            category: e.category,
            budgetAmount: 0,
            actualAmount: 0,
          };
          existing.actualAmount = parseFloat(e.actualAmount || "0");
          categoryMap.set(e.category, existing);
        });

        return Array.from(categoryMap.values()).map((item) => ({
          ...item,
          variance: item.budgetAmount - item.actualAmount,
          variancePercentage:
            item.budgetAmount > 0 ? ((item.budgetAmount - item.actualAmount) / item.budgetAmount) * 100 : 0,
        }));
      }

      // For month/project grouping, return placeholder
      return [];
    }),

  /**
   * Get cash flow trends
   */
  getCashFlowTrends: scopedProcedure
    .input(
      z.object({
        bankAccountId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        interval: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      const { bankAccountId, startDate, endDate, interval } = input;

      const filters: any[] = [eq(bankTransactions.organizationId, organizationId)];
      if (bankAccountId) filters.push(eq(bankTransactions.bankAccountId, bankAccountId));
      if (startDate) filters.push(gte(bankTransactions.transactionDate, startDate));
      if (endDate) filters.push(lte(bankTransactions.transactionDate, endDate));

      // Get transactions
      const transactions = await db
        .select()
        .from(bankTransactions)
        .where(and(...filters))
        .orderBy(bankTransactions.transactionDate);

      // Group by interval
      const trendsMap = new Map();

      transactions.forEach((tx) => {
        const date = new Date(tx.transactionDate);
        let key: string;

        if (interval === "daily") {
          key = date.toISOString().split("T")[0];
        } else if (interval === "weekly") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
        } else {
          // monthly
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        }

        const existing = trendsMap.get(key) || { period: key, inflow: 0, outflow: 0, net: 0 };

        if (tx.transactionType === "deposit" || tx.transactionType === "transfer_in") {
          existing.inflow += parseFloat(tx.amount);
        } else if (tx.transactionType === "withdrawal" || tx.transactionType === "transfer_out") {
          existing.outflow += parseFloat(tx.amount);
        }

        existing.net = existing.inflow - existing.outflow;
        trendsMap.set(key, existing);
      });

      return Array.from(trendsMap.values()).sort((a, b) => a.period.localeCompare(b.period));
    }),

  /**
   * Get expense breakdown by category
   */
  getExpenseBreakdown: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        grantId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      const { projectId, grantId, startDate, endDate } = input;

      const filters: any[] = [eq(expenses.organizationId, organizationId)];
      if (projectId) filters.push(eq(expenses.projectId, projectId));
      if (grantId) filters.push(eq(expenses.grantId, grantId));
      if (startDate) filters.push(gte(expenses.expenditureDate, startDate));
      if (endDate) filters.push(lte(expenses.expenditureDate, endDate));

      const breakdown = await db
        .select({
          category: expenses.category,
          totalAmount: sum(expenses.amount),
          count: count(),
        })
        .from(expenses)
        .where(and(...filters))
        .groupBy(expenses.category);

      const total = breakdown.reduce((sum, item) => sum + parseFloat(item.totalAmount || "0"), 0);

      return breakdown.map((item) => ({
        category: item.category,
        amount: parseFloat(item.totalAmount || "0"),
        count: item.count,
        percentage: total > 0 ? (parseFloat(item.totalAmount || "0") / total) * 100 : 0,
      }));
    }),

  /**
   * Get top expenses
   */
  getTopExpenses: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        grantId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = getDb();
      const { projectId, grantId, startDate, endDate, limit } = input;

      const filters: any[] = [eq(expenses.organizationId, organizationId)];
      if (projectId) filters.push(eq(expenses.projectId, projectId));
      if (grantId) filters.push(eq(expenses.grantId, grantId));
      if (startDate) filters.push(gte(expenses.expenditureDate, startDate));
      if (endDate) filters.push(lte(expenses.expenditureDate, endDate));

      const topExpenses = await db
        .select()
        .from(expenses)
        .where(and(...filters))
        .orderBy(desc(expenses.amount))
        .limit(limit);

      return topExpenses;
    }),
});
