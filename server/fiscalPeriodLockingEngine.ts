import { eq, and, gte, lte, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from './db';
import { financePeriods, financePeriodEvents, financeFiscalYears } from '../drizzle/schema';
import { protectedProcedure, adminProcedure, scopedProcedure } from './_core/trpc';
import { z } from 'zod';
import { router } from './_core/trpc';

/**
 * Fiscal Period Locking Engine
 * 
 * Enforces period-based posting restrictions:
 * - OPEN: postings allowed
 * - SOFT_CLOSED: postings allowed only with override permission
 * - LOCKED: no postings allowed (hard close)
 * - REOPENED: previously locked, reopened (rare, strict permission)
 * 
 * All enforcement is at both application and database level.
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type PeriodStatus = 'OPEN' | 'SOFT_CLOSED' | 'LOCKED' | 'REOPENED';

export interface FiscalYear {
  id: number;
  organizationId: number;
  operatingUnitId: number | null;
  yearLabel: string;
  startDate: Date;
  endDate: Date;
  status: 'OPEN' | 'CLOSED';
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
  deletedAt: Date | null;
  deletedBy: number | null;
}

export interface FiscalPeriod {
  id: number;
  organizationId: number;
  operatingUnitId: number | null;
  fiscalYearId: number;
  periodCode: string; // e.g., "2026-01"
  periodNumber: number; // 1-12
  startDate: Date;
  endDate: Date;
  status: PeriodStatus;
  lockedAt: Date | null;
  lockedBy: number | null;
  reopenedAt: Date | null;
  reopenedBy: number | null;
  closeReason: string | null;
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
  deletedAt: Date | null;
  deletedBy: number | null;
}

export interface PeriodEvent {
  id: number;
  organizationId: number;
  operatingUnitId: number | null;
  periodId: number;
  action: 'OPENED' | 'SOFT_CLOSED' | 'LOCKED' | 'REOPENED';
  actorUserId: number;
  actorDisplaySnapshot: string; // JSON string with name, email, role
  reason: string | null;
  createdAt: Date;
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Assert that a period is open for posting
 * 
 * Rules:
 * 1. Determine periodCode from postingDate
 * 2. Fetch period (org+OU, fallback to org-wide if OU-specific not found)
 * 3. If not found → error PRECONDITION_FAILED
 * 4. If status = LOCKED → error FORBIDDEN
 * 5. If status = SOFT_CLOSED → allow only if user has override permission
 */
export async function assertPeriodOpen(
  organizationId: number,
  operatingUnitId: number | null,
  postingDate: Date,
  userContext: {
  userId: number; role: string }
): Promise<{ valid: boolean; periodId: number }> {
  const db = await getDb();
  // Determine period code from posting date (YYYY-MM)
  const year = postingDate.getFullYear();
  const month = String(postingDate.getMonth() + 1).padStart(2, '0');
  const periodCode = `${year}-${month}`;

  // Fetch period - try OU-specific first, then fallback to org-wide
  let period: FiscalPeriod | undefined;

  if (operatingUnitId) {
    period = await db.query.financePeriods.findFirst({
      where: and(
        eq(financePeriods.organizationId, organizationId),
        eq(financePeriods.operatingUnitId, operatingUnitId),
        eq(financePeriods.periodCode, periodCode)
      ),
    });
  }

  // Fallback to org-wide period if OU-specific not found
  if (!period) {
    period = await db.query.financePeriods.findFirst({
      where: and(
        eq(financePeriods.organizationId, organizationId),
        isNull(financePeriods.operatingUnitId),
        eq(financePeriods.periodCode, periodCode)
      ),
    });
  }

  if (!period) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Fiscal period not configured: ${periodCode}`,
    });
  }

  // Check if period is locked
  if (period.status === 'LOCKED') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Fiscal period ${periodCode} is locked. No postings allowed. Locked by ${period.lockedBy} on ${period.lockedAt?.toISOString()}`,
    });
  }

  // Check if period is soft-closed
  if (period.status === 'SOFT_CLOSED') {
    // Only allow if user has override permission
    const hasOverride = userContext.role === 'admin' || userContext.role === 'finance_admin';
    if (!hasOverride) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Fiscal period ${periodCode} is soft-closed. Only finance admins can post. Override required.`,
      });
    }
  }

  return { valid: true, periodId: period.id };
}

/**
 * Get current fiscal period for an organization
 */
export async function getCurrentPeriod(
  organizationId: number,
  operatingUnitId: number | null
): Promise<FiscalPeriod | null> {
  const db = await getDb();
  const today = new Date();

  // Try OU-specific first
  if (operatingUnitId) {
    const period = await db.query.financePeriods.findFirst({
      where: and(
        eq(financePeriods.organizationId, organizationId),
        eq(financePeriods.operatingUnitId, operatingUnitId),
        lte(financePeriods.startDate, today),
        gte(financePeriods.endDate, today)
      ),
    });
    if (period) return period;
  }

  // Fallback to org-wide
  return await db.query.financePeriods.findFirst({
    where: and(
      eq(financePeriods.organizationId, organizationId),
      isNull(financePeriods.operatingUnitId),
      lte(financePeriods.startDate, today),
      gte(financePeriods.endDate, today)
    ),
  });
}

/**
 * Lock a fiscal period
 */
export async function lockPeriod(
  periodId: number,
  organizationId: number,
  operatingUnitId: number | null,
  userId: number,
  userDisplayName: string,
  reason: string
): Promise<FiscalPeriod> {
  const db = await getDb();
  const now = new Date();

  // Update period status
  const updated = await db
    .update(financePeriods)
    .set({
      status: 'LOCKED',
      lockedAt: now,
      lockedBy: userId,
      closeReason: reason,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(
      and(
        eq(financePeriods.id, periodId),
        eq(financePeriods.organizationId, organizationId)
      )
    )
    .returning();

  if (!updated.length) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Fiscal period not found: ${periodId}`,
    });
  }

  // Record event
  await db.insert(financePeriodEvents).values({
    organizationId,
    operatingUnitId,
    periodId,
    action: 'LOCKED',
    actorUserId: userId,
    actorDisplaySnapshot: JSON.stringify({ name: userDisplayName, userId }),
    reason,
    createdAt: now,
  });

  return updated[0];
}

