/**
 * Domain Resolver - Security Hardening
 * 
 * Enforces domain-based access control:
 * - Platform Admins: Allowed to use public domains (gmail.com, outlook.com, etc.)
 * - Organization Users: MUST use organization's registered domain
 * 
 * @module domainResolver
 */

import * as db from "../db";
import { extractDomain, isPublicDomain, isValidEmailFormat, normalizeDomain } from "./domainResolverConfig";
import { logDomainResolution, logSuspiciousAttempt } from "./domainResolverAudit";

/**
 * Domain Resolution Result
 */
export interface DomainResolutionResult {
  /** Whether authentication is allowed */
  allowed: boolean;
  /** Reason for allow/deny decision */
  reason: string;
  /** Resolved role (if allowed) */
  role?: 'platform_admin' | 'platform_super_admin' | 'platform_auditor' | 'organization_admin' | 'user';
  /** Resolved organization ID (if allowed and org user) */
  organizationId?: number;
  /** Resolved organization name (if allowed and org user) */
  organizationName?: string;
  /** Tenant ID (if allowed and org user) */
  tenantId?: string;
  /** Warnings (non-blocking issues) */
  warnings?: string[];
}

/**
 * Resolve domain and determine if user is allowed to authenticate
 * 
 * @param email - User email address
 * @param openId - OAuth OpenID
 * @param ipAddress - Request IP address (optional)
 * @param userAgent - Request user agent (optional)
 * @returns Domain resolution result
 * 
 * @example
 * // Platform Admin with public domain
 * const result = await resolveDomain('admin@gmail.com', 'openid123');
 * // result.allowed === true, result.role === 'platform_admin'
 * 
 * @example
 * // Organization User with organization domain
 * const result = await resolveDomain('user@efadah-ye.org', 'openid456');
 * // result.allowed === true, result.role === 'user', result.organizationId === 1
 * 
 * @example
 * // Organization User with public domain (REJECTED)
 * const result = await resolveDomain('user@gmail.com', 'openid789');
 * // result.allowed === false, result.reason === 'Organization users must use organization domain'
 */
export async function resolveDomain(
  email: string,
  openId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<DomainResolutionResult> {
  const timestamp = Date.now();
  
  // Step 1: Validate email format
  if (!isValidEmailFormat(email)) {
    const result: DomainResolutionResult = {
      allowed: false,
      reason: 'Invalid email format',
    };
    
    await logDomainResolution({
      timestamp,
      email,
      domain: '',
      openId,
      allowed: false,
      reason: result.reason,
      ipAddress,
      userAgent,
    });
    
    return result;
  }

  // Step 2: Extract domain from email
  let domain: string;
  try {
    domain = extractDomain(email);
  } catch (error) {
    const result: DomainResolutionResult = {
      allowed: false,
      reason: 'Failed to extract domain from email',
    };
    
    await logDomainResolution({
      timestamp,
      email,
      domain: '',
      openId,
      allowed: false,
      reason: result.reason,
      ipAddress,
      userAgent,
    });
    
    return result;
  }

  const normalizedDomain = normalizeDomain(domain);

  // Step 3: Check if domain is public
  const isPublic = isPublicDomain(normalizedDomain);

  if (isPublic) {
    // Public domain - only allowed for Platform Admins
    return await resolvePublicDomain(email, openId, normalizedDomain, timestamp, ipAddress, userAgent);
  } else {
    // Organization domain - must match organization's registered domain
    return await resolveOrganizationDomain(email, openId, normalizedDomain, timestamp, ipAddress, userAgent);
  }
}

/**
 * Resolve public domain (gmail.com, outlook.com, etc.)
 * Only Platform Admins are allowed to use public domains
 */
async function resolvePublicDomain(
  email: string,
  openId: string,
  domain: string,
  timestamp: number,
  ipAddress?: string,
  userAgent?: string
): Promise<DomainResolutionResult> {
  // Check if user exists in database by openId or email
  // This allows platform admins to be found by email even if their OAuth openId differs
  const existingUser = await db.getUserByOpenIdOrEmail(openId, email);

  if (!existingUser) {
    // New user with public domain - REJECT
    // New users with public domains must be created by Platform Admin
    const result: DomainResolutionResult = {
      allowed: false,
      reason: 'New users with public domains must be created by Platform Admin',
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: false,
      reason: result.reason,
      ipAddress,
      userAgent,
    });

    return result;
  }

  // Check if user is Platform Admin
  const isPlatformAdmin = ['platform_admin', 'platform_super_admin', 'platform_auditor'].includes(existingUser.role);

  if (isPlatformAdmin) {
    // Platform Admin with public domain - ALLOW
    const result: DomainResolutionResult = {
      allowed: true,
      reason: 'Platform Admin with public domain',
      role: existingUser.role as any,
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: true,
      reason: result.reason,
      role: existingUser.role as any,
      ipAddress,
      userAgent,
    });

    return result;
  } else {
    // Organization user trying to use public domain - REJECT
    const result: DomainResolutionResult = {
      allowed: false,
      reason: 'Organization users must use organization domain, not public domains',
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: false,
      reason: result.reason,
      role: existingUser.role as any,
      organizationId: existingUser.organizationId || undefined,
      ipAddress,
      userAgent,
    });

    // Log as suspicious if org user repeatedly tries public domain
    await logSuspiciousAttempt(
      {
        timestamp,
        email,
        domain,
        openId,
        allowed: false,
        reason: result.reason,
        role: existingUser.role as any,
        organizationId: existingUser.organizationId || undefined,
        ipAddress,
        userAgent,
      },
      'Organization user attempting to use public domain'
    );

    return result;
  }
}

