# Enterprise Finance Test Strategy
## Comprehensive Testing Framework for Finance Module Modernization

**Version**: 1.0  
**Status**: Phase 1 Governance - Quality Assurance Strategy  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

---

## Overview

This document defines **how we test** the finance module across 12 phases of modernization. It covers all testing dimensions: unit, integration, financial validation, performance, disaster recovery, security, AI, and UAT.

**Goal**: Every phase delivers code that is correct, fast, secure, auditable, and backward compatible.

---

## Testing Pyramid

```
                    UAT (6 teams)
                   /            \
              Security Tests     AI Validation
             /                \
        Disaster Recovery    Performance Tests
       /                    \
   Financial Validation    Integration Tests
  /                       \
Unit Tests (>80% coverage)
```

---

## Layer 1: Unit Tests

### Coverage Target

- **Overall**: ≥85% code coverage
- **Critical paths**: 95% (GL posting, budget allocation, advance lifecycle)
- **Error handling**: 100% (every error case tested)

### Test Structure

**File naming**: `{module}.test.ts` (same directory as source)

```
src/server/finance/
  engines/
    FinanceOrchestratorEngine.ts
    FinanceOrchestratorEngine.test.ts  ← Unit test
  services/
    AdvanceService.ts
    AdvanceService.test.ts  ← Unit test
```

### Test Examples

#### Example 1: GL Posting Validation

```typescript
describe('FinanceOrchestratorEngine.postGL', () => {
  describe('GL Balance Validation', () => {
    test('accepts balanced entry (debits = credits)', async () => {
      const entry: JournalEntryInput = {
        lines: [
          { glAccountId: '101', debit: 1000, credit: null },
          { glAccountId: '610', debit: null, credit: 1000 },
        ],
      };
      
      const result = await orchestrator.postGL(entry, context);
      
      expect(result.status).toBe('ok');
      expect(result.journalEntryId).toBeDefined();
    });
    
    test('rejects imbalanced entry (debits ≠ credits)', async () => {
      const entry: JournalEntryInput = {
        lines: [
          { glAccountId: '101', debit: 1000, credit: null },
          { glAccountId: '610', debit: null, credit: 500 }, // Imbalance!
        ],
      };
      
      const result = await orchestrator.postGL(entry, context);
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Debits must equal credits');
    });
  });
  
  describe('Multi-Org Isolation', () => {
    test('orgA GL not visible to orgB', async () => {
      // Post GL for orgA
      await orchestrator.postGL(entry, { organizationId: 'org-a', operatingUnitId: 'ou-a' });
      
      // Query as orgB
      const glForB = await glService.getEntries({ organizationId: 'org-b', operatingUnitId: 'ou-b' });
      
      expect(glForB.length).toBe(0); // OrgB sees nothing
    });
  });
  
  describe('Idempotency', () => {
    test('posting same event twice returns same result', async () => {
      const event = { sourceEventId: 'INV-001', amount: 1000 };
      
      const result1 = await orchestrator.postGL(event, context);
      const result2 = await orchestrator.postGL(event, context);
      
      expect(result1.journalEntryId).toBe(result2.journalEntryId);
      expect(result1.status).toBe(result2.status);
    });
  });
});
```

#### Example 2: Budget Allocation

```typescript
describe('BudgetEngine.allocate', () => {
  test('allocates budget correctly', async () => {
    const allocation = await budgetEngine.allocate({
      grantId: 'grant-001',
      amount: 100000,
    });
    
    expect(allocation.allocated).toBe(100000);
    expect(allocation.spent).toBe(0);
    expect(allocation.available).toBe(100000);
  });
  
  test('rejects allocation exceeding grant', async () => {
    const result = await budgetEngine.allocate({
      grantId: 'grant-001', // Total $50K
      amount: 100000, // Try to allocate $100K
    });
    
    expect(result.status).toBe('error');
    expect(result.error).toContain('exceeds grant');
  });
});
```

