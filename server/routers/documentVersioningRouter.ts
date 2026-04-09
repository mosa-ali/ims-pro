/**
 * Document Versioning and Audit Trail Router
 * 
 * Handles:
 * - Document version history
 * - Version rollback
 * - Audit trail logging
 * - Document access tracking
 * - Legal holds management
 * - Document classification
 */

import { router, protectedProcedure, scopedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  documentVersions,
  documentAuditLogs,
  documentLegalHolds,
  documentClassifications,
  documentAccessLogs,
  documentMetadata,
  documents,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

const db = getDb();

export const documentVersioningRouter = router({
  /**
   * Get document version history
   */
  getVersionHistory: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const versions = await db.query.documentVersions.findMany({
        where: (v, { and, eq }) =>
          and(
            eq(v.documentId, input.documentId),
            eq(v.organizationId, ctx.organizationId),
            eq(v.operatingUnitId, ctx.operatingUnitId)
          ),
        orderBy: (v) => desc(v.versionNumber),
      });

      return versions;
    }),

  /**
   * Get specific document version
   */
  getVersion: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        versionNumber: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const version = await db.query.documentVersions.findFirst({
        where: (v, { and, eq }) =>
          and(
            eq(v.documentId, input.documentId),
            eq(v.versionNumber, input.versionNumber),
            eq(v.organizationId, ctx.organizationId),
            eq(v.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document version not found",
        });
      }

      return version;
    }),

  /**
   * Create document version (called when document is updated)
   */
  createVersion: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        versionNumber: z.number(),
        fileName: z.string(),
        filePath: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        mimeType: z.string().optional(),
        changeDescription: z.string().optional(),
        changeDescriptionAr: z.string().optional(),
        changeType: z.enum(["created", "updated", "restored", "archived"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [version] = await db
        .insert(documentVersions)
        .values({
          documentId: input.documentId,
          versionNumber: input.versionNumber,
          fileName: input.fileName,
          filePath: input.filePath,
          fileType: input.fileType,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          changeDescription: input.changeDescription,
          changeDescriptionAr: input.changeDescriptionAr,
          changeType: input.changeType,
          createdBy: ctx.userId,
          organizationId: ctx.organizationId,
          operatingUnitId: ctx.operatingUnitId,
        })
        .returning();

      return version;
    }),

  /**
   * Get audit logs for a document
   */
  getAuditLogs: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        action: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const logs = await db.query.documentAuditLogs.findMany({
        where: (l, { and, eq, gte, lte }) => {
          const conditions = [
            eq(l.documentId, input.documentId),
            eq(l.organizationId, ctx.organizationId),
            eq(l.operatingUnitId, ctx.operatingUnitId),
          ];

          if (input.action) {
            conditions.push(eq(l.action, input.action as any));
          }

          if (input.startDate) {
            conditions.push(gte(l.performedAt, input.startDate));
          }

          if (input.endDate) {
            conditions.push(lte(l.performedAt, input.endDate));
          }

          return and(...conditions);
        },
        orderBy: (l) => desc(l.performedAt),
        limit: input.limit,
        offset: input.offset,
      });

      return logs;
    }),

  /**
   * Log document action
   */
  logAction: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        action: z.enum([
          "created",
          "updated",
          "viewed",
          "downloaded",
          "shared",
          "deleted",
          "restored",
          "moved",
          "renamed",
          "permission_changed",
          "classified",
          "retention_applied",
          "hold_applied",
          "hold_released",
          "exported",
          "printed",
        ]),
        actionDescription: z.string().optional(),
        actionDescriptionAr: z.string().optional(),
        previousValue: z.string().optional(),
        newValue: z.string().optional(),
        userIp: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [log] = await db
        .insert(documentAuditLogs)
        .values({
          documentId: input.documentId,
          action: input.action,
          actionDescription: input.actionDescription,
          actionDescriptionAr: input.actionDescriptionAr,
          previousValue: input.previousValue,
          newValue: input.newValue,
          userIp: input.userIp,
          userAgent: input.userAgent,
          performedBy: ctx.userId,
          organizationId: ctx.organizationId,
          operatingUnitId: ctx.operatingUnitId,
        })
        .returning();

      return log;
    }),

  /**
   * Get access logs for a document
   */
  getAccessLogs: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        accessType: z.enum(["view", "download", "print", "share", "export"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const logs = await db.query.documentAccessLogs.findMany({
        where: (l, { and, eq }) => {
          const conditions = [
            eq(l.documentId, input.documentId),
            eq(l.organizationId, ctx.organizationId),
            eq(l.operatingUnitId, ctx.operatingUnitId),
          ];

          if (input.accessType) {
            conditions.push(eq(l.accessType, input.accessType));
          }

          return and(...conditions);
        },
        orderBy: (l) => desc(l.accessedAt),
        limit: input.limit,
        offset: input.offset,
      });

      return logs;
    }),

  /**
   * Log document access
   */
  logAccess: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        accessType: z.enum(["view", "download", "print", "share", "export"]),
        accessReason: z.string().optional(),
        accessReasonAr: z.string().optional(),
        userIp: z.string().optional(),
        userAgent: z.string().optional(),
        deviceType: z.string().optional(),
        sharedWith: z.number().optional(),
        viewDurationSeconds: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [log] = await db
        .insert(documentAccessLogs)
        .values({
          documentId: input.documentId,
          accessType: input.accessType,
          accessReason: input.accessReason,
          accessReasonAr: input.accessReasonAr,
          accessedBy: ctx.userId,
          userIp: input.userIp,
          userAgent: input.userAgent,
          deviceType: input.deviceType,
          sharedWith: input.sharedWith,
          viewDurationSeconds: input.viewDurationSeconds,
          organizationId: ctx.organizationId,
          operatingUnitId: ctx.operatingUnitId,
        })
        .returning();

      return log;
    }),

  /**
   * Apply legal hold to document
   */
  applyLegalHold: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        holdCode: z.string(),
        holdReason: z.string(),
        holdReasonAr: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        holdEndDate: z.string().optional(),
        caseReference: z.string().optional(),
        litigationParty: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify document exists
      const doc = await db.query.documents.findFirst({
        where: (d, { and, eq }) =>
          and(
            eq(d.documentId, input.documentId),
            eq(d.organizationId, ctx.organizationId),
            eq(d.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const [hold] = await db
        .insert(documentLegalHolds)
        .values({
          documentId: input.documentId,
          organizationId: ctx.organizationId,
          operatingUnitId: ctx.operatingUnitId,
          holdCode: input.holdCode,
          holdReason: input.holdReason,
          holdReasonAr: input.holdReasonAr,
          description: input.description,
          descriptionAr: input.descriptionAr,
          holdEndDate: input.holdEndDate,
          caseReference: input.caseReference,
          litigationParty: input.litigationParty,
          createdBy: ctx.userId,
        })
        .returning();

      // Log the action
      await db.insert(documentAuditLogs).values({
        documentId: input.documentId,
        action: "hold_applied",
        actionDescription: `Legal hold applied: ${input.holdReason}`,
        performedBy: ctx.userId,
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
      });

      return hold;
    }),

  /**
   * Release legal hold
   */
  releaseLegalHold: scopedProcedure
    .input(
      z.object({
        holdId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const hold = await db.query.documentLegalHolds.findFirst({
        where: (h, { and, eq }) =>
          and(
            eq(h.id, input.holdId),
            eq(h.organizationId, ctx.organizationId),
            eq(h.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      if (!hold) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Legal hold not found",
        });
      }

      const [updated] = await db
        .update(documentLegalHolds)
        .set({
          holdStatus: "released",
          releasedBy: ctx.userId,
          releasedAt: new Date().toISOString(),
        })
        .where(eq(documentLegalHolds.id, input.holdId))
        .returning();

      // Log the action
      await db.insert(documentAuditLogs).values({
        documentId: hold.documentId,
        action: "hold_released",
        actionDescription: "Legal hold released",
        performedBy: ctx.userId,
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
      });

      return updated;
    }),

  /**
   * Get legal holds for document
   */
  getLegalHolds: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const holds = await db.query.documentLegalHolds.findMany({
        where: (h, { and, eq }) =>
          and(
            eq(h.documentId, input.documentId),
            eq(h.organizationId, ctx.organizationId),
            eq(h.operatingUnitId, ctx.operatingUnitId)
          ),
        orderBy: (h) => desc(h.holdStartDate),
      });

      return holds;
    }),

  /**
   * Classify document
   */
  classifyDocument: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        classificationLevel: z.enum([
          "public",
          "internal",
          "confidential",
          "restricted",
          "secret",
        ]),
        sensitivityTags: z.array(z.string()).optional(),
        requiresApprovalToView: z.boolean().default(false),
        requiresApprovalToDownload: z.boolean().default(false),
        requiresApprovalToShare: z.boolean().default(false),
        classificationExpiryDate: z.string().optional(),
        autoDowngradeToPublic: z.boolean().default(false),
        classificationReason: z.string().optional(),
        classificationReasonAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify document exists
      const doc = await db.query.documents.findFirst({
        where: (d, { and, eq }) =>
          and(
            eq(d.documentId, input.documentId),
            eq(d.organizationId, ctx.organizationId),
            eq(d.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check if classification already exists
      const existing = await db.query.documentClassifications.findFirst({
        where: (c, { and, eq }) =>
          and(
            eq(c.documentId, input.documentId),
            eq(c.organizationId, ctx.organizationId),
            eq(c.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      let classification;

      if (existing) {
        // Update existing classification
        [classification] = await db
          .update(documentClassifications)
          .set({
            classificationLevel: input.classificationLevel,
            sensitivityTags: input.sensitivityTags
              ? JSON.stringify(input.sensitivityTags)
              : null,
            requiresApprovalToView: input.requiresApprovalToView ? 1 : 0,
            requiresApprovalToDownload: input.requiresApprovalToDownload ? 1 : 0,
            requiresApprovalToShare: input.requiresApprovalToShare ? 1 : 0,
            classificationExpiryDate: input.classificationExpiryDate,
            autoDowngradeToPublic: input.autoDowngradeToPublic ? 1 : 0,
            reclassifiedBy: ctx.userId,
            reclassifiedAt: new Date().toISOString(),
            reclassificationReason: input.classificationReason,
            reclassificationReasonAr: input.classificationReasonAr,
          })
          .where(
            and(
              eq(documentClassifications.documentId, input.documentId),
              eq(documentClassifications.organizationId, ctx.organizationId),
              eq(documentClassifications.operatingUnitId, ctx.operatingUnitId)
            )
          )
          .returning();
      } else {
        // Create new classification
        [classification] = await db
          .insert(documentClassifications)
          .values({
            documentId: input.documentId,
            organizationId: ctx.organizationId,
            operatingUnitId: ctx.operatingUnitId,
            classificationLevel: input.classificationLevel,
            sensitivityTags: input.sensitivityTags
              ? JSON.stringify(input.sensitivityTags)
              : null,
            requiresApprovalToView: input.requiresApprovalToView ? 1 : 0,
            requiresApprovalToDownload: input.requiresApprovalToDownload ? 1 : 0,
            requiresApprovalToShare: input.requiresApprovalToShare ? 1 : 0,
            classificationExpiryDate: input.classificationExpiryDate,
            autoDowngradeToPublic: input.autoDowngradeToPublic ? 1 : 0,
            classifiedBy: ctx.userId,
            classificationReason: input.classificationReason,
            classificationReasonAr: input.classificationReasonAr,
          })
          .returning();
      }

      // Log the action
      await db.insert(documentAuditLogs).values({
        documentId: input.documentId,
        action: "classified",
        actionDescription: `Document classified as ${input.classificationLevel}`,
        performedBy: ctx.userId,
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
      });

      return classification;
    }),

  /**
   * Get document classification
   */
  getClassification: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const classification = await db.query.documentClassifications.findFirst({
        where: (c, { and, eq }) =>
          and(
            eq(c.documentId, input.documentId),
            eq(c.organizationId, ctx.organizationId),
            eq(c.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      return classification;
    }),

  /**
   * Get document metadata
   */
  getMetadata: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const metadata = await db.query.documentMetadata.findFirst({
        where: (m, { and, eq }) =>
          and(
            eq(m.documentId, input.documentId),
            eq(m.organizationId, ctx.organizationId),
            eq(m.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      return metadata;
    }),

  /**
   * Update document metadata
   */
  updateMetadata: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        title: z.string().optional(),
        titleAr: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        author: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        customFields: z.record(z.any()).optional(),
        language: z.string().optional(),
        pageCount: z.number().optional(),
        wordCount: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if metadata exists
      const existing = await db.query.documentMetadata.findFirst({
        where: (m, { and, eq }) =>
          and(
            eq(m.documentId, input.documentId),
            eq(m.organizationId, ctx.organizationId),
            eq(m.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      let metadata;

      if (existing) {
        // Update existing metadata
        [metadata] = await db
          .update(documentMetadata)
          .set({
            title: input.title,
            titleAr: input.titleAr,
            description: input.description,
            descriptionAr: input.descriptionAr,
            author: input.author,
            keywords: input.keywords ? JSON.stringify(input.keywords) : undefined,
            tags: input.tags ? JSON.stringify(input.tags) : undefined,
            customFields: input.customFields,
            language: input.language,
            pageCount: input.pageCount,
            wordCount: input.wordCount,
            updatedBy: ctx.userId,
          })
          .where(
            and(
              eq(documentMetadata.documentId, input.documentId),
              eq(documentMetadata.organizationId, ctx.organizationId),
              eq(documentMetadata.operatingUnitId, ctx.operatingUnitId)
            )
          )
          .returning();
      } else {
        // Create new metadata
        [metadata] = await db
          .insert(documentMetadata)
          .values({
            documentId: input.documentId,
            organizationId: ctx.organizationId,
            operatingUnitId: ctx.operatingUnitId,
            title: input.title,
            titleAr: input.titleAr,
            description: input.description,
            descriptionAr: input.descriptionAr,
            author: input.author,
            keywords: input.keywords ? JSON.stringify(input.keywords) : undefined,
            tags: input.tags ? JSON.stringify(input.tags) : undefined,
            customFields: input.customFields,
            language: input.language,
            pageCount: input.pageCount,
            wordCount: input.wordCount,
            updatedBy: ctx.userId,
          })
          .returning();
      }

      return metadata;
    }),
});
