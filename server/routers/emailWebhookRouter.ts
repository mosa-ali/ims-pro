import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { emailWebhookEvents, emailOutbox } from "../../drizzle/schema";
import { eq, and, count, desc, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Email Webhook Router
 * 
 * Manages webhook events from email providers and processes delivery status updates.
 * Supports multiple providers: SendGrid, Mailgun, AWS SES, Microsoft 365
 */

export const emailWebhookRouter = router({
  /**
   * Get webhook configuration for platform
   */
  getConfiguration: protectedProcedure
    .query(async ({ ctx }) => {
      // Verify platform admin access
      if (
        ctx.user.role !== "platform_admin" &&
        ctx.user.role !== "platform_super_admin"
      ) {
        throw new Error("Only platform admins can view webhook configuration");
      }

      const webhookUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || "https://api.example.com"}/api/webhooks/email-delivery`;
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY || "sk_test_example";

      return {
        webhookUrl,
        apiKey,
        supportedProviders: [
          "sendgrid",
          "mailgun",
          "aws_ses",
          "microsoft_365",
          "manus_custom",
        ],
        securityFeatures: [
          "API key authentication required",
          "HMAC signature verification enabled",
          "Provider-agnostic payload normalization",
          "All events logged for audit trail",
        ],
      };
    }),

  /**
   * Get recent webhook events with filtering
   */
  getEvents: adminProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
        provider: z
          .enum([
            "sendgrid",
            "mailgun",
            "aws_ses",
            "microsoft_365",
            "manus_custom",
          ])
          .optional(),
        eventType: z.string().optional(),
        status: z.enum(["processed", "failed", "pending"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const whereConditions = [];

      if (input.organizationId) {
        whereConditions.push(
          eq(emailWebhookEvents.organizationId, input.organizationId)
        );
      }
      if (input.provider) {
        whereConditions.push(eq(emailWebhookEvents.provider, input.provider));
      }
      if (input.eventType) {
        whereConditions.push(eq(emailWebhookEvents.eventType, input.eventType));
      }
      if (input.status) {
        whereConditions.push(eq(emailWebhookEvents.status, input.status));
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const events = await db
        .select()
        .from(emailWebhookEvents)
        .where(whereClause)
        .orderBy(desc(emailWebhookEvents.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const totalResult = await db
        .select({ count: count() })
        .from(emailWebhookEvents)
        .where(whereClause);

      return {
        events: events.map((e) => ({
          ...e,
          eventData: e.eventData || {},
        })),
        total: totalResult[0]?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Process webhook event from email provider
   * This is called by external email providers
   */
  processEvent: protectedProcedure
    .input(
      z.object({
        provider: z.enum([
          "sendgrid",
          "mailgun",
          "aws_ses",
          "microsoft_365",
          "manus_custom",
        ]),
        eventType: z.string(),
        recipientEmail: z.string().email(),
        messageId: z.string().optional(),
        status: z.enum(["delivered", "bounce", "complaint", "open", "click"]),
        eventData: z.record(z.any()).optional(),
        organizationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      try {
        // Find related outbox email if messageId exists
        let outboxId = null;
        if (input.messageId) {
          const [outboxEmail] = await db
            .select()
            .from(emailOutbox)
            .where(
              and(
                eq(emailOutbox.organizationId, input.organizationId),
                sql`JSON_EXTRACT(${emailOutbox.metadata}, '$.messageId') = ${input.messageId}`
              )
            )
            .limit(1);

          if (outboxEmail) {
            outboxId = outboxEmail.id;

            // Update outbox status based on event
            if (input.status === "delivered") {
              await db
                .update(emailOutbox)
                .set({
                  status: "sent",
                  sentAt: new Date().toISOString(),
                  completedAt: new Date().toISOString(),
                })
                .where(eq(emailOutbox.id, outboxEmail.id));
            } else if (
              input.status === "bounce" ||
              input.status === "complaint"
            ) {
              await db
                .update(emailOutbox)
                .set({
                  status: "failed",
                  lastError: `${input.status}: ${input.eventData?.reason || "Unknown"}`,
                  errorCode: input.status.toUpperCase(),
                  completedAt: new Date().toISOString(),
                })
                .where(eq(emailOutbox.id, outboxEmail.id));
            }
          }
        }

        // Store webhook event
        const result = await db.insert(emailWebhookEvents).values({
          organizationId: input.organizationId,
          provider: input.provider,
          eventType: input.eventType,
          outboxId,
          recipientEmail: input.recipientEmail,
          messageId: input.messageId || null,
          status: "processed",
          eventData: input.eventData || {},
          processedAt: new Date().toISOString(),
        });

        console.log(
          `[emailWebhookRouter] Processed ${input.provider} webhook event: ${input.eventType}`
        );

        return {
          success: true,
          eventId: result.insertId,
          outboxId,
        };
      } catch (error: any) {
        console.error("[emailWebhookRouter] Error processing webhook:", error);

        // Store failed event
        await db.insert(emailWebhookEvents).values({
          organizationId: input.organizationId,
          provider: input.provider,
          eventType: input.eventType,
          recipientEmail: input.recipientEmail,
          messageId: input.messageId || null,
          status: "failed",
          errorMessage: error.message,
        });

        throw new Error("Failed to process webhook event");
      }
    }),

  /**
   * Get webhook event statistics
   */
  getStats: adminProcedure
    .input(
      z.object({
        organizationId: z.number().optional(),
        days: z.number().min(1).max(90).default(7),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const whereConditions = [
        sql`${emailWebhookEvents.createdAt} >= ${startDate.toISOString()}`,
      ];

      if (input.organizationId) {
        whereConditions.push(
          eq(emailWebhookEvents.organizationId, input.organizationId)
        );
      }

      const whereClause = and(...whereConditions);

      // Get event counts by type
      const eventsByType = await db
        .select({
          eventType: emailWebhookEvents.eventType,
          count: count(),
        })
        .from(emailWebhookEvents)
        .where(whereClause)
        .groupBy(emailWebhookEvents.eventType);

      // Get event counts by provider
      const eventsByProvider = await db
        .select({
          provider: emailWebhookEvents.provider,
          count: count(),
        })
        .from(emailWebhookEvents)
        .where(whereClause)
        .groupBy(emailWebhookEvents.provider);

      // Get total processed and failed
      const statusCounts = await db
        .select({
          status: emailWebhookEvents.status,
          count: count(),
        })
        .from(emailWebhookEvents)
        .where(whereClause)
        .groupBy(emailWebhookEvents.status);

      return {
        period: {
          days: input.days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        eventsByType: eventsByType.map((e) => ({
          type: e.eventType,
          count: e.count,
        })),
        eventsByProvider: eventsByProvider.map((e) => ({
          provider: e.provider,
          count: e.count,
        })),
        statusCounts: statusCounts.map((e) => ({
          status: e.status,
          count: e.count,
        })),
      };
    }),

  /**
   * Verify webhook signature (HMAC)
   * Used by webhook handlers to verify authenticity
   */
  verifySignature: protectedProcedure
    .input(
      z.object({
        provider: z.enum([
          "sendgrid",
          "mailgun",
          "aws_ses",
          "microsoft_365",
          "manus_custom",
        ]),
        payload: z.string(),
        signature: z.string(),
      })
    )
    .query(async ({ input }) => {
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY || "";

      // Generate HMAC signature
      const expectedSignature = crypto
        .createHmac("sha256", apiKey)
        .update(input.payload)
        .digest("hex");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(input.signature)
      );

      return {
        valid: isValid,
        provider: input.provider,
      };
    }),
});
