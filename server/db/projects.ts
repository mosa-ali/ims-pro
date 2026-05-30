/**
 * db/projects.ts — Project Query Helpers
 *
 * Reusable query helpers for the Projects module.
 * Routers import getDb from "../db" and call these helpers with the db instance.
 *
 * Standards:
 *  - All timestamps use nowSql() — never sql`NOW()`
 *  - All status values use PROJECT_STATUS constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - Soft deletes use buildSoftDeletePayload() — never inline isDeleted=1
 *  - db parameter typed as DB — never `db: any`
 */

import { and, eq, isNull, desc, like, or, count } from 'drizzle-orm';
import { projects, grants, activities, tasks } from '../../drizzle/schema';
import type { DB, ScopeContext } from './_scope';
import {
  scopedAndActive,
  withScope,
  onlyDeleted,
  buildUpdatePayload,
  buildSoftDeletePayload,
  buildRestorePayload,
} from './_scope';
import { nowSql } from './_time';
import { PROJECT_STATUS, type ProjectStatus } from './_status';

// ============================================================
// TYPES
// ============================================================

export interface ProjectListOptions {
  status?: ProjectStatus | 'all';
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

// ============================================================
// QUERIES
// ============================================================

/**
 * List active projects for a given scope.
 * Applies org/OU isolation and soft-delete filter.
 */
export async function listProjects(
  db: DB,
  ctx: ScopeContext,
  options: ProjectListOptions = {}
) {
  const { status, searchTerm, limit = 100, offset = 0 } = options;

  const conditions = scopedAndActive(projects, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(projects.status, status));
  }

  if (searchTerm) {
    conditions.push(
      or(
        like(projects.title, `%${searchTerm}%`),
        like(projects.titleAr, `%${searchTerm}%`),
        like(projects.projectCode, `%${searchTerm}%`),
      )!
    );
  }

  return db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single project by ID with scope validation.
 */
export async function getProject(db: DB, projectId: number, ctx: ScopeContext) {
  const conditions = [
    eq(projects.id, projectId),
    ...scopedAndActive(projects, ctx),
  ];

  const [project] = await db
    .select()
    .from(projects)
    .where(and(...conditions))
    .limit(1);

  return project ?? null;
}

/**
 * Count active projects by status for dashboard metrics.
 */
export async function countProjectsByStatus(db: DB, ctx: ScopeContext) {
  const rows = await db
    .select({ status: projects.status, total: count() })
    .from(projects)
    .where(and(...scopedAndActive(projects, ctx)))
    .groupBy(projects.status);

  return rows;
}

/**
 * List soft-deleted projects (for Deleted Records module).
 */
export async function listDeletedProjects(db: DB, ctx: ScopeContext) {
  const conditions = [
    ...withScope(projects, ctx),
    onlyDeleted(projects),
  ];

  return db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(desc(projects.deletedAt));
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Soft-delete a project.
 * Sets isDeleted=1, deletedAt, deletedBy using platform standard.
 */
export async function softDeleteProject(
  db: DB,
  projectId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(projects)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(projects.id, projectId),
      ...scopedAndActive(projects, ctx),
    ));
}

/**
 * Restore a soft-deleted project.
 */
export async function restoreProject(
  db: DB,
  projectId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(projects)
    .set(buildRestorePayload())
    .where(and(
      eq(projects.id, projectId),
      ...withScope(projects, ctx),
    ));
}

/**
 * Update project status with audit timestamp.
 */
export async function updateProjectStatus(
  db: DB,
  projectId: number,
  status: ProjectStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(projects)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(projects.id, projectId),
      ...scopedAndActive(projects, ctx),
    ));
}

/**
 * Update project fields with automatic updatedAt timestamp.
 */
export async function updateProject(
  db: DB,
  projectId: number,
  data: Partial<typeof projects.$inferInsert>,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(projects)
    .set(buildUpdatePayload({ ...data, updatedBy }))
    .where(and(
      eq(projects.id, projectId),
      ...scopedAndActive(projects, ctx),
    ));
}
