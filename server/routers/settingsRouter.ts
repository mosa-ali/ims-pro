/**
 * SETTINGS ROUTER - Central RBAC & Organization Settings
 */

import { z } from "zod";
import { scopedProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  rbacRoles,
  rbacUserPermissions,
  optionSets,
  optionSetValues,
  organizationBranding,
  landingSettings,
  emailTemplates,
  notificationPreferences,
  emailProviderSettings,
  notificationEventSettings,
  notificationOutbox,
  users,
  userOrganizations,
  importHistory,
  userPermissionOverrides,
  auditLogs,
  organizations,
  permissionReviews,
  userArchiveLog,
  userOperatingUnits,
  operatingUnits,
} from "../../drizzle/schema";
import {  eq, and, asc, desc, sql, gte, lte, like, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { initializeDefaultRoles, MODULE_DEFINITIONS, SCREEN_DEFINITIONS, getPermissionTree, SENSITIVE_WORKSPACES, canAccess, logSensitiveAccess, ALL_ACTIONS, getUserOverrides } from "../rbacService";

function assertAdmin(ctx: any) {
  const role = ctx.user?.role?.toLowerCase();
  const platformRole = ctx.user?.platformRole?.toLowerCase();
  
  // Allow various admin role formats
  const allowedRoles = ['platform_admin', 'platform super_admin', 'admin', 'system admin', 'organization_admin'];
  const isAdmin = allowedRoles.some(r => role?.includes(r.replace('_', ' ')) || role?.includes(r) || platformRole?.includes(r.replace('_', ' ')) || platformRole?.includes(r));
  
  if (!isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

// RBAC ROLES
// Permission Zod schema supporting extended actions
const actionPermissionsSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
  export: z.boolean().optional(),
  approve: z.boolean().optional(),
  submit: z.boolean().optional(),
});

const rbacRolesRouter = router({
  list: scopedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    await initializeDefaultRoles(orgId, ctx.user.id);
    const roles = await db.select().from(rbacRoles)
      .where(and(eq(rbacRoles.organizationId, orgId), isNull(rbacRoles.deletedAt)))
      .orderBy(asc(rbacRoles.id));
    return roles.map((r) => ({
      ...r,
      permissions: JSON.parse(r.permissions || "{}"),
    }));
  }),

  create: scopedProcedure.input(z.object({
    name: z.string().min(1),
    nameAr: z.string().optional(),
    description: z.string().optional(),
    descriptionAr: z.string().optional(),
    permissions: z.record(z.string(), actionPermissionsSchema),
    screenPermissions: z.record(z.string(), z.record(z.string(), actionPermissionsSchema)).optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const result = await db.insert(rbacRoles).values({
      organizationId: ctx.scope.organizationId,
      name: input.name, nameAr: input.nameAr || null,
      description: input.description || null, descriptionAr: input.descriptionAr || null,
      permissions: JSON.stringify(input.permissions),
      isSystem: false, isLocked: false, createdBy: ctx.user.id,
    });
    // Log the role creation
    await logSensitiveAccess(ctx.user.id, ctx.scope.organizationId, null, "role.create", "settings", "roles", "rbac_role", Number(result[0].insertId), JSON.stringify({ roleName: input.name }));
    return { id: result[0].insertId };
  }),

  update: scopedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    nameAr: z.string().optional(),
    description: z.string().optional(),
    descriptionAr: z.string().optional(),
    permissions: z.record(z.string(), actionPermissionsSchema).optional(),
    screenPermissions: z.record(z.string(), z.record(z.string(), actionPermissionsSchema)).optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const existing = await db.select({ isLocked: rbacRoles.isLocked, name: rbacRoles.name }).from(rbacRoles)
      .where(and(eq(rbacRoles.id, input.id), eq(rbacRoles.organizationId, ctx.scope.organizationId))).limit(1);
    if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing[0].isLocked && (input.permissions || input.screenPermissions)) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify locked role permissions" });
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.nameAr !== undefined) updateData.nameAr = input.nameAr;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.descriptionAr !== undefined) updateData.descriptionAr = input.descriptionAr;
    if (input.permissions !== undefined) updateData.permissions = JSON.stringify(input.permissions);
    await db.update(rbacRoles).set(updateData)
      .where(and(eq(rbacRoles.id, input.id), eq(rbacRoles.organizationId, ctx.scope.organizationId)));
    // Log the role update
    await logSensitiveAccess(ctx.user.id, ctx.scope.organizationId, null, "role.update", "settings", "roles", "rbac_role", input.id, JSON.stringify({ roleName: existing[0].name, changes: Object.keys(updateData) }));
    return { success: true };
  }),

  delete: scopedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const existing = await db.select({ isSystem: rbacRoles.isSystem, name: rbacRoles.name }).from(rbacRoles)
      .where(and(eq(rbacRoles.id, input.id), eq(rbacRoles.organizationId, ctx.scope.organizationId))).limit(1);
    if (existing.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing[0].isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete system roles" });
    await db.update(rbacRoles).set({ deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "), deletedBy: ctx.user.id }).where(eq(rbacRoles.id, input.id));
    await logSensitiveAccess(ctx.user.id, ctx.scope.organizationId, null, "role.delete", "settings", "roles", "rbac_role", input.id, JSON.stringify({ roleName: existing[0].name }));
    return { success: true };
  }),

  /** Clone an existing role with all its permissions */
  clone: scopedProcedure.input(z.object({
    sourceRoleId: z.number(),
    newName: z.string().min(1),
    newNameAr: z.string().optional(),
    newDescription: z.string().optional(),
    newDescriptionAr: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    // Fetch the source role
    const [source] = await db.select().from(rbacRoles)
      .where(and(eq(rbacRoles.id, input.sourceRoleId), eq(rbacRoles.organizationId, orgId), isNull(rbacRoles.deletedAt)))
      .limit(1);
    if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'Source role not found' });
    // Check if a role with the same name already exists
    const [existingName] = await db.select({ id: rbacRoles.id }).from(rbacRoles)
      .where(and(eq(rbacRoles.organizationId, orgId), eq(rbacRoles.name, input.newName), isNull(rbacRoles.deletedAt)))
      .limit(1);
    if (existingName) throw new TRPCError({ code: 'CONFLICT', message: 'A role with this name already exists' });
    // Create the cloned role
    const result = await db.insert(rbacRoles).values({
      organizationId: orgId,
      name: input.newName,
      nameAr: input.newNameAr || source.nameAr || null,
      description: input.newDescription || source.description || null,
      descriptionAr: input.newDescriptionAr || source.descriptionAr || null,
      permissions: source.permissions, // Copy all permissions
      isSystem: false,
      isLocked: false,
      createdBy: ctx.user.id,
    });
    const newRoleId = Number(result[0].insertId);
    await logSensitiveAccess(ctx.user.id, orgId, null, 'role.clone', 'settings', 'roles', 'rbac_role', newRoleId,
      JSON.stringify({ sourceRoleId: input.sourceRoleId, sourceRoleName: source.name, newRoleName: input.newName }));
    return { id: newRoleId, name: input.newName };
  }),

  getDefinitions: scopedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    return { modules: MODULE_DEFINITIONS, screens: SCREEN_DEFINITIONS };
  }),

  /** Get the full permission tree for the admin UI */
  getPermissionTree: scopedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    return {
      tree: getPermissionTree(),
      sensitiveWorkspaces: SENSITIVE_WORKSPACES,
      allActions: ALL_ACTIONS,
    };
  }),

  /** Get audit log for RBAC changes */
  getAuditLog: scopedProcedure.input(z.object({
    limit: z.number().min(1).max(200).default(50),
    offset: z.number().min(0).default(0),
    actionFilter: z.string().optional(),
  }).optional()).query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const logs = await db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    }).from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, ctx.scope.organizationId),
        sql`${auditLogs.action} LIKE 'rbac.%'`,
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);
    
    // Get user names for the logs
    const userIds = [...new Set(logs.filter(l => l.userId).map(l => l.userId!))];
    let userMap = new Map<number, string>();
    if (userIds.length > 0) {
      const userResults = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
      userResults.forEach(u => userMap.set(u.id, u.name || 'Unknown'));
    }
    
    return logs.map(l => ({
      ...l,
      userName: l.userId ? userMap.get(l.userId) || 'Unknown' : 'System',
    }));
  }),
});

