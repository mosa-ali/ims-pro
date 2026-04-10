import { eq, and, or, desc, sql, isNull, isNotNull, like, ne } from "drizzle-orm";
import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import * as relations from "../drizzle/relations";
import { 
  InsertUser, 
  users,
  globalSettings,
  organizations,
  InsertOrganization,
  operatingUnits,
  InsertOperatingUnit,
  userOrganizations,
  InsertUserOrganization,
  userOperatingUnits,
  InsertUserOperatingUnit,
  microsoftIntegrations,
  InsertMicrosoftIntegration,
  auditLogs,
  InsertAuditLog,
  invitations,
  InsertInvitation,
  projects,
  grants,
  beneficiaries,
  contracts,
  purchaseRequests,
  activities,
  proposals,
  budgetItems,
  opportunities,
} from "../drizzle/schema";
import { ENV } from './_core/env';

const fullSchema = { ...schema, ...relations };

let _db: MySql2Database<typeof fullSchema> | null = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const connectionString = process.env.DATABASE_URL;
      const url = new URL(connectionString);

      _pool = mysql.createPool({
        host: url.hostname,
        port: Number(url.port || 3306),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ""),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: {
          minVersion: "TLSv1.2",
          rejectUnauthorized: true,
        },
      });

      _db = drizzle({ client: _pool, schema: fullSchema, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      throw new Error("Database connection failed");
    }
  }

  if (!_db) {
    throw new Error("Database not available - DATABASE_URL not configured");
  }

  return _db;
}

export async function getDbPool() {
  if (!_pool && process.env.DATABASE_URL) {
    await getDb();
  }

  if (!_pool) {
    throw new Error("Database pool not available - DATABASE_URL not configured");
  }

  return _pool;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      
      // Prevent NULL values for critical fields - use defaults instead
      let normalized: string | null = value ?? null;
      
      // Ensure critical fields never become NULL
      if (normalized === null || normalized === undefined) {
        if (field === 'name') {
          normalized = 'Unknown User';
          console.warn(`[Database] NULL name detected for user, using default: ${normalized}`);
        } else if (field === 'email') {
          normalized = `user-${Date.now()}@unknown.local`;
          console.warn(`[Database] NULL email detected for user, using default: ${normalized}`);
        } else if (field === 'loginMethod') {
          normalized = 'unknown';
        }
      }
      
      // Also handle empty strings
      if (typeof normalized === 'string' && normalized.trim() === '') {
        if (field === 'name') {
          normalized = 'Unknown User';
          console.warn(`[Database] Empty name detected for user, using default: ${normalized}`);
        } else if (field === 'email') {
          normalized = `user-${Date.now()}@unknown.local`;
          console.warn(`[Database] Empty email detected for user, using default: ${normalized}`);
        } else if (field === 'loginMethod') {
          normalized = 'unknown';
        }
      }
      
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);
    const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = nowSql;
      updateSet.lastSignedIn = nowSql;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    // Note: Removed automatic role assignment for owner - they can set their own role like any other user

    if (!values.lastSignedIn) {
      values.lastSignedIn = nowSql;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = nowSql;
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
    
    // After upsert, link any pending organization assignments by email
    // This handles the case where Platform Admin created org assignments before the user logged in via OAuth
    if (user.email) {
      await linkOrganizationAssignmentsByEmail(user.openId, user.email);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export async function getAllOrganizations() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(organizations).where(isNull(organizations.deletedAt));
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(and(eq(organizations.id, id), isNull(organizations.deletedAt))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Check if a user can manage (edit/delete) an organization
 * Returns true if:
 * - User is a platform admin, OR
 * - User is the organization's primary admin
 */
export async function canUserManageOrganization(userId: number, organizationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Get user to check role
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (userResult.length === 0) return false;
  const user = userResult[0];
  
  // Platform admins can manage any organization
  if (user.role === 'platform_super_admin' || user.role === 'platform_admin') return true;
  
  // Check if user is the organization's primary admin
  const orgResult = await db.select().from(organizations).where(and(eq(organizations.id, organizationId), isNull(organizations.deletedAt))).limit(1);
  if (orgResult.length === 0) return false;
  const org = orgResult[0];
  
  return org.primaryAdminId === userId;
}

export async function getOrganizationByShortCode(shortCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(and(eq(organizations.shortCode, shortCode), isNull(organizations.deletedAt))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrganizationsByDomain(domain: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(organizations).where(and(eq(organizations.domain, domain), isNull(organizations.deletedAt)));
}

export async function createOrganization(org: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Auto-generate organizationCode if not provided
  if (!org.shortCode) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    org.shortCode = `ORG-${timestamp}-${random}`;
  }
  
  // Auto-generate tenantId if not provided (UUID is exactly 36 characters)
  if (!org.tenantId) {
    org.tenantId = crypto.randomUUID();
  }
  
  const result = await db.insert(organizations).values(org);
  return Number(result[0].insertId);
}

export async function updateOrganization(id: number, updates: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Skip update if no values to set
  if (Object.keys(updates).length === 0) {
    return;
  }
  
  await db.update(organizations).set(updates).where(eq(organizations.id, id));
}

// ============================================================================
// OPERATING UNITS
// ============================================================================

export async function getAllOperatingUnits() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(operatingUnits).where(isNull(operatingUnits.deletedAt));
}

export async function getOperatingUnitsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(operatingUnits).where(and(eq(operatingUnits.organizationId, organizationId), isNull(operatingUnits.deletedAt)));
}

export async function getOperatingUnitById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(operatingUnits).where(and(eq(operatingUnits.id, id), isNull(operatingUnits.deletedAt))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOperatingUnitByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(operatingUnits).where(and(eq(operatingUnits.code, code), isNull(operatingUnits.deletedAt))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOperatingUnit(unit: InsertOperatingUnit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(operatingUnits).values(unit);
  return Number(result[0].insertId);
}

export async function updateOperatingUnit(id: number, updates: Partial<InsertOperatingUnit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(operatingUnits).set(updates).where(eq(operatingUnits.id, id));
}

// ============================================================================
// USER ASSIGNMENTS
// ============================================================================

export async function getUserOrganizations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: userOrganizations.id,
      userId: userOrganizations.userId,
      organizationId: userOrganizations.organizationId,
      tenantId: userOrganizations.tenantId,
      platformRole: userOrganizations.platformRole,
      orgRoles: userOrganizations.orgRoles,
      permissions: userOrganizations.permissions,
      createdAt: userOrganizations.createdAt,
      organizationName: organizations.name,
      organizationStatus: organizations.status,
      shortCode: organizations.shortCode,
    })
    .from(userOrganizations)
    .leftJoin(organizations, eq(userOrganizations.organizationId, organizations.id))
    .where(and(
      eq(userOrganizations.userId, userId),
      isNull(organizations.deletedAt) // Filter out soft-deleted organizations
    ));
  
  // Deduplicate by organizationId, keeping the row with the highest-privilege role
  // Role priority: organization_admin > platform_admin > user
  const rolePriority: Record<string, number> = { 'organization_admin': 3, 'platform_admin': 2, 'user': 1 };
  const orgMap = new Map<number, typeof result[0]>();
  for (const row of result) {
    const existing = orgMap.get(row.organizationId);
    if (!existing) {
      orgMap.set(row.organizationId, row);
    } else {
      const existingPriority = rolePriority[existing.platformRole] ?? 0;
      const newPriority = rolePriority[row.platformRole] ?? 0;
      if (newPriority > existingPriority) {
        orgMap.set(row.organizationId, row);
      }
    }
  }

  // Map to plain objects to avoid superjson serialization depth issues
  return Array.from(orgMap.values()).map(row => ({
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    tenantId: row.tenantId,
    platformRole: row.platformRole,
    orgRoles: row.orgRoles,
    permissions: row.permissions,
    createdAt: row.createdAt,
    organizationName: row.organizationName,
    organizationStatus: row.organizationStatus,
    shortCode: row.shortCode,
  }));
}

export async function getUserOperatingUnits(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: userOperatingUnits.id,
      userId: userOperatingUnits.userId,
      operatingUnitId: userOperatingUnits.operatingUnitId,
      createdAt: userOperatingUnits.createdAt,
      unitName: operatingUnits.name,
      unitType: operatingUnits.type,
      unitStatus: operatingUnits.status,
      organizationId: operatingUnits.organizationId,
    })
    .from(userOperatingUnits)
    .leftJoin(operatingUnits, eq(userOperatingUnits.operatingUnitId, operatingUnits.id))
    .where(and(
      eq(userOperatingUnits.userId, userId),
      isNull(operatingUnits.deletedAt)
    ));
  
  // Map to plain objects to avoid superjson serialization depth issues
  return result.map(row => ({
    id: row.id,
    userId: row.userId,
    operatingUnitId: row.operatingUnitId,
    createdAt: row.createdAt,
    unitName: row.unitName,
    unitType: row.unitType,
    unitStatus: row.unitStatus,
    organizationId: row.organizationId,
  }));
}

export async function assignUserToOrganization(userId: number, organizationId: number, platformRole: "organization_admin" | "user" = "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if assignment already exists
  const existing = await db.select().from(userOrganizations).where(
    and(
      eq(userOrganizations.userId, userId),
      eq(userOrganizations.organizationId, organizationId)
    )
  ).limit(1);
  
  if (existing.length > 0) {
    // Update existing assignment
    await db.update(userOrganizations)
      .set({ platformRole })
      .where(
        and(
          eq(userOrganizations.userId, userId),
          eq(userOrganizations.organizationId, organizationId)
        )
      );
  } else {
    // Insert new assignment
    await db.insert(userOrganizations).values({ userId, organizationId, platformRole });
  }
}

