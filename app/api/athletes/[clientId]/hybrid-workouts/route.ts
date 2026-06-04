import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireAthlete } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * GET /api/athletes/[clientId]/hybrid-workouts
 * Fetch hybrid workouts assigned to an athlete
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const { clientId } = await params
    const athlete = await requireAthlete()
    locale = resolveRequestLocale(request, athlete.language)

    const hasAccess = await canAccessClient(athlete.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Unauthorized', 'Obehörig') },
        { status: 403 }
      )
    }

    // Determine athlete gender for weight selection (mirror /api/hybrid-workouts/[id]/focus-mode)
    const athleteProfile = await prisma.client.findUnique({
      where: { id: clientId },
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
                    nameEn: true,
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
          nameEn: m.exercise.nameEn,
          reps: m.reps,
          calories: m.calories,
          distance: m.distance,
          duration: m.duration,
          weight: isFemale ? (m.weightFemale ?? m.weightMale) : m.weightMale,
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
    logError('Error fetching athlete hybrid workouts:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to fetch workouts', 'Kunde inte hämta pass') },
      { status: 500 }
    )
  }
}
