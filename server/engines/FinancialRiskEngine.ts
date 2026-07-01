/**
 * Financial Risk Engine
 * Provides comprehensive risk analysis, scoring, and predictive risk assessment
 * for projects, budgets, and financial operations.
 */

import { getDb } from "../db";
import { projects, budgetLines, financeExpenditures, grants, procurementPayables } from "../../drizzle/schema";
import { eq, and, sum, sql, gte, lte } from "drizzle-orm";

export interface RiskFactor {
  name: string;
  score: number; // 0-100
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
}

export interface RiskAssessment {
  projectId: number;
  overallRiskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: RiskFactor[];
  trend: "improving" | "stable" | "declining";
  exposureAmount: number;
  mitigationActions: string[];
}

export interface AggregatedRiskMetrics {
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  totalExposure: number;
  averageRiskScore: number;
}

export class FinancialRiskEngine {
  /**
   * Comprehensive project risk assessment
   */
  async assessProjectRisk(organizationId: number, projectId: number): Promise<RiskAssessment> {
    const db = await getDb();

    // Fetch project data
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)));

    if (!project) {
      throw new Error("Project not found");
    }

    // Calculate individual risk factors
    const budgetRisk = await this.calculateBudgetRisk(db, projectId, organizationId);
    const scheduleRisk = await this.calculateScheduleRisk(db, projectId);
    const cashFlowRisk = await this.calculateCashFlowRisk(db, projectId, organizationId);
    const procurementRisk = await this.calculateProcurementRisk(db, projectId, organizationId);
    const grantComplianceRisk = await this.calculateGrantComplianceRisk(db, projectId, organizationId);

    // Compile risk factors
    const riskFactors: RiskFactor[] = [budgetRisk, scheduleRisk, cashFlowRisk, procurementRisk, grantComplianceRisk];

    // Calculate overall risk score (weighted average)
    const overallRiskScore = this.calculateWeightedRiskScore(riskFactors);
    const riskLevel = this.determineRiskLevel(overallRiskScore);

    // Calculate trend
    const trend = await this.calculateRiskTrend(db, projectId);

    // Calculate exposure amount
    const totalBudget = project.totalBudget ? parseFloat(project.totalBudget.toString()) : 0;
    const spent = project.spent ? parseFloat(project.spent.toString()) : 0;
    const exposureAmount = totalBudget - spent;

    // Generate mitigation actions
    const mitigationActions = this.generateMitigationActions(riskFactors);

    return {
      projectId,
      overallRiskScore,
      riskLevel,
      riskFactors,
      trend,
      exposureAmount,
      mitigationActions,
    };
  }

  /**
   * Calculate budget-related risks
   */
  private async calculateBudgetRisk(
    db: any,
    projectId: number,
    organizationId: number
  ): Promise<RiskFactor> {
    const [budgetData] = await db
      .select({
        totalBudget: sum(sql`${budgetLines.unitCost} * ${budgetLines.quantity}`),
        totalSpent: sum(financeExpenditures.amount),
      })
      .from(budgetLines)
      .leftJoin(financeExpenditures, eq(budgetLines.id, financeExpenditures.budgetLineId))
      .where(eq(budgetLines.projectId, projectId));

    const totalBudget = budgetData?.totalBudget ? parseFloat(budgetData.totalBudget.toString()) : 1;
    const totalSpent = budgetData?.totalSpent ? parseFloat(budgetData.totalSpent.toString()) : 0;
    const utilizationRate = (totalSpent / totalBudget) * 100;

    // Risk scoring logic
    let score = 0;
    let severity: "low" | "medium" | "high" | "critical" = "low";
    let description = "";
    let recommendation = "";

    if (utilizationRate > 100) {
      score = 95;
      severity = "critical";
      description = `Budget exceeded by ${(utilizationRate - 100).toFixed(1)}%`;
      recommendation = "Immediately halt non-essential spending and escalate to finance leadership";
    } else if (utilizationRate > 90) {
      score = 75;
      severity = "high";
      description = `Budget utilization at ${utilizationRate.toFixed(1)}% - very high`;
      recommendation = "Review remaining budget allocation and prioritize critical activities";
    } else if (utilizationRate > 75) {
      score = 50;
      severity = "medium";
      description = `Budget utilization at ${utilizationRate.toFixed(1)}% - moderate`;
      recommendation = "Monitor spending closely and forecast remaining budget needs";
    } else {
      score = 25;
      severity = "low";
      description = `Budget utilization at ${utilizationRate.toFixed(1)}% - healthy`;
      recommendation = "Continue current spending patterns with regular monitoring";
    }

    return {
      name: "Budget Risk",
      score,
      severity,
      description,
      recommendation,
    };
  }

  /**
   * Calculate schedule-related risks
   */
  private async calculateScheduleRisk(db: any, projectId: number): Promise<RiskFactor> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

    if (!project) {
      return {
        name: "Schedule Risk",
        score: 0,
        severity: "low",
        description: "Project not found",
        recommendation: "N/A",
      };
    }

    const endDate = new Date(project.endDate);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((endDate.getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const progressPercent = ((totalDays - daysRemaining) / totalDays) * 100;

    let score = 0;
    let severity: "low" | "medium" | "high" | "critical" = "low";
    let description = "";
    let recommendation = "";

    if (daysRemaining < 0) {
      score = 95;
      severity = "critical";
      description = `Project is ${Math.abs(daysRemaining)} days overdue`;
      recommendation = "Implement emergency recovery plan and escalate to steering committee";
    } else if (daysRemaining < 30) {
      score = 75;
      severity = "high";
      description = `Only ${daysRemaining} days remaining (${progressPercent.toFixed(1)}% complete)`;
      recommendation = "Accelerate critical path activities and reduce scope if necessary";
    } else if (progressPercent < 30) {
      score = 50;
      severity = "medium";
      description = `Behind schedule: ${progressPercent.toFixed(1)}% complete with ${daysRemaining} days remaining`;
      recommendation = "Review project plan and adjust timelines or resource allocation";
    } else {
      score = 25;
      severity = "low";
      description = `On schedule: ${progressPercent.toFixed(1)}% complete with ${daysRemaining} days remaining`;
      recommendation = "Maintain current pace and continue monitoring";
    }

    return {
      name: "Schedule Risk",
      score,
      severity,
      description,
      recommendation,
    };
  }

  /**
   * Calculate cash flow risks
   */
  private async calculateCashFlowRisk(
    db: any,
    projectId: number,
    organizationId: number
  ): Promise<RiskFactor> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const [recentSpending] = await db
      .select({ total: sum(financeExpenditures.amount) })
      .from(financeExpenditures)
      .where(
        and(
          eq(financeExpenditures.projectId, projectId),
          eq(financeExpenditures.organizationId, organizationId),
          sql`DATE(${financeExpenditures.expenditureDate}) >= DATE(${thirtyDaysAgoStr})`
        )
      );

    const dailyBurnRate = (recentSpending?.total ? parseFloat(recentSpending.total.toString()) : 0) / 30;

    // Get remaining budget
    const [budgetData] = await db
      .select({
        totalBudget: sum(sql`${budgetLines.unitCost} * ${budgetLines.quantity}`),
        totalSpent: sum(financeExpenditures.amount),
      })
      .from(budgetLines)
      .leftJoin(financeExpenditures, eq(budgetLines.id, financeExpenditures.budgetLineId))
      .where(eq(budgetLines.projectId, projectId));

    const totalBudget = budgetData?.totalBudget ? parseFloat(budgetData.totalBudget.toString()) : 1;
    const totalSpent = budgetData?.totalSpent ? parseFloat(budgetData.totalSpent.toString()) : 0;
    const remainingBudget = totalBudget - totalSpent;

    const daysOfCashRemaining = dailyBurnRate > 0 ? Math.round(remainingBudget / dailyBurnRate) : 365;

    let score = 0;
    let severity: "low" | "medium" | "high" | "critical" = "low";
    let description = "";
    let recommendation = "";

    if (daysOfCashRemaining < 30) {
      score = 90;
      severity = "critical";
      description = `Only ${daysOfCashRemaining} days of cash remaining at current burn rate`;
      recommendation = "Immediately secure additional funding or reduce spending";
    } else if (daysOfCashRemaining < 60) {
      score = 70;
      severity = "high";
      description = `${daysOfCashRemaining} days of cash remaining - tight cash position`;
      recommendation = "Accelerate revenue collection and defer non-critical expenses";
    } else if (daysOfCashRemaining < 90) {
      score = 45;
      severity = "medium";
      description = `${daysOfCashRemaining} days of cash remaining - moderate cash position`;
      recommendation = "Monitor cash flow closely and plan for future funding needs";
    } else {
      score = 20;
      severity = "low";
      description = `${daysOfCashRemaining} days of cash remaining - healthy cash position`;
      recommendation = "Continue normal operations with regular cash flow monitoring";
    }

    return {
      name: "Cash Flow Risk",
      score,
      severity,
      description,
      recommendation,
    };
  }

  /**
   * Calculate procurement-related risks
   */
  private async calculateProcurementRisk(
    db: any,
    projectId: number,
    organizationId: number
  ): Promise<RiskFactor> {
    const [overduePOs] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          sql`${procurementPayables.dueDate} < NOW()`,
          sql`${procurementPayables.status} != 'fully_paid'`
        )
      );

    const overdueCount = overduePOs?.count || 0;

    let score = 0;
    let severity: "low" | "medium" | "high" | "critical" = "low";
    let description = "";
    let recommendation = "";

    if (overdueCount > 10) {
      score = 85;
      severity = "critical";
      description = `${overdueCount} overdue payables - critical vendor relationship risk`;
      recommendation = "Prioritize payment of overdue invoices and communicate with vendors";
    } else if (overdueCount > 5) {
      score = 65;
      severity = "high";
      description = `${overdueCount} overdue payables - significant vendor risk`;
      recommendation = "Develop payment plan and negotiate extended terms with vendors";
    } else if (overdueCount > 0) {
      score = 40;
      severity = "medium";
      description = `${overdueCount} overdue payables - monitor vendor relationships`;
      recommendation = "Process overdue payments and establish payment schedule";
    } else {
      score = 15;
      severity = "low";
      description = "No overdue payables - good procurement health";
      recommendation = "Maintain current procurement practices";
    }

    return {
      name: "Procurement Risk",
      score,
      severity,
      description,
      recommendation,
    };
  }

  /**
   * Calculate grant compliance risks
   */
  private async calculateGrantComplianceRisk(
    db: any,
    projectId: number,
    organizationId: number
  ): Promise<RiskFactor> {
    const [grantData] = await db
      .select()
      .from(grants)
      .where(and(eq(grants.projectId, projectId), eq(grants.organizationId, organizationId)));

    if (!grantData) {
      return {
        name: "Grant Compliance Risk",
        score: 0,
        severity: "low",
        description: "No active grants",
        recommendation: "N/A",
      };
    }

    const endDate = new Date(grantData.endDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let score = 0;
    let severity: "low" | "medium" | "high" | "critical" = "low";
    let description = "";
    let recommendation = "";

    if (daysUntilExpiry < 0) {
      score = 95;
      severity = "critical";
      description = `Grant expired ${Math.abs(daysUntilExpiry)} days ago - compliance violation`;
      recommendation = "Immediately contact donor and submit extension request or close-out report";
    } else if (daysUntilExpiry < 30) {
      score = 75;
      severity = "high";
      description = `Grant expires in ${daysUntilExpiry} days - urgent action required`;
      recommendation = "Accelerate spending or submit extension request to donor";
    } else if (daysUntilExpiry < 90) {
      score = 50;
      severity = "medium";
      description = `Grant expires in ${daysUntilExpiry} days - plan for close-out`;
      recommendation = "Finalize spending plans and prepare close-out documentation";
    } else {
      score = 20;
      severity = "low";
      description = `Grant expires in ${daysUntilExpiry} days - adequate time remaining`;
      recommendation = "Continue normal grant management and compliance monitoring";
    }

    return {
      name: "Grant Compliance Risk",
      score,
      severity,
      description,
      recommendation,
    };
  }

  /**
   * Calculate weighted risk score from multiple factors
   */
  private calculateWeightedRiskScore(riskFactors: RiskFactor[]): number {
    const weights = {
      "Budget Risk": 0.35,
      "Schedule Risk": 0.25,
      "Cash Flow Risk": 0.25,
      "Procurement Risk": 0.10,
      "Grant Compliance Risk": 0.05,
    };

    let totalScore = 0;
    let totalWeight = 0;

    riskFactors.forEach((factor) => {
      const weight = weights[factor.name as keyof typeof weights] || 0.1;
      totalScore += factor.score * weight;
      totalWeight += weight;
    });

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Determine overall risk level from score
   */
  private determineRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
    if (score >= 75) return "critical";
    if (score >= 50) return "high";
    if (score >= 25) return "medium";
    return "low";
  }

  /**
   * Calculate risk trend
   */
  private async calculateRiskTrend(db: any, projectId: number): Promise<"improving" | "stable" | "declining"> {
    // Simplified trend calculation - in production, would compare historical risk scores
    return "stable";
  }

  /**
   * Generate mitigation actions based on risk factors
   */
  private generateMitigationActions(riskFactors: RiskFactor[]): string[] {
    const actions: string[] = [];

    riskFactors.forEach((factor) => {
      if (factor.severity === "critical" || factor.severity === "high") {
        actions.push(factor.recommendation);
      }
    });

    return actions.length > 0 ? actions : ["Continue regular monitoring and reporting"];
  }

  /**
   * Aggregate risk metrics across all projects
   */
  async getAggregatedRiskMetrics(organizationId: number): Promise<AggregatedRiskMetrics> {
    const db = await getDb();

    const projectList = await db
        .select({
            id: projects.id,
        })
        .from(projects)
        .where(
            and(
            eq(projects.organizationId, organizationId),
            eq(projects.isDeleted, 0)
            )
        );

    let criticalRisks = 0;
    let highRisks = 0;
    let mediumRisks = 0;
    let lowRisks = 0;
    let totalExposure = 0;
    let totalRiskScore = 0;

    for (const proj of projectList) {
      const assessment = await this.assessProjectRisk(organizationId, proj.id);
      totalExposure += assessment.exposureAmount;
      totalRiskScore += assessment.overallRiskScore;

      if (assessment.riskLevel === "critical") criticalRisks++;
      else if (assessment.riskLevel === "high") highRisks++;
      else if (assessment.riskLevel === "medium") mediumRisks++;
      else lowRisks++;
    }

    return {
      criticalRisks,
      highRisks,
      mediumRisks,
      lowRisks,
      totalExposure,
      averageRiskScore: projectList.length > 0 ? Math.round(totalRiskScore / projectList.length) : 0,
    };
  }
}

export const financialRiskEngine = new FinancialRiskEngine();
