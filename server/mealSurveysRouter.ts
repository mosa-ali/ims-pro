import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { mealSurveys, mealSurveyQuestions, mealSurveySubmissions } from "../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { canAccess, logSensitiveAccess } from "./rbacService";
import { TRPCError } from "@trpc/server";
import { isPlatformAdmin } from "../shared/const";

/**
 * Middleware: Enforce RBAC for Surveys (sensitive workspace).
 * Requires explicit screen-level permission for surveys.
 */
const surveyProcedure = scopedProcedure.use(async ({ ctx, next }) => {
  const userId = ctx.user?.id;
  const orgId = ctx.scope?.organizationId;
  if (!userId || !orgId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (isPlatformAdmin(ctx.user?.role)) return next({ ctx });
  const allowed = await canAccess(userId, orgId, 'meal', 'surveys', undefined, 'view');
  if (!allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to access Surveys. This is a sensitive workspace requiring explicit authorization.' });
  }
  await logSensitiveAccess(userId, orgId, null, 'sensitive_access', 'meal', 'surveys', 'survey_management');
  return next({ ctx });
});

/**
 * MEAL Surveys Router - Survey Management for MEAL Module
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 * 
 * PLATFORM-LEVEL ISOLATION: Uses surveyProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */
export const mealSurveysRouter = router({
  // Get all surveys for an organization (excludes soft-deleted)
  // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
  getAll: surveyProcedure
    .input(z.object({
      projectId: z.number().optional(),
      status: z.enum(["draft", "published", "closed", "archived"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const conditions = [
        eq(mealSurveys.organizationId, organizationId),
        eq(mealSurveys.operatingUnitId, operatingUnitId),
        eq(mealSurveys.isDeleted, false),
      ];
      
      if (input.projectId) {
        conditions.push(eq(mealSurveys.projectId, input.projectId));
      }
      if (input.status) {
        conditions.push(eq(mealSurveys.status, input.status));
      }
      
      return await db
        .select()
        .from(mealSurveys)
        .where(and(...conditions))
        .orderBy(desc(mealSurveys.createdAt));
    }),

  // Get single survey by ID
  // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
  getById: surveyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db
        .select()
        .from(mealSurveys)
        .where(
          and(
            eq(mealSurveys.id, input.id),
            eq(mealSurveys.organizationId, organizationId),
            eq(mealSurveys.operatingUnitId, operatingUnitId),
            eq(mealSurveys.isDeleted, false)
          )
        )
        .limit(1);
      
      return result[0] || null;
    }),

  // Get statistics for dashboard
  // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
  getStatistics: surveyProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const conditions = [
        eq(mealSurveys.organizationId, organizationId),
        eq(mealSurveys.operatingUnitId, operatingUnitId),
        eq(mealSurveys.isDeleted, false),
      ];
      
      const allSurveys = await db
        .select()
        .from(mealSurveys)
        .where(and(...conditions));
      
      const draft = allSurveys.filter(s => s.status === 'draft').length;
      const published = allSurveys.filter(s => s.status === 'published').length;
      const closed = allSurveys.filter(s => s.status === 'closed').length;
      const archived = allSurveys.filter(s => s.status === 'archived').length;
      
      // Get total submissions count
      const submissionsResult = await db
        .select({ count: count() })
        .from(mealSurveySubmissions)
        .where(
          and(
            eq(mealSurveySubmissions.organizationId, organizationId),
            eq(mealSurveySubmissions.operatingUnitId, operatingUnitId),
            eq(mealSurveySubmissions.isDeleted, false)
          )
        );
      
      return {
        total: allSurveys.length,
        draft,
        published,
        closed,
        archived,
        totalSubmissions: submissionsResult[0]?.count || 0,
      };
    }),

  // Create survey
  // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
  create: surveyProcedure
    .input(z.object({
      projectId: z.number().optional(),
      surveyCode: z.string(),
      title: z.string(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      surveyType: z.enum(["baseline", "endline", "monitoring", "assessment", "feedback", "custom"]).default("custom"),
      status: z.enum(["draft", "published", "closed", "archived"]).default("draft"),
      isAnonymous: z.boolean().default(false),
      allowMultipleSubmissions: z.boolean().default(false),
      requiresApproval: z.boolean().default(false),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      formConfig: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const result = await db.insert(mealSurveys).values({
        organizationId,
        operatingUnitId,
        projectId: input.projectId,
        surveyCode: input.surveyCode,
        title: input.title,
        titleAr: input.titleAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        surveyType: input.surveyType,
        status: input.status,
        isAnonymous: input.isAnonymous,
        allowMultipleSubmissions: input.allowMultipleSubmissions,
        requiresApproval: input.requiresApproval,
        startDate: input.startDate,
        endDate: input.endDate,
        formConfig: input.formConfig,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      return { id: result[0].insertId, success: true };
    }),

  // Update survey
  // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
  update: surveyProcedure
    .input(z.object({
      id: z.number(),
      surveyCode: z.string().optional(),
      title: z.string().optional(),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      surveyType: z.enum(["baseline", "endline", "monitoring", "assessment", "feedback", "custom"]).optional(),
      status: z.enum(["draft", "published", "closed", "archived"]).optional(),
      isAnonymous: z.boolean().optional(),
      allowMultipleSubmissions: z.boolean().optional(),
      requiresApproval: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      formConfig: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      const { id, ...updateData } = input;
      
      // Verify survey belongs to current scope
      const [survey] = await db
        .select()
        .from(mealSurveys)
        .where(and(
          eq(mealSurveys.id, id),
          eq(mealSurveys.organizationId, organizationId),
          eq(mealSurveys.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!survey) {
        throw new Error("Survey not found");
      }
      
      await db
        .update(mealSurveys)
        .set({
          ...updateData,
          updatedBy: ctx.user?.id,
        })
        .where(and(
          eq(mealSurveys.id, id),
          eq(mealSurveys.organizationId, organizationId),
          eq(mealSurveys.operatingUnitId, operatingUnitId)
        ));
      
      return { success: true };
    }),

  // SOFT DELETE ONLY - NO HARD DELETE ALLOWED
  // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
  delete: surveyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Verify survey belongs to current scope
      const [survey] = await db
        .select()
        .from(mealSurveys)
        .where(and(
          eq(mealSurveys.id, input.id),
          eq(mealSurveys.organizationId, organizationId),
          eq(mealSurveys.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!survey) {
        throw new Error("Survey not found");
      }
      
      // MANDATORY: Soft delete only - set isDeleted = true
      await db
        .update(mealSurveys)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(mealSurveys.id, input.id),
          eq(mealSurveys.organizationId, organizationId),
          eq(mealSurveys.operatingUnitId, operatingUnitId)
        ));
      
      return { success: true };
    }),

  // ============================================================================
  // SURVEY QUESTIONS SUB-ROUTER
  // ============================================================================
  questions: router({
    // Get all questions for a survey
    getBySurvey: surveyProcedure
      .input(z.object({ surveyId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        return await db
          .select()
          .from(mealSurveyQuestions)
          .where(
            and(
              eq(mealSurveyQuestions.surveyId, input.surveyId),
              eq(mealSurveyQuestions.isDeleted, false)
            )
          )
          .orderBy(mealSurveyQuestions.order);
      }),

    // Create question
    create: surveyProcedure
      .input(z.object({
        surveyId: z.number(),
        questionCode: z.string(),
        questionText: z.string(),
        questionTextAr: z.string().optional(),
        helpText: z.string().optional(),
        helpTextAr: z.string().optional(),
        questionType: z.enum([
          "text", "textarea", "number", "email", "phone", "date", "time", "datetime",
          "select", "multiselect", "radio", "checkbox", "rating", "scale",
          "file", "image", "signature", "location", "matrix"
        ]).default("text"),
        isRequired: z.boolean().default(false),
        order: z.number().default(0),
        sectionId: z.string().optional(),
        sectionTitle: z.string().optional(),
        sectionTitleAr: z.string().optional(),
        options: z.any().optional(),
        validationRules: z.any().optional(),
        skipLogic: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(mealSurveyQuestions).values({
          surveyId: input.surveyId,
          questionCode: input.questionCode,
          questionText: input.questionText,
          questionTextAr: input.questionTextAr,
          helpText: input.helpText,
          helpTextAr: input.helpTextAr,
          questionType: input.questionType,
          isRequired: input.isRequired,
          order: input.order,
          sectionId: input.sectionId,
          sectionTitle: input.sectionTitle,
          sectionTitleAr: input.sectionTitleAr,
          options: input.options,
          validationRules: input.validationRules,
          skipLogic: input.skipLogic,
        });
        
        return { id: result[0].insertId, success: true };
      }),

    // Update question
    update: surveyProcedure
      .input(z.object({
        id: z.number(),
        questionCode: z.string().optional(),
        questionText: z.string().optional(),
        questionTextAr: z.string().optional(),
        helpText: z.string().optional(),
        helpTextAr: z.string().optional(),
        questionType: z.enum([
          "text", "textarea", "number", "email", "phone", "date", "time", "datetime",
          "select", "multiselect", "radio", "checkbox", "rating", "scale",
          "file", "image", "signature", "location", "matrix"
        ]).optional(),
        isRequired: z.boolean().optional(),
        order: z.number().optional(),
        sectionId: z.string().optional(),
        sectionTitle: z.string().optional(),
        sectionTitleAr: z.string().optional(),
        options: z.any().optional(),
        validationRules: z.any().optional(),
        skipLogic: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, ...updateData } = input;
        
        await db
          .update(mealSurveyQuestions)
          .set(updateData)
          .where(eq(mealSurveyQuestions.id, id));
        
        return { success: true };
      }),

    // Soft delete question
    delete: surveyProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db
          .update(mealSurveyQuestions)
          .set({
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: ctx.user?.id,
          })
          .where(eq(mealSurveyQuestions.id, input.id));
        
        return { success: true };
      }),

    // Bulk update order
    updateOrder: surveyProcedure
      .input(z.object({
        surveyId: z.number(),
        questions: z.array(z.object({
          id: z.number(),
          order: z.number(),
        })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        for (const q of input.questions) {
          await db
            .update(mealSurveyQuestions)
            .set({ order: q.order })
            .where(eq(mealSurveyQuestions.id, q.id));
        }
        
        return { success: true };
      }),
  }),

  // ============================================================================
  // SURVEY SUBMISSIONS SUB-ROUTER
  // ============================================================================
  submissions: router({
    // Get all submissions for a survey
    // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
    getBySurvey: surveyProcedure
      .input(z.object({
        surveyId: z.number(),
        validationStatus: z.enum(["pending", "approved", "rejected"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { organizationId, operatingUnitId } = ctx.scope;
        
        const conditions = [
          eq(mealSurveySubmissions.surveyId, input.surveyId),
          eq(mealSurveySubmissions.organizationId, organizationId),
          eq(mealSurveySubmissions.operatingUnitId, operatingUnitId),
          eq(mealSurveySubmissions.isDeleted, false),
        ];
        
        if (input.validationStatus) {
          conditions.push(eq(mealSurveySubmissions.validationStatus, input.validationStatus));
        }
        
        return await db
          .select()
          .from(mealSurveySubmissions)
          .where(and(...conditions))
          .orderBy(desc(mealSurveySubmissions.submittedAt));
      }),

    // Get single submission by ID
    // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
    getById: surveyProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { organizationId, operatingUnitId } = ctx.scope;
        
        const result = await db
          .select()
          .from(mealSurveySubmissions)
          .where(
            and(
              eq(mealSurveySubmissions.id, input.id),
              eq(mealSurveySubmissions.organizationId, organizationId),
              eq(mealSurveySubmissions.operatingUnitId, operatingUnitId),
              eq(mealSurveySubmissions.isDeleted, false)
            )
          )
          .limit(1);
        
        return result[0] || null;
      }),

    // Create submission
    // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
    create: surveyProcedure
      .input(z.object({
        surveyId: z.number(),
        projectId: z.number().optional(),
        submissionCode: z.string(),
        respondentName: z.string().optional(),
        respondentEmail: z.string().optional(),
        respondentPhone: z.string().optional(),
        responses: z.record(z.string(), z.any()),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        locationName: z.string().optional(),
        deviceInfo: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { organizationId, operatingUnitId } = ctx.scope;
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.insert(mealSurveySubmissions).values({
          surveyId: input.surveyId,
          organizationId,
          operatingUnitId,
          projectId: input.projectId,
          submissionCode: input.submissionCode,
          respondentName: input.respondentName,
          respondentEmail: input.respondentEmail,
          respondentPhone: input.respondentPhone,
          responses: input.responses,
          latitude: input.latitude?.toString(),
          longitude: input.longitude?.toString(),
          locationName: input.locationName,
          deviceInfo: input.deviceInfo,
          submittedBy: ctx.user?.id,
        });
        
        return { id: result[0].insertId, success: true };
      }),

    // Update validation status
    // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
    updateValidation: surveyProcedure
      .input(z.object({
        id: z.number(),
        validationStatus: z.enum(["pending", "approved", "rejected"]),
        validationNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { organizationId, operatingUnitId } = ctx.scope;
        
        // Verify submission belongs to current scope
        const [submission] = await db
          .select()
          .from(mealSurveySubmissions)
          .where(and(
            eq(mealSurveySubmissions.id, input.id),
            eq(mealSurveySubmissions.organizationId, organizationId),
            eq(mealSurveySubmissions.operatingUnitId, operatingUnitId)
          ))
          .limit(1);
        
        if (!submission) {
          throw new Error("Submission not found");
        }
        
        await db
          .update(mealSurveySubmissions)
          .set({
            validationStatus: input.validationStatus,
            validationNotes: input.validationNotes,
            validatedAt: new Date(),
            validatedBy: ctx.user?.id,
          })
          .where(and(
            eq(mealSurveySubmissions.id, input.id),
            eq(mealSurveySubmissions.organizationId, organizationId),
            eq(mealSurveySubmissions.operatingUnitId, operatingUnitId)
          ));
        
        return { success: true };
      }),

    // Soft delete submission
    // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
    delete: surveyProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { organizationId, operatingUnitId } = ctx.scope;
        
        // Verify submission belongs to current scope
        const [submission] = await db
          .select()
          .from(mealSurveySubmissions)
          .where(and(
            eq(mealSurveySubmissions.id, input.id),
            eq(mealSurveySubmissions.organizationId, organizationId),
            eq(mealSurveySubmissions.operatingUnitId, operatingUnitId)
          ))
          .limit(1);
        
        if (!submission) {
          throw new Error("Submission not found");
        }
        
        await db
          .update(mealSurveySubmissions)
          .set({
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: ctx.user?.id,
          })
          .where(and(
            eq(mealSurveySubmissions.id, input.id),
            eq(mealSurveySubmissions.organizationId, organizationId),
            eq(mealSurveySubmissions.operatingUnitId, operatingUnitId)
          ));
        
        return { success: true };
      }),

    // Get statistics for a survey
    // Uses surveyProcedure - organizationId and operatingUnitId come from ctx.scope
    getStatistics: surveyProcedure
      .input(z.object({ surveyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { organizationId, operatingUnitId } = ctx.scope;
        
        const allSubmissions = await db
          .select()
          .from(mealSurveySubmissions)
          .where(
            and(
              eq(mealSurveySubmissions.surveyId, input.surveyId),
              eq(mealSurveySubmissions.organizationId, organizationId),
              eq(mealSurveySubmissions.operatingUnitId, operatingUnitId),
              eq(mealSurveySubmissions.isDeleted, false)
            )
          );
        
        const pending = allSubmissions.filter(s => s.validationStatus === 'pending').length;
        const approved = allSubmissions.filter(s => s.validationStatus === 'approved').length;
        const rejected = allSubmissions.filter(s => s.validationStatus === 'rejected').length;
        
        return {
          total: allSubmissions.length,
          pending,
          approved,
          rejected,
        };
      }),
  }),
});