// RBAC USER PERMISSIONS
const rbacUsersRouter = router({
  list: scopedProcedure.input(z.object({
    search: z.string().optional(),
    roleFilter: z.string().optional(),
    statusFilter: z.string().optional(),
    ouFilter: z.number().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const ouId = ctx.scope.operatingUnitId;
    
    // ✅ NEW: Filter users by organization AND operating unit
    // Only show users assigned to the current OU
    const userOUAssignments = await db.select({
      userId: userOperatingUnits.userId,
    }).from(userOperatingUnits)
      .where(eq(userOperatingUnits.operatingUnitId, ouId));
    
    if (userOUAssignments.length === 0) return [];
    
    const userIds = userOUAssignments.map((u) => u.userId);
    
    // Fetch user details
    const userDetails = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, authenticationProvider: users.authenticationProvider, lastSignedIn: users.lastSignedIn, createdAt: users.createdAt })
      .from(users).where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
    // ✅ NEW: Get platform role from userOrganizations for context
    const orgUsers = await db.select({ userId: userOrganizations.userId, platformRole: userOrganizations.platformRole })
      .from(userOrganizations).where(eq(userOrganizations.organizationId, orgId));
    const orgUserMap = new Map(orgUsers.map((u) => [u.userId, u]));
    
    const permissions = await db.select().from(rbacUserPermissions).where(eq(rbacUserPermissions.organizationId, orgId));
    const permMap = new Map(permissions.map((p) => [p.userId, p]));
    const allRoles = await db.select({ id: rbacRoles.id, name: rbacRoles.name }).from(rbacRoles)
      .where(and(eq(rbacRoles.organizationId, orgId), isNull(rbacRoles.deletedAt)));
    const roleMap = new Map(allRoles.map((r) => [r.id, r.name]));
    
    // ✅ UPDATED: Fetch OU assignments for users in current OU only
    const ouAssignments = userIds.length > 0
      ? await db.select({
          userId: userOperatingUnits.userId,
          ouId: userOperatingUnits.operatingUnitId,
          ouName: operatingUnits.name,
        }).from(userOperatingUnits)
          .innerJoin(operatingUnits, eq(operatingUnits.id, userOperatingUnits.operatingUnitId))
          .where(sql`${userOperatingUnits.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const ouMap = new Map<number, { id: number; name: string }[]>();
    for (const row of ouAssignments) {
      if (!ouMap.has(row.userId)) ouMap.set(row.userId, []);
      ouMap.get(row.userId)!.push({ id: row.ouId, name: row.ouName });
    }
    let result = userDetails.map((u) => {
      const perm = permMap.get(u.id);
      const orgUser = orgUserMap.get(u.id);
      return {
        id: u.id, fullName: u.name || "Unknown", email: u.email || "",
        role: u.role, platformRole: orgUser?.platformRole || "user",
        rbacRoleId: perm?.roleId || null, rbacRoleName: perm?.roleId ? roleMap.get(perm.roleId) || null : null,
        status: perm?.isActive !== 0 ? "Active" as const : "Disabled" as const,
        lastLogin: u.lastSignedIn, createdAt: u.createdAt, hasPermissions: !!perm,
        authenticationProvider: u.authenticationProvider || 'microsoft',
        operatingUnits: ouMap.get(u.id) || [],
      };
    });
    if (input?.search) {
      const q = input.search.toLowerCase();
      result = result.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (input?.roleFilter && input.roleFilter !== "all") result = result.filter((u) => u.rbacRoleName === input.roleFilter);
    if (input?.statusFilter && input.statusFilter !== "all") result = result.filter((u) => u.status === input.statusFilter);
    if (input?.ouFilter) result = result.filter((u) => u.operatingUnits.some(ou => ou.id === input.ouFilter));
    return result;
  }),

  assignPermissions: scopedProcedure.input(z.object({
    userId: z.number(),
    roleId: z.number().nullable(),
    permissions: z.record(z.string(), actionPermissionsSchema),
    screenPermissions: z.record(z.string(), z.record(z.string(), actionPermissionsSchema)).optional(),
    tabPermissions: z.any().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const ouId = ctx.scope.operatingUnitId;
    
    // ✅ NEW: Verify user is assigned to current OU
    const [userOUAssignment] = await db.select()
      .from(userOperatingUnits)
      .where(and(
        eq(userOperatingUnits.userId, input.userId),
        eq(userOperatingUnits.operatingUnitId, ouId)
      ))
      .limit(1);
    
    if (!userOUAssignment) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User is not assigned to this operating unit'
      });
    }
    
    // ✅ NEW: Verify user belongs to correct organization
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    
    if (!user || user.organizationId !== orgId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User does not belong to this organization'
      });
    }
    
    const existing = await db.select({ id: rbacUserPermissions.id }).from(rbacUserPermissions)
      .where(and(eq(rbacUserPermissions.userId, input.userId), eq(rbacUserPermissions.organizationId, orgId))).limit(1);
    if (existing.length > 0) {
      await db.update(rbacUserPermissions).set({
        roleId: input.roleId, permissions: JSON.stringify(input.permissions),
        screenPermissions: input.screenPermissions ? JSON.stringify(input.screenPermissions) : null,
        tabPermissions: input.tabPermissions ? JSON.stringify(input.tabPermissions) : null,
        updatedBy: ctx.user.id,
      }).where(eq(rbacUserPermissions.id, existing[0].id));
    } else {
      await db.insert(rbacUserPermissions).values({
        userId: input.userId, organizationId: orgId, roleId: input.roleId,
        permissions: JSON.stringify(input.permissions),
        screenPermissions: input.screenPermissions ? JSON.stringify(input.screenPermissions) : null,
        tabPermissions: input.tabPermissions ? JSON.stringify(input.tabPermissions) : null,
        isActive: 1, updatedBy: ctx.user.id,
      });
    }
    // Audit log for permission assignment
    await logSensitiveAccess(ctx.user.id, orgId, ouId, existing.length > 0 ? 'permission.update' : 'permission.assign', 'settings', 'roles', 'user_permission', input.userId, JSON.stringify({ roleId: input.roleId, moduleCount: Object.keys(input.permissions).length }));
    return { success: true };
  }),

  toggleStatus: scopedProcedure.input(z.object({ userId: z.number(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const ouId = ctx.scope.operatingUnitId;
    
    // ✅ NEW: Verify user is assigned to current OU
    const [userOUAssignment] = await db.select()
      .from(userOperatingUnits)
      .where(and(
        eq(userOperatingUnits.userId, input.userId),
        eq(userOperatingUnits.operatingUnitId, ouId)
      ))
      .limit(1);
    
    if (!userOUAssignment) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User is not assigned to this operating unit'
      });
    }
    
    await db.update(rbacUserPermissions).set({ isActive: input.isActive, updatedBy: ctx.user.id })
      .where(and(eq(rbacUserPermissions.userId, input.userId), eq(rbacUserPermissions.organizationId, orgId)));
    await logSensitiveAccess(ctx.user.id, orgId, ouId, input.isActive ? 'permission.activate' : 'permission.deactivate', 'settings', 'roles', 'user_permission', input.userId);
    return { success: true };
  }),

  /** Soft delete a user (governance model: mark as deleted, archive snapshot, remove org/RBAC, preserve records) */
  deleteUser: scopedProcedure.input(z.object({
    userId: z.number(),
    reason: z.string().min(3, "Deletion reason is required and must be at least 3 characters"),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const ouId = ctx.scope.operatingUnitId;
    
    // Prevent self-deletion
    if (input.userId === ctx.user.id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot delete your own account' });
    }
    
    // ✅ NEW: Verify user is assigned to current OU
    const [userOUAssignment] = await db.select()
      .from(userOperatingUnits)
      .where(and(
        eq(userOperatingUnits.userId, input.userId),
        eq(userOperatingUnits.operatingUnitId, ouId)
      ))
      .limit(1);
    
    if (!userOUAssignment) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User is not assigned to this operating unit'
      });
    }
    
    // Fetch the user record
    const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    if (targetUser.isDeleted) throw new TRPCError({ code: 'BAD_REQUEST', message: 'User is already deleted' });

    // Collect snapshot data before deletion
    const userOrgRows = await db.select({
      orgId: userOrganizations.organizationId,
      orgName: organizations.name,
      role: userOrganizations.role,
    }).from(userOrganizations)
      .leftJoin(organizations, eq(organizations.id, userOrganizations.organizationId))
      .where(eq(userOrganizations.userId, input.userId));

    const userPermRows = await db.select().from(rbacUserPermissions)
      .where(eq(rbacUserPermissions.userId, input.userId));

    const userOverrideRows = await db.select().from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, input.userId));

    const previousRoles = userOrgRows.map(r => r.role).filter(Boolean);
    const previousOrgs = userOrgRows.map(r => ({ orgId: r.orgId, orgName: r.orgName }));

    // 1. Archive the user snapshot
    await db.insert(userArchiveLog).values({
      userId: input.userId,
      action: 'delete',
      userSnapshot: JSON.stringify(targetUser),
      previousRoles: JSON.stringify(previousRoles),
      previousOrganizations: JSON.stringify(previousOrgs),
      previousPermissions: JSON.stringify({ permissions: userPermRows, overrides: userOverrideRows }),
      reason: input.reason || undefined,
      performedBy: ctx.user.id,
      performedByName: ctx.user.name || ctx.user.email || 'Unknown',
    });

    // 2. Mark user as soft-deleted (system-level)
    await db.update(users).set({
      isDeleted: 1,
      isActive: 0,
      deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      deletedBy: ctx.user.id,
      deletionReason: input.reason || undefined,
    }).where(eq(users.id, input.userId));

    // 3. Remove permission overrides across ALL orgs
    await db.delete(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, input.userId));

    // 4. Remove RBAC user permissions across ALL orgs
    await db.delete(rbacUserPermissions)
      .where(eq(rbacUserPermissions.userId, input.userId));

    // 5. Remove user from ALL organizations
    await db.delete(userOrganizations)
      .where(eq(userOrganizations.userId, input.userId));

    // 6. Audit log
    await logSensitiveAccess(ctx.user.id, orgId, ouId, 'user.soft_delete', 'settings', 'users', 'user', input.userId,
      JSON.stringify({ reason: input.reason, previousOrgs, previousRoles }));

    return { success: true };
  }),

  /** Bulk soft-delete multiple users at once */
  bulkDeleteUsers: scopedProcedure.input(z.object({
    userIds: z.array(z.number()).min(1).max(100),
    reason: z.string().min(3, "Deletion reason is required and must be at least 3 characters"),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const results: { userId: number; success: boolean; error?: string }[] = [];

    // Filter out self-deletion
    const filteredIds = input.userIds.filter(id => id !== ctx.user.id);
    if (filteredIds.length < input.userIds.length) {
      results.push({ userId: ctx.user.id, success: false, error: 'Cannot delete your own account' });
    }

    for (const userId of filteredIds) {
      try {
        // Fetch the user
        const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!targetUser) { results.push({ userId, success: false, error: 'User not found' }); continue; }
        if (targetUser.isDeleted) { results.push({ userId, success: false, error: 'Already deleted' }); continue; }

        // Collect snapshot data
        const userOrgRows = await db.select({
          orgId: userOrganizations.organizationId,
          orgName: organizations.name,
          role: userOrganizations.role,
        }).from(userOrganizations)
          .leftJoin(organizations, eq(organizations.id, userOrganizations.organizationId))
          .where(eq(userOrganizations.userId, userId));

        const userPermRows = await db.select().from(rbacUserPermissions)
          .where(eq(rbacUserPermissions.userId, userId));
        const userOverrideRows = await db.select().from(userPermissionOverrides)
          .where(eq(userPermissionOverrides.userId, userId));

        const previousRoles = userOrgRows.map(r => r.role).filter(Boolean);
        const previousOrgs = userOrgRows.map(r => ({ orgId: r.orgId, orgName: r.orgName }));

        // 1. Archive snapshot
        await db.insert(userArchiveLog).values({
          userId,
          action: 'delete',
          userSnapshot: JSON.stringify(targetUser),
          previousRoles: JSON.stringify(previousRoles),
          previousOrganizations: JSON.stringify(previousOrgs),
          previousPermissions: JSON.stringify({ permissions: userPermRows, overrides: userOverrideRows }),
          reason: input.reason || 'Bulk deletion',
          performedBy: ctx.user.id,
          performedByName: ctx.user.name || ctx.user.email || 'Unknown',
        });

        // 2. Mark as soft-deleted
        await db.update(users).set({
          deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          deletedBy: ctx.user.id,
          deletionReason: input.reason || 'Bulk deletion',
        }).where(eq(users.id, userId));

        // 3. Remove overrides
        await db.delete(userPermissionOverrides).where(eq(userPermissionOverrides.userId, userId));
        // 4. Remove RBAC permissions
        await db.delete(rbacUserPermissions).where(eq(rbacUserPermissions.userId, userId));
        // 5. Remove from organizations
        await db.delete(userOrganizations).where(eq(userOrganizations.userId, userId));

        results.push({ userId, success: true });
      } catch (err: any) {
        results.push({ userId, success: false, error: err.message || 'Unknown error' });
      }
    }

    // Audit log the bulk operation
    const successCount = results.filter(r => r.success).length;
    await logSensitiveAccess(ctx.user.id, orgId, ctx.scope.operatingUnitId, 'user.bulk_soft_delete', 'settings', 'users', 'bulk',
      undefined, JSON.stringify({ reason: input.reason, totalRequested: input.userIds.length, successCount, results }));

    return { results, successCount, failedCount: results.length - successCount };
  }),

  /** List soft-deleted users (Deleted Records module) */
  listDeletedUsers: scopedProcedure.input(z.object({
    search: z.string().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const ouId = ctx.scope.operatingUnitId;
    
    // ✅ NEW: Filter deleted users by current OU
    const userOUAssignments = await db.select({ userId: userOperatingUnits.userId })
      .from(userOperatingUnits)
      .where(eq(userOperatingUnits.operatingUnitId, ouId));
    
    const userIds = userOUAssignments.map((u) => u.userId);
    
    const conditions = [eq(users.isDeleted, 1)];
    if (userIds.length > 0) {
      conditions.push(inArray(users.id, userIds));
    } else {
      // No users in this OU, return empty
      return [];
    }
    if (input?.search) {
      conditions.push(sql`(${users.name} LIKE ${`%${input.search}%`} OR ${users.email} LIKE ${`%${input.search}%`})`);
    }
    const deletedUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      deletedAt: users.deletedAt,
      deletedBy: users.deletedBy,
      deletionReason: users.deletionReason,
    }).from(users).where(and(...conditions)).orderBy(desc(users.deletedAt));

    // Enrich with deleted-by name and archive info
    const enriched = await Promise.all(deletedUsers.map(async (u) => {
      let deletedByName = 'Unknown';
      if (u.deletedBy) {
        const [deleter] = await db.select({ name: users.name, email: users.email })
          .from(users).where(eq(users.id, u.deletedBy)).limit(1);
        if (deleter) deletedByName = deleter.name || deleter.email || 'Unknown';
      }
      // Get latest archive entry for this user
      const [archive] = await db.select().from(userArchiveLog)
        .where(and(eq(userArchiveLog.userId, u.id), eq(userArchiveLog.action, 'delete')))
        .orderBy(desc(userArchiveLog.performedAt))
        .limit(1);
      return {
        ...u,
        deletedByName,
        previousRoles: archive?.previousRoles ? JSON.parse(archive.previousRoles) : [],
        previousOrganizations: archive?.previousOrganizations ? JSON.parse(archive.previousOrganizations) : [],
      };
    }));
    return enriched;
  }),

  /** Restore a soft-deleted user */
  restoreUser: scopedProcedure.input(z.object({
    userId: z.number(),
    reassignOrganizationId: z.number().optional(),
    reassignRoleId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = input.reassignOrganizationId || ctx.scope.organizationId;

    // Fetch the deleted user
    const [targetUser] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    if (!targetUser.isDeleted) throw new TRPCError({ code: 'BAD_REQUEST', message: 'User is not deleted' });

    // Get the latest delete archive for restoration metadata
    const [lastArchive] = await db.select().from(userArchiveLog)
      .where(and(eq(userArchiveLog.userId, input.userId), eq(userArchiveLog.action, 'delete')))
      .orderBy(desc(userArchiveLog.performedAt))
      .limit(1);

    // 1. Reactivate the user
    await db.update(users).set({
      isDeleted: 0,
      isActive: 1,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
    }).where(eq(users.id, input.userId));

    // 2. Re-assign to organization
    await db.insert(userOrganizations).values({
      userId: input.userId,
      organizationId: orgId,
      role: 'member',
    });

    // 3. Optionally re-assign RBAC role
    if (input.reassignRoleId) {
      await db.insert(rbacUserPermissions).values({
        userId: input.userId,
        organizationId: orgId,
        roleId: input.reassignRoleId,
      });
    }

    // 4. Archive the restore action
    await db.insert(userArchiveLog).values({
      userId: input.userId,
      action: 'restore',
      userSnapshot: JSON.stringify(targetUser),
      reason: 'Restored by admin',
      performedBy: ctx.user.id,
      performedByName: ctx.user.name || ctx.user.email || 'Unknown',
      restorationMetadata: JSON.stringify({
        reassignedOrg: orgId,
        reassignedRoleId: input.reassignRoleId,
        previousArchiveId: lastArchive?.id,
      }),
    });

    // 5. Audit log
    await logSensitiveAccess(ctx.user.id, orgId, undefined, 'user.restore', 'settings', 'users', 'user', input.userId,
      JSON.stringify({ restoredToOrg: orgId, roleId: input.reassignRoleId }));

    return { success: true };
  }),

  /** Get archive history for a specific user */
  getUserArchiveHistory: scopedProcedure.input(z.object({
    userId: z.number(),
  })).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const history = await db.select().from(userArchiveLog)
      .where(eq(userArchiveLog.userId, input.userId))
      .orderBy(desc(userArchiveLog.performedAt));
    return history;
  }),

  /** Get permission change history for a specific user */
  getPermissionHistory: scopedProcedure.input(z.object({
    userId: z.number(),
    limit: z.number().min(1).max(200).default(50),
  })).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    // Query audit logs for permission-related changes for this user
    const logs = await db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    }).from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, orgId),
        sql`${auditLogs.entityId} = ${input.userId}`,
        sql`(${auditLogs.action} LIKE 'permission.%' OR ${auditLogs.action} LIKE 'override.%' OR ${auditLogs.action} LIKE 'bulk.%' OR ${auditLogs.action} LIKE 'user.%')`,
      ))
      .orderBy(desc(auditLogs.createdAt))
      .limit(input.limit);
    // Get user names for changedBy
    const changerIds = [...new Set(logs.filter(l => l.userId).map(l => l.userId!))];
    let changerMap = new Map<number, string>();
    if (changerIds.length > 0) {
      const changers = await db.select({ id: users.id, name: users.name }).from(users)
        .where(sql`${users.id} IN (${sql.join(changerIds.map(id => sql`${id}`), sql`, `)})`);
      changerMap = new Map(changers.map(c => [c.id, c.name || 'Unknown']));
    }
    return logs.map(l => ({
      ...l,
      changedByName: l.userId ? changerMap.get(l.userId) || 'Unknown' : 'System',
      details: l.details ? JSON.parse(l.details) : null,
    }));
  }),

  // ========================================================================
  // PERMISSION REVIEW REMINDERS
  // ========================================================================

  /** Get users with sensitive access that need review (>90 days since last review) */
  getReviewReminders: scopedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const REVIEW_THRESHOLD_DAYS = 90;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - REVIEW_THRESHOLD_DAYS);

    const sensitiveScreenIds = new Set(SENSITIVE_WORKSPACES.map(w => w.screenId));
    const sensitiveModuleIds = new Set(SENSITIVE_WORKSPACES.map(w => w.moduleId));

    // Get all users with permissions in this org
    const orgUsers = await db.select({ userId: userOrganizations.userId, platformRole: userOrganizations.platformRole })
      .from(userOrganizations).where(eq(userOrganizations.organizationId, orgId));
    const userIds = orgUsers.map(u => u.userId);
    if (userIds.length === 0) return [];

    const userDetails = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users).where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
    const userMap = new Map(userDetails.map(u => [u.id, u]));

    const allPerms = await db.select().from(rbacUserPermissions)
      .where(eq(rbacUserPermissions.organizationId, orgId));
    const permMap = new Map(allPerms.map(p => [p.userId, p]));

    // Get latest reviews per user per module
    const reviews = await db.select().from(permissionReviews)
      .where(eq(permissionReviews.organizationId, orgId));
    const reviewMap = new Map<string, Date>();
    for (const r of reviews) {
      const key = `${r.userId}-${r.moduleId}-${r.screenId || ''}`;
      const existing = reviewMap.get(key);
      if (!existing || r.reviewedAt > existing) {
        reviewMap.set(key, r.reviewedAt);
      }
    }

    const reminders: Array<{
      userId: number; userName: string; userEmail: string;
      moduleId: string; moduleName: string; screenId: string | null; screenName: string | null;
      daysSinceReview: number; lastReviewedAt: string | null;
      permissionGrantedAt: string;
    }> = [];

    for (const orgUser of orgUsers) {
      const user = userMap.get(orgUser.userId);
      if (!user) continue;
      const isPlatformAdmin = user.role === 'platform_admin';
      const isOrgAdmin = user.role === 'organization_admin' || orgUser.platformRole === 'organization_admin';

      if (isPlatformAdmin || isOrgAdmin) {
        // Check all sensitive workspaces for admin users
        for (const sw of SENSITIVE_WORKSPACES) {
          const key = `${user.id}-${sw.moduleId}-${sw.screenId}`;
          const lastReview = reviewMap.get(key);
          if (!lastReview || lastReview < thresholdDate) {
            const modDef = MODULE_DEFINITIONS.find(m => m.id === sw.moduleId);
            const screenDef = (SCREEN_DEFINITIONS[sw.moduleId] || []).find((s: any) => s.id === sw.screenId);
            const daysSince = lastReview ? Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24)) : 999;
            reminders.push({
              userId: user.id, userName: user.name || 'Unknown', userEmail: user.email || '',
              moduleId: sw.moduleId, moduleName: modDef?.name || sw.moduleId,
              screenId: sw.screenId, screenName: screenDef?.name || sw.screenId,
              daysSinceReview: daysSince, lastReviewedAt: lastReview?.toISOString() || null,
              permissionGrantedAt: new Date().toISOString(),
            });
          }
        }
        continue;
      }

      const perm = permMap.get(orgUser.userId);
      if (!perm) continue;
      const modulePerms = JSON.parse(perm.permissions || '{}');
      const screenPerms = JSON.parse(perm.screenPermissions || '{}');

      for (const [modId, modActions] of Object.entries(modulePerms)) {
        const hasAnyAccess = Object.values(modActions as any).some(v => v === true);
        if (!hasAnyAccess) continue;
        const isSensitiveMod = sensitiveModuleIds.has(modId);
        const screens = SCREEN_DEFINITIONS[modId] || [];
        for (const screen of screens) {
          const isSensitiveScreen = sensitiveScreenIds.has(screen.id) || isSensitiveMod;
          if (!isSensitiveScreen) continue;
          const sPerms = screenPerms[modId]?.[screen.id] || {};
          const hasScreenAccess = Object.values({ ...(modActions as any), ...sPerms }).some(v => v === true);
          if (!hasScreenAccess) continue;

          const key = `${user.id}-${modId}-${screen.id}`;
          const lastReview = reviewMap.get(key);
          if (!lastReview || lastReview < thresholdDate) {
            const modDef = MODULE_DEFINITIONS.find(m => m.id === modId);
            const daysSince = lastReview ? Math.floor((Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24)) : 999;
            reminders.push({
              userId: user.id, userName: user.name || 'Unknown', userEmail: user.email || '',
              moduleId: modId, moduleName: modDef?.name || modId,
              screenId: screen.id, screenName: screen.name,
              daysSinceReview: daysSince, lastReviewedAt: lastReview?.toISOString() || null,
              permissionGrantedAt: (typeof perm.createdAt === 'string' ? perm.createdAt : perm.createdAt?.toISOString?.()) || new Date().toISOString(),
            });
          }
        }
      }
    }

    return reminders.sort((a, b) => b.daysSinceReview - a.daysSinceReview);
  }),

  /** Mark a user's sensitive access as reviewed */
  markReviewed: scopedProcedure.input(z.object({
    userId: z.number(),
    moduleId: z.string(),
    screenId: z.string().optional(),
    outcome: z.enum(['approved', 'revoked']),
    notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    await db.insert(permissionReviews).values({
      userId: input.userId,
      organizationId: orgId,
      moduleId: input.moduleId,
      screenId: input.screenId || null,
      reviewedBy: ctx.user.id,
      outcome: input.outcome,
      notes: input.notes || null,
    });
    await logSensitiveAccess(ctx.user.id, orgId, null, `review.${input.outcome}`, 'settings', 'reviews', 'user_permission', input.userId,
      JSON.stringify({ moduleId: input.moduleId, screenId: input.screenId, outcome: input.outcome }));
    return { success: true };
  }),

  // ========================================================================
  // PER-USER PERMISSION OVERRIDES
  // ========================================================================

  /** List all overrides for a specific user */
  listOverrides: scopedProcedure.input(z.object({ userId: z.number() })).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const rows = await db.select().from(userPermissionOverrides)
      .where(and(
        eq(userPermissionOverrides.userId, input.userId),
        eq(userPermissionOverrides.organizationId, orgId)
      ))
      .orderBy(desc(userPermissionOverrides.createdAt));
    // Enrich with creator name
    const creatorIds = [...new Set(rows.map(r => r.createdBy))];
    const creators = creatorIds.length > 0
      ? await db.select({ id: users.id, name: users.name }).from(users).where(sql`${users.id} IN (${sql.join(creatorIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const creatorMap = Object.fromEntries(creators.map(c => [c.id, c.name]));
    return rows.map(r => ({
      ...r,
      createdByName: creatorMap[r.createdBy] || 'Unknown',
      isExpired: r.expiresAt ? new Date(r.expiresAt) < new Date() : false,
    }));
  }),

  /** Create a new permission override for a user */
  createOverride: scopedProcedure.input(z.object({
    userId: z.number(),
    moduleId: z.string(),
    screenId: z.string().nullable().optional(),
    action: z.enum(['view', 'create', 'edit', 'delete', 'export', 'approve', 'submit']),
    overrideType: z.enum(['grant', 'revoke']),
    reason: z.string().optional(),
    expiresAt: z.string().nullable().optional(), // ISO date string
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    await db.insert(userPermissionOverrides).values({
      userId: input.userId,
      organizationId: orgId,
      moduleId: input.moduleId,
      screenId: input.screenId || null,
      action: input.action,
      overrideType: input.overrideType,
      reason: input.reason || null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: true,
      createdBy: ctx.user.id,
    });
    await logSensitiveAccess(ctx.user.id, orgId, null, 'override.create', 'settings', 'roles', 'user_override', input.userId,
      JSON.stringify({ moduleId: input.moduleId, screenId: input.screenId, action: input.action, type: input.overrideType }));
    return { success: true };
  }),

  /** Deactivate (soft-delete) a permission override */
  deactivateOverride: scopedProcedure.input(z.object({ overrideId: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    // Verify the override belongs to this org
    const existing = await db.select().from(userPermissionOverrides)
      .where(and(eq(userPermissionOverrides.id, input.overrideId), eq(userPermissionOverrides.organizationId, orgId)))
      .limit(1);
    if (existing.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Override not found' });
    await db.update(userPermissionOverrides).set({ isActive: 0 }).where(eq(userPermissionOverrides.id, input.overrideId));
    await logSensitiveAccess(ctx.user.id, orgId, null, 'override.deactivate', 'settings', 'roles', 'user_override', existing[0].userId,
      JSON.stringify({ overrideId: input.overrideId, moduleId: existing[0].moduleId }));
    return { success: true };
  }),

  /** Delete a permission override permanently */
  deleteOverride: scopedProcedure.input(z.object({ overrideId: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const existing = await db.select().from(userPermissionOverrides)
      .where(and(eq(userPermissionOverrides.id, input.overrideId), eq(userPermissionOverrides.organizationId, orgId)))
      .limit(1);
    if (existing.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Override not found' });
    await db.delete(userPermissionOverrides).where(eq(userPermissionOverrides.id, input.overrideId));
    await logSensitiveAccess(ctx.user.id, orgId, null, 'override.delete', 'settings', 'roles', 'user_override', existing[0].userId,
      JSON.stringify({ overrideId: input.overrideId, moduleId: existing[0].moduleId }));
    return { success: true };
  }),

  // ========================================================================
  // ROLE COMPARISON (Side-by-Side Diff)
  // ========================================================================

  /** Compare two roles' permission trees side by side */
  compareRoles: scopedProcedure.input(z.object({
    roleIdA: z.number(),
    roleIdB: z.number(),
  })).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const [roleA] = await db.select().from(rbacRoles)
      .where(and(eq(rbacRoles.id, input.roleIdA), eq(rbacRoles.organizationId, orgId))).limit(1);
    const [roleB] = await db.select().from(rbacRoles)
      .where(and(eq(rbacRoles.id, input.roleIdB), eq(rbacRoles.organizationId, orgId))).limit(1);
    if (!roleA || !roleB) throw new TRPCError({ code: 'NOT_FOUND', message: 'One or both roles not found' });

    const permsA = JSON.parse(roleA.permissions || '{}');
    const permsB = JSON.parse(roleB.permissions || '{}');
    const screenPermsA = JSON.parse('{}');
    const screenPermsB = JSON.parse('{}');
    const tree = getPermissionTree();

    // Build comparison data
    const comparison = tree.map(mod => {
      const modA = permsA[mod.id] || {};
      const modB = permsB[mod.id] || {};
      const allActions = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'submit'];
      const moduleDiffs = allActions.map(action => ({
        action,
        roleA: !!modA[action],
        roleB: !!modB[action],
        isDifferent: !!modA[action] !== !!modB[action],
      }));
      return {
        moduleId: mod.id,
        moduleName: mod.name,
        moduleNameAr: mod.nameAr,
        isSensitive: mod.isSensitive,
        actions: moduleDiffs,
        hasDifferences: moduleDiffs.some(d => d.isDifferent),
        screens: mod.screens.map(screen => {
          const sPermsA = screenPermsA[mod.id]?.[screen.id] || {};
          const sPermsB = screenPermsB[mod.id]?.[screen.id] || {};
          const screenActions = screen.availableActions || ['view', 'create', 'edit', 'delete'];
          const screenDiffs = screenActions.map(action => ({
            action,
            roleA: !!sPermsA[action],
            roleB: !!sPermsB[action],
            isDifferent: !!sPermsA[action] !== !!sPermsB[action],
          }));
          return {
            screenId: screen.id,
            screenName: screen.name,
            screenNameAr: screen.nameAr,
            isSensitive: screen.isSensitive,
            actions: screenDiffs,
            hasDifferences: screenDiffs.some(d => d.isDifferent),
          };
        }),
      };
    });

    const screenDiffCount = comparison.reduce((sum, m) => sum + m.screens.reduce((sSum, s) => sSum + s.actions.filter(a => a.isDifferent).length, 0), 0);
    return {
      roleA: { id: roleA.id, name: roleA.name, nameAr: roleA.nameAr, description: roleA.description },
      roleB: { id: roleB.id, name: roleB.name, nameAr: roleB.nameAr, description: roleB.description },
      comparison,
      totalDifferences: comparison.reduce((sum, m) => sum + m.actions.filter(a => a.isDifferent).length, 0) + screenDiffCount,
    };
  }),

  add: scopedProcedure.input(z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    roleId: z.number().optional(),
    userType: z.enum(['microsoft', 'local']).default('microsoft'),
    password: z.string().min(8).optional(),
    confirmPassword: z.string().optional(),
    operatingUnitIds: z.array(z.number()).optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    
    // VALIDATION: For local users, password is required
    if (input.userType === 'local') {
      if (!input.password || !input.confirmPassword) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Password and confirmation are required for local users"
        });
      }
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Passwords do not match"
        });
      }
      if (input.password.length < 8) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Password must be at least 8 characters long"
        });
      }
    }
    
    // DOMAIN VALIDATION: Enforce organization's approved domain for Microsoft 365 users only
    // Local users can use any email domain (public or private)
    const { domainValidationService } = await import('../services/organization/domainValidationService');
    const domainValidation = await domainValidationService.validateEmailDomain({
      organizationId: orgId,
      email: input.email,
      allowPublicDomains: input.userType === 'local', // Allow public domains for local users
    });
    
    if (!domainValidation.valid) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: domainValidation.message || "Email domain is not allowed for this organization"
      });
    }
    
    // Check if user already exists by email
    const existingUsers = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    let userId: number;
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      // Check if already assigned to this org
      const existingAssignment = await db.select().from(userOrganizations)
        .where(and(eq(userOrganizations.userId, userId), eq(userOrganizations.organizationId, orgId))).limit(1);
      if (existingAssignment.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already assigned to this organization" });
      }
    } else {
      // Create new user with optional password hashing for local users
      let passwordHash: string | undefined;
      if (input.userType === 'local' && input.password) {
        const bcrypt = await import('bcryptjs');
        passwordHash = await bcrypt.default.hash(input.password, 10);
      }
      
      const result = await db.insert(users).values({
        name: input.fullName,
        email: input.email,
        openId: input.userType === 'local' ? input.email : `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        role: "user",
        loginMethod: input.userType === 'local' ? 'email_password' : 'microsoft',
        authenticationProvider: input.userType === 'local' ? 'email' : 'microsoft',
        passwordHash: passwordHash,
      });
      userId = Number(result[0].insertId);
    }
    // Assign to organization
    await db.insert(userOrganizations).values({
      userId,
      organizationId: orgId,
      platformRole: "user",
    });
    // If roleId provided, assign RBAC permissions from role template
    if (input.roleId) {
      const roleResults = await db.select().from(rbacRoles).where(eq(rbacRoles.id, input.roleId)).limit(1);
      if (roleResults.length > 0) {
        const role = roleResults[0];
        await db.insert(rbacUserPermissions).values({
          userId,
          organizationId: orgId,
          roleId: input.roleId,
          permissions: role.permissions || "{}",
          screenPermissions: "{}",
          tabPermissions: "{}",
          isActive: 1,
          updatedBy: ctx.user.id,
        });
      }
    }
    
    // Assign to Operating Units if provided
    if (input.operatingUnitIds && input.operatingUnitIds.length > 0) {
      const { userOperatingUnits } = await import('../../drizzle/schema');
      const ouAssignments = input.operatingUnitIds.map(ouId => ({
        userId,
        operatingUnitId: ouId,
        role: 'user' as const,
      }));
      await db.insert(userOperatingUnits).values(ouAssignments);
    }
    
    // Audit log for user creation
    await logSensitiveAccess(ctx.user.id, orgId, null, 'user.add', 'settings', 'users', 'user', userId, 
      JSON.stringify({ email: input.email, fullName: input.fullName, roleId: input.roleId, operatingUnitIds: input.operatingUnitIds }));
    
    return { success: true, userId };
  }),

  // ========================================================================
  // OPERATING UNIT MANAGEMENT FOR USERS
  // ========================================================================

  /** Get current OU assignments for a user */
  getUserOUs: scopedProcedure.input(z.object({ userId: z.number() })).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const rows = await db.select({
      id: userOperatingUnits.id,
      ouId: userOperatingUnits.operatingUnitId,
      ouName: operatingUnits.name,
      role: userOperatingUnits.role,
    }).from(userOperatingUnits)
      .innerJoin(operatingUnits, eq(operatingUnits.id, userOperatingUnits.operatingUnitId))
      .where(eq(userOperatingUnits.userId, input.userId));
    return rows.map(r => ({ id: r.id, ouId: r.ouId, name: r.ouName, role: r.role }));
  }),

  /** Replace a user's OU assignments (delete all then insert new ones) */
  updateUserOUs: scopedProcedure.input(z.object({
    userId: z.number(),
    operatingUnitIds: z.array(z.number()),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    // Delete existing OU assignments for this user
    await db.delete(userOperatingUnits).where(eq(userOperatingUnits.userId, input.userId));
    // Insert new assignments
    if (input.operatingUnitIds.length > 0) {
      await db.insert(userOperatingUnits).values(
        input.operatingUnitIds.map(ouId => ({
          userId: input.userId,
          operatingUnitId: ouId,
          role: 'user' as const,
        }))
      );
    }
    await logSensitiveAccess(
      ctx.user.id, orgId, null,
      'ou.update', 'settings', 'users', 'user_operating_units', input.userId,
      JSON.stringify({ operatingUnitIds: input.operatingUnitIds })
    );
    return { success: true };
  }),

  // ========================================================================
  // BULK PERMISSION ASSIGNMENT
  // ========================================================================

  /** Bulk assign a role to multiple users at once */
  bulkAssignRole: scopedProcedure.input(z.object({
    userIds: z.array(z.number()).min(1).max(500),
    roleId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Verify the role exists and belongs to this org
    const [role] = await db.select().from(rbacRoles)
      .where(and(eq(rbacRoles.id, input.roleId), eq(rbacRoles.organizationId, orgId), isNull(rbacRoles.deletedAt)))
      .limit(1);
    if (!role) throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found' });

    // Verify all users belong to this org
    const orgUsers = await db.select({ userId: userOrganizations.userId })
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.organizationId, orgId),
        sql`${userOrganizations.userId} IN (${sql.join(input.userIds.map(id => sql`${id}`), sql`, `)})`
      ));
    const validUserIds = new Set(orgUsers.map(u => u.userId));
    const invalidUserIds = input.userIds.filter(id => !validUserIds.has(id));
    if (invalidUserIds.length > 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Users not in this organization: ${invalidUserIds.join(', ')}` });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { userId: number; error: string }[] = [];

    for (const userId of input.userIds) {
      try {
        const existing = await db.select({ id: rbacUserPermissions.id })
          .from(rbacUserPermissions)
          .where(and(eq(rbacUserPermissions.userId, userId), eq(rbacUserPermissions.organizationId, orgId)))
          .limit(1);

        if (existing.length > 0) {
          await db.update(rbacUserPermissions).set({
            roleId: input.roleId,
            permissions: role.permissions || '{}',
            screenPermissions: '{}',
            updatedBy: ctx.user.id,
          }).where(eq(rbacUserPermissions.id, existing[0].id));
        } else {
          await db.insert(rbacUserPermissions).values({
            userId,
            organizationId: orgId,
            roleId: input.roleId,
            permissions: role.permissions || '{}',
            screenPermissions: '{}',
            tabPermissions: '{}',
            isActive: 1,
            updatedBy: ctx.user.id,
          });
        }
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push({ userId, error: err.message || 'Unknown error' });
      }
    }

    // Audit log
    await logSensitiveAccess(ctx.user.id, orgId, null, 'bulk.role.assign', 'settings', 'roles', 'bulk_operation', null as any,
      JSON.stringify({ roleId: input.roleId, roleName: role.name, userCount: input.userIds.length, successCount, errorCount }));

    return { success: true, successCount, errorCount, errors, totalRequested: input.userIds.length };
  }),

  /** Bulk create overrides for multiple users */
  bulkCreateOverride: scopedProcedure.input(z.object({
    userIds: z.array(z.number()).min(1).max(500),
    moduleId: z.string(),
    screenId: z.string().nullable().optional(),
    action: z.enum(['view', 'create', 'edit', 'delete', 'export', 'approve', 'submit']),
    overrideType: z.enum(['grant', 'revoke']),
    reason: z.string().optional(),
    expiresAt: z.string().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Verify all users belong to this org
    const orgUsers = await db.select({ userId: userOrganizations.userId })
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.organizationId, orgId),
        sql`${userOrganizations.userId} IN (${sql.join(input.userIds.map(id => sql`${id}`), sql`, `)})`
      ));
    const validUserIds = new Set(orgUsers.map(u => u.userId));
    const invalidUserIds = input.userIds.filter(id => !validUserIds.has(id));
    if (invalidUserIds.length > 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Users not in this organization: ${invalidUserIds.join(', ')}` });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { userId: number; error: string }[] = [];

    for (const userId of input.userIds) {
      try {
        await db.insert(userPermissionOverrides).values({
          userId,
          organizationId: orgId,
          moduleId: input.moduleId,
          screenId: input.screenId || null,
          action: input.action,
          overrideType: input.overrideType,
          reason: input.reason || null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          isActive: 1,
          createdBy: ctx.user.id,
        });
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push({ userId, error: err.message || 'Unknown error' });
      }
    }

    // Audit log
    await logSensitiveAccess(ctx.user.id, orgId, null, 'bulk.override.create', 'settings', 'roles', 'bulk_operation', null as any,
      JSON.stringify({ moduleId: input.moduleId, screenId: input.screenId, action: input.action, type: input.overrideType, userCount: input.userIds.length, successCount }));

    return { success: true, successCount, errorCount, errors, totalRequested: input.userIds.length };
  }),

  /** Bulk remove overrides from multiple users (by module/screen/action) */
  bulkRemoveOverrides: scopedProcedure.input(z.object({
    userIds: z.array(z.number()).min(1).max(500),
    moduleId: z.string().optional(),
    screenId: z.string().optional(),
    action: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    let deletedCount = 0;
    for (const userId of input.userIds) {
      const conditions = [
        eq(userPermissionOverrides.userId, userId),
        eq(userPermissionOverrides.organizationId, orgId),
      ];
      if (input.moduleId) conditions.push(eq(userPermissionOverrides.moduleId, input.moduleId));
      if (input.screenId) conditions.push(eq(userPermissionOverrides.screenId, input.screenId));
      if (input.action) conditions.push(eq(userPermissionOverrides.action, input.action));

      const result = await db.delete(userPermissionOverrides).where(and(...conditions));
      deletedCount += (result as any)[0]?.affectedRows || 0;
    }

    await logSensitiveAccess(ctx.user.id, orgId, null, 'bulk.override.remove', 'settings', 'roles', 'bulk_operation', null as any,
      JSON.stringify({ userCount: input.userIds.length, moduleId: input.moduleId, screenId: input.screenId, action: input.action, deletedCount }));

    return { success: true, deletedCount, totalUsers: input.userIds.length };
  }),

  // ========================================================================
  // PERMISSION AUDIT REPORT
  // ========================================================================

  /** Generate a permission audit report for compliance reviews */
  auditReport: scopedProcedure.input(z.object({
    moduleFilter: z.string().optional(),
    screenFilter: z.string().optional(),
    userFilter: z.string().optional(),
    sensitiveOnly: z.boolean().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Get organization name (auto-loaded)
    const [org] = await db.select({ id: organizations.id, name: organizations.name })
      .from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const orgName = org?.name || 'Unknown Organization';

    // Get all users in this org with their permissions
    const orgUsers = await db.select({
      userId: userOrganizations.userId,
      platformRole: userOrganizations.platformRole,
      createdAt: userOrganizations.createdAt,
    }).from(userOrganizations).where(eq(userOrganizations.organizationId, orgId));

    if (orgUsers.length === 0) {
      return {
        organizationName: orgName,
        organizationId: orgId,
        generatedAt: new Date().toISOString(),
        generatedBy: ctx.user.name || ctx.user.email || 'Admin',
        summary: { totalUsers: 0, usersWithSensitiveAccess: 0, activeOverrides: 0, sensitiveWorkspaces: SENSITIVE_WORKSPACES.length },
        entries: [],
      };
    }

    const userIds = orgUsers.map(u => u.userId);
    const userDetails = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users).where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
    const userMap = new Map(userDetails.map(u => [u.id, u]));

    // Get all permission assignments
    const allPerms = await db.select().from(rbacUserPermissions)
      .where(eq(rbacUserPermissions.organizationId, orgId));
    const permMap = new Map(allPerms.map(p => [p.userId, p]));

    // Get all roles for name lookup
    const allRoles = await db.select({ id: rbacRoles.id, name: rbacRoles.name, nameAr: rbacRoles.nameAr })
      .from(rbacRoles).where(and(eq(rbacRoles.organizationId, orgId), isNull(rbacRoles.deletedAt)));
    const roleMap = new Map(allRoles.map(r => [r.id, r]));

    // Get all active overrides
    const allOverrides = await db.select().from(userPermissionOverrides)
      .where(and(eq(userPermissionOverrides.organizationId, orgId), eq(userPermissionOverrides.isActive, 1)));
    const overridesByUser = new Map<number, typeof allOverrides>();
    for (const ov of allOverrides) {
      const existing = overridesByUser.get(ov.userId) || [];
      existing.push(ov);
      overridesByUser.set(ov.userId, existing);
    }

    // Get updatedBy user names for "granted by" info
    const updaterIds = [...new Set(allPerms.filter(p => p.updatedBy).map(p => p.updatedBy!))];
    const overrideCreatorIds = [...new Set(allOverrides.map(o => o.createdBy))];
    const allAdminIds = [...new Set([...updaterIds, ...overrideCreatorIds])];
    let adminMap = new Map<number, string>();
    if (allAdminIds.length > 0) {
      const admins = await db.select({ id: users.id, name: users.name }).from(users)
        .where(sql`${users.id} IN (${sql.join(allAdminIds.map(id => sql`${id}`), sql`, `)})`);
      adminMap = new Map(admins.map(a => [a.id, a.name || 'Unknown']));
    }

    // Build audit entries
    const sensitiveScreenIds = new Set(SENSITIVE_WORKSPACES.map(w => w.screenId));
    const sensitiveModuleIds = new Set(SENSITIVE_WORKSPACES.map(w => w.moduleId));

    type AuditEntry = {
      userId: number;
      userName: string;
      userEmail: string;
      userRole: string;
      platformRole: string;
      rbacRoleName: string | null;
      rbacRoleNameAr: string | null;
      moduleId: string;
      moduleName: string;
      screenId: string | null;
      screenName: string | null;
      isSensitive: boolean;
      accessType: 'role' | 'override_grant' | 'platform_admin';
      actions: string[];
      grantedBy: string;
      grantedAt: string;
      expiresAt: string | null;
      overrideReason: string | null;
    };

    const entries: AuditEntry[] = [];

    for (const orgUser of orgUsers) {
      const user = userMap.get(orgUser.userId);
      if (!user) continue;

      // Apply user search filter
      if (input?.userFilter) {
        const q = input.userFilter.toLowerCase();
        if (!(user.name || '').toLowerCase().includes(q) && !(user.email || '').toLowerCase().includes(q)) continue;
      }

      const perm = permMap.get(orgUser.userId);
      const isPlatformAdmin = user.role === 'platform_admin';
      const isOrgAdmin = user.role === 'organization_admin' || orgUser.platformRole === 'organization_admin';
      const role = perm?.roleId ? roleMap.get(perm.roleId) : null;
      const userOverrides = overridesByUser.get(orgUser.userId) || [];

      // Platform admins and organization admins have full access to everything
      if (isPlatformAdmin || isOrgAdmin) {
        const adminLabel = isPlatformAdmin ? 'Platform Admin' : 'Organization Admin';
        const adminLabelAr = isPlatformAdmin ? 'مسؤول المنصة' : 'مسؤول المنظمة';
        for (const mod of MODULE_DEFINITIONS) {
          if (input?.moduleFilter && mod.id !== input.moduleFilter) continue;
          const screens = SCREEN_DEFINITIONS[mod.id] || [];
          for (const screen of screens) {
            if (input?.screenFilter && screen.id !== input.screenFilter) continue;
            const isSensitive = sensitiveScreenIds.has(screen.id) || sensitiveModuleIds.has(mod.id);
            if (input?.sensitiveOnly && !isSensitive) continue;
            entries.push({
              userId: user.id, userName: user.name || 'Unknown', userEmail: user.email || '',
              userRole: user.role, platformRole: orgUser.platformRole || 'user',
              rbacRoleName: adminLabel, rbacRoleNameAr: adminLabelAr,
              moduleId: mod.id, moduleName: mod.name,
              screenId: screen.id, screenName: screen.name,
              isSensitive, accessType: 'platform_admin',
              actions: ALL_ACTIONS.slice(),
              grantedBy: 'System', grantedAt: (typeof orgUser.createdAt === 'string' ? orgUser.createdAt : orgUser.createdAt?.toISOString?.()) || new Date().toISOString(),
              expiresAt: null, overrideReason: null,
            });
          }
        }
        continue;
      }

      // Role-based access
      if (perm) {
        const modulePerms = JSON.parse(perm.permissions || '{}');
        const screenPerms = JSON.parse(perm.screenPermissions || '{}');

        for (const [modId, modActions] of Object.entries(modulePerms)) {
          if (input?.moduleFilter && modId !== input.moduleFilter) continue;
          const modDef = MODULE_DEFINITIONS.find(m => m.id === modId);
          if (!modDef) continue;

          const screens = SCREEN_DEFINITIONS[modId] || [];
          for (const screen of screens) {
            if (input?.screenFilter && screen.id !== input.screenFilter) continue;
            const isSensitive = sensitiveScreenIds.has(screen.id) || sensitiveModuleIds.has(modId);
            if (input?.sensitiveOnly && !isSensitive) continue;

            const sPerms = screenPerms[modId]?.[screen.id] || {};
            const activeActions = Object.entries({ ...(modActions as any), ...sPerms })
              .filter(([_, v]) => v === true)
              .map(([k]) => k);

            if (activeActions.length > 0) {
              entries.push({
                userId: user.id, userName: user.name || 'Unknown', userEmail: user.email || '',
                userRole: user.role, platformRole: orgUser.platformRole || 'user',
                rbacRoleName: role?.name || null, rbacRoleNameAr: role?.nameAr || null,
                moduleId: modId, moduleName: modDef.name,
                screenId: screen.id, screenName: screen.name,
                isSensitive, accessType: 'role',
                actions: activeActions,
                grantedBy: perm.updatedBy ? (adminMap.get(perm.updatedBy) || 'Unknown') : 'System',
                grantedAt: perm.updatedAt?.toISOString() || new Date().toISOString(),
                expiresAt: null, overrideReason: null,
              });
            }
          }
        }
      }

      // Override-based access (grants only)
      for (const ov of userOverrides) {
        if (ov.overrideType !== 'grant') continue;
        if (ov.expiresAt && new Date(ov.expiresAt) < new Date()) continue;
        if (input?.moduleFilter && ov.moduleId !== input.moduleFilter) continue;
        if (input?.screenFilter && ov.screenId !== input.screenFilter) continue;

        const modDef = MODULE_DEFINITIONS.find(m => m.id === ov.moduleId);
        const screenDef = ov.screenId ? (SCREEN_DEFINITIONS[ov.moduleId] || []).find((s: any) => s.id === ov.screenId) : null;
        const isSensitive = sensitiveScreenIds.has(ov.screenId || '') || sensitiveModuleIds.has(ov.moduleId);
        if (input?.sensitiveOnly && !isSensitive) continue;

        entries.push({
          userId: user.id, userName: user.name || 'Unknown', userEmail: user.email || '',
          userRole: user.role, platformRole: orgUser.platformRole || 'user',
          rbacRoleName: role?.name || null, rbacRoleNameAr: role?.nameAr || null,
          moduleId: ov.moduleId, moduleName: modDef?.name || ov.moduleId,
          screenId: ov.screenId, screenName: screenDef?.name || ov.screenId,
          isSensitive, accessType: 'override_grant',
          actions: [ov.action],
          grantedBy: adminMap.get(ov.createdBy) || 'Unknown',
          grantedAt: (typeof ov.createdAt === 'string' ? ov.createdAt : ov.createdAt?.toISOString?.()) || new Date().toISOString(),
          expiresAt: ov.expiresAt?.toISOString() || null,
          overrideReason: ov.reason,
        });
      }
    }

    // Apply date filters
    let filteredEntries = entries;
    if (input?.dateFrom) {
      const from = new Date(input.dateFrom);
      filteredEntries = filteredEntries.filter(e => new Date(e.grantedAt) >= from);
    }
    if (input?.dateTo) {
      const to = new Date(input.dateTo);
      filteredEntries = filteredEntries.filter(e => new Date(e.grantedAt) <= to);
    }

    // Summary stats
    const usersWithSensitive = new Set(filteredEntries.filter(e => e.isSensitive).map(e => e.userId));
    const activeOverrideCount = allOverrides.filter(o => !o.expiresAt || new Date(o.expiresAt) >= new Date()).length;

    return {
      organizationName: orgName,
      organizationId: orgId,
      generatedAt: new Date().toISOString(),
      generatedBy: ctx.user.name || ctx.user.email || 'Admin',
      summary: {
        totalUsers: orgUsers.length,
        usersWithSensitiveAccess: usersWithSensitive.size,
        activeOverrides: activeOverrideCount,
        sensitiveWorkspaces: SENSITIVE_WORKSPACES.length,
      },
      entries: filteredEntries,
    };
  }),

  /** Export audit report as CSV */
  exportAuditCSV: scopedProcedure.input(z.object({
    moduleFilter: z.string().optional(),
    screenFilter: z.string().optional(),
    sensitiveOnly: z.boolean().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Get organization name
    const [org] = await db.select({ name: organizations.name })
      .from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const orgName = org?.name || 'Unknown';

    // Get all users in org
    const orgUsers = await db.select({ userId: userOrganizations.userId, platformRole: userOrganizations.platformRole })
      .from(userOrganizations).where(eq(userOrganizations.organizationId, orgId));
    const userIds = orgUsers.map(u => u.userId);
    if (userIds.length === 0) return { csv: 'No users found', filename: `permission_audit_${orgId}.csv` };

    const userDetails = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users).where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
    const userMap = new Map(userDetails.map(u => [u.id, u]));

    const allPerms = await db.select().from(rbacUserPermissions)
      .where(eq(rbacUserPermissions.organizationId, orgId));
    const permMap = new Map(allPerms.map(p => [p.userId, p]));

    const allRoles = await db.select({ id: rbacRoles.id, name: rbacRoles.name })
      .from(rbacRoles).where(and(eq(rbacRoles.organizationId, orgId), isNull(rbacRoles.deletedAt)));
    const roleMap = new Map(allRoles.map(r => [r.id, r.name]));

    const allOverrides = await db.select().from(userPermissionOverrides)
      .where(and(eq(userPermissionOverrides.organizationId, orgId), eq(userPermissionOverrides.isActive, 1)));
    const overridesByUser = new Map<number, typeof allOverrides>();
    for (const ov of allOverrides) {
      const existing = overridesByUser.get(ov.userId) || [];
      existing.push(ov);
      overridesByUser.set(ov.userId, existing);
    }

    const sensitiveScreenIds = new Set(SENSITIVE_WORKSPACES.map(w => w.screenId));
    const sensitiveModuleIds = new Set(SENSITIVE_WORKSPACES.map(w => w.moduleId));

    // CSV header
    const csvRows: string[] = [
      `"Permission Audit Report - ${orgName}"`,
      `"Generated: ${new Date().toISOString()}"`,
      '',
      '"User Name","Email","User Role","RBAC Role","Module","Screen","Sensitive","Access Type","Actions","Granted By","Expires At","Override Reason"',
    ];

    for (const orgUser of orgUsers) {
      const user = userMap.get(orgUser.userId);
      if (!user) continue;
      const perm = permMap.get(orgUser.userId);
      const isPlatformAdmin = user.role === 'platform_admin';
      const isOrgAdmin = user.role === 'organization_admin' || orgUser.platformRole === 'organization_admin';
      const roleName = perm?.roleId ? roleMap.get(perm.roleId) || '' : '';
      const userOverrides = overridesByUser.get(orgUser.userId) || [];

      if (isPlatformAdmin || isOrgAdmin) {
        const adminLabel = isPlatformAdmin ? 'Platform Admin' : 'Organization Admin';
        for (const mod of MODULE_DEFINITIONS) {
          if (input?.moduleFilter && mod.id !== input.moduleFilter) continue;
          const screens = SCREEN_DEFINITIONS[mod.id] || [];
          for (const screen of screens) {
            if (input?.screenFilter && screen.id !== input.screenFilter) continue;
            const isSensitive = sensitiveScreenIds.has(screen.id) || sensitiveModuleIds.has(mod.id);
            if (input?.sensitiveOnly && !isSensitive) continue;
            csvRows.push(`"${user.name || ''}","${user.email || ''}","${user.role}","${adminLabel}","${mod.name}","${screen.name}","${isSensitive ? 'Yes' : 'No'}","${adminLabel}","All","System","",""`);
          }
        }
        continue;
      }

      if (perm) {
        const modulePerms = JSON.parse(perm.permissions || '{}');
        const screenPerms = JSON.parse(perm.screenPermissions || '{}');
        for (const [modId, modActions] of Object.entries(modulePerms)) {
          if (input?.moduleFilter && modId !== input.moduleFilter) continue;
          const modDef = MODULE_DEFINITIONS.find(m => m.id === modId);
          if (!modDef) continue;
          const screens = SCREEN_DEFINITIONS[modId] || [];
          for (const screen of screens) {
            if (input?.screenFilter && screen.id !== input.screenFilter) continue;
            const isSensitive = sensitiveScreenIds.has(screen.id) || sensitiveModuleIds.has(modId);
            if (input?.sensitiveOnly && !isSensitive) continue;
            const sPerms = screenPerms[modId]?.[screen.id] || {};
            const activeActions = Object.entries({ ...(modActions as any), ...sPerms }).filter(([_, v]) => v === true).map(([k]) => k);
            if (activeActions.length > 0) {
              csvRows.push(`"${user.name || ''}","${user.email || ''}","${user.role}","${roleName}","${modDef.name}","${screen.name}","${isSensitive ? 'Yes' : 'No'}","Role","${activeActions.join(', ')}","","",""`);
            }
          }
        }
      }

      for (const ov of userOverrides) {
        if (ov.overrideType !== 'grant') continue;
        if (ov.expiresAt && new Date(ov.expiresAt) < new Date()) continue;
        if (input?.moduleFilter && ov.moduleId !== input.moduleFilter) continue;
        if (input?.screenFilter && ov.screenId !== input.screenFilter) continue;
        const modDef = MODULE_DEFINITIONS.find(m => m.id === ov.moduleId);
        const screenDef = ov.screenId ? (SCREEN_DEFINITIONS[ov.moduleId] || []).find((s: any) => s.id === ov.screenId) : null;
        const isSensitive = sensitiveScreenIds.has(ov.screenId || '') || sensitiveModuleIds.has(ov.moduleId);
        if (input?.sensitiveOnly && !isSensitive) continue;
        csvRows.push(`"${user.name || ''}","${user.email || ''}","${user.role}","${roleName}","${modDef?.name || ov.moduleId}","${screenDef?.name || ov.screenId || 'Module-level'}","${isSensitive ? 'Yes' : 'No'}","Override (${ov.overrideType})","${ov.action}","","${ov.expiresAt?.toISOString() || 'Never'}","${ov.reason || ''}"`);
      }
    }

    return {
      csv: csvRows.join('\n'),
      filename: `permission_audit_${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
    };
  }),

  /** Update a user's granular permissions */
  updatePermissions: scopedProcedure.input(z.object({
    userId: z.number(),
    roleId: z.number().nullable(),
    permissions: z.record(z.string(), actionPermissionsSchema),
    screenPermissions: z.record(z.string(), z.record(z.string(), actionPermissionsSchema)).optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Verify the user belongs to this org
    const userOrg = await db.select().from(userOrganizations)
      .where(and(eq(userOrganizations.userId, input.userId), eq(userOrganizations.organizationId, orgId)))
      .limit(1);
    if (userOrg.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found in this organization' });
    }

    // If roleId is provided, verify it exists and get the role name
    let roleName = null;
    if (input.roleId) {
      const role = await db.select({ name: rbacRoles.name }).from(rbacRoles)
        .where(and(eq(rbacRoles.id, input.roleId), eq(rbacRoles.organizationId, orgId), isNull(rbacRoles.deletedAt)))
        .limit(1);
      if (role.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found' });
      }
      roleName = role[0].name;
    }

    // Update the user's role in the users table
    // Convert role name to enum format (e.g., "Organization Admin" -> "organization_admin")
    if (roleName) {
      const roleEnum = roleName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      
      // Validate that the enum value is valid
      const validRoles = ['platform_super_admin', 'platform_admin', 'platform_auditor', 'organization_admin', 'user', 'admin', 'manager'];
      if (validRoles.includes(roleEnum)) {
        await db.update(users).set({
          role: roleEnum as any,
        }).where(eq(users.id, input.userId));
      }
    }

    // Check if user already has permissions assigned
    const existing = await db.select().from(rbacUserPermissions)
      .where(and(eq(rbacUserPermissions.userId, input.userId), eq(rbacUserPermissions.organizationId, orgId)))
      .limit(1);

    if (existing.length > 0) {
      // Update existing permissions
      await db.update(rbacUserPermissions).set({
        roleId: input.roleId,
        permissions: JSON.stringify(input.permissions),
        screenPermissions: input.screenPermissions ? JSON.stringify(input.screenPermissions) : null,
        isActive: 1,
        updatedBy: ctx.user.id,
      }).where(eq(rbacUserPermissions.id, existing[0].id));
    } else {
      // Create new permissions
      await db.insert(rbacUserPermissions).values({
        userId: input.userId,
        organizationId: orgId,
        roleId: input.roleId,
        permissions: JSON.stringify(input.permissions),
        screenPermissions: input.screenPermissions ? JSON.stringify(input.screenPermissions) : null,
        tabPermissions: '{}',
        isActive: 1,
        updatedBy: ctx.user.id,
      });
    }

    // Audit log
    await logSensitiveAccess(ctx.user.id, orgId, null, 'user.permissions.update', 'settings', 'users', 'user_permissions', input.userId,
      JSON.stringify({ roleId: input.roleId, roleName, modulesCount: Object.keys(input.permissions).length }));

    return { success: true };
  }),

  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = (ctx as any).organizationId;
    if (!orgId) return null;
    const fullAccess = { view: true, create: true, edit: true, delete: true, export: true, approve: true, submit: true };
    if (ctx.user.role === "platform_admin") {
      // Platform admin gets full access to everything including all screens
      const allScreenPerms: Record<string, Record<string, any>> = {};
      for (const [moduleId, screens] of Object.entries(SCREEN_DEFINITIONS)) {
        allScreenPerms[moduleId] = {};
        for (const screen of screens) {
          allScreenPerms[moduleId][screen.id] = { ...fullAccess };
        }
      }
      return {
        isAdmin: true,
        modules: Object.fromEntries(MODULE_DEFINITIONS.map((m) => [m.id, { ...fullAccess }])),
        screens: allScreenPerms,
        tabs: {},
        sensitiveWorkspaces: SENSITIVE_WORKSPACES.map(w => ({ moduleId: w.moduleId, screenId: w.screenId })),
      };
    }
    const results = await db.select().from(rbacUserPermissions)
      .where(and(eq(rbacUserPermissions.userId, ctx.user.id), eq(rbacUserPermissions.organizationId, orgId))).limit(1);
    if (results.length === 0) return null;
    const record = results[0];
    return {
      isAdmin: false,
      modules: JSON.parse(record.permissions || "{}"),
      screens: JSON.parse(record.screenPermissions || "{}"),
      tabs: JSON.parse(record.tabPermissions || "{}"),
      sensitiveWorkspaces: SENSITIVE_WORKSPACES.map(w => ({ moduleId: w.moduleId, screenId: w.screenId })),
    };
  }),

  /** Add user to an operating unit */
  addOperatingUnit: scopedProcedure.input(z.object({
    userId: z.number(),
    operatingUnitId: z.number(),
    role: z.enum(['organization_admin', 'user']).optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    
    // ✅ Verify user belongs to organization
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    
    if (!user || user.organizationId !== orgId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User does not belong to this organization'
      });
    }
    
    // ✅ Verify OU belongs to organization
    const [ou] = await db.select()
      .from(operatingUnits)
      .where(and(
        eq(operatingUnits.id, input.operatingUnitId),
        eq(operatingUnits.organizationId, orgId)
      ))
      .limit(1);
    
    if (!ou) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Operating unit not found in this organization'
      });
    }
    
    // ✅ Check if already assigned
    const [existing] = await db.select()
      .from(userOperatingUnits)
      .where(and(
        eq(userOperatingUnits.userId, input.userId),
        eq(userOperatingUnits.operatingUnitId, input.operatingUnitId)
      ))
      .limit(1);
    
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already assigned to this operating unit'
      });
    }
    
    // ✅ Add assignment
    await db.insert(userOperatingUnits).values({
      userId: input.userId,
      operatingUnitId: input.operatingUnitId,
      role: input.role || 'user',
    });
    
    // Log the action
    await logSensitiveAccess(
      ctx.user.id,
      orgId,
      ctx.scope.operatingUnitId,
      'user.add_ou',
      'settings',
      'users',
      'user_operating_unit',
      input.userId,
      JSON.stringify({ operatingUnitId: input.operatingUnitId, role: input.role || 'user' })
    );
    
    return { success: true };
  }),

  /** Remove user from an operating unit */
  removeOperatingUnit: scopedProcedure.input(z.object({
    userId: z.number(),
    operatingUnitId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    
    // ✅ Verify user belongs to organization
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    
    if (!user || user.organizationId !== orgId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User does not belong to this organization'
      });
    }
    
    // ✅ Verify assignment exists
    const [assignment] = await db.select()
      .from(userOperatingUnits)
      .where(and(
        eq(userOperatingUnits.userId, input.userId),
        eq(userOperatingUnits.operatingUnitId, input.operatingUnitId)
      ))
      .limit(1);
    
    if (!assignment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User is not assigned to this operating unit'
      });
    }
    
    // ✅ Prevent removing last OU assignment
    const [ouCount] = await db.select({
      count: sql`COUNT(*)`
    }).from(userOperatingUnits)
      .where(eq(userOperatingUnits.userId, input.userId));
    
    if (ouCount.count === 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User must be assigned to at least one operating unit'
      });
    }
    
    // ✅ Remove assignment
    await db.delete(userOperatingUnits)
      .where(and(
        eq(userOperatingUnits.userId, input.userId),
        eq(userOperatingUnits.operatingUnitId, input.operatingUnitId)
      ));
    
    // Log the action
    await logSensitiveAccess(
      ctx.user.id,
      orgId,
      ctx.scope.operatingUnitId,
      'user.remove_ou',
      'settings',
      'users',
      'user_operating_unit',
      input.userId,
      JSON.stringify({ operatingUnitId: input.operatingUnitId })
    );
    
    return { success: true };
  }),
});

