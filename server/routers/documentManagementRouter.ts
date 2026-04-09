import { router, scopedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { documents, documentAuditLogs, purchaseRequests } from '../../drizzle/schema';
import { storagePut, storageGet } from '../storage';
import { getStorageProvider } from '../services/storageProvider';

export const documentManagementRouter = router({
  /**
   * Upload document with automatic stage routing based on PR procurement status
   */
  uploadDocument: scopedProcedure
    .input(z.object({
      prId: z.string().min(1),
      fileName: z.string().min(1),
      fileSize: z.number().positive().max(100 * 1024 * 1024), // 100MB max
      mimeType: z.string(),
      fileBuffer: z.instanceof(Uint8Array),
      documentType: z.enum([
        'purchase_request',
        'rfq_document',
        'bid_opening_minutes',
        'supplier_quotation',
        'bid_evaluation',
        'competitive_bid_analysis',
        'contract',
        'purchase_order',
        'goods_receipt_note',
        'delivery_note',
        'service_acceptance_certificate',
        'payment_document',
        'audit_log'
      ]),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Get PR to determine current procurement status
        const pr = await db.query.purchaseRequests.findFirst({
          where: and(
            eq(purchaseRequests.id, input.prId),
            eq(purchaseRequests.organizationId, ctx.user.organizationId),
            eq(purchaseRequests.operatingUnitId, ctx.user.operatingUnitId),
            isNull(purchaseRequests.deletedAt)
          ),
        });

        if (!pr) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Purchase request not found',
          });
        }

        // Determine document stage based on PR procurement status
        const stageMapping: Record<string, string> = {
          'draft': '01_Purchase_Requests',
          'submitted': '01_Purchase_Requests',
          'validated_by_logistic': '01_Purchase_Requests',
          'validated_by_finance': '01_Purchase_Requests',
          'approved': '01_Purchase_Requests',
          'rfqs': '02_RFQ_Tender_Documents',
          'quotations_analysis': '04_Supplier_Quotations',
          'tender_invitation': '02_RFQ_Tender_Documents',
          'bids_analysis': '05_Bid_Evaluation',
          'purchase_order': '08_Purchase_Orders',
          'delivery': '10_Delivery_Notes',
          'grn': '09_Goods_Receipt_Notes',
          'payment': '12_Payments',
          'completed': '13_Audit_Logs',
        };

        const documentStage = stageMapping[pr.procurementStatus || 'draft'] || '01_Purchase_Requests';

        // Upload file to storage provider
        const fileKey = `procurement/${ctx.user.organizationId}/${pr.id}/${documentStage}/${Date.now()}-${input.fileName}`;
        
        const { url } = await storagePut(fileKey, Buffer.from(input.fileBuffer), input.mimeType);

        // Create document record
        const documentId = crypto.randomUUID();
        await db.insert(documents).values({
          id: documentId,
          prId: input.prId,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          fileUrl: url,
          fileKey,
          documentType: input.documentType,
          documentStage,
          description: input.description || null,
          tags: input.tags?.join(',') || null,
          version: 1,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name || ctx.user.email,
          updatedBy: ctx.user.id,
          updatedByName: ctx.user.name || ctx.user.email,
          organizationId: ctx.user.organizationId,
          operatingUnitId: ctx.user.operatingUnitId,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          deletedBy: null,
          deletedByName: null,
          storageProvider: 's3', // Default to S3, can be overridden
          complianceClassification: 'internal',
          retentionDays: 2555, // 7 years default
          isArchived: false,
          metadata: JSON.stringify({
            uploadedVia: 'ui',
            originalSize: input.fileSize,
            uploadedAt: new Date().toISOString(),
          }),
        });

        // Log audit trail
        await db.insert(documentAuditLogs).values({
          id: crypto.randomUUID(),
          documentId,
          action: 'created',
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email,
          description: `Document uploaded: ${input.fileName}`,
          metadata: JSON.stringify({
            fileSize: input.fileSize,
            mimeType: input.mimeType,
            documentStage,
            procurementStatus: pr.procurementStatus,
          }),
          organizationId: ctx.user.organizationId,
          operatingUnitId: ctx.user.operatingUnitId,
          createdAt: new Date(),
        });

        return {
          id: documentId,
          fileName: input.fileName,
          fileUrl: url,
          documentStage,
          uploadedAt: new Date(),
        };
      } catch (error) {
        console.error('Document upload error:', error);
        throw error;
      }
    }),

  /**
   * Download document with access logging
   */
  downloadDocument: scopedProcedure
    .input(z.object({
      documentId: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        const document = await db.query.documents.findFirst({
          where: and(
            eq(documents.id, input.documentId),
            eq(documents.organizationId, ctx.user.organizationId),
            eq(documents.operatingUnitId, ctx.user.operatingUnitId),
            isNull(documents.deletedAt)
          ),
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Log access
        await db.insert(documentAuditLogs).values({
          id: crypto.randomUUID(),
          documentId: input.documentId,
          action: 'downloaded',
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email,
          description: `Document downloaded: ${document.fileName}`,
          metadata: JSON.stringify({
            fileSize: document.fileSize,
            mimeType: document.mimeType,
          }),
          organizationId: ctx.user.organizationId,
          operatingUnitId: ctx.user.operatingUnitId,
          createdAt: new Date(),
        });

        // Generate presigned URL for download
        const downloadUrl = await storageGet(document.fileKey, 3600); // 1 hour expiry

        return {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          downloadUrl: downloadUrl.url,
          createdAt: document.createdAt,
        };
      } catch (error) {
        console.error('Document download error:', error);
        throw error;
      }
    }),

  /**
   * Get all documents for a PR organized by stage
   */
  getDocumentsByPR: scopedProcedure
    .input(z.object({
      prId: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        const docs = await db.query.documents.findMany({
          where: and(
            eq(documents.prId, input.prId),
            eq(documents.organizationId, ctx.user.organizationId),
            eq(documents.operatingUnitId, ctx.user.operatingUnitId),
            isNull(documents.deletedAt)
          ),
          orderBy: [desc(documents.createdAt)],
        });

        // Group by stage
        const byStage: Record<string, typeof docs> = {};
        docs.forEach(doc => {
          if (!byStage[doc.documentStage]) {
            byStage[doc.documentStage] = [];
          }
          byStage[doc.documentStage].push(doc);
        });

        return {
          total: docs.length,
          byStage,
          documents: docs,
        };
      } catch (error) {
        console.error('Get documents error:', error);
        throw error;
      }
    }),

  /**
   * Delete document (soft delete)
   */
  deleteDocument: scopedProcedure
    .input(z.object({
      documentId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        const document = await db.query.documents.findFirst({
          where: and(
            eq(documents.id, input.documentId),
            eq(documents.organizationId, ctx.user.organizationId),
            eq(documents.operatingUnitId, ctx.user.operatingUnitId),
            isNull(documents.deletedAt)
          ),
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Soft delete
        await db.update(documents)
          .set({
            deletedAt: new Date(),
            deletedBy: ctx.user.id,
            deletedByName: ctx.user.name || ctx.user.email,
          })
          .where(eq(documents.id, input.documentId));

        // Log audit trail
        await db.insert(documentAuditLogs).values({
          id: crypto.randomUUID(),
          documentId: input.documentId,
          action: 'deleted',
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email,
          description: `Document deleted: ${document.fileName}`,
          metadata: JSON.stringify({
            fileSize: document.fileSize,
            mimeType: document.mimeType,
          }),
          organizationId: ctx.user.organizationId,
          operatingUnitId: ctx.user.operatingUnitId,
          createdAt: new Date(),
        });

        return { success: true };
      } catch (error) {
        console.error('Document delete error:', error);
        throw error;
      }
    }),

  /**
   * Get document statistics for a PR
   */
  getDocumentStats: scopedProcedure
    .input(z.object({
      prId: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        const docs = await db.query.documents.findMany({
          where: and(
            eq(documents.prId, input.prId),
            eq(documents.organizationId, ctx.user.organizationId),
            eq(documents.operatingUnitId, ctx.user.operatingUnitId),
            isNull(documents.deletedAt)
          ),
        });

        const totalSize = docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
        const byType: Record<string, number> = {};
        const byStage: Record<string, number> = {};

        docs.forEach(doc => {
          byType[doc.documentType] = (byType[doc.documentType] || 0) + 1;
          byStage[doc.documentStage] = (byStage[doc.documentStage] || 0) + 1;
        });

        return {
          totalDocuments: docs.length,
          totalSize,
          totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
          byType,
          byStage,
        };
      } catch (error) {
        console.error('Get document stats error:', error);
        throw error;
      }
    }),
});
