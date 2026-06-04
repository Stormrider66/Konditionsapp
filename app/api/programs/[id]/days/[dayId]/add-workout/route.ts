import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api/utils'
import { canAccessProgram } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; dayId: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    if (!(await canAccessCoachPlatform(user.id))) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const params = await context.params
    const { id: programId, dayId } = params

    const hasAccess = await canAccessProgram(user.id, programId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Åtkomst nekad') }, { status: 403 })
    }

    const body = await request.json()
    const { type } = body

    if (!type) {
      return NextResponse.json({ error: t(locale, 'type is required', 'type krävs') }, { status: 400 })
    }

    // Verify day exists and belongs to the program
    const day = await prisma.trainingDay.findUnique({
      where: { id: dayId },
      include: {
        week: {
          select: {
            programId: true,
            program: {
              select: {
                coachId: true
              }
            }
          }
        }
      }
    })

    if (!day) {
      return NextResponse.json({ error: t(locale, 'Training day not found', 'Träningsdagen hittades inte') }, { status: 404 })
    }

    if (day.week.programId !== programId) {
      return NextResponse.json(
        { error: t(locale, 'Day does not belong to this program', 'Dagen tillhör inte detta program') },
        { status: 403 }
      )
    }

    // Create new workout
    const workout = await prisma.workout.create({
      data: {
        name: getDefaultWorkoutName(type, locale),
        type,
        intensity: 'EASY', // Default intensity
        dayId,
      }
    })

    return NextResponse.json({
      success: true,
      workoutId: workout.id,
      workout,
      message: t(locale, 'Workout created successfully', 'Passet skapades')
    })

  } catch (error) {
    logger.error('Add Workout API Error', {}, error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : t(locale, 'Internal server error', 'Internt serverfel')
      },
      { status: 500 }
    )
  }
}

function getDefaultWorkoutName(type: string, locale: AppLocale): string {
  const names: Record<string, { en: string; sv: string }> = {
    RUNNING: { en: 'New running workout', sv: 'Nytt löppass' },
    STRENGTH: { en: 'New strength workout', sv: 'Nytt styrkepass' },
    CORE: { en: 'New core workout', sv: 'Nytt core-pass' },
    CYCLING: { en: 'New cycling workout', sv: 'Nytt cykelpass' },
    SWIMMING: { en: 'New swimming workout', sv: 'Nytt simpass' },
    ALTERNATIVE: { en: 'New alternative workout', sv: 'Nytt alternativt pass' },
  }
  const fallback = { en: 'New training workout', sv: 'Nytt träningspass' }
  const name = names[type] || fallback
  return locale === 'sv' ? name.sv : name.en
}
