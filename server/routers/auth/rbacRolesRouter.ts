/**
 * RBAC Roles Router
 * 
 * Location: server/routers/auth/rbacRolesRouter.ts
 * 
 * Purpose: Manages RBAC roles and user role assignments
 * - Fetch available roles for an organization
 * - Get role details by ID
 * - Assign roles to users (admin only)
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { rbacRoles, rbacUserPermissions, users } from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const rbacRolesRouter = router({
  /**
   * Get all available roles for the current organization
   * Used in user management UI to display role selection dropdown
   * 
   * @param organizationId - Optional organization ID (defaults to user's org)
   * @returns Array of roles with id, name, description, permissions
   */
  getRbacRoles: protectedProcedure
    .input(z.object({
      organizationId: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      try {
        // Use provided organizationId or fall back to user's organization
        const orgId = input?.organizationId || ctx.user?.organizationId;
        
        if (!orgId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Organization ID is required",
          });
        }

        const db = await getDb();

        // Fetch all active roles for the organization
        const roles = await db
          .select({
            id: rbacRoles.id,
            organizationId: rbacRoles.organizationId,
            name: rbacRoles.name,
            name_ar: rbacRoles.name_ar,
            description: rbacRoles.description,
            description_ar: rbacRoles.description_ar,
            permissions: rbacRoles.permissions,
            is_system: rbacRoles.is_system,
            is_locked: rbacRoles.is_locked,
          })
          .from(rbacRoles)
          .where(
            and(
              eq(rbacRoles.organizationId, parseInt(orgId)),
              eq(rbacRoles.is_deleted, 0)
            )
          );

        return roles;
      } catch (err) {
        console.error("[RBAC] Failed to get roles:", err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch roles",
        });
      }
    }),

  /**
   * Get a specific role by ID with full details
   * 
   * @param roleId - Role ID to fetch
   * @returns Complete role object with all fields
   */
  getRbacRoleById: protectedProcedure
    .input(z.object({
      roleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        const role = await db
          .select()
          .from(rbacRoles)
          .where(
            and(
              eq(rbacRoles.id, parseInt(input.roleId)),
              eq(rbacRoles.is_deleted, 0)
            )
          )
          .limit(1);

        if (!role.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found",
          });
        }

        return role[0];
      } catch (err) {
        console.error("[RBAC] Failed to get role:", err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch role",
        });
      }
    }),

  /**
   * Assign a role to a user in an organization
   * Only platform admins can assign roles
   * 
   * @param userId - User ID to assign role to
   * @param organizationId - Organization ID
   * @param roleId - Role ID to assign
   * @returns Success message with assignment details
   */
  assignRoleToUser: protectedProcedure
    .input(z.object({
      userId: z.string(),
      organizationId: z.string(),
      roleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (!["platform_admin", "platform_super_admin"].includes(ctx.user?.role || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can assign roles",
          });
        }

        const db = await getDb();

        // Verify role exists and belongs to the organization
        const role = await db
          .select()
          .from(rbacRoles)
          .where(
            and(
              eq(rbacRoles.id, parseInt(input.roleId)),
              eq(rbacRoles.organizationId, parseInt(input.organizationId)),
              eq(rbacRoles.is_deleted, 0)
            )
          )
          .limit(1);

        if (!role.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Role not found in this organization",
          });
        }

        // Create or update user permission record
        await db
          .insert(rbacUserPermissions)
          .values({
            userId: input.userId,
            organizationId: input.organizationId,
            roleId: input.roleId,
            permissions: role[0].permissions,
            is_active: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onDuplicateKeyUpdate({
            set: {
              roleId: input.roleId,
              permissions: role[0].permissions,
              updatedAt: new Date(),
            },
          });

        return {
          success: true,
          message: `Role ${role[0].name} assigned to user`,
          userId: input.userId,
          roleId: input.roleId,
        };
      } catch (err) {
        console.error("[RBAC] Failed to assign role:", err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign role",
        });
      }
    }),

  /**
   * Get all users with their assigned roles in an organization
   * Admin only
   */
  getUsersWithRoles: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Verify user is admin
        if (!["platform_admin", "platform_super_admin"].includes(ctx.user?.role || "")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can view user roles",
          });
        }

        const db = await getDb();

        const usersWithRoles = await db
          .select({
            userId: rbacUserPermissions.userId,
            userName: users.name,
            userEmail: users.email,
            roleId: rbacUserPermissions.roleId,
            roleName: rbacRoles.name,
            roleNameAr: rbacRoles.name_ar,
            isActive: rbacUserPermissions.is_active,
          })
          .from(rbacUserPermissions)
          .leftJoin(users, eq(rbacUserPermissions.userId, users.id))
          .leftJoin(rbacRoles, eq(rbacUserPermissions.roleId, rbacRoles.id))
          .where(
            and(
              eq(rbacUserPermissions.organizationId, parseInt(input.organizationId)),
              eq(rbacUserPermissions.is_active, 1)
            )
          );

        return usersWithRoles;
      } catch (err) {
        console.error("[RBAC] Failed to get users with roles:", err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users with roles",
        });
      }
    }),
});
