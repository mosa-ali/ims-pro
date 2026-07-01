/**
 * server/engines/finance/AIExecutiveEngine.ts
 *
 * AI Executive Intelligence Engine
 * Provides AI-powered insights for executive decision-making.
 *
 * Responsibilities:
 * - Budget overrun detection and alerts
 * - Underutilized grant identification
 * - Cash shortage predictions
 * - Fraud/anomaly detection
 * - AI-generated recommendations
 * - Executive summary generation
 */

import { and, eq, gte, lte, sql, desc } from 'drizzle-orm';
import type { DB } from '../../db/_scope';
import {
  projects,
  budgets,
  expenditures,
  journalEntries,
  journalLines,
  glAccounts,
} from '../../../drizzle/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BudgetOverrunAlert {
  projectId: number;
  projectCode: string;
  projectTitle: string;
  budgetAmount: number;
  spentAmount: number;
  overrunAmount: number;
  overrunPercentage: number;
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
}

export interface UnderutilizedGrant {
  grantId: number;
  grantName: string;
  allocatedAmount: number;
  utilizedAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  daysRemaining: number;
  burnRatePerDay: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface CashShortageAlert {
  projectedDate: Date;
  projectedBalance: number;
  minimumRequired: number;
  shortfallAmount: number;
  daysUntilShortage: number;
  recommendation: string;
}

export interface AnomalyDetection {
  type: 'transaction' | 'pattern' | 'threshold';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  amount?: number;
  expectedRange?: { min: number; max: number };
  actualValue?: number;
  confidence: number; // 0-100
  recommendation: string;
}

export interface ExecutiveInsight {
  title: string;
  description: string;
  metric: string;
  trend: 'up' | 'down' | 'stable';
  impact: 'positive' | 'negative' | 'neutral';
  actionRequired: boolean;
  recommendation: string;
}

export interface ExecutiveSummary {
  period: string;
  organizationId: number;
  overallHealthScore: number;
  keyInsights: ExecutiveInsight[];
  budgetOverruns: BudgetOverrunAlert[];
  underutilizedGrants: UnderutilizedGrant[];
  cashShortageAlerts: CashShortageAlert[];
  anomalies: AnomalyDetection[];
  recommendations: string[];
  generatedAt: Date;
}

// ── AI Executive Engine ──────────────────────────────────────────────────────

export class AIExecutiveEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Detect budget overruns across projects.
   */
  async detectBudgetOverruns(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<BudgetOverrunAlert[]> {
    const projectsData = await this.db
      .select({
        id: projects.id,
        projectCode: projects.projectCode,
        title: projects.title,
        totalBudget: projects.totalBudget,
        spent: projects.spent,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : undefined
        )
      );

    const overruns: BudgetOverrunAlert[] = [];

    for (const project of projectsData) {
      const budget = parseFloat(String(project.totalBudget || 0));
      const spent = parseFloat(String(project.spent || 0));
      const overrun = spent - budget;
      const overrunPercentage = budget > 0 ? (overrun / budget) * 100 : 0;

      if (overrun > 0) {
        let severity: 'critical' | 'high' | 'medium' = 'medium';
        if (overrunPercentage > 20) severity = 'critical';
        else if (overrunPercentage > 10) severity = 'high';

        overruns.push({
          projectId: project.id,
          projectCode: project.projectCode || 'N/A',
          projectTitle: project.title || 'Untitled',
          budgetAmount: budget,
          spentAmount: spent,
          overrunAmount: overrun,
          overrunPercentage,
          severity,
          recommendation: `Review ${project.projectCode} expenditures. Consider budget revision or spending controls.`,
        });
      }
    }

    return overruns.sort((a, b) => b.overrunPercentage - a.overrunPercentage);
  }

  /**
   * Identify underutilized grants.
   */
  async identifyUnderutilizedGrants(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<UnderutilizedGrant[]> {
    // This would query grants and their utilization
    // Implementation depends on grants table structure
    return [];
  }

  /**
   * Predict cash shortages.
   */
  async predictCashShortages(
    organizationId: number,
    operatingUnitId?: number | null,
    projectionMonths: number = 3
  ): Promise<CashShortageAlert[]> {
    // This would analyze cash flow trends and predict shortages
    // Implementation depends on cash flow data availability
    return [];
  }

  /**
   * Detect anomalies in financial data.
   */
  async detectAnomalies(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    // Get recent transactions
    const recentTransactions = await this.db
      .select({
        amount: journalLines.debitAmount,
        description: journalEntries.description,
        date: journalEntries.entryDate,
      })
      .from(journalLines)
      .leftJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          operatingUnitId ? eq(journalEntries.operatingUnitId, operatingUnitId) : undefined
        )
      )
      .orderBy(desc(journalEntries.entryDate))
      .limit(100);

    // Simple anomaly detection: flag transactions > 2x average
    if (recentTransactions.length > 0) {
      const amounts = recentTransactions
        .map(t => parseFloat(String(t.amount || 0)))
        .filter(a => a > 0);
      
      if (amounts.length > 0) {
        const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const threshold = average * 2;

        for (const transaction of recentTransactions) {
          const amount = parseFloat(String(transaction.amount || 0));
          if (amount > threshold) {
            anomalies.push({
              type: 'threshold',
              severity: amount > threshold * 2 ? 'critical' : 'high',
              description: `Unusually large transaction: ${transaction.description}`,
              amount,
              expectedRange: { min: 0, max: threshold },
              actualValue: amount,
              confidence: 85,
              recommendation: 'Review transaction for accuracy and authorization.',
            });
          }
        }
      }
    }

    return anomalies;
  }

