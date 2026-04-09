import { TRPCError } from '@trpc/server';
import { getDb } from '../../db';
import { organizations, users } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Domain Validation Service
 * Validates user email domains against organization's allowed domains
 * Supports both organization users and platform admins
 */
export class DomainValidationService {
  /**
   * Public domain list for platform admins
   * These are common public email providers
   */
  private readonly PUBLIC_DOMAINS = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'yahoo.com',
    'protonmail.com',
    'icloud.com',
    'mail.com',
    'aol.com',
    'zoho.com',
    'yandex.com',
  ];

  /**
   * Extract domain from email address
   */
  extractDomain(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid email format',
      });
    }
    return parts[1].toLowerCase();
  }

  /**
   * Check if domain is a public email provider
   */
  isPublicDomain(domain: string): boolean {
    return this.PUBLIC_DOMAINS.includes(domain.toLowerCase());
  }

  /**
   * Validate platform admin email (must be public domain)
   */
  validatePlatformAdminEmail(email: string): { valid: boolean; error?: string } {
    const domain = this.extractDomain(email);

    if (!this.isPublicDomain(domain)) {
      return {
        valid: false,
        error: `Platform admins must use a public email domain (e.g., gmail.com, outlook.com). Your domain "@${domain}" is not allowed.`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate organization user email against organization's allowed domains
   */
  async validateOrganizationUserEmail(
    email: string,
    organizationId: number
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const db = await getDb();

      // Get organization details
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org || org.length === 0) {
        return {
          valid: false,
          error: 'Organization not found',
        };
      }

      const organization = org[0];

      // Check if organization has allowed domains configured
      if (!organization.allowedDomains) {
        return {
          valid: false,
          error: 'Organization has not configured allowed email domains. Please contact your administrator.',
        };
      }

      // Parse allowed domains
      let allowedDomains: string[] = [];
      try {
        allowedDomains = JSON.parse(organization.allowedDomains);
      } catch (error) {
        console.error('Failed to parse allowed domains:', error);
        return {
          valid: false,
          error: 'Organization domain configuration is invalid. Please contact your administrator.',
        };
      }

      if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) {
        return {
          valid: false,
          error: 'Organization has not configured allowed email domains. Please contact your administrator.',
        };
      }

      // Extract user's email domain
      const userDomain = this.extractDomain(email);

      // Check if user's domain is in allowed domains
      const isAllowed = allowedDomains.some(
        (domain) => domain.toLowerCase() === userDomain.toLowerCase()
      );

      if (!isAllowed) {
        return {
          valid: false,
          error: `Your email domain "@${userDomain}" is not authorized for ${organization.name}. Allowed domains: ${allowedDomains.join(', ')}`,
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Domain validation error:', error);
      return {
        valid: false,
        error: 'An error occurred while validating your email domain. Please try again.',
      };
    }
  }

  /**
   * Get organization's allowed domains
   */
  async getOrganizationDomains(organizationId: number): Promise<string[]> {
    try {
      const db = await getDb();

      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org || org.length === 0) {
        return [];
      }

      if (!org[0].allowedDomains) {
        return [];
      }

      try {
        return JSON.parse(org[0].allowedDomains);
      } catch (error) {
        console.error('Failed to parse allowed domains:', error);
        return [];
      }
    } catch (error) {
      console.error('Error getting organization domains:', error);
      return [];
    }
  }

  /**
   * Check if organization requires domain validation
   */
  async organizationRequiresDomainValidation(organizationId: number): Promise<boolean> {
    try {
      const db = await getDb();

      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org || org.length === 0) {
        return false;
      }

      // Require domain validation if organization has allowed domains configured
      return !!org[0].allowedDomains;
    } catch (error) {
      console.error('Error checking domain validation requirement:', error);
      return false;
    }
  }

  /**
   * Get organization's authentication method
   */
  async getOrganizationAuthMethod(organizationId: number): Promise<string> {
    try {
      const db = await getDb();

      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org || org.length === 0) {
        return 'mixed';
      }

      return org[0].authMethod || 'mixed';
    } catch (error) {
      console.error('Error getting organization auth method:', error);
      return 'mixed';
    }
  }

  /**
   * Validate email based on user role and organization
   */
  async validateEmailByRole(
    email: string,
    role: string,
    organizationId?: number
  ): Promise<{ valid: boolean; error?: string }> {
    // Platform admin validation
    if (role === 'platform_admin' || role === 'platform_super_admin') {
      return this.validatePlatformAdminEmail(email);
    }

    // Organization user validation
    if (organizationId) {
      return this.validateOrganizationUserEmail(email, organizationId);
    }

    // Default: allow any valid email
    return { valid: true };
  }
}

// Export singleton instance
export const domainValidationService = new DomainValidationService();
