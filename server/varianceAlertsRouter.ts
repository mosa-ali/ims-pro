import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { varianceAlerts, projects } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { toast } from "sonner";

/**
 * Adapter Router for Variance Alerts
 * Maps the original API design to the actual varianceAlerts table schema
 * 
 * Original Design:
 * - varianceAlertConfig table (settings)
 * - varianceAlertHistory table (alert records)
 * 
 * Actual Schema:
 * - varianceAlerts table (combined)
 * 
 * This router adapts the original component to work with the actual schema
 */

export const varianceAlertsRouter = router({
  /**
   * Get alert configuration for a project
   * Maps to varianceAlerts table - returns first config-type record
   */
  getConfig: scopedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // ✅ Validate scope context
      if (!ctx.scope?.organizationId || !ctx.scope?.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing scope context. Organization and Operating Unit must be selected.",
        });
      }

      try {
        // Get the first alert record for this project to extract config
        // In the actual schema, we store config as part of each alert
        const [alert] = await db
          .select()
          .from(varianceAlerts)
          .where(
            and(
              eq(varianceAlerts.projectId, input.projectId),
              eq(varianceAlerts.organizationId, ctx.scope.organizationId),
              eq(varianceAlerts.operatingUnitId, ctx.scope.operatingUnitId)
            )
          )
          .limit(1);

        // If we have an alert, use its thresholds as config
        if (alert) {
          return {
            projectId: input.projectId,
            warningThreshold: alert.thresholdPercentage?.toString() || "10",
            criticalThreshold: alert.thresholdPercentage ? (parseFloat(alert.thresholdPercentage) * 1.5).toString() : "20",
            isEnabled: alert.status !== 'dismissed',
            notifyProjectManager: alert.notificationSent === 1,
            notifyFinanceTeam: alert.notificationSent === 1,
            notifyOwner: alert.notificationSent === 1,
          };
        }

        // Default config if no alerts exist
        return {
          projectId: input.projectId,
          warningThreshold: "10",
          criticalThreshold: "20",
          isEnabled: true,
          notifyProjectManager: true,
          notifyFinanceTeam: true,
          notifyOwner: false,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch config: ${error.message}`,
        });
      }
    }),

  /**
   * Create or update variance alert configuration
   * Stores config in varianceAlerts table
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

      // ✅ Validate scope context
      if (!ctx.scope?.organizationId || !ctx.scope?.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing scope context. Organization and Operating Unit must be selected.",
        });
      }

      // Validate thresholds
      if (input.criticalThreshold <= input.warningThreshold) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Critical threshold must be greater than warning threshold",
        });
      }

      try {
        // Get project details
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, input.projectId))
          .limit(1);

        if (!project) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }

        // Create a config alert record (special marker alert)
        // This stores the configuration in the varianceAlerts table
        await db.insert(varianceAlerts).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          projectId: input.projectId,
          category: "_CONFIG_",
          alertType: 'threshold_exceeded',
          severity: 'medium',
          budgetAmount: "0",
          actualAmount: "0",
          variance: "0",
          variancePercentage: "0",
          thresholdPercentage: input.warningThreshold.toString(),
          status: input.isEnabled ? 'active' : 'dismissed',
          notificationSent: input.notifyOwner ? 1 : 0,
          description: `Config: Warning=${input.warningThreshold}%, Critical=${input.criticalThreshold}%`,
          notes: JSON.stringify({
            warningThreshold: input.warningThreshold,
            criticalThreshold: input.criticalThreshold,
            notifyProjectManager: input.notifyProjectManager,
            notifyFinanceTeam: input.notifyFinanceTeam,
            notifyOwner: input.notifyOwner,
          }),
        });

        return { success: true, message: "Alert configuration saved successfully" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save config: ${error.message}`,
        });
      }
    }),

  /**
   * Get alert history for a project
   * Maps varianceAlerts records to the original alert format
   */
  getHistory: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // ✅ Validate scope context
      if (!ctx.scope?.organizationId || !ctx.scope?.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing scope context. Organization and Operating Unit must be selected.",
        });
      }

      try {
        const alerts = await db
          .select()
          .from(varianceAlerts)
          .where(
            and(
              eq(varianceAlerts.projectId, input.projectId),
              eq(varianceAlerts.organizationId, ctx.scope.organizationId),
              eq(varianceAlerts.operatingUnitId, ctx.scope.operatingUnitId),
              eq(varianceAlerts.isDeleted, 0)
            )
          )
          .orderBy(desc(varianceAlerts.createdAt))
          .limit(input.limit);

        // Map to original alert format
        return alerts.map((alert) => ({
          id: alert.id,
          projectId: alert.projectId,
          budgetItemId: alert.budgetId,
          budgetCode: alert.category || "N/A",
          budgetItem: alert.description || "Budget Item",
          totalBudget: alert.budgetAmount,
          actualSpent: alert.actualAmount,
          varianceAmount: alert.variance,
          variancePercentage: alert.variancePercentage,
          alertLevel: alert.severity === 'critical' ? 'critical' : 'warning',
          status: alert.status,
          createdAt: alert.createdAt,
          acknowledgedAt: alert.acknowledgedAt,
          acknowledgedBy: alert.acknowledgedBy,
          acknowledgedNotes: alert.notes,
          notificationSent: alert.notificationSent === 1,
        }));
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch alert history: ${error.message}`,
        });
      }
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

      // ✅ Validate scope context
      if (!ctx.scope?.organizationId || !ctx.scope?.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing scope context. Organization and Operating Unit must be selected.",
        });
      }

      try {
        const userId = ctx.user.id;

        // Verify alert belongs to user's organization/OU
        const [alert] = await db
          .select()
          .from(varianceAlerts)
          .where(
            and(
              eq(varianceAlerts.id, input.alertId),
              eq(varianceAlerts.organizationId, ctx.scope.organizationId),
              eq(varianceAlerts.operatingUnitId, ctx.scope.operatingUnitId)
            )
          )
          .limit(1);

        if (!alert) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found" });
        }

        // Update alert status
        await db
          .update(varianceAlerts)
          .set({
            status: 'acknowledged',
            acknowledgedAt: new Date().toISOString(),
            acknowledgedBy: userId,
            notes: input.notes || alert.notes,
          })
          .where(eq(varianceAlerts.id, input.alertId));

        return { success: true, message: "Alert acknowledged successfully" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to acknowledge alert: ${error.message}`,
        });
      }
    }),

  /**
   * Check variance for a budget item and create alert if needed
   * Called from budgetItemsRouter when actualSpent is updated
   */
  checkVariance: scopedProcedure
    .input(z.object({ budgetItemId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // ✅ Validate scope context
      if (!ctx.scope?.organizationId || !ctx.scope?.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing scope context. Organization and Operating Unit must be selected.",
        });
      }

      try {
        // Get budget item details
        const [item] = await db
          .select()
          .from(varianceAlerts)
          .where(eq(varianceAlerts.budgetId, input.budgetItemId))
          .limit(1);

        if (!item) {
          return { alertTriggered: false, message: "Budget item not found" };
        }

        // Get config for this project (look for config alert)
        const [configAlert] = await db
          .select()
          .from(varianceAlerts)
          .where(
            and(
              eq(varianceAlerts.projectId, item.projectId),
              eq(varianceAlerts.category, "_CONFIG_")
            )
          )
          .limit(1);

        // If no config or alerts disabled, skip
        if (!configAlert || configAlert.status === 'dismissed') {
          return { alertTriggered: false, message: "Variance alerts not configured or disabled" };
        }

        // Parse config from notes
        let warningThreshold = 10;
        let criticalThreshold = 20;
        let notifyOwner = false;

        if (configAlert.notes) {
          try {
            const config = JSON.parse(configAlert.notes);
            warningThreshold = config.warningThreshold || 10;
            criticalThreshold = config.criticalThreshold || 20;
            notifyOwner = config.notifyOwner || false;
          } catch (e) {
            // Use defaults if parse fails
          }
        }

        // Calculate variance
        const budgetAmount = parseFloat(item.budgetAmount);
        const actualAmount = parseFloat(item.actualAmount);

        if (budgetAmount === 0) {
          return { alertTriggered: false, message: "Budget amount is zero" };
        }

        const variance = actualAmount - budgetAmount;
        const variancePercentage = (variance / budgetAmount) * 100;

        // Only trigger if overspending
        if (variancePercentage <= 0) {
          return { alertTriggered: false, message: "No overspending detected" };
        }

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let alertLevel: 'warning' | 'critical' = 'warning';

        if (variancePercentage >= criticalThreshold) {
          severity = 'critical';
          alertLevel = 'critical';
        } else if (variancePercentage >= warningThreshold) {
          severity = 'high';
          alertLevel = 'warning';
        } else {
          return { alertTriggered: false, message: "Variance within acceptable limits" };
        }

        // Create alert record
        await db.insert(varianceAlerts).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          projectId: item.projectId,
          budgetId: input.budgetItemId,
          category: item.category,
          alertType: 'threshold_exceeded',
          severity,
          budgetAmount: budgetAmount.toString(),
          actualAmount: actualAmount.toString(),
          variance: variance.toString(),
          variancePercentage: variancePercentage.toFixed(2),
          thresholdPercentage: warningThreshold.toString(),
          status: 'active',
          notificationSent: 0,
          description: item.description,
          notes: `Alert Level: ${alertLevel}`,
        });

        // Send notification if configured
        if (notifyOwner) {
          try {
            await notifyOwner({
              title: `${severity === "critical" ? "🚨 CRITICAL" : "⚠️ WARNING"}: Budget Variance Alert`,
              content: `Budget item has exceeded the ${alertLevel} threshold.\n\n` +
                `Budget: $${budgetAmount.toFixed(2)}\n` +
                `Actual Spent: $${actualAmount.toFixed(2)}\n` +
                `Overspending: $${variance.toFixed(2)} (${variancePercentage.toFixed(2)}%)\n\n` +
                `Threshold: ${warningThreshold}%`,
            });
          } catch (error: any) {
            console.warn('[Variance Alert] Failed to send notification:', error.message);
          }
        }

        return {
          alertTriggered: true,
          alertLevel,
          variancePercentage: variancePercentage.toFixed(2),
          message: `${alertLevel.toUpperCase()} alert triggered for ${variancePercentage.toFixed(2)}% overspending`,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to check variance: ${error.message}`,
        });
      }
    }),
});

export type VarianceAlertsRouter = typeof varianceAlertsRouter;
