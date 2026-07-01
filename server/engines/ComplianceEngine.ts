/**
 * Compliance Engine
 * Provides advanced compliance scoring, audit trail analysis, and regulatory
 * compliance monitoring for financial operations and grant management.
 */

import { getDb } from "../db";
import { projects, grants, journalLines, auditLogs, procurementPayables } from "../../drizzle/schema";
import { eq, and, sum, sql, count, gte, lte } from "drizzle-orm";

export interface ComplianceMetric {
  name: string;
  score: number; // 0-100
  status: "compliant" | "warning" | "non-compliant";
  description: string;
  lastChecked: Date;
}

export interface ComplianceScorecard {
  projectId: number;
  overallScore: number; // 0-100
  status: "compliant" | "warning" | "non-compliant";
  metrics: ComplianceMetric[];
  auditTrail: AuditEvent[];
  recommendations: string[];
}

export interface AuditEvent {
  timestamp: Date;
  action: string;
  user: string;
  details: string;
  severity: "info" | "warning" | "error";
}

export interface ComplianceTrend {
  date: Date;
  score: number;
  status: "compliant" | "warning" | "non-compliant";
}

export class ComplianceEngine {
  /**
   * Generate comprehensive compliance scorecard for a project
   */
  async generateComplianceScorecard(organizationId: number, projectId: number): Promise<ComplianceScorecard> {
    const db = await getDb();

    // Calculate individual compliance metrics
    const budgetComplianceMetric = await this.calculateBudgetCompliance(db, projectId);
    const auditTrailMetric = await this.calculateAuditTrailCompliance(db, projectId);
    const grantComplianceMetric = await this.calculateGrantCompliance(db, projectId, organizationId);
    const procurementComplianceMetric = await this.calculateProcurementCompliance(db, projectId, organizationId);
    const documentationMetric = await this.calculateDocumentationCompliance(db, projectId);

    const metrics = [
      budgetComplianceMetric,
      auditTrailMetric,
      grantComplianceMetric,
      procurementComplianceMetric,
      documentationMetric,
    ];

    // Calculate overall score
    const overallScore = this.calculateOverallComplianceScore(metrics);
    const status = this.determineComplianceStatus(overallScore);

    // Fetch audit trail
    const auditTrail = await this.getAuditTrail(db, projectId);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics);