export async function assignUserToOperatingUnit(userId: number, operatingUnitId: number, role: "organization_admin" | "user" = "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userOperatingUnits).values({ userId, operatingUnitId, role });
}

export async function removeUserFromOrganization(userId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userOrganizations).where(
    eq(userOrganizations.userId, userId) && eq(userOrganizations.organizationId, organizationId)
  );
}

export async function removeUserFromOperatingUnit(userId: number, operatingUnitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userOperatingUnits).where(
    eq(userOperatingUnits.userId, userId) && eq(userOperatingUnits.operatingUnitId, operatingUnitId)
  );
}

// ============================================================================
// ORGANIZATION USER MANAGEMENT
// ============================================================================

/**
 * Get all users in an organization with their roles and permissions
 */
export async function getOrganizationUsers(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      platformRole: userOrganizations.platformRole,
      orgRoles: userOrganizations.orgRoles,
      permissions: userOrganizations.permissions,
      modulePermissions: userOrganizations.modulePermissions,
      createdAt: userOrganizations.createdAt,
    })
    .from(userOrganizations)
    .innerJoin(users, eq(userOrganizations.userId, users.id))
    .where(and(
      eq(userOrganizations.organizationId, organizationId),
      isNull(users.deletedAt) // Filter out soft-deleted users
    ));
  
  // Parse modulePermissions JSON string to array
  return result.map(user => ({
    ...user,
    modulePermissions: user.modulePermissions ? JSON.parse(user.modulePermissions) : [],
  }));
}

/**
 * Create or find a user by email
 * Returns the user ID
 */
export async function createOrFindUserByEmail(email: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if user exists
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  // Create new user (without openId - they'll complete OAuth later)
  const [result] = await db.insert(users).values({
    email,
    name,
    openId: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Temporary openId
    role: "user",
  });
  
  return Number(result.insertId);
}

/**
 * Assign user to organization with role and module permissions
 */
