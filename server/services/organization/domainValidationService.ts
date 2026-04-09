import { getDb } from "../../db";
import { organizations } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Public email domains that are not allowed for organization users
 * These are blocked at the organization level to ensure corporate email usage
 */
const PUBLIC_EMAIL_DOMAINS = new Set([
  // Gmail
  "gmail.com",
  "googlemail.com",
  
  // Microsoft
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  
  // Yahoo
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  
  // AOL
  "aol.com",
  "aim.com",
  
  // Other public providers
  "mail.com",
  "protonmail.com",
  "tutanota.com",
  "mailfence.com",
  "fastmail.com",
  "zoho.com",
  "icloud.com",
  "mail.ru",
  "yandex.com",
  "qq.com",
  "163.com",
  "126.com",
]);

interface DomainValidationResult {
  valid: boolean;
  message?: string;
  reason?: string;
}

interface DomainValidationOptions {
  organizationId: number;
  email: string;
  allowPublicDomains?: boolean; // For platform admins
}

/**
 * Domain Validation Service
 * Enforces organization-level domain restrictions
 */
export const domainValidationService = {
  /**
   * Extract domain from email address
   */
  extractDomain(email: string): string | null {
    const match = email.match(/@([^@]+)$/);
    return match ? match[1].toLowerCase() : null;
  },

  /**
   * Check if domain is a public email provider
   */
  isPublicDomain(domain: string): boolean {
    return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase());
  },

  /**
   * Get organization's approved domain
   */
  async getOrganizationDomain(organizationId: number): Promise<string | null> {
    try {
      const db = await getDb();
      const org = await db
        .select({ domain: organizations.domain })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      return org.length > 0 ? org[0].domain : null;
    } catch (error) {
      console.error(`[DomainValidation] Error fetching organization domain for ${organizationId}:`, error);
      return null;
    }
  },

  /**
   * Validate email domain against organization rules
   * Returns { valid: true } if email is allowed
   * Returns { valid: false, message, reason } if email is blocked
   */
  async validateEmailDomain(options: DomainValidationOptions): Promise<DomainValidationResult> {
    const { organizationId, email, allowPublicDomains = false } = options;

    // Extract domain from email
    const domain = this.extractDomain(email);
    if (!domain) {
      return {
        valid: false,
        message: "Invalid email format",
        reason: "EMAIL_FORMAT_INVALID",
      };
    }

    // Platform admins can use any domain
    if (allowPublicDomains) {
      return { valid: true };
    }

    // Get organization's approved domain
    const approvedDomain = await this.getOrganizationDomain(organizationId);
    if (!approvedDomain) {
      console.warn(`[DomainValidation] No approved domain configured for organization ${organizationId}`);
      return {
        valid: false,
        message: "Organization domain not configured",
        reason: "ORG_DOMAIN_NOT_CONFIGURED",
      };
    }

    // Check if email domain matches organization's approved domain
    if (domain.toLowerCase() === approvedDomain.toLowerCase()) {
      return { valid: true };
    }

    // Check if domain is a public email provider
    if (this.isPublicDomain(domain)) {
      return {
        valid: false,
        message: `Public email domains are not allowed. Please use your ${approvedDomain} email address.`,
        reason: "PUBLIC_DOMAIN_NOT_ALLOWED",
      };
    }

    // Domain doesn't match organization's approved domain
    return {
      valid: false,
      message: `Email domain must be @${approvedDomain}. Your email domain (@${domain}) is not authorized.`,
      reason: "DOMAIN_NOT_APPROVED",
    };
  },

  /**
   * Validate multiple emails (for bulk operations)
   */
  async validateEmailDomains(
    organizationId: number,
    emails: string[],
    allowPublicDomains?: boolean
  ): Promise<Map<string, DomainValidationResult>> {
    const results = new Map<string, DomainValidationResult>();

    for (const email of emails) {
      const result = await this.validateEmailDomain({
        organizationId,
        email,
        allowPublicDomains,
      });
      results.set(email, result);
    }

    return results;
  },

  /**
   * Get list of public domains (for UI display)
   */
  getPublicDomains(): string[] {
    return Array.from(PUBLIC_EMAIL_DOMAINS).sort();
  },

  /**
   * Check if organization has domain restrictions enabled
   * (Currently always enabled, but can be made configurable)
   */
  async isDomainEnforcementEnabled(organizationId: number): Promise<boolean> {
    // For now, domain enforcement is always enabled
    // In future, this can be made configurable per organization
    const db = await getDb();
    const org = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    return org.length > 0;
  },

  /**
   * Get organization's domain configuration for display
   */
  async getOrganizationDomainConfig(organizationId: number) {
    const approvedDomain = await this.getOrganizationDomain(organizationId);
    const isEnforced = await this.isDomainEnforcementEnabled(organizationId);

    return {
      organizationId,
      approvedDomain,
      isEnforced,
      publicDomainsBlocked: Array.from(PUBLIC_EMAIL_DOMAINS).sort(),
      message: isEnforced && approvedDomain
        ? `Only users with @${approvedDomain} email addresses are allowed in this organization.`
        : "Domain enforcement is not configured for this organization.",
    };
  },
};
