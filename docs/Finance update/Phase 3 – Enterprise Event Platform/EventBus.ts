/**
 * EventBus.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Core Event Bus — implements IDomainEventBus (Phase 2 interface)
 *
 * PHASE 3: Enterprise Event Platform
 *
 * In-process event bus with persistent store hook.
 * Supports: publish, subscribe (pattern), replay, DLQ, retry, snapshots.
 *
 * Per ADR-002: All finance operations flow through this bus.
 * Per ADR-015: sourceEventId on every event for idempotency.
 *
 * NOTE: In-memory store for Phase 3 MVP.
 * Phase 4 will add persistent EventStore (PostgreSQL / EventStoreDB).
 */

import { v4 as uuidv4 } from 'uuid';
import { TRPCError } from '@trpc/server';
import type { IDomainEventBus } from '../09_FinanceOrchestratorInterfaces';
import type { IFinancialEventEnvelope, IEventMetadata } from './FinancialEventTypes';
import { FinancialEventType, FinancialEventEnvelopeSchema } from './FinancialEventTypes';

// ────────────────────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ────────────────────────────────────────────────────────────────────────────

type EventHandler = (
  eventType: string,
  payload: Record<string, unknown>,
  metadata: Record<string, unknown>,
) => Promise<void>;

interface SubscriptionRecord {
  subscriptionId: string;
  patterns: string[];
  handler: EventHandler;
  groupId?: string;
  maxRetries: number;
  createdAt: string;
}

interface DeadLetterRecord {
  dlqId: string;
  eventId: string;
  reason: string;
  context: Record<string, unknown>;
  createdAt: string;
  status: 'pending' | 'resolved' | 'failed';
}

interface SnapshotRecord {
  snapshotId: string;
  stateHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// EVENT BUS
// ────────────────────────────────────────────────────────────────────────────

export class EventBus implements IDomainEventBus {
  /** pattern → set of handlers */
  private subscriptions = new Map<string, Set<EventHandler>>();
  /** subscriptionId → record */
  private subscriptionIndex = new Map<string, SubscriptionRecord>();
  /** eventId → envelope (in-memory cache) */
  private eventLog = new Map<string, IFinancialEventEnvelope>();
  /** dlqId → record */
  private dlq = new Map<string, DeadLetterRecord>();
  /** snapshotId → record */
  private snapshots = new Map<string, SnapshotRecord>();
  /** database connection (Drizzle ORM) */
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLISH
  // ──────────────────────────────────────────────────────────────────────────

