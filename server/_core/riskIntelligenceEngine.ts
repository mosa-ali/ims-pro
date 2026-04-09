/**
 * ============================================================================
 * RISK INTELLIGENCE TRIGGER ENGINE
 * ============================================================================
 * 
 * Automated risk detection engine that monitors Finance, Projects, and MEAL
 * modules to identify risks based on predefined rules and thresholds.
 * 
 * TRIGGER CATEGORIES:
 * 1. Financial Risks (burn rate, forecast accuracy, negative balance, FX loss)
 * 2. Project/Activity Progress Risks (delays, bottlenecks, capacity issues)
 * 3. MEAL Indicator Risks (underperformance, outcome failure, data quality)
 * 
 * GOVERNANCE:
 * - All risks are auto-suggested, human-approved before action
 * - Duplication prevention: update existing risk vs create new
 * - Full audit trail for all risk creation/updates
 * - Multi-tenant isolation (organizationId/operatingUnitId)
 * 
 * ============================================================================
 */

import { getDb } from "../db";
import {
  risks,
  projects,
  activities,
  budgetItems,
  indicators,
  users,
} from "../../drizzle/schema";
import { eq, and, sql, isNull, or, gte, lte } from "drizzle-orm";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RiskTriggerResult {
  shouldCreateRisk: boolean;
  riskData?: {
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    category: "financial" | "operational" | "strategic";
    likelihood: number; // 1-5
    impact: number; // 1-5
    source: "finance" | "meal" | "activities";
    triggerValue: string;
    trendDirection: "increasing" | "improving" | "stable";
    projectId?: number;
    activityId?: number;
    budgetItemId?: number;
    indicatorId?: number;
    autoMitigationSuggestions: string[]; // JSON array
  };
}

// ============================================================================
// FINANCIAL RISK TRIGGERS
// ============================================================================

/**
 * Trigger 1: Budget Overspend Risk
 * Condition: Burn Rate >80% AND <50% timeline elapsed
 */
export async function evaluateBudgetOverspendRisk(
  projectId: number,
  organizationId: number,
  operatingUnitId: number | null
): Promise<RiskTriggerResult> {
  const db = await getDb();

  // Get project details
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId),
        operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : sql`1=1`
      )
    )
    .limit(1);

  if (!project) {
    return { shouldCreateRisk: false };
  }

  // Calculate burn rate
  const totalBudget = Number(project.totalBudget) || 0;
  const actualSpent = Number(project.actualSpent) || 0;
  const burnRate = totalBudget > 0 ? (actualSpent / totalBudget) * 100 : 0;

  // Calculate timeline elapsed
  const startDate = project.startDate ? new Date(project.startDate) : null;
  const endDate = project.endDate ? new Date(project.endDate) : null;
  const now = new Date();

  let timelineElapsed = 0;
  if (startDate && endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    timelineElapsed = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;
  }

  // Check trigger condition
  if (burnRate > 80 && timelineElapsed < 50) {
    return {
      shouldCreateRisk: true,
      riskData: {
        title: `Budget Overspend Risk - ${project.projectName}`,
        titleAr: `مخاطر تجاوز الميزانية - ${project.projectNameAr || project.projectName}`,
        description: `Project "${project.projectName}" has spent ${burnRate.toFixed(1)}% of budget while only ${timelineElapsed.toFixed(1)}% of timeline has elapsed. This indicates potential budget overspend.`,
        descriptionAr: `المشروع "${project.projectNameAr || project.projectName}" أنفق ${burnRate.toFixed(1)}٪ من الميزانية بينما مضى ${timelineElapsed.toFixed(1)}٪ فقط من الجدول الزمني. هذا يشير إلى احتمال تجاوز الميزانية.`,
        category: "financial",
        likelihood: 4, // High likelihood
        impact: 4, // High impact
        source: "finance",
        triggerValue: `Burn Rate ${burnRate.toFixed(1)}%, Timeline ${timelineElapsed.toFixed(1)}%`,
        trendDirection: "increasing",
        projectId,
        autoMitigationSuggestions: [
          "Reallocate budget lines to cover shortfall",
          "Freeze non-essential procurement",
          "Request donor budget revision",
          "Increase financial monitoring frequency to weekly",
        ],
      },
    };
  }

  return { shouldCreateRisk: false };
}

