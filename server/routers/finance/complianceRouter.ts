/**
 * server/routers/finance/complianceRouter.ts
 *
 * Finance Compliance Subrouter
 * Handles compliance tracking, reporting, and compliance findings management.
 *
 * Dashboard Procedures (Executive Summary):
 * - getComplianceStatus() - Overall compliance status
 * - getComplianceIssues() - Active compliance issues
 * - getAuditTrail() - Audit trail for compliance
 * - getComplianceReports() - Compliance reports
 *
 * Compliance Findings Procedures (Operational Management):
 * - getFindings() - Get findings with filtering, searching, pagination
 * - getFindingById() - Get single finding with relations
 * - getComplianceStats() - Dashboard statistics
 * - getFindingsByType() - Findings grouped by type
 * - getFindingsBySeverity() - Findings grouped by severity
 * - getTopCriticalFindings() - Top critical findings
 * - getAverageResolutionTime() - Resolution metrics
 */

import { router, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { ComplianceRepository } from '../../repositories/finance/ComplianceRepository';
import type { ComplianceFindingsStats, ComplianceFindingRecord, PaginatedResponse, FullAIRecommendation } from '../../../shared/types/financeRouterTypes';

// ─── Type Mappers ───────────────────────────────────────────────────────────
// Transform repository types to router contract types

function mapToComplianceFindingsStats(stats: any): ComplianceFindingsStats {
  return {
    open: stats.open ?? 0,
    critical: stats.critical ?? 0,
    high: stats.high ?? 0,
    medium: stats.medium ?? 0,
    low: stats.low ?? 0,
    resolved: stats.resolved ?? 0,
    overdue: stats.overdue ?? 0,
    avgResolutionDays: stats.avgResolutionDays ?? 0,
    auditReadiness: stats.auditReadiness ?? 0,
    complianceScore: stats.complianceScore ?? 0,
  };
}

function mapToComplianceFindingRecord(finding: any): ComplianceFindingRecord {
  return {
    id: finding.id?.toString() ?? '',
    findingId: finding.findingId?.toString() ?? '',
    title: finding.title ?? '',
    description: finding.description,
    findingType: finding.findingType ?? '',
    severity: finding.severity ?? 'medium',
    projectCode: finding.projectCode,
    projectName: finding.projectName,
    referenceTable: finding.referenceTable,
    referenceRecord: finding.referenceRecord,
    assignedTo: finding.assignedTo,
    targetDate: finding.targetDate,
    status: finding.status ?? 'open',
    createdDate: finding.createdDate,
    resolvedDate: finding.resolvedDate,
    recommendation: finding.recommendation,
    hasAiRecommendation: finding.hasAiRecommendation ?? false,
    operatingUnit: finding.operatingUnit,
  };
}

export const complianceRouter = router({
  // ========================================
  // DASHBOARD PROCEDURES (Executive Summary)
  // ========================================

  /**
   * Get overall compliance status.
   */
  getComplianceStatus: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const stats = await repository.getComplianceStats(input.organizationId, input.operatingUnitId);

      return mapToComplianceFindingsStats(stats);
    }),

  /**
   * Get active compliance issues.
   */
  getComplianceIssues: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const topFindings = await repository.getTopCriticalFindings(
        input.organizationId,
        input.operatingUnitId,
        10
      );

      return topFindings.map(mapToComplianceFindingRecord);
    }),

  /**
   * Get audit trail.
   */
  getAuditTrail: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const topFindings = await repository.getTopCriticalFindings(
        input.organizationId,
        input.operatingUnitId,
        5
      );

      return topFindings.map(mapToComplianceFindingRecord);
    }),

  /**
   * Get compliance reports.
   */
  getComplianceReports: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const stats = await repository.getComplianceStats(input.organizationId, input.operatingUnitId);

      return mapToComplianceFindingsStats(stats);
    }),

  // ========================================
  // COMPLIANCE FINDINGS PROCEDURES (Operational)
  // ========================================

  /**
   * Get findings with filtering, searching, and pagination.
   */
  getFindings: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
        search: z.string().optional(),
        findingType: z.string().optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
        operatingUnitId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const result = await repository.getFindings(input.organizationId, {
        page: input.page,
        pageSize: input.pageSize,
        search: input.search,
        findingType: input.findingType,
        severity: input.severity,
        status: input.status,
        operatingUnitId: input.operatingUnitId,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      return {
        data: result.data.map(mapToComplianceFindingRecord),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      } as PaginatedResponse<ComplianceFindingRecord>;
    }),

  /**
   * Get single finding by ID with all relations.
   */
  getFindingById: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        findingId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const finding = await repository.getFindingById(input.organizationId, parseInt(input.findingId));

      if (!finding) {
        throw new Error('Finding not found');
      }

      return mapToComplianceFindingRecord(finding);
    }),

  /**
   * Get compliance statistics for dashboard.
   */
  getComplianceStats: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const stats = await repository.getComplianceStats(input.organizationId, input.operatingUnitId);

      return mapToComplianceFindingsStats(stats);
    }),

  /**
   * Get findings grouped by type.
   */
  getFindingsByType: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const result = await repository.getFindings(input.organizationId, {
        page: 1,
        pageSize: 10000,
        operatingUnitId: input.operatingUnitId,
      });

      return result.data.map(mapToComplianceFindingRecord);
    }),

  /**
   * Get findings grouped by severity.
   */
  getFindingsBySeverity: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const result = await repository.getFindings(input.organizationId, {
        page: 1,
        pageSize: 10000,
        operatingUnitId: input.operatingUnitId,
      });

      return result.data.map(mapToComplianceFindingRecord);
    }),

  /**
   * Get top critical findings.
   */
  getTopCriticalFindings: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        limit: z.number().default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const topFindings = await repository.getTopCriticalFindings(
        input.organizationId,
        input.operatingUnitId,
        input.limit
      );

      return topFindings.map(mapToComplianceFindingRecord);
    }),

  /**
   * Get average resolution time metrics.
   */
  getAverageResolutionTime: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      const metrics = await repository.getAverageResolutionTime(input.organizationId, input.operatingUnitId);

      return metrics;
    }),

  /**
   * Get AI recommendations for a specific finding.
   */
  getAIRecommendationsByFinding: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        findingId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // TODO: Integrate with AIExecutiveEngine to generate recommendations
      // For now, return placeholder recommendations
      const recommendations: FullAIRecommendation[] = [
        {
          id: '1',
          priority: 'high',
          category: 'compliance',
          confidence: 0.95,
          title: 'Immediate Action Required',
          reasoning: 'Based on historical compliance data and industry standards',
          recommendation: 'Address this finding within 30 days',
          expectedImpact: 'High',
          estimatedSavings: 50000,
          currency: 'USD',
          status: 'pending',
        },
      ];

      return recommendations;
    }),

  /**
   * Export findings in specified format.
   */
  exportFindings: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        findingIds: z.array(z.string()).optional(),
        format: z.enum(['excel', 'csv', 'pdf']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceRepository(db);

      let findings;
      if (input.findingIds && input.findingIds.length > 0) {
        findings = [];
        for (const id of input.findingIds) {
          const finding = await repository.getFindingById(input.organizationId, parseInt(id));
          if (finding) findings.push(finding);
        }
      } else {
        const result = await repository.getFindings(input.organizationId, {
          page: 1,
          pageSize: 10000,
          operatingUnitId: input.operatingUnitId,
        });
        findings = result.data;
      }

      // TODO: Implement actual export logic based on format
      return {
        format: input.format,
        recordCount: findings.length,
        downloadUrl: `/api/exports/findings-${Date.now()}.${input.format === 'excel' ? 'xlsx' : input.format}`,
      };
    }),
});
