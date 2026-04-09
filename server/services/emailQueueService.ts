/**
 * ============================================================================
 * Email Queue Service
 * ============================================================================
 * 
 * Queues emails in the database for reliable delivery with retry logic.
 * Emails are stored in email_outbox table and processed by emailQueueWorker.
 * 
 * ============================================================================
 */

import { getDb } from "../db";
import { emailOutbox } from "../../drizzle/schema";

export interface QueueEmailRequest {
  organizationId: number;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  emailType: "onboarding" | "password_reset" | "request_access" | "notification";
  language: "en" | "ar";
  metadata?: Record<string, any>;
}

class EmailQueueService {
  /**
   * Queue an email for delivery
   * Email will be picked up by emailQueueWorker for processing
   */
  async queueEmail(request: QueueEmailRequest): Promise<{ id: number; success: boolean }> {
    try {
      console.log(`[EMAIL_QUEUE] Queuing email for ${request.recipientEmail} (type: ${request.emailType})`);

      const db = await getDb();
      const result = await db.insert(emailOutbox).values({
        organizationId: request.organizationId,
        templateKey: request.emailType, // Use emailType as templateKey
        recipientEmail: request.recipientEmail,
        recipientName: request.recipientName,
        subject: request.subject,
        bodyHtml: request.htmlContent,
        bodyText: request.textContent,
        status: "pending",
        retryCount: 0,
        maxRetries: 5,
        lastError: null,
        metadata: request.metadata,
      });

      // Get the inserted ID from the result
      const insertedId = result?.[0]?.insertId || 0;
      console.log(`[EMAIL_QUEUE] Email queued successfully with ID: ${insertedId}`);

      return {
        id: insertedId,
        success: true,
      };
    } catch (error) {
      console.error(`[EMAIL_QUEUE] Failed to queue email:`, error);
      return {
        id: 0,
        success: false,
      };
    }
  }
}

export const emailQueueService = new EmailQueueService();
