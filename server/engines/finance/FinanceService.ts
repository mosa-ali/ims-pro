/**
 * FinanceOrchestratorService.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Finance Orchestrator Service (Public API)
 * 
 * REVISED Phase 2: Service layer that:
 * - Wraps FinanceOrchestratorEngine
 * - Enforces scopedProcedure context (org/OU isolation)
 * - Validates inputs with Zod schemas
 * - Returns strongly-typed responses
 * - Routes to actual tRPC router methods
 * 
 * Per Mandatory Rule #4: NEVER read organizationId/operatingUnitId from user input.
 * ALWAYS use ctx.scope from scopedProcedure.
 * 
 * Per Mandatory Rule #6: Never duplicate scope validation - rely on ctx.scope entirely.
 */

import { TRPCError } from '@trpc/server';
import { FinanceOrchestratorEngine } from './FinanceEngine';
import type { DB } from './db';

import {
  GLPostingPayload,
  GLPostingPayloadSchema,
  BudgetAllocationPayload,
  IssueAdvancePayload,
  IssueAdvancePayloadSchema,
  LiquidateAdvancePayload,
  PaymentPayload,
  PaymentPayloadSchema,
  OrchestratorScope,
  OrchestratorResponse,
  SagaTransaction,
} from './FinanceTypes';

// ────────────────────────────────────────────────────────────────────────────
// SERVICE CONTEXT (From tRPC ctx in scopedProcedure)
// ────────────────────────────────────────────────────────────────────────────

export interface OrchestratorServiceContext {
  userId: number;
  scope: OrchestratorScope; // Guaranteed by scopedProcedure
}

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR SERVICE
// ────────────────────────────────────────────────────────────────────────────

export class FinanceOrchestratorService {
  private engine: FinanceOrchestratorEngine;

  constructor(db: DB) {
    this.engine = new FinanceOrchestratorEngine(db);
  }

