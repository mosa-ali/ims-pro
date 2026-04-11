import { ENV } from "../../_core/env";

export interface AdminConsentRequest {
  organizationId: number;
  organizationName: string;
  requestedBy: number;
  requestedByEmail: string;
}

export interface AdminConsentCallback {
  code?: string; // ⚠ kept for compatibility (not used in admin consent)
  error?: string;
  error_description?: string;
  admin_consent?: string;
  tenant?: string;
}

export interface AdminConsentResult {
  success: boolean;
  tenantId?: string;
  consentGranted?: boolean;
  error?: string;
}

class AdminConsentService {
  private readonly AUTHORITY_BASE = "https://login.microsoftonline.com";
  private readonly GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

  /**
   * Generate admin consent link for organization
   */
  generateAdminConsentLink(organizationId: number, organizationName: string): string {
    const redirectUri = `${ENV.APP_BASE_URL}/api/auth/microsoft/admin-consent/callback`;

    const adminConsentUrl = new URL(
      `${this.AUTHORITY_BASE}/common/adminconsent`
    );

    adminConsentUrl.searchParams.set("client_id", ENV.MS_CLIENT_ID);
    adminConsentUrl.searchParams.set("redirect_uri", redirectUri);

    // ✅ REQUIRED (fix AADSTS900144)
    adminConsentUrl.searchParams.set("scope", "https://graph.microsoft.com/.default");

    // 🔒 organization isolation via state
    const state = Buffer.from(
      JSON.stringify({
        organizationId,
        organizationName,
        timestamp: Date.now(),
      })
    ).toString("base64");

    adminConsentUrl.searchParams.set("state", state);

    adminConsentUrl.searchParams.set("prompt", "admin_consent");

    return adminConsentUrl.toString();
  }

  /**
   * Generate onboarding link
   */
  generateOnboardingLink(organizationId: number, organizationName: string): string {
    const baseUrl = ENV.APP_BASE_URL;
    const encodedOrgName = encodeURIComponent(organizationName);

    return `${baseUrl}/api/auth/microsoft/onboarding/initiate?orgId=${organizationId}&orgName=${encodedOrgName}`;
  }

  /**
   * ✅ FIXED: Validate admin consent callback (NO CODE REQUIRED)
   */
  validateAdminConsentCallback(callback: AdminConsentCallback): {
    valid: boolean;
    error?: string;
  } {
    if (callback.error) {
      return {
        valid: false,
        error: `Microsoft returned error: ${callback.error} - ${callback.error_description || ""}`,
      };
    }

    // ✅ Correct validation
    if (callback.admin_consent !== "True") {
      return {
        valid: false,
        error: "Admin consent was not granted",
      };
    }

    if (!callback.tenant) {
      return {
        valid: false,
        error: "No tenant ID received from Microsoft",
      };
    }

    return { valid: true };
  }

  /**
   * Extract tenant ID
   */
  extractTenantId(callback: AdminConsentCallback): string | null {
    return callback.tenant || null;
  }

  /**
   * Extract organization context (with expiry check)
   */
  extractOrganizationContext(state: string): {
    organizationId: number;
    organizationName: string;
    timestamp: number;
  } | null {
    try {
      const decoded = Buffer.from(state, "base64").toString("utf-8");
      const context = JSON.parse(decoded);

      const age = Date.now() - context.timestamp;

      // 🔒 Prevent replay attacks (5 min)
      if (age > 5 * 60 * 1000) {
        return null;
      }

      return context;
    } catch {
      return null;
    }
  }

  /**
   * ⚠ kept for compatibility (used only if needed later)
   */
  buildTokenExchangeBody(code: string, redirectUri: string): URLSearchParams {
    const body = new URLSearchParams();
    body.append("client_id", ENV.MS_CLIENT_ID);
    body.append("client_secret", ENV.MS_CLIENT_SECRET);
    body.append("code", code);
    body.append("redirect_uri", redirectUri);
    body.append("grant_type", "authorization_code");

    // keep but not required for admin consent
    body.append("scope", "https://graph.microsoft.com/.default");

    return body;
  }

  /**
   * ⚠ kept (not used in consent flow directly)
   */
  getTokenEndpoint(): string {
    return `${this.AUTHORITY_BASE}/common/oauth2/v2.0/token`;
  }

  /**
   * Format onboarding status
   */
  formatOnboardingStatus(
    consentGranted: boolean,
    tenantId?: string,
    error?: string
  ): {
    status: "not_connected" | "pending_consent" | "connected" | "error";
    tenantVerified: boolean;
  } {
    if (error) {
      return {
        status: "error",
        tenantVerified: false,
      };
    }

    if (consentGranted && tenantId) {
      return {
        status: "connected",
        tenantVerified: true,
      };
    }

    return {
      status: "pending_consent",
      tenantVerified: false,
    };
  }

  /**
   * Audit log helper
   */
  generateAuditLogEntry(
    organizationId: number,
    event: "consent_initiated" | "consent_granted" | "consent_failed",
    details: Record<string, any>
  ): {
    action: string;
    details: string;
  } {
    const actionMap = {
      consent_initiated: "microsoft_consent_initiated",
      consent_granted: "microsoft_consent_granted",
      consent_failed: "microsoft_consent_failed",
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

export const adminConsentService = new AdminConsentService();