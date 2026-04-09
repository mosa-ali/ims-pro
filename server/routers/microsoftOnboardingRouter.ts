/**
 * ============================================================================
 * Microsoft Onboarding Router
 * ============================================================================
 * 
 * Handles one-link tenant onboarding flow for organizations.
 * Implements the multitenant SaaS pattern per Ali's guideline.
 * 
 * Endpoints:
 * - POST /api/trpc/microsoft.onboarding.generateLink - Generate one-link for org
 * - GET /api/auth/microsoft/onboarding/initiate - Initiate consent flow
 * - GET /api/auth/microsoft/admin-consent/callback - Handle consent callback
 * - GET /api/trpc/microsoft.onboarding.status - Get onboarding status
 * 
 * ============================================================================
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as db from "../db";
import { adminConsentService } from "../services/microsoft/adminConsentService";
import { ENV } from "../_core/env";
import { organizations, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { update } from "drizzle-orm/mysql-core";
import { getDb } from "../db";

export const microsoftOnboardingRouter = router({
  /**
   * Generate one-link onboarding URL for an organization
   * Only platform admins can generate these links
   */
  generateLink: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user is platform admin or super admin
      if (ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can generate onboarding links",
        });
      }

      // Get organization
      const dbInstance = await getDb();
      const [org] = await dbInstance
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Generate admin consent link
      const adminConsentUrl = adminConsentService.generateOnboardingLink(
        org.id,
        org.name
      );

      // Update organization onboarding status to pending_consent
      await dbInstance
        .update(organizations)
        .set({
          onboardingStatus: "pending_consent",
          microsoft365Enabled: true,
        })
        .where(eq(organizations.id, org.id));

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: org.id,
        operatingUnitId: null,
        action: "microsoft_onboarding_link_generated",
        entityType: "organization",
        entityId: org.id,
        details: JSON.stringify({
          organizationName: org.name,
          generatedBy: ctx.user.email,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: true,
        adminConsentUrl,
        organizationId: org.id,
        organizationName: org.name,
      };
    }),

  /**
   * Get onboarding status for an organization
   */
  getStatus: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
      })
    )
    .query(async ({ input, ctx }) => {
      // Get organization
      const dbInstance = await getDb();
      const [org] = await dbInstance
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Get connected user info if available
      let connectedByUser = null;
      if (org.connectedBy) {
        const [user] = await dbInstance
          .select()
          .from(users)
          .where(eq(users.id, org.connectedBy))
          .limit(1);
        connectedByUser = user
          ? { id: user.id, name: user.name, email: user.email }
          : null;
      }

      return {
        organizationId: org.id,
        organizationName: org.name,
        microsoft365Enabled: org.microsoft365Enabled === 1,
        onboardingStatus: org.onboardingStatus,
        consentGrantedAt: org.consentGrantedAt,
        connectedBy: connectedByUser,
        allowedDomains: org.allowedDomains
          ? JSON.parse(org.allowedDomains)
          : [],
        tenantVerified: org.tenantVerified === 1,
        tenantId: org.tenantId,
      };
    }),

  /**
   * Update onboarding status after successful consent
   * Called internally after admin consent callback
   */
  updateOnboardingStatus: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
        tenantId: z.string().min(1, "Tenant ID is required"),
        consentGranted: z.boolean(),
        allowedDomains: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user is platform admin
      if (ctx.user.role !== "platform_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can update onboarding status",
        });
      }

      const dbInstance = await getDb();

      // Get organization
      const [org] = await dbInstance
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Update organization with onboarding status
      const { status, tenantVerified } =
        adminConsentService.formatOnboardingStatus(
          input.consentGranted,
          input.tenantId
        );

      await dbInstance
        .update(organizations)
        .set({
          microsoft365Enabled: input.consentGranted ? 1 : 0,
          onboardingStatus: status,
          consentGrantedAt: input.consentGranted
            ? new Date().toISOString().slice(0, 19).replace("T", " ")
            : null,
          connectedBy: input.consentGranted ? ctx.user.id : null,
          allowedDomains: input.allowedDomains
            ? JSON.stringify(input.allowedDomains)
            : null,
          tenantVerified: tenantVerified ? 1 : 0,
          tenantId: input.tenantId,
        })
        .where(eq(organizations.id, input.organizationId));

      // Log the action
      const auditEntry = adminConsentService.generateAuditLogEntry(
        input.organizationId,
        input.consentGranted ? "consent_granted" : "consent_failed",
        {
          tenantId: input.tenantId,
          allowedDomains: input.allowedDomains,
        }
      );

      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: input.organizationId,
        operatingUnitId: null,
        action: auditEntry.action,
        entityType: "organization",
        entityId: input.organizationId,
        details: auditEntry.details,
      });

      return {
        success: true,
        organizationId: input.organizationId,
        onboardingStatus: status,
        tenantVerified,
      };
    }),

  /**
   * Record onboarding initiation
   * Called when admin clicks the one-link
   */
  recordInitiation: publicProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
        organizationName: z.string().min(1, "Organization name is required"),
      })
    )
    .mutation(async ({ input }) => {
      const dbInstance = await getDb();

      // Get organization
      const [org] = await dbInstance
        .select()
        .from(organizations)
        .where(eq(organizations.id, input.organizationId))
        .limit(1);

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      // Update status to pending_consent
      await dbInstance
        .update(organizations)
        .set({
          onboardingStatus: "pending_consent",
        })
        .where(eq(organizations.id, input.organizationId));

      // Log the action
      const auditEntry = adminConsentService.generateAuditLogEntry(
        input.organizationId,
        "consent_initiated",
        {
          organizationName: input.organizationName,
        }
      );

      await db.createAuditLog({
        userId: null,
        organizationId: input.organizationId,
        operatingUnitId: null,
        action: auditEntry.action,
        entityType: "organization",
        entityId: input.organizationId,
        details: auditEntry.details,
      });

      return {
        success: true,
        organizationId: input.organizationId,
        onboardingStatus: "pending_consent",
      };
    }),
});
