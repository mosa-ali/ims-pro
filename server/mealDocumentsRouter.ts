import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { mealDocuments } from "../drizzle/schema";
import { eq, and, desc, like, count } from "drizzle-orm";

/**
 * MEAL Documents Router - Document Management for MEAL Module
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const mealDocumentsRouter = router({
  // Get all documents for an organization (excludes soft-deleted)
  getAll: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      documentType: z.enum([
        "report", "assessment", "evaluation", "tool", "template",
        "guideline", "sop", "training_material", "other"
      ]).optional(),
      category: z.enum(["indicators", "surveys", "reports", "accountability", "other"]).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(mealDocuments.organizationId, organizationId),
        eq(mealDocuments.isDeleted, false),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(mealDocuments.operatingUnitId, operatingUnitId));
      }
      if (input.projectId) {
        conditions.push(eq(mealDocuments.projectId, input.projectId));
      }
      if (input.documentType) {
        conditions.push(eq(mealDocuments.documentType, input.documentType));
      }
      if (input.category) {
        conditions.push(eq(mealDocuments.category, input.category));
      }
      if (input.search) {
        conditions.push(like(mealDocuments.title, `%${input.search}%`));
      }
      
      return await db
        .select()
        .from(mealDocuments)
        .where(and(...conditions))
        .orderBy(desc(mealDocuments.createdAt));
    }),

  // Get single document by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db
        .select()
        .from(mealDocuments)
        .where(
          and(
            eq(mealDocuments.id, input.id),
            eq(mealDocuments.organizationId, organizationId),
            eq(mealDocuments.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get statistics for dashboard
  getStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(mealDocuments.organizationId, organizationId),
        eq(mealDocuments.isDeleted, false),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(mealDocuments.operatingUnitId, operatingUnitId));
      }
      
      const allDocuments = await db
        .select()
        .from(mealDocuments)
        .where(and(...conditions));
      
      // By type
      const reports = allDocuments.filter(d => d.documentType === 'report').length;
      const assessments = allDocuments.filter(d => d.documentType === 'assessment').length;
      const evaluations = allDocuments.filter(d => d.documentType === 'evaluation').length;
      const tools = allDocuments.filter(d => d.documentType === 'tool').length;
      const templates = allDocuments.filter(d => d.documentType === 'template').length;
      const guidelines = allDocuments.filter(d => d.documentType === 'guideline').length;
      const sops = allDocuments.filter(d => d.documentType === 'sop').length;
      const trainingMaterials = allDocuments.filter(d => d.documentType === 'training_material').length;
      const other = allDocuments.filter(d => d.documentType === 'other').length;
      
      // By category
      const indicatorsDocs = allDocuments.filter(d => d.category === 'indicators').length;
      const surveysDocs = allDocuments.filter(d => d.category === 'surveys').length;
      const reportsDocs = allDocuments.filter(d => d.category === 'reports').length;
      const accountabilityDocs = allDocuments.filter(d => d.category === 'accountability').length;
      const otherDocs = allDocuments.filter(d => d.category === 'other').length;
      
      return {
        total: allDocuments.length,
        byType: { reports, assessments, evaluations, tools, templates, guidelines, sops, trainingMaterials, other },
        byCategory: { indicators: indicatorsDocs, surveys: surveysDocs, reports: reportsDocs, accountability: accountabilityDocs, other: otherDocs },
      };
    }),

  // Create document
  create: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      documentCode: z.string(),
      title: z.string(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      documentType: z.enum([
        "report", "assessment", "evaluation", "tool", "template",
        "guideline", "sop", "training_material", "other"
      ]).default("other"),
      category: z.enum(["indicators", "surveys", "reports", "accountability", "other"]).default("other"),
      fileName: z.string(),
      fileUrl: z.string(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      version: z.string().default("1.0"),
      parentDocumentId: z.number().optional(),
      sourceModule: z.string().optional(),
      sourceRecordId: z.number().optional(),
      isSystemGenerated: z.boolean().default(false),
      isPublic: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(mealDocuments).values({
        organizationId,
        operatingUnitId,
        projectId: input.projectId,
        documentCode: input.documentCode,
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        documentType: input.documentType,
        category: input.category,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        version: input.version,
        parentDocumentId: input.parentDocumentId,
        sourceModule: input.sourceModule,
        sourceRecordId: input.sourceRecordId,
        isSystemGenerated: input.isSystemGenerated,
        isPublic: input.isPublic,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update document
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      documentCode: z.string().optional(),
      title: z.string().optional(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      documentType: z.enum([
        "report", "assessment", "evaluation", "tool", "template",
        "guideline", "sop", "training_material", "other"
      ]).optional(),
      category: z.enum(["indicators", "surveys", "reports", "accountability", "other"]).optional(),
      fileName: z.string().optional(),
      fileUrl: z.string().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      version: z.string().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      await db
        .update(mealDocuments)
        .set({
          ...updateData,
          updatedBy: ctx.user?.id,
        })
        .where(and(eq(mealDocuments.id, id), eq(mealDocuments.organizationId, organizationId)));
      
      return { success: true };
    }),

  // SOFT DELETE ONLY - NO HARD DELETE ALLOWED
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // MANDATORY: Soft delete only - set isDeleted = true
      await db
        .update(mealDocuments)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(eq(mealDocuments.id, input.id), eq(mealDocuments.organizationId, organizationId)));
      
      return { success: true };
    }),

  // Get version history for a document
  getVersionHistory: scopedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get the document
      const doc = await db
        .select()
        .from(mealDocuments)
        .where(and(eq(mealDocuments.id, input.documentId), eq(mealDocuments.organizationId, organizationId)))
        .limit(1);
      
      if (!doc[0]) return [];
      
      // Find all versions (documents with same parent or same document code)
      const versions = await db
        .select()
        .from(mealDocuments)
        .where(
          and(
            eq(mealDocuments.documentCode, doc[0].documentCode),
            eq(mealDocuments.organizationId, organizationId),
            eq(mealDocuments.isDeleted, false)
          )
        )
        .orderBy(desc(mealDocuments.createdAt));
      
      return versions;
    }),

  // Get documents by source (for linking from other modules)
  getBySource: scopedProcedure
    .input(z.object({
      sourceModule: z.string(),
      sourceRecordId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return await db
        .select()
        .from(mealDocuments)
        .where(
          and(
            eq(mealDocuments.sourceModule, input.sourceModule),
            eq(mealDocuments.sourceRecordId, input.sourceRecordId),
            eq(mealDocuments.organizationId, organizationId),
            eq(mealDocuments.isDeleted, false)
          )
        )
        .orderBy(desc(mealDocuments.createdAt));
    }),
});
