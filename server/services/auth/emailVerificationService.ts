import { getDb } from "../../db";
import { emailVerificationTokens } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Email Verification Service
 * Handles email verification for platform admins using OTP
 * Verification tokens expire after 1 hour
 */
export class EmailVerificationService {
  private static readonly TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
  private static readonly OTP_LENGTH = 6;

  /**
   * Generate a random OTP (6 digits)
   */
  static generateOTP(): string {
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Generate a secure random token
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Create a verification token for email
   * Returns: { token, otp, expiresAt }
   */
  static async createVerificationToken(email: string): Promise<{
    token: string;
    otp: string;
    expiresAt: Date;
  }> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database unavailable");
    }

    const token = this.generateToken();
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS);

    // Delete any existing tokens for this email
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.email, email.toLowerCase()));

    // Create new verification token
    await db.insert(emailVerificationTokens).values({
      email: email.toLowerCase(),
      token,
      otp,
      expiresAt: expiresAt.toISOString(),
      isUsed: 0,
      createdAt: new Date().toISOString(),
    });

    return { token, otp, expiresAt };
  }

  /**
   * Verify an OTP for a given email
   * Returns: { valid: boolean, message: string }
   */
  static async verifyOTP(email: string, otp: string): Promise<{ valid: boolean; message: string }> {
    const db = await getDb();
    if (!db) {
      return { valid: false, message: "Database unavailable" };
    }

    const record = await db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.email, email.toLowerCase()),
    });

    if (!record) {
      return { valid: false, message: "No verification request found for this email" };
    }

    if (record.isUsed) {
      return { valid: false, message: "This verification code has already been used" };
    }

    // Check if token has expired
    const expiresAt = new Date(record.expiresAt);
    if (expiresAt < new Date()) {
      return { valid: false, message: "Verification code has expired. Please request a new one." };
    }

    // Check if OTP matches
    if (record.otp !== otp) {
      return { valid: false, message: "Invalid verification code" };
    }

    // Mark as used
    await db
      .update(emailVerificationTokens)
      .set({ isUsed: 1 })
      .where(eq(emailVerificationTokens.email, email.toLowerCase()));

    return { valid: true, message: "Email verified successfully" };
  }

  /**
   * Verify a token (alternative to OTP)
   * Returns: { valid: boolean, message: string }
   */
  static async verifyToken(email: string, token: string): Promise<{ valid: boolean; message: string }> {
    const db = await getDb();
    if (!db) {
      return { valid: false, message: "Database unavailable" };
    }

    const record = await db.query.emailVerificationTokens.findFirst({
      where: eq(emailVerificationTokens.email, email.toLowerCase()),
    });

    if (!record) {
      return { valid: false, message: "No verification request found for this email" };
    }

    if (record.isUsed) {
      return { valid: false, message: "This verification token has already been used" };
    }

    // Check if token has expired
    const expiresAt = new Date(record.expiresAt);
    if (expiresAt < new Date()) {
      return { valid: false, message: "Verification token has expired. Please request a new one." };
    }

    // Check if token matches
    if (record.token !== token) {
      return { valid: false, message: "Invalid verification token" };
    }

    // Mark as used
    await db
      .update(emailVerificationTokens)
      .set({ isUsed: 1 })
      .where(eq(emailVerificationTokens.email, email.toLowerCase()));

    return { valid: true, message: "Email verified successfully" };
  }

  /**
   * Check if email is already verified
   */
  static async isEmailVerified(email: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const { users } = await import("../../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    return user?.emailVerified === 1 || false;
  }

  /**
   * Mark email as verified
   */
  static async markEmailAsVerified(email: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database unavailable");
    }

    const { users } = await import("../../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(users)
      .set({
        emailVerified: 1,
        emailVerifiedAt: new Date().toISOString(),
      })
      .where(eq(users.email, email.toLowerCase()));
  }

  /**
   * Clean up expired verification tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const db = await getDb();
    if (!db) return 0;

    const result = await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.expiresAt, new Date().toISOString()));

    return result.rowsAffected || 0;
  }
}
