/**
 * server/routers/finance/complianceRouter.ts
 *
 * Finance Compliance Subrouter — REFACTORED
 * Handles compliance tracking, reporting, and compliance findings management.
 *
 * Integration:
 * - ComplianceFindingsRepository: Unified findings queries with pagination, search, filtering
 * - AIRecommendationsRepository: AI recommendations with confidence thresholds and sorting
 * - Constructor injection of DB instance (consistent with other routers)
 * - Type-safe Zod validation on all inputs
 * - Multi-tenancy enforcement (organizationId + operatingUnitId)
 *
 * Procedures:
 * - getFindings() — Paginated findings with search, filtering, sorting
 * - getFindingById() — Single finding with all relations
 * - getComplianceStats() — SQL-based statistics for dashboard
 * - getCriticalFindings() — Critical severity findings
 * - getOpenFindings() — Open status findings
 * - getAverageResolutionTime() — Resolution metrics
 * - getRecommendations() — AI recommendations with filtering
 * - getRecommendationById() — Single recommendation with relations
 */

import { router, protectedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { ComplianceFindingsRepository, AIRecommendationsRepository } from '../../repositories/finance';
import type { ComplianceFindingRecord, ComplianceFindingDetail, PaginatedFindingsResponse, ComplianceStatistics, AIRecommendationRecord, AIRecommendationDetail, PaginatedRecommendationsResponse, RecommendationStatistics } from '../../repositories/finance';

// ─── Type Mappers ───────────────────────────────────────────────────────────
// Transform repository types to router contract types

function mapComplianceFindingForRouter(finding: ComplianceFindingRecord): any {
  return {
    id: finding.id,
    organizationId: finding.organizationId,
    operatingUnitId: finding.operatingUnitId,
    projectId: finding.projectId,
    projectCode: finding.projectCode,
    projectTitle: finding.projectTitle,
    findingType: finding.findingType,
    severity: finding.severity,
    title: finding.title,
    description: finding.description,
    referenceTable: finding.referenceTable,
    referenceId: finding.referenceId,
    recommendation: finding.recommendation,
    status: finding.status,
    assignedTo: finding.assignedTo,
    assignedUserName: finding.assignedUserName,
    assignedUserEmail: finding.assignedUserEmail,
    targetDate: finding.targetDate,
    resolvedDate: finding.resolvedDate,
    createdAt: finding.createdAt,
    updatedAt: finding.updatedAt,
    createdBy: finding.createdBy,
    updatedBy: finding.updatedBy,
    daysOpen: finding.daysOpen,
    isOverdue: finding.isOverdue,
    riskLevel: finding.riskLevel,
    hasAIRecommendation: finding.hasAIRecommendation,
  };
}

function mapAIRecommendationForRouter(rec: AIRecommendationRecord): any {
  return {
    id: rec.id,
    organizationId: rec.organizationId,
    operatingUnitId: rec.operatingUnitId,
    findingId: rec.findingId,
    riskId: rec.riskId,
    projectId: rec.projectId,
    findingTitle: rec.findingTitle,
    riskTitle: rec.riskTitle,
    projectCode: rec.projectCode,
    projectName: rec.projectName,
    title: rec.title,
    recommendation: rec.recommendation,
    category: rec.category,
    priority: rec.priority,
    confidence: rec.confidence,
    confidencePercent: rec.confidencePercent,
    estimatedSavings: rec.estimatedSavings,
    estimatedSavingsFormatted: rec.estimatedSavingsFormatted,
    currency: rec.currency,
    status: rec.status,
    reasoning: rec.reasoning,
    expectedImpact: rec.expectedImpact,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    createdBy: rec.createdBy,
    updatedBy: rec.updatedBy,
  };
}

export const complianceRouter = router({
  // ========================================
  // COMPLIANCE FINDINGS PROCEDURES
  // ========================================

  /**
   * Get findings with filtering, searching, and pagination.
   * Supports:
   * - Multi-field search (title, description, recommendation, referenceTable)
   * - Filtering by findingType, severity, status, operatingUnitId, date range
   * - Pagination with configurable page size
   * - Sorting by createdAt, targetDate, severity
   */
  getFindings: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
        search: z.string().optional(),
        findingType: z.string().optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: z.string().optional(),
        operatingUnitId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        sortBy: z.enum(['createdAt', 'targetDate', 'severity']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceFindingsRepository(db);

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
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      });

      return {
        data: result.data.map(mapComplianceFindingForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get single finding by ID with all relations.
   * Returns complete finding details with project, user, and AI recommendation information.
   */
  getFindingById: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        findingId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceFindingsRepository(db);

      const finding = await repository.getFindingById(input.organizationId, input.findingId);

      if (!finding) {
        throw new Error('Finding not found or not accessible');
      }

      return mapComplianceFindingForRouter(finding);
    }),

  /**
   * Get compliance statistics for dashboard.
   * Returns SQL-based aggregations:
   * - Total, open, critical, high, medium, low, resolved, overdue findings
   * - Findings grouped by type, severity, status
   * - Average resolution time
   */
  getComplianceStats: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceFindingsRepository(db);

      const stats = await repository.getComplianceStatistics(input.organizationId, input.operatingUnitId);

      return {
        totalFindings: stats.totalFindings,
        openFindings: stats.openFindings,
        criticalFindings: stats.criticalFindings,
        highFindings: stats.highFindings,
        mediumFindings: stats.mediumFindings,
        lowFindings: stats.lowFindings,
        resolvedFindings: stats.resolvedFindings,
        overdueFindings: stats.overdueFindings,
        averageResolutionDays: stats.averageResolutionDays,
        byType: stats.byType,
        bySeverity: stats.bySeverity,
        byStatus: stats.byStatus,
      };
    }),

  /**
   * Get critical findings (severity = critical).
   * Paginated with sorting by daysOpen DESC (oldest first).
   */
  getCriticalFindings: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceFindingsRepository(db);

      const result = await repository.getFindings(input.organizationId, {
        page: input.page,
        pageSize: input.pageSize,
        severity: 'critical',
        operatingUnitId: input.operatingUnitId,
        sortBy: 'severity',
        sortOrder: 'desc',
      });

      return {
        data: result.data.map(mapComplianceFindingForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get open findings (status = open, reviewing, corrective_action).
   * Paginated with sorting by targetDate ASC (due soon first).
   */
  getOpenFindings: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceFindingsRepository(db);

      const result = await repository.getOpenFindings(
        input.organizationId,
        input.operatingUnitId,
        input.page,
        input.pageSize
      );

      return {
        data: result.data.map(mapComplianceFindingForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get findings by type.
   * Paginated with sorting by createdAt DESC (newest first).
   */
  getFindingsByType: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        findingType: z.string(),
        operatingUnitId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceFindingsRepository(db);

      const result = await repository.getFindingsByType(
        input.organizationId,
        input.findingType,
        input.operatingUnitId,
        input.page,
        input.pageSize
      );

      return {
        data: result.data.map(mapComplianceFindingForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get average resolution time metrics.
   * Returns average days from creation to resolution for resolved/closed findings.
   */
  getAverageResolutionTime: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new ComplianceFindingsRepository(db);

      const avgDays = await repository.getAverageResolutionTime(input.organizationId, input.operatingUnitId);

      return {
        averageResolutionDays: avgDays,
      };
    }),

  // ========================================
  // AI RECOMMENDATIONS PROCEDURES
  // ========================================

  /**
   * Get AI recommendations with filtering, searching, and pagination.
   * Supports:
   * - Multi-field search (title, recommendation, category)
   * - Filtering by status, priority, category, operatingUnitId, confidence threshold
   * - Pagination with configurable page size
   * - Sorting by savings, priority, confidence, createdAt
   * - Confidence threshold filtering (80%, 90%, 95%)
   */
  getRecommendations: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
        search: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        category: z.string().optional(),
        operatingUnitId: z.number().optional(),
        minConfidence: z.number().optional(),
        sortBy: z.enum(['savings', 'priority', 'confidence', 'createdAt']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const result = await repository.getRecommendations(input.organizationId, {
        page: input.page,
        pageSize: input.pageSize,
        search: input.search,
        status: input.status,
        priority: input.priority,
        category: input.category,
        operatingUnitId: input.operatingUnitId,
        minConfidence: input.minConfidence,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      });

      return {
        data: result.data.map(mapAIRecommendationForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get single AI recommendation by ID with all relations.
   * Returns complete recommendation details with finding, risk, and project information.
   */
  getRecommendationById: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        recommendationId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const recommendation = await repository.getRecommendationById(input.organizationId, input.recommendationId);

      if (!recommendation) {
        throw new Error('Recommendation not found or not accessible');
      }

      return mapAIRecommendationForRouter(recommendation);
    }),

  /**
   * Get AI recommendations statistics for dashboard.
   * Returns SQL-based aggregations:
   * - Total, new, accepted, implemented, dismissed recommendations
   * - Total and average estimated savings
   * - Average confidence
   * - Recommendations grouped by category, priority, status
   */
  getRecommendationStats: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const stats = await repository.getRecommendationStatistics(input.organizationId, input.operatingUnitId);

      return {
        totalRecommendations: stats.totalRecommendations,
        newRecommendations: stats.newRecommendations,
        acceptedRecommendations: stats.acceptedRecommendations,
        implementedRecommendations: stats.implementedRecommendations,
        dismissedRecommendations: stats.dismissedRecommendations,
        totalEstimatedSavings: stats.totalEstimatedSavings,
        averageConfidence: stats.averageConfidence,
        averageSavingsPerRecommendation: stats.averageSavingsPerRecommendation,
        byCategory: stats.byCategory,
        byPriority: stats.byPriority,
        byStatus: stats.byStatus,
      };
    }),

  /**
   * Get new recommendations (status = new).
   * Paginated with sorting by priority DESC (high priority first).
   */
  getNewRecommendations: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const result = await repository.getNewRecommendations(
        input.organizationId,
        input.operatingUnitId,
        input.page,
        input.pageSize
      );

      return {
        data: result.data.map(mapAIRecommendationForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get high-priority recommendations (priority = high).
   * Paginated with sorting by confidence DESC (most confident first).
   */
  getHighPriorityRecommendations: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const result = await repository.getHighPriorityRecommendations(
        input.organizationId,
        input.operatingUnitId,
        input.page,
        input.pageSize
      );

      return {
        data: result.data.map(mapAIRecommendationForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get high-confidence recommendations (confidence >= minConfidence).
   * Paginated with sorting by confidence DESC (most confident first).
   */
  getHighConfidenceRecommendations: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        minConfidence: z.number().default(80),
        operatingUnitId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const result = await repository.getHighConfidenceRecommendations(
        input.organizationId,
        input.minConfidence,
        input.operatingUnitId,
        input.page,
        input.pageSize
      );

      return {
        data: result.data.map(mapAIRecommendationForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get high-savings recommendations (estimatedSavings >= minSavings).
   * Paginated with sorting by savings DESC (highest savings first).
   */
  getHighSavingsRecommendations: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        minSavings: z.number().default(10000),
        operatingUnitId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const result = await repository.getHighSavingsRecommendations(
        input.organizationId,
        input.minSavings,
        input.operatingUnitId,
        input.page,
        input.pageSize
      );

      return {
        data: result.data.map(mapAIRecommendationForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get recommendations by category.
   * Paginated with sorting by createdAt DESC (newest first).
   */
  getRecommendationsByCategory: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        category: z.string(),
        operatingUnitId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const result = await repository.getRecommendationsByCategory(
        input.organizationId,
        input.category,
        input.operatingUnitId,
        input.page,
        input.pageSize
      );

      return {
        data: result.data.map(mapAIRecommendationForRouter),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    }),

  /**
   * Get latest recommendation for a specific finding.
   * Returns the most recent recommendation for a finding (not all recommendations).
   */
  getLatestRecommendationForFinding: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        findingId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const recommendation = await repository.getLatestRecommendationForFinding(
        input.organizationId,
        input.findingId
      );

      if (!recommendation) {
        return null;
      }

      return mapAIRecommendationForRouter(recommendation);
    }),

  /**
   * Get latest recommendation for a specific risk.
   * Returns the most recent recommendation for a risk (not all recommendations).
   */
  getLatestRecommendationForRisk: protectedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        riskId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new AIRecommendationsRepository(db);

      const recommendation = await repository.getLatestRecommendationForRisk(
        input.organizationId,
        input.riskId
      );

      if (!recommendation) {
        return null;
      }

      return mapAIRecommendationForRouter(recommendation);
    }),
});
