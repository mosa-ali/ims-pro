/**
 * _scope.ts — DB Type, Scope Helpers, Soft-Delete Helpers, Mutation Builders
 *
 * Centralizes:
 *  - DB type (replaces all `db: any` usages)
 *  - Scope filter builders (withScope, scopedAndActive, withSoftDelete, withDeleted, onlyDeleted)
 *  - Mutation payload builders (buildUpdatePayload, buildSoftDeletePayload, buildApprovalPayload, buildRejectionPayload)
 *
 * Architecture: KEEP the existing `import { getDb } from "../db"` pattern in routers.
 * This file is imported by db/*.ts modules only — NOT by routers directly.
 */

import { and, eq, isNull, isNotNull, SQL } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { nowSql } from './_time';

// ============================================================
// DB TYPE — replaces all `db: any` across the codebase
// ============================================================

/**
 * Typed database instance.
 * Use this instead of `db: any` in all helper functions and engine files.
 *
 * @example
 * import type { DB } from '../db/_scope';
 * export async function getActiveProjects(db: DB) { ... }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = MySql2Database<any>;

// ============================================================
// SCOPE CONTEXT
// ============================================================

export interface ScopeContext {
  organizationId: number;
  operatingUnitId?: number | null;
}

// ============================================================
// SCOPE FILTER BUILDERS
// ============================================================

/**
 * Builds a WHERE condition for organization + operating unit scope.
 * Use for ALL operational queries that require multi-tenant isolation.
 *
 * @example
 * .where(and(...withScope(table, ctx), isNull(table.deletedAt)))
 */
export function withScope<T extends { organizationId: any; operatingUnitId?: any }>(
  table: T,
  ctx: ScopeContext
): SQL[] {
  const conditions: SQL[] = [eq(table.organizationId, ctx.organizationId)];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(table.operatingUnitId, ctx.operatingUnitId));
  }
  return conditions;
}

/**
 * Builds a WHERE condition for scope + soft-delete filter (deletedAt IS NULL).
 * Use for standard "list active records" queries.
 *
 * @example
 * .where(and(...scopedAndActive(table, ctx)))
 */
export function scopedAndActive<T extends { organizationId: any; operatingUnitId?: any; deletedAt?: any }>(
  table: T,
  ctx: ScopeContext
): SQL[] {
  const conditions = withScope(table, ctx);
  if ('deletedAt' in table) {
    conditions.push(isNull(table.deletedAt));
  }
  return conditions;
}

// ============================================================
// SOFT-DELETE FILTER HELPERS
// ============================================================

/**
 * Returns a WHERE condition for soft-deleted records (deletedAt IS NULL).
 * Equivalent to the existing withSoftDelete pattern.
 *
 * @example
 * .where(and(withSoftDelete(table), eq(table.organizationId, orgId)))
 */
export function withSoftDelete<T extends { deletedAt: any }>(table: T): SQL {
  return isNull(table.deletedAt);
}

/**
 * Returns a WHERE condition that INCLUDES soft-deleted records.
 * Use when you need to show all records regardless of deletion status.
 * (No filter applied — returns a truthy SQL literal)
 *
 * @example
 * .where(and(...withScope(table, ctx))) // withDeleted = no deletedAt filter
 */
export function withDeleted(): SQL[] {
  return []; // No deletedAt filter — caller uses withScope only
}

/**
 * Returns a WHERE condition for ONLY soft-deleted records (deletedAt IS NOT NULL).
 * Use for "Deleted Records" / recycle bin views.
 *
 * @example
 * .where(and(onlyDeleted(table), eq(table.organizationId, orgId)))
 */
export function onlyDeleted<T extends { deletedAt: any }>(table: T): SQL {
  return isNotNull(table.deletedAt);
}

// ============================================================
// MUTATION PAYLOAD BUILDERS
// ============================================================

/**
 * Builds a standard update payload with updatedAt set to nowSql().
 * Eliminates repeated `updatedAt: nowSql()` patterns across all modules.
 *
 * @example
 * await db.update(projects).set(buildUpdatePayload({ name: input.name })).where(...)
 */
export function buildUpdatePayload<T extends Record<string, unknown>>(
  data: T
): Record<string, unknown> {
  return {
    ...data,
    updatedAt: nowSql(),
  };
}

/**
 * Builds a soft-delete payload with isDeleted=1, deletedAt, and deletedBy.
 * Implements the dual-column soft-delete platform standard.
 *
 * @example
 * await db.update(projects).set(buildSoftDeletePayload(ctx.user.id)).where(...)
 */
export function buildSoftDeletePayload(userId: number | string): Record<string, unknown> {
  const now = nowSql();
  return {
    isDeleted: 1,
    deletedAt: now,
    deletedBy: userId,
    updatedAt: now,
  };
}

/**
 * Builds a restore (un-delete) payload.
 * Clears isDeleted, deletedAt, and deletedBy.
 *
 * @example
 * await db.update(projects).set(buildRestorePayload()).where(...)
 */
export function buildRestorePayload(): Record<string, unknown> {
  return {
    isDeleted: 0,
    deletedAt: null,
    deletedBy: null,
    updatedAt: nowSql(),
  };
}

/**
 * Builds an approval payload with approvedAt, approvedBy, and status.
 *
 * @example
 * await db.update(purchaseRequests).set(buildApprovalPayload(ctx.user.id, PR_STATUS.APPROVED)).where(...)
 */
export function buildApprovalPayload(
  userId: number | string,
  status: string
): Record<string, unknown> {
  const now = nowSql();
  return {
    status,
    approvedAt: now,
    approvedBy: userId,
    updatedAt: now,
  };
}

/**
 * Builds a rejection payload with rejectedAt, rejectedBy, rejectionReason, and status.
 *
 * @example
 * await db.update(purchaseRequests).set(buildRejectionPayload(ctx.user.id, PR_STATUS.REJECTED_BY_PM, reason)).where(...)
 */
export function buildRejectionPayload(
  userId: number | string,
  status: string,
  reason?: string
): Record<string, unknown> {
  const now = nowSql();
  return {
    status,
    rejectedAt: now,
    rejectedBy: userId,
    rejectionReason: reason ?? null,
    updatedAt: now,
  };
}

/**
 * Builds a submission payload with submittedAt, submittedBy, and status.
 *
 * @example
 * await db.update(purchaseRequests).set(buildSubmissionPayload(ctx.user.id, PR_STATUS.SUBMITTED)).where(...)
 */
export function buildSubmissionPayload(
  userId: number | string,
  status: string
): Record<string, unknown> {
  const now = nowSql();
  return {
    status,
    submittedAt: now,
    submittedBy: userId,
    updatedAt: now,
  };
}

/**
 * Builds a completion payload with completedAt and status.
 *
 * @example
 * await db.update(contracts).set(buildCompletionPayload(PROJECT_STATUS.COMPLETED)).where(...)
 */
export function buildCompletionPayload(status: string): Record<string, unknown> {
  const now = nowSql();
  return {
    status,
    completedAt: now,
    updatedAt: now,
  };
}
