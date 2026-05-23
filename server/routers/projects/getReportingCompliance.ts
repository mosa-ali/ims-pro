import { eq, and, lt, gte, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { scopedProcedure } from '../../_core/trpc';
import { getDb } from '../../db';
import { reportingSchedules, projects } from 'drizzle/schema';

export const getReportingComplianceProcedure = scopedProcedure
  .input(z.object({
    organizationId: z.number().optional(),
    operatingUnitId: z.number().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const { organizationId, operatingUnitId } = ctx.scope;
    const db = await getDb();
    
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not available',
      });
    }

    try {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split('T')[0];

      // Build where clause
      const whereConditions = [
        eq(reportingSchedules.organizationId, organizationId),
        eq(reportingSchedules.isDeleted, 0),
      ];

      if (operatingUnitId) {
        whereConditions.push(eq(reportingSchedules.operatingUnitId, operatingUnitId));
      }

      // Get all reporting schedules
      const allSchedules = await db
        .select({
          id: reportingSchedules.id,
          projectId: reportingSchedules.projectId,
          projectName: projects.title,
          reportType: reportingSchedules.reportType,
          reportStatus: reportingSchedules.reportStatus,
          reportDeadline: reportingSchedules.reportDeadline,
          periodFrom: reportingSchedules.periodFrom,
          periodTo: reportingSchedules.periodTo,
        })
        .from(reportingSchedules)
        .leftJoin(projects, eq(reportingSchedules.projectId, projects.id))
        .where(and(...whereConditions));

      // Calculate compliance metrics
      const total = allSchedules.length;
      
      const submitted = allSchedules.filter(
        (s) => s.reportStatus === 'SUBMITTED_TO_DONOR' || s.reportStatus === 'SUBMITTED_TO_HQ'
      ).length;

      const underReview = allSchedules.filter(
        (s) => s.reportStatus === 'UNDER_REVIEW'
      ).length;

      const pending = allSchedules.filter(
        (s) => s.reportStatus === 'PLANNED' || s.reportStatus === 'UNDER_PREPARATION'
      ).length;

      // Overdue = deadline passed AND not submitted/under review
      const overdue = allSchedules.filter((s) => {
        const deadline = new Date(s.reportDeadline);
        deadline.setHours(0, 0, 0, 0);
        return (
          deadline < today &&
          s.reportStatus !== 'SUBMITTED_TO_DONOR' &&
          s.reportStatus !== 'SUBMITTED_TO_HQ' &&
          s.reportStatus !== 'UNDER_REVIEW'
        );
      }).length;

      // Calculate compliance rate
      const compliant = submitted + underReview;
      const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 0;

      // Get overdue reports details
      const overdueReports = allSchedules
        .filter((s) => {
          const deadline = new Date(s.reportDeadline);
          deadline.setHours(0, 0, 0, 0);
          return (
            deadline < today &&
            s.reportStatus !== 'SUBMITTED_TO_DONOR' &&
            s.reportStatus !== 'SUBMITTED_TO_HQ' &&
            s.reportStatus !== 'UNDER_REVIEW'
          );
        })
        .slice(0, 5); // Top 5 overdue

      return {
        complianceRate,
        total,
        submitted,
        underReview,
        pending,
        overdue,
        overdueReports: overdueReports.map((s) => ({
          id: s.id,
          projectName: s.projectName || 'Unknown Project',
          reportType: s.reportType,
          reportStatus: s.reportStatus,
          reportDeadline: s.reportDeadline,
          daysOverdue: Math.floor(
            (today.getTime() - new Date(s.reportDeadline).getTime()) / (1000 * 60 * 60 * 24)
          ),
        })),
      };
    } catch (error) {
      console.error('Error calculating reporting compliance:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate reporting compliance',
      });
    }
  });
