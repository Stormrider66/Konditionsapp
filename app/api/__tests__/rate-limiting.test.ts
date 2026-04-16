import { describe, it, expect } from 'vitest'
import {
  checkRateLimitRedis,
  getClientIdentifier,
  rateLimitResponseRedis,
  RATE_LIMITS,
} from '@/lib/rate-limit-redis'

describe('Rate Limiting (Redis-backed, in-memory fallback)', () => {
  describe('getClientIdentifier', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })
      expect(getClientIdentifier(request)).toBe('192.168.1.1')
    })

    it('extracts IP from x-real-ip header as fallback', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      })
      expect(getClientIdentifier(request)).toBe('192.168.1.2')
    })

    it('extracts IP from x-vercel-forwarded-for as final proxy fallback', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-vercel-forwarded-for': '203.0.113.9' },
      })
      expect(getClientIdentifier(request)).toBe('203.0.113.9')
    })

    it('returns unknown-client when no IP headers present', () => {
      expect(getClientIdentifier(new Request('http://localhost'))).toBe(
        'unknown-client'
      )
    })
  })

  describe('checkRateLimitRedis (in-memory fallback)', () => {
    it('allows requests within limit', async () => {
      const identifier = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 5, windowSeconds: 60 }

      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimitRedis(identifier, config)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('blocks requests over limit', async () => {
      const identifier = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 3, windowSeconds: 60 }

      for (let i = 0; i < 3; i++) {
        await checkRateLimitRedis(identifier, config)
      }

      const result = await checkRateLimitRedis(identifier, config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe('rateLimitResponseRedis', () => {
    it('returns null when within rate limit', async () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': `test-${Date.now()}-${Math.random()}`,
        },
      })
      const response = await rateLimitResponseRedis(request, {
        limit: 100,
        windowSeconds: 60,
      })
      expect(response).toBeNull()
    })

    it('returns 429 with rate-limit headers when limited', async () => {
      const ip = `test-${Date.now()}-${Math.random()}`
      const config = { limit: 1, windowSeconds: 60 }

      await rateLimitResponseRedis(
        new Request('http://localhost', { headers: { 'x-forwarded-for': ip } }),
        config
      )

      const response = await rateLimitResponseRedis(
        new Request('http://localhost', { headers: { 'x-forwarded-for': ip } }),
        config
      )

      expect(response).not.toBeNull()
      expect(response?.status).toBe(429)
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
    })

    it('has calculation preset (20 req/min)', () => {
      expect(RATE_LIMITS.calculation.limit).toBe(20)
    })

    it('has cron preset (1 req/min)', () => {
      expect(RATE_LIMITS.cron.limit).toBe(1)
    })
  })
})
