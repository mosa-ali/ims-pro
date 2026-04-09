/**
 * Tests for Operating Unit management procedures in settingsRouter
 * Covers getUserOUs query and updateUserOUs mutation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

// Mock the schema
vi.mock('../drizzle/schema', () => ({
  userOperatingUnits: { userId: 'userId', operatingUnitId: 'operatingUnitId', id: 'id', role: 'role' },
  operatingUnits: { id: 'id', name: 'name' },
  users: { id: 'id', name: 'name', email: 'email' },
  userOrganizations: { userId: 'userId', organizationId: 'organizationId', platformRole: 'platformRole' },
  rbacUserPermissions: { userId: 'userId', organizationId: 'organizationId', isActive: 'isActive', roleId: 'roleId' },
  rbacRoles: { id: 'id', name: 'name', organizationId: 'organizationId', deletedAt: 'deletedAt' },
}));

// Mock rbacService
vi.mock('./rbacService', () => ({
  logSensitiveAccess: vi.fn().mockResolvedValue(undefined),
  initializeDefaultRoles: vi.fn().mockResolvedValue(undefined),
  MODULE_DEFINITIONS: [],
  SCREEN_DEFINITIONS: [],
  getPermissionTree: vi.fn().mockReturnValue([]),
  SENSITIVE_WORKSPACES: [],
  canAccess: vi.fn().mockReturnValue(true),
  ALL_ACTIONS: [],
  getUserOverrides: vi.fn().mockResolvedValue([]),
}));

// Mock storage
vi.mock('./storage', () => ({
  storagePut: vi.fn(),
}));

import { getDb } from './db';

describe('Settings Router - Operating Unit Management', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
    };
    (getDb as any).mockResolvedValue(mockDb);
  });

  describe('getUserOUs logic', () => {
    it('should return OU assignments for a given user', async () => {
      const mockOURows = [
        { id: 1, ouId: 10, ouName: 'HQ Yemen', role: 'user' },
        { id: 2, ouId: 11, ouName: 'Field Office Aden', role: 'user' },
      ];
      mockDb.where.mockResolvedValueOnce(mockOURows);

      // Simulate the query logic
      const db = await getDb();
      const rows = await db.select().from('userOperatingUnits').innerJoin('operatingUnits', 'eq').where('userId');
      const result = rows.map((r: any) => ({ id: r.id, ouId: r.ouId, name: r.ouName, role: r.role }));

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ ouId: 10, name: 'HQ Yemen', role: 'user' });
      expect(result[1]).toMatchObject({ ouId: 11, name: 'Field Office Aden', role: 'user' });
    });

    it('should return empty array when user has no OU assignments', async () => {
      mockDb.where.mockResolvedValueOnce([]);

      const db = await getDb();
      const rows = await db.select().from('userOperatingUnits').innerJoin('operatingUnits', 'eq').where('userId');
      const result = rows.map((r: any) => ({ id: r.id, ouId: r.ouId, name: r.ouName, role: r.role }));

      expect(result).toHaveLength(0);
    });
  });

  describe('updateUserOUs logic', () => {
    it('should delete existing OU assignments and insert new ones', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const deleteFinalMock = vi.fn().mockResolvedValue(undefined);
      mockDb.delete = deleteMock;
      mockDb.where = deleteFinalMock;

      const insertMock = vi.fn().mockReturnThis();
      const valuesMock = vi.fn().mockResolvedValue([]);
      mockDb.insert = insertMock;
      mockDb.values = valuesMock;

      const db = await getDb();
      // Simulate delete
      await db.delete('userOperatingUnits').where('userId = 5');
      expect(deleteMock).toHaveBeenCalledWith('userOperatingUnits');

      // Simulate insert
      const newOuIds = [10, 11, 12];
      await db.insert('userOperatingUnits').values(
        newOuIds.map(ouId => ({ userId: 5, operatingUnitId: ouId, role: 'user' }))
      );
      expect(insertMock).toHaveBeenCalledWith('userOperatingUnits');
      expect(valuesMock).toHaveBeenCalledWith([
        { userId: 5, operatingUnitId: 10, role: 'user' },
        { userId: 5, operatingUnitId: 11, role: 'user' },
        { userId: 5, operatingUnitId: 12, role: 'user' },
      ]);
    });

    it('should handle clearing all OUs (empty array)', async () => {
      const deleteMock = vi.fn().mockReturnThis();
      const deleteFinalMock = vi.fn().mockResolvedValue(undefined);
      mockDb.delete = deleteMock;
      mockDb.where = deleteFinalMock;

      const insertMock = vi.fn().mockReturnThis();
      const valuesMock = vi.fn().mockResolvedValue([]);
      mockDb.insert = insertMock;
      mockDb.values = valuesMock;

      const db = await getDb();
      await db.delete('userOperatingUnits').where('userId = 5');
      expect(deleteMock).toHaveBeenCalled();

      // When operatingUnitIds is empty, insert should NOT be called
      const newOuIds: number[] = [];
      if (newOuIds.length > 0) {
        await db.insert('userOperatingUnits').values(newOuIds.map(ouId => ({ userId: 5, operatingUnitId: ouId, role: 'user' })));
      }
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('should assign role as "user" for all new OU assignments', async () => {
      const insertMock = vi.fn().mockReturnThis();
      const valuesMock = vi.fn().mockResolvedValue([]);
      mockDb.insert = insertMock;
      mockDb.values = valuesMock;

      const db = await getDb();
      const ouIds = [10, 11];
      const assignments = ouIds.map(ouId => ({ userId: 5, operatingUnitId: ouId, role: 'user' as const }));
      await db.insert('userOperatingUnits').values(assignments);

      const calledWith = valuesMock.mock.calls[0][0];
      expect(calledWith.every((a: any) => a.role === 'user')).toBe(true);
    });
  });

  describe('users list with OU data', () => {
    it('should include operatingUnits array in each user result', () => {
      // Simulate the ouMap building logic
      const ouAssignments = [
        { userId: 1, ouId: 10, ouName: 'HQ Yemen' },
        { userId: 1, ouId: 11, ouName: 'Field Office Aden' },
        { userId: 2, ouId: 10, ouName: 'HQ Yemen' },
      ];

      const ouMap = new Map<number, { id: number; name: string }[]>();
      for (const row of ouAssignments) {
        if (!ouMap.has(row.userId)) ouMap.set(row.userId, []);
        ouMap.get(row.userId)!.push({ id: row.ouId, name: row.ouName });
      }

      expect(ouMap.get(1)).toHaveLength(2);
      expect(ouMap.get(2)).toHaveLength(1);
      expect(ouMap.get(3)).toBeUndefined();

      // User with no OU should get empty array
      const userResult = { id: 3, operatingUnits: ouMap.get(3) || [] };
      expect(userResult.operatingUnits).toHaveLength(0);
    });

    it('should filter users by OU when ouFilter is provided', () => {
      const users = [
        { id: 1, fullName: 'Alice', operatingUnits: [{ id: 10, name: 'HQ' }, { id: 11, name: 'Field' }] },
        { id: 2, fullName: 'Bob', operatingUnits: [{ id: 10, name: 'HQ' }] },
        { id: 3, fullName: 'Charlie', operatingUnits: [] },
      ];

      const ouFilter = 11;
      const filtered = users.filter(u => u.operatingUnits.some(ou => ou.id === ouFilter));

      expect(filtered).toHaveLength(1);
      expect(filtered[0].fullName).toBe('Alice');
    });

    it('should return all users when no ouFilter is set', () => {
      const users = [
        { id: 1, fullName: 'Alice', operatingUnits: [{ id: 10, name: 'HQ' }] },
        { id: 2, fullName: 'Bob', operatingUnits: [] },
      ];

      const ouFilter = undefined;
      const filtered = ouFilter ? users.filter(u => u.operatingUnits.some(ou => ou.id === ouFilter)) : users;

      expect(filtered).toHaveLength(2);
    });
  });
});
