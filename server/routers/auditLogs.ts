import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getAuditLogs, getAuditLogsCount, getRecentAuditLogs, deleteOldAuditLogs, getAuditLogRetentionStats } from "../db";

/**
 * Audit Logs Router (Platform Admin Only)
 * 
 * Provides access to platform-level audit trail.
 * Only platform admins can view audit logs.
 */

export const auditLogsRouter = router({
  /**
   * Get audit logs with filtering and pagination
   */
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        userId: z.number().optional(),
        organizationId: z.number().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const logs = await getAuditLogs(input);
      const total = await getAuditLogsCount(input);
      
      return {
        logs,
        total,
        limit: input.limit || 50,
        offset: input.offset || 0,
      };
    }),

  /**
   * Get recent audit logs for dashboard
   */
  recent: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }))
    .query(async ({ input }) => {
      return await getRecentAuditLogs(input.limit);
    }),

  /**
   * Get retention statistics for audit logs
   */
  retentionStats: adminProcedure
    .query(async () => {
      return await getAuditLogRetentionStats();
    }),

  /**
   * Delete audit logs older than specified days (retention policy)
   */
  applyRetention: adminProcedure
    .input(z.object({
      retentionDays: z.number().min(30).max(365),
    }))
    .mutation(async ({ input }) => {
      const deletedCount = await deleteOldAuditLogs(input.retentionDays);
      return {
        success: true,
        deletedCount,
        retentionDays: input.retentionDays,
      };
    }),
});
