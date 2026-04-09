/**
 * ============================================================================
 * Platform Email Service
 * ============================================================================
 *
 * Sends emails using the platform-level M365 configuration stored in
 * platform_email_settings. Used for system emails (onboarding links,
 * notifications) that must be sent before an organization has configured
 * its own email provider.
 *
 * ============================================================================
 */

import { getDb } from "../db";
import { platformEmailSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface PlatformEmailPayload {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  replyTo?: string;
}

export interface PlatformEmailResult {
  success: boolean;
  provider: "m365" | "smtp" | "none";
  error?: string;
}

interface GraphTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

class PlatformEmailService {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  /**
   * Get the active platform email settings from the database.
   */
  async getSettings() {
    const db = await getDb();
    const rows = await db
      .select()
      .from(platformEmailSettings)
      .where(eq(platformEmailSettings.isActive, 1))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Check if platform email is configured and active.
   */
  async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings();
    return (
      !!settings &&
      settings.providerType !== "disabled" &&
      !!settings.senderEmail
    );
  }

  /**
   * Send an email using the platform-level email provider.
   */
  async sendEmail(payload: PlatformEmailPayload): Promise<PlatformEmailResult> {
    const settings = await this.getSettings();

    if (!settings || settings.providerType === "disabled") {
      return {
        success: false,
        provider: "none",
        error: "No active platform email provider configured",
      };
    }

    if (settings.providerType === "m365") {
      return this.sendViaM365(payload, settings);
    }

    if (settings.providerType === "smtp") {
      return this.sendViaSmtp(payload, settings);
    }

    return {
      success: false,
      provider: "none",
      error: `Unsupported provider type: ${settings.providerType}`,
    };
  }

  /**
   * Send email via Microsoft Graph API using platform M365 credentials.
   */
  private async sendViaM365(
    payload: PlatformEmailPayload,
    settings: typeof platformEmailSettings.$inferSelect
  ): Promise<PlatformEmailResult> {
    try {
      if (!settings.tenantId || !settings.clientId || !settings.clientSecret) {
        return {
          success: false,
          provider: "m365",
          error: "M365 credentials incomplete (tenantId, clientId, clientSecret required)",
        };
      }

      if (!settings.senderEmail) {
        return {
          success: false,
          provider: "m365",
          error: "Sender email not configured",
        };
      }

      const token = await this.getM365Token(
        settings.tenantId,
        settings.clientId,
        settings.clientSecret
      );

      const message = {
        subject: payload.subject,
        body: {
          contentType: "HTML",
          content: payload.bodyHtml,
        },
        toRecipients: [
          {
            emailAddress: {
              address: payload.to,
              name: payload.toName ?? payload.to,
            },
          },
        ],
        from: {
          emailAddress: {
            address: settings.senderEmail,
            name: settings.senderName ?? "IMS Platform",
          },
        },
        replyTo: payload.replyTo || settings.replyToEmail
          ? [
              {
                emailAddress: {
                  address: payload.replyTo ?? settings.replyToEmail!,
                },
              },
            ]
          : undefined,
      };

      // Use /users/{senderEmail}/sendMail endpoint
      const sendUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(settings.senderEmail)}/sendMail`;
      const response = await fetch(sendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, saveToSentItems: false }),
      });

      if (response.status === 202 || response.status === 200) {
        return { success: true, provider: "m365" };
      }

      const errorBody = await response.text();
      return {
        success: false,
        provider: "m365",
        error: `Graph API error ${response.status}: ${errorBody.substring(0, 500)}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, provider: "m365", error: msg };
    }
  }

  /**
   * Acquire or return cached M365 access token.
   */
  private async getM365Token(
    tenantId: string,
    clientId: string,
    clientSecret: string
  ): Promise<string> {
    // Return cached token if still valid (with 5-min buffer)
    if (
      this.tokenCache &&
      this.tokenCache.expiresAt > Date.now() + 5 * 60 * 1000
    ) {
      return this.tokenCache.token;
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = (await response.json()) as GraphTokenResponse;

    if (!data.access_token) {
      throw new Error(
        `Token acquisition failed: ${data.error} - ${data.error_description}`
      );
    }

    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  }

  /**
   * Send email via SMTP (nodemailer).
   * Placeholder — requires nodemailer package.
   */
  private async sendViaSmtp(
    _payload: PlatformEmailPayload,
    _settings: typeof platformEmailSettings.$inferSelect
  ): Promise<PlatformEmailResult> {
    return {
      success: false,
      provider: "smtp",
      error: "SMTP sending not yet implemented for platform email service",
    };
  }

  /**
   * Test the current platform email configuration by sending a test email.
   */
  async testConfiguration(testRecipient: string): Promise<PlatformEmailResult> {
    const db = await getDb();
    const settings = await this.getSettings();

    if (!settings) {
      return { success: false, provider: "none", error: "No settings found" };
    }

    const result = await this.sendEmail({
      to: testRecipient,
      toName: "Platform Email Test",
      subject: "IMS Platform Email Test",
      bodyHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a19;">Platform Email Test</h2>
          <p>This is a test email from the IMS Platform email configuration.</p>
          <p>If you received this email, your platform email settings are working correctly.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">Sent from IMS Platform Email Service</p>
        </div>
      `,
    });

    // Update last test status in DB
    const dbForUpdate = await getDb();
    await dbForUpdate
      .update(platformEmailSettings)
      .set({
        lastTestedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        lastTestStatus: result.success ? "success" : "failed",
        lastTestError: result.error ?? null,
      })
      .where(eq(platformEmailSettings.id, settings.id));

    return result;
  }

  /**
   * Clear the token cache (useful for testing or after credential changes).
   */
  clearTokenCache() {
    this.tokenCache = null;
  }
}

export const platformEmailService = new PlatformEmailService();
