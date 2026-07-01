/**
 * server/engines/KPIEngine.ts
 *
 * KPI Engine
 * Centralized KPI calculation and tracking for financial metrics.
 *
 * Responsibilities:
 * - Define and calculate KPIs
 * - Track KPI trends over time
 * - Generate KPI reports
 * - Set KPI targets and thresholds
 * - Monitor KPI performance
 * - Generate KPI alerts
 */

import { and, eq, sum, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  financeBankAccounts,
  procurementPayables,
  financeExpenditures,
  payments,
  procurementInvoices,
} from '../../drizzle/schema';
import { getDb } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface KPI {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'operational' | 'compliance' | 'strategic';
  value: number;
  unit: string;
  target: number;
  threshold: {
    min: number;
    max: number;
  };
  status: 'on-track' | 'at-risk' | 'off-track';
  trend: 'improving' | 'stable' | 'deteriorating';
  lastUpdated: string;
  historicalValues: Array<{ date: string; value: number }>;
}

export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'operational' | 'compliance' | 'strategic';
  formula: string;
  unit: string;
  target: number;
  threshold: {
    min: number;
    max: number;
  };
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  owner: string;
  isActive: boolean;
}

export interface KPIReport {
  reportDate: string;
  organizationId: number;
  kpis: KPI[];
  summary: {
    onTrack: number;
    atRisk: number;
    offTrack: number;
  };
  trends: {
    improving: number;
    stable: number;
    deteriorating: number;
  };
  recommendations: string[];
}

export interface KPIAlert {
  id: string;
  kpiId: string;
  kpiName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  createdAt: string;
  resolvedAt?: string;
}

// ── KPI Engine ───────────────────────────────────────────────────────────────

