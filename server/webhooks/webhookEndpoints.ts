import { Router, Request, Response } from "express";
import {
  SendGridWebhookHandler,
  MailgunWebhookHandler,
  AWSSESWebhookHandler,
  processWebhookEvent,
} from "./webhookHandlers";

const webhookRouter = Router();

/**
 * SendGrid Webhook Endpoint
 * POST /webhooks/sendgrid
 */
webhookRouter.post("/sendgrid", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-twilio-email-event-signature"] as string;
    const timestamp = req.headers["x-twilio-email-event-timestamp"] as string;
    const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY || "";

    // Verify signature
    const payload = JSON.stringify(req.body);
    if (!SendGridWebhookHandler.verifySignature(payload, signature, publicKey)) {
      console.warn("[SendGrid Webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse and process events
    const events = Array.isArray(req.body) ? req.body : [req.body];
    for (const eventData of events) {
      const event = SendGridWebhookHandler.parseEvent([eventData]);
      if (event) {
        await processWebhookEvent(event);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[SendGrid Webhook] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Mailgun Webhook Endpoint
 * POST /webhooks/mailgun
 */
webhookRouter.post("/mailgun", async (req: Request, res: Response) => {
  try {
    const timestamp = req.body.signature?.timestamp;
    const token = req.body.signature?.token;
    const signature = req.body.signature?.signature;
    const apiKey = process.env.MAILGUN_API_KEY || "";

    // Verify signature
    if (
      !MailgunWebhookHandler.verifySignature(
        timestamp,
        token,
        signature,
        apiKey
      )
    ) {
      console.warn("[Mailgun Webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse and process event
    const event = MailgunWebhookHandler.parseEvent(req.body);
    if (event) {
      await processWebhookEvent(event);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Mailgun Webhook] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * AWS SES Webhook Endpoint (SNS)
 * POST /webhooks/aws-ses
 */
webhookRouter.post("/aws-ses", async (req: Request, res: Response) => {
  try {
    const message = req.body;

    // Handle SNS subscription confirmation
    if (message.Type === "SubscriptionConfirmation") {
      console.log("[AWS SES] Subscription confirmation received");
      // In production, verify and confirm subscription
      return res.json({ success: true });
    }

    // Verify signature
    if (!AWSSESWebhookHandler.verifySignature(message, "")) {
      console.warn("[AWS SES Webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse and process event
    const event = AWSSESWebhookHandler.parseEvent(message);
    if (event) {
      await processWebhookEvent(event);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[AWS SES Webhook] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Test Webhook Endpoint
 * POST /webhooks/test/:provider
 */
webhookRouter.post("/test/:provider", async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as string;
    const testEvent = req.body;

    console.log(`[Webhook Test] Testing ${provider} webhook`);

    let event;
    switch (provider) {
      case "sendgrid":
        event = SendGridWebhookHandler.parseEvent([testEvent]);
        break;
      case "mailgun":
        event = MailgunWebhookHandler.parseEvent(testEvent);
        break;
      case "aws-ses":
        event = AWSSESWebhookHandler.parseEvent(testEvent);
        break;
      default:
        return res.status(400).json({ error: "Unknown provider" });
    }

    if (event) {
      await processWebhookEvent(event);
      res.json({ success: true, event });
    } else {
      res.status(400).json({ error: "Failed to parse event" });
    }
  } catch (error) {
    console.error("[Webhook Test] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default webhookRouter;
