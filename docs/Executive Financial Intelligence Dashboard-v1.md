Executive Financial Intelligence Dashboard Complete Enterprise Redesign

You are a Senior Enterprise ERP UX Architect, Principal React Engineer, Microsoft Power BI Dashboard Designer, and Financial Systems Architect.

Your objective is NOT to make minor improvements.

Your objective is to completely redesign the Finance Executive Dashboard so it becomes a premium enterprise financial dashboard comparable to:

• Microsoft Dynamics 365 Finance
• Oracle Fusion ERP
• SAP S/4HANA Fiori
• Power BI Executive Financial Dashboard
• Workday Financials
• UNICEF / UNDP / World Bank Executive Dashboards

while keeping the existing IMS architecture.

The current implementation is approximately 60% visually aligned with the approved design.

The final implementation must be 98–100% visually and functionally aligned with the approved screenshot.

CRITICAL RULE

Do NOT redesign business logic.

Do NOT modify tRPC contracts.

Do NOT create mock data.

Do NOT hardcode financial values.

Do NOT simplify components.

Use ONLY existing router procedures and source-of-truth tables.

If data is unavailable, show loading placeholders instead of fake data.

Architecture Rules

Preserve

financeDashboardRouter

financialReportsRouter

existing Drizzle schema

existing routing

existing authentication

existing permissions

existing translation system

existing organization scope

existing operating unit scope

existing project filtering

PHASE 1

Remove duplicated UI components.

Currently there are multiple implementations of

TopNavBar

SideNavBar

Button

IconButton

KPI Cards

Dashboard Layout

Finance Shared Components

Dashboard Widgets

Create ONE shared component library.

Every dashboard page must use the same components.

PHASE 2

Redesign the entire page layout.

Current layout feels like separate cards.

Target layout must feel like one continuous analytical workspace.

Use consistent

24px margins

16px gutters

8px spacing system

Card radius

Typography hierarchy

Padding

Visual rhythm

Alignment

No section should appear disconnected.

PHASE 3

Pixel-perfect recreation

Match the reference screenshot including

Header

Search

Filter row

KPI strip

Budget chart

Waterfall

Risk sidebar

Pipeline

Compliance

Health Matrix

AI insights

Whitespace

Shadows

Borders

Spacing

Card heights

Card proportions

Responsive behavior

Everything should visually match.

PHASE 4

Typography overhaul

Current typography is inconsistent.

Implement

Display

Headline

Section Title

Widget Title

Subtitle

Body

Caption

Table Header

Table Body

Numeric KPIs

Percentage KPIs

Status Labels

Button Labels

Metadata

Timestamp

Badges

Use

Inter

Segoe UI

or IBM Plex Sans.

Numbers should use tabular numerals.

Titles must use enterprise styling.

Remove oversized bold text.

Use Microsoft-style typography hierarchy.

PHASE 5

Color System

Current colors are inconsistent.

Implement a professional enterprise palette.

Primary

Corporate Navy

Background

Neutral Gray

Cards

Pure White

Borders

Light Gray

Success

Green

Warning

Amber

Critical

Red

Info

Blue

Muted

Slate

Charts must use consistent colors.

Never random colors.

Never overly saturated colors.

PHASE 6

Charts

Replace every placeholder chart with enterprise-quality Recharts.

Budget vs Actual

Use

ComposedChart

Bar

Line

ReferenceLine

Tooltip

Legend

XAxis

YAxis

ResponsiveContainer

Actual

Budget

Forecast

Variance

Target

Burn Rate

should all appear.

Cash Position

Replace with

true Waterfall Chart

using

BarChart

Cell

LabelList

ReferenceLine

Tooltip

Legend

Opening

Receipts

Transfers

Payroll

Payments

Advances

Operational Costs

Closing

Utilization KPI

Replace sparkline

with

AreaChart

Burn Rate

Replace

with LineChart

including

30-day trend

forecast

moving average

P2P Pipeline

Replace circles

with connected workflow

animated nodes

status counts

hover tooltips

click navigation

Compliance

Replace dots

with

progress bars

status chips

completion %

trend arrows

Financial Health Matrix

Replace plain table

with

enterprise analytical grid

sticky header

sorting

search

filters

conditional formatting

progress bars

status icons

variance colors

row hover

drill-down

Risk Distribution

Replace static bar

with

PieChart

interactive legend

click filtering

AI Insights

Replace static card

with

dynamic recommendation panel

confidence score

priority

category

recommended action

drill-down

PHASE 7

Animation

Add subtle enterprise animations.

Hover elevation

Card transitions

Chart animation

Filter transitions

Loading skeletons

Number counting animation

No flashy effects.

Everything should feel premium.

PHASE 8

Translation

Every visible string must come from the translation system.

No hardcoded text.

Update

English

Arabic

Italian

including

Headers

Buttons

Tooltips

Charts

Legends

Filters

Tables

Badges

Alerts

Sidebar

Dialogs

Export

Search

Pagination

Everything.

PHASE 9

Financial formatting

Implement consistent

Currency formatting

Percentage formatting

Negative values

Accounting format

Date format

Large numbers

Thousands separators

Millions

Billions

Locale aware.

PHASE 10

Executive UX

Every card should answer one business question.

Example

Budget

How much was allocated?

Spent

How much consumed?

Cash

Can we pay?

Burn Rate

Will funding last?

Risk

What requires attention?

Pipeline

Where are procurement bottlenecks?

Compliance

Are we audit ready?

AI

What action should management take?

Health Matrix

Which projects need intervention?

PHASE 11

Interaction

Every chart should support

Hover

Tooltip

Click

Drill-down

Cross-filter

Keyboard navigation

Accessibility

PHASE 12

Responsive

Desktop

1920

1600

1440

1366

Laptop

Tablet

Maintain enterprise layout.

No broken cards.

No overflow.

No empty white areas.

PHASE 13

Performance

Memoize charts

Lazy loading

Skeleton loaders

Virtualized table

Debounced search

Code splitting

Avoid unnecessary rerenders.

PHASE 14

Accessibility

WCAG AA

Keyboard support

ARIA

Contrast

Focus states

Screen reader labels

PHASE 15

Code Quality

Refactor

DashboardWidgets

FinanceShared

Layout

ExecutiveDashboard

AdvancedDashboard

ReportingWidgets

DetailWidgets

Remove duplicated code.

Single responsibility.

Reusable widgets.

Strict TypeScript.

No any.

No duplicated Tailwind.

No inline styles unless required.

Deliverables

Produce a production-ready Executive Financial Intelligence Dashboard that is visually indistinguishable from the approved reference while remaining fully integrated with the existing IMS finance architecture, using real data from the existing routers and preserving all current business logic. The result should be a cohesive, enterprise-grade analytical workspace rather than a collection of independent cards, with consistent typography, colors, spacing, interactions, translations, and high-quality Recharts visualizations throughout.