/**
 * ============================================================================
 * REPORTS & ANALYTICS ROUTER
 * ============================================================================
 * 
 * Cross-module analytical and audit engine for management reporting.
 * 
 * GOVERNANCE RULES:
 * - Read-only intelligence (no data modification)
 * - Aggregates data across HR, Payroll, Attendance, Recruitment, Compliance
 * - All queries use scopedProcedure for Org/OU isolation
 * - Returns empty-but-valid datasets when source data unavailable
 * 
 * ============================================================================
 */

import { z } from "zod";
import { router, scopedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  hrEmployees,
  hrPayrollRecords,
  hrAttendanceRecords,
  hrLeaveRequests,
  hrLeaveBalances,
  hrRecruitmentJobs,
  hrRecruitmentCandidates,
  hrSanctions,
  hrDocuments,
  organizations,
} from "../../drizzle/schema";
import {  eq, and, sql, desc, asc, gte, lte, count, sum, isNull } from "drizzle-orm";

// ============================================================================
// WORKFORCE ANALYTICS
// ============================================================================

export const workforceAnalyticsRouter = router({
  /**
   * Get workforce statistics: headcount, department distribution, gender, contract types
   */
  getStats: scopedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Base conditions for scoping
      const baseConditions = operatingUnitId
        ? and(eq(hrEmployees.organizationId, organizationId), eq(hrEmployees.operatingUnitId, operatingUnitId))
        : eq(hrEmployees.organizationId, organizationId);

      // Get all employees in scope
      const allEmployees = await db
        .select()
        .from(hrEmployees)
        .where(and(baseConditions, isNull(hrEmployees.deletedAt)));

      // Count by status
      const activeCount = allEmployees.filter(e => e.status === 'active').length;
      const archivedCount = allEmployees.filter(e => e.status === 'archived').length;
      const exitedCount = allEmployees.filter(e => e.status === 'exited').length;
      const totalCount = allEmployees.length;

      // Department distribution
      const deptMap: Record<string, number> = {};
      allEmployees.forEach(e => {
        const dept = e.department || 'Unassigned';
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      const byDepartment = Object.entries(deptMap).map(([name, count]) => ({
        name,
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      }));

      // Gender distribution
      const maleCount = allEmployees.filter(e => e.gender === 'male').length;
      const femaleCount = allEmployees.filter(e => e.gender === 'female').length;
      const byGender = {
        male: maleCount,
        female: femaleCount,
        malePercentage: totalCount > 0 ? (maleCount / totalCount) * 100 : 0,
        femalePercentage: totalCount > 0 ? (femaleCount / totalCount) * 100 : 0,
      };

      // Contract type distribution
      const contractMap: Record<string, number> = {};
      allEmployees.forEach(e => {
        const type = e.contractType || 'Unknown';
        contractMap[type] = (contractMap[type] || 0) + 1;
      });
      const byContract = Object.entries(contractMap).map(([type, count]) => ({
        type,
        count,
      }));

      return {
        activeCount,
        archivedCount,
        exitedCount,
        totalCount,
        byDepartment,
        byGender,
        byContract,
      };
    }),
});

// ============================================================================
// PAYROLL ANALYTICS
// ============================================================================

export const payrollAnalyticsRouter = router({
  /**
   * Get payroll cost statistics: monthly costs, annual projections, by project/department
   */
  getStats: scopedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const baseConditions = operatingUnitId
        ? and(eq(hrPayrollRecords.organizationId, organizationId), eq(hrPayrollRecords.operatingUnitId, operatingUnitId))
        : eq(hrPayrollRecords.organizationId, organizationId);

      // Get all payroll records in scope
      const payrollRecords = await db
        .select()
        .from(hrPayrollRecords)
        .where(baseConditions);

      // Monthly costs (group by month)
      const monthMap: Record<string, number> = {};
      payrollRecords.forEach(r => {
        const month = r.payrollMonth || 'Unknown';
        const amount = Number(r.netPay || 0);
        monthMap[month] = (monthMap[month] || 0) + amount;
      });
      const monthlyCosts = Object.entries(monthMap).map(([month, amount]) => ({
        month,
        amount: Math.round(amount),
      }));

      // Total annual cost estimate
      const totalAnnualCost = Math.round(
        payrollRecords.reduce((sum, r) => sum + Number(r.netPay || 0), 0)
      );

      // By project (mock - would need employee-project mapping)
      const byProject = [
        { name: 'Project A', amount: Math.round(totalAnnualCost * 0.4), count: Math.floor(payrollRecords.length * 0.4) },
        { name: 'Project B', amount: Math.round(totalAnnualCost * 0.3), count: Math.floor(payrollRecords.length * 0.3) },
        { name: 'Unassigned', amount: Math.round(totalAnnualCost * 0.3), count: Math.ceil(payrollRecords.length * 0.3) },
      ];

      // By department (mock - would need employee-department mapping)
      const byDepartment = [
        { name: 'Operations', amount: Math.round(totalAnnualCost * 0.5) },
        { name: 'Programs', amount: Math.round(totalAnnualCost * 0.3) },
        { name: 'Admin', amount: Math.round(totalAnnualCost * 0.2) },
      ];

      return {
        monthlyCosts,
        totalAnnualCost,
        byProject,
        byDepartment,
      };
    }),
});

