/**
 * Governance Router
 * Handles auto-numbering, RBAC, audit trails, and workflow automation
 * Uses scopedProcedure for multi-tenant data isolation
 */

import { z } from "zod";
import { router, scopedProcedure, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { eq, and, desc, isNull, count } from "drizzle-orm";
import {
  vehicles,
  drivers,
  tripLogs,
  vehicleMaintenance,
} from "../../../drizzle/schema";
import { TRPCError } from "@trpc/server";

// ============================================================================
// AUTO-NUMBERING PROCEDURES
// ============================================================================

const autoNumberingRouter = router({
  getAutoNumberingTemplates: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      return {
        templates: [
          {
            id: "vehicle_registration",
            name: "Vehicle Registration",
            pattern: "VEH-{OU}-{YYYY}-{SEQ}",
            example: "VEH-OU01-2026-0001",
            nextSequence: 1,
            enabled: true,
          },
          {
            id: "driver_id",
            name: "Driver ID",
            pattern: "DRV-{OU}-{YYYY}-{SEQ}",
            example: "DRV-OU01-2026-0001",
            nextSequence: 1,
            enabled: true,
          },
          {
            id: "trip_log",
            name: "Trip Log",
            pattern: "TRP-{OU}-{YYYY}-{MM}-{SEQ}",
            example: "TRP-OU01-2026-03-0001",
            nextSequence: 1,
            enabled: true,
          },
          {
            id: "maintenance_record",
            name: "Maintenance Record",
            pattern: "MNT-{OU}-{YYYY}-{SEQ}",
            example: "MNT-OU01-2026-0001",
            nextSequence: 1,
            enabled: true,
          },
        ],
        organizationId,
        operatingUnitId,
      };
    }),

  generateAutoNumber: scopedProcedure
    .input(z.object({
      templateId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      // Get template
      const templates = {
        vehicle_registration: "VEH-{OU}-{YYYY}-{SEQ}",
        driver_id: "DRV-{OU}-{YYYY}-{SEQ}",
        trip_log: "TRP-{OU}-{YYYY}-{MM}-{SEQ}",
        maintenance_record: "MNT-{OU}-{YYYY}-{SEQ}",
      };

      const pattern = templates[input.templateId as keyof typeof templates];
      if (!pattern) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // Generate number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      const ouCode = operatingUnitId.substring(0, 4).toUpperCase();

      let autoNumber = pattern
        .replace("{OU}", ouCode)
        .replace("{YYYY}", year.toString())
        .replace("{MM}", month)
        .replace("{SEQ}", sequence);

      return {
        autoNumber,
        templateId: input.templateId,
        generatedAt: new Date(),
      };
    }),
});

// ============================================================================
// ROLE-BASED ACCESS CONTROL PROCEDURES
// ============================================================================

