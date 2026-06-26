import { z } from "zod";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { hrEmployeeAnnualLeave, hrEmployees, hrLeaveRequests, organizations, operatingUnits } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Calculate pro-rata annual leave entitlement based on contract duration
 * @param monthlyRate - Monthly accrual rate (e.g., 2.5 days/month)
 * @param contractStartDate - Contract start date
 * @param contractEndDate - Contract end date
 * @returns Pro-rata entitlement for the contract period
 */
const calculateProRataEntitlement = (
  monthlyRate: number,
  contractStartDate: Date | string | null | undefined,
  contractEndDate: Date | string | null | undefined
): number => {
  // If no contract dates provided, assume full year (12 months)
  if (!contractStartDate || !contractEndDate) {
    return monthlyRate * 12;
  }

  const startDate = new Date(contractStartDate);
  const endDate = new Date(contractEndDate);

  // Calculate months between contract start and end
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                     (endDate.getMonth() - startDate.getMonth());

  // Add 1 to include both start and end months
  const totalMonths = Math.max(1, monthsDiff + 1);

  // Return pro-rata entitlement
  return Number((monthlyRate * totalMonths).toFixed(2));
};

export const hrAnnualLeaveRouter = router({
  /**
   * Get all employees with their annual leave records for a specific year
   * Auto-creates records for active employees if they don't exist
   */
  getEmployeesAnnualLeave: scopedProcedure
    .input(z.object({
      year: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Get all active employees in the current operating unit
      const activeEmployees = await db
        .select()
        .from(hrEmployees)
        .where(and(
          eq(hrEmployees.organizationId, ctx.scope.organizationId),
          eq(hrEmployees.operatingUnitId, ctx.scope.operatingUnitId),
          eq(hrEmployees.status, 'active'),
          eq(hrEmployees.isDeleted, 0)
        ));

      // For each employee, ensure they have an annual leave record
      for (const emp of activeEmployees) {
        const existing = await db
          .select()
          .from(hrEmployeeAnnualLeave)
          .where(and(
            eq(hrEmployeeAnnualLeave.employeeId, emp.id),
            eq(hrEmployeeAnnualLeave.year, input.year),
            eq(hrEmployeeAnnualLeave.organizationId, ctx.scope.organizationId),
            eq(hrEmployeeAnnualLeave.operatingUnitId, ctx.scope.operatingUnitId),
            eq(hrEmployeeAnnualLeave.isDeleted, 0)
          ))
          .limit(1);

        if (existing.length === 0) {
          // Calculate pro-rata entitlement based on contract duration
          const defaultMonthlyRate = 2.5;
          const proRataEntitlement = calculateProRataEntitlement(
            defaultMonthlyRate,
            emp.contractStartDate,
            emp.contractEndDate
          );

          // Create default record with pro-rata calculation
          await db.insert(hrEmployeeAnnualLeave).values({
            employeeId: emp.id,
            organizationId: ctx.scope.organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            year: input.year,
            annualEntitlement: proRataEntitlement.toString(),
            monthlyAccrualRate: defaultMonthlyRate.toString(),
            carryForwardDays: '0.00',
            isDeleted: 0,
          });
        }
      }

      // Get all annual leave records with employee data
      const records = await db
        .select({
          id: hrEmployeeAnnualLeave.id,
          organizationId: hrEmployeeAnnualLeave.organizationId,
          operatingUnitId: hrEmployeeAnnualLeave.operatingUnitId,
          employeeId: hrEmployeeAnnualLeave.employeeId,
          year: hrEmployeeAnnualLeave.year,
          annualEntitlement: hrEmployeeAnnualLeave.annualEntitlement,
          monthlyAccrualRate: hrEmployeeAnnualLeave.monthlyAccrualRate,
          carryForwardDays: hrEmployeeAnnualLeave.carryForwardDays,
          notes: hrEmployeeAnnualLeave.notes,
          createdAt: hrEmployeeAnnualLeave.createdAt,
          updatedAt: hrEmployeeAnnualLeave.updatedAt,
          isDeleted: hrEmployeeAnnualLeave.isDeleted,
          // Employee data
          employeeCode: hrEmployees.employeeCode,
          firstName: hrEmployees.firstName,
          lastName: hrEmployees.lastName,
          email: hrEmployees.email,
          phone: hrEmployees.phone,
          jobTitle: hrEmployees.jobTitle,
          department: hrEmployees.department,
          gender: hrEmployees.gender,
          dateOfBirth: hrEmployees.dateOfBirth,
          nationality: hrEmployees.nationality,
          contractStartDate: hrEmployees.contractStartDate,
          contractEndDate: hrEmployees.contractEndDate,
          employmentType: hrEmployees.employmentType,
          reportingTo: hrEmployees.reportingTo,
          status: hrEmployees.status,
        })
        .from(hrEmployeeAnnualLeave)
        .innerJoin(hrEmployees, eq(hrEmployeeAnnualLeave.employeeId, hrEmployees.id))
        .where(and(
          eq(hrEmployeeAnnualLeave.organizationId, ctx.scope.organizationId),
          eq(hrEmployeeAnnualLeave.operatingUnitId, ctx.scope.operatingUnitId),
          eq(hrEmployeeAnnualLeave.year, input.year),
          eq(hrEmployeeAnnualLeave.isDeleted, 0),
          eq(hrEmployees.isDeleted, 0)
        ));

      const recordsWithBalances = await Promise.all(
        records.map(async (record) => {
          const leaveRequests = await db
            .select({
              status: hrLeaveRequests.status,
              totalDays: hrLeaveRequests.totalDays,
            })
            .from(hrLeaveRequests)
            .where(
              and(
                eq(hrLeaveRequests.employeeId, record.employeeId),
                eq(hrLeaveRequests.organizationId, ctx.scope.organizationId),
                eq(hrLeaveRequests.leaveType, "annual"),
                eq(hrLeaveRequests.isDeleted, 0),
                sql`YEAR(${hrLeaveRequests.startDate}) = ${input.year}`
              )
            );

          let used = 0;
          let pending = 0;

          for (const req of leaveRequests) {
            const days = Number(req.totalDays ?? 0);

            if (req.status === "approved") {
              used += days;
            }

            if (req.status === "pending") {
              pending += days;
            }
          }

          const entitlement = Number(record.annualEntitlement ?? 0);

          const remaining = entitlement - used;
          const available = remaining - pending;

          return {
            ...record,
            used,
            pending,
            remaining,
            available,
          };
        })
      );

      return recordsWithBalances;
    }),

  /**
   * Get specific employee's annual leave record
   */
  getEmployeeAnnualLeave: scopedProcedure
    .input(z.object({ 
      employeeId: z.number(),
      year: z.number() 
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      const record = await db
        .select()
        .from(hrEmployeeAnnualLeave)
        .where(and(
          eq(hrEmployeeAnnualLeave.employeeId, input.employeeId),
          eq(hrEmployeeAnnualLeave.year, input.year),
          eq(hrEmployeeAnnualLeave.organizationId, ctx.scope.organizationId),
          eq(hrEmployeeAnnualLeave.isDeleted, 0)
        ))
        .limit(1);

      return record[0] || null;
    }),

  /**
   * Create or update annual leave record
   * Automatically calculates pro-rata entitlement based on contract duration and monthly rate
   */
  updateAnnualLeaveRecord: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
      year: z.number(),
      annualEntitlement: z.number().optional(),
      monthlyAccrualRate: z.number().optional(),
      carryForwardDays: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get employee to access contract dates
      const employee = await db
        .select()
        .from(hrEmployees)
        .where(eq(hrEmployees.id, input.employeeId))
        .limit(1);

      if (!employee || employee.length === 0) {
        throw new Error(`Employee with ID ${input.employeeId} not found`);
      }

      const emp = employee[0];

      // Check if record exists
      const existing = await db
        .select()
        .from(hrEmployeeAnnualLeave)
        .where(and(
          eq(hrEmployeeAnnualLeave.employeeId, input.employeeId),
          eq(hrEmployeeAnnualLeave.year, input.year),
          eq(hrEmployeeAnnualLeave.organizationId, ctx.scope.organizationId),
          eq(hrEmployeeAnnualLeave.isDeleted, 0)
        ))
        .limit(1);

      // Calculate pro-rata entitlement if monthly rate is provided
      let finalAnnualEntitlement = input.annualEntitlement;
      if (input.monthlyAccrualRate !== undefined) {
        finalAnnualEntitlement = calculateProRataEntitlement(
          input.monthlyAccrualRate,
          emp.contractStartDate,
          emp.contractEndDate
        );
      }

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(hrEmployeeAnnualLeave)
          .set({
            annualEntitlement: finalAnnualEntitlement !== undefined ? String(finalAnnualEntitlement) : existing[0].annualEntitlement,
            monthlyAccrualRate: input.monthlyAccrualRate ? String(input.monthlyAccrualRate) : existing[0].monthlyAccrualRate,
            carryForwardDays: input.carryForwardDays ? String(input.carryForwardDays) : existing[0].carryForwardDays,
            notes: input.notes ?? existing[0].notes,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(hrEmployeeAnnualLeave.id, existing[0].id));

        return existing[0];
      } else {
        // Create new record with pro-rata calculation
        const defaultMonthlyRate = input.monthlyAccrualRate ?? 2.5;
        const proRataEntitlement = finalAnnualEntitlement ?? calculateProRataEntitlement(
          defaultMonthlyRate,
          emp.contractStartDate,
          emp.contractEndDate
        );

        await db.insert(hrEmployeeAnnualLeave).values({
          employeeId: input.employeeId,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          year: input.year,
          annualEntitlement: String(proRataEntitlement),
          monthlyAccrualRate: String(defaultMonthlyRate),
          carryForwardDays: String(input.carryForwardDays ?? 0),
          notes: input.notes || undefined,
          isDeleted: 0,
        });

        const newRecord = await db
          .select()
          .from(hrEmployeeAnnualLeave)
          .where(and(
            eq(hrEmployeeAnnualLeave.employeeId, input.employeeId),
            eq(hrEmployeeAnnualLeave.year, input.year),
            eq(hrEmployeeAnnualLeave.organizationId, ctx.scope.organizationId),
            eq(hrEmployeeAnnualLeave.operatingUnitId, ctx.scope.operatingUnitId)
          ))
          .limit(1);

        return newRecord[0];
      }
    }),

  /**
   * Calculate employee's leave balance for a specific year
   * Returns: accrued, used, pending, remaining, available
   */
  calculateEmployeeBalance: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
      year: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Get annual leave record
      const annualLeaveRecord = await db
        .select()
        .from(hrEmployeeAnnualLeave)
        .where(and(
          eq(hrEmployeeAnnualLeave.employeeId, input.employeeId),
          eq(hrEmployeeAnnualLeave.year, input.year),
          eq(hrEmployeeAnnualLeave.organizationId, ctx.scope.organizationId),
          eq(hrEmployeeAnnualLeave.isDeleted, 0)
        ))
        .limit(1);

      if (annualLeaveRecord.length === 0) {
        return {
          entitlement: 30,
          accrued: 0,
          used: 0,
          pending: 0,
          remaining: 0,
          available: 0,
        };
      }

      const record = annualLeaveRecord[0];

      // Get employee contract dates
      const employee = await db
        .select()
        .from(hrEmployees)
        .where(eq(hrEmployees.id, input.employeeId))
        .limit(1);

      if (employee.length === 0) {
        return {
          entitlement: Number(record.annualEntitlement),
          accrued: 0,
          used: 0,
          pending: 0,
          remaining: 0,
          available: 0,
        };
      }

      const emp = employee[0];
      const startDate = emp.contractStartDate ? new Date(emp.contractStartDate) : new Date();
      const endDate = emp.contractEndDate ? new Date(emp.contractEndDate) : new Date();
      const yearStart = new Date(input.year, 0, 1);
      const yearEnd = new Date(input.year, 11, 31);

      // Calculate months served in this year
      const effectiveStart = startDate > yearStart ? startDate : yearStart;
      const effectiveEnd = endDate < yearEnd ? endDate : yearEnd;
      const monthsServed = Math.max(0, 
        (effectiveEnd.getFullYear() - effectiveStart.getFullYear()) * 12 + 
        (effectiveEnd.getMonth() - effectiveStart.getMonth()) + 1
      );

      // Calculate accrued leave
        const entitlement = Number(
          record.annualEntitlement ?? 0
        );

        const carryForward = Number(
          record.carryForwardDays ?? 0
        );

        // Full annual entitlement available for the year
        const accrued = entitlement + carryForward;

        // Get leave requests - only count approved and pending (not draft/cancelled/rejected)
        const leaveRequests = await db
          .select({
            status: hrLeaveRequests.status,
            totalDays: hrLeaveRequests.totalDays,
          })
          .from(hrLeaveRequests)
          .where(
            and(
              eq(hrLeaveRequests.employeeId, input.employeeId),
              eq(hrLeaveRequests.organizationId, ctx.scope.organizationId),
              eq(hrLeaveRequests.leaveType, "annual"),
              eq(hrLeaveRequests.isDeleted, 0),
              sql`YEAR(${hrLeaveRequests.startDate}) = ${input.year}`
            )
          );

        let used = 0;
        let pending = 0;

        for (const req of leaveRequests) {
          const days = Number(req.totalDays ?? 0);

          // Only count approved requests as used
          if (req.status === "approved") {
            used += days;
          }

          // Only count pending requests as pending (not draft, rejected, or cancelled)
          if (req.status === "pending") {
            pending += days;
          }
        }

        const remaining = accrued - used;

        const available = remaining - pending;

        return {
          entitlement,
          accrued,
          used,
          pending,
          remaining,
          available,
        };
    }),

