/**
 * Unified Email Service
 * 
 * Routes email sending to the appropriate provider (M365 or SMTP)
 * based on the organization's email provider configuration.
 * 
 * Also provides a helper to enqueue notifications into the outbox.
 */

import { getDb } from "../db";
import { emailProviderSettings, notificationOutbox, notificationEventSettings, emailTemplates } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendEmailViaGraph, testM365Connection, type M365Config, type EmailMessage } from "./m365EmailService";
import { sendEmailViaSmtp, testSmtpConnection, type SmtpConfig } from "./smtpEmailService";

// ============================================================================
// Types
// ============================================================================

export interface SendEmailOptions {
  organizationId: number;
  to: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  importance?: "low" | "normal" | "high";
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  provider?: "m365" | "smtp";
  error?: string;
}

export interface EnqueueNotificationOptions {
  organizationId: number;
  eventKey: string;
  channel?: "email" | "inapp";
  recipients: string[];
  subject: string;
  payloadJson?: Record<string, any>;
}

// ============================================================================
// Template Variable System
// ============================================================================

const MERGE_TAG_REGEX = /\{\{(\w+)\}\}/g;

/** Available merge tags and their descriptions */
export const AVAILABLE_MERGE_TAGS = [
  { tag: "{{recipientName}}", description: "Recipient's full name" },
  { tag: "{{recipientEmail}}", description: "Recipient's email address" },
  { tag: "{{organizationName}}", description: "Organization name" },
  { tag: "{{organizationNameAr}}", description: "Organization name (Arabic)" },
  { tag: "{{eventName}}", description: "Notification event name" },
  { tag: "{{eventDescription}}", description: "Notification event description" },
  { tag: "{{actionUrl}}", description: "URL to the relevant action/page" },
  { tag: "{{currentDate}}", description: "Current date (formatted)" },
  { tag: "{{currentYear}}", description: "Current year" },
  { tag: "{{senderName}}", description: "Sender/system display name" },
  { tag: "{{projectName}}", description: "Related project name" },
  { tag: "{{grantName}}", description: "Related grant name" },
  { tag: "{{amount}}", description: "Related monetary amount" },
  { tag: "{{deadline}}", description: "Related deadline date" },
  { tag: "{{customMessage}}", description: "Custom message content" },
] as const;

