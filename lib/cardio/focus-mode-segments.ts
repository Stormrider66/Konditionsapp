import type { CardioSegmentType, Prisma } from '@prisma/client'

export type AppLocale = 'en' | 'sv'

export interface CardioSegmentData {
  id?: string
  type?: string
  duration?: number
  distance?: number
  calories?: number
  pace?: string
  zone?: number
  notes?: string
  exercises?: Array<{
    name?: string
    sets?: number
    reps?: string
    notes?: string
  }>
  repeats?: number
  restDuration?: number
  steps?: CardioChildStepData[]
  restBetweenRounds?: number
}

interface CardioChildStepData {
  id?: string
  type?: string
  duration?: number
  distance?: number
  calories?: number
  pace?: string
  zone?: number
  notes?: string
  targetType?: string
  targetValue?: string
}

interface SegmentLogData {
  id: string
  segmentIndex: number
  actualDuration: number | null
  actualDistance: number | null
  actualPace: number | null
  actualAvgHR: number | null
  actualMaxHR: number | null
  completed: boolean
  skipped: boolean
}

export interface FocusModeSegment {
  id: string
  index: number
  type: CardioSegmentType
  typeName: string
  plannedDuration?: number
  plannedDistance?: number
  plannedPace?: number
  plannedZone?: number
  notes?: string
  actualDuration?: number
  actualDistance?: number
  actualPace?: number
  actualAvgHR?: number
  actualMaxHR?: number
  completed: boolean
  skipped: boolean
  logId?: string
}

const SEGMENT_TYPE_NAMES: Record<AppLocale, Record<string, string>> = {
  en: {
    WARMUP: 'Warm-up',
    COOLDOWN: 'Cool-down',
    INTERVAL: 'Interval',
    STEADY: 'Steady',
    RECOVERY: 'Recovery',
    REST: 'Rest',
    HILL: 'Hill',
    DRILLS: 'Drills',
    CORE: 'Core',
    PREHAB: 'Stability / Prehab',
    PLYOMETRIC: 'Plyometrics',
  },
  sv: {
    WARMUP: 'Uppvärmning',
    COOLDOWN: 'Nedvarvning',
    INTERVAL: 'Intervall',
    STEADY: 'Jämn',
    RECOVERY: 'Återhämtning',
    REST: 'Vila',
    HILL: 'Backe',
    DRILLS: 'Övningar',
    CORE: 'Core',
    PREHAB: 'Stabilitet / Prehab',
    PLYOMETRIC: 'Plyometri',
  },
}

const VALID_SEGMENT_TYPES = new Set([
  'WARMUP',
  'COOLDOWN',
  'INTERVAL',
  'STEADY',
  'RECOVERY',
  'HILL',
  'DRILLS',
])

export function parsePaceToSeconds(pace: string | undefined): number | undefined {
  if (!pace) return undefined

  if (pace.includes(':')) {
    const parts = pace.split(':')
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10)
      const seconds = parseInt(parts[1], 10)
      if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
        return minutes * 60 + seconds
      }
    }
  } else {
    const numericPace = parseInt(pace, 10)
    if (!Number.isNaN(numericPace) && numericPace > 0) {
      return numericPace
    }
  }

  return undefined
}

function segmentTypeName(type: string, fallback: string | undefined, locale: AppLocale): string {
  return SEGMENT_TYPE_NAMES[locale][type] || fallback || type
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function normalizeSegmentType(type: string | undefined, fallback: CardioSegmentType): CardioSegmentType {
  const normalized = (type || '').toUpperCase()
  if (normalized === 'REST') return 'RECOVERY' as CardioSegmentType
  if (VALID_SEGMENT_TYPES.has(normalized)) return normalized as CardioSegmentType
  return fallback
}

function rawSegments(segments: Prisma.JsonValue): CardioSegmentData[] {
  return Array.isArray(segments) ? (segments as unknown as CardioSegmentData[]) : []
}

function logValues(log: SegmentLogData | undefined) {
  return {
    actualDuration: log?.actualDuration ?? undefined,
    actualDistance: log?.actualDistance ?? undefined,
    actualPace: log?.actualPace ?? undefined,
    actualAvgHR: log?.actualAvgHR ?? undefined,
    actualMaxHR: log?.actualMaxHR ?? undefined,
    completed: log?.completed ?? false,
    skipped: log?.skipped ?? false,
    logId: log?.id,
  }
}

export function buildCardioFocusModeSegments({
  segments,
  segmentLogs = [],
  locale,
}: {
  segments: Prisma.JsonValue
  segmentLogs?: SegmentLogData[]
  locale: AppLocale
}): FocusModeSegment[] {
  const segmentLogMap = new Map(segmentLogs.map((log) => [log.segmentIndex, log]))
  const focusModeSegments: FocusModeSegment[] = []
  let globalIndex = 0

  for (const seg of rawSegments(segments)) {
    if (seg.type === 'REPEAT_GROUP' && seg.steps && seg.steps.length > 0) {
      const repeats = seg.repeats || 1
      for (let rep = 0; rep < repeats; rep++) {
        for (const step of seg.steps) {
          const log = segmentLogMap.get(globalIndex)
          const segmentType = normalizeSegmentType(step.type, 'INTERVAL' as CardioSegmentType)
          const rawType = (step.type?.toUpperCase() || segmentType)
          const calLabel = step.calories ? `${step.calories} cal` : ''
          const targetLabel = step.targetType && step.targetType !== 'none' && step.targetValue
            ? `${step.targetValue} ${step.targetType === 'power' ? 'W' : step.targetType === 'cadence' ? 'rpm' : ''}`
            : ''
          const noteParts = [
            t(locale, `Round ${rep + 1}/${repeats}`, `Runda ${rep + 1}/${repeats}`),
            step.notes,
            calLabel,
            targetLabel,
          ].filter(Boolean)

          focusModeSegments.push({
            id: `${seg.id || 'repeat'}-r${rep}-${step.id || globalIndex}`,
            index: globalIndex,
            type: segmentType,
            typeName: segmentTypeName(rawType, step.type, locale),
            plannedDuration: step.duration,
            plannedDistance: step.distance ? step.distance / 1000 : undefined,
            plannedPace: parsePaceToSeconds(step.pace),
            plannedZone: step.zone,
            notes: noteParts.join(' - '),
            ...logValues(log),
          })
          globalIndex++
        }

        if (seg.restBetweenRounds && seg.restBetweenRounds > 0 && rep < repeats - 1) {
          const log = segmentLogMap.get(globalIndex)
          focusModeSegments.push({
            id: `${seg.id || 'repeat'}-r${rep}-rest`,
            index: globalIndex,
            type: 'RECOVERY' as CardioSegmentType,
            typeName: t(locale, 'Rest between rounds', 'Vila mellan rundor'),
            plannedDuration: seg.restBetweenRounds,
            notes: t(locale, `Round ${rep + 1}/${repeats} complete`, `Runda ${rep + 1}/${repeats} klar`),
            ...logValues(log),
          })
          globalIndex++
        }
      }
      continue
    }

    if (seg.repeats && seg.repeats > 1) {
      for (let rep = 0; rep < seg.repeats; rep++) {
        const log = segmentLogMap.get(globalIndex)
        const segmentType = normalizeSegmentType(seg.type, 'INTERVAL' as CardioSegmentType)
        const rawType = seg.type?.toUpperCase() || segmentType
        const calLabel = seg.calories ? `${seg.calories} cal` : ''
        const noteParts = [`${rep + 1}/${seg.repeats}`, seg.notes, calLabel].filter(Boolean)

        focusModeSegments.push({
          id: `${seg.id || 'segment'}-rep${rep}`,
          index: globalIndex,
          type: segmentType,
          typeName: segmentTypeName(rawType, seg.type, locale),
          plannedDuration: seg.duration,
          plannedDistance: seg.distance ? seg.distance / 1000 : undefined,
          plannedPace: parsePaceToSeconds(seg.pace),
          plannedZone: seg.zone,
          notes: noteParts.join(' - '),
          ...logValues(log),
        })
        globalIndex++

        if (seg.restDuration && seg.restDuration > 0 && rep < seg.repeats - 1) {
          const restLog = segmentLogMap.get(globalIndex)
          focusModeSegments.push({
            id: `${seg.id || 'segment'}-rest${rep}`,
            index: globalIndex,
            type: 'RECOVERY' as CardioSegmentType,
            typeName: segmentTypeName('REST', 'REST', locale),
            plannedDuration: seg.restDuration,
            ...logValues(restLog),
          })
          globalIndex++
        }
      }
      continue
    }

    const log = segmentLogMap.get(globalIndex)
    const segmentType = normalizeSegmentType(seg.type, 'STEADY' as CardioSegmentType)
    const rawType = seg.type?.toUpperCase() || segmentType
    const calLabel = seg.calories ? `${seg.calories} cal` : ''
    const exerciseLabel = seg.exercises?.length
      ? seg.exercises.map((exercise) => [
        exercise.name,
        exercise.sets ? `${exercise.sets} set` : undefined,
        exercise.reps,
        exercise.notes,
      ].filter(Boolean).join(' * ')).join(' - ')
      : ''
    const noteParts = [seg.notes, exerciseLabel, calLabel].filter(Boolean)

    focusModeSegments.push({
      id: seg.id || `segment-${globalIndex}`,
      index: globalIndex,
      type: segmentType,
      typeName: segmentTypeName(rawType, seg.type, locale),
      plannedDuration: seg.duration,
      plannedDistance: seg.distance ? seg.distance / 1000 : undefined,
      plannedPace: parsePaceToSeconds(seg.pace),
      plannedZone: seg.zone,
      notes: noteParts.join(' - ') || seg.notes,
      ...logValues(log),
    })
    globalIndex++
  }

  return focusModeSegments
}
