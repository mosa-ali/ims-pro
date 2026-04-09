/**
 * Fleet Compliance Tracking Router
 * Manages vehicle compliance (insurance, registration, inspection, permits)
 */

import { protectedProcedure } from "@/_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "@/db";
import { vehicleCompliance, vehicles } from "@/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const complianceSchema = z.object({
  vehicleId: z.number().min(1, "Vehicle is required"),
  complianceType: z.enum(["insurance", "registration", "inspection", "permit", "other"]),
  documentNumber: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().min(1, "Expiry date is required"),
  issuingAuthority: z.string().optional(),
  cost: z.string().optional(),
  currency: z.string().default("USD"),
  documentUrl: z.string().optional(),
  remarks: z.string().optional(),
});

export const fleetComplianceRouter = {
  /**
   * Create a new compliance record
   */
  create: protectedProcedure
    .input(complianceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const organizationId = ctx.user?.organizationId;

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

        // Determine status based on expiry date
        const expiryDate = new Date(input.expiryDate);
        const today = new Date();
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        let status = "valid";
        if (expiryDate < today) {
          status = "expired";
        } else if (expiryDate <= thirtyDaysFromNow) {
          status = "expiring_soon";
        }

        const result = await db.insert(vehicleCompliance).values({
          vehicleId: input.vehicleId,
          complianceType: input.complianceType,
          documentNumber: input.documentNumber,
          issueDate: input.issueDate,
          expiryDate: input.expiryDate,
          issuingAuthority: input.issuingAuthority,
          cost: input.cost ? parseFloat(input.cost) : null,
          currency: input.currency,
          documentUrl: input.documentUrl,
          status,
          remarks: input.remarks,
        });

        return {
          success: true,
          complianceId: result.insertId,
          message: "Compliance record created successfully",
          status,
        };
      } catch (error) {
        console.error("[Fleet Compliance Create Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create compliance record",
        });
      }
    }),

  /**
   * List compliance records with pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        vehicleId: z.number().optional(),
        complianceType: z.enum(["insurance", "registration", "inspection", "permit", "other"]).optional(),
        status: z.enum(["valid", "expiring_soon", "expired", "pending"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Build where clause - need to join with vehicles to filter by org
        const whereConditions = [];

        if (input.vehicleId) {
          whereConditions.push(eq(vehicleCompliance.vehicleId, input.vehicleId));
        }

        if (input.complianceType) {
          whereConditions.push(eq(vehicleCompliance.complianceType, input.complianceType));
        }

        if (input.status) {
          whereConditions.push(eq(vehicleCompliance.status, input.status));
        }

        // Get total count
        const countResult = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicleCompliance)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

        const total = countResult[0]?.count || 0;

        // Get paginated results
        const items = await db
          .select()
          .from(vehicleCompliance)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .orderBy(desc(vehicleCompliance.expiryDate))
          .limit(input.limit)
          .offset(input.offset);

        return {
          items,
          total,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("[Fleet Compliance List Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch compliance records",
        });
      }
    }),

  /**
   * Get single compliance record
   */
  getById: protectedProcedure
    .input(z.object({ complianceId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        const compliance = await db
          .select()
          .from(vehicleCompliance)
          .where(eq(vehicleCompliance.id, input.complianceId))
          .limit(1);

        if (!compliance.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Compliance record not found",
          });
        }

        return compliance[0];
      } catch (error) {
        console.error("[Fleet Compliance GetById Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch compliance record",
        });
      }
    }),

  /**
   * Update compliance record
   */
  update: protectedProcedure
    .input(
      z.object({
        complianceId: z.number(),
        data: complianceSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Verify record exists
        const compliance = await db
          .select()
          .from(vehicleCompliance)
          .where(eq(vehicleCompliance.id, input.complianceId))
          .limit(1);

        if (!compliance.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Compliance record not found",
          });
        }

        // Update status if expiry date changed
        let updateData: any = { ...input.data, updatedAt: new Date().toISOString() };
        if (input.data.expiryDate) {
          const expiryDate = new Date(input.data.expiryDate);
          const today = new Date();
          const thirtyDaysFromNow = new Date(today);
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

          if (expiryDate < today) {
            updateData.status = "expired";
          } else if (expiryDate <= thirtyDaysFromNow) {
            updateData.status = "expiring_soon";
          } else {
            updateData.status = "valid";
          }
        }

        await db
          .update(vehicleCompliance)
          .set(updateData)
          .where(eq(vehicleCompliance.id, input.complianceId));

        return {
          success: true,
          message: "Compliance record updated successfully",
        };
      } catch (error) {
        console.error("[Fleet Compliance Update Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update compliance record",
        });
      }
    }),

  /**
   * Delete compliance record
   */
  delete: protectedProcedure
    .input(z.object({ complianceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Verify record exists
        const compliance = await db
          .select()
          .from(vehicleCompliance)
          .where(eq(vehicleCompliance.id, input.complianceId))
          .limit(1);

        if (!compliance.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Compliance record not found",
          });
        }

        await db
          .delete(vehicleCompliance)
          .where(eq(vehicleCompliance.id, input.complianceId));

        return {
          success: true,
          message: "Compliance record deleted successfully",
        };
      } catch (error) {
        console.error("[Fleet Compliance Delete Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete compliance record",
        });
      }
    }),

  /**
   * Get compliance alerts (expiring soon or expired)
   */
  getAlerts: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Get expiring soon and expired records
        const alerts = await db
          .select()
          .from(vehicleCompliance)
          .where(
            sql`status IN ('expiring_soon', 'expired')`
          )
          .orderBy(vehicleCompliance.expiryDate);

        // Group by status
        const expiringSoon = alerts.filter((a: any) => a.status === "expiring_soon");
        const expired = alerts.filter((a: any) => a.status === "expired");

        return {
          expiringSoon,
          expired,
          totalAlerts: alerts.length,
        };
      } catch (error) {
        console.error("[Fleet Compliance Alerts Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch compliance alerts",
        });
      }
    }),

  /**
   * Get compliance KPIs for dashboard
   */
  getKPIs: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();

        // Expiring soon (30 days)
        const expiringSoon = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicleCompliance)
          .where(eq(vehicleCompliance.status, "expiring_soon"));

        // Expired
        const expired = await db
          .select({ count: sql`COUNT(*) as count` })
          .from(vehicleCompliance)
          .where(eq(vehicleCompliance.status, "expired"));

        return {
          expiringSoon: expiringSoon[0]?.count || 0,
          expired: expired[0]?.count || 0,
        };
      } catch (error) {
        console.error("[Fleet Compliance KPIs Error]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch compliance KPIs",
        });
      }
    }),
};
