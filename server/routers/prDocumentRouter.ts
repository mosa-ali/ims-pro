import { scopedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  generatedDocuments,
  purchaseRequests,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import { generatePDF } from "../services/pdf/templates/logistics/prPdfGenerator";
import { generateRFQPDF } from "../services/pdf/templates/logistics/rfqPdfGenerator";
import { generatePurchaseOrderPDF } from "../services/pdf/templates/logistics/poGeneratePDF";
import { generateGRNPDF } from "../services/pdf/templates/logistics/grnPDFGenerator"; 
import { TRPCError } from "@trpc/server";

/**
 * ============================================================================
 * PR DOCUMENT ROUTER - INTEGRATED WITH CENTRAL PDF SERVICE
 * ============================================================================
 *
 * Handles intelligent document generation with:
 * ✅ Smart caching - Check generatedDocuments table first
 * ✅ Automatic syncing - Store metadata after generation
 * ✅ Versioning - Track document versions automatically
 * ✅ Multi-language support - Generate EN/AR PDFs
 * ✅ Data isolation - Enforce OU/Org boundaries
 */

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
 * Map document types to database types and generator functions
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

/**
 * Helper to format dates for MySQL
 */
const formatMySqlDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Check if a valid PDF already exists in generatedDocuments table
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

  // Check expiration
  if (existingPdf.expiresAt) {
    const now = new Date();
    const expiresAt = new Date(existingPdf.expiresAt);
    if (now > expiresAt) {
      return null; // Expired
    }
  }

  return existingPdf;
}

/**
 * Save PDF metadata to generatedDocuments table
 */
async function savePdfMetadata(
  db: any,
  organizationId: number,
  operatingUnitId: number,
  prId: number,
  documentType: string,
  url: string,
  fileName: string,
  fileSize: number,
  userId: number,
  language: string = "en"
) {
  // Mark old versions as not latest
  await db
    .update(generatedDocuments)
    .set({ isLatest: 0 })
    .where(
      and(
        eq(generatedDocuments.organizationId, organizationId),
        eq(generatedDocuments.operatingUnitId, operatingUnitId),
        eq(generatedDocuments.entityType, "purchase_request"),
        eq(generatedDocuments.entityId, prId),
        eq(generatedDocuments.documentType, documentType),
        eq(generatedDocuments.language, language),
        eq(generatedDocuments.isLatest, 1)
      )
    );

  // Get next version
  const lastVersion = await db.query.generatedDocuments.findFirst({
    where: and(
      eq(generatedDocuments.organizationId, organizationId),
      eq(generatedDocuments.operatingUnitId, operatingUnitId),
      eq(generatedDocuments.entityType, "purchase_request"),
      eq(generatedDocuments.entityId, prId),
      eq(generatedDocuments.documentType, documentType),
      eq(generatedDocuments.language, language)
    ),
    orderBy: desc(generatedDocuments.version),
  });

  const nextVersion = (lastVersion?.version || 0) + 1;

  // Insert new document record
  const result = await db.insert(generatedDocuments).values({
    organizationId,
    operatingUnitId,
    module: "procurement",
    entityType: "purchase_request",
    entityId: prId,
    documentType,
    filePath: url,
    fileName,
    fileSize,
    mimeType: "application/pdf",
    version: nextVersion,
    isLatest: 1,
    language,
    status: "active",
    generatedBy: userId,
    generatedAt: formatMySqlDateTime(new Date()),
  });

  return {
    id: (result as any).insertId || 0,
    fileName,
    filePath: url,
    version: nextVersion,
  };
}

// ============================================================================
// ROUTER PROCEDURES
// ============================================================================

export const prDocumentRouter = router({
  /**
   * Generate PR document with smart caching
   * 
   * FLOW:
   * 1. Check if valid PDF already exists
   * 2. If yes, return cached URL
   * 3. If no, generate new PDF
   * 4. Upload to S3
   * 5. Store metadata in generatedDocuments
   * 6. Return URL
   */
  generatePRDocument: scopedProcedure
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
        const pr = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, prId),
              eq(purchaseRequests.organizationId, ctx.scope.organizationId),
              eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
            )
          )
          .then((rows: any[]) => rows[0]);

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
            fileName: existingPdf.fileName || "",
            url: existingPdf.filePath,
            version: existingPdf.version || 1,
            isNewGeneration: false,
            message: `${documentType} document retrieved from cache (v${existingPdf.version})`,
          };
        }

        // ====================================================================
        // STEP 3: Generate new PDF
        // ====================================================================
        console.log(`[PR Document] Generating new ${documentType} PDF for PR-${pr.prNumber}`);

        let pdfResult: { buffer: Buffer; fileName: string } | null = null;

        // Call appropriate generator based on document type
        // ✅ FIXED: Generators return { buffer, fileName }
        if (documentType === "PR") {
          pdfResult = await generatePDF(pr as any);
        } else if (documentType === "RFQ") {
          pdfResult = await generateRFQPDF(pr as any);
        } else if (documentType === "PO") {
          pdfResult = await generatePurchaseOrderPDF(pr as any);
        } else if (documentType === "GRN") {
          pdfResult = await generateGRNPDF(pr as any);
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Document type ${documentType} not yet supported`,
          });
        }

        if (!pdfResult || !pdfResult.buffer || pdfResult.buffer.length === 0) {
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

        const { url } = await storagePut(fileKey, pdfResult.buffer, "application/pdf");

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
          pdfResult.buffer.length,
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
        throw error;
      }
    }),

  /**
   * Get all document versions for a PR
   */
  getPRDocumentVersions: scopedProcedure
    .input(z.object({ prId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId } = input;

        // Verify PR exists
        const pr = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, prId),
              eq(purchaseRequests.organizationId, ctx.scope.organizationId),
              eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
            )
          )
          .then((rows: any[]) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        const versions = await db.query.generatedDocuments.findMany({
          where: and(
            eq(generatedDocuments.organizationId, ctx.scope.organizationId),
            eq(generatedDocuments.operatingUnitId, ctx.scope.operatingUnitId),
            eq(generatedDocuments.entityType, "purchase_request"),
            eq(generatedDocuments.entityId, prId)
          ),
          orderBy: desc(generatedDocuments.version),
        });

        return versions.map((v: any) => ({
          id: v.id,
          documentType: v.documentType,
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
   * Get document status for a PR
   */
  getDocumentStatus: scopedProcedure
    .input(z.object({ prId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId } = input;

        // Verify PR exists
        const pr = await db
          .select()
          .from(purchaseRequests)
          .where(
            and(
              eq(purchaseRequests.id, prId),
              eq(purchaseRequests.organizationId, ctx.scope.organizationId),
              eq(purchaseRequests.operatingUnitId, ctx.scope.operatingUnitId)
            )
          )
          .then((rows: any[]) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        const documentTypes: DocumentType[] = ["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"];
        const status: Record<string, { generated: boolean; version: number; isLatest: boolean; url?: string }> = {};

        for (const type of documentTypes) {
          const mapping = documentTypeMapping[type];
          const doc = await db.query.generatedDocuments.findFirst({
            where: and(
              eq(generatedDocuments.organizationId, ctx.scope.organizationId),
              eq(generatedDocuments.operatingUnitId, ctx.scope.operatingUnitId),
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
});
