// app/api/workouts/[id]/logs/[logId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { rollupWorkoutLogProgression } from '@/lib/training-engine/progression/workout-log-rollup'

/**
 * PUT /api/workouts/[id]/logs/[logId]
 * Update a workout log
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    if (user) {
      locale = resolveRequestLocale(request, user.language)
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }

    const { logId } = await params
    const hasCoachAccess = await canAccessCoachPlatform(user.id)

    // Verify log belongs to user
    const existingLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
    })

    if (!existingLog) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Workout log not found', 'Träningslogg hittades inte'),
        },
        { status: 404 }
      )
    }

    if (existingLog.athleteId !== user.id && !hasCoachAccess && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized access to this workout log', 'Obehörig åtkomst till denna träningslogg'),
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Update workout log
    const log = await prisma.workoutLog.update({
      where: { id: logId },
      data: {
        completed: body.completed,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        // Time and distance
        duration: body.duration,
        distance: body.distance,
        avgPace: body.avgPace,
        // Heart rate
        avgHR: body.avgHR,
        maxHR: body.maxHR,
        // Cycling-specific power data
        avgPower: body.avgPower,
        normalizedPower: body.normalizedPower,
        maxPower: body.maxPower,
        avgCadence: body.avgCadence,
        elevation: body.elevation,
        tss: body.tss,
        // Subjective feedback
        perceivedEffort: body.perceivedEffort,
        difficulty: body.difficulty,
        feeling: body.feeling,
        notes: body.notes,
        // External links
        dataFileUrl: body.dataFileUrl,
        stravaUrl: body.stravaUrl,
        // Per-interval results
        intervalResults: body.intervalResults || undefined,
        // Coaches can add feedback
        ...(hasCoachAccess || user.role === 'ADMIN'
          ? {
              coachFeedback: body.coachFeedback,
              coachViewedAt: new Date(),
            }
          : {}),
      },
    })

    if (hasFuelingFeedback(body.fuelingLog)) {
      await prisma.workoutFuelingLog.upsert({
        where: { workoutLogId: log.id },
        update: {
          actualCarbsGPerHour: body.fuelingLog.actualCarbsGPerHour,
          actualCarbsTotalG: body.fuelingLog.actualCarbsTotalG,
          hydrationMl: body.fuelingLog.hydrationMl,
          sodiumMg: body.fuelingLog.sodiumMg,
          stomachRating: body.fuelingLog.stomachRating,
          energyRating: body.fuelingLog.energyRating,
          productsUsed: body.fuelingLog.productsUsed,
          notes: body.fuelingLog.notes,
        },
        create: {
          workoutLogId: log.id,
          actualCarbsGPerHour: body.fuelingLog.actualCarbsGPerHour,
          actualCarbsTotalG: body.fuelingLog.actualCarbsTotalG,
          hydrationMl: body.fuelingLog.hydrationMl,
          sodiumMg: body.fuelingLog.sodiumMg,
          stomachRating: body.fuelingLog.stomachRating,
          energyRating: body.fuelingLog.energyRating,
          productsUsed: body.fuelingLog.productsUsed,
          notes: body.fuelingLog.notes,
        },
      })
    }

    // Roll logged strength sets up into ProgressionTracking + PRs on completion
    // (best-effort — the nightly strength-progression-sweep cron self-heals failures).
    if (body.completed === true) {
      try {
        await rollupWorkoutLogProgression(log.id)
      } catch (rollupError) {
        logger.error('Progression rollup on workout log completion failed', { workoutLogId: log.id }, rollupError)
      }
    }

    return NextResponse.json({
      success: true,
      data: log,
      message: t(locale, 'Workout log updated', 'Träningslogg uppdaterad'),
    })
  } catch (error) {
    logger.error('Error updating workout log', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to update workout log', 'Misslyckades med att uppdatera träningslogg'),
      },
      { status: 500 }
    )
  }
}

function hasFuelingFeedback(fuelingLog: unknown): fuelingLog is {
  actualCarbsGPerHour?: number
  actualCarbsTotalG?: number
  hydrationMl?: number
  sodiumMg?: number
  stomachRating?: number
  energyRating?: number
  productsUsed?: Prisma.InputJsonValue
  notes?: string
} {
  if (!fuelingLog || typeof fuelingLog !== 'object') return false
  const log = fuelingLog as Record<string, unknown>
  return [
    log.actualCarbsGPerHour,
    log.actualCarbsTotalG,
    log.hydrationMl,
    log.sodiumMg,
    log.stomachRating,
    log.energyRating,
    log.productsUsed,
    log.notes,
  ].some((value) => value !== undefined && value !== null && value !== '')
}

/**
 * PATCH /api/workouts/[id]/logs/[logId]
 * Add or update coach feedback on a workout log
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    if (user) {
      locale = resolveRequestLocale(request, user.language)
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }

    // Only coaches and admins can add feedback
    const hasCoachAccess = await canAccessCoachPlatform(user.id)
    if (!hasCoachAccess && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Only coaches can add feedback', 'Endast coaches kan lägga till feedback'),
        },
        { status: 403 }
      )
    }

    const { logId } = await params

    // Verify log exists
    const existingLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
      include: {
        workout: {
          include: {
            day: {
              include: {
                week: {
                  include: {
                    program: {
                      include: {
                        client: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!existingLog) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Workout log not found', 'Träningslogg hittades inte'),
        },
        { status: 404 }
      )
    }

    // Verify coach owns the client/athlete
    const program = existingLog.workout.day.week.program
    if (hasCoachAccess && user.role !== 'ADMIN' && program.coachId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, "You do not have permission to give feedback on this athlete's workout", 'Du har inte behörighet att ge feedback på denna atlets träningspass'),
        },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate feedback
    if (!body.coachFeedback || typeof body.coachFeedback !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Feedback is missing or invalid', 'Feedback saknas eller är ogiltig'),
        },
        { status: 400 }
      )
    }

    if (body.coachFeedback.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Feedback can be at most 500 characters', 'Feedback får max vara 500 tecken'),
        },
        { status: 400 }
      )
    }

    // Update workout log with coach feedback
    const log = await prisma.workoutLog.update({
      where: { id: logId },
      data: {
        coachFeedback: body.coachFeedback,
        coachViewedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: log,
      message: t(locale, 'Feedback saved', 'Feedback sparad'),
    })
  } catch (error) {
    logger.error('Error adding coach feedback', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to save feedback', 'Misslyckades med att spara feedback'),
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workouts/[id]/logs/[logId]
 * Delete a workout log
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await getCurrentUser()
    if (user) {
      locale = resolveRequestLocale(request, user.language)
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized', 'Obehörig'),
        },
        { status: 401 }
      )
    }

    const { logId } = await params

    // Verify log belongs to user
    const existingLog = await prisma.workoutLog.findUnique({
      where: { id: logId },
    })

    if (!existingLog) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Workout log not found', 'Träningslogg hittades inte'),
        },
        { status: 404 }
      )
    }

    if (existingLog.athleteId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, 'Unauthorized access to this workout log', 'Obehörig åtkomst till denna träningslogg'),
        },
        { status: 403 }
      )
    }

    await prisma.workoutLog.delete({
      where: { id: logId },
    })

    return NextResponse.json({
      success: true,
      message: t(locale, 'Workout log deleted', 'Träningslogg raderad'),
    })
  } catch (error) {
    logger.error('Error deleting workout log', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(locale, 'Failed to delete workout log', 'Misslyckades med att radera träningslogg'),
      },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
