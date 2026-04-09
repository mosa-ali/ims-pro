import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailDeliveryStatus, emailOutbox } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  processSendGridWebhook,
  processMailgunWebhook,
  processAWSSESWebhook,
  getDeliveryStatusStats,
} from "../services/webhookProcessor";

export const emailDeliveryStatusRouter = router({
  /**
   * Get delivery status for a specific email
   */
  getByOutboxId: protectedProcedure
    .input(z.object({ outboxId: z.number(), organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Verify outbox belongs to organization
        const outbox = await dbInstance
          .select()
          .from(emailOutbox)
          .where(
            and(
              eq(emailOutbox.id, input.outboxId),
              eq(emailOutbox.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!outbox) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Email not found",
          });
        }

        const status = await dbInstance
          .select()
          .from(emailDeliveryStatus)
          .where(eq(emailDeliveryStatus.outboxId, input.outboxId))
          .then((rows) => rows[0]);

        if (!status) {
          // Return default status if not found
          return {
            outboxId: input.outboxId,
            currentStatus: "queued",
            eventCount: 0,
            statusChangedAt: outbox.createdAt,
          };
        }

        return status;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching delivery status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch delivery status",
        });
      }
    }),

  /**
   * Get delivery status for multiple emails
   */
  getMultiple: protectedProcedure
    .input(z.object({ outboxIds: z.array(z.number()), organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        const statuses = await dbInstance
          .select()
          .from(emailDeliveryStatus)
          .where(
            and(
              eq(emailDeliveryStatus.organizationId, input.organizationId),
              // Using a workaround for IN clause
            )
          );

        // Filter by outboxIds
        return statuses.filter((s) => input.outboxIds.includes(s.outboxId));
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching delivery statuses:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch delivery statuses",
        });
      }
    }),

  /**
   * Get delivery status statistics for organization
   */
  getStats: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const stats = await getDeliveryStatusStats(input.organizationId);
        return stats;
      } catch (error) {
        console.error("Error fetching delivery stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch delivery statistics",
        });
      }
    }),

  /**
   * Get recent delivery events for dashboard
   */
  getRecentEvents: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        const events = await dbInstance
          .select()
          .from(emailDeliveryStatus)
          .where(eq(emailDeliveryStatus.organizationId, input.organizationId))
          .orderBy(desc(emailDeliveryStatus.statusChangedAt))
          .limit(input.limit)
          .offset(input.offset);

        return events;
      } catch (error) {
        console.error("Error fetching recent events:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch recent events",
        });
      }
    }),

  /**
   * Process SendGrid webhook
   */
  processSendGridWebhook: protectedProcedure
    .input(
      z.object({
        payload: z.any(),
        signature: z.string(),
        signingKey: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await processSendGridWebhook(
          input.payload,
          input.signature,
          input.signingKey
        );

        return {
          success: result.errors.length === 0,
          processed: result.processed,
          errors: result.errors,
        };
      } catch (error) {
        console.error("Error processing SendGrid webhook:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process webhook",
        });
      }
    }),

  /**
   * Process Mailgun webhook
   */
  processMailgunWebhook: protectedProcedure
    .input(
      z.object({
        payload: z.any(),
        signature: z.string(),
        signingKey: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await processMailgunWebhook(
          input.payload,
          input.signature,
          input.signingKey
        );

        return {
          success: result.errors.length === 0,
          processed: result.processed,
          errors: result.errors,
        };
      } catch (error) {
        console.error("Error processing Mailgun webhook:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process webhook",
        });
      }
    }),

  /**
   * Process AWS SES webhook
   */
  processAWSSESWebhook: protectedProcedure
    .input(z.object({ payload: z.any() }))
    .mutation(async ({ input }) => {
      try {
        const result = await processAWSSESWebhook(input.payload);

        return {
          success: result.errors.length === 0,
          processed: result.processed,
          errors: result.errors,
        };
      } catch (error) {
        console.error("Error processing AWS SES webhook:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process webhook",
        });
      }
    }),

  /**
   * Get bounced emails for organization
   */
  getBouncedEmails: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        const bounced = await dbInstance
          .select()
          .from(emailDeliveryStatus)
          .where(
            and(
              eq(emailDeliveryStatus.organizationId, input.organizationId),
              eq(emailDeliveryStatus.currentStatus, "bounced")
            )
          )
          .orderBy(desc(emailDeliveryStatus.statusChangedAt))
          .limit(input.limit)
          .offset(input.offset);

        return bounced;
      } catch (error) {
        console.error("Error fetching bounced emails:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch bounced emails",
        });
      }
    }),

  /**
   * Get complained emails for organization
   */
  getComplainedEmails: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        const complained = await dbInstance
          .select()
          .from(emailDeliveryStatus)
          .where(
            and(
              eq(emailDeliveryStatus.organizationId, input.organizationId),
              eq(emailDeliveryStatus.currentStatus, "complained")
            )
          )
          .orderBy(desc(emailDeliveryStatus.statusChangedAt))
          .limit(input.limit)
          .offset(input.offset);

        return complained;
      } catch (error) {
        console.error("Error fetching complained emails:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch complained emails",
        });
      }
    }),

  /**
   * Get engagement metrics (opens and clicks)
   */
  getEngagementMetrics: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        const statuses = await dbInstance
          .select()
          .from(emailDeliveryStatus)
          .where(eq(emailDeliveryStatus.organizationId, input.organizationId));

        // Calculate metrics
        const totalSent = statuses.filter((s) => s.currentStatus === "sent" || s.currentStatus === "delivered").length;
        const totalOpened = statuses.filter((s) => s.currentStatus === "opened").length;
        const totalClicked = statuses.filter((s) => s.currentStatus === "clicked").length;
        const totalBounced = statuses.filter((s) => s.currentStatus === "bounced").length;
        const totalComplained = statuses.filter((s) => s.currentStatus === "complained").length;

        return {
          totalSent,
          totalOpened,
          totalClicked,
          totalBounced,
          totalComplained,
          openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
          clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
          bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
          complaintRate: totalSent > 0 ? (totalComplained / totalSent) * 100 : 0,
        };
      } catch (error) {
        console.error("Error fetching engagement metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch engagement metrics",
        });
      }
    }),
});
