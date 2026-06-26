# LOCAL-IMS Executive Intelligence Dashboard (Power BI Style)

## Objective

Redesign only the upper dashboard section (current Executive Snapshot, Work Queue, and Operational Modules area) into a modern Power BI-style Executive Dashboard.

The lower sections:

* Recent Activity
* Upcoming Deadlines
* Smart Shortcuts
* Humanitarian Identity

must remain unchanged.

The new design should focus on:

* Executive decision making
* Portfolio performance
* Operational bottlenecks
* Organizational health
* Donor and grant visibility
* Financial oversight
* HR and procurement workload
* Interactive Power BI-style charts

The design should feel similar to:

* Power BI Executive Dashboards
* UN Portfolio Dashboards
* DG ECHO Monitoring Dashboards
* NGO Country Office Management Dashboards

---

# Dashboard Layout

## Row 1: Executive KPI Header

Six large KPI cards.

### Card 1

Total Active Projects

Data Source:
Projects Module

Display:

* Total Active Projects
* Change from previous month
* Small sparkline trend

### Card 2

Total Grant Value

Data Source:
Projects + Grants

Display:

* Total Budget
* Currency USD
* Growth percentage

### Card 3

Budget Utilization

Data Source:
Finance

Display:

* Total Spent
* Remaining Budget
* Utilization %

Visual:
Circular progress chart

### Card 4

Active Donors

Data Source:
Donor CRM

Display:

* Total donors
* New donors this year

### Card 5

Human Resources

Data Source:
HR

Display:

* Total active staff
* Contracts expiring in 60 days

### Card 6

Beneficiaries Reached

Data Source:
Indicators + Beneficiaries

Display:

* Total reached
* Monthly increase

---

# Row 2: Portfolio Performance

Split 50/50

---

## Left

### Budget vs Expenditure Trend

Chart Type:
Line Chart

Data:

Month
Approved Budget
Actual Spending

Example:

Jan
Feb
Mar
Apr
May
Jun

Lines:

* Budget
* Actual Expenditure

Purpose:

Track burn rate.

---

## Right

### Active Projects Trend

Chart Type:
Area Chart

Data:

Month

* Active Projects
* Completed Projects

Purpose:

Project portfolio evolution.

---

# Row 3: Program Portfolio Analytics

Three equal cards.

---

## Projects by Sector

Chart Type:
Donut Chart

Data Source:

Projects

Examples:

* WASH
* Protection
* Food Security
* Livelihood
* Education
* Health
* Shelter
* Nutrition

---

## Budget by Donor

Chart Type:
Donut Chart

Data Source:

Grants

Examples:

* DG ECHO
* AICS
* UNICEF
* UNDP
* OCHA
* Other

---

## Projects by Governorate

Chart Type:
Horizontal Bar Chart

Data Source:

Projects

Examples:

* Taiz
* Aden
* Lahj
* Abyan
* Hodeidah
* Marib

---

# Row 4: Operational Action Center

Replace current Work Queue.

Use four colored operational cards.

---

## Human Resources

Metrics:

* Leave Requests Pending
* Recruitment Requests
* Contracts Expiring
* Performance Reviews Due

Color:
Green

---

## Finance

Metrics:

* Payments Pending
* Advances Outstanding
* Budget Amendments
* Cash Requests

Color:
Blue

---

## Logistics & Procurement

Metrics:

* PR Pending Approval
* RFQs Open
* POs Pending
* Deliveries Delayed

Color:
Orange

---

## Risk & Compliance

Metrics:

* Open Risks
* Critical Risks
* Audit Findings
* Reports Overdue

Color:
Red

Each card should show:

* Count
* Trend
* Quick link

Power BI card style.

---

# Row 5: Approval Pipelines

Two panels.

---

## Procurement Funnel

Chart Type:
Funnel Chart

Stages:

Submitted PRs
↓
Reviewed
↓
Approved
↓
PO Issued
↓
Completed

Purpose:

Identify procurement bottlenecks.

---

## HR Workflow Funnel

Stages:

Leave Requests
↓
Supervisor Approval
↓
HR Approval
↓
Completed

Purpose:

Track HR approvals.

---

# Row 6: Human Resources Analytics

---

## Employees by Department

Chart Type:
Horizontal Bar Chart

Data:

* HR
* Finance
* Programs
* MEAL
* Logistics
* Procurement
* IT

---

## Contract Types

Chart Type:
Donut Chart

Data:

* National Staff
* International Staff
* Consultants
* Volunteers

---

## Gender Distribution

Chart Type:
Donut Chart

Data:

* Male
* Female

---

# Row 7: Financial Intelligence

---

## Budget Utilization by Grant

Chart Type:
Stacked Bar Chart

Data:

Grant Name

Series:

* Budget
* Spent
* Remaining

---

## Monthly Expenditure

Chart Type:
Area Chart

Data:

Monthly expenditure trend.

---

## Cost Pool Distribution

Chart Type:
Donut Chart

Data Source:

Cost Pools

Examples:

* Program Costs
* Support Costs
* HR Costs
* Operations

---

# Row 8: Procurement Analytics

---

## PR Status

Chart Type:
Bar Chart

Status:

* Draft
* Submitted
* Approved
* Rejected
* Completed

---

## Procurement Categories

Chart Type:
Donut Chart

Examples:

* Assets
* Services
* Construction
* Supplies
* IT Equipment

---

## Procurement Cycle Time

Chart Type:
Line Chart

Average approval days by month.

---

# Row 9: Monitoring & Evaluation

---

## Indicators Progress

Chart Type:
Gauge Chart

Display:

Target vs Achievement

---

## Beneficiaries by Sector

Chart Type:
Stacked Bar

Examples:

WASH
Protection
Livelihood
Health

Male/Female breakdown.

---

## Activity Completion

Chart Type:
Progress Bar Chart

Planned vs Completed Activities.

---

# Row 10: Risk & Compliance

---

## Risk Heatmap

Matrix:

Likelihood × Impact

Color:

Green
Yellow
Red

---

## Open Findings

Chart Type:
Bar Chart

Grouped by:

* HR
* Finance
* Procurement
* Programs

---

# Design Requirements

Use:

* White background
* Very light gray cards
* Soft shadows
* Rounded corners (12px)
* Power BI color palette
* Compact spacing
* Interactive tooltips
* Drill-down capability
* Responsive layout

Avoid:

* Large empty spaces
* Text-heavy cards
* Traditional ERP tables in the upper section

Focus on:

* Data visualization
* Trends
* Comparisons
* Executive decision support

The dashboard should feel like a Power BI executive dashboard embedded inside an ERP system.
