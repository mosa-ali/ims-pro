/**
 * ============================================================================
 * Webhook Delivery Analytics Service
 * ============================================================================
 * 
 * Provides analytics and metrics for webhook deliveries:
 * - Success rates and failure rates
 * - Retry patterns and effectiveness
 * - Performance metrics (response times, timeouts)
 * - Event type distribution
 * - Delivery trends over time
 * 
 * ============================================================================
 */

export interface WebhookDeliveryMetrics {
  webhookId: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  retriedDeliveries: number;
  timedOutDeliveries: number;
  successRate: number;
  failureRate: number;
  retryRate: number;
  timeoutRate: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface EventTypeDistribution {
  eventType: string;
  count: number;
  percentage: number;
  successRate: number;
}

export interface RetryPatternAnalysis {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  retrySuccessRate: number;
  averageAttemptsPerDelivery: number;
  maxAttemptsReached: number;
}

export interface DeliveryTrendData {
  timestamp: Date;
  successCount: number;
  failureCount: number;
  retryCount: number;
  timeoutCount: number;
}

/**
 * Calculate delivery metrics for a webhook
 */
export function calculateDeliveryMetrics(deliveries: any[]): WebhookDeliveryMetrics {
  const total = deliveries.length;
  const successful = deliveries.filter(d => d.status === 'success').length;
  const failed = deliveries.filter(d => d.status === 'failed').length;
  const retried = deliveries.filter(d => d.attempt && d.attempt > 1).length;
  const timedOut = deliveries.filter(d => d.status === 'timeout').length;

  const responseTimes = deliveries
    .filter(d => d.responseTime)
    .map(d => d.responseTime)
    .sort((a, b) => a - b);

  const calculatePercentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  };

  return {
    webhookId: deliveries[0]?.webhookId || 'unknown',
    totalDeliveries: total,
    successfulDeliveries: successful,
    failedDeliveries: failed,
    retriedDeliveries: retried,
    timedOutDeliveries: timedOut,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    failureRate: total > 0 ? (failed / total) * 100 : 0,
    retryRate: total > 0 ? (retried / total) * 100 : 0,
    timeoutRate: total > 0 ? (timedOut / total) * 100 : 0,
    averageResponseTime: responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0,
    medianResponseTime: responseTimes.length > 0
      ? responseTimes[Math.floor(responseTimes.length / 2)]
      : 0,
    p95ResponseTime: calculatePercentile(responseTimes, 95),
    p99ResponseTime: calculatePercentile(responseTimes, 99),
  };
}

/**
 * Analyze event type distribution
 */
export function analyzeEventTypeDistribution(deliveries: any[]): EventTypeDistribution[] {
  const eventCounts = new Map<string, { count: number; successful: number }>();

  deliveries.forEach(delivery => {
    const eventType = delivery.eventType || 'unknown';
    const current = eventCounts.get(eventType) || { count: 0, successful: 0 };
    current.count++;
    if (delivery.status === 'success') {
      current.successful++;
    }
    eventCounts.set(eventType, current);
  });

  const total = deliveries.length;

  return Array.from(eventCounts.entries()).map(([eventType, data]) => ({
    eventType,
    count: data.count,
    percentage: (data.count / total) * 100,
    successRate: data.count > 0 ? (data.successful / data.count) * 100 : 0,
  }));
}

/**
 * Analyze retry patterns and effectiveness
 */
export function analyzeRetryPatterns(deliveries: any[]): RetryPatternAnalysis {
  const retriedDeliveries = deliveries.filter(d => d.attempt && d.attempt > 1);
  const successfulRetries = retriedDeliveries.filter(d => d.status === 'success').length;
  const failedRetries = retriedDeliveries.filter(d => d.status === 'failed').length;

  const totalAttempts = deliveries.reduce((sum, d) => sum + (d.attempt || 1), 0);
  const maxAttemptsReached = deliveries.filter(d => d.attempt === 5).length;

  return {
    totalRetries: retriedDeliveries.length,
    successfulRetries,
    failedRetries,
    retrySuccessRate: retriedDeliveries.length > 0 
      ? (successfulRetries / retriedDeliveries.length) * 100 
      : 0,
    averageAttemptsPerDelivery: deliveries.length > 0 
      ? totalAttempts / deliveries.length 
      : 0,
    maxAttemptsReached,
  };
}

