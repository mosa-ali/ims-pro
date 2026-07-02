import {
  EnterpriseScope,
  SagaDefinition,
  SagaExecutionContext,
  SagaExecutionRecord,
  SagaStepDefinition,
  SagaStepResult,
  WorkflowDesignerDefinition,
  WorkflowExecutionMode,
  WorkflowStepExecutor,
} from "./EnterprisePlatformTypes";

export class WorkflowSagaOrchestrator {
  private readonly definitions = new Map<string, SagaDefinition>();
  private readonly executors = new Map<string, WorkflowStepExecutor>();

  registerExecutor(executor: WorkflowStepExecutor): void {
    this.executors.set(executor.action, executor);
  }

  registerWorkflow(definition: SagaDefinition): SagaDefinition {
    this.definitions.set(definition.workflowId, definition);
    return definition;
  }

  loadFromJSON(definition: WorkflowDesignerDefinition): SagaDefinition {
    const steps = definition.nodes.map<SagaStepDefinition>((node) => ({
      stepId: node.id,
      name: node.label,
      action: node.action,
      executionMode: node.executionMode ?? "sequential",
      mandatory: node.mandatory ?? true,
      condition: node.condition,
      compensationAction: node.compensationAction,
      dependsOn: definition.edges.filter((edge) => edge.to === node.id).map((edge) => edge.from),
    }));

    return this.registerWorkflow({
      workflowId: definition.workflowId,
      name: definition.name,
      version: definition.version,
      module: definition.module,
      trigger: definition.trigger,
      steps,
    });
  }

  async execute(input: {
    workflowId: string;
    scope: EnterpriseScope;
    payload?: Record<string, unknown>;
  }): Promise<SagaExecutionRecord> {
    const definition = this.definitions.get(input.workflowId);
    if (!definition) throw new Error(`Workflow ${input.workflowId} is not registered.`);

    const runId = `workflow-run-${definition.workflowId}-${Date.now()}`;
    const record: SagaExecutionRecord = {
      runId,
      workflowId: definition.workflowId,
      status: "running",
      startedAt: new Date().toISOString(),
      steps: definition.steps.map((step) => ({
        stepId: step.stepId,
        name: step.name,
        status: "pending",
        executionMode: step.executionMode ?? "sequential",
      })),
      compensation: [],
    };
    const context: SagaExecutionContext = {
      runId,
      workflowId: definition.workflowId,
      scope: input.scope,
      input: input.payload ?? {},
      stepResults: {},
    };

    const groups = this.groupSteps(definition.steps);
    for (const group of groups) {
      const executableSteps = group.filter((step) => this.shouldExecute(step, context));
      const skippedSteps = group.filter((step) => !executableSteps.includes(step));
      skippedSteps.forEach((step) => this.markSkipped(record, step));

      const results = group[0]?.executionMode === "parallel"
        ? await Promise.all(executableSteps.map((step) => this.executeStep(step, context, record)))
        : await this.executeSequentialGroup(executableSteps, context, record);

      const failed = results.find((result) => !result.result.success && result.step.mandatory);
      if (failed) {
        await this.compensate(record, definition.steps, context);
        record.status = "failed";
        record.completedAt = new Date().toISOString();
        return record;
      }
    }

    record.status = "completed";
    record.completedAt = new Date().toISOString();
    return record;
  }

  private async executeSequentialGroup(
    steps: SagaStepDefinition[],
    context: SagaExecutionContext,
    record: SagaExecutionRecord,
  ): Promise<Array<{ step: SagaStepDefinition; result: SagaStepResult }>> {
    const results: Array<{ step: SagaStepDefinition; result: SagaStepResult }> = [];
    for (const step of steps) {
      const result = await this.executeStep(step, context, record);
      results.push(result);
      if (!result.result.success && step.mandatory) break;
    }
    return results;
  }

  private async executeStep(
    step: SagaStepDefinition,
    context: SagaExecutionContext,
    record: SagaExecutionRecord,
  ): Promise<{ step: SagaStepDefinition; result: SagaStepResult }> {
    const stepRecord = record.steps.find((candidate) => candidate.stepId === step.stepId)!;
    stepRecord.status = "running";
    stepRecord.startedAt = new Date().toISOString();

    const executor = this.executors.get(step.action);
    if (!executor) {
      const result = { success: false, data: {}, error: `Executor ${step.action} is not registered.` };
      this.completeStepRecord(stepRecord, result);
      return { step, result };
    }

    const result = await this.executeWithRetry(step, executor, context);
    this.completeStepRecord(stepRecord, result);
    if (result.success) {
      context.stepResults[step.stepId] = result.data;
    }
    return { step, result };
  }

