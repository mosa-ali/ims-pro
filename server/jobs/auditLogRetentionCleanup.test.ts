import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for Audit Log Retention Cleanup Cron Job
 * Verifies scheduling, execution, and error handling
 */

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn().mockReturnValue({
      stop: vi.fn(),
      start: vi.fn(),
    }),
  },
}));

// Mock the database module
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  lt: vi.fn((col, val) => ({ col, val, type: 'lt' })),
}));

// Mock schema
vi.mock('../../drizzle/schema', () => ({
  auditLogs: { createdAt: 'createdAt' },
}));

import cron from 'node-cron';
import { getDb } from '../db';
import {
  scheduleAuditLogRetentionCleanup,
  stopAuditLogRetentionCleanup,
  triggerRetentionCleanupManually,
} from './auditLogRetentionCleanup';

const mockCronSchedule = vi.mocked(cron.schedule);
const mockGetDb = vi.mocked(getDb);

describe('scheduleAuditLogRetentionCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should schedule a cron job with the correct weekly schedule', () => {
    scheduleAuditLogRetentionCleanup();

    expect(mockCronSchedule).toHaveBeenCalledWith(
      '0 2 * * 0', // Sunday 2:00 AM UTC
      expect.any(Function)
    );
  });

  it('should return a scheduled task object', () => {
    const task = scheduleAuditLogRetentionCleanup();

    expect(task).not.toBeNull();
    expect(task).toHaveProperty('stop');
  });

  it('should return null when scheduling fails', () => {
    mockCronSchedule.mockImplementationOnce(() => {
      throw new Error('Cron scheduling failed');
    });

    const task = scheduleAuditLogRetentionCleanup();

    expect(task).toBeNull();
  });

  it('should log the schedule on startup', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    scheduleAuditLogRetentionCleanup();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Scheduled weekly retention cleanup')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('90 day threshold')
    );

    consoleSpy.mockRestore();
  });
});

describe('stopAuditLogRetentionCleanup', () => {
  it('should stop a running task', () => {
    const mockTask = { stop: vi.fn(), start: vi.fn() } as any;

    stopAuditLogRetentionCleanup(mockTask);

    expect(mockTask.stop).toHaveBeenCalledOnce();
  });

  it('should handle null task gracefully', () => {
    expect(() => stopAuditLogRetentionCleanup(null)).not.toThrow();
  });
});

describe('triggerRetentionCleanupManually', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete logs older than 90 days and return count', async () => {
    const mockDb = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowsAffected: 15 }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await triggerRetentionCleanupManually();

    expect(result.deletedCount).toBe(15);
    expect(result.cutoffDate).toBeInstanceOf(Date);
  });

  it('should calculate cutoff date as 90 days ago', async () => {
    const mockDb = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const beforeCall = new Date();
    const result = await triggerRetentionCleanupManually();
    const afterCall = new Date();

    const expectedCutoffMin = new Date(beforeCall.getTime() - 90 * 24 * 60 * 60 * 1000);
    const expectedCutoffMax = new Date(afterCall.getTime() - 90 * 24 * 60 * 60 * 1000);

    expect(result.cutoffDate.getTime()).toBeGreaterThanOrEqual(expectedCutoffMin.getTime() - 1000);
    expect(result.cutoffDate.getTime()).toBeLessThanOrEqual(expectedCutoffMax.getTime() + 1000);
  });

  it('should return 0 when no old logs exist', async () => {
    const mockDb = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await triggerRetentionCleanupManually();

    expect(result.deletedCount).toBe(0);
  });

  it('should handle database unavailability gracefully', async () => {
    mockGetDb.mockResolvedValue(null as any);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await triggerRetentionCleanupManually();

    expect(result.deletedCount).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Database not available')
    );

    consoleSpy.mockRestore();
  });

  it('should handle database errors gracefully', async () => {
    const mockDb = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockRejectedValue(new Error('DB connection lost')),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await triggerRetentionCleanupManually();

    expect(result.deletedCount).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error during cleanup'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should log the cleanup result', async () => {
    const mockDb = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowsAffected: 42 }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await triggerRetentionCleanupManually();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Successfully deleted 42 audit logs')
    );

    consoleSpy.mockRestore();
  });
});

describe('Cron Schedule Validation', () => {
  it('should use the correct cron expression for weekly Sunday 2AM UTC', () => {
    // '0 2 * * 0' means: second=0, minute=2, hour=*, day=*, month=*, weekday=0(Sunday)
    // Actually for node-cron 5-field: minute=0, hour=2, day=*, month=*, weekday=0
    const schedule = '0 2 * * 0';
    const parts = schedule.split(' ');

    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('0');   // minute: 0
    expect(parts[1]).toBe('2');   // hour: 2 AM
    expect(parts[2]).toBe('*');   // day of month: any
    expect(parts[3]).toBe('*');   // month: any
    expect(parts[4]).toBe('0');   // day of week: 0 = Sunday
  });
});
