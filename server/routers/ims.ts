import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, isNull, desc } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure, adminProcedure, scopedProcedure, platformScopedProcedure } from "../_core/trpc";
import * as db from "../db";
import { getDb } from "../db";
import { users, auditLogs } from "../../drizzle/schema";
import { platformUsersRouter } from "./platformUsers";
import { globalSettingsRouter } from "./globalSettings";
import { auditLogsRouter } from "./auditLogs";
import { deletedRecordsRouter as importedDeletedRecordsRouter } from "./deletedRecords";
import { deletedRecordsAnalyticsRouter } from "./deletedRecordsAnalytics";
import { retentionPolicyRouter } from "./retentionPolicy";
import { passwordManagementRouter } from "./passwordManagement";
import { reportsAnalyticsRouter } from "./reportsAnalyticsRouter";
import { platformEmailRouter } from "./platformEmailRouter";
import { sendEmail } from "../_core/email";

/**
 * IMS Hierarchy Management Routers
 * Handles organizations, operating units, and user assignments
 */

// ============================================================================
// ORGANIZATIONS ROUTER (Platform Admin Only)
// ============================================================================

export const organizationsRouter = router({
  // List all organizations (public - for access request form)
  listPublic: publicProcedure.query(async () => {
    return await db.getAllOrganizations();
  }),

  // List all organizations (platform admin only)
  list: platformScopedProcedure.query(async () => {
    return await db.getAllOrganizations();
  }),

  // Get organization by ID
  getById: platformScopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getOrganizationById(input.id);
    }),

  // Get organization by shortCode (for human-readable URLs)
  getByShortCode: platformScopedProcedure
    .input(z.object({ shortCode: z.string() }))
    .query(async ({ input }) => {
      return await db.getOrganizationByShortCode(input.shortCode);
    }),

  // Check if current user can manage an organization
  canManage: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await db.canUserManageOrganization(ctx.user.id, input.organizationId);
    }),

  // Create new organization
  create: platformScopedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        domain: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().default("UTC"),
        currency: z.string().default("USD"),
        status: z.enum(["active", "suspended", "inactive"]).default("active"),
        organizationCode: z.string().optional(),
        tenantId: z.string().optional(),
        primaryAdminId: z.number().optional(),
        secondaryAdminId: z.number().optional(),
        // Primary Admin fields
        adminName: z.string().optional(),
        adminEmail: z.string().email().optional(),
        // Secondary Admin fields (optional)
        secondaryAdminName: z.string().optional(),
        secondaryAdminEmail: z.string().email().optional(),
        // Operating Units array
        operatingUnits: z.array(
          z.object({
            name: z.string().min(1),
            type: z.enum(["hq", "regional", "field"]),
            country: z.string().min(1),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { adminName, adminEmail, secondaryAdminName, secondaryAdminEmail, operatingUnits, primaryAdminId, secondaryAdminId, ...orgData } = input;
      
      let adminUserId: number | undefined = primaryAdminId;
      let secondaryAdminUserId: number | undefined = secondaryAdminId;
      
      // If primary admin details provided, create/find admin user FIRST
      if (adminName && adminEmail) {
        // Check if user already exists
        let adminUser = await db.getUserByEmail(adminEmail);
        
        if (!adminUser) {
          // Create new user
          adminUserId = await db.createUser({
            name: adminName,
            email: adminEmail,
            role: "user", // Default role, will be overridden by organization assignment
          });
        } else {
          adminUserId = adminUser.id;
        }
      }
      
      // If secondary admin details provided, create/find secondary admin user
      if (secondaryAdminName && secondaryAdminEmail) {
        // Check if user already exists
        let secondaryAdminUser = await db.getUserByEmail(secondaryAdminEmail);
        
        if (!secondaryAdminUser) {
          // Create new user
          secondaryAdminUserId = await db.createUser({
            name: secondaryAdminName,
            email: secondaryAdminEmail,
            role: "user", // Default role, will be overridden by organization assignment
          });
        } else {
          secondaryAdminUserId = secondaryAdminUser.id;
        }
      }
      
      // Create the organization with both admin IDs set
      const id = await db.createOrganization({
        ...orgData,
        primaryAdminId: adminUserId,
        secondaryAdminId: secondaryAdminUserId,
      });
      
      // Assign primary admin to organization if we have one
      if (adminUserId) {
        await db.assignUserToOrganization(adminUserId, id, "organization_admin");
      }
      
      // Assign secondary admin to organization if we have one
      if (secondaryAdminUserId) {
        await db.assignUserToOrganization(secondaryAdminUserId, id, "organization_admin");
      }
      
      // Create operating units if provided
      if (operatingUnits && operatingUnits.length > 0) {
        for (const ou of operatingUnits) {
          // Check if OU with same name already exists for this organization
          const existingOU = await db.getOperatingUnitByCode(ou.name);
          if (!existingOU || existingOU.organizationId !== id) {
            // Only create if it doesn't exist for this org
            await db.createOperatingUnit({
              ...ou,
              organizationId: id,
            });
          }
        }
      }
      
      // Send onboarding email to primary admin (non-blocking)
      if (adminEmail) {
        const connectLink = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/organizations/${id}/connect-microsoft-365`;
        const emailContent = `
          <h2>Welcome to IMS!</h2>
          <p>Hello ${adminName || 'Administrator'},</p>
          <p>Your organization "${orgData.name}" has been successfully created in the Integrated Management System.</p>
          <p>To complete the setup and connect your Microsoft 365 tenant, please click the link below:</p>
          <p><a href="${connectLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Connect Microsoft 365</a></p>
          <p>If you have any questions, please contact the system administrator.</p>
          <p>Best regards,<br/>IMS Team</p>
        `;
        
        // Send email asynchronously - don't wait for it, don't break the flow if it fails
        try {
          const emailSent = await sendEmail({
            to: adminEmail,
            subject: `IMS Organization Created: ${orgData.name}`,
            html: emailContent,
            text: `Welcome to IMS! Your organization "${orgData.name}" has been created. Please visit ${connectLink} to connect your Microsoft 365 tenant.`,
          });
          
          if (emailSent) {
            console.log('[Organization] Onboarding email sent successfully to:', adminEmail);
          } else {
            console.warn('[Organization] Failed to send onboarding email to:', adminEmail);
          }
        } catch (error) {
          // Catch any errors and log them, but never throw - organization creation must succeed
          console.error('[Organization] Error sending onboarding email:', error);
        }
      }
      
      // Log audit trail for organization creation
      const ipAddress = (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0] || ctx.req.socket?.remoteAddress || 'unknown';
      const userAgent = (ctx.req.headers['user-agent'] as string) || 'unknown';
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: id,
        action: "create_organization",
        entityType: "organization",
        entityId: id,
        details: JSON.stringify({ name: orgData.name, domain: orgData.domain, country: orgData.country }),
        ipAddress,
        userAgent,
      });
      
      return { id, success: true };
    }),

  // Update organization (platform admin or organization's primary admin)
  update: platformScopedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        domain: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        currency: z.string().optional(),
        status: z.enum(["active", "suspended", "inactive"]).optional(),
        organizationCode: z.string().optional(),
        tenantId: z.string().optional(),
        primaryAdminId: z.number().optional(),
        secondaryAdminId: z.number().optional(),
        // Admin fields for editing (optional)
        adminName: z.string().optional(),
        adminEmail: z.string().email().optional(),
        secondaryAdminName: z.string().optional(),
        secondaryAdminEmail: z.string().email().optional(),
        // Operating Units array (for wizard update)
        operatingUnits: z.array(
          z.object({
            id: z.number().optional(), // Existing OU ID
            name: z.string().min(1),
            type: z.enum(["hq", "regional", "field"]),
            country: z.string().min(1),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, operatingUnits, adminName, adminEmail, secondaryAdminName, secondaryAdminEmail, ...updates } = input;
      
      // Check if user has permission to manage this organization
      const canManage = await db.canUserManageOrganization(ctx.user.id, id);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this organization",
        });
      }
      
      // Handle primary admin changes if provided
      if (adminName && adminEmail) {
        // Check if user already exists
        let adminUser = await db.getUserByEmail(adminEmail);
        
        if (!adminUser) {
          // Create new user
          const adminUserId = await db.createUser({
            name: adminName,
            email: adminEmail,
            role: "user",
          });
          updates.primaryAdminId = adminUserId;
          // Assign new admin to organization
          await db.assignUserToOrganization(adminUserId, id, "organization_admin");
        } else {
          updates.primaryAdminId = adminUser.id;
          // Assign existing user to organization if not already assigned
          await db.assignUserToOrganization(adminUser.id, id, "organization_admin");
        }
      }
      
      // Handle secondary admin changes if provided
      if (secondaryAdminName && secondaryAdminEmail) {
        // Check if user already exists
        let secondaryAdminUser = await db.getUserByEmail(secondaryAdminEmail);
        
        if (!secondaryAdminUser) {
          // Create new user
          const secondaryAdminUserId = await db.createUser({
            name: secondaryAdminName,
            email: secondaryAdminEmail,
            role: "user",
          });
          updates.secondaryAdminId = secondaryAdminUserId;
          // Assign new secondary admin to organization
          await db.assignUserToOrganization(secondaryAdminUserId, id, "organization_admin");
        } else {
          updates.secondaryAdminId = secondaryAdminUser.id;
          // Assign existing user to organization if not already assigned
          await db.assignUserToOrganization(secondaryAdminUser.id, id, "organization_admin");
        }
      }
      
      // Update organization details
      await db.updateOrganization(id, updates);
      
      // Handle operating units if provided
      if (operatingUnits) {
        // Get existing OUs for this organization
        const existingOUs = await db.getOperatingUnitsByOrganization(id);
        const existingOUIds = existingOUs.map(ou => ou.id);
        const providedOUIds = operatingUnits.filter(ou => ou.id).map(ou => ou.id!);
        
        // Delete OUs that are no longer in the list
        const ousToDelete = existingOUIds.filter(ouId => !providedOUIds.includes(ouId));
        for (const ouId of ousToDelete) {
          await db.softDeleteOperatingUnit(ouId, 1); // TODO: Use actual user ID from ctx
        }
        
        // Update or create OUs
        for (const ou of operatingUnits) {
          if (ou.id) {
            // Update existing OU
            await db.updateOperatingUnit(ou.id, {
              name: ou.name,
              type: ou.type,
              country: ou.country,
            });
          } else {
            // Create new OU
            await db.createOperatingUnit({
              name: ou.name,
              type: ou.type,
              country: ou.country,
              organizationId: id,
            });
          }
        }
      }
      
      // Log audit trail for organization update
      const ipAddress = (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0] || ctx.req.socket?.remoteAddress || 'unknown';
      const userAgent = (ctx.req.headers['user-agent'] as string) || 'unknown';
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: id,
        action: "update_organization",
        entityType: "organization",
        entityId: id,
        details: JSON.stringify({ updates }),
        ipAddress,
        userAgent,
      });
      
      return { success: true };
    }),

  // Soft delete organization (platform admin or organization's primary admin)
  softDelete: platformScopedProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(3, "Deletion reason is required and must be at least 3 characters") }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to manage this organization
      const canManage = await db.canUserManageOrganization(ctx.user.id, input.id);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this organization",
        });
      }
      
      await db.softDeleteOrganization(input.id, ctx.user.id);
      return { success: true };
    }),

  // Restore organization
  restore: platformScopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.restoreOrganization(input.id, ctx.user.id);
      return { success: true };
    }),

  // Hard delete organization (permanent)
  hardDelete: platformScopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.hardDeleteOrganization(input.id, ctx.user.id);
      return { success: true };
    }),

  // Bulk soft delete organizations (platform admin only)
  bulkSoftDelete: adminProcedure
    .input(z.object({ ids: z.array(z.number()), reason: z.string().min(3, "Deletion reason is required and must be at least 3 characters") }))
    .mutation(async ({ input, ctx }) => {
      let deletedCount = 0;
      for (const id of input.ids) {
        try {
          await db.softDeleteOrganization(id, ctx.user.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete organization ${id}:`, error);
        }
      }
      return { success: true, deletedCount };
    }),

  // Resend onboarding email to organization admin
  resendOnboardingEmail: platformScopedProcedure
    .input(z.object({ organizationId: z.number() }))
    .mutation(async ({ input }) => {
      const org = await db.getOrganizationById(input.organizationId);
      
      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }
      
      // Get primary admin user to get their email
      let adminEmail: string | null = null;
      let adminName: string | null = null;
      if (org.primaryAdminId) {
        const adminUser = await db.getUserById(org.primaryAdminId);
        adminEmail = adminUser?.email || null;
        adminName = adminUser?.name || null;
      }
      
      if (!adminEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization admin email not found",
        });
      }
      
      // Generate onboarding link
      const connectLink = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/organizations/${org.id}/connect-microsoft-365`;
      
      const emailContent = `
        <h2>Welcome to IMS!</h2>
        <p>Hello ${adminName || 'Administrator'},</p>
        <p>Your organization "${org.name}" has been created in the Integrated Management System.</p>
        <p>To complete the setup and connect your Microsoft 365 tenant, please click the link below:</p>
        <p><a href="${connectLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Connect Microsoft 365</a></p>
        <p>If you have any questions, please contact the system administrator.</p>
        <p>Best regards,<br/>IMS Team</p>
      `;
      
      try {
        const emailSent = await sendEmail({
          to: adminEmail,
          subject: `IMS Organization Onboarding: ${org.name}`,
          html: emailContent,
          text: `Welcome to IMS! Your organization "${org.name}" has been created. Please visit ${connectLink} to connect your Microsoft 365 tenant.`,
        });
        
        if (emailSent) {
          console.log('[Organization] Onboarding email resent successfully to:', adminEmail);
          return { success: true, message: 'Onboarding email sent successfully', link: connectLink };
        } else {
          console.warn('[Organization] Failed to resend onboarding email to:', adminEmail);
          return { success: false, message: 'Failed to send email, but link is available below', link: connectLink };
        }
      } catch (error) {
        console.error('[Organization] Error resending onboarding email:', error);
        return { success: false, message: 'Error sending email, but link is available below', link: connectLink };
      }
    }),

  // Get onboarding link for organization admin (for copying)
  getOnboardingLink: platformScopedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      const org = await db.getOrganizationById(input.organizationId);
      
      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }
      
      const connectLink = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/organizations/${org.id}/connect-microsoft-365`;
      
      return { link: connectLink, organizationName: org.name };
    }),
});

