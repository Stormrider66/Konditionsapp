import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, RATE_LIMITS, rateLimitResponse, getClientIdentifier } from '@/lib/rate-limit'

describe('Rate Limiting Integration', () => {
  beforeEach(() => {
    // Clear the rate limit store between tests by waiting for reset
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getClientIdentifier', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('extracts IP from x-real-ip header as fallback', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.2')
    })

    it('returns unknown-client when no IP headers present', () => {
      const request = new Request('http://localhost')

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('unknown-client')
    })
  })

  describe('checkRateLimit', () => {
    it('allows requests within limit', () => {
      const identifier = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 5, windowSeconds: 60 }

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(identifier, config)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('blocks requests over limit', () => {
      const identifier = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 3, windowSeconds: 60 }

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(identifier, config)
      }

      // This should be blocked
      const result = checkRateLimit(identifier, config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('resets after window expires', () => {
      const identifier = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 2, windowSeconds: 1 }

      // Use up the limit
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)

      // Should be blocked
      expect(checkRateLimit(identifier, config).success).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(2000)

      // Should be allowed again
      const result = checkRateLimit(identifier, config)
      expect(result.success).toBe(true)
    })
  })

  describe('rateLimitResponse', () => {
    it('returns null when within rate limit', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': `test-${Date.now()}-${Math.random()}` },
      })

      const response = rateLimitResponse(request, { limit: 100, windowSeconds: 60 })
      expect(response).toBeNull()
    })

    it('returns 429 response when rate limited', () => {
      const ip = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 1, windowSeconds: 60 }

      // Use up the limit
      const request1 = new Request('http://localhost', {
        headers: { 'x-forwarded-for': ip },
      })
      rateLimitResponse(request1, config)

      // Second request should be rate limited
      const request2 = new Request('http://localhost', {
        headers: { 'x-forwarded-for': ip },
      })
      const response = rateLimitResponse(request2, config)

      expect(response).not.toBeNull()
      expect(response?.status).toBe(429)
    })

    it('includes rate limit headers in 429 response', async () => {
      const ip = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 1, windowSeconds: 60 }

      const request1 = new Request('http://localhost', {
        headers: { 'x-forwarded-for': ip },
      })
      rateLimitResponse(request1, config)

      const request2 = new Request('http://localhost', {
        headers: { 'x-forwarded-for': ip },
      })
      const response = rateLimitResponse(request2, config)

      expect(response?.headers.get('X-RateLimit-Limit')).toBe('1')
      expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response?.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('RATE_LIMITS presets', () => {
    it('has standard preset (100 req/min)', () => {
      expect(RATE_LIMITS.standard.limit).toBe(100)
      expect(RATE_LIMITS.standard.windowSeconds).toBe(60)
    })

    it('has auth preset (10 req/min)', () => {
      expect(RATE_LIMITS.auth.limit).toBe(10)
      expect(RATE_LIMITS.auth.windowSeconds).toBe(60)
    })

    it('has email preset (5 req/min)', () => {
      expect(RATE_LIMITS.email.limit).toBe(5)
      expect(RATE_LIMITS.email.windowSeconds).toBe(60)
    })

    it('has calculation preset (20 req/min)', () => {
      expect(RATE_LIMITS.calculation.limit).toBe(20)
      expect(RATE_LIMITS.calculation.windowSeconds).toBe(60)
    })

    it('has cron preset (1 req/min)', () => {
      expect(RATE_LIMITS.cron.limit).toBe(1)
      expect(RATE_LIMITS.cron.windowSeconds).toBe(60)
    })
  })
})
