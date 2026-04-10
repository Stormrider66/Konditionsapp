/**
 * Foreign Exchange Rate Configuration
 *
 * Resolution order for SEK→USD rate:
 * 1. PlatformConfig DB row (updated by fx-refresh cron)
 * 2. FX_SEK_TO_USD env var
 * 3. Hardcoded default (10.5)
 *
 * The fx-refresh cron (weekly) pulls a fresh rate from exchangerate.host
 * (free, no API key) and writes it to PlatformConfig. This way the rate
 * stays current without requiring code deploys.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const DEFAULT_SEK_PER_USD = 10.5
const FX_CONFIG_KEY = 'fx.sek_per_usd'

// In-memory cache to avoid hitting the DB on every call within a request
let cachedRate: { value: number; expiresAt: number } | null = null
const CACHE_TTL_MS = 60_000 // 1 minute

/**
 * Get the current SEK → USD conversion rate.
 * Returns: "1 USD = N SEK" (divide SEK amounts by this to get USD).
 *
 * Checks PlatformConfig first, then FX_SEK_TO_USD env var, then default.
 * Cached for 1 minute per server instance.
 */
export async function getSekPerUsd(): Promise<number> {
  // Check cache
  if (cachedRate && cachedRate.expiresAt > Date.now()) {
    return cachedRate.value
  }

  // Try DB
  try {
    const config = await prisma.platformConfig.findUnique({
      where: { key: FX_CONFIG_KEY },
    })
    if (config) {
      const parsed = parseFloat(config.value)
      if (!isNaN(parsed) && parsed > 0) {
        cachedRate = { value: parsed, expiresAt: Date.now() + CACHE_TTL_MS }
        return parsed
      }
      logger.warn('[fx-rates] PlatformConfig value is invalid, falling back', {
        key: FX_CONFIG_KEY,
        value: config.value,
      })
    }
  } catch (error) {
    // DB error — fall back to env/default, don't throw
    logger.warn('[fx-rates] Failed to read PlatformConfig, using fallback', {
      error: String(error),
    })
  }

  // Try env
  const envValue = process.env.FX_SEK_TO_USD
  if (envValue) {
    const parsed = parseFloat(envValue)
    if (!isNaN(parsed) && parsed > 0) {
      cachedRate = { value: parsed, expiresAt: Date.now() + CACHE_TTL_MS }
      return parsed
    }
    logger.warn('[fx-rates] FX_SEK_TO_USD env var is invalid, using default', {
      envValue,
    })
  }

  cachedRate = { value: DEFAULT_SEK_PER_USD, expiresAt: Date.now() + CACHE_TTL_MS }
  return DEFAULT_SEK_PER_USD
}

/**
 * Convert a SEK amount to USD.
 */
export async function sekToUsd(sekAmount: number): Promise<number> {
  const rate = await getSekPerUsd()
  return sekAmount / rate
}

/**
 * Convert a USD amount to SEK.
 */
export async function usdToSek(usdAmount: number): Promise<number> {
  const rate = await getSekPerUsd()
  return usdAmount * rate
}

/**
 * Update the stored FX rate. Used by the fx-refresh cron.
 * Invalidates the local cache.
 */
export async function setSekPerUsd(rate: number, updatedBy: string = 'system'): Promise<void> {
  if (isNaN(rate) || rate <= 0) {
    throw new Error(`Invalid FX rate: ${rate}`)
  }

  await prisma.platformConfig.upsert({
    where: { key: FX_CONFIG_KEY },
    update: {
      value: rate.toString(),
      updatedBy,
    },
    create: {
      key: FX_CONFIG_KEY,
      value: rate.toString(),
      valueType: 'number',
      category: 'fx',
      description: 'SEK per 1 USD. Auto-refreshed weekly from exchangerate.host.',
      updatedBy,
    },
  })

  // Invalidate cache
  cachedRate = null

  logger.info('[fx-rates] Updated SEK/USD rate', { rate, updatedBy })
}

/**
 * Fetch current FX rate from exchangerate.host (free, no API key).
 * Returns null on failure so the caller can skip the update.
 */
export async function fetchLiveFxRate(): Promise<number | null> {
  try {
    // exchangerate.host: free, no API key required
    const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=SEK', {
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      logger.warn('[fx-rates] exchangerate.host returned non-OK', {
        status: response.status,
      })
      return null
    }

    const data = await response.json() as { rates?: { SEK?: number }; success?: boolean }

    if (!data.rates?.SEK || typeof data.rates.SEK !== 'number') {
      logger.warn('[fx-rates] exchangerate.host returned no SEK rate', { data })
      return null
    }

    return data.rates.SEK
  } catch (error) {
    logger.warn('[fx-rates] Failed to fetch live FX rate', { error: String(error) })
    return null
  }
}
