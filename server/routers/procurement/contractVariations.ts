import { z } from "zod";
import { scopedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { contractVariations, contracts } from "../../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export const contractVariationsRouter = router({
  list: scopedProcedure
    .input(z.object({ contractId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;
      const rows = await db.select().from(contractVariations).where(
        and(
          eq(contractVariations.contractId, input.contractId),
          eq(contractVariations.organizationId, orgId),
          sql`${contractVariations.isDeleted} = 0`
        )
      ).orderBy(desc(contractVariations.createdAt));
      return rows;
    }),

  create: scopedProcedure
    .input(z.object({
      contractId: z.number(),
      variationType: z.enum(['amendment', 'change_order', 'extension', 'reduction']),
      description: z.string().min(1),
      variationAmount: z.number(),
      newEndDate: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;
      const ouId = ctx.scope.operatingUnitId;

      // Get the contract to calculate original and new values
      const [contract] = await db.select().from(contracts).where(
        and(
          eq(contracts.id, input.contractId),
          eq(contracts.orgId, orgId)
        )
      );
      if (!contract) throw new Error("Contract not found");

      // Get existing approved variations to calculate current value
      const existingVariations = await db.select().from(contractVariations).where(
        and(
          eq(contractVariations.contractId, input.contractId),
          eq(contractVariations.organizationId, orgId),
          eq(contractVariations.status, 'approved'),
          sql`${contractVariations.isDeleted} = 0`
        )
      );

      const currentValue = existingVariations.reduce(
        (sum, v) => sum + parseFloat(v.newContractValue || '0'),
        parseFloat(contract.contractValue || '0')
      );

      // Count existing variations for numbering
      const allVariations = await db.select().from(contractVariations).where(
        and(
          eq(contractVariations.contractId, input.contractId),
          eq(contractVariations.organizationId, orgId),
          sql`${contractVariations.isDeleted} = 0`
        )
      );

      const variationNumber = `VAR-${contract.contractNumber || input.contractId}-${String(allVariations.length + 1).padStart(3, '0')}`;
      const newContractValue = currentValue + input.variationAmount;

      const [result] = await db.insert(contractVariations).values({
        organizationId: orgId,
        operatingUnitId: ouId || null,
        contractId: input.contractId,
        variationNumber,
        variationType: input.variationType,
        description: input.description,
        originalValue: String(currentValue),
        variationAmount: String(input.variationAmount),
        newContractValue: String(newContractValue),
        originalEndDate: contract.endDate || null,
        newEndDate: input.newEndDate || null,
        reason: input.reason || null,
        status: 'draft',
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      return { id: result.insertId, variationNumber };
    }),

  approve: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      // Get the variation
      const [variation] = await db.select().from(contractVariations).where(
        and(
          eq(contractVariations.id, input.id),
          eq(contractVariations.organizationId, orgId),
          sql`${contractVariations.isDeleted} = 0`
        )
      );
      if (!variation) throw new Error("Variation not found");
      if (variation.status !== 'draft' && variation.status !== 'pending_approval') {
        throw new Error("Variation is not in a state that can be approved");
      }

      // Update variation status
      await db.update(contractVariations)
        .set({
          status: 'approved',
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString(),
          updatedBy: ctx.user.id,
        })
        .where(eq(contractVariations.id, input.id));

      // Update the contract value and end date if applicable
      const updates: Record<string, any> = {
        contractValue: variation.newContractValue,
        updatedBy: ctx.user.id,
      };
      if (variation.newEndDate) {
        updates.endDate = variation.newEndDate;
      }

      await db.update(contracts)
        .set(updates)
        .where(eq(contracts.id, variation.contractId));

      return { success: true };
    }),

  reject: scopedProcedure
    .input(z.object({
      id: z.number(),
      rejectionReason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      await db.update(contractVariations)
        .set({
          status: 'rejected',
          rejectionReason: input.rejectionReason,
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(contractVariations.id, input.id),
            eq(contractVariations.organizationId, orgId)
          )
        );

      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const orgId = ctx.scope.organizationId;

      await db.update(contractVariations)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user.id,
        })
        .where(
          and(
            eq(contractVariations.id, input.id),
            eq(contractVariations.organizationId, orgId)
          )
        );

      return { success: true };
    }),
});
