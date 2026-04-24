import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import { contractPenalties, contracts, contractMilestones } from '../../../drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Contract Penalties Router
 * Manages delay/quality/compliance penalties linked to contracts
 * Penalties affect SAC net approved amount and payment engine
 */

const PenaltyCreateInput = z.object({
  contractId: z.number().int().positive(),
  penaltyDescription: z.string().min(1),
  penaltyType: z.enum(['delay', 'quality', 'compliance']),
  delayDaysThreshold: z.number().int().min(0).default(0),
  penaltyPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/),
  penaltyBase: z.enum(['contract_value', 'deliverable_amount']).default('contract_value'),
  linkedMilestoneId: z.number().int().positive().optional(),
  maxPenaltyLimitPct: z.string().regex(/^\d+(\.\d{1,2})?$/).default('10.00'),
  remarks: z.string().optional(),
});

const PenaltyUpdateInput = z.object({
  id: z.number().int().positive(),
  penaltyDescription: z.string().min(1).optional(),
  penaltyType: z.enum(['delay', 'quality', 'compliance']).optional(),
  delayDaysThreshold: z.number().int().min(0).optional(),
  penaltyPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  penaltyBase: z.enum(['contract_value', 'deliverable_amount']).optional(),
  linkedMilestoneId: z.number().int().positive().nullable().optional(),
  maxPenaltyLimitPct: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  actualDelayDays: z.number().int().min(0).optional(),
  remarks: z.string().optional(),
  status: z.enum(['draft', 'applied', 'waived']).optional(),
});

