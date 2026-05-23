/**
 * Project Health Engine
 * 
 * Evaluates project health based on multiple dimensions:
 * - Timeline adherence
 * - Financial utilization & burn rate
 * - Activity completion
 * - Indicator achievement
 * - Task completion
 * - Risk exposure
 * 
 * Returns a health status: Healthy | Watchlist | At Risk | Critical | Completed
 */

export type HealthStatus = 'Healthy' | 'Watchlist' | 'At Risk' | 'Critical' | 'Completed';

export interface ProjectHealthInput {
  // Timeline
  startDate: string;
  endDate: string;
  status: string;

  // Financial
  totalBudget: number;
  totalSpent: number;

  // Activities
  totalActivities: number;
  completedActivities: number;
  delayedActivities: number;

  // Indicators
  totalIndicators: number;
  achievedIndicators: number;
  offTrackIndicators: number;

  // Tasks
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;

  // Risks
  totalRisks: number;
  highRisks: number;
  unresolvedRisks: number;

  // Beneficiaries
  targetBeneficiaries: number;
  reachedBeneficiaries: number;
}

export interface ProjectHealthResult {
  status: HealthStatus;
  score: number; // 0-100
  factors: {
    timeline: { score: number; label: string };
    financial: { score: number; label: string };
    activities: { score: number; label: string };
    indicators: { score: number; label: string };
    tasks: { score: number; label: string };
    risks: { score: number; label: string };
  };
}

