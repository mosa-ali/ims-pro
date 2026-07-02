# Finance Coding Standards

**Purpose**: Establish consistent patterns for all finance platform implementation  
**Applies to**: All code in Phases 2–12  
**Review cadence**: Monthly; updated as needed  

---

## 1. Architecture Principles

### 1.1 Orchestrator-First
- **All financial workflows flow through Finance Orchestrator**
- Engines never call other engines directly
- Engines are stateless processors (input → output)
- Orchestrator is the only stateful component

```typescript
// ❌ WRONG: Engine calls another engine
async function calculateBudgetRisk(budgetId: number) {
  const budget = await budgetEngine.getBudgetData(budgetId);
  const risk = await riskEngine.calculateBudgetOverrunRisk(budget);
  return risk;
}

// ✅ CORRECT: Orchestrator coordinates
async function processBudgetEvent(event: BudgetAllocatedEvent) {
  const budgetData = await budgetEngine.getAllocate(event);
  const risk = await riskIntelligence.evaluate(budgetData);
  await orchestrator.publish(BudgetProcessedEvent, { budgetData, risk });
}
```

### 1.2 Event-Driven
- **Every financial transaction becomes an event**
- Events are immutable; stored in EventStore
- Events have causality (correlationId, causationId)
- Subscribers react asynchronously

```typescript
// ❌ WRONG: Direct database updates
async function approveInvoice(invoiceId: number) {
  await db.update(invoices).set({ status: 'approved' }).where(eq(invoices.id, invoiceId));
  // Now who knows what to do?
}

// ✅ CORRECT: Emit event, let subscribers handle
async function approveInvoice(invoiceId: number, userId: number) {
  const event = new InvoiceApprovedEvent({
    invoiceId,
    timestamp: new Date(),
    approvedBy: userId,
    correlationId: uuid(), // link related events
  });
  
  await orchestrator.publish(event);
  // Orchestrator routes to Budget, GL, Treasury, etc.
}
```

### 1.3 Separation of Concerns
- **Engines handle domain logic only**
- Orchestrator handles coordination
- EventBus handles delivery guarantees
- EventStore handles audit trail

```typescript
// ✅ BudgetEngine: Focus on budget calculations only
export class BudgetEngine {
  async allocate(organizationId: number, amount: number): Promise<BudgetAllocation> {
    // Validate amount > 0
    // Calculate allocation across cost centers
    // Return allocation result
    // That's it!
  }
}

// ✅ Orchestrator: Coordinate the workflow
async function processPurchaseOrderEvent(event: PurchaseOrderApprovedEvent) {
  // 1. Validate with budget engine
  const allocation = await budgetEngine.allocate(...);
  
  // 2. Post GL entry
  const glEntry = await glService.post(...);
  
  // 3. Update forecast
  const forecast = await treasuryEngine.forecast(...);
  
  // 4. Evaluate risks
  const risks = await riskIntelligence.evaluate(...);
  
  // 5. Publish completion event
  await eventBus.publish(PurchaseOrderProcessedEvent);
}
```

---

## 2. Naming Conventions

### 2.1 Event Names
- **Format**: `<Domain><Action>Event` or `<Domain><Action>` (if context is clear)
- **Examples**:
  - `InvoiceApprovedEvent`
  - `BudgetAllocatedEvent`
  - `PaymentReleaseEvent`
  - `GLPostedEvent`

### 2.2 Engine Names
- **Format**: `<Domain>Engine` or `<Domain><Action>Engine`
- **Examples**:
  - `GLPostingService` (posting GL entries)
  - `BudgetEngine` (budget operations)
  - `TreasuryEngine` (cash position)
  - `RiskIntelligenceEngine` (risk assessment)

### 2.3 Function Names
- **Async operations**: Verb first, no "async" suffix
- **Examples**: `allocate()`, `post()`, `evaluate()`, `calculate()`
- **NOT**: `allocateAsync()`, `postAsync()`

### 2.4 Type Names
- **Requests**: `<Action>Request`
- **Responses**: `<Action>Result` or `<Entity>Data`
- **Events**: `<Action>Event`
- **Examples**:
  - `GLPostingRequest`
  - `BudgetAllocationResult`
  - `InvoiceApprovedEvent`

---

## 3. Error Handling

### 3.1 Errors vs. Exceptions
- **Exceptions**: Programming errors (null pointer, type mismatch) → Crash & log
- **Business errors**: Invalid input, rule violation → Return error in result

