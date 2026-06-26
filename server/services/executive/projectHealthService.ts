import { TRPCError } from "@trpc/server";

/**
 * Comprehensive Project Health Engine
 * 
 * Derives project health from 5 dimensions:
 * 1. Timeline Performance (25%) - Schedule variance
 * 2. Physical Progress (20%) - Work completion and momentum
 * 3. Financial Health (25%) - Budget utilization and burn rate
 * 4. Delivery Indicators (15%) - Milestones and M&E performance
 * 5. Risk Signals (15%) - Aggregated risk factors
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProjectHealthMetrics {
  // Timeline metrics
  timelineScore: number;
  timeProgress: number;
  physicalProgress: number;
  scheduleVariance: number;

  // Progress metrics
  progressScore: number;
  progressVelocity: number;
  velocityTrend: "accelerating" | "stable" | "decelerating";

  // Financial metrics
  financialScore: number;
  budgetUtilization: number;
  burnRate: number;
  remainingBudgetRatio: number;
  budgetEfficiency: number;

  // Delivery metrics
  deliveryScore: number;
  milestoneAchievementRate: number;
  onTimeDeliveryRate: number;
  indicatorAchievementRate: number;

  // Risk metrics
  riskScore: number;
  activeRisks: RiskSignal[];
  riskCount: number;

  // Overall health
  overallScore: number;
  healthLevel: "healthy" | "watch" | "at-risk" | "critical";
  signals: string[];
}

export interface RiskSignal {
  type: string;
  level: "low" | "medium" | "high" | "critical";
  impact: number;
  description: string;
}

export interface ProjectHealthInput {
  // Timeline data
  startDate: Date;
  endDate: Date;
  physicalProgressPercentage: number;

  // Financial data
  totalBudget: number;
  spent: number;
  monthsElapsed: number;

  // Milestone data
  totalMilestones: number;
  completedMilestones: number;
  onTimeMilestones: number;

  // Indicator data
  totalIndicators: number;
  achievedIndicators: number;

  // Historical data (for velocity calculation)
  previousProgress?: number;
  daysSinceLastUpdate?: number;

  // Risk factors
  hasResourceShortage?: boolean;
  hasExternalDependency?: boolean;
  overdueReports?: number;
}

// ============================================================================
// DIMENSION 1: TIMELINE PERFORMANCE (Weight: 25%)
// ============================================================================

function calculateTimelineMetrics(
  startDate: Date,
  endDate: Date,
  physicalProgress: number
): {
  timelineScore: number;
  timeProgress: number;
  scheduleVariance: number;
  signals: string[];
} {
  const now = new Date();
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();

  // Clamp time progress to [0, 100]
  const timeProgress = Math.min(
    Math.max((elapsed / totalDuration) * 100, 0),
    100
  );

  // Calculate schedule variance (positive = ahead, negative = behind)
  const scheduleVariance = physicalProgress - timeProgress;

  let timelineScore = 100;
  const signals: string[] = [];

  // Scoring based on schedule variance
  if (scheduleVariance >= 0) {
    timelineScore = 100; // On or ahead of schedule
    if (scheduleVariance > 10) {
      signals.push("Ahead of schedule");
    }
  } else if (scheduleVariance > -15) {
    timelineScore = 80; // Slightly behind but acceptable
    signals.push("Slightly behind schedule");
  } else if (scheduleVariance > -30) {
    timelineScore = 50; // Moderately behind
    signals.push("Behind schedule");
  } else {
    timelineScore = 20; // Severely behind
    signals.push("Severely delayed execution");
  }

  return {
    timelineScore,
    timeProgress,
    scheduleVariance,
    signals,
  };
}

// ============================================================================
// DIMENSION 2: PHYSICAL PROGRESS (Weight: 20%)
// ============================================================================

function calculateProgressMetrics(
  physicalProgress: number,
  previousProgress?: number,
  daysSinceLastUpdate?: number
): {
  progressScore: number;
  progressVelocity: number;
  velocityTrend: "accelerating" | "stable" | "decelerating";
  signals: string[];
} {
  let progressScore = 100;
  const signals: string[] = [];

  // Score based on completion level
  if (physicalProgress >= 90) {
    progressScore = 100; // Near completion
    signals.push("Near completion");
  } else if (physicalProgress >= 70) {
    progressScore = 90; // Strong progress
    signals.push("Strong progress");
  } else if (physicalProgress >= 50) {
    progressScore = 75; // Moderate progress
  } else if (physicalProgress >= 30) {
    progressScore = 60; // Early stage
  } else {
    progressScore = 40; // Minimal progress
    signals.push("Minimal progress");
  }

  // Calculate velocity and trend
  let progressVelocity = 0;
  let velocityTrend: "accelerating" | "stable" | "decelerating" = "stable";

  if (
    previousProgress !== undefined &&
    daysSinceLastUpdate !== undefined &&
    daysSinceLastUpdate > 0
  ) {
    progressVelocity = (physicalProgress - previousProgress) / daysSinceLastUpdate;

    // Determine trend (simplified: compare to expected velocity)
    const expectedVelocity = (100 - previousProgress) / 30; // Assume 30 days to completion

    if (progressVelocity > expectedVelocity * 1.1) {
      velocityTrend = "accelerating";
      signals.push("Accelerating momentum");
    } else if (progressVelocity < expectedVelocity * 0.9) {
      velocityTrend = "decelerating";
      signals.push("Declining momentum");
      if (physicalProgress < 70) {
        progressScore -= 15; // Momentum loss penalty
      }
    }

    // Detect stalled progress
    if (progressVelocity === 0 && daysSinceLastUpdate > 30) {
      progressScore -= 25;
      signals.push("Stalled progress");
    }
  }

  return {
    progressScore,
    progressVelocity,
    velocityTrend,
    signals,
  };
}

// ============================================================================
// DIMENSION 3: FINANCIAL HEALTH (Weight: 25%)
// ============================================================================

function calculateFinancialMetrics(
  totalBudget: number,
  spent: number,
  monthsElapsed: number,
  physicalProgress: number,
  timeProgress: number
): {
  financialScore: number;
  budgetUtilization: number;
  burnRate: number;
  remainingBudgetRatio: number;
  budgetEfficiency: number;
  signals: string[];
} {
  const signals: string[] = [];

  // Calculate budget utilization
  const budgetUtilization =
    totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

  // Calculate burn rate (average monthly spending)
  const burnRate = monthsElapsed > 0 ? spent / monthsElapsed : 0;

  // Calculate remaining budget ratio
  const remainingBudget = totalBudget - spent;
  const remainingWork = 100 - physicalProgress;
  const remainingBudgetRatio =
    remainingWork > 0 ? remainingBudget / (totalBudget * (remainingWork / 100)) : 1;

  // Calculate budget efficiency (should be close to 1.0)
  const budgetEfficiency =
    physicalProgress > 0 ? budgetUtilization / physicalProgress : 0;

  let financialScore = 100;

  // Scoring logic
  if (budgetUtilization <= 70 && physicalProgress >= timeProgress) {
    financialScore = 100; // Healthy spending
    signals.push("Healthy budget utilization");
  } else if (
    budgetUtilization <= 85 &&
    physicalProgress >= timeProgress - 10
  ) {
    financialScore = 85; // Acceptable spending
  } else if (budgetUtilization > 85 && physicalProgress < 60) {
    financialScore = 40; // High burn rate, low progress
    signals.push("High burn rate vs progress");
  }

  // Check for insufficient remaining budget
  if (remainingBudgetRatio < 0.8) {
    financialScore -= 20;
    signals.push("Insufficient remaining budget");
  }

  // Check for over budget
  if (spent > totalBudget) {
    financialScore = 0;
    signals.push("Over budget");
  }

  // Check for budget-progress misalignment
  if (budgetEfficiency > 1.2) {
    financialScore -= 10;
    signals.push("Budget-progress misalignment");
  }

  // Check for high burn rate
  if (budgetUtilization > 85) {
    signals.push("High burn rate");
  }

  financialScore = Math.max(0, Math.min(100, financialScore));

  return {
    financialScore,
    budgetUtilization,
    burnRate,
    remainingBudgetRatio,
    budgetEfficiency,
    signals,
  };
}

// ============================================================================
// DIMENSION 4: DELIVERY INDICATORS (Weight: 15%)
// ============================================================================

function calculateDeliveryMetrics(
  totalMilestones: number,
  completedMilestones: number,
  onTimeMilestones: number,
  totalIndicators: number,
  achievedIndicators: number
): {
  deliveryScore: number;
  milestoneAchievementRate: number;
  onTimeDeliveryRate: number;
  indicatorAchievementRate: number;
  signals: string[];
} {
  const signals: string[] = [];

  // Calculate rates
  const milestoneAchievementRate =
    totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const onTimeDeliveryRate =
    completedMilestones > 0 ? (onTimeMilestones / completedMilestones) * 100 : 0;

  const indicatorAchievementRate =
    totalIndicators > 0 ? (achievedIndicators / totalIndicators) * 100 : 0;

  let deliveryScore = 100;

  // Scoring logic
  if (
    milestoneAchievementRate >= 90 &&
    onTimeDeliveryRate >= 80
  ) {
    deliveryScore = 100; // Excellent delivery
    signals.push("Excellent milestone delivery");
  } else if (
    milestoneAchievementRate >= 70 &&
    onTimeDeliveryRate >= 60
  ) {
    deliveryScore = 80; // Good delivery
    signals.push("Good milestone delivery");
  } else if (milestoneAchievementRate >= 50) {
    deliveryScore = 60; // Moderate delivery
  } else if (milestoneAchievementRate > 0) {
    deliveryScore = 30; // Poor delivery
    signals.push("Poor milestone delivery");
  }

  // Check for delayed milestones
  if (onTimeDeliveryRate < 70 && completedMilestones > 0) {
    deliveryScore -= 15;
    signals.push("Milestones delayed");
  }

  // Check for M&E underperformance
  if (indicatorAchievementRate < 50) {
    deliveryScore -= 15;
    signals.push("Indicators underperforming");
  } else if (indicatorAchievementRate > 80) {
    signals.push("Strong M&E performance");
  }

  deliveryScore = Math.max(0, Math.min(100, deliveryScore));

  return {
    deliveryScore,
    milestoneAchievementRate,
    onTimeDeliveryRate,
    indicatorAchievementRate,
    signals,
  };
}

// ============================================================================
// DIMENSION 5: RISK SIGNALS (Weight: 15%)
// ============================================================================

function calculateRiskMetrics(
  scheduleVariance: number,
  spent: number,
  totalBudget: number,
  progressVelocity: number,
  budgetUtilization: number,
  physicalProgress: number,
  onTimeDeliveryRate: number,
  hasResourceShortage?: boolean,
  hasExternalDependency?: boolean,
  overdueReports?: number
): {
  riskScore: number;
  activeRisks: RiskSignal[];
  signals: string[];
} {
  const activeRisks: RiskSignal[] = [];
  const signals: string[] = [];
  let riskScore = 100;

  // Risk 1: Schedule Delay
  if (scheduleVariance < -15) {
    activeRisks.push({
      type: "Schedule Delay",
      level: "high",
      impact: 20,
      description: `Project is ${Math.abs(scheduleVariance).toFixed(1)}% behind schedule`,
    });
  }

  // Risk 2: Budget Overrun
  if (spent > totalBudget) {
    activeRisks.push({
      type: "Budget Overrun",
      level: "critical",
      impact: 30,
      description: `Project is over budget by ${((spent - totalBudget) / totalBudget * 100).toFixed(1)}%`,
    });
  }

  // Risk 3: Stalled Progress
  if (progressVelocity === 0) {
    activeRisks.push({
      type: "Stalled Progress",
      level: "high",
      impact: 25,
      description: "No progress recorded in recent period",
    });
  }

  // Risk 4: High Burn Rate
  if (budgetUtilization > 90 && physicalProgress < 50) {
    activeRisks.push({
      type: "High Burn Rate",
      level: "high",
      impact: 20,
      description: `${budgetUtilization.toFixed(1)}% budget spent with only ${physicalProgress.toFixed(1)}% progress`,
    });
  }

  // Risk 5: Milestone Delay
  if (onTimeDeliveryRate < 60) {
    activeRisks.push({
      type: "Milestone Delay",
      level: "medium",
      impact: 15,
      description: `Only ${onTimeDeliveryRate.toFixed(1)}% of milestones delivered on time`,
    });
  }

  // Risk 6: Resource Shortage
  if (hasResourceShortage) {
    activeRisks.push({
      type: "Resource Shortage",
      level: "medium",
      impact: 10,
      description: "Insufficient resources allocated to project",
    });
  }

  // Risk 7: External Dependency
  if (hasExternalDependency) {
    activeRisks.push({
      type: "External Dependency",
      level: "medium",
      impact: 10,
      description: "Project blocked on external factors",
    });
  }

  // Risk 8: Compliance Risk
  if ((overdueReports ?? 0) > 2) {
    activeRisks.push({
      type: "Compliance Risk",
      level: "medium",
      impact: 15,
      description: `${overdueReports} overdue reports`,
    });
  }

  // Aggregate risk scores
  for (const risk of activeRisks) {
    riskScore -= risk.impact;
    signals.push(risk.description);
  }

  // Multiple risk penalty
  if (activeRisks.length >= 3) {
    riskScore -= 10;
    signals.push("Multiple concurrent risks detected");
  }

  riskScore = Math.max(0, riskScore);

  return {
    riskScore,
    activeRisks,
    signals,
  };
}

// ============================================================================
// MAIN HEALTH CALCULATION
// ============================================================================

export function calculateProjectHealth(
  input: ProjectHealthInput
): ProjectHealthMetrics {
  // Validate inputs
  if (!input.startDate || !input.endDate) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Start date and end date are required",
    });
  }

  if (input.totalBudget < 0 || input.spent < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Budget and spent values must be non-negative",
    });
  }

  // Clamp physical progress to [0, 100]
  const physicalProgress = Math.min(
    Math.max(input.physicalProgressPercentage, 0),
    100
  );

  // Calculate each dimension
  const timeline = calculateTimelineMetrics(
    input.startDate,
    input.endDate,
    physicalProgress
  );

  const progress = calculateProgressMetrics(
    physicalProgress,
    input.previousProgress,
    input.daysSinceLastUpdate
  );

  const financial = calculateFinancialMetrics(
    input.totalBudget,
    input.spent,
    input.monthsElapsed,
    physicalProgress,
    timeline.timeProgress
  );

  const delivery = calculateDeliveryMetrics(
    input.totalMilestones,
    input.completedMilestones,
    input.onTimeMilestones,
    input.totalIndicators,
    input.achievedIndicators
  );

  const risk = calculateRiskMetrics(
    timeline.scheduleVariance,
    input.spent,
    input.totalBudget,
    progress.progressVelocity,
    financial.budgetUtilization,
    physicalProgress,
    delivery.onTimeDeliveryRate,
    input.hasResourceShortage,
    input.hasExternalDependency,
    input.overdueReports
  );

  // Calculate overall score using weighted average
  const overallScore =
    timeline.timelineScore * 0.25 +
    progress.progressScore * 0.2 +
    financial.financialScore * 0.25 +
    delivery.deliveryScore * 0.15 +
    risk.riskScore * 0.15;

  // Determine health level
  let healthLevel: "healthy" | "watch" | "at-risk" | "critical";
  if (overallScore >= 80) {
    healthLevel = "healthy";
  } else if (overallScore >= 60) {
    healthLevel = "watch";
  } else if (overallScore >= 40) {
    healthLevel = "at-risk";
  } else {
    healthLevel = "critical";
  }

  // Aggregate all signals
  const allSignals = [
    ...timeline.signals,
    ...progress.signals,
    ...financial.signals,
    ...delivery.signals,
    ...risk.signals,
  ];

  return {
    // Timeline metrics
    timelineScore: timeline.timelineScore,
    timeProgress: timeline.timeProgress,
    physicalProgress,
    scheduleVariance: timeline.scheduleVariance,

    // Progress metrics
    progressScore: progress.progressScore,
    progressVelocity: progress.progressVelocity,
    velocityTrend: progress.velocityTrend,

    // Financial metrics
    financialScore: financial.financialScore,
    budgetUtilization: financial.budgetUtilization,
    burnRate: financial.burnRate,
    remainingBudgetRatio: financial.remainingBudgetRatio,
    budgetEfficiency: financial.budgetEfficiency,

    // Delivery metrics
    deliveryScore: delivery.deliveryScore,
    milestoneAchievementRate: delivery.milestoneAchievementRate,
    onTimeDeliveryRate: delivery.onTimeDeliveryRate,
    indicatorAchievementRate: delivery.indicatorAchievementRate,

    // Risk metrics
    riskScore: risk.riskScore,
    activeRisks: risk.activeRisks,
    riskCount: risk.activeRisks.length,

    // Overall health
    overallScore: Math.round(overallScore),
    healthLevel,
    signals: [...new Set(allSignals)], // Remove duplicates
  };
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy function for backward compatibility
 * Converts old project object to new input format
 */
export function calculateProjectHealthLegacy(project: any) {
  const input: ProjectHealthInput = {
    startDate: new Date(project.startDate),
    endDate: new Date(project.endDate),
    physicalProgressPercentage: Number(project.physicalProgressPercentage || 0),
    totalBudget: Number(project.totalBudget || 0),
    spent: Number(project.spent || 0),
    monthsElapsed: calculateMonthsElapsed(
      new Date(project.startDate),
      new Date()
    ),
    totalMilestones: project.totalMilestones || 0,
    completedMilestones: project.completedMilestones || 0,
    onTimeMilestones: project.onTimeMilestones || 0,
    totalIndicators: project.totalIndicators || 0,
    achievedIndicators: project.achievedIndicators || 0,
  };

  return calculateProjectHealth(input);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateMonthsElapsed(startDate: Date, endDate: Date): number {
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  return Math.max(1, months); // Minimum 1 month
}
