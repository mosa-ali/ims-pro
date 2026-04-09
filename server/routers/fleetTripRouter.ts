/**
 * Fleet Trip Logs Router
 * Manages trip CRUD operations with workflow, soft delete, and ERP integration
 */

import { protectedProcedure } from "@/_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "@/db";
import { tripLogs, vehicles, drivers } from "@/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const tripSchema = z.object({
  vehicleId: z.number().min(1, "Vehicle is required"),
  driverId: z.number().optional(),
  tripDate: z.string().min(1, "Trip date is required"),
  purpose: z.string().optional(),
  purposeAr: z.string().optional(),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  startMileage: z.string().optional(),
  endMileage: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  passengers: z.string().optional(),
  projectCode: z.string().optional(),
  remarks: z.string().optional(),
});

export const fleetTripRouter = {
  /**
   * Create a new trip
   */
  create: protectedProcedure
    .input(tripSchema)
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

        // Verify vehicle exists
        const vehicle = await db
          .select()
          .from(vehicles)
          .where(
            and(
              eq(vehicles.id, input.vehicleId),
              eq(vehicles.organizationId, organizationId),
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

        // Generate trip number
        const tripNumber = `FL-TRP-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6).padStart(4, "0")}`;

        // Calculate distance if both mileages provided
        let distanceTraveled = null;
        if (input.startMileage && input.endMileage) {
          const start = parseFloat(input.startMileage);
          const end = parseFloat(input.endMileage);
          if (!isNaN(start) && !isNaN(end)) {
            distanceTraveled = end - start;
          }
        }

        const result = await db.insert(tripLogs).values({
          organizationId,
          operatingUnitId,
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          tripNumber,
          tripDate: input.tripDate,
          purpose: input.purpose,
          purposeAr: input.purposeAr,
          startLocation: input.startLocation,
          endLocation: input.endLocation,
          startMileage: input.startMileage ? parseFloat(input.startMileage) : null,
          endMileage: input.endMileage ? parseFloat(input.endMileage) : null,
          distanceTraveled,
          startTime: input.startTime,
          endTime: input.endTime,
          passengers: input.passengers,
          projectCode: input.projectCode,
          status: "planned",
          remarks: input.remarks,
          createdBy: ctx.user?.id,
        });

        return {
          success: true,
          tripId: result.insertId,
          message: "Trip created successfully",
        };
      } catch (error) {
        console.error("[Fleet Trip Create Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create trip",
        });
      }
    }),

  /**
   * List trips with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
        vehicleId: z.number().optional(),
        driverId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Build where clause
        const whereConditions = [
          eq(tripLogs.organizationId, input.organizationId),
          eq(tripLogs.isDeleted, 0),
        ];

        if (input.status) {
          whereConditions.push(eq(tripLogs.status, input.status));
        }

        if (input.vehicleId) {
          whereConditions.push(eq(tripLogs.vehicleId, input.vehicleId));
        }

        if (input.driverId) {
          whereConditions.push(eq(tripLogs.driverId, input.driverId));
        }

        // Get total count
        const countResult = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(tripLogs)
          .where(and(...whereConditions));

        const total = countResult[0]?.count || 0;

        // Get paginated results
        const items = await db
          .select()
          .from(tripLogs)
          .where(and(...whereConditions))
          .orderBy(desc(tripLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          items,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[Fleet Trip List Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch trips",
        });
      }
    }),

  /**
   * Get single trip
   */
  getById: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        const trip = await db
          .select()
          .from(tripLogs)
          .where(
            and(
              eq(tripLogs.id, input.tripId),
              eq(tripLogs.organizationId, organizationId!),
              eq(tripLogs.isDeleted, 0)
            )
          )
          .limit(1);

        if (!trip.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trip not found",
          });
        }

        return trip[0];
      } catch (error) {
        console.error("[Fleet Trip GetById Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch trip",
        });
      }
    }),

  /**
   * Update trip
   */
  update: protectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        data: tripSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const trip = await db
          .select()
          .from(tripLogs)
          .where(
            and(
              eq(tripLogs.id, input.tripId),
              eq(tripLogs.organizationId, organizationId!),
              eq(tripLogs.isDeleted, 0)
            )
          )
          .limit(1);

        if (!trip.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trip not found",
          });
        }

        // Calculate distance if both mileages provided
        let updateData: any = { ...input.data, updatedAt: new Date().toISOString() };
        if (input.data.startMileage || input.data.endMileage) {
          const start = input.data.startMileage ? parseFloat(input.data.startMileage) : trip[0]?.startMileage;
          const end = input.data.endMileage ? parseFloat(input.data.endMileage) : trip[0]?.endMileage;
          if (start && end) {
            updateData.distanceTraveled = end - start;
          }
        }

        await db
          .update(tripLogs)
          .set(updateData)
          .where(eq(tripLogs.id, input.tripId));

        return {
          success: true,
          message: "Trip updated successfully",
        };
      } catch (error) {
        console.error("[Fleet Trip Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update trip",
        });
      }
    }),

  /**
   * Update trip status (workflow)
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        tripId: z.number(),
        status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        await db
          .update(tripLogs)
          .set({
            status: input.status,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(tripLogs.id, input.tripId),
              eq(tripLogs.organizationId, organizationId!),
              eq(tripLogs.isDeleted, 0)
            )
          );

        return {
          success: true,
          message: `Trip status updated to ${input.status}`,
        };
      } catch (error) {
        console.error("[Fleet Trip Status Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update trip status",
        });
      }
    }),

  /**
   * Soft delete trip
   */
  delete: protectedProcedure
    .input(z.object({ tripId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const trip = await db
          .select()
          .from(tripLogs)
          .where(
            and(
              eq(tripLogs.id, input.tripId),
              eq(tripLogs.organizationId, organizationId!),
              eq(tripLogs.isDeleted, 0)
            )
          )
          .limit(1);

        if (!trip.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Trip not found",
          });
        }

        await db
          .update(tripLogs)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.user?.id,
          })
          .where(eq(tripLogs.id, input.tripId));

        return {
          success: true,
          message: "Trip deleted successfully",
        };
      } catch (error) {
        console.error("[Fleet Trip Delete Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete trip",
        });
      }
    }),

  /**
   * Get trip KPIs
   */
  getKPIs: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Trips this month
        const currentMonth = new Date();
        currentMonth.setDate(1);
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const tripsThisMonth = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(tripLogs)
          .where(
            and(
              eq(tripLogs.organizationId, input.organizationId),
              eq(tripLogs.isDeleted, 0),
              sql`tripDate >= ${currentMonth.toISOString()} AND tripDate < ${nextMonth.toISOString()}`
            )
          );

        // Ongoing trips
        const ongoingTrips = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(tripLogs)
          .where(
            and(
              eq(tripLogs.organizationId, input.organizationId),
              eq(tripLogs.status, "in_progress"),
              eq(tripLogs.isDeleted, 0)
            )
          );

        // Total distance this month
        const totalDistance = await db
          .select({ total: sql`SUM(distanceTraveled) as total` })
          .from(tripLogs)
          .where(
            and(
              eq(tripLogs.organizationId, input.organizationId),
              eq(tripLogs.isDeleted, 0),
              sql`tripDate >= ${currentMonth.toISOString()} AND tripDate < ${nextMonth.toISOString()}`
            )
          );

        return {
          tripsThisMonth: tripsThisMonth[0]?.count || 0,
          ongoingTrips: ongoingTrips[0]?.count || 0,
          totalDistanceThisMonth: totalDistance[0]?.total || 0,
        };
      } catch (error) {
        console.error("[Fleet Trip KPIs Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch trip KPIs",
        });
      }
    }),
};
