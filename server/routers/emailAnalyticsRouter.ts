import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { emailOutbox, emailDeadLetterQueue, emailTemplates } from "../../drizzle/schema";
import { eq, and, count, sql, desc } from "drizzle-orm";

/**
 * Email Analytics Router
 * 
 * Provides analytics and metrics for email delivery across all organizations.
 * Tracks delivery rates, failure patterns, and performance trends.
 */

export const emailAnalyticsRouter = router({
  /**
   * Get comprehensive email metrics for a date range
   */
  getMetrics: adminProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Calculate date range
      let start = new Date();
      let end = new Date();

      if (input.startDate && input.endDate) {
        start = new Date(input.startDate);
        end = new Date(input.endDate);
      } else {
        start.setDate(start.getDate() - input.days);
      }

      const whereConditions = [
        sql`${emailOutbox.createdAt} >= ${start.toISOString()}`,
        sql`${emailOutbox.createdAt} <= ${end.toISOString()}`,
      ];

      if (input.organizationId) {
        whereConditions.push(
          eq(emailOutbox.organizationId, input.organizationId)
        );
      }

      const whereClause = and(...whereConditions);

      // Get status breakdown
      const statusBreakdown = await db
        .select({
          status: emailOutbox.status,
          count: count(),
        })
        .from(emailOutbox)
        .where(whereClause)
        .groupBy(emailOutbox.status);

      // Calculate totals
      const totalSent = statusBreakdown.find((s) => s.status === "sent")
        ?.count || 0;
      const totalFailed = statusBreakdown.find((s) => s.status === "failed")
        ?.count || 0;
      const totalPending = statusBreakdown.find((s) => s.status === "pending")
        ?.count || 0;
      const totalProcessing = statusBreakdown.find(
        (s) => s.status === "sending"
      )?.count || 0;
      const totalQueued = statusBreakdown.find((s) => s.status === "pending")
        ?.count || 0;

      const totalEmails =
        totalSent + totalFailed + totalPending + totalProcessing;
      const successRate =
        totalEmails > 0 ? Math.round((totalSent / totalEmails) * 100) : 0;
      const failureRate =
        totalEmails > 0 ? Math.round((totalFailed / totalEmails) * 100) : 0;

      // Get average retry count
      const retryStats = await db
        .select({
          avgRetries: sql<number>`AVG(${emailOutbox.retryCount})`,
          maxRetries: sql<number>`MAX(${emailOutbox.retryCount})`,
        })
        .from(emailOutbox)
        .where(whereClause);

      const avgRetries = Math.round(
        ((retryStats[0]?.avgRetries as number) || 0) * 100
      ) / 100;

      // Get metrics by template
      const metricsByTemplate = await db
        .select({
          templateKey: emailOutbox.templateKey,
          count: count(),
          sent: sql<number>`SUM(CASE WHEN ${emailOutbox.status} = 'sent' THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN ${emailOutbox.status} = 'failed' THEN 1 ELSE 0 END)`,
        })
        .from(emailOutbox)
        .where(whereClause)
        .groupBy(emailOutbox.templateKey)
        .orderBy(desc(count()));

      // Get top failure codes
      const topFailures = await db
        .select({
          errorCode: emailDeadLetterQueue.failureCode,
          count: count(),
        })
        .from(emailDeadLetterQueue)
        .where(
          input.organizationId
            ? and(
                eq(emailDeadLetterQueue.organizationId, input.organizationId),
                sql`${emailDeadLetterQueue.createdAt} >= ${start.toISOString()}`,
                sql`${emailDeadLetterQueue.createdAt} <= ${end.toISOString()}`
              )
            : and(
                sql`${emailDeadLetterQueue.createdAt} >= ${start.toISOString()}`,
                sql`${emailDeadLetterQueue.createdAt} <= ${end.toISOString()}`
              )
        )
        .groupBy(emailDeadLetterQueue.failureCode)
        .orderBy(desc(count()))
        .limit(10);

      return {
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          days: input.days,
        },
        summary: {
          totalEmails,
          sent: totalSent,
          failed: totalFailed,
          pending: totalPending,
          processing: totalProcessing,
          queued: totalQueued,
          successRate: `${successRate}%`,
          failureRate: `${failureRate}%`,
        },
        performance: {
          averageRetries: avgRetries,
          maxRetries: retryStats[0]?.maxRetries || 0,
        },
        byTemplate: metricsByTemplate.map((t) => ({
          templateKey: t.templateKey,
          total: t.count,
          sent: t.sent || 0,
          failed: t.failed || 0,
          successRate:
            t.count > 0
              ? `${Math.round(((t.sent || 0) / t.count) * 100)}%`
              : "0%",
        })),
        topFailures: topFailures.map((f) => ({
          code: f.errorCode,
          count: f.count,
        })),
      };
    }),

  /**
   * Get delivery trends over time
   */
  getTrends: adminProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
        days: z.number().min(1).max(90).default(30),
        granularity: z.enum(["hourly", "daily", "weekly"]).default("daily"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const whereConditions = [
        sql`${emailOutbox.createdAt} >= ${startDate.toISOString()}`,
      ];

      if (input.organizationId) {
        whereConditions.push(
          eq(emailOutbox.organizationId, input.organizationId)
        );
      }

      const whereClause = and(...whereConditions);

      // Determine date format based on granularity
      let dateFormat = "%Y-%m-%d"; // daily
      if (input.granularity === "hourly") {
        dateFormat = "%Y-%m-%d %H:00:00";
      } else if (input.granularity === "weekly") {
        dateFormat = "%Y-W%u";
      }

      // Get trends
      const trends = await db
        .select({
          date: sql<string>`DATE_FORMAT(${emailOutbox.createdAt}, ${dateFormat})`,
          total: count(),
          sent: sql<number>`SUM(CASE WHEN ${emailOutbox.status} = 'sent' THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN ${emailOutbox.status} = 'failed' THEN 1 ELSE 0 END)`,
          pending: sql<number>`SUM(CASE WHEN ${emailOutbox.status} = 'pending' THEN 1 ELSE 0 END)`,
        })
        .from(emailOutbox)
        .where(whereClause)
        .groupBy(sql`DATE_FORMAT(${emailOutbox.createdAt}, ${dateFormat})`)
        .orderBy(sql`DATE_FORMAT(${emailOutbox.createdAt}, ${dateFormat})`);

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days: input.days,
          granularity: input.granularity,
        },
        trends: trends.map((t) => ({
          date: t.date,
          total: t.total,
          sent: t.sent || 0,
          failed: t.failed || 0,
          pending: t.pending || 0,
        })),
      };
    }),

  /**
   * Get metrics by organization
   */
  getByOrganization: adminProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const metrics = await db
        .select({
          organizationId: emailOutbox.organizationId,
          total: count(),
          sent: sql<number>`SUM(CASE WHEN ${emailOutbox.status} = 'sent' THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN ${emailOutbox.status} = 'failed' THEN 1 ELSE 0 END)`,
        })
        .from(emailOutbox)
        .where(sql`${emailOutbox.createdAt} >= ${startDate.toISOString()}`)
        .groupBy(emailOutbox.organizationId)
        .orderBy(desc(count()));

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days: input.days,
        },
        organizations: metrics.map((m) => ({
          organizationId: m.organizationId,
          total: m.total,
          sent: m.sent || 0,
          failed: m.failed || 0,
          successRate:
            m.total > 0
              ? `${Math.round(((m.sent || 0) / m.total) * 100)}%`
              : "0%",
        })),
      };
    }),

  /**
   * Export analytics as CSV
   */
  exportMetrics: adminProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const emails = await db
        .select()
        .from(emailOutbox)
        .where(
          input.organizationId
            ? and(
                eq(emailOutbox.organizationId, input.organizationId),
                sql`${emailOutbox.createdAt} >= ${startDate.toISOString()}`
              )
            : sql`${emailOutbox.createdAt} >= ${startDate.toISOString()}`
        )
        .orderBy(desc(emailOutbox.createdAt));

      // Generate CSV
      const headers = [
        "ID",
        "Organization",
        "Template",
        "Recipient",
        "Status",
        "Retries",
        "Created",
        "Sent",
      ];
      const rows = emails.map((e) => [
        e.id,
        e.organizationId,
        e.templateKey,
        e.recipientEmail,
        e.status,
        e.retryCount,
        e.createdAt,
        e.sentAt || "",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
      ].join("\n");

      return {
        filename: `email-analytics-${new Date().toISOString().split("T")[0]}.csv`,
        content: csv,
        mimeType: "text/csv",
      };
    }),
});