/**
 * Replace merge tags in a template string with actual values.
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(MERGE_TAG_REGEX, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

// ============================================================================
// Core Send Email Function
// ============================================================================

/**
 * Send an email using the organization's configured provider.
 * Automatically routes to M365 or SMTP based on settings.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendResult> {
  const db = await getDb();

  // Get the organization's email provider settings
  const [provider] = await db
    .select()
    .from(emailProviderSettings)
    .where(eq(emailProviderSettings.organizationId, options.organizationId))
    .limit(1);

  if (!provider || provider.providerType === "disabled") {
    return {
      success: false,
      error: "Email provider is disabled or not configured for this organization",
    };
  }

  // Build the email message
  const message: EmailMessage = {
    to: options.to,
    subject: options.subject,
    bodyHtml: options.bodyHtml,
    bodyText: options.bodyText,
    importance: options.importance,
  };

  // Add default CC/BCC from provider settings
  const ccList = [...(options.cc || [])];
  const bccList = [...(options.bcc || [])];

  if (provider.defaultCc) {
    const defaultCcs = provider.defaultCc.split(",").map((e) => e.trim()).filter(Boolean);
    ccList.push(...defaultCcs);
  }
  if (provider.defaultBcc) {
    const defaultBccs = provider.defaultBcc.split(",").map((e) => e.trim()).filter(Boolean);
    bccList.push(...defaultBccs);
  }

  if (ccList.length) message.cc = ccList;
  if (bccList.length) message.bcc = bccList;

  // Set reply-to
  message.replyTo = options.replyTo || provider.replyToEmail || undefined;

  // Validate allowed domains
  if (provider.allowedDomains) {
    const allowedDomains = provider.allowedDomains.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
    if (allowedDomains.length > 0) {
      const allRecipients = [...options.to, ...ccList, ...bccList];
      for (const email of allRecipients) {
        const domain = email.split("@")[1]?.toLowerCase();
        if (domain && !allowedDomains.includes(domain)) {
          return {
            success: false,
            error: `Recipient domain "${domain}" is not in the allowed domains list`,
          };
        }
      }
    }
  }

  // Route to the appropriate provider
  if (provider.providerType === "m365") {
    if (!provider.tenantId || !provider.clientId || !provider.secretRef || !provider.fromEmail) {
      return { success: false, error: "Microsoft 365 configuration is incomplete" };
    }

    const m365Config: M365Config = {
      tenantId: provider.tenantId,
      clientId: provider.clientId,
      authType: provider.authType as "secret" | "certificate" || "secret",
      secretRef: provider.secretRef,
      certificateRef: provider.certificateRef,
      senderMode: provider.senderMode as "shared_mailbox" | "user_mailbox" || "shared_mailbox",
      fromEmail: provider.fromEmail,
      fromName: provider.fromName,
    };

    const result = await sendEmailViaGraph(m365Config, message);

    // Update last successful send timestamp
    if (result.success) {
      await db.update(emailProviderSettings).set({
        lastSuccessfulSend: new Date(),
        lastError: null,
      }).where(eq(emailProviderSettings.id, provider.id));
    } else {
      await db.update(emailProviderSettings).set({
        lastError: result.error || "Unknown error",
      }).where(eq(emailProviderSettings.id, provider.id));
    }

    return { ...result, provider: "m365" };
  }

  if (provider.providerType === "smtp") {
    if (!provider.smtpHost || !provider.smtpPort || !provider.fromEmail) {
      return { success: false, error: "SMTP configuration is incomplete" };
    }

    const smtpConfig: SmtpConfig = {
      smtpHost: provider.smtpHost,
      smtpPort: provider.smtpPort,
      smtpUsername: provider.smtpUsername,
      smtpPassword: provider.smtpPassword,
      smtpEncryption: provider.smtpEncryption as "tls" | "ssl" | "none" || "tls",
      fromEmail: provider.fromEmail,
      fromName: provider.fromName,
    };

    const result = await sendEmailViaSmtp(smtpConfig, message);

    if (result.success) {
      await db.update(emailProviderSettings).set({
        lastSuccessfulSend: new Date(),
        lastError: null,
      }).where(eq(emailProviderSettings.id, provider.id));
    } else {
      await db.update(emailProviderSettings).set({
        lastError: result.error || "Unknown error",
      }).where(eq(emailProviderSettings.id, provider.id));
    }

    return { ...result, provider: "smtp" };
  }

  return { success: false, error: "Unknown provider type" };
}

// ============================================================================
// Test Connection (Unified)
// ============================================================================

/**
 * Test the email provider connection for an organization.
 * For M365: acquires an OAuth token from Azure AD.
 * For SMTP: verifies the SMTP transporter.
 */
export async function testEmailConnection(organizationId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();

  const [provider] = await db
    .select()
    .from(emailProviderSettings)
    .where(eq(emailProviderSettings.organizationId, organizationId))
    .limit(1);

  if (!provider) {
    return { success: false, message: "No email provider configured" };
  }

  const now = new Date();

  if (provider.providerType === "m365") {
    if (!provider.tenantId || !provider.clientId) {
      return { success: false, message: "Missing Tenant ID or Client ID" };
    }
    if (!provider.secretRef) {
      return { success: false, message: "Missing client secret" };
    }
    if (!provider.fromEmail) {
      return { success: false, message: "Missing From Email address" };
    }

    const result = await testM365Connection({
      tenantId: provider.tenantId,
      clientId: provider.clientId,
      authType: provider.authType as "secret" | "certificate" || "secret",
      secretRef: provider.secretRef,
    });

    await db.update(emailProviderSettings).set({
      isConnected: result.success,
      lastTestedAt: now,
      lastError: result.success ? null : result.message,
    }).where(eq(emailProviderSettings.id, provider.id));

    return result;
  }

  if (provider.providerType === "smtp") {
    if (!provider.smtpHost || !provider.smtpPort) {
      return { success: false, message: "Missing SMTP host or port" };
    }

    const result = await testSmtpConnection({
      smtpHost: provider.smtpHost,
      smtpPort: provider.smtpPort,
      smtpUsername: provider.smtpUsername,
      smtpPassword: provider.smtpPassword,
      smtpEncryption: provider.smtpEncryption as "tls" | "ssl" | "none" || "tls",
      fromEmail: provider.fromEmail || "",
      fromName: provider.fromName,
    });

    await db.update(emailProviderSettings).set({
      isConnected: result.success,
      lastTestedAt: now,
      lastError: result.success ? null : result.message,
    }).where(eq(emailProviderSettings.id, provider.id));

    return result;
  }

  return { success: false, message: "Email provider is disabled" };
}

// ============================================================================
// Enqueue Notification into Outbox
// ============================================================================