/**
 * Get leave balance summary for all employees
 */
getLeaveBalanceSummary: scopedProcedure
  .input(
    z.object({
      year: z.number(),
    })
  )
  .query(async ({ ctx, input }) => {
    const db = await getDb();

    // Get all active employees with annual leave records
    const employees = await db
      .select({
        employeeId: hrEmployeeAnnualLeave.employeeId,
      })
      .from(hrEmployeeAnnualLeave)
      .innerJoin(
        hrEmployees,
        eq(hrEmployeeAnnualLeave.employeeId, hrEmployees.id)
      )
      .where(
        and(
          eq(
            hrEmployeeAnnualLeave.organizationId,
            ctx.scope.organizationId
          ),
          eq(
            hrEmployeeAnnualLeave.operatingUnitId,
            ctx.scope.operatingUnitId
          ),
          eq(hrEmployeeAnnualLeave.year, input.year),
          eq(hrEmployeeAnnualLeave.isDeleted, 0),
          eq(hrEmployees.isDeleted, 0),
          eq(hrEmployees.status, "active")
        )
      );

    let totalStaff = 0;
    let totalAvailable = 0;
    let totalUsed = 0;
    let totalPending = 0;

    for (const emp of employees) {
      // Get annual leave record
      const annualLeaveRecord = await db
        .select()
        .from(hrEmployeeAnnualLeave)
        .where(
          and(
            eq(hrEmployeeAnnualLeave.employeeId, emp.employeeId),
            eq(hrEmployeeAnnualLeave.year, input.year),
            eq(
              hrEmployeeAnnualLeave.organizationId,
              ctx.scope.organizationId
            ),
            eq(
              hrEmployeeAnnualLeave.operatingUnitId,
              ctx.scope.operatingUnitId
            ),
            eq(hrEmployeeAnnualLeave.isDeleted, 0)
          )
        )
        .limit(1);

      if (annualLeaveRecord.length === 0) {
        continue;
      }

      const record = annualLeaveRecord[0];

      // Get employee contract dates
      const employee = await db
        .select()
        .from(hrEmployees)
        .where(eq(hrEmployees.id, emp.employeeId))
        .limit(1);

      if (employee.length === 0) {
        continue;
      }

      const employeeData = employee[0];

      const startDate = employeeData.contractStartDate
        ? new Date(employeeData.contractStartDate)
        : new Date(input.year, 0, 1);

      const endDate = employeeData.contractEndDate
        ? new Date(employeeData.contractEndDate)
        : new Date(input.year, 11, 31);

      const yearStart = new Date(input.year, 0, 1);
      const yearEnd = new Date(input.year, 11, 31);

      const effectiveStart =
        startDate > yearStart ? startDate : yearStart;

      const effectiveEnd =
        endDate < yearEnd ? endDate : yearEnd;

      const monthsServed = Math.max(
        0,
        (effectiveEnd.getFullYear() -
          effectiveStart.getFullYear()) *
          12 +
          (effectiveEnd.getMonth() -
            effectiveStart.getMonth()) +
          1
      );

      const entitlement = Number(
        record.annualEntitlement ?? 0
      );

      const monthlyRate = Number(
        record.monthlyAccrualRate ?? 0
      );

      const accrued = Math.min(
        monthsServed * monthlyRate,
        entitlement
      );

      // Get annual leave requests - only count approved and pending (not draft/cancelled/rejected)
      const leaveRequests = await db
        .select({
          status: hrLeaveRequests.status,
          totalDays: hrLeaveRequests.totalDays,
        })
        .from(hrLeaveRequests)
        .where(
          and(
            eq(hrLeaveRequests.employeeId, emp.employeeId),
            eq(hrLeaveRequests.organizationId, ctx.scope.organizationId),
            eq(hrLeaveRequests.operatingUnitId, ctx.scope.operatingUnitId),
            eq(hrLeaveRequests.leaveType, "annual"),
            eq(hrLeaveRequests.isDeleted, 0),
            sql`YEAR(${hrLeaveRequests.startDate}) = ${input.year}`
          )
        );

      let used = 0;
      let pending = 0;

      for (const request of leaveRequests) {
        const days = Number(request.totalDays ?? 0);

        if (request.status === "approved") {
          used += days;
        }

        if (request.status === "pending") {
          pending += days;
        }
      }

      const remaining = accrued - used;
      const available = remaining - pending;

      totalStaff++;

      totalAvailable += available;
      totalUsed += used;
      totalPending += pending;
    }

    return {
      totalStaff,
      avgAvailable:
        totalStaff > 0
          ? Number(
              (totalAvailable / totalStaff).toFixed(2)
            )
          : 0,
      totalUsed: Number(totalUsed.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
    };
  }),
});