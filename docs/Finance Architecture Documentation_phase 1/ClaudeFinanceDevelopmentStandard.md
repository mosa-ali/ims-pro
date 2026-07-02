# Claude Finance Development Standard
## Permanent Rulebook for AI-Driven Finance Module Implementation

**Version**: 1.0  
**Status**: Phase 1 Governance - AI Development Policy  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

**Audience**: Claude (and other AI coding assistants) implementing finance features

---

## Overview

Claude will implement most of Phases 2–12 of the finance modernization. This document is the permanent rulebook. **Every rule is non-negotiable.** Violations are not negotiated, debated, or worked around.

---

## Rule 1: Never Duplicate Business Logic

**Statement**: If GL posting logic exists, it exists in exactly ONE place.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: GL posting in two places
class FinanceEngine {
  postGL() { /* GL posting logic */ }
}

class TreasuryEngine {
  postGL() { /* same GL posting logic AGAIN */ }
}
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: GL posting centralized
class FinanceOrchestratorEngine {
  async postGL(entry) { /* GL posting logic once */ }
}

class FinanceEngine {
  // No GL posting; delegates to Orchestrator
}

class TreasuryEngine {
  // No GL posting; delegates to Orchestrator
}
```

**Enforcement**: Code review will reject any PR with duplicate logic. Refactor immediately.

---

## Rule 2: Never Replace Existing Functionality

**Statement**: When adding new functionality, keep old functionality working.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: Removes old GL posting endpoint
// Before: POST /api/finance/gl (works)
// After: POST /api/finance/gl (removed! uses Orchestrator instead)
// Impact: Custom integrations break
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: New endpoint exists; old endpoint stays (may be deprecated)
// Before: POST /api/finance/gl → old GL posting
// After: 
//   POST /api/finance/gl → routes to Orchestrator (same behavior)
//   POST /api/finance/gl-deprecated → old GL posting (deprecated, warning logged)
// Custom integrations still work
```

**Enforcement**: Every API change must maintain backward compatibility. Migration strategy documents the deprecation path.

---

## Rule 3: Always Maintain Backward Compatibility

**Statement**: Breaking changes are not allowed without explicit migration plan.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: GL entry structure changed without migration
// Before: journalEntry = { lines: [...], amount: 100 }
// After: journalEntry = { lines: [...] } // amount field removed
// Impact: Old code that reads .amount breaks
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: GL structure extended, old fields kept
// Before: journalEntry = { lines: [...], amount: 100 }
// After: journalEntry = { lines: [...], amount: 100, description?: string }
// Old code still works; new code can use description
// OR with version:
// journalEntry = {
//   v: 2, // Version 2
//   lines: [...],
//   description: '...',
// }
// Code reads: if (v === 1) use old logic; if (v === 2) use new logic
```

**Enforcement**: Code review checks for breaking changes. Migration plan documents any unavoidable breaks.

---

## Rule 4: Always Preserve Audit Trail

**Statement**: Every financial transaction must have immutable audit history.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: GL entry edited without audit trail
async editGLEntry(entryId, newData) {
  UPDATE journal_entries SET ... WHERE id = entryId; // No audit!
}

// ❌ REJECTED: Deletion without soft delete
async deleteGLEntry(entryId) {
  DELETE FROM journal_entries WHERE id = entryId; // Audit lost!
}
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: GL entry immutable; corrections via reversal
async postGLReversal(originalEntryId, reason) {
  // 1. Create new GL entry with opposite amounts
  const reversal = {
    lines: originalEntry.lines.map(line => ({
      ...line,
      debit: line.credit, // Flip
      credit: line.debit,
    })),
    sourceEventId: originalEntryId, // Link to original
    reason, // Why reversing
  };
  
  // 2. Audit trail preserved: original entry + reversal entry both exist
  await orchestrator.postGL(reversal);
}

// ✅ APPROVED: Soft delete with audit
async archiveGLEntry(entryId) {
  UPDATE journal_entries SET is_deleted = true WHERE id = entryId;
  // is_deleted flag set; data still in database; audit trail intact
}
```

**Enforcement**: Any code that modifies or deletes financial data without audit is rejected.

---

## Rule 5: Never Bypass Finance Orchestrator

