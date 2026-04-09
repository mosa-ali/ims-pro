/**
 * Outbox Background Worker
 * 
 * Processes queued notification outbox entries and sends them via the
 * configured email provider. Implements exponential backoff retry with
 * dead-letter for permanently failed items.
 * 
 * Retry schedule (exponential backoff):
 *   Attempt 1: immediate
 *   Attempt 2: +1 minute
 *   Attempt 3: +5 minutes
 *   Attempt 4: +15 minutes
 *   Attempt 5: +1 hour
 *   After 5 failed attempts: moved to dead_letter
 * 
 * The worker runs on a configurable interval (default: 30 seconds).
 */

import { getDb } from "../db";
import { notificationOutbox, emailProviderSettings } from "../../drizzle/schema";
import { eq, and, or, lte, isNull, sql } from "drizzle-orm";
import { sendEmail, renderTemplate } from "./emailService";

// ============================================================================
// Configuration
// ============================================================================

/** Maximum number of send attempts before moving to dead_letter */
const MAX_ATTEMPTS = 5;

/** Worker polling interval in milliseconds (default: 30 seconds) */
const WORKER_INTERVAL_MS = 30_000;

/** Batch size — how many outbox entries to process per tick */
const BATCH_SIZE = 20;

/** Retry delay schedule in milliseconds (indexed by attempt number - 1) */
const RETRY_DELAYS_MS = [
  0,              // Attempt 1: immediate
  1 * 60_000,     // Attempt 2: +1 minute
  5 * 60_000,     // Attempt 3: +5 minutes
  15 * 60_000,    // Attempt 4: +15 minutes
  60 * 60_000,    // Attempt 5: +1 hour
];

/** Calculate the next retry timestamp based on attempt count */
function getNextRetryAt(attemptCount: number): Date | null {
  if (attemptCount >= MAX_ATTEMPTS) return null; // Will be dead-lettered
  const delayMs = RETRY_DELAYS_MS[attemptCount] || 4 * 60 * 60_000; // 4 hours fallback
  return new Date(Date.now() + delayMs);
}

// ============================================================================
// Worker State
// ============================================================================

let workerInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

// ============================================================================
// Core Processing Logic
// ============================================================================

/**
 * Process a single batch of outbox entries.
 * Called on each worker tick.
 */
