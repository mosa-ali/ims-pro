/**
 * ============================================================================
 * HR SALARY SCALE ROUTER
 * ============================================================================
 * Single source of truth for all salary data
 * Payroll MUST read from Active records only
 * ============================================================================
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { hrSalaryScale, hrSalaryGrades, hrEmployees } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const salaryScaleCreateSchema = z.object({
  employeeId: z.coerce.number(),
  staffId: z.string(),
  staffFullName: z.string(),
  position: z.string().optional(),
  department: z.string().optional(),
  contractType: z.string().optional(),
  gradeId: z.coerce.number().optional(),
  gradeCode: z.string(),
  step: z.string(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  approvedGrossSalary: z.number(),
  housingAllowance: z.number().optional(),
  housingAllowanceType: z.enum(["value", "percentage"]).optional(),
  transportAllowance: z.number().optional(),
  transportAllowanceType: z.enum(["value", "percentage"]).optional(),
  representationAllowance: z.number().optional(),
  representationAllowanceType: z.enum(["value", "percentage"]).optional(),
  annualAllowance: z.number().optional(),
  bonus: z.number().optional(),
  otherAllowances: z.number().optional(),
  currency: z.string().optional(),
  effectiveStartDate: z.string(),
  effectiveEndDate: z.string().optional(),
});

const salaryScaleUpdateSchema = salaryScaleCreateSchema.partial().extend({
  id: z.coerce.number(),
});

// ============================================================================
// ROUTER
// ============================================================================

export const hrSalaryScaleRouter = router({
  /**
   * Get all salary scale records for an organization
   */
  getAll: scopedProcedure
    .input(z.object({
      status: z.enum(["all", "draft", "active", "superseded"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions: ReturnType<typeof eq>[] = [
        eq(hrSalaryScale.organizationId, organizationId),
        eq(hrSalaryScale.isDeleted, 0),
      ];

      if (operatingUnitId) {
        conditions.push(eq(hrSalaryScale.operatingUnitId, operatingUnitId));
      }

      if (input.status && input.status !== "all") {
        conditions.push(eq(hrSalaryScale.status, input.status));
      }

      const records = await db
        .select()
        .from(hrSalaryScale)
        .where(and(...conditions))
        .orderBy(desc(hrSalaryScale.updatedAt));

      return records;
    }),

  /**
   * Get salary scale record by ID
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db
        .select()
        .from(hrSalaryScale)
        .where(and(
          eq(hrSalaryScale.id, input.id),
          eq(hrSalaryScale.organizationId, organizationId),
          eq(hrSalaryScale.isDeleted, 0)
        ));

      if (!record) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Salary scale record not found" });
      }

      return record;
    }),

  /**
   * Get latest salary record for a specific employee
   * CRITICAL: Returns ACTIVE salary first, then DRAFT as fallback
   */
  getActiveByEmployeeId: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Try to get active salary first
      const [activeRecord] = await db
        .select()
        .from(hrSalaryScale)
        .where(and(
          eq(hrSalaryScale.employeeId, input.employeeId),
          eq(hrSalaryScale.organizationId, organizationId),
          eq(hrSalaryScale.status, "active"),
          eq(hrSalaryScale.isDeleted, 0)
        ))
        .orderBy(desc(hrSalaryScale.version))
        .limit(1);

      if (activeRecord) return activeRecord;

      // Fallback to draft if no active record
      const [draftRecord] = await db
        .select()
        .from(hrSalaryScale)
        .where(and(
          eq(hrSalaryScale.employeeId, input.employeeId),
          eq(hrSalaryScale.organizationId, organizationId),
          eq(hrSalaryScale.status, "draft"),
          eq(hrSalaryScale.isDeleted, 0)
        ))
        .orderBy(desc(hrSalaryScale.version))
        .limit(1);

      return draftRecord || null;
    }),

  /**
   * Get active salary record by staff ID
   * CRITICAL: Only returns ACTIVE salaries (used by payroll)
   */
  getActiveByStaffId: scopedProcedure
    .input(z.object({
      staffId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db
        .select()
        .from(hrSalaryScale)
        .where(and(
          eq(hrSalaryScale.staffId, input.staffId),
          eq(hrSalaryScale.organizationId, organizationId),
          eq(hrSalaryScale.status, "active"),
          eq(hrSalaryScale.isDeleted, 0)
        ))
        .orderBy(desc(hrSalaryScale.version))
        .limit(1);

      return record || null;
    }),

  /**
   * Get salary history for an employee
   * Returns all versions (active, superseded, draft) for audit trail
   */
  getHistoryByEmployeeId: scopedProcedure
    .input(z.object({
      employeeId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const records = await db
        .select()
        .from(hrSalaryScale)
        .where(and(
          eq(hrSalaryScale.employeeId, input.employeeId),
          eq(hrSalaryScale.organizationId, organizationId),
          eq(hrSalaryScale.isDeleted, 0)
        ))
        .orderBy(desc(hrSalaryScale.version));

      return records;
    }),

  /**
   * Create a new salary scale record
   * New records are created as DRAFT by default
   */
  create: scopedProcedure
    .input(salaryScaleCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [result] = await db.insert(hrSalaryScale).values({
        ...input,
        organizationId,
        operatingUnitId,
        approvedGrossSalary: String(input.approvedGrossSalary),
        minSalary: input.minSalary ? String(input.minSalary) : "0",
        maxSalary: input.maxSalary ? String(input.maxSalary) : "0",
        housingAllowance: input.housingAllowance ? String(input.housingAllowance) : "0",
        transportAllowance: input.transportAllowance ? String(input.transportAllowance) : "0",
        representationAllowance: input.representationAllowance ? String(input.representationAllowance) : "0",
        annualAllowance: input.annualAllowance ? String(input.annualAllowance) : "0",
        bonus: input.bonus ? String(input.bonus) : "0",
        otherAllowances: input.otherAllowances ? String(input.otherAllowances) : "0",
        status: "draft",
        version: 1,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Update a salary scale record
   * ========================================================================
   * CRITICAL LOGIC:
   * If updating an ACTIVE salary:
   *   1. Mark existing active salary as 'superseded'
   *   2. Create NEW salary record as 'active' (version + 1)
   *   3. Return newVersion: true
   *
   * If updating a DRAFT salary:
   *   1. Update the draft record in-place
   *   2. Return newVersion: false
   * ========================================================================
   */
  update: scopedProcedure
    .input(salaryScaleUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...updateData } = input;

      // Fetch the existing record
      const [existing] = await db
        .select()
        .from(hrSalaryScale)
        .where(and(
          eq(hrSalaryScale.id, id),
          eq(hrSalaryScale.organizationId, organizationId)
        ));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      }

      if (existing.isLocked) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Record is locked" });
      }

      // ====================================================================
      // CASE 1: Updating an ACTIVE salary
      // ====================================================================
      if (existing.status === "active") {
        // Step 1: Mark previous active as superseded
        await db
          .update(hrSalaryScale)
          .set({ status: "superseded", updatedBy: ctx.user?.id })
          .where(eq(hrSalaryScale.id, id));

        // Step 2: Create NEW active salary record
        const [result] = await db.insert(hrSalaryScale).values({
          organizationId,
          operatingUnitId: operatingUnitId || existing.operatingUnitId,
          employeeId: existing.employeeId,
          staffId: existing.staffId,
          staffFullName: updateData.staffFullName || existing.staffFullName,
          position: updateData.position || existing.position,
          department: updateData.department || existing.department,
          contractType: updateData.contractType || existing.contractType,
          gradeId: updateData.gradeId || existing.gradeId,
          gradeCode: updateData.gradeCode || existing.gradeCode,
          step: updateData.step || existing.step,
          minSalary: updateData.minSalary ? String(updateData.minSalary) : existing.minSalary,
          maxSalary: updateData.maxSalary ? String(updateData.maxSalary) : existing.maxSalary,
          approvedGrossSalary: updateData.approvedGrossSalary ? String(updateData.approvedGrossSalary) : existing.approvedGrossSalary,
          housingAllowance: updateData.housingAllowance ? String(updateData.housingAllowance) : existing.housingAllowance,
          housingAllowanceType: updateData.housingAllowanceType || existing.housingAllowanceType,
          transportAllowance: updateData.transportAllowance ? String(updateData.transportAllowance) : existing.transportAllowance,
          transportAllowanceType: updateData.transportAllowanceType || existing.transportAllowanceType,
          representationAllowance: updateData.representationAllowance ? String(updateData.representationAllowance) : existing.representationAllowance,
          representationAllowanceType: updateData.representationAllowanceType || existing.representationAllowanceType,
          annualAllowance: updateData.annualAllowance ? String(updateData.annualAllowance) : existing.annualAllowance,
          bonus: updateData.bonus ? String(updateData.bonus) : existing.bonus,
          otherAllowances: updateData.otherAllowances ? String(updateData.otherAllowances) : existing.otherAllowances,
          currency: updateData.currency || existing.currency,
          effectiveStartDate: updateData.effectiveStartDate || new Date().toISOString().split("T")[0],
          // ================================================================
          // CRITICAL: New salary is ACTIVE, not draft
          // Payroll will immediately read this record
          // ================================================================
          status: "active",
          version: existing.version + 1,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });

        return { id: result.insertId, success: true, newVersion: true };
      }

      // ====================================================================
      // CASE 2: Updating a DRAFT salary
      // ====================================================================
      const updateValues: Record<string, unknown> = {
        updatedBy: ctx.user?.id,
      };

      if (updateData.staffFullName) updateValues.staffFullName = updateData.staffFullName;
      if (updateData.position) updateValues.position = updateData.position;
      if (updateData.department) updateValues.department = updateData.department;
      if (updateData.contractType) updateValues.contractType = updateData.contractType;
      if (updateData.gradeId) updateValues.gradeId = updateData.gradeId;
      if (updateData.gradeCode) updateValues.gradeCode = updateData.gradeCode;
      if (updateData.step) updateValues.step = updateData.step;
      if (updateData.minSalary !== undefined) updateValues.minSalary = String(updateData.minSalary);
      if (updateData.maxSalary !== undefined) updateValues.maxSalary = String(updateData.maxSalary);
      if (updateData.approvedGrossSalary !== undefined) updateValues.approvedGrossSalary = String(updateData.approvedGrossSalary);
      if (updateData.housingAllowance !== undefined) updateValues.housingAllowance = String(updateData.housingAllowance);
      if (updateData.housingAllowanceType) updateValues.housingAllowanceType = updateData.housingAllowanceType;
      if (updateData.transportAllowance !== undefined) updateValues.transportAllowance = String(updateData.transportAllowance);
      if (updateData.transportAllowanceType) updateValues.transportAllowanceType = updateData.transportAllowanceType;
      if (updateData.representationAllowance !== undefined) updateValues.representationAllowance = String(updateData.representationAllowance);
      if (updateData.representationAllowanceType) updateValues.representationAllowanceType = updateData.representationAllowanceType;
      if (updateData.annualAllowance !== undefined) updateValues.annualAllowance = String(updateData.annualAllowance);
      if (updateData.bonus !== undefined) updateValues.bonus = String(updateData.bonus);
      if (updateData.otherAllowances !== undefined) updateValues.otherAllowances = String(updateData.otherAllowances);
      if (updateData.currency) updateValues.currency = updateData.currency;
      if (updateData.effectiveStartDate) updateValues.effectiveStartDate = updateData.effectiveStartDate;
      if (updateData.effectiveEndDate) updateValues.effectiveEndDate = updateData.effectiveEndDate;

      await db
        .update(hrSalaryScale)
        .set(updateValues)
        .where(and(eq(hrSalaryScale.id, id), eq(hrSalaryScale.organizationId, organizationId)));

      return { id, success: true, newVersion: false };
    }),

  /**
   * Activate a draft salary record
   * Marks all other active salaries for this employee as superseded
   */
  activate: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db
        .select()
        .from(hrSalaryScale)
        .where(and(eq(hrSalaryScale.id, input.id), eq(hrSalaryScale.organizationId, organizationId)));

      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      if (record.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft records can be activated" });

      // Mark all other active salaries as superseded
      await db.update(hrSalaryScale).set({ status: "superseded", updatedBy: ctx.user?.id }).where(and(
        eq(hrSalaryScale.employeeId, record.employeeId),
        eq(hrSalaryScale.organizationId, organizationId),
        eq(hrSalaryScale.status, "active"),
        eq(hrSalaryScale.isDeleted, 0)
      ));

      // Activate this draft record
      await db.update(hrSalaryScale).set({
        status: "active",
        lastApprovedBy: ctx.user?.id,
        lastApprovedAt: new Date().toISOString(),
        updatedBy: ctx.user?.id,
      }).where(eq(hrSalaryScale.id, input.id));

      return { success: true };
    }),

  /**
   * Toggle lock on salary record
   */
  toggleLock: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db.select().from(hrSalaryScale).where(and(eq(hrSalaryScale.id, input.id), eq(hrSalaryScale.organizationId, organizationId)));
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });

      const newLockedState = !record.isLocked;
      await db.update(hrSalaryScale).set({
        isLocked: newLockedState ? 1 : 0,
        updatedBy: ctx.user?.id,
      }).where(eq(hrSalaryScale.id, input.id));
      return { success: true, isLocked: newLockedState };
    }),

  /**
   * Soft delete salary record
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [record] = await db.select().from(hrSalaryScale).where(and(eq(hrSalaryScale.id, input.id), eq(hrSalaryScale.organizationId, organizationId)));
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      if (record.usedInPayroll) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete record used in payroll" });

      await db.update(hrSalaryScale).set({
        isDeleted: 1,
        deletedAt: new Date().toISOString(),
        deletedBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      }).where(eq(hrSalaryScale.id, input.id));
      return { success: true };
    }),
});
