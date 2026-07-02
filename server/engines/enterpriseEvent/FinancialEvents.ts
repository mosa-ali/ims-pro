/**
 * FinancialEvents.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Convenience factories for creating domain events
 *
 * PHASE 3: Enterprise Event Platform
 *
 * Instead of manually constructing envelopes, callers use these
 * type-safe factories. Each factory pre-fills the correct eventType
 * and validates the payload shape at compile-time.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  FinancialEventType,
  type IFinancialEventEnvelope,
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
  type ComplianceCheckPayload,
  type DonorComplianceViolationPayload,
  type OrchestrationStartedPayload,
  type OrchestrationCompletedPayload,
  type OrchestrationFailedPayload,
  type OrchestrationCompensatedPayload,
} from './FinancialEventTypes';

// ────────────────────────────────────────────────────────────────────────────
// CONTEXT passed to every factory
// ────────────────────────────────────────────────────────────────────────────

export interface EventContext {
  organizationId: number;
  operatingUnitId: number;
  userId: number;
  userRole: string;
  sourceEventId?: string;
  correlationId?: string;
  traceId?: string;
  source?: 'api' | 'batch' | 'scheduled' | 'manual';
  deploymentVersion?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// GENERIC BUILDER
// ────────────────────────────────────────────────────────────────────────────

function buildEnvelope<T>(
  eventType: FinancialEventType,
  payload: T,
  ctx: EventContext,
): IFinancialEventEnvelope<T> {
  return {
    eventId: uuidv4(),
    eventType,
    eventVersion: 1,
    timestamp: new Date().toISOString(),
    sourceEventId: ctx.sourceEventId || uuidv4(),
    organizationId: ctx.organizationId,
    operatingUnitId: ctx.operatingUnitId,
    userId: ctx.userId,
    userRole: ctx.userRole,
    payload,
    metadata: {
      correlationId: ctx.correlationId || uuidv4(),
      traceId: ctx.traceId || uuidv4(),
      source: ctx.source || 'api',
      deploymentVersion: ctx.deploymentVersion,
    },
    schemaVersion: '1.0.0',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// GL EVENTS
// ────────────────────────────────────────────────────────────────────────────

export const GLPosted = (p: GLPostedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.GL_POSTED, p, ctx);

export const GLReversed = (p: GLReversedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.GL_REVERSED, p, ctx);

// ────────────────────────────────────────────────────────────────────────────
// BUDGET EVENTS
// ────────────────────────────────────────────────────────────────────────────

export const BudgetAllocated = (p: BudgetAllocatedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.BUDGET_ALLOCATED, p, ctx);

export const BudgetExceeded = (p: BudgetExceededPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.BUDGET_EXCEEDED, p, ctx);

// ────────────────────────────────────────────────────────────────────────────
// ADVANCE EVENTS
// ────────────────────────────────────────────────────────────────────────────

export const AdvanceIssued = (p: AdvanceIssuedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.ADVANCE_ISSUED, p, ctx);

export const AdvanceLiquidated = (p: AdvanceLiquidatedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.ADVANCE_LIQUIDATED, p, ctx);

// ────────────────────────────────────────────────────────────────────────────
// PAYMENT EVENTS
// ────────────────────────────────────────────────────────────────────────────

export const PaymentCreated = (p: PaymentCreatedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.PAYMENT_CREATED, p, ctx);

export const PaymentCompleted = (p: PaymentCompletedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.PAYMENT_COMPLETED, p, ctx);

export const PaymentFailed = (p: PaymentFailedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.PAYMENT_FAILED, p, ctx);

// ────────────────────────────────────────────────────────────────────────────
// TREASURY EVENTS
// ────────────────────────────────────────────────────────────────────────────

export const CashPositionUpdated = (p: CashPositionUpdatedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.CASH_POSITION_UPDATED, p, ctx);

export const CashThresholdBreached = (p: CashThresholdBreachedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.CASH_THRESHOLD_BREACHED, p, ctx);

export const FXRateUpdated = (p: FXRateUpdatedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.FX_RATE_UPDATED, p, ctx);

// ────────────────────────────────────────────────────────────────────────────
// AUDIT / COMPLIANCE EVENTS
// ────────────────────────────────────────────────────────────────────────────

export const AuditTrailRecorded = (p: AuditTrailRecordedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.AUDIT_TRAIL_RECORDED, p, ctx);

export const ComplianceCheckPassed = (p: ComplianceCheckPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.COMPLIANCE_CHECK_PASSED, p, ctx);

export const ComplianceCheckFailed = (p: ComplianceCheckPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.COMPLIANCE_CHECK_FAILED, p, ctx);

export const DonorComplianceViolation = (p: DonorComplianceViolationPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.DONOR_COMPLIANCE_VIOLATION, p, ctx);

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATION EVENTS
// ────────────────────────────────────────────────────────────────────────────

export const OrchestrationStarted = (p: OrchestrationStartedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.ORCHESTRATION_STARTED, p, ctx);

export const OrchestrationCompleted = (p: OrchestrationCompletedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.ORCHESTRATION_COMPLETED, p, ctx);

export const OrchestrationFailed = (p: OrchestrationFailedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.ORCHESTRATION_FAILED, p, ctx);

export const OrchestrationCompensated = (p: OrchestrationCompensatedPayload, ctx: EventContext) =>
  buildEnvelope(FinancialEventType.ORCHESTRATION_COMPENSATED, p, ctx);
