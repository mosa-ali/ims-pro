import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { users, userOrganizations, rbacRoles, rbacUserPermissions, organizations } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('Settings Router - User Update', () => {
  let db: any;
  let testOrgId: number;
  let testUserId: number;
  let testRoleId: number;
  let adminUserId: number;

  beforeAll(async () => {
    db = await getDb();
    
    // Create test organization
    const orgResult = await db.insert(organizations).values({
      name: 'Test Org for User Update',
      createdBy: 1,
    });
    testOrgId = Number(orgResult[0].insertId);

    // Create admin user
    const adminResult = await db.insert(users).values({
      name: 'Admin User',
      email: `admin-${Date.now()}@test.com`,
      openId: `admin_${Date.now()}`,
      role: 'admin',
      loginMethod: 'microsoft',
      authenticationProvider: 'microsoft',
    });
    adminUserId = Number(adminResult[0].insertId);

    // Assign admin to organization
    await db.insert(userOrganizations).values({
      userId: adminUserId,
      organizationId: testOrgId,
      platformRole: 'platform_admin',
    });

    // Create test user
    const userResult = await db.insert(users).values({
      name: 'Test User',
      email: `testuser-${Date.now()}@test.com`,
      openId: `user_${Date.now()}`,
      role: 'user',
      loginMethod: 'microsoft',
      authenticationProvider: 'microsoft',
    });
    testUserId = Number(userResult[0].insertId);

    // Assign test user to organization
    await db.insert(userOrganizations).values({
      userId: testUserId,
      organizationId: testOrgId,
      platformRole: 'user',
    });

    // Create test role
    const roleResult = await db.insert(rbacRoles).values({
      organizationId: testOrgId,
      name: 'Program Manager',
      nameAr: 'مدير البرنامج',
      description: 'Manages grants and programs',
      permissions: JSON.stringify({
        grants: { view: true, create: true, edit: true, delete: false },
        projects: { view: true, create: true, edit: true, delete: false },
      }),
      createdBy: adminUserId,
    });
    testRoleId = Number(roleResult[0].insertId);
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await db.delete(rbacUserPermissions).where(eq(rbacUserPermissions.userId, testUserId));
      await db.delete(userOrganizations).where(eq(userOrganizations.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (adminUserId) {
      await db.delete(userOrganizations).where(eq(userOrganizations.userId, adminUserId));
      await db.delete(users).where(eq(users.id, adminUserId));
    }
    if (testRoleId) {
      await db.delete(rbacRoles).where(eq(rbacRoles.id, testRoleId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  it('should create new RBAC permissions when user has none', async () => {
    // Verify user has no permissions initially
    const existingPerms = await db.select().from(rbacUserPermissions)
      .where(and(eq(rbacUserPermissions.userId, testUserId), eq(rbacUserPermissions.organizationId, testOrgId)));
    expect(existingPerms).toHaveLength(0);

    // Simulate the update mutation
    const role = await db.select().from(rbacRoles).where(eq(rbacRoles.id, testRoleId)).limit(1);
    expect(role).toHaveLength(1);

    // Insert new permissions (simulating update procedure)
    await db.insert(rbacUserPermissions).values({
      userId: testUserId,
      organizationId: testOrgId,
      roleId: testRoleId,
      permissions: role[0].permissions || '{}',
      screenPermissions: '{}',
      tabPermissions: '{}',
      isActive: true,
      updatedBy: adminUserId,
    });

    // Verify permissions were created
    const newPerms = await db.select().from(rbacUserPermissions)
      .where(and(eq(rbacUserPermissions.userId, testUserId), eq(rbacUserPermissions.organizationId, testOrgId)));
    expect(newPerms).toHaveLength(1);
    expect(newPerms[0].roleId).toBe(testRoleId);
    expect(newPerms[0].isActive).toBeTruthy();
  });

  it('should update existing RBAC permissions', async () => {
    // Create another role
    const role2Result = await db.insert(rbacRoles).values({
      organizationId: testOrgId,
      name: 'Finance Manager',
      nameAr: 'مدير المالية',
      description: 'Manages financial data',
      permissions: JSON.stringify({
        finance: { view: true, create: true, edit: true, delete: true },
      }),
      createdBy: adminUserId,
    });
    const role2Id = Number(role2Result[0].insertId);

    try {
      // Get existing permissions
      const existingPerms = await db.select().from(rbacUserPermissions)
        .where(and(eq(rbacUserPermissions.userId, testUserId), eq(rbacUserPermissions.organizationId, testOrgId)))
        .limit(1);
      
      expect(existingPerms).toHaveLength(1);
      const permId = existingPerms[0].id;

      // Get new role
      const newRole = await db.select().from(rbacRoles).where(eq(rbacRoles.id, role2Id)).limit(1);
      expect(newRole).toHaveLength(1);

      // Update permissions (simulating update procedure)
      await db.update(rbacUserPermissions).set({
        roleId: role2Id,
        permissions: newRole[0].permissions || '{}',
        screenPermissions: '{}',
        updatedBy: adminUserId,
      }).where(eq(rbacUserPermissions.id, permId));

      // Verify permissions were updated
      const updatedPerms = await db.select().from(rbacUserPermissions)
        .where(eq(rbacUserPermissions.id, permId));
      expect(updatedPerms).toHaveLength(1);
      expect(updatedPerms[0].roleId).toBe(role2Id);
      expect(updatedPerms[0].updatedBy).toBe(adminUserId);
    } finally {
      // Cleanup role2
      await db.delete(rbacRoles).where(eq(rbacRoles.id, role2Id));
    }
  });

  it('should preserve role permissions when updating user assignment', async () => {
    // Get the current permissions
    const perms = await db.select().from(rbacUserPermissions)
      .where(and(eq(rbacUserPermissions.userId, testUserId), eq(rbacUserPermissions.organizationId, testOrgId)))
      .limit(1);
    
    expect(perms).toHaveLength(1);
    const permissionsJson = perms[0].permissions;
    const parsedPerms = JSON.parse(permissionsJson);

    // Verify the permissions match the role
    expect(parsedPerms).toHaveProperty('finance');
    expect(parsedPerms.finance.view).toBe(true);
    expect(parsedPerms.finance.create).toBe(true);
  });

  it('should track who updated the user role', async () => {
    // Get the permissions
    const perms = await db.select().from(rbacUserPermissions)
      .where(and(eq(rbacUserPermissions.userId, testUserId), eq(rbacUserPermissions.organizationId, testOrgId)))
      .limit(1);
    
    expect(perms).toHaveLength(1);
    expect(perms[0].updatedBy).toBe(adminUserId);
  });
});
