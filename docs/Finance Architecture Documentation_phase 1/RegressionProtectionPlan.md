# Regression Protection Plan
## Comprehensive Testing Strategy for Finance Module Modernization

**Version**: 1.0  
**Status**: Phase 1 Governance - Quality Assurance  
**Last Updated**: 2026-07-02  
**Owner**: Finance Architecture Board

---

## Overview

The finance system is **live and operational**. Modernization must not break existing functionality.

**Risk**: 85% functionality exists; modernization affects 15%; must protect all 100%.

**Strategy**: Test 7 integration domains via automated regression suite (no manual testing of core paths).

---

## Domain 1: Financial Reconciliation

### What Can Break

- Bank reconciliation logic
- GL account balancing
- Multi-currency FX variance calculation
- Advance liquidation matching

### Test Coverage

#### Test 1: Bank Reconciliation Matches GL

```typescript
test('Bank reconciliation matches GL balance', async () => {
  // Scenario: Issue advance, post GL, reconcile bank
  
  // 1. Issue advance
  const advance = await advanceService.issueAdvance({
    organizationId: 'org-test',
    operatingUnitId: 'ou-test',
    amount: 1000,
    currency: 'USD',
    recipient: 'field-staff-001',
  });
  
  // 2. Post GL
  const glEntry = await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '140', debit: 1000, credit: null }, // Advance asset
        { glAccountId: '101', debit: null, credit: 1000 }, // Bank
      ],
    },
    context,
  });
  
  // 3. Verify bank balance
  const bankBalance = await glService.getAccountBalance('101', context);
  expect(bankBalance).toBe(-1000); // Credit (money out)
  
  // 4. Reconcile: bank statement = GL
  const bankStatement = await bankService.downloadStatement({
    accountId: '101-USD',
    date: new Date(),
  });
  
  expect(bankStatement.balance).toBe(-1000);
  expect(bankStatement.balance).toBe(bankBalance);
});
```

#### Test 2: GL Imbalance Detected

```typescript
test('GL imbalance is caught before posting', async () => {
  // Attempt to post unbalanced entry
  
  const result = await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '101', debit: 1000, credit: null },
        { glAccountId: '610', debit: null, credit: 500 }, // Imbalance!
      ],
    },
    context,
  });
  
  expect(result.status).toBe('error');
  expect(result.error).toContain('Debits must equal credits');
});
```

#### Test 3: Multi-Currency FX Variance

```typescript
test('FX variance calculated correctly on multi-currency transfer', async () => {
  // Transfer USD to KES account
  const transfer = {
    fromAccount: '101-USD',
    toAccount: '101-KES',
    amountUSD: 1000,
    rateUSDtoKES: 150, // 1 USD = 150 KES
  };
  
  const glResult = await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '101-KES', debit: 150000, credit: null }, // 150K KES
        { glAccountId: '101-USD', debit: null, credit: 1000 }, // 1K USD
        { glAccountId: '730', debit: null, credit: 0 }, // No FX variance (perfect rate)
      ],
    },
    context,
  });
  
  expect(glResult.status).toBe('ok');
  
  // If rate was 151 KES/USD (better rate), FX gain
  const transfer2 = {
    rateUSDtoKES: 151, // Better rate
  };
  
  const glResult2 = await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '101-KES', debit: 151000, credit: null }, // 151K KES
        { glAccountId: '101-USD', debit: null, credit: 1000 }, // 1K USD
        { glAccountId: '730', debit: 0, credit: null }, // FX gain (not captured in transfer)
      ],
    },
    context,
  });
});
```

#### Test 4: Advance Liquidation Matching

