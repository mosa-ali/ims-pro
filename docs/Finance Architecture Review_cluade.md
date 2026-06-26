Finance Architecture Review — Phase 1: Complete Assessment
Executive Summary
This is a 85%-complete, functionally rich NGO ERP finance system. The procurement-to-payment chain is genuinely well-architected — probably the strongest part. However, there are several critical source-of-truth fragmentation issues, missing service layers, and architectural inconsistencies that need resolution before this system can be considered audit-grade for ECHO/AICS/UN donors.

1. Finance Data Flow Diagram
Goods/Works Procurement Chain (IMPLEMENTED ✅)
Purchase Request (purchase_requests)
    ↓ PR submitted
pr_budget_reservations [status: active]
    ↓ Vendor selected / PO created
finance_encumbrances [status: active]
    ↓ GRN confirmed
procurement_payables [status: pending_invoice]
    ↓ Invoice submitted (3-way match)
procurement_invoices [matchingStatus: matched/variance_detected]
    ↓ Invoice approved
procurement_payables [status: pending_payment]
    ↓ Payment recorded
payments [status: completed]
    ↓ Payment completion
finance_encumbrances [status: liquidated]
budget_lines [actualAmount += paidAmount, committedAmount -= paidAmount]
    ↓ Async (try/catch, non-blocking)
journal_entries + journal_lines [sourceModule: procurement]
Services Procurement Chain (IMPLEMENTED ✅)
Purchase Request → Contract → Service Acceptance Certificate (SAC)
    ↓ SAC approved
procurement_payables [sacId, contractId - services flow]
    ↓ Invoice submitted (Contract/SAC matching)
procurement_invoices
    ↓ Payment
payments
Direct Expenditure Chain (FRAGMENTED ⚠️)
expenditures table ← used by expendituresRouter.ts
finance_expenditures table ← used by finance.ts (db/finance.ts helpers)
expenses table ← used by costAllocationService.ts (direct_costs basis)
Three parallel tables, no single source of truth.
Budget Hierarchy (PARTIALLY IMPLEMENTED ⚠️)
budgets (header) [totalApprovedAmount, totalActualAmount — STORED AGGREGATES]
    → budget_lines [totalAmount, actualAmount, committedAmount, remainingAmount]
        → budget_items [synced via BudgetSyncService]
        → budget_monthly_allocations
        → pr_budget_reservations [FK: budgetLineId]
        → finance_encumbrances [FK: budgetLineId]

2. Source of Truth Matrix
Financial ConceptSource TableSource ColumnOwner ModuleCritical IssuesBudget Totalbudgets.totalApprovedAmounttotalApprovedAmountFinance/Budgets🔴 Stored aggregate — not computed from linesBudget Actual Spentbudgets.totalActualAmounttotalActualAmountBudgetSyncService🔴 Only updated by explicit sync call, not on expenditure approvalBudget Line Totalbudget_lines.totalAmounttotalAmountFinance/Budgets✅ Computed: unitCost × qty × monthsBudget Line Actualbudget_lines.actualAmountactualAmountprFinanceAutomation🟡 Updated only via procurement chain, not expendituresBudget Line Committedbudget_lines.committedAmountcommittedAmountprFinanceAutomation🟡 Updated by reservation create/releaseBudget Line Remainingbudget_lines.remainingAmountremainingAmountprFinanceAutomation🔴 Derived field stored — can driftReservation Amountpr_budget_reservations.reservedAmountreservedAmountprFinanceAutomation✅ Created atomicallyEncumbrance Amountfinance_encumbrances.encumberedAmountencumberedAmountprFinanceAutomation✅ Converted from reservationEncumbrance Remainingfinance_encumbrances.remainingAmountremainingAmountpaymentsRouter🟡 Updated on payment completionActual Expenditure❓ Three tablesMultipleFragmented🔴 CRITICAL: No single sourcePaymentpaymentstotalAmountpaymentsRouter✅ Single tablePayableprocurement_payablestotalAmountprFinanceRouter✅ Single tableInvoiceprocurement_invoicesinvoiceAmountprFinanceRouter✅ Single tableGL Entryjournal_entries + journal_linesdebitAmount/creditAmountjournalEntriesRouter🟡 Not auto-posted on all eventsGrant Budgetgrants + budgets via budgets.grantIdMultiplegrantsRouter🟡 Grant totals pulled from projects.totalBudgetDonor Traceabilitydonors → grants → budgets → budget_linesFK chainMultiple🟡 Chain exists but no aggregate queryCash/Bankfinance_cash_transactions + bank_transactionsMultipletreasuryRouter🟡 Two tables, unclear which is authoritativeFund Balancefinance_fund_balancesbalancetreasuryRouter🔴 Stored — unclear update trigger

