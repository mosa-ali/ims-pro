import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import { contractRetentionTerms, contracts } from '../../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Contract Retention Router
 * Manages retention money terms (% withheld, release conditions)
 * Retention affects net payment calculations
 */

const RetentionCreateInput = z.object({
  contractId: z.number().int().positive(),
  retentionPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/),
  retentionBasis: z.enum(['contract_value', 'payment_stage']).default('contract_value'),
  releaseCondition: z.enum(['final_acceptance', 'final_handover', 'defect_liability']).default('final_acceptance'),
  releaseType: z.enum(['full', 'partial']).default('full'),
  remarks: z.string().optional(),
});

const RetentionUpdateInput = z.object({
  id: z.number().int().positive(),
  retentionPercentage: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  retentionBasis: z.enum(['contract_value', 'payment_stage']).optional(),
  maxRetentionAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  releaseCondition: z.enum(['final_acceptance', 'final_handover', 'defect_liability']).optional(),
  releaseType: z.enum(['full', 'partial']).optional(),
  remarks: z.string().optional(),
});

export const contractRetentionRouter = router({
  /**
   * Get retention terms for a contract
   */
  getByContract: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const retention = await db.query.contractRetentionTerms.findFirst({
        where: and(
          eq(contractRetentionTerms.contractId, input.contractId),
          eq(contractRetentionTerms.organizationId, ctx.scope.organizationId),
          sql`${contractRetentionTerms.isDeleted} = 0`
        ),
      });

      return retention || null;
    }),

  /**
   * Create retention terms for a contract (one per contract)
   */
  create: scopedProcedure
    .input(RetentionCreateInput)
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

      // Check if retention already exists
      const existing = await db.query.contractRetentionTerms.findFirst({
        where: and(
          eq(contractRetentionTerms.contractId, input.contractId),
          eq(contractRetentionTerms.organizationId, orgId),
          sql`${contractRetentionTerms.isDeleted} = 0`
        ),
      });

      if (existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Retention terms already exist for this contract' });
      }

      // Calculate max retention amount
      const contractValue = parseFloat(contract.contractValue || '0');
      const retPct = parseFloat(input.retentionPercentage);
      const maxRetentionAmount = (contractValue * retPct) / 100;

      const [result] = await db
        .insert(contractRetentionTerms)
        .values({
          organizationId: orgId,
          operatingUnitId: ouId || null,
          contractId: input.contractId,
          retentionEnabled: 1,
          retentionPercentage: input.retentionPercentage,
          retentionBasis: input.retentionBasis,
          maxRetentionAmount: maxRetentionAmount.toFixed(2),
          totalRetained: '0.00',
          totalReleased: '0.00',
          releaseCondition: input.releaseCondition,
          releaseType: input.releaseType,
          status: 'active',
          remarks: input.remarks || null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .$returningId();

      return { id: result.id, maxRetentionAmount };
    }),

  /**
   * Update retention terms
   */
  update: scopedProcedure
    .input(RetentionUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const retention = await db.query.contractRetentionTerms.findFirst({
        where: and(
          eq(contractRetentionTerms.id, input.id),
          eq(contractRetentionTerms.organizationId, orgId),
          sql`${contractRetentionTerms.isDeleted} = 0`
        ),
      });

      if (!retention) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Retention terms not found' });
      }

      if (retention.status === 'released') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot update released retention' });
      }

      // Recalculate max retention if percentage changed
      let maxRetentionAmount: string | undefined;
      if (input.retentionPercentage) {
        const contract = await db.query.contracts.findFirst({
          where: eq(contracts.id, retention.contractId),
        });
        if (contract) {
          const contractValue = parseFloat(contract.contractValue || '0');
          const retPct = parseFloat(input.retentionPercentage);
          maxRetentionAmount = ((contractValue * retPct) / 100).toFixed(2);
        }
      }

      const updateData: Record<string, any> = { updatedBy: ctx.user.id };
      if (input.retentionPercentage) updateData.retentionPercentage = input.retentionPercentage;
      if (input.retentionBasis) updateData.retentionBasis = input.retentionBasis;
      if (input.maxRetentionAmount) updateData.maxRetentionAmount = input.maxRetentionAmount;
      if (maxRetentionAmount) updateData.maxRetentionAmount = maxRetentionAmount;
      if (input.releaseCondition) updateData.releaseCondition = input.releaseCondition;
      if (input.releaseType) updateData.releaseType = input.releaseType;
      if (input.remarks !== undefined) updateData.remarks = input.remarks;

      await db
        .update(contractRetentionTerms)
        .set(updateData)
        .where(eq(contractRetentionTerms.id, input.id));

      return { success: true };
    }),

  /**
   * Release retention (full or partial)
   */
  release: scopedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      releaseAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      remarks: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const retention = await db.query.contractRetentionTerms.findFirst({
        where: and(
          eq(contractRetentionTerms.id, input.id),
          eq(contractRetentionTerms.organizationId, ctx.scope.organizationId),
          sql`${contractRetentionTerms.isDeleted} = 0`
        ),
      });

      if (!retention) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Retention terms not found' });
      }

      if (retention.status === 'released') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Retention already fully released' });
      }

      const totalRetained = parseFloat(retention.totalRetained || '0');
      const totalReleased = parseFloat(retention.totalReleased || '0');
      const balance = totalRetained - totalReleased;

      if (retention.releaseType === 'full' || !input.releaseAmount) {
        // Full release
        await db
          .update(contractRetentionTerms)
          .set({
            totalReleased: totalRetained.toFixed(2),
            status: 'released',
            releasedAt: new Date().toISOString(),
            releasedBy: ctx.user.id,
            remarks: input.remarks || retention.remarks,
            updatedBy: ctx.user.id,
          })
          .where(eq(contractRetentionTerms.id, input.id));

        return { success: true, released: balance, newStatus: 'released' };
      } else {
        // Partial release
        const releaseAmt = parseFloat(input.releaseAmount);
        if (releaseAmt > balance) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Release amount (${releaseAmt}) exceeds balance (${balance})`,
          });
        }

        const newReleased = totalReleased + releaseAmt;
        const newStatus = newReleased >= totalRetained ? 'released' : 'partially_released';

        await db
          .update(contractRetentionTerms)
          .set({
            totalReleased: newReleased.toFixed(2),
            status: newStatus as any,
            ...(newStatus === 'released' ? {
              releasedAt: new Date().toISOString(),
              releasedBy: ctx.user.id,
            } : {}),
            remarks: input.remarks || retention.remarks,
            updatedBy: ctx.user.id,
          })
          .where(eq(contractRetentionTerms.id, input.id));

        return { success: true, released: releaseAmt, newStatus };
      }
    }),

  /**
   * Delete retention terms
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const retention = await db.query.contractRetentionTerms.findFirst({
        where: and(
          eq(contractRetentionTerms.id, input.id),
          eq(contractRetentionTerms.organizationId, ctx.scope.organizationId),
          sql`${contractRetentionTerms.isDeleted} = 0`
        ),
      });

      if (!retention) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Retention terms not found' });
      }

      const totalRetained = parseFloat(retention.totalRetained || '0');
      if (totalRetained > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete retention with retained amounts' });
      }

      await db
        .update(contractRetentionTerms)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user.id,
        })
        .where(eq(contractRetentionTerms.id, input.id));

      return { success: true };
    }),

  /**
   * Get retention summary for financial dashboard
   */
  getSummary: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const retention = await db.query.contractRetentionTerms.findFirst({
        where: and(
          eq(contractRetentionTerms.contractId, input.contractId),
          eq(contractRetentionTerms.organizationId, ctx.scope.organizationId),
          sql`${contractRetentionTerms.isDeleted} = 0`
        ),
      });

      if (!retention) {
        return {
          enabled: false,
          percentage: 0,
          maxAmount: 0,
          totalRetained: 0,
          totalReleased: 0,
          balance: 0,
          status: 'none',
        };
      }

      const totalRetained = parseFloat(retention.totalRetained || '0');
      const totalReleased = parseFloat(retention.totalReleased || '0');

      return {
        enabled: retention.retentionEnabled === 1,
        percentage: parseFloat(retention.retentionPercentage || '0'),
        maxAmount: parseFloat(retention.maxRetentionAmount || '0'),
        totalRetained,
        totalReleased,
        balance: totalRetained - totalReleased,
        status: retention.status,
        releaseCondition: retention.releaseCondition,
        releaseType: retention.releaseType,
      };
    }),
});
