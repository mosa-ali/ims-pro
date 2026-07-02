/**
 * FinancialEventPublisher.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Type-safe publishing API for financial domain events
 *
 * PHASE 3: Enterprise Event Platform
 *
 * Wraps EventBus.publish() with domain-specific, strongly-typed methods.
 * Each method validates at compile-time that the correct payload is passed.
 *
 * USAGE (inside FinanceOrchestratorEngine):
 *   const publisher = new FinancialEventPublisher(eventBus);
 *   await publisher.glPosted({ journalEntryId: 1, ... }, ctx);
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
  type FXRateUpdatedPayload,
  type AuditTrailRecordedPayload,
  type DonorComplianceViolationPayload,
  type OrchestrationStartedPayload,
  type OrchestrationCompletedPayload,
  type OrchestrationFailedPayload,
  type OrchestrationCompensatedPayload,
} from './FinancialEventTypes';

// ────────────────────────────────────────────────────────────────────────────
// PUBLISHER CONTEXT  (passed by the caller — always from ctx.scope)
// ────────────────────────────────────────────────────────────────────────────

export interface PublisherContext {
  sourceEventId: string;
  organizationId: number;
  operatingUnitId: number;
  userId: number;
  metadata?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────────
// PUBLISHER
// ────────────────────────────────────────────────────────────────────────────

export class FinancialEventPublisher {
  constructor(private bus: EventBus) {}

  // ── GL ──

  async glPosted(payload: GLPostedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.GL_POSTED, payload, ctx);
  }

  async glReversed(payload: GLReversedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.GL_REVERSED, payload, ctx);
  }

  // ── Budget ──

  async budgetAllocated(payload: BudgetAllocatedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.BUDGET_ALLOCATED, payload, ctx);
  }

  async budgetExceeded(payload: BudgetExceededPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.BUDGET_EXCEEDED, payload, ctx);
  }

  // ── Advance ──

  async advanceIssued(payload: AdvanceIssuedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.ADVANCE_ISSUED, payload, ctx);
  }

  async advanceLiquidated(payload: AdvanceLiquidatedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.ADVANCE_LIQUIDATED, payload, ctx);
  }

  // ── Payment ──

  async paymentCreated(payload: PaymentCreatedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.PAYMENT_CREATED, payload, ctx);
  }

  async paymentCompleted(payload: PaymentCompletedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.PAYMENT_COMPLETED, payload, ctx);
  }

  async paymentFailed(payload: PaymentFailedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.PAYMENT_FAILED, payload, ctx);
  }

  // ── Treasury ──

  async cashPositionUpdated(payload: CashPositionUpdatedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.CASH_POSITION_UPDATED, payload, ctx);
  }

  async cashThresholdBreached(payload: CashThresholdBreachedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.CASH_THRESHOLD_BREACHED, payload, ctx);
  }

  async fxRateUpdated(payload: FXRateUpdatedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.FX_RATE_UPDATED, payload, ctx);
  }

  // ── Audit ──

  async auditTrailRecorded(payload: AuditTrailRecordedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.AUDIT_TRAIL_RECORDED, payload, ctx);
  }

  // ── Donor ──

  async donorComplianceViolation(payload: DonorComplianceViolationPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.DONOR_COMPLIANCE_VIOLATION, payload, ctx);
  }

  // ── Orchestration ──

  async orchestrationStarted(payload: OrchestrationStartedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.ORCHESTRATION_STARTED, payload, ctx);
  }

  async orchestrationCompleted(payload: OrchestrationCompletedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.ORCHESTRATION_COMPLETED, payload, ctx);
  }

  async orchestrationFailed(payload: OrchestrationFailedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.ORCHESTRATION_FAILED, payload, ctx);
  }

  async orchestrationCompensated(payload: OrchestrationCompensatedPayload, ctx: PublisherContext) {
    return this.bus.publish(FinancialEventType.ORCHESTRATION_COMPENSATED, payload, ctx);
  }

  // ── Generic ──

  async custom(eventType: FinancialEventType, payload: Record<string, unknown>, ctx: PublisherContext) {
    return this.bus.publish(eventType, payload, ctx);
  }
}