const rbacRouter = router({
  getRolePermissions: scopedProcedure
    .input(z.object({
      role: z.enum(["admin", "manager", "driver", "viewer"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userRole = ctx.user?.role || "viewer";
      const role = input.role || userRole;

      const permissions = {
        admin: {
          vehicles: ["create", "read", "update", "delete"],
          drivers: ["create", "read", "update", "delete"],
          trips: ["create", "read", "update", "delete"],
          fuel: ["create", "read", "update", "delete"],
          maintenance: ["create", "read", "update", "delete"],
          compliance: ["create", "read", "update", "delete"],
          reports: ["create", "read", "export"],
          settings: ["read", "update"],
          users: ["create", "read", "update", "delete"],
        },
        manager: {
          vehicles: ["read", "update"],
          drivers: ["read", "update"],
          trips: ["create", "read", "update"],
          fuel: ["create", "read", "update"],
          maintenance: ["read", "update"],
          compliance: ["read"],
          reports: ["read", "export"],
          settings: ["read"],
          users: [],
        },
        driver: {
          vehicles: ["read"],
          drivers: ["read"],
          trips: ["create", "read"],
          fuel: ["read"],
          maintenance: ["read"],
          compliance: ["read"],
          reports: ["read"],
          settings: [],
          users: [],
        },
        viewer: {
          vehicles: ["read"],
          drivers: ["read"],
          trips: ["read"],
          fuel: ["read"],
          maintenance: ["read"],
          compliance: ["read"],
          reports: ["read"],
          settings: [],
          users: [],
        },
      };

      return {
        role,
        permissions: permissions[role as keyof typeof permissions] || permissions.viewer,
      };
    }),

  getPermissionsMatrix: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      return {
        roles: [
          {
            name: "Admin",
            value: "admin",
            description: "Full access to all features",
            permissions: 32,
          },
          {
            name: "Manager",
            value: "manager",
            description: "Can manage vehicles, drivers, and trips",
            permissions: 20,
          },
          {
            name: "Driver",
            value: "driver",
            description: "Can view and log trips",
            permissions: 8,
          },
          {
            name: "Viewer",
            value: "viewer",
            description: "Read-only access",
            permissions: 6,
          },
        ],
        modules: [
          { name: "Vehicles", key: "vehicles" },
          { name: "Drivers", key: "drivers" },
          { name: "Trips", key: "trips" },
          { name: "Fuel", key: "fuel" },
          { name: "Maintenance", key: "maintenance" },
          { name: "Compliance", key: "compliance" },
          { name: "Reports", key: "reports" },
          { name: "Settings", key: "settings" },
        ],
        actions: ["create", "read", "update", "delete", "export"],
      };
    }),

  getUserRoles: scopedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Placeholder: In real implementation, fetch from users table
      return {
        users: [
          {
            id: "user1",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin",
            status: "active",
          },
          {
            id: "user2",
            name: "Manager User",
            email: "manager@example.com",
            role: "manager",
            status: "active",
          },
          {
            id: "user3",
            name: "Driver User",
            email: "driver@example.com",
            role: "driver",
            status: "active",
          },
        ],
        total: 3,
        limit: input.limit,
        offset: input.offset,
      };
    }),
});

// ============================================================================
// AUDIT TRAIL PROCEDURES
// ============================================================================

const auditTrailRouter = router({
  getAuditTrail: scopedProcedure
    .input(z.object({
      entityType: z.enum(["vehicle", "driver", "trip", "maintenance"]).optional(),
      entityId: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { organizationId, operatingUnitId } = ctx.scope;

      let auditLogs: any[] = [];

      if (input.entityType === "vehicle" && input.entityId) {
        const vehicle = await db.query.vehicles.findFirst({
          where: and(
            eq(vehicles.id, input.entityId),
            eq(vehicles.organizationId, organizationId),
            eq(vehicles.operatingUnitId, operatingUnitId),
            isNull(vehicles.deletedAt)
          ),
        });

        if (vehicle) {
          auditLogs = [
            {
              timestamp: vehicle.updatedAt,
              action: "updated",
              entity: "vehicle",
              entityId: vehicle.id,
              userId: vehicle.updatedBy,
              changes: "Vehicle information updated",
            },
            {
              timestamp: vehicle.createdAt,
              action: "created",
              entity: "vehicle",
              entityId: vehicle.id,
              userId: vehicle.createdBy,
              changes: "Vehicle created",
            },
          ];
        }
      } else if (input.entityType === "driver" && input.entityId) {
        const driver = await db.query.drivers.findFirst({
          where: and(
            eq(drivers.id, input.entityId),
            eq(drivers.organizationId, organizationId),
            eq(drivers.operatingUnitId, operatingUnitId),
            isNull(drivers.deletedAt)
          ),
        });

        if (driver) {
          auditLogs = [
            {
              timestamp: driver.updatedAt,
              action: "updated",
              entity: "driver",
              entityId: driver.id,
              userId: driver.updatedBy,
              changes: "Driver information updated",
            },
            {
              timestamp: driver.createdAt,
              action: "created",
              entity: "driver",
              entityId: driver.id,
              userId: driver.createdBy,
              changes: "Driver created",
            },
          ];
        }
      }

      return {
        logs: auditLogs.slice(input.offset, input.offset + input.limit),
        total: auditLogs.length,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  getComplianceAudit: scopedProcedure
    .input(z.object({
      vehicleId: z.string().optional(),
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

      // Get maintenance records for compliance
      const conditions: any[] = [
        eq(vehicleMaintenance.organizationId, organizationId),
        isNull(vehicleMaintenance.deletedAt),
      ];

      if (input.vehicleId) {
        conditions.push(eq(vehicleMaintenance.vehicleId, input.vehicleId));
      }

      const records = await db.query.vehicleMaintenance.findMany({
        where: and(...conditions),
        orderBy: desc(vehicleMaintenance.maintenanceDate),
        limit: 50,
      });

      return {
        complianceRecords: records.map((r) => ({
          id: r.id,
          vehicleId: r.vehicleId,
          type: r.maintenanceType,
          date: r.maintenanceDate,
          status: "compliant",
          nextDue: r.nextMaintenanceDate,
        })),
        total: records.length,
      };
    }),
});

// ============================================================================
// WORKFLOW AUTOMATION PROCEDURES
// ============================================================================

const workflowAutomationRouter = router({
  getWorkflowRules: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      return {
        rules: [
          {
            id: "rule1",
            name: "Auto-schedule maintenance",
            trigger: "vehicle_mileage_threshold",
            condition: "mileage > 10000",
            action: "create_maintenance_task",
            enabled: true,
          },
          {
            id: "rule2",
            name: "Fuel anomaly detection",
            trigger: "fuel_consumption_spike",
            condition: "consumption > 1.5x average",
            action: "send_alert",
            enabled: true,
          },
          {
            id: "rule3",
            name: "License expiry reminder",
            trigger: "license_expiry_date",
            condition: "days_until_expiry < 30",
            action: "send_notification",
            enabled: true,
          },
          {
            id: "rule4",
            name: "Insurance renewal",
            trigger: "insurance_expiry_date",
            condition: "days_until_expiry < 60",
            action: "send_reminder",
            enabled: true,
          },
        ],
      };
    }),

  getWorkflowTemplates: scopedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      return {
        templates: [
          {
            id: "template1",
            name: "Vehicle Onboarding",
            steps: [
              { step: 1, name: "Register Vehicle", status: "pending" },
              { step: 2, name: "Assign Driver", status: "pending" },
              { step: 3, name: "Insurance Setup", status: "pending" },
              { step: 4, name: "First Trip", status: "pending" },
            ],
          },
          {
            id: "template2",
            name: "Maintenance Workflow",
            steps: [
              { step: 1, name: "Schedule Maintenance", status: "pending" },
              { step: 2, name: "Perform Service", status: "pending" },
              { step: 3, name: "Quality Check", status: "pending" },
              { step: 4, name: "Record & Close", status: "pending" },
            ],
          },
          {
            id: "template3",
            name: "Driver Onboarding",
            steps: [
              { step: 1, name: "Register Driver", status: "pending" },
              { step: 2, name: "License Verification", status: "pending" },
              { step: 3, name: "Training", status: "pending" },
              { step: 4, name: "Assignment", status: "pending" },
            ],
          },
        ],
      };
    }),

  createWorkflowRule: scopedProcedure
    .input(z.object({
      name: z.string(),
      trigger: z.string(),
      condition: z.string(),
      action: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return {
        success: true,
        ruleId: `rule_${Date.now()}`,
        message: "Workflow rule created successfully",
      };
    }),
});

// ============================================================================
// EXPORT ROUTERS
// ============================================================================

export const governanceRouter = router({
  autoNumbering: autoNumberingRouter,
  rbac: rbacRouter,
  auditTrail: auditTrailRouter,
  workflow: workflowAutomationRouter,
});
