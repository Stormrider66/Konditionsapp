'use client'

export type CalendarSidebarTranslation = (
  key: string,
  values?: Record<string, string | number>
) => string
type AppLocale = 'en' | 'sv'

function resolveLabel(
  maps: Record<string, string>,
  fallbackValues: Record<string, string>,
  value: string | null | undefined,
  fallback: string,
  t?: CalendarSidebarTranslation,
  keyPrefix?: string,
): string {
  const key = value && maps[value]
  if (key && t && keyPrefix) {
    return t(`${keyPrefix}.${key}`)
  }

  if (key && fallbackValues[key]) {
    return fallbackValues[key]
  }

  return key ? value : fallback
}

export function formatDistanceValue(distance: unknown): { label: string | null } {
  if (typeof distance === 'number' && Number.isFinite(distance) && distance > 0) {
    return { label: `${distance % 1 === 0 ? distance.toFixed(0) : distance.toFixed(1)} km` }
  }
  if (typeof distance === 'string' && distance.trim()) {
    const normalized = distance.trim()
    return { label: normalized.includes('km') ? normalized : `${normalized} km` }
  }
  return { label: null }
}

export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '-'
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} s`
  }
  return `${minutes} min`
}

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  RUNNING: 'running',
  STRENGTH: 'strength',
  PLYOMETRIC: 'plyometric',
  CORE: 'core',
  RECOVERY: 'recovery',
  CYCLING: 'cycling',
  SKIING: 'skiing',
  SWIMMING: 'swimming',
  TRIATHLON: 'triathlon',
  HYROX: 'hyrox',
  ALTERNATIVE: 'alternative',
  OTHER: 'other',
}
const WORKOUT_TYPE_FALLBACK: Record<string, string> = {
  running: 'Running',
  strength: 'Strength',
  plyometric: 'Plyometrics',
  core: 'Core',
  recovery: 'Recovery',
  cycling: 'Cycling',
  skiing: 'Skiing',
  swimming: 'Swimming',
  triathlon: 'Triathlon',
  hyrox: 'HYROX',
  alternative: 'Alternative',
  other: 'Other',
}

export function formatWorkoutTypeLabel(type?: string | null, t?: CalendarSidebarTranslation): string {
  return resolveLabel(WORKOUT_TYPE_LABELS, WORKOUT_TYPE_FALLBACK, type, 'Workout', t, 'formatters.workoutType')
}

const INTENSITY_LABELS: Record<string, string> = {
  RECOVERY: 'recovery',
  EASY: 'easy',
  MODERATE: 'moderate',
  THRESHOLD: 'threshold',
  INTERVAL: 'interval',
  MAX: 'max',
}
const INTENSITY_FALLBACK: Record<string, string> = {
  recovery: 'Recovery',
  easy: 'Easy',
  moderate: 'Moderate',
  threshold: 'Threshold',
  interval: 'Interval',
  max: 'Max',
}

export function formatIntensityLabel(intensity?: string | null, t?: CalendarSidebarTranslation): string {
  return resolveLabel(INTENSITY_LABELS, INTENSITY_FALLBACK, intensity, 'Pass', t, 'formatters.intensity')
}

const FEELING_LABELS: Record<string, string> = {
  Great: 'great',
  Good: 'good',
  Okay: 'okay',
  Tired: 'tired',
  Struggled: 'struggled',
}
const FEELING_FALLBACK: Record<string, string> = {
  great: 'Great',
  good: 'Good',
  okay: 'Okay',
  tired: 'Tired',
  struggled: 'Struggled',
}

export function formatFeelingLabel(feeling?: string | null, t?: CalendarSidebarTranslation): string {
  const mapped = FEELING_LABELS[feeling || '']
  if (mapped && t) {
    return t(`formatters.feeling.${mapped}`)
  }
  if (mapped && FEELING_FALLBACK[mapped]) {
    return FEELING_FALLBACK[mapped]
  }
  return feeling || '-'
}

const AD_HOC_INPUT_TYPE_LABELS: Record<string, string> = {
  PHOTO: 'photo',
  AUDIO: 'audio',
  TEXT: 'text',
  MANUAL_FORM: 'manual',
  GARMIN: 'garmin',
  STRAVA: 'strava',
  TEMPLATE: 'template',
}
const AD_HOC_INPUT_TYPE_FALLBACK: Record<string, string> = {
  photo: 'Photo',
  audio: 'Audio',
  text: 'Text',
  manual: 'Manual',
  garmin: 'Garmin',
  strava: 'Strava',
  template: 'Template',
}

export function formatAdHocInputType(inputType?: string | null, t?: CalendarSidebarTranslation): string {
  return resolveLabel(AD_HOC_INPUT_TYPE_LABELS, AD_HOC_INPUT_TYPE_FALLBACK, inputType, 'Ad-hoc', t, 'formatters.adHocInputType')
}

export function formatAdHocTypeLabel(parsedType?: string | null, t?: CalendarSidebarTranslation): string {
  return formatWorkoutTypeLabel(parsedType || 'OTHER', t)
}

const RACE_DISTANCE_LABELS: Record<string, string> = {
  '5K': 'fiveKilometer',
  '10K': 'tenKilometer',
  HALF_MARATHON: 'halfMarathon',
  MARATHON: 'marathon',
  CUSTOM: 'custom',
}
const RACE_DISTANCE_FALLBACK: Record<string, string> = {
  fiveKilometer: '5 km result',
  tenKilometer: '10 km result',
  halfMarathon: 'Half marathon result',
  marathon: 'Marathon result',
  custom: 'Race result',
}

export function formatRaceDistanceLabel(distance?: string | null, t?: CalendarSidebarTranslation): string {
  return resolveLabel(RACE_DISTANCE_LABELS, RACE_DISTANCE_FALLBACK, distance, 'Race result', t, 'formatters.raceDistance')
}

export function getAdHocPreviewItems(
  parsed: Record<string, unknown>,
  locale: AppLocale = 'en',
  t?: CalendarSidebarTranslation,
): string[] {
  const items: string[] = []

  const strengthExercises = Array.isArray(parsed.strengthExercises) ? parsed.strengthExercises : []
  for (const exercise of strengthExercises.slice(0, 3)) {
    if (exercise && typeof exercise === 'object') {
      const nameSv = typeof (exercise as { nameSv?: unknown }).nameSv === 'string'
        ? (exercise as { nameSv?: string }).nameSv
        : null
      const name = typeof (exercise as { name?: unknown }).name === 'string'
        ? (exercise as { name?: string }).name
        : null
      const nameEn = typeof (exercise as { nameEn?: unknown }).nameEn === 'string'
        ? (exercise as { nameEn?: string }).nameEn
        : null
      if (nameSv || name || nameEn) {
        items.push(locale === 'sv' ? nameSv || name || nameEn || '' : nameEn || name || nameSv || '')
      }
    }
  }

  const cardioSegments = Array.isArray(parsed.cardioSegments) ? parsed.cardioSegments : []
  for (const segment of cardioSegments.slice(0, 3 - items.length)) {
    if (segment && typeof segment === 'object') {
      const segmentType = typeof (segment as { type?: unknown }).type === 'string'
        ? (segment as { type?: string }).type
        : null
      const duration = typeof (segment as { duration?: unknown }).duration === 'number'
        ? (segment as { duration?: number }).duration
        : null
      if (segmentType) {
        const label = formatCardioSegmentLabel(segmentType, t)
        items.push(`${label}${duration ? ` ${duration} min` : ''}`)
      }
    }
  }

  const hybridMovements = Array.isArray(parsed.hybridMovements) ? parsed.hybridMovements : []
  for (const movement of hybridMovements.slice(0, 3 - items.length)) {
    if (movement && typeof movement === 'object') {
      const name = typeof (movement as { movementName?: unknown }).movementName === 'string'
        ? (movement as { movementName?: string }).movementName
        : null
      if (name) {
        items.push(name)
      }
    }
  }

  return items.slice(0, 3)
}

const CARDIO_SEGMENT_LABELS: Record<string, string> = {
  WARMUP: 'warmup',
  WORK: 'work',
  INTERVAL: 'interval',
  RECOVERY: 'recovery',
  COOLDOWN: 'cooldown',
  REST: 'rest',
}
const CARDIO_SEGMENT_FALLBACK: Record<string, string> = {
  warmup: 'Warm-up',
  work: 'Work',
  interval: 'Interval',
  recovery: 'Recovery',
  cooldown: 'Cool-down',
  rest: 'Vila',
}

export function formatCardioSegmentLabel(type: string, t?: CalendarSidebarTranslation): string {
  return resolveLabel(CARDIO_SEGMENT_LABELS, CARDIO_SEGMENT_FALLBACK, type, type, t, 'formatters.cardioSegment')
}

const CONFIDENCE_LABELS: Record<string, string> = {
  VERY_HIGH: 'veryHigh',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}
const CONFIDENCE_FALLBACK: Record<string, string> = {
  veryHigh: 'Very high confidence',
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

export function formatConfidenceLabel(confidence?: string | null, t?: CalendarSidebarTranslation): string | null {
  return confidence ? resolveLabel(CONFIDENCE_LABELS, CONFIDENCE_FALLBACK, confidence, confidence, t, 'formatters.confidence') : null
}

const FIELD_TEST_TYPES: Record<string, string> = {
  THIRTY_MIN_TT: 'thirtyMinuteTT',
  TWENTY_MIN_TT: 'twentyMinuteTT',
  HR_DRIFT: 'heartRateDrift',
  CRITICAL_VELOCITY: 'criticalVelocity',
  RACE_BASED: 'raceBased',
}
const FIELD_TEST_TYPES_FALLBACK: Record<string, string> = {
  thirtyMinuteTT: '30 min TT',
  twentyMinuteTT: '20 min TT',
  heartRateDrift: 'HR drift',
  criticalVelocity: 'Critical Velocity',
  raceBased: 'Race-based',
}

export function formatFieldTestType(type?: string, t?: CalendarSidebarTranslation): string {
  return resolveLabel(FIELD_TEST_TYPES, FIELD_TEST_TYPES_FALLBACK, type || 'RACE_BASED', 'Field test', t, 'formatters.fieldTestType')
}

export function formatPaceSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}/km`
}