// ============================================================================
// OPERATING UNITS ROUTER
// ============================================================================

export const operatingUnitsRouter = router({
  // List all operating units (public - for access request form)
  listPublic: publicProcedure.query(async () => {
    return await db.getAllOperatingUnits();
  }),

  // List all operating units (platform admin only)
  list: adminProcedure.query(async () => {
    return await db.getAllOperatingUnits();
  }),

  // List operating units for an organization
  listByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      return await db.getOperatingUnitsByOrganization(input.organizationId);
    }),

  // Get operating unit by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getOperatingUnitById(input.id);
    }),

  // Get operating unit by code (for human-readable URLs)
  getByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      return await db.getOperatingUnitByCode(input.code);
    }),

  // Create new operating unit (organization admin or platform admin)
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        name: z.string().min(1),
        type: z.enum(["hq", "country", "regional", "field"]),
        country: z.string().optional(),
        city: z.string().optional(),
        currency: z.string().default("USD"),
        timezone: z.string().default("UTC"),
        status: z.enum(["active", "inactive"]).default("active"),
        code: z.string().optional(), // Auto-generated if not provided
        officeAdminName: z.string().optional(),
        officeAdminEmail: z.string().email().optional(),
        officeAdminRole: z.enum(["organization_admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Add authorization check - only org admins or platform admins can create units
      
      // Auto-generate code if not provided
      let code = input.code;
      if (!code) {
        // Get organization shortCode
        const org = await db.getOrganizationById(input.organizationId);
        if (!org?.shortCode) {
          throw new Error("Organization must have a shortCode to create operating units");
        }
        
        // Find next available sequence number
        const existingUnits = await db.getOperatingUnitsByOrganization(input.organizationId);
        const existingCodes = existingUnits
          .map(u => u.code)
          .filter((c): c is string => !!c)
          .filter(c => c.startsWith(`${org.shortCode}-`));
        
        let nextNum = 1;
        while (existingCodes.includes(`${org.shortCode}-${String(nextNum).padStart(2, '0')}`)) {
          nextNum++;
        }
        
        code = `${org.shortCode}-${String(nextNum).padStart(2, '0')}`;
      }
      
      const id = await db.createOperatingUnit({ ...input, code });
      
      // Automatically assign the creating user to the new OU with organization_admin role
      // This ensures immediate access and visibility (Phase 0 compliance)
      await db.assignUserToOperatingUnit(ctx.user.id, id, "organization_admin");
      
      // If office admin email and name are provided, create/assign additional user
      if (input.officeAdminEmail && input.officeAdminName) {
        // Check if user already exists
        let user = await db.getUserByEmail(input.officeAdminEmail);
        
        // If user doesn't exist, create them
        if (!user) {
          const userId = await db.createOrganizationUser({
            email: input.officeAdminEmail,
            name: input.officeAdminName,
          });
          user = await db.getUserById(userId);
        }
        
        // Assign additional user to the operating unit with the selected role
        // Skip if it's the same user as the creator
        if (user && user.id !== ctx.user.id) {
          await db.assignUserToOperatingUnit(user.id, id, input.officeAdminRole);
        }
      }
      
      return { id, success: true };
    }),

  // Update operating unit
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        type: z.enum(["hq", "country", "regional", "field"]).optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        currency: z.string().optional(),
        timezone: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        officeAdminName: z.string().optional(),
        officeAdminEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateOperatingUnit(id, updates);
      return { success: true };
    }),

  // Soft delete operating unit
  softDelete: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(3, "Deletion reason is required and must be at least 3 characters") }))
    .mutation(async ({ input, ctx }) => {
      await db.softDeleteOperatingUnit(input.id, ctx.user.id);
      return { success: true };
    }),

  // Restore operating unit
  restore: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.restoreOperatingUnit(input.id, ctx.user.id);
      return { success: true };
    }),

  // Hard delete operating unit (permanent)
  hardDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.hardDeleteOperatingUnit(input.id, ctx.user.id);
      return { success: true };
    }),

  // Bulk soft delete operating units
  bulkSoftDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()), reason: z.string().min(3, "Deletion reason is required and must be at least 3 characters") }))
    .mutation(async ({ input, ctx }) => {
      for (const id of input.ids) {
        await db.softDeleteOperatingUnit(id, ctx.user.id);
      }
      return { success: true, deletedCount: input.ids.length };
    }),

  // Bulk hard delete operating units (permanent)
  bulkHardDelete: adminProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      for (const id of input.ids) {
        await db.hardDeleteOperatingUnit(input.ids, ctx.user.id);
      }
      return { success: true, deletedCount: input.ids.length };
    }),

  // Get operating unit statistics (active projects, employees, budget)
  getStatistics: protectedProcedure
    .input(z.object({ operatingUnitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getOperatingUnitStatistics(input.operatingUnitId);
    }),

  // Get compliance alerts for operating unit
  getComplianceAlerts: protectedProcedure
    .input(z.object({ operatingUnitId: z.number() }))
    .query(async ({ input }) => {
      return await db.getOperatingUnitComplianceAlerts(input.operatingUnitId);
    }),
});

