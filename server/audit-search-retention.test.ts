import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for Audit Log Search by User Name/Email and Retention Policies
 */

// Mock database module
vi.mock('./db', () => ({
  getAuditLogs: vi.fn(),
  getAuditLogsCount: vi.fn(),
  getRecentAuditLogs: vi.fn(),
  deleteOldAuditLogs: vi.fn(),
  getAuditLogRetentionStats: vi.fn(),
}));

import { getAuditLogs, getAuditLogsCount, deleteOldAuditLogs, getAuditLogRetentionStats } from './db';

const mockGetAuditLogs = vi.mocked(getAuditLogs);
const mockGetAuditLogsCount = vi.mocked(getAuditLogsCount);
const mockDeleteOldAuditLogs = vi.mocked(deleteOldAuditLogs);
const mockGetAuditLogRetentionStats = vi.mocked(getAuditLogRetentionStats);

describe('Audit Log Search by User Name/Email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept search parameter in getAuditLogs', async () => {
    mockGetAuditLogs.mockResolvedValue([
      {
        id: 1,
        userId: 100,
        userName: 'Mosa Drwesh',
        userEmail: 'mdrwesh82@gmail.com',
        organizationId: 1,
        organizationName: 'EFADAH',
        operatingUnitId: 1,
        operatingUnitName: 'HQ',
        action: 'soft_delete',
        entityType: 'organization',
        entityId: '270034',
        details: '{"name":"Test"}',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date('2026-03-17T03:46:00Z'),
      },
    ] as any);

    const result = await getAuditLogs({
      search: 'Mosa',
      limit: 20,
      offset: 0,
    });

    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      search: 'Mosa',
      limit: 20,
      offset: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0].userName).toBe('Mosa Drwesh');
  });

  it('should accept search parameter in getAuditLogsCount', async () => {
    mockGetAuditLogsCount.mockResolvedValue(5);

    const count = await getAuditLogsCount({
      search: 'mdrwesh',
    });

    expect(mockGetAuditLogsCount).toHaveBeenCalledWith({
      search: 'mdrwesh',
    });
    expect(count).toBe(5);
  });

  it('should return empty results when search matches no users', async () => {
    mockGetAuditLogs.mockResolvedValue([]);
    mockGetAuditLogsCount.mockResolvedValue(0);

    const result = await getAuditLogs({ search: 'nonexistentuser12345' });
    const count = await getAuditLogsCount({ search: 'nonexistentuser12345' });

    expect(result).toHaveLength(0);
    expect(count).toBe(0);
  });

  it('should search by email address', async () => {
    mockGetAuditLogs.mockResolvedValue([
      {
        id: 2,
        userId: 100,
        userName: 'Mosa Drwesh',
        userEmail: 'mdrwesh82@gmail.com',
        action: 'login',
        entityType: 'user',
        createdAt: new Date(),
      },
    ] as any);

    const result = await getAuditLogs({ search: 'gmail.com' });
    expect(result).toHaveLength(1);
    expect(result[0].userEmail).toContain('gmail.com');
  });

  it('should combine search with other filters', async () => {
    mockGetAuditLogs.mockResolvedValue([]);

    await getAuditLogs({
      search: 'Mosa',
      action: 'soft_delete',
      entityType: 'organization',
      limit: 10,
      offset: 0,
    });

    expect(mockGetAuditLogs).toHaveBeenCalledWith({
      search: 'Mosa',
      action: 'soft_delete',
      entityType: 'organization',
      limit: 10,
      offset: 0,
    });
  });
});

