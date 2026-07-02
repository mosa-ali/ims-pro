# Finance Reference Architecture

**Purpose**: Standard implementation patterns for all finance capabilities  
**Applies to**: Phases 2–12; guides all developers  

---

## Pattern 1: Orchestrator Coordination Pattern

**When to use**: Any financial transaction involving multiple engines (GL, Budget, Treasury, Risk)

```typescript
// ✅ CORRECT: Finance Orchestrator coordinates
async function processInvoiceApproved(event: InvoiceApprovedEvent) {
  try {
    // 1. Validate
    const validation = await ruleEngine.validate(event);
    if (!validation.passed) return { status: 'rejected', reason: validation.reason };
    
    // 2. Reserve budget (idempotent)
    const budget = await budgetEngine.reserve(event.amount, event.projectId);
    if (!budget.success) return { status: 'rejected', reason: 'BudgetUnavailable' };
    
    // 3. Post GL (idempotent)
    const gl = await glService.post({
      debit: { account: 'Expense', amount: event.amount },
      credit: { account: 'Payable', amount: event.amount },
      sourceEventId: event.id,
    });
    if (!gl.success) {
      // Compensate: Release budget
      await orchestrator.publish(BudgetReservationRolledBackEvent, { reserveId: budget.reserveId });
      return { status: 'rejected', reason: 'GLPostingFailed' };
    }
    
    // 4. Update treasury (async, non-blocking)
    await treasuryEngine.updateForecast(event.amount, event.dueDate);
    
    // 5. Evaluate risk (async)
    await riskIntelligence.evaluate({
      budgetId: budget.budgetId,
      glEntryId: gl.glEntryId,
    });
    
    // 6. Publish completion (immutable record)
    await eventBus.publish(InvoiceProcessedEvent, {
      invoiceId: event.id,
      glEntryId: gl.glEntryId,
      budgetReserveId: budget.reserveId,
    });
    
    return { status: 'ok', glEntryId: gl.glEntryId };
  } catch (error) {
    logger.error('InvoiceProcessing failed', { eventId: event.id, error });
    await deadLetterQueue.add({ event, reason: error.message });
    throw error;
  }
}
```

---

## Pattern 2: Event Handler Pattern

**When to use**: Any handler that processes an event from EventBus

```typescript
// ✅ CORRECT: Event handler with idempotency
async function handleInvoiceApproved(event: FinancialEvent) {
  // 1. Check if already processed (idempotency key)
  const processed = await db.select().from(eventProcessingLog)
    .where(eq(eventProcessingLog.eventId, event.eventId));
  
  if (processed.length > 0) {
    logger.info('Event already processed', { eventId: event.eventId });
    return { status: 'skipped', reason: 'already_processed' };
  }
  
  // 2. Process event (validate, execute, log)
  const result = await orchestrator.process(event);
  
  // 3. Log processing (idempotency guard for future)
  await db.insert(eventProcessingLog).values({
    eventId: event.eventId,
    processedAt: new Date(),
    result: JSON.stringify(result),
  });
  
  return result;
}
```

---

## Pattern 3: Cache Invalidation Pattern

**When to use**: After any GL post or budget change

```typescript
// ✅ CORRECT: Explicit cache invalidation
async function invalidateCaches(glEntry: GLEntry, budgetId: number) {
  // Invalidate affected caches
  await cache.invalidate([
    `budget:${budgetId}:balance`,  // Budget balance for this project
    `budget:${budgetId}:forecast`,  // Budget forecast
    `glaccount:${glEntry.glAccountId}:balance`,  // GL account balance
    `treasury:position`,  // Overall cash position
  ]);
  
  // Notify subscribers (dashboard, reports)
  await realTimeSync.publish('cache_invalidated', {
    keys: [`budget:${budgetId}`, `glaccount:${glEntry.glAccountId}`],
  });
}
```

---

## Pattern 4: Saga Pattern (Distributed Transaction)

**When to use**: Multi-step transaction that must be all-or-nothing

