// app/api/teams/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

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
    'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'STRENGTH',
    'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL'
  ]).optional().nullable(),
})

// GET /api/teams/[id] - Get a specific team
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const { id } = await params
    const team = await prisma.team.findUnique({
      where: {
        id,
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

    // Check if team belongs to user
    if (!team || team.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Team not found',
        },
        { status: 404 }
      )
    }

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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if team belongs to user
    const existingTeam = await prisma.team.findUnique({
      where: {
        id,
      },
    })

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

    // If organizationId is provided, verify it exists and belongs to user
    if (data.organizationId) {
      const org = await prisma.organization.findFirst({
        where: {
          id: data.organizationId,
          userId: user.id,
        },
      })
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

    const team = await prisma.team.update({
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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if team belongs to user
    const existingTeam = await prisma.team.findUnique({
      where: {
        id,
      },
    })

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
