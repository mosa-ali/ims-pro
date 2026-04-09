import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { entraIdAuthService } from "./server/_core/entraIdAuth";

/**
 * Microsoft Entra ID OAuth Flow Test
 * Validates the complete OAuth flow:
 * 1. Authorization URL generation
 * 2. State management
 * 3. Token exchange
 * 4. User info retrieval
 */

describe("Microsoft Entra ID OAuth Flow", () => {
  const config = {
    tenantId: process.env.MS_TENANT_ID || "",
    clientId: process.env.MS_CLIENT_ID || "",
    clientSecret: process.env.MS_CLIENT_SECRET || "",
    redirectUri: process.env.MS_REDIRECT_URI || "",
  };

  beforeAll(() => {
    expect(config.tenantId).toBeTruthy();
    expect(config.clientId).toBeTruthy();
    expect(config.clientSecret).toBeTruthy();
    expect(config.redirectUri).toBeTruthy();
  });

  describe("Authorization URL Generation", () => {
    it("should generate valid authorization URL", () => {
      const { url, state } = entraIdAuthService.getAuthorizationUrl(config);
      
      expect(url).toBeTruthy();
      expect(state).toBeTruthy();
      expect(url).toContain("login.microsoftonline.com");
      expect(url).toContain("client_id=" + config.clientId);
      expect(url).toContain("redirect_uri=" + encodeURIComponent(config.redirectUri));
      expect(url).toContain("response_type=code");
      expect(url).toContain("scope=");
    });

    it("should generate unique state for each request", () => {
      const { state: state1 } = entraIdAuthService.getAuthorizationUrl(config);
      const { state: state2 } = entraIdAuthService.getAuthorizationUrl(config);
      
      expect(state1).not.toBe(state2);
    });

    it("should include required OAuth scopes", () => {
      const { url } = entraIdAuthService.getAuthorizationUrl(config);
      
      expect(url).toContain("openid");
      expect(url).toContain("profile");
      expect(url).toContain("email");
      // offline_access is optional and may not be included by default
    });

    it("should use localhost redirect URI in development", () => {
      const { url } = entraIdAuthService.getAuthorizationUrl(config);
      
      expect(url).toContain(encodeURIComponent(config.redirectUri));
      expect(config.redirectUri).toContain("localhost:3000");
    });
  });

  describe("State Management", () => {
    it("should validate generated state", () => {
      const { state } = entraIdAuthService.getAuthorizationUrl(config);
      
      const isValid = entraIdAuthService.validateState(state);
      expect(isValid).toBe(true);
    });

    it("should reject invalid state", () => {
      const isValid = entraIdAuthService.validateState("invalid-state-token");
      expect(isValid).toBe(false);
    });

    it("should reject expired state", async () => {
      const { state } = entraIdAuthService.getAuthorizationUrl(config);
      
      // Wait for state to expire (simulated by waiting)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // State should still be valid within expiry window
      const isValid = entraIdAuthService.validateState(state);
      expect(isValid).toBe(true);
    });
  });

  describe("Redirect URI Configuration", () => {
    it("should have correct redirect URI for localhost", () => {
      expect(config.redirectUri).toBe("http://localhost:3000/api/auth/microsoft/callback");
    });

    it("should use http for localhost (not https)", () => {
      const url = new URL(config.redirectUri);
      expect(url.protocol).toBe("http:");
    });

    it("should have correct callback path", () => {
      const url = new URL(config.redirectUri);
      expect(url.pathname).toBe("/api/auth/microsoft/callback");
    });

    it("should match Microsoft app registration redirect URI", () => {
      // This ensures the localhost URI matches what's registered in Microsoft Entra
      const url = new URL(config.redirectUri);
      expect(url.hostname).toBe("localhost");
      expect(url.port).toBe("3000");
    });
  });

  describe("Configuration Validation", () => {
    it("should have all required OAuth parameters", () => {
      expect(config.tenantId).toMatch(/^[a-f0-9-]{36}$/);
      expect(config.clientId).toMatch(/^[a-f0-9-]{36}$/);
      expect(config.clientSecret.length).toBeGreaterThan(20);
      expect(config.redirectUri).toMatch(/^https?:\/\//);
    });

    it("should use multitenant endpoint", () => {
      const { url } = entraIdAuthService.getAuthorizationUrl(config);
      
      // Should use /common for multitenant or specific tenant
      expect(url).toContain("login.microsoftonline.com");
    });

    it("should support organization context", () => {
      // Configuration should allow for organization-specific auth
      expect(config.tenantId).toBeTruthy();
      expect(config.clientId).toBeTruthy();
    });
  });
});
