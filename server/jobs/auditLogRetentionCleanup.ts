/**
 * Audit Log Retention Cleanup Job
 * Runs weekly (Sunday 2:00 AM UTC) to delete audit logs older than 90 days
 * Helps manage database size and comply with data retention policies
 */

import cron from 'node-cron';
import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { lt } from 'drizzle-orm';

const RETENTION_DAYS = 90;
const CRON_SCHEDULE = '0 2 * * 0'; // Sunday 2:00 AM UTC

/**
 * Calculate the cutoff date for log deletion
 * Deletes logs older than RETENTION_DAYS
 */
function getCutoffDate(): Date {
  const now = new Date();
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return cutoff;
}

/**
 * Execute the retention cleanup job
 * Deletes all audit logs older than the retention threshold
 */
async function executeRetentionCleanup(): Promise<{ deletedCount: number; cutoffDate: Date }> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[auditLogRetentionCleanup] Database not available');
      return { deletedCount: 0, cutoffDate: getCutoffDate() };
    }

    const cutoffDate = getCutoffDate();
    console.log(`[auditLogRetentionCleanup] Starting cleanup for logs older than ${cutoffDate.toISOString()}`);

    // Delete old audit logs
    const result = await db
      .delete(auditLogs)
      .where(lt(auditLogs.createdAt, cutoffDate));

    const deletedCount = result.rowsAffected || 0;

    console.log(
      `[auditLogRetentionCleanup] ✓ Successfully deleted ${deletedCount} audit logs older than ${RETENTION_DAYS} days`
    );

    return { deletedCount, cutoffDate };
  } catch (error) {
    console.error('[auditLogRetentionCleanup] ✗ Error during cleanup:', error);
    return { deletedCount: 0, cutoffDate: getCutoffDate() };
  }
}

/**
 * Schedule the retention cleanup job
 * Runs weekly on Sunday at 2:00 AM UTC
 */
export function scheduleAuditLogRetentionCleanup(): cron.ScheduledTask | null {
  try {
    const task = cron.schedule(CRON_SCHEDULE, async () => {
      console.log(`[auditLogRetentionCleanup] Cron job triggered at ${new Date().toISOString()}`);
      const result = await executeRetentionCleanup();
      console.log(
        `[auditLogRetentionCleanup] Job completed: deleted ${result.deletedCount} logs, cutoff date: ${result.cutoffDate.toISOString()}`
      );
    });

    console.log(
      `[auditLogRetentionCleanup] ✓ Scheduled weekly retention cleanup (${CRON_SCHEDULE}) - ${RETENTION_DAYS} day threshold`
    );
    return task;
  } catch (error) {
    console.error('[auditLogRetentionCleanup] ✗ Failed to schedule cron job:', error);
    return null;
  }
}

/**
 * Stop the retention cleanup job
 */
export function stopAuditLogRetentionCleanup(task: cron.ScheduledTask | null): void {
  if (task) {
    task.stop();
    console.log('[auditLogRetentionCleanup] ✓ Retention cleanup job stopped');
  }
}

/**
 * Manually trigger the retention cleanup (for testing or on-demand execution)
 */
export async function triggerRetentionCleanupManually(): Promise<{ deletedCount: number; cutoffDate: Date }> {
  console.log('[auditLogRetentionCleanup] Manual cleanup triggered');
  return executeRetentionCleanup();
}
