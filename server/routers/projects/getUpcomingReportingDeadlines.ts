import { eq, and, lte, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { scopedProcedure } from '../../_core/trpc';
import { getDb } from '../../db';
import { reportingSchedules, projects } from 'drizzle/schema';

// ─── Compact deadline item for executive dashboard ────────────────────────
// Includes ALL report statuses: NOT_STARTED, PLANNED, UNDER_PREPARATION, 
// UNDER_REVIEW, SUBMITTED_TO_HQ, SUBMITTED_TO_DONOR

interface CompactDeadlineItem {
  id: number;
  projectId: number | null;
  projectCode: string;
  projectName: string;
  reportType: string;
  reportStatus: string; // ALL statuses included
  reportDeadline: string;
  daysUntilDeadline: number;
  isOverdue: boolean;
  isUrgent: boolean;
  isUpcoming: boolean;
  actionRequired: boolean; // True if deadline <= 14 days AND not submitted
  priority: number;
}

interface CompactUpcomingDeadlinesData {
  total: number; // Total deadlines within 90 days (ALL statuses)
  deadlines: CompactDeadlineItem[]; // ALL deadlines (for full page)
  deadlinesWidget?: CompactDeadlineItem[]; // Top 5 for widget (optional)
}

export const getUpcomingReportingDeadlinesProcedure = scopedProcedure
  .input(z.object({
    organizationId: z.number().optional(),
    operatingUnitId: z.number().optional(),
    daysAhead: z.number().optional().default(90), // Look ahead 90 days
    limit: z.number().optional().default(5), // Widget limit, can be overridden for full list
  }))
  .query(async ({ ctx, input }): Promise<CompactUpcomingDeadlinesData> => {
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
      // Get today's date and future date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];

      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateString = futureDate.toISOString().split('T')[0];

      // Build where clause - includes ALL deadlines up to daysAhead (including overdue)
      // NO status filter - includes all statuses:
      // - NOT_STARTED
      // - PLANNED
      // - UNDER_PREPARATION
      // - UNDER_REVIEW
      // - SUBMITTED_TO_HQ
      // - SUBMITTED_TO_DONOR
      const whereConditions = [
        eq(reportingSchedules.organizationId, organizationId),
        eq(reportingSchedules.isDeleted, 0),
        lte(reportingSchedules.reportDeadline, futureDateString), // Deadline <= future date
      ];

      if (operatingUnitId) {
        whereConditions.push(eq(reportingSchedules.operatingUnitId, operatingUnitId));
      }

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
        .where(and(...whereConditions))
        .orderBy(desc(reportingSchedules.reportDeadline));

      // Transform and categorize
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const transformed = (deadlines || []).map((d): CompactDeadlineItem => {
        const deadline = new Date(d.reportDeadline);
        deadline.setHours(0, 0, 0, 0);
        
        const daysUntilDeadline = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const isOverdue = daysUntilDeadline < 0;
        const isUrgent = daysUntilDeadline >= 0 && daysUntilDeadline <= 15;
        const isUpcoming = daysUntilDeadline > 7 && daysUntilDeadline <= 60;

        // Action Required: deadline <= 14 days AND status not submitted
        // Checks if report is NOT in a submitted state
        const isSubmitted = ['SUBMITTED_TO_DONOR', 'SUBMITTED_TO_HQ'].includes(
          d.reportStatus || ''
        );
        const actionRequired = daysUntilDeadline <= 14 && !isSubmitted;

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
        total: transformed.length, // Total includes ALL statuses
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
  });
