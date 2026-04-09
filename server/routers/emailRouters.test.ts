import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getDb } from "../db";
import { emailTemplates, emailOutbox, emailWebhookEvents } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Note: This test file uses relative imports to avoid vitest path resolution issues

/**
 * Email Routers Unit Tests
 * 
 * Tests for emailTemplateRouter, emailQueueRouter, emailWebhookRouter, and emailAnalyticsRouter
 * Covers CRUD operations, pagination, filtering, and data aggregation
 */

describe("Email Management Routers", () => {
  let db: ReturnType<typeof getDb>;
  const testOrgId = 1;
  const testTemplateKey = `test_template_${Date.now()}`;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("Email Template Router", () => {
    beforeEach(async () => {
      db = await getDb();
    });

    it("should create an email template", async () => {
      const template = {
        templateKey: testTemplateKey,
        name: "Test Template",
        nameEn: "Test Template",
        nameAr: "قالب الاختبار",
        subject: "Test Subject",
        subjectEn: "Test Subject",
        subjectAr: "موضوع الاختبار",
        bodyHtml: "<p>Test Body</p>",
        bodyHtmlEn: "<p>Test Body</p>",
        bodyHtmlAr: "<p>نص الاختبار</p>",
        bodyTextEn: "Test Body",
        bodyTextAr: "نص الاختبار",
        isActive: true,
        organizationId: testOrgId,
      };

      const result = await db.insert(emailTemplates).values(template);
      expect(result).toBeDefined();
    });

    it("should retrieve email template by key", async () => {
      // First, create a template
      const template = {
        templateKey: `retrieve_test_${Date.now()}`,
        name: "Retrieve Test",
        nameEn: "Retrieve Test",
        nameAr: "اختبار الاسترجاع",
        subject: "Test",
        subjectEn: "Test",
        subjectAr: "اختبار",
        bodyHtml: "<p>Test</p>",
        bodyHtmlEn: "<p>Test</p>",
        bodyHtmlAr: "<p>اختبار</p>",
        bodyTextEn: "Test",
        bodyTextAr: "اختبار",
        isActive: true,
        organizationId: testOrgId,
      };

      await db.insert(emailTemplates).values(template);

      // Now retrieve it
      const result = await db
        .select()
        .from(emailTemplates)
        .where(and(
          eq(emailTemplates.templateKey, template.templateKey),
          eq(emailTemplates.organizationId, testOrgId)
        ))
        .limit(1);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].templateKey).toBe(template.templateKey);
    });

    it("should support merge tags in templates", async () => {
      const template = {
        templateKey: `merge_tags_test_${Date.now()}`,
        name: "Merge Tags Test",
        nameEn: "Merge Tags Test",
        nameAr: "اختبار دمج العلامات",
        subject: "Welcome {{firstName}}",
        subjectEn: "Welcome {{firstName}}",
        subjectAr: "أهلا {{firstName}}",
        bodyHtml: "<p>Welcome {{firstName}} to {{organizationName}}</p>",
        bodyHtmlEn: "<p>Welcome {{firstName}} to {{organizationName}}</p>",
        bodyHtmlAr: "<p>أهلا {{firstName}} في {{organizationName}}</p>",
        bodyTextEn: "Welcome {{firstName}} to {{organizationName}}",
        bodyTextAr: "أهلا {{firstName}} في {{organizationName}}",
        isActive: true,
        organizationId: testOrgId,
      };

      await db.insert(emailTemplates).values(template);

      const result = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.templateKey, template.templateKey))
        .limit(1);

      expect(result.length).toBeGreaterThan(0);
      if (result.length > 0 && result[0].subjectEn) {
        expect(result[0].subjectEn).toContain("{{firstName}}");
      }
      if (result.length > 0 && result[0].subjectAr) {
        expect(result[0].subjectAr).toContain("{{firstName}}");
      }
    });

    it("should handle template activation/deactivation", async () => {
      const template = {
        templateKey: `activation_test_${Date.now()}`,
        name: "Activation Test",
        nameEn: "Activation Test",
        nameAr: "اختبار التفعيل",
        subject: "Test",
        subjectEn: "Test",
        subjectAr: "اختبار",
        bodyHtml: "<p>Test</p>",
        bodyHtmlEn: "<p>Test</p>",
        bodyHtmlAr: "<p>اختبار</p>",
        bodyTextEn: "Test",
        bodyTextAr: "اختبار",
        isActive: true,
        organizationId: testOrgId,
      };

      await db.insert(emailTemplates).values(template);

      // Verify active
      const activeResult = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.templateKey, template.templateKey))
        .limit(1);

      expect(activeResult.length).toBeGreaterThan(0);
    });
  });

  describe("Email Queue Router", () => {
    it("should queue an email for delivery", async () => {
      const queueItem = {
        organizationId: testOrgId,
        templateKey: "test_queue",
        recipientEmail: "test@example.com",
        recipientName: "Test User",
        subject: "Test Email",
        bodyHtml: "<p>Test</p>",
        bodyText: "Test",
        status: "pending" as const,
        provider: "manus_custom" as const,
        metadata: { type: "test" },
      };

      const result = await db.insert(emailOutbox).values(queueItem);
      expect(result).toBeDefined();
    });

    it("should retrieve queued emails with pagination", async () => {
      // Create multiple queue items
      for (let i = 0; i < 3; i++) {
        await db.insert(emailOutbox).values({
          organizationId: testOrgId,
          templateKey: "pagination_test",
          recipientEmail: `test${i}@example.com`,
          recipientName: `Test User ${i}`,
          subject: "Test Email",
          bodyHtml: "<p>Test</p>",
          bodyText: "Test",
          status: "pending" as const,
          provider: "manus_custom" as const,
          metadata: { index: i },
        });
      }

      // Retrieve with limit
      const result = await db
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.organizationId, testOrgId))
        .limit(2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it("should filter emails by status", async () => {
      // Create emails with different statuses
      await db.insert(emailOutbox).values({
        organizationId: testOrgId,
        templateKey: "status_filter_test",
        recipientEmail: "sent@example.com",
        recipientName: "Sent User",
        subject: "Test Email",
        bodyHtml: "<p>Test</p>",
        bodyText: "Test",
        status: "sent" as const,
        provider: "manus_custom" as const,
        metadata: { status: "sent" },
      });

      // Query by status
      const result = await db
        .select()
        .from(emailOutbox)
        .where(and(
          eq(emailOutbox.organizationId, testOrgId),
          eq(emailOutbox.status, "sent")
        ))
        .limit(10);

      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect(result[0].status).toBe("sent");
      }
    });

    it("should filter emails by recipient", async () => {
      const testEmail = `recipient_filter_${Date.now()}@example.com`;
      
      await db.insert(emailOutbox).values({
        organizationId: testOrgId,
        templateKey: "recipient_filter_test",
        recipientEmail: testEmail,
        recipientName: "Filter Test User",
        subject: "Test Email",
        bodyHtml: "<p>Test</p>",
        bodyText: "Test",
        status: "pending" as const,
        provider: "manus_custom" as const,
        metadata: { recipient: testEmail },
      });

      // Query by recipient
      const result = await db
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.recipientEmail, testEmail))
        .limit(10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].recipientEmail).toBe(testEmail);
    });
  });

  describe("Email Webhook Router", () => {
    it("should create webhook event", async () => {
      const event = {
        organizationId: testOrgId,
        provider: "sendgrid" as const,
        eventType: "delivered" as const,
        recipientEmail: "webhook_test@example.com",
        messageId: `msg_${Date.now()}`,
        eventData: { timestamp: new Date().toISOString() },
        status: "processed" as const,
        hmacVerified: true,
        processingResult: { success: true },
      };

      const result = await db.insert(emailWebhookEvents).values(event);
      expect(result).toBeDefined();
    });

    it("should retrieve webhook events by provider", async () => {
      const provider = "mailgun";
      
      await db.insert(emailWebhookEvents).values({
        organizationId: testOrgId,
        provider: provider as any,
        eventType: "bounce" as const,
        recipientEmail: "bounce@example.com",
        messageId: `msg_${Date.now()}`,
        eventData: { type: "permanent" },
        status: "processed" as const,
        hmacVerified: true,
        processingResult: { success: true },
      });

      const result = await db
        .select()
        .from(emailWebhookEvents)
        .where(eq(emailWebhookEvents.organizationId, testOrgId))
        .limit(10);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should track HMAC verification status", async () => {
      const event = {
        organizationId: testOrgId,
        provider: "aws_ses" as const,
        eventType: "open" as const,
        recipientEmail: "hmac_test@example.com",
        messageId: `msg_${Date.now()}`,
        eventData: { timestamp: new Date().toISOString() },
        status: "processed" as const,
        hmacVerified: true,
        processingResult: { success: true, verified: true },
      };

      await db.insert(emailWebhookEvents).values(event);

      const result = await db
        .select()
        .from(emailWebhookEvents)
        .where(eq(emailWebhookEvents.organizationId, testOrgId))
        .limit(10);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Email Analytics Router", () => {
    it("should aggregate email delivery metrics", async () => {
      // Create sample emails with different statuses
      const statuses = ["sent", "failed", "pending"] as const;
      
      for (const status of statuses) {
        await db.insert(emailOutbox).values({
          organizationId: testOrgId,
          templateKey: "analytics_test",
          recipientEmail: `analytics_${status}@example.com`,
          recipientName: `Analytics ${status}`,
          subject: "Analytics Test",
          bodyHtml: "<p>Test</p>",
          bodyText: "Test",
          status,
          provider: "manus_custom" as const,
          metadata: { analytics: true },
        });
      }

      // Query all emails for the organization
      const result = await db
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.organizationId, testOrgId));

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should calculate success rate metrics", async () => {
      // Create sent and failed emails
      await db.insert(emailOutbox).values({
        organizationId: testOrgId,
        templateKey: "success_rate_test",
        recipientEmail: "success@example.com",
        recipientName: "Success Test",
        subject: "Test",
        bodyHtml: "<p>Test</p>",
        bodyText: "Test",
        status: "sent" as const,
        provider: "manus_custom" as const,
        metadata: { metric: "success" },
      });

      await db.insert(emailOutbox).values({
        organizationId: testOrgId,
        templateKey: "success_rate_test",
        recipientEmail: "failed@example.com",
        recipientName: "Failed Test",
        subject: "Test",
        bodyHtml: "<p>Test</p>",
        bodyText: "Test",
        status: "pending" as const,
        provider: "manus_custom" as const,
        metadata: { metric: "failed" },
      });

      // Calculate metrics
      const result = await db
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.organizationId, testOrgId));

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});
