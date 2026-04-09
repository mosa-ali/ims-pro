/**
 * Extended Onboarding Router Procedures
 * Add these to the existing onboardingRouter
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { organizations, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { onboardingTokenService } from "../services/microsoft/onboardingTokenService";
import { emailNotificationService } from "../services/microsoft/emailNotificationService";
import { notifyOwner } from "../_core/notification";
import { ENV } from "../_core/env";

export const onboardingExtendedProcedures = {
  /**
   * Resend onboarding link to organization admin
   */
  resendLink: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can resend onboarding links",
        });
      }

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

      if (org.onboardingStatus === "connected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization is already connected to Microsoft 365",
        });
      }

      let adminEmail: string | null = null;
      let adminName: string | null = null;

      if (org.primaryAdminId) {
        const [admin] = await dbInstance
          .select()
          .from(users)
          .where(eq(users.id, org.primaryAdminId))
          .limit(1);

        if (admin) {
          adminEmail = admin.email;
          adminName = admin.name;
        }
      }

      if (!adminEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization does not have a primary admin email",
        });
      }

      const { token, expiresAt } = onboardingTokenService.generateToken();
      const onboardingLink = onboardingTokenService.generateOnboardingLink(
        ENV.APP_BASE_URL,
        token
      );

      await dbInstance
        .update(organizations)
        .set({
          onboardingToken: token,
          onboardingTokenExpiry: expiresAt.toISOString().slice(0, 19).replace("T", " "),
          onboardingLinkSentAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          onboardingLinkSentTo: adminEmail,
          onboardingStatus: "pending_consent",
        })
        .where(eq(organizations.id, org.id));

      const emailResult = await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: org.id,
        organizationName: org.name,
        adminEmail,
        adminName: adminName || "Administrator",
        onboardingLink,
        language: (org.defaultLanguage as "en" | "ar") || "en",
      });

      // Always notify the platform owner with the onboarding link details
      try {
        await notifyOwner({
          title: `Onboarding Link Resent: ${org.name}`,
          content: `An onboarding link has been resent for ${org.name}.\n\nAdmin Email: ${adminEmail}\nAdmin Name: ${adminName || "Administrator"}\n\nOnboarding Link:\n${onboardingLink}\n\nThis link expires at: ${expiresAt.toISOString()}\n\nEmail delivery status: ${emailResult.success ? "Queued successfully" : `Failed - ${emailResult.error}`}`,
        });
      } catch (notifyError) {
        console.warn(`[Onboarding] Failed to notify platform owner:`, notifyError);
      }

      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: org.id,
        operatingUnitId: null,
        action: "onboarding_link_resent",
        entityType: "organization",
        entityId: org.id,
        details: JSON.stringify({
          organizationName: org.name,
          sentTo: adminEmail,
          sentBy: ctx.user.email,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: true,
        organizationId: org.id,
        sentTo: adminEmail,
        expiresAt: expiresAt.toISOString(),
      };
    }),

  /**
   * Get list of all organizations with onboarding status
   */
  listOrganizations: protectedProcedure
    .input(
      z.object({
        status: z.enum(["not_connected", "pending_consent", "connected", "error"]).optional(),
        searchQuery: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can view onboarding dashboard",
        });
      }

      const dbInstance = await getDb();

      // Get all organizations (will filter in memory)
      let orgs = await dbInstance.select().from(organizations);

      // Filter by status if provided
      if (input.status) {
        orgs = orgs.filter((org) => org.onboardingStatus === input.status);
      }

      // Filter by search query if provided
      if (input.searchQuery) {
        const query = input.searchQuery.toLowerCase();
        orgs = orgs.filter(
          (org) =>
            org.name.toLowerCase().includes(query) ||
            org.organizationCode?.toLowerCase().includes(query)
        );
      }

      // Get total count after filtering
      const total = orgs.length;

      // Apply pagination
      const paginated = orgs.slice(input.offset, input.offset + input.limit);

      // Map to response format
      const organizations_list = await Promise.all(
        paginated.map(async (org) => {
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

          let tokenExpired = false;
          if (org.onboardingToken && org.onboardingTokenExpiry) {
            const validation = onboardingTokenService.validateToken(
              org.onboardingToken,
              org.onboardingTokenExpiry
            );
            tokenExpired = !validation.valid;
          }

          return {
            id: org.id,
            name: org.name,
            organizationCode: org.organizationCode,
            status: org.onboardingStatus,
            microsoft365Enabled: org.microsoft365Enabled === 1,
            tenantId: org.tenantId,
            consentGrantedAt: org.consentGrantedAt,
            connectedBy: connectedByUser,
            onboardingLinkSentAt: org.onboardingLinkSentAt,
            onboardingLinkSentTo: org.onboardingLinkSentTo,
            tokenExpired,
            createdAt: org.createdAt,
          };
        })
      );

      return {
        total,
        limit: input.limit,
        offset: input.offset,
        organizations: organizations_list,
      };
    }),
};
