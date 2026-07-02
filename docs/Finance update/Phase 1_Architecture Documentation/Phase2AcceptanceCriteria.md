# Phase 2 Acceptance Criteria
## Explicit Definition of Finance Orchestrator Phase Completion

**Version**: 1.0  
**Status**: Phase 1 Governance - Phase 2 Gate  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

---

## Overview

Phase 2 = "Finance Orchestrator + Event Bus + Event Store Foundation"

**Duration**: 2 weeks  
**Team**: 2 developers  
**Definition of Done**: Not "code merged" but specific, measurable criteria.

---

## Deliverable 1: FinanceOrchestratorEngine.ts

### Functional Criteria

- [ ] **Orchestrator exists** — File created, exports FinanceOrchestratorEngine class
  - File: `/src/server/finance/engines/FinanceOrchestratorEngine.ts`
  - Exports: `class FinanceOrchestratorEngine`
  - Constructor: accepts `(eventBus: DomainEventBus, repositories: RepositoryMap, rules: RuleEngine)`

- [ ] **All engines accessible via Orchestrator** — No direct engine instantiation elsewhere
  - Orchestrator methods: `postGL()`, `updateBudget()`, `markAdvanceAsLiquidated()`, `recordPayment()`, `assessRisk()`, `updateForecast()`
  - Each method delegates to appropriate engine via event
  - Verify: No other code instantiates `new BudgetEngine()` directly

- [ ] **Orchestrator is single source of GL posting** — All GL posts routed through one method
  - Method: `async postGL(journalEntry: JournalEntryInput, context: ScopeContext): Promise<{ status: 'ok' | 'error'; data?: JournalEntry; error?: string }>`
  - Validation: Debits = Credits
  - Event publication: `GLPostingCompleted` published BEFORE response
  - No GL posting logic elsewhere

- [ ] **Transaction coordination implemented** — Saga pattern for multi-step operations
  - Method: `async executeSaga(steps: SagaStep[], context: ScopeContext): Promise<{ status: 'ok' | 'error'; rollbackExecuted?: boolean }>`
  - Each step: `{ name: string; execute: async () => Promise<Event>; compensate: async () => Promise<Event> }`
  - Behavior: If any step fails, execute all compensate in reverse order
  - Test: Advance issue (step 1) → GL post (step 2) → fail; verify GL reversal executed

- [ ] **Error handling is consistent** — All errors return `{ status: 'error'; error: string }`
  - No throwing exceptions (use status field)
  - No half-posted GL entries (atomicity)
  - All errors logged to audit trail

- [ ] **ScopeContext enforced** — Every method requires organizationId + operatingUnitId
  - Parameter: `context: ScopeContext = { organizationId: string; operatingUnitId: string }`
  - Validation: All data queries include these filters
  - Test: Org A cannot see Org B's GL entries

- [ ] **Orchestrator is testable** — Dependencies injected, no global state
  - Constructor: accepts dependencies
  - No `global.db` or `global.config` access
  - Can be instantiated in tests with mock dependencies

---

### Acceptance Test Plan

| Test | Expected Outcome |
|------|------------------|
| `test('postGL posts immutable entry')` | GL entry created, immutable, queryable |
| `test('postGL requires balanced entry')` | Throws error if debits ≠ credits |
| `test('postGL publishes event')` | GLPostingCompleted event in event bus |
| `test('executeSaga rolls back on failure')` | All steps rolled back if step 2 fails |
| `test('multi-org isolation')` | Org A GL not visible to Org B query |

---

## Deliverable 2: DomainEventBus.ts

### Functional Criteria

- [ ] **Event bus exists** — File created, exports DomainEventBus class
  - File: `/src/server/finance/events/DomainEventBus.ts`
  - Exports: `class DomainEventBus`
  - Constructor: accepts connection to event store (database)

- [ ] **Events are immutable after publication** — No edit of events
  - Method: `async publish<T extends FinancialEvent>(event: T, context: ScopeContext): Promise<{ eventId: string; timestamp: Date }>`
  - Constraint: Event cannot be modified after publish returns
  - Verification: Attempting to update event throws error

- [ ] **Event subscription enabled** — Handlers can subscribe to event types
  - Method: `on<T extends FinancialEvent>(eventType: FinancialEventType, handler: (event: T) => Promise<void>): void`
  - Handler called synchronously after publish (before return)
  - Verification: Can subscribe to GLPosted, BudgetAllocated, etc.

