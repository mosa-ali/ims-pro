/**
 * Fleet Driver Management Router
 * Manages driver CRUD operations with license validation, soft delete, and audit logging
 */

import { protectedProcedure } from "@/_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "@/db";
import { drivers, users, vehicleAssignments } from "@/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

const driverSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  firstNameAr: z.string().optional(),
  lastNameAr: z.string().optional(),
  staffId: z.number().optional(),
  licenseNumber: z.string().optional(),
  licenseType: z.string().optional(),
  licenseExpiry: z.string().optional(),
  licenseIssuingCountry: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export const fleetDriverRouter = {
  /**
   * Create a new driver
   */
  create: protectedProcedure
    .input(driverSchema)
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

        // Generate driver code
        const driverCode = `FL-DRV-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6).padStart(4, "0")}`;
        const fullName = `${input.firstName} ${input.lastName}`;
        const fullNameAr = input.firstNameAr && input.lastNameAr ? `${input.firstNameAr} ${input.lastNameAr}` : null;

        const result = await db.insert(drivers).values({
          organizationId,
          operatingUnitId,
          driverCode,
          firstName: input.firstName,
          lastName: input.lastName,
          firstNameAr: input.firstNameAr,
          lastNameAr: input.lastNameAr,
          fullName,
          fullNameAr,
          staffId: input.staffId,
          licenseNumber: input.licenseNumber,
          licenseType: input.licenseType,
          licenseExpiry: input.licenseExpiry,
          licenseExpiryDate: input.licenseExpiry,
          licenseIssuingCountry: input.licenseIssuingCountry,
          phone: input.phone,
          email: input.email,
          status: "active",
          notes: input.notes,
          createdBy: ctx.user?.id,
        });

        return {
          success: true,
          driverId: result.insertId,
          message: "Driver created successfully",
        };
      } catch (error) {
        console.error("[Fleet Driver Create Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create driver",
        });
      }
    }),

  /**
   * List drivers with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        status: z.enum(["active", "inactive", "on_leave", "terminated"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = input.organizationId;

        // Build where clause
        const whereConditions = [
          eq(drivers.organizationId, organizationId),
          eq(drivers.isDeleted, 0),
        ];

        if (input.status) {
          whereConditions.push(eq(drivers.status, input.status));
        }

        // Get total count
        const countResult = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(drivers)
          .where(and(...whereConditions));

        const total = countResult[0]?.count || 0;

        // Get paginated results
        const items = await db
          .select()
          .from(drivers)
          .where(and(...whereConditions))
          .orderBy(desc(drivers.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          items,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[Fleet Driver List Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch drivers",
        });
      }
    }),

  /**
   * Get single driver with related data
   */
  getById: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        const driver = await db
          .select()
          .from(drivers)
          .where(
            and(
              eq(drivers.id, input.driverId),
              eq(drivers.organizationId, organizationId!),
              eq(drivers.isDeleted, 0)
            )
          )
          .limit(1);

        if (!driver.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Driver not found",
          });
        }

        // Get active vehicle assignment
        const assignment = await db
          .select()
          .from(vehicleAssignments)
          .where(
            and(
              eq(vehicleAssignments.driverId, input.driverId),
              eq(vehicleAssignments.status, "active")
            )
          )
          .limit(1);

        // Check license expiry
        const licenseExpiry = driver[0]?.licenseExpiry;
        const isLicenseExpired = licenseExpiry && new Date(licenseExpiry) < new Date();

        return {
          ...driver[0],
          currentVehicleAssignment: assignment[0] || null,
          isLicenseExpired,
        };
      } catch (error) {
        console.error("[Fleet Driver GetById Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch driver",
        });
      }
    }),

  /**
   * Update driver
   */
  update: protectedProcedure
    .input(
      z.object({
        driverId: z.number(),
        data: driverSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const driver = await db
          .select()
          .from(drivers)
          .where(
            and(
              eq(drivers.id, input.driverId),
              eq(drivers.organizationId, organizationId!),
              eq(drivers.isDeleted, 0)
            )
          )
          .limit(1);

        if (!driver.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Driver not found",
          });
        }

        // Update full name if first or last name changed
        let updateData: any = { ...input.data, updatedAt: new Date().toISOString() };
        if (input.data.firstName || input.data.lastName) {
          const firstName = input.data.firstName || driver[0]?.firstName;
          const lastName = input.data.lastName || driver[0]?.lastName;
          updateData.fullName = `${firstName} ${lastName}`;
        }

        if (input.data.firstNameAr || input.data.lastNameAr) {
          const firstNameAr = input.data.firstNameAr || driver[0]?.firstNameAr;
          const lastNameAr = input.data.lastNameAr || driver[0]?.lastNameAr;
          if (firstNameAr && lastNameAr) {
            updateData.fullNameAr = `${firstNameAr} ${lastNameAr}`;
          }
        }

        await db
          .update(drivers)
          .set(updateData)
          .where(eq(drivers.id, input.driverId));

        return {
          success: true,
          message: "Driver updated successfully",
        };
      } catch (error) {
        console.error("[Fleet Driver Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update driver",
        });
      }
    }),

  /**
   * Soft delete driver
   */
  delete: protectedProcedure
    .input(z.object({ driverId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const driver = await db
          .select()
          .from(drivers)
          .where(
            and(
              eq(drivers.id, input.driverId),
              eq(drivers.organizationId, organizationId!),
              eq(drivers.isDeleted, 0)
            )
          )
          .limit(1);

        if (!driver.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Driver not found",
          });
        }

        await db
          .update(drivers)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.user?.id,
          })
          .where(eq(drivers.id, input.driverId));

        return {
          success: true,
          message: "Driver deleted successfully",
        };
      } catch (error) {
        console.error("[Fleet Driver Delete Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete driver",
        });
      }
    }),

  /**
   * Update driver status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        driverId: z.number(),
        status: z.enum(["active", "inactive", "on_leave", "terminated"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        await db
          .update(drivers)
          .set({
            status: input.status,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(drivers.id, input.driverId),
              eq(drivers.organizationId, organizationId!),
              eq(drivers.isDeleted, 0)
            )
          );

        return {
          success: true,
          message: `Driver status updated to ${input.status}`,
        };
      } catch (error) {
        console.error("[Fleet Driver Status Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update driver status",
        });
      }
    }),

  /**
   * Get drivers with expiring licenses
   */
  getExpiringLicenses: protectedProcedure
    .input(z.object({ organizationId: z.number(), daysThreshold: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        const expiringDate = new Date();
        expiringDate.setDate(expiringDate.getDate() + input.daysThreshold);

        const expiring = await db
          .select()
          .from(drivers)
          .where(
            and(
              eq(drivers.organizationId, input.organizationId),
              eq(drivers.isDeleted, 0),
              sql`licenseExpiry IS NOT NULL AND licenseExpiry <= ${expiringDate.toISOString()}`
            )
          )
          .orderBy(drivers.licenseExpiry);

        return expiring;
      } catch (error) {
        console.error("[Fleet Driver Expiring Licenses Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch drivers with expiring licenses",
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

        // Total drivers
        const totalDrivers = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(drivers)
          .where(
            and(
              eq(drivers.organizationId, input.organizationId),
              eq(drivers.isDeleted, 0)
            )
          );

        // Active drivers
        const activeDrivers = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(drivers)
          .where(
            and(
              eq(drivers.organizationId, input.organizationId),
              eq(drivers.status, "active"),
              eq(drivers.isDeleted, 0)
            )
          );

        // Drivers with expiring licenses (30 days)
        const expiringDate = new Date();
        expiringDate.setDate(expiringDate.getDate() + 30);

        const expiringLicenses = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(drivers)
          .where(
            and(
              eq(drivers.organizationId, input.organizationId),
              eq(drivers.isDeleted, 0),
              sql`licenseExpiry IS NOT NULL AND licenseExpiry <= ${expiringDate.toISOString()}`
            )
          );

        // Expired licenses
        const expiredLicenses = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(drivers)
          .where(
            and(
              eq(drivers.organizationId, input.organizationId),
              eq(drivers.isDeleted, 0),
              sql`licenseExpiry IS NOT NULL AND licenseExpiry < NOW()`
            )
          );

        return {
          totalDrivers: totalDrivers[0]?.count || 0,
          activeDrivers: activeDrivers[0]?.count || 0,
          expiringLicenses: expiringLicenses[0]?.count || 0,
          expiredLicenses: expiredLicenses[0]?.count || 0,
        };
      } catch (error) {
        console.error("[Fleet Driver KPIs Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch driver KPIs",
        });
      }
    }),
};
