/**
 * db/hr.ts — HR Query Helpers
 *
 * Reusable query helpers for the HR module.
 *
 * Standards:
 *  - All timestamps use nowSql() — never sql`NOW()`
 *  - All status values use HR status constants — never hardcoded strings
 *  - All queries use scopedAndActive() — never inline eq(organizationId, ...)
 *  - Soft deletes use buildSoftDeletePayload() — never inline isDeleted=1
 *  - db parameter typed as DB — never `db: any`
 */

import { and, eq, isNull, desc, like, or, count, gte, lte } from 'drizzle-orm';
import {
  hrEmployees,
  hrLeaveRequests,
  hrRecruitmentJobs,
  hrRecruitmentCandidates,
  hrPayrollRecords,
  hrSanctions,
  hrDocuments,
  hrAttendanceRecords,
  hrAnnualPlans,
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
import { nowSql, todaySqlDate } from './_time';
import {
  EMPLOYEE_STATUS,
  LEAVE_REQUEST_STATUS,
  JOB_STATUS,
  PAYROLL_STATUS,
  SANCTION_STATUS,
  type EmployeeStatus,
  type LeaveRequestStatus,
  type JobStatus,
  type PayrollStatus,
} from './_status';

// ============================================================
// EMPLOYEES
// ============================================================

/**
 * List active employees for a given scope.
 */
export async function listEmployees(
  db: DB,
  ctx: ScopeContext,
  options: { status?: EmployeeStatus | 'all'; searchTerm?: string; limit?: number; offset?: number } = {}
) {
  const { status, searchTerm, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(hrEmployees, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(hrEmployees.status, status));
  }

  if (searchTerm) {
    conditions.push(
      or(
        like(hrEmployees.firstName, `%${searchTerm}%`),
        like(hrEmployees.lastName, `%${searchTerm}%`),
        like(hrEmployees.employeeCode, `%${searchTerm}%`),
        like(hrEmployees.email, `%${searchTerm}%`),
      )!
    );
  }

  return db
    .select()
    .from(hrEmployees)
    .where(and(...conditions))
    .orderBy(desc(hrEmployees.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get a single employee by ID with scope validation.
 */
export async function getEmployee(db: DB, employeeId: number, ctx: ScopeContext) {
  const [employee] = await db
    .select()
    .from(hrEmployees)
    .where(and(
      eq(hrEmployees.id, employeeId),
      ...scopedAndActive(hrEmployees, ctx),
    ))
    .limit(1);
  return employee ?? null;
}

/**
 * Soft-delete an employee.
 */
export async function softDeleteEmployee(
  db: DB,
  employeeId: number,
  userId: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrEmployees)
    .set(buildSoftDeletePayload(userId))
    .where(and(
      eq(hrEmployees.id, employeeId),
      ...scopedAndActive(hrEmployees, ctx),
    ));
}

/**
 * Update employee status.
 */
export async function updateEmployeeStatus(
  db: DB,
  employeeId: number,
  status: EmployeeStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrEmployees)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(hrEmployees.id, employeeId),
      ...scopedAndActive(hrEmployees, ctx),
    ));
}

// ============================================================
// LEAVE REQUESTS
// ============================================================

/**
 * List leave requests for a given scope.
 */
