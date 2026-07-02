# Finance Data Flow Blueprint

**Purpose**: Visualize how data flows from transaction origin through GL, Intelligence, and Reports  
**Applies to**: All phases; guides implementation sequencing  

---

## Core Data Flows

### **Flow 1: Invoice → GL → Report**

```
Procurement Module
  │ Emits: InvoiceApprovedEvent
  │ {invoiceId, vendorId, amount, projectId, dueDate}
  │
  ↓
Finance Orchestrator
  │ Receives event
  │ Validates against Budget Platform (budget available?)
  │ Validates against Rule Engine (donor rule compliance?)
  │
  ├─→ Budget Platform
  │   Reduces available budget
  │   Emits: BudgetAvailabilityChangedEvent
  │   
  ├─→ GL Service
  │   Creates Journal Entry:
  │   DR Expense Account
  │   CR Accounts Payable
  │   Links to source event (InvoiceApprovedEvent)
  │   Emits: GLPostedEvent
  │
  ├─→ Treasury Platform
  │   Adds to payables forecast
  │   Updates cash forecast
  │
  ├─→ Risk Intelligence
  │   Recalculates budget overrun risk
  │   Emits: RiskScoreUpdatedEvent
  │
  ├─→ Event Store
  │   Persists: InvoiceApprovedEvent (immutable)
  │   Persists: GLPostedEvent (immutable)
  │   Persists: BudgetAvailabilityChangedEvent
  │
  ├─→ Digital Twin
  │   Updates: Project.spentAmount += amount
  │   Updates: Budget.spent += amount
  │   Updates: Budget.available -= amount
  │   Updates: Payables += amount
  │   Invalidates caches
  │   Publishes update to subscribers
  │
  └─→ Cache Invalidator
      Invalidates: Budget balance for project
      Invalidates: GL account balance for expense account
      Invalidates: Payables forecast
      
Query Path (Report Generation)
  │
  ↓ (5 seconds later, user generates report)
  
Report Service
  │ Queries: Digital Twin (real-time cache)
  │ Queries: Event Store (immutable audit trail)
  │
  ├─→ Fetch GL entries from cache
  ├─→ Fetch Budget from cache
  ├─→ Calculate variance (Budget vs GL)
  ├─→ Fetch Risk scores from cache
  │
  ↓
Report Output
  │ Financial Report with:
  │ - GL entries
  │ - Budget vs. actual
  │ - Risk indicators
  │ - Audit trail (links to source events)
```

**Timeline**:
- 0ms: InvoiceApprovedEvent emitted
- 10ms: Orchestrator processes event
- 50ms: GL posted, Budget updated, Risk recalculated
- 100ms: Digital Twin updated
- 500ms: Caches invalidated, subscribers notified
- 5000ms: Report generated (user sees updated numbers)

**Key properties**:
- ✅ Atomicity: All or nothing (GL + Budget + Risk)
- ✅ Consistency: Budget = Allocated - Spent - Committed
- ✅ Audit trail: Every change linked to source event
- ✅ Real-time: <1 second to digital twin
- ✅ Queryable: Reports use cached, consistent data

---

### **Flow 2: Payment → GL → Cash**

```
Procurement Module (or Finance directly)
  │ User marks invoice as "paid"
  │ Emits: PaymentReleasedEvent
  │ {paymentId, invoiceIds, amount, bankAccountId}
  │
  ↓
Finance Orchestrator
  │ Validates against Treasury (cash available?)
  │
  ├─→ GL Service
  │   Creates Journal Entry:
  │   DR Accounts Payable
  │   CR Bank Account
  │   Emits: GLPostedEvent
  │
  ├─→ Treasury Platform
  │   Reduces cash
  │   Updates payables (removes from forecast)
  │   Emits: CashPositionUpdatedEvent
  │
  ├─→ Risk Intelligence
  │   Recalculates liquidity ratio
  │   Recalculates days-of-cash
  │   May escalate if below threshold
  │   Emits: LiquidityRiskUpdatedEvent
  │
  ├─→ Digital Twin
  │   Updates: BankAccount.balance -= amount
  │   Updates: Payables -= amount
  │   Updates: Cash forecast (removes payment)
  │
  └─→ Event Store & Cache
      Persists events
      Invalidates caches
      
Query Path (Treasury Dashboard)
  │
  ↓ (Real-time subscription)
  
Treasury Dashboard
  │ Subscribers receive update immediately
  │
  ├─ Cash position: New balance
  ├─ Payables: Reduced by payment
  ├─ Days-of-cash: Recalculated
  ├─ Liquidity alerts: If triggered
  │
  ↓
Executive sees: "Payment released: Cash now $X, payables $Y"
```

