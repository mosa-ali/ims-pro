/**
 * server/engines/FXGainLossEngine.ts
 *
 * FX Gain/Loss Engine
 * Handles foreign exchange gain/loss tracking, realized/unrealized gains, and FX exposure analysis.
 *
 * Responsibilities:
 * - Track realized FX gains and losses
 * - Calculate unrealized FX gains and losses
 * - Manage FX exposure by currency
 * - Generate FX impact reports
 * - Calculate effective exchange rates
 * - Forecast FX impact on cash flows
 */

import { and, eq, sum, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import type { DB } from '../db/_scope';
import {
  payments,
  financeExpenditures,
  journalEntries,
  financeExchangeRates,
  procurementPayables,
  procurementInvoices,
} from '../../drizzle/schema';
import { getDb } from '../db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FXTransaction {
  transactionId: number;
  transactionDate: string;
  originalCurrency: string;
  originalAmount: number;
  baseCurrency: string;
  baseAmount: number;
  exchangeRate: number;
  transactionType: 'payment' | 'receipt' | 'accrual' | 'settlement';
}

export interface RealizedFXGainLoss {
  transactionId: number;
  transactionDate: string;
  currency: string;
  originalAmount: number;
  settlementAmount: number;
  exchangeRateAtTransaction: number;
  exchangeRateAtSettlement: number;
  gainLoss: number;
  gainLossPercentage: number;
  gainLossType: 'gain' | 'loss';
}

export interface UnrealizedFXGainLoss {
  currency: string;
  outstandingAmount: number;
  exchangeRateAtTransaction: number;
  currentExchangeRate: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercentage: number;
  gainLossType: 'gain' | 'loss';
}

export interface FXExposure {
  currency: string;
  totalExposure: number;
  realizedGainLoss: number;
  unrealizedGainLoss: number;
  netGainLoss: number;
  exposurePercentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FXImpactReport {
  reportDate: string;
  totalRealizedGainLoss: number;
  totalUnrealizedGainLoss: number;
  netFXImpact: number;
  exposureByCurrency: FXExposure[];
  topGainCurrencies: FXExposure[];
  topLossCurrencies: FXExposure[];
}

export interface EffectiveExchangeRate {
  currency: string;
  totalAmount: number;
  totalBaseAmount: number;
  effectiveRate: number;
  transactionCount: number;
}

// ── FX Gain/Loss Engine ──────────────────────────────────────────────────────

export class FXGainLossEngine {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Track realized FX gains and losses.
   */
  async getRealizedFXGainLoss(
    organizationId: number,
    startDate: string,
    endDate: string
  ): Promise<RealizedFXGainLoss[]> {
    const realizedGainLosses: RealizedFXGainLoss[] = [];

    // Get settled payments with FX impact
    const settledPayments = await this.db
      .select({
        id: payments.id,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          eq(payments.status, 'paid'),
          gte(payments.paymentDate, startDate),
          lte(payments.paymentDate, endDate)
        )
      );

    // Calculate realized gains/losses for each payment
    for (const payment of settledPayments) {
      const amount = Number(payment.amount) || 0;
      const exchangeRateAtTransaction = 1.0; // TODO: Get from financeExchangeRates
      const exchangeRateAtSettlement = 1.0; // TODO: Get from financeExchangeRates

      const gainLoss = amount * (exchangeRateAtSettlement - exchangeRateAtTransaction);
      const gainLossPercentage =
        ((exchangeRateAtSettlement - exchangeRateAtTransaction) / exchangeRateAtTransaction) * 100;

      realizedGainLosses.push({
        transactionId: payment.id,
        transactionDate: payment.paymentDate,
        currency: 'USD', // TODO: Get actual currency from payment
        originalAmount: amount,
        settlementAmount: amount * exchangeRateAtSettlement,
        exchangeRateAtTransaction,
        exchangeRateAtSettlement,
        gainLoss,
        gainLossPercentage,
        gainLossType: gainLoss >= 0 ? 'gain' : 'loss',
      });
    }

    return realizedGainLosses;
  }

