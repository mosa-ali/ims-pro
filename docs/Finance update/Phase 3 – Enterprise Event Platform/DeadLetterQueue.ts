/**
 * DeadLetterQueue.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Dead Letter Queue for failed events
 *
 * PHASE 3: Enterprise Event Platform
 *
 * Events land here when:
 *  1. A subscriber handler throws after maxRetries
 *  2. An event cannot be deserialized (schema mismatch)
 *  3. A downstream service is unavailable
 *  4. Manual quarantine by an operator
 *
 * Lifecycle:
 *   pending  →  retry  →  resolved   (happy path)
 *   pending  →  retry  →  retry  →  abandoned   (gave up)
 *   pending  →  manual_intervention  →  resolved   (ops fixed it)
 *
 * Per ADR-002: No event is ever silently lost.
 */

import { v4 as uuidv4 } from 'uuid';
import type { EventBus } from './EventBus';

// ────────────────────────────────────────────────────────────────────────────
// DLQ ENTRY
// ────────────────────────────────────────────────────────────────────────────

export type DLQStatus = 'pending' | 'retrying' | 'resolved' | 'abandoned';
export type DLQResolutionAction = 'auto_retry' | 'manual_intervention' | 'abandoned' | 'requeued';

export interface DLQEntry {
  dlqId: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  originalMetadata: Record<string, unknown>;
  failureReason: string;
  failureCode?: string;
  retryCount: number;
  maxRetries: number;
  firstFailedAt: string;
  lastFailedAt: string;
  sentToDLQAt: string;
  status: DLQStatus;
  resolution?: {
    resolvedAt: string;
    resolvedBy: number;
    action: DLQResolutionAction;
    notes?: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DLQ STATISTICS
// ────────────────────────────────────────────────────────────────────────────

export interface DLQStats {
  total: number;
  pending: number;
  retrying: number;
  resolved: number;
  abandoned: number;
  oldestPendingAge?: string;
  byEventType: Record<string, number>;
}

// ────────────────────────────────────────────────────────────────────────────
// RETRY POLICY
// ────────────────────────────────────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 300_000, // 5 minutes
  backoffMultiplier: 2,
};

// ────────────────────────────────────────────────────────────────────────────
// DEAD LETTER QUEUE
// ────────────────────────────────────────────────────────────────────────────

export class DeadLetterQueue {
  private entries = new Map<string, DLQEntry>();
  private retryPolicy: RetryPolicy;
  private db: any; // Drizzle ORM connection

  constructor(db: any, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY) {
    this.db = db;
    this.retryPolicy = retryPolicy;
  }

  // ── ENQUEUE ──

  /**
   * Send a failed event to the DLQ.
   * Called by EventBus when a subscriber handler fails.
   */
  async enqueue(
    eventId: string,
    eventType: string,
    payload: Record<string, unknown>,
    failureReason: string,
    options?: {
      failureCode?: string;
      retryCount?: number;
      originalMetadata?: Record<string, unknown>;
    },
  ): Promise<DLQEntry> {
    const dlqId = uuidv4();
    const now = new Date().toISOString();

    const entry: DLQEntry = {
      dlqId,
      eventId,
      eventType,
      payload,
      originalMetadata: options?.originalMetadata || {},
      failureReason,
      failureCode: options?.failureCode,
      retryCount: options?.retryCount ?? 0,
      maxRetries: this.retryPolicy.maxRetries,
      firstFailedAt: now,
      lastFailedAt: now,
      sentToDLQAt: now,
      status: 'pending',
    };

    this.entries.set(dlqId, entry);

    console.log(
      `[DLQ:enqueue] ${eventType} (${eventId}) → DLQ [attempt ${entry.retryCount}/${entry.maxRetries}]: ${failureReason}`,
    );

    // TODO: persist to dead_letter_queue table via Drizzle ORM

    return entry;
  }

  // ── RETRY ──

  /**
   * Retry processing a DLQ entry.
   * Calls the provided handler. On success → resolved. On failure → back to DLQ.
   */
  async retry(
    dlqId: string,
    handler: (eventType: string, payload: Record<string, unknown>) => Promise<void>,
  ): Promise<{ success: boolean; entry: DLQEntry }> {
    const entry = this.entries.get(dlqId);
    if (!entry) throw new Error(`DLQ entry ${dlqId} not found`);
    if (entry.status !== 'pending' && entry.status !== 'retrying') {
      throw new Error(`DLQ entry ${dlqId} is ${entry.status}, cannot retry`);
    }

    entry.status = 'retrying';
    entry.retryCount++;

    try {
      await handler(entry.eventType, entry.payload);

      // Success
      entry.status = 'resolved';
      entry.resolution = {
        resolvedAt: new Date().toISOString(),
        resolvedBy: 0, // system
        action: 'auto_retry',
        notes: `Succeeded on retry #${entry.retryCount}`,
      };

      console.log(`[DLQ:retry] ${dlqId} RESOLVED on attempt ${entry.retryCount}`);
      return { success: true, entry };

    } catch (err) {
      entry.lastFailedAt = new Date().toISOString();
      const reason = err instanceof Error ? err.message : String(err);

      if (entry.retryCount >= entry.maxRetries) {
        // Exhausted retries — abandon
        entry.status = 'abandoned';
        entry.resolution = {
          resolvedAt: new Date().toISOString(),
          resolvedBy: 0,
          action: 'abandoned',
          notes: `Exhausted ${entry.maxRetries} retries. Last error: ${reason}`,
        };
        console.log(`[DLQ:retry] ${dlqId} ABANDONED after ${entry.retryCount} retries`);
      } else {
        entry.status = 'pending'; // back to pending for next retry
        console.log(
          `[DLQ:retry] ${dlqId} FAILED attempt ${entry.retryCount}/${entry.maxRetries}: ${reason}`,
        );
      }

      return { success: false, entry };
    }
  }

