/**
 * SMTP Email Service
 * 
 * Sends emails via SMTP using nodemailer.
 * Used as a fallback when Microsoft 365 is not available.
 */

import nodemailer from "nodemailer";
import type { EmailMessage } from "./m365EmailService";

// ============================================================================
// Types
// ============================================================================

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  smtpEncryption: "tls" | "ssl" | "none";
  fromEmail: string;
  fromName?: string | null;
}

// ============================================================================
// Transporter Cache
// ============================================================================

const transporterCache = new Map<string, nodemailer.Transporter>();

function getTransporterKey(config: SmtpConfig): string {
  return `${config.smtpHost}:${config.smtpPort}:${config.smtpUsername || ""}`;
}

function getOrCreateTransporter(config: SmtpConfig): nodemailer.Transporter {
  const key = getTransporterKey(config);
  const cached = transporterCache.get(key);
  if (cached) return cached;

  const transportOptions: nodemailer.TransportOptions & Record<string, any> = {
    host: config.smtpHost,
    port: config.smtpPort,
  };

  if (config.smtpEncryption === "ssl") {
    transportOptions.secure = true; // Use SSL (port 465)
  } else if (config.smtpEncryption === "tls") {
    transportOptions.secure = false; // STARTTLS (port 587)
    transportOptions.tls = { rejectUnauthorized: false };
  } else {
    transportOptions.secure = false;
    transportOptions.tls = { rejectUnauthorized: false };
  }

  if (config.smtpUsername && config.smtpPassword) {
    transportOptions.auth = {
      user: config.smtpUsername,
      pass: config.smtpPassword,
    };
  }

  const transporter = nodemailer.createTransport(transportOptions);
  transporterCache.set(key, transporter);
  return transporter;
}

/** Clear cached transporter (useful when credentials change) */
export function clearTransporterCache(config?: SmtpConfig): void {
  if (config) {
    const key = getTransporterKey(config);
    transporterCache.delete(key);
  } else {
    transporterCache.clear();
  }
}

// ============================================================================
// Send Email via SMTP
// ============================================================================

export async function sendEmailViaSmtp(
  config: SmtpConfig,
  message: EmailMessage,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getOrCreateTransporter(config);

    const from = config.fromName
      ? `"${config.fromName}" <${config.fromEmail}>`
      : config.fromEmail;

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: message.to.join(", "),
      subject: message.subject,
      html: message.bodyHtml,
    };

    if (message.bodyText) {
      mailOptions.text = message.bodyText;
    }

    if (message.cc?.length) {
      mailOptions.cc = message.cc.join(", ");
    }

    if (message.bcc?.length) {
      mailOptions.bcc = message.bcc.join(", ");
    }

    if (message.replyTo) {
      mailOptions.replyTo = message.replyTo;
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    // Clear transporter cache on connection errors
    if (err.code === "ECONNREFUSED" || err.code === "EAUTH" || err.code === "ESOCKET") {
      clearTransporterCache(config);
    }
    return {
      success: false,
      error: err.message || "Unknown SMTP error",
    };
  }
}

/**
 * Test the SMTP connection by verifying the transporter.
 */
export async function testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
  try {
    clearTransporterCache(config);
    const transporter = getOrCreateTransporter(config);
    await transporter.verify();
    return {
      success: true,
      message: "SMTP connection verified successfully. Server is ready to accept messages.",
    };
  } catch (err: any) {
    clearTransporterCache(config);
    return {
      success: false,
      message: err.message || "SMTP connection verification failed",
    };
  }
}