```typescript
test('Advance liquidation must match issued amount', async () => {
  // Issue advance
  const advance = await advanceService.issueAdvance({
    amount: 1000,
  });
  
  // Liquidate with receipts
  const liquidation = await advanceService.liquidateAdvance({
    advanceId: advance.id,
    receipts: [
      { amount: 600, category: 'Materials' },
      { amount: 300, category: 'Transport' },
    ], // Only 900 of 1000 spent
  });
  
  expect(liquidation.spent).toBe(900);
  expect(liquidation.refundDue).toBe(100);
  
  // Verify GL
  const glEntries = await glService.getEntriesByCorrelationId(advance.id, context);
  const debits = glEntries.filter(e => e.debit).reduce((sum, e) => sum + (e.debit || 0), 0);
  const credits = glEntries.filter(e => e.credit).reduce((sum, e) => sum + (e.credit || 0), 0);
  
  expect(debits).toBe(credits); // Must balance
});
```

---

## Domain 2: Donor Reporting Validation

### What Can Break

- Quarterly donor reports show incorrect GL totals
- Grant-specific GL account isolation
- Compliance rule application (e.g., "no more than 25% on indirect")
- Donor reporting deadline (reports submitted late)

### Test Coverage

#### Test 1: Donor Report GL Accuracy

```typescript
test('Donor quarterly report shows correct GL totals', async () => {
  // Scenario: USAID grant, post expenses, generate report
  
  // 1. Create grant (USAID $500K)
  const grant = await grantService.createGrant({
    organizationId: 'org-test',
    donorId: 'usaid',
    amount: 500000,
    currency: 'USD',
  });
  
  // 2. Allocate to activities
  await budgetService.allocate({
    grantId: grant.id,
    activities: [
      { name: 'Water', amount: 250000 },
      { name: 'Health', amount: 250000 },
    ],
  });
  
  // 3. Post GL expenses
  await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '401-USAID', debit: null, credit: 250000 }, // Revenue
        { glAccountId: '610-Water', debit: 100000, credit: null }, // Water materials
        { glAccountId: '620-Water', debit: 150000, credit: null }, // Water personnel
      ],
      sourceEventId: 'payment-001',
      sourceEventType: 'PaymentReleased',
      grantId: grant.id,
    },
    context,
  });
  
  // 4. Generate quarterly report for USAID
  const report = await reportService.generateDonorReport({
    grantId: grant.id,
    donorId: 'usaid',
    quarter: 'Q3-2026',
  });
  
  // Verify report shows correct totals
  expect(report.revenues).toBe(250000); // Expenses match
  expect(report.expenses).toBe(250000);
  expect(report.balance).toBe(0); // Expected (grant not fully used yet)
  
  // Verify only USAID GL accounts in report (not EU or other donors)
  expect(report.glAccounts).toContain('401-USAID');
  expect(report.glAccounts).not.toContain('402-EU'); // Different donor
});
```

#### Test 2: Compliance Rule: No More Than 25% Indirect

```typescript
test('USAID rule: indirect costs capped at 25%', async () => {
  const grant = await grantService.createGrant({
    organizationId: 'org-test',
    donorId: 'usaid',
    rules: [
      { code: 'INDIRECT_CAP', threshold: 0.25, message: 'Indirect costs cannot exceed 25%' },
    ],
  });
  
  // Attempt to allocate 30% to indirect (violates rule)
  const allocation = await budgetService.allocate({
    grantId: grant.id,
    activities: [
      { name: 'Program', amount: 700000 }, // Direct
      { name: 'Admin', amount: 300000 }, // Indirect (30%)
    ],
  });
  
  // Should fail or flag as violation
  expect(allocation.complianceWarnings).toContain('INDIRECT_CAP');
  
  // Post GL with violation
  const glResult = await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '610', debit: 700000, credit: null }, // Direct
        { glAccountId: '640', debit: 300000, credit: null }, // Indirect
      ],
      grantId: grant.id,
    },
    context,
  });
  
  // System should flag risk
  const risk = await riskService.getFinancialRisk(grant.id, context);
  expect(risk.violations).toContain('INDIRECT_CAP');
});
```

#### Test 3: Report Submission Deadline

