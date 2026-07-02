/**
 * FinancialEventTypes.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Financial Domain Event Type Definitions
 *
 * PHASE 3: Enterprise Event Platform
 *
 * All financial events that flow through the EventBus.
 * Events are immutable facts that happened in the past.
 * Per ADR-002 (Event Bus source of truth).
 *
 * Naming convention: finance:<domain>:<action_past_tense>
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// EVENT TYPE ENUM
// ────────────────────────────────────────────────────────────────────────────

export enum FinancialEventType {
  // ── GL Events ──
  GL_POSTED = 'finance:gl:posted',
  GL_REVERSED = 'finance:gl:reversed',
  GL_VOIDED = 'finance:gl:voided',

  // ── Budget Events ──
  BUDGET_CREATED = 'finance:budget:created',
  BUDGET_ALLOCATED = 'finance:budget:allocated',
  BUDGET_EXCEEDED = 'finance:budget:exceeded',
  BUDGET_APPROVED = 'finance:budget:approved',
  BUDGET_REVISED = 'finance:budget:revised',
  BUDGET_CLOSED = 'finance:budget:closed',

  // ── Advance Events ──
  ADVANCE_REQUESTED = 'finance:advance:requested',
  ADVANCE_APPROVED = 'finance:advance:approved',
  ADVANCE_REJECTED = 'finance:advance:rejected',
  ADVANCE_ISSUED = 'finance:advance:issued',
  ADVANCE_LIQUIDATED = 'finance:advance:liquidated',
  ADVANCE_PARTIALLY_SETTLED = 'finance:advance:partially_settled',
  ADVANCE_FULLY_SETTLED = 'finance:advance:fully_settled',
  ADVANCE_CANCELLED = 'finance:advance:cancelled',

  // ── Payment Events ──
  PAYMENT_CREATED = 'finance:payment:created',
  PAYMENT_APPROVED = 'finance:payment:approved',
  PAYMENT_REJECTED = 'finance:payment:rejected',
  PAYMENT_PROCESSING = 'finance:payment:processing',
  PAYMENT_COMPLETED = 'finance:payment:completed',
  PAYMENT_FAILED = 'finance:payment:failed',
  PAYMENT_CANCELLED = 'finance:payment:cancelled',
  PAYMENT_REVERSED = 'finance:payment:reversed',

  // ── Treasury Events ──
  CASH_POSITION_UPDATED = 'finance:treasury:cash_position_updated',
  CASH_THRESHOLD_BREACHED = 'finance:treasury:cash_threshold_breached',
  FX_RATE_UPDATED = 'finance:treasury:fx_rate_updated',

  // ── Donor/Grant Events ──
  DONOR_RULES_EVALUATED = 'finance:donor:rules_evaluated',
  DONOR_COMPLIANCE_VIOLATION = 'finance:donor:compliance_violation',
  GRANT_ALLOCATION_UPDATED = 'finance:grant:allocation_updated',

  // ── Compliance/Audit Events ──
  AUDIT_TRAIL_RECORDED = 'finance:audit:trail_recorded',
  COMPLIANCE_CHECK_PASSED = 'finance:compliance:check_passed',
  COMPLIANCE_CHECK_FAILED = 'finance:compliance:check_failed',

  // ── Orchestration Events ──
  ORCHESTRATION_STARTED = 'finance:orchestration:started',
  ORCHESTRATION_COMPLETED = 'finance:orchestration:completed',
  ORCHESTRATION_FAILED = 'finance:orchestration:failed',
  ORCHESTRATION_COMPENSATED = 'finance:orchestration:compensated',
}

// ────────────────────────────────────────────────────────────────────────────
// EVENT ENVELOPE — common wrapper for every event
// ────────────────────────────────────────────────────────────────────────────

export interface IFinancialEventEnvelope<T = Record<string, unknown>> {
  /** UUID — unique per event instance */
  eventId: string;
  /** Discriminator — which event this is */
  eventType: FinancialEventType;
  /** Monotonic version inside this envelope (starts at 1) */
  eventVersion: number;
  /** ISO-8601 timestamp of when the event occurred */
  timestamp: string;

  // ── Idempotency ──
  /** The upstream trigger ID — prevents duplicate processing (ADR-015) */
  sourceEventId: string;

  // ── Multi-tenancy ──
  organizationId: number;
  operatingUnitId: number;

  // ── Actor ──
  userId: number;
  userRole: string;

  // ── Domain data ──
  payload: T;

  // ── Distributed tracing ──
  metadata: IEventMetadata;

  // ── Schema evolution ──
  schemaVersion: string; // semver "1.0.0"

  // ── Replay markers (set only when replaying) ──
  replayedAt?: string;
  originalEventId?: string;
}

