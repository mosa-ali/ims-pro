/**
 * server/routers/observabilityRouter.ts
 * 
 * Observability Router
 * Exposes performance monitoring and system health endpoints via tRPC.
 * Provides real-time metrics, alerts, and health status for enterprise operations.
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getPerformanceMonitor } from '../observability/PerformanceMonitor';
import { TRPCError } from '@trpc/server';

// ─── Input Schemas ────────────────────────────────────────────────────────────

const DateRangeSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  hours: z.number().positive().default(24),
});

const MetricsFilterSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['success', 'error', 'timeout']).optional(),
});

// ─── Observability Router ──────────────────────────────────────────────────────

export const observabilityRouter = router({
  /**
   * Get system metrics.
   */
  getSystemMetrics: protectedProcedure.query(async () => {
    try {
      const monitor = getPerformanceMonitor();
      return monitor.getSystemMetrics();
    } catch (error) {
      console.error('[System Metrics Error]', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch system metrics',
      });
    }
  }),

  /**
   * Get performance metrics for a time range.
   */
  getPerformanceMetrics: protectedProcedure
    .input(DateRangeSchema.merge(MetricsFilterSchema))
    .query(async ({ input }) => {
      try {
        const monitor = getPerformanceMonitor();
        const endTime = input.endTime ? new Date(input.endTime) : new Date();
        const startTime = input.startTime
          ? new Date(input.startTime)
          : new Date(endTime.getTime() - input.hours * 3600000);

        return monitor.getMetrics(startTime, endTime, {
          name: input.name,
          status: input.status,
        });
      } catch (error) {
        console.error('[Performance Metrics Error]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch performance metrics',
        });
      }
    }),

  /**
   * Get performance alerts.
   */
  getPerformanceAlerts: protectedProcedure
    .input(
      z.object({
        resolved: z.boolean().optional(),
        severity: z.enum(['info', 'warning', 'critical']).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const monitor = getPerformanceMonitor();
        return monitor.getAlerts(input.resolved, input.severity);
      } catch (error) {
        console.error('[Performance Alerts Error]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch performance alerts',
        });
      }
    }),

  /**
   * Get health checks.
   */
  getHealthChecks: protectedProcedure.query(async () => {
    try {
      const monitor = getPerformanceMonitor();
      return monitor.getHealthChecks();
    } catch (error) {
      console.error('[Health Checks Error]', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch health checks',
      });
    }
  }),

  /**
   * Get overall system health.
   */
  getOverallHealth: protectedProcedure.query(async () => {
    try {
      const monitor = getPerformanceMonitor();
      return {
        status: monitor.getOverallHealth(),
        timestamp: new Date().toISOString(),
        checks: monitor.getHealthChecks(),
      };
    } catch (error) {
      console.error('[Overall Health Error]', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch overall health',
      });
    }
  }),

  /**
   * Get comprehensive performance report.
   */
  getPerformanceReport: protectedProcedure
    .input(
      z.object({
        hours: z.number().positive().default(24),
      })
    )
    .query(async ({ input }) => {
      try {
        const monitor = getPerformanceMonitor();
        return monitor.getPerformanceReport(input.hours);
      } catch (error) {
        console.error('[Performance Report Error]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch performance report',
        });
      }
    }),

  /**
   * Get slow queries.
   */
  getSlowQueries: protectedProcedure
    .input(
      z.object({
        limit: z.number().positive().default(10),
        threshold: z.number().positive().default(1000), // milliseconds
      })
    )
    .query(async ({ input }) => {
      try {
        const monitor = getPerformanceMonitor();
        const report = monitor.getPerformanceReport(24);
        return report.topSlowQueries.slice(0, input.limit);
      } catch (error) {
        console.error('[Slow Queries Error]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch slow queries',
        });
      }
    }),

  /**
   * Get recent errors.
   */
  getRecentErrors: protectedProcedure
    .input(
      z.object({
        limit: z.number().positive().default(20),
        hours: z.number().positive().default(24),
      })
    )
    .query(async ({ input }) => {
      try {
        const monitor = getPerformanceMonitor();
        const report = monitor.getPerformanceReport(input.hours);
        return report.topErrors.slice(0, input.limit);
      } catch (error) {
        console.error('[Recent Errors Error]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch recent errors',
        });
      }
    }),

  /**
   * Get active alerts.
   */
  getActiveAlerts: protectedProcedure.query(async () => {
    try {
      const monitor = getPerformanceMonitor();
      return monitor.getAlerts(false);
    } catch (error) {
      console.error('[Active Alerts Error]', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch active alerts',
      });
    }
  }),

  /**
   * Get critical alerts.
   */
  getCriticalAlerts: protectedProcedure.query(async () => {
    try {
      const monitor = getPerformanceMonitor();
      return monitor.getAlerts(false, 'critical');
    } catch (error) {
      console.error('[Critical Alerts Error]', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch critical alerts',
      });
    }
  }),

  /**
   * Get error rate.
   */
  getErrorRate: protectedProcedure
    .input(
      z.object({
        hours: z.number().positive().default(1),
      })
    )
    .query(async ({ input }) => {
      try {
        const monitor = getPerformanceMonitor();
        const metrics = monitor.getSystemMetrics();
        return {
          errorRate: metrics.errorRate,
          requestsPerSecond: metrics.requestsPerSecond,
          averageLatency: metrics.averageLatency,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('[Error Rate Error]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch error rate',
        });
      }
    }),

  /**
   * Get resource usage.
   */
  getResourceUsage: protectedProcedure.query(async () => {
    try {
      const monitor = getPerformanceMonitor();
      const metrics = monitor.getSystemMetrics();
      return {
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage,
        uptime: metrics.uptime,
        activeConnections: metrics.activeConnections,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Resource Usage Error]', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch resource usage',
      });
    }
  }),
});