export async function assignUserToOrganizationWithPermissions(
  userId: number,
  organizationId: number,
  platformRole: "organization_admin" | "user",
  modulePermissions: string[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(userOrganizations).values({
    userId,
    organizationId,
    platformRole,
    modulePermissions: JSON.stringify(modulePermissions),
  });
}

/**
 * Update user's role and module permissions in an organization
 */
export async function updateUserOrganizationPermissions(
  userId: number,
  organizationId: number,
  platformRole?: "organization_admin" | "user",
  modulePermissions?: string[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updates: any = {};
  if (platformRole) updates.platformRole = platformRole;
  if (modulePermissions) updates.modulePermissions = JSON.stringify(modulePermissions);
  
  await db
    .update(userOrganizations)
    .set(updates)
    .where(
      and(
        eq(userOrganizations.userId, userId),
        eq(userOrganizations.organizationId, organizationId)
      )
    );
}

// ============================================================================
// MICROSOFT INTEGRATIONS
// ============================================================================

export async function getMicrosoftIntegration(organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(microsoftIntegrations).where(eq(microsoftIntegrations.organizationId, organizationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertMicrosoftIntegration(integration: InsertMicrosoftIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(microsoftIntegrations).values(integration).onDuplicateKeyUpdate({
    set: integration,
  });
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(log);
}

// ============================================================================
// SOFT DELETE OPERATIONS
// ============================================================================

export async function softDeleteOrganization(id: number, deletedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get organization details before deletion
  const org = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (org.length === 0) throw new Error("Organization not found");
  
  await db.update(organizations).set({
    isDeleted: 1,
    deletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    deletedBy,
  }).where(eq(organizations.id, id));
  
  // Log to audit trail
  await createAuditLog({
    userId: deletedBy,
    organizationId: id,
    action: "soft_delete",
    entityType: "organization",
    entityId: id,
    details: JSON.stringify({ name: org[0].name, domain: org[0].domain }),
  });
}

export async function softDeleteOperatingUnit(id: number, deletedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get operating unit details before deletion
  const unit = await db.select().from(operatingUnits).where(eq(operatingUnits.id, id)).limit(1);
  if (unit.length === 0) throw new Error("Operating Unit not found");
  
  await db.update(operatingUnits).set({
    isDeleted: 1,
    deletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    deletedBy,
  }).where(eq(operatingUnits.id, id));
  
  // Log to audit trail
  await createAuditLog({
    userId: deletedBy,
    organizationId: unit[0].organizationId,
    operatingUnitId: id,
    action: "soft_delete",
    entityType: "operating_unit",
    entityId: id,
    details: JSON.stringify({ name: unit[0].name, type: unit[0].type }),
  });
}

export async function restoreOrganization(id: number, restoredBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get organization details before restore
  const org = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (org.length === 0) throw new Error("Organization not found");
  
  await db.update(organizations).set({
    isDeleted: 0,
    deletedAt: null,
    deletedBy: null,
  }).where(eq(organizations.id, id));
  
  // Log to audit trail
  await createAuditLog({
    userId: restoredBy,
    organizationId: id,
    action: "restore",
    entityType: "organization",
    entityId: id,
    details: JSON.stringify({ name: org[0].name, domain: org[0].domain }),
  });
}

export async function restoreOperatingUnit(id: number, restoredBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get operating unit details before restore
  const unit = await db.select().from(operatingUnits).where(eq(operatingUnits.id, id)).limit(1);
  if (unit.length === 0) throw new Error("Operating Unit not found");
  
  await db.update(operatingUnits).set({
    isDeleted: 0,
    deletedAt: null,
    deletedBy: null,
  }).where(eq(operatingUnits.id, id));
  
  // Log to audit trail
  await createAuditLog({
    userId: restoredBy,
    organizationId: unit[0].organizationId,
    operatingUnitId: id,
    action: "restore",
    entityType: "operating_unit",
    entityId: id,
    details: JSON.stringify({ name: unit[0].name, type: unit[0].type }),
  });
}

export async function hardDeleteOrganization(id: number, deletedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Verify it's soft-deleted first
  const org = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (org.length === 0) throw new Error("Organization not found");
  if (!org[0].isDeleted) throw new Error("Organization must be soft-deleted before hard delete");
  
  // Log to audit trail BEFORE permanent deletion
  await createAuditLog({
    userId: deletedBy,
    organizationId: id,
    action: "hard_delete",
    entityType: "organization",
    entityId: id,
    details: JSON.stringify({ name: org[0].name, domain: org[0].domain, deletedAt: org[0].deletedAt }),
  });
  
  // Permanently delete
  await db.delete(organizations).where(eq(organizations.id, id));
}

export async function hardDeleteOperatingUnit(id: number, deletedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Verify it's soft-deleted first
  const unit = await db.select().from(operatingUnits).where(eq(operatingUnits.id, id)).limit(1);
  if (unit.length === 0) throw new Error("Operating Unit not found");
  if (!unit[0].isDeleted) throw new Error("Operating Unit must be soft-deleted before hard delete");
  
  // Log to audit trail BEFORE permanent deletion
  await createAuditLog({
    userId: deletedBy,
    organizationId: unit[0].organizationId,
    operatingUnitId: id,
    action: "hard_delete",
    entityType: "operating_unit",
    entityId: id,
    details: JSON.stringify({ name: unit[0].name, type: unit[0].type, deletedAt: unit[0].deletedAt }),
  });
  
  // Permanently delete
  await db.delete(operatingUnits).where(eq(operatingUnits.id, id));
}

// ============================================================================
// DELETED RECORDS (Archive)
// ============================================================================

export async function getAllDeletedRecords() {
  const db = await getDb();
  if (!db) return [];
  
  const deletedOrgs = await db
    .select({
      id: organizations.id,
      recordType: sql<string>`'Organization'`,
      recordName: organizations.name,
      module: sql<string>`'Platform'`,
      deletedBy: organizations.deletedBy,
      deletedAt: organizations.deletedAt,
      originalStatus: organizations.status,
    })
    .from(organizations)
    .where(isNotNull(organizations.deletedAt));
  
  const deletedUnits = await db
    .select({
      id: operatingUnits.id,
      recordType: sql<string>`'Operating Unit'`,
      recordName: operatingUnits.name,
      module: sql<string>`'Platform'`,
      deletedBy: operatingUnits.deletedBy,
      deletedAt: operatingUnits.deletedAt,
      originalStatus: operatingUnits.status,
    })
    .from(operatingUnits)
    .where(isNotNull(operatingUnits.deletedAt));
  
  return [...deletedOrgs, ...deletedUnits];
}

/**
 * Get deleted records for a specific organization (organization admin view)
 */
export async function getDeletedRecordsByOrganization(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get deleted operating units for this organization
  const deletedUnits = await db
    .select({
      id: operatingUnits.id,
      recordType: sql<string>`'Operating Unit'`,
      recordName: operatingUnits.name,
      module: sql<string>`'Operations'`,
      deletedBy: operatingUnits.deletedBy,
      deletedAt: operatingUnits.deletedAt,
      originalStatus: operatingUnits.status,
    })
    .from(operatingUnits)
    .where(
      and(
        eq(operatingUnits.organizationId, organizationId),
        isNotNull(operatingUnits.deletedAt)
      )
    );
  
  // TODO: Add other organization-level deleted records (projects, users, etc.)
  
  return [...deletedUnits];
}

/**
 * Restore a soft-deleted record
 */
export async function restoreRecord(recordType: string, recordId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  switch (recordType) {
    case "Organization":
      await db
        .update(organizations)
        .set({ isDeleted: 0, deletedAt: null, deletedBy: null })
        .where(eq(organizations.id, recordId));
      break;
    case "Operating Unit":
      await db
        .update(operatingUnits)
        .set({ isDeleted: 0, deletedAt: null, deletedBy: null })
        .where(eq(operatingUnits.id, recordId));
      break;
    default:
      throw new Error(`Unknown record type: ${recordType}`);
  }
  
  return { success: true };
}

/**
 * Permanently delete a soft-deleted record (hard delete)
 */
export async function permanentDeleteRecord(recordType: string, recordId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  switch (recordType) {
    case "Organization":
      // Hard delete organization (only if soft-deleted)
      await db
        .delete(organizations)
        .where(
          and(
            eq(organizations.id, recordId),
            isNotNull(organizations.deletedAt)
          )
        );
      break;
    case "Operating Unit":
      // Hard delete operating unit (only if soft-deleted)
      await db
        .delete(operatingUnits)
        .where(
          and(
            eq(operatingUnits.id, recordId),
            isNotNull(operatingUnits.deletedAt)
          )
        );
      break;
    default:
      throw new Error(`Unknown record type: ${recordType}`);
  }
  
  return { success: true };
}


// ============================================================================
// PLATFORM USERS MANAGEMENT
// ============================================================================

/**
 * Get all platform admin users
 */
export async function getAllPlatformAdmins() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(users)
    .where(
      and(
        or(
          eq(users.role, "platform_super_admin"),
          eq(users.role, "platform_admin"),
          eq(users.role, "platform_auditor")
        ),
        isNull(users.deletedAt) // Filter out soft-deleted users
      )
    )
    .orderBy(desc(users.createdAt));
}

/**
 * Get platform admin by ID
 */
export async function getPlatformAdminById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, id),
        or(
          eq(users.role, "platform_super_admin"),
          eq(users.role, "platform_admin"),
          eq(users.role, "platform_auditor")
        ),
        isNull(users.deletedAt) // Filter out soft-deleted users
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Get user by ID (any role)
 */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Get user by OpenID or Email
 */
export async function getUserByOpenIdOrEmail(openId: string, email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(or(eq(users.openId, openId), eq(users.email, email)))
    .limit(1);

  return result[0] || null;
}

/**
 * Get user by Email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
}

/**
 * Create new user
 */
export async function createUser(data: {
  name: string;
  email: string;
  role: "platform_admin" | "user";
  openId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Generate placeholder openId for wizard-created users (not from OAuth)
  const openId = data.openId || `wizard-${crypto.randomUUID()}`;
  
  const result = await db.insert(users).values({
    name: data.name,
    email: data.email,
    role: data.role,
    openId: openId,
  });
  
  return Number(result[0].insertId);
}

/**
 * Create organization user (for assigning to organizations/operating units)
 */
export async function createOrganizationUser(data: {
  email: string;
  name: string;
  openId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a unique openId if not provided (for users created via email)
  const openId = data.openId || `email_${data.email}_${Date.now()}`;

  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    loginMethod: "email",
    role: "user", // Default role for organization users
  });

  return result[0].insertId;
}

/**
 * Create new platform admin (legacy - with OpenID)
 */
export async function createPlatformAdmin(data: {
  openId: string;
  name: string;
  email: string;
  loginMethod?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    loginMethod: data.loginMethod || "manus",
    role: "platform_admin",
  });

  return Number(result[0].insertId);
}

/**
 * Create new platform admin with authentication provider (IMS independent)
 */
export async function createPlatformAdminWithAuth(data: {
  name: string;
  email: string;
  authenticationProvider: string;
  externalIdentityId?: string;
  role: "platform_super_admin" | "platform_admin" | "platform_auditor";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    openId: null,
    name: data.name,
    email: data.email,
    loginMethod: data.authenticationProvider,
    authenticationProvider: data.authenticationProvider,
    externalIdentityId: data.externalIdentityId || null,
    role: data.role,
  });

  return Number(result[0].insertId);
}

/**
 * Update platform admin
 */
export async function updatePlatformAdmin(
  id: number,
  updates: {
    name?: string;
    email?: string;
    loginMethod?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set(updates)
    .where(and(eq(users.id, id), eq(users.role, "platform_admin")));
}

/**
 * Delete platform admin (hard delete)
 */
export async function deletePlatformAdmin(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(users)
    .where(and(eq(users.id, id), eq(users.role, "platform_admin")));
}

/**
 * Update user role
 */
export async function updateUserRole(
  id: number,
  role: "platform_super_admin" | "platform_admin" | "platform_auditor" | "organization_admin" | "user"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.update(users).set({ role }).where(eq(users.id, id));
  } catch (error) {
    console.error("[updateUserRole] Error updating user role:", {
      userId: id,
      newRole: role,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}


// ============================================================================
// Global Settings Functions
// ============================================================================

/**
 * Get global settings (singleton - only one row should exist)
 */
export async function getGlobalSettings() {
  const db = await getDb();
  if (!db) return null;
  const settings = await db.select().from(globalSettings).limit(1);
  return settings[0] || null;
}

/**
 * Initialize global settings with default values (if not exists)
 */
export async function initializeGlobalSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getGlobalSettings();
  if (!existing) {
    await db.insert(globalSettings).values({
      defaultLanguage: "en",
      defaultTimezone: "UTC",
      defaultCurrency: "USD",
      environmentLabel: "production",
    });
    return await getGlobalSettings();
  }
  return existing;
}

/**
 * Update global settings
 */
export async function updateGlobalSettings(
  updates: {
    defaultLanguage?: string;
    environmentLabel?: "production" | "staging" | "test";
  },
  updatedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getGlobalSettings();
  if (!existing) {
    throw new Error("Global settings not initialized");
  }

  const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db
    .update(globalSettings)
    .set({
      ...updates,
      updatedBy,
      updatedAt: nowSql,
    })
    .where(eq(globalSettings.id, existing.id));

  return await getGlobalSettings();
}


// ============================================================================
// Audit Log Query Functions
// ============================================================================

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(params: {
  limit?: number;
  offset?: number;
  userId?: number;
  organizationId?: number;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const {
    limit = 50,
    offset = 0,
    userId,
    organizationId,
    action,
    entityType,
    startDate,
    endDate,
    search,
  } = params;

  let query = db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
      organizationId: auditLogs.organizationId,
      organizationName: organizations.name,
      operatingUnitId: auditLogs.operatingUnitId,
      operatingUnitName: operatingUnits.name,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(organizations, eq(auditLogs.organizationId, organizations.id))
    .leftJoin(operatingUnits, eq(auditLogs.operatingUnitId, operatingUnits.id));

  // Build WHERE conditions
  const conditions: any[] = [];
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (organizationId) conditions.push(eq(auditLogs.organizationId, organizationId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (startDate) conditions.push(sql`${auditLogs.createdAt} >= ${startDate}`);
  if (endDate) conditions.push(sql`${auditLogs.createdAt} <= ${endDate}`);
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(users.name, searchPattern),
        like(users.email, searchPattern)
      )!
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const logs = await query
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return logs;
}

/**
 * Get total count of audit logs (for pagination)
 */
export async function getAuditLogsCount(params: {
  userId?: number;
  organizationId?: number;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return 0;

  const {
    userId,
    organizationId,
    action,
    entityType,
    startDate,
    endDate,
    search,
  } = params;

  const conditions: any[] = [];
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (organizationId) conditions.push(eq(auditLogs.organizationId, organizationId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (startDate) conditions.push(sql`${auditLogs.createdAt} >= ${startDate}`);
  if (endDate) conditions.push(sql`${auditLogs.createdAt} <= ${endDate}`);

  // For search, we need to join users table
  let query;
  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(users.name, searchPattern),
        like(users.email, searchPattern)
      )!
    );
    query = db.select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));
  } else {
    query = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query;
  return result[0]?.count || 0;
}

/**
 * Get recent audit logs for dashboard/overview
 */
export async function getRecentAuditLogs(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
      organizationId: auditLogs.organizationId,
      organizationName: organizations.name,
      operatingUnitId: auditLogs.operatingUnitId,
      operatingUnitName: operatingUnits.name,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(organizations, eq(auditLogs.organizationId, organizations.id))
    .leftJoin(operatingUnits, eq(auditLogs.operatingUnitId, operatingUnits.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

// ============================================================================
// AUDIT LOG RETENTION POLICIES
// ============================================================================

/**
 * Delete audit logs older than the specified number of days
 * Returns the number of deleted records
 */
export async function deleteOldAuditLogs(retentionDays: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db
    .delete(auditLogs)
    .where(sql`${auditLogs.createdAt} < ${cutoffDate}`);

  return (result as any)[0]?.affectedRows || 0;
}

/**
 * Get audit log statistics for retention management
 * Returns counts by age brackets
 */
export async function getAuditLogRetentionStats() {
  const db = await getDb();
  if (!db) return { total: 0, last30Days: 0, last90Days: 0, last180Days: 0, olderThan180Days: 0, oldestLogDate: null };

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
  const [last30Result] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(sql`${auditLogs.createdAt} >= ${thirtyDaysAgo}`);
  const [last90Result] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(sql`${auditLogs.createdAt} >= ${ninetyDaysAgo}`);
  const [last180Result] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(sql`${auditLogs.createdAt} >= ${oneEightyDaysAgo}`);
  const [oldestResult] = await db.select({ oldest: sql<Date>`MIN(${auditLogs.createdAt})` }).from(auditLogs);

  const total = totalResult?.count || 0;
  const last30Days = last30Result?.count || 0;
  const last90Days = last90Result?.count || 0;
  const last180Days = last180Result?.count || 0;
  const olderThan180Days = total - last180Days;

  return {
    total,
    last30Days,
    last90Days,
    last180Days,
    olderThan180Days,
    oldestLogDate: oldestResult?.oldest || null,
  };
}

// ============================================================================
// OPERATING UNIT STATISTICS
// ============================================================================

/**
 * Get operating unit dashboard statistics
 * Returns active projects count, total employees, and budget allocation
 */
export async function getOperatingUnitStatistics(operatingUnitId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Import projects and userOperatingUnits tables
    const { projects } = await import("../drizzle/schema");
    const { userOperatingUnits } = await import("../drizzle/schema");
    const { sql, count, sum } = await import("drizzle-orm");

    // Get active projects count and budget allocation
    const projectStats = await db
      .select({
        activeProjects: count(),
        totalBudget: sum(projects.totalBudget),
        totalSpent: sum(projects.spent),
      })
      .from(projects)
      .where(
        and(
          eq(projects.operatingUnitId, operatingUnitId),
          eq(projects.status, "active"),
          isNull(projects.deletedAt)
        )
      );

    // Get total employees count
    const employeeStats = await db
      .select({
        totalEmployees: count(),
      })
      .from(userOperatingUnits)
      .where(eq(userOperatingUnits.operatingUnitId, operatingUnitId));

    const stats = projectStats[0] || {};
    const empStats = employeeStats[0] || {};

    const totalBudget = Number(stats.totalBudget || 0);
    const totalSpent = Number(stats.totalSpent || 0);
    const budgetExecution = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      activeProjects: stats.activeProjects || 0,
      totalEmployees: empStats.totalEmployees || 0,
      totalBudget,
      totalSpent,
      budgetExecution: Math.round(budgetExecution * 100) / 100, // Round to 2 decimal places
    };
  } catch (error) {
    console.error("[Database] Error fetching operating unit statistics:", error);
    return null;
  }
}

/**
 * Get compliance alerts for an operating unit
 * Returns overdue reports and budget variance warnings
 */
export async function getOperatingUnitComplianceAlerts(operatingUnitId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { projects } = await import("../drizzle/schema");
    const { sql } = await import("drizzle-orm");

    // Get projects with budget variance > 10%
    const budgetVarianceProjects = await db
      .select({
        id: projects.id,
        code: projects.projectCode,
        title: projects.title,
        totalBudget: projects.totalBudget,
        spent: projects.spent,
      })
      .from(projects)
      .where(
        and(
          eq(projects.operatingUnitId, operatingUnitId),
          eq(projects.status, "active"),
          isNull(projects.deletedAt)
        )
      );

    const alerts = [];

    // Check for budget variance
    for (const project of budgetVarianceProjects) {
      const budget = Number(project.totalBudget);
      const spent = Number(project.spent);
      const variance = budget > 0 ? Math.abs((spent - budget) / budget) * 100 : 0;

      if (variance > 10) {
        alerts.push({
          type: "budget_variance",
          priority: variance > 20 ? "high" : "medium",
          title: "Budget Revision Needed",
          description: `Project ${project.code} budget variance exceeds 10%`,
          projectId: project.id,
          projectCode: project.code,
          projectTitle: project.title,
          variance: Math.round(variance * 100) / 100,
          daysAgo: null,
        });
      }
    }

    // TODO: Add quarterly report overdue alerts when reporting system is implemented

    return alerts;
  } catch (error) {
    console.error("[Database] Error fetching compliance alerts:", error);
    return [];
  }
}


// ============================================================================
// EMAIL-BASED ORGANIZATION ASSIGNMENT LINKING
// ============================================================================

/**
 * Link organization assignments to the OAuth user by email.
 * 
 * This solves the issue where:
 * 1. Platform Admin creates an organization and assigns an admin by email
 * 2. A placeholder user is created with a wizard-generated openId
 * 3. When the actual user logs in via OAuth, they get a different openId
 * 4. This function links the organization assignments to the OAuth user
 * 
 * The function:
 * - Finds the OAuth user by openId
 * - Finds any placeholder users with the same email but different openId (wizard-created)
 * - Transfers all organization and operating unit assignments from placeholder to OAuth user
 * - Updates organization primaryAdminId/secondaryAdminId references
 * - Optionally cleans up the placeholder user
 */
export async function linkOrganizationAssignmentsByEmail(
  oauthOpenId: string,
  email: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot link org assignments: database not available");
    return;
  }

  try {
    // Get the OAuth user (the one who just logged in)
    const oauthUser = await db
      .select()
      .from(users)
      .where(eq(users.openId, oauthOpenId))
      .limit(1);

    if (!oauthUser.length) {
      console.warn(`[LinkOrg] OAuth user not found for openId: ${oauthOpenId}`);
      return;
    }

    const oauthUserId = oauthUser[0].id;

    // Find other users with the same email but different openId
    // These could be:
    // 1. Placeholder users created by the organization wizard (wizard-% or email_% openId)
    // 2. Users created from a previous OAuth login with a different provider
    // We transfer assignments from ALL duplicate users to consolidate on the current OAuth user
    const duplicateUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          sql`${users.openId} != ${oauthOpenId}`,
          sql`${users.id} != ${oauthUserId}`
        )
      );

    if (!duplicateUsers.length) {
      // No duplicate users to link - this is normal for new users
      return;
    }

    console.log(`[LinkOrg] Found ${duplicateUsers.length} duplicate user(s) for email: ${email}`);

    for (const duplicateUser of duplicateUsers) {
      const duplicateUserId = duplicateUser.id;

      // Transfer organization assignments from duplicate user to OAuth user
      await db
        .update(userOrganizations)
        .set({ userId: oauthUserId })
        .where(eq(userOrganizations.userId, duplicateUserId));

      // Transfer operating unit assignments from duplicate user to OAuth user
      await db
        .update(userOperatingUnits)
        .set({ userId: oauthUserId })
        .where(eq(userOperatingUnits.userId, duplicateUserId));

      // Update organization primaryAdminId references
      await db
        .update(organizations)
        .set({ primaryAdminId: oauthUserId })
        .where(eq(organizations.primaryAdminId, duplicateUserId));

      // Update organization secondaryAdminId references
      await db
        .update(organizations)
        .set({ secondaryAdminId: oauthUserId })
        .where(eq(organizations.secondaryAdminId, duplicateUserId));

      // Inherit the role from duplicate user if OAuth user has a lower role
      if (duplicateUser.role === 'platform_admin' && oauthUser[0].role !== 'platform_admin') {
        await db
          .update(users)
          .set({ role: 'platform_admin' })
          .where(eq(users.id, oauthUserId));
      }

      // Delete the duplicate user (it's no longer needed)
      await db.delete(users).where(eq(users.id, duplicateUserId));

      console.log(`[LinkOrg] Transferred assignments from duplicate user ${duplicateUserId} to OAuth user ${oauthUserId}`);
    }
  } catch (error) {
    console.error("[LinkOrg] Error linking organization assignments:", error);
    // Don't throw - this is a best-effort operation that shouldn't block login
  }
}


// ============================================================================
// INVITATION FUNCTIONS
// ============================================================================

/**
 * Generate a unique invitation token
 */
function generateInvitationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Create an invitation for an organization admin
 */
export async function createInvitation(data: {
  email: string;
  organizationId: number;
  role: 'org_admin' | 'program_manager' | 'finance_manager' | 'meal_officer' | 'case_worker' | 'viewer';
  invitedBy: number;
  expiresInDays?: number;
}): Promise<{ id: number; token: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const token = generateInvitationToken();
  const expiresAtDate = new Date();
expiresAtDate.setDate(expiresAtDate.getDate() + (data.expiresInDays || 7));

const expiresAt = expiresAtDate.toISOString().slice(0, 19).replace('T', ' ');

const result = await db.insert(invitations).values({
  email: data.email,
  organizationId: data.organizationId,
  role: data.role,
  token,
  status: "pending",
  expiresAt,
  invitedBy: data.invitedBy,
});
  
  const insertId = Number(result[0].insertId);
  return { id: insertId, token };
}

/**
 * Get invitation by token
 */
export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(invitations).where(eq(invitations.token, token));
  return result.length > 0 ? result[0] : null;
}

