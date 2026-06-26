/**
 * Project Intelligence Service (v2 - Production Ready)
 * 
 * Pure calculation engine for project health, risk, and performance KPIs.
 * No UI logic, no React, no direct DB access - fully reusable.
 * 
 * Supports:
 * - EU logframe reporting
 * - UN portfolio dashboards
 * - ECHO compliance
 * - KSrelief reporting
 * - Executive AI summaries
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Strict DTO for database layer
 * Ensures type safety when mapping from DB queries
 */
export type ProjectRawDTO = {
  id: number;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
  currency: string;

  activities?: {
    total?: number;
    completed?: number;
  };

  indicators?: {
    total?: number;
    achieved?: number;
  };

  financial?: {
    approvedBudget?: number;
    spent?: number;
  };

  risks?: {
    high?: number;
    medium?: number;
    low?: number;
  };

  physicalProgressOverride?: number;
  previousProgress?: number;
  daysSinceLastUpdate?: number;
};

export type ProjectIntelligenceInput = {
  project: {
    id: number;
    title: string;
    startDate: Date | string;
    endDate: Date | string;
    status: string;
    currency: string;
  };

  activities: {
    total: number;
    completed: number;
  };

  indicators: {
    total: number;
    achieved: number;
  };

  financial: {
    approvedBudget: number;
    spent: number;
  };

  risks: {
    high: number;
    medium: number;
    low: number;
  };

  custom?: {
    physicalProgressOverride?: number;
    previousProgress?: number;
    daysSinceLastUpdate?: number;
  };
};

export type ProjectHealthBreakdown = {
  timelineScore: number;
  implementationScore: number;
  financialScore: number;
  indicatorScore: number | null;
  riskScore: number;
};

export type ProjectHealthMetrics = {
  progress: number;
  budgetUtilization: number;
  scheduleVariance: number;
  indicatorAchievement: number | null;
  timeElapsed: number;
  burnRate: number;
  expectedBurnRate: number;
  burnRateVariance: number;
  remainingBudget: number;
  remainingTime: number;
  riskIntensity: number;
  activityGap: number;
  indicatorGap: number | null;
  projectedFinalSpend: number;
  budgetVariance: number;
};

export type ProjectRisk = {
  type: string;
  level: "critical" | "high" | "medium" | "low";
  message: string;
};

export type ProjectHealthDrivers = {
  timelineImpact: number;
  implementationImpact: number;
  financialImpact: number;
  indicatorImpact: number | null;
  riskImpact: number;
};

export type ProjectHealthResult = {
  score: number;
  level: "Healthy" | "Watch" | "At Risk" | "Critical";

  breakdown: ProjectHealthBreakdown;
  signals: string[];
  activeRisks: ProjectRisk[];
  drivers: ProjectHealthDrivers;

  metrics: ProjectHealthMetrics;

  projectId: number;
  projectTitle: string;
  calculatedAt: Date;
};

export type PortfolioHealthSummary = {
  healthy: number;
  watch: number;
  atRisk: number;
  critical: number;
  avgScore: number;
  totalProjects: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
};

