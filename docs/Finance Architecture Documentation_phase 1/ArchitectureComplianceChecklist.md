# Architecture Compliance Checklist
## Pre-Merge Validation for Finance Module Code

**Version**: 1.0  
**Status**: Phase 1 Governance - Code Review Standard  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

---

## Purpose

Every PR to the Finance module must pass this checklist before merge. This prevents architectural drift and ensures consistency across all 12 phases.

**Rule**: If a PR fails any of these checks, it is rejected (not approved with exceptions).

---

## Checklist Categories

### Category 1: Orchestrator & Event-Driven

- [ ] **No direct engine-to-engine calls** — All communication routed through FinanceOrchestrator
  - Search code for: `new BudgetEngine`, `new GLEngine`, `new TreasuryEngine`, etc. calling each other
  - Allowed: FinanceOrchestrator calls engines; engines don't call each other
  - Violation: Will be rejected

- [ ] **Every financial transaction is an event** — GL posting, budget update, risk change all published as events
  - Search code for: GL posting that doesn't publish event (violation)
  - Check: Event published before returning to client (not async fire-and-forget)
  - Violation: Will be rejected

- [ ] **Event immutability enforced** — Events cannot be edited after creation
  - Search code for: `event.update()`, `event.patch()`, UPDATE events table — all violations
  - Check: Events marked as `readonly` in TypeScript
  - Violation: Will be rejected

- [ ] **Saga pattern for multi-step operations** — Orchestrator coordinates cross-engine operations with rollback
  - Check if PR involves: Budget check + GL posting + GL reversal? Must use Saga
  - Search for: Ad-hoc multi-step without rollback (violation)
  - Violation: Will be rejected

---

### Category 2: GL Integrity

- [ ] **No duplicate GL posting logic** — GL posting logic exists in exactly ONE place
  - Current state: GL posting in FinanceEngine, GeneralLedgerEngine, journalPostingService (3 places!)
  - New code must NOT add fourth place
  - Check: All GL posting calls go through FinanceOrchestrator.postGL()
  - Violation: Will be rejected

- [ ] **GL entries are immutable after posting** — No update/edit of GL after posting
  - Search code for: UPDATE journalLines WHERE ...; DELETE journalLines — violations
  - Corrections must be reversals (new GL entry with opposite amounts)
  - Violation: Will be rejected

- [ ] **GL must balance (Debits = Credits)** — Validation on every posting
  - Check: Every GL entry has validation `sum(debits) === sum(credits)`
  - Check: Throwing error if not balanced (not logging warning)
  - Violation: Will be rejected

- [ ] **GL posting is synchronous, not async** — User must know if GL post succeeded
  - Check code: Does tRPC procedure return after GL posting (not fire-and-forget)?
  - Check: Error is thrown immediately if GL posting fails (not delayed)
  - Violation: Will be rejected

- [ ] **GL traces to source event** — Every journal entry includes sourceEventId and sourceEventType
  - Check: `journalEntry.sourceEventId` is set and non-null
  - Check: `journalEntry.sourceEventType` matches FinanceEventCatalog
  - Violation: Will be rejected

---

### Category 3: Multi-Org Isolation

- [ ] **Every query includes organizationId filter** — No cross-org data leakage
  - Search code for: `SELECT * FROM journalLines` — violation if missing WHERE organization_id = $orgId
  - Check: organizationId and operatingUnitId both passed to every repository method
  - Check: ScopeContext used consistently
  - Violation: Will be rejected

- [ ] **Every mutation checks org ownership** — Can't modify another org's data
  - Check: Before updating GL entry, verify owner's organizationId matches
  - Check: Throw error if mismatch (not silently skip)
  - Violation: Will be rejected

- [ ] **No org-level cross-contamination in cache** — Cache keys include organizationId
  - Search code for: `cache.set('key', data)` — violation if 'key' doesn't include orgId
  - Allowed: `cache.set(\`org-\${orgId}-key\`, data)`
  - Violation: Will be rejected

---

### Category 4: Type Safety & Strong Typing

- [ ] **All inputs validated with Zod** — No raw string/number access
  - Check: Every tRPC input has `.input(SomeZodSchema)`
  - Check: GL account IDs validated against GL account enum/list
  - Check: Currency codes validated against supported currencies
  - Violation: Will be rejected

- [ ] **All GL columns explicitly referenced** — No string keys in GL queries
  - Old (violates): `where: { [column]: value }` where column is string
  - New (required): `where: { db.journalLines.debitAmount.equals(500) }`
  - Check: Using Drizzle ORM typed column references, not string keys
  - Violation: Will be rejected