/**
 * Get pending invitations for an email
 */
export async function getPendingInvitationsByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(invitations)
    .where(and(
      eq(invitations.email, email),
      eq(invitations.status, 'pending')
    ));
  return result;
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(token: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const invitation = await getInvitationByToken(token);
  if (!invitation) return false;
  if (invitation.status !== 'pending') return false;
  if (new Date(invitation.expiresAt) < new Date()) {
    // Mark as expired
    await db.update(invitations)
      .set({ status: 'expired' })
      .where(eq(invitations.id, invitation.id));
    return false;
  }
  
  // Update invitation status
  const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.update(invitations)
    .set({
      status: 'accepted',
      acceptedAt: nowSql,
    })
    .where(eq(invitations.id, invitation.id));
  
  // Map invitation role to organization role
  const orgRole = invitation.role === 'org_admin' ? 'organization_admin' : 'user';
  
  // Assign user to organization
  await assignUserToOrganization(userId, invitation.organizationId, orgRole);
  
  return true;
}

/**
 * List invitations for an organization
 */
export async function listOrganizationInvitations(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(invitations)
    .where(eq(invitations.organizationId, organizationId))
    .orderBy(desc(invitations.createdAt));
  return result;
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.update(invitations)
    .set({ status: 'cancelled' })
    .where(and(
      eq(invitations.id, invitationId),
      eq(invitations.status, 'pending')
    ));
  
  return result[0].affectedRows > 0;
}

/**
 * Auto-accept pending invitations when user logs in
 * Called during OAuth login flow
 */
export async function autoAcceptInvitations(userId: number, email: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const pendingInvitations = await getPendingInvitationsByEmail(email);
  let acceptedCount = 0;
  
  for (const invitation of pendingInvitations) {
    // Check if not expired
    if (new Date(invitation.expiresAt) >= new Date()) {
      const success = await acceptInvitation(invitation.token, userId);
      if (success) acceptedCount++;
    }
  }
  
  return acceptedCount;
}


