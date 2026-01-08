import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAthlete } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'

/**
 * GET /api/athletes/[clientId]/cardio-sessions
 * Fetch cardio sessions assigned to an athlete
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

    // Fetch assignments with session details
    const assignments = await prisma.cardioSessionAssignment.findMany({
      where: { athleteId: clientId },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            description: true,
            sport: true,
            segments: true,
            totalDuration: true,
            totalDistance: true,
            avgZone: true,
            tags: true,
          },
        },
      },
      orderBy: { assignedDate: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        assignments,
      },
    })
  } catch (error) {
    logError('Error fetching athlete cardio sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
