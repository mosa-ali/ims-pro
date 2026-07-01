Finance Dashboard Redesign

Context
We are developing a modern cloud-based Humanitarian Enterprise Resource Planning (ERP) system called IMS (Integrated Management System).

The system is built using:

React + TypeScript
TailwindCSS + Shadcn UI
tRPC
Drizzle ORM
MySQL
Recharts
TanStack Table

The Finance module has recently completed a major modernization focused on:

Source of Truth architecture
Budget Synchronization Engine
Workflow-driven finance
General Ledger integration
Humanitarian donor compliance
Multi-project and multi-grant accounting
Real-time dashboard synchronization

This dashboard must use real production data from the existing database. Do NOT use mock data or placeholder JSON.

Objective

Redesign the Finance Dashboard to become an Executive Financial Intelligence Dashboard similar to Microsoft Power BI, SAP Analytics Cloud, Oracle ERP, or Dynamics 365 Finance.

The dashboard should provide immediate visibility into the organization's financial position while supporting humanitarian and donor-funded operations.

This is not simply a UI redesign.

It must be a fully functional dashboard connected to the existing Finance Modernization architecture.

Existing System

The Finance module already contains:

Budget Management
Budget Synchronization
General Ledger
Chart of Accounts
Payments
Treasury
Assets
Vendor Management
Cost Allocation
Financial Reports
Advances & Settlements

It also integrates with

Projects
Grants
Procurement
Inventory
HR
Donor CRM
Workflow Engine

Reuse these existing modules and schema.

Do NOT redesign the database unless absolutely necessary.

Dashboard Style

Use the attached dashboard examples only as design inspiration.

Desired style:

Microsoft Power BI
SAP Analytics Cloud
Oracle ERP Analytics
Dynamics 365 Finance
Modern humanitarian ERP
Clean executive dashboard
Professional
White background
Green / Blue financial palette
Responsive
High information density
Minimal empty space

Avoid oversized cards.

Avoid excessive whitespace.

Dashboard Layout
Section 1 — Global Filters

Sticky filter bar.

Include:

Organization

Operating Unit

Project

Grant

Donor

Fund Source

Country

Governorate

Currency

Fiscal Year

Quarter

Month

Date Range

Quick date selector:

Last 30 Days
Last 60 Days
Last 90 Days
Last 6 Months
Last 12 Months

Custom Date Range

Year selector

2025

2026

2027

...

2035

Multiple filters must work together.

Every visualization updates automatically.

Section 2 — Executive KPI Cards

Modern KPI cards.

Examples:

Total Budget

Available Budget

Committed Budget

Actual Expenditure

Budget Utilization %

Cash Balance

Accounts Payable

Accounts Receivable

Active Grants

Active Projects

Operating Cost

Program Cost

Indirect Cost

Overhead %

Donor Utilization %

Forecast Spend

Burn Rate

Variance

Average Payment Days

Outstanding Advances

Asset Value

Depreciation YTD

Pending Procurement Value

Pending Payments

Each KPI should include

Current Value

Comparison with previous period

Trend

Percentage

Mini sparkline

Color indicators

Section 3 — Budget Performance

Large Combo Chart

Budget vs Actual

Monthly

Features:

Bar

Line

Forecast Line

Variance

Running Total

Drill-down

Organization

↓

Project

↓

Grant

↓

Budget Line

Section 4 — Financial Trends

Line charts

Monthly Expenditure

Monthly Revenue

Cash Flow

Burn Rate

Budget Consumption

Forecast

Comparison by fiscal year

Section 5 — Expense Breakdown

Sunburst Chart

Organization

↓

Project

↓

Grant

↓

Cost Category

↓

Account

Alternative:

Treemap

Section 6 — Funding Distribution

Pie Chart

or

Donut Chart

Funding by

Donor

Grant

Funding Source

Program

Country

Section 7 — Budget Utilization

Gauge

Donut

Progress

Include:

Allocated

Committed

Spent

Remaining

Forecast

Section 8 — Cash Position

Waterfall Chart

Opening Balance

Income

Transfers

Payments

Closing Balance

Section 9 — Expenditure by Category

Stacked Bar

Categories

HR

Operations

Travel

Procurement