// ============================================================================
// QA Ceiling Enforcement for GRN Receiving
// ============================================================================

/**
 * Get QA line item details and approved ceiling
 */
export async function getQALineItemDetails(qaLineItemId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    quotationAnalysisLineItems,
    quotationAnalyses,
    purchaseRequestLineItems,
  } = await import("../drizzle/schema");

  const result = await db
    .select({
      qaLineItemId: quotationAnalysisLineItems.id,
      qaId: quotationAnalysisLineItems.quotationAnalysisId,
      description: purchaseRequestLineItems.description,
      approvedQuantity: purchaseRequestLineItems.quantity,
      unit: purchaseRequestLineItems.unit,
      qaStatus: quotationAnalyses.status,
    })
    .from(quotationAnalysisLineItems)
    .innerJoin(
      quotationAnalyses,
      eq(quotationAnalysisLineItems.quotationAnalysisId, quotationAnalyses.id)
    )
    .innerJoin(
      purchaseRequestLineItems,
      eq(quotationAnalysisLineItems.lineItemId, purchaseRequestLineItems.id)
    )
    .where(
      and(
        eq(quotationAnalysisLineItems.id, qaLineItemId),
        eq(quotationAnalyses.organizationId, organizationId)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Get total already ordered quantity across all POs for a QA line item
 */
export async function getAlreadyOrderedQuantity(
  qaLineItemId: number,
  organizationId: number,
  excludePoId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { purchaseOrderLineItems, purchaseOrders, quotationAnalysisLineItems } =
    await import("../drizzle/schema");

  const conditions = [
    eq(quotationAnalysisLineItems.id, qaLineItemId),
    eq(purchaseOrders.organizationId, organizationId),
    eq(purchaseOrders.status, "acknowledged"),
    isNull(purchaseOrders.deletedAt),
  ];

  if (excludePoId !== undefined) {
    conditions.push(ne(purchaseOrders.id, excludePoId));
  }

  const results = await db
    .select({
      totalOrdered: purchaseOrderLineItems.quantity,
    })
    .from(purchaseOrderLineItems)
    .innerJoin(purchaseOrders, eq(purchaseOrderLineItems.purchaseOrderId, purchaseOrders.id))
    .innerJoin(
      quotationAnalysisLineItems,
      eq(purchaseOrderLineItems.qaLineItemId, quotationAnalysisLineItems.id)
    )
    .where(and(...conditions));

  return results.reduce((sum, row) => sum + (parseFloat(String(row.totalOrdered)) || 0), 0);
}

/**
 * Get total already received quantity across all GRNs for a QA line item
 */
  export async function getAlreadyReceivedQuantity(qaLineItemId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    grnLineItems,
    goodsReceiptNotes,
    purchaseOrderLineItems,
    purchaseOrders,
    quotationAnalysisLineItems,
  } = await import("../drizzle/schema");

  const results = await db
    .select({
      receivedQty: grnLineItems.receivedQty,
    })
    .from(grnLineItems)
    .innerJoin(goodsReceiptNotes, eq(grnLineItems.grnId, goodsReceiptNotes.id))
    .innerJoin(purchaseOrders, eq(goodsReceiptNotes.purchaseOrderId, purchaseOrders.id))
    .innerJoin(purchaseOrderLineItems, eq(grnLineItems.poLineItemId, purchaseOrderLineItems.id))
    .innerJoin(
      quotationAnalysisLineItems,
      eq(purchaseOrderLineItems.qaLineItemId, quotationAnalysisLineItems.id)
    )
    .where(
      and(
        eq(quotationAnalysisLineItems.id, qaLineItemId),
        eq(purchaseOrders.organizationId, organizationId),
        or(
          eq(goodsReceiptNotes.status, "accepted"),
          eq(goodsReceiptNotes.status, "partially_accepted")
        ),
        isNull(goodsReceiptNotes.deletedAt)
      )
    );

  return results.reduce((sum, row) => sum + (parseFloat(String(row.receivedQty)) || 0), 0);
}

/**
 * Validate GRN receiving against QA ceiling
 */
export async function validateGRNReceivingAgainstQACeiling(
  qaLineItemId: number,
  receivingQuantity: number,
  organizationId: number
) {
  // Get QA line item details
  const qaLineItem = await getQALineItemDetails(qaLineItemId, organizationId);
  
  if (!qaLineItem) {
    throw new Error(`QA line item ${qaLineItemId} not found`);
  }

  const approvedQty = parseFloat(String(qaLineItem.approvedQuantity)) || 0;
  const alreadyOrdered = await getAlreadyOrderedQuantity(qaLineItemId, organizationId);
  const alreadyReceived = await getAlreadyReceivedQuantity(qaLineItemId, organizationId);
  
  const totalWillReceive = alreadyReceived + receivingQuantity;
  const remainingCeiling = approvedQty - alreadyOrdered;

  return {
    qaLineItemId,
    approvedQuantity: approvedQty,
    alreadyOrdered,
    alreadyReceived,
    receivingQuantity,
    totalWillReceive,
    remainingCeiling,
    isValid: totalWillReceive <= approvedQty,
    message: totalWillReceive > approvedQty 
      ? `Receiving ${receivingQuantity} units would exceed QA ceiling of ${approvedQty} units. Already received: ${alreadyReceived}, Already ordered: ${alreadyOrdered}`
      : `OK - Receiving ${receivingQuantity} units is within QA ceiling`,
  };
}

/**
 * Get QA ceiling summary for a line item
 */
export async function getQACeilingSummary(qaLineItemId: number, organizationId: number) {
  const qaLineItem = await getQALineItemDetails(qaLineItemId, organizationId);
  
  if (!qaLineItem) {
    return null;
  }

  const approvedQty = parseFloat(String(qaLineItem.approvedQuantity)) || 0;
  const alreadyOrdered = await getAlreadyOrderedQuantity(qaLineItemId, organizationId);
  const alreadyReceived = await getAlreadyReceivedQuantity(qaLineItemId, organizationId);
  const remaining = approvedQty - alreadyOrdered - alreadyReceived;

  return {
    qaLineItemId,
    description: qaLineItem.description,
    unit: qaLineItem.unit,
    approvedQuantity: approvedQty,
    alreadyOrdered,
    alreadyReceived,
    remaining: Math.max(0, remaining),
    percentageUsed: approvedQty > 0 ? ((alreadyOrdered + alreadyReceived) / approvedQty * 100).toFixed(2) : "0",
  };
}


// ============================================================================
// INVENTORY MANAGEMENT - GRN Integration
// ============================================================================

/**
 * Update inventory when GRN is accepted
 * Increases stock_items.currentQuantity for each accepted GRN line item
 * Creates stock_ledger entries for audit trail
 */
    export async function updateInventoryFromGRNAcceptance(
      grnId: number,
      organizationId: number,
      userId: number
    ): Promise<{ success: boolean; itemsUpdated: number }> {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const { grnLineItems, stockItems, stockBatches, stockLedger } = await import("../drizzle/schema");
        const { eq, and, isNull } = await import("drizzle-orm");

        const grnItems = await db
          .select()
          .from(grnLineItems)
          .where(eq(grnLineItems.grnId, grnId));

        let itemsUpdated = 0;

        for (const grnItem of grnItems) {
          const acceptedQty = parseFloat(String(grnItem.acceptedQty || "0"));
          if (acceptedQty <= 0) continue;

          const [stockItem] = await db
            .select()
            .from(stockItems)
            .where(
              and(
                eq(stockItems.organizationId, organizationId),
                isNull(stockItems.deletedAt)
              )
            )
            .limit(1);

          if (!stockItem) {
            console.warn(`[Inventory] No stock item found for GRN line ${grnItem.lineNumber}`);
            continue;
          }

          const [stockBatch] = await db
            .select()
            .from(stockBatches)
            .where(
              and(
                eq(stockBatches.organizationId, organizationId),
                eq(stockBatches.itemId, stockItem.id),
                eq(stockBatches.grnId, grnId),
                eq(stockBatches.grnLineItemId, grnItem.id)
              )
            )
            .limit(1);

          if (!stockBatch) {
            throw new Error(
              `Stock batch not found for GRN ${grnId}, GRN line ${grnItem.id}, stock item ${stockItem.id}`
            );
          }

          const currentQty = parseFloat(String(stockItem.currentQuantity || "0"));
          const newQty = currentQty + acceptedQty;
          const stockItemUnitCost = parseFloat(String(stockItem.unitCost || "0"));
          const ledgerUnitCost = parseFloat(String(stockBatch.unitCost || stockItem.unitCost || "0"));
          const ledgerTotalValue = acceptedQty * ledgerUnitCost;

          await db
            .update(stockItems)
            .set({
              currentQuantity: newQty.toString(),
              totalValue: (newQty * stockItemUnitCost).toString(),
            })
            .where(eq(stockItems.id, stockItem.id));

          await db.insert(stockLedger).values({
            organizationId,
            operatingUnitId: stockBatch.operatingUnitId ?? stockItem.operatingUnitId ?? null,
            movementType: "GRN_IN",
            referenceType: "GRN",
            referenceId: grnId,
            referenceNumber: null,
            warehouseId: stockBatch.warehouseId ?? null,
            warehouseName: stockBatch.warehouseName ?? null,
            batchId: stockBatch.id,
            itemId: stockItem.id,
            qtyChange: acceptedQty.toString(),
            unit: grnItem.unit || stockItem.unitType || "Piece",
            unitCost: ledgerUnitCost.toString(),
            totalValue: ledgerTotalValue.toString(),
            userId,
            notes: `GRN Line ${grnItem.lineNumber}: ${grnItem.description ?? stockItem.itemName}`,
          });

          itemsUpdated++;
        }

        return { success: true, itemsUpdated };
      } catch (error) {
        console.error("[Inventory] Error updating inventory from GRN:", error);
        throw error;
      }
      }

      /**
     * Auto-create Delivery Note when GRN is accepted
     * DN is an audit document that records what was delivered by the supplier
     * DN is immutable and cannot be edited or deleted
     */

      export async function createDeliveryNoteFromGRN(
      grnId: number,
      organizationId: number,
      userId: number
    ): Promise<{ success: boolean; dnNumber: string; dnId: number }> {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const {
          goodsReceiptNotes,
          grnLineItems,
          deliveryNotes,
          deliveryNoteLines
        } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        const [grn] = await db
          .select()
          .from(goodsReceiptNotes)
          .where(
            and(
              eq(goodsReceiptNotes.id, grnId),
              eq(goodsReceiptNotes.organizationId, organizationId)
            )
          );

        if (!grn) {
          throw new Error(`GRN not found: ${grnId}`);
        }

        if (!grn.operatingUnitId) {
          throw new Error(`GRN ${grnId} has no operatingUnitId`);
        }

        if (!grn.purchaseOrderId) {
          throw new Error(`GRN ${grnId} has no purchaseOrderId`);
        }

        // Check if DN already exists for this GRN
        const [existingDN] = await db
          .select()
          .from(deliveryNotes)
          .where(eq(deliveryNotes.grnId, grnId));

        if (existingDN) {
          return { success: true, dnNumber: existingDN.dnNumber, dnId: existingDN.id };
        }
        
        // Generate DN number (format: DN-PO-XXXX-YYYY-ZZZ)
        const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");
        const dnNumber = `DN-${grn.grnNumber?.split("-").slice(1, 3).join("-") || "AUTO"}-${Date.now().toString().slice(-6)}`;

        // Create Delivery Note header
        const dnInsertResult = await db
          .insert(deliveryNotes)
          .values({
            organizationId,
            operatingUnitId: grn.operatingUnitId,
            dnNumber,
            poId: grn.purchaseOrderId,
            grnId,
            vendorId: grn.supplierId,
            deliveryDate: nowSql,
            status: "delivered",
            createdBy: userId,
          })
          .$returningId();

        const dnId = dnInsertResult[0]?.id;

        if (!dnId) {
          throw new Error("Failed to create Delivery Note");
        }
    // Get GRN line items
        const grnItems = await db
          .select()
          .from(grnLineItems)
          .where(eq(grnLineItems.grnId, grnId));
    // Create DN line items (use received quantity as delivered quantity)
        let lineNumber = 1;
        for (const grnItem of grnItems) {
          const deliveredQty = parseFloat(String(grnItem.receivedQty || "0"));

          if (deliveredQty > 0 && grnItem.poLineItemId) {
            await db
              .insert(deliveryNoteLines)
              .values({
                dnId,
                poLineItemId: grnItem.poLineItemId,
                lineNumber,
                deliveredQty: deliveredQty.toString(),
                unit: grnItem.unit,
                remarks: grnItem.remarks,
              });

            lineNumber++;
          }
        }

        console.log(`[DN] Delivery Note created: ${dnNumber} (ID: ${dnId})`);
        return { success: true, dnNumber, dnId };
      } catch (error) {
        console.error("[DN] Error creating Delivery Note from GRN:", error);
        throw error;
      }
    }
      /**
       * Create Payable from GRN Acceptance
       * Auto-creates a payable record when GRN is accepted
       * Calculates amount from GRN line items (receivedQty × PO unitPrice)
       */
      export async function createPayableFromGRN(
      grnId: number,
      organizationId: number,
      userId: number
    ) {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const {
          goodsReceiptNotes,
          grnLineItems,
          purchaseOrderLineItems,
          purchaseOrders,
          vendors,
          procurementPayables
        } = await import("../drizzle/schema");
        const { eq, sql } = await import("drizzle-orm");

        const [grn] = await db
          .select()
          .from(goodsReceiptNotes)
          .where(eq(goodsReceiptNotes.id, grnId))
          .limit(1);

        if (!grn) {
          throw new Error(`GRN not found: ${grnId}`);
        }

        if (!grn.purchaseOrderId) {
          throw new Error(`GRN ${grnId} has no purchaseOrderId`);
        }

        if (!grn.supplierId) {
          throw new Error(`GRN ${grnId} has no supplierId`);
        }

        if (!grn.operatingUnitId) {
          throw new Error(`GRN ${grnId} has no operatingUnitId`);
        }

        const [po] = await db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, grn.purchaseOrderId))
          .limit(1);

        if (!po) {
          throw new Error(`PO not found for GRN: ${grnId}`);
        }

        if (!po.purchaseRequestId) {
          throw new Error(`PO ${po.id} has no purchaseRequestId`);
        }

        const [vendor] = await db
          .select()
          .from(vendors)
          .where(eq(vendors.id, grn.supplierId))
          .limit(1);

        if (!vendor) {
          throw new Error(`Vendor not found for GRN: ${grnId}`);
        }

        let totalAmount = 0;
        const grnItems = await db
          .select()
          .from(grnLineItems)
          .where(eq(grnLineItems.grnId, grnId));

        for (const grnItem of grnItems) {
          if (grnItem.poLineItemId) {
            const [poLine] = await db
              .select()
              .from(purchaseOrderLineItems)
              .where(eq(purchaseOrderLineItems.id, grnItem.poLineItemId))
              .limit(1);

            if (poLine) {
              const receivedQty = parseFloat(String(grnItem.receivedQty || "0"));
              const unitPrice = parseFloat(String(poLine.unitPrice || "0"));
              totalAmount += receivedQty * unitPrice;
            }
          }
        }

        const payableCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(procurementPayables)
          .where(eq(procurementPayables.organizationId, organizationId));

        const payableNumber = `PAY-${grn.grnNumber}-${(payableCount[0]?.count || 0) + 1}`;
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");

        const result = await db
          .insert(procurementPayables)
          .values({
            purchaseRequestId: po.purchaseRequestId,
            purchaseOrderId: po.id,
            grnId,
            vendorId: grn.supplierId,
            organizationId,
            operatingUnitId: grn.operatingUnitId,
            payableNumber,
            payableDate: nowSql,
            totalAmount: totalAmount.toString(),
            currency: "USD",
            exchangeRate: "1.000000",
            baseCurrencyAmount: totalAmount.toString(),
            status: "pending_invoice",
            paidAmount: "0",
            remainingAmount: totalAmount.toString(),
            dueDate,
            createdBy: userId,
          })
          .$returningId();

        const payableId = result[0]?.id;

        if (!payableId) {
          throw new Error("Failed to create payable");
        }

        console.log(
          `[Payable] Created from GRN: ${payableNumber} (ID: ${payableId}, Amount: $${totalAmount.toFixed(2)})`
        );

        return { success: true, payableNumber, payableId, totalAmount };
      } catch (error) {
        console.error("[Payable] Error creating payable from GRN:", error);
        throw error;
      }
    }