describe('Audit Log Retention Policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete old audit logs by retention days', async () => {
    mockDeleteOldAuditLogs.mockResolvedValue(15);

    const deletedCount = await deleteOldAuditLogs(90);

    expect(mockDeleteOldAuditLogs).toHaveBeenCalledWith(90);
    expect(deletedCount).toBe(15);
  });

  it('should return 0 when no old logs exist', async () => {
    mockDeleteOldAuditLogs.mockResolvedValue(0);

    const deletedCount = await deleteOldAuditLogs(180);

    expect(deletedCount).toBe(0);
  });

  it('should accept various retention periods', async () => {
    const periods = [30, 60, 90, 180, 365];
    
    for (const days of periods) {
      mockDeleteOldAuditLogs.mockResolvedValue(0);
      await deleteOldAuditLogs(days);
      expect(mockDeleteOldAuditLogs).toHaveBeenCalledWith(days);
    }
  });

  it('should return retention statistics', async () => {
    mockGetAuditLogRetentionStats.mockResolvedValue({
      total: 123,
      last30Days: 123,
      last90Days: 123,
      last180Days: 123,
      olderThan180Days: 0,
      oldestLogDate: new Date('2026-03-08T00:00:00Z'),
    });

    const stats = await getAuditLogRetentionStats();

    expect(stats.total).toBe(123);
    expect(stats.last30Days).toBe(123);
    expect(stats.last90Days).toBe(123);
    expect(stats.last180Days).toBe(123);
    expect(stats.olderThan180Days).toBe(0);
    expect(stats.oldestLogDate).toBeInstanceOf(Date);
  });

  it('should return zero stats when no logs exist', async () => {
    mockGetAuditLogRetentionStats.mockResolvedValue({
      total: 0,
      last30Days: 0,
      last90Days: 0,
      last180Days: 0,
      olderThan180Days: 0,
      oldestLogDate: null,
    });

    const stats = await getAuditLogRetentionStats();

    expect(stats.total).toBe(0);
    expect(stats.oldestLogDate).toBeNull();
  });

  it('should calculate olderThan180Days correctly', async () => {
    mockGetAuditLogRetentionStats.mockResolvedValue({
      total: 500,
      last30Days: 100,
      last90Days: 250,
      last180Days: 400,
      olderThan180Days: 100,
      oldestLogDate: new Date('2025-06-01T00:00:00Z'),
    });

    const stats = await getAuditLogRetentionStats();

    expect(stats.olderThan180Days).toBe(100);
    expect(stats.total - stats.last180Days).toBe(stats.olderThan180Days);
  });
});

describe('Enriched Audit Log Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user name and email from joined data', async () => {
    mockGetAuditLogs.mockResolvedValue([
      {
        id: 1,
        userId: 100,
        userName: 'Mosa Drwesh',
        userEmail: 'mdrwesh82@gmail.com',
        organizationId: 1,
        organizationName: 'EFADAH',
        operatingUnitId: 1,
        operatingUnitName: 'EFADAH Headquarters',
        action: 'project_status_changed',
        entityType: 'project',
        entityId: '30001',
        details: 'Changed project status',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
      },
    ] as any);

    const result = await getAuditLogs({ limit: 1 });

    expect(result[0]).toHaveProperty('userName', 'Mosa Drwesh');
    expect(result[0]).toHaveProperty('userEmail', 'mdrwesh82@gmail.com');
    expect(result[0]).toHaveProperty('organizationName', 'EFADAH');
    expect(result[0]).toHaveProperty('operatingUnitName', 'EFADAH Headquarters');
    expect(result[0]).toHaveProperty('ipAddress', '192.168.1.1');
    expect(result[0]).toHaveProperty('userAgent', 'Mozilla/5.0');
  });

  it('should handle null organization and operating unit gracefully', async () => {
    mockGetAuditLogs.mockResolvedValue([
      {
        id: 2,
        userId: 100,
        userName: 'Admin User',
        userEmail: 'admin@test.com',
        organizationId: null,
        organizationName: null,
        operatingUnitId: null,
        operatingUnitName: null,
        action: 'login',
        entityType: 'user',
        entityId: '100',
        details: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      },
    ] as any);

    const result = await getAuditLogs({ limit: 1 });

    expect(result[0].organizationName).toBeNull();
    expect(result[0].operatingUnitName).toBeNull();
    expect(result[0].ipAddress).toBeNull();
  });
});
