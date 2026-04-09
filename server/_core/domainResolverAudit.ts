/**
 * Domain Resolver Audit Logging
 * 
 * Logs all domain resolution outcomes for security monitoring and compliance.
 * 
 * @module domainResolverAudit
 */

import * as db from "../db";

/**
 * Domain Resolution Log Entry
 */
export interface DomainResolutionLog {
  /** Timestamp of resolution attempt (milliseconds since epoch) */
  timestamp: number;
  /** Email address attempting to authenticate */
  email: string;
  /** Domain extracted from email */
  domain: string;
  /** OAuth OpenID */
  openId: string;
  /** Whether authentication was allowed */
  allowed: boolean;
  /** Reason for allow/deny decision */
  reason: string;
  /** Resolved role (if allowed) */
  role?: 'platform_admin' | 'platform_super_admin' | 'organization_admin' | 'user';
  /** Resolved organization ID (if allowed and org user) */
  organizationId?: number;
  /** IP address of request */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
}

/**
 * Log domain resolution outcome to audit_logs table
 * 
 * @param log - Domain resolution log entry
 * 
 * @example
 * await logDomainResolution({
 *   timestamp: Date.now(),
 *   email: 'admin@gmail.com',
 *   domain: 'gmail.com',
 *   openId: 'abc123',
 *   allowed: true,
 *   reason: 'Platform Admin with public domain',
 *   role: 'platform_admin',
 * });
 */
export async function logDomainResolution(log: DomainResolutionLog): Promise<void> {
  try {
    const action = log.allowed ? 'domain_resolution_allowed' : 'domain_resolution_denied';
    
    const details = JSON.stringify({
      email: log.email,
      domain: log.domain,
      openId: log.openId,
      reason: log.reason,
      role: log.role,
      organizationId: log.organizationId,
      timestamp: log.timestamp,
    });

    await db.createAuditLog({
      action,
      entityType: 'domain_resolution',
      details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: new Date(log.timestamp),
    });

    // Also log to console for immediate visibility
    const status = log.allowed ? '✅ ALLOWED' : '❌ DENIED';
    console.log(
      `[DomainResolver] ${status} | ${log.email} | ${log.domain} | ${log.reason}`
    );
  } catch (error) {
    // Don't throw - audit logging failure should not block authentication
    console.error('[DomainResolver] Failed to log audit entry:', error);
  }
}

/**
 * Log suspicious domain resolution attempt
 * 
 * @param log - Domain resolution log entry
 * @param suspiciousReason - Reason why attempt is suspicious
 * 
 * @example
 * await logSuspiciousAttempt(log, 'Multiple failed attempts from same IP');
 */
export async function logSuspiciousAttempt(
  log: DomainResolutionLog,
  suspiciousReason: string
): Promise<void> {
  try {
    const details = JSON.stringify({
      email: log.email,
      domain: log.domain,
      openId: log.openId,
      reason: log.reason,
      suspiciousReason,
      timestamp: log.timestamp,
    });

    await db.createAuditLog({
      action: 'suspicious_domain_resolution',
      entityType: 'security_event',
      details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: new Date(log.timestamp),
    });

    console.warn(
      `[DomainResolver] 🚨 SUSPICIOUS | ${log.email} | ${log.domain} | ${suspiciousReason}`
    );
  } catch (error) {
    console.error('[DomainResolver] Failed to log suspicious attempt:', error);
  }
}

/**
 * Get recent domain resolution logs for monitoring
 * 
 * @param limit - Maximum number of logs to retrieve
 * @returns Array of recent domain resolution audit logs
 */
export async function getRecentDomainResolutionLogs(limit: number = 100) {
  // Note: getAuditLogs only accepts single action string, not array
  // To get all domain resolution logs, we query without action filter and filter in memory
  const allLogs = await db.getAuditLogs({
    limit: limit * 3, // Get more logs to account for filtering
  });
  
  const domainResolutionActions = [
    'domain_resolution_allowed',
    'domain_resolution_denied',
    'suspicious_domain_resolution',
  ];
  
  return allLogs
    .filter(log => domainResolutionActions.includes(log.action))
    .slice(0, limit);
}
