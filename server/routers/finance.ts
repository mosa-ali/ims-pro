import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { financeCurrencies } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const financeRouter = router({
  /**
   * Get list of active currencies for dropdowns
   * Filters by organization scope and isActive = true
   * Returns currencies sorted by code for easy selection
   */
  currencies: router({
    list: publicProcedure
      .input(
        z.object({
          includeInactive: z.boolean().optional().default(false),
        })
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        
        // Currencies are global - no organization filtering
        // All organizations have access to all 128 ISO 4217 currencies

        // Always filter by active status, unless includeInactive is true
        const whereConditions = input.includeInactive 
          ? [] 
          : [eq(financeCurrencies.isActive, 1)];

        const currencies = await db
          .select()
          .from(financeCurrencies)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .orderBy(financeCurrencies.code);

        return currencies.map((currency) => ({
          id: currency.id,
          code: currency.code,
          name: currency.name,
          nameAr: currency.nameAr,
          symbol: currency.symbol,
          exchangeRateToUsd: Number(currency.exchangeRate),
          isBaseCurrency: currency.isBaseCurrency === 1,
          isActive: currency.isActive === 1,
          decimalPlaces: currency.decimalPlaces || 2,
        }));
      }),

    /**
     * Get a specific currency by code
     * Global access - all organizations can access all currencies
     */
    getByCode: protectedProcedure
      .input(z.object({ code: z.string().length(3) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();

        const currency = await db
          .select()
          .from(financeCurrencies)
          .where(
            and(
              eq(financeCurrencies.code, input.code),
              eq(financeCurrencies.isActive, 1)
            )
          )
          .limit(1);

        if (!currency.length) {
          return null;
        }

        const c = currency[0];
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          nameAr: c.nameAr,
          symbol: c.symbol,
          exchangeRateToUsd: Number(c.exchangeRate),
          isBaseCurrency: c.isBaseCurrency === 1,
          isActive: c.isActive === 1,
          decimalPlaces: c.decimalPlaces || 2,
        };
      }),

    /**
     * Get base currency (usually USD)
     * Global access - all organizations use the same base currency
     */
    getBaseCurrency: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();

      const baseCurrency = await db
        .select()
        .from(financeCurrencies)
        .where(
          and(
            eq(financeCurrencies.isBaseCurrency, 1),
            eq(financeCurrencies.isActive, 1)
          )
        )
        .limit(1);

      if (!baseCurrency.length) {
        // Fallback to USD if no base currency is set
        const usd = await db
          .select()
          .from(financeCurrencies)
          .where(
            and(
              eq(financeCurrencies.code, "USD"),
              eq(financeCurrencies.isActive, 1)
            )
          )
          .limit(1);

        if (!usd.length) {
          return null;
        }

        const c = usd[0];
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          nameAr: c.nameAr,
          symbol: c.symbol,
          exchangeRateToUsd: Number(c.exchangeRate),
          isBaseCurrency: c.isBaseCurrency === 1,
          isActive: c.isActive === 1,
          decimalPlaces: c.decimalPlaces || 2,
        };
      }

      const c = baseCurrency[0];
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        nameAr: c.nameAr,
        symbol: c.symbol,
        exchangeRateToUsd: Number(c.exchangeRate),
        isBaseCurrency: c.isBaseCurrency === 1,
        isActive: c.isActive === 1,
        decimalPlaces: c.decimalPlaces || 2,
      };
    }),
  }),
});