  private async executeWithRetry(
    step: SagaStepDefinition,
    executor: WorkflowStepExecutor,
    context: SagaExecutionContext,
  ): Promise<SagaStepResult> {
    const attempts = (step.maxRetries ?? 0) + 1;
    let lastResult: SagaStepResult = { success: false, data: {}, error: "Step did not execute." };
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      lastResult = await this.withTimeout(executor.execute(context), step.timeoutMs ?? 30000);
      if (lastResult.success) return lastResult;
    }
    return lastResult;
  }

  private async compensate(
    record: SagaExecutionRecord,
    steps: SagaStepDefinition[],
    context: SagaExecutionContext,
  ): Promise<void> {
    record.status = "compensating";
    const completedSteps = [...steps]
      .reverse()
      .filter((step) => record.steps.find((item) => item.stepId === step.stepId)?.status === "completed")
      .filter((step) => step.compensationAction);

    for (const step of completedSteps) {
      const executor = this.executors.get(step.compensationAction!);
      if (!executor) {
        record.compensation.push({
          stepId: step.stepId,
          action: step.compensationAction!,
          status: "failed",
          error: "Compensation executor is not registered.",
        });
        continue;
      }
      const result = executor.compensate ? await executor.compensate(context) : await executor.execute(context);
      record.compensation.push({
        stepId: step.stepId,
        action: step.compensationAction!,
        status: result.success ? "completed" : "failed",
        error: result.error,
      });
      const stepRecord = record.steps.find((item) => item.stepId === step.stepId);
      if (stepRecord && result.success) stepRecord.status = "compensated";
    }
  }

  private groupSteps(steps: SagaStepDefinition[]): SagaStepDefinition[][] {
    const groups: SagaStepDefinition[][] = [];
    let currentParallel: SagaStepDefinition[] = [];

    for (const step of steps) {
      const mode = step.executionMode ?? "sequential";
      if (mode === "parallel") {
        currentParallel.push(step);
        continue;
      }
      if (currentParallel.length > 0) {
        groups.push(currentParallel);
        currentParallel = [];
      }
      groups.push([step]);
    }
    if (currentParallel.length > 0) groups.push(currentParallel);
    return groups;
  }

  private shouldExecute(step: SagaStepDefinition, context: SagaExecutionContext): boolean {
    if ((step.dependsOn ?? []).some((dependency) => !context.stepResults[dependency])) return false;
    if (!step.condition) return true;

    const actual = this.resolvePath({ ...context.input, ...context.stepResults }, step.condition.field);
    switch (step.condition.operator) {
      case "equals": return actual === step.condition.value;
      case "not_equals": return actual !== step.condition.value;
      case "greater_than": return Number(actual) > Number(step.condition.value);
      case "less_than": return Number(actual) < Number(step.condition.value);
      case "exists": return actual !== undefined && actual !== null;
      default: return false;
    }
  }

  private completeStepRecord(
    stepRecord: SagaExecutionRecord["steps"][number],
    result: SagaStepResult,
  ): void {
    stepRecord.status = result.success ? "completed" : "failed";
    stepRecord.completedAt = new Date().toISOString();
    stepRecord.result = result.data;
    stepRecord.error = result.error;
  }

  private async withTimeout(promise: Promise<SagaStepResult>, timeoutMs: number): Promise<SagaStepResult> {
    return Promise.race([
      promise,
      new Promise<SagaStepResult>((resolve) => {
        setTimeout(() => resolve({ success: false, data: {}, error: `Step timed out after ${timeoutMs}ms.` }), timeoutMs);
      }),
    ]);
  }

  private markSkipped(record: SagaExecutionRecord, step: SagaStepDefinition): void {
    const stepRecord = record.steps.find((candidate) => candidate.stepId === step.stepId);
    if (stepRecord) {
      stepRecord.status = "skipped";
      stepRecord.completedAt = new Date().toISOString();
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