3. Duplication Analysis
🔴 Critical: Triple Expenditure Table
expenditures          ← expendituresRouter.ts
finance_expenditures  ← db/finance.ts helpers
expenses              ← costAllocationService.ts (direct costs basis)
Root Cause: expendituresRouter.ts queries expenditures with raw SQL and isLatestVersion versioning. db/finance.ts queries financeExpenditures (a different Drizzle schema table). costAllocationService.ts queries expenditures again for direct-cost allocation basis.
Impact: It is currently impossible to answer "what did we actually spend on project X?" without knowing which table to query. Donor reports will be inconsistent.
Recommendation: Designate finance_expenditures as the canonical actual-spend table (it has proper Drizzle schema coverage and workflow helpers). Migrate expenditures into it or create a view. Deprecate expenses as a standalone actuals table.

🔴 Critical: Dual Chart of Accounts
chart_of_accounts  ← imported in db/finance.ts
gl_accounts        ← used in journalEntriesRouter.ts, journalLines FK
gl_account_categories ← used in FinanceChartOfAccounts.tsx
Root Cause: db/finance.ts imports chartOfAccounts from schema. journalEntriesRouter.ts joins against glAccounts. These appear to be two separate implementations — one legacy (chart_of_accounts), one current (gl_accounts + gl_account_categories).
Impact: Journal entries reference glAccounts. Financial reports querying chart_of_accounts will not reconcile. Any trial balance will be incomplete.
Recommendation: Confirm which is active. Based on the router code, gl_accounts + gl_account_categories is the live system (it has the Drizzle join in journal lines). chart_of_accounts should be deprecated or confirmed as a legacy alias.

🟡 Medium: Stored Aggregates That Can Drift
Four fields across budget tables are stored aggregates with no guaranteed consistency:
budgets.totalActualAmount     — updated only by BudgetSyncService.syncExpenses()
budgets.totalApprovedAmount   — updated only by budgets.create (set to "0.00" on creation)
budget_lines.remainingAmount  — updated by reservation +/- operations
budget_lines.committedAmount  — updated by reservation +/- operations
budgets.totalApprovedAmount is set to "0.00" on creation and never updated when budget lines are added. This means the budget header total is always wrong until an explicit sync is triggered.

🟡 Medium: Number Generation Race Condition
All number generators (payment, payable, encumbrance, reservation, invoice) use a COUNT(*) + 1 pattern:
typescript// From prFinanceAutomation.ts
const [result] = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(prBudgetReservations)
  .where(...)
const count = (result?.count || 0) + 1;
return `RES-${year}-${count.toString().padStart(4, '0')}`;
Under concurrent requests this will produce duplicate numbers. This is a classic non-atomic sequence problem.
Fix: Use MySQL AUTO_INCREMENT sequence tables or GET_LOCK + INSERT pattern, or a dedicated procurement_number_sequences table (which already exists in your schema).

🟡 Medium: Journal Entry Posting is Non-Blocking
In both paymentsRouter.ts (payment completion) and expendituresRouter.ts (expenditure approval):
typescripttry {
  const journalEntryId = await generatePaymentJournalEntry(existing[0], ctx.user?.id);
  await db.update(payments).set({ journalEntryId }).where(...);
} catch (error) {
  console.error('Failed to generate journal entry for payment:', error);
  // Don't fail the payment
}
Impact: A payment can be marked completed with no GL entry. Your GL will never balance. Donor auditors will find unexplained payment transactions with no corresponding journal entry.
Fix: Journal entry creation must be inside the same db.transaction() as the payment completion. If journal entry fails, the entire payment completion must roll back.

🟡 Medium: Payment Completion Links Payable by Vendor Only
typescript// paymentsRouter.ts - complete mutation
const [payable] = await db.select().from(procurementPayables)
  .where(and(
    eq(procurementPayables.vendorId, existing[0].vendorId || 0),
    eq(procurementPayables.status, "approved")
  ))
  .limit(1);
This finds a payable by vendorId only, not by paymentId. If a vendor has multiple approved payables, the wrong one gets closed. This is a data integrity bug.

