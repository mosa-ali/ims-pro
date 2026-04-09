/**
 * Domain Resolver Configuration
 * 
 * Defines public domain allowlist for Platform Admin authentication
 * and domain validation rules for Organization Users.
 * 
 * @module domainResolverConfig
 */

/**
 * Public Domain Allowlist
 * 
 * Platform Admins are allowed to authenticate using these public email domains.
 * Organization Users MUST use their organization's registered domain.
 * 
 * This list includes major public email providers:
 * - Google (Gmail)
 * - Microsoft (Outlook, Hotmail, Live)
 * - Yahoo
 * - Apple (iCloud, me.com, mac.com)
 */
export const PUBLIC_DOMAIN_ALLOWLIST = [
  // Google
  'gmail.com',
  'googlemail.com',
  
  // Microsoft
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  
  // Yahoo
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  
  // Apple
  'icloud.com',
  'me.com',
  'mac.com',
] as const;

/**
 * Check if a domain is in the public domain allowlist
 * 
 * @param domain - Email domain to check (e.g., "gmail.com")
 * @returns true if domain is in allowlist, false otherwise
 * 
 * @example
 * isPublicDomain('gmail.com') // true
 * isPublicDomain('efadah-ye.org') // false
 */
export function isPublicDomain(domain: string): boolean {
  const normalizedDomain = domain.toLowerCase().trim();
  return PUBLIC_DOMAIN_ALLOWLIST.includes(normalizedDomain as any);
}

/**
 * Extract domain from email address
 * 
 * @param email - Email address (e.g., "user@example.com")
 * @returns Domain part of email (e.g., "example.com")
 * 
 * @example
 * extractDomain('user@gmail.com') // 'gmail.com'
 * extractDomain('admin@efadah-ye.org') // 'efadah-ye.org'
 */
export function extractDomain(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const parts = normalizedEmail.split('@');
  
  if (parts.length !== 2) {
    throw new Error(`Invalid email format: ${email}`);
  }
  
  return parts[1];
}

/**
 * Validate email format (basic validation)
 * 
 * @param email - Email address to validate
 * @returns true if email format is valid, false otherwise
 */
export function isValidEmailFormat(email: string): boolean {
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normalize domain for comparison
 * 
 * @param domain - Domain to normalize
 * @returns Normalized domain (lowercase, trimmed)
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim();
}
