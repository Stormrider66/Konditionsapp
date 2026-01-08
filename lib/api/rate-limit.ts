import { NextRequest, NextResponse } from 'next/server'
import { createCustomRateLimiter } from '@/lib/rate-limit-redis'
import type { RateLimitConfig } from '@/lib/rate-limit-redis'

export function rateLimitJsonResponse(
  prefix: string,
  identifier: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const limiter = createCustomRateLimiter(prefix, config)
  return limiter.check(identifier).then((result) => {
    if (result.success) return null

    const retryAfter = Math.max(
      Math.ceil((result.resetTime - Date.now()) / 1000),
      1
    )

    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          'Retry-After': String(retryAfter),
        },
      }
    )
  })
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