4. Financial Control Assessment
Control AreaStatusFindingBudget Availability Check✅ ImplementedvalidateBudgetAvailability() before reservationReservation → Encumbrance✅ ImplementedAtomic conversion in createEncumbranceFromReservation()3-Way Matching (Goods)✅ ImplementedPR / PO / GRN amounts compared with 5% tolerance3-Way Matching (Services)✅ ImplementedContract / SAC / Invoice amountsInvoice Approval Threshold✅ ImplementedvalidateInvoiceApprovalThreshold()Sequential Approval✅ ImplementedStatus machine enforced in routerBudget Period Control⚠️ Partialfinance_periods table exists but period locking not enforced on expenditure creationSoft Delete✅ ImplementedConsistently appliedAudit Trail⚠️ PartialpayableApprovalHistory exists; general audit_logs table exists; not all events capturedJournal Balancing✅ ImplementedDebit = Credit enforced in journalEntriesRouter.createGL Posting on Events🔴 BrokenNon-blocking try/catch means GL can be missing entriesExpenditure Approval⚠️ SplitTwo routers for two tables — unclear which is the enforced pathDuplicate Payment Prevention🔴 MissingNo check for duplicate invoice numbers per vendorCurrency Conversion⚠️ PartialExchange rate stored but conversion to base currency not always verified

5. Accounting Design Review
What Works Well

Double-entry validation in journalEntriesRouter.create (debit = credit check) ✅
Source module tagging on journal entries (procurement, expense, advance, etc.) ✅
Fiscal year and fiscal period linkage on journal entries ✅
Proper soft-delete throughout ✅
Budget workflow state machine (draft → submitted → approved → revised → closed) ✅

IPSAS/IFRS Gaps
IPSAS 1 (Presentation): No consolidated financial statements query. Each operating unit appears independent with no roll-up.
IPSAS 2 (Cash Flow): No cash flow statement generation. finance_cash_transactions and bank_transactions exist but no classification (operating/investing/financing).
IPSAS 17 (Property, Plant & Equipment): finance_assets + asset_depreciation_schedule exist, but db/finance.ts does not import them — no periodic depreciation posting automation.
IPSAS 23 (Revenue from Non-Exchange Transactions): Grant revenue recognition logic is missing. Grants are tracked but no deferred income or revenue recognition entries are generated.
Donor Compliance:

DG ECHO requires expenditure to be traceable to budget line → grant → donor. Chain exists in FK structure but no single query surfaces it.
AICS/EU require supporting document linkage per expenditure. attachments field exists as JSON string in expenditures but not as a proper evidence table join.
UN agencies require period-locked reporting. finance_periods locking exists but is not enforced as a gate on expenditure posting.


6. Multi-Currency Assessment
Current State
typescript// In budgets, encumbrances, reservations:
currency: string         // transaction currency
exchangeRate: string     // rate at time of transaction
baseCurrencyAmount: string // pre-computed base currency equivalent
Issues Found
🔴 Exchange Rate Snapshot vs Live Rate: When a reservation is created, exchangeRate is passed from the frontend. When the encumbrance is created from the reservation, it copies the reservation's exchange rate. When payment is made weeks later at a different rate, no FX gain/loss entry is recorded.
🔴 Base Currency Inconsistency: budgets.currency can be any currency (e.g., EUR for an EU project). budget_lines.totalAmount is in budget currency. payments.totalAmount may be in a different currency. The BudgetSyncService.syncExpenses() aggregates expenses.amount directly to budget_lines.actualAmount — with no currency conversion check.
🟡 No Reporting Currency Consolidation: There is no mechanism to produce organization-level financials in a single reporting currency. Each budget can have its own currency.
🟡 finance_currencies Table Has exchangeRateToUsd: This is a static rate per currency, not a historical rate. The finance_exchange_rates table (which exists in the DB) appears to be the historical rates table, but the code uses the static rate from finance_currencies in places.

7. Donor Financial Reporting Traceability
Existing FK Chain (Positive)
donors.id
  → grants.donorId
    → budgets.grantId
      → budget_lines.budgetId
        → pr_budget_reservations.budgetLineId
        → finance_encumbrances.budgetLineId
        → procurement_payables.encumbranceId (via encumbrance)
          → procurement_invoices.payableId
            → payments.id (via invoice.paymentId)
              → journal_entries.sourceDocumentId
