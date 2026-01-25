// app/api/physio/athletes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, canAccessAthleteAsPhysio } from '@/lib/auth-utils'

/**
 * GET /api/physio/athletes/[id]
 * Get detailed athlete data for a physio
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePhysio()
    const { id: clientId } = await params

    // Verify access
    const hasAccess = await canAccessAthleteAsPhysio(user.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this athlete' },
        { status: 403 }
      )
    }

    const athlete = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        birthDate: true,
        height: true,
        weight: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        sportProfile: {
          select: {
            id: true,
            primarySport: true,
            onboardingCompleted: true,
          },
        },
        // Active injuries
        injuryAssessments: {
          where: { resolved: false },
          orderBy: { date: 'desc' },
          include: {
            assessedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // Active restrictions
        trainingRestrictions: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        // Active rehab programs
        rehabPrograms: {
          where: { status: 'ACTIVE' },
          include: {
            physio: {
              select: {
                id: true,
                name: true,
              },
            },
            exercises: {
              where: { isActive: true },
              include: {
                exercise: {
                  select: {
                    id: true,
                    name: true,
                    nameSv: true,
                  },
                },
              },
            },
            milestones: {
              orderBy: { order: 'asc' },
            },
            _count: {
              select: {
                progressLogs: true,
              },
            },
          },
        },
        // Recent treatment sessions
        treatmentSessions: {
          orderBy: { sessionDate: 'desc' },
          take: 5,
          include: {
            physio: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // Recent daily metrics (for pain tracking)
        dailyMetrics: {
          orderBy: { date: 'desc' },
          take: 14,
          select: {
            date: true,
            injuryPain: true,
            muscleSoreness: true,
            readinessLevel: true,
            sleepQuality: true,
            stress: true,
          },
        },
        // Movement screens
        movementScreens: {
          orderBy: { screenDate: 'desc' },
          take: 3,
          select: {
            id: true,
            screenType: true,
            screenDate: true,
            totalScore: true,
          },
        },
        // Acute injury reports
        acuteInjuryReports: {
          orderBy: { reportDate: 'desc' },
          take: 5,
          select: {
            id: true,
            incidentDate: true,
            bodyPart: true,
            mechanism: true,
            urgency: true,
            status: true,
          },
        },
      },
    })

    if (!athlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    // Calculate summary stats
    const summary = {
      activeInjuries: athlete.injuryAssessments.length,
      activeRestrictions: athlete.trainingRestrictions.length,
      activeRehabPrograms: athlete.rehabPrograms.length,
      recentTreatments: athlete.treatmentSessions.length,
      avgRecentPain: athlete.dailyMetrics.length > 0
        ? athlete.dailyMetrics
            .filter(m => m.injuryPain !== null)
            .reduce((sum, m) => sum + (m.injuryPain || 0), 0) /
          athlete.dailyMetrics.filter(m => m.injuryPain !== null).length || 0
        : null,
    }

    return NextResponse.json({
      ...athlete,
      summary,
    })
  } catch (error) {
    console.error('Error fetching athlete details:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch athlete details' },
      { status: 500 }
    )
  }
}