- [ ] **Event ordering preserved** — Events published in order, no race conditions
  - Behavior: Event N+1 published after Event N always
  - Verification: Event.sequenceNumber increases monotonically
  - Test: Issue two advances in quick succession; verify ordering

- [ ] **Replay capability** — Events can be replayed to rebuild state
  - Method: `async replay(fromEventId?: string, toEventId?: string): Promise<void>`
  - Use case: Rebuild GL from event log
  - Verification: After replay, GL balance matches replay target

- [ ] **Dead letter queue for failed handlers** — Errors don't crash bus
  - Method: `async getFailedEvents(): Promise<Event[]>`
  - Behavior: If handler throws error, event moved to DLQ; bus continues
  - Verification: DLQ events can be replayed manually

- [ ] **ScopeContext preserved in event** — Every event includes org context
  - Field: `event.organizationId`, `event.operatingUnitId`
  - Validation: ScopeContext cannot be omitted
  - Test: Cannot publish event without org context

---

### Acceptance Test Plan

| Test | Expected Outcome |
|------|------------------|
| `test('publish returns eventId and timestamp')` | Event persisted, ID returned |
| `test('events are immutable')` | Attempt to edit event throws error |
| `test('handlers called in order')` | Handler 1 called before handler 2 |
| `test('replay rebuilds state')` | After replay, GL balance correct |
| `test('failed handler goes to DLQ')` | Failed event in DLQ, next event processes |

---

## Deliverable 3: EventStore.ts

### Functional Criteria

- [ ] **Event store exists** — File created, exports EventStore class
  - File: `/src/server/finance/events/EventStore.ts`
  - Exports: `class EventStore`
  - Database table: `events` with schema:
    ```sql
    CREATE TABLE events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id VARCHAR(255) NOT NULL,
      operating_unit_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(255) NOT NULL,
      event_version INT NOT NULL,
      payload JSON NOT NULL,
      correlation_id VARCHAR(255),
      causation_id VARCHAR(255),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sequence_number BIGINT AUTO_INCREMENT,
      is_processed BOOLEAN DEFAULT false,
      processing_error VARCHAR(1000),
      PRIMARY KEY (id),
      UNIQUE (sequence_number),
      INDEX (organization_id, operating_unit_id),
      INDEX (event_type),
      INDEX (timestamp)
    );
    ```

- [ ] **Append-only semantics** — Events never updated or deleted
  - Method: `async append<T>(event: T): Promise<string>` (returns eventId, immutable)
  - No UPDATE/DELETE operations on events table
  - Verification: No columns are updateable (only INSERT allowed)

- [ ] **Sequence number management** — Events numbered sequentially for ordering
  - Field: `event.sequenceNumber` auto-increments
  - Behavior: Guaranteed unique, increasing
  - Purpose: Replay events in exact order

- [ ] **Query by event type** — Retrieve all events of a type
  - Method: `async getEventsByType(eventType: FinancialEventType, context: ScopeContext): Promise<Event[]>`
  - Filtering: organization_id + operating_unit_id + event_type
  - Result: Ordered by sequence_number

- [ ] **Query by correlation ID** — Retrieve related events (e.g., all events from one purchase request)
  - Method: `async getEventsByCorrelationId(correlationId: string, context: ScopeContext): Promise<Event[]>`
  - Purpose: Trace entire transaction chain
  - Example: PR-123 → PO-456 → GRN-789 → INV-000 → Payment-001 (all linked by correlation ID)

- [ ] **Causation tracking** — Each event knows what caused it
  - Field: `event.causationId` (the event that triggered this event)
  - Example: GLPostingCompleted.causationId = PaymentReleased.id (what caused the GL post)
  - Purpose: Audit trail and debugging

- [ ] **Timestamp immutable** — Created timestamp never changes
  - Field: `timestamp` set on INSERT, never updated
  - Purpose: Audit trail accuracy

- [ ] **Multi-org isolation** — Events segregated by organization
  - Validation: Cannot query Org B events from Org A context
  - Every query includes WHERE organization_id = ?

---

### Acceptance Test Plan

| Test | Expected Outcome |
|------|------------------|
| `test('append stores event')` | Event persisted with ID |
| `test('events immutable')` | Attempt UPDATE throws error |
| `test('sequence numbers unique')` | No two events have same sequence |
| `test('query by event type')` | Returns all events of type in order |
| `test('causation chain reconstructed')` | Trace PR → PO → GRN → INV → Payment |