The FK chain exists on paper. However:
🔴 Missing: expenditures/finance_expenditures have grantId and budgetLineId fields, but they are not linked through the PR→PO→GRN chain. Direct expenditures (non-procurement) exist completely outside the encumbrance system.
🔴 Missing: The donor_budget_mapping table exists in the DB but is not referenced in any router reviewed. Donor-specific budget categorization (EU vs ECHO budget formats) is in the DonorExportDialog component but backed only by a donorBudgetExport router not provided — meaning donor format compliance is only at the reporting layer, not enforced at entry.
🟡 Partial: grants table pulls totalBudget and spent from projects table (in grantsRouter.ts), meaning grant financial figures derive from project-level aggregates, not from the budget line / expenditure system. This creates a parallel summary calculation that will diverge.

Phase 2: Target Architecture Recommendations
Priority 1 — Critical Fixes (Do Now)
Fix 1: Payment → Payable Link is Broken
Current (bug):
typescript// paymentsRouter.ts complete mutation
const [payable] = await db.select().from(procurementPayables)
  .where(and(
    eq(procurementPayables.vendorId, existing[0].vendorId || 0),
    eq(procurementPayables.status, "approved")
  ))
  .limit(1);
Fix — add payableId to payment creation, then link on completion:
typescript// In payments table: add payableId column
// In complete mutation:
const [payable] = await db.select().from(procurementPayables)
  .where(and(
    eq(procurementPayables.id, existing[0].payableId),  // Direct FK, not vendor match
    eq(procurementPayables.organizationId, organizationId)
  ))
  .limit(1);
Fix 2: Journal Entry Must Be Transactional
Current (non-blocking — dangerous):
typescripttry {
  const journalEntryId = await generatePaymentJournalEntry(...);
} catch (error) {
  console.error('Failed to generate journal entry');
  // Payment still completes
}
Fix:
typescriptawait db.transaction(async (tx) => {
  // 1. Update payment status
  await tx.update(payments).set({ status: 'completed', paidAt: ... }).where(...);
  
  // 2. Liquidate encumbrance
  await tx.update(financeEncumbrances).set({ status: 'liquidated', ... }).where(...);
  
  // 3. Update budget line actuals
  await tx.update(budgetLines).set({
    actualAmount: sql`actualAmount + ${paidAmount}`,
    committedAmount: sql`committedAmount - ${paidAmount}`,
  }).where(...);
  
  // 4. Create journal entry — inside transaction
  const entryId = await createJournalEntryInTx(tx, paymentData);
  await tx.update(payments).set({ journalEntryId: entryId }).where(...);
  
  // If any step fails, everything rolls back
});
Fix 3: Budget Header Total Must Be Computed, Not Stored
Current: budgets.totalApprovedAmount is set to "0.00" on creation and never updated when lines are added.
Fix — add a trigger or recompute on line create/update/delete:
typescript// In budgetLines.create mutation, after line insert:
await db.update(budgets)
  .set({
    totalApprovedAmount: db
      .select({ total: sql<string>`SUM(totalAmount)` })
      .from(budgetLines)
      .where(and(eq(budgetLines.budgetId, budgetId), isNull(budgetLines.deletedAt)))
      .as('subquery'), // or use a direct subquery
  })
  .where(eq(budgets.id, budgetId));
Or better — compute it on read via the getById query and never store it.

Priority 2 — Source of Truth Consolidation
Expenditure Table Decision
You must pick one and migrate. Based on the code:
TableRouterFeaturesRecommendationexpendituresexpendituresRouter.tsVersioning, isLatestVersion, full workflowKeep as canonicalfinance_expendituresdb/finance.tsCleaner Drizzle usage, workflow helpersMerge into expenditures or aliasexpensescostAllocationService.tsUsed only for cost allocation basisAlias to expenditures
Action: Update db/finance.ts helpers to reference expenditures table. Update costAllocationService.ts direct-costs query to use expenditures. Remove finance_expenditures after migration.
Chart of Accounts Decision
TableUsageRecommendationgl_accounts + gl_account_categoriesjournalEntriesRouter.ts, frontend FinanceChartOfAccounts.tsxKeep — this is the live systemchart_of_accountsdb/finance.ts onlyDeprecate — update db/finance.ts to use glAccounts

