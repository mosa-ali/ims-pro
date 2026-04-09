/**
 * Fleet Reporting Router
 * Handles fleet dashboard, KPI reports, compliance tracking, and governance
 * Uses scopedProcedure for multi-tenant data isolation
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, desc, isNull, count, sum, avg, gte, lte } from "drizzle-orm";
import {
  vehicles,
  drivers,
  tripLogs,
  fuelLogs,
  vehicleMaintenance,
} from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";

// ============================================================================
// FLEET DASHBOARD PROCEDURES
// ============================================================================

const fleetDashboardRouter = router({
  getFleetOverview: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get vehicle count by status
      const vehicleStats = await db
        .select({
          status: vehicles.status,
          count: count(),
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.organizationId, organizationId),
            eq(vehicles.operatingUnitId, operatingUnitId),
            isNull(vehicles.deletedAt)
          )
        )
        .groupBy(vehicles.status);

      // Get driver count
      const driverCount = await db
        .select({ count: count() })
        .from(drivers)
        .where(
          and(
            eq(drivers.organizationId, organizationId),
            eq(drivers.operatingUnitId, operatingUnitId),
            isNull(drivers.deletedAt)
          )
        );

      // Get today's trips
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayTrips = await db
        .select({ count: count() })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.organizationId, organizationId),
            gte(tripLogs.createdAt, today),
            lte(tripLogs.createdAt, tomorrow),
            isNull(tripLogs.deletedAt)
          )
        );

      // Get total distance today
      const todayDistance = await db
        .select({ total: sum(tripLogs.distance) })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.organizationId, organizationId),
            gte(tripLogs.createdAt, today),
            lte(tripLogs.createdAt, tomorrow),
            isNull(tripLogs.deletedAt)
          )
        );

      // Get fuel consumption today
      const todayFuel = await db
        .select({ total: sum(fuelLogs.fuelConsumed) })
        .from(fuelLogs)
        .where(
          and(
            eq(fuelLogs.organizationId, organizationId),
            gte(fuelLogs.date, today),
            lte(fuelLogs.date, tomorrow),
            isNull(fuelLogs.deletedAt)
          )
        );

      // Get maintenance due count
      const maintenanceDue = await db
        .select({ count: count() })
        .from(vehicleMaintenance)
        .where(
          and(
            eq(vehicleMaintenance.organizationId, organizationId),
            lte(vehicleMaintenance.nextMaintenanceDate, new Date()),
            isNull(vehicleMaintenance.deletedAt)
          )
        );

      return {
        totalVehicles: vehicleStats.reduce((sum, stat) => sum + (stat.count || 0), 0),
        vehiclesByStatus: Object.fromEntries(
          vehicleStats.map((stat) => [stat.status || "unknown", stat.count || 0])
        ),
        totalDrivers: driverCount[0]?.count || 0,
        todayTrips: todayTrips[0]?.count || 0,
        todayDistance: todayDistance[0]?.total || 0,
        todayFuel: todayFuel[0]?.total || 0,
        maintenanceDue: maintenanceDue[0]?.count || 0,
      };
    }),

  getFleetStatusDistribution: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const distribution = await db
        .select({
          status: vehicles.status,
          count: count(),
        })
        .from(vehicles)
        .where(
          and(
            eq(vehicles.organizationId, organizationId),
            eq(vehicles.operatingUnitId, operatingUnitId),
            isNull(vehicles.deletedAt)
          )
        )
        .groupBy(vehicles.status);

      return Object.fromEntries(
        distribution.map((item) => [item.status || "unknown", item.count || 0])
      );
    }),

  getFleetPerformanceMetrics: scopedProcedure
    .input(z.object({
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

      // Get trip metrics
      const tripMetrics = await db
        .select({
          totalTrips: count(),
          totalDistance: sum(tripLogs.distance),
          avgDistance: avg(tripLogs.distance),
        })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.organizationId, organizationId),
            gte(tripLogs.createdAt, startDate),
            lte(tripLogs.createdAt, now),
            isNull(tripLogs.deletedAt)
          )
        );

      // Get fuel metrics
      const fuelMetrics = await db
        .select({
          totalFuel: sum(fuelLogs.fuelConsumed),
          totalCost: sum(fuelLogs.cost),
          avgPrice: avg(fuelLogs.pricePerUnit),
        })
        .from(fuelLogs)
        .where(
          and(
            eq(fuelLogs.organizationId, organizationId),
            gte(fuelLogs.date, startDate),
            lte(fuelLogs.date, now),
            isNull(fuelLogs.deletedAt)
          )
        );

      const trip = tripMetrics[0] || { totalTrips: 0, totalDistance: 0, avgDistance: 0 };
      const fuel = fuelMetrics[0] || { totalFuel: 0, totalCost: 0, avgPrice: 0 };

      const efficiency = trip.totalDistance && fuel.totalFuel
        ? parseFloat((trip.totalDistance / fuel.totalFuel).toFixed(2))
        : 0;

      return {
        trips: {
          total: trip.totalTrips || 0,
          distance: trip.totalDistance || 0,
          avgDistance: trip.avgDistance || 0,
        },
        fuel: {
          consumed: fuel.totalFuel || 0,
          cost: fuel.totalCost || 0,
          avgPrice: fuel.avgPrice || 0,
        },
        efficiency,
        costPerKm: trip.totalDistance ? parseFloat((fuel.totalCost / trip.totalDistance).toFixed(2)) : 0,
      };
    }),
});

// ============================================================================
// KPI REPORTS PROCEDURES
// ============================================================================

const kpiReportsRouter = router({
  getOperationalKPIs: scopedProcedure
    .input(z.object({
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

      const tripStats = await db
        .select({
          totalTrips: count(),
          totalDistance: sum(tripLogs.distance),
          avgDistance: avg(tripLogs.distance),
        })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.organizationId, organizationId),
            gte(tripLogs.createdAt, startDate),
            lte(tripLogs.createdAt, now),
            isNull(tripLogs.deletedAt)
          )
        );

      const trip = tripStats[0] || { totalTrips: 0, totalDistance: 0, avgDistance: 0 };

      return {
        totalTrips: trip.totalTrips || 0,
        totalDistance: trip.totalDistance || 0,
        avgDistance: trip.avgDistance || 0,
        tripsPerDay: trip.totalTrips ? parseFloat((trip.totalTrips / 30).toFixed(2)) : 0,
        distancePerDay: trip.totalDistance ? parseFloat((trip.totalDistance / 30).toFixed(2)) : 0,
      };
    }),

  getFinancialKPIs: scopedProcedure
    .input(z.object({
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

      const fuelStats = await db
        .select({
          totalCost: sum(fuelLogs.cost),
          avgCost: avg(fuelLogs.cost),
        })
        .from(fuelLogs)
        .where(
          and(
            eq(fuelLogs.organizationId, organizationId),
            gte(fuelLogs.date, startDate),
            lte(fuelLogs.date, now),
            isNull(fuelLogs.deletedAt)
          )
        );

      const maintenanceStats = await db
        .select({
          totalCost: sum(vehicleMaintenance.cost),
          avgCost: avg(vehicleMaintenance.cost),
        })
        .from(vehicleMaintenance)
        .where(
          and(
            eq(vehicleMaintenance.organizationId, organizationId),
            gte(vehicleMaintenance.maintenanceDate, startDate),
            lte(vehicleMaintenance.maintenanceDate, now),
            isNull(vehicleMaintenance.deletedAt)
          )
        );

      const fuel = fuelStats[0] || { totalCost: 0, avgCost: 0 };
      const maintenance = maintenanceStats[0] || { totalCost: 0, avgCost: 0 };

      return {
        fuelCost: fuel.totalCost || 0,
        maintenanceCost: maintenance.totalCost || 0,
        totalOperatingCost: (fuel.totalCost || 0) + (maintenance.totalCost || 0),
        avgFuelCost: fuel.avgCost || 0,
        avgMaintenanceCost: maintenance.avgCost || 0,
      };
    }),

  getSafetyKPIs: scopedProcedure
    .input(z.object({
      dateRange: z.enum(["week", "month", "quarter", "year"]).default("month"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get driver safety scores
      const driverStats = await db
        .select({
          avgRating: avg(drivers.rating),
          avgSafetyScore: avg(drivers.safetyScore),
        })
        .from(drivers)
        .where(
          and(
            eq(drivers.organizationId, organizationId),
            eq(drivers.operatingUnitId, operatingUnitId),
            isNull(drivers.deletedAt)
          )
        );

      const stats = driverStats[0] || { avgRating: 0, avgSafetyScore: 0 };

      return {
        avgDriverRating: stats.avgRating || 0,
        avgSafetyScore: stats.avgSafetyScore || 0,
        safetyIncidents: 0, // Placeholder
        accidentRate: 0, // Placeholder
      };
    }),

  getEfficiencyKPIs: scopedProcedure
    .input(z.object({
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

      // Get trip and fuel data
      const tripStats = await db
        .select({
          totalDistance: sum(tripLogs.distance),
        })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.organizationId, organizationId),
            gte(tripLogs.createdAt, startDate),
            lte(tripLogs.createdAt, now),
            isNull(tripLogs.deletedAt)
          )
        );

      const fuelStats = await db
        .select({
          totalFuel: sum(fuelLogs.fuelConsumed),
        })
        .from(fuelLogs)
        .where(
          and(
            eq(fuelLogs.organizationId, organizationId),
            gte(fuelLogs.date, startDate),
            lte(fuelLogs.date, now),
            isNull(fuelLogs.deletedAt)
          )
        );

      const trip = tripStats[0] || { totalDistance: 0 };
      const fuel = fuelStats[0] || { totalFuel: 0 };

      const efficiency = trip.totalDistance && fuel.totalFuel
        ? parseFloat((trip.totalDistance / fuel.totalFuel).toFixed(2))
        : 0;

      return {
        fuelEfficiency: efficiency,
        kmPerLiter: efficiency,
        vehicleUtilization: 0, // Placeholder
        routeOptimization: 0, // Placeholder
      };
    }),
});

// ============================================================================
// COMPLIANCE PROCEDURES
// ============================================================================

const complianceRouter = router({
  getComplianceStatus: scopedProcedure
    .input(z.object({
      vehicleId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const conditions: any[] = [
        eq(vehicles.organizationId, organizationId),
        eq(vehicles.operatingUnitId, operatingUnitId),
        isNull(vehicles.deletedAt),
      ];

      if (input.vehicleId) {
        conditions.push(eq(vehicles.id, input.vehicleId));
      }

      const vehicleList = await db.query.vehicles.findMany({
        where: and(...conditions),
      });

      return vehicleList.map((v) => ({
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        insuranceExpiry: v.insuranceExpiry,
        pollutionCertificateExpiry: v.pollutionCertificateExpiry,
        complianceStatus: "compliant", // Placeholder
      }));
    }),

  getComplianceDocuments: scopedProcedure
    .input(z.object({
      vehicleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

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

      return {
        registration: {
          number: vehicle.registrationNumber,
          expiry: vehicle.registrationExpiry,
        },
        insurance: {
          provider: vehicle.insuranceProvider,
          expiry: vehicle.insuranceExpiry,
        },
        pollution: {
          certificate: vehicle.pollutionCertificateExpiry,
        },
      };
    }),

  getComplianceInspections: scopedProcedure
    .input(z.object({
      vehicleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const inspections = await db.query.vehicleMaintenance.findMany({
        where: and(
          eq(vehicleMaintenance.vehicleId, input.vehicleId),
          eq(vehicleMaintenance.organizationId, organizationId),
          isNull(vehicleMaintenance.deletedAt)
        ),
        orderBy: desc(vehicleMaintenance.maintenanceDate),
      });

      return inspections;
    }),
});

// ============================================================================
// EXPORT ROUTERS
// ============================================================================

export const fleetReportingRouter = router({
  dashboard: fleetDashboardRouter,
  kpi: kpiReportsRouter,
  compliance: complianceRouter,
});
