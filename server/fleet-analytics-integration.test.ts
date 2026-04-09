/**
 * Analytics & External Systems Integration Testing
 * Tests for predictive analytics, GPS integration, fuel card, and insurance
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  predictFuelConsumption,
  predictMaintenanceCost,
  generateFleetOptimizationRecommendations,
  getAnalyticsMetrics,
} from "./analytics/predictionEngine";
import {
  GPSProviderAdapter,
  FuelCardAdapter,
  InsuranceAdapter,
  externalSystemsManager,
} from "./integrations/externalSystemsAdapter";

describe("Fleet Analytics & External Systems Integration", () => {
  // ============================================================================
  // FUEL CONSUMPTION PREDICTION TESTS
  // ============================================================================

  describe("Fuel Consumption Prediction", () => {
    it("should predict fuel consumption for a vehicle", async () => {
      const prediction = await predictFuelConsumption("veh-001", "org-001", "ou-001");

      expect(prediction).toBeDefined();
      expect(prediction.vehicleId).toBe("veh-001");
      expect(prediction.currentMonthConsumption).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedMonthConsumption).toBeGreaterThanOrEqual(0);
      expect(["increasing", "decreasing", "stable"]).toContain(prediction.trend);
      expect(Array.isArray(prediction.anomalies)).toBe(true);
      expect(Array.isArray(prediction.recommendations)).toBe(true);
    });

    it("should detect fuel consumption anomalies", async () => {
      const prediction = await predictFuelConsumption("veh-001", "org-001", "ou-001");

      if (prediction.anomalies.length > 0) {
        const anomaly = prediction.anomalies[0];
        expect(anomaly.date).toBeDefined();
        expect(anomaly.consumption).toBeGreaterThan(0);
        expect(anomaly.expectedConsumption).toBeGreaterThan(0);
        expect(anomaly.deviation).toBeGreaterThan(0);
      }
    });

    it("should provide fuel consumption recommendations", async () => {
      const prediction = await predictFuelConsumption("veh-001", "org-001", "ou-001");

      expect(prediction.recommendations.length).toBeGreaterThan(0);
      expect(typeof prediction.recommendations[0]).toBe("string");
    });

    it("should identify increasing fuel consumption trend", async () => {
      const prediction = await predictFuelConsumption("veh-001", "org-001", "ou-001");

      if (prediction.trend === "increasing") {
        expect(prediction.recommendations.some((r) => r.includes("increasing"))).toBe(true);
      }
    });
  });

  // ============================================================================
  // MAINTENANCE COST PREDICTION TESTS
  // ============================================================================

  describe("Maintenance Cost Prediction", () => {
    it("should predict maintenance costs for a vehicle", async () => {
      const prediction = await predictMaintenanceCost("veh-001", "org-001", "ou-001");

      expect(prediction).toBeDefined();
      expect(prediction.vehicleId).toBe("veh-001");
      expect(prediction.predictedCostNextMonth).toBeGreaterThan(0);
      expect(prediction.predictedCostNextQuarter).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(prediction.riskLevel);
      expect(Array.isArray(prediction.upcomingMaintenanceItems)).toBe(true);
      expect(Array.isArray(prediction.recommendations)).toBe(true);
    });

    it("should identify upcoming maintenance items", async () => {
      const prediction = await predictMaintenanceCost("veh-001", "org-001", "ou-001");

      expect(prediction.upcomingMaintenanceItems.length).toBeGreaterThan(0);

      const item = prediction.upcomingMaintenanceItems[0];
      expect(item.type).toBeDefined();
      expect(item.estimatedDate).toBeDefined();
      expect(item.estimatedCost).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(item.priority);
    });

    it("should assess maintenance risk level", async () => {
      const prediction = await predictMaintenanceCost("veh-001", "org-001", "ou-001");

      expect(["low", "medium", "high"]).toContain(prediction.riskLevel);
    });

    it("should provide maintenance recommendations", async () => {
      const prediction = await predictMaintenanceCost("veh-001", "org-001", "ou-001");

      expect(prediction.recommendations.length).toBeGreaterThan(0);
      expect(typeof prediction.recommendations[0]).toBe("string");
    });
  });

  // ============================================================================
  // FLEET OPTIMIZATION TESTS
  // ============================================================================

  describe("Fleet Optimization Recommendations", () => {
    it("should generate fleet optimization recommendations", async () => {
      const recommendations = await generateFleetOptimizationRecommendations("org-001", "ou-001");

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should include route optimization recommendations", async () => {
      const recommendations = await generateFleetOptimizationRecommendations("org-001", "ou-001");

      expect(recommendations.length).toBeGreaterThan(0);
      const routeRec = recommendations.find((r) => r.type === "route");
      if (routeRec) {
        expect(routeRec.potentialSavings).toBeGreaterThan(0);
        expect(["low", "medium", "high"]).toContain(routeRec.priority);
      }
    });

    it("should include vehicle utilization recommendations", async () => {
      const recommendations = await generateFleetOptimizationRecommendations("org-001", "ou-001");

      const vehicleRec = recommendations.find((r) => r.type === "vehicle");
      if (vehicleRec) {
        expect(vehicleRec.description).toContain("utilization");
      }
    });

    it("should include driver training recommendations", async () => {
      const recommendations = await generateFleetOptimizationRecommendations("org-001", "ou-001");

      const driverRec = recommendations.find((r) => r.type === "driver");
      if (driverRec) {
        expect(driverRec.description).toContain("training");
      }
    });

    it("should include cost optimization recommendations", async () => {
      const recommendations = await generateFleetOptimizationRecommendations("org-001", "ou-001");

      const costRec = recommendations.find((r) => r.type === "cost");
      if (costRec) {
        expect(costRec.description.toLowerCase()).toContain("fuel");
      }
    });
  });

  // ============================================================================
  // ANALYTICS METRICS TESTS
  // ============================================================================

  describe("Analytics Metrics", () => {
    it("should retrieve fleet analytics metrics", async () => {
      const metrics = await getAnalyticsMetrics("org-001", "ou-001");

      expect(metrics).toBeDefined();
      expect(metrics.totalVehicles).toBeGreaterThanOrEqual(0);
      expect(metrics.averageFuelConsumption).toBeGreaterThanOrEqual(0);
      expect(metrics.averageMaintenanceCost).toBeGreaterThanOrEqual(0);
      expect(metrics.fleetEfficiency).toBeGreaterThanOrEqual(0);
      expect(metrics.fleetEfficiency).toBeLessThanOrEqual(100);
    });

    it("should calculate predicted monthly costs", async () => {
      const metrics = await getAnalyticsMetrics("org-001", "ou-001");

      expect(metrics.predictedMonthlyFuelCost).toBeGreaterThanOrEqual(0);
      expect(metrics.predictedMonthlyMaintenanceCost).toBeGreaterThanOrEqual(0);
    });

    it("should count optimization opportunities", async () => {
      const metrics = await getAnalyticsMetrics("org-001", "ou-001");

      expect(metrics.optimizationOpportunities).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // GPS PROVIDER ADAPTER TESTS
  // ============================================================================

  describe("GPS Provider Integration", () => {
    let gpsAdapter: GPSProviderAdapter;

    beforeEach(() => {
      gpsAdapter = new GPSProviderAdapter("google", "test-api-key");
    });

    it("should get vehicle location", async () => {
      const location = await gpsAdapter.getVehicleLocation("veh-001");

      expect(location).toBeDefined();
      expect(location?.vehicleId).toBe("veh-001");
      expect(typeof location?.latitude).toBe("number");
      expect(typeof location?.longitude).toBe("number");
      expect(location?.accuracy).toBeGreaterThan(0);
      expect(location?.timestamp).toBeDefined();
    });

    it("should get route between locations", async () => {
      const route = await gpsAdapter.getRoute(24.7136, 46.6753, 24.8, 46.8);

      expect(route).toBeDefined();
      expect(route?.distance).toBeGreaterThan(0);
      expect(route?.duration).toBeGreaterThan(0);
      expect(route?.polyline).toBeDefined();
    });

    it("should start vehicle tracking", async () => {
      const result = await gpsAdapter.startTracking("veh-001", 60000);

      expect(result).toBe(true);
    });

    it("should stop vehicle tracking", async () => {
      const result = await gpsAdapter.stopTracking("veh-001");

      expect(result).toBe(true);
    });

    it("should support different GPS providers", () => {
      const googleGPS = new GPSProviderAdapter("google", "key");
      const osmGPS = new GPSProviderAdapter("openstreetmap", "key");
      const customGPS = new GPSProviderAdapter("custom", "key");

      expect(googleGPS).toBeDefined();
      expect(osmGPS).toBeDefined();
      expect(customGPS).toBeDefined();
    });
  });

  // ============================================================================
  // FUEL CARD ADAPTER TESTS
  // ============================================================================

  describe("Fuel Card System Integration", () => {
    let fuelCardAdapter: FuelCardAdapter;

    beforeEach(() => {
      fuelCardAdapter = new FuelCardAdapter("fuelcard", "test-api-key", "account-123");
    });

    it("should get fuel card transactions", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const transactions = await fuelCardAdapter.getTransactions(startDate, endDate);

      expect(Array.isArray(transactions)).toBe(true);
      if (transactions.length > 0) {
        const tx = transactions[0];
        expect(tx.transactionId).toBeDefined();
        expect(tx.vehicleId).toBeDefined();
        expect(tx.amount).toBeGreaterThan(0);
        expect(tx.quantity).toBeGreaterThan(0);
        expect(tx.timestamp).toBeDefined();
      }
    });

    it("should get fuel card balance", async () => {
      const balance = await fuelCardAdapter.getCardBalance("card-001");

      expect(typeof balance).toBe("number");
      expect(balance).toBeGreaterThanOrEqual(0);
    });

    it("should get fuel card statement", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const statement = await fuelCardAdapter.getStatement(startDate, endDate);

      expect(statement.totalTransactions).toBeGreaterThanOrEqual(0);
      expect(statement.totalAmount).toBeGreaterThanOrEqual(0);
      expect(statement.totalQuantity).toBeGreaterThanOrEqual(0);
      expect(statement.averagePricePerLiter).toBeGreaterThanOrEqual(0);
    });

    it("should reconcile fuel card transactions", async () => {
      const mockFuelLogs = [
        {
          vehicleId: "veh-001",
          quantityLiters: 50,
        },
      ];

      const reconciliation = await fuelCardAdapter.reconcileTransactions(mockFuelLogs);

      expect(reconciliation.matched).toBeGreaterThanOrEqual(0);
      expect(reconciliation.unmatched).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(reconciliation.discrepancies)).toBe(true);
    });

    it("should support different fuel card providers", () => {
      const fuelCard = new FuelCardAdapter("fuelcard", "key", "account");
      const fleetCard = new FuelCardAdapter("fleetcard", "key", "account");

      expect(fuelCard).toBeDefined();
      expect(fleetCard).toBeDefined();
    });
  });

  // ============================================================================
  // INSURANCE ADAPTER TESTS
  // ============================================================================

  describe("Insurance Platform Integration", () => {
    let insuranceAdapter: InsuranceAdapter;

    beforeEach(() => {
      insuranceAdapter = new InsuranceAdapter("allianz", "test-api-key", "account-123");
    });

    it("should get insurance policies", async () => {
      const policies = await insuranceAdapter.getPolicies();

      expect(Array.isArray(policies)).toBe(true);
      if (policies.length > 0) {
        const policy = policies[0];
        expect(policy.policyId).toBeDefined();
        expect(policy.vehicleId).toBeDefined();
        expect(policy.provider).toBeDefined();
        expect(["active", "expired", "cancelled"]).toContain(policy.status);
      }
    });

    it("should get policy details", async () => {
      const policies = await insuranceAdapter.getPolicies();

      if (policies.length > 0) {
        const details = await insuranceAdapter.getPolicyDetails(policies[0].policyId);

        expect(details).toBeDefined();
        expect(details?.policyId).toBe(policies[0].policyId);
      }
    });

    it("should get insurance claims", async () => {
      const claims = await insuranceAdapter.getClaims();

      expect(Array.isArray(claims)).toBe(true);
      if (claims.length > 0) {
        const claim = claims[0];
        expect(claim.claimId).toBeDefined();
        expect(claim.policyId).toBeDefined();
        expect(["open", "approved", "denied", "closed"]).toContain(claim.status);
      }
    });

    it("should file new claim", async () => {
      const result = await insuranceAdapter.fileClaim("policy-001", "veh-001", "Test claim", 1000);

      expect(result.claimId).toBeDefined();
      expect(result.status).toBe("submitted");
      expect(result.message).toBeDefined();
    });

    it("should check policy expiration", async () => {
      const result = await insuranceAdapter.checkPolicyExpiration();

      expect(Array.isArray(result.expiringPolicies)).toBe(true);
      expect(Array.isArray(result.expiredPolicies)).toBe(true);
    });

    it("should get coverage summary", async () => {
      const summary = await insuranceAdapter.getCoverageSummary();

      expect(summary.totalPolicies).toBeGreaterThanOrEqual(0);
      expect(summary.activePolicies).toBeGreaterThanOrEqual(0);
      expect(summary.totalCoverage).toBeGreaterThanOrEqual(0);
      expect(summary.totalPremiums).toBeGreaterThanOrEqual(0);
    });

    it("should support different insurance providers", () => {
      const allianz = new InsuranceAdapter("allianz", "key", "account");
      const axa = new InsuranceAdapter("axa", "key", "account");

      expect(allianz).toBeDefined();
      expect(axa).toBeDefined();
    });
  });

  // ============================================================================
  // EXTERNAL SYSTEMS MANAGER TESTS
  // ============================================================================

  describe("External Systems Manager", () => {
    it("should initialize GPS adapter", () => {
      externalSystemsManager.initializeGPS("google", "test-key");
      const gps = externalSystemsManager.getGPS();

      expect(gps).toBeDefined();
    });

    it("should initialize Fuel Card adapter", () => {
      externalSystemsManager.initializeFuelCard("fuelcard", "test-key", "account");
      const fuelCard = externalSystemsManager.getFuelCard();

      expect(fuelCard).toBeDefined();
    });

    it("should initialize Insurance adapter", () => {
      externalSystemsManager.initializeInsurance("allianz", "test-key", "account");
      const insurance = externalSystemsManager.getInsurance();

      expect(insurance).toBeDefined();
    });

    it("should sync all external systems", async () => {
      externalSystemsManager.initializeGPS("google", "test-key");
      externalSystemsManager.initializeFuelCard("fuelcard", "test-key", "account");
      externalSystemsManager.initializeInsurance("allianz", "test-key", "account");

      const results = await externalSystemsManager.syncAll();

      expect(results.gps).toBe(true);
      expect(results.fuelCard).toBe(true);
      expect(results.insurance).toBe(true);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe("End-to-End Analytics & External Systems Integration", () => {
    it("should provide complete analytics dashboard data", async () => {
      const metrics = await getAnalyticsMetrics("org-001", "ou-001");
      const fuelPredictions = await predictFuelConsumption("veh-001", "org-001", "ou-001");
      const maintenancePredictions = await predictMaintenanceCost("veh-001", "org-001", "ou-001");
      const recommendations = await generateFleetOptimizationRecommendations("org-001", "ou-001");

      expect(metrics).toBeDefined();
      expect(fuelPredictions).toBeDefined();
      expect(maintenancePredictions).toBeDefined();
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should integrate GPS tracking with analytics", async () => {
      const gpsAdapter = new GPSProviderAdapter("google", "test-key");
      const location = await gpsAdapter.getVehicleLocation("veh-001");
      const metrics = await getAnalyticsMetrics("org-001", "ou-001");

      expect(location).toBeDefined();
      expect(metrics).toBeDefined();
      expect(location?.vehicleId).toBe("veh-001");
      expect(metrics.totalVehicles).toBeGreaterThanOrEqual(0);
    });

    it("should integrate fuel card data with consumption predictions", async () => {
      const fuelCardAdapter = new FuelCardAdapter("fuelcard", "test-key", "account");
      const transactions = await fuelCardAdapter.getTransactions(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );
      const predictions = await predictFuelConsumption("veh-001", "org-001", "ou-001");

      expect(Array.isArray(transactions)).toBe(true);
      expect(predictions).toBeDefined();
    });

    it("should integrate insurance data with maintenance predictions", async () => {
      const insuranceAdapter = new InsuranceAdapter("allianz", "test-key", "account");
      const policies = await insuranceAdapter.getPolicies();
      const predictions = await predictMaintenanceCost("veh-001", "org-001", "ou-001");

      expect(Array.isArray(policies)).toBe(true);
      expect(predictions).toBeDefined();
    });
  });
});
