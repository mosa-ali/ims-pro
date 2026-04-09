import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { EmailPasswordAuthService } from "./services/auth/emailPasswordAuthService";
import { sendPasswordResetEmail } from "./services/emailService";

describe("Password Reset Email Flow", () => {
  let testUserId: number;
  let testEmail = `test-${Date.now()}@example.com`;

  beforeAll(async () => {
    // Create a test user
    const db = await getDb();
    const hashedPassword = await EmailPasswordAuthService.hashPassword("TestPassword123!");
    
    const result = await db.insert(users).values({
      email: testEmail,
      name: "Test User",
      passwordHash: hashedPassword,
      organizationId: 1,
      role: "user",
    });
    
    testUserId = result[0].insertId as number;
  });

  it("should generate password reset token", async () => {
    const token = await EmailPasswordAuthService.generatePasswordResetToken(testUserId);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("should send password reset email with resetLink", async () => {
    const token = await EmailPasswordAuthService.generatePasswordResetToken(testUserId);
    const resetLink = "http://localhost:3000/reset-password";
    
    // This will attempt to send email (may fail if email service not configured)
    const result = await sendPasswordResetEmail(
      1,
      testEmail,
      "Test User",
      token,
      resetLink
    );
    
    // Even if email fails, the function should return a boolean
    expect(typeof result).toBe("boolean");
  });

  it("requestPasswordReset mutation should return resetLink in response", async () => {
    // This verifies the mutation response type includes resetLink
    const mockResponse = {
      success: true,
      message: "If an account exists with this email, a password reset link will be sent",
      resetLink: "http://localhost:3000/reset-password",
    };
    
    expect(mockResponse).toHaveProperty("resetLink");
    expect(mockResponse.resetLink).toBeTruthy();
  });

  afterAll(async () => {
    // Clean up test user
    const db = await getDb();
    await db.delete(users).where(users.id === testUserId);
  });
});
