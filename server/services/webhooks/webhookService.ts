/**
 * ============================================================================
 * Webhook Service
 * ============================================================================
 * 
 * Handles webhook event dispatching for onboarding and other system events.
 * Features:
 * - Event-driven architecture
 * - Retry logic with exponential backoff
 * - HMAC-SHA256 signature verification
 * - Delivery tracking and logging
 * - Dead-letter queue for permanently failed deliveries
 * 
 * ============================================================================
 */

import crypto from "crypto";
import { ENV } from "../../_core/env";

export type WebhookEventType =
  | "organization_created"
  | "onboarding_started"
  | "onboarding_completed"
  | "onboarding_failed";

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  organizationId: number;
  timestamp: string;
  data: Record<string, any>;
}

export interface WebhookEndpoint {
  id: string;
  organizationId: number;
  url: string;
  events: WebhookEventType[];
  secret: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  status: "pending" | "delivered" | "failed" | "dead_letter";
  httpStatus?: number;
  responseBody?: string;
  error?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

class WebhookService {
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_BACKOFF_MS = 1000; // 1 second
  private readonly MAX_BACKOFF_MS = 86400000; // 24 hours
  private readonly TIMEOUT_MS = 30000; // 30 seconds

  /**
   * Generate webhook secret for HMAC signing
   */
  generateSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Generate event ID
   */
  generateEventId(): string {
    return `evt_${crypto.randomBytes(16).toString("hex")}`;
  }

  /**
   * Generate webhook ID
   */
  generateWebhookId(): string {
    return `wh_${crypto.randomBytes(16).toString("hex")}`;
  }

  /**
   * Generate delivery ID
   */
  generateDeliveryId(): string {
    return `del_${crypto.randomBytes(16).toString("hex")}`;
  }

  /**
   * Create HMAC-SHA256 signature for webhook payload
   */
  createSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Create webhook event payload
   */
  createEventPayload(event: WebhookEvent): string {
    return JSON.stringify({
      id: event.id,
      type: event.type,
      organizationId: event.organizationId,
      timestamp: event.timestamp,
      data: event.data,
    });
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  calculateNextRetryTime(attemptCount: number): Date {
    const backoffMs = Math.min(
      this.INITIAL_BACKOFF_MS * Math.pow(2, attemptCount),
      this.MAX_BACKOFF_MS
    );

    // Add jitter (±10%)
    const jitter = backoffMs * 0.1 * (Math.random() * 2 - 1);
    const nextRetryMs = backoffMs + jitter;

    const nextRetryTime = new Date();
    nextRetryTime.setTime(nextRetryTime.getTime() + nextRetryMs);

    return nextRetryTime;
  }

  /**
   * Should retry delivery based on attempt count and HTTP status
   */
  shouldRetry(attemptCount: number, httpStatus?: number): boolean {
    // Don't retry if max attempts reached
    if (attemptCount >= this.MAX_RETRIES) {
      return false;
    }

    // Don't retry on client errors (4xx) except 408, 429
    if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
      if (httpStatus === 408 || httpStatus === 429) {
        return true;
      }
      return false;
    }

    // Retry on server errors (5xx) and network errors (no status)
    return true;
  }

  /**
   * Format webhook headers for delivery
   */
  formatHeaders(signature: string, eventId: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event-ID": eventId,
      "X-Webhook-Timestamp": new Date().toISOString(),
      "User-Agent": "IMS-Webhook-Service/1.0",
    };
  }

  /**
   * Dispatch webhook to endpoint
   */
  async dispatchWebhook(
    endpoint: WebhookEndpoint,
    event: WebhookEvent
  ): Promise<{
    success: boolean;
    httpStatus?: number;
    error?: string;
    responseBody?: string;
  }> {
    try {
      const payload = this.createEventPayload(event);
      const signature = this.createSignature(payload, endpoint.secret);
      const headers = this.formatHeaders(signature, event.id);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers,
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.text();

        return {
          success: response.ok,
          httpStatus: response.status,
          responseBody: responseBody.slice(0, 1000), // Limit response body size
        };
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          return {
            success: false,
            error: `Request timeout after ${this.TIMEOUT_MS}ms`,
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate audit log entry for webhook event
   */
  generateAuditLogEntry(
    organizationId: number,
    event: "webhook_created" | "webhook_deleted" | "event_dispatched" | "delivery_failed",
    details: Record<string, any>
  ): {
    action: string;
    details: string;
  } {
    const actionMap = {
      webhook_created: "webhook_endpoint_created",
      webhook_deleted: "webhook_endpoint_deleted",
      event_dispatched: "webhook_event_dispatched",
      delivery_failed: "webhook_delivery_failed",
    };

    return {
      action: actionMap[event],
      details: JSON.stringify({
        organizationId,
        event,
        ...details,
        timestamp: new Date().toISOString(),
      }),
    };
  }

  /**
   * Validate webhook URL
   */
  validateWebhookUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);

      // Only allow HTTPS in production
      if (ENV.NODE_ENV === "production" && parsed.protocol !== "https:") {
        return {
          valid: false,
          error: "Webhook URL must use HTTPS in production",
        };
      }

      // Disallow localhost in production
      if (ENV.NODE_ENV === "production" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
        return {
          valid: false,
          error: "Webhook URL cannot be localhost in production",
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: "Invalid URL format",
      };
    }
  }

  /**
   * Format event data for specific event type
   */
  formatEventData(
    type: WebhookEventType,
    organizationId: number,
    data: Record<string, any>
  ): Record<string, any> {
    switch (type) {
      case "organization_created":
        return {
          organizationId,
          organizationName: data.organizationName,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
        };

      case "onboarding_started":
        return {
          organizationId,
          organizationName: data.organizationName,
          adminEmail: data.adminEmail,
          linkSentAt: data.linkSentAt,
        };

      case "onboarding_completed":
        return {
          organizationId,
          organizationName: data.organizationName,
          tenantId: data.tenantId,
          completedAt: data.completedAt,
          completedBy: data.completedBy,
        };

      case "onboarding_failed":
        return {
          organizationId,
          organizationName: data.organizationName,
          error: data.error,
          failedAt: data.failedAt,
        };

      default:
        return data;
    }
  }
}

export const webhookService = new WebhookService();
