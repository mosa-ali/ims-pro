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


function buildLocalOpenId(email: string | null | undefined, userId: number) {
  if (!email) return `local-user-${userId}`;
  return `local-${email.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
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

  /**
   * Handle Microsoft OAuth callback
   * Input: { code: string, state: string, organizationId?: number }
   * Returns: { success: boolean, user: {...} }
   */
  handleMicrosoftCallback: publicProcedure
    .input(z.object({ code: z.string(), state: z.string(), organizationId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // 🔹 1. Validate state
        if (!entraIdAuthService.validateState(input.state)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired state parameter",
          });
        }

        // 🔹 2. Exchange code + get user info
        const config = entraIdAuthService.getConfig();
        const tokens = await entraIdAuthService.exchangeCodeForToken(config, input.code);
        const userInfo = await entraIdAuthService.getUserInfo(tokens.accessToken, tokens.idToken);

        // 🔹 3. Resolve organization
        const orgContext = await tenantOrganizationMappingService.resolveOrganizationByTenant(
          userInfo.tenantId
        );

        if (!orgContext) {
          console.warn(`[Auth] No organization found for Microsoft tenant: ${userInfo.tenantId}`);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Your Microsoft account is not associated with any organization in this system",
          });
        }

        // 🔹 4. Validate domain
        const domainValid = await tenantOrganizationMappingService.validateUserDomain(
          userInfo.email,
          orgContext.organizationId
        );

        if (!domainValid) {
          console.warn(
            `[Auth] User email domain mismatch: ${userInfo.email} for org ${orgContext.organizationId}`
          );
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `Your email domain is not authorized for ${orgContext.organizationName}.`,
          });
        }

        // 🔹 5. Prepare DB
        const openId = `ms-${userInfo.id}`;
        const database = await getDb();
        const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");

        const [existingUser] = await database
          .select()
          .from(users)
          .where(eq(users.openId, openId))
          .limit(1);

        // 🔹 5B. USER APPROVAL WORKFLOW: Reject if user not pre-added by org admin
        // Microsoft users MUST be pre-added via domain search by org admin
        if (!existingUser) {
          console.warn(
            `[Auth] Microsoft user ${userInfo.email} not pre-added in system for org ${orgContext.organizationId}`
          );
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Your account has not been set up. Please contact your organization administrator to add you to the system.",
          });
        }

        // 🔹 6. Update existing user (no auto-creation - user must be pre-approved)
        await database
          .update(users)
          .set({
            name: userInfo.displayName,
            email: userInfo.email,
            loginMethod: "microsoft",
            organizationId: orgContext.organizationId,
            lastSignedIn: nowSql,
          })
          .where(eq(users.openId, openId));

        // 🔹 7. Create session
        const sessionToken = await sdk.createSessionToken(openId, {
          name: userInfo.displayName || "",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });

        // 🔹 8. Log
        console.log(
          `[Auth] Microsoft login successful: user ${userInfo.email} mapped to org ${orgContext.organizationId}`
        );

        // 🔹 9. Response
        return {
          success: true,
          user: {
            id: userInfo.id,
            email: userInfo.email,
            displayName: userInfo.displayName,
            authProvider: "microsoft",
            organizationId: orgContext.organizationId,
            organizationName: orgContext.organizationName,
            tenantId: userInfo.tenantId,
          },
        };

      } catch (err) {
        console.error("Failed to handle Microsoft callback:", err);

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process Microsoft login",
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

  // ============================================
  // EMAIL/PASSWORD LOGIN PROCEDURES
  // ============================================

  /**
   * Email/password login — works in both Manus-hosted and local environments.
   * Sets the same JWT session cookie used by Manus OAuth so the rest of the
   * auth stack (sdk.authenticateRequest, protectedProcedure) works unchanged.
   *
   * ✅ FIX: authenticateUser() returns {success, user, error} — must destructure
   * ✅ FIX: buildLocalOpenId(email, userId) — second arg is user.id (number)
   * ✅ FIX: upsertUser() does not accept authenticationProvider — use db.update instead
   */
  emailSignIn: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // ─────────────────────────────────────────────────────────────────
        // 1️⃣ AUTHENTICATE USER WITH EMAIL/PASSWORD
        // ─────────────────────────────────────────────────────────────────
        // ✅ FIX: authenticateUser returns {success, user, error} — NOT the user directly
        const authResult = await EmailPasswordAuthService.authenticateUser(
          input.email,
          input.password
        );

        if (!authResult.success || !authResult.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: authResult.error || "Invalid email or password",
          });
        }

        const user = authResult.user;

        // ─────────────────────────────────────────────────────────────────
        // 2️⃣ USER APPROVAL WORKFLOW: CHECK IF USER IS PRE-APPROVED
        // ─────────────────────────────────────────────────────────────────
        // CRITICAL: Reject login if user not pre-added by platform admin
        // Users must exist in database with proper role assignment
        const database = await getDb();
        const existingUser = await database.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        if (!existingUser) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Your account has not been set up. Please contact your administrator.",
          });
        }

        // ─────────────────────────────────────────────────────────────────
        // 2B️⃣ PUBLIC DOMAIN RESTRICTION: Only platform admins can use public domains
        // ─────────────────────────────────────────────────────────────────
        const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'protonmail.com'];
        const emailDomain = user.email?.split('@')[1]?.toLowerCase() || '';
        const isPublicDomain = publicDomains.includes(emailDomain);

        if (isPublicDomain) {
          if (existingUser.role !== 'platform_admin' && existingUser.role !== 'platform_super_admin') {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Public domain email addresses are only allowed for platform administrators. Please use your organizational email.",
            });
          }
        }

        // ─────────────────────────────────────────────────────────────────
        // 3️⃣ VALIDATE REQUIRED USER PROPERTIES
        // ─────────────────────────────────────────────────────────────────
        if (!user.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User account is missing email address",
          });
        }

        if (!user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User account is missing ID",
          });
        }

        // ─────────────────────────────────────────────────────────────────
        // 3️⃣ GENERATE STABLE OPENID FOR SESSION
        // ─────────────────────────────────────────────────────────────────
        // ✅ FIX: second arg is user.id (number), NOT the user object
        const openId = buildLocalOpenId(user.email, user.id);

        // ─────────────────────────────────────────────────────────────────
        // 4️⃣ UPDATE USER IN DATABASE
        // ─────────────────────────────────────────────────────────────────
        // ✅ FIX: upsertUser does not accept authenticationProvider — use direct update
        const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");
        await database
          .update(users)
          .set({
            openId,
            loginMethod: "email",
            lastSignedIn: nowSql,
          })
          .where(eq(users.id, user.id));

        // ─────────────────────────────────────────────────────────────────
        // 5️⃣ CREATE JWT SESSION TOKEN
        // ─────────────────────────────────────────────────────────────────
        const sessionToken = await sdk.createSessionToken(openId, {
          name: user.name || "",
        });

        // ─────────────────────────────────────────────────────────────────
        // 6️⃣ SET SESSION COOKIE
        // ─────────────────────────────────────────────────────────────────
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });

        // ─────────────────────────────────────────────────────────────────
        // 7️⃣ LOG SUCCESSFUL LOGIN
        // ─────────────────────────────────────────────────────────────────
        console.log(`[Auth] Email login successful for: ${user.email}`);

        // ─────────────────────────────────────────────────────────────────
        // 8️⃣ RETURN SUCCESS RESPONSE
        // ─────────────────────────────────────────────────────────────────
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };

      } catch (err: any) {
        console.error("[Auth] Failed to login with email:", err);

        if (err?.message?.includes("Invalid email or password") ||
            err?.message?.includes("deactivated") ||
            err?.message?.includes("locked")) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: err.message,
          });
        }

        if (err instanceof TRPCError) throw err;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to authenticate",
        });
      }
    }),

  /**
   * Logout
   * Clears the session cookie so user is no longer authenticated
   * Returns: { success: boolean }
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    try {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);

      console.log("[Auth] User logged out successfully");

      return { success: true };
    } catch (err) {
      console.error("[Auth] Failed to logout:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to logout",
      });
    }
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

  // ============================================
  // USER REGISTRATION & BULK IMPORT
  // ============================================

  /**
   * DISABLED: User registration is restricted to platform administrators only
   */
  registerWithEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // 🚨 DISABLED: User registration is restricted to platform administrators only
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User registration is disabled. Only platform administrators can add users to the system. Please contact your administrator.',
      });
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

            // ✅ FIX: upsertUser does not accept authenticationProvider — use direct upsert then update
            const openId = `ms-${user.id}`;
            // 🔒 VALIDATION BEFORE IMPORT
              if (!user.userPrincipalName || !user.userPrincipalName.trim()) {
                failedUsers.push({ userId, reason: 'Missing email' });
                continue;
              }

              if (!user.displayName || !user.displayName.trim()) {
                failedUsers.push({ userId, reason: 'Missing display name' });
                continue;
              }

              if (user.userPrincipalName === "temp@system.local") {
                failedUsers.push({ userId, reason: 'Invalid system email' });
                continue;
              }

            await db.upsertUser({
              openId,
              name: user.displayName,
              email: user.userPrincipalName,
              loginMethod: 'microsoft',
              lastSignedIn: nowSql,
            });

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

  // ============================================
  // AUTH STATE PROCEDURES
  // ============================================

  /**
   * Get current user info
   * Returns: { user: {...} | null }
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const database = await getDb();
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not found",
        });
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      };
    } catch (err) {
      console.error('[Auth] me procedure error:', err);
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication failed",
      });
    }
  }),
});
