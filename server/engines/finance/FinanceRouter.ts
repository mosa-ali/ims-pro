/**
 * FinanceOrchestratorRouter.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Finance Orchestrator Router (tRPC Interface)
 * 
 * REVISED Phase 2: tRPC router that:
 * - Exposes FinanceOrchestratorService via scopedProcedure
 * - Enforces org/OU isolation via ctx.scope
 * - Validates inputs with Zod schemas
 * - Returns strongly-typed OrchestratorResponse
 * - Integrated into appRouter under finance.orchestrator namespace
 * 
 * Per Mandatory Rule #5: Use scopedProcedure for ALL finance operations.
 * Per Mandatory Rule #7: Repositories accept scope, never individual IDs.
 * 
 * All procedures use scopedProcedure which guarantees:
 * - ctx.user exists (authenticated)
 * - ctx.scope.organizationId exists and is scoped to user
 * - ctx.scope.operatingUnitId exists (if applicable)
 * - No explicit org/OU checking needed (middleware handles it)
 */

import { z } from 'zod';
import { router, scopedProcedure } from '../../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../../db';
import { FinanceOrchestratorService } from './FinanceService';

import {
  GLPostingPayloadSchema,
  IssueAdvancePayloadSchema,
  LiquidateAdvancePayload,
  PaymentPayloadSchema,
  OrchestratorResponse,
  SagaTransaction,
} from './FinanceTypes';

// ────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMAS
// ────────────────────────────────────────────────────────────────────────────

const SourceEventIdSchema = z.string().uuid('sourceEventId must be a valid UUID');

const BudgetAllocationSchema = z.object({
  budgetId: z.number().int().positive('budgetId must be positive'),
  allocationAmount: z.number().positive('allocationAmount must be positive'),
  fiscalMonth: z.string().regex(/^\d{4}-\d{2}$/, 'fiscalMonth must be YYYY-MM'),
  description: z.string().optional(),
});

const LiquidateAdvanceSchema = z.object({
  advanceId: z.number().int().positive('advanceId must be positive'),
  settlementAmount: z.number().positive('settlementAmount must be positive'),
  settlementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'settlementDate must be YYYY-MM-DD'),
  receiptReference: z.string().optional(),
});

const CompositeSagaSchema = z.object({
  gl: GLPostingPayloadSchema,
  budget: BudgetAllocationSchema,
  advance: IssueAdvancePayloadSchema,
  sourceEventId: SourceEventIdSchema,
});

// ────────────────────────────────────────────────────────────────────────────
// FINANCE ORCHESTRATOR ROUTER
// ────────────────────────────────────────────────────────────────────────────