export async function listLeaveRequests(
  db: DB,
  ctx: ScopeContext,
  options: { status?: LeaveRequestStatus | 'all'; employeeId?: number; limit?: number; offset?: number } = {}
) {
  const { status, employeeId, limit = 100, offset = 0 } = options;
  const conditions = [
    eq(hrLeaveRequests.organizationId, ctx.organizationId),
    isNull(hrLeaveRequests.deletedAt),
  ];

  if (ctx.operatingUnitId != null) {
    conditions.push(eq(hrLeaveRequests.operatingUnitId, ctx.operatingUnitId));
  }

  if (status && status !== 'all') {
    conditions.push(eq(hrLeaveRequests.status, status));
  }

  if (employeeId) {
    conditions.push(eq(hrLeaveRequests.employeeId, employeeId));
  }

  return db
    .select()
    .from(hrLeaveRequests)
    .where(and(...conditions))
    .orderBy(desc(hrLeaveRequests.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Approve a leave request.
 */
export async function approveLeaveRequest(
  db: DB,
  leaveRequestId: number,
  approvedBy: number,
  organizationId: number
): Promise<void> {
  await db
    .update(hrLeaveRequests)
    .set(buildApprovalPayload(approvedBy, LEAVE_REQUEST_STATUS.APPROVED))
    .where(and(
      eq(hrLeaveRequests.id, leaveRequestId),
      eq(hrLeaveRequests.organizationId, organizationId),
      eq(hrLeaveRequests.status, LEAVE_REQUEST_STATUS.PENDING),
    ));
}

/**
 * Reject a leave request.
 */
export async function rejectLeaveRequest(
  db: DB,
  leaveRequestId: number,
  rejectedBy: number,
  reason: string,
  organizationId: number
): Promise<void> {
  await db
    .update(hrLeaveRequests)
    .set(buildRejectionPayload(rejectedBy, LEAVE_REQUEST_STATUS.REJECTED, reason))
    .where(and(
      eq(hrLeaveRequests.id, leaveRequestId),
      eq(hrLeaveRequests.organizationId, organizationId),
      eq(hrLeaveRequests.status, LEAVE_REQUEST_STATUS.PENDING),
    ));
}

// ============================================================
// RECRUITMENT JOBS
// ============================================================

/**
 * List recruitment jobs for a given scope.
 */
export async function listRecruitmentJobs(
  db: DB,
  ctx: ScopeContext,
  options: { status?: JobStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(hrRecruitmentJobs, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(hrRecruitmentJobs.status, status));
  }

  return db
    .select()
    .from(hrRecruitmentJobs)
    .where(and(...conditions))
    .orderBy(desc(hrRecruitmentJobs.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update recruitment job status.
 */
export async function updateJobStatus(
  db: DB,
  jobId: number,
  status: JobStatus,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrRecruitmentJobs)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(hrRecruitmentJobs.id, jobId),
      ...scopedAndActive(hrRecruitmentJobs, ctx),
    ));
}

// ============================================================
// PAYROLL RECORDS
// ============================================================

/**
 * List payroll records for a given scope.
 */
export async function listPayrollRecords(
  db: DB,
  ctx: ScopeContext,
  options: { status?: PayrollStatus | 'all'; limit?: number; offset?: number } = {}
) {
  const { status, limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(hrPayrollRecords, ctx);

  if (status && status !== 'all') {
    conditions.push(eq(hrPayrollRecords.status, status));
  }

  return db
    .select()
    .from(hrPayrollRecords)
    .where(and(...conditions))
    .orderBy(desc(hrPayrollRecords.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Approve a payroll record (atomic transaction).
 */
export async function approvePayrollRecord(
  db: DB,
  payrollId: number,
  approvedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db.transaction(async (tx) => {
    const [record] = await tx
      .select({ id: hrPayrollRecords.id, status: hrPayrollRecords.status })
      .from(hrPayrollRecords)
      .where(and(
        eq(hrPayrollRecords.id, payrollId),
        ...scopedAndActive(hrPayrollRecords, ctx),
      ))
      .limit(1);

    if (!record) {
      throw new Error(`Payroll record ${payrollId} not found or out of scope`);
    }

    if (record.status !== PAYROLL_STATUS.PENDING_APPROVAL) {
      throw new Error(`Payroll record ${payrollId} is not in pending_approval status`);
    }

    await tx
      .update(hrPayrollRecords)
      .set(buildApprovalPayload(approvedBy, PAYROLL_STATUS.APPROVED))
      .where(eq(hrPayrollRecords.id, payrollId));
  });
}

// ============================================================
// HR SANCTIONS
// ============================================================

/**
 * List HR sanctions for a given scope.
 */
export async function listSanctions(
  db: DB,
  ctx: ScopeContext,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 100, offset = 0 } = options;
  const conditions = scopedAndActive(hrSanctions, ctx);

  return db
    .select()
    .from(hrSanctions)
    .where(and(...conditions))
    .orderBy(desc(hrSanctions.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update sanction status.
 */
export async function updateSanctionStatus(
  db: DB,
  sanctionId: number,
  status: string,
  updatedBy: number,
  ctx: ScopeContext
): Promise<void> {
  await db
    .update(hrSanctions)
    .set(buildUpdatePayload({ status, updatedBy }))
    .where(and(
      eq(hrSanctions.id, sanctionId),
      ...scopedAndActive(hrSanctions, ctx),
    ));
}
