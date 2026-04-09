import { getDb } from "../db";
import { eq, and, lt, isNotNull, sql } from "drizzle-orm";
import { systemSettings, users, auditLogs, purgeNotifications } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";

const RETENTION_POLICY_KEY = "retention_period_days";
const PURGE_JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PURGE_WARNING_DAYS = 7; // Warn admins 7 days before purge

/**
 * Auto-Purge Scheduled Job
 * 
 * Runs daily to:
 * 1. Check the retention policy setting
 * 2. Identify soft-deleted records that exceed the retention period
 * 3. Send warning notifications for records approaching purge date
 * 4. Permanently delete records that have exceeded the retention period
 * 5. Log all actions to the audit log for compliance
 */

interface PurgeResult {
  totalPurged: number;
  totalWarnings: number;
  errors: string[];
  details: {
    entityType: string;
    count: number;
  }[];
}

async function getRetentionPeriodDays(): Promise<number | null> {
  const db = await getDb();
  const [setting] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, RETENTION_POLICY_KEY))
    .limit(1);

  if (!setting || setting.settingValue === "null" || !setting.settingValue) {
    return null; // Never auto-purge
  }

  const days = parseInt(setting.settingValue);
  return isNaN(days) ? null : days;
}

async function purgeExpiredUsers(retentionDays: number): Promise<{ purged: number; warned: number; errors: string[] }> {
  const db = await getDb();
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const warningDate = new Date(now.getTime() - (retentionDays - PURGE_WARNING_DAYS) * 24 * 60 * 60 * 1000);

  let purged = 0;
  let warned = 0;
  const errors: string[] = [];

  try {
    // Find users deleted before the cutoff date (ready for permanent deletion)
    const expiredUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        deletedAt: users.deletedAt,
        deletionReason: users.deletionReason,
      })
      .from(users)
      .where(
        and(
          eq(users.isDeleted, true),
          isNotNull(users.deletedAt),
          lt(users.deletedAt, cutoffDate)
        )
      );

    // Permanently delete expired users
    for (const user of expiredUsers) {
      try {
        // Log the permanent deletion to audit log BEFORE deleting
        await db.insert(auditLogs).values({
          userId: null, // System action
          action: "auto_purge_permanent_delete",
          entityType: "user",
          entityId: user.id,
          details: JSON.stringify({
            purgedUser: {
              id: user.id,
              name: user.name,
              email: user.email,
              deletedAt: user.deletedAt?.toISOString(),
              deletionReason: user.deletionReason,
            },
            retentionPeriodDays: retentionDays,
            purgedAt: now.toISOString(),
            reason: `Auto-purged: exceeded ${retentionDays}-day retention period`,
          }),
        });

        // Permanently delete the user record
        await db.delete(users).where(eq(users.id, user.id));
        purged++;
      } catch (err) {
        const errMsg = `Failed to purge user ${user.id} (${user.email}): ${err instanceof Error ? err.message : "Unknown error"}`;
        errors.push(errMsg);
        console.error(`[AutoPurge] ${errMsg}`);
      }
    }

    // Find users approaching purge date (for warning notifications)
    const warningUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(
        and(
          eq(users.isDeleted, true),
          isNotNull(users.deletedAt),
          lt(users.deletedAt, warningDate),
          // Not yet past the cutoff (those were already purged)
          sql`${users.deletedAt} >= ${cutoffDate}`
        )
      );

    // Send warning notifications for users approaching purge
    for (const user of warningUsers) {
      try {
        // Check if we already sent a notification for this record
        const [existingNotification] = await db
          .select()
          .from(purgeNotifications)
          .where(
            and(
              eq(purgeNotifications.recordId, user.id),
              eq(purgeNotifications.recordType, "user")
            )
          )
          .limit(1);

        if (!existingNotification) {
          const scheduledPurgeDate = new Date(
            (user.deletedAt?.getTime() || 0) + retentionDays * 24 * 60 * 60 * 1000
          ).getTime();

          await db.insert(purgeNotifications).values({
            recordId: user.id,
            recordType: "user",
            scope: "platform",
            scheduledPurgeDate,
            notificationSentAt: Date.now(),
            notificationStatus: "sent",
            createdAt: Date.now(),
          });

          warned++;
        }
      } catch (err) {
        console.error(`[AutoPurge] Warning notification failed for user ${user.id}:`, err);
      }
    }
  } catch (err) {
    const errMsg = `User purge scan failed: ${err instanceof Error ? err.message : "Unknown error"}`;
    errors.push(errMsg);
    console.error(`[AutoPurge] ${errMsg}`);
  }

  return { purged, warned, errors };
}

