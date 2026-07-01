# Executive Financial Intelligence Dashboard v3 – Final Review & Additional Requirements

First, thank you for the significant improvements made in Version 3.

This version is much closer to our vision and is generally approved as the baseline design for the IMS Finance Dashboard.

The dashboard now follows a professional enterprise layout and is much more suitable for executive financial monitoring.

However, before implementation, we would like to include several important functional improvements to ensure the dashboard fully supports humanitarian finance operations and the IMS Finance Modernization architecture.

---

# 1. Project Filter

Only projects with

Status = Active

should appear in the Project dropdown.

Projects with

* Planning
* Completed
* Cancelled
* On Hold

must not appear by default.

If historical reporting is required later, we can introduce an additional option such as:

"Include Closed Projects"

but the default should always display Active projects only.

---

# 2. Project as Master Filter (Single Source of Truth)

The Project selector should become the primary dashboard filter.

When the user selects a Project Code, the dashboard should automatically retrieve all related project information from the Projects table without requiring additional manual filtering.

The following fields should be populated automatically:

* Grant
* Donor
* Currency
* Total Budget
* Available Budget
* Project Manager
* Country
* Operating Unit
* Project Status
* Start Date
* End Date

Users should not need to select Donor or Grant again after selecting a Project.

The Projects table already contains this information and should remain the Source of Truth.

---

# 3. Currency Handling

Currency management must follow the Finance Modernization framework.

## Single Project

If one project is selected:

Display all dashboard values using that project's currency.

Example:

USD Project → Dashboard in USD

EUR Project → Dashboard in EUR

CHF Project → Dashboard in CHF

GBP Project → Dashboard in GBP

SAR Project → Dashboard in SAR

YER Project → Dashboard in YER

No currency conversion should occur in this scenario.

---

## Multiple Projects (Same Currency)

If all selected projects share the same currency, display the dashboard using that shared currency.

Example:

5 EUR Projects

Dashboard Currency = EUR

---

## Multiple Projects (Mixed Currencies)

If the selected projects contain multiple currencies, the dashboard should automatically convert all values into the Operating Unit's reporting currency.

The reporting currency must be determined using the Operating Unit Country.

Examples:

Yemen → USD

Italy → EUR

Ukraine → EUR

United Kingdom → GBP

Saudi Arabia → SAR

Switzerland → CHF

Future countries should inherit their reporting currency from the Country configuration.

All conversions must use the official Finance Currency Exchange tables implemented during the Finance Modernization project.

No hard-coded exchange rates.

---

# 4. Project Information Panel

Enhance the Project / Grant information displayed within the dashboard.

Include: 

* Project Code instead of "Project title"
* add Start and end date, and remaining days.

---

# 5. Remaining Days Indicator

Add a calculated KPI.

Remaining Days

Formula

End Date − Today

Example

180 Days Remaining

45 Days Remaining

15 Days Remaining

Expired

Use colors

Green

Yellow

Orange

Red

This is an important indicator for Finance Managers.

---

# 6. Project Timeline

Display a small timeline showing

Project Start

Current Date

Project End

This allows management to immediately understand where the project currently sits in its lifecycle.

---

# 7. Budget Utilization Intelligence

Instead of displaying only

Utilization %

also display

Under Budget

On Track

Overspending

Critical

using configurable thresholds.

---

# 8. Burn Rate Intelligence

Current Burn Rate is excellent.

Please extend it with

Current Burn Rate

Required Burn Rate

Forecast Burn Rate

Expected Completion Burn Rate

This provides much better financial forecasting.

---

# 9. Cash Position Waterfall

The redesigned Cash Position Waterfall is a major improvement.

Please further enhance it by including:

Opening Cash

Donor Receipts

Internal Transfers

Payroll

Vendor Payments

Advances

Operational Expenses

Closing Balance

Each section should support drill-down.

---

# 10. Financial Compliance Dashboard

Excellent addition.

Please also include:

Outstanding Advance Settlements

Late Bank Reconciliations

Pending Journal Approvals

Budget Overruns

Missing Supporting Documents

Unposted Transactions

Pending Financial Reports

Each item should support drill-through.

---

# 11. Procurement Financial Exposure

Expand the Procure-to-Pay panel.

Include:

Purchase Requests

Purchase Orders

Goods Received

Pending Invoices

Accounts Payable

Vendor Payments

Outstanding Commitments

Average Processing Time

This provides a complete financial liability overview.

---

# 12. Financial Health Matrix

Current matrix is very good.

Please also include:

Variance %

Forecast Remaining

Cash Requirement

Project Risk

Donor Risk

Completion Forecast

---

# 13. Dashboard Filters

Retain only Finance-related filters.

Project

Donor

Cost Center

Fiscal Year

Accounting Period

Currency (display only when multiple reporting currencies exist)

Date Range

Budget Version

Do not add Organization or Operating Unit filters because these already exist globally in the IMS Header.

---

# 14. Real-Time Synchronization

Whenever Budget Sync updates

General Ledger updates

Payments update

Procurement updates

Cash updates

the dashboard should automatically refresh.

No manual synchronization should be required.

---

# 15. Drill-down

Every KPI, chart, table, and card must support drill-down.

Executive Dashboard

↓

Project

↓

Budget Line

↓

Voucher

↓

Journal Entry

↓

Supporting Documents

---

# 16. Data Source Validation

Confirm once again that:

No mock data exists.

No placeholder values exist.

No demo datasets exist.

All charts and KPIs use the Finance Modernization Source of Truth.

---

# 17. Source Tables

The Projects table should remain the authoritative source for:

* Projects
* Donor
* Currency
* Total Budget
* Project Status
* Start Date
* End Date
* Country
* Operating Unit

The dashboard must not duplicate or override this information elsewhere.

---

# 18. Additional Deliverable

Along with the implementation, please provide:

* Updated file inventory
* Updated router inventory
* Updated service inventory
* Updated database tables used
* Updated component dependency map
* Updated data flow diagram
* List of all newly created files
* List of all modified files
* Confirmation that no mock data remains anywhere in the dashboard

This documentation will become part of the official IMS Finance Modernization technical documentation.
