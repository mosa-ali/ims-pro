/**
 * server/engines/AIEngine.ts
 *
 * AI-Powered Finance Engine
 * Handles AI recommendations, anomaly detection, predictive analytics, and insights.
 *
 * Responsibilities:
 * - Anomaly detection in financial transactions
 * - Predictive analytics for budget and cash flow
 * - AI-generated recommendations for financial optimization
 * - Pattern recognition in spending
 * - Risk prediction and alerts
 * - Natural language insights generation
 */

import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  financeExpenditures,
  payments,
  budgets,
  budgetLines,
  projects,
} from '../../drizzle/schema';
import { getDb } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnomalyDetectionResult {
  transactionId: number;
  type: 'transaction' | 'budget' | 'payment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  anomalyType: string;
  description: string;
  suggestedAction: string;
  confidence: number; // 0-1
}

export interface FinancialInsight {
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  priority: 'low' | 'medium' | 'high';
  actionItems: string[];
  metrics: Record<string, any>;
}

export interface AIRecommendation {
  id: string;
  category: 'budget' | 'cash-flow' | 'spending' | 'payment' | 'risk';
  title: string;
  description: string;
  expectedBenefit: string;
  implementationSteps: string[];
  estimatedSavings?: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
}

export interface SpendingPattern {
  category: string;
  averageMonthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercent: number;
  forecast: number;
  anomalies: number;
}

export interface PredictiveAlert {
  alertType: string;
  severity: 'warning' | 'critical';
  message: string;
  predictedDate: string;
  recommendedAction: string;
  confidence: number;
}

// ── AI Engine ────────────────────────────────────────────────────────────────

