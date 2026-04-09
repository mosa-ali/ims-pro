/**
 * Cache Manager for Fleet Management
 * Implements caching strategies for frequently accessed data
 * Supports TTL-based expiration and cache invalidation
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number; // Default: 5 minutes
  key: string;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval to remove expired entries
    this.startCleanupInterval();
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache by pattern (e.g., "vehicle:*")
   */
  invalidateByPattern(pattern: string): void {
    const regex = new RegExp(pattern.replace("*", ".*"));
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ key: string; ttl: number; age: number }>;
  } {
    const entries: Array<{ key: string; ttl: number; age: number }> = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        ttl: entry.ttl,
        age: now - entry.timestamp,
      });
    }

    return {
      size: this.cache.size,
      entries,
    };
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.cache.delete(key));
    }, 60 * 1000); // Run cleanup every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// ============================================================================
// CACHE KEY GENERATORS
// ============================================================================

export const cacheKeys = {
  // Vehicle cache keys
  vehicleDetail: (vehicleId: string, orgId: string) => `vehicle:detail:${orgId}:${vehicleId}`,
  vehicleStatistics: (vehicleId: string, orgId: string) => `vehicle:stats:${orgId}:${vehicleId}`,
  vehicleList: (orgId: string, ouId: string) => `vehicle:list:${orgId}:${ouId}`,
  vehicleAuditTrail: (vehicleId: string, orgId: string) => `vehicle:audit:${orgId}:${vehicleId}`,

  // Driver cache keys
  driverDetail: (driverId: string, orgId: string) => `driver:detail:${orgId}:${driverId}`,
  driverPerformance: (driverId: string, orgId: string) => `driver:perf:${orgId}:${driverId}`,
  driverList: (orgId: string, ouId: string) => `driver:list:${orgId}:${ouId}`,
  driverAssignmentHistory: (driverId: string, orgId: string) => `driver:assign:${orgId}:${driverId}`,

  // Trip cache keys
  tripDetail: (tripId: string, orgId: string) => `trip:detail:${orgId}:${tripId}`,
  tripList: (orgId: string, ouId: string) => `trip:list:${orgId}:${ouId}`,

  // Fuel cache keys
  fuelTrends: (vehicleId: string, orgId: string) => `fuel:trends:${orgId}:${vehicleId}`,
  fuelEfficiency: (vehicleId: string, orgId: string) => `fuel:eff:${orgId}:${vehicleId}`,
  fuelAnomalies: (vehicleId: string, orgId: string) => `fuel:anomaly:${orgId}:${vehicleId}`,

  // Maintenance cache keys
  maintenancePredictions: (vehicleId: string, orgId: string) => `maint:pred:${orgId}:${vehicleId}`,
  maintenanceSchedule: (vehicleId: string, orgId: string) => `maint:sched:${orgId}:${vehicleId}`,
  maintenanceHistory: (vehicleId: string, orgId: string) => `maint:hist:${orgId}:${vehicleId}`,

  // Dashboard cache keys
  fleetOverview: (orgId: string, ouId: string) => `fleet:overview:${orgId}:${ouId}`,
  fleetStatusDistribution: (orgId: string, ouId: string) => `fleet:status:${orgId}:${ouId}`,
  fleetPerformance: (orgId: string, ouId: string) => `fleet:perf:${orgId}:${ouId}`,

  // KPI cache keys
  operationalKPIs: (orgId: string, ouId: string) => `kpi:ops:${orgId}:${ouId}`,
  financialKPIs: (orgId: string, ouId: string) => `kpi:fin:${orgId}:${ouId}`,
  safetyKPIs: (orgId: string, ouId: string) => `kpi:safety:${orgId}:${ouId}`,
  efficiencyKPIs: (orgId: string, ouId: string) => `kpi:eff:${orgId}:${ouId}`,

  // Compliance cache keys
  complianceStatus: (orgId: string, ouId: string) => `compliance:status:${orgId}:${ouId}`,
  complianceDocuments: (vehicleId: string, orgId: string) => `compliance:docs:${orgId}:${vehicleId}`,

  // ERP cache keys
  vendorList: (orgId: string) => `erp:vendor:list:${orgId}`,
  procurementMetrics: (orgId: string) => `erp:proc:metrics:${orgId}`,
  financialMetrics: (orgId: string) => `erp:fin:metrics:${orgId}`,
};

// ============================================================================
// CACHE INVALIDATION HELPERS
// ============================================================================

export const cacheInvalidation = {
  /**
   * Invalidate all vehicle-related caches
   */
  invalidateVehicle: (vehicleId: string, orgId: string) => {
    cacheManager.delete(cacheKeys.vehicleDetail(vehicleId, orgId));
    cacheManager.delete(cacheKeys.vehicleStatistics(vehicleId, orgId));
    cacheManager.delete(cacheKeys.vehicleAuditTrail(vehicleId, orgId));
    cacheManager.invalidateByPattern(`vehicle:list:${orgId}:.*`);
  },

  /**
   * Invalidate all driver-related caches
   */
  invalidateDriver: (driverId: string, orgId: string) => {
    cacheManager.delete(cacheKeys.driverDetail(driverId, orgId));
    cacheManager.delete(cacheKeys.driverPerformance(driverId, orgId));
    cacheManager.delete(cacheKeys.driverAssignmentHistory(driverId, orgId));
    cacheManager.invalidateByPattern(`driver:list:${orgId}:.*`);
  },

  /**
   * Invalidate all trip-related caches
   */
  invalidateTrip: (tripId: string, orgId: string) => {
    cacheManager.delete(cacheKeys.tripDetail(tripId, orgId));
    cacheManager.invalidateByPattern(`trip:list:${orgId}:.*`);
  },

  /**
   * Invalidate all fuel-related caches
   */
  invalidateFuel: (vehicleId: string, orgId: string) => {
    cacheManager.delete(cacheKeys.fuelTrends(vehicleId, orgId));
    cacheManager.delete(cacheKeys.fuelEfficiency(vehicleId, orgId));
    cacheManager.delete(cacheKeys.fuelAnomalies(vehicleId, orgId));
  },

  /**
   * Invalidate all maintenance-related caches
   */
  invalidateMaintenance: (vehicleId: string, orgId: string) => {
    cacheManager.delete(cacheKeys.maintenancePredictions(vehicleId, orgId));
    cacheManager.delete(cacheKeys.maintenanceSchedule(vehicleId, orgId));
    cacheManager.delete(cacheKeys.maintenanceHistory(vehicleId, orgId));
  },

  /**
   * Invalidate all dashboard caches
   */
  invalidateDashboard: (orgId: string, ouId: string) => {
    cacheManager.delete(cacheKeys.fleetOverview(orgId, ouId));
    cacheManager.delete(cacheKeys.fleetStatusDistribution(orgId, ouId));
    cacheManager.delete(cacheKeys.fleetPerformance(orgId, ouId));
  },

  /**
   * Invalidate all KPI caches
   */
  invalidateKPIs: (orgId: string, ouId: string) => {
    cacheManager.delete(cacheKeys.operationalKPIs(orgId, ouId));
    cacheManager.delete(cacheKeys.financialKPIs(orgId, ouId));
    cacheManager.delete(cacheKeys.safetyKPIs(orgId, ouId));
    cacheManager.delete(cacheKeys.efficiencyKPIs(orgId, ouId));
  },

  /**
   * Invalidate all organization caches
   */
  invalidateOrganization: (orgId: string) => {
    cacheManager.invalidateByPattern(`.*:${orgId}:.*`);
  },
};
