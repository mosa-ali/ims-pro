/**
 * P2PWorkflowOrchestrator.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Procure-to-Pay Global Workflow Orchestrator
 *
 * PROCUREMENT CAPSTONE
 *
 * Coordinates the full P2P lifecycle across all modules:
 *
 *   GRN Accepted (event)
 *     → InventoryAssetAutomationEngine.processGRN()
 *     → ThreeWayMatchingEngine.match()
 *       → matched:  releasePayment → postToGL → chargeToBudget → chargeToGrant
 *                    → updateKnowledgeGraph → generateNarrative → notify
 *       → unmatched: escalate → block payment → log audit
 *
 * Architecture:
 *   - Subscribes to EventBus (Phase 3/3H event infrastructure)
 *   - Evaluates UnifiedRulesCore at each transition (Phase 6)
 *   - Implements Saga pattern (compensating actions on failure)
 *   - Full end-to-end transaction visibility
 *   - Persists saga state in IEventStore (immutable history)
 *
 * This engine COORDINATES — it does NOT replace any existing engine.
 * Each step delegates to the responsible engine.
 *
 * Integration points with existing codebase:
 *   - P2PPipelineEngine (stage tracking)
 *   - ThreeWayMatchingEngine (PO↔GRN↔Invoice matching)
 *   - InventoryAssetAutomationEngine (post-GRN disposition)
 *   - BudgetCommitmentEngine (commitment lifecycle)
 *   - BudgetAvailabilityEngine (availability check)
 *   - GLPostingPipeline (journal entry posting)
 *   - ProcurementKnowledgeGraphEngine (entity graph)
 *   - NarrativeEngine (rule-based findings)
 *   - UnifiedRulesCore (rule evaluation at each step)
 *   - EventBus + EventStore (event infrastructure)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, IEventStore, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// PROCUREMENT DOMAIN EVENTS
// ────────────────────────────────────────────────────────────────────────────

export const ProcurementEventType = {
  // Stage events (published by existing routers/engines)
  PR_APPROVED: 'procurement.pr.approved',
  RFQ_ISSUED: 'procurement.rfq.issued',
  BID_EVALUATED: 'procurement.bid.evaluated',
  CONTRACT_SIGNED: 'procurement.contract.signed',
  PO_ISSUED: 'procurement.po.issued',
  SHIPMENT_DISPATCHED: 'procurement.shipment.dispatched',
  GRN_ACCEPTED: 'procurement.grn.accepted',
  INSPECTION_COMPLETED: 'procurement.inspection.completed',
  INVOICE_RECEIVED: 'procurement.invoice.received',
  MATCHING_COMPLETED: 'procurement.matching.completed',
  PAYMENT_RELEASED: 'procurement.payment.released',
  PAYMENT_POSTED: 'procurement.payment.posted',
  GRANT_CHARGED: 'procurement.grant.charged',
  ASSET_CREATED: 'procurement.asset.created',

  // Orchestrator events (published by this orchestrator)
  SAGA_STARTED: 'procurement.saga.started',
  SAGA_STEP_COMPLETED: 'procurement.saga.step_completed',
  SAGA_STEP_FAILED: 'procurement.saga.step_failed',
  SAGA_COMPLETED: 'procurement.saga.completed',
  SAGA_COMPENSATING: 'procurement.saga.compensating',
  SAGA_FAILED: 'procurement.saga.failed',
} as const;

export type ProcurementEventTypeValue = typeof ProcurementEventType[keyof typeof ProcurementEventType];

export interface ProcurementEvent {
  eventId: string;
  eventType: ProcurementEventTypeValue;
  payload: Record<string, unknown>;
  metadata: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
    timestamp: string;
    correlationId: string;    // Links all events in one saga
    sagaId?: string;
    sourceEngine: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// SAGA TYPES
// ────────────────────────────────────────────────────────────────────────────

export type SagaStatus = 'running' | 'completed' | 'compensating' | 'failed' | 'partially_completed';

export type SagaStepName =
  | 'inventory_disposition'
  | 'three_way_matching'
  | 'budget_availability_check'
  | 'payment_release'
  | 'gl_posting'
  | 'budget_commitment_update'
  | 'grant_charge'
  | 'asset_creation'
  | 'knowledge_graph_update'
  | 'notification'
  | 'audit_log';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'compensated';

export interface SagaStep {
  stepName: SagaStepName;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
  compensationAction?: string;
  compensated?: boolean;
  durationMs?: number;
  retryCount: number;
  maxRetries: number;
}

export interface P2PSaga {
  sagaId: string;
  sagaType: string;
  status: SagaStatus;

  // Source context
  correlationId: string;
  poId: number;
  grnId?: number;
  invoiceId?: number;

  // Scope
  organizationId: number;
  operatingUnitId: number;
  initiatedBy: number;
  initiatedAt: string;

  // Steps
  steps: SagaStep[];
  currentStep: SagaStepName | null;
  completedSteps: number;
  totalSteps: number;

  // Timing
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;

  // Results
  matchingResult?: Record<string, unknown>;
  paymentId?: number;
  journalEntryId?: number;
  assetIds?: number[];

  // Error
  lastError?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// SAGA DEFINITION — configurable step chains
// ────────────────────────────────────────────────────────────────────────────

export interface SagaDefinition {
  sagaType: string;
  description: string;
  triggerEvent: ProcurementEventTypeValue;
  steps: SagaStepDefinition[];
}

export interface SagaStepDefinition {
  stepName: SagaStepName;
  /** Engine method to call */
  action: string;
  /** Whether this step is mandatory (failure blocks saga) */
  mandatory: boolean;
  /** Max retries before failing */
  maxRetries: number;
  /** Timeout in ms */
  timeoutMs: number;
  /** Compensation action if saga rolls back past this step */
  compensationAction?: string;
  /** Rules to evaluate before executing (UnifiedRulesCore) */
  preConditionRules?: string[];
  /** Depends on previous step result */
  dependsOn?: SagaStepName;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE ADAPTERS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Each engine is wrapped in an adapter so the orchestrator
 * doesn't directly depend on engine constructors.
 */