/**
 * Enqueue a notification into the outbox for processing by the background worker.
 * This is the main entry point for any module that needs to send a notification.
 * 
 * Usage from any module:
 * ```ts
 * import { enqueueNotification } from "../services/emailService";
 * 
 * await enqueueNotification({
 *   organizationId: ctx.scope.organizationId,
 *   eventKey: "grant_approved",
 *   recipients: ["user@example.com"],
 *   subject: "Grant Approved",
 *   payloadJson: { grantName: "USAID Grant", amount: 50000 },
 * });
 * ```
 */
export async function enqueueNotification(options: EnqueueNotificationOptions): Promise<{ id: number }> {
  const db = await getDb();

  // Check if the event is enabled for the requested channel
  const [eventSetting] = await db
    .select()
    .from(notificationEventSettings)
    .where(
      and(
        eq(notificationEventSettings.organizationId, options.organizationId),
        eq(notificationEventSettings.eventKey, options.eventKey),
      )
    )
    .limit(1);

  const channel = options.channel || "email";

  // If event setting exists, check if the channel is enabled
  if (eventSetting) {
    if (channel === "email" && !eventSetting.emailEnabled) {
      return { id: -1 }; // Silently skip — email is disabled for this event
    }
    if (channel === "inapp" && !eventSetting.inAppEnabled) {
      return { id: -1 }; // Silently skip — in-app is disabled for this event
    }
  }

  // Get template if linked to the event
  let subject = options.subject;
  let bodyHtml = "";

  if (eventSetting?.templateId) {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, eventSetting.templateId))
      .limit(1);

    if (template && template.isActive) {
      subject = template.subject || subject;
      bodyHtml = template.bodyHtml || "";
    }
  }

  const result = await db.insert(notificationOutbox).values({
    organizationId: options.organizationId,
    eventKey: options.eventKey,
    channel,
    recipients: JSON.stringify(options.recipients),
    subject,
    payloadJson: JSON.stringify({
      ...options.payloadJson,
      bodyHtml,
    }),
    status: "queued",
    attemptCount: 0,
  });

  return { id: result[0].insertId };
}

/**
 * Enqueue both email and in-app notifications for an event.
 * Convenience wrapper that enqueues to both channels.
 */
export async function enqueueNotificationAllChannels(
  options: Omit<EnqueueNotificationOptions, "channel">
): Promise<{ emailId: number; inappId: number }> {
  const [emailResult, inappResult] = await Promise.all([
    enqueueNotification({ ...options, channel: "email" }),
    enqueueNotification({ ...options, channel: "inapp" }),
  ]);
  return { emailId: emailResult.id, inappId: inappResult.id };
}


// ============================================================================
// Password Reset & Authentication Emails
// ============================================================================

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  organizationId: number,
  email: string,
  userName: string,
  resetToken: string,
  resetLink: string
): Promise<boolean> {
  try {
    const fullResetLink = `${resetLink}?token=${resetToken}`;

    const bodyHtml = `
      <h2>Password Reset Request</h2>
      <p>Hi ${userName},</p>
      <p>We received a request to reset your password. Click the link below to proceed:</p>
      <p><a href="${fullResetLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br/>ClientSphere Team</p>
    `;

    const result = await sendEmail({
      organizationId,
      to: [email],
      subject: 'Password Reset Request - ClientSphere',
      bodyHtml,
    });

    return result.success;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send welcome email to new local user
 */
export async function sendWelcomeEmail(
  organizationId: number,
  email: string,
  userName: string,
  loginLink: string
): Promise<boolean> {
  try {
    const bodyHtml = `
      <h2>Welcome to ClientSphere!</h2>
      <p>Hi ${userName},</p>
      <p>Your local user account has been created successfully.</p>
      <p><a href="${loginLink}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign In to ClientSphere</a></p>
      <p>You can now log in using your email address and password.</p>
      <p>Best regards,<br/>ClientSphere Team</p>
    `;

    const result = await sendEmail({
      organizationId,
      to: [email],
      subject: 'Welcome to ClientSphere!',
      bodyHtml,
    });

    return result.success;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(
  organizationId: number,
  email: string,
  userName: string
): Promise<boolean> {
  try {
    const bodyHtml = `
      <h2>Password Changed Successfully</h2>
      <p>Hi ${userName},</p>
      <p>Your password has been changed successfully.</p>
      <p>If you didn't make this change, please contact support immediately.</p>
      <p>Best regards,<br/>ClientSphere Team</p>
    `;

    const result = await sendEmail({
      organizationId,
      to: [email],
      subject: 'Password Changed Confirmation - ClientSphere',
      bodyHtml,
    });

    return result.success;
  } catch (error) {
    console.error('Error sending password changed email:', error);
    return false;
  }
}
