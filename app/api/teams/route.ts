// app/api/teams/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schema for team creation
const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
})

// GET /api/teams - Get all teams for the authenticated user
export async function GET() {
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

    const teams = await prisma.team.findMany({
      where: {
        userId: user.id,
      },
      include: {
        members: true,
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

    const team = await prisma.team.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description || null,
      },
      include: {
        members: true,
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