#### Example 3: Advance Lifecycle

```typescript
describe('AdvanceService', () => {
  test('advance issue → liquidation → closure', async () => {
    // Issue
    const advance = await advanceService.issue({
      employeeId: 'emp-001',
      amount: 500,
    });
    expect(advance.status).toBe('issued');
    
    // Liquidate
    const liquidation = await advanceService.liquidate({
      advanceId: advance.id,
      spent: 450,
    });
    expect(liquidation.refundDue).toBe(50);
    expect(liquidation.status).toBe('ok');
    
    // Verify closed
    const closed = await advanceService.get(advance.id);
    expect(closed.status).toBe('closed');
  });
  
  test('orphaned advance (>45 days) is flagged', async () => {
    const advance = await advanceService.issue({ amount: 500 });
    
    // Advance 45 days
    jest.advanceTimersByTime(45 * 24 * 60 * 60 * 1000);
    
    const risk = await riskService.getFinancialRisk(context);
    expect(risk.violations).toContain('ORPHANED_ADVANCE');
  });
});
```

### Coverage Reporting

**Command**:
```bash
npm test -- --coverage

# Output:
# File                               | % Stmts | % Branches | % Lines |
# FinanceOrchestratorEngine.ts       | 91.2    | 89.4       | 92.1    |
# BudgetEngine.ts                    | 87.5    | 85.2       | 88.3    |
# AdvanceService.ts                  | 94.1    | 93.2       | 95.0    |
# ────────────────────────────────────────────────────────────────
# ALL FILES                          | 87.8    | 86.1       | 88.9    |
# ────────────────────────────────────────────────────────────────
# Target: ≥85% — PASS ✓
```

---

## Layer 2: Integration Tests

### Test Structure

**File naming**: `{feature}.integration.test.ts` (separate test directory)

```
src/server/finance/__tests__/
  integration/
    gl-posting.integration.test.ts
    budget-allocation.integration.test.ts
    advance-lifecycle.integration.test.ts
    multi-org-isolation.integration.test.ts
```

### Integration Path (Full Stack)

```
tRPC Endpoint
    ↓
tRPC Router (input validation, auth)
    ↓
Orchestrator Engine (coordination)
    ↓
Domain Service (business logic)
    ↓
Repository (data access)
    ↓
Database (schema, constraints)
    ↓
Event Bus (event publishing)
    ↓
Event Store (persistence)
```

### Integration Test Examples

#### Example 1: End-to-End GL Posting

```typescript
describe('GL Posting - Full Stack', () => {
  test('tRPC endpoint → Orchestrator → DB → Event Store', async () => {
    // 1. Call tRPC endpoint (simulating UI)
    const response = await caller.finance.gl.post({
      lines: [
        { glAccountId: '101', debit: 1000, credit: null },
        { glAccountId: '610', debit: null, credit: 1000 },
      ],
    });
    
    // 2. Verify GL entry in database
    const glEntry = await db.query(
      'SELECT * FROM journal_entries WHERE id = ?',
      [response.journalEntryId]
    );
    expect(glEntry).toBeDefined();
    expect(glEntry.is_deleted).toBe(false);
    
    // 3. Verify event in event store
    const event = await eventStore.query(
      'SELECT * FROM events WHERE causation_id = ?',
      [glEntry.id]
    );
    expect(event).toBeDefined();
    expect(event.event_type).toBe('GLPostedEvent');
    
    // 4. Verify immutability (cannot edit)
    const editResult = await caller.finance.gl.edit({
      journalEntryId: glEntry.id,
      newAmount: 2000,
    });
    
    expect(editResult.status).toBe('error');
    expect(editResult.error).toContain('immutable');
  });
});
```

#### Example 2: Advance Lifecycle (Full Stack)