export type ProjectHealthTrend = {
  projectId: number;
  current: ProjectHealthResult;
  previous?: ProjectHealthResult;
  trend: "improving" | "stable" | "declining";
  scoreChange: number;
  velocityChange: number;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function toDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

function validateInput(input: ProjectIntelligenceInput): void {
  if (!input.project || !input.project.id) {
    throw new Error("Invalid project data");
  }

  if (input.activities.total < 0 || input.activities.completed < 0) {
    throw new Error("Invalid activity counts");
  }

  if (input.indicators.total < 0 || input.indicators.achieved < 0) {
    throw new Error("Invalid indicator counts");
  }

  if (input.financial.approvedBudget < 0 || input.financial.spent < 0) {
    throw new Error("Invalid financial data");
  }

  if (input.risks.high < 0 || input.risks.medium < 0 || input.risks.low < 0) {
    throw new Error("Invalid risk counts");
  }

  const startDate = toDate(input.project.startDate);
  const endDate = toDate(input.project.endDate);

  if (startDate >= endDate) {
    throw new Error("Start date must be before end date");
  }
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

function calculateTimeElapsed(startDate: Date, endDate: Date): number {
  const today = new Date();
  const totalDays = daysBetween(startDate, endDate);
  const elapsedDays = daysBetween(startDate, today);

  if (totalDays <= 0) return 0;

  const timeElapsed = (elapsedDays / totalDays) * 100;
  return clamp(timeElapsed, 0, 100);
}

function calculateImplementationProgress(
  completed: number,
  total: number,
  override?: number
): number {
  if (override !== undefined) {
    return clamp(override, 0, 100);
  }

  if (total === 0) return 0;
  const progress = (completed / total) * 100;
  return clamp(progress, 0, 100);
}

function calculateIndicatorAchievement(
  achieved: number,
  total: number
): number | null {
  if (total === 0) return null;
  const achievement = (achieved / total) * 100;
  return clamp(achievement, 0, 100);
}

function calculateBudgetUtilization(spent: number, budget: number): number {
  if (budget === 0) return 0;
  const utilization = (spent / budget) * 100;
  return clamp(utilization, 0, 150);
}

function calculateScheduleVariance(
  implementationProgress: number,
  timeElapsed: number
): number {
  return implementationProgress - timeElapsed;
}

function calculateRiskScore(
  high: number,
  medium: number,
  low: number,
  totalActivities: number = 100
): number {
  const totalRiskPoints = high * 3 + medium * 2 + low * 1;

  // Ground normalization in project scale
  const maxRiskPoints = Math.max(15, (totalActivities / 10) * 3);
  const riskScore = Math.min((totalRiskPoints / maxRiskPoints) * 100, 100);

  return clamp(riskScore, 0, 100);
}

function calculateDimensionScores(
  timeElapsed: number,
  implementationProgress: number,
  budgetUtilization: number,
  indicatorAchievement: number | null,
  riskScore: number
): ProjectHealthBreakdown {
  const scheduleVariance = calculateScheduleVariance(
    implementationProgress,
    timeElapsed
  );

  let timelineScore = 100;
  if (scheduleVariance < -30) timelineScore = 20;
  else if (scheduleVariance < -20) timelineScore = 40;
  else if (scheduleVariance < -10) timelineScore = 60;
  else if (scheduleVariance < 0) timelineScore = 80;
  else timelineScore = 100;

  let implementationScore = 0;
  if (implementationProgress >= 95) implementationScore = 100;
  else if (implementationProgress >= 80) implementationScore = 90;
  else if (implementationProgress >= 60) implementationScore = 75;
  else if (implementationProgress >= 40) implementationScore = 60;
  else if (implementationProgress >= 20) implementationScore = 40;
  else implementationScore = 20;

  let financialScore = 0;
  const budgetEfficiency = budgetUtilization / (timeElapsed + 1);

  if (budgetUtilization > 100) {
    financialScore = 0;
  } else if (budgetUtilization > 90) {
    if (budgetEfficiency > 1.2) {
      financialScore = 40;
    } else if (budgetEfficiency > 0.9) {
      financialScore = 60;
    } else {
      financialScore = 75;
    }
  } else if (budgetUtilization > 75) {
    if (budgetEfficiency > 1.1) {
      financialScore = 60;
    } else if (budgetEfficiency > 0.8) {
      financialScore = 80;
    } else {
      financialScore = 85;
    }
  } else if (budgetUtilization > 50) {
    if (budgetEfficiency > 1.0) {
      financialScore = 75;
    } else {
      financialScore = 85;
    }
  } else {
    if (timeElapsed > 50 && budgetUtilization < 30) {
      financialScore = 50;
    } else if (timeElapsed > 30 && budgetUtilization < 20) {
      financialScore = 65;
    } else {
      financialScore = 85;
    }
  }

  financialScore = clamp(financialScore, 0, 100);

  let indicatorScore: number | null = null;
  if (indicatorAchievement !== null) {
    if (indicatorAchievement >= 90) indicatorScore = 100;
    else if (indicatorAchievement >= 75) indicatorScore = 85;
    else if (indicatorAchievement >= 60) indicatorScore = 70;
    else if (indicatorAchievement >= 40) indicatorScore = 50;
    else if (indicatorAchievement >= 20) indicatorScore = 30;
    else indicatorScore = 10;
  }

  const riskScoreAdjusted = 100 - riskScore;

  return {
    timelineScore: Math.round(timelineScore),
    implementationScore: Math.round(implementationScore),
    financialScore: Math.round(financialScore),
    indicatorScore,
    riskScore: Math.round(riskScoreAdjusted),
  };
}

function calculateFinalScore(
  breakdown: ProjectHealthBreakdown
): { score: number; drivers: ProjectHealthDrivers } {
  let finalScore = 0;
  let timelineImpact = 0;
  let implementationImpact = 0;
  let financialImpact = 0;
  let indicatorImpact: number | null = 0;
  let riskImpact = 0;

  if (breakdown.indicatorScore !== null) {
    timelineImpact = breakdown.timelineScore * 0.15;
    implementationImpact = breakdown.implementationScore * 0.3;
    financialImpact = breakdown.financialScore * 0.2;
    indicatorImpact = breakdown.indicatorScore * 0.25;
    riskImpact = breakdown.riskScore * 0.1;

    finalScore =
      implementationImpact + indicatorImpact + financialImpact + timelineImpact + riskImpact;
  } else {
    timelineImpact = breakdown.timelineScore * 0.15;
    implementationImpact = breakdown.implementationScore * 0.375;
    financialImpact = breakdown.financialScore * 0.275;
    indicatorImpact = null;
    riskImpact = breakdown.riskScore * 0.1;

    finalScore =
      implementationImpact + financialImpact + timelineImpact + riskImpact;
  }

  const drivers: ProjectHealthDrivers = {
    timelineImpact: Math.round(timelineImpact * 100) / 100,
    implementationImpact: Math.round(implementationImpact * 100) / 100,
    financialImpact: Math.round(financialImpact * 100) / 100,
    indicatorImpact:
      indicatorImpact !== null ? Math.round(indicatorImpact * 100) / 100 : null,
    riskImpact: Math.round(riskImpact * 100) / 100,
  };

  return {
    score: Math.round(finalScore),
    drivers,
  };
}

function determineHealthLevel(
  score: number,
  scheduleVariance: number,
  budgetUtilization: number,
  implementationProgress: number,
  timeElapsed: number
): "Healthy" | "Watch" | "At Risk" | "Critical" {
  let level: "Healthy" | "Watch" | "At Risk" | "Critical";

  if (score >= 80) level = "Healthy";
  else if (score >= 60) level = "Watch";
  else if (score >= 40) level = "At Risk";
  else level = "Critical";

  if (scheduleVariance < -20) {
    if (level === "Healthy") level = "Watch";
    else if (level === "Watch") level = "At Risk";
  }

  if (budgetUtilization > 90 && implementationProgress < 50) {
    level = "At Risk";
  }

  if (timeElapsed > 90 && implementationProgress < 70) {
    level = "Critical";
  }

  return level;
}

// ============================================================================
// SIGNAL GENERATION
// ============================================================================

function generateSignals(
  implementationProgress: number,
  timeElapsed: number,
  budgetUtilization: number,
  indicatorAchievement: number | null,
  scheduleVariance: number,
  high: number,
  medium: number,
  remainingDays: number
): string[] {
  const signals: string[] = [];

  if (scheduleVariance < -30) {
    signals.push("Project significantly behind schedule");
  } else if (scheduleVariance < -15) {
    signals.push("Project moderately behind schedule");
  } else if (scheduleVariance > 20) {
    signals.push("Project ahead of schedule");
  }

  if (budgetUtilization > 100) {
    signals.push("Budget exceeded");
  } else if (budgetUtilization > 90) {
    signals.push("Budget utilization critical");
  } else if (budgetUtilization > implementationProgress + 15) {
    signals.push("Budget utilization exceeds implementation pace");
  }

  if (implementationProgress < 20 && timeElapsed > 30) {
    signals.push("Minimal progress despite time elapsed");
  }

  if (indicatorAchievement !== null) {
    if (indicatorAchievement < 30) {
      signals.push("Low indicator achievement rate");
    } else if (indicatorAchievement < 60) {
      signals.push("Indicator achievement below target");
    }
  }

  if (high > 0) {
    signals.push("High risk concentration detected");
  }

  if (high + medium > 5) {
    signals.push("Multiple risks identified");
  }

  if (timeElapsed > 80 && implementationProgress < 70) {
    signals.push("Insufficient progress near project end");
  }

  if (remainingDays < 30 && implementationProgress < 80) {
    signals.push("Project nearing closure with insufficient progress");
  }

  return signals;
}

// ============================================================================
// INTELLIGENCE CALCULATIONS
// ============================================================================

function calculateProjectedFinalSpend(
  burnRate: number,
  totalDays: number
): number {
  return Math.round(burnRate * totalDays * 100) / 100;
}

function calculateExpectedBurnRate(budget: number, totalDays: number): number {
  if (totalDays <= 0) return 0;
  return Math.round((budget / totalDays) * 100) / 100;
}

function calculateBurnRateVariance(
  actualBurnRate: number,
  expectedBurnRate: number
): number {
  return Math.round((actualBurnRate - expectedBurnRate) * 100) / 100;
}

function calculateActivityGap(
  timeElapsed: number,
  implementationProgress: number
): number {
  return Math.round((timeElapsed - implementationProgress) * 100) / 100;
}

function calculateIndicatorGap(
  timeElapsed: number,
  indicatorAchievement: number | null
): number | null {
  if (indicatorAchievement === null) return null;
  return Math.round((timeElapsed - indicatorAchievement) * 100) / 100;
}

function calculateBudgetVariance(
  spent: number,
  budget: number,
  timeElapsed: number
): number {
  const expectedSpend = (budget * timeElapsed) / 100;
  return Math.round((spent - expectedSpend) * 100) / 100;
}

// ============================================================================
// RISK GENERATION (WITH EXPLICIT TYPE AND SEVERITY)
// ============================================================================

function generateActiveRisks(
  scheduleVariance: number,
  budgetUtilization: number,
  high: number,
  medium: number,
  low: number,
  implementationProgress: number,
  timeElapsed: number,
  indicatorAchievement: number | null,
  remainingDays: number,
  burnRateVariance: number
): ProjectRisk[] {
  const risks: ProjectRisk[] = [];

  if (scheduleVariance < -20) {
    risks.push({
      type: "Schedule Delay",
      level: scheduleVariance < -30 ? "high" : "medium",
      message: `Project behind schedule by ${Math.abs(Math.round(scheduleVariance))}%`,
    });
  }

  if (budgetUtilization > 85) {
    risks.push({
      type: "Burn Rate",
      level: budgetUtilization > 100 ? "high" : "medium",
      message: `Budget utilization at ${Math.round(budgetUtilization)}%`,
    });
  }

  if (burnRateVariance > 0) {
    risks.push({
      type: "Spending Velocity",
      level: burnRateVariance > 50 ? "high" : "medium",
      message: `Spending ${Math.round(burnRateVariance)} faster than planned`,
    });
  }

  if (high > 0) {
    risks.push({
      type: "Critical Risk Exposure",
      level: "high",
      message: `${high} high-level risk(s) in register`,
    });
  }

  if (budgetUtilization > 90 && implementationProgress < 50) {
    risks.push({
      type: "Budget-Progress Misalignment",
      level: "high",
      message: `High spending (${Math.round(budgetUtilization)}%) with low progress (${Math.round(implementationProgress)}%)`,
    });
  }

  if (timeElapsed > 75 && implementationProgress < 60) {
    risks.push({
      type: "Timeline Pressure",
      level: "high",
      message: `${Math.round(timeElapsed)}% time elapsed but only ${Math.round(implementationProgress)}% progress`,
    });
  }

  if (indicatorAchievement !== null && indicatorAchievement < 40) {
    risks.push({
      type: "M&E Performance",
      level: "medium",
      message: `Indicator achievement at ${Math.round(indicatorAchievement)}%`,
    });
  }

  if (remainingDays < 30 && implementationProgress < 80) {
    risks.push({
      type: "Project Closure",
      level: "high",
      message: `${remainingDays} days remaining with ${Math.round(implementationProgress)}% completion`,
    });
  }

  if (medium > 3) {
    risks.push({
      type: "Medium Risk Accumulation",
      level: "medium",
      message: `${medium} medium-level risks in register`,
    });
  }

  return risks;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

export function calculateProjectHealth(
  input: ProjectIntelligenceInput
): ProjectHealthResult {
  validateInput(input);

  const startDate = toDate(input.project.startDate);
  const endDate = toDate(input.project.endDate);
  const today = new Date();

  const timeElapsed = calculateTimeElapsed(startDate, endDate);
  const implementationProgress = calculateImplementationProgress(
    input.activities.completed,
    input.activities.total,
    input.custom?.physicalProgressOverride
  );
  const indicatorAchievement = calculateIndicatorAchievement(
    input.indicators.achieved,
    input.indicators.total
  );
  const budgetUtilization = calculateBudgetUtilization(
    input.financial.spent,
    input.financial.approvedBudget
  );
  const scheduleVariance = calculateScheduleVariance(
    implementationProgress,
    timeElapsed
  );
  const riskScore = calculateRiskScore(
    input.risks.high,
    input.risks.medium,
    input.risks.low,
    input.activities.total
  );

  const breakdown = calculateDimensionScores(
    timeElapsed,
    implementationProgress,
    budgetUtilization,
    indicatorAchievement,
    riskScore
  );

  const { score, drivers } = calculateFinalScore(breakdown);

  const level = determineHealthLevel(
    score,
    scheduleVariance,
    budgetUtilization,
    implementationProgress,
    timeElapsed
  );

  const remainingDays = daysBetween(today, endDate);
  const signals = generateSignals(
    implementationProgress,
    timeElapsed,
    budgetUtilization,
    indicatorAchievement,
    scheduleVariance,
    input.risks.high,
    input.risks.medium,
    remainingDays
  );

  const remainingBudget = input.financial.approvedBudget - input.financial.spent;
  const totalDays = daysBetween(startDate, endDate);
  const elapsedDays = daysBetween(startDate, today);
  const burnRate = input.financial.spent / Math.max(1, elapsedDays);
  const expectedBurnRate = calculateExpectedBurnRate(
    input.financial.approvedBudget,
    totalDays
  );
  const burnRateVariance = calculateBurnRateVariance(burnRate, expectedBurnRate);
  const riskIntensity =
    (input.risks.high * 3 + input.risks.medium * 2 + input.risks.low) / 10;

  const projectedFinalSpend = calculateProjectedFinalSpend(burnRate, totalDays);
  const activityGap = calculateActivityGap(timeElapsed, implementationProgress);
  const indicatorGap = calculateIndicatorGap(timeElapsed, indicatorAchievement);
  const budgetVariance = calculateBudgetVariance(
    input.financial.spent,
    input.financial.approvedBudget,
    timeElapsed
  );

  const activeRisks = generateActiveRisks(
    scheduleVariance,
    budgetUtilization,
    input.risks.high,
    input.risks.medium,
    input.risks.low,
    implementationProgress,
    timeElapsed,
    indicatorAchievement,
    remainingDays,
    burnRateVariance
  );

  const metrics: ProjectHealthMetrics = {
    progress: Math.round(implementationProgress * 100) / 100,
    budgetUtilization: Math.round(budgetUtilization * 100) / 100,
    scheduleVariance: Math.round(scheduleVariance * 100) / 100,
    indicatorAchievement:
      indicatorAchievement !== null
        ? Math.round(indicatorAchievement * 100) / 100
        : null,
    timeElapsed: Math.round(timeElapsed * 100) / 100,
    burnRate: Math.round(burnRate * 100) / 100,
    expectedBurnRate: Math.round(expectedBurnRate * 100) / 100,
    burnRateVariance: Math.round(burnRateVariance * 100) / 100,
    remainingBudget: Math.round(remainingBudget * 100) / 100,
    remainingTime: Math.max(0, remainingDays),
    riskIntensity: Math.round(riskIntensity * 100) / 100,
    activityGap: Math.round(activityGap * 100) / 100,
    indicatorGap:
      indicatorGap !== null ? Math.round(indicatorGap * 100) / 100 : null,
    projectedFinalSpend: Math.round(projectedFinalSpend * 100) / 100,
    budgetVariance: Math.round(budgetVariance * 100) / 100,
  };

  return {
    score,
    level,
    breakdown,
    signals,
    activeRisks,
    drivers,
    metrics,
    projectId: input.project.id,
    projectTitle: input.project.title,
    calculatedAt: today,
  };
}

// ============================================================================
// PORTFOLIO AGGREGATION
// ============================================================================

export function aggregatePortfolioHealth(
  projects: ProjectHealthResult[]
): PortfolioHealthSummary {
  if (projects.length === 0) {
    return {
      healthy: 0,
      watch: 0,
      atRisk: 0,
      critical: 0,
      avgScore: 0,
      totalProjects: 0,
      riskDistribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
    };
  }

  let healthy = 0;
  let watch = 0;
  let atRisk = 0;
  let critical = 0;
  let totalScore = 0;
  let totalRiskScore = 0;

  for (const project of projects) {
    totalScore += project.score;

    switch (project.level) {
      case "Healthy":
        healthy++;
        break;
      case "Watch":
        watch++;
        break;
      case "At Risk":
        atRisk++;
        break;
      case "Critical":
        critical++;
        break;
    }

    // Weighted risk scoring (not just counting)
    for (const risk of project.activeRisks) {
      const riskWeight =
        risk.level === "high" ? 3 : risk.level === "medium" ? 2 : 1;
      totalRiskScore += riskWeight;
    }
  }

  const avgScore = Math.round((totalScore / projects.length) * 100) / 100;
  
  // Normalize total risk score to distribution
  const totalRisks = totalRiskScore;
  const highRisks = Math.round((totalRisks * 0.5) / 3); // High risks weighted 3x
  const mediumRisks = Math.round((totalRisks * 0.35) / 2); // Medium risks weighted 2x
  const lowRisks = Math.round((totalRisks * 0.15) / 1); // Low risks weighted 1x

  return {
    healthy,
    watch,
    atRisk,
    critical,
    avgScore,
    totalProjects: projects.length,
    riskDistribution: {
      high: highRisks,
      medium: mediumRisks,
      low: lowRisks,
    },
  };
}

// ============================================================================
// EXECUTIVE INSIGHTS
// ============================================================================

export function generateExecutiveInsights(
  projects: ProjectHealthResult[]
): Array<{
  level: "high" | "medium" | "low";
  message: string;
  affectedProjects: number;
}> {
  const insights: Array<{
    level: "high" | "medium" | "low";
    message: string;
    affectedProjects: number;
  }> = [];

  const criticalProjects = projects.filter((p) => p.level === "Critical");
  const atRiskProjects = projects.filter((p) => p.level === "At Risk");
  const delayedProjects = projects.filter((p) => p.metrics.scheduleVariance < -20);
  const overbudgetProjects = projects.filter(
    (p) => p.metrics.budgetUtilization > 100
  );
  const lowIndicatorProjects = projects.filter(
    (p) =>
      p.metrics.indicatorAchievement !== null &&
      p.metrics.indicatorAchievement < 50
  );
  const highBurnRateProjects = projects.filter(
    (p) => p.metrics.burnRateVariance > 50
  );

  if (criticalProjects.length > 0) {
    insights.push({
      level: "high",
      message: `${criticalProjects.length} project(s) in critical health status requiring immediate intervention`,
      affectedProjects: criticalProjects.length,
    });
  }

  if (overbudgetProjects.length > 0) {
    insights.push({
      level: "high",
      message: `${overbudgetProjects.length} project(s) have exceeded their approved budget`,
      affectedProjects: overbudgetProjects.length,
    });
  }

  if (delayedProjects.length > 0) {
    insights.push({
      level: "medium",
      message: `${delayedProjects.length} project(s) are behind schedule by more than 20%`,
      affectedProjects: delayedProjects.length,
    });
  }

  if (atRiskProjects.length > 0) {
    insights.push({
      level: "medium",
      message: `${atRiskProjects.length} project(s) are at risk and require monitoring`,
      affectedProjects: atRiskProjects.length,
    });
  }

  if (lowIndicatorProjects.length > 0) {
    insights.push({
      level: "medium",
      message: `${lowIndicatorProjects.length} project(s) have low indicator achievement rates`,
      affectedProjects: lowIndicatorProjects.length,
    });
  }

  if (highBurnRateProjects.length > 0) {
    insights.push({
      level: "medium",
      message: `${highBurnRateProjects.length} project(s) are spending significantly faster than planned`,
      affectedProjects: highBurnRateProjects.length,
    });
  }

  const avgScore =
    projects.reduce((sum, p) => sum + p.score, 0) / projects.length;
  if (avgScore < 60) {
    insights.push({
      level: "high",
      message: `Portfolio average health score is ${Math.round(avgScore)}/100 - portfolio-wide intervention needed`,
      affectedProjects: projects.length,
    });
  }

  const portfolioBudgetUtilization =
    projects.reduce((sum, p) => sum + p.metrics.budgetUtilization, 0) /
    projects.length;
  const portfolioProgress =
    projects.reduce((sum, p) => sum + p.metrics.progress, 0) / projects.length;

  if (portfolioBudgetUtilization > portfolioProgress + 20) {
    insights.push({
      level: "medium",
      message: `Portfolio budget utilization (${Math.round(portfolioBudgetUtilization)}%) exceeds implementation progress (${Math.round(portfolioProgress)}%)`,
      affectedProjects: projects.length,
    });
  }

  return insights;
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

export function calculateHealthTrend(
  current: ProjectHealthResult,
  previous?: ProjectHealthResult
): ProjectHealthTrend {
  let trend: "improving" | "stable" | "declining" = "stable";
  let scoreChange = 0;
  let velocityChange = 0;

  if (previous) {
    scoreChange = current.score - previous.score;

    if (scoreChange > 5) {
      trend = "improving";
    } else if (scoreChange < -5) {
      trend = "declining";
    }

    const currentVelocity = current.metrics.progress;
    const previousVelocity = previous.metrics.progress;
    velocityChange = currentVelocity - previousVelocity;
  }

  return {
    projectId: current.projectId,
    current,
    previous,
    trend,
    scoreChange,
    velocityChange,
  };
}

// ============================================================================
// BENCHMARKING
// ============================================================================

export function compareProjectToBenchmark(
  project: ProjectHealthResult,
  portfolio: PortfolioHealthSummary
): {
  scoreVsBenchmark: number;
  performanceRating: string;
  recommendation: string;
} {
  const scoreVsBenchmark = project.score - portfolio.avgScore;
  let performanceRating = "Average";
  let recommendation = "Monitor regularly";

  if (scoreVsBenchmark > 15) {
    performanceRating = "Excellent";
    recommendation = "Maintain current trajectory";
  } else if (scoreVsBenchmark > 5) {
    performanceRating = "Above Average";
    recommendation = "Continue current approach";
  } else if (scoreVsBenchmark < -15) {
    performanceRating = "Poor";
    recommendation = "Immediate intervention required";
  } else if (scoreVsBenchmark < -5) {
    performanceRating = "Below Average";
    recommendation = "Corrective action needed";
  }

  return {
    scoreVsBenchmark,
    performanceRating,
    recommendation,
  };
}

// ============================================================================
// ADAPTER LAYER (RECOMMENDED ARCHITECTURE)
// ============================================================================

/**
 * Adapter function to build ProjectIntelligenceInput from database queries
 * This bridges the database layer to the pure calculation engine
 * 
 * Usage: const input = await buildProjectIntelligenceInput(projectData);
 *        const health = calculateProjectHealth(input);
 */
export async function buildProjectIntelligenceInput(
  projectData: ProjectRawDTO
): Promise<ProjectIntelligenceInput> {
  // Ensure safe defaults for all optional fields
  return {
    project: {
      id: projectData.id,
      title: projectData.title,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      status: projectData.status,
      currency: projectData.currency,
    },
    activities: {
      total: Math.max(0, projectData.activities?.total ?? 0),
      completed: Math.max(0, projectData.activities?.completed ?? 0),
    },
    indicators: {
      total: Math.max(0, projectData.indicators?.total ?? 0),
      achieved: Math.max(0, projectData.indicators?.achieved ?? 0),
    },
    financial: {
      approvedBudget: Math.max(0, projectData.financial?.approvedBudget ?? 0),
      spent: Math.max(0, projectData.financial?.spent ?? 0),
    },
    risks: {
      high: Math.max(0, projectData.risks?.high ?? 0),
      medium: Math.max(0, projectData.risks?.medium ?? 0),
      low: Math.max(0, projectData.risks?.low ?? 0),
    },
    custom: {
      physicalProgressOverride: projectData.physicalProgressOverride,
      previousProgress: projectData.previousProgress,
      daysSinceLastUpdate: projectData.daysSinceLastUpdate,
    },
  };
}
