/**
 * ============================================================================
 * MEAL Reports Router - Aggregated Analytics from All MEAL Modules
 * ============================================================================
 * 
 * Provides unified data aggregation for the MEAL Reports dashboard:
 * - Overall MEAL Snapshot (KPIs)
 * - Indicator Performance Analysis
 * - Survey & Data Collection Insights
 * - Accountability & CRM Summary
 * - Risk & Learning Analysis
 * 
 * All data is scoped by organizationId + operatingUnitId (mandatory).
 * ============================================================================
 */

import { router, scopedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { 
  indicators, 
  mealSurveys, 
  mealSurveySubmissions, 
  mealAccountabilityRecords,
  mealIndicatorDataEntries,
  mealDocuments,
  projects
} from "../drizzle/schema";
import { eq, and, count, sql, desc, gte, lte } from "drizzle-orm";

export const mealReportsRouter = router({
  /**
   * Get aggregated MEAL snapshot - KPIs from all modules
   * Used for the top section of MEAL Reports dashboard
   */
  getSnapshot: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // ========== INDICATORS ==========
      const indicatorConditions: any[] = [
        eq(indicators.organizationId, organizationId),
        eq(indicators.isDeleted, false),
      ];
      if (operatingUnitId) {
        indicatorConditions.push(eq(indicators.operatingUnitId, operatingUnitId));
      }
      if (input.projectId) {
        indicatorConditions.push(eq(indicators.projectId, input.projectId));
      }
      
      const allIndicators = await db
        .select()
        .from(indicators)
        .where(and(...indicatorConditions));
      
      const indicatorsAchieved = allIndicators.filter(i => i.status === 'ACHIEVED').length;
      const indicatorsOnTrack = allIndicators.filter(i => i.status === 'ON_TRACK').length;
      const indicatorsAtRisk = allIndicators.filter(i => i.status === 'AT_RISK').length;
      const indicatorsOffTrack = allIndicators.filter(i => i.status === 'OFF_TRACK').length;
      
      // Calculate achievement rate from actual values
      const totalTarget = allIndicators.reduce((sum, i) => sum + parseFloat(i.target?.toString() || '0'), 0);
      const totalAchieved = allIndicators.reduce((sum, i) => sum + parseFloat(i.achievedValue?.toString() || '0'), 0);
      const achievementRate = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
      
      // ========== SURVEYS ==========
      const surveyConditions: any[] = [
        eq(mealSurveys.organizationId, organizationId),
        eq(mealSurveys.isDeleted, false),
      ];
      if (operatingUnitId) {
        surveyConditions.push(eq(mealSurveys.operatingUnitId, operatingUnitId));
      }
      if (input.projectId) {
        surveyConditions.push(eq(mealSurveys.projectId, input.projectId));
      }
      
      const allSurveys = await db
        .select()
        .from(mealSurveys)
        .where(and(...surveyConditions));
      
      // Submissions count
      const submissionConditions: any[] = [
        eq(mealSurveySubmissions.organizationId, organizationId),
        eq(mealSurveySubmissions.isDeleted, false),
      ];
      if (operatingUnitId) {
        submissionConditions.push(eq(mealSurveySubmissions.operatingUnitId, operatingUnitId));
      }
      
      const submissionsResult = await db
        .select({ count: count() })
        .from(mealSurveySubmissions)
        .where(and(...submissionConditions));
      const totalSubmissions = submissionsResult[0]?.count || 0;
      
      // ========== ACCOUNTABILITY ==========
      const accountabilityConditions: any[] = [
        eq(mealAccountabilityRecords.organizationId, organizationId),
        eq(mealAccountabilityRecords.isDeleted, false),
      ];
      if (operatingUnitId) {
        accountabilityConditions.push(eq(mealAccountabilityRecords.operatingUnitId, operatingUnitId));
      }
      
      const allAccountability = await db
        .select()
        .from(mealAccountabilityRecords)
        .where(and(...accountabilityConditions));
      
      const totalFeedback = allAccountability.length;
      const feedbackResolved = allAccountability.filter(r => 
        r.status === 'resolved' || r.status === 'closed'
      ).length;
      const resolutionRate = totalFeedback > 0 ? Math.round((feedbackResolved / totalFeedback) * 100) : 0;
      
      // ========== DATA COMPLETENESS ==========
      const dataEntryConditions: any[] = [
        eq(mealIndicatorDataEntries.organizationId, organizationId),
        eq(mealIndicatorDataEntries.isDeleted, false),
      ];
      if (operatingUnitId) {
        dataEntryConditions.push(eq(mealIndicatorDataEntries.operatingUnitId, operatingUnitId));
      }
      
      const allDataEntries = await db
        .select()
        .from(mealIndicatorDataEntries)
        .where(and(...dataEntryConditions));
      
      const verifiedEntries = allDataEntries.filter(e => e.isVerified).length;
      const dataCompletenessRate = allDataEntries.length > 0 
        ? Math.round((verifiedEntries / allDataEntries.length) * 100) 
        : 0;
      
      // ========== DOCUMENTS ==========
      const docConditions: any[] = [
        eq(mealDocuments.organizationId, organizationId),
        eq(mealDocuments.isDeleted, false),
      ];
      if (operatingUnitId) {
        docConditions.push(eq(mealDocuments.operatingUnitId, operatingUnitId));
      }
      const docsResult = await db
        .select({ count: count() })
        .from(mealDocuments)
        .where(and(...docConditions));
      const totalDocuments = docsResult[0]?.count || 0;
      
      return {
        // Indicators
        totalIndicators: allIndicators.length,
        indicatorsAchieved,
        indicatorsOnTrack,
        indicatorsAtRisk,
        indicatorsOffTrack,
        achievementRate,
        
        // Surveys
        totalSurveys: allSurveys.length,
        totalSubmissions,
        
        // Accountability
        totalFeedback,
        feedbackResolved,
        resolutionRate,
        
        // Data quality
        dataCompletenessRate,
        totalDataEntries: allDataEntries.length,
        verifiedDataEntries: verifiedEntries,
        
        // Documents
        totalDocuments,
      };
    }),

  /**
   * Get indicator performance data for charts
   * Returns target vs actual for top indicators + status distribution
   */
  getIndicatorPerformance: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const conditions: any[] = [
        eq(indicators.organizationId, organizationId),
        eq(indicators.isDeleted, false),
      ];
      if (operatingUnitId) {
        conditions.push(eq(indicators.operatingUnitId, operatingUnitId));
      }
      if (input.projectId) {
        conditions.push(eq(indicators.projectId, input.projectId));
      }
      
      const allIndicators = await db
        .select({
          id: indicators.id,
          name: indicators.indicatorName,
          nameAr: indicators.indicatorNameAr,
          type: indicators.type,
          target: indicators.target,
          achievedValue: indicators.achievedValue,
          baseline: indicators.baseline,
          status: indicators.status,
          unit: indicators.unit,
          projectId: indicators.projectId,
        })
        .from(indicators)
        .where(and(...conditions))
        .orderBy(desc(indicators.updatedAt))
        .limit(input.limit);
      
      // Target vs Actual data
      const targetVsActual = allIndicators.map(ind => ({
        name: (ind.name || '').substring(0, 20),
        nameAr: (ind.nameAr || ind.name || '').substring(0, 20),
        target: parseFloat(ind.target?.toString() || '0'),
        actual: parseFloat(ind.achievedValue?.toString() || '0'),
        status: ind.status,
        type: ind.type,
      }));
      
      // Get data entries for progress over time
      const dataEntryConditions: any[] = [
        eq(mealIndicatorDataEntries.organizationId, organizationId),
        eq(mealIndicatorDataEntries.isDeleted, false),
      ];
      if (operatingUnitId) {
        dataEntryConditions.push(eq(mealIndicatorDataEntries.operatingUnitId, operatingUnitId));
      }
      if (input.projectId) {
        dataEntryConditions.push(eq(mealIndicatorDataEntries.projectId, input.projectId));
      }
      
      const dataEntries = await db
        .select()
        .from(mealIndicatorDataEntries)
        .where(and(...dataEntryConditions))
        .orderBy(mealIndicatorDataEntries.periodStartDate);
      
      // Group data entries by reporting period for progress over time
      const periodMap = new Map<string, { period: string; totalAchieved: number; count: number }>();
      dataEntries.forEach(entry => {
        const period = entry.reportingPeriod || 'Unknown';
        const existing = periodMap.get(period);
        const val = parseFloat(entry.achievedValue?.toString() || '0');
        if (existing) {
          existing.totalAchieved += val;
          existing.count += 1;
        } else {
          periodMap.set(period, { period, totalAchieved: val, count: 1 });
        }
      });
      
      const progressOverTime = Array.from(periodMap.values())
        .slice(-12)
        .map(p => ({
          period: p.period,
          achieved: Math.round(p.totalAchieved),
          entries: p.count,
        }));
      
      // At-risk indicators (top 5)
      const atRiskIndicators = allIndicators
        .filter(i => i.status === 'AT_RISK' || i.status === 'OFF_TRACK')
        .slice(0, 5)
        .map(i => ({
          name: i.name,
          nameAr: i.nameAr,
          target: parseFloat(i.target?.toString() || '0'),
          actual: parseFloat(i.achievedValue?.toString() || '0'),
          status: i.status,
        }));
      
      return {
        targetVsActual,
        progressOverTime,
        atRiskIndicators,
      };
    }),

  /**
   * Get survey insights data for charts
   */
  getSurveyInsights: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Get surveys by type
      const surveyConditions: any[] = [
        eq(mealSurveys.organizationId, organizationId),
        eq(mealSurveys.isDeleted, false),
      ];
      if (operatingUnitId) {
        surveyConditions.push(eq(mealSurveys.operatingUnitId, operatingUnitId));
      }
      if (input.projectId) {
        surveyConditions.push(eq(mealSurveys.projectId, input.projectId));
      }
      
      const allSurveys = await db
        .select()
        .from(mealSurveys)
        .where(and(...surveyConditions));
      
      // Surveys by type
      const surveysByType: Record<string, number> = {};
      allSurveys.forEach(s => {
        const type = s.surveyType || 'custom';
        surveysByType[type] = (surveysByType[type] || 0) + 1;
      });
      
      // Surveys by status
      const surveysByStatus = {
        draft: allSurveys.filter(s => s.status === 'draft').length,
        published: allSurveys.filter(s => s.status === 'published').length,
        closed: allSurveys.filter(s => s.status === 'closed').length,
        archived: allSurveys.filter(s => s.status === 'archived').length,
      };
      
      // Get submissions
      const submissionConditions: any[] = [
        eq(mealSurveySubmissions.organizationId, organizationId),
        eq(mealSurveySubmissions.isDeleted, false),
      ];
      if (operatingUnitId) {
        submissionConditions.push(eq(mealSurveySubmissions.operatingUnitId, operatingUnitId));
      }
      
      const allSubmissions = await db
        .select()
        .from(mealSurveySubmissions)
        .where(and(...submissionConditions));
      
      // Submissions by status
      const completedSubmissions = allSubmissions.filter(s => s.status === 'completed').length;
      const partialSubmissions = allSubmissions.filter(s => s.status === 'partial').length;
      
      return {
        surveysByType: Object.entries(surveysByType).map(([type, count]) => ({ type, count })),
        surveysByStatus,
        totalSubmissions: allSubmissions.length,
        completedSubmissions,
        partialSubmissions,
      };
    }),

  /**
   * Get accountability summary data for charts
   */
  getAccountabilitySummary: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const conditions: any[] = [
        eq(mealAccountabilityRecords.organizationId, organizationId),
        eq(mealAccountabilityRecords.isDeleted, false),
      ];
      if (operatingUnitId) {
        conditions.push(eq(mealAccountabilityRecords.operatingUnitId, operatingUnitId));
      }
      
      const allRecords = await db
        .select()
        .from(mealAccountabilityRecords)
        .where(and(...conditions));
      
      // By type
      const byType = {
        complaints: allRecords.filter(r => r.recordType === 'complaint').length,
        feedback: allRecords.filter(r => r.recordType === 'feedback').length,
        suggestions: allRecords.filter(r => r.recordType === 'suggestion').length,
      };
      
      // By status
      const byStatus = {
        open: allRecords.filter(r => r.status === 'open').length,
        inProgress: allRecords.filter(r => r.status === 'in_progress').length,
        resolved: allRecords.filter(r => r.status === 'resolved').length,
        closed: allRecords.filter(r => r.status === 'closed').length,
      };
      
      // By severity
      const bySeverity = {
        low: allRecords.filter(r => r.severity === 'low').length,
        medium: allRecords.filter(r => r.severity === 'medium').length,
        high: allRecords.filter(r => r.severity === 'high').length,
        critical: allRecords.filter(r => r.severity === 'critical').length,
      };
      
      // By category
      const categoryMap = new Map<string, number>();
      allRecords.forEach(r => {
        if (r.category) {
          categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1);
        }
      });
      const byCategory = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      
      return {
        total: allRecords.length,
        byType,
        byStatus,
        bySeverity,
        byCategory,
      };
    }),

  /**
   * Get project list for filter dropdown
   */
  getProjectsForFilter: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const conditions: any[] = [
        eq(projects.organizationId, organizationId),
        eq(projects.isDeleted, false),
      ];
      if (operatingUnitId) {
        conditions.push(eq(projects.operatingUnitId, operatingUnitId));
      }
      
      const projectList = await db
        .select({
          id: projects.id,
          name: projects.titleEn,
          nameAr: projects.titleAr,
          code: projects.projectCode,
        })
        .from(projects)
        .where(and(...conditions))
        .orderBy(projects.titleEn);
      
      return projectList;
    }),
});
