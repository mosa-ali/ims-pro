/**
 * server/repositories/finance/FinancialRiskRepository.ts
 *
 * Financial Risk Repository
 * Handles all database queries for financial risks.
 * All data comes from the finance_financial_risks table with proper joins.
 */

import { and, eq, gte, lte, inArray, like, or, desc, asc, sql } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  financeFinancialRisks,
  projects,
  donors,
  grants,
  budgets,
  users,
  operatingUnits,
  organizations,
} from '../../../drizzle/schema';

export interface RiskFilters {
  organizationId: number;
  operatingUnitId?: number;
  projectId?: number;
  donorId?: number;
  category?: string;
  status?: string;
  likelihood?: string;
  impact?: string;
  ownerId?: number;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RiskWithRelations {
  id: number;
  organizationId: number;
  operatingUnitId?: number;
  projectId?: number;
  donorId?: number;
  grantId?: number;
  budgetLineId?: number;
  title: string;
  description?: string;
  category?: string;
  likelihood?: string;
  impact?: string;
  overallRiskScore?: number;
  financialExposure?: number;
  currency?: string;
  status?: string;
  ownerId?: number;
  mitigationPlan?: string;
  aiRecommendation?: string;
  dueDate?: string;
  detectedAt?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relations
  project?: { id: number; title: string };
  donor?: { id: number; name: string };
  grant?: { id: number; title: string };
  owner?: { id: number; name: string };
  operatingUnit?: { id: number; name: string };
}

export class FinancialRiskRepository {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get all financial risks with optional filters and pagination.
   */
  async getRisks(filters: RiskFilters): Promise<RiskWithRelations[]> {
    const {
      organizationId,
      operatingUnitId,
      projectId,
      donorId,
      category,
      status,
      likelihood,
      impact,
      ownerId,
      startDate,
      endDate,
      search,
      limit = 50,
      offset = 0,
    } = filters;

    const whereConditions = [eq(financeFinancialRisks.organizationId, organizationId)];

    if (operatingUnitId) {
      whereConditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }
    if (projectId) {
      whereConditions.push(eq(financeFinancialRisks.projectId, projectId));
    }
    if (donorId) {
      whereConditions.push(eq(financeFinancialRisks.donorId, donorId));
    }
    if (category) {
      whereConditions.push(eq(financeFinancialRisks.category, category));
    }
    if (status) {
      whereConditions.push(eq(financeFinancialRisks.status, status));
    }
    if (likelihood) {
      whereConditions.push(eq(financeFinancialRisks.likelihood, likelihood));
    }
    if (impact) {
      whereConditions.push(eq(financeFinancialRisks.impact, impact));
    }
    if (ownerId) {
      whereConditions.push(eq(financeFinancialRisks.ownerId, ownerId));
    }
    if (startDate) {
      whereConditions.push(gte(financeFinancialRisks.detectedAt, startDate.toISOString()));
    }
    if (endDate) {
      whereConditions.push(lte(financeFinancialRisks.detectedAt, endDate.toISOString()));
    }
    if (search) {
      whereConditions.push(
        or(
          like(financeFinancialRisks.title, `%${search}%`),
          like(financeFinancialRisks.description, `%${search}%`)
        )
      );
    }

    const rows = await this.db
      .select({
        id: financeFinancialRisks.id,
        organizationId: financeFinancialRisks.organizationId,
        operatingUnitId: financeFinancialRisks.operatingUnitId,
        projectId: financeFinancialRisks.projectId,
        donorId: financeFinancialRisks.donorId,
        grantId: financeFinancialRisks.grantId,
        budgetLineId: financeFinancialRisks.budgetLineId,
        title: financeFinancialRisks.title,
        description: financeFinancialRisks.description,
        category: financeFinancialRisks.category,
        likelihood: financeFinancialRisks.likelihood,
        impact: financeFinancialRisks.impact,
        overallRiskScore: financeFinancialRisks.overallRiskScore,
        financialExposure: financeFinancialRisks.financialExposure,
        currency: financeFinancialRisks.currency,
        status: financeFinancialRisks.status,
        ownerId: financeFinancialRisks.ownerId,
        mitigationPlan: financeFinancialRisks.mitigationPlan,
        aiRecommendation: financeFinancialRisks.aiRecommendation,
        dueDate: financeFinancialRisks.dueDate,
        detectedAt: financeFinancialRisks.detectedAt,
        resolvedAt: financeFinancialRisks.resolvedAt,
        createdAt: financeFinancialRisks.createdAt,
        updatedAt: financeFinancialRisks.updatedAt,
        projectTitle: projects.title,
        donorName: donors.name,
        grantTitle: grants.title,
        ownerName: users.name,
        ouName: operatingUnits.name,
      })
      .from(financeFinancialRisks)
      .leftJoin(projects, eq(financeFinancialRisks.projectId, projects.id))
      .leftJoin(donors, eq(financeFinancialRisks.donorId, donors.id))
      .leftJoin(grants, eq(financeFinancialRisks.grantId, grants.id))
      .leftJoin(users, eq(financeFinancialRisks.ownerId, users.id))
      .leftJoin(operatingUnits, eq(financeFinancialRisks.operatingUnitId, operatingUnits.id))
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(financeFinancialRisks.createdAt));

