# Phase 0: Tactical Action Plan

**Owner**: Finance Architecture Task Force  
**Priority**: Foundation work before any Phase 1+ implementation  
**Timeline**: 1 week (parallel workstreams)  

---

## Quick Reference: Top 10 Issues to Fix

| # | Issue | Root Cause | Fix | Effort | Impact |
|---|-------|-----------|-----|--------|--------|
| 1 | GL posting in 3 places | No design, code evolved organically | Consolidate to `GLPostingService.ts` | 2–3 days | Blocks Phase 2+ |
| 2 | Drizzle column name mismatches | Schema not validated against code | Schema audit + query fixes | 1–2 days | Crashes in prod |
| 3 | No GL account mapping service | Ad-hoc in journalPostingService | Create `GLAccountMappingService.ts` | 1 day | Multi-org isolation risk |
| 4 | Synchronizers lack atomicity | No distributed transaction | Wrap in saga/compensating transaction | 2 days | Data corruption risk |
| 5 | Budget utilization calc duplicated | Parallel implementations | Single source of truth in `BudgetEngine` | 1 day | Inconsistent reporting |
| 6 | No test suite | Never created | Establish test framework & CI | 2 days | Regression risk |
| 7 | TrialBalance + Reconciliation stubs | Not implemented | Complete engines | 2 days | Reporting gaps |
| 8 | Engine isolation (no orchestration) | Design missing | Design orchestrator | 1 day | Blocks Phase 2 |
| 9 | Data type inconsistency (nullable, enums) | No patterns | Establish Drizzle standards | 1 day | Type safety drift |
| 10 | Missing architecture docs | Never created | Create diagrams + dependency map | 1 day | Knowledge loss |

---

## 7-Day Action Plan

### **Day 1: Diagnostics & Planning**