```typescript
// ✅ CORRECT: Saga with compensating transactions
async function purchaseOrderSaga(event: PurchaseOrderApprovedEvent) {
  const saga = new Saga(event.id);
  
  try {
    // Step 1: Reserve budget
    const budgetReserve = await saga.execute(
      'reserveBudget',
      () => budgetEngine.reserve(event.amount, event.projectId),
      // Compensating transaction
      (result) => budgetEngine.release(result.reserveId)
    );
    
    // Step 2: Create GL entry
    const glEntry = await saga.execute(
      'postGL',
      () => glService.post({
        debit: { account: 'Commitment', amount: event.amount },
        credit: { account: 'Payable', amount: event.amount },
      }),
      // Compensating transaction
      (result) => glService.reverse(result.glEntryId)
    );
    
    // Step 3: Update treasury
    await saga.execute(
      'updateTreasury',
      () => treasuryEngine.addCommitment(event.amount, event.dueDate),
      (result) => treasuryEngine.removeCommitment(result.commitmentId)
    );
    
    // All steps succeeded
    await saga.markAsCompleted();
    return { status: 'ok' };
  } catch (error) {
    // If ANY step fails, compensate all previous steps
    await saga.compensate();
    return { status: 'failed', reason: error.message };
  }
}
```

---

## Pattern 5: GL Posting Pattern

**When to use**: Creating journal entries

```typescript
// ✅ CORRECT: GL posting with validation & idempotency
async function postGLEntry(request: GLPostingRequest): Promise<GLPostingResult> {
  // 1. Validate schema
  const validated = GLPostingRequestSchema.parse(request);
  
  // 2. Check idempotency (same request = same response)
  const existing = await db.select().from(glEntries)
    .where(eq(glEntries.idempotencyKey, request.idempotencyKey));
  
  if (existing.length > 0) {
    return { success: true, glEntryId: existing[0].id, cached: true };
  }
  
  // 3. Validate double-entry
  const debits = validated.lines.filter(l => l.debit).reduce((sum, l) => sum + l.debit, 0);
  const credits = validated.lines.filter(l => l.credit).reduce((sum, l) => sum + l.credit, 0);
  
  if (debits !== credits) {
    return { success: false, error: 'DebitsNotEqualCredits', debits, credits };
  }
  
  // 4. Generate journal number
  const journalNumber = await sequenceService.nextJournalNumber();
  
  // 5. Post to GL
  const glEntry = await db.insert(glEntries).values({
    journalNumber,
    postDate: validated.postDate,
    description: validated.description,
    sourceEventId: validated.sourceEventId,
    sourceEventType: validated.sourceEventType,
    idempotencyKey: request.idempotencyKey,
  });
  
  // 6. Post lines
  for (const line of validated.lines) {
    await db.insert(glLines).values({
      glEntryId: glEntry.id,
      glAccountId: line.glAccountId,
      debit: line.debit,
      credit: line.credit,
      description: line.description,
    });
  }
  
  // 7. Update GL account balances
  for (const line of validated.lines) {
    const amount = (line.debit || 0) - (line.credit || 0);
    await db.update(glAccounts)
      .set({ balance: sql`balance + ${amount}` })
      .where(eq(glAccounts.id, line.glAccountId));
  }
  
  // 8. Publish event
  await eventBus.publish(GLPostedEvent, {
    glEntryId: glEntry.id,
    journalNumber,
    sourceEventId: validated.sourceEventId,
  });
  
  return { success: true, glEntryId: glEntry.id };
}
```

---

## Pattern 6: Three-Way Match Pattern

**When to use**: Invoice approval (match PO → GRN → Invoice)

```typescript
// ✅ CORRECT: Three-way matching
async function threeWayMatch(invoice: Invoice): Promise<MatchResult> {
  // 1. Find PO
  const po = await db.select().from(purchaseOrders)
    .where(eq(purchaseOrders.id, invoice.poId));
  
  if (!po) return { status: 'unmatched', reason: 'PONotFound' };
  
  // 2. Find GRN
  const grn = await db.select().from(goodsReceivedNotes)
    .where(eq(goodsReceivedNotes.poId, invoice.poId));
  
  if (!grn) return { status: 'unmatched', reason: 'GRNNotFound' };
  
  // 3. Match quantities
  if (invoice.quantity !== po.quantity || invoice.quantity !== grn.receivedQty) {
    return { status: 'partial_match', reason: 'QuantityMismatch', details: {
      poQty: po.quantity,
      grnQty: grn.receivedQty,
      invoiceQty: invoice.quantity,
    }};
  }
  
  // 4. Match amount (allow ±5% tolerance)
  const tolerance = po.amount * 0.05;
  if (Math.abs(invoice.amount - po.amount) > tolerance) {
    return { status: 'partial_match', reason: 'AmountMismatch', details: {
      poAmount: po.amount,
      invoiceAmount: invoice.amount,
      tolerance,
    }};
  }
  
  // 5. Match dates (invoice date after GRN date)
  if (invoice.invoiceDate < grn.receivedDate) {
    return { status: 'partial_match', reason: 'DateSequenceError' };
  }
  
  // All matched
  return { status: 'matched', details: { poId: po.id, grnId: grn.id } };
}
```

