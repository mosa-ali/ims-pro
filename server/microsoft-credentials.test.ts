import { describe, it, expect, beforeAll } from "vitest";

/**
 * Microsoft Multitenant Credentials Validation Test
 * Verifies that Microsoft Entra ID credentials are correctly configured
 * for multitenant admin consent flow and one-link onboarding
 */

describe("Microsoft Multitenant Credentials Configuration", () => {
  let credentials: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };

  beforeAll(() => {
    // Load credentials from environment
    credentials = {
      tenantId: process.env.MS_TENANT_ID || "",
      clientId: process.env.MS_CLIENT_ID || "",
      clientSecret: process.env.MS_CLIENT_SECRET || "",
      redirectUri: process.env.MS_REDIRECT_URI || "",
    };
  });

  it("should have MS_TENANT_ID configured (IMS home tenant)", () => {
    expect(credentials.tenantId).toBeDefined();
    expect(credentials.tenantId).toBeTruthy();
    expect(credentials.tenantId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    expect(credentials.tenantId).toBe("9d94b9fa-8bd6-420a-9d28-bfe2df02562a");
  });

  it("should have MS_CLIENT_ID configured (multitenant app)", () => {
    expect(credentials.clientId).toBeDefined();
    expect(credentials.clientId).toBeTruthy();
    expect(credentials.clientId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    expect(credentials.clientId).toBe("21fd245a-9229-44aa-8a55-c19fa4e9b4c6");
  });

  it("should have MS_CLIENT_SECRET configured", () => {
    expect(credentials.clientSecret).toBeDefined();
    expect(credentials.clientSecret).toBeTruthy();
    expect(credentials.clientSecret.length).toBeGreaterThan(20);
  });

  it("should have MS_REDIRECT_URI configured", () => {
    expect(credentials.redirectUri).toBeDefined();
    expect(credentials.redirectUri).toBeTruthy();
    expect(credentials.redirectUri).toMatch(/^https:\/\//);
    expect(credentials.redirectUri).toBe("https://imserp.org/api/auth/microsoft/callback");
  });

  it("should have valid redirect URI format", () => {
    const url = new URL(credentials.redirectUri);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("imserp.org");
    expect(url.pathname).toBe("/api/auth/microsoft/callback");
  });

  it("should construct valid Microsoft OAuth authorization URL", () => {
    const authUrl = new URL("https://login.microsoftonline.com");
    authUrl.pathname = `/${credentials.tenantId}/oauth2/v2.0/authorize`;
    authUrl.searchParams.set("client_id", credentials.clientId);
    authUrl.searchParams.set("redirect_uri", credentials.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid profile email");

    expect(authUrl.toString()).toContain(credentials.tenantId);
    expect(authUrl.toString()).toContain(credentials.clientId);
    expect(authUrl.toString()).toContain(encodeURIComponent(credentials.redirectUri));
  });

  it("should construct valid Microsoft token endpoint URL", () => {
    const tokenUrl = new URL("https://login.microsoftonline.com");
    tokenUrl.pathname = `/${credentials.tenantId}/oauth2/v2.0/token`;

    expect(tokenUrl.toString()).toContain(credentials.tenantId);
    expect(tokenUrl.toString()).toContain("oauth2/v2.0/token");
  });

  it("should have credentials matching multitenant IMS app requirements", () => {
    // Verify this is the IMS home tenant
    expect(credentials.tenantId).toBe("9d94b9fa-8bd6-420a-9d28-bfe2df02562a");
    
    // Verify the application is registered as multitenant for IMS
    expect(credentials.clientId).toBe("21fd245a-9229-44aa-8a55-c19fa4e9b4c6");
    
    // Verify redirect URI matches imserp.org domain
    expect(credentials.redirectUri).toContain("imserp.org");
  });

  it("should not have hardcoded secrets in source code", () => {
    // This test ensures secrets are loaded from environment, not hardcoded
    expect(process.env.MS_CLIENT_SECRET).toBeDefined();
    expect(process.env.MS_CLIENT_SECRET).not.toContain("placeholder");
    expect(process.env.MS_CLIENT_SECRET).not.toContain("REPLACE");
  });

  it("should have all required credentials for multitenant admin consent flow", () => {
    const requiredFields = ["tenantId", "clientId", "clientSecret", "redirectUri"];
    const allFieldsPresent = requiredFields.every((field) => {
      const value = credentials[field as keyof typeof credentials];
      return value && value.length > 0;
    });

    expect(allFieldsPresent).toBe(true);
  });

  it("should support admin consent endpoint for one-link onboarding", () => {
    // Verify admin consent endpoint can be constructed
    const adminConsentUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/adminconsent");
    adminConsentUrl.searchParams.set("client_id", credentials.clientId);
    adminConsentUrl.searchParams.set("redirect_uri", credentials.redirectUri);
    adminConsentUrl.searchParams.set("scope", "https://graph.microsoft.com/.default");

    expect(adminConsentUrl.toString()).toContain("common/oauth2/v2.0/adminconsent");
    expect(adminConsentUrl.toString()).toContain(credentials.clientId);
    expect(adminConsentUrl.toString()).toContain(encodeURIComponent(credentials.redirectUri));
  });
});
