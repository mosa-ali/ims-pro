/**
 * Fleet Maintenance Management Router
 * Manages maintenance records with vendor and stock integration, soft delete, and audit logging
 */

import { protectedProcedure } from "@/_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "@/db";
import { vehicleMaintenance, vehicles } from "@/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const maintenanceSchema = z.object({
  vehicleId: z.number().min(1, "Vehicle is required"),
  maintenanceType: z.enum(["scheduled", "unscheduled", "repair", "inspection"]).default("scheduled"),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  mileageAtService: z.string().optional(),
  vendor: z.string().optional(),
  laborCost: z.string().optional(),
  partsCost: z.string().optional(),
  totalCost: z.string().optional(),
  currency: z.string().default("USD"),
  invoiceNumber: z.string().optional(),
  remarks: z.string().optional(),
  vendorId: z.number().optional(), // ERP: Link to vendor
  stockIssueId: z.number().optional(), // ERP: Link to stock issue
  payableId: z.number().optional(), // ERP: Link to payable
});

export const fleetMaintenanceRouter = {
  /**
   * Create a new maintenance record
   */
  create: protectedProcedure
    .input(maintenanceSchema)
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

        // Generate maintenance number
        const maintenanceNumber = `FL-MNT-${new Date().getFullYear()}-${Math.random().toString().slice(2, 6).padStart(4, "0")}`;

        // Calculate total cost if not provided
        let totalCost = input.totalCost ? parseFloat(input.totalCost) : null;
        if (!totalCost && input.laborCost && input.partsCost) {
          const labor = parseFloat(input.laborCost);
          const parts = parseFloat(input.partsCost);
          if (!isNaN(labor) && !isNaN(parts)) {
            totalCost = labor + parts;
          }
        }

        const result = await db.insert(vehicleMaintenance).values({
          organizationId,
          operatingUnitId,
          vehicleId: input.vehicleId,
          maintenanceNumber,
          maintenanceType: input.maintenanceType,
          description: input.description,
          descriptionAr: input.descriptionAr,
          scheduledDate: input.scheduledDate,
          completedDate: input.completedDate,
          mileageAtService: input.mileageAtService ? parseFloat(input.mileageAtService) : null,
          vendor: input.vendor,
          laborCost: input.laborCost ? parseFloat(input.laborCost) : 0,
          partsCost: input.partsCost ? parseFloat(input.partsCost) : 0,
          totalCost,
          currency: input.currency,
          invoiceNumber: input.invoiceNumber,
          status: "scheduled",
          remarks: input.remarks,
          createdBy: ctx.user?.id,
        });

        return {
          success: true,
          maintenanceId: result.insertId,
          message: "Maintenance record created successfully",
          totalCost,
        };
      } catch (error) {
        console.error("[Fleet Maintenance Create Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create maintenance record",
        });
      }
    }),

  /**
   * List maintenance records with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        vehicleId: z.number().optional(),
        maintenanceType: z.enum(["scheduled", "unscheduled", "repair", "inspection"]).optional(),
        status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Build where clause
        const whereConditions = [
          eq(vehicleMaintenance.organizationId, input.organizationId),
          eq(vehicleMaintenance.isDeleted, 0),
        ];

        if (input.vehicleId) {
          whereConditions.push(eq(vehicleMaintenance.vehicleId, input.vehicleId));
        }

        if (input.maintenanceType) {
          whereConditions.push(eq(vehicleMaintenance.maintenanceType, input.maintenanceType));
        }

        if (input.status) {
          whereConditions.push(eq(vehicleMaintenance.status, input.status));
        }

        // Get total count
        const countResult = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicleMaintenance)
          .where(and(...whereConditions));

        const total = countResult[0]?.count || 0;

        // Get paginated results
        const items = await db
          .select()
          .from(vehicleMaintenance)
          .where(and(...whereConditions))
          .orderBy(desc(vehicleMaintenance.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          items,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[Fleet Maintenance List Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch maintenance records",
        });
      }
    }),

  /**
   * Get single maintenance record
   */
  getById: protectedProcedure
    .input(z.object({ maintenanceId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        const maintenance = await db
          .select()
          .from(vehicleMaintenance)
          .where(
            and(
              eq(vehicleMaintenance.id, input.maintenanceId),
              eq(vehicleMaintenance.organizationId, organizationId!),
              eq(vehicleMaintenance.isDeleted, 0)
            )
          )
          .limit(1);

        if (!maintenance.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Maintenance record not found",
          });
        }

        return maintenance[0];
      } catch (error) {
        console.error("[Fleet Maintenance GetById Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch maintenance record",
        });
      }
    }),

  /**
   * Update maintenance record
   */
  update: protectedProcedure
    .input(
      z.object({
        maintenanceId: z.number(),
        data: maintenanceSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const maintenance = await db
          .select()
          .from(vehicleMaintenance)
          .where(
            and(
              eq(vehicleMaintenance.id, input.maintenanceId),
              eq(vehicleMaintenance.organizationId, organizationId!),
              eq(vehicleMaintenance.isDeleted, 0)
            )
          )
          .limit(1);

        if (!maintenance.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Maintenance record not found",
          });
        }

        // Calculate total cost if needed
        let updateData: any = { ...input.data, updatedAt: new Date().toISOString() };
        if (input.data.laborCost || input.data.partsCost) {
          const labor = input.data.laborCost ? parseFloat(input.data.laborCost) : maintenance[0]?.laborCost;
          const parts = input.data.partsCost ? parseFloat(input.data.partsCost) : maintenance[0]?.partsCost;
          if (labor && parts) {
            updateData.totalCost = labor + parts;
          }
        }

        await db
          .update(vehicleMaintenance)
          .set(updateData)
          .where(eq(vehicleMaintenance.id, input.maintenanceId));

        return {
          success: true,
          message: "Maintenance record updated successfully",
        };
      } catch (error) {
        console.error("[Fleet Maintenance Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update maintenance record",
        });
      }
    }),

  /**
   * Update maintenance status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        maintenanceId: z.number(),
        status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        await db
          .update(vehicleMaintenance)
          .set({
            status: input.status,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(vehicleMaintenance.id, input.maintenanceId),
              eq(vehicleMaintenance.organizationId, organizationId!),
              eq(vehicleMaintenance.isDeleted, 0)
            )
          );

        return {
          success: true,
          message: `Maintenance status updated to ${input.status}`,
        };
      } catch (error) {
        console.error("[Fleet Maintenance Status Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update maintenance status",
        });
      }
    }),

  /**
   * Soft delete maintenance record
   */
  delete: protectedProcedure
    .input(z.object({ maintenanceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

        // Verify ownership
        const maintenance = await db
          .select()
          .from(vehicleMaintenance)
          .where(
            and(
              eq(vehicleMaintenance.id, input.maintenanceId),
              eq(vehicleMaintenance.organizationId, organizationId!),
              eq(vehicleMaintenance.isDeleted, 0)
            )
          )
          .limit(1);

        if (!maintenance.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Maintenance record not found",
          });
        }

        await db
          .update(vehicleMaintenance)
          .set({
            isDeleted: 1,
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.user?.id,
          })
          .where(eq(vehicleMaintenance.id, input.maintenanceId));

        return {
          success: true,
          message: "Maintenance record deleted successfully",
        };
      } catch (error) {
        console.error("[Fleet Maintenance Delete Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete maintenance record",
        });
      }
    }),

  /**
   * Get maintenance cost summary
   */
  getCostSummary: protectedProcedure
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
          eq(vehicleMaintenance.organizationId, input.organizationId),
          eq(vehicleMaintenance.isDeleted, 0),
        ];

        if (input.vehicleId) {
          whereConditions.push(eq(vehicleMaintenance.vehicleId, input.vehicleId));
        }

        if (input.startDate && input.endDate) {
          whereConditions.push(
            sql`createdAt >= ${input.startDate} AND createdAt <= ${input.endDate}`
          );
        }

        // Total maintenance cost
        const totalCost = await db
          .select({ total: sql`SUM(totalCost) as total` })
          .from(vehicleMaintenance)
          .where(and(...whereConditions));

        // Labor vs parts breakdown
        const costBreakdown = await db
          .select({
            laborCost: sql`SUM(laborCost) as laborCost`,
            partsCost: sql`SUM(partsCost) as partsCost`,
          })
          .from(vehicleMaintenance)
          .where(and(...whereConditions));

        // Maintenance type breakdown
        const typeBreakdown = await db
          .select({
            maintenanceType: vehicleMaintenance.maintenanceType,
            count: sql`COUNT(*) as count`,
            totalCost: sql`SUM(totalCost) as totalCost`,
          })
          .from(vehicleMaintenance)
          .where(and(...whereConditions))
          .groupBy(vehicleMaintenance.maintenanceType);

        return {
          totalMaintenanceCost: totalCost[0]?.total || 0,
          laborCost: costBreakdown[0]?.laborCost || 0,
          partsCost: costBreakdown[0]?.partsCost || 0,
          typeBreakdown,
        };
      } catch (error) {
        console.error("[Fleet Maintenance Cost Summary Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch maintenance cost summary",
        });
      }
    }),

  /**
   * Get maintenance KPIs for dashboard
   */
  getKPIs: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Scheduled maintenance
        const scheduledMaintenance = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicleMaintenance)
          .where(
            and(
              eq(vehicleMaintenance.organizationId, input.organizationId),
              eq(vehicleMaintenance.status, "scheduled"),
              eq(vehicleMaintenance.isDeleted, 0)
            )
          );

        // In-progress maintenance
        const inProgressMaintenance = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicleMaintenance)
          .where(
            and(
              eq(vehicleMaintenance.organizationId, input.organizationId),
              eq(vehicleMaintenance.status, "in_progress"),
              eq(vehicleMaintenance.isDeleted, 0)
            )
          );

        return {
          scheduledMaintenance: scheduledMaintenance[0]?.count || 0,
          inProgressMaintenance: inProgressMaintenance[0]?.count || 0,
        };
      } catch (error) {
        console.error("[Fleet Maintenance KPIs Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch maintenance KPIs",
        });
      }
    }),
};
