/**
 * Microsoft 365 Email Service
 * 
 * Handles OAuth2 client_credentials token acquisition from Azure AD
 * and sending emails via Microsoft Graph API's sendMail endpoint.
 */

// ============================================================================
// Types
// ============================================================================

export interface M365Config {
  tenantId: string;
  clientId: string;
  authType: "secret" | "certificate";
  secretRef: string;
  certificateRef?: string | null;
  senderMode: "shared_mailbox" | "user_mailbox";
  fromEmail: string;
  fromName?: string | null;
}

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  replyTo?: string;
  importance?: "low" | "normal" | "high";
  headers?: Record<string, string>;
}

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

interface GraphSendMailPayload {
  message: {
    subject: string;
    body: {
      contentType: "HTML" | "Text";
      content: string;
    };
    toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
    ccRecipients?: Array<{ emailAddress: { address: string } }>;
    bccRecipients?: Array<{ emailAddress: { address: string } }>;
    replyTo?: Array<{ emailAddress: { address: string } }>;
    from?: { emailAddress: { address: string; name?: string } };
    importance?: "low" | "normal" | "high";
  };
  saveToSentItems: boolean;
}

// ============================================================================
// Token Cache (in-memory with TTL)
// ============================================================================

const tokenCache = new Map<string, TokenCacheEntry>();

function getCacheKey(tenantId: string, clientId: string): string {
  return `${tenantId}:${clientId}`;
}

function getCachedToken(tenantId: string, clientId: string): string | null {
  const key = getCacheKey(tenantId, clientId);
  const entry = tokenCache.get(key);
  if (!entry) return null;
  // Check if token is still valid (with 5-minute buffer)
  const bufferMs = 5 * 60 * 1000;
  if (Date.now() >= entry.expiresAt - bufferMs) {
    tokenCache.delete(key);
    return null;
  }
  return entry.accessToken;
}

function setCachedToken(tenantId: string, clientId: string, accessToken: string, expiresInSeconds: number): void {
  const key = getCacheKey(tenantId, clientId);
  tokenCache.set(key, {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}

/** Clear cached token for a specific tenant/client (useful when credentials change) */
export function clearTokenCache(tenantId: string, clientId: string): void {
  const key = getCacheKey(tenantId, clientId);
  tokenCache.delete(key);
}

/** Clear all cached tokens */
export function clearAllTokenCache(): void {
  tokenCache.clear();
}

// ============================================================================
// OAuth2 Token Acquisition
// ============================================================================

/**
 * Acquire an OAuth2 access token from Azure AD using client_credentials grant.
 * 
 * POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 * 
 * Required Azure AD App Registration permissions:
 * - Mail.Send (Application permission, not delegated)
 * - For shared mailbox: Mail.Send as the shared mailbox
 */
export async function acquireM365Token(config: Pick<M365Config, "tenantId" | "clientId" | "authType" | "secretRef">): Promise<string> {
  // Check cache first
  const cached = getCachedToken(config.tenantId, config.clientId);
  if (cached) return cached;

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: config.clientId,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  if (config.authType === "secret") {
    body.set("client_secret", config.secretRef);
  } else if (config.authType === "certificate") {
    // Certificate-based auth requires client_assertion and client_assertion_type
    // This would need a JWT signed with the certificate's private key
    throw new Error("Certificate-based authentication is not yet implemented. Please use client secret authentication.");
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `Azure AD token acquisition failed (HTTP ${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error_description || parsed.error || errorMessage;
    } catch {
      // Use raw error text
      if (errorBody) errorMessage += `: ${errorBody.substring(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 3600; // Default 1 hour

  if (!accessToken) {
    throw new Error("Azure AD returned empty access token");
  }

  // Cache the token
  setCachedToken(config.tenantId, config.clientId, accessToken, expiresIn);

  return accessToken;
}

// ============================================================================
// Graph API sendMail
// ============================================================================

/**
 * Send an email via Microsoft Graph API.
 * 
 * For shared mailbox:
 *   POST https://graph.microsoft.com/v1.0/users/{fromEmail}/sendMail
 * 
 * For user mailbox (delegated):
 *   POST https://graph.microsoft.com/v1.0/me/sendMail
 *   (requires delegated permissions, not used in client_credentials flow)
 */
export async function sendEmailViaGraph(
  config: M365Config,
  message: EmailMessage,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Acquire token
    const accessToken = await acquireM365Token(config);

    // Build Graph API payload
    const payload: GraphSendMailPayload = {
      message: {
        subject: message.subject,
        body: {
          contentType: "HTML",
          content: message.bodyHtml,
        },
        toRecipients: message.to.map((addr) => ({
          emailAddress: { address: addr },
        })),
        from: {
          emailAddress: {
            address: config.fromEmail,
            name: config.fromName || undefined,
          },
        },
        importance: message.importance || "normal",
      },
      saveToSentItems: true,
    };

    if (message.cc?.length) {
      payload.message.ccRecipients = message.cc.map((addr) => ({
        emailAddress: { address: addr },
      }));
    }

    if (message.bcc?.length) {
      payload.message.bccRecipients = message.bcc.map((addr) => ({
        emailAddress: { address: addr },
      }));
    }

    if (message.replyTo) {
      payload.message.replyTo = [
        { emailAddress: { address: message.replyTo } },
      ];
    }

    // Determine the Graph API endpoint
    // For client_credentials with application permissions, use /users/{id|userPrincipalName}/sendMail
    const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.fromEmail)}/sendMail`;

    const response = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 202 || response.status === 200) {
      // 202 Accepted is the expected success response for sendMail
      return { success: true };
    }

    // Handle errors
    const errorBody = await response.text();
    let errorMessage = `Graph API sendMail failed (HTTP ${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error?.message || parsed.error?.code || errorMessage;
    } catch {
      if (errorBody) errorMessage += `: ${errorBody.substring(0, 300)}`;
    }

    // If 401, clear token cache and suggest re-auth
    if (response.status === 401) {
      clearTokenCache(config.tenantId, config.clientId);
      errorMessage += " (Token expired or invalid — will re-acquire on next attempt)";
    }

    return { success: false, error: errorMessage };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error sending email via Graph API" };
  }
}

/**
 * Test the M365 connection by acquiring a token.
 * Does NOT send an email — just validates credentials.
 */
export async function testM365Connection(config: Pick<M365Config, "tenantId" | "clientId" | "authType" | "secretRef">): Promise<{ success: boolean; message: string }> {
  try {
    // Clear any cached token to force a fresh acquisition
    clearTokenCache(config.tenantId, config.clientId);
    await acquireM365Token(config);
    return {
      success: true,
      message: "Successfully acquired OAuth2 token from Azure AD. Microsoft 365 connection is active.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to acquire OAuth2 token",
    };
  }
}
