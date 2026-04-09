import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { auditLogs, users, organizations, operatingUnits } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Tests for Enhanced Audit Logging Features
 * - IP Address and User Agent Tracking
 * - Enriched Data Display (names, emails, org names)
 * - Organization-scoped Activity Logs
 */
describe('Enhanced Audit Logging', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Failed to connect to database');
    }
  });

  describe('Audit Log Data Enrichment', () => {
    it('should retrieve audit logs with user names and emails', async () => {
      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.name,
          userEmail: users.email,
          action: auditLogs.action,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      
      // Check that logs are retrieved (user data may be null if user is deleted)
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should retrieve audit logs with organization names', async () => {
      const logs = await db
        .select({
          id: auditLogs.id,
          organizationId: auditLogs.organizationId,
          organizationName: organizations.name,
          action: auditLogs.action,
        })
        .from(auditLogs)
        .leftJoin(organizations, eq(auditLogs.organizationId, organizations.id))
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      
      // Check that logs are retrieved (org data may be null if org is deleted)
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should retrieve audit logs with operating unit names', async () => {
      const logs = await db
        .select({
          id: auditLogs.id,
          operatingUnitId: auditLogs.operatingUnitId,
          operatingUnitName: operatingUnits.name,
          action: auditLogs.action,
        })
        .from(auditLogs)
        .leftJoin(operatingUnits, eq(auditLogs.operatingUnitId, operatingUnits.id))
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should retrieve audit logs with IP address and user agent', async () => {
      const logs = await db
        .select({
          id: auditLogs.id,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          action: auditLogs.action,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      
      // Verify structure includes IP and user agent fields
      logs.forEach(log => {
        expect(log).toHaveProperty('ipAddress');
        expect(log).toHaveProperty('userAgent');
        expect(log).toHaveProperty('action');
      });
    });
  });

  describe('Organization-Scoped Activity Logs', () => {
    it('should retrieve audit logs for a specific organization', async () => {
      // Get first organization
      const orgs = await db
        .select({ id: organizations.id })
        .from(organizations)
        .limit(1);

      if (orgs.length === 0) {
        console.log('No organizations found, skipping test');
        return;
      }

      const orgId = orgs[0].id;

      const logs = await db
        .select({
          id: auditLogs.id,
          organizationId: auditLogs.organizationId,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
        })
        .from(auditLogs)
        .where(eq(auditLogs.organizationId, orgId))
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      
      // All logs should belong to the specified organization
      logs.forEach(log => {
        expect(log.organizationId).toBe(orgId);
      });
    });

    it('should retrieve audit logs for a specific operating unit', async () => {
      // Get first operating unit
      const ous = await db
        .select({ id: operatingUnits.id })
        .from(operatingUnits)
        .limit(1);

      if (ous.length === 0) {
        console.log('No operating units found, skipping test');
        return;
      }

      const ouId = ous[0].id;

      const logs = await db
        .select({
          id: auditLogs.id,
          operatingUnitId: auditLogs.operatingUnitId,
          action: auditLogs.action,
        })
        .from(auditLogs)
        .where(eq(auditLogs.operatingUnitId, ouId))
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      
      // All logs should belong to the specified operating unit
      logs.forEach(log => {
        expect(log.operatingUnitId).toBe(ouId);
      });
    });

    it('should retrieve recent audit logs with full enrichment', async () => {
      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.name,
          userEmail: users.email,
          organizationId: auditLogs.organizationId,
          organizationName: organizations.name,
          operatingUnitId: auditLogs.operatingUnitId,
          operatingUnitName: operatingUnits.name,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .leftJoin(organizations, eq(auditLogs.organizationId, organizations.id))
        .leftJoin(operatingUnits, eq(auditLogs.operatingUnitId, operatingUnits.id))
        .orderBy(auditLogs.createdAt)
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);

      // Verify all enriched fields are present
      logs.forEach(log => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('userId');
        expect(log).toHaveProperty('userName');
        expect(log).toHaveProperty('userEmail');
        expect(log).toHaveProperty('organizationId');
        expect(log).toHaveProperty('organizationName');
        expect(log).toHaveProperty('operatingUnitId');
        expect(log).toHaveProperty('operatingUnitName');
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('entityType');
        expect(log).toHaveProperty('entityId');
        expect(log).toHaveProperty('ipAddress');
        expect(log).toHaveProperty('userAgent');
        expect(log).toHaveProperty('createdAt');
      });
    });
  });

  describe('Audit Log Filtering', () => {
    it('should filter audit logs by action type', async () => {
      const logs = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
        })
        .from(auditLogs)
        .where(eq(auditLogs.action, 'soft_delete'))
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      
      // All logs should have the specified action
      logs.forEach(log => {
        expect(log.action).toBe('soft_delete');
      });
    });

    it('should filter audit logs by entity type', async () => {
      const logs = await db
        .select({
          id: auditLogs.id,
          entityType: auditLogs.entityType,
        })
        .from(auditLogs)
        .where(eq(auditLogs.entityType, 'organization'))
        .limit(10);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
      
      // All logs should have the specified entity type
      logs.forEach(log => {
        expect(log.entityType).toBe('organization');
      });
    });

    it('should support pagination of audit logs', async () => {
      const limit = 5;
      const offset = 0;

      const logsPage1 = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
        })
        .from(auditLogs)
        .orderBy(auditLogs.createdAt)
        .limit(limit)
        .offset(offset);

      const logsPage2 = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
        })
        .from(auditLogs)
        .orderBy(auditLogs.createdAt)
        .limit(limit)
        .offset(offset + limit);

      expect(logsPage1).toBeDefined();
      expect(logsPage2).toBeDefined();
      expect(logsPage1.length).toBeLessThanOrEqual(limit);
      expect(logsPage2.length).toBeLessThanOrEqual(limit);

      // Pages should contain different logs
      if (logsPage1.length > 0 && logsPage2.length > 0) {
        const page1Ids = logsPage1.map(log => log.id);
        const page2Ids = logsPage2.map(log => log.id);
        const intersection = page1Ids.filter(id => page2Ids.includes(id));
        expect(intersection.length).toBe(0);
      }
    });
  });

  describe('Audit Log Count', () => {
    it('should count total audit logs', async () => {
      const result = await db
        .select({ count: auditLogs.id })
        .from(auditLogs);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should count audit logs by organization', async () => {
      const orgs = await db
        .select({ id: organizations.id })
        .from(organizations)
        .limit(1);

      if (orgs.length === 0) {
        console.log('No organizations found, skipping test');
        return;
      }

      const orgId = orgs[0].id;
      const result = await db
        .select({ count: auditLogs.id })
        .from(auditLogs)
        .where(eq(auditLogs.organizationId, orgId));

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
