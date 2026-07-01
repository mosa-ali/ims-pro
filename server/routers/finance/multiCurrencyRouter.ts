/**
 * server/routers/multiCurrencyRouter.ts
 *
 * Multi-Currency Router
 * Exposes Multi-Currency Engine via tRPC procedures.
 */

import { router, protectedProcedure, scopedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getMultiCurrencyEngine } from '../../engines/MultiCurrencyEngine';

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
    const engine = await getMultiCurrencyEngine();
    return engine.getCurrencyHierarchy(ctx.scope.organizationId, 1); // TODO: Get actual OU ID
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
      const engine = await getMultiCurrencyEngine();
      return engine.getExchangeRate(input.fromCurrency, input.toCurrency, input.asOfDate);
    }),

  /**
   * Convert currency
   */
  convertCurrency: scopedProcedure
    .input(CurrencyConversionRequestSchema)
    .query(async ({ input }) => {
      const engine = await getMultiCurrencyEngine();
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
      const engine = await getMultiCurrencyEngine();
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
      const engine = await getMultiCurrencyEngine();
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
      const engine = await getMultiCurrencyEngine();
      return engine.setCurrencyContext(
        ctx.scope.organizationId,
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
      const engine = await getMultiCurrencyEngine();
      return engine.getCurrencyContext(ctx.scope.organizationId, input.contextType, input.contextId);
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
      const engine = await getMultiCurrencyEngine();
      return engine.validateCurrencyCompatibility(
        input.fromCurrency,
        input.toCurrency,
        ctx.scope.organizationId
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
      const engine = await getMultiCurrencyEngine();
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
      const engine = await getMultiCurrencyEngine();
      return engine.generateConversionReport(ctx.scope.organizationId, input.startDate, input.endDate);
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
      const engine = await getMultiCurrencyEngine();
      return engine.reconcileToBaseCurrency(input.amounts, input.asOfDate);
    }),
});