// OPTION SETS
const optionSetsRouter = router({
  list: scopedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const sets = await db.select().from(optionSets)
      .where(and(eq(optionSets.organizationId, orgId), isNull(optionSets.deletedAt))).orderBy(asc(optionSets.name));
    const result = [];
    for (const s of sets) {
      const values = await db.select().from(optionSetValues)
        .where(and(eq(optionSetValues.optionSetId, s.id), isNull(optionSetValues.deletedAt))).orderBy(asc(optionSetValues.sortOrder));
      result.push({ ...s, values });
    }
    return result;
  }),

  create: scopedProcedure.input(z.object({
    name: z.string().min(1), nameAr: z.string().optional(),
    description: z.string().optional(), descriptionAr: z.string().optional(), systemKey: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const result = await db.insert(optionSets).values({
      organizationId: ctx.scope.organizationId, name: input.name,
      nameAr: input.nameAr || null, description: input.description || null,
      descriptionAr: input.descriptionAr || null, systemKey: input.systemKey || null,
    });
    return { id: result[0].insertId };
  }),

  update: scopedProcedure.input(z.object({
    id: z.number(), name: z.string().optional(), nameAr: z.string().optional(),
    description: z.string().optional(), descriptionAr: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const { id, ...data } = input;
    await db.update(optionSets).set(data).where(and(eq(optionSets.id, id), eq(optionSets.organizationId, ctx.scope.organizationId)));
    return { success: true };
  }),

  delete: scopedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const existing = await db.select({ isSystem: optionSets.isSystem }).from(optionSets)
      .where(and(eq(optionSets.id, input.id), eq(optionSets.organizationId, ctx.scope.organizationId))).limit(1);
    if (existing[0]?.isSystem) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete system option sets" });
    await db.update(optionSets).set({ deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "), deletedBy: ctx.user.id }).where(eq(optionSets.id, input.id));
    return { success: true };
  }),

  addValue: scopedProcedure.input(z.object({
    optionSetId: z.number(), label: z.string().min(1), labelAr: z.string().optional(),
    value: z.string().min(1), sortOrder: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const result = await db.insert(optionSetValues).values({
      optionSetId: input.optionSetId, label: input.label,
      labelAr: input.labelAr || null, value: input.value, sortOrder: input.sortOrder || 0,
    });
    return { id: result[0].insertId };
  }),

  updateValue: scopedProcedure.input(z.object({
    id: z.number(), label: z.string().optional(), labelAr: z.string().optional(),
    value: z.string().optional(), isActive: z.boolean().optional(), sortOrder: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const { id, ...data } = input;
    await db.update(optionSetValues).set(data).where(eq(optionSetValues.id, id));
    return { success: 1 };
  }),

  deleteValue: scopedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    await db.update(optionSetValues).set({ deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "), deletedBy: ctx.user.id }).where(eq(optionSetValues.id, input.id));
    return { success: true };
  }),
});

// BRANDING
const brandingRouter = router({
  get: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const result = await db.select().from(organizationBranding).where(eq(organizationBranding.organizationId, ctx.scope.organizationId)).limit(1);
    return result[0] || null;
  }),

  update: scopedProcedure.input(z.object({
    organizationName: z.string().nullable().optional(), organizationNameAr: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(), faviconUrl: z.string().nullable().optional(),
    systemName: z.string().nullable().optional(), systemNameAr: z.string().nullable().optional(),
    primaryColor: z.string().nullable().optional(), secondaryColor: z.string().nullable().optional(),
    accentColor: z.string().nullable().optional(), footerText: z.string().nullable().optional(),
    footerTextAr: z.string().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const existing = await db.select({ id: organizationBranding.id }).from(organizationBranding).where(eq(organizationBranding.organizationId, orgId)).limit(1);
    if (existing.length > 0) {
      await db.update(organizationBranding).set({ ...input, updatedBy: ctx.user.id }).where(eq(organizationBranding.organizationId, orgId));
    } else {
      await db.insert(organizationBranding).values({ organizationId: orgId, ...input, updatedBy: ctx.user.id });
    }
    return { success: true };
  }),

  uploadFile: scopedProcedure.input(z.object({
    fileBase64: z.string(),
    fileName: z.string(),
    contentType: z.string(),
    fileType: z.enum(['logo', 'favicon']),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const buffer = Buffer.from(input.fileBase64, 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'File size must be under 5MB' });
    }
    const ext = input.fileName.split('.').pop() || 'png';
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const fileKey = `org-${ctx.scope.organizationId}/branding/${input.fileType}-${randomSuffix}.${ext}`;
    const { url } = await storagePut(fileKey, buffer, input.contentType);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const fieldUpdate = input.fileType === 'logo' ? { logoUrl: url } : { faviconUrl: url };
    const existing = await db.select({ id: organizationBranding.id }).from(organizationBranding).where(eq(organizationBranding.organizationId, orgId)).limit(1);
    if (existing.length > 0) {
      await db.update(organizationBranding).set({ ...fieldUpdate, updatedBy: ctx.user.id }).where(eq(organizationBranding.organizationId, orgId));
    } else {
      await db.insert(organizationBranding).values({ organizationId: orgId, ...fieldUpdate, updatedBy: ctx.user.id });
    }
    return { url };
  }),
});