```typescript
describe('Advance Issue → Liquidation → Closure - Full Stack', () => {
  test('complete lifecycle through all layers', async () => {
    // 1. Issue advance via tRPC
    const issueResult = await caller.finance.advance.issue({
      employeeId: 'emp-001',
      amount: 500,
    });
    
    expect(issueResult.status).toBe('ok');
    const advanceId = issueResult.advanceId;
    
    // 2. Verify GL posted
    const glAfterIssue = await db.query(
      'SELECT * FROM journal_entries WHERE correlation_id = ?',
      [advanceId]
    );
    expect(glAfterIssue.length).toBeGreaterThan(0);
    
    // 3. Verify event published
    const eventAfterIssue = await eventStore.query(
      'SELECT * FROM events WHERE event_type = "AdvanceIssuedEvent" AND correlation_id = ?',
      [advanceId]
    );
    expect(eventAfterIssue).toBeDefined();
    
    // 4. Liquidate via tRPC
    const liquidateResult = await caller.finance.advance.liquidate({
      advanceId,
      spent: 450,
    });
    
    expect(liquidateResult.status).toBe('ok');
    
    // 5. Verify GL reversed
    const glAfterLiquidate = await db.query(
      'SELECT * FROM journal_entries WHERE correlation_id = ?',
      [advanceId]
    );
    
    const totalDebit = glAfterLiquidate.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = glAfterLiquidate.reduce((sum, e) => sum + (e.credit || 0), 0);
    expect(totalDebit).toBe(totalCredit); // All entries balance
  });
});
```

#### Example 3: Multi-Org Isolation (Full Stack)

```typescript
describe('Multi-Org Isolation - Full Stack', () => {
  test('orgA data completely isolated from orgB', async () => {
    // 1. Post GL for orgA
    const orgA = { organizationId: 'org-a', operatingUnitId: 'ou-a' };
    await caller.finance.gl.post(
      { lines: [...] },
      { context: orgA }
    );
    
    // 2. Query as orgB (should see nothing)
    const orgB = { organizationId: 'org-b', operatingUnitId: 'ou-b' };
    const glForB = await caller.finance.gl.getAll(
      { context: orgB }
    );
    
    expect(glForB.length).toBe(0);
    
    // 3. Verify database directly (also isolated)
    const dbQueryOrgA = await db.query(
      'SELECT * FROM journal_entries WHERE organization_id = ?',
      ['org-a']
    );
    const dbQueryOrgB = await db.query(
      'SELECT * FROM journal_entries WHERE organization_id = ?',
      ['org-b']
    );
    
    expect(dbQueryOrgA.length).toBeGreaterThan(0);
    expect(dbQueryOrgB.length).toBe(0); // OrgB still sees nothing
  });
});
```

---

## Layer 3: Financial Validation Tests

### Test Examples

#### Test 1: Debit = Credit (GL Balance)

```typescript
describe('Financial Validation: GL Balance', () => {
  test('GL trial balance always balances', async () => {
    // Post 100 random GL entries
    for (let i = 0; i < 100; i++) {
      await orchestrator.postGL(generateBalancedEntry(), context);
    }
    
    // Generate trial balance
    const trialBalance = await glService.generateTrialBalance({ context });
    
    const totalDebit = trialBalance.reduce((sum, acc) => sum + (acc.debit || 0), 0);
    const totalCredit = trialBalance.reduce((sum, acc) => sum + (acc.credit || 0), 0);
    
    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(0); // Assets = Liabilities + Equity
  });
});
```

#### Test 2: Budget Formula

```typescript
describe('Financial Validation: Budget Formula', () => {
  test('Available = Allocated - Committed - Spent', async () => {
    const budget = await budgetService.allocate({
      grantId: 'grant-001',
      amount: 100000,
    });
    
    // Commit $40K (PO issued)
    await orchestrator.commitBudget({
      grantId: 'grant-001',
      amount: 40000,
    });
    
    // Spend $30K (GL posted)
    await orchestrator.spendBudget({
      grantId: 'grant-001',
      amount: 30000,
    });
    
    // Verify formula
    const updated = await budgetService.get('grant-001', context);
    
    expect(updated.allocated).toBe(100000);
    expect(updated.committed).toBe(40000);
    expect(updated.spent).toBe(30000);
    expect(updated.available).toBe(30000); // 100K - 40K - 30K
  });
});
```