// ============================================================================
// USER ASSIGNMENTS ROUTER
// ============================================================================

export const userAssignmentsRouter = router({
  // Get current user's organizations
  myOrganizations: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUserOrganizations(ctx.user.id);
  }),

  // Get current user's operating units
  // Platform Admins and Organization Admins automatically get access to ALL OUs in their organization(s)
  myOperatingUnits: protectedProcedure.query(async ({ ctx }) => {
    // Check if user is a Platform Admin (from users table role field)
    const isPlatformAdmin = ['platform_admin', 'platform_super_admin', 'platform_auditor'].includes(ctx.user.role || '');
    
    // Check if user is an Organization Admin for any org
    const userOrgs = await db.getUserOrganizations(ctx.user.id);
    const isOrgAdmin = userOrgs.some(org => org.platformRole === 'organization_admin');
    
    if (isPlatformAdmin || isOrgAdmin) {
      // Platform Admins and Organization Admins get ALL operating units in their organization(s)
      const allOUs: any[] = [];
      for (const org of userOrgs) {
        // Platform admins get OUs for all their orgs, org admins only for orgs where they are admin
        if (isPlatformAdmin || org.platformRole === 'organization_admin') {
          const orgOUs = await db.getOperatingUnitsByOrganization(org.organizationId);
          allOUs.push(...orgOUs.map(ou => ({
            id: ou.id,
            userId: ctx.user.id,
            operatingUnitId: ou.id,
            createdAt: new Date(),
            unitName: ou.name,
            unitType: ou.type,
            unitStatus: ou.status,
            organizationId: ou.organizationId,
          })));
        }
      }
      return allOUs;
    }
    
    // Regular users get only their explicitly assigned OUs
    return await db.getUserOperatingUnits(ctx.user.id);
  }),

  // Assign user to organization (platform admin only)
  assignToOrganization: platformScopedProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
        role: z.enum(["organization_admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ input }) => {
      await db.assignUserToOrganization(input.userId, input.organizationId, input.role);
      return { success: true };
    }),

  // Assign user to operating unit (organization admin or platform admin)
  assignToOperatingUnit: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        operatingUnitId: z.number(),
        role: z.enum(["organization_admin", "user"]).default("user"),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Add authorization check
      await db.assignUserToOperatingUnit(input.userId, input.operatingUnitId, input.role);
      return { success: true };
    }),

  // Remove user from organization (platform admin only)
  removeFromOrganization: platformScopedProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await db.removeUserFromOrganization(input.userId, input.organizationId);
      return { success: true };
    }),

  // Remove user from operating unit
  removeFromOperatingUnit: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        operatingUnitId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Add authorization check
      await db.removeUserFromOperatingUnit(input.userId, input.operatingUnitId);
      return { success: true };
    }),

  // ===== Organization User Management (Organization Admin) =====

  // List all users in the organization (organization admin)
  // Uses scopedProcedure - organizationId comes from ctx.scope
  listOrganizationUsers: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      // Check if user is organization admin
      const userOrgs = await db.getUserOrganizations(ctx.user.id);
      const isOrgAdmin = userOrgs.some(
        (org) => org.organizationId === organizationId && org.platformRole === "organization_admin"
      );
      
      if (!isOrgAdmin && ctx.user.role !== "platform_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can view organization users",
        });
      }

      return await db.getOrganizationUsers(organizationId);
    }),

  // Get organization admins (public - for display on organization detail page)
  // Uses scopedProcedure - organizationId comes from ctx.scope
  getOrganizationAdmins: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const allUsers = await db.getOrganizationUsers(organizationId);
      // Filter to only return users with organization_admin role
      return allUsers.filter(user => user.platformRole === "organization_admin").map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }));
    }),

  // Add user to organization with role and permissions (organization admin)
  // Uses scopedProcedure - organizationId comes from ctx.scope
  addOrganizationUser: scopedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["organization_admin", "user"]).default("user"),
        modulePermissions: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      // Check if user is organization admin
      const userOrgs = await db.getUserOrganizations(ctx.user.id);
      const isOrgAdmin = userOrgs.some(
        (org) => org.organizationId === organizationId && org.platformRole === "organization_admin"
      );
      
      if (!isOrgAdmin && ctx.user.role !== "platform_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can add users",
        });
      }

      // TODO: Create or find user by email, then assign to organization
      // For now, this is a placeholder that will be implemented in db.ts
      const userId = await db.createOrFindUserByEmail(input.email, input.name);
      await db.assignUserToOrganizationWithPermissions(
        userId,
        organizationId,
        input.role,
        input.modulePermissions
      );
      
      return { success: true, userId };
    }),

  // Update user role and permissions (organization admin)
  // Uses scopedProcedure - organizationId comes from ctx.scope
  updateOrganizationUser: scopedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["organization_admin", "user"]).optional(),
        modulePermissions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      // Check if user is organization admin
      const userOrgs = await db.getUserOrganizations(ctx.user.id);
      const isOrgAdmin = userOrgs.some(
        (org) => org.organizationId === organizationId && org.platformRole === "organization_admin"
      );
      
      if (!isOrgAdmin && ctx.user.role !== "platform_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can update users",
        });
      }

      await db.updateUserOrganizationPermissions(
        input.userId,
        organizationId,
        input.role,
        input.modulePermissions
      );
      
      return { success: true };
    }),

  // Remove user from organization (organization admin)
  // Uses scopedProcedure - organizationId comes from ctx.scope
  removeOrganizationUser: scopedProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { organizationId } = ctx.scope;
      // Check if user is organization admin
      const userOrgs = await db.getUserOrganizations(ctx.user.id);
      const isOrgAdmin = userOrgs.some(
        (org) => org.organizationId === organizationId && org.platformRole === "organization_admin"
      );
      
      if (!isOrgAdmin && ctx.user.role !== "platform_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can remove users",
        });
      }

      await db.removeUserFromOrganization(input.userId, organizationId);
      return { success: true };
    }),
});