// LANDING SETTINGS
const landingRouter = router({
  get: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const result = await db.select().from(landingSettings).where(eq(landingSettings.organizationId, ctx.scope.organizationId)).limit(1);
    return result[0] || null;
  }),

  update: scopedProcedure.input(z.object({
    heroTitle: z.string().nullable().optional(), heroTitleAr: z.string().nullable().optional(),
    heroSubtitle: z.string().nullable().optional(), heroSubtitleAr: z.string().nullable().optional(),
    heroImageUrl: z.string().nullable().optional(), showQuickStats: z.boolean().optional(),
    showAnnouncements: z.boolean().optional(), showRecentActivity: z.boolean().optional(),
    welcomeMessage: z.string().nullable().optional(), welcomeMessageAr: z.string().nullable().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const existing = await db.select({ id: landingSettings.id }).from(landingSettings).where(eq(landingSettings.organizationId, orgId)).limit(1);
    if (existing.length > 0) {
      await db.update(landingSettings).set({ ...input, updatedBy: ctx.user.id }).where(eq(landingSettings.organizationId, orgId));
    } else {
      await db.insert(landingSettings).values({ organizationId: orgId, ...input, updatedBy: ctx.user.id });
    }
    return { success: true };
  }),
});

// ============================================================================
// EMAIL PROVIDER SETTINGS (M365 / SMTP / Disabled)
// ============================================================================

