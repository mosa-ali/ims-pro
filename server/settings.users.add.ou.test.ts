import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getDb } from './db';
import { users, userOrganizations, userOperatingUnits, organizations, operatingUnits } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

describe('User Management - Operating Unit Assignment', () => {
  let db: any;
  let testOrgId: number;
  let testOU1Id: number;
  let testOU2Id: number;
  let testUserId: number;

  beforeAll(async () => {
    db = await getDb();
    
    // Create test organization
    const orgResult = await db.insert(organizations).values({
      name: 'Test Org for OU Assignment',
      nameAr: 'منظمة اختبار لتعيين الوحدة',
      country: 'Yemen',
      domain: 'test-ou.org',
      timezone: 'Asia/Aden',
      currency: 'USD',
      createdBy: 1,
    });
    testOrgId = Number(orgResult[0].insertId);

    // Create test operating units
    const ou1Result = await db.insert(operatingUnits).values({
      organizationId: testOrgId,
      name: 'Headquarters',
      nameAr: 'المقر الرئيسي',
      type: 'HQ',
      country: 'Yemen',
      city: 'Sana\'a',
      status: 'active',
      createdBy: 1,
    });
    testOU1Id = Number(ou1Result[0].insertId);

    const ou2Result = await db.insert(operatingUnits).values({
      organizationId: testOrgId,
      name: 'Regional Office',
      nameAr: 'المكتب الإقليمي',
      type: 'REGIONAL',
      country: 'Jordan',
      city: 'Amman',
      status: 'active',
      createdBy: 1,
    });
    testOU2Id = Number(ou2Result[0].insertId);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await db.delete(userOperatingUnits).where(eq(userOperatingUnits.userId, testUserId));
      await db.delete(userOrganizations).where(eq(userOrganizations.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    await db.delete(operatingUnits).where(eq(operatingUnits.organizationId, testOrgId));
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
  });

  it('should assign user to single operating unit', async () => {
    // Create test user
    const userResult = await db.insert(users).values({
      name: 'Test User Single OU',
      email: 'test-single-ou@example.com',
      openId: 'test-single-ou-openid',
      role: 'user',
      loginMethod: 'microsoft',
      authenticationProvider: 'microsoft',
    });
    testUserId = Number(userResult[0].insertId);

    // Assign to organization
    await db.insert(userOrganizations).values({
      userId: testUserId,
      organizationId: testOrgId,
      platformRole: 'user',
    });

    // Assign to single operating unit
    await db.insert(userOperatingUnits).values({
      userId: testUserId,
      operatingUnitId: testOU1Id,
      role: 'user',
    });

    // Verify assignment
    const assignments = await db.select().from(userOperatingUnits)
      .where(eq(userOperatingUnits.userId, testUserId));

    expect(assignments).toHaveLength(1);
    expect(assignments[0].operatingUnitId).toBe(testOU1Id);
    expect(assignments[0].role).toBe('user');
  });

  it('should assign user to multiple operating units', async () => {
    // Create test user
    const userResult = await db.insert(users).values({
      name: 'Test User Multi OU',
      email: 'test-multi-ou@example.com',
      openId: 'test-multi-ou-openid',
      role: 'user',
      loginMethod: 'microsoft',
      authenticationProvider: 'microsoft',
    });
    const userId = Number(userResult[0].insertId);

    // Assign to organization
    await db.insert(userOrganizations).values({
      userId,
      organizationId: testOrgId,
      platformRole: 'user',
    });

    // Assign to multiple operating units
    await db.insert(userOperatingUnits).values([
      {
        userId,
        operatingUnitId: testOU1Id,
        role: 'user',
      },
      {
        userId,
        operatingUnitId: testOU2Id,
        role: 'user',
      },
    ]);

    // Verify assignments
    const assignments = await db.select().from(userOperatingUnits)
      .where(eq(userOperatingUnits.userId, userId));

    expect(assignments).toHaveLength(2);
    expect(assignments.map(a => a.operatingUnitId)).toContain(testOU1Id);
    expect(assignments.map(a => a.operatingUnitId)).toContain(testOU2Id);

    // Cleanup
    await db.delete(userOperatingUnits).where(eq(userOperatingUnits.userId, userId));
    await db.delete(userOrganizations).where(eq(userOrganizations.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it('should prevent duplicate OU assignment for same user', async () => {
    // Create test user
    const userResult = await db.insert(users).values({
      name: 'Test User Duplicate OU',
      email: 'test-duplicate-ou@example.com',
      openId: 'test-duplicate-ou-openid',
      role: 'user',
      loginMethod: 'microsoft',
      authenticationProvider: 'microsoft',
    });
    const userId = Number(userResult[0].insertId);

    // Assign to organization
    await db.insert(userOrganizations).values({
      userId,
      organizationId: testOrgId,
      platformRole: 'user',
    });

    // Assign to operating unit
    await db.insert(userOperatingUnits).values({
      userId,
      operatingUnitId: testOU1Id,
      role: 'user',
    });

    // Try to assign to same OU again - should fail due to unique index
    try {
      await db.insert(userOperatingUnits).values({
        userId,
        operatingUnitId: testOU1Id,
        role: 'user',
      });
      expect.fail('Should have thrown duplicate key error');
    } catch (error: any) {
      expect(error.message).toContain('Duplicate entry');
    }

    // Cleanup
    await db.delete(userOperatingUnits).where(eq(userOperatingUnits.userId, userId));
    await db.delete(userOrganizations).where(eq(userOrganizations.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it('should support different roles for user in different OUs', async () => {
    // Create test user
    const userResult = await db.insert(users).values({
      name: 'Test User Different Roles',
      email: 'test-different-roles@example.com',
      openId: 'test-different-roles-openid',
      role: 'user',
      loginMethod: 'microsoft',
      authenticationProvider: 'microsoft',
    });
    const userId = Number(userResult[0].insertId);

    // Assign to organization
    await db.insert(userOrganizations).values({
      userId,
      organizationId: testOrgId,
      platformRole: 'user',
    });

    // Assign to OU1 as user
    await db.insert(userOperatingUnits).values({
      userId,
      operatingUnitId: testOU1Id,
      role: 'user',
    });

    // Assign to OU2 as organization_admin
    await db.insert(userOperatingUnits).values({
      userId,
      operatingUnitId: testOU2Id,
      role: 'organization_admin',
    });

    // Verify assignments with different roles
    const assignments = await db.select().from(userOperatingUnits)
      .where(eq(userOperatingUnits.userId, userId));

    expect(assignments).toHaveLength(2);
    
    const ou1Assignment = assignments.find(a => a.operatingUnitId === testOU1Id);
    const ou2Assignment = assignments.find(a => a.operatingUnitId === testOU2Id);

    expect(ou1Assignment?.role).toBe('user');
    expect(ou2Assignment?.role).toBe('organization_admin');

    // Cleanup
    await db.delete(userOperatingUnits).where(eq(userOperatingUnits.userId, userId));
    await db.delete(userOrganizations).where(eq(userOrganizations.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it('should retrieve all OUs for a user', async () => {
    // Create test user
    const userResult = await db.insert(users).values({
      name: 'Test User Get OUs',
      email: 'test-get-ous@example.com',
      openId: 'test-get-ous-openid',
      role: 'user',
      loginMethod: 'microsoft',
      authenticationProvider: 'microsoft',
    });
    const userId = Number(userResult[0].insertId);

    // Assign to organization
    await db.insert(userOrganizations).values({
      userId,
      organizationId: testOrgId,
      platformRole: 'user',
    });

    // Assign to multiple OUs
    await db.insert(userOperatingUnits).values([
      { userId, operatingUnitId: testOU1Id, role: 'user' },
      { userId, operatingUnitId: testOU2Id, role: 'user' },
    ]);

    // Retrieve all OUs for user
    const userOUs = await db.select()
      .from(userOperatingUnits)
      .where(eq(userOperatingUnits.userId, userId));

    expect(userOUs).toHaveLength(2);
    expect(userOUs.every(ou => ou.userId === userId)).toBe(true);

    // Cleanup
    await db.delete(userOperatingUnits).where(eq(userOperatingUnits.userId, userId));
    await db.delete(userOrganizations).where(eq(userOrganizations.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });
});
