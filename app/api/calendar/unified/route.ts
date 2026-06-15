/**
 * Unified Calendar API
 *
 * GET /api/calendar/unified — one-stop calendar query. Merges workouts,
 * races, field tests, calendar events, daily check-ins, ad-hoc workouts,
 * Quick Erg sessions and Garmin activities into a single sorted stream
 * for a given client.
 *
 * Route orchestrates. Heavy lifting (queries, serializers, caches,
 * auth dedupe) lives under lib/calendar/unified/.
 */

import { NextRequest, NextResponse } from 'next/server'
import { performance } from 'node:perf_hooks'
import { canAccessClient } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'
import { resolveAuthenticatedUserId } from '@/lib/calendar/unified/auth'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import {
  CLIENT_ACCESS_TTL_MS,
  clientAccessCache,
  clientAccessInFlight,
  unifiedCalendarCache,
  unifiedCalendarInFlight,
} from '@/lib/calendar/unified/caches'
import {
  jsonResponse,
  normalizeCalendarItemsMode,
  shouldEmitPerfDebugHeaders,
  withHandlerTiming,
} from '@/lib/calendar/unified/perf'
import { buildUnifiedCalendarPayload } from '@/lib/calendar/unified/build-payload'

export type { UnifiedCalendarItem } from '@/lib/calendar/unified/types'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  const locale = resolveRequestLocale(request)
  try {
    const emitDebugHeaders = shouldEmitPerfDebugHeaders(request)
    const t0 = emitDebugHeaders ? performance.now() : 0

    const authResult = await resolveAuthenticatedUserId(request)
    if (!authResult.ok) return authResult.response
    const dbUserId = authResult.userId

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    const includeWorkouts = searchParams.get('includeWorkouts') !== 'false'
    const includeRaces = searchParams.get('includeRaces') !== 'false'
    const includeFieldTests = searchParams.get('includeFieldTests') !== 'false'
    const includeEvents = searchParams.get('includeEvents') !== 'false'
    const includeCheckIns = searchParams.get('includeCheckIns') !== 'false'
    const includeWODs = searchParams.get('includeWODs') !== 'false'
    const includeAdHoc = searchParams.get('includeAdHoc') !== 'false'
    const includeQuickErg = searchParams.get('includeQuickErg') !== 'false'

    // Response shape (both true by default for backwards compatibility).
    const includeItems = searchParams.get('includeItems') !== 'false'
    const includeGroupedByDate = searchParams.get('includeGroupedByDate') !== 'false'
    // Lighter payload selection when includeItems=true.
    const itemsMode = normalizeCalendarItemsMode(searchParams.get('itemsMode'))

    if (!clientId) {
      return NextResponse.json(
        { error: t(locale, 'Missing required parameter: clientId', 'Obligatorisk parameter saknas: clientId') },
        { status: 400 }
      )
    }

    // Client-access check with its own dedupe-and-cache pair.
    const accessCacheKey = `${dbUserId}:${clientId}`
    const cachedAccess = clientAccessCache.get(accessCacheKey)
    let hasAccess: boolean
    if (cachedAccess && cachedAccess.expiresAt > Date.now()) {
      hasAccess = cachedAccess.allowed
    } else {
      const inFlight = clientAccessInFlight.get(accessCacheKey)
      if (inFlight) {
        hasAccess = await inFlight
      } else {
        const task = canAccessClient(dbUserId, clientId)
        clientAccessInFlight.set(accessCacheKey, task)
        try {
          hasAccess = await task
        } finally {
          clientAccessInFlight.delete(accessCacheKey)
        }
      }
      clientAccessCache.set(accessCacheKey, {
        expiresAt: Date.now() + CLIENT_ACCESS_TTL_MS,
        allowed: hasAccess,
      })
    }
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    // Default to current month, clamp range to 120 days.
    const now = new Date()
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(now.getFullYear(), now.getMonth(), 1)
    let endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const MAX_RANGE_DAYS = 120
    const maxItemsPerSource = Math.min(
      parseInt(searchParams.get('maxItemsPerSource') || '150', 10) || 150,
      1000
    )
    const requestedRangeMs = endDate.getTime() - startDate.getTime()
    const maxRangeMs = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000
    const rangeClamped = requestedRangeMs > maxRangeMs
    if (rangeClamped) {
      endDate = new Date(startDate.getTime() + maxRangeMs)
    }

    const cacheKey = [
      dbUserId,
      clientId,
      startDate.toISOString(),
      endDate.toISOString(),
      includeWorkouts ? '1' : '0',
      includeRaces ? '1' : '0',
      includeFieldTests ? '1' : '0',
      includeEvents ? '1' : '0',
      includeCheckIns ? '1' : '0',
      includeWODs ? '1' : '0',
      includeAdHoc ? '1' : '0',
      includeQuickErg ? '1' : '0',
      includeItems ? '1' : '0',
      itemsMode,
      includeGroupedByDate ? '1' : '0',
      maxItemsPerSource.toString(),
    ].join(':')

    const buildInput = {
      cacheKey,
      dbUserId,
      clientId,
      startDate,
      endDate,
      includeWorkouts,
      includeRaces,
      includeFieldTests,
      includeEvents,
      includeCheckIns,
      includeWODs,
      includeAdHoc,
      includeQuickErg,
      includeItems,
      itemsMode,
      includeGroupedByDate,
      maxItemsPerSource,
      rangeClamped,
      maxRangeDays: MAX_RANGE_DAYS,
    }

    const nowMs = Date.now()
    const cached = await unifiedCalendarCache.get(cacheKey)
    if (cached && cached.expiresAt > nowMs) {
      return jsonResponse(
        cached.payload.json,
        withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'hit' })
      )
    }

    const inFlight = unifiedCalendarInFlight.get(cacheKey)
    if (cached && cached.staleUntil > nowMs) {
      // Serve stale immediately while a background refresh is in flight.
      if (!inFlight) {
        const refreshPromise = buildUnifiedCalendarPayload(buildInput)
        unifiedCalendarInFlight.set(cacheKey, refreshPromise)
        void refreshPromise.finally(() => unifiedCalendarInFlight.delete(cacheKey))
      }
      return jsonResponse(
        cached.payload.json,
        withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'stale' })
      )
    }
    if (inFlight) {
      const json = await inFlight
      return jsonResponse(
        json,
        withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'inflight' })
      )
    }

    const loadPromise = buildUnifiedCalendarPayload(buildInput)
    unifiedCalendarInFlight.set(cacheKey, loadPromise)
    try {
      const json = await loadPromise
      return jsonResponse(
        json,
        withHandlerTiming(emitDebugHeaders, t0, { 'x-cache': 'miss' })
      )
    } finally {
      unifiedCalendarInFlight.delete(cacheKey)
    }
  } catch (error) {
    logError('Error fetching unified calendar:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch unified calendar', 'Misslyckades med att hämta samlad kalender') },
      { status: 500 }
    )
  }
}
