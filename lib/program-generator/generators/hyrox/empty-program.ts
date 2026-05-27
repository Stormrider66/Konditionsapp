import type { Client, CreateTrainingDayDTO, CreateTrainingProgramDTO, CreateWorkoutDTO, WorkoutIntensity, WorkoutType } from '@/types'
import { getHyroxFocus, getHyroxPhase, type AppLocale } from './mappers'
import type { HyroxProgramParams } from './types'

/** Useful fallback program for custom HYROX goals. */
export function createEmptyHyroxProgram(
  params: HyroxProgramParams,
  client: Client,
  startDate: Date,
  endDate: Date
): CreateTrainingProgramDTO {
  const locale = params.locale === 'sv' ? 'sv' : 'en'
  const weeks = Array.from({ length: params.durationWeeks }).map((_, i) => {
    const weekNumber = i + 1
    const days = createFallbackHyroxDays({
      weekNumber,
      totalWeeks: params.durationWeeks,
      sessionsPerWeek: params.sessionsPerWeek,
      experienceLevel: params.experienceLevel || 'beginner',
      locale,
    })

    return {
      weekNumber,
      startDate: new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      phase: getHyroxPhase(weekNumber, params.durationWeeks),
      volume: days.reduce((sum, day) => sum + day.workouts.reduce((total, workout) => total + (workout.duration || 0), 0), 0),
      focus: getHyroxFocus(params.goal, weekNumber, params.durationWeeks, locale),
      days,
    }
  })

  return {
    clientId: params.clientId,
    coachId: params.coachId,
    testId: undefined,
    name: `HYROX - ${client.name}`,
    goalType: params.goal,
    startDate,
    endDate,
    notes: params.notes || t(locale, 'Custom HYROX program with running, station technique, strength, compromised running, and race simulation.', 'Anpassat HYROX-program med löpning, stationsteknik, styrka, kompromisspass och race-simulering.'),
    weeks,
  }
}

