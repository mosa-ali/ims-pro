/**
 * Rate Limiting Middleware for Fleet Management APIs
 * Implements token bucket algorithm with configurable limits per endpoint
 */

import { TRPCError } from "@trpc/server";

// ============================================================================
// RATE LIMITER CONFIGURATION
// ============================================================================

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

export interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

export class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    // Start cleanup interval to remove expired entries
    this.startCleanup();
  }

  /**
   * Check if request is within rate limit
   */
  isLimited(key: string): boolean {
    const now = Date.now();
    const entry = this.store[key];

    // If no entry exists or window has expired, allow request
    if (!entry || now > entry.resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      return false;
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    return entry.count > this.config.maxRequests;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || now > entry.resetTime) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - entry.count);
  }

  /**
   * Get reset time for a key
   */
  getResetTime(key: string): number {
    const entry = this.store[key];
    return entry ? entry.resetTime : Date.now();
  }

  /**
   * Reset limit for a key
   */
  reset(key: string): void {
    delete this.store[key];
  }

  /**
   * Clear all limits
   */
  clear(): void {
    this.store = {};
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalKeys: number;
    entries: Array<{ key: string; count: number; resetTime: number }>;
  } {
    return {
      totalKeys: Object.keys(this.store).length,
      entries: Object.entries(this.store).map(([key, value]) => ({
        key,
        ...value,
      })),
    };
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of Object.entries(this.store)) {
        if (now > entry.resetTime) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => delete this.store[key]);
    }, this.config.windowMs);

    // Don't keep process alive just for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================================================
// ENDPOINT-SPECIFIC RATE LIMITERS
// ============================================================================

export const rateLimiters = {
  // High-volume endpoints - stricter limits
  fleetDashboard: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  }),

  kpiReports: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  }),

  // Medium-volume endpoints
  vehicleDetail: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  }),

  driverDetail: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  }),

  tripDetail: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  }),

  // Low-volume endpoints - relaxed limits
  fuelAnalytics: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  }),

  maintenanceData: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  }),

  complianceData: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  }),

  // Mutation endpoints - moderate limits
  syncVendors: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 2, // 2 syncs per 5 minutes
  }),

  generateAutoNumber: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 generations per minute
  }),

  // List endpoints - pagination helps with limits
  vehicleList: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
  }),

  driverList: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
  }),

  tripList: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
  }),
};

// ============================================================================
// RATE LIMIT MIDDLEWARE FACTORY
// ============================================================================

export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (opts: { ctx: any; next: any }) => {
    const { ctx, next } = opts;

    // Generate rate limit key based on user and endpoint
    const userId = ctx.user?.id || "anonymous";
    const organizationId = ctx.scope?.organizationId || "unknown";
    const key = `${organizationId}:${userId}`;

    // Check if rate limited
    if (limiter.isLimited(key)) {
      const resetTime = limiter.getResetTime(key);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      });
    }

    // Add rate limit info to response headers (if available)
    const remaining = limiter.getRemaining(key);
    if (ctx.res) {
      ctx.res.setHeader("X-RateLimit-Remaining", remaining.toString());
      ctx.res.setHeader("X-RateLimit-Reset", limiter.getResetTime(key).toString());
    }

    return next();
  };
}

// ============================================================================
// RATE LIMIT MONITORING
// ============================================================================

export interface RateLimitMetrics {
  endpoint: string;
  totalRequests: number;
  limitedRequests: number;
  limitPercentage: number;
  topUsers: Array<{
    userId: string;
    requestCount: number;
  }>;
}

export class RateLimitMonitor {
  private metrics: Map<string, { total: number; limited: number }> = new Map();
  private userMetrics: Map<string, number> = new Map();

