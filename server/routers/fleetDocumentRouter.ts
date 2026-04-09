import { router, scopedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { documents, documentAuditLogs } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Fleet management document stages
const FLEET_DOCUMENT_STAGES = {
  VEHICLE_REGISTRATION: "01_Vehicle_Registration",
  DRIVER_LICENSES: "02_Driver_Licenses",
  TRIP_RECORDS: "03_Trip_Records",
  MAINTENANCE_REPORTS: "04_Maintenance_Reports",
  INSURANCE_DOCUMENTS: "05_Insurance_Documents",
} as const;

// Map vehicle/driver/trip status to document stage
function getFleetDocumentStage(entityType: string, status: string): string {
  if (entityType === "vehicle") {
    const vehicleStageMap: Record<string, string> = {
      draft: FLEET_DOCUMENT_STAGES.VEHICLE_REGISTRATION,
      registered: FLEET_DOCUMENT_STAGES.VEHICLE_REGISTRATION,
      active: FLEET_DOCUMENT_STAGES.VEHICLE_REGISTRATION,
      maintenance: FLEET_DOCUMENT_STAGES.MAINTENANCE_REPORTS,
      inactive: FLEET_DOCUMENT_STAGES.MAINTENANCE_REPORTS,
      retired: FLEET_DOCUMENT_STAGES.MAINTENANCE_REPORTS,
    };
    return vehicleStageMap[status] || FLEET_DOCUMENT_STAGES.VEHICLE_REGISTRATION;
  } else if (entityType === "driver") {
    const driverStageMap: Record<string, string> = {
      draft: FLEET_DOCUMENT_STAGES.DRIVER_LICENSES,
      approved: FLEET_DOCUMENT_STAGES.DRIVER_LICENSES,
      active: FLEET_DOCUMENT_STAGES.DRIVER_LICENSES,
      inactive: FLEET_DOCUMENT_STAGES.DRIVER_LICENSES,
      suspended: FLEET_DOCUMENT_STAGES.DRIVER_LICENSES,
    };
    return driverStageMap[status] || FLEET_DOCUMENT_STAGES.DRIVER_LICENSES;
  } else if (entityType === "trip") {
    const tripStageMap: Record<string, string> = {
      draft: FLEET_DOCUMENT_STAGES.TRIP_RECORDS,
      scheduled: FLEET_DOCUMENT_STAGES.TRIP_RECORDS,
      in_progress: FLEET_DOCUMENT_STAGES.TRIP_RECORDS,
      completed: FLEET_DOCUMENT_STAGES.TRIP_RECORDS,
      cancelled: FLEET_DOCUMENT_STAGES.TRIP_RECORDS,
    };
    return tripStageMap[status] || FLEET_DOCUMENT_STAGES.TRIP_RECORDS;
  }
  return FLEET_DOCUMENT_STAGES.VEHICLE_REGISTRATION;
}

export const fleetDocumentRouter = router({
  // Get all documents for a fleet entity (vehicle, driver, trip) organized by stage
  getByFleetEntity: scopedProcedure
    .input(
      z.object({
        entityType: z.enum(["vehicle", "driver", "trip"]),
        entityId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const docs = await (await getDb())
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, ctx.organizationId),
            eq(documents.operatingUnitId, ctx.operatingUnitId),
            eq(documents.relatedEntityType, `fleet_${input.entityType}`),
            eq(documents.relatedEntityId, input.entityId)
          )
        )
        .orderBy(desc(documents.createdAt));

      // Group by stage
      const grouped = docs.reduce(
        (acc, doc) => {
          const stage = doc.documentStage || "Unknown";
          if (!acc[stage]) acc[stage] = [];
          acc[stage].push(doc);
          return acc;
        },
        {} as Record<string, typeof docs>
      );

      return grouped;
    }),

  // Get document path with stage counts
  getDocumentPath: scopedProcedure
    .input(
      z.object({
        entityType: z.enum(["vehicle", "driver", "trip"]),
        entityId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const currentStage = FLEET_DOCUMENT_STAGES.VEHICLE_REGISTRATION;

      // Get document counts by stage
      const stageCounts = await (await getDb())
        .select({
          stage: documents.documentStage,
          count: sql<number>`count(*)`,
        })
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, ctx.organizationId),
            eq(documents.operatingUnitId, ctx.operatingUnitId),
            eq(documents.relatedEntityType, `fleet_${input.entityType}`),
            eq(documents.relatedEntityId, input.entityId)
          )
        )
        .groupBy(documents.documentStage);

      const stages = Object.values(FLEET_DOCUMENT_STAGES);
      const stageData = stages.map((stage) => {
        const count = stageCounts.find((s) => s.stage === stage)?.count || 0;
        return {
          stage,
          count,
          isCurrent: stage === currentStage,
        };
      });

      return {
        entityType: input.entityType,
        entityId: input.entityId,
        currentStage,
        stages: stageData,
        totalDocuments: stageCounts.reduce((sum, s) => sum + (s.count || 0), 0),
      };
    }),

  // Route documents to correct stage based on entity status
  routeDocuments: scopedProcedure
    .input(
      z.object({
        entityType: z.enum(["vehicle", "driver", "trip"]),
        entityId: z.string(),
        status: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const targetStage = getFleetDocumentStage(input.entityType, input.status);

      // Update all documents for this fleet entity to the target stage
      const updated = await (await getDb())
        .update(documents)
        .set({
          documentStage: targetStage,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(
          and(
            eq(documents.organizationId, ctx.organizationId),
            eq(documents.operatingUnitId, ctx.operatingUnitId),
            eq(documents.relatedEntityType, `fleet_${input.entityType}`),
            eq(documents.relatedEntityId, input.entityId)
          )
        );

      // Log the routing action
      await (await getDb()).insert(documentAuditLogs).values({
        id: crypto.randomUUID(),
        documentId: null,
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
        action: "routed",
        description: `Fleet ${input.entityType} documents routed to stage: ${targetStage}`,
        performedBy: ctx.user.id,
        performedAt: new Date(),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return {
        success: true,
        updatedCount: updated.rowsAffected,
        targetStage,
      };
    }),

  // Get all fleet document workflow stages
  getWorkflowStages: scopedProcedure.query(async ({ ctx }) => {
    const stages = Object.entries(FLEET_DOCUMENT_STAGES).map(([key, stage]) => {
      return {
        key,
        stage,
        displayName: stage.replace(/_/g, " ").replace(/^\d+_/, ""),
      };
    });

    // Get document counts for each stage (all fleet entities)
    const counts = await (await getDb())
      .select({
        stage: documents.documentStage,
        count: sql<number>`count(*)`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.organizationId, ctx.organizationId),
          eq(documents.operatingUnitId, ctx.operatingUnitId),
          sql`${documents.relatedEntityType} LIKE 'fleet_%'`
        )
      )
      .groupBy(documents.documentStage);

    return stages.map((s) => ({
      ...s,
      documentCount: counts.find((c) => c.stage === s.stage)?.count || 0,
    }));
  }),

  // Get documents by specific stage
  getByStage: scopedProcedure
    .input(z.object({ stage: z.string() }))
    .query(async ({ input, ctx }) => {
      const docs = await (await getDb())
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.organizationId, ctx.organizationId),
            eq(documents.operatingUnitId, ctx.operatingUnitId),
            sql`${documents.relatedEntityType} LIKE 'fleet_%'`,
            eq(documents.documentStage, input.stage)
          )
        )
        .orderBy(desc(documents.createdAt));

      return docs;
    }),

  // Get fleet statistics
  getFleetStats: scopedProcedure.query(async ({ ctx }) => {
    const stats = await (await getDb())
      .select({
        entityType: sql<string>`SUBSTRING(${documents.relatedEntityType}, 7)`,
        stage: documents.documentStage,
        count: sql<number>`count(*)`,
      })
      .from(documents)
      .where(
        and(
          eq(documents.organizationId, ctx.organizationId),
          eq(documents.operatingUnitId, ctx.operatingUnitId),
          sql`${documents.relatedEntityType} LIKE 'fleet_%'`
        )
      )
      .groupBy(sql`SUBSTRING(${documents.relatedEntityType}, 7)`, documents.documentStage);

    return {
      byEntityType: stats.reduce(
        (acc, s) => {
          if (!acc[s.entityType]) acc[s.entityType] = [];
          acc[s.entityType].push({
            stage: s.stage,
            count: s.count,
          });
          return acc;
        },
        {} as Record<string, Array<{ stage: string | null; count: number }>>
      ),
    };
  }),
});
