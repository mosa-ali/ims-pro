import { getDb } from "../../db";
import { organizations } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Public email domains (free email providers)
 * Platform admins can use these for development/testing
 */
const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "protonmail.com",
  "icloud.com",
  "mail.com",
  "zoho.com",
  "aol.com",
  "yandex.com",
  "mailbox.org",
  "tutanota.com",
  "posteo.de",
];

/**
 * Email Validation Service
 * Handles email domain validation for different user types:
 * - Platform Admins: Can use public domain emails (gmail, outlook, etc.)
 * - Organization Users: Must use organization's approved domain
 */
export class EmailValidationService {
  /**
   * Extract domain from email address
   */
  static extractDomain(email: string): string | null {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Check if email uses a public domain (gmail, outlook, etc.)
   */
  static isPublicDomain(email: string): boolean {
    const domain = this.extractDomain(email);
    if (!domain) return false;
    return PUBLIC_EMAIL_DOMAINS.includes(domain);
  }

  /**
   * Validate email for platform admin
   * Platform admins can use public domain emails
   * Returns: { valid: boolean, reason?: string }
   */
  static validatePlatformAdminEmail(email: string): { valid: boolean; reason?: string } {
    // Check email format
    if (!this.isValidEmailFormat(email)) {
      return { valid: false, reason: "Invalid email format" };
    }

    // Platform admins can use public domain emails
    if (this.isPublicDomain(email)) {
      return { valid: true };
    }

    // Also allow corporate emails (any non-public domain)
    return { valid: true };
  }

  /**
   * Validate email for organization user
   * Organization users must use their organization's approved domain
   * Returns: { valid: boolean, reason?: string }
   */
  static async validateOrganizationUserEmail(
    email: string,
    organizationId: number
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check email format
    if (!this.isValidEmailFormat(email)) {
      return { valid: false, reason: "Invalid email format" };
    }

    // Get organization's approved domain
    const db = await getDb();
    if (!db) {
      return { valid: false, reason: "Database unavailable" };
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org) {
      return { valid: false, reason: "Organization not found" };
    }

    // Get approved domain from organization
    const approvedDomain = org.approvedEmailDomain;
    if (!approvedDomain) {
      return {
        valid: false,
        reason: "Organization has not configured an approved email domain. Please contact your administrator.",
      };
    }

    // Validate user's email domain matches organization's approved domain
    const userDomain = this.extractDomain(email);
    if (!userDomain) {
      return { valid: false, reason: "Invalid email format" };
    }

    if (userDomain.toLowerCase() !== approvedDomain.toLowerCase()) {
      return {
        valid: false,
        reason: `Your email domain (@${userDomain}) does not match the organization's approved domain (@${approvedDomain}). Please use an email from your organization.`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate email format using regex
   */
  static isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email is already registered in the system
   */
  static async isEmailRegistered(email: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const { users } = await import("../../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    return !!user;
  }

  /**
   * Get organization's approved domain
   */
  static async getOrganizationDomain(organizationId: number): Promise<string | null> {
    const db = await getDb();
    if (!db) return null;

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    return org?.approvedEmailDomain || null;
  }

  /**
   * Validate user type based on email and organization
   * Returns: { userType: 'platform_admin' | 'organization_user', valid: boolean, reason?: string }
   */
  static async validateUserTypeByEmail(
    email: string,
    organizationId?: number
  ): Promise<{ userType: "platform_admin" | "organization_user"; valid: boolean; reason?: string }> {
    // If no organization ID provided, treat as platform admin
    if (!organizationId) {
      const adminValidation = this.validatePlatformAdminEmail(email);
      return {
        userType: "platform_admin",
        valid: adminValidation.valid,
        reason: adminValidation.reason,
      };
    }

    // If organization ID provided, validate as organization user
    const userValidation = await this.validateOrganizationUserEmail(email, organizationId);
    return {
      userType: "organization_user",
      valid: userValidation.valid,
      reason: userValidation.reason,
    };
  }
}
