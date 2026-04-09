/**
 * ============================================================================
 * Microsoft User Provisioning Service
 * ============================================================================
 * 
 * Handles automatic user creation and mapping for Microsoft Entra ID authentication.
 * Implements:
 * - First-time user provisioning
 * - Existing user mapping
 * - Organization context assignment
 * - Authentication provider tracking
 * 
 * ============================================================================
 */

import { getDb } from "../../db";
import { users, userOrganizations, userOperatingUnits } from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export interface MicrosoftUserInfo {
  id: string; // Azure Object ID
  email: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  officeLocation?: string;
}

export interface ProvisioningResult {
  userId: number;
  isNewUser: boolean;
  email: string;
  displayName: string;
  organizationId?: number;
  operatingUnitId?: number;
}

class UserProvisioningService {
  /**
   * Provision or retrieve user from Microsoft authentication
   * 
   * Flow:
   * 1. Check if user exists by Microsoft ID
   * 2. If not, check by email
   * 3. If not found, create new user
   * 4. Assign to organization if provided
   * 5. Return user with context
   */
  async provisionMicrosoftUser(
    microsoftUserInfo: MicrosoftUserInfo,
    organizationId?: number,
    operatingUnitId?: number
  ): Promise<ProvisioningResult> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    try {
      // 1. Check if user exists by Microsoft Object ID
      let existingUser = await db.query.users.findFirst({
        where: eq(users.microsoftObjectId, microsoftUserInfo.id),
      });

      // If not found by Microsoft ID, check by email with Microsoft provider
      if (!existingUser) {
        existingUser = await db.query.users.findFirst({
          where: and(
            eq(users.email, microsoftUserInfo.email),
            eq(users.authenticationProvider, "microsoft")
          ),
        });
      }

      let isNewUser = false;

      // 2. If not found by Microsoft provider, check by email only (for migration scenarios)
      if (!existingUser) {
        existingUser = await db.query.users.findFirst({
          where: eq(users.email, microsoftUserInfo.email),
        });
      }

      // 3. If still not found, create new user
      if (!existingUser) {
        const [newUser] = await db
          .insert(users)
          .values({
            email: microsoftUserInfo.email,
            name: microsoftUserInfo.displayName,
            authenticationProvider: "microsoft",
            microsoftObjectId: microsoftUserInfo.id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        existingUser = newUser;
        isNewUser = true;
      } else {
        // Update existing user with Microsoft info if not already set
        if (!existingUser.microsoftObjectId) {
          await db
            .update(users)
            .set({
              microsoftObjectId: microsoftUserInfo.id,
              authenticationProvider: "microsoft",
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id));
        }
      }

      // 4. Assign to organization if provided
      let assignedOrganizationId = organizationId;
      let assignedOperatingUnitId = operatingUnitId;

      if (organizationId) {
        // Check if user already has organization assignment
        const existingOrgAssignment = await db.query.userOrganizations.findFirst({
          where: and(
            eq(userOrganizations.userId, existingUser.id),
            eq(userOrganizations.organizationId, organizationId)
          ),
        });

        if (!existingOrgAssignment) {
          await db.insert(userOrganizations).values({
            userId: existingUser.id,
            organizationId,
            platformRole: "user",
            orgRoles: JSON.stringify(["member"]),
            permissions: JSON.stringify({}),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      if (operatingUnitId) {
        // Check if user already has operating unit assignment
        const existingOUAssignment = await db.query.userOperatingUnits.findFirst({
          where: and(
            eq(userOperatingUnits.userId, existingUser.id),
            eq(userOperatingUnits.operatingUnitId, operatingUnitId)
          ),
        });

        if (!existingOUAssignment) {
          await db.insert(userOperatingUnits).values({
            userId: existingUser.id,
            operatingUnitId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // 5. Return provisioning result
      return {
        userId: existingUser.id,
        isNewUser,
        email: existingUser.email,
        displayName: existingUser.name,
        organizationId: assignedOrganizationId,
        operatingUnitId: assignedOperatingUnitId,
      };
    } catch (err) {
      console.error("User provisioning failed:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to provision user",
      });
    }
  }

  /**
   * Get user by Microsoft Object ID
   */
  async getUserByMicrosoftId(microsoftObjectId: string): Promise<any | null> {
    const db = await getDb();
    if (!db) return null;

    return db.query.users.findFirst({
      where: eq(users.microsoftObjectId, microsoftObjectId),
    });
  }

  /**
   * Update user's Microsoft information
   */
  async updateMicrosoftUserInfo(
    userId: number,
    microsoftUserInfo: MicrosoftUserInfo
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    await db
      .update(users)
      .set({
        name: microsoftUserInfo.displayName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Link existing user to Microsoft account
   */
  async linkMicrosoftAccount(
    userId: number,
    microsoftUserInfo: MicrosoftUserInfo
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }

    // Check if Microsoft ID is already linked to another user
    const existingLink = await db.query.users.findFirst({
      where: eq(users.microsoftObjectId, microsoftUserInfo.id),
    });

    if (existingLink && existingLink.id !== userId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Microsoft account is already linked to another user",
      });
    }

    await db
      .update(users)
      .set({
        microsoftObjectId: microsoftUserInfo.id,
        authenticationProvider: "microsoft",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

export const userProvisioningService = new UserProvisioningService();
