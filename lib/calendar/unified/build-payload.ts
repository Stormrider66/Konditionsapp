import {
  UNIFIED_CALENDAR_STALE_MS,
  UNIFIED_CALENDAR_TTL_MS,
  unifiedCalendarCache,
} from './caches'
import {
  fetchAdHoc,
  fetchAllCounts,
  fetchCalendarEvents,
  fetchCheckIns,
  fetchFieldTests,
  fetchGarminActivities,
  fetchQuickErgSessions,
  fetchRaces,
  fetchStandaloneScheduledAssignments,
  fetchWODs,
  fetchWorkouts,
} from './queries'
import {
  serializeAdHoc,
  serializeCalendarEvent,
  serializeCheckIn,
  serializeFieldTest,
  serializeGarmin,
  serializeQuickErg,
  serializeRace,
  serializeStandaloneScheduledAssignment,
  serializeWOD,
  serializeWorkout,
} from './serializers'
import type { BuildUnifiedCalendarPayloadInput, UnifiedCalendarItem } from './types'

/**
 * Build (and cache) the JSON payload for the unified calendar endpoint.
 *
 * - `!includeItems && !includeGroupedByDate` → fast counts-only path
 * - otherwise the source queries run in parallel, rows are serialized
 *   into the shared UnifiedCalendarItem shape, optionally grouped by
 *   date, and the resulting JSON is cached in the distributed cache
 *   (TTL + stale-while-revalidate).
 */
export async function buildUnifiedCalendarPayload(
  input: BuildUnifiedCalendarPayloadInput
): Promise<string> {
  const {
    cacheKey,
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
    maxRangeDays,
  } = input

  // Counts-only fast path.
  if (!includeItems && !includeGroupedByDate) {
    const counts = await fetchAllCounts({
      clientId,
      startDate,
      endDate,
      itemsMode,
      maxItemsPerSource,
      includeWorkouts,
      includeRaces,
      includeFieldTests,
      includeEvents,
      includeCheckIns,
      includeWODs,
      includeAdHoc,
      includeQuickErg,
    })

    const payload = {
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      rangeClamped,
      maxRangeDays,
      maxItemsPerSource,
      counts: {
        total:
          counts.workouts + counts.races + counts.fieldTests + counts.events +
          counts.checkIns + counts.wods + counts.adHoc + counts.quickErg,
        workouts: counts.workouts,
        races: counts.races,
        fieldTests: counts.fieldTests,
        calendarEvents: counts.events,
        checkIns: counts.checkIns,
        wods: counts.wods,
        adHoc: counts.adHoc,
        quickErg: counts.quickErg,
      },
    }

    const json = JSON.stringify(payload)
    await unifiedCalendarCache.set(cacheKey, {
      expiresAt: Date.now() + UNIFIED_CALENDAR_TTL_MS,
      staleUntil: Date.now() + UNIFIED_CALENDAR_STALE_MS,
      payload: { json },
    })
    return json
  }

  const queryInput = { clientId, startDate, endDate, itemsMode, maxItemsPerSource }

  const [
    workouts,
    scheduledAssignments,
    races,
    fieldTests,
    events,
    checkIns,
    wods,
    adHocWorkouts,
    garminActivities,
    quickErgSessions,
  ] =
    await Promise.all([
      includeWorkouts ? fetchWorkouts(queryInput) : Promise.resolve([]),
      includeEvents ? fetchStandaloneScheduledAssignments(queryInput) : Promise.resolve([]),
      includeRaces ? fetchRaces(queryInput) : Promise.resolve([]),
      includeFieldTests ? fetchFieldTests(queryInput) : Promise.resolve([]),
      includeEvents ? fetchCalendarEvents(queryInput) : Promise.resolve([]),
      includeCheckIns ? fetchCheckIns(queryInput) : Promise.resolve([]),
      includeWODs ? fetchWODs(queryInput) : Promise.resolve([]),
      includeAdHoc ? fetchAdHoc(queryInput) : Promise.resolve([]),
      clientId ? fetchGarminActivities(queryInput) : Promise.resolve([]),
      includeQuickErg ? fetchQuickErgSessions(queryInput) : Promise.resolve([]),
    ])

  const needsItems = includeItems || includeGroupedByDate
  const items: UnifiedCalendarItem[] = []
  const counts = {
    total: 0,
    workouts: 0,
    races: 0,
    fieldTests: 0,
    calendarEvents: 0,
    checkIns: 0,
    wods: 0,
    adHoc: 0,
    garmin: 0,
    quickErg: 0,
  }

  for (const workout of workouts as any[]) {
    counts.total += 1
    counts.workouts += 1
    if (needsItems) items.push(serializeWorkout(workout, itemsMode))
  }
  for (const assignment of scheduledAssignments as any[]) {
    counts.total += 1
    counts.calendarEvents += 1
    if (needsItems) items.push(serializeStandaloneScheduledAssignment(assignment, itemsMode))
  }
  for (const race of races as any[]) {
    counts.total += 1
    counts.races += 1
    if (needsItems) items.push(serializeRace(race, itemsMode))
  }
  for (const test of fieldTests as any[]) {
    counts.total += 1
    counts.fieldTests += 1
    if (needsItems) items.push(serializeFieldTest(test, itemsMode))
  }
  for (const event of events as any[]) {
    counts.total += 1
    counts.calendarEvents += 1
    if (needsItems) items.push(serializeCalendarEvent(event, itemsMode))
  }
  for (const checkIn of checkIns as any[]) {
    counts.total += 1
    counts.checkIns += 1
    if (needsItems) items.push(serializeCheckIn(checkIn, itemsMode))
  }
  for (const wod of wods as any[]) {
    counts.total += 1
    counts.wods += 1
    if (needsItems) items.push(serializeWOD(wod, itemsMode))
  }
  for (const adHoc of adHocWorkouts as any[]) {
    counts.total += 1
    counts.adHoc += 1
    if (needsItems) items.push(serializeAdHoc(adHoc, itemsMode))
  }
  for (const garmin of garminActivities as any[]) {
    counts.total += 1
    counts.garmin += 1
    if (needsItems) items.push(serializeGarmin(garmin))
  }
  for (const quickErg of quickErgSessions as any[]) {
    counts.total += 1
    counts.quickErg += 1
    if (needsItems) items.push(serializeQuickErg(quickErg, itemsMode))
  }

  if (needsItems) {
    items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  const groupedByDate: Record<string, UnifiedCalendarItem[]> | undefined = includeGroupedByDate
    ? (() => {
        const grouped: Record<string, UnifiedCalendarItem[]> = {}
        for (const item of items) {
          const dateKey = item.date.toISOString().slice(0, 10)
          if (!grouped[dateKey]) grouped[dateKey] = []
          grouped[dateKey].push(item)
        }
        return grouped
      })()
    : undefined

  const payload = {
    ...(includeItems ? { items } : {}),
    ...(includeGroupedByDate ? { groupedByDate } : {}),
    itemsMode: includeItems ? itemsMode : undefined,
    dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    rangeClamped,
    maxRangeDays,
    maxItemsPerSource,
    counts,
  }

  // Cache the serialized JSON so cached responses avoid repeating
  // JSON.stringify() under concurrency.
  const json = JSON.stringify(payload)
  await unifiedCalendarCache.set(cacheKey, {
    expiresAt: Date.now() + UNIFIED_CALENDAR_TTL_MS,
    staleUntil: Date.now() + UNIFIED_CALENDAR_STALE_MS,
    payload: { json },
  })
  return json
}
