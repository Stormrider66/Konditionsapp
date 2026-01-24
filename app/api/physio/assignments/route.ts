// app/api/physio/assignments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysio, getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schema for creating an assignment
const createAssignmentSchema = z.object({
  // One of these must be provided
  clientId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  businessId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  // Role and permissions
  role: z.enum(['PRIMARY', 'SECONDARY', 'CONSULTANT']).default('PRIMARY'),
  canModifyPrograms: z.boolean().default(false),
  canCreateRestrictions: z.boolean().default(true),
  canViewFullHistory: z.boolean().default(true),
  // Optional fields
  notes: z.string().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => data.clientId || data.teamId || data.organizationId || data.businessId || data.locationId,
  { message: 'At least one scope (clientId, teamId, organizationId, businessId, or locationId) must be provided' }
)

/**
 * GET /api/physio/assignments
 * List all assignments for the current physio user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePhysio()

    const assignments = await prisma.physioAssignment.findMany({
      where: {
        physioUserId: user.id,
        isActive: true,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { members: true },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching physio assignments:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/physio/assignments
 * Create a new physio assignment
 * Only ADMIN users can create assignments (physio users receive them)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and business owners can create assignments
    if (user.role !== 'ADMIN') {
      // Check if user is a business owner
      const isBusinessOwner = await prisma.businessMember.findFirst({
        where: {
          userId: user.id,
          role: 'OWNER',
          isActive: true,
        },
      })
      if (!isBusinessOwner) {
        return NextResponse.json(
          { error: 'Only administrators or business owners can create physio assignments' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const validatedData = createAssignmentSchema.parse(body)

    // Get the physio user ID from request
    const { physioUserId, ...assignmentData } = body
    if (!physioUserId) {
      return NextResponse.json(
        { error: 'physioUserId is required' },
        { status: 400 }
      )
    }

    // Verify the target user has PHYSIO role
    const physioUser = await prisma.user.findUnique({
      where: { id: physioUserId },
      select: { role: true },
    })

    if (!physioUser || physioUser.role !== 'PHYSIO') {
      return NextResponse.json(
        { error: 'Target user must have PHYSIO role' },
        { status: 400 }
      )
    }

    const assignment = await prisma.physioAssignment.create({
      data: {
        physioUserId,
        clientId: validatedData.clientId,
        teamId: validatedData.teamId,
        organizationId: validatedData.organizationId,
        businessId: validatedData.businessId,
        locationId: validatedData.locationId,
        role: validatedData.role,
        canModifyPrograms: validatedData.canModifyPrograms,
        canCreateRestrictions: validatedData.canCreateRestrictions,
        canViewFullHistory: validatedData.canViewFullHistory,
        notes: validatedData.notes,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
      },
      include: {
        physio: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error creating physio assignment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}
