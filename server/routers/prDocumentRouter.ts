import { TRPCError } from "@trpc/server";
import { protectedProcedure, scopedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  generatedDocuments,
  purchaseRequests,
  organizations,
  operatingUnits,
  purchaseRequestLineItems,
  users,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import { generatePRDocument } from "../_core/prDocumentGenerator";


const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

/**
 * ============================================================================
 * PR DOCUMENT ROUTER - INTEGRATED WITH UNIVERSAL PDF SERVICE
 * ============================================================================
 *
 * Handles intelligent document generation with:
 * ✅ Smart caching - Check generatedDocuments table first
 * ✅ Automatic syncing - Store metadata after generation
 * ✅ Versioning - Track document versions automatically
 * ✅ Multi-language support - Generate EN/AR PDFs
 * ✅ Data isolation - Enforce OU/Org boundaries
 *
 * Flow:
 * 1. Check if valid PDF exists in generatedDocuments table
 * 2. If exists and valid, return cached PDF URL
 * 3. If missing, generate new PDF
 * 4. Upload to S3
 * 5. Store metadata in generatedDocuments table
 * 6. Return PDF URL
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type DocumentType = "PR" | "RFQ" | "PO" | "GRN" | "DELIVERY" | "PAYMENT";

interface PdfGenerationResult {
  success: boolean;
  documentId: number;
  fileName: string;
  url: string;
  version: number;
  isNewGeneration: boolean;
  message: string;
}

/**
 * Map document types to generatedDocuments entityType and documentType
 */
const documentTypeMapping: Record<
  DocumentType,
  { entityType: string; documentType: string; module: string }
> = {
  PR: { entityType: "purchase_request", documentType: "PR_PDF", module: "procurement" },
  RFQ: { entityType: "purchase_request", documentType: "RFQ_PDF", module: "procurement" },
  PO: { entityType: "purchase_request", documentType: "PO_PDF", module: "procurement" },
  GRN: { entityType: "purchase_request", documentType: "GRN_PDF", module: "procurement" },
  DELIVERY: { entityType: "purchase_request", documentType: "DELIVERY_PDF", module: "procurement" },
  PAYMENT: { entityType: "purchase_request", documentType: "PAYMENT_PDF", module: "procurement" },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a valid PDF already exists in generatedDocuments table
 * Returns existing PDF metadata if valid, null if expired or not found
 */
async function getValidPdfMetadata(
  db: any,
  organizationId: number,
  operatingUnitId: number,
  prId: number,
  documentType: string,
  language: string = "en"
) {
  const existingPdf = await db.query.generatedDocuments.findFirst({
    where: and(
      eq(generatedDocuments.organizationId, organizationId),
      eq(generatedDocuments.operatingUnitId, operatingUnitId),
      eq(generatedDocuments.entityType, "purchase_request"),
      eq(generatedDocuments.entityId, prId),
      eq(generatedDocuments.documentType, documentType),
      eq(generatedDocuments.language, language),
      eq(generatedDocuments.isLatest, 1),
      eq(generatedDocuments.status, "active")
    ),
  });

  if (!existingPdf) {
    return null;
  }

  // Check if PDF has expired
  if (existingPdf.expiresAt) {
    const now = new Date();
    const expiresAt = new Date(existingPdf.expiresAt);
    if (now > expiresAt) {
      return null; // PDF has expired
    }
  }

  return {
    id: existingPdf.id,
    filePath: existingPdf.filePath,
    fileName: existingPdf.fileName || "",
    version: existingPdf.version || 1,
    generatedAt: existingPdf.generatedAt,
  };
}

/**
 * Save PDF metadata to generatedDocuments table
 * Automatically marks old versions as not latest
 */
async function savePdfMetadata(
  db: any,
  organizationId: number,
  operatingUnitId: number | null | undefined,
  prId: number,
  documentType: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  userId: number,
  language: string = "en"
) {
  const mapping = documentTypeMapping[documentType as DocumentType];

  // Mark old versions as not latest
  await db
    .update(generatedDocuments)
    .set({
      isLatest: 0,
    })
    .where(
      and(
        eq(generatedDocuments.organizationId, organizationId),
        eq(generatedDocuments.entityType, mapping.entityType),
        eq(generatedDocuments.entityId, prId),
        eq(generatedDocuments.documentType, mapping.documentType),
        eq(generatedDocuments.language, language),
        eq(generatedDocuments.isLatest, 1)
      )
    );

  // Get next version number
  const lastVersion = await db.query.generatedDocuments.findFirst({
    where: and(
      eq(generatedDocuments.organizationId, organizationId),
      eq(generatedDocuments.entityType, mapping.entityType),
      eq(generatedDocuments.entityId, prId),
      eq(generatedDocuments.documentType, mapping.documentType),
      eq(generatedDocuments.language, language)
    ),
    orderBy: desc(generatedDocuments.version),
  });

  const nextVersion = (lastVersion?.version || 0) + 1;

  // Insert new version
  const result = await db.insert(generatedDocuments).values({
    organizationId,
    operatingUnitId: operatingUnitId || null,
    module: mapping.module,
    entityType: mapping.entityType,
    entityId: prId,
    documentType: mapping.documentType,
    filePath,
    fileName,
    fileSize,
    mimeType: "application/pdf",
    version: nextVersion,
    isLatest: 1,
    language,
    status: "active",
    generatedBy: userId,
    generatedAt: nowSql,
  });

  return {
    id: Number((result as any).insertId || 0),
    version: nextVersion,
    filePath,
    fileName,
  };
}

/**
 * Format SQL datetime to MySQL format (YYYY-MM-DD HH:MM:SS)
 */
const formatMySqlDateTime = (dateValue?: string | Date | null): string | undefined => {
  if (!dateValue) return undefined;
  try {
    const date = new Date(dateValue);
    return date.toISOString().replace("T", " ").substring(0, 19);
  } catch {
    return undefined;
  }
};

// ============================================================================
// ROUTER PROCEDURES
// ============================================================================

export const prDocumentRouter = router({
  /**
   * Generate PR document with smart caching
   *
   * Flow:
   * 1. Check if valid PDF already exists
   * 2. If yes, return cached URL
   * 3. If no, generate new PDF
   * 4. Upload to S3
   * 5. Store metadata in generatedDocuments
   * 6. Return URL
   */
  generateDocument: scopedProcedure
    .input(
      z.object({
        prId: z.number(),
        documentType: z.enum(["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"]),
        language: z.enum(["en", "ar"]).default("en"),
      })
    )
    .mutation(async ({ ctx, input }): Promise<PdfGenerationResult> => {
      try {
        const db = await getDb();
        const { prId, documentType, language } = input;

        // ====================================================================
        // STEP 1: Verify PR exists and belongs to user's org/ou
        // ====================================================================
        const pr = await db.query.purchaseRequests.findFirst({
          where: and(
            eq(purchaseRequests.id, prId),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          ),
        });

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        // ====================================================================
        // STEP 2: Check if valid PDF already exists (SMART CACHING)
        // ====================================================================
        const existingPdf = await getValidPdfMetadata(
          db,
          ctx.scope.organizationId,
          ctx.scope.operatingUnitId,
          prId,
          documentTypeMapping[documentType].documentType,
          language
        );

        if (existingPdf) {
          console.log(
            `[PR Document] Cache hit for PR-${pr.prNumber} (${documentType}) - Version ${existingPdf.version}`
          );
          return {
            success: true,
            documentId: existingPdf.id,
            fileName: existingPdf.fileName,
            url: existingPdf.filePath,
            version: existingPdf.version,
            isNewGeneration: false,
            message: `${documentType} document retrieved from cache (v${existingPdf.version})`,
          };
        }

        // ====================================================================
        // STEP 3: Generate new PDF
        // ====================================================================
        console.log(`[PR Document] Generating new ${documentType} PDF for PR-${pr.prNumber}`);

        const pdfBuffer = await generatePRDocument(pr, documentType, ctx.scope.organizationId);

        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate PDF",
          });
        }

        // ====================================================================
        // STEP 4: Upload to S3
        // ====================================================================
        const fileName = `PR-${pr.prNumber}-${documentType}-${language}-${Date.now()}.pdf`;
        const fileKey = `procurement/${ctx.scope.organizationId}/${ctx.scope.operatingUnitId}/pr-${prId}/${fileName}`;

        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

        console.log(`[PR Document] PDF uploaded to S3: ${url}`);

        // ====================================================================
        // STEP 5: Store metadata in generatedDocuments table
        // ====================================================================
        const metadata = await savePdfMetadata(
          db,
          ctx.scope.organizationId,
          ctx.scope.operatingUnitId,
          prId,
          documentTypeMapping[documentType].documentType,
          url,
          fileName,
          pdfBuffer.length,
          ctx.user.id,
          language
        );

        console.log(
          `[PR Document] Metadata synced to generatedDocuments (ID: ${metadata.id}, Version: ${metadata.version})`
        );

        return {
          success: true,
          documentId: metadata.id,
          fileName: metadata.fileName,
          url: metadata.filePath,
          version: metadata.version,
          isNewGeneration: true,
          message: `${documentType} document generated successfully (v${metadata.version})`,
        };
      } catch (error) {
        console.error("[PR Document] Error generating document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate PR document",
        });
      }
    }),

  /**
   * Get all document versions for a PR
   */
  getPRDocumentVersions: scopedProcedure
    .input(
      z.object({
        prId: z.number(),
        documentType: z.enum(["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"]),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId, documentType } = input;

        // Verify PR exists
        const pr = await db.query.purchaseRequests.findFirst({
          where: and(
            eq(purchaseRequests.id, prId),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          ),
        });

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        const mapping = documentTypeMapping[documentType];

        // Get all versions
        const versions = await db.query.generatedDocuments.findMany({
          where: and(
            eq(generatedDocuments.organizationId, ctx.scope.organizationId),
            eq(generatedDocuments.entityType, mapping.entityType),
            eq(generatedDocuments.entityId, prId),
            eq(generatedDocuments.documentType, mapping.documentType)
          ),
          orderBy: desc(generatedDocuments.version),
        });

        return versions.map((v) => ({
          id: v.id,
          version: v.version,
          fileName: v.fileName,
          url: v.filePath,
          language: v.language,
          isLatest: v.isLatest === 1,
          generatedAt: v.generatedAt,
          fileSize: v.fileSize,
        }));
      } catch (error) {
        console.error("[PR Document] Error fetching versions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch document versions",
        });
      }
    }),

  /**
   * Get document generation status for a PR
   */
  getDocumentStatus: scopedProcedure
    .input(z.object({ prId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId } = input;

        // Verify PR exists
        const pr = await db.query.purchaseRequests.findFirst({
          where: and(
            eq(purchaseRequests.id, prId),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          ),
        });

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        const documentTypes: DocumentType[] = ["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"];
        const status: Record<
          string,
          { generated: boolean; version: number; isLatest: boolean; url?: string }
        > = {};

        for (const type of documentTypes) {
          const mapping = documentTypeMapping[type];
          const doc = await db.query.generatedDocuments.findFirst({
            where: and(
              eq(generatedDocuments.organizationId, ctx.scope.organizationId),
              eq(generatedDocuments.entityType, mapping.entityType),
              eq(generatedDocuments.entityId, prId),
              eq(generatedDocuments.documentType, mapping.documentType),
              eq(generatedDocuments.isLatest, 1)
            ),
          });

          status[type] = {
            generated: !!doc,
            version: doc?.version || 0,
            isLatest: doc?.isLatest === 1,
            url: doc?.filePath,
          };
        }

        return status;
      } catch (error) {
        console.error("[PR Document] Error getting status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get document status",
        });
      }
    }),

  /**
   * Delete a specific document version
   */
  deleteDocumentVersion: scopedProcedure
    .input(
      z.object({
        documentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { documentId } = input;

        // Get document
        const doc = await db.query.generatedDocuments.findFirst({
          where: eq(generatedDocuments.id, documentId),
        });

        if (!doc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }

        // Verify ownership
        if (
          doc.organizationId !== ctx.scope.organizationId ||
          doc.operatingUnitId !== ctx.scope.operatingUnitId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to delete this document",
          });
        }

        // Mark as deleted (soft delete)
        await db
          .update(generatedDocuments)
          .set({
            status: "deleted",
            updatedAt: nowSql,
          })
          .where(eq(generatedDocuments.id, documentId));

        return {
          success: true,
          message: "Document deleted successfully",
        };
      } catch (error) {
        console.error("[PR Document] Error deleting document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete document",
        });
      }
    }),

  /**
   * Invalidate cache for a PR document
   * Forces regeneration on next request
   */
  invalidateCache: scopedProcedure
    .input(
      z.object({
        prId: z.number(),
        documentType: z.enum(["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId, documentType } = input;

        // Verify PR exists
        const pr = await db.query.purchaseRequests.findFirst({
          where: and(
            eq(purchaseRequests.id, prId),
            eq(purchaseRequests.organizationId, ctx.scope.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
          ),
        });

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        // Invalidate specific document type or all
        if (documentType) {
          const mapping = documentTypeMapping[documentType];
          await db
            .update(generatedDocuments)
            .set({
              status: "invalidated",
              updatedAt: nowSql,
            })
            .where(
              and(
                eq(generatedDocuments.organizationId, ctx.scope.organizationId),
                eq(generatedDocuments.entityType, mapping.entityType),
                eq(generatedDocuments.entityId, prId),
                eq(generatedDocuments.documentType, mapping.documentType)
              )
            );

          return {
            success: true,
            message: `${documentType} document cache invalidated`,
          };
        } else {
          // Invalidate all document types for this PR
          await db
            .update(generatedDocuments)
            .set({
              status: "invalidated",
              updatedAt: nowSql,
            })
            .where(
              and(
                eq(generatedDocuments.organizationId, ctx.scope.organizationId),
                eq(generatedDocuments.entityType, "purchase_request"),
                eq(generatedDocuments.entityId, prId)
              )
            );

          return {
            success: true,
            message: "All document caches invalidated for this PR",
          };
        }
      } catch (error) {
        console.error("[PR Document] Error invalidating cache:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invalidate cache",
        });
      }
    }),
});
