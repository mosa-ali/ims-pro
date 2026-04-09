import { getDb } from "../db";
import { emailDeliveryStatus, emailOutbox } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { verifyWebhookSignature } from "./encryptionService";

/**
 * Process SendGrid webhook events
 */
export async function processSendGridWebhook(
  payload: any,
  signature: string,
  signingKey: string
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // Verify webhook signature
    const payloadString = JSON.stringify(payload);
    if (!verifyWebhookSignature(payloadString, signature, signingKey)) {
      throw new Error("Invalid webhook signature");
    }

    const dbInstance = await getDb();

    // Process each event
    for (const event of payload) {
      try {
        const { email, event: eventType, timestamp, sg_message_id } = event;

        // Find the outbox entry
        const outbox = await dbInstance
          .select()
          .from(emailOutbox)
          .where(eq(emailOutbox.messageId, sg_message_id))
          .then((rows) => rows[0]);

        if (!outbox) {
          errors.push(`No outbox entry found for message ${sg_message_id}`);
          continue;
        }

        // Map SendGrid event types to our status
        let status: string;
        let bounceType: string | null = null;
        let bounceSubtype: string | null = null;

        switch (eventType) {
          case "processed":
            status = "sending";
            break;
          case "dropped":
            status = "failed";
            break;
          case "delivered":
            status = "delivered";
            break;
          case "open":
            status = "opened";
            break;
          case "click":
            status = "clicked";
            break;
          case "bounce":
            status = "bounced";
            bounceType = event.type || "unknown";
            bounceSubtype = event.reason || null;
            break;
          case "spamreport":
            status = "complained";
            break;
          default:
            status = "sent";
        }

        // Update or create delivery status
        const existingStatus = await dbInstance
          .select()
          .from(emailDeliveryStatus)
          .where(eq(emailDeliveryStatus.outboxId, outbox.id))
          .then((rows) => rows[0]);

        if (existingStatus) {
          await dbInstance
            .update(emailDeliveryStatus)
            .set({
              previousStatus: existingStatus.currentStatus,
              currentStatus: status,
              bounceType: bounceType || existingStatus.bounceType,
              bounceSubtype: bounceSubtype || existingStatus.bounceSubtype,
              lastEventAt: new Date(timestamp * 1000),
              lastEventType: eventType,
              eventCount: existingStatus.eventCount + 1,
              statusChangedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(emailDeliveryStatus.id, existingStatus.id));
        } else {
          await dbInstance.insert(emailDeliveryStatus).values({
            organizationId: outbox.organizationId,
            outboxId: outbox.id,
            provider: "sendgrid",
            currentStatus: status,
            bounceType: bounceType,
            bounceSubtype: bounceSubtype,
            lastEventAt: new Date(timestamp * 1000),
            lastEventType: eventType,
            eventCount: 1,
            statusChangedAt: new Date(),
          });
        }

        processed++;
        console.log(`[SendGrid Webhook] Processed ${eventType} event for ${email}`);
      } catch (error) {
        errors.push(`Error processing event: ${String(error)}`);
      }
    }
  } catch (error) {
    errors.push(`Webhook processing error: ${String(error)}`);
  }

  return { processed, errors };
}

/**
 * Process Mailgun webhook events
 */
export async function processMailgunWebhook(
  payload: any,
  signature: string,
  signingKey: string
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // Verify webhook signature
    const timestamp = payload.signature.timestamp;
    const token = payload.signature.token;
    const sig = payload.signature.signature;

    const expectedSig = require("crypto")
      .createHmac("sha256", signingKey)
      .update(`${timestamp}${token}`)
      .digest("hex");

    if (sig !== expectedSig) {
      throw new Error("Invalid webhook signature");
    }

    const dbInstance = await getDb();
    const event = payload["event-data"];

    try {
      const { recipient, event: eventType, timestamp: eventTimestamp, message } = event;
      const messageId = message?.headers?.["message-id"];

      if (!messageId) {
        errors.push("No message ID found in webhook");
        return { processed, errors };
      }

      // Find the outbox entry
      const outbox = await dbInstance
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.messageId, messageId))
        .then((rows) => rows[0]);

      if (!outbox) {
        errors.push(`No outbox entry found for message ${messageId}`);
        return { processed, errors };
      }

      // Map Mailgun event types to our status
      let status: string;
      let bounceType: string | null = null;
      let bounceSubtype: string | null = null;

      switch (eventType) {
        case "accepted":
          status = "sending";
          break;
        case "rejected":
          status = "failed";
          break;
        case "delivered":
          status = "delivered";
          break;
        case "opened":
          status = "opened";
          break;
        case "clicked":
          status = "clicked";
          break;
        case "bounced":
          status = "bounced";
          bounceType = event.severity || "unknown";
          bounceSubtype = event.reason || null;
          break;
        case "complained":
          status = "complained";
          break;
        case "unsubscribed":
          status = "sent";
          break;
        default:
          status = "sent";
      }

      // Update or create delivery status
      const existingStatus = await dbInstance
        .select()
        .from(emailDeliveryStatus)
        .where(eq(emailDeliveryStatus.outboxId, outbox.id))
        .then((rows) => rows[0]);

      if (existingStatus) {
        await dbInstance
          .update(emailDeliveryStatus)
          .set({
            previousStatus: existingStatus.currentStatus,
            currentStatus: status,
            bounceType: bounceType || existingStatus.bounceType,
            bounceSubtype: bounceSubtype || existingStatus.bounceSubtype,
            lastEventAt: new Date(eventTimestamp * 1000),
            lastEventType: eventType,
            eventCount: existingStatus.eventCount + 1,
            statusChangedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailDeliveryStatus.id, existingStatus.id));
      } else {
        await dbInstance.insert(emailDeliveryStatus).values({
          organizationId: outbox.organizationId,
          outboxId: outbox.id,
          provider: "mailgun",
          currentStatus: status,
          bounceType: bounceType,
          bounceSubtype: bounceSubtype,
          lastEventAt: new Date(eventTimestamp * 1000),
          lastEventType: eventType,
          eventCount: 1,
          statusChangedAt: new Date(),
        });
      }

      processed++;
      console.log(`[Mailgun Webhook] Processed ${eventType} event for ${recipient}`);
    } catch (error) {
      errors.push(`Error processing event: ${String(error)}`);
    }
  } catch (error) {
    errors.push(`Webhook processing error: ${String(error)}`);
  }

  return { processed, errors };
}

