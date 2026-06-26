/**
 * AI Project Intelligence Router
 * 
 * Converts numeric project health metrics into executive-grade insights,
 * AI labels, risk narratives, and actionable recommendations.
 * 
 * Pure function-based service with no database calls or UI logic.
 * Designed for:
 * - Executive Dashboard AI Insights panel
 * - Donor reporting summaries
 * - Portfolio risk analysis
 * - Automated executive briefing generation
 */

import { ProjectHealthResult } from "./projectIntelligenceService";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AIProjectInsight = {
  projectId: number;
  projectTitle: string;

  aiLabel: "Performing" | "Needs Attention" | "Critical Intervention" | "Stable";

  executiveSummary: string;
  executiveHeadline: string;
  keyInsights: string[];
  riskNarrative: string;
  recommendedActions: string[];
  urgencyLevel: "low" | "medium" | "high" | "critical";
  confidenceScore: number;

  generatedAt: Date;
};

export type AIPortfolioInsights = {
  totalProjects: number;
  performingCount: number;
  stableCount: number;
  needsAttentionCount: number;
  criticalCount: number;
  portfolioRiskIndex: {
    high: number;
    medium: number;
    low: number;
  };

  portfolioNarrative: string;
  portfolioRecommendations: string[];
  portfolioRiskSummary: string;
  averageConfidenceScore: number;

  projectInsights: AIProjectInsight[];
};

// ============================================================================
// MAIN AI ROUTER
// ============================================================================

/**
 * Generate AI insights for a single project
 * Converts ProjectHealthResult into executive-grade intelligence
 */
export function generateAIProjectInsight(
  project: ProjectHealthResult
): AIProjectInsight {
  const { score, level, signals, metrics, activeRisks, breakdown, drivers } =
    project;

  // =========================
  // 1. AI LABEL LOGIC
  // =========================
  let aiLabel: AIProjectInsight["aiLabel"];

  if (score >= 80) {
    aiLabel = "Performing";
  } else if (score >= 60) {
    aiLabel = "Stable";
  } else if (score >= 40) {
    aiLabel = "Needs Attention";
  } else {
    aiLabel = "Critical Intervention";
  }

  // Override based on health level
  if (level === "Critical") {
    aiLabel = "Critical Intervention";
  } else if (level === "At Risk" && aiLabel !== "Critical Intervention") {
    aiLabel = "Needs Attention";
  }

  // =========================
  // 2. URGENCY LEVEL
  // =========================
  let urgencyLevel: AIProjectInsight["urgencyLevel"];

  if (level === "Critical") {
    urgencyLevel = "critical";
  } else if (level === "At Risk") {
    urgencyLevel = "high";
  } else if (level === "Watch") {
    urgencyLevel = "medium";
  } else {
    urgencyLevel = "low";
  }

  // =========================
  // 3. EXECUTIVE SUMMARY
  // =========================
  const executiveSummary = buildExecutiveSummary(project);

  // =========================
  // 4. KEY INSIGHTS
  // =========================
  const keyInsights = buildKeyInsights(project);

  // =========================
  // 5. RISK NARRATIVE
  // =========================
  const riskNarrative = buildRiskNarrative(project);

  // =========================
  // 6. RECOMMENDED ACTIONS
  // =========================
  const recommendedActions = generateRecommendations(project);

  const executiveHeadline =
  aiLabel === "Critical Intervention"
    ? "Immediate Executive Action Required"
    : aiLabel === "Needs Attention"
      ? "Performance Recovery Required"
      : aiLabel === "Stable"
        ? "Stable Performance"
        : "Strong Project Performance";

const confidenceScore = Math.round(
  Math.max(
    55,
    Math.min(
      100,
      100 -
        project.activeRisks.length * 7 -
        (project.metrics.scheduleVariance < -20 ? 10 : 0)
    )
  )
);

  return {
  projectId: project.projectId,
  projectTitle: project.projectTitle,
  aiLabel,

  executiveSummary,
  executiveHeadline,

  keyInsights,
  riskNarrative,
  recommendedActions,

  urgencyLevel,
  confidenceScore,

  generatedAt: new Date(),
};
}

// ============================================================================
// EXECUTIVE SUMMARY GENERATOR
// ============================================================================

