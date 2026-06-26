# Data Integrity & Development Standards

## Zero Mock Data Policy

This implementation must follow a strict **Zero Mock Data** approach.

### Requirements

* No hardcoded donor names.
* No hardcoded currencies.
* No hardcoded project counts.
* No hardcoded grant values.
* No hardcoded statistics.
* No sample datasets.
* No placeholder dashboard values.
* No demo records inserted into the database.
* No fallback mock arrays in frontend components.
* No temporary testing values displayed in widgets.

All dashboard components, services, APIs, charts, maps, statistics, KPIs, and intelligence panels must retrieve data directly from the database.

---

## Data Source Hierarchy

The only approved sources of donor information are:

### Projects Table

* projects.donor
* projects.totalBudget
* projects.spent
* projects.currency
* projects.startDate
* projects.endDate
* projects.status

### Grants Table

* grants.donorId
* grants.donorName
* grants.grantAmount
* grants.totalBudget
* grants.currency
* grants.status

### Donors Table

* donors.*

### Donor Projects Table

* donor_projects.*

### Donor Statistics Table

* donor_statistics.*

### Donor Budget Mapping Table

* donor_budget_mapping.*

---

## Dashboard Data Rules

Every donor dashboard widget must be generated from live database records.

Examples:

### Top Donors by Value

Source:

* donor_statistics
* projects

Must never use:

```ts
const mockDonors = [...]
```

### Donor Retention Rate

Source:

* donor_statistics
* donor_projects
* grants

Must never use:

```ts
const retentionRate = 4;
```

### Strategic Engagement

Source:

* donor_communications
* donor_projects
* donor_statistics

Must never use:

```ts
const engagement = {
  risk: "High",
  concentration: 81
}
```

---

## Empty State Handling

If no records exist:

Display proper empty states.

Examples:

* "No donor data available."
* "No active grants found."
* "No donor communications recorded."
* "No projects linked to this donor."

Never generate estimated values.

Never display fabricated statistics.

Never substitute mock data.

---

## Development Validation

Before deployment verify:

✓ No mock data files exist.

✓ No seed data used by dashboard components.

✓ No hardcoded donor metrics.

✓ No hardcoded currencies.

✓ No hardcoded project counts.

✓ No hardcoded grant values.

✓ No fallback arrays.

✓ All dashboard data originates from database queries.

✓ All donor statistics are generated through DonorStatisticsService.

✓ All donor records are generated through DonorSyncService.

---

## Production Requirement

The Donor Intelligence module must operate as a fully data-driven system.

Every value shown to users must be traceable to:

Projects → Grants → Donors → Donor Projects → Donor Statistics

with complete synchronization and no manually maintained reporting datasets.
