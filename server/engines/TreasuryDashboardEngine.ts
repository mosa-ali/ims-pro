/**
 * server/engines/TreasuryDashboardEngine.ts
 *
 * Treasury Dashboard Engine
 * Aggregates treasury KPIs and visualizations for executive dashboards.
 *
 * Responsibilities:
 * - Aggregate all treasury metrics into unified KPIs
 * - Generate dashboard visualizations
 * - Track treasury performance indicators
 * - Provide executive summary metrics
 * - Generate alerts and recommendations
 * - Support drill-down analytics
 */

import { and, eq, sum, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  financeBankAccounts,
  payments,
  financeExpenditures,
  procurementPayables,
  financeAdvances,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { BankReconciliationEngine } from './BankReconciliationEngine';
import { CashForecastEngine } from './CashForecastEngine';
import { LiquidityAnalysisEngine } from './LiquidityAnalysisEngine';
import { FXGainLossEngine } from './FXGainLossEngine';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TreasuryKPI {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  status: 'good' | 'warning' | 'critical';
  lastUpdated: string;
}

export interface CashPositionSummary {
  totalCash: number;
  totalPayables: number;
  netCashPosition: number;
  cashCoverage: number; // months of operations
  unrestricted: number;
  restricted: number;
  forecast30Days: number;
  forecast90Days: number;
}

export interface TreasuryMetrics {
  cashPosition: CashPositionSummary;
  liquidityRatios: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  workingCapital: number;
  fxExposure: number;
  realizedGainLoss: number;
  unrealizedGainLoss: number;
  bankReconciliationStatus: string;
  daysPayableOutstanding: number;
  daysInventoryOutstanding: number;
}

export interface DashboardAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action: string;
  actionUrl?: string;
  createdAt: string;
}

export interface TreasuryDashboard {
  organizationId: number;
  asOfDate: string;
  metrics: TreasuryMetrics;
  kpis: TreasuryKPI[];
  alerts: DashboardAlert[];
  recommendations: string[];
  visualizations: {
    cashFlowChart: Array<{ date: string; inflow: number; outflow: number; balance: number }>;
    liquidityTrend: Array<{ date: string; currentRatio: number; quickRatio: number }>;
    fxExposureByCurrency: Array<{ currency: string; exposure: number; gainLoss: number }>;
    paymentsDueChart: Array<{ dueDate: string; amount: number; count: number }>;
  };
}

// ── Treasury Dashboard Engine ────────────────────────────────────────────────

export class TreasuryDashboardEngine {
  private db: DB;
  private bankReconciliationEngine: BankReconciliationEngine;
  private cashForecastEngine: CashForecastEngine;
  private liquidityAnalysisEngine: LiquidityAnalysisEngine;
  private fxGainLossEngine: FXGainLossEngine;

  constructor(
    db: DB,
    bankReconciliationEngine: BankReconciliationEngine,
    cashForecastEngine: CashForecastEngine,
    liquidityAnalysisEngine: LiquidityAnalysisEngine,
    fxGainLossEngine: FXGainLossEngine
  ) {
    this.db = db;
    this.bankReconciliationEngine = bankReconciliationEngine;
    this.cashForecastEngine = cashForecastEngine;
    this.liquidityAnalysisEngine = liquidityAnalysisEngine;
    this.fxGainLossEngine = fxGainLossEngine;
  }

