import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { scopedProcedure } from '../../_core/trpc';
import { getDb } from '../../db';
import { reportingSchedules, projects, grants } from 'drizzle/schema';

export const getUpcomingReportingDeadlinesProcedure = scopedProcedure
  .input(z.object({
    organizationId: z.number().optional(),
    operatingUnitId: z.number().optional(),
    daysAhead: z.number().optional().default(90), // Look ahead 90 days
  }))
  .query(async ({ ctx, input }) => {
    const { organizationId, operatingUnitId } = ctx.scope;
    const { daysAhead } = input;
    const db = await getDb();
    
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not available',
      });
    }

    try {
      // Get today's date and future date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];

      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateString = futureDate.toISOString().split('T')[0];

      // Build where clause - get deadlines from past 30 days to future 90 days
        const pastDate = new Date(today);
        pastDate.setDate(pastDate.getDate() - 30); // Look back 30 days for overdue
        const pastDateString = pastDate.toISOString().split('T')[0];

        const whereConditions = [
          eq(reportingSchedules.organizationId, organizationId),
          eq(reportingSchedules.isDeleted, 0),
          gte(reportingSchedules.reportDeadline, pastDateString), // Deadline >= 30 days ago
          lte(reportingSchedules.reportDeadline, futureDateString), // Deadline <= 90 days from now
        ];

      // Get upcoming/overdue reporting deadlines
      const deadlines = await db
        .select({
          id: reportingSchedules.id,
          projectId: reportingSchedules.projectId,
          projectName: projects.title,
          reportType: reportingSchedules.reportType,
          reportStatus: reportingSchedules.reportStatus,
          reportDeadline: reportingSchedules.reportDeadline,
          periodFrom: reportingSchedules.periodFrom,
          periodTo: reportingSchedules.periodTo,
          notes: reportingSchedules.notes,
        })
        .from(reportingSchedules)
        .leftJoin(projects, eq(reportingSchedules.projectId, projects.id))
        .where(and(...whereConditions))
        .orderBy(asc(reportingSchedules.reportDeadline));

      // Transform and categorize
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const transformed = deadlines.map((d) => {
        const deadline = new Date(d.reportDeadline);
        deadline.setHours(0, 0, 0, 0);
        
        const daysUntilDeadline = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const isOverdue = daysUntilDeadline < 0;
        const isUrgent = daysUntilDeadline >= 0 && daysUntilDeadline <= 7;
        const isUpcoming = daysUntilDeadline > 7 && daysUntilDeadline <= 30;

        return {
          id: d.id,
          projectName: d.projectName || 'Unknown Project',
          reportType: d.reportType,
          reportStatus: d.reportStatus,
          reportDeadline: d.reportDeadline,
          periodFrom: d.periodFrom,
          periodTo: d.periodTo,
          daysUntilDeadline,
          isOverdue,
          isUrgent,
          isUpcoming,
          statusLabel: isOverdue
            ? `${Math.abs(daysUntilDeadline)}d overdue`
            : isUrgent
            ? `${daysUntilDeadline}d left`
            : `${daysUntilDeadline}d left`,
        };
      });

      // Separate overdue and upcoming
      const overdue = transformed.filter((d) => d.isOverdue);
      const urgent = transformed.filter((d) => d.isUrgent && !d.isOverdue);
      const upcoming = transformed.filter((d) => d.isUpcoming && !d.isUrgent);

      return {
        total: transformed.length,
        overdue: overdue.length,
        urgent: urgent.length,
        upcoming: upcoming.length,
        all: transformed,
        overdueSummary: overdue.slice(0, 5),
        urgentSummary: urgent.slice(0, 5),
        upcomingSummary: upcoming.slice(0, 5),
      };
    } catch (error) {
      console.error('Error fetching upcoming reporting deadlines:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch reporting deadlines',
      });
    }
  });