/**
 * Generate delivery trends over time
 */
export function generateDeliveryTrends(deliveries: any[], intervalMinutes: number = 60): DeliveryTrendData[] {
  const trends = new Map<number, DeliveryTrendData>();

  deliveries.forEach(delivery => {
    const timestamp = new Date(delivery.timestamp);
    const intervalKey = Math.floor(timestamp.getTime() / (intervalMinutes * 60 * 1000));
    const intervalDate = new Date(intervalKey * intervalMinutes * 60 * 1000);

    const existing = trends.get(intervalKey) || {
      timestamp: intervalDate,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
      timeoutCount: 0,
    };

    if (delivery.status === 'success') existing.successCount++;
    else if (delivery.status === 'failed') existing.failureCount++;
    else if (delivery.status === 'timeout') existing.timeoutCount++;

    if (delivery.attempt && delivery.attempt > 1) existing.retryCount++;

    trends.set(intervalKey, existing);
  });

  return Array.from(trends.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Calculate SLA compliance
 */
export function calculateSLACompliance(deliveries: any[], slaThresholdMs: number = 5000): {
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
} {
  const compliant = deliveries.filter(d => d.responseTime && d.responseTime <= slaThresholdMs).length;
  const nonCompliant = deliveries.filter(d => d.responseTime && d.responseTime > slaThresholdMs).length;

  return {
    compliant,
    nonCompliant,
    complianceRate: (compliant + nonCompliant) > 0 
      ? (compliant / (compliant + nonCompliant)) * 100 
      : 0,
  };
}

/**
 * Identify problematic webhooks
 */
export function identifyProblematicWebhooks(webhookMetrics: WebhookDeliveryMetrics[]): WebhookDeliveryMetrics[] {
  return webhookMetrics.filter(metric => 
    metric.successRate < 80 || 
    metric.timeoutRate > 10 || 
    metric.averageResponseTime > 5000
  );
}

/**
 * Generate health score for webhook
 */
export function calculateWebhookHealthScore(metrics: WebhookDeliveryMetrics): number {
  // Health score from 0-100
  // Based on success rate (50%), timeout rate (25%), response time (25%)
  
  const successScore = Math.min(metrics.successRate, 100);
  const timeoutScore = Math.max(100 - (metrics.timeoutRate * 10), 0);
  const responseTimeScore = Math.max(100 - (metrics.averageResponseTime / 100), 0);

  return (successScore * 0.5) + (timeoutScore * 0.25) + (responseTimeScore * 0.25);
}

/**
 * Format metrics for display
 */
export function formatMetricsForDisplay(metrics: WebhookDeliveryMetrics): object {
  return {
    totalDeliveries: metrics.totalDeliveries,
    successRate: `${metrics.successRate.toFixed(2)}%`,
    failureRate: `${metrics.failureRate.toFixed(2)}%`,
    retryRate: `${metrics.retryRate.toFixed(2)}%`,
    timeoutRate: `${metrics.timeoutRate.toFixed(2)}%`,
    averageResponseTime: `${metrics.averageResponseTime.toFixed(0)}ms`,
    medianResponseTime: `${metrics.medianResponseTime.toFixed(0)}ms`,
    p95ResponseTime: `${metrics.p95ResponseTime.toFixed(0)}ms`,
    p99ResponseTime: `${metrics.p99ResponseTime.toFixed(0)}ms`,
  };
}

/**
 * Generate analytics report
 */
export function generateAnalyticsReport(deliveries: any[]): object {
  const metrics = calculateDeliveryMetrics(deliveries);
  const eventDistribution = analyzeEventTypeDistribution(deliveries);
  const retryAnalysis = analyzeRetryPatterns(deliveries);
  const slaCompliance = calculateSLACompliance(deliveries);
  const healthScore = calculateWebhookHealthScore(metrics);

  return {
    timestamp: new Date().toISOString(),
    metrics: formatMetricsForDisplay(metrics),
    eventDistribution,
    retryAnalysis,
    slaCompliance,
    healthScore: healthScore.toFixed(2),
    status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'unhealthy',
  };
}
