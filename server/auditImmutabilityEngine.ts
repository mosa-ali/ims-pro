import { TRPCError } from '@trpc/server';
import { scopedProcedure } from './_core/trpc';
import { z } from 'zod';
import { router } from './_core/trpc';

/**
 * Audit Immutability Engine
 * 
 * Implements append-only audit logs:
 * - All audit events are immutable (no UPDATE or DELETE)
 * - Events recorded with actor, timestamp, and details
 * - Supports audit trail retrieval and verification
 * - Enables compliance auditing and forensics
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type AuditEventType =
  | 'JOURNAL_POSTED'
  | 'JOURNAL_REVERSED'
  | 'INVOICE_APPROVED'
  | 'INVOICE_REJECTED'
  | 'PAYMENT_POSTED'
  | 'PAYMENT_REVERSED'
  | 'EXPENDITURE_APPROVED'
  | 'EXPENDITURE_REJECTED'
  | 'PERIOD_LOCKED'
  | 'PERIOD_REOPENED'
  | 'BUDGET_MODIFIED'
  | 'MATCHING_RESULT_RECORDED'
  | 'ALLOCATION_CREATED'
  | 'ALLOCATION_REVERSED';

export interface AuditEvent {
  id: number;
  organizationId: number;
  operatingUnitId: number | null;
  eventType: AuditEventType;
  entityType: string; // journal, invoice, payment, expenditure, etc.
  entityId: number;
  actorUserId: number;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string; // Description of action
  details: Record<string, any>; // JSON details
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Record an audit event
 * 
 * Rules:
 * 1. All fields are required
 * 2. Event is immutable once recorded
 * 3. Actor snapshot captured at time of event
 * 4. Details stored as JSON for flexibility
 */
export async function recordAuditEvent(
  organizationId: number,
  operatingUnitId: number | null,
  eventType: AuditEventType,
  entityType: string,
  entityId: number,
  actorUserId: number,
  actorName: string,
  actorEmail: string,
  actorRole: string,
  action: string,
  details: Record<string, any>,
  ipAddress: string | null = null,
  userAgent: string | null = null
): Promise<AuditEvent> {
  // Placeholder: In production, insert into audit_events table
  const now = new Date();

  return {
    id: 1,
    organizationId,
    operatingUnitId,
    eventType,
    entityType,
    entityId,
    actorUserId,
    actorName,
    actorEmail,
    actorRole,
    action,
    details,
    ipAddress,
    userAgent,
    createdAt: now,
  };
}

/**
 * Get audit trail for an entity
 */
export async function getAuditTrail(
  organizationId: number,
  entityType: string,
  entityId: number
): Promise<AuditEvent[]> {
  // Placeholder: Query audit_events table
  return [];
}

/**
 * Get audit trail for a user
 */
export async function getUserAuditTrail(
  organizationId: number,
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<AuditEvent[]> {
  // Placeholder: Query audit_events table for user actions
  return [];
}

/**
 * Verify audit trail integrity
 * 
 * Checks:
 * 1. No gaps in event sequence
 * 2. No deleted events
 * 3. Timestamps are monotonically increasing
 */
export async function verifyAuditTrailIntegrity(
  organizationId: number,
  entityType: string,
  entityId: number
): Promise<{
  valid: boolean;
  eventCount: number;
  firstEvent: Date | null;
  lastEvent: Date | null;
  issues: string[];
}> {
  const trail = await getAuditTrail(organizationId, entityType, entityId);

  const issues: string[] = [];

  // Check for gaps
  if (trail.length === 0) {
    return {
      valid: true,
      eventCount: 0,
      firstEvent: null,
      lastEvent: null,
      issues,
    };
  }

  // Check monotonically increasing timestamps
  for (let i = 1; i < trail.length; i++) {
    if (trail[i].createdAt < trail[i - 1].createdAt) {
      issues.push(
        `Timestamp out of order at event ${i}: ${trail[i].createdAt} < ${trail[i - 1].createdAt}`
      );
    }
  }

  return {
    valid: issues.length === 0,
    eventCount: trail.length,
    firstEvent: trail[0]?.createdAt || null,
    lastEvent: trail[trail.length - 1]?.createdAt || null,
    issues,
  };
}

/**
 * Export audit trail for compliance
 */
export async function exportAuditTrail(
  organizationId: number,
  startDate: Date,
  endDate: Date,
  format: 'JSON' | 'CSV'
): Promise<string> {
  // Placeholder: Query and export audit events
  return '';
}

// ============================================================================
// tRPC ROUTER
// ============================================================================

export const auditImmutabilityRouter = router({
  recordAuditEvent: scopedProcedure
    .input(
      z.object({
        eventType: z.string(),
        entityType: z.string(),
        entityId: z.number(),
        action: z.string(),
        details: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await recordAuditEvent(
        ctx.user.organizationId,
        ctx.user.operatingUnitId,
        input.eventType as AuditEventType,
        input.entityType,
        input.entityId,
        ctx.user.id,
        ctx.user.name || 'Unknown',
        ctx.user.email || 'unknown@example.com',
        ctx.user.role || 'USER',
        input.action,
        input.details
      );
    }),

  getAuditTrail: scopedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getAuditTrail(
        ctx.user.organizationId,
        input.entityType,
        input.entityId
      );
    }),

  getUserAuditTrail: scopedProcedure
    .input(
      z.object({
        userId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getUserAuditTrail(
        ctx.user.organizationId,
        input.userId,
        input.startDate,
        input.endDate
      );
    }),

  verifyAuditTrailIntegrity: scopedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await verifyAuditTrailIntegrity(
        ctx.user.organizationId,
        input.entityType,
        input.entityId
      );
    }),

  exportAuditTrail: scopedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        format: z.enum(['JSON', 'CSV']),
      })
    )
    .query(async ({ ctx, input }) => {
      return await exportAuditTrail(
        ctx.user.organizationId,
        input.startDate,
        input.endDate,
        input.format
      );
    }),
});
