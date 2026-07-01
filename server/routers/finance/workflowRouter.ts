/**
 * server/routers/workflowRouter.ts
 *
 * Workflow Router
 * Exposes Workflow Engine via tRPC procedures.
 * Handles approval workflows and approval matrices.
 */

import { router, protectedProcedure, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getWorkflowEngine } from '../../engines/WorkflowEngine';

// ── Input Schemas ────────────────────────────────────────────────────────────

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ── Workflow Router ──────────────────────────────────────────────────────────

export const workflowRouter = router({
  /**
   * Get approval matrix
   */
  getApprovalMatrix: scopedProcedure
    .input(
      z.object({
        applicableFor: z.enum(['payment', 'invoice', 'expenditure', 'budget']),
      })
    )
    .query(async ({ input, ctx }) => {
      const engine = await getWorkflowEngine();
      return engine.getApprovalMatrix(ctx.scope.organizationId, input.applicableFor);
    }),

  /**
   * Create approval request
   */
  createApprovalRequest: scopedProcedure
    .input(
      z.object({
        requestType: z.enum(['payment', 'invoice', 'expenditure', 'budget']),
        requestId: z.number(),
        amount: z.number().positive(),
        requesterName: z.string(),
        requesterRole: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const engine = await getWorkflowEngine();
      return engine.createApprovalRequest(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId,
        input.requestType,
        input.requestId,
        input.amount,
        input.requesterName,
        input.requesterRole,
        input.description
      );
    }),

  /**
   * Get approval request
   */
  getApprovalRequest: scopedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input }) => {
      const engine = await getWorkflowEngine();
      return engine.getApprovalRequest(input.requestId);
    }),

  /**
   * Approve request
   */
  approveRequest: scopedProcedure
    .input(
      z.object({
        requestId: z.string(),
        approverName: z.string(),
        approverRole: z.enum(['supervisor', 'manager', 'director', 'executive', 'finance']),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await getWorkflowEngine();
      return engine.approveRequest(
        input.requestId,
        input.approverName,
        input.approverRole,
        input.comment
      );
    }),

  /**
   * Reject request
   */
  rejectRequest: scopedProcedure
    .input(
      z.object({
        requestId: z.string(),
        approverName: z.string(),
        approverRole: z.enum(['supervisor', 'manager', 'director', 'executive', 'finance']),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await getWorkflowEngine();
      return engine.rejectRequest(
        input.requestId,
        input.approverName,
        input.approverRole,
        input.reason
      );
    }),

  /**
   * Escalate request
   */
  escalateRequest: scopedProcedure
    .input(
      z.object({
        requestId: z.string(),
        escalatedBy: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await getWorkflowEngine();
      return engine.escalateRequest(input.requestId, input.escalatedBy, input.reason);
    }),

  /**
   * Get approval workflow
   */
  getApprovalWorkflow: scopedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input }) => {
      const engine = await getWorkflowEngine();
      return engine.getApprovalWorkflow(input.requestId);
    }),

  /**
   * Get pending approvals for user
   */
  getPendingApprovalsForUser: scopedProcedure
    .input(
      z.object({
        approverRole: z.enum(['supervisor', 'manager', 'director', 'executive', 'finance']),
      })
    )
    .query(async ({ input, ctx }) => {
      const engine = await getWorkflowEngine();
      return engine.getPendingApprovalsForUser(ctx.scope.organizationId, input.approverRole);
    }),

  /**
   * Get approval history
   */
  getApprovalHistory: scopedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input }) => {
      const engine = await getWorkflowEngine();
      return engine.getApprovalHistory(input.requestId);
    }),

  /**
   * Generate approval notifications
   */
  generateApprovalNotifications: scopedProcedure.query(async ({ ctx }) => {
    const engine = await getWorkflowEngine();
    return engine.generateApprovalNotifications(ctx.scope.organizationId);
  }),

  /**
   * Get approval statistics
   */
  getApprovalStatistics: scopedProcedure.query(async ({ ctx }) => {
    const engine = await getWorkflowEngine();
    return engine.getApprovalStatistics(ctx.scope.organizationId);
  }),
});
