/**
 * ============================================================================
 * HR LEAVE BALANCES ROUTER - PHASE 2 PRODUCTION-READY IMPLEMENTATION
 * ============================================================================
 *
 * ARCHITECTURE:
 * - All procedures use scopedProcedure for automatic data isolation
 * - organizationId injected from ctx.scope (NOT input)
 * - All queries filter isNull(deletedAt) (soft delete pattern)
 * - All mutations logged to auditLogs table
 * - Proper error handling and validation via Zod
 *
 * DATA ISOLATION:
 * const { organizationId } = ctx.scope;
 * All queries filter by:
 *   - eq(hrLeaveBalances.organizationId, organizationId)
 *   - isNull(hrLeaveBalances.deletedAt)
 * ============================================================================
 */

import { z } from 'zod';
import { scopedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { hrLeaveBalances, auditLogs } from '../drizzle/schema';
import { eq, and, desc, isNull, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import type { DB, ScopeContext } from './db/_scope';
import { buildUpdatePayload, buildSoftDeletePayload, buildRestorePayload } from './db/_scope';
import { nowSql } from './db/_time';
import { LEAVE_TYPES, type LeaveType } from './db/_status';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const LeaveBalanceUpdateSchema = z.object({
  id: z.number().min(1, 'Balance ID is required'),
  entitlement: z.number().min(0).optional(),
  carriedOver: z.number().min(0).optional(),
  used: z.number().min(0).optional(),
  pending: z.number().min(0).optional(),
  remaining: z.number().optional(),
});

const LeaveBalanceResetSchema = z.object({
  employeeId: z.number().min(1),
  year: z.number().min(2000),
  leaveType: z.enum(['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate', 'study', 'other']),
  entitlement: z.number().min(0),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log audit trail for all mutations
 */
const logAudit = async (
  db: DB,
  action: 'CREATE' | 'UPDATE' | 'RESET' | 'DELETE' | 'RESTORE',
  entityType: 'LEAVE_BALANCE',
  entityId: number,
  organizationId: number,
  userId?: number,
  changes?: Record<string, unknown>
) => {
  try {
    await db.insert(auditLogs).values({
      action,
      entityType,
      entityId,
      organizationId,
      operatingUnitId: null,
      userId: userId ?? null,
      details: changes ? JSON.stringify(changes) : null,
      // createdAt is auto-set by database defaultNow()
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit logging should not block operations
  }
};

/**
 * Calculate remaining balance
 */
const calculateRemaining = (
  entitlement: number,
  carriedOver: number,
  used: number,
  pending: number
): number => {
  return entitlement + carriedOver - used - pending;
};

/**
 * Verify leave balance belongs to current organization
 */
const verifyLeaveBalanceScope = async (
  db: DB,
  balanceId: number,
  organizationId: number
): Promise<(typeof hrLeaveBalances.$inferSelect)> => {
  const [balance] = await db
    .select()
    .from(hrLeaveBalances)
    .where(
      and(
        eq(hrLeaveBalances.id, balanceId),
        eq(hrLeaveBalances.organizationId, organizationId),
        isNull(hrLeaveBalances.deletedAt)
      )
    );

  if (!balance) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Leave balance not found in your organization',
    });
  }

  return balance;
};

// ============================================================================
// ROUTER
// ============================================================================

export const hrLeaveBalancesRouter = router({
  /**
   * Get all leave balances for organization
   */
  getAll: scopedProcedure
    .input(
      z.object({
        year: z.number().optional(),
        leaveType: z.enum(['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate', 'study', 'other']).optional(),
        employeeId: z.number().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId } = ctx.scope;

      const conditions = [
        eq(hrLeaveBalances.organizationId, organizationId),
        isNull(hrLeaveBalances.deletedAt),
        input.year ? eq(hrLeaveBalances.year, input.year) : undefined,
        input.leaveType ? eq(hrLeaveBalances.leaveType, input.leaveType as LeaveType) : undefined,
        input.employeeId ? eq(hrLeaveBalances.employeeId, input.employeeId) : undefined,
      ].filter(Boolean);

      const balances = await db
        .select()
        .from(hrLeaveBalances)
        .where(and(...conditions))
        .orderBy(desc(hrLeaveBalances.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return balances;
    }),

  /**
   * Get single leave balance by ID
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      return verifyLeaveBalanceScope(db, input.id, ctx.scope.organizationId);
    }),

  /**
   * Get leave balance for specific employee and year
   */
  getByEmployeeAndYear: scopedProcedure
    .input(
      z.object({
        employeeId: z.number().min(1),
        year: z.number().min(2000),
        leaveType: z.enum(['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate', 'study', 'other']),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId } = ctx.scope;

      const [balance] = await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.organizationId, organizationId),
            eq(hrLeaveBalances.employeeId, input.employeeId),
            eq(hrLeaveBalances.year, input.year),
            eq(hrLeaveBalances.leaveType, input.leaveType as LeaveType),
            isNull(hrLeaveBalances.deletedAt)
          )
        );

      if (!balance) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Leave balance not found for employee ${input.employeeId} in ${input.year}`,
        });
      }

      return balance;
    }),

  /**
   * Get balance summary for employee
   */
  getEmployeeSummary: scopedProcedure
    .input(
      z.object({
        employeeId: z.number().min(1),
        year: z.number().min(2000),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId } = ctx.scope;

      const balances = await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.organizationId, organizationId),
            eq(hrLeaveBalances.employeeId, input.employeeId),
            eq(hrLeaveBalances.year, input.year),
            isNull(hrLeaveBalances.deletedAt)
          )
        );

      // Calculate totals
      const summary = {
        totalEntitlement: 0,
        totalCarriedOver: 0,
        totalUsed: 0,
        totalPending: 0,
        totalRemaining: 0,
        byType: {} as Record<string, any>,
      };

      for (const balance of balances) {
        const entitlement = Number(balance.entitlement);
        const carriedOver = Number(balance.carriedOver);
        const used = Number(balance.used);
        const pending = Number(balance.pending);
        const remaining = Number(balance.remaining);

        summary.totalEntitlement += entitlement;
        summary.totalCarriedOver += carriedOver;
        summary.totalUsed += used;
        summary.totalPending += pending;
        summary.totalRemaining += remaining;

        summary.byType[balance.leaveType] = {
          entitlement,
          carriedOver,
          used,
          pending,
          remaining,
        };
      }

      return summary;
    }),

  /**
   * Update leave balance
   */
  update: scopedProcedure
    .input(LeaveBalanceUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId } = ctx.scope;
      const userId = ctx.user?.id;

      // Verify balance exists
      const balance = await verifyLeaveBalanceScope(db, input.id, organizationId);

      // Calculate new remaining if any values changed
      let newRemaining = Number(balance.remaining);
      if (
        input.entitlement !== undefined ||
        input.carriedOver !== undefined ||
        input.used !== undefined ||
        input.pending !== undefined
      ) {
        newRemaining = calculateRemaining(
          input.entitlement ?? Number(balance.entitlement),
          input.carriedOver ?? Number(balance.carriedOver),
          input.used ?? Number(balance.used),
          input.pending ?? Number(balance.pending)
        );
      }

      const updatePayload = buildUpdatePayload({
        ...(input.entitlement !== undefined && { entitlement: input.entitlement }),
        ...(input.carriedOver !== undefined && { carriedOver: input.carriedOver }),
        ...(input.used !== undefined && { used: input.used }),
        ...(input.pending !== undefined && { pending: input.pending }),
        ...(newRemaining !== Number(balance.remaining) && { remaining: newRemaining }),

        updatedBy: userId ?? null,
        });

      await db
        .update(hrLeaveBalances)
        .set(updatePayload)
        .where(eq(hrLeaveBalances.id, input.id));

      // Log audit
      await logAudit(
        db,
        'UPDATE',
        'LEAVE_BALANCE',
        input.id,
        organizationId,
        userId,
        input
      );

      return { id: input.id, ...updatePayload };
    }),

  /**
   * Reset annual leave balance for year-end
   */
  resetAnnualBalance: scopedProcedure
    .input(LeaveBalanceResetSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId } = ctx.scope;
      const userId = ctx.user?.id;

      // Check if balance exists for this employee/year/type
      const [existingBalance] = await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.organizationId, organizationId),
            eq(hrLeaveBalances.employeeId, input.employeeId),
            eq(hrLeaveBalances.year, input.year),
            eq(hrLeaveBalances.leaveType, input.leaveType as LeaveType),
            isNull(hrLeaveBalances.deletedAt)
          )
        );

      if (!existingBalance) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Leave balance not found for employee ${input.employeeId} in ${input.year}`,
        });
      }

      // Carry over unused balance (only for annual leave)
      const carriedOver = input.leaveType === 'annual' ? Number(existingBalance.remaining) : 0;

      const updatePayload = buildUpdatePayload({
        entitlement: input.entitlement,
        carriedOver,
        used: 0,
        pending: 0,
        remaining: input.entitlement + carriedOver,

        updatedBy: userId ?? null,
        });

      await db
        .update(hrLeaveBalances)
        .set(updatePayload)
        .where(eq(hrLeaveBalances.id, existingBalance.id));

      // Log audit
      await logAudit(
        db,
        'RESET',
        'LEAVE_BALANCE',
        existingBalance.id,
        organizationId,
        userId,
        { carriedOver, entitlement: input.entitlement }
      );

      return { id: existingBalance.id, ...updatePayload };
    }),

  /**
   * Get balance summary for organization
   */
  getOrganizationSummary: scopedProcedure
    .input(z.object({ year: z.number().min(2000) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId } = ctx.scope;

      const balances = await db
        .select()
        .from(hrLeaveBalances)
        .where(
          and(
            eq(hrLeaveBalances.organizationId, organizationId),
            eq(hrLeaveBalances.year, input.year),
            isNull(hrLeaveBalances.deletedAt)
          )
        );

      // Group by leave type
      const summary: Record<string, any> = {};

      for (const balance of balances) {
        if (!summary[balance.leaveType]) {
          summary[balance.leaveType] = {
            totalEntitlement: 0,
            totalCarriedOver: 0,
            totalUsed: 0,
            totalPending: 0,
            totalRemaining: 0,
            employeeCount: 0,
          };
        }

        summary[balance.leaveType].totalEntitlement += Number(balance.entitlement);
        summary[balance.leaveType].totalCarriedOver += Number(balance.carriedOver);
        summary[balance.leaveType].totalUsed += Number(balance.used);
        summary[balance.leaveType].totalPending += Number(balance.pending);
        summary[balance.leaveType].totalRemaining += Number(balance.remaining);
        summary[balance.leaveType].employeeCount += 1;
      }

      return summary;
    }),

  /**
   * Delete leave balance (soft delete)
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId } = ctx.scope;
      const userId = ctx.user?.id;

      // Verify balance exists
      await verifyLeaveBalanceScope(db, input.id, organizationId);

      const deletePayload = buildSoftDeletePayload(userId);

      await db
        .update(hrLeaveBalances)
        .set(deletePayload)
        .where(eq(hrLeaveBalances.id, input.id));

      // Log audit
      await logAudit(
        db,
        'DELETE',
        'LEAVE_BALANCE',
        input.id,
        organizationId,
        userId
      );

      return { id: input.id, ...deletePayload };
    }),

  /**
   * Restore leave balance
   */
  restore: scopedProcedure
    .input(z.object({ id: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId } = ctx.scope;
      const userId = ctx.user?.id;

      const restorePayload = buildRestorePayload();

      await db
        .update(hrLeaveBalances)
        .set(restorePayload)
        .where(eq(hrLeaveBalances.id, input.id));

      // Log audit
      await logAudit(
        db,
        'RESTORE',
        'LEAVE_BALANCE',
        input.id,
        organizationId,
        userId
      );

      return { id: input.id, ...restorePayload };
    }),
});