#### Test 3: Cash Forecast

```typescript
describe('Financial Validation: Cash Forecast', () => {
  test('forecast matches GL cash position + scheduled payments', async () => {
    // Current cash position
    const currentCash = await glService.getAccountBalance('101-USD', context);
    expect(currentCash).toBe(100000);
    
    // Scheduled obligations
    const obligations = await paymentService.getScheduled({
      startDate: new Date(),
      endDate: add(new Date(), { weeks: 4 }),
    });
    
    const totalObligations = obligations.reduce((sum, p) => sum + p.amount, 0);
    expect(totalObligations).toBe(60000); // $60K due in 4 weeks
    
    // Forecast: current cash - obligations
    const forecast = await forecastService.generateForecast({
      weeks: 4,
    });
    
    expect(forecast[0].cashPosition).toBe(100000); // Week 0 = current
    expect(forecast[4].cashPosition).toBe(40000); // Week 4 = 100K - 60K
  });
});
```

#### Test 4: FX Gain/Loss

```typescript
describe('Financial Validation: FX Gain/Loss', () => {
  test('FX variance calculated correctly', async () => {
    // Transfer $1000 USD to KES at rate 1 USD = 150 KES
    // Expected: 150K KES
    // Actual: 151K KES (better rate)
    // FX Gain: 1K KES (≈ $6.67)
    
    const glResult = await orchestrator.postGL({
      lines: [
        { glAccountId: '101-KES', debit: 151000, credit: null }, // Actual received
        { glAccountId: '101-USD', debit: null, credit: 1000 }, // USD sent
        { glAccountId: '730', debit: null, credit: 0 }, // FX gain (not captured in transfer)
      ],
    }, context);
    
    expect(glResult.status).toBe('ok');
    
    // Verify FX gain recorded separately if needed
    const glEntries = await glService.getEntriesByCorrelationId(glResult.journalEntryId, context);
    const fxGain = glEntries.find(e => e.glAccountId === '730');
    
    // (FX handling depends on org accounting model)
  });
});
```

#### Test 5: Donor Report Accuracy

```typescript
describe('Financial Validation: Donor Report Accuracy', () => {
  test('donor report GL totals match actual GL', async () => {
    // Create USAID grant with $100K allocation
    const grant = await grantService.create({
      donorId: 'usaid',
      amount: 100000,
    });
    
    // Post GL expenses (USAID only)
    await orchestrator.postGL({
      lines: [
        { glAccountId: '401-USAID', debit: null, credit: 50000 }, // Revenue
        { glAccountId: '610-USAID', debit: 50000, credit: null }, // Expense
      ],
      grantId: grant.id,
    }, context);
    
    // Generate donor report
    const report = await reportService.generateDonorReport({
      grantId: grant.id,
      donorId: 'usaid',
    });
    
    // Verify GL in report matches actual GL
    expect(report.totalRevenue).toBe(50000);
    expect(report.totalExpense).toBe(50000);
    expect(report.balance).toBe(0);
  });
});
```

#### Test 6: Trial Balance & Balance Sheet

```typescript
describe('Financial Validation: Balance Sheet', () => {
  test('balance sheet equation: Assets = Liabilities + Equity', async () => {
    const balanceSheet = await reportService.generateBalanceSheet({ context });
    
    const totalAssets = balanceSheet.assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = balanceSheet.liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = balanceSheet.equity.reduce((sum, e) => sum + e.balance, 0);
    
    expect(totalAssets).toBe(totalLiabilities + totalEquity);
  });
});
```

#### Test 7: Cash Flow Statement

