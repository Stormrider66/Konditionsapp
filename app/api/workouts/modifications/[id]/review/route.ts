/**
 * Review Workout Modification API
 *
 * PUT /api/workouts/modifications/[id]/review
 *
 * Marks a workout modification as reviewed by coach.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { canAccessClient } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const { id } = await params
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: t(locale, 'User not found', 'Användaren hittades inte') }, { status: 404 })
    }
    locale = resolveRequestLocale(request, dbUser.language)

    // Only coaches can review workout modifications
    if (dbUser.role !== 'COACH') {
      return NextResponse.json(
        { error: t(locale, 'Access denied. Coach role required.', 'Åtkomst nekad. Coachroll krävs.') },
        { status: 403 }
      )
    }

    // Verify workout exists and belongs to this coach's athlete
    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        day: {
          include: {
            week: {
              include: {
                program: {
                  include: {
                    client: {
                      select: {
                        userId: true,
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

    if (!workout) {
      return NextResponse.json({ error: t(locale, 'Workout not found', 'Passet hittades inte') }, { status: 404 })
    }

    const hasAccess = await canAccessClient(dbUser.id, workout.day.week.program.clientId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    // Parse request body for review notes
    const body = await request.json().catch(() => ({}))
    const { approved = true, coachNotes } = body

    // Update workout with review status
    // We'll add a "reviewed" flag to coachNotes
    const reviewNote = `\n\n[Reviewed by coach at ${new Date().toISOString()}${
      coachNotes ? ` - ${coachNotes}` : ''
    }${approved ? ' - APPROVED' : ' - NEEDS ADJUSTMENT'}]`

    const updatedWorkout = await prisma.workout.update({
      where: { id },
      data: {
        coachNotes: (workout.coachNotes || '') + reviewNote,
      },
    })

    return NextResponse.json({
      success: true,
      workout: updatedWorkout,
      message: approved
        ? t(locale, 'Workout modification approved', 'Träningspassjusteringen har godkänts')
        : t(locale, 'Workout modification flagged for adjustment', 'Träningspassjusteringen har markerats för justering'),
    })
  } catch (error) {
    logger.error('Error reviewing workout modification', {}, error)
    return NextResponse.json(
      {
        error: t(
          locale,
          'Failed to review workout modification',
          'Misslyckades med att granska träningspassjusteringen'
        ),
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : t(locale, 'Unknown error', 'Okänt fel')),
      },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
