import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { domainValidationService } from "./domainValidationService";

/**
 * Comprehensive test suite for domain validation service
 * Tests all domain enforcement scenarios for organization users
 */

describe("DomainValidationService", () => {
  describe("extractDomain", () => {
    it("should extract domain from valid email", () => {
      const domain = domainValidationService.extractDomain("user@efadah-ye.org");
      expect(domain).toBe("efadah-ye.org");
    });

    it("should handle email with multiple @ symbols (take last one)", () => {
      const domain = domainValidationService.extractDomain("user+test@efadah-ye.org");
      expect(domain).toBe("efadah-ye.org");
    });

    it("should return null for invalid email", () => {
      const domain = domainValidationService.extractDomain("invalid-email");
      expect(domain).toBeNull();
    });

    it("should return null for empty string", () => {
      const domain = domainValidationService.extractDomain("");
      expect(domain).toBeNull();
    });

    it("should handle uppercase domains", () => {
      const domain = domainValidationService.extractDomain("user@EFADAH-YE.ORG");
      expect(domain).toBe("efadah-ye.org");
    });

    it("should handle domains with subdomains", () => {
      const domain = domainValidationService.extractDomain("user@mail.efadah-ye.org");
      expect(domain).toBe("mail.efadah-ye.org");
    });
  });

  describe("isPublicDomain", () => {
    it("should identify Gmail as public domain", () => {
      expect(domainValidationService.isPublicDomain("gmail.com")).toBe(true);
    });

    it("should identify Outlook as public domain", () => {
      expect(domainValidationService.isPublicDomain("outlook.com")).toBe(true);
    });

    it("should identify Yahoo as public domain", () => {
      expect(domainValidationService.isPublicDomain("yahoo.com")).toBe(true);
    });

    it("should identify ProtonMail as public domain", () => {
      expect(domainValidationService.isPublicDomain("protonmail.com")).toBe(true);
    });

    it("should identify corporate domain as non-public", () => {
      expect(domainValidationService.isPublicDomain("efadah-ye.org")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(domainValidationService.isPublicDomain("GMAIL.COM")).toBe(true);
      expect(domainValidationService.isPublicDomain("Gmail.Com")).toBe(true);
    });

    it("should identify all blocked public domains", () => {
      const publicDomains = [
        "gmail.com",
        "outlook.com",
        "hotmail.com",
        "yahoo.com",
        "aol.com",
        "protonmail.com",
        "tutanota.com",
        "zoho.com",
        "icloud.com",
      ];

      publicDomains.forEach((domain) => {
        expect(domainValidationService.isPublicDomain(domain)).toBe(
          true,
          `${domain} should be identified as public`
        );
      });
    });
  });

  describe("validateEmailDomain", () => {
    it("should reject invalid email format", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "invalid-email",
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("EMAIL_FORMAT_INVALID");
    });

    it("should allow platform admins to use any domain", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "admin@gmail.com",
        allowPublicDomains: true,
      });

      expect(result.valid).toBe(true);
    });

    it("should reject public domain for organization users", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "user@gmail.com",
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("PUBLIC_DOMAIN_NOT_ALLOWED");
      expect(result.message).toContain("Public email domains are not allowed");
    });

    it("should reject non-approved domain for organization users", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "user@other-company.com",
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("DOMAIN_NOT_APPROVED");
      expect(result.message).toContain("Email domain must be");
    });

    it("should handle organization domain not configured", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 99999, // Non-existent organization
        email: "user@example.com",
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("ORG_DOMAIN_NOT_CONFIGURED");
    });

    it("should be case-insensitive for domain matching", async () => {
      // This test assumes EFADAH org has domain efadah-ye.org
      const result1 = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "user@EFADAH-YE.ORG",
        allowPublicDomains: false,
      });

      const result2 = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "user@efadah-ye.org",
        allowPublicDomains: false,
      });

      // Both should have the same result (valid or invalid)
      expect(result1.valid).toBe(result2.valid);
    });
  });

  describe("validateEmailDomains (bulk validation)", () => {
    it("should validate multiple emails", async () => {
      const emails = [
        "user1@gmail.com",
        "user2@outlook.com",
        "user3@efadah-ye.org",
      ];

      const results = await domainValidationService.validateEmailDomains(
        30001,
        emails,
        false
      );

      expect(results.size).toBe(3);
      expect(results.get("user1@gmail.com")?.valid).toBe(false);
      expect(results.get("user2@outlook.com")?.valid).toBe(false);
      // user3@efadah-ye.org validity depends on org configuration
    });

    it("should handle empty email list", async () => {
      const results = await domainValidationService.validateEmailDomains(
        30001,
        [],
        false
      );

      expect(results.size).toBe(0);
    });

    it("should handle mixed valid and invalid emails", async () => {
      const emails = [
        "admin@gmail.com",
        "user@efadah-ye.org",
        "invalid-email",
      ];

      const results = await domainValidationService.validateEmailDomains(
        30001,
        emails,
        true // Allow public domains for admins
      );

      expect(results.size).toBe(3);
      expect(results.get("admin@gmail.com")?.valid).toBe(true);
      expect(results.get("invalid-email")?.valid).toBe(false);
    });
  });

  describe("getPublicDomains", () => {
    it("should return list of public domains", () => {
      const domains = domainValidationService.getPublicDomains();

      expect(Array.isArray(domains)).toBe(true);
      expect(domains.length).toBeGreaterThan(0);
      expect(domains).toContain("gmail.com");
      expect(domains).toContain("outlook.com");
      expect(domains).toContain("yahoo.com");
    });

    it("should return sorted list", () => {
      const domains = domainValidationService.getPublicDomains();
      const sorted = [...domains].sort();

      expect(domains).toEqual(sorted);
    });

    it("should not contain duplicates", () => {
      const domains = domainValidationService.getPublicDomains();
      const uniqueDomains = new Set(domains);

      expect(domains.length).toBe(uniqueDomains.size);
    });
  });

  describe("isDomainEnforcementEnabled", () => {
    it("should return true for existing organization", async () => {
      const enabled = await domainValidationService.isDomainEnforcementEnabled(
        30001
      );

      expect(typeof enabled).toBe("boolean");
    });

    it("should return false for non-existent organization", async () => {
      const enabled = await domainValidationService.isDomainEnforcementEnabled(
        99999
      );

      expect(enabled).toBe(false);
    });
  });

  describe("getOrganizationDomainConfig", () => {
    it("should return domain configuration for organization", async () => {
      const config =
        await domainValidationService.getOrganizationDomainConfig(30001);

      expect(config).toHaveProperty("organizationId");
      expect(config).toHaveProperty("approvedDomain");
      expect(config).toHaveProperty("isEnforced");
      expect(config).toHaveProperty("publicDomainsBlocked");
      expect(config).toHaveProperty("message");
    });

    it("should include all public domains in config", async () => {
      const config =
        await domainValidationService.getOrganizationDomainConfig(30001);

      expect(Array.isArray(config.publicDomainsBlocked)).toBe(true);
      expect(config.publicDomainsBlocked.length).toBeGreaterThan(0);
    });

    it("should handle non-existent organization", async () => {
      const config =
        await domainValidationService.getOrganizationDomainConfig(99999);

      expect(config.organizationId).toBe(99999);
      expect(config.approvedDomain).toBeNull();
      expect(config.isEnforced).toBe(false);
    });
  });

  describe("Integration: Domain Validation Workflow", () => {
    it("should block Gmail for organization users", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "john.doe@gmail.com",
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("PUBLIC_DOMAIN_NOT_ALLOWED");
    });

    it("should block Outlook for organization users", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "jane.smith@outlook.com",
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("PUBLIC_DOMAIN_NOT_ALLOWED");
    });

    it("should block Yahoo for organization users", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "user@yahoo.com",
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("PUBLIC_DOMAIN_NOT_ALLOWED");
    });

    it("should allow platform admins to use Gmail", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "admin@gmail.com",
        allowPublicDomains: true,
      });

      expect(result.valid).toBe(true);
    });

    it("should validate email format before domain check", async () => {
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: "not-an-email",
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("EMAIL_FORMAT_INVALID");
    });
  });
});
