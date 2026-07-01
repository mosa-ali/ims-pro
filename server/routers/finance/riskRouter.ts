/**
 * server/routers/finance/riskRouter.ts
 *
 * Finance Risk Subrouter
 * Handles risk assessment, alerts, and risk register management.
 *
 * Dashboard Procedures (Executive Summary):
 * - getRiskAssessment() - Overall risk assessment
 * - getRiskAlerts() - Active risk alerts
 * - getRiskByCategory() - Risk breakdown by category
 * - getRiskTrend() - Risk trend analysis
 *
 * Risk Register Procedures (Operational Management):
 * - getRisks() - Get risks with filtering, searching, pagination
 * - getRiskById() - Get single risk with relations
 * - getRiskStats() - Dashboard statistics
 * - getRisksByCategory() - Risks grouped by category
 * - getTopCriticalRisks() - Top critical risks
 */

import { router, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getDb } from '../../db';
import { RiskRepository } from '../../repositories/finance/RiskRepository';
import type { RiskRegisterStats, RiskRegisterRecord, PaginatedResponse, FullAIRecommendation } from '../../../shared/types/financeRouterTypes';

// ─── Type Mappers ───────────────────────────────────────────────────────────
// Transform repository types to router contract types

function mapToRiskRegisterStats(stats: any): RiskRegisterStats {
  return {
    total: stats.total ?? 0,
    critical: stats.critical ?? 0,
    high: stats.high ?? 0,
    medium: stats.medium ?? 0,
    low: stats.low ?? 0,
    open: stats.open ?? 0,
    underReview: stats.underReview ?? 0,
    resolved: stats.resolved ?? 0,
    totalExposure: stats.totalExposure ?? 0,
    currency: stats.currency ?? 'USD',
  };
}

function mapToRiskRegisterRecord(risk: any): RiskRegisterRecord {
  return {
    id: risk.id?.toString() ?? '',
    riskId: risk.riskId?.toString() ?? '',
    title: risk.title ?? '',
    description: risk.description ?? '',
    category: risk.category ?? '',
    projectCode: risk.projectCode,
    projectName: risk.projectName,
    donorName: risk.donorName,
    grantCode: risk.grantCode,
    likelihood: risk.likelihood ?? 0,
    impact: risk.impact ?? 0,
    riskScore: risk.riskScore ?? 0,
    financialExposure: risk.financialExposure ?? 0,
    currency: risk.currency ?? 'USD',
    status: risk.status ?? 'open',
    owner: risk.owner,
    dueDate: risk.dueDate,
    detectedDate: risk.detectedDate,
    mitigationPlan: risk.mitigationPlan,
    hasAiRecommendation: risk.hasAiRecommendation ?? false,
    operatingUnit: risk.operatingUnit,
  };
}

export const riskRouter = router({
  // ========================================
  // DASHBOARD PROCEDURES (Executive Summary)
  // ========================================

  /**
   * Get overall risk assessment.
   */
  getRiskAssessment: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const stats = await repository.getRiskStats(input.organizationId, input.operatingUnitId);

      return mapToRiskRegisterStats(stats);
    }),

  /**
   * Get active risk alerts.
   */
  getRiskAlerts: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const topRisks = await repository.getTopCriticalRisks(
        input.organizationId,
        input.operatingUnitId,
        10
      );

      return topRisks.map(mapToRiskRegisterRecord);
    }),

  /**
   * Get risk breakdown by category.
   */
  getRiskByCategory: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const grouped = await repository.getRisksByCategory(
        input.organizationId,
        input.operatingUnitId
      );

      return grouped.map(mapToRiskRegisterRecord);
    }),

  /**
   * Get risk trend analysis.
   */
  getRiskTrend: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        months: z.number().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const topRisks = await repository.getTopCriticalRisks(
        input.organizationId,
        input.operatingUnitId,
        5
      );

      return topRisks.map(mapToRiskRegisterRecord);
    }),

  // ========================================
  // RISK REGISTER PROCEDURES (Operational)
  // ========================================

  /**
   * Get risks with filtering, searching, and pagination.
   */
  getRisks: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        page: z.number().default(1),
        pageSize: z.number().default(10),
        search: z.string().optional(),
        category: z.string().optional(),
        riskLevel: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        status: z.enum(['open', 'mitigating', 'resolved', 'accepted']).optional(),
        likelihood: z.enum(['rare', 'unlikely', 'possible', 'likely', 'almost_certain']).optional(),
        impact: z.enum(['negligible', 'minor', 'moderate', 'major', 'catastrophic']).optional(),
        ownerId: z.number().optional(),
        projectId: z.number().optional(),
        donorId: z.number().optional(),
        operatingUnitId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const result = await repository.getRisks(input.organizationId, {
        page: input.page,
        pageSize: input.pageSize,
        search: input.search,
        category: input.category,
        riskLevel: input.riskLevel,
        status: input.status,
        likelihood: input.likelihood,
        impact: input.impact,
        ownerId: input.ownerId,
        projectId: input.projectId,
        donorId: input.donorId,
        operatingUnitId: input.operatingUnitId,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      return {
        data: result.data.map(mapToRiskRegisterRecord),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      } as PaginatedResponse<RiskRegisterRecord>;
    }),

  /**
   * Get single risk by ID with all relations.
   */
  getRiskById: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        riskId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const risk = await repository.getRiskById(input.organizationId, parseInt(input.riskId));

      if (!risk) {
        throw new Error('Risk not found');
      }

      return mapToRiskRegisterRecord(risk);
    }),

  /**
   * Get risk statistics for dashboard.
   */
  getRiskStats: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const stats = await repository.getRiskStats(input.organizationId, input.operatingUnitId);

      return mapToRiskRegisterStats(stats);
    }),

  /**
   * Get risks grouped by category.
   */
  getRisksByCategory: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const grouped = await repository.getRisksByCategory(input.organizationId, input.operatingUnitId);

      return grouped.map(mapToRiskRegisterRecord);
    }),

  /**
   * Get top critical risks.
   */
  getTopCriticalRisks: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        limit: z.number().default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      const topRisks = await repository.getTopCriticalRisks(
        input.organizationId,
        input.operatingUnitId,
        input.limit
      );

      return topRisks.map(mapToRiskRegisterRecord);
    }),

  /**
   * Get AI recommendations for a specific risk.
   */
  getAIRecommendationsByRisk: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        riskId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // TODO: Integrate with AIExecutiveEngine to generate recommendations
      // For now, return placeholder recommendations
      const recommendations: FullAIRecommendation[] = [
        {
          id: '1',
          priority: 'high',
          category: 'risk_mitigation',
          confidence: 0.92,
          title: 'Implement Risk Mitigation Strategy',
          reasoning: 'Based on historical risk data and industry best practices',
          recommendation: 'Develop and execute a comprehensive mitigation plan',
          expectedImpact: 'High',
          estimatedSavings: 75000,
          currency: 'USD',
          status: 'pending',
        },
      ];

      return recommendations;
    }),

  /**
   * Export risks in specified format.
   */
  exportRisks: scopedProcedure
    .input(
      z.object({
        organizationId: z.number(),
        operatingUnitId: z.number().optional(),
        riskIds: z.array(z.string()).optional(),
        format: z.enum(['excel', 'csv', 'pdf']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const repository = new RiskRepository(db);

      let risks;
      if (input.riskIds && input.riskIds.length > 0) {
        risks = [];
        for (const id of input.riskIds) {
          const risk = await repository.getRiskById(input.organizationId, parseInt(id));
          if (risk) risks.push(risk);
        }
      } else {
        const result = await repository.getRisks(input.organizationId, {
          page: 1,
          pageSize: 10000,
          operatingUnitId: input.operatingUnitId,
        });
        risks = result.data;
      }

      // TODO: Implement actual export logic based on format
      return {
        format: input.format,
        recordCount: risks.length,
        downloadUrl: `/api/exports/risks-${Date.now()}.${input.format === 'excel' ? 'xlsx' : input.format}`,
      };
    }),
});
