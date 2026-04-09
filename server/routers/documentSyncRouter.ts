import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  syncPRDocumentsToCentral,
  syncDocumentsForPayment,
  getPRDocumentSyncStatus,
} from "../_core/documentSyncScheduler";

export const documentSyncRouter = router({
  /**
   * Manually trigger document sync for a PR
   */
  syncPRDocuments: protectedProcedure
    .input(z.object({ prId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await syncPRDocumentsToCentral(
          input.prId,
          ctx.user.organizationId
        );

        return {
          success: result.failed === 0,
          synced: result.synced,
          failed: result.failed,
          errors: result.errors,
        };
      } catch (error) {
        console.error("[DocumentSync] Error in syncPRDocuments:", error);
        return {
          success: false,
          synced: 0,
          failed: 0,
          errors: [(error as Error).message],
        };
      }
    }),

  /**
   * Sync documents for a specific payment
   */
  syncPaymentDocuments: protectedProcedure
    .input(z.object({ paymentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const success = await syncDocumentsForPayment(input.paymentId);

        return {
          success,
          message: success
            ? "Documents synced successfully"
            : "No documents to sync or payment not in paid status",
        };
      } catch (error) {
        console.error("[DocumentSync] Error in syncPaymentDocuments:", error);
        return {
          success: false,
          message: (error as Error).message,
        };
      }
    }),

  /**
   * Get sync status for a PR
   */
  getPRSyncStatus: protectedProcedure
    .input(z.object({ prId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const status = await getPRDocumentSyncStatus(input.prId);

        return {
          ...status,
          syncPercentage:
            status.total > 0
              ? Math.round((status.synced / status.total) * 100)
              : 0,
        };
      } catch (error) {
        console.error("[DocumentSync] Error in getPRSyncStatus:", error);
        return {
          total: 0,
          pending: 0,
          synced: 0,
          error: 0,
          syncPercentage: 0,
        };
      }
    }),
});
