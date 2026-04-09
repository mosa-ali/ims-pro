/**
 * Report Filtering Engine
 * Provides advanced filtering and query building for fleet reports
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FilterCondition {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "startsWith" | "endsWith" | "between" | "isEmpty" | "isNotEmpty";
  value?: any;
  values?: any[];
}

export interface FilterGroup {
  logic: "AND" | "OR";
  conditions: (FilterCondition | FilterGroup)[];
}

export interface DateRangeFilter {
  field: string;
  startDate: Date;
  endDate: Date;
}

export interface SortOption {
  field: string;
  direction: "ASC" | "DESC";
}

export interface FilterQuery {
  filters?: FilterGroup;
  dateRange?: DateRangeFilter;
  sort?: SortOption[];
  pagination?: {
    page: number;
    pageSize: number;
  };
}

// ============================================================================
// FILTER BUILDER
// ============================================================================

export class FilterBuilder {
  private conditions: FilterCondition[] = [];
  private logic: "AND" | "OR" = "AND";

  addCondition(field: string, operator: FilterCondition["operator"], value?: any): this {
    this.conditions.push({ field, operator, value });
    return this;
  }

  addInCondition(field: string, values: any[]): this {
    this.conditions.push({ field, operator: "in", values });
    return this;
  }

  addBetweenCondition(field: string, startValue: any, endValue: any): this {
    this.conditions.push({
      field,
      operator: "between",
      values: [startValue, endValue],
    });
    return this;
  }

  addDateRangeCondition(field: string, startDate: Date, endDate: Date): this {
    this.conditions.push({
      field,
      operator: "between",
      values: [startDate, endDate],
    });
    return this;
  }

  setLogic(logic: "AND" | "OR"): this {
    this.logic = logic;
    return this;
  }

  build(): FilterGroup {
    return {
      logic: this.logic,
      conditions: this.conditions,
    };
  }

  clear(): this {
    this.conditions = [];
    this.logic = "AND";
    return this;
  }
}

// ============================================================================
// FILTER EVALUATOR
// ============================================================================

export function evaluateFilter(data: any[], filter: FilterGroup): any[] {
  return data.filter((item) => evaluateCondition(item, filter));
}

function evaluateCondition(item: any, condition: FilterCondition | FilterGroup): boolean {
  if ("conditions" in condition) {
    // It's a FilterGroup
    const results = condition.conditions.map((c) => evaluateCondition(item, c));
    return condition.logic === "AND" ? results.every((r) => r) : results.some((r) => r);
  } else {
    // It's a FilterCondition
    const value = item[condition.field];

    switch (condition.operator) {
      case "eq":
        return value === condition.value;
      case "ne":
        return value !== condition.value;
      case "gt":
        return value > condition.value;
      case "gte":
        return value >= condition.value;
      case "lt":
        return value < condition.value;
      case "lte":
        return value <= condition.value;
      case "in":
        return condition.values?.includes(value) || false;
      case "contains":
        return String(value).includes(String(condition.value));
      case "startsWith":
        return String(value).startsWith(String(condition.value));
      case "endsWith":
        return String(value).endsWith(String(condition.value));
      case "between":
        return (
          value >= condition.values?.[0] &&
          value <= condition.values?.[1]
        );
      case "isEmpty":
        return !value || value === "" || value.length === 0;
      case "isNotEmpty":
        return value && value !== "" && value.length > 0;
      default:
        return true;
    }
  }
}

// ============================================================================
// SORTING ENGINE
// ============================================================================

export function sortData(data: any[], sortOptions: SortOption[]): any[] {
  if (!sortOptions || sortOptions.length === 0) {
    return data;
  }

  return [...data].sort((a, b) => {
    for (const sort of sortOptions) {
      const aVal = a[sort.field];
      const bVal = b[sort.field];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;

      if (comparison !== 0) {
        return sort.direction === "ASC" ? comparison : -comparison;
      }
    }
    return 0;
  });
}

// ============================================================================
// PAGINATION ENGINE
// ============================================================================

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    data: data.slice(startIndex, endIndex),
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// ============================================================================
// QUERY EXECUTOR
// ============================================================================

export function executeQuery<T>(data: T[], query: FilterQuery): PaginatedResult<T> {
  let result = [...data];

  // Apply filters
  if (query.filters) {
    result = evaluateFilter(result, query.filters);
  }

  // Apply date range filter
  if (query.dateRange) {
    result = result.filter((item) => {
      const itemDate = new Date(item[query.dateRange!.field]);
      return (
        itemDate >= query.dateRange!.startDate &&
        itemDate <= query.dateRange!.endDate
      );
    });
  }

  // Apply sorting
  if (query.sort && query.sort.length > 0) {
    result = sortData(result, query.sort);
  }

  // Apply pagination
  const page = query.pagination?.page || 1;
  const pageSize = query.pagination?.pageSize || 50;

  return paginateData(result, page, pageSize);
}

// ============================================================================
// PREDEFINED FILTERS
// ============================================================================

export const COMMON_FILTERS = {
  activeVehicles: (): FilterCondition => ({
    field: "status",
    operator: "eq",
    value: "active",
  }),

  inactiveVehicles: (): FilterCondition => ({
    field: "status",
    operator: "eq",
    value: "inactive",
  }),

  lastMonthTrips: (): DateRangeFilter => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      field: "tripDate",
      startDate: lastMonth,
      endDate: now,
    };
  },

  highFuelConsumption: (): FilterCondition => ({
    field: "fuelEfficiency",
    operator: "lt",
    value: 5, // Less than 5 L/100km
  }),

  lowFuelConsumption: (): FilterCondition => ({
    field: "fuelEfficiency",
    operator: "gte",
    value: 5,
  }),

  pendingMaintenance: (): FilterCondition => ({
    field: "maintenanceStatus",
    operator: "eq",
    value: "pending",
  }),

  completedMaintenance: (): FilterCondition => ({
    field: "maintenanceStatus",
    operator: "eq",
    value: "completed",
  }),

  highDriverRating: (): FilterCondition => ({
    field: "driverRating",
    operator: "gte",
    value: 4.5,
  }),

  lowDriverRating: (): FilterCondition => ({
    field: "driverRating",
    operator: "lt",
    value: 3.5,
  }),

  expiredLicense: (): FilterCondition => ({
    field: "licenseExpiryDate",
    operator: "lt",
    value: new Date(),
  }),

  expiringLicenseSoon: (): DateRangeFilter => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      field: "licenseExpiryDate",
      startDate: now,
      endDate: thirtyDaysFromNow,
    };
  },
};

// ============================================================================
// FILTER TEMPLATES
// ============================================================================

export function createFleetOverviewFilter(
  status?: string,
  fuelType?: string,
  dateFrom?: Date,
  dateTo?: Date
): FilterQuery {
  const builder = new FilterBuilder();

  if (status) {
    builder.addCondition("status", "eq", status);
  }

  if (fuelType) {
    builder.addCondition("fuelType", "eq", fuelType);
  }

  return {
    filters: builder.build(),
    dateRange: dateFrom && dateTo ? { field: "lastServiceDate", startDate: dateFrom, endDate: dateTo } : undefined,
    sort: [{ field: "vehicleId", direction: "ASC" }],
  };
}

export function createDriverPerformanceFilter(
  minRating?: number,
  status?: string,
  dateFrom?: Date,
  dateTo?: Date
): FilterQuery {
  const builder = new FilterBuilder();

  if (minRating !== undefined) {
    builder.addCondition("avgRating", "gte", minRating);
  }

  if (status) {
    builder.addCondition("status", "eq", status);
  }

  return {
    filters: builder.build(),
    dateRange: dateFrom && dateTo ? { field: "evaluationDate", startDate: dateFrom, endDate: dateTo } : undefined,
    sort: [{ field: "avgRating", direction: "DESC" }],
  };
}

export function createFuelConsumptionFilter(
  minEfficiency?: number,
  maxEfficiency?: number,
  dateFrom?: Date,
  dateTo?: Date
): FilterQuery {
  const builder = new FilterBuilder();

  if (minEfficiency !== undefined) {
    builder.addCondition("efficiency", "gte", minEfficiency);
  }

  if (maxEfficiency !== undefined) {
    builder.addCondition("efficiency", "lte", maxEfficiency);
  }

  return {
    filters: builder.build(),
    dateRange: dateFrom && dateTo ? { field: "logDate", startDate: dateFrom, endDate: dateTo } : undefined,
    sort: [{ field: "logDate", direction: "DESC" }],
  };
}

export function createMaintenanceFilter(
  status?: string,
  type?: string,
  dateFrom?: Date,
  dateTo?: Date
): FilterQuery {
  const builder = new FilterBuilder();

  if (status) {
    builder.addCondition("status", "eq", status);
  }

  if (type) {
    builder.addCondition("type", "eq", type);
  }

  return {
    filters: builder.build(),
    dateRange: dateFrom && dateTo ? { field: "maintenanceDate", startDate: dateFrom, endDate: dateTo } : undefined,
    sort: [{ field: "maintenanceDate", direction: "DESC" }],
  };
}
