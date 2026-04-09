import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { emailTemplateVersion, emailTemplateABTest, emailTemplates } from "../../drizzle/schema";
import { eq, and, desc, gt } from "drizzle-orm";

export const emailTemplateVersionRouter = router({
  /**
   * Get all versions of a template
   */
  getVersions: protectedProcedure
    .input(z.object({ templateId: z.number(), organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Verify template belongs to organization
        const template = await dbInstance
          .select()
          .from(emailTemplates)
          .where(
            and(
              eq(emailTemplates.id, input.templateId),
              eq(emailTemplates.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        const versions = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(eq(emailTemplateVersion.templateId, input.templateId))
          .orderBy(desc(emailTemplateVersion.versionNumber));

        return versions;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching template versions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch template versions",
        });
      }
    }),

  /**
   * Get a specific version
   */
  getVersion: protectedProcedure
    .input(z.object({ versionId: z.number(), organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        const version = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(
            and(
              eq(emailTemplateVersion.id, input.versionId),
              eq(emailTemplateVersion.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!version) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template version not found",
          });
        }

        return version;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching template version:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch template version",
        });
      }
    }),

  /**
   * Create a new template version
   */
  createVersion: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        organizationId: z.number(),
        name: z.string(),
        nameAr: z.string().optional(),
        subject: z.string(),
        subjectAr: z.string().optional(),
        bodyHtml: z.string(),
        bodyHtmlAr: z.string().optional(),
        changeDescription: z.string().optional(),
        changeDescriptionAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Verify template exists
        const template = await dbInstance
          .select()
          .from(emailTemplates)
          .where(
            and(
              eq(emailTemplates.id, input.templateId),
              eq(emailTemplates.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        // Get next version number
        const lastVersion = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(eq(emailTemplateVersion.templateId, input.templateId))
          .orderBy(desc(emailTemplateVersion.versionNumber))
          .then((rows) => rows[0]);

        const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

        const result = await dbInstance.insert(emailTemplateVersion).values({
          organizationId: input.organizationId,
          templateId: input.templateId,
          versionNumber: nextVersionNumber,
          templateKey: template.templateKey,
          name: input.name,
          nameAr: input.nameAr || null,
          subject: input.subject,
          subjectAr: input.subjectAr || null,
          bodyHtml: input.bodyHtml,
          bodyHtmlAr: input.bodyHtmlAr || null,
          changeDescription: input.changeDescription || null,
          changeDescriptionAr: input.changeDescriptionAr || null,
          isPublished: 0,
          createdBy: ctx.user.id,
        });

        console.log(`[TemplateVersion] Created version ${nextVersionNumber} for template ${input.templateId}`);

        return {
          id: result[0],
          versionNumber: nextVersionNumber,
          message: "Template version created successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error creating template version:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create template version",
        });
      }
    }),

  /**
   * Publish a template version (make it active)
   */
  publishVersion: protectedProcedure
    .input(z.object({ versionId: z.number(), organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Get the version
        const version = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(
            and(
              eq(emailTemplateVersion.id, input.versionId),
              eq(emailTemplateVersion.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!version) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template version not found",
          });
        }

        // Unpublish all other versions of this template
        await dbInstance
          .update(emailTemplateVersion)
          .set({ isPublished: 0 })
          .where(eq(emailTemplateVersion.templateId, version.templateId));

        // Publish this version
        await dbInstance
          .update(emailTemplateVersion)
          .set({
            isPublished: 1,
            publishedAt: new Date(),
            publishedBy: ctx.user.id,
          })
          .where(eq(emailTemplateVersion.id, input.versionId));

        console.log(`[TemplateVersion] Published version ${version.versionNumber} for template ${version.templateId}`);

        return { message: "Template version published successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error publishing template version:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to publish template version",
        });
      }
    }),

  /**
   * Rollback to a previous version
   */
  rollback: protectedProcedure
    .input(z.object({ versionId: z.number(), organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Get the version to rollback to
        const versionToRollback = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(
            and(
              eq(emailTemplateVersion.id, input.versionId),
              eq(emailTemplateVersion.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!versionToRollback) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template version not found",
          });
        }

        // Get the next version number
        const lastVersion = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(eq(emailTemplateVersion.templateId, versionToRollback.templateId))
          .orderBy(desc(emailTemplateVersion.versionNumber))
          .then((rows) => rows[0]);

        const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

        // Create a new version with the rolled-back content
        const result = await dbInstance.insert(emailTemplateVersion).values({
          organizationId: versionToRollback.organizationId,
          templateId: versionToRollback.templateId,
          versionNumber: nextVersionNumber,
          templateKey: versionToRollback.templateKey,
          name: versionToRollback.name,
          nameAr: versionToRollback.nameAr,
          subject: versionToRollback.subject,
          subjectAr: versionToRollback.subjectAr,
          bodyHtml: versionToRollback.bodyHtml,
          bodyHtmlAr: versionToRollback.bodyHtmlAr,
          changeDescription: `Rolled back from version ${versionToRollback.versionNumber}`,
          changeDescriptionAr: `تم الرجوع من الإصدار ${versionToRollback.versionNumber}`,
          isPublished: 1,
          publishedAt: new Date(),
          publishedBy: ctx.user.id,
          createdBy: ctx.user.id,
        });

        console.log(`[TemplateVersion] Rolled back to version ${versionToRollback.versionNumber}, created version ${nextVersionNumber}`);

        return {
          id: result[0],
          versionNumber: nextVersionNumber,
          message: "Template rolled back successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error rolling back template version:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to rollback template version",
        });
      }
    }),

  /**
   * Delete a template version
   */
  deleteVersion: protectedProcedure
    .input(z.object({ versionId: z.number(), organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Get the version
        const version = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(
            and(
              eq(emailTemplateVersion.id, input.versionId),
              eq(emailTemplateVersion.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!version) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template version not found",
          });
        }

        if (version.isPublished) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot delete a published version. Publish another version first.",
          });
        }

        await dbInstance.delete(emailTemplateVersion).where(eq(emailTemplateVersion.id, input.versionId));

        console.log(`[TemplateVersion] Deleted version ${version.versionNumber} for template ${version.templateId}`);

        return { message: "Template version deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error deleting template version:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete template version",
        });
      }
    }),

  /**
   * Create A/B test
   */
  createABTest: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        organizationId: z.number(),
        testName: z.string(),
        testNameAr: z.string().optional(),
        testDescription: z.string().optional(),
        testDescriptionAr: z.string().optional(),
        versionAId: z.number(),
        versionBId: z.number(),
        trafficSplitPercentage: z.number().min(1).max(99),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Verify both versions exist and belong to the template
        const versionA = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(
            and(
              eq(emailTemplateVersion.id, input.versionAId),
              eq(emailTemplateVersion.templateId, input.templateId)
            )
          )
          .then((rows) => rows[0]);

        const versionB = await dbInstance
          .select()
          .from(emailTemplateVersion)
          .where(
            and(
              eq(emailTemplateVersion.id, input.versionBId),
              eq(emailTemplateVersion.templateId, input.templateId)
            )
          )
          .then((rows) => rows[0]);

        if (!versionA || !versionB) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "One or both template versions not found",
          });
        }

        const result = await dbInstance.insert(emailTemplateABTest).values({
          organizationId: input.organizationId,
          templateId: input.templateId,
          testName: input.testName,
          testNameAr: input.testNameAr || null,
          testDescription: input.testDescription || null,
          testDescriptionAr: input.testDescriptionAr || null,
          versionAId: input.versionAId,
          versionBId: input.versionBId,
          status: "draft",
          trafficSplitPercentage: input.trafficSplitPercentage,
          createdBy: ctx.user.id,
        });

        console.log(`[ABTest] Created A/B test for template ${input.templateId}`);

        return {
          id: result[0],
          message: "A/B test created successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error creating A/B test:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create A/B test",
        });
      }
    }),

  /**
   * Get A/B tests for a template
   */
  getABTests: protectedProcedure
    .input(z.object({ templateId: z.number(), organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        const tests = await dbInstance
          .select()
          .from(emailTemplateABTest)
          .where(
            and(
              eq(emailTemplateABTest.templateId, input.templateId),
              eq(emailTemplateABTest.organizationId, input.organizationId)
            )
          )
          .orderBy(desc(emailTemplateABTest.createdAt));

        return tests;
      } catch (error) {
        console.error("Error fetching A/B tests:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch A/B tests",
        });
      }
    }),

  /**
   * Start an A/B test
   */
  startABTest: protectedProcedure
    .input(z.object({ testId: z.number(), organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Get the test
        const test = await dbInstance
          .select()
          .from(emailTemplateABTest)
          .where(
            and(
              eq(emailTemplateABTest.id, input.testId),
              eq(emailTemplateABTest.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!test) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "A/B test not found",
          });
        }

        if (test.status !== "draft") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only draft tests can be started",
          });
        }

        await dbInstance
          .update(emailTemplateABTest)
          .set({
            status: "running",
            startedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(emailTemplateABTest.id, input.testId));

        console.log(`[ABTest] Started A/B test ${input.testId}`);

        return { message: "A/B test started successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error starting A/B test:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start A/B test",
        });
      }
    }),

  /**
   * End an A/B test and declare winner
   */
  endABTest: protectedProcedure
    .input(
      z.object({
        testId: z.number(),
        organizationId: z.number(),
        winnerId: z.number(),
        winnerMetric: z.enum(["open_rate", "click_rate", "conversion_rate", "bounce_rate"]),
        confidenceLevel: z.number().optional(),
        pValue: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user.organizationIds?.includes(input.organizationId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this organization",
          });
        }

        const dbInstance = await getDb();

        // Get the test
        const test = await dbInstance
          .select()
          .from(emailTemplateABTest)
          .where(
            and(
              eq(emailTemplateABTest.id, input.testId),
              eq(emailTemplateABTest.organizationId, input.organizationId)
            )
          )
          .then((rows) => rows[0]);

        if (!test) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "A/B test not found",
          });
        }

        // Verify winner is one of the test versions
        if (input.winnerId !== test.versionAId && input.winnerId !== test.versionBId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Winner must be one of the test versions",
          });
        }

        await dbInstance
          .update(emailTemplateABTest)
          .set({
            status: "completed",
            endedAt: new Date(),
            winnerId: input.winnerId,
            winnerMetric: input.winnerMetric,
            confidenceLevel: input.confidenceLevel || null,
            pValue: input.pValue || null,
            updatedBy: ctx.user.id,
          })
          .where(eq(emailTemplateABTest.id, input.testId));

        // Publish the winner version
        await dbInstance
          .update(emailTemplateVersion)
          .set({ isPublished: 0 })
          .where(eq(emailTemplateVersion.templateId, test.templateId));

        await dbInstance
          .update(emailTemplateVersion)
          .set({
            isPublished: 1,
            publishedAt: new Date(),
            publishedBy: ctx.user.id,
          })
          .where(eq(emailTemplateVersion.id, input.winnerId));

        console.log(`[ABTest] Ended A/B test ${input.testId}, winner: version ${input.winnerId}`);

        return { message: "A/B test completed and winner published" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error ending A/B test:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to end A/B test",
        });
      }
    }),
});