Assets

Logistics

Administration

Training

Consultancy

etc.

Section 10 — Procurement Financial Status

Integrate Procurement Analytics

Purchase Requests

Purchase Orders

Goods Received

Invoices

Payments

Outstanding Commitments

Pending Approval Value

Section 11 — Grant Financial Health

Table + Charts

Each Grant

Budget

Spent

Committed

Remaining

Burn Rate

Forecast

Utilization

Traffic Light

Green

Yellow

Red

Section 12 — Cost Allocation

Visualize

Shared Costs

Allocated Costs

Direct Costs

Indirect Costs

Allocation Rules

Departments

Projects

Operating Units

Section 13 — Treasury

Cash by Bank

Cash Flow

Upcoming Payments

Bank Balances

Liquidity

Currency Holdings

Section 14 — Assets

Asset Value

Depreciation

Asset Categories

Disposed Assets

Insurance

Maintenance

Section 15 — Financial Risks

Cards

Negative Budget

Overspending

Inactive Grants

Pending Advances

Large Unapproved Payments

Negative Cash Flow

Over Budget Projects

Expired Grants

Budget Mismatch

Section 16 — Executive Financial Table

Power BI style table

Columns

Project

Grant

Donor

Budget

Committed

Spent

Remaining

Forecast

Variance

Burn Rate

Utilization

Status

Allow:

Sorting

Grouping

Column Filters

Export

Search

Pagination

Totals

Section 17 — Recent Financial Activity

Timeline

Recent

Payments

Approvals

Budget Changes

Journal Entries

Transfers

Cost Allocation

Workflow Events

Charts Required

The dashboard must include a combination of:

KPI Cards
Line Charts
Area Charts
Bar Charts
Stacked Bar Charts
Combo Charts
Pie Charts
Donut Charts
Sunburst Charts
Treemap
Waterfall
Heatmap
Gauge
Progress Indicators
Financial Tables
Data Source

All dashboard data must come from existing schema.

Use existing Finance Modernization implementation.

Use existing Budget Synchronization.

Use existing Source of Truth.

Use existing Workflow.

Do NOT duplicate calculations.

Do NOT create alternative financial logic.

Every KPI must use the Finance Source of Truth.

Required Integration

Reuse existing routers where possible.

Only extend them if necessary.

Possible routers:

financeDashboardRouter

budgetRouter

budgetSyncRouter

financialReportsRouter

generalLedgerRouter

paymentsRouter

treasuryRouter

assetsRouter

vendorsRouter

costAllocationRouter

projectsRouter

grantsRouter

procurementAnalyticsRouter

workflowRouter

Performance Requirements

Dashboard must:

Load quickly

Lazy-load charts

Use aggregated SQL queries

Avoid N+1 queries

Support organizations with

100+

Projects

1000+

Grants

Millions of journal entries

Responsive Design

Desktop

Laptop

Tablet

Mobile

Cards must reorganize automatically.

Deliverables

Please provide complete implementation.

Include:

Frontend

All React components

Dashboard Layout

Charts

Cards

Filters

Tables

Hooks

Types

Utilities

Styling

Routing

Loading states

Error states

Empty states

Responsive layout

Backend

All routers

New procedures

Updated procedures

SQL queries

Aggregation queries

Performance optimization

Indexes if required

Authorization

Organization filtering

Operating Unit filtering

Project filtering

Grant filtering

Date filtering

Database

Review existing schema.

Reuse current tables whenever possible.

If additional tables are absolutely necessary:

Explain why.

Provide migration files.

Avoid duplicate data.

Maintain Finance Source of Truth.

Files

For every file provide:

New file

Updated file

Purpose

Dependencies

Import changes

Documentation

Explain:

Architecture

Data Flow

Source of Truth

Calculation logic

Performance strategy

Caching

Authorization

Security

Future scalability

Before implementation

Before writing code, review the existing Finance Modernization implementation, Budget Synchronization Engine, routers, and current schema.

If anything is unclear, or if additional files are needed (routers, components, database schema, synchronization services, workflow handlers, utilities, or documentation), stop and ask specific questions first. Do not make assumptions.

After clarification, provide the complete production-ready implementation with all updated and newly created files.