🌍 HUMANITARIAN FOOTPRINT – GEO INTELLIGENCE SYSTEM (FULL REBUILD PROMPT)
1. SYSTEM OBJECTIVE

Redesign the Humanitarian Footprint module into a:

🧭 Geographic Intelligence Layer for Humanitarian Operations

The system must visualize:

Countries
Governorates
Project coverage
Budget distribution
Spending intensity (from budget_items)
Operational reach

It must behave like a Power BI + GIS hybrid dashboard.

2. CORE PRINCIPLE (VERY IMPORTANT)
❌ DO NOT DO
No project selection on map
No click interactions required
No tooltips required for MVP
No duplicate project list inside map
No mock data
✅ DO
Map is ONLY a visualization layer
All financial and project info is moved to “Portfolio Performance”
Map only shows geographic coverage
3. DATABASE SCHEMA (FINAL STRUCTURE)
3.1 Countries Table
export const countries = mysqlTable("countries", {
  id: int().autoincrement().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  isoCode: varchar({ length: 10 }),
});
3.2 Governorates Table
export const governorates = mysqlTable("governorates", {
  id: int().autoincrement().primaryKey(),
  countryId: int().notNull(),

  name: varchar({ length: 255 }).notNull(),
  nameAr: varchar({ length: 255 }),

  geoJsonKey: varchar({ length: 255 }), // matches map feature name
});
3.3 Projects Table (existing but enhanced usage)
export const projects = mysqlTable("projects", {
  id: int().autoincrement().primaryKey(),

  projectCode: varchar({ length: 100 }),
  title: text(),

  status: mysqlEnum([
    "planning",
    "active",
    "on_hold",
    "completed",
    "cancelled",
  ]).notNull(),

  totalBudget: decimal({ precision: 15, scale: 2 }),
});
3.4 Project → Governorate Mapping (CRITICAL TABLE)
export const projectGovernorates = mysqlTable("project_governorates", {
  id: int().autoincrement().primaryKey(),

  projectId: int().notNull(),
  governorateId: int().notNull(),
});
3.5 Budget Items (REAL SPENDING SOURCE)
export const budgetItems = mysqlTable("budget_items", {
  id: int().autoincrement().primaryKey(),

  projectId: int().notNull(),

  actualSpent: decimal({ precision: 15, scale: 2 }).default("0"),

  updatedAt: timestamp({ mode: "string" }),
});
4. RELATIONSHIP MODEL
Country
  ↓
Governorates
  ↓
ProjectGovernorates (MANY-TO-MANY)
  ↓
Projects
  ↓
BudgetItems (actual spending)
5. CRITICAL BUSINESS LOGIC
5.1 ACTIVE PROJECT FILTER
const activeProjects = projects.filter(
  (p) => p.status === "active"
);
5.2 GOVERNORATE COVERAGE (GLOBAL UNION)
const activeGovernorates = new Set(
  activeProjects
    .flatMap((p) => p.governorates)
    .map((g) => g.name.toLowerCase().trim())
);
5.3 SPENDING CALCULATION (VERY IMPORTANT)

NEVER use:

projects.spent ❌

USE ONLY:

SUM(budget_items.actualSpent)
6. TRPC ENDPOINT (FINAL)
6.1 Geographic Intelligence Endpoint
getGeographicIntelligence: scopedProcedure.query(async ({ ctx }) => {
  const db = await getDb();
  const { organizationId, operatingUnitId } = ctx.scope;

  const projectsData = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.operatingUnitId, operatingUnitId),
        eq(projects.isDeleted, 0)
      )
    );

  const mappings = await db
    .select()
    .from(projectGovernorates);

  const spending = await db
    .select({
      projectId: budgetItems.projectId,
      spent: sql<number>`SUM(${budgetItems.actualSpent})`,
    })
    .from(budgetItems)
    .groupBy(budgetItems.projectId);

  const spendMap = new Map(
    spending.map((s) => [s.projectId, Number(s.spent || 0)])
  );

  const enrichedProjects = projectsData.map((p) => ({
    ...p,
    totalSpent: spendMap.get(p.id) || 0,
  }));

  const governorateMap = buildGovernorateCoverage(
    enrichedProjects,
    mappings
  );

  const totalBudget = enrichedProjects.reduce(
    (a, b) => a + Number(b.totalBudget || 0),
    0
  );

  const totalSpent = enrichedProjects.reduce(
    (a, b) => a + Number(b.totalSpent || 0),
    0
  );

  return {
    country: "Yemen",
    totalBudget,
    totalSpent,
    utilization:
      totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    projects: enrichedProjects,
    governorates: governorateMap,
  };
});
7. FRONTEND REDESIGN
7.1 Humanitarian Footprint Component
RULE: MAP IS VISUAL ONLY
<ComposableMap
  projection="geoMercator"
  projectionConfig={{
    scale: 4500,
    center: [47.5, 15.5],
  }}
  style={{ width: "100%", height: "100%" }}
>
7.2 GEOJSON SOURCE
/maps/yemen-governorates.geojson
7.3 RENDER LOGIC
geographies.map((geo) => {
  const name =
    geo.properties?.name?.toLowerCase().trim();

  const isActive =
    activeGovernorates.has(name);

  return (
    <Geography
      key={geo.rsmKey}
      geography={geo}
      stroke="#ffffff"
      strokeWidth={0.6}
      fill={
        isActive ? "#14b8a6" : "#e5e7eb"
      }
      style={{
        default: { outline: "none" },
        hover: { outline: "none" },
        pressed: { outline: "none" },
      }}
    />
  );
});
8. VISUAL DESIGN RULES
Colors
Active Governorate: #14b8a6
Inactive: #e5e7eb
Borders: #ffffff
Background: #ffffff
Typography
Font: Inter
Style: Clean enterprise dashboard
9. FINAL UI BEHAVIOR
MAP SHOULD SHOW ONLY:

✔ Yemen outline
✔ Governorates
✔ Highlighted target governorates

MAP SHOULD NOT SHOW:

❌ Projects
❌ Tooltips
❌ KPIs
❌ Selection UI
❌ Filters

10. PORTFOLIO PERFORMANCE MOVES ALL DATA

All of this must be moved OUT of map:

project list
budgets
spent
utilization
progress bars

Map becomes PURE geographic intelligence.

11. PERFORMANCE REQUIREMENTS

Must support:

500+ projects
100+ governorates
multiple donors
real-time updates

Use:

useMemo()
Map caching
pre-aggregated tRPC responses
12. FUTURE EXTENSION READY

System must support:

Country
 → Governorate
   → District
     → Village

Without redesigning frontend.

13. FINAL RESULT

You will end with a system where:

Portfolio Performance
financial + operational intelligence
Humanitarian Footprint Map
geographic intelligence ONLY
Executive Dashboard
clean separation of concerns