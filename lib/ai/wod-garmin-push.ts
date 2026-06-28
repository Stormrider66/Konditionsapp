import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  buildGarminStrengthWorkout,
  serializeWorkoutToGarmin,
  createGarminWorkout,
  deleteGarminWorkout,
  resolveGarminWorkoutId,
  scheduleGarminWorkout,
  type GarminWorkout,
} from '@/lib/integrations/garmin/training'
import { stockholmDateKey } from '@/lib/ai/cardio-workout-action'
import { logger } from '@/lib/logger'
import type { AppLocale } from '@/lib/i18n/request-locale'

interface WodExercise {
  name?: string
  nameSv?: string
  sets?: number
  reps?: string | number
  weight?: string
  restSeconds?: number
  duration?: number
  distance?: number
  zone?: number
  instructions?: string
  notes?: string
}

interface WodSection {
  type?: string
  name?: string
  duration?: number
  exercises?: WodExercise[]
}

interface WodJson {
  title?: string
  description?: string
  sections?: WodSection[]
}

export type WodGarminPushResult =
  | {
      success: true
      garminWorkoutId: string
      scheduled: boolean
      replaced: boolean
      scheduleWarning?: string
      message: string
    }
  | {
      success: false
      error: string
      code?: string
      status?: number
    }

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function exerciseLabel(e: WodExercise): string {
  return (e.name || e.nameSv || 'Exercise').trim()
}

function toStrengthExercise(e: WodExercise) {
  const weight = (e.weight || '').trim()
  const base = exerciseLabel(e)
  const reps = e.reps != null && `${e.reps}`.trim() !== ''
    ? e.reps
    : e.duration
      ? `${e.duration}s`
      : '-'
  return {
    exerciseId: '',
    exerciseName: weight ? `${base} (${weight})` : base,
    sets: e.sets ?? 1,
    reps,
    restSeconds: e.restSeconds,
    notes: e.instructions || e.notes,
  }
}

export function buildGarminFromWod(wod: {
  title: string
  description: string | null
  workoutType: string | null
  primarySport: string | null
  workoutJson: WodJson
}): { workout: GarminWorkout; exerciseCount: number } {
  const sections = wod.workoutJson.sections ?? []
  const name = wod.workoutJson.title || wod.title
  const description = wod.description || undefined
  const exerciseCount = sections.reduce((sum, s) => sum + (s.exercises?.length ?? 0), 0)

  if (wod.workoutType === 'cardio') {
    const segments = sections.flatMap((s) => {
      const segType: 'warmup' | 'cooldown' | 'interval' =
        s.type === 'WARMUP' ? 'warmup' : s.type === 'COOLDOWN' ? 'cooldown' : 'interval'
      return (s.exercises ?? []).map((e) => ({
        type: segType,
        durationSeconds: e.duration,
        distanceMeters: e.distance,
        description: [exerciseLabel(e), e.zone ? `Z${e.zone}` : null].filter(Boolean).join(' '),
      }))
    })
    return {
      workout: serializeWorkoutToGarmin({
        name,
        description,
        sportType: wod.primarySport || 'CARDIO_TRAINING',
        segments,
      }),
      exerciseCount,
    }
  }

  const pick = (...types: string[]) =>
    sections.filter((s) => types.includes((s.type || '').toUpperCase())).flatMap((s) => s.exercises ?? [])

  return {
    workout: buildGarminStrengthWorkout({
      name,
      description,
      exercises: pick('MAIN', 'CORE').map(toStrengthExercise),
      warmupExercises: pick('WARMUP').map(toStrengthExercise),
      cooldownExercises: pick('COOLDOWN').map(toStrengthExercise),
    }),
    exerciseCount,
  }
}

export async function pushAiWodToGarmin(params: {
  wodId: string
  clientId: string
  locale: AppLocale
  scheduleDate?: string
}): Promise<WodGarminPushResult> {
  const { wodId, clientId, locale } = params

  const wod = await prisma.aIGeneratedWOD.findUnique({
    where: { id: wodId },
    select: {
      id: true,
      clientId: true,
      title: true,
      description: true,
      workoutType: true,
      primarySport: true,
      workoutJson: true,
      garminWorkoutId: true,
    },
  })

  if (!wod || wod.clientId !== clientId) {
    return {
      success: false,
      status: 404,
      error: t(locale, 'Workout not found', 'Passet hittades inte'),
    }
  }

  const token = await prisma.integrationToken.findUnique({
    where: { clientId_type: { clientId, type: 'GARMIN' } },
    select: { syncEnabled: true },
  })
  if (!token || !token.syncEnabled) {
    return {
      success: false,
      status: 404,
      code: 'GARMIN_NOT_CONNECTED',
      error: t(locale, 'Garmin is not connected', 'Garmin är inte anslutet'),
    }
  }

  const { workout: garminWorkout, exerciseCount } = buildGarminFromWod({
    title: wod.title,
    description: wod.description,
    workoutType: wod.workoutType,
    primarySport: wod.primarySport,
    workoutJson: (wod.workoutJson as WodJson) ?? {},
  })

  if (exerciseCount === 0) {
    return {
      success: false,
      status: 400,
      error: t(locale, 'This workout has no exercises to send.', 'Det här passet har inga övningar att skicka.'),
    }
  }

  const hadPrevious = Boolean(wod.garminWorkoutId)
  if (wod.garminWorkoutId) {
    try {
      await deleteGarminWorkout(clientId, wod.garminWorkoutId)
    } catch (deleteErr) {
      logger.warn('Failed to delete previous Garmin WOD workout; continuing with replacement', {
        wodId,
        clientId,
        garminWorkoutId: wod.garminWorkoutId,
      }, deleteErr)
    }
  }

  const created = await createGarminWorkout(clientId, garminWorkout)
  const garminWorkoutId = resolveGarminWorkoutId(created)
  if (!garminWorkoutId) {
    throw new Error('Garmin did not return a workout ID')
  }

  const scheduleDate = params.scheduleDate || stockholmDateKey()
  let scheduled = false
  let scheduleWarning: string | undefined
  try {
    await scheduleGarminWorkout(clientId, { workoutId: garminWorkoutId, calendarDate: scheduleDate })
    scheduled = true
  } catch (scheduleErr) {
    scheduleWarning = scheduleErr instanceof Error ? scheduleErr.message : 'Garmin scheduling failed'
    logger.warn('Garmin WOD scheduling failed after workout creation', {
      wodId,
      clientId,
      garminWorkoutId,
      scheduleDate,
    }, scheduleErr)
  }

  await prisma.aIGeneratedWOD.update({
    where: { id: wod.id },
    data: { garminWorkoutId, garminPushedAt: new Date() },
  })

  logger.info('Pushed AI WOD to Garmin', { wodId, clientId, garminWorkoutId, scheduled, replaced: hadPrevious })

  const message = scheduleWarning
    ? t(locale, 'Workout sent to Garmin, but calendar scheduling failed.', 'Passet skickades till Garmin, men kalenderplanering misslyckades.')
    : t(locale, 'Workout sent to your Garmin watch for today.', 'Passet skickades till din Garmin-klocka för idag.')

  return {
    success: true,
    garminWorkoutId,
    scheduled,
    replaced: hadPrevious,
    ...(scheduleWarning && { scheduleWarning }),
    message,
  }
}