const DEFAULT_NOTIFICATION_EVENTS = [
  { eventKey: "grant_approved", name: "Grant Approvals", category: "grants", description: "Notify when grants are approved or rejected" },
  { eventKey: "budget_alert", name: "Budget Alerts", category: "finance", description: "Notify when budget thresholds are exceeded" },
  { eventKey: "project_update", name: "Project Updates", category: "projects", description: "Notify on project milestone changes" },
  { eventKey: "user_activity", name: "User Activity", category: "system", description: "Notify on new user registrations and role changes" },
  { eventKey: "report_generation", name: "Report Generation", category: "system", description: "Notify when scheduled reports are ready" },
  { eventKey: "system_alerts", name: "System Alerts", category: "system", description: "Critical system notifications and maintenance" },
  { eventKey: "expense_submitted", name: "Expense Submitted", category: "finance", description: "Notify when expenses are submitted for approval" },
  { eventKey: "hr_leave_request", name: "Leave Requests", category: "hr", description: "Notify on leave request submissions and approvals" },
  { eventKey: "procurement_request", name: "Procurement Requests", category: "logistics", description: "Notify on new procurement requests" },
  { eventKey: "pr_submitted", name: "PR Submitted", category: "logistics", description: "Notify Logistics when PR is submitted" },
  { eventKey: "pr_logistics_validated", name: "PR Logistics Validated", category: "logistics", description: "Notify Finance when PR is validated by Logistics" },
  { eventKey: "pr_finance_validated", name: "PR Finance Validated", category: "logistics", description: "Notify PM when PR is validated by Finance" },
  { eventKey: "pr_approved", name: "PR Approved", category: "logistics", description: "Notify Requester when PR is approved" },
  { eventKey: "pr_rejected", name: "PR Rejected", category: "logistics", description: "Notify Requester when PR is rejected" },
  { eventKey: "meal_data_collection", name: "MEAL Data Collection", category: "meal", description: "Notify when data collection is due or completed" },
  { eventKey: "document_shared", name: "Document Shared", category: "documents", description: "Notify when documents are shared with you" },
  { eventKey: "task_assigned", name: "Task Assigned", category: "projects", description: "Notify when tasks are assigned to you" },
  { eventKey: "approval_pending", name: "Approval Pending", category: "system", description: "Notify when approvals are waiting for your action" },
  { eventKey: "donor_communication", name: "Donor Communication", category: "grants", description: "Notify on donor report deadlines and communications" },
];

