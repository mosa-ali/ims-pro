import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { emailNotificationService } from "./emailNotificationService";

// Mock the emailQueueService module since the service now uses it
vi.mock("../emailQueueService", () => ({
  emailQueueService: {
    queueEmail: vi.fn(),
  },
}));

describe("EmailNotificationService", () => {
  let queueEmailMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const { emailQueueService } = await import("../emailQueueService");
    queueEmailMock = emailQueueService.queueEmail as ReturnType<typeof vi.fn>;
    queueEmailMock.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("sendOnboardingLinkEmail", () => {
    it("should successfully queue onboarding email and return success", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: true, id: 12345 });

      const result = await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 1,
        organizationName: "Test Organization",
        adminEmail: "admin@test.com",
        adminName: "Test Admin",
        onboardingLink: "http://localhost:3000/organizations/1/connect-microsoft-365",
        language: "en",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("12345");
      expect(queueEmailMock).toHaveBeenCalledOnce();
    });

    it("should pass correct email parameters to queueEmail", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: true, id: 42 });

      const adminEmail = "admin@organization.com";
      const orgName = "Yamany Foundation";
      const adminName = "Ahmed Hassan";
      const onboardingLink = "http://localhost:3000/organizations/42/connect-microsoft-365";

      await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 42,
        organizationName: orgName,
        adminEmail,
        adminName,
        onboardingLink,
        language: "en",
      });

      expect(queueEmailMock).toHaveBeenCalledOnce();
      const callArgs = queueEmailMock.mock.calls[0][0];

      expect(callArgs.organizationId).toBe(42);
      expect(callArgs.recipientEmail).toBe(adminEmail);
      expect(callArgs.recipientName).toBe(adminName);
      expect(callArgs.subject).toContain("Connect Microsoft 365");
      expect(callArgs.htmlContent).toContain(adminName);
      expect(callArgs.htmlContent).toContain(orgName);
      expect(callArgs.textContent).toContain(adminName);
    });

    it("should handle queue failure gracefully", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: false, error: "DB connection failed" });

      const result = await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 1,
        organizationName: "Test Organization",
        adminEmail: "invalid-email",
        adminName: "Test Admin",
        onboardingLink: "http://localhost:3000/organizations/1/connect-microsoft-365",
        language: "en",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle network errors from queueEmail", async () => {
      queueEmailMock.mockRejectedValueOnce(new Error("Network timeout"));

      const result = await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 1,
        organizationName: "Test Organization",
        adminEmail: "admin@test.com",
        adminName: "Test Admin",
        onboardingLink: "http://localhost:3000/organizations/1/connect-microsoft-365",
        language: "en",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network timeout");
    });

    it("should support Arabic language emails", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: true, id: 99 });

      await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 1,
        organizationName: "منظمة الاختبار",
        adminEmail: "admin@test.com",
        adminName: "أحمد حسن",
        onboardingLink: "http://localhost:3000/organizations/1/connect-microsoft-365",
        language: "ar",
      });

      const callArgs = queueEmailMock.mock.calls[0][0];

      // Verify Arabic content is included
      expect(callArgs.htmlContent).toContain("أحمد حسن");
      expect(callArgs.htmlContent).toContain("منظمة الاختبار");
      expect(callArgs.language).toBe("ar");
    });

    it("should use emailType 'onboarding' for queue", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: true, id: 1 });

      await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 1,
        organizationName: "Test Organization",
        adminEmail: "admin@test.com",
        adminName: "Test Admin",
        onboardingLink: "http://localhost:3000/organizations/1/connect-microsoft-365",
        language: "en",
      });

      const callArgs = queueEmailMock.mock.calls[0][0];
      expect(callArgs.emailType).toBe("onboarding");
    });

    it("should handle queue returning undefined id gracefully", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: true, id: undefined });

      const result = await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 1,
        organizationName: "Test Organization",
        adminEmail: "admin@test.com",
        adminName: "Test Admin",
        onboardingLink: "http://localhost:3000/organizations/1/connect-microsoft-365",
        language: "en",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("undefined");
    });

    it("should include onboarding link in email body", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: true, id: 1 });

      const onboardingLink = "http://localhost:3000/organizations/99/connect-microsoft-365";

      await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 99,
        organizationName: "Test Organization",
        adminEmail: "admin@test.com",
        adminName: "Test Admin",
        onboardingLink,
        language: "en",
      });

      const callArgs = queueEmailMock.mock.calls[0][0];
      expect(callArgs.htmlContent).toContain(onboardingLink);
      expect(callArgs.textContent).toContain(onboardingLink);
    });
  });

  describe("Email subject generation", () => {
    it("should generate English subject containing 'Connect Microsoft 365'", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: true, id: 1 });

      await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 1,
        organizationName: "Test Organization",
        adminEmail: "admin@test.com",
        adminName: "Test Admin",
        onboardingLink: "http://localhost:3000/organizations/1/connect-microsoft-365",
        language: "en",
      });

      const callArgs = queueEmailMock.mock.calls[0][0];
      expect(callArgs.subject).toContain("Connect Microsoft 365");
    });

    it("should generate Arabic subject containing 'Microsoft 365'", async () => {
      queueEmailMock.mockResolvedValueOnce({ success: true, id: 1 });

      await emailNotificationService.sendOnboardingLinkEmail({
        organizationId: 1,
        organizationName: "Test Organization",
        adminEmail: "admin@test.com",
        adminName: "Test Admin",
        onboardingLink: "http://localhost:3000/organizations/1/connect-microsoft-365",
        language: "ar",
      });

      const callArgs = queueEmailMock.mock.calls[0][0];
      // Arabic subject should contain Microsoft 365
      expect(callArgs.subject).toContain("Microsoft 365");
    });
  });
});
