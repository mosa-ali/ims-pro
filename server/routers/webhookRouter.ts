/**
 * ============================================================================
 * Webhook Router
 * ============================================================================
 * 
 * Handles webhook endpoint management for platform admins.
 * Procedures for creating, updating, deleting, and testing webhooks.
 * 
 * ============================================================================
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { webhookService } from "../services/webhooks/webhookService";

export const webhookRouter = router({
  /**
   * Create a new webhook endpoint
   */
  createEndpoint: protectedProcedure
    .input(
      z.object({
        url: z.string().url("Invalid webhook URL"),
        events: z.array(
          z.enum(["organization_created", "onboarding_started", "onboarding_completed", "onboarding_failed"])
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user is platform admin
      if (ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can create webhooks",
        });
      }

      // Validate webhook URL
      const validation = webhookService.validateWebhookUrl(input.url);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error || "Invalid webhook URL",
        });
      }

      // Generate webhook ID and secret
      const webhookId = webhookService.generateWebhookId();
      const secret = webhookService.generateSecret();
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: null,
        operatingUnitId: null,
        action: "webhook_endpoint_created",
        entityType: "webhook",
        entityId: webhookId,
        details: JSON.stringify({
          webhookId,
          url: input.url,
          events: input.events,
          createdBy: ctx.user.email,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: true,
        webhookId,
        secret,
        url: input.url,
        events: input.events,
        createdAt: now,
      };
    }),

  /**
   * Test webhook endpoint
   */
  testEndpoint: protectedProcedure
    .input(
      z.object({
        url: z.string().url("Invalid webhook URL"),
        secret: z.string().min(1, "Secret is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user is platform admin
      if (ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can test webhooks",
        });
      }

      // Validate webhook URL
      const validation = webhookService.validateWebhookUrl(input.url);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error || "Invalid webhook URL",
        });
      }

      // Create test event
      const testEvent = {
        id: webhookService.generateEventId(),
        type: "organization_created" as const,
        organizationId: 0,
        timestamp: new Date().toISOString(),
        data: {
          organizationName: "Test Organization",
          createdAt: new Date().toISOString(),
          createdBy: ctx.user.email,
          note: "This is a test webhook delivery",
        },
      };

      // Create test webhook endpoint
      const testEndpoint = {
        id: webhookService.generateWebhookId(),
        organizationId: 0,
        url: input.url,
        events: ["organization_created" as const],
        secret: input.secret,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Dispatch test webhook
      const result = await webhookService.dispatchWebhook(testEndpoint, testEvent);

      // Log the test
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: null,
        operatingUnitId: null,
        action: "webhook_test_sent",
        entityType: "webhook",
        entityId: testEndpoint.id,
        details: JSON.stringify({
          url: input.url,
          success: result.success,
          httpStatus: result.httpStatus,
          error: result.error,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: result.success,
        httpStatus: result.httpStatus,
        error: result.error,
        responseBody: result.responseBody,
      };
    }),

  /**
   * Get webhook statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Verify user is platform admin
    if (ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only platform admins can view webhook statistics",
      });
    }

    // In a real implementation, this would query the database
    // For now, return placeholder statistics
    return {
      totalWebhooks: 0,
      totalEvents: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingDeliveries: 0,
      deadLetterCount: 0,
    };
  }),
});
