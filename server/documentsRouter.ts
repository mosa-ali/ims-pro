/**
 * Documents Router
 * Handles all document management operations across 7 workspaces
 * Supports automatic folder creation and sync integration
 */

import { router, scopedProcedure, orgScopedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { documents } from "../drizzle/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  workspaceFoldersExist,
  createMEALFolders,
  createHRFolders,
  createFinanceFolders,
  createLogisticsFolders,
  createDonorCRMFolders,
  createRiskComplianceFolders,
} from "./documentFolders";

const workspaceEnum = z.enum(["projects", "meal", "hr", "finance", "logistics", "donor_crm", "risk_compliance"]);

export const documentsRouter = router({
  /**
   * Get all workspaces with document counts
   * Returns summary of all 7 workspaces
   */
  getWorkspaces: orgScopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const { organizationId, operatingUnitId } = ctx.scope;

    // Count documents in each workspace
    const workspaces = [
      { code: "projects", name: "Projects", nameAr: "المشاريع" },
      { code: "meal", name: "MEAL", nameAr: "المراقبة والتقييم" },
      { code: "hr", name: "Human Resources", nameAr: "الموارد البشرية" },
      { code: "finance", name: "Financial Management", nameAr: "الإدارة المالية" },
      { code: "logistics", name: "Logistics & Procurement", nameAr: "اللوجستيات والمشتريات" },
      { code: "donor_crm", name: "Donor CRM", nameAr: "إدارة علاقات المانحين" },
      { code: "risk_compliance", name: "Risk & Compliance", nameAr: "المخاطر والامتثال" },
    ];

    const workspacesWithCounts = await Promise.all(
      workspaces.map(async (workspace) => {
        const count = await db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.workspace, workspace.code as any),
              eq(documents.isFolder, false),
              eq(documents.organizationId, organizationId),
              eq(documents.operatingUnitId, operatingUnitId),
              isNull(documents.deletedAt)
            )
          );

        return {
          ...workspace,
          documentCount: count.length,
        };
      })
    );

    return workspacesWithCounts;
  }),

  /**
   * Get folders for a workspace
   * For projects workspace: returns list of projects
   * For other workspaces: returns predefined folders
   */
  getFolders: orgScopedProcedure
    .input(
      z.object({
        workspace: workspaceEnum,
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Check if folders exist for this workspace, if not create them
      if (input.workspace !== "projects") {
        const foldersExist = await workspaceFoldersExist(input.workspace, organizationId, operatingUnitId);
        
        if (!foldersExist) {
          console.log(`[documents.getFolders] Creating folders for workspace ${input.workspace}`);
          
          // Create folders based on workspace type
          switch (input.workspace) {
            case "meal":
              await createMEALFolders(organizationId, operatingUnitId, ctx.user.id);
              break;
            case "hr":
              await createHRFolders(organizationId, operatingUnitId, ctx.user.id);
              break;
            case "finance":
              await createFinanceFolders(organizationId, operatingUnitId, ctx.user.id);
              break;
            case "logistics":
              await createLogisticsFolders(organizationId, operatingUnitId, ctx.user.id);
              break;
            case "donor_crm":
              await createDonorCRMFolders(organizationId, operatingUnitId, ctx.user.id);
              break;
            case "risk_compliance":
              await createRiskComplianceFolders(organizationId, operatingUnitId, ctx.user.id);
              break;
          }
        }
      }

      // Get folders for this workspace
      const folders = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.workspace, input.workspace),
            eq(documents.isFolder, true),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId),
            isNull(documents.deletedAt)
          )
        );

      // For projects workspace, group by parentFolderId (project code)
      if (input.workspace === "projects") {
        const projectFolders = folders.reduce((acc, folder) => {
          if (folder.parentFolderId) {
            if (!acc[folder.parentFolderId]) {
              acc[folder.parentFolderId] = {
                projectCode: folder.parentFolderId,
                folders: [],
              };
            }
            acc[folder.parentFolderId].folders.push(folder);
          }
          return acc;
        }, {} as Record<string, { projectCode: string; folders: typeof folders }>);

        return Object.values(projectFolders);
      }

      // For other workspaces, return flat folder list
      return folders.map(folder => ({
        folderCode: folder.folderCode,
        folderName: folder.fileName,
        documentCount: 0, // Will be populated by separate query if needed
      }));
    }),

  /**
   * Get documents by project (for projects workspace)
   * Returns all documents for a project, grouped by folder
   */
  getDocumentsByProject: orgScopedProcedure
    .input(
      z.object({
        projectCode: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get all folders for this project
      const folders = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.workspace, "projects"),
            eq(documents.isFolder, true),
            eq(documents.parentFolderId, input.projectCode),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId),
            isNull(documents.deletedAt)
          )
        );

      // Get all documents for this project
      const projectDocuments = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.workspace, "projects"),
            eq(documents.isFolder, false),
            eq(documents.projectId, input.projectCode),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId),
            isNull(documents.deletedAt)
          )
        )
        .orderBy(desc(documents.uploadedAt));

      // Group documents by folder
      const documentsByFolder = folders.map(folder => ({
        folderCode: folder.folderCode,
        folderName: folder.fileName,
        documents: projectDocuments.filter(doc => doc.folderCode === folder.folderCode),
      }));

      return documentsByFolder;
    }),

  /**
   * Get documents by folder (for all workspaces)
   * Returns documents in a specific folder
   */
  getDocumentsByFolder: orgScopedProcedure
    .input(
      z.object({
        workspace: workspaceEnum,
        folderCode: z.string(),
        projectCode: z.string().optional(), // Only for projects workspace
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const conditions = [
        eq(documents.workspace, input.workspace),
        eq(documents.isFolder, false),
        eq(documents.folderCode, input.folderCode),
        eq(documents.organizationId, organizationId),
        eq(documents.operatingUnitId, operatingUnitId),
        isNull(documents.deletedAt),
      ];

      // For projects workspace, filter by project code
      if (input.workspace === "projects" && input.projectCode) {
        conditions.push(eq(documents.projectId, input.projectCode));
      }

      const folderDocuments = await db
        .select()
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.uploadedAt));

      return folderDocuments;
    }),

  /**
   * Sync document (called automatically when exporting from modules)
   * Handles versioning - if document with same name exists, increment version
   */
  syncDocument: orgScopedProcedure
    .input(
      z.object({
        workspace: workspaceEnum,
        folderCode: z.string(),
        projectCode: z.string().optional(), // Only for projects workspace
        fileName: z.string(),
        filePath: z.string(), // S3 URL
        fileType: z.string(), // pdf, xlsx, etc.
        fileSize: z.number(),
        syncSource: z.string(), // e.g., 'project_report', 'financial_overview'
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Check if document with same name already exists
      const existingDocs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.workspace, input.workspace),
            eq(documents.folderCode, input.folderCode),
            eq(documents.fileName, input.fileName),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId),
            isNull(documents.deletedAt)
          )
        )
        .orderBy(desc(documents.version));

      const nextVersion = existingDocs.length > 0 ? (existingDocs[0].version || 1) + 1 : 1;

      // Create new document record
      const documentId = `doc_${input.workspace}_${input.folderCode}_${nanoid(10)}`;
      
      await db.insert(documents).values({
        documentId,
        workspace: input.workspace,
        parentFolderId: input.projectCode || null,
        isFolder: false,
        projectId: input.projectCode || null,
        folderCode: input.folderCode,
        fileName: input.fileName,
        filePath: input.filePath,
        fileType: input.fileType,
        fileSize: input.fileSize,
        uploadedBy: ctx.user.id,
        syncSource: input.syncSource,
        syncStatus: "synced",
        version: nextVersion,
        organizationId,
        operatingUnitId,
      });

      console.log(`[documents.syncDocument] Synced document ${input.fileName} to ${input.workspace}/${input.folderCode} (version ${nextVersion})`);

      return {
        success: true,
        documentId,
        version: nextVersion,
      };
    }),

  /**
   * Get document details
   */
  getDocument: orgScopedProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.documentId, input.documentId),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId),
            isNull(documents.deletedAt)
          )
        );

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  /**
   * Delete document (soft delete)
   */
  deleteDocument: orgScopedProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify document exists and belongs to this organization
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.documentId, input.documentId),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId),
            isNull(documents.deletedAt)
          )
        );

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Soft delete
      await db
        .update(documents)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(documents.documentId, input.documentId));

      console.log(`[documents.deleteDocument] Soft deleted document ${input.documentId}`);

      return { success: true };
    }),

  /**
   * Upload file and sync to Central Documents
   * For client-generated files (Excel, PDF) that need to be uploaded to S3 and synced
   */
  uploadAndSyncFile: orgScopedProcedure
    .input(
      z.object({
        workspace: workspaceEnum,
        folderCode: z.string(),
        projectCode: z.string().optional(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        fileType: z.string(), // pdf, xlsx, etc.
        syncSource: z.string(), // e.g., 'financial_overview', 'monthly_report'
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { storagePut } = await import("./storage");
      const { organizationId, operatingUnitId } = ctx.scope;

      // Decode base64 file data
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const fileSize = fileBuffer.length;

      // Generate unique file key for S3
      const timestamp = new Date().toISOString().split("T")[0];
      const randomSuffix = nanoid(8);
      const fileKey = `documents/${input.workspace}/${input.folderCode}/${timestamp}_${randomSuffix}_${input.fileName}`;

      // Upload to S3
      const { url: filePath } = await storagePut(
        fileKey,
        fileBuffer,
        input.fileType === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf"
      );

      // Sync to Central Documents
      const db = await getDb();
      const existingDocs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.workspace, input.workspace),
            eq(documents.folderCode, input.folderCode),
            eq(documents.fileName, input.fileName),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId),
            isNull(documents.deletedAt)
          )
        )
        .orderBy(desc(documents.version));

      const nextVersion = existingDocs.length > 0 ? (existingDocs[0].version || 1) + 1 : 1;

      const documentId = `doc_${input.workspace}_${input.folderCode}_${nanoid(10)}`;
      
      await db.insert(documents).values({
        documentId,
        workspace: input.workspace,
        parentFolderId: input.projectCode || null,
        isFolder: false,
        projectId: input.projectCode || null,
        folderCode: input.folderCode,
        fileName: input.fileName,
        filePath,
        fileType: input.fileType,
        fileSize,
        uploadedBy: ctx.user.id,
        syncSource: input.syncSource,
        syncStatus: "synced",
        version: nextVersion,
        organizationId,
        operatingUnitId,
      });

      console.log(`[documents.uploadAndSyncFile] Uploaded and synced ${input.fileName} to ${input.workspace}/${input.folderCode} (version ${nextVersion})`);

      return {
        success: true,
        documentId,
        version: nextVersion,
        filePath,
      };
    }),

  /**
   * Get evidence documents for a specific entity
   * Used by Evidence Panel component to show linked documents
   */
  getEvidenceDocuments: orgScopedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string(),
        module: z.string().optional(),
        screen: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Build query conditions
      const conditions = [
        eq(documents.organizationId, organizationId),
        eq(documents.operatingUnitId, operatingUnitId),
        isNull(documents.deletedAt),
        eq(documents.entityType, input.entityType),
        eq(documents.entityId, input.entityId),
      ];

      // Query documents using proper entityType/entityId columns
      const evidenceDocs = await db
        .select()
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.uploadedAt));

      return evidenceDocs;
    }),

  /**
   * Get all documents (for backward compatibility with existing UI)
   * Returns empty array for now - will be used for global document search
   */
  getAll: scopedProcedure.query(async ({ ctx }) => {
    // Return empty array for now
    // This endpoint will be enhanced later for global document search
    return [];
  }),
});
