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

export const authRouter = router({

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