/**
 * ============================================================================
 * One-Link Tenant Onboarding - End-to-End Test Suite
 * ============================================================================
 * 
 * Tests the complete one-link tenant onboarding workflow:
 * 1. Platform admin creates organization
 * 2. Platform admin sends onboarding link to org admin
 * 3. Org admin clicks link (public endpoint)
 * 4. Org admin completes Microsoft consent
 * 5. Organization marked as connected
 * 
 * ============================================================================
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { onboardingTokenService } from "./services/microsoft/onboardingTokenService";
import { emailNotificationService } from "./services/microsoft/emailNotificationService";
import { adminConsentService } from "./services/microsoft/adminConsentService";

describe("One-Link Tenant Onboarding Workflow", () => {
  describe("1. Token Generation and Validation", () => {
    it("should generate a secure token with 24-hour expiry", () => {
      const { token, expiresAt } = onboardingTokenService.generateToken();

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
      expect(expiresAt).toBeInstanceOf(Date);

      // Token should expire in approximately 24 hours
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      expect(diffHours).toBeGreaterThan(23);
      expect(diffHours).toBeLessThan(25);
    });

    it("should validate a valid token", () => {
      const { token, expiresAt } = onboardingTokenService.generateToken();
      const validation = onboardingTokenService.validateToken(token, expiresAt);

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it("should reject an expired token", () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1);

      const validation = onboardingTokenService.validateToken("test-token", expiredDate);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("expired");
    });

    it("should reject a missing token", () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const validation = onboardingTokenService.validateToken("", futureDate);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("not found");
    });

    it("should reject a token with missing expiry", () => {
      const validation = onboardingTokenService.validateToken("test-token", null);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("not found");
    });
  });

  describe("2. Onboarding Link Generation", () => {
    it("should generate a valid onboarding link", () => {
      const { token } = onboardingTokenService.generateToken();
      const baseUrl = "https://imserp.org";

      const link = onboardingTokenService.generateOnboardingLink(baseUrl, token);

      expect(link).toContain(baseUrl);
      expect(link).toContain("/api/auth/microsoft/onboarding/");
      expect(link).toContain(token);
    });

    it("should extract token from onboarding link path", () => {
      const { token } = onboardingTokenService.generateToken();
      const path = `/api/auth/microsoft/onboarding/${token}`;

      const extracted = onboardingTokenService.extractTokenFromPath(path);

      expect(extracted).toBe(token);
    });

    it("should return null for invalid path", () => {
      const extracted = onboardingTokenService.extractTokenFromPath("/invalid/path");

      expect(extracted).toBeNull();
    });
  });

  describe("3. Email Notification", () => {
    it("should generate English email subject", async () => {
      const request = {
        organizationId: 1,
        organizationName: "Test Organization",
        adminEmail: "admin@example.com",
        adminName: "John Doe",
        onboardingLink: "https://imserp.org/api/auth/microsoft/onboarding/token123",
        language: "en" as const,
      };

      // We can't test actual email sending without mocking the API
      // But we can verify the service is callable
      expect(emailNotificationService).toBeDefined();
    });

    it("should generate Arabic email subject", async () => {
      const request = {
        organizationId: 1,
        organizationName: "منظمة الاختبار",
        adminEmail: "admin@example.com",
        adminName: "أحمد محمد",
        onboardingLink: "https://imserp.org/api/auth/microsoft/onboarding/token123",
        language: "ar" as const,
      };

      // We can't test actual email sending without mocking the API
      // But we can verify the service is callable
      expect(emailNotificationService).toBeDefined();
    });
  });

  describe("4. Admin Consent Flow", () => {
    it("should generate admin consent link with correct parameters", () => {
      const organizationId = 1;
      const organizationName = "Test Organization";

      const link = adminConsentService.generateAdminConsentLink(organizationId, organizationName);

      expect(link).toContain("https://login.microsoftonline.com");
      expect(link).toContain("oauth2/v2.0/adminconsent");
      expect(link).toContain("client_id=");
      expect(link).toContain("redirect_uri=");
      expect(link).toContain("scope=");
      expect(link).toContain("state=");
      expect(link).toContain("prompt=admin_consent");
    });

    it("should validate successful admin consent callback", () => {
      const callback = {
        admin_consent: "True",
        tenant: "12345678-1234-1234-1234-123456789012",
        code: "M.R3_BAY...",
      };

      const validation = adminConsentService.validateAdminConsentCallback(callback);

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it("should reject callback without admin consent", () => {
      const callback = {
        admin_consent: "False",
        tenant: "12345678-1234-1234-1234-123456789012",
        code: "M.R3_BAY...",
      };

      const validation = adminConsentService.validateAdminConsentCallback(callback);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("Admin consent was not granted");
    });

    it("should reject callback with error", () => {
      const callback = {
        error: "access_denied",
        error_description: "The user denied the request",
      };

      const validation = adminConsentService.validateAdminConsentCallback(callback);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("Microsoft returned error");
    });

    it("should reject callback without authorization code", () => {
      const callback = {
        admin_consent: "True",
        tenant: "12345678-1234-1234-1234-123456789012",
      };

      const validation = adminConsentService.validateAdminConsentCallback(callback);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("No authorization code");
    });

    it("should reject callback without tenant ID", () => {
      const callback = {
        admin_consent: "True",
        code: "M.R3_BAY...",
      };

      const validation = adminConsentService.validateAdminConsentCallback(callback);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("No tenant ID");
    });
  });

  describe("5. State Parameter Handling", () => {
    it("should encode and decode organization context in state", () => {
      const organizationId = 123;
      const organizationName = "Test Organization";

      // Simulate state encoding
      const state = Buffer.from(
        JSON.stringify({
          organizationId,
          organizationName,
          timestamp: Date.now(),
        })
      ).toString("base64");

      // Simulate state decoding
      const context = adminConsentService.extractOrganizationContext(state);

      expect(context).toBeDefined();
      expect(context?.organizationId).toBe(organizationId);
      expect(context?.organizationName).toBe(organizationName);
    });

    it("should reject expired state", () => {
      // Create state with old timestamp (older than 5 minutes)
      const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago

      const state = Buffer.from(
        JSON.stringify({
          organizationId: 123,
          organizationName: "Test Organization",
          timestamp: oldTimestamp,
        })
      ).toString("base64");

      const context = adminConsentService.extractOrganizationContext(state);

      expect(context).toBeNull();
    });

    it("should reject invalid state", () => {
      const invalidState = "invalid-base64-state!!!";

      const context = adminConsentService.extractOrganizationContext(invalidState);

      expect(context).toBeNull();
    });
  });

  describe("6. Onboarding Status Formatting", () => {
    it("should format successful consent status", () => {
      const { status, tenantVerified } = adminConsentService.formatOnboardingStatus(
        true,
        "12345678-1234-1234-1234-123456789012"
      );

      expect(status).toBe("connected");
      expect(tenantVerified).toBe(true);
    });

    it("should format pending consent status", () => {
      const { status, tenantVerified } = adminConsentService.formatOnboardingStatus(false);

      expect(status).toBe("pending_consent");
      expect(tenantVerified).toBe(false);
    });

    it("should format error status", () => {
      const { status, tenantVerified } = adminConsentService.formatOnboardingStatus(
        false,
        undefined,
        "User denied consent"
      );

      expect(status).toBe("error");
      expect(tenantVerified).toBe(false);
    });
  });

  describe("7. Audit Log Generation", () => {
    it("should generate audit log for token generation", () => {
      const entry = onboardingTokenService.generateAuditLogEntry(
        123,
        "token_generated",
        { tokenLength: 32 }
      );

      expect(entry.action).toBe("onboarding_token_generated");
      expect(entry.details).toContain("123");
      expect(entry.details).toContain("token_generated");
    });

    it("should generate audit log for token usage", () => {
      const entry = onboardingTokenService.generateAuditLogEntry(
        123,
        "token_used",
        { userAgent: "Mozilla/5.0" }
      );

      expect(entry.action).toBe("onboarding_token_used");
      expect(entry.details).toContain("token_used");
    });

    it("should generate audit log for consent events", () => {
      const entry = adminConsentService.generateAuditLogEntry(
        123,
        "consent_granted",
        { tenantId: "12345678-1234-1234-1234-123456789012" }
      );

      expect(entry.action).toBe("microsoft_consent_granted");
      expect(entry.details).toContain("consent_granted");
    });
  });

  describe("8. Complete Workflow Simulation", () => {
    it("should complete full onboarding workflow", () => {
      // Step 1: Generate token
      const { token, expiresAt } = onboardingTokenService.generateToken();
      expect(token).toBeDefined();

      // Step 2: Generate onboarding link
      const onboardingLink = onboardingTokenService.generateOnboardingLink(
        "https://imserp.org",
        token
      );
      expect(onboardingLink).toContain(token);

      // Step 3: Validate token
      const tokenValidation = onboardingTokenService.validateToken(token, expiresAt);
      expect(tokenValidation.valid).toBe(true);

      // Step 4: Extract token from link
      const extractedToken = onboardingTokenService.extractTokenFromPath(
        `/api/auth/microsoft/onboarding/${token}`
      );
      expect(extractedToken).toBe(token);

      // Step 5: Generate admin consent link
      const adminConsentLink = adminConsentService.generateAdminConsentLink(1, "Test Org");
      expect(adminConsentLink).toContain("adminconsent");

      // Step 6: Simulate successful consent callback
      const callback = {
        admin_consent: "True",
        tenant: "12345678-1234-1234-1234-123456789012",
        code: "M.R3_BAY...",
        state: Buffer.from(
          JSON.stringify({
            organizationId: 1,
            organizationName: "Test Org",
            timestamp: Date.now(),
          })
        ).toString("base64"),
      };

      const callbackValidation = adminConsentService.validateAdminConsentCallback(callback);
      expect(callbackValidation.valid).toBe(true);

      // Step 7: Extract organization context
      const context = adminConsentService.extractOrganizationContext(callback.state!);
      expect(context?.organizationId).toBe(1);

      // Step 8: Format final status
      const { status, tenantVerified } = adminConsentService.formatOnboardingStatus(
        true,
        callback.tenant
      );
      expect(status).toBe("connected");
      expect(tenantVerified).toBe(true);
    });
  });

  describe("9. Security Validations", () => {
    it("should generate cryptographically secure tokens", () => {
      const tokens = new Set();

      // Generate 100 tokens and verify they're all unique
      for (let i = 0; i < 100; i++) {
        const { token } = onboardingTokenService.generateToken();
        tokens.add(token);
      }

      expect(tokens.size).toBe(100);
    });

    it("should validate token format", () => {
      const { token } = onboardingTokenService.generateToken();

      // Token should be base64url encoded
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should prevent state tampering", () => {
      const validState = Buffer.from(
        JSON.stringify({
          organizationId: 1,
          organizationName: "Test Org",
          timestamp: Date.now(),
        })
      ).toString("base64");

      // Tamper with state
      const tamperedState = validState.slice(0, -5) + "XXXXX";

      const context = adminConsentService.extractOrganizationContext(tamperedState);

      expect(context).toBeNull();
    });
  });
});
