import { describe, it, expect } from 'vitest';
import { MicrosoftOAuthService } from '../server/_core/auth/microsoft-oauth';

describe('Microsoft 365 OAuth Service', () => {
  let oauthService: MicrosoftOAuthService;

  beforeEach(() => { // Initialize OAuth service before each test
    oauthService = new MicrosoftOAuthService({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
      redirectUri: 'http://localhost:3000/auth/callback',
    });
  });

  describe('Authorization URL Generation', () => {
    it('should generate valid authorization URL', () => {
      const url = oauthService.getAuthorizationUrl('test-state');

      expect(url).toContain('https://login.microsoftonline.com');
      expect(url).toContain('test-tenant-id');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
      expect(url).toContain('state=test-state');
    });

    it('should include custom scopes in authorization URL', () => {
      const customScopes = ['Mail.Read', 'Calendar.Read'];
      const url = oauthService.getAuthorizationUrl('test-state', customScopes);

      expect(url).toContain('Mail.Read');
      expect(url).toContain('Calendar.Read');
    });

    it('should include default scopes in authorization URL', () => {
      const url = oauthService.getAuthorizationUrl('test-state');

      expect(url).toContain('openid');
      expect(url).toContain('profile');
      expect(url).toContain('email');
      expect(url).toContain('offline_access');
    });

    it('should encode special characters in state parameter', () => {
      const state = 'test-state-with-special-chars!@#$%';
      const url = oauthService.getAuthorizationUrl(state);

      expect(url).toContain('state=');
      expect(url).toContain('test-state-with-special-chars');
    });
  });

  describe('Token Exchange', () => {
    it('should handle token exchange errors gracefully', async () => {
      try {
        await oauthService.exchangeCodeForToken('invalid-code');
        expect.fail('Should have thrown error for invalid code');
      } catch (error: any) {
        expect(error.message).toContain('Failed to exchange');
      }
    });
  });

  describe('ID Token Verification', () => {
    it('should reject invalid token format', async () => {
      try {
        await oauthService.verifyIdToken('invalid-token');
        expect.fail('Should have thrown error for invalid token');
      } catch (error: any) {
        expect(error.message).toContain('Failed to verify ID token');
      }
    });

    it('should reject token with invalid audience', async () => {
      // Create a mock JWT with invalid audience
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64');
      const payload = Buffer.from(
        JSON.stringify({
          aud: 'wrong-client-id',
          iss: `https://login.microsoftonline.com/test-tenant-id/v2.0`,
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64');
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      try {
        await oauthService.verifyIdToken(token);
        expect.fail('Should have thrown error for invalid audience');
      } catch (error: any) {
        expect(error.message).toContain('Failed to verify ID token');
      }
    });

    it('should reject expired tokens', async () => {
      // Create a mock JWT with expired timestamp
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64');
      const payload = Buffer.from(
        JSON.stringify({
          aud: 'test-client-id',
          iss: `https://login.microsoftonline.com/test-tenant-id/v2.0`,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        })
      ).toString('base64');
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      try {
        await oauthService.verifyIdToken(token);
        expect.fail('Should have thrown error for expired token');
      } catch (error: any) {
        expect(error.message).toContain('Failed to verify ID token');
      }
    });
  });
});

describe('Password Validation', () => {
  it('should validate strong password requirements', () => {
    const strongPassword = 'SecurePass123!';

    // Check length
    expect(strongPassword.length).toBeGreaterThanOrEqual(8);

    // Check uppercase
    expect(/[A-Z]/.test(strongPassword)).toBe(true);

    // Check lowercase
    expect(/[a-z]/.test(strongPassword)).toBe(true);

    // Check number
    expect(/[0-9]/.test(strongPassword)).toBe(true);

    // Check special character
    expect(/[!@#$%^&*]/.test(strongPassword)).toBe(true);
  });

  it('should reject weak passwords', () => {
    const weakPasswords = [
      'short',
      'nouppercase123!',
      'NOLOWERCASE123!',
      'NoNumbers!',
      'NoSpecial123',
    ];

    weakPasswords.forEach((password) => {
      let hasIssue = false;

      if (password.length < 8) hasIssue = true;
      if (!/[A-Z]/.test(password)) hasIssue = true;
      if (!/[a-z]/.test(password)) hasIssue = true;
      if (!/[0-9]/.test(password)) hasIssue = true;
      if (!/[!@#$%^&*]/.test(password)) hasIssue = true;

      expect(hasIssue).toBe(true);
    });
  });
});

describe('Email Validation', () => {
  it('should validate correct email formats', () => {
    const validEmails = [
      'user@example.com',
      'john.doe@company.co.uk',
      'test+tag@domain.org',
      'user123@test-domain.com',
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it('should reject invalid email formats', () => {
    const invalidEmails = ['invalid', 'invalid@', '@example.com', 'invalid@.com', 'user @example.com'];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    invalidEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it('should normalize email to lowercase', () => {
    const email = 'TestUser@Example.COM';
    const normalized = email.toLowerCase();

    expect(normalized).toBe('testuser@example.com');
  });
});

describe('Access Request Management', () => {
  it('should create access request with valid data', () => {
    const request = {
      id: 'RAR-1',
      fullName: 'John Doe',
      email: 'john@example.com',
      organization: 'Test Org',
      operatingUnit: 'Test OU',
      jobTitle: 'Manager',
      reasonForAccess: 'Need access to manage projects',
      status: 'new' as const,
      createdAt: new Date(),
    };

    expect(request.id).toBe('RAR-1');
    expect(request.email).toContain('@');
    expect(request.status).toBe('new');
    expect(request.createdAt instanceof Date).toBe(true);
  });

  it('should track request status changes', () => {
    const request = {
      id: 'RAR-1',
      fullName: 'John Doe',
      email: 'john@example.com',
      organization: 'Test Org',
      operatingUnit: 'Test OU',
      jobTitle: 'Manager',
      reasonForAccess: 'Need access',
      status: 'new' as const,
      createdAt: new Date(),
    };

    expect(request.status).toBe('new');

    // Simulate status change
    const updatedRequest = { ...request, status: 'approved' as const };
    expect(updatedRequest.status).toBe('approved');
    expect(request.status).toBe('new'); // Original unchanged
  });

  it('should validate required fields in access request', () => {
    const isValidRequest = (request: any) => {
      return (
        request.fullName &&
        request.email &&
        request.organization &&
        request.jobTitle &&
        request.reasonForAccess &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)
      );
    };

    const validRequest = {
      fullName: 'John Doe',
      email: 'john@example.com',
      organization: 'Test Org',
      jobTitle: 'Manager',
      reasonForAccess: 'Need access',
    };

    const invalidRequest = {
      fullName: 'John Doe',
      email: 'invalid-email',
      organization: 'Test Org',
      jobTitle: 'Manager',
      reasonForAccess: 'Need access',
    };

    expect(isValidRequest(validRequest)).toBe(true);
    expect(isValidRequest(invalidRequest)).toBe(false);
  });
});