  /**
   * Record a request
   */
  recordRequest(endpoint: string, key: string, isLimited: boolean): void {
    // Update endpoint metrics
    const current = this.metrics.get(endpoint) || { total: 0, limited: 0 };
    current.total++;
    if (isLimited) {
      current.limited++;
    }
    this.metrics.set(endpoint, current);

    // Update user metrics
    const userCount = this.userMetrics.get(key) || 0;
    this.userMetrics.set(key, userCount + 1);
  }

  /**
   * Get metrics for an endpoint
   */
  getMetrics(endpoint: string): RateLimitMetrics {
    const metrics = this.metrics.get(endpoint) || { total: 0, limited: 0 };
    const topUsers = Array.from(this.userMetrics.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, requestCount]) => ({ userId, requestCount }));

    return {
      endpoint,
      totalRequests: metrics.total,
      limitedRequests: metrics.limited,
      limitPercentage: metrics.total > 0 ? (metrics.limited / metrics.total) * 100 : 0,
      topUsers,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): RateLimitMetrics[] {
    return Array.from(this.metrics.keys()).map((endpoint) => this.getMetrics(endpoint));
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.clear();
    this.userMetrics.clear();
  }
}

export const rateLimitMonitor = new RateLimitMonitor();

// ============================================================================
// ADAPTIVE RATE LIMITING
// ============================================================================

export class AdaptiveRateLimiter {
  private baseLimiter: RateLimiter;
  private monitor: RateLimitMonitor;
  private adjustmentInterval: NodeJS.Timeout | null = null;

  constructor(baseLimiter: RateLimiter, monitor: RateLimitMonitor) {
    this.baseLimiter = baseLimiter;
    this.monitor = monitor;
    this.startAdjustment();
  }

  /**
   * Start automatic adjustment based on metrics
   */
  private startAdjustment(): void {
    this.adjustmentInterval = setInterval(() => {
      const metrics = this.monitor.getAllMetrics();

      // Log high limit percentage endpoints
      metrics.forEach((metric) => {
        if (metric.limitPercentage > 20) {
          console.warn(
            `[RATE LIMIT] ${metric.endpoint}: ${metric.limitPercentage.toFixed(2)}% of requests limited`
          );
        }
      });
    }, 5 * 60 * 1000); // Check every 5 minutes

    if (this.adjustmentInterval.unref) {
      this.adjustmentInterval.unref();
    }
  }

  /**
   * Stop adjustment
   */
  destroy(): void {
    if (this.adjustmentInterval) {
      clearInterval(this.adjustmentInterval);
      this.adjustmentInterval = null;
    }
  }
}

// ============================================================================
// RATE LIMIT UTILITIES
// ============================================================================

/**
 * Get rate limit status for a user
 */
export function getRateLimitStatus(
  endpoint: keyof typeof rateLimiters,
  userId: string,
  organizationId: string
): {
  remaining: number;
  resetTime: number;
  isLimited: boolean;
} {
  const limiter = rateLimiters[endpoint];
  const key = `${organizationId}:${userId}`;

  return {
    remaining: limiter.getRemaining(key),
    resetTime: limiter.getResetTime(key),
    isLimited: limiter.getRemaining(key) === 0,
  };
}

/**
 * Reset rate limit for a user
 */
export function resetRateLimit(
  endpoint: keyof typeof rateLimiters,
  userId: string,
  organizationId: string
): void {
  const limiter = rateLimiters[endpoint];
  const key = `${organizationId}:${userId}`;
  limiter.reset(key);
}

/**
 * Get all rate limit statistics
 */
export function getAllRateLimitStats(): {
  [key: string]: ReturnType<RateLimiter["getStats"]>;
} {
  const stats: { [key: string]: ReturnType<RateLimiter["getStats"]> } = {};

  for (const [name, limiter] of Object.entries(rateLimiters)) {
    stats[name] = limiter.getStats();
  }

  return stats;
}

/**
 * Cleanup all rate limiters
 */
export function cleanupRateLimiters(): void {
  for (const limiter of Object.values(rateLimiters)) {
    limiter.destroy();
  }
}
