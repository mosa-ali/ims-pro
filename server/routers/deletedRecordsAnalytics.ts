import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Deleted Records Analytics Router
 * Provides analytics endpoints for the Deleted Records Dashboard
 * 
 * Only platform admins can access these analytics
 */

export const deletedRecordsAnalyticsRouter = router({
  // Get deletion trends over time (daily counts for the past 30 days)
  getDeletionTrends: adminProcedure
    .input(z.object({
      days: z.number().min(7).max(365).default(30),
    }))
    .query(async ({ input }) => {
      const { days } = input;
      const db = getDb();
      
      // Query deletion counts grouped by date
      const trends = await db.execute(sql`
        SELECT 
          DATE(deletedAt) as date,
          COUNT(*) as count
        FROM users
        WHERE deletedAt IS NOT NULL
          AND deletedAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
        GROUP BY DATE(deletedAt)
        ORDER BY date ASC
      `);

      return trends.rows as Array<{ date: string; count: number }>;
    }),

  // Get top deleted entity types
  getTopDeletedEntityTypes: adminProcedure
    .query(async () => {
      const db = getDb();
      
      // For now, we only track user deletions
      // In the future, this can be extended to other entity types
      const userCount = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE deletedAt IS NOT NULL
      `);

      return [
        {
          entityType: 'Platform Users',
          count: (userCount.rows[0] as any).count || 0,
          percentage: 100, // 100% since we only have users for now
        }
      ];
    }),

  // Get top deleters (users who have deleted the most records)
  getTopDeleters: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const { limit } = input;
      const db = getDb();

      const topDeleters = await db.execute(sql`
        SELECT 
          u.id,
          u.name,
          u.email,
          COUNT(deleted_users.id) as deletionCount
        FROM users u
        INNER JOIN users deleted_users ON deleted_users.deletedBy = u.id
        WHERE deleted_users.deletedAt IS NOT NULL
        GROUP BY u.id, u.name, u.email
        ORDER BY deletionCount DESC
        LIMIT ${limit}
      `);

      return topDeleters.rows as Array<{
        id: number;
        name: string;
        email: string;
        deletionCount: number;
      }>;
    }),

  // Get recovery rate (restore vs permanent delete ratio)
  getRecoveryRate: adminProcedure
    .query(async () => {
      const db = getDb();
      
      // Count total deleted records
      const totalDeleted = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE deletedAt IS NOT NULL
      `);

      // Count restored records (those with deletedAt set back to NULL via audit logs)
      // For now, we'll use audit logs to track restores
      const restoredCount = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE action = 'platform_admin_restored'
      `);

      // Count permanently deleted records (from audit logs)
      const permanentlyDeletedCount = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE action = 'platform_admin_permanently_deleted'
      `);

      const total = (totalDeleted.rows[0] as any).count || 0;
      const restored = (restoredCount.rows[0] as any).count || 0;
      const permanentlyDeleted = (permanentlyDeletedCount.rows[0] as any).count || 0;

      const recoveryRate = total > 0 ? (restored / (restored + permanentlyDeleted)) * 100 : 0;

      return {
        totalDeleted: total,
        restored,
        permanentlyDeleted,
        recoveryRate: Math.round(recoveryRate * 10) / 10, // Round to 1 decimal place
      };
    }),

  // Get most common deletion reasons
  getDeletionReasons: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const { limit } = input;
      const db = getDb();

      const reasons = await db.execute(sql`
        SELECT 
          deletionReason as reason,
          COUNT(*) as count
        FROM users
        WHERE deletedAt IS NOT NULL
          AND deletionReason IS NOT NULL
          AND deletionReason != ''
        GROUP BY deletionReason
        ORDER BY count DESC
        LIMIT ${limit}
      `);

      return reasons.rows as Array<{
        reason: string;
        count: number;
      }>;
    }),

  // Get dashboard summary statistics
  getDashboardSummary: adminProcedure
    .query(async () => {
      const db = getDb();
      
      // Total deleted records
      const totalDeletedResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE deletedAt IS NOT NULL
      `);

      // Deleted in last 7 days
      const deletedLast7DaysResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE deletedAt IS NOT NULL
          AND deletedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      // Deleted in last 30 days
      const deletedLast30DaysResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE deletedAt IS NOT NULL
          AND deletedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      // Restored count (from audit logs)
      const restoredCountResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE action = 'platform_admin_restored'
      `);

      // Permanently deleted count (from audit logs)
      const permanentlyDeletedCountResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE action = 'platform_admin_permanently_deleted'
      `);

      return {
        totalDeleted: (totalDeletedResult.rows[0] as any).count || 0,
        deletedLast7Days: (deletedLast7DaysResult.rows[0] as any).count || 0,
        deletedLast30Days: (deletedLast30DaysResult.rows[0] as any).count || 0,
        restored: (restoredCountResult.rows[0] as any).count || 0,
        permanentlyDeleted: (permanentlyDeletedCountResult.rows[0] as any).count || 0,
      };
    }),
});