/**
 * Trigger 2: Forecast Accuracy Risk
 * Condition: Actual Spent > Forecast by >15%
 */
export async function evaluateForecastAccuracyRisk(
  projectId: number,
  organizationId: number,
  operatingUnitId: number | null
): Promise<RiskTriggerResult> {
  const db = await getDb();

  // Get project details
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId),
        operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : sql`1=1`
      )
    )
    .limit(1);

  if (!project) {
    return { shouldCreateRisk: false };
  }

  // Calculate forecast variance
  const actualSpent = Number(project.actualSpent) || 0;
  const forecast = Number(project.forecast) || 0;

  if (forecast === 0) {
    return { shouldCreateRisk: false };
  }

  const variance = ((actualSpent - forecast) / forecast) * 100;

  // Check trigger condition
  if (variance > 15) {
    return {
      shouldCreateRisk: true,
      riskData: {
        title: `Forecast Accuracy Risk - ${project.projectName}`,
        titleAr: `مخاطر دقة التوقعات - ${project.projectNameAr || project.projectName}`,
        description: `Project "${project.projectName}" actual spending ($${actualSpent.toFixed(2)}) exceeds forecast ($${forecast.toFixed(2)}) by ${variance.toFixed(1)}%. This indicates poor forecast accuracy.`,
        descriptionAr: `الإنفاق الفعلي للمشروع "${project.projectNameAr || project.projectName}" ($${actualSpent.toFixed(2)}) يتجاوز التوقعات ($${forecast.toFixed(2)}) بنسبة ${variance.toFixed(1)}٪. هذا يشير إلى ضعف دقة التوقعات.`,
        category: "financial",
        likelihood: 3, // Medium likelihood
        impact: 3, // Medium impact
        source: "finance",
        triggerValue: `Variance ${variance.toFixed(1)}%`,
        trendDirection: "increasing",
        projectId,
        autoMitigationSuggestions: [
          "Review and update forecast methodology",
          "Implement monthly forecast review meetings",
          "Improve cost estimation accuracy",
          "Establish variance alert thresholds",
        ],
      },
    };
  }

  return { shouldCreateRisk: false };
}

/**
 * Trigger 3: Critical Financial Risk
 * Condition: Negative Balance
 */
export async function evaluateNegativeBalanceRisk(
  projectId: number,
  organizationId: number,
  operatingUnitId: number | null
): Promise<RiskTriggerResult> {
  const db = await getDb();

  // Get project details
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId),
        operatingUnitId ? eq(projects.operatingUnitId, operatingUnitId) : sql`1=1`
      )
    )
    .limit(1);

  if (!project) {
    return { shouldCreateRisk: false };
  }

  // Calculate balance
  const totalBudget = Number(project.totalBudget) || 0;
  const actualSpent = Number(project.actualSpent) || 0;
  const balance = totalBudget - actualSpent;

  // Check trigger condition
  if (balance < 0) {
    return {
      shouldCreateRisk: true,
      riskData: {
        title: `Critical Financial Risk - Negative Balance - ${project.projectName}`,
        titleAr: `مخاطر مالية حرجة - رصيد سلبي - ${project.projectNameAr || project.projectName}`,
        description: `Project "${project.projectName}" has a negative balance of $${Math.abs(balance).toFixed(2)}. Immediate action required.`,
        descriptionAr: `المشروع "${project.projectNameAr || project.projectName}" لديه رصيد سلبي قدره $${Math.abs(balance).toFixed(2)}. مطلوب إجراء فوري.`,
        category: "financial",
        likelihood: 5, // Very high likelihood
        impact: 5, // Critical impact
        source: "finance",
        triggerValue: `Balance $${balance.toFixed(2)}`,
        trendDirection: "increasing",
        projectId,
        autoMitigationSuggestions: [
          "Immediately freeze all non-essential spending",
          "Request emergency donor budget revision",
          "Reallocate funds from other projects (if allowed)",
          "Escalate to Senior Management Team (SMT)",
        ],
      },
    };
  }

  return { shouldCreateRisk: false };
}

// ============================================================================
// PROJECT/ACTIVITY PROGRESS RISK TRIGGERS
// ============================================================================

