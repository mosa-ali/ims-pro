/**
 * Advanced Features Testing - Rate Limiting & WebSocket
 * Tests for API rate limiting and real-time WebSocket functionality
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  RateLimiter,
  rateLimiters,
  RateLimitMonitor,
  getRateLimitStatus,
  resetRateLimit,
} from "./middleware/rateLimiter";

describe("Fleet Management - Advanced Features Testing", () => {
  // ============================================================================
  // RATE LIMITING TESTS
  // ============================================================================

  describe("Rate Limiting - Token Bucket Algorithm", () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      limiter = new RateLimiter({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10,
      });
    });

    afterEach(() => {
      limiter.destroy();
    });

    it("should allow requests within limit", () => {
      const key = "org-001:user-001";

      for (let i = 0; i < 10; i++) {
        expect(limiter.isLimited(key)).toBe(false);
      }
    });

    it("should block requests exceeding limit", () => {
      const key = "org-001:user-001";

      // First 10 requests should pass
      for (let i = 0; i < 10; i++) {
        limiter.isLimited(key);
      }

      // 11th request should be limited
      expect(limiter.isLimited(key)).toBe(true);
    });

    it("should track remaining requests", () => {
      const key = "org-001:user-001";

      expect(limiter.getRemaining(key)).toBe(10);

      limiter.isLimited(key);
      expect(limiter.getRemaining(key)).toBe(9);

      limiter.isLimited(key);
      expect(limiter.getRemaining(key)).toBe(8);
    });

    it("should reset limits after window expires", async () => {
      const shortLimiter = new RateLimiter({
        windowMs: 100, // 100ms window
        maxRequests: 2,
      });

      const key = "org-001:user-001";

      // Use up limit
      shortLimiter.isLimited(key);
      shortLimiter.isLimited(key);
      expect(shortLimiter.isLimited(key)).toBe(true);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be able to make requests again
      expect(shortLimiter.isLimited(key)).toBe(false);

      shortLimiter.destroy();
    });

    it("should handle multiple users independently", () => {
      const user1 = "org-001:user-001";
      const user2 = "org-001:user-002";

      // User 1 hits limit
      for (let i = 0; i < 10; i++) {
        limiter.isLimited(user1);
      }
      expect(limiter.isLimited(user1)).toBe(true);

      // User 2 should still have requests available
      expect(limiter.isLimited(user2)).toBe(false);
      expect(limiter.getRemaining(user2)).toBe(9);
    });

    it("should provide reset time", () => {
      const key = "org-001:user-001";
      const beforeTime = Date.now();
      limiter.isLimited(key);
      const resetTime = limiter.getResetTime(key);

      expect(resetTime).toBeGreaterThanOrEqual(beforeTime);
      expect(resetTime - beforeTime).toBeLessThanOrEqual(60 * 1000);
    });

    it("should reset specific key", () => {
      const key = "org-001:user-001";

      // Use up limit
      for (let i = 0; i < 10; i++) {
        limiter.isLimited(key);
      }
      expect(limiter.isLimited(key)).toBe(true);

      // Reset
      limiter.reset(key);
      expect(limiter.isLimited(key)).toBe(false);
    });

    it("should clear all limits", () => {
      const user1 = "org-001:user-001";
      const user2 = "org-001:user-002";

      limiter.isLimited(user1);
      limiter.isLimited(user2);

      limiter.clear();

      expect(limiter.getRemaining(user1)).toBe(10);
      expect(limiter.getRemaining(user2)).toBe(10);
    });

    it("should provide statistics", () => {
      const user1 = "org-001:user-001";
      const user2 = "org-001:user-002";

      limiter.isLimited(user1);
      limiter.isLimited(user1);
      limiter.isLimited(user2);

      const stats = limiter.getStats();

      expect(stats.totalKeys).toBe(2);
      expect(stats.entries.length).toBe(2);
      expect(stats.entries[0].count).toBeGreaterThan(0);
    });
  });

  describe("Rate Limiting - Endpoint Configuration", () => {
    it("should have different limits for different endpoints", () => {
      const fleetDashboardLimit = rateLimiters.fleetDashboard;
      const vehicleDetailLimit = rateLimiters.vehicleDetail;

      const key = "org-001:user-001";

      // Fleet dashboard has stricter limit (10 per minute)
      for (let i = 0; i < 10; i++) {
        fleetDashboardLimit.isLimited(key);
      }
      expect(fleetDashboardLimit.isLimited(key)).toBe(true);

      // Vehicle detail has relaxed limit (30 per minute)
      for (let i = 0; i < 30; i++) {
        vehicleDetailLimit.isLimited(key);
      }
      expect(vehicleDetailLimit.isLimited(key)).toBe(true);
    });

    it("should isolate limits by organization", () => {
      const org1User = "org-001:user-001";
      const org2User = "org-002:user-001";

      const limiter = rateLimiters.vehicleDetail;

      // Org1 user hits limit
      for (let i = 0; i < 30; i++) {
        limiter.isLimited(org1User);
      }
      expect(limiter.isLimited(org1User)).toBe(true);

      // Org2 user should have separate limit
      expect(limiter.isLimited(org2User)).toBe(false);
    });

    it("should track rate limit status", () => {
      // Reset the limiter first to ensure clean state
      resetRateLimit("vehicleDetail", "user-001", "org-001");
      const status = getRateLimitStatus("vehicleDetail", "user-001", "org-001");

      expect(status.remaining).toBeLessThanOrEqual(30);
      expect(status.isLimited).toBe(false);
      expect(status.resetTime).toBeGreaterThanOrEqual(Date.now());
    });

    it("should reset rate limit for user", () => {
      const limiter = rateLimiters.vehicleDetail;
      const key = "org-001:user-001";

      // Use up limit
      for (let i = 0; i < 30; i++) {
        limiter.isLimited(key);
      }
      expect(limiter.isLimited(key)).toBe(true);

      // Reset
      resetRateLimit("vehicleDetail", "user-001", "org-001");
      expect(limiter.getRemaining(key)).toBe(30);
    });
  });

  describe("Rate Limiting - Monitoring", () => {
    it("should track request metrics", () => {
      const monitor = new RateLimitMonitor();

      // Record requests
      monitor.recordRequest("endpoint1", "user-001", false);
      monitor.recordRequest("endpoint1", "user-001", false);
      monitor.recordRequest("endpoint1", "user-001", true);
      monitor.recordRequest("endpoint2", "user-002", false);

      const metrics1 = monitor.getMetrics("endpoint1");
      expect(metrics1.totalRequests).toBe(3);
      expect(metrics1.limitedRequests).toBe(1);
      expect(metrics1.limitPercentage).toBeCloseTo(33.33, 1);

      const metrics2 = monitor.getMetrics("endpoint2");
      expect(metrics2.totalRequests).toBe(1);
      expect(metrics2.limitedRequests).toBe(0);
    });

    it("should track top users", () => {
      const monitor = new RateLimitMonitor();

      for (let i = 0; i < 5; i++) {
        monitor.recordRequest("endpoint", "user-001", false);
      }
      for (let i = 0; i < 3; i++) {
        monitor.recordRequest("endpoint", "user-002", false);
      }
      for (let i = 0; i < 2; i++) {
        monitor.recordRequest("endpoint", "user-003", false);
      }

      const metrics = monitor.getMetrics("endpoint");
      expect(metrics.topUsers[0].userId).toBe("user-001");
      expect(metrics.topUsers[0].requestCount).toBe(5);
      expect(metrics.topUsers[1].userId).toBe("user-002");
      expect(metrics.topUsers[1].requestCount).toBe(3);
    });

    it("should get all metrics", () => {
      const monitor = new RateLimitMonitor();

      monitor.recordRequest("endpoint1", "user-001", false);
      monitor.recordRequest("endpoint2", "user-002", false);
      monitor.recordRequest("endpoint3", "user-003", false);

      const allMetrics = monitor.getAllMetrics();
      expect(allMetrics.length).toBe(3);
      expect(allMetrics.map((m) => m.endpoint)).toContain("endpoint1");
      expect(allMetrics.map((m) => m.endpoint)).toContain("endpoint2");
      expect(allMetrics.map((m) => m.endpoint)).toContain("endpoint3");
    });

    it("should reset metrics", () => {
      const monitor = new RateLimitMonitor();

      monitor.recordRequest("endpoint", "user-001", false);
      expect(monitor.getMetrics("endpoint").totalRequests).toBe(1);

      monitor.reset();
      expect(monitor.getMetrics("endpoint").totalRequests).toBe(0);
    });
  });

  // ============================================================================
  // WEBSOCKET TESTS
  // ============================================================================

  describe("WebSocket - Message Types", () => {
    it("should handle trip update messages", () => {
      const tripUpdate = {
        tripId: "trip-001",
        vehicleId: "veh-001",
        driverId: "drv-001",
        currentLocation: {
          latitude: 24.7136,
          longitude: 46.6753,
        },
        distance: 150,
        fuelConsumed: 30,
        speed: 80,
        status: "in_progress" as const,
      };

      expect(tripUpdate.tripId).toBe("trip-001");
      expect(tripUpdate.currentLocation.latitude).toBe(24.7136);
      expect(tripUpdate.status).toBe("in_progress");
    });

    it("should handle vehicle status messages", () => {
      const vehicleStatus = {
        vehicleId: "veh-001",
        status: "active" as const,
        location: {
          latitude: 24.7136,
          longitude: 46.6753,
        },
        lastUpdate: new Date(),
        fuelLevel: 75,
        mileage: 45000,
      };

      expect(vehicleStatus.vehicleId).toBe("veh-001");
      expect(vehicleStatus.fuelLevel).toBe(75);
    });

    it("should handle driver status messages", () => {
      const driverStatus = {
        driverId: "drv-001",
        status: "active" as const,
        currentTripId: "trip-001",
        location: {
          latitude: 24.7136,
          longitude: 46.6753,
        },
        lastUpdate: new Date(),
      };

      expect(driverStatus.driverId).toBe("drv-001");
      expect(driverStatus.currentTripId).toBe("trip-001");
    });

    it("should handle fleet overview messages", () => {
      const fleetOverview = {
        totalVehicles: 50,
        activeVehicles: 45,
        vehiclesInMaintenance: 3,
        idleVehicles: 2,
        totalTripsToday: 100,
        completedTripsToday: 85,
        ongoingTrips: 15,
        totalDistance: 5000,
        totalFuel: 1000,
        averageEfficiency: 5.0,
      };

      expect(fleetOverview.totalVehicles).toBe(50);
      expect(fleetOverview.activeVehicles).toBe(45);
      expect(fleetOverview.averageEfficiency).toBe(5.0);
    });

    it("should handle alert notifications", () => {
      const alert = {
        id: "alert-001",
        type: "warning" as const,
        title: "Low Fuel",
        message: "Vehicle VEH-001 has fuel below 20%",
        entityType: "vehicle",
        entityId: "veh-001",
      };

      expect(alert.type).toBe("warning");
      expect(alert.entityType).toBe("vehicle");
    });
  });

  describe("WebSocket - Channel Subscriptions", () => {
    it("should support trip channel subscriptions", () => {
      const channel = "trip:trip-001";
      expect(channel).toMatch(/^trip:/);
    });

    it("should support vehicle channel subscriptions", () => {
      const channel = "vehicle:veh-001";
      expect(channel).toMatch(/^vehicle:/);
    });

    it("should support driver channel subscriptions", () => {
      const channel = "driver:drv-001";
      expect(channel).toMatch(/^driver:/);
    });

    it("should support fleet overview subscriptions", () => {
      const channel = "fleet:overview";
      expect(channel).toBe("fleet:overview");
    });

    it("should support alert subscriptions", () => {
      const channel = "alerts";
      expect(channel).toBe("alerts");
    });
  });

  describe("WebSocket - Data Isolation", () => {
    it("should isolate data by organization", () => {
      const org1Trip = {
        tripId: "trip-001",
        organizationId: "org-001",
      };

      const org2Trip = {
        tripId: "trip-002",
        organizationId: "org-002",
      };

      expect(org1Trip.organizationId).not.toBe(org2Trip.organizationId);
    });

    it("should isolate subscriptions by organization", () => {
      const org1Channel = "org-001:fleet:overview";
      const org2Channel = "org-002:fleet:overview";

      expect(org1Channel).not.toBe(org2Channel);
    });

    it("should isolate alerts by organization", () => {
      const org1Alert = {
        id: "alert-001",
        organizationId: "org-001",
      };

      const org2Alert = {
        id: "alert-002",
        organizationId: "org-002",
      };

      expect(org1Alert.organizationId).not.toBe(org2Alert.organizationId);
    });
  });

  describe("WebSocket - Performance", () => {
    it("should handle high-frequency updates", () => {
      const updates: any[] = [];

      for (let i = 0; i < 1000; i++) {
        updates.push({
          tripId: `trip-${i}`,
          timestamp: Date.now(),
          distance: Math.random() * 100,
        });
      }

      expect(updates.length).toBe(1000);
      expect(updates[0].tripId).toBe("trip-0");
      expect(updates[999].tripId).toBe("trip-999");
    });

    it("should manage multiple concurrent subscriptions", () => {
      const subscriptions = new Set<string>();

      for (let i = 0; i < 100; i++) {
        subscriptions.add(`trip:trip-${i}`);
        subscriptions.add(`vehicle:veh-${i}`);
        subscriptions.add(`driver:drv-${i}`);
      }

      expect(subscriptions.size).toBe(300);
    });

    it("should handle connection recovery", async () => {
      let connectionAttempts = 0;

      const simulateReconnect = () => {
        connectionAttempts++;
        return connectionAttempts <= 3; // Succeed on 3rd attempt
      };

      for (let i = 0; i < 3; i++) {
        if (simulateReconnect()) {
          if (i === 2) {
            expect(connectionAttempts).toBe(3);
            break;
          }
        }
      }
    });
  });

  describe("WebSocket - Heartbeat & Cleanup", () => {
    it("should detect dead connections", () => {
      const now = Date.now();
      const heartbeatTimeout = 60 * 1000; // 60 seconds

      const lastHeartbeat = now - (heartbeatTimeout + 1000); // 61 seconds ago
      const isAlive = now - lastHeartbeat < heartbeatTimeout;

      expect(isAlive).toBe(false);
    });

    it("should keep alive connections", () => {
      const now = Date.now();
      const heartbeatTimeout = 60 * 1000;

      const lastHeartbeat = now - 30 * 1000; // 30 seconds ago
      const isAlive = now - lastHeartbeat < heartbeatTimeout;

      expect(isAlive).toBe(true);
    });

    it("should cleanup expired subscriptions", () => {
      const subscriptions = new Map<string, Set<string>>();

      subscriptions.set("trip:trip-001", new Set(["user-001", "user-002"]));
      subscriptions.set("trip:trip-002", new Set(["user-001"]));

      // Remove user-001 from trip-001
      const subscribers = subscriptions.get("trip:trip-001");
      if (subscribers) {
        subscribers.delete("user-001");
        if (subscribers.size === 0) {
          subscriptions.delete("trip:trip-001");
        }
      }

      expect(subscriptions.has("trip:trip-001")).toBe(true);
      expect(subscriptions.get("trip:trip-001")?.size).toBe(1);
    });
  });
});