**Statement**: All financial operations route through FinanceOrchestratorEngine, not around it.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: Direct GL posting, bypasses Orchestrator
async issueAdvance(amount) {
  // Direct GL post without Orchestrator
  const glEntry = await glService.post({
    lines: [
      { glAccountId: '140', debit: amount, credit: null },
      { glAccountId: '101', debit: null, credit: amount },
    ],
  });
  return glEntry;
}

// ❌ REJECTED: Direct budget update, bypasses Orchestrator
async allocateBudget(grant, amount) {
  // Direct budget update without Orchestrator coordination
  UPDATE budgets SET amount = amount WHERE grant_id = grant;
  return amount;
}
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: All operations via Orchestrator
async issueAdvance(amount, context) {
  // Orchestrator decides GL posting, saga coordination, etc.
  const result = await orchestrator.issueAdvance(amount, context);
  return result;
}

async allocateBudget(grant, amount, context) {
  // Orchestrator decides budget update, event publishing, etc.
  const result = await orchestrator.allocateBudget(grant, amount, context);
  return result;
}
```

**Enforcement**: Code review verifies all financial operations call Orchestrator, not isolated engines.

---

## Rule 6: Never Call Another Engine Directly

**Statement**: Engines don't call each other. Only Orchestrator calls engines.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: Engine-to-engine call
class BudgetEngine {
  async allocate(grant, amount) {
    // DON'T do this:
    const glResult = new GLEngine().post(/* ... */);
    // Circular dependency risk; bypasses Orchestrator
  }
}
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: Only Orchestrator coordinates engines
class FinanceOrchestratorEngine {
  async allocateBudget(grant, amount, context) {
    // 1. Call BudgetEngine
    const budgetResult = await budgetEngine.allocate(grant, amount);
    
    // 2. Publish event
    await eventBus.publish(BudgetAllocatedEvent);
    
    // 3. (Maybe) Call GLEngine if needed
    // (But don't let BudgetEngine call GLEngine directly)
    
    return { budgetResult, eventPublished: true };
  }
}

class BudgetEngine {
  async allocate(grant, amount) {
    // Only database operations; no calling other engines
    UPDATE budgets SET allocated = amount WHERE grant_id = grant;
    return { allocated: amount };
  }
}
```

**Enforcement**: Architecture compliance checklist verifies no direct engine-to-engine calls.

---

## Rule 7: Always Publish Events

**Statement**: Every financial state change publishes an event.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: GL posted without event
async postGL(entry, context) {
  await db.insert('journal_entries', entry);
  return { status: 'ok' }; // No event published!
}

// ❌ REJECTED: Budget updated without event
async updateBudget(grant, amount) {
  UPDATE budgets SET amount = amount WHERE grant_id = grant;
  // No event; no one knows budget changed!
}
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: Event published before response
async postGL(entry, context) {
  // 1. Insert GL entry
  const posted = await db.insert('journal_entries', entry);
  
  // 2. Publish event (BEFORE returning to client)
  await eventBus.publish(GLPostedEvent, {
    journalEntryId: posted.id,
    grantId: entry.grantId,
    amount: entry.amount,
  });
  
  // 3. Return to client
  return { status: 'ok', journalEntryId: posted.id };
}

// ✅ APPROVED: Event published for budget changes
async updateBudget(grant, amount, context) {
  // 1. Update budget
  UPDATE budgets SET amount = amount WHERE grant_id = grant;
  
  // 2. Publish event
  await eventBus.publish(BudgetAllocatedEvent, {
    grantId: grant.id,
    amount,
  });
  
  // 3. Return to client
  return { status: 'ok', amount };
}
```

**Enforcement**: Code review verifies all state changes publish events.

---

## Rule 8: Always Update Event Store

**Statement**: Every event persisted to immutable event store.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: Event published but not stored
async publish(event) {
  // Call subscribers
  this.subscribers.forEach(sub => sub(event));
  
  // But don't store in event store!
  // If system crashes, event is lost
}
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: Event stored before publishing
async publish(event, context) {
  // 1. Store in event store (append-only)
  const stored = await eventStore.append(event);
  
  // 2. Publish to subscribers
  this.subscribers.forEach(sub => sub(stored));
  
  // 3. Return
  return { eventId: stored.id };
}
```

