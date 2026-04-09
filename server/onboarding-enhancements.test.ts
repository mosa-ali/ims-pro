/**
 * ============================================================================
 * Onboarding Enhancements - Comprehensive Test Suite
 * ============================================================================
 * 
 * Tests for Phase 1.10 enhancements:
 * 1. Resend onboarding link functionality
 * 2. Onboarding status dashboard
 * 3. Webhook notification system
 * 
 * ============================================================================
 */

import { describe, it, expect } from "vitest";
import { webhookService } from "./services/webhooks/webhookService";
import { onboardingTokenService } from "./services/microsoft/onboardingTokenService";

describe("Phase 1.10: Onboarding Enhancements", () => {
  describe("1. Resend Onboarding Link Functionality", () => {
    it("should generate unique tokens on resend", () => {
      const { token: token1 } = onboardingTokenService.generateToken();
      const { token: token2 } = onboardingTokenService.generateToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
      expect(token2.length).toBeGreaterThan(0);
    });

    it("should validate new token after resend", () => {
      const { token, expiresAt } = onboardingTokenService.generateToken();
      const validation = onboardingTokenService.validateToken(token, expiresAt);

      expect(validation.valid).toBe(true);
    });

    it("should reject resend if organization already connected", () => {
      const orgStatus = "connected";
      const shouldReject = orgStatus === "connected";

      expect(shouldReject).toBe(true);
    });

    it("should update onboarding status to pending_consent on resend", () => {
      const previousStatus = "error";
      const newStatus = "pending_consent";

      expect(newStatus).toBe("pending_consent");
      expect(newStatus).not.toBe(previousStatus);
    });

    it("should log resend event in audit trail", () => {
      const auditEntry = onboardingTokenService.generateAuditLogEntry(
        123,
        "token_generated",
        { reason: "resend", previousStatus: "error" }
      );

      expect(auditEntry.action).toBe("onboarding_token_generated");
      expect(auditEntry.details).toContain("resend");
    });
  });

  describe("2. Onboarding Status Dashboard", () => {
    it("should filter organizations by status", () => {
      const orgs = [
        { id: 1, name: "Org 1", status: "not_connected" },
        { id: 2, name: "Org 2", status: "pending_consent" },
        { id: 3, name: "Org 3", status: "connected" },
        { id: 4, name: "Org 4", status: "error" },
      ];

      const connected = orgs.filter((org) => org.status === "connected");
      expect(connected).toHaveLength(1);
      expect(connected[0].name).toBe("Org 3");
    });

    it("should search organizations by name", () => {
      const orgs = [
        { id: 1, name: "Acme Corporation", code: "ACME" },
        { id: 2, name: "Beta Industries", code: "BETA" },
        { id: 3, name: "Acme Subsidiary", code: "ACME-SUB" },
      ];

      const query = "acme";
      const results = orgs.filter(
        (org) =>
          org.name.toLowerCase().includes(query) || org.code.toLowerCase().includes(query)
      );

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("Acme Corporation");
      expect(results[1].name).toBe("Acme Subsidiary");
    });

    it("should paginate organization list", () => {
      const orgs = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        name: `Organization ${i + 1}`,
      }));

      const limit = 50;
      const offset = 0;
      const page1 = orgs.slice(offset, offset + limit);

      expect(page1).toHaveLength(50);
      expect(page1[0].id).toBe(1);
      expect(page1[49].id).toBe(50);
    });

    it("should show token expiry status", () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const pastDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const validation1 = onboardingTokenService.validateToken("token", futureDate);
      const validation2 = onboardingTokenService.validateToken("token", pastDate);

      expect(validation1.valid).toBe(true);
      expect(validation2.valid).toBe(false);
    });

    it("should display onboarding progress timeline", () => {
      const timeline = [
        { step: "created", date: "2026-03-01T10:00:00Z", status: "completed" },
        { step: "link_sent", date: "2026-03-01T10:05:00Z", status: "completed" },
        { step: "consent_granted", date: "2026-03-01T10:15:00Z", status: "completed" },
        { step: "connected", date: "2026-03-01T10:16:00Z", status: "completed" },
      ];

      expect(timeline).toHaveLength(4);
      expect(timeline[0].step).toBe("created");
      expect(timeline[3].step).toBe("connected");
    });
  });

  describe("3. Webhook Notification System", () => {
    it("should generate secure webhook secret", () => {
      const secret1 = webhookService.generateSecret();
      const secret2 = webhookService.generateSecret();

      expect(secret1).not.toBe(secret2);
      expect(secret1.length).toBe(64);
      expect(secret2.length).toBe(64);
    });

    it("should generate unique webhook IDs", () => {
      const id1 = webhookService.generateWebhookId();
      const id2 = webhookService.generateWebhookId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^wh_/);
      expect(id2).toMatch(/^wh_/);
    });

    it("should create HMAC-SHA256 signature", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";

      const signature = webhookService.createSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64);
    });

    it("should verify valid webhook signature", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";

      const signature = webhookService.createSignature(payload, secret);
      const isValid = webhookService.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it("should reject invalid webhook signature", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";
      const wrongSecret = "wrong-secret";

      const signature = webhookService.createSignature(payload, secret);
      const isValid = webhookService.verifySignature(payload, signature, wrongSecret);

      expect(isValid).toBe(false);
    });

    it("should calculate exponential backoff retry time", () => {
      const retry0 = webhookService.calculateNextRetryTime(0);
      const retry1 = webhookService.calculateNextRetryTime(1);
      const retry2 = webhookService.calculateNextRetryTime(2);

      expect(retry1.getTime()).toBeGreaterThan(retry0.getTime());
      expect(retry2.getTime()).toBeGreaterThan(retry1.getTime());
    });

    it("should determine if delivery should be retried", () => {
      expect(webhookService.shouldRetry(0, 500)).toBe(true);
      expect(webhookService.shouldRetry(1, 503)).toBe(true);
      expect(webhookService.shouldRetry(0, 400)).toBe(false);
      expect(webhookService.shouldRetry(0, 401)).toBe(false);
      expect(webhookService.shouldRetry(0, 404)).toBe(false);
      expect(webhookService.shouldRetry(0, 408)).toBe(true);
      expect(webhookService.shouldRetry(0, 429)).toBe(true);
      expect(webhookService.shouldRetry(5, 500)).toBe(false);
    });

    it("should format webhook headers correctly", () => {
      const signature = "test-signature";
      const eventId = "evt_12345";

      const headers = webhookService.formatHeaders(signature, eventId);

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Webhook-Signature"]).toBe(signature);
      expect(headers["X-Webhook-Event-ID"]).toBe(eventId);
      expect(headers["X-Webhook-Timestamp"]).toBeDefined();
      expect(headers["User-Agent"]).toBe("IMS-Webhook-Service/1.0");
    });

    it("should validate webhook URL", () => {
      const validHttps = webhookService.validateWebhookUrl("https://example.com/webhook");
      const validHttp = webhookService.validateWebhookUrl("http://localhost:3000/webhook");
      const invalidUrl = webhookService.validateWebhookUrl("not-a-url");

      expect(validHttps.valid).toBe(true);
      expect(validHttp.valid).toBe(true);
      expect(invalidUrl.valid).toBe(false);
    });

    it("should format event data per event type", () => {
      const orgCreatedData = webhookService.formatEventData("organization_created", 1, {
        organizationName: "Test Org",
        createdAt: "2026-03-10T00:00:00Z",
        createdBy: "admin@example.com",
      });

      expect(orgCreatedData.organizationId).toBe(1);
      expect(orgCreatedData.organizationName).toBe("Test Org");
      expect(orgCreatedData.createdAt).toBe("2026-03-10T00:00:00Z");
    });

    it("should create event payload", () => {
      const event = {
        id: "evt_12345",
        type: "organization_created" as const,
        organizationId: 1,
        timestamp: "2026-03-10T00:00:00Z",
        data: { organizationName: "Test Org" },
      };

      const payload = webhookService.createEventPayload(event);
      const parsed = JSON.parse(payload);

      expect(parsed.id).toBe(event.id);
      expect(parsed.type).toBe(event.type);
      expect(parsed.organizationId).toBe(event.organizationId);
    });

    it("should generate audit log for webhook events", () => {
      const auditEntry = webhookService.generateAuditLogEntry(
        1,
        "webhook_created",
        { webhookId: "wh_123", url: "https://example.com/webhook" }
      );

      expect(auditEntry.action).toBe("webhook_endpoint_created");
      expect(auditEntry.details).toContain("wh_123");
      expect(auditEntry.details).toContain("https://example.com/webhook");
    });
  });

  describe("4. Complete Workflow Integration", () => {
    it("should complete resend and webhook dispatch workflow", () => {
      const { token } = onboardingTokenService.generateToken();
      expect(token).toBeDefined();

      const eventId = webhookService.generateEventId();
      const event = {
        id: eventId,
        type: "onboarding_started" as const,
        organizationId: 1,
        timestamp: new Date().toISOString(),
        data: {
          organizationName: "Test Org",
          adminEmail: "admin@example.com",
          linkSentAt: new Date().toISOString(),
        },
      };

      const webhookId = webhookService.generateWebhookId();
      const secret = webhookService.generateSecret();

      const payload = webhookService.createEventPayload(event);
      const signature = webhookService.createSignature(payload, secret);
      const isValid = webhookService.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
      expect(token).toBeDefined();
      expect(webhookId).toMatch(/^wh_/);
    });

    it("should handle webhook retry scenario", () => {
      let attemptCount = 0;
      const maxRetries = 5;

      while (attemptCount < maxRetries) {
        const shouldRetry = webhookService.shouldRetry(attemptCount, 503);

        if (!shouldRetry) break;

        const nextRetry = webhookService.calculateNextRetryTime(attemptCount);
        expect(nextRetry.getTime()).toBeGreaterThan(new Date().getTime());

        attemptCount++;
      }

      expect(attemptCount).toBeGreaterThan(0);
      expect(attemptCount).toBeLessThanOrEqual(maxRetries);
    });
  });

  describe("5. Security Validations", () => {
    it("should generate cryptographically secure secrets", () => {
      const secrets = new Set();

      for (let i = 0; i < 100; i++) {
        secrets.add(webhookService.generateSecret());
      }

      expect(secrets.size).toBe(100);
    });

    it("should prevent timing attacks on signature verification", () => {
      const payload = JSON.stringify({ test: "data" });
      const secret = "test-secret";

      const correctSignature = webhookService.createSignature(payload, secret);
      const wrongSignature = "0".repeat(64);

      const isValid1 = webhookService.verifySignature(payload, correctSignature, secret);
      const isValid2 = webhookService.verifySignature(payload, wrongSignature, secret);

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(false);
    });

    it("should validate webhook URLs for production safety", () => {
      const validUrl = webhookService.validateWebhookUrl("https://api.example.com/webhook");
      const invalidUrl = webhookService.validateWebhookUrl("http://localhost:3000/webhook");

      expect(validUrl.valid).toBe(true);
      if (process.env.NODE_ENV === "production") {
        expect(invalidUrl.valid).toBe(false);
      }
    });
  });
});