export interface IP2PStepExecutor {
  readonly stepName: SagaStepName;

  execute(
    sagaContext: SagaContext,
    scope: RepositoryScope,
  ): Promise<StepResult>;

  compensate?(
    sagaContext: SagaContext,
    scope: RepositoryScope,
  ): Promise<void>;
}

export interface SagaContext {
  sagaId: string;
  correlationId: string;
  poId: number;
  grnId?: number;
  invoiceId?: number;
  /** Accumulated results from previous steps */
  stepResults: Record<SagaStepName, Record<string, unknown>>;
  userId: number;
}

export interface StepResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
  /** Should the saga continue? (false = stop but don't compensate) */
  continueOnFailure?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// EVENT BUS INTERFACE (simplified from Phase 3)
// ────────────────────────────────────────────────────────────────────────────

export interface IEventBus {
  publish(eventType: string, payload: Record<string, unknown>, metadata: Record<string, unknown>): Promise<void>;
  subscribe(eventType: string, handler: (event: ProcurementEvent) => Promise<void>): void;
}

export interface IRulesEngine {
  evaluate(domain: string, trigger: string, context: Record<string, unknown>, scope: RepositoryScope): Promise<{
    blocked: boolean;
    warnings: string[];
    requiresApproval: boolean;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// SAGA REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface ISagaRepository {
  save(saga: P2PSaga): Promise<void>;
  getById(sagaId: string): Promise<P2PSaga | null>;
  getByCorrelationId(correlationId: string): Promise<P2PSaga[]>;
  getByPO(poId: number, scope: RepositoryScope): Promise<P2PSaga[]>;
  update(sagaId: string, fields: Partial<P2PSaga>): Promise<void>;
  updateStep(sagaId: string, stepName: SagaStepName, fields: Partial<SagaStep>): Promise<void>;
  listActive(scope: RepositoryScope): Promise<P2PSaga[]>;
  listFailed(scope: RepositoryScope): Promise<P2PSaga[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ────────────────────────────────────────────────────────────────────────────

export interface P2POrchestratorDependencies {
  sagaRepo: ISagaRepository;
  eventBus: IEventBus;
  eventStore: IEventStore;
  rulesEngine: IRulesEngine;
  logger: ILogger;
  config: IConfigService;
}

export class P2PWorkflowOrchestrator {
  private sagaRepo: ISagaRepository;
  private eventBus: IEventBus;
  private eventStore: IEventStore;
  private rulesEngine: IRulesEngine;
  private logger: ILogger;
  private config: IConfigService;

  private executors = new Map<SagaStepName, IP2PStepExecutor>();
  private sagaDefinitions = new Map<string, SagaDefinition>();

  constructor(deps: P2POrchestratorDependencies) {
    this.sagaRepo = deps.sagaRepo;
    this.eventBus = deps.eventBus;
    this.eventStore = deps.eventStore;
    this.rulesEngine = deps.rulesEngine;
    this.logger = deps.logger.child({ service: 'P2PWorkflowOrchestrator' });
    this.config = deps.config;

    this.registerDefaultSagas();
  }

  // ────────────────────────────────────────────────────────────────────────
  // REGISTRATION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Register a step executor (one per engine adapter).
   */
  registerExecutor(executor: IP2PStepExecutor): void {
    this.executors.set(executor.stepName, executor);
    this.logger.info('Step executor registered', { step: executor.stepName });
  }

  /**
   * Register a saga definition (workflow template).
   */
  registerSaga(definition: SagaDefinition): void {
    this.sagaDefinitions.set(definition.sagaType, definition);
    this.logger.info('Saga definition registered', {
      sagaType: definition.sagaType,
      steps: definition.steps.length,
      trigger: definition.triggerEvent,
    });
  }

  /**
   * Subscribe to trigger events on the event bus.
   * Called once at application startup.
   */
  subscribeToEvents(): void {
    for (const [, definition] of this.sagaDefinitions) {
      this.eventBus.subscribe(definition.triggerEvent, async (event) => {
        await this.handleTriggerEvent(definition, event);
      });
    }
    this.logger.info('P2P Orchestrator subscribed to events', {
      sagaCount: this.sagaDefinitions.size,
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // SAGA EXECUTION
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Handle a trigger event — start a new saga.
   */
  private async handleTriggerEvent(
    definition: SagaDefinition,
    event: ProcurementEvent,
  ): Promise<void> {
    const sagaId = uuidv4();
    const scope: RepositoryScope = {
      organizationId: event.metadata.organizationId,
      operatingUnitId: event.metadata.operatingUnitId,
    };

    const saga: P2PSaga = {
      sagaId,
      sagaType: definition.sagaType,
      status: 'running',
      correlationId: event.metadata.correlationId || event.eventId,
      poId: (event.payload.poId as number) || 0,
      grnId: event.payload.grnId as number | undefined,
      invoiceId: event.payload.invoiceId as number | undefined,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
      initiatedBy: event.metadata.userId,
      initiatedAt: new Date().toISOString(),
      steps: definition.steps.map(s => ({
        stepName: s.stepName,
        status: 'pending' as StepStatus,
        retryCount: 0,
        maxRetries: s.maxRetries,
      })),
      currentStep: definition.steps[0]?.stepName || null,
      completedSteps: 0,
      totalSteps: definition.steps.length,
      startedAt: new Date().toISOString(),
    };

    await this.sagaRepo.save(saga);

    // Persist saga start event
    await this.eventStore.append({
      streamId: `saga:${sagaId}`,
      eventType: ProcurementEventType.SAGA_STARTED,
      payload: { sagaType: definition.sagaType, poId: saga.poId, trigger: event.eventType },
      metadata: { ...event.metadata, sagaId },
      timestamp: new Date().toISOString(),
    });

    this.logger.info('Saga started', {
      sagaId,
      sagaType: definition.sagaType,
      poId: saga.poId,
      steps: definition.steps.length,
    });

    // Execute steps sequentially
    await this.executeSaga(saga, definition, scope);
  }

  /**
   * Execute saga steps in sequence.
   * On failure of a mandatory step → initiate compensation.
   * On failure of an optional step → skip and continue.
   */
  private async executeSaga(
    saga: P2PSaga,
    definition: SagaDefinition,
    scope: RepositoryScope,
  ): Promise<void> {
    const context: SagaContext = {
      sagaId: saga.sagaId,
      correlationId: saga.correlationId,
      poId: saga.poId,
      grnId: saga.grnId,
      invoiceId: saga.invoiceId,
      stepResults: {},
      userId: saga.initiatedBy,
    };

    for (const stepDef of definition.steps) {
      const executor = this.executors.get(stepDef.stepName);
      if (!executor) {
        this.logger.warn('No executor for step — skipping', { step: stepDef.stepName, sagaId: saga.sagaId });
        await this.updateStepStatus(saga.sagaId, stepDef.stepName, 'skipped');
        continue;
      }

      // Check pre-condition rules
      if (stepDef.preConditionRules && stepDef.preConditionRules.length > 0) {
        const ruleResult = await this.rulesEngine.evaluate(
          'procurement',
          stepDef.stepName,
          { ...context.stepResults, poId: saga.poId, sagaId: saga.sagaId },
          scope,
        );

        if (ruleResult.blocked) {
          this.logger.warn('Step blocked by rules', {
            sagaId: saga.sagaId,
            step: stepDef.stepName,
            warnings: ruleResult.warnings,
          });

          if (stepDef.mandatory) {
            await this.failSaga(saga, stepDef.stepName, `Blocked by rules: ${ruleResult.warnings.join('; ')}`, definition, scope);
            return;
          }

          await this.updateStepStatus(saga.sagaId, stepDef.stepName, 'skipped');
          continue;
        }
      }

      // Execute step with retry
      const result = await this.executeStepWithRetry(
        saga.sagaId, stepDef, executor, context, scope,
      );

      if (result.success) {
        context.stepResults[stepDef.stepName] = result.data;
        saga.completedSteps++;
        await this.sagaRepo.update(saga.sagaId, {
          completedSteps: saga.completedSteps,
          currentStep: definition.steps[definition.steps.indexOf(stepDef) + 1]?.stepName || null,
        });

        // Persist step completion event
        await this.eventStore.append({
          streamId: `saga:${saga.sagaId}`,
          eventType: ProcurementEventType.SAGA_STEP_COMPLETED,
          payload: { step: stepDef.stepName, result: result.data },
          metadata: { sagaId: saga.sagaId, organizationId: scope.organizationId, timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
      } else {
        if (stepDef.mandatory) {
          await this.failSaga(saga, stepDef.stepName, result.error || 'Step failed', definition, scope);
          return;
        }

        // Optional step failed — log and continue
        this.logger.warn('Optional step failed — continuing saga', {
          sagaId: saga.sagaId,
          step: stepDef.stepName,
          error: result.error,
        });

        await this.updateStepStatus(saga.sagaId, stepDef.stepName, 'failed', result.error);
      }
    }

    // All steps completed
    const totalDuration = Date.now() - new Date(saga.startedAt).getTime();
    await this.sagaRepo.update(saga.sagaId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      totalDurationMs: totalDuration,
      currentStep: null,
    });

    await this.eventStore.append({
      streamId: `saga:${saga.sagaId}`,
      eventType: ProcurementEventType.SAGA_COMPLETED,
      payload: { totalSteps: saga.totalSteps, completedSteps: saga.completedSteps, durationMs: totalDuration },
      metadata: { sagaId: saga.sagaId, organizationId: scope.organizationId, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });

    this.logger.info('Saga completed', {
      sagaId: saga.sagaId,
      sagaType: saga.sagaType,
      completedSteps: saga.completedSteps,
      totalDurationMs: totalDuration,
    });
  }

  /**
   * Execute a single step with retry logic.
   */
  private async executeStepWithRetry(
    sagaId: string,
    stepDef: SagaStepDefinition,
    executor: IP2PStepExecutor,
    context: SagaContext,
    scope: RepositoryScope,
  ): Promise<StepResult> {
    let lastError = '';

    for (let attempt = 0; attempt <= stepDef.maxRetries; attempt++) {
      const stepStartTime = Date.now();

      await this.updateStepStatus(sagaId, stepDef.stepName, 'running');

      try {
        // Execute with timeout
        const result = await Promise.race<StepResult>([
          executor.execute(context, scope),
          new Promise<StepResult>((_, reject) =>
            setTimeout(() => reject(new Error(`Step ${stepDef.stepName} timed out after ${stepDef.timeoutMs}ms`)), stepDef.timeoutMs),
          ),
        ]);

        const durationMs = Date.now() - stepStartTime;

        if (result.success) {
          await this.sagaRepo.updateStep(sagaId, stepDef.stepName, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            result: result.data,
            durationMs,
            retryCount: attempt,
          });

          this.logger.info('Step completed', {
            sagaId, step: stepDef.stepName, attempt, durationMs,
          });

          return result;
        }

        lastError = result.error || 'Step returned failure';

      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      // Retry with exponential backoff
      if (attempt < stepDef.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        this.logger.warn('Step failed — retrying', {
          sagaId, step: stepDef.stepName, attempt, nextRetryMs: delay, error: lastError,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    await this.updateStepStatus(sagaId, stepDef.stepName, 'failed', lastError);

    return { success: false, data: {}, error: lastError };
  }

  // ────────────────────────────────────────────────────────────────────────
  // COMPENSATION (SAGA ROLLBACK)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Fail a saga and initiate compensation for completed steps.
   */
  private async failSaga(
    saga: P2PSaga,
    failedStep: SagaStepName,
    error: string,
    definition: SagaDefinition,
    scope: RepositoryScope,
  ): Promise<void> {
    this.logger.error('Saga failed — initiating compensation', {
      sagaId: saga.sagaId,
      failedStep,
      error,
      completedSteps: saga.completedSteps,
    });

    await this.sagaRepo.update(saga.sagaId, {
      status: 'compensating',
      lastError: error,
    });

    await this.eventStore.append({
      streamId: `saga:${saga.sagaId}`,
      eventType: ProcurementEventType.SAGA_COMPENSATING,
      payload: { failedStep, error, completedSteps: saga.completedSteps },
      metadata: { sagaId: saga.sagaId, organizationId: scope.organizationId, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });

    // Compensate completed steps in reverse order
    const completedStepDefs = definition.steps
      .filter(s => {
        const sagaStep = saga.steps.find(ss => ss.stepName === s.stepName);
        return sagaStep?.status === 'completed' && s.compensationAction;
      })
      .reverse();

    const context: SagaContext = {
      sagaId: saga.sagaId,
      correlationId: saga.correlationId,
      poId: saga.poId,
      grnId: saga.grnId,
      invoiceId: saga.invoiceId,
      stepResults: {},
      userId: saga.initiatedBy,
    };

    for (const stepDef of completedStepDefs) {
      const executor = this.executors.get(stepDef.stepName);
      if (!executor?.compensate) continue;

      try {
        await executor.compensate(context, scope);
        await this.sagaRepo.updateStep(saga.sagaId, stepDef.stepName, {
          compensated: true,
          compensationAction: stepDef.compensationAction,
        });

        this.logger.info('Step compensated', {
          sagaId: saga.sagaId,
          step: stepDef.stepName,
        });
      } catch (compError) {
        this.logger.error('Compensation failed — manual intervention required', {
          sagaId: saga.sagaId,
          step: stepDef.stepName,
          error: compError instanceof Error ? compError.message : String(compError),
        });
      }
    }

    // Mark saga as failed
    await this.sagaRepo.update(saga.sagaId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      totalDurationMs: Date.now() - new Date(saga.startedAt).getTime(),
    });

    await this.eventStore.append({
      streamId: `saga:${saga.sagaId}`,
      eventType: ProcurementEventType.SAGA_FAILED,
      payload: { failedStep, error, compensatedSteps: completedStepDefs.length },
      metadata: { sagaId: saga.sagaId, organizationId: scope.organizationId, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // VISIBILITY
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get end-to-end transaction visibility for a PO.
   */
  async getTransactionView(
    poId: number,
    scope: RepositoryScope,
  ): Promise<{
    poId: number;
    sagas: P2PSaga[];
    currentStatus: string;
    totalStepsCompleted: number;
    totalStepsFailed: number;
    timeline: Array<{
      timestamp: string;
      step: string;
      status: string;
      durationMs?: number;
      error?: string;
    }>;
  }> {
    const sagas = await this.sagaRepo.getByPO(poId, scope);

    const timeline: Array<{
      timestamp: string;
      step: string;
      status: string;
      durationMs?: number;
      error?: string;
    }> = [];

    let totalCompleted = 0;
    let totalFailed = 0;

    for (const saga of sagas) {
      for (const step of saga.steps) {
        if (step.status !== 'pending') {
          timeline.push({
            timestamp: step.startedAt || saga.startedAt,
            step: step.stepName,
            status: step.status,
            durationMs: step.durationMs,
            error: step.error,
          });
        }
        if (step.status === 'completed') totalCompleted++;
        if (step.status === 'failed') totalFailed++;
      }
    }

    timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const latest = sagas[sagas.length - 1];
    const currentStatus = latest?.status || 'no_sagas';

    return { poId, sagas, currentStatus, totalStepsCompleted: totalCompleted, totalStepsFailed: totalFailed, timeline };
  }

  /**
   * Get all active sagas (for monitoring dashboard).
   */
  async getActiveSagas(scope: RepositoryScope): Promise<P2PSaga[]> {
    return this.sagaRepo.listActive(scope);
  }

  /**
   * Get all failed sagas (for intervention queue).
   */
  async getFailedSagas(scope: RepositoryScope): Promise<P2PSaga[]> {
    return this.sagaRepo.listFailed(scope);
  }

  /**
   * Manually retry a failed saga from the failed step.
   */
  async retrySaga(sagaId: string, userId: number, scope: RepositoryScope): Promise<void> {
    const saga = await this.sagaRepo.getById(sagaId);
    if (!saga) throw new Error(`Saga ${sagaId} not found`);
    if (saga.status !== 'failed') throw new Error('Can only retry failed sagas');

    const definition = this.sagaDefinitions.get(saga.sagaType);
    if (!definition) throw new Error(`Saga definition ${saga.sagaType} not found`);

    // Reset failed steps to pending
    for (const step of saga.steps) {
      if (step.status === 'failed') {
        await this.sagaRepo.updateStep(sagaId, step.stepName, {
          status: 'pending',
          error: undefined,
          retryCount: step.retryCount,
        });
      }
    }

    await this.sagaRepo.update(sagaId, {
      status: 'running',
      lastError: undefined,
      initiatedBy: userId,
    });

    this.logger.info('Saga retry initiated', { sagaId, userId });
    await this.executeSaga(saga, definition, scope);
  }

  // ────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ────────────────────────────────────────────────────────────────────────

  private async updateStepStatus(
    sagaId: string,
    stepName: SagaStepName,
    status: StepStatus,
    error?: string,
  ): Promise<void> {
    const fields: Partial<SagaStep> = { status };
    if (status === 'running') fields.startedAt = new Date().toISOString();
    if (status === 'completed') fields.completedAt = new Date().toISOString();
    if (status === 'failed') { fields.failedAt = new Date().toISOString(); fields.error = error; }
    await this.sagaRepo.updateStep(sagaId, stepName, fields);
  }

  // ────────────────────────────────────────────────────────────────────────
  // DEFAULT SAGA DEFINITIONS
  // ────────────────────────────────────────────────────────────────────────

  private registerDefaultSagas(): void {
    // ── Saga 1: GRN → Payment (the main P2P post-receipt flow) ──
    this.registerSaga({
      sagaType: 'grn_to_payment',
      description: 'Complete post-receipt flow: inventory/asset → matching → payment → GL → grant',
      triggerEvent: ProcurementEventType.GRN_ACCEPTED,
      steps: [
        {
          stepName: 'inventory_disposition',
          action: 'InventoryAssetAutomationEngine.processGRN',
          mandatory: false,
          maxRetries: 2,
          timeoutMs: 30000,
        },
        {
          stepName: 'three_way_matching',
          action: 'ThreeWayMatchingEngine.match',
          mandatory: true,
          maxRetries: 1,
          timeoutMs: 15000,
        },
        {
          stepName: 'budget_availability_check',
          action: 'BudgetAvailabilityEngine.checkAvailability',
          mandatory: true,
          maxRetries: 1,
          timeoutMs: 10000,
          preConditionRules: ['budget_availability'],
        },
        {
          stepName: 'payment_release',
          action: 'PaymentsRouter.releasePayment',
          mandatory: true,
          maxRetries: 2,
          timeoutMs: 20000,
          compensationAction: 'PaymentsRouter.reversePayment',
        },
        {
          stepName: 'gl_posting',
          action: 'GLPostingPipeline.post',
          mandatory: true,
          maxRetries: 2,
          timeoutMs: 15000,
          compensationAction: 'GLPostingPipeline.reverse',
          dependsOn: 'payment_release',
        },
        {
          stepName: 'budget_commitment_update',
          action: 'BudgetCommitmentEngine.recordPayment',
          mandatory: true,
          maxRetries: 2,
          timeoutMs: 10000,
          dependsOn: 'gl_posting',
        },
        {
          stepName: 'grant_charge',
          action: 'DonorReportingEngine.chargeToGrant',
          mandatory: false,
          maxRetries: 1,
          timeoutMs: 10000,
          dependsOn: 'gl_posting',
        },
        {
          stepName: 'knowledge_graph_update',
          action: 'ProcurementKnowledgeGraphEngine.addEdges',
          mandatory: false,
          maxRetries: 1,
          timeoutMs: 5000,
        },
        {
          stepName: 'notification',
          action: 'NotificationService.notifyStakeholders',
          mandatory: false,
          maxRetries: 1,
          timeoutMs: 5000,
        },
        {
          stepName: 'audit_log',
          action: 'AuditService.logTransaction',
          mandatory: false,
          maxRetries: 2,
          timeoutMs: 5000,
        },
      ],
    });

    // ── Saga 2: Invoice → Matching (when invoice arrives before GRN) ──
    this.registerSaga({
      sagaType: 'invoice_matching',
      description: 'Invoice received — perform matching and queue for payment',
      triggerEvent: ProcurementEventType.INVOICE_RECEIVED,
      steps: [
        {
          stepName: 'three_way_matching',
          action: 'ThreeWayMatchingEngine.match',
          mandatory: true,
          maxRetries: 1,
          timeoutMs: 15000,
        },
        {
          stepName: 'budget_availability_check',
          action: 'BudgetAvailabilityEngine.checkAvailability',
          mandatory: true,
          maxRetries: 1,
          timeoutMs: 10000,
        },
        {
          stepName: 'notification',
          action: 'NotificationService.notifyMatchingResult',
          mandatory: false,
          maxRetries: 1,
          timeoutMs: 5000,
        },
        {
          stepName: 'audit_log',
          action: 'AuditService.logMatching',
          mandatory: false,
          maxRetries: 1,
          timeoutMs: 5000,
        },
      ],
    });
  }
}
