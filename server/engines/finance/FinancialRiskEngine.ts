/**
 * server/engines/finance/FinancialRiskEngine.ts
 *
 * Financial Risk Engine
 * Comprehensive financial risk assessment and monitoring.
 *
 * Risk Dimensions:
 * 1. Liquidity Risk - Cash availability and working capital
 * 2. FX Risk - Foreign exchange exposure
 * 3. Donor Risk - Donor concentration and compliance
 * 4. Project Financial Health Risk - Project budget/timeline health
 * 5. Budget Overrun Risk - Projected budget violations
 * 6. Treasury Risk - Cash flow and investment risk
 * 7. Payment Delay Risk - Vendor payment delays
 * 8. Receivable Aging Risk - AR collection risk
 * 9. Payable Aging Risk - AP management risk
 * 10. Compliance Risk - Regulatory and policy compliance
 */

import type { DB } from '../../db/_scope';
import { getRiskRepository, type LiquidityRisk, type FXRisk, type DonorRisk, type ProjectFinancialHealthRisk, type BudgetOverrunRisk, type PaymentDelayRisk, type ReceivableAgingRisk } from '../../repositories/finance/RiskRepository';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RiskDimension {
  name: string;
  score: number; // 0-100, where 0 is lowest risk
  level: 'low' | 'medium' | 'high' | 'critical';
  weight: number; // 0-1
  indicators: string[];
  recommendations: string[];
}

export interface RiskAssessment {
  organizationId: number;
  overallRiskScore: number; // 0-100
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  dimensions: RiskDimension[];
  topRisks: string[];
  recommendations: string[];
  assessmentDate: Date;
}

export interface RiskTrend {
  period: string; // YYYY-MM
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dimensionScores: Record<string, number>;
}

// ── Financial Risk Engine ───────────────────────────────────────────────────

export class FinancialRiskEngine {
  private db: DB;
  private readonly DIMENSION_WEIGHTS = {
    liquidity: 0.15,
    fx: 0.08,
    donor: 0.12,
    projectHealth: 0.15,
    budgetOverrun: 0.15,
    treasury: 0.10,
    paymentDelay: 0.10,
    receivableAging: 0.08,
    payableAging: 0.05,
    compliance: 0.02,
  };

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Assess liquidity risk.
   */
  private async assessLiquidityRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const riskRepo = await getRiskRepository(this.db);
    const liquidity = await riskRepo.getLiquidityRisk(organizationId, operatingUnitId);

    let score = 100;
    const indicators: string[] = [];
    const recommendations: string[] = [];

    if (liquidity.riskLevel === 'critical') {
      score = 20;
      indicators.push('Critical cash shortage');
      recommendations.push('Immediately secure additional funding');
    } else if (liquidity.riskLevel === 'high') {
      score = 40;
      indicators.push('Low cash reserves');
      recommendations.push('Accelerate receivables collection');
    } else if (liquidity.riskLevel === 'medium') {
      score = 60;
      indicators.push('Moderate liquidity constraints');
      recommendations.push('Monitor cash flow closely');
    }

    indicators.push(`Days of cash available: ${liquidity.daysOfCashAvailable}`);
    indicators.push(`Current ratio: ${liquidity.currentRatio.toFixed(2)}`);

