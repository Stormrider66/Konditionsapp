import { NextRequest, NextResponse } from 'next/server'
import {
  checkRateLimitRedis,
  createCustomRateLimiter,
  RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
} from '@/lib/rate-limit-redis'

export { RATE_LIMITS }
export type { RateLimitConfig, RateLimitResult }

function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const retryAfter = Math.max(
    Math.ceil((result.resetTime - Date.now()) / 1000),
    1
  )
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    'Retry-After': String(retryAfter),
  }
}

function rateLimited(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.max(
        Math.ceil((result.resetTime - Date.now()) / 1000),
        1
      ),
    },
    { status: 429, headers: rateLimitHeaders(result) }
  )
}

/**
 * Rate-limit by `<prefix>:<identifier>` (typically a user ID).
 */
export function rateLimitJsonResponse(
  prefix: string,
  identifier: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const limiter = createCustomRateLimiter(prefix, config)
  return limiter.check(identifier).then((result) => {
    if (result.success) return null
    return rateLimited(result)
  })
}

/**
 * Rate-limit by request IP. Replacement for the legacy
 * `rateLimitResponse(request, config)` helper that used an in-memory store.
 */
export async function rateLimitIp(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMITS.standard,
  prefix = 'ip'
): Promise<NextResponse | null> {
  const ip = getRequestIp(request)
  const result = await checkRateLimitRedis(`${prefix}:${ip}`, config)
  if (result.success) return null
  return rateLimited(result)
}

export function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  const vercelIp = request.headers.get('x-vercel-forwarded-for')
  if (vercelIp) return vercelIp.split(',')[0].trim()

  return 'unknown-client'
}
