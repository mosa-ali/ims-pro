/**
 * _validate.ts — Cross-Entity Scope Validators
 *
 * Validates that entities belong to the correct organization and operating unit
 * before updates, deletes, workflow actions, and approvals.
 *
 * All validators:
 *  - Check organizationId match
 *  - Check operatingUnitId match (when applicable)
 *  - Verify record exists and is not soft-deleted
 *  - Throw TRPCError with appropriate code on failure
 *
 * Architecture: Import getDb from "../db" in routers. These helpers are called
 * from within procedures after db is obtained.
 */

import { TRPCError } from '@trpc/server';
import { and, eq, isNull } from 'drizzle-orm';
import type { DB } from './_scope';
import {
  projects,
  grants,
  purchaseRequests,
  contracts,
  vendors,
  rfqs,
  activities,
  payments,
  budgets,
  goodsReceiptNotes,
  stockRequests,
  warehouseTransfers,
  indicators,
  hrEmployees,
  hrLeaveRequests,
  financeExpenditures,
  projectReportingSchedules,
} from '../../drizzle/schema';

// ============================================================
// SHARED VALIDATION INTERFACE
// ============================================================

export interface ValidationContext {
  organizationId: number;
  operatingUnitId?: number | null;
}

// ============================================================
// PROJECTS
// ============================================================

/**
 * Validates that a project exists, belongs to the org/OU, and is not deleted.
 * @throws TRPCError NOT_FOUND if project doesn't exist or is out of scope
 */
export async function validateProject(
  db: DB,
  projectId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(projects.id, projectId),
    eq(projects.organizationId, ctx.organizationId),
    isNull(projects.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(projects.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: projects.id }).from(projects).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Project ${projectId} not found or out of scope` });
  }
}

// ============================================================
// GRANTS
// ============================================================

/**
 * Validates that a grant exists, belongs to the org/OU, and is not deleted.
 */
export async function validateGrant(
  db: DB,
  grantId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(grants.id, grantId),
    eq(grants.organizationId, ctx.organizationId),
    isNull(grants.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(grants.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: grants.id }).from(grants).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Grant ${grantId} not found or out of scope` });
  }
}

// ============================================================
// PURCHASE REQUESTS
// ============================================================

/**
 * Validates that a purchase request exists, belongs to the org/OU, and is not deleted.
 */
export async function validatePurchaseRequest(
  db: DB,
  prId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(purchaseRequests.id, prId),
    eq(purchaseRequests.organizationId, ctx.organizationId),
    isNull(purchaseRequests.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(purchaseRequests.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: purchaseRequests.id }).from(purchaseRequests).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Purchase Request ${prId} not found or out of scope` });
  }
}

// ============================================================
// CONTRACTS
// ============================================================

/**
 * Validates that a contract exists, belongs to the org/OU, and is not deleted.
 */
export async function validateContract(
  db: DB,
  contractId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(contracts.id, contractId),
    eq(contracts.organizationId, ctx.organizationId),
    isNull(contracts.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(contracts.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: contracts.id }).from(contracts).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Contract ${contractId} not found or out of scope` });
  }
}

// ============================================================
// VENDORS
// ============================================================

/**
 * Validates that a vendor exists and belongs to the organization.
 * Note: vendors use organizationId only (no operatingUnitId).
 */
export async function validateVendor(
  db: DB,
  vendorId: number,
  organizationId: number
): Promise<void> {
  const [record] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(and(
      eq(vendors.id, vendorId),
      eq(vendors.organizationId, organizationId),
      isNull(vendors.deletedAt),
    ))
    .limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Vendor ${vendorId} not found or out of scope` });
  }
}

// ============================================================
// RFQs
// ============================================================

/**
 * Validates that an RFQ exists, belongs to the org/OU, and is not deleted.
 */
export async function validateRfq(
  db: DB,
  rfqId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(rfqs.id, rfqId),
    eq(rfqs.organizationId, ctx.organizationId),
    isNull(rfqs.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(rfqs.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: rfqs.id }).from(rfqs).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `RFQ ${rfqId} not found or out of scope` });
  }
}

// ============================================================
// ACTIVITIES
// ============================================================

/**
 * Validates that an activity exists, belongs to the org/OU, and is not deleted.
 */
export async function validateActivity(
  db: DB,
  activityId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(activities.id, activityId),
    eq(activities.organizationId, ctx.organizationId),
    isNull(activities.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(activities.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: activities.id }).from(activities).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Activity ${activityId} not found or out of scope` });
  }
}

// ============================================================
// INDICATORS
// ============================================================

/**
 * Validates that an indicator exists and belongs to the organization.
 */
export async function validateIndicator(
  db: DB,
  indicatorId: number,
  organizationId: number
): Promise<void> {
  const [record] = await db
    .select({ id: indicators.id })
    .from(indicators)
    .where(and(
      eq(indicators.id, indicatorId),
      eq(indicators.organizationId, organizationId),
      isNull(indicators.deletedAt),
    ))
    .limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Indicator ${indicatorId} not found or out of scope` });
  }
}

// ============================================================
// PAYMENTS
// ============================================================

/**
 * Validates that a payment exists, belongs to the org/OU, and is not deleted.
 */
export async function validatePayment(
  db: DB,
  paymentId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(payments.id, paymentId),
    eq(payments.organizationId, ctx.organizationId),
    isNull(payments.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(payments.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: payments.id }).from(payments).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Payment ${paymentId} not found or out of scope` });
  }
}

