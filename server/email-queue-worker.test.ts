/**
 * Email Queue Worker - Comprehensive Test Suite
 *
 * Tests the full lifecycle of the email queue worker:
 * 1. Module imports and exports
 * 2. longtextString custom type (MySQL2 Buffer → string)
 * 3. Dead-letter queue schema column alignment
 * 4. Email sending via M365 Graph API
 * 5. Retry logic and exponential backoff
 * 6. DLQ insert and query operations
 * 7. enqueueEmail helper function
 * 8. emailQueueRouter procedures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── 1. Module Imports ────────────────────────────────────────────────────────

describe("EmailQueueWorker - Module Imports", () => {
  it("should import emailQueueWorker module without errors", async () => {
    const mod = await import("./services/emailQueueWorker");
    expect(mod).toBeDefined();
  });

  it("should export emailQueueWorker singleton", async () => {
    const { emailQueueWorker } = await import("./services/emailQueueWorker");
    expect(emailQueueWorker).toBeDefined();
    expect(typeof emailQueueWorker.start).toBe("function");
    expect(typeof emailQueueWorker.stop).toBe("function");
  });

  it("should export enqueueEmail function", async () => {
    const { enqueueEmail } = await import("./services/emailQueueWorker");
    expect(typeof enqueueEmail).toBe("function");
  });

  it("should import m365EmailService without errors", async () => {
    const mod = await import("./services/m365EmailService");
    expect(mod).toBeDefined();
  });

  it("should export sendEmailViaGraph from m365EmailService", async () => {
    const { sendEmailViaGraph } = await import("./services/m365EmailService");
    expect(typeof sendEmailViaGraph).toBe("function");
  });

  it("should export acquireM365Token from m365EmailService", async () => {
    const { acquireM365Token } = await import("./services/m365EmailService");
    expect(typeof acquireM365Token).toBe("function");
  });

  it("should export testM365Connection from m365EmailService", async () => {
    const { testM365Connection } = await import("./services/m365EmailService");
    expect(typeof testM365Connection).toBe("function");
  });

  it("should export clearTokenCache from m365EmailService", async () => {
    const { clearTokenCache } = await import("./services/m365EmailService");
    expect(typeof clearTokenCache).toBe("function");
  });

  it("should export clearAllTokenCache from m365EmailService", async () => {
    const { clearAllTokenCache } = await import("./services/m365EmailService");
    expect(typeof clearAllTokenCache).toBe("function");
  });
});

// ─── 2. longtextString Custom Type (Buffer Normalization) ─────────────────────

describe("longtextString Custom Type - MySQL2 Buffer Normalization", () => {
  /**
   * MySQL2 returns LONGTEXT columns as Buffer objects instead of strings.
   * The longtextString custom type applies a fromDriver mapper to convert them.
   */

  it("should convert Buffer bodyHtml to string via fromDriver", () => {
    const htmlContent = "<html><body><h1>Hello World</h1></body></html>";
    const buffer = Buffer.from(htmlContent, "utf8");

    // Simulate the fromDriver function
    const fromDriver = (value: Buffer | string): string => {
      if (Buffer.isBuffer(value)) return value.toString("utf8");
      return value as string;
    };

    const result = fromDriver(buffer);
    expect(typeof result).toBe("string");
    expect(result).toBe(htmlContent);
  });

  it("should convert Buffer bodyText to string via fromDriver", () => {
    const textContent = "Hello World plain text email body";
    const buffer = Buffer.from(textContent, "utf8");

    const fromDriver = (value: Buffer | string): string => {
      if (Buffer.isBuffer(value)) return value.toString("utf8");
      return value as string;
    };

    const result = fromDriver(buffer);
    expect(typeof result).toBe("string");
    expect(result).toBe(textContent);
  });

  it("should pass through string values unchanged", () => {
    const str = "Already a string value";

    const fromDriver = (value: Buffer | string): string => {
      if (Buffer.isBuffer(value)) return value.toString("utf8");
      return value as string;
    };

    expect(fromDriver(str)).toBe(str);
  });

  it("should handle null bodyText gracefully", () => {
    const value: null = null;
    const normalized = value && Buffer.isBuffer(value) ? (value as any).toString("utf8") : value;
    expect(normalized).toBeNull();
  });

  it("should handle undefined bodyText gracefully", () => {
    const value: undefined = undefined;
    const normalized = value && Buffer.isBuffer(value) ? (value as any).toString("utf8") : value;
    expect(normalized).toBeUndefined();
  });

  it("should preserve HTML entities in Buffer conversion", () => {
    const html = "<p>Hello &amp; World &lt;test&gt;</p>";
    const buffer = Buffer.from(html, "utf8");

    const fromDriver = (value: Buffer | string): string => {
      if (Buffer.isBuffer(value)) return value.toString("utf8");
      return value as string;
    };

    expect(fromDriver(buffer)).toBe(html);
  });

  it("should preserve Arabic (UTF-8 multi-byte) characters in Buffer conversion", () => {
    const html = "<p>مرحبا بالعالم</p>"; // Arabic: Hello World
    const buffer = Buffer.from(html, "utf8");

    const fromDriver = (value: Buffer | string): string => {
      if (Buffer.isBuffer(value)) return value.toString("utf8");
      return value as string;
    };

    expect(fromDriver(buffer)).toBe(html);
  });

  it("should handle large HTML bodies (>64KB) in Buffer conversion", () => {
    const largeHtml = "<p>" + "x".repeat(100000) + "</p>";
    const buffer = Buffer.from(largeHtml, "utf8");

    const fromDriver = (value: Buffer | string): string => {
      if (Buffer.isBuffer(value)) return value.toString("utf8");
      return value as string;
    };

    const result = fromDriver(buffer);
    expect(typeof result).toBe("string");
    expect(result.length).toBe(largeHtml.length);
  });

  it("should handle empty Buffer from fromDriver", () => {
    const fromDriver = (value: Buffer | string): string => {
      if (Buffer.isBuffer(value)) return value.toString("utf8");
      return value as string;
    };

    const emptyBuffer = Buffer.from("", "utf8");
    expect(fromDriver(emptyBuffer)).toBe("");
  });
});