export const financeOrchestratorRouter = router({
  /**
   * POST GL ENTRY
   * 
   * Creates a journal entry with debit/credit lines.
   * Routes to journalEntriesRouter.create (existing router).
   * 
   * Uses:
   * - scopedProcedure: Org/OU isolation guaranteed
   * - Zod validation: Input shape validated
   * - sourceEventId: Idempotency token (ADR-015)
   * - Event publishing: Audit trail (ADR-002)
   * 
   * Returns:
   * - status: 'ok' | 'error'
   * - data: { journalEntryId }
   * - event: OrchestratorEvent for audit trail
   */
  postGL: scopedProcedure
    .input(
      z.object({
        ...GLPostingPayloadSchema.shape,
        sourceEventId: SourceEventIdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const service = new FinanceOrchestratorService(db);
        const { sourceEventId, ...payload } = input;

        const result = await service.postGL(payload, {
          userId: ctx.user.id,
          scope: ctx.scope,
        }, sourceEventId);

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `GL posting failed: ${message}`,
        });
      }
    }),

  /**
   * ALLOCATE BUDGET
   * 
   * Allocates a monthly budget amount.
   * Routes to budgetsRouter (existing router).
   * 
   * Uses:
   * - scopedProcedure: Org/OU isolation
   * - Zod validation: budgetId, amount, fiscalMonth validated
   * - sourceEventId: Idempotency token
   * - Event publishing: Audit trail
   * 
   * Returns:
   * - status: 'ok' | 'error'
   * - data: { budgetId }
   * - event: OrchestratorEvent
   */
  allocateBudget: scopedProcedure
    .input(
      z.object({
        ...BudgetAllocationSchema.shape,
        sourceEventId: SourceEventIdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const service = new FinanceOrchestratorService(db);
        const { sourceEventId, ...payload } = input;

        const result = await service.allocateBudget(payload, {
          userId: ctx.user.id,
          scope: ctx.scope,
        }, sourceEventId);

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Budget allocation failed: ${message}`,
        });
      }
    }),

  /**
   * ISSUE ADVANCE
   * 
   * Issues a staff advance (travel, project, operational, etc).
   * Routes to advancesRouter.create (existing router).
   * 
   * Uses:
   * - scopedProcedure: Org/OU isolation
   * - Zod validation: Employee, amount, type validated
   * - sourceEventId: Idempotency token
   * - Event publishing: Audit trail
   * 
   * Returns:
   * - status: 'ok' | 'error'
   * - data: { advanceId }
   * - event: OrchestratorEvent
   */
  issueAdvance: scopedProcedure
    .input(
      z.object({
        ...IssueAdvancePayloadSchema.shape,
        sourceEventId: SourceEventIdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const service = new FinanceOrchestratorService(db);
        const { sourceEventId, ...payload } = input;

        const result = await service.issueAdvance(payload, {
          userId: ctx.user.id,
          scope: ctx.scope,
        }, sourceEventId);

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Advance issuance failed: ${message}`,
        });
      }
    }),

  /**
   * LIQUIDATE ADVANCE
   * 
   * Settles (liquidates) a staff advance with receipts/documents.
   * Routes to advancesRouter (existing router).
   * 
   * Uses:
   * - scopedProcedure: Org/OU isolation
   * - Zod validation: Advance ID, settlement amount validated
   * - sourceEventId: Idempotency token
   * - Event publishing: Audit trail
   * 
   * Returns:
   * - status: 'ok' | 'error'
   * - data: { settlementId }
   * - event: OrchestratorEvent
   */
  liquidateAdvance: scopedProcedure
    .input(
      z.object({
        ...LiquidateAdvanceSchema.shape,
        sourceEventId: SourceEventIdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const service = new FinanceOrchestratorService(db);
        const { sourceEventId, ...payload } = input;

        const result = await service.liquidateAdvance(payload, {
          userId: ctx.user.id,
          scope: ctx.scope,
        }, sourceEventId);

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Advance liquidation failed: ${message}`,
        });
      }
    }),

  /**
   * PROCESS PAYMENT
   * 
   * Processes a vendor or staff payment.
   * Routes to paymentsRouter.create (existing router).
   * 
   * Uses:
   * - scopedProcedure: Org/OU isolation
   * - Zod validation: Vendor, amount, method validated
   * - sourceEventId: Idempotency token
   * - Event publishing: Audit trail
   * 
   * Returns:
   * - status: 'ok' | 'error'
   * - data: { paymentId }
   * - event: OrchestratorEvent
   */
  processPayment: scopedProcedure
    .input(
      z.object({
        ...PaymentPayloadSchema.shape,
        sourceEventId: SourceEventIdSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const service = new FinanceOrchestratorService(db);
        const { sourceEventId, ...payload } = input;

        const result = await service.processPayment(payload, {
          userId: ctx.user.id,
          scope: ctx.scope,
        }, sourceEventId);

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Payment processing failed: ${message}`,
        });
      }
    }),

  /**
   * EXECUTE COMPOSITE SAGA
   * 
   * Executes a complete multi-step transaction:
   * 1. GL posting
   * 2. Budget check & allocation
   * 3. Advance issuance
   * 
   * With saga pattern:
   * - All steps execute atomically
   * - On failure, compensation rolls back all changes
   * - sourceEventId prevents duplicate execution
   * 
   * Per ADR-016 (Saga pattern) and ADR-015 (Idempotency).
   * 
   * Returns:
   * - status: 'ok' | 'error'
   * - saga: SagaTransaction with step tracking
   * - event: OrchestratorEvent
   */
  executeCompositeSaga: scopedProcedure
    .input(CompositeSagaSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const service = new FinanceOrchestratorService(db);
        const { gl, budget, advance, sourceEventId } = input;

        const result = await service.executeCompositeSaga(gl, budget, advance, {
          userId: ctx.user.id,
          scope: ctx.scope,
        }, sourceEventId);

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Composite saga failed: ${message}`,
        });
      }
    }),
});

// ────────────────────────────────────────────────────────────────────────────
// ROUTER INTEGRATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Integration Instructions
 * 
 * Add to appRouter in server/routers.ts:
 * 
 * import { financeOrchestratorRouter } from './finance/FinanceOrchestratorRouter';
 * 
 * export const appRouter = router({
 *   // ... existing routers ...
 *   finance: router({
 *     // ... existing finance routers (journalEntries, budgets, advances, payments, etc.) ...
 *     orchestrator: financeOrchestratorRouter,  // NEW
 *   }),
 * });
 * 
 * This places orchestrator under finance namespace:
 * - finance.orchestrator.postGL
 * - finance.orchestrator.allocateBudget
 * - finance.orchestrator.issueAdvance
 * - finance.orchestrator.liquidateAdvance
 * - finance.orchestrator.processPayment
 * - finance.orchestrator.executeCompositeSaga
 */
