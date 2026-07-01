# IMS Finance Modernization

## UI/UX Design Request – Executive Financial Intelligence Center

You are a Senior Enterprise UX Architect, Principal Product Designer, and React/TypeScript UI Engineer specializing in Microsoft Dynamics 365 Finance, SAP S/4HANA Fiori, Oracle Fusion Financials, Power BI Executive Dashboards, and enterprise ERP systems.

## Objective

Design the complete **Executive Financial Intelligence Center** for the IMS platform.

This is **NOT** a prototype.

This is the production UI that will be integrated with an existing enterprise ERP.

The backend architecture is already under development.

Your responsibility is to design premium enterprise interfaces and generate production-ready React/TypeScript code.

---

# Existing Backend

The backend architecture already exists.

The following layers are available or are currently being implemented:

* Finance Dashboard Router
* Finance Health Router
* Finance Risk Router
* Finance Compliance Router
* Finance KPI Engine
* Financial Health Engine
* Financial Risk Engine
* Financial Compliance Engine
* Currency Conversion Engine
* Treasury Engine
* Forecast Engine
* AI Recommendation Engine
* Workflow Engine
* Synchronization Engine
* Finance Services
* Drizzle ORM schema
* MySQL database

Do NOT redesign these backend components.

Instead, consume them.

---

# General Rules

## Zero Mock Data

No mock data.

No placeholder arrays.

No fake KPIs.

No demo charts.

No hardcoded values.

Every UI component must be designed to consume production data from routers, services, and engines.

If backend data is temporarily unavailable, use loading skeletons instead of fake data.

---

# Existing IMS Layout

The following already exists:

* Global Header
* Organization selector
* Operating Unit selector
* Finance Sidebar
* Authentication
* Authorization
* Translation system
* Theme
* Routing

Do NOT create:

* new application shell
* new sidebar
* new top navigation
* duplicate page headers

Your pages must fit naturally inside the existing IMS Finance module.

---

# Deliverables

Design the following pages.

---

# PAGE 1

## Executive Financial Intelligence Dashboard

This dashboard already exists.

Your task is to redesign it into an executive workspace comparable to:

* Microsoft Dynamics 365 Finance
* SAP Analytics Cloud
* Oracle Fusion Financials
* Power BI Executive Dashboard

The dashboard should include:

### Executive KPI Strip

* Total Portfolio Budget
* Total Actual Expenditure
* Commitments
* Available Balance
* Cash Position
* Burn Rate
* Financial Health
* Compliance Score

Each KPI should include:

* trend
* comparison
* variance
* mini chart
* tooltip
* last updated

---

### Executive Charts

Use enterprise-quality Recharts.

Examples:

* ComposedChart
* BarChart
* LineChart
* AreaChart
* PieChart
* Treemap
* RadialBarChart
* Waterfall
* Heatmap
* Stacked Bar

No simplified charts.

---

### Executive Tables

Financial Health Matrix

Maximum 5 rows

View More

Sticky header

Conditional formatting

Progress bars

Risk badges

Hover actions

Drill-down

---

### Sidebar

Include:

* Predictive Risk Alerts
* AI Recommendations (maximum 5)
* Compliance Summary
* Treasury Snapshot
* Upcoming Grant Closures
* Financial Calendar

---

# PAGE 2

## Financial Risk Center

Create a completely new enterprise page.

This page is the drill-down destination from the dashboard Risk Distribution widget.

Navigation:

Executive Dashboard

↓

Risk Distribution

↓

View Details

↓

Financial Risk Center

---

Purpose

Provide complete visibility into financial risks affecting projects, grants, treasury, procurement, payroll, and compliance.

---

Suggested Layout

Executive Summary

Risk KPI Strip

Risk Trend

Risk Heatmap

Risk Distribution

Risk by Project

Risk by Donor

Risk by Grant

Risk by Operating Unit

Risk Timeline

Risk Forecast

AI Recommendations

Risk Register

Risk Details Table

---

Risk Categories

Include at minimum:

* Budget Overrun
* Budget Line Overspending
* Cash Flow Risk
* Liquidity Risk
* Grant Expiry Risk
* Procurement Delay
* Outstanding Advances
* Late Advance Settlement
* Salary Payment Delay
* Bank Reconciliation Delay
* Exchange Rate Exposure
* Donor Compliance Risk
* Audit Readiness Risk
* Missing Supporting Documents
* Duplicate Payments
* Suspicious Transactions
* Vendor Concentration
* Commitment Risk
* Forecast Deficit
* Treasury Risk

You may recommend additional enterprise finance risks.

---

Each Risk should display

Risk Score

Severity

Probability

Financial Impact

Affected Projects

Affected Grants

Affected Donors

Affected Operating Units

AI Recommendation

Mitigation Plan

Responsible Unit

Due Date

Current Status

---

Charts

Use

PieChart

Treemap

Heatmap

Stacked Bar

LineChart

Trend Analysis

Risk Timeline

Risk Distribution

No mock data.

---

# PAGE 3

## Financial Compliance Center

This is another completely new page.

Purpose

Provide an executive Audit Readiness and Financial Compliance workspace.

Navigation

Dashboard

↓

Compliance Scorecard

↓

View Details

↓

Financial Compliance Center

---

Executive KPIs

Compliance Score

Audit Readiness

Missing Documents

Budget Overruns

Late Bank Reconciliation

Outstanding Advances

Donor Compliance

Payroll Compliance

Financial Reporting Compliance

---

Compliance Indicators

Support automatic evaluation of:

* Audit Compliance
* Missing Supporting Documents
* Outstanding Advances
* Budget Overruns
* Budget Line Overspending
* Late Bank Reconciliations
* Ledger vs Bank Differences
* Advance Settlement Delays
* Salary Payment Delays
* Donor Compliance
* Late Financial Reports
* Missing Approvals
* Duplicate Payments
* Journal Posting Issues
* Missing Budget Allocation
* Cost Center Violations
* Segregation of Duties
* Exchange Rate Issues
* Treasury Controls

You may recommend additional enterprise compliance indicators.

---

Each Compliance Indicator should display

Score

Severity

Status

Trend

Last Assessment

AI Recommendation

Corrective Action

Owner

Target Date

Supporting Evidence

---

Charts

Use

Radial Charts

Progress Charts

Compliance Trends

Heatmaps

Treemaps

Bar Charts

Area Charts

Executive Tables

---

# Design Standards

The UI should resemble premium enterprise systems.

Focus on:

* Dense but readable layouts
* Consistent spacing
* Strong typography hierarchy
* Executive color palette
* Accessible contrast
* Professional iconography
* Minimal visual clutter
* Responsive layouts
* Rich hover states
* Loading skeletons
* Smooth micro-interactions

---

# Code Generation

Generate production-ready React + TypeScript code.

Use the existing IMS architecture.

Provide:

* All new React components
* Updated pages
* Shared components
* Hooks
* Chart components
* Interfaces
* Types
* Routing updates

Do not generate backend logic.

Instead, clearly indicate the router, engine, or service expected to supply each widget's data.

For every component, include a data dependency table showing:

* Expected router
* Expected service
* Expected engine
* Expected response model

---

# Final Deliverables

Before completion, provide:

1. High-fidelity UI design for all three pages.
2. Complete React/TypeScript implementation.
3. Folder structure.
4. File names.
5. Component hierarchy.
6. Navigation flow.
7. State management approach.
8. Data dependency mapping (router → service → engine → component).
9. Accessibility considerations.
10. Responsive behavior.
11. Confirmation that **no mock data or placeholder values** are included anywhere in the generated implementation.
