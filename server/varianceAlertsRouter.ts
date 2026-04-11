import { z } from "zod";
import { router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { varianceAlerts } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";

export const varianceAlertsRouter = router({
  /**
   * Create a variance alert when budget item exceeds threshold
   */
  createAlert: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        budgetId: z.number(),
        category: z.string().optional(),
        alertType: z.enum(['budget_exceeded', 'threshold_exceeded', 'forecast_variance']),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        budgetAmount: z.number(),
        actualAmount: z.number(),
        variance: z.number(),
        variancePercentage: z.number(),
        thresholdPercentage: z.number(),
        description: z.string().optional(),
        notifyOwner: z.boolean().default(false),
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
        // Create alert record
        const result = await db.insert(varianceAlerts).values({
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          projectId: input.projectId,
          budgetId: input.budgetId,
          category: input.category || null,
          alertType: input.alertType,
          severity: input.severity,
          budgetAmount: input.budgetAmount.toString(),
          actualAmount: input.actualAmount.toString(),
          variance: input.variance.toString(),
          variancePercentage: input.variancePercentage.toString(),
          thresholdPercentage: input.thresholdPercentage.toString(),
          status: 'active',
          notificationSent: 0,
          description: input.description || null,
          notes: null,
        });

        // Send notification if requested
        if (input.notifyOwner) {
          try {
            await notifyOwner({
              title: `${input.severity.toUpperCase()}: Budget Alert - ${input.alertType.replace('_', ' ')}`,
              content: `Project ID: ${input.projectId}\n\n` +
                `Budget Amount: $${input.budgetAmount.toFixed(2)}\n` +
                `Actual Amount: $${input.actualAmount.toFixed(2)}\n` +
                `Variance: $${input.variance.toFixed(2)} (${input.variancePercentage.toFixed(2)}%)\n\n` +
                `${input.description || ''}`,
            });
          } catch (error: any) {
            console.warn('[Variance Alert] Failed to send notification:', error.message);
          }
        }

        return { success: true, message: "Alert created successfully" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create alert: ${error.message}`,
        });
      }
    }),

  /**
   * Get alerts for a project with optional filtering
   */
  getAlerts: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        status: z.enum(['active', 'acknowledged', 'resolved', 'dismissed']).optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
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
        let whereCondition = and(
          eq(varianceAlerts.projectId, input.projectId),
          eq(varianceAlerts.organizationId, ctx.scope.organizationId),
          eq(varianceAlerts.operatingUnitId, ctx.scope.operatingUnitId),
          eq(varianceAlerts.isDeleted, 0)
        );

        if (input.status) {
          whereCondition = and(whereCondition, eq(varianceAlerts.status, input.status));
        }

        if (input.severity) {
          whereCondition = and(whereCondition, eq(varianceAlerts.severity, input.severity));
        }

        const alerts = await db
          .select()
          .from(varianceAlerts)
          .where(whereCondition)
          .orderBy(desc(varianceAlerts.createdAt))
          .limit(input.limit);

        return alerts;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch alerts: ${error.message}`,
        });
      }
    }),

  /**
   * Get alert summary statistics
   */
  getSummary: scopedProcedure
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
          );

        const total = alerts.length;
        const active = alerts.filter(a => a.status === 'active').length;
        const acknowledged = alerts.filter(a => a.status === 'acknowledged').length;
        const critical = alerts.filter(a => a.severity === 'critical').length;
        const high = alerts.filter(a => a.severity === 'high').length;

        return {
          total,
          active,
          acknowledged,
          critical,
          high,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch summary: ${error.message}`,
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

      const userId = ctx.user.id;

      try {
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
   * Resolve an alert
   */
  resolveAlert: scopedProcedure
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

      const userId = ctx.user.id;

      try {
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
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
            resolvedBy: userId,
            notes: input.notes || alert.notes,
          })
          .where(eq(varianceAlerts.id, input.alertId));

        return { success: true, message: "Alert resolved successfully" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to resolve alert: ${error.message}`,
        });
      }
    }),

  /**
   * Dismiss an alert
   */
  dismissAlert: scopedProcedure
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

      const userId = ctx.user.id;

      try {
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
            status: 'dismissed',
            notes: input.notes || alert.notes,
          })
          .where(eq(varianceAlerts.id, input.alertId));

        return { success: true, message: "Alert dismissed successfully" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to dismiss alert: ${error.message}`,
        });
      }
    }),

  /**
   * Delete an alert (soft delete)
   */
  deleteAlert: scopedProcedure
    .input(z.object({ alertId: z.number() }))
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

      const userId = ctx.user.id;

      try {
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

        // Soft delete
        await db
          .update(varianceAlerts)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
          })
          .where(eq(varianceAlerts.id, input.alertId));

        return { success: true, message: "Alert deleted successfully" };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete alert: ${error.message}`,
        });
      }
    }),
});

export type VarianceAlertsRouter = typeof varianceAlertsRouter;