/**
 * Trigger 4: Implementation Delay Risk
 * Condition: Activity progress <50% AND timeline elapsed >60%
 */
export async function evaluateImplementationDelayRisk(
  activityId: number,
  organizationId: number,
  operatingUnitId: number | null
): Promise<RiskTriggerResult> {
  const db = await getDb();

  // Get activity details
  const [activity] = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.id, activityId),
        eq(activities.organizationId, organizationId),
        operatingUnitId ? eq(activities.operatingUnitId, operatingUnitId) : sql`1=1`
      )
    )
    .limit(1);

  if (!activity) {
    return { shouldCreateRisk: false };
  }

  // Get progress percentage
  const progressPercentage = Number(activity.progressPercentage) || 0;

  // Calculate timeline elapsed
  const startDate = activity.startDate ? new Date(activity.startDate) : null;
  const endDate = activity.endDate ? new Date(activity.endDate) : null;
  const now = new Date();

  let timelineElapsed = 0;
  if (startDate && endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    timelineElapsed = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;
  }

  // Check trigger condition
  if (progressPercentage < 50 && timelineElapsed > 60) {
    return {
      shouldCreateRisk: true,
      riskData: {
        title: `Implementation Delay - ${activity.activityName}`,
        titleAr: `تأخير التنفيذ - ${activity.activityNameAr || activity.activityName}`,
        description: `Activity "${activity.activityName}" is only ${progressPercentage.toFixed(1)}% complete while ${timelineElapsed.toFixed(1)}% of timeline has elapsed. Significant implementation delay detected.`,
        descriptionAr: `النشاط "${activity.activityNameAr || activity.activityName}" مكتمل بنسبة ${progressPercentage.toFixed(1)}٪ فقط بينما مضى ${timelineElapsed.toFixed(1)}٪ من الجدول الزمني. تم اكتشاف تأخير كبير في التنفيذ.`,
        category: "operational",
        likelihood: 4, // High likelihood
        impact: 4, // High impact
        source: "activities",
        triggerValue: `Progress ${progressPercentage.toFixed(1)}%, Timeline ${timelineElapsed.toFixed(1)}%`,
        trendDirection: "increasing",
        projectId: activity.projectId,
        activityId,
        autoMitigationSuggestions: [
          "Revise activity timeline with realistic milestones",
          "Deploy surge staff to accelerate implementation",
          "Simplify activity scope if feasible",
          "Escalate to Project Manager for resource allocation",
        ],
      },
    };
  }

  return { shouldCreateRisk: false };
}

// ============================================================================
// MEAL INDICATOR RISK TRIGGERS
// ============================================================================

/**
 * Trigger 5: Underperformance Risk
 * Condition: Indicator achievement <50% after mid-term
 */
