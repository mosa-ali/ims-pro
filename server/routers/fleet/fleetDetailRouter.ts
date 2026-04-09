/**
 * Fleet Detail Router
 * Handles vehicle detail page, driver profiles, trip analytics, and related data
 * Uses scopedProcedure for multi-tenant data isolation (organizationId, operatingUnitId)
 */

import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "../../_core/trpc";
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
// VEHICLE DETAIL PROCEDURES
// ============================================================================

const vehicleDetailRouter = router({
  getVehicleDetail: scopedProcedure
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

      return vehicle;
    }),

  getVehicleStatistics: scopedProcedure
    .input(z.object({
      vehicleId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify vehicle exists and belongs to org/ou
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

      // Get trip statistics
      const tripStats = await db
        .select({
          totalTrips: count(),
          totalDistance: sum(tripLogs.distance),
          avgDistance: avg(tripLogs.distance),
        })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.vehicleId, input.vehicleId),
            eq(tripLogs.organizationId, organizationId),
            isNull(tripLogs.deletedAt)
          )
        );

      // Get fuel statistics
      const fuelStats = await db
        .select({
          totalFuel: sum(fuelLogs.fuelConsumed),
          avgConsumption: avg(fuelLogs.fuelConsumed),
          totalCost: sum(fuelLogs.cost),
        })
        .from(fuelLogs)
        .where(
          and(
            eq(fuelLogs.vehicleId, input.vehicleId),
            eq(fuelLogs.organizationId, organizationId),
            isNull(fuelLogs.deletedAt)
          )
        );

      // Get maintenance statistics
      const maintenanceStats = await db
        .select({
          totalRecords: count(),
          totalCost: sum(vehicleMaintenance.cost),
        })
        .from(vehicleMaintenance)
        .where(
          and(
            eq(vehicleMaintenance.vehicleId, input.vehicleId),
            eq(vehicleMaintenance.organizationId, organizationId),
            isNull(vehicleMaintenance.deletedAt)
          )
        );

      return {
        trips: tripStats[0] || { totalTrips: 0, totalDistance: 0, avgDistance: 0 },
        fuel: fuelStats[0] || { totalFuel: 0, avgConsumption: 0, totalCost: 0 },
        maintenance: maintenanceStats[0] || { totalRecords: 0, totalCost: 0 },
      };
    }),

  getVehicleAuditTrail: scopedProcedure
    .input(z.object({
      vehicleId: z.string(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get vehicle audit trail (createdAt, updatedAt, createdBy, updatedBy)
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
        createdAt: vehicle.createdAt,
        createdBy: vehicle.createdBy,
        updatedAt: vehicle.updatedAt,
        updatedBy: vehicle.updatedBy,
        deletedAt: vehicle.deletedAt,
        deletedBy: vehicle.deletedBy,
      };
    }),

  canCreateTrip: scopedProcedure
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
        return { canCreate: false, reason: "Vehicle not found" };
      }

      // Check if vehicle is in active status
      if (vehicle.status !== "active") {
        return { canCreate: false, reason: `Vehicle status is ${vehicle.status}` };
      }

      // Check if vehicle has a driver assigned
      if (!vehicle.assignedDriverId) {
        return { canCreate: false, reason: "No driver assigned" };
      }

      return { canCreate: true, reason: "Vehicle ready for trip" };
    }),
});

// ============================================================================
// DRIVER DETAIL PROCEDURES
// ============================================================================

