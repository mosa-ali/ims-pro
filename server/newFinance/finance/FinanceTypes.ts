/**
 * FinanceOrchestratorTypes.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Finance Orchestrator Type Definitions
 * 
 * REVISED Phase 2: Integrates with ACTUAL routers and schema.
 * - Real schema references (journalEntries, journalLines, budgets, advances, payments)
 * - Real enum values from schema
 * - Scope context from actual ctx.scope pattern
 * - Event types for audit trail
 * 
 * Per ADR-002 (Event Bus source of truth) and ADR-015 (Idempotency),
 * all orchestration requests include sourceEventId for idempotency.
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// SCOPE CONTEXT (From ctx.scope in existing routers)
// ────────────────────────────────────────────────────────────────────────────

export interface OrchestratorScope {
  organizationId: number;
  operatingUnitId: number;
}

// ────────────────────────────────────────────────────────────────────────────
// JOURNAL ENTRY TYPES (from journalEntries schema)
// ────────────────────────────────────────────────────────────────────────────

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  REVERSED = 'reversed',
  VOID = 'void',
}

export enum JournalEntryType {
  STANDARD = 'standard',
  ADJUSTING = 'adjusting',
  CLOSING = 'closing',
  REVERSING = 'reversing',
  OPENING = 'opening',
}

export enum SourceModule {
  MANUAL = 'manual',
  EXPENSE = 'expense',
  ADVANCE = 'advance',
  SETTLEMENT = 'settlement',
  CASH_TRANSACTION = 'cash_transaction',
  ASSET = 'asset',
  PAYROLL = 'payroll',
  PROCUREMENT = 'procurement',
  BUDGET = 'budget',
}

export interface JournalLinePayload {
  lineNumber: number;
  glAccountId: number;
  description?: string;
  debitAmount: number;
  creditAmount: number;
  projectId?: number;
  grantId?: number;
  activityId?: number;
  budgetLineId?: number;
  costCenterId?: number;
  vendorId?: number;
}

export interface GLPostingPayload {
  entryDate: string; // YYYY-MM-DD
  description: string;
  entryType: JournalEntryType;
  sourceModule: SourceModule;
  sourceDocumentId?: number;
  sourceDocumentType?: string;
  lines: JournalLinePayload[];
  projectId?: number;
  grantId?: number;
  autoPost: boolean; // If true, transition to 'posted' immediately
}

// ────────────────────────────────────────────────────────────────────────────
// BUDGET TYPES (from budgets schema)
// ────────────────────────────────────────────────────────────────────────────

export enum BudgetStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REVISED = 'revised',
  CLOSED = 'closed',
  REJECTED = 'rejected',
}

export interface BudgetAllocationPayload {
  budgetId: number;
  allocationAmount: number;
  fiscalMonth: string; // YYYY-MM format
  description?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// ADVANCE TYPES (from financeAdvances schema)
// ────────────────────────────────────────────────────────────────────────────

export enum AdvanceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PARTIALLY_SETTLED = 'PARTIALLY_SETTLED',
  FULLY_SETTLED = 'FULLY_SETTLED',
  CANCELLED = 'CANCELLED',
}

export enum AdvanceType {
  TRAVEL = 'TRAVEL',
  PROJECT = 'PROJECT',
  OPERATIONAL = 'OPERATIONAL',
  SALARY = 'SALARY',
  OTHER = 'OTHER',
}

export interface IssueAdvancePayload {
  employeeId: number;
  advanceType: AdvanceType;
  amount: number;
  currency: string;
  purpose: string;
  expectedSettlementDate: string; // YYYY-MM-DD
  projectId?: number;
  grantId?: number;
}

export interface LiquidateAdvancePayload {
  advanceId: number;
  settlementAmount: number;
  settlementDate: string; // YYYY-MM-DD
  receiptReference?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// PAYMENT TYPES (from payments schema)
// ────────────────────────────────────────────────────────────────────────────

export enum PaymentStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CASH = 'cash',
  WIRE = 'wire',
  MOBILE_MONEY = 'mobile_money',
  OTHER = 'other',
}

export interface PaymentPayload {
  vendorId?: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
  projectId?: number;
  grantId?: number;
  invoiceReferences?: number[]; // Invoice IDs to allocate against
}

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATION EVENTS (Per ADR-002: Event Bus source of truth)
// ────────────────────────────────────────────────────────────────────────────

export enum OrchestratorEventType {
  GL_POSTED = 'orchestrator:gl_posted',
  BUDGET_ALLOCATED = 'orchestrator:budget_allocated',
  ADVANCE_ISSUED = 'orchestrator:advance_issued',
  ADVANCE_LIQUIDATED = 'orchestrator:advance_liquidated',
  PAYMENT_PROCESSED = 'orchestrator:payment_processed',
  SAGA_INITIATED = 'orchestrator:saga_initiated',
  SAGA_COMPLETED = 'orchestrator:saga_completed',
  SAGA_FAILED = 'orchestrator:saga_failed',
  SAGA_COMPENSATED = 'orchestrator:saga_compensated',
}

export interface OrchestratorEvent {
  eventId: string; // Unique event ID
  eventType: OrchestratorEventType;
  timestamp: string; // ISO 8601
  sourceEventId: string; // For idempotency (ADR-015)
  organizationId: number;
  operatingUnitId: number;
  userId: number;
  payload: Record<string, unknown>;
  relatedEntityIds: {
    journalEntryId?: number;
    budgetId?: number;
    advanceId?: number;
    paymentId?: number;
    sagaId?: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// SAGA PATTERN (ADR-016: Saga pattern for multi-step transactions)
// ────────────────────────────────────────────────────────────────────────────

export enum SagaStep {
  INITIATED = 'initiated',
  GL_POSTING = 'gl_posting',
  BUDGET_CHECK = 'budget_check',
  BUDGET_ALLOCATION = 'budget_allocation',
  ADVANCE_ISSUANCE = 'advance_issuance',
  PAYMENT_PROCESSING = 'payment_processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATING = 'compensating',
}

export interface SagaTransaction {
  sagaId: string; // UUID
  sourceEventId: string; // For idempotency
  organizationId: number;
  operatingUnitId: number;
  userId: number;
  currentStep: SagaStep;
  status: 'initiating' | 'executing' | 'compensating' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  
  // Rollback tracking for compensation
  compensationLog: Array<{
    step: SagaStep;
    action: string;
    timestamp: string;
    status: 'pending' | 'executed' | 'failed';
  }>;
  
  // References to created entities (for rollback)
  entityReferences: {
    journalEntryId?: number;
    budgetAllocationId?: number;
    advanceId?: number;
    paymentId?: number;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY TOKENS (ADR-015: Idempotency)
// ────────────────────────────────────────────────────────────────────────────

export interface IdempotencyKey {
  sourceEventId: string; // Unique identifier for the source event
  organizationId: number;
  operatingUnitId: number;
  createdAt: string;
  expiresAt: string; // Keys expire after 24 hours
}

export interface IdempotencyResult<T> {
  isIdempotent: boolean;
  previousResult?: T;
  previousEventId?: string;
  previousTimestamp?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATION RESPONSES
// ────────────────────────────────────────────────────────────────────────────

export interface OrchestratorResponse<T> {
  status: 'ok' | 'not_implemented' | 'error';
  data?: T;
  event?: OrchestratorEvent;
  saga?: SagaTransaction;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

// ────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS FOR VALIDATION
// ────────────────────────────────────────────────────────────────────────────

export const OrchestratorScopeSchema = z.object({
  organizationId: z.number().int().positive(),
  operatingUnitId: z.number().int().positive(),
});

export const GLPostingPayloadSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  entryType: z.nativeEnum(JournalEntryType),
  sourceModule: z.nativeEnum(SourceModule),
  sourceDocumentId: z.number().int().optional(),
  sourceDocumentType: z.string().optional(),
  lines: z.array(
    z.object({
      lineNumber: z.number().int().positive(),
      glAccountId: z.number().int().positive(),
      description: z.string().optional(),
      debitAmount: z.number().nonnegative(),
      creditAmount: z.number().nonnegative(),
      projectId: z.number().int().optional(),
      grantId: z.number().int().optional(),
      activityId: z.number().int().optional(),
      budgetLineId: z.number().int().optional(),
      costCenterId: z.number().int().optional(),
      vendorId: z.number().int().optional(),
    })
  ),
  projectId: z.number().int().optional(),
  grantId: z.number().int().optional(),
  autoPost: z.boolean(),
});

export const IssueAdvancePayloadSchema = z.object({
  employeeId: z.number().int().positive(),
  advanceType: z.nativeEnum(AdvanceType),
  amount: z.number().positive(),
  currency: z.string().length(3),
  purpose: z.string().min(1),
  expectedSettlementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectId: z.number().int().optional(),
  grantId: z.number().int().optional(),
});

export const PaymentPayloadSchema = z.object({
  vendorId: z.number().int().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentMethod: z.nativeEnum(PaymentMethod),
  description: z.string().optional(),
  projectId: z.number().int().optional(),
  grantId: z.number().int().optional(),
  invoiceReferences: z.array(z.number().int()).optional(),
});