  /**
   * Generate key insights.
   */
  async generateInsights(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ExecutiveInsight[]> {
    const insights: ExecutiveInsight[] = [];

    // Get budget utilization
    const projectsData = await this.db
      .select({
        totalBudget: sql<number>`SUM(${projects.totalBudget})`,
        totalSpent: sql<number>`SUM(${projects.spent})`,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organizationId),
          operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : undefined
        )
      );

    if (projectsData.length > 0 && projectsData[0].totalBudget) {
      const budget = parseFloat(String(projectsData[0].totalBudget));
      const spent = parseFloat(String(projectsData[0].totalSpent || 0));
      const utilization = (spent / budget) * 100;

      insights.push({
        title: 'Budget Utilization',
        description: `${utilization.toFixed(1)}% of total budget has been utilized`,
        metric: `${utilization.toFixed(1)}%`,
        trend: utilization > 75 ? 'up' : 'stable',
        impact: utilization > 90 ? 'negative' : 'positive',
        actionRequired: utilization > 90,
        recommendation: utilization > 90 
          ? 'Monitor spending closely to avoid budget overruns'
          : 'Budget utilization is on track',
      });
    }

    return insights;
  }

  /**
   * Generate comprehensive executive summary.
   */
  async generateExecutiveSummary(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<ExecutiveSummary> {
    const [overruns, anomalies, insights] = await Promise.all([
      this.detectBudgetOverruns(organizationId, operatingUnitId),
      this.detectAnomalies(organizationId, operatingUnitId),
      this.generateInsights(organizationId, operatingUnitId),
    ]);

    // Calculate overall health score (0-100)
    let healthScore = 100;
    if (overruns.length > 0) healthScore -= overruns.length * 5;
    if (anomalies.length > 0) healthScore -= anomalies.length * 3;
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Compile recommendations
    const recommendations: string[] = [];
    overruns.forEach(o => recommendations.push(o.recommendation));
    anomalies.forEach(a => recommendations.push(a.recommendation));
    insights.forEach(i => {
      if (i.actionRequired) recommendations.push(i.recommendation);
    });

    return {
      period: new Date().toISOString().split('T')[0],
      organizationId,
      overallHealthScore: healthScore,
      keyInsights: insights,
      budgetOverruns: overruns,
      underutilizedGrants: [],
      cashShortageAlerts: [],
      anomalies,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      generatedAt: new Date(),
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let aiEngineInstance: AIExecutiveEngine | null = null;

export async function getAIExecutiveEngine(db: DB): Promise<AIExecutiveEngine> {
  if (!aiEngineInstance) {
    aiEngineInstance = new AIExecutiveEngine(db);
  }
  return aiEngineInstance;
}