  async publish<T = Record<string, unknown>>(
    eventType: string,
    payload: T,
    context: {
      sourceEventId: string;
      organizationId: number;
      operatingUnitId: number;
      userId: number;
      timestamp?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{ eventId: string; publishedAt: string }> {
    const eventId = uuidv4();
    const publishedAt = context.timestamp || new Date().toISOString();

    const envelope: IFinancialEventEnvelope<T> = {
      eventId,
      eventType: eventType as FinancialEventType,
      eventVersion: 1,
      timestamp: publishedAt,
      sourceEventId: context.sourceEventId,
      organizationId: context.organizationId,
      operatingUnitId: context.operatingUnitId,
      userId: context.userId,
      userRole: 'system',
      payload,
      metadata: {
        correlationId: (context.metadata?.correlationId as string) || uuidv4(),
        traceId: (context.metadata?.traceId as string) || uuidv4(),
        source: ((context.metadata?.source as string) || 'api') as IEventMetadata['source'],
      },
      schemaVersion: '1.0.0',
    };

    // Store in log
    this.eventLog.set(eventId, envelope as IFinancialEventEnvelope);

    // TODO: persist to finance_events table via Drizzle ORM

    // Fan out to subscribers
    await this.fanOut(envelope as IFinancialEventEnvelope);

    return { eventId, publishedAt };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUBSCRIBE
  // ──────────────────────────────────────────────────────────────────────────

  async subscribe(
    eventPattern: string | string[],
    handler: EventHandler,
    options?: {
      fromTimestamp?: string;
      groupId?: string;
      maxRetries?: number;
    },
  ): Promise<{ subscriptionId: string }> {
    const subscriptionId = uuidv4();
    const patterns = Array.isArray(eventPattern) ? eventPattern : [eventPattern];

    const record: SubscriptionRecord = {
      subscriptionId,
      patterns,
      handler,
      groupId: options?.groupId,
      maxRetries: options?.maxRetries ?? 3,
      createdAt: new Date().toISOString(),
    };
    this.subscriptionIndex.set(subscriptionId, record);

    for (const p of patterns) {
      if (!this.subscriptions.has(p)) {
        this.subscriptions.set(p, new Set());
      }
      this.subscriptions.get(p)!.add(handler);
    }

    // If requested, replay past events to this handler
    if (options?.fromTimestamp) {
      await this.replayTo(patterns, handler, options.fromTimestamp);
    }

    return { subscriptionId };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UNSUBSCRIBE
  // ──────────────────────────────────────────────────────────────────────────

  async unsubscribe(subscriptionId: string): Promise<void> {
    const record = this.subscriptionIndex.get(subscriptionId);
    if (!record) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Subscription ${subscriptionId} not found` });
    }
    for (const p of record.patterns) {
      this.subscriptions.get(p)?.delete(record.handler);
    }
    this.subscriptionIndex.delete(subscriptionId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // REPLAY
  // ──────────────────────────────────────────────────────────────────────────

  async replay(
    filters: {
      eventTypePattern?: string;
      organizationId?: number;
      operatingUnitId?: number;
      sourceEventIdPattern?: string;
      fromTimestamp?: string;
      toTimestamp?: string;
    },
    handler: EventHandler,
  ): Promise<{ eventsReplayed: number; duration: string }> {
    const t0 = Date.now();
    let count = 0;

    for (const [, evt] of this.eventLog) {
      if (filters.organizationId && evt.organizationId !== filters.organizationId) continue;
      if (filters.operatingUnitId && evt.operatingUnitId !== filters.operatingUnitId) continue;
      if (filters.fromTimestamp && evt.timestamp < filters.fromTimestamp) continue;
      if (filters.toTimestamp && evt.timestamp > filters.toTimestamp) continue;
      if (filters.eventTypePattern && !this.matches(evt.eventType, filters.eventTypePattern)) continue;

      try {
        await handler(evt.eventType, evt.payload as Record<string, unknown>, evt.metadata as unknown as Record<string, unknown>);
        count++;
      } catch (err) {
        console.error(`[EventBus:replay] handler error for ${evt.eventId}`, err);
      }
    }

    return { eventsReplayed: count, duration: `${Date.now() - t0}ms` };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DEAD LETTER QUEUE
  // ──────────────────────────────────────────────────────────────────────────

  async deadLetter(
    eventId: string,
    reason: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    const dlqId = uuidv4();
    this.dlq.set(dlqId, {
      dlqId,
      eventId,
      reason,
      context,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    console.log(`[DLQ] Event ${eventId} → DLQ: ${reason}`);
    // TODO: persist to dead_letter_queue table
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RETRY
  // ──────────────────────────────────────────────────────────────────────────

  async retry(
    eventId: string,
    maxAttempts: number = 3,
    backoffMs: number = 1000,
  ): Promise<{ retryScheduled: boolean; nextRetryAt?: string }> {
    const evt = this.eventLog.get(eventId);
    if (!evt) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Event ${eventId} not found` });
    }
    const delay = backoffMs * Math.pow(2, maxAttempts - 1);
    const nextRetryAt = new Date(Date.now() + delay).toISOString();

    console.log(`[RETRY] Event ${eventId} scheduled at ${nextRetryAt}`);
    // TODO: schedule via job queue (Bull, BullMQ, Agenda, etc.)

    return { retryScheduled: true, nextRetryAt };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SNAPSHOT
  // ──────────────────────────────────────────────────────────────────────────

  async snapshot(
    snapshotId: string,
    stateHash: string,
    metadata: Record<string, unknown>,
  ): Promise<{ snapshotId: string; createdAt: string }> {
    const createdAt = new Date().toISOString();
    this.snapshots.set(snapshotId, { snapshotId, stateHash, metadata, createdAt });
    console.log(`[SNAPSHOT] ${snapshotId} created`);
    // TODO: persist to event_snapshots table
    return { snapshotId, createdAt };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DIAGNOSTICS (not in interface — useful for ops)
  // ──────────────────────────────────────────────────────────────────────────

  /** Return counts for monitoring dashboards */
  getStats() {
    const dlqPending = [...this.dlq.values()].filter(e => e.status === 'pending').length;
    return {
      totalEvents: this.eventLog.size,
      activeSubscriptions: this.subscriptionIndex.size,
      dlqPending,
      dlqTotal: this.dlq.size,
      snapshots: this.snapshots.size,
    };
  }

  /** Retrieve an event by id */
  getEvent(eventId: string): IFinancialEventEnvelope | undefined {
    return this.eventLog.get(eventId);
  }

  /** List DLQ entries for admin UI */
  getDLQEntries(status?: 'pending' | 'resolved' | 'failed'): DeadLetterRecord[] {
    const all = [...this.dlq.values()];
    return status ? all.filter(e => e.status === status) : all;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE
  // ──────────────────────────────────────────────────────────────────────────

  /** Fan-out: call every handler whose pattern matches this event */
  private async fanOut(evt: IFinancialEventEnvelope): Promise<void> {
    const toCall: EventHandler[] = [];

    for (const [pattern, handlers] of this.subscriptions) {
      if (this.matches(evt.eventType, pattern)) {
        for (const h of handlers) toCall.push(h);
      }
    }

    // Fire-and-forget — failures go to DLQ
    for (const handler of toCall) {
      try {
        await handler(
          evt.eventType,
          evt.payload as Record<string, unknown>,
          evt.metadata as unknown as Record<string, unknown>,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[EventBus] handler failed for ${evt.eventType}: ${msg}`);
        await this.deadLetter(evt.eventId, msg, { eventType: evt.eventType });
      }
    }
  }

  /** Glob-style pattern match: exact, prefix*, or * */
  private matches(eventType: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;
    if (pattern.endsWith('*')) return eventType.startsWith(pattern.slice(0, -1));
    return false;
  }

  /** Replay past events to a newly-registered handler */
  private async replayTo(
    patterns: string[],
    handler: EventHandler,
    fromTimestamp: string,
  ): Promise<void> {
    for (const [, evt] of this.eventLog) {
      if (evt.timestamp < fromTimestamp) continue;
      for (const p of patterns) {
        if (this.matches(evt.eventType, p)) {
          try {
            await handler(
              evt.eventType,
              evt.payload as Record<string, unknown>,
              evt.metadata as unknown as Record<string, unknown>,
            );
          } catch (err) {
            console.error(`[EventBus:replayTo] error`, err);
          }
          break; // only call once per event even if multiple patterns match
        }
      }
    }
  }
}
