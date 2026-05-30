/**
 * db/compliance.ts — Compliance, MEAL & Reporting Query Helpers
 *
 * Reusable query helpers for the Compliance, MEAL (Monitoring, Evaluation,
 * Accountability, and Learning), and Reporting modules.
 *
 * Standards:
 *  - All timestamps use nowSql() — never sql`NOW()`
 *  - All status values use compliance/MEAL status constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - Soft deletes use buildSoftDeletePayload() — never inline isDeleted=1
 *  - db parameter typed as DB — never `db: any`
 *  - Approval/rejection workflows use db.transaction() for atomicity
 */

import { and, eq, isNull, desc, like, or, count } from 'drizzle-orm';
import {
  risks,
  indicators,
  activities,
  tasks,
  projectReportingSchedules,
  caseRecords,
} from '../../drizzle/schema';
import type { DB, ScopeContext } from './_scope';
import {
  scopedAndActive,
  withScope,
  onlyDeleted,
  buildUpdatePayload,
  buildSoftDeletePayload,
  buildRestorePayload,
  buildApprovalPayload,
  buildRejectionPayload,
} from './_scope';
import { nowSql } from './_time';
import {
  RISK_STATUS,
  INDICATOR_STATUS,
  ACTIVITY_STATUS,
  TASK_STATUS,
  REPORTING_SCHEDULE_STATUS,
  type RiskStatus,
  type IndicatorStatus,
  type ActivityStatus,
  type TaskStatus,
  type ReportingScheduleStatus,
} from './_status';

// ============================================================
// RISKS
// ============================================================

/**
 * List risks for a given scope.
 */
export async function listRisks(
  db: DB,
  ctx: ScopeContext,
  options: { status?: RiskStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(risks, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(risks.status, status));
  }

  return db
    .select()
    .from(risks)
    .where(and(...conditions))
    .orderBy(desc(risks.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update risk status.
 */
export async function updateRiskStatus(
  db: DB,
  riskId: number,
  status: RiskStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(risks)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(risks.id, riskId),
      ...scopedAndActive(risks, ctx),
    ));
}

/**
 * Close a risk.
 */
export async function closeRisk(
  db: DB,
  riskId: number,
  closedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(risks)
    .set(buildUpdatePayload({ status: RISK_STATUS.CLOSED, updatedBy: closedBy }))
    .where(and(
      eq(risks.id, riskId),
      ...scopedAndActive(risks, ctx),
    ));
}

/**
 * Soft-delete a risk.
 */
export async function softDeleteRisk(
  db: DB,
  riskId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(risks)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(risks.id, riskId),
      ...scopedAndActive(risks, ctx),
    ));
}

// ============================================================
// INDICATORS
// ============================================================

/**
 * List indicators for a given scope.
 */
export async function listIndicators(
  db: DB,
  ctx: ScopeContext,
  options: { status?: IndicatorStatus | 'all'; projectId?: number; limit?: number; offset?: number } = {}
) {
  const { status, projectId, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(indicators, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(indicators.status, status));
  }

  if (projectId != null) {
    conditions.push(eq(indicators.projectId, projectId));
  }

  return db
    .select()
    .from(indicators)
    .where(and(...conditions))
    .orderBy(desc(indicators.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update indicator status.
 */
export async function updateIndicatorStatus(
  db: DB,
  indicatorId: number,
  status: IndicatorStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(indicators)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(indicators.id, indicatorId),
      ...scopedAndActive(indicators, ctx),
    ));
}

/**
 * Soft-delete an indicator.
 */
export async function softDeleteIndicator(
  db: DB,
  indicatorId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(indicators)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(indicators.id, indicatorId),
      ...scopedAndActive(indicators, ctx),
    ));
}

// ============================================================
// ACTIVITIES
// ============================================================

/**
 * List activities for a given scope.
 */
export async function listActivities(
  db: DB,
  ctx: ScopeContext,
  options: { status?: ActivityStatus | 'all'; projectId?: number; limit?: number; offset?: number } = {}
) {
  const { status, projectId, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(activities, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(activities.status, status));
  }

  if (projectId != null) {
    conditions.push(eq(activities.projectId, projectId));
  }

  return db
    .select()
    .from(activities)
    .where(and(...conditions))
    .orderBy(desc(activities.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update activity status.
 */
export async function updateActivityStatus(
  db: DB,
  activityId: number,
  status: ActivityStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(activities)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(activities.id, activityId),
      ...scopedAndActive(activities, ctx),
    ));
}

/**
 * Soft-delete an activity.
 */
export async function softDeleteActivity(
  db: DB,
  activityId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(activities)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(activities.id, activityId),
      ...scopedAndActive(activities, ctx),
    ));
}

// ============================================================
// TASKS
// ============================================================

/**
 * List tasks for a given scope.
 */
export async function listTasks(
  db: DB,
  ctx: ScopeContext,
  options: { status?: TaskStatus | 'all'; projectId?: number; assignedTo?: number; limit?: number; offset?: number } = {}
) {
  const { status, projectId, assignedTo, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(tasks, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(tasks.status, status));
  }

  if (projectId != null) {
    conditions.push(eq(tasks.projectId, projectId));
  }

  if (assignedTo != null) {
    conditions.push(eq(tasks.assignedTo, assignedTo));
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update task status.
 */
export async function updateTaskStatus(
  db: DB,
  taskId: number,
  status: TaskStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(tasks)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(tasks.id, taskId),
      ...scopedAndActive(tasks, ctx),
    ));
}

/**
 * Soft-delete a task.
 */
export async function softDeleteTask(
  db: DB,
  taskId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(tasks)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(tasks.id, taskId),
      ...scopedAndActive(tasks, ctx),
    ));
}