/**
 * Reopen a locked fiscal period (strict permission required)
 */
export async function reopenPeriod(
  periodId: number,
  organizationId: number,
  operatingUnitId: number | null,
  userId: number,
  userDisplayName: string,
  reason: string
): Promise<FiscalPeriod> {
  const db = await getDb();
  const now = new Date();

  // Update period status
  const updated = await db
    .update(financePeriods)
    .set({
      status: 'REOPENED',
      reopenedAt: now,
      reopenedBy: userId,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(
      and(
        eq(financePeriods.id, periodId),
        eq(financePeriods.organizationId, organizationId)
      )
    )
    .returning();

  if (!updated.length) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Fiscal period not found: ${periodId}`,
    });
  }

  // Record event
  await db.insert(financePeriodEvents).values({
    organizationId,
    operatingUnitId,
    periodId,
    action: 'REOPENED',
    actorUserId: userId,
    actorDisplaySnapshot: JSON.stringify({ name: userDisplayName, userId }),
    reason,
    createdAt: now,
  });

  return updated[0];
}

/**
 * Soft-close a fiscal period
 */
export async function softClosePeriod(
  periodId: number,
  organizationId: number,
  operatingUnitId: number | null,
  userId: number,
  userDisplayName: string,
  reason: string
): Promise<FiscalPeriod> {
  const db = await getDb();
  const now = new Date();

  // Update period status
  const updated = await db
    .update(financePeriods)
    .set({
      status: 'SOFT_CLOSED',
      updatedAt: now,
      updatedBy: userId,
    })
    .where(
      and(
        eq(financePeriods.id, periodId),
        eq(financePeriods.organizationId, organizationId)
      )
    )
    .returning();

  if (!updated.length) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Fiscal period not found: ${periodId}`,
    });
  }

  // Record event
  await db.insert(financePeriodEvents).values({
    organizationId,
    operatingUnitId,
    periodId,
    action: 'SOFT_CLOSED',
    actorUserId: userId,
    actorDisplaySnapshot: JSON.stringify({ name: userDisplayName, userId }),
    reason,
    createdAt: now,
  });

  return updated[0];
}

