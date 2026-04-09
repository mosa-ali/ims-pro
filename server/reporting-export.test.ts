import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  exportReport,
  buildFleetOverviewReport,
  buildVehicleDetailReport,
  buildDriverPerformanceReport,
  buildTripDetailReport,
  buildFuelConsumptionReport,
  buildMaintenanceReport,
  ExportResult,
} from "./reporting/exportEngine";
import {
  FilterBuilder,
  evaluateFilter,
  sortData,
  paginateData,
  executeQuery,
  COMMON_FILTERS,
  createFleetOverviewFilter,
  createDriverPerformanceFilter,
  createFuelConsumptionFilter,
  createMaintenanceFilter,
} from "./reporting/filterEngine";

// ============================================================================
// TEST DATA
// ============================================================================

const mockFleetData = [
  {
    vehicleId: "veh-001",
    registration: "ABC-123",
    status: "active",
    mileage: 50000,
    fuelType: "diesel",
    lastServiceDate: new Date("2025-01-15"),
  },
  {
    vehicleId: "veh-002",
    registration: "DEF-456",
    status: "inactive",
    mileage: 75000,
    fuelType: "petrol",
    lastServiceDate: new Date("2024-12-20"),
  },
  {
    vehicleId: "veh-003",
    registration: "GHI-789",
    status: "active",
    mileage: 30000,
    fuelType: "diesel",
    lastServiceDate: new Date("2025-02-01"),
  },
];

const mockDriverData = [
  {
    driverId: "drv-001",
    name: "Ahmed Ali",
    status: "active",
    tripsCompleted: 150,
    avgRating: 4.8,
    safetyScore: 95,
    fuelEfficiency: 6.2,
  },
  {
    driverId: "drv-002",
    name: "Fatima Hassan",
    status: "active",
    tripsCompleted: 120,
    avgRating: 4.5,
    safetyScore: 88,
    fuelEfficiency: 7.1,
  },
  {
    driverId: "drv-003",
    name: "Mohammed Saleh",
    status: "inactive",
    tripsCompleted: 80,
    avgRating: 3.2,
    safetyScore: 72,
    fuelEfficiency: 8.5,
  },
];

const mockTripData = [
  {
    tripId: "trip-001",
    vehicleId: "veh-001",
    driverId: "drv-001",
    startDate: new Date("2025-02-01"),
    endDate: new Date("2025-02-01"),
    distance: 150,
    fuelConsumed: 12.5,
    status: "completed",
  },
  {
    tripId: "trip-002",
    vehicleId: "veh-002",
    driverId: "drv-002",
    startDate: new Date("2025-02-02"),
    endDate: new Date("2025-02-02"),
    distance: 200,
    fuelConsumed: 18.0,
    status: "completed",
  },
  {
    tripId: "trip-003",
    vehicleId: "veh-003",
    driverId: "drv-003",
    startDate: new Date("2025-02-03"),
    endDate: new Date("2025-02-03"),
    distance: 100,
    fuelConsumed: 9.5,
    status: "in-progress",
  },
];

const mockFuelData = [
  {
    vehicleId: "veh-001",
    logDate: new Date("2025-02-01"),
    quantityLiters: 50,
    cost: 250,
    pricePerLiter: 5.0,
    mileage: 50000,
    efficiency: 6.2,
  },
  {
    vehicleId: "veh-001",
    logDate: new Date("2025-02-05"),
    quantityLiters: 48,
    cost: 240,
    pricePerLiter: 5.0,
    mileage: 50750,
    efficiency: 6.25,
  },
  {
    vehicleId: "veh-002",
    logDate: new Date("2025-02-02"),
    quantityLiters: 55,
    cost: 275,
    pricePerLiter: 5.0,
    mileage: 75000,
    efficiency: 7.1,
  },
];

const mockMaintenanceData = [
  {
    vehicleId: "veh-001",
    maintenanceDate: new Date("2025-01-15"),
    type: "oil-change",
    description: "Regular oil change",
    cost: 150,
    status: "completed",
    nextDueDate: new Date("2025-04-15"),
  },
  {
    vehicleId: "veh-002",
    maintenanceDate: new Date("2025-01-20"),
    type: "tire-replacement",
    description: "Replace worn tires",
    cost: 800,
    status: "completed",
    nextDueDate: new Date("2026-01-20"),
  },
  {
    vehicleId: "veh-003",
    maintenanceDate: new Date("2025-02-01"),
    type: "inspection",
    description: "General inspection",
    cost: 200,
    status: "pending",
    nextDueDate: new Date("2025-05-01"),
  },
];