// ============================================================================
// MICROSOFT INTEGRATION ROUTER
// ============================================================================

export const microsoftIntegrationRouter = router({
  // Get integration status for an organization
  getByOrganization: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input }) => {
      return await db.getMicrosoftIntegration(input.organizationId);
    }),

  // Update integration settings (organization admin or platform admin)
  update: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        entraIdEnabled: z.boolean().optional(),
        entraIdTenantId: z.string().optional(),
        sharepointEnabled: z.boolean().optional(),
        sharepointSiteUrl: z.string().optional(),
        oneDriveEnabled: z.boolean().optional(),
        outlookEnabled: z.boolean().optional(),
        teamsEnabled: z.boolean().optional(),
        powerBiEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Add authorization check
      await db.upsertMicrosoftIntegration(input);
      return { success: true };
    }),
});

// ============================================================================
// DELETED RECORDS ROUTER (Archive)
// ============================================================================
// Legacy router (kept for internal backward compatibility)
const legacyDeletedRecordsRouter = router({
  // List all deleted records (platform admin only)
  listAll: adminProcedure.query(async () => {
    return await db.getAllDeletedRecords();
  }),

  // List deleted records for organization (organization admin)
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verify user belongs to the requested organization
      const userOrgs = await db.getUserOrganizations(ctx.user.id);
      const hasAccess = userOrgs.some(uo => uo.organizationId === input.organizationId);
      
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this organization',
        });
      }
      
      return await db.getDeletedRecordsByOrganization(input.organizationId);
    }),

  // Restore a soft-deleted record
  restore: protectedProcedure
    .input(
      z.object({
        recordType: z.string(),
        recordId: z.number(),
        organizationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user belongs to the organization
      const userOrgs = await db.getUserOrganizations(ctx.user.id);
      const hasAccess = userOrgs.some(uo => uo.organizationId === input.organizationId);
      
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this organization',
        });
      }
      
      return await db.restoreRecord(input.recordType, input.recordId);
    }),

  // Permanently delete a record (hard delete)
  permanentDelete: protectedProcedure
    .input(
      z.object({
        recordType: z.string(),
        recordId: z.number(),
        organizationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user belongs to the organization
      const userOrgs = await db.getUserOrganizations(ctx.user.id);
      const hasAccess = userOrgs.some(uo => uo.organizationId === input.organizationId);
      
      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this organization',
        });
      }
      
      return await db.permanentDeleteRecord(input.recordType, input.recordId);
    }),
});

// ============================================================================
// USERS ROUTER
// ============================================================================

export const usersRouter = router({
  // Get user by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getUserById(input.id);
    }),
});

// ============================================================================
// INVITATIONS ROUTER
// ============================================================================

export const invitationsRouter = router({
  // Create invitation (platform admin or org admin)
  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      organizationId: z.number(),
      role: z.enum(['org_admin', 'program_manager', 'finance_manager', 'meal_officer', 'case_worker', 'viewer']).default('viewer'),
      expiresInDays: z.number().min(1).max(30).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user can manage this organization
      const canManage = await db.canUserManageOrganization(ctx.user.id, input.organizationId);
      if (!canManage) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to invite users to this organization' });
      }
      
      const result = await db.createInvitation({
        email: input.email,
        organizationId: input.organizationId,
        role: input.role,
        invitedBy: ctx.user.id,
        expiresInDays: input.expiresInDays,
      });
      
      return result;
    }),

  // List invitations for an organization
  list: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const canManage = await db.canUserManageOrganization(ctx.user.id, input.organizationId);
      if (!canManage) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to view invitations for this organization' });
      }
      return await db.listOrganizationInvitations(input.organizationId);
    }),

  // Get invitation by token (public - for accepting)
  getByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      return await db.getInvitationByToken(input.token);
    }),

  // Accept invitation
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const success = await db.acceptInvitation(input.token, ctx.user.id);
      if (!success) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation is invalid, expired, or already accepted' });
      }
      return { success: true };
    }),

  // Revoke invitation
  revoke: protectedProcedure
    .input(z.object({ invitationId: z.number(), organizationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const canManage = await db.canUserManageOrganization(ctx.user.id, input.organizationId);
      if (!canManage) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to revoke invitations for this organization' });
      }
      const success = await db.revokeInvitation(input.invitationId);
      return { success };
    }),
});

