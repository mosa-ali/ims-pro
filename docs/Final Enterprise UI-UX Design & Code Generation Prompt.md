Executive Financial Intelligence Platform (IMS) – Final Enterprise UI/UX Design & Code Generation Prompt

We have completed the Finance Modernization backend (routers, engines, services, database architecture, Budget Sync, Finance Source of Truth, procurement integration, treasury, reporting, etc.).

The objective of this task is NOT to redesign the business logic.

Your objective is to design and generate a production-ready Enterprise Financial Intelligence UI package comparable to:

Microsoft Dynamics 365 Finance
SAP Analytics Cloud
Oracle Fusion Financials
Microsoft Power BI Executive Dashboards

This is NOT a generic commercial ERP.

This is an Enterprise Humanitarian & Development ERP (IMS) used by international NGOs operating in multiple countries, multiple organizations, multiple operating units, multiple grants, multiple donors, and multiple currencies.

The design must support both nonprofit and commercial organizations without hardcoding NGO terminology into reusable components.

Overall Deliverables

Produce a complete UI/Design package including:

Executive Financial Dashboard (Final Version)
Financial Risk Center
Financial Compliance Center
Complete Design System Package
React/Next.js production code
Component library
Router integration points
Schema updates (only if required)
Prototype
Navigation flows
Dark mode ready design tokens (future-ready)
Mobile responsiveness (tablet minimum)

No mock implementations.

Everything must connect to existing routers, engines and services.

Critical Architecture Requirements

The generated code MUST work with our existing IMS architecture.

Multi-tenant

Every query must respect:

ctx.scope.organizationId
ctx.scope.operatingUnitId

Every router must use

scopedProcedure

unless explicitly stated otherwise.

Never bypass organization isolation.

Never bypass operating unit isolation.

Never query all organizations.

Data Isolation

Every page must only display:

current organization
current operating unit
authorized projects
authorized grants
authorized finance records

No global queries.

No hardcoded IDs.

Internationalization

Support all existing IMS languages.

Required:

English
Arabic
Italian

Use existing Translation Provider.

No hardcoded strings.

All labels must use translation keys.

RTL support is mandatory.

The layouts must automatically adapt for Arabic.

Existing Backend

Do NOT redesign backend architecture.

Reuse existing:

Finance Dashboard Router

Finance Engines

Budget Sync

Financial Reporting

Treasury

Procurement Analytics

Journal Engine

Budget Engine

Compliance Engine

Risk Engine

Analytics Services

Budget Source of Truth

General Ledger

Projects

Budget Lines

Journal Lines

Bank Accounts

Payables

Receivables

Treasury

Cost Allocation

Currency Services

Exchange Rate Services

etc.

Only introduce new routers/services where genuinely required.

Required New Pages
1 Executive Financial Dashboard

Already designed.

Improve and polish.

Must become executive quality.

2 Financial Risk Center

Create full page.

Including:

Financial Risk Register

Risk Heat Map

Risk Trends

Risk Categories

Project Risk

Grant Risk

Donor Risk

Treasury Risk

Budget Risk

Liquidity Risk

Currency Risk

Procurement Risk

Risk Timeline

Risk Forecast

Risk History

AI Recommendations

Mitigation Plan

Owner

Due Date

Status

Priority

Financial Impact

Probability

Severity

Residual Risk

Drill-down

3 Financial Compliance Center

Create full page.

Including

Audit Readiness

Donor Compliance

Supporting Documents

Budget Compliance

Financial Policies

Bank Reconciliation

Outstanding Advances

Late Settlements

Late Salaries

Missing Documentation

Budget Line Overspending

Journal Validation

Treasury Controls

Procurement Compliance

Grant Compliance

Compliance Calendar

Compliance Timeline

Compliance Trend

Compliance Score

AI Recommendations

Dashboard Improvements

The Executive Dashboard still needs polishing.

Improve

KPI strip

Chart density

Executive layout

Whitespace

Typography

Color hierarchy

Visual balance

Chart interactions

Sticky headers

Hover states

Micro animations

Loading skeletons

Error states

Empty states

Required Visualizations

Use production-quality Recharts.

Include where appropriate:

BarChart

Stacked Bar

Grouped Bar

Horizontal Bar

LineChart

AreaChart

ComposedChart

PieChart

Donut

Sunburst

Treemap

Waterfall

Radar

Radial Gauge

Progress Indicators

Heat Map

Sparkline

Timeline

Mini Charts

Forecast Trend

Reference Line

Variance

Distribution

Ranking

Portfolio Analysis

Dashboard Filters

Use real SQL data.

No mock.

Support

Fiscal Year

2025–2035

Projects

Only ACTIVE projects

Grant

Donor

Country

Governorate

Currency

Project Manager

Sector

Date

30 days

60 days

90 days

6 months

12 months

Custom

Filters must automatically synchronize.

Example

Selecting Project

↓

Automatically populate

Donor

Currency

Budget

Dates

Country

Grant

No duplicate filtering.

Currency Rules

Implement enterprise currency logic.

Single Project

↓

Use project currency.

Multiple Projects (same currency)

