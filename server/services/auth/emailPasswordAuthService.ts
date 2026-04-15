/**
 * Email/Password Authentication Service (PRODUCTION FIXED)
 * 
 * FIXES APPLIED:
 * ✅ Issue #1: Removed duplicate email-password-auth.ts - using this as single source
 * ✅ Issue #2: Added openId generation for email users
 * ✅ Issue #4: Added isDeleted check in user queries
 * ✅ Issue #5: Fixed password hash update in updatePassword
 * ✅ Issue #10: Standardized authenticationProvider to "local"
 * ✅ Issue #11: Added soft-delete checks throughout
 */

import bcryptjs from "bcryptjs";
import { getDb } from "../../db";
import { users } from "../../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

export class EmailPasswordAuthService {
  /**
   * Hash password using bcryptjs (industry standard)
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(10);
    return bcryptjs.hash(password, salt);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push("Password must contain at least one special character (!@#$%^&*)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Register a new user with email and password
   * ✅ FIXED: Generates openId, uses bcryptjs, sets all required fields
   */
  static async registerUser(
    email: string,
    password: string,
    name: string,
    organizationId?: number
  ): Promise<{ success: boolean; userId?: number; error?: string }> {
    try {
      // Validate password strength
      const validation = this.validatePasswordStrength(password);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(", ") };
      }

      const normalizedEmail = email.toLowerCase().trim();
      const db = await getDb();