```typescript
// ✅ Distinguish errors
async function allocateBudget(request: BudgetAllocationRequest): Promise<BudgetAllocationResult> {
  // VALIDATION: Return error if invalid
  if (request.amount <= 0) {
    return { success: false, error: 'BudgetAmountMustBePositive' };
  }
  
  // EXCEPTION: Throw if system problem
  if (!request.organizationId) {
    throw new Error('OrganizationId required (programming error)');
  }
  
  // BUSINESS ERROR: Return error if rule violated
  if (request.amount > request.donor.limit) {
    return { 
      success: false, 
      error: 'BudgetExceedsDonorLimit',
      details: { requested: request.amount, limit: request.donor.limit }
    };
  }
  
  // SUCCESS
  return { success: true, allocationId: newId };
}
```

### 3.2 Error Codes
- **System errors**: `E001`, `E002` (system failures)
- **Validation errors**: `V001`, `V002` (invalid input)
- **Business errors**: `B001`, `B002` (rule violations)
- **Localize errors** (EN/AR/IT)

```typescript
export const FinanceErrors = {
  BUDGET_AMOUNT_NEGATIVE: { code: 'V001', message: { en: 'Budget amount must be positive', ar: 'يجب أن يكون مبلغ الميزانية موجباً', it: 'L\'importo del bilancio deve essere positivo' } },
  BUDGET_EXCEEDS_DONOR_LIMIT: { code: 'B001', message: { en: 'Budget exceeds donor limit', ... } },
  GL_ACCOUNT_NOT_FOUND: { code: 'B002', message: { en: 'GL account not found', ... } },
};
```

### 3.3 Saga Pattern (Transaction Rollback)
- **If any step fails**: Publish compensating events to roll back
- **Example**: Budget reserve fails → Compensate commitment

```typescript
async function processPurchaseOrderApproved(event: PurchaseOrderApprovedEvent) {
  try {
    // 1. Reserve budget
    const budgetReserve = await budgetEngine.reserve(event.amount);
    if (!budgetReserve.success) {
      return { success: false, reason: 'BudgetUnavailable' };
    }
    
    // 2. Create GL entry
    const glEntry = await glService.post(journalEntry);
    if (!glEntry.success) {
      // COMPENSATE: Release budget reserve
      await orchestrator.publish(BudgetReserveRolledBackEvent, { reserveId: budgetReserve.reserveId });
      return { success: false, reason: 'GLPostingFailed' };
    }
    
    // 3. All success
    return { success: true };
  } catch (error) {
    logger.error('Saga failed', error);
    // Send to dead letter queue for manual intervention
  }
}
```

---

## 4. Type Safety

### 4.1 Strict Null Checks
- **All TypeScript code**: `strict: true` in tsconfig
- **Nullable fields**: Always explicit `field | null`
- **Never any implicit unknowns**

```typescript
// ❌ WRONG: Ambiguous if nullable
interface Invoice {
  id: number;
  amount: number;
  dueDate?: string;  // Is this nullable? Optional? Both?
}

// ✅ CORRECT: Explicit
interface Invoice {
  id: number;
  amount: number;
  dueDate: string | null;  // Explicitly nullable
  notes?: string;          // Optional, but if present, is string
}
```

### 4.2 Zod Validation
- **All external inputs**: Validate with Zod
- **All API parameters**: Zod schema
- **All event payloads**: Zod schema

```typescript
// ✅ Zod validation
import { z } from 'zod';

const GLPostingRequestSchema = z.object({
  organizationId: z.number().positive(),
  operatingUnitId: z.number().positive().optional(),
  transactionDate: z.date(),
  description: z.string().min(1).max(255),
  entries: z.array(z.object({
    glAccountId: z.number().positive(),
    debit: z.number().nonnegative().optional(),
    credit: z.number().nonnegative().optional(),
  })),
});

type GLPostingRequest = z.infer<typeof GLPostingRequestSchema>;

async function postGLEntry(request: unknown) {
  const validated = GLPostingRequestSchema.parse(request);  // Throws if invalid
  // ... process validated
}
```

### 4.3 Drizzle ORM Typing
- **Always explicit column references** (no string keys)
- **Always use Drizzle's type inference**
- **Validate schema matches code**

```typescript
// ❌ WRONG: String keys (typo risk)
const query = db.select({ balance: 'balance' }).from(glAccounts);

// ✅ CORRECT: Explicit column reference
const query = db.select({ balance: glAccounts.balance }).from(glAccounts);

// ✅ Type-safe result
type AccountBalance = Awaited<ReturnType<typeof query>>;
```

---

## 5. Multi-Organization Isolation

### 5.1 Scope Context
- **Every operation**: Include `organizationId` and `operatingUnitId`
- **Never omit scope filters**
- **Compile-time enforcement where possible**