- [ ] **Nullable types handled correctly** — Optional fields must be Optional<T>
  - Check: GL debitAmount and creditAmount are Optional (not required)
  - Check: Code handles null case (null coalescing, fallback)
  - Violation: Will be rejected

- [ ] **No `any` types in finance module** — All types explicitly defined
  - Search code for: `: any` — violation
  - Check: Use union types, discriminated unions, generics instead
  - Violation: Will be rejected

---

### Category 5: Idempotency & Retry Safety

- [ ] **All mutations are idempotent** — Same request repeated = same result
  - Check: Does GL posting check for duplicate event (via sourceEventId)?
  - Check: Does budget update use idempotency key?
  - Violation: Will be rejected

- [ ] **No side effects in query operations** — SELECT should not modify data
  - Search code for: Query procedure that updates database (violation)
  - Queries: `.query()` — read-only
  - Mutations: `.mutation()` — may modify
  - Violation: Will be rejected

---

### Category 6: Donor Compliance & Traceability

- [ ] **Every GL entry includes grantId** — Donor traceability built-in
  - Check: `journalEntry.grantId` is set and non-null
  - Check: Cannot be updated after posting (immutability)
  - Violation: Will be rejected

- [ ] **Donor rules applied before GL posting** — Compliance gates transaction
  - Check: Budget check before PR approval? ✓
  - Check: Donor GL mapping applied? ✓
  - Check: Expense category allowed by donor? ✓
  - Violation: Will be rejected

- [ ] **Compliance violations logged and reported** — Not silent failures
  - Check: If compliance check fails, is error thrown (not silent skip)?
  - Check: Is violation logged to audit trail?
  - Check: Is violation flagged in risk dashboard?
  - Violation: Will be rejected

---

### Category 7: Performance & Scaling

- [ ] **GL posting meets <200ms SLA** — Measured and monitored
  - Check: Is query indexed on (organization_id, operating_unit_id, created_at)?
  - Check: Is GL posting batched (not one-by-one)?
  - Check: Does code include timing metrics?
  - Violation: May be rejected if SLA broken

- [ ] **Query performance is O(1) or O(log n)** — No full table scans
  - Check: Queries use indexes
  - Check: No `LIKE %string%` on large tables
  - Check: Pagination used for large result sets
  - Violation: May be rejected

- [ ] **Caching strategy documented** — What is cached, TTL, invalidation
  - Check: Code includes comment: `// Cache GL accounts list, TTL 1 hour; invalidate on account change`
  - Check: Cache keys include organizationId
  - Violation: May be rejected if cache is undocumented

---

### Category 8: Testing & Validation

- [ ] **>80% code coverage on GL posting** — Unit tests for critical path
  - Check: `npm test -- --coverage` shows ≥80% on FinanceOrchestrator.ts
  - Check: Tests cover: success case, GL imbalance error, permission error, idempotency
  - Violation: Will be rejected

- [ ] **No test data mutations** — Tests use fixtures, not prod data
  - Search code for: References to real transaction IDs in tests (violation)
  - Check: Tests use `beforeEach` to reset to clean state
  - Violation: Will be rejected

- [ ] **Integration tests validate end-to-end** — Not just unit tests
  - Check: PR includes test: "Advance issued → GL posted → Budget committed → Liquidation submitted → GL reversed"
  - Check: Tests cover multi-org isolation (org A can't see org B's advance)
  - Violation: May be rejected if missing critical integration test

---

### Category 9: Audit & Logging

- [ ] **Audit trail logged before response** — No lost audit if service crashes
  - Check: Is audit logged inside transaction (before commit)?
  - Check: Does code block on audit log (not async)?
  - Violation: Will be rejected

- [ ] **All approvals are logged** — Who approved, when, what was approved
  - Check: PR approval adds entry to approval_history table
  - Check: Includes: userId, roleId, comment, timestamp
  - Violation: Will be rejected

- [ ] **Change history is immutable** — Audit trail cannot be edited
  - Check: Audit table has no UPDATE/DELETE triggers
  - Check: Queries include created_at DESC (immutable ordering)
  - Violation: Will be rejected

---

### Category 10: Backward Compatibility

- [ ] **No breaking changes to existing APIs** — Old code continues to work
  - Check: Is this a new tRPC procedure or an update to existing?
  - New procedure: OK to add
  - Existing procedure: Can add optional fields, but not remove or rename required fields
  - Violation: Will be rejected

- [ ] **Soft delete, never hard delete** — Old data is archived, not removed
  - Search code for: `DELETE FROM journalLines` — violation
  - Required: `UPDATE journalLines SET is_deleted = true WHERE id = ...`
  - Violation: Will be rejected

