/**
 * Exchange Rates Router
 * Multi-currency exchange rate management with automatic API fetching
 */

import { router, protectedProcedure, scopedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import { financeExchangeRates, financeCurrencies } from '../drizzle/schema';
import { eq, and, desc, sql, isNull, lte, gte, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const exchangeRatesRouter = router({
  // List exchange rates
  list: scopedProcedure
    .input(
      z.object({
        fromCurrencyCode: z.string().optional(),
        toCurrencyCode: z.string().optional(),
        effectiveDate: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(financeExchangeRates.organizationId, organizationId),
        eq(financeExchangeRates.isDeleted, false),
      ];

      if (input.fromCurrencyCode) {
        conditions.push(eq(financeExchangeRates.fromCurrencyCode, input.fromCurrencyCode));
      }
      if (input.toCurrencyCode) {
        conditions.push(eq(financeExchangeRates.toCurrencyCode, input.toCurrencyCode));
      }
      if (input.effectiveDate) {
        const date = new Date(input.effectiveDate);
        conditions.push(lte(financeExchangeRates.effectiveDate, date));
        conditions.push(
          or(
            isNull(financeExchangeRates.expiryDate),
            gte(financeExchangeRates.expiryDate, date)
          )
        );
      }

      const rates = await db
        .select()
        .from(financeExchangeRates)
        .where(and(...conditions))
        .orderBy(desc(financeExchangeRates.effectiveDate))
        .limit(input.limit)
        .offset(input.offset);

      return rates;
    }),

  // Get exchange rate by ID
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rate = await db
        .select()
        .from(financeExchangeRates)
        .where(and(
          eq(financeExchangeRates.id, input.id),
          eq(financeExchangeRates.organizationId, organizationId),
          eq(financeExchangeRates.isDeleted, false)
        ))
        .limit(1);

      if (!rate.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Exchange rate not found' });
      }

      return rate[0];
    }),

  // Get current exchange rate for currency pair
  getCurrentRate: scopedProcedure
    .input(
      z.object({
        fromCurrencyCode: z.string(),
        toCurrencyCode: z.string(),
        asOfDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const date = input.asOfDate ? new Date(input.asOfDate) : new Date();

      const rate = await db
        .select()
        .from(financeExchangeRates)
        .where(
          and(
            eq(financeExchangeRates.organizationId, organizationId),
            eq(financeExchangeRates.fromCurrencyCode, input.fromCurrencyCode),
            eq(financeExchangeRates.toCurrencyCode, input.toCurrencyCode),
            lte(financeExchangeRates.effectiveDate, date),
            or(
              isNull(financeExchangeRates.expiryDate),
              gte(financeExchangeRates.expiryDate, date)
            ),
            eq(financeExchangeRates.isDeleted, false)
          )
        )
        .orderBy(desc(financeExchangeRates.effectiveDate))
        .limit(1);

      if (!rate.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No exchange rate found for ${input.fromCurrencyCode} to ${input.toCurrencyCode}`,
        });
      }

      return rate[0];
    }),

  // Convert amount between currencies
  convert: scopedProcedure
    .input(
      z.object({
        amount: z.number(),
        fromCurrencyCode: z.string(),
        toCurrencyCode: z.string(),
        asOfDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // If same currency, return original amount
      if (input.fromCurrencyCode === input.toCurrencyCode) {
        return {
          originalAmount: input.amount,
          convertedAmount: input.amount,
          rate: 1,
          fromCurrency: input.fromCurrencyCode,
          toCurrency: input.toCurrencyCode,
        };
      }

      const date = input.asOfDate ? new Date(input.asOfDate) : new Date();

      const rate = await db
        .select()
        .from(financeExchangeRates)
        .where(
          and(
            eq(financeExchangeRates.organizationId, organizationId),
            eq(financeExchangeRates.fromCurrencyCode, input.fromCurrencyCode),
            eq(financeExchangeRates.toCurrencyCode, input.toCurrencyCode),
            lte(financeExchangeRates.effectiveDate, date),
            or(
              isNull(financeExchangeRates.expiryDate),
              gte(financeExchangeRates.expiryDate, date)
            ),
            eq(financeExchangeRates.isDeleted, false)
          )
        )
        .orderBy(desc(financeExchangeRates.effectiveDate))
        .limit(1);

      if (!rate.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No exchange rate found for ${input.fromCurrencyCode} to ${input.toCurrencyCode}`,
        });
      }

      const exchangeRate = parseFloat(rate[0].rate);
      const convertedAmount = input.amount * exchangeRate;

      return {
        originalAmount: input.amount,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        rate: exchangeRate,
        fromCurrency: input.fromCurrencyCode,
        toCurrency: input.toCurrencyCode,
        effectiveDate: rate[0].effectiveDate,
      };
    }),

  // Create exchange rate
  create: scopedProcedure
    .input(
      z.object({
        fromCurrencyCode: z.string(),
        toCurrencyCode: z.string(),
        rate: z.string(),
        effectiveDate: z.string(),
        expiryDate: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get currency IDs
      const fromCurrency = await db
        .select()
        .from(financeCurrencies)
        .where(eq(financeCurrencies.code, input.fromCurrencyCode))
        .limit(1);

      const toCurrency = await db
        .select()
        .from(financeCurrencies)
        .where(eq(financeCurrencies.code, input.toCurrencyCode))
        .limit(1);

      if (!fromCurrency.length || !toCurrency.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid currency code' });
      }

      const [result] = await db.insert(financeExchangeRates).values({
        organizationId,
        fromCurrencyId: fromCurrency[0].id,
        fromCurrencyCode: input.fromCurrencyCode,
        toCurrencyId: toCurrency[0].id,
        toCurrencyCode: input.toCurrencyCode,
        rate: input.rate,
        effectiveDate: new Date(input.effectiveDate),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        source: input.source || 'manual',
        notes: input.notes || null,
        createdBy: ctx.user?.id,
      });

      return { id: Number(result.insertId), success: true };
    }),

  // Update exchange rate
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        rate: z.string().optional(),
        effectiveDate: z.string().optional(),
        expiryDate: z.string().nullable().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, effectiveDate, expiryDate, ...rest } = input;
      const updateData: any = { ...rest };

      if (effectiveDate) {
        updateData.effectiveDate = new Date(effectiveDate);
      }
      if (expiryDate !== undefined) {
        updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
      }

      await db
        .update(financeExchangeRates)
        .set(updateData)
        .where(and(
          eq(financeExchangeRates.id, id),
          eq(financeExchangeRates.organizationId, organizationId)
        ));

      return { success: true };
    }),

  // Delete exchange rate (soft delete)
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(financeExchangeRates)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(financeExchangeRates.id, input.id),
          eq(financeExchangeRates.organizationId, organizationId)
        ));

      return { success: true };
    }),

  // Fetch latest rates from external API (exchangerate-api.com - free tier)
  fetchLatestRates: scopedProcedure
    .input(
      z.object({
        baseCurrency: z.string().default('USD'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Fetch from exchangerate-api.com (free tier, no API key required)
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${input.baseCurrency}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch exchange rates from API');
        }

        const data = await response.json();
        const rates = data.rates;
        const effectiveDate = new Date(data.date);

        // Get all currencies in the system
        const currencies = await db
          .select()
          .from(financeCurrencies)
          .where(eq(financeCurrencies.organizationId, organizationId));

        let insertedCount = 0;

        // Insert rates for each currency pair
        for (const currency of currencies) {
          if (currency.code === input.baseCurrency) continue;
          if (!rates[currency.code]) continue;

          // Check if rate already exists for this date
          const existing = await db
            .select()
            .from(financeExchangeRates)
            .where(
              and(
                eq(financeExchangeRates.organizationId, organizationId),
                eq(financeExchangeRates.fromCurrencyCode, input.baseCurrency),
                eq(financeExchangeRates.toCurrencyCode, currency.code),
                eq(financeExchangeRates.effectiveDate, effectiveDate),
                eq(financeExchangeRates.isDeleted, false)
              )
            )
            .limit(1);

          if (existing.length > 0) continue;

          // Get base currency ID
          const baseCurrency = await db
            .select()
            .from(financeCurrencies)
            .where(eq(financeCurrencies.code, input.baseCurrency))
            .limit(1);

          if (!baseCurrency.length) continue;

          await db.insert(financeExchangeRates).values({
            organizationId,
            fromCurrencyId: baseCurrency[0].id,
            fromCurrencyCode: input.baseCurrency,
            toCurrencyId: currency.id,
            toCurrencyCode: currency.code,
            rate: rates[currency.code].toString(),
            effectiveDate,
            expiryDate: null,
            source: 'exchangerate-api.com',
            notes: 'Auto-fetched from external API',
            createdBy: ctx.user?.id,
          });

          insertedCount++;
        }

        return {
          success: true,
          insertedCount,
          effectiveDate: effectiveDate.toISOString().split('T')[0],
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch exchange rates: ${error.message}`,
        });
      }
    }),

  // Get real-time exchange rate from external API
  getRealtimeRate: protectedProcedure
    .input(
      z.object({
        fromCurrency: z.string(),
        toCurrency: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { getExchangeRate } = await import('./exchangeRateService');
        const result = await getExchangeRate(input.fromCurrency, input.toCurrency);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch real-time exchange rate: ${error.message}`,
        });
      }
    }),

  // List available currencies
  listCurrencies: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const currencies = await db
        .select()
        .from(financeCurrencies)
        .where(eq(financeCurrencies.organizationId, organizationId))
        .orderBy(financeCurrencies.code);

      return currencies;
    }),
});