Priority 3 — Missing Services to Build
These three services were confirmed missing and need to be created:
server/services/journalPostingService.ts
A centralized service that creates balanced journal entries from financial events. Must be called inside transactions.
typescript// Skeleton of what needs to exist:
export async function postExpenditureToGL(tx: TX, expenditure: Expenditure, userId: number): Promise<number>
export async function postPaymentToGL(tx: TX, payment: Payment, userId: number): Promise<number>  
export async function postAdvanceToGL(tx: TX, advance: Advance, userId: number): Promise<number>
export async function postSettlementToGL(tx: TX, settlement: Settlement, userId: number): Promise<number>
export async function reverseJournalEntry(tx: TX, journalEntryId: number, userId: number): Promise<number>
server/services/encumbranceService.ts
The encumbrance logic currently lives inline in prFinanceAutomation.ts. Extract to a proper service for reuse:
typescriptexport async function createEncumbrance(tx: TX, params: EncumbranceParams): Promise<number>
export async function liquidateEncumbrance(tx: TX, encumbranceId: number, amount: number): Promise<void>
export async function releaseEncumbrance(tx: TX, encumbranceId: number): Promise<void>
export async function getEncumbranceBalance(encumbranceId: number): Promise<EncumbranceBalance>
server/services/budgetControlService.ts
A gate that any expenditure or payment must pass through before being committed:
typescriptexport async function checkBudgetAvailability(
  budgetLineId: number, 
  amount: number, 
  currency: string
): Promise<BudgetCheck>

export async function reserveBudget(tx: TX, params: ReservationParams): Promise<number>

export async function consumeBudget(tx: TX, budgetLineId: number, amount: number): Promise<void>

Priority 4 — Number Sequence Fix
Replace all COUNT(*) + 1 patterns with the existing procurement_number_sequences table:
typescript// Safe number generation using sequence table
export async function getNextSequenceNumber(
  tx: TX, 
  organizationId: number, 
  sequenceType: 'RES' | 'ENC' | 'PAY' | 'INV'
): Promise<string> {
  // Use SELECT ... FOR UPDATE to lock the row
  await tx.execute(sql`SELECT id FROM procurement_number_sequences 
    WHERE organizationId = ${organizationId} AND type = ${sequenceType}
    FOR UPDATE`);
  
  const result = await tx
    .update(procurementNumberSequences)
    .set({ currentValue: sql`currentValue + 1` })
    .where(and(
      eq(procurementNumberSequences.organizationId, organizationId),
      eq(procurementNumberSequences.type, sequenceType)
    ));
    
  // Return formatted number
  const year = new Date().getFullYear();
  return `${sequenceType}-${year}-${currentValue.toString().padStart(4, '0')}`;
}

Phase 2: Gap Analysis Summary
AreaCurrent StateTarget StateGapExpenditure Source of Truth3 tables1 table (expenditures)Merge + migrateChart of Accounts2 tables1 (gl_accounts)Deprecate legacyBudget Header TotalStored, staleComputed on readRemove stored aggregateJournal PostingNon-blocking, can be missingTransactional, mandatoryWrap in db.transactionPayment→Payable LinkBy vendor ID onlyBy payableId FKAdd payableId to paymentsNumber SequencesCOUNT(*)+1 race conditionSequence table with row lockUse existing sequence tableFX Gain/LossNot recordedJournal entry on settlementBuild FX posting servicePeriod LockingTable exists, not enforcedBlock posting to locked periodsAdd gate in expenditure/journal createDonor Reporting ChainFK exists but no queryAggregate query per donorBuild reporting serviceGL Auto-PostingPartial (procurement only)All financial eventsBuild journalPostingServiceDepreciation PostingNot automatedPeriodic depreciation journalBuild asset depreciation serviceGrant Revenue RecognitionMissingDeferred income modelNew service required

Immediate Action Plan (Sequenced)
Week 1 — Data Integrity Fixes (no new features, only bug fixes):

Fix payment→payable link (vendor match → payableId FK)
Move journal entry creation inside db.transaction()
Add budget header total recomputation on line create/update/delete

Week 2 — Source of Truth Consolidation:

4. Decide canonical expenditure table, update all routers to use it

5. Confirm gl_accounts as live CoA, update db/finance.ts

6. Replace COUNT(*)+1 sequences with sequence table
Week 3 — Missing Services:

7. Build journalPostingService.ts with all event types

8. Extract encumbranceService.ts from prFinanceAutomation

9. Build budgetControlService.ts as universal budget gate
Week 4 — Enforcement:

10. Add period-locking gate to expenditure and journal creation

11. Add duplicate invoice detection per vendor

12. Wire all financial events to journalPostingService

Do you want me to start implementing any of the specific fixes above? I'd recommend starting with Fix 2 (transactional journal posting) and Fix 1 (payment→payable link) as they are the most critical data integrity issues.