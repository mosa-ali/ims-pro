import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import { contractPaymentSchedule, contracts } from '../../../drizzle/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Contract Payment Schedule Router
 * Manages payment schedule entries (advance, milestone, progress, final)
 * Total payment percentages must equal 100%
 */

const PaymentScheduleCreateInput = z.object({
  contractId: z.number().int().positive(),
  entries: z.array(z.object({
    paymentType: z.enum(['advance', 'milestone', 'progress', 'final']),
    description: z.string().min(1),
    paymentPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/),
    paymentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    linkedMilestoneId: z.number().int().positive().optional(),
    paymentCondition: z.enum(['none', 'sac_required', 'monitoring_required', 'sac_and_monitoring']).default('none'),
    orderIndex: z.number().int().min(0),
  })).min(1),
});

const PaymentScheduleUpdateInput = z.object({
  id: z.number().int().positive(),
  paymentType: z.enum(['advance', 'milestone', 'progress', 'final']).optional(),
  description: z.string().min(1).optional(),
  paymentPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  paymentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  linkedMilestoneId: z.number().int().positive().nullable().optional(),
  paymentCondition: z.enum(['none', 'sac_required', 'monitoring_required', 'sac_and_monitoring']).optional(),
  status: z.enum(['pending', 'approved', 'invoiced', 'paid']).optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const contractPaymentScheduleRouter = router({
  /**
   * List payment schedule entries for a contract
   */
  list: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const entries = await db.query.contractPaymentSchedule.findMany({
        where: and(
          eq(contractPaymentSchedule.contractId, input.contractId),
          eq(contractPaymentSchedule.organizationId, ctx.scope.organizationId),
          sql`${contractPaymentSchedule.isDeleted} = 0`
        ),
        orderBy: asc(contractPaymentSchedule.orderIndex),
      });

      return entries;
    }),

  /**
   * Create payment schedule entries (batch)
   * Validates total percentages = 100%
   */
  create: scopedProcedure
    .input(PaymentScheduleCreateInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;
      const ouId = ctx.scope.operatingUnitId;

      // Verify contract exists
      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.contractId),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
      }

      // Check existing entries
      const existing = await db.query.contractPaymentSchedule.findMany({
        where: and(
          eq(contractPaymentSchedule.contractId, input.contractId),
          eq(contractPaymentSchedule.organizationId, orgId),
          sql`${contractPaymentSchedule.isDeleted} = 0`
        ),
      });

      const existingPct = existing.reduce(
        (sum, e) => sum + parseFloat(e.paymentPercentage || '0'),
        0
      );
      const newPct = input.entries.reduce(
        (sum, e) => sum + parseFloat(e.paymentPercentage),
        0
      );

      if (existingPct + newPct > 100.01) { // small tolerance for floating point
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Total payment percentage would be ${(existingPct + newPct).toFixed(2)}%, which exceeds 100%`,
        });
      }

      // Validate total amounts don't exceed contract value
      const contractValue = parseFloat(contract.contractValue || '0');
      const existingAmt = existing.reduce(
        (sum, e) => sum + parseFloat(e.paymentAmount || '0'),
        0
      );
      const newAmt = input.entries.reduce(
        (sum, e) => sum + parseFloat(e.paymentAmount),
        0
      );

      if (existingAmt + newAmt > contractValue * 1.001) { // small tolerance
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Total payment amounts (${(existingAmt + newAmt).toFixed(2)}) exceed contract value (${contractValue.toFixed(2)})`,
        });
      }

      const ids: number[] = [];
      for (const entry of input.entries) {
        const [result] = await db
          .insert(contractPaymentSchedule)
          .values({
            organizationId: orgId,
            operatingUnitId: ouId || null,
            contractId: input.contractId,
            paymentType: entry.paymentType,
            description: entry.description,
            paymentPercentage: entry.paymentPercentage,
            paymentAmount: entry.paymentAmount,
            linkedMilestoneId: entry.linkedMilestoneId || null,
            paymentCondition: entry.paymentCondition,
            status: 'pending',
            orderIndex: entry.orderIndex,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          })
          .$returningId();
        ids.push(result.id);
      }

      return { success: true, ids, count: input.entries.length };
    }),

  /**
   * Update a single payment schedule entry
   */
  update: scopedProcedure
    .input(PaymentScheduleUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const entry = await db.query.contractPaymentSchedule.findFirst({
        where: and(
          eq(contractPaymentSchedule.id, input.id),
          eq(contractPaymentSchedule.organizationId, orgId),
          sql`${contractPaymentSchedule.isDeleted} = 0`
        ),
      });

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment schedule entry not found' });
      }

      if (entry.status === 'paid') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot update a paid entry' });
      }

      // If percentage is changing, validate total doesn't exceed 100%
      if (input.paymentPercentage) {
        const siblings = await db.query.contractPaymentSchedule.findMany({
          where: and(
            eq(contractPaymentSchedule.contractId, entry.contractId),
            eq(contractPaymentSchedule.organizationId, orgId),
            sql`${contractPaymentSchedule.isDeleted} = 0`
          ),
        });

        const otherPct = siblings
          .filter(s => s.id !== input.id)
          .reduce((sum, s) => sum + parseFloat(s.paymentPercentage || '0'), 0);

        if (otherPct + parseFloat(input.paymentPercentage) > 100.01) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Total percentage would exceed 100%`,
          });
        }
      }

      const updateData: Record<string, any> = { updatedBy: ctx.user.id };
      if (input.paymentType) updateData.paymentType = input.paymentType;
      if (input.description) updateData.description = input.description;
      if (input.paymentPercentage) updateData.paymentPercentage = input.paymentPercentage;
      if (input.paymentAmount) updateData.paymentAmount = input.paymentAmount;
      if (input.linkedMilestoneId !== undefined) updateData.linkedMilestoneId = input.linkedMilestoneId;
      if (input.paymentCondition) updateData.paymentCondition = input.paymentCondition;
      if (input.status) updateData.status = input.status;
      if (input.orderIndex !== undefined) updateData.orderIndex = input.orderIndex;

      await db
        .update(contractPaymentSchedule)
        .set(updateData)
        .where(eq(contractPaymentSchedule.id, input.id));

      return { success: true };
    }),

  /**
   * Delete a payment schedule entry
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const entry = await db.query.contractPaymentSchedule.findFirst({
        where: and(
          eq(contractPaymentSchedule.id, input.id),
          eq(contractPaymentSchedule.organizationId, ctx.scope.organizationId),
          sql`${contractPaymentSchedule.isDeleted} = 0`
        ),
      });

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment schedule entry not found' });
      }

      if (entry.status === 'paid' || entry.status === 'invoiced') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete an invoiced or paid entry' });
      }

      await db
        .update(contractPaymentSchedule)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user.id,
        })
        .where(eq(contractPaymentSchedule.id, input.id));

      return { success: true };
    }),

  /**
   * Get payment schedule summary for financial dashboard
   */
  getSummary: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const entries = await db.query.contractPaymentSchedule.findMany({
        where: and(
          eq(contractPaymentSchedule.contractId, input.contractId),
          eq(contractPaymentSchedule.organizationId, ctx.scope.organizationId),
          sql`${contractPaymentSchedule.isDeleted} = 0`
        ),
        orderBy: asc(contractPaymentSchedule.orderIndex),
      });

      const totalScheduled = entries.reduce((s, e) => s + parseFloat(e.paymentAmount || '0'), 0);
      const totalPaid = entries
        .filter(e => e.status === 'paid')
        .reduce((s, e) => s + parseFloat(e.paymentAmount || '0'), 0);
      const totalInvoiced = entries
        .filter(e => e.status === 'invoiced' || e.status === 'paid')
        .reduce((s, e) => s + parseFloat(e.paymentAmount || '0'), 0);
      const totalPending = entries
        .filter(e => e.status === 'pending')
        .reduce((s, e) => s + parseFloat(e.paymentAmount || '0'), 0);
      const totalPercentage = entries.reduce((s, e) => s + parseFloat(e.paymentPercentage || '0'), 0);

      return {
        entries,
        summary: {
          totalScheduled,
          totalPaid,
          totalInvoiced,
          totalPending,
          remaining: totalScheduled - totalPaid,
          totalPercentage,
          entryCount: entries.length,
        },
      };
    }),
});