**Critical property**: Payment creates GL entry ONLY after validation passes.

---

### **Flow 3: Budget Allocation → Hierarchical Updates**

```
Finance User
  │ Allocates $100k to Project A
  │ (splits: $40k Salaries, $35k Supplies, $25k Travel)
  │
  ↓
Budget Platform
  │ Validates total = parts
  │ Creates allocation entries
  │
  ├─→ Insert: Grant budget = $100k (level 1)
  ├─→ Insert: Project budget = $100k (level 2)
  ├─→ Insert: Salary budget = $40k (level 3)
  ├─→ Insert: Supplies budget = $35k (level 3)
  ├─→ Insert: Travel budget = $25k (level 3)
  │
  ├─→ Emits: BudgetAllocatedEvent (for each)
  │
  ├─→ Digital Twin
  │   Updates all budget levels
  │   Maintains: allocated = sum(children)
  │
  └─→ Cascading Intelligence
      Risk re-calculated at each level
      Health re-scored
      
Query Path (Budget Drill-Down)
  │
  ↓ (User expands budget tree)
  
Budget UI
  │ Grant: $100k
  │   ├─ Project A: $100k
  │   │   ├─ Salaries: $40k (% of Project)
  │   │   ├─ Supplies: $35k
  │   │   └─ Travel: $25k
  │   │
  │   ├─ Spent: $25k
  │   ├─ Committed: $30k
  │   └─ Available: $45k
```

**Key property**: Budget is hierarchical; updates cascade both ways (parent updates children; child rollup updates parent).

---

### **Flow 4: Risk Assessment → AI Recommendation → Action**

```
Multiple events (GL posts, payments, forecasts)
  │ Events trigger risk recalculation
  │
  ↓
Risk Intelligence Engine
  │ Calculates:
  │ ├─ Liquidity risk (cash forecast)
  │ ├─ Budget risk (overrun probability)
  │ ├─ Vendor risk (payment history)
  │ ├─ Donor risk (rule compliance)
  │ └─ Project risk (timeline + budget)
  │
  ├─→ Risk scores (0-100)
  ├─→ Risk levels (low, medium, high, critical)
  ├─→ Emits: RiskEvaluatedEvent
  │
  ↓
Decision Engine
  │ Multi-dimensional reasoning:
  │ IF cash_30day < threshold
  │    AND budget_overrun_prob > 50%
  │    AND vendor_payment_pending
  │ THEN risk = "critical"
  │      recommendation = "delay_vendor_payment"
  │      
  ├─→ Confidence: 75%
  ├─→ Impact: +$20k cash, -1% vendor relationship
  │
  ↓
AI Platform
  │ Synthesizes risks
  │ Generates executive briefing:
  │ "Budget tight (65% spent), cash forecast shows stress in 30 days.
  │  Recommend delaying Vendor X payment by 5 days."
  │
  ↓
Executive Briefing
  │ Published to dashboard
  │ Notification sent to CFO
  │
  ↓
CFO Actions
  │ Option 1: Approve recommendation (system delays payment)
  │ Option 2: Override (user decides)
  │ Option 3: Request alternatives
  │
  ↓
Action Execution
  │ IF approved:
  │   Orchestrator reschedules payment
  │   Emits: PaymentRescheduledEvent
  │   Treasury forecast updated
  │   Digital Twin updated
  │   Risk re-evaluated
```

**Key property**: Risk → Recommendation → Action is event-driven; user can override at any step.

---

### **Flow 5: Month-End Close**