↓

Use that currency.

Multiple Projects (different currencies)

↓

Automatically convert to operating unit reporting currency.

Examples

Yemen

↓

USD

Europe

↓

EUR

Ukraine

↓

EUR

Future countries configurable.

Never mix currencies in KPIs.

Financial Health Engine

Design UI around engine.

Health Score

Excellent

Good

Warning

Critical

Based on

Budget

Spent

Timeline

Remaining Days

Burn Rate

Forecast

Risk

AI

Compliance Engine

Design around dynamic indicators.

Examples

Audit Readiness

Missing Documents

Late Reconciliation

Budget Overrun

Outstanding Advances

Late Salaries

Donor Rules

Exchange Differences

Journal Integrity

Approval Violations

Segregation of Duties

Voucher Issues

Payment Delays

Supporting Evidence

Grant Conditions

etc.

AI Recommendation Panels

Maximum

5 recommendations.

Each recommendation includes

Priority

Impact

Reason

Suggested Action

Responsible Unit

Deadline

Confidence

Navigate to full details.

Design System Package

Create reusable Finance Design System.

Must include

FinanceKpiCard

FinanceMetricCard

SparklineCard

ExecutiveChartCard

ChartContainer

ChartToolbar

FilterBar

AdvancedFilter

FinanceBadge

RiskBadge

HealthBadge

ComplianceBadge

DonorBadge

CurrencyBadge

StatusChip

ProgressChip

VarianceChip

RiskIndicator

HealthIndicator

ExecutiveTable

StickyTable

DataGrid

FinancialMatrix

RiskMatrix

ComplianceMatrix

AIRecommendationCard

ExecutiveSidebar

Timeline

ForecastCard

AlertCard

NotificationCard

ActionCard

TreasuryCard

PortfolioCard

DashboardSection

WidgetHeader

WidgetToolbar

LoadingSkeleton

EmptyState

ErrorState

No duplicated UI.

Everything reusable.

Design Tokens

Provide

Typography

Spacing

Radius

Elevation

Colors

Financial Palette

Risk Palette

Compliance Palette

Success

Warning

Critical

Information

Neutral

Dark Mode Ready

Component Tokens

Chart Tokens

Animation Tokens

Required Generated Files

Provide all files.

Example

client/src/modules/finance/dashboard/

ExecutiveFinanceDashboard.tsx

ExecutiveKpiStrip.tsx

ExecutiveFilterBar.tsx

BudgetActualChart.tsx

CashWaterfallChart.tsx

PortfolioOverview.tsx

FinancialHealthMatrix.tsx

FinancialSidebar.tsx

RiskDistribution.tsx

AiRecommendationPanel.tsx

ComplianceScorecard.tsx

DashboardSection.tsx

client/src/modules/finance/risk/

FinancialRiskCenter.tsx

RiskHeatMap.tsx

RiskRegister.tsx

RiskTimeline.tsx

RiskForecast.tsx

RiskMatrix.tsx

RiskSidebar.tsx

RiskFilters.tsx

client/src/modules/finance/compliance/

FinancialComplianceCenter.tsx

ComplianceIndicatorGrid.tsx

ComplianceTrend.tsx

ComplianceCalendar.tsx

ComplianceOverview.tsx

DonorCompliancePanel.tsx

AuditReadinessCard.tsx

client/src/components/finance/

FinanceKpiCard.tsx

FinanceBadge.tsx

ExecutiveTable.tsx

ChartWrapper.tsx

FilterBar.tsx

RiskBadge.tsx

ComplianceBadge.tsx

CurrencyChip.tsx

StatusChip.tsx

Backend Integration Files

Provide integration updates.

Examples

financeDashboardRouter.ts

financialRiskRouter.ts

financialComplianceRouter.ts

financialAnalyticsRouter.ts


Services

financialRiskEngine.ts

financialComplianceEngine.ts

financialForecastEngine.ts

financialInsightEngine.ts


Only add schema updates when necessary.

If schema changes are required, explain why and provide migrations rather than destructive resets.

Quality Requirements

The final product must:

Match the Figma design exactly in implementation (pixel-perfect).
Use only real data from existing IMS routers, engines, and services—no mock data or placeholder logic.
Support English, Arabic (RTL), and Italian through the existing translation framework.
Enforce multi-tenant security using scopedProcedure, ctx.scope.organizationId, and ctx.scope.operatingUnitId throughout.
Follow existing IMS coding standards, architecture, and Finance Modernization patterns.
Be fully responsive and accessible.
Deliver reusable, maintainable components rather than page-specific implementations.
Final Deliverables Checklist

Before considering the work complete, provide:

Figma design files for all three pages.
Interactive prototype with navigation between pages.
Complete React/Next.js codebase.
All reusable design system components.
Complete list of generated, updated, and newly created files.
Router, engine, and service integration points.
Schema changes (only if required) with migration scripts.
Translation keys (English, Arabic, Italian).
Implementation guide explaining how each page connects to the existing Finance Modernization backend.
Confirmation that the implementation contains zero mock data and is fully integrated with the IMS Finance Source of Truth.