/**
 * ============================================================================
 * HR SALARY GRADES ROUTER
 * ============================================================================
 * Manages salary grade definitions (A, B, C, D, etc.)
 * Each grade has min/max salary ranges and steps
 * ============================================================================
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { hrSalaryGrades } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const salaryGradeCreateSchema = z.object({
  gradeCode: z.string().min(1, "Grade code is required"),
  gradeName: z.string().min(1, "Grade name is required"),
  gradeNameAr: z.string().optional(),
  minSalary: z.number().min(0, "Min salary must be positive"),
  maxSalary: z.number().min(0, "Max salary must be positive"),
  midSalary: z.number().optional(),
  steps: z.string().optional(), // JSON stringified array
  currency: z.string().default("USD"),
  housingAllowance: z.number().optional(),
  transportAllowance: z.number().optional(),
  otherAllowances: z.string().optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(["active", "inactive", "draft"]).default("active"),
  notes: z.string().optional(),
});

const salaryGradeUpdateSchema = salaryGradeCreateSchema.partial().extend({
  id: z.number(),
});

// ============================================================================
// ROUTER
// ============================================================================

export const hrSalaryGradesRouter = router({
  /**
   * Get all salary grades for an organization
   */
  getAll: scopedProcedure
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const grades = await db
        .select()
        .from(hrSalaryGrades)
        .where(and(
          eq(hrSalaryGrades.organizationId, organizationId),
          eq(hrSalaryGrades.isDeleted, 0)
        ))
        .orderBy(hrSalaryGrades.gradeCode);

      return grades;
    }),

  /**
   * Get a single salary grade by ID
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [grade] = await db
        .select()
        .from(hrSalaryGrades)
        .where(and(
          eq(hrSalaryGrades.id, input.id),
          eq(hrSalaryGrades.organizationId, organizationId),
          eq(hrSalaryGrades.isDeleted, 0)
        ));

      if (!grade) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Salary grade not found" });
      }

      return grade;
    }),

  /**
   * Get salary grade by code
   */
  getByCode: scopedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [grade] = await db
        .select()
        .from(hrSalaryGrades)
        .where(and(
          eq(hrSalaryGrades.gradeCode, input.code),
          eq(hrSalaryGrades.organizationId, organizationId),
          eq(hrSalaryGrades.isDeleted, 0)
        ));

      return grade || null;
    }),

  /**
   * Create a new salary grade
   */
  create: scopedProcedure
    .input(salaryGradeCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if grade already exists
      const [existing] = await db
        .select()
        .from(hrSalaryGrades)
        .where(and(
          eq(hrSalaryGrades.gradeCode, input.gradeCode),
          eq(hrSalaryGrades.organizationId, organizationId),
          eq(hrSalaryGrades.isDeleted, 0)
        ));

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: `Grade "${input.gradeCode}" already exists` });
      }

      const [result] = await db.insert(hrSalaryGrades).values({
        organizationId,
        gradeCode: input.gradeCode,
        gradeName: input.gradeName,
        gradeNameAr: input.gradeNameAr,
        minSalary: input.minSalary,
        maxSalary: input.maxSalary,
        midSalary: input.midSalary,
        steps: input.steps,
        currency: input.currency,
        housingAllowance: input.housingAllowance,
        transportAllowance: input.transportAllowance,
        otherAllowances: input.otherAllowances,
        effectiveDate: input.effectiveDate,
        expiryDate: input.expiryDate,
        status: input.status,
        notes: input.notes,
        createdAt: new Date().toISOString(),
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Update a salary grade
   */
  update: scopedProcedure
    .input(salaryGradeUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { id, ...updateData } = input;

      const [existing] = await db
        .select()
        .from(hrSalaryGrades)
        .where(and(
          eq(hrSalaryGrades.id, id),
          eq(hrSalaryGrades.organizationId, organizationId),
          eq(hrSalaryGrades.isDeleted, 0)
        ));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Salary grade not found" });
      }

      // Check if new grade code conflicts with existing
      if (updateData.gradeCode && updateData.gradeCode !== existing.gradeCode) {
        const [conflict] = await db
          .select()
          .from(hrSalaryGrades)
          .where(and(
            eq(hrSalaryGrades.gradeCode, updateData.gradeCode),
            eq(hrSalaryGrades.organizationId, organizationId),
            eq(hrSalaryGrades.isDeleted, 0)
          ));

        if (conflict) {
          throw new TRPCError({ code: "CONFLICT", message: `Grade "${updateData.gradeCode}" already exists` });
        }
      }

      const updateValues: Record<string, unknown> = {};
      if (updateData.gradeCode) updateValues.gradeCode = updateData.gradeCode;
      if (updateData.gradeName) updateValues.gradeName = updateData.gradeName;
      if (updateData.gradeNameAr) updateValues.gradeNameAr = updateData.gradeNameAr;
      if (updateData.minSalary !== undefined) updateValues.minSalary = updateData.minSalary;
      if (updateData.maxSalary !== undefined) updateValues.maxSalary = updateData.maxSalary;
      if (updateData.midSalary !== undefined) updateValues.midSalary = updateData.midSalary;
      if (updateData.steps) updateValues.steps = updateData.steps;
      if (updateData.currency) updateValues.currency = updateData.currency;
      if (updateData.housingAllowance !== undefined) updateValues.housingAllowance = updateData.housingAllowance;
      if (updateData.transportAllowance !== undefined) updateValues.transportAllowance = updateData.transportAllowance;
      if (updateData.otherAllowances) updateValues.otherAllowances = updateData.otherAllowances;
      if (updateData.effectiveDate) updateValues.effectiveDate = updateData.effectiveDate;
      if (updateData.expiryDate) updateValues.expiryDate = updateData.expiryDate;
      if (updateData.status) updateValues.status = updateData.status;
      if (updateData.notes) updateValues.notes = updateData.notes;
      updateValues.updatedAt = new Date().toISOString();

      await db
        .update(hrSalaryGrades)
        .set(updateValues)
        .where(and(
          eq(hrSalaryGrades.id, id),
          eq(hrSalaryGrades.organizationId, organizationId)
        ));

      return { id, success: true };
    }),

  /**
   * Delete a salary grade (soft delete)
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [existing] = await db
        .select()
        .from(hrSalaryGrades)
        .where(and(
          eq(hrSalaryGrades.id, input.id),
          eq(hrSalaryGrades.organizationId, organizationId),
          eq(hrSalaryGrades.isDeleted, 0)
        ));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Salary grade not found" });
      }

      await db
        .update(hrSalaryGrades)
        .set({ 
          isDeleted: 1, 
          deletedBy: ctx.user?.id,
          deletedAt: new Date().toISOString()
        })
        .where(eq(hrSalaryGrades.id, input.id));

      return { id: input.id, success: true };
    }),
});
