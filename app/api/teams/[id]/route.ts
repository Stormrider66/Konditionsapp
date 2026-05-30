// app/api/teams/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getAccessibleOrganization, getAccessibleTeam } from '@/lib/coach/team-access'
import { syncTeamMemberSportProfilesToTeam } from '@/lib/coach/team-sport-profile'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// Validation schema for team updates
const updateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100).optional(),
  description: z.string().max(500).optional(),
  organizationId: z.string().uuid().optional().nullable(),
  sportType: z.enum([
    'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'FUNCTIONAL_FITNESS', 'STRENGTH',
    'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL', 'TEAM_BASKETBALL', 'TEAM_VOLLEYBALL',
    'TENNIS', 'PADEL'
  ]).optional().nullable(),
})

// GET /api/teams/[id] - Get a specific team
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { id } = await params
    const accessibleTeam = await getAccessibleTeam(user.id, id, scope.businessSlug)

    if (!accessibleTeam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team not found',
        },
        { status: 404 }
      )
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        // Keep all member scalar fields; additionally surface whether each
        // member has an athlete account (needed by the assignment dialog to
        // disable account-less players, who can't receive a program).
        members: {
          include: {
            athleteAccount: { select: { id: true } },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: team,
    })
  } catch (error) {
    logger.error('Error fetching team', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch team',
      },
      { status: 500 }
    )
  }
}

// PUT /api/teams/[id] - Update a team
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { id } = await params

    // Check if team belongs to user
    const existingTeam = await getAccessibleTeam(user.id, id, scope.businessSlug)

    if (!existingTeam || existingTeam.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team not found',
        },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = updateTeamSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // If organizationId is provided, verify it belongs to the active business scope.
    if (data.organizationId) {
      const org = await getAccessibleOrganization(user.id, data.organizationId, scope.businessSlug)
      if (!org) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization not found or unauthorized',
          },
          { status: 404 }
        )
      }
    }

    const team = await prisma.$transaction(async (tx) => {
      const updatedTeam = await tx.team.update({
        where: {
          id,
        },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description || null }),
          ...(data.organizationId !== undefined && { organizationId: data.organizationId }),
          ...(data.sportType !== undefined && { sportType: data.sportType }),
        },
        include: {
          members: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (data.sportType !== undefined && data.sportType !== null) {
        await syncTeamMemberSportProfilesToTeam(id, data.sportType, tx)
      }

      return updatedTeam
    })

    return NextResponse.json({
      success: true,
      data: team,
      message: 'Team updated successfully',
    })
  } catch (error) {
    logger.error('Error updating team', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update team',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[id] - Delete a team
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const { id } = await params

    // Check if team belongs to user
    const existingTeam = await getAccessibleTeam(user.id, id, scope.businessSlug)

    if (!existingTeam || existingTeam.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team not found',
        },
        { status: 404 }
      )
    }

    await prisma.team.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting team', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete team',
      },
      { status: 500 }
    )
  }
}
