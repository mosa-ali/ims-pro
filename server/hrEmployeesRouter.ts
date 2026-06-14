/**
 * ============================================================================
 * HR EMPLOYEES ROUTER - PHASE 1 PRODUCTION-READY IMPLEMENTATION
 * ============================================================================
 *
 * ARCHITECTURE:
 * - All procedures use scopedProcedure for automatic data isolation
 * - organizationId and operatingUnitId injected from ctx.scope (NOT input) 
 * - All queries filter isDeleted = 0 (soft delete pattern)
 * - All mutations logged to auditLogs table
 * - Proper error handling and validation via Zod
 *
 * DATA ISOLATION:
 * const { organizationId, operatingUnitId } = ctx.scope;
 * All queries filter by:
 *   - eq(hrEmployees.organizationId, organizationId)
 *   - eq(hrEmployees.operatingUnitId, operatingUnitId)
 *   - isNull(hrEmployees.deletedAt)
 * ============================================================================
 */

import { z } from 'zod';
import { scopedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { hrEmployees, auditLogs } from '../drizzle/schema';
import { eq, and, desc, like, or, isNull, count, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import type { DB, ScopeContext } from './db/_scope';
import {
  scopedAndActive,
  buildUpdatePayload,
  buildSoftDeletePayload,
  buildRestorePayload,
} from './db/_scope';
import { toSqlDate, toSqlTimestamp, nowSql } from './db/_time';
import { EMPLOYEE_STATUS, type EmployeeStatus } from './db/_status';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const EmployeeCreateSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  firstNameAr: z.string().optional(),
  lastNameAr: z.string().optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  nationality: z.string().optional(),
  nationalId: z.string().optional(),
  passportNumber: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'consultant', 'intern']).optional(),
  staffCategory: z.enum(['national', 'international', 'expatriate']).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  jobTitle: z.string().optional(),
  gradeLevel: z.string().optional(),
  reportingTo: z.number().optional(),
  hireDate: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  probationEndDate: z.string().optional(),
  status: z.enum(['active', 'on_leave', 'suspended', 'terminated', 'resigned']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIban: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
});

