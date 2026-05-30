// =============================================================================
// DASHBOARD UTILITY HELPERS
// Formatting, calculations, and shared logic
// =============================================================================

import { SEVERITY_CONFIG, HEALTH_STATUS_CONFIG } from "./constants";

/**
 * Format currency with proper localization
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompactNumber(num: number, locale: string = "en-US"): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString(locale);
}

/**
 * Format percentage with proper display
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format date for display - uses UTC to prevent hydration mismatches
 */
export function formatDate(
  dateString: string,
  locale: string = "en-US",
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateString);
  // Use UTC methods to prevent server/client timezone differences
  return date.toLocaleDateString(locale, { 
    timeZone: "UTC",
    ...(options || {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  });
}

/**
 * Format relative time (e.g., "2 hours ago") - uses UTC to prevent hydration mismatches
 */
export function formatRelativeTime(dateString: string, locale: string = "en-US"): string {
  const date = new Date(dateString);
  const now = new Date();
  // Use UTC timestamps for consistent server/client calculation
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return locale === "ar-SA" ? "الآن" : "Just now";
  if (diffMins < 60) return locale === "ar-SA" ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return locale === "ar-SA" ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays < 7) return locale === "ar-SA" ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  
  return formatDate(dateString, locale, { timeZone: "UTC", month: "short", day: "numeric" });
}

/**
 * Calculate days until deadline - uses UTC midnight to prevent hydration mismatches
 */
export function getDaysUntilDeadline(dateString: string): number {
  const deadline = new Date(dateString);
  const now = new Date();
  // Compare UTC dates at midnight to avoid timezone issues
  const deadlineUTC = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((deadlineUTC - nowUTC) / (1000 * 60 * 60 * 24));
}

/**
 * Get deadline urgency level based on days remaining
 */
export function getDeadlineUrgency(dateString: string): "overdue" | "urgent" | "soon" | "normal" {
  const days = getDaysUntilDeadline(dateString);
  if (days < 0) return "overdue";
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "normal";
}

/**
 * Get color classes for severity badges
 */
export function getSeverityClasses(severity: keyof typeof SEVERITY_CONFIG): string {
  return SEVERITY_CONFIG[severity]?.color || SEVERITY_CONFIG.low.color;
}

/**
 * Get color classes for health status
 */
export function getHealthStatusClasses(status: keyof typeof HEALTH_STATUS_CONFIG): {
  color: string;
  bgColor: string;
} {
  return HEALTH_STATUS_CONFIG[status] || HEALTH_STATUS_CONFIG.good;
}

/**
 * Calculate overall operational health score from dimensions
 */
export function calculateOverallHealthScore(dimensions: Array<{ score: number }>): number {
  if (!dimensions.length) return 0;
  const total = dimensions.reduce((sum, d) => sum + d.score, 0);
  return Math.round(total / dimensions.length);
}

/**
 * Get health status from score
 */
export function getHealthStatusFromScore(score: number): "good" | "warning" | "critical" {
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "critical";
}

/**
 * Group alerts by severity for sorted display
 */
export function sortAlertsBySeverity<T extends { severity: string }>(alerts: T[]): T[] {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...alerts].sort((a, b) => {
    const orderA = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
    const orderB = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;
    return orderA - orderB;
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Generate unique key for list items
 */
export function generateListKey(prefix: string, id: string | number, index?: number): string {
  return index !== undefined ? `${prefix}-${id}-${index}` : `${prefix}-${id}`;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * Safe navigation helper (used for module route generation)
 */
export function buildModuleRoute(baseRoute: string, subPath?: string): string {
  if (!subPath) return baseRoute;
  return `${baseRoute}/${subPath}`.replace(/\/+/g, "/");
}

/**
 * Get trend indicator data
 */
export function getTrendIndicator(trend?: "up" | "down" | "stable"): {
  icon: "TrendingUp" | "TrendingDown" | "Minus";
  color: string;
} {
  switch (trend) {
    case "up":
      return { icon: "TrendingUp", color: "text-green-600" };
    case "down":
      return { icon: "TrendingDown", color: "text-red-600" };
    default:
      return { icon: "Minus", color: "text-muted-foreground" };
  }
}

/**
 * Format workflow count label based on count
 */
export function formatWorkflowLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