const driverDetailRouter = router({
  getDriverDetail: scopedProcedure
    .input(z.object({
      driverId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const driver = await db.query.drivers.findFirst({
        where: and(
          eq(drivers.id, input.driverId),
          eq(drivers.organizationId, organizationId),
          eq(drivers.operatingUnitId, operatingUnitId),
          isNull(drivers.deletedAt)
        ),
      });

      if (!driver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver not found",
        });
      }

      return driver;
    }),

  getDriverPerformance: scopedProcedure
    .input(z.object({
      driverId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify driver exists
      const driver = await db.query.drivers.findFirst({
        where: and(
          eq(drivers.id, input.driverId),
          eq(drivers.organizationId, organizationId),
          eq(drivers.operatingUnitId, operatingUnitId),
          isNull(drivers.deletedAt)
        ),
      });

      if (!driver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver not found",
        });
      }

      // Get driver trip statistics
      const tripStats = await db
        .select({
          totalTrips: count(),
          totalDistance: sum(tripLogs.distance),
          avgDistance: avg(tripLogs.distance),
        })
        .from(tripLogs)
        .where(
          and(
            eq(tripLogs.driverId, input.driverId),
            eq(tripLogs.organizationId, organizationId),
            isNull(tripLogs.deletedAt)
          )
        );

      // Get driver fuel efficiency
      const fuelStats = await db
        .select({
          avgConsumption: avg(fuelLogs.fuelConsumed),
          totalCost: sum(fuelLogs.cost),
        })
        .from(fuelLogs)
        .where(
          and(
            eq(fuelLogs.driverId, input.driverId),
            eq(fuelLogs.organizationId, organizationId),
            isNull(fuelLogs.deletedAt)
          )
        );

      return {
        trips: tripStats[0] || { totalTrips: 0, totalDistance: 0, avgDistance: 0 },
        fuel: fuelStats[0] || { avgConsumption: 0, totalCost: 0 },
        rating: driver.rating || 0,
        safetyScore: driver.safetyScore || 0,
      };
    }),

  getDriverAssignmentHistory: scopedProcedure
    .input(z.object({
      driverId: z.string(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get driver's recent trips (assignment history)
      const trips = await db.query.tripLogs.findMany({
        where: and(
          eq(tripLogs.driverId, input.driverId),
          eq(tripLogs.organizationId, organizationId),
          isNull(tripLogs.deletedAt)
        ),
        orderBy: desc(tripLogs.createdAt),
        limit: input.limit,
        offset: input.offset,
      });

      return trips.map((trip) => ({
        tripId: trip.id,
        vehicleId: trip.vehicleId,
        startDate: trip.startDate,
        endDate: trip.endDate,
        distance: trip.distance,
        status: trip.status,
      }));
    }),

  getDriverLicenseStatus: scopedProcedure
    .input(z.object({
      driverId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const driver = await db.query.drivers.findFirst({
        where: and(
          eq(drivers.id, input.driverId),
          eq(drivers.organizationId, organizationId),
          eq(drivers.operatingUnitId, operatingUnitId),
          isNull(drivers.deletedAt)
        ),
      });

      if (!driver) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Driver not found",
        });
      }

      const licenseExpiryDate = new Date(driver.licenseExpiry);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (licenseExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        licenseNumber: driver.licenseNumber,
        licenseExpiry: driver.licenseExpiry,
        isExpired: daysUntilExpiry < 0,
        expiresIn: Math.max(daysUntilExpiry, 0),
        status: daysUntilExpiry < 0 ? "expired" : daysUntilExpiry < 30 ? "expiring_soon" : "valid",
      };
    }),
});

// ============================================================================
// TRIP DETAIL PROCEDURES
// ============================================================================

const tripDetailRouter = router({
  getTripDetail: scopedProcedure
    .input(z.object({
      tripId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const trip = await db.query.tripLogs.findFirst({
        where: and(
          eq(tripLogs.id, input.tripId),
          eq(tripLogs.organizationId, organizationId),
          isNull(tripLogs.deletedAt)
        ),
      });

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      return trip;
    }),

  getTripFuelConsumption: scopedProcedure
    .input(z.object({
      tripId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get fuel logs for this trip
      const fuelLogs_data = await db.query.fuelLogs.findMany({
        where: and(
          eq(fuelLogs.tripId, input.tripId),
          eq(fuelLogs.organizationId, organizationId),
          isNull(fuelLogs.deletedAt)
        ),
      });

      const totalFuel = fuelLogs_data.reduce((sum, log) => sum + (log.fuelConsumed || 0), 0);
      const totalCost = fuelLogs_data.reduce((sum, log) => sum + (log.cost || 0), 0);

      return {
        totalFuel,
        totalCost,
        averagePrice: fuelLogs_data.length > 0 ? totalCost / fuelLogs_data.length : 0,
        logs: fuelLogs_data,
      };
    }),

  getTripEfficiency: scopedProcedure
    .input(z.object({
      tripId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const trip = await db.query.tripLogs.findFirst({
        where: and(
          eq(tripLogs.id, input.tripId),
          eq(tripLogs.organizationId, organizationId),
          isNull(tripLogs.deletedAt)
        ),
      });

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      // Get fuel consumption for this trip
      const fuelLogs_data = await db.query.fuelLogs.findMany({
        where: and(
          eq(fuelLogs.tripId, input.tripId),
          eq(fuelLogs.organizationId, organizationId),
          isNull(fuelLogs.deletedAt)
        ),
      });

      const totalFuel = fuelLogs_data.reduce((sum, log) => sum + (log.fuelConsumed || 0), 0);
      const distance = trip.distance || 0;
      const efficiency = distance > 0 && totalFuel > 0 ? distance / totalFuel : 0;

      return {
        distance,
        fuelConsumed: totalFuel,
        efficiency: parseFloat(efficiency.toFixed(2)),
        duration: trip.endDate && trip.startDate 
          ? Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60))
          : 0,
      };
    }),

  getTripAuditTrail: scopedProcedure
    .input(z.object({
      tripId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      const trip = await db.query.tripLogs.findFirst({
        where: and(
          eq(tripLogs.id, input.tripId),
          eq(tripLogs.organizationId, organizationId),
          isNull(tripLogs.deletedAt)
        ),
      });

      if (!trip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trip not found",
        });
      }

      return {
        createdAt: trip.createdAt,
        createdBy: trip.createdBy,
        updatedAt: trip.updatedAt,
        updatedBy: trip.updatedBy,
        deletedAt: trip.deletedAt,
        deletedBy: trip.deletedBy,
      };
    }),
});

// ============================================================================
// EXPORT ROUTERS
// ============================================================================

export const fleetDetailRouter = router({
  vehicle: vehicleDetailRouter,
  driver: driverDetailRouter,
  trip: tripDetailRouter,
});
