/**
 * Fleet Analytics Router
 * Handles fuel analytics, maintenance predictions, and compliance tracking
 * Uses scopedProcedure for multi-tenant data isolation
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, desc, isNull, count, sum, avg, gte, lte, between } from "drizzle-orm";
import {
  vehicles,
  fuelLogs,
  vehicleMaintenance,
  tripLogs,
} from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";

// ============================================================================
// FUEL ANALYTICS PROCEDURES
// ============================================================================

const fuelAnalyticsRouter = router({
  getFuelConsumptionTrends: scopedProcedure
    .input(z.object({
      vehicleId: z.string().optional(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const conditions: any[] = [
        eq(fuelLogs.organizationId, organizationId),
        isNull(fuelLogs.deletedAt),
        between(fuelLogs.date, input.startDate, input.endDate),
      ];

      if (input.vehicleId) {
        conditions.push(eq(fuelLogs.vehicleId, input.vehicleId));
      }

      const trends = await db
        .select({
          date: fuelLogs.date,
          totalFuel: sum(fuelLogs.fuelConsumed),
          totalCost: sum(fuelLogs.cost),
          avgPrice: avg(fuelLogs.pricePerUnit),
        })
        .from(fuelLogs)
        .where(and(...conditions))
        .orderBy(fuelLogs.date);

      return trends;
    }),

  getFuelEfficiencyMetrics: scopedProcedure
    .input(z.object({
      vehicleId: z.string().optional(),
      dateRange: z.enum(["week", "month", "quarter", "year"]).default("month"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (input.dateRange) {
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(now.getMonth() - 3);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const conditions: any[] = [
        eq(fuelLogs.organizationId, organizationId),
        isNull(fuelLogs.deletedAt),
        between(fuelLogs.date, startDate, now),
      ];

      if (input.vehicleId) {
        conditions.push(eq(fuelLogs.vehicleId, input.vehicleId));
      }

      // Get fuel and trip data
      const fuelData = await db
        .select({
          totalFuel: sum(fuelLogs.fuelConsumed),
          totalCost: sum(fuelLogs.cost),
          avgPrice: avg(fuelLogs.pricePerUnit),
        })
        .from(fuelLogs)
        .where(and(...conditions));

      // Get trip distance for efficiency calculation
      const tripData = await db
        .select({
          totalDistance: sum(tripLogs.distance),
        })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.organizationId, organizationId),
            isNull(tripLogs.deletedAt),
            between(tripLogs.createdAt, startDate, now),
            ...(input.vehicleId ? [eq(tripLogs.vehicleId, input.vehicleId)] : [])
          )
        );

      const fuel = fuelData[0] || { totalFuel: 0, totalCost: 0, avgPrice: 0 };
      const trip = tripData[0] || { totalDistance: 0 };

      const efficiency = trip.totalDistance && fuel.totalFuel 
        ? parseFloat((trip.totalDistance / fuel.totalFuel).toFixed(2))
        : 0;

      return {
        totalFuel: fuel.totalFuel || 0,
        totalCost: fuel.totalCost || 0,
        avgPrice: fuel.avgPrice || 0,
        totalDistance: trip.totalDistance || 0,
        efficiency,
        costPerKm: trip.totalDistance ? parseFloat((fuel.totalCost / trip.totalDistance).toFixed(2)) : 0,
      };
    }),

  getFuelAnomalies: scopedProcedure
    .input(z.object({
      vehicleId: z.string(),
      threshold: z.number().default(1.5), // 1.5x average consumption
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get vehicle's average fuel consumption
      const avgStats = await db
        .select({
          avgConsumption: avg(fuelLogs.fuelConsumed),
        })
        .from(fuelLogs)
        .where(
          and(
            eq(fuelLogs.vehicleId, input.vehicleId),
            eq(fuelLogs.organizationId, organizationId),
            isNull(fuelLogs.deletedAt)
          )
        );

      const avgConsumption = avgStats[0]?.avgConsumption || 0;
      const threshold = avgConsumption * input.threshold;

      // Get anomalies
      const anomalies = await db.query.fuelLogs.findMany({
        where: and(
          eq(fuelLogs.vehicleId, input.vehicleId),
          eq(fuelLogs.organizationId, organizationId),
          isNull(fuelLogs.deletedAt),
          gte(fuelLogs.fuelConsumed, threshold)
        ),
        orderBy: desc(fuelLogs.date),
        limit: 20,
      });

      return {
        avgConsumption: parseFloat(avgConsumption.toFixed(2)),
        threshold: parseFloat(threshold.toFixed(2)),
        anomalies: anomalies.map((log) => ({
          date: log.date,
          consumption: log.fuelConsumed,
          deviation: parseFloat(((log.fuelConsumed - avgConsumption) / avgConsumption * 100).toFixed(2)),
          tripId: log.tripId,
        })),
      };
    }),
});

// ============================================================================
// MAINTENANCE PREDICTION PROCEDURES
// ============================================================================

const maintenancePredictorRouter = router({
  getMaintenancePredictions: scopedProcedure
    .input(z.object({
      vehicleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get vehicle info
      const vehicle = await db.query.vehicles.findFirst({
        where: and(
          eq(vehicles.id, input.vehicleId),
          eq(vehicles.organizationId, organizationId),
          eq(vehicles.operatingUnitId, operatingUnitId),
          isNull(vehicles.deletedAt)
        ),
      });

      if (!vehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vehicle not found",
        });
      }

      // Get recent maintenance records
      const maintenanceRecords = await db.query.vehicleMaintenance.findMany({
        where: and(
          eq(vehicleMaintenance.vehicleId, input.vehicleId),
          eq(vehicleMaintenance.organizationId, organizationId),
          isNull(vehicleMaintenance.deletedAt)
        ),
        orderBy: desc(vehicleMaintenance.maintenanceDate),
        limit: 10,
      });

      // Get vehicle mileage
      const tripStats = await db
        .select({
          totalDistance: sum(tripLogs.distance),
        })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.vehicleId, input.vehicleId),
            eq(tripLogs.organizationId, organizationId),
            isNull(tripLogs.deletedAt)
          )
        );

      const currentMileage = tripStats[0]?.totalDistance || 0;

      // Predict maintenance needs based on mileage intervals
      const predictions = [];

      // Oil change: every 5000 km
      const lastOilChange = maintenanceRecords.find((m) => m.maintenanceType === "oil_change");
      const oilChangeMileage = lastOilChange ? currentMileage - (lastOilChange.mileage || 0) : currentMileage;
      if (oilChangeMileage > 4500) {
        predictions.push({
          type: "oil_change",
          priority: oilChangeMileage > 5000 ? "high" : "medium",
          dueIn: Math.max(0, 5000 - oilChangeMileage),
          lastDone: lastOilChange?.maintenanceDate,
        });
      }

      // Tire rotation: every 10000 km
      const lastTireRotation = maintenanceRecords.find((m) => m.maintenanceType === "tire_rotation");
      const tireRotationMileage = lastTireRotation ? currentMileage - (lastTireRotation.mileage || 0) : currentMileage;
      if (tireRotationMileage > 9000) {
        predictions.push({
          type: "tire_rotation",
          priority: tireRotationMileage > 10000 ? "high" : "medium",
          dueIn: Math.max(0, 10000 - tireRotationMileage),
          lastDone: lastTireRotation?.maintenanceDate,
        });
      }

      // Brake inspection: every 20000 km
      const lastBrakeInspection = maintenanceRecords.find((m) => m.maintenanceType === "brake_inspection");
      const brakeInspectionMileage = lastBrakeInspection ? currentMileage - (lastBrakeInspection.mileage || 0) : currentMileage;
      if (brakeInspectionMileage > 18000) {
        predictions.push({
          type: "brake_inspection",
          priority: brakeInspectionMileage > 20000 ? "high" : "medium",
          dueIn: Math.max(0, 20000 - brakeInspectionMileage),
          lastDone: lastBrakeInspection?.maintenanceDate,
        });
      }

      return {
        currentMileage: parseFloat(currentMileage.toFixed(2)),
        predictions: predictions.sort((a, b) => a.dueIn - b.dueIn),
      };
    }),

  getMaintenanceSchedule: scopedProcedure
    .input(z.object({
      vehicleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const schedule = await db.query.vehicleMaintenance.findMany({
        where: and(
          eq(vehicleMaintenance.vehicleId, input.vehicleId),
          eq(vehicleMaintenance.organizationId, organizationId),
          isNull(vehicleMaintenance.deletedAt)
        ),
        orderBy: desc(vehicleMaintenance.maintenanceDate),
      });

      return schedule;
    }),

  getMaintenanceHistory: scopedProcedure
    .input(z.object({
      vehicleId: z.string(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const records = await db.query.vehicleMaintenance.findMany({
        where: and(
          eq(vehicleMaintenance.vehicleId, input.vehicleId),
          eq(vehicleMaintenance.organizationId, organizationId),
          isNull(vehicleMaintenance.deletedAt)
        ),
        orderBy: desc(vehicleMaintenance.maintenanceDate),
        limit: input.limit,
        offset: input.offset,
      });

      const total = await db
        .select({ count: count() })
        .from(vehicleMaintenance)
        .where(
          and(
            eq(vehicleMaintenance.vehicleId, input.vehicleId),
            eq(vehicleMaintenance.organizationId, organizationId),
            isNull(vehicleMaintenance.deletedAt)
          )
        );

      return {
        records,
        total: total[0]?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),
});

// ============================================================================
// EXPORT ROUTERS
// ============================================================================

export const fleetAnalyticsRouter = router({
  fuel: fuelAnalyticsRouter,
  maintenance: maintenancePredictorRouter,
});
