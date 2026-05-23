/**
 * Report Analytics Utilities
 * 
 * Helper functions for computing analytics, formatting data for charts,
 * and generating insights for the Auto Programs Report.
 */

/**
 * Compute percentage safely (avoids division by zero)
 */
export function safePercent(numerator: number, denominator: number, decimals: number = 0): number {
  if (denominator === 0) return 0;
  const result = (numerator / denominator) * 100;
  return Number(result.toFixed(decimals));
}

/**
 * Format a number to compact notation (e.g., 1.2M, 45K)
 */
export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

/**
 * Generate month labels for a date range
 */
export function generateMonthLabels(fromDate: string, toDate: string): string[] {
  const labels: string[] = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);

  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    labels.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }

  return labels;
}

/**
 * Calculate variance between budget and actual
 */
export function calculateVariance(budget: number, actual: number): {
  amount: number;
  percent: number;
  status: 'under' | 'over' | 'aligned';
} {
  const amount = budget - actual;
  const percent = budget > 0 ? safePercent(Math.abs(amount), budget, 1) : 0;

  let status: 'under' | 'over' | 'aligned';
  if (percent <= 5) {
    status = 'aligned';
  } else if (actual > budget) {
    status = 'over';
  } else {
    status = 'under';
  }

  return { amount, percent, status };
}

/**
 * Determine trend direction from a series of values
 */
export function detectTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';

  const recent = values.slice(-3);
  const earlier = values.slice(-6, -3);

  if (earlier.length === 0) return 'stable';

  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const earlierAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;

  const change = earlierAvg > 0 ? (recentAvg - earlierAvg) / earlierAvg : 0;

  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

/**
 * Group items by a key and count occurrences
 */
export function groupAndCount<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date range overlaps with another
 */
export function dateRangesOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  return start1 <= end2 && end1 >= start2;
}
