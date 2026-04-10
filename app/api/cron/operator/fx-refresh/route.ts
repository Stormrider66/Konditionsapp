/**
 * FX Rate Refresh Cron
 *
 * Schedule: Weekly Monday 3am UTC (before BI report runs at 8am)
 * Fetches current SEK/USD rate from exchangerate.host and updates
 * the PlatformConfig entry. The Cost Guardian's margin analysis then
 * uses the fresh rate automatically.
 *
 * If the fetch fails, leaves the existing rate in place — the Cost
 * Guardian degrades gracefully to stale data rather than missing data.
 */

import { NextResponse } from 'next/server'
import { fetchLiveFxRate, setSekPerUsd, getSekPerUsd } from '@/lib/operator-agents/fx-rates'
import { logger } from '@/lib/logger'

function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return process.env.NODE_ENV === 'development'
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const previousRate = await getSekPerUsd()
    const liveRate = await fetchLiveFxRate()

    if (liveRate === null) {
      logger.warn('[cron/fx-refresh] Failed to fetch live rate, keeping existing', {
        previousRate,
      })
      return NextResponse.json({
        success: false,
        reason: 'fetch_failed',
        previousRate,
      })
    }

    // Sanity check: don't accept rates more than 30% off the previous value
    // (prevents bad data from a single bad API response)
    const percentChange = Math.abs((liveRate - previousRate) / previousRate) * 100
    if (percentChange > 30) {
      logger.warn('[cron/fx-refresh] Live rate differs >30% from previous, rejecting', {
        previousRate,
        liveRate,
        percentChange,
      })
      return NextResponse.json({
        success: false,
        reason: 'sanity_check_failed',
        previousRate,
        liveRate,
        percentChange,
      })
    }

    await setSekPerUsd(liveRate, 'fx-refresh-cron')

    logger.info('[cron/fx-refresh] Updated SEK/USD rate', {
      previousRate,
      newRate: liveRate,
      percentChange: Math.round(percentChange * 100) / 100,
    })

    return NextResponse.json({
      success: true,
      previousRate,
      newRate: liveRate,
      percentChange: Math.round(percentChange * 100) / 100,
    })
  } catch (error) {
    logger.error('[cron/fx-refresh] Failed', {}, error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
