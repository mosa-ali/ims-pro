/**
 * server/currency/currencyConversionOrg.ts  ← MUST live in server/currency/
 *
 * Organization-scoped currency conversion helpers.
 *
 * These functions allow conversions that:
 *   - Prefer org-specific rates (if an org has entered custom rates)
 *   - Fall back to system-level InforEuro rates
 *   - Are audit-logged for compliance
 *
 * Usage (backend only — tRPC procedures, server jobs):
 *   import { convertCurrencyForOrg } from './currency/currencyConversionOrg';
 *   const result = await convertCurrencyForOrg(1000, 'USD', 'YER', orgId, auditContext);
 */

import type { ConversionResult, ConversionError } from '../../shared/currency/exchangeRateTypes';

/**
 * Audit context for logging conversion operations.
 * Used for compliance and debugging.
 */
export interface ConversionAuditContext {
  userId: number;
  organizationId: number;
  operatingUnitId?: number;
  action: string; // e.g. "budget_conversion", "payment_conversion"
  metadata?: Record<string, unknown>;
}

/**
 * Convert an amount from one currency to another, respecting org-specific rates.
 *
 * Lookup order:
 *   1. Org-specific rate (if organizationId !== 0)
 *   2. System-level InforEuro rate (organizationId = 0)
 *   3. In-memory cache (if DB lookup fails)
 *   4. Return error if no rate found
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code (e.g. "USD")
 * @param toCurrency - Target currency code (e.g. "YER")
 * @param organizationId - Org ID for rate lookup (0 = system rates only)
 * @param auditContext - Audit logging context
 * @returns ConversionResult | ConversionError
 *
 * @example
 *   const result = await convertCurrencyForOrg(
 *     1000,
 *     'USD',
 *     'YER',
 *     orgId,
 *     { userId, organizationId: orgId, action: 'budget_conversion' }
 *   );
 *   if ('error' in result) {
 *     console.error('Conversion failed:', result.error);
 *   } else {
 *     console.log(`${result.amount} ${result.to} at rate ${result.rate}`);
 *   }
 */
export async function convertCurrencyForOrg(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  organizationId: number,
  auditContext: ConversionAuditContext
): Promise<ConversionResult | ConversionError> {
  // Import DB service (backend only — same directory: server/currency/)
  const { getHistoricalRate } = await import('./exchangeRateService');

  const FROM = fromCurrency.toUpperCase();
  const TO = toCurrency.toUpperCase();

  // Same currency = 1:1
  if (FROM === TO) {
    return {
      amount,
      rate: 1,
      from: FROM,
      to: TO,
      source: 'identity',
    };
  }

  try {
    // Look up the rate (org-specific first, then system)
    const rate = await getHistoricalRate(FROM, TO, undefined, organizationId);

    if (!rate) {
      // Log the failed lookup for audit
      logConversionAudit(
        {
          amount,
          from: FROM,
          to: TO,
          rate: null,
          source: 'not_found',
          organizationId,
        },
        auditContext,
        'failed'
      );

      return {
        error: `No exchange rate found for ${FROM}/${TO}`,
        fromCurrency: FROM,
        toCurrency: TO,
      };
    }

    const converted = amount * rate;

    // Log successful conversion for audit
    logConversionAudit(
      {
        amount,
        from: FROM,
        to: TO,
        rate,
        source: 'org_or_system',
        organizationId,
        converted,
      },
      auditContext,
      'success'
    );

    return {
      amount: converted,
      rate,
      from: FROM,
      to: TO,
      source: 'org_or_system',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    logConversionAudit(
      {
        amount,
        from: FROM,
        to: TO,
        rate: null,
        source: 'error',
        organizationId,
        error: msg,
      },
      auditContext,
      'error'
    );

    return {
      error: `Conversion error: ${msg}`,
      fromCurrency: FROM,
      toCurrency: TO,
    };
  }
}

/**
 * Batch convert multiple amounts for an organization.
 *
 * @param conversions - Array of { amount, from, to }
 * @param organizationId - Org ID for rate lookup
 * @param auditContext - Audit logging context
 * @returns Array of ConversionResult | ConversionError
 */
export async function convertCurrencyBatchForOrg(
  conversions: Array<{ amount: number; from: string; to: string }>,
  organizationId: number,
  auditContext: ConversionAuditContext
): Promise<Array<ConversionResult | ConversionError>> {
  return Promise.all(
    conversions.map((c) =>
      convertCurrencyForOrg(c.amount, c.from, c.to, organizationId, auditContext)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit logging (roadmap for future implementation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log a currency conversion for audit and compliance.
 *
 * ROADMAP:
 *   - Store logs in a `currency_conversion_audit` table
 *   - Include: userId, orgId, ouId, action, amount, from, to, rate, result, timestamp
 *   - Use for compliance reports (e.g. "all conversions for donor X in period Y")
 *   - Support filtering by action, org, user, date range
 *   - Integrate with the global audit log system
 *
 * Current implementation: console logging only (development).
 * Production: replace with DB insert to `currency_conversion_audit` table.
 */
function logConversionAudit(
  data: {
    amount: number;
    from: string;
    to: string;
    rate: number | null;
    source: string;
    organizationId: number;
    converted?: number;
    error?: string;
  },
  context: ConversionAuditContext,
  status: 'success' | 'failed' | 'error'
): void {
  const isDev = process.env.NODE_ENV !== 'production';

  const logEntry = {
    timestamp: new Date().toISOString(),
    status,
    userId: context.userId,
    organizationId: context.organizationId,
    operatingUnitId: context.operatingUnitId,
    action: context.action,
    conversion: data,
    metadata: context.metadata,
  };

  if (isDev) {
    console.log('[CurrencyConversionAudit]', JSON.stringify(logEntry, null, 2));
  } else {
    console.log(JSON.stringify({ level: 'info', service: 'currency-audit', ...logEntry }));
  }

  // TODO: Insert into `currency_conversion_audit` table for production compliance
  // await db.insert(currencyConversionAudit).values({ ...logEntry });
}