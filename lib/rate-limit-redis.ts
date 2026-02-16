/**
 * Redis-backed Rate Limiting for Production
 *
 * Uses Upstash Redis for distributed rate limiting across multiple instances.
 * Falls back to in-memory rate limiting if Redis is not configured.
 *
 * Setup:
 * 1. Create a free Upstash Redis database at https://upstash.com
 * 2. Add to .env.local:
 *    UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=xxx
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { RateLimitConfig, RateLimitResult, RATE_LIMITS } from './rate-limit'

// Lazy initialization to avoid errors when Redis is not configured
let redis: Redis | null = null
let rateLimiters: Map<string, Ratelimit> | null = null

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  )
}

/**
 * Initialize Redis client (lazy initialization)
 */
function getRedis(): Redis | null {
  if (!isRedisConfigured()) {
    return null
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }

  return redis
}

/**
 * Get or create a rate limiter for a specific config
 */
function getRateLimiter(config: RateLimitConfig): Ratelimit | null {
  const redisClient = getRedis()
  if (!redisClient) {
    return null
  }

  if (!rateLimiters) {
    rateLimiters = new Map()
  }

  const key = `${config.limit}:${config.windowSeconds}`

  if (!rateLimiters.has(key)) {
    // Use sliding window algorithm for accurate rate limiting
    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      analytics: true, // Enable analytics in Upstash dashboard
      prefix: 'ratelimit:trainomics',
    })
    rateLimiters.set(key, limiter)
  }

  return rateLimiters.get(key)!
}

/**
 * Check rate limit using Redis (with in-memory fallback)
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and metadata
 */
export async function checkRateLimitRedis(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(config)

  if (!limiter) {
    // Fallback to in-memory rate limiting
    const { checkRateLimit } = await import('./rate-limit')
    return checkRateLimit(identifier, config)
  }

  try {
    const result = await limiter.limit(identifier)

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.reset,
    }
  } catch (error) {
    // If Redis fails, fall back to in-memory
    console.warn('[Rate Limit] Redis error, falling back to in-memory:', error)
    const { checkRateLimit } = await import('./rate-limit')
    return checkRateLimit(identifier, config)
  }
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header (for proxies) or falls back to a default
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // For Vercel deployments
  const vercelIp = request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) {
    return vercelIp.split(',')[0].trim()
  }

  return 'unknown-client'
}

/**
 * Rate limit middleware helper (async version for Redis)
 * Returns a response if rate limited, or null if allowed
 */
export async function rateLimitResponseRedis(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.standard
): Promise<Response | null> {
  const identifier = getClientIdentifier(request)
  const result = await checkRateLimitRedis(identifier, config)

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

    return new Response(
      JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.max(retryAfter, 1),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          'Retry-After': String(Math.max(retryAfter, 1)),
        },
      }
    )
  }

  return null
}

/**
 * Rate limit helper that returns NextResponse for API routes
 * Uses a key prefix + userId as the identifier
 *
 * @param keyPrefix - Prefix for the rate limit key (e.g., 'ai:research:start')
 * @param userId - User ID to include in the identifier
 * @param config - Rate limit configuration (limit and windowSeconds)
 * @returns NextResponse if rate limited, or null if allowed
 */
export async function rateLimitJsonResponse(
  keyPrefix: string,
  userId: string,
  config: { limit: number; windowSeconds: number }
): Promise<NextResponse | null> {
  const identifier = `${keyPrefix}:${userId}`
  const result = await checkRateLimitRedis(identifier, config)

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.max(retryAfter, 1),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          'Retry-After': String(Math.max(retryAfter, 1)),
        },
      }
    )
  }

  return null
}

/**
 * Create a custom rate limiter with specific prefix
 * Useful for per-user or per-resource rate limiting
 */
export function createCustomRateLimiter(
  prefix: string,
  config: RateLimitConfig
): {
  check: (identifier: string) => Promise<RateLimitResult>
} {
  const redisClient = getRedis()

  if (!redisClient) {
    // Return in-memory fallback
    return {
      check: async (identifier: string) => {
        const { checkRateLimit } = await import('./rate-limit')
        return checkRateLimit(`${prefix}:${identifier}`, config)
      },
    }
  }

  const limiter = new Ratelimit({
    redis: redisClient,
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
        const { checkRateLimit } = await import('./rate-limit')
        return checkRateLimit(`${prefix}:${identifier}`, config)
      }
    },
  }
}

// Re-export common items from rate-limit for convenience
export { RATE_LIMITS } from './rate-limit'
export type { RateLimitConfig, RateLimitResult } from './rate-limit'