  /**
   * Calculate next retry delay using exponential backoff.
   */
  getNextRetryDelay(retryCount: number): number {
    const delay = this.retryPolicy.baseDelayMs * Math.pow(this.retryPolicy.backoffMultiplier, retryCount);
    return Math.min(delay, this.retryPolicy.maxDelayMs);
  }

  /**
   * Retry all pending entries (batch operation).
   */
  async retryAllPending(
    handler: (eventType: string, payload: Record<string, unknown>) => Promise<void>,
  ): Promise<{ succeeded: number; failed: number; abandoned: number }> {
    const pending = this.listByStatus('pending');
    let succeeded = 0;
    let failed = 0;
    let abandoned = 0;

    for (const entry of pending) {
      const result = await this.retry(entry.dlqId, handler);
      if (result.success) {
        succeeded++;
      } else if (result.entry.status === 'abandoned') {
        abandoned++;
      } else {
        failed++;
      }
    }

    return { succeeded, failed, abandoned };
  }

  // ── MANUAL RESOLUTION ──

  /**
   * Manually resolve a DLQ entry (by an operator).
   */
  resolve(
    dlqId: string,
    action: DLQResolutionAction,
    userId: number,
    notes?: string,
  ): DLQEntry {
    const entry = this.entries.get(dlqId);
    if (!entry) throw new Error(`DLQ entry ${dlqId} not found`);

    entry.status = 'resolved';
    entry.resolution = {
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId,
      action,
      notes,
    };

    console.log(`[DLQ:resolve] ${dlqId} resolved by user ${userId}: ${action}`);
    // TODO: persist to database

    return entry;
  }

  /**
   * Abandon a DLQ entry (give up).
   */
  abandon(dlqId: string, userId: number, reason: string): DLQEntry {
    return this.resolve(dlqId, 'abandoned', userId, reason);
  }

  // ── QUERIES ──

  getEntry(dlqId: string): DLQEntry | null {
    return this.entries.get(dlqId) ?? null;
  }

  listByStatus(status: DLQStatus): DLQEntry[] {
    return [...this.entries.values()].filter(e => e.status === status);
  }

  listByEventType(eventType: string): DLQEntry[] {
    return [...this.entries.values()].filter(e => e.eventType === eventType);
  }

  listAll(): DLQEntry[] {
    return [...this.entries.values()];
  }

  // ── STATISTICS ──

  getStats(): DLQStats {
    const all = [...this.entries.values()];
    const pending = all.filter(e => e.status === 'pending');
    const byEventType: Record<string, number> = {};
    for (const e of all) {
      byEventType[e.eventType] = (byEventType[e.eventType] || 0) + 1;
    }

    // Oldest pending age
    let oldestPendingAge: string | undefined;
    if (pending.length > 0) {
      const oldest = pending.sort(
        (a, b) => new Date(a.sentToDLQAt).getTime() - new Date(b.sentToDLQAt).getTime(),
      )[0];
      const ageMs = Date.now() - new Date(oldest.sentToDLQAt).getTime();
      const ageMinutes = Math.floor(ageMs / 60_000);
      oldestPendingAge = ageMinutes < 60
        ? `${ageMinutes}m`
        : `${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m`;
    }

    return {
      total: all.length,
      pending: pending.length,
      retrying: all.filter(e => e.status === 'retrying').length,
      resolved: all.filter(e => e.status === 'resolved').length,
      abandoned: all.filter(e => e.status === 'abandoned').length,
      oldestPendingAge,
      byEventType,
    };
  }

  // ── MAINTENANCE ──

  /**
   * Purge resolved/abandoned entries older than retention period.
   */
  purge(olderThanMs: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    let purged = 0;
    for (const [id, entry] of this.entries) {
      if (
        (entry.status === 'resolved' || entry.status === 'abandoned') &&
        new Date(entry.sentToDLQAt).getTime() < cutoff
      ) {
        this.entries.delete(id);
        purged++;
      }
    }
    console.log(`[DLQ:purge] Removed ${purged} entries older than ${olderThanMs}ms`);
    return purged;
  }
}
