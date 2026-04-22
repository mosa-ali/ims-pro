/**
 * ============================================================================
 * MICROSOFT GRAPH API CLIENT
 * ============================================================================
 * 
 * Wrapper around Microsoft Graph API for Teams Shifts and user data
 * Uses platform's existing OAuth tokens and Microsoft 365 credentials
 * 
 * Features:
 * - Teams Shifts retrieval
 * - User data sync from Azure AD
 * - Error handling with exponential backoff
 * - Rate limiting (429 response handling)
 * - Token refresh management
 * - Audit logging
 * 
 * ============================================================================
 */

// Logging utility - uses console for production
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
};

/**
 * Teams Shift Data Structure
 */
export interface TeamsShift {
  id: string;
  displayName: string;
  startDateTime: string; // ISO 8601 format
  endDateTime: string; // ISO 8601 format
  userId: string; // Azure AD user ID
  theme?: string;
  notes?: string;
}

/**
 * Azure AD User Data Structure
 */
export interface AzureAdUser {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  officeLocation?: string;
}

/**
 * Microsoft Graph API Error Response
 */
export interface GraphApiError {
  error: {
    code: string;
    message: string;
    innerError?: {
      request_id: string;
      date: string;
    };
  };
}

/**
 * Retry Configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Microsoft Graph API Client
 * 
 * Handles authentication, API calls, error handling, and retry logic
 */
export class MicrosoftGraphClient {
  private accessToken: string;
  private tenantId: string;
  private baseUrl: string = 'https://graph.microsoft.com/v1.0';
  private retryConfig: RetryConfig = {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 32000,
    backoffMultiplier: 2,
  };

  constructor(accessToken: string, tenantId: string) {
    if (!accessToken || !tenantId) {
      throw new Error('accessToken and tenantId are required');
    }
    this.accessToken = accessToken;
    this.tenantId = tenantId;
  }