**Enforcement**: Code review verifies all events persisted to event store.

---

## Rule 9: Always Preserve Idempotency

**Statement**: Same request repeated must return same result (safe to retry).

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: Non-idempotent GL posting
async postGL(entry) {
  // If called twice, GL posted twice!
  INSERT INTO journal_entries VALUES(entry);
  return { status: 'ok' };
}

// ❌ REJECTED: Non-idempotent budget allocation
async allocateBudget(grant, amount) {
  // If called twice, budget doubled!
  UPDATE budgets SET allocated = allocated + amount WHERE grant_id = grant;
}
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: Idempotent GL posting (check for duplicate)
async postGL(entry, context) {
  // 1. Check if already posted (via sourceEventId)
  const existing = await db.query(
    'SELECT * FROM journal_entries WHERE source_event_id = ?',
    [entry.sourceEventId]
  );
  
  if (existing) {
    return { status: 'ok', journalEntryId: existing.id }; // Idempotent!
  }
  
  // 2. Post GL
  const posted = await db.insert('journal_entries', entry);
  
  // 3. Publish event
  await eventBus.publish(GLPostedEvent, posted);
  
  return { status: 'ok', journalEntryId: posted.id };
}

// ✅ APPROVED: Idempotent budget allocation
async allocateBudget(grant, amount, context) {
  // 1. Check if already allocated
  const existing = await db.query(
    'SELECT allocated FROM budgets WHERE grant_id = ? AND version = ?',
    [grant.id, context.idempotencyKey]
  );
  
  if (existing) {
    return { status: 'ok', allocated: existing.allocated }; // Idempotent!
  }
  
  // 2. Allocate (SET, not ADD)
  UPDATE budgets SET allocated = ? WHERE grant_id = ? AND version = ?;
  
  // 3. Publish event
  await eventBus.publish(BudgetAllocatedEvent);
  
  return { status: 'ok', allocated: amount };
}
```

**Enforcement**: Code review verifies idempotency keys used; tests verify repeated calls are safe.

---

## Rule 10: Always Preserve Double-Entry Accounting

**Statement**: Every GL entry has debits = credits (always).

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: Imbalanced GL entry posted
const entry = {
  lines: [
    { glAccountId: '101', debit: 1000, credit: null },
    { glAccountId: '610', debit: null, credit: 500 }, // Only $500, but $1000 debited!
  ],
};

await orchestrator.postGL(entry); // Should fail!
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: GL entry always balanced
async postGL(entry, context) {
  // 1. Validate balance
  const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  
  if (totalDebit !== totalCredit) {
    throw new Error(`GL imbalanced: debits ${totalDebit} ≠ credits ${totalCredit}`);
  }
  
  // 2. Post GL
  const posted = await db.insert('journal_entries', entry);
  
  // 3. Publish event
  await eventBus.publish(GLPostedEvent, posted);
  
  return { status: 'ok', journalEntryId: posted.id };
}
```

**Enforcement**: Code review verifies GL balance check before posting; tests verify imbalance throws error.

---

## Rule 11: Always Preserve Donor Traceability

**Statement**: Every GL entry traces to a grant and donor (can answer "which donor funded this?").

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: GL entry without grant attribution
const entry = {
  lines: [
    { glAccountId: '610', debit: 1000, credit: null },
    { glAccountId: '101', debit: null, credit: 1000 },
  ],
  // No grantId! Can't trace to donor.
};

