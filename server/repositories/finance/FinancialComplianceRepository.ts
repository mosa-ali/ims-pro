/**
 * server/repositories/finance/FinancialComplianceRepository.ts
 *
 * Financial Compliance Repository
 * Handles all database queries for compliance findings.
 * All data comes from the finance_compliance_findings table with proper joins.
 */

import { and, eq, gte, lte, like, or, desc, sql } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  financeComplianceFindings,
  projects,
  users,
  operatingUnits,
} from '../../../drizzle/schema';

export interface ComplianceFilters {
  organizationId: number;
  operatingUnitId?: number;
  projectId?: number;
  findingType?: string;
  severity?: string;
  status?: string;
  assignedTo?: number;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ComplianceFindingWithRelations {
  id: number;
  organizationId: number;
  operatingUnitId?: number;
  projectId?: number;
  findingType?: string;
  severity?: string;
  title?: string;
  description?: string;
  referenceTable?: string;
  referenceId?: number;
  recommendation?: string;
  aiRecommendation?: string;
  status?: string;
  assignedTo?: number;
  targetDate?: string;
  resolvedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  // Relations
  project?: { id: number; title: string };
  assignedUser?: { id: number; name: string };
  operatingUnit?: { id: number; name: string };
}

export class FinancialComplianceRepository {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get all compliance findings with optional filters and pagination.
   */
  async getFindings(filters: ComplianceFilters): Promise<ComplianceFindingWithRelations[]> {
    const {
      organizationId,
      operatingUnitId,
      projectId,
      findingType,
      severity,
      status,
      assignedTo,
      startDate,
      endDate,
      search,
      limit = 50,
      offset = 0,
    } = filters;

    const whereConditions = [eq(financeComplianceFindings.organizationId, organizationId)];

    if (operatingUnitId) {
      whereConditions.push(eq(financeComplianceFindings.operatingUnitId, operatingUnitId));
    }
    if (projectId) {
      whereConditions.push(eq(financeComplianceFindings.projectId, projectId));
    }
    if (findingType) {
      whereConditions.push(eq(financeComplianceFindings.findingType, findingType));
    }
    if (severity) {
      whereConditions.push(eq(financeComplianceFindings.severity, severity));
    }
    if (status) {
      whereConditions.push(eq(financeComplianceFindings.status, status));
    }
    if (assignedTo) {
      whereConditions.push(eq(financeComplianceFindings.assignedTo, assignedTo));
    }
    if (startDate) {
      whereConditions.push(gte(financeComplianceFindings.createdAt, startDate.toISOString()));
    }
    if (endDate) {
      whereConditions.push(lte(financeComplianceFindings.createdAt, endDate.toISOString()));
    }
    if (search) {
      whereConditions.push(
        or(
          like(financeComplianceFindings.title, `%${search}%`),
          like(financeComplianceFindings.description, `%${search}%`)
        )
      );
    }

    const rows = await this.db
      .select({
        id: financeComplianceFindings.id,
        organizationId: financeComplianceFindings.organizationId,
        operatingUnitId: financeComplianceFindings.operatingUnitId,
        projectId: financeComplianceFindings.projectId,
        findingType: financeComplianceFindings.findingType,
        severity: financeComplianceFindings.severity,
        title: financeComplianceFindings.title,
        description: financeComplianceFindings.description,
        referenceTable: financeComplianceFindings.referenceTable,
        referenceId: financeComplianceFindings.referenceId,
        recommendation: financeComplianceFindings.recommendation,
        aiRecommendation: financeComplianceFindings.aiRecommendation,
        status: financeComplianceFindings.status,
        assignedTo: financeComplianceFindings.assignedTo,
        targetDate: financeComplianceFindings.targetDate,
        resolvedDate: financeComplianceFindings.resolvedDate,
        createdAt: financeComplianceFindings.createdAt,
        updatedAt: financeComplianceFindings.updatedAt,
        projectTitle: projects.title,
        assignedUserName: users.name,
        ouName: operatingUnits.name,
      })
      .from(financeComplianceFindings)
      .leftJoin(projects, eq(financeComplianceFindings.projectId, projects.id))
      .leftJoin(users, eq(financeComplianceFindings.assignedTo, users.id))
      .leftJoin(operatingUnits, eq(financeComplianceFindings.operatingUnitId, operatingUnits.id))
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(financeComplianceFindings.createdAt));

    return rows.map(row => ({
      ...row,
      project: row.projectTitle ? { id: row.projectId!, title: row.projectTitle } : undefined,
      assignedUser: row.assignedUserName ? { id: row.assignedTo!, name: row.assignedUserName } : undefined,
      operatingUnit: row.ouName ? { id: row.operatingUnitId!, name: row.ouName } : undefined,
    })) as ComplianceFindingWithRelations[];
  }