  // ────────────────────────────────────────────────────────────────────────
  // GL POSTING SERVICE METHOD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Public service method: Post GL entry
   * 
   * Input validation: Zod schema ensures correct payload shape
   * Scope validation: ctx.scope is guaranteed by scopedProcedure (never from input)
   * Error handling: Thrown errors converted to TRPCError with proper codes
   * 
   * Usage in Router:
   * ```typescript
   * postGL: scopedProcedure.input(GLPostingPayloadSchema).mutation(async ({ ctx, input }) => {
   *   return await orchestratorService.postGL(input, ctx, sourceEventId);
   * })
   * ```
   */
  async postGL(
    input: GLPostingPayload,
    ctx: OrchestratorServiceContext,
    sourceEventId: string
  ): Promise<OrchestratorResponse<{ journalEntryId: number }>> {
    // Validate input with Zod schema
    try {
      GLPostingPayloadSchema.parse(input);
    } catch (validationError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid GL posting payload: ${validationError}`,
      });
    }

    // Validate org/OU scope exists (scope is guaranteed by scopedProcedure)
    if (!ctx.scope.organizationId || !ctx.scope.operatingUnitId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Organization or Operating Unit scope missing',
      });
    }

    // Delegate to engine
    return await this.engine.postGL(input, ctx.scope, sourceEventId, ctx.userId);
  }

  // ────────────────────────────────────────────────────────────────────────
  // BUDGET ALLOCATION SERVICE METHOD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Public service method: Allocate budget
   * 
   * Input validation: budgetId, amount validated
   * Scope validation: ctx.scope from scopedProcedure
   * 
   * Usage in Router:
   * ```typescript
   * allocateBudget: scopedProcedure.input(BudgetAllocationSchema).mutation(async ({ ctx, input }) => {
   *   return await orchestratorService.allocateBudget(input, ctx, sourceEventId);
   * })
   * ```
   */
  async allocateBudget(
    input: BudgetAllocationPayload,
    ctx: OrchestratorServiceContext,
    sourceEventId: string
  ): Promise<OrchestratorResponse<{ budgetId: number }>> {
    // Validate input
    if (!input.budgetId || input.budgetId <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid budgetId',
      });
    }
    if (!input.allocationAmount || input.allocationAmount <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Allocation amount must be positive',
      });
    }

    // Scope validation
    if (!ctx.scope.organizationId || !ctx.scope.operatingUnitId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Organization or Operating Unit scope missing',
      });
    }

    // Delegate to engine
    return await this.engine.allocateBudget(input, ctx.scope, sourceEventId, ctx.userId);
  }

  // ────────────────────────────────────────────────────────────────────────
  // ADVANCE ISSUANCE SERVICE METHOD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Public service method: Issue advance
   * 
   * Input validation: Zod schema
   * Scope validation: ctx.scope from scopedProcedure
   * 
   * Usage in Router:
   * ```typescript
   * issueAdvance: scopedProcedure.input(IssueAdvancePayloadSchema).mutation(async ({ ctx, input }) => {
   *   return await orchestratorService.issueAdvance(input, ctx, sourceEventId);
   * })
   * ```
   */
  async issueAdvance(
    input: IssueAdvancePayload,
    ctx: OrchestratorServiceContext,
    sourceEventId: string
  ): Promise<OrchestratorResponse<{ advanceId: number }>> {
    // Validate input with Zod schema
    try {
      IssueAdvancePayloadSchema.parse(input);
    } catch (validationError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid advance payload: ${validationError}`,
      });
    }

    // Scope validation
    if (!ctx.scope.organizationId || !ctx.scope.operatingUnitId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Organization or Operating Unit scope missing',
      });
    }

    // Delegate to engine
    return await this.engine.issueAdvance(input, ctx.scope, sourceEventId, ctx.userId);
  }

  // ────────────────────────────────────────────────────────────────────────
  // ADVANCE LIQUIDATION SERVICE METHOD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Public service method: Liquidate (settle) advance
   * 
   * Input validation: advanceId, amount validated
   * Scope validation: ctx.scope from scopedProcedure
   * 
   * Usage in Router:
   * ```typescript
   * liquidateAdvance: scopedProcedure.input(LiquidateAdvanceSchema).mutation(async ({ ctx, input }) => {
   *   return await orchestratorService.liquidateAdvance(input, ctx, sourceEventId);
   * })
   * ```
   */
  async liquidateAdvance(
    input: LiquidateAdvancePayload,
    ctx: OrchestratorServiceContext,
    sourceEventId: string
  ): Promise<OrchestratorResponse<{ settlementId: number }>> {
    // Validate input
    if (!input.advanceId || input.advanceId <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid advanceId',
      });
    }
    if (!input.settlementAmount || input.settlementAmount <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Settlement amount must be positive',
      });
    }

    // Scope validation
    if (!ctx.scope.organizationId || !ctx.scope.operatingUnitId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Organization or Operating Unit scope missing',
      });
    }

    // Delegate to engine
    return await this.engine.liquidateAdvance(input, ctx.scope, sourceEventId, ctx.userId);
  }

  // ────────────────────────────────────────────────────────────────────────
  // PAYMENT PROCESSING SERVICE METHOD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Public service method: Process payment
   * 
   * Input validation: Zod schema
   * Scope validation: ctx.scope from scopedProcedure
   * 
   * Usage in Router:
   * ```typescript
   * processPayment: scopedProcedure.input(PaymentPayloadSchema).mutation(async ({ ctx, input }) => {
   *   return await orchestratorService.processPayment(input, ctx, sourceEventId);
   * })
   * ```
   */
  async processPayment(
    input: PaymentPayload,
    ctx: OrchestratorServiceContext,
    sourceEventId: string
  ): Promise<OrchestratorResponse<{ paymentId: number }>> {
    // Validate input with Zod schema
    try {
      PaymentPayloadSchema.parse(input);
    } catch (validationError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid payment payload: ${validationError}`,
      });
    }

    // Scope validation
    if (!ctx.scope.organizationId || !ctx.scope.operatingUnitId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Organization or Operating Unit scope missing',
      });
    }

    // Delegate to engine
    return await this.engine.processPayment(input, ctx.scope, sourceEventId, ctx.userId);
  }

  // ────────────────────────────────────────────────────────────────────────
  // COMPOSITE SAGA SERVICE METHOD
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Public service method: Execute composite saga (GL + Budget + Advance)
   * 
   * This is the main entry point for multi-step finance operations.
   * Implements ADR-016 (Saga pattern) for atomic transactions.
   * 
   * Input validation: All three payloads validated with Zod
   * Scope validation: ctx.scope from scopedProcedure
   * Error handling: Saga compensation on failure
   * 
   * Usage in Router:
   * ```typescript
   * executeCompositeSaga: scopedProcedure
   *   .input(z.object({
   *     gl: GLPostingPayloadSchema,
   *     budget: BudgetAllocationSchema,
   *     advance: IssueAdvancePayloadSchema,
   *     sourceEventId: z.string().uuid(),
   *   }))
   *   .mutation(async ({ ctx, input }) => {
   *     return await orchestratorService.executeCompositeSaga(
   *       input.gl,
   *       input.budget,
   *       input.advance,
   *       ctx,
   *       input.sourceEventId
   *     );
   *   })
   * ```
   */
  async executeCompositeSaga(
    glPayload: GLPostingPayload,
    budgetPayload: BudgetAllocationPayload,
    advancePayload: IssueAdvancePayload,
    ctx: OrchestratorServiceContext,
    sourceEventId: string
  ): Promise<OrchestratorResponse<SagaTransaction>> {
    // Validate all payloads
    try {
      GLPostingPayloadSchema.parse(glPayload);
      IssueAdvancePayloadSchema.parse(advancePayload);
    } catch (validationError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid composite saga payloads: ${validationError}`,
      });
    }

    // Scope validation
    if (!ctx.scope.organizationId || !ctx.scope.operatingUnitId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Organization or Operating Unit scope missing',
      });
    }

    // Delegate to engine
    return await this.engine.executeCompositeSaga(
      glPayload,
      budgetPayload,
      advancePayload,
      ctx.scope,
      sourceEventId,
      ctx.userId
    );
  }
}