await orchestrator.postGL(entry); // Should fail!
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: GL entry always includes grant attribution
async postGL(entry, context) {
  // 1. Require grantId
  if (!entry.grantId) {
    throw new Error('GL entry must include grantId for donor traceability');
  }
  
  // 2. Verify grant exists
  const grant = await db.query('SELECT * FROM grants WHERE id = ?', [entry.grantId]);
  if (!grant) {
    throw new Error(`Grant ${entry.grantId} not found`);
  }
  
  // 3. Post GL with grant context
  const posted = await db.insert('journal_entries', {
    ...entry,
    grant_id: entry.grantId,
    donor_id: grant.donor_id, // Preserve donor context
  });
  
  // 4. Publish event (includes grant/donor)
  await eventBus.publish(GLPostedEvent, {
    ...posted,
    grantId: entry.grantId,
    donorId: grant.donor_id,
  });
  
  return { status: 'ok', journalEntryId: posted.id };
}
```

**Enforcement**: Code review verifies all GL entries include grantId; tests verify queries can filter by donor.

---

## Rule 12: Always Reference Architecture Decision Records (ADRs)

**Statement**: When implementing a feature, cite which ADR authorizes it.

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: Code doesn't explain architectural decision
class FinanceOrchestratorEngine {
  async postGL(entry, context) {
    // Code is here, but no comment explaining why
    // Is GL posting here because of an ADR? Which one?
  }
}
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: Code cites ADR
class FinanceOrchestratorEngine {
  /**
   * Post GL entry
   * 
   * Implements:
   * - ADR-001: Finance Orchestrator is mandatory (central coordinator)
   * - ADR-003: GL entries immutable after posting (no edits, only reversals)
   * - ADR-004: GL posting at payment, not invoice
   */
  async postGL(entry, context) {
    // Validation (ADR-003: immutable)
    const existing = await db.query(/* ... */);
    if (existing) return { status: 'ok', journalEntryId: existing.id };
    
    // Balance check (ADR-010: double-entry accounting)
    const balance = validateBalance(entry);
    if (!balance) throw new Error('Imbalanced');
    
    // Post
    const posted = await db.insert('journal_entries', entry);
    
    // Publish event (ADR-002: event-driven)
    await eventBus.publish(GLPostedEvent, posted);
    
    return { status: 'ok', journalEntryId: posted.id };
  }
}
```

**Enforcement**: Code review verifies all significant logic cites relevant ADR(s).

---

## Code Organization Rules

### Rule 13: Use Established File Structure

**Structure**:
```
src/server/finance/
  engines/
    FinanceOrchestratorEngine.ts
    BudgetEngine.ts
    (...other engines)
  services/
    (Business logic that doesn't fit engines)
  repositories/
    BudgetRepository.ts
    GLRepository.ts
    (...)
  routers/
    financeDashboardRouter.ts
    financeReportsRouter.ts
    (...)
  events/
    DomainEventBus.ts
    EventStore.ts
    FinancialEventTypes.ts
  __tests__/
    regression.test.ts
    integration.test.ts
    (...)
```

**Violation**: Putting files in wrong locations (e.g., GL posting logic in `services/`).

**Enforcement**: File structure reviewed in PR.

---

### Rule 14: Use TypeScript Strict Mode

**Violation Examples** (will be rejected):
```typescript
// ❌ REJECTED: any type used
let result: any = await orchestrator.postGL(entry);

// ❌ REJECTED: Implicit any
function postGL(entry) { /* ... */ }

// ❌ REJECTED: Null/undefined not handled
const account = await glService.getAccount('101');
const balance = account.balance + 100; // What if account is null?
```

**Correct Implementation** (will be approved):
```typescript
// ✅ APPROVED: Explicit types
const result: GLPostingResult = await orchestrator.postGL(entry);

// ✅ APPROVED: Function typed
async function postGL(entry: JournalEntryInput): Promise<GLPostingResult> { /* ... */ }

// ✅ APPROVED: Null handled
const account = await glService.getAccount('101');
const balance = (account?.balance ?? 0) + 100;
```

**Enforcement**: `npm run type-check` must pass (tsc --strict).

---

### Rule 15: No console.log() in Production Code

**Violation**: `console.log('GL posting...') ` in finance module.

**Correct Implementation**: Use structured logger.
```typescript
import { logger } from '@/utils/logger';

logger.info('GL posting', {
  journalEntryId: entry.id,
  amount: entry.amount,
  grantId: entry.grantId,
});
```

**Enforcement**: Linting rule rejects console.log(); `grep -r "console\."` in CI.

---

## Testing Rules

### Rule 16: >80% Coverage on Critical Paths

**Critical paths**:
- GL posting
- Budget allocation
- Advance issue/liquidation
- Payment release
- Multi-org isolation

**Violation**: PR with <80% coverage on FinanceOrchestratorEngine.ts.

**Correct Implementation**: Tests cover success case, error cases, edge cases.

