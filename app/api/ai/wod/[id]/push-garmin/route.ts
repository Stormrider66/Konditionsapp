/**
 * Push an AI-generated WOD (Workout of the Day) to Garmin.
 *
 * POST /api/ai/wod/[id]/push-garmin
 *
 * Athlete-scoped: the logged-in athlete pushes their OWN WOD to their Garmin
 * Connect account and schedules it for today. Strength/mixed/core WODs use the
 * strength serializer (lap-button sets); cardio WODs use the cardio serializer
 * (timed/distance steps). Re-pushing replaces the previous Garmin workout.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
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
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// Shape of AIGeneratedWOD.workoutJson as written by createTodayWorkout / the WOD generator.
interface WodExercise {
  name?: string
  nameSv?: string
  sets?: number
  reps?: string | number
  weight?: string
  restSeconds?: number
  duration?: number // seconds (cardio)
  distance?: number // meters (cardio)
  zone?: number
  instructions?: string
  notes?: string
}

interface WodSection {
  type?: string // WARMUP | MAIN | CORE | COOLDOWN
  name?: string
  duration?: number
  exercises?: WodExercise[]
}

interface WodJson {
  title?: string
  description?: string
  sections?: WodSection[]
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
      : '—'
  return {
    exerciseId: '', // unused by the serializer, but required by its type
    exerciseName: weight ? `${base} (${weight})` : base,
    sets: e.sets ?? 1,
    reps,
    restSeconds: e.restSeconds,
    notes: e.instructions || e.notes,
  }
}

function buildGarminFromWod(wod: {
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

  // strength / mixed / core → strength serializer
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    const { id: wodId } = await params

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
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    const token = await prisma.integrationToken.findUnique({
      where: { clientId_type: { clientId, type: 'GARMIN' } },
      select: { syncEnabled: true },
    })
    if (!token || !token.syncEnabled) {
      return NextResponse.json(
        {
          error: t(locale, 'Garmin is not connected', 'Garmin är inte anslutet'),
          code: 'GARMIN_NOT_CONNECTED',
        },
        { status: 404 }
      )
    }

    const { workout: garminWorkout, exerciseCount } = buildGarminFromWod({
      title: wod.title,
      description: wod.description,
      workoutType: wod.workoutType,
      primarySport: wod.primarySport,
      workoutJson: (wod.workoutJson as WodJson) ?? {},
    })

    if (exerciseCount === 0) {
      return NextResponse.json(
        { error: t(locale, 'This workout has no exercises to send.', 'Det här passet har inga övningar att skicka.') },
        { status: 400 }
      )
    }

    // Replace a previous push so the watch never ends up with duplicates.
    const hadPrevious = Boolean(wod.garminWorkoutId)
    if (wod.garminWorkoutId) {
      try {
        await deleteGarminWorkout(clientId, wod.garminWorkoutId)
      } catch (deleteErr) {
        logger.warn('Failed to delete previous Garmin WOD workout; continuing with replacement', {
          wodId, clientId, garminWorkoutId: wod.garminWorkoutId,
        }, deleteErr)
      }
    }

    const created = await createGarminWorkout(clientId, garminWorkout)
    const garminWorkoutId = resolveGarminWorkoutId(created)
    if (!garminWorkoutId) {
      throw new Error('Garmin did not return a workout ID')
    }

    // Schedule for today so it surfaces on the watch's calendar.
    const scheduleDate = stockholmDateKey()
    let scheduled = false
    let scheduleWarning: string | undefined
    try {
      await scheduleGarminWorkout(clientId, { workoutId: garminWorkoutId, calendarDate: scheduleDate })
      scheduled = true
    } catch (scheduleErr) {
      scheduleWarning = scheduleErr instanceof Error ? scheduleErr.message : 'Garmin scheduling failed'
      logger.warn('Garmin WOD scheduling failed after workout creation', {
        wodId, clientId, garminWorkoutId, scheduleDate,
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

    return NextResponse.json({
      success: true,
      garminWorkoutId,
      scheduled,
      replaced: hadPrevious,
      ...(scheduleWarning && { scheduleWarning }),
      message,
    })
  } catch (error) {
    logger.error('Error pushing AI WOD to Garmin', {}, error)
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: t(locale, 'Garmin rate limit exceeded. Try again later.', 'Garmins hastighetsgräns har nåtts. Försök igen senare.') },
        { status: 429 }
      )
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to send to Garmin', 'Kunde inte skicka till Garmin') },
      { status: 500 }
    )
  }
}
