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
import { logger } from '@/lib/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only coaches can review workout modifications
    if (dbUser.role !== 'COACH') {
      return NextResponse.json(
        { error: 'Access denied. Coach role required.' },
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
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    if (workout.day.week.program.client.userId !== dbUser.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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
        ? 'Workout modification approved'
        : 'Workout modification flagged for adjustment',
    })
  } catch (error) {
    logger.error('Error reviewing workout modification', {}, error)
    return NextResponse.json(
      {
        error: 'Failed to review workout modification',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