  /**
   * Get Teams Shifts for a specific user in a date range
   * 
   * @param userId - Azure AD user ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Array of TeamsShift objects
   */
  async getShifts(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TeamsShift[]> {
    try {
      logger.info(`Fetching Teams Shifts for user ${userId}`, {
        startDate,
        endDate,
      });

      // Convert dates to ISO 8601 datetime
      const startDateTime = `${startDate}T00:00:00Z`;
      const endDateTime = `${endDate}T23:59:59Z`;

      // Build filter query for calendar events
      const filter = `start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`;

      const url = `${this.baseUrl}/users/${userId}/calendar/events?$filter=${encodeURIComponent(filter)}&$select=id,subject,start,end`;

      const response = await this.makeRequest(url);

      if (!response.value || !Array.isArray(response.value)) {
        logger.warn('No shifts found for user', { userId });
        return [];
      }

      // Transform calendar events to TeamsShift format
      const shifts: TeamsShift[] = response.value.map((event: any) => ({
        id: event.id,
        displayName: event.subject,
        startDateTime: event.start.dateTime,
        endDateTime: event.end.dateTime,
        userId: userId,
      }));

      logger.info(`Retrieved ${shifts.length} shifts for user ${userId}`);
      return shifts;
    } catch (error) {
      logger.error('Failed to fetch Teams Shifts', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all users in the organization from Azure AD
   * 
   * @param pageSize - Number of users per page (max 999)
   * @returns Array of AzureAdUser objects
   */
  async getOrganizationUsers(pageSize: number = 100): Promise<AzureAdUser[]> {
    try {
      logger.info('Fetching organization users from Azure AD');

      const url = `${this.baseUrl}/users?$select=id,userPrincipalName,displayName,mail,givenName,surname,jobTitle,officeLocation&$top=${pageSize}`;

      const users: AzureAdUser[] = [];
      let nextLink: string | null = url;

      // Handle pagination
      while (nextLink) {
        const response = await this.makeRequest(nextLink);

        if (!response.value || !Array.isArray(response.value)) {
          logger.warn('No users found in response');
          break;
        }

        users.push(...response.value);
        nextLink = response['@odata.nextLink'] || null;

        if (nextLink) {
          logger.info(`Fetching next page of users (total so far: ${users.length})`);
        }
      }

      logger.info(`Retrieved ${users.length} users from Azure AD`);
      return users;
    } catch (error) {
      logger.error('Failed to fetch organization users', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a specific user by email address
   * 
   * @param email - User email address
   * @returns AzureAdUser object or null if not found
   */
  async getUserByEmail(email: string): Promise<AzureAdUser | null> {
    try {
      logger.info(`Fetching user by email: ${email}`);

      const filter = `mail eq '${email}'`;
      const url = `${this.baseUrl}/users?$filter=${encodeURIComponent(filter)}&$select=id,userPrincipalName,displayName,mail,givenName,surname,jobTitle,officeLocation`;

      const response = await this.makeRequest(url);

      if (!response.value || response.value.length === 0) {
        logger.warn(`User not found with email: ${email}`);
        return null;
      }

      const user = response.value[0];
      logger.info(`Found user: ${user.displayName}`);
      return user;
    } catch (error) {
      logger.error('Failed to fetch user by email', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a specific user by ID
   * 
   * @param userId - Azure AD user ID
   * @returns AzureAdUser object or null if not found
   */
  async getUserById(userId: string): Promise<AzureAdUser | null> {
    try {
      logger.info(`Fetching user by ID: ${userId}`);

      const url = `${this.baseUrl}/users/${userId}?$select=id,userPrincipalName,displayName,mail,givenName,surname,jobTitle,officeLocation`;

      const response = await this.makeRequest(url);

      if (!response.id) {
        logger.warn(`User not found with ID: ${userId}`);
        return null;
      }

      logger.info(`Found user: ${response.displayName}`);
      return response;
    } catch (error) {
      logger.error('Failed to fetch user by ID', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Send an email using Microsoft Graph API
   * 
   * @param recipientEmail - Recipient email address
   * @param subject - Email subject
   * @param htmlBody - Email body (HTML format)
   * @param ccRecipients - Optional CC recipients
   * @returns Success status
   */
  async sendEmail(
    recipientEmail: string,
    subject: string,
    htmlBody: string,
    ccRecipients?: string[]
  ): Promise<boolean> {
    try {
      logger.info(`Sending email to ${recipientEmail}`, { subject });

      const message = {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: htmlBody,
          },
          toRecipients: [
            {
              emailAddress: {
                address: recipientEmail,
              },
            },
          ],
          ccRecipients: ccRecipients
            ? ccRecipients.map((email) => ({
                emailAddress: { address: email },
              }))
            : [],
        },
        saveToSentItems: true,
      };

      const url = `${this.baseUrl}/me/sendMail`;

      await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(message),
      });

      logger.info(`Email sent successfully to ${recipientEmail}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        recipientEmail,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Make HTTP request to Microsoft Graph API with retry logic
   * 
   * @param url - API endpoint URL
   * @param options - Fetch options (method, body, headers)
   * @returns Parsed JSON response
   */
  private async makeRequest(
    url: string,
    options?: RequestInit
  ): Promise<any> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          delay = retryAfter ? parseInt(retryAfter) * 1000 : delay;

          logger.warn(`Rate limited. Retrying after ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries,
          });

          if (attempt < this.retryConfig.maxRetries) {
            await this.sleep(delay);
            delay = Math.min(
              delay * this.retryConfig.backoffMultiplier,
              this.retryConfig.maxDelayMs
            );
            continue;
          }
        }

        // Handle other errors
        if (!response.ok) {
          const errorData: GraphApiError = await response.json();
          const error = new Error(
            `Graph API error: ${errorData.error.message} (${errorData.error.code})`
          );
          lastError = error;

          // Retry on 5xx errors
          if (response.status >= 500 && attempt < this.retryConfig.maxRetries) {
            logger.warn(`Server error (${response.status}). Retrying...`, {
              attempt: attempt + 1,
              maxRetries: this.retryConfig.maxRetries,
            });

            await this.sleep(delay);
            delay = Math.min(
              delay * this.retryConfig.backoffMultiplier,
              this.retryConfig.maxDelayMs
            );
            continue;
          }

          throw error;
        }

        // Success
        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx except 429)
        if (error instanceof Error && error.message.includes('Graph API error')) {
          throw error;
        }

        // Retry on network errors
        if (attempt < this.retryConfig.maxRetries) {
          logger.warn(`Request failed. Retrying...`, {
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries,
            error: lastError.message,
          });

          await this.sleep(delay);
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelayMs
          );
          continue;
        }
      }
    }

    // All retries exhausted
    logger.error('All retry attempts exhausted', {
      url,
      maxRetries: this.retryConfig.maxRetries,
      error: lastError?.message,
    });

    throw lastError || new Error('Unknown error after retries');
  }

  /**
   * Sleep for specified milliseconds
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate access token (check expiration)
   * 
   * @returns true if token is valid, false if expired
   */
  isTokenValid(): boolean {
    if (!this.accessToken) {
      return false;
    }

    try {
      // Decode JWT token (without verification)
      const parts = this.accessToken.split('.');
      if (parts.length !== 3) {
        return false;
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      // Token is valid if expiration is more than 1 minute in the future
      return expirationTime - currentTime > 60000;
    } catch (error) {
      logger.error('Failed to validate token', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Update access token (for token refresh)
   * 
   * @param newToken - New access token
   */
  updateAccessToken(newToken: string): void {
    if (!newToken) {
      throw new Error('newToken is required');
    }
    this.accessToken = newToken;
    logger.info('Access token updated');
  }
}

/**
 * Factory function to create MicrosoftGraphClient with platform credentials
 * 
 * @returns MicrosoftGraphClient instance or null if credentials not available
 */
export function createGraphClient(): MicrosoftGraphClient | null {
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    logger.error('Microsoft 365 credentials not configured');
    return null;
  }

  // In production, you would fetch a fresh access token using clientId and clientSecret
  // For now, this is a placeholder - the actual token should come from the platform's OAuth flow
  const accessToken = process.env.MICROSOFT_GRAPH_ACCESS_TOKEN;

  if (!accessToken) {
    logger.error('Microsoft Graph access token not available');
    return null;
  }

  return new MicrosoftGraphClient(accessToken, tenantId);
}

export default MicrosoftGraphClient;