- [ ] **Data migration plan documented** — How does old data transition?
  - Check: Is there a migration script that handles existing records?
  - Check: Migration is tested (can rollback)?
  - Violation: May be rejected if missing migration

- [ ] **Old GL entries still visible (archived)** — Reports can show historical data
  - Check: Dashboard filters include `is_deleted = false`
  - Check: Audit report can show deleted entries (if needed for compliance)
  - Violation: May be rejected

---

### Category 11: Security

- [ ] **No secrets in code** — API keys, DB passwords in environment variables only
  - Search code for: Hardcoded API keys, passwords, tokens (violation)
  - Check: Using `process.env.SOME_SECRET`
  - Violation: Will be rejected

- [ ] **Authorization check before data access** — Role-based access control
  - Check: `if (!user.hasRole('Finance Admin')) throw new UnauthorizedError()`
  - Check: Every GL posting endpoint checks user role
  - Violation: Will be rejected

- [ ] **SQL injection prevention** — Parameterized queries always used
  - Search code for: String concatenation in SQL (violation)
  - Check: Using Drizzle ORM (parameterized by design)
  - Violation: Will be rejected

- [ ] **CORS properly configured** — API only accepts requests from IMS frontend
  - Check: CORS configured in Express middleware
  - Check: credentials: 'include' in fetch (if needed)
  - Violation: May be rejected if overly permissive

- [ ] **Rate limiting on sensitive endpoints** — Prevent brute force / DoS
  - Check: GL posting endpoint has rate limit
  - Check: Limit is reasonable (e.g., 100 req/min per org)
  - Violation: May be rejected

---

### Category 12: Documentation

- [ ] **Code comments explain the "why", not the "what"** — Code is self-documenting
  - Bad: `// Loop through GL entries`
  - Good: `// Group GL entries by grant for donor reporting; USAID requires separate GL account per grant`
  - Check: All non-obvious logic has comments
  - Violation: May be rejected

- [ ] **ADRs referenced in code** — Explain which architecture decision this implements
  - Check: GL immutability code includes: `// Implements ADR-003: GL Entries are Immutable`
  - Violation: May be rejected

- [ ] **README updated** — New feature documented
  - Check: Does PR update /docs or README?
  - Violation: May be rejected

---

## How to Use This Checklist

### For Claude (AI Assistant)

1. **Before generating code**: Familiarize with this checklist
2. **While generating code**: Include comments referencing checklist items
3. **In PR description**: List which checklist items are satisfied
4. **Example PR description**:
   ```
   ## Checklist
   - [x] Category 1: No direct engine calls (all routed through Orchestrator)
   - [x] Category 2: GL immutable after posting (validations included)
   - [x] Category 3: Multi-org filter on every query
   - [x] Category 4: All inputs validated with Zod
   - [x] Category 5: GL posting is idempotent (sourceEventId deduplicated)
   - [x] Category 6: grantId included, donor traceability
   - [x] Category 7: GL posting <200ms (indexed, tested)
   - [x] Category 8: 85% coverage, integration tests included
   - [x] Category 9: Audit trail immutable, approvals logged
   - [x] Category 10: Backward compatible, soft deletes used
   - [x] Category 11: No secrets in code, role checks included
   - [x] Category 12: Code comments explain why, ADRs referenced
   ```

### For Human Reviewers

1. **Open PR**: Check PR description for checklist
2. **Code review**: Spot-check items from each category
3. **Reject if**: Any category is not satisfied
4. **Approve only if**: All 12 categories pass

### For Architecture Board

1. **Monthly**: Review all merged PRs against this checklist
2. **Report**: "Phase 2 has 47 merged PRs; 100% pass compliance checklist"
3. **Drift detection**: If compliance rate drops, investigate why
4. **Checklist updates**: Add new items as architecture evolves

---

## Failure Mode: What Happens if PR Fails Checklist?

| Scenario | Action |
|----------|--------|
| PR fails Category 2 (GL duplication) | Rejected. Rewrite to use single GL posting source. |
| PR fails Category 3 (multi-org leak) | Rejected. Add organizationId filter to all queries. |
| PR fails Category 5 (not idempotent) | Rejected. Implement idempotency key check. |
| PR fails Category 8 (<80% coverage) | Rejected. Add tests until ≥80%. |
| PR fails Category 11 (hardcoded secret) | Rejected. Move to environment variable. |

**No exceptions. No "we'll fix it later." No merging with known failures.**

---

## Related Documents
- **ExecutiveDesignPrinciples.md**: Checklist items implement these principles
- **ArchitectureDecisionRecords.md**: Checklist items enforce these decisions
- **FinanceCodingStandards.md**: Checklist items require these standards

---

**This checklist is non-negotiable. Every PR must pass all 12 categories before merge.**
