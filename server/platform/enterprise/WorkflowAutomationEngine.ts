import {
  AutomationRuleDefinition,
  AutomationRuleEvaluation,
  EnterpriseScope,
  RetryCompensationView,
  SagaExecutionRecord,
  WorkflowMonitoringDashboard,
  WorkflowScheduleDefinition,
  WorkflowNotificationDefinition,
} from "./EnterprisePlatformTypes";
import { EnterpriseNotificationPlatform } from "./EnterprisePlatformServices";
import { WorkflowSagaOrchestrator } from "./WorkflowSagaOrchestrator";

export class WorkflowMonitoringEngine {
  buildDashboard(records: SagaExecutionRecord[]): WorkflowMonitoringDashboard {
    const failedSteps = records.flatMap((record) =>
      record.steps
        .filter((step) => step.status === "failed")
        .map((step) => ({
          runId: record.runId,
          workflowId: record.workflowId,
          stepId: step.stepId,
          error: step.error,
        })),
    );
    const durations = records.map((record) => record.completedAt ? new Date(record.completedAt).getTime() - new Date(record.startedAt).getTime() : 0);
    const stepStats = new Map<string, { durations: number[]; failures: number }>();
    records.flatMap((record) => record.steps).forEach((step) => {
      const duration = step.startedAt && step.completedAt ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime() : 0;
      const current = stepStats.get(step.stepId) ?? { durations: [], failures: 0 };
      current.durations.push(duration);
      if (step.status === "failed") current.failures += 1;
      stepStats.set(step.stepId, current);
    });
    const bottlenecks = [...stepStats.entries()]
      .map(([stepId, stats]) => ({
        stepId,
        averageDurationMs: Math.round(stats.durations.reduce((sum, value) => sum + value, 0) / Math.max(stats.durations.length, 1)),
        failures: stats.failures,
      }))
      .filter((item) => item.averageDurationMs > 0 || item.failures > 0);

    return {
      totalRuns: records.length,
      running: records.filter((record) => record.status === "running").length,
      completed: records.filter((record) => record.status === "completed").length,
      failed: records.filter((record) => record.status === "failed").length,
      compensated: records.filter((record) => record.compensation.length > 0).length,
      averageStepsPerRun: records.length
        ? Math.round(records.reduce((sum, record) => sum + record.steps.length, 0) / records.length)
        : 0,
      failedSteps,
      averageDurationMs: Math.round(durations.reduce((sum, value) => sum + value, 0) / Math.max(durations.length, 1)),
      bottlenecks,
      approvalDelays: bottlenecks.filter((item) => item.stepId.toLowerCase().includes("approval")).map((item) => ({
        stepId: item.stepId,
        delayMs: item.averageDurationMs,
      })),
      retryCount: failedSteps.length,
      compensationFrequency: records.length ? records.filter((record) => record.compensation.length > 0).length / records.length : 0,
      slaCompliancePercent: records.length ? Math.round((records.filter((record) => record.status === "completed").length / records.length) * 100) : 100,
    };
  }

  buildRetryCompensationView(record: SagaExecutionRecord): RetryCompensationView {
    return {
      runId: record.runId,
      workflowId: record.workflowId,
      retryableSteps: record.steps.filter((step) => step.status === "failed").map((step) => step.stepId),
      compensatedSteps: record.compensation.filter((item) => item.status === "completed").map((item) => item.stepId),
      failedCompensations: record.compensation.filter((item) => item.status === "failed").map((item) => item.stepId),
    };
  }
}

export class AutomationRulesEngine {
  private readonly rules = new Map<string, AutomationRuleDefinition>();

  registerRule(rule: AutomationRuleDefinition): AutomationRuleDefinition {
    this.rules.set(rule.ruleId, rule);
    return rule;
  }

  evaluate(trigger: string, facts: Record<string, unknown>): AutomationRuleEvaluation[] {
    return [...this.rules.values()]
      .filter((rule) => rule.enabled && rule.trigger === trigger)
      .map((rule) => {
        const matched = rule.condition ? this.matchesCondition(rule.condition, facts) : true;
        return {
          ruleId: rule.ruleId,
          matched,
          action: matched ? rule.action : undefined,
          reason: matched ? `Rule ${rule.name} matched.` : `Rule ${rule.name} did not match.`,
        };
      });
  }

  private matchesCondition(condition: NonNullable<AutomationRuleDefinition["condition"]>, facts: Record<string, unknown>): boolean {
    const actual = this.resolvePath(facts, condition.field);
    switch (condition.operator) {
      case "equals": return actual === condition.value;
      case "not_equals": return actual !== condition.value;
      case "greater_than": return Number(actual) > Number(condition.value);
      case "less_than": return Number(actual) < Number(condition.value);
      case "exists": return actual !== undefined && actual !== null;
      default: return false;
    }
  }

  private resolvePath(source: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((current, part) => {
      if (current && typeof current === "object" && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, source);
  }
}

export class WorkflowSchedulerIntegration {
  private readonly schedules = new Map<string, WorkflowScheduleDefinition>();

  registerSchedule(schedule: WorkflowScheduleDefinition): WorkflowScheduleDefinition {
    this.schedules.set(schedule.scheduleId, schedule);
    return schedule;
  }

  dueSchedules(now: string): WorkflowScheduleDefinition[] {
    return [...this.schedules.values()].filter((schedule) => schedule.enabled && schedule.nextRunAt <= now);
  }

  advanceSchedule(schedule: WorkflowScheduleDefinition): WorkflowScheduleDefinition {
    const next = new Date(schedule.nextRunAt);
    if (schedule.frequency === "hourly") next.setHours(next.getHours() + 1);
    else if (schedule.frequency === "daily") next.setDate(next.getDate() + 1);
    else if (schedule.frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (schedule.frequency === "monthly") next.setMonth(next.getMonth() + 1);
    else schedule.enabled = false;

    const updated = { ...schedule, nextRunAt: next.toISOString(), enabled: schedule.enabled };
    this.schedules.set(updated.scheduleId, updated);
    return updated;
  }
}

export class WorkflowNotificationIntegration {
  constructor(private readonly notificationPlatform: EnterpriseNotificationPlatform = new EnterpriseNotificationPlatform()) {}

  buildNotifications(input: {
    definitions: WorkflowNotificationDefinition[];
    event: WorkflowNotificationDefinition["event"];
    scope: EnterpriseScope;
    workflowId: string;
  }): Array<Record<string, unknown>> {
    return input.definitions
      .filter((definition) => definition.event === input.event)
      .map((definition) => this.notificationPlatform.routeNotification(
        "compliance",
        definition.messageTemplate.replace("{workflowId}", input.workflowId),
        input.scope,
      ));
  }
}

export class PlatformAutomationEngine {
  readonly monitoring = new WorkflowMonitoringEngine();
  readonly rules = new AutomationRulesEngine();
  readonly scheduler = new WorkflowSchedulerIntegration();
  readonly notifications = new WorkflowNotificationIntegration();

  constructor(private readonly orchestrator: WorkflowSagaOrchestrator) {}

  async runDueSchedules(scope: EnterpriseScope, now: string): Promise<SagaExecutionRecord[]> {
    const due = this.scheduler.dueSchedules(now);
    const results: SagaExecutionRecord[] = [];
    for (const schedule of due) {
      results.push(await this.orchestrator.execute({
        workflowId: schedule.workflowId,
        scope,
        payload: schedule.payload,
      }));
      this.scheduler.advanceSchedule(schedule);
    }
    return results;
  }
}
