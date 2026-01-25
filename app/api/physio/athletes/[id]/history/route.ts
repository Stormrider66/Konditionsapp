// app/api/physio/athletes/[id]/history/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, canAccessAthleteAsPhysio, canModifyProgramsAsPhysio } from '@/lib/auth-utils'

/**
 * GET /api/physio/athletes/[id]/history
 * Get complete injury and treatment history for an athlete
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

    // Check if physio has permission to view full history
    const canViewFullHistory = await canModifyProgramsAsPhysio(user.id, clientId)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get all injuries (resolved and unresolved)
    const injuries = await prisma.injuryAssessment.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      include: {
        assessedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        // Related restrictions
        trainingRestrictions: {
          select: {
            id: true,
            type: true,
            severity: true,
            isActive: true,
            createdAt: true,
          },
        },
        // Related rehab programs
        rehabPrograms: {
          select: {
            id: true,
            name: true,
            status: true,
            currentPhase: true,
          },
        },
      },
    })

    // Get all treatment sessions
    const treatments = await prisma.treatmentSession.findMany({
      where: { clientId },
      orderBy: { sessionDate: 'desc' },
      take: limit,
      skip: offset,
      select: canViewFullHistory
        ? {
            id: true,
            sessionDate: true,
            treatmentType: true,
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
            painBefore: true,
            painAfter: true,
            modalitiesUsed: true,
            physio: {
              select: {
                id: true,
                name: true,
              },
            },
            injury: {
              select: {
                id: true,
                injuryType: true,
                bodyPart: true,
              },
            },
          }
        : {
            id: true,
            sessionDate: true,
            treatmentType: true,
            painBefore: true,
            painAfter: true,
            physio: {
              select: {
                id: true,
                name: true,
              },
            },
            injury: {
              select: {
                id: true,
                injuryType: true,
                bodyPart: true,
              },
            },
          },
    })

    // Get all rehab programs
    const rehabPrograms = await prisma.rehabProgram.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        physio: {
          select: {
            id: true,
            name: true,
          },
        },
        injury: {
          select: {
            id: true,
            injuryType: true,
            bodyPart: true,
          },
        },
        _count: {
          select: {
            exercises: true,
            milestones: true,
            progressLogs: true,
          },
        },
      },
    })

    // Get movement screens
    const screenings = await prisma.movementScreen.findMany({
      where: { clientId },
      orderBy: { screenDate: 'desc' },
      include: {
        physio: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Get acute injury reports
    const acuteReports = await prisma.acuteInjuryReport.findMany({
      where: { clientId },
      orderBy: { incidentDate: 'desc' },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        injury: {
          select: {
            id: true,
            injuryType: true,
          },
        },
      },
    })

    // Build timeline
    const timeline = [
      ...injuries.map(i => ({
        type: 'injury' as const,
        date: i.date,
        data: i,
      })),
      ...treatments.map(t => ({
        type: 'treatment' as const,
        date: t.sessionDate,
        data: t,
      })),
      ...screenings.map(s => ({
        type: 'screening' as const,
        date: s.screenDate,
        data: s,
      })),
      ...acuteReports.map(r => ({
        type: 'acute_report' as const,
        date: r.incidentDate,
        data: r,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      injuries,
      treatments,
      rehabPrograms,
      screenings,
      acuteReports,
      timeline: timeline.slice(0, limit),
      canViewFullHistory,
    })
  } catch (error) {
    console.error('Error fetching athlete history:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch athlete history' },
      { status: 500 }
    )
  }
}
