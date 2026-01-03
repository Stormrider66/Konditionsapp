// app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

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

    const organizations = await prisma.organization.findMany({
      where: {
        userId: user.id,
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