/**
 * Resolve organization domain (efadah-ye.org, yamany.org, etc.)
 * Must match organization's registered domain
 */
async function resolveOrganizationDomain(
  email: string,
  openId: string,
  domain: string,
  timestamp: number,
  ipAddress?: string,
  userAgent?: string
): Promise<DomainResolutionResult> {
  // Query organizations table for matching domain
  const matchingOrgs = await db.getOrganizationsByDomain(domain);

  if (matchingOrgs.length === 0) {
    // No organization found with this domain - REJECT
    const result: DomainResolutionResult = {
      allowed: false,
      reason: `No organization registered with domain: ${domain}`,
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: false,
      reason: result.reason,
      ipAddress,
      userAgent,
    });

    return result;
  }

  if (matchingOrgs.length > 1) {
    // Multiple organizations with same domain - REJECT (ambiguous)
    const result: DomainResolutionResult = {
      allowed: false,
      reason: `Ambiguous domain mapping: ${matchingOrgs.length} organizations registered with domain ${domain}`,
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: false,
      reason: result.reason,
      ipAddress,
      userAgent,
    });

    // Log as suspicious - ambiguous domain mapping should not happen
    await logSuspiciousAttempt(
      {
        timestamp,
        email,
        domain,
        openId,
        allowed: false,
        reason: result.reason,
        ipAddress,
        userAgent,
      },
      'Ambiguous domain mapping detected'
    );

    return result;
  }

  // Single organization found
  const org = matchingOrgs[0];

  // Check organization status
  if (org.status !== 'active') {
    const result: DomainResolutionResult = {
      allowed: false,
      reason: `Organization is ${org.status}, not active`,
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: false,
      reason: result.reason,
      organizationId: org.id,
      ipAddress,
      userAgent,
    });

    return result;
  }

  // Check if organization is soft-deleted
  if (org.isDeleted) {
    const result: DomainResolutionResult = {
      allowed: false,
      reason: 'Organization has been deleted',
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: false,
      reason: result.reason,
      organizationId: org.id,
      ipAddress,
      userAgent,
    });

    return result;
  }

  // Check if user exists
  const existingUser = await db.getUserByOpenId(openId);

  if (existingUser) {
    // Existing user - verify they belong to this organization
    if (existingUser.organizationId && existingUser.organizationId !== org.id) {
      const result: DomainResolutionResult = {
        allowed: false,
        reason: `User belongs to different organization (ID: ${existingUser.organizationId})`,
      };

      await logDomainResolution({
        timestamp,
        email,
        domain,
        openId,
        allowed: false,
        reason: result.reason,
        role: existingUser.role as any,
        organizationId: existingUser.organizationId || undefined,
        ipAddress,
        userAgent,
      });

      return result;
    }

    // User belongs to this organization - ALLOW
    const result: DomainResolutionResult = {
      allowed: true,
      reason: 'Organization user with matching domain',
      role: existingUser.role as any,
      organizationId: org.id,
      organizationName: org.name,
      tenantId: org.tenantId || undefined,
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: true,
      reason: result.reason,
      role: existingUser.role as any,
      organizationId: org.id,
      ipAddress,
      userAgent,
    });

    return result;
  } else {
    // New user with organization domain - ALLOW
    // They will be created during OAuth callback
    const result: DomainResolutionResult = {
      allowed: true,
      reason: 'New user with valid organization domain',
      role: 'user', // Default role for new users
      organizationId: org.id,
      organizationName: org.name,
      tenantId: org.tenantId || undefined,
      warnings: ['New user will be created with default role: user'],
    };

    await logDomainResolution({
      timestamp,
      email,
      domain,
      openId,
      allowed: true,
      reason: result.reason,
      role: 'user',
      organizationId: org.id,
      ipAddress,
      userAgent,
    });

    return result;
  }
}