**Task 1.1: Schema Audit** (Owner: Architecture Lead)
- Run this query to identify all finance tables:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'finance' AND table_type = 'BASE TABLE'
  ORDER BY table_name;
  ```
- Document column names for GL-related tables: `journalEntries`, `journalLines`, `glAccounts`, `budgetLines`, `chartOfAccounts`
- Compare against code usage in:
  - `FinanceEngine.ts` (line 172: debitAmount vs debit)
  - `GeneralLedgerEngine.ts` (line 139: debitAmount vs creditAmount)
  - `journalPostingService.ts` (line ~300)
- Output: `SCHEMA_AUDIT_REPORT.md`

**Task 1.2: GL Posting Code Inventory** (Owner: Developer 1)
- Find all GL posting implementations:
  ```bash
  grep -r "insert(journalEntries)" src/ --include="*.ts" | tee GL_POSTING_INVENTORY.txt
  grep -r "postGLEntry\|postPaymentToGL\|postExpenditureToGL" src/ --include="*.ts" | tee GL_ENTRY_CALLS.txt
  ```
- Map which engines/services call which posting functions
- Document arguments & return values
- Output: `GL_POSTING_INVENTORY.md`

**Task 1.3: Synchronizer Dependencies** (Owner: Developer 2)
- Map event flow:
  ```bash
  grep -r "eventBus.on\|eventBus.publish" src/ --include="*.ts" | tee SYNC_DEPS.txt
  ```
- Create flow diagram: Purchase Order Approved → [BudgetSync → CommitmentSync → ExpenditureSync → GL Sync]
- Identify missing error handling/rollback
- Output: `SYNCHRONIZER_DEPENDENCY_MAP.md`

**Task 1.4: Architecture Review Board (10 min)**
- Review Phase 0 assessment
- Approve Phase 1 scope & prioritization
- Assign owners to each fix
- Create JIRA/tracking issues

**Deliverables (Day 1):**
- `SCHEMA_AUDIT_REPORT.md`
- `GL_POSTING_INVENTORY.md`
- `SYNCHRONIZER_DEPENDENCY_MAP.md`
- Phase 1 scope document (approved)

---

### **Day 2–3: Critical Fixes (Parallel)**

**Fix 1: Drizzle Column Name Validation** (Owner: Developer 1)

1. Create validation script:
   ```typescript
   // scripts/validateDrizzleReferences.ts
   import * as schema from '../drizzle/schema';
   
   const checks = [
     { table: 'journalLines', expectedColumns: ['debit', 'debitAmount', 'credit', 'creditAmount'] },
     { table: 'journalEntries', expectedColumns: ['entryDate', 'createdAt', 'organizationId'] },
     // ...
   ];
   
   for (const check of checks) {
     const table = (schema as any)[check.table];
     for (const col of check.expectedColumns) {
       if (!table[col]) console.error(`Missing column: ${check.table}.${col}`);
     }
   }
   ```

2. Run against actual schema export
3. Create fix list with before/after:
   ```
   ❌ journalLines.debitAmount  →  ✅ journalLines.debit (if schema uses 'debit')
   ❌ journalLines.creditAmount  →  ✅ journalLines.credit
   ```
4. Apply fixes to:
   - `FinanceEngine.ts`
   - `GeneralLedgerEngine.ts`
   - `journalPostingService.ts`
   - All repositories (RiskRepository, KPIRepository, etc.)

**Deliverables:**
- `DRIZZLE_FIXES.md` (before/after list)
- Fixed files with commit message
- Validation script for CI

---

**Fix 2: GL Account Mapping Service** (Owner: Developer 2)

1. Extract GL account resolution from `journalPostingService.ts::resolveGLAccount()`
2. Create new service:
   ```typescript
   // server/services/GLAccountMappingService.ts
   export class GLAccountMappingService {
     constructor(private db: DB) {}
     
     async resolveAccount(
       organizationId: number,
       tag: 'bank' | 'cash' | 'payable' | 'expense' | 'advance' | 'revenue' | 'receivable',
       operatingUnitId?: number
     ): Promise<{ id: number; code: string; name: string } | null> {
       // 1. Check OU-specific mapping
       // 2. Fall back to org-wide mapping
       // 3. Fall back to system default
       // 4. Cache result
     }
     
     async setMapping(
       organizationId: number,
       tag: string,
       glAccountId: number,
       operatingUnitId?: number
     ): Promise<void> { ... }
   }
   ```
3. Add `glAccountMappings` table to schema (if not present):
   ```sql
   CREATE TABLE gl_account_mappings (
     id INT PRIMARY KEY AUTO_INCREMENT,
     organizationId INT NOT NULL,
     operatingUnitId INT,
     accountTag VARCHAR(50) NOT NULL,
     glAccountId INT NOT NULL,
     fallbackOrder INT DEFAULT 1,
     createdAt TIMESTAMP DEFAULT NOW(),
     UNIQUE KEY (organizationId, operatingUnitId, accountTag),
     FOREIGN KEY (glAccountId) REFERENCES chartOfAccounts(id)
   );
   ```
4. Update `journalPostingService.ts` to use new service
5. Update all synchronizers to inject & use service

**Deliverables:**
- `GLAccountMappingService.ts`
- Schema migration (if table missing)
- Updated `journalPostingService.ts` (refactored to use service)
- Unit tests (3–5 tests)

---

### **Day 4–5: Consolidation (Parallel)**

**Consolidate GL Posting Logic** (Owner: Developer 1)

1. Create canonical `GLPostingService.ts`:
   ```typescript
   // server/services/finance/GLPostingService.ts
   export class GLPostingService {
     constructor(
       private db: DB,
       private accountMappingService: GLAccountMappingService,
       private logger: FinanceSynchronizationLogger
     ) {}
     
     /**
      * Single source of truth for GL posting.
      * Replaces duplicate implementations in:
      * - FinanceEngine.postGLEntry()
      * - GeneralLedgerEngine.postGLEntry()
      * - journalPostingService.postPaymentToGL() et al.
      */
     async postEntry(
       request: GLPostingRequest,
       userId: number,
       tx?: Transaction
     ): Promise<{ journalEntryId: number; error?: string }> {
       return (tx || this.db).transaction(async (txn) => {
         // 1. Validate double-entry (sum debits = sum credits)
         // 2. Validate GL accounts exist & are open
         // 3. Create journal entry header
         // 4. Create journal lines
         // 5. Log posting event
         // 6. Update GL posting event for audit
         // 7. Return result
       });
     }
     
     async postPayment(...): Promise<{ journalEntryId: number }> {
       // Convenience method: DR Payable, CR Bank
     }
     
     async postExpenditure(...): Promise<{ journalEntryId: number }> {
       // Convenience method: DR Expense, CR Payable
     }
     
     async postAdvance(...): Promise<{ journalEntryId: number }> {
       // Convenience method: DR Advance, CR Bank
     }
   }
   ```

2. Update `FinanceEngine.ts`:
   ```typescript
   // OLD: owns postGLEntry
   // NEW: delegates to GLPostingService
   
   export class FinanceEngine {
     constructor(private glPostingService: GLPostingService, private db: DB) {}
     
     async postGLEntry(req: GLPostingRequest, userId: number): Promise<number> {
       const result = await this.glPostingService.postEntry(req, userId);
       if (result.error) throw new Error(result.error);
       return result.journalEntryId;
     }
   }
   ```

3. Update `GeneralLedgerEngine.ts`:
   ```typescript
   // Identical change: delegate to GLPostingService
   ```

4. Refactor `journalPostingService.ts`:
   ```typescript
   // Remove duplicate GL posting logic
   // Make it a wrapper around GLPostingService for backward compatibility
   export const postPaymentToGL = (payment, userId) => 
     glPostingService.postPayment(payment, userId);
   ```

5. Add tests:
   - Double-entry validation (correct & incorrect)
   - GL account resolution (with fallback)
   - Multi-org isolation
   - Transaction rollback on failure

**Deliverables:**
- `GLPostingService.ts` (canonical service)
- Updated `FinanceEngine.ts` (delegates to service)
- Updated `GeneralLedgerEngine.ts` (delegates to service)
- Refactored `journalPostingService.ts` (backward-compatible wrapper)
- Unit tests (10+ tests)
- Migration guide for existing code

---

**Complete Stub Engines** (Owner: Developer 2)

1. **`TrialBalanceEngine.ts`**: (Currently 4 lines)
   ```typescript
   export class TrialBalanceEngine {
     constructor(private db: DB) {}
     
     async generateTrialBalance(
       organizationId: number,
       periodStart: Date,
       periodEnd: Date
     ): Promise<TrialBalanceReport> {
       // Query GL accounts & journal lines
       // Group by account, sum debits & credits
       // Calculate balance (debit - credit)
       // Return sorted by account code
     }
   }
   ```

2. **`ReconciliationEngine.ts`**: (Currently 12 lines)
   ```typescript
   export class ReconciliationEngine {
     constructor(private db: DB) {}
     
     async reconcileBankAccount(
       bankAccountId: number,
       statementDate: Date,
       statementBalance: number
     ): Promise<BankReconciliationReport> {
       // Get bank account from GL
       // Get outstanding checks from bank transactions
       // Get deposits in transit
       // Calculate book balance vs statement balance
       // Identify uncleared items
       // Return reconciliation summary
     }
   }
   ```

3. Test each with real GL data

**Deliverables:**
- `TrialBalanceEngine.ts` (complete)
- `ReconciliationEngine.ts` (complete)
- Unit tests (5+ tests each)

---

### **Day 6: Testing & Docs**

**Task 6.1: Test Framework Setup** (Owner: Developer 1)

1. Create test structure:
   ```
   tests/
   ├── unit/
   │   ├── services/
   │   │   ├── GLPostingService.test.ts
   │   │   └── GLAccountMappingService.test.ts
   │   └── engines/
   │       ├── FinanceEngine.test.ts
   │       ├── GeneralLedgerEngine.test.ts
   │       └── BudgetEngine.test.ts
   ├── integration/
   │   ├── GL_Posting_E2E.test.ts
   │   └── Synchronizer_Coordination.test.ts
   └── fixtures/
       ├── mockOrganization.ts
       ├── mockGL.ts
       └── mockBudget.ts
   ```

2. Set up test utilities:
   ```typescript
   // tests/setup.ts
   import { beforeAll, afterAll, beforeEach } from 'vitest';
   
   let testDb: DB;
   let testOrg: Organization;
   
   beforeAll(async () => {
     testDb = await getDb();
     testOrg = await createTestOrganization(testDb);
   });
   
   afterEach(async () => {
     // Rollback test data
   });
   ```

3. Write foundational tests:
   - `GLPostingService.test.ts` (15 tests)
   - `GLAccountMappingService.test.ts` (10 tests)
   - `FinanceEngine.test.ts` (5 tests)
   - `BudgetEngine.test.ts` (5 tests)

4. Configure CI to run tests on every PR

**Deliverables:**
- Test framework (Vitest or Jest)
- Test utilities & fixtures
- 50+ unit tests
- CI pipeline update

---

**Task 6.2: Architecture Documentation** (Owner: Owner (Lead))

1. Create `docs/finance-architecture/`:
   ```
   ├── 00_Overview.md (this assessment)
   ├── 01_GLPosting_Design.md (GL posting service spec)
   ├── 02_AccountMapping_Design.md (account mapping policy)
   ├── 03_DependencyMap.md (engine relationships)
   ├── 04_DataFlow_Diagrams.md (Mermaid diagrams)
   ├── 05_SynchronizerCoordination.md (event flow)
   ├── 06_CodingStandards.md (patterns & conventions)
   └── 07_ChangeLog.md (what changed in Phase 0)
   ```

2. Create Mermaid diagrams for:
   - Engine dependency tree
   - GL posting flow (from PR to GL entry)
   - Budget → Commitment → Expenditure → Payment → GL flow
   - Synchronizer event coordination

3. Document before/after for key decisions:
   - Before: GL posting in 3 places
   - After: Single GLPostingService
   - Rationale: Maintainability, testability, consistency

**Deliverables:**
- 7 markdown documents
- 5+ Mermaid diagrams
- ADR (Architecture Decision Record) template for future decisions

---

### **Day 7: Integration & Validation**

**Task 7.1: Integration & Smoke Test** (Owner: Developer 1 + 2)

1. Update existing code to use new services:
   - `journalPostingService.ts` → uses `GLPostingService`
   - All synchronizers → inject `GLAccountMappingService`
   - Repositories → use consolidated balance calculation

2. Run smoke test:
   ```bash
   npm run test:unit       # Should pass 50+ tests
   npm run test:integration # Should pass 10+ integration tests
   npm run lint           # No new linting errors
   npm run type-check     # No new TypeScript errors
   ```

3. Deploy to staging:
   - Deploy Phase 0 fixes to staging environment
   - Run existing test suite (regression check)
   - Manual smoke test: Create a budget → Create a PR → Post GL entry
   - Verify GL posting service consolidation works
   - Verify account mapping service resolves correctly

4. Create validation checklist:
   ```
   ✅ GLPostingService posts entries correctly
   ✅ GLAccountMappingService resolves accounts (3 fallback levels)
   ✅ Drizzle queries return non-null results
   ✅ Multi-org isolation preserved (queries filter by org/OU)
   ✅ No regression in financial reporting
   ✅ Trial balance reconciles
   ✅ Budget utilization matches GL expenditures
   ```

**Deliverables:**
- Integration test suite (10+ tests)
- Staging deployment
- Validation checklist (all items green)

---

**Task 7.2: Phase 1 Readiness Review** (Owner: Architecture Lead + Lead Dev)

1. Review completion of Phase 0:
   - ✅ GL posting consolidated to single service
   - ✅ GL account mapping service created
   - ✅ Drizzle column names validated & fixed
   - ✅ Stub engines completed (TrialBalance, Reconciliation)
   - ✅ Test framework established
   - ✅ Architecture documented
   - ✅ Staging validation passed

2. Create Phase 1 specification:
   ```
   Phase 1: Architecture Foundation
   Duration: 2 weeks
   Scope:
     - Create FinanceOrchestratorEngine (coordinates cross-engine workflows)
     - Implement atomicity wrapper for Budget → Commitment → Expenditure → GL
     - Establish synchronizer error handling & rollback
     - Create shared query service (eliminate balance calc duplication)
   
   Deliverables:
     - FinanceOrchestratorEngine.ts
     - AtomicityWrapper.ts (saga pattern)
     - SharedQueryService.ts
     - Integration tests
     - Performance baseline
   ```

3. Approval gates:
   - Architecture Lead sign-off
   - Code review (2+ reviewers)
   - Staging validation passed
   - Stakeholder sign-off

**Deliverables:**
- Phase 0 completion report
- Phase 1 detailed specification
- Go/No-Go decision on proceeding to Phase 1

---

## Success Criteria (Phase 0 Complete)

| Criterion | Target | Status |
|-----------|--------|--------|
| GL posting consolidated | 1 service | ✅ |
| GL account mapping service created | 1 service | ✅ |
| Drizzle queries fixed | 100% of finance queries | ✅ |
| Stub engines completed | 2 (TrialBalance, Reconciliation) | ✅ |
| Test coverage | 50+ tests, >70% coverage | ✅ |
| Architecture documented | 7 docs, 5+ diagrams | ✅ |
| Staging validation | All criteria green | ✅ |
| Zero production regressions | 0 reported bugs | ✅ |

---

## Resource Requirements

| Role | Days | Tasks |
|------|------|-------|
| Architecture Lead | 3 | Planning, review, documentation, sign-off |
| Developer 1 | 7 | GL Posting Service, Drizzle fixes, Testing |
| Developer 2 | 7 | GL Account Mapping, Stub Engines, CI Setup |
| QA / Tester | 2 | Smoke test, integration test validation |
| **Total** | **19 person-days** | **= 1 person for 3–4 weeks** |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Drizzle fixes break queries | 🔴 High | Comprehensive before/after testing; staging validation |
| GL Posting Service consolidation causes regression | 🔴 High | 50+ unit tests; phased migration (old code → wrapper → service) |
| Synchronizers fail after refactoring | 🟡 Medium | Integration tests for each synchronizer; staging validation |
| Schema missing GL account mappings table | 🟡 Medium | Migrate before deployment; fallback to in-memory cache if needed |
| Test framework not ready in time | 🟡 Medium | Use existing Jest setup; don't block Phase 0 completion |

---

## Go/No-Go Gates

- **Gate 1 (End of Day 1):** Diagnostics complete; Phase 1 scope approved
- **Gate 2 (End of Day 3):** Critical fixes (Drizzle + GL Account Mapping) deployed to staging
- **Gate 3 (End of Day 5):** GL Posting Service consolidated; stub engines completed
- **Gate 4 (End of Day 6):** Test suite 50+ tests passing; docs complete
- **Gate 5 (End of Day 7):** Staging validation passed; Phase 1 specification approved

**Final Decision:** Approve Phase 0 completion → Proceed to Phase 1 (Orchestration)

---

## Phase 1 Preview (Next Steps)

Once Phase 0 is complete:
1. **Design FinanceOrchestratorEngine** — Orchestrate Budget → Commitment → Expenditure → GL flows
2. **Implement Saga Pattern** — Ensure atomicity across engines; add compensating transactions for failure recovery
3. **Create Shared Query Service** — Consolidate budget utilization, balance calculations
4. **Expand Test Coverage** — 100+ tests, >85% coverage
5. **Performance Optimization** — Caching, batch posting, materialized views

---

## Questions for Stakeholders

1. **Timeline**: Can Phase 0 complete in 1 week with 2 developers?
2. **Approvals**: Who is the final arbiter on architecture decisions (GL Posting Service consolidation, GL Account Mapping policy)?
3. **Backward Compatibility**: How long do we support old GL posting methods before deprecation?
4. **Testing**: Should Phase 0 include load testing (burst GL postings)?
5. **Drizzle**: If schema column names differ from code assumptions, do we update schema or code?

---

## Success Path Forward

✅ **Phase 0 (1 week):** Foundation work, consolidation, testing framework  
✅ **Phase 1 (2 weeks):** Orchestration layer, atomicity, error handling  
✅ **Phase 2 (1 week):** Query consolidation, cache strategy  
✅ **Phase 3+ (ongoing):** Event sourcing, advanced analytics, AI maturity  

**Total to production-ready finance platform:** 10–12 weeks