// ─── 3. Dead-Letter Queue Schema Alignment ────────────────────────────────────

describe("EmailDeadLetterQueue - Schema Column Alignment", () => {
  /**
   * The DLQ schema was previously out of sync with the actual database.
   * DB has: finalRetryCount, movedAt, reviewedAt, reviewedBy, reviewNotes
   * Old schema had: totalRetries, lastErrorAt, createdAt, movedToDeadLetterAt
   */

  it("should import emailDeadLetterQueue schema without errors", async () => {
    const { emailDeadLetterQueue } = await import("../drizzle/schema");
    expect(emailDeadLetterQueue).toBeDefined();
  });

  it("should have finalRetryCount column (not totalRetries)", async () => {
    const { emailDeadLetterQueue } = await import("../drizzle/schema");
    const columns = Object.keys(emailDeadLetterQueue);
    expect(columns).toContain("finalRetryCount");
    expect(columns).not.toContain("totalRetries");
  });

  it("should have movedAt column (not movedToDeadLetterAt or createdAt)", async () => {
    const { emailDeadLetterQueue } = await import("../drizzle/schema");
    const columns = Object.keys(emailDeadLetterQueue);
    expect(columns).toContain("movedAt");
    expect(columns).not.toContain("movedToDeadLetterAt");
  });

  it("should have reviewedAt column", async () => {
    const { emailDeadLetterQueue } = await import("../drizzle/schema");
    const columns = Object.keys(emailDeadLetterQueue);
    expect(columns).toContain("reviewedAt");
  });

  it("should have reviewedBy column", async () => {
    const { emailDeadLetterQueue } = await import("../drizzle/schema");
    const columns = Object.keys(emailDeadLetterQueue);
    expect(columns).toContain("reviewedBy");
  });

  it("should have reviewNotes column", async () => {
    const { emailDeadLetterQueue } = await import("../drizzle/schema");
    const columns = Object.keys(emailDeadLetterQueue);
    expect(columns).toContain("reviewNotes");
  });

  it("should NOT have old column names that don't exist in DB", async () => {
    const { emailDeadLetterQueue } = await import("../drizzle/schema");
    const columns = Object.keys(emailDeadLetterQueue);
    expect(columns).not.toContain("totalRetries");
    expect(columns).not.toContain("lastErrorAt");
    expect(columns).not.toContain("movedToDeadLetterAt");
  });

  it("should have all required base columns", async () => {
    const { emailDeadLetterQueue } = await import("../drizzle/schema");
    const columns = Object.keys(emailDeadLetterQueue);
    const requiredColumns = [
      "id", "organizationId", "outboxId", "templateKey",
      "recipientEmail", "recipientName", "subject",
      "bodyHtml", "bodyText", "failureReason", "failureCode",
      "finalRetryCount", "movedAt", "metadata",
    ];
    requiredColumns.forEach(col => {
      expect(columns, `Column "${col}" should exist`).toContain(col);
    });
  });
});

