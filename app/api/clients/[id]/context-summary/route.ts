/**
 * API: Get athlete context summary
 *
 * Returns a quick summary of what data is available for an athlete
 * Used by AI Studio to show context indicators
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: clientId } = await params

    // Verify coach has access to this client
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: user.id },
      select: {
        id: true,
        name: true,
        birthDate: true,
        weight: true,
        height: true,
        sportProfile: {
          select: { primarySport: true }
        },
        _count: {
          select: {
            tests: true,
            raceResults: true,
            trainingPrograms: true,
            fieldTests: true,
            dailyCheckIns: true,
            injuryAssessments: true,
            bodyCompositions: true,
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get latest test date
    const latestTest = await prisma.test.findFirst({
      where: { clientId },
      orderBy: { testDate: 'desc' },
      select: { testDate: true, vo2max: true }
    })

    // Get latest race
    const latestRace = await prisma.raceResult.findFirst({
      where: { clientId },
      orderBy: { raceDate: 'desc' },
      select: { raceName: true, distance: true, vdot: true }
    })

    // Build summary
    const summary = {
      athleteName: client.name,
      sport: client.sportProfile?.primarySport || null,
      hasProfile: !!(client.birthDate || client.weight || client.height),
      hasTests: client._count.tests > 0,
      hasRaces: client._count.raceResults > 0,
      hasProgram: client._count.trainingPrograms > 0,
      hasFieldTests: client._count.fieldTests > 0,
      hasCheckIns: client._count.dailyCheckIns > 0,
      hasInjuries: client._count.injuryAssessments > 0,
      hasBodyComp: client._count.bodyCompositions > 0,
      counts: {
        tests: client._count.tests,
        races: client._count.raceResults,
        programs: client._count.trainingPrograms,
        fieldTests: client._count.fieldTests,
        checkIns: client._count.dailyCheckIns,
        injuries: client._count.injuryAssessments,
        bodyComps: client._count.bodyCompositions,
      },
      latestTest: latestTest ? {
        date: latestTest.testDate,
        vo2max: latestTest.vo2max
      } : null,
      latestRace: latestRace ? {
        name: latestRace.raceName,
        distance: latestRace.distance,
        vdot: latestRace.vdot
      } : null,
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching context summary:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