---

## Pattern 7: Budget Hierarchical Update Pattern

**When to use**: Budget changes (allocation, spending, commitment)

```typescript
// ✅ CORRECT: Update budget + all ancestors
async function updateBudgetHierarchy(budgetId: number, change: number) {
  // 1. Update this budget
  await db.update(budgets)
    .set({ spent: sql`spent + ${change}` })
    .where(eq(budgets.id, budgetId));
  
  // 2. Find parent and update recursively
  const budget = await db.select().from(budgets)
    .where(eq(budgets.id, budgetId));
  
  if (budget.parentId) {
    await updateBudgetHierarchy(budget.parentId, change);
  }
  
  // 3. Recalculate available for all affected budgets
  await recalculateAvailable(budgetId);
}

async function recalculateAvailable(budgetId: number) {
  const budget = await db.select().from(budgets)
    .where(eq(budgets.id, budgetId));
  
  const available = budget.allocated - budget.spent - budget.committed;
  
  await db.update(budgets)
    .set({ available })
    .where(eq(budgets.id, budgetId));
  
  if (budget.parentId) {
    await recalculateAvailable(budget.parentId);
  }
}
```

---

## Pattern 8: Multi-Org Isolation Pattern

**When to use**: Every database query

```typescript
// ✅ CORRECT: Always include org scope
async function getBudgetsForProject(projectId: number, scope: ScopeContext): Promise<Budget[]> {
  return db.select().from(budgets)
    .where(
      and(
        eq(budgets.organizationId, scope.organizationId),
        eq(budgets.operatingUnitId, scope.operatingUnitId),
        eq(budgets.projectId, projectId)
      )
    );
}

// ❌ WRONG: Missing scope
async function getBudgetsForProject(projectId: number): Promise<Budget[]> {
  return db.select().from(budgets)
    .where(eq(budgets.projectId, projectId));
    // Leaks data across orgs!
}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| **GL posting in 3 places** | Duplication, inconsistency, maintenance burden | Single GLPostingService |
| **Engines calling engines** | Circular deps, hard to test, unclear control flow | Orchestrator coordinates |
| **No event source** | Can't audit, can't replay, can't guarantee consistency | EventStore immutable |
| **GL updates** | Breaks audit trail, loses history, can't reverse properly | Only reverse via new entry |
| **Missing scope context** | Data leaks across orgs, compliance violation | Always pass ScopeContext |
| **Manual cache invalidation** | Stale data, inconsistency, hard to debug | Explicit invalidation rules |
| **Synchronous cascades** | Blocking, slow, poor UX | Async via events |
| **Hard-coded rules** | Rule changes require recompilation, slow iteration | Rule Engine + database |

---

## Pattern Selection Guide

```
Transaction type → Select pattern

Financial transaction (Invoice)
  ├─ Multiple engines? YES → Use Orchestrator pattern
  ├─ All-or-nothing? YES → Use Saga pattern
  └─ Multi-step? YES → Use Event handler pattern

Data consistency → Select pattern

GL posting always balanced? → Use GL posting pattern
Budget = Allocated - Spent - Committed? → Use hierarchical update pattern
Invoice matches PO + GRN? → Use three-way match pattern

Security & isolation → Select pattern

Data per-organization? → Use multi-org isolation pattern
Cache invalidation? → Use cache invalidation pattern
```

---

## Conclusion

These 8 patterns cover all major finance implementation scenarios. **All developers must follow these patterns.**

- ✅ Orchestrator Pattern (who coordinates)
- ✅ Event Handler Pattern (how to process events)
- ✅ Cache Invalidation Pattern (keep data fresh)
- ✅ Saga Pattern (all-or-nothing)
- ✅ GL Posting Pattern (canonical GL posting)
- ✅ Three-Way Match Pattern (invoice validation)
- ✅ Budget Hierarchy Pattern (hierarchical updates)
- ✅ Multi-Org Isolation Pattern (data security)
