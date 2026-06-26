import { getDb } from "../../db";
import { budgets, budgetLines, budgetItems, expenses } from "drizzle/schema";
import { eq, and, sql, sum } from "drizzle-orm";

/**
 * BudgetValidationService
 * 
 * Responsible for cross-referencing and validating financial data across 
 * different levels of the ERP (Budget -> Lines -> Items -> Expenses).
 * 
 * This ensures the "Source of Truth" is technically consistent before 
 * surfacing data to the Executive Intelligence Center.
 */
export class BudgetValidationService {
  
  /**
   * Performs a comprehensive integrity check on a specific budget.
   * Compares parent totals against the sum of children.
   */
  static async validateBudgetIntegrity(budgetId: number) {
    const db = await getDb();
    
    // 1. Get Budget Parent Totals
    const budget = await db
      .select({
        id: budgets.id,
        totalApproved: budgets.totalApprovedAmount,
        totalActual: budgets.totalActualAmount,
        status: budgets.status
      })
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .limit(1);

    if (!budget[0]) return { status: 'error', message: 'Budget not found' };

    // 2. Sum of Budget Lines vs Budget Total
    const linesSumRes = await db
      .select({ total: sum(budgetLines.totalAmount) })
      .from(budgetLines)
      .where(and(eq(budgetLines.budgetId, budgetId), eq(budgetLines.isDeleted, 0)));
    
    const linesTotal = Number(linesSumRes[0]?.total || 0);
    const budgetTotal = Number(budget[0].totalApproved);
    
    const lineDiscrepancy = Math.abs(budgetTotal - linesTotal);
    const hasLineMismatch = lineDiscrepancy > 0.01; // Accounting for float precision

    // 3. Sum of Actual Expenses vs Budget "Actual" Cached Field
    const expenseSumRes = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(and(
        sql`${expenses.budgetItemId} IN (SELECT id FROM budget_items WHERE budgetId = ${budgetId})`,
        eq(expenses.isDeleted, 0),
        eq(expenses.status, 'approved')
      ));

    const actualExpenseTotal = Number(expenseSumRes[0]?.total || 0);
    const cachedActualTotal = Number(budget[0].totalActual);
    const hasExpenseMismatch = Math.abs(actualExpenseTotal - cachedActualTotal) > 0.01;

    // 4. Determine Integrity Status
    let integrityStatus: 'valid' | 'warning' | 'error' = 'valid';
    const issues = [];

    if (hasLineMismatch) {
      integrityStatus = 'error';
      issues.push(`Budget total (${budgetTotal}) does not match sum of lines (${linesTotal}).`);
    }

    if (hasExpenseMismatch) {
      integrityStatus = integrityStatus === 'error' ? 'error' : 'warning';
      issues.push(`Cached actual spending (${cachedActualTotal}) does not match approved expenses (${actualExpenseTotal}). Sync required.`);
    }

    // 5. Update Budget Table with Integrity Result
    await db.update(budgets)
      .set({ 
        budgetIntegrityStatus: integrityStatus,
        lastValidationAt: new Date().toISOString()
      })
      .where(eq(budgets.id, budgetId));

    return {
      budgetId,
      status: integrityStatus,
      issues,
      lastValidated: new Date().toISOString()
    };
  }

  /**
   * Surfaces all budget integrity issues for a specific Organization/OU
   * Used for Executive Alerts.
   */
  static async getIntegrityAlerts(organizationId: number, operatingUnitId?: number | null) {
    const db = await getDb();
    
    const problematicBudgets = await db
      .select({
        id: budgets.id,
        title: budgets.budgetTitle,
        status: budgets.budgetIntegrityStatus,
        total: budgets.totalApprovedAmount
      })
      .from(budgets)
      .where(and(
        eq(budgets.organizationId, organizationId),
        operatingUnitId ? eq(budgets.operatingUnitId, operatingUnitId) : undefined,
        sql`${budgets.budgetIntegrityStatus} IN ('error', 'warning')`,
        eq(budgets.isDeleted, 0)
      ));

    return problematicBudgets.map(b => ({
      id: `integrity-${b.id}`,
      type: b.status === 'error' ? 'critical' : 'warning',
      category: 'budget',
      message: `Data Integrity Issue: Budget "${b.title}" (${b.id}) has internal calculation mismatches.`,
      date: 'Audit Required'
    }));
  }
}
