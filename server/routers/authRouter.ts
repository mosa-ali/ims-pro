import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { entraIdAuthService } from "../_core/entraIdAuth";
import { graphUserService } from "../services/microsoft/graphUserService";
import { EmailPasswordAuthService } from "../services/auth/emailPasswordAuthService";
import { tenantOrganizationMappingService } from "../services/microsoft/tenantOrganizationMappingService";
import { TRPCError } from "@trpc/server";
import { sdk } from "../_core/sdk";
import { getSessionCookieOptions } from "../_core/cookies";
import { getDb } from "../db";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "../_core/env";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "../services/emailService";
import { users } from "../../drizzle/schema";
import * as db from "../db";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

/**
 * Stable openId generator (LOCAL ONLY)
 */
function buildLocalOpenId(email: string, userId: number) {
  return `local-${email.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${userId}`;
}

/**
 * ✅ FINAL CORRECTED authRouter
 *
 * Key fixes applied:
 * 1. authenticateUser() returns {success, user, error} — destructured properly
 * 2. buildLocalOpenId(email, userId) — second arg is user.id (number), not user object
 * 3. upsertUser() does not accept authenticationProvider — removed from call
 * 4. generatePasswordResetToken / verifyPasswordResetToken imported from authenticationService
 * 5. Consolidated all Microsoft login logic via entraIdAuthService
 */
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
      const config = entraIdAuthService.getConfig();
      const { url, state } = entraIdAuthService.getAuthorizationUrl(config);
      return { loginUrl: url, state };
    } catch (err) {
      console.error("[authRouter] getMicrosoftLoginUrl error:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate Microsoft login URL",
      });
    }
  }),

  // =================================================
  // MICROSOFT LOGIN (STRICT - NO AUTO CREATE)
  // =================================================
  handleMicrosoftCallback: publicProcedure
    .input(z.object({ code: z.string(), state: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (!entraIdAuthService.validateState(input.state)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid state" });
        }

        const config = entraIdAuthService.getConfig();
        const tokens = await entraIdAuthService.exchangeCodeForToken(config, input.code);
        const userInfo = await entraIdAuthService.getUserInfo(tokens.accessToken, tokens.idToken);

        const database = await getDb();

        // 🔒 STRICT: find user by email ONLY (NOT openId)
        const existingUser = await database.query.users.findFirst({
          where: eq(users.email, userInfo.email),
        });

        if (!existingUser) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not pre-registered. Contact admin.",
          });
        }

        // 🔒 HARD VALIDATION
        if (!existingUser.organizationId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User missing organization",
          });
        }

        if (existingUser.email === "temp@system.local") {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid system user",
          });
        }

        const openId = `ms-${userInfo.id}`;

        await database.update(users)
          .set({
            openId,
            name: userInfo.displayName,
            loginMethod: "microsoft",
            lastSignedIn: nowSql,
          })
          .where(eq(users.id, existingUser.id));

        const sessionToken = await sdk.createSessionToken(openId, {
          name: userInfo.displayName || "",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });

        return {
          success: true,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: userInfo.displayName,
          },
        };

      } catch (err) {
        console.error("[Auth] Microsoft login failed:", err);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Microsoft authentication failed",
        });
      }
    }),
  /**
   * Search Microsoft 365 users
   * Input: { searchTerm: string, organizationId: number, limit?: number }
   * Returns: { users: [...] }
   */
  searchMicrosoft365Users: publicProcedure
    .input(z.object({ searchTerm: z.string().min(1), organizationId: z.number(), limit: z.number().optional().default(10) }))
    .query(async ({ input }) => {
      try {
        const config = entraIdAuthService.getConfig();
        const searchResults = await graphUserService.searchUsers(config.tenantId, input.searchTerm, input.limit);

        // DOMAIN VALIDATION: Filter results to approved domain only
        const { domainValidationService } = await import('../services/organization/domainValidationService');
        const approvedDomain = await domainValidationService.getOrganizationDomain(input.organizationId);

        const filteredUsers = approvedDomain
          ? searchResults.filter((user) => {
              const domain = domainValidationService.extractDomain(user.userPrincipalName);
              return domain && domain.toLowerCase() === approvedDomain.toLowerCase();
            })
          : searchResults;

        return {
          users: filteredUsers.map((user) => ({
            id: user.id,
            email: user.userPrincipalName,
            displayName: user.displayName,
            jobTitle: user.jobTitle,
            officeLocation: user.officeLocation,
          })),
        };
      } catch (err) {
        console.error("Failed to search Microsoft 365 users:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to search Microsoft 365 directory" });
      }
    }),

  /**
   * Get Microsoft 365 user by ID
   * Input: { userId: string, organizationId: number }
   * Returns: { user: {...} }
   */
  getMicrosoft365User: publicProcedure
    .input(z.object({ userId: z.string(), organizationId: z.number() }))
    .query(async ({ input }) => {
      try {
        const config = entraIdAuthService.getConfig();
        const user = await graphUserService.getUserById(config.tenantId, input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found in Microsoft 365 directory" });
        }
        return {
          id: user.id,
          email: user.userPrincipalName,
          displayName: user.displayName,
          givenName: user.givenName,
          surname: user.surname,
          jobTitle: user.jobTitle,
          officeLocation: user.officeLocation,
        };
      } catch (err) {
        console.error("Failed to get Microsoft 365 user:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve Microsoft 365 user details" });
      }
    }),

  /**
   * Logout from Microsoft
   * Returns: { success: boolean, logoutUrl: string }
   */
  logoutMicrosoft: publicProcedure.mutation(async () => {
    try {
      return { success: true, logoutUrl: `https://login.microsoftonline.com/common/oauth2/v2.0/logout` };
    } catch (err) {
      console.error("Failed to logout from Microsoft:", err);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to logout" });
    }
  }),

  // =================================================
  // EMAIL LOGIN (FIXED)
  // =================================================
  emailSignIn: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }))
    .mutation(async ({ input, ctx }) => {

      const authResult = await EmailPasswordAuthService.authenticateUser(
        input.email,
        input.password
      );

      if (!authResult.success || !authResult.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: authResult.error || "Invalid credentials",
        });
      }

      const database = await getDb();

      // ✅ FIX: fetch FULL user object
      const user = await database.query.users.findFirst({
        where: eq(users.id, authResult.userId),
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      // 🔒 HARD VALIDATION
      if (!user.email || !user.name) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid user record",
        });
      }

      if (user.email === "temp@system.local") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid system user",
        });
      }

      if (!user.organizationId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not assigned to organization",
        });
      }

      const openId = buildLocalOpenId(user.email, user.id);

      await database.update(users)
        .set({
          openId,
          loginMethod: "email",
          lastSignedIn: nowSql,
        })
        .where(eq(users.id, user.id));

      const sessionToken = await sdk.createSessionToken(openId, {
        name: user.name,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),

  // =================================================
  // LOGOUT
  // =================================================
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
    return { success: true };
  }),

  // ============================================
  // PASSWORD RESET PROCEDURES
  // ============================================

  /**
   * Request password reset
   * Input: { email: string, resetLink: string }
   * Returns: { success: boolean, message: string }
   */
  requestPasswordReset: publicProcedure
    .input(z.object({
      email: z.string().email(),
      resetLink: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      try {
        const database = await getDb();
        // ✅ FIX: Use generateResetToken from authenticationService (not EmailPasswordAuthService)
        const { generateResetToken } = await import('../services/authenticationService');

        const [user] = await database.select().from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (!user || !user.passwordHash || user.loginMethod !== 'email') {
          return {
            success: true,
            message: 'If an account exists with that email, a password reset link has been sent',
          };
        }

        const { token, expiresAt } = generateResetToken();

        await database.update(users)
          .set({
            passwordResetToken: token,
            passwordResetExpiry: expiresAt,
          })
          .where(eq(users.id, user.id));

        await sendPasswordResetEmail(
          user.organizationId || 1,
          user.email || 'noreply@imserp.org',
          user.name || user.email || 'User',
          token,
          input.resetLink
        );

        return {
          success: true,
          message: 'If an account exists with that email, a password reset link has been sent',
        };
      } catch (err) {
        console.error('Failed to request password reset:', err);
        return {
          success: true,
          message: 'If an account exists with that email, a password reset link has been sent',
        };
      }
    }),

  /**
   * Reset password with token
   * Input: { token: string, newPassword: string, confirmPassword: string }
   * Returns: { success: boolean, message: string }
   */
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      newPassword: z.string().min(8),
      confirmPassword: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      try {
        if (input.newPassword !== input.confirmPassword) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Passwords do not match',
          });
        }

        const database = await getDb();
        // ✅ FIX: Use hashPassword from authenticationService (not EmailPasswordAuthService)
        const { hashPassword } = await import('../services/authenticationService');

        const [user] = await database.select().from(users)
          .where(eq(users.passwordResetToken, input.token))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invalid or expired reset token',
          });
        }

        if (!user.passwordResetExpiry || user.passwordResetExpiry < Date.now()) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Password reset token has expired. Please request a new one.',
          });
        }

        const passwordHash = await hashPassword(input.newPassword);

        await database.update(users)
          .set({
            passwordHash,
            passwordResetToken: null,
            passwordResetExpiry: null,
          })
          .where(eq(users.id, user.id));

        await sendPasswordChangedEmail(
          user.organizationId || 1,
          user.email || 'noreply@imserp.org',
          user.name || 'User'
        );

        return {
          success: true,
          message: 'Password has been reset successfully. You can now log in with your new password.',
        };
      } catch (err: any) {
        console.error('Failed to reset password:', err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reset password',
        });
      }
    }),

    /**
   * Bulk import Microsoft 365 users
   * Input: { organizationId: number, userIds: string[] }
   * Returns: { success: boolean, imported: [...], failed: [...] }
   */
  bulkImportMicrosoft365Users: publicProcedure
    .input(z.object({
      organizationId: z.number(),
      userIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const config = entraIdAuthService.getConfig();
        const importedUsers = [];
        const failedUsers = [];
        const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");

        for (const userId of input.userIds) {
          try {
            const user = await graphUserService.getUserById(config.tenantId, userId);
            if (!user) {
              failedUsers.push({ userId, reason: 'User not found' });
              continue;
            }

            // Validate domain
            const { domainValidationService } = await import('../services/organization/domainValidationService');
            const approvedDomain = await domainValidationService.getOrganizationDomain(input.organizationId);
            if (approvedDomain) {
              const domain = domainValidationService.extractDomain(user.userPrincipalName);
              if (!domain || domain.toLowerCase() !== approvedDomain.toLowerCase()) {
                failedUsers.push({ userId, reason: 'Email domain not approved' });
                continue;
              }
            }

            importedUsers.push({
              id: user.id,
              email: user.userPrincipalName,
              displayName: user.displayName,
            });
          } catch (err) {
            console.error(`Failed to import user ${userId}:`, err);
            failedUsers.push({ userId, reason: 'Import failed' });
          }
        }

        console.log(`[Auth] Bulk import completed: ${importedUsers.length} imported, ${failedUsers.length} failed`);

        return {
          success: true,
          imported: importedUsers,
          failed: failedUsers,
        };
      } catch (err) {
        console.error('Failed to bulk import Microsoft 365 users:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to bulk import users',
        });
      }
    }),


  // =================================================
  // CURRENT USER
  // =================================================
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const database = await getDb();

    const user = await database.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    };
  }),
});