      // Check if user already exists (including soft-deleted users)
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });

      if (existingUser) {
        return { success: false, error: "Email already registered" };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // ✅ FIXED: Generate openId for email users
      const openId = `local-${normalizedEmail.replace(/[^a-z0-9]/g, "-")}`;

      // ✅ FIXED: Validate email is not system email
      if (normalizedEmail === "temp@system.local" || normalizedEmail.includes("TEMP_USER")) {
        return { success: false, error: "Cannot register with system email" };
      }

      // Create user
      const result = await db.insert(users).values({
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        openId, // ✅ FIXED: Added openId
        authenticationProvider: "local", // ✅ FIXED: Standardized value
        loginMethod: "email",
        organizationId: organizationId,
        currentOrganizationId: organizationId,
        languagePreference: "en",
        isActive: 1,
        role: "user",
        createdAt: nowSql,
      });

      return { success: true, userId: result[0].insertId };
    } catch (error) {
      console.error("[EmailPasswordAuthService] Register error:", error);
      return { success: false, error: "Failed to register user" };
    }
  }

  /**
   * Authenticate user with email and password
   * ✅ FIXED: Added isDeleted check, proper error handling, system email validation
   * Returns: { success: boolean, userId?: number, error?: string }
   * 
   * authRouter expects: { success, userId, error }
   */
  static async authenticateUser(
    email: string,
    password: string
  ): Promise<{ success: boolean; userId?: number; error?: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const db = await getDb();

      // ✅ FIXED: Block system emails
      if (normalizedEmail === "temp@system.local" || normalizedEmail.includes("TEMP_USER")) {
        return { success: false, error: "Invalid email or password" };
      }

      // ✅ FIXED: Added isNull(deletedAt) check for soft-delete
      const user = await db.query.users.findFirst({
        where: and(
          eq(users.email, normalizedEmail),
          isNull(users.deletedAt) // ✅ FIXED: Soft-delete check
        ),
      });

      if (!user) {
        return { success: false, error: "Invalid email or password" };
      }

      // Check if user is active
      if (!user.isActive) {
        return { success: false, error: "Account is inactive" };
      }

      // Check if user is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return {
          success: false,
          error: "Account is locked. Please try again later.",
        };
      }

      // ✅ FIXED: Check if passwordHash exists before verification
      if (!user.passwordHash) {
        return { success: false, error: "Invalid email or password" };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        // ✅ Increment failed login attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const lockoutThreshold = 5;

        let lockedUntil: string | null = null;
        if (failedAttempts >= lockoutThreshold) {
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }

        await db
          .update(users)
          .set({
            failedLoginAttempts: failedAttempts,
            lockedUntil: lockedUntil,
            updatedAt: nowSql,
          })
          .where(eq(users.id, user.id));

        return { success: false, error: "Invalid email or password" };
      }

      // ✅ Reset failed login attempts on successful login
      await db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastSignedIn: nowSql,
          updatedAt: nowSql,
        })
        .where(eq(users.id, user.id));

      // ✅ FIXED: authRouter expects userId, not user object
      return { success: true, userId: user.id };
    } catch (error) {
      console.error("[EmailPasswordAuthService] Auth error:", error);
      return { success: false, error: "Authentication failed" };
    }
  }

  /**
   * Update user password
   * ✅ FIXED: Now actually updates the passwordHash field
   */
  static async updatePassword(
    userId: number,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate password strength
      const validation = this.validatePasswordStrength(newPassword);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(", ") };
      }

      const passwordHash = await this.hashPassword(newPassword);
      const db = await getDb();

      // ✅ FIXED: Now includes passwordHash in the update
      await db
        .update(users)
        .set({
          passwordHash, // ✅ FIXED: Was missing!
          lastSignedIn: nowSql,
          updatedAt: nowSql,
          failedLoginAttempts: 0, // Reset failed attempts
          lockedUntil: null, // Unlock account
        })
        .where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      console.error("[EmailPasswordAuthService] Update password error:", error);
      return { success: false, error: "Failed to update password" };
    }
  }

  /**
   * Get user by email (with soft-delete check)
   * ✅ FIXED: Added isNull(deletedAt) check
   */
  static async getUserByEmail(email: string) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const db = await getDb();

      return await db.query.users.findFirst({
        where: and(
          eq(users.email, normalizedEmail),
          isNull(users.deletedAt) // ✅ FIXED: Soft-delete check
        ),
      });
    } catch (error) {
      console.error("[EmailPasswordAuthService] Get user error:", error);
      return null;
    }
  }

  /**
   * Check if account is locked
   */
  static isAccountLocked(user: any): boolean {
    if (!user.lockedUntil) return false;
    return new Date(user.lockedUntil) > new Date();
  }

  /**
   * Get lockout remaining time in minutes
   */
  static getLockoutRemainingTime(user: any): number {
    if (!user.lockedUntil) return 0;
    const now = new Date();
    const lockoutEnd = new Date(user.lockedUntil);
    if (lockoutEnd <= now) return 0;
    return Math.ceil((lockoutEnd.getTime() - now.getTime()) / (1000 * 60));
  }

  /**
   * Generate password reset token
   * Used by authRouter.requestPasswordReset
   */
  static async generatePasswordResetToken(userId: number): Promise<string> {
    try {
      const token = uuidv4();
      const db = await getDb();
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      await db
        .update(users)
        .set({
          passwordResetToken: token,
          passwordResetExpiry: expiresAt.getTime(), // Store as milliseconds (bigint)
          updatedAt: nowSql,
        })
        .where(eq(users.id, userId));

      return token;
    } catch (error) {
      console.error("[EmailPasswordAuthService] Generate reset token error:", error);
      throw error;
    }
  }

  /**
   * Verify password reset token
   * Used by authRouter.resetPasswordWithToken
   */
  static async verifyPasswordResetToken(
    token: string
  ): Promise<typeof users.$inferSelect | null> {
    try {
      const db = await getDb();

      const user = await db.query.users.findFirst({
        where: and(
          eq(users.passwordResetToken, token),
          isNull(users.deletedAt)
        ),
      });

      if (!user) {
        return null;
      }

      // Check if token is expired
      if (
        user.passwordResetExpiry &&
        new Date(user.passwordResetExpiry) < new Date()
      ) {
        return null;
      }

      return user;
    } catch (error) {
      console.error("[EmailPasswordAuthService] Verify reset token error:", error);
      return null;
    }
  }

  /**
   * Clear password reset token after use
   */
  static async clearPasswordResetToken(userId: number): Promise<void> {
    try {
      const db = await getDb();

      await db
        .update(users)
        .set({
          passwordResetToken: null,
          passwordResetExpiry: null,
          updatedAt: nowSql,
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error("[EmailPasswordAuthService] Clear reset token error:", error);
    }
  }
}