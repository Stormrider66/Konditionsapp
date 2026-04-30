// app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { getRequestedBusinessScope, requireCoach } from '@/lib/auth-utils'
import { getBusinessTeamOwnerIds } from '@/lib/coach/team-access'

// Validation schema for organization creation
const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  sportType: z.enum([
    'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'STRENGTH',
    'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL'
  ]).optional(),
})

// GET /api/organizations - Get all organizations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const scope = getRequestedBusinessScope(request)
    const ownerIds = await getBusinessTeamOwnerIds(user.id, scope.businessSlug)

    const organizations = await prisma.organization.findMany({
      where: {
        userId: { in: ownerIds.length ? ownerIds : [user.id] },
      },
      include: {
        teams: {
          include: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: organizations,
    })
  } catch (error) {
    logger.error('Error fetching organizations', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch organizations',
      },
      { status: 500 }
    )
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await request.json()

    // Validate input
    const validation = createOrganizationSchema.safeParse(body)
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

    const organization = await prisma.organization.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description || null,
        sportType: data.sportType || null,
      },
      include: {
        teams: {
          include: {
            members: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: organization,
        message: 'Organization created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Error creating organization', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create organization',
      },
      { status: 500 }
    )
  }
}
