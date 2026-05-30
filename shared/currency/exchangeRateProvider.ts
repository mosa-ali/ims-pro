/**
 * shared/currency/exchangeRateProvider.ts
 *
 * Responsible for:
 *   - Fetching exchange rate data from InforEuro (European Commission)
 *   - Parsing and normalising raw API rows
 *   - Validating individual rates before they enter the system
 *
 * InforEuro endpoint:
 *   https://commission.europa.eu/funding-and-tenders/procedures-guidelines-tenders/
 *   information-contractors-and-beneficiaries/exchange-rate-inforeuro_en
 *
 * The JSON API returns EUR-based rates: 1 EUR = X <currency>.
 * All rates are normalised to this convention internally.
 */

import type {
  InforEuroRateRow,
  NormalisedRate,
  RateValidationResult,
} from './exchangeRateTypes';
import { MAX_FLUCTUATION_PERCENT, MIN_VALID_RATE } from './exchangeRateTypes';

// ─────────────────────────────────────────────────────────────────────────────
// InforEuro API configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * InforEuro publishes a JSON endpoint for the current month's rates.
 * The URL pattern is stable; the month is embedded in the response, not the URL.
 */
const INFOREURO_API_URL =
  'https://commission.europa.eu/api/inforeuro/rates/current?lang=en&format=json';

const FETCH_TIMEOUT_MS = 15_000;

// ─────────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the current month's rates from InforEuro.
 * Returns raw rows exactly as the API provides them.
 * Throws on network failure or non-200 response.
 */
export async function fetchInforEuroRates(): Promise<InforEuroRateRow[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(INFOREURO_API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(
      `InforEuro API returned HTTP ${response.status}: ${response.statusText}`
    );
  }

  // The API returns an array of objects.
  // Actual field names as of 2025: isoCode, currencyName, value, refMonth
  const raw: unknown = await response.json();

  if (!Array.isArray(raw)) {
    throw new Error('InforEuro API response is not an array');
  }

  return raw as InforEuroRateRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a single rate value.
 * Rejects zero, negative, and abnormally large fluctuations.
 *
 * @param rate       The new rate to validate
 * @param prevRate   The previous known rate for this currency (optional)
 */
export function validateRate(
  rate: number,
  prevRate?: number
): RateValidationResult {
  if (!isFinite(rate) || rate < MIN_VALID_RATE) {
    return { valid: false, reason: `Rate ${rate} is zero, negative, or non-finite` };
  }

  if (prevRate !== undefined && prevRate > 0) {
    const fluctuation = Math.abs((rate - prevRate) / prevRate) * 100;
    if (fluctuation > MAX_FLUCTUATION_PERCENT) {
      return {
        valid: false,
        reason: `Rate fluctuation ${fluctuation.toFixed(1)}% exceeds maximum ${MAX_FLUCTUATION_PERCENT}%`,
      };
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a raw InforEuro row into the system's NormalisedRate shape.
 * Base is always EUR; rate = units of quoteCurrency per 1 EUR.
 */
export function normaliseRow(
  row: InforEuroRateRow,
  fetchedAt: number
): NormalisedRate {
  // InforEuro refMonth format: "MM/YYYY" → convert to ISO "YYYY-MM-01"
  const effectiveDate = parseRefMonth(row.refMonth);

  return {
    baseCurrency: 'EUR',
    quoteCurrency: row.isoCode.trim().toUpperCase(),
    rate: row.value,
    effectiveDate,
    source: 'inforeuro',
    fetchedAt,
  };
}

/**
 * Parse InforEuro refMonth "MM/YYYY" → ISO date "YYYY-MM-01"
 */
function parseRefMonth(refMonth: string): string {
  const parts = refMonth.split('/');
  if (parts.length === 2) {
    const [mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-01`;
  }
  // Fallback: first day of current month
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk fetch + normalise
// ─────────────────────────────────────────────────────────────────────────────

export interface FetchResult {
  rates: NormalisedRate[];
  refMonth: string;
  fetchedAt: number;
  errors: string[];
}

/**
 * Fetch, validate, and normalise all InforEuro rates in one call.
 * Invalid rows are skipped and logged in `errors`.
 */
export async function fetchAndNormaliseRates(
  previousRates?: Map<string, NormalisedRate>
): Promise<FetchResult> {
  const fetchedAt = Date.now();
  const rows = await fetchInforEuroRates();

  const rates: NormalisedRate[] = [];
  const errors: string[] = [];
  let refMonth = '';

  for (const row of rows) {
    if (!row.isoCode || typeof row.value !== 'number') {
      errors.push(`Skipped malformed row: ${JSON.stringify(row)}`);
      continue;
    }

    const code = row.isoCode.trim().toUpperCase();
    const prevRate = previousRates?.get(code)?.rate;
    const validation = validateRate(row.value, prevRate);

    if (!validation.valid) {
      errors.push(`Skipped ${code}: ${validation.reason}`);
      continue;
    }

    rates.push(normaliseRow(row, fetchedAt));
    if (!refMonth && row.refMonth) refMonth = row.refMonth;
  }

  return { rates, refMonth, fetchedAt, errors };
}
