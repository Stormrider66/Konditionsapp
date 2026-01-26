/**
 * Voice Workout Confirm API
 *
 * POST /api/coach/voice-workout/[id]/confirm - Confirm and save workout
 *
 * Creates the workout (StrengthSession/CardioSession/HybridWorkout),
 * creates assignments, and optionally creates a calendar event.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { voiceWorkoutConfirmSchema } from '@/lib/validations/voice-workout-schemas'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'
import { deepMerge } from '@/lib/utils'
import type { VoiceWorkoutIntent, GeneratedWorkoutData } from '@/types/voice-workout'
import { generateWorkoutFromIntent } from '@/lib/ai/voice-workout-generator'

type RouteContext = {
  params: Promise<{ id: string }>
}

function syncWorkoutDisplayFields(workoutData: GeneratedWorkoutData): GeneratedWorkoutData {
  if (workoutData.type === 'CARDIO' && workoutData.cardioData) {
    const name = workoutData.cardioData.name ?? workoutData.name
    const description = workoutData.cardioData.description ?? workoutData.description
    return {
      ...workoutData,
      name,
      description,
      cardioData: { ...workoutData.cardioData, name, description },
    }
  }

  if (workoutData.type === 'STRENGTH' && workoutData.strengthData) {
    const name = workoutData.strengthData.name ?? workoutData.name
    const description = workoutData.strengthData.description ?? workoutData.description
    return {
      ...workoutData,
      name,
      description,
      strengthData: { ...workoutData.strengthData, name, description },
    }
  }

  if (workoutData.type === 'HYBRID' && workoutData.hybridData) {
    const name = workoutData.hybridData.name ?? workoutData.name
    const description = workoutData.hybridData.description ?? workoutData.description
    return {
      ...workoutData,
      name,
      description,
      hybridData: { ...workoutData.hybridData, name, description },
    }
  }

  return workoutData
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { id } = await context.params

    const rateLimited = await rateLimitJsonResponse('voice-workout:confirm', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()

    // Validate confirm data
    const parsed = voiceWorkoutConfirmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { assignment, createCalendarEvent, calendarEventTime } = parsed.data

    // Get session
    const session = await prisma.voiceWorkoutSession.findUnique({
      where: { id },
      select: {
        id: true,
        coachId: true,
        status: true,
        parsedIntent: true,
        workoutType: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership
    if (session.coachId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow confirming PARSED sessions
    if (session.status !== 'PARSED') {
      return NextResponse.json(
        { error: 'Can only confirm sessions with PARSED status' },
        { status: 400 }
      )
    }

    if (!session.parsedIntent) {
      return NextResponse.json(
        { error: 'No parsed intent found. Please re-upload audio.' },
        { status: 400 }
      )
    }

    const intent = session.parsedIntent as unknown as VoiceWorkoutIntent
    const workoutType = session.workoutType || intent.workout.type

    // Generate workout data (allows overrides from confirm request)
    let workoutData = await generateWorkoutFromIntent(intent, user.id)

    // Apply any workout modifications from the request
    if (parsed.data.workout) {
      workoutData = deepMerge(workoutData, parsed.data.workout)
      workoutData = syncWorkoutDisplayFields(workoutData)
    }

    // Get target athletes
    const athleteIds: string[] = []
    let teamId: string | undefined

    if (assignment.targetType === 'TEAM') {
      teamId = assignment.targetId
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: { select: { id: true } } },
      })

      if (!team || team.userId !== user.id) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }

      athleteIds.push(...team.members.map((m) => m.id))
    } else {
      // Single athlete
      const client = await prisma.client.findUnique({
        where: { id: assignment.targetId },
        select: { id: true, userId: true },
      })

      if (!client || client.userId !== user.id) {
        return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
      }

      athleteIds.push(client.id)
    }

    if (athleteIds.length === 0) {
      return NextResponse.json({ error: 'No athletes to assign' }, { status: 400 })
    }

    const assignedDate = new Date(assignment.assignedDate)

    // Use transaction to create everything atomically
    const result = await prisma.$transaction(async (tx) => {
      let workoutId: string
      const calendarEventIds: string[] = []

      // Create workout based on type
      if (workoutType === 'STRENGTH' && workoutData.strengthData) {
        const strengthSession = await tx.strengthSession.create({
          data: {
            coachId: user.id,
            name: workoutData.strengthData.name,
            description: workoutData.strengthData.description,
            phase: workoutData.strengthData.phase as any || 'ANATOMICAL_ADAPTATION',
            exercises: workoutData.strengthData.exercises as object,
            warmupData: workoutData.strengthData.warmupData as object,
            coreData: workoutData.strengthData.coreData as object,
            cooldownData: workoutData.strengthData.cooldownData as object,
            estimatedDuration: workoutData.strengthData.estimatedDuration,
            tags: workoutData.strengthData.tags || [],
          },
        })

        workoutId = strengthSession.id

        // Create assignments
        await tx.strengthSessionAssignment.createMany({
          data: athleteIds.map((athleteId) => ({
            sessionId: strengthSession.id,
            athleteId,
            assignedDate,
            assignedBy: user.id,
            status: 'PENDING',
          })),
        })

        // Create team broadcast if team assignment
        if (teamId) {
          await tx.teamWorkoutBroadcast.create({
            data: {
              teamId,
              coachId: user.id,
              strengthSessionId: strengthSession.id,
              assignedDate,
              totalAssigned: athleteIds.length,
            },
          })
        }

        // Update voice workout session
        await tx.voiceWorkoutSession.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            strengthSessionId: strengthSession.id,
            targetType: assignment.targetType,
            targetId: assignment.targetId,
            assignedDate,
          },
        })
      } else if (workoutType === 'CARDIO' && workoutData.cardioData) {
        const cardioSession = await tx.cardioSession.create({
          data: {
            coachId: user.id,
            name: workoutData.cardioData.name,
            description: workoutData.cardioData.description,
            sport: workoutData.cardioData.sport as any || 'RUNNING',
            segments: workoutData.cardioData.segments as object,
            totalDuration: workoutData.cardioData.totalDuration,
            totalDistance: workoutData.cardioData.totalDistance,
            avgZone: workoutData.cardioData.avgZone,
            tags: workoutData.cardioData.tags || [],
          },
        })

        workoutId = cardioSession.id

        // Create assignments
        await tx.cardioSessionAssignment.createMany({
          data: athleteIds.map((athleteId) => ({
            sessionId: cardioSession.id,
            athleteId,
            assignedDate,
            assignedBy: user.id,
            status: 'PENDING',
          })),
        })

        // Create team broadcast if team assignment
        if (teamId) {
          await tx.teamWorkoutBroadcast.create({
            data: {
              teamId,
              coachId: user.id,
              cardioSessionId: cardioSession.id,
              assignedDate,
              totalAssigned: athleteIds.length,
            },
          })
        }

        // Update voice workout session
        await tx.voiceWorkoutSession.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            cardioSessionId: cardioSession.id,
            targetType: assignment.targetType,
            targetId: assignment.targetId,
            assignedDate,
          },
        })
      } else if (workoutType === 'HYBRID' && workoutData.hybridData) {
        const hybridWorkout = await tx.hybridWorkout.create({
          data: {
            coachId: user.id,
            name: workoutData.hybridData.name,
            description: workoutData.hybridData.description,
            format: workoutData.hybridData.format as any || 'AMRAP',
            timeCap: workoutData.hybridData.timeCap,
            totalMinutes: workoutData.hybridData.totalMinutes,
            repScheme: workoutData.hybridData.repScheme,
            warmupData: workoutData.hybridData.warmupData as object,
            cooldownData: workoutData.hybridData.cooldownData as object,
            tags: workoutData.hybridData.tags || [],
          },
        })

        workoutId = hybridWorkout.id

        // Create movements (only those with valid exerciseId)
        const validMovements = workoutData.hybridData.movements.filter(m => m.exerciseId)
        if (validMovements.length > 0) {
          await tx.hybridMovement.createMany({
            data: validMovements.map((m, index) => ({
              workoutId: hybridWorkout.id,
              exerciseId: m.exerciseId!,
              order: m.sequence ?? index,
              reps: m.reps ? parseInt(m.reps) || null : null,
              weightMale: m.weight ? parseFloat(m.weight) || null : null,
              distance: m.distance,
              duration: m.duration,
              calories: m.calories,
            })),
          })
        }

        // Create assignments
        await tx.hybridWorkoutAssignment.createMany({
          data: athleteIds.map((athleteId) => ({
            workoutId: hybridWorkout.id,
            athleteId,
            assignedDate,
            assignedBy: user.id,
            status: 'PENDING',
          })),
        })

        // Create team broadcast if team assignment
        if (teamId) {
          await tx.teamWorkoutBroadcast.create({
            data: {
              teamId,
              coachId: user.id,
              hybridWorkoutId: hybridWorkout.id,
              assignedDate,
              totalAssigned: athleteIds.length,
            },
          })
        }

        // Update voice workout session
        await tx.voiceWorkoutSession.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            hybridWorkoutId: hybridWorkout.id,
            targetType: assignment.targetType,
            targetId: assignment.targetId,
            assignedDate,
          },
        })
      } else {
        throw new Error(`Invalid workout type or missing data: ${workoutType}`)
      }

      // Create calendar event if requested
      if (createCalendarEvent) {
        // Create calendar event for each athlete
        for (const athleteId of athleteIds) {
          const eventDate = new Date(assignedDate)
          if (calendarEventTime) {
            const [hours, minutes] = calendarEventTime.split(':').map(Number)
            eventDate.setHours(hours, minutes, 0, 0)
          }

          const calendarEvent = await tx.calendarEvent.create({
            data: {
              clientId: athleteId,
              createdById: user.id,
              title: workoutData.name,
              description: `Tilldelat via röstkommando`,
              type: 'EXTERNAL_EVENT',
              status: 'SCHEDULED',
              trainingImpact: 'NORMAL',
              startDate: eventDate,
              endDate: eventDate,
              allDay: !calendarEventTime,
            },
          })

          calendarEventIds.push(calendarEvent.id)
        }
      }

      return {
        workoutId,
        workoutType,
        assignmentCount: athleteIds.length,
        calendarEventIds,
      }
    })

    return NextResponse.json({
      success: true,
      workoutId: result.workoutId,
      workoutType: result.workoutType,
      assignmentCount: result.assignmentCount,
      calendarEventIds: result.calendarEventIds,
    })
  } catch (error) {
    logger.error('Voice workout confirm error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'Failed to confirm workout',
        details:
          process.env.NODE_ENV !== 'production'
            ? (error instanceof Error ? error.message : 'Unknown error')
            : undefined,
      },
      { status: 500 }
    )
  }
}
