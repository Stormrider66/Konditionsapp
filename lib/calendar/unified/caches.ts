import { createDistributedJsonCache } from '@/lib/distributed-json-cache'

/** Calendar UI refreshes often — serving cached data for a few minutes is fine. */
export const UNIFIED_CALENDAR_TTL_MS = 10 * 60 * 1000
export const UNIFIED_CALENDAR_STALE_MS = 30 * 60 * 1000

/** Auth context is safe to cache longer than the payload itself. */
export const AUTH_CONTEXT_TTL_MS = 2 * 60 * 1000
export const CLIENT_ACCESS_TTL_MS = 2 * 60 * 1000

export const unifiedCalendarCache = createDistributedJsonCache<{ json: string }>(
  'unified-calendar'
)
export const unifiedCalendarInFlight = new Map<string, Promise<string>>()

export const clientAccessCache = new Map<
  string,
  { expiresAt: number; allowed: boolean }
>()
export const clientAccessInFlight = new Map<string, Promise<boolean>>()

export const authEmailCache = new Map<string, { expiresAt: number; email: string }>()
export const userIdByEmailCache = new Map<string, { expiresAt: number; userId: string }>()
export const authEmailInFlight = new Map<string, Promise<string>>()
export const userIdByEmailInFlight = new Map<string, Promise<string | null>>()