function buildExecutiveSummary(project: ProjectHealthResult): string {
  const { projectTitle, score, level, metrics, drivers } = project;

  const progressStatus =
    metrics.progress >= metrics.timeElapsed
      ? "ahead of schedule"
      : metrics.progress >= metrics.timeElapsed * 0.8
        ? "on track"
        : "behind schedule";

  const budgetStatus =
    metrics.budgetUtilization <= metrics.progress
      ? "aligned with implementation progress"
      : metrics.budgetUtilization <= metrics.progress + 20
        ? "slightly ahead of implementation pace"
        : "significantly exceeding implementation pace";

  const healthDescription =
    level === "Critical"
      ? "critical condition requiring immediate intervention"
      : level === "At Risk"
        ? "at-risk status with significant deviations"
        : level === "Watch"
        ? "stable but requires active monitoring"
        : "healthy condition with strong performance";

  return `${projectTitle} is currently in ${healthDescription} with a health score of ${score}/100.

The project has achieved ${Math.round(metrics.progress)}% implementation against ${Math.round(metrics.timeElapsed)}% elapsed project time, placing it ${progressStatus}.

Budget utilization stands at ${Math.round(metrics.budgetUtilization)}%, which is ${budgetStatus}.

Key performance drivers: Implementation (${Math.round(drivers.implementationImpact)}), Financial (${Math.round(drivers.financialImpact)}), Timeline (${Math.round(drivers.timelineImpact)})${drivers.indicatorImpact !== null ? `, and M&E (${Math.round(drivers.indicatorImpact)})` : ""}.`;
}

// ============================================================================
// KEY INSIGHTS GENERATOR
// ============================================================================

function buildKeyInsights(project: ProjectHealthResult): string[] {
  const { score, metrics, signals, activeRisks, breakdown } = project;

  const insights: string[] = [];

  // Core metrics insights
  insights.push(`Health score: ${score}/100`);
  insights.push(
    `Implementation progress: ${Math.round(metrics.progress)}% (${metrics.progress >= metrics.timeElapsed ? "ahead" : "behind"} schedule)`
  );
  insights.push(`Budget utilization: ${Math.round(metrics.budgetUtilization)}%`);

  // Schedule variance insight
  if (metrics.scheduleVariance < -20) {
    insights.push(
      `Schedule variance: ${Math.round(metrics.scheduleVariance)}% (significantly behind)`
    );
  } else if (metrics.scheduleVariance < 0) {
    insights.push(
      `Schedule variance: ${Math.round(metrics.scheduleVariance)}% (moderately behind)`
    );
  } else if (metrics.scheduleVariance > 20) {
    insights.push(
      `Schedule variance: +${Math.round(metrics.scheduleVariance)}% (ahead of schedule)`
    );
  }

  // Burn rate insight
  if (metrics.burnRateVariance > 0) {
    insights.push(
      `Spending ${Math.round(Math.abs(metrics.burnRateVariance))} faster than planned`
    );
  } else if (metrics.burnRateVariance < 0) {
    insights.push(
      `Spending ${Math.round(Math.abs(metrics.burnRateVariance))} slower than planned`
    );
  }

  // Indicator insight
  if (metrics.indicatorAchievement !== null) {
    insights.push(
      `Indicator achievement: ${Math.round(metrics.indicatorAchievement)}%`
    );
  }

  // Risk insight
  if (activeRisks.length > 0) {
    const highRisks = activeRisks.filter((r) => r.level === "high").length;
    const mediumRisks = activeRisks.filter((r) => r.level === "medium")
      .length;
    insights.push(
      `Active risks: ${highRisks} high, ${mediumRisks} medium level`
    );
  }

  // Add top signals
  if (signals.length > 0) {
    insights.push(`Alert: ${signals[0]}`);
  }

  return insights;
}

// ============================================================================
// RISK NARRATIVE GENERATOR
// ============================================================================

