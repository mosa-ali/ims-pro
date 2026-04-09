/**
 * Custom Report Builder Router
 * Handles user-defined custom report creation and management
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const ReportFieldSchema = z.object({
  fieldId: z.string(),
  fieldName: z.string(),
  fieldLabel: z.string(),
  dataType: z.enum(["string", "number", "date", "boolean"]),
  visible: z.boolean().default(true),
  sortable: z.boolean().default(true),
  filterable: z.boolean().default(true),
  width: z.number().optional(),
});

export const ReportChartSchema = z.object({
  chartId: z.string(),
  chartType: z.enum(["bar", "line", "pie", "area", "scatter"]),
  title: z.string(),
  xAxis: z.string(),
  yAxis: z.string(),
  dataSource: z.string(),
  position: z.enum(["top", "bottom", "left", "right"]),
});

export const CreateCustomReportSchema = z.object({
  reportName: z.string(),
  reportDescription: z.string().optional(),
  dataSource: z.string(),
  fields: z.array(ReportFieldSchema),
  charts: z.array(ReportChartSchema).optional(),
  filters: z.array(
    z.object({
      fieldId: z.string(),
      operator: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "in", "contains"]),
      value: z.any(),
    })
  ).optional(),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.array(
    z.object({
      fieldId: z.string(),
      direction: z.enum(["ASC", "DESC"]),
    })
  ).optional(),
  isPublic: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
});

export const UpdateCustomReportSchema = CreateCustomReportSchema.partial();

// ============================================================================
// CUSTOM REPORT BUILDER ROUTER
// ============================================================================

export const customReportBuilderRouter = router({
  /**
   * Create a new custom report
   */
  create: protectedProcedure
    .input(CreateCustomReportSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const reportId = `CR-${Date.now()}`;

        return {
          id: reportId,
          ...input,
          createdBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "draft",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create custom report",
        });
      }
    }),

  /**
   * Get all custom reports for the user/organization
   */
  list: protectedProcedure
    .input(
      z.object({
        includeTemplates: z.boolean().default(false),
        includePublic: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Mock data
        return [
          {
            id: "CR-001",
            reportName: "Fleet Status Overview",
            reportDescription: "Custom fleet status report",
            dataSource: "fleet-overview",
            fields: 6,
            charts: 2,
            isPublic: false,
            isTemplate: false,
            createdBy: ctx.user.id,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            usageCount: 12,
          },
          {
            id: "CR-002",
            reportName: "Driver Performance Metrics",
            reportDescription: "Custom driver performance report",
            dataSource: "driver-performance",
            fields: 7,
            charts: 3,
            isPublic: true,
            isTemplate: true,
            createdBy: ctx.user.id,
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            lastModified: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            usageCount: 25,
          },
        ];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch custom reports",
        });
      }
    }),

  /**
   * Get a specific custom report
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        return {
          id: input.id,
          reportName: "Fleet Status Overview",
          reportDescription: "Custom fleet status report",
          dataSource: "fleet-overview",
          fields: [
            {
              fieldId: "f1",
              fieldName: "vehicleId",
              fieldLabel: "Vehicle ID",
              dataType: "string",
              visible: true,
              sortable: true,
              filterable: true,
            },
            {
              fieldId: "f2",
              fieldName: "status",
              fieldLabel: "Status",
              dataType: "string",
              visible: true,
              sortable: true,
              filterable: true,
            },
          ],
          charts: [
            {
              chartId: "c1",
              chartType: "pie",
              title: "Vehicle Status Distribution",
              xAxis: "status",
              yAxis: "count",
              dataSource: "fleet-overview",
              position: "top",
            },
          ],
          filters: [
            {
              fieldId: "f2",
              operator: "eq",
              value: "active",
            },
          ],
          groupBy: ["status"],
          sortBy: [
            {
              fieldId: "f1",
              direction: "ASC",
            },
          ],
          isPublic: false,
          isTemplate: false,
          createdBy: ctx.user.id,
          createdAt: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch custom report",
        });
      }
    }),

  /**
   * Update a custom report
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: UpdateCustomReportSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          id: input.id,
          ...input.data,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update custom report",
        });
      }
    }),

  /**
   * Delete a custom report
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return { success: true, id: input.id };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete custom report",
        });
      }
    }),

  /**
   * Publish a custom report as a template
   */
  publishAsTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          success: true,
          reportId: input.id,
          publishedAt: new Date(),
          message: "Report published as template",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to publish report as template",
        });
      }
    }),

  /**
   * Get available data sources for report building
   */
  getAvailableDataSources: protectedProcedure.query(async ({ ctx }) => {
    try {
      return [
        {
          id: "fleet-overview",
          name: "Fleet Overview",
          description: "Fleet vehicle data",
          fields: [
            { id: "vehicleId", name: "vehicleId", label: "Vehicle ID", type: "string" },
            { id: "registration", name: "registration", label: "Registration", type: "string" },
            { id: "status", name: "status", label: "Status", type: "string" },
            { id: "mileage", name: "mileage", label: "Mileage", type: "number" },
            { id: "fuelType", name: "fuelType", label: "Fuel Type", type: "string" },
            { id: "lastServiceDate", name: "lastServiceDate", label: "Last Service", type: "date" },
          ],
        },
        {
          id: "driver-performance",
          name: "Driver Performance",
          description: "Driver performance metrics",
          fields: [
            { id: "driverId", name: "driverId", label: "Driver ID", type: "string" },
            { id: "name", name: "name", label: "Name", type: "string" },
            { id: "status", name: "status", label: "Status", type: "string" },
            { id: "tripsCompleted", name: "tripsCompleted", label: "Trips Completed", type: "number" },
            { id: "avgRating", name: "avgRating", label: "Avg Rating", type: "number" },
            { id: "safetyScore", name: "safetyScore", label: "Safety Score", type: "number" },
            { id: "fuelEfficiency", name: "fuelEfficiency", label: "Fuel Efficiency", type: "number" },
          ],
        },
        {
          id: "trip-analytics",
          name: "Trip Analytics",
          description: "Trip data and analytics",
          fields: [
            { id: "tripId", name: "tripId", label: "Trip ID", type: "string" },
            { id: "vehicleId", name: "vehicleId", label: "Vehicle ID", type: "string" },
            { id: "driverId", name: "driverId", label: "Driver ID", type: "string" },
            { id: "startDate", name: "startDate", label: "Start Date", type: "date" },
            { id: "endDate", name: "endDate", label: "End Date", type: "date" },
            { id: "distance", name: "distance", label: "Distance (km)", type: "number" },
            { id: "fuelConsumed", name: "fuelConsumed", label: "Fuel (L)", type: "number" },
            { id: "status", name: "status", label: "Status", type: "string" },
          ],
        },
      ];
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch available data sources",
      });
    }
  }),

  /**
   * Get report templates
   */
  getTemplates: protectedProcedure.query(async ({ ctx }) => {
    try {
      return [
        {
          id: "tpl-001",
          reportName: "Standard Fleet Overview",
          reportDescription: "Standard fleet overview template",
          dataSource: "fleet-overview",
          fields: 6,
          charts: 2,
          createdBy: "system",
          createdAt: new Date(),
        },
        {
          id: "tpl-002",
          reportName: "Driver Performance Summary",
          reportDescription: "Standard driver performance template",
          dataSource: "driver-performance",
          fields: 7,
          charts: 3,
          createdBy: "system",
          createdAt: new Date(),
        },
      ];
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch templates",
      });
    }
  }),

  /**
   * Clone a report
   */
  clone: protectedProcedure
    .input(z.object({ id: z.string(), newName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const clonedId = `CR-${Date.now()}`;
        return {
          id: clonedId,
          reportName: input.newName,
          clonedFrom: input.id,
          createdBy: ctx.user.id,
          createdAt: new Date(),
          message: "Report cloned successfully",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clone report",
        });
      }
    }),

  /**
   * Preview report data
   */
  preview: protectedProcedure
    .input(
      z.object({
        dataSource: z.string(),
        fields: z.array(z.string()),
        filters: z.record(z.any()).optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Mock preview data
        return {
          dataSource: input.dataSource,
          rowCount: 3,
          data: [
            {
              vehicleId: "veh-001",
              registration: "ABC-123",
              status: "active",
              mileage: 50000,
            },
            {
              vehicleId: "veh-002",
              registration: "DEF-456",
              status: "active",
              mileage: 75000,
            },
            {
              vehicleId: "veh-003",
              registration: "GHI-789",
              status: "inactive",
              mileage: 30000,
            },
          ],
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to preview report data",
        });
      }
    }),
});