// Update a user record with arbitrary fields (used for soft-delete metadata, etc.)
export async function updateUser(
  userId: number,
  data: {
    deletionReason?: string | null;
    deletedAt?: string | null;
    deletedBy?: number | null;
    isDeleted?: number;
    name?: string;
    email?: string;
    role?: string;
    languagePreference?: string;
    organizationId?: number | null;
    currentOrganizationId?: number | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const updateData: Record<string, unknown> = {};
    if (data.deletionReason !== undefined) updateData.deletionReason = data.deletionReason;
    if (data.deletedAt !== undefined) updateData.deletedAt = data.deletedAt;
    if (data.deletedBy !== undefined) updateData.deletedBy = data.deletedBy;
    if (data.isDeleted !== undefined) updateData.isDeleted = data.isDeleted;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.languagePreference !== undefined) updateData.languagePreference = data.languagePreference;
    if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;
    if (data.currentOrganizationId !== undefined) updateData.currentOrganizationId = data.currentOrganizationId;

    if (Object.keys(updateData).length === 0) return; // nothing to update

    await db.update(users).set(updateData as any).where(eq(users.id, userId));
  } catch (error) {
    console.error("[updateUser] Error updating user:", {
      userId,
      data,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}


// ============================================================================
// RESTORE DELETED RECORDS
// ============================================================================

export async function restoreDeletedRecord(params: {
  entityType: string;
  entityId: number;
  organizationId: number | null;
  operatingUnitId: number | null;
  restoredBy: number;
}): Promise<{ success: boolean; message?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const { entityType, entityId, organizationId, operatingUnitId, restoredBy } = params;
    const now = new Date().toISOString();

    switch (entityType.toLowerCase()) {
      case 'user':
      case 'users':
        // Restore user: set isDeleted=0, deletedAt=NULL
        const userResult = await db
          .update(users)
          .set({
            isDeleted: 0,
            deletedAt: null,
            deletedBy: null,
          })
          .where(eq(users.id, entityId));
        
        if (!userResult) {
          return { success: false, message: 'User not found' };
        }
        return { success: true };

      case 'organization':
      case 'organizations':
        // Restore organization: set isDeleted=0, deletedAt=NULL
        const orgResult = await db
          .update(organizations)
          .set({
            isDeleted: 0,
            deletedAt: null,
            deletedBy: null,
          })
          .where(eq(organizations.id, entityId));
        
        if (!orgResult) {
          return { success: false, message: 'Organization not found' };
        }
        return { success: true };

      case 'operatingunit':
      case 'operating_unit':
      case 'operatingunits':
      case 'operating_units':
        // Restore operating unit: set isDeleted=0, deletedAt=NULL
        const ouResult = await db
          .update(operatingUnits)
          .set({
            isDeleted: 0,
            deletedAt: null,
            deletedBy: null,
          })
          .where(eq(operatingUnits.id, entityId));
        
        if (!ouResult) {
          return { success: false, message: 'Operating unit not found' };
        }
        return { success: true };

      default:
        return { success: false, message: `Unsupported entity type: ${entityType}` };
    }
  } catch (error) {
    console.error("[restoreDeletedRecord] Error restoring record:", {
      params,
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// DELETED RECORDS - COMPREHENSIVE QUERY HELPERS
// ============================================================================

/**
 * Deleted record shape returned to frontend
 */
export interface DeletedRecordItem {
  id: string; // composite key: entityType_entityId
  entityId: number;
  recordType: string;
  recordName: string;
  organizationName: string | null;
  module: string;
  deletedByName: string | null;
  deletedAt: string;
  deletionReason: string | null;
  canRestore: boolean;
  canPermanentDelete: boolean;
}

/**
 * Get all platform-level deleted records (organizations, operating units, platform users)
 */
export async function getPlatformDeletedRecords(): Promise<DeletedRecordItem[]> {
  const db = await getDb();

  const results: DeletedRecordItem[] = [];

  // Deleted organizations
  const deletedOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      deletedBy: organizations.deletedBy,
      deletedAt: organizations.deletedAt,
    })
    .from(organizations)
    .where(isNotNull(organizations.deletedAt));

  for (const org of deletedOrgs) {
    let deletedByName: string | null = null;
    if (org.deletedBy) {
      const deleter = await db.select({ name: users.name }).from(users).where(eq(users.id, org.deletedBy)).limit(1);
      deletedByName = deleter[0]?.name ?? null;
    }
    results.push({
      id: `organization_${org.id}`,
      entityId: org.id,
      recordType: 'Organization',
      recordName: org.name ?? `Organization #${org.id}`,
      organizationName: null,
      module: 'Platform',
      deletedByName,
      deletedAt: org.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Deleted operating units
  const deletedOUs = await db
    .select({
      id: operatingUnits.id,
      name: operatingUnits.name,
      organizationId: operatingUnits.organizationId,
      deletedBy: operatingUnits.deletedBy,
      deletedAt: operatingUnits.deletedAt,
    })
    .from(operatingUnits)
    .where(isNotNull(operatingUnits.deletedAt));

  for (const ou of deletedOUs) {
    let deletedByName: string | null = null;
    if (ou.deletedBy) {
      const deleter = await db.select({ name: users.name }).from(users).where(eq(users.id, ou.deletedBy)).limit(1);
      deletedByName = deleter[0]?.name ?? null;
    }
    let orgName: string | null = null;
    if (ou.organizationId) {
      const org = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, ou.organizationId)).limit(1);
      orgName = org[0]?.name ?? null;
    }
    results.push({
      id: `operating_unit_${ou.id}`,
      entityId: ou.id,
      recordType: 'Operating Unit',
      recordName: ou.name ?? `Operating Unit #${ou.id}`,
      organizationName: orgName,
      module: 'Platform',
      deletedByName,
      deletedAt: ou.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Deleted platform users (platform_admin, platform_super_admin, platform_auditor)
  const deletedPlatformUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      deletedBy: users.deletedBy,
      deletedAt: users.deletedAt,
      deletionReason: users.deletionReason,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.deletedAt),
        or(
          eq(users.role, 'platform_super_admin'),
          eq(users.role, 'platform_admin'),
          eq(users.role, 'platform_auditor')
        )
      )
    );

  for (const user of deletedPlatformUsers) {
    let deletedByName: string | null = null;
    if (user.deletedBy) {
      const deleter = await db.select({ name: users.name }).from(users).where(eq(users.id, user.deletedBy)).limit(1);
      deletedByName = deleter[0]?.name ?? null;
    }
    results.push({
      id: `user_${user.id}`,
      entityId: user.id,
      recordType: 'User',
      recordName: user.name ?? user.email ?? `User #${user.id}`,
      organizationName: null,
      module: 'Platform',
      deletedByName,
      deletedAt: user.deletedAt!,
      deletionReason: user.deletionReason ?? null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Sort by deletedAt descending
  results.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  return results;
}

/**
 * Get organization-level deleted records (projects, grants, beneficiaries, contracts, etc.)
 */
export async function getOrgDeletedRecords(organizationId: number, operatingUnitId?: number | null): Promise<DeletedRecordItem[]> {
  const db = await getDb();

  const results: DeletedRecordItem[] = [];

  // Helper to get deleter name
  const getDeleterName = async (deletedBy: number | null): Promise<string | null> => {
    if (!deletedBy) return null;
    const deleter = await db.select({ name: users.name }).from(users).where(eq(users.id, deletedBy)).limit(1);
    return deleter[0]?.name ?? null;
  };

  // Get org name once
  const orgRow = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const orgName = orgRow[0]?.name ?? null;

  // Build org scope filter
  const orgFilter = operatingUnitId
    ? and(eq(projects.organizationId, organizationId), eq(projects.operatingUnitId, operatingUnitId), isNotNull(projects.deletedAt))
    : and(eq(projects.organizationId, organizationId), isNotNull(projects.deletedAt));

  // Deleted projects
  const deletedProjects = await db
    .select({
      id: projects.id,
      title: projects.title,
      deletedBy: projects.deletedBy,
      deletedAt: projects.deletedAt,
    })
    .from(projects)
    .where(orgFilter);

  for (const p of deletedProjects) {
    results.push({
      id: `project_${p.id}`,
      entityId: p.id,
      recordType: 'Project',
      recordName: p.title ?? `Project #${p.id}`,
      organizationName: orgName,
      module: 'Projects',
      deletedByName: await getDeleterName(p.deletedBy ?? null),
      deletedAt: p.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Deleted grants
  const grantsOrgFilter = operatingUnitId
    ? and(eq(grants.organizationId, organizationId), eq(grants.operatingUnitId, operatingUnitId), isNotNull(grants.deletedAt))
    : and(eq(grants.organizationId, organizationId), isNotNull(grants.deletedAt));

  const deletedGrants = await db
    .select({
      id: grants.id,
      title: grants.title,
      grantName: grants.grantName,
      deletedBy: grants.deletedBy,
      deletedAt: grants.deletedAt,
    })
    .from(grants)
    .where(grantsOrgFilter);

  for (const g of deletedGrants) {
    results.push({
      id: `grant_${g.id}`,
      entityId: g.id,
      recordType: 'Grant',
      recordName: g.title ?? g.grantName ?? `Grant #${g.id}`,
      organizationName: orgName,
      module: 'Grants',
      deletedByName: await getDeleterName(g.deletedBy ?? null),
      deletedAt: g.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Deleted beneficiaries
  const benefOrgFilter = operatingUnitId
    ? and(eq(beneficiaries.organizationId, organizationId), eq(beneficiaries.operatingUnitId, operatingUnitId), isNotNull(beneficiaries.deletedAt))
    : and(eq(beneficiaries.organizationId, organizationId), isNotNull(beneficiaries.deletedAt));

  const deletedBeneficiaries = await db
    .select({
      id: beneficiaries.id,
      fullName: beneficiaries.fullName,
      deletedBy: beneficiaries.deletedBy,
      deletedAt: beneficiaries.deletedAt,
    })
    .from(beneficiaries)
    .where(benefOrgFilter);

  for (const b of deletedBeneficiaries) {
    results.push({
      id: `beneficiary_${b.id}`,
      entityId: b.id,
      recordType: 'Beneficiary',
      recordName: b.fullName ?? `Beneficiary #${b.id}`,
      organizationName: orgName,
      module: 'Beneficiaries',
      deletedByName: await getDeleterName(b.deletedBy ?? null),
      deletedAt: b.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Deleted contracts
  const contractsOrgFilter = operatingUnitId
    ? and(eq(contracts.organizationId, organizationId), eq(contracts.operatingUnitId, operatingUnitId), isNotNull(contracts.deletedAt))
    : and(eq(contracts.organizationId, organizationId), isNotNull(contracts.deletedAt));

  const deletedContracts = await db
    .select({
      id: contracts.id,
      contractNumber: contracts.contractNumber as typeof contracts.contractNumber,
      deletedBy: contracts.deletedBy,
      deletedAt: contracts.deletedAt,
    })
    .from(contracts)
    .where(contractsOrgFilter);

  for (const c of deletedContracts) {
    results.push({
      id: `contract_${c.id}`,
      entityId: c.id,
      recordType: 'Contract',
      recordName: (c.contractNumber as string | null) ?? `Contract #${c.id}`,
      organizationName: orgName,
      module: 'Contracts',
      deletedByName: await getDeleterName(c.deletedBy ?? null),
      deletedAt: c.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Deleted purchase requests
  const prOrgFilter = operatingUnitId
    ? and(eq(purchaseRequests.organizationId, organizationId), eq(purchaseRequests.operatingUnitId, operatingUnitId), isNotNull(purchaseRequests.deletedAt))
    : and(eq(purchaseRequests.organizationId, organizationId), isNotNull(purchaseRequests.deletedAt));

  const deletedPRs = await db
    .select({
      id: purchaseRequests.id,
      prNumber: purchaseRequests.prNumber,
      projectTitle: purchaseRequests.projectTitle,
      deletedBy: purchaseRequests.deletedBy,
      deletedAt: purchaseRequests.deletedAt,
    })
    .from(purchaseRequests)
    .where(prOrgFilter);

  for (const pr of deletedPRs) {
    results.push({
      id: `purchase_request_${pr.id}`,
      entityId: pr.id,
      recordType: 'Purchase Request',
      recordName: pr.prNumber ?? pr.projectTitle ?? `PR #${pr.id}`,
      organizationName: orgName,
      module: 'Procurement',
      deletedByName: await getDeleterName(pr.deletedBy ?? null),
      deletedAt: pr.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Deleted activities
  const activitiesOrgFilter = operatingUnitId
    ? and(eq(activities.organizationId, organizationId), eq(activities.operatingUnitId, operatingUnitId), isNotNull(activities.deletedAt))
    : and(eq(activities.organizationId, organizationId), isNotNull(activities.deletedAt));
  const deletedActivities = await db
    .select({
      id: activities.id,
      activityName: activities.activityName,
      deletedBy: activities.deletedBy,
      deletedAt: activities.deletedAt,
    })
    .from(activities)
    .where(activitiesOrgFilter);
  for (const a of deletedActivities) {
    results.push({
      id: `activity_${a.id}`,
      entityId: a.id,
      recordType: 'Activity',
      recordName: a.activityName ?? `Activity #${a.id}`,
      organizationName: orgName,
      module: 'Activities',
      deletedByName: await getDeleterName(a.deletedBy ?? null),
      deletedAt: a.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }
  // Deleted proposals
  const proposalsOrgFilter = operatingUnitId
    ? and(eq(proposals.organizationId, organizationId), eq(proposals.operatingUnitId, operatingUnitId), isNotNull(proposals.deletedAt))
    : and(eq(proposals.organizationId, organizationId), isNotNull(proposals.deletedAt));
  const deletedProposals = await db
    .select({
      id: proposals.id,
      proposalTitle: proposals.proposalTitle,
      deletedBy: proposals.deletedBy,
      deletedAt: proposals.deletedAt,
    })
    .from(proposals)
    .where(proposalsOrgFilter);
  for (const pr of deletedProposals) {
    results.push({
      id: `proposal_${pr.id}`,
      entityId: pr.id,
      recordType: 'Proposal',
      recordName: pr.proposalTitle ?? `Proposal #${pr.id}`,
      organizationName: orgName,
      module: 'Proposals',
      deletedByName: await getDeleterName(pr.deletedBy ?? null),
      deletedAt: pr.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }
  // Deleted org-level users
  const orgUsersFilter = and(
    isNotNull(users.deletedAt),
    or(
      eq(users.role, 'organization_admin'),
      eq(users.role, 'user'),
      eq(users.role, 'manager')
    )
  );

  // Get users that belong to this organization via userOrganizations
  const orgUserIds = await db
    .select({ userId: userOrganizations.userId })
    .from(userOrganizations)
    .where(eq(userOrganizations.organizationId, organizationId));

  const orgUserIdList = orgUserIds.map(u => u.userId);

  if (orgUserIdList.length > 0) {
    const deletedOrgUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        deletedBy: users.deletedBy,
        deletedAt: users.deletedAt,
        deletionReason: users.deletionReason,
      })
      .from(users)
      .where(
        and(
          isNotNull(users.deletedAt),
          sql`${users.id} IN (${sql.join(orgUserIdList.map(id => sql`${id}`), sql`, `)})`
        )
      );

    for (const u of deletedOrgUsers) {
      results.push({
        id: `user_${u.id}`,
        entityId: u.id,
        recordType: 'User',
        recordName: u.name ?? u.email ?? `User #${u.id}`,
        organizationName: orgName,
        module: 'Users',
        deletedByName: await getDeleterName(u.deletedBy ?? null),
        deletedAt: u.deletedAt!,
        deletionReason: u.deletionReason ?? null,
        canRestore: true,
        canPermanentDelete: true,
      });
    }
  }

  // Deleted opportunities
  const oppsOrgFilter = operatingUnitId
    ? and(eq(opportunities.organizationId, organizationId), eq(opportunities.operatingUnitId, operatingUnitId), isNotNull(opportunities.deletedAt))
    : and(eq(opportunities.organizationId, organizationId), isNotNull(opportunities.deletedAt));

  const deletedOpps = await db
    .select({
      id: opportunities.id,
      donorName: opportunities.donorName,
      deletedBy: opportunities.deletedBy,
      deletedAt: opportunities.deletedAt,
    })
    .from(opportunities)
    .where(oppsOrgFilter);

  for (const o of deletedOpps) {
    results.push({
      id: `opportunity_${o.id}`,
      entityId: o.id,
      recordType: 'Opportunity',
      recordName: o.donorName ?? `Opportunity #${o.id}`,
      organizationName: orgName,
      module: 'Opportunities',
      deletedByName: await getDeleterName(o.deletedBy ?? null),
      deletedAt: o.deletedAt!,
      deletionReason: null,
      canRestore: true,
      canPermanentDelete: true,
    });
  }

  // Sort by deletedAt descending
  results.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  return results;
}
/**
 * Permanently hard-delete a record by entity type and IDD
 * Only works on soft-deleted records (deletedAt must be set)
 */
export async function hardDeleteRecord(entityType: string, entityId: number): Promise<{ success: boolean; message?: string }> {
  const db = await getDb();

  const type = entityType.toLowerCase().replace(/\s+/g, '_');

  try {
    switch (type) {
      case 'organization':
      case 'organizations':
        await db.delete(organizations).where(and(eq(organizations.id, entityId), isNotNull(organizations.deletedAt)));
        return { success: true };
      case 'operating_unit':
      case 'operating_units':
      case 'operatingunit':
      case 'operatingunits':
        await db.delete(operatingUnits).where(and(eq(operatingUnits.id, entityId), isNotNull(operatingUnits.deletedAt)));
        return { success: true };
      case 'user':
      case 'users':
        await db.delete(users).where(and(eq(users.id, entityId), isNotNull(users.deletedAt)));
        return { success: true };
      case 'project':
      case 'projects':
        await db.delete(projects).where(and(eq(projects.id, entityId), isNotNull(projects.deletedAt)));
        return { success: true };
      case 'grant':
      case 'grants':
        await db.delete(grants).where(and(eq(grants.id, entityId), isNotNull(grants.deletedAt)));
        return { success: true };
      case 'beneficiary':
      case 'beneficiaries':
        await db.delete(beneficiaries).where(and(eq(beneficiaries.id, entityId), isNotNull(beneficiaries.deletedAt)));
        return { success: true };
      case 'contract':
      case 'contracts':
        await db.delete(contracts).where(and(eq(contracts.id, entityId), isNotNull(contracts.deletedAt)));
        return { success: true };
      case 'purchase_request':
      case 'purchase_requests':
      case 'purchaserequest':
      case 'purchaserequests':
        await db.delete(purchaseRequests).where(and(eq(purchaseRequests.id, entityId), isNotNull(purchaseRequests.deletedAt)));
        return { success: true };
      case 'activity':
      case 'activities':
        await db.delete(activities).where(and(eq(activities.id, entityId), isNotNull(activities.deletedAt)));
        return { success: true };
      case 'proposal':
      case 'proposals':
        await db.delete(proposals).where(and(eq(proposals.id, entityId), isNotNull(proposals.deletedAt)));
        return { success: true };
      case 'opportunity':
      case 'opportunities':
        await db.delete(opportunities).where(and(eq(opportunities.id, entityId), isNotNull(opportunities.deletedAt)));
        return { success: true };
      default:
        return { success: false, message: `Unsupported entity type for permanent deletion: ${entityType}` };
    }
  } catch (error) {
    console.error("[hardDeleteRecord] Error:", { entityType, entityId, error });
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Restore a soft-deleted record for org-level entities (projects, grants, etc.)
 */
export async function restoreOrgRecord(entityType: string, entityId: number): Promise<{ success: boolean; message?: string }> {
  const db = await getDb();

  const type = entityType.toLowerCase().replace(/\s+/g, '_');

  try {
    switch (type) {
      case 'project':
      case 'projects':
        await db.update(projects).set({ isDeleted: 0, deletedAt: null, deletedBy: null }).where(eq(projects.id, entityId));
        return { success: true };
      case 'grant':
      case 'grants':
        await db.update(grants).set({ isDeleted: 0, deletedAt: null, deletedBy: null }).where(eq(grants.id, entityId));
        return { success: true };
      case 'beneficiary':
      case 'beneficiaries':
        await db.update(beneficiaries).set({ isDeleted: 0, deletedAt: null, deletedBy: null }).where(eq(beneficiaries.id, entityId));
        return { success: true };
      case 'contract':
      case 'contracts':
        await db.update(contracts).set({ isDeleted: 0, deletedAt: null, deletedBy: null }).where(eq(contracts.id, entityId));
        return { success: true };
      case 'purchase_request':
      case 'purchase_requests':
      case 'purchaserequest':
      case 'purchaserequests':
        await db.update(purchaseRequests).set({ isDeleted: 0, deletedAt: null, deletedBy: null }).where(eq(purchaseRequests.id, entityId));
        return { success: true };
      case 'activity':
      case 'activities':
        await db.update(activities).set({ isDeleted: 0, deletedAt: null, deletedBy: null }).where(eq(activities.id, entityId));
        return { success: true };
      case 'proposal':
      case 'proposals':
        await db.update(proposals).set({ isDeleted: 0, deletedAt: null, deletedBy: null }).where(eq(proposals.id, entityId));
        return { success: true };
      case 'opportunity':
      case 'opportunities':
        await db.update(opportunities).set({ isDeleted: 0, deletedAt: null, deletedBy: null }).where(eq(opportunities.id, entityId));
        return { success: true };
      default:
        // Fall through to restoreDeletedRecord for platform entities (users, orgs, OUs)
        return { success: false, message: `Use restoreDeletedRecord for platform entities. Unsupported type: ${entityType}` };
    }
  } catch (error) {
    console.error("[restoreOrgRecord] Error:", { entityType, entityId, error });
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}