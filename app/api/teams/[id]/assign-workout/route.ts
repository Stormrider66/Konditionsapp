// app/api/teams/[id]/assign-workout/route.ts
/**
 * Team Workout Assignment API
 *
 * POST - Assign a workout to all team members (bulk assignment)
 * Creates a TeamWorkoutBroadcast and individual assignments for each team member
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import {
  resolveStrengthBusinessScope,
  strengthSessionAccessWhere,
} from '@/lib/strength/session-business-scope'
import { z } from 'zod'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Validation schema for team workout assignment
const teamAssignWorkoutSchema = z.object({
  workoutType: z.enum(['strength', 'cardio', 'hybrid', 'agility']),
  workoutId: z.string().uuid(),
  assignedDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  notes: z.string().max(500).optional(),
  includeAthleteIds: z.array(z.string().uuid()).optional(),
  excludeAthleteIds: z.array(z.string().uuid()).optional(),
  startTime: z.string().max(10).optional(),
  endTime: z.string().max(10).optional(),
  locationId: z.string().uuid().optional(),
  locationName: z.string().max(120).optional(),
  responsibleCoachId: z.string().uuid().optional(),
})

// POST /api/teams/[id]/assign-workout
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const strengthBusinessScope = await resolveStrengthBusinessScope(user.id, request)

    if (!strengthBusinessScope) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 403 })
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

    const {
      workoutType,
      workoutId,
      assignedDate,
      notes,
      includeAthleteIds,
      excludeAthleteIds,
      startTime,
      endTime,
      locationId,
      locationName,
      responsibleCoachId,
    } = validation.data
    const date = new Date(assignedDate)

    const accessibleTeam = await getAccessibleTeam(user.id, teamId, scope.businessSlug)
    if (!accessibleTeam) {
      return NextResponse.json(
        { success: false, error: 'Team not found or unauthorized' },
        { status: 404 }
      )
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            businessId: true,
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

    const includeSet = includeAthleteIds ? new Set(includeAthleteIds) : null
    const excludeSet = new Set(excludeAthleteIds ?? [])
    const eligibleMembers = team.members.filter((member) => {
      if (strengthBusinessScope.businessId && member.businessId !== strengthBusinessScope.businessId) return false
      if (includeSet && !includeSet.has(member.id)) return false
      return !excludeSet.has(member.id)
    })

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
        where: {
          id: workoutId,
          AND: [strengthSessionAccessWhere(user.id, strengthBusinessScope.businessId)],
        },
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
        where: {
          id: workoutId,
          OR: [{ coachId: user.id }, { isPublic: true }],
        },
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
        where: {
          id: workoutId,
          OR: [{ coachId: user.id }, { isPublic: true }, { coachId: null }],
        },
        select: { name: true },
      })
      if (!workout) {
        return NextResponse.json(
          { success: false, error: 'Hybrid workout not found' },
          { status: 404 }
        )
      }
      workoutName = workout.name
    } else if (workoutType === 'agility') {
      const workout = await prisma.agilityWorkout.findFirst({
        where: {
          id: workoutId,
          OR: [{ coachId: user.id }, { isPublic: true }],
        },
        select: { name: true },
      })
      if (!workout) {
        return NextResponse.json(
          { success: false, error: 'Agility workout not found' },
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
          agilityWorkoutId: workoutType === 'agility' ? workoutId : null,
          assignedDate: date,
          notes: notes || null,
          startTime: startTime || null,
          endTime: endTime || null,
          locationId: locationId || null,
          locationName: locationName || null,
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
            startTime: startTime || null,
            endTime: endTime || null,
            locationId: locationId || null,
            locationName: locationName || null,
            scheduledBy: startTime ? user.id : null,
            responsibleCoachId: responsibleCoachId || null,
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
            startTime: startTime || null,
            endTime: endTime || null,
            locationId: locationId || null,
            locationName: locationName || null,
            scheduledBy: startTime ? user.id : null,
            responsibleCoachId: responsibleCoachId || null,
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
            startTime: startTime || null,
            endTime: endTime || null,
            locationId: locationId || null,
            locationName: locationName || null,
            scheduledBy: startTime ? user.id : null,
            responsibleCoachId: responsibleCoachId || null,
            status: 'PENDING',
            teamBroadcastId: broadcast.id,
          })),
          skipDuplicates: true,
        })
      } else if (workoutType === 'agility') {
        await tx.agilityWorkoutAssignment.createMany({
          data: eligibleMembers.map((member) => ({
            workoutId,
            athleteId: member.id,
            assignedDate: date,
            assignedBy: user.id,
            notes: notes || null,
            startTime: startTime || null,
            endTime: endTime || null,
            locationId: locationId || null,
            locationName: locationName || null,
            scheduledBy: startTime ? user.id : null,
            responsibleCoachId: responsibleCoachId || null,
            status: 'ASSIGNED',
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
