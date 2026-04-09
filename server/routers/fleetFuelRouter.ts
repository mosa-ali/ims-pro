/**
 * Fleet Fuel Tracking Router
 * Manages fuel logs with cost tracking, efficiency calculation, and ERP integration
 */

import { protectedProcedure } from "@/_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "@/db";
import { fuelLogs, vehicles } from "@/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const fuelSchema = z.object({
  vehicleId: z.number().min(1, "Vehicle is required"),
  driverId: z.number().optional(),
  fuelDate: z.string().min(1, "Fuel date is required"),
  fuelType: z.enum(["petrol", "diesel", "electric"]).default("petrol"),
  quantity: z.string().min(1, "Quantity is required"),
  unitPrice: z.string().optional(),
  totalCost: z.string().optional(),
  currency: z.string().default("USD"),
  mileageAtFill: z.string().optional(),
  station: z.string().optional(),
  receiptNumber: z.string().optional(),
  projectCode: z.string().optional(),
  remarks: z.string().optional(),
  vendorId: z.number().optional(), // ERP: Link to vendor
  purchaseOrderId: z.number().optional(), // ERP: Link to PO
  payableId: z.number().optional(), // ERP: Link to payable
});

export const fleetFuelRouter = {
  /**
   * Create a new fuel log
   */
  create: protectedProcedure
    .input(fuelSchema)
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

        // Generate fuel log number
        const fuelLogNumber = `FL-FUL-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6).padStart(4, "0")}`;

        // Calculate total cost if not provided
        let totalCost = input.totalCost ? parseFloat(input.totalCost) : null;
        if (!totalCost && input.quantity && input.unitPrice) {
          const qty = parseFloat(input.quantity);
          const price = parseFloat(input.unitPrice);
          if (!isNaN(qty) && !isNaN(price)) {
            totalCost = qty * price;
          }
        }

        const result = await db.insert(fuelLogs).values({
          organizationId,
          operatingUnitId,
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          fuelLogNumber,
          fuelDate: input.fuelDate,
          fuelType: input.fuelType,
          quantity: parseFloat(input.quantity),
          unitPrice: input.unitPrice ? parseFloat(input.unitPrice) : null,
          totalCost,
          currency: input.currency,
          mileageAtFill: input.mileageAtFill ? parseFloat(input.mileageAtFill) : null,
          station: input.station,
          receiptNumber: input.receiptNumber,
          projectCode: input.projectCode,
          remarks: input.remarks,
          createdBy: ctx.user?.id,
        });

        return {
          success: true,
          fuelLogId: result.insertId,
          message: "Fuel log created successfully",
          totalCost,
        };
      } catch (error) {
        console.error("[Fleet Fuel Create Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create fuel log",
        });
      }
    }),

  /**
   * List fuel logs with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        vehicleId: z.number().optional(),
        driverId: z.number().optional(),
        fuelType: z.enum(["petrol", "diesel", "electric"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Build where clause
        const whereConditions = [
          eq(fuelLogs.organizationId, input.organizationId),
          eq(fuelLogs.isDeleted, 0),
        ];

        if (input.vehicleId) {
          whereConditions.push(eq(fuelLogs.vehicleId, input.vehicleId));
        }

        if (input.driverId) {
          whereConditions.push(eq(fuelLogs.driverId, input.driverId));
        }

        if (input.fuelType) {
          whereConditions.push(eq(fuelLogs.fuelType, input.fuelType));
        }

        // Get total count
        const countResult = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(fuelLogs)
          .where(and(...whereConditions));

        const total = countResult[0]?.count || 0;

        // Get paginated results
        const items = await db
          .select()
          .from(fuelLogs)
          .where(and(...whereConditions))
          .orderBy(desc(fuelLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          items,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[Fleet Fuel List Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch fuel logs",
        });
      }
    }),

  /**
   * Get single fuel log
   */
  getById: protectedProcedure
    .input(z.object({ fuelLogId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        const fuelLog = await db
          .select()
          .from(fuelLogs)
          .where(
            and(
              eq(fuelLogs.id, input.fuelLogId),
              eq(fuelLogs.organizationId, organizationId!),
              eq(fuelLogs.isDeleted, 0)
            )
          )
          .limit(1);

        if (!fuelLog.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fuel log not found",
          });
        }

        return fuelLog[0];
      } catch (error) {
        console.error("[Fleet Fuel GetById Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch fuel log",
        });
      }
    }),

  /**
   * Update fuel log
   */
  update: protectedProcedure
    .input(
      z.object({
        fuelLogId: z.number(),
        data: fuelSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const fuelLog = await db
          .select()
          .from(fuelLogs)
          .where(
            and(
              eq(fuelLogs.id, input.fuelLogId),
              eq(fuelLogs.organizationId, organizationId!),
              eq(fuelLogs.isDeleted, 0)
            )
          )
          .limit(1);

        if (!fuelLog.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fuel log not found",
          });
        }

        // Calculate total cost if needed
        let updateData: any = { ...input.data, updatedAt: new Date().toISOString() };
        if (input.data.quantity || input.data.unitPrice) {
          const qty = input.data.quantity ? parseFloat(input.data.quantity) : fuelLog[0]?.quantity;
          const price = input.data.unitPrice ? parseFloat(input.data.unitPrice) : fuelLog[0]?.unitPrice;
          if (qty && price) {
            updateData.totalCost = qty * price;
          }
        }

        await db
          .update(fuelLogs)
          .set(updateData)
          .where(eq(fuelLogs.id, input.fuelLogId));

        return {
          success: true,
          message: "Fuel log updated successfully",
        };
      } catch (error) {
        console.error("[Fleet Fuel Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update fuel log",
        });
      }
    }),

  /**
   * Soft delete fuel log
   */
  delete: protectedProcedure
    .input(z.object({ fuelLogId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const fuelLog = await db
          .select()
          .from(fuelLogs)
          .where(
            and(
              eq(fuelLogs.id, input.fuelLogId),
              eq(fuelLogs.organizationId, organizationId!),
              eq(fuelLogs.isDeleted, 0)
            )
          )
          .limit(1);

        if (!fuelLog.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fuel log not found",
          });
        }

        await db
          .update(fuelLogs)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.user?.id,
          })
          .where(eq(fuelLogs.id, input.fuelLogId));

        return {
          success: true,
          message: "Fuel log deleted successfully",
        };
      } catch (error) {
        console.error("[Fleet Fuel Delete Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete fuel log",
        });
      }
    }),

  /**
   * Get fuel consumption metrics
   */
  getMetrics: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        vehicleId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Build where clause
        const whereConditions = [
          eq(fuelLogs.organizationId, input.organizationId),
          eq(fuelLogs.isDeleted, 0),
        ];

        if (input.vehicleId) {
          whereConditions.push(eq(fuelLogs.vehicleId, input.vehicleId));
        }

        if (input.startDate && input.endDate) {
          whereConditions.push(
            sql`fuelDate >= ${input.startDate} AND fuelDate <= ${input.endDate}`
          );
        }

        // Total fuel consumed
        const totalFuel = await db
          .select({ total: sql`SUM(quantity) as total` })
          .from(fuelLogs)
          .where(and(...whereConditions));

        // Total fuel cost
        const totalCost = await db
          .select({ total: sql`SUM(totalCost) as total` })
          .from(fuelLogs)
          .where(and(...whereConditions));

        // Average cost per liter
        const avgCostPerLiter = await db
          .select({ avg: sql`AVG(unitPrice) as avg` })
          .from(fuelLogs)
          .where(and(...whereConditions));

        // Fuel type breakdown
        const fuelTypeBreakdown = await db
          .select({
            fuelType: fuelLogs.fuelType,
            quantity: sql`SUM(quantity) as quantity`,
            cost: sql`SUM(totalCost) as cost`,
          })
          .from(fuelLogs)
          .where(and(...whereConditions))
          .groupBy(fuelLogs.fuelType);

        return {
          totalFuelConsumed: totalFuel[0]?.total || 0,
          totalFuelCost: totalCost[0]?.total || 0,
          averageCostPerLiter: avgCostPerLiter[0]?.avg || 0,
          fuelTypeBreakdown,
        };
      } catch (error) {
        console.error("[Fleet Fuel Metrics Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch fuel metrics",
        });
      }
    }),

  /**
   * Get fuel KPIs for dashboard
   */
  getKPIs: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Fuel this month
        const currentMonth = new Date();
        currentMonth.setDate(1);
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        const fuelThisMonth = await db
          .select({ total: sql`SUM(quantity) as total` })
          .from(fuelLogs)
          .where(
            and(
              eq(fuelLogs.organizationId, input.organizationId),
              eq(fuelLogs.isDeleted, 0),
              sql`fuelDate >= ${currentMonth.toISOString()} AND fuelDate < ${nextMonth.toISOString()}`
            )
          );

        // Fuel cost this month
        const fuelCostThisMonth = await db
          .select({ total: sql`SUM(totalCost) as total` })
          .from(fuelLogs)
          .where(
            and(
              eq(fuelLogs.organizationId, input.organizationId),
              eq(fuelLogs.isDeleted, 0),
              sql`fuelDate >= ${currentMonth.toISOString()} AND fuelDate < ${nextMonth.toISOString()}`
            )
          );

        return {
          fuelThisMonthL: fuelThisMonth[0]?.total || 0,
          fuelCostThisMonth: (fuelCostThisMonth[0]?.total || 0).toFixed(2),
        };
      } catch (error) {
        console.error("[Fleet Fuel KPIs Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch fuel KPIs",
        });
      }
    }),
};
