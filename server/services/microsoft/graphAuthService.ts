import { ENV } from "../../_core/env";
import crypto from "crypto";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
  tenantId: string;
}

interface GraphTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

class GraphAuthService {
  private tokenCache: Map<string, TokenCache> = new Map();
  private readonly TOKEN_BUFFER_MS = 5 * 60 * 1000;

  // ============================================================================
  // ✅ 1. MICROSOFT LOGIN URL
  // ============================================================================

  getAuthorizationUrl() {
    if (!ENV.MS_CLIENT_ID || !ENV.MS_TENANT_ID || !ENV.MS_REDIRECT_URI) {
      throw new Error("Microsoft OAuth configuration missing");
    }

    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: ENV.MS_CLIENT_ID,
      response_type: "code",
      redirect_uri: ENV.MS_REDIRECT_URI,
      response_mode: "query",

      // ✅ FIXED
      scope: "openid profile email User.Read offline_access",

      state,
    });

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`;

    return { url, state };
  }

  // ============================================================================
  // ✅ 2. EXCHANGE CODE FOR TOKEN
  // ============================================================================

  async exchangeCodeForToken(code: string) {
    if (!ENV.MS_CLIENT_ID || !ENV.MS_CLIENT_SECRET || !ENV.MS_REDIRECT_URI) {
      throw new Error("Microsoft OAuth configuration missing");
    }

    const tokenEndpoint = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: ENV.MS_CLIENT_ID,
      client_secret: ENV.MS_CLIENT_SECRET,
      code,
      redirect_uri: ENV.MS_REDIRECT_URI,
      grant_type: "authorization_code",

      // ✅ CRITICAL FIX
      scope: "openid profile email User.Read offline_access",
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    return response.json();
  }

  // ============================================================================
  // ✅ 3. GRAPH API TOKEN (FIXED FOR MULTI-TENANT)
  // ============================================================================

  async getAccessToken(tenantId: string): Promise<string> {
    if (!ENV.MS_CLIENT_ID || !ENV.MS_CLIENT_SECRET) {
      throw new Error("Microsoft Graph configuration missing");
    }

    if (!tenantId || tenantId.trim() === "") {
      throw new Error("Tenant ID is required");
    }

    const cachedToken = this.tokenCache.get(tenantId);

    if (cachedToken && cachedToken.expiresAt > Date.now() + this.TOKEN_BUFFER_MS) {
      return cachedToken.accessToken;
    }

    // ✅ FIX: use tenantId (NOT ENV.MS_TENANT_ID)
    const token = await this.acquireToken(
      tenantId,
      ENV.MS_CLIENT_ID,
      ENV.MS_CLIENT_SECRET
    );

    this.tokenCache.set(tenantId, {
      accessToken: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      tenantId,
    });

    return token.access_token;
  }

  private async acquireToken(
    tenantId: string,
    clientId: string,
    clientSecret: string
  ): Promise<GraphTokenResponse> {

    // ✅ FIX: tenant-specific endpoint
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token acquisition failed: ${error}`);
    }

    return response.json() as Promise<GraphTokenResponse>;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  // ✅ FIX: multi-tenant compatible
  async validateTenant(tenantId: string, organizationTenantId: string): Promise<boolean> {
    return tenantId === organizationTenantId;
  }

  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.tokenCache.delete(tenantId);
    } else {
      this.tokenCache.clear();
    }
  }

  getCacheStats() {
    return {
      size: this.tokenCache.size,
      tenants: Array.from(this.tokenCache.keys()),
    };
  }
}

export const graphAuthService = new GraphAuthService();