async function processBatch(): Promise<{ processed: number; sent: number; failed: number; deadLettered: number }> {
  if (isProcessing) {
    return { processed: 0, sent: 0, failed: 0, deadLettered: 0 };
  }

  isProcessing = true;
  const stats = { processed: 0, sent: 0, failed: 0, deadLettered: 0 };

  try {
    const db = await getDb();
    const now = new Date();

    // Fetch entries that are ready to be processed:
    // 1. Status = "queued" (new entries)
    // 2. Status = "failed" AND nextRetryAt <= now (retry-ready entries)
    const entries = await db
      .select()
      .from(notificationOutbox)
      .where(
        or(
          eq(notificationOutbox.status, "queued"),
          and(
            eq(notificationOutbox.status, "failed"),
            or(
              lte(notificationOutbox.nextRetryAt, now),
              isNull(notificationOutbox.nextRetryAt),
            ),
          ),
        )
      )
      .limit(BATCH_SIZE);

    if (entries.length === 0) {
      return stats;
    }

    for (const entry of entries) {
      stats.processed++;

      // Mark as "sending"
      await db
        .update(notificationOutbox)
        .set({ status: "sending" })
        .where(eq(notificationOutbox.id, entry.id));

      try {
        // Only process email channel for now
        if (entry.channel === "email") {
          // Parse recipients
          let recipients: string[] = [];
          try {
            recipients = JSON.parse(entry.recipients || "[]");
          } catch {
            recipients = (entry.recipients || "").split(",").map((e) => e.trim()).filter(Boolean);
          }

          if (recipients.length === 0) {
            throw new Error("No recipients specified");
          }

          // Parse payload
          let payload: Record<string, any> = {};
          try {
            payload = JSON.parse(entry.payloadJson || "{}");
          } catch {
            payload = {};
          }

          // Get bodyHtml from payload or build a default
          let bodyHtml = payload.bodyHtml || "";
          if (!bodyHtml) {
            bodyHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${entry.subject || "Notification"}</h2>
                <p>${payload.customMessage || "You have a new notification."}</p>
                ${payload.actionUrl ? `<p><a href="${payload.actionUrl}" style="color: #2563eb;">View Details</a></p>` : ""}
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="color: #6b7280; font-size: 12px;">This is an automated notification from the Integrated Management System.</p>
              </div>
            `;
          }

          // Render template variables if present
          if (payload.variables && typeof payload.variables === "object") {
            bodyHtml = renderTemplate(bodyHtml, payload.variables);
            const subject = renderTemplate(entry.subject || "", payload.variables);
            entry.subject = subject;
          }

          // Send the email
          const result = await sendEmail({
            organizationId: entry.organizationId,
            to: recipients,
            subject: entry.subject || "Notification",
            bodyHtml,
            bodyText: payload.bodyText,
            cc: payload.cc,
            bcc: payload.bcc,
          });

          if (result.success) {
            // Mark as sent
            await db
              .update(notificationOutbox)
              .set({
                status: "sent",
                sentAt: new Date(),
                attemptCount: entry.attemptCount + 1,
                lastError: null,
                nextRetryAt: null,
              })
              .where(eq(notificationOutbox.id, entry.id));
            stats.sent++;
          } else {
            throw new Error(result.error || "Email send failed");
          }
        } else if (entry.channel === "inapp") {
          // In-app notifications are handled differently (e.g., stored in a notifications table)
          // For now, mark as sent since in-app notifications are already in the outbox as a record
          await db
            .update(notificationOutbox)
            .set({
              status: "sent",
              sentAt: new Date(),
              attemptCount: entry.attemptCount + 1,
            })
            .where(eq(notificationOutbox.id, entry.id));
          stats.sent++;
        }
      } catch (err: any) {
        const newAttemptCount = entry.attemptCount + 1;
        const errorMessage = err.message || "Unknown error";

        if (newAttemptCount >= MAX_ATTEMPTS) {
          // Move to dead_letter
          await db
            .update(notificationOutbox)
            .set({
              status: "dead_letter",
              attemptCount: newAttemptCount,
              lastError: `[Dead Letter] ${errorMessage} (after ${newAttemptCount} attempts)`,
              nextRetryAt: null,
            })
            .where(eq(notificationOutbox.id, entry.id));
          stats.deadLettered++;
        } else {
          // Mark as failed with next retry time
          const nextRetry = getNextRetryAt(newAttemptCount);
          await db
            .update(notificationOutbox)
            .set({
              status: "failed",
              attemptCount: newAttemptCount,
              lastError: errorMessage,
              nextRetryAt: nextRetry,
            })
            .where(eq(notificationOutbox.id, entry.id));
          stats.failed++;
        }
      }
    }

    return stats;
  } catch (err: any) {
    console.error("[OutboxWorker] Batch processing error:", err.message);
    return stats;
  } finally {
    isProcessing = false;
  }
}

// ============================================================================
// Worker Lifecycle
// ============================================================================

/**
 * Start the outbox background worker.
 * Should be called once during server startup.
 */
export function startOutboxWorker(): void {
  if (workerInterval) {
    console.log("[OutboxWorker] Worker already running");
    return;
  }

  console.log(`[OutboxWorker] Starting with ${WORKER_INTERVAL_MS / 1000}s interval, batch size ${BATCH_SIZE}, max attempts ${MAX_ATTEMPTS}`);

  // Run immediately on start
  processBatch().then((stats) => {
    if (stats.processed > 0) {
      console.log(`[OutboxWorker] Initial batch: ${stats.processed} processed, ${stats.sent} sent, ${stats.failed} failed, ${stats.deadLettered} dead-lettered`);
    }
  });

  // Then run on interval
  workerInterval = setInterval(async () => {
    const stats = await processBatch();
    if (stats.processed > 0) {
      console.log(`[OutboxWorker] Batch: ${stats.processed} processed, ${stats.sent} sent, ${stats.failed} failed, ${stats.deadLettered} dead-lettered`);
    }
  }, WORKER_INTERVAL_MS);
}

/**
 * Stop the outbox background worker.
 * Should be called during graceful shutdown.
 */
export function stopOutboxWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[OutboxWorker] Worker stopped");
  }
}

/**
 * Check if the worker is currently running.
 */
export function isWorkerRunning(): boolean {
  return workerInterval !== null;
}

/**
 * Manually trigger a batch processing (useful for testing or admin actions).
 */
export async function triggerBatch(): Promise<{ processed: number; sent: number; failed: number; deadLettered: number }> {
  return processBatch();
}
