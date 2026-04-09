/**
 * ============================================================================
 * Onboarding Router
 * ============================================================================
 * 
 * Handles one-link tenant onboarding operations for organization admins.
 * Procedures for generating links, sending emails, and managing onboarding.
 * 
 * ============================================================================
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
import { emailQueueService } from "../services/emailQueueService";
import { notifyOwner } from "../_core/notification";
import { ENV } from "../_core/env";

export const onboardingRouter = router({
  /**
   * Generate and send onboarding link to organization admin
   * Called by platform admin when creating organization or resending link
   */
  sendOnboardingLink: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user is platform admin
      if (ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can send onboarding links",
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

      // Get primary admin
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
          message: "Organization does not have a primary admin email configured",
        });
      }

      // Generate secure token
      const { token, expiresAt } = onboardingTokenService.generateToken();

      // Generate onboarding link
      const onboardingLink = onboardingTokenService.generateOnboardingLink(
        ENV.APP_BASE_URL,
        token
      );
      // Update organization with token
      await dbInstance
        .update(organizations)
        .set({
          onboardingToken: token,
          onboardingTokenExpiry: expiresAt.toISOString().slice(0, 19).replace("T", " "),
          onboardingLinkSentAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          onboardingLinkSentTo: adminEmail,
          microsoft365Enabled: true,
        })
        .where(eq(organizations.id, org.id));

      // Send email to admin
      const emailResult = await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: org.id,
        organizationName: org.name,
        adminEmail,
        adminName: adminName || "Administrator",
        onboardingLink,
        language: (org.defaultLanguage as "en" | "ar") || "en",
      });

      if (!emailResult.success) {
        // Log error but don't fail - token is still valid
        console.error("Failed to send onboarding email:", emailResult.error);
      }

      // Always notify the platform owner with the onboarding link details
      // This ensures the link is accessible even if email delivery fails
      // (e.g., when no M365 provider is configured yet for the organization)
      try {
        await notifyOwner({
          title: `Onboarding Link Generated: ${org.name}`,
          content: `An onboarding link has been generated for ${org.name}.\n\nAdmin Email: ${adminEmail}\nAdmin Name: ${adminName || "Administrator"}\n\nOnboarding Link:\n${onboardingLink}\n\nThis link expires at: ${expiresAt.toISOString()}\n\nEmail delivery status: ${emailResult.success ? "Queued successfully" : `Failed - ${emailResult.error}`}`,
        });
        console.log(`[Onboarding] Platform owner notified for org ${org.name}`);
      } catch (notifyError) {
        console.warn(`[Onboarding] Failed to notify platform owner:`, notifyError);
      }

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: org.id,
        operatingUnitId: null,
        action: "onboarding_link_sent",
        entityType: "organization",
        entityId: org.id,
        details: JSON.stringify({
          organizationName: org.name,
          sentTo: adminEmail,
          sentBy: ctx.user.email,
          emailSuccess: emailResult.success,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: true, // Always succeed as long as token was generated
        organizationId: org.id,
        organizationName: org.name,
        sentTo: adminEmail,
        emailQueued: emailResult.success,
        queueId: emailResult.messageId,
        onboardingLink, // Return the link so UI can display it for manual sharing
        expiresAt: expiresAt.toISOString(),
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
    .query(async ({ input }) => {
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

      // Check if token is expired
      let tokenExpired = false;
      if (org.onboardingToken && org.onboardingTokenExpiry) {
        const validation = onboardingTokenService.validateToken(
          org.onboardingToken,
          org.onboardingTokenExpiry
        );
        tokenExpired = !validation.valid;
      }

      return {
        organizationId: org.id,
        organizationName: org.name,
        microsoft365Enabled: org.microsoft365Enabled === 1,
        onboardingStatus: org.onboardingStatus,
        consentGrantedAt: org.consentGrantedAt,
        connectedBy: connectedByUser,
        allowedDomains: org.allowedDomains ? JSON.parse(org.allowedDomains) : [],
        tenantVerified: org.tenantVerified === 1,
        tenantId: org.tenantId,
        onboardingLinkSentAt: org.onboardingLinkSentAt,
        onboardingLinkSentTo: org.onboardingLinkSentTo,
        tokenExpired,
      };
    }),

  /**
   * Resend onboarding link to organization admin
   * Called when previous link expired or needs to be resent
   */
  resendLink: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user is platform admin
      if (ctx.user.role !== "platform_admin" && ctx.user.role !== "platform_super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform admins can resend onboarding links",
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

      // Check if organization is already connected
      if (org.onboardingStatus === "connected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization is already connected to Microsoft 365",
        });
      }

      // Get primary admin
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
          message: "Organization does not have a primary admin email configured",
        });
      }

      // Generate new token
      const { token, expiresAt } = onboardingTokenService.generateToken();
      // Generate onboarding link
      const onboardingLink = onboardingTokenService.generateOnboardingLink(
        ENV.APP_BASE_URL,
        token
      );
      // Update organization with new token
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

      // Send email to admin
      console.log(`[ONBOARDING] Resending link for org ${org.name} (ID: ${org.id}) to ${adminEmail}`);
      const emailResult = await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: org.id,
        organizationName: org.name,
        adminEmail,
        adminName: adminName || "Administrator",
        onboardingLink,
        language: (org.defaultLanguage as "en" | "ar") || "en",
      });
      console.log(`[ONBOARDING] Email result:`, emailResult);

      // Always notify the platform owner with the onboarding link details
      try {
        await notifyOwner({
          title: `Onboarding Link Resent: ${org.name}`,
          content: `An onboarding link has been resent for ${org.name}.\n\nAdmin Email: ${adminEmail}\nAdmin Name: ${adminName || "Administrator"}\n\nOnboarding Link:\n${onboardingLink}\n\nThis link expires at: ${expiresAt.toISOString()}\n\nEmail delivery status: ${emailResult.success ? "Queued successfully" : `Failed - ${emailResult.error}`}`,
        });
      } catch (notifyError) {
        console.warn(`[Onboarding] Failed to notify platform owner:`, notifyError);
      }

      // Log the action
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
          emailSuccess: emailResult.success,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        success: true, // Always succeed as long as token was generated
        organizationId: org.id,
        organizationName: org.name,
        sentTo: adminEmail,
        emailQueued: emailResult.success,
        queueId: emailResult.messageId,
        onboardingLink, // Return the link so UI can display it for manual sharing
        expiresAt: expiresAt.toISOString(),
      };
    }),

  /**
   * Validate onboarding token for Microsoft 365 connection page
   * Checks if token is valid and returns organization details
   */
  validateToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1, "Token is required"),
      })
    )
    .query(async ({ input, ctx }) => {
      const dbInstance = await getDb();

      // Find organization with this token
      const [org] = await dbInstance
        .select()
        .from(organizations)
        .where(eq(organizations.onboardingToken, input.token))
        .limit(1);

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired token",
        });
      }

      // Validate token expiry
      const tokenValidation = onboardingTokenService.validateToken(
        org.onboardingToken,
        org.onboardingTokenExpiry
      );

      if (!tokenValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: tokenValidation.error || "Token has expired",
        });
      }

      // Check if already connected
      if (org.onboardingStatus === "connected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization is already connected to Microsoft 365",
        });
      }

      // Return organization details for the connection page
      return {
        organizationId: org.id,
        organizationName: org.name,
        shortCode: org.shortCode,
        tenantId: org.tenantId || null,
        onboardingStatus: org.onboardingStatus,
        allowedDomains: org.allowedDomains ? JSON.parse(org.allowedDomains) : [],
      };
    }),

  /**
   * Start Microsoft 365 connection flow
   * Generates Microsoft OAuth authorization URL for tenant connection
   */
  startMicrosoftConnection: protectedProcedure
    .input(
      z.object({
        organizationId: z.number().positive("Organization ID must be positive"),
        token: z.string().min(1, "Token is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

      // Validate token
      if (org.onboardingToken !== input.token) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid token for this organization",
        });
      }

      const tokenValidation = onboardingTokenService.validateToken(
        org.onboardingToken,
        org.onboardingTokenExpiry
      );

      if (!tokenValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: tokenValidation.error || "Token has expired",
        });
      }

      // Generate Microsoft OAuth authorization URL
      const microsoftAuthUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      microsoftAuthUrl.searchParams.append("client_id", ENV.MS_CLIENT_ID);
      microsoftAuthUrl.searchParams.append("redirect_uri", ENV.MS_REDIRECT_URI);
      microsoftAuthUrl.searchParams.append("response_type", "code");
      microsoftAuthUrl.searchParams.append("scope", "Directory.Read.All");
      microsoftAuthUrl.searchParams.append("state", input.token); // Pass token as state for validation
      microsoftAuthUrl.searchParams.append("prompt", "admin_consent"); // Request admin consent

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: org.id,
        operatingUnitId: null,
        action: "microsoft_connection_initiated",
        entityType: "organization",
        entityId: org.id,
        details: JSON.stringify({
          organizationName: org.name,
          initiatedBy: ctx.user.email,
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        authorizationUrl: microsoftAuthUrl.toString(),
        organizationId: org.id,
        organizationName: org.name,
      };
    }),

  /**
   * Get list of all organizations with onboarding status
   * Used by onboarding dashboard
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
      // Verify user is platform admin
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

          // Check if token is expired
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
});