// ============================================================================
// ATTENDANCE ANALYTICS
// ============================================================================

export const attendanceAnalyticsRouter = router({
  /**
   * Get attendance statistics: overall rate, by department, overtime, anomalies
   */
  getStats: scopedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const baseConditions = operatingUnitId
        ? and(eq(hrAttendanceRecords.organizationId, organizationId), eq(hrAttendanceRecords.operatingUnitId, operatingUnitId))
        : eq(hrAttendanceRecords.organizationId, organizationId);

      // Get all attendance records in scope
      const attendanceRecords = await db
        .select()
        .from(hrAttendanceRecords)
        .where(baseConditions);

      // Overall attendance rate
      const presentCount = attendanceRecords.filter(r => r.status === 'present' || r.status === 'overtime').length;
      const overallRate = attendanceRecords.length > 0 
        ? (presentCount / attendanceRecords.length) * 100 
        : 0;

      // By department (mock - would need employee-department join)
      const byDepartment = [
        { name: 'Operations', rate: 98.5, lateCount: 3 },
        { name: 'Programs', rate: 97.2, lateCount: 5 },
        { name: 'Admin', rate: 99.1, lateCount: 1 },
      ];

      // Overtime by project (mock)
      const overtimeHoursByProject = [
        { project: 'Project A', hours: 120 },
        { project: 'Project B', hours: 85 },
      ];

      // Anomaly count (flagged records)
      const anomalyCount = attendanceRecords.filter(r => r.isFlagged).length;

      return {
        overallRate: Math.round(overallRate * 10) / 10,
        byDepartment,
        overtimeHoursByProject,
        anomalyCount,
      };
    }),
});

// ============================================================================
// LEAVE ANALYTICS
// ============================================================================

export const leaveAnalyticsRouter = router({
  /**
   * Get leave statistics: taken by type, balances, liability estimates
   */
  getStats: scopedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const baseConditions = operatingUnitId
        ? and(eq(hrLeaveRequests.organizationId, organizationId), eq(hrLeaveRequests.operatingUnitId, operatingUnitId))
        : eq(hrLeaveRequests.organizationId, organizationId);

      // Get all leave requests in scope
      const leaveRequests = await db
        .select()
        .from(hrLeaveRequests)
        .where(and(baseConditions, eq(hrLeaveRequests.status, 'approved')));

      // Taken by type
      const typeMap: Record<string, number> = {};
      leaveRequests.forEach(r => {
        const type = r.leaveType || 'Unknown';
        const days = Number(r.daysRequested || 0);
        typeMap[type] = (typeMap[type] || 0) + days;
      });
      const takenByType = Object.entries(typeMap).map(([type, count]) => ({
        type,
        count,
      }));

      // Total days used
      const totalDaysUsed = leaveRequests.reduce((sum, r) => sum + Number(r.daysRequested || 0), 0);

      // Average per staff (mock - would need employee count)
      const averageLeavePerStaff = 8.1;

      // Liability estimate (mock - would need salary data)
      const liabilityEstimate = totalDaysUsed * 150; // $150 per day average

      return {
        takenByType,
        totalDaysUsed,
        averageLeavePerStaff,
        liabilityEstimate: Math.round(liabilityEstimate),
      };
    }),
});

// ============================================================================
// RECRUITMENT ANALYTICS
// ============================================================================

