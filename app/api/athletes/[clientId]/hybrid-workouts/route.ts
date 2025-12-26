import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'

/**
 * GET /api/athletes/[clientId]/hybrid-workouts
 * Fetch hybrid workouts assigned to an athlete
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const athlete = await requireAthlete()

    // Verify the athlete is accessing their own data
    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { userId: athlete.id },
    })

    if (!athleteAccount || athleteAccount.clientId !== clientId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Determine athlete gender for weight selection (mirror /api/hybrid-workouts/[id]/focus-mode)
    const athleteProfile = await prisma.client.findUnique({
      where: { id: athleteAccount.clientId },
      select: { gender: true },
    })
    const isFemale = athleteProfile?.gender === 'FEMALE'

    // Fetch assignments with workout details
    const assignments = await prisma.hybridWorkoutAssignment.findMany({
      where: { athleteId: clientId },
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            description: true,
            format: true,
            timeCap: true,
            totalRounds: true,
            repScheme: true,
            scalingLevel: true,
            isBenchmark: true,
            benchmarkSource: true,
            movements: {
              include: {
                exercise: {
                  select: {
                    id: true,
                    name: true,
                    nameSv: true,
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { assignedDate: 'desc' },
    })

    // Transform movements to include exercise name
    const transformedAssignments = assignments.map((assignment) => ({
      ...assignment,
      workout: {
        ...assignment.workout,
        movements: assignment.workout.movements.map((m) => ({
          id: m.id,
          exerciseId: m.exerciseId,
          name: m.exercise.name,
          nameSv: m.exercise.nameSv,
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weight: isFemale ? (m.weightFemale || m.weightMale) : (m.weightMale || m.weightFemale),
          completed: false,
        })),
      },
    }))

    return NextResponse.json({
      success: true,
      data: {
        assignments: transformedAssignments,
      },
    })
  } catch (error) {
    console.error('Error fetching athlete hybrid workouts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workouts' },
      { status: 500 }
    )
  }
}