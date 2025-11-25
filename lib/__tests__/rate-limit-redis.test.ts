import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the Upstash modules before importing
vi.mock('@upstash/redis', () => {
  return {
    Redis: class MockRedis {
      constructor() {}
      get = vi.fn()
      set = vi.fn()
      incr = vi.fn()
    },
  }
})

vi.mock('@upstash/ratelimit', () => {
  return {
    Ratelimit: class MockRatelimit {
      static slidingWindow = vi.fn().mockReturnValue({})
      constructor() {}
      limit = vi.fn().mockResolvedValue({
        success: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000,
      })
    },
  }
})

// Store original env values
const originalEnv = { ...process.env }

describe('Redis Rate Limiting', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  describe('isRedisConfigured', () => {
    it('returns false when Redis env vars are not set', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { isRedisConfigured } = await import('../rate-limit-redis')
      expect(isRedisConfigured()).toBe(false)
    })

    it('returns false when only URL is set', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { isRedisConfigured } = await import('../rate-limit-redis')
      expect(isRedisConfigured()).toBe(false)
    })

    it('returns true when both env vars are set', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { isRedisConfigured } = await import('../rate-limit-redis')
      expect(isRedisConfigured()).toBe(true)
    })
  })

  describe('getClientIdentifier', () => {
    it('extracts IP from x-forwarded-for header', async () => {
      const { getClientIdentifier } = await import('../rate-limit-redis')

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })

      expect(getClientIdentifier(request)).toBe('192.168.1.1')
    })

    it('extracts IP from x-real-ip header as fallback', async () => {
      const { getClientIdentifier } = await import('../rate-limit-redis')

      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      })

      expect(getClientIdentifier(request)).toBe('192.168.1.2')
    })

    it('extracts IP from x-vercel-forwarded-for for Vercel deployments', async () => {
      const { getClientIdentifier } = await import('../rate-limit-redis')

      const request = new Request('http://localhost', {
        headers: { 'x-vercel-forwarded-for': '10.0.0.5, 192.168.1.1' },
      })

      expect(getClientIdentifier(request)).toBe('10.0.0.5')
    })

    it('returns unknown-client when no IP headers present', async () => {
      const { getClientIdentifier } = await import('../rate-limit-redis')

      const request = new Request('http://localhost')
      expect(getClientIdentifier(request)).toBe('unknown-client')
    })
  })

  describe('checkRateLimitRedis', () => {
    it('falls back to in-memory when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { checkRateLimitRedis, RATE_LIMITS } = await import('../rate-limit-redis')

      const result = await checkRateLimitRedis('test-ip-1', RATE_LIMITS.standard)

      expect(result.success).toBe(true)
      expect(result.limit).toBe(100)
      expect(result.remaining).toBe(99)
    })

    it('uses Redis when configured', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { checkRateLimitRedis, RATE_LIMITS } = await import('../rate-limit-redis')

      const result = await checkRateLimitRedis('test-ip-2', RATE_LIMITS.standard)

      expect(result.success).toBe(true)
      expect(result.limit).toBe(100)
    })
  })

  describe('rateLimitResponseRedis', () => {
    it('returns null when within rate limit', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { rateLimitResponseRedis, RATE_LIMITS } = await import('../rate-limit-redis')

      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': `test-${Date.now()}-${Math.random()}` },
      })

      const response = await rateLimitResponseRedis(request, RATE_LIMITS.standard)
      expect(response).toBeNull()
    })

    it('returns 429 response when rate limited', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { rateLimitResponseRedis } = await import('../rate-limit-redis')

      const ip = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 1, windowSeconds: 60 }

      // First request - should pass
      const request1 = new Request('http://localhost', {
        headers: { 'x-forwarded-for': ip },
      })
      await rateLimitResponseRedis(request1, config)

      // Second request - should be rate limited
      const request2 = new Request('http://localhost', {
        headers: { 'x-forwarded-for': ip },
      })
      const response = await rateLimitResponseRedis(request2, config)

      expect(response).not.toBeNull()
      expect(response?.status).toBe(429)
    })

    it('includes rate limit headers in 429 response', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { rateLimitResponseRedis } = await import('../rate-limit-redis')

      const ip = `test-headers-${Date.now()}-${Math.random()}`
      const config = { limit: 1, windowSeconds: 60 }

      const request1 = new Request('http://localhost', {
        headers: { 'x-forwarded-for': ip },
      })
      await rateLimitResponseRedis(request1, config)

      const request2 = new Request('http://localhost', {
        headers: { 'x-forwarded-for': ip },
      })
      const response = await rateLimitResponseRedis(request2, config)

      expect(response?.headers.get('X-RateLimit-Limit')).toBe('1')
      expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response?.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('createCustomRateLimiter', () => {
    it('creates a custom rate limiter with prefix', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { createCustomRateLimiter } = await import('../rate-limit-redis')

      const limiter = createCustomRateLimiter('custom-api', { limit: 5, windowSeconds: 60 })

      const result1 = await limiter.check('user-123')
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(4)

      const result2 = await limiter.check('user-123')
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('isolates rate limits by prefix', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { createCustomRateLimiter } = await import('../rate-limit-redis')

      const limiter1 = createCustomRateLimiter('api-v1', { limit: 5, windowSeconds: 60 })
      const limiter2 = createCustomRateLimiter('api-v2', { limit: 5, windowSeconds: 60 })

      // Use up limit on limiter1
      for (let i = 0; i < 5; i++) {
        await limiter1.check('same-user')
      }

      // limiter2 should still have quota
      const result = await limiter2.check('same-user')
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })

  describe('RATE_LIMITS presets', () => {
    it('exports standard rate limit presets', async () => {
      const { RATE_LIMITS } = await import('../rate-limit-redis')

      expect(RATE_LIMITS.standard).toEqual({ limit: 100, windowSeconds: 60 })
      expect(RATE_LIMITS.auth).toEqual({ limit: 10, windowSeconds: 60 })
      expect(RATE_LIMITS.email).toEqual({ limit: 5, windowSeconds: 60 })
      expect(RATE_LIMITS.calculation).toEqual({ limit: 20, windowSeconds: 60 })
      expect(RATE_LIMITS.cron).toEqual({ limit: 1, windowSeconds: 60 })
    })
  })
})
