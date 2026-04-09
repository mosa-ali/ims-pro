/**
 * Procurement Document Router - tRPC Procedures
 * 
 * Handles document discovery and routing for the procurement workflow
 * Automatically routes documents through 13-stage procurement lifecycle
 */

import { z } from "zod";
import { router, scopedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { documents, purchaseRequests } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  routeProcurementDocuments,
  getProcurementDocumentPath,
  procurementStatusToDocumentStage,
  getDocumentFolderKey,
} from "../services/procurementDocumentRouter";

export const procurementDocumentRouter = router({
  /**
   * Get all documents for a PR organized by procurement stage
   */
  getByPR: scopedProcedure
    .input(
      z.object({
        prId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      // Get the PR to verify access
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

      // Get all documents for this PR
      const prDocuments = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.relatedPrId, input.prId),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId)
          )
        );

      // Group documents by folder path (procurement stage)
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
        const folderKey = doc.folderPath || "01_Purchase_Requests";
        if (!stageMap.has(folderKey)) {
          stageMap.set(folderKey, {
            stage: stageNames[folderKey] || folderKey,
            folderKey,
            documents: [],
          });
        }
        stageMap.get(folderKey)!.documents.push(doc);
      }

      // Convert to array and sort by folder key
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
   * Get document discovery path for a PR
   * Shows which stages have documents and how many
   */
  getDocumentPath: scopedProcedure
    .input(
      z.object({
        prId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;

      const path = await getProcurementDocumentPath(
        input.prId,
        organizationId,
        operatingUnitId
      );

      return {
        prId: input.prId,
        documentPath: path,
      };
    }),

  /**
   * Manually trigger document routing for a PR
   * Usually called when PR procurement status changes
   */
  routeDocuments: scopedProcedure
    .input(
      z.object({
        prId: z.number(),
        procurementStatus: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify PR exists and user has access
      const db = await getDb();
      if (!db) throw new Error("Database not available");

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

      // Route documents to the new stage
      await routeProcurementDocuments(
        input.prId,
        organizationId,
        operatingUnitId,
        input.procurementStatus
      );

      return {
        success: true,
        message: `Documents routed to ${input.procurementStatus}`,
      };
    }),

  /**
   * Get procurement workflow stages with document counts
   * Used for Central Documents workspace display
   */
  getWorkflowStages: scopedProcedure
    .input(
      z.object({
        organizationId: z.number().optional(), // Ignored, uses ctx.scope
      })
    )
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      // Get all documents for this org/ou grouped by folder
      const allDocuments = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId)
          )
        );

      // Group by folder path
      const stageMap = new Map<string, number>();
      for (const doc of allDocuments) {
        const folderKey = doc.folderPath || "01_Purchase_Requests";
        stageMap.set(folderKey, (stageMap.get(folderKey) || 0) + 1);
      }

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

      // Build response with all 13 stages
      const stages = [
        "01_Purchase_Requests",
        "02_RFQ_Tender_Documents",
        "03_Bid_Opening_Minutes",
        "04_Supplier_Quotations",
        "05_Bid_Evaluation",
        "06_Competitive_Bid_Analysis",
        "07_Contracts",
        "08_Purchase_Orders",
        "09_Goods_Receipt_Notes",
        "10_Delivery_Notes",
        "11_Service_Acceptance_Certificates",
        "12_Payments",
        "13_Audit_Logs",
      ].map((folderKey) => ({
        folderKey,
        stageName: stageNames[folderKey],
        documentCount: stageMap.get(folderKey) || 0,
      }));

      return {
        organizationId,
        operatingUnitId,
        stages,
        totalDocuments: allDocuments.length,
      };
    }),

  /**
   * Get documents for a specific procurement stage
   */
  getByStage: scopedProcedure
    .input(
      z.object({
        folderKey: z.string(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      const stageDocuments = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.folderPath, input.folderKey),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId)
          )
        )
        .limit(input.limit)
        .offset(input.offset);

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

      return {
        folderKey: input.folderKey,
        stageName: stageNames[input.folderKey],
        documents: stageDocuments,
        count: stageDocuments.length,
      };
    }),
});