  /**
   * Get a single finding by ID with all relations.
   */
  async getFindingById(findingId: number, organizationId: number): Promise<ComplianceFindingWithRelations | null> {
    const rows = await this.getFindings({
      organizationId,
      limit: 1,
      offset: 0,
    });

    const finding = rows.find(f => f.id === findingId);
    return finding || null;
  }

  /**
   * Get compliance statistics for dashboard.
   */
  async getComplianceStats(organizationId: number, operatingUnitId?: number) {
    const whereConditions = [eq(financeComplianceFindings.organizationId, organizationId)];
    if (operatingUnitId) {
      whereConditions.push(eq(financeComplianceFindings.operatingUnitId, operatingUnitId));
    }

    const stats = await this.db
      .select({
        totalFindings: sql<number>`COUNT(*)`,
        openFindings: sql<number>`SUM(CASE WHEN ${financeComplianceFindings.status} IN ('new', 'reviewing') THEN 1 ELSE 0 END)`,
        criticalFindings: sql<number>`SUM(CASE WHEN ${financeComplianceFindings.severity} = 'critical' THEN 1 ELSE 0 END)`,
        highFindings: sql<number>`SUM(CASE WHEN ${financeComplianceFindings.severity} = 'high' THEN 1 ELSE 0 END)`,
        mediumFindings: sql<number>`SUM(CASE WHEN ${financeComplianceFindings.severity} = 'medium' THEN 1 ELSE 0 END)`,
        lowFindings: sql<number>`SUM(CASE WHEN ${financeComplianceFindings.severity} = 'low' THEN 1 ELSE 0 END)`,
        resolvedFindings: sql<number>`SUM(CASE WHEN ${financeComplianceFindings.status} IN ('resolved', 'closed') THEN 1 ELSE 0 END)`,
        overdueFindings: sql<number>`SUM(CASE WHEN ${financeComplianceFindings.targetDate} < NOW() AND ${financeComplianceFindings.status} NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END)`,
      })
      .from(financeComplianceFindings)
      .where(and(...whereConditions));

    return stats[0] || {};
  }

  /**
   * Get findings grouped by type.
   */
  async getFindingsByType(organizationId: number, operatingUnitId?: number) {
    const whereConditions = [eq(financeComplianceFindings.organizationId, organizationId)];
    if (operatingUnitId) {
      whereConditions.push(eq(financeComplianceFindings.operatingUnitId, operatingUnitId));
    }

    return this.db
      .select({
        findingType: financeComplianceFindings.findingType,
        count: sql<number>`COUNT(*)`,
      })
      .from(financeComplianceFindings)
      .where(and(...whereConditions))
      .groupBy(financeComplianceFindings.findingType)
      .orderBy(desc(sql<number>`COUNT(*)`));
  }

  /**
   * Get findings grouped by severity.
   */
  async getFindingsBySeverity(organizationId: number, operatingUnitId?: number) {
    const whereConditions = [eq(financeComplianceFindings.organizationId, organizationId)];
    if (operatingUnitId) {
      whereConditions.push(eq(financeComplianceFindings.operatingUnitId, operatingUnitId));
    }

    return this.db
      .select({
        severity: financeComplianceFindings.severity,
        count: sql<number>`COUNT(*)`,
      })
      .from(financeComplianceFindings)
      .where(and(...whereConditions))
      .groupBy(financeComplianceFindings.severity)
      .orderBy(desc(sql<number>`COUNT(*)`));
  }

  /**
   * Get top critical findings.
   */
  async getTopCriticalFindings(organizationId: number, operatingUnitId?: number, limit = 5) {
    return this.getFindings({
      organizationId,
      operatingUnitId,
      severity: 'critical',
      limit,
      offset: 0,
    });
  }

  /**
   * Calculate average resolution time in days.
   */
  async getAverageResolutionTime(organizationId: number, operatingUnitId?: number): Promise<number> {
    const whereConditions = [
      eq(financeComplianceFindings.organizationId, organizationId),
      eq(financeComplianceFindings.status, 'closed'),
    ];
    if (operatingUnitId) {
      whereConditions.push(eq(financeComplianceFindings.operatingUnitId, operatingUnitId));
    }

    const result = await this.db
      .select({
        avgDays: sql<number>`AVG(DATEDIFF(${financeComplianceFindings.resolvedDate}, ${financeComplianceFindings.createdAt}))`,
      })
      .from(financeComplianceFindings)
      .where(and(...whereConditions));

    return result[0]?.avgDays || 0;
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────
let complianceRepositoryInstance: FinancialComplianceRepository | null = null;

export async function getFinancialComplianceRepository(db: DB): Promise<FinancialComplianceRepository> {
  if (!complianceRepositoryInstance) {
    complianceRepositoryInstance = new FinancialComplianceRepository(db);
  }
  return complianceRepositoryInstance;
}