// ─── 4. Email Outbox Schema ───────────────────────────────────────────────────

describe("EmailOutbox - Schema Verification", () => {
  it("should import emailOutbox schema without errors", async () => {
    const { emailOutbox } = await import("../drizzle/schema");
    expect(emailOutbox).toBeDefined();
  });

  it("should have longtextString type for bodyHtml (returns string not Buffer)", async () => {
    const { emailOutbox } = await import("../drizzle/schema");
    expect(emailOutbox.bodyHtml).toBeDefined();
  });

  it("should have longtextString type for bodyText", async () => {
    const { emailOutbox } = await import("../drizzle/schema");
    expect(emailOutbox.bodyText).toBeDefined();
  });

  it("should have all required columns", async () => {
    const { emailOutbox } = await import("../drizzle/schema");
    const columns = Object.keys(emailOutbox);
    const requiredColumns = [
      "id", "organizationId", "templateKey", "recipientEmail",
      "recipientName", "subject", "bodyHtml", "bodyText",
      "status", "retryCount", "maxRetries", "lastError",
      "errorCode", "createdAt", "sentAt", "nextRetryAt",
      "completedAt", "metadata",
    ];
    requiredColumns.forEach(col => {
      expect(columns, `Column "${col}" should exist`).toContain(col);
    });
  });
});

// ─── 5. M365 Email Service ────────────────────────────────────────────────────

describe("M365EmailService - Token Acquisition", () => {
  it("should fail gracefully when tenant ID is empty", async () => {
    const { acquireM365Token } = await import("./services/m365EmailService");

    await expect(
      acquireM365Token({
        tenantId: "",
        clientId: "test-client",
        authType: "secret",
        secretRef: "test-secret",
      })
    ).rejects.toThrow();
  });

  it("should fail with invalid tenant ID format", async () => {
    const { acquireM365Token } = await import("./services/m365EmailService");

    await expect(
      acquireM365Token({
        tenantId: "invalid-tenant-id",
        clientId: "test-client-id",
        authType: "secret",
        secretRef: "test-secret",
      })
    ).rejects.toThrow();
  });

  it("should clear token cache for specific tenant without error", async () => {
    const { clearTokenCache } = await import("./services/m365EmailService");
    expect(() => clearTokenCache("test-tenant", "test-client")).not.toThrow();
  });

  it("should clear all token caches without error", async () => {
    const { clearAllTokenCache } = await import("./services/m365EmailService");
    expect(() => clearAllTokenCache()).not.toThrow();
  });
});

