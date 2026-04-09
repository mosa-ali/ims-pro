/**
 * Two-Factor Authentication (2FA) Service
 * 
 * Implements TOTP (Time-Based One-Time Password) based on RFC 6238
 * Supports QR code generation for authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, etc.)
 */

import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getDb } from "../../db";
import { users } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

export class TwoFactorAuthService {
  /**
   * Generate TOTP secret and QR code
   * Returns secret and QR code data URL for user to scan
   */
  static async generateTOTPSecret(
    userEmail: string,
    appName: string = "ClientSphere"
  ): Promise<{
    success: boolean;
    secret?: string;
    qrCodeUrl?: string;
    backupCodes?: string[];
    error?: string;
  }> {
    try {
      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `${appName} (${userEmail})`,
        issuer: appName,
        length: 32, // 256-bit secret
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

      // Generate backup codes (10 codes for account recovery)
      const backupCodes = this.generateBackupCodes(10);

      return {
        success: true,
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      console.error("[TwoFactorAuthService] Generate secret error:", error);
      return { success: false, error: "Failed to generate 2FA secret" };
    }
  }

  /**
   * Verify TOTP token
   */
  static async verifyTOTPToken(
    secret: string,
    token: string,
    window: number = 1
  ): Promise<boolean> {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
        window, // Allow 30 seconds before/after for time drift
      });

      return verified;
    } catch (error) {
      console.error("[TwoFactorAuthService] Verify token error:", error);
      return false;
    }
  }

  /**
   * Enable 2FA for user
   */
  static async enableTwoFactorAuth(
    userId: number,
    totpSecret: string,
    backupCodes: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();

      // Hash backup codes before storing
      const hashedBackupCodes = backupCodes.map((code) =>
        this.hashBackupCode(code)
      );

      await db
        .update(users)
        .set({
          twoFactorEnabled: 1,
          twoFactorSecret: totpSecret,
          twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
          twoFactorEnabledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      console.error("[TwoFactorAuthService] Enable 2FA error:", error);
      return { success: false, error: "Failed to enable 2FA" };
    }
  }

  /**
   * Disable 2FA for user
   */
  static async disableTwoFactorAuth(userId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const db = await getDb();

      await db
        .update(users)
        .set({
          twoFactorEnabled: 0,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      console.error("[TwoFactorAuthService] Disable 2FA error:", error);
      return { success: false, error: "Failed to disable 2FA" };
    }
  }

  /**
   * Verify backup code (one-time use)
   */
  static async verifyBackupCode(
    userId: number,
    backupCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();

      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || !user.twoFactorBackupCodes) {
        return { success: false, error: "No backup codes found" };
      }

      // Parse backup codes
      const backupCodes = JSON.parse(user.twoFactorBackupCodes);

      // Find matching code
      const codeIndex = backupCodes.findIndex((hashedCode: string) =>
        this.verifyBackupCode(backupCode, hashedCode)
      );

      if (codeIndex === -1) {
        return { success: false, error: "Invalid backup code" };
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1);

      // Update user
      await db
        .update(users)
        .set({
          twoFactorBackupCodes: JSON.stringify(backupCodes),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      console.error("[TwoFactorAuthService] Verify backup code error:", error);
      return { success: false, error: "Failed to verify backup code" };
    }
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup code
   */
  private static hashBackupCode(code: string): string {
    // In production, use bcryptjs or similar
    // For now, using simple hash (should be replaced with proper hashing)
    return Buffer.from(code).toString("base64");
  }

  /**
   * Verify backup code against hash
   */
  private static verifyBackupCode(code: string, hash: string): boolean {
    // In production, use bcryptjs.compare()
    // For now, using simple comparison
    return Buffer.from(code).toString("base64") === hash;
  }

  /**
   * Get remaining backup codes count
   */
  static async getBackupCodesCount(userId: number): Promise<number> {
    try {
      const db = await getDb();

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || !user.twoFactorBackupCodes) {
        return 0;
      }

      const backupCodes = JSON.parse(user.twoFactorBackupCodes);
      return backupCodes.length;
    } catch (error) {
      console.error("[TwoFactorAuthService] Get codes count error:", error);
      return 0;
    }
  }

  /**
   * Check if 2FA is enabled for user
   */
  static async isTwoFactorEnabled(userId: number): Promise<boolean> {
    try {
      const db = await getDb();

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      return user?.twoFactorEnabled === 1;
    } catch (error) {
      console.error("[TwoFactorAuthService] Check 2FA error:", error);
      return false;
    }
  }
}