function buildRiskNarrative(project: ProjectHealthResult): string {
  const { level, metrics, activeRisks, breakdown } = project;

  if (level === "Critical") {
    const criticalRisks = activeRisks.filter((r) => r.level === "high");
    const riskSummary =
      criticalRisks.length > 0
        ? `Critical risks identified: ${criticalRisks.map((r) => r.type).join(", ")}.`
        : "";

    return `Project is in critical condition requiring immediate intervention. ${riskSummary} Severe misalignment detected between planned and actual progress, budget execution, and/or timeline adherence. Executive escalation and corrective action plan required immediately.`;
  }

  if (level === "At Risk") {
    const primaryRisks = activeRisks
      .filter((r) => r.level === "high" || r.level === "medium")
      .slice(0, 2);

    const riskDescription =
      primaryRisks.length > 0
        ? `Primary concerns: ${primaryRisks.map((r) => r.type).join(", ")}.`
        : "";

    const scheduleStatus =
      metrics.scheduleVariance < -20
        ? "Project is significantly behind schedule."
        : metrics.budgetUtilization > 90
          ? "Budget utilization is critically high."
          : "Implementation progress is lagging.";

    return `Project shows significant deviation between planned and actual performance. ${scheduleStatus} ${riskDescription} Corrective action is required to prevent further escalation and ensure project success.`;
  }

  if (level === "Watch") {
    const monitoringAreas: string[] = [];

    if (Math.abs(metrics.scheduleVariance) > 10) {
      monitoringAreas.push("schedule alignment");
    }
    if (metrics.budgetUtilization > 75) {
      monitoringAreas.push("budget consumption");
    }
    if (metrics.indicatorAchievement !== null && metrics.indicatorAchievement < 70) {
      monitoringAreas.push("M&E performance");
    }

    const areas =
      monitoringAreas.length > 0
        ? `Focus areas: ${monitoringAreas.join(", ")}.`
        : "Project requires continued monitoring.";

    return `Project is stable but requires active monitoring to ensure sustained alignment. ${areas} Current trajectory is acceptable, but vigilance is needed to prevent deterioration.`;
  }

  return `Project is performing within expected operational thresholds. All key metrics are aligned, and risk exposure is minimal. Continue current management approach and maintain regular monitoring cadence.`;
}

// ============================================================================
// RECOMMENDED ACTIONS ENGINE
// ============================================================================

function generateRecommendations(project: ProjectHealthResult): string[] {
  const { metrics, activeRisks, level, breakdown } = project;

  const actions: string[] = [];

  // Schedule-based recommendations
  if (metrics.scheduleVariance < -30) {
    actions.push(
      "URGENT: Accelerate implementation activities immediately to recover schedule"
    );
  } else if (metrics.scheduleVariance < -15) {
    actions.push("Increase implementation pace to close schedule gap");
  }

  // Budget-based recommendations
  if (metrics.budgetUtilization > 100) {
    actions.push(
      "URGENT: Review budget overrun and implement cost control measures immediately"
    );
  } else if (metrics.budgetUtilization > 90) {
    actions.push("Review and control budget consumption urgently");
  } else if (metrics.burnRateVariance > 50) {
    actions.push("Investigate high burn rate and adjust spending pace");
  }

  // Indicator-based recommendations
  if (
    metrics.indicatorAchievement !== null &&
    metrics.indicatorAchievement < 40
  ) {
    actions.push("URGENT: Strengthen M&E tracking and reporting mechanisms");
  } else if (
    metrics.indicatorAchievement !== null &&
    metrics.indicatorAchievement < 60
  ) {
    actions.push("Enhance indicator achievement through targeted interventions");
  }

  // Activity gap recommendations
  if (metrics.activityGap > 20) {
    actions.push("Align activity execution with project timeline urgently");
  } else if (metrics.activityGap > 10) {
    actions.push("Review activity schedule and adjust execution plan");
  }

  // Risk-based recommendations
  const highRisks = activeRisks.filter((r) => r.level === "high");
  if (highRisks.length > 0) {
    actions.push(
      `Address high-level risks: ${highRisks.map((r) => r.type).join(", ")}`
    );
  }

  if (activeRisks.length > 5) {
    actions.push("Conduct comprehensive risk mitigation review workshop");
  }

  // Remaining time recommendations
  if (metrics.remainingTime < 30 && metrics.progress < 80) {
    actions.push(
      "URGENT: Project nearing closure - implement emergency completion plan"
    );
  } else if (metrics.remainingTime < 60 && metrics.progress < 70) {
    actions.push("Intensify efforts to meet project deadline");
  }

  // Financial-progress misalignment
  if (metrics.budgetUtilization > 80 && metrics.progress < 50) {
    actions.push(
      "Address budget-progress misalignment through scope or timeline review"
    );
  }

  // Default recommendation if no issues
  if (actions.length === 0) {
    actions.push("Maintain current performance trajectory");
    actions.push("Continue regular monitoring and reporting");
  }

  return actions;
}