export async function evaluateIndicatorUnderperformanceRisk(
  indicatorId: number,
  organizationId: number,
  operatingUnitId: number | null
): Promise<RiskTriggerResult> {
  const db = await getDb();

  // Get indicator details
  const [indicator] = await db
    .select()
    .from(indicators)
    .where(
      and(
        eq(indicators.id, indicatorId),
        eq(indicators.organizationId, organizationId),
        operatingUnitId ? eq(indicators.operatingUnitId, operatingUnitId) : sql`1=1`
      )
    )
    .limit(1);

  if (!indicator) {
    return { shouldCreateRisk: false };
  }

  // Calculate achievement percentage
  const baseline = Number(indicator.baseline) || 0;
  const target = Number(indicator.target) || 0;
  const actual = Number(indicator.actual) || 0;

  if (target === 0) {
    return { shouldCreateRisk: false };
  }

  const achievementPercentage = ((actual - baseline) / (target - baseline)) * 100;

  // Get project timeline to determine if past mid-term
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, indicator.projectId))
    .limit(1);

  if (!project) {
    return { shouldCreateRisk: false };
  }

  const startDate = project.startDate ? new Date(project.startDate) : null;
  const endDate = project.endDate ? new Date(project.endDate) : null;
  const now = new Date();

  let timelineElapsed = 0;
  if (startDate && endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    timelineElapsed = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;
  }

  // Check trigger condition: achievement <50% after mid-term (>50% timeline elapsed)
  if (achievementPercentage < 50 && timelineElapsed > 50) {
    return {
      shouldCreateRisk: true,
      riskData: {
        title: `Indicator Underperformance - ${indicator.indicatorName}`,
        titleAr: `ضعف أداء المؤشر - ${indicator.indicatorNameAr || indicator.indicatorName}`,
        description: `Indicator "${indicator.indicatorName}" has only achieved ${achievementPercentage.toFixed(1)}% of target after ${timelineElapsed.toFixed(1)}% of project timeline. Risk of not meeting outcome targets.`,
        descriptionAr: `المؤشر "${indicator.indicatorNameAr || indicator.indicatorName}" حقق ${achievementPercentage.toFixed(1)}٪ فقط من الهدف بعد ${timelineElapsed.toFixed(1)}٪ من الجدول الزمني للمشروع. خطر عدم تحقيق أهداف النتائج.`,
        category: "operational",
        likelihood: 4, // High likelihood
        impact: 4, // High impact
        source: "meal",
        triggerValue: `Achievement ${achievementPercentage.toFixed(1)}%`,
        trendDirection: "increasing",
        projectId: indicator.projectId,
        activityId: indicator.activityId || undefined,
        indicatorId,
        autoMitigationSuggestions: [
          "Conduct bottleneck analysis to identify root causes",
          "Adjust targets if donor allows and justified",
          "Trigger corrective action plan",
          "Increase MEAL monitoring frequency",
        ],
      },
    };
  }

  return { shouldCreateRisk: false };
}

// ============================================================================
// RISK CREATION/UPDATE LOGIC
// ============================================================================

/**
 * Create or update risk based on trigger result
 * Implements duplication prevention: update existing risk vs create new
 */
export async function createOrUpdateRisk(
  triggerResult: RiskTriggerResult,
  organizationId: number,
  operatingUnitId: number | null,
  userId: number
): Promise<{ riskId: number; action: "created" | "updated" | "skipped" }> {
  if (!triggerResult.shouldCreateRisk || !triggerResult.riskData) {
    return { riskId: 0, action: "skipped" };
  }

  const db = await getDb();
  const riskData = triggerResult.riskData;

  // Check if similar risk already exists (duplication prevention)
  const existingRisks = await db
    .select()
    .from(risks)
    .where(
      and(
        eq(risks.organizationId, organizationId),
        operatingUnitId ? eq(risks.operatingUnitId, operatingUnitId) : sql`1=1`,
        eq(risks.source, riskData.source),
        riskData.projectId ? eq(risks.projectId, riskData.projectId) : sql`1=1`,
        riskData.activityId ? eq(risks.activityId, riskData.activityId) : sql`1=1`,
        riskData.indicatorId ? eq(risks.indicatorId, riskData.indicatorId) : sql`1=1`,
        eq(risks.isDeleted, false),
        or(
          eq(risks.status, "identified"),
          eq(risks.status, "assessed"),
          eq(risks.status, "mitigated")
        )
      )
    )
    .limit(1);

  // Calculate risk score
  const score = riskData.likelihood * riskData.impact;
  let level: "low" | "medium" | "high" | "critical";
  if (score >= 1 && score <= 4) {
    level = "low";
  } else if (score >= 5 && score <= 10) {
    level = "medium";
  } else if (score >= 11 && score <= 19) {
    level = "high";
  } else {
    level = "critical";
  }

  if (existingRisks.length > 0) {
    // Update existing risk
    const existingRisk = existingRisks[0];
    await db
      .update(risks)
      .set({
        likelihood: riskData.likelihood,
        impact: riskData.impact,
        score,
        level,
        triggerValue: riskData.triggerValue,
        trendDirection: riskData.trendDirection,
        lastEvaluatedAt: new Date(),
        autoMitigationSuggestions: JSON.stringify(riskData.autoMitigationSuggestions),
        updatedAt: new Date(),
      })
      .where(eq(risks.id, existingRisk.id));

    return { riskId: existingRisk.id, action: "updated" };
  } else {
    // Create new risk
    const [newRisk] = await db.insert(risks).values({
      organizationId,
      operatingUnitId,
      title: riskData.title,
      titleAr: riskData.titleAr,
      description: riskData.description,
      descriptionAr: riskData.descriptionAr,
      category: riskData.category,
      likelihood: riskData.likelihood,
      impact: riskData.impact,
      score,
      level,
      status: "identified",
      projectId: riskData.projectId,
      activityId: riskData.activityId,
      budgetItemId: riskData.budgetItemId,
      indicatorId: riskData.indicatorId,
      isSystemGenerated: true,
      source: riskData.source,
      triggerValue: riskData.triggerValue,
      trendDirection: riskData.trendDirection,
      lastEvaluatedAt: new Date(),
      autoMitigationSuggestions: JSON.stringify(riskData.autoMitigationSuggestions),
      createdBy: userId,
    });

    return { riskId: newRisk.insertId, action: "created" };
  }
}

