/**
 * Activity Deduplication Utility
 *
 * Handles deduplication of activities from multiple sources:
 * - Strava, Garmin, Concept2, Manual logs, AI WODs
 *
 * Uses matching algorithm:
 * - Primary: Same date + start time within ±15 minutes
 * - Secondary: Duration within ±10% OR distance within ±5%
 * - Type: Same mapped activity type
 *
 * Priority order (higher = preferred):
 * - Concept2: 5 (most accurate - direct from equipment)
 * - Strava: 4 (good quality, widely used)
 * - Garmin: 3 (good quality, but often duplicates Strava)
 * - AI WOD: 2 (generated, less metadata)
 * - Manual: 1 (user input, least reliable for TSS)
 */

export type ActivitySource = 'strava' | 'garmin' | 'concept2' | 'manual' | 'ai' | 'adhoc'

export interface NormalizedActivity {
  id: string
  source: ActivitySource
  date: Date
  startTime?: Date // More precise timing if available
  duration: number // seconds
  type: string // RUNNING, CYCLING, STRENGTH, ROWING, etc.
  distance?: number // meters
  tss?: number
  trimp?: number
  avgHR?: number
  // Original data reference for debugging
  originalId?: string | number
}

export interface DeduplicationResult {
  deduplicated: NormalizedActivity[]
  duplicatesRemoved: number
  matchedPairs: Array<{
    kept: NormalizedActivity
    removed: NormalizedActivity
    matchReason: string
    confidence: number // 0-1
  }>
}

export interface DeduplicationOptions {
  /** Time window for matching activities (default: 15 minutes in ms) */
  timeTolerance?: number
  /** Tolerance for duration matching as percentage (default: 0.10 = 10%) */
  durationTolerance?: number
  /** Tolerance for distance matching as percentage (default: 0.05 = 5%) */
  distanceTolerance?: number
  /** Enable debug logging */
  debug?: boolean
}

// Source priority - higher = preferred
const SOURCE_PRIORITY: Record<ActivitySource, number> = {
  concept2: 5, // Most accurate - direct from equipment
  strava: 4, // Good quality, widely used
  garmin: 3, // Good quality, but often syncs same activity as Strava
  ai: 2, // AI-generated, less metadata
  manual: 1, // User input, least reliable
  adhoc: 1, // Ad-hoc workout input, same as manual
}

const DEFAULT_OPTIONS: Required<DeduplicationOptions> = {
  timeTolerance: 15 * 60 * 1000, // 15 minutes in ms
  durationTolerance: 0.10, // 10%
  distanceTolerance: 0.05, // 5%
  debug: false,
}

/**
 * Deduplicate activities from multiple sources
 *
 * @param activities - Array of normalized activities from all sources
 * @param options - Deduplication options
 * @returns Deduplicated activities with match information
 */
export function deduplicateActivities(
  activities: NormalizedActivity[],
  options?: DeduplicationOptions
): DeduplicationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const matchedPairs: DeduplicationResult['matchedPairs'] = []

  // Sort by source priority (highest first) so we prefer better sources
  const sorted = [...activities].sort((a, b) => {
    const priorityDiff = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]
    if (priorityDiff !== 0) return priorityDiff
    // If same priority, prefer newer date
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const kept: NormalizedActivity[] = []
  const removedIds = new Set<string>()

  for (const activity of sorted) {
    if (removedIds.has(activity.id)) {
      continue
    }

    // Check if this activity matches any already-kept activity
    let isDuplicate = false
    let matchedWith: NormalizedActivity | null = null
    let matchReason = ''
    let confidence = 0

    for (const keptActivity of kept) {
      const match = checkMatch(activity, keptActivity, opts)
      if (match.isMatch) {
        isDuplicate = true
        matchedWith = keptActivity
        matchReason = match.reason
        confidence = match.confidence
        break
      }
    }

    if (isDuplicate && matchedWith) {
      // This activity is a duplicate - the kept one has higher priority
      removedIds.add(activity.id)
      matchedPairs.push({
        kept: matchedWith,
        removed: activity,
        matchReason,
        confidence,
      })

      if (opts.debug) {
        console.log(
          `[Dedup] Removed ${activity.source}:${activity.id} as duplicate of ${matchedWith.source}:${matchedWith.id} (${matchReason}, confidence: ${confidence.toFixed(2)})`
        )
      }
    } else {
      kept.push(activity)
    }
  }

  return {
    deduplicated: kept,
    duplicatesRemoved: matchedPairs.length,
    matchedPairs,
  }
}

interface MatchResult {
  isMatch: boolean
  reason: string
  confidence: number
}

/**
 * Check if two activities are duplicates
 */