  /**
   * Get cash position summary.
   */
  async getCashPositionSummary(organizationId: number): Promise<CashPositionSummary> {
    // Get total cash
    const [cashResult] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${financeBankAccounts.currentBalance}), 0)`,
      })
      .from(financeBankAccounts)
      .where(eq(financeBankAccounts.organizationId, organizationId));

    const totalCash = Number(cashResult?.total) || 0;

    // Get total payables
    const [payablesResult] = await this.db
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

    const totalPayables = Number(payablesResult?.total) || 0;

    // Get forecast
    const forecast = await this.cashForecastEngine.projectCashPosition(organizationId, 90);

    return {
      totalCash,
      totalPayables,
      netCashPosition: totalCash - totalPayables,
      cashCoverage: totalPayables > 0 ? totalCash / (totalPayables / 30) : 0,
      unrestricted: totalCash * 0.9, // TODO: Get from actual data
      restricted: totalCash * 0.1, // TODO: Get from actual data
      forecast30Days: forecast.length > 0 ? forecast[0].closingBalance : totalCash,
      forecast90Days: forecast.length > 0 ? forecast[forecast.length - 1].closingBalance : totalCash,
    };
  }

  /**
   * Get treasury metrics.
   */
  async getTreasuryMetrics(organizationId: number, asOfDate: string): Promise<TreasuryMetrics> {
    const cashPosition = await this.getCashPositionSummary(organizationId);
    const liquidityRatios = await this.liquidityAnalysisEngine.calculateLiquidityRatios(
      organizationId,
      asOfDate
    );
    const workingCapital = liquidityRatios.workingCapital;
    const fxReport = await this.fxGainLossEngine.generateFXImpactReport(organizationId, asOfDate);

    return {
      cashPosition,
      liquidityRatios: {
        currentRatio: liquidityRatios.currentRatio,
        quickRatio: liquidityRatios.quickRatio,
        cashRatio: liquidityRatios.cashRatio,
      },
      workingCapital,
      fxExposure: fxReport.exposureByCurrency.reduce((sum, e) => sum + e.totalExposure, 0),
      realizedGainLoss: fxReport.totalRealizedGainLoss,
      unrealizedGainLoss: fxReport.totalUnrealizedGainLoss,
      bankReconciliationStatus: 'reconciled', // TODO: Get from bank reconciliation engine
      daysPayableOutstanding: 60, // TODO: Calculate from actual data
      daysInventoryOutstanding: 45, // TODO: Calculate from actual data
    };
  }

  /**
   * Generate treasury KPIs.
   */
  async generateKPIs(organizationId: number, asOfDate: string): Promise<TreasuryKPI[]> {
    const metrics = await this.getTreasuryMetrics(organizationId, asOfDate);

    const kpis: TreasuryKPI[] = [
      {
        name: 'Total Cash Position',
        value: metrics.cashPosition.totalCash,
        unit: 'USD',
        trend: 'stable',
        trendPercentage: 0,
        status: metrics.cashPosition.totalCash > 0 ? 'good' : 'critical',
        lastUpdated: asOfDate,
      },
      {
        name: 'Net Cash Position',
        value: metrics.cashPosition.netCashPosition,
        unit: 'USD',
        trend: metrics.cashPosition.netCashPosition > 0 ? 'up' : 'down',
        trendPercentage: 0,
        status: metrics.cashPosition.netCashPosition > 0 ? 'good' : 'warning',
        lastUpdated: asOfDate,
      },
      {
        name: 'Current Ratio',
        value: metrics.liquidityRatios.currentRatio,
        unit: 'ratio',
        trend: metrics.liquidityRatios.currentRatio >= 1 ? 'up' : 'down',
        trendPercentage: 0,
        status: metrics.liquidityRatios.currentRatio >= 1.5 ? 'good' : 'warning',
        lastUpdated: asOfDate,
      },
      {
        name: 'Quick Ratio',
        value: metrics.liquidityRatios.quickRatio,
        unit: 'ratio',
        trend: metrics.liquidityRatios.quickRatio >= 0.8 ? 'up' : 'down',
        trendPercentage: 0,
        status: metrics.liquidityRatios.quickRatio >= 1 ? 'good' : 'warning',
        lastUpdated: asOfDate,
      },
      {
        name: 'Working Capital',
        value: metrics.workingCapital,
        unit: 'USD',
        trend: metrics.workingCapital > 0 ? 'up' : 'down',
        trendPercentage: 0,
        status: metrics.workingCapital > 0 ? 'good' : 'critical',
        lastUpdated: asOfDate,
      },
      {
        name: 'FX Exposure',
        value: metrics.fxExposure,
        unit: 'USD',
        trend: 'stable',
        trendPercentage: 0,
        status: metrics.fxExposure > metrics.cashPosition.totalCash * 0.2 ? 'warning' : 'good',
        lastUpdated: asOfDate,
      },
      {
        name: 'Net FX Gain/Loss',
        value: metrics.realizedGainLoss + metrics.unrealizedGainLoss,
        unit: 'USD',
        trend:
          metrics.realizedGainLoss + metrics.unrealizedGainLoss > 0 ? 'up' : 'down',
        trendPercentage: 0,
        status:
          metrics.realizedGainLoss + metrics.unrealizedGainLoss > 0 ? 'good' : 'warning',
        lastUpdated: asOfDate,
      },
    ];

    return kpis;
  }

  /**
   * Generate dashboard alerts.
   */
  async generateAlerts(organizationId: number, asOfDate: string): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];
    const metrics = await this.getTreasuryMetrics(organizationId, asOfDate);

    // Alert: Low cash position
    if (metrics.cashPosition.totalCash < 50000) {
      alerts.push({
        id: 'alert-low-cash',
        severity: 'critical',
        title: 'Low Cash Position',
        description: `Current cash balance of ${metrics.cashPosition.totalCash.toFixed(2)} USD is below recommended threshold`,
        action: 'Review cash management strategy',
        createdAt: asOfDate,
      });
    }

    // Alert: Current ratio below 1.0
    if (metrics.liquidityRatios.currentRatio < 1) {
      alerts.push({
        id: 'alert-low-liquidity',
        severity: 'critical',
        title: 'Low Liquidity Ratio',
        description: `Current ratio of ${metrics.liquidityRatios.currentRatio.toFixed(2)} indicates potential liquidity stress`,
        action: 'Arrange additional financing or reduce payables',
        createdAt: asOfDate,
      });
    }

    // Alert: Negative working capital
    if (metrics.workingCapital < 0) {
      alerts.push({
        id: 'alert-negative-wc',
        severity: 'warning',
        title: 'Negative Working Capital',
        description: `Working capital is negative at ${metrics.workingCapital.toFixed(2)} USD`,
        action: 'Increase current assets or reduce current liabilities',
        createdAt: asOfDate,
      });
    }

    // Alert: High FX exposure
    if (metrics.fxExposure > metrics.cashPosition.totalCash * 0.3) {
      alerts.push({
        id: 'alert-high-fx-exposure',
        severity: 'warning',
        title: 'High FX Exposure',
        description: `FX exposure of ${metrics.fxExposure.toFixed(2)} USD exceeds 30% of cash position`,
        action: 'Consider FX hedging strategies',
        createdAt: asOfDate,
      });
    }

    // Alert: Unrealized FX losses
    if (metrics.unrealizedGainLoss < -10000) {
      alerts.push({
        id: 'alert-fx-losses',
        severity: 'warning',
        title: 'Significant Unrealized FX Losses',
        description: `Unrealized FX losses of ${Math.abs(metrics.unrealizedGainLoss).toFixed(2)} USD detected`,
        action: 'Monitor FX positions and consider rebalancing',
        createdAt: asOfDate,
      });
    }

    return alerts;
  }

  /**
   * Generate treasury recommendations.
   */
  async generateRecommendations(organizationId: number, asOfDate: string): Promise<string[]> {
    const recommendations: string[] = [];
    const metrics = await this.getTreasuryMetrics(organizationId, asOfDate);

    if (metrics.cashPosition.cashCoverage < 1) {
      recommendations.push('Increase cash reserves to cover at least 1 month of operations');
    }

    if (metrics.liquidityRatios.currentRatio < 1.5) {
      recommendations.push('Improve liquidity by accelerating receivables or negotiating extended payment terms');
    }

    if (metrics.workingCapital < 0) {
      recommendations.push('Address negative working capital through asset sales or equity injection');
    }

    if (metrics.fxExposure > metrics.cashPosition.totalCash * 0.2) {
      recommendations.push('Implement FX hedging program to reduce currency exposure');
    }

    if (metrics.daysPayableOutstanding > 90) {
      recommendations.push('Optimize payment timing to improve cash flow');
    }

    return recommendations;
  }

  /**
   * Generate complete treasury dashboard.
   */
  async generateDashboard(organizationId: number, asOfDate: string): Promise<TreasuryDashboard> {
    const metrics = await this.getTreasuryMetrics(organizationId, asOfDate);
    const kpis = await this.generateKPIs(organizationId, asOfDate);
    const alerts = await this.generateAlerts(organizationId, asOfDate);
    const recommendations = await this.generateRecommendations(organizationId, asOfDate);

    // Generate visualization data
    const cashFlowChart: Array<{ date: string; inflow: number; outflow: number; balance: number }> = [];
    const liquidityTrend: Array<{ date: string; currentRatio: number; quickRatio: number }> = [];
    const fxExposureByCurrency: Array<{ currency: string; exposure: number; gainLoss: number }> = [];
    const paymentsDueChart: Array<{ dueDate: string; amount: number; count: number }> = [];

    // TODO: Populate visualization data from actual sources

    return {
      organizationId,
      asOfDate,
      metrics,
      kpis,
      alerts,
      recommendations,
      visualizations: {
        cashFlowChart,
        liquidityTrend,
        fxExposureByCurrency,
        paymentsDueChart,
      },
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let treasuryDashboardEngineInstance: TreasuryDashboardEngine | null = null;

export async function getTreasuryDashboardEngine(
  bankReconciliationEngine: BankReconciliationEngine,
  cashForecastEngine: CashForecastEngine,
  liquidityAnalysisEngine: LiquidityAnalysisEngine,
  fxGainLossEngine: FXGainLossEngine
): Promise<TreasuryDashboardEngine> {
  if (!treasuryDashboardEngineInstance) {
    const db = await getDb();
    treasuryDashboardEngineInstance = new TreasuryDashboardEngine(
      db,
      bankReconciliationEngine,
      cashForecastEngine,
      liquidityAnalysisEngine,
      fxGainLossEngine
    );
  }
  return treasuryDashboardEngineInstance;
}

export const treasuryDashboardEngine = {
  getCashPositionSummary: async (
    organizationId: number,
    engines: {
      bankReconciliation: BankReconciliationEngine;
      cashForecast: CashForecastEngine;
      liquidityAnalysis: LiquidityAnalysisEngine;
      fxGainLoss: FXGainLossEngine;
    }
  ) => {
    const engine = await getTreasuryDashboardEngine(
      engines.bankReconciliation,
      engines.cashForecast,
      engines.liquidityAnalysis,
      engines.fxGainLoss
    );
    return engine.getCashPositionSummary(organizationId);
  },
  getTreasuryMetrics: async (
    organizationId: number,
    asOfDate: string,
    engines: {
      bankReconciliation: BankReconciliationEngine;
      cashForecast: CashForecastEngine;
      liquidityAnalysis: LiquidityAnalysisEngine;
      fxGainLoss: FXGainLossEngine;
    }
  ) => {
    const engine = await getTreasuryDashboardEngine(
      engines.bankReconciliation,
      engines.cashForecast,
      engines.liquidityAnalysis,
      engines.fxGainLoss
    );
    return engine.getTreasuryMetrics(organizationId, asOfDate);
  },
  generateKPIs: async (
    organizationId: number,
    asOfDate: string,
    engines: {
      bankReconciliation: BankReconciliationEngine;
      cashForecast: CashForecastEngine;
      liquidityAnalysis: LiquidityAnalysisEngine;
      fxGainLoss: FXGainLossEngine;
    }
  ) => {
    const engine = await getTreasuryDashboardEngine(
      engines.bankReconciliation,
      engines.cashForecast,
      engines.liquidityAnalysis,
      engines.fxGainLoss
    );
    return engine.generateKPIs(organizationId, asOfDate);
  },
  generateAlerts: async (
    organizationId: number,
    asOfDate: string,
    engines: {
      bankReconciliation: BankReconciliationEngine;
      cashForecast: CashForecastEngine;
      liquidityAnalysis: LiquidityAnalysisEngine;
      fxGainLoss: FXGainLossEngine;
    }
  ) => {
    const engine = await getTreasuryDashboardEngine(
      engines.bankReconciliation,
      engines.cashForecast,
      engines.liquidityAnalysis,
      engines.fxGainLoss
    );
    return engine.generateAlerts(organizationId, asOfDate);
  },
  generateRecommendations: async (
    organizationId: number,
    asOfDate: string,
    engines: {
      bankReconciliation: BankReconciliationEngine;
      cashForecast: CashForecastEngine;
      liquidityAnalysis: LiquidityAnalysisEngine;
      fxGainLoss: FXGainLossEngine;
    }
  ) => {
    const engine = await getTreasuryDashboardEngine(
      engines.bankReconciliation,
      engines.cashForecast,
      engines.liquidityAnalysis,
      engines.fxGainLoss
    );
    return engine.generateRecommendations(organizationId, asOfDate);
  },
  generateDashboard: async (
    organizationId: number,
    asOfDate: string,
    engines: {
      bankReconciliation: BankReconciliationEngine;
      cashForecast: CashForecastEngine;
      liquidityAnalysis: LiquidityAnalysisEngine;
      fxGainLoss: FXGainLossEngine;
    }
  ) => {
    const engine = await getTreasuryDashboardEngine(
      engines.bankReconciliation,
      engines.cashForecast,
      engines.liquidityAnalysis,
      engines.fxGainLoss
    );
    return engine.generateDashboard(organizationId, asOfDate);
  },
};