```typescript
describe('Financial Validation: Cash Flow Statement', () => {
  test('cash flow accounts for all cash movements', async () => {
    const cashFlow = await reportService.generateCashFlow({ context });
    
    // Operating activities
    const operatingCash = cashFlow.operating.reduce((sum, item) => sum + item.amount, 0);
    
    // Investing activities
    const investingCash = cashFlow.investing.reduce((sum, item) => sum + item.amount, 0);
    
    // Financing activities
    const financingCash = cashFlow.financing.reduce((sum, item) => sum + item.amount, 0);
    
    // Net change in cash
    const netChange = operatingCash + investingCash + financingCash;
    
    // Verify against GL bank balance change
    const openingCash = glService.getAccountBalance('101-USD', { ...context, month: 'January' });
    const closingCash = glService.getAccountBalance('101-USD', { ...context, month: 'February' });
    
    expect(netChange).toBe(closingCash - openingCash);
  });
});
```

---

## Layer 4: Performance Tests

### SLA Targets

| Operation | P95 Latency | Tool |
|-----------|-------------|------|
| GL posting | <200ms | k6 or Artillery |
| Dashboard load | <2s | Lighthouse |
| Report generation | <5min | Custom timer |
| Query 1M GL entries | <1s | k6 |
| Event store replay 100K events | <1min | k6 |

### Test Examples

#### Test 1: GL Posting Latency

```typescript
describe('Performance: GL Posting', () => {
  test('GL posting meets <200ms P95 SLA', async () => {
    const latencies: number[] = [];
    
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      
      await orchestrator.postGL({
        lines: [
          { glAccountId: '101', debit: 1000, credit: null },
          { glAccountId: '610', debit: null, credit: 1000 },
        ],
      }, context);
      
      const end = performance.now();
      latencies.push(end - start);
    }
    
    // Calculate P95
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    
    expect(p95).toBeLessThan(200); // <200ms P95
  });
});
```

#### Test 2: Query Performance (Large Journal)

```typescript
describe('Performance: Query 1M GL Entries', () => {
  test('query 1M GL entries in <1s', async () => {
    // Setup: 1M GL entries
    await setupLargeJournal(1000000);
    
    const start = performance.now();
    
    const entries = await glService.getEntries({
      organizationId: 'org-test',
      operatingUnitId: 'ou-test',
      limit: 100,
      offset: 0,
    });
    
    const end = performance.now();
    
    expect(end - start).toBeLessThan(1000); // <1s
  });
});
```

#### Test 3: Event Store Replay

```typescript
describe('Performance: Event Store Replay', () => {
  test('replay 100K events in <1min', async () => {
    // Setup: 100K events
    await setupEventStore(100000);
    
    const start = performance.now();
    
    await eventStore.replay({
      fromSequenceNumber: 1,
      toSequenceNumber: 100000,
    });
    
    const end = performance.now();
    
    expect(end - start).toBeLessThan(60000); // <60s
  });
});
```

---

## Layer 5: Disaster Recovery Tests

### Recovery Testing

#### Test 1: Database Restore

```typescript
describe('Disaster Recovery: Database Restore', () => {
  test('restore database from backup', async () => {
    // 1. Create snapshot
    const snapshot = await db.backup();
    
    // 2. Corrupt data (simulate disaster)
    await db.execute('DELETE FROM journal_entries'); // Oops!
    
    // 3. Verify data lost
    const entries = await glService.getEntries({ context });
    expect(entries.length).toBe(0);
    
    // 4. Restore from snapshot
    await db.restore(snapshot);
    
    // 5. Verify data recovered
    const restored = await glService.getEntries({ context });
    expect(restored.length).toBeGreaterThan(0);
  });
});
```

#### Test 2: Event Store Replay Recovery

