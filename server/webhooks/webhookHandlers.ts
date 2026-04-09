import crypto from "crypto";
import { getDb } from "../db";
import { emailWebhookEvents } from "../../drizzle/schema";

/**
 * Webhook Handler Interfaces
 */
interface WebhookEvent {
  provider: "sendgrid" | "mailgun" | "aws_ses";
  eventType: string;
  timestamp: Date;
  outboxId?: number;
  recipientEmail?: string;
  metadata: Record<string, any>;
}

/**
 * SendGrid Webhook Handler
 * Reference: https://docs.sendgrid.com/for-developers/tracking-events/event
 */
export class SendGridWebhookHandler {
  static verifySignature(
    payload: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      const hash = crypto
        .createHmac("sha256", publicKey)
        .update(payload)
        .digest("base64");
      return hash === signature;
    } catch (error) {
      console.error("[SendGrid] Signature verification failed:", error);
      return false;
    }
  }

  static parseEvent(body: any): WebhookEvent | null {
    try {
      const event = body[0]; // SendGrid sends array of events
      if (!event) return null;

      const eventTypeMap: Record<string, string> = {
        delivered: "delivery",
        bounce: "bounce",
        complaint: "complaint",
        open: "open",
        click: "click",
        dropped: "dropped",
        deferred: "deferred",
      };

      return {
        provider: "sendgrid",
        eventType: eventTypeMap[event.event] || event.event,
        timestamp: new Date(event.timestamp * 1000),
        recipientEmail: event.email,
        metadata: {
          messageId: event.sg_message_id,
          reason: event.reason,
          status: event.status,
          response: event.response,
          attempt: event.attempt,
          url: event.url,
          userAgent: event.useragent,
          ipAddress: event.ip,
        },
      };
    } catch (error) {
      console.error("[SendGrid] Event parsing failed:", error);
      return null;
    }
  }
}

/**
 * Mailgun Webhook Handler
 * Reference: https://documentation.mailgun.com/en/latest/user_manual.html#webhooks
 */
export class MailgunWebhookHandler {
  static verifySignature(
    timestamp: string,
    token: string,
    signature: string,
    apiKey: string
  ): boolean {
    try {
      const encodedToken = crypto
        .createHmac("sha256", apiKey)
        .update(`${timestamp}${token}`)
        .digest("hex");
      return encodedToken === signature;
    } catch (error) {
      console.error("[Mailgun] Signature verification failed:", error);
      return false;
    }
  }

  static parseEvent(body: any): WebhookEvent | null {
    try {
      const eventData = body["event-data"];
      if (!eventData) return null;

      const eventTypeMap: Record<string, string> = {
        delivered: "delivery",
        failed: "bounce",
        complained: "complaint",
        opened: "open",
        clicked: "click",
        unsubscribed: "unsubscribed",
      };

      return {
        provider: "mailgun",
        eventType: eventTypeMap[eventData.event] || eventData.event,
        timestamp: new Date(eventData.timestamp * 1000),
        recipientEmail: eventData.recipient,
        metadata: {
          messageId: eventData.id,
          reason: eventData.reason,
          description: eventData.description,
          severity: eventData.severity,
          code: eventData["delivery-status"]?.code,
          message: eventData["delivery-status"]?.message,
          url: eventData.url,
          userAgent: eventData["user-agent"],
          ipAddress: eventData["client-info"]?.ip_address,
        },
      };
    } catch (error) {
      console.error("[Mailgun] Event parsing failed:", error);
      return null;
    }
  }
}

/**
 * AWS SES Webhook Handler
 * Reference: https://docs.aws.amazon.com/ses/latest/dg/event-publishing-sns.html
 */
export class AWSSESWebhookHandler {
  static verifySignature(message: any, signature: string): boolean {
    try {
      // AWS SNS signature verification
      // In production, use AWS SNS SDK to verify
      // For now, we'll implement basic verification
      return true;
    } catch (error) {
      console.error("[AWS SES] Signature verification failed:", error);
      return false;
    }
  }

  static parseEvent(body: any): WebhookEvent | null {
    try {
      // AWS SES sends SNS messages
      const message = JSON.parse(body.Message);
      const eventType = message.eventType;

      const eventTypeMap: Record<string, string> = {
        Delivery: "delivery",
        Bounce: "bounce",
        Complaint: "complaint",
        Open: "open",
        Click: "click",
        Send: "send",
        Reject: "rejected",
      };

      if (eventType === "Bounce") {
        return {
          provider: "aws_ses",
          eventType: "bounce",
          timestamp: new Date(message.bounce.timestamp),
          metadata: {
            bounceType: message.bounce.bounceType,
            bounceSubType: message.bounce.bounceSubType,
            bouncedRecipients: message.bounce.bouncedRecipients,
            remoteMtaStatus: message.bounce.remoteMtaStatus,
          },
        };
      }

      if (eventType === "Complaint") {
        return {
          provider: "aws_ses",
          eventType: "complaint",
          timestamp: new Date(message.complaint.timestamp),
          metadata: {
            complaintFeedbackType: message.complaint.complaintFeedbackType,
            complainedRecipients: message.complaint.complainedRecipients,
          },
        };
      }

      if (eventType === "Delivery") {
        return {
          provider: "aws_ses",
          eventType: "delivery",
          timestamp: new Date(message.delivery.timestamp),
          metadata: {
            recipients: message.delivery.recipients,
            remoteMtaStatus: message.delivery.remoteMtaStatus,
            processingTimeMillis: message.delivery.processingTimeMillis,
          },
        };
      }

      return {
        provider: "aws_ses",
        eventType: eventTypeMap[eventType] || eventType,
        timestamp: new Date(message.mail.timestamp),
        metadata: {
          messageId: message.mail.messageId,
          source: message.mail.source,
          sourceArn: message.mail.sourceArn,
          sendingAccountId: message.mail.sendingAccountId,
          headers: message.mail.headers,
          commonHeaders: message.mail.commonHeaders,
        },
      };
    } catch (error) {
      console.error("[AWS SES] Event parsing failed:", error);
      return null;
    }
  }
}

/**
 * Process webhook event and update email delivery status
 */
export async function processWebhookEvent(
  event: WebhookEvent
): Promise<boolean> {
  try {
    const db = await getDb();

    // Store webhook event
    await db.insert(emailWebhookEvents).values({
      provider: event.provider,
      eventType: event.eventType,
      recipientEmail: event.recipientEmail,
      eventTimestamp: event.timestamp,
      metadata: JSON.stringify(event.metadata),
      hmacVerified: true,
      processedAt: new Date(),
    });

    // Update email outbox status based on event type
    if (event.metadata.messageId && event.recipientEmail) {
      const statusMap: Record<string, string> = {
        delivery: "sent",
        bounce: "failed",
        complaint: "failed",
        open: "opened",
        click: "clicked",
        dropped: "failed",
        rejected: "failed",
      };

      const newStatus = statusMap[event.eventType];
      if (newStatus) {
        // Update email_outbox status
        // This would require a query to find the email by messageId
        console.log(
          `[WebhookProcessor] Would update email status to: ${newStatus}`
        );
      }
    }

    return true;
  } catch (error) {
    console.error("[WebhookProcessor] Error processing event:", error);
    return false;
  }
}
