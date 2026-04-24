import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import {
  implementationMonitoring,
  implementationChecklist,
  primaryHandover,
  finalHandover,
  implementationObservations,
  contracts,
} from '../../../drizzle/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Implementation Monitoring Router
 * Auto-created when contract is approved (Works: mandatory, Services: optional)
 * Contains: Deliverables Checklist, Primary Handover, Final Handover, Observations
 */

// ============================================================================
// MONITORING MASTER
// ============================================================================

export const implementationMonitoringRouter = router({
  /**
   * Get or create monitoring record for a contract
   */
  getByContract: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const monitoring = await db.query.implementationMonitoring.findFirst({
        where: and(
          eq(implementationMonitoring.contractId, input.contractId),
          eq(implementationMonitoring.organizationId, ctx.scope.organizationId),
          sql`${implementationMonitoring.isDeleted} = 0`
        ),
      });

      return monitoring || null;
    }),

  /**
   * Initialize monitoring for a contract (called when contract is approved)
   */
  initialize: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;
      const ouId = ctx.scope.operatingUnitId;

      // Verify contract exists and is approved
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

      // Check if monitoring already exists
      const existing = await db.query.implementationMonitoring.findFirst({
        where: and(
          eq(implementationMonitoring.contractId, input.contractId),
          eq(implementationMonitoring.organizationId, orgId),
          sql`${implementationMonitoring.isDeleted} = 0`
        ),
      });

      if (existing) {
        return { id: existing.id, alreadyExists: true };
      }

      const [result] = await db
        .insert(implementationMonitoring)
        .values({
          organizationId: orgId,
          operatingUnitId: ouId || null,
          contractId: input.contractId,
          status: 'pending',
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .$returningId();

      return { id: result.id, alreadyExists: false };
    }),

  /**
   * Get monitoring status summary
   */
  getStatus: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const monitoring = await db.query.implementationMonitoring.findFirst({
        where: and(
          eq(implementationMonitoring.contractId, input.contractId),
          eq(implementationMonitoring.organizationId, orgId),
          sql`${implementationMonitoring.isDeleted} = 0`
        ),
      });

      if (!monitoring) {
        return { initialized: false, status: 'not_started', progress: 0 };
      }

      // Get checklist progress
      const checklistItems = await db.query.implementationChecklist.findMany({
        where: eq(implementationChecklist.monitoringId, monitoring.id),
      });
      const checklistTotal = checklistItems.length;
      const checklistCompleted = checklistItems.filter(i => i.isCompleted === 1).length;

      // Get handover statuses
      const primaryH = await db.query.primaryHandover.findFirst({
        where: eq(primaryHandover.monitoringId, monitoring.id),
      });
      const finalH = await db.query.finalHandover.findFirst({
        where: eq(finalHandover.monitoringId, monitoring.id),
      });

      // Get observations
      const observations = await db.query.implementationObservations.findMany({
        where: eq(implementationObservations.monitoringId, monitoring.id),
      });
      const openObservations = observations.filter(o => o.status === 'open' || o.status === 'in_progress').length;

      // Calculate overall progress
      let completedSteps = 0;
      let totalSteps = 4; // checklist, primary handover, final handover, observations resolved
      if (checklistTotal > 0 && checklistCompleted === checklistTotal) completedSteps++;
      if (primaryH?.status === 'approved') completedSteps++;
      if (finalH?.status === 'approved') completedSteps++;
      if (observations.length > 0 && openObservations === 0) completedSteps++;

      return {
        initialized: true,
        status: monitoring.status,
        progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
        checklist: { total: checklistTotal, completed: checklistCompleted },
        primaryHandover: primaryH ? { status: primaryH.status } : null,
        finalHandover: finalH ? { status: finalH.status } : null,
        observations: { total: observations.length, open: openObservations },
      };
    }),

  // ============================================================================
  // DELIVERABLES CHECKLIST
  // ============================================================================

  /**
   * List checklist items
   */
  listChecklist: scopedProcedure
    .input(z.object({ monitoringId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const items = await db.query.implementationChecklist.findMany({
        where: and(
          eq(implementationChecklist.monitoringId, input.monitoringId),
          eq(implementationChecklist.organizationId, ctx.scope.organizationId),
        ),
        orderBy: asc(implementationChecklist.orderIndex),
      });

      return items;
    }),

  /**
   * Add checklist item
   */
  addChecklistItem: scopedProcedure
    .input(z.object({
      monitoringId: z.number().int().positive(),
      itemDescription: z.string().min(1),
      milestoneId: z.number().int().positive().optional(),
      orderIndex: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [result] = await db
        .insert(implementationChecklist)
        .values({
          organizationId: ctx.scope.organizationId,
          monitoringId: input.monitoringId,
          milestoneId: input.milestoneId || null,
          itemDescription: input.itemDescription,
          orderIndex: input.orderIndex,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .$returningId();

      return { id: result.id };
    }),

  /**
   * Toggle checklist item completion
   */
  toggleChecklistItem: scopedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      isCompleted: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .update(implementationChecklist)
        .set({
          isCompleted: input.isCompleted ? 1 : 0,
          completedAt: input.isCompleted ? new Date().toISOString() : null,
          completedBy: input.isCompleted ? ctx.user.id : null,
          updatedBy: ctx.user.id,
        })
        .where(eq(implementationChecklist.id, input.id));

      return { success: true };
    }),

  /**
   * Delete checklist item
   */
  deleteChecklistItem: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .delete(implementationChecklist)
        .where(eq(implementationChecklist.id, input.id));

      return { success: true };
    }),

  // ============================================================================
  // PRIMARY HANDOVER
  // ============================================================================

  /**
   * Get primary handover
   */
  getPrimaryHandover: scopedProcedure
    .input(z.object({ monitoringId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const handover = await db.query.primaryHandover.findFirst({
        where: and(
          eq(primaryHandover.monitoringId, input.monitoringId),
          eq(primaryHandover.organizationId, ctx.scope.organizationId),
        ),
      });

      return handover || null;
    }),

  /**
   * Create or update primary handover
   */
  upsertPrimaryHandover: scopedProcedure
    .input(z.object({
      monitoringId: z.number().int().positive(),
      handoverDate: z.coerce.date().optional(),
      handoverDescription: z.string().optional(),
      receivedBy: z.string().optional(),
      deliveredBy: z.string().optional(),
      conditionNotes: z.string().optional(),
      attachmentsUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const existing = await db.query.primaryHandover.findFirst({
        where: and(
          eq(primaryHandover.monitoringId, input.monitoringId),
          eq(primaryHandover.organizationId, orgId),
        ),
      });

      if (existing) {
        await db
          .update(primaryHandover)
          .set({
            handoverDate: input.handoverDate?.toISOString() || existing.handoverDate,
            handoverDescription: input.handoverDescription ?? existing.handoverDescription,
            receivedBy: input.receivedBy ?? existing.receivedBy,
            deliveredBy: input.deliveredBy ?? existing.deliveredBy,
            conditionNotes: input.conditionNotes ?? existing.conditionNotes,
            attachmentsUrl: input.attachmentsUrl ?? existing.attachmentsUrl,
            updatedBy: ctx.user.id,
          })
          .where(eq(primaryHandover.id, existing.id));

        return { id: existing.id, created: false };
      }

      const [result] = await db
        .insert(primaryHandover)
        .values({
          organizationId: orgId,
          monitoringId: input.monitoringId,
          handoverDate: input.handoverDate?.toISOString() || null,
          handoverDescription: input.handoverDescription || null,
          receivedBy: input.receivedBy || null,
          deliveredBy: input.deliveredBy || null,
          conditionNotes: input.conditionNotes || null,
          attachmentsUrl: input.attachmentsUrl || null,
          status: 'draft',
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .$returningId();

      return { id: result.id, created: true };
    }),

  /**
   * Submit/approve primary handover
   */
  updatePrimaryHandoverStatus: scopedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const updateData: Record<string, any> = {
        status: input.status,
        updatedBy: ctx.user.id,
      };

      if (input.status === 'approved') {
        updateData.approvedBy = ctx.user.id;
        updateData.approvedAt = new Date().toISOString();
      }

      await db
        .update(primaryHandover)
        .set(updateData)
        .where(eq(primaryHandover.id, input.id));

      // Update monitoring flag
      const handover = await db.query.primaryHandover.findFirst({
        where: eq(primaryHandover.id, input.id),
      });
      if (handover && input.status === 'approved') {
        await db
          .update(implementationMonitoring)
          .set({ primaryHandoverComplete: 1, updatedBy: ctx.user.id })
          .where(eq(implementationMonitoring.id, handover.monitoringId));
      }

      return { success: true };
    }),

  // ============================================================================
  // FINAL HANDOVER
  // ============================================================================

  /**
   * Get final handover
   */
  getFinalHandover: scopedProcedure
    .input(z.object({ monitoringId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const handover = await db.query.finalHandover.findFirst({
        where: and(
          eq(finalHandover.monitoringId, input.monitoringId),
          eq(finalHandover.organizationId, ctx.scope.organizationId),
        ),
      });

      return handover || null;
    }),

  /**
   * Create or update final handover
   */
  upsertFinalHandover: scopedProcedure
    .input(z.object({
      monitoringId: z.number().int().positive(),
      handoverDate: z.coerce.date().optional(),
      handoverDescription: z.string().optional(),
      receivedBy: z.string().optional(),
      deliveredBy: z.string().optional(),
      defectLiabilityEndDate: z.coerce.date().optional(),
      conditionNotes: z.string().optional(),
      attachmentsUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      const existing = await db.query.finalHandover.findFirst({
        where: and(
          eq(finalHandover.monitoringId, input.monitoringId),
          eq(finalHandover.organizationId, orgId),
        ),
      });

      if (existing) {
        await db
          .update(finalHandover)
          .set({
            handoverDate: input.handoverDate?.toISOString() || existing.handoverDate,
            handoverDescription: input.handoverDescription ?? existing.handoverDescription,
            receivedBy: input.receivedBy ?? existing.receivedBy,
            deliveredBy: input.deliveredBy ?? existing.deliveredBy,
            defectLiabilityEndDate: input.defectLiabilityEndDate?.toISOString() || existing.defectLiabilityEndDate,
            conditionNotes: input.conditionNotes ?? existing.conditionNotes,
            attachmentsUrl: input.attachmentsUrl ?? existing.attachmentsUrl,
            updatedBy: ctx.user.id,
          })
          .where(eq(finalHandover.id, existing.id));

        return { id: existing.id, created: false };
      }

      const [result] = await db
        .insert(finalHandover)
        .values({
          organizationId: orgId,
          monitoringId: input.monitoringId,
          handoverDate: input.handoverDate?.toISOString() || null,
          handoverDescription: input.handoverDescription || null,
          receivedBy: input.receivedBy || null,
          deliveredBy: input.deliveredBy || null,
          defectLiabilityEndDate: input.defectLiabilityEndDate?.toISOString() || null,
          conditionNotes: input.conditionNotes || null,
          attachmentsUrl: input.attachmentsUrl || null,
          status: 'draft',
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .$returningId();

      return { id: result.id, created: true };
    }),

  /**
   * Submit/approve final handover
   */
  updateFinalHandoverStatus: scopedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const updateData: Record<string, any> = {
        status: input.status,
        updatedBy: ctx.user.id,
      };

      if (input.status === 'approved') {
        updateData.approvedBy = ctx.user.id;
        updateData.approvedAt = new Date().toISOString();
      }

      await db
        .update(finalHandover)
        .set(updateData)
        .where(eq(finalHandover.id, input.id));

      // Update monitoring flag
      const handover = await db.query.finalHandover.findFirst({
        where: eq(finalHandover.id, input.id),
      });
      if (handover && input.status === 'approved') {
        await db
          .update(implementationMonitoring)
          .set({ finalHandoverComplete: 1, updatedBy: ctx.user.id })
          .where(eq(implementationMonitoring.id, handover.monitoringId));
      }

      return { success: true };
    }),

  // ============================================================================
  // OBSERVATIONS
  // ============================================================================

  /**
   * List observations
   */
  listObservations: scopedProcedure
    .input(z.object({ monitoringId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const observations = await db.query.implementationObservations.findMany({
        where: and(
          eq(implementationObservations.monitoringId, input.monitoringId),
          eq(implementationObservations.organizationId, ctx.scope.organizationId),
        ),
        orderBy: desc(implementationObservations.createdAt),
      });

      return observations;
    }),

  /**
   * Add observation
   */
  addObservation: scopedProcedure
  .input(
    z.object({
      monitoringId: z.number().int().positive(),

      observationDate: z.date().optional(),

      observationType: z.enum([
        "positive",
        "negative",
        "neutral"
      ]),

      description: z.string().min(1),

      actionRequired: z.string().optional(),

      reportedBy: z.string().optional(),
    })
  )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [result] = await db
        .insert(implementationObservations)
        .values({
          organizationId: ctx.scope.organizationId,
          monitoringId: input.monitoringId,
          observationType: input.observationType,
          description: input.description,
          actionRequired: input.actionRequired || null,
          reportedBy: input.reportedBy || null,
          status: 'open',
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .$returningId();

      return { id: result.id };
    }),

  /**
   * Update observation status
   */
  updateObservation: scopedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
      actionTaken: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const updateData: Record<string, any> = { updatedBy: ctx.user.id };
      if (input.status) updateData.status = input.status;
      if (input.actionTaken) updateData.actionTaken = input.actionTaken;
      if (input.description) updateData.description = input.description;

      if (input.status === 'resolved' || input.status === 'closed') {
        updateData.resolvedAt = new Date().toISOString();
        updateData.resolvedBy = ctx.user.id;
      }

      await db
        .update(implementationObservations)
        .set(updateData)
        .where(eq(implementationObservations.id, input.id));

      return { success: true };
    }),

  /**
   * Delete observation
   */
  deleteObservation: scopedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db
        .delete(implementationObservations)
        .where(eq(implementationObservations.id, input.id));

      return { success: true };
    }),
});