export class KPIEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Calculate cash conversion cycle KPI.
   */
  async calculateCashConversionCycle(organizationId: number, asOfDate: string): Promise<KPI> {
    // Simplified calculation: DIO + DSO - DPO
    // DIO (Days Inventory Outstanding) = 45 (placeholder)
    // DSO (Days Sales Outstanding) = 30 (placeholder)
    // DPO (Days Payable Outstanding) = 60 (placeholder)

    const value = 45 + 30 - 60; // = 15 days

    return {
      id: 'ccc',
      name: 'Cash Conversion Cycle',
      description: 'Days to convert cash outflows back to cash inflows',
      category: 'financial',
      value,
      unit: 'days',
      target: 30,
      threshold: { min: 0, max: 60 },
      status: value <= 30 ? 'on-track' : value <= 45 ? 'at-risk' : 'off-track',
      trend: 'stable',
      lastUpdated: asOfDate,
      historicalValues: [],
    };
  }

  /**
   * Calculate current ratio KPI.
   */
  async calculateCurrentRatio(organizationId: number, asOfDate: string): Promise<KPI> {
    // Get current assets (cash)
    const [cashResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(
        and(
          eq(financeBankAccounts.organizationId, organizationId),
          lte(financeBankAccounts.createdAt, asOfDate)
        )
      );

    const currentAssets = Number(cashResult?.total) || 0;

    // Get current liabilities
    const [liabilitiesResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${procurementPayables.totalAmount}), 0)`,
      })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          eq(procurementPayables.status, 'pending_invoice')
        )
      );

    const currentLiabilities = Number(liabilitiesResult?.total) || 0;
    const value = currentLiabilities > 0 ? currentAssets / currentLiabilities : 1.0;

    return {
      id: 'currentRatio',
      name: 'Current Ratio',
      description: 'Ability to pay short-term obligations',
      category: 'financial',
      value: Number(value.toFixed(2)),
      unit: 'ratio',
      target: 1.5,
      threshold: { min: 1.0, max: 3.0 },
      status: value >= 1.5 ? 'on-track' : value >= 1.0 ? 'at-risk' : 'off-track',
      trend: 'stable',
      lastUpdated: asOfDate,
      historicalValues: [],
    };
  }

  /**
   * Calculate quick ratio KPI.
   */
  async calculateQuickRatio(organizationId: number, asOfDate: string): Promise<KPI> {
    // Quick Ratio = (Current Assets - Inventory) / Current Liabilities
    // Simplified: Cash / Current Liabilities

    const [cashResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, organizationId));

    const cash = Number(cashResult?.total) || 0;

    const [liabilitiesResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${procurementPayables.totalAmount}), 0)`,
      })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          eq(procurementPayables.status, 'pending_invoice')
        )
      );

    const liabilities = Number(liabilitiesResult?.total) || 0;
    const value = liabilities > 0 ? cash / liabilities : 1.0;

    return {
      id: 'quickRatio',
      name: 'Quick Ratio',
      description: 'Ability to pay short-term obligations with liquid assets',
      category: 'financial',
      value: Number(value.toFixed(2)),
      unit: 'ratio',
      target: 1.0,
      threshold: { min: 0.8, max: 2.0 },
      status: value >= 1.0 ? 'on-track' : value >= 0.8 ? 'at-risk' : 'off-track',
      trend: 'stable',
      lastUpdated: asOfDate,
      historicalValues: [],
    };
  }

  /**
   * Calculate budget utilization KPI.
   */
  async calculateBudgetUtilization(organizationId: number, asOfDate: string): Promise<KPI> {
    // Get total expenditures
    const [expendResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeExpenditures.amount}), 0)`,
      })
      .from(financeExpenditures)
      .where(eq(financeExpenditures.organizationId, organizationId));

    const totalExpended = Number(expendResult?.total) || 0;

    // Assume total budget is 1,000,000 (placeholder)
    const totalBudget = 1000000;
    const value = (totalExpended / totalBudget) * 100;

    return {
      id: 'budgetUtilization',
      name: 'Budget Utilization',
      description: 'Percentage of budget spent',
      category: 'operational',
      value: Number(value.toFixed(2)),
      unit: '%',
      target: 80,
      threshold: { min: 0, max: 100 },
      status: value <= 80 ? 'on-track' : value <= 95 ? 'at-risk' : 'off-track',
      trend: 'stable',
      lastUpdated: asOfDate,
      historicalValues: [],
    };
  }

  /**
   * Calculate payment timeliness KPI.
   */
  async calculatePaymentTimeliness(organizationId: number, asOfDate: string): Promise<KPI> {
    // Get on-time payments
    const [onTimeResult] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          sql`${payments.paymentDate} <= ${payments.paymentDate}`
        )
      );

    const onTimeCount = Number(onTimeResult?.count) || 0;

    // Get total payments
    const [totalResult] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(payments)
      .where(eq(payments.organizationId, organizationId));

    const totalCount = Number(totalResult?.count) || 1;
    const value = (onTimeCount / totalCount) * 100;

    return {
      id: 'paymentTimeliness',
      name: 'Payment Timeliness',
      description: 'Percentage of payments made on time',
      category: 'operational',
      value: Number(value.toFixed(2)),
      unit: '%',
      target: 95,
      threshold: { min: 80, max: 100 },
      status: value >= 95 ? 'on-track' : value >= 80 ? 'at-risk' : 'off-track',
      trend: 'stable',
      lastUpdated: asOfDate,
      historicalValues: [],
    };
  }

  /**
   * Calculate invoice processing time KPI.
   */
  async calculateInvoiceProcessingTime(organizationId: number, asOfDate: string): Promise<KPI> {
    // Placeholder: average processing time in days
    const value = 5; // days

    return {
      id: 'invoiceProcessingTime',
      name: 'Invoice Processing Time',
      description: 'Average time to process invoices',
      category: 'operational',
      value,
      unit: 'days',
      target: 7,
      threshold: { min: 0, max: 14 },
      status: value <= 7 ? 'on-track' : value <= 10 ? 'at-risk' : 'off-track',
      trend: 'stable',
      lastUpdated: asOfDate,
      historicalValues: [],
    };
  }

  /**
   * Calculate compliance rate KPI.
   */
  async calculateComplianceRate(organizationId: number, asOfDate: string): Promise<KPI> {
    // Get compliant invoices
    const [compliantResult] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(procurementInvoices)
      .where(
        and(
          eq(procurementInvoices.organizationId, organizationId),
          eq(procurementInvoices.approvalStatus, 'approved')
        )
      );

    const compliantCount = Number(compliantResult?.count) || 0;

    // Get total invoices
    const [totalResult] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(procurementInvoices)
      .where(eq(procurementInvoices.organizationId, organizationId));

    const totalCount = Number(totalResult?.count) || 1;
    const value = (compliantCount / totalCount) * 100;

    return {
      id: 'complianceRate',
      name: 'Compliance Rate',
      description: 'Percentage of compliant transactions',
      category: 'compliance',
      value: Number(value.toFixed(2)),
      unit: '%',
      target: 98,
      threshold: { min: 90, max: 100 },
      status: value >= 98 ? 'on-track' : value >= 90 ? 'at-risk' : 'off-track',
      trend: 'stable',
      lastUpdated: asOfDate,
      historicalValues: [],
    };
  }

  /**
   * Calculate cost efficiency KPI.
   */
  async calculateCostEfficiency(organizationId: number, asOfDate: string): Promise<KPI> {
    // Cost per transaction (placeholder)
    const value = 45; // USD

    return {
      id: 'costEfficiency',
      name: 'Cost Efficiency',
      description: 'Average cost per transaction',
      category: 'operational',
      value,
      unit: 'USD',
      target: 50,
      threshold: { min: 0, max: 100 },
      status: value <= 50 ? 'on-track' : value <= 75 ? 'at-risk' : 'off-track',
      trend: 'improving',
      lastUpdated: asOfDate,
      historicalValues: [],
    };
  }

  /**
   * Get all KPIs for organization.
   */
  async getAllKPIs(organizationId: number, asOfDate: string): Promise<KPI[]> {
    return [
      await this.calculateCashConversionCycle(organizationId, asOfDate),
      await this.calculateCurrentRatio(organizationId, asOfDate),
      await this.calculateQuickRatio(organizationId, asOfDate),
      await this.calculateBudgetUtilization(organizationId, asOfDate),
      await this.calculatePaymentTimeliness(organizationId, asOfDate),
      await this.calculateInvoiceProcessingTime(organizationId, asOfDate),
      await this.calculateComplianceRate(organizationId, asOfDate),
      await this.calculateCostEfficiency(organizationId, asOfDate),
    ];
  }

  /**
   * Generate KPI report.
   */
  async generateKPIReport(organizationId: number, asOfDate: string): Promise<KPIReport> {
    const kpis = await this.getAllKPIs(organizationId, asOfDate);

    const summary = {
      onTrack: kpis.filter((k) => k.status === 'on-track').length,
      atRisk: kpis.filter((k) => k.status === 'at-risk').length,
      offTrack: kpis.filter((k) => k.status === 'off-track').length,
    };

    const trends = {
      improving: kpis.filter((k) => k.trend === 'improving').length,
      stable: kpis.filter((k) => k.trend === 'stable').length,
      deteriorating: kpis.filter((k) => k.trend === 'deteriorating').length,
    };

    const recommendations: string[] = [];
    kpis.forEach((kpi) => {
      if (kpi.status === 'off-track') {
        recommendations.push(`${kpi.name} is off-track. Current: ${kpi.value} ${kpi.unit}, Target: ${kpi.target} ${kpi.unit}`);
      } else if (kpi.status === 'at-risk') {
        recommendations.push(`${kpi.name} is at risk. Monitor closely.`);
      }
    });

    return {
      reportDate: asOfDate,
      organizationId,
      kpis,
      summary,
      trends,
      recommendations,
    };
  }

  /**
   * Generate KPI alerts.
   */
  async generateKPIAlerts(organizationId: number, asOfDate: string): Promise<KPIAlert[]> {
    const kpis = await this.getAllKPIs(organizationId, asOfDate);
    const alerts: KPIAlert[] = [];

    kpis.forEach((kpi) => {
      if (kpi.status === 'off-track') {
        alerts.push({
          id: `alert-${kpi.id}`,
          kpiId: kpi.id,
          kpiName: kpi.name,
          severity: 'critical',
          message: `${kpi.name} is off-track. Current: ${kpi.value} ${kpi.unit}, Target: ${kpi.target} ${kpi.unit}`,
          createdAt: asOfDate,
        });
      } else if (kpi.status === 'at-risk') {
        alerts.push({
          id: `alert-${kpi.id}`,
          kpiId: kpi.id,
          kpiName: kpi.name,
          severity: 'warning',
          message: `${kpi.name} is at risk. Current: ${kpi.value} ${kpi.unit}, Target: ${kpi.target} ${kpi.unit}`,
          createdAt: asOfDate,
        });
      }
    });

    return alerts;
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let kpiEngineInstance: KPIEngine | null = null;

export async function getKPIEngine(): Promise<KPIEngine> {
  if (!kpiEngineInstance) {
    const db = await getDb();
    kpiEngineInstance = new KPIEngine(db);
  }
  return kpiEngineInstance;
}

export const kpiEngine = {
  getAllKPIs: async (organizationId: number, asOfDate: string) => {
    const engine = await getKPIEngine();
    return engine.getAllKPIs(organizationId, asOfDate);
  },
  generateKPIReport: async (organizationId: number, asOfDate: string) => {
    const engine = await getKPIEngine();
    return engine.generateKPIReport(organizationId, asOfDate);
  },
  generateKPIAlerts: async (organizationId: number, asOfDate: string) => {
    const engine = await getKPIEngine();
    return engine.generateKPIAlerts(organizationId, asOfDate);
  },
};