```typescript
// ❌ WRONG: Missing operatingUnitId scope
async function getBudgets(organizationId: number) {
  return db.select().from(budgets).where(eq(budgets.organizationId, organizationId));
  // Leaks data across OUs!
}

// ✅ CORRECT: Complete scope
async function getBudgets(scope: ScopeContext) {
  return db.select().from(budgets).where(
    and(
      eq(budgets.organizationId, scope.organizationId),
      eq(budgets.operatingUnitId, scope.operatingUnitId)
    )
  );
}

// ✅ EVEN BETTER: Scope enforced at service level
async function getBudgets(scope: ScopeContext): Promise<BudgetData[]> {
  // Type system ensures scope is passed
  return this.budgetEngine.list(scope);
}
```

### 5.2 Scope Type
```typescript
interface ScopeContext {
  organizationId: number;
  operatingUnitId: number | null;  // Nullable for org-level queries
  userId?: number;                  // Optional (for audit/permissions)
  correlationId?: string;           // Optional (for tracing)
}
```

---

## 6. Audit Trail & Immutability

### 6.1 GL Entry Immutability
- **Once posted, GL entries never change**
- **Corrections via reversals** (new GL entry, not modification)
- **Source event link** (every GL entry knows its source)

```typescript
// ✅ GL entry links to source event
interface GLEntry {
  id: number;
  journalNumber: string;
  postDate: date;
  lines: GLLine[];
  sourceEventId: string;  // UUID of the event that caused this
  sourceEventType: string;  // e.g., "InvoiceApprovedEvent"
  // Read-only after posting
}

// ✅ Corrections via reversal
async function reverseGLEntry(originalEntryId: number) {
  // 1. Read original entry
  const original = await getGLEntry(originalEntryId);
  
  // 2. Create reversal entry (opposite debits/credits)
  const reversalEntry = createReversalEntry(original);
  
  // 3. Post reversal (new entry, not modification)
  const reversalId = await postGLEntry(reversalEntry);
  
  // 4. Link reversals
  await linkGLEntries(originalEntryId, reversalId, 'reversal');
}
```

### 6.2 Event Store Immutability
- **Events never modified**
- **Event history is the source of truth**
- **Snapshots for performance** (not authoritative)

```typescript
// ✅ Event immutability
interface FinancialEvent {
  id: string;  // UUID (immutable key)
  eventType: string;
  timestamp: DateTime;  // When it happened
  recordedAt: DateTime;  // When it was recorded (immutable)
  organizationId: number;
  payload: object;
  // That's all; no updates allowed
}

// ✅ Read from event store (immutable)
const events = await eventStore.getEvents(organizationId);
// These are immutable historical facts

// ✅ Snapshots are derived
const snapshot = await digitalTwin.getSnapshot(organizationId, asOf);
// These are computed (can be regenerated)
```

---

## 7. Testing Requirements

### 7.1 Unit Test Standards
- **Minimum coverage**: 80% for critical paths
- **Critical paths**: GL posting, budget calculations, risk scoring
- **Test structure**: Arrange → Act → Assert

```typescript
// ✅ Test structure
describe('GLPostingService::postEntry', () => {
  it('should balance debits and credits', async () => {
    // Arrange
    const request = {
      entries: [
        { glAccountId: 1, debit: 100 },
        { glAccountId: 2, credit: 100 },
      ],
    };
    
    // Act
    const result = await glPostingService.postEntry(request);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.journalEntryId).toBeDefined();
  });
  
  it('should fail if debits != credits', async () => {
    // Arrange
    const request = {
      entries: [
        { glAccountId: 1, debit: 100 },
        { glAccountId: 2, credit: 99 },  // Unbalanced!
      ],
    };
    
    // Act
    const result = await glPostingService.postEntry(request);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('DebitsNotEqualCredits');
  });
});
```

### 7.2 Integration Test Standards
- **Test end-to-end workflows**
- **Use staging database (isolated)**
- **Clean up after each test**

```typescript
describe('Orchestrator::processPurchaseOrderApproved', () => {
  beforeEach(async () => {
    // Setup test org, budget, GL accounts
  });
  
  afterEach(async () => {
    // Cleanup (rollback transactions)
  });
  
  it('should reserve budget and post GL entry', async () => {
    // Arrange
    const event = new PurchaseOrderApprovedEvent({...});
    
    // Act
    const result = await orchestrator.process(event);
    
    // Assert
    expect(result.success).toBe(true);
    const budget = await budgetEngine.getBudget(...);
    expect(budget.available).toBeLessThan(originalAvailable);
    const glEntries = await glService.getEntries(...);
    expect(glEntries).toHaveLength(1);
  });
});
```

### 7.3 Load Testing
- **Critical path**: GL posting
- **Target**: <500ms at 10 TPS (transactions/second)
- **Tool**: k6 or similar

---

## 8. Performance Standards

### 8.1 Query Performance
- **Simple queries** (1 table): <10ms
- **Join queries** (2-3 tables): <50ms
- **Complex queries** (3+ joins): <200ms
- **Aggregation queries**: <1s (cached if frequent)

