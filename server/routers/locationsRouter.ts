/**
 * locationsRouter.ts
 * Geographic hierarchy API for ERP system
 */

import { z } from "zod";
import { eq, sql, and } from "drizzle-orm";
import { router, scopedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";


// Tables
import {
  countries,
  governorates,
  districts
} from "../../drizzle/schema";

/**
 * Locations Router
 * Centralized geographic data for ERP modules
 */
export const locationsRouter = router({
  /**
   * GET ALL COUNTRIES
   * Used for top-level dropdown
   */
  getCountries: publicProcedure.query(async () => {
    const db = await getDb();

    const result = await db
      .select({
        id: countries.id,
        name: countries.name,
        })
      .from(countries)
      .orderBy(countries.name);

    return result;
  }),

  /**
   * GET COUNTRY BY ID
   */
  getCountryById: publicProcedure
    .input(z.object({ countryId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();

      const result = await db
        .select()
        .from(countries)
        .where(eq(countries.id, input.countryId))
        .limit(1);

      return result[0] ?? null;
    }),

  /**
   * GET GOVERNORATES BY COUNTRY
   * Dependent dropdown
   */
  getGovernoratesByCountry: publicProcedure
    .input(
      z.object({
        countryId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const result = await db
        .select({
          id: governorates.id,
          name: governorates.name,
          latitude: governorates.latitude,
          longitude: governorates.longitude,
        })
        .from(governorates)
        .where(eq(governorates.countryId, input.countryId))
        .orderBy(governorates.name);

      return result;
    }),

  /**
   * GET GOVERNORATE BY ID
   */
  getGovernorateById: publicProcedure
    .input(z.object({ governorateId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();

      const result = await db
        .select()
        .from(governorates)
        .where(eq(governorates.id, input.governorateId))
        .limit(1);

      return result[0] ?? null;
    }),

  /**
   * GET DISTRICTS BY GOVERNORATE
   * (Manual entry support, optional structured layer)
   */
  getDistrictsByGovernorate: publicProcedure
    .input(
      z.object({
        governorateId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const result = await db
        .select({
          id: districts.id,
          name: districts.name,
        })
        .from(districts)
        .where(eq(districts.governorateId, input.governorateId))
        .orderBy(districts.name);

      return result;
    }),

  /**
   * SEARCH LOCATIONS (future use)
   * Useful for autocomplete search in ERP
   */
  searchLocations: publicProcedure
    .input(
      z.object({
        query: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      const q = `%${input.query}%`;

      const countriesResult = await db
        .select({
            id: countries.id,
            name: countries.name,
            })
        .from(countries)
        .where(sql`${countries.name} LIKE ${q}`)
        .limit(10);

      const governoratesResult = await db
        .select({
            id: governorates.id,
            name: governorates.name,
            })
        .from(governorates)
        .where(sql`${governorates.name} LIKE ${q}`)
        .limit(10);

      return [...countriesResult, ...governoratesResult];
    }),
});