// ============================================================================
// COMBINED IMS ROUTER
// ============================================================================

// Dashboard router for platform analytics
export const dashboardRouter = router({
  // Get user counts (platform vs organization) - uses real data from users table
  getUserCounts: platformScopedProcedure.query(async () => {
    const db_instance = await getDb();
    
    // Query all active (non-deleted) users and their roles
    const result = await db_instance
      .select({ role: users.role })
      .from(users)
      .where(eq(users.isDeleted, 0));
    
    const platformUsers = result.filter(u => 
      ['platform_admin', 'platform_super_admin', 'platform_auditor'].includes(u.role || '')
    ).length;
    
    const orgUsers = result.filter(u => 
      u.role === 'user' || u.role === 'organization_admin' || u.role === 'manager'
    ).length;
    
    const totalUsers = result.length;
    
    return { platformUsers, orgUsers, totalUsers };
  }),
  
  // Get recent audit log entries for Platform Activity section
  getRecentActivities: platformScopedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db_instance = await getDb();
      
      const logs = await db_instance
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          userId: auditLogs.userId,
          createdAt: auditLogs.createdAt,
          details: auditLogs.details,
        })
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);
      
      return logs.map(log => ({
        id: log.id,
        description: `${log.action} on ${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}`,
        action: log.action,
        entityType: log.entityType,
        userId: log.userId,
        createdAt: log.createdAt,
        details: log.details,
      }));
    }),
});

export const imsRouter = router({
  platformUsers: platformUsersRouter,
  globalSettings: globalSettingsRouter,
  auditLogs: auditLogsRouter,
  organizations: organizationsRouter,
  operatingUnits: operatingUnitsRouter,
  userAssignments: userAssignmentsRouter,
  microsoftIntegration: microsoftIntegrationRouter,
  deletedRecords: importedDeletedRecordsRouter,
  deletedRecordsAnalytics: deletedRecordsAnalyticsRouter,
  retentionPolicy: retentionPolicyRouter,
  passwordManagement: passwordManagementRouter,
  users: usersRouter,
  invitations: invitationsRouter,
  reportsAnalytics: reportsAnalyticsRouter,
  dashboard: dashboardRouter,
  platformEmail: platformEmailRouter,
});
