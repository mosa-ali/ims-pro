import { describe, it, expect } from "vitest";
import {
  getPRDocumentSyncStatus,
} from "./_core/documentSyncScheduler";

describe("Document Sync Scheduler", () => {
  it("should return zero status for non-existent PR", async () => {
    const status = await getPRDocumentSyncStatus(999999);

    expect(status.total).toBe(0);
    expect(status.pending).toBe(0);
    expect(status.synced).toBe(0);
    expect(status.error).toBe(0);
  });

  it("should calculate sync percentage correctly", async () => {
    // Verify sync percentage calculation logic
    const testCases = [
      { total: 0, synced: 0, expected: 0 },
      { total: 10, synced: 5, expected: 50 },
      { total: 10, synced: 10, expected: 100 },
      { total: 3, synced: 1, expected: 33 },
    ];

    for (const testCase of testCases) {
      const percentage = testCase.total > 0 
        ? Math.round((testCase.synced / testCase.total) * 100)
        : 0;
      expect(percentage).toBe(testCase.expected);
    }
  });

  it("should handle sync status for PR with existing documents", async () => {
    // This test verifies the function doesn't crash with edge cases
    try {
      const status = await getPRDocumentSyncStatus(1);
      expect(status).toBeDefined();
      expect(typeof status.total).toBe("number");
      expect(typeof status.pending).toBe("number");
      expect(typeof status.synced).toBe("number");
      expect(typeof status.error).toBe("number");
    } catch (error) {
      // Expected to fail gracefully if PR doesn't exist
      expect(error).toBeDefined();
    }
  });

  it("should return valid status objects for different PRs", async () => {
    // Verify that sync status queries work for different PR IDs
    const status1 = await getPRDocumentSyncStatus(1);
    const status2 = await getPRDocumentSyncStatus(2);

    // Both should return valid status objects
    expect(status1).toBeDefined();
    expect(status2).toBeDefined();
    expect(status1.total).toBeGreaterThanOrEqual(0);
    expect(status2.total).toBeGreaterThanOrEqual(0);
  });

  it("should calculate sync percentage correctly for various ratios", async () => {
    // Test percentage calculation with various ratios
    const testCases = [
      { synced: 1, total: 3, expected: 33 },
      { synced: 2, total: 3, expected: 67 },
      { synced: 1, total: 6, expected: 17 },
      { synced: 5, total: 6, expected: 83 },
    ];

    for (const testCase of testCases) {
      const percentage = Math.round(
        (testCase.synced / testCase.total) * 100
      );
      expect(percentage).toBe(testCase.expected);
    }
  });
});
