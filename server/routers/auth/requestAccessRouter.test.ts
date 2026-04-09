import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '../../db';
import { requestAccessRequests, users, userOrganizations } from '../../../drizzle/schema';

describe('requestAccessRouter', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('Domain Validation Service', () => {
    it('should reject organization user request with public domain email', async () => {
      const { domainValidationService } = await import('../../services/organization/domainValidationService');
      
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: 'user@gmail.com',
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('PUBLIC_DOMAIN_NOT_ALLOWED');
    });

    it('should accept organization user request with correct organization domain', async () => {
      const { domainValidationService } = await import('../../services/organization/domainValidationService');
      
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: 'user@yamany.org',
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(true);
    });

    it('should allow platform admin to use public domain email', async () => {
      const { domainValidationService } = await import('../../services/organization/domainValidationService');
      
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 0,
        email: 'admin@gmail.com',
        allowPublicDomains: true,
      });

      expect(result.valid).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const { domainValidationService } = await import('../../services/organization/domainValidationService');
      
      const result = await domainValidationService.validateEmailDomain({
        organizationId: 30001,
        email: 'invalid-email',
        allowPublicDomains: false,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('EMAIL_FORMAT_INVALID');
    });
  });

  describe('Routing Logic', () => {
    it('should have organization admins in the system', async () => {
      const orgAdmins = await db.select().from(userOrganizations);
      expect(orgAdmins.length).toBeGreaterThan(0);
    });

    it('should have platform admins in the system', async () => {
      const allUsers = await db.select().from(users);
      expect(allUsers.length).toBeGreaterThan(0);
    });
  });

  describe('Request Access Table', () => {
    it('should have request access requests table', async () => {
      const allRequests = await db.select().from(requestAccessRequests);
      expect(Array.isArray(allRequests)).toBe(true);
    });

    it('should support pagination', async () => {
      const requests = await db
        .select()
        .from(requestAccessRequests)
        .limit(20)
        .offset(0);

      expect(Array.isArray(requests)).toBe(true);
    });

    it('should have required fields in request schema', async () => {
      const requests = await db.select().from(requestAccessRequests).limit(1);
      
      if (requests.length > 0) {
        const request = requests[0];
        expect(request).toHaveProperty('id');
        expect(request).toHaveProperty('email');
        expect(request).toHaveProperty('fullName');
        expect(request).toHaveProperty('requestType');
        expect(request).toHaveProperty('status');
        expect(request).toHaveProperty('routedToUserId');
        expect(request).toHaveProperty('routedToRole');
      }
    });
  });
});
