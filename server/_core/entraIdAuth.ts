/**
 * ============================================================================
 * Microsoft Entra ID Authentication Service
 * ============================================================================
 * 
 * Handles Microsoft Entra ID (Azure AD) authentication flow.
 * Implements:
 * - OpenID Connect authorization flow
 * - Token validation
 * - User provisioning
 * - Organization mapping by domain
 * 
 * ============================================================================
 */

import { ENV } from "./env";
import { graphUserService, GraphUser } from "../services/microsoft/graphUserService";
import { graphAuthService } from "../services/microsoft/graphAuthService";
import crypto from "crypto";

export interface EntraIdConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  graphScope: string;
}

export interface EntraIdToken {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface EntraIdUser {
  id: string; // Azure AD Object ID (oid)
  email: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  tenantId: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

interface IdTokenClaims {
  oid: string;
  email?: string;
  upn?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  tid: string;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
}

class EntraIdAuthService {
  private readonly AUTHORITY_BASE = "https://login.microsoftonline.com";
  private readonly GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
  private stateStore: Map<string, { state: string; timestamp: number }> = new Map();
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Get Entra ID configuration from environment
   */
  getConfig(): EntraIdConfig {
    if (!ENV.MS_TENANT_ID || !ENV.MS_CLIENT_ID || !ENV.MS_CLIENT_SECRET || !ENV.MS_REDIRECT_URI) {
      throw new Error(
        "Microsoft Entra ID configuration incomplete: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI required"
      );
    }

    return {
      tenantId: ENV.MS_TENANT_ID,
      clientId: ENV.MS_CLIENT_ID,
      clientSecret: ENV.MS_CLIENT_SECRET,
      redirectUri: ENV.MS_REDIRECT_URI,
      graphScope: ENV.MS_GRAPH_SCOPE || "https://graph.microsoft.com/.default",
    };
  }

  /**
   * Generate authorization URL for login
   * Uses /common endpoint for multi-tenant support
   */
  getAuthorizationUrl(config: EntraIdConfig, state?: string): { url: string; state: string } {
    const generatedState = state || this.generateState();
    
    // Store state for validation
    this.stateStore.set(generatedState, {
      state: generatedState,
      timestamp: Date.now(),
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      redirect_uri: config.redirectUri,
      response_mode: "query",
      scope: "openid profile email User.Read",
      state: generatedState,
      prompt: "select_account",
    });

    // Use /common endpoint for multi-tenant support
    const url = `${this.AUTHORITY_BASE}/common/oauth2/v2.0/authorize?${params.toString()}`;

    return { url, state: generatedState };
  }

  /**
   * Exchange authorization code for tokens
   * Uses /common endpoint for multi-tenant support
   */
  async exchangeCodeForToken(
    config: EntraIdConfig,
    code: string
  ): Promise<EntraIdToken> {
    // Use /common endpoint for multi-tenant support
    const tokenEndpoint = `${this.AUTHORITY_BASE}/common/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      scope: config.graphScope,
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${error}`);
      }

      const data = await response.json() as TokenResponse;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
      };
    } catch (err) {
      console.error("Failed to exchange code for token:", err);
      throw err;
    }
  }

  /**
   * Validate and decode ID token
   * Returns claims without full verification (should be done by OAuth library in production)
   */
  decodeIdToken(idToken: string): IdTokenClaims {
    try {
      // Split JWT into parts
      const parts = idToken.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      // Decode payload (second part)
      const payload = parts[1];
      const decoded = Buffer.from(payload, "base64").toString("utf-8");
      const claims = JSON.parse(decoded) as IdTokenClaims;

      // Basic validation
      if (!claims.oid || !claims.tid) {
        throw new Error("Invalid token claims: missing oid or tid");
      }

      // Check expiration
      if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
        throw new Error("Token expired");
      }

      return claims;
    } catch (err) {
      console.error("Failed to decode ID token:", err);
      throw err;
    }
  }

  /**
   * Get user info from Microsoft Graph using access token
   * Extracts tenant ID from ID token claims
   */
  async getUserInfo(accessToken: string, idToken: string): Promise<EntraIdUser> {
    try {
      const response = await fetch(`${this.GRAPH_API_BASE}/me?$select=id,userPrincipalName,displayName,givenName,surname`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Get user info failed: ${response.status} - ${error}`);
      }

      const user = await response.json() as {
        id: string;
        userPrincipalName: string;
        displayName: string;
        givenName?: string;
        surname?: string;
      };

      // Extract tenant ID from ID token claims (the tid field)
      const idTokenClaims = this.decodeIdToken(idToken);
      const tenantId = idTokenClaims.tid;

      return {
        id: user.id,
        email: user.userPrincipalName,
        displayName: user.displayName,
        givenName: user.givenName,
        surname: user.surname,
        tenantId,
      };
    } catch (err) {
      console.error("Failed to get user info from Microsoft Graph:", err);
      throw err;
    }
  }

  /**
   * Validate state parameter
   */
  validateState(state: string): boolean {
    const stored = this.stateStore.get(state);

    if (!stored) {
      return false;
    }

    // Check if state has expired
    if (Date.now() - stored.timestamp > this.STATE_EXPIRY_MS) {
      this.stateStore.delete(state);
      return false;
    }

    // Valid state, remove it
    this.stateStore.delete(state);
    return true;
  }

  /**
   * Generate random state parameter
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString("hex");
  }



  /**
   * Clear expired states (cleanup)
   */
  cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [key, value] of this.stateStore.entries()) {
      if (now - value.timestamp > this.STATE_EXPIRY_MS) {
        this.stateStore.delete(key);
      }
    }
  }
}

// Export singleton instance
export const entraIdAuthService = new EntraIdAuthService();
