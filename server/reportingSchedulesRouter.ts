import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc } from 'drizzle-orm';
import { protectedProcedure, router, scopedProcedure } from './_core/trpc';
import { getDb } from './db';
import { reportingSchedules, projects } from '../drizzle/schema';

// Report Type Enum
const reportTypeEnum = z.enum([
  'NARRATIVE',
  'FINANCIAL',
  'PROGRESS',
  'FINAL',
  'INTERIM',
  'QUARTERLY',
  'ANNUAL',
  'OTHER'
]);

// Report Status Enum
const reportStatusEnum = z.enum([
  'NOT_STARTED',
  'PLANNED',
  'UNDER_PREPARATION',
  'UNDER_REVIEW',
  'SUBMITTED_TO_HQ',
  'SUBMITTED_TO_DONOR'
]);

export const reportingSchedulesRouter = router({
  // List all reporting schedules (optionally filtered by project or grant)
  list: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      grantId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const { projectId, grantId } = input;
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Build where clause
      const whereConditions = [
        eq(reportingSchedules.organizationId, organizationId),
        eq(reportingSchedules.operatingUnitId, operatingUnitId),
        eq(reportingSchedules.isDeleted, false)
      ];
      
      if (projectId) {
        whereConditions.push(eq(reportingSchedules.projectId, projectId));
      }
      
      if (grantId) {
        whereConditions.push(eq(reportingSchedules.grantId, grantId));
      }
      
      const schedules = await db
        .select({
          id: reportingSchedules.id,
          projectId: reportingSchedules.projectId,
          projectCode: projects.code,
          projectName: projects.title,
          reportType: reportingSchedules.reportType,
          reportTypeOther: reportingSchedules.reportTypeOther,
          periodFrom: reportingSchedules.periodFrom,
          periodTo: reportingSchedules.periodTo,
          reportStatus: reportingSchedules.reportStatus,
          reportDeadline: reportingSchedules.reportDeadline,
          notes: reportingSchedules.notes,
          isLocked: reportingSchedules.isLocked,
          createdAt: reportingSchedules.createdAt,
          updatedAt: reportingSchedules.updatedAt,
        })
        .from(reportingSchedules)
        .leftJoin(projects, eq(reportingSchedules.projectId, projects.id))
        .where(and(...whereConditions))
        .orderBy(desc(reportingSchedules.reportDeadline));
      
      return schedules;
    }),

  // Get a single reporting schedule by ID
  getById: scopedProcedure
    .input(z.object({ 
      id: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const schedule = await db
        .select()
        .from(reportingSchedules)
        .where(
          and(
            eq(reportingSchedules.id, input.id),
            eq(reportingSchedules.organizationId, organizationId),
            eq(reportingSchedules.operatingUnitId, operatingUnitId),
            eq(reportingSchedules.isDeleted, false)
          )
        )
        .limit(1);

      if (!schedule[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reporting schedule not found',
        });
      }

      return schedule[0];
    }),

  // Create a new reporting schedule
  create: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      grantId: z.number().optional(), // Optional link to grant
      reportType: reportTypeEnum,
      reportTypeOther: z.string().optional(),
      periodFrom: z.string(), // ISO date string
      periodTo: z.string(), // ISO date string
      reportStatus: reportStatusEnum,
      reportDeadline: z.string(), // ISO date string
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Get project to verify it exists
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const [result] = await db.insert(reportingSchedules).values({
        projectId: input.projectId,
        grantId: input.grantId, // Optional grant link
        organizationId,
        operatingUnitId,
        reportType: input.reportType,
        reportTypeOther: input.reportTypeOther,
        periodFrom: new Date(input.periodFrom),
        periodTo: new Date(input.periodTo),
        reportStatus: input.reportStatus,
        reportDeadline: new Date(input.reportDeadline),
        notes: input.notes,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      return {
        message: 'Reporting schedule created successfully',
      };
    }),

  // Update a reporting schedule
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      reportType: reportTypeEnum.optional(),
      reportTypeOther: z.string().optional(),
      periodFrom: z.string().optional(),
      periodTo: z.string().optional(),
      reportStatus: reportStatusEnum.optional(),
      reportDeadline: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if schedule exists and is not locked
      const existing = await db
        .select()
        .from(reportingSchedules)
        .where(
          and(
            eq(reportingSchedules.id, input.id),
            eq(reportingSchedules.organizationId, organizationId),
            eq(reportingSchedules.operatingUnitId, operatingUnitId),
            eq(reportingSchedules.isDeleted, false)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reporting schedule not found',
        });
      }

      if (existing[0].isLocked) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot update locked reporting schedule',
        });
      }

      const { id, ...updateData } = input;

      const updateFields: any = {
        updatedBy: ctx.user.id,
      };
      
      if (updateData.reportType) updateFields.reportType = updateData.reportType;
      if (updateData.reportTypeOther !== undefined) updateFields.reportTypeOther = updateData.reportTypeOther;
      if (updateData.periodFrom) updateFields.periodFrom = new Date(updateData.periodFrom);
      if (updateData.periodTo) updateFields.periodTo = new Date(updateData.periodTo);
      if (updateData.reportStatus) updateFields.reportStatus = updateData.reportStatus;
      if (updateData.reportDeadline) updateFields.reportDeadline = new Date(updateData.reportDeadline);
      if (updateData.notes !== undefined) updateFields.notes = updateData.notes;

      await db
        .update(reportingSchedules)
        .set(updateFields)
        .where(eq(reportingSchedules.id, id));

      return {
        message: 'Reporting schedule updated successfully',
      };
    }),

  // Delete a reporting schedule (soft delete)
  delete: scopedProcedure
    .input(z.object({ 
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Check if schedule exists and is not locked
      const existing = await db
        .select()
        .from(reportingSchedules)
        .where(
          and(
            eq(reportingSchedules.id, input.id),
            eq(reportingSchedules.organizationId, organizationId),
            eq(reportingSchedules.operatingUnitId, operatingUnitId),
            eq(reportingSchedules.isDeleted, false)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reporting schedule not found',
        });
      }

      if (existing[0].isLocked) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete locked reporting schedule',
        });
      }

      await db
        .update(reportingSchedules)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(reportingSchedules.id, input.id));

      return {
        message: 'Reporting schedule deleted successfully',
      };
    }),

  // Lock a reporting schedule (when submitted to donor)
  lock: scopedProcedure
    .input(z.object({ 
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const existing = await db
        .select()
        .from(reportingSchedules)
        .where(
          and(
            eq(reportingSchedules.id, input.id),
            eq(reportingSchedules.organizationId, organizationId),
            eq(reportingSchedules.operatingUnitId, operatingUnitId),
            eq(reportingSchedules.isDeleted, false)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reporting schedule not found',
        });
      }

      await db
        .update(reportingSchedules)
        .set({
          isLocked: true,
          lockedAt: new Date(),
          lockedBy: ctx.user.id,
          reportStatus: 'SUBMITTED_TO_DONOR',
          updatedBy: ctx.user.id,
        })
        .where(eq(reportingSchedules.id, input.id));

      return {
        message: 'Reporting schedule locked successfully',
      };
    }),

  // Get count of active reporting schedules
  getCount: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const result = await db
        .select()
        .from(reportingSchedules)
        .where(
          and(
            eq(reportingSchedules.organizationId, organizationId),
            eq(reportingSchedules.operatingUnitId, operatingUnitId),
            eq(reportingSchedules.isDeleted, false),
            eq(reportingSchedules.reportStatus, 'PLANNED')
          )
        );

      return result.length;
    }),
});
