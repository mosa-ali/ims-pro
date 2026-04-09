/**
 * ============================================================================
 * Tenant-to-Organization Mapping Service
 * ============================================================================
 */

import { getDb } from "../../db";
import { organizations } from "../../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

export interface OrganizationContext {
  organizationId: number;
  organizationName: string;
  tenantId: string;
  domain: string;
  isActive: boolean;
  primaryOperatingUnitId?: number;
}

class TenantOrganizationMappingService {
  /**
   * Resolve organization by Microsoft tenant ID
   * 
   * @param microsoftTenantId - The tenant ID from Microsoft Entra ID
   * @returns Organization context if found, null otherwise
   */
  async resolveOrganizationByTenant(
    microsoftTenantId: string
  ): Promise<OrganizationContext | null> {
    try {
      const db = await getDb();
      if (!db) {
        console.error("[TenantMapping] Database unavailable");
        return null;
      }

      // Query organizations table for matching tenant ID
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.tenantId, microsoftTenantId))
        .limit(1);

      if (!org || org.length === 0) {
        console.warn(
          `[TenantMapping] No organization found for tenant ID: ${microsoftTenantId}`
        );
        return null;
      }

      const organization = org[0];

      // Validate organization is active
      if (organization.status !== "active") {
        console.warn(
          `[TenantMapping] Organization is inactive: ${organization.id} (${organization.name})`
        );
        return null;
      }

      const context: OrganizationContext = {
        organizationId: organization.id,
        organizationName: organization.name,
        tenantId: organization.tenantId || "",
        domain: organization.domain || "",
        isActive: true,
      };

      console.log(
        `[TenantMapping] Successfully resolved organization: ${organization.id} (${organization.name}) for tenant: ${microsoftTenantId}`
      );

      return context;
    } catch (error) {
      console.error("[TenantMapping] Error resolving organization by tenant:", error);
      return null;
    }
  }

  // ============================================================================
  // VALIDATE TENANT OWNERSHIP
  // ============================================================================

  async validateTenantOwnership(
    microsoftTenantId: string,
    organizationId: number
  ): Promise<boolean> {
    try {
      if (!microsoftTenantId || !organizationId) {
        return false;
      }

      const db = await getDb();
      if (!db) return false;

      const org = await db
        .select()
        .from(organizations)
        .where(
          and(
            eq(organizations.id, organizationId),
            isNull(organizations.deletedAt) // ✅ FIX
          )
        )
        .limit(1);

      if (!org || org.length === 0) {
        return false;
      }

      const organization = org[0];

      const matches = organization.tenantId === microsoftTenantId;

      if (!matches) {
        console.warn(
          `[TenantMapping] Tenant mismatch: expected ${organization.tenantId}, got ${microsoftTenantId}`
        );
      }

      return matches;

    } catch (error) {
      console.error("[TenantMapping] Error validating tenant:", error);
      return false;
    }
  }

  // ============================================================================
  // GET ORGANIZATION CONTEXT
  /**
   * Get organization by ID with full context
   * 
   * @param organizationId - The IMS organization ID
   * @returns Organization context if found, null otherwise
   */
  async getOrganizationContext(
    organizationId: number
  ): Promise<OrganizationContext | null> {
    try {
      const db = await getDb();
      if (!db) {
        console.error("[TenantMapping] Database unavailable");
        return null;
      }

      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org || org.length === 0) {
        console.warn(`[TenantMapping] Organization not found: ${organizationId}`);
        return null;
      }

      const organization = org[0];

      if (organization.status !== "active") {
        console.warn(`[TenantMapping] Organization is inactive: ${organizationId}`);
        return null;
      }

      return {
        organizationId: organization.id,
        organizationName: organization.name,
        tenantId: organization.tenantId || "",
        domain: organization.domain || "",
        isActive: true,
      };
    } catch (error) {
      console.error("[TenantMapping] Error getting organization context:", error);
      return null;
    }
  }

  // ============================================================================
  // VALIDATE USER DOMAIN
  // ============================================================================

  async validateUserDomain(
    userEmail: string,
    organizationId: number
  ): Promise<boolean> {
    try {
      if (!userEmail || !organizationId) return false;

      const db = await getDb();
      if (!db) return false;

      const org = await db
        .select()
        .from(organizations)
        .where(
          and(
            eq(organizations.id, organizationId),
            isNull(organizations.deletedAt) // ✅ FIX
          )
        )
        .limit(1);

      if (!org || org.length === 0) {
        return false;
      }

      const organization = org[0];
      const approvedDomain = organization.domain;

      if (!approvedDomain) {
        return false;
      }

      const emailDomain = userEmail.split("@")[1]?.toLowerCase();
      if (!emailDomain) return false;

      const normalizedDomain = approvedDomain.toLowerCase();

      // ✅ FIX (supports subdomains)
      const matches =
        emailDomain === normalizedDomain ||
        emailDomain.endsWith("." + normalizedDomain);

      if (!matches) {
        console.warn(
          `[TenantMapping] Domain mismatch: ${emailDomain} vs ${normalizedDomain}`
        );
      }

      return matches;

    } catch (error) {
      console.error("[TenantMapping] Domain validation error:", error);
      return false;
    }
  }
}

export const tenantOrganizationMappingService =
  new TenantOrganizationMappingService();