---

## Deliverable 4: FinancialEventTypes.ts

### Functional Criteria

- [ ] **Zod schemas defined for all 24+ events** — Type-safe event structure
  - File: `/src/server/finance/events/FinancialEventTypes.ts`
  - Events defined: GLPosted, GLReversalPosted, BudgetAllocated, BudgetCommitmentReserved, etc.
  - Each event: Zod schema for validation on publish

- [ ] **Event inheritance** — All events extend BaseFinancialEvent
  - BaseFinancialEvent fields: `id, organizationId, operatingUnitId, timestamp, sequenceNumber, correlationId, causationId`
  - Type safety: Cannot create event without required fields

- [ ] **Event versioning** — Events include version for backward compatibility
  - Field: `event_version: 1` (or 2, 3, etc. if schema changes)
  - Purpose: Handle old event format on replay
  - Example: GLPostedV1 vs GLPostedV2 if GL schema changes

- [ ] **Event discriminator** — Distinguish event types at runtime
  - Discriminant union: `FinancialEvent = GLPosted | BudgetAllocated | ...`
  - Purpose: TypeScript can narrow type based on event.type

- [ ] **All events from FinanceEventCatalog.md** — No missing events
  - Verify: All 24+ events from catalog have Zod schemas
  - Count: Must have ≥24 events defined

---

### Acceptance Test Plan

| Test | Expected Outcome |
|------|------------------|
| `test('GLPosted validates correctly')` | Valid GL event passes, invalid fails |
| `test('event discriminator works')` | Can narrow type in handler |
| `test('unknown event rejected')` | Publishing unknown event type throws error |

---

## Deliverable 5: Unit Tests

### Coverage Criteria

- [ ] **FinanceOrchestratorEngine.ts** — ≥85% coverage
  - Critical paths: GL posting, saga rollback, error handling, multi-org isolation
  - Code coverage: `npm test -- src/server/finance/engines/FinanceOrchestratorEngine.ts --coverage`

- [ ] **DomainEventBus.ts** — ≥85% coverage
  - Critical paths: publish, subscribe, replay, error handling
  - Verified: All handlers tested

- [ ] **EventStore.ts** — ≥85% coverage
  - Critical paths: append, query by type, query by correlation, multi-org isolation
  - Verified: No UPDATE/DELETE paths (none should be exercised)

- [ ] **No test data from production** — All test fixtures synthetic
  - Verify: Tests use fixtures, not real transaction IDs
  - Cleanup: `beforeEach` resets test data

- [ ] **Tests are deterministic** — Same test run twice = same result
  - Verify: No date-based randomness, no time-dependent tests (use mocked clock)

---

### Acceptance Test Plan

| Metric | Threshold |
|--------|-----------|
| FinanceOrchestratorEngine.ts coverage | ≥85% |
| DomainEventBus.ts coverage | ≥85% |
| EventStore.ts coverage | ≥85% |
| Total Phase 2 coverage | ≥85% |
| Test pass rate | 100% (no flaky tests) |

---

## Deliverable 6: Integration Tests

### Coverage Criteria

- [ ] **End-to-end GL posting** — From Orchestrator.postGL() to event publication
  - Test: Create advance → GL post → event published → verify GL entry immutable

- [ ] **Multi-org isolation** — Org A data invisible to Org B
  - Test: Post GL for Org A; query as Org B; verify empty result

- [ ] **Saga rollback** — Multi-step operation rolls back on failure
  - Test: Issue advance (step 1) → GL post (step 2 fails) → verify GL not posted, advance not issued

- [ ] **Event replay** — Replay events rebuilds GL
  - Test: Replay all events from event store; verify GL balance matches

- [ ] **Idempotency** — Posting same event twice = same result
  - Test: Post GL entry; post again; verify one GL entry, not two

---

### Acceptance Test Plan

| Test | Expected Outcome |
|------|------------------|
| `test('end-to-end GL posting')` | GL entry immutable after posting |
| `test('multi-org isolation')` | Org A cannot see Org B GL |
| `test('saga rollback on failure')` | All steps rolled back |
| `test('event replay')` | GL balance correct after replay |
| `test('idempotent posting')` | Duplicate post = same result |

---

## Deliverable 7: Performance Tests