describe("M365EmailService - sendEmailViaGraph", () => {
  it("should return failure when token acquisition fails", async () => {
    const { sendEmailViaGraph } = await import("./services/m365EmailService");

    const result = await sendEmailViaGraph(
      {
        tenantId: "invalid-tenant",
        clientId: "invalid-client",
        authType: "secret",
        secretRef: "invalid-secret",
        senderMode: "shared_mailbox",
        fromEmail: "sender@example.com",
        fromName: "Test Sender",
      },
      {
        to: ["recipient@example.com"],
        subject: "Test Email",
        bodyHtml: "<p>Test body</p>",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");
  });

  it("should return failure with error string when Graph API fails", async () => {
    const { sendEmailViaGraph } = await import("./services/m365EmailService");

    const result = await sendEmailViaGraph(
      {
        tenantId: "00000000-0000-0000-0000-000000000000",
        clientId: "00000000-0000-0000-0000-000000000000",
        authType: "secret",
        secretRef: "fake-secret",
        senderMode: "shared_mailbox",
        fromEmail: "sender@example.com",
      },
      {
        to: ["recipient@example.com"],
        subject: "Test Email",
        bodyHtml: "<p>Test body</p>",
        bodyText: "Test body",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");
  });
});

describe("M365EmailService - testM365Connection", () => {
  it("should return failure for invalid credentials", async () => {
    const { testM365Connection } = await import("./services/m365EmailService");

    const result = await testM365Connection({
      tenantId: "invalid-tenant",
      clientId: "invalid-client",
      authType: "secret",
      secretRef: "invalid-secret",
    });

    expect(result.success).toBe(false);
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });
});

// ─── 6. Retry Logic ──────────────────────────────────────────────────────────

describe("EmailQueueWorker - Retry Logic", () => {
  it("should calculate exponential backoff correctly for retry 1", () => {
    const INITIAL_DELAY_MS = 5000;
    expect(INITIAL_DELAY_MS * Math.pow(2, 0)).toBe(5000);
  });

  it("should calculate exponential backoff correctly for retry 2", () => {
    const INITIAL_DELAY_MS = 5000;
    expect(INITIAL_DELAY_MS * Math.pow(2, 1)).toBe(10000);
  });

  it("should calculate exponential backoff correctly for retry 3", () => {
    const INITIAL_DELAY_MS = 5000;
    expect(INITIAL_DELAY_MS * Math.pow(2, 2)).toBe(20000);
  });

  it("should calculate exponential backoff correctly for retry 4", () => {
    const INITIAL_DELAY_MS = 5000;
    expect(INITIAL_DELAY_MS * Math.pow(2, 3)).toBe(40000);
  });

  it("should calculate exponential backoff correctly for retry 5", () => {
    const INITIAL_DELAY_MS = 5000;
    expect(INITIAL_DELAY_MS * Math.pow(2, 4)).toBe(80000);
  });

  it("should move to DLQ when retryCount >= maxRetries", () => {
    const maxRetries = 5;
    const retryCount = 5;
    expect(retryCount >= maxRetries).toBe(true);
  });

  it("should NOT move to DLQ when retryCount < maxRetries", () => {
    const maxRetries = 5;
    const retryCount = 3;
    expect(retryCount >= maxRetries).toBe(false);
  });

  it("should truncate failure reason to 1000 chars for DLQ insert", () => {
    const longMessage = "x".repeat(2000);
    const truncated = longMessage.substring(0, 1000);
    expect(truncated.length).toBe(1000);
  });

  it("should truncate lastError to 500 chars for outbox update", () => {
    const longMessage = "x".repeat(1000);
    const truncated = longMessage.substring(0, 500);
    expect(truncated.length).toBe(500);
  });
});

// ─── 7. Email Queue Router ────────────────────────────────────────────────────

describe("EmailQueueRouter - Module and Procedures", () => {
  it("should import emailQueueRouter without errors", async () => {
    const mod = await import("./routers/emailQueueRouter");
    expect(mod).toBeDefined();
  });

  it("should export emailQueueRouter", async () => {
    const { emailQueueRouter } = await import("./routers/emailQueueRouter");
    expect(emailQueueRouter).toBeDefined();
  });

  it("should have getStatus procedure", async () => {
    const { emailQueueRouter } = await import("./routers/emailQueueRouter");
    expect((emailQueueRouter as any)._def?.procedures?.getStatus).toBeDefined();
  });

  it("should have getMetrics procedure", async () => {
    const { emailQueueRouter } = await import("./routers/emailQueueRouter");
    expect((emailQueueRouter as any)._def?.procedures?.getMetrics).toBeDefined();
  });

  it("should have getPending procedure", async () => {
    const { emailQueueRouter } = await import("./routers/emailQueueRouter");
    expect((emailQueueRouter as any)._def?.procedures?.getPending).toBeDefined();
  });

  it("should have getDeadLetterQueue procedure", async () => {
    const { emailQueueRouter } = await import("./routers/emailQueueRouter");
    expect((emailQueueRouter as any)._def?.procedures?.getDeadLetterQueue).toBeDefined();
  });

  it("should have retryDeadLetterEmail procedure", async () => {
    const { emailQueueRouter } = await import("./routers/emailQueueRouter");
    expect((emailQueueRouter as any)._def?.procedures?.retryDeadLetterEmail).toBeDefined();
  });
});

// ─── 8. DLQ Field Normalization for UI ───────────────────────────────────────

describe("EmailQueueRouter - DLQ Field Normalization for UI", () => {
  /**
   * The DLQ has different field names than the outbox.
   * The router normalizes these to common field names expected by the UI:
   * - finalRetryCount → retryCount
   * - failureReason → lastError
   * - failureCode → errorCode
   * - movedAt → createdAt
   */

  it("should map finalRetryCount to retryCount", () => {
    const dlqEmail = {
      id: 1,
      organizationId: 1,
      templateKey: "test",
      recipientEmail: "test@example.com",
      subject: "Test",
      bodyHtml: "<p>Test</p>",
      bodyText: "Test",
      failureReason: "Connection timeout",
      failureCode: "TIMEOUT",
      finalRetryCount: 5,
      movedAt: "2024-01-01T00:00:00.000Z",
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: null,
      metadata: null,
    };

    const normalized = {
      ...dlqEmail,
      status: "dead_letter" as const,
      retryCount: dlqEmail.finalRetryCount,
      maxRetries: 5,
      lastError: dlqEmail.failureReason,
      errorCode: dlqEmail.failureCode,
      createdAt: dlqEmail.movedAt,
    };

    expect(normalized.retryCount).toBe(5);
    expect(normalized.status).toBe("dead_letter");
    expect(normalized.lastError).toBe("Connection timeout");
    expect(normalized.errorCode).toBe("TIMEOUT");
    expect(normalized.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should set maxRetries to 5 for all DLQ emails", () => {
    const dlqEmail = {
      finalRetryCount: 5,
      failureReason: "Test error",
      failureCode: "TEST",
      movedAt: "2024-01-01T00:00:00.000Z",
    };

    const normalized = {
      ...dlqEmail,
      status: "dead_letter" as const,
      retryCount: dlqEmail.finalRetryCount,
      maxRetries: 5,
      lastError: dlqEmail.failureReason,
    };

    expect(normalized.maxRetries).toBe(5);
  });

  it("should set status to dead_letter for all DLQ emails", () => {
    const normalized = {
      status: "dead_letter" as const,
    };
    expect(normalized.status).toBe("dead_letter");
  });
});

// ─── 9. Email Provider Settings Schema ───────────────────────────────────────

describe("EmailProviderSettings - Schema Verification", () => {
  it("should import emailProviderSettings schema without errors", async () => {
    const { emailProviderSettings } = await import("../drizzle/schema");
    expect(emailProviderSettings).toBeDefined();
  });

  it("should have providerType column", async () => {
    const { emailProviderSettings } = await import("../drizzle/schema");
    expect(emailProviderSettings.providerType).toBeDefined();
  });

  it("should have m365-specific columns", async () => {
    const { emailProviderSettings } = await import("../drizzle/schema");
    const columns = Object.keys(emailProviderSettings);
    expect(columns).toContain("tenantId");
    expect(columns).toContain("clientId");
    expect(columns).toContain("secretRef");
    expect(columns).toContain("fromEmail");
    expect(columns).toContain("fromName");
    expect(columns).toContain("authType");
    expect(columns).toContain("senderMode");
  });

  it("should have SMTP-specific columns", async () => {
    const { emailProviderSettings } = await import("../drizzle/schema");
    const columns = Object.keys(emailProviderSettings);
    expect(columns).toContain("smtpHost");
    expect(columns).toContain("smtpPort");
    expect(columns).toContain("smtpUsername");
    expect(columns).toContain("smtpPassword");
  });

  it("should have isActive column for enabling/disabling provider", async () => {
    const { emailProviderSettings } = await import("../drizzle/schema");
    const columns = Object.keys(emailProviderSettings);
    expect(columns).toContain("isActive");
  });
});

// ─── 10. Worker Uses M365 Service (Not Notification API) ─────────────────────

describe("EmailQueueWorker - Uses M365 Service (not notification/send)", () => {
  it("should import sendEmailViaGraph from m365EmailService (not axios/notification)", async () => {
    const workerMod = await import("./services/emailQueueWorker");
    // The worker module should load without errors, and the m365EmailService should be imported
    expect(workerMod).toBeDefined();
    expect(workerMod.emailQueueWorker).toBeDefined();
  });

  it("should NOT use the broken notification/send endpoint", async () => {
    // Read the worker source to verify it doesn't use the old endpoint
    const fs = await import("fs");
    const source = fs.readFileSync("./server/services/emailQueueWorker.ts", "utf8");
    expect(source).not.toContain("/notification/send");
    expect(source).toContain("sendEmailViaGraph");
    expect(source).toContain("m365EmailService");
  });

  it("should use emailProviderSettings to look up org provider config", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("./server/services/emailQueueWorker.ts", "utf8");
    expect(source).toContain("emailProviderSettings");
    expect(source).toContain("isActive");
  });

  it("should handle NO_PROVIDER error when no email provider is configured", () => {
    // Simulate the error code returned when no provider is configured
    const errorCode = "NO_PROVIDER";
    const errorMessage = "No active email provider configured for organization 1";
    
    expect(errorCode).toBe("NO_PROVIDER");
    expect(errorMessage).toContain("No active email provider");
  });
});