  /**
   * Calculate unrealized FX gains and losses.
   */
  async getUnrealizedFXGainLoss(
    organizationId: number,
    asOfDate: string
  ): Promise<UnrealizedFXGainLoss[]> {
    const unrealizedGainLosses: UnrealizedFXGainLoss[] = [];

    // Get outstanding payables in foreign currencies
    const outstandingPayables = await this.db
      .select({
        id: procurementPayables.id,
        amount: procurementPayables.totalAmount,
        currency: procurementPayables.currency,
        createdAt: procurementPayables.createdAt,
      })
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.organizationId, organizationId),
          eq(procurementPayables.status, 'pending_invoice'),
          lte(procurementPayables.createdAt, asOfDate)
        )
      );

    // Calculate unrealized gains/losses for each payable
    for (const payable of outstandingPayables) {
      const amount = Number(payable.amount) || 0;
      const currency = payable.currency || 'USD';
      const exchangeRateAtTransaction = 1.0; // TODO: Get from financeExchangeRates
      const currentExchangeRate = 1.0; // TODO: Get current rate

      const unrealizedGainLoss = amount * (currentExchangeRate - exchangeRateAtTransaction);
      const unrealizedGainLossPercentage =
        ((currentExchangeRate - exchangeRateAtTransaction) / exchangeRateAtTransaction) * 100;

      unrealizedGainLosses.push({
        currency,
        outstandingAmount: amount,
        exchangeRateAtTransaction,
        currentExchangeRate,
        unrealizedGainLoss,
        unrealizedGainLossPercentage,
        gainLossType: unrealizedGainLoss >= 0 ? 'gain' : 'loss',
      });
    }

    return unrealizedGainLosses;
  }

  /**
   * Get FX exposure by currency.
   */
  async getFXExposure(organizationId: number, asOfDate: string): Promise<FXExposure[]> {
    const exposures: FXExposure[] = [];

    const realized = await this.getRealizedFXGainLoss(organizationId, '2020-01-01', asOfDate);
    const unrealized = await this.getUnrealizedFXGainLoss(organizationId, asOfDate);

    // Aggregate by currency
    const currencyMap = new Map<string, FXExposure>();

    for (const item of realized) {
      if (!currencyMap.has(item.currency)) {
        currencyMap.set(item.currency, {
          currency: item.currency,
          totalExposure: 0,
          realizedGainLoss: 0,
          unrealizedGainLoss: 0,
          netGainLoss: 0,
          exposurePercentage: 0,
          riskLevel: 'low',
        });
      }
      const exposure = currencyMap.get(item.currency)!;
      exposure.realizedGainLoss += item.gainLoss;
    }

    for (const item of unrealized) {
      if (!currencyMap.has(item.currency)) {
        currencyMap.set(item.currency, {
          currency: item.currency,
          totalExposure: 0,
          realizedGainLoss: 0,
          unrealizedGainLoss: 0,
          netGainLoss: 0,
          exposurePercentage: 0,
          riskLevel: 'low',
        });
      }
      const exposure = currencyMap.get(item.currency)!;
      exposure.totalExposure += item.outstandingAmount;
      exposure.unrealizedGainLoss += item.unrealizedGainLoss;
    }

    // Calculate net and risk level
    for (const exposure of currencyMap.values()) {
      exposure.netGainLoss = exposure.realizedGainLoss + exposure.unrealizedGainLoss;
      exposure.exposurePercentage = exposure.totalExposure > 0 ? 100 : 0;

      if (Math.abs(exposure.netGainLoss) > exposure.totalExposure * 0.1) {
        exposure.riskLevel = 'high';
      } else if (Math.abs(exposure.netGainLoss) > exposure.totalExposure * 0.05) {
        exposure.riskLevel = 'medium';
      } else {
        exposure.riskLevel = 'low';
      }

      exposures.push(exposure);
    }

    return exposures;
  }

  /**
   * Generate FX impact report.
   */
  async generateFXImpactReport(
    organizationId: number,
    asOfDate: string
  ): Promise<FXImpactReport> {
    const realized = await this.getRealizedFXGainLoss(organizationId, '2020-01-01', asOfDate);
    const unrealized = await this.getUnrealizedFXGainLoss(organizationId, asOfDate);
    const exposures = await this.getFXExposure(organizationId, asOfDate);

    const totalRealizedGainLoss = realized.reduce((sum, item) => sum + item.gainLoss, 0);
    const totalUnrealizedGainLoss = unrealized.reduce((sum, item) => sum + item.unrealizedGainLoss, 0);
    const netFXImpact = totalRealizedGainLoss + totalUnrealizedGainLoss;

    const topGainCurrencies = exposures
      .filter((e) => e.netGainLoss > 0)
      .sort((a, b) => b.netGainLoss - a.netGainLoss)
      .slice(0, 5);

    const topLossCurrencies = exposures
      .filter((e) => e.netGainLoss < 0)
      .sort((a, b) => a.netGainLoss - b.netGainLoss)
      .slice(0, 5);

    return {
    reportDate: asOfDate,
    totalRealizedGainLoss,
    totalUnrealizedGainLoss,
    netFXImpact,
    exposureByCurrency: exposures,
    topGainCurrencies,
    topLossCurrencies,
    };
  }

  /**
   * Calculate effective exchange rate for a currency.
   */
  async calculateEffectiveExchangeRate(
    organizationId: number,
    currency: string,
    startDate: string,
    endDate: string
  ): Promise<EffectiveExchangeRate> {
    const transactions = await this.db
      .select({
        amount: payments.amount,
      })
      .from(payments)
      .where(
        and(
          eq(payments.organizationId, organizationId),
          gte(payments.paymentDate, startDate),
          lte(payments.paymentDate, endDate)
        )
      );

    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalBaseAmount = totalAmount; // TODO: Convert to base currency

    const effectiveRate = totalAmount > 0 ? totalBaseAmount / totalAmount : 1.0;

    return {
      currency,
      totalAmount,
      totalBaseAmount,
      effectiveRate,
      transactionCount: transactions.length,
    };
  }

  /**
   * Forecast FX impact on cash flows.
   */
  async forecastFXImpact(
    organizationId: number,
    forecastMonths: number = 12
  ): Promise<Array<{ month: string; projectedGainLoss: number; confidence: number }>> {
    const forecast: Array<{ month: string; projectedGainLoss: number; confidence: number }> = [];

    // TODO: Implement actual forecasting based on historical volatility and exposure
    for (let i = 0; i < forecastMonths; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthStr = date.toISOString().split('T')[0];

      forecast.push({
        month: monthStr,
        projectedGainLoss: Math.random() * 10000 - 5000,
        confidence: 0.7 + Math.random() * 0.2,
      });
    }

    return forecast;
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

let fxGainLossEngineInstance: FXGainLossEngine | null = null;

export async function getFXGainLossEngine(): Promise<FXGainLossEngine> {
  if (!fxGainLossEngineInstance) {
    const db = await getDb();
    fxGainLossEngineInstance = new FXGainLossEngine(db);
  }
  return fxGainLossEngineInstance;
}

export const fxGainLossEngine = {
  getRealizedFXGainLoss: async (organizationId: number, startDate: string, endDate: string) => {
    const engine = await getFXGainLossEngine();
    return engine.getRealizedFXGainLoss(organizationId, startDate, endDate);
  },
  getUnrealizedFXGainLoss: async (organizationId: number, asOfDate: string) => {
    const engine = await getFXGainLossEngine();
    return engine.getUnrealizedFXGainLoss(organizationId, asOfDate);
  },
  getFXExposure: async (organizationId: number, asOfDate: string) => {
    const engine = await getFXGainLossEngine();
    return engine.getFXExposure(organizationId, asOfDate);
  },
  generateFXImpactReport: async (organizationId: number, asOfDate: string) => {
    const engine = await getFXGainLossEngine();
    return engine.generateFXImpactReport(organizationId, asOfDate);
  },
  calculateEffectiveExchangeRate: async (
    organizationId: number,
    currency: string,
    startDate: string,
    endDate: string
  ) => {
    const engine = await getFXGainLossEngine();
    return engine.calculateEffectiveExchangeRate(organizationId, currency, startDate, endDate);
  },
  forecastFXImpact: async (organizationId: number, forecastMonths?: number) => {
    const engine = await getFXGainLossEngine();
    return engine.forecastFXImpact(organizationId, forecastMonths);
  },
};