// ============================================================================
// FILTER ENGINE TESTS
// ============================================================================

describe("Reporting & Export - Filter Engine", () => {
  describe("Filter Builder", () => {
    it("should build simple filter conditions", () => {
      const builder = new FilterBuilder();
      const filter = builder
        .addCondition("status", "eq", "active")
        .build();

      expect(filter.conditions).toHaveLength(1);
      expect(filter.conditions[0]).toEqual({
        field: "status",
        operator: "eq",
        value: "active",
      });
    });

    it("should build multiple conditions with AND logic", () => {
      const builder = new FilterBuilder();
      const filter = builder
        .addCondition("status", "eq", "active")
        .addCondition("fuelType", "eq", "diesel")
        .setLogic("AND")
        .build();

      expect(filter.conditions).toHaveLength(2);
      expect(filter.logic).toBe("AND");
    });

    it("should build IN condition", () => {
      const builder = new FilterBuilder();
      const filter = builder
        .addInCondition("status", ["active", "pending"])
        .build();

      expect(filter.conditions[0].operator).toBe("in");
      expect(filter.conditions[0].values).toEqual(["active", "pending"]);
    });

    it("should build BETWEEN condition", () => {
      const builder = new FilterBuilder();
      const filter = builder
        .addBetweenCondition("mileage", 0, 100000)
        .build();

      expect(filter.conditions[0].operator).toBe("between");
      expect(filter.conditions[0].values).toEqual([0, 100000]);
    });

    it("should clear builder state", () => {
      const builder = new FilterBuilder();
      builder.addCondition("status", "eq", "active");
      builder.clear();
      const filter = builder.build();

      expect(filter.conditions).toHaveLength(0);
    });
  });

  describe("Filter Evaluation", () => {
    it("should filter data by equality", () => {
      const builder = new FilterBuilder();
      const filter = builder.addCondition("status", "eq", "active").build();
      const result = evaluateFilter(mockFleetData, filter);

      expect(result).toHaveLength(2);
      expect(result.every((v) => v.status === "active")).toBe(true);
    });

    it("should filter data by inequality", () => {
      const builder = new FilterBuilder();
      const filter = builder.addCondition("status", "ne", "active").build();
      const result = evaluateFilter(mockFleetData, filter);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("inactive");
    });

    it("should filter data by greater than", () => {
      const builder = new FilterBuilder();
      const filter = builder.addCondition("mileage", "gt", 50000).build();
      const result = evaluateFilter(mockFleetData, filter);

      expect(result).toHaveLength(1);
      expect(result[0].vehicleId).toBe("veh-002");
    });

    it("should filter data by IN operator", () => {
      const builder = new FilterBuilder();
      const filter = builder.addInCondition("fuelType", ["diesel"]).build();
      const result = evaluateFilter(mockFleetData, filter);

      expect(result).toHaveLength(2);
      expect(result.every((v) => v.fuelType === "diesel")).toBe(true);
    });

    it("should filter data by BETWEEN operator", () => {
      const builder = new FilterBuilder();
      const filter = builder.addBetweenCondition("mileage", 30000, 75000).build();
      const result = evaluateFilter(mockFleetData, filter);

      expect(result).toHaveLength(3); // All vehicles fall within 30000-75000 range
    });

    it("should filter data with OR logic", () => {
      const builder = new FilterBuilder();
      const filter = builder
        .addCondition("status", "eq", "active")
        .addCondition("fuelType", "eq", "petrol")
        .setLogic("OR")
        .build();
      const result = evaluateFilter(mockFleetData, filter);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Sorting", () => {
    it("should sort data ascending", () => {
      const sorted = sortData(mockFleetData, [{ field: "mileage", direction: "ASC" }]);

      expect(sorted[0].mileage).toBe(30000);
      expect(sorted[sorted.length - 1].mileage).toBe(75000);
    });

    it("should sort data descending", () => {
      const sorted = sortData(mockFleetData, [{ field: "mileage", direction: "DESC" }]);

      expect(sorted[0].mileage).toBe(75000);
      expect(sorted[sorted.length - 1].mileage).toBe(30000);
    });

    it("should sort by multiple fields", () => {
      const sorted = sortData(mockFleetData, [
        { field: "status", direction: "ASC" },
        { field: "mileage", direction: "DESC" },
      ]);

      expect(sorted[0].status).toBe("active");
    });
  });

  describe("Pagination", () => {
    it("should paginate data correctly", () => {
      const result = paginateData(mockFleetData, 1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it("should handle last page", () => {
      const result = paginateData(mockFleetData, 2, 2);

      expect(result.data).toHaveLength(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });
  });

  describe("Query Execution", () => {
    it("should execute complete query with filters, sort, and pagination", () => {
      const query = {
        filters: new FilterBuilder().addCondition("status", "eq", "active").build(),
        sort: [{ field: "mileage", direction: "DESC" }],
        pagination: { page: 1, pageSize: 10 },
      };

      const result = executeQuery(mockFleetData, query);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].mileage).toBe(50000);
    });
  });

  describe("Predefined Filters", () => {
    it("should apply active vehicles filter", () => {
      const filter = COMMON_FILTERS.activeVehicles();
      const builder = new FilterBuilder();
      builder.addCondition(filter.field, filter.operator, filter.value);
      const result = evaluateFilter(mockFleetData, builder.build());

      expect(result).toHaveLength(2);
    });

    it("should apply high fuel consumption filter", () => {
      const filter = COMMON_FILTERS.highFuelConsumption();
      const builder = new FilterBuilder();
      builder.addCondition(filter.field, filter.operator, filter.value);
      const result = evaluateFilter(mockDriverData, builder.build());

      // Filter checks fuelEfficiency < 5, but all drivers have >= 6.2, so result should be empty
      expect(result.length).toBe(0)
    });
  });

  describe("Filter Templates", () => {
    it("should create fleet overview filter", () => {
      const query = createFleetOverviewFilter("active", "diesel");

      expect(query.filters).toBeDefined();
      expect(query.sort).toBeDefined();
    });

    it("should create driver performance filter", () => {
      const query = createDriverPerformanceFilter(4.0, "active");

      expect(query.filters).toBeDefined();
      expect(query.sort).toBeDefined();
    });

    it("should create fuel consumption filter", () => {
      const query = createFuelConsumptionFilter(5, 8);

      expect(query.filters).toBeDefined();
    });

    it("should create maintenance filter", () => {
      const query = createMaintenanceFilter("completed", "oil-change");

      expect(query.filters).toBeDefined();
    });
  });
});

// ============================================================================
// EXPORT ENGINE TESTS
// ============================================================================

describe("Reporting & Export - Export Engine", () => {
  describe("Report Data Builders", () => {
    it("should build fleet overview report", () => {
      const report = buildFleetOverviewReport(mockFleetData, "Test Organization");

      expect(report.title).toBe("Fleet Overview Report");
      expect(report.organizationName).toBe("Test Organization");
      expect(report.data).toHaveLength(3);
      expect(report.columns).toHaveLength(6);
    });

    it("should build vehicle detail report", () => {
      const report = buildVehicleDetailReport(mockFleetData[0], "Test Organization");

      expect(report.title).toContain("ABC-123");
      expect(report.data).toHaveLength(1);
      expect(report.columns).toHaveLength(10);
    });

    it("should build driver performance report", () => {
      const report = buildDriverPerformanceReport(mockDriverData, "Test Organization");

      expect(report.title).toBe("Driver Performance Report");
      expect(report.data).toHaveLength(3);
      expect(report.columns).toHaveLength(7);
    });

    it("should build trip detail report", () => {
      const report = buildTripDetailReport(mockTripData, "Test Organization");

      expect(report.title).toBe("Trip Detail Report");
      expect(report.data).toHaveLength(3);
      expect(report.columns).toHaveLength(8);
    });

    it("should build fuel consumption report", () => {
      const report = buildFuelConsumptionReport(mockFuelData, "Test Organization");

      expect(report.title).toBe("Fuel Consumption Report");
      expect(report.data).toHaveLength(3);
      expect(report.columns).toHaveLength(7);
    });

    it("should build maintenance report", () => {
      const report = buildMaintenanceReport(mockMaintenanceData, "Test Organization");

      expect(report.title).toBe("Maintenance Report");
      expect(report.data).toHaveLength(3);
      expect(report.columns).toHaveLength(7);
    });
  });

  describe("Export Functionality", () => {
    it("should export fleet overview report as Excel", async () => {
      const report = buildFleetOverviewReport(mockFleetData, "Test Organization", {
        totalVehicles: 3,
        activeVehicles: 2,
      });

      const result = await exportReport(report, {
        format: "excel",
        reportType: "fleet-overview",
        title: "Fleet Overview",
        organizationName: "Test Organization",
        includeCharts: true,
        includeSummary: true,
      });

      expect(result).toBeDefined();
      expect(result.format).toBe("excel");
      expect(result.fileName).toContain("fleet-overview");
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.url).toBeDefined();
    });

    it("should export driver performance report as PDF", async () => {
      const report = buildDriverPerformanceReport(mockDriverData, "Test Organization", {
        totalDrivers: 3,
        activeDrivers: 2,
        avgRating: 4.17,
      });

      const result = await exportReport(report, {
        format: "pdf",
        reportType: "driver-performance",
        title: "Driver Performance",
        organizationName: "Test Organization",
        includeCharts: true,
        includeSummary: true,
      });

      expect(result).toBeDefined();
      expect(result.format).toBe("pdf");
      expect(result.fileName).toContain("driver-performance");
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it("should export fuel consumption report with summary", async () => {
      const report = buildFuelConsumptionReport(mockFuelData, "Test Organization", {
        totalConsumption: 153,
        avgEfficiency: 6.53,
        totalCost: 765,
      });

      const result = await exportReport(report, {
        format: "excel",
        reportType: "fuel-consumption",
        title: "Fuel Consumption",
        organizationName: "Test Organization",
        includeCharts: false,
        includeSummary: true,
      });

      expect(result).toBeDefined();
      expect(result.format).toBe("excel");
    });

    it("should export maintenance report without charts", async () => {
      const report = buildMaintenanceReport(mockMaintenanceData, "Test Organization", {
        totalRecords: 3,
        completedRecords: 2,
        pendingRecords: 1,
      });

      const result = await exportReport(report, {
        format: "pdf",
        reportType: "maintenance",
        title: "Maintenance Report",
        organizationName: "Test Organization",
        includeCharts: false,
        includeSummary: true,
      });

      expect(result).toBeDefined();
      expect(result.format).toBe("pdf");
    });
  });

  describe("Export Result Validation", () => {
    it("should return valid export result", async () => {
      const report = buildFleetOverviewReport(mockFleetData, "Test Organization");

      const result = await exportReport(report, {
        format: "excel",
        reportType: "fleet-overview",
        title: "Fleet Overview",
        organizationName: "Test Organization",
        includeCharts: true,
        includeSummary: true,
      });

      expect(result.url).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.format).toBe("excel");
      expect(result.generatedAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// END-TO-END EXPORT TESTS
// ============================================================================

describe("Reporting & Export - End-to-End", () => {
  it("should filter data and export as Excel", async () => {
    // Filter active vehicles
    const query = createFleetOverviewFilter("active");
    const filtered = executeQuery(mockFleetData, query);

    // Build report
    const report = buildFleetOverviewReport(filtered.data, "Test Organization", {
      totalVehicles: filtered.total,
      activeVehicles: filtered.data.length,
    });

    // Export
    const result = await exportReport(report, {
      format: "excel",
      reportType: "fleet-overview",
      title: "Active Vehicles Report",
      organizationName: "Test Organization",
      includeCharts: true,
      includeSummary: true,
    });

    expect(result).toBeDefined();
    expect(result.format).toBe("excel");
    expect(filtered.data).toHaveLength(2);
  });

  it("should filter drivers by rating and export as PDF", async () => {
    // Filter high-rated drivers
    const query = createDriverPerformanceFilter(4.0);
    const filtered = executeQuery(mockDriverData, query);

    // Build report
    const report = buildDriverPerformanceReport(filtered.data, "Test Organization", {
      totalDrivers: filtered.total,
      highRatedDrivers: filtered.data.length,
    });

    // Export
    const result = await exportReport(report, {
      format: "pdf",
      reportType: "driver-performance",
      title: "High Performers",
      organizationName: "Test Organization",
      includeCharts: true,
      includeSummary: true,
    });

    expect(result).toBeDefined();
    expect(result.format).toBe("pdf");
  });

  it("should filter fuel consumption and export with date range", async () => {
    // Filter by date range
    const query = createFuelConsumptionFilter(
      undefined,
      undefined,
      new Date("2025-02-01"),
      new Date("2025-02-05")
    );
    const filtered = executeQuery(mockFuelData, query);

    // Build report
    const report = buildFuelConsumptionReport(filtered.data, "Test Organization", {
      totalRecords: filtered.total,
      avgEfficiency: 6.24,
    });

    // Export
    const result = await exportReport(report, {
      format: "excel",
      reportType: "fuel-consumption",
      title: "February Fuel Report",
      organizationName: "Test Organization",
      includeCharts: true,
      includeSummary: true,
    });

    expect(result).toBeDefined();
    expect(filtered.data.length).toBeGreaterThan(0);
  });
});