// ============================================================================
// tRPC ROUTER
// ============================================================================

export const fiscalPeriodLockingRouter = router({
  getCurrentPeriod: scopedProcedure.query(async ({ ctx }) => {
    return await getCurrentPeriod(ctx.user.organizationId, ctx.user.operatingUnitId);
  }),

  listPeriods: scopedProcedure
    .input(z.object({ fiscalYearId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      return await db.query.financePeriods.findMany({
        where: and(
          eq(financePeriods.organizationId, ctx.user.organizationId),
          eq(financePeriods.fiscalYearId, input.fiscalYearId)
        ),
      });
    }),

  getPeriodEvents: scopedProcedure
    .input(z.object({ periodId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      return await db.query.financePeriodEvents.findMany({
        where: and(
          eq(financePeriodEvents.organizationId, ctx.user.organizationId),
          eq(financePeriodEvents.periodId, input.periodId)
        ),
      });
    }),

  softClosePeriod: adminProcedure
    .input(
      z.object({
        periodId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await softClosePeriod(
        input.periodId,
        ctx.user.organizationId,
        ctx.user.operatingUnitId,
        ctx.user.id,
        ctx.user.name || 'Unknown',
        input.reason
      );
    }),

  lockPeriod: adminProcedure
    .input(
      z.object({
        periodId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await lockPeriod(
        input.periodId,
        ctx.user.organizationId,
        ctx.user.operatingUnitId,
        ctx.user.id,
        ctx.user.name || 'Unknown',
        input.reason
      );
    }),

  reopenPeriod: adminProcedure
    .input(
      z.object({
        periodId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await reopenPeriod(
        input.periodId,
        ctx.user.organizationId,
        ctx.user.operatingUnitId,
        ctx.user.id,
        ctx.user.name || 'Unknown',
        input.reason
      );
    }),

  createFiscalYear: adminProcedure
    .input(
      z.object({
        yearLabel: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      // Create fiscal year
      const fiscalYear = await db
        .insert(financeFiscalYears)
        .values({
          organizationId: ctx.user.organizationId,
          operatingUnitId: ctx.user.operatingUnitId,
          yearLabel: input.yearLabel,
          startDate: input.startDate,
          endDate: input.endDate,
          status: 'OPEN',
          createdAt: now,
          createdBy: ctx.user.id,
          updatedAt: now,
          updatedBy: ctx.user.id,
        })
        .returning();

      return fiscalYear[0];
    }),

  generatePeriodsForYear: adminProcedure
    .input(z.object({ fiscalYearId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch fiscal year
      const fiscalYear = await db.query.financeFiscalYears.findFirst({
        where: eq(financeFiscalYears.id, input.fiscalYearId),
      });

      if (!fiscalYear) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Fiscal year not found: ${input.fiscalYearId}`,
        });
      }

      const now = new Date();
      const periods = [];

      // Generate 12 monthly periods
      let currentDate = new Date(fiscalYear.startDate);
      for (let month = 1; month <= 12; month++) {
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Last day of month

        const periodCode = `${startDate.getFullYear()}-${String(month).padStart(2, '0')}`;

        const period = await db
          .insert(financePeriods)
          .values({
            organizationId: ctx.user.organizationId,
            operatingUnitId: ctx.user.operatingUnitId,
            fiscalYearId: input.fiscalYearId,
            periodCode,
            periodNumber: month,
            startDate,
            endDate,
            status: 'OPEN',
            createdAt: now,
            createdBy: ctx.user.id,
            updatedAt: now,
            updatedBy: ctx.user.id,
          })
          .returning();

        periods.push(period[0]);
        currentDate = new Date(endDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return periods;
    }),
});
