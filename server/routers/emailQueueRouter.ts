import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { emailOutbox, emailDeadLetterQueue } from "../../drizzle/schema";
import { eq, and, count, sql } from "drizzle-orm";

/**
 * Email Queue Router
 * 
 * Provides tRPC procedures for monitoring email queue status and metrics.
 * Allows admins to view pending emails, sent emails, failed emails, and dead-letter queue.
 */

export const emailQueueRouter = router({
  /**
   * Get email queue status summary
   * Returns counts of pending, sent, failed, and dead-letter emails
   */
  getStatus: adminProcedure
    .input(z.object({
      organizationId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();

        // Build where clause based on organizationId
        const whereClause = input.organizationId 
          ? eq(emailOutbox.organizationId, input.organizationId)
          : undefined;

        // Count emails by status
        const [pendingResult, sentResult, failedResult] = await Promise.all([
          db
            .select({ count: count() })
            .from(emailOutbox)
            .where(whereClause ? and(whereClause, eq(emailOutbox.status, "pending")) : eq(emailOutbox.status, "pending")),
          db
            .select({ count: count() })
            .from(emailOutbox)
            .where(whereClause ? and(whereClause, eq(emailOutbox.status, "sent")) : eq(emailOutbox.status, "sent")),
          db
            .select({ count: count() })
            .from(emailOutbox)
            .where(whereClause ? and(whereClause, eq(emailOutbox.status, "failed")) : eq(emailOutbox.status, "failed")),
        ]);

        // Count dead-letter queue
        const dlqResult = await db
          .select({ count: count() })
          .from(emailDeadLetterQueue)
          .where(whereClause ? whereClause : undefined);

        const pendingCount = pendingResult[0]?.count || 0;
        const sentCount = sentResult[0]?.count || 0;
        const failedCount = failedResult[0]?.count || 0;
        const dlqCount = dlqResult[0]?.count || 0;

        return {
          pending: pendingCount,
          sent: sentCount,
          failed: failedCount,
          deadLetter: dlqCount,
          total: pendingCount + sentCount + failedCount + dlqCount,
        };
      } catch (error: any) {
        console.error("[emailQueueRouter] Error getting status:", error.message);
        throw new Error("Failed to get email queue status");
      }
    }),

  /**
   * Get detailed email queue metrics
   * Returns statistics about email sending performance
   */
  getMetrics: adminProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      days: z.number().min(1).max(90).default(7),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();

        // Calculate date range
        const now = new Date();
        const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);

        const whereClause = input.organizationId 
          ? eq(emailOutbox.organizationId, input.organizationId)
          : undefined;

        // Get emails created in the date range
        const emailsInRange = await db
          .select({
            status: emailOutbox.status,
            count: count(),
            avgRetries: sql<number>`AVG(${emailOutbox.retryCount})`,
          })
          .from(emailOutbox)
          .where(
            whereClause 
              ? and(whereClause, sql`${emailOutbox.createdAt} >= ${startDate.toISOString()}`)
              : sql`${emailOutbox.createdAt} >= ${startDate.toISOString()}`
          )
          .groupBy(emailOutbox.status);

        // Calculate success rate
        const totalEmails = emailsInRange.reduce((sum, row) => sum + (row.count || 0), 0);
        const sentEmails = emailsInRange.find(row => row.status === "sent")?.count || 0;
        const successRate = totalEmails > 0 ? Math.round((sentEmails / totalEmails) * 100) : 0;

        // Get average retry count
        const avgRetries = emailsInRange.reduce((sum, row) => sum + (row.avgRetries || 0), 0) / (emailsInRange.length || 1);

        // Get most common errors from dead-letter queue
        const commonErrors = await db
          .select({
            failureCode: emailDeadLetterQueue.failureCode,
            count: count(),
          })
          .from(emailDeadLetterQueue)
          .where(
            whereClause 
              ? and(whereClause, sql`${emailDeadLetterQueue.createdAt} >= ${startDate.toISOString()}`)
              : sql`${emailDeadLetterQueue.createdAt} >= ${startDate.toISOString()}`
          )
          .groupBy(emailDeadLetterQueue.failureCode)
          .orderBy(sql`count(*) DESC`)
          .limit(5);

        return {
          period: {
            days: input.days,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
          },
          summary: {
            totalEmails,
            sentEmails,
            failedEmails: totalEmails - sentEmails,
            successRate: `${successRate}%`,
          },
          averageRetries: Math.round(avgRetries * 100) / 100,
          commonErrors: commonErrors.map(err => ({
            code: err.failureCode,
            count: err.count,
          })),
        };
      } catch (error: any) {
        console.error("[emailQueueRouter] Error getting metrics:", error.message);
        throw new Error("Failed to get email queue metrics");
      }
    }),

  /**
   * Get pending emails
   * Returns list of emails waiting to be sent
   */
  getPending: adminProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();

        const whereClause = input.organizationId 
          ? and(eq(emailOutbox.organizationId, input.organizationId), eq(emailOutbox.status, "pending"))
          : eq(emailOutbox.status, "pending");

        const emails = await db
          .select()
          .from(emailOutbox)
          .where(whereClause)
          .orderBy(emailOutbox.createdAt)
          .limit(input.limit)
          .offset(input.offset);

        return emails;
      } catch (error: any) {
        console.error("[emailQueueRouter] Error getting pending emails:", error.message);
        throw new Error("Failed to get pending emails");
      }
    }),

  /**
   * Get dead-letter queue emails
   * Returns emails that failed permanently
   */
  getDeadLetterQueue: adminProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();

        const whereClause = input.organizationId 
          ? eq(emailDeadLetterQueue.organizationId, input.organizationId)
          : undefined;

        const emails = await db
          .select()
          .from(emailDeadLetterQueue)
          .where(whereClause)
          .orderBy(emailDeadLetterQueue.movedAt)
          .limit(input.limit)
          .offset(input.offset);

        // Normalize DLQ fields to common UI field names expected by the frontend
        return emails.map(email => ({
          ...email,
          // Map DLQ-specific fields to common UI fields
          status: 'dead_letter' as const,
          retryCount: email.finalRetryCount,
          maxRetries: 5,
          lastError: email.failureReason,
          errorCode: email.failureCode,
          createdAt: email.movedAt,
        }));
      } catch (error: any) {
        console.error("[emailQueueRouter] Error getting dead-letter queue:", error.message);
        throw new Error("Failed to get dead-letter queue emails");
      }
    }),

  /**
   * Retry a dead-letter email
   * Moves an email from dead-letter queue back to pending queue
   */
  retryDeadLetterEmail: adminProcedure
    .input(z.object({
      emailId: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();

        // Get the dead-letter email
        const dlqEmail = await db
          .select()
          .from(emailDeadLetterQueue)
          .where(eq(emailDeadLetterQueue.id, input.emailId))
          .limit(1);

        if (!dlqEmail || dlqEmail.length === 0) {
          throw new Error("Email not found in dead-letter queue");
        }

        const email = dlqEmail[0];

        // Create a new outbox entry
        await db.insert(emailOutbox).values({
          organizationId: email.organizationId,
          templateKey: email.templateKey,
          recipientEmail: email.recipientEmail,
          recipientName: email.recipientName,
          subject: email.subject,
          bodyHtml: email.bodyHtml,
          bodyText: email.bodyText,
          status: "pending",
          retryCount: 0,
          maxRetries: 5,
          metadata: email.metadata,
        });

        // Mark the dead-letter email as retried
        await db
          .update(emailDeadLetterQueue)
          .set({
            failureReason: "Retried by admin",
          })
          .where(eq(emailDeadLetterQueue.id, input.emailId));

        console.log(`[emailQueueRouter] Retried dead-letter email ${input.emailId}`);

        return {
          success: true,
          message: "Email moved back to pending queue",
        };
      } catch (error: any) {
        console.error("[emailQueueRouter] Error retrying dead-letter email:", error.message);
        throw new Error("Failed to retry dead-letter email");
      }
    }),
});