```
Month-End Date Trigger
  │ System detects last day of month
  │
  ↓
Closing Process (Automated)
  │
  ├─→ AccrualEngine
  │   Generates accruals:
  │   ├─ Depreciation entries
  │   ├─ Unpaid invoices recognition
  │   ├─ Revenue accrual
  │   
  │   Creates Journal Entries:
  │   DR Expense
  │   CR Prepaid/Accrual
  │   Emits: GLPostedEvent
  │
  ├─→ ReversalEngine
  │   Generates reversals (for next month):
  │   DR Accrual
  │   CR Expense
  │
  ├─→ AllocationEngine
  │   Allocates shared costs
  │   (utilities, rent, admin overhead)
  │
  ├─→ TrialBalance
  │   Generates final trial balance
  │   Validates: DR = CR
  │
  ├─→ Financial Statements
  │   Generates:
  │   - Balance Sheet
  │   - Income Statement
  │   - Cash Flow Statement
  │
  ├─→ Event Store
  │   Marks period as "closed"
  │   Locks further GL entries for period
  │
  └─→ Digital Twin
      Creates snapshot for the month
      Enables historical comparison
      
Query Path (Audit / Reporting)
  │
  ↓
Auditor accesses:
  │
  ├─ Closed GL for period
  ├─ All accruals/reversals
  ├─ Trial balance
  ├─ Financial statements
  ├─ Audit trail (all GL entries linked to source events)
```

**Key property**: Period is locked; no more GL posts for that month.

---

## Data Consistency Model

### **Eventual Consistency Guarantee**

```
Time 0: InvoiceApprovedEvent
  Budget.available = 100 (before invoice)
  
Time 10ms: Orchestrator processes
  Budget.available = 90 (after invoice)
  GL posting in progress
  
Time 50ms: GL posted
  GL balance = 90
  Budget.available = 90 ✓ (consistent)
  
Time 100ms: Digital Twin updated
  Dashboard shows: Budget available = 90
  
Consistency guarantee: <100ms max
```

If GL posting fails:
```
Time 0: InvoiceApprovedEvent
Time 10ms: Budget reserved (available = 90)
Time 50ms: GL posting fails
Time 60ms: Compensation event
  Budget.available = 100 (rolled back)
  GL entry not created
Consistency restored: <100ms
```

---

## Data Volumes & Flow Rates

### **Typical Daily Flow**

```
Invoices approved: 50-100/day
Payments released: 30-50/day
GL entries created: 200-300/day
Events generated: 500-1000/day
Risk re-evaluations: 1000+/day (per invoice, payment, GL post)
Reports generated: 5-20/day

Peak load: 2-3pm (after invoice approval batch)
Storage:
  Events (30 days): ~15MB
  Digital Twin snapshots: ~5MB
  GL entries (30 days): ~2MB
  
Queries:
  Budget queries: 100/second (dashboard)
  GL balance queries: 50/second (reporting)
  Risk evaluation: 10/second (intelligence engine)
```

---

## Data Quality Validation

At each step, data is validated:

```
InvoiceApprovedEvent arrives
  │
  ├─ Zod validation (schema)
  ├─ Business validation (amount > 0, dueDate in future)
  ├─ GL account validation (expense account exists)
  ├─ Budget validation (project exists, budget allocated)
  ├─ Donor rule validation (passes all rules)
  └─ Multi-org validation (organizationId matches)
  
If ANY validation fails:
  Event → Dead Letter Queue
  Operations team notified
  Manual review required
```

---

## Conclusion

Finance data flows through the system in **event-driven waves**:

1. **Event arrives** (InvoiceApprovedEvent)
2. **Orchestrator coordinates** (validate, GL, Budget, Risk, Treasury)
3. **GL posts & Digital Twin updates** (<100ms)
4. **Caches invalidated** (real-time)
5. **Reports query cached data** (sub-second)
6. **Audit trail preserved** (every step linked to source)

**Key properties**:
- ✅ **Atomic**: All-or-nothing transactions
- ✅ **Consistent**: GL always balances, Budget = Allocated - Spent - Committed
- ✅ **Auditable**: Every change traced to source event
- ✅ **Real-time**: <1 second to executive dashboard
- ✅ **Queryable**: Fast reports via caching

This data flow supports **8 capability domains** defined in FinanceCapabilityMap.md.