export class AIEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Detect anomalies in financial transactions.
   */
  async detectAnomalies(organizationId: number, daysBack: number = 30): Promise<AnomalyDetectionResult[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get recent transactions
    const transactions = await this.db
      .select()
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.organizationId, organizationId),
          gte(financeExpenditures.expenditureDate, startDate)
        )
      );

    const anomalies: AnomalyDetectionResult[] = [];

    // Calculate statistics for anomaly detection
    const amounts = transactions.map(t => parseFloat(String(t.amount || 0)));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length
    );

    // Detect outliers (>2 standard deviations)
    for (const transaction of transactions) {
      const amount = parseFloat(String(transaction.amount || 0));
      const zScore = Math.abs((amount - mean) / stdDev);

      if (zScore > 2) {
        anomalies.push({
          transactionId: transaction.id,
          type: 'transaction',
          severity: zScore > 3 ? 'critical' : 'high',
          anomalyType: 'unusual_amount',
          description: `Transaction amount $${amount.toFixed(2)} is ${zScore.toFixed(1)}σ above average ($${mean.toFixed(2)})`,
          suggestedAction: 'Review transaction for accuracy and authorization',
          confidence: Math.min(0.95, zScore / 5),
        });
      }

      // Check for duplicate-like transactions
      const similar = transactions.filter(
        t => t.id !== transaction.id &&
          Math.abs(parseFloat(String(t.amount || 0)) - amount) < 1 &&
          t.vendorId === transaction.vendorId
      );

      if (similar.length >= 2) {
        anomalies.push({
          transactionId: transaction.id,
          type: 'transaction',
          severity: 'medium',
          anomalyType: 'duplicate_pattern',
          description: `${similar.length + 1} similar transactions detected with same vendor`,
          suggestedAction: 'Verify these are legitimate separate transactions',
          confidence: 0.75,
        });
      }
    }

    return anomalies.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate AI-powered financial insights.
   */
  async generateInsights(organizationId: number): Promise<FinancialInsight[]> {
    const insights: FinancialInsight[] = [];

    // Get spending trends
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    const [currentMonth] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.organizationId, organizationId),
          eq(financeExpenditures.status, 'paid'),
          gte(financeExpenditures.expenditureDate, lastMonth)
        )
      );

    const [previousMonth] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.organizationId, organizationId),
          eq(financeExpenditures.status, 'paid'),
          gte(financeExpenditures.expenditureDate, twoMonthsAgo),
          lte(financeExpenditures.expenditureDate, lastMonth)
        )
      );

    const currentSpend = currentMonth?.total || 0;
    const previousSpend = previousMonth?.total || 0;
    const spendChange = previousSpend > 0 ? ((currentSpend - previousSpend) / previousSpend) * 100 : 0;

    if (spendChange > 20) {
      insights.push({
        title: 'Spending Increase Detected',
        description: `Monthly spending has increased by ${spendChange.toFixed(1)}% compared to the previous month`,
        impact: 'negative',
        priority: 'high',
        actionItems: [
          'Review recent expenditures for unusual patterns',
          'Verify budget allocations are sufficient',
          'Investigate high-value transactions',
        ],
        metrics: {
          currentMonth: currentSpend,
          previousMonth: previousSpend,
          changePercent: spendChange,
        },
      });
    } else if (spendChange < -15) {
      insights.push({
        title: 'Spending Decrease Noted',
        description: `Monthly spending has decreased by ${Math.abs(spendChange).toFixed(1)}%`,
        impact: 'positive',
        priority: 'low',
        actionItems: [
          'Verify cost reduction initiatives are effective',
          'Ensure critical expenses are not being deferred',
        ],
        metrics: {
          currentMonth: currentSpend,
          previousMonth: previousSpend,
          changePercent: spendChange,
        },
      });
    }

    return insights;
  }

  /**
   * Generate AI recommendations for financial optimization.
   */
  async generateRecommendations(organizationId: number): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Analyze budget utilization
    const [budgetStats] = await this.db
      .select({
        totalBudget: sql<number>`COALESCE(SUM(${budgetLines.allocatedAmount}), 0)`,
        totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${financeExpenditures.status} = 'paid' THEN ${financeExpenditures.amount} ELSE 0 END), 0)`,
      })
      .from(budgetLines)
      .leftJoin(budgets, eq(budgetLines.budgetId, budgets.id))
      .leftJoin(financeExpenditures, eq(budgetLines.id, financeExpenditures.budgetLineId))
      .where(eq(budgets.organizationId, organizationId));

    const totalBudget = budgetStats?.totalBudget || 0;
    const totalSpent = budgetStats?.totalSpent || 0;
    const utilizationPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    if (utilizationPercent > 90) {
      recommendations.push({
        id: 'rec-budget-overallocation',
        category: 'budget',
        title: 'Budget Reallocation Recommended',
        description: `Current budget utilization is at ${utilizationPercent.toFixed(1)}%, approaching limits`,
        expectedBenefit: 'Prevent budget overruns and maintain financial control',
        implementationSteps: [
          'Review budget allocations across all cost centers',
          'Identify underutilized budget lines',
          'Reallocate funds to high-demand areas',
          'Communicate changes to stakeholders',
        ],
        estimatedSavings: undefined,
        riskLevel: 'high',
        confidence: 0.85,
      });
    }

    // Check for payment delays
    const [paymentStats] = await this.db
      .select({
        avgDaysOverdue: sql<number>`COALESCE(AVG(DATEDIFF(NOW(), ${payments.dueDate})), 0)`,
        overdueCount: sql<number>`COUNT(CASE WHEN ${payments.dueDate} < NOW() AND ${payments.status} != 'paid' THEN 1 END)`,
      })
      .from(payments)
      .where(eq(payments.organizationId, organizationId));

    if ((paymentStats?.overdueCount || 0) > 0) {
      recommendations.push({
        id: 'rec-payment-delays',
        category: 'payment',
        title: 'Address Payment Delays',
        description: `${paymentStats?.overdueCount} payments are overdue, averaging ${paymentStats?.avgDaysOverdue} days late`,
        expectedBenefit: 'Improve vendor relationships and maintain creditworthiness',
        implementationSteps: [
          'Prioritize overdue payments',
          'Contact vendors to negotiate payment terms',
          'Implement automated payment reminders',
          'Review payment approval process for bottlenecks',
        ],
        riskLevel: 'high',
        confidence: 0.9,
      });
    }

    return recommendations;
  }

  /**
   * Analyze spending patterns.
   */
  async analyzeSpendingPatterns(organizationId: number, months: number = 6): Promise<SpendingPattern[]> {
    const patterns: SpendingPattern[] = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get spending by vendor/category
    const spendingData = await this.db
      .select({
        vendorId: financeExpenditures.vendorId,
        month: sql<string>`DATE_TRUNC('month', ${financeExpenditures.expenditureDate})`,
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.organizationId, organizationId),
          eq(financeExpenditures.status, 'paid'),
          gte(financeExpenditures.expenditureDate, startDate)
        )
      )
      .groupBy(financeExpenditures.vendorId, sql`DATE_TRUNC('month', ${financeExpenditures.expenditureDate})`);

    // Aggregate by vendor
    const vendorSpending: Record<number, number[]> = {};
    for (const row of spendingData) {
      if (!vendorSpending[row.vendorId || 0]) {
        vendorSpending[row.vendorId || 0] = [];
      }
      vendorSpending[row.vendorId || 0].push(row.total || 0);
    }

    // Calculate trends
    for (const [vendorId, amounts] of Object.entries(vendorSpending)) {
      if (amounts.length < 2) continue;

      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const lastAmount = amounts[amounts.length - 1];
      const firstAmount = amounts[0];
      const trendPercent = firstAmount > 0 ? ((lastAmount - firstAmount) / firstAmount) * 100 : 0;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (trendPercent > 10) trend = 'increasing';
      else if (trendPercent < -10) trend = 'decreasing';

      patterns.push({
        category: `Vendor ${vendorId}`,
        averageMonthly: avgAmount,
        trend,
        trendPercent,
        forecast: avgAmount * (1 + trendPercent / 100),
        anomalies: 0,
      });
    }

    return patterns.sort((a, b) => b.averageMonthly - a.averageMonthly);
  }

  /**
   * Generate predictive alerts for financial risks.
   */
  async generatePredictiveAlerts(organizationId: number): Promise<PredictiveAlert[]> {
    const alerts: PredictiveAlert[] = [];

    // Check for budget overrun risk
    const [budgetRisk] = await this.db
      .select({
        budgetId: budgets.id,
        utilizationPercent: sql<number>`(COALESCE(SUM(CASE WHEN ${financeExpenditures.status} = 'paid' THEN ${financeExpenditures.amount} ELSE 0 END), 0) / COALESCE(SUM(${budgetLines.allocatedAmount}), 1)) * 100`,
      })
      .from(budgets)
      .leftJoin(budgetLines, eq(budgets.id, budgetLines.budgetId))
      .leftJoin(financeExpenditures, eq(budgetLines.id, financeExpenditures.budgetLineId))
      .where(eq(budgets.organizationId, organizationId))
      .groupBy(budgets.id);

    if (budgetRisk && budgetRisk.utilizationPercent > 85) {
      const daysUntilEndOfMonth = 30 - new Date().getDate();
      alerts.push({
        alertType: 'budget_overrun_risk',
        severity: 'critical',
        message: `Budget ${budgetRisk.budgetId} is at ${budgetRisk.utilizationPercent.toFixed(1)}% utilization`,
        predictedDate: new Date(Date.now() + daysUntilEndOfMonth * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        recommendedAction: 'Review and reallocate budget immediately',
        confidence: 0.9,
      });
    }

    return alerts;
  }

  /**
   * Get natural language summary of financial health.
   */
  async getFinancialHealthSummary(organizationId: number): Promise<string> {
    const insights = await this.generateInsights(organizationId);
    const anomalies = await this.detectAnomalies(organizationId);
    const alerts = await this.generatePredictiveAlerts(organizationId);

    let summary = 'Financial Health Summary:\n\n';

    if (insights.length > 0) {
      summary += `Key Insights (${insights.length}):\n`;
      for (const insight of insights.slice(0, 3)) {
        summary += `- ${insight.title}: ${insight.description}\n`;
      }
      summary += '\n';
    }

    if (anomalies.length > 0) {
      summary += `Detected Anomalies (${anomalies.length}):\n`;
      for (const anomaly of anomalies.slice(0, 3)) {
        summary += `- ${anomaly.anomalyType}: ${anomaly.description}\n`;
      }
      summary += '\n';
    }

    if (alerts.length > 0) {
      summary += `Active Alerts (${alerts.length}):\n`;
      for (const alert of alerts) {
        summary += `- [${alert.severity.toUpperCase()}] ${alert.message}\n`;
      }
    }

    return summary;
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let aiEngineInstance: AIEngine | null = null;

export async function getAIEngine(): Promise<AIEngine> {
  if (!aiEngineInstance) {
    const db = await getDb();
    aiEngineInstance = new AIEngine(db);
  }
  return aiEngineInstance;
}

export const aiEngine = {
  detectAnomalies: async (orgId: number, daysBack?: number) => {
    const engine = await getAIEngine();
    return engine.detectAnomalies(orgId, daysBack);
  },
  generateInsights: async (orgId: number) => {
    const engine = await getAIEngine();
    return engine.generateInsights(orgId);
  },
  generateRecommendations: async (orgId: number) => {
    const engine = await getAIEngine();
    return engine.generateRecommendations(orgId);
  },
  analyzeSpendingPatterns: async (orgId: number, months?: number) => {
    const engine = await getAIEngine();
    return engine.analyzeSpendingPatterns(orgId, months);
  },
  generatePredictiveAlerts: async (orgId: number) => {
    const engine = await getAIEngine();
    return engine.generatePredictiveAlerts(orgId);
  },
  getFinancialHealthSummary: async (orgId: number) => {
    const engine = await getAIEngine();
    return engine.getFinancialHealthSummary(orgId);
  },
};
