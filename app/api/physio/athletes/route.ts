// app/api/physio/athletes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, getPhysioAthletes } from '@/lib/auth-utils'

/**
 * GET /api/physio/athletes
 * List all athletes accessible by the current physio
 * Returns athletes with summary information (injuries, restrictions, rehab programs)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePhysio()
    const { searchParams } = new URL(request.url)

    // Get all athlete IDs this physio can access
    const athleteIds = await getPhysioAthletes(user.id)

    if (athleteIds.length === 0) {
      return NextResponse.json({
        athletes: [],
        total: 0,
      })
    }

    // Parse query parameters
    const search = searchParams.get('search')
    const hasActiveInjury = searchParams.get('hasActiveInjury')
    const hasActiveRestriction = searchParams.get('hasActiveRestriction')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: Record<string, unknown> = {
      id: { in: athleteIds },
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (hasActiveInjury === 'true') {
      where.injuryAssessments = {
        some: {
          resolved: false,
        },
      }
    }

    if (hasActiveRestriction === 'true') {
      where.trainingRestrictions = {
        some: {
          isActive: true,
        },
      }
    }

    const [athletes, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          gender: true,
          birthDate: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          // Count active injuries
          _count: {
            select: {
              injuryAssessments: {
                where: { resolved: false },
              },
              trainingRestrictions: {
                where: { isActive: true },
              },
              rehabPrograms: {
                where: { status: 'ACTIVE' },
              },
              treatmentSessions: true,
            },
          },
          // Get most recent injury
          injuryAssessments: {
            where: { resolved: false },
            orderBy: { date: 'desc' },
            take: 1,
            select: {
              id: true,
              injuryType: true,
              bodyPart: true,
              painLevel: true,
              phase: true,
            },
          },
          // Get active restrictions
          trainingRestrictions: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              type: true,
              severity: true,
              endDate: true,
            },
          },
          // Get active rehab programs
          rehabPrograms: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              name: true,
              currentPhase: true,
            },
          },
          // Get latest check-in
          dailyMetrics: {
            orderBy: { date: 'desc' },
            take: 1,
            select: {
              date: true,
              injuryPain: true,
              readinessLevel: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.client.count({ where }),
    ])

    // Transform the data for easier consumption
    const transformedAthletes = athletes.map(athlete => ({
      id: athlete.id,
      name: athlete.name,
      email: athlete.email,
      gender: athlete.gender,
      birthDate: athlete.birthDate,
      team: athlete.team,
      stats: {
        activeInjuries: athlete._count.injuryAssessments,
        activeRestrictions: athlete._count.trainingRestrictions,
        activeRehabPrograms: athlete._count.rehabPrograms,
        totalTreatmentSessions: athlete._count.treatmentSessions,
      },
      currentInjury: athlete.injuryAssessments[0] || null,
      activeRestrictions: athlete.trainingRestrictions,
      activeRehabProgram: athlete.rehabPrograms[0] || null,
      latestCheckIn: athlete.dailyMetrics[0] || null,
    }))

    return NextResponse.json({
      athletes: transformedAthletes,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching physio athletes:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch athletes' },
      { status: 500 }
    )
  }
}
