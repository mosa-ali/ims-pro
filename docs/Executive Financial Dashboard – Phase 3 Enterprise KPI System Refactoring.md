Executive Financial Dashboard – Phase 3 Enterprise KPI System Refactoring

You are a senior Microsoft, SAP, Oracle Fusion Financials, Dynamics 365 Finance, and Power BI enterprise frontend architect.

Your objective is NOT to redesign the finance dashboard from scratch.

Instead, transform the existing Executive Financial Dashboard into a premium enterprise executive analytics experience while remaining 100% compatible with the existing React + TypeScript + Tailwind + ShadCN + TRPC + Drizzle architecture.

The implementation must be production-ready, modular, reusable, responsive, and fully typed.

Never use mock data.

Never break existing APIs.

Never simplify the implementation.

The generated code must compile without modification.

Current Architecture

The project already contains:

ExecutiveFinanceDashboard.tsx
ExecutiveKPICard.tsx
Finance Dashboard Router
Finance Dashboard Engine
Finance Dashboard Services
Existing TRPC APIs
Existing TranslationProvider
Existing Theme System
Existing Recharts implementation
Existing Tailwind design tokens

Reuse all existing APIs.

Do not create duplicate logic.

Main Objective

Replace the current ExecutiveKPICard with a complete Enterprise KPI Component System.

The final result should look comparable to:

Microsoft Power BI Executive Dashboard
SAP Analytics Cloud
Oracle Fusion Financial Dashboard
Dynamics 365 Finance
Workday Financial Analytics

The interface must feel like enterprise software rather than an admin template.

General Requirements

The implementation must

✔ remain fully backward compatible

✔ reuse existing APIs

✔ reuse current dashboard layout

✔ support translations

✔ support dark mode

✔ support RTL

✔ support responsive layouts

✔ support accessibility

✔ support keyboard navigation

✔ support screen readers

✔ use React.memo where appropriate

✔ use useMemo

✔ use useCallback

✔ avoid unnecessary rerenders

✔ maintain TypeScript strict mode

Folder Structure

Replace the existing KPI implementation with:

components/
└── executive/
    └── kpi/
        ExecutiveKPIBase.tsx
        FinancialKPICard.tsx
        ProgressKPICard.tsx
        StatusKPICard.tsx
        ForecastKPICard.tsx
        MiniSparkline.tsx
        KPIGauge.tsx
        KPIProgress.tsx
        KPIDelta.tsx
        KPITrend.tsx
        KPITypes.ts
        KPIUtils.ts
        KPIConstants.ts
        index.ts

Everything must be exported cleanly.

PART 1

Implement complete KPI architecture.

Create

KPITypes.ts

including

KPIVariant

FinancialKPI

ProgressKPI

StatusKPI

ForecastKPI

TrendDirection

DeltaType

Severity

KPITheme

MiniChartData

ExecutiveKPIProps

SparklineProps

GaugeProps

ProgressProps

ForecastProps


Create utility functions

formatCurrency()

formatPercent()

formatCompactNumber()

calculateTrend()

calculateDelta()

determineSeverity()

generateSparkline()


Everything must be typed.

Create

ExecutiveKPIBase.tsx

The base card should support

Header

Icon

Title

Subtitle

Main Value

Secondary Value

Footer

Trend

Mini Chart

Status Badge

Color Accent

Hover animation

Loading Skeleton

Tooltip

Click Action

Drill Down

Compact Mode

Large Mode

Responsive Mode

RTL

Dark Mode

Accessibility

PART 2

Create FinancialKPICard.tsx

Used for

Portfolio Budget

Actual Spent

Cash on Hand

Remaining Balance

Receivables

Payables

Commitments

Encumbrances

The card must include

Large Value

Currency

Mini Area Chart

Trend

Variance

Previous Period

Percentage

Animated Count Up

Loading State

Mini chart

Use

AreaChart

Area

ResponsiveContainer

Tooltip

Gradient Fill

ReferenceLine

PART 3

Create ProgressKPICard.tsx

Used for

Burn Rate

Utilization

Budget Consumption

Physical Progress

Implementation Progress

Project Completion

Mini visualization should use

LineChart

Line

ReferenceLine

Tooltip

Gradient

Sparkline

Trend

Forecast Line

Threshold Line

PART 4

