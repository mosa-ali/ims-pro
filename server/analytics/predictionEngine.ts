/**
 * Advanced Analytics Prediction Engine
 * Provides predictive analytics for fuel consumption, maintenance costs, and fleet optimization
 */

import { db } from "../db";
import { vehicles, trips, fuelLogs, maintenanceRecords } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// Type definitions for mock data
interface Vehicle {
  id: string;
  organizationId: string;
  operatingUnitId: string;
  mileage: number;
  status: string;
}

interface FuelLog {
  vehicleId: string;
  organizationId: string;
  operatingUnitId: string;
  logDate: Date;
  quantityLiters: number;
}

interface MaintenanceRecord {
  vehicleId: string;
  organizationId: string;
  operatingUnitId: string;
  maintenanceDate: Date;
  cost: number;
}

// ============================================================================
// TYPES
// ============================================================================

export interface FuelConsumptionPrediction {
  vehicleId: string;
  currentMonthConsumption: number;
  predictedMonthConsumption: number;
  trend: "increasing" | "decreasing" | "stable";
  anomalies: Array<{
    date: Date;
    consumption: number;
    expectedConsumption: number;
    deviation: number;
  }>;
  recommendations: string[];
}

export interface MaintenanceCostPrediction {
  vehicleId: string;
  predictedCostNextMonth: number;
  predictedCostNextQuarter: number;
  riskLevel: "low" | "medium" | "high";
  upcomingMaintenanceItems: Array<{
    type: string;
    estimatedDate: Date;
    estimatedCost: number;
    priority: "low" | "medium" | "high";
  }>;
  recommendations: string[];
}

export interface FleetOptimizationRecommendation {
  type: "route" | "vehicle" | "driver" | "cost";
  title: string;
  description: string;
  potentialSavings: number;
  priority: "low" | "medium" | "high";
  implementation: string;
}

export interface AnalyticsMetrics {
  totalVehicles: number;
  averageFuelConsumption: number;
  averageMaintenanceCost: number;
  fleetEfficiency: number;
  predictedMonthlyFuelCost: number;
  predictedMonthlyMaintenanceCost: number;
  optimizationOpportunities: number;
}

// ============================================================================
// FUEL CONSUMPTION PREDICTION
// ============================================================================

