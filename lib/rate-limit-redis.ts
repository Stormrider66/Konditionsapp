/**
 * Rate Limiting (Redis-backed with in-memory fallback)
 *
 * Production: uses Upstash Redis (sliding window) for distributed rate
 * limiting across Vercel Function instances.
 *
 * Local / missing Redis: falls back to a per-instance in-memory limiter
 * so local dev still works. The fallback is NOT safe across instances and
 * should never be relied on in production — see the `isRedisConfigured()`
 * check and the startup log in production to verify.
 *
 * Setup for production:
 *   1. Create a free Upstash Redis database at https://upstash.com
 *   2. Add to environment:
 *        UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *        UPSTASH_REDIS_REST_TOKEN=xxx
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// ---------- Types & presets -----------------------------------------------

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Default rate limit configurations for different route types.
 */
export const RATE_LIMITS = {
  /** Standard API routes: 100 requests per minute */
  standard: { limit: 100, windowSeconds: 60 },
  /** Auth routes: 10 requests per minute */
  auth: { limit: 10, windowSeconds: 60 },
  /** Email sending: 5 requests per minute */
  email: { limit: 5, windowSeconds: 60 },
  /** Expensive calculations: 20 requests per minute */
  calculation: { limit: 20, windowSeconds: 60 },
  /** File uploads: 10 requests per minute */
  upload: { limit: 10, windowSeconds: 60 },
  /** Cron jobs: 1 request per minute */
  cron: { limit: 1, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitConfig>

// ---------- In-memory fallback (dev / Redis unavailable) ------------------

interface InMemoryEntry {
  count: number
  resetTime: number
}

const inMemoryStore = new Map<string, InMemoryEntry>()

function inMemoryCheck(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const key = `${identifier}:${config.limit}:${config.windowSeconds}`
  const windowMs = config.windowSeconds * 1000
  const entry = inMemoryStore.get(key)

  // Prune stale entries on read — cheap and avoids leaking a `setInterval`
  // handle in a serverless environment (every prior implementation did).
  if (inMemoryStore.size > 5000) {
    for (const [k, v] of inMemoryStore) {
      if (v.resetTime < now) inMemoryStore.delete(k)
    }
  }

  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs
    inMemoryStore.set(key, { count: 1, resetTime })
    return { success: true, limit: config.limit, remaining: config.limit - 1, resetTime }
  }

  if (entry.count >= config.limit) {
    return { success: false, limit: config.limit, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  }
}

// ---------- Redis client & limiter cache ----------------------------------

let redisClient: Redis | null = null
let limiters: Map<string, Ratelimit> | null = null

export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  )
}

function getRedis(): Redis | null {
  if (!isRedisConfigured()) return null
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redisClient
}

function getLimiter(config: RateLimitConfig): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  if (!limiters) limiters = new Map()

  const key = `${config.limit}:${config.windowSeconds}`
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
        analytics: true,
        prefix: 'ratelimit:trainomics',
      })
    )
  }
  return limiters.get(key)!
}

// ---------- Public API ----------------------------------------------------

/**
 * Check rate limit. Uses Redis when configured, falls back to in-memory.
 */
export async function checkRateLimitRedis(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = getLimiter(config)
  if (!limiter) return inMemoryCheck(identifier, config)

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.reset,
    }
  } catch (error) {
    console.warn('[Rate Limit] Redis error, falling back to in-memory:', error)
    return inMemoryCheck(identifier, config)
  }
}

/**
 * Extract client IP from common proxy headers.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  const vercelIp = request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) return vercelIp.split(',')[0].trim()

  return 'unknown-client'
}

function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const retryAfter = Math.max(Math.ceil((result.resetTime - Date.now()) / 1000), 1)
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    'Retry-After': String(retryAfter),
  }
}

/**
 * Rate-limit helper for `Response`-returning handlers. Returns a 429
 * response when limited, or `null` to proceed.
 */
export async function rateLimitResponseRedis(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.standard
): Promise<Response | null> {
  const identifier = getClientIdentifier(request)
  const result = await checkRateLimitRedis(identifier, config)
  if (result.success) return null

  return new Response(
    JSON.stringify({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.max(Math.ceil((result.resetTime - Date.now()) / 1000), 1),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...rateLimitHeaders(result),
      },
    }
  )
}

/**
 * Rate-limit helper for API routes. Key = `<prefix>:<userId>`.
 */
export async function rateLimitJsonResponse(
  keyPrefix: string,
  userId: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const identifier = `${keyPrefix}:${userId}`
  const result = await checkRateLimitRedis(identifier, config)
  if (result.success) return null

  return NextResponse.json(
    {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.max(Math.ceil((result.resetTime - Date.now()) / 1000), 1),
    },
    { status: 429, headers: rateLimitHeaders(result) }
  )
}

/**
 * Create a custom limiter bound to a prefix. Useful for per-resource or
 * per-feature rate limiting.
 */
export function createCustomRateLimiter(
  prefix: string,
  config: RateLimitConfig
): { check: (identifier: string) => Promise<RateLimitResult> } {
  const redis = getRedis()

  if (!redis) {
    return {
      check: async (identifier: string) =>
        inMemoryCheck(`${prefix}:${identifier}`, config),
    }
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
    prefix: `ratelimit:${prefix}`,
  })

  return {
    check: async (identifier: string) => {
      try {
        const result = await limiter.limit(identifier)
        return {
          success: result.success,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.reset,
        }
      } catch (error) {
        console.warn(`[Rate Limit] Redis error for ${prefix}, falling back:`, error)
        return inMemoryCheck(`${prefix}:${identifier}`, config)
      }
    },
  }
}
