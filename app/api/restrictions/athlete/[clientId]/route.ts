// app/api/restrictions/athlete/[clientId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient, canAccessAthleteAsPhysio } from '@/lib/auth-utils'

/**
 * GET /api/restrictions/athlete/[clientId]
 * Get active training restrictions for an athlete
 * Used by AI WOD generator to respect restrictions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId } = await params

    // Verify access to the client
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (user.role === 'PHYSIO') {
      hasAccess = await canAccessAthleteAsPhysio(user.id, clientId)
    } else if (user.role === 'COACH') {
      hasAccess = await canAccessClient(user.id, clientId)
    } else if (user.role === 'ATHLETE') {
      const athleteAccount = await prisma.athleteAccount.findUnique({
        where: { userId: user.id },
        select: { clientId: true },
      })
      hasAccess = athleteAccount?.clientId === clientId
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this athlete' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeExpired = searchParams.get('includeExpired') === 'true'

    // Build where clause
    const where: Record<string, unknown> = {
      clientId,
    }

    if (!includeExpired) {
      where.isActive = true
      where.OR = [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ]
    }

    const restrictions = await prisma.trainingRestriction.findMany({
      where,
      include: {
        injury: {
          select: {
            id: true,
            injuryType: true,
            bodyPart: true,
            phase: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [
        { severity: 'desc' }, // Most severe first
        { createdAt: 'desc' },
      ],
    })

    // Transform for AI WOD consumption
    const restrictionSummary = {
      hasActiveRestrictions: restrictions.length > 0,
      restrictedBodyParts: [...new Set(restrictions.flatMap(r => r.bodyParts))],
      restrictedWorkoutTypes: [...new Set(restrictions.flatMap(r => r.affectedWorkoutTypes))],
      restrictedExerciseIds: [...new Set(restrictions.flatMap(r => r.affectedExerciseIds))],
      maxSeverity: restrictions.length > 0
        ? restrictions.reduce((max, r) => {
            const severityOrder = { COMPLETE: 4, SEVERE: 3, MODERATE: 2, MILD: 1 }
            const currentSeverity = severityOrder[r.severity as keyof typeof severityOrder] || 0
            const maxSeverity = severityOrder[max as keyof typeof severityOrder] || 0
            return currentSeverity > maxSeverity ? r.severity : max
          }, restrictions[0].severity)
        : null,
      volumeReductionPercent: restrictions.length > 0
        ? Math.max(...restrictions.map(r => r.volumeReductionPercent || 0))
        : null,
      maxIntensityZone: restrictions.length > 0
        ? Math.min(...restrictions.filter(r => r.maxIntensityZone).map(r => r.maxIntensityZone!))
        : null,
      restrictions: restrictions.map(r => ({
        id: r.id,
        type: r.type,
        severity: r.severity,
        bodyParts: r.bodyParts,
        affectedWorkoutTypes: r.affectedWorkoutTypes,
        affectedExerciseIds: r.affectedExerciseIds,
        volumeReductionPercent: r.volumeReductionPercent,
        maxIntensityZone: r.maxIntensityZone,
        description: r.description,
        reason: r.reason,
        endDate: r.endDate,
        injury: r.injury,
        createdBy: r.createdBy,
        source: r.source,
      })),
    }

    return NextResponse.json(restrictionSummary)
  } catch (error) {
    console.error('Error fetching athlete restrictions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch restrictions' },
      { status: 500 }
    )
  }
}
