/**
 * PRODUCTION AUTHENTICATION ROUTER - FIXED TO MATCH ACTUAL SERVICES
 * 
 * All methods now match actual service implementations:
 * - GraphAuthService: getAccessToken(), validateTenant()
 * - GraphUserService: searchUsers(), getUserById(), getUserByEmail()
 * - EmailPasswordAuthService: authenticateUser(), verifyPassword()
 * - Database schema: microsoftObjectId, emailVerified, passwordHash, etc.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { graphAuthService } from "../services/microsoft/graphAuthService";
import { graphUserService } from "../services/microsoft/graphUserService";
import { EmailPasswordAuthService } from "../services/auth/emailPasswordAuthService";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import * as db from "../db";
import { ENV } from "../_core/env";
import { sendPasswordResetEmail } from "../services/emailService";
import { sdk } from "../_core/sdk";

export const authRouter = router({
  // ============================================
  // MICROSOFT ENTRA OAUTH PROCEDURES
  // ============================================

  /**
   * Check if Microsoft OAuth is configured
   * Returns: { configured: boolean }
   */
  microsoftStatus: publicProcedure.query(async () => {
    try {
      const isConfigured = !!(
        ENV.MS_CLIENT_ID &&
        ENV.MS_CLIENT_SECRET &&
        ENV.MS_TENANT_ID &&
        ENV.MS_REDIRECT_URI
      );

      return { configured: isConfigured };
    } catch (error) {
      console.error("[authRouter] microsoftStatus error:", error);
      return { configured: false };
    }
  }),

  /**
   * Get Microsoft OAuth login URL
   * Returns: { loginUrl: string }
   */
  getMicrosoftLoginUrl: publicProcedure.query(async () => {
    try {
      const loginUrl = `https://login.microsoftonline.com/${ENV.MS_TENANT_ID}/oauth2/v2.0/authorize?client_id=${ENV.MS_CLIENT_ID}&redirect_uri=${encodeURIComponent(ENV.MS_REDIRECT_URI || "")}&response_type=code&scope=openid profile email`;
      
      return { loginUrl };
    } catch (error) {
      console.error("[authRouter] getMicrosoftLoginUrl error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate Microsoft login URL",
      });
    }
  }),

  /**
   * Search Microsoft 365 users
   * Input: { query: string }
   * Returns: { users: [...] }
   */
  searchMicrosoft365Users: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const results = await graphUserService.searchUsers(
          ENV.MS_TENANT_ID || "",
          input.query,
          10
        );
        return { users: results || [] };
      } catch (error) {
        console.error("[authRouter] searchMicrosoft365Users error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search Microsoft 365 users",
        });
      }
    }),

  /**
   * Get Microsoft 365 user by ID
   * Input: { userId: string }
   * Returns: { user: {...} }
   */
  getMicrosoft365User: publicProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const user = await graphUserService.getUserById(
          ENV.MS_TENANT_ID || "",
          input.userId
        );
        return { user };
      } catch (error) {
        console.error("[authRouter] getMicrosoft365User error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve Microsoft 365 user",
        });
      }
    }),

  /**
   * Logout
   * Returns: { success: boolean }
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    try {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions });
      return { success: true };
    } catch (error) {
      console.error("[authRouter] logout error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to logout",
      });
    }
  }),

  // ============================================
  // EMAIL/PASSWORD AUTHENTICATION
  // ============================================

  /**
   * Login with email and password
   * Input: { email: string, password: string }
   * Returns: { success: boolean, user: {...}, message?: string }
   */
  loginWithEmail: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("[authRouter] loginWithEmail called for:", input.email);

        // ✅ FIXED: authenticateUser returns { success, userId, error }, not a user object
        const authResult = await EmailPasswordAuthService.authenticateUser(input.email, input.password);
        
        if (!authResult.success || !authResult.userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: authResult.error || "Invalid email or password",
          });
        }

        // Get the user object for the response
        const user = await db.getUserById(authResult.userId);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not found",
          });
        }

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, String(user.id), {
          ...cookieOptions,
        });

        return {
          success: true,
          user,
          message: "Successfully logged in",
        };
      } catch (error) {
        console.error("[authRouter] loginWithEmail error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to login",
        });
      }
    }),

  /**
   * Email sign-in with verification
   * Input: { email: string, password: string }
   * Returns: { success: boolean, user: {...}, message?: string }
   * 
   * ✅ FIXED: Now uses EmailPasswordAuthService.authenticateUser() which includes:
   * - Provider check (must be "local")
   * - Account lockout checks
   * - Failed login attempt tracking
   * - Soft-delete checks
   */
  emailSignIn: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("[authRouter] emailSignIn called for:", input.email);

        // ✅ FIXED: authenticateUser returns { success, userId, error }, not a user object
        const authResult = await EmailPasswordAuthService.authenticateUser(
          input.email,
          input.password
        );

        if (!authResult.success || !authResult.userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: authResult.error || "Invalid email or password",
          });
        }

        // Get user for response
        const user = await db.getUserById(authResult.userId);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, String(user.id), {
          ...cookieOptions,
        });

        console.log(`[Auth] Email login successful for: ${user.email}`);

        return {
          success: true,
          user,
          message: "Successfully logged in",
        };
      } catch (error) {
        console.error("[authRouter] emailSignIn error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to sign in",
        });
      }
    }),

  /**
   * Register new user with email and password
   * Input: { email: string, password: string, name: string, organizationId?: number }
   * Returns: { success: boolean, user: {...}, message?: string }
   */
  /**
   * DISABLED: User registration is restricted to platform administrators only
   * 
   * Rationale:
   * - Prevents unauthorized user creation
   * - Prevents duplicate user records
   * - Ensures admins control who gets access
   * - Maintains security and data integrity
   */
  registerWithEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
      organizationId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 🚨 DISABLED: User registration is restricted to platform administrators only
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User registration is disabled. Only platform administrators can add users to the system. Please contact your administrator.',
      });
    }),

  /**
   * Update password
   * Input: { currentPassword: string, newPassword: string }
   * Returns: { success: boolean, message?: string }
   */
  updatePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("[authRouter] updatePassword called for user:", ctx.user.id);

        // Verify current password
        const isPasswordValid = await EmailPasswordAuthService.verifyPassword(
          input.currentPassword,
          ctx.user.passwordHash || ""
        );
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Current password is incorrect",
          });
        }

        // Validate new password strength
        const passwordStrength = EmailPasswordAuthService.validatePasswordStrength(input.newPassword);
        if (!passwordStrength.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Password does not meet requirements: ${passwordStrength.errors.join(", ")}`,
          });
        }

        // Update password
        await EmailPasswordAuthService.updatePassword(ctx.user.id, input.newPassword);

        return {
          success: true,
          message: "Password updated successfully",
        };
      } catch (error) {
        console.error("[authRouter] updatePassword error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update password",
        });
      }
    }),

  /**
   * Request password reset
   * Input: { email: string }
   * Returns: { success: boolean, message?: string, resetLink?: string }
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      try {
        console.log("[authRouter] requestPasswordReset called for:", input.email);

        // Get user by email
        const user = await db.getUserByEmail(input.email);
        if (user && user.email === "temp@system.local") {
            return {
              success: true,
              message: "Invalid system user",
            };
          }
        if (!user) {
          // Don't reveal if user exists
          return {
            success: true,
            message: "If an account exists with this email, a password reset link will be sent",
          };
        }

        // Generate password reset token
        const token = await EmailPasswordAuthService.generatePasswordResetToken(user.id);

        // Build reset link
        const resetLink = `${ENV.APP_BASE_URL}/reset-password`;

        // Send password reset email
        const emailSent = await sendPasswordResetEmail(
          user.organizationId || 1,
          user.email,
          user.name || user.email,
          token,
          resetLink
        );

        if (!emailSent) {
          console.warn("[authRouter] Failed to send password reset email to:", user.email);
        }

        return {
          success: true,
          message: "If an account exists with this email, a password reset link will be sent",
          resetLink: emailSent ? resetLink : undefined,
        };
      } catch (error) {
        console.error("[authRouter] requestPasswordReset error:", error);
        return {
          success: true,
          message: "If an account exists with this email, a password reset link will be sent",
        };
      }
    }),

  /**
   * Reset password with token
   * Input: { token: string, newPassword: string }
   * Returns: { success: boolean, message?: string }
   */
  resetPasswordWithToken: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      try {
        console.log("[authRouter] resetPasswordWithToken called");

        // Verify token and get user
        const user = await EmailPasswordAuthService.verifyPasswordResetToken(input.token);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired password reset token",
          });
        }

        // Validate new password strength
        const passwordStrength = EmailPasswordAuthService.validatePasswordStrength(input.newPassword);
        if (!passwordStrength.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Password does not meet requirements: ${passwordStrength.errors.join(", ")}`,
          });
        }

        // Update password
        await EmailPasswordAuthService.updatePassword(user.id, input.newPassword);

        return {
          success: true,
          message: "Password reset successfully",
        };
      } catch (error) {
        console.error("[authRouter] resetPasswordWithToken error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset password",
        });
      }
    }),

  /**
   * Get current user info
   * Returns: { user: {...} }
   */
  me: publicProcedure.query(async ({ ctx }) => {
    try {
      return { user: ctx.user || null };
    } catch (error) {
      console.error("[authRouter] me error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve user info",
      });
    }
  }),
});
