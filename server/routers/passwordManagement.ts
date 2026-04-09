import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { sendEmail } from "../_core/email";
import { ENV } from "../_core/env";

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character");

export const passwordManagementRouter = router({
  // ─── Request password reset ────────────────────────────────────────────────
  requestReset: publicProcedure
    .input(z.object({
      email: z.string().email("Invalid email address"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });

      const [user] = await db
        .select({ id: users.id, email: users.email, name: users.name, authenticationProvider: users.authenticationProvider })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      // Always return success to prevent email enumeration
      if (!user) {
        return { success: true, message: "If an account with that email exists, a password reset link has been sent." };
      }

      // Only allow reset for email-authenticated users
      if (user.authenticationProvider && user.authenticationProvider !== "email") {
        return { success: true, message: "If an account with that email exists, a password reset link has been sent." };
      }

      const token = generateResetToken();
      const expiresAt = Date.now() + 3600000; // 1 hour

      await db
        .update(users)
        .set({
          passwordResetToken: token,
          passwordResetExpiry: expiresAt,
        })
        .where(eq(users.id, user.id));

      // Determine the app base URL for the reset link
      const resetLink = `${ENV.APP_BASE_URL}/reset-password/${token}`;

      // Send password reset email
      await sendEmail({
        to: user.email || input.email,
        subject: "Password Reset Request – IMS",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Password Reset Request</h2>
            <p>Hello ${user.name || 'User'},</p>
            <p>We received a request to reset your IMS password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="background: #1e40af; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
            <p style="color: #6b7280; font-size: 12px;">Or copy this link: ${resetLink}</p>
          </div>
        `,
        text: `Password Reset Request\n\nHello ${user.name || 'User'},\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link expires in 1 hour.`,
      }).catch(() => {}); // Non-blocking

      return {
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      };
    }),

  // ─── Reset password using token ───────────────────────────────────────────
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string().min(1, "Token is required"),
      newPassword: passwordSchema,
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });

      const now = Date.now();

      const [user] = await db
        .select({ id: users.id, passwordResetExpiry: users.passwordResetExpiry })
        .from(users)
        .where(eq(users.passwordResetToken, input.token))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      // Check expiry
      const expiresAt = user.passwordResetExpiry ? Number(user.passwordResetExpiry) : 0;
      if (expiresAt < now) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Reset token has expired. Please request a new one.",
        });
      }

      const hashedPassword = await bcryptjs.hash(input.newPassword, 12);

      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
        })
        .where(eq(users.id, user.id));

      return { success: true, message: "Password has been reset successfully" };
    }),

  // ─── Change password (authenticated users) ────────────────────────────────
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });

      const [user] = await db
        .select({ id: users.id, passwordHash: users.passwordHash, authenticationProvider: users.authenticationProvider })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.authenticationProvider && user.authenticationProvider !== "email") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password change is only available for email-authenticated accounts",
        });
      }

      if (!user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No password set for this account" });
      }

      const isValid = await bcryptjs.compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Current password is incorrect",
        });
      }

      const hashedPassword = await bcryptjs.hash(input.newPassword, 12);

      await db
        .update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.id, ctx.user.id));

      return { success: true, message: "Password changed successfully" };
    }),

  // ─── Set initial password (admin action) ──────────────────────────────────
  setPassword: protectedProcedure
    .input(z.object({
      userId: z.number(),
      newPassword: passwordSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const adminRoles = ["platform_super_admin", "platform_admin", "admin"];
      if (!adminRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only platform admins can set user passwords" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });

      const [targetUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const hashedPassword = await bcryptjs.hash(input.newPassword, 12);

      await db
        .update(users)
        .set({ passwordHash: hashedPassword })
        .where(eq(users.id, input.userId));

      return { success: true, message: "Password set successfully" };
    }),
});
