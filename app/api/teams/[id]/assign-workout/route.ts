// app/api/teams/[id]/assign-workout/route.ts
/**
 * Team Workout Assignment API
 *
 * POST - Assign a workout to all team members (bulk assignment)
 * Creates a TeamWorkoutBroadcast and individual assignments for each team member
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Validation schema for team workout assignment
const teamAssignWorkoutSchema = z.object({
  workoutType: z.enum(['strength', 'cardio', 'hybrid']),
  workoutId: z.string().uuid(),
  assignedDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  notes: z.string().max(500).optional(),
  excludeAthleteIds: z.array(z.string().uuid()).optional(),
})

// POST /api/teams/[id]/assign-workout
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: teamId } = await context.params
    const body = await request.json()

    // Validate input
    const validation = teamAssignWorkoutSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { workoutType, workoutId, assignedDate, notes, excludeAthleteIds } = validation.data
    const date = new Date(assignedDate)

    // Verify team exists and user owns it
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        userId: user.id,
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found or unauthorized' },
        { status: 404 }
      )
    }

    // Filter out excluded athletes
    const eligibleMembers = team.members.filter(
      (member) => !excludeAthleteIds?.includes(member.id)
    )

    if (eligibleMembers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No eligible team members to assign workout to' },
        { status: 400 }
      )
    }

    // Verify the workout exists and user owns it
    let workoutName = ''
    if (workoutType === 'strength') {
      const session = await prisma.strengthSession.findFirst({
        where: { id: workoutId, coachId: user.id },
        select: { name: true },
      })
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Strength session not found' },
          { status: 404 }
        )
      }
      workoutName = session.name
    } else if (workoutType === 'cardio') {
      const session = await prisma.cardioSession.findFirst({
        where: { id: workoutId, coachId: user.id },
        select: { name: true },
      })
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Cardio session not found' },
          { status: 404 }
        )
      }
      workoutName = session.name
    } else if (workoutType === 'hybrid') {
      const workout = await prisma.hybridWorkout.findFirst({
        where: { id: workoutId, coachId: user.id },
        select: { name: true },
      })
      if (!workout) {
        return NextResponse.json(
          { success: false, error: 'Hybrid workout not found' },
          { status: 404 }
        )
      }
      workoutName = workout.name
    }

    // Create broadcast and assignments in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create TeamWorkoutBroadcast
      const broadcast = await tx.teamWorkoutBroadcast.create({
        data: {
          teamId,
          coachId: user.id,
          strengthSessionId: workoutType === 'strength' ? workoutId : null,
          cardioSessionId: workoutType === 'cardio' ? workoutId : null,
          hybridWorkoutId: workoutType === 'hybrid' ? workoutId : null,
          assignedDate: date,
          notes: notes || null,
          totalAssigned: eligibleMembers.length,
          totalCompleted: 0,
        },
      })

      // Create individual assignments based on workout type
      if (workoutType === 'strength') {
        await tx.strengthSessionAssignment.createMany({
          data: eligibleMembers.map((member) => ({
            sessionId: workoutId,
            athleteId: member.id,
            assignedDate: date,
            assignedBy: user.id,
            notes: notes || null,
            status: 'PENDING',
            teamBroadcastId: broadcast.id,
          })),
          skipDuplicates: true, // Skip if already assigned to same athlete on same date
        })
      } else if (workoutType === 'cardio') {
        await tx.cardioSessionAssignment.createMany({
          data: eligibleMembers.map((member) => ({
            sessionId: workoutId,
            athleteId: member.id,
            assignedDate: date,
            assignedBy: user.id,
            notes: notes || null,
            status: 'PENDING',
            teamBroadcastId: broadcast.id,
          })),
          skipDuplicates: true,
        })
      } else if (workoutType === 'hybrid') {
        await tx.hybridWorkoutAssignment.createMany({
          data: eligibleMembers.map((member) => ({
            workoutId,
            athleteId: member.id,
            assignedDate: date,
            assignedBy: user.id,
            notes: notes || null,
            status: 'PENDING',
            teamBroadcastId: broadcast.id,
          })),
          skipDuplicates: true,
        })
      }

      return broadcast
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          broadcast: result,
          assignmentCount: eligibleMembers.length,
          workoutName,
          teamName: team.name,
        },
        message: `Workout assigned to ${eligibleMembers.length} team members`,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error assigning workout to team', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign workout to team' },
      { status: 500 }
    )
  }
}
