import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, userOrganizations } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Organization Router
 * Handles organization-level operations including user and role management
 */
export const organizationRouter = router({
  /**
   * List all users in the current user's organization
   * Only accessible to organization admins
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.user;
    
    // Get current user's organization membership
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }
    const userOrg = await db
      .select()
      .from(userOrganizations)
      .where(eq(userOrganizations.userId, currentUser.id))
      .limit(1);

    if (!userOrg || userOrg.length === 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not associated with an organization",
      });
    }

    const organizationId = userOrg[0].organizationId;

    // Get all user-organization relationships for this organization
    const orgUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        platformRole: userOrganizations.platformRole,
        orgRoles: userOrganizations.orgRoles,
        permissions: userOrganizations.permissions,
        createdAt: users.createdAt,
      })
      .from(userOrganizations)
      .innerJoin(users, eq(userOrganizations.userId, users.id))
      .where(eq(userOrganizations.organizationId, organizationId));

    return orgUsers;
  }),

  /**
   * Update a user's role
   * Only accessible to organization admins
   * Cannot change own role
   */
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["organization_admin", "user"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.user;

      // Get current user's organization membership and role
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }
      const currentUserOrg = await db
        .select()
        .from(userOrganizations)
        .where(eq(userOrganizations.userId, currentUser.id))
        .limit(1);

      if (!currentUserOrg || currentUserOrg.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User is not associated with an organization",
        });
      }

      // Check if current user is organization admin
      if (currentUserOrg[0].platformRole !== "organization_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only organization admins can update roles",
        });
      }

      // Prevent changing own role
      if (currentUser.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      const organizationId = currentUserOrg[0].organizationId;

      // Verify target user is in the same organization
      const targetUserOrg = await db
        .select()
        .from(userOrganizations)
        .where(
          and(
            eq(userOrganizations.userId, input.userId),
            eq(userOrganizations.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!targetUserOrg || targetUserOrg.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in your organization",
        });
      }

      // Update the role in userOrganizations table
      await db
        .update(userOrganizations)
        .set({ platformRole: input.role })
        .where(
          and(
            eq(userOrganizations.userId, input.userId),
            eq(userOrganizations.organizationId, organizationId)
          )
        );

      return { success: true };
    }),
});
