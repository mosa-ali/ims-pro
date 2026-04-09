import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmailPasswordAuthService } from "./emailPasswordAuthService";

describe("EmailPasswordAuthService", () => {
  describe("validateEmail", () => {
    it("should validate correct email format", () => {
      expect(EmailPasswordAuthService.validateEmail("user@example.com")).toBe(true);
      expect(EmailPasswordAuthService.validateEmail("test.user@domain.co.uk")).toBe(true);
    });

    it("should reject invalid email format", () => {
      expect(EmailPasswordAuthService.validateEmail("invalid-email")).toBe(false);
      expect(EmailPasswordAuthService.validateEmail("@example.com")).toBe(false);
      expect(EmailPasswordAuthService.validateEmail("user@")).toBe(false);
    });
  });

  describe("validatePasswordStrength", () => {
    it("should accept strong password", () => {
      const result = EmailPasswordAuthService.validatePasswordStrength("StrongPass123!");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password without uppercase", () => {
      const result = EmailPasswordAuthService.validatePasswordStrength("weakpass123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should reject password without lowercase", () => {
      const result = EmailPasswordAuthService.validatePasswordStrength("WEAKPASS123!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should reject password without number", () => {
      const result = EmailPasswordAuthService.validatePasswordStrength("WeakPass!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should reject password without special character", () => {
      const result = EmailPasswordAuthService.validatePasswordStrength("WeakPass123");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one special character");
    });

    it("should reject password shorter than 8 characters", () => {
      const result = EmailPasswordAuthService.validatePasswordStrength("Short1!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });
  });

  describe("hashPassword and verifyPassword", () => {
    it("should hash password and verify it correctly", async () => {
      const password = "TestPassword123!";
      const hash = await EmailPasswordAuthService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);

      const isValid = await EmailPasswordAuthService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "TestPassword123!";
      const hash = await EmailPasswordAuthService.hashPassword(password);

      const isValid = await EmailPasswordAuthService.verifyPassword("WrongPassword123!", hash);
      expect(isValid).toBe(false);
    });

    it("should generate different hashes for same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await EmailPasswordAuthService.hashPassword(password);
      const hash2 = await EmailPasswordAuthService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });
});
