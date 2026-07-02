import type { DB } from '../../db/_scope';
import { financeFinancialRisks, type SelectFinanceFinancialRisk, type InsertFinanceFinancialRisk } from '../../../drizzle/schema';
import { eq, and, or, desc, asc, gte, lte, like } from 'drizzle-orm';

/**
 * FinancialRisksRepository
 * Data access layer for financial risks management
 * Handles CRUD operations and risk queries
 */
export class FinancialRisksRepository {
  private static instance: FinancialRisksRepository;

  private constructor() {}

  static getInstance(): FinancialRisksRepository {
    if (!FinancialRisksRepository.instance) {
      FinancialRisksRepository.instance = new FinancialRisksRepository();
    }
    return FinancialRisksRepository.instance;
  }

  /**
   * Create a new financial risk
   */
  async createRisk(
    organizationId: number,
    data: Omit<InsertFinanceFinancialRisk, 'organizationId'>
  ): Promise<SelectFinanceFinancialRisk> {
    const [result] = await db
      .insert(financeFinancialRisks)
      .values({
        ...data,
        organizationId
      } as InsertFinanceFinancialRisk)
      .execute();

    return this.getRiskById(organizationId, result.insertId as number);
  }

  /**
   * Get risk by ID
   */
  async getRiskById(
    organizationId: number,
    riskId: number
  ): Promise<SelectFinanceFinancialRisk | null> {
    const [risk] = await db
      .select()
      .from(financeFinancialRisks)
      .where(
        and(
          eq(financeFinancialRisks.id, riskId),
          eq(financeFinancialRisks.organizationId, organizationId)
        )
      )
      .execute();

    return risk || null;
  }

