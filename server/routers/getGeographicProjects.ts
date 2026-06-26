/**
 * PATCH for executiveDashboardRouter.ts — getGeographicProjects
 *
 * FIX: Derive operatingUnitCountry from operating_units.countryId → countries.name
 * instead of the freetext operating_units.country varchar.
 *
 * IMPORTANT — Drizzle alias fix:
 * The main query already joins `countries` via governorates.countryId.
 * The OU country lookup is kept as a SEPARATE query to avoid the
 * Drizzle table alias conflict that occurs when joining `countries`
 * twice in the same query builder chain.
 *
 * ADD to imports at top of router if not already present:
 *   import { operatingUnits } from "../../drizzle/schema";
 *
 * countries is already imported.
 */
import { scopedProcedure, router } from '../_core/trpc';
import { getDb } from "../db";
import { eq, and, sql, isNull, desc } from "drizzle-orm";
import { projects, grants, projectGovernorates, budgetItems, budgets, expenses, beneficiaries, reportingSchedules, risks, donors, hrEmployees, pipelineOpportunities, countries, governorates, operatingUnits } from "../../drizzle/schema";


getGeographicProjects: scopedProcedure.query(
  async ({ ctx }) => {
    const db = await getDb();
    const { organizationId, operatingUnitId } = ctx.scope;

    // ── 1. Resolve country via countryId → countries.name ─────────────────
    //
    // Kept as a separate query (not joined into the main projects query)
    // to avoid Drizzle alias conflict — the main query also joins `countries`
    // via governorates.countryId, and Drizzle doesn't support joining the
    // same table twice without aliasing.
    //
    // BEFORE: operating_units.country (freetext varchar — unreliable)
    // AFTER:  operating_units.countryId → countries.name (FK — canonical)
    //
    const ouResult = await db
      .select({
        countryName: countries.name,
      })
      .from(operatingUnits)
      .leftJoin(
        countries,
        eq(countries.id, operatingUnits.countryId)
      )
      .where(eq(operatingUnits.id, operatingUnitId))
      .limit(1);

    const operatingUnitCountry = ouResult[0]?.countryName ?? null;

    // ── 2. Fetch projects with governorate joins ───────────────────────────
    const rows = await db
      .select({
        projectId:       projects.id,
        projectCode:     projects.projectCode,
        projectTitle:    projects.titleEn,
        totalBudget:     projects.totalBudget,
        totalSpent:      projects.spent,
        beneficiaries:   projects.beneficiaryCount,
        status:          projects.status,
        governorateId:   governorates.id,
        governorateName: governorates.name,
        // Note: `countries` here refers to governorates.countryId → countries
        // This is a different join context from the OU query above
        projectCountry:  countries.name,
      })
      .from(projects)
      .leftJoin(
        projectGovernorates,
        eq(projectGovernorates.projectId, projects.id)
      )
      .leftJoin(
        governorates,
        eq(governorates.id, projectGovernorates.governorateId)
      )
      .leftJoin(
        countries,
        eq(countries.id, governorates.countryId)
      )
      .where(
        and(
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId),
          eq(projects.isDeleted, 0)
        )
      );

    // ── 3. Group rows by project ──────────────────────────────────────────
    const grouped = new Map<number, any>();

    rows.forEach((row) => {
      if (!grouped.has(row.projectId)) {
        grouped.set(row.projectId, {
          projectId:     row.projectId,
          projectCode:   row.projectCode,
          projectTitle:  row.projectTitle,
          totalBudget:   Number(row.totalBudget ?? 0),
          totalSpent:    Number(row.totalSpent ?? 0),
          beneficiaries: Number(row.beneficiaries ?? 0),
          status:        row.status,
          governorates:  [],
        });
      }

      if (row.governorateId) {
        grouped.get(row.projectId).governorates.push({
          governorateId:   row.governorateId,
          governorateName: row.governorateName,
          country:         row.projectCountry,
        });
      }
    });

    return {
      // Canonical country name from countries table via countryId FK.
      // Matches lowercase keys in countryGeoJsonMap.ts:
      //   "Yemen"    → /maps/yemen-governorates.geojson
      //   "Cambodia" → /maps/cambodia-governorates.geojson
      operatingUnitCountry,
      projects: Array.from(grouped.values()),
    };
  }
)