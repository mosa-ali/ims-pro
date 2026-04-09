/**
 * Pagination Helper for Fleet Management
 * Provides utilities for implementing efficient pagination in queries
 * Supports cursor-based and offset-based pagination
 */

import { z } from "zod";

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const PaginationInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const CursorPaginationInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof PaginationInputSchema>;
export type CursorPaginationInput = z.infer<typeof CursorPaginationInputSchema>;

// ============================================================================
// PAGINATION RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    pages: number;
    currentPage: number;
  };
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    cursor?: string;
    hasMore: boolean;
    nextCursor?: string;
  };
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMetadata(
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<any>["pagination"] {
  const pages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const hasMore = offset + limit < total;

  return {
    total,
    limit,
    offset,
    hasMore,
    pages,
    currentPage,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: calculatePaginationMetadata(total, limit, offset),
  };
}

/**
 * Create cursor-based paginated response
 */
export function createCursorPaginatedResponse<T>(
  data: T[],
  limit: number,
  currentCursor?: string,
  hasMore?: boolean
): CursorPaginatedResponse<T> {
  const nextCursor = hasMore && data.length > 0 ? encodeCursor(data[data.length - 1]) : undefined;

  return {
    data,
    pagination: {
      limit,
      cursor: currentCursor,
      hasMore: hasMore || false,
      nextCursor,
    },
  };
}

/**
 * Encode cursor from data item
 */
export function encodeCursor(item: any): string {
  if (!item || !item.id) {
    return "";
  }
  return Buffer.from(item.id).toString("base64");
}

/**
 * Decode cursor to get ID
 */
export function decodeCursor(cursor?: string): string | null {
  if (!cursor) {
    return null;
  }
  try {
    return Buffer.from(cursor, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * Calculate offset from cursor
 */
export function getOffsetFromCursor(
  cursor: string | undefined,
  allItems: any[],
  limit: number
): number {
  if (!cursor) {
    return 0;
  }

  const decodedId = decodeCursor(cursor);
  if (!decodedId) {
    return 0;
  }

  const index = allItems.findIndex((item) => item.id === decodedId);
  return Math.max(0, index + 1);
}

// ============================================================================
// QUERY OPTIMIZATION HELPERS
// ============================================================================

/**
 * Build optimized query with pagination
 */
export function buildPaginatedQuery<T>(
  items: T[],
  limit: number,
  offset: number
): { data: T[]; total: number } {
  const total = items.length;
  const data = items.slice(offset, offset + limit);

  return { data, total };
}

/**
 * Build cursor-based paginated query
 */
export function buildCursorPaginatedQuery<T>(
  items: T[],
  limit: number,
  cursor?: string
): { data: T[]; hasMore: boolean } {
  let startIndex = 0;

  if (cursor) {
    const decodedId = decodeCursor(cursor);
    if (decodedId) {
      const foundIndex = items.findIndex((item: any) => item.id === decodedId);
      startIndex = foundIndex >= 0 ? foundIndex + 1 : 0;
    }
  }

  const data = items.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < items.length;

  return { data, hasMore };
}

// ============================================================================
// SORTING HELPERS
// ============================================================================

export type SortDirection = "asc" | "desc";

export interface SortOption {
  field: string;
  direction: SortDirection;
}

/**
 * Sort items by field and direction
 */
export function sortItems<T>(
  items: T[],
  sortOptions: SortOption[]
): T[] {
  if (!sortOptions || sortOptions.length === 0) {
    return items;
  }

  return [...items].sort((a, b) => {
    for (const option of sortOptions) {
      const aValue = (a as any)[option.field];
      const bValue = (b as any)[option.field];

      let comparison = 0;

      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      if (comparison !== 0) {
        return option.direction === "asc" ? comparison : -comparison;
      }
    }

    return 0;
  });
}

// ============================================================================
// FILTERING HELPERS
// ============================================================================

export interface FilterOption {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: any;
}

/**
 * Filter items by conditions
 */
export function filterItems<T>(
  items: T[],
  filters: FilterOption[]
): T[] {
  if (!filters || filters.length === 0) {
    return items;
  }

  return items.filter((item) => {
    return filters.every((filter) => {
      const itemValue = (item as any)[filter.field];

      switch (filter.operator) {
        case "eq":
          return itemValue === filter.value;
        case "ne":
          return itemValue !== filter.value;
        case "gt":
          return itemValue > filter.value;
        case "gte":
          return itemValue >= filter.value;
        case "lt":
          return itemValue < filter.value;
        case "lte":
          return itemValue <= filter.value;
        case "in":
          return Array.isArray(filter.value) && filter.value.includes(itemValue);
        case "contains":
          return String(itemValue).toLowerCase().includes(String(filter.value).toLowerCase());
        default:
          return true;
      }
    });
  });
}

// ============================================================================
// BATCH PROCESSING HELPERS
// ============================================================================

/**
 * Process items in batches
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

// ============================================================================
// QUERY OPTIMIZATION CONSTANTS
// ============================================================================

export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
  DEFAULT_OFFSET: 0,
};

export const BATCH_SIZES = {
  SMALL: 10,
  MEDIUM: 50,
  LARGE: 100,
  XLARGE: 500,
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export interface QueryPerformance {
  queryTime: number; // milliseconds
  resultCount: number;
  pageSize: number;
  totalRecords: number;
}

/**
 * Measure query performance
 */
export function measureQueryPerformance<T>(
  startTime: number,
  results: T[],
  pageSize: number,
  totalRecords: number
): QueryPerformance {
  return {
    queryTime: Date.now() - startTime,
    resultCount: results.length,
    pageSize,
    totalRecords,
  };
}

/**
 * Log query performance
 */
export function logQueryPerformance(
  operation: string,
  performance: QueryPerformance
): void {
  const threshold = 1000; // 1 second

  if (performance.queryTime > threshold) {
    console.warn(
      `[SLOW QUERY] ${operation}: ${performance.queryTime}ms (${performance.resultCount}/${performance.totalRecords} records)`
    );
  } else {
    console.debug(
      `[QUERY] ${operation}: ${performance.queryTime}ms (${performance.resultCount}/${performance.totalRecords} records)`
    );
  }
}
