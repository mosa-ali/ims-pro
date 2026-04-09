import { TRPCError } from '@trpc/server';
import { scopedProcedure } from './_core/trpc';
import { z } from 'zod';
import { router } from './_core/trpc';

/**
 * Budget Hard Stop Controls Engine
 * 
 * Enforces budget limits at approval time:
 * - Hard stop: Prevents approval if budget exceeded
 * - Warning threshold: Alerts if approaching limit
 * - Configurable thresholds per organization/OU
 * - Blocks expenditure and payment approvals
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export interface BudgetConfig {
  id: number;
  organizationId: number;
  operatingUnitId: number | null;
  hardStopPercentage: number; // 100 = hard stop at 100%
  warningPercentage: number; // 90 = warning at 90%
  allowOverride: boolean;
  overrideRoles: string[]; // Roles allowed to override
}

export interface BudgetStatus {
  budgetLineId: number;
  totalBudget: number;
  committed: number;
  spent: number;
  available: number;
  utilizationPercentage: number;
  status: 'UNDER_BUDGET' | 'WARNING' | 'HARD_STOP';
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get budget configuration for organization
 */
export async function getBudgetConfig(
  organizationId: number,
  operatingUnitId: number | null
): Promise<BudgetConfig> {
  // Placeholder: In production, query budget_config table
  return {
    id: 1,
    organizationId,
    operatingUnitId,
    hardStopPercentage: 100,
    warningPercentage: 90,
    allowOverride: false,
    overrideRoles: ['ADMIN'],
  };
}

/**
 * Calculate budget status for a budget line
 */
export async function calculateBudgetStatus(
  budgetLineId: number,
  organizationId: number
): Promise<BudgetStatus> {
  // Placeholder: In production, query budget_lines and expenditures tables
  return {
    budgetLineId,
    totalBudget: 100000,
    committed: 75000,
    spent: 60000,
    available: 25000,
    utilizationPercentage: 75,
    status: 'UNDER_BUDGET',
  };
}

/**
 * Validate expenditure approval against budget
 * 
 * Rules:
 * 1. Calculate total committed + new expenditure
 * 2. Compare against hard stop threshold
 * 3. Throw error if hard stop exceeded
 * 4. Return warning if approaching limit
 */
export async function validateExpenditureAgainstBudget(
  budgetLineId: number,
  expenditureAmount: number,
  organizationId: number,
  operatingUnitId: number | null,
  userRole: string
): Promise<{
  allowed: boolean;
  status: 'UNDER_BUDGET' | 'WARNING' | 'HARD_STOP';
  message: string;
}> {
  const config = await getBudgetConfig(organizationId, operatingUnitId);
  const budgetStatus = await calculateBudgetStatus(budgetLineId, organizationId);

  const projectedUtilization =
    ((budgetStatus.committed + expenditureAmount) / budgetStatus.totalBudget) * 100;

  // Check hard stop
  if (projectedUtilization >= config.hardStopPercentage) {
    // Allow override only if user has override role
    if (!config.allowOverride || !config.overrideRoles.includes(userRole)) {
      return {
        allowed: false,
        status: 'HARD_STOP',
        message: `Budget hard stop exceeded. Projected utilization: ${projectedUtilization.toFixed(2)}%. Hard stop threshold: ${config.hardStopPercentage}%.`,
      };
    }
  }

  // Check warning threshold
  if (projectedUtilization >= config.warningPercentage) {
    return {
      allowed: true,
      status: 'WARNING',
      message: `Warning: Budget approaching limit. Projected utilization: ${projectedUtilization.toFixed(2)}%. Warning threshold: ${config.warningPercentage}%.`,
    };
  }

  return {
    allowed: true,
    status: 'UNDER_BUDGET',
    message: 'Budget check passed.',
  };
}

/**
 * Validate payment approval against budget
 * Similar to expenditure validation but for payment allocations
 */
export async function validatePaymentAgainstBudget(
  budgetLineId: number,
  paymentAmount: number,
  organizationId: number,
  operatingUnitId: number | null,
  userRole: string
): Promise<{
  allowed: boolean;
  status: 'UNDER_BUDGET' | 'WARNING' | 'HARD_STOP';
  message: string;
}> {
  return await validateExpenditureAgainstBudget(
    budgetLineId,
    paymentAmount,
    organizationId,
    operatingUnitId,
    userRole
  );
}

// ============================================================================
// tRPC ROUTER
// ============================================================================

export const budgetHardStopRouter = router({
  getBudgetConfig: scopedProcedure.query(async ({ ctx }) => {
    return await getBudgetConfig(
      ctx.user.organizationId,
      ctx.user.operatingUnitId
    );
  }),

  updateBudgetConfig: scopedProcedure
    .input(
      z.object({
        hardStopPercentage: z.number().min(0).max(100),
        warningPercentage: z.number().min(0).max(100),
        allowOverride: z.boolean(),
        overrideRoles: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Placeholder: In production, update budget_config table
      return {
        id: 1,
        organizationId: ctx.user.organizationId,
        operatingUnitId: ctx.user.operatingUnitId,
        ...input,
      };
    }),

  getBudgetStatus: scopedProcedure
    .input(z.object({ budgetLineId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await calculateBudgetStatus(
        input.budgetLineId,
        ctx.user.organizationId
      );
    }),

  validateExpenditureApproval: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
        expenditureAmount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await validateExpenditureAgainstBudget(
        input.budgetLineId,
        input.expenditureAmount,
        ctx.user.organizationId,
        ctx.user.operatingUnitId,
        ctx.user.role || 'USER'
      );
    }),

  validatePaymentApproval: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
        paymentAmount: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await validatePaymentAgainstBudget(
        input.budgetLineId,
        input.paymentAmount,
        ctx.user.organizationId,
        ctx.user.operatingUnitId,
        ctx.user.role || 'USER'
      );
    }),

  getBudgetUtilizationReport: scopedProcedure.query(async ({ ctx }) => {
    // Placeholder: Return budget utilization for all budget lines
    return {
      organizationId: ctx.user.organizationId,
      budgetLines: [],
      totalBudget: 0,
      totalCommitted: 0,
      totalSpent: 0,
      utilizationPercentage: 0,
    };
  }),
});
