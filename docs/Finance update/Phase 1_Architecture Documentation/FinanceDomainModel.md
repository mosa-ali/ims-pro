# Finance Domain Model

**Purpose**: Define core financial entities and their relationships  
**Applies to**: All Phases 2–12  
**Language**: Ubiquitous Language (domain-specific terminology)  

---

## Core Entities

### **Donor**
Entity: An organization providing grants (USAID, EU, UNICEF, etc.)

```typescript
interface Donor {
  id: number;
  organizationId: number;
  code: string;  // e.g., "USAID", "EU", "UNICEF"
  name: string;
  rules: Rule[];  // Donor-specific compliance rules
  riskProfile: 'low' | 'medium' | 'high';
  complianceHistory: ComplianceRecord[];
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Relationships**:
- Donor ← 1:N → Grant
- Donor ← 1:N → Rule

---

### **Grant**
Entity: Funds allocated by a donor for a specific purpose

```typescript
interface Grant {
  id: number;
  donorId: number;
  organizationId: number;
  operatingUnitId: number;
  code: string;  // e.g., "USAID-2026-001"
  name: string;
  totalAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'closing' | 'closed';
  budget: Budget;  // Top-level budget
  projects: Project[];
  drawnAmount: number;  // Amount drawn down
  spentAmount: number;  // Amount actually spent
  availableAmount: number;  // Total - drawn - spent
  rules: Rule[];  // Inherited + grant-specific rules
  reportingRequirements: ReportingRequirement[];
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Relationships**:
- Grant ← 1:1 → Donor
- Grant ← 1:N → Project
- Grant ← 1:1 → Budget (top-level)
- Grant ← 1:N → ReportingRequirement

---

### **Project**
Entity: An initiative funded by a grant

```typescript
interface Project {
  id: number;
  grantId: number;
  organizationId: number;
  operatingUnitId: number;
  code: string;  // e.g., "PROJ-001"
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'closing' | 'closed';
  budget: Budget;  // Project-level budget
  activities: Activity[];
  vendors: Vendor[];
  
  // Financial tracking
  allocatedBudget: number;
  spentAmount: number;
  committedAmount: number;
  availableAmount: number;
  
  // Status tracking
  physicalProgress: number;  // 0-100
  healthScore: number;  // 0-100
  riskScore: number;  // 0-100
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Relationships**:
- Project ← 1:1 → Grant
- Project ← 1:N → Activity
- Project ← 1:N → Vendor
- Project ← 1:1 → Budget

---

### **Budget**
Entity: A hierarchical allocation of funds

```typescript
interface Budget {
  id: number;
  parentId: number | null;  // For hierarchical budgets
  organizationId: number;
  operatingUnitId: number;
  code: string;  // e.g., "PROJ-001-SALARIES"
  name: string;
  level: 'grant' | 'project' | 'activity' | 'cost_center';
  
  // Amounts
  allocated: number;
  spent: number;
  committed: number;
  available: number;  // Calculated: allocated - spent - committed
  
  // Tracking
  currency: string;
  period: { startDate: Date; endDate: Date };
  status: 'draft' | 'approved' | 'closed';
  
  // Hierarchy
  children: Budget[];  // Sub-budgets
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Calculation Rules**:
```
allocated = sum of allocations
spent = sum of paid invoices
committed = sum of approved POs waiting for invoice
available = allocated - spent - committed
```

**Relationships**:
- Budget ← 1:1 → Parent Budget (nullable)
- Budget ← 1:N → Child Budgets
- Budget ← 1:N → Expenditure (spent calculation)
- Budget ← 1:N → Commitment (committed calculation)

---

### **Activity**
Entity: A specific work task within a project

```typescript
interface Activity {
  id: number;
  projectId: number;
  organizationId: number;
  operatingUnitId: number;
  code: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  budget: Budget;  // Activity-level budget
  
  // Progress
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  physicalProgress: number;  // 0-100
  
  // Financial
  allocatedBudget: number;
  spentAmount: number;
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Relationships**:
- Activity ← 1:1 → Project
- Activity ← 1:1 → Budget

---

### **Vendor**
Entity: A supplier of goods or services

```typescript
interface Vendor {
  id: number;
  organizationId: number;
  code: string;  // Unique within org
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  
  // Compliance
  complianceStatus: 'qualified' | 'provisional' | 'rejected';
  complianceScore: number;  // 0-100
  qualificationDate: Date | null;
  
  // Performance
  totalPayments: number;
  paymentCount: number;
  averageDaysToPayment: number;
  onTimePaymentRate: number;  // Percentage
  latePaymentCount: number;
  
