import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { systemSettings, auditLogs } from "../../drizzle/schema";
import { triggerAutoPurge } from "../services/autoPurgeJob";

/**
 * Retention Policy Router
 * Manages auto-purge retention periods for deleted records
 * 
 * Platform admins can configure how long deleted records are kept
 * before being automatically and permanently deleted
 */

const RETENTION_POLICY_KEY = "retention_period_days";

export const retentionPolicyRouter = router({
  // Get current retention policy
  get: adminProcedure
    .query(async () => {
      const db = await getDb();
      
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, RETENTION_POLICY_KEY))
        .limit(1);

      if (!setting) {
        // Default: Never auto-purge (null)
        return {
          retentionPeriodDays: null,
          updatedAt: Date.now(),
          updatedBy: null,
        };
      }

      const days = setting.settingValue === 'null' ? null : parseInt(setting.settingValue || '');

      return {
        retentionPeriodDays: isNaN(days) ? null : days,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy,
      };
    }),

  // Update retention policy
  update: adminProcedure
    .input(z.object({
      retentionPeriodDays: z.number().nullable(), // null means "Never"
    }))
    .mutation(async ({ input, ctx }) => {
      const { retentionPeriodDays } = input;
      const db = await getDb();
      const now = Date.now();

      // Validate input
      if (retentionPeriodDays !== null) {
        if (retentionPeriodDays < 1) {
          throw new Error("Retention period must be at least 1 day or null (Never)");
        }
        if (![30, 60, 90, 365].includes(retentionPeriodDays)) {
          throw new Error("Retention period must be 30, 60, 90, or 365 days");
        }
      }

      const settingValue = retentionPeriodDays === null ? 'null' : retentionPeriodDays.toString();

      // Check if setting exists
      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, RETENTION_POLICY_KEY))
        .limit(1);

      if (existing) {
        // Update existing setting
        await db
          .update(systemSettings)
          .set({
            settingValue,
            updatedAt: now,
            updatedBy: ctx.user.id,
          })
          .where(eq(systemSettings.settingKey, RETENTION_POLICY_KEY));
      } else {
        // Insert new setting
        await db.insert(systemSettings).values({
          settingKey: RETENTION_POLICY_KEY,
          settingValue,
          updatedAt: now,
          updatedBy: ctx.user.id,
        });
      }

      // Create audit log
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "retention_policy_updated",
        entityType: "system_settings",
        details: JSON.stringify({ retentionPeriodDays, previousValue: existing?.settingValue }),
      });

      return {
        success: true,
        retentionPeriodDays,
      };
    }),

  // Manually trigger the auto-purge job (admin only)
  triggerPurge: adminProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();

      // Log the manual trigger
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "auto_purge_manual_trigger",
        entityType: "system",
        details: JSON.stringify({
          triggeredBy: ctx.user.name || ctx.user.email,
          triggeredAt: new Date().toISOString(),
        }),
      });

      const result = await triggerAutoPurge();

      return {
        success: true,
        ...result,
      };
    }),
});
