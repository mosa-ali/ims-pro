// ============================================================================
// PROJECTS ROUTER
// tRPC procedures for project management operations
// ============================================================================

import { z } from "zod";
import { protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { projects, grants, budgets, reportingSchedules as reportingSchedulesTable, expenses, organizations } from "../drizzle/schema";
import { eq, and, desc, or, like, sql, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ensureISOString, formatDateForInput } from "@shared/dateUtils";
import { getBudgetTrendProcedure } from './routers/projects/getBudgetTrend';
import { getReportingComplianceProcedure } from './routers/projects/getReportingCompliance';
import { getUpcomingReportingDeadlinesProcedure } from './routers/projects/getUpcomingReportingDeadlines';
import { autoProgramsReportRouter } from './routers/autoProgramsReportRouter';

// ─── Currency Engine ──────────────────────────────────────────────────────────
// Import from the centralized currency engine — no more hardcoded rates.
// convertCurrency() uses the in-memory InforEuro cache (EUR-based cross-rates).
// CURRENCY_REGISTRY is the single source of truth for all currency metadata.
import { convertCurrency } from '../shared/currency/currencyConversion';
import {
  CURRENCY_REGISTRY,
  CURRENCY_CODE_TUPLE,
  type CurrencyCode,
} from '../shared/currency/currencies';

/**
 * Convert any amount to USD using the live InforEuro cache.
 * Falls back to the original amount if rates are unavailable (fail-safe).
 *
 * Replaces the old hardcoded CURRENCY_RATES map.
 */
function convertToUSD(amount: number, currency: string): number {
  if (!currency || currency.toUpperCase() === 'USD') return amount;
  const result = convertCurrency(amount, currency, 'USD');
  if ('error' in result) {
    // Graceful degradation: if cache is empty (cold start), treat as 1:1
    return amount;
  }
  return result.amount;
}

// Validation schemas - must match database enum: ["planning", "active", "on_hold", "completed", "cancelled"]
const projectStatusEnum = z.enum(["planning", "active", "on_hold", "completed", "cancelled"]);

// Use the Currency Engine's CURRENCY_CODE_TUPLE as the source of truth for the zod enum.
// This replaces the inline GLOBAL_CURRENCIES array that was previously defined here.
const currencyEnum = z.enum(CURRENCY_CODE_TUPLE);

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
  getBudgetTrend: getBudgetTrendProcedure,
  getReportingCompliance: getReportingComplianceProcedure,
  generateAutoReport: autoProgramsReportRouter,

  /**
   * Get all supported currencies
   * Returns the full CURRENCY_REGISTRY from the Currency Engine.
   * Replaces the old inline GLOBAL_CURRENCIES array.
   */
  getCurrencies: protectedProcedure
    .query(async () => {
      return CURRENCY_REGISTRY.map((c) => ({
        code: c.code,
        name: c.name,
        nameAr: c.nameAr,
        symbol: c.symbol,
        position: c.position,
        decimals: c.decimals,
        label: `${c.code} — ${c.name}`,
      }));
    }),

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
        eq(projects.isDeleted, 0),
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
        .leftJoin(organizations, eq(projects.organizationId, ctx.scope.organizationId))
        .where(and(eq(projects.id, input.id), eq(projects.isDeleted, 0)))
        .limit(1);
      
      const project = projectResult.map(r => ({
        ...r.project,
        organizationName: r.organizationName || '',
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
          organizationId: organizationId,
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
          currency: projectData.currency,
          sectors: projectData.sectors,
          donor: projectData.donor || null,
          implementingPartner: projectData.implementingPartner || null,
          location: projectData.location || null,
          locationAr: projectData.locationAr || null,
          isDeleted: 0,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });

        const projectId = Number(newProject.insertId);

        // Automatically create a corresponding grant for this project
        try {
          await db.insert(grants).values({
            projectId: projectId,
            organizationId: ctx.scope.organizationId,
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
            status: statusMap[projectData.status] as 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled',
            reportingStatus: 'on_track',
            description: projectData.description || null,
            descriptionAr: projectData.descriptionAr || null,
            sector: projectData.sectors?.[0] || null,
            responsible: 'Project Manager',
            reportingFrequency: 'quarterly',
            coFunding: false,
            isDeleted: 0,
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
        .where(and(eq(projects.id, id), eq(projects.isDeleted, 0)))
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
        .where(and(eq(projects.id, id), eq(projects.isDeleted, 0)))
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
          isDeleted: 1,
          deletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
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
          location: projects.location || '',
        });
        
        // Generate filename
        const filename = `${input.reportData.project.code}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Upload to S3
        const fileKey = `projects/${input.reportData.project.code}/reports/${filename}`;
        const { url: s3Url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
        
        // Sync to Central Documents
        const db = await getDb();
        if (db) {
          const documentId = `DOC-${nanoid(12)}`;
          
          await db.insert(documents).values({
            documentId,
            projectId: input.reportData.project.code,
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

  // ============================================================================
  // DASHBOARD PROCEDURES - Portfolio Health & Metrics
  // ============================================================================

  /**
   * Dashboard KPIs - Portfolio Health Metrics
   * Returns key performance indicators for the dashboard.
   * All monetary values are converted to USD via the Currency Engine.
   */
  getDashboardKPIs: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const organizationId = input.organizationId;
      const operatingUnitId = input.operatingUnitId ? Number(input.operatingUnitId) : undefined;

      const conditions = [
        eq(projects.organizationId, organizationId),
        ...(operatingUnitId ? [eq(projects.operatingUnitId, operatingUnitId)] : []),
        eq(projects.isDeleted, 0),
      ];

      const allProjects = await db
        .select({
          id: projects.id,
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          status: projects.status,
          currency: projects.currency,
          endDate: projects.endDate,
        })
        .from(projects)
        .where(and(...conditions));

      // Use Currency Engine for all conversions (replaces hardcoded CURRENCY_RATES)
      const totalBudgetUSD = allProjects.reduce((sum, p) => {
        return sum + convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
      }, 0);

      const totalSpentUSD = allProjects.reduce((sum, p) => {
        return sum + convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
      }, 0);

      const onTrackCount = allProjects.filter(p => p.status === 'active').length;
      const atRiskCount = allProjects.filter(p => p.status === 'on_hold').length;
      const completedCount = allProjects.filter(p => p.status === 'completed').length;
      const planningCount = allProjects.filter(p => p.status === 'planning').length;

      // Expiring in 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringCount = allProjects.filter(p => {
        if (!p.endDate) return false;
        const endDate = new Date(p.endDate as any);
        return endDate <= thirtyDaysFromNow && endDate > new Date();
      }).length;

      // Over-budget count
      const overBudgetCount = allProjects.filter(p => {
        const budgetUSD = convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
        const spentUSD = convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
        return spentUSD > budgetUSD;
      }).length;

      return {
        totalProjects: allProjects.length,
        totalBudgetUSD: Math.round(totalBudgetUSD),
        totalSpentUSD: Math.round(totalSpentUSD),
        balanceUSD: Math.round(totalBudgetUSD - totalSpentUSD),
        burnRatePercent: totalBudgetUSD > 0 ? Math.round((totalSpentUSD / totalBudgetUSD) * 100) : 0,
        onTrackCount,
        atRiskCount,
        completedCount,
        planningCount,
        expiringCount,
        overBudgetCount,
        avgCompletionRate: allProjects.length > 0
          ? Math.round((onTrackCount / allProjects.length) * 100)
          : 0,
      };
    }),

  /**
   * Dashboard Alerts - Executive Alerts
   * Returns at-risk, over-budget, expiring projects and overdue reports.
   * Budget comparisons use Currency Engine conversions.
   */
  getAlerts: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const organizationId = input.organizationId;
      const operatingUnitId = input.operatingUnitId ? Number(input.operatingUnitId) : undefined;

      const conditions = [
        eq(projects.organizationId, organizationId),
        ...(operatingUnitId ? [eq(projects.operatingUnitId, operatingUnitId)] : []),
        eq(projects.isDeleted, 0),
      ];

      const allProjects = await db
        .select({
          id: projects.id,
          title: projects.title,
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          status: projects.status,
          endDate: projects.endDate,
          currency: projects.currency,
        })
        .from(projects)
        .where(and(...conditions));

      const atRiskProjects = allProjects
        .filter(p => p.status === 'on_hold')
        .map(p => ({ id: p.id, title: p.title, type: 'at-risk' }));

      const overBudgetProjects = allProjects
        .filter(p => {
          const budgetUSD = convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
          const spentUSD = convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
          return spentUSD > budgetUSD;
        })
        .map(p => ({ id: p.id, title: p.title, type: 'over-budget' }));

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringProjects = allProjects
        .filter(p => {
          if (!p.endDate) return false;
          const endDate = new Date(p.endDate as any);
          return endDate <= thirtyDaysFromNow && endDate > new Date();
        })
        .map(p => ({ id: p.id, title: p.title, type: 'expiring-soon' }));

      // Overdue reports: reporting schedules with past due date and non-submitted status
      const reportConditions = [
        eq(reportingSchedulesTable.organizationId, organizationId),
        ...(operatingUnitId ? [eq(reportingSchedulesTable.operatingUnitId, operatingUnitId)] : []),
      ];

      const overdueReports = await db
        .select({
          id: reportingSchedulesTable.id,
          projectId: reportingSchedulesTable.projectId,
          reportType: reportingSchedulesTable.reportType,
          dueDate: reportingSchedulesTable.reportDeadline,
          reportStatus: reportingSchedulesTable.reportStatus,
        })
        .from(reportingSchedulesTable)
        .where(
          and(
            ...reportConditions,
            or(
              eq(reportingSchedulesTable.reportStatus, 'NOT_STARTED'),
              eq(reportingSchedulesTable.reportStatus, 'PLANNED'),
              eq(reportingSchedulesTable.reportStatus, 'UNDER_PREPARATION')
            )
          )
        );

      const now = new Date();
      const overdueList = overdueReports
        .filter(r => {
          if (!r.dueDate) return false;
          return new Date(r.dueDate as any) < now;
        })
        .map(r => ({
          id: r.id,
          projectId: r.projectId,
          reportType: r.reportType,
          dueDate: r.dueDate ? new Date(r.dueDate as any).toISOString().split('T')[0] : null,
          type: 'overdue-report',
        }));

      return {
        atRisk: atRiskProjects,
        overBudget: overBudgetProjects,
        expiringSoon: expiringProjects,
        overdueReports: overdueList,
        summary: {
          atRiskCount: atRiskProjects.length,
          overBudgetCount: overBudgetProjects.length,
          expiringSoonCount: expiringProjects.length,
          overdueReportsCount: overdueList.length,
          totalAlerts: atRiskProjects.length + overBudgetProjects.length + expiringProjects.length + overdueList.length,
        },
      };
    }),

  /**
   * Dashboard Status Distribution - Project status breakdown
   */
  getStatusDistribution: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const organizationId = input.organizationId;
      const operatingUnitId = input.operatingUnitId ? Number(input.operatingUnitId) : undefined;

      const conditions = [
        eq(projects.organizationId, organizationId),
        ...(operatingUnitId ? [eq(projects.operatingUnitId, operatingUnitId)] : []),
        eq(projects.isDeleted, 0),
      ];

      const statusCounts = await db
        .select({
          status: projects.status,
          count: sql<number>`count(*)`,
        })
        .from(projects)
        .where(and(...conditions))
        .groupBy(projects.status);

      const distribution: Record<string, number> = {
        'On Track': 0,
        'At Risk': 0,
        'Planning': 0,
        'Completed': 0,
        'Cancelled': 0,
      };

      statusCounts.forEach(item => {
        if (item.status === 'active') distribution['On Track'] = Number(item.count);
        if (item.status === 'on_hold') distribution['At Risk'] = Number(item.count);
        if (item.status === 'planning') distribution['Planning'] = Number(item.count);
        if (item.status === 'completed') distribution['Completed'] = Number(item.count);
        if (item.status === 'cancelled') distribution['Cancelled'] = Number(item.count);
      });

      return distribution;
    }),

  /**
   * Dashboard Project Risk Table
   * Returns per-project risk metrics for the executive risk table.
   * Budget utilization uses Currency Engine for cross-currency comparison.
   */
  getProjectRiskTable: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const organizationId = input.organizationId;
      const operatingUnitId = input.operatingUnitId ? Number(input.operatingUnitId) : undefined;
      const { limit } = input;

      const conditions = [
        eq(projects.organizationId, organizationId),
        ...(operatingUnitId ? [eq(projects.operatingUnitId, operatingUnitId)] : []),
        eq(projects.isDeleted, 0),
        or(
          eq(projects.status, 'active'),
          eq(projects.status, 'on_hold'),
          eq(projects.status, 'planning')
        )!,
      ];

      const projectList = await db
        .select({
          id: projects.id,
          title: projects.title,
          projectCode: projects.projectCode,
          status: projects.status,
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          currency: projects.currency,
          startDate: projects.startDate,
          endDate: projects.endDate,
          donor: projects.donor,
        })
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.totalBudget))
        .limit(limit);

      // Get overdue report counts per project
      const reportCounts = await db
        .select({
          projectId: reportingSchedulesTable.projectId,
          overdueCount: sql<number>`SUM(CASE WHEN ${reportingSchedulesTable.reportDeadline} < NOW() AND ${reportingSchedulesTable.reportStatus} NOT IN ('SUBMITTED_TO_DONOR', 'SUBMITTED_TO_HQ') THEN 1 ELSE 0 END)`,
          nextDueDate: sql<string>`MIN(CASE WHEN ${reportingSchedulesTable.reportDeadline} >= NOW() THEN ${reportingSchedulesTable.reportDeadline} END)`,
        })
        .from(reportingSchedulesTable)
        .where(
          and(
            eq(reportingSchedulesTable.organizationId, organizationId),
            ...(operatingUnitId ? [eq(reportingSchedulesTable.operatingUnitId, operatingUnitId)] : [])
          )
        )
        .groupBy(reportingSchedulesTable.projectId);

      const reportMap: Record<number, { overdueCount: number; nextDueDate: string | null }> = {};
      for (const r of reportCounts) {
        if (r.projectId) {
          reportMap[r.projectId] = {
            overdueCount: Number(r.overdueCount) || 0,
            nextDueDate: r.nextDueDate || null,
          };
        }
      }

      const now = new Date();

      return projectList.map(p => {
        // Use Currency Engine for cross-currency budget comparison
        const budgetUSD = convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
        const spentUSD = convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
        const budgetUtilization = budgetUSD > 0 ? Math.round((spentUSD / budgetUSD) * 100) : 0;
        const isOverBudget = spentUSD > budgetUSD;

        const endDate = p.endDate ? new Date(p.endDate as any) : null;
        const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

        const overdueReports = reportMap[p.id]?.overdueCount || 0;
        const nextDueDate = reportMap[p.id]?.nextDueDate || null;

        // Compute risk level
        let riskScore = 0;
        if (p.status === 'on_hold') riskScore += 3;
        if (isOverBudget) riskScore += 3;
        if (budgetUtilization > 90) riskScore += 2;
        if (overdueReports > 0) riskScore += 2;
        if (daysRemaining !== null && daysRemaining < 30 && daysRemaining > 0) riskScore += 2;
        if (daysRemaining !== null && daysRemaining < 0) riskScore += 3;

        const riskLevel = riskScore >= 6 ? 'critical' : riskScore >= 3 ? 'high' : riskScore >= 1 ? 'medium' : 'low';

        // Burn health: how fast are they burning vs time elapsed
        const startDate = p.startDate ? new Date(p.startDate as any) : null;
        let burnHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (startDate && endDate) {
          const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          const timeElapsedPct = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
          const budgetDiff = budgetUtilization - timeElapsedPct;
          if (budgetDiff > 20) burnHealth = 'critical';
          else if (budgetDiff > 10) burnHealth = 'warning';
        }

        return {
          id: p.id,
          name: p.title,
          code: p.projectCode,
          status: p.status,
          donor: p.donor || null,
          riskLevel,
          riskScore,
          budgetUtilization,
          budgetUSD: Math.round(budgetUSD),
          spentUSD: Math.round(spentUSD),
          isOverBudget,
          overdueReports,
          daysRemaining,
          nextDueDate,
          burnHealth,
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
        };
      });
    }),

  /**
   * Dashboard Project Snapshot - Top projects by budget with enhanced fields
   * Budget values converted to USD via Currency Engine.
   */
  getSnapshot: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const organizationId = input.organizationId;
      const operatingUnitId = input.operatingUnitId ? Number(input.operatingUnitId) : undefined;
      const { limit } = input;

      const conditions = [
        eq(projects.organizationId, organizationId),
        ...(operatingUnitId ? [eq(projects.operatingUnitId, operatingUnitId)] : []),
        eq(projects.isDeleted, 0),
      ];

      const topProjects = await db
        .select({
          id: projects.id,
          title: projects.title,
          projectCode: projects.projectCode,
          status: projects.status,
          donor: projects.donor,
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          currency: projects.currency,
          endDate: projects.endDate,
          startDate: projects.startDate,
        })
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.totalBudget))
        .limit(limit);

      // Get next reporting deadline per project
      const reportDeadlines = await db
        .select({
          projectId: reportingSchedulesTable.projectId,
          nextDueDate: sql<string>`MIN(CASE WHEN ${reportingSchedulesTable.reportDeadline} >= NOW() THEN ${reportingSchedulesTable.reportDeadline} END)`,
          overdueCount: sql<number>`SUM(CASE WHEN ${reportingSchedulesTable.reportDeadline} < NOW() AND ${reportingSchedulesTable.reportStatus} NOT IN ('SUBMITTED_TO_DONOR', 'SUBMITTED_TO_HQ') THEN 1 ELSE 0 END)`,
        })
        .from(reportingSchedulesTable)
        .where(
          and(
            eq(reportingSchedulesTable.organizationId, organizationId),
            ...(operatingUnitId ? [eq(reportingSchedulesTable.operatingUnitId, operatingUnitId)] : [])
          )
        )
        .groupBy(reportingSchedulesTable.projectId);

      const deadlineMap: Record<number, { nextDueDate: string | null; overdueCount: number }> = {};
      for (const r of reportDeadlines) {
        if (r.projectId) {
          deadlineMap[r.projectId] = {
            nextDueDate: r.nextDueDate || null,
            overdueCount: Number(r.overdueCount) || 0,
          };
        }
      }

      const now = new Date();

      return topProjects.map(p => {
        // Use Currency Engine for cross-currency budget comparison
        const budgetUSD = convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
        const spentUSD = convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
        const budgetUtilization = budgetUSD > 0 ? Math.round((spentUSD / budgetUSD) * 100) : 0;
        const isOverBudget = spentUSD > budgetUSD;

        const endDate = p.endDate ? new Date(p.endDate as any) : null;
        const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

        const overdueReports = deadlineMap[p.id]?.overdueCount || 0;
        const nextDueDate = deadlineMap[p.id]?.nextDueDate || null;

        // Simple risk score
        let riskScore = 0;
        if (p.status === 'on_hold') riskScore += 3;
        if (isOverBudget) riskScore += 3;
        if (overdueReports > 0) riskScore += 2;
        if (daysRemaining !== null && daysRemaining < 30 && daysRemaining > 0) riskScore += 1;
        const riskLevel = riskScore >= 6 ? 'critical' : riskScore >= 3 ? 'high' : riskScore >= 1 ? 'medium' : 'low';

        return {
          id: p.id,
          name: p.title,
          code: p.projectCode,
          status: p.status,
          donor: p.donor || null,
          budgetUSD: Math.round(budgetUSD),
          spentUSD: Math.round(spentUSD),
          budgetUtilization,
          isOverBudget,
          riskLevel,
          overdueReports,
          nextDueDate,
          daysRemaining,
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
        };
      });
    }),

  /**
   * Dashboard Compliance Metrics - Reporting compliance rate
   */
  getComplianceMetrics: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const organizationId = input.organizationId;
      const operatingUnitId = input.operatingUnitId ? Number(input.operatingUnitId) : undefined;

      const conditions = [
        eq(reportingSchedulesTable.organizationId, organizationId),
        ...(operatingUnitId ? [eq(reportingSchedulesTable.operatingUnitId, operatingUnitId)] : []),
      ];

      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(reportingSchedulesTable)
        .where(and(...conditions));

      const completedResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(reportingSchedulesTable)
        .where(and(...conditions, eq(reportingSchedulesTable.reportStatus, 'SUBMITTED_TO_DONOR')));

      const pendingResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(reportingSchedulesTable)
        .where(
          and(
            ...conditions,
            or(
              eq(reportingSchedulesTable.reportStatus, 'NOT_STARTED'),
              eq(reportingSchedulesTable.reportStatus, 'PLANNED'),
              eq(reportingSchedulesTable.reportStatus, 'UNDER_PREPARATION')
            )
          )
        );

      const inReviewResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(reportingSchedulesTable)
        .where(
          and(
            ...conditions,
            or(
              eq(reportingSchedulesTable.reportStatus, 'UNDER_REVIEW'),
              eq(reportingSchedulesTable.reportStatus, 'SUBMITTED_TO_HQ')
            )
          )
        );

      // Overdue: past due date and not submitted
      const overdueResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(reportingSchedulesTable)
        .where(
          and(
            ...conditions,
            sql`${reportingSchedulesTable.reportDeadline} < NOW()`,
            or(
              eq(reportingSchedulesTable.reportStatus, 'NOT_STARTED'),
              eq(reportingSchedulesTable.reportStatus, 'PLANNED'),
              eq(reportingSchedulesTable.reportStatus, 'UNDER_PREPARATION')
            )
          )
        );

      const total = Number(totalResult[0]?.count) || 0;
      const completed = Number(completedResult[0]?.count) || 0;
      const pending = Number(pendingResult[0]?.count) || 0;
      const inReview = Number(inReviewResult[0]?.count) || 0;
      const overdue = Number(overdueResult[0]?.count) || 0;

      const complianceRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        reportingComplianceRate: Math.round(complianceRate),
        completedReports: completed,
        pendingReports: pending,
        inReviewReports: inReview,
        overdueReports: overdue,
        totalSchedules: total,
      };
    }),

  /**
   * Dashboard Active Projects Count
   */
  getActiveCount: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, ctx.scope.organizationId),
            eq(projects.operatingUnitId, ctx.scope.operatingUnitId),
            eq(projects.isDeleted, 0),
            eq(projects.status, 'active')
          )
        );

      return Number(result[0]?.count) || 0;
    }),

  /**
   * Dashboard Reporting Schedules Count
   */
  getReportingSchedulesCount: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(reportingSchedulesTable)
        .where(
          and(
            eq(reportingSchedulesTable.organizationId, ctx.scope.organizationId),
            eq(reportingSchedulesTable.operatingUnitId, ctx.scope.operatingUnitId)
          )
        );

      return Number(result[0]?.count) || 0;
    }),

  /**
   * Upcoming Reporting Deadlines - next N days
   * Returns reporting schedules with upcoming deadlines for compliance monitoring
   * Links to projects and grants for context
   */
  getUpcomingReportingDeadlines: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
      daysAhead: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const organizationId = input.organizationId;
      const operatingUnitId = input.operatingUnitId ? Number(input.operatingUnitId) : undefined;
      const daysAhead = input.daysAhead;

      const conditions = [
        eq(reportingSchedulesTable.organizationId, organizationId),
        ...(operatingUnitId ? [eq(reportingSchedulesTable.operatingUnitId, operatingUnitId)] : []),
        eq(reportingSchedulesTable.isDeleted, 0),
      ];

      // Get upcoming and overdue reporting schedules
      const schedules = await db
        .select({
          id: reportingSchedulesTable.id,
          projectId: reportingSchedulesTable.projectId,
          projectName: projects.title,
          grantId: reportingSchedulesTable.grantId,
          grantName: grants.grantName,
          reportType: reportingSchedulesTable.reportType,
          reportDeadline: reportingSchedulesTable.reportDeadline,
          reportStatus: reportingSchedulesTable.reportStatus,
          periodFrom: reportingSchedulesTable.periodFrom,
          periodTo: reportingSchedulesTable.periodTo,
          daysUntilDue: sql<number>`DATEDIFF(${reportingSchedulesTable.reportDeadline}, CURDATE())`,
        })
        .from(reportingSchedulesTable)
        .innerJoin(projects, eq(reportingSchedulesTable.projectId, projects.id))
        .leftJoin(grants, eq(reportingSchedulesTable.grantId, grants.id))
        .where(
          and(
            ...conditions,
            sql`DATEDIFF(${reportingSchedulesTable.reportDeadline}, CURDATE()) BETWEEN ${-daysAhead} AND ${daysAhead}`,
            or(
              sql`${reportingSchedulesTable.reportStatus} = 'PLANNED'`,
              sql`${reportingSchedulesTable.reportStatus} = 'UNDER_PREPARATION'`,
              sql`${reportingSchedulesTable.reportStatus} = 'UNDER_REVIEW'`
            )
          )
        )
        .orderBy(reportingSchedulesTable.reportDeadline);

      // Calculate totals
      const overdue = schedules.filter(s => (s.daysUntilDue as number) < 0).length;
      const upcoming = schedules.filter(s => (s.daysUntilDue as number) >= 0 && (s.daysUntilDue as number) <= daysAhead).length;
      const total = schedules.length;

      // Format response with isOverdue flag
      const formattedSchedules = schedules.map(s => ({
        id: s.id,
        projectId: s.projectId,
        projectName: s.projectName,
        grantId: s.grantId,
        grantName: s.grantName || 'N/A',
        reportType: s.reportType,
        reportDeadline: s.reportDeadline,
        reportStatus: s.reportStatus,
        periodFrom: s.periodFrom,
        periodTo: s.periodTo,
        daysUntilDue: s.daysUntilDue as number,
        isOverdue: (s.daysUntilDue as number) < 0,
      }));

      return {
        total,
        overdue,
        upcoming,
        deadlines: formattedSchedules,
      };
    }),

  /**
   * Expiring Projects - ending in next N days
   * Returns projects with upcoming end dates for closeout preparation.
   * Budget utilization uses Currency Engine for cross-currency comparison.
   */
  getExpiringProjects: scopedProcedure
    .input(z.object({
      organizationId: z.number(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
      daysAhead: z.number().default(90),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const organizationId = input.organizationId;
      const operatingUnitId = input.operatingUnitId ? Number(input.operatingUnitId) : undefined;
      const daysAhead = input.daysAhead;

      const conditions = [
        eq(projects.organizationId, organizationId),
        ...(operatingUnitId ? [eq(projects.operatingUnitId, operatingUnitId)] : []),
        eq(projects.isDeleted, 0),
        sql`${projects.status} != 'completed'`,
      ];

      // Get projects expiring in next N days
      const expiringProjects = await db
        .select({
          id: projects.id,
          name: projects.title,
          code: projects.projectCode,
          endDate: projects.endDate,
          status: projects.status,
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          currency: projects.currency,
          daysRemaining: sql<number>`DATEDIFF(${projects.endDate}, CURDATE())`,
        })
        .from(projects)
        .where(
          and(
            ...conditions,
            sql`DATEDIFF(${projects.endDate}, CURDATE()) BETWEEN 0 AND ${daysAhead}`
          )
        )
        .orderBy(projects.endDate);

      // Calculate expiry categories
      const expiring30 = expiringProjects.filter(p => (p.daysRemaining as number) <= 30).length;
      const expiring60 = expiringProjects.filter(p => (p.daysRemaining as number) > 30 && (p.daysRemaining as number) <= 60).length;
      const expiring90 = expiringProjects.filter(p => (p.daysRemaining as number) > 60 && (p.daysRemaining as number) <= 90).length;

      // Format response with budget utilization and expiry category
      const formattedProjects = expiringProjects.map(p => {
        // Use Currency Engine for cross-currency budget comparison
        const budgetUSD = convertToUSD(Number(p.totalBudget) || 0, p.currency || 'USD');
        const spentUSD = convertToUSD(Number(p.spent) || 0, p.currency || 'USD');
        const budgetUtilization = budgetUSD > 0 ? Math.round((spentUSD / budgetUSD) * 100) : 0;
        const daysRemaining = p.daysRemaining as number;
        const expiryCategory = daysRemaining <= 30 ? 'critical' : daysRemaining <= 60 ? 'warning' : 'info';

        return {
          id: p.id,
          name: p.name,
          code: p.code,
          endDate: p.endDate,
          status: p.status,
          daysRemaining,
          budgetUtilization,
          totalBudgetUSD: Math.round(budgetUSD),
          spentUSD: Math.round(spentUSD),
          expiryCategory,
        };
      });

      return {
        total: expiringProjects.length,
        expiring30,
        expiring60,
        expiring90,
        projects: formattedProjects,
      };
    }),

  // ── Portfolio Financial Snapshot ──────────────────────────────────────────
  // Aggregates real budget, spend, and grant data for the executive KPI card.
  // Uses ctx.scope for org/OU isolation — no input required from the frontend.
  // Includes planning + active projects, approved + revised budgets, ongoing grants.
  // grants.operatingUnitId is nullable: org-level grants (NULL) are always included.
  // All monetary values converted to USD via the Currency Engine.
  getPortfolioFinancialSnapshot: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { organizationId, operatingUnitId } = ctx.scope;

      // 1. Active + planning projects: sum totalBudget and spent
      const activeProjects = await db
        .select({
          totalBudget: projects.totalBudget,
          spent: projects.spent,
          currency: projects.currency,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, organizationId),
            eq(projects.operatingUnitId, operatingUnitId),
            inArray(projects.status, ['active', 'planning']),
            eq(projects.isDeleted, 0)
          )
        );

      let totalBudget = 0;
      let totalSpent = 0;
      activeProjects.forEach((p) => {
        // Use Currency Engine for cross-currency aggregation
        totalBudget += convertToUSD(Number(p.totalBudget || 0), p.currency ?? 'USD');
        totalSpent  += convertToUSD(Number(p.spent || 0),       p.currency ?? 'USD');
      });

      // 2. Ongoing grants: sum grantAmount
      // operatingUnitId is nullable on grants — include org-level (NULL) and OU-scoped grants
      const activeGrantRows = await db
        .select({
          grantAmount: grants.grantAmount,
          currency: grants.currency,
        })
        .from(grants)
        .where(
          and(
            eq(grants.organizationId, organizationId),
            or(
              isNull(grants.operatingUnitId),
              eq(grants.operatingUnitId, operatingUnitId)
            ),
            eq(grants.isDeleted, 0),
            eq(grants.status, 'ongoing')
          )
        );

      let activeGrantsValue = 0;
      activeGrantRows.forEach((g) => {
        activeGrantsValue += convertToUSD(Number(g.grantAmount || 0), g.currency ?? 'USD');
      });

      // 3. Approved + revised budgets: authoritative financial source
      const approvedBudgetRows = await db
        .select({
          totalApprovedAmount: budgets.totalApprovedAmount,
          totalActualAmount: budgets.totalActualAmount,
          currency: budgets.currency,
        })
        .from(budgets)
        .where(
          and(
            eq(budgets.organizationId, organizationId),
            eq(budgets.operatingUnitId, operatingUnitId),
            inArray(budgets.status, ['approved', 'revised']),
            eq(budgets.isDeleted, 0)
          )
        );

      let approvedBudgetTotal = 0;
      let approvedActualTotal = 0;
      approvedBudgetRows.forEach((b) => {
        approvedBudgetTotal += convertToUSD(Number(b.totalApprovedAmount || 0), b.currency ?? 'USD');
        approvedActualTotal += convertToUSD(Number(b.totalActualAmount  || 0), b.currency ?? 'USD');
      });

      // 4. Prefer approved-budget data when available (more authoritative than project-level)
      const finalBudget = approvedBudgetTotal > 0 ? approvedBudgetTotal : totalBudget;
      const finalSpent  = approvedActualTotal  > 0 ? approvedActualTotal  : totalSpent;
      const remainingBalance = finalBudget - finalSpent;
      const utilizationRate  = finalBudget > 0
        ? Math.round((finalSpent / finalBudget) * 1000) / 10  // one decimal, e.g. 60.4
        : 0;

      return {
        totalBudget:       Math.round(finalBudget),
        totalSpent:        Math.round(finalSpent),
        remainingBalance:  Math.round(remainingBalance),
        utilizationRate,
        activeProjects:    activeProjects.length,
        activeGrants:      activeGrantRows.length,
        activeGrantsValue: Math.round(activeGrantsValue),
      };
    }),
})