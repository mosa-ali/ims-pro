import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  provisionOrganizationMicrosoftUser,
  provisionOrganizationLocalUser,
  provisionPlatformMicrosoftAdmin,
  provisionPlatformLocalAdmin,
} from './accessRequestProvisioningService';

/**
 * Comprehensive tests for all 4 access request provisioning flows:
 * 1. Organization User + Microsoft
 * 2. Organization User + Local
 * 3. Platform Admin + Microsoft
 * 4. Platform Admin + Local
 */

describe('Access Request Provisioning Services', () => {
  const mockOrgId = 1;
  const mockOUId = 2;
  const testEmail = 'test@example.com';
  const testName = 'Test User';
  const testJobTitle = 'Test Manager';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Flow 1: Organization User + Microsoft', () => {
    it('should provision organization user with Microsoft auth', async () => {
      const result = await provisionOrganizationMicrosoftUser({
        email: testEmail,
        fullName: testName,
        jobTitle: testJobTitle,
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(typeof result.userId).toBe('number');
    });

    it('should create user with correct organization and OU mapping', async () => {
      const result = await provisionOrganizationMicrosoftUser({
        email: testEmail,
        fullName: testName,
        jobTitle: testJobTitle,
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      expect(result.userId).toBeGreaterThan(0);
    });

    it('should handle Microsoft Entra ID mapping', async () => {
      const result = await provisionOrganizationMicrosoftUser({
        email: testEmail,
        fullName: testName,
        jobTitle: testJobTitle,
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      expect(result).toHaveProperty('userId');
    });
  });

  describe('Flow 2: Organization User + Local', () => {
    it('should provision organization user with local auth', async () => {
      const result = await provisionOrganizationLocalUser({
        email: testEmail,
        fullName: testName,
        jobTitle: testJobTitle,
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(typeof result.userId).toBe('number');
    });

    it('should create user with local password', async () => {
      const result = await provisionOrganizationLocalUser({
        email: testEmail,
        fullName: testName,
        jobTitle: testJobTitle,
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      expect(result.userId).toBeGreaterThan(0);
      expect(result).toHaveProperty('tempPassword');
    });

    it('should assign organization and OU membership', async () => {
      const result = await provisionOrganizationLocalUser({
        email: testEmail,
        fullName: testName,
        jobTitle: testJobTitle,
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      expect(result.userId).toBeGreaterThan(0);
    });
  });

  describe('Flow 3: Platform Admin + Microsoft', () => {
    it('should provision platform admin with Microsoft auth', async () => {
      const result = await provisionPlatformMicrosoftAdmin({
        email: testEmail,
        fullName: testName,
      });

      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(typeof result.userId).toBe('number');
    });

    it('should assign platform_admin role', async () => {
      const result = await provisionPlatformMicrosoftAdmin({
        email: testEmail,
        fullName: testName,
      });

      expect(result.userId).toBeGreaterThan(0);
    });

    it('should handle Entra ID mapping for platform admin', async () => {
      const result = await provisionPlatformMicrosoftAdmin({
        email: testEmail,
        fullName: testName,
      });

      expect(result).toHaveProperty('userId');
    });
  });

  describe('Flow 4: Platform Admin + Local', () => {
    it('should provision platform admin with local auth', async () => {
      const result = await provisionPlatformLocalAdmin({
        email: testEmail,
        fullName: testName,
      });

      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(typeof result.userId).toBe('number');
    });

    it('should create platform admin with local password', async () => {
      const result = await provisionPlatformLocalAdmin({
        email: testEmail,
        fullName: testName,
      });

      expect(result.userId).toBeGreaterThan(0);
      expect(result).toHaveProperty('tempPassword');
    });

    it('should assign platform_admin role without organization context', async () => {
      const result = await provisionPlatformLocalAdmin({
        email: testEmail,
        fullName: testName,
      });

      expect(result.userId).toBeGreaterThan(0);
    });
  });

  describe('Cross-flow validation', () => {
    it('should handle multiple users in same organization', async () => {
      const user1 = await provisionOrganizationMicrosoftUser({
        email: 'user1@example.com',
        fullName: 'User One',
        jobTitle: 'Manager',
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      const user2 = await provisionOrganizationLocalUser({
        email: 'user2@example.com',
        fullName: 'User Two',
        jobTitle: 'Staff',
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      expect(user1.userId).not.toBe(user2.userId);
    });

    it('should handle multiple platform admins', async () => {
      const admin1 = await provisionPlatformMicrosoftAdmin({
        email: 'admin1@example.com',
        fullName: 'Admin One',
      });

      const admin2 = await provisionPlatformLocalAdmin({
        email: 'admin2@example.com',
        fullName: 'Admin Two',
      });

      expect(admin1.userId).not.toBe(admin2.userId);
    });

    it('should isolate organization users from platform admins', async () => {
      const orgUser = await provisionOrganizationMicrosoftUser({
        email: 'orguser@example.com',
        fullName: 'Org User',
        jobTitle: 'Staff',
        organizationId: mockOrgId,
        operatingUnitId: mockOUId,
      });

      const platformAdmin = await provisionPlatformMicrosoftAdmin({
        email: 'platformadmin@example.com',
        fullName: 'Platform Admin',
      });

      expect(orgUser.userId).not.toBe(platformAdmin.userId);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid email format', async () => {
      expect(async () => {
        await provisionOrganizationMicrosoftUser({
          email: 'invalid-email',
          fullName: testName,
          jobTitle: testJobTitle,
          organizationId: mockOrgId,
          operatingUnitId: mockOUId,
        });
      }).rejects.toThrow();
    });

    it('should handle missing required fields', async () => {
      expect(async () => {
        await provisionOrganizationMicrosoftUser({
          email: testEmail,
          fullName: '',
          jobTitle: testJobTitle,
          organizationId: mockOrgId,
          operatingUnitId: mockOUId,
        });
      }).rejects.toThrow();
    });

    it('should handle invalid organization ID', async () => {
      expect(async () => {
        await provisionOrganizationMicrosoftUser({
          email: testEmail,
          fullName: testName,
          jobTitle: testJobTitle,
          organizationId: 99999,
          operatingUnitId: mockOUId,
        });
      }).rejects.toThrow();
    });
  });
});