Create StatusKPICard.tsx

Used for

Active Projects

Projects at Risk

On Track

Critical

Compliance

Outstanding Advances

Late Reconciliations

Audit Findings

Use

Circular Progress

Gauge

Badges

Icons

Status Pills

Animated Ring

Severity Colors

PART 5

Create ForecastKPICard.tsx

Used for

Budget Forecast

Cash Forecast

Funding Gap

Remaining Days

Burn Prediction

AI Confidence

Features

Forecast Badge

Projected Value

Confidence %

Mini Forecast Chart

AI Recommendation

Next Milestone

PART 6

Create MiniSparkline.tsx

Reusable

Supports

Line

Area

Bar

Gradient

Tooltip

Reference Line

Hover Animation

Create KPIGauge.tsx

Supports

Needle

Radial

Arc

Thresholds

Animated Progress

Create KPIProgress.tsx

Supports

Horizontal

Vertical

Gradient

Striped

Animated

Threshold

Create KPITrend.tsx

Supports

Up

Down

Flat

Arrow

Percentage

Color

Animation

Create KPIDelta.tsx

Supports

Increase

Decrease

Previous Value

Variance

Badge

PART 7

Update ExecutiveFinanceDashboard.tsx

Replace every old KPI.

Old

<ExecutiveKPICard />

must become the appropriate specialized component.

Example

FinancialKPICard

ProgressKPICard

StatusKPICard

ForecastKPICard

Use

React.memo

useMemo

useCallback

KPI Mapping

Portfolio Budget

→ FinancialKPICard

Actual Spent

→ FinancialKPICard

Cash on Hand

→ FinancialKPICard

Remaining Balance

→ FinancialKPICard

Commitments

→ ProgressKPICard

Utilization

→ ProgressKPICard

Burn Rate

→ ProgressKPICard

Projects

→ StatusKPICard

Risk

→ StatusKPICard

Compliance

→ StatusKPICard

Forecast

→ ForecastKPICard

Enterprise Design Rules

Every KPI must have its own personality.

No two cards should look identical.

Budget

Blue

Actual

Green

Cash

Orange

Commitments

Purple

Utilization

Teal

Burn

Amber

Projects

Navy

Compliance

Emerald

Forecast

Indigo

Risk

Red

Typography

Executive

Large Numbers

Weight 700+

Subtitle

Small

Uppercase

Letter spacing

Footer

Muted

Spacing

Enterprise

8px grid

Consistent padding

Large whitespace

Rounded cards

Shadow hierarchy

Hover elevation

Animations

Subtle

Professional

No excessive motion

Count-up animation

Sparkline animation

Gauge animation

Hover lift

Accessibility

WCAG AA

Keyboard support

Focus states

Screen reader labels

High contrast

Performance

Lazy charts

Memoization

Virtualization ready

No unnecessary renders

Deliverables

Do not provide explanations.

Deliver complete production-ready TypeScript code.

Each part must be delivered as a standalone, compilable file.

The order of delivery must be:

KPITypes.ts
KPIUtils.ts
ExecutiveKPIBase.tsx
MiniSparkline.tsx
KPIGauge.tsx
KPIProgress.tsx
KPITrend.tsx
KPIDelta.tsx
FinancialKPICard.tsx
ProgressKPICard.tsx
StatusKPICard.tsx
ForecastKPICard.tsx
index.ts
Updated ExecutiveFinanceDashboard.tsx

Before moving to the next file, ensure the previous one compiles successfully. Never use placeholders, TODOs, mock data, or pseudo-code. Every file must be complete, production-ready, and directly usable in the existing IMS without further modification.

I would also add one more requirement that will materially improve the dashboard:

Phase 3.5 – Executive Visualization Framework

Ask the AI to build a shared visualization library (for example ExecutiveChartCard, ExecutiveChartHeader, ExecutiveLegend, ExecutiveTooltip, ExecutiveEmptyState, and ExecutiveLoadingState). Then every chart in the finance dashboard—Budget vs Actual, Waterfall, Risk Distribution, Forecasts, Compliance, and future dashboards—uses the same styling, spacing, legends, tooltips, loading skeletons, and interactions. This creates the polished, consistent experience seen in Microsoft, SAP, Oracle, and Dynamics products and makes the framework reusable across your entire IMS, not just Finance.