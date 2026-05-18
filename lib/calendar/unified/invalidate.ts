import { unifiedCalendarCache } from './caches'

export async function invalidateUnifiedCalendarCacheForClient(clientId: string) {
  const cacheKeyClientSegment = `:${clientId}:`
  const matchingKeys = [...unifiedCalendarCache.keys()].filter((key) =>
    key.includes(cacheKeyClientSegment)
  )

  await Promise.all(matchingKeys.map((key) => unifiedCalendarCache.delete(key)))
}