```typescript
test('Donor report deadline is enforced', async () => {
  const grant = await grantService.createGrant({
    organizationId: 'org-test',
    donorId: 'eu', // EU requires quarterly reports
    reportingFrequency: 'quarterly',
    nextReportingDeadline: new Date('2026-07-31'), // Q2 end + 30 days
  });
  
  // Try to submit report after deadline (without extension)
  const submission = await reportService.submitDonorReport({
    grantId: grant.id,
    submittedDate: new Date('2026-08-15'), // 15 days late
    hasDeferralApproval: false,
  });
  
  expect(submission.status).toBe('late');
  expect(submission.daysLate).toBe(15);
  
  // Flag in compliance dashboard
  const compliance = await complianceService.getStatus(grant.id, context);
  expect(compliance.violations).toContain('REPORT_OVERDUE');
});
```

---

## Domain 3: GL Balancing & Trial Balance

### What Can Break

- GL trial balance (debits ≠ credits)
- Month-end close balance mismatch
- GL account reconciliation (GL vs. sub-ledgers)
- Accumulated depreciation calculations

### Test Coverage

#### Test 1: GL Trial Balance Must Balance

```typescript
test('GL trial balance always balances', async () => {
  // Post 100 random GL entries
  for (let i = 0; i < 100; i++) {
    await orchestrator.postGL({
      journalEntry: {
        lines: generateRandomBalancedEntry(), // Helper: ensures balanced
      },
      context,
    });
  }
  
  // Generate trial balance
  const trialBalance = await glService.generateTrialBalance({
    asOfDate: new Date(),
    context,
  });
  
  const totalDebits = trialBalance.reduce((sum, acc) => sum + (acc.debitBalance || 0), 0);
  const totalCredits = trialBalance.reduce((sum, acc) => sum + (acc.creditBalance || 0), 0);
  
  expect(totalDebits).toBe(totalCredits);
  expect(totalDebits).toBe(0); // Assets = Liabilities + Equity
});
```

#### Test 2: Month-End Balance Matches Previous Month

```typescript
test('Month-end balance = previous month-end balance + current month activity', async () => {
  // Scenario: Close Jan, then verify Feb opening balance
  
  const janClosing = await closeService.closeMonth({
    month: 'January',
    year: 2026,
  });
  
  const janBalance = janClosing.finalBalance; // e.g., USD $100K
  
  // Post Feb GL entries
  await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '101', debit: 50000, credit: null }, // Bank in
        { glAccountId: '610', debit: null, credit: 50000 }, // Expense out
      ],
    },
    context,
  });
  
  // Close Feb
  const febClosing = await closeService.closeMonth({
    month: 'February',
    year: 2026,
  });
  
  // Verify: Feb opening = Jan closing
  expect(febClosing.openingBalance).toBe(janBalance);
  
  // Verify: Feb closing = Jan closing + Feb activity
  expect(febClosing.finalBalance).toBe(janBalance + 0); // No net change
});
```

#### Test 3: Depreciation Accrual Correct

```typescript
test('Monthly depreciation accrual is calculated correctly', async () => {
  // Asset: Vehicle, cost $50K, useful life 5 years (60 months)
  // Monthly depreciation: 50K / 60 = $833.33
  
  const asset = await assetService.registerAsset({
    organizationId: 'org-test',
    cost: 50000,
    usefulLife: 60, // months
    glAccountId: '180', // Fixed assets
  });
  
  // Run month-end close (should accrue depreciation)
  const close = await closeService.closeMonth({
    month: 'January',
    year: 2026,
  });
  
  // Verify GL posting
  const depreciation = await glService.getEntriesByType('DEPRECIATION_ACCRUAL', context);
  const latestDepreciation = depreciation[depreciation.length - 1];
  
  expect(latestDepreciation.lines[0].debit).toBe(833.33); // Depreciation expense
  expect(latestDepreciation.lines[1].credit).toBe(833.33); // Accumulated depreciation
  
  // Verify asset net book value
  const assetBalance = asset.cost - (depreciation.length * 833.33);
  expect(assetBalance).toBe(50000 - (1 * 833.33)); // After 1 month
});
```

---

## Domain 4: Procurement & 3-Way Matching

### What Can Break

- Three-way matching (PO, GRN, Invoice) breaks
- GL posting for procurement transactions
- Invoice reconciliation logic
- Unmatched invoice detection

### Test Coverage

#### Test 1: Three-Way Matching Complete

```typescript
test('Three-way matching prevents payment until all three match', async () => {
  // 1. Issue PO
  const po = await procurementService.issuePO({
    vendorId: 'vendor-001',
    amount: 1000,
    description: 'Water filters',
  });
  
  expect(po.status).toBe('issued');
  
  // 2. Try to pay without GRN (should fail)
  const paymentAttempt1 = await paymentService.schedulePayment({
    poId: po.id,
    amount: 1000,
  });
  
  expect(paymentAttempt1.status).toBe('error');
  expect(paymentAttempt1.error).toContain('GRN required');
  
  // 3. Receive goods
  const grn = await logisticsService.recordGRN({
    poId: po.id,
    quantityReceived: 200,
    qualityCheck: 'pass',
  });
  
  // 4. Try to pay without invoice (should still fail)
  const paymentAttempt2 = await paymentService.schedulePayment({
    poId: po.id,
    amount: 1000,
  });
  
  expect(paymentAttempt2.status).toBe('error');
  expect(paymentAttempt2.error).toContain('Invoice required');
  
  // 5. Receive invoice
  const invoice = await financeService.recordInvoice({
    poId: po.id,
    vendorInvoiceId: 'INV-2026-001',
    amount: 1000,
  });
  
  // 6. Now payment should succeed
  const payment = await paymentService.schedulePayment({
    poId: po.id,
    amount: 1000,
  });
  
  expect(payment.status).toBe('ok');
  expect(payment.releaseDate).toBeDefined();
});
```

#### Test 2: GL Posted at Payment, Not Invoice

```typescript
test('GL posting happens at payment, not at invoice', async () => {
  // Issue PO → receive goods → invoice received
  // GL should NOT be posted yet
  
  const po = await procurementService.issuePO({
    vendorId: 'vendor-001',
    amount: 1000,
  });
  
  await logisticsService.recordGRN({ poId: po.id });
  
  const invoice = await financeService.recordInvoice({
    poId: po.id,
    amount: 1000,
  });
  
  // Check GL (should be empty)
  const glBefore = await glService.getEntriesByCorrelationId(invoice.id, context);
  expect(glBefore.length).toBe(0); // Invoice doesn't create GL entry
  
  // Now pay
  const payment = await paymentService.releasePayment({
    poId: po.id,
  });
  
  // Check GL (now should have entry)
  const glAfter = await glService.getEntriesByCorrelationId(payment.id, context);
  expect(glAfter.length).toBeGreaterThan(0);
  
  // Verify GL account
  const glEntry = glAfter[0];
  expect(glEntry.lines).toContainEqual(
    expect.objectContaining({
      glAccountId: '610', // Expense
      debit: 1000,
    })
  );
});
```

---

## Domain 5: HR Payroll & Salary Accrual

### What Can Break

- Monthly salary accrual (end of Jan accrues Feb salary)
- Payroll GL posting
- Employee advance lifecycle (advance → liquidation)
- Benefits accrual (if applicable)

### Test Coverage

#### Test 1: Salary Accrual at Month-End

```typescript
test('Salary expense accrued at month-end', async () => {
  // Employees: 5 staff × $2K/month
  const employees = await hrService.getActiveEmployees({ context });
  expect(employees.length).toBeGreaterThanOrEqual(5);
  
  // Close January
  const close = await closeService.closeMonth({
    month: 'January',
    year: 2026,
  });
  
  // Verify GL accrual for February salary
  const salaryAccrual = await glService.getEntriesByType('SALARY_ACCRUAL', context);
  const latestAccrual = salaryAccrual[salaryAccrual.length - 1];
  
  const totalSalary = employees.length * 2000; // 5 × $2K
  expect(latestAccrual.lines[0].debit).toBe(totalSalary); // Expense
  expect(latestAccrual.lines[1].credit).toBe(totalSalary); // Payable
});
```

#### Test 2: Employee Advance Cycle

```typescript
test('Employee advance issue → disbursement → liquidation', async () => {
  const employee = 'emp-001';
  
  // 1. Issue advance
  const advance = await hrService.issueEmployeeAdvance({
    employeeId: employee,
    amount: 500,
    currency: 'USD',
  });
  
  expect(advance.status).toBe('issued');
  
  // 2. Verify GL (advance liability created)
  const glAfterIssue = await glService.getAccountBalance('140', context);
  expect(glAfterIssue).toBeGreaterThan(0); // Payable
  
  // 3. Release cash
  const payment = await paymentService.releasePayment({
    advanceId: advance.id,
  });
  
  expect(payment.status).toBe('ok');
  
  // 4. Verify GL (advance same, but bank decreased)
  const glAfterPayment = await glService.getAccountBalance('101', context);
  expect(glAfterPayment).toBeLessThan(glAfterIssue);
  
  // 5. Liquidate
  const liquidation = await hrService.liquidateAdvance({
    advanceId: advance.id,
    spentAmount: 450,
    receipts: [{ amount: 450 }],
  });
  
  expect(liquidation.status).toBe('ok');
  expect(liquidation.refundDue).toBe(50);
  
  // 6. Verify GL (advance closed, expense posted, refund created)
  const glAfterLiquidation = await glService.getEntriesByCorrelationId(advance.id, context);
  const finalBalance = glAfterLiquidation.reduce((sum, entry) => {
    return sum + (entry.debit || 0) - (entry.credit || 0);
  }, 0);
  
  expect(finalBalance).toBe(0); // All GL entries balanced
});
```

---

## Domain 6: Dashboard & KPI Calculation

### What Can Break

- Dashboard KPIs (cash position, budget utilization) show wrong numbers
- Budget variance calculation incorrect
- Cash forecast projection wrong
- Risk score calculation wrong

### Test Coverage

#### Test 1: Dashboard Cash Position Matches GL

```typescript
test('Dashboard cash position equals bank GL balance', async () => {
  // Create multiple GL entries
  await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '101-USD', debit: 100000, credit: null },
        { glAccountId: '610', debit: null, credit: 100000 },
      ],
    },
    context,
  });
  
  // Get dashboard cash position
  const dashboard = await dashboardService.getDashboard({ context });
  
  // Get GL bank balance
  const glBankBalance = await glService.getAccountBalance('101-USD', context);
  
  // Must match
  expect(dashboard.cashPosition).toBe(glBankBalance);
});
```

#### Test 2: Budget Utilization Calculation

```typescript
test('Budget utilization = spent / allocated', async () => {
  // Budget: Activity Water, $100K allocated
  const budget = await budgetService.allocate({
    grantId: 'grant-001',
    activities: [
      { name: 'Water', amount: 100000 },
    ],
  });
  
  // Post GL: $60K spent
  await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '610', debit: 60000, credit: null },
        { glAccountId: '101', debit: null, credit: 60000 },
      ],
      grantId: 'grant-001',
    },
    context,
  });
  
  // Get dashboard
  const dashboard = await dashboardService.getDashboard({ context });
  const waterBudget = dashboard.budgets.find(b => b.name === 'Water');
  
  expect(waterBudget.utilization).toBe(0.60); // 60K / 100K
  expect(waterBudget.remaining).toBe(40000); // 100K - 60K
});
```

---

## Domain 7: Multi-Org & Multi-Currency Operations

### What Can Break

- Org A data visible to Org B (isolation breach)
- Multi-currency GL accounts mixed
- FX conversion done at wrong rate or time
- Consolidation includes wrong orgs

### Test Coverage

#### Test 1: Multi-Org Isolation

