/**
 * Document Retention and Governance Router
 * 
 * Handles:
 * - Document retention policies
 * - Retention schedule management
 * - Document disposal/archival
 * - Compliance rule enforcement
 * - Governance layer for document lifecycle
 */

import { router, scopedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  documentRetentionPolicies,
  documentLegalHolds,
  documents,
  documentAuditLogs,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const db = getDb();

export const documentRetentionRouter = router({
  /**
   * Create retention policy
   */
  createPolicy: scopedProcedure
    .input(
      z.object({
        policyCode: z.string(),
        policyName: z.string(),
        policyNameAr: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        retentionYears: z.number().min(0),
        retentionMonths: z.number().min(0).default(0),
        retentionDays: z.number().min(0).default(0),
        disposalAction: z.enum(["delete", "archive", "transfer"]).default("delete"),
        applicableDocumentTypes: z.array(z.string()).optional(),
        applicableWorkspaces: z.array(z.string()).optional(),
        applicableModules: z.array(z.string()).optional(),
        complianceRule: z.string().optional(),
        complianceRuleAr: z.string().optional(),
        regulatoryRequirement: z.string().optional(),
        regulatoryRequirementAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [policy] = await db
        .insert(documentRetentionPolicies)
        .values({
          organizationId: ctx.organizationId,
          operatingUnitId: ctx.operatingUnitId,
          policyCode: input.policyCode,
          policyName: input.policyName,
          policyNameAr: input.policyNameAr,
          description: input.description,
          descriptionAr: input.descriptionAr,
          retentionYears: input.retentionYears,
          retentionMonths: input.retentionMonths,
          retentionDays: input.retentionDays,
          disposalAction: input.disposalAction,
          applicableDocumentTypes: input.applicableDocumentTypes
            ? JSON.stringify(input.applicableDocumentTypes)
            : null,
          applicableWorkspaces: input.applicableWorkspaces
            ? JSON.stringify(input.applicableWorkspaces)
            : null,
          applicableModules: input.applicableModules
            ? JSON.stringify(input.applicableModules)
            : null,
          complianceRule: input.complianceRule,
          complianceRuleAr: input.complianceRuleAr,
          regulatoryRequirement: input.regulatoryRequirement,
          regulatoryRequirementAr: input.regulatoryRequirementAr,
          createdBy: ctx.userId,
        })
        .returning();

      return policy;
    }),

  /**
   * Get all retention policies
   */
  getPolicies: scopedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const policies = await db.query.documentRetentionPolicies.findMany({
        where: (p, { and, eq }) => {
          const conditions = [
            eq(p.organizationId, ctx.organizationId),
          ];

          if (input.isActive !== undefined) {
            conditions.push(eq(p.isActive, input.isActive ? 1 : 0));
          }

          return and(...conditions);
        },
        orderBy: (p) => desc(p.createdAt),
        limit: input.limit,
        offset: input.offset,
      });

      return policies;
    }),

  /**
   * Get policy by ID
   */
  getPolicy: scopedProcedure
    .input(
      z.object({
        policyId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const policy = await db.query.documentRetentionPolicies.findFirst({
        where: (p, { and, eq }) =>
          and(
            eq(p.id, input.policyId),
            eq(p.organizationId, ctx.organizationId)
          ),
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Retention policy not found",
        });
      }

      return policy;
    }),

  /**
   * Update retention policy
   */
  updatePolicy: scopedProcedure
    .input(
      z.object({
        policyId: z.number(),
        policyName: z.string().optional(),
        policyNameAr: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        retentionYears: z.number().min(0).optional(),
        retentionMonths: z.number().min(0).optional(),
        retentionDays: z.number().min(0).optional(),
        disposalAction: z.enum(["delete", "archive", "transfer"]).optional(),
        applicableDocumentTypes: z.array(z.string()).optional(),
        applicableWorkspaces: z.array(z.string()).optional(),
        applicableModules: z.array(z.string()).optional(),
        complianceRule: z.string().optional(),
        regulatoryRequirement: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [policy] = await db
        .update(documentRetentionPolicies)
        .set({
          policyName: input.policyName,
          policyNameAr: input.policyNameAr,
          description: input.description,
          descriptionAr: input.descriptionAr,
          retentionYears: input.retentionYears,
          retentionMonths: input.retentionMonths,
          retentionDays: input.retentionDays,
          disposalAction: input.disposalAction,
          applicableDocumentTypes: input.applicableDocumentTypes
            ? JSON.stringify(input.applicableDocumentTypes)
            : undefined,
          applicableWorkspaces: input.applicableWorkspaces
            ? JSON.stringify(input.applicableWorkspaces)
            : undefined,
          applicableModules: input.applicableModules
            ? JSON.stringify(input.applicableModules)
            : undefined,
          complianceRule: input.complianceRule,
          isActive: input.isActive !== undefined ? (input.isActive ? 1 : 0) : undefined,
          updatedBy: ctx.userId,
        })
        .where(
          and(
            eq(documentRetentionPolicies.id, input.policyId),
            eq(documentRetentionPolicies.organizationId, ctx.organizationId)
          )
        )
        .returning();

      return policy;
    }),

  /**
   * Delete retention policy
   */
  deletePolicy: scopedProcedure
    .input(
      z.object({
        policyId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const policy = await db.query.documentRetentionPolicies.findFirst({
        where: (p, { and, eq }) =>
          and(
            eq(p.id, input.policyId),
            eq(p.organizationId, ctx.organizationId)
          ),
      });

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Retention policy not found",
        });
      }

      await db
        .delete(documentRetentionPolicies)
        .where(eq(documentRetentionPolicies.id, input.policyId));

      return { success: true };
    }),

  /**
   * Get documents eligible for disposal
   * Returns documents that have exceeded their retention period and have no active legal holds
   */
  getDisposalCandidates: scopedProcedure
    .input(
      z.object({
        policyId: z.number().optional(),
        disposalAction: z.enum(["delete", "archive", "transfer"]).optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      // Get applicable policies
      const policies = await db.query.documentRetentionPolicies.findMany({
        where: (p, { and, eq }) => {
          const conditions = [
            eq(p.organizationId, ctx.organizationId),
            eq(p.isActive, 1),
          ];

          if (input.policyId) {
            conditions.push(eq(p.id, input.policyId));
          }

          if (input.disposalAction) {
            conditions.push(eq(p.disposalAction, input.disposalAction));
          }

          return and(...conditions);
        },
      });

      if (policies.length === 0) {
        return [];
      }

      // Calculate retention cutoff dates for each policy
      const candidates = [];

      for (const policy of policies) {
        const retentionMs =
          (policy.retentionYears * 365 + policy.retentionMonths * 30 + policy.retentionDays) *
          24 *
          60 *
          60 *
          1000;

        const cutoffDate = new Date(Date.now() - retentionMs).toISOString();

        // Find documents matching this policy
        const docs = await db.query.documents.findMany({
          where: (d, { and, eq, lte, isNull }) =>
            and(
              eq(d.organizationId, ctx.organizationId),
              eq(d.operatingUnitId, ctx.operatingUnitId),
              lte(d.uploadedAt, cutoffDate),
              isNull(d.deletedAt)
            ),
          limit: input.limit,
          offset: input.offset,
        });

        // Filter out documents with active legal holds
        for (const doc of docs) {
          const hold = await db.query.documentLegalHolds.findFirst({
            where: (h, { and, eq }) =>
              and(
                eq(h.documentId, doc.documentId),
                eq(h.holdStatus, "active")
              ),
          });

          if (!hold) {
            candidates.push({
              document: doc,
              policy: policy,
              disposalDate: new Date(cutoffDate),
              daysOverdue: Math.floor(
                (Date.now() - new Date(cutoffDate).getTime()) / (24 * 60 * 60 * 1000)
              ),
            });
          }
        }
      }

      return candidates;
    }),

  /**
   * Execute document disposal
   * Marks document as deleted (soft delete) or archives it
   */
  executeDisposal: scopedProcedure
    .input(
      z.object({
        documentId: z.string(),
        disposalAction: z.enum(["delete", "archive", "transfer"]),
        disposalReason: z.string().optional(),
        disposalReasonAr: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify document exists
      const doc = await db.query.documents.findFirst({
        where: (d, { and, eq }) =>
          and(
            eq(d.documentId, input.documentId),
            eq(d.organizationId, ctx.organizationId),
            eq(d.operatingUnitId, ctx.operatingUnitId)
          ),
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Check for active legal holds
      const hold = await db.query.documentLegalHolds.findFirst({
        where: (h, { and, eq }) =>
          and(
            eq(h.documentId, input.documentId),
            eq(h.holdStatus, "active")
          ),
      });

      if (hold) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot dispose document with active legal hold",
        });
      }

      // Execute disposal
      let updated;
      if (input.disposalAction === "delete") {
        [updated] = await db
          .update(documents)
          .set({
            deletedAt: new Date().toISOString(),
            deletedBy: ctx.userId,
          })
          .where(eq(documents.documentId, input.documentId))
          .returning();
      } else if (input.disposalAction === "archive") {
        // Archive by moving to archive workspace
        [updated] = await db
          .update(documents)
          .set({
            workspace: "archive",
          })
          .where(eq(documents.documentId, input.documentId))
          .returning();
      } else {
        // Transfer - mark for transfer
        [updated] = await db
          .update(documents)
          .set({
            workspace: "transfer",
          })
          .where(eq(documents.documentId, input.documentId))
          .returning();
      }

      // Log the disposal action
      await db.insert(documentAuditLogs).values({
        documentId: input.documentId,
        action: "deleted",
        actionDescription: `Document disposed via ${input.disposalAction}: ${input.disposalReason || "Retention policy"}`,
        actionDescriptionAr: input.disposalReasonAr,
        performedBy: ctx.userId,
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
      });

      return updated;
    }),

  /**
   * Get disposal schedule for organization
   * Shows upcoming disposals based on retention policies
   */
  getDisposalSchedule: scopedProcedure
    .input(
      z.object({
        daysAhead: z.number().default(90),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      const policies = await db.query.documentRetentionPolicies.findMany({
        where: (p, { and, eq }) =>
          and(
            eq(p.organizationId, ctx.organizationId),
            eq(p.isActive, 1)
          ),
      });

      const schedule = [];

      for (const policy of policies) {
        const retentionMs =
          (policy.retentionYears * 365 + policy.retentionMonths * 30 + policy.retentionDays) *
          24 *
          60 *
          60 *
          1000;

        const cutoffDate = new Date(Date.now() - retentionMs);
        const futureDate = new Date(Date.now() + input.daysAhead * 24 * 60 * 60 * 1000);

        const docs = await db.query.documents.findMany({
          where: (d, { and, eq, gte, lte, isNull }) =>
            and(
              eq(d.organizationId, ctx.organizationId),
              eq(d.operatingUnitId, ctx.operatingUnitId),
              gte(d.uploadedAt, cutoffDate.toISOString()),
              lte(d.uploadedAt, futureDate.toISOString()),
              isNull(d.deletedAt)
            ),
          limit: input.limit,
        });

        for (const doc of docs) {
          const disposalDate = new Date(
            new Date(doc.uploadedAt).getTime() + retentionMs
          );

          schedule.push({
            document: doc,
            policy: policy,
            disposalDate: disposalDate,
            daysUntilDisposal: Math.ceil(
              (disposalDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            ),
          });
        }
      }

      // Sort by disposal date
      schedule.sort((a, b) => a.disposalDate.getTime() - b.disposalDate.getTime());

      return schedule;
    }),

  /**
   * Get retention compliance report
   * Shows document retention status and compliance metrics
   */
  getComplianceReport: scopedProcedure
    .input(
      z.object({
        complianceRule: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const policies = await db.query.documentRetentionPolicies.findMany({
        where: (p, { and, eq }) => {
          const conditions = [
            eq(p.organizationId, ctx.organizationId),
            eq(p.isActive, 1),
          ];

          if (input.complianceRule) {
            conditions.push(eq(p.complianceRule, input.complianceRule));
          }

          return and(...conditions);
        },
      });

      const report = {
        totalPolicies: policies.length,
        policies: [] as any[],
        summary: {
          totalDocuments: 0,
          documentsEligibleForDisposal: 0,
          documentsUnderLegalHold: 0,
          complianceScore: 0,
        },
      };

      for (const policy of policies) {
        const docs = await db.query.documents.findMany({
          where: (d, { and, eq }) =>
            and(
              eq(d.organizationId, ctx.organizationId),
              eq(d.operatingUnitId, ctx.operatingUnitId)
            ),
        });

        const retentionMs =
          (policy.retentionYears * 365 + policy.retentionMonths * 30 + policy.retentionDays) *
          24 *
          60 *
          60 *
          1000;

        const cutoffDate = new Date(Date.now() - retentionMs).toISOString();

        const eligibleDocs = docs.filter((d) => d.uploadedAt <= cutoffDate);
        const docsWithHolds = await Promise.all(
          eligibleDocs.map(async (d) => {
            const hold = await db.query.documentLegalHolds.findFirst({
              where: (h, { and, eq }) =>
                and(
                  eq(h.documentId, d.documentId),
                  eq(h.holdStatus, "active")
                ),
            });
            return hold ? 1 : 0;
          })
        );

        const docsUnderHold = docsWithHolds.reduce((a, b) => a + b, 0);

        report.policies.push({
          policy: policy,
          totalDocuments: docs.length,
          eligibleForDisposal: eligibleDocs.length - docsUnderHold,
          underLegalHold: docsUnderHold,
          compliancePercentage:
            eligibleDocs.length > 0
              ? ((eligibleDocs.length - docsUnderHold) / eligibleDocs.length) * 100
              : 100,
        });

        report.summary.totalDocuments += docs.length;
        report.summary.documentsEligibleForDisposal += eligibleDocs.length - docsUnderHold;
        report.summary.documentsUnderLegalHold += docsUnderHold;
      }

      // Calculate overall compliance score
      if (report.summary.totalDocuments > 0) {
        report.summary.complianceScore =
          ((report.summary.totalDocuments - report.summary.documentsUnderLegalHold) /
            report.summary.totalDocuments) *
          100;
      } else {
        report.summary.complianceScore = 100;
      }

      return report;
    }),
});
