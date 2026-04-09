import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { tasks, projects, users } from "../drizzle/schema";
import { eq, and, desc, ne } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tasks Router - Project Tasks Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 * 
 * PLATFORM-LEVEL ISOLATION: Uses scopedProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */
export const tasksRouter = router({
  // Get all tasks for a project (excludes soft-deleted)
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getByProject: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      return await db.select().from(tasks).where(
          and(
            eq(tasks.projectId, input.projectId),
            eq(tasks.organizationId, organizationId),
            eq(tasks.operatingUnitId, operatingUnitId),
            eq(tasks.isDeleted, false)
          )
        ).orderBy(desc(tasks.createdAt));
    }),

  // Get statistics for Overview tab (excludes soft-deleted)
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  getStatistics: scopedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const all = await db.select().from(tasks).where(
          and(
            eq(tasks.projectId, input.projectId),
            eq(tasks.organizationId, organizationId),
            eq(tasks.operatingUnitId, operatingUnitId),
            eq(tasks.isDeleted, false)
          )
        );
      
      return {
        total: all.length,
        todo: all.filter((t: any) => t.status === 'TODO').length,
        inProgress: all.filter((t: any) => t.status === 'IN_PROGRESS').length,
        review: all.filter((t: any) => t.status === 'REVIEW').length,
        done: all.filter((t: any) => t.status === 'DONE').length,
      };
    }),

  // Get available users for assignment dropdown
  // Uses scopedProcedure - organizationId comes from ctx.scope
  getAvailableAssignees: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all users with email addresses for this organization
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      }).from(users).where(
        // Only users with valid emails
        and(
          // email is not null
        )
      );
      
      // Filter to users with valid emails
      return allUsers.filter(u => u.email && emailRegex.test(u.email));
    }),

  // Create task with MANDATORY assignment fields
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  create: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      taskCode: z.string().optional(),
      taskName: z.string(),
      taskNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']).default('TODO'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      dueDate: z.string().optional(),
      startDate: z.string().optional(),
      completedDate: z.string().optional(),
      // MANDATORY Assignment fields (Accountability Model)
      assignedToEmail: z.string().email("Valid email is required for assignee"),
      assignedToName: z.string().min(1, "Assignee name is required"),
      // Legacy field - optional
      assignedTo: z.number().optional(),
      progressPercentage: z.string().default('0.00'),
      tags: z.string().optional(),
      category: z.string().optional(),
      activityId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Validate assignee email format
      if (!emailRegex.test(input.assignedToEmail)) {
        throw new Error("Invalid assignee email format");
      }
      
      // Validate assignee name is not empty
      if (!input.assignedToName || input.assignedToName.trim() === '') {
        throw new Error("Assignee name is required");
      }
      
      // Verify project belongs to current scope
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!project) {
        throw new Error("Project not found");
      }
      
      // Get assigner info from authenticated user
      const assignerEmail = ctx.user?.email || '';
      const assignerName = ctx.user?.name || 'System';
      
      const { startDate, dueDate, completedDate, tags, ...rest } = input;
      const insertData = {
        ...rest,
        organizationId,
        operatingUnitId,
        // Assignment accountability fields
        assignedByEmail: assignerEmail,
        assignedByName: assignerName,
        assignmentDate: new Date(),
        // Date fields
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        completedDate: completedDate ? new Date(completedDate) : null,
        tags: tags ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : null,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      };
      
      const result = await db.insert(tasks).values(insertData);
      const taskId = result[0].insertId;
      
      // Send email notification to assignee
      try {
        const projectName = project.projectCode || `Project #${project.id}`;
        const taskLink = `${process.env.VITE_FRONTEND_FORGE_API_URL || ''}/organization/${organizationId}/operating-unit/${operatingUnitId}/project/${project.id}?tab=tasks`;
        
        await notifyOwner({
          title: `New Task Assigned: ${input.taskName}`,
          content: `
**Task Assignment Notification**

A new task has been assigned to ${input.assignedToName} (${input.assignedToEmail}).

**Task Details:**
- **Task Title:** ${input.taskName}
- **Project:** ${projectName}
- **Assigned By:** ${assignerName} (${assignerEmail})
- **Due Date:** ${dueDate || 'Not specified'}
- **Priority:** ${input.priority}

**Description:**
${input.description || 'No description provided'}

---
This is an automated notification from the IMS system.
          `.trim(),
        });
      } catch (emailError) {
        // Log but don't fail the task creation
        console.error('Failed to send task assignment notification:', emailError);
      }
      
      return { success: true, id: taskId };
    }),

  // Update task with reassignment tracking
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      taskName: z.string().optional(),
      taskNameAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      dueDate: z.string().optional(),
      startDate: z.string().optional(),
      completedDate: z.string().optional(),
      // Assignment fields for reassignment
      assignedToEmail: z.string().email().optional(),
      assignedToName: z.string().optional(),
      assignedTo: z.number().optional(),
      progressPercentage: z.string().optional(),
      tags: z.string().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Get existing task to check for reassignment and verify scope
      const [existingTask] = await db.select().from(tasks)
        .where(and(
          eq(tasks.id, input.id),
          eq(tasks.organizationId, organizationId),
          eq(tasks.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!existingTask) {
        throw new Error("Task not found");
      }
      
      const { id, startDate, dueDate, completedDate, tags, assignedToEmail, assignedToName, ...updateData } = input;
      const updatePayload: Record<string, unknown> = { ...updateData, updatedBy: ctx.user?.id };
      
      if (startDate) updatePayload.startDate = new Date(startDate);
      if (dueDate) updatePayload.dueDate = new Date(dueDate);
      if (completedDate) updatePayload.completedDate = new Date(completedDate);
      if (tags !== undefined) updatePayload.tags = tags ? tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : null;
      
      // Handle reassignment
      const isReassignment = assignedToEmail && assignedToEmail !== existingTask.assignedToEmail;
      
      if (assignedToEmail) {
        // Validate email format
        if (!emailRegex.test(assignedToEmail)) {
          throw new Error("Invalid assignee email format");
        }
        updatePayload.assignedToEmail = assignedToEmail;
      }
      
      if (assignedToName) {
        updatePayload.assignedToName = assignedToName;
      }
      
      // If reassignment, update assignment metadata
      if (isReassignment) {
        updatePayload.assignedByEmail = ctx.user?.email || '';
        updatePayload.assignedByName = ctx.user?.name || 'System';
        updatePayload.assignmentDate = new Date();
        
        // Send notification for reassignment
        try {
          const [project] = await db.select().from(projects).where(eq(projects.id, existingTask.projectId)).limit(1);
          const projectName = project?.code || `Project #${existingTask.projectId}`;
          
          await notifyOwner({
            title: `Task Reassigned: ${existingTask.taskName}`,
            content: `
**Task Reassignment Notification**

A task has been reassigned to ${assignedToName || 'Unknown'} (${assignedToEmail}).

**Task Details:**
- **Task Title:** ${existingTask.taskName}
- **Project:** ${projectName}
- **Previous Assignee:** ${existingTask.assignedToName || 'None'} (${existingTask.assignedToEmail || 'N/A'})
- **New Assignee:** ${assignedToName || 'Unknown'} (${assignedToEmail})
- **Reassigned By:** ${ctx.user?.name || 'System'} (${ctx.user?.email || 'N/A'})
- **Due Date:** ${existingTask.dueDate || 'Not specified'}

---
This is an automated notification from the IMS system.
            `.trim(),
          });
        } catch (emailError) {
          console.error('Failed to send task reassignment notification:', emailError);
        }
      }
      
      await db.update(tasks).set(updatePayload)
        .where(and(
          eq(tasks.id, id),
          eq(tasks.organizationId, organizationId),
          eq(tasks.operatingUnitId, operatingUnitId)
        ));
      return { success: true };
    }),

  // BULK IMPORT FROM EXCEL
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  bulkImport: scopedProcedure
    .input(z.object({
      projectId: z.number(),
      rows: z.array(z.record(z.string(), z.any())),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify project belongs to current scope
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!project) {
        throw new Error("Project not found");
      }

      const { validateRow } = await import('../shared/importFramework');
      const { TASKS_CONFIG } = await import('../shared/importConfigs/tasks');

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{
          row: number;
          field: string;
          value: any;
          errorType: string;
          message: string;
          suggestedFix?: string;
          originalData: Record<string, any>;
        }>,
      };

      // Get assigner info from authenticated user
      const assignerEmail = ctx.user?.email || '';
      const assignerName = ctx.user?.name || 'System';

      for (let i = 0; i < input.rows.length; i++) {
        const rowData = input.rows[i];
        const rowNumber = i + 2;

        try {
          const validation = validateRow(rowData, rowNumber, { ...TASKS_CONFIG, language: 'en' });

          if (!validation.isValid) {
            validation.errors.forEach(error => {
              results.errors.push({
                row: rowNumber,
                field: error.field,
                value: error.value,
                errorType: error.errorType,
                message: error.message,
                suggestedFix: error.suggestedFix,
                originalData: rowData,
              });
            });
            results.skipped++;
            continue;
          }

          // Validate assignee email if provided
          const assigneeEmail = validation.data.assignedToEmail || rowData['Assigned To Email'] || '';
          const assigneeName = validation.data.assignedToName || rowData['Assigned To Name'] || '';
          
          if (assigneeEmail && !emailRegex.test(assigneeEmail)) {
            results.errors.push({
              row: rowNumber,
              field: 'assignedToEmail',
              value: assigneeEmail,
              errorType: 'validation',
              message: 'Invalid email format for assignee',
              suggestedFix: 'Provide a valid email address',
              originalData: rowData,
            });
            results.skipped++;
            continue;
          }

          await db.insert(tasks).values({
            projectId: input.projectId,
            organizationId,
            operatingUnitId,
            taskName: validation.data.taskName,
            taskNameAr: validation.data.taskNameAr,
            description: validation.data.description,
            descriptionAr: validation.data.descriptionAr,
            status: validation.data.status || 'TODO',
            priority: validation.data.priority || 'MEDIUM',
            startDate: validation.data.startDate,
            dueDate: validation.data.dueDate,
            completedDate: validation.data.completedDate,
            assignedTo: validation.data.assignedTo,
            assignedToName: assigneeName || validation.data.assignedToName,
            assignedToEmail: assigneeEmail,
            assignedByEmail: assignerEmail,
            assignedByName: assignerName,
            assignmentDate: new Date(),
            progressPercentage: validation.data.progressPercentage?.toString() || '0.00',
            tags: validation.data.tags,
            category: validation.data.category,
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          results.imported++;
        } catch (error: any) {
          results.errors.push({
            row: rowNumber,
            field: 'system',
            value: null,
            errorType: 'system',
            message: 'A system error occurred while processing this record',
            suggestedFix: 'Please contact support if this error persists',
            originalData: rowData,
          });
          results.skipped++;
        }
      }

      return results;
    }),

  // Soft delete task
  // Uses scopedProcedure - organizationId and operatingUnitId come from ctx.scope
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Verify task belongs to current scope
      const [task] = await db.select().from(tasks)
        .where(and(
          eq(tasks.id, input.id),
          eq(tasks.organizationId, organizationId),
          eq(tasks.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!task) {
        throw new Error("Task not found");
      }
      
      await db.update(tasks).set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        }).where(and(
          eq(tasks.id, input.id),
          eq(tasks.organizationId, organizationId),
          eq(tasks.operatingUnitId, operatingUnitId)
        ));
      
      return { success: true };
    }),
});
