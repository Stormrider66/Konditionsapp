import { Redis } from '@upstash/redis'

type DistributedCacheEntry<T extends object = Record<string, unknown>> = {
  expiresAt: number
  staleUntil: number
  payload: T
}

type CacheRecord<T extends object = Record<string, unknown>> = DistributedCacheEntry<T> & {
  json: string
}

const redisClients = new Map<string, Redis>()

function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  )
}

function getRedis(): Redis | null {
  if (!isRedisConfigured()) {
    return null
  }

  const key = `${process.env.UPSTASH_REDIS_REST_URL}:${process.env.UPSTASH_REDIS_REST_TOKEN}`
  const existing = redisClients.get(key)
  if (existing) {
    return existing
  }

  const client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  redisClients.set(key, client)
  return client
}

export function createDistributedJsonCache<T extends object>(namespace: string) {
  const localCache = new Map<string, CacheRecord<T>>()

  return {
    async get(key: string): Promise<CacheRecord<T> | null> {
      const now = Date.now()
      const local = localCache.get(key)
      if (local && local.staleUntil > now) {
        return local
      }
      if (local) {
        localCache.delete(key)
      }

      const redis = getRedis()
      if (!redis) {
        return null
      }

      try {
        const remote = await redis.get<DistributedCacheEntry<T>>(`${namespace}:${key}`)
        if (!remote) {
          return null
        }
        if (remote.staleUntil <= now) {
          return null
        }

        const record: CacheRecord<T> = {
          ...remote,
          json: JSON.stringify(remote.payload),
        }
        localCache.set(key, record)
        return record
      } catch {
        return null
      }
    },

    async set(key: string, value: DistributedCacheEntry<T>): Promise<CacheRecord<T>> {
      const record: CacheRecord<T> = {
        ...value,
        json: JSON.stringify(value.payload),
      }
      localCache.set(key, record)

      const redis = getRedis()
      if (redis) {
        try {
          const ttlSeconds = Math.max(1, Math.ceil((value.staleUntil - Date.now()) / 1000))
          await redis.set(`${namespace}:${key}`, value, { ex: ttlSeconds })
        } catch {
          // Local cache is still valid when Redis is unavailable.
        }
      }

      return record
    },

    keys(): IterableIterator<string> {
      return localCache.keys()
    },

    async delete(key: string): Promise<void> {
      localCache.delete(key)

      const redis = getRedis()
      if (redis) {
        try {
          await redis.del(`${namespace}:${key}`)
        } catch {
          // Ignore remote delete failures; local cache is already cleared.
        }
      }
    },
  }
}

export type { DistributedCacheEntry, CacheRecord }
