Enterprise Finance Management System – Phase 2
UI Standardization, Reusable Components & Enterprise Quality Review
Current Project Status

The Finance Management System has completed its architecture foundation.

The following layers already exist, use real data, and have already been reviewed, tested, and approved:

Database schema
Repositories
Business Engines
tRPC Routers
Executive Finance Dashboard
Financial Risk Center
Financial Compliance Center
Financial Reporting Center

These modules are now the reference implementation for the Finance module.

Do not redesign them.

Do not replace their architecture.

Only extend them when absolutely necessary.

Important Clarification

All remaining Finance modules already use real data through existing:

tRPC routers
repositories
engines

These modules were previously tested and approved from a functional perspective.

The current work is NOT to rebuild business logic.

The current work is to ensure every Finance page:

follows the new Finance Design System
uses the reusable component library
follows enterprise UI standards
supports three languages
remains connected to the existing real-data architecture

Existing tRPC procedures, repositories, and engines must be preserved.

Primary Objective

Review every remaining Finance module and bring it to the same enterprise standard as:

Finance Dashboard
Financial Risk Center
Financial Compliance Center
Financial Reporting Center

The goal is to produce a complete enterprise Finance Management System with a consistent design, architecture, and user experience comparable to Microsoft Dynamics 365, SAP S/4HANA, Oracle Fusion, Oracle NetSuite, and Unit4 ERP.

Mandatory Rules
Rule 1 – Preserve Existing Real Data Integration

Do NOT replace existing:

tRPC procedures
repositories
engines
business calculations

Unless a genuine defect exists.

If a page already loads real data correctly:

keep the existing procedure
keep the repository
keep the engine

Only update the presentation layer.

Never replace working code simply to make it "look cleaner."

Rule 2 – No Mock Data

No page may contain:

mock data
fake arrays
placeholder objects
demo datasets
hardcoded charts
temporary calculations

Every widget must consume existing real data.

Rule 3 – Mandatory Reusable Component Library

Every updated Finance page must use the shared Finance Design System.

The following reusable components are mandatory:

FinancePageHeader
FinanceFilterBar
FinanceKpiCard
FinanceCard
WidgetHeader
ChartWrapper
ExecutiveTable
AIRecommendationCard
StatusChip
RiskBadge
ComplianceBadge
ComplianceIndicator
AlertCard
SparklineCard
LoadingSkeleton
tokens.ts

If a required component does not exist:

create it as a reusable shared component
place it in the Finance component library
never create page-specific duplicate components
UI Standardization

Every Finance page must have the same:

spacing
typography
colors
iconography
KPI cards
charts
tables
widgets
filters
buttons
dialogs
empty states
loading states
error handling

The user should immediately recognize any Finance page as belonging to one unified enterprise system.

Architecture Rules

Every page must follow:

Database

↓

Repository

↓

Business Engine

↓

Router

↓

tRPC

↓

React

No SQL inside React.

No calculations inside React.

No duplicated business logic.

Existing tRPC Procedures

If a page already consumes an existing procedure:

Keep it.

Do not rename it.

Do not replace it.

Do not introduce unnecessary procedures.

Only create a new router procedure if the required functionality genuinely does not exist.

Existing Engines

Reuse existing engines.

Do not duplicate calculations.

Do not calculate financial values in React.

Existing Repositories

Reuse existing repositories.

Only extend repositories if additional data retrieval is genuinely required.

Standard Filters

Where applicable, use the shared FinanceFilterBar.

Supported filters:

Fiscal Year (2025–2035)
Project (display Project Code)
Donor (auto-loaded after Project selection)
Operating Unit
Date Range
Currency (automatic)

Changing the Project filter must refresh the entire page.

Standard Tables

Every table should use ExecutiveTable.

Support:

server-side pagination
sorting
filtering
search
Excel export
PDF export
responsive layout
detail drawer
row actions

No nested scrolling.

No horizontal overflow.

Three-Language Support

Every remaining Finance module must support:

English
Arabic (RTL)
Italian

The project already has a mature internationalization system.

Do NOT build a new translation architecture.

Instead:

follow the existing language provider
follow the existing language settings
follow the existing translation hooks
follow the existing RTL implementation
Finance Translation File

Create a dedicated Finance translation file for the remaining Finance modules.

Suggested:

financeTranslations-i18n.ts

This file should contain all remaining Finance-specific translation keys.

The existing translation.ts (~65,000 lines) will be provided as the master reference.

Requirements:

reuse existing translation keys whenever possible
avoid duplicate keys
follow the existing naming convention
support English, Arabic, and Italian
reference the existing translation provider
ensure every Finance page uses translation keys only

No hardcoded UI text.

Domain-by-Domain Implementation

We will not update the whole Finance module simultaneously.

Instead, complete one Finance domain at a time.

Each domain must be:

Reviewed
Updated
Connected to reusable components
Verified with real data
Compiled
Tested
Approved

Only then move to the next domain.

Priority Order
Phase 2.1

Financial Configuration

Chart of Accounts
Fiscal Years
Accounting Periods
Exchange Rates
Currencies
Cost Centers
Financial Settings

Phase 2.2

General Ledger

Journal Entries
Journal Approval
General Ledger
Trial Balance
Opening Balances
Closing Process
Phase 2.3

Budget Management

Budget Planning
Budget Revisions
Budget Transfers
Budget Monitoring
Budget Allocation
Phase 2.4

Accounts Payable

Vendors
Bills
Payments
Aging
Phase 2.5

Accounts Receivable

Customers
Invoices
Receipts
Aging
Phase 2.6

Cash & Treasury

Treasury
Cash Management
Bank Accounts
Bank Transactions
Bank Reconciliation
Phase 2.7

Project & Grant Finance

Project Finance
Donor Finance
Cost Allocation
Commitments
Phase 2.8

Fixed Assets

Asset Register
Depreciation
Asset Disposal
Phase 2.9

AI & Automation

AI Recommendations
Smart Alerts
Forecasting
Financial Insights
Approval Criteria

A Finance module may only be considered complete when all of the following criteria are met.

Architecture
Uses existing repository
Uses existing engine
Uses existing router
Uses existing tRPC procedure
No duplicated business logic
Data
100% real data
No mock data
No placeholders
No hardcoded values
UI
Uses Finance reusable components
Matches Dashboard design language
Responsive
No nested scrolling
Consistent spacing
Consistent typography
Tables
ExecutiveTable
Search
Sorting
Pagination
Excel export
PDF export
Filters
Shared FinanceFilterBar
Fiscal Year
Project
Donor
Operating Unit (where applicable)
Translation
English
Arabic
Italian
Translation keys only
No hardcoded labels
Code Quality
Zero TypeScript errors
Zero ESLint errors
No unused imports
No dead code
Strong typing
No unnecessary any
Performance
No duplicate API calls
No unnecessary re-renders
Efficient queries
Existing indexes respected
Testing
Builds successfully
Existing functionality preserved
Real data verified
UI reviewed
Ready for user acceptance testing
Deliverables for Each Domain

For every Finance domain, provide:

Architecture review
Gap analysis
UI redesign summary
List of reusable components applied
Translation updates
Files modified
Router changes (if any)
Repository changes (if any)
Engine changes (if any)
Testing checklist
Approval checklist

Only after the module satisfies every approval criterion should work begin on the next Finance domain.

Final Objective

When this phase is complete, every Finance page—not just the dashboards—will share the same enterprise architecture, reusable design system, multilingual support, and real-data integration. The result will be a cohesive, production-ready Finance Management System where all modules consistently reuse approved routers, repositories, engines, and UI components while meeting global enterprise software standards.