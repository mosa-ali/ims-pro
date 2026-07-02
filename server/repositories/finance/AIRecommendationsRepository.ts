/**
 * server/repositories/finance/AIRecommendationsRepository.ts
 *
 * AI Recommendations Repository — REFACTORED
 * Data access layer for AI recommendations management with full filtering, search, pagination, and joins.
 *
 * Architecture:
 * - Constructor injection of DB instance (consistent with other Finance repositories)
 * - No singleton pattern (removed for consistency)
 * - Unified getRecommendations() with search, filtering, pagination, sorting
 * - Database joins with findings, risks, projects
 * - Latest recommendation per risk/finding (not all recommendations)
 * - Confidence threshold filtering (80%, 90%, 95%)
 * - Sorting by savings, priority, confidence, createdAt
 * - Calculated fields: estimatedSavingsFormatted, confidencePercent
 * - SQL-based statistics instead of in-memory filtering
 * - Soft delete support (isDeleted, deletedAt)
 * - Audit trail fields (createdBy, updatedBy, updatedAt)
 * - Multi-tenancy enforcement (organizationId + operatingUnitId)
 */

import { and, eq, sql, count, gte, lte, like, or, desc, asc, leftJoin, isNull } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  financeAiRecommendations,
  financeComplianceFindings,
  financeFinancialRisks,
  projects,
  type SelectFinanceAiRecommendation,
  type InsertFinanceAiRecommendation,
} from '../../../drizzle/schema';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * AI Recommendation Record — List/Paginated View
 * Returned by getRecommendations() with calculated fields and basic joins.
 */
export interface AIRecommendationRecord extends SelectFinanceAiRecommendation {
  findingTitle?: string | null;
  riskTitle?: string | null;
  projectCode?: string | null;
  projectName?: string | null;
  confidencePercent: number;
  estimatedSavingsFormatted: string;
}

/**
 * AI Recommendation Detail — Single Record View
 * Returned by getRecommendationById() with enhanced joins.
 */
export interface AIRecommendationDetail extends AIRecommendationRecord {
  findingDescription?: string | null;
  riskDescription?: string | null;
}

/**
 * Paginated Recommendations Response
 * Standard pagination wrapper for list queries.
 */
export interface PaginatedRecommendationsResponse {
  data: AIRecommendationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * AI Recommendations Statistics
 * SQL-based aggregations for dashboard metrics.
 */
export interface RecommendationStatistics {
  totalRecommendations: number;
  newRecommendations: number;
  acceptedRecommendations: number;
  implementedRecommendations: number;
  dismissedRecommendations: number;
  totalEstimatedSavings: number;
  averageConfidence: number;
  averageSavingsPerRecommendation: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: any): number {
  if (v == null) return 0;
  const n = typeof v === 'object' && 'toNumber' in v ? v.toNumber() : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

/**
 * Format estimated savings with currency
 */
function formatSavings(savings: number | null, currency: string = 'USD'): string {
  if (!savings) return `$0 ${currency}`;
  return `$${savings.toLocaleString()} ${currency}`;
}

/**
 * Convert confidence decimal to percentage
 */
function confidenceToPercent(confidence: number | null): number {
  if (!confidence) return 0;
  const num = toNum(confidence);
  return num > 1 ? num : Math.round(num * 100);
}

// ── AI Recommendations Repository ────────────────────────────────────────────

export class AIRecommendationsRepository {
  constructor(private db: DB) {}

  /**
   * Get AI recommendations with full filtering, search, pagination, and joins.
   *
   * Supports:
   * - Multi-field search (title, recommendation, category)
   * - Filtering by status, priority, category, operatingUnitId, confidence threshold
   * - Pagination with configurable page size
   * - Joins with findings, risks, projects
   * - Calculated fields: confidencePercent, estimatedSavingsFormatted
   * - Sorting by savings, priority, confidence, createdAt
   * - Strict multi-tenancy: organizationId required, operatingUnitId optional
   * - Soft delete support: excludes isDeleted records
   */
  async getRecommendations(
    organizationId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      priority?: string;
      category?: string;
      operatingUnitId?: number;
      minConfidence?: number; // 80, 90, 95 for threshold filtering
      sortBy?: 'savings' | 'priority' | 'confidence' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<PaginatedRecommendationsResponse> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const offset = (page - 1) * pageSize;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    // Build WHERE conditions
    const whereConditions = [
      eq(financeAiRecommendations.organizationId, organizationId),
      eq(financeAiRecommendations.isDeleted, 0), // Exclude soft-deleted records
    ];

    if (options.operatingUnitId) {
      whereConditions.push(eq(financeAiRecommendations.operatingUnitId, options.operatingUnitId));
    }
    if (options.status) {
      whereConditions.push(eq(financeAiRecommendations.status, options.status));
    }
    if (options.priority) {
      whereConditions.push(eq(financeAiRecommendations.priority, options.priority));
    }
    if (options.category) {
      whereConditions.push(eq(financeAiRecommendations.category, options.category));
    }
    if (options.minConfidence !== undefined) {
      // Confidence threshold: 80, 90, 95
      whereConditions.push(gte(financeAiRecommendations.confidence, options.minConfidence));
    }
    if (options.search) {
      whereConditions.push(
        or(
          like(financeAiRecommendations.title, `%${options.search}%`),
          like(financeAiRecommendations.recommendation, `%${options.search}%`),
          like(financeAiRecommendations.category, `%${options.search}%`)
        )
      );
    }

    // Get total count (parallel query)
    const countResult = await this.db
      .select({ count: count() })
      .from(financeAiRecommendations)
      .where(and(...whereConditions));
    const total = toNum(countResult[0]?.count) || 0;

    // Determine sort column and direction
    let orderByClause;
    const sortDirection = sortOrder === 'asc' ? asc : desc;
    if (sortBy === 'savings') {
      orderByClause = sortDirection(financeAiRecommendations.estimatedSavings);
    } else if (sortBy === 'priority') {
      orderByClause = sortDirection(financeAiRecommendations.priority);
    } else if (sortBy === 'confidence') {
      orderByClause = sortDirection(financeAiRecommendations.confidence);
    } else {
      orderByClause = sortDirection(financeAiRecommendations.createdAt);
    }

    // Get paginated recommendations with joins
    const rows = await this.db
      .select({
        id: financeAiRecommendations.id,
        organizationId: financeAiRecommendations.organizationId,
        operatingUnitId: financeAiRecommendations.operatingUnitId,
        findingId: financeAiRecommendations.findingId,
        riskId: financeAiRecommendations.riskId,
        projectId: financeAiRecommendations.projectId,
        title: financeAiRecommendations.title,
        recommendation: financeAiRecommendations.recommendation,
        category: financeAiRecommendations.category,
        priority: financeAiRecommendations.priority,
        confidence: financeAiRecommendations.confidence,
        estimatedSavings: financeAiRecommendations.estimatedSavings,
        currency: financeAiRecommendations.currency,
        status: financeAiRecommendations.status,
        reasoning: financeAiRecommendations.reasoning,
        expectedImpact: financeAiRecommendations.expectedImpact,
        createdAt: financeAiRecommendations.createdAt,
        updatedAt: financeAiRecommendations.updatedAt,
        createdBy: financeAiRecommendations.createdBy,
        updatedBy: financeAiRecommendations.updatedBy,
        isDeleted: financeAiRecommendations.isDeleted,
        deletedAt: financeAiRecommendations.deletedAt,
        // Finding joins
        findingTitle: financeComplianceFindings.title,
        // Risk joins
        riskTitle: financeFinancialRisks.title,
        // Project joins
        projectCode: projects.projectCode,
        projectName: projects.title,
      })
      .from(financeAiRecommendations)
      .leftJoin(financeComplianceFindings, eq(financeAiRecommendations.findingId, financeComplianceFindings.id))
      .leftJoin(financeFinancialRisks, eq(financeAiRecommendations.riskId, financeFinancialRisks.id))
      .leftJoin(projects, eq(financeAiRecommendations.projectId, projects.id))
      .where(and(...whereConditions))
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset);

    // Transform rows to include calculated fields
    const data: AIRecommendationRecord[] = rows.map(row => ({
      ...row,
      confidencePercent: confidenceToPercent(row.confidence),
      estimatedSavingsFormatted: formatSavings(toNum(row.estimatedSavings), row.currency || 'USD'),
    }));

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get a single AI recommendation by ID with all relations and calculated fields.
   *
   * Returns:
   * - Complete recommendation details
   * - Finding information (title, description)
   * - Risk information (title, description)
   * - Project information (code, name)
   * - Calculated fields: confidencePercent, estimatedSavingsFormatted
   * - Returns null if not found or not accessible by organizationId
   */
  async getRecommendationById(
    organizationId: number,
    recommendationId: number
  ): Promise<AIRecommendationDetail | null> {
    const rows = await this.db
      .select({
        id: financeAiRecommendations.id,
        organizationId: financeAiRecommendations.organizationId,
        operatingUnitId: financeAiRecommendations.operatingUnitId,
        findingId: financeAiRecommendations.findingId,
        riskId: financeAiRecommendations.riskId,
        projectId: financeAiRecommendations.projectId,
        title: financeAiRecommendations.title,
        recommendation: financeAiRecommendations.recommendation,
        category: financeAiRecommendations.category,
        priority: financeAiRecommendations.priority,
        confidence: financeAiRecommendations.confidence,
        estimatedSavings: financeAiRecommendations.estimatedSavings,
        currency: financeAiRecommendations.currency,
        status: financeAiRecommendations.status,
        reasoning: financeAiRecommendations.reasoning,
        expectedImpact: financeAiRecommendations.expectedImpact,
        createdAt: financeAiRecommendations.createdAt,
        updatedAt: financeAiRecommendations.updatedAt,
        createdBy: financeAiRecommendations.createdBy,
        updatedBy: financeAiRecommendations.updatedBy,
        isDeleted: financeAiRecommendations.isDeleted,
        deletedAt: financeAiRecommendations.deletedAt,
        // Finding joins
        findingTitle: financeComplianceFindings.title,
        findingDescription: financeComplianceFindings.description,
        // Risk joins
        riskTitle: financeFinancialRisks.title,
        riskDescription: financeFinancialRisks.description,
        // Project joins
        projectCode: projects.projectCode,
        projectName: projects.title,
      })
      .from(financeAiRecommendations)
      .leftJoin(financeComplianceFindings, eq(financeAiRecommendations.findingId, financeComplianceFindings.id))
      .leftJoin(financeFinancialRisks, eq(financeAiRecommendations.riskId, financeFinancialRisks.id))
      .leftJoin(projects, eq(financeAiRecommendations.projectId, projects.id))
      .where(
        and(
          eq(financeAiRecommendations.id, recommendationId),
          eq(financeAiRecommendations.organizationId, organizationId),
          eq(financeAiRecommendations.isDeleted, 0)
        )
      )
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];

    return {
      ...row,
      confidencePercent: confidenceToPercent(row.confidence),
      estimatedSavingsFormatted: formatSavings(toNum(row.estimatedSavings), row.currency || 'USD'),
    };
  }

  /**
   * Create a new AI recommendation
   */
  async createRecommendation(
    organizationId: number,
    data: Omit<InsertFinanceAiRecommendation, 'organizationId'>,
    createdBy?: number
  ): Promise<SelectFinanceAiRecommendation> {
    const [result] = await this.db
      .insert(financeAiRecommendations)
      .values({
        ...data,
        organizationId,
        createdBy,
        isDeleted: 0,
      } as InsertFinanceAiRecommendation)
      .execute();

    const recommendation = await this.getRecommendationById(organizationId, result.insertId as number);
    if (!recommendation) {
      throw new Error('Failed to create recommendation');
    }
    return recommendation as SelectFinanceAiRecommendation;
  }

  /**
   * Update a recommendation
   */
  async updateRecommendation(
    organizationId: number,
    recommendationId: number,
    data: Partial<Omit<InsertFinanceAiRecommendation, 'organizationId'>>,
    updatedBy?: number
  ): Promise<SelectFinanceAiRecommendation | null> {
    await this.db
      .update(financeAiRecommendations)
      .set({
        ...data,
        updatedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(financeAiRecommendations.id, recommendationId),
          eq(financeAiRecommendations.organizationId, organizationId),
          eq(financeAiRecommendations.isDeleted, 0)
        )
      )
      .execute();

    return this.getRecommendationById(organizationId, recommendationId);
  }

  /**
   * Soft delete a recommendation
   */
  async deleteRecommendation(
    organizationId: number,
    recommendationId: number,
    deletedBy?: number
  ): Promise<boolean> {
    const result = await this.db
      .update(financeAiRecommendations)
      .set({
        isDeleted: 1,
        deletedAt: new Date().toISOString(),
        updatedBy: deletedBy,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(financeAiRecommendations.id, recommendationId),
          eq(financeAiRecommendations.organizationId, organizationId),
          eq(financeAiRecommendations.isDeleted, 0)
        )
      )
      .execute();

    return (result.affectedRows || 0) > 0;
  }

  /**
   * Get latest recommendation for a specific finding (not all recommendations)
   */
  async getLatestRecommendationForFinding(
    organizationId: number,
    findingId: number
  ): Promise<AIRecommendationDetail | null> {
    const rows = await this.db
      .select({
        id: financeAiRecommendations.id,
        organizationId: financeAiRecommendations.organizationId,
        operatingUnitId: financeAiRecommendations.operatingUnitId,
        findingId: financeAiRecommendations.findingId,
        riskId: financeAiRecommendations.riskId,
        projectId: financeAiRecommendations.projectId,
        title: financeAiRecommendations.title,
        recommendation: financeAiRecommendations.recommendation,
        category: financeAiRecommendations.category,
        priority: financeAiRecommendations.priority,
        confidence: financeAiRecommendations.confidence,
        estimatedSavings: financeAiRecommendations.estimatedSavings,
        currency: financeAiRecommendations.currency,
        status: financeAiRecommendations.status,
        reasoning: financeAiRecommendations.reasoning,
        expectedImpact: financeAiRecommendations.expectedImpact,
        createdAt: financeAiRecommendations.createdAt,
        updatedAt: financeAiRecommendations.updatedAt,
        createdBy: financeAiRecommendations.createdBy,
        updatedBy: financeAiRecommendations.updatedBy,
        isDeleted: financeAiRecommendations.isDeleted,
        deletedAt: financeAiRecommendations.deletedAt,
        // Finding joins
        findingTitle: financeComplianceFindings.title,
        findingDescription: financeComplianceFindings.description,
        // Risk joins
        riskTitle: financeFinancialRisks.title,
        riskDescription: financeFinancialRisks.description,
        // Project joins
        projectCode: projects.projectCode,
        projectName: projects.title,
      })
      .from(financeAiRecommendations)
      .leftJoin(financeComplianceFindings, eq(financeAiRecommendations.findingId, financeComplianceFindings.id))
      .leftJoin(financeFinancialRisks, eq(financeAiRecommendations.riskId, financeFinancialRisks.id))
      .leftJoin(projects, eq(financeAiRecommendations.projectId, projects.id))
      .where(
        and(
          eq(financeAiRecommendations.organizationId, organizationId),
          eq(financeAiRecommendations.findingId, findingId),
          eq(financeAiRecommendations.isDeleted, 0)
        )
      )
      .orderBy(desc(financeAiRecommendations.createdAt))
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];

    return {
      ...row,
      confidencePercent: confidenceToPercent(row.confidence),
      estimatedSavingsFormatted: formatSavings(toNum(row.estimatedSavings), row.currency || 'USD'),
    };
  }

  /**
   * Get latest recommendation for a specific risk (not all recommendations)
   */
  async getLatestRecommendationForRisk(
    organizationId: number,
    riskId: number
  ): Promise<AIRecommendationDetail | null> {
    const rows = await this.db
      .select({
        id: financeAiRecommendations.id,
        organizationId: financeAiRecommendations.organizationId,
        operatingUnitId: financeAiRecommendations.operatingUnitId,
        findingId: financeAiRecommendations.findingId,
        riskId: financeAiRecommendations.riskId,
        projectId: financeAiRecommendations.projectId,
        title: financeAiRecommendations.title,
        recommendation: financeAiRecommendations.recommendation,
        category: financeAiRecommendations.category,
        priority: financeAiRecommendations.priority,
        confidence: financeAiRecommendations.confidence,
        estimatedSavings: financeAiRecommendations.estimatedSavings,
        currency: financeAiRecommendations.currency,
        status: financeAiRecommendations.status,
        reasoning: financeAiRecommendations.reasoning,
        expectedImpact: financeAiRecommendations.expectedImpact,
        createdAt: financeAiRecommendations.createdAt,
        updatedAt: financeAiRecommendations.updatedAt,
        createdBy: financeAiRecommendations.createdBy,
        updatedBy: financeAiRecommendations.updatedBy,
        isDeleted: financeAiRecommendations.isDeleted,
        deletedAt: financeAiRecommendations.deletedAt,
        // Finding joins
        findingTitle: financeComplianceFindings.title,
        findingDescription: financeComplianceFindings.description,
        // Risk joins
        riskTitle: financeFinancialRisks.title,
        riskDescription: financeFinancialRisks.description,
        // Project joins
        projectCode: projects.projectCode,
        projectName: projects.title,
      })
      .from(financeAiRecommendations)
      .leftJoin(financeComplianceFindings, eq(financeAiRecommendations.findingId, financeComplianceFindings.id))
      .leftJoin(financeFinancialRisks, eq(financeAiRecommendations.riskId, financeFinancialRisks.id))
      .leftJoin(projects, eq(financeAiRecommendations.projectId, projects.id))
      .where(
        and(
          eq(financeAiRecommendations.organizationId, organizationId),
          eq(financeAiRecommendations.riskId, riskId),
          eq(financeAiRecommendations.isDeleted, 0)
        )
      )
      .orderBy(desc(financeAiRecommendations.createdAt))
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];

