/**
 * Project Health Types and Interfaces
 * 
 * Shared type definitions for the Project Health Engine
 * Used across server and client for type safety
 */

// ============================================================================
// HEALTH LEVEL TYPES
// ============================================================================

export type HealthLevel = "healthy" | "watch" | "at-risk" | "critical";

export type VelocityTrend = "accelerating" | "stable" | "decelerating";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

// ============================================================================
// RISK SIGNAL INTERFACE
// ============================================================================

export interface RiskSignal {
  type: string;
  severity: RiskSeverity;
  impact: number;
  description: string;
}

// ============================================================================
// HEALTH METRICS INTERFACE
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
  velocityTrend: VelocityTrend;

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
  healthLevel: HealthLevel;
  signals: string[];
}

// ============================================================================
// HEALTH INPUT INTERFACE
// ============================================================================

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
// HEALTH HISTORY INTERFACE
// ============================================================================

export interface ProjectHealthHistory {
  id: number;
  projectId: number;
  organizationId: number;
  operatingUnitId: number;
  
  // Snapshot of health metrics at time of recording
  overallScore: number;
  healthLevel: HealthLevel;
  
  // Dimension scores
  timelineScore: number;
  progressScore: number;
  financialScore: number;
  deliveryScore: number;
  riskScore: number;
  
  // Key metrics
  physicalProgress: number;
  budgetUtilization: number;
  scheduleVariance: number;
  
  // Signals at time of recording
  signals: string[];
  activeRisks: RiskSignal[];
  
  // Metadata
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// HEALTH TREND INTERFACE
// ============================================================================

export interface ProjectHealthTrend {
  projectId: number;
  
  // Trend direction
  direction: "improving" | "stable" | "declining";
  
  // Score change
  scoreChange: number; // Difference from previous recording
  scoreChangePercent: number;
  
  // Period
  periodDays: number;
  fromDate: Date;
  toDate: Date;
  
  // Historical scores
  previousScore: number;
  currentScore: number;
  
  // Dimension trends
  dimensionTrends: {
    timeline: "improving" | "stable" | "declining";
    progress: "improving" | "stable" | "declining";
    financial: "improving" | "stable" | "declining";
    delivery: "improving" | "stable" | "declining";
    risk: "improving" | "stable" | "declining";
  };
}

// ============================================================================
// HEALTH SUMMARY INTERFACE
// ============================================================================

export interface ProjectHealthSummary {
  projectId: number;
  projectName: string;
  
  // Current health
  currentHealth: ProjectHealthMetrics;
  
  // Trend
  trend: ProjectHealthTrend;
  
  // Key metrics for dashboard
  keyMetrics: {
    physicalProgress: number;
    budgetUtilization: number;
    scheduleVariance: number;
    riskCount: number;
    milestoneAchievementRate: number;
  };
  
  // Recommended actions
  recommendedActions: string[];
  
  // Last updated
  lastUpdated: Date;
}

// ============================================================================
// PORTFOLIO HEALTH INTERFACE
// ============================================================================

export interface PortfolioHealth {
  organizationId: number;
  operatingUnitId: number;
  
  // Portfolio-level aggregates
  totalProjects: number;
  healthyProjects: number;
  watchProjects: number;
  atRiskProjects: number;
  criticalProjects: number;
  
  // Portfolio-level metrics
  averageHealth: number;
  averageBudgetUtilization: number;
  averagePhysicalProgress: number;
  
  // Risk summary
  totalActiveRisks: number;
  criticalRisks: number;
  
  // Trend
  portfolioTrend: "improving" | "stable" | "declining";
  
  // Projects by health level
  projectsByHealth: {
    healthy: ProjectHealthSummary[];
    watch: ProjectHealthSummary[];
    atRisk: ProjectHealthSummary[];
    critical: ProjectHealthSummary[];
  };
}

// ============================================================================
// HEALTH ALERT INTERFACE
// ============================================================================

export interface ProjectHealthAlert {
  id: number;
  projectId: number;
  organizationId: number;
  operatingUnitId: number;
  
  // Alert details
  alertType: "health_degradation" | "risk_threshold" | "milestone_delay" | "budget_overrun";
  severity: RiskSeverity;
  message: string;
  
  // Context
  previousHealthLevel: HealthLevel;
  currentHealthLevel: HealthLevel;
  
  // Status
  isResolved: boolean;
  resolvedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// HEALTH COMPARISON INTERFACE
// ============================================================================

export interface ProjectHealthComparison {
  projectId: number;
  projectName: string;
  
  // Current health
  currentHealth: ProjectHealthMetrics;
  
  // Comparison metrics
  comparison: {
    vs_organization_average: {
      score: number;
      difference: number;
    };
    vs_similar_projects: {
      score: number;
      difference: number;
      percentile: number; // 0-100, where 100 is best
    };
  };
  
  // Benchmark
  benchmark: {
    category: string;
    averageScore: number;
    medianScore: number;
    topScore: number;
  };
}
