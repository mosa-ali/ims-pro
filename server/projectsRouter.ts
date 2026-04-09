// ============================================================================
// PROJECTS ROUTER
// tRPC procedures for project management operations
// ============================================================================

import { z } from "zod";
import { protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { projects, grants, reportingSchedules as reportingSchedulesTable, expenses, organizations } from "../drizzle/schema";
import { eq, and, desc, or, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ensureISOString, formatDateForInput } from "@shared/dateUtils";

// Currency conversion rates (European Commission InforEuro rates)
const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.09,
  GBP: 1.27,
  CHF: 1.13,
  SAR: 0.267, // Saudi Riyal to USD
  YER: 0.004, // Yemeni Rial to USD
};

function convertToUSD(amount: number, currency: string): number {
  return amount * (CURRENCY_RATES[currency] || 1);
}

// Validation schemas - must match database enum: ["planning", "active", "on_hold", "completed", "cancelled"]
const projectStatusEnum = z.enum(["planning", "active", "on_hold", "completed", "cancelled"]);
const currencyEnum = z.enum(["USD", "EUR", "GBP", "CHF", "SAR", "YER"]);

const createProjectSchema = z.object({
  projectCode: z.string().min(1, "Project code is required"),
  title: z.string().min(1, "Project title is required"),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  status: projectStatusEnum,
  // Accept string dates (YYYY-MM-DD format from form inputs)
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  totalBudget: z.number().positive("Budget must be positive"),
  spent: z.number().min(0, "Spent amount cannot be negative").default(0),
  currency: currencyEnum,
  sectors: z.array(z.string()).min(1, "At least one sector is required"),
  donor: z.string().optional(),
  implementingPartner: z.string().optional(),
  location: z.string().optional(),
  locationAr: z.string().optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.number(),
});

