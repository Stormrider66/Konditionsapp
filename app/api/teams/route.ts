// app/api/teams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import {
  ensureBusinessOrganization,
  getAccessibleOrganization,
  getAccessibleTeamWhere,
} from '@/lib/coach/team-access'

// Validation schema for team creation
const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  organizationId: z.string().uuid().optional(),
  sportType: z.enum([
    'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'STRENGTH',
    'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL'
  ]).optional(),
})

// GET /api/teams - Get all teams for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const teamWhere = await getAccessibleTeamWhere(user.id, scope.businessSlug)

    const teams = await prisma.team.findMany({
      where: teamWhere,
      include: {
        members: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: teams,
    })
  } catch (error) {
    logger.error('Error fetching teams', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch teams',
      },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)

    const body = await request.json()

    // Validate input
    const validation = createTeamSchema.safeParse(body)
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
    let organizationId = data.organizationId || null
    let teamOwnerId = user.id

    // If organizationId is provided, verify it belongs to the active business scope.
    if (organizationId) {
      const org = await getAccessibleOrganization(user.id, organizationId, scope.businessSlug)
      if (!org) {
        return NextResponse.json(
          {
            success: false,
            error: 'Organization not found or unauthorized',
          },
          { status: 404 }
        )
      }
      teamOwnerId = org.userId
    } else if (scope.businessSlug) {
      const businessOrg = await ensureBusinessOrganization(user.id, scope.businessSlug)

      if (businessOrg) {
        organizationId = businessOrg.id
        teamOwnerId = businessOrg.userId
      }
    }

    const team = await prisma.team.create({
      data: {
        userId: teamOwnerId,
        name: data.name,
        description: data.description || null,
        organizationId,
        sportType: data.sportType || null,
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

    return NextResponse.json(
      {
        success: true,
        data: team,
        message: 'Team created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Error creating team', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create team',
      },
      { status: 500 }
    )
  }
}
