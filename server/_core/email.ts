/**
 * ============================================================================
 * EMAIL UTILITY - MICROSOFT GRAPH API INTEGRATION
 * ============================================================================
 * 
 * Email sending utility using Microsoft 365 Graph API
 * Sends emails to specific recipients (organization admins, users, etc.)
 * Uses OAuth tokens for authentication with Microsoft 365
 * 
 * ============================================================================
 */

import { ENV } from "./env";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string; // Optional: sender email (defaults to app service account)
}

interface GraphMailMessage {
  message: {
    subject: string;
    body: {
      contentType: "HTML" | "text";
      content: string;
    };
    toRecipients: Array<{
      emailAddress: {
        address: string;
      };
    }>;
  };
}

/**
 * Get Microsoft Graph access token using client credentials flow
 * This uses the app's service account to send emails on behalf of the organization
 */
async function getGraphAccessToken(): Promise<string | null> {
  try {
    if (!ENV.MS_TENANT_ID || !ENV.MS_CLIENT_ID || !ENV.MS_CLIENT_SECRET) {
      console.warn(
        "[Email] Microsoft 365 credentials not configured (MS_TENANT_ID, MS_CLIENT_ID, or MS_CLIENT_SECRET missing)"
      );
      return null;
    }

    const tokenUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: ENV.MS_CLIENT_ID,
        client_secret: ENV.MS_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn("[Email] Failed to get Microsoft Graph token:", error);
      return null;
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  } catch (error) {
    console.warn("[Email] Error getting Microsoft Graph token:", error);
    return null;
  }
}

/**
 * Send email via Microsoft Graph API
 * Returns true if successful, false if failed
 * NEVER throws - failures are logged but don't break the main flow
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    console.log("[Email] Sending email to:", options.to);
    console.log("[Email] Subject:", options.subject);

    // Get access token
    const token = await getGraphAccessToken();
    if (!token) {
      console.warn(
        "[Email] Unable to get Microsoft Graph token. Email not sent to:",
        options.to
      );
      return false;
    }

    // Prepare email message for Graph API
    const mailMessage: GraphMailMessage = {
      message: {
        subject: options.subject,
        body: {
          contentType: "HTML",
          content: options.html || options.text || "",
        },
        toRecipients: [
          {
            emailAddress: {
              address: options.to,
            },
          },
        ],
      },
    };

    // Send email via Graph API
    // Using /me/sendMail endpoint - sends as the service account
    const graphResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mailMessage),
      }
    );

    if (!graphResponse.ok) {
      const error = await graphResponse.text();
      console.warn(
        `[Email] Failed to send email via Graph API (${graphResponse.status}):`,
        error
      );
      return false;
    }

    console.log("[Email] Email sent successfully via Microsoft Graph to:", options.to);
    return true;
  } catch (error) {
    // Log the error but never throw - email failures should not break the main flow
    console.warn("[Email] Failed to send email:", error);
    return false;
  }
}

/**
 * Send bulk emails
 * Returns count of sent and failed emails
 * Never throws - continues processing even if individual emails fail
 */
export async function sendBulkEmails(
  emails: EmailOptions[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      const success = await sendEmail(email);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.warn("[Email] Error in bulk send:", error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Verify email configuration
 * Returns true if all required Microsoft 365 credentials are configured
 */
export function isEmailConfigured(): boolean {
  return !!(ENV.MS_TENANT_ID && ENV.MS_CLIENT_ID && ENV.MS_CLIENT_SECRET);
}
