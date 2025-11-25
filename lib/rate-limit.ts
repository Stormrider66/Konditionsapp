/**
 * Rate Limiting Utility
 *
 * In-memory rate limiter for API routes.
 * For production with multiple instances, consider using Redis-based solutions like @upstash/ratelimit.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (for single-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

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
 * Default rate limit configurations for different route types
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
} as const

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and metadata
 *
 * @example
 * ```ts
 * const ip = request.headers.get('x-forwarded-for') || 'unknown'
 * const result = checkRateLimit(ip, RATE_LIMITS.standard)
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = `${identifier}:${config.limit}:${config.windowSeconds}`
  const windowMs = config.windowSeconds * 1000

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // Create new entry
    const resetTime = now + windowMs
    rateLimitStore.set(key, { count: 1, resetTime })
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime,
    }
  }

  if (entry.count >= config.limit) {
    // Rate limited
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment counter
  entry.count++
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
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

  // Fallback - in production you'd want a better solution
  return 'unknown-client'
}

/**
 * Rate limit middleware helper
 * Returns a response if rate limited, or null if allowed
 */
export function rateLimitResponse(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.standard
): Response | null {
  const identifier = getClientIdentifier(request)
  const result = checkRateLimit(identifier, config)

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
        },
      }
    )
  }

  return null
}