export function normalizeMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  return []
}

export function getFieldTestMetrics(results: Record<string, unknown> | null, t?: CalendarSidebarTranslation): string[] {
  if (!results) return []
  const metrics: string[] = []

  if (typeof results.thresholdPace === 'number') {
    metrics.push(t?.('fieldTest.metrics.thresholdPace', { pace: formatPaceSeconds(results.thresholdPace) }) || `Threshold pace ${formatPaceSeconds(results.thresholdPace)}`)
  }
  if (typeof results.thresholdHR === 'number') {
    metrics.push(t?.('fieldTest.metrics.thresholdHr', { value: Math.round(results.thresholdHR) }) || `Threshold HR ${Math.round(results.thresholdHR)} bpm`)
  }
  if (typeof results.driftPercent === 'number') {
    metrics.push(t?.('fieldTest.metrics.drift', { value: results.driftPercent.toFixed(1) }) || `Drift ${results.driftPercent.toFixed(1)}%`)
  }
  if (typeof results.criticalVelocity === 'number') {
    metrics.push(t?.('fieldTest.metrics.criticalVelocity', { value: results.criticalVelocity.toFixed(2) }) || `CV ${results.criticalVelocity.toFixed(2)} m/s`)
  }
  if (typeof results.vdot === 'number') {
    metrics.push(t?.('fieldTest.metrics.vdot', { value: results.vdot.toFixed(1) }) || `VDOT ${results.vdot.toFixed(1)}`)
  }

  return metrics.slice(0, 4)
}