const EmployeeUpdateSchema = EmployeeCreateSchema.partial().extend({
  id: z.number().min(1, 'Employee ID is required'),
  terminationDate: z.string().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log audit trail for all mutations
 */
const logAudit = async (
  db: DB,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE',
  entityType: 'EMPLOYEE',
  entityId: number,
  organizationId: number,
  operatingUnitId: number | null | undefined,
  userId?: number,
  changes?: Record<string, unknown>
) => {
  try {
    await db.insert(auditLogs).values({
      action,
      entityType,
      entityId,
      organizationId,
      operatingUnitId: operatingUnitId ?? null,
      userId: userId ?? null,
      details: changes ? JSON.stringify(changes) : null,
      // createdAt is auto-set by database defaultNow()
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit logging should not block operations
  }
};

/**
 * Verify employee belongs to current organization/OU scope
 */
const verifyEmployeeScope = async (
  db: DB,
  employeeId: number,
  ctx: ScopeContext
): Promise<(typeof hrEmployees.$inferSelect)> => {
  const [employee] = await db
    .select()
    .from(hrEmployees)
    .where(
      and(
        eq(hrEmployees.id, employeeId),
        ...scopedAndActive(hrEmployees, ctx)
      )
    )
    .limit(1);

  if (!employee) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Employee not found in your organization',
    });
  }

  return employee;
};

// ============================================================================
// ROUTER PROCEDURES
// ============================================================================
export const hrEmployeesRouter = router({
  /**
   * Get all employees for current organization/OU
   * Supports filtering, searching, and pagination
   */
  getAll: scopedProcedure
    .input(
      z.object({
        status: z.enum(['active', 'on_leave', 'suspended', 'terminated', 'resigned']).optional(),
        department: z.string().optional(),
        employmentType: z.enum(['full_time', 'part_time', 'contract', 'consultant', 'intern']).optional(),
        staffCategory: z.enum(['national', 'international', 'expatriate']).optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Build conditions array with scope isolation
      const conditions = scopedAndActive(hrEmployees, ctx.scope);

      // Add optional filters
      if (input.status) {
        conditions.push(eq(hrEmployees.status, input.status));
      }
      if (input.department) {
        conditions.push(eq(hrEmployees.department, input.department));
      }
      if (input.employmentType) {
        conditions.push(eq(hrEmployees.employmentType, input.employmentType));
      }
      if (input.staffCategory) {
        conditions.push(eq(hrEmployees.staffCategory, input.staffCategory));
      }

      // Build search condition if provided
      if (input.search) {
        const searchPattern = `%${input.search}%`;
        conditions.push(
          or(
            like(hrEmployees.firstName, searchPattern),
            like(hrEmployees.lastName, searchPattern),
            like(hrEmployees.employeeCode, searchPattern),
            like(hrEmployees.email, searchPattern)
          )!
        );
      }

      // Execute query with pagination
      const employees = await db
        .select()
        .from(hrEmployees)
        .where(and(...conditions))
        .orderBy(desc(hrEmployees.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Add computed fullName field
      return employees.map((emp) => ({
        ...emp,
        fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email || 'Unknown',
      }));
    }),

  /**
   * Get single employee by ID
   * Validates employee belongs to current organization/OU
   */
  getById: scopedProcedure
    .input(z.object({
        id: z.number(),
      }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const employee = await verifyEmployeeScope(db, input.id, ctx.scope);

      return {
        ...employee,
        fullName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email || 'Unknown',
      };
    }),

  /**
   * Create new employee
   */
  create: scopedProcedure
    .input(EmployeeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user?.id;

      // Prepare insert payload
      const insertPayload = {
        organizationId,
        operatingUnitId: operatingUnitId ?? null,
        employeeCode: input.employeeCode,
        firstName: input.firstName,
        lastName: input.lastName,
        firstNameAr: input.firstNameAr ?? null,
        lastNameAr: input.lastNameAr ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        dateOfBirth: input.dateOfBirth ? toSqlDate(new Date(input.dateOfBirth)) : null,
        gender: input.gender ?? null,
        nationality: input.nationality ?? null,
        nationalId: input.nationalId ?? null,
        passportNumber: input.passportNumber ?? null,
        employmentType: input.employmentType ?? 'full_time',
        staffCategory: input.staffCategory ?? 'national',
        department: input.department ?? null,
        position: input.position ?? null,
        jobTitle: input.jobTitle ?? null,
        gradeLevel: input.gradeLevel ?? null,
        reportingTo: input.reportingTo ?? null,
        hireDate: input.hireDate ? toSqlDate(new Date(input.hireDate)) : null,
        contractStartDate: input.contractStartDate ? toSqlDate(new Date(input.contractStartDate)) : null,
        contractEndDate: input.contractEndDate ? toSqlDate(new Date(input.contractEndDate)) : null,
        probationEndDate: input.probationEndDate ? toSqlDate(new Date(input.probationEndDate)) : null,
        status: (input.status ?? EMPLOYEE_STATUS.ACTIVE) as EmployeeStatus,
        address: input.address ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        emergencyContactName: input.emergencyContactName ?? null,
        emergencyContactPhone: input.emergencyContactPhone ?? null,
        emergencyContactRelation: input.emergencyContactRelation ?? null,
        bankName: input.bankName ?? null,
        bankAccountNumber: input.bankAccountNumber ?? null,
        bankIban: input.bankIban ?? null,
        photoUrl: input.photoUrl ?? null,
        notes: input.notes ?? null,
        isDeleted: 0,
        deletedAt: null,
        deletedBy: null,
        createdAt: nowSql(),
        updatedAt: nowSql(),
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
      };

      const result = await db.insert(hrEmployees).values(insertPayload);

      // Get the inserted employee ID from the result
      // MySQL2 with Drizzle returns { insertId, affectedRows }
      const employeeId = (result as any)?.insertId;
      if (!employeeId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve inserted employee ID',
        });
      }

      // Log audit
      await logAudit(
        db,
        'CREATE',
        'EMPLOYEE',
        employeeId,
        organizationId,
        operatingUnitId,
        userId,
        input
      );

      return {
        id: employeeId,
        ...insertPayload,
      };
    }),

  /**
   * Update employee
   */
  update: scopedProcedure
    .input(EmployeeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user?.id;

      // Verify employee exists and belongs to scope
      await verifyEmployeeScope(db, input.id, ctx.scope);

      // Build update payload with only provided fields
      const updatePayload: Record<string, unknown> = {};

      if (input.employeeCode !== undefined) updatePayload.employeeCode = input.employeeCode;
      if (input.firstName !== undefined) updatePayload.firstName = input.firstName;
      if (input.lastName !== undefined) updatePayload.lastName = input.lastName;
      if (input.firstNameAr !== undefined) updatePayload.firstNameAr = input.firstNameAr ?? null;
      if (input.lastNameAr !== undefined) updatePayload.lastNameAr = input.lastNameAr ?? null;
      if (input.email !== undefined) updatePayload.email = input.email ?? null;
      if (input.phone !== undefined) updatePayload.phone = input.phone ?? null;
      if (input.dateOfBirth !== undefined)
        updatePayload.dateOfBirth = input.dateOfBirth ? toSqlDate(new Date(input.dateOfBirth)) : null;
      if (input.gender !== undefined) updatePayload.gender = input.gender ?? null;
      if (input.nationality !== undefined) updatePayload.nationality = input.nationality ?? null;
      if (input.nationalId !== undefined) updatePayload.nationalId = input.nationalId ?? null;
      if (input.passportNumber !== undefined) updatePayload.passportNumber = input.passportNumber ?? null;
      if (input.employmentType !== undefined) updatePayload.employmentType = input.employmentType ?? null;
      if (input.staffCategory !== undefined) updatePayload.staffCategory = input.staffCategory ?? null;
      if (input.department !== undefined) updatePayload.department = input.department ?? null;
      if (input.position !== undefined) updatePayload.position = input.position ?? null;
      if (input.jobTitle !== undefined) updatePayload.jobTitle = input.jobTitle ?? null;
      if (input.gradeLevel !== undefined) updatePayload.gradeLevel = input.gradeLevel ?? null;
      if (input.reportingTo !== undefined) updatePayload.reportingTo = input.reportingTo ?? null;
      if (input.hireDate !== undefined)
        updatePayload.hireDate = input.hireDate ? toSqlDate(new Date(input.hireDate)) : null;
      if (input.contractStartDate !== undefined)
        updatePayload.contractStartDate = input.contractStartDate
          ? toSqlDate(new Date(input.contractStartDate))
          : null;
      if (input.contractEndDate !== undefined)
        updatePayload.contractEndDate = input.contractEndDate ? toSqlDate(new Date(input.contractEndDate)) : null;
      if (input.probationEndDate !== undefined)
        updatePayload.probationEndDate = input.probationEndDate
          ? toSqlDate(new Date(input.probationEndDate))
          : null;
      if (input.terminationDate !== undefined)
        updatePayload.terminationDate = input.terminationDate
          ? toSqlDate(new Date(input.terminationDate))
          : null;
      if (input.status !== undefined) updatePayload.status = input.status ?? null;
      if (input.address !== undefined) updatePayload.address = input.address ?? null;
      if (input.city !== undefined) updatePayload.city = input.city ?? null;
      if (input.country !== undefined) updatePayload.country = input.country ?? null;
      if (input.emergencyContactName !== undefined)
        updatePayload.emergencyContactName = input.emergencyContactName ?? null;
      if (input.emergencyContactPhone !== undefined)
        updatePayload.emergencyContactPhone = input.emergencyContactPhone ?? null;
      if (input.emergencyContactRelation !== undefined)
        updatePayload.emergencyContactRelation = input.emergencyContactRelation ?? null;
      if (input.bankName !== undefined) updatePayload.bankName = input.bankName ?? null;
      if (input.bankAccountNumber !== undefined) updatePayload.bankAccountNumber = input.bankAccountNumber ?? null;
      if (input.bankIban !== undefined) updatePayload.bankIban = input.bankIban ?? null;
      if (input.photoUrl !== undefined) updatePayload.photoUrl = input.photoUrl ?? null;
      if (input.notes !== undefined) updatePayload.notes = input.notes ?? null;

      // Apply standard update payload (updatedAt, updatedBy)
      const finalPayload = buildUpdatePayload({
        ...updatePayload,
        updatedBy: userId,
      });

      await db
        .update(hrEmployees)
        .set(finalPayload)
        .where(
          and(
            eq(hrEmployees.id, input.id),
            ...scopedAndActive(hrEmployees, ctx.scope)
          )
        );

      // Log audit
      await logAudit(db, 'UPDATE', 'EMPLOYEE', input.id, organizationId, operatingUnitId, userId, input);

      // Return updated employee
      return verifyEmployeeScope(db, input.id, ctx.scope);
    }),

    // Get employee statistics
// Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getStatistics: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context (platform-level isolation)
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const conditions = [
        eq(hrEmployees.organizationId, organizationId),
        eq(hrEmployees.operatingUnitId, operatingUnitId),
        eq(hrEmployees.isDeleted, 0),
      ];
      
      const allEmployees = await db
        .select()
        .from(hrEmployees)
        .where(and(...conditions));
      
      const active = allEmployees.filter(e => e.status === 'active').length;
      const onLeave = allEmployees.filter(e => e.status === 'on_leave').length;
      const suspended = allEmployees.filter(e => e.status === 'suspended').length;
      const terminated = allEmployees.filter(e => e.status === 'terminated').length;
      const resigned = allEmployees.filter(e => e.status === 'resigned').length;
      
      // By employment type
      const fullTime = allEmployees.filter(e => e.employmentType === 'full_time').length;
      const partTime = allEmployees.filter(e => e.employmentType === 'part_time').length;
      const contract = allEmployees.filter(e => e.employmentType === 'contract').length;
      const consultant = allEmployees.filter(e => e.employmentType === 'consultant').length;
      const intern = allEmployees.filter(e => e.employmentType === 'intern').length;
      
      // By staff category
      const national = allEmployees.filter(e => e.staffCategory === 'national').length;
      const international = allEmployees.filter(e => e.staffCategory === 'international').length;
      const expatriate = allEmployees.filter(e => e.staffCategory === 'expatriate').length;
      
      // By gender
      const male = allEmployees.filter(e => e.gender === 'male').length;
      const female = allEmployees.filter(e => e.gender === 'female').length;
      
      // Get unique departments
      const departments = [...new Set(allEmployees.map(e => e.department).filter(Boolean))];
      
      return {
        total: allEmployees.length,
        byStatus: { active, onLeave, suspended, terminated, resigned },
        byEmploymentType: { fullTime, partTime, contract, consultant, intern },
        byStaffCategory: { national, international, expatriate },
        byGender: { male, female, other: allEmployees.length - male - female },
        departments,
      };
    }),

