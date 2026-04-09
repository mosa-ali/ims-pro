import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { varianceAlertConfig, varianceAlertHistory, budgetItems, projects } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";

export const varianceAlertsRouter = router({
  /**
   * Get or create variance alert configuration for a project
   */
  getConfig: scopedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Try to get existing config
      const [config] = await db
        .select()
        .from(varianceAlertConfig)
        .where(eq(varianceAlertConfig.projectId, input.projectId))
        .limit(1);

      if (config) {
        return config;
      }

      // If no config exists, return default values (don't auto-create)
      return null;
    }),

  /**
   * Create or update variance alert configuration
   */
  upsertConfig: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        warningThreshold: z.number().min(0).max(100),
        criticalThreshold: z.number().min(0).max(100),
        isEnabled: z.boolean(),
        notifyProjectManager: z.boolean(),
        notifyFinanceTeam: z.boolean(),
        notifyOwner: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user.id;

      // Validate thresholds
      if (input.criticalThreshold <= input.warningThreshold) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Critical threshold must be greater than warning threshold",
        });
      }

      // Get project details for organizationId and operatingUnitId
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Check if config exists
      const [existingConfig] = await db
        .select()
        .from(varianceAlertConfig)
        .where(eq(varianceAlertConfig.projectId, input.projectId))
        .limit(1);

      if (existingConfig) {
        // Update existing config
        await db
          .update(varianceAlertConfig)
          .set({
            warningThreshold: input.warningThreshold.toString(),
            criticalThreshold: input.criticalThreshold.toString(),
            isEnabled: input.isEnabled,
            notifyProjectManager: input.notifyProjectManager,
            notifyFinanceTeam: input.notifyFinanceTeam,
            notifyOwner: input.notifyOwner,
            updatedBy: userId,
          })
          .where(eq(varianceAlertConfig.id, existingConfig.id));

        return { success: true, message: "Alert configuration updated successfully" };
      } else {
        // Create new config
        await db.insert(varianceAlertConfig).values({
          projectId: input.projectId,
          organizationId: project.organizationId,
          operatingUnitId: project.operatingUnitId,
          warningThreshold: input.warningThreshold.toString(),
          criticalThreshold: input.criticalThreshold.toString(),
          isEnabled: input.isEnabled,
          notifyProjectManager: input.notifyProjectManager,
          notifyFinanceTeam: input.notifyFinanceTeam,
          notifyOwner: input.notifyOwner,
          createdBy: userId,
          updatedBy: userId,
        });

        return { success: true, message: "Alert configuration created successfully" };
      }
    }),

  /**
   * Check variance for a specific budget item and trigger alert if needed
   * This is called after updating actualSpent in a budget item
   */
  checkVariance: scopedProcedure
    .input(z.object({ budgetItemId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get budget item details
      const [item] = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.id, input.budgetItemId))
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Budget item not found" });
      }

      // Get alert configuration for this project
      const [config] = await db
        .select()
        .from(varianceAlertConfig)
        .where(eq(varianceAlertConfig.projectId, item.projectId))
        .limit(1);

      // If no config or alerts disabled, skip
      if (!config || !config.isEnabled) {
        return { alertTriggered: false, message: "Variance alerts not configured or disabled" };
      }

      // Calculate variance
      const totalBudget = parseFloat(item.totalBudgetLine || "0");
      const actualSpent = parseFloat(item.actualSpent || "0");
      
      if (totalBudget === 0) {
        return { alertTriggered: false, message: "Total budget is zero, cannot calculate variance" };
      }

      const varianceAmount = actualSpent - totalBudget;
      const variancePercentage = (varianceAmount / totalBudget) * 100;

      // Only trigger alert if overspending (positive variance)
      if (variancePercentage <= 0) {
        return { alertTriggered: false, message: "No overspending detected" };
      }

      const warningThreshold = parseFloat(config.warningThreshold || "10");
      const criticalThreshold = parseFloat(config.criticalThreshold || "20");

      let alertLevel: "warning" | "critical" | null = null;

      if (variancePercentage >= criticalThreshold) {
        alertLevel = "critical";
      } else if (variancePercentage >= warningThreshold) {
        alertLevel = "warning";
      }

      // If no threshold exceeded, no alert
      if (!alertLevel) {
        return { alertTriggered: false, message: "Variance within acceptable limits" };
      }

      // Check if alert already exists for this budget item at this level (avoid duplicates)
      const [existingAlert] = await db
        .select()
        .from(varianceAlertHistory)
        .where(
          and(
            eq(varianceAlertHistory.budgetItemId, input.budgetItemId),
            eq(varianceAlertHistory.alertLevel, alertLevel)
          )
        )
        .orderBy(desc(varianceAlertHistory.createdAt))
        .limit(1);

      // If alert exists and was created recently (within 24 hours), don't create duplicate
      if (existingAlert) {
        const hoursSinceLastAlert = (Date.now() - new Date(existingAlert.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastAlert < 24) {
          return { alertTriggered: false, message: "Alert already sent within last 24 hours" };
        }
      }

      // Create alert history record
      const alertRecord = await db.insert(varianceAlertHistory).values({
        projectId: item.projectId,
        budgetItemId: input.budgetItemId,
        organizationId: item.organizationId,
        operatingUnitId: item.operatingUnitId,
        budgetCode: item.budgetCode,
        budgetItem: item.budgetItem,
        totalBudget: totalBudget.toString(),
        actualSpent: actualSpent.toString(),
        varianceAmount: varianceAmount.toString(),
        variancePercentage: variancePercentage.toFixed(2),
        alertLevel,
        notificationSent: false,
      });

      // Send notification if configured
      let notificationSent = false;
      let notificationError = null;

      if (config.notifyOwner) {
        try {
          const success = await notifyOwner({
            title: `${alertLevel === "critical" ? "🚨 CRITICAL" : "⚠️ WARNING"}: Budget Overspending Alert`,
            content: `Budget item "${item.budgetItem}" (Code: ${item.budgetCode}) has exceeded the ${alertLevel} threshold.\n\n` +
              `Total Budget: $${totalBudget.toFixed(2)}\n` +
              `Actual Spent: $${actualSpent.toFixed(2)}\n` +
              `Overspending: $${varianceAmount.toFixed(2)} (${variancePercentage.toFixed(2)}%)\n\n` +
              `Threshold: ${alertLevel === "critical" ? criticalThreshold : warningThreshold}%`,
          });
          notificationSent = success;
          if (!success) {
            notificationError = "Notification service unavailable";
          }
        } catch (error: any) {
          notificationError = error.message || "Failed to send notification";
        }
      }

      // Update alert record with notification status
      const insertId = (alertRecord as any).insertId;
      await db
        .update(varianceAlertHistory)
        .set({
          notificationSent,
          notificationError,
        })
        .where(eq(varianceAlertHistory.id, insertId));

      return {
        alertTriggered: true,
        alertLevel,
        variancePercentage: variancePercentage.toFixed(2),
        notificationSent,
        message: `${alertLevel.toUpperCase()} alert triggered for ${variancePercentage.toFixed(2)}% overspending`,
      };
    }),

  /**
   * Get alert history (organization-wide or project-specific)
   */
  getHistory: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // If projectId is provided, filter by project; otherwise return all alerts
      const query = db
        .select()
        .from(varianceAlertHistory)
        .orderBy(desc(varianceAlertHistory.createdAt))
        .limit(input.limit);

      if (input.projectId) {
        const alerts = await query.where(eq(varianceAlertHistory.projectId, input.projectId));
        return alerts;
      }

      const alerts = await query;
      return alerts;
    }),

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert: scopedProcedure
    .input(
      z.object({
        alertId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user.id;

      await db
        .update(varianceAlertHistory)
        .set({
          acknowledgedAt: new Date(),
          acknowledgedBy: userId,
          acknowledgedNotes: input.notes || null,
        })
        .where(eq(varianceAlertHistory.id, input.alertId));

      return { success: true, message: "Alert acknowledged successfully" };
    }),
});