// ============================================================================
// PORTFOLIO AGGREGATION
// ============================================================================

/**
 * Generate AI insights for entire portfolio
 */
export function generateAIPortfolioInsights(
  projects: ProjectHealthResult[]
): AIPortfolioInsights {
  if (projects.length === 0) {
  return {
  totalProjects: 0,

  performingCount: 0,
  stableCount: 0,
  needsAttentionCount: 0,
  criticalCount: 0,

  portfolioRiskIndex: {
    high: 0,
    medium: 0,
    low: 0,
  },

  portfolioNarrative: "No projects in portfolio.",
  portfolioRecommendations: [],
  portfolioRiskSummary: "No risk data available.",

  averageConfidenceScore: 0,

  projectInsights: [],
};
}

  // Generate individual insights
  const projectInsights = projects.map(generateAIProjectInsight);

  // Count by label
  const performingCount = projectInsights.filter(
    (p) => p.aiLabel === "Performing"
  ).length;
  const stableCount = projectInsights.filter(
    (p) => p.aiLabel === "Stable"
  ).length;
  const needsAttentionCount = projectInsights.filter(
    (p) => p.aiLabel === "Needs Attention"
  ).length;
  const criticalCount = projectInsights.filter(
    (p) => p.aiLabel === "Critical Intervention"
  ).length;

  // Portfolio narrative
  const portfolioNarrative = buildPortfolioNarrative(
    projects,
    projectInsights,
    performingCount,
    stableCount,
    needsAttentionCount,
    criticalCount
  );

  // Portfolio recommendations
  const portfolioRecommendations = generatePortfolioRecommendations(
    projects,
    projectInsights,
    criticalCount,
    needsAttentionCount
  );

  // Portfolio risk summary
  const portfolioRiskSummary = buildPortfolioRiskSummary(projects);

    let high = 0;
    let medium = 0;
    let low = 0;

  for (const project of projects) {
    for (const risk of project.activeRisks) {
            if (risk.level === "critical") {
        high += 2;
        }
        else if (risk.level === "high") {
        high++;
        }
        else if (risk.level === "medium") {
        medium++;
        }
        else {
        low++;
        }
    }
  }

  const averageConfidenceScore =
    projectInsights.length === 0
      ? 0
      : Math.round(
          projectInsights.reduce(
            (sum, p) => sum + p.confidenceScore,
            0
          ) / projectInsights.length
        );

    return {
    totalProjects: projects.length,

    performingCount,
    stableCount,
    needsAttentionCount,
    criticalCount,

    portfolioRiskIndex: {
      high,
      medium,
      low,
    },

    portfolioNarrative,
    portfolioRecommendations,
    portfolioRiskSummary,

    averageConfidenceScore,

    projectInsights,
  };
}

// ============================================================================
// PORTFOLIO NARRATIVE GENERATOR
// ============================================================================

function buildPortfolioNarrative(
  projects: ProjectHealthResult[],
  insights: AIProjectInsight[],
  performing: number,
  stable: number,
  needsAttention: number,
  critical: number
): string {
  const total = projects.length;
  const avgScore =
    projects.reduce((sum, p) => sum + p.score, 0) / total;
  const healthyPercentage = Math.round(((performing + stable) / total) * 100);

  let healthAssessment = "strong";
  if (healthyPercentage < 50) healthAssessment = "concerning";
  else if (healthyPercentage < 70) healthAssessment = "moderate";

  let priorityStatement = "";
  if (critical > 0) {
    priorityStatement = `${critical} project(s) require immediate executive intervention. `;
  }
  if (needsAttention > 0) {
    priorityStatement += `${needsAttention} project(s) require corrective action. `;
  }

  const portfolioHealth =
    avgScore >= 75
      ? "strong overall health"
      : avgScore >= 60
        ? "acceptable health with areas for improvement"
        : "concerning health requiring portfolio-level intervention";

  return `Portfolio of ${total} projects demonstrates ${portfolioHealth} with an average score of ${Math.round(avgScore)}/100. ${healthyPercentage}% of projects are performing or stable. ${priorityStatement}Portfolio-wide monitoring and targeted interventions are recommended to optimize outcomes.`;
}

