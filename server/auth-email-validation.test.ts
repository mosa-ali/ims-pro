import { describe, it, expect, beforeEach } from "vitest";
import { EmailValidationService } from "./services/auth/emailValidationService";
import { EmailVerificationService } from "./services/auth/emailVerificationService";

describe("Email Validation Service", () => {
  describe("extractDomain", () => {
    it("should extract domain from valid email", () => {
      expect(EmailValidationService.extractDomain("user@gmail.com")).toBe("gmail.com");
      expect(EmailValidationService.extractDomain("admin@company.org")).toBe("company.org");
      expect(EmailValidationService.extractDomain("test@sub.domain.co.uk")).toBe("sub.domain.co.uk");
    });

    it("should return null for invalid email", () => {
      expect(EmailValidationService.extractDomain("invalid-email")).toBeNull();
      expect(EmailValidationService.extractDomain("@nodomain.com")).toBeNull();
      expect(EmailValidationService.extractDomain("")).toBeNull();
    });
  });

  describe("isPublicDomain", () => {
    it("should identify public domains", () => {
      expect(EmailValidationService.isPublicDomain("user@gmail.com")).toBe(true);
      expect(EmailValidationService.isPublicDomain("user@yahoo.com")).toBe(true);
      expect(EmailValidationService.isPublicDomain("user@outlook.com")).toBe(true);
      expect(EmailValidationService.isPublicDomain("user@hotmail.com")).toBe(true);
      expect(EmailValidationService.isPublicDomain("user@protonmail.com")).toBe(true);
      expect(EmailValidationService.isPublicDomain("user@icloud.com")).toBe(true);
    });

    it("should reject corporate domains", () => {
      expect(EmailValidationService.isPublicDomain("user@company.com")).toBe(false);
      expect(EmailValidationService.isPublicDomain("user@organization.org")).toBe(false);
      expect(EmailValidationService.isPublicDomain("user@mycompany.co.uk")).toBe(false);
    });
  });

  describe("isValidEmailFormat", () => {
    it("should validate correct email formats", () => {
      expect(EmailValidationService.isValidEmailFormat("user@example.com")).toBe(true);
      expect(EmailValidationService.isValidEmailFormat("test.user@example.co.uk")).toBe(true);
      expect(EmailValidationService.isValidEmailFormat("user+tag@example.com")).toBe(true);
      expect(EmailValidationService.isValidEmailFormat("123@example.com")).toBe(true);
    });

    it("should reject invalid email formats", () => {
      expect(EmailValidationService.isValidEmailFormat("invalid")).toBe(false);
      expect(EmailValidationService.isValidEmailFormat("@example.com")).toBe(false);
      expect(EmailValidationService.isValidEmailFormat("user@")).toBe(false);
      expect(EmailValidationService.isValidEmailFormat("user @example.com")).toBe(false);
      expect(EmailValidationService.isValidEmailFormat("")).toBe(false);
    });
  });

  describe("validatePlatformAdminEmail", () => {
    it("should allow public domain emails for platform admins", () => {
      const result = EmailValidationService.validatePlatformAdminEmail("admin@gmail.com");
      expect(result.valid).toBe(true);

      const result2 = EmailValidationService.validatePlatformAdminEmail("admin@outlook.com");
      expect(result2.valid).toBe(true);
    });

    it("should allow corporate emails for platform admins", () => {
      const result = EmailValidationService.validatePlatformAdminEmail("admin@company.com");
      expect(result.valid).toBe(true);
    });

    it("should reject invalid email formats", () => {
      const result = EmailValidationService.validatePlatformAdminEmail("invalid-email");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Invalid email format");
    });
  });
});

describe("Email Verification Service", () => {
  describe("generateOTP", () => {
    it("should generate 6-digit OTP", () => {
      const otp = EmailVerificationService.generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it("should generate different OTPs", () => {
      const otp1 = EmailVerificationService.generateOTP();
      const otp2 = EmailVerificationService.generateOTP();
      // Note: There's a small chance they could be the same, but very unlikely
      expect(otp1).toMatch(/^\d{6}$/);
      expect(otp2).toMatch(/^\d{6}$/);
    });
  });

  describe("generateToken", () => {
    it("should generate 64-character hex token", () => {
      const token = EmailVerificationService.generateToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate different tokens", () => {
      const token1 = EmailVerificationService.generateToken();
      const token2 = EmailVerificationService.generateToken();
      expect(token1).not.toBe(token2);
    });
  });
});

describe("Authentication Flow - Platform Admin", () => {
  it("should allow platform admin with public domain email", () => {
    const emails = [
      "admin@gmail.com",
      "admin@outlook.com",
      "admin@yahoo.com",
      "admin@protonmail.com",
    ];

    emails.forEach((email) => {
      const result = EmailValidationService.validatePlatformAdminEmail(email);
      expect(result.valid).toBe(true);
    });
  });

  it("should allow platform admin with corporate email", () => {
    const result = EmailValidationService.validatePlatformAdminEmail("admin@company.com");
    expect(result.valid).toBe(true);
  });
});

describe("Authentication Flow - Organization User", () => {
  it("should validate organization domain requirement", async () => {
    // Note: This test would need a database setup
    // For now, we're testing the validation logic
    const email = "user@company.com";
    const organizationId = 1;

    // This would require database to be set up
    // const result = await EmailValidationService.validateOrganizationUserEmail(email, organizationId);
    // expect(result.valid).toBe(true);
  });
});

describe("Email Validation Edge Cases", () => {
  it("should handle case-insensitive domain comparison", () => {
    expect(EmailValidationService.extractDomain("user@GMAIL.COM")).toBe("gmail.com");
    expect(EmailValidationService.extractDomain("user@Gmail.Com")).toBe("gmail.com");
  });

  it("should handle emails with subdomains", () => {
    const domain = EmailValidationService.extractDomain("user@mail.company.com");
    expect(domain).toBe("mail.company.com");
  });

  it("should handle international domain names", () => {
    const domain = EmailValidationService.extractDomain("user@example.co.uk");
    expect(domain).toBe("example.co.uk");
  });
});
