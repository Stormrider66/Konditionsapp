import { subDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import type {
  WODAthleteContext,
  WODAutoIntent,
  WODEquipment,
  WODFocusArea,
  WODMode,
  WODWorkoutType,
} from '@/types/wod'
import type { ParsedWorkout } from '@/lib/adhoc-workout/types'

type AppLocale = 'en' | 'sv'

type RhythmSample = {
  date: Date
  workoutType: WODWorkoutType
  duration?: number | null
  intensity?: string | null
  equipment?: WODEquipment[]
  source: 'program' | 'adhoc' | 'wod'
}

const LOOKBACK_DAYS = 56

export async function inferWODRhythmIntent(
  clientId: string,
  context: WODAthleteContext,
  locale: AppLocale = 'en',
  now: Date = new Date()
): Promise<WODAutoIntent> {
  const since = subDays(now, LOOKBACK_DAYS)
  const [programLogs, adHocWorkouts, generatedWods] = await Promise.all([
    prisma.workoutLog.findMany({
      where: {
        workout: {
          day: {
            week: {
              program: { clientId },
            },
          },
        },
        completed: true,
        completedAt: { gte: since },
      },
      select: {
        completedAt: true,
        duration: true,
        perceivedEffort: true,
        workout: {
          select: {
            type: true,
            intensity: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 80,
    }),
    prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        status: 'CONFIRMED',
        workoutDate: { gte: since },
      },
      select: {
        workoutDate: true,
        parsedType: true,
        parsedStructure: true,
      },
      orderBy: { workoutDate: 'desc' },
      take: 80,
    }),
    prisma.aIGeneratedWOD.findMany({
      where: {
        clientId,
        status: 'COMPLETED',
        completedAt: { gte: since },
      },
      select: {
        completedAt: true,
        workoutType: true,
        requestedDuration: true,
        equipment: true,
        intensityAdjusted: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 80,
    }),
  ])

  const samples: RhythmSample[] = [
    ...programLogs
      .filter((log) => log.completedAt)
      .map((log) => ({
        date: log.completedAt as Date,
        workoutType: mapAnyWorkoutType(log.workout.type),
        duration: log.duration,
        intensity: log.workout.intensity,
        source: 'program' as const,
      })),
    ...adHocWorkouts.map((workout) => {
      const parsed = workout.parsedStructure as ParsedWorkout | null
      return {
        date: workout.workoutDate,
        workoutType: mapAnyWorkoutType(parsed?.type || workout.parsedType),
        duration: parsed?.duration ?? null,
        intensity: parsed?.intensity ?? null,
        source: 'adhoc' as const,
      }
    }),
    ...generatedWods
      .filter((wod) => wod.completedAt)
      .map((wod) => ({
        date: wod.completedAt as Date,
        workoutType: mapAnyWorkoutType(wod.workoutType),
        duration: wod.requestedDuration,
        intensity: wod.intensityAdjusted,
        equipment: normalizeEquipment(wod.equipment),
        source: 'wod' as const,
      })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  const todayWeekday = now.getDay()
  const sameWeekday = samples.filter((sample) => sample.date.getDay() === todayWeekday)
  const recentTwoWeeks = samples.filter((sample) => sample.date >= subDays(now, 14))
  const scores = new Map<WODWorkoutType, number>()

  for (const sample of samples) addScore(scores, sample.workoutType, 1)
  for (const sample of sameWeekday) addScore(scores, sample.workoutType, 2.5)
  for (const sample of recentTwoWeeks) addScore(scores, sample.workoutType, 0.6)

  const lowReadiness =
    (context.readinessScore !== null && context.readinessScore < 4) ||
    context.acwrZone === 'DANGER' ||
    context.acwrZone === 'CRITICAL'

  if (lowReadiness) {
    addScore(scores, 'core', 4)
    addScore(scores, 'cardio', 2)
  }

  const workoutType = pickTopWorkoutType(scores, context.primarySport)
  const duration = inferDuration(workoutType, sameWeekday, samples, lowReadiness)
  const equipment = inferEquipment(workoutType, samples, context)
  const focusArea = inferFocusArea(workoutType, lowReadiness)
  const mode: WODMode = lowReadiness ? 'casual' : 'structured'
  const confidence = inferConfidence(samples, sameWeekday, workoutType, duration, equipment)
  const signals = buildSignals(samples, sameWeekday, workoutType, duration, equipment, lowReadiness, locale)
  const reason = buildReason(workoutType, duration, sameWeekday.length, confidence, locale)

  return {
    source: 'rhythm',
    confidence,
    workoutType,
    mode,
    duration,
    equipment,
    focusArea,
    reason,
    signals,
  }
}

function mapAnyWorkoutType(value: unknown): WODWorkoutType {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('core')) return 'core'
  if (
    normalized.includes('run') ||
    normalized.includes('cycling') ||
    normalized.includes('cycle') ||
    normalized.includes('ski') ||
    normalized.includes('swim') ||
    normalized.includes('cardio') ||
    normalized.includes('triathlon')
  ) {
    return 'cardio'
  }
  if (
    normalized.includes('hyrox') ||
    normalized.includes('hybrid') ||
    normalized.includes('mixed') ||
    normalized.includes('alternative')
  ) {
    return 'mixed'
  }
  return 'strength'
}

function inferDuration(
  workoutType: WODWorkoutType,
  sameWeekday: RhythmSample[],
  samples: RhythmSample[],
  lowReadiness: boolean
): number {
  const relevant = sameWeekday.filter((sample) => sample.workoutType === workoutType)
  const fallback = samples.filter((sample) => sample.workoutType === workoutType)
  const durations = [...relevant, ...fallback]
    .map((sample) => sample.duration)
    .filter((duration): duration is number => typeof duration === 'number' && duration >= 10 && duration <= 120)

  const base = durations.length > 0 ? median(durations) : defaultDuration(workoutType)
  const adjusted = lowReadiness ? Math.min(base, 35) : base
  return clamp(roundToNearestFive(adjusted), 15, 90)
}

function inferEquipment(
  workoutType: WODWorkoutType,
  samples: RhythmSample[],
  context: WODAthleteContext
): WODEquipment[] {
  const counts = new Map<WODEquipment, number>()
  for (const sample of samples.filter((item) => item.workoutType === workoutType)) {
    for (const item of sample.equipment || []) addScore(counts, item, 1)
  }

  const available = new Set<WODEquipment>(context.availableEquipment.length > 0 ? context.availableEquipment : ['none'])
  for (const item of mapLocationEquipment(context)) available.add(item)
  const recentFavorite = [...counts.entries()]
    .filter(([item]) => available.has(item))
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item)
    .filter((item) => item !== 'none')
    .slice(0, workoutType === 'mixed' ? 3 : 2)

  if (recentFavorite.length > 0) return recentFavorite

  const preferredByType: Record<WODWorkoutType, WODEquipment[]> = {
    strength: ['dumbbells', 'barbell', 'kettlebell', 'resistance_band'],
    cardio: ['treadmill', 'bike', 'rower', 'skierg'],
    mixed: ['rower', 'bike', 'kettlebell', 'dumbbells'],
    core: ['none', 'resistance_band', 'medicine_ball'],
  }
  const inferred = preferredByType[workoutType].filter((item) => available.has(item) && item !== 'none')
  return inferred.length > 0 ? inferred.slice(0, workoutType === 'mixed' ? 3 : 2) : ['none']
}

function inferFocusArea(workoutType: WODWorkoutType, lowReadiness: boolean): WODFocusArea {
  if (lowReadiness) return 'recovery'
  if (workoutType === 'cardio') return 'cardio'
  if (workoutType === 'mixed') return 'sport_specific'
  return 'full_body'
}

function inferConfidence(
  samples: RhythmSample[],
  sameWeekday: RhythmSample[],
  workoutType: WODWorkoutType,
  duration: number,
  equipment: WODEquipment[]
): number {
  const sameTypeCount = sameWeekday.filter((sample) => sample.workoutType === workoutType).length
  const durationSignals = samples.filter((sample) => sample.workoutType === workoutType && sample.duration).length
  const equipmentSignals = samples.filter((sample) => sample.equipment?.some((item) => equipment.includes(item))).length
  const value =
    0.42 +
    Math.min(samples.length, 12) * 0.025 +
    Math.min(sameTypeCount, 4) * 0.08 +
    Math.min(durationSignals, 4) * 0.035 +
    Math.min(equipmentSignals, 3) * 0.025 +
    (duration > 0 ? 0.04 : 0)
  return Math.round(clamp(value, 0.35, 0.92) * 100) / 100
}

function buildSignals(
  samples: RhythmSample[],
  sameWeekday: RhythmSample[],
  workoutType: WODWorkoutType,
  duration: number,
  equipment: WODEquipment[],
  lowReadiness: boolean,
  locale: AppLocale
): string[] {
  const signals: string[] = []
  if (sameWeekday.length > 0) {
    signals.push(
      locale === 'sv'
        ? `${sameWeekday.length} tidigare pass på samma veckodag`
        : `${sameWeekday.length} previous sessions on this weekday`
    )
  }
  signals.push(locale === 'sv' ? `Vanlig rytm: ${workoutType}` : `Likely rhythm: ${workoutType}`)
  signals.push(locale === 'sv' ? `Typisk längd: ${duration} min` : `Typical duration: ${duration} min`)
  if (equipment.length > 0) {
    signals.push(locale === 'sv' ? `Utrustning: ${equipment.join(', ')}` : `Equipment: ${equipment.join(', ')}`)
  }
  if (lowReadiness) {
    signals.push(locale === 'sv' ? 'Beredskap/belastning kräver lugnare val' : 'Readiness/load calls for a calmer choice')
  }
  if (samples.length === 0) {
    signals.push(locale === 'sv' ? 'Begränsad historik, använder profil och säkra standardval' : 'Limited history, using profile and safe defaults')
  }
  return signals.slice(0, 5)
}

function buildReason(
  workoutType: WODWorkoutType,
  duration: number,
  sameWeekdayCount: number,
  confidence: number,
  locale: AppLocale
): string {
  if (locale === 'sv') {
    return sameWeekdayCount > 0
      ? `Din rytm pekar mot ${workoutType} idag, ungefär ${duration} minuter. Säkerhet: ${Math.round(confidence * 100)}%.`
      : `Jag väljer ett säkert ${workoutType}-pass på ${duration} minuter utifrån senaste träningsmönstret.`
  }
  return sameWeekdayCount > 0
    ? `Your rhythm points toward ${workoutType} today, about ${duration} minutes. Confidence: ${Math.round(confidence * 100)}%.`
    : `Selecting a safe ${workoutType} session for ${duration} minutes from recent training patterns.`
}

function pickTopWorkoutType(scores: Map<WODWorkoutType, number>, primarySport: string): WODWorkoutType {
  if (scores.size === 0) {
    return ['RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON'].includes(primarySport)
      ? 'cardio'
      : 'strength'
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'strength'
}

function mapLocationEquipment(context: WODAthleteContext): WODEquipment[] {
  const names = context.locationEquipment?.equipment.map((item) => item.name.toLowerCase()) ?? []
  const mapped = names.map((name): WODEquipment | null => {
    if (name.includes('dumbbell') || name.includes('hantel')) return 'dumbbells'
    if (name.includes('barbell') || name.includes('skivstång')) return 'barbell'
    if (name.includes('kettlebell')) return 'kettlebell'
    if (name.includes('band')) return 'resistance_band'
    if (name.includes('treadmill') || name.includes('löpband')) return 'treadmill'
    if (name.includes('bike') || name.includes('cykel')) return 'bike'
    if (name.includes('row')) return 'rower'
    if (name.includes('ski')) return 'skierg'
    return null
  })
  return mapped.filter((item): item is WODEquipment => !!item)
}

function normalizeEquipment(equipment: string[]): WODEquipment[] {
  return equipment.filter((item): item is WODEquipment => isWODEquipment(item))
}

function isWODEquipment(value: string): value is WODEquipment {
  return [
    'none',
    'dumbbells',
    'barbell',
    'kettlebell',
    'resistance_band',
    'pull_up_bar',
    'treadmill',
    'bike',
    'rower',
    'skierg',
    'airbike',
    'crosstrainer',
    'step_machine',
    'jump_rope',
    'wall_ball',
    'box',
    'sled',
    'sandbag',
    'medicine_ball',
    'stability_ball',
    'cable_machine',
    'ez_curl_bar',
    'rings',
  ].includes(value)
}

function defaultDuration(workoutType: WODWorkoutType): number {
  if (workoutType === 'core') return 25
  if (workoutType === 'cardio') return 40
  return 45
}

function addScore<T>(map: Map<T, number>, key: T, amount: number): void {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function roundToNearestFive(value: number): number {
  return Math.round(value / 5) * 5
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
