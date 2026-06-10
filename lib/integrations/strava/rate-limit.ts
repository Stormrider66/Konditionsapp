/**
 * Strava app-level rate-limit guard.
 *
 * Strava enforces APP-level quotas shared across ALL connected users
 * (default 100 requests/15 min, 1000/day). Every API response reports
 * usage in headers:
 *
 *   X-RateLimit-Limit: "100,1000"   // 15-min window, daily
 *   X-RateLimit-Usage: "87,455"
 *
 * When a window is exhausted (or a 429 lands) we set a shared cooldown
 * flag — Upstash Redis when configured, per-instance memory otherwise —
 * and outbound calls fail fast with StravaRateLimitError instead of
 * burning the remaining daily quota on doomed retries.
 *
 * 15-minute windows reset on the quarter hour (hh:00/15/30/45); the daily
 * window resets at midnight UTC.
 */

import 'server-only'

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

const COOLDOWN_KEY = 'strava:quota-cooldown'

export class StravaRateLimitError extends Error {
  readonly retryAfterMs: number

  constructor(retryAfterMs: number) {
    super(
      `Strava app-level rate limit reached; cooling down ${Math.ceil(retryAfterMs / 1000)}s`
    )
    this.name = 'StravaRateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

let redisClient: Redis | null | undefined
function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient
  redisClient =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
      : null
  return redisClient
}

// Fallback when Redis is not configured — only protects this instance.
let memoryCooldownUntil = 0

export function msUntilNextQuarterHour(now = Date.now()): number {
  const quarterMs = 15 * 60 * 1000
  return quarterMs - (now % quarterMs)
}

export function msUntilUtcMidnight(now = Date.now()): number {
  const dayMs = 24 * 60 * 60 * 1000
  return dayMs - (now % dayMs)
}

/** Remaining cooldown in ms, 0 when calls are allowed. */
export async function getStravaCooldownMs(): Promise<number> {
  const redis = getRedis()
  if (redis) {
    try {
      const ttlMs = await redis.pttl(COOLDOWN_KEY)
      return ttlMs > 0 ? ttlMs : 0
    } catch (error) {
      logger.warn('Strava cooldown read failed; using in-memory state', {
        error: String(error),
      })
    }
  }
  return Math.max(0, memoryCooldownUntil - Date.now())
}

export async function startStravaCooldown(ms: number, reason: string): Promise<void> {
  memoryCooldownUntil = Math.max(memoryCooldownUntil, Date.now() + ms)
  logger.warn('Strava quota cooldown started', { ms, reason })

  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(COOLDOWN_KEY, reason, { px: ms })
  } catch (error) {
    logger.warn('Strava cooldown write failed; in-memory only', { error: String(error) })
  }
}

function parsePair(header: string | null): [number, number] | null {
  if (!header) return null
  const parts = header.split(',').map((part) => Number.parseInt(part.trim(), 10))
  if (parts.length < 2 || parts.some(Number.isNaN)) return null
  return [parts[0], parts[1]]
}

/**
 * Track usage headers from a Strava response and start a cooldown when a
 * window is exhausted, so the first request past the limit is the last
 * one we send until the window resets.
 */
export async function recordStravaRateLimitHeaders(headers: Headers): Promise<void> {
  const limits = parsePair(headers.get('x-ratelimit-limit'))
  const usage = parsePair(headers.get('x-ratelimit-usage'))
  if (!limits || !usage) return

  const [limit15, limitDay] = limits
  const [usage15, usageDay] = usage

  if (usageDay >= limitDay) {
    await startStravaCooldown(msUntilUtcMidnight(), `daily quota ${usageDay}/${limitDay}`)
  } else if (usage15 >= limit15) {
    await startStravaCooldown(
      msUntilNextQuarterHour(),
      `15-min quota ${usage15}/${limit15}`
    )
  }
}
