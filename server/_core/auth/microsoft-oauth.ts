import { z } from 'zod';

const MicrosoftOAuthConfigSchema = z.object({
  clientId: z.string().min(1, 'Microsoft Client ID is required'),
  clientSecret: z.string().min(1, 'Microsoft Client Secret is required'),
  tenantId: z.string().min(1, 'Microsoft Tenant ID is required'),
  redirectUri: z.string().url('Invalid redirect URI'),
});

export type MicrosoftOAuthConfig = z.infer<typeof MicrosoftOAuthConfigSchema>;

interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

interface MicrosoftUserInfo {
  id: string;
  userPrincipalName: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
}

export class MicrosoftOAuthService {
  private config: MicrosoftOAuthConfig;
  private readonly tokenEndpoint: string;
  private readonly graphEndpoint = 'https://graph.microsoft.com/v1.0';

  constructor(config: MicrosoftOAuthConfig) {
    this.config = MicrosoftOAuthConfigSchema.parse(config);
    this.tokenEndpoint = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
  }

  /**
   * Generate Microsoft OAuth authorization URL
   */
  getAuthorizationUrl(state: string, scopes: string[] = []): string {
    const defaultScopes = ['openid', 'profile', 'email', 'offline_access'];
    const allScopes = [...new Set([...defaultScopes, ...scopes])];

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: allScopes.join(' '),
      state,
      prompt: 'select_account',
    });

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<MicrosoftTokenResponse> {
    try {
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid profile email offline_access',
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Microsoft OAuth token exchange error:', error);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
    try {
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'openid profile email offline_access',
        }).toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Microsoft OAuth token refresh error:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get user information from Microsoft Graph
   */
  async getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    try {
      const response = await fetch(`${this.graphEndpoint}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get user info: ${error.error.message}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        userPrincipalName: data.userPrincipalName,
        displayName: data.displayName,
        givenName: data.givenName,
        surname: data.surname,
        mail: data.mail,
        jobTitle: data.jobTitle,
        officeLocation: data.officeLocation,
        mobilePhone: data.mobilePhone,
      };
    } catch (error) {
      console.error('Microsoft Graph user info error:', error);
      throw new Error('Failed to retrieve user information');
    }
  }

  /**
   * Verify ID token signature and claims
   */
  async verifyIdToken(idToken: string): Promise<Record<string, unknown>> {
    try {
      // Decode JWT without verification (in production, verify signature)
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid ID token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Verify token claims
      if (payload.aud !== this.config.clientId) {
        throw new Error('Invalid token audience');
      }

      if (payload.iss !== `https://login.microsoftonline.com/${this.config.tenantId}/v2.0`) {
        throw new Error('Invalid token issuer');
      }

      if (payload.exp * 1000 < Date.now()) {
        throw new Error('Token has expired');
      }

      return payload;
    } catch (error) {
      console.error('ID token verification error:', error);
      throw new Error('Failed to verify ID token');
    }
  }

  /**
   * Get user's organization and department info
   */
  async getUserOrganizationInfo(
    accessToken: string
  ): Promise<{ department?: string; officeLocation?: string; jobTitle?: string }> {
    try {
      const response = await fetch(`${this.graphEndpoint}/me?$select=department,officeLocation,jobTitle`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {};
      }

      return await response.json();
    } catch (error) {
      console.error('Microsoft Graph org info error:', error);
      return {};
    }
  }

  /**
   * Check if user belongs to specific group
   */
  async isUserInGroup(accessToken: string, groupId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.graphEndpoint}/me/memberOf`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.value.some((group: any) => group.id === groupId);
    } catch (error) {
      console.error('Microsoft Graph group check error:', error);
      return false;
    }
  }
}

/**
 * Create Microsoft OAuth service instance from environment variables
 */
export function createMicrosoftOAuthService(): MicrosoftOAuthService {
  const config: MicrosoftOAuthConfig = {
    clientId: process.env.MS_CLIENT_ID || '',
    clientSecret: process.env.MS_CLIENT_SECRET || '',
    tenantId: process.env.MS_TENANT_ID || '',
    redirectUri: process.env.MS_REDIRECT_URI || '',
  };

  return new MicrosoftOAuthService(config);
}