export interface IEventMetadata {
  /** Links related events across services */
  correlationId: string;
  /** Distributed tracing span id */
  traceId: string;
  /** Origin of the event */
  source: 'api' | 'batch' | 'scheduled' | 'manual';
  ipAddress?: string;
  userAgent?: string;
  deploymentVersion?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// GL EVENT PAYLOADS
// ────────────────────────────────────────────────────────────────────────────

export interface GLPostedPayload {
  journalEntryId: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  lineCount: number;
  sourceModule: string;
  sourceDocumentId?: number;
  sourceDocumentType?: string;
  postedAt: string;
  postedBy: number;
}

export interface GLReversedPayload {
  journalEntryId: number;
  reversalEntryId: number;
  originalEntryNumber: string;
  reason: string;
  reversedAt: string;
  reversedBy: number;
}

// ────────────────────────────────────────────────────────────────────────────
// BUDGET EVENT PAYLOADS
// ────────────────────────────────────────────────────────────────────────────

export interface BudgetAllocatedPayload {
  budgetId: number;
  budgetName: string;
  allocationAmount: number;
  fiscalMonth: string;
  allocatedBy: number;
  allocatedAt: string;
  remainingBalance: number;
}

export interface BudgetExceededPayload {
  budgetId: number;
  budgetName: string;
  approvedAmount: number;
  actualAmount: number;
  excessAmount: number;
  excessPercent: number;
  exceedanceDate: string;
  notifiedRecipients: number[];
}

// ────────────────────────────────────────────────────────────────────────────
// ADVANCE EVENT PAYLOADS
// ────────────────────────────────────────────────────────────────────────────

export interface AdvanceIssuedPayload {
  advanceId: number;
  advanceNumber: string;
  employeeId: number;
  employeeName: string;
  issuedAmount: number;
  currency: string;
  issuedAt: string;
  issuedBy: number;
  glEntryId?: number;
  paymentMethod: string;
}

export interface AdvanceLiquidatedPayload {
  advanceId: number;
  advanceNumber: string;
  settlementAmount: number;
  settlementDate: string;
  receiptCount: number;
  liquidatedBy: number;
  glEntryId?: number;
  remainingBalance: number;
}

// ────────────────────────────────────────────────────────────────────────────
// PAYMENT EVENT PAYLOADS
// ────────────────────────────────────────────────────────────────────────────

export interface PaymentCreatedPayload {
  paymentId: number;
  paymentNumber: string;
  vendorId?: number;
  vendorName?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  createdBy: number;
  invoiceReferences?: number[];
}

export interface PaymentCompletedPayload {
  paymentId: number;
  paymentNumber: string;
  transactionId?: string;
  actualAmount: number;
  currency: string;
  completedAt: string;
  processedBy: number;
  glEntryId?: number;
}

export interface PaymentFailedPayload {
  paymentId: number;
  paymentNumber: string;
  failureReason: string;
  failureCode?: string;
  failedAt: string;
  retryCount: number;
  nextRetryScheduled?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// TREASURY EVENT PAYLOADS
// ────────────────────────────────────────────────────────────────────────────

export interface CashPositionUpdatedPayload {
  bankAccountId: number;
  accountNumber: string;
  previousBalance: number;
  currentBalance: number;
  currency: string;
  updateType: 'deposit' | 'withdrawal' | 'adjustment';
  referenceId?: string;
  updatedAt: string;
}

export interface CashThresholdBreachedPayload {
  bankAccountId: number;
  currentBalance: number;
  minimumThreshold: number;
  shortfall: number;
  currency: string;
  breachedAt: string;
  notifiedRecipients: number[];
}

export interface FXRateUpdatedPayload {
  fromCurrency: string;
  toCurrency: string;
  previousRate: number;
  currentRate: number;
  rateChangePercent: number;
  sourceProvider: string;
  effectiveDate: string;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// AUDIT / COMPLIANCE EVENT PAYLOADS
// ────────────────────────────────────────────────────────────────────────────

export interface AuditTrailRecordedPayload {
  auditId: string;
  entityType: string;
  entityId: number;
  action: string;
  changedFields: Array<{
    fieldName: string;
    previousValue?: unknown;
    newValue?: unknown;
  }>;
  recordedAt: string;
  recordedBy: number;
  reason?: string;
  source: string;
}

export interface ComplianceCheckPayload {
  checkType: string;
  entityType: string;
  entityId: number;
  passed: boolean;
  details: Record<string, unknown>;
  checkedAt: string;
  checkedBy: number;
}

// ────────────────────────────────────────────────────────────────────────────
// DONOR / GRANT EVENT PAYLOADS
// ────────────────────────────────────────────────────────────────────────────

export interface DonorComplianceViolationPayload {
  donorId: number;
  donorName: string;
  grantId: number;
  violationType: string;
  severity: 'warning' | 'error' | 'critical';
  description: string;
  violationDate: string;
  detectedAt: string;
  affectedAmount?: number;
  actionRequired?: string;
  notifiedRecipients: number[];
}

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATION EVENT PAYLOADS
// ────────────────────────────────────────────────────────────────────────────

export interface OrchestrationStartedPayload {
  orchestrationId: string;
  operationType: string;
  expectedSteps: number;
  startedAt: string;
  startedBy: number;
  context: Record<string, unknown>;
}

export interface OrchestrationCompletedPayload {
  orchestrationId: string;
  operationType: string;
  completedSteps: number;
  totalSteps: number;
  completedAt: string;
  durationMs: number;
  results: Record<string, unknown>;
}

export interface OrchestrationFailedPayload {
  orchestrationId: string;
  operationType: string;
  failedStep: string;
  failureReason: string;
  failedAt: string;
  compensationStarted: boolean;
}

export interface OrchestrationCompensatedPayload {
  orchestrationId: string;
  operationType: string;
  compensatedSteps: number;
  compensationReason: string;
  compensatedAt: string;
  compensationStatus: 'success' | 'partial' | 'failed';
  details: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────────
// PAYLOAD UNION
// ────────────────────────────────────────────────────────────────────────────

export type FinancialEventPayload =
  | GLPostedPayload
  | GLReversedPayload
  | BudgetAllocatedPayload
  | BudgetExceededPayload
  | AdvanceIssuedPayload
  | AdvanceLiquidatedPayload
  | PaymentCreatedPayload
  | PaymentCompletedPayload
  | PaymentFailedPayload
  | CashPositionUpdatedPayload
  | CashThresholdBreachedPayload
  | FXRateUpdatedPayload
  | AuditTrailRecordedPayload
  | ComplianceCheckPayload
  | DonorComplianceViolationPayload
  | OrchestrationStartedPayload
  | OrchestrationCompletedPayload
  | OrchestrationFailedPayload
  | OrchestrationCompensatedPayload
  | Record<string, unknown>;

// ────────────────────────────────────────────────────────────────────────────
// ZOD VALIDATION SCHEMA
// ────────────────────────────────────────────────────────────────────────────

export const FinancialEventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.nativeEnum(FinancialEventType),
  eventVersion: z.number().int().positive(),
  timestamp: z.string().datetime(),
  sourceEventId: z.string(),
  organizationId: z.number().int().positive(),
  operatingUnitId: z.number().int().positive(),
  userId: z.number().int().positive(),
  userRole: z.string().min(1),
  payload: z.record(z.unknown()),
  metadata: z.object({
    correlationId: z.string(),
    traceId: z.string(),
    source: z.enum(['api', 'batch', 'scheduled', 'manual']),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    deploymentVersion: z.string().optional(),
  }),
  schemaVersion: z.string(),
  replayedAt: z.string().datetime().optional(),
  originalEventId: z.string().uuid().optional(),
});