  // Risk
  riskScore: number;  // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

**Relationships**:
- Vendor ← 1:N → Invoice
- Vendor ← 1:N → Payment

---

### **Procurement Document Hierarchy**

```
PurchaseRequest
  ↓
PurchaseOrder (1:1 or 1:N)
  ↓
GoodsReceivedNote (1:N)
  ↓
Invoice (1:N)
  ↓
Payment (1:N)
  ↓
GL Entry (1:1)
```

#### **PurchaseRequest**
```typescript
interface PurchaseRequest {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  projectId: number;
  vendorId: number;
  requestNumber: string;
  requestDate: Date;
  amount: number;
  currency: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered';
  items: PurchaseRequestLineItem[];
  approvedBy: number | null;
  approvalDate: Date | null;
}
```

#### **PurchaseOrder**
```typescript
interface PurchaseOrder {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  purchaseRequestId: number;  // Reference to PR
  vendorId: number;
  poNumber: string;
  poDate: Date;
  deliveryDate: Date;
  amount: number;
  currency: string;
  status: 'draft' | 'approved' | 'in_delivery' | 'received' | 'closed';
  items: PurchaseOrderLineItem[];
}
```

#### **GoodsReceivedNote**
```typescript
interface GoodsReceivedNote {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  purchaseOrderId: number;
  grnNumber: string;
  receivedDate: Date;
  receivedBy: string;
  items: GRNLineItem[];
}
```

#### **Invoice**
```typescript
interface Invoice {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  purchaseOrderId: number;
  grnId: number;  // Link to 3-way match
  vendorId: number;
  projectId: number;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  currency: string;
  status: 'draft' | 'approved' | 'scheduled' | 'paid' | 'overdue';
  items: InvoiceLineItem[];
  matchStatus: 'unmatched' | 'matched' | 'partial_match';  // 3-way match
  approvedDate: Date | null;
  approvedBy: number | null;
  glEntryId: number | null;  // Link to GL entry
}
```

#### **Payment**
```typescript
interface Payment {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  invoiceIds: number[];
  vendorId: number;
  amount: number;
  currency: string;
  bankAccountId: number;
  paymentDate: Date;
  paymentMethod: 'bank_transfer' | 'check' | 'cash' | 'card';
  referenceNumber: string;
  status: 'scheduled' | 'released' | 'cleared' | 'failed';
  releasedDate: Date | null;
  releasedBy: number | null;
  glEntryId: number | null;  // Link to GL entry
}
```

---

### **GL (General Ledger)**

#### **GLAccount**
```typescript
interface GLAccount {
  id: number;
  organizationId: number;
  code: string;  // e.g., "1010" (Assets → Cash)
  name: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  subType: string;  // e.g., "cash", "bank", "receivable", "inventory"
  isActive: boolean;
  isBankAccount: boolean;
  isCashAccount: boolean;
  isControlAccount: boolean;
  
  // Balances (derived from journal lines)
  balance: number;
  debitBalance: number;
  creditBalance: number;
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### **JournalEntry**
```typescript
interface JournalEntry {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  journalNumber: string;  // Unique sequence
  entryDate: Date;
  postDate: Date;
  description: string;
  reference: string;  // e.g., "INV-2026-001"
  status: 'draft' | 'posted' | 'reversed';
  lines: JournalLine[];
  
  // Source tracking
  sourceEventId: string;  // UUID of originating event
  sourceEventType: string;  // e.g., "InvoiceApprovedEvent"
  sourceDocumentType: string;  // e.g., "invoice"
  sourceDocumentId: number;  // e.g., invoiceId
  
  // Audit
  postedBy: number;
  postedDate: DateTime;
  reversedBy: number | null;
  reversedDate: DateTime | null;
  reversalReference: string | null;  // Journal number of reversal
}
```

#### **JournalLine**
```typescript
interface JournalLine {
  id: number;
  journalEntryId: number;
  glAccountId: number;
  lineNumber: number;
  description: string;
  debit: number | null;
  credit: number | null;
  quantity: number | null;  // For inventory accounts
  
  // Audit
  createdBy: number;
  createdAt: DateTime;
}
```

**Double-Entry Rule**:
```
Sum of debits = Sum of credits (validated at posting)
```

---

### **Cash & Bank**

#### **BankAccount**
```typescript
interface BankAccount {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  bankName: string;
  accountNumber: string;
  currency: string;
  balance: number;
  glAccountId: number;  // Link to GL
  
  // Bank details
  swiftCode: string;
  iban: string;
  