```typescript
describe('Disaster Recovery: Event Store Replay', () => {
  test('replay events to rebuild GL from event log', async () => {
    // 1. Create GL entries and events
    await orchestrator.postGL({
      lines: [...],
    }, context);
    
    // 2. "Lose" GL entries (simulate corruption)
    await db.execute('DELETE FROM journal_entries');
    
    // 3. Rebuild GL from event log
    const events = await eventStore.getAllEvents();
    for (const event of events) {
      if (event.event_type === 'GLPostedEvent') {
        // Reconstruct GL entry from event
        await db.insert('journal_entries', {
          ...event.payload,
          recovered_at: new Date(),
        });
      }
    }
    
    // 4. Verify GL recovered
    const recovered = await glService.getEntries({ context });
    expect(recovered.length).toBe(events.filter(e => e.event_type === 'GLPostedEvent').length);
  });
});
```

### RTO & RPO Targets

| Metric | Target |
|--------|--------|
| **Recovery Time Objective (RTO)** | 1 hour (time to restore service) |
| **Recovery Point Objective (RPO)** | 15 min (max data loss acceptable) |

---

## Layer 6: Security Tests

### Test Examples

#### Test 1: RBAC Permission Checks

```typescript
describe('Security: Role-Based Access Control', () => {
  test('Finance User cannot approve GL posting', async () => {
    const user = { userId: 'user-001', roles: ['Finance User'] };
    
    const result = await caller.finance.gl.approve({
      journalEntryId: 'je-001',
    }, { user });
    
    expect(result.status).toBe('error');
    expect(result.error).toContain('insufficient permissions');
  });
  
  test('Finance Approver CAN approve GL posting', async () => {
    const user = { userId: 'user-002', roles: ['Finance Approver'] };
    
    const result = await caller.finance.gl.approve({
      journalEntryId: 'je-001',
    }, { user });
    
    expect(result.status).toBe('ok');
  });
});
```

#### Test 2: Segregation of Duties

```typescript
describe('Security: Segregation of Duties', () => {
  test('same user cannot create AND approve GL posting', async () => {
    const user = { userId: 'user-001', roles: ['Finance User', 'Finance Approver'] };
    
    // User creates PR
    const pr = await caller.procurement.createPR({
      amount: 1000,
    }, { user });
    
    // Same user tries to approve (should fail)
    const approval = await caller.procurement.approvePR({
      prId: pr.id,
    }, { user });
    
    expect(approval.status).toBe('error');
    expect(approval.error).toContain('segregation of duties violation');
  });
});
```

#### Test 3: Audit Trail Immutability

```typescript
describe('Security: Audit Trail Immutability', () => {
  test('cannot edit audit trail', async () => {
    const auditEntry = await auditService.getEntry('audit-001');
    expect(auditEntry).toBeDefined();
    
    // Try to edit
    const result = await db.execute(
      'UPDATE audit_log SET action = ? WHERE id = ?',
      ['FORGED_ACTION', 'audit-001']
    );
    
    // Should be rejected (table is append-only, no UPDATE permission)
    expect(result.error).toBeDefined();
  });
});
```

#### Test 4: SQL Injection Prevention

```typescript
describe('Security: SQL Injection Prevention', () => {
  test('malicious input cannot break query', async () => {
    const malicious = "'; DROP TABLE journal_entries; --";
    
    const result = await glService.getEntries({
      filter: malicious, // Attempt injection
    });
    
    // Should not execute DROP TABLE
    const tableExists = await db.execute(
      'SELECT * FROM journal_entries LIMIT 1'
    );
    expect(tableExists.error).toBeUndefined(); // Table still exists
  });
});
```

#### Test 5: Authorization (Can I do this?)

```typescript
describe('Security: Authorization', () => {
  test('user cannot view another org GL', async () => {
    const userOrgA = { userId: 'user-001', organizationId: 'org-a' };
    const userOrgB = { userId: 'user-002', organizationId: 'org-b' };
    
    // Post GL as orgA
    await caller.finance.gl.post({
      lines: [...],
    }, { user: userOrgA });
    
    // Try to view as orgB
    const result = await caller.finance.gl.getAll({}, { user: userOrgB });
    
    expect(result.length).toBe(0); // OrgB sees nothing
  });
});
```

---

## Layer 7: AI Validation Tests