// ============================================================
// PROJECT REPORTING SCHEDULES
// ============================================================

/**
 * List reporting schedules for a given scope.
 */
export async function listReportingSchedules(
  db: DB,
  ctx: ScopeContext,
  options: { status?: ReportingScheduleStatus | 'all'; projectId?: number; limit?: number; offset?: number } = {}
) {
  const { status, projectId, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(projectReportingSchedules, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(projectReportingSchedules.status, status));
  }

  if (projectId != null) {
    conditions.push(eq(projectReportingSchedules.projectId, projectId));
  }

  return db
    .select()
    .from(projectReportingSchedules)
    .where(and(...conditions))
    .orderBy(desc(projectReportingSchedules.dueDate))
    .limit(limit)
    .offset(offset);
}

/**
 * Submit a reporting schedule. Atomic transaction.
 */
export async function submitReportingSchedule(
  db: DB,
  scheduleId: number,
  submittedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: projectReportingSchedules.id, status: projectReportingSchedules.status })
      .from(projectReportingSchedules)
      .where(and(
        eq(projectReportingSchedules.id, scheduleId),
        ...scopedAndActive(projectReportingSchedules, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Reporting schedule ${scheduleId} not found or out of scope`);
    if (
      record.status !== REPORTING_SCHEDULE_STATUS.PENDING &&
      record.status !== REPORTING_SCHEDULE_STATUS.IN_PROGRESS
    ) {
      throw new Error(`Reporting schedule ${scheduleId} cannot be submitted from status: ${record.status}`);
    }

    await tx
      .update(projectReportingSchedules)
      .set(buildUpdatePayload({
        status: REPORTING_SCHEDULE_STATUS.SUBMITTED,
        submittedDate: nowSql(),
        submittedBy,
      }))
      .where(eq(projectReportingSchedules.id, scheduleId));
  });
}

/**
 * Approve a reporting schedule. Atomic transaction.
 */
export async function approveReportingSchedule(
  db: DB,
  scheduleId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: projectReportingSchedules.id, status: projectReportingSchedules.status })
      .from(projectReportingSchedules)
      .where(and(
        eq(projectReportingSchedules.id, scheduleId),
        ...scopedAndActive(projectReportingSchedules, ctx),
      ))
      .limit(1);

    if (!record) throw new Error(`Reporting schedule ${scheduleId} not found or out of scope`);
    if (record.status !== REPORTING_SCHEDULE_STATUS.SUBMITTED) {
      throw new Error(`Reporting schedule ${scheduleId} is not in submitted status`);
    }

    await tx
      .update(projectReportingSchedules)
      .set(buildApprovalPayload(approvedBy, REPORTING_SCHEDULE_STATUS.APPROVED))
      .where(eq(projectReportingSchedules.id, scheduleId));
  });
}

/**
 * Reject a reporting schedule.
 */
export async function rejectReportingSchedule(
  db: DB,
  scheduleId: number,
  rejectedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(projectReportingSchedules)
    .set(buildUpdatePayload({
      status: REPORTING_SCHEDULE_STATUS.REJECTED,
      updatedBy: rejectedBy,
    }))
    .where(and(
      eq(projectReportingSchedules.id, scheduleId),
      eq(projectReportingSchedules.status, REPORTING_SCHEDULE_STATUS.SUBMITTED),
      ...scopedAndActive(projectReportingSchedules, ctx),
    ));
}

/**
 * Soft-delete a reporting schedule.
 */
export async function softDeleteReportingSchedule(
  db: DB,
  scheduleId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(projectReportingSchedules)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(projectReportingSchedules.id, scheduleId),
      ...scopedAndActive(projectReportingSchedules, ctx),
    ));
}

// ============================================================
// CASE RECORDS (MEAL / PSS)
// ============================================================

/**
 * List case records for a given scope.
 */
export async function listCaseRecords(
  db: DB,
  ctx: ScopeContext,
  options: { status?: string; projectId?: number; searchTerm?: string; limit?: number; offset?: number } = {}
) {
  const { status, projectId, searchTerm, limit = 100, offset = 0 } = options;
  const conditions = [
    eq(caseRecords.organizationId, ctx.organizationId),
    isNull(caseRecords.deletedAt),
  ];

  if (status) {
    conditions.push(eq(caseRecords.status, status));
  }

  if (projectId != null) {
    conditions.push(eq(caseRecords.projectId, projectId));
  }

  if (searchTerm) {
    conditions.push(
      or(
        like(caseRecords.caseCode, `%${searchTerm}%`),
        like(caseRecords.beneficiaryCode, `%${searchTerm}%`),
        like(caseRecords.firstName, `%${searchTerm}%`),
        like(caseRecords.lastName, `%${searchTerm}%`),
      )!
    );
  }

  return db
    .select()
    .from(caseRecords)
    .where(and(...conditions))
    .orderBy(desc(caseRecords.openedAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Close a case record.
 */
export async function closeCaseRecord(
  db: DB,
  caseId: number,
  closedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(caseRecords)
    .set(buildUpdatePayload({
      status: 'closed',
      closedAt: nowSql(),
    }))
    .where(and(
      eq(caseRecords.id, caseId),
      eq(caseRecords.organizationId, ctx.organizationId),
      isNull(caseRecords.deletedAt),
    ));
}

/**
 * Soft-delete a case record.
 */
export async function softDeleteCaseRecord(
  db: DB,
  caseId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(caseRecords)
    .set(buildUpdatePayload({
      deletedAt: nowSql(),
      deletedBy: userId,
    }))
    .where(and(
      eq(caseRecords.id, caseId),
      eq(caseRecords.organizationId, ctx.organizationId),
      isNull(caseRecords.deletedAt),
    ));
}
