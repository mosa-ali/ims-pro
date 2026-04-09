import { z } from "zod";
import { publicProcedure, protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { hrDocuments } from "../drizzle/schema";
import { eq, and, desc, like, or, sql, count } from "drizzle-orm";

/**
 * HR Documents Router - HR Policies, Templates, and Documentation
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 */
export const hrDocumentsRouter = router({
  // Get all documents for an organization
  getAll: scopedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      documentType: z.enum(["policy", "template", "form", "contract", "certificate", "id_document", "other"]).optional(),
      category: z.string().optional(),
      status: z.enum(["draft", "active", "archived", "expired"]).optional(),
      search: z.string().optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(hrDocuments.organizationId, organizationId),
        eq(hrDocuments.isDeleted, false),
      ];
      
      if (input.employeeId) {
        conditions.push(eq(hrDocuments.employeeId, input.employeeId));
      }
      if (input.documentType) {
        conditions.push(eq(hrDocuments.documentType, input.documentType));
      }
      if (input.category) {
        conditions.push(eq(hrDocuments.category, input.category));
      }
      if (input.status) {
        conditions.push(eq(hrDocuments.status, input.status));
      }
      
      const documents = await db
        .select()
        .from(hrDocuments)
        .where(and(...conditions))
        .orderBy(desc(hrDocuments.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      // Filter by search if provided
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        return documents.filter(doc => 
          doc.documentName?.toLowerCase().includes(searchLower) ||
          doc.documentNameAr?.toLowerCase().includes(searchLower) ||
          doc.documentCode?.toLowerCase().includes(searchLower) ||
          doc.category?.toLowerCase().includes(searchLower)
        );
      }
      
      return documents;
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
        .from(hrDocuments)
        .where(
          and(
            eq(hrDocuments.id, input.id),
            eq(hrDocuments.organizationId, organizationId),
            eq(hrDocuments.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get documents for an employee
  getByEmployee: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      return await db
        .select()
        .from(hrDocuments)
        .where(
          and(
            eq(hrDocuments.organizationId, organizationId),
            eq(hrDocuments.employeeId, input.employeeId),
            eq(hrDocuments.isDeleted, false)
          )
        )
        .orderBy(desc(hrDocuments.createdAt));
    }),

  // Get document statistics
  getStatistics: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const allDocuments = await db
        .select()
        .from(hrDocuments)
        .where(
          and(
            eq(hrDocuments.organizationId, organizationId),
            eq(hrDocuments.isDeleted, false)
          )
        );
      
      // By type
      const policy = allDocuments.filter(d => d.documentType === 'policy').length;
      const template = allDocuments.filter(d => d.documentType === 'template').length;
      const form = allDocuments.filter(d => d.documentType === 'form').length;
      const contract = allDocuments.filter(d => d.documentType === 'contract').length;
      const certificate = allDocuments.filter(d => d.documentType === 'certificate').length;
      const idDocument = allDocuments.filter(d => d.documentType === 'id_document').length;
      const other = allDocuments.filter(d => d.documentType === 'other').length;
      
      // By status
      const draft = allDocuments.filter(d => d.status === 'draft').length;
      const active = allDocuments.filter(d => d.status === 'active').length;
      const archived = allDocuments.filter(d => d.status === 'archived').length;
      const expired = allDocuments.filter(d => d.status === 'expired').length;
      
      // Get unique categories
      const categories = [...new Set(allDocuments.map(d => d.category).filter(Boolean))];
      
      // Count employee-specific vs organization-wide
      const employeeSpecific = allDocuments.filter(d => d.employeeId !== null).length;
      const organizationWide = allDocuments.filter(d => d.employeeId === null).length;
      
      return {
        total: allDocuments.length,
        byType: { policy, template, form, contract, certificate, idDocument, other },
        byStatus: { draft, active, archived, expired },
        categories,
        employeeSpecific,
        organizationWide,
      };
    }),

  // Create new document
  create: scopedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      documentCode: z.string().optional(),
      documentName: z.string(),
      documentNameAr: z.string().optional(),
      documentType: z.enum(["policy", "template", "form", "contract", "certificate", "id_document", "other"]),
      category: z.string().optional(),
      fileUrl: z.string().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      version: z.string().optional(),
      effectiveDate: z.string().optional(),
      expiryDate: z.string().optional(),
      description: z.string().optional(),
      tags: z.string().optional(),
      isPublic: z.boolean().optional().default(false),
      accessRoles: z.string().optional(),
      status: z.enum(["draft", "active", "archived", "expired"]).optional().default("active"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(hrDocuments).values({
        organizationId,
        employeeId: input.employeeId,
        documentCode: input.documentCode,
        documentName: input.documentName,
        documentNameAr: input.documentNameAr,
        documentType: input.documentType,
        category: input.category,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        version: input.version,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        description: input.description,
        tags: input.tags,
        isPublic: input.isPublic,
        accessRoles: input.accessRoles,
        status: input.status,
        uploadedBy: ctx.user?.id,
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update document
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      documentCode: z.string().optional(),
      documentName: z.string().optional(),
      documentNameAr: z.string().optional(),
      documentType: z.enum(["policy", "template", "form", "contract", "certificate", "id_document", "other"]).optional(),
      category: z.string().optional(),
      fileUrl: z.string().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      version: z.string().optional(),
      effectiveDate: z.string().optional(),
      expiryDate: z.string().optional(),
      description: z.string().optional(),
      tags: z.string().optional(),
      isPublic: z.boolean().optional(),
      accessRoles: z.string().optional(),
      status: z.enum(["draft", "active", "archived", "expired"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.effectiveDate) processedData.effectiveDate = new Date(updateData.effectiveDate);
      if (updateData.expiryDate) processedData.expiryDate = new Date(updateData.expiryDate);
      
      await db
        .update(hrDocuments)
        .set(processedData)
        .where(and(
          eq(hrDocuments.id, id),
          eq(hrDocuments.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Archive document
  archive: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrDocuments)
        .set({ status: "archived" })
        .where(and(
          eq(hrDocuments.id, input.id),
          eq(hrDocuments.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Soft delete document
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrDocuments)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(hrDocuments.id, input.id),
          eq(hrDocuments.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Restore soft-deleted document
  restore: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(hrDocuments)
        .set({
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        })
        .where(and(
          eq(hrDocuments.id, input.id),
          eq(hrDocuments.organizationId, organizationId)
        ));
      
      return { success: true };
    }),
});