### 8.2 Cache Strategy
- **Budget balances**: Cache, invalidate on GL post
- **GL account balances**: Cache, invalidate on GL post
- **Treasury position**: Cache, invalidate on payment/draw
- **Risk scores**: Async refresh (not cached)

### 8.3 API Response Time
- **Simple queries**: <100ms
- **Complex queries**: <1s
- **Batch operations**: <5s (report generation)

---

## 9. Logging & Tracing

### 9.1 Log Levels
- **ERROR**: System failures, unexpected exceptions
- **WARN**: Business rule violations, edge cases
- **INFO**: Financial transactions, events, state changes
- **DEBUG**: Function entry/exit, variable values
- **TRACE**: Detailed execution (disabled in prod)

```typescript
// ✅ Logging
logger.info('GLPosting::postEntry', {
  journalNumber: je.journalNumber,
  lineCount: je.lines.length,
  totalDebit: totalDebits,
  totalCredit: totalCredits,
  organizationId: request.organizationId,
  duration: elapsed,
});
```

### 9.2 Distributed Tracing
- **Every request**: `correlationId` (UUID)
- **Every event**: Trace through all subscribers
- **Every API call**: Include in X-Correlation-ID header

```typescript
// ✅ Tracing
async function processInvoice(invoice: Invoice, correlationId: string) {
  logger.info('Invoice::Approve', { invoiceId: invoice.id, correlationId });
  
  const event = new InvoiceApprovedEvent({
    invoiceId: invoice.id,
    correlationId,  // Propagate
  });
  
  await orchestrator.publish(event);  // Propagated to all subscribers
}
```

---

## 10. Deployment & Migrations

### 10.1 Database Migrations
- **Drizzle migrations**: Version control, reversible
- **Data migrations**: Separate from schema
- **Testing**: Run on staging first

```bash
# Generate migration
npm run db:generate -- "add_rule_engine_tables"

# Review migration (version control)
git add migrations/

# Test on staging
npm run db:migrate -- --env staging

# Deploy to production
npm run db:migrate -- --env production
```

### 10.2 Feature Flags
- **New engines**: Behind feature flag
- **Orchestrator routing**: Can toggle per event type
- **Gradual rollout**: 10% → 50% → 100%

```typescript
// ✅ Feature flag
if (featureFlags.useFinanceOrchestrator && event.type === 'InvoiceApproved') {
  // New path (orchestrator)
  await orchestrator.process(event);
} else {
  // Old path (backward compat)
  await legacySynchronizer.handle(event);
}
```

---

## 11. Documentation Requirements

### 11.1 Code Comments
- **Why, not what** (code shows what; comments show why)
- **Domain concepts**: Explain business logic
- **Edge cases**: Explain non-obvious branches

```typescript
// ✅ Good comment
// Budget reserve must be atomic with GL posting (saga pattern).
// If GL post fails, budget reserve is compensated via rollback event.
async function reserveBudget(amount: number) {
  const reserve = await budget.reserve(amount);
  const glEntry = await gl.post(journalEntry);
  if (!glEntry.success) {
    // Compensate: Release reserve
    await orchestrator.publish(BudgetReserveRolledBackEvent);
  }
}

// ❌ Bad comment (obvious)
// This reserves budget
async function reserveBudget(amount: number) {
  return await budget.reserve(amount);  // Reserve the budget
}
```

### 11.2 Architecture Documentation
- **Engine responsibilities**: 1-page doc per engine
- **Integration points**: How other modules call this engine
- **Event contracts**: What events this engine subscribes to

---

## 12. Code Review Checklist

Every PR must pass:
- [ ] No direct engine-to-engine calls (all via Orchestrator)
- [ ] All external inputs validated (Zod)
- [ ] All financial transactions are events
- [ ] GL entries immutable (no updates)
- [ ] Scope context (organizationId, operatingUnitId) present
- [ ] Error handling (exceptions vs. business errors)
- [ ] Tests included (>80% coverage on critical paths)
- [ ] Logging included (correlationId, context)
- [ ] Documentation updated
- [ ] No hardcoded values (use config)
- [ ] SQL queries use Drizzle (not string templates)
- [ ] Nullable fields explicit

---

## Conclusion

These standards ensure:
- ✅ Consistent architecture (Orchestrator-first)
- ✅ Event-driven design (immutable events, event sourcing)
- ✅ Type safety (strict null checks, Zod validation)
- ✅ Multi-org isolation (scope context everywhere)
- ✅ Auditability (GL immutability, event chain)
- ✅ Reliability (error handling, saga pattern)
- ✅ Testability (>80% coverage)
- ✅ Performance (caching, monitoring)
- ✅ Maintainability (consistent naming, documentation)

**All Phase 2+ code must follow these standards.**