```typescript
test('Org A cannot see Org B GL entries', async () => {
  const orgA = { organizationId: 'org-a', operatingUnitId: 'ou-a' };
  const orgB = { organizationId: 'org-b', operatingUnitId: 'ou-b' };
  
  // Post GL in Org A
  await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '101', debit: 1000, credit: null },
        { glAccountId: '610', debit: null, credit: 1000 },
      ],
    },
    context: orgA,
  });
  
  // Query as Org B
  const glEntriesForB = await glService.getEntries({ context: orgB });
  
  expect(glEntriesForB.length).toBe(0); // Org B sees nothing
});
```

#### Test 2: Multi-Currency GL Accounts

```typescript
test('GL accounts segregated by currency', async () => {
  // Transfer USD to KES
  await orchestrator.postGL({
    journalEntry: {
      lines: [
        { glAccountId: '101-KES', debit: 150000, credit: null },
        { glAccountId: '101-USD', debit: null, credit: 1000 },
        { glAccountId: '730', debit: 0, credit: null }, // FX (exact rate, no variance)
      ],
    },
    context,
  });
  
  // Query by currency
  const usdBalance = await glService.getAccountBalance('101-USD', context);
  const kesBalance = await glService.getAccountBalance('101-KES', context);
  
  expect(usdBalance).toBe(-1000); // Credit (money out)
  expect(kesBalance).toBe(150000); // Debit (money in)
});
```

---

## Test Execution & Reporting

### Automated Test Suite

**File**: `/src/server/finance/__tests__/regression.test.ts`

```bash
npm test -- src/server/finance/__tests__/regression.test.ts

# Output:
# PASS src/server/finance/__tests__/regression.test.ts
#   Domain 1: Financial Reconciliation (4 tests)
#     ✓ Bank reconciliation matches GL balance (234ms)
#     ✓ GL imbalance detected (156ms)
#     ✓ Multi-currency FX variance (189ms)
#     ✓ Advance liquidation matching (267ms)
#   Domain 2: Donor Reporting (3 tests)
#     ✓ Donor quarterly report GL accuracy (521ms)
#     ✓ USAID compliance rule enforcement (378ms)
#     ✓ Report submission deadline (145ms)
#   ...
# 
# Total: 35 tests, 35 passed, 0 failed
# Coverage: 94% statements, 92% branches, 93% lines
```

### Continuous Integration

**Trigger**: Every PR to finance module

```yaml
# .github/workflows/regression-tests.yml
name: Finance Regression Tests

on: [pull_request]

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- regression.test.ts --coverage
      - run: npm run type-check
      - run: npm run lint
```

### Monthly Reporting

**Report to Architecture Board**:

| Domain | Tests | Pass | Fail | Coverage |
|--------|-------|------|------|----------|
| Financial Reconciliation | 4 | 4 | 0 | 96% |
| Donor Reporting | 3 | 3 | 0 | 92% |
| GL Balancing | 3 | 3 | 0 | 98% |
| Procurement | 2 | 2 | 0 | 89% |
| Payroll | 2 | 2 | 0 | 87% |
| Dashboard | 2 | 2 | 0 | 91% |
| Multi-Org | 2 | 2 | 0 | 94% |
| **TOTAL** | **35** | **35** | **0** | **94%** |

---

## Success Criteria

**Phase 2 complete when**:
- ✅ All 35 regression tests pass
- ✅ Coverage ≥90% on all domains
- ✅ No test failures in CI/CD
- ✅ Manual smoke test passes (finance team spot-check)
- ✅ No user-reported regressions in production (if deployed)

**Ongoing (all 12 phases)**:
- ✅ Every PR runs regression tests
- ✅ 100% pass rate maintained
- ✅ New functionality covered by new tests (no legacy code)

---

## Related Documents
- **Phase2AcceptanceCriteria.md**: Tests must pass before Phase 2 approval
- **ArchitectureComplianceChecklist.md**: Tests validate compliance
- **FinanceCodingStandards.md**: Tests enforce coding standards

---

**This regression plan protects 100% of existing functionality while modernizing the system.**
