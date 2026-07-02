/**
 * FinancialEventSubscriber.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Type-safe subscription API for financial domain events
 *
 * PHASE 3: Enterprise Event Platform
 *
 * Wraps EventBus.subscribe() with domain-specific methods.
 * Handlers receive typed payloads instead of raw Record<string, unknown>.
 *
 * USAGE (server startup / initialization):
 *   const subscriber = new FinancialEventSubscriber(eventBus);
 *
 *   subscriber.onGLPosted(async (payload) => {
 *     await auditEngine.record('journal_entry', payload.journalEntryId, 'post', ...);
 *   });
 *
 *   subscriber.onPaymentFailed(async (payload) => {
 *     await notificationGateway.send(...);
 *   });
 */

import type { EventBus } from './EventBus';
import {
  FinancialEventType,
  type GLPostedPayload,
  type GLReversedPayload,
  type BudgetAllocatedPayload,
  type BudgetExceededPayload,
  type AdvanceIssuedPayload,
  type AdvanceLiquidatedPayload,
  type PaymentCreatedPayload,
  type PaymentCompletedPayload,
  type PaymentFailedPayload,
  type CashPositionUpdatedPayload,
  type CashThresholdBreachedPayload,
  type DonorComplianceViolationPayload,
  type OrchestrationCompletedPayload,
  type OrchestrationFailedPayload,
} from './FinancialEventTypes';

// ────────────────────────────────────────────────────────────────────────────
// SUBSCRIBER OPTIONS
// ────────────────────────────────────────────────────────────────────────────

export interface SubscriberOptions {
  /** Replay past events from this time when subscribing */
  fromTimestamp?: string;
  /** Consumer group for distributed processing */
  groupId?: string;
  /** Max retry attempts on handler failure */
  maxRetries?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// SUBSCRIBER
// ────────────────────────────────────────────────────────────────────────────

export class FinancialEventSubscriber {
  constructor(private bus: EventBus) {}

  // ── GL ──

  async onGLPosted(handler: (p: GLPostedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.GL_POSTED, handler, opts);
  }

  async onGLReversed(handler: (p: GLReversedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.GL_REVERSED, handler, opts);
  }

  // ── Budget ──

  async onBudgetAllocated(handler: (p: BudgetAllocatedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.BUDGET_ALLOCATED, handler, opts);
  }

  async onBudgetExceeded(handler: (p: BudgetExceededPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.BUDGET_EXCEEDED, handler, opts);
  }

  // ── Advance ──

  async onAdvanceIssued(handler: (p: AdvanceIssuedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.ADVANCE_ISSUED, handler, opts);
  }

  async onAdvanceLiquidated(handler: (p: AdvanceLiquidatedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.ADVANCE_LIQUIDATED, handler, opts);
  }

  // ── Payment ──

  async onPaymentCreated(handler: (p: PaymentCreatedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.PAYMENT_CREATED, handler, opts);
  }

  async onPaymentCompleted(handler: (p: PaymentCompletedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.PAYMENT_COMPLETED, handler, opts);
  }

  async onPaymentFailed(handler: (p: PaymentFailedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.PAYMENT_FAILED, handler, opts);
  }

  // ── Treasury ──

  async onCashPositionUpdated(handler: (p: CashPositionUpdatedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.CASH_POSITION_UPDATED, handler, opts);
  }

  async onCashThresholdBreached(handler: (p: CashThresholdBreachedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.CASH_THRESHOLD_BREACHED, handler, opts);
  }

  // ── Donor ──

  async onDonorComplianceViolation(handler: (p: DonorComplianceViolationPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.DONOR_COMPLIANCE_VIOLATION, handler, opts);
  }

  // ── Orchestration ──

  async onOrchestrationCompleted(handler: (p: OrchestrationCompletedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.ORCHESTRATION_COMPLETED, handler, opts);
  }

  async onOrchestrationFailed(handler: (p: OrchestrationFailedPayload) => Promise<void>, opts?: SubscriberOptions) {
    return this.on(FinancialEventType.ORCHESTRATION_FAILED, handler, opts);
  }

  // ── Pattern-based subscription ──

  /**
   * Subscribe to any events matching a glob pattern.
   * Examples: 'finance:gl:*'  'finance:payment:*'  '*'
   */
  async onPattern(
    pattern: string,
    handler: (eventType: string, payload: Record<string, unknown>) => Promise<void>,
    opts?: SubscriberOptions,
  ) {
    return this.bus.subscribe(
      pattern,
      async (eventType, payload, _meta) => handler(eventType, payload),
      opts,
    );
  }

  /**
   * Subscribe to multiple patterns at once.
   */
  async onPatterns(
    patterns: string[],
    handler: (eventType: string, payload: Record<string, unknown>) => Promise<void>,
    opts?: SubscriberOptions,
  ) {
    return this.bus.subscribe(
      patterns,
      async (eventType, payload, _meta) => handler(eventType, payload),
      opts,
    );
  }

  // ── Unsubscribe ──

  async unsubscribe(subscriptionId: string) {
    return this.bus.unsubscribe(subscriptionId);
  }

  // ── PRIVATE ──

  private async on<T>(
    eventType: FinancialEventType,
    handler: (payload: T) => Promise<void>,
    opts?: SubscriberOptions,
  ) {
    return this.bus.subscribe(
      eventType,
      async (_eventType, payload, _meta) => handler(payload as T),
      opts,
    );
  }
}
