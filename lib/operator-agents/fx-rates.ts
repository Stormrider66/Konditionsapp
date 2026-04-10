/**
 * Foreign Exchange Rate Configuration
 *
 * Used by the Cost Guardian to convert pricing from SEK (the platform's
 * primary currency) to USD (the Anthropic API's billing currency) when
 * calculating gross margin.
 *
 * Rates are configurable via env vars so they can be updated without a
 * code deploy when FX moves significantly.
 *
 * Env vars:
 * - FX_SEK_TO_USD: SEK per 1 USD (default: 10.5)
 *
 * For a more accurate system, this could pull from a live FX API
 * (e.g. exchangerate.host, openexchangerates.org), but for monthly
 * reporting a manually-updated env var is sufficient.
 */

import { logger } from '@/lib/logger'

const DEFAULT_SEK_PER_USD = 10.5

/**
 * Get the current SEK → USD conversion rate.
 * Returns: "1 USD = N SEK" (i.e. divide SEK amounts by this to get USD).
 */
export function getSekPerUsd(): number {
  const envValue = process.env.FX_SEK_TO_USD
  if (!envValue) return DEFAULT_SEK_PER_USD

  const parsed = parseFloat(envValue)
  if (isNaN(parsed) || parsed <= 0) {
    logger.warn('[fx-rates] FX_SEK_TO_USD is invalid, using default', {
      envValue,
      default: DEFAULT_SEK_PER_USD,
    })
    return DEFAULT_SEK_PER_USD
  }

  return parsed
}

/**
 * Convert a SEK amount to USD.
 */
export function sekToUsd(sekAmount: number): number {
  return sekAmount / getSekPerUsd()
}

/**
 * Convert a USD amount to SEK.
 */
export function usdToSek(usdAmount: number): number {
  return usdAmount * getSekPerUsd()
}