    return rows.map(row => ({
      ...row,
      project: row.projectTitle ? { id: row.projectId!, title: row.projectTitle } : undefined,
      donor: row.donorName ? { id: row.donorId!, name: row.donorName } : undefined,
      grant: row.grantTitle ? { id: row.grantId!, title: row.grantTitle } : undefined,
      owner: row.ownerName ? { id: row.ownerId!, name: row.ownerName } : undefined,
      operatingUnit: row.ouName ? { id: row.operatingUnitId!, name: row.ouName } : undefined,
    })) as RiskWithRelations[];
  }

  /**
   * Get a single risk by ID with all relations.
   */
  async getRiskById(riskId: number, organizationId: number): Promise<RiskWithRelations | null> {
    const rows = await this.getRisks({
      organizationId,
      limit: 1,
      offset: 0,
    });

    const risk = rows.find(r => r.id === riskId);
    return risk || null;
  }

  /**
   * Get risk statistics for dashboard.
   */
  async getRiskStats(organizationId: number, operatingUnitId?: number) {
    const whereConditions = [eq(financeFinancialRisks.organizationId, organizationId)];
    if (operatingUnitId) {
      whereConditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    const stats = await this.db
      .select({
        totalRisks: sql<number>`COUNT(*)`,
        criticalRisks: sql<number>`SUM(CASE WHEN ${financeFinancialRisks.likelihood} = 'critical' OR ${financeFinancialRisks.impact} = 'critical' THEN 1 ELSE 0 END)`,
        highRisks: sql<number>`SUM(CASE WHEN ${financeFinancialRisks.likelihood} = 'high' OR ${financeFinancialRisks.impact} = 'high' THEN 1 ELSE 0 END)`,
        mediumRisks: sql<number>`SUM(CASE WHEN ${financeFinancialRisks.likelihood} = 'medium' OR ${financeFinancialRisks.impact} = 'medium' THEN 1 ELSE 0 END)`,
        lowRisks: sql<number>`SUM(CASE WHEN ${financeFinancialRisks.likelihood} = 'low' AND ${financeFinancialRisks.impact} = 'low' THEN 1 ELSE 0 END)`,
        openRisks: sql<number>`SUM(CASE WHEN ${financeFinancialRisks.status} = 'open' THEN 1 ELSE 0 END)`,
        underReviewRisks: sql<number>`SUM(CASE WHEN ${financeFinancialRisks.status} = 'under_review' THEN 1 ELSE 0 END)`,
        resolvedRisks: sql<number>`SUM(CASE WHEN ${financeFinancialRisks.status} = 'resolved' THEN 1 ELSE 0 END)`,
        totalExposure: sql<number>`COALESCE(SUM(CAST(${financeFinancialRisks.financialExposure} AS DECIMAL(15,2))), 0)`,
      })
      .from(financeFinancialRisks)
      .where(and(...whereConditions));

    return stats[0] || {};
  }

  /**
   * Get risks grouped by category.
   */
  async getRisksByCategory(organizationId: number, operatingUnitId?: number) {
    const whereConditions = [eq(financeFinancialRisks.organizationId, organizationId)];
    if (operatingUnitId) {
      whereConditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    return this.db
      .select({
        category: financeFinancialRisks.category,
        count: sql<number>`COUNT(*)`,
        totalExposure: sql<number>`COALESCE(SUM(CAST(${financeFinancialRisks.financialExposure} AS DECIMAL(15,2))), 0)`,
      })
      .from(financeFinancialRisks)
      .where(and(...whereConditions))
      .groupBy(financeFinancialRisks.category)
      .orderBy(desc(sql<number>`COUNT(*)`));
  }

  /**
   * Get top critical risks.
   */
  async getTopCriticalRisks(organizationId: number, operatingUnitId?: number, limit = 5) {
    const whereConditions = [
      eq(financeFinancialRisks.organizationId, organizationId),
      or(
        eq(financeFinancialRisks.likelihood, 'critical'),
        eq(financeFinancialRisks.impact, 'critical')
      ),
    ];
    if (operatingUnitId) {
      whereConditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    return this.getRisks({
      organizationId,
      operatingUnitId,
      limit,
      offset: 0,
    });
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────
let riskRepositoryInstance: FinancialRiskRepository | null = null;

export async function getFinancialRiskRepository(db: DB): Promise<FinancialRiskRepository> {
  if (!riskRepositoryInstance) {
    riskRepositoryInstance = new FinancialRiskRepository(db);
  }
  return riskRepositoryInstance;
}