export function calculateProjectHealth(input: ProjectHealthInput): ProjectHealthResult {
  const now = new Date();
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);

  // If project is completed
  if (input.status === 'completed' || input.status === 'cancelled') {
    return {
      status: 'Completed',
      score: 100,
      factors: {
        timeline: { score: 100, label: 'Completed' },
        financial: { score: 100, label: 'Closed' },
        activities: { score: 100, label: 'Closed' },
        indicators: { score: 100, label: 'Closed' },
        tasks: { score: 100, label: 'Closed' },
        risks: { score: 100, label: 'Closed' },
      },
    };
  }

  // 1. Timeline Score
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const timelineProgress = totalDuration > 0 ? Math.min(elapsed / totalDuration, 1) : 1;
  const isOverdue = now > end;
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let timelineScore = 100;
  let timelineLabel = 'On Track';
  if (isOverdue) {
    timelineScore = 20;
    timelineLabel = `Overdue by ${Math.abs(daysRemaining)} days`;
  } else if (daysRemaining <= 30 && timelineProgress > 0.9) {
    timelineScore = 60;
    timelineLabel = `${daysRemaining} days remaining`;
  } else if (daysRemaining <= 60) {
    timelineScore = 75;
    timelineLabel = `${daysRemaining} days remaining`;
  }

  // 2. Financial Score
  const utilizationRate = input.totalBudget > 0 ? input.totalSpent / input.totalBudget : 0;
  const expectedUtilization = timelineProgress;
  const utilizationGap = Math.abs(utilizationRate - expectedUtilization);

  let financialScore = 100;
  let financialLabel = 'Aligned';
  if (input.totalBudget === 0) {
    financialScore = 50;
    financialLabel = 'No budget set';
  } else if (utilizationRate > 1.0) {
    financialScore = 30;
    financialLabel = `Overspent (${Math.round(utilizationRate * 100)}%)`;
  } else if (utilizationRate === 0 && timelineProgress > 0.3) {
    financialScore = 40;
    financialLabel = 'No spending detected';
  } else if (utilizationGap > 0.3) {
    financialScore = 55;
    financialLabel = `Utilization gap: ${Math.round(utilizationGap * 100)}%`;
  } else if (utilizationGap > 0.15) {
    financialScore = 75;
    financialLabel = `Minor gap: ${Math.round(utilizationGap * 100)}%`;
  }

  // 3. Activities Score
  let activitiesScore = 100;
  let activitiesLabel = 'On Track';
  if (input.totalActivities === 0) {
    activitiesScore = 50;
    activitiesLabel = 'No activities defined';
  } else {
    const completionRate = input.completedActivities / input.totalActivities;
    const delayRate = input.delayedActivities / input.totalActivities;
    if (delayRate > 0.5) {
      activitiesScore = 30;
      activitiesLabel = `${Math.round(delayRate * 100)}% delayed`;
    } else if (delayRate > 0.25) {
      activitiesScore = 55;
      activitiesLabel = `${Math.round(delayRate * 100)}% delayed`;
    } else if (completionRate < expectedUtilization * 0.5 && timelineProgress > 0.3) {
      activitiesScore = 60;
      activitiesLabel = `Behind schedule (${Math.round(completionRate * 100)}% done)`;
    } else {
      activitiesScore = Math.min(100, Math.round(70 + completionRate * 30));
      activitiesLabel = `${Math.round(completionRate * 100)}% completed`;
    }
  }

  // 4. Indicators Score
  let indicatorsScore = 100;
  let indicatorsLabel = 'On Track';
  if (input.totalIndicators === 0) {
    indicatorsScore = 50;
    indicatorsLabel = 'No indicators defined';
  } else {
    const achievementRate = input.achievedIndicators / input.totalIndicators;
    const offTrackRate = input.offTrackIndicators / input.totalIndicators;
    if (offTrackRate > 0.5) {
      indicatorsScore = 35;
      indicatorsLabel = `${Math.round(offTrackRate * 100)}% off-track`;
    } else if (offTrackRate > 0.25) {
      indicatorsScore = 55;
      indicatorsLabel = `${Math.round(offTrackRate * 100)}% off-track`;
    } else {
      indicatorsScore = Math.min(100, Math.round(60 + achievementRate * 40));
      indicatorsLabel = `${Math.round(achievementRate * 100)}% achieved`;
    }
  }

  // 5. Tasks Score
  let tasksScore = 100;
  let tasksLabel = 'On Track';
  if (input.totalTasks === 0) {
    tasksScore = 70;
    tasksLabel = 'No tasks defined';
  } else {
    const overdueRate = input.overdueTasks / input.totalTasks;
    const completionRate = input.completedTasks / input.totalTasks;
    if (overdueRate > 0.4) {
      tasksScore = 30;
      tasksLabel = `${input.overdueTasks} overdue tasks`;
    } else if (overdueRate > 0.2) {
      tasksScore = 55;
      tasksLabel = `${input.overdueTasks} overdue tasks`;
    } else {
      tasksScore = Math.min(100, Math.round(60 + completionRate * 40));
      tasksLabel = `${Math.round(completionRate * 100)}% completed`;
    }
  }

  // 6. Risks Score
  let risksScore = 100;
  let risksLabel = 'Low Risk';
  if (input.highRisks > 3) {
    risksScore = 30;
    risksLabel = `${input.highRisks} high/critical risks`;
  } else if (input.highRisks > 1) {
    risksScore = 55;
    risksLabel = `${input.highRisks} high/critical risks`;
  } else if (input.unresolvedRisks > 5) {
    risksScore = 60;
    risksLabel = `${input.unresolvedRisks} unresolved risks`;
  } else if (input.unresolvedRisks > 0) {
    risksScore = 80;
    risksLabel = `${input.unresolvedRisks} unresolved`;
  }

  // Weighted overall score
  const weights = {
    timeline: 0.20,
    financial: 0.25,
    activities: 0.20,
    indicators: 0.15,
    tasks: 0.10,
    risks: 0.10,
  };

  const overallScore = Math.round(
    timelineScore * weights.timeline +
    financialScore * weights.financial +
    activitiesScore * weights.activities +
    indicatorsScore * weights.indicators +
    tasksScore * weights.tasks +
    risksScore * weights.risks
  );

  // Determine status
  let status: HealthStatus;
  if (overallScore >= 75) {
    status = 'Healthy';
  } else if (overallScore >= 55) {
    status = 'Watchlist';
  } else if (overallScore >= 35) {
    status = 'At Risk';
  } else {
    status = 'Critical';
  }

  // Override: if project is overdue and has critical issues
  if (isOverdue && financialScore < 50) {
    status = 'Critical';
  }

  return {
    status,
    score: overallScore,
    factors: {
      timeline: { score: timelineScore, label: timelineLabel },
      financial: { score: financialScore, label: financialLabel },
      activities: { score: activitiesScore, label: activitiesLabel },
      indicators: { score: indicatorsScore, label: indicatorsLabel },
      tasks: { score: tasksScore, label: tasksLabel },
      risks: { score: risksScore, label: risksLabel },
    },
  };
}