  /**
   * Get all risks for an organization
   */
  async getRisksByOrganization(
    organizationId: number,
    operatingUnitId?: number,
    filters?: {
      status?: string;
      category?: string;
      likelihood?: string;
      impact?: string;
      projectId?: number;
      donorId?: number;
    }
  ): Promise<SelectFinanceFinancialRisk[]> {
    let query = db
      .select()
      .from(financeFinancialRisks)
      .where(eq(financeFinancialRisks.organizationId, organizationId));

    if (operatingUnitId) {
      query = query.where(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    if (filters?.status) {
      query = query.where(eq(financeFinancialRisks.status, filters.status as any));
    }

    if (filters?.category) {
      query = query.where(eq(financeFinancialRisks.category, filters.category as any));
    }

    if (filters?.likelihood) {
      query = query.where(eq(financeFinancialRisks.likelihood, filters.likelihood as any));
    }

    if (filters?.impact) {
      query = query.where(eq(financeFinancialRisks.impact, filters.impact as any));
    }

    if (filters?.projectId) {
      query = query.where(eq(financeFinancialRisks.projectId, filters.projectId));
    }

    if (filters?.donorId) {
      query = query.where(eq(financeFinancialRisks.donorId, filters.donorId));
    }

    return query.orderBy(desc(financeFinancialRisks.createdAt)).execute();
  }

  /**
   * Get open risks for an organization
   */
  async getOpenRisks(
    organizationId: number,
    operatingUnitId?: number
  ): Promise<SelectFinanceFinancialRisk[]> {
    const conditions = [
      eq(financeFinancialRisks.organizationId, organizationId),
      or(
        eq(financeFinancialRisks.status, 'open'),
        eq(financeFinancialRisks.status, 'under_review'),
        eq(financeFinancialRisks.status, 'mitigating')
      )
    ];

    if (operatingUnitId) {
      conditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    return db
      .select()
      .from(financeFinancialRisks)
      .where(and(...conditions))
      .orderBy(desc(financeFinancialRisks.overallRiskScore))
      .execute();
  }

  /**
   * Get critical risks
   */
  async getCriticalRisks(
    organizationId: number,
    operatingUnitId?: number
  ): Promise<SelectFinanceFinancialRisk[]> {
    const conditions = [
      eq(financeFinancialRisks.organizationId, organizationId),
      or(
        eq(financeFinancialRisks.likelihood, 'critical'),
        eq(financeFinancialRisks.impact, 'critical')
      )
    ];

    if (operatingUnitId) {
      conditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    return db
      .select()
      .from(financeFinancialRisks)
      .where(and(...conditions))
      .orderBy(desc(financeFinancialRisks.overallRiskScore))
      .execute();
  }

  /**
   * Get risks by category
   */
  async getRisksByCategory(
    organizationId: number,
    category: string,
    operatingUnitId?: number
  ): Promise<SelectFinanceFinancialRisk[]> {
    const conditions = [
      eq(financeFinancialRisks.organizationId, organizationId),
      eq(financeFinancialRisks.category, category as any)
    ];

    if (operatingUnitId) {
      conditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    return db
      .select()
      .from(financeFinancialRisks)
      .where(and(...conditions))
      .orderBy(desc(financeFinancialRisks.createdAt))
      .execute();
  }

  /**
   * Get risks assigned to a user
   */
  async getRisksAssignedToUser(
    organizationId: number,
    ownerId: number,
    operatingUnitId?: number
  ): Promise<SelectFinanceFinancialRisk[]> {
    const conditions = [
      eq(financeFinancialRisks.organizationId, organizationId),
      eq(financeFinancialRisks.ownerId, ownerId)
    ];

    if (operatingUnitId) {
      conditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    return db
      .select()
      .from(financeFinancialRisks)
      .where(and(...conditions))
      .orderBy(desc(financeFinancialRisks.dueDate))
      .execute();
  }

  /**
   * Get risks with high financial exposure
   */
  async getHighExposureRisks(
    organizationId: number,
    threshold: number,
    operatingUnitId?: number
  ): Promise<SelectFinanceFinancialRisk[]> {
    const conditions = [
      eq(financeFinancialRisks.organizationId, organizationId),
      gte(financeFinancialRisks.financialExposure, threshold)
    ];

    if (operatingUnitId) {
      conditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    return db
      .select()
      .from(financeFinancialRisks)
      .where(and(...conditions))
      .orderBy(desc(financeFinancialRisks.financialExposure))
      .execute();
  }

  /**
   * Get risks with upcoming due dates
   */
  async getUpcomingRisks(
    organizationId: number,
    daysAhead: number = 30,
    operatingUnitId?: number
  ): Promise<SelectFinanceFinancialRisk[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const conditions = [
      eq(financeFinancialRisks.organizationId, organizationId),
      gte(financeFinancialRisks.dueDate, today.toISOString()),
      lte(financeFinancialRisks.dueDate, futureDate.toISOString())
    ];

    if (operatingUnitId) {
      conditions.push(eq(financeFinancialRisks.operatingUnitId, operatingUnitId));
    }

    return db
      .select()
      .from(financeFinancialRisks)
      .where(and(...conditions))
      .orderBy(asc(financeFinancialRisks.dueDate))
      .execute();
  }

  /**
   * Update a risk
   */
  async updateRisk(
    organizationId: number,
    riskId: number,
    data: Partial<Omit<InsertFinanceFinancialRisk, 'organizationId'>>
  ): Promise<SelectFinanceFinancialRisk | null> {
    await db
      .update(financeFinancialRisks)
      .set(data)
      .where(
        and(
          eq(financeFinancialRisks.id, riskId),
          eq(financeFinancialRisks.organizationId, organizationId)
        )
      )
      .execute();

    return this.getRiskById(organizationId, riskId);
  }

  /**
   * Delete a risk
   */
  async deleteRisk(
    organizationId: number,
    riskId: number
  ): Promise<boolean> {
    const result = await db
      .delete(financeFinancialRisks)
      .where(
        and(
          eq(financeFinancialRisks.id, riskId),
          eq(financeFinancialRisks.organizationId, organizationId)
        )
      )
      .execute();

    return (result.affectedRows || 0) > 0;
  }

  /**
   * Get risk statistics for organization
   */
  async getRiskStatistics(
    organizationId: number,
    operatingUnitId?: number
  ): Promise<{
    totalRisks: number;
    openRisks: number;
    criticalRisks: number;
    totalExposure: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const risks = await this.getRisksByOrganization(organizationId, operatingUnitId);

    const stats = {
      totalRisks: risks.length,
      openRisks: risks.filter(r => ['open', 'under_review', 'mitigating'].includes(r.status || '')).length,
      criticalRisks: risks.filter(r => r.likelihood === 'critical' || r.impact === 'critical').length,
      totalExposure: risks.reduce((sum, r) => sum + (Number(r.financialExposure) || 0), 0),
      byCategory: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };

    risks.forEach(risk => {
      if (risk.category) {
        stats.byCategory[risk.category] = (stats.byCategory[risk.category] || 0) + 1;
      }
      if (risk.status) {
        stats.byStatus[risk.status] = (stats.byStatus[risk.status] || 0) + 1;
      }
    });

    return stats;
  }
}

export const getFinancialRisksRepository = () => FinancialRisksRepository.getInstance();