  // Reconciliation
  lastReconciledDate: Date | null;
  lastReconciledBalance: number | null;
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### **Advance**
```typescript
interface Advance {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  employeeId: number;
  amount: number;
  currency: string;
  issueDate: Date;
  expectedReturnDate: Date;
  projectId: number;
  purpose: string;
  status: 'issued' | 'liquidating' | 'liquidated' | 'overdue';
  
  // Liquidation
  liquidationId: number | null;
  spentAmount: number | null;
  refundAmount: number | null;
  
  glEntryId: number | null;
}
```

---

### **Financial Intelligence**

#### **Risk**
```typescript
interface FinancialRisk {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  riskType: 'liquidity' | 'budget_overrun' | 'fx_exposure' | 'vendor' | 'donor' | 'project';
  riskScore: number;  // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Context
  entityType: string;  // "project", "vendor", "grant"
  entityId: number;
  
  // Factors
  factors: RiskFactor[];
  
  // Assessment
  assessedDate: Date;
  nextReviewDate: Date;
  
  // Action
  actionRequired: 'none' | 'monitoring' | 'manual_review' | 'escalation';
  recommendedAction: string;
}
```

#### **Forecast**
```typescript
interface Forecast {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  forecastType: 'cash' | 'budget_burn' | 'revenue';
  period: { startDate: Date; endDate: Date };
  
  // Projections
  projections: {
    date: Date;
    projectedAmount: number;
    confidence: number;  // 0-100
  }[];
  
  // Variance
  actualAmount: number | null;
  varianceAmount: number | null;
  variancePercent: number | null;
  
  createdDate: Date;
  updatedDate: Date;
}
```

#### **Health**
```typescript
interface Health {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  entityType: string;  // "project", "grant", "portfolio"
  entityId: number;
  
  healthScore: number;  // 0-100
  healthStatus: 'healthy' | 'at_risk' | 'critical';
  
  // Components
  components: {
    dimension: string;  // "budget", "timeline", "compliance", "risk"
    score: number;
    weight: number;
  }[];
  
  // Trends
  trend: 'improving' | 'stable' | 'declining';
  
  assessedDate: Date;
}
```

---

### **Compliance & Rules**

#### **Rule**
```typescript
interface Rule {
  id: number;
  organizationId: number;
  donorId: number | null;  // Donor-specific or null for org-wide
  code: string;  // e.g., "USAID_CompetitiveBidding"
  name: string;
  description: string;
  
  // Rule definition
  trigger: string;  // When rule applies (e.g., "expenditure.amount > 250000")
  conditions: Condition[];
  action: 'warning' | 'block' | 'escalate';
  
  status: 'active' | 'inactive' | 'deprecated';
  effectiveDate: Date;
  expiryDate: Date | null;
  
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### **Compliance Finding**
```typescript
interface ComplianceFinding {
  id: number;
  organizationId: number;
  operatingUnitId: number;
  findingType: string;
  severity: 'observation' | 'finding' | 'critical';
  description: string;
  
  // Context
  entityType: string;  // "invoice", "journal", "transaction"
  entityId: number;
  
  // Remediation
  status: 'open' | 'in_progress' | 'resolved';
  resolvedDate: Date | null;
  resolution: string;
  
  recordedDate: Date;
  recordedBy: number;
}
```

---

## Aggregate Roots & Boundaries

### **Financial Aggregate Root: Budget**
Encompasses: Budget, Allocations, Commitments, Expenditures (financial tracking)

### **Procurement Aggregate Root: Invoice**
Encompasses: PO, GRN, Invoice, Payments (procurement lifecycle)

### **GL Aggregate Root: JournalEntry**
Encompasses: Journal Entry, Journal Lines, GL Accounts (accounting records)

### **Risk Aggregate Root: FinancialRisk**
Encompasses: Risk, Factors, Actions (risk assessment)

---

## Value Objects

### **Amount**
```typescript
interface Amount {
  value: number;
  currency: string;  // USD, EUR, GBP, CHF
  
  // Methods
  add(other: Amount): Amount;
  subtract(other: Amount): Amount;
  multiply(factor: number): Amount;
  equals(other: Amount): boolean;
}
```

### **Period**
```typescript
interface Period {
  startDate: Date;
  endDate: Date;
  
  // Methods
  contains(date: Date): boolean;
  overlaps(other: Period): boolean;
  duration(): number;  // Days
}
```

### **Status**
```typescript
type BudgetStatus = 'draft' | 'approved' | 'closed';
type InvoiceStatus = 'draft' | 'approved' | 'scheduled' | 'paid' | 'overdue';
type PaymentStatus = 'scheduled' | 'released' | 'cleared' | 'failed';
```

---

## Key Invariants

1. **GL Balance**: Debits always equal credits (double-entry constraint)
2. **Budget Constraint**: Spent + Committed ≤ Allocated
3. **Cash Constraint**: Payments ≤ Cash available
4. **Donor Compliance**: All rules for donor must pass before GL post
5. **3-Way Match**: Invoice matched with PO & GRN before payment
6. **Audit Trail**: Every GL entry links to source event

---

## Entity Lifecycle

### **Budget Lifecycle**
```
Draft → Approved → Active → Closed → Archived
```

### **Invoice Lifecycle**
```
Draft → Approved → Scheduled → Paid → Closed
```

### **Payment Lifecycle**
```
Scheduled → Released → In Transit → Cleared → Reconciled
```

### **GL Entry Lifecycle**
```
Draft → Posted → (Immutable, can be reversed)
```

---

## Relationships Summary

```
Donor ← 1:N → Grant
            ↓
        Project ← 1:N → Activity
            ↓
        Budget
            ↓
        PurchaseRequest → PurchaseOrder → GoodsReceivedNote → Invoice → Payment
                                              ↓
                                           GL Entry
                                              ↓
                                           JournalLines
                                              ↓
                                           GL Accounts
```

---

## Conclusion

This domain model:
- ✅ Defines core financial entities
- ✅ Specifies relationships & constraints
- ✅ Establishes aggregate roots
- ✅ Enforces invariants
- ✅ Enables event sourcing
- ✅ Supports multi-org isolation

**Used by**: All Phase 2+ implementation