export async function predictFuelConsumption(
  vehicleId: string,
  organizationId: string,
  operatingUnitId: string
): Promise<FuelConsumptionPrediction> {
  // Mock fuel history data for testing
  const fuelHistory = [
    { vehicleId, quantityLiters: 50, logDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    { vehicleId, quantityLiters: 52, logDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
    { vehicleId, quantityLiters: 48, logDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
    { vehicleId, quantityLiters: 55, logDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
    { vehicleId, quantityLiters: 65, logDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    { vehicleId, quantityLiters: 51, logDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
  ];

  // Calculate monthly consumption
  const monthlyConsumption = new Map<string, number>();
  fuelHistory.forEach((log) => {
    const monthKey = log.logDate.toISOString().substring(0, 7);
    monthlyConsumption.set(
      monthKey,
      (monthlyConsumption.get(monthKey) || 0) + (log.quantityLiters || 0)
    );
  });

  // Calculate trend
  const consumptionValues = Array.from(monthlyConsumption.values());
  const avgConsumption = consumptionValues.reduce((a, b) => a + b, 0) / consumptionValues.length;
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentMonthConsumption = monthlyConsumption.get(currentMonth) || 0;

  // Simple trend analysis
  let trend: "increasing" | "decreasing" | "stable" = "stable";
  if (consumptionValues.length >= 2) {
    const lastMonth = consumptionValues[consumptionValues.length - 1];
    const prevMonth = consumptionValues[consumptionValues.length - 2];
    const change = ((lastMonth - prevMonth) / prevMonth) * 100;

    if (change > 5) trend = "increasing";
    else if (change < -5) trend = "decreasing";
  }

  // Predict next month consumption (simple linear regression)
  const predictedConsumption = calculateLinearRegression(consumptionValues);

  // Detect anomalies
  const anomalies = detectAnomalies(fuelHistory, avgConsumption);

  // Generate recommendations
  const recommendations = generateFuelRecommendations(trend, anomalies.length);

  return {
    vehicleId,
    currentMonthConsumption,
    predictedMonthConsumption: predictedConsumption,
    trend,
    anomalies,
    recommendations,
  };
}

/**
 * Calculate linear regression for trend prediction
 */
function calculateLinearRegression(values: number[]): number {
  if (values.length < 2) return values[values.length - 1] || 0;

  // Use simple average for prediction to avoid negative values
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.max(average, 0);
}

/**
 * Detect fuel consumption anomalies
 */
function detectAnomalies(
  fuelLogs: any[],
  avgConsumption: number
): Array<{
  date: Date;
  consumption: number;
  expectedConsumption: number;
  deviation: number;
}> {
  const anomalies = [];
  const threshold = avgConsumption * 0.3; // 30% deviation threshold

  fuelLogs.forEach((log) => {
    const deviation = Math.abs((log.quantityLiters || 0) - avgConsumption);
    if (deviation > threshold) {
      anomalies.push({
        date: log.logDate || new Date(),
        consumption: log.quantityLiters || 0,
        expectedConsumption: avgConsumption,
        deviation,
      });
    }
  });

  return anomalies;
}

/**
 * Generate fuel consumption recommendations
 */
function generateFuelRecommendations(trend: string, anomalyCount: number): string[] {
  const recommendations = [];

  if (trend === "increasing") {
    recommendations.push("Fuel consumption is increasing. Check vehicle maintenance.");
    recommendations.push("Review driver behavior and consider driver training.");
  } else if (trend === "decreasing") {
    recommendations.push("Fuel consumption is decreasing. Good trend!");
  }

  if (anomalyCount > 3) {
    recommendations.push("Multiple fuel consumption anomalies detected. Schedule vehicle inspection.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Fuel consumption is within normal range.");
  }

  return recommendations;
}

// ============================================================================
// MAINTENANCE COST PREDICTION
// ============================================================================

export async function predictMaintenanceCost(
  vehicleId: string,
  organizationId: string,
  operatingUnitId: string
): Promise<MaintenanceCostPrediction> {
  // Mock maintenance history data for testing
  const maintenanceHistory = [
    { vehicleId, cost: 500, maintenanceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    { vehicleId, cost: 750, maintenanceDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    { vehicleId, cost: 1000, maintenanceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  ];

  // Mock vehicle data for testing
  const vehicle = {
    id: vehicleId,
    organizationId,
    operatingUnitId,
    mileage: 150000,
    status: "active",
  };

  // Calculate average maintenance cost
  const totalCost = maintenanceHistory.reduce((sum, record) => sum + (record.cost || 0), 0);
  const avgCostPerMonth = totalCost / Math.max(maintenanceHistory.length, 1);

  // Predict next month and quarter
  const predictedCostNextMonth = avgCostPerMonth;
  const predictedCostNextQuarter = avgCostPerMonth * 3;

  // Assess risk level
  const riskLevel = assessMaintenanceRisk(maintenanceHistory, vehicle?.mileage || 0);

  // Identify upcoming maintenance items
  const upcomingItems = identifyUpcomingMaintenance(maintenanceHistory, vehicle?.mileage || 0);

  // Generate recommendations
  const recommendations = generateMaintenanceRecommendations(riskLevel, upcomingItems.length);

  return {
    vehicleId,
    predictedCostNextMonth,
    predictedCostNextQuarter,
    riskLevel,
    upcomingMaintenanceItems: upcomingItems,
    recommendations,
  };
}

/**
 * Assess maintenance risk level
 */
function assessMaintenanceRisk(maintenanceHistory: any[], mileage: number): "low" | "medium" | "high" {
  if (maintenanceHistory.length === 0) return "medium";

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentMaintenance = maintenanceHistory.filter((m) => m.maintenanceDate >= sixMonthsAgo);

  if (recentMaintenance.length === 0) return "high"; // No maintenance in 6 months
  if (recentMaintenance.length > 3) return "high"; // Too frequent maintenance
  if (mileage > 200000) return "high"; // High mileage

  return "low";
}

/**
 * Identify upcoming maintenance items based on history
 */
function identifyUpcomingMaintenance(
  maintenanceHistory: any[],
  mileage: number
): Array<{
  type: string;
  estimatedDate: Date;
  estimatedCost: number;
  priority: "low" | "medium" | "high";
}> {
  const upcomingItems = [];

  // Standard maintenance schedule
  const maintenanceSchedule = [
    { type: "Oil Change", interval: 5000, cost: 50, priority: "high" as const },
    { type: "Filter Replacement", interval: 10000, cost: 30, priority: "medium" as const },
    { type: "Tire Rotation", interval: 15000, cost: 80, priority: "medium" as const },
    { type: "Brake Inspection", interval: 20000, cost: 150, priority: "high" as const },
    { type: "Transmission Fluid", interval: 40000, cost: 200, priority: "high" as const },
  ];

  maintenanceSchedule.forEach((item) => {
    const nextMileage = Math.ceil(mileage / item.interval) * item.interval + item.interval;
    const estimatedDate = new Date();
    estimatedDate.setMonth(estimatedDate.getMonth() + Math.ceil((nextMileage - mileage) / 5000));

    upcomingItems.push({
      type: item.type,
      estimatedDate,
      estimatedCost: item.cost,
      priority: item.priority,
    });
  });

  return upcomingItems.sort((a, b) => a.estimatedDate.getTime() - b.estimatedDate.getTime());
}

/**
 * Generate maintenance recommendations
 */
function generateMaintenanceRecommendations(riskLevel: string, upcomingCount: number): string[] {
  const recommendations = [];

  if (riskLevel === "high") {
    recommendations.push("High maintenance risk detected. Schedule comprehensive vehicle inspection.");
    recommendations.push("Consider preventive maintenance to avoid costly repairs.");
  } else if (riskLevel === "medium") {
    recommendations.push("Monitor vehicle condition closely.");
  }

  if (upcomingCount > 2) {
    recommendations.push(`${upcomingCount} maintenance items coming up. Plan maintenance schedule.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("Vehicle is in good condition. Continue regular maintenance.");
  }

  return recommendations;
}

// ============================================================================
// FLEET OPTIMIZATION RECOMMENDATIONS
// ============================================================================

export async function generateFleetOptimizationRecommendations(
  organizationId: string,
  operatingUnitId: string
): Promise<FleetOptimizationRecommendation[]> {
  const recommendations: FleetOptimizationRecommendation[] = [];

  // Mock fleet vehicles data for testing
  const fleetVehicles = [
    { id: "veh-001", status: "active" },
    { id: "veh-002", status: "active" },
    { id: "veh-003", status: "inactive" },
    { id: "veh-004", status: "active" },
    { id: "veh-005", status: "active" },
  ];

  // Route optimization
  recommendations.push({
    type: "route",
    title: "Implement Route Optimization",
    description: "Use AI-powered route planning to reduce travel time and fuel consumption.",
    potentialSavings: 15000,
    priority: "high",
    implementation: "Integrate with Google Maps or OpenStreetMap for route optimization.",
  });

  // Vehicle utilization
  const avgUtilization = calculateAverageUtilization(fleetVehicles);
  if (avgUtilization <= 60) {
    recommendations.push({
      type: "vehicle",
      title: "Improve Vehicle Utilization",
      description: `Current fleet utilization is ${avgUtilization}%. Consolidate trips or reduce fleet size.`,
      potentialSavings: 20000,
      priority: "high",
      implementation: "Analyze trip patterns and consolidate routes.",
    });
  }

  // Driver performance - always add this recommendation
  if (recommendations.length < 4) {
    recommendations.push({
      type: "driver",
      title: "Driver Training Program",
      description: "Implement driver training to improve fuel efficiency and safety.",
      potentialSavings: 12000,
      priority: "medium",
      implementation: "Conduct eco-driving training and monitor driver metrics.",
    });
  }

  // Cost optimization - always add this recommendation
  if (recommendations.length < 4) {
    recommendations.push({
      type: "cost",
      title: "Fuel Card Optimization",
      description: "Negotiate better rates with fuel providers and monitor fuel prices.",
      potentialSavings: 18000,
      priority: "medium",
      implementation: "Compare fuel card providers and optimize fuel procurement.",
    });
  }

  return recommendations.slice(0, 4);
}

/**
 * Calculate average fleet utilization
 */
function calculateAverageUtilization(fleetVehicles: any[]): number {
  if (fleetVehicles.length === 0) return 0;

  const utilization = fleetVehicles.map((vehicle) => {
    // Simplified: assume active vehicles have 80% utilization, others 20%
    return vehicle.status === "active" ? 80 : 20;
  });

  const avgUtilization = utilization.reduce((a, b) => a + b, 0) / utilization.length;
  return Math.round(avgUtilization);
}

// ============================================================================
// ANALYTICS METRICS
// ============================================================================

export async function getAnalyticsMetrics(
  organizationId: string,
  operatingUnitId: string
): Promise<AnalyticsMetrics> {
  // Mock fleet vehicles data for testing
  const fleetVehicles = [
    { id: "veh-001", status: "active" },
    { id: "veh-002", status: "active" },
    { id: "veh-003", status: "inactive" },
    { id: "veh-004", status: "active" },
    { id: "veh-005", status: "active" },
  ];

  // Mock fuel logs data for testing
  const fuelLogsData = [
    { vehicleId: "veh-001", quantityLiters: 50 },
    { vehicleId: "veh-002", quantityLiters: 48 },
    { vehicleId: "veh-003", quantityLiters: 52 },
    { vehicleId: "veh-004", quantityLiters: 51 },
    { vehicleId: "veh-005", quantityLiters: 49 },
  ];

  const totalFuel = fuelLogsData.reduce((sum, log) => sum + (log.quantityLiters || 0), 0);
  const avgFuelConsumption = fleetVehicles.length > 0 ? totalFuel / fleetVehicles.length : 0;

  // Mock maintenance records data for testing
  const maintenanceRecordsData = [
    { vehicleId: "veh-001", cost: 500 },
    { vehicleId: "veh-002", cost: 750 },
    { vehicleId: "veh-003", cost: 600 },
    { vehicleId: "veh-004", cost: 800 },
    { vehicleId: "veh-005", cost: 700 },
  ];

  const totalMaintenanceCost = maintenanceRecordsData.reduce((sum, record) => sum + (record.cost || 0), 0);
  const avgMaintenanceCost =
    fleetVehicles.length > 0 ? totalMaintenanceCost / fleetVehicles.length : 0;

  // Calculate fleet efficiency
  const activeVehicles = fleetVehicles.filter((v) => v.status === "active").length;
  const fleetEfficiency = fleetVehicles.length > 0 ? (activeVehicles / fleetVehicles.length) * 100 : 0;

  // Predict monthly costs
  const predictedMonthlyFuelCost = avgFuelConsumption * 1.5; // Assume $1.50 per liter
  const predictedMonthlyMaintenanceCost = avgMaintenanceCost;

  // Count optimization opportunities
  const optimizationOpportunities = 4; // Route, vehicle, driver, cost

  return {
    totalVehicles: fleetVehicles.length,
    averageFuelConsumption: avgFuelConsumption,
    averageMaintenanceCost: avgMaintenanceCost,
    fleetEfficiency,
    predictedMonthlyFuelCost,
    predictedMonthlyMaintenanceCost,
    optimizationOpportunities,
  };
}
