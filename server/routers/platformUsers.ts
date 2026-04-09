import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../\_core/trpc";
import * as db from "../db";
import { ENV } from "../\_core/env";
import { domainValidationService } from "../services/organization/domainValidationService";
import { users, userArchiveLog } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "../db";

/**
 * Platform Users Router
 * Manages platform administrator accounts
 * 
 * Only platform admins can access these procedures
 */

export const platformUsersRouter = router({
  // List all platform admin users
  list: adminProcedure.query(async () => {
    return await db.getAllPlatformAdmins();
  }),

  // Get platform admin by ID
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const user = await db.getPlatformAdminById(input.id);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Platform admin not found',
        });
      }
      return user;
    }),

  // Create new platform admin
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email format"),
        authenticationProvider: z.enum(["email", "microsoft365", "google", "sso"]).default("email"),
        externalIdentityId: z.string().optional(),
        role: z.enum(["platform_super_admin", "platform_admin", "platform_auditor"]).default("platform_admin"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user with this email already exists
      const existingUser = await db.getUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already in use by another user',
        });
      }

      // Create new platform admin user
      const id = await db.createUser({
        name: input.name,
        email: input.email,
        role: input.role,
        authenticationProvider: input.authenticationProvider,
        externalIdentityId: input.externalIdentityId,
      });

      // Audit log for user creation
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: null,
        operatingUnitId: null,
        action: "platform_admin_created",
        entityType: "platform_admin",
        entityId: id,
        details: JSON.stringify({
          createdUserId: id,
          createdUserName: input.name,
          createdUserEmail: input.email,
          role: input.role,
          createdBy: ctx.user.name,
        }),
      });
      
      return { id, success: true };
    }),

  // Update platform admin
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        loginMethod: z.string().optional(),
        role: z.enum(["platform_super_admin", "platform_admin", "platform_auditor"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, role, ...updates } = input;
      
      // Check if user exists
      const user = await db.getPlatformAdminById(id);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Platform admin not found',
        });
      }

      // Prevent users from changing their own role (except system owner)
      const isOwner = ctx.user.openId === ENV.ownerOpenId;
      if (id === ctx.user.id && role && role !== user.role && !isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot change your own role',
        });
      }

      // If email is being updated, validate domain and check for conflicts
      if (updates.email && updates.email !== user.email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updates.email)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid email format',
          });
        }

        // Check for email conflicts
        const existingUser = await db.getUserByEmail(updates.email);
        if (existingUser && existingUser.id !== id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already in use by another user',
          });
        }

        // Validate domain for platform admins (allow any domain)
        const domainValidation = await domainValidationService.validateEmailDomain({
          organizationId: null, // Platform admins don't belong to an organization
          email: updates.email,
          allowPublicDomains: true, // Platform admins can use any domain
        });

        if (!domainValidation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: domainValidation.message || 'Email domain validation failed',
          });
        }
      }

      // Update basic fields
      await db.updatePlatformAdmin(id, updates);
      
      // Update role if provided and log the change
      if (role && role !== user.role) {
        await db.updateUserRole(id, role as any);
        
        // Audit log for role change
        await db.createAuditLog({
          userId: ctx.user.id,
          organizationId: null,
          operatingUnitId: null,
          action: "platform_role_change",
          entityType: "platform_admin",
          entityId: id,
          details: JSON.stringify({
            targetUserId: id,
            targetUserName: user.name,
            targetUserEmail: user.email,
            oldRole: user.role,
            newRole: role,
            changedBy: ctx.user.name,
          }),
        });
      }
      
      return { success: true };
    }),

  /** Soft delete platform admin (governance model: mark as deleted, archive snapshot, preserve records) */
  delete: adminProcedure
    .input(z.object({ 
      id: z.number(),
      deletionReason: z.string().min(1, "Deletion reason is required")
    }))
    .mutation(async ({ input, ctx }) => {
      // Prevent self-deletion
      if (input.id === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot delete your own account',
        });
      }

      // Check if user exists
      const user = await db.getPlatformAdminById(input.id);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Platform admin not found',
        });
      }

      // Prevent deletion of already deleted users
      if (user.isDeleted) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User is already deleted',
        });
      }

      // Get database instance
      const dbInstance = await getDb();

      // 1. Archive the user snapshot (for Deleted Records module)
      await dbInstance.insert(userArchiveLog).values({
        userId: input.id,
        action: 'delete',
        userSnapshot: JSON.stringify(user),
        reason: input.deletionReason,
        performedBy: ctx.user.id,
        performedByName: ctx.user.name || ctx.user.email || 'Unknown',
      });

      // 2. Mark user as soft-deleted (system-level)
      await dbInstance.update(users).set({
        isDeleted: true,
        isActive: false,
        deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        deletedBy: ctx.user.id,
        deletionReason: input.deletionReason,
      }).where(eq(users.id, input.id));

      // 3. Audit log for deletion
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: null,
        operatingUnitId: null,
        action: "platform_admin_soft_deleted",
        entityType: "platform_admin",
        entityId: input.id,
        details: JSON.stringify({
          deletedUserId: input.id,
          deletedUserName: user.name,
          deletedUserEmail: user.email,
          deletionReason: input.deletionReason,
          deletedBy: ctx.user.name,
          archiveAction: 'User marked as deleted, moved to Deleted Records module',
        }),
      });
      
      return { success: true, message: 'Platform admin soft deleted successfully' };
    }),
});
