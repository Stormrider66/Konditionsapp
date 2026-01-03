// app/api/organizations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Validation schema for organization update
const updateOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100).optional(),
  description: z.string().max(500).optional(),
  sportType: z.enum([
    'RUNNING', 'CYCLING', 'SKIING', 'SWIMMING', 'TRIATHLON', 'HYROX', 'GENERAL_FITNESS', 'STRENGTH',
    'TEAM_FOOTBALL', 'TEAM_ICE_HOCKEY', 'TEAM_HANDBALL', 'TEAM_FLOORBALL'
  ]).optional().nullable(),
})

// GET /api/organizations/[id] - Get a specific organization
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    const organization = await prisma.organization.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        teams: {
          include: {
            members: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: organization,
    })
  } catch (error) {
    logger.error('Error fetching organization', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

// PUT /api/organizations/[id] - Update an organization
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params
    const body = await request.json()

    // Validate input
    const validation = updateOrganizationSchema.safeParse(body)
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

    // Check ownership
    const existing = await prisma.organization.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Organization not found or unauthorized' },
        { status: 404 }
      )
    }

    const data = validation.data

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sportType !== undefined && { sportType: data.sportType }),
      },
      include: {
        teams: {
          include: {
            members: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: organization,
      message: 'Organization updated successfully',
    })
  } catch (error) {
    logger.error('Error updating organization', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}

// DELETE /api/organizations/[id] - Delete an organization
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await context.params

    // Check ownership
    const existing = await prisma.organization.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Organization not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete organization (teams will have organizationId set to null via onDelete: SetNull)
    await prisma.organization.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting organization', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete organization' },
      { status: 500 }
    )
  }
}
