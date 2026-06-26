# ERP Budget Integration Enhancement – Finance Budget as Source of Truth

## Objective

Redesign the ERP budgeting architecture so that:

1. Finance Budget module becomes the single source of truth for approved project budgets.
2. Project Financial tab becomes a monitoring and expenditure tracking workspace.
3. Users can no longer manually create budget items inside Project Financial.
4. Budget Items are automatically generated from approved Finance Budget Lines.
5. Actual expenditures automatically synchronize to Project Financial.
6. Existing UI layout and user experience remain unchanged as much as possible.
7. Existing data and codebase are preserved and migrated safely.

---

# Current Problem

The ERP currently contains two independent budget systems:

## Finance Module

Tables:

* budgets
* budget_lines
* budget_monthly_allocations
* budget_variance_analysis

Purpose:

* Donor budget preparation
* Budget approval workflow
* Version control
* Budget revisions
* Monthly allocations

---

## Project Module

Tables:

* budget_items
* expenses

Purpose:

* Project implementation monitoring
* Actual expenditure tracking
* Burn rate calculation

---

These two systems are not linked.

As a result:

* Budget totals differ
* Project Financial values differ from Finance Budget
* Dashboard values become inconsistent
* Users enter duplicate information

---

# New Architecture

Finance Budget becomes the master budget.

Project Financial becomes the implementation layer.

Workflow:

Finance Budget
→ Approved
→ Generate Project Budget
→ Create Budget Items
→ Track Spending
→ Sync Actual Expenses
→ Dashboard Updates

---

# Database Changes

## Update budget_items table

Add:

```sql
ALTER TABLE budget_items
ADD COLUMN budgetId INT NULL,
ADD COLUMN budgetLineId INT NULL,
ADD COLUMN generatedFromBudget TINYINT DEFAULT 1,
ADD COLUMN syncStatus ENUM(
'pending',
'synced',
'modified'
) DEFAULT 'pending',
ADD COLUMN lastSyncedAt DATETIME NULL;
```

Relationships:

```text
budgets
  └── budget_lines
          └── budget_items
```

New relation:

budget_items.budgetId
→ budgets.id

budget_items.budgetLineId
→ budget_lines.id

---

## Add indexes

```sql
CREATE INDEX idx_budget_items_budget
ON budget_items(budgetId);

CREATE INDEX idx_budget_items_budget_line
ON budget_items(budgetLineId);
```

---

# Finance Budget Module Changes

File:

FinanceBudgets.tsx

BudgetDetail.tsx

---

## New Button

Add button:

```text
Generate Project Budget
```

Location:

Budget Detail Page

Visible only when:

```text
Budget Status = Approved
```

---

## Button Logic

When clicked:

1. Load all budget_lines
2. Check existing budget_items
3. Create missing budget_items
4. Update changed records
5. Mark records as synced

---

## Generation Mapping

Finance Budget Line:

```text
lineCode
description
category
unitCost
quantity
duration
totalAmount
```

Maps to:

budget_items

```text
budgetId
budgetLineId
budgetCode
budgetItem
category
quantity
unitCost
totalBudgetLine
currency
```

---

# Project Financial Tab Changes

File:

FinancialOverviewTab.tsx

---

## Remove Manual Budget Creation

Disable:

```text
Create
Add Budget Item
Import Budget
Manual Budget Entry
```

Budget Items should no longer be manually created.

Instead show:

```text
Budget items are generated from the approved Finance Budget.
To modify budget structure, update the Finance Budget.
```

---

## Add New Action Buttons

Top toolbar:

```text
Generate Budget
Sync Expenses
Refresh Financials
```

---

# Generate Budget

Behavior:

If no budget items exist:

```text
Generate from latest approved Finance Budget
```

If already generated:

```text
Regenerate Budget
```

Prompt:

```text
This will synchronize Project Financial records with the approved Finance Budget.

Continue?
```

---

# Sync Expenses Button

Purpose:

Update actual spending.

When clicked:

1. Read all expenditure records.
2. Aggregate by budget line.
3. Update budget_items.actualSpent.
4. Update project financial summary.
5. Update dashboard KPIs.

---

# Expense Source of Truth

Actual spending must never come from:

```text
budget_items.actualSpent
```

direct user edits.

Instead:

```text
Finance Expenditure Records
```

or

```text
expenses table
```

depending on ERP implementation.

Formula:

```sql
actualSpent =
SUM(expenses.amount)
GROUP BY budgetLineId
```

---

# Project Financial Summary Calculations

Current layout remains unchanged.

Only calculation source changes.

---

## Total Budget

Replace:

```sql
SUM(budget_items.totalBudgetLine)
```

with:

```sql
SUM(budget_lines.totalAmount)
```

from latest approved budget.

---

## Actual Spent

```sql
SUM(expenses.amount)
```

---

## Remaining Balance

```sql
Total Budget - Actual Spent
```

---

## Burn Rate

```sql
Actual Spent / Total Budget * 100
```

---

# Budget Variance

For every Budget Item:

Calculate:

```sql
Variance =
ActualSpent - BudgetAllocated
```

```sql
VariancePercent =
((ActualSpent - BudgetAllocated)
 /
 BudgetAllocated) * 100
```

Display:

```text
On Track
Overspent
Underspent
```

---

# Dashboard Updates

Organization Dashboard

Project Dashboard

Grant Dashboard

Finance Dashboard

must all use the same source:

Budget:

```sql
SUM(budget_lines.totalAmount)
```

Spent:

```sql
SUM(expenses.amount)
```

Remaining:

```sql
Budget - Spent
```

Never use manually entered dashboard values.

---

# Budget Revision Handling

If Finance Budget Version changes:

Example:

```text
Version 1 Approved
```

later

```text
Version 2 Approved
```

System must:

1. Detect newer version.
2. Show warning.

```text
A newer approved budget exists.

Synchronize project budget?
```

3. Update linked budget_items.
4. Preserve historical expenditure.

---

# Synchronization Service

Create reusable service:

```typescript
BudgetSyncService
```

Functions:

```typescript
generateProjectBudget()

syncBudgetLines()

syncExpenses()

recalculateFinancialSummary()

recalculateDashboardMetrics()
```

All pages must use this service.

---

# API Endpoints

Add:

```typescript
POST
/budgets/:id/generate-project-budget
```

```typescript
POST
/projects/:id/sync-expenses
```

```typescript
POST
/projects/:id/recalculate-financials
```

---

# Migration Requirements

Existing projects must continue working.

Migration script:

For each budget_item:

1. Match budget code.
2. Match project.
3. Match budget line.
4. Populate:

```text
budgetId
budgetLineId
generatedFromBudget
```

No data loss allowed.

---

# Expected Outcome

After implementation:

Finance Budget
becomes

SOURCE OF TRUTH

Project Financial
becomes

MONITORING AND EXPENDITURE TRACKING

All dashboards show identical values.

Budget revisions automatically propagate.

Expenses synchronize automatically.

Users no longer maintain duplicate budgets.

Finance and Project teams work from one budget structure while preserving existing ERP screens and workflows.
