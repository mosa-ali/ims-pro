import { getDb, createAuditLog } from "../db";
import { emailOutbox, emailDeadLetterQueue, emailProviderSettings } from "../../drizzle/schema";
import { eq, and, lt, isNull, or } from "drizzle-orm";
import { sendEmailViaGraph } from "./m365EmailService";
import { platformEmailService } from "./platformEmailService";

/**
 * Email Queue Worker
 * 
 * Processes emails from the outbox table with retry logic and dead-letter queue.
 * Sends emails via Microsoft Graph API with exponential backoff retry strategy.
 */

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

class EmailQueueWorker {
  private isRunning = false;
  private processInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly PROCESS_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_RETRY_DELAY_MS = 5000; // 5 seconds

  /**
   * Start the email queue worker
   */
  public start() {
    if (this.isRunning) {
      console.warn("[EmailQueueWorker] Worker is already running");
      return;
    }

    this.isRunning = true;
    console.log("[EmailQueueWorker] Starting email queue worker");

    // Process immediately on start
    this.processQueue();

    // Schedule periodic processing
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, this.PROCESS_INTERVAL_MS);
  }

  /**
   * Stop the email queue worker
   */
  public stop() {
    if (!this.isRunning) {
      console.warn("[EmailQueueWorker] Worker is not running");
      return;
    }

    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    console.log("[EmailQueueWorker] Stopped email queue worker");
  }

  /**
   * Process pending emails from the outbox
   */
  private async processQueue() {
    try {
      const db = await getDb();

      // Get pending emails that are ready to be sent
      const now = new Date().toISOString();
      const pendingEmails = await db
        .select()
        .from(emailOutbox)
        .where(
          and(
            eq(emailOutbox.status, "pending"),
            or(
              isNull(emailOutbox.nextRetryAt),
              lt(emailOutbox.nextRetryAt, now)
            )
          )
        )
        .limit(this.BATCH_SIZE);

      if (pendingEmails.length === 0) {
        return;
      }

      console.log(`[EmailQueueWorker] Processing ${pendingEmails.length} pending emails`);

      for (const email of pendingEmails) {
        await this.processEmail(email);
      }
    } catch (error: any) {
      console.error("[EmailQueueWorker] Error processing queue:", error.message);
    }
  }

  /**
   * Process a single email
   */
  private async processEmail(email: any) {
    const db = await getDb();

    try {
      // Update status to "sending"
      await db
        .update(emailOutbox)
        .set({ status: "sending" })
        .where(eq(emailOutbox.id, email.id));

      console.log(`[EmailQueueWorker] Sending email ${email.id} to ${email.recipientEmail}`);

      // Send the email via Microsoft Graph API
      const result = await this.sendEmailViaMicrosoftGraph(email);

      if (result.success) {
        // Mark as sent
        await db
          .update(emailOutbox)
          .set({
            status: "sent",
            sentAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          })
          .where(eq(emailOutbox.id, email.id));

        console.log(`[EmailQueueWorker] Email ${email.id} sent successfully (messageId: ${result.messageId})`);
      } else {
        // Handle failure
        await this.handleEmailFailure(email, result.error || "Unknown error", result.errorCode);
      }
    } catch (error: any) {
      console.error(`[EmailQueueWorker] Error processing email ${email.id}:`, error.message);
      await this.handleEmailFailure(email, error.message, "UNKNOWN_ERROR");
    }
  }

  /**
   * Handle email sending failure with retry logic
   */
  private async handleEmailFailure(email: any, errorMessage: string, errorCode?: string) {
    const db = await getDb();
    const newRetryCount = email.retryCount + 1;

    if (newRetryCount >= email.maxRetries) {
      // Move to dead-letter queue
      console.warn(`[EmailQueueWorker] Email ${email.id} exceeded max retries, moving to dead-letter queue`);

      await db
        .update(emailOutbox)
        .set({
          status: "dead_letter",
          completedAt: new Date().toISOString(),
          lastError: errorMessage,
          errorCode,
        })
        .where(eq(emailOutbox.id, email.id));

      // Insert into dead-letter queue
      await db.insert(emailDeadLetterQueue).values({
        organizationId: email.organizationId,
        outboxId: email.id,
        templateKey: email.templateKey,
        recipientEmail: email.recipientEmail,
        recipientName: email.recipientName,
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        bodyText: email.bodyText,
        failureReason: errorMessage.substring(0, 1000),
        failureCode: errorCode,
        retryCount: newRetryCount,
        movedAt: new Date().toISOString(),
        metadata: email.metadata,
      });

      // Create audit log
      try {
        await createAuditLog({
          userId: null,
          organizationId: email.organizationId,
          action: "email_failed_dead_letter",
          entityType: "email_outbox",
          entityId: email.id,
        });
      } catch (error: any) {
        console.error("[EmailQueueWorker] Failed to create audit log:", error.message);
      }
    } else {
      // Schedule retry with exponential backoff
      const delayMs = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, newRetryCount - 1);
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

      console.log(
        `[EmailQueueWorker] Email ${email.id} failed, scheduling retry ${newRetryCount}/${email.maxRetries} in ${delayMs}ms`
      );

      await db
        .update(emailOutbox)
        .set({
          status: "pending",
          retryCount: newRetryCount,
          lastError: errorMessage,
          errorCode,
          nextRetryAt,
        })
        .where(eq(emailOutbox.id, email.id));
    }
  }

  /**
   * Send email via Microsoft Graph API using the organization's configured email provider.
   * Looks up the active M365 provider settings for the email's organization and
   * delegates to sendEmailViaGraph from m365EmailService.
   */
  private async sendEmailViaMicrosoftGraph(email: any): Promise<EmailSendResult> {
    try {
      const db = await getDb();

      // Look up the active email provider settings for this organization
      const providers = await db
        .select()
        .from(emailProviderSettings)
        .where(
          and(
            eq(emailProviderSettings.organizationId, email.organizationId),
            eq(emailProviderSettings.isActive, 1)
          )
        )
        .limit(1);

      const provider = providers[0];

      // Validate provider has required credentials (skip empty/placeholder records)
      const isValidProvider = provider &&
        provider.tenantId && provider.tenantId.trim() !== '' &&
        provider.clientId && provider.clientId.trim() !== '' &&
        provider.fromEmail && provider.fromEmail.trim() !== '';

      if (!provider || !isValidProvider) {
        console.warn(`[EmailQueueWorker] No valid org provider for org ${email.organizationId}`);

        // 🔐 STRICT platform fallback (only if explicitly enabled)
        try {
          const platformResult = await platformEmailService.sendEmail({
            to: email.recipientEmail,
            toName: email.recipientName,
            subject: email.subject,
            bodyHtml: typeof email.bodyHtml === 'string'
              ? email.bodyHtml
              : Buffer.from(email.bodyHtml || '').toString('utf-8'),
            bodyText: typeof email.bodyText === 'string'
              ? email.bodyText
              : undefined,
          });

          if (platformResult.success) {
            return { success: true, messageId: `platform-${Date.now()}` };
          }

          // ❗ IMPORTANT: classify as CONFIG ERROR (NO RETRY LOOP)
          return {
            success: false,
            error: platformResult.error || 'Platform email failed',
            errorCode: "NO_PROVIDER_CONFIG",
          };

        } catch (err: any) {
          return {
            success: false,
            error: err.message,
            errorCode: "NO_PROVIDER_CONFIG",
          };
        }
      }

      // Build M365 config from provider settings
      const m365Config = {
        tenantId: provider.tenantId!,
        clientId: provider.clientId!,
        authType: (provider.authType as "secret" | "certificate") || "secret",
        secretRef: provider.secretRef!,
        certificateRef: provider.certificateRef,
        senderMode: (provider.senderMode as "shared_mailbox" | "user_mailbox") || "shared_mailbox",
        fromEmail: provider.fromEmail!,
        fromName: provider.fromName,
      };

      // Send via Microsoft Graph API
      const result = await sendEmailViaGraph(m365Config, {
        to: [email.recipientEmail],
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        bodyText: email.bodyText,
      });

      return result;
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      const errorCode = "SEND_ERROR";

      console.error(`[EmailQueueWorker] Failed to send email via Microsoft Graph:`, {
        error: errorMessage,
        emailId: email.id,
      });

      return {
        success: false,
        error: errorMessage,
        errorCode,
      };
    }
  }
}

// Export singleton instance
export const emailQueueWorker = new EmailQueueWorker();

/**
 * Add email to outbox for processing
 */
export async function enqueueEmail(data: {
  organizationId: number;
  templateKey: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const db = await getDb();

    const result = await db.insert(emailOutbox).values({
      organizationId: data.organizationId,
      templateKey: data.templateKey,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText,
      status: "pending",
      retryCount: 0,
      maxRetries: 5,
      metadata: data.metadata,
    });

    console.log(`[EmailQueueWorker] Email enqueued for ${data.recipientEmail}`);

    return result;
  } catch (error: any) {
    console.error("[EmailQueueWorker] Failed to enqueue email:", error.message);
    throw error;
  }
}