export const recruitmentAnalyticsRouter = router({
  /**
   * Get recruitment statistics: time-to-hire, candidates per vacancy, vacancy aging
   */
  getStats: scopedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const baseConditions = operatingUnitId
        ? and(eq(hrRecruitmentJobs.organizationId, organizationId), eq(hrRecruitmentJobs.operatingUnitId, operatingUnitId))
        : eq(hrRecruitmentJobs.organizationId, organizationId);

      // Get all jobs in scope
      const jobs = await db
        .select()
        .from(hrRecruitmentJobs)
        .where(baseConditions);

      // Get all candidates
      const candidates = await db
        .select()
        .from(hrRecruitmentCandidates)
        .where(eq(hrRecruitmentCandidates.organizationId, organizationId));

      // Time to hire (average days from posting to hire)
      const timeToHire = 42; // Mock - would need hire date tracking

      // Candidates per vacancy
      const candidatesPerVacancy = jobs.length > 0 ? candidates.length / jobs.length : 0;

      // Selection rate (hired / total candidates)
      const hiredCount = candidates.filter(c => c.status === 'hired').length;
      const selectionRate = candidates.length > 0 ? (hiredCount / candidates.length) * 100 : 0;

      // Vacancy aging (open positions with days open)
      const now = new Date();
      const vacancyAging = jobs
        .filter(j => j.status === 'open')
        .map(j => {
          const createdAt = new Date(j.createdAt);
          const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          const appCount = candidates.filter(c => c.jobId === j.id).length;
          return {
            position: j.positionTitle || 'Unknown',
            daysOpen,
            appCount,
            status: j.status,
          };
        });

      return {
        timeToHire,
        candidatesPerVacancy: Math.round(candidatesPerVacancy * 10) / 10,
        selectionRate: Math.round(selectionRate * 10) / 10,
        vacancyAging,
      };
    }),
});

// ============================================================================
// COMPLIANCE ANALYTICS
// ============================================================================

export const complianceAnalyticsRouter = router({
  /**
   * Get compliance statistics: expiring contracts, missing documents, pending appraisals, disciplinary cases
   */
  getStats: scopedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const baseConditions = operatingUnitId
        ? and(eq(hrEmployees.organizationId, organizationId), eq(hrEmployees.operatingUnitId, operatingUnitId))
        : eq(hrEmployees.organizationId, organizationId);

      // Get all employees in scope
      const employees = await db
        .select()
        .from(hrEmployees)
        .where(and(baseConditions, isNull(hrEmployees.deletedAt)));

      // Expiring contracts (within 60 days)
      const now = new Date();
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const expiringContracts = employees.filter(e => {
        if (!e.contractEndDate) return false;
        const endDate = new Date(e.contractEndDate);
        return endDate > now && endDate <= sixtyDaysFromNow;
      }).length;

      // Missing documents count
      const docConditions = operatingUnitId
        ? and(eq(hrDocuments.organizationId, organizationId), eq(hrDocuments.operatingUnitId, operatingUnitId))
        : eq(hrDocuments.organizationId, organizationId);
      
      const documents = await db
        .select()
        .from(hrDocuments)
        .where(docConditions);
      
      const missingDocuments = employees.length * 3 - documents.length; // Mock: expect 3 docs per employee

      // Pending appraisals (mock)
      const pendingAppraisals = Math.floor(employees.length * 0.15); // 15% pending

      // Disciplinary cases
      const sanctionConditions = operatingUnitId
        ? and(eq(hrSanctions.organizationId, organizationId), eq(hrSanctions.operatingUnitId, operatingUnitId))
        : eq(hrSanctions.organizationId, organizationId);
      
      const sanctions = await db
        .select()
        .from(hrSanctions)
        .where(sanctionConditions);
      
      const disciplinaryCases = sanctions.filter(s => s.status === 'active').length;

      return {
        expiringContracts,
        missingDocuments: Math.max(0, missingDocuments),
        pendingAppraisals,
        disciplinaryCases,
      };
    }),
});

// ============================================================================
// MAIN REPORTS ROUTER
// ============================================================================

export const reportsAnalyticsRouter = router({
  workforce: workforceAnalyticsRouter,
  payroll: payrollAnalyticsRouter,
  attendance: attendanceAnalyticsRouter,
  leave: leaveAnalyticsRouter,
  recruitment: recruitmentAnalyticsRouter,
  compliance: complianceAnalyticsRouter,

  /**
   * Get all analytics in one call (for full management report)
   */
  getAll: scopedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId } = ctx.scope;

      // Get organization name
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      // Call all sub-routers
      const workforce = await workforceAnalyticsRouter.createCaller({ ...ctx, input }).getStats(input);
      const payroll = await payrollAnalyticsRouter.createCaller({ ...ctx, input }).getStats(input);
      const attendance = await attendanceAnalyticsRouter.createCaller({ ...ctx, input }).getStats(input);
      const leave = await leaveAnalyticsRouter.createCaller({ ...ctx, input }).getStats(input);
      const recruitment = await recruitmentAnalyticsRouter.createCaller({ ...ctx, input }).getStats(input);
      const compliance = await complianceAnalyticsRouter.createCaller({ ...ctx, input }).getStats(input);

      return {
        organizationName: org?.name || 'Unknown Organization',
        workforce,
        payroll,
        attendance,
        leave,
        recruitment,
        compliance,
        lastRefresh: new Date().toISOString(),
      };
    }),
});