// ============================================================
// BUDGETS
// ============================================================

/**
 * Validates that a budget exists, belongs to the org/OU, and is not deleted.
 */
export async function validateBudget(
  db: DB,
  budgetId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(budgets.id, budgetId),
    eq(budgets.organizationId, ctx.organizationId),
    isNull(budgets.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(budgets.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: budgets.id }).from(budgets).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Budget ${budgetId} not found or out of scope` });
  }
}

// ============================================================
// STOCK REQUESTS
// ============================================================

/**
 * Validates that a stock request exists, belongs to the org/OU, and is not deleted.
 */
export async function validateStockRequest(
  db: DB,
  requestId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(stockRequests.id, requestId),
    eq(stockRequests.organizationId, ctx.organizationId),
    isNull(stockRequests.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(stockRequests.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: stockRequests.id }).from(stockRequests).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Stock Request ${requestId} not found or out of scope` });
  }
}

// ============================================================
// WAREHOUSE TRANSFERS
// ============================================================

/**
 * Validates that a warehouse transfer exists, belongs to the org/OU, and is not deleted.
 */
export async function validateWarehouseTransfer(
  db: DB,
  transferId: number,
  ctx: ValidationContext
): Promise<void> {
  // Note: warehouseTransfers table does not have a deletedAt column
  const conditions = [
    eq(warehouseTransfers.id, transferId),
    eq(warehouseTransfers.organizationId, ctx.organizationId),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(warehouseTransfers.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: warehouseTransfers.id }).from(warehouseTransfers).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Warehouse Transfer ${transferId} not found or out of scope` });
  }
}

// ============================================================
// GOODS RECEIPT NOTES
// ============================================================

/**
 * Validates that a GRN exists, belongs to the org/OU, and is not deleted.
 */
export async function validateGrn(
  db: DB,
  grnId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(goodsReceiptNotes.id, grnId),
    eq(goodsReceiptNotes.organizationId, ctx.organizationId),
    isNull(goodsReceiptNotes.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(goodsReceiptNotes.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: goodsReceiptNotes.id }).from(goodsReceiptNotes).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `GRN ${grnId} not found or out of scope` });
  }
}

// ============================================================
// HR EMPLOYEES
// ============================================================

/**
 * Validates that an employee exists and belongs to the organization.
 */
export async function validateEmployee(
  db: DB,
  employeeId: number,
  organizationId: number
): Promise<void> {
  const [record] = await db
    .select({ id: hrEmployees.id })
    .from(hrEmployees)
    .where(and(
      eq(hrEmployees.id, employeeId),
      eq(hrEmployees.organizationId, organizationId),
      isNull(hrEmployees.deletedAt),
    ))
    .limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Employee ${employeeId} not found or out of scope` });
  }
}

// ============================================================
// HR LEAVE REQUESTS
// ============================================================

/**
 * Validates that a leave request exists and belongs to the organization.
 */
export async function validateLeaveRequest(
  db: DB,
  leaveRequestId: number,
  organizationId: number
): Promise<void> {
  const [record] = await db
    .select({ id: hrLeaveRequests.id })
    .from(hrLeaveRequests)
    .where(and(
      eq(hrLeaveRequests.id, leaveRequestId),
      eq(hrLeaveRequests.organizationId, organizationId),
      isNull(hrLeaveRequests.deletedAt),
    ))
    .limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Leave Request ${leaveRequestId} not found or out of scope` });
  }
}

// ============================================================
// FINANCE EXPENDITURES
// ============================================================

/**
 * Validates that an expenditure exists, belongs to the org/OU, and is not deleted.
 */
export async function validateExpenditure(
  db: DB,
  expenditureId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(financeExpenditures.id, expenditureId),
    eq(financeExpenditures.organizationId, ctx.organizationId),
    isNull(financeExpenditures.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(financeExpenditures.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: financeExpenditures.id }).from(financeExpenditures).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Expenditure ${expenditureId} not found or out of scope` });
  }
}

// ============================================================
// PROJECT REPORTING SCHEDULES
// ============================================================

/**
 * Validates that a reporting schedule exists, belongs to the org/OU, and is not deleted.
 */
export async function validateReportingSchedule(
  db: DB,
  scheduleId: number,
  ctx: ValidationContext
): Promise<void> {
  const conditions = [
    eq(projectReportingSchedules.id, scheduleId),
    eq(projectReportingSchedules.organizationId, ctx.organizationId),
    isNull(projectReportingSchedules.deletedAt),
  ];
  if (ctx.operatingUnitId != null) {
    conditions.push(eq(projectReportingSchedules.operatingUnitId, ctx.operatingUnitId));
  }
  const [record] = await db.select({ id: projectReportingSchedules.id }).from(projectReportingSchedules).where(and(...conditions)).limit(1);
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Reporting Schedule ${scheduleId} not found or out of scope` });
  }
}