export const projectsRouter = router({
  /**
   * List all projects with optional filters
   */
  list: scopedProcedure
    .input(
      z.object({
        status: z.enum(["all", "planning", "active", "on_hold", "completed", "cancelled"]).optional(),
        searchTerm: z.string().optional(),
        limit: z.number().min(1).max(1000).default(100), // Default to 100 projects
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { status, searchTerm, limit, offset } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      
      console.log('[projects.list] Input received:', {
        organizationId,
        operatingUnitId,
        status,
        limit,
        offset
      });

      let conditions = [
        eq(projects.organizationId, organizationId),
        eq(projects.operatingUnitId, operatingUnitId),
        eq(projects.isDeleted, false),
      ];

      // Add status filter
      if (status && status !== "all") {
        conditions.push(eq(projects.status, status));
      }

      // Add search filter
      if (searchTerm && searchTerm.trim()) {
        conditions.push(
          or(
            like(projects.title, `%${searchTerm}%`),
            like(projects.projectCode, `%${searchTerm}%`)
          )!
        );
      }

      const projectsList = await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.createdAt))
        .limit(limit)
        .offset(offset);
      
      console.log('[projects.list] Raw projectsList from DB:', projectsList.length, 'projects');
      if (projectsList.length > 0) {
        const firstProject = projectsList[0];
        console.log('[projects.list] First project sample:', {
          id: firstProject.id,
          code: firstProject.projectCode,
          startDate: firstProject.startDate,
          startDateType: typeof firstProject.startDate,
          startDateConstructor: firstProject.startDate?.constructor?.name,
          hasToISOString: firstProject.startDate && typeof firstProject.startDate === 'object' && 'toISOString' in firstProject.startDate,
          toISOStringType: firstProject.startDate && typeof firstProject.startDate === 'object' && typeof (firstProject.startDate as any).toISOString
        });
      }

      // Use projects.spent (synced from budget_items.actualSpent) for each project
      const projectsWithCalculations = await Promise.all(
        projectsList.map(async (project: any) => {
          // Use projects.spent (source of truth from Financial Overview)
          const spent = Number(project.spent || 0);
          const totalBudget = Number(project.totalBudget);
          const balance = totalBudget - spent;
          const budgetUtilization = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
          
          const sectors = typeof project.sectors === 'string' 
            ? JSON.parse(project.sectors) 
            : project.sectors;
          
          // Destructure to remove Date fields, then add back as strings
          const { startDate, endDate, createdAt, updatedAt, deletedAt, ...restProject } = project;
          
          return {
            ...restProject,
            status: project.status, // Use database status directly
            sectors,
            spent, // Auto-calculated from expenses
            balance,
            budgetUtilization,
            // All date fields as strings using safe serialization
            startDate: startDate ? ensureISOString(startDate) : null,
            endDate: endDate ? ensureISOString(endDate) : null,
            createdAt: createdAt ? ensureISOString(createdAt) : null,
            updatedAt: updatedAt ? ensureISOString(updatedAt) : null,
            deletedAt: deletedAt ? ensureISOString(deletedAt) : null,
          };
        })
      );
      
      return projectsWithCalculations;
    }),

  /**
   * Get project by ID
   */
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      const projectResult = await db
        .select({
          project: projects,
          organizationName: organizations.name,
        })
        .from(projects)
        .leftJoin(organizations, eq(projects.organizationId, organizations.id))
        .where(and(eq(projects.id, input.id), eq(projects.isDeleted, false)))
        .limit(1);
      
      const project = projectResult.map(r => ({
        ...r.project,
        organizationName: r.organizationName || 'Organization',
      }));

      if (!project[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Use projects.spent (synced from budget_items.actualSpent)
      const spent = Number(project[0].spent || 0);
      const totalBudget = Number(project[0].totalBudget);
      const balance = totalBudget - spent;
      const budgetUtilization = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;
      
      // Parse sectors from JSON string to array
      const sectors = typeof project[0].sectors === 'string' 
        ? JSON.parse(project[0].sectors) 
        : project[0].sectors;

      // Map database status to UI status
      const dbToUiStatusMap: Record<string, string> = {
        'active': 'ongoing',
        'planning': 'planned',
        'completed': 'completed',
        'on_hold': 'not_started',
        'cancelled': 'completed',
      };

      const p = project[0];
      // Destructure to remove Date fields, then add back as strings
      const { startDate, endDate, createdAt, updatedAt, deletedAt, ...restProject } = p;
      
      return {
        ...restProject,
        status: dbToUiStatusMap[p.status] || p.status,
        sectors,
        spent, // Auto-calculated from expenses
        balance,
        budgetUtilization,
        // All date fields as strings using safe serialization
        startDate: startDate ? ensureISOString(startDate) : null,
        endDate: endDate ? ensureISOString(endDate) : null,
        createdAt: createdAt ? ensureISOString(createdAt) : null,
        updatedAt: updatedAt ? ensureISOString(updatedAt) : null,
        deletedAt: deletedAt ? ensureISOString(deletedAt) : null,
      };
    }),

  /**
   * Get dashboard KPIs
   */
  getDashboardKPIs: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get only necessary fields for aggregation (much faster than SELECT *)
      const ongoingProjects = await db
        .select({
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          currency: projects.currency,
          physicalProgressPercentage: projects.physicalProgressPercentage,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, organizationId),
            eq(projects.operatingUnitId, operatingUnitId),
            eq(projects.status, "active"),
            eq(projects.isDeleted, false)
          )
        );

      // Calculate aggregated metrics (client-side for currency conversion)
      let totalBudgetUSD = 0;
      let actualSpentUSD = 0;
      let totalPhysicalProgress = 0;
      let projectsOnTrack = 0;
      let projectsAtRisk = 0;

      ongoingProjects.forEach((project) => {
        const budgetUSD = convertToUSD(Number(project.totalBudget), project.currency);
        const spentUSD = convertToUSD(Number(project.spent), project.currency);
        
        totalBudgetUSD += budgetUSD;
        actualSpentUSD += spentUSD;
        totalPhysicalProgress += Number(project.physicalProgressPercentage);
        
        // Calculate project health: On Track if physical progress >= budget utilization
        const budgetUtilization = Number(project.totalBudget) > 0 
          ? (Number(project.spent) / Number(project.totalBudget)) * 100 
          : 0;
        const physicalProgress = Number(project.physicalProgressPercentage);
        
        if (physicalProgress >= budgetUtilization) {
          projectsOnTrack++;
        } else {
          projectsAtRisk++;
        }
      });

      const totalProjects = ongoingProjects.length;
      const balanceUSD = totalBudgetUSD - actualSpentUSD;
      const avgCompletionRate = totalProjects > 0 ? totalPhysicalProgress / totalProjects : 0;

      // Get compliance metrics from reporting schedules
      const reportingSchedules = await db
        .select({
          reportStatus: reportingSchedulesTable.reportStatus,
        })
        .from(reportingSchedulesTable)
        .where(
          and(
            eq(reportingSchedulesTable.organizationId, organizationId),
            eq(reportingSchedulesTable.operatingUnitId, operatingUnitId),
            eq(reportingSchedulesTable.isDeleted, false)
          )
        );

      // Calculate compliance rate
      const totalReports = reportingSchedules.length;
      const submittedOnTime = reportingSchedules.filter(schedule => {
        const isSubmitted = schedule.reportStatus === 'SUBMITTED_TO_DONOR';
        // For now, consider all submitted reports as on-time
        // In future, compare submission date with deadline
        return isSubmitted;
      }).length;
      
      const reportingComplianceRate = totalReports > 0 
        ? (submittedOnTime / totalReports) * 100 
        : 0;

      // Count pending approvals (reports under review or submitted to HQ)
      const pendingApprovals = reportingSchedules.filter(schedule => 
        schedule.reportStatus === 'UNDER_REVIEW' || 
        schedule.reportStatus === 'SUBMITTED_TO_HQ'
      ).length;

      return {
        totalProjects,
        totalBudgetUSD,
        actualSpentUSD,
        balanceUSD,
        avgCompletionRate,
        projectsOnTrack,
        projectsAtRisk,
        reportingComplianceRate,
        pendingApprovals,
      };
    }),

  /**
   * Create new project
   */
  /**
   * Create new project
   */
  create: scopedProcedure
    .input(createProjectSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[projects.create] === MUTATION START ===');
        console.log('[projects.create] Input received:', JSON.stringify(input, null, 2));
        
        // Guard validation: ensure date fields are strings (not Date objects)
        // This prevents superjson serialization errors
        const dateFieldsToValidate = ['startDate', 'endDate'] as const;
        for (const field of dateFieldsToValidate) {
          const value = (input as any)[field];
          if (value !== undefined && value !== null) {
            if (typeof value !== 'string') {
              console.error(`[projects.create] GUARD VALIDATION FAILED: ${field} is not a string`, {
                typeof: typeof value,
                instanceofDate: value instanceof Date,
                value: value,
              });
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Invalid ${field}: expected string in YYYY-MM-DD format, got ${typeof value}`,
              });
            }
          }
        }
        
        const db = await getDb();
        const { organizationId, operatingUnitId } = ctx.scope;
        const projectData = input;

        // Check for duplicate project code
        const existing = await db
          .select()
          .from(projects)
          .where(eq(projects.projectCode, projectData.projectCode))
          .limit(1);

        if (existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Project code already exists",
          });
        }

        // Map input fields to database columns
        // The database has both 'code' and 'projectCode', and 'title' and 'titleEn'
        // The status enum in DB is: planning, active, on_hold, completed, cancelled
        // The UI uses: ongoing, planned, completed, not_started
        const statusMap: Record<string, string> = {
          'ongoing': 'active',
          'planned': 'planning',
          'completed': 'completed',
          'not_started': 'planning',
        };
        
        const [newProject] = await db.insert(projects).values({
          organizationId,
          operatingUnitId: operatingUnitId || null,
          projectCode: projectData.projectCode,
          title: projectData.title,
          titleEn: projectData.title,
          titleAr: projectData.titleAr || null,
          description: projectData.description || null,
          descriptionAr: projectData.descriptionAr || null,
          status: statusMap[projectData.status] as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
          startDate: new Date(projectData.startDate),
          endDate: new Date(projectData.endDate),
          totalBudget: String(projectData.totalBudget),
          spent: String(projectData.spent || 0),
          currency: projectData.currency as 'USD' | 'EUR' | 'GBP' | 'CHF',
          sectors: projectData.sectors,
          donor: projectData.donor || null,
          implementingPartner: projectData.implementingPartner || null,
          location: projectData.location || null,
          locationAr: projectData.locationAr || null,
          isDeleted: false,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });

        const projectId = Number(newProject.insertId);

        // Automatically create a corresponding grant for this project
        try {
          await db.insert(grants).values({
            projectId,
            organizationId,
            operatingUnitId: operatingUnitId || null,
            grantNumber: projectData.projectCode,
            grantName: projectData.title,
            grantNameAr: projectData.titleAr || null,
            donorName: projectData.donor || 'Unknown Donor',
            donorReference: `${projectData.projectCode}-REF`,
            grantAmount: projectData.totalBudget,
            currency: projectData.currency,
            startDate: new Date(projectData.startDate),
            endDate: new Date(projectData.endDate),
            status: projectData.status === 'ongoing' ? 'active' : projectData.status === 'planned' ? 'pending' : 'completed',
            reportingStatus: 'on_track',
            description: projectData.description || null,
            descriptionAr: projectData.descriptionAr || null,
            sector: projectData.sectors?.[0] || null,
            responsible: 'Project Manager',
            reportingFrequency: 'quarterly',
            coFunding: false,
            isDeleted: false,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });
        } catch (error) {
          console.error('Failed to auto-create grant for project:', error);
          // Don't fail the project creation if grant creation fails
        }

        // Automatically create document folders for this project
        try {
          const { createProjectFolders } = await import('./documentFolders');
          await createProjectFolders(
            projectData.projectCode,
            projectData.sectors || [],
            organizationId,
            operatingUnitId || organizationId,
            ctx.user.id
          );
          console.log(`[projects.create] Successfully created document folders for project ${projectData.projectCode}`);
        } catch (error) {
          console.error('[projects.create] Failed to create document folders:', error);
          // Don't fail the project creation if folder creation fails
        }

        // Log audit event
        const { createAuditLog } = await import('./db');
        await createAuditLog({
          userId: ctx.user.id,
          organizationId,
          operatingUnitId: operatingUnitId || null,
          action: 'project_created',
          entityType: 'project',
          entityId: projectId,
          details: `Created project: ${projectData.title} (${projectData.projectCode})`,
        });

        console.log('[projects.create] === MUTATION SUCCESS ===');
        console.log('[projects.create] Returning:', { success: true, projectId });
        
        const result = { success: true, projectId };
        console.log('[projects.create] Result object type:', typeof result);
        console.log('[projects.create] Result constructor:', result.constructor?.name);
        
        return result;
      } catch (error: any) {
        console.error('[projects.create] === MUTATION ERROR ===');
        console.error('[projects.create] Error name:', error?.name);
        console.error('[projects.create] Error message:', error?.message);
        console.error('[projects.create] Error stack:', error?.stack);
        console.error('[projects.create] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // Re-throw to let tRPC handle it
        throw error;
      }
    }),

  /**
   * Update existing project
   */
  update: scopedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ input, ctx }) => {
      console.log('\n\n=== PROJECTS UPDATE MUTATION CALLED ===');
      console.log('[projects.update] Input received:', JSON.stringify(input, null, 2));
      console.log('[projects.update] Status field:', input.status);
      
      // Guard validation: ensure date fields are strings (not Date objects)
      // This prevents superjson serialization errors
      const dateFieldsToValidate = ['startDate', 'endDate'] as const;
      for (const field of dateFieldsToValidate) {
        const value = (input as any)[field];
        if (value !== undefined && value !== null) {
          if (typeof value !== 'string') {
            console.error(`[projects.update] GUARD VALIDATION FAILED: ${field} is not a string`, {
              typeof: typeof value,
              instanceofDate: value instanceof Date,
              value: value,
            });
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Invalid ${field}: expected string in YYYY-MM-DD format, got ${typeof value}`,
            });
          }
        }
      }
      
      const db = await getDb();
      const { id, ...updates } = input;

      // Check if project exists
      const existing = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.isDeleted, false)))
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // If projectCode is being updated, check for duplicates
      if (updates.projectCode && updates.projectCode !== existing[0].projectCode) {
        const duplicate = await db
          .select()
          .from(projects)
          .where(eq(projects.projectCode, updates.projectCode))
          .limit(1);

        if (duplicate.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Project code already exists",
          });
        }
      }

      // Prepare updates for database - dates are already strings from the schema
      const dbUpdates: any = { ...updates };
      
      // Convert date strings to Date objects for Drizzle timestamp columns
      if (dbUpdates.startDate && typeof dbUpdates.startDate === 'string') {
        dbUpdates.startDate = new Date(dbUpdates.startDate);
      }
      if (dbUpdates.endDate && typeof dbUpdates.endDate === 'string') {
        dbUpdates.endDate = new Date(dbUpdates.endDate);
      }
      
      // Ensure sectors is properly serialized as JSON for the database
      if (dbUpdates.sectors && Array.isArray(dbUpdates.sectors)) {
        // Keep as array - drizzle will handle JSON serialization
        dbUpdates.sectors = dbUpdates.sectors;
      }
      
      // Map UI status to database status if status is being updated
      if (dbUpdates.status) {
        console.log('[projects.update] Status BEFORE mapping:', dbUpdates.status);
        const statusMap: Record<string, string> = {
          'ongoing': 'active',
          'planned': 'planning',
          'completed': 'completed',
          'not_started': 'planning',
        };
        dbUpdates.status = statusMap[dbUpdates.status] || dbUpdates.status;
        console.log('[projects.update] Status AFTER mapping:', dbUpdates.status);
      }
      
      console.log('[projects.update] Final dbUpdates being sent to database:', JSON.stringify(dbUpdates, null, 2));

      try {
        await db
          .update(projects)
          .set({
            ...dbUpdates,
            updatedBy: ctx.user.id,
          })
          .where(eq(projects.id, id));
      } catch (error: any) {
        console.error('[projects.update] === UPDATE ERROR ===');
        console.error('[projects.update] Error name:', error.name);
        console.error('[projects.update] Error message:', error.message);
        console.error('[projects.update] Error code:', error.code);
        console.error('[projects.update] SQL state:', error.sqlState);
        console.error('[projects.update] SQL message:', error.sqlMessage);
        console.error('[projects.update] Full error:', JSON.stringify(error, null, 2));
        console.error('[projects.update] Stack trace:', error.stack);
        throw error;
      }

      // Log audit event
      const { createAuditLog } = await import('./db');
      const statusChanged = updates.status && updates.status !== existing[0].status;
      await createAuditLog({
        userId: ctx.user.id,
        organizationId: existing[0].organizationId,
        operatingUnitId: existing[0].operatingUnitId,
        action: statusChanged ? 'project_status_changed' : 'project_updated',
        entityType: 'project',
        entityId: id,
        details: statusChanged 
          ? `Changed project status from ${existing[0].status} to ${updates.status}: ${existing[0].title}`
          : `Updated project: ${existing[0].title}`,
      });

      return { success: true };
    }),

  /**
   * Delete project (soft delete)
   */
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id } = input;

      // Check if project exists
      const existing = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.isDeleted, false)))
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Soft delete
      await db
        .update(projects)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(projects.id, id));

      return { success: true };
    }),

  /**
   * Get recent project activities for dashboard
   * Fetches audit logs related to projects for the given organization and operating unit
   */
  getRecentActivities: scopedProcedure
    .input(z.object({
      limit: z.number().min(1).max(30).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { organizationId, operatingUnitId } = ctx.scope;
      const { limit } = input;

      // Import auditLogs and users from schema
      const { auditLogs, users: usersTable } = await import('../drizzle/schema');

      // Fetch recent audit logs for project-related activities
      const activities = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          details: auditLogs.details,
          timestamp: auditLogs.createdAt,
          userName: usersTable.name,
        })
        .from(auditLogs)
        .leftJoin(usersTable, eq(auditLogs.userId, usersTable.id))
        .where(
          and(
            eq(auditLogs.organizationId, organizationId),
            eq(auditLogs.operatingUnitId, operatingUnitId),
            eq(auditLogs.entityType, 'project')
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        details: activity.details || '',
        timestamp: activity.timestamp ? ensureISOString(activity.timestamp) : null,
        userName: activity.userName || 'System',
      }));
    }),

  /**
   * Generate PDF report for a project
   * Returns a document-based PDF with selectable text
   */
  generatePDF: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        language: z.enum(['en', 'ar']).default('en'),
        // Report data passed from frontend
        reportData: z.object({
          project: z.object({
            name: z.string(),
            code: z.string(),
            status: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            location: z.string().optional(),
            sectors: z.array(z.string()),
            currency: z.string(),
            daysRemaining: z.number(),
          }),
          activities: z.object({
            total: z.number(),
            completed: z.number(),
            completionRate: z.number(),
            details: z.array(z.object({
              activityTitle: z.string(),
              target: z.number(),
              achieved: z.number(),
              progress: z.number(),
              status: z.string(),
            })),
          }),
          indicators: z.object({
            total: z.number(),
            achieved: z.number(),
            averageAchievement: z.number(),
            details: z.array(z.object({
              name: z.string(),
              baseline: z.number(),
              target: z.number(),
              actual: z.number(),
              achievementRate: z.number(),
            })),
          }),
          financial: z.object({
            totalBudget: z.number(),
            actualSpent: z.number(),
            remaining: z.number(),
            burnRate: z.number(),
          }),
          riskCalculation: z.object({
            level: z.string(),
            score: z.number(),
            summary: z.string(),
            factors: z.array(z.object({
              name: z.string(),
              value: z.number(),
              status: z.string(),
              description: z.string(),
            })),
          }),
          narratives: z.object({
            progressSummary: z.string().optional(),
            challenges: z.string().optional(),
            mitigationActions: z.string().optional(),
            keyAchievements: z.string().optional(),
            nextSteps: z.string().optional(),
          }),
          organizationName: z.string(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { generateProjectReportPDF } = await import('./pdfGenerator');
      const { storagePut } = await import('./storage');
      const { getDb } = await import('./db');
      const { documents } = await import('../drizzle/schema');
      const { nanoid } = await import('nanoid');
      
      try {
        // Generate PDF
        const pdfBuffer = await generateProjectReportPDF({
          ...input.reportData,
          language: input.language,
        });
        
        // Generate filename
        const filename = `${input.reportData.project.projectCode}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Upload to S3
        const fileKey = `projects/${input.reportData.project.projectCode}/reports/${filename}`;
        const { url: s3Url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
        
        // Sync to Central Documents
        const db = await getDb();
        if (db) {
          const documentId = `DOC-${nanoid(12)}`;
          
          await db.insert(documents).values({
            documentId,
            projectId: input.reportData.project.projectCode,
            folderCode: '11_Project_Report',
            fileName: filename,
            filePath: s3Url,
            fileType: 'pdf',
            fileSize: pdfBuffer.length,
            uploadedBy: ctx.user.id,
            uploadedAt: new Date(),
            syncSource: 'project_report',
            syncStatus: 'synced',
            version: 1,
            organizationId: ctx.organizationId,
            operatingUnitId: ctx.operatingUnitId,
          });
        }
        
        // Convert buffer to base64 for transmission
        const base64PDF = pdfBuffer.toString('base64');
        
        return {
          success: true,
          pdf: base64PDF,
          filename,
          s3Url, // Return S3 URL for reference
          syncedToCentralDocuments: true,
        };
      } catch (error) {
        console.error('PDF generation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate PDF report',
        });
      }
    }),
});
