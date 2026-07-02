/**
 * FinanceOrchestratorInterfaces.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Finance Orchestrator: Enterprise Component Interfaces
 * 
 * PHASE 2 ENHANCEMENT: Interface definitions (contracts only)
 * 
 * Per Mosa's recommendation: Define interfaces for enterprise services
 * WITHOUT implementations. This:
 * 
 * ✅ Decouples Orchestrator from implementations
 * ✅ Prepares for CQRS + Event Sourcing (Phase 3+)
 * ✅ Allows parallel development of services
 * ✅ Creates clear boundaries and contracts
 * ✅ Documents architecture intention
 * 
 * Services referenced here will be implemented in Phase 3+.
 * For now, they are contracts that Orchestrator depends on.
 * 
 * Architecture Vision:
 *   FinanceOrchestrator ↓ (coordinates, never decides)
 *   ├── RuleEngine ↓ (evaluates donor/budget/treasury/procurement rules)
 *   ├── DecisionEngine ↓ (recommends, evaluates, simulates)
 *   ├── DomainEventBus ↓ (publishes, subscribes, replays events)
 *   ├── EventStore ↓ (immutable event log)
 *   ├── AuditEngine ↓ (records, replays, verifies audit trail)
 *   ├── NotificationGateway ↓ (Email, SMS, Teams, Slack, WhatsApp, Push)
 *   ├── WorkflowEngine ↓ (orchestrates complex workflows)
 *   └── KnowledgeGraph ↓ (domain knowledge, entity relations)
 */

import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// FINANCIAL COMMAND/QUERY PATTERN (CQRS preparation)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Base Financial Command
 * Commands represent intent to change state.
 * Each command includes full context for audit trail and replay.
 */
export interface IFinancialCommand {
  commandId: string; // UUID for idempotency
  commandType: string; // PostJournalCommand, AllocateBudgetCommand, etc.
  sourceEventId: string; // Original event triggering this command
  timestamp: string; // ISO 8601
  organizationId: number;
  operatingUnitId: number;
  userId: number;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>; // Correlation IDs, trace IDs, etc.
}

/**
 * Base Financial Query
 * Queries represent requests for data without changing state.
 */
export interface IFinancialQuery {
  queryId: string; // UUID for tracking
  queryType: string; // GetJournalEntriesQuery, GetBudgetQuery, etc.
  timestamp: string; // ISO 8601
  organizationId: number;
  operatingUnitId: number;
  userId: number;
  criteria: Record<string, unknown>;
}

/**
 * Query Result
 */
export interface IFinancialQueryResult<T> {
  status: 'ok' | 'not_found' | 'error';
  data?: T;
  error?: { code: string; message: string };
  timestamp: string;
}

// ────────────────────────────────────────────────────────────────────────────
// FINANCIAL COMMAND TYPES
// ────────────────────────────────────────────────────────────────────────────

/**
 * Command: Post Journal Entry (GL)
 * Payload: GLPostingPayload from FinanceOrchestratorTypes
 */
export interface IPostJournalCommand extends IFinancialCommand {
  commandType: 'PostJournalCommand';
  payload: {
    entryDate: string;
    description: string;
    entryType: string;
    sourceModule: string;
    lines: Array<{
      lineNumber: number;
      glAccountId: number;
      debitAmount: number;
      creditAmount: number;
    }>;
  };
}

/**
 * Command: Allocate Budget
 */
export interface IAllocateBudgetCommand extends IFinancialCommand {
  commandType: 'AllocateBudgetCommand';
  payload: {
    budgetId: number;
    allocationAmount: number;
    fiscalMonth: string;
  };
}

/**
 * Command: Issue Advance
 */
export interface IIssueAdvanceCommand extends IFinancialCommand {
  commandType: 'IssueAdvanceCommand';
  payload: {
    employeeId: number;
    advanceType: string;
    amount: number;
    currency: string;
    purpose: string;
  };
}

