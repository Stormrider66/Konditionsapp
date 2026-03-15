import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRedisGet = vi.hoisted(() => vi.fn())
const mockRedisSet = vi.hoisted(() => vi.fn())

vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    get = mockRedisGet
    set = mockRedisSet
  },
}))

describe('distributed-json-cache', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('uses local fallback when redis is not configured', async () => {
    const { createDistributedJsonCache } = await import('../distributed-json-cache')
    const cache = createDistributedJsonCache<{ value: number }>('test-local')

    await cache.set('a', {
      expiresAt: Date.now() + 1000,
      staleUntil: Date.now() + 2000,
      payload: { value: 1 },
    })

    const cached = await cache.get('a')

    expect(cached?.payload).toEqual({ value: 1 })
    expect(mockRedisSet).not.toHaveBeenCalled()
  })

  it('hydrates local cache from redis when configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockRedisGet.mockResolvedValue({
      expiresAt: Date.now() + 1000,
      staleUntil: Date.now() + 2000,
      payload: { value: 2 },
    })

    const { createDistributedJsonCache } = await import('../distributed-json-cache')
    const cache = createDistributedJsonCache<{ value: number }>('test-redis')

    const cached = await cache.get('b')

    expect(cached?.payload).toEqual({ value: 2 })
    expect(mockRedisGet).toHaveBeenCalledWith('test-redis:b')
  })

  it('writes through to redis when configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

    const { createDistributedJsonCache } = await import('../distributed-json-cache')
    const cache = createDistributedJsonCache<{ value: number }>('test-write')

    await cache.set('c', {
      expiresAt: Date.now() + 1000,
      staleUntil: Date.now() + 4000,
      payload: { value: 3 },
    })

    expect(mockRedisSet).toHaveBeenCalledWith(
      'test-write:c',
      expect.objectContaining({
        payload: { value: 3 },
      }),
      expect.objectContaining({
        ex: expect.any(Number),
      })
    )
  })
})
