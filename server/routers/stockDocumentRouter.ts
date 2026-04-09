import { z } from "zod";
import { getDb } from "../db";
import { documents } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, scopedProcedure } from "../_core/trpc";

// Stock document stages based on inventory lifecycle
const STOCK_DOCUMENT_STAGES = {
  STOCK_RECEIPT: "01_Stock_Receipt",
  STOCK_MOVEMENT: "02_Stock_Movement",
  STOCK_ADJUSTMENT: "03_Stock_Adjustment",
  STOCK_DISPOSAL: "04_Stock_Disposal",
  INVENTORY_REPORTS: "05_Inventory_Reports",
} as const;

// Stage names for display
const STOCK_STAGE_NAMES: Record<string, Record<string, string>> = {
  "01_Stock_Receipt": {
    en: "Stock Receipt",
    ar: "استقبال المخزون",
  },
  "02_Stock_Movement": {
    en: "Stock Movement",
    ar: "حركة المخزون",
  },
  "03_Stock_Adjustment": {
    en: "Stock Adjustment",
    ar: "تعديل المخزون",
  },
  "04_Stock_Disposal": {
    en: "Stock Disposal",
    ar: "التخلص من المخزون",
  },
  "05_Inventory_Reports": {
    en: "Inventory Reports",
    ar: "تقارير المخزون",
  },
};

export const stockDocumentRouter = router({
  // Get all stock document workflow stages
  getWorkflowStages: scopedProcedure.query(async ({ ctx }) => {
    try {
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
            eq(documents.operatingUnitId, operatingUnitId),
            eq(documents.workspace, "logistics")
          )
        );

      // Group by folder code
      const stageMap = new Map<string, number>();
      for (const doc of allDocuments) {
        const folderKey = doc.folderCode || "01_Stock_Receipt";
        // Only count stock-related documents
        if (folderKey.startsWith("01_") || folderKey.startsWith("02_") || 
            folderKey.startsWith("03_") || folderKey.startsWith("04_") || 
            folderKey.startsWith("05_")) {
          stageMap.set(folderKey, (stageMap.get(folderKey) || 0) + 1);
        }
      }

      // Build response with all stock stages
      const stages = Object.values(STOCK_DOCUMENT_STAGES).map((stage) => ({
        stage,
        documentCount: stageMap.get(stage) || 0,
      }));

      return stages;
    } catch (error) {
      console.error('[stockDocumentRouter.getWorkflowStages] Error:', error);
      throw error;
    }
  }),

  // Get inventory statistics stage
  getByStage: scopedProcedure
    .input(z.object({ stage: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      const stageDocuments = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.folderCode, input.stage),
            eq(documents.organizationId, organizationId),
            eq(documents.operatingUnitId, operatingUnitId),
            eq(documents.workspace, "logistics")
          )
        );

      return {
        stage: input.stage,
        stageName: STOCK_STAGE_NAMES[input.stage as keyof typeof STOCK_STAGE_NAMES] || { en: input.stage, ar: input.stage },
        documents: stageDocuments,
        count: stageDocuments.length,
      };
    }),
});