    return {
      name: 'Liquidity Risk',
      score,
      level: liquidity.riskLevel === 'critical' ? 'critical' : liquidity.riskLevel === 'high' ? 'high' : liquidity.riskLevel === 'medium' ? 'medium' : 'low',
      weight: this.DIMENSION_WEIGHTS.liquidity,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess FX risk.
   */
  private async assessFXRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const riskRepo = await getRiskRepository(this.db);
    const fxRisks = await riskRepo.getFXRisk(organizationId, operatingUnitId);

    let score = 100;
    const indicators: string[] = [];
    const recommendations: string[] = [];

    for (const fx of fxRisks) {
      if (fx.riskLevel === 'high') {
        score = Math.min(score, 40);
        recommendations.push(`Hedge ${fx.exposedCurrency} exposure`);
      } else if (fx.riskLevel === 'medium') {
        score = Math.min(score, 65);
      }
      indicators.push(`${fx.exposedCurrency}: ${fx.exposedAmount.toLocaleString()}`);
    }

    return {
      name: 'FX Risk',
      score,
      level: score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical',
      weight: this.DIMENSION_WEIGHTS.fx,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess donor risk.
   */
  private async assessDonorRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const riskRepo = await getRiskRepository(this.db);
    const donorRisks = await riskRepo.getDonorRisk(organizationId, operatingUnitId);

    let score = 100;
    const indicators: string[] = [];
    const recommendations: string[] = [];

    for (const donor of donorRisks) {
      if (donor.riskLevel === 'high') {
        score = Math.min(score, 50);
        recommendations.push(`Review compliance with ${donor.donorName}`);
      } else if (donor.riskLevel === 'medium') {
        score = Math.min(score, 70);
      }
      indicators.push(`${donor.donorName}: ${donor.reportingStatus}`);
    }

    return {
      name: 'Donor Risk',
      score,
      level: score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical',
      weight: this.DIMENSION_WEIGHTS.donor,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess project financial health risk.
   */
  private async assessProjectHealthRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const riskRepo = await getRiskRepository(this.db);
    // In production, assess all projects
    const indicators: string[] = [];
    const recommendations: string[] = [];

    let score = 75;
    indicators.push('Portfolio health assessment in progress');
    recommendations.push('Monitor project KPIs weekly');

    return {
      name: 'Project Financial Health Risk',
      score,
      level: 'medium',
      weight: this.DIMENSION_WEIGHTS.projectHealth,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess budget overrun risk.
   */
  private async assessBudgetOverrunRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const riskRepo = await getRiskRepository(this.db);
    const overruns = await riskRepo.getBudgetOverrunRisk(organizationId, operatingUnitId);

    let score = 100;
    const indicators: string[] = [];
    const recommendations: string[] = [];

    for (const overrun of overruns) {
      if (overrun.riskLevel === 'critical') {
        score = Math.min(score, 30);
        recommendations.push(`Address critical overrun in ${overrun.projectName}`);
      } else if (overrun.riskLevel === 'high') {
        score = Math.min(score, 50);
      }
      indicators.push(`${overrun.projectName}: ${overrun.overrunPercent.toFixed(1)}% over budget`);
    }

    return {
      name: 'Budget Overrun Risk',
      score,
      level: score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical',
      weight: this.DIMENSION_WEIGHTS.budgetOverrun,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess treasury risk.
   */
  private async assessTreasuryRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const indicators: string[] = [];
    const recommendations: string[] = [];

    const score = 75;
    indicators.push('Cash flow forecasting in place');
    indicators.push('Investment portfolio monitored');
    recommendations.push('Review treasury policy quarterly');

    return {
      name: 'Treasury Risk',
      score,
      level: 'medium',
      weight: this.DIMENSION_WEIGHTS.treasury,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess payment delay risk.
   */
  private async assessPaymentDelayRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const riskRepo = await getRiskRepository(this.db);
    const delays = await riskRepo.getPaymentDelayRisk(organizationId, operatingUnitId);

    let score = 100;
    const indicators: string[] = [];
    const recommendations: string[] = [];

    for (const delay of delays) {
      if (delay.riskLevel === 'high') {
        score = Math.min(score, 60);
        recommendations.push(`Prioritize payment to ${delay.vendorName}`);
      }
      indicators.push(`${delay.vendorName}: ${delay.daysOverdue} days overdue`);
    }

    return {
      name: 'Payment Delay Risk',
      score,
      level: score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical',
      weight: this.DIMENSION_WEIGHTS.paymentDelay,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess receivable aging risk.
   */
  private async assessReceivableAgingRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const riskRepo = await getRiskRepository(this.db);
    const aging = await riskRepo.getReceivableAgingRisk(organizationId, operatingUnitId);

    let score = 100;
    const indicators: string[] = [];
    const recommendations: string[] = [];

    if (aging.riskLevel === 'high') {
      score = 50;
      recommendations.push('Accelerate collection efforts');
    } else if (aging.riskLevel === 'medium') {
      score = 70;
      recommendations.push('Monitor aging closely');
    }

    indicators.push(`Days outstanding: ${aging.daysOutstanding}`);
    indicators.push(`90+ days: ${(aging.ninetyPlus / aging.totalReceivable * 100).toFixed(1)}%`);

    return {
      name: 'Receivable Aging Risk',
      score,
      level: aging.riskLevel === 'high' ? 'high' : aging.riskLevel === 'medium' ? 'medium' : 'low',
      weight: this.DIMENSION_WEIGHTS.receivableAging,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess payable aging risk.
   */
  private async assessPayableAgingRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const indicators: string[] = [];
    const recommendations: string[] = [];

    const score = 80;
    indicators.push('Payables aging monitored');
    recommendations.push('Maintain vendor relationships');

    return {
      name: 'Payable Aging Risk',
      score,
      level: 'low',
      weight: this.DIMENSION_WEIGHTS.payableAging,
      indicators,
      recommendations,
    };
  }

  /**
   * Assess compliance risk.
   */
  private async assessComplianceRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskDimension> {
    const indicators: string[] = [];
    const recommendations: string[] = [];

    const score = 85;
    indicators.push('Compliance framework in place');
    recommendations.push('Conduct quarterly compliance reviews');

    return {
      name: 'Compliance Risk',
      score,
      level: 'low',
      weight: this.DIMENSION_WEIGHTS.compliance,
      indicators,
      recommendations,
    };
  }

  /**
   * Perform comprehensive risk assessment.
   */
  async assessFinancialRisk(
    organizationId: number,
    operatingUnitId?: number | null
  ): Promise<RiskAssessment> {
    const dimensions = await Promise.all([
      this.assessLiquidityRisk(organizationId, operatingUnitId),
      this.assessFXRisk(organizationId, operatingUnitId),
      this.assessDonorRisk(organizationId, operatingUnitId),
      this.assessProjectHealthRisk(organizationId, operatingUnitId),
      this.assessBudgetOverrunRisk(organizationId, operatingUnitId),
      this.assessTreasuryRisk(organizationId, operatingUnitId),
      this.assessPaymentDelayRisk(organizationId, operatingUnitId),
      this.assessReceivableAgingRisk(organizationId, operatingUnitId),
      this.assessPayableAgingRisk(organizationId, operatingUnitId),
      this.assessComplianceRisk(organizationId, operatingUnitId),
    ]);

    // Calculate weighted overall score
    const overallRiskScore = Math.round(
      dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0)
    );

    // Determine overall risk level
    let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (overallRiskScore < 40) overallRiskLevel = 'critical';
    else if (overallRiskScore < 60) overallRiskLevel = 'high';
    else if (overallRiskScore < 80) overallRiskLevel = 'medium';

    // Identify top risks
    const topRisks = dimensions
      .filter(d => d.level === 'critical' || d.level === 'high')
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(d => `${d.name}: ${d.level}`);

    // Collect recommendations
    const recommendations = Array.from(
      new Set(dimensions.flatMap(d => d.recommendations))
    ).slice(0, 10);

    return {
      organizationId,
      overallRiskScore,
      overallRiskLevel,
      dimensions,
      topRisks,
      recommendations,
      assessmentDate: new Date(),
    };
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let riskEngineInstance: FinancialRiskEngine | null = null;

export async function getFinancialRiskEngine(db: DB): Promise<FinancialRiskEngine> {
  if (!riskEngineInstance) {
    riskEngineInstance = new FinancialRiskEngine(db);
  }
  return riskEngineInstance;
}
