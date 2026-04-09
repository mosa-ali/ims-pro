import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { emailOutbox } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Performance Dashboard Router
 * Provides email delivery analytics and performance metrics
 */
export const performanceDashboardRouter = router({
  /**
   * Get delivery trends over time
   */
  getDeliveryTrends: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
        organizationId: z.number().optional(),
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
            message: "Only platform admins can view performance dashboard",
          });
        }

        // In production, query database for actual data
        // For now, return mock data
        const trends = [];
        const now = new Date();
        for (let i = input.days; i > 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          trends.push({
            date: date.toISOString().split("T")[0],
            sent: Math.floor(Math.random() * 500) + 100,
            failed: Math.floor(Math.random() * 50) + 10,
            bounced: Math.floor(Math.random() * 30) + 5,
            complained: Math.floor(Math.random() * 10),
          });
        }

        return trends;
      } catch (error) {
        console.error("[PerformanceDashboard] Error getting delivery trends:", error);
        throw error;
      }
    }),

  /**
   * Get provider performance comparison
   */
  getProviderPerformance: protectedProcedure
    .input(
      z.object({
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
            message: "Only platform admins can view performance dashboard",
          });
        }

        // In production, query database for actual data
        // For now, return mock data
        return [
          {
            provider: "SendGrid",
            totalSent: 5240,
            delivered: 5100,
            bounced: 80,
            complained: 20,
            opened: 2550,
            clicked: 680,
            successRate: 97.3,
          },
          {
            provider: "Mailgun",
            totalSent: 3150,
            delivered: 3050,
            bounced: 60,
            complained: 15,
            opened: 1525,
            clicked: 410,
            successRate: 96.8,
          },
          {
            provider: "AWS SES",
            totalSent: 2890,
            delivered: 2800,
            bounced: 50,
            complained: 10,
            opened: 1400,
            clicked: 350,
            successRate: 96.9,
          },
        ];
      } catch (error) {
        console.error("[PerformanceDashboard] Error getting provider performance:", error);
        throw error;
      }
    }),

  /**
   * Get bounce rate metrics
   */
  getBounceRates: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
        organizationId: z.number().optional(),
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
            message: "Only platform admins can view performance dashboard",
          });
        }

        // In production, query database for actual data
        // For now, return mock data
        return {
          hardBounceRate: 1.2,
          softBounceRate: 0.8,
          totalBounceRate: 2.0,
          hardBounceCount: 120,
          softBounceCount: 80,
          totalBounceCount: 200,
          trend: "decreasing",
        };
      } catch (error) {
        console.error("[PerformanceDashboard] Error getting bounce rates:", error);
        throw error;
      }
    }),

  /**
   * Get complaint rate metrics
   */
  getComplaintRates: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
        organizationId: z.number().optional(),
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
            message: "Only platform admins can view performance dashboard",
          });
        }

        // In production, query database for actual data
        // For now, return mock data
        return {
          complaintRate: 0.15,
          totalComplaints: 45,
          spamComplaints: 35,
          unsubscribeComplaints: 10,
          trend: "stable",
        };
      } catch (error) {
        console.error("[PerformanceDashboard] Error getting complaint rates:", error);
        throw error;
      }
    }),

  /**
   * Get organization performance comparison
   */
  getOrganizationPerformance: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
        limit: z.number().default(10),
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
            message: "Only platform admins can view performance dashboard",
          });
        }

        // In production, query database for actual data
        // For now, return mock data
        return [
          {
            organizationId: 1,
            organizationName: "Yamany Foundation",
            totalSent: 2500,
            delivered: 2450,
            bounced: 30,
            complained: 5,
            successRate: 98.0,
          },
          {
            organizationId: 2,
            organizationName: "EFADAH",
            totalSent: 1800,
            delivered: 1750,
            bounced: 35,
            complained: 8,
            successRate: 97.2,
          },
          {
            organizationId: 3,
            organizationName: "IMS Foundation",
            totalSent: 1200,
            delivered: 1150,
            bounced: 35,
            complained: 10,
            successRate: 95.8,
          },
        ];
      } catch (error) {
        console.error("[PerformanceDashboard] Error getting organization performance:", error);
        throw error;
      }
    }),

  /**
   * Get summary metrics
   */
  getSummary: protectedProcedure
    .input(
      z.object({
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
            message: "Only platform admins can view performance dashboard",
          });
        }

        // In production, query database for actual data
        // For now, return mock data
        return {
          totalSent: 11280,
          totalDelivered: 10950,
          totalBounced: 190,
          totalComplained: 45,
          totalOpened: 5475,
          totalClicked: 1440,
          overallSuccessRate: 97.0,
          averageBounceRate: 1.68,
          averageComplaintRate: 0.4,
          period: `Last ${input.days} days`,
        };
      } catch (error) {
        console.error("[PerformanceDashboard] Error getting summary:", error);
        throw error;
      }
    }),
});
