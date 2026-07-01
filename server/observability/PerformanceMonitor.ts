/**
 * server/observability/PerformanceMonitor.ts
 * 
 * Enterprise Performance Monitoring & Observability
 * Tracks query performance, API latency, database metrics, and system health.
 * Provides real-time monitoring and alerting for enterprise operations.
 */

import type { DB } from '../db/_scope';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PerformanceMetric {
  name: string;
  duration: number; // milliseconds
  timestamp: Date;
  status: 'success' | 'error' | 'timeout';
  context?: Record<string, unknown>;
}

export interface QueryMetric extends PerformanceMetric {
  query: string;
  rowsAffected?: number;
  organizationId?: number;
}

export interface APIMetric extends PerformanceMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  userId?: string;
}

export interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  metrics: Record<string, unknown>;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'latency' | 'error' | 'resource' | 'threshold';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

// ─── Performance Monitor ───────────────────────────────────────────────────────

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private startTime: Date = new Date();

  // Configuration
  private readonly MAX_METRICS = 10000;
  private readonly LATENCY_THRESHOLD = 1000; // ms
  private readonly ERROR_RATE_THRESHOLD = 0.05; // 5%
  private readonly MEMORY_THRESHOLD = 0.85; // 85%

  private constructor() {
    this.initializeHealthChecks();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record a query metric.
   */
  recordQuery(metric: QueryMetric): void {
    this.metrics.push(metric);
    this.checkThresholds(metric);
    this.pruneMetrics();
  }

  /**
   * Record an API metric.
   */
  recordAPI(metric: APIMetric): void {
    this.metrics.push(metric);
    this.checkThresholds(metric);
    this.pruneMetrics();
  }

  /**
   * Get metrics for a specific time range.
   */
  getMetrics(
    startTime: Date,
    endTime: Date,
    filter?: { name?: string; status?: string }
  ): PerformanceMetric[] {
    return this.metrics.filter((m) => {
      const inRange = m.timestamp >= startTime && m.timestamp <= endTime;
      const matchesName = !filter?.name || m.name.includes(filter.name);
      const matchesStatus = !filter?.status || m.status === filter.status;
      return inRange && matchesName && matchesStatus;
    });
  }

  /**
   * Get system metrics.
   */
  getSystemMetrics(): SystemMetrics {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();
    
    const recentMetrics = this.getMetrics(
      new Date(now.getTime() - 60000), // Last 60 seconds
      now
    );

    const errorCount = recentMetrics.filter((m) => m.status === 'error').length;
    const errorRate = recentMetrics.length > 0 ? errorCount / recentMetrics.length : 0;
    const avgLatency = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    return {
      uptime,
      memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
      cpuUsage: process.cpuUsage().user / 1e6, // Convert to seconds
      activeConnections: recentMetrics.length,
      requestsPerSecond: recentMetrics.length / 60,
      averageLatency: avgLatency,
      errorRate,
    };
  }

  /**
   * Get performance alerts.
   */
  getAlerts(
    resolved?: boolean,
    severity?: 'info' | 'warning' | 'critical'
  ): PerformanceAlert[] {
    return this.alerts.filter((a) => {
      const matchesResolved = resolved === undefined || a.resolved === resolved;
      const matchesSeverity = !severity || a.severity === severity;
      return matchesResolved && matchesSeverity;
    });
  }

  /**
   * Register a health check.
   */
  registerHealthCheck(component: string, check: HealthCheck): void {
    this.healthChecks.set(component, check);
  }

  /**
   * Get all health checks.
   */
  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get overall system health.
   */
  getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const checks = this.getHealthChecks();
    const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length;
    const degradedCount = checks.filter((c) => c.status === 'degraded').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > checks.length / 2) return 'degraded';
    return 'healthy';
  }

  /**
   * Get performance report.
   */
  getPerformanceReport(hours: number = 24): {
    summary: SystemMetrics;
    topSlowQueries: QueryMetric[];
    topErrors: PerformanceMetric[];
    alerts: PerformanceAlert[];
    healthStatus: string;
  } {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 3600000);
    const metrics = this.getMetrics(startTime, endTime);

    const queryMetrics = metrics.filter((m) => 'query' in m) as QueryMetric[];
    const topSlowQueries = queryMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const errorMetrics = metrics.filter((m) => m.status === 'error');
    const topErrors = errorMetrics.slice(0, 10);

    return {
      summary: this.getSystemMetrics(),
      topSlowQueries,
      topErrors,
      alerts: this.getAlerts(false),
      healthStatus: this.getOverallHealth(),
    };
  }

  /**
   * Create a performance wrapper for async functions.
   */
  async trackAsync<T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.recordQuery({
        name,
        duration,
        timestamp: new Date(),
        status: 'success',
        context,
        query: name,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQuery({
        name,
        duration,
        timestamp: new Date(),
        status: 'error',
        context: { ...context, error: String(error) },
        query: name,
      });
      throw error;
    }
  }

  /**
   * Create a performance wrapper for sync functions.
   */
  track<T>(
    name: string,
    fn: () => T,
    context?: Record<string, unknown>
  ): T {
    const startTime = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      this.recordQuery({
        name,
        duration,
        timestamp: new Date(),
        status: 'success',
        context,
        query: name,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQuery({
        name,
        duration,
        timestamp: new Date(),
        status: 'error',
        context: { ...context, error: String(error) },
        query: name,
      });
      throw error;
    }
  }

  /**
   * Check if metrics exceed thresholds and create alerts.
   */
  private checkThresholds(metric: PerformanceMetric): void {
    if (metric.duration > this.LATENCY_THRESHOLD) {
      this.createAlert({
        type: 'latency',
        severity: metric.duration > this.LATENCY_THRESHOLD * 2 ? 'critical' : 'warning',
        message: `High latency detected: ${metric.name} took ${metric.duration}ms`,
        metric: metric.name,
        value: metric.duration,
        threshold: this.LATENCY_THRESHOLD,
      });
    }

    if (metric.status === 'error') {
      this.createAlert({
        type: 'error',
        severity: 'warning',
        message: `Error in ${metric.name}`,
        metric: metric.name,
        value: 1,
        threshold: 0,
      });
    }
  }

  /**
   * Create a performance alert.
   */
  private createAlert(data: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      resolved: false,
      ...data,
    };
    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  /**
   * Prune old metrics to prevent memory bloat.
   */
  private pruneMetrics(): void {
    if (this.metrics.length > this.MAX_METRICS) {
      // Keep only the most recent metrics
      this.metrics = this.metrics.slice(-this.MAX_METRICS / 2);
    }
  }

  /**
   * Initialize default health checks.
   */
  private initializeHealthChecks(): void {
    this.registerHealthCheck('database', {
      component: 'database',
      status: 'healthy',
      lastChecked: new Date(),
      metrics: { connections: 0, queryTime: 0 },
    });

    this.registerHealthCheck('cache', {
      component: 'cache',
      status: 'healthy',
      lastChecked: new Date(),
      metrics: { hitRate: 0.95, size: 0 },
    });

    this.registerHealthCheck('memory', {
      component: 'memory',
      status: 'healthy',
      lastChecked: new Date(),
      metrics: { usage: 0, available: 0 },
    });
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

export function getPerformanceMonitor(): PerformanceMonitor {
  return PerformanceMonitor.getInstance();
}
