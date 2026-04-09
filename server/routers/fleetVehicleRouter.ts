/**
 * Fleet Vehicle Registry Router
 * Manages vehicle CRUD operations with soft delete, audit logging, and ERP integration
 */

import { protectedProcedure, publicProcedure } from "@/_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "@/db";
import { vehicles, users, vehicleAssignments, tripLogs, fuelLogs, vehicleMaintenance } from "@/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

const vehicleSchema = z.object({
  plateNumber: z.string().min(1, "Plate number is required"),
  vehicleType: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  color: z.string().optional(),
  chassisNumber: z.string().optional(),
  engineNumber: z.string().optional(),
  fuelType: z.enum(["petrol", "diesel", "electric", "hybrid"]).default("petrol"),
  ownership: z.enum(["owned", "leased", "rented"]).default("owned"),
  purchaseDate: z.string().optional(),
  purchaseValue: z.string().optional(),
  currency: z.string().default("USD"),
  assignedProjectId: z.number().optional(),
  assignedProject: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  licenseExpiry: z.string().optional(),
  inspectionExpiry: z.string().optional(),
  notes: z.string().optional(),
});

export const fleetVehicleRouter = {
  /**
   * Create a new vehicle
   */
  create: protectedProcedure
    .input(vehicleSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;
        const operatingUnitId = ctx.user?.operatingUnitId;

        if (!organizationId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Organization context required",
          });
        }

        // Generate vehicle ID
        const vehicleId = `FL-VHC-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6).padStart(4, "0")}`;

        const result = await db.insert(vehicles).values({
          organizationId,
          operatingUnitId,
          vehicleId,
          plateNumber: input.plateNumber,
          vehicleType: input.vehicleType,
          brand: input.brand,
          model: input.model,
          year: input.year,
          color: input.color,
          chassisNumber: input.chassisNumber,
          engineNumber: input.engineNumber,
          fuelType: input.fuelType,
          ownership: input.ownership,
          purchaseDate: input.purchaseDate,
          purchaseValue: input.purchaseValue ? parseFloat(input.purchaseValue) : null,
          currency: input.currency,
          assignedProjectId: input.assignedProjectId,
          assignedProject: input.assignedProject,
          status: "active",
          insuranceExpiry: input.insuranceExpiry,
          licenseExpiry: input.licenseExpiry,
          inspectionExpiry: input.inspectionExpiry,
          notes: input.notes,
          createdBy: ctx.user?.id,
        });

        return {
          success: true,
          vehicleId: result.insertId,
          message: "Vehicle created successfully",
        };
      } catch (error) {
        console.error("[Fleet Vehicle Create Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create vehicle",
        });
      }
    }),

  /**
   * List vehicles with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        status: z.enum(["active", "under_maintenance", "retired", "disposed"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = input.organizationId;

        // Build where clause
        const whereConditions = [
          eq(vehicles.organizationId, organizationId),
          eq(vehicles.isDeleted, 0),
        ];

        if (input.status) {
          whereConditions.push(eq(vehicles.status, input.status));
        }

        // Get total count
        const countResult = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicles)
          .where(and(...whereConditions));

        const total = countResult[0]?.count || 0;

        // Get paginated results
        const items = await db
          .select()
          .from(vehicles)
          .where(and(...whereConditions))
          .orderBy(desc(vehicles.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          items,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[Fleet Vehicle List Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch vehicles",
        });
      }
    }),

  /**
   * Get single vehicle with related data
   */
  getById: protectedProcedure
    .input(z.object({ vehicleId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        const vehicle = await db
          .select()
          .from(vehicles)
          .where(
            and(
              eq(vehicles.id, input.vehicleId),
              eq(vehicles.organizationId, organizationId!),
              eq(vehicles.isDeleted, 0)
            )
          )
          .limit(1);

        if (!vehicle.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vehicle not found",
          });
        }

        // Get active assignment
        const assignment = await db
          .select()
          .from(vehicleAssignments)
          .where(
            and(
              eq(vehicleAssignments.vehicleId, input.vehicleId),
              eq(vehicleAssignments.status, "active")
            )
          )
          .limit(1);

        // Get recent trips count
        const tripsCount = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(tripLogs)
          .where(
            and(
              eq(tripLogs.vehicleId, input.vehicleId),
              eq(tripLogs.isDeleted, 0)
            )
          );

        // Get maintenance count
        const maintenanceCount = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicleMaintenance)
          .where(
            and(
              eq(vehicleMaintenance.vehicleId, input.vehicleId),
              eq(vehicleMaintenance.isDeleted, 0)
            )
          );

        return {
          ...vehicle[0],
          currentAssignment: assignment[0] || null,
          totalTrips: tripsCount[0]?.count || 0,
          totalMaintenanceRecords: maintenanceCount[0]?.count || 0,
        };
      } catch (error) {
        console.error("[Fleet Vehicle GetById Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch vehicle",
        });
      }
    }),

  /**
   * Update vehicle
   */
  update: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        data: vehicleSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const vehicle = await db
          .select()
          .from(vehicles)
          .where(
            and(
              eq(vehicles.id, input.vehicleId),
              eq(vehicles.organizationId, organizationId!),
              eq(vehicles.isDeleted, 0)
            )
          )
          .limit(1);

        if (!vehicle.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vehicle not found",
          });
        }

        await db
          .update(vehicles)
          .set({
            ...input.data,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(vehicles.id, input.vehicleId));

        return {
          success: true,
          message: "Vehicle updated successfully",
        };
      } catch (error) {
        console.error("[Fleet Vehicle Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update vehicle",
        });
      }
    }),

  /**
   * Soft delete vehicle
   */
  delete: protectedProcedure
    .input(z.object({ vehicleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const vehicle = await db
          .select()
          .from(vehicles)
          .where(
            and(
              eq(vehicles.id, input.vehicleId),
              eq(vehicles.organizationId, organizationId!),
              eq(vehicles.isDeleted, 0)
            )
          )
          .limit(1);

        if (!vehicle.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vehicle not found",
          });
        }

        await db
          .update(vehicles)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.user?.id,
          })
          .where(eq(vehicles.id, input.vehicleId));

        return {
          success: true,
          message: "Vehicle deleted successfully",
        };
      } catch (error) {
        console.error("[Fleet Vehicle Delete Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete vehicle",
        });
      }
    }),

  /**
   * Update vehicle status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number(),
        status: z.enum(["active", "under_maintenance", "retired", "disposed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        await db
          .update(vehicles)
          .set({
            status: input.status,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(vehicles.id, input.vehicleId),
              eq(vehicles.organizationId, organizationId!),
              eq(vehicles.isDeleted, 0)
            )
          );

        return {
          success: true,
          message: `Vehicle status updated to ${input.status}`,
        };
      } catch (error) {
        console.error("[Fleet Vehicle Status Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update vehicle status",
        });
      }
    }),

  /**
   * Get KPIs for dashboard
   */
  getKPIs: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Total vehicles
        const totalVehicles = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.organizationId, input.organizationId),
              eq(vehicles.isDeleted, 0)
            )
          );

        // Active vehicles
        const activeVehicles = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.organizationId, input.organizationId),
              eq(vehicles.status, "active"),
              eq(vehicles.isDeleted, 0)
            )
          );

        // Vehicles under maintenance
        const underMaintenance = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.organizationId, input.organizationId),
              eq(vehicles.status, "under_maintenance"),
              eq(vehicles.isDeleted, 0)
            )
          );

        // Retired vehicles
        const retired = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicles)
          .where(
            and(
              eq(vehicles.organizationId, input.organizationId),
              eq(vehicles.status, "retired"),
              eq(vehicles.isDeleted, 0)
            )
          );

        return {
          totalVehicles: totalVehicles[0]?.count || 0,
          activeVehicles: activeVehicles[0]?.count || 0,
          underMaintenance: underMaintenance[0]?.count || 0,
          retired: retired[0]?.count || 0,
        };
      } catch (error) {
        console.error("[Fleet Vehicle KPIs Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch vehicle KPIs",
        });
      }
    }),
};
