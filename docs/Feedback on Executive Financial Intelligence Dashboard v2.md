Feedback on Executive Financial Intelligence Dashboard v2

Excellent improvement.

The overall layout is significantly better than the previous version and is much closer to what we expect from the IMS Finance Modernization project.

However, before implementation we need another design iteration to better align the dashboard with the IMS architecture, humanitarian financial management, and the Finance Modernization framework that has already been implemented.

1. Remove Organization and Operating Unit Filters

These filters already exist globally in the IMS Header.

The dashboard must inherit the active Organization and Operating Unit from the current application context.

Do NOT duplicate these filters inside the dashboard.

Remove:

Organization
Operating Unit

The dashboard should automatically load data according to the selected Organization and Operating Unit from the global IMS header.

2. Remove "All Organizations"

The Finance Dashboard is not intended to compare organizations.

Organization selection is handled by IMS itself.

The dashboard should never display

All Organizations

or allow users to switch organizations inside Finance.

3. Keep only Finance Filters

The filter bar should focus only on financial analysis.

Suggested filters

Project

Grant

Donor

Cost Center

Funding Source

Currency

Fiscal Year

Quarter

Accounting Period

Date Range

Budget Version

Budget Status

Transaction Status

Custom Search

4. Cash Position Waterfall

The current waterfall chart is technically correct but provides very little operational value.

Instead, redesign it as

Cash Position Analysis

Opening Balance

Cash Receipts
Donor Disbursements
Internal Transfers

− Payroll

− Vendor Payments

− Advances

− Operational Expenses

Closing Balance

This immediately explains

"Where did the money go?"

instead of only showing Opening → Income → Payroll → Closing.

5. Budget vs Actual

Current chart is too empty.

Instead show

Budget

Committed

Actual

Available Balance

Forecast

Variance

per month.

Also allow switching

Monthly

Quarterly

Yearly

6. Add Budget Utilization Trend

Instead of one KPI,

show a line chart

Budget Utilization %

over time.

This helps management understand spending trends.

7. Treasury Overview

Good concept.

Improve it by adding

Bank

Currency

Current Balance

Restricted Funds

Available Funds

Last Reconciliation

This makes Treasury useful for finance teams.

8. Expense Hierarchy

Treemap is excellent.

Allow switching between

Category

Project

Grant

Donor

Operating Unit

Vendor

This should be interactive.

9. Financial Health Table

Current table is good.

Consider adding

Budget Remaining

Commitment %

Forecast at Completion

Burn Rate

Budget Variance

Risk Level

Traffic Light

10. Procurement Liability

Excellent addition.

Expand it to include

Purchase Requests

Purchase Orders

Goods Received

Pending Invoices

Approved Invoices

Overdue Payments

Vendor Advances

Unsettled Advances

This becomes a complete Procure-to-Pay overview.

11. Replace Risk Heatmap

Current Risk Heatmap looks disconnected.

Instead create

Financial Compliance Dashboard

Audit Findings

Late Reconciliations

Missing Supporting Documents

Outstanding Advances

Budget Overruns

Pending Journal Approvals

Overdue Vendor Payments

Donor Compliance Issues

Each should use Red / Amber / Green status.

12. Add Executive KPI Cards

Current KPI cards are good.

Expand to include

Total Budget

Available Budget

Committed Budget

Actual Expenditure

Forecast Expenditure

Cash on Hand

Cash Burn Rate

Budget Utilization %

Accounts Payable

Accounts Receivable

Outstanding Advances

Payroll This Month

Asset Value

Depreciation

All cards should drill down.

13. Add Monthly Financial Trend

Include

Income

Expenditure

Cash Balance

Budget

Forecast

Variance

using a multi-line chart.

14. Add Donor Funding Analysis

A stacked bar chart showing

Budget by Donor

Spent by Donor

Remaining by Donor

Useful for EU, USAID, UN, UNICEF, AICS reporting.

15. Add Budget Consumption by Project

Horizontal stacked bars

Project

Budget

Committed

Spent

Remaining

This becomes one of the most important charts.

16. Add Cash Flow Forecast

Forecast

Next 30 days

60 days

90 days

Expected Receipts

Expected Payments

Expected Cash Balance

This is valuable for Finance Managers.

17. Financial Reporting Section

Replace any references to Project Reporting.

The dashboard should instead provide shortcuts to

Monthly Financial Report

Quarterly Financial Report

Semi-Annual Report

Annual Financial Report

Donor Financial Report

Trial Balance

General Ledger

Budget vs Actual Report

Cash Flow Statement

Balance Sheet

Income Statement

These should integrate with the Financial Reporting module developed during the Finance Modernization.

18. Add Interactive Drill-down

Every chart must support drill-down.

Example

Budget

↓

Project

↓

Grant

↓

Cost Center

↓

Transaction

No chart should be static.

19. Use Only Real Data

Do NOT generate mock data.

All charts, KPIs, and tables must use existing IMS Finance Modernization routers, services, and database schema.

Reuse existing APIs wherever possible.

Only create new routers if no suitable endpoint already exists.

20. Follow IMS Architecture

Do not duplicate business logic.

Use the existing

Finance Analytics Services

Budget Sync

Financial Overview

Chart of Accounts

Treasury

Expenditures

Payments

Cost Allocation

Assets

Vendor

Financial Reporting

and the new Finance Modernization source-of-truth architecture.

21. Existing Sidebar

Do NOT create a new left navigation.

The existing IMS Sidebar and Finance Sub-sidebar are already implemented and must remain unchanged.

The dashboard should render only inside the existing Finance Dashboard page.

22. Deliverables

Please provide

Complete React components
Dashboard layout
Chart components
All required tRPC routers
Service layer
SQL queries
Database integration
Reused existing routers
Newly created routers (if required)
File-by-file implementation
List of updated files
List of newly created files
Performance optimization notes
Mobile responsiveness
Dark mode compatibility
Loading states
Error handling
Permission-aware rendering
Drill-down navigation
Export support (Excel/PDF)
Caching strategy
Final Design Objective

The final dashboard should look and behave like an executive humanitarian finance cockpit—not a generic ERP screen. It should give a Country Director, Finance Manager, CFO, or Donor Compliance Officer a complete picture of budget performance, cash position, donor funding, expenditure, commitments, liabilities, compliance, and financial health at a glance, while remaining fully integrated with the IMS Finance Modernization architecture and using real operational data only.