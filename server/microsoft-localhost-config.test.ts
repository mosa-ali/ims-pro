import { describe, it, expect, beforeAll } from "vitest";

/**
 * Microsoft Entra ID Localhost Configuration Test
 * Validates that Microsoft OAuth environment variables are correctly configured
 * for localhost development and testing
 */

describe("Microsoft Entra ID Localhost Configuration", () => {
  let config: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };

  beforeAll(() => {
    // Load configuration from environment
    config = {
      tenantId: process.env.MS_TENANT_ID || "",
      clientId: process.env.MS_CLIENT_ID || "",
      clientSecret: process.env.MS_CLIENT_SECRET || "",
      redirectUri: process.env.MS_REDIRECT_URI || "",
    };
  });

  it("should have MS_TENANT_ID configured", () => {
    expect(config.tenantId).toBeDefined();
    expect(config.tenantId).toBeTruthy();
    expect(config.tenantId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });

  it("should have MS_CLIENT_ID configured", () => {
    expect(config.clientId).toBeDefined();
    expect(config.clientId).toBeTruthy();
    expect(config.clientId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });

  it("should have MS_CLIENT_SECRET configured", () => {
    expect(config.clientSecret).toBeDefined();
    expect(config.clientSecret).toBeTruthy();
    expect(config.clientSecret.length).toBeGreaterThan(20);
  });

  it("should have MS_REDIRECT_URI configured for localhost", () => {
    expect(config.redirectUri).toBeDefined();
    expect(config.redirectUri).toBeTruthy();
  });

  it("should have valid localhost redirect URI format", () => {
    const url = new URL(config.redirectUri);
    expect(url.protocol).toBe("http:");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("3000");
    expect(url.pathname).toBe("/api/auth/microsoft/callback");
  });

  it("should match expected localhost redirect URI", () => {
    expect(config.redirectUri).toBe("http://localhost:3000/api/auth/microsoft/callback");
  });

  it("should have valid configuration for OAuth flow", () => {
    expect(config.tenantId).toBeTruthy();
    expect(config.clientId).toBeTruthy();
    expect(config.clientSecret).toBeTruthy();
    expect(config.redirectUri).toContain("/api/auth/microsoft/callback");
  });
});
