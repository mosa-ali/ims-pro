# Donor Master Data Synchronization & Statistics Engine

## Objective

Transform the Donor module into a fully automated master-data system synchronized from Projects and Grants.

Currently:

* Projects already contain donor information.
* Grants already contain donor information.
* Donors table is mostly empty.
* Donor Projects relationships are incomplete.
* Donor Intelligence dashboard relies on manually maintained donor records.

The new architecture shall automatically create, update, and maintain donor records whenever Projects or Grants are created, updated, or deleted.

The system must eliminate duplicate donor data entry and ensure all donor intelligence dashboards are generated from synchronized operational data.

---

# Source Tables

## Primary Sources

### projects

Used fields:

* donor
* projectCode
* title
* totalBudget
* spent
* currency
* startDate
* endDate
* status
* organizationId
* operatingUnitId

### grants

Used fields:

* donorId
* donorName
* grantAmount
* totalBudget
* currency
* status
* startDate
* endDate

---

# Target Tables

## donors

Automatically maintained.

## donor_projects

Automatically maintained.

## donor_budget_mapping

Automatically initialized when required.

## NEW TABLE

donor_statistics

Stores pre-calculated donor portfolio metrics.

---

# New Database Table

## donor_statistics

Purpose:

Pre-calculate donor intelligence metrics instead of recalculating during every dashboard load.

### Schema

id
organizationId
operatingUnitId
donorId

totalProjects
activeProjects
completedProjects

totalGrants
activeGrants

totalBudgetUSD
totalBudgetEUR
totalBudgetCHF
totalBudgetSAR
totalBudgetYER

totalSpentUSD
totalSpentEUR
totalSpentCHF
totalSpentSAR
totalSpentYER

averageProjectSize

firstProjectDate
latestProjectDate

lastCalculatedAt

createdAt
updatedAt

---

# Synchronization Events

## Event 1

Project Created

Trigger:

Create Project API

After successful project creation:

execute

syncDonorFromProject(projectId)

---

## Event 2

Project Updated

Trigger:

Update Project API

After successful update:

execute

syncDonorFromProject(projectId)

recalculateDonorStatistics(donorId)

---

## Event 3

Project Deleted

Trigger:

Delete Project API

After successful deletion:

execute

removeDonorProjectRelation(projectId)

recalculateDonorStatistics(donorId)

---

## Event 4

Grant Created

Trigger:

Create Grant API

After successful creation:

execute

syncDonorFromGrant(grantId)

---

## Event 5

Grant Updated

Trigger:

Update Grant API

After successful update:

execute

syncDonorFromGrant(grantId)

---

## Event 6

Grant Deleted

Trigger:

Delete Grant API

After successful deletion:

execute

recalculateDonorStatistics(donorId)

---

# Donor Creation Logic

When a project is saved:

Read:

projects.donor

Example:

"Adidas Foundation"

Search:

donors.name

If donor exists:

reuse donor

If donor does not exist:

create donor

Populate:

organizationId
operatingUnitId
name
code
isActive

---

# Donor Code Generation

Automatically generate:

ADIDAS-001
FIFA-001
UEFA-001
EU-001
UNICEF-001

Format:

FIRSTWORD-UPPERCASE + sequence

---

# Donor Project Synchronization

Automatically create/update:

donor_projects

Populate:

organizationId
operatingUnitId
donorId
projectId

relationshipType='primary_funder'

status='active'

fundingAmount = project.totalBudget

currency = project.currency

startDate = project.startDate

endDate = project.endDate

---

# Currency Rules

IMPORTANT

Never convert currencies.

Never aggregate currencies.

Store separately.

Example:

USD 400,000

EUR 80,000

CHF 40,000

SAR 300,000

YER 5,000,000

Must remain separate.

Dashboard must display original currency.

---

# Donor Statistics Calculation

Service:

recalculateDonorStatistics(donorId)

Calculates:

Total Projects

COUNT(projects)

Active Projects

COUNT(status='active')

Completed Projects

COUNT(status='completed')

Total Grants

COUNT(grants)

Active Grants

COUNT(grants.status='ongoing')

Currency Totals

SUM(project.totalBudget)

grouped by currency

Example:

USD = 450,000

EUR = 77,634

CHF = 41,500

SAR = 0

YER = 0

---

# Donor Budget Mapping

When donor created:

Check:

donor_budget_mapping

If mapping does not exist:

Create default placeholder.

donorCategoryCode:

UNMAPPED

donorCategoryName:

Unmapped Category

Flag for finance review.

---

# Project List Aggregation

Store donor portfolio metadata:

Project Code

Project Title

Currency

Budget

Spent

Start Date

End Date

Status

Used by:

Donor Intelligence Dashboard

Donor Profile Page

Strategic Engagement Panel

---

# New Backend Services

Create Folder

server/services/donor/

---

# File 1

server/services/donor/DonorSyncService.ts

Purpose:

Central donor synchronization service.

Methods:

syncDonorFromProject()

syncDonorFromGrant()

syncDonorRecord()

syncDonorProjects()

---

# File 2

server/services/donor/DonorStatisticsService.ts

Purpose:

Calculate donor metrics.

Methods:

recalculateDonorStatistics()

calculateCurrencyTotals()

calculateGrantStatistics()

calculateProjectStatistics()

---

# File 3

server/services/donor/DonorMappingService.ts

Purpose:

Maintain donor budget mappings.

Methods:

ensureMappingExists()

createDefaultMapping()

syncMappings()

---

# File 4

server/services/donor/DonorProjectService.ts

Purpose:

Manage donor_projects relationships.

Methods:

linkProject()

unlinkProject()

updateProjectLink()

---

# File 5

server/services/donor/DonorDashboardService.ts

Purpose:

Read pre-calculated donor intelligence data.

Methods:

getTopDonors()

getDonorPortfolio()

getDonorRetention()

getStrategicEngagement()

---

# API Updates

## Project Create API

After insert:

await DonorSyncService.syncDonorFromProject(projectId)

---

## Project Update API

After update:

await DonorSyncService.syncDonorFromProject(projectId)

---

## Grant Create API

After insert:

await DonorSyncService.syncDonorFromGrant(grantId)

---

## Grant Update API

After update:

await DonorSyncService.syncDonorFromGrant(grantId)

---

# Dashboard Updates

Replace direct aggregation queries.

All dashboard widgets must read from:

donor_statistics

instead of recalculating every request.

Benefits:

* Faster loading
* Lower database load
* Consistent donor metrics
* Automatic donor portfolio management
* Real-time synchronization

---

# Initial Migration

Create migration:

scripts/sync-existing-donors.ts

Purpose:

Populate donors table from existing projects and grants.

Steps:

1. Scan all projects.
2. Extract donor names.
3. Create missing donors.
4. Create donor_projects records.
5. Create donor_statistics records.
6. Create missing donor_budget_mapping entries.
7. Recalculate all donor statistics.

This migration should be executed once after deployment.
