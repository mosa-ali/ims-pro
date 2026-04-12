/**
 * ============================================================================
 * Platform Email Settings Router
 * ============================================================================
 *
 * Manages the platform-level email configuration used for sending system
 * emails (onboarding links, notifications) when an organization has not
 * yet configured its own email provider.
 *
 * All procedures are platform-admin-only.
 * ============================================================================
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { router, platformScopedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { platformEmailSettings } from "../../drizzle/schema";
import { platformEmailService } from "../services/platformEmailService";

export const platformEmailRouter = router({
  /**
   * Get current platform email settings (credentials masked).
   */
  getSettings: platformScopedProcedure.query(async () => {
    // ✅ FIX: MUST await getDb()
    const db = await getDb();

    const rows = await db.select().from(platformEmailSettings).limit(1);
    const settings = rows[0] ?? null;

    if (!settings) {
      return null;
    }

    // Mask sensitive credentials
    return {
      ...settings,
      clientSecret: settings.clientSecret ? "••••••••" : null,
      smtpPassword: settings.smtpPassword ? "••••••••" : null,
    };
  }),

  /**
   * Save platform email settings.
   * Creates a new record if none exists, otherwise updates the existing one.
   */
  saveSettings: platformScopedProcedure
    .input(
      z.object({
        providerType: z.enum(["m365", "smtp", "disabled"]),

        // M365 fields
        tenantId: z.string().optional(),
        clientId: z.string().optional(),
        clientSecret: z.string().optional(),

        senderEmail: z.string().email().optional(),
        senderName: z.string().optional(),
        replyToEmail: z.string().email().optional().nullable(),

        // SMTP fields
        smtpHost: z.string().optional(),
        smtpPort: z.number().int().min(1).max(65535).optional(),
        smtpUsername: z.string().optional(),
        smtpPassword: z.string().optional(),
        smtpEncryption: z.enum(["tls", "ssl", "none"]).optional(),

        // Status
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // ✅ FIX: MUST await getDb()
      const db = await getDb();

      const existing = await db
        .select()
        .from(platformEmailSettings)
        .limit(1);

      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      
      const userId = ctx.user.id;

      // Build update payload
      const updateData: Partial<typeof platformEmailSettings.$inferInsert> = {
        providerType: input.providerType,
        tenantId: input.tenantId ?? null,
        clientId: input.clientId ?? null,
        senderEmail: input.senderEmail ?? null,
        senderName: input.senderName ?? "IMS Platform",
        replyToEmail: input.replyToEmail ?? null,

        smtpHost: input.smtpHost ?? null,
        smtpPort: input.smtpPort ?? null,
        smtpUsername: input.smtpUsername ?? null,
        smtpEncryption: input.smtpEncryption ?? "tls",

        isActive: input.isActive ? 1 : 0,
        updatedBy: userId,
      };

      // Only update secrets if new value provided (avoid overwriting with masked value)
      if (input.clientSecret && input.clientSecret !== "••••••••") {
        updateData.clientSecret = input.clientSecret;
      }

      if (input.smtpPassword && input.smtpPassword !== "••••••••") {
        updateData.smtpPassword = input.smtpPassword;
      }

      if (existing.length === 0) {
        // Create new record
        await db.insert(platformEmailSettings).values({
          ...updateData,
          createdBy: userId,
        } as typeof platformEmailSettings.$inferInsert);
      } else {
        // Update existing record
        await db
          .update(platformEmailSettings)
          .set(updateData)
          .where(eq(platformEmailSettings.id, existing[0].id));
      }

      // Clear cached tokens after any change
      platformEmailService.clearTokenCache();

      return { success: true };
    }),

  /**
   * Test the current platform email configuration by sending a test email.
   */
  testConfiguration: platformScopedProcedure
    .input(
      z.object({
        testRecipient: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await platformEmailService.testConfiguration(
        input.testRecipient
      );
      return result;
    }),

  /**
   * Check if platform email is configured and active.
   */
  isConfigured: platformScopedProcedure.query(async () => {
    return platformEmailService.isConfigured();
  }),
});
