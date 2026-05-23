/**
 * Procurement Document Router - tRPC Procedures (FIXED)
 * Handles document discovery, routing, and generation for the procurement workflow
 * Integrates smart caching with existing PDF generators
 */

import { z } from "zod";
import { router, scopedProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { documents, purchaseRequests, generatedDocuments } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import { generatePDF } from "../services/pdf/templates/logistics/prPdfGenerator";
import { generateRFQPDF } from "../services/pdf/templates/logistics/rfqPdfGenerator";
import { generatePurchaseOrderPDF } from "../services/pdf/templates/logistics/poGeneratePDF";
import { generateGRNPDF } from "../services/pdf/templates/logistics/grnPDFGenerator";

// ✅ FIXED: Proper mapping from input type to database type
const documentTypeMap = {
  PR: "PR_PDF",
  RFQ: "RFQ_PDF",
  PO: "PO_PDF",
  GRN: "GRN_PDF",
  DELIVERY: "DELIVERY_PDF",
  PAYMENT: "PAYMENT_PDF",
} as const;

// ✅ ADDED: Helper to format dates correctly for MySQL
const formatMySqlDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

export const procurementDocumentRouter = router({
  /**
   * Get all documents for a PR organized by procurement stage
   */
  getByPR: scopedProcedure
    .input(z.object({ prId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      const [pr] = await db
        .select()
        .from(purchaseRequests)
        .where(
          and(
            eq(purchaseRequests.id, input.prId),
            eq(purchaseRequests.organizationId, organizationId),
            eq(purchaseRequests.operatingUnitId, operatingUnitId)
          )
        );

      if (!pr) {
        throw new Error("Purchase Request not found");
      }

      const prDocuments = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.entityId, String(input.prId)),
            eq(documents.entityType, "purchase_request"),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId)
          )
        );

      const stageMap = new Map<
        string,
        {
          stage: string;
          folderKey: string;
          documents: typeof prDocuments;
        }
      >();

      const stageNames: Record<string, string> = {
        "01_Purchase_Requests": "Purchase Requests",
        "02_RFQ_Tender_Documents": "RFQ / Tender Documents",
        "03_Bid_Opening_Minutes": "Bid Opening Minutes",
        "04_Supplier_Quotations": "Supplier Quotations / Offer Matrix",
        "05_Bid_Evaluation": "Bid Evaluation",
        "06_Competitive_Bid_Analysis": "Quotation Analysis / Competitive Bid Analysis",
        "07_Contracts": "Contracts",
        "08_Purchase_Orders": "Purchase Orders",
        "09_Goods_Receipt_Notes": "Goods Receipt Notes",
        "10_Delivery_Notes": "Delivery Notes",
        "11_Service_Acceptance_Certificates": "Service Acceptance Certificates",
        "12_Payments": "Payments / Supporting Finance Documents",
        "13_Audit_Logs": "Audit Logs / Supporting Attachments",
      };

      for (const doc of prDocuments) {
        const folderKey = "01_Purchase_Requests";
        if (!stageMap.has(folderKey)) {
          stageMap.set(folderKey, {
            stage: stageNames[folderKey] || folderKey,
            folderKey,
            documents: [],
          });
        }
        stageMap.get(folderKey)!.documents.push(doc);
      }

      const stages = Array.from(stageMap.values()).sort((a, b) => {
        const aNum = parseInt(a.folderKey.split("_")[0]);
        const bNum = parseInt(b.folderKey.split("_")[0]);
        return aNum - bNum;
      });

      return {
        prId: input.prId,
        prNumber: pr.prNumber,
        procurementStatus: pr.procurementStatus,
        stages,
        totalDocuments: prDocuments.length,
      };
    }),

  /**
   * Generate procurement document with smart caching
   * Checks cache before generating, uses existing PDF generators
   */
  generateDocument: scopedProcedure
    .input(
      z.object({
        prId: z.number(),
        documentType: z.enum(["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"]),
        language: z.enum(["en", "ar"]).default("en"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId, documentType, language } = input;

        // ✅ FIXED: Get mapped type for database queries
        const mappedDocumentType = documentTypeMap[documentType];

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
          .then((rows) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        // ✅ FIXED: Check cache with entityType filter
        const existingPdf = await db
          .select()
          .from(generatedDocuments)
          .where(
            and(
              eq(generatedDocuments.organizationId, ctx.scope.organizationId),
              eq(generatedDocuments.operatingUnitId, ctx.scope.operatingUnitId),
              eq(generatedDocuments.entityType, "purchase_request"),  // ✅ ADDED
              eq(generatedDocuments.entityId, prId),
              eq(generatedDocuments.documentType, mappedDocumentType),  // ✅ FIXED: Use mapped type
              eq(generatedDocuments.language, language),
              eq(generatedDocuments.isLatest, 1),
              eq(generatedDocuments.status, "active")
            )
          )
          .then((rows) => rows[0]);

        if (existingPdf) {
          // Check expiration
          if (existingPdf.expiresAt) {
            const now = new Date();
            const expiresAt = new Date(existingPdf.expiresAt);
            if (now <= expiresAt) {
              console.log(
                `[Procurement] Cache hit for ${documentType} v${existingPdf.version}`
              );
              return {
                success: true,
                documentId: existingPdf.id,
                fileName: existingPdf.fileName || "",
                url: existingPdf.filePath,
                version: existingPdf.version || 1,
                isNewGeneration: false,
                message: `${documentType} retrieved from cache (v${existingPdf.version || 1})`,
              };
            }
          } else {
            console.log(
              `[Procurement] Cache hit for ${documentType} v${existingPdf.version}`
            );
            return {
              success: true,
              documentId: existingPdf.id,
              fileName: existingPdf.fileName || "",
              url: existingPdf.filePath,
              version: existingPdf.version || 1,
              isNewGeneration: false,
              message: `${documentType} retrieved from cache (v${existingPdf.version || 1})`,
            };
          }
        }

        // Generate new PDF
        console.log(
          `[Procurement] Generating ${documentType} for PR-${pr.prNumber}`
        );

        let pdfResult: { buffer: Buffer; fileName: string } | null = null;

        // ✅ FIXED: Call appropriate generator and extract buffer
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

        // Upload to S3
        const fileName = `${documentType}-${pr.prNumber}-${language}-${Date.now()}.pdf`;
        const fileKey = `procurement/${ctx.scope.organizationId}/${ctx.scope.operatingUnitId}/${documentType.toLowerCase()}-${prId}/${fileName}`;

        const { url } = await storagePut(fileKey, pdfResult.buffer, "application/pdf");

        // ✅ FIXED: Mark old versions as not latest with correct filters
        await db
          .update(generatedDocuments)
          .set({ isLatest: 0 })
          .where(
            and(
              eq(generatedDocuments.organizationId, ctx.scope.organizationId),
              eq(generatedDocuments.entityType, "purchase_request"),  // ✅ ADDED
              eq(generatedDocuments.entityId, prId),
              eq(generatedDocuments.documentType, mappedDocumentType),  // ✅ FIXED
              eq(generatedDocuments.language, language),
              eq(generatedDocuments.isLatest, 1)
            )
          );

        // ✅ FIXED: Get next version with correct filters
        const lastVersion = await db
          .select()
          .from(generatedDocuments)
          .where(
            and(
              eq(generatedDocuments.organizationId, ctx.scope.organizationId),
              eq(generatedDocuments.entityType, "purchase_request"),  // ✅ ADDED
              eq(generatedDocuments.entityId, prId),
              eq(generatedDocuments.documentType, mappedDocumentType),  // ✅ FIXED
              eq(generatedDocuments.language, language)
            )
          )
          .orderBy(desc(generatedDocuments.version))
          .then((rows) => rows[0]);

        const nextVersion = (lastVersion?.version || 0) + 1;

        // ✅ FIXED: Insert with all required fields and correct values
        const result = await db.insert(generatedDocuments).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          module: "procurement",
          entityType: "purchase_request",  // ✅ ADDED
          entityId: prId,
          documentType: mappedDocumentType,  // ✅ FIXED: Store mapped type
          filePath: url,
          fileName,
          fileSize: pdfResult.buffer.length,
          mimeType: "application/pdf",
          version: nextVersion,
          isLatest: 1,
          language,
          status: "active",
          generatedBy: ctx.user.id,
          generatedAt: formatMySqlDateTime(new Date()),  // ✅ FIXED: MySQL format
        });

        console.log(
          `[Procurement] Generated ${documentType} v${nextVersion}`
        );

        return {
          success: true,
          documentId: Number((result as any).insertId || 0),
          fileName,
          url,
          version: nextVersion,
          isNewGeneration: true,
          message: `${documentType} generated successfully (v${nextVersion})`,
        };
      } catch (error) {
        console.error("[Procurement] Generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate document",
        });
      }
    }),

  /**
   * Get all document versions for a PR
   */
  getDocumentVersions: scopedProcedure
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

        const mappedDocumentType = documentTypeMap[documentType];

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
          .then((rows) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        const versions = await db
          .select()
          .from(generatedDocuments)
          .where(
            and(
              eq(generatedDocuments.organizationId, ctx.scope.organizationId),
              eq(generatedDocuments.entityType, "purchase_request"),  // ✅ ADDED
              eq(generatedDocuments.entityId, prId),
              eq(generatedDocuments.documentType, mappedDocumentType)  // ✅ FIXED
            )
          )
          .orderBy(desc(generatedDocuments.version));

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
        console.error("[Procurement] Error fetching versions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch document versions",
        });
      }
    }),

  /**
   * Get generation status for all document types
   */
  getAllDocumentsStatus: scopedProcedure
    .input(z.object({ prId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId } = input;

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
          .then((rows) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        const documentTypes = ["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"] as const;
        const status: Record<
          string,
          {
            generated: boolean;
            version: number;
            isLatest: boolean;
            url?: string;
            generatedAt?: string;
          }
        > = {};

        for (const type of documentTypes) {
          const mappedType = documentTypeMap[type];
          const doc = await db
            .select()
            .from(generatedDocuments)
            .where(
              and(
                eq(generatedDocuments.organizationId, ctx.scope.organizationId),
                eq(generatedDocuments.entityType, "purchase_request"),  // ✅ ADDED
                eq(generatedDocuments.entityId, prId),
                eq(generatedDocuments.documentType, mappedType),  // ✅ FIXED
                eq(generatedDocuments.isLatest, 1)
              )
            )
            .then((rows) => rows[0]);

          status[type] = {
            generated: !!doc,
            version: doc?.version || 0,
            isLatest: doc?.isLatest === 1,
            url: doc?.filePath,
            generatedAt: doc?.generatedAt,
          };
        }

        return status;
      } catch (error) {
        console.error("[Procurement] Error getting status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get document status",
        });
      }
    }),

  /**
   * Invalidate cache for a document
   */
  invalidateCache: scopedProcedure
    .input(
      z.object({
        prId: z.number(),
        documentType: z
          .enum(["PR", "RFQ", "PO", "GRN", "DELIVERY", "PAYMENT"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const { prId, documentType } = input;

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
          .then((rows) => rows[0]);

        if (!pr) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase request not found",
          });
        }

        if (documentType) {
          const mappedType = documentTypeMap[documentType];
          await db
            .update(generatedDocuments)
            .set({
              status: "invalidated",
              updatedAt: formatMySqlDateTime(new Date()),  // ✅ FIXED
            })
            .where(
              and(
                eq(generatedDocuments.organizationId, ctx.scope.organizationId),
                eq(generatedDocuments.entityType, "purchase_request"),  // ✅ ADDED
                eq(generatedDocuments.entityId, prId),
                eq(generatedDocuments.documentType, mappedType)  // ✅ FIXED
              )
            );

          return {
            success: true,
            message: `${documentType} cache invalidated`,
          };
        } else {
          await db
            .update(generatedDocuments)
            .set({
              status: "invalidated",
              updatedAt: formatMySqlDateTime(new Date()),  // ✅ FIXED
            })
            .where(
              and(
                eq(generatedDocuments.organizationId, ctx.scope.organizationId),
                eq(generatedDocuments.entityType, "purchase_request"),  // ✅ ADDED
                eq(generatedDocuments.entityId, prId)
              )
            );

          return {
            success: true,
            message: "All document caches invalidated",
          };
        }
      } catch (error) {
        console.error("[Procurement] Error invalidating cache:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invalidate cache",
        });
      }
    }),
});