    return {
      ...row,
      confidencePercent: confidenceToPercent(row.confidence),
      estimatedSavingsFormatted: formatSavings(toNum(row.estimatedSavings), row.currency || 'USD'),
    };
  }

  /**
   * Get AI recommendations statistics using SQL aggregations
   * Much faster than in-memory filtering for large datasets
   */
  async getRecommendationStatistics(
    organizationId: number,
    operatingUnitId?: number
  ): Promise<RecommendationStatistics> {
    const whereConditions = [
      eq(financeAiRecommendations.organizationId, organizationId),
      eq(financeAiRecommendations.isDeleted, 0),
    ];

    if (operatingUnitId) {
      whereConditions.push(eq(financeAiRecommendations.operatingUnitId, operatingUnitId));
    }

    // Get aggregated statistics
    const stats = await this.db
      .select({
        totalRecommendations: count(),
        newRecommendations: sql<number>`COUNT(CASE WHEN ${financeAiRecommendations.status} = 'new' THEN 1 END)`,
        acceptedRecommendations: sql<number>`COUNT(CASE WHEN ${financeAiRecommendations.status} = 'accepted' THEN 1 END)`,
        implementedRecommendations: sql<number>`COUNT(CASE WHEN ${financeAiRecommendations.status} = 'implemented' THEN 1 END)`,
        dismissedRecommendations: sql<number>`COUNT(CASE WHEN ${financeAiRecommendations.status} = 'dismissed' THEN 1 END)`,
        totalEstimatedSavings: sql<number>`SUM(${financeAiRecommendations.estimatedSavings})`,
        averageConfidence: sql<number>`AVG(${financeAiRecommendations.confidence})`,
        averageSavingsPerRecommendation: sql<number>`AVG(${financeAiRecommendations.estimatedSavings})`,
      })
      .from(financeAiRecommendations)
      .where(and(...whereConditions));

    // Get recommendations grouped by category, priority, and status
    const byCategory = await this.db
      .select({
        category: financeAiRecommendations.category,
        count: count(),
      })
      .from(financeAiRecommendations)
      .where(and(...whereConditions))
      .groupBy(financeAiRecommendations.category);

    const byPriority = await this.db
      .select({
        priority: financeAiRecommendations.priority,
        count: count(),
      })
      .from(financeAiRecommendations)
      .where(and(...whereConditions))
      .groupBy(financeAiRecommendations.priority);

    const byStatus = await this.db
      .select({
        status: financeAiRecommendations.status,
        count: count(),
      })
      .from(financeAiRecommendations)
      .where(and(...whereConditions))
      .groupBy(financeAiRecommendations.status);

    const statRow = stats[0] || {};

    return {
      totalRecommendations: toNum(statRow.totalRecommendations),
      newRecommendations: toNum(statRow.newRecommendations),
      acceptedRecommendations: toNum(statRow.acceptedRecommendations),
      implementedRecommendations: toNum(statRow.implementedRecommendations),
      dismissedRecommendations: toNum(statRow.dismissedRecommendations),
      totalEstimatedSavings: Math.round(toNum(statRow.totalEstimatedSavings)),
      averageConfidence: Math.round(confidenceToPercent(toNum(statRow.averageConfidence))),
      averageSavingsPerRecommendation: Math.round(toNum(statRow.averageSavingsPerRecommendation)),
      byCategory: Object.fromEntries(byCategory.map(row => [row.category || 'unknown', toNum(row.count)])),
      byPriority: Object.fromEntries(byPriority.map(row => [row.priority || 'unknown', toNum(row.count)])),
      byStatus: Object.fromEntries(byStatus.map(row => [row.status || 'unknown', toNum(row.count)])),
    };
  }

  /**
   * Get new recommendations with pagination
   */
  async getNewRecommendations(
    organizationId: number,
    operatingUnitId?: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRecommendationsResponse> {
    return this.getRecommendations(organizationId, {
      page,
      pageSize,
      status: 'new',
      operatingUnitId,
      sortBy: 'priority',
      sortOrder: 'desc',
    });
  }

  /**
   * Get high-priority recommendations with pagination
   */
  async getHighPriorityRecommendations(
    organizationId: number,
    operatingUnitId?: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRecommendationsResponse> {
    return this.getRecommendations(organizationId, {
      page,
      pageSize,
      priority: 'high',
      operatingUnitId,
      sortBy: 'confidence',
      sortOrder: 'desc',
    });
  }

  /**
   * Get high-confidence recommendations with pagination
   */
  async getHighConfidenceRecommendations(
    organizationId: number,
    minConfidence: number = 80,
    operatingUnitId?: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRecommendationsResponse> {
    return this.getRecommendations(organizationId, {
      page,
      pageSize,
      minConfidence,
      operatingUnitId,
      sortBy: 'confidence',
      sortOrder: 'desc',
    });
  }

  /**
   * Get high-savings recommendations with pagination
   */
  async getHighSavingsRecommendations(
    organizationId: number,
    minSavings: number,
    operatingUnitId?: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRecommendationsResponse> {
    return this.getRecommendations(organizationId, {
      page,
      pageSize,
      operatingUnitId,
      sortBy: 'savings',
      sortOrder: 'desc',
    });
  }

  /**
   * Get recommendations by category with pagination
   */
  async getRecommendationsByCategory(
    organizationId: number,
    category: string,
    operatingUnitId?: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRecommendationsResponse> {
    return this.getRecommendations(organizationId, {
      page,
      pageSize,
      category,
      operatingUnitId,
    });
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let aiRecommendationsRepositoryInstance: AIRecommendationsRepository | null = null;

export async function getAIRecommendationsRepository(db: DB): Promise<AIRecommendationsRepository> {
  if (!aiRecommendationsRepositoryInstance) {
    aiRecommendationsRepositoryInstance = new AIRecommendationsRepository(db);
  }
  return aiRecommendationsRepositoryInstance;
}