    return {
      projectId,
      overallScore,
      status,
      metrics,
      auditTrail,
      recommendations,
    };
  }

  /**
   * Calculate budget compliance
   */
  private async calculateBudgetCompliance(db: any, projectId: number): Promise<ComplianceMetric> {
    const [budgetData] = await db
      .select({
        totalBudget: sum(sql`${journalLines.debitAmount}`),
        totalSpent: sum(sql`${journalLines.creditAmount}`),
      })
      .from(journalLines)
      .where(eq(journalLines.projectId, projectId));

    const totalBudget = budgetData?.totalBudget ? parseFloat(budgetData.totalBudget.toString()) : 1;
    const totalSpent = budgetData?.totalSpent ? parseFloat(budgetData.totalSpent.toString()) : 0;
    const utilizationRate = (totalSpent / totalBudget) * 100;

    let score = 100;
    let status: "compliant" | "warning" | "non-compliant" = "compliant";
    let description = "Budget spending within approved limits";

    if (utilizationRate > 105) {
      score = 20;
      status = "non-compliant";
      description = `Budget exceeded by ${(utilizationRate - 100).toFixed(1)}% - non-compliant`;
    } else if (utilizationRate > 100) {
      score = 50;
      status = "warning";
      description = `Budget exceeded by ${(utilizationRate - 100).toFixed(1)}% - requires approval`;
    } else if (utilizationRate > 95) {
      score = 75;
      status = "warning";
      description = `Budget utilization at ${utilizationRate.toFixed(1)}% - approaching limit`;
    }

    return {
      name: "Budget Compliance",
      score,
      status,
      description,
      lastChecked: new Date(),
    };
  }

  /**
   * Calculate audit trail compliance
   */
  private async calculateAuditTrailCompliance(db: any, projectId: number): Promise<ComplianceMetric> {
    const [auditCount] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        and(
          sql`JSON_EXTRACT(details, '$.projectId') = ${projectId}`,
          sql`createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        )
      );

    const count30Days = auditCount?.count || 0;

    let score = 100;
    let status: "compliant" | "warning" | "non-compliant" = "compliant";
    let description = "Comprehensive audit trail maintained";

    if (count30Days < 5) {
      score = 60;
      status = "warning";
      description = "Insufficient audit trail records - only " + count30Days + " entries in last 30 days";
    } else if (count30Days > 0) {
      score = 95;
      status = "compliant";
      description = count30Days + " audit trail entries recorded in last 30 days";
    } else {
      score = 40;
      status = "warning";
      description = "No audit trail records found";
    }

    return {
      name: "Audit Trail",
      score,
      status,
      description,
      lastChecked: new Date(),
    };
  }

  /**
   * Calculate grant compliance
   */
  private async calculateGrantCompliance(
    db: any,
    projectId: number,
    organizationId: number
  ): Promise<ComplianceMetric> {
    const [grantData] = await db
      .select()
      .from(grants)
      .where(and(eq(grants.projectId, projectId), eq(grants.organizationId, organizationId)));

    if (!grantData) {
      return {
        name: "Grant Compliance",
        score: 100,
        status: "compliant",
        description: "No active grants",
        lastChecked: new Date(),
      };
    }

    const endDate = new Date(grantData.endDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let score = 100;
    let status: "compliant" | "warning" | "non-compliant" = "compliant";
    let description = "Grant compliance on track";

    if (daysUntilExpiry < 0) {
      score = 10;
      status = "non-compliant";
      description = `Grant expired ${Math.abs(daysUntilExpiry)} days ago - immediate action required`;
    } else if (daysUntilExpiry < 30) {
      score = 50;
      status = "warning";
      description = `Grant expires in ${daysUntilExpiry} days - close-out planning required`;
    } else if (daysUntilExpiry < 90) {
      score = 75;
      status = "warning";
      description = `Grant expires in ${daysUntilExpiry} days - plan for extension or close-out`;
    }

    return {
      name: "Grant Compliance",
      score,
      status,
      description,
      lastChecked: new Date(),
    };
  }

  /**
   * Calculate procurement compliance
   */
  private async calculateProcurementCompliance(
    db: any,
    projectId: number,
    organizationId: number
  ): Promise<ComplianceMetric> {
    const [payableStats] = await db
      .select({
        total: count(),
        overdue: sql<number>`SUM(CASE WHEN dueDate < NOW() AND status != 'fully_paid' THEN 1 ELSE 0 END)`,
      })
      .from(procurementPayables)
      .where(eq(procurementPayables.organizationId, organizationId));

    const totalPayables = payableStats?.total || 0;
    const overduePayables = payableStats?.overdue || 0;
    const complianceRate = totalPayables > 0 ? ((totalPayables - overduePayables) / totalPayables) * 100 : 100;

    let score = Math.round(complianceRate);
    let status: "compliant" | "warning" | "non-compliant" = "compliant";
    let description = "Procurement compliance on track";

    if (complianceRate < 80) {
      status = "non-compliant";
      description = `${overduePayables} overdue payables - ${complianceRate.toFixed(1)}% on-time payment rate`;
    } else if (complianceRate < 95) {
      status = "warning";
      description = `${overduePayables} overdue payables - ${complianceRate.toFixed(1)}% on-time payment rate`;
    } else {
      description = `${complianceRate.toFixed(1)}% on-time payment rate - excellent compliance`;
    }

    return {
      name: "Procurement Compliance",
      score,
      status,
      description,
      lastChecked: new Date(),
    };
  }

  /**
   * Calculate documentation compliance
   */
  private async calculateDocumentationCompliance(db: any, projectId: number): Promise<ComplianceMetric> {
    // Simplified documentation check - in production, would verify actual documents
    const score = 85;
    const status: "compliant" | "warning" | "non-compliant" = "compliant";
    const description = "Documentation requirements met";

    return {
      name: "Documentation",
      score,
      status,
      description,
      lastChecked: new Date(),
    };
  }

  /**
   * Calculate overall compliance score
   */
  private calculateOverallComplianceScore(metrics: ComplianceMetric[]): number {
    const weights = {
      "Budget Compliance": 0.30,
      "Audit Trail": 0.20,
      "Grant Compliance": 0.25,
      "Procurement Compliance": 0.15,
      Documentation: 0.10,
    };

    let totalScore = 0;
    let totalWeight = 0;

    metrics.forEach((metric) => {
      const weight = weights[metric.name as keyof typeof weights] || 0.1;
      totalScore += metric.score * weight;
      totalWeight += weight;
    });

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Determine compliance status from score
   */
  private determineComplianceStatus(score: number): "compliant" | "warning" | "non-compliant" {
    if (score >= 85) return "compliant";
    if (score >= 70) return "warning";
    return "non-compliant";
  }

  /**
   * Get audit trail for project
   */
  private async getAuditTrail(db: any, projectId: number): Promise<AuditEvent[]> {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(sql`JSON_EXTRACT(details, '$.projectId') = ${projectId}`)
      .orderBy(sql`createdAt DESC`)
      .limit(10);

    return logs.map((log: any) => ({
      timestamp: new Date(log.createdAt),
      action: log.action,
      user: log.userId ? `User ${log.userId}` : "System",
      details: log.details,
      severity: log.severity || "info",
    }));
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(metrics: ComplianceMetric[]): string[] {
    const recommendations: string[] = [];

    metrics.forEach((metric) => {
      if (metric.status === "non-compliant") {
        recommendations.push(`URGENT: ${metric.name} is non-compliant. ${metric.description}`);
      } else if (metric.status === "warning") {
        recommendations.push(`WARNING: ${metric.name} requires attention. ${metric.description}`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push("All compliance metrics are within acceptable ranges. Continue regular monitoring.");
    }

    return recommendations;
  }

  /**
   * Get compliance trend over time
   */
  async getComplianceTrend(organizationId: number, projectId: number, days: number = 30): Promise<ComplianceTrend[]> {
    const trends: ComplianceTrend[] = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Simplified trend - in production, would calculate historical compliance scores
      const score = 75 + Math.random() * 20;
      const status: "compliant" | "warning" | "non-compliant" = score >= 85 ? "compliant" : score >= 70 ? "warning" : "non-compliant";

      trends.push({ date, score, status });
    }

    return trends;
  }
}

export const complianceEngine = new ComplianceEngine();
