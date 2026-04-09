import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { emailQueueService } from "./emailQueueService";
import { getDb } from "../db";
import { emailOutbox } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Email Queue Service", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.delete(emailOutbox).where(eq(emailOutbox.recipientEmail, "test@example.com"));
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });

  it("should queue an email successfully", async () => {
    const result = await emailQueueService.queueEmail({
      organizationId: 1,
      recipientEmail: "test@example.com",
      recipientName: "Test User",
      subject: "Test Email",
      htmlContent: "<p>Test HTML</p>",
      textContent: "Test text",
      emailType: "onboarding",
      language: "en",
      metadata: { test: true },
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeGreaterThan(0);
  });

  it("should store email in database with correct fields", async () => {
    const queueResult = await emailQueueService.queueEmail({
      organizationId: 2,
      recipientEmail: "test2@example.com",
      recipientName: "Test User 2",
      subject: "Test Email 2",
      htmlContent: "<p>Test HTML 2</p>",
      textContent: "Test text 2",
      emailType: "password_reset",
      language: "ar",
      metadata: { userId: 123 },
    });

    expect(queueResult.success).toBe(true);

    // Verify email was stored in database
    const [storedEmail] = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.id, queueResult.id));

    expect(storedEmail).toBeDefined();
    expect(storedEmail.organizationId).toBe(2);
    expect(storedEmail.recipientEmail).toBe("test2@example.com");
    expect(storedEmail.recipientName).toBe("Test User 2");
    expect(storedEmail.subject).toBe("Test Email 2");
    expect(storedEmail.bodyHtml).toBe("<p>Test HTML 2</p>");
    expect(storedEmail.bodyText).toBe("Test text 2");
    expect(storedEmail.status).toBe("pending");
    expect(storedEmail.retryCount).toBe(0);
    expect(storedEmail.maxRetries).toBe(5);
    expect(storedEmail.templateKey).toBe("password_reset");
  });

  it("should handle multiple emails in queue", async () => {
    const emails = [
      {
        organizationId: 3,
        recipientEmail: "test3@example.com",
        recipientName: "Test User 3",
        subject: "Email 3",
        htmlContent: "<p>HTML 3</p>",
        textContent: "Text 3",
        emailType: "notification" as const,
        language: "en" as const,
      },
      {
        organizationId: 4,
        recipientEmail: "test4@example.com",
        recipientName: "Test User 4",
        subject: "Email 4",
        htmlContent: "<p>HTML 4</p>",
        textContent: "Text 4",
        emailType: "request_access" as const,
        language: "ar" as const,
      },
    ];

    const results = await Promise.all(
      emails.map((email) => emailQueueService.queueEmail(email))
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[0].id).not.toBe(results[1].id);
  });

  it("should set correct default values for new emails", async () => {
    const result = await emailQueueService.queueEmail({
      organizationId: 5,
      recipientEmail: "test5@example.com",
      recipientName: "Test User 5",
      subject: "Test Email 5",
      htmlContent: "<p>Test HTML 5</p>",
      textContent: "Test text 5",
      emailType: "onboarding",
      language: "en",
    });

    const [storedEmail] = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.id, result.id));

    expect(storedEmail.status).toBe("pending");
    expect(storedEmail.retryCount).toBe(0);
    expect(storedEmail.maxRetries).toBe(5);
    expect(storedEmail.lastError).toBeNull();
    expect(storedEmail.sentAt).toBeNull();
    expect(storedEmail.nextRetryAt).toBeNull();
    expect(storedEmail.completedAt).toBeNull();
    expect(storedEmail.createdAt).toBeDefined();
  });

  it("should handle emails with metadata", async () => {
    const metadata = {
      organizationName: "Test Org",
      userId: 999,
      campaignId: "camp123",
      customField: "customValue",
    };

    const result = await emailQueueService.queueEmail({
      organizationId: 6,
      recipientEmail: "test6@example.com",
      recipientName: "Test User 6",
      subject: "Test Email 6",
      htmlContent: "<p>Test HTML 6</p>",
      textContent: "Test text 6",
      emailType: "notification",
      language: "en",
      metadata,
    });

    const [storedEmail] = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.id, result.id));

    expect(storedEmail.metadata).toEqual(metadata);
  });

  it("should support both English and Arabic languages", async () => {
    const enResult = await emailQueueService.queueEmail({
      organizationId: 7,
      recipientEmail: "test7en@example.com",
      recipientName: "Test User EN",
      subject: "Test Email EN",
      htmlContent: "<p>Test HTML EN</p>",
      textContent: "Test text EN",
      emailType: "onboarding",
      language: "en",
    });

    const arResult = await emailQueueService.queueEmail({
      organizationId: 8,
      recipientEmail: "test7ar@example.com",
      recipientName: "Test User AR",
      subject: "Test Email AR",
      htmlContent: "<p>Test HTML AR</p>",
      textContent: "Test text AR",
      emailType: "onboarding",
      language: "ar",
    });

    // Verify both emails were queued successfully
    expect(enResult.success).toBe(true);
    expect(arResult.success).toBe(true);
    expect(enResult.id).toBeGreaterThan(0);
    expect(arResult.id).toBeGreaterThan(0);
  });

  it("should generate unique IDs for each queued email", async () => {
    const results = await Promise.all([
      emailQueueService.queueEmail({
        organizationId: 9,
        recipientEmail: "test9a@example.com",
        recipientName: "Test User 9A",
        subject: "Email 9A",
        htmlContent: "<p>HTML 9A</p>",
        textContent: "Text 9A",
        emailType: "notification",
        language: "en",
      }),
      emailQueueService.queueEmail({
        organizationId: 9,
        recipientEmail: "test9b@example.com",
        recipientName: "Test User 9B",
        subject: "Email 9B",
        htmlContent: "<p>HTML 9B</p>",
        textContent: "Text 9B",
        emailType: "notification",
        language: "en",
      }),
    ]);

    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(2); // All IDs should be unique
  });
});