/**
 * Dashboard employee counts
 */
getCounts: scopedProcedure
  .input(z.object({}).optional())
  .query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const conditions = scopedAndActive(hrEmployees, ctx.scope);

    const result = await db
      .select({
        total: count(),

        active: sql<number>`
          SUM(CASE WHEN ${hrEmployees.status} = 'active' THEN 1 ELSE 0 END)
        `,

        onLeave: sql<number>`
          SUM(CASE WHEN ${hrEmployees.status} = 'on_leave' THEN 1 ELSE 0 END)
        `,

        suspended: sql<number>`
          SUM(CASE WHEN ${hrEmployees.status} = 'suspended' THEN 1 ELSE 0 END)
        `,

        terminated: sql<number>`
          SUM(CASE WHEN ${hrEmployees.status} = 'terminated' THEN 1 ELSE 0 END)
        `,

        resigned: sql<number>`
          SUM(CASE WHEN ${hrEmployees.status} = 'resigned' THEN 1 ELSE 0 END)
        `,
      })
      .from(hrEmployees)
      .where(and(...conditions));

    const row = result[0];

    const total = Number(row?.total || 0);
    const active = Number(row?.active || 0);
    const onLeave = Number(row?.onLeave || 0);
    const suspended = Number(row?.suspended || 0);
    const terminated = Number(row?.terminated || 0);
    const resigned = Number(row?.resigned || 0);

    return {
      // Existing counts
      total,
      active,
      onLeave,
      suspended,
      terminated,
      resigned,

      // Compatibility fields required by EmployeesProfilesLanding.tsx
      archived: terminated,
      exited: terminated + resigned,
      newHires: 0,
      contractRenewals: 0,
      exitProcessing: 0,
      references: 0,
    };
  }),
  /**
   * Soft-delete employee
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user?.id;

      // Verify employee exists
      await verifyEmployeeScope(db, input.id, ctx.scope);

      // Apply soft delete
      await db
        .update(hrEmployees)
        .set(buildSoftDeletePayload(userId ?? 0))
        .where(
          and(
            eq(hrEmployees.id, input.id),
            ...scopedAndActive(hrEmployees, ctx.scope)
          )
        );

      // Log audit
      await logAudit(db, 'DELETE', 'EMPLOYEE', input.id, organizationId, operatingUnitId, userId);

      return { success: true };
    }),

  /**
   * Restore soft-deleted employee
   */
  restore: scopedProcedure
    .input(z.object({ id: z.number().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId, operatingUnitId } = ctx.scope;
      const userId = ctx.user?.id;

      // Verify employee exists (including deleted ones)
      const [employee] = await db
        .select()
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.id, input.id),
            eq(hrEmployees.organizationId, organizationId),
            ctx.scope.operatingUnitId != null
              ? eq(hrEmployees.operatingUnitId, ctx.scope.operatingUnitId)
              : isNull(hrEmployees.operatingUnitId)
          )
        )
        .limit(1);

      if (!employee) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Employee not found in your organization',
        });
      }

      // Apply restore
      await db
        .update(hrEmployees)
        .set(buildRestorePayload())
        .where(eq(hrEmployees.id, input.id));

      // Log audit
      await logAudit(db, 'RESTORE', 'EMPLOYEE', input.id, organizationId, operatingUnitId, userId);

      return { success: true };
    }),

  /**
   * Get employee count by status
   */
  countByStatus: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const results = await db
      .select({
        status: hrEmployees.status,
        count: count(),
      })
      .from(hrEmployees)
      .where(and(...scopedAndActive(hrEmployees, ctx.scope)))
      .groupBy(hrEmployees.status);

    return results.reduce(
      (acc, row) => {
        acc[row.status as EmployeeStatus] = row.count;
        return acc;
      },
      {} as Record<EmployeeStatus, number>
    );
  }),
});