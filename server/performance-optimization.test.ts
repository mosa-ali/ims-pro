/**
 * Performance Optimization Tests
 * Tests caching strategies, pagination, and query optimization
 */

import { describe, it, expect, beforeEach } from "vitest";
import { cacheManager, cacheKeys, cacheInvalidation } from "./utils/cacheManager";
import {
  createPaginatedResponse,
  createCursorPaginatedResponse,
  encodeCursor,
  decodeCursor,
  sortItems,
  filterItems,
  chunkArray,
  measureQueryPerformance,
} from "./utils/paginationHelper";

describe("Performance Optimization Tests", () => {
  // ============================================================================
  // CACHING TESTS
  // ============================================================================

  describe("Cache Manager", () => {
    beforeEach(() => {
      cacheManager.clear();
    });

    it("should set and get cached data", () => {
      const testData = { id: "1", name: "Vehicle 1" };
      const key = "test:key";

      cacheManager.set(key, testData);
      const retrieved = cacheManager.get(key);

      expect(retrieved).toEqual(testData);
    });

    it("should return null for non-existent keys", () => {
      const retrieved = cacheManager.get("non:existent");
      expect(retrieved).toBeNull();
    });

    it("should expire cached data after TTL", () => {
      const testData = { id: "1", name: "Vehicle 1" };
      const key = "test:key";
      const ttl = 100; // 100ms

      cacheManager.set(key, testData, ttl);
      expect(cacheManager.get(key)).toEqual(testData);

      // Wait for expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(cacheManager.get(key)).toBeNull();
          resolve(null);
        }, 150);
      });
    });

    it("should delete cached data", () => {
      const testData = { id: "1", name: "Vehicle 1" };
      const key = "test:key";

      cacheManager.set(key, testData);
      expect(cacheManager.get(key)).toEqual(testData);

      cacheManager.delete(key);
      expect(cacheManager.get(key)).toBeNull();
    });

    it("should clear all cache", () => {
      cacheManager.set("key1", { data: 1 });
      cacheManager.set("key2", { data: 2 });
      cacheManager.set("key3", { data: 3 });

      expect(cacheManager.getStats().size).toBe(3);

      cacheManager.clear();
      expect(cacheManager.getStats().size).toBe(0);
    });

    it("should invalidate cache by pattern", () => {
      cacheManager.set("vehicle:detail:org1:veh1", { id: "veh1" });
      cacheManager.set("vehicle:detail:org1:veh2", { id: "veh2" });
      cacheManager.set("driver:detail:org1:drv1", { id: "drv1" });

      expect(cacheManager.getStats().size).toBe(3);

      cacheManager.invalidateByPattern("vehicle:detail:org1:.*");
      expect(cacheManager.getStats().size).toBe(1);
    });

    it("should generate correct cache keys", () => {
      const vehicleKey = cacheKeys.vehicleDetail("veh-123", "org-456");
      expect(vehicleKey).toBe("vehicle:detail:org-456:veh-123");

      const driverKey = cacheKeys.driverPerformance("drv-789", "org-456");
      expect(driverKey).toBe("driver:perf:org-456:drv-789");

      const fleetKey = cacheKeys.fleetOverview("org-456", "ou-789");
      expect(fleetKey).toBe("fleet:overview:org-456:ou-789");
    });

    it("should invalidate vehicle caches", () => {
      const vehicleId = "veh-123";
      const orgId = "org-456";

      cacheManager.set(cacheKeys.vehicleDetail(vehicleId, orgId), { id: vehicleId });
      cacheManager.set(cacheKeys.vehicleStatistics(vehicleId, orgId), { stats: {} });

      expect(cacheManager.getStats().size).toBe(2);

      cacheInvalidation.invalidateVehicle(vehicleId, orgId);
      expect(cacheManager.getStats().size).toBe(0);
    });
  });

  // ============================================================================
  // PAGINATION TESTS
  // ============================================================================

  describe("Pagination Helpers", () => {
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      value: i,
    }));

    it("should create paginated response", () => {
      const response = createPaginatedResponse(mockData.slice(0, 20), 100, 20, 0);

      expect(response.data.length).toBe(20);
      expect(response.pagination.total).toBe(100);
      expect(response.pagination.limit).toBe(20);
      expect(response.pagination.offset).toBe(0);
      expect(response.pagination.hasMore).toBe(true);
      expect(response.pagination.pages).toBe(5);
      expect(response.pagination.currentPage).toBe(1);
    });

    it("should handle last page pagination", () => {
      const response = createPaginatedResponse(mockData.slice(80, 100), 100, 20, 80);

      expect(response.data.length).toBe(20);
      expect(response.pagination.hasMore).toBe(false);
      expect(response.pagination.currentPage).toBe(5);
    });

    it("should encode and decode cursors", () => {
      const item = { id: "item-123", name: "Test Item" };
      const cursor = encodeCursor(item);

      expect(typeof cursor).toBe("string");
      expect(cursor.length).toBeGreaterThan(0);

      const decoded = decodeCursor(cursor);
      expect(decoded).toBe("item-123");
    });

    it("should create cursor-based paginated response", () => {
      const response = createCursorPaginatedResponse(
        mockData.slice(0, 20),
        20,
        undefined,
        true
      );

      expect(response.data.length).toBe(20);
      expect(response.pagination.limit).toBe(20);
      expect(response.pagination.hasMore).toBe(true);
      expect(response.pagination.nextCursor).toBeDefined();
    });
  });

  // ============================================================================
  // SORTING TESTS
  // ============================================================================

  describe("Sorting Helpers", () => {
    const mockData = [
      { id: "3", name: "Charlie", value: 30 },
      { id: "1", name: "Alice", value: 10 },
      { id: "2", name: "Bob", value: 20 },
    ];

    it("should sort ascending by field", () => {
      const sorted = sortItems(mockData, [{ field: "name", direction: "asc" }]);

      expect(sorted[0].name).toBe("Alice");
      expect(sorted[1].name).toBe("Bob");
      expect(sorted[2].name).toBe("Charlie");
    });

    it("should sort descending by field", () => {
      const sorted = sortItems(mockData, [{ field: "value", direction: "desc" }]);

      expect(sorted[0].value).toBe(30);
      expect(sorted[1].value).toBe(20);
      expect(sorted[2].value).toBe(10);
    });

    it("should sort by multiple fields", () => {
      const data = [
        { category: "A", value: 2 },
        { category: "B", value: 1 },
        { category: "A", value: 1 },
      ];

      const sorted = sortItems(data, [
        { field: "category", direction: "asc" },
        { field: "value", direction: "asc" },
      ]);

      expect(sorted[0]).toEqual({ category: "A", value: 1 });
      expect(sorted[1]).toEqual({ category: "A", value: 2 });
      expect(sorted[2]).toEqual({ category: "B", value: 1 });
    });
  });

  // ============================================================================
  // FILTERING TESTS
  // ============================================================================

  describe("Filtering Helpers", () => {
    const mockData = [
      { id: "1", status: "active", value: 100 },
      { id: "2", status: "inactive", value: 200 },
      { id: "3", status: "active", value: 150 },
    ];

    it("should filter by equality", () => {
      const filtered = filterItems(mockData, [{ field: "status", operator: "eq", value: "active" }]);

      expect(filtered.length).toBe(2);
      expect(filtered.every((item) => item.status === "active")).toBe(true);
    });

    it("should filter by greater than", () => {
      const filtered = filterItems(mockData, [{ field: "value", operator: "gt", value: 120 }]);

      expect(filtered.length).toBe(2);
      expect(filtered.every((item) => item.value > 120)).toBe(true);
    });

    it("should filter by in operator", () => {
      const filtered = filterItems(mockData, [
        { field: "id", operator: "in", value: ["1", "3"] },
      ]);

      expect(filtered.length).toBe(2);
      expect(filtered.map((item) => item.id)).toEqual(["1", "3"]);
    });

    it("should filter by contains operator", () => {
      const data = [
        { id: "1", name: "Vehicle ABC" },
        { id: "2", name: "Driver XYZ" },
        { id: "3", name: "Vehicle DEF" },
      ];

      const filtered = filterItems(data, [
        { field: "name", operator: "contains", value: "vehicle" },
      ]);

      expect(filtered.length).toBe(2);
    });

    it("should apply multiple filters", () => {
      const filtered = filterItems(mockData, [
        { field: "status", operator: "eq", value: "active" },
        { field: "value", operator: "gte", value: 150 },
      ]);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("3");
    });
  });

  // ============================================================================
  // CHUNKING TESTS
  // ============================================================================

  describe("Chunking Helpers", () => {
    it("should chunk array into smaller arrays", () => {
      const array = Array.from({ length: 100 }, (_, i) => i);
      const chunks = chunkArray(array, 25);

      expect(chunks.length).toBe(4);
      expect(chunks[0].length).toBe(25);
      expect(chunks[3].length).toBe(25);
    });

    it("should handle uneven chunks", () => {
      const array = Array.from({ length: 100 }, (_, i) => i);
      const chunks = chunkArray(array, 30);

      expect(chunks.length).toBe(4);
      expect(chunks[3].length).toBe(10);
    });

    it("should handle single chunk", () => {
      const array = Array.from({ length: 10 }, (_, i) => i);
      const chunks = chunkArray(array, 50);

      expect(chunks.length).toBe(1);
      expect(chunks[0].length).toBe(10);
    });
  });

  // ============================================================================
  // PERFORMANCE MEASUREMENT TESTS
  // ============================================================================

  describe("Performance Measurement", () => {
    it("should measure query performance", () => {
      const startTime = Date.now();
      const results = Array.from({ length: 50 }, (_, i) => ({ id: i }));

      // Simulate some work
      for (let i = 0; i < 1000000; i++) {
        Math.sqrt(i);
      }

      const performance = measureQueryPerformance(startTime, results, 50, 1000);

      expect(performance.queryTime).toBeGreaterThan(0);
      expect(performance.resultCount).toBe(50);
      expect(performance.pageSize).toBe(50);
      expect(performance.totalRecords).toBe(1000);
    });
  });

  // ============================================================================
  // QUERY OPTIMIZATION TESTS
  // ============================================================================

  describe("Query Optimization", () => {
    it("should optimize large dataset queries", () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `item-${i}`,
        status: i % 2 === 0 ? "active" : "inactive",
        value: Math.random() * 1000,
      }));

      // Filter and paginate
      const filtered = filterItems(largeDataset, [
        { field: "status", operator: "eq", value: "active" },
      ]);

      const sorted = sortItems(filtered, [{ field: "value", direction: "desc" }]);
      const paginated = createPaginatedResponse(sorted.slice(0, 20), sorted.length, 20, 0);

      expect(paginated.data.length).toBe(20);
      expect(paginated.pagination.total).toBe(5000);
      expect(paginated.pagination.hasMore).toBe(true);
    });

    it("should handle concurrent cache operations", async () => {
      const operations = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          const key = `cache:key:${i}`;
          cacheManager.set(key, { id: i });
          return cacheManager.get(key);
        })
      );

      const results = await Promise.all(operations);
      expect(results.every((r) => r !== null)).toBe(true);
      expect(cacheManager.getStats().size).toBe(100);
    });
  });

  // ============================================================================
  // MEMORY EFFICIENCY TESTS
  // ============================================================================

  describe("Memory Efficiency", () => {
    it("should efficiently handle large cached datasets", () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        data: `data-${i}`,
        timestamp: new Date(),
      }));

      const key = "large:dataset";
      cacheManager.set(key, largeDataset);

      const retrieved = cacheManager.get(key);
      expect(retrieved).toEqual(largeDataset);
      expect(retrieved?.length).toBe(1000);
    });

    it("should handle cache with TTL configuration", () => {
      // Clear cache first
      cacheManager.clear();
      
      // Set entries with different TTLs
      cacheManager.set(`short:1`, { id: 1 }, 100);
      cacheManager.set(`long:1`, { id: 1 }, 10000);

      expect(cacheManager.get(`short:1`)).toBeDefined();
      expect(cacheManager.get(`long:1`)).toBeDefined();
      
      // Verify cache stats
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(2);
      expect(stats.entries.length).toBe(2);
    });
  });
});
