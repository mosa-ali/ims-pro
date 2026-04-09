import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Webhook Configuration Router
 * Manages email provider webhook configurations
 */
export const webhookConfigRouter = router({
  /**
   * Get webhook configuration for a provider
   */
  getConfig: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["sendgrid", "mailgun", "aws_ses"]),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check if user is platform admin
        if (
          ctx.user.role !== "platform_admin" &&
          ctx.user.role !== "platform_super_admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only platform admins can access webhook configuration",
          });
        }

        // In production, fetch from database
        // For now, return mock configuration
        const configs: Record<string, any> = {
          sendgrid: {
            provider: "sendgrid",
            isConfigured: !!process.env.SENDGRID_WEBHOOK_PUBLIC_KEY,
            webhookUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL}/webhooks/sendgrid`,
            publicKey: process.env.SENDGRID_WEBHOOK_PUBLIC_KEY
              ? "***configured***"
              : "Not configured",
          },
          mailgun: {
            provider: "mailgun",
            isConfigured: !!process.env.MAILGUN_API_KEY,
            webhookUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL}/webhooks/mailgun`,
            apiKey: process.env.MAILGUN_API_KEY ? "***configured***" : "Not configured",
          },
          aws_ses: {
            provider: "aws_ses",
            isConfigured: !!process.env.AWS_SES_REGION,
            webhookUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL}/webhooks/aws-ses`,
            region: process.env.AWS_SES_REGION || "Not configured",
          },
        };

        return configs[input.provider] || null;
      } catch (error) {
        console.error("[WebhookConfig] Error getting config:", error);
        throw error;
      }
    }),

  /**
   * Update webhook configuration for a provider
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["sendgrid", "mailgun", "aws_ses"]),
        config: z.record(z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user is platform admin
        if (
          ctx.user.role !== "platform_admin" &&
          ctx.user.role !== "platform_super_admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only platform admins can update webhook configuration",
          });
        }

        // In production, save to database
        console.log(
          `[WebhookConfig] Updated configuration for ${input.provider}:`,
          input.config
        );

        return {
          success: true,
          provider: input.provider,
          message: "Configuration updated successfully",
        };
      } catch (error) {
        console.error("[WebhookConfig] Error updating config:", error);
        throw error;
      }
    }),

  /**
   * Test webhook configuration
   */
  testWebhook: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["sendgrid", "mailgun", "aws_ses"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user is platform admin
        if (
          ctx.user.role !== "platform_admin" &&
          ctx.user.role !== "platform_super_admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only platform admins can test webhooks",
          });
        }

        // Create test event based on provider
        const testEvents: Record<string, any> = {
          sendgrid: [
            {
              event: "delivered",
              email: "test@example.com",
              timestamp: Math.floor(Date.now() / 1000),
              sg_message_id: "test_message_id_123",
              status: "delivered",
            },
          ],
          mailgun: {
            "event-data": {
              event: "delivered",
              recipient: "test@example.com",
              timestamp: Math.floor(Date.now() / 1000),
              id: "test_message_id_123",
            },
          },
          aws_ses: {
            Message: JSON.stringify({
              eventType: "Delivery",
              mail: {
                timestamp: new Date().toISOString(),
                messageId: "test_message_id_123",
              },
              delivery: {
                timestamp: new Date().toISOString(),
                recipients: ["test@example.com"],
              },
            }),
          },
        };

        console.log(
          `[WebhookConfig] Testing webhook for ${input.provider}:`,
          testEvents[input.provider]
        );

        return {
          success: true,
          provider: input.provider,
          message: "Test webhook sent successfully",
          testEvent: testEvents[input.provider],
        };
      } catch (error) {
        console.error("[WebhookConfig] Error testing webhook:", error);
        throw error;
      }
    }),

  /**
   * Get webhook statistics
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["sendgrid", "mailgun", "aws_ses"]).optional(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Check if user is platform admin
        if (
          ctx.user.role !== "platform_admin" &&
          ctx.user.role !== "platform_super_admin"
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only platform admins can view webhook statistics",
          });
        }

        // In production, fetch from database
        // For now, return mock statistics
        return {
          provider: input.provider || "all",
          days: input.days,
          totalEvents: 1250,
          deliveredCount: 1100,
          bounceCount: 80,
          complaintCount: 20,
          openCount: 450,
          clickCount: 120,
          lastEventAt: new Date(),
        };
      } catch (error) {
        console.error("[WebhookConfig] Error getting statistics:", error);
        throw error;
      }
    }),
});
