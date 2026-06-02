import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, lte } from 'drizzle-orm';
import { protectedProcedure, router, scopedProcedure } from './_core/trpc';
import { getDb } from './db';
import {
  reportingSchedules,
  projects,
  organizations,
  operatingUnits
} from '../drizzle/schema';

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

type ReportingScheduleItem = {
  id: number;
  projectId: number | null;
  projectCode: string | null;
  projectTitle: string | null;
  projectTitleAr: string | null;
  reportType: string | null;
  reportTitle: string | null;
  reportTitleAr: string | null;
  dueDate: string;
  status: string | null;
  frequency: string | null;
};

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
        eq(reportingSchedules.isDeleted, 0)
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
          projectCode: projects.projectCode,
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
            eq(reportingSchedules.isDeleted, 0)
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
        organizationId: organizationId,
        operatingUnitId: operatingUnitId,
        projectId: input.projectId,
        grantId: input.grantId, // Optional grant link
        reportType: input.reportType,
        reportTypeOther: input.reportTypeOther,
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        reportStatus: input.reportStatus,
        reportDeadline: input.reportDeadline,
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
            eq(reportingSchedules.isDeleted, 0)
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
            eq(reportingSchedules.isDeleted, 0)
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
          isDeleted: 1,
          deletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
            eq(reportingSchedules.isDeleted, 0)
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
          isLocked: 1,
          lockedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
            eq(reportingSchedules.isDeleted, 0),
            eq(reportingSchedules.reportStatus, 'PLANNED')
          )
        );

      return result.length;
    }),

  // Mark a reporting schedule as submitted
  markAsSubmitted: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify the schedule exists and belongs to the organization
      const existing = await db
        .select()
        .from(reportingSchedules)
        .where(
          and(
            eq(reportingSchedules.id, input.id),
            eq(reportingSchedules.organizationId, organizationId),
            eq(reportingSchedules.operatingUnitId, operatingUnitId),
            eq(reportingSchedules.isDeleted, 0)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reporting schedule not found',
        });
      }

      // Update the status to submitted
      await db
        .update(reportingSchedules)
        .set({
          reportStatus: 'SUBMITTED_TO_DONOR',
          updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          updatedBy: ctx.user.id,
        })
        .where(eq(reportingSchedules.id, input.id));

      return {
        success: true,
        message: 'Report marked as submitted',
      };
    }),

  // ─── NEW: Get upcoming reporting deadlines (compact widget) ────────────────────
  // Returns ALL deadlines within 90 days with ALL report statuses
  // Includes: NOT_STARTED, PLANNED, UNDER_PREPARATION, UNDER_REVIEW, SUBMITTED_TO_HQ, SUBMITTED_TO_DONOR
  // Widget displays top 5, but all are available for full reporting schedule page
  getUpcomingDeadlines: scopedProcedure
    .input(z.object({
      daysAhead: z.number().optional().default(90),
      limit: z.number().optional().default(5), // Widget limit, can be overridden for full list
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const { daysAhead, limit } = input;
      const db = await getDb();

      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        // Calculate date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];

        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const futureDateString = futureDate.toISOString().split('T')[0];

        // Build where clause - includes ALL deadlines up to daysAhead (including overdue)
        // NO status filter - includes all statuses
        const whereConditions = [
          eq(reportingSchedules.organizationId, organizationId),
          eq(reportingSchedules.operatingUnitId, operatingUnitId),
          eq(reportingSchedules.isDeleted, 0),
          lte(reportingSchedules.reportDeadline, futureDateString), // Deadline <= future date
        ];

        // Fetch ALL deadlines with project code (no status filter, no limit in query)
        const deadlines = await db
          .select({
            id: reportingSchedules.id,
            projectId: reportingSchedules.projectId,
            projectCode: projects.projectCode,
            projectName: projects.title,
            reportType: reportingSchedules.reportType,
            reportStatus: reportingSchedules.reportStatus,
            reportDeadline: reportingSchedules.reportDeadline,
          })
          .from(reportingSchedules)
          .leftJoin(projects, eq(reportingSchedules.projectId, projects.id))
          .where(and(...whereConditions));

        // Transform and calculate priority
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const transformed = (deadlines || []).map((d) => {
          const deadline = new Date(d.reportDeadline);
          deadline.setHours(0, 0, 0, 0);

          const daysUntilDeadline = Math.ceil(
            (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          const isOverdue = daysUntilDeadline < 0;
          const isUrgent = daysUntilDeadline >= 0 && daysUntilDeadline <= 15;
          const isUpcoming = daysUntilDeadline > 7 && daysUntilDeadline <= 60;

          // Action Required: deadline <= 14 days AND status not submitted
          const actionRequired =
            daysUntilDeadline <= 14 &&
            !['SUBMITTED_TO_DONOR', 'SUBMITTED_TO_HQ'].includes(d.reportStatus || '');

          // Priority sorting: 0 (overdue) -> 1 (urgent) -> 2 (upcoming) -> 3 (future)
          let priority = 3;
          if (isOverdue) priority = 0;
          else if (isUrgent) priority = 1;
          else if (isUpcoming) priority = 2;

          return {
            id: d.id,
            projectId: d.projectId,
            projectCode: d.projectCode || 'N/A',
            projectName: d.projectName || 'Unknown Project',
            reportType: d.reportType || 'Report',
            reportStatus: d.reportStatus || 'NOT_STARTED', // Include ALL statuses
            reportDeadline: d.reportDeadline
              ? new Date(d.reportDeadline).toISOString().split('T')[0]
              : '',
            daysUntilDeadline,
            isOverdue,
            isUrgent,
            isUpcoming,
            actionRequired,
            priority,
          };
        });

        // Sort by priority (ascending), then by daysUntilDeadline (ascending)
        transformed.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.daysUntilDeadline - b.daysUntilDeadline;
        });

        // Return ALL deadlines + limited set for widget display
        return {
          total: transformed.length,
          deadlines: transformed, // ALL deadlines within 90 days (all statuses)
          deadlinesWidget: transformed.slice(0, limit), // Top N for widget display
        };
      } catch (error) {
        console.error('Error fetching upcoming reporting deadlines:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch reporting deadlines',
        });
      }
    }),
});
