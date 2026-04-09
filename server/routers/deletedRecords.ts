import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

/**
 * Deleted Records Router
 * Manages soft-deleted records across platform and organization scopes
 * 
 * Platform-level: Only platform admins can access
 * Organization-level: Organization admins can access their own org's deleted records
 */

export const deletedRecordsRouter = router({
  // List deleted records by scope (platform or organization)
  listByScope: protectedProcedure
    .input(
      z.object({
        scope: z.enum(["platform", "organization"]),
        organizationId: z.number().optional(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Platform scope: only platform admins
      if (input.scope === "platform") {
        if (ctx.user.role !== "platform_super_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only platform admins can access platform-level deleted records',
          });
        }
        return await db.getPlatformDeletedRecords();
      }

      // Organization scope
      if (!input.organizationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organization ID is required for organization scope',
        });
      }

      // Verify user belongs to the requested organization
      const userOrgs = await db.getUserOrganizations(ctx.user.id);
      const hasAccess = userOrgs.some(uo => uo.organizationId === input.organizationId);

      if (!hasAccess && ctx.user.role !== 'platform_super_admin' && ctx.user.role !== 'platform_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this organization',
        });
      }

      return await db.getOrgDeletedRecords(input.organizationId, input.operatingUnitId ?? null);
    }),

  // Restore a deleted record
  restore: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        scope: z.enum(["platform", "organization"]),
        organizationId: z.number().optional(),
        operatingUnitId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Platform scope: only platform admins
      if (input.scope === "platform") {
        if (ctx.user.role !== "platform_super_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only platform admins can restore platform-level records',
          });
        }
      }

      // Organization scope: verify access
      if (input.scope === "organization") {
        if (!input.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required for organization scope',
          });
        }
        const userOrgs = await db.getUserOrganizations(ctx.user.id);
        const hasAccess = userOrgs.some(uo => uo.organizationId === input.organizationId);
        if (!hasAccess && ctx.user.role !== 'platform_super_admin' && ctx.user.role !== 'platform_admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          });
        }
      }

      try {
        // Try platform entities first (users, organizations, operating units)
        const platformResult = await db.restoreDeletedRecord({
          entityType: input.entityType,
          entityId: input.entityId,
          organizationId: input.organizationId ?? null,
          operatingUnitId: input.operatingUnitId ?? null,
          restoredBy: ctx.user.id,
        });

        if (platformResult.success) {
          await db.createAuditLog({
            userId: ctx.user.id,
            organizationId: input.organizationId ?? null,
            operatingUnitId: input.operatingUnitId ?? null,
            action: "record_restored",
            entityType: input.entityType,
            entityId: input.entityId,
            details: JSON.stringify({
              entityType: input.entityType,
              entityId: input.entityId,
              scope: input.scope,
              restoredBy: ctx.user.name,
              restoredAt: new Date().toISOString(),
            }),
          });
          return { success: true, message: `${input.entityType} restored successfully` };
        }

        // If platform restore returned "unsupported", try org-level entities
        if (platformResult.message?.includes('Unsupported entity type')) {
          const orgResult = await db.restoreOrgRecord(input.entityType, input.entityId);
          if (!orgResult.success) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: orgResult.message ?? 'Record not found or already restored',
            });
          }
          await db.createAuditLog({
            userId: ctx.user.id,
            organizationId: input.organizationId ?? null,
            operatingUnitId: input.operatingUnitId ?? null,
            action: "record_restored",
            entityType: input.entityType,
            entityId: input.entityId,
            details: JSON.stringify({
              entityType: input.entityType,
              entityId: input.entityId,
              scope: input.scope,
              restoredBy: ctx.user.name,
              restoredAt: new Date().toISOString(),
            }),
          });
          return { success: true, message: `${input.entityType} restored successfully` };
        }

        throw new TRPCError({
          code: 'NOT_FOUND',
          message: platformResult.message ?? 'Record not found or already restored',
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to restore record: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Permanently delete a record (hard delete)
  permanentDelete: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        scope: z.enum(["platform", "organization"]),
        organizationId: z.number().optional(),
        operatingUnitId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Platform scope: only platform admins
      if (input.scope === "platform") {
        if (ctx.user.role !== "platform_super_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only platform admins can permanently delete platform-level records',
          });
        }
      }

      // Organization scope: verify access
      if (input.scope === "organization") {
        if (!input.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required for organization scope',
          });
        }
        const userOrgs = await db.getUserOrganizations(ctx.user.id);
        const hasAccess = userOrgs.some(uo => uo.organizationId === input.organizationId);
        if (!hasAccess && ctx.user.role !== 'platform_super_admin' && ctx.user.role !== 'platform_admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          });
        }
      }

      // Audit log BEFORE permanent deletion
      await db.createAuditLog({
        userId: ctx.user.id,
        organizationId: input.organizationId ?? null,
        operatingUnitId: input.operatingUnitId ?? null,
        action: "record_permanently_deleted",
        entityType: input.entityType,
        entityId: input.entityId,
        details: JSON.stringify({
          entityType: input.entityType,
          entityId: input.entityId,
          scope: input.scope,
          permanentlyDeletedBy: ctx.user.name,
          permanentlyDeletedAt: new Date().toISOString(),
        }),
      });

      try {
        const result = await db.hardDeleteRecord(input.entityType, input.entityId);
        if (!result.success) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: result.message ?? 'Record not found or already permanently deleted',
          });
        }
        return { success: true, message: "Record permanently deleted" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to permanently delete record: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Bulk restore multiple records
  bulkRestore: protectedProcedure
    .input(
      z.object({
        records: z.array(
          z.object({
            entityType: z.string(),
            entityId: z.number(),
          })
        ).min(1, "At least one record is required"),
        scope: z.enum(["platform", "organization"]),
        organizationId: z.number().optional(),
        operatingUnitId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Platform scope: only platform admins
      if (input.scope === "platform") {
        if (ctx.user.role !== "platform_super_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only platform admins can bulk restore platform-level records',
          });
        }
      }

      // Organization scope: verify access
      if (input.scope === "organization") {
        if (!input.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required for organization scope',
          });
        }
        const userOrgs = await db.getUserOrganizations(ctx.user.id);
        const hasAccess = userOrgs.some(uo => uo.organizationId === input.organizationId);
        if (!hasAccess && ctx.user.role !== 'platform_super_admin' && ctx.user.role !== 'platform_admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          });
        }
      }

      let restoredCount = 0;
      const errors: string[] = [];

      for (const record of input.records) {
        try {
          // Try platform entities first
          const platformResult = await db.restoreDeletedRecord({
            entityType: record.entityType,
            entityId: record.entityId,
            organizationId: input.organizationId ?? null,
            operatingUnitId: input.operatingUnitId ?? null,
            restoredBy: ctx.user.id,
          });

          if (!platformResult.success && platformResult.message?.includes('Unsupported entity type')) {
            // Try org-level entities
            const orgResult = await db.restoreOrgRecord(record.entityType, record.entityId);
            if (!orgResult.success) {
              errors.push(`Failed to restore ${record.entityType} ID ${record.entityId}: ${orgResult.message ?? 'Unknown error'}`);
              continue;
            }
          } else if (!platformResult.success) {
            errors.push(`Failed to restore ${record.entityType} ID ${record.entityId}: ${platformResult.message ?? 'Unknown error'}`);
            continue;
          }

          await db.createAuditLog({
            userId: ctx.user.id,
            organizationId: input.organizationId ?? null,
            operatingUnitId: input.operatingUnitId ?? null,
            action: "record_bulk_restored",
            entityType: record.entityType,
            entityId: record.entityId,
            details: JSON.stringify({
              entityType: record.entityType,
              entityId: record.entityId,
              scope: input.scope,
              restoredBy: ctx.user.name,
              bulkOperation: true,
              totalInBatch: input.records.length,
            }),
          });
          restoredCount++;
        } catch (error) {
          errors.push(`Failed to restore ${record.entityType} ID ${record.entityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: true,
        restoredCount,
        totalRequested: input.records.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // Bulk permanent delete multiple records
  bulkPermanentDelete: protectedProcedure
    .input(
      z.object({
        records: z.array(
          z.object({
            entityType: z.string(),
            entityId: z.number(),
          })
        ).min(1, "At least one record is required"),
        scope: z.enum(["platform", "organization"]),
        organizationId: z.number().optional(),
        operatingUnitId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Platform scope: only platform admins
      if (input.scope === "platform") {
        if (ctx.user.role !== "platform_super_admin" && ctx.user.role !== "platform_admin") {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only platform admins can bulk permanently delete platform-level records',
          });
        }
      }

      // Organization scope: verify access
      if (input.scope === "organization") {
        if (!input.organizationId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization ID is required for organization scope',
          });
        }
        const userOrgs = await db.getUserOrganizations(ctx.user.id);
        const hasAccess = userOrgs.some(uo => uo.organizationId === input.organizationId);
        if (!hasAccess && ctx.user.role !== 'platform_super_admin' && ctx.user.role !== 'platform_admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this organization',
          });
        }
      }

      let deletedCount = 0;
      const errors: string[] = [];

      for (const record of input.records) {
        try {
          // Audit log BEFORE each permanent deletion
          await db.createAuditLog({
            userId: ctx.user.id,
            organizationId: input.organizationId ?? null,
            operatingUnitId: input.operatingUnitId ?? null,
            action: "record_bulk_permanently_deleted",
            entityType: record.entityType,
            entityId: record.entityId,
            details: JSON.stringify({
              entityType: record.entityType,
              entityId: record.entityId,
              scope: input.scope,
              permanentlyDeletedBy: ctx.user.name,
              bulkOperation: true,
              totalInBatch: input.records.length,
            }),
          });

          const result = await db.hardDeleteRecord(record.entityType, record.entityId);
          if (!result.success) {
            errors.push(`Failed to permanently delete ${record.entityType} ID ${record.entityId}: ${result.message ?? 'Unknown error'}`);
            continue;
          }
          deletedCount++;
        } catch (error) {
          errors.push(`Failed to permanently delete ${record.entityType} ID ${record.entityId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: true,
        deletedCount,
        totalRequested: input.records.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),
});