// ============================================================================
// PORTFOLIO RECOMMENDATIONS GENERATOR
// ============================================================================

function generatePortfolioRecommendations(
  projects: ProjectHealthResult[],
  insights: AIProjectInsight[],
  critical: number,
  needsAttention: number
): string[] {
  const recommendations: string[] = [];

  // Critical projects
  if (critical > 0) {
    recommendations.push(
      `URGENT: Convene executive steering committee for ${critical} critical project(s)`
    );
    recommendations.push(
      "Establish daily monitoring and escalation protocols for critical projects"
    );
  }

  // At-risk projects
  if (needsAttention > 0) {
    recommendations.push(
      `Implement corrective action plans for ${needsAttention} at-risk project(s)`
    );
  }

  // Portfolio-level budget analysis
  const totalBudget = projects.reduce(
    (sum, p) => sum + p.metrics.remainingBudget,
    0
  );
  const avgBudgetUtilization =
    projects.reduce((sum, p) => sum + p.metrics.budgetUtilization, 0) /
    projects.length;

  if (avgBudgetUtilization > 85) {
    recommendations.push(
      "Portfolio budget utilization is high - review cash flow and financial controls"
    );
  }

  // Portfolio-level schedule analysis
  const delayedProjects = projects.filter(
    (p) => p.metrics.scheduleVariance < -20
  );
  if (delayedProjects.length > projects.length * 0.3) {
    recommendations.push(
      "Portfolio-wide schedule delays detected - conduct timeline recovery analysis"
    );
  }

  // Portfolio-level indicator analysis
  const lowIndicatorProjects = projects.filter(
    (p) => p.metrics.indicatorAchievement !== null && p.metrics.indicatorAchievement < 50
  );
  if (lowIndicatorProjects.length > 0) {
    recommendations.push(
      "Strengthen M&E capacity across portfolio - consider centralized M&E support"
    );
  }

  // Risk concentration
  const totalHighRisks = projects.reduce(
    (sum, p) => sum + p.activeRisks.filter((r) => r.level === "high").length,
    0
  );
  if (totalHighRisks > projects.length * 2) {
    recommendations.push(
      "High risk concentration across portfolio - establish risk management task force"
    );
  }

  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push("Continue current portfolio management approach");
    recommendations.push("Maintain monthly portfolio review cadence");
  }

  return recommendations;
}

// ============================================================================
// PORTFOLIO RISK SUMMARY GENERATOR
// ============================================================================

function buildPortfolioRiskSummary(projects: ProjectHealthResult[]): string {
  let totalHighRisks = 0;
  let totalMediumRisks = 0;
  let totalLowRisks = 0;

  for (const project of projects) {
    for (const risk of project.activeRisks) {
      if (risk.level === "high") totalHighRisks++;
      else if (risk.level === "medium") totalMediumRisks++;
      else totalLowRisks++;
    }
  }

  const riskConcentration =
    totalHighRisks > projects.length * 2
      ? "high"
      : totalHighRisks > projects.length
        ? "moderate"
        : "low";

  return `Portfolio risk profile: ${totalHighRisks} high-level, ${totalMediumRisks} medium-level, ${totalLowRisks} low-level risks. Overall risk concentration is ${riskConcentration}. Risk mitigation focus should prioritize high-level risks across critical projects.`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get AI label color for UI visualization
 */
export function getAILabelColor(
  label: AIProjectInsight["aiLabel"]
): "green" | "blue" | "yellow" | "red" {
  switch (label) {
    case "Performing":
      return "green";
    case "Stable":
      return "blue";
    case "Needs Attention":
      return "yellow";
    case "Critical Intervention":
      return "red";
    default:
      return "blue";
  }
}

/**
 * Get urgency level color for UI visualization
 */
export function getUrgencyColor(
  urgency: AIProjectInsight["urgencyLevel"]
): "green" | "yellow" | "orange" | "red" {
  switch (urgency) {
    case "low":
      return "green";
    case "medium":
      return "yellow";
    case "high":
      return "orange";
    case "critical":
      return "red";
    default:
      return "green";
  }
}
