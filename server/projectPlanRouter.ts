import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { 
  projectPlanObjectives, 
  projectPlanResults, 
  projectPlanActivities, 
  projectPlanTasks,
  activities
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const projectPlanRouter = router({
  // ============================================================================
  // OBJECTIVES CRUD
  // ============================================================================
  
  getObjectives: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId } = ctx.scope;
      
      const objectives = await db.select()
        .from(projectPlanObjectives)
        .where(and(
          eq(projectPlanObjectives.projectId, input.projectId),
          eq(projectPlanObjectives.organizationId, organizationId),
          eq(projectPlanObjectives.isDeleted, false)
        ))
        .orderBy(projectPlanObjectives.code);
      return objectives;
    }),

  createObjective: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      code: z.string(),
      title: z.string(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db.insert(projectPlanObjectives).values({
        projectId: input.projectId,
        organizationId,
        operatingUnitId,
        code: input.code,
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        createdBy: ctx.user?.id,
      });
      return { id: result[0].insertId };
    }),

  updateObjective: scopedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["Not Started", "Ongoing", "Completed"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(projectPlanObjectives)
        .set({ ...updates, updatedBy: ctx.user?.id })
        .where(eq(projectPlanObjectives.id, id));
      return { success: true };
    }),

  deleteObjective: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(projectPlanObjectives)
        .set({ 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id 
        })
        .where(eq(projectPlanObjectives.id, input.id));
      return { success: true };
    }),

  // ============================================================================
  // RESULTS CRUD
  // ============================================================================
  
  getResults: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      objectiveId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId } = ctx.scope;
      
      const results = await db.select()
        .from(projectPlanResults)
        .where(and(
          eq(projectPlanResults.projectId, input.projectId),
          eq(projectPlanResults.organizationId, organizationId),
          eq(projectPlanResults.isDeleted, false),
          input.objectiveId ? eq(projectPlanResults.objectiveId, input.objectiveId) : undefined
        ))
        .orderBy(projectPlanResults.code);
      return results;
    }),

  createResult: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      objectiveId: z.number(),
      code: z.string(),
      title: z.string(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db.insert(projectPlanResults).values({
        projectId: input.projectId,
        organizationId,
        operatingUnitId,
        objectiveId: input.objectiveId,
        code: input.code,
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        createdBy: ctx.user?.id,
      });
      return { id: result[0].insertId };
    }),

  updateResult: scopedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["Not Started", "Ongoing", "Completed"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(projectPlanResults)
        .set({ ...updates, updatedBy: ctx.user?.id })
        .where(eq(projectPlanResults.id, id));
      return { success: true };
    }),

  deleteResult: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(projectPlanResults)
        .set({ 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id 
        })
        .where(eq(projectPlanResults.id, input.id));
      return { success: true };
    }),

  // ============================================================================
  // PLAN ACTIVITIES CRUD (with Activity Tab sync)
  // ============================================================================
  
  getPlanActivities: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      resultId: z.number().optional(),
      department: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId } = ctx.scope;
      
      const planActivities = await db.select()
        .from(projectPlanActivities)
        .where(and(
          eq(projectPlanActivities.projectId, input.projectId),
          eq(projectPlanActivities.organizationId, organizationId),
          eq(projectPlanActivities.isDeleted, false),
          input.resultId ? eq(projectPlanActivities.resultId, input.resultId) : undefined,
          input.department ? eq(projectPlanActivities.department, input.department as any) : undefined
        ))
        .orderBy(projectPlanActivities.code);
      return planActivities;
    }),

  createPlanActivity: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      resultId: z.number().optional(),
      activityTabId: z.number().optional(), // Link to Activities tab
      department: z.enum(["Program", "MEAL", "Logistics", "Finance", "HR", "Security", "Other"]),
      code: z.string(),
      title: z.string(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      responsible: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db.insert(projectPlanActivities).values({
        projectId: input.projectId,
        organizationId,
        operatingUnitId,
        resultId: input.resultId,
        activityTabId: input.activityTabId,
        department: input.department,
        code: input.code,
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        responsible: input.responsible,
        startDate: input.startDate,
        endDate: input.endDate,
        isSynced: !!input.activityTabId,
        createdBy: ctx.user?.id,
      });
      return { id: result[0].insertId };
    }),

  // Sync activity from Activities tab to Project Plan
  syncActivityFromTab: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      activityTabId: z.number(),
      resultId: z.number().optional(),
      department: z.enum(["Program", "MEAL", "Logistics", "Finance", "HR", "Security", "Other"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Get activity from Activities tab
      const [activity] = await db.select()
        .from(activities)
        .where(eq(activities.id, input.activityTabId));
      
      if (!activity) {
        throw new Error("Activity not found in Activities tab");
      }

      // Create plan activity linked to Activities tab
      const result = await db.insert(projectPlanActivities).values({
        projectId: input.projectId,
        organizationId,
        operatingUnitId,
        resultId: input.resultId,
        activityTabId: input.activityTabId,
        department: input.department,
        code: activity.activityCode || `ACT-${Date.now()}`,
        title: activity.activityName,
        titleAr: activity.activityNameAr,
        description: activity.description,
        responsible: activity.responsiblePerson,
        startDate: activity.startDate,
        endDate: activity.endDate,
        isSynced: true,
        createdBy: ctx.user?.id,
      });
      return { id: result[0].insertId };
    }),

  updatePlanActivity: scopedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      responsible: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["Not Started", "Ongoing", "Completed"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(projectPlanActivities)
        .set({ ...updates, updatedBy: ctx.user?.id })
        .where(eq(projectPlanActivities.id, id));
      return { success: true };
    }),

  deletePlanActivity: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(projectPlanActivities)
        .set({ 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id 
        })
        .where(eq(projectPlanActivities.id, input.id));
      return { success: true };
    }),

  // ============================================================================
  // PLAN TASKS CRUD
  // ============================================================================
  
  getPlanTasks: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      planActivityId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId } = ctx.scope;
      
      const tasks = await db.select()
        .from(projectPlanTasks)
        .where(and(
          eq(projectPlanTasks.projectId, input.projectId),
          eq(projectPlanTasks.organizationId, organizationId),
          eq(projectPlanTasks.isDeleted, false),
          input.planActivityId ? eq(projectPlanTasks.planActivityId, input.planActivityId) : undefined
        ))
        .orderBy(projectPlanTasks.code);
      return tasks;
    }),

  createPlanTask: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      planActivityId: z.number(),
      code: z.string(),
      title: z.string(),
      titleAr: z.string().optional(),
      responsible: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db.insert(projectPlanTasks).values({
        projectId: input.projectId,
        organizationId,
        operatingUnitId,
        planActivityId: input.planActivityId,
        code: input.code,
        title: input.title,
        titleAr: input.titleAr,
        responsible: input.responsible,
        startDate: input.startDate,
        endDate: input.endDate,
        createdBy: ctx.user?.id,
      });
      return { id: result[0].insertId };
    }),

  updatePlanTask: scopedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      titleAr: z.string().optional(),
      responsible: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.enum(["Not Started", "Ongoing", "Completed"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(projectPlanTasks)
        .set({ ...updates, updatedBy: ctx.user?.id })
        .where(eq(projectPlanTasks.id, id));
      return { success: true };
    }),

  deletePlanTask: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(projectPlanTasks)
        .set({ 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id 
        })
        .where(eq(projectPlanTasks.id, input.id));
      return { success: true };
    }),

  // ============================================================================
  // DROPDOWN LISTS (for Activity selection)
  // ============================================================================
  
  getActivitiesDropdown: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId } = ctx.scope;
      
      // Get activities from Activities tab that are not already linked
      const activitiesList = await db.select({
        id: activities.id,
        activityCode: activities.activityCode,
        activityName: activities.activityName,
      })
        .from(activities)
        .where(and(
          eq(activities.projectId, input.projectId),
          eq(activities.organizationId, organizationId),
          eq(activities.isDeleted, false)
        ))
        .orderBy(activities.activityCode);
      return activitiesList;
    }),

  getPlanActivitiesDropdown: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { organizationId } = ctx.scope;
      
      const planActivitiesList = await db.select({
        id: projectPlanActivities.id,
        code: projectPlanActivities.code,
        title: projectPlanActivities.title,
      })
        .from(projectPlanActivities)
        .where(and(
          eq(projectPlanActivities.projectId, input.projectId),
          eq(projectPlanActivities.organizationId, organizationId),
          eq(projectPlanActivities.isDeleted, false)
        ))
        .orderBy(projectPlanActivities.code);
      return planActivitiesList;
    }),
});