function checkMatch(
  a: NormalizedActivity,
  b: NormalizedActivity,
  opts: Required<DeduplicationOptions>
): MatchResult {
  // Must be same day
  const dateA = new Date(a.date).toISOString().split('T')[0]
  const dateB = new Date(b.date).toISOString().split('T')[0]

  if (dateA !== dateB) {
    return { isMatch: false, reason: 'different_day', confidence: 0 }
  }

  // Must be same or compatible type
  if (!areTypesCompatible(a.type, b.type)) {
    return { isMatch: false, reason: 'incompatible_type', confidence: 0 }
  }

  let confidence = 0
  const reasons: string[] = []

  // Check start time if available
  if (a.startTime && b.startTime) {
    const timeDiff = Math.abs(
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    if (timeDiff <= opts.timeTolerance) {
      confidence += 0.4
      reasons.push(`start_time_within_${Math.round(timeDiff / 60000)}min`)
    } else {
      // Start times too far apart - not a match
      return { isMatch: false, reason: 'start_time_too_far', confidence: 0 }
    }
  } else {
    // No start time - add small confidence for same day match
    confidence += 0.1
    reasons.push('same_day')
  }

  // Check duration
  if (a.duration > 0 && b.duration > 0) {
    const durationDiff = Math.abs(a.duration - b.duration)
    const maxDuration = Math.max(a.duration, b.duration)
    const durationRatio = durationDiff / maxDuration

    if (durationRatio <= opts.durationTolerance) {
      confidence += 0.3
      reasons.push(`duration_within_${Math.round(durationRatio * 100)}%`)
    } else if (durationRatio <= opts.durationTolerance * 2) {
      // Slightly outside tolerance - lower confidence
      confidence += 0.1
      reasons.push(`duration_within_${Math.round(durationRatio * 100)}%_loose`)
    }
  }

  // Check distance
  if (a.distance && b.distance && a.distance > 0 && b.distance > 0) {
    const distanceDiff = Math.abs(a.distance - b.distance)
    const maxDistance = Math.max(a.distance, b.distance)
    const distanceRatio = distanceDiff / maxDistance

    if (distanceRatio <= opts.distanceTolerance) {
      confidence += 0.3
      reasons.push(`distance_within_${Math.round(distanceRatio * 100)}%`)
    } else if (distanceRatio <= opts.distanceTolerance * 2) {
      confidence += 0.1
      reasons.push(`distance_within_${Math.round(distanceRatio * 100)}%_loose`)
    }
  }

  // Boost confidence for same type
  if (a.type === b.type) {
    confidence += 0.1
    reasons.push('exact_type')
  }

  // Threshold for considering a match
  // Higher confidence required if we don't have start time
  const threshold = a.startTime && b.startTime ? 0.5 : 0.6

  return {
    isMatch: confidence >= threshold,
    reason: reasons.join('+'),
    confidence,
  }
}

/**
 * Check if two activity types are compatible (could be the same activity)
 */
function areTypesCompatible(typeA: string, typeB: string): boolean {
  const normalizedA = normalizeType(typeA)
  const normalizedB = normalizeType(typeB)

  if (normalizedA === normalizedB) {
    return true
  }

  // Compatible type groups
  const compatibleGroups: string[][] = [
    ['RUNNING', 'RUN', 'TRAIL_RUNNING', 'TRAIL_RUN', 'TREADMILL'],
    ['CYCLING', 'RIDE', 'VIRTUAL_RIDE', 'INDOOR_CYCLING', 'INDOOR_RIDE'],
    ['ROWING', 'INDOOR_ROWING', 'ROWER'],
    ['SKIING', 'SKIERG', 'CROSS_COUNTRY_SKI', 'NORDIC_SKI'],
    ['SWIMMING', 'SWIM', 'POOL_SWIM', 'OPEN_WATER_SWIM'],
    ['STRENGTH', 'WEIGHT_TRAINING', 'WEIGHTS', 'GYM'],
    ['WALKING', 'WALK', 'HIKE', 'HIKING'],
  ]

  for (const group of compatibleGroups) {
    if (group.includes(normalizedA) && group.includes(normalizedB)) {
      return true
    }
  }

  return false
}

/**
 * Normalize activity type string
 */
function normalizeType(type: string): string {
  return type.toUpperCase().replace(/[\s-]/g, '_')
}

/**
 * Normalize a Strava activity to the unified format
 */
export function normalizeStravaActivity(activity: {
  id: string
  startDate: Date
  movingTime?: number | null
  distance?: number | null
  mappedType?: string | null
  type?: string | null
  tss?: number | null
  trimp?: number | null
  averageHeartrate?: number | null
  stravaId?: string
}): NormalizedActivity {
  return {
    id: `strava-${activity.id}`,
    source: 'strava',
    date: activity.startDate,
    startTime: activity.startDate,
    duration: activity.movingTime || 0,
    type: activity.mappedType || activity.type || 'OTHER',
    distance: activity.distance || undefined,
    tss: activity.tss || undefined,
    trimp: activity.trimp || undefined,
    avgHR: activity.averageHeartrate || undefined,
    originalId: activity.stravaId || activity.id,
  }
}

/**
 * Normalize a Garmin activity (from GarminActivity model or legacy JSON) to the unified format
 */
export function normalizeGarminActivity(
  activity: {
    activityId?: string | number // UUID from GarminActivity model or legacy number
    type?: string
    mappedType?: string
    duration?: number
    distance?: number
    tss?: number
    avgHR?: number
    startTimeSeconds?: number
  },
  date: Date
): NormalizedActivity {
  // Garmin startTimeSeconds is Unix timestamp if available
  const startTime = activity.startTimeSeconds
    ? new Date(activity.startTimeSeconds * 1000)
    : date

  return {
    id: `garmin-${activity.activityId || Date.now()}`,
    source: 'garmin',
    date,
    startTime,
    duration: activity.duration || 0,
    type: activity.mappedType || activity.type || 'OTHER',
    distance: activity.distance || undefined,
    tss: activity.tss || undefined,
    avgHR: activity.avgHR || undefined,
    originalId: typeof activity.activityId === 'number' ? activity.activityId : undefined,
  }
}

/**
 * Normalize a Concept2 result to the unified format
 */
export function normalizeConcept2Activity(result: {
  id: string
  date: Date
  time?: number | null // tenths of seconds
  distance?: number | null
  mappedType?: string | null
  type?: string
  tss?: number | null
  trimp?: number | null
  avgHeartRate?: number | null
  concept2Id?: number | null
}): NormalizedActivity {
  return {
    id: `concept2-${result.id}`,
    source: 'concept2',
    date: result.date,
    startTime: result.date, // Concept2 date is typically precise
    duration: result.time ? Math.round(result.time / 10) : 0, // Convert tenths to seconds
    type: result.mappedType || 'ROWING',
    distance: result.distance || undefined,
    tss: result.tss || undefined,
    trimp: result.trimp || undefined,
    avgHR: result.avgHeartRate || undefined,
    originalId: result.concept2Id || result.id,
  }
}

/**
 * Normalize a manual workout log to the unified format
 */
export function normalizeWorkoutLog(log: {
  id: string
  completedAt?: Date | null
  duration?: number | null // minutes
  distance?: number | null // km
  workout?: { type?: string | null } | null
  avgHR?: number | null
}): NormalizedActivity {
  const date = log.completedAt || new Date()
  return {
    id: `manual-${log.id}`,
    source: 'manual',
    date,
    startTime: date,
    duration: (log.duration || 0) * 60, // Convert minutes to seconds
    type: log.workout?.type || 'OTHER',
    distance: log.distance ? log.distance * 1000 : undefined, // Convert km to meters
    avgHR: log.avgHR || undefined,
    originalId: log.id,
  }
}

/**
 * Normalize an AI WOD to the unified format
 */
export function normalizeAIWod(wod: {
  id: string
  completedAt?: Date | null
  createdAt: Date
  actualDuration?: number | null // minutes
  requestedDuration?: number | null // minutes
  primarySport?: string | null
  sessionRPE?: number | null
}): NormalizedActivity {
  const date = wod.completedAt || wod.createdAt
  const durationMin = wod.actualDuration || wod.requestedDuration || 0

  // Estimate TSS from RPE: TSS ≈ duration * RPE * 0.8
  const estimatedTSS = wod.sessionRPE
    ? Math.round(durationMin * wod.sessionRPE * 0.8)
    : undefined

  return {
    id: `ai-${wod.id}`,
    source: 'ai',
    date,
    startTime: date,
    duration: durationMin * 60, // Convert minutes to seconds
    type: wod.primarySport || 'STRENGTH',
    tss: estimatedTSS,
    originalId: wod.id,
  }
}

/**
 * Aggregate TSS from deduplicated activities by day
 *
 * @param activities - Deduplicated normalized activities
 * @returns Object with date keys (YYYY-MM-DD) and TSS values
 */
export function aggregateTSSByDay(
  activities: NormalizedActivity[]
): Record<string, number> {
  const dailyTSS: Record<string, number> = {}

  for (const activity of activities) {
    const dateKey = new Date(activity.date).toISOString().split('T')[0]
    const tss = activity.tss || estimateTSSFromDuration(activity.duration)

    dailyTSS[dateKey] = (dailyTSS[dateKey] || 0) + tss
  }

  return dailyTSS
}

/**
 * Estimate TSS from duration if not available
 * Assumes moderate intensity (~60 TSS per hour)
 */
function estimateTSSFromDuration(durationSeconds: number): number {
  return Math.round((durationSeconds / 3600) * 60)
}

/**
 * Aggregate activities by type with deduplication
 */
export function aggregateByType(
  activities: NormalizedActivity[]
): Record<string, { count: number; tss: number; distance: number }> {
  const byType: Record<string, { count: number; tss: number; distance: number }> = {}

  for (const activity of activities) {
    const type = activity.type || 'OTHER'
    if (!byType[type]) {
      byType[type] = { count: 0, tss: 0, distance: 0 }
    }

    byType[type].count++
    byType[type].tss += activity.tss || estimateTSSFromDuration(activity.duration)
    byType[type].distance += (activity.distance || 0) / 1000 // Convert to km
  }

  return byType
}
