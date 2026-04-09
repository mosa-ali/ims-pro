import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import { glPostingEvents } from '../../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * GL Posting Event Router
 * Phase A: Consultancy Flow (Type 2 Procurement)
 */

const GLEventCreateInput = z.object({
  purchaseRequestId: z.number().int().positive().optional(),
  entityType: z.enum(['contract', 'sac', 'invoice', 'payment', 'retention']),
  entityId: z.number().int().positive(),
  eventType: z.enum(['approval', 'rejection', 'payment', 'retention_hold', 'retention_release']),
  glAccount: z.string().min(1).max(50),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().default('USD'),
  fiscalPeriod: z.string(),
  description: z.string().optional(),
});

const GLEventPostInput = z.object({
  id: z.number().int().positive(),
  post: z.boolean(),
});

export const glPostingRouter = router({
  /**
   * Create a GL posting event
   */
  create: scopedProcedure
    .input(GLEventCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const orgId = ctx.scope.organizationId;
        const ouId = ctx.scope.operatingUnitId;

        // Validate GL account format
        if (!/^\d{4,6}$/.test(input.glAccount)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'GL account must be numeric (4-6 digits)',
          });
        }

        // Create GL posting event
        const [event] = await db
          .insert(glPostingEvents)
          .values({
            organizationId: orgId,
            operatingUnitId: ouId || null,
            purchaseRequestId: input.purchaseRequestId || null,
            entityType: input.entityType,
            entityId: input.entityId,
            eventType: input.eventType,
            glAccount: input.glAccount,
            amount: input.amount,
            currency: input.currency,
            fiscalPeriod: input.fiscalPeriod,
            postingStatus: 'pending',
            description: input.description || null,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
            isDeleted: 0,
          })
          .$returningId();

        return { id: event.id };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[GLPosting] Create error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create GL posting event',
        });
      }
    }),

  /**
   * Get GL posting event by ID
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const event = await db.query.glPostingEvents.findFirst({
        where: and(
          eq(glPostingEvents.id, input.id),
          eq(glPostingEvents.organizationId, orgId),
          sql`${glPostingEvents.isDeleted} = 0`
        ),
      });

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'GL posting event not found' });
      }

      return event;
    }),

  /**
   * List GL posting events for an entity
   */
  listByEntity: scopedProcedure
    .input(
      z.object({
        entityType: z.enum(['contract', 'sac', 'invoice', 'payment', 'retention']),
        entityId: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const events = await db.query.glPostingEvents.findMany({
        where: and(
          eq(glPostingEvents.organizationId, orgId),
          eq(glPostingEvents.entityType, input.entityType),
          eq(glPostingEvents.entityId, input.entityId),
          sql`${glPostingEvents.isDeleted} = 0`
        ),
        orderBy: desc(glPostingEvents.createdAt),
      });

      return events;
    }),

  /**
   * List pending GL posting events for a purchase request
   */
  listPendingByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const events = await db.query.glPostingEvents.findMany({
        where: and(
          eq(glPostingEvents.organizationId, orgId),
          eq(glPostingEvents.purchaseRequestId, input.purchaseRequestId),
          eq(glPostingEvents.postingStatus, 'pending'),
          sql`${glPostingEvents.isDeleted} = 0`
        ),
        orderBy: desc(glPostingEvents.createdAt),
      });

      return events;
    }),

  /**
   * Post GL event to general ledger
   */
  post: scopedProcedure
    .input(GLEventPostInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const event = await db.query.glPostingEvents.findFirst({
        where: and(
          eq(glPostingEvents.id, input.id),
          eq(glPostingEvents.organizationId, orgId),
          sql`${glPostingEvents.isDeleted} = 0`
        ),
      });

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'GL posting event not found' });
      }

      if (event.postingStatus !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot post event with status ${event.postingStatus}`,
        });
      }

      const newStatus = input.post ? 'posted' : 'failed';

      await db
        .update(glPostingEvents)
        .set({
          postingStatus: newStatus,
          postedAt: input.post ? new Date().toISOString() : null,
          updatedBy: ctx.user.id,
        })
        .where(eq(glPostingEvents.id, input.id));

      return { success: true, status: newStatus };
    }),

  /**
   * Get GL posting audit trail for a purchase request
   */
  getAuditTrail: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const auditTrail = await db.query.glPostingEvents.findMany({
        where: and(
          eq(glPostingEvents.organizationId, orgId),
          eq(glPostingEvents.purchaseRequestId, input.purchaseRequestId),
          sql`${glPostingEvents.isDeleted} = 0`
        ),
        orderBy: desc(glPostingEvents.createdAt),
      });

      return auditTrail;
    }),

  /**
   * Soft delete GL posting event
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const event = await db.query.glPostingEvents.findFirst({
        where: and(
          eq(glPostingEvents.id, input.id),
          eq(glPostingEvents.organizationId, orgId),
          sql`${glPostingEvents.isDeleted} = 0`
        ),
      });

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'GL posting event not found' });
      }

      if (event.postingStatus === 'posted') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete posted GL events. Create a reversing entry instead.',
        });
      }

      await db
        .update(glPostingEvents)
        .set({
          isDeleted: 1,
          deletedAt: new Date().toISOString(),
          deletedBy: ctx.user.id,
        })
        .where(eq(glPostingEvents.id, input.id));

      return { success: true };
    }),
});
