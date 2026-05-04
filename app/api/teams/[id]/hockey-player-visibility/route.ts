import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCoach } from '@/lib/auth-utils'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api/utils'

const COMPARISON_MODES = ['OWN_PROGRESS', 'TEAM_CONTEXT', 'POSITION_CONTEXT', 'FULL_RANKING'] as const

const updateSchema = z.object({
  comparisonMode: z.enum(COMPARISON_MODES),
  sensitiveMetricsVisible: z.boolean(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const accessibleTeam = await getAccessibleTeam(user.id, teamId)

    if (!accessibleTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        hockeyPlayerComparisonMode: true,
        hockeySensitiveMetricsVisible: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        comparisonMode: team?.hockeyPlayerComparisonMode ?? 'POSITION_CONTEXT',
        sensitiveMetricsVisible: team?.hockeySensitiveMetricsVisible ?? true,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id: teamId } = await params
    const accessibleTeam = await getAccessibleTeam(user.id, teamId)

    if (!accessibleTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const input = updateSchema.parse(await request.json())
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        hockeyPlayerComparisonMode: input.comparisonMode,
        hockeySensitiveMetricsVisible: input.sensitiveMetricsVisible,
      },
      select: {
        hockeyPlayerComparisonMode: true,
        hockeySensitiveMetricsVisible: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        comparisonMode: team.hockeyPlayerComparisonMode,
        sensitiveMetricsVisible: team.hockeySensitiveMetricsVisible,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
