/**
 * ============================================================================
 * Onboarding Token Service
 * ============================================================================
 * 
 * Generates and validates secure tokens for one-link tenant onboarding.
 * Tokens are:
 * - Cryptographically secure (using crypto.randomBytes)
 * - Time-limited (24 hours by default)
 * - Organization-specific
 * - Single-use (invalidated after successful consent)
 * 
 * ============================================================================
 */

import crypto from "crypto";

export interface OnboardingToken {
  token: string;
  expiresAt: Date;
}

export interface TokenValidation {
  valid: boolean;
  organizationId?: number;
  error?: string;
}

class OnboardingTokenService {
  private readonly TOKEN_LENGTH = 32; // 32 bytes = 256 bits
  private readonly TOKEN_EXPIRY_HOURS = 24; // Tokens valid for 24 hours

  /**
   * Generate a secure onboarding token
   * Returns base64-encoded token and expiry timestamp
   */
  generateToken(): OnboardingToken {
    // Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(this.TOKEN_LENGTH);
    const token = randomBytes.toString("base64url");

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    return {
      token,
      expiresAt,
    };
  }

  /**
   * Validate a token
   * Checks if token is not expired
   */
  validateToken(token: string, expiresAt: Date | string | null): {
    valid: boolean;
    error?: string;
  } {
    // Check if token exists
    if (!token) {
      return {
        valid: false,
        error: "Token not found",
      };
    }

    // Check if expiry exists
    if (!expiresAt) {
      return {
        valid: false,
        error: "Token expiry not found",
      };
    }

    // Convert expiry to Date if string
    const expiryDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;

    // Check if token is expired
    if (expiryDate < new Date()) {
      return {
        valid: false,
        error: "Token has expired",
      };
    }

    return { valid: true };
  }

  /**
   * Generate onboarding link with token
   * This is the URL sent in the email to organization admin
   */
  generateOnboardingLink(baseUrl: string, token: string): string {
    return `${baseUrl}/api/auth/microsoft/onboarding/${token}`;
  }

  /**
   * Extract token from URL path
   */
  extractTokenFromPath(path: string): string | null {
    // Path format: /api/auth/microsoft/onboarding/:token
    const match = path.match(/\/api\/auth\/microsoft\/onboarding\/([^/?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Format token for database storage
   * Ensures consistent format across the system
   */
  formatTokenForStorage(token: string): string {
    return token.trim();
  }

  /**
   * Generate audit log entry for token generation
   */
  generateAuditLogEntry(
    organizationId: number,
    event: "token_generated" | "token_used" | "token_expired",
    details: Record<string, any>
  ): {
    action: string;
    details: string;
  } {
    const actionMap = {
      token_generated: "onboarding_token_generated",
      token_used: "onboarding_token_used",
      token_expired: "onboarding_token_expired",
    };

    return {
      action: actionMap[event],
      details: JSON.stringify({
        organizationId,
        event,
        ...details,
        timestamp: new Date().toISOString(),
      }),
    };
  }
}

export const onboardingTokenService = new OnboardingTokenService();