### Test Examples

#### Test 1: Recommendation Accuracy

```typescript
describe('AI Validation: Treasury Agent Accuracy', () => {
  test('treasury agent recommends correct cash action', async () => {
    // Scenario: $50K cash, $60K due in 1 week
    // Expected recommendation: "Request grant tranche"
    
    const state = {
      currentCash: 50000,
      upcomingObligations: 60000,
      upcomingDate: add(new Date(), { weeks: 1 }),
    };
    
    const recommendation = await aiAgent.treasury.recommend(state);
    
    expect(recommendation.action).toBe('REQUEST_GRANT_TRANCHE');
    expect(recommendation.urgency).toBe('HIGH');
    expect(recommendation.confidence).toBeGreaterThan(0.95);
  });
});
```

#### Test 2: Confidence Scoring

```typescript
describe('AI Validation: Confidence Scoring', () => {
  test('AI provides confidence score', async () => {
    const recommendation = await aiAgent.budget.recommend({
      /* state */
    });
    
    expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
    expect(recommendation.confidence).toBeLessThanOrEqual(1);
    
    // High-confidence recommendation (e.g., >0.9)
    if (recommendation.confidence > 0.9) {
      expect(recommendation.reasoning).toBeDefined();
    }
  });
});
```

#### Test 3: Hallucination Detection

```typescript
describe('AI Validation: Hallucination Detection', () => {
  test('AI does not recommend non-existent action', async () => {
    const recommendation = await aiAgent.compliance.recommend({
      violationDetected: true,
    });
    
    // Must be from known action set
    const validActions = [
      'FLAG_VIOLATION',
      'REQUEST_WAIVER',
      'RECOMMEND_REALLOCATION',
    ];
    
    expect(validActions).toContain(recommendation.action);
  });
});
```

#### Test 4: Approval Workflow

```typescript
describe('AI Validation: Approval Required', () => {
  test('AI recommendation never auto-commits', async () => {
    const recommendation = await aiAgent.procurement.recommend({
      vendorToSelect: 'vendor-001',
    });
    
    // Recommendation exists
    expect(recommendation).toBeDefined();
    
    // But no GL posting happened
    const glEntries = await glService.getEntries({
      correlation: 'recommendation-' + recommendation.id,
    });
    expect(glEntries.length).toBe(0); // No auto-post
    
    // Human must approve
    const approval = await procurementService.approveRecommendation({
      recommendationId: recommendation.id,
    });
    
    expect(approval.status).toBe('ok'); // Only then GL posts
  });
});
```

---

## Layer 8: UAT (User Acceptance Testing)

### Finance Team UAT

```typescript
describe('UAT: Finance Team', () => {
  test('finance user can post GL and generate report', async () => {
    // 1. User logs in
    const user = await auth.login({ username: 'finance-user' });
    
    // 2. Post GL entry
    const glResult = await caller.finance.gl.post({
      lines: [/* ... */],
    }, { user });
    
    expect(glResult.status).toBe('ok');
    
    // 3. Generate trial balance
    const trialBalance = await caller.finance.report.generateTrialBalance({}, { user });
    
    expect(trialBalance.totalDebits).toBe(trialBalance.totalCredits);
    
    // 4. Generate donor report
    const donorReport = await caller.finance.report.generateDonorReport({
      grantId: 'grant-001',
    }, { user });
    
    expect(donorReport).toBeDefined();
  });
});
```

### Procurement Team UAT

```typescript
describe('UAT: Procurement Team', () => {
  test('procurement can issue PO and match invoice', async () => {
    const user = await auth.login({ username: 'procurement-user' });
    
    // 1. Issue PO
    const po = await caller.procurement.issuePO({
      vendorId: 'vendor-001',
      amount: 5000,
    }, { user });
    
    expect(po.status).toBe('issued');
    
    // 2. Receive goods
    const grn = await caller.logistics.recordGRN({
      poId: po.id,
      quantityReceived: 200,
    }, { user });
    
    expect(grn.status).toBe('ok');
    
    // 3. Match invoice
    const match = await caller.procurement.matchInvoice({
      poId: po.id,
      invoiceId: 'INV-001',
      amount: 5000,
    }, { user });
    
    expect(match.status).toBe('matched');
  });
});
```

