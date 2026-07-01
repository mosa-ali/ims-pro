/**
 * server/routers/multiCurrencyRouter.ts
 *
 * Multi-Currency Router
 * Exposes Multi-Currency Engine via tRPC procedures.
 */

import { router, protectedProcedure, scopedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getCurrencyEngine } from '../engines/finance/CurrencyEngine';

// ── Input Schemas ────────────────────────────────────────────────────────────

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CurrencyConversionRequestSchema = z.object({
  amount: z.number().positive(),
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  conversionDate: DateSchema,
  context: z.enum(['base', 'organization', 'operatingUnit', 'project', 'donor']).optional(),
});

// ── Multi-Currency Router ────────────────────────────────────────────────────

export const multiCurrencyRouter = router({
  /**
   * Get currency hierarchy
   */
  getCurrencyHierarchy: scopedProcedure.query(async ({ ctx }) => {
    const engine = getCurrencyEngine();
    return engine.getCurrencyHierarchy(ctx.user.organizationId, 1); // TODO: Get actual OU ID
  }),

  /**
   * Get exchange rate
   */
  getExchangeRate: scopedProcedure
    .input(
      z.object({
        fromCurrency: z.string().length(3),
        toCurrency: z.string().length(3),
        asOfDate: DateSchema,
      })
    )
    .query(async ({ input }) => {
      const engine = getCurrencyEngine();
      return engine.getExchangeRate(input.fromCurrency, input.toCurrency, input.asOfDate);
    }),

  /**
   * Convert currency
   */
  convertCurrency: scopedProcedure
    .input(CurrencyConversionRequestSchema)
    .query(async ({ input }) => {
      const engine = getCurrencyEngine();
      return engine.convertCurrency(input);
    }),

  /**
   * Convert to base currency
   */
  convertToBaseCurrency: scopedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        fromCurrency: z.string().length(3),
        asOfDate: DateSchema,
      })
    )
    .query(async ({ input }) => {
      const engine = getCurrencyEngine();
      return engine.convertToBaseCurrency(input.amount, input.fromCurrency, input.asOfDate);
    }),

  /**
   * Convert from base currency
   */
  convertFromBaseCurrency: scopedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        toCurrency: z.string().length(3),
        asOfDate: DateSchema,
      })
    )
    .query(async ({ input }) => {
      const engine = getCurrencyEngine();
      return engine.convertFromBaseCurrency(input.amount, input.toCurrency, input.asOfDate);
    }),

  /**
   * Set currency context
   */
  setCurrencyContext: scopedProcedure
    .input(
      z.object({
        contextType: z.enum(['base', 'organization', 'operatingUnit', 'project', 'donor']),
        contextId: z.number(),
        currency: z.string().length(3),
        allowedCurrencies: z.array(z.string().length(3)),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const engine = getCurrencyEngine();
      return engine.setCurrencyContext(
        ctx.user.organizationId,
        input.contextType,
        input.contextId,
        input.currency,
        input.allowedCurrencies
      );
    }),

  /**
   * Get currency context
   */
  getCurrencyContext: scopedProcedure
    .input(
      z.object({
        contextType: z.enum(['base', 'organization', 'operatingUnit', 'project', 'donor']),
        contextId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const engine = getCurrencyEngine();
      return engine.getCurrencyContext(ctx.user.organizationId, input.contextType, input.contextId);
    }),

  /**
   * Validate currency compatibility
   */
  validateCurrencyCompatibility: scopedProcedure
    .input(
      z.object({
        fromCurrency: z.string().length(3),
        toCurrency: z.string().length(3),
      })
    )
    .query(async ({ input, ctx }) => {
      const engine = getCurrencyEngine();
      return engine.validateCurrencyCompatibility(
        input.fromCurrency,
        input.toCurrency,
        ctx.user.organizationId
      );
    }),

  /**
   * Get effective exchange rate
   */
  getEffectiveExchangeRate: scopedProcedure
    .input(
      z.object({
        fromCurrency: z.string().length(3),
        toCurrency: z.string().length(3),
        startDate: DateSchema,
        endDate: DateSchema,
      })
    )
    .query(async ({ input }) => {
      const engine = getCurrencyEngine();
      return engine.getEffectiveExchangeRate(
        input.fromCurrency,
        input.toCurrency,
        input.startDate,
        input.endDate
      );
    }),

  /**
   * Generate conversion report
   */
  generateConversionReport: scopedProcedure
    .input(
      z.object({
        startDate: DateSchema,
        endDate: DateSchema,
      })
    )
    .query(async ({ input, ctx }) => {
      const engine = getCurrencyEngine();
      return engine.generateConversionReport(ctx.user.organizationId, input.startDate, input.endDate);
    }),

  /**
   * Reconcile to base currency
   */
  reconcileToBaseCurrency: scopedProcedure
    .input(
      z.object({
        amounts: z.array(
          z.object({
            amount: z.number(),
            currency: z.string().length(3),
            date: DateSchema,
          })
        ),
        asOfDate: DateSchema,
      })
    )
    .query(async ({ input }) => {
      const engine = getCurrencyEngine();
      return engine.reconcileToBaseCurrency(input.amounts, input.asOfDate);
    }),
});
