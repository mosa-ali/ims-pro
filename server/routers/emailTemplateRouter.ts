/**
 * ============================================================================
 * Email Template Router
 * ============================================================================
 * 
 * Manages email templates for organization onboarding and notifications.
 * Allows platform admins to customize email content per organization.
 * Supports bilingual templates (English and Arabic).
 * 
 * ============================================================================
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { emailTemplates } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";

export const emailTemplateRouter = router({
  /**
   * Get all email templates for an organization
   * Platform admins can view templates for any organization
   * Organization admins can only view their own organization's templates
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify access
      if (
        ctx.user.role !== "platform_admin" &&
        ctx.user.role !== "platform_super_admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can manage email templates",
        });
      }

      const dbInstance = await getDb();

      // Get all templates for the organization
      const templates = await dbInstance
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.organizationId, input.organizationId));

      return templates.map((template) => ({
        id: template.id,
        organizationId: template.organizationId,
        templateKey: template.templateKey,
        name: template.name,
        nameAr: template.nameAr,
        subject: template.subject,
        subjectAr: template.subjectAr,
        bodyHtml: template.bodyHtml,
        bodyHtmlAr: template.bodyHtmlAr,
        isActive: template.isActive === 1,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      }));
    }),

  /**
   * Get a single email template by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        templateId: z.number().positive("Template ID must be positive"),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify access
      if (
        ctx.user.role !== "platform_admin" &&
        ctx.user.role !== "platform_super_admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can manage email templates",
        });
      }

      const dbInstance = await getDb();

      const [template] = await dbInstance
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found",
        });
      }

      return {
        id: template.id,
        organizationId: template.organizationId,
        templateKey: template.templateKey,
        name: template.name,
        nameAr: template.nameAr,
        subject: template.subject,
        subjectAr: template.subjectAr,
        bodyHtml: template.bodyHtml,
        bodyHtmlAr: template.bodyHtmlAr,
        isActive: template.isActive === 1,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    }),

  /**
   * Create a new email template
   */
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
        templateKey: z
          .string()
          .min(1, "Template key is required")
          .max(100, "Template key must be less than 100 characters"),
        name: z
          .string()
          .min(1, "Template name is required")
          .max(255, "Template name must be less than 255 characters"),
        nameAr: z
          .string()
          .max(255, "Arabic template name must be less than 255 characters")
          .optional(),
        subject: z
          .string()
          .max(500, "Subject must be less than 500 characters")
          .optional(),
        subjectAr: z
          .string()
          .max(500, "Arabic subject must be less than 500 characters")
          .optional(),
        bodyHtml: z.string().optional(),
        bodyHtmlAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access
      if (
        ctx.user.role !== "platform_admin" &&
        ctx.user.role !== "platform_super_admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can create email templates",
        });
      }

      const dbInstance = await getDb();

      // Check if template key already exists for this organization
      const [existing] = await dbInstance
        .select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.organizationId, input.organizationId),
            eq(emailTemplates.templateKey, input.templateKey)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Template key already exists for this organization",
        });
      }

      // Insert new template
      const result = await dbInstance.insert(emailTemplates).values({
        organizationId: input.organizationId,
        templateKey: input.templateKey,
        name: input.name,
        nameAr: input.nameAr || null,
        subject: input.subject || null,
        subjectAr: input.subjectAr || null,
        bodyHtml: input.bodyHtml || null,
        bodyHtmlAr: input.bodyHtmlAr || null,
        isActive: 1,
      });

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        operatingUnitId: null,
        action: "email_template_created",
        entityType: "email_template",
        entityId: result.insertId as number,
        details: JSON.stringify({
          templateKey: input.templateKey,
          templateName: input.name,
          createdBy: ctx.user.email,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        id: result.insertId,
        organizationId: input.organizationId,
        templateKey: input.templateKey,
        name: input.name,
        nameAr: input.nameAr || null,
        subject: input.subject || null,
        subjectAr: input.subjectAr || null,
        bodyHtml: input.bodyHtml || null,
        bodyHtmlAr: input.bodyHtmlAr || null,
        isActive: true,
      };
    }),

  /**
   * Update an existing email template
   */
  update: protectedProcedure
    .input(
      z.object({
        templateId: z.number().positive("Template ID must be positive"),
        name: z
          .string()
          .min(1, "Template name is required")
          .max(255, "Template name must be less than 255 characters")
          .optional(),
        nameAr: z
          .string()
          .max(255, "Arabic template name must be less than 255 characters")
          .optional(),
        subject: z
          .string()
          .max(500, "Subject must be less than 500 characters")
          .optional(),
        subjectAr: z
          .string()
          .max(500, "Arabic subject must be less than 500 characters")
          .optional(),
        bodyHtml: z.string().optional(),
        bodyHtmlAr: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access
      if (
        ctx.user.role !== "platform_admin" &&
        ctx.user.role !== "platform_super_admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can update email templates",
        });
      }

      const dbInstance = await getDb();

      // Get template
      const [template] = await dbInstance
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found",
        });
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.nameAr !== undefined) updateData.nameAr = input.nameAr;
      if (input.subject !== undefined) updateData.subject = input.subject;
      if (input.subjectAr !== undefined) updateData.subjectAr = input.subjectAr;
      if (input.bodyHtml !== undefined) updateData.bodyHtml = input.bodyHtml;
      if (input.bodyHtmlAr !== undefined) updateData.bodyHtmlAr = input.bodyHtmlAr;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

      // Update template
      await dbInstance
        .update(emailTemplates)
        .set(updateData)
        .where(eq(emailTemplates.id, input.templateId));

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: template.organizationId,
        operatingUnitId: null,
        action: "email_template_updated",
        entityType: "email_template",
        entityId: input.templateId,
        details: JSON.stringify({
          templateKey: template.templateKey,
          updatedFields: Object.keys(updateData),
          updatedBy: ctx.user.email,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        id: template.id,
        organizationId: template.organizationId,
        templateKey: template.templateKey,
        ...updateData,
      };
    }),

  /**
   * Delete an email template
   */
  delete: protectedProcedure
    .input(
      z.object({
        templateId: z.number().positive("Template ID must be positive"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access
      if (
        ctx.user.role !== "platform_admin" &&
        ctx.user.role !== "platform_super_admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can delete email templates",
        });
      }

      const dbInstance = await getDb();

      // Get template
      const [template] = await dbInstance
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found",
        });
      }

      // Delete template
      await dbInstance
        .delete(emailTemplates)
        .where(eq(emailTemplates.id, input.templateId));

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: template.organizationId,
        operatingUnitId: null,
        action: "email_template_deleted",
        entityType: "email_template",
        entityId: input.templateId,
        details: JSON.stringify({
          templateKey: template.templateKey,
          templateName: template.name,
          deletedBy: ctx.user.email,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: true,
        templateId: input.templateId,
      };
    }),

  /**
   * Get template by key for a specific organization
   * Used by email service to fetch the appropriate template
   */
  getByKey: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
        templateKey: z.string().min(1, "Template key is required"),
      })
    )
    .query(async ({ input, ctx }) => {
      const dbInstance = await getDb();

      const [template] = await dbInstance
        .select()
        .from(emailTemplates)
        .where(
          and(
            eq(emailTemplates.organizationId, input.organizationId),
            eq(emailTemplates.templateKey, input.templateKey),
            eq(emailTemplates.isActive, 1)
          )
        )
        .limit(1);

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Email template '${input.templateKey}' not found for organization`,
        });
      }

      return {
        id: template.id,
        organizationId: template.organizationId,
        templateKey: template.templateKey,
        name: template.name,
        nameAr: template.nameAr,
        subject: template.subject,
        subjectAr: template.subjectAr,
        bodyHtml: template.bodyHtml,
        bodyHtmlAr: template.bodyHtmlAr,
        isActive: template.isActive === 1,
      };
    }),
});
