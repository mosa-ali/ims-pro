import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { hrEmployees } from "../drizzle/schema";
import { eq, and, desc, like, or, sql, count } from "drizzle-orm";

/**
 * HR Employees Router - Employee Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */
export const hrEmployeesRouter = router({
  // Get all employees for an organization (excludes soft-deleted)
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getAll: scopedProcedure
    .input(z.object({
      status: z.enum(["active", "on_leave", "suspended", "terminated", "resigned"]).optional(),
      department: z.string().optional(),
      employmentType: z.enum(["full_time", "part_time", "contract", "consultant", "intern"]).optional(),
      search: z.string().optional(),
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context (platform-level isolation)
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const conditions = [
        eq(hrEmployees.organizationId, organizationId),
        eq(hrEmployees.operatingUnitId, operatingUnitId),
        eq(hrEmployees.isDeleted, false),
      ];
      if (input.status) {
        conditions.push(eq(hrEmployees.status, input.status));
      }
      if (input.department) {
        conditions.push(eq(hrEmployees.department, input.department));
      }
      if (input.employmentType) {
        conditions.push(eq(hrEmployees.employmentType, input.employmentType));
      }
      
      let query = db
        .select()
        .from(hrEmployees)
        .where(and(...conditions))
        .orderBy(desc(hrEmployees.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      const employees = await query;
      
      // Add computed fullName field
      const employeesWithFullName = employees.map(emp => ({
        ...emp,
        fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email || 'Unknown',
      }));
      
      // Filter by search if provided (client-side for simplicity)
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        return employeesWithFullName.filter(emp => 
          emp.firstName?.toLowerCase().includes(searchLower) ||
          emp.lastName?.toLowerCase().includes(searchLower) ||
          emp.fullName?.toLowerCase().includes(searchLower) ||
          emp.email?.toLowerCase().includes(searchLower) ||
          emp.employeeCode?.toLowerCase().includes(searchLower)
        );
      }
      
      return employeesWithFullName;
    }),

  // Get single employee by ID
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getById: scopedProcedure
    .input(z.object({ 
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context (platform-level isolation)
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db
        .select()
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.id, input.id),
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.operatingUnitId, operatingUnitId),
            eq(hrEmployees.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
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
        eq(hrEmployees.isDeleted, false),
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

  // Create new employee
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  create: scopedProcedure
    .input(z.object({
      employeeCode: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      firstNameAr: z.string().optional(),
      lastNameAr: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      nationality: z.string().optional(),
      nationalId: z.string().optional(),
      passportNumber: z.string().optional(),
      employmentType: z.enum(["full_time", "part_time", "contract", "consultant", "intern"]).optional(),
      staffCategory: z.enum(["national", "international", "expatriate"]).optional(),
      department: z.string().optional(),
      position: z.string().optional(),
      jobTitle: z.string().optional(),
      gradeLevel: z.string().optional(),
      reportingTo: z.number().optional(),
      hireDate: z.string().optional(),
      contractStartDate: z.string().optional(),
      contractEndDate: z.string().optional(),
      probationEndDate: z.string().optional(),
      status: z.enum(["active", "on_leave", "suspended", "terminated", "resigned"]).optional(),
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
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context (platform-level isolation)
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db.insert(hrEmployees).values({
        ...input,
        organizationId,
        operatingUnitId,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        // Date columns should remain as strings in YYYY-MM-DD format
        hireDate: input.hireDate || null,
        contractStartDate: input.contractStartDate || null,
        contractEndDate: input.contractEndDate || null,
        probationEndDate: input.probationEndDate || null,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update employee
  // Uses scopedProcedure for authentication but doesn't need scope in query (updates by ID)
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      employeeCode: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      firstNameAr: z.string().optional(),
      lastNameAr: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      nationality: z.string().optional(),
      nationalId: z.string().optional(),
      passportNumber: z.string().optional(),
      employmentType: z.enum(["full_time", "part_time", "contract", "consultant", "intern"]).optional(),
      staffCategory: z.enum(["national", "international", "expatriate"]).optional(),
      department: z.string().optional(),
      position: z.string().optional(),
      jobTitle: z.string().optional(),
      gradeLevel: z.string().optional(),
      reportingTo: z.number().nullable().optional(),
      hireDate: z.string().optional(),
      contractStartDate: z.string().optional(),
      contractEndDate: z.string().optional(),
      probationEndDate: z.string().optional(),
      terminationDate: z.string().optional(),
      status: z.enum(["active", "on_leave", "suspended", "terminated", "resigned"]).optional(),
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
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context for security validation
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const { id, ...updateData } = input;
      
      // Convert date strings to Date objects for timestamp columns
      // Keep date strings as-is for date columns (hireDate, contractStartDate, etc.)
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.dateOfBirth) processedData.dateOfBirth = new Date(updateData.dateOfBirth);
      // Date columns should remain as strings in YYYY-MM-DD format
      // if (updateData.hireDate) processedData.hireDate = new Date(updateData.hireDate);
      // if (updateData.contractStartDate) processedData.contractStartDate = new Date(updateData.contractStartDate);
      // if (updateData.contractEndDate) processedData.contractEndDate = new Date(updateData.contractEndDate);
      // if (updateData.probationEndDate) processedData.probationEndDate = new Date(updateData.probationEndDate);
      // if (updateData.terminationDate) processedData.terminationDate = new Date(updateData.terminationDate);
      
      processedData.updatedBy = ctx.user?.id;
      
      // Update only within the current scope for security
      await db
        .update(hrEmployees)
        .set(processedData)
        .where(
          and(
            eq(hrEmployees.id, id),
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.operatingUnitId, operatingUnitId),
            eq(hrEmployees.isDeleted, false)
          )
        );
      
      return { success: true };
    }),

  // Soft delete employee
  // Uses scopedProcedure for security - only delete within current scope
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context for security validation
      const { organizationId, operatingUnitId } = ctx.scope;
      
      await db
        .update(hrEmployees)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(
          and(
            eq(hrEmployees.id, input.id),
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.operatingUnitId, operatingUnitId)
          )
        );
      
      return { success: true };
    }),

  // Restore soft-deleted employee
  // Uses scopedProcedure for security - only restore within current scope
  restore: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context for security validation
      const { organizationId, operatingUnitId } = ctx.scope;
      
      await db
        .update(hrEmployees)
        .set({
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        })
        .where(
          and(
            eq(hrEmployees.id, input.id),
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.operatingUnitId, operatingUnitId)
          )
        );
      
      return { success: true };
    }),

  // Get deleted employees (for admin recovery)
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getDeleted: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context (platform-level isolation)
      const { organizationId, operatingUnitId } = ctx.scope;
      
      return await db
        .select()
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.operatingUnitId, operatingUnitId),
            eq(hrEmployees.isDeleted, true)
          )
        )
        .orderBy(desc(hrEmployees.deletedAt));
    }),

  // Get employee counts by status for dashboard cards
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getCounts: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Extract scope from context (platform-level isolation)
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Count active employees (not deleted, status = active)
      const activeResult = await db
        .select({ count: count() })
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.operatingUnitId, operatingUnitId),
            eq(hrEmployees.isDeleted, false),
            eq(hrEmployees.status, 'active')
          )
        );
      
      // Count archived employees (not deleted, status = suspended or on_leave)
      const archivedResult = await db
        .select({ count: count() })
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.operatingUnitId, operatingUnitId),
            eq(hrEmployees.isDeleted, false),
            or(
              eq(hrEmployees.status, 'suspended'),
              eq(hrEmployees.status, 'on_leave')
            )
          )
        );
      
      // Count exited employees (not deleted, status = terminated or resigned)
      const exitedResult = await db
        .select({ count: count() })
        .from(hrEmployees)
        .where(
          and(
            eq(hrEmployees.organizationId, organizationId),
            eq(hrEmployees.operatingUnitId, operatingUnitId),
            eq(hrEmployees.isDeleted, false),
            or(
              eq(hrEmployees.status, 'terminated'),
              eq(hrEmployees.status, 'resigned')
            )
          )
        );
      
      return {
        active: activeResult[0]?.count ?? 0,
        archived: archivedResult[0]?.count ?? 0,
        exited: exitedResult[0]?.count ?? 0,
      };
    }),
});
