import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { mealSurveys, mealSurveyQuestions, mealSurveySubmissions } from "../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

/**
 * Middleware: Data isolation for Surveys.
 * Module-level permissions are enforced through central Settings (Level 1).
 * This procedure ensures data is scoped to organization and operating unit.
 */
const surveyProcedure = scopedProcedure.use(async ({ ctx, next }) => {
  const userId = ctx.user?.id;
  const orgId = ctx.scope?.organizationId;
  if (!userId || !orgId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  // Module-level permissions already enforced by central Settings system
  // No additional screen-level permission check needed
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
        eq(mealSurveys.isDeleted, 0),
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
            eq(mealSurveys.isDeleted, 0)
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
        eq(mealSurveys.isDeleted, 0),
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
            eq(mealSurveySubmissions.isDeleted, 0)
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
        isAnonymous: input.isAnonymous? 1 : 0,
        allowMultipleSubmissions: input.allowMultipleSubmissions? 1 : 0,
        requiresApproval: input.requiresApproval? 1 : 0,
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
      
      // ✅ FIXED: Convert booleans before update
      const updateValues: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(updateData)) {
        if (key === 'isAnonymous' || key === 'allowMultipleSubmissions' || key === 'requiresApproval') {
          if (value !== undefined) {
            updateValues[key] = value ? 1 : 0;  // ✅ Convert: true → 1, false → 0
          }
        } else {
          if (value !== undefined) {
            updateValues[key] = value;
          }
        }
      }
      
      updateValues.updatedBy = ctx.user?.id;
      
      await db
        .update(mealSurveys)
        .set(updateValues)
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
          isDeleted: 1,
          deletedAt: nowSql,
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
              eq(mealSurveyQuestions.isDeleted, 0)
            )
          )
          .orderBy(mealSurveyQuestions.order);
      }),

    // Create question with scope enforcement
    // MANDATORY: Sets organizationId and operatingUnitId from ctx.scope
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
        isRequired: 0,
        order: z.number().default(0),
        sectionId: z.string().optional(),
        sectionTitle: z.string().optional(),
        sectionTitleAr: z.string().optional(),
        options: z.any().optional(),
        validationRules: z.any().optional(),
        skipLogic: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { organizationId, operatingUnitId } = ctx.scope;
        
        // Verify survey belongs to current scope
        const [survey] = await db
          .select()
          .from(mealSurveys)
          .where(and(
            eq(mealSurveys.id, input.surveyId),
            eq(mealSurveys.organizationId, organizationId),
            eq(mealSurveys.operatingUnitId, operatingUnitId)
          ))
          .limit(1);
        
        if (!survey) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Survey not found or access denied' 
          });
        }
        
        const result = await db.insert(mealSurveyQuestions).values({
          surveyId: input.surveyId,
          organizationId,
          operatingUnitId,
          questionCode: input.questionCode,
          questionText: input.questionText,
          questionTextAr: input.questionTextAr,
          helpText: input.helpText,
          helpTextAr: input.helpTextAr,
          questionType: input.questionType,
          isRequired: input.isRequired? 1 : 0,
          order: input.order,
          sectionId: input.sectionId,
          sectionTitle: input.sectionTitle,
          sectionTitleAr: input.sectionTitleAr,
          options: input.options,
          validationRules: input.validationRules,
          skipLogic: input.skipLogic,
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        
        return { id: result[0].insertId, success: true };
      }),

    // Update question with scope validation
    // MANDATORY: Verifies question belongs to survey in current scope
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
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { organizationId, operatingUnitId } = ctx.scope;
        const { id, ...updateData } = input;
        
        // Verify question belongs to survey in current scope
        const [question] = await db
          .select()
          .from(mealSurveyQuestions)
          .where(and(
            eq(mealSurveyQuestions.id, id),
            eq(mealSurveyQuestions.organizationId, organizationId),
            eq(mealSurveyQuestions.operatingUnitId, operatingUnitId)
          ))
          .limit(1);
        
        if (!question) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Question not found or access denied' 
          });
        }
        
        // ✅ FIXED: Convert booleans before update
        const updateValues: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(updateData)) {
          if (key === 'isRequired') {
            if (value !== undefined) {
              updateValues[key] = value ? 1 : 0;  // ✅ Convert: true → 1, false → 0
            }
          } else {
            if (value !== undefined) {
              updateValues[key] = value;
            }
          }
        }
        
        updateValues.updatedBy = ctx.user?.id;
        
        // Now safe to update
        await db
          .update(mealSurveyQuestions)
          .set(updateValues)
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
            isDeleted: 1,
            deletedAt: nowSql,
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
          eq(mealSurveySubmissions.isDeleted, 0),
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
              eq(mealSurveySubmissions.isDeleted, 0)
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
            validatedAt: nowSql,
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
            isDeleted: 1,
            deletedAt: nowSql,
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
              eq(mealSurveySubmissions.isDeleted, 0)
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
