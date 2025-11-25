import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, RATE_LIMITS, getClientIdentifier } from '../rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limit store between tests by using unique identifiers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', () => {
      const identifier = `test-user-${Date.now()}`
      const config = { limit: 5, windowSeconds: 60 }

      // First request should succeed
      const result1 = checkRateLimit(identifier, config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(4)

      // Second request should succeed
      const result2 = checkRateLimit(identifier, config)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('should block requests over the limit', () => {
      const identifier = `test-user-block-${Date.now()}`
      const config = { limit: 3, windowSeconds: 60 }

      // Use up all allowed requests
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)

      // Fourth request should be blocked
      const result = checkRateLimit(identifier, config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset after window expires', () => {
      const identifier = `test-user-reset-${Date.now()}`
      const config = { limit: 2, windowSeconds: 60 }

      // Use up all requests
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)

      // Blocked
      let result = checkRateLimit(identifier, config)
      expect(result.success).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(61 * 1000)

      // Should be allowed again
      result = checkRateLimit(identifier, config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should return correct reset time', () => {
      const identifier = `test-user-time-${Date.now()}`
      const config = { limit: 5, windowSeconds: 60 }

      const result = checkRateLimit(identifier, config)
      expect(result.resetTime).toBeGreaterThan(Date.now())
      expect(result.resetTime).toBeLessThanOrEqual(Date.now() + 60 * 1000)
    })
  })

  describe('RATE_LIMITS presets', () => {
    it('should have standard rate limit', () => {
      expect(RATE_LIMITS.standard).toEqual({ limit: 100, windowSeconds: 60 })
    })

    it('should have stricter auth rate limit', () => {
      expect(RATE_LIMITS.auth.limit).toBeLessThan(RATE_LIMITS.standard.limit)
    })

    it('should have stricter email rate limit', () => {
      expect(RATE_LIMITS.email.limit).toBe(5)
    })

    it('should have stricter cron rate limit', () => {
      expect(RATE_LIMITS.cron.limit).toBe(1)
    })
  })

  describe('getClientIdentifier', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.2')
    })

    it('should return fallback for missing headers', () => {
      const request = new Request('http://localhost')

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('unknown-client')
    })
  })
})