export const contractPenaltiesRouter = router({
  /**
   * List penalties for a contract
   */
  list: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const penalties = await db.query.contractPenalties.findMany({
        where: and(
          eq(contractPenalties.contractId, input.contractId),
          eq(contractPenalties.organizationId, ctx.scope.organizationId),
          sql`${contractPenalties.isDeleted} = 0`
        ),
        orderBy: desc(contractPenalties.createdAt),
      });

      return penalties;
    }),

  /**
   * Get a single penalty by ID
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const penalty = await db.query.contractPenalties.findFirst({
        where: and(
          eq(contractPenalties.id, input.id),
          eq(contractPenalties.organizationId, ctx.scope.organizationId),
          sql`${contractPenalties.isDeleted} = 0`
        ),
      });

      if (!penalty) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Penalty not found' });
      }

      return penalty;
    }),

  /**
   * Create a new penalty
   */
  create: scopedProcedure
    .input(PenaltyCreateInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;
      const ouId = ctx.scope.operatingUnitId;

      // Verify contract exists and belongs to this org
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

      // Calculate penalty amount based on base
      let baseAmount = parseFloat(contract.contractValue || '0');
      if (input.penaltyBase === 'deliverable_amount' && input.linkedMilestoneId) {
        const milestone = await db.query.contractMilestones.findFirst({
          where: and(
            eq(contractMilestones.id, input.linkedMilestoneId),
            eq(contractMilestones.contractId, input.contractId),
          ),
        });
        if (milestone) {
          baseAmount = parseFloat(milestone.amount || '0');
        }
      }

      let calculatedAmount = 0;
      const penaltyPct = parseFloat(input.penaltyPercentage || "0");
      const maxLimitPct = parseFloat(input.maxPenaltyLimitPct || "10");

      if (input.penaltyType === "delay") {
        // Delay penalties = percentage logic
        calculatedAmount = (baseAmount * penaltyPct) / 100;

      } else {
        // Quality / Compliance = fixed amount directly
        calculatedAmount = penaltyPct;
      }

      // Apply max cap
      const maxAmount = (baseAmount * maxLimitPct) / 100;

      if (
        input.penaltyType === "delay" &&
        calculatedAmount > maxAmount
      ) {
        calculatedAmount = maxAmount;
      }

      // Prevent penalty > contract value
      if (calculatedAmount > baseAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Penalty amount cannot exceed contract value"
        });
      }

      const [result] = await db
        .insert(contractPenalties)
        .values({
          organizationId: orgId,
          operatingUnitId: ouId || null,
          contractId: input.contractId,
          penaltyDescription: input.penaltyDescription,
          penaltyType: input.penaltyType,
          delayDaysThreshold: input.delayDaysThreshold,
          penaltyPercentage: input.penaltyPercentage,
          penaltyBase: input.penaltyBase,
          linkedMilestoneId: input.linkedMilestoneId || null,
          maxPenaltyLimitPct: input.maxPenaltyLimitPct,
          calculatedAmount: calculatedAmount.toFixed(2),
          remarks: input.remarks || null,
          status: 'draft',
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .$returningId();

      return { id: result.id, calculatedAmount };
    }),

  /**
   * Update a penalty
   */
  update: scopedProcedure
    .input(PenaltyUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const penalty = await db.query.contractPenalties.findFirst({
        where: and(
          eq(contractPenalties.id, input.id),
          eq(contractPenalties.organizationId, orgId),
          sql`${contractPenalties.isDeleted} = 0`
        ),
      });

      if (!penalty) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Penalty not found' });
      }

      if (penalty.status === 'applied') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot update an applied penalty' });
      }

      // Recalculate if percentage or base changed
      let calculatedAmount: string | undefined;
      if (input.penaltyPercentage || input.penaltyBase || input.actualDelayDays !== undefined) {
        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, penalty.contractId),
        });
        if (contract) {
          const base = (input.penaltyBase || penalty.penaltyBase) as string;
          let baseAmount = parseFloat(contract.contractValue || '0');
          const milestoneId = input.linkedMilestoneId !== undefined ? input.linkedMilestoneId : penalty.linkedMilestoneId;
          if (base === 'deliverable_amount' && milestoneId) {
            const milestone = await db.query.contractMilestones.findFirst({
              where: eq(contractMilestones.id, milestoneId),
            });
            if (milestone) baseAmount = parseFloat(milestone.amount || '0');
          }
          const pct = parseFloat(input.penaltyPercentage || penalty.penaltyPercentage || '0');
          const maxPct = parseFloat(input.maxPenaltyLimitPct || penalty.maxPenaltyLimitPct || '10');
          let calc = 0;
            if (
              (input.penaltyType || penalty.penaltyType) === "delay"
            ) {
              calc = (baseAmount * pct) / 100;
            } else {
              calc = pct;
            }
          const maxAmt = (baseAmount * maxPct) / 100;
          if (calc > maxAmt) calc = maxAmt;
          calculatedAmount = calc.toFixed(2);
        }
      }

      const updateData: Record<string, any> = { updatedBy: ctx.user.id };
      if (input.penaltyDescription) updateData.penaltyDescription = input.penaltyDescription;
      if (input.penaltyType) updateData.penaltyType = input.penaltyType;
      if (input.delayDaysThreshold !== undefined) updateData.delayDaysThreshold = input.delayDaysThreshold;
      if (input.penaltyPercentage) updateData.penaltyPercentage = input.penaltyPercentage;
      if (input.penaltyBase) updateData.penaltyBase = input.penaltyBase;
      if (input.linkedMilestoneId !== undefined) updateData.linkedMilestoneId = input.linkedMilestoneId;
      if (input.maxPenaltyLimitPct) updateData.maxPenaltyLimitPct = input.maxPenaltyLimitPct;
      if (input.actualDelayDays !== undefined) updateData.actualDelayDays = input.actualDelayDays;
      if (input.remarks !== undefined) updateData.remarks = input.remarks;
      if (input.status) updateData.status = input.status;
      if (calculatedAmount) updateData.calculatedAmount = calculatedAmount;

      await db
        .update(contractPenalties)
        .set(updateData)
        .where(eq(contractPenalties.id, input.id));

      return { success: true, calculatedAmount };
    }),

  /**
   * Apply a penalty (changes status to 'applied')
   */
  applyPenalty: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const penalty = await db.query.contractPenalties.findFirst({
        where: and(
          eq(contractPenalties.id, input.id),
          eq(contractPenalties.organizationId, ctx.scope.organizationId),
          sql`${contractPenalties.isDeleted} = 0`
        ),
      });

      if (!penalty) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Penalty not found' });
      }

      if (penalty.status !== 'draft') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only draft penalties can be applied' });
      }

      await db
        .update(contractPenalties)
        .set({ status: 'applied', updatedBy: ctx.user.id })
        .where(eq(contractPenalties.id, input.id));

      return { success: true };
    }),

  /**
   * Waive a penalty
   */
  waive: scopedProcedure
    .input(z.object({ id: z.number().int().positive(), remarks: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const penalty = await db.query.contractPenalties.findFirst({
        where: and(
          eq(contractPenalties.id, input.id),
          eq(contractPenalties.organizationId, ctx.scope.organizationId),
          sql`${contractPenalties.isDeleted} = 0`
        ),
      });

      if (!penalty) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Penalty not found' });
      }

      await db
        .update(contractPenalties)
        .set({
          status: 'waived',
          remarks: input.remarks || penalty.remarks,
          updatedBy: ctx.user.id,
        })
        .where(eq(contractPenalties.id, input.id));

      return { success: true };
    }),

  /**
   * Soft delete a penalty
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const penalty = await db.query.contractPenalties.findFirst({
        where: and(
          eq(contractPenalties.id, input.id),
          eq(contractPenalties.organizationId, ctx.scope.organizationId),
          sql`${contractPenalties.isDeleted} = 0`
        ),
      });

      if (!penalty) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Penalty not found' });
      }

      if (penalty.status === 'applied') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete an applied penalty' });
      }

      await db
        .update(contractPenalties)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user.id,
        })
        .where(eq(contractPenalties.id, input.id));

      return { success: true };
    }),

  /**
   * Get total applied penalties for a contract (used by financial dashboard)
   */
  getTotalApplied: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const penalties = await db.query.contractPenalties.findMany({
        where: and(
          eq(contractPenalties.contractId, input.contractId),
          eq(contractPenalties.organizationId, ctx.scope.organizationId),
          eq(contractPenalties.status, 'applied'),
          sql`${contractPenalties.isDeleted} = 0`
        ),
      });

      const totalApplied = penalties.reduce(
        (sum, p) => sum + parseFloat(p.calculatedAmount || '0'),
        0
      );

      return { totalApplied, count: penalties.length };
    }),
});
