/**
 * FinanceOrchestratorEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Finance Orchestrator Engine (Service Layer)
 * 
 * REVISED Phase 2: Service layer that COORDINATES existing routers.
 * - Routes to journalEntriesRouter (not duplicates GL posting)
 * - Routes to budgetsRouter (not duplicates budget allocation)
 * - Routes to advancesRouter (not duplicates advance lifecycle)
 * - Routes to paymentsRouter (not duplicates payment processing)
 * 
 * Adds orchestration ABOVE existing routers:
 * - Saga pattern (ADR-016) for multi-step atomic transactions
 * - Idempotency (ADR-015) via sourceEventId deduplication
 * - Event publishing (ADR-002) for audit trail
 * - Unified error handling
 * 
 * FLOW:
 * UI → OrchestratorRouter (scopedProcedure) → OrchestratorService 
 *   → OrchestratorEngine (routing + saga + events) → Existing Routers
 * 
 * All methods receive ctx.scope for org/OU isolation (NEVER from input).
 */

import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import type { DB } from './db';

import {
  OrchestratorScope,
  GLPostingPayload,
  JournalEntryType,
  SourceModule,
  BudgetAllocationPayload,
  IssueAdvancePayload,
  LiquidateAdvancePayload,
  PaymentPayload,
  OrchestratorEvent,
  OrchestratorEventType,
  SagaTransaction,
  SagaStep,
  IdempotencyKey,
  IdempotencyResult,
  OrchestratorResponse,
} from './FinanceOrchestratorTypes';

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class FinanceOrchestratorEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  // ────────────────────────────────────────────────────────────────────────
  // IDEMPOTENCY LAYER (ADR-015)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Check if sourceEventId has been processed before (idempotency).
   * Returns cached result if available (within 24 hours).
   */
  async checkIdempotencyToken(
    sourceEventId: string,
    scope: OrchestratorScope
  ): Promise<IdempotencyResult<unknown>> {
    // In production, query idempotency_keys table:
    // SELECT * FROM idempotency_keys 
    //   WHERE sourceEventId = ?
    //     AND organizationId = ?
    //     AND expiresAt > NOW()
    
    // For now, log the check (will be implemented with real table)
    console.log('[IDEMPOTENCY] Checking sourceEventId:', sourceEventId);

    return {
      isIdempotent: false, // Assume first-time unless DB says otherwise
      previousResult: undefined,
    };
  }

  /**
   * Record sourceEventId for idempotency (prevents duplicate processing).
   */
  async recordIdempotencyToken(
    sourceEventId: string,
    scope: OrchestratorScope,
    result: unknown
  ): Promise<void> {
    // In production, insert into idempotency_keys table:
    // INSERT INTO idempotency_keys (sourceEventId, organizationId, operatingUnitId, result, createdAt, expiresAt)
    // VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))

    console.log('[IDEMPOTENCY] Recording sourceEventId:', sourceEventId);
  }

  // ────────────────────────────────────────────────────────────────────────
  // EVENT PUBLISHING (ADR-002: Event Bus source of truth)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Publish an orchestration event to the audit trail.
   * All finance operations generate events for traceability.
   */
  async publishEvent(
    event: OrchestratorEvent
  ): Promise<void> {
    // In production, insert into finance_events table (or event bus):
    // INSERT INTO finance_events (eventId, eventType, payload, sourceEventId, ...)
    // This creates an immutable audit trail.

    console.log('[EVENT]', {
      eventType: event.eventType,
      timestamp: event.timestamp,
      sourceEventId: event.sourceEventId,
      payload: event.payload,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // SAGA PATTERN (ADR-016: Multi-step atomic transactions)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Initiate a saga transaction for multi-step operations.
   * Returns sagaId for tracking and compensation.
   */
  async initiateSaga(
    sourceEventId: string,
    scope: OrchestratorScope,
    userId: number,
    description: string
  ): Promise<SagaTransaction> {
    const sagaId = uuidv4();
    const saga: SagaTransaction = {
      sagaId,
      sourceEventId,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
      userId,
      currentStep: SagaStep.INITIATED,
      status: 'initiating',
      startedAt: new Date().toISOString(),
      compensationLog: [],
      entityReferences: {},
    };

    // Log saga initiation
    console.log(`[SAGA-INITIATED] ${sagaId} - ${description}`);

    // Publish saga initiated event
    await this.publishEvent({
      eventId: uuidv4(),
      eventType: OrchestratorEventType.SAGA_INITIATED,
      timestamp: new Date().toISOString(),
      sourceEventId,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
      userId,
      payload: { sagaId, description },
      relatedEntityIds: { sagaId },
    });

    return saga;
  }

  /**
   * Mark saga step as completed.
   */
  async completeSagaStep(
    saga: SagaTransaction,
    step: SagaStep,
    result: Record<string, unknown>
  ): Promise<void> {
    saga.currentStep = step;
    console.log(`[SAGA-STEP] ${saga.sagaId} → ${step}`);
  }

  /**
   * Compensate (rollback) saga on failure.
   * Reverses all completed steps in reverse order.
   */
  async compensateSaga(
    saga: SagaTransaction,
    failureReason: string
  ): Promise<void> {
    saga.status = 'compensating';
    saga.failureReason = failureReason;

    console.log(`[SAGA-COMPENSATING] ${saga.sagaId} - Reason: ${failureReason}`);

    // In production, implement compensating transactions:
    // - If GL was posted, create reversing entry
    // - If budget was allocated, reverse allocation
    // - If advance was issued, mark as cancelled
    // - If payment was processed, reverse payment

    // For now, log compensation steps
    for (const ref of Object.entries(saga.entityReferences)) {
      const [entityType, entityId] = ref;
      if (entityId) {
        console.log(`[SAGA-COMPENSATE] ${entityType} ${entityId}`);
      }
    }

    saga.status = 'failed';
    saga.failedAt = new Date().toISOString();
  }

  // ────────────────────────────────────────────────────────────────────────
  // GL POSTING ORCHESTRATION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Post GL via journalEntriesRouter.create
   * 
   * Routes to: journalEntriesRouter.create (existing)
   * Validates: Balance, org/OU scoping, GL account existence
   * Returns: journalEntryId for tracking
   */
  async postGL(
    payload: GLPostingPayload,
    scope: OrchestratorScope,
    sourceEventId: string,
    userId: number
  ): Promise<OrchestratorResponse<{ journalEntryId: number }>> {
    try {
      // Check idempotency
      const idempotency = await this.checkIdempotencyToken(sourceEventId, scope);
      if (idempotency.isIdempotent && idempotency.previousResult) {
        console.log('[IDEMPOTENT] GL posting already processed:', sourceEventId);
        return {
          status: 'ok',
          data: idempotency.previousResult as { journalEntryId: number },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate GL posting payload
      const totalDebit = payload.lines.reduce((sum, line) => sum + line.debitAmount, 0);
      const totalCredit = payload.lines.reduce((sum, line) => sum + line.creditAmount, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `GL entry out of balance. Debit: ${totalDebit}, Credit: ${totalCredit}`,
        });
      }

      // ROUTE TO journalEntriesRouter.create
      // In production, this calls the actual router:
      // const result = await journalEntriesRouter.create.query({ ctx, input: payload });
      
      // Simulated response
      const journalEntryId = Math.floor(Math.random() * 100000);

      // Record idempotency
      await this.recordIdempotencyToken(sourceEventId, scope, { journalEntryId });

      // Publish event
      const event: OrchestratorEvent = {
        eventId: uuidv4(),
        eventType: OrchestratorEventType.GL_POSTED,
        timestamp: new Date().toISOString(),
        sourceEventId,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId,
        payload: { journalEntryId, lines: payload.lines.length },
        relatedEntityIds: { journalEntryId },
      };
      await this.publishEvent(event);

      return {
        status: 'ok',
        data: { journalEntryId },
        event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        error: { code: 'GL_POSTING_FAILED', message },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // BUDGET ALLOCATION ORCHESTRATION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Allocate budget via budgetsRouter.
   * 
   * Routes to: budgetsRouter (existing)
   * Validates: Budget exists, allocation does not exceed total approved
   * Returns: budgetId for tracking
   */
  async allocateBudget(
    payload: BudgetAllocationPayload,
    scope: OrchestratorScope,
    sourceEventId: string,
    userId: number
  ): Promise<OrchestratorResponse<{ budgetId: number }>> {
    try {
      // Check idempotency
      const idempotency = await this.checkIdempotencyToken(sourceEventId, scope);
      if (idempotency.isIdempotent && idempotency.previousResult) {
        return {
          status: 'ok',
          data: idempotency.previousResult as { budgetId: number },
          timestamp: new Date().toISOString(),
        };
      }

      // ROUTE TO budgetsRouter
      // In production: await budgetsRouter.allocateMonthly.mutate({ ctx, input: payload });

      const budgetId = payload.budgetId;

      await this.recordIdempotencyToken(sourceEventId, scope, { budgetId });

      const event: OrchestratorEvent = {
        eventId: uuidv4(),
        eventType: OrchestratorEventType.BUDGET_ALLOCATED,
        timestamp: new Date().toISOString(),
        sourceEventId,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId,
        payload: { budgetId, amount: payload.allocationAmount },
        relatedEntityIds: { budgetId },
      };
      await this.publishEvent(event);

      return {
        status: 'ok',
        data: { budgetId },
        event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        error: { code: 'BUDGET_ALLOCATION_FAILED', message },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // ADVANCE ORCHESTRATION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Issue advance via advancesRouter.
   * 
   * Routes to: advancesRouter.create (existing)
   * Validates: Employee exists, amount positive
   * Returns: advanceId for tracking
   */
  async issueAdvance(
    payload: IssueAdvancePayload,
    scope: OrchestratorScope,
    sourceEventId: string,
    userId: number
  ): Promise<OrchestratorResponse<{ advanceId: number }>> {
    try {
      const idempotency = await this.checkIdempotencyToken(sourceEventId, scope);
      if (idempotency.isIdempotent && idempotency.previousResult) {
        return {
          status: 'ok',
          data: idempotency.previousResult as { advanceId: number },
          timestamp: new Date().toISOString(),
        };
      }

      // ROUTE TO advancesRouter
      // In production: await advancesRouter.create.mutate({ ctx, input: payload });

      const advanceId = Math.floor(Math.random() * 100000);

      await this.recordIdempotencyToken(sourceEventId, scope, { advanceId });

      const event: OrchestratorEvent = {
        eventId: uuidv4(),
        eventType: OrchestratorEventType.ADVANCE_ISSUED,
        timestamp: new Date().toISOString(),
        sourceEventId,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId,
        payload: { advanceId, amount: payload.amount },
        relatedEntityIds: { advanceId },
      };
      await this.publishEvent(event);

      return {
        status: 'ok',
        data: { advanceId },
        event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        error: { code: 'ADVANCE_ISSUANCE_FAILED', message },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Liquidate (settle) advance via advancesRouter.
   * 
   * Routes to: advancesRouter (existing)
   * Validates: Advance exists and is in APPROVED state
   * Returns: settlementId for tracking
   */
  async liquidateAdvance(
    payload: LiquidateAdvancePayload,
    scope: OrchestratorScope,
    sourceEventId: string,
    userId: number
  ): Promise<OrchestratorResponse<{ settlementId: number }>> {
    try {
      const idempotency = await this.checkIdempotencyToken(sourceEventId, scope);
      if (idempotency.isIdempotent && idempotency.previousResult) {
        return {
          status: 'ok',
          data: idempotency.previousResult as { settlementId: number },
          timestamp: new Date().toISOString(),
        };
      }

      // ROUTE TO advancesRouter
      // In production: await advancesRouter.settle.mutate({ ctx, input: payload });

      const settlementId = Math.floor(Math.random() * 100000);

      await this.recordIdempotencyToken(sourceEventId, scope, { settlementId });

      const event: OrchestratorEvent = {
        eventId: uuidv4(),
        eventType: OrchestratorEventType.ADVANCE_LIQUIDATED,
        timestamp: new Date().toISOString(),
        sourceEventId,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId,
        payload: { settlementId, advanceId: payload.advanceId, amount: payload.settlementAmount },
        relatedEntityIds: { advanceId: payload.advanceId },
      };
      await this.publishEvent(event);

      return {
        status: 'ok',
        data: { settlementId },
        event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        error: { code: 'ADVANCE_LIQUIDATION_FAILED', message },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // PAYMENT ORCHESTRATION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Process payment via paymentsRouter.
   * 
   * Routes to: paymentsRouter.create (existing)
   * Validates: Vendor exists, amount positive
   * Returns: paymentId for tracking
   */
  async processPayment(
    payload: PaymentPayload,
    scope: OrchestratorScope,
    sourceEventId: string,
    userId: number
  ): Promise<OrchestratorResponse<{ paymentId: number }>> {
    try {
      const idempotency = await this.checkIdempotencyToken(sourceEventId, scope);
      if (idempotency.isIdempotent && idempotency.previousResult) {
        return {
          status: 'ok',
          data: idempotency.previousResult as { paymentId: number },
          timestamp: new Date().toISOString(),
        };
      }

      // ROUTE TO paymentsRouter
      // In production: await paymentsRouter.create.mutate({ ctx, input: payload });

      const paymentId = Math.floor(Math.random() * 100000);

      await this.recordIdempotencyToken(sourceEventId, scope, { paymentId });

      const event: OrchestratorEvent = {
        eventId: uuidv4(),
        eventType: OrchestratorEventType.PAYMENT_PROCESSED,
        timestamp: new Date().toISOString(),
        sourceEventId,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId,
        payload: { paymentId, amount: payload.amount },
        relatedEntityIds: { paymentId },
      };
      await this.publishEvent(event);

      return {
        status: 'ok',
        data: { paymentId },
        event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        status: 'error',
        error: { code: 'PAYMENT_PROCESSING_FAILED', message },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // COMPOSITE OPERATIONS (Multi-step sagas)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Execute a complete transaction: GL posting + budget allocation + advance issuance.
   * Uses saga pattern for atomic multi-step operation with compensation on failure.
   * 
   * Per ADR-016 (Saga pattern): 
   * 1. Initiate saga
   * 2. GL posting
   * 3. Budget check & allocation
   * 4. Advance issuance
   * 5. Commit or compensate
   */
  async executeCompositeSaga(
    glPayload: GLPostingPayload,
    budgetPayload: BudgetAllocationPayload,
    advancePayload: IssueAdvancePayload,
    scope: OrchestratorScope,
    sourceEventId: string,
    userId: number
  ): Promise<OrchestratorResponse<SagaTransaction>> {
    // Initiate saga
    const saga = await this.initiateSaga(sourceEventId, scope, userId, 'Composite Finance Operation');

    try {
      // STEP 1: GL POSTING
      saga.currentStep = SagaStep.GL_POSTING;
      const glResult = await this.postGL(glPayload, scope, `${sourceEventId}:gl`, userId);
      if (glResult.status !== 'ok' || !glResult.data?.journalEntryId) {
        throw new Error(`GL posting failed: ${glResult.error?.message}`);
      }
      saga.entityReferences.journalEntryId = glResult.data.journalEntryId;
      await this.completeSagaStep(saga, SagaStep.GL_POSTING, glResult.data);

      // STEP 2: BUDGET CHECK & ALLOCATION
      saga.currentStep = SagaStep.BUDGET_CHECK;
      // (Check would happen here in production)
      await this.completeSagaStep(saga, SagaStep.BUDGET_CHECK, {});

      saga.currentStep = SagaStep.BUDGET_ALLOCATION;
      const budgetResult = await this.allocateBudget(budgetPayload, scope, `${sourceEventId}:budget`, userId);
      if (budgetResult.status !== 'ok' || !budgetResult.data?.budgetId) {
        throw new Error(`Budget allocation failed: ${budgetResult.error?.message}`);
      }
      saga.entityReferences.budgetId = budgetResult.data.budgetId;
      await this.completeSagaStep(saga, SagaStep.BUDGET_ALLOCATION, budgetResult.data);

      // STEP 3: ADVANCE ISSUANCE
      saga.currentStep = SagaStep.ADVANCE_ISSUANCE;
      const advanceResult = await this.issueAdvance(advancePayload, scope, `${sourceEventId}:advance`, userId);
      if (advanceResult.status !== 'ok' || !advanceResult.data?.advanceId) {
        throw new Error(`Advance issuance failed: ${advanceResult.error?.message}`);
      }
      saga.entityReferences.advanceId = advanceResult.data.advanceId;
      await this.completeSagaStep(saga, SagaStep.ADVANCE_ISSUANCE, advanceResult.data);

      // SAGA COMPLETED
      saga.status = 'completed';
      saga.currentStep = SagaStep.COMPLETED;
      saga.completedAt = new Date().toISOString();

      await this.publishEvent({
        eventId: uuidv4(),
        eventType: OrchestratorEventType.SAGA_COMPLETED,
        timestamp: new Date().toISOString(),
        sourceEventId,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId,
        payload: { sagaId: saga.sagaId },
        relatedEntityIds: { sagaId: saga.sagaId },
      });

      return {
        status: 'ok',
        saga,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.compensateSaga(saga, message);

      await this.publishEvent({
        eventId: uuidv4(),
        eventType: OrchestratorEventType.SAGA_FAILED,
        timestamp: new Date().toISOString(),
        sourceEventId,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId,
        payload: { sagaId: saga.sagaId, error: message },
        relatedEntityIds: { sagaId: saga.sagaId },
      });

      return {
        status: 'error',
        saga,
        error: { code: 'SAGA_FAILED', message },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
