// app/api/teams/[id]/assign-workout/preview/route.ts
/**
 * Assignment restriction preview.
 *
 * POST { workoutType, workoutId, athleteIds } → which of the given athletes are
 * blocked by an active physio restriction for that workout (the workout
 * contains an exercise/area they can't do). The assignment dialog calls this to
 * disable + auto-exclude blocked players before submit; the actual assign route
 * enforces the same check server-side.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCoach, getRequestedBusinessScope } from '@/lib/auth-utils'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { checkWorkoutAssignmentRestrictions } from '@/lib/training-restrictions/assignment-enforcement'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

const previewSchema = z.object({
  workoutType: z.enum(['strength', 'cardio', 'hybrid', 'agility']),
  workoutId: z.string().uuid(),
  athleteIds: z.array(z.string().uuid()),
})

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { id: teamId } = await context.params

    const team = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const parsed = previewSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 })
    }

    const { workoutType, workoutId, athleteIds } = parsed.data
    const { blockedByAthlete, exerciseCount } = await checkWorkoutAssignmentRestrictions({
      workoutType,
      workoutId,
      athleteIds,
    })

    return NextResponse.json({
      success: true,
      data: {
        exerciseCount,
        blocked: Array.from(blockedByAthlete.values()).map((b) => ({
          athleteId: b.athleteId,
          exerciseNames: b.blockedExercises.map((e) => e.name).filter(Boolean),
        })),
      },
    })
  } catch (error) {
    logger.error('Error previewing assignment restrictions', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to preview restrictions' },
      { status: 500 }
    )
  }
}