// Email Provider Router - Manages email provider configuration (Area A)
// NOTE: Tenant ID is now consolidated in organizations table for consistency with Area B
// This router handles email provider setup (M365, SMTP, or disabled)
const emailProviderRouter = router({
  // Get provider settings
  // NOTE: Tenant ID is now consolidated in organizations table
  // This procedure reads from both emailProviderSettings and organizations for backward compatibility
  getProvider: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    
    // Get organization tenant data (primary source)
    const [org] = await db.select({ tenantId: organizations.tenantId }).from(organizations)
      .where(eq(organizations.id, orgId)).limit(1);
    
    const [provider] = await db.select().from(emailProviderSettings)
      .where(eq(emailProviderSettings.organizationId, orgId)).limit(1);
    if (!provider) {
      return {
        providerType: "disabled" as const,
        tenantId: org?.tenantId || null, clientId: null, authType: null, senderMode: null,
        fromEmail: null, fromName: null, replyToEmail: null,
        defaultCc: null, defaultBcc: null, allowedDomains: null,
        smtpHost: null, smtpPort: null, smtpUsername: null, smtpEncryption: "tls" as const,
        isConnected: false, lastSuccessfulSend: null, lastError: null, lastTestedAt: null,
      };
    }
    // Mask sensitive fields and use tenant ID from organizations table
    return {
      ...provider,
      tenantId: org?.tenantId || provider.tenantId, // Use org tenant ID as primary source
      secretRef: provider.secretRef ? "••••••••" : null,
      certificateRef: provider.certificateRef ? "[Certificate uploaded]" : null,
      smtpPassword: provider.smtpPassword ? "••••••••" : null,
    };
  }),

  // Save provider settings
  // NOTE: Tenant ID is now consolidated in organizations table
  // When saving tenant ID, update both tables for consistency
  saveProvider: scopedProcedure.input(z.object({
    providerType: z.enum(["m365", "smtp", "disabled"]),
    // M365 fields
    tenantId: z.string().optional().nullable(),
    clientId: z.string().optional().nullable(),
    authType: z.enum(["secret", "certificate"]).optional().nullable(),
    secretRef: z.string().optional().nullable(),
    certificateRef: z.string().optional().nullable(),
    senderMode: z.enum(["shared_mailbox", "user_mailbox"]).optional().nullable(),
    // SMTP fields
    smtpHost: z.string().optional().nullable(),
    smtpPort: z.number().optional().nullable(),
    smtpUsername: z.string().optional().nullable(),
    smtpPassword: z.string().optional().nullable(),
    smtpEncryption: z.enum(["tls", "ssl", "none"]).optional().nullable(),
    // Common fields
    fromEmail: z.string().optional().nullable(),
    fromName: z.string().optional().nullable(),
    replyToEmail: z.string().optional().nullable(),
    defaultCc: z.string().optional().nullable(),
    defaultBcc: z.string().optional().nullable(),
    allowedDomains: z.string().optional().nullable(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const [existing] = await db.select({ id: emailProviderSettings.id }).from(emailProviderSettings)
      .where(eq(emailProviderSettings.organizationId, orgId)).limit(1);
    
    // Don't overwrite secrets with masked values
    const data: any = { ...input, organizationId: orgId, updatedBy: ctx.user?.id };
    if (data.secretRef === "••••••••") delete data.secretRef;
    if (data.certificateRef === "[Certificate uploaded]") delete data.certificateRef;
    if (data.smtpPassword === "••••••••") delete data.smtpPassword;
    
    // If tenant ID is being updated, also update organizations table (consolidation)
    if (input.tenantId !== undefined) {
      await db.update(organizations).set({ tenantId: input.tenantId }).where(eq(organizations.id, orgId));
    }
    
    if (existing) {
      await db.update(emailProviderSettings).set(data).where(eq(emailProviderSettings.id, existing.id));
    } else {
      data.createdBy = ctx.user?.id;
      await db.insert(emailProviderSettings).values(data);
    }
    return { success: true };
  }),

  // Test connection
  // NOTE: Uses consolidated tenant ID from organizations table
  testConnection: scopedProcedure.mutation(async ({ ctx }) => {
    assertAdmin(ctx);
    const { testEmailConnection } = await import("../services/emailService");
    return await testEmailConnection(ctx.scope.organizationId);
  }),

  // Send a test email to verify the full pipeline
  // NOTE: Uses consolidated tenant ID from organizations table
  sendTestEmail: scopedProcedure.input(z.object({
    recipientEmail: z.string().email(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const { sendEmail } = await import("../services/emailService");
    const result = await sendEmail({
      organizationId: ctx.scope.organizationId,
      to: [input.recipientEmail],
      subject: "IMS Test Email - Connection Verified",
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e40af;">\u2705 Email Connection Test Successful</h2>
          <p>This is a test email from the Integrated Management System (IMS).</p>
          <p>If you received this email, your email provider is correctly configured and working.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
          <p style="color: #6b7280; font-size: 12px;">Provider: ${ctx.scope.organizationId}</p>
        </div>
      `,
    });
    return result;
  }),
});

// ============================================================================
// NOTIFICATION EVENT SETTINGS (Per-event channels + recipient rules)
// ============================================================================

const notificationEventsRouter = router({
  // List all notification events for the org (seed defaults if empty)
  list: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    let events = await db.select().from(notificationEventSettings)
      .where(eq(notificationEventSettings.organizationId, orgId))
      .orderBy(asc(notificationEventSettings.category), asc(notificationEventSettings.name));
    
    // Seed defaults if empty
    if (events.length === 0) {
      for (const evt of DEFAULT_NOTIFICATION_EVENTS) {
        await db.insert(notificationEventSettings).values({
          organizationId: orgId,
          eventKey: evt.eventKey,
          name: evt.name,
          category: evt.category,
          description: evt.description,
          emailEnabled: evt.eventKey !== "user_activity", // Disable user_activity by default
          inAppEnabled: true,
          recipientsMode: "role",
        });
      }
      events = await db.select().from(notificationEventSettings)
        .where(eq(notificationEventSettings.organizationId, orgId))
        .orderBy(asc(notificationEventSettings.category), asc(notificationEventSettings.name));
    }
    return events;
  }),

  // Update a notification event setting
  update: scopedProcedure.input(z.object({
    id: z.number(),
    emailEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    recipientsMode: z.enum(["role", "explicit_emails", "workflow_assignees", "mixed"]).optional(),
    roleIds: z.string().optional().nullable(),
    explicitEmails: z.string().optional().nullable(),
    templateId: z.number().optional().nullable(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const { id, ...data } = input;
    await db.update(notificationEventSettings).set(data)
      .where(and(eq(notificationEventSettings.id, id), eq(notificationEventSettings.organizationId, ctx.scope.organizationId)));
    return { success: true };
  }),
});

// ============================================================================
// NOTIFICATION OUTBOX (Queue with retry / dead-letter)
// ============================================================================

const notificationOutboxRouter = router({
  // List outbox entries (admin read-only log)
  list: scopedProcedure.input(z.object({
    status: z.enum(["queued", "sending", "sent", "failed", "dead_letter"]).optional(),
    channel: z.enum(["email", "inapp"]).optional(),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
  }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    let query = db.select().from(notificationOutbox)
      .where(eq(notificationOutbox.organizationId, orgId))
      .orderBy(desc(notificationOutbox.createdAt))
      .limit(input?.limit ?? 50)
      .offset(input?.offset ?? 0);
    return await query;
  }),

  // Get outbox stats
  stats: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const all = await db.select({
      status: notificationOutbox.status,
      count: sql<number>`count(*)`,
    }).from(notificationOutbox)
      .where(eq(notificationOutbox.organizationId, orgId))
      .groupBy(notificationOutbox.status);
    const stats: Record<string, number> = { queued: 0, sending: 0, sent: 0, failed: 0, dead_letter: 0 };
    all.forEach((r) => { stats[r.status] = Number(r.count); });
    return stats;
  }),

  // Retry a failed notification
  retry: scopedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    await db.update(notificationOutbox).set({
      status: "queued", attemptCount: 0, lastError: null, nextRetryAt: null,
    }).where(and(eq(notificationOutbox.id, input.id), eq(notificationOutbox.organizationId, ctx.scope.organizationId)));
    return { success: true };
  }),
});

// EMAIL TEMPLATES (Full CRUD with merge tags and preview)
const emailTemplatesRouter = router({
  // List all templates for the organization
  list: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    return await db.select().from(emailTemplates)
      .where(eq(emailTemplates.organizationId, ctx.scope.organizationId))
      .orderBy(asc(emailTemplates.name));
  }),

  // Get a single template by ID
  getById: scopedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const [template] = await db.select().from(emailTemplates)
      .where(and(eq(emailTemplates.id, input.id), eq(emailTemplates.organizationId, ctx.scope.organizationId)))
      .limit(1);
    if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
    return template;
  }),

  // Create a new template
  create: scopedProcedure.input(z.object({
    templateKey: z.string().min(1).max(100),
    name: z.string().min(1).max(255),
    nameAr: z.string().max(255).optional().nullable(),
    subject: z.string().max(500).optional().nullable(),
    subjectAr: z.string().max(500).optional().nullable(),
    bodyHtml: z.string().optional().nullable(),
    bodyHtmlAr: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const result = await db.insert(emailTemplates).values({
      organizationId: ctx.scope.organizationId,
      ...input,
      isActive: input.isActive ?? 1,
    });
    return { success: true, id: result[0].insertId };
  }),

  // Update an existing template
  update: scopedProcedure.input(z.object({
    id: z.number(),
    templateKey: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(255).optional(),
    nameAr: z.string().max(255).optional().nullable(),
    subject: z.string().max(500).optional().nullable(),
    subjectAr: z.string().max(500).optional().nullable(),
    bodyHtml: z.string().optional().nullable(),
    bodyHtmlAr: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const { id, ...data } = input;
    await db.update(emailTemplates).set(data)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.organizationId, ctx.scope.organizationId)));
    return { success: true };
  }),

  // Delete a template
  delete: scopedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    await db.delete(emailTemplates)
      .where(and(eq(emailTemplates.id, input.id), eq(emailTemplates.organizationId, ctx.scope.organizationId)));
    return { success: true };
  }),

  // Preview a template with sample data
  preview: scopedProcedure.input(z.object({
    bodyHtml: z.string(),
    variables: z.record(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const { renderTemplate } = await import("../services/emailService");
    const sampleVars: Record<string, string> = {
      recipientName: "Ahmed Al-Rashid",
      recipientEmail: "ahmed@example.org",
      organizationName: "Sample Organization",
      organizationNameAr: "\u0645\u0646\u0638\u0645\u0629 \u0646\u0645\u0648\u0630\u062c\u064a\u0629",
      eventName: "Grant Approved",
      eventDescription: "A grant has been approved and is ready for review.",
      actionUrl: "https://ims.example.org/grants/123",
      currentDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      currentYear: new Date().getFullYear().toString(),
      senderName: "IMS Notifications",
      projectName: "Community Health Initiative",
      grantName: "USAID Health Grant 2026",
      amount: "$50,000.00",
      deadline: "March 31, 2026",
      customMessage: "This is a sample custom message for preview purposes.",
      ...input.variables,
    };
    const rendered = renderTemplate(input.bodyHtml, sampleVars);
    return { html: rendered };
  }),

  // Get available merge tags
  getMergeTags: scopedProcedure.query(async () => {
    const { AVAILABLE_MERGE_TAGS } = await import("../services/emailService");
    return AVAILABLE_MERGE_TAGS;
  }),

  // Legacy alias for backward compatibility
  getTemplates: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    return await db.select().from(emailTemplates)
      .where(eq(emailTemplates.organizationId, ctx.scope.organizationId))
      .orderBy(asc(emailTemplates.name));
  }),
  updateTemplate: scopedProcedure.input(z.object({
    id: z.number(), subject: z.string().optional(), subjectAr: z.string().optional(),
    bodyHtml: z.string().optional(), bodyHtmlAr: z.string().optional(), isActive: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const { id, ...data } = input;
    await db.update(emailTemplates).set(data).where(eq(emailTemplates.id, id));
    return { success: true };
  }),
});

// DELETED RECORDS
const deletedRecordsRouter = router({
  list: scopedProcedure.input(z.object({
    search: z.string().optional(), module: z.string().optional(),
  }).optional()).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const results: any[] = [];

    // Query deleted organizations
    const deletedOrgs = await db.select({
      id: organizations.id,
      recordName: organizations.name,
      recordId: organizations.id,
      module: sql`'organizations'`,
      entityType: sql`'organization'`,
      deletedAt: organizations.deletedAt,
      deletedBy: organizations.deletedBy,
    }).from(organizations)
      .where(and(eq(organizations.isDeleted, 1), eq(organizations.id, orgId)))
      .limit(1);
    
    results.push(...deletedOrgs);

    // Filter by search if provided
    let filtered = results;
    if (input?.search) {
      const searchLower = input.search.toLowerCase();
      filtered = results.filter(r => 
        r.recordName?.toLowerCase().includes(searchLower) ||
        r.recordId?.toString().includes(searchLower)
      );
    }

    // Enrich with deleted-by names
    const enriched = await Promise.all(filtered.map(async (rec) => {
      let deletedByName = 'Unknown';
      if (rec.deletedBy) {
        const [deleter] = await db.select({ name: users.name }).from(users)
          .where(eq(users.id, rec.deletedBy)).limit(1);
        if (deleter) deletedByName = deleter.name || 'Unknown';
      }
      return { ...rec, deletedByName };
    }));

    return enriched;
  }),

  restore: scopedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Check if it's a deleted organization
    const [org] = await db.select().from(organizations)
      .where(and(eq(organizations.id, input.id), eq(organizations.isDeleted, 1)))
      .limit(1);

    if (org) {
      // Restore organization
      await db.update(organizations).set({
        isDeleted: 0,
        isActive: 1,
        deletedAt: null,
        deletedBy: null,
      }).where(eq(organizations.id, input.id));

      // Log the restore
      await db.insert(auditLogs).values({
        organizationId: orgId,
        userId: ctx.user.id,
        action: 'restore_organization',
        module: 'organizations',
        entityType: 'organization',
        entityId: input.id,
        changes: JSON.stringify({ restored: true, restoredAt: new Date() }),
        timestamp: new Date(),
      });

      return { success: true, message: 'Organization restored successfully' };
    }

    throw new TRPCError({ code: 'NOT_FOUND', message: 'Deleted record not found' });
  }),

  purge: scopedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;

    // Check if it's a deleted organization
    const [org] = await db.select().from(organizations)
      .where(and(eq(organizations.id, input.id), eq(organizations.isDeleted, 1)))
      .limit(1);

    if (org) {
      // Permanently delete organization
      await db.delete(organizations).where(eq(organizations.id, input.id));

      // Log the purge
      await db.insert(auditLogs).values({
        organizationId: orgId,
        userId: ctx.user.id,
        action: 'purge_organization',
        module: 'organizations',
        entityType: 'organization',
        entityId: input.id,
        changes: JSON.stringify({ purged: true, purgedAt: new Date() }),
        timestamp: new Date(),
      });

      return { success: true, message: 'Record permanently deleted' };
    }

    throw new TRPCError({ code: 'NOT_FOUND', message: 'Deleted record not found' });
  }),
});

// IMPORT HISTORY
const importHistoryRouter = router({
  list: scopedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const records = await db.select({
      id: importHistory.id,
      fileName: importHistory.fileName,
      moduleName: importHistory.importType,
      status: importHistory.status,
      totalRows: sql<number>`${importHistory.recordsImported} + ${importHistory.recordsSkipped} + ${importHistory.recordsErrors}`,
      successCount: importHistory.recordsImported,
      errorCount: importHistory.recordsErrors,
      importedAt: importHistory.importedAt,
      createdAt: importHistory.createdAt,
      importedByName: users.name,
    })
      .from(importHistory)
      .leftJoin(users, eq(importHistory.userId, users.id))
      .where(eq(importHistory.organizationId, orgId))
      .orderBy(sql`${importHistory.importedAt} DESC`)
      .limit(200);
    return records;
  }),

  getById: scopedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    assertAdmin(ctx);
    const db = await getDb();
    const orgId = ctx.scope.organizationId;
    const [record] = await db.select({
      id: importHistory.id,
      fileName: importHistory.fileName,
      moduleName: importHistory.importType,
      status: importHistory.status,
      totalRows: sql<number>`${importHistory.recordsImported} + ${importHistory.recordsSkipped} + ${importHistory.recordsErrors}`,
      successCount: importHistory.recordsImported,
      errorCount: importHistory.recordsErrors,
      errorDetails: importHistory.errorDetails,
      importedAt: importHistory.importedAt,
      createdAt: importHistory.createdAt,
      importedByName: users.name,
    })
      .from(importHistory)
      .leftJoin(users, eq(importHistory.userId, users.id))
      .where(and(eq(importHistory.id, input.id), eq(importHistory.organizationId, orgId)));
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Import record not found" });
    return record;
  }),
});

// COMBINED SETTINGS ROUTER
export const settingsRouter = router({
  roles: rbacRolesRouter,
  users: rbacUsersRouter,
  optionSets: optionSetsRouter,
  branding: brandingRouter,
  landing: landingRouter,
  emailProvider: emailProviderRouter,
  notificationEvents: notificationEventsRouter,
  notificationOutbox: notificationOutboxRouter,
  emailTemplates: emailTemplatesRouter,
  deletedRecords: deletedRecordsRouter,
  importHistory: importHistoryRouter,
});