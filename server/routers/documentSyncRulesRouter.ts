import { router, scopedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { eq, and, isNull, desc, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { documents } from '../../drizzle/schema';

// Define sync rule schema
const SyncRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  sourceStorage: z.enum(['s3', 'internal']),
  targetStorage: z.enum(['sharepoint', 'onedrive']),
  documentTypes: z.array(z.string()),
  procurementStages: z.array(z.string()),
  dateRangeStart: z.date().optional(),
  dateRangeEnd: z.date().optional(),
  enabled: z.boolean().default(true),
  syncInterval: z.number().positive(), // in minutes
  retryAttempts: z.number().min(1).max(10).default(3),
  retryDelaySeconds: z.number().min(1).max(3600).default(300),
});

type SyncRule = z.infer<typeof SyncRuleSchema>;

// In-memory store for sync rules (in production, this would be in the database)
const syncRules = new Map<string, SyncRule & { organizationId: string; operatingUnitId: string }>();

export const documentSyncRulesRouter = router({
  /**
   * Create a new sync rule
   */
  createSyncRule: scopedProcedure
    .input(SyncRuleSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const ruleId = crypto.randomUUID();
        const rule: SyncRule & { organizationId: string; operatingUnitId: string } = {
          id: ruleId,
          ...input,
          organizationId: ctx.user.organizationId,
          operatingUnitId: ctx.user.operatingUnitId,
        };

        syncRules.set(ruleId, rule);

        return {
          id: ruleId,
          ...rule,
          createdAt: new Date(),
        };
      } catch (error) {
        console.error('Create sync rule error:', error);
        throw error;
      }
    }),

  /**
   * Get all sync rules for organization
   */
  getSyncRules: scopedProcedure.query(async ({ ctx }) => {
    try {
      const rules = Array.from(syncRules.values()).filter(
        rule =>
          rule.organizationId === ctx.user.organizationId &&
          rule.operatingUnitId === ctx.user.operatingUnitId
      );

      return rules;
    } catch (error) {
      console.error('Get sync rules error:', error);
      throw error;
    }
  }),

  /**
   * Get specific sync rule
   */
  getSyncRule: scopedProcedure
    .input(z.object({ ruleId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const rule = syncRules.get(input.ruleId);

        if (!rule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sync rule not found',
          });
        }

        if (
          rule.organizationId !== ctx.user.organizationId ||
          rule.operatingUnitId !== ctx.user.operatingUnitId
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          });
        }

        return rule;
      } catch (error) {
        console.error('Get sync rule error:', error);
        throw error;
      }
    }),

  /**
   * Update sync rule
   */
  updateSyncRule: scopedProcedure
    .input(
      z.object({
        ruleId: z.string(),
        data: SyncRuleSchema.partial().omit({ id: true }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const rule = syncRules.get(input.ruleId);

        if (!rule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sync rule not found',
          });
        }

        if (
          rule.organizationId !== ctx.user.organizationId ||
          rule.operatingUnitId !== ctx.user.operatingUnitId
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          });
        }

        const updated = { ...rule, ...input.data };
        syncRules.set(input.ruleId, updated);

        return updated;
      } catch (error) {
        console.error('Update sync rule error:', error);
        throw error;
      }
    }),

  /**
   * Delete sync rule
   */
  deleteSyncRule: scopedProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const rule = syncRules.get(input.ruleId);

        if (!rule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sync rule not found',
          });
        }

        if (
          rule.organizationId !== ctx.user.organizationId ||
          rule.operatingUnitId !== ctx.user.operatingUnitId
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          });
        }

        syncRules.delete(input.ruleId);

        return { success: true };
      } catch (error) {
        console.error('Delete sync rule error:', error);
        throw error;
      }
    }),

  /**
   * Get documents matching sync rule criteria
   */
  getMatchingDocuments: scopedProcedure
    .input(z.object({ ruleId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        const rule = syncRules.get(input.ruleId);

        if (!rule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sync rule not found',
          });
        }

        if (
          rule.organizationId !== ctx.user.organizationId ||
          rule.operatingUnitId !== ctx.user.operatingUnitId
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          });
        }

        // Build query conditions
        const conditions = [
          eq(documents.organizationId, ctx.user.organizationId),
          eq(documents.operatingUnitId, ctx.user.operatingUnitId),
          isNull(documents.deletedAt),
        ];

        // Add document type filter
        if (rule.documentTypes.length > 0) {
          // Note: This is a simplified version. In production, use proper IN clause
          // conditions.push(inArray(documents.documentType, rule.documentTypes));
        }

        // Add procurement stage filter
        if (rule.procurementStages.length > 0) {
          // Note: This is a simplified version. In production, use proper IN clause
          // conditions.push(inArray(documents.documentStage, rule.procurementStages));
        }

        // Add date range filter
        if (rule.dateRangeStart) {
          conditions.push(gte(documents.createdAt, rule.dateRangeStart));
        }
        if (rule.dateRangeEnd) {
          conditions.push(lte(documents.createdAt, rule.dateRangeEnd));
        }

        const matchingDocs = await db.query.documents.findMany({
          where: and(...conditions),
          orderBy: [desc(documents.createdAt)],
        });

        return {
          total: matchingDocs.length,
          documents: matchingDocs,
        };
      } catch (error) {
        console.error('Get matching documents error:', error);
        throw error;
      }
    }),

  /**
   * Execute sync for a rule (trigger manual sync)
   */
  executeSyncRule: scopedProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const rule = syncRules.get(input.ruleId);

        if (!rule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Sync rule not found',
          });
        }

        if (
          rule.organizationId !== ctx.user.organizationId ||
          rule.operatingUnitId !== ctx.user.operatingUnitId
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Access denied',
          });
        }

        // Get matching documents
        const db = await getDb();
        const conditions = [
          eq(documents.organizationId, ctx.user.organizationId),
          eq(documents.operatingUnitId, ctx.user.operatingUnitId),
          isNull(documents.deletedAt),
        ];

        if (rule.dateRangeStart) {
          conditions.push(gte(documents.createdAt, rule.dateRangeStart));
        }
        if (rule.dateRangeEnd) {
          conditions.push(lte(documents.createdAt, rule.dateRangeEnd));
        }

        const matchingDocs = await db.query.documents.findMany({
          where: and(...conditions),
        });

        // Simulate sync execution
        const syncResults = {
          ruleId: input.ruleId,
          ruleName: rule.name,
          targetStorage: rule.targetStorage,
          totalDocuments: matchingDocs.length,
          successCount: Math.floor(matchingDocs.length * 0.95), // Simulate 95% success
          failureCount: Math.ceil(matchingDocs.length * 0.05),
          startedAt: new Date(),
          completedAt: new Date(Date.now() + 5000), // Simulate 5 second sync
          status: 'completed',
        };

        return syncResults;
      } catch (error) {
        console.error('Execute sync rule error:', error);
        throw error;
      }
    }),

  /**
   * Get sync job history
   */
  getSyncJobHistory: scopedProcedure
    .input(z.object({ ruleId: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      try {
        // In production, this would query from document_sync_jobs table
        // For now, return mock data
        const mockJobs = [
          {
            jobId: crypto.randomUUID(),
            ruleId: input.ruleId || 'rule-1',
            ruleName: 'Sync Approved POs to SharePoint',
            targetStorage: 'sharepoint',
            totalDocuments: 15,
            successCount: 14,
            failureCount: 1,
            startedAt: new Date(Date.now() - 3600000),
            completedAt: new Date(Date.now() - 3595000),
            status: 'completed',
          },
          {
            jobId: crypto.randomUUID(),
            ruleId: input.ruleId || 'rule-1',
            ruleName: 'Sync Approved POs to SharePoint',
            targetStorage: 'sharepoint',
            totalDocuments: 12,
            successCount: 12,
            failureCount: 0,
            startedAt: new Date(Date.now() - 7200000),
            completedAt: new Date(Date.now() - 7195000),
            status: 'completed',
          },
        ];

        return mockJobs.slice(0, input.limit);
      } catch (error) {
        console.error('Get sync job history error:', error);
        throw error;
      }
    }),

  /**
   * Get sync statistics
   */
  getSyncStatistics: scopedProcedure.query(async ({ ctx }) => {
    try {
      const rules = Array.from(syncRules.values()).filter(
        rule =>
          rule.organizationId === ctx.user.organizationId &&
          rule.operatingUnitId === ctx.user.operatingUnitId
      );

      return {
        totalRules: rules.length,
        enabledRules: rules.filter(r => r.enabled).length,
        disabledRules: rules.filter(r => !r.enabled).length,
        targetStorages: {
          sharepoint: rules.filter(r => r.targetStorage === 'sharepoint').length,
          onedrive: rules.filter(r => r.targetStorage === 'onedrive').length,
        },
        lastSyncTime: new Date(Date.now() - 3600000), // Mock: 1 hour ago
        nextSyncTime: new Date(Date.now() + 1800000), // Mock: 30 minutes from now
      };
    } catch (error) {
      console.error('Get sync statistics error:', error);
      throw error;
    }
  }),
});
