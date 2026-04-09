import { z } from "zod";
import { getDb } from "../db";
import { documents } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, scopedProcedure } from "../_core/trpc";

// Vendor document stages based on vendor lifecycle
const VENDOR_DOCUMENT_STAGES = {
  VENDOR_REGISTRATION: "01_Vendor_Registration",
  COMPLIANCE_DOCUMENTS: "02_Compliance_Documents",
  PERFORMANCE_REPORTS: "03_Performance_Reports",
  CONTRACTS: "04_Contracts",
  PAYMENT_RECORDS: "05_Payment_Records",
} as const;

// Stage names for display
const VENDOR_STAGE_NAMES: Record<string, Record<string, string>> = {
  "01_Vendor_Registration": {
    en: "Vendor Registration",
    ar: "تسجيل المورد",
  },
  "02_Compliance_Documents": {
    en: "Compliance Documents",
    ar: "وثائق الامتثال",
  },
  "03_Performance_Reports": {
    en: "Performance Reports",
    ar: "تقارير الأداء",
  },
  "04_Contracts": {
    en: "Contracts",
    ar: "العقود",
  },
  "05_Payment_Records": {
    en: "Payment Records",
    ar: "سجلات الدفع",
  },
};

export const vendorDocumentRouter = router({
  // Get all vendor document workflow stages
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
        const folderKey = doc.folderCode || "01_Vendor_Registration";
        // Only count vendor-related documents
        if (folderKey.startsWith("01_") || folderKey.startsWith("02_") || 
            folderKey.startsWith("03_") || folderKey.startsWith("04_") || 
            folderKey.startsWith("05_")) {
          stageMap.set(folderKey, (stageMap.get(folderKey) || 0) + 1);
        }
      }

      // Build response with all vendor stages
      const stages = Object.values(VENDOR_DOCUMENT_STAGES).map((stage) => ({
        stage,
        documentCount: stageMap.get(stage) || 0,
      }));

      return stages;
    } catch (error) {
      console.error('[vendorDocumentRouter.getWorkflowStages] Error:', error);
      throw error;
    }
  }),

  // Get documents by specific stage
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
        stageName: VENDOR_STAGE_NAMES[input.stage as keyof typeof VENDOR_STAGE_NAMES] || { en: input.stage, ar: input.stage },
        documents: stageDocuments,
        count: stageDocuments.length,
      };
    }),
});