### SLA Criteria

- [ ] **GL posting <200ms (P95)** — 95th percentile latency
  - Measured: From Orchestrator.postGL() call to response
  - Test: 1000 GL posts; measure latency distribution
  - Pass: P95 < 200ms

- [ ] **Event publish <50ms (P95)** — Including event store write
  - Measured: From DomainEventBus.publish() to success return
  - Test: 1000 events; measure latency
  - Pass: P95 < 50ms

- [ ] **Event replay: 100K events in <1 minute** — Bulk replay capability
  - Test: Replay 100K events from event store
  - Pass: Completes in <60 seconds

---

### Acceptance Test Plan

| Test | Threshold | Tool |
|------|-----------|------|
| GL posting latency P95 | <200ms | Artillery or k6 |
| Event publish latency P95 | <50ms | Artillery or k6 |
| Event replay 100K/60s | <1 min | Bash timer |

---

## Deliverable 8: Code Quality

### Standards Criteria

- [ ] **TypeScript strict mode** — `tsc --strict` with zero errors
  - Verification: `npm run type-check` passes
  - No `any` types in finance module

- [ ] **ESLint rules pass** — Code style consistency
  - Verification: `npm run lint` passes
  - No warnings (errors + warnings)

- [ ] **Code comments explain "why"** — Not "what"
  - Check: GL immutability code includes "Implements ADR-003"
  - Check: Non-obvious logic has comments

- [ ] **No hardcoded values** — Thresholds, limits, currencies in config or constants
  - Example: GL posting SLA = const, not magic number 200

- [ ] **No console.log()** — Use logger instead
  - Verification: `grep -r "console\\.log" src/server/finance/` returns empty
  - Purpose: Production logs must be structured

---

### Acceptance Test Plan

| Check | Tool | Pass Condition |
|-------|------|----------------|
| TypeScript strict | tsc --strict | Zero errors |
| ESLint | npm run lint | Zero errors + warnings |
| Code comments | Manual review | All non-obvious logic commented |
| No console.log | grep | Zero matches |

---

## Deliverable 9: Documentation

### Documentation Criteria

- [ ] **Architecture decision recorded** — ADRs 001–024 implemented
  - Verification: All ADRs reference Phase 2 (ADR-001, ADR-002, etc.)

- [ ] **Code examples in FinanceReferenceArchitecture.md** — Updated with actual code
  - Example: Orchestrator pattern shows actual FinanceOrchestratorEngine usage

- [ ] **API documentation** — tRPC router documentation
  - Each procedure has: description, input type, output type, error cases
  - Auto-generated from Zod schemas preferred

- [ ] **Runbook for deployment** — How to deploy Phase 2 changes
  - Steps: Build, migrate (if DB schema changes), deploy, verify
  - Rollback: How to revert if issues

---

## Approval Gate: Architecture Review Board

Before Phase 2 can be declared complete:

- [ ] **ARB reviews all deliverables** — 24-hour review window
- [ ] **ARB verifies all acceptance tests pass** — 100% pass rate required
- [ ] **ARB confirms no architectural drift** — Compliance with all 12 ADRs
- [ ] **ARB approves Phase 3 kickoff** — Only then can Phase 3 begin

---

## Phase 2 Completion Signoff

**Phase 2 is NOT complete until**:

1. ✅ FinanceOrchestratorEngine.ts exists and is tested
2. ✅ DomainEventBus.ts exists and is tested
3. ✅ EventStore.ts exists and is tested
4. ✅ FinancialEventTypes.ts with ≥24 events
5. ✅ Unit tests: ≥85% coverage, 100% pass rate
6. ✅ Integration tests: end-to-end, multi-org, saga, replay, idempotency
7. ✅ Performance tests: GL <200ms, events <50ms, replay <1min
8. ✅ Code quality: TypeScript strict, ESLint, no console.log
9. ✅ Documentation: ADRs implemented, examples, runbook
10. ✅ ARB approval: All acceptance criteria verified

**When all 10 items are complete, Phase 2 is done. Not before.**

---

## Related Documents
- **FinanceModernizationRoadmap.md**: Phase 2 entry/exit criteria
- **ArchitectureComplianceChecklist.md**: Code must pass all checks
- **ExecutiveDesignPrinciples.md**: Phase 2 implements all 12 principles

---

**This is the definition of "Phase 2 Done." No ambiguity. All measurable.**
