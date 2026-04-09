import { z } from "zod";
import { protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { grants, projects, grantDocuments, budgetItems } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ensureISOString } from "@shared/dateUtils";
// Date serialization is handled by ensureISOString helper

export const grantsRouter = router({
  /**
   * List all grants with optional filters
   * Grant status is synced with linked project status:
   * - If project is "active" -> grant effectiveStatus is "active"
   * - If project is "completed" -> grant effectiveStatus is "completed"
   * - If project is "planning" or no project -> grant effectiveStatus is "pending"
   */
  list: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        status: z.enum(["active", "completed", "pending", "on_hold", "all"]).optional(),
        searchTerm: z.string().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const conditions = [
        eq(grants.organizationId, organizationId),
        eq(grants.operatingUnitId, operatingUnitId),
        eq(grants.isDeleted, false),
      ];

      // Filter by project
      if (input.projectId) {
        conditions.push(eq(grants.projectId, input.projectId));
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Join with projects to get all project data for sync
      const grantsWithProjects = await db
        .select({
          grant: grants,
          projectStatus: projects.status,
          projectTitle: projects.title,
          projectDonor: projects.donor,
          projectStartDate: projects.startDate,
          projectEndDate: projects.endDate,
          projectTotalBudget: projects.totalBudget,
          projectSpent: projects.spent,
          projectCurrency: projects.currency,
        })
        .from(grants)
        .leftJoin(projects, eq(grants.projectId, projects.id))
        .where(and(...conditions))
        .orderBy(desc(grants.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Map project status to grant effective status
      const mapProjectStatusToGrantStatus = (projectStatus: string | null): "active" | "completed" | "pending" | "on_hold" => {
        if (!projectStatus) return "pending";
        switch (projectStatus) {
          case "active": return "active";
          case "completed": return "completed";
          case "on_hold": return "on_hold";
          case "cancelled": return "completed";
          case "planning":
          default: return "pending";
        }
      };

      // Transform results with all data synced from project
      // Serialize all date fields to ISO strings to prevent toISOString errors on frontend
      let allGrants = grantsWithProjects.map(({ grant, projectStatus, projectTitle, projectDonor, projectStartDate, projectEndDate, projectTotalBudget, projectSpent, projectCurrency }) => {
        // Destructure date fields to serialize them properly
        const { startDate, endDate, createdAt, updatedAt, deletedAt, ...restGrant } = grant;
        
        // Calculate budget utilization from project data
        const totalBudget = projectTotalBudget ? parseFloat(String(projectTotalBudget)) : (grant.grantAmount || 0);
        const spent = projectSpent ? parseFloat(String(projectSpent)) : 0;
        const balance = totalBudget - spent;
        const budgetUtilization = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;
        
        // Use project dates if available, otherwise use grant dates
        const syncedStartDate = projectStartDate || startDate;
        const syncedEndDate = projectEndDate || endDate;
        
        return {
          ...restGrant,
          // Sync donor name from project (fallback to grant's donorName)
          donorName: projectDonor || grant.donorName || 'Unknown Donor',
          // Serialize all date fields - use project dates when available
          startDate: syncedStartDate ? ensureISOString(syncedStartDate) : null,
          endDate: syncedEndDate ? ensureISOString(syncedEndDate) : null,
          createdAt: createdAt ? ensureISOString(createdAt) : null,
          updatedAt: updatedAt ? ensureISOString(updatedAt) : null,
          deletedAt: deletedAt ? ensureISOString(deletedAt) : null,
          // Override status with effective status based on linked project
          status: mapProjectStatusToGrantStatus(projectStatus),
          effectiveStatus: mapProjectStatusToGrantStatus(projectStatus),
          linkedProjectTitle: projectTitle || grant.grantName || grant.title,
          // Sync financial data from project
          grantAmount: totalBudget,
          currency: projectCurrency || grant.currency || 'USD',
          spent: spent,
          balance: balance,
          budgetUtilization: budgetUtilization,
        };
      });

      // Filter by effective status (after sync)
      if (input.status && input.status !== "all") {
        allGrants = allGrants.filter(g => g.effectiveStatus === input.status);
      }

      // Apply search filter in memory (for grant number, name, donor)
      if (input.searchTerm) {
        const searchLower = input.searchTerm.toLowerCase();
        return allGrants.filter(
          (grant) =>
            (grant.grantNumber?.toLowerCase() || '').includes(searchLower) ||
            (grant.grantName?.toLowerCase() || '').includes(searchLower) ||
            grant.donorName.toLowerCase().includes(searchLower)
        );
      }

      return allGrants;
    }),

  /**
   * Get a single grant by ID with synced project data
   */
  getById: scopedProcedure
    .input(z.object({ 
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Join with projects to get all synced data
      const result = await db
        .select({
          grant: grants,
          projectStatus: projects.status,
          projectTitle: projects.title,
          projectDonor: projects.donor,
          projectStartDate: projects.startDate,
          projectEndDate: projects.endDate,
          projectTotalBudget: projects.totalBudget,
          projectSpent: projects.spent,
          projectCurrency: projects.currency,
        })
        .from(grants)
        .leftJoin(projects, eq(grants.projectId, projects.id))
        .where(and(
          eq(grants.id, input.id),
          eq(grants.organizationId, organizationId),
          eq(grants.operatingUnitId, operatingUnitId),
          eq(grants.isDeleted, false)
        ))
        .limit(1);

      if (!result || result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Grant not found",
        });
      }

      const { grant: grantData, projectStatus, projectTitle, projectDonor, projectStartDate, projectEndDate, projectTotalBudget, projectSpent, projectCurrency } = result[0];
      const { startDate, endDate, createdAt, updatedAt, deletedAt, ...restGrant } = grantData;
      
      // Calculate budget utilization from project data
      const totalBudget = projectTotalBudget ? parseFloat(String(projectTotalBudget)) : (grantData.grantAmount || 0);
      const spent = projectSpent ? parseFloat(String(projectSpent)) : 0;
      const balance = totalBudget - spent;
      const budgetUtilization = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;
      
      // Use project dates if available
      const syncedStartDate = projectStartDate || startDate;
      const syncedEndDate = projectEndDate || endDate;
      
      // Map project status to grant status
      const mapStatus = (status: string | null): "active" | "completed" | "pending" | "on_hold" => {
        if (!status) return "pending";
        switch (status) {
          case "active": return "active";
          case "completed": return "completed";
          case "on_hold": return "on_hold";
          default: return "pending";
        }
      };
      
      return {
        ...restGrant,
        // Sync donor name from project
        donorName: projectDonor || grantData.donorName || 'Unknown Donor',
        // Serialize dates - use project dates when available
        startDate: syncedStartDate ? ensureISOString(syncedStartDate) : null,
        endDate: syncedEndDate ? ensureISOString(syncedEndDate) : null,
        createdAt: createdAt ? ensureISOString(createdAt) : null,
        updatedAt: updatedAt ? ensureISOString(updatedAt) : null,
        deletedAt: deletedAt ? ensureISOString(deletedAt) : null,
        // Sync status from project
        status: mapStatus(projectStatus),
        effectiveStatus: mapStatus(projectStatus),
        linkedProjectTitle: projectTitle || grantData.grantName || grantData.title,
        // Sync financial data from project
        grantAmount: totalBudget,
        currency: projectCurrency || grantData.currency || 'USD',
        spent: spent,
        balance: balance,
        budgetUtilization: budgetUtilization,
      };
    }),

  /**
   * Create a new grant
   */
  create: scopedProcedure
    .input(
      z.object({
        projectId: z.number(),
        grantNumber: z.string().min(1),
        grantName: z.string().min(1),
        grantNameAr: z.string().optional(),
        donorName: z.string().min(1),
        donorReference: z.string().optional(),
        grantAmount: z.number().positive(),
        currency: z.enum(["USD", "EUR", "GBP", "CHF"]),
        startDate: z.string(),
        endDate: z.string(),
        status: z.enum(["active", "completed", "pending", "on_hold"]).default("pending"),
        reportingStatus: z.enum(["on_track", "due", "overdue"]).default("on_track"),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        sector: z.string().optional(),
        responsible: z.string().optional(),
        reportingFrequency: z.enum(["monthly", "quarterly", "semi_annually", "annually"]).default("quarterly"),
        coFunding: z.boolean().default(false),
        coFunderName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if grant number already exists
      const existing = await db
        .select()
        .from(grants)
        .where(eq(grants.grantNumber, input.grantNumber))
        .limit(1);

      if (existing && existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Grant number already exists",
        });
      }

      // Get organization and operating unit from scope context
      const { organizationId, operatingUnitId } = ctx.scope;

      // Validate project belongs to same organization/OU if projectId is provided
      if (input.projectId) {
        const project = await db
          .select()
          .from(projects)
          .where(and(
            eq(projects.id, input.projectId),
            eq(projects.organizationId, organizationId),
            eq(projects.operatingUnitId, operatingUnitId)
          ))
          .limit(1);

        if (!project || project.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found or does not belong to your organization",
          });
        }
      }

      const result = await db.insert(grants).values({
        ...input,
        organizationId,
        operatingUnitId,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      const grantId = Number(result.insertId);

      // Auto-generate reporting schedules based on reporting frequency
      const { reportingSchedules } = await import('../drizzle/schema');
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      
      // Calculate number of reports based on frequency
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
      let reportCount = 0;
      let intervalMonths = 0;
      
      switch (input.reportingFrequency) {
        case 'monthly':
          reportCount = monthsDiff;
          intervalMonths = 1;
          break;
        case 'quarterly':
          reportCount = Math.ceil(monthsDiff / 3);
          intervalMonths = 3;
          break;
        case 'semi_annually':
          reportCount = Math.ceil(monthsDiff / 6);
          intervalMonths = 6;
          break;
        case 'annually':
          reportCount = Math.ceil(monthsDiff / 12);
          intervalMonths = 12;
          break;
      }
      
      // Generate reporting schedules
      const schedules = [];
      for (let i = 0; i < reportCount; i++) {
        const periodStart = new Date(startDate);
        periodStart.setMonth(periodStart.getMonth() + (i * intervalMonths));
        
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + intervalMonths);
        if (periodEnd > endDate) periodEnd.setTime(endDate.getTime());
        
        const deadline = new Date(periodEnd);
        deadline.setDate(deadline.getDate() + 30); // 30 days after period end
        
        schedules.push({
          projectId: input.projectId,
          grantId,
          organizationId,
          operatingUnitId,
          reportType: 'PROGRESS' as const,
          periodFrom: periodStart,
          periodTo: periodEnd,
          reportStatus: 'PLANNED' as const,
          reportDeadline: deadline,
          notes: `Auto-generated ${input.reportingFrequency} report`,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
      }
      
      // Insert all schedules
      if (schedules.length > 0) {
        await db.insert(reportingSchedules).values(schedules);
      }

      return { id: grantId, success: true, schedulesCreated: schedules.length };
    }),

  /**
   * Update an existing grant
   * Note: UI uses status values (active, completed, pending, on_hold)
   * Database uses different values (planned, ongoing, closed, draft, etc.)
   * Status is now synced from linked project, so we don't update it directly
   */
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        grantNumber: z.string().min(1).optional(),
        grantName: z.string().min(1).optional(),
        grantNameAr: z.string().optional(),
        donorName: z.string().min(1).optional(),
        donorReference: z.string().optional(),
        grantAmount: z.number().positive().optional(),
        currency: z.enum(["USD", "EUR", "GBP", "CHF", "YER"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["active", "completed", "pending", "on_hold"]).optional(),
        reportingStatus: z.enum(["on_track", "due", "overdue"]).optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        sector: z.string().optional(),
        responsible: z.string().optional(),
        reportingFrequency: z.enum(["monthly", "quarterly", "semi_annually", "annually"]).optional(),
        coFunding: z.boolean().optional(),
        coFunderName: z.string().optional(),
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log('[grants.update] Input received:', JSON.stringify(input, null, 2));
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;
      const { id, status, ...updates } = input;

      // Map UI status to database status (if status is provided)
      // Note: Grant status is now primarily synced from linked project
      // This mapping is for manual override if needed
      const mapUiStatusToDbStatus = (uiStatus: string | undefined) => {
        if (!uiStatus) return undefined;
        const statusMap: Record<string, string> = {
          'active': 'ongoing',
          'completed': 'closed',
          'pending': 'draft',
          'on_hold': 'draft',
        };
        return statusMap[uiStatus] || 'draft';
      };

      // Check if grant number is being changed and if it already exists
      if (updates.grantNumber) {
        const existing = await db
          .select()
          .from(grants)
          .where(and(eq(grants.grantNumber, updates.grantNumber), sql`${grants.id} != ${id}`))
          .limit(1);

        if (existing && existing.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Grant number already exists",
          });
        }
      }

      // Build update object, excluding status (which is synced from project)
      const updateData: Record<string, any> = {
        ...updates,
        updatedBy: ctx.user.id,
      };

      // Only update status if explicitly provided and we want to override
      // (In the new sync model, status comes from project, so we skip this)
      // const dbStatus = mapUiStatusToDbStatus(status);
      // if (dbStatus) updateData.status = dbStatus;

      await db
        .update(grants)
        .set(updateData)
        .where(and(
          eq(grants.id, id),
          eq(grants.organizationId, organizationId),
          eq(grants.operatingUnitId, operatingUnitId)
        ));

      return { success: true };
    }),

  /**
   * Soft delete a grant
   */
  delete: scopedProcedure
    .input(z.object({ 
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;

      await db
        .update(grants)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(and(
          eq(grants.id, input.id),
          eq(grants.organizationId, organizationId),
          eq(grants.operatingUnitId, operatingUnitId)
        ));

      return { success: true };
    }),

  /**
   * Get grants KPIs/dashboard metrics
   * Active grants count is synced with linked project status:
   * - Grants linked to "active" projects are counted as active
   */
  getDashboardKPIs: scopedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [
        eq(grants.organizationId, organizationId),
        eq(grants.operatingUnitId, operatingUnitId),
        eq(grants.isDeleted, false),
      ];

      if (input.projectId) {
        conditions.push(eq(grants.projectId, input.projectId));
      }

      // Join with projects to get project status for sync
      const grantsWithProjects = await db
        .select({
          grant: grants,
          projectStatus: projects.status,
        })
        .from(grants)
        .leftJoin(projects, eq(grants.projectId, projects.id))
        .where(and(...conditions));

      // Map project status to grant effective status
      const mapProjectStatusToGrantStatus = (projectStatus: string | null): "active" | "completed" | "pending" | "on_hold" => {
        if (!projectStatus) return "pending";
        switch (projectStatus) {
          case "active": return "active";
          case "completed": return "completed";
          case "on_hold": return "on_hold";
          case "cancelled": return "completed";
          case "planning":
          default: return "pending";
        }
      };

      // Calculate KPIs with synced status
      const totalGrants = grantsWithProjects.length;
      const activeGrants = grantsWithProjects.filter(({ projectStatus }) => 
        mapProjectStatusToGrantStatus(projectStatus) === "active"
      ).length;
      const completedGrants = grantsWithProjects.filter(({ projectStatus }) => 
        mapProjectStatusToGrantStatus(projectStatus) === "completed"
      ).length;
      
      // Calculate total amount (convert all to USD)
      const EXCHANGE_RATES_TO_USD: Record<string, number> = {
        USD: 1.0,
        EUR: 1.10,
        GBP: 1.27,
        CHF: 1.17,
      };

      const totalAmountUSD = grantsWithProjects.reduce((sum, { grant }) => {
        const rate = EXCHANGE_RATES_TO_USD[grant.currency] || 1.0;
        const amountUSD = Number(grant.grantAmount) * rate;
        return sum + amountUSD;
      }, 0);

      return {
        totalGrants,
        activeGrants,
        completedGrants,
        totalAmountUSD,
      };
    }),

  /**
   * Upload document for a grant
   */
  uploadDocument: scopedProcedure
    .input(
      z.object({
        grantId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded file
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        category: z.enum(["contractual", "financial", "programmatic", "reporting", "other"]).default("other"),
        status: z.enum(["draft", "pending", "approved", "rejected", "final"]).default("draft"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify grant exists and user has access
      const grant = await db
        .select()
        .from(grants)
        .where(and(
          eq(grants.id, input.grantId),
          eq(grants.organizationId, organizationId),
          eq(grants.operatingUnitId, operatingUnitId),
          eq(grants.isDeleted, false)
        ))
        .limit(1);

      if (!grant || grant.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Grant not found",
        });
      }

      // Convert base64 to buffer
      const base64Data = input.fileData.split(',')[1]; // Remove data:mime;base64, prefix
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate unique file key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `grants/${input.grantId}/documents/${timestamp}-${randomSuffix}-${input.fileName}`;

      // Upload to S3
      const { storagePut } = await import('./storage');
      const { url } = await storagePut(fileKey, buffer, input.mimeType || 'application/octet-stream');

      // Save to database
      const result = await db.insert(grantDocuments).values({
        grantId: input.grantId,
        fileName: input.fileName,
        fileUrl: url,
        fileKey,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        category: input.category,
        status: input.status,
        description: input.description,
        uploadedBy: ctx.user.id,
      });

      return { success: true, documentId: Number(result.insertId) };
    }),

  /**
   * List documents for a grant
   */
  listDocuments: scopedProcedure
    .input(
      z.object({
        grantId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;

      // First verify grant access
      const grant = await db
        .select()
        .from(grants)
        .where(and(
          eq(grants.id, input.grantId),
          eq(grants.organizationId, organizationId),
          eq(grants.operatingUnitId, operatingUnitId),
          eq(grants.isDeleted, false)
        ))
        .limit(1);

      if (!grant || grant.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Grant not found",
        });
      }

      const documents = await db
        .select()
        .from(grantDocuments)
        .where(and(eq(grantDocuments.grantId, input.grantId), eq(grantDocuments.isDeleted, false)))
        .orderBy(desc(grantDocuments.uploadedAt));

      return documents;
    }),

  /**
   * Delete document (soft delete)
   */
  deleteDocument: scopedProcedure
    .input(
      z.object({
        documentId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { organizationId, operatingUnitId } = ctx.scope;

      // First get the document to find its grantId
      const document = await db
        .select()
        .from(grantDocuments)
        .where(and(
          eq(grantDocuments.id, input.documentId),
          eq(grantDocuments.isDeleted, false)
        ))
        .limit(1);

      if (!document || document.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Verify grant access
      const grant = await db
        .select()
        .from(grants)
        .where(and(
          eq(grants.id, document[0].grantId),
          eq(grants.organizationId, organizationId),
          eq(grants.operatingUnitId, operatingUnitId),
          eq(grants.isDeleted, false)
        ))
        .limit(1);

      if (!grant || grant.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      await db
        .update(grantDocuments)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
        })
        .where(eq(grantDocuments.id, input.documentId));

      return { success: true };
    }),

  /**
   * Sync grants from projects - auto-create grants for projects without linked grants
   * This ensures every project has a corresponding grant record
   */
  syncFromProjects: scopedProcedure
    .mutation(async ({ ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get all projects for this organization/OU
      const allProjects = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId),
          eq(projects.isDeleted, false)
        ));

      // Get all existing grants with projectId
      const existingGrants = await db
        .select({ projectId: grants.projectId })
        .from(grants)
        .where(and(
          eq(grants.organizationId, organizationId),
          eq(grants.operatingUnitId, operatingUnitId),
          eq(grants.isDeleted, false)
        ));

      const existingProjectIds = new Set(existingGrants.map(g => g.projectId).filter(Boolean));

      // Find projects without grants
      const projectsWithoutGrants = allProjects.filter(p => !existingProjectIds.has(p.id));

      // Create grants for projects without grants
      const createdGrants: number[] = [];
      const errors: string[] = [];
      
      console.log(`[SyncFromProjects] Found ${projectsWithoutGrants.length} projects without grants`);
      
      for (const project of projectsWithoutGrants) {
        try {
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const uniqueGrantCode = `${project.projectCode || 'GRANT'}-${timestamp}-${randomSuffix}`;
          const uniqueGrantNumber = `${project.projectCode || 'GN'}-${timestamp}-${randomSuffix}`;
          
          console.log(`[SyncFromProjects] Creating grant for project: ${project.title} (ID: ${project.id})`);
          
          const [newGrant] = await db.insert(grants).values({
            // Required fields
            title: project.title,
            donorName: project.donor || 'Unknown Donor',
            amount: project.totalBudget?.toString() || '0',
            currency: project.currency || 'USD',
            // Optional fields
            grantNumber: uniqueGrantNumber,
            grantCode: uniqueGrantCode,
            grantName: project.title,
            grantNameAr: project.titleAr,
            titleAr: project.titleAr,
            donorReference: `${project.projectCode || 'REF'}-REF`,
            grantAmount: project.totalBudget?.toString() || '0',
            totalBudget: project.totalBudget?.toString() || '0',
            startDate: project.startDate ? (project.startDate instanceof Date ? project.startDate : new Date(project.startDate)) : null,
            endDate: project.endDate ? (project.endDate instanceof Date ? project.endDate : new Date(project.endDate)) : null,
            status: 'planned',
            reportingStatus: 'on_track',
            description: project.description,
            descriptionAr: project.descriptionAr,
            sector: typeof project.sectors === 'string' ? project.sectors.split(',')[0]?.trim() : (project.sectors || null),
            responsible: 'Project Manager',
            reportingFrequency: 'quarterly',
            coFunding: false,
            projectId: project.id,
            organizationId,
            operatingUnitId,
            createdBy: ctx.user.id,
            updatedBy: ctx.user.id,
          });

          createdGrants.push(newGrant.insertId);
          console.log(`[SyncFromProjects] Successfully created grant ID: ${newGrant.insertId}`);
        } catch (error) {
          const errorMsg = `Failed to create grant for project ${project.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`[SyncFromProjects] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      // Also update existing grants with latest project data
      let updatedCount = 0;
      for (const grant of existingGrants) {
        if (grant.projectId) {
          const project = allProjects.find(p => p.id === grant.projectId);
          if (project) {
            try {
              // Build update object with only defined values
              const updateData: Record<string, unknown> = {
                grantName: project.title,
                donorName: project.donor || 'Unknown Donor',
                grantAmount: project.totalBudget?.toString() || '0',
                currency: project.currency || 'USD',
                updatedBy: ctx.user.id,
                updatedAt: new Date(),
              };
              
              // Only add optional fields if they have values
              if (project.titleAr) updateData.grantNameAr = project.titleAr;
              if (project.startDate) {
                updateData.startDate = project.startDate instanceof Date ? project.startDate : new Date(project.startDate);
              }
              if (project.endDate) {
                updateData.endDate = project.endDate instanceof Date ? project.endDate : new Date(project.endDate);
              }
              if (project.description) updateData.description = project.description;
              if (project.descriptionAr) updateData.descriptionAr = project.descriptionAr;
              // Only use first sector to avoid comma issues in SQL
              if (project.sectors) {
                if (typeof project.sectors === 'string') {
                  const firstSector = project.sectors.split(',')[0]?.trim();
                  if (firstSector) updateData.sector = firstSector;
                } else {
                  updateData.sector = project.sectors;
                }
              }
              
              // Update grant with latest project data
              await db.update(grants)
                .set(updateData)
                .where(eq(grants.projectId, project.id));
              
              updatedCount++;
              console.log(`[SyncFromProjects] Updated grant for project: ${project.title}`);
            } catch (error) {
              const errorMsg = `Failed to update grant for project ${project.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              console.error(`[SyncFromProjects] ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        }
      }

      return {
        success: errors.length === 0,
        projectsFound: allProjects.length,
        grantsCreated: createdGrants.length,
        grantsUpdated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length > 0 
          ? `Synced ${createdGrants.length} new grants, updated ${updatedCount} existing grants. ${errors.length} errors occurred.`
          : `Synced ${createdGrants.length} new grants from projects, updated ${updatedCount} existing grants`,
      };
    }),

  /**
   * Get budget utilization by category for a grant's linked project
   * Fetches budget items from the project and groups them by category
   * Returns percentage utilization for each category
   */
  getBudgetUtilizationByCategory: scopedProcedure
    .input(
      z.object({
        grantId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // First get the grant to find its linked projectId
      const grant = await db
        .select()
        .from(grants)
        .where(and(
          eq(grants.id, input.grantId),
          eq(grants.organizationId, organizationId),
          eq(grants.operatingUnitId, operatingUnitId),
          eq(grants.isDeleted, false)
        ))
        .limit(1);

      if (!grant || grant.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Grant not found",
        });
      }

      const projectId = grant[0].projectId;
      if (!projectId) {
        // No linked project, return empty categories
        return {
          categories: [],
          totalBudget: 0,
          totalSpent: 0,
        };
      }

      // Fetch all budget items for the linked project
      const items = await db
        .select({
          category: budgetItems.category,
          totalBudgetLine: budgetItems.totalBudgetLine,
          actualSpent: budgetItems.actualSpent,
        })
        .from(budgetItems)
        .where(and(
          eq(budgetItems.projectId, projectId),
          eq(budgetItems.organizationId, organizationId)
        ));

      // Group by category and calculate totals
      const categoryMap = new Map<string, { budgeted: number; spent: number }>();
      let totalBudget = 0;
      let totalSpent = 0;

      for (const item of items) {
        const category = item.category || 'Other';
        const budgeted = parseFloat(String(item.totalBudgetLine)) || 0;
        const spent = parseFloat(String(item.actualSpent)) || 0;

        totalBudget += budgeted;
        totalSpent += spent;

        if (!categoryMap.has(category)) {
          categoryMap.set(category, { budgeted: 0, spent: 0 });
        }
        const existing = categoryMap.get(category)!;
        existing.budgeted += budgeted;
        existing.spent += spent;
      }

      // Convert to array with percentages
      // Define category colors for consistent display
      const categoryColors: Record<string, string> = {
        'Personal (Salaries, Staff Cost)': 'blue',
        'Project Activities': 'green',
        'MEAL Activities': 'purple',
        'Operation Cost': 'yellow',
        'IP Cost': 'orange',
        'Overhead Cost': 'red',
        'Other': 'gray',
      };

      const categories = Array.from(categoryMap.entries()).map(([name, data]) => {
        // Calculate percentage of total budget this category represents
        const budgetPercentage = totalBudget > 0 ? Math.round((data.budgeted / totalBudget) * 100) : 0;
        // Calculate utilization within this category (spent vs budgeted)
        const utilizationPercentage = data.budgeted > 0 ? Math.round((data.spent / data.budgeted) * 100) : 0;
        
        return {
          name,
          budgeted: data.budgeted,
          spent: data.spent,
          budgetPercentage, // % of total budget allocated to this category
          utilizationPercentage, // % of category budget that has been spent
          color: categoryColors[name] || 'gray',
        };
      });

      // Sort by budget percentage descending
      categories.sort((a, b) => b.budgetPercentage - a.budgetPercentage);

      return {
        categories,
        totalBudget,
        totalSpent,
        overallUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      };
    }),
});
