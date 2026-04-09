/**
 * Exchange Rate Service
 * Fetches real-time exchange rates from exchangerate.host API
 * No authentication required, no rate limits
 */

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date: string;
}

interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: string;
}

const EXCHANGE_RATE_API = "https://api.exchangerate.host";
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Simple in-memory cache for exchange rates
const rateCache = new Map<string, { rate: number; timestamp: number }>();

/**
 * Get exchange rate between two currencies
 * @param fromCurrency - Source currency code (e.g., 'EUR')
 * @param toCurrency - Target currency code (e.g., 'USD')
 * @returns Exchange rate with timestamp
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult> {
  // Same currency returns 1.0
  if (fromCurrency === toCurrency) {
    return {
      fromCurrency,
      toCurrency,
      rate: 1.0,
      timestamp: new Date().toISOString(),
    };
  }

  // Check cache
  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return {
      fromCurrency,
      toCurrency,
      rate: cached.rate,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(
      `${EXCHANGE_RATE_API}/convert?from=${fromCurrency}&to=${toCurrency}`
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      result?: number;
      error?: string;
    };

    if (data.error || !data.result) {
      throw new Error(`Failed to fetch exchange rate: ${data.error}`);
    }

    const rate = data.result;

    // Cache the rate
    rateCache.set(cacheKey, {
      rate,
      timestamp: Date.now(),
    });

    return {
      fromCurrency,
      toCurrency,
      rate,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      `Error fetching exchange rate for ${fromCurrency}/${toCurrency}:`,
      error
    );
    // Return 1.0 as fallback to prevent blocking
    return {
      fromCurrency,
      toCurrency,
      rate: 1.0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Convert amount from one currency to another
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const result = await getExchangeRate(fromCurrency, toCurrency);
  return amount * result.rate;
}

/**
 * Get multiple exchange rates at once
 * @param fromCurrency - Source currency code
 * @param toCurrencies - Array of target currency codes
 * @returns Map of currency codes to exchange rates
 */
export async function getMultipleExchangeRates(
  fromCurrency: string,
  toCurrencies: string[]
): Promise<Record<string, number>> {
  const rates: Record<string, number> = {};

  try {
    const response = await fetch(
      `${EXCHANGE_RATE_API}/latest?base=${fromCurrency}`
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.statusText}`);
    }

    const data = (await response.json()) as ExchangeRateResponse;

    for (const currency of toCurrencies) {
      if (currency === fromCurrency) {
        rates[currency] = 1.0;
      } else if (data.rates[currency]) {
        rates[currency] = data.rates[currency];
      }
    }

    return rates;
  } catch (error) {
    console.error(
      `Error fetching multiple exchange rates from ${fromCurrency}:`,
      error
    );
    // Return 1.0 for all currencies as fallback
    const fallback: Record<string, number> = {};
    for (const currency of toCurrencies) {
      fallback[currency] = 1.0;
    }
    return fallback;
  }
}