function createFallbackHyroxDays(input: {
  weekNumber: number
  totalWeeks: number
  sessionsPerWeek: number
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | undefined
  locale: AppLocale
}): CreateTrainingDayDTO[] {
  const sessions = Math.min(7, Math.max(3, input.sessionsPerWeek))
  const loadFactor = getHyroxLoadFactor(input.weekNumber, input.totalWeeks, input.experienceLevel)
  const planned = [
    {
      day: 1,
      workout: hyroxWorkout({
        type: 'RUNNING',
        name: t(input.locale, 'HYROX running intervals', 'HYROX löpintervaller'),
        intensity: 'INTERVAL',
        duration: Math.round(50 * loadFactor),
        instructions: t(input.locale, '1 km repeats or 4-6 minute intervals with controlled recovery. Hold a pace you can repeat after stations.', '1 km-repetitioner eller 4-6 min intervaller med kontrollerad vila. Håll fart som kan upprepas efter stationer.'),
        locale: input.locale,
      }),
    },
    {
      day: 2,
      workout: hyroxWorkout({
        type: 'STRENGTH',
        name: t(input.locale, 'Sled and lower-body strength', 'Sled och underkroppsstyrka'),
        intensity: 'MODERATE',
        duration: 50,
        instructions: t(input.locale, 'Heavy but technically safe strength for sled push/pull, farmers carry, and lunges.', 'Tung men tekniskt säker styrka för sled push/pull, farmers carry och lunges.'),
        locale: input.locale,
        segments: [
          { order: 1, type: 'warmup', duration: 10, description: t(input.locale, 'Hips, ankles, trunk, and ramp-up', 'Höft, fotled, bål och ramp-up') },
          { order: 2, type: 'exercise', duration: 12, sets: 4, repsCount: '5-6', description: t(input.locale, 'Trap bar deadlift or front squat', 'Trap bar deadlift eller front squat') },
          { order: 3, type: 'exercise', duration: 12, sets: 4, repsCount: '20-30 m', description: t(input.locale, 'Sled push / heavy prowler', 'Sled push / tung prowler') },
          { order: 4, type: 'exercise', duration: 10, sets: 3, repsCount: '30-40 m', description: 'Farmers carry' },
          { order: 5, type: 'cooldown', duration: 6, description: t(input.locale, 'Mobility and cooldown', 'Rörlighet och nedvarvning') },
        ],
      }),
    },
    {
      day: 4,
      workout: hyroxWorkout({
        type: 'HYROX',
        name: t(input.locale, 'Station technique and compromised running', 'Stationsteknik och kompromiss'),
        intensity: 'THRESHOLD',
        duration: Math.round(60 * loadFactor),
        instructions: t(input.locale, 'Alternate 800-1000 m running with SkiErg/row/burpee broad jump/lunges. Focus on transitions and RPE control.', 'Växla 800-1000 m löpning med SkiErg/Row/Burpee broad jump/lunges. Fokus på övergångar och RPE-kontroll.'),
        locale: input.locale,
        segments: [
          { order: 1, type: 'warmup', duration: 12, description: t(input.locale, 'Running drills and station technique', 'Löpdrill och stationsteknik') },
          { order: 2, type: 'work', duration: Math.round(38 * loadFactor), description: t(input.locale, '3-5 rounds: running + station with consistent technique', '3-5 varv: löpning + station med jämn teknik') },
          { order: 3, type: 'cooldown', duration: 10, description: t(input.locale, 'Easy jog and mobility', 'Lätt jogg och rörlighet') },
        ],
      }),
    },
    {
      day: 6,
      workout: hyroxWorkout({
        type: 'RUNNING',
        name: t(input.locale, 'Aerobic endurance run', 'Aerob distans'),
        intensity: 'EASY',
        duration: Math.round(60 * loadFactor),
        instructions: t(input.locale, 'Easy running for aerobic capacity. Finish with 4-6 short strides if the legs feel fresh.', 'Lugn löpning för aerob kapacitet. Avsluta med 4-6 korta stegringar om benen känns pigga.'),
        locale: input.locale,
      }),
    },
    {
      day: 5,
      workout: hyroxWorkout({
        type: 'HYROX',
        name: t(input.locale, 'Mini race simulation', 'Mini race-simulering'),
        intensity: 'INTERVAL',
        duration: Math.round(70 * loadFactor),
        instructions: t(input.locale, 'Short race simulation: running between 4-6 stations. Prioritize even pacing and quick transitions.', 'Kortare race-simulering: löpning mellan 4-6 stationer. Prioritera jämn fart och snabba övergångar.'),
        locale: input.locale,
      }),
    },
    {
      day: 3,
      workout: hyroxWorkout({
        type: 'RECOVERY',
        name: t(input.locale, 'Recovery and mobility', 'Återhämtning och rörlighet'),
        intensity: 'RECOVERY',
        duration: 35,
        instructions: t(input.locale, 'Easy bike/jog, hips/ankles/thoracic spine, and breathing control.', 'Lätt cykel/jogg, höft/ankel/bröstrygg och andningskontroll.'),
        locale: input.locale,
      }),
    },
  ]

  const keep = new Map(planned.slice(0, sessions).map((item) => [item.day, item.workout]))
  return Array.from({ length: 7 }).map((_, index) => ({
    dayNumber: index + 1,
    notes: keep.has(index + 1) ? '' : t(input.locale, 'Rest day', 'Vilodag'),
    workouts: keep.get(index + 1) ? [keep.get(index + 1)!] : [],
  }))
}

function hyroxWorkout(input: {
  type: WorkoutType
  name: string
  intensity: WorkoutIntensity
  duration: number
  instructions: string
  locale: AppLocale
  segments?: CreateWorkoutDTO['segments']
}): CreateWorkoutDTO {
  return {
    type: input.type,
    name: input.name,
    intensity: input.intensity,
    duration: input.duration,
    instructions: input.instructions,
    segments: input.segments || [
      { order: 1, type: 'warmup', duration: 10, description: t(input.locale, 'Dynamic warm-up', 'Dynamisk uppvärmning') },
      { order: 2, type: 'work', duration: Math.max(15, input.duration - 20), description: input.instructions },
      { order: 3, type: 'cooldown', duration: 10, description: t(input.locale, 'Cooldown', 'Nedvarvning') },
    ],
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function getHyroxLoadFactor(
  weekNumber: number,
  totalWeeks: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | undefined
): number {
  if (weekNumber % 4 === 0 && weekNumber < totalWeeks) return 0.75
  const experienceFactor = experienceLevel === 'advanced' ? 1.1 : experienceLevel === 'intermediate' ? 1 : 0.9
  const progress = weekNumber / totalWeeks
  if (progress > 0.9) return 0.65
  return (0.9 + progress * 0.2) * experienceFactor
}
