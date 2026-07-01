type RecordedCardioSegment = {
  segmentIndex: number
  actualDuration: number | null
  startedAt?: Date | string | null
  completedAt?: Date | string | null
  completed: boolean
  skipped: boolean
}

type ForTimeCardioSegment = {
  type: string
  plannedDuration?: number | null
  plannedDistance?: number | null
  plannedCalories?: number | null
  actualDuration?: number | null
  completed: boolean
  skipped: boolean
}

function timestampMs(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(milliseconds) ? milliseconds : null
}

/**
 * Returns the recorded active duration for one finalized segment.
 * A zero duration is treated as missing because time-to-target efforts can
 * briefly reach completion before their elapsed time is copied into state.
 */
export function recordedCardioSegmentDurationSeconds(
  segment: RecordedCardioSegment,
): number | null {
  if (segment.skipped) return 0
  if (!segment.completed) return null

  if (
    typeof segment.actualDuration === 'number' &&
    Number.isFinite(segment.actualDuration) &&
    segment.actualDuration > 0
  ) {
    return Math.round(segment.actualDuration)
  }

  const startedAt = timestampMs(segment.startedAt)
  const completedAt = timestampMs(segment.completedAt)
  if (startedAt === null || completedAt === null || completedAt <= startedAt) return null

  return Math.max(1, Math.round((completedAt - startedAt) / 1000))
}

/**
 * Resolves a session total from its finalized segment logs. The derived total
 * is used only when every expected segment is present; otherwise the stored
 * session-level duration remains the safer fallback.
 */
export function resolveRecordedCardioDurationSeconds({
  segmentLogs,
  expectedSegmentCount,
  fallbackDuration,
}: {
  segmentLogs: RecordedCardioSegment[]
  expectedSegmentCount: number
  fallbackDuration?: number | null
}): number | null {
  const fallback =
    typeof fallbackDuration === 'number' && Number.isFinite(fallbackDuration)
      ? Math.max(0, Math.round(fallbackDuration))
      : null

  if (expectedSegmentCount <= 0) return fallback

  const byIndex = new Map(segmentLogs.map((segment) => [segment.segmentIndex, segment]))
  let total = 0

  for (let index = 0; index < expectedSegmentCount; index += 1) {
    const segment = byIndex.get(index)
    if (!segment || (!segment.completed && !segment.skipped)) return fallback

    const duration = recordedCardioSegmentDurationSeconds(segment)
    if (duration === null) return fallback
    total += duration
  }

  return total
}

/**
 * Returns the scored interval result for a completed "for time" workout.
 * Warm-up, cool-down, recovery, and fixed-duration intervals are excluded.
 */
export function resolveCardioForTimeResultSeconds(
  segments: ForTimeCardioSegment[],
): number | null {
  const workTypes = new Set(['INTERVAL', 'STEADY', 'HILL', 'DRILLS'])
  const scoredSegments = segments.filter((segment) => (
    workTypes.has(segment.type) &&
    segment.plannedDuration == null &&
    (segment.plannedCalories != null || segment.plannedDistance != null)
  ))

  if (scoredSegments.length === 0) return null
  if (scoredSegments.some((segment) => (
    !segment.completed ||
    segment.skipped ||
    typeof segment.actualDuration !== 'number' ||
    !Number.isFinite(segment.actualDuration) ||
    segment.actualDuration <= 0
  ))) return null

  return scoredSegments.reduce(
    (total, segment) => total + Math.round(segment.actualDuration ?? 0),
    0,
  )
}
