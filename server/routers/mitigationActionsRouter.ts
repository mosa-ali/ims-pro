/**
 * Mitigation Actions Router
 * Handles CRUD operations for risk mitigation tasks, comments, and attachments
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  mitigationActions, 
  mitigationActionComments, 
  mitigationActionAttachments,
  risks,
  users 
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const mitigationActionsRouter = router({
  /**
   * List all mitigation actions for a risk
   */
  listByRisk: protectedProcedure
    .input(z.object({
      riskId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const actions = await db
        .select({
          id: mitigationActions.id,
          riskId: mitigationActions.riskId,
          title: mitigationActions.title,
          titleAr: mitigationActions.titleAr,
          description: mitigationActions.description,
          descriptionAr: mitigationActions.descriptionAr,
          assignedTo: mitigationActions.assignedTo,
          assignedBy: mitigationActions.assignedBy,
          deadline: mitigationActions.deadline,
          startedAt: mitigationActions.startedAt,
          completedAt: mitigationActions.completedAt,
          status: mitigationActions.status,
          progress: mitigationActions.progress,
          priority: mitigationActions.priority,
          evidenceRequired: mitigationActions.evidenceRequired,
          evidenceRequiredAr: mitigationActions.evidenceRequiredAr,
          evidenceProvided: mitigationActions.evidenceProvided,
          verifiedBy: mitigationActions.verifiedBy,
          verifiedAt: mitigationActions.verifiedAt,
          createdAt: mitigationActions.createdAt,
          updatedAt: mitigationActions.updatedAt,
          createdBy: mitigationActions.createdBy,
          assignedToName: users.name,
          assignedToEmail: users.email,
        })
        .from(mitigationActions)
        .leftJoin(users, eq(mitigationActions.assignedTo, users.id))
        .where(
          and(
            eq(mitigationActions.riskId, input.riskId),
            eq(mitigationActions.organizationId, ctx.scope.organizationId)
          )
        )
        .orderBy(desc(mitigationActions.createdAt));

      return actions;
    }),

  /**
   * Get single mitigation action with details
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const [action] = await db
        .select()
        .from(mitigationActions)
        .where(
          and(
            eq(mitigationActions.id, input.id),
            eq(mitigationActions.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mitigation action not found",
        });
      }

      // Get comments
      const comments = await db
        .select({
          id: mitigationActionComments.id,
          comment: mitigationActionComments.comment,
          commentAr: mitigationActionComments.commentAr,
          progressUpdate: mitigationActionComments.progressUpdate,
          statusChange: mitigationActionComments.statusChange,
          createdAt: mitigationActionComments.createdAt,
          createdBy: mitigationActionComments.createdBy,
          createdByName: users.name,
        })
        .from(mitigationActionComments)
        .leftJoin(users, eq(mitigationActionComments.createdBy, users.id))
        .where(eq(mitigationActionComments.actionId, input.id))
        .orderBy(desc(mitigationActionComments.createdAt));

      // Get attachments
      const attachments = await db
        .select()
        .from(mitigationActionAttachments)
        .where(eq(mitigationActionAttachments.actionId, input.id))
        .orderBy(desc(mitigationActionAttachments.uploadedAt));

      return {
        ...action,
        comments,
        attachments,
      };
    }),

  /**
   * Create new mitigation action
   */
  create: protectedProcedure
    .input(z.object({
      riskId: z.number(),
      title: z.string().min(1).max(255),
      titleAr: z.string().max(255).optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      assignedTo: z.number().optional(),
      deadline: z.string().optional(), // ISO date string
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      evidenceRequired: z.string().optional(),
      evidenceRequiredAr: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const result = await db.insert(mitigationActions).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        riskId: input.riskId,
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        assignedTo: input.assignedTo,
        assignedBy: ctx.user.id,
        deadline: input.deadline,
        priority: input.priority,
        evidenceRequired: input.evidenceRequired,
        evidenceRequiredAr: input.evidenceRequiredAr,
        status: "pending",
        progress: 0,
        createdBy: ctx.user.id,
      });

      return { id: result[0].insertId };
    }),

  /**
   * Update mitigation action
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      titleAr: z.string().max(255).optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      assignedTo: z.number().optional(),
      deadline: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled", "overdue"]).optional(),
      progress: z.number().min(0).max(100).optional(),
      evidenceRequired: z.string().optional(),
      evidenceRequiredAr: z.string().optional(),
      evidenceProvided: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const { id, ...updates } = input;

      // Check if action exists and belongs to organization
      const [existing] = await db
        .select()
        .from(mitigationActions)
        .where(
          and(
            eq(mitigationActions.id, id),
            eq(mitigationActions.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mitigation action not found",
        });
      }

      // Update timestamps based on status changes
      const additionalUpdates: any = {};
      if (updates.status === "in_progress" && !existing.startedAt) {
        additionalUpdates.startedAt = new Date();
      }
      if (updates.status === "completed" && !existing.completedAt) {
        additionalUpdates.completedAt = new Date();
        additionalUpdates.progress = 100;
      }

      await db
        .update(mitigationActions)
        .set({ ...updates, ...additionalUpdates })
        .where(eq(mitigationActions.id, id));

      // Update risk mitigation progress if action is completed
      if (updates.status === "completed" || updates.progress !== undefined) {
        await updateRiskProgress(db, existing.riskId);
      }

      return { success: true };
    }),

  /**
   * Delete mitigation action
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Check if action exists
      const [existing] = await db
        .select()
        .from(mitigationActions)
        .where(
          and(
            eq(mitigationActions.id, input.id),
            eq(mitigationActions.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mitigation action not found",
        });
      }

      await db.delete(mitigationActions).where(eq(mitigationActions.id, input.id));

      // Update risk progress
      await updateRiskProgress(db, existing.riskId);

      return { success: true };
    }),

  /**
   * Add comment to mitigation action
   */
  addComment: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      comment: z.string().min(1),
      commentAr: z.string().optional(),
      progressUpdate: z.number().min(0).max(100).optional(),
      statusChange: z.enum(["pending", "in_progress", "completed", "cancelled", "overdue"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verify action exists
      const [action] = await db
        .select()
        .from(mitigationActions)
        .where(
          and(
            eq(mitigationActions.id, input.actionId),
            eq(mitigationActions.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mitigation action not found",
        });
      }

      // Add comment
      const result = await db.insert(mitigationActionComments).values({
        actionId: input.actionId,
        comment: input.comment,
        commentAr: input.commentAr,
        progressUpdate: input.progressUpdate,
        statusChange: input.statusChange,
        createdBy: ctx.user.id,
      });

      // Update action if progress or status changed
      if (input.progressUpdate !== undefined || input.statusChange) {
        const updates: any = {};
        if (input.progressUpdate !== undefined) {
          updates.progress = input.progressUpdate;
        }
        if (input.statusChange) {
          updates.status = input.statusChange;
          if (input.statusChange === "in_progress" && !action.startedAt) {
            updates.startedAt = new Date();
          }
          if (input.statusChange === "completed") {
            updates.completedAt = new Date();
            updates.progress = 100;
          }
        }

        await db
          .update(mitigationActions)
          .set(updates)
          .where(eq(mitigationActions.id, input.actionId));

        // Update risk progress
        await updateRiskProgress(db, action.riskId);
      }

      return { id: result[0].insertId };
    }),

  /**
   * Add attachment to mitigation action
   */
  addAttachment: protectedProcedure
    .input(z.object({
      actionId: z.number(),
      fileName: z.string().min(1).max(255),
      fileUrl: z.string().url().max(500),
      fileSize: z.number().optional(),
      fileType: z.string().max(100).optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verify action exists
      const [action] = await db
        .select()
        .from(mitigationActions)
        .where(
          and(
            eq(mitigationActions.id, input.actionId),
            eq(mitigationActions.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!action) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mitigation action not found",
        });
      }

      const result = await db.insert(mitigationActionAttachments).values({
        actionId: input.actionId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        fileType: input.fileType,
        description: input.description,
        descriptionAr: input.descriptionAr,
        uploadedBy: ctx.user.id,
      });

      return { id: result[0].insertId };
    }),

  /**
   * Delete attachment
   */
  deleteAttachment: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verify attachment exists and belongs to organization
      const [attachment] = await db
        .select({
          id: mitigationActionAttachments.id,
          actionId: mitigationActionAttachments.actionId,
          organizationId: mitigationActions.organizationId,
        })
        .from(mitigationActionAttachments)
        .innerJoin(mitigationActions, eq(mitigationActionAttachments.actionId, mitigationActions.id))
        .where(eq(mitigationActionAttachments.id, input.id))
        .limit(1);

      if (!attachment || attachment.organizationId !== ctx.scope.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attachment not found",
        });
      }

      await db.delete(mitigationActionAttachments).where(eq(mitigationActionAttachments.id, input.id));

      return { success: true };
    }),
});

/**
 * Helper: Update risk mitigation progress based on action completion
 * Automatically updates risk status when all actions are completed
 */
async function updateRiskProgress(db: any, riskId: number) {
  // Get all actions for the risk
  const actions = await db
    .select({
      status: mitigationActions.status,
      progress: mitigationActions.progress,
    })
    .from(mitigationActions)
    .where(eq(mitigationActions.riskId, riskId));

  if (actions.length === 0) {
    // No actions, reset progress
    await db
      .update(risks)
      .set({ mitigationProgress: 0 })
      .where(eq(risks.id, riskId));
    return;
  }

  // Calculate average progress
  const totalProgress = actions.reduce((sum, action) => sum + action.progress, 0);
  const avgProgress = Math.round(totalProgress / actions.length);

  // Check if all actions are completed
  const allCompleted = actions.every(action => action.status === "completed");

  const updates: any = { mitigationProgress: avgProgress };

  // Auto-update risk status if all actions completed
  if (allCompleted && avgProgress === 100) {
    updates.status = "mitigated";
  }

  await db
    .update(risks)
    .set(updates)
    .where(eq(risks.id, riskId));
}