**Enforcement**: Coverage report generated; PR rejected if <80%.

---

### Rule 17: Integration Tests Validate End-to-End

**Test every feature end-to-end**:
- Budget allocation → GL posting (if applicable) → event published → dashboard updated
- Advance issued → GL posted → liquidation submitted → GL reversed
- PO issued → GRN received → Invoice matched → Payment released → GL posted

**Violation**: Only unit tests, no integration tests.

**Enforcement**: PR must include integration tests.

---

## Documentation Rules

### Rule 18: Every Complex Function Has JSDoc

**Violation** (will be rejected):
```typescript
async postGL(entry, context) {
  // No JSDoc explaining what this does
}
```

**Correct Implementation** (will be approved):
```typescript
/**
 * Post a GL entry to the journal.
 * 
 * Implements ADR-001 (Orchestrator), ADR-003 (immutability), ADR-004 (timing).
 * 
 * @param entry - Journal entry with balanced lines
 * @param context - ScopeContext with organizationId, operatingUnitId
 * @returns { status: 'ok' | 'error'; journalEntryId?: string; error?: string }
 * @throws Error if entry is imbalanced or organizationId missing
 * 
 * @example
 * const result = await orchestrator.postGL({
 *   lines: [
 *     { glAccountId: '101', debit: 1000, credit: null },
 *     { glAccountId: '610', debit: null, credit: 1000 },
 *   ],
 *   grantId: 'grant-001',
 * }, { organizationId: 'org-a', operatingUnitId: 'ou-a' });
 */
async postGL(entry: JournalEntryInput, context: ScopeContext): Promise<GLPostingResult>
```

**Enforcement**: Linting rule warns if complex function lacks JSDoc.

---

### Rule 19: README Updated for New Features

**Violation**: New feature implemented; README not updated.

**Correct Implementation**: PR updates `/docs/finance/FEATURES.md` with:
- Feature name
- What changed
- Why
- Any migration steps

**Enforcement**: Code review checks PR description mentions documentation update.

---

## PR Submission Rules

### Rule 20: PR Description Includes Checklist

**Template**:
```markdown
## What Changed
[Describe feature]

## Why
[Explain business value]

## Architecture Compliance
- [x] No direct engine calls (routed through Orchestrator)
- [x] Events published (GLPostingCompleted event fired)
- [x] GL immutable (no UPDATE after posting)
- [x] Multi-org isolated (queries filter by organizationId)
- [x] Type-safe (TypeScript strict mode passes)
- [x] Idempotent (can retry safely)
- [x] >80% test coverage
- [x] ADRs cited (ADR-001, ADR-003)

## Testing
- [x] 35 regression tests pass
- [x] New tests added (X new tests)
- [x] Integration tests cover end-to-end

## Deployment
- [x] Backward compatible
- [x] No breaking changes
- [x] Migration plan (if needed)
```

**Enforcement**: PR without checklist is not merged.

---

## Summary: The 12 Core Rules

1. ✅ Never duplicate business logic
2. ✅ Never replace existing functionality
3. ✅ Always maintain backward compatibility
4. ✅ Always preserve audit trail
5. ✅ Never bypass Finance Orchestrator
6. ✅ Never call another engine directly
7. ✅ Always publish events
8. ✅ Always update event store
9. ✅ Always preserve idempotency
10. ✅ Always preserve double-entry accounting
11. ✅ Always preserve donor traceability
12. ✅ Always reference ADRs

**If you remember nothing else, remember these 12.**

---

## Escalation Path

**If Claude (or developer) violates a rule**:

1. **Code review flags violation** — "Violates Rule 7: Event not published"
2. **PR rejected** — "Cannot merge until event is published"
3. **Developer fixes** — Adds event publishing
4. **Re-review** — PR resubmitted
5. **Merge** — After all 12 rules satisfied

**No exceptions. No "I'll fix it in next PR." No "It doesn't matter this time."**

---

## Related Documents
- **ExecutiveDesignPrinciples.md**: Principles; these are implementation rules
- **ArchitectureDecisionRecords.md**: ADRs that justify these rules
- **ArchitectureComplianceChecklist.md**: Checklist validates these rules in code review

---

**Claude: This is your permanent rulebook. Follow it for all 12 phases.**