async function runAutoPurge(): Promise<PurgeResult> {
  const result: PurgeResult = {
    totalPurged: 0,
    totalWarnings: 0,
    errors: [],
    details: [],
  };

  console.log(`[AutoPurge] Starting auto-purge job at ${new Date().toISOString()}`);

  // 1. Get retention policy
  const retentionDays = await getRetentionPeriodDays();

  if (retentionDays === null) {
    console.log("[AutoPurge] Retention policy is set to 'Never'. Skipping auto-purge.");
    return result;
  }

  console.log(`[AutoPurge] Retention period: ${retentionDays} days`);

  // 2. Purge expired users
  const userResult = await purgeExpiredUsers(retentionDays);
  result.totalPurged += userResult.purged;
  result.totalWarnings += userResult.warned;
  result.errors.push(...userResult.errors);
  if (userResult.purged > 0) {
    result.details.push({ entityType: "user", count: userResult.purged });
  }

  // 3. Log the purge job execution to audit log
  const db = await getDb();
  await db.insert(auditLogs).values({
    userId: null, // System action
    action: "auto_purge_job_executed",
    entityType: "system",
    details: JSON.stringify({
      retentionPeriodDays: retentionDays,
      executedAt: new Date().toISOString(),
      totalPurged: result.totalPurged,
      totalWarnings: result.totalWarnings,
      errors: result.errors.length > 0 ? result.errors : undefined,
      details: result.details,
    }),
  });

  // 4. Notify owner if any records were purged
  if (result.totalPurged > 0) {
    try {
      const detailLines = result.details
        .map((d) => `- ${d.entityType}: ${d.count} records`)
        .join("\n");

      await notifyOwner({
        title: `Auto-Purge Completed: ${result.totalPurged} records permanently deleted`,
        content: `The auto-purge job has permanently deleted ${result.totalPurged} records that exceeded the ${retentionDays}-day retention period.\n\nDetails:\n${detailLines}\n\n${
          result.errors.length > 0
            ? `\nErrors encountered: ${result.errors.length}\n${result.errors.join("\n")}`
            : "No errors encountered."
        }`,
      });
    } catch (err) {
      console.error("[AutoPurge] Failed to send owner notification:", err);
    }
  }

  // 5. Notify owner about upcoming purges
  if (result.totalWarnings > 0) {
    try {
      await notifyOwner({
        title: `Auto-Purge Warning: ${result.totalWarnings} records approaching purge date`,
        content: `${result.totalWarnings} deleted records are within ${PURGE_WARNING_DAYS} days of being permanently deleted based on the ${retentionDays}-day retention policy.\n\nPlease review the Deleted Records dashboard if you wish to restore any of these records before they are permanently removed.`,
      });
    } catch (err) {
      console.error("[AutoPurge] Failed to send warning notification:", err);
    }
  }

  console.log(
    `[AutoPurge] Job completed. Purged: ${result.totalPurged}, Warnings: ${result.totalWarnings}, Errors: ${result.errors.length}`
  );

  return result;
}

let purgeInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the auto-purge scheduled job
 * Runs immediately on startup, then every 24 hours
 */
export function startAutoPurgeJob(): void {
  console.log("[AutoPurge] Initializing auto-purge scheduled job (runs every 24 hours)");

  // Run after a 30-second delay on startup to let the server fully initialize
  setTimeout(async () => {
    try {
      await runAutoPurge();
    } catch (err) {
      console.error("[AutoPurge] Initial run failed:", err);
    }
  }, 30000);

  // Schedule to run every 24 hours
  purgeInterval = setInterval(async () => {
    try {
      await runAutoPurge();
    } catch (err) {
      console.error("[AutoPurge] Scheduled run failed:", err);
    }
  }, PURGE_JOB_INTERVAL_MS);
}

/**
 * Stop the auto-purge scheduled job
 */
export function stopAutoPurgeJob(): void {
  if (purgeInterval) {
    clearInterval(purgeInterval);
    purgeInterval = null;
    console.log("[AutoPurge] Auto-purge job stopped");
  }
}

/**
 * Manually trigger the auto-purge job (for testing or admin use)
 */
export async function triggerAutoPurge(): Promise<PurgeResult> {
  return runAutoPurge();
}