/**
 * Process AWS SES webhook events (SNS)
 */
export async function processAWSSESWebhook(
  payload: any
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  try {
    const dbInstance = await getDb();
    const { eventType, mail, bounce, complaint, delivery, send, open, click } = payload;

    try {
      const messageId = mail?.messageId;

      if (!messageId) {
        errors.push("No message ID found in webhook");
        return { processed, errors };
      }

      // Find the outbox entry
      const outbox = await dbInstance
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.messageId, messageId))
        .then((rows) => rows[0]);

      if (!outbox) {
        errors.push(`No outbox entry found for message ${messageId}`);
        return { processed, errors };
      }

      // Map AWS SES event types to our status
      let status: string;
      let bounceType: string | null = null;
      let bounceSubtype: string | null = null;

      switch (eventType) {
        case "Send":
          status = "sending";
          break;
        case "Bounce":
          status = "bounced";
          bounceType = bounce?.bounceType || "unknown";
          bounceSubtype = bounce?.bounceSubType || null;
          break;
        case "Complaint":
          status = "complained";
          break;
        case "Delivery":
          status = "delivered";
          break;
        case "Open":
          status = "opened";
          break;
        case "Click":
          status = "clicked";
          break;
        case "Reject":
          status = "failed";
          break;
        default:
          status = "sent";
      }

      // Update or create delivery status
      const existingStatus = await dbInstance
        .select()
        .from(emailDeliveryStatus)
        .where(eq(emailDeliveryStatus.outboxId, outbox.id))
        .then((rows) => rows[0]);

      const timestamp = new Date(
        send?.timestamp || delivery?.timestamp || bounce?.timestamp || complaint?.timestamp || Date.now()
      );

      if (existingStatus) {
        await dbInstance
          .update(emailDeliveryStatus)
          .set({
            previousStatus: existingStatus.currentStatus,
            currentStatus: status,
            bounceType: bounceType || existingStatus.bounceType,
            bounceSubtype: bounceSubtype || existingStatus.bounceSubtype,
            lastEventAt: timestamp,
            lastEventType: eventType,
            eventCount: existingStatus.eventCount + 1,
            statusChangedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailDeliveryStatus.id, existingStatus.id));
      } else {
        await dbInstance.insert(emailDeliveryStatus).values({
          organizationId: outbox.organizationId,
          outboxId: outbox.id,
          provider: "aws_ses",
          currentStatus: status,
          bounceType: bounceType,
          bounceSubtype: bounceSubtype,
          lastEventAt: timestamp,
          lastEventType: eventType,
          eventCount: 1,
          statusChangedAt: new Date(),
        });
      }

      processed++;
      console.log(`[AWS SES Webhook] Processed ${eventType} event for message ${messageId}`);
    } catch (error) {
      errors.push(`Error processing event: ${String(error)}`);
    }
  } catch (error) {
    errors.push(`Webhook processing error: ${String(error)}`);
  }

  return { processed, errors };
}

/**
 * Get delivery status statistics for an organization
 */
export async function getDeliveryStatusStats(organizationId: number) {
  try {
    const dbInstance = await getDb();

    const stats = await dbInstance
      .select({
        status: emailDeliveryStatus.currentStatus,
        count: emailDeliveryStatus.id,
      })
      .from(emailDeliveryStatus)
      .where(eq(emailDeliveryStatus.organizationId, organizationId));

    const result: Record<string, number> = {
      queued: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      bounced: 0,
      complained: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
    };

    stats.forEach((stat) => {
      if (stat.status && stat.status in result) {
        result[stat.status]++;
      }
    });

    return result;
  } catch (error) {
    console.error("Error getting delivery status stats:", error);
    throw error;
  }
}