// ============================================================================
// EVALUATION ORCHESTRATOR
// ============================================================================

/**
 * Evaluate all risk triggers for a given project
 * Called by background scheduler
 */
export async function evaluateProjectRisks(
  projectId: number,
  organizationId: number,
  operatingUnitId: number | null,
  userId: number
): Promise<{ risksCreated: number; risksUpdated: number }> {
  let risksCreated = 0;
  let risksUpdated = 0;

  // Evaluate financial risks
  const budgetOverspendResult = await evaluateBudgetOverspendRisk(
    projectId,
    organizationId,
    operatingUnitId
  );
  const budgetOverspendAction = await createOrUpdateRisk(
    budgetOverspendResult,
    organizationId,
    operatingUnitId,
    userId
  );
  if (budgetOverspendAction.action === "created") risksCreated++;
  if (budgetOverspendAction.action === "updated") risksUpdated++;

  const forecastAccuracyResult = await evaluateForecastAccuracyRisk(
    projectId,
    organizationId,
    operatingUnitId
  );
  const forecastAccuracyAction = await createOrUpdateRisk(
    forecastAccuracyResult,
    organizationId,
    operatingUnitId,
    userId
  );
  if (forecastAccuracyAction.action === "created") risksCreated++;
  if (forecastAccuracyAction.action === "updated") risksUpdated++;

  const negativeBalanceResult = await evaluateNegativeBalanceRisk(
    projectId,
    organizationId,
    operatingUnitId
  );
  const negativeBalanceAction = await createOrUpdateRisk(
    negativeBalanceResult,
    organizationId,
    operatingUnitId,
    userId
  );
  if (negativeBalanceAction.action === "created") risksCreated++;
  if (negativeBalanceAction.action === "updated") risksUpdated++;

  // Evaluate activity risks
  const db = await getDb();
  const projectActivities = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.projectId, projectId),
        eq(activities.organizationId, organizationId),
        operatingUnitId ? eq(activities.operatingUnitId, operatingUnitId) : sql`1=1`,
        eq(activities.isDeleted, false)
      )
    );

  for (const activity of projectActivities) {
    const implementationDelayResult = await evaluateImplementationDelayRisk(
      activity.id,
      organizationId,
      operatingUnitId
    );
    const implementationDelayAction = await createOrUpdateRisk(
      implementationDelayResult,
      organizationId,
      operatingUnitId,
      userId
    );
    if (implementationDelayAction.action === "created") risksCreated++;
    if (implementationDelayAction.action === "updated") risksUpdated++;
  }

  // Evaluate indicator risks
  const projectIndicators = await db
    .select()
    .from(indicators)
    .where(
      and(
        eq(indicators.projectId, projectId),
        eq(indicators.organizationId, organizationId),
        operatingUnitId ? eq(indicators.operatingUnitId, operatingUnitId) : sql`1=1`,
        eq(indicators.isDeleted, false)
      )
    );

  for (const indicator of projectIndicators) {
    const underperformanceResult = await evaluateIndicatorUnderperformanceRisk(
      indicator.id,
      organizationId,
      operatingUnitId
    );
    const underperformanceAction = await createOrUpdateRisk(
      underperformanceResult,
      organizationId,
      operatingUnitId,
      userId
    );
    if (underperformanceAction.action === "created") risksCreated++;
    if (underperformanceAction.action === "updated") risksUpdated++;
  }

  return { risksCreated, risksUpdated };
}