/**
 * Command: Liquidate Advance
 */
export interface ILiquidateAdvanceCommand extends IFinancialCommand {
  commandType: 'LiquidateAdvanceCommand';
  payload: {
    advanceId: number;
    settlementAmount: number;
    settlementDate: string;
  };
}

/**
 * Command: Process Payment
 */
export interface IProcessPaymentCommand extends IFinancialCommand {
  commandType: 'ProcessPaymentCommand';
  payload: {
    vendorId?: number;
    amount: number;
    currency: string;
    paymentMethod: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN EVENT BUS INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Domain Event Bus Interface
 * 
 * Responsible for:
 * - Publishing domain events (immutable facts that happened)
 * - Subscribing to events (handlers react to events)
 * - Replaying events (temporal queries, state reconstruction)
 * - Dead letter queue (failed events)
 * - Retry mechanism (exponential backoff)
 * - Snapshots (performance optimization)
 * 
 * Per ADR-002 (Event Bus source of truth):
 * Events are immutable, timestamped, and scoped by org/OU.
 * All finance operations flow through the event bus.
 */
export interface IDomainEventBus {
  /**
   * Publish an event to the bus.
   * Returns immediately (async fire-and-forget or guaranteed delivery based on impl).
   */
  publish<T = Record<string, unknown>>(
    eventType: string,
    payload: T,
    context: {
      sourceEventId: string;
      organizationId: number;
      operatingUnitId: number;
      userId: number;
      timestamp?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ eventId: string; publishedAt: string }>;

  /**
   * Subscribe to event(s).
   * Handler called for each matching event (past and future).
   */
  subscribe(
    eventPattern: string | string[], // 'GL_POSTED', 'ADVANCE_*', '*'
    handler: (
      eventType: string,
      payload: Record<string, unknown>,
      metadata: {
        eventId: string;
        timestamp: string;
        sourceEventId: string;
        organizationId: number;
        operatingUnitId: number;
        userId: number;
      }
    ) => Promise<void>,
    options?: {
      fromTimestamp?: string; // Start from specific time
      groupId?: string; // For distributed consumers
      maxRetries?: number; // Automatic retry count
    }
  ): Promise<{ subscriptionId: string }>;

  /**
   * Unsubscribe from events.
   */
  unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Replay events from a time range.
   * Used for debugging, testing, state reconstruction.
   */
  replay(
    filters: {
      eventTypePattern?: string;
      organizationId?: number;
      operatingUnitId?: number;
      sourceEventIdPattern?: string;
      fromTimestamp?: string;
      toTimestamp?: string;
    },
    handler: (
      eventType: string,
      payload: Record<string, unknown>,
      metadata: Record<string, unknown>
    ) => Promise<void>
  ): Promise<{ eventsReplayed: number; duration: string }>;

  /**
   * Send event to dead letter queue.
   * Used when event processing fails permanently.
   */
  deadLetter(
    eventId: string,
    reason: string,
    context: Record<string, unknown>
  ): Promise<void>;

  /**
   * Retry failed event processing.
   * Implements exponential backoff.
   */
  retry(
    eventId: string,
    maxAttempts?: number,
    backoffMs?: number
  ): Promise<{ retryScheduled: boolean; nextRetryAt?: string }>;

  /**
   * Create a snapshot of event stream state.
   * Optimization: instead of replaying all events, start from snapshot.
   */
  snapshot(
    snapshotId: string,
    stateHash: string,
    metadata: Record<string, unknown>
  ): Promise<{ snapshotId: string; createdAt: string }>;
}

// ────────────────────────────────────────────────────────────────────────────
// EVENT STORE INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Event Store Interface
 * 
 * Immutable log of all domain events.
 * Single source of truth for application state.
 * 
 * Per ADR-002 and event sourcing principles:
 * - append() adds events (never updates/deletes)
 * - load() retrieves event stream
 * - stream() tails event stream for consumption
 * - replay() reconstructs state from events
 * - checkpoint() marks progress for resumable streams
 * - snapshot() performance optimization
 */
export interface IEventStore {
  /**
   * Append an event to the store.
   * Returns immediately; event is durably persisted.
   */
  append(
    streamId: string, // Aggregate root ID (e.g., \"journal-entry-123\")
    eventType: string,
    payload: Record<string, unknown>,
    metadata: {
      sourceEventId: string; // For idempotency
      organizationId: number;
      operatingUnitId: number;
      userId: number;
      timestamp?: string;
      expectedVersion?: number; // For optimistic concurrency
    }
  ): Promise<{
    eventId: string;
    version: number; // Event sequence number
    appendedAt: string;
  }>;

  /**
   * Load events for a stream.
   */
  load(
    streamId: string,
    options?: {
      fromVersion?: number;
      toVersion?: number;
      limit?: number;
    }
  ): Promise<
    Array<{
      eventId: string;
      streamId: string;
      version: number;
      eventType: string;
      payload: Record<string, unknown>;
      timestamp: string;
      sourceEventId: string;
    }>
  >;

  /**
   * Stream events (tail-like behavior).
   * Useful for event processing pipelines.
   */
  stream(
    filters?: {
      eventTypePattern?: string;
      organizationId?: number;
      operatingUnitId?: number;
      fromTimestamp?: string;
      toTimestamp?: string;
    },
    onEvent?: (
      event: Record<string, unknown>
    ) => Promise<void>
  ): AsyncIterable<Record<string, unknown>>;

  /**
   * Replay events to reconstruct state.
   */
  replay(
    streamId: string,
    reducer: (state: Record<string, unknown>, event: Record<string, unknown>) => Record<string, unknown>,
    initialState?: Record<string, unknown>
  ): Promise<Record<string, unknown>>;

  /**
   * Mark progress in event stream.
   * Used for resumable event processing.
   */
  checkpoint(
    consumerId: string,
    streamId: string,
    eventId: string,
    offset: number
  ): Promise<void>;

  /**
   * Create snapshot for performance.
   */
  snapshot(
    streamId: string,
    stateData: Record<string, unknown>,
    version: number
  ): Promise<{ snapshotId: string; createdAt: string }>;
}

// ────────────────────────────────────────────────────────────────────────────
// RULE ENGINE INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Rule Engine Interface
 * 
 * Evaluates business rules without hardcoding them in Orchestrator.
 * 
 * Finance Orchestrator NEVER directly encodes:
 * - Donor rules (e.g., \"Donor X allows only Y% overhead\")
 * - Budget rules (e.g., \"Budget cannot exceed Z\")
 * - Treasury rules (e.g., \"Cash position must stay > threshold\")
 * - Procurement rules (e.g., \"Competitive bidding required > amount\")
 * 
 * Instead: RuleEngine.evaluate() → Decision
 * 
 * This separates:
 * - Orchestrator (coordinates)
 * - RuleEngine (evaluates rules)
 * - Returned decision (used to determine action)
 */
export interface IRuleEngine {
  /**
   * Evaluate a ruleset against a context.
   * Returns decision with matching rules and recommendations.
   */
  evaluate(
    rulesetId: string, // e.g., \"budget_rules\", \"donor_rules\", \"procurement_rules\"
    context: Record<string, unknown>, // facts to evaluate against
    organizationId: number,
    operatingUnitId: number
  ): Promise<{
    rulesetId: string;
    decision: 'approved' | 'rejected' | 'conditional';
    matchedRules: Array<{
      ruleId: string;
      ruleName: string;
      condition: string;
      result: string;
    }>;
    recommendations: string[];
    reasoning: string;
    timestamp: string;
  }>;

  /**
   * Load rules from source (database, file, etc).
   */
  loadRules(
    rulesetId: string,
    organizationId: number
  ): Promise<{
    rulesetId: string;
    version: number;
    rulesCount: number;
    loadedAt: string;
  }>;

  /**
   * Reload rules (refresh cache, pick up changes).
   */
  reloadRules(
    rulesetId?: string, // Reload all if not specified
    organizationId?: number
  ): Promise<{
    reloadedRulesets: string[];
    timestamp: string;
  }>;

  /**
   * Validate a ruleset for syntax/logic errors.
   */
  validate(
    rulesetId: string,
    organizationId: number
  ): Promise<{
    valid: boolean;
    errors?: Array<{ line: number; message: string }>;
    warnings?: Array<{ line: number; message: string }>;
  }>;

  /**
   * Explain why a decision was made.
   * Useful for transparency, debugging, compliance.
   */
  explain(
    rulesetId: string,
    context: Record<string, unknown>,
    organizationId: number,
    operatingUnitId: number
  ): Promise<{
    decision: string;
    executionTrace: Array<{
      step: number;
      rule: string;
      condition: string;
      result: boolean;
    }>;
    explanation: string; // Human-readable decision explanation
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// DECISION ENGINE INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Decision Engine Interface
 * 
 * Recommends, evaluates, and simulates financial decisions.
 * Works WITH RuleEngine, not instead of it.
 * 
 * RuleEngine: \"Does this comply with policy?\" → Yes/No
 * DecisionEngine: \"Should we do this?\" → Recommend/Simulate/Evaluate
 */
export interface IDecisionEngine {
  /**
   * Recommend a financial action.
   * Uses historical data, ML models, rules to suggest next step.
   */
  recommend(
    scenario: string, // 'payment_allocation', 'budget_revision', 'advance_issuance'
    context: Record<string, unknown>,
    organizationId: number,
    operatingUnitId: number
  ): Promise<{
    scenario: string;
    recommendation: string;
    confidence: number; // 0-1
    reasoning: string;
    alternatives: Array<{ action: string; confidence: number }>;
    timestamp: string;
  }>;

  /**
   * Evaluate an action against decision criteria.
   * Returns score/rating for the proposed action.
   */
  evaluate(
    scenario: string,
    proposedAction: Record<string, unknown>,
    criteria?: Record<string, number>, // Weights for scoring
    organizationId?: number,
    operatingUnitId?: number
  ): Promise<{
    scenario: string;
    action: Record<string, unknown>;
    score: number; // 0-100
    rating: 'excellent' | 'good' | 'fair' | 'poor';
    rationale: string;
    improvements?: string[];
  }>;

  /**
   * Simulate outcomes of a decision.
   * \"What if we do X? What happens to Y?\"
   */
  simulate(
    scenario: string,
    proposal: Record<string, unknown>,
    timeHorizon?: string, // '1_month', '3_months', '1_year'
    organizationId?: number,
    operatingUnitId?: number
  ): Promise<{
    scenario: string;
    proposal: Record<string, unknown>;
    simulatedOutcomes: Array<{
      metric: string; // 'cash_balance', 'budget_utilization', etc.
      currentValue: number;
      projectedValue: number;
      change: number;
      changePercent: number;
    }>;
    risks: Array<{ risk: string; probability: number; impact: string }>;
    opportunities: Array<{ opportunity: string; potential: string }>;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// AUDIT ENGINE INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Audit Engine Interface
 * 
 * Instead of: Orchestrator publishes audit events
 * Use: AuditEngine.record() + verify() + compare() + replay()
 * 
 * Provides:
 * - Immutable audit trail
 * - Compliance reporting
 * - Change detection
 * - State comparison
 * - Forensic analysis
 */
export interface IAuditEngine {
  /**
   * Record an audit event.
   */
  record(
    entityType: string, // 'journal_entry', 'budget', 'advance', etc.
    entityId: number,
    action: string, // 'create', 'update', 'delete', 'approve', 'reject'
    before?: Record<string, unknown>, // State before change
    after?: Record<string, unknown>, // State after change
    context?: {
      userId: number;
      organizationId: number;
      operatingUnitId: number;
      reason?: string;
      sourceEventId?: string;
    }
  ): Promise<{ auditId: string; recordedAt: string }>;

  /**
   * Replay audit history for an entity.
   */
  replay(
    entityType: string,
    entityId: number,
    fromTimestamp?: string,
    toTimestamp?: string
  ): Promise<
    Array<{
      auditId: string;
      timestamp: string;
      action: string;
      userId: number;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    }>
  >;

  /**
   * Compare states at two points in time.
   * Returns what changed and why.
   */
  compare(
    entityType: string,
    entityId: number,
    timestamp1: string,
    timestamp2: string
  ): Promise<{
    entityType: string;
    entityId: number;
    timestamp1: string;
    timestamp2: string;
    changes: Array<{
      field: string;
      valueAt1: unknown;
      valueAt2: unknown;
      changedBy: number;
      changedAt: string;
      reason?: string;
    }>;
  }>;

  /**
   * Verify audit trail integrity.
   * Detects gaps, tampering, missing records.
   */
  verify(
    entityType?: string,
    organizationId?: number,
    operatingUnitId?: number
  ): Promise<{
    status: 'valid' | 'warning' | 'invalid';
    entriesChecked: number;
    gaps: Array<{ from: string; to: string; missingCount: number }>;
    anomalies: Array<{ description: string; severity: 'info' | 'warning' | 'error' }>;
    lastVerifiedAt: string;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// NOTIFICATION GATEWAY INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Notification Gateway Interface
 * 
 * Sends notifications to users via multiple channels.
 * Subscribes to domain events and routes to appropriate channels.
 * 
 * Supported channels (Phase 3+):
 * - Email
 * - SMS
 * - Microsoft Teams
 * - Slack
 * - WhatsApp
 * - Mobile Push Notifications
 */
export interface INotificationGateway {
  /**
   * Send notification via one or more channels.
   */
  send(
    recipients: {
      userId?: number;
      email?: string;
      phoneNumber?: string;
      teamsId?: string;
      slackId?: string;
      whatsappId?: string;
      deviceToken?: string; // For push notifications
    },
    message: {
      subject?: string; // For email
      body: string;
      htmlBody?: string;
      actionUrl?: string; // \"Approve\" button URL, etc.
      metadata?: Record<string, unknown>;
    },
    channels: ('email' | 'sms' | 'teams' | 'slack' | 'whatsapp' | 'push')[],
    context?: {
      organizationId: number;
      operatingUnitId: number;
      sourceEventId?: string;
    }
  ): Promise<{
    notificationId: string;
    sentAt: string;
    results: Array<{
      channel: string;
      status: 'sent' | 'failed' | 'unsupported';
      error?: string;
    }>;
  }>;

  /**
   * Subscribe to domain events and auto-notify.
   * When event occurs, notification sent automatically.
   */
  subscribe(
    eventPattern: string, // 'ADVANCE_APPROVED', 'BUDGET_EXCEEDED', etc.
    template: string, // Template ID
    channels: ('email' | 'sms' | 'teams' | 'slack' | 'whatsapp' | 'push')[],
    recipientMapping: (eventPayload: Record<string, unknown>) => {
      userId?: number;
      email?: string;
      phoneNumber?: string;
      teamsId?: string;
      slackId?: string;
    }
  ): Promise<{ subscriptionId: string }>;

  /**
   * Get notification history.
   */
  history(
    organizationId: number,
    filters?: {
      userId?: number;
      channel?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<
    Array<{
      notificationId: string;
      recipientId: number;
      channel: string;
      status: string;
      sentAt: string;
      deliveredAt?: string;
    }>
  >;
}

// ────────────────────────────────────────────────────────────────────────────
// WORKFLOW ENGINE INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Workflow Engine Interface
 * 
 * Orchestrates complex, multi-step business processes.
 * Similar to saga pattern but more flexible.
 * 
 * Examples:
 * - Approval workflows (Manager → Finance → Executive)
 * - Budget cycle (Plan → Submit → Review → Approve → Execute)
 * - Procurement (RFQ → Bid evaluation → PO → Delivery → Invoice → Payment)
 */
export interface IWorkflowEngine {
  /**
   * Initiate a workflow.
   */
  start(
    workflowType: string, // 'approval_workflow', 'budget_cycle', etc.
    input: Record<string, unknown>,
    context: {
      organizationId: number;
      operatingUnitId: number;
      initiatedBy: number;
    }
  ): Promise<{ workflowId: string; currentStep: string; startedAt: string }>;

  /**
   * Transition workflow to next step.
   */
  transition(
    workflowId: string,
    nextStep: string,
    data?: Record<string, unknown>,
    approverUserId?: number
  ): Promise<{ workflowId: string; currentStep: string; transitionedAt: string }>;

  /**
   * Get workflow state.
   */
  getState(
    workflowId: string
  ): Promise<{
    workflowId: string;
    workflowType: string;
    currentStep: string;
    status: 'active' | 'completed' | 'failed' | 'paused';
    data: Record<string, unknown>;
    history: Array<{ step: string; transitionedAt: string; by: number }>;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE GRAPH INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Knowledge Graph Interface
 * 
 * Stores and queries domain knowledge.
 * Enables:
 * - Entity relationships (Org → Donors → Projects → Budgets → Advances)
 * - Impact analysis (If I change X, what else is affected?)
 * - Pattern matching (Who are similar organizations?)
 * - ML/AI features (Recommendations, predictions)
 */
export interface IKnowledgeGraph {
  /**
   * Add a node (entity) to the graph.
   */
  addNode(
    nodeType: string, // 'organization', 'donor', 'project', 'budget', etc.
    nodeId: number,
    properties: Record<string, unknown>,
    context?: { organizationId: number }
  ): Promise<{ nodeId: string; createdAt: string }>;

  /**
   * Add an edge (relationship) between nodes.
   */
  addEdge(
    fromNodeType: string,
    fromNodeId: number,
    edgeType: string, // 'funds', 'managed_by', 'contains', etc.
    toNodeType: string,
    toNodeId: number,
    properties?: Record<string, unknown>
  ): Promise<{ edgeId: string; createdAt: string }>;

  /**
   * Query related entities.
   * Returns all entities connected by relationship.
   */
  query(
    nodeType: string,
    nodeId: number,
    relationshipPattern?: string, // '*' or 'funds', 'contains', etc.
    depth?: number // How many hops away
  ): Promise<
    Array<{
      nodeType: string;
      nodeId: number;
      relationship: string;
      distance: number;
      properties: Record<string, unknown>;
    }>
  >;

  /**
   * Analyze impact of change.
   * What entities are affected if we change X?
   */
  analyzeImpact(
    nodeType: string,
    nodeId: number,
    change: Record<string, unknown>,
    depth?: number
  ): Promise<{
    directlyAffected: Array<{
      nodeType: string;
      nodeId: number;
      relationship: string;
    }>;
    indirectlyAffected: Array<{
      nodeType: string;
      nodeId: number;
      path: string; // \"org → project → budget → advance\"
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACE REGISTRATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Interface Registry
 * 
 * Aggregates all enterprise component interfaces.
 * Used for dependency injection and service discovery.
 * 
 * Phase 3+: Will be implemented as:
 * - IDomainEventBus → DomainEventBusImpl (RabbitMQ, Kafka, etc.)
 * - IEventStore → EventStoreImpl (PostgreSQL, EventStoreDB, etc.)
 * - IRuleEngine → RuleEngineImpl (Drools, Easy Rules, custom)
 * - IAuditEngine → AuditEngineImpl (PostgreSQL audit log)
 * - INotificationGateway → NotificationGatewayImpl (SendGrid, Twilio, Teams API, etc.)
 * - IWorkflowEngine → WorkflowEngineImpl (Temporal, Airflow, custom)
 * - IDecisionEngine → DecisionEngineImpl (ML models, rules-based)
 * - IKnowledgeGraph → KnowledgeGraphImpl (Neo4j, TigerGraph, custom)
 */
export interface IEnterpriseComponentRegistry {
  domainEventBus: IDomainEventBus;
  eventStore: IEventStore;
  ruleEngine: IRuleEngine;
  auditEngine: IAuditEngine;
  notificationGateway: INotificationGateway;
  workflowEngine: IWorkflowEngine;
  decisionEngine: IDecisionEngine;
  knowledgeGraph: IKnowledgeGraph;
}

// ────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR DEPENDENCY CONTAINER
// ────────────────────────────────────────────────────────────────────────────

/**
 * Finance Orchestrator Dependencies
 * 
 * Phase 2: Orchestrator depends on INTERFACES (contracts).
 * Phase 3+: Implementations provided at startup.
 * 
 * This loose coupling allows:
 * - Parallel development of implementations
 * - Easy testing with mock implementations
 * - Swapping implementations (e.g., Kafka → RabbitMQ)
 * - Progressive feature rollout
 */
export interface IFinanceOrchestratorDependencies {
  domainEventBus: IDomainEventBus; // For publishing orchestration events
  eventStore?: IEventStore; // Optional: for event sourcing
  ruleEngine?: IRuleEngine; // Optional: for rule evaluation
  auditEngine?: IAuditEngine; // Optional: for audit trail
  notificationGateway?: INotificationGateway; // Optional: for notifications
  workflowEngine?: IWorkflowEngine; // Optional: for complex workflows
  decisionEngine?: IDecisionEngine; // Optional: for recommendations
  knowledgeGraph?: IKnowledgeGraph; // Optional: for entity relationships
}

/**
 * NOTE: During Phase 2, these dependencies are optional.
 * Orchestrator works with just DomainEventBus (required).
 * Other services are integrated in Phase 3+ as they're implemented.
 */

// ────────────────────────────────────────────────────────────────────────────
// PLATFORM INFRASTRUCTURE INTERFACES (Phase 3 Hardened)
// ────────────────────────────────────────────────────────────────────────────
// These interfaces are consumed by ALL engines across the system:
//   - Budget Intelligence (Phase 5)
//   - Enterprise Performance Management (Phase 6)
//   - Treasury (Phase 7)
//   - Reporting (Phase 10)
//   - Procurement Enhanced
//   - Export Platform
// ────────────────────────────────────────────────────────────────────────────

/**
 * Structured logger interface.
 * Replaces console.log across the entire codebase.
 * In production: backed by Pino, Winston, or similar.
 */
export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  fatal(message: string, context?: Record<string, unknown>): void;

  /** Create a child logger with pre-bound context fields */
  child(bindings: Record<string, unknown>): ILogger;
}

/**
 * Centralised configuration service.
 * Values come from env vars, DB, or config files — never hardcoded.
 * Supports typed access with defaults.
 */
export interface IConfigService {
  get<T = string>(key: string, defaultValue?: T): T;
  getNumber(key: string, defaultValue?: number): number;
  getBoolean(key: string, defaultValue?: boolean): boolean;
  getString(key: string, defaultValue?: string): string;

  /** Reload config from source (for dynamic tuning) */
  reload(): Promise<void>;
}

/**
 * Organization/OU scope for multi-tenant isolation.
 * Always sourced from ctx.scope — NEVER from user input.
 *
 * Every repository method receives this to enforce data isolation.
 */
export interface RepositoryScope {
  organizationId: number;
  operatingUnitId: number;
}