### HR Team UAT

```typescript
describe('UAT: HR Team', () => {
  test('HR can issue advance and process liquidation', async () => {
    const user = await auth.login({ username: 'hr-user' });
    
    // 1. Issue advance
    const advance = await caller.hr.issueAdvance({
      employeeId: 'emp-001',
      amount: 500,
    }, { user });
    
    // 2. Liquidate
    const liquidation = await caller.hr.liquidateAdvance({
      advanceId: advance.id,
      spent: 450,
      receipts: [/* ... */],
    }, { user });
    
    expect(liquidation.refundDue).toBe(50);
  });
});
```

### Executive UAT

```typescript
describe('UAT: Executive (CFO)', () => {
  test('executive can view dashboard and AI insights', async () => {
    const user = await auth.login({ username: 'cfo' });
    
    // 1. View executive dashboard
    const dashboard = await caller.finance.dashboard.getExecutive({}, { user });
    
    expect(dashboard.cashPosition).toBeDefined();
    expect(dashboard.budgetUtilization).toBeDefined();
    expect(dashboard.forecastAccuracy).toBeDefined();
    
    // 2. View AI recommendations
    const recommendations = await caller.ai.executive.getRecommendations({}, { user });
    
    expect(recommendations.length).toBeGreaterThan(0);
  });
});
```

---

## Test Execution Matrix

### CI/CD Pipeline

```yaml
# .github/workflows/finance-tests.yml
name: Finance Testing

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test -- --coverage --testPathPattern='.test.ts$'
      - run: npm run type-check
      - uses: codecov/codecov-action@v3
      
  integration:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:15 }
    steps:
      - uses: actions/checkout@v3
      - run: npm test -- --testPathPattern='.integration.test.ts$'
      
  financial-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test -- --testPathPattern='financial-validation'
      
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:performance
      - uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: reports/performance.json
          
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:security
      - run: npm run lint:security
      
  disaster-recovery:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test -- --testPathPattern='disaster-recovery'
```

### Manual Testing Checklist

Before each phase release:

- [ ] Unit tests: ≥85% coverage, 100% pass
- [ ] Integration tests: end-to-end, all flows
- [ ] Financial validation: all 7 formulas verified
- [ ] Performance: all SLAs met (P95 latencies)
- [ ] Disaster recovery: RTO <1h, RPO <15min achieved
- [ ] Security: all RBAC, SOD, audit checks pass
- [ ] AI validation: confidence >90%, no hallucinations
- [ ] UAT: all 6 user roles tested successfully

---

## Test Result Reporting

### Monthly Report to Architecture Board

```markdown
## Finance Module Test Results - Month X

### Summary
- Unit Tests: 847 passed, 0 failed (96% coverage)
- Integration Tests: 92 passed, 0 failed
- Financial Validation: 35 passed, 0 failed
- Performance: All SLAs met (GL <200ms P95)
- Security: 25 tests passed, 0 failures
- UAT: All 6 roles tested successfully

### Trends
- Code coverage: 87% → 96% (+9%)
- Test execution time: 15m → 12m (-20%)
- Critical path failures: 2 → 0 (-100%)

### Regressions
- None detected

### Recommendation
✅ Ready for Phase [N+1]
```

---

## Related Documents
- **RegressionProtectionPlan.md**: Test domains and coverage
- **Phase2AcceptanceCriteria.md**: Tests required for phase completion
- **ArchitectureComplianceChecklist.md**: Code quality gates
- **ClaudeFinanceDevelopmentStandard.md**: AI testing requirements

---

**This comprehensive test strategy ensures the finance module is correct, fast, secure, and trustworthy across 12 phases of modernization.**
