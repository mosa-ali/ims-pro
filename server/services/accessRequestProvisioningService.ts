import { getDb } from '../db';
import { users, userOrganizations, userOperatingUnits, requestAccessRequests } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import bcryptjs from 'bcryptjs';
import { nanoid } from 'nanoid';

/**
 * Provision Organization User - Microsoft Entra
 * Creates IMS user profile and maps to organization without local password
 */
export async function provisionOrganizationMicrosoftUser(input: {
  requestId: string;
  email: string;
  fullName: string;
  organizationId: number;
  operatingUnitId?: number;
  requestedRole: string;
  userId?: number; // If user already exists
}): Promise<{ userId: number; success: boolean }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

  let userId = input.userId;

  // If user doesn't exist, create IMS user profile (no local password)
  if (!userId) {
    const result = await db.insert(users).values({
      email: input.email,
      name: input.fullName,
      role: 'user',
      authenticationProvider: 'microsoft', // Entra-backed
      emailVerified: true, // Assume verified via Entra
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = result.insertId;
  }

  // Assign to organization
  await db.insert(userOrganizations).values({
    userId: userId,
    organizationId: input.organizationId,
    role: input.requestedRole || 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Assign to operating unit if provided
  if (input.operatingUnitId) {
    await db.insert(userOperatingUnits).values({
      userId: userId,
      operatingUnitId: input.operatingUnitId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Mark request as provisioned
  await db
    .update(requestAccessRequests)
    .set({
      status: 'provisioned',
      provisionedUserId: userId,
      provisionedAt: new Date(),
      provisioningMode: 'microsoft_mapping_only',
    })
    .where(eq(requestAccessRequests.id, input.requestId));

  return { userId, success: true };
}

/**
 * Provision Organization User - Local IMS Account
 * Creates local password and sends temporary credentials
 * Only use if explicitly approved by organization
 */
export async function provisionOrganizationLocalUser(input: {
  requestId: string;
  email: string;
  fullName: string;
  organizationId: number;
  operatingUnitId?: number;
  requestedRole: string;
  userId?: number;
}): Promise<{ userId: number; tempPassword: string; success: boolean }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

  let userId = input.userId;
  const tempPassword = nanoid(12); // Generate temporary password
  const passwordHash = await bcryptjs.hash(tempPassword, 10);

  // If user doesn't exist, create IMS user with local password
  if (!userId) {
    const result = await db.insert(users).values({
      email: input.email,
      name: input.fullName,
      role: 'user',
      authenticationProvider: 'email', // Local auth
      passwordHash: passwordHash,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = result.insertId;
  } else {
    // Update existing user with password hash
    await db
      .update(users)
      .set({
        passwordHash: passwordHash,
        authenticationProvider: 'email',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Assign to organization
  await db.insert(userOrganizations).values({
    userId: userId,
    organizationId: input.organizationId,
    role: input.requestedRole || 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Assign to operating unit if provided
  if (input.operatingUnitId) {
    await db.insert(userOperatingUnits).values({
      userId: userId,
      operatingUnitId: input.operatingUnitId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Mark request as provisioned
  await db
    .update(requestAccessRequests)
    .set({
      status: 'provisioned',
      provisionedUserId: userId,
      provisionedAt: new Date(),
      provisioningMode: 'local_account_created',
    })
    .where(eq(requestAccessRequests.id, input.requestId));

  return { userId, tempPassword, success: true };
}

/**
 * Provision Platform Admin - Local Public Domain Account
 * Creates local password for platform-level admin using public domain (Gmail, Outlook, etc.)
 * Allowed because platform admins are not bound by organization identity rules
 */
export async function provisionPlatformLocalAdmin(input: {
  requestId: string;
  email: string;
  fullName: string;
  requestedRole: string;
  userId?: number;
}): Promise<{ userId: number; tempPassword: string; success: boolean }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

  let userId = input.userId;
  const tempPassword = nanoid(12); // Generate temporary password
  const passwordHash = await bcryptjs.hash(tempPassword, 10);

  // Create or update platform admin user with local password
  if (!userId) {
    const result = await db.insert(users).values({
      email: input.email,
      name: input.fullName,
      role: input.requestedRole || 'platform_admin',
      authenticationProvider: 'email', // Local auth
      passwordHash: passwordHash,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = result.insertId;
  } else {
    // Update existing user with platform admin role and local password
    await db
      .update(users)
      .set({
        role: input.requestedRole || 'platform_admin',
        passwordHash: passwordHash,
        authenticationProvider: 'email',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Mark request as provisioned
  await db
    .update(requestAccessRequests)
    .set({
      status: 'provisioned',
      provisionedUserId: userId,
      provisionedAt: new Date(),
      provisioningMode: 'local_account_created',
    })
    .where(eq(requestAccessRequests.id, input.requestId));

  return { userId, tempPassword, success: true };
}

/**
 * Provision Platform Admin - Microsoft Entra
 * Maps platform admin to Entra-backed identity without local password
 * Identity remains managed in Microsoft Entra
 */
export async function provisionPlatformMicrosoftAdmin(input: {
  requestId: string;
  email: string;
  fullName: string;
  requestedRole: string;
  userId?: number;
}): Promise<{ userId: number; success: boolean }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

  let userId = input.userId;

  // Create or update platform admin user with Entra authentication
  if (!userId) {
    const result = await db.insert(users).values({
      email: input.email,
      name: input.fullName,
      role: input.requestedRole || 'platform_admin',
      authenticationProvider: 'microsoft', // Entra-backed
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = result.insertId;
  } else {
    // Update existing user with platform admin role and Entra auth
    await db
      .update(users)
      .set({
        role: input.requestedRole || 'platform_admin',
        authenticationProvider: 'microsoft',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Mark request as provisioned
  await db
    .update(requestAccessRequests)
    .set({
      status: 'provisioned',
      provisionedUserId: userId,
      provisionedAt: new Date(),
      provisioningMode: 'microsoft_mapping_only',
    })
    .where(eq(requestAccessRequests.id, input.requestId));

  return { userId, success: true };
}

/**
 * Helper: Assign organization membership
 */
export async function assignOrganizationMembership(input: {
  userId: number;
  organizationId: number;
  role: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

  await db.insert(userOrganizations).values({
    userId: input.userId,
    organizationId: input.organizationId,
    role: input.role,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Helper: Assign operating unit
 */
export async function assignOperatingUnit(input: {
  userId: number;
  operatingUnitId: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Service unavailable' });

  await db.insert(userOperatingUnits).values({
    userId: input.userId,
    operatingUnitId: input.operatingUnitId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
