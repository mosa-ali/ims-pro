/**
 * EventReplayService.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Event replay for temporal queries, state reconstruction, and debugging
 *
 * PHASE 3: Enterprise Event Platform
 *
 * Enables:
 *  - Reconstructing entity state from event history (event sourcing)
 *  - Temporal queries ("what was the GL balance on June 15?")
 *  - Debugging ("what happened to advance #42?")
 *  - State diffing ("what changed between T1 and T2?")
 *  - Forensic analysis ("who modified this budget and when?")
 *
 * Per ADR-002: Events are source of truth. Current state is always
 *   derivable by replaying events through a reducer.
 */

import type { EventBus } from './EventBus';
import type { FinancialEventType } from './FinancialEventTypes';

// ────────────────────────────────────────────────────────────────────────────
// REPLAY RESULT TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface ReplayedEvent {
  eventId?: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
  userId?: number;
}

export interface StateDiff<T> {
  before: T;
  after: T;
  changes: Array<{
    field: string;
    previousValue: unknown;
    currentValue: unknown;
  }>;
  eventsBetween: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPLAY SERVICE
// ────────────────────────────────────────────────────────────────────────────

export class EventReplayService {
  constructor(private bus: EventBus) {}

  /**
   * Reconstruct an entity's state by replaying events through a reducer.
   *
   * @param reducer  Pure function: (currentState, event) → newState
   * @param initial  Starting state before any events
   * @param options  Filters: event types, time range, org scope
   *
   * EXAMPLE:
   *   const balance = await replay.reconstructState(
   *     (state, evt) => {
   *       if (evt.eventType === 'finance:gl:posted') {
   *         return { ...state, totalDebit: state.totalDebit + evt.payload.totalDebit };
   *       }
   *       return state;
   *     },
   *     { totalDebit: 0, totalCredit: 0 },
   *     { eventTypes: ['finance:gl:posted'], organizationId: 1 }
   *   );
   */
  async reconstructState<T>(
    reducer: (state: T, event: ReplayedEvent) => T,
    initialState: T,
    options?: {
      eventTypes?: string[];
      organizationId?: number;
      operatingUnitId?: number;
      fromTimestamp?: string;
      toTimestamp?: string;
    },
  ): Promise<{ state: T; eventsProcessed: number; duration: string }> {
    let state = initialState;
    let count = 0;
    const t0 = Date.now();

    const pattern = options?.eventTypes?.length === 1
      ? options.eventTypes[0]
      : undefined;

    await this.bus.replay(
      {
        eventTypePattern: pattern || '*',
        organizationId: options?.organizationId,
        operatingUnitId: options?.operatingUnitId,
        fromTimestamp: options?.fromTimestamp,
        toTimestamp: options?.toTimestamp,
      },
      async (eventType, payload) => {
        // If multiple event types specified, filter here
        if (options?.eventTypes && options.eventTypes.length > 1) {
          if (!options.eventTypes.includes(eventType)) return;
        }

        const evt: ReplayedEvent = {
          eventType,
          timestamp: new Date().toISOString(),
          payload,
        };

        state = reducer(state, evt);
        count++;
      },
    );

    return {
      state,
      eventsProcessed: count,
      duration: `${Date.now() - t0}ms`,
    };
  }

  /**
   * Get historical state at a specific point in time.
   *
   * "What was the budget utilization on March 31?"
   */
  async getStateAtTime<T>(
    reducer: (state: T, event: ReplayedEvent) => T,
    initialState: T,
    timestamp: string,
    options?: {
      eventTypes?: string[];
      organizationId?: number;
      operatingUnitId?: number;
    },
  ): Promise<T> {
    const result = await this.reconstructState(reducer, initialState, {
      ...options,
      toTimestamp: timestamp,
    });
    return result.state;
  }

  /**
   * Diff state between two timestamps.
   *
   * "What changed in the cash position between June 1 and June 30?"
   */
  async diffState<T extends Record<string, unknown>>(
    reducer: (state: T, event: ReplayedEvent) => T,
    initialState: T,
    timestamp1: string,
    timestamp2: string,
    options?: {
      eventTypes?: string[];
      organizationId?: number;
      operatingUnitId?: number;
    },
  ): Promise<StateDiff<T>> {
    const before = await this.getStateAtTime(reducer, initialState, timestamp1, options);
    const after = await this.getStateAtTime(reducer, initialState, timestamp2, options);

    // Count events between timestamps
    let eventsBetween = 0;
    await this.bus.replay(
      {
        eventTypePattern: '*',
        organizationId: options?.organizationId,
        operatingUnitId: options?.operatingUnitId,
        fromTimestamp: timestamp1,
        toTimestamp: timestamp2,
      },
      async () => { eventsBetween++; },
    );

    // Compute field-level changes
    const changes: StateDiff<T>['changes'] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      const bv = (before as Record<string, unknown>)[key];
      const av = (after as Record<string, unknown>)[key];
      if (JSON.stringify(bv) !== JSON.stringify(av)) {
        changes.push({ field: key, previousValue: bv, currentValue: av });
      }
    }

    return { before, after, changes, eventsBetween };
  }

  /**
   * Get chronological event history (for debugging / audit display).
   *
   * "Show me everything that happened to advance #42."
   */
  async getEventHistory(options?: {
    eventTypes?: string[];
    organizationId?: number;
    operatingUnitId?: number;
    fromTimestamp?: string;
    toTimestamp?: string;
    limit?: number;
  }): Promise<ReplayedEvent[]> {
    const events: ReplayedEvent[] = [];

    const pattern = options?.eventTypes?.length === 1
      ? options.eventTypes[0]
      : undefined;

    await this.bus.replay(
      {
        eventTypePattern: pattern || '*',
        organizationId: options?.organizationId,
        operatingUnitId: options?.operatingUnitId,
        fromTimestamp: options?.fromTimestamp,
        toTimestamp: options?.toTimestamp,
      },
      async (eventType, payload) => {
        if (options?.eventTypes && options.eventTypes.length > 1) {
          if (!options.eventTypes.includes(eventType)) return;
        }
        if (options?.limit && events.length >= options.limit) return;

        events.push({
          eventType,
          timestamp: new Date().toISOString(),
          payload,
        });
      },
    );

    return events;
  }

  /**
   * Count events matching criteria (for dashboards / analytics).
   */
  async countEvents(options?: {
    eventTypes?: string[];
    organizationId?: number;
    operatingUnitId?: number;
    fromTimestamp?: string;
    toTimestamp?: string;
  }): Promise<{ count: number; byType: Record<string, number> }> {
    let total = 0;
    const byType: Record<string, number> = {};

    await this.bus.replay(
      {
        eventTypePattern: '*',
        organizationId: options?.organizationId,
        operatingUnitId: options?.operatingUnitId,
        fromTimestamp: options?.fromTimestamp,
        toTimestamp: options?.toTimestamp,
      },
      async (eventType) => {
        if (options?.eventTypes && !options.eventTypes.includes(eventType)) return;
        total++;
        byType[eventType] = (byType[eventType] || 0) + 1;
      },
    );

    return { count: total, byType };
  }
}
