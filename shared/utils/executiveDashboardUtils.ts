// =============================================================================
// EXECUTIVE DASHBOARD UTILITY FUNCTIONS
// Data formatting, calculations, and transformations
// =============================================================================

import { POWER_BI_COLORS } from "../constants/executiveDashboard";

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Determine trend direction based on percentage change
 */
export function determineTrend(percentageChange: number): "up" | "down" | "stable" {
  if (percentageChange > 5) return "up";
  if (percentageChange < -5) return "down";
  return "stable";
}

/**
 * Format large numbers with K/M/B notation
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format currency with proper localization
 */
export function formatCurrencyCompact(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
  return formatted;
}

/**
 * Calculate utilization percentage
 */
export function calculateUtilization(spent: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((spent / total) * 100);
}

/**
 * Generate sparkline data points from array of numbers
 */
export function generateSparklineData(values: number[]): number[] {
  if (values.length === 0) return [];
  
  // Normalize values to 0-100 range for visualization
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  return values.map(v => ((v - min) / range) * 100);
}

/**
 * Get color for a value based on percentage
 */
export function getColorForPercentage(percentage: number): string {
  if (percentage >= 80) return POWER_BI_COLORS.success;
  if (percentage >= 60) return POWER_BI_COLORS.warning;
  return POWER_BI_COLORS.danger;
}

/**
 * Calculate funnel conversion rates
 */
export function calculateFunnelConversion(
  stages: Array<{ count: number }>
): Array<{ count: number; percentage: number }> {
  if (stages.length === 0) return [];
  
  const firstStageCount = stages[0].count || 1;
  
  return stages.map(stage => ({
    count: stage.count,
    percentage: Math.round((stage.count / firstStageCount) * 100),
  }));
}

/**
 * Group data by category
 */
export function groupByCategory<T extends Record<string, any>>(
  data: T[],
  categoryKey: keyof T
): Record<string, T[]> {
  return data.reduce((acc, item) => {
    const category = String(item[categoryKey]);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Sum values in an array of objects
 */
export function sumByKey<T extends Record<string, any>>(
  data: T[],
  key: keyof T
): number {
  return data.reduce((sum, item) => {
    const value = item[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}

/**
 * Calculate average of values in an array of objects
 */
export function averageByKey<T extends Record<string, any>>(
  data: T[],
  key: keyof T
): number {
  if (data.length === 0) return 0;
  return sumByKey(data, key) / data.length;
}

/**
 * Sort array of objects by numeric key
 */
export function sortByNumericKey<T extends Record<string, any>>(
  data: T[],
  key: keyof T,
  order: "asc" | "desc" = "desc"
): T[] {
  return [...data].sort((a, b) => {
    const aVal = typeof a[key] === "number" ? a[key] : 0;
    const bVal = typeof b[key] === "number" ? b[key] : 0;
    return order === "desc" ? bVal - aVal : aVal - bVal;
  });
}

/**
 * Get top N items from array
 */
export function getTopN<T>(data: T[], n: number): T[] {
  return data.slice(0, Math.min(n, data.length));
}

/**
 * Calculate percentage distribution
 */
export function calculateDistribution(
  values: number[]
): Array<{ value: number; percentage: number }> {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return values.map(v => ({ value: v, percentage: 0 }));
  
  return values.map(value => ({
    value,
    percentage: Math.round((value / total) * 100),
  }));
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: Date, endDate: Date, locale: string = "en-US"): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });
  
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

/**
 * Get month name
 */
export function getMonthName(monthIndex: number, locale: string = "en-US"): string {
  const date = new Date(2024, monthIndex, 1);
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
}

/**
 * Generate month labels for last N months
 */
export function getLastNMonthLabels(n: number, locale: string = "en-US"): string[] {
  const labels: string[] = [];
  const today = new Date();
  
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    labels.push(getMonthName(date.getMonth(), locale));
  }
  
  return labels;
}

/**
 * Calculate risk matrix cell color
 */
export function getRiskColor(likelihood: string, impact: string): string {
  const high = ["high"];
  const medium = ["medium"];
  
  if (high.includes(likelihood.toLowerCase()) || high.includes(impact.toLowerCase())) {
    return POWER_BI_COLORS.risk.high;
  }
  if (medium.includes(likelihood.toLowerCase()) && medium.includes(impact.toLowerCase())) {
    return POWER_BI_COLORS.risk.medium;
  }
  return POWER_BI_COLORS.risk.low;
}

/**
 * Generate color palette for N items
 */
export function generateColorPalette(count: number): string[] {
  const palette = [
    POWER_BI_COLORS.primary,
    POWER_BI_COLORS.secondary,
    POWER_BI_COLORS.success,
    POWER_BI_COLORS.warning,
    POWER_BI_COLORS.danger,
    "#8661C5",
    "#F7630C",
    "#A4373A",
    "#00B7C3",
    "#004B50",
  ];
  
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  
  return colors;
}

/**
 * Assign colors to items based on category
 */
export function assignCategoryColors(
  items: Array<{ label: string }>,
  categoryColorMap?: Record<string, string>
): Array<{ label: string; color: string }> {
  const defaultColors = generateColorPalette(items.length);
  
  return items.map((item, index) => ({
    ...item,
    color: categoryColorMap?.[item.label] || defaultColors[index],
  }));
}

/**
 * Round number to specified decimal places
 */
export function roundToDecimals(num: number, decimals: number = 0): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Format number as percentage
 */
export function formatAsPercentage(value: number, decimals: number = 0): string {
  return `${roundToDecimals(value, decimals)}%`;
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(values: number[], windowSize: number): number[] {
  if (values.length < windowSize) return values;
  
  const result: number[] = [];
  
  for (let i = 0; i <= values.length - windowSize; i++) {
    const window = values.slice(i, i + windowSize);
    const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
    result.push(average);
  }
  
  return result;
}

/**
 * Detect data anomalies (values significantly different from average)
 */
export function detectAnomalies(
  values: number[],
  threshold: number = 2 // Standard deviations
): number[] {
  if (values.length < 2) return [];
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return values
    .map((val, idx) => ({ val, idx }))
    .filter(({ val }) => Math.abs(val - mean) > threshold * stdDev)
    .map(({ idx }) => idx);
}

/**
 * Format time duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Calculate days remaining until date
 */
export function daysUntil(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get urgency level based on days remaining
 */
export function getUrgencyLevel(daysRemaining: number): "critical" | "high" | "medium" | "low" {
  if (daysRemaining <= 0) return "critical";
  if (daysRemaining <= 7) return "high";
  if (daysRemaining <= 30) return "medium";
  return "low";
}

/**
 * Paginate array
 */
export function paginate<T>(
  items: T[],
  pageNumber: number,
  pageSize: number
): { items: T[]; totalPages: number; currentPage: number } {
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: items.slice(startIndex, endIndex),
    totalPages,
    currentPage: pageNumber,